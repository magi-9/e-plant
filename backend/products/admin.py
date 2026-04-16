from django.contrib import admin
from django.db.models import Count, Q
from django.utils.translation import gettext_lazy as _

from .models import Product, ProductGroup


class ProductInline(admin.TabularInline):
    model = Product
    fields = ("name", "reference", "price", "stock_quantity", "is_active", "is_visible")
    extra = 0
    show_change_link = True


@admin.register(ProductGroup)
class ProductGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "prefix", "description", "product_count")
    search_fields = ("name", "prefix")
    inlines = [ProductInline]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                _product_count=Count("products", filter=Q(products__is_active=True))
            )
        )

    @admin.display(description="Products", ordering="_product_count")
    def product_count(self, obj):
        return obj._product_count


def _make_active(modeladmin, request, queryset):
    queryset.update(is_active=True)


_make_active.short_description = _("Mark selected as active")


def _make_inactive(modeladmin, request, queryset):
    queryset.update(is_active=False)


_make_inactive.short_description = _("Mark selected as inactive")


def _make_visible(modeladmin, request, queryset):
    queryset.update(is_visible=True)


_make_visible.short_description = _("Mark selected as visible")


def _make_invisible(modeladmin, request, queryset):
    queryset.update(is_visible=False)


_make_invisible.short_description = _("Mark selected as hidden")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "reference",
        "group",
        "price",
        "stock_quantity",
        "low_stock_threshold",
        "low_stock_alert_sent",
        "is_active",
        "is_visible",
    )
    list_filter = (
        "category",
        "group",
        "is_visible",
        "low_stock_alert_sent",
    )
    search_fields = ("name", "description", "reference")
    list_editable = ("is_active", "is_visible")
    ordering = ("name",)
    actions = [_make_active, _make_inactive, _make_visible, _make_invisible]
