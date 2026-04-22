import logging
import re

from rest_framework import serializers

from .models import Order, OrderItem, OrderItemBatch, ShippingRate
from .services import OrderService

logger = logging.getLogger(__name__)


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderItemBatchSerializer(serializers.ModelSerializer):
    batch_number = serializers.CharField(
        source="batch_lot.batch_number", read_only=True
    )

    class Meta:
        model = OrderItemBatch
        fields = ("batch_number", "quantity")


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True, source="get_subtotal"
    )
    batch_allocations = OrderItemBatchSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "quantity",
            "price_snapshot",
            "subtotal",
            "batch_allocations",
        )
        read_only_fields = ("id", "product", "price_snapshot")


class ShippingRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingRate
        fields = ("id", "country", "carrier", "price", "free_above")


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = (
            "customer_name",
            "email",
            "phone",
            "street",
            "city",
            "postal_code",
            "country",
            "shipping_address",
            "is_company",
            "company_name",
            "ico",
            "dic",
            "dic_dph",
            "is_vat_payer",
            "payment_method",
            "shipping_method",
            "notes",
            "items",
        )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item.")
        return value

    def validate_phone(self, value):
        normalized = re.sub(r"[\s\-]", "", value or "")

        if normalized.startswith("+"):
            digits = normalized[1:]
            if not digits.isdigit() or len(digits) != 12:
                raise serializers.ValidationError(
                    "Telefón musí byť v tvare +421XXXXXXXXX (12 číslic po +)."
                )
            return normalized

        if (
            not normalized.isdigit()
            or len(normalized) != 10
            or not normalized.startswith("0")
        ):
            raise serializers.ValidationError(
                "Telefón musí byť v tvare +421XXXXXXXXX alebo 0XXXXXXXXX."
            )

        return normalized

    def validate(self, attrs):
        country = (attrs.get("country") or "SK").upper()
        postal_code = attrs.get("postal_code", "")
        street = (attrs.get("street") or "").strip()
        shipping_method = attrs.get("shipping_method", "courier")

        postal_compact = re.sub(r"\s+", "", postal_code)
        if shipping_method != "pickup":
            if country in {"SK", "CZ"}:
                if not (postal_compact.isdigit() and len(postal_compact) == 5):
                    raise serializers.ValidationError(
                        {
                            "postal_code": "PSČ musí mať 5 číslic (napr. 81101 alebo 811 01)."
                        }
                    )

            if street and not any(char.isdigit() for char in street):
                raise serializers.ValidationError(
                    {"street": "Adresa musí obsahovať ulicu aj číslo domu."}
                )

        attrs["postal_code"] = postal_compact
        attrs["street"] = street
        attrs["shipping_address"] = (attrs.get("shipping_address") or "").strip()
        return attrs

    def create(self, validated_data):
        """
        Create a new order using the OrderService.

        This serializer now delegates all business logic to the service layer,
        focusing solely on serialization and validation.
        """
        # Get user from context if authenticated
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        # Delegate to service layer
        service = OrderService(user=user)
        order = service.create_order(validated_data)

        return order


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer_name",
            "email",
            "phone",
            "street",
            "city",
            "postal_code",
            "country",
            "shipping_address",
            "is_company",
            "company_name",
            "ico",
            "dic",
            "dic_dph",
            "is_vat_payer",
            "payment_method",
            "shipping_method",
            "status",
            "total_price",
            "shipping_cost",
            "shipping_carrier",
            "notes",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "order_number",
            "status",
            "total_price",
            "created_at",
            "updated_at",
        )


class AdminOrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ("status",)


class AdminOrderInterventionItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class AdminOrderInterventionUpdateSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=8, max_length=1000)
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    customer_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=50)
    street = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=255)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=2, required=False, default="SK")
    is_company = serializers.BooleanField(required=False, default=False)
    company_name = serializers.CharField(required=False, allow_blank=True, default="")
    ico = serializers.CharField(required=False, allow_blank=True, default="")
    dic = serializers.CharField(required=False, allow_blank=True, default="")
    dic_dph = serializers.CharField(required=False, allow_blank=True, default="")
    is_vat_payer = serializers.BooleanField(required=False, default=False)
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_METHOD_CHOICES)
    items = AdminOrderInterventionItemSerializer(many=True)

    def validate_reason(self, value):
        reason = (value or "").strip()
        if len(reason) < 8:
            raise serializers.ValidationError("Dôvod zásahu musí mať aspoň 8 znakov.")
        return reason

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "Objednávka musí obsahovať aspoň jednu položku."
            )
        return value

    def validate_phone(self, value):
        normalized = re.sub(r"[\s\-]", "", value or "")

        if normalized.startswith("+"):
            digits = normalized[1:]
            if not digits.isdigit() or len(digits) != 12:
                raise serializers.ValidationError(
                    "Telefón musí byť v tvare +421XXXXXXXXX (12 číslic po +)."
                )
            return normalized

        if (
            not normalized.isdigit()
            or len(normalized) != 10
            or not normalized.startswith("0")
        ):
            raise serializers.ValidationError(
                "Telefón musí byť v tvare +421XXXXXXXXX alebo 0XXXXXXXXX."
            )

        return normalized

    def validate(self, attrs):
        country = (attrs.get("country") or "SK").upper()
        postal_code = attrs.get("postal_code", "")
        street = (attrs.get("street") or "").strip()

        postal_compact = re.sub(r"\s+", "", postal_code)
        if country in {"SK", "CZ"}:
            if not (postal_compact.isdigit() and len(postal_compact) == 5):
                raise serializers.ValidationError(
                    {"postal_code": "PSČ musí mať 5 číslic (napr. 81101 alebo 811 01)."}
                )

        if street and not any(char.isdigit() for char in street):
            raise serializers.ValidationError(
                {"street": "Adresa musí obsahovať ulicu aj číslo domu."}
            )

        attrs["country"] = country
        attrs["postal_code"] = postal_compact
        attrs["street"] = street
        return attrs


class AdminOrderInterventionDeleteSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=8, max_length=1000)

    def validate_reason(self, value):
        reason = (value or "").strip()
        if len(reason) < 8:
            raise serializers.ValidationError("Dôvod zásahu musí mať aspoň 8 znakov.")
        return reason


class StockReceiptInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    batch_number = serializers.CharField(max_length=100)
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    variant_reference = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


class StockIssueInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    variant_reference = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
