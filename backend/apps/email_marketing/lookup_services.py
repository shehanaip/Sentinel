from urllib.parse import urlencode

import dns.exception
import dns.resolver
from django.conf import settings
from django.core.mail import send_mail
from django.core.signing import BadSignature, SignatureExpired, dumps, loads
from django.core.validators import validate_email


class EmailLookupError(ValueError):
    pass


def normalize_email(value):
    if not isinstance(value, str):
        raise EmailLookupError("Enter a complete email address.")
    value = value.strip()
    if len(value) > 254:
        raise EmailLookupError("Email addresses must be 254 characters or fewer.")
    try:
        validate_email(value)
    except Exception as exc:
        raise EmailLookupError("Enter a valid, complete email address.") from exc
    return value


def check_mail_routing(email):
    """Check public DNS mail routing; this cannot confirm a mailbox exists."""
    domain = email.rsplit("@", 1)[1].encode("idna").decode("ascii").lower()
    resolver = dns.resolver.Resolver()
    resolver.lifetime = 3
    try:
        answers = resolver.resolve(domain, "MX", lifetime=3)
        hosts = {str(answer.exchange).rstrip(".") for answer in answers}
        if hosts == {""}:  # RFC 7505 null MX explicitly says the domain accepts no email.
            return {"status": "no_mail_server_found", "mx_hosts": []}
        return {"status": "mail_server_found", "mx_hosts": sorted(hosts)[:10]}
    except dns.resolver.NoAnswer:
        # RFC 5321 implicit MX: if no MX record exists, the domain's own A/AAAA may accept mail.
        try:
            resolver.resolve(domain, "A", lifetime=3)
            return {"status": "mail_server_found", "mx_hosts": [domain], "routing": "implicit_mx"}
        except dns.resolver.NoAnswer:
            try:
                resolver.resolve(domain, "AAAA", lifetime=3)
                return {"status": "mail_server_found", "mx_hosts": [domain], "routing": "implicit_mx"}
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
                return {"status": "no_mail_server_found", "mx_hosts": []}
        except dns.resolver.NXDOMAIN:
            return {"status": "no_mail_server_found", "mx_hosts": []}
        except (dns.resolver.NoNameservers, dns.exception.Timeout):
            return {"status": "dns_unavailable", "mx_hosts": []}
    except dns.resolver.NXDOMAIN:
        return {"status": "no_mail_server_found", "mx_hosts": []}
    except (dns.resolver.NoNameservers, dns.exception.Timeout):
        return {"status": "dns_unavailable", "mx_hosts": []}


def send_lookup_confirmation(email):
    if not settings.EMAIL_HOST or not settings.DEFAULT_FROM_EMAIL:
        raise EmailLookupError("Email delivery is not configured. Check the SMTP settings.")
    token = dumps({"email": email}, salt="sentinel.email_lookup.confirmation")
    link = f"{settings.FRONTEND_URL}/email-lookup/confirm?{urlencode({'token': token})}"
    try:
        sent = send_mail(
            subject="Confirm email address access",
            message=(
                "A Sentinel user asked to check whether this address can receive email. "
                "Open this time-limited link to confirm access to this inbox:\n\n"
                f"{link}\n\nIf you did not request this, ignore this message."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        raise EmailLookupError("Could not send the confirmation email. Check SMTP settings and try again.") from exc
    if sent != 1:
        raise EmailLookupError("The confirmation email could not be sent.")


def confirm_lookup_token(token):
    if not isinstance(token, str) or not token or len(token) > 2048:
        raise EmailLookupError("This confirmation link is invalid or expired.")
    try:
        payload = loads(token, salt="sentinel.email_lookup.confirmation", max_age=60 * 60 * 24)
        email = normalize_email(payload.get("email"))
    except (BadSignature, SignatureExpired, AttributeError, TypeError, EmailLookupError) as exc:
        raise EmailLookupError("This confirmation link is invalid or expired.") from exc
    local, domain = email.split("@", 1)
    masked = f"{local[:1]}{'*' * min(max(len(local) - 1, 2), 8)}@{domain}"
    return masked
