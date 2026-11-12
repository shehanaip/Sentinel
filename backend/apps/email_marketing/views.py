from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .models import EmailCampaign, MarketingContact
from .serializers import EmailCampaignSerializer, MarketingContactSerializer
from .services import ContactValidationError, add_contact, confirm_contact, send_campaign, send_contact_confirmation


class MarketingContactsThrottle(UserRateThrottle):
    scope = "marketing_contacts"


class MarketingImportThrottle(UserRateThrottle):
    scope = "marketing_import"


class MarketingCampaignThrottle(UserRateThrottle):
    scope = "marketing_campaign"


class PublicMarketingThrottle(AnonRateThrottle):
    scope = "marketing_public_action"


class MarketingContactsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [MarketingContactsThrottle]

    def get(self, request):
        contacts = MarketingContact.objects.filter(owner=request.user).order_by("-created_at")[:500]
        return Response(MarketingContactSerializer(contacts, many=True).data)

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        if payload.get("consent_confirmed") is not True:
            return Response({"detail": "Confirm this person opted in before adding them."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            contact, created, result, confirmation_sent = add_contact(
                request.user,
                email=payload.get("email"),
                name=payload.get("name", ""),
                consent_source=payload.get("consent_source", "Manual opt-in recorded by workspace owner"),
            )
        except ContactValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if result == "unsubscribed":
            return Response({"detail": "This address has unsubscribed and cannot be re-added by an administrator."}, status=status.HTTP_409_CONFLICT)
        return Response({"contact": MarketingContactSerializer(contact).data, "result": result, "confirmation_sent": confirmation_sent}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MarketingImportView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [MarketingImportThrottle]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        if payload.get("consent_confirmed") is not True:
            return Response({"detail": "Confirm that every imported address opted in."}, status=status.HTTP_400_BAD_REQUEST)
        contacts = payload.get("contacts")
        if not isinstance(contacts, list) or not 1 <= len(contacts) <= 100:
            return Response({"detail": "Import between one and 100 contacts per batch."}, status=status.HTTP_400_BAD_REQUEST)
        source = str(payload.get("consent_source", "Bulk import; opt-in attested by workspace owner"))[:120]
        added = duplicates = unsubscribed = invalid = confirmations_sent = confirmations_failed = 0
        for row in contacts:
            if not isinstance(row, dict):
                invalid += 1
                continue
            try:
                _, created, result, confirmation_sent = add_contact(request.user, email=row.get("email"), name=row.get("name", ""), consent_source=source)
            except ContactValidationError:
                invalid += 1
                continue
            if result == "unsubscribed": unsubscribed += 1
            elif created:
                added += 1
                if confirmation_sent: confirmations_sent += 1
                else: confirmations_failed += 1
            else: duplicates += 1
        return Response({"added": added, "duplicates": duplicates, "unsubscribed": unsubscribed, "invalid": invalid, "confirmations_sent": confirmations_sent, "confirmations_failed": confirmations_failed})


class ResendContactConfirmationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [MarketingContactsThrottle]

    def post(self, request, contact_id):
        contact = get_object_or_404(MarketingContact, pk=contact_id, owner=request.user)
        if contact.status != MarketingContact.Status.PENDING:
            return Response({"detail": "Only pending contacts need confirmation."}, status=status.HTTP_400_BAD_REQUEST)
        sent = send_contact_confirmation(contact)
        return Response({"confirmation_sent": sent}, status=status.HTTP_200_OK if sent else status.HTTP_503_SERVICE_UNAVAILABLE)


class ConfirmMarketingContactView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicMarketingThrottle]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        confirmed = confirm_contact(payload.get("token", ""))
        if not confirmed:
            return Response({"detail": "This confirmation link is invalid, already used, or expired."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "subscribed"})


class MarketingCampaignsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        campaigns = EmailCampaign.objects.filter(owner=request.user).order_by("-created_at")[:50]
        return Response(EmailCampaignSerializer(campaigns, many=True).data)


class SendMarketingCampaignView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [MarketingCampaignThrottle]

    def post(self, request):
        try:
            payload = request.data if isinstance(request.data, dict) else {}
            campaign = send_campaign(request.user, subject=payload.get("subject", ""), body=payload.get("body", ""), brand_name=payload.get("brand_name", "Sentinel"), accent_palette=payload.get("accent_palette", "emerald"))
        except ContactValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(EmailCampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)


class MarketingUnsubscribeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicMarketingThrottle]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        token = payload.get("token", "")
        contact = get_object_or_404(MarketingContact, unsubscribe_token=token)
        if contact.status != MarketingContact.Status.UNSUBSCRIBED:
            contact.status = MarketingContact.Status.UNSUBSCRIBED
            contact.unsubscribed_at = timezone.now()
            contact.save(update_fields=["status", "unsubscribed_at"])
        return Response({"status": "unsubscribed"})
