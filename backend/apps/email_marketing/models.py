import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class MarketingContact(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending confirmation"
        SUBSCRIBED = "subscribed", "Subscribed"
        UNSUBSCRIBED = "unsubscribed", "Unsubscribed"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="marketing_contacts")
    email = models.EmailField(max_length=254)
    name = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    consent_source = models.CharField(max_length=120)
    consented_at = models.DateTimeField(default=timezone.now)
    confirmation_token_hash = models.CharField(max_length=64, blank=True)
    confirmation_expires_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "email"], name="email_marketing_owner_email_unique")]
        indexes = [models.Index(fields=["owner", "status", "created_at"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.status})"


class EmailCampaign(models.Model):
    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        PARTIAL = "partial", "Partially sent"
        FAILED = "failed", "Failed"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_campaigns")
    brand_name = models.CharField(max_length=100, default="Sentinel")
    accent_palette = models.CharField(max_length=10, default="emerald")
    subject = models.CharField(max_length=200)
    body = models.TextField(max_length=20000)
    status = models.CharField(max_length=8, choices=Status.choices)
    attempted_count = models.PositiveSmallIntegerField(default=0)
    sent_count = models.PositiveSmallIntegerField(default=0)
    failed_count = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.subject


class EmailShareRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for recipient"
        CONFIRMATION_SENT = "confirmation_sent", "Waiting for inbox confirmation"
        CONFIRMED = "confirmed", "Email shared and confirmed"
        EXPIRED = "expired", "Expired"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="email_share_requests")
    request_token_hash = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING)
    email = models.EmailField(max_length=254, blank=True)
    confirmation_token_hash = models.CharField(max_length=64, blank=True)
    expires_at = models.DateTimeField()
    confirmation_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["owner", "status", "created_at"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Email share request ({self.status})"
