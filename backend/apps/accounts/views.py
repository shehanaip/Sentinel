from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .serializers import EmailVerificationSerializer, LoginSerializer, PasswordChangeSerializer, ProfilePreferencesSerializer, RegistrationSerializer
from .services import EmailDeliveryUnavailable, register_user, verify_email


class RegistrationThrottle(AnonRateThrottle):
    scope = "registration"


class VerificationThrottle(AnonRateThrottle):
    scope = "email_verification"


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationThrottle]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            register_user(**serializer.validated_data)
        except EmailDeliveryUnavailable:
            return Response(
                {"detail": "Email delivery is unavailable. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {"detail": "If this address can be registered, verification instructions will be emailed."},
            status=status.HTTP_202_ACCEPTED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [VerificationThrottle]

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not verify_email(**serializer.validated_data):
            return Response(
                {"detail": "This verification link is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Email verified. You can now sign in."})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Email or password is incorrect, or the email has not been verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        return Response({"id": str(user.pk), "name": user.name, "email": user.email})


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({"id": str(user.pk), "name": user.name, "email": user.email, "avatar_data": user.avatar_data, "notify_uptime": user.notify_uptime, "notify_security": user.notify_security, "preferred_language": user.preferred_language, "country": user.country, "timezone": user.timezone})


@method_decorator(csrf_protect, name="dispatch")
class ProfilePreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ProfilePreferencesSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(request.user, field, value)
        request.user.save(update_fields=list(serializer.validated_data.keys()))
        return Response({"detail": "Settings saved."})


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response({"current_password": ["Current password is incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response({"detail": "Password updated."})
