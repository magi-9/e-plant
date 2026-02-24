from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if not (request and request.user.is_authenticated):
            ret["price"] = None
        return ret
