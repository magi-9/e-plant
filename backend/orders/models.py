from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product
from common.models import AddressModel, COUNTRY_CHOICES

User = get_user_model()


class ShippingRate(models.Model):
    country = models.CharField(max_length=2, choices=COUNTRY_CHOICES, db_index=True)
    carrier = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    free_above = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    class Meta:
        ordering = ["country", "price"]
        unique_together = [("country", "carrier")]

    def __str__(self):
        return f"{self.country} — {self.carrier} ({self.price} €)"


class Order(AddressModel):
    STATUS_CHOICES = [
        ("new", "New"),
        ("awaiting_payment", "Awaiting Payment"),
        ("paid", "Paid"),
        ("shipped", "Shipped"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("bank_transfer", "Bank Transfer"),
        ("card", "Card"),
    ]

    # Customer info
    customer_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50)

    shipping_address = models.TextField(
        blank=True
    )  # Legacy field, kept for backward compatibility

    # Company info (optional)
    is_company = models.BooleanField(default=False)
    company_name = models.CharField(max_length=255, blank=True)
    ico = models.CharField(max_length=50, blank=True, verbose_name="IČO")
    dic = models.CharField(max_length=50, blank=True, verbose_name="DIČ")
    dic_dph = models.CharField(
        max_length=50, blank=True, default="", verbose_name="IČ DPH"
    )

    # Order info
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    notes = models.TextField(blank=True)

    # Shipping
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_carrier = models.CharField(max_length=100, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.order_number} - {self.customer_name}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product.name} @ {self.price_snapshot}"

    def get_subtotal(self):
        return self.quantity * self.price_snapshot


class BatchLot(models.Model):
    """A specific lot/batch of a product received into stock."""

    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="batch_lots"
    )
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=0)
    received_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [("product", "batch_number")]
        ordering = ["received_at"]

    def __str__(self):
        return f"{self.product.name} — šarža {self.batch_number} ({self.quantity} ks)"


class StockReceipt(models.Model):
    """Immutable audit record every time stock is received."""

    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="stock_receipts"
    )
    batch_lot = models.ForeignKey(
        BatchLot,
        on_delete=models.PROTECT,
        null=True,
        related_name="receipts",
    )
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    received_at = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return f"Receipt {self.batch_number} x{self.quantity} @ {self.received_at:%Y-%m-%d}"


class OrderItemBatch(models.Model):
    """Tracks which batch lot(s) fulfilled an OrderItem (supports FIFO multi-batch splits)."""

    order_item = models.ForeignKey(
        OrderItem, on_delete=models.CASCADE, related_name="batch_allocations"
    )
    batch_lot = models.ForeignKey(
        BatchLot, on_delete=models.PROTECT, related_name="order_allocations"
    )
    quantity = models.PositiveIntegerField()

    class Meta:
        ordering = ["batch_lot__received_at"]

    def __str__(self):
        return f"{self.quantity}x {self.batch_lot.batch_number} → item#{self.order_item_id}"
