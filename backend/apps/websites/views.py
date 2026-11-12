from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import Website
from .serializers import WebsiteCreateSerializer, WebsiteSerializer, WebsiteUpdateSerializer
from .services import create_website, verify_website_ownership


class WebsiteCreateThrottle(UserRateThrottle):
    scope = "website_create"


class WebsiteVerificationThrottle(UserRateThrottle):
    scope = "website_verification"


class WebsiteListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WebsiteCreateThrottle]

    def get(self, request):
        websites = Website.objects.filter(owner=request.user).order_by("-created_at")
        return Response(WebsiteSerializer(websites, many=True).data)

    def post(self, request):
        serializer = WebsiteCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            website = create_website(owner=request.user, **serializer.validated_data)
        except ValueError as exc:
            return Response({"domain": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(WebsiteSerializer(website).data, status=status.HTTP_201_CREATED)


class WebsiteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(Website, pk=pk, owner=request.user)

    def get(self, request, pk):
        return Response(WebsiteSerializer(self.get_object(request, pk)).data)

    def patch(self, request, pk):
        website = self.get_object(request, pk)
        serializer = WebsiteUpdateSerializer(website, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(WebsiteSerializer(website).data)

    def delete(self, request, pk):
        self.get_object(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifyWebsiteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WebsiteVerificationThrottle]

    def post(self, request, pk):
        website = get_object_or_404(Website, pk=pk, owner=request.user)
        verified = verify_website_ownership(website)
        if verified:
            return Response(WebsiteSerializer(website).data)
        return Response(
            {"verification_status": "pending", "detail": "The DNS TXT record was not found yet. DNS changes can take a few minutes to propagate."},
            status=status.HTTP_200_OK,
        )