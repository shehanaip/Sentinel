from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.websites.models import Website
from .models import SEOAudit
from .serializers import SEOAuditSerializer
from .services import check_backlink_candidates, run_seo_audit


class SEOAuditThrottle(UserRateThrottle):
    scope = "seo_audit"


class BacklinkCheckThrottle(UserRateThrottle):
    scope = "backlink_check"


class SEOAuditHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        website_ids = list(Website.objects.filter(owner=request.user).values_list("id", flat=True))
        audits = SEOAudit.objects.filter(website_id__in=website_ids).order_by("-checked_at")[:100]
        return Response(SEOAuditSerializer(audits, many=True).data)


class RunSEOAuditView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SEOAuditThrottle]

    def post(self, request, website_id):
        website = get_object_or_404(Website, pk=website_id, owner=request.user)
        if website.verification_status != Website.VerificationStatus.VERIFIED:
            return Response({"detail": "Verify website ownership before running an SEO audit."}, status=status.HTTP_400_BAD_REQUEST)
        audit = run_seo_audit(website, created_by=request.user)
        return Response(SEOAuditSerializer(audit).data, status=status.HTTP_201_CREATED)


class BacklinkCandidateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [BacklinkCheckThrottle]

    def post(self, request, website_id):
        website = get_object_or_404(Website, pk=website_id, owner=request.user)
        if website.verification_status != Website.VerificationStatus.VERIFIED:
            return Response({"detail": "Verify website ownership before checking backlink candidates."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = request.data if isinstance(request.data, dict) else {}
            results = check_backlink_candidates(website, payload.get("candidate_domains"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"candidates": results})
