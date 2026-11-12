import hashlib
import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .lookup_services import EmailLookupError, normalize_email
from .models import EmailShareRequest


def _token_hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_share_request(owner):
    active_count = EmailShareRequest.objects.filter(
        owner=owner,
        status__in=[EmailShareRequest.Status.PENDING, EmailShareRequest.Status.CONFIRMATION_SENT],
        expires_at__gt=timezone.now(),
    ).count()
    if active_count >= 20:
        raise EmailLookupError("You have 20 active email requests. Wait for some to finish or expire before creating more.")
    token = secrets.token_urlsafe(32)
    item = EmailShareRequest.objects.create(
        owner=owner,
        request_token_hash=_token_hash(token),
        expires_at=timezone.now() + timedelta(days=7),
    )
    url = f"{settings.FRONTEND_URL}/email-lookup/request?{urlencode({'token': token})}"
    return item, url


def _find_request(token):
    if not isinstance(token, str) or not token or len(token) > 200:
        raise EmailLookupError("This request link is invalid or expired.")
    item = EmailShareRequest.objects.filter(request_token_hash=_token_hash(token)).first()
    if not item or item.expires_at <= timezone.now() or item.status != EmailShareRequest.Status.PENDING:
        raise EmailLookupError("This request link is invalid, already used, or expired.")
    return item


def submit_shared_email(*, request_token, email):
    item = _find_request(request_token)
    email = normalize_email(email)
    if not settings.EMAIL_HOST or not settings.DEFAULT_FROM_EMAIL:
        raise EmailLookupError("Email confirmation is not configured. The workspace owner needs to check SMTP settings.")

    confirmation_token = secrets.token_urlsafe(32)
    item.email = email
    item.confirmation_token_hash = _token_hash(confirmation_token)
    item.confirmation_expires_at = timezone.now() + timedelta(hours=24)
    item.status = EmailShareRequest.Status.CONFIRMATION_SENT
    item.save(update_fields=["email", "confirmation_token_hash", "confirmation_expires_at", "status"])

    link = f"{settings.FRONTEND_URL}/email-lookup/confirm-share?{urlencode({'token': confirmation_token})}"
    try:
        sent = send_mail(
            subject="Confirm sharing your email address",
            message=(
                "You entered this address after opening an email-sharing request in Sentinel. "
                "The requester will see your address only after you confirm it using this link:\n\n"
                f"{link}\n\nThis link expires in 24 hours. If you did not submit this address, ignore this message."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        if sent != 1:
            raise RuntimeError("Email provider did not accept the message")
    except Exception as exc:
        item.email = ""
        item.confirmation_token_hash = ""
        item.confirmation_expires_at = None
        item.status = EmailShareRequest.Status.PENDING
        item.save(update_fields=["email", "confirmation_token_hash", "confirmation_expires_at", "status"])
        raise EmailLookupError("Could not send the confirmation email. Check the address or SMTP settings and try again.") from exc


def confirm_shared_email(token):
    if not isinstance(token, str) or not token or len(token) > 200:
        raise EmailLookupError("This confirmation link is invalid or expired.")
    item = EmailShareRequest.objects.filter(
        confirmation_token_hash=_token_hash(token),
        confirmation_expires_at__gt=timezone.now(),
        status=EmailShareRequest.Status.CONFIRMATION_SENT,
    ).first()
    if not item or item.expires_at <= timezone.now():
        raise EmailLookupError("This confirmation link is invalid or expired.")
    item.status = EmailShareRequest.Status.CONFIRMED
    item.confirmed_at = timezone.now()
    item.confirmation_token_hash = ""
    item.confirmation_expires_at = None
    item.save(update_fields=["status", "confirmed_at", "confirmation_token_hash", "confirmation_expires_at"])
    return True
