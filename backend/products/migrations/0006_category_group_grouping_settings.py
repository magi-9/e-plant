import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0005_remove_is_active_unique_reference"),
    ]

    operations = [
        migrations.CreateModel(
            name="CategoryGroup",
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
                ("description", models.TextField(blank=True)),
                ("is_enabled", models.BooleanField(default=True)),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
            ],
            options={
                "verbose_name": "Category Group",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="GroupingSettings",
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
                ("wildcard_grouping_enabled", models.BooleanField(default=True)),
                ("category_grouping_enabled", models.BooleanField(default=False)),
            ],
            options={
                "verbose_name": "Grouping Settings",
            },
        ),
        migrations.AddField(
            model_name="product",
            name="category_group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="products",
                to="products.categorygroup",
            ),
        ),
    ]
