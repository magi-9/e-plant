"""
Migration: remove is_active field, add unique constraint on reference.

Validates existing product references before applying the unique
constraint so the migration fails safely instead of deleting data.
"""

from django.db import migrations, models
from django.db.models import Count


def _ensure_unique_references(apps, schema_editor):
    """Abort migration if duplicate non-null references exist."""
    Product = apps.get_model("products", "Product")

    duplicates = list(
        Product.objects.exclude(reference__isnull=True)
        .values("reference")
        .annotate(reference_count=Count("id"))
        .filter(reference_count__gt=1)
        .order_by("reference")
    )
    if duplicates:
        duplicate_values = ", ".join(
            repr(item["reference"]) for item in duplicates[:10]
        )
        raise RuntimeError(
            "Cannot apply unique constraint on products.Product.reference "
            "because duplicate non-null references already exist: "
            f"{duplicate_values}. "
            "Clean up duplicate references explicitly before running this migration."
        )


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0004_product_parameters_json"),
        ("orders", "0004_batchlot_stockreceipt_orderitembatch"),
    ]

    operations = [
        migrations.RunPython(_ensure_unique_references, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="product",
            name="is_active",
        ),
        migrations.AlterField(
            model_name="product",
            name="reference",
            field=models.CharField(blank=True, null=True, max_length=100, unique=True),
        ),
    ]
