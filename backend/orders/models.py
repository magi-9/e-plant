from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()


class Order(models.Model):
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

    # Address fields
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    shipping_address = models.TextField(
        blank=True
    )  # Legacy field, kept for backward compatibility

    # Company info (optional)
    is_company = models.BooleanField(default=False)
    company_name = models.CharField(max_length=255, blank=True)
    ico = models.CharField(max_length=50, blank=True, verbose_name="IČO")
    dic = models.CharField(max_length=50, blank=True, verbose_name="DIČ")
    dic_dph = models.CharField(max_length=50, blank=True, verbose_name="IČ DPH")

    # Order info
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    notes = models.TextField(blank=True)

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
