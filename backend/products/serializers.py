from django.core.files.images import get_image_dimensions
from django.core.validators import FileExtensionValidator
from django.conf import settings
import os
from urllib.parse import urlparse
from rest_framework import serializers

from .models import GroupingSettings, Product, ProductGroup, WildcardGroup


class ProductImageField(serializers.ImageField):
    """Custom image field with file size and dimension validation."""

    def __init__(self, **kwargs):
        super().__init__(
            validators=[
                FileExtensionValidator(
                    allowed_extensions=["jpg", "jpeg", "png", "webp"],
                    message="Only JPG, JPEG, PNG, or WebP images are allowed",
                ),
            ],
            **kwargs,
        )

    def to_internal_value(self, data):
        image = super().to_internal_value(data)

        # Validate file size (max 5MB)
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be less than 5MB")

        # Validate dimensions
        try:
            width, height = get_image_dimensions(image)
            if width > 4000 or height > 4000:
                raise serializers.ValidationError(
                    "Image resolution must be 4000x4000 pixels or smaller"
                )
            if width < 100 or height < 100:
                raise serializers.ValidationError(
                    "Image must be at least 100x100 pixels"
                )
        except serializers.ValidationError:
            # Re-raise validation errors
            raise
        except Exception as e:
            raise serializers.ValidationError(f"Invalid image format: {str(e)}")

        return image

    def to_representation(self, value):
        """Return relative media paths to avoid proxy scheme mixed-content issues."""
        rendered = super().to_representation(value)
        if not rendered:
            return rendered

        parsed = urlparse(rendered)
        relative_url = parsed.path if parsed.scheme and parsed.netloc else rendered

        media_prefix = settings.MEDIA_URL
        relative_file = (
            relative_url[len(media_prefix) :]
            if relative_url.startswith(media_prefix)
            else relative_url.lstrip("/")
        )
        absolute_path = os.path.join(str(settings.MEDIA_ROOT), relative_file)

        # If the file is gone, serialize as null so frontend renders placeholder.
        if not os.path.exists(absolute_path):
            return None

        return relative_url


class ProductGroupSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ProductGroup
        fields = ("id", "name", "prefix", "description", "product_count")


class WildcardGroupSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = WildcardGroup
        fields = (
            "id",
            "name",
            "is_enabled",
            "is_auto_generated",
            "norm_key",
            "product_count",
            "created_at",
        )
        read_only_fields = ("is_auto_generated", "norm_key", "created_at")


class GroupingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupingSettings
        fields = ("wildcard_grouping_enabled",)


class ProductSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(
        source="group.name", read_only=True, default=None
    )
    wildcard_group_id = serializers.IntegerField(
        source="wildcard_group.id", read_only=True, default=None
    )
    wildcard_group_name = serializers.CharField(
        source="wildcard_group.name", read_only=True, default=None
    )
    all_categories = serializers.SerializerMethodField()
    image = ProductImageField(required=False, allow_null=True)

    def get_all_categories(self, obj):
        categories = obj.parameters.get("all_categories") if obj.parameters else ""
        if categories:
            return categories
        return obj.category

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
            "wildcard_group_id",
            "wildcard_group_name",
            "is_visible",
            "all_categories",
            "parameters",
        )
