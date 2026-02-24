from django.contrib.auth import get_user_model
from rest_framework import serializers
import os

from .models import GlobalSettings
from .utils import send_verification_email

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        # Deactivate user until email is verified
        user.is_active = False
        user.save()

        send_verification_email(user)

        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "street",
            "city",
            "postal_code",
            "is_company",
            "company_name",
            "ico",
            "dic",
            "is_staff",
            "is_active",
            "date_joined",
        )


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "phone",
            "street",
            "city",
            "postal_code",
            "is_company",
            "company_name",
            "ico",
            "dic",
        )


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "street",
            "city",
            "postal_code",
            "is_company",
            "company_name",
            "ico",
            "dic",
            "is_staff",
            "is_active",
        )


class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = "__all__"
