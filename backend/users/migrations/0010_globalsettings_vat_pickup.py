from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_customuser_title"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="vat_rate",
            field=models.DecimalField(decimal_places=2, default=23.0, max_digits=5),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="pickup_address",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="opening_hours",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
