from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .lookup_services import EmailLookupError, check_mail_routing, confirm_lookup_token, normalize_email, send_lookup_confirmation
from .models import EmailShareRequest
from .share_services import confirm_shared_email, create_share_request, submit_shared_email
from django.utils import timezone


class EmailLookupThrottle(UserRateThrottle):
    scope = "email_lookup"


class EmailLookupConfirmationThrottle(UserRateThrottle):
    scope = "email_lookup_confirmation"


class PublicLookupConfirmationThrottle(AnonRateThrottle):
    scope = "marketing_public_action"


class EmailShareCreateThrottle(UserRateThrottle):
    scope = "email_share_create"


class EmailSharePublicThrottle(AnonRateThrottle):
    scope = "email_share_public"


class EmailShareRequestsView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [EmailShareCreateThrottle]

    def get(self, request):
        now = timezone.now()
        rows = EmailShareRequest.objects.filter(owner=request.user).order_by("-created_at")[:50]
        results = []
        for row in rows:
            current_status = row.status
            if current_status != EmailShareRequest.Status.CONFIRMED and row.expires_at <= now:
                current_status = EmailShareRequest.Status.EXPIRED
            results.append({
                "id": str(row.pk),
                "status": current_status,
                "email": row.email if current_status == EmailShareRequest.Status.CONFIRMED else "",
                "created_at": row.created_at,
                "expires_at": row.expires_at,
                "confirmed_at": row.confirmed_at,
            })
        return Response(results)

    def post(self, request):
        try:
            item, share_url = create_share_request(request.user)
        except EmailLookupError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"id": str(item.pk), "share_url": share_url, "expires_at": item.expires_at}, status=201)


class SubmitSharedEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [EmailSharePublicThrottle]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        try:
            submit_shared_email(request_token=payload.get("request_token"), email=payload.get("email"))
        except EmailLookupError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"sent": True, "detail": "Confirmation email sent. The requester can see this address only after you confirm it from that inbox."}, status=202)


class ConfirmSharedEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [EmailSharePublicThrottle]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        try:
            confirm_shared_email(payload.get("token"))
        except EmailLookupError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"verified": True, "detail": "Your email address is confirmed and has been shared with the requester."})


class EmailLookupView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [EmailLookupThrottle]

    def post(self, request):
        try:
            email = normalize_email(request.data.get("email") if isinstance(request.data, dict) else None)
        except EmailLookupError as exc:
            return Response({"detail": str(exc)}, status=400)
        result = check_mail_routing(email)
        return Response({
            "email": email,
            "syntax_valid": True,
            "domain_status": result["status"],
            "mail_servers": result["mx_hosts"],
            "routing": result.get("routing", "mx"),
            "mailbox_status": "unknown",
            "message": "DNS can show that a domain has mail routing, but it cannot confirm that this specific mailbox exists. Send a confirmation link to verify inbox access.",
        })


class SendLookupConfirmationView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [EmailLookupConfirmationThrottle]

    def post(self, request):
        try:
            email = normalize_email(request.data.get("email") if isinstance(request.data, dict) else None)
            routing = check_mail_routing(email)
            if routing["status"] != "mail_server_found":
                return Response({"detail": "The address domain has no confirmed mail routing. Run a lookup again after its DNS is configured."}, status=400)
            send_lookup_confirmation(email)
        except EmailLookupError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"sent": True, "detail": "Confirmation link sent. The address will be verified only after someone opens the link from that inbox."})


class ConfirmLookupEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicLookupConfirmationThrottle]

    def post(self, request):
        try:
            masked = confirm_lookup_token(request.data.get("token") if isinstance(request.data, dict) else None)
        except EmailLookupError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response({"verified": True, "email_masked": masked, "detail": "Inbox access confirmed. This verifies that the link was opened, not identity or future deliverability."})
