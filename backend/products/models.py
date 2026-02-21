from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    low_stock_alert_sent = models.BooleanField(default=False)
    image = models.ImageField(upload_to="products/", blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.stock_quantity > self.low_stock_threshold and self.low_stock_alert_sent:
            self.low_stock_alert_sent = False
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
