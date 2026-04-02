from django.db import models

COUNTRY_CHOICES = [
    ("SK", "Slovensko"),
    ("CZ", "Česko"),
]


class AddressModel(models.Model):
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(
        max_length=2, choices=COUNTRY_CHOICES, default="SK", blank=True
    )

    class Meta:
        abstract = True
