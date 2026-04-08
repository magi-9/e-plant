import logging

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
            "notes",
            "items",
        )

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item.")
        return value

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


class StockReceiptInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    batch_number = serializers.CharField(max_length=100)
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
