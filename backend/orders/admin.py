from django.contrib import admin
from .models import Order, OrderItem, BatchLot, StockReceipt
from .services.stock_receipt_service import StockReceiptService


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "product",
        "quantity",
        "price_snapshot",
        "get_subtotal",
        "batch_numbers",
    )
    can_delete = False

    def get_subtotal(self, obj):
        return obj.get_subtotal()

    get_subtotal.short_description = "Subtotal"

    def batch_numbers(self, obj):
        batches = obj.batch_allocations.select_related("batch_lot").all()
        if not batches:
            return "—"
        return ", ".join(ba.batch_lot.batch_number for ba in batches)

    batch_numbers.short_description = "Šarže"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer_name",
        "email",
        "total_price",
        "payment_method",
        "status",
        "created_at",
    )
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("order_number", "customer_name", "email", "phone")
    readonly_fields = ("order_number", "created_at", "updated_at", "total_price")
    inlines = [OrderItemInline]

    fieldsets = (
        (
            "Order Info",
            {
                "fields": (
                    "order_number",
                    "status",
                    "payment_method",
                    "total_price",
                    "notes",
                )
            },
        ),
        (
            "Customer Info",
            {"fields": ("customer_name", "email", "phone", "shipping_address", "user")},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


class StockReceiptAdminForm(admin.ModelAdmin):
    """Custom admin for stock receipts that delegates to StockReceiptService."""

    def save_model(self, request, obj, form, change):
        if not change:
            receipt = StockReceiptService.receive_stock(
                product=obj.product,
                batch_number=obj.batch_number,
                quantity=obj.quantity,
                received_by=request.user,
                notes=obj.notes,
            )
            # Sync obj with the created receipt so Django admin redirects work correctly
            obj.pk = receipt.pk
            obj.batch_lot = receipt.batch_lot
        else:
            super().save_model(request, obj, form, change)


@admin.register(StockReceipt)
class StockReceiptAdmin(StockReceiptAdminForm):
    list_display = ("product", "batch_number", "quantity", "received_at", "received_by")
    list_filter = ("product",)
    search_fields = ("batch_number", "product__name")
    readonly_fields = ("received_at", "batch_lot")
    fields = ("product", "batch_number", "quantity", "notes")

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ("product", "batch_number", "quantity")
        return self.readonly_fields


@admin.register(BatchLot)
class BatchLotAdmin(admin.ModelAdmin):
    list_display = ("product", "batch_number", "quantity", "received_at")
    list_filter = ("product",)
    search_fields = ("batch_number", "product__name")
