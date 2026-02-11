from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "category",
            "price",
            "stock_quantity",
            "image",
        )

    def get_price(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.price
        return None
