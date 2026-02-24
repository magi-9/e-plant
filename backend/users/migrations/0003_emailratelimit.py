from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_globalsettings_customuser_city_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailRateLimit",
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
                ("key", models.CharField(max_length=320, unique=True)),
                ("count", models.PositiveIntegerField(default=0)),
                ("last_sent", models.DateTimeField(blank=True, null=True)),
                ("blocked_until", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Email Rate Limit",
                "verbose_name_plural": "Email Rate Limits",
            },
        ),
    ]
