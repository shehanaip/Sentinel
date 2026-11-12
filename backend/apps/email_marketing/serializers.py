from rest_framework import serializers

from .models import EmailCampaign, MarketingContact


class MarketingContactSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = MarketingContact
        fields = ["id", "email", "name", "status", "consent_source", "consented_at", "confirmed_at", "unsubscribed_at", "created_at"]


class EmailCampaignSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

    class Meta:
        model = EmailCampaign
        fields = ["id", "brand_name", "accent_palette", "subject", "status", "attempted_count", "sent_count", "failed_count", "created_at", "sent_at"]
