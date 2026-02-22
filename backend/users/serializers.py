from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
import os

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

        # Send Verification Email
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5001")
        verify_url = f"{frontend_url}/verify-email/{uid}/{token}/"

        subject = "Overenie e-mailovej adresy - DentalShop"
        message = f"Dobrý deň,\n\nĎakujeme za vašu registráciu na DentalShop.\nPre dokončenie registrácie a aktiváciu vášho účtu kliknite na nasledujúci odkaz:\n\n{verify_url}\n\nAk ste si účet nevytvárali, tento e-mail môžete ignorovať.\n\nS pozdravom,\nDentalShop Tím"

        try:
            send_mail(
                subject,
                message,
                getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk"),
                [user.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")

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


from .models import GlobalSettings


class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = "__all__"
