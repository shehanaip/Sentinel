from django.conf import settings
from django.db import models
from django.utils import timezone


class Website(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending verification"
        VERIFIED = "verified", "Verified"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="websites")
    display_name = models.CharField(max_length=120)
    domain = models.CharField(max_length=253)
    verification_status = models.CharField(
        max_length=12,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    verification_token = models.CharField(max_length=64, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    last_uptime_check_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "domain"], name="website_owner_domain_unique")]
        indexes = [models.Index(fields=["owner", "created_at"])]
        ordering = ["-created_at"]

    def __str__(self):
        return self.domain
