from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from orders.models import Order

from .models import GlobalSettings
from .utils import _translate_password_errors

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    title = serializers.CharField(required=False, allow_blank=True, default="")
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = User
        fields = ("id", "email", "password", "title", "first_name", "last_name")

    def validate_password(self, value):
        """Validate password using Django's validators."""
        try:
            # Create a temporary user object for validation context
            temp_user = User(email=self.initial_data.get("email"))
            validate_password(value, user=temp_user)
        except ValidationError as e:
            raise serializers.ValidationError(_translate_password_errors(e))
        return value


class UserSerializer(serializers.ModelSerializer):
    annual_discount_valid_until = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "title",
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
            "annual_discount_percent",
            "annual_discount_year",
            "annual_discount_valid_until",
        )
        read_only_fields = (
            "annual_discount_percent",
            "annual_discount_year",
            "annual_discount_valid_until",
        )

    def get_annual_discount_valid_until(self, obj):
        current_year = timezone.localdate().year
        if obj.annual_discount_year != current_year or obj.annual_discount_percent <= 0:
            return None
        return date(current_year, 12, 31)


class AdminUserSerializer(UserSerializer):
    turnover_last_12_months = serializers.SerializerMethodField()
    turnover_monthly = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + (
            "turnover_last_12_months",
            "turnover_monthly",
        )

    def _paid_orders(self, obj):
        since = timezone.now() - timedelta(days=365)
        return Order.objects.filter(
            user=obj,
            created_at__gte=since,
            status__in=["paid", "shipped", "completed"],
        )

    def get_turnover_last_12_months(self, obj):
        total = self._paid_orders(obj).aggregate(total=Sum("total_price"))["total"] or 0
        return round(float(total), 2)

    def get_turnover_monthly(self, obj):
        today = timezone.localdate().replace(day=1)
        buckets = []
        for offset in range(11, -1, -1):
            month = today
            for _ in range(offset):
                month = (month - timedelta(days=1)).replace(day=1)
            if month.month == 12:
                next_month = month.replace(year=month.year + 1, month=1)
            else:
                next_month = month.replace(month=month.month + 1)
            total = (
                self._paid_orders(obj)
                .filter(
                    created_at__date__gte=month,
                    created_at__date__lt=next_month,
                )
                .aggregate(total=Sum("total_price"))["total"]
                or 0
            )
            buckets.append(
                {
                    "month": month.strftime("%Y-%m"),
                    "turnover": round(float(total), 2),
                }
            )
        return buckets


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "title",
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
            "title",
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
            "annual_discount_percent",
            "annual_discount_year",
        )
        read_only_fields = ("annual_discount_year",)

    def validate_annual_discount_percent(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Discount must be between 0 and 100.")
        return value

    def update(self, instance, validated_data):
        if "annual_discount_percent" in validated_data:
            validated_data["annual_discount_year"] = timezone.localdate().year
        return super().update(instance, validated_data)


class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = "__all__"
