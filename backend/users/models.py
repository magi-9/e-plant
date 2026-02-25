from django.contrib.auth.models import AbstractUser
from django.db import models


class EmailRateLimit(models.Model):
    """
    Tracks rate limits for email-related actions (e.g. verification, password reset)
    using an email-derived key (e.g. "reset:user@example.com" or "verify:user@example.com").
    """

    key = models.CharField(max_length=320, unique=True)  # e.g. "reset:user@example.com"
    count = models.PositiveIntegerField(default=0)
    last_sent = models.DateTimeField(null=True, blank=True)
    blocked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Email Rate Limit"
        verbose_name_plural = "Email Rate Limits"

    def __str__(self):
        return self.key


class CustomUser(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    is_company = models.BooleanField(default=False)
    company_name = models.CharField(max_length=255, blank=True)
    ico = models.CharField(max_length=20, blank=True)
    dic = models.CharField(max_length=20, blank=True)


class GlobalSettings(models.Model):
    warehouse_email = models.EmailField(default="warehouse@dentalshop.sk")
    low_stock_threshold = models.IntegerField(default=5)
    currency = models.CharField(max_length=10, default="EUR (€)")
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=5.00)

    # Our company / seller info (used on invoices)
    company_name = models.CharField(max_length=255, blank=True, default="")
    company_ico = models.CharField(
        max_length=20, blank=True, default="", verbose_name="IČO"
    )
    company_dic = models.CharField(
        max_length=20, blank=True, default="", verbose_name="DIČ"
    )
    company_street = models.CharField(max_length=255, blank=True, default="")
    company_city = models.CharField(max_length=100, blank=True, default="")
    company_postal_code = models.CharField(max_length=20, blank=True, default="")
    company_state = models.CharField(max_length=100, blank=True, default="")
    company_phone = models.CharField(max_length=30, blank=True, default="")
    company_email = models.EmailField(max_length=254, blank=True, default="")
    iban = models.CharField(max_length=34, blank=True, default="")
    bank_name = models.CharField(max_length=100, blank=True, default="")
    bank_swift = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        verbose_name = "Global Settings"
        verbose_name_plural = "Global Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super(GlobalSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
