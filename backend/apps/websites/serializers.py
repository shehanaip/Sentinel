from rest_framework import serializers

from .models import Website
from .services import normalize_domain, verification_record


class WebsiteCreateSerializer(serializers.Serializer):
    domain = serializers.CharField(max_length=253)
    display_name = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate_domain(self, value):
        try:
            return normalize_domain(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate(self, attrs):
        owner = self.context["request"].user
        if Website.objects.filter(owner=owner, domain=attrs["domain"]).exists():
            raise serializers.ValidationError({"domain": "You already added this domain to your workspace."})
        return attrs


class WebsiteUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Website
        fields = ["display_name"]


class WebsiteSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    verification_record = serializers.SerializerMethodField()

    class Meta:
        model = Website
        fields = ["id", "display_name", "domain", "verification_status", "verification_record", "verified_at", "created_at", "updated_at"]
        read_only_fields = fields

    def get_verification_record(self, obj):
        return verification_record(obj)