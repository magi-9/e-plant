from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "quantity", "price_snapshot", "get_subtotal")
    can_delete = False

    def get_subtotal(self, obj):
        return obj.get_subtotal()
    get_subtotal.short_description = "Subtotal"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer_name", "email", "total_price", "payment_method", "status", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("order_number", "customer_name", "email", "phone")
    readonly_fields = ("order_number", "created_at", "updated_at", "total_price")
    inlines = [OrderItemInline]
    
    fieldsets = (
        ("Order Info", {
            "fields": ("order_number", "status", "payment_method", "total_price", "notes")
        }),
        ("Customer Info", {
            "fields": ("customer_name", "email", "phone", "shipping_address", "user")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at")
        }),
    )
