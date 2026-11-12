import ipaddress
import re
import secrets

import dns.exception
import dns.resolver
from django.db import IntegrityError
from django.utils import timezone

from .models import Website

_LABEL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$", re.IGNORECASE)
TXT_PREFIX = "sentinel-verification="


def normalize_domain(value):
    if not isinstance(value, str):
        raise ValueError("Enter a domain name such as example.com.")
    domain = value.strip().lower()
    if not domain or any(marker in domain for marker in ("://", "/", "?", "#", "@", ":")):
        raise ValueError("Enter the hostname only, without a URL, path, or port.")
    if domain.endswith("."):
        domain = domain[:-1]
    try:
        domain = domain.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise ValueError("This domain name is not valid.") from exc
    if len(domain) > 253 or "." not in domain or domain == "localhost":
        raise ValueError("Enter a public fully qualified domain such as example.com.")
    try:
        ipaddress.ip_address(domain.strip("[]"))
    except ValueError:
        pass
    else:
        raise ValueError("Enter a domain name, not an IP address.")
    labels = domain.split(".")
    if any(not label or len(label) > 63 or not _LABEL_RE.fullmatch(label) for label in labels):
        raise ValueError("This domain name is not valid.")
    if len(labels[-1]) < 2:
        raise ValueError("Enter a public domain with a valid suffix.")
    return domain


def create_website(*, owner, domain, display_name=""):
    domain = normalize_domain(domain)
    token = secrets.token_urlsafe(32)
    try:
        return Website.objects.create(
            owner=owner,
            domain=domain,
            display_name=(display_name or domain).strip()[:120],
            verification_token=token,
        )
    except IntegrityError:
        raise ValueError("You already added this domain to your workspace.") from None


def verification_record(website):
    if website.verification_status != Website.VerificationStatus.PENDING or not website.verification_token:
        return None
    return {
        "type": "TXT",
        "name": f"_sentinel-verification.{website.domain}",
        "value": f"{TXT_PREFIX}{website.verification_token}",
    }


def _has_verification_txt(website):
    resolver = dns.resolver.Resolver(configure=True)
    resolver.timeout = 2
    resolver.lifetime = 4
    record_name = f"_sentinel-verification.{website.domain}"
    try:
        answers = resolver.resolve(record_name, "TXT", lifetime=4)
    except dns.exception.DNSException:
        return False
    expected = f"{TXT_PREFIX}{website.verification_token}"
    for answer in answers:
        actual = b"".join(answer.strings).decode("utf-8", errors="replace")
        if actual == expected:
            return True
    return False


def verify_website_ownership(website):
    if website.verification_status == Website.VerificationStatus.VERIFIED:
        return True
    if not _has_verification_txt(website):
        return False
    website.verification_status = Website.VerificationStatus.VERIFIED
    website.verified_at = timezone.now()
    website.verification_token = ""
    website.save(update_fields=["verification_status", "verified_at", "verification_token", "updated_at"])
    return True