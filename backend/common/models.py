from django.db import models


class AddressModel(models.Model):
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    class Meta:
        abstract = True
