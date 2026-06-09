import decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0010_groupingsettings_visible_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="vat_rate",
            field=models.DecimalField(
                decimal_places=2, default=decimal.Decimal("5.00"), max_digits=5
            ),
        ),
    ]
