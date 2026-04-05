from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0003_productgroup_and_visibility"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="parameters",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
