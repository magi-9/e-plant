from rest_framework import serializers
from .models import Product, ProductGroup


class ProductGroupSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ProductGroup
        fields = ("id", "name", "prefix", "description", "product_count")


class ProductSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(
        source="group.name", read_only=True, default=None
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "reference",
            "description",
            "category",
            "price",
            "stock_quantity",
            "image",
            "group",
            "group_name",
            "is_active",
            "is_visible",
            "parameters",
        )
