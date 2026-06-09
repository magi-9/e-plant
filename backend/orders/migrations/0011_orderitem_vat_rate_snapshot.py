import decimal

from django.db import migrations, models


def backfill_existing_order_item_vat(apps, schema_editor):
    OrderItem = apps.get_model("orders", "OrderItem")
    OrderItem.objects.update(vat_rate_snapshot=0)


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0010_alter_order_payment_method"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="vat_rate_snapshot",
            field=models.DecimalField(
                decimal_places=2, default=decimal.Decimal("5.00"), max_digits=5
            ),
        ),
        migrations.RunPython(
            backfill_existing_order_item_vat, migrations.RunPython.noop
        ),
    ]
