import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0006_category_group_grouping_settings"),
    ]

    operations = [
        migrations.CreateModel(
            name="WildcardGroup",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("is_enabled", models.BooleanField(default=True)),
                ("is_auto_generated", models.BooleanField(default=True)),
                (
                    "norm_key",
                    models.CharField(blank=True, db_index=True, max_length=500),
                ),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
            ],
            options={
                "verbose_name": "Wildcard Group",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="product",
            name="wildcard_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="products",
                to="products.wildcardgroup",
            ),
        ),
    ]
