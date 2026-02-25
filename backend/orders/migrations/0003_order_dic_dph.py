from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_order_city_order_company_name_order_dic_order_ico_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="dic_dph",
            field=models.CharField(blank=True, default="", max_length=50, verbose_name="IČ DPH"),
        ),
    ]
