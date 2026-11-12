from django.conf import settings
from django.db import models
from django.utils import timezone


class SEOAudit(models.Model):
    class Status(models.TextChoices):
        COMPLETE = "complete", "Complete"
        ERROR = "error", "Error"

    class ErrorCategory(models.TextChoices):
        DNS_ERROR = "dns_error", "DNS error"
        BLOCKED_ADDRESS = "blocked_address", "Blocked destination"
        TIMEOUT = "timeout", "Timeout"
        TLS_ERROR = "tls_error", "TLS error"
        CONNECTION_ERROR = "connection_error", "Connection error"
        NOT_HTML = "not_html", "Not an HTML page"
        TOO_LARGE = "too_large", "Page too large"

    website = models.ForeignKey("websites.Website", on_delete=models.CASCADE, related_name="seo_audits")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="initiated_seo_audits")
    status = models.CharField(max_length=8, choices=Status.choices)
    http_status = models.PositiveSmallIntegerField(null=True, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    title = models.CharField(max_length=300, blank=True)
    description = models.CharField(max_length=320, blank=True)
    h1 = models.CharField(max_length=300, blank=True)
    canonical_url = models.CharField(max_length=512, blank=True)
    has_viewport = models.BooleanField(default=False)
    is_indexable = models.BooleanField(default=True)
    language = models.CharField(max_length=32, blank=True)
    h1_count = models.PositiveSmallIntegerField(default=0)
    h2_count = models.PositiveSmallIntegerField(default=0)
    image_count = models.PositiveSmallIntegerField(default=0)
    images_missing_alt = models.PositiveSmallIntegerField(default=0)
    open_graph_title = models.CharField(max_length=300, blank=True)
    open_graph_description = models.CharField(max_length=320, blank=True)
    open_graph_image = models.CharField(max_length=512, blank=True)
    twitter_card = models.CharField(max_length=32, blank=True)
    structured_data_count = models.PositiveSmallIntegerField(default=0)
    has_favicon = models.BooleanField(default=False)
    robots_txt_found = models.BooleanField(default=False)
    sitemap_found = models.BooleanField(default=False)
    blocks_all_crawlers = models.BooleanField(default=False)
    issues = models.JSONField(default=list, blank=True)
    error_category = models.CharField(max_length=24, choices=ErrorCategory.choices, blank=True)
    checked_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [models.Index(fields=["website", "checked_at"])]
        ordering = ["-checked_at"]

    def __str__(self):
        return f"SEO audit for {self.website.domain}: {self.status}"
