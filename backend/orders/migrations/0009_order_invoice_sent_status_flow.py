from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0008_order_shipping_method"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="invoice_sent",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("awaiting_payment", "Čaká na platbu"),
                    ("paid", "Zaplatená"),
                    ("shipped", "Odoslaná"),
                    ("completed", "Ukončená"),
                    ("cancelled", "Zrušená"),
                ],
                default="awaiting_payment",
                max_length=20,
            ),
        ),
        # Migrate existing 'new' orders to 'awaiting_payment'
        migrations.RunSQL(
            "UPDATE orders_order SET status = 'awaiting_payment' WHERE status = 'new';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
