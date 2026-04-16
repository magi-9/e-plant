from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import IntegrityError, models, transaction

from common.models import AddressModel


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


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


class CustomUser(AbstractUser, AddressModel):
    username = None
    email = models.EmailField(unique=True, verbose_name="email address")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    title = models.CharField(max_length=50, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True)
    is_company = models.BooleanField(default=False)
    company_name = models.CharField(max_length=255, blank=True)
    ico = models.CharField(max_length=20, blank=True)
    dic = models.CharField(max_length=20, blank=True)
    is_vat_payer = models.BooleanField(default=False, verbose_name="VAT payer")
    vat_id = models.CharField(
        max_length=20, blank=True, default="", verbose_name="IČ DPH"
    )

    def clean(self):
        super().clean()
        if self.is_vat_payer and not self.vat_id:
            from django.core.exceptions import ValidationError

            raise ValidationError({"vat_id": "VAT ID is required for VAT payers."})
        if self.vat_id:
            import re

            from django.core.exceptions import ValidationError

            country = self.country or "SK"
            patterns = {
                "SK": r"^SK\d{10}$",
                "CZ": r"^CZ\d{8,10}$",
            }
            pattern = patterns.get(country)
            if pattern and not re.match(pattern, self.vat_id):
                raise ValidationError(
                    {"vat_id": f"Invalid VAT ID format for {country}."}
                )


class GlobalSettingsManager(models.Manager):
    def get_settings(self):
        try:
            with transaction.atomic():
                obj, _ = self.get_or_create(pk=1)
                return obj
        except IntegrityError:
            return self.get(pk=1)


class GlobalSettings(models.Model):
    objects = GlobalSettingsManager()

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

        constraints = [
            models.CheckConstraint(
                condition=models.Q(pk=1),
                name="globalsettings_singleton_pk_1",
            )
        ]

    @classmethod
    def load(cls):
        return cls.objects.get_settings()
