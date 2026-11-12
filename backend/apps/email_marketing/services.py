import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection, send_mail
from django.core.validators import validate_email
from django.db import IntegrityError
from django.utils import timezone
from django.utils.html import escape
from django.utils.http import urlencode

from .models import EmailCampaign, MarketingContact


class ContactValidationError(ValueError):
    pass


EMAIL_PALETTES = {
    "emerald": "#168a6a",
    "blue": "#4d74d9",
    "violet": "#7959c7",
    "rose": "#ce5275",
}


def _campaign_html(*, brand_name, subject, body, accent, unsubscribe_url):
    paragraphs = "".join(
        f'<p style="margin:0 0 16px;color:#334155;font:16px/1.65 Arial,sans-serif;white-space:pre-wrap">{escape(part).replace(chr(10), "<br>")}</p>'
        for part in body.split("\n\n") if part.strip()
    )
    safe_brand = escape(brand_name)
    safe_subject = escape(subject)
    safe_unsubscribe = escape(unsubscribe_url)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:28px 12px;background:#f2f5f7;font-family:Arial,sans-serif;color:#182434">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{safe_subject}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e4eaf0;border-radius:16px;overflow:hidden">
<tr><td style="height:7px;background:{accent};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 34px 8px"><div style="font-size:12px;font-weight:700;letter-spacing:.5px;color:{accent}">{safe_brand}</div><div style="margin-top:18px;color:#718096;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">An update for you</div><h1 style="margin:8px 0 20px;color:#182434;font:700 27px/1.25 Arial,sans-serif">{safe_subject}</h1></td></tr>
<tr><td style="padding:0 34px 26px">{paragraphs}</td></tr>
<tr><td style="padding:18px 34px 24px;background:#f7f9fb;border-top:1px solid #e9eef2"><p style="margin:0 0 8px;color:#64748b;font:12px/1.5 Arial,sans-serif">You received this message because you confirmed your subscription to {safe_brand} updates.</p><a href="{safe_unsubscribe}" style="color:{accent};font:12px Arial,sans-serif;text-decoration:underline">Unsubscribe from future emails</a></td></tr>
</table></body></html>'''


def _token_hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def send_contact_confirmation(contact):
    if not settings.EMAIL_HOST or not settings.DEFAULT_FROM_EMAIL:
        return False
    token = secrets.token_urlsafe(32)
    contact.confirmation_token_hash = _token_hash(token)
    contact.confirmation_expires_at = timezone.now() + timedelta(days=2)
    contact.save(update_fields=["confirmation_token_hash", "confirmation_expires_at"])
    link = f"{settings.FRONTEND_URL}/email-marketing/confirm?{urlencode({'token': token})}"
    try:
        return send_mail(
            subject="Confirm your email subscription",
            message=f"Someone added this address to receive updates from Sentinel. Confirm the subscription here:\n\n{link}\n\nIf you did not opt in, ignore this message.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[contact.email],
            fail_silently=False,
        ) == 1
    except Exception:
        return False


def confirm_contact(token):
    if not isinstance(token, str) or not token:
        return False
    contact = MarketingContact.objects.filter(confirmation_token_hash=_token_hash(token), confirmation_expires_at__gt=timezone.now(), status=MarketingContact.Status.PENDING).first()
    if not contact:
        return False
    contact.status = MarketingContact.Status.SUBSCRIBED
    contact.confirmed_at = timezone.now()
    contact.confirmation_token_hash = ""
    contact.confirmation_expires_at = None
    contact.save(update_fields=["status", "confirmed_at", "confirmation_token_hash", "confirmation_expires_at"])
    return True


def add_contact(owner, *, email, name="", consent_source=""):
    if not isinstance(email, str):
        raise ContactValidationError("Enter a valid email address.")
    email = email.strip().lower()
    try:
        validate_email(email)
    except Exception as exc:
        raise ContactValidationError("Enter a valid email address.") from exc
    source = str(consent_source).strip()[:120]
    if not source:
        raise ContactValidationError("Describe how this contact opted in.")
    existing = MarketingContact.objects.filter(owner=owner, email=email).first()
    if existing:
        if existing.status == MarketingContact.Status.UNSUBSCRIBED:
            return existing, False, "unsubscribed", False
        return existing, False, "duplicate", False
    try:
        contact = MarketingContact.objects.create(owner=owner, email=email, name=str(name).strip()[:120], consent_source=source)
        confirmation_sent = send_contact_confirmation(contact)
        return contact, True, "pending", confirmation_sent
    except IntegrityError:
        contact = MarketingContact.objects.filter(owner=owner, email=email).first()
        if contact:
            return contact, False, "duplicate", False
        raise


def send_campaign(owner, *, subject, body, brand_name="Sentinel", accent_palette="emerald"):
    subject = str(subject).strip()
    body = str(body).strip()
    brand_name = str(brand_name).strip()[:100]
    accent = EMAIL_PALETTES.get(str(accent_palette))
    if not subject or len(subject) > 200:
        raise ContactValidationError("Enter a subject up to 200 characters.")
    if not body or len(body) > 20000:
        raise ContactValidationError("Enter message text up to 20,000 characters.")
    if not brand_name:
        raise ContactValidationError("Enter a brand name for this email template.")
    if not accent:
        raise ContactValidationError("Choose a supported email accent palette.")
    contacts = list(MarketingContact.objects.filter(owner=owner, status=MarketingContact.Status.SUBSCRIBED).order_by("created_at")[:100])
    if not contacts:
        raise ContactValidationError("There are no subscribed contacts to send to.")
    if not settings.EMAIL_HOST or not settings.DEFAULT_FROM_EMAIL:
        raise ContactValidationError("Email delivery is not configured. Set EMAIL_HOST and EMAIL_FROM_ADDRESS.")

    campaign = EmailCampaign.objects.create(
        owner=owner,
        brand_name=brand_name,
        accent_palette=accent_palette,
        subject=subject,
        body=body,
        status=EmailCampaign.Status.FAILED,
        attempted_count=len(contacts),
    )
    sent_count = 0
    try:
        connection = get_connection(fail_silently=False)
        connection.open()
        for contact in contacts:
            unsubscribe_url = f"{settings.FRONTEND_URL}/email-marketing/unsubscribe?token={contact.unsubscribe_token}"
            message = EmailMultiAlternatives(
                subject=subject,
                body=f"{body}\n\n---\nYou received this because you confirmed your subscription to {brand_name} updates.\nUnsubscribe: {unsubscribe_url}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[contact.email],
                connection=connection,
                headers={
                    "List-Unsubscribe": f"<{unsubscribe_url}>",
                },
            )
            message.attach_alternative(_campaign_html(brand_name=brand_name, subject=subject, body=body, accent=accent, unsubscribe_url=unsubscribe_url), "text/html")
            try:
                sent_count += message.send(fail_silently=False)
            except Exception:
                continue
    except Exception:
        pass
    finally:
        try:
            connection.close()
        except Exception:
            pass

    campaign.sent_count = sent_count
    campaign.failed_count = len(contacts) - sent_count
    campaign.sent_at = timezone.now() if sent_count else None
    if sent_count == len(contacts):
        campaign.status = EmailCampaign.Status.SENT
    elif sent_count:
        campaign.status = EmailCampaign.Status.PARTIAL
    campaign.save(update_fields=["sent_count", "failed_count", "sent_at", "status"])
    return campaign
