from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_globalsettings_vat_pickup"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="company_vat_id",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="IČ DPH"
            ),
        ),
    ]
