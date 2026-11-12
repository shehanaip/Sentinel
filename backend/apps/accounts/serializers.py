from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import base64
import binascii


class RegistrationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(min_length=12, max_length=128, write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_password(self, value):
        validate_password(value)
        return value


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    token = serializers.CharField(min_length=32, max_length=128, trim_whitespace=True)

    def validate_email(self, value):
        return value.strip().lower()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        return value.strip().lower()


class ProfilePreferencesSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True, required=False)
    avatar_data = serializers.CharField(allow_blank=True, max_length=700000, required=False)
    notify_uptime = serializers.BooleanField(required=False)
    notify_security = serializers.BooleanField(required=False)
    preferred_language = serializers.ChoiceField(choices=["en", "bn"], required=False)
    country = serializers.CharField(max_length=56, allow_blank=True, required=False)
    timezone = serializers.CharField(max_length=64, required=False)

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Name cannot be blank.")
        return value.strip()

    def validate_avatar_data(self, value):
        if value:
            try:
                header, payload = value.split(",", 1)
                image = base64.b64decode(payload, validate=True)
            except (ValueError, binascii.Error):
                raise serializers.ValidationError("Choose a valid JPG, PNG, or WebP image.")
            valid = ((header == "data:image/jpeg;base64" and image.startswith(b"\xff\xd8\xff")) or
                     (header == "data:image/png;base64" and image.startswith(b"\x89PNG\r\n\x1a\n")) or
                     (header == "data:image/webp;base64" and image.startswith(b"RIFF") and image[8:12] == b"WEBP"))
            if not valid or len(image) > 500_000:
                raise serializers.ValidationError("Use a JPG, PNG, or WebP image smaller than 500 KB.")
        return value

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError("Choose a valid time zone.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(min_length=12, max_length=128, write_only=True, trim_whitespace=False)

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value
