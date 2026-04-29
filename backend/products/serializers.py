from django.core.files.images import get_image_dimensions
from django.core.validators import FileExtensionValidator
from django.conf import settings
import os
from urllib.parse import urlparse
from rest_framework import serializers

from .models import GroupingSettings, Product, ProductGroup, WildcardGroup
from .compatibility import get_compatibility_codes_for_ref


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
        """Use absolute media URLs in dev, relative paths in prod.

        Dev frontend runs on a different origin/port and needs absolute backend media URLs.
        Production stays relative to avoid mixed-content/scheme issues behind proxy.
        """
        rendered = super().to_representation(value)
        if not rendered:
            return rendered

        parsed = urlparse(rendered)
        path_only = parsed.path if parsed.scheme and parsed.netloc else rendered

        if settings.DEBUG:
            base_url = rendered
        else:
            base_url = path_only

        media_prefix = settings.MEDIA_URL
        relative_file = (
            path_only[len(media_prefix) :]
            if path_only.startswith(media_prefix)
            else path_only.lstrip("/")
        )
        absolute_path = os.path.join(str(settings.MEDIA_ROOT), relative_file)

        # If the file is gone, serialize as null so frontend renders placeholder.
        if not os.path.exists(absolute_path):
            return None

        version = int(os.path.getmtime(absolute_path))
        return f"{base_url}?v={version}"


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
    compatibility_codes = serializers.SerializerMethodField()
    image = ProductImageField(required=False, allow_null=True)
    compatibility_code = serializers.CharField(
        allow_blank=True, required=False, default=""
    )

    def get_all_categories(self, obj):
        categories = obj.parameters.get("all_categories") if obj.parameters else ""
        if categories:
            return categories
        return obj.category

    def get_compatibility_codes(self, obj):
        return get_compatibility_codes_for_ref(obj.reference or "")

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["compatibility_code"] = (instance.parameters or {}).get(
            "compatibility_code", ""
        )
        return rep

    def _save_compatibility_code(self, instance, code):
        params = dict(instance.parameters or {})
        params["compatibility_code"] = code
        instance.parameters = params
        instance.save(update_fields=["parameters"])
        return instance

    def create(self, validated_data):
        compat_code = validated_data.pop("compatibility_code", None)
        instance = super().create(validated_data)
        if compat_code is not None:
            self._save_compatibility_code(instance, compat_code)
        return instance

    def update(self, instance, validated_data):
        compat_code = validated_data.pop("compatibility_code", None)
        instance = super().update(instance, validated_data)
        if compat_code is not None:
            self._save_compatibility_code(instance, compat_code)
        return instance

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
            "compatibility_codes",
            "parameters",
            "compatibility_code",
        )
