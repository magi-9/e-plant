from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_globalsettings_company_fields"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="customuser",
            name="username",
        ),
        migrations.AlterField(
            model_name="customuser",
            name="email",
            field=models.EmailField(
                max_length=254, unique=True, verbose_name="email address"
            ),
        ),
    ]
