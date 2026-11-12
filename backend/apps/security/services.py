import dns.exception
import dns.resolver
import http.client
import re
import socket
import ssl
import time

from django.utils import timezone

from apps.websites.models import Website
from config.networking import DNSLookupError, UnsafeTarget, resolve_public_addresses, safe_https_get
from .models import SecurityAudit


HEADER_CHECKS = [
    ("strict-transport-security", "HTTP Strict Transport Security", "Enforces HTTPS for future visits.", "After confirming all subdomains support HTTPS, add a Strict-Transport-Security header with a suitable max-age."),
    ("content-security-policy", "Content Security Policy", "Restricts which sources can load page content.", "Start with Content-Security-Policy-Report-Only, review violations, then deploy a policy tailored to the site."),
    ("x-content-type-options", "MIME sniffing protection", "Should be set to nosniff.", "Send X-Content-Type-Options: nosniff from the web server."),
    ("x-frame-options", "Clickjacking protection", "Use DENY or SAMEORIGIN, or a CSP frame-ancestors rule.", "Set Content-Security-Policy frame-ancestors to the intended embedding policy, or use X-Frame-Options."),
    ("referrer-policy", "Referrer policy", "Controls how much referrer information is shared.", "Set Referrer-Policy to strict-origin-when-cross-origin or a stricter policy suited to the site."),
    ("permissions-policy", "Permissions policy", "Limits access to browser capabilities.", "Define a Permissions-Policy that disables browser capabilities the site does not use."),
]


def _inspect_headers(headers):
    checks = []
    for key, label, explanation, recommendation in HEADER_CHECKS:
        value = headers.get(key, "").strip()
        present = bool(value)
        if key == "strict-transport-security":
            match = re.search(r"(?:^|;)\s*max-age\s*=\s*(\d+)", value, re.IGNORECASE)
            present = bool(match and int(match.group(1)) > 0)
        elif key == "x-frame-options":
            present = value.lower() in {"deny", "sameorigin"} or "frame-ancestors" in headers.get("content-security-policy", "").lower()
        elif key == "referrer-policy":
            present = value.lower() in {"no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin", "same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url"}
        passed = present
        if key == "x-content-type-options" and value.lower() != "nosniff":
            passed = False
        checks.append({
            "code": key,
            "label": label,
            "status": "pass" if passed else "missing",
            "message": explanation if passed else f"{label} is missing or does not use the expected value.",
            "recommendation": "No change indicated by this check." if passed else recommendation,
        })
    return checks


def _txt_records(name):
    resolver = dns.resolver.Resolver(configure=True)
    resolver.lifetime = 3
    try:
        answers = resolver.resolve(name, "TXT", lifetime=3)
        return [b"".join(record.strings).decode("utf-8", "replace") for record in answers]
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
        return []
    except (dns.exception.Timeout, dns.resolver.NoNameservers, dns.exception.DNSException):
        return None


