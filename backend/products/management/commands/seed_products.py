from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds demo users and imports products from data/new master CSV"

    def handle(self, *args, **options):
        self.stdout.write("Seeding users...")

        # Create Admin
        if not User.objects.filter(email="admin@example.com").exists():
            User.objects.create_superuser("admin@example.com", "admin")
            self.stdout.write(
                self.style.SUCCESS("Created admin user (admin@example.com/admin)")
            )
        else:
            self.stdout.write("Admin user already exists")

        # Create Client
        if not User.objects.filter(email="client@example.com").exists():
            User.objects.create_user("client@example.com", "client")
            self.stdout.write(
                self.style.SUCCESS("Created client user (client@example.com/client)")
            )
        else:
            self.stdout.write("Client user already exists")

        self.stdout.write("Importing products from master CSV...")
        call_command("import_product_data", master=True, update=True)
