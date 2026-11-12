from rest_framework import serializers

from .models import UptimeCheck


class UptimeCheckSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    website_id = serializers.CharField(read_only=True)
    domain = serializers.CharField(source="website.domain", read_only=True)
    display_name = serializers.CharField(source="website.display_name", read_only=True)

    class Meta:
        model = UptimeCheck
        fields = ["id", "website_id", "domain", "display_name", "status", "http_status", "duration_ms", "error_category", "checked_at"]
