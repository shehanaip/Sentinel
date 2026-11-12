import dns.exception
import http.client
import socket
import ssl
import time

from django.utils import timezone

from apps.websites.models import Website
from config.networking import DNSLookupError, UnsafeTarget, safe_https_get
from .models import UptimeCheck

MAX_RESPONSE_BYTES = 1024


def perform_uptime_check(website, *, created_by=None):
    started = time.perf_counter()
    http_status = None
    error_category = ""
    try:
        if website.verification_status != Website.VerificationStatus.VERIFIED:
            raise UnsafeTarget
        domain = website.domain
        if not domain or any(char in domain for char in "/:#@?\\"):
            raise UnsafeTarget
        response = safe_https_get(domain, max_body_bytes=MAX_RESPONSE_BYTES)
        http_status = response["status_code"]
        status = UptimeCheck.Status.UP if http_status < 500 else UptimeCheck.Status.DOWN
        error_category = "" if status == UptimeCheck.Status.UP else UptimeCheck.ErrorCategory.HTTP_ERROR
    except UnsafeTarget:
        status = UptimeCheck.Status.DOWN
        error_category = UptimeCheck.ErrorCategory.BLOCKED_ADDRESS
    except (dns.exception.DNSException, DNSLookupError, socket.gaierror):
        status = UptimeCheck.Status.DOWN
        error_category = UptimeCheck.ErrorCategory.DNS_ERROR
    except (socket.timeout, TimeoutError):
        status = UptimeCheck.Status.DOWN
        error_category = UptimeCheck.ErrorCategory.TIMEOUT
    except ssl.SSLError:
        status = UptimeCheck.Status.DOWN
        error_category = UptimeCheck.ErrorCategory.TLS_ERROR
    except (OSError, http.client.HTTPException, ConnectionError):
        status = UptimeCheck.Status.DOWN
        error_category = UptimeCheck.ErrorCategory.CONNECTION_ERROR

    duration_ms = max(0, round((time.perf_counter() - started) * 1000))
    check = UptimeCheck.objects.create(
        website=website,
        status=status,
        http_status=http_status,
        duration_ms=duration_ms,
        error_category=error_category,
        checked_at=timezone.now(),
        created_by=created_by,
    )
    website.last_uptime_check_at = check.checked_at
    website.save(update_fields=["last_uptime_check_at", "updated_at"])
    return check
