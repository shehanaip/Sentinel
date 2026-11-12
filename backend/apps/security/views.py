from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.websites.models import Website
from .models import SecurityAudit
from .serializers import SecurityAuditSerializer
from .services import run_security_audit


class SecurityAuditThrottle(UserRateThrottle):
    scope = "security_audit"


class SecurityAuditHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        website_ids = list(Website.objects.filter(owner=request.user).values_list("id", flat=True))
        audits = SecurityAudit.objects.filter(website_id__in=website_ids).order_by("-checked_at")[:100]
        return Response(SecurityAuditSerializer(audits, many=True).data)


class RunSecurityAuditView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SecurityAuditThrottle]

    def post(self, request, website_id):
        website = get_object_or_404(Website, pk=website_id, owner=request.user)
        if website.verification_status != Website.VerificationStatus.VERIFIED:
            return Response({"detail": "Verify website ownership before running a security audit."}, status=status.HTTP_400_BAD_REQUEST)
        audit = run_security_audit(website, created_by=request.user)
        return Response(SecurityAuditSerializer(audit).data, status=status.HTTP_201_CREATED)


class RunDomainSecurityAuditView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SecurityAuditThrottle]

    def post(self, request, website_id):
        website = get_object_or_404(Website, pk=website_id, owner=request.user)
        if website.verification_status != Website.VerificationStatus.VERIFIED:
            return Response({"detail": "Verify website ownership before running a security audit."}, status=status.HTTP_400_BAD_REQUEST)
        audit = run_security_audit(website, created_by=request.user, audit_type=SecurityAudit.AuditType.DOMAIN)
        return Response(SecurityAuditSerializer(audit).data, status=status.HTTP_201_CREATED)
import dns.exception
import http.client
import socket
import ssl



