from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import GlobalSettings
from .utils import send_verification_email, _translate_password_errors

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "password")

    def validate_password(self, value):
        """Validate password using Django's validators."""
        try:
            # Create a temporary user object for validation context
            temp_user = User(email=self.initial_data.get("email"))
            validate_password(value, user=temp_user)
        except ValidationError as e:
            raise serializers.ValidationError(_translate_password_errors(e))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
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