def _domain_dns_checks(domain):
    checks = []
    mail_domain = domain[4:] if domain.lower().startswith("www.") else domain
    root_txt = _txt_records(mail_domain)
    spf_records = [record for record in (root_txt or []) if record.lower().startswith("v=spf1")]
    spf_lookup_failed = root_txt is None
    if spf_lookup_failed:
        checks.append({"code": "spf", "label": "Sender Policy Framework", "status": "unknown", "message": "DNS did not return a reliable TXT response.", "recommendation": "Retry when DNS resolution is available."})
    elif not spf_records:
        checks.append({"code": "spf", "label": "Sender Policy Framework", "status": "missing", "message": "No SPF policy was found at the domain root.", "recommendation": "Publish one SPF TXT record listing only the mail services authorized to send for this domain."})
    elif len(spf_records) > 1:
        checks.append({"code": "spf", "label": "Sender Policy Framework", "status": "warning", "message": "More than one SPF policy was found; receivers may treat SPF as a permanent error.", "recommendation": "Merge authorized senders into a single SPF record and verify the provider-specific include mechanisms."})
    else:
        checks.append({"code": "spf", "label": "Sender Policy Framework", "status": "pass", "message": "One SPF policy is published.", "recommendation": "Review authorized senders periodically and keep the policy within DNS lookup limits."})

    dmarc_txt = _txt_records(f"_dmarc.{mail_domain}")
    dmarc_records = [record for record in (dmarc_txt or []) if record.lower().startswith("v=dmarc1")]
    dmarc_lookup_failed = dmarc_txt is None
    if dmarc_lookup_failed:
        checks.append({"code": "dmarc", "label": "DMARC policy", "status": "unknown", "message": "DNS did not return a reliable DMARC response.", "recommendation": "Retry when DNS resolution is available."})
    elif not dmarc_records:
        checks.append({"code": "dmarc", "label": "DMARC policy", "status": "missing", "message": "No DMARC policy was found at _dmarc.", "recommendation": "Publish a DMARC record beginning with p=none, configure report delivery, and review reports before enforcing a stricter policy."})
    else:
        policy = re.search(r"(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\b", dmarc_records[0], re.IGNORECASE)
        policy_value = policy.group(1).lower() if policy else "unknown"
        checks.append({"code": "dmarc", "label": "DMARC policy", "status": "warning" if policy_value in {"none", "unknown"} or len(dmarc_records) > 1 else "pass", "message": "DMARC is present with a monitoring-only policy." if policy_value == "none" else "A DMARC policy is published." if policy else "The DMARC record does not contain a recognized policy.", "recommendation": "If reports show legitimate mail passes, consider moving from p=none to quarantine and later reject." if policy_value == "none" else "Check the DMARC syntax and ensure there is only one policy record." if not policy or len(dmarc_records) > 1 else "Review aggregate reports and keep the policy aligned with your mail sources."})

    resolver = dns.resolver.Resolver(configure=True)
    resolver.lifetime = 3
    caa_answers = None
    caa_error = False
    labels = domain.split(".")
    for offset in range(max(1, len(labels) - 1)):
        candidate = ".".join(labels[offset:])
        try:
            caa_answers = resolver.resolve(candidate, "CAA", lifetime=3)
            break
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            continue
        except (dns.exception.Timeout, dns.resolver.NoNameservers, dns.exception.DNSException):
            caa_error = True
            break
    if caa_answers is not None:
        has_caa = any(record.tag.decode("ascii", "ignore").lower() == "issue" for record in caa_answers)
        checks.append({"code": "caa", "label": "Certificate Authority Authorization", "status": "pass" if has_caa else "warning", "message": "CAA restricts which certificate authorities may issue certificates." if has_caa else "CAA records exist, but no issue directive was found.", "recommendation": "Review CAA issue/issuewild directives and authorize only the certificate authorities you use." if has_caa else "Add CAA issue directives for your chosen certificate authority; CAA is an optional defense-in-depth control."})
    elif caa_error:
        checks.append({"code": "caa", "label": "Certificate Authority Authorization", "status": "unknown", "message": "DNS did not return a reliable CAA response.", "recommendation": "Retry when DNS resolution is available."})
    else:
        checks.append({"code": "caa", "label": "Certificate Authority Authorization", "status": "warning", "message": "No CAA policy was found. This is optional, but it leaves certificate issuance unrestricted by CAA.", "recommendation": "Add CAA issue directives for your chosen certificate authority if you want to restrict certificate issuance."})
    return checks


