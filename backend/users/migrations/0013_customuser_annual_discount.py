from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0012_alter_globalsettings_warehouse_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="annual_discount_percent",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("0"), max_digits=5
            ),
        ),
        migrations.AddField(
            model_name="customuser",
            name="annual_discount_year",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
