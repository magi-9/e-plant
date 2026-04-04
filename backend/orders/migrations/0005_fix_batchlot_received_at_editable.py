import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_batchlot_stockreceipt_orderitembatch"),
    ]

    operations = [
        migrations.AlterField(
            model_name="batchlot",
            name="received_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
