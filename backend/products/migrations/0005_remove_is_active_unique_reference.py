"""
Migration: remove is_active field, add unique constraint on reference.

Includes a data cleanup step (clean start): deletes all product-related
inventory data before applying the unique constraint so the migration
succeeds on any existing database state.
"""

from django.db import migrations, models


def _delete_product_data(apps, schema_editor):
    """Delete all product-linked data respecting PROTECT constraints."""
    OrderItemBatch = apps.get_model("orders", "OrderItemBatch")
    StockReceipt = apps.get_model("orders", "StockReceipt")
    BatchLot = apps.get_model("orders", "BatchLot")
    OrderItem = apps.get_model("orders", "OrderItem")
    Product = apps.get_model("products", "Product")

    OrderItemBatch.objects.all().delete()
    StockReceipt.objects.all().delete()
    BatchLot.objects.all().delete()
    OrderItem.objects.all().delete()
    Product.objects.all().delete()


class Migration(migrations.Migration):
    # Non-atomic: data cleanup and schema changes must run in separate transactions
    # to avoid PostgreSQL "pending trigger events" error when altering a table
    # immediately after deleting FK-constrained rows.
    atomic = False

    dependencies = [
        ("products", "0004_product_parameters_json"),
        ("orders", "0004_batchlot_stockreceipt_orderitembatch"),
    ]

    operations = [
        migrations.RunPython(_delete_product_data, migrations.RunPython.noop),
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
