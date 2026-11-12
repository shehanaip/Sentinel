from django.conf import settings
from django.db import models
from django.utils import timezone


class SecurityAudit(models.Model):
    class AuditType(models.TextChoices):
        HEADERS = "headers", "Web security headers"
        DOMAIN = "domain", "Domain and TLS posture"

    class Status(models.TextChoices):
        COMPLETE = "complete", "Complete"
        ERROR = "error", "Error"

    website = models.ForeignKey("websites.Website", on_delete=models.CASCADE, related_name="security_audits")
    audit_type = models.CharField(max_length=12, choices=AuditType.choices, default=AuditType.HEADERS)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="initiated_security_audits")
    status = models.CharField(max_length=8, choices=Status.choices)
    http_status = models.PositiveSmallIntegerField(null=True, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    checks = models.JSONField(default=list, blank=True)
    error_category = models.CharField(max_length=24, blank=True)
    checked_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [models.Index(fields=["website", "checked_at"])]
        ordering = ["-checked_at"]

    def __str__(self):
        return f"Security audit for {self.website.domain}: {self.status}"
