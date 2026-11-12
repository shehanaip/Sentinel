from django.conf import settings
from django.db import models
from django.utils import timezone


class UptimeCheck(models.Model):
    class Status(models.TextChoices):
        UP = "up", "Up"
        DOWN = "down", "Down"

    class ErrorCategory(models.TextChoices):
        DNS_ERROR = "dns_error", "DNS error"
        BLOCKED_ADDRESS = "blocked_address", "Blocked destination"
        TIMEOUT = "timeout", "Timeout"
        TLS_ERROR = "tls_error", "TLS error"
        CONNECTION_ERROR = "connection_error", "Connection error"
        HTTP_ERROR = "http_error", "Server error"

    website = models.ForeignKey("websites.Website", on_delete=models.CASCADE, related_name="uptime_checks")
    status = models.CharField(max_length=4, choices=Status.choices)
    http_status = models.PositiveSmallIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField()
    error_category = models.CharField(max_length=24, choices=ErrorCategory.choices, blank=True)
    checked_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="initiated_uptime_checks")

    class Meta:
        indexes = [models.Index(fields=["website", "checked_at"])]
        ordering = ["-checked_at"]

    def __str__(self):
        return f"{self.website.domain}: {self.status} ({self.checked_at:%Y-%m-%d %H:%M:%S})"
