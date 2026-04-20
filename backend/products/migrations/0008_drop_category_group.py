from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0007_wildcardgroup"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="product",
            name="category_group",
        ),
        migrations.DeleteModel(
            name="CategoryGroup",
        ),
        migrations.RemoveField(
            model_name="groupingsettings",
            name="category_grouping_enabled",
        ),
    ]
