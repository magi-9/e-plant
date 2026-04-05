from django.db import models


class ProductGroup(models.Model):
    name = models.CharField(max_length=255)
    prefix = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.prefix})"


class Product(models.Model):
    name = models.CharField(max_length=255)
    reference = models.CharField(max_length=100, blank=True, db_index=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    low_stock_alert_sent = models.BooleanField(default=False)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    group = models.ForeignKey(
        ProductGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    is_active = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    parameters = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        if self.stock_quantity > self.low_stock_threshold and self.low_stock_alert_sent:
            self.low_stock_alert_sent = False
        self._auto_assign_group()
        super().save(*args, **kwargs)

    def _auto_assign_group(self, groups=None):
        """Assign to the ProductGroup whose prefix is the longest match for this reference.

        Matching requires the prefix to end at a separator boundary (non-alphanumeric
        character or end of string) so that prefix '10' does not mis-match '101-xxx'.

        Args:
            groups: optional pre-fetched iterable of ProductGroup instances; when
                provided the method performs no database queries (useful for bulk ops).
        """
        if not self.reference:
            self.group = None
            return
        # Build candidate prefixes: every prefix ending at a separator boundary.
        candidate_prefixes = [self.reference]
        for index, char in enumerate(self.reference):
            if not char.isalnum() and index > 0:
                candidate_prefixes.append(self.reference[:index])
        if groups is None:
            groups = ProductGroup.objects.filter(
                prefix__in=candidate_prefixes
            ).only("id", "prefix")
        best = None
        best_len = -1
        for group in groups:
            prefix = group.prefix
            if not self.reference.startswith(prefix):
                continue
            # Boundary check: next char after prefix must be non-alphanumeric or end of string
            next_pos = len(prefix)
            if next_pos < len(self.reference) and self.reference[next_pos].isalnum():
                continue
            if next_pos > best_len:
                best = group
                best_len = next_pos
        self.group = best

    def __str__(self):
        return self.name
