from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_emailratelimit"),
    ]

    operations = [
        migrations.AddField(
            model_name="globalsettings",
            name="company_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_ico",
            field=models.CharField(blank=True, default="", max_length=20, verbose_name="IČO"),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_dic",
            field=models.CharField(blank=True, default="", max_length=20, verbose_name="DIČ"),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_street",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_city",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_postal_code",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_state",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_phone",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="company_email",
            field=models.EmailField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="iban",
            field=models.CharField(blank=True, default="", max_length=34),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="bank_name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="globalsettings",
            name="bank_swift",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
    ]
