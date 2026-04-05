from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="reference",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
    ]
