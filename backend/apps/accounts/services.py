from datetime import timedelta
import hashlib
import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.db import IntegrityError
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.utils.http import urlencode

from .models import EmailVerification, User


class EmailDeliveryUnavailable(Exception):
    """Raised when verification email cannot be delivered."""


def _token_hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _email_ready():
    return bool(settings.EMAIL_HOST and settings.DEFAULT_FROM_EMAIL)


def _send_registration_message(email, token=None):
    if token:
        query = urlencode({"email": email, "token": token})
        link = f"{settings.FRONTEND_URL}/auth/verify?{query}"
        body = (
            "Welcome to Sentinel. Verify your email address using this link:"
            + chr(10) * 2 + link + chr(10) * 2
            + "This link expires in one hour. If you did not request this, ignore this message."
        )
        subject = "Verify your Sentinel email address"
    else:
        body = "We received a Sentinel registration request for this address. If you already have an account, no further action is needed."
        subject = "Sentinel registration request"

    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        raise EmailDeliveryUnavailable() from exc
    if sent != 1:
        raise EmailDeliveryUnavailable()


def register_user(*, email, name, password):
    email = email.strip().lower()
    if not _email_ready():
        raise EmailDeliveryUnavailable()

    user = User.objects.filter(email=email).first()
    if user is None:
        try:
            user = User.objects.create_user(email=email, name=name, password=password)
        except IntegrityError:
            # A concurrent registration may have created this normalized address.
            user = User.objects.filter(email=email).first()
            if user is None:
                raise

    if user.is_active:
        _send_registration_message(email)
        return

    now = timezone.now()
    EmailVerification.objects.filter(user=user, consumed_at__isnull=True).update(consumed_at=now)
    token = secrets.token_urlsafe(32)
    EmailVerification.objects.create(
        user=user,
        token_hash=_token_hash(token),
        expires_at=now + timedelta(hours=1),
    )
    _send_registration_message(email, token)


def verify_email(*, email, token):
    email = email.strip().lower()
    user = User.objects.filter(email=email).first()
    if user is None:
        return False
    candidate_hash = _token_hash(token)
    verification = EmailVerification.objects.filter(
        user=user,
        consumed_at__isnull=True,
        expires_at__gt=timezone.now(),
    ).first()
    if verification is None or not constant_time_compare(verification.token_hash, candidate_hash):
        return False

    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])
    verification.consumed_at = timezone.now()
    verification.save(update_fields=["consumed_at"])
    return True