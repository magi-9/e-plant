from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0012_orderitem_is_free"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="discount_percent",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("0.00"), max_digits=5
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="discount_amount",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("0.00"), max_digits=10
            ),
        ),
    ]
