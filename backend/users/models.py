from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.cache import cache

GLOBAL_SETTINGS_CACHE_KEY = "global_settings"

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
    warehouse_email = models.EmailField(default='warehouse@dentalshop.sk')
    low_stock_threshold = models.IntegerField(default=5)
    currency = models.CharField(max_length=10, default='EUR (€)')
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=5.00)

    class Meta:
        verbose_name = "Global Settings"
        verbose_name_plural = "Global Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super(GlobalSettings, self).save(*args, **kwargs)
        cache.delete(GLOBAL_SETTINGS_CACHE_KEY)

    @classmethod
    def load(cls):
        return cache.get_or_set(
            GLOBAL_SETTINGS_CACHE_KEY,
            lambda: cls.objects.get_or_create(pk=1)[0]
        )