def _tls_check(domain):
    result = {"code": "tls_certificate", "label": "TLS certificate", "status": "unknown", "message": "Could not complete the TLS certificate review.", "recommendation": "Confirm the HTTPS service is reachable, then run this check again."}
    try:
        addresses = resolve_public_addresses(domain)
        context = ssl.create_default_context()
        last_error = None
        for address in addresses:
            try:
                with socket.create_connection((address, 443), timeout=4) as raw_socket:
                    with context.wrap_socket(raw_socket, server_hostname=domain) as secure_socket:
                        certificate = secure_socket.getpeercert()
                        expires_in = ssl.cert_time_to_seconds(certificate["notAfter"]) - time.time()
                        days = int(expires_in // 86400)
                        if days < 0:
                            return {"code": "tls_certificate", "label": "TLS certificate", "status": "missing", "message": "The TLS certificate has expired.", "recommendation": "Renew and install a valid certificate for this hostname, including the complete certificate chain."}
                        return {"code": "tls_certificate", "label": "TLS certificate", "status": "warning" if days <= 30 else "pass", "message": f"Certificate is valid for this hostname and expires in {days} days.", "recommendation": "Renew before expiry and keep automated certificate renewal enabled." if days <= 30 else "Keep automated renewal enabled and monitor the expiry date."}
            except ssl.SSLCertVerificationError as exc:
                last_error = exc
            except (OSError, ssl.SSLError, socket.timeout) as exc:
                last_error = exc
        if isinstance(last_error, ssl.SSLCertVerificationError):
            result.update(status="missing", message="TLS certificate validation failed for this hostname.", recommendation="Install a currently valid certificate whose SAN covers this hostname and serve its complete trusted chain.")
    except UnsafeTarget:
        raise
    except (dns.exception.DNSException, DNSLookupError, socket.gaierror, TimeoutError):
        pass
    return result


def _run_domain_security_audit(website, *, created_by=None):
    checks = _domain_dns_checks(website.domain)
    try:
        checks.append(_tls_check(website.domain))
    except UnsafeTarget:
        return SecurityAudit.objects.create(website=website, created_by=created_by, audit_type=SecurityAudit.AuditType.DOMAIN, status=SecurityAudit.Status.ERROR, error_category="blocked_address", checked_at=timezone.now())
    score = round(sum(item["status"] == "pass" for item in checks) * 100 / len(checks))
    return SecurityAudit.objects.create(website=website, created_by=created_by, audit_type=SecurityAudit.AuditType.DOMAIN, status=SecurityAudit.Status.COMPLETE, score=score, checks=checks, checked_at=timezone.now())


def run_security_audit(website, *, created_by=None, audit_type=SecurityAudit.AuditType.HEADERS):
    if website.verification_status != Website.VerificationStatus.VERIFIED:
        raise ValueError("Verify website ownership before running a security audit.")
    if audit_type == SecurityAudit.AuditType.DOMAIN:
        return _run_domain_security_audit(website, created_by=created_by)
    status, error_category, http_status, checks, score = SecurityAudit.Status.COMPLETE, "", None, [], 0
    try:
        response = safe_https_get(website.domain, max_body_bytes=0, timeout_seconds=5)
        http_status = response["status_code"]
        checks = _inspect_headers(response["security_headers"])
        score = round(sum(item["status"] == "pass" for item in checks) * 100 / len(checks))
    except UnsafeTarget:
        status, error_category = SecurityAudit.Status.ERROR, "blocked_address"
    except (dns.exception.DNSException, DNSLookupError, socket.gaierror):
        status, error_category = SecurityAudit.Status.ERROR, "dns_error"
    except (socket.timeout, TimeoutError):
        status, error_category = SecurityAudit.Status.ERROR, "timeout"
    except ssl.SSLError:
        status, error_category = SecurityAudit.Status.ERROR, "tls_error"
    except (OSError, http.client.HTTPException, ConnectionError):
        status, error_category = SecurityAudit.Status.ERROR, "connection_error"
    return SecurityAudit.objects.create(
        website=website,
        created_by=created_by,
        audit_type=SecurityAudit.AuditType.HEADERS,
        status=status,
        http_status=http_status,
        score=score,
        checks=checks,
        error_category=error_category,
        checked_at=timezone.now(),
    )
