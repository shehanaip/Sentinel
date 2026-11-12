from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.websites.models import Website
from .models import UptimeCheck
from .serializers import UptimeCheckSerializer
from .services import perform_uptime_check


class UptimeCheckThrottle(UserRateThrottle):
    scope = "uptime_check"


class UptimeHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = min(max(int(request.query_params.get("limit", "20")), 1), 100)
        except ValueError:
            limit = 20
        website_ids = list(Website.objects.filter(owner=request.user).values_list("id", flat=True))
        checks = UptimeCheck.objects.filter(website_id__in=website_ids).order_by("-checked_at")[:limit]
        return Response(UptimeCheckSerializer(checks, many=True).data)


class RunUptimeCheckView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UptimeCheckThrottle]

    def post(self, request, website_id):
        website = get_object_or_404(Website, pk=website_id, owner=request.user)
        if website.verification_status != Website.VerificationStatus.VERIFIED:
            return Response({"detail": "Verify website ownership before running monitoring checks."}, status=status.HTTP_400_BAD_REQUEST)
        check = perform_uptime_check(website, created_by=request.user)
        check = UptimeCheck.objects.select_related("website").get(pk=check.pk)
        return Response(UptimeCheckSerializer(check).data, status=status.HTTP_201_CREATED)
