from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0007_alter_shippingrate_unique_together"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="shipping_method",
            field=models.CharField(
                choices=[("courier", "Kuriér"), ("pickup", "Osobný odber")],
                default="courier",
                max_length=20,
            ),
        ),
    ]
