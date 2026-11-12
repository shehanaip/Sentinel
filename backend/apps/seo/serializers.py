from rest_framework import serializers
from .models import SEOAudit


class SEOAuditSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    website_id = serializers.CharField(read_only=True)
    domain = serializers.CharField(source="website.domain", read_only=True)
    display_name = serializers.CharField(source="website.display_name", read_only=True)

    class Meta:
        model = SEOAudit
        fields = ["id", "website_id", "domain", "display_name", "status", "http_status", "score", "title", "description", "h1", "canonical_url", "has_viewport", "is_indexable", "language", "h1_count", "h2_count", "image_count", "images_missing_alt", "open_graph_title", "open_graph_description", "open_graph_image", "twitter_card", "structured_data_count", "has_favicon", "robots_txt_found", "sitemap_found", "blocks_all_crawlers", "issues", "error_category", "checked_at"]
