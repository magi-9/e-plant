from django.core.management.base import BaseCommand
from products.models import Product
from products.factories import ProductFactory
from django.contrib.auth import get_user_model
import random

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with initial users and dental implant products in Slovak"

    def handle(self, *args, **options):
        self.stdout.write("Seeding users...")

        # Create Admin
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@example.com", "admin")
            self.stdout.write(self.style.SUCCESS("Created admin user (admin/admin)"))
        else:
            self.stdout.write("Admin user already exists")

        # Create Client
        if not User.objects.filter(username="client").exists():
            User.objects.create_user("client", "client@example.com", "client")
            self.stdout.write(self.style.SUCCESS("Created client user (client/client)"))
        else:
            self.stdout.write("Client user already exists")

        self.stdout.write("Seeding products...")

        # Clear existing products
        Product.objects.all().delete()

        categories = [
            "Implantáty",
            "Abutmenty",
            "Vhojovacie valčeky",
            "Odtlačkové komponenty",
            "Laboratórne analógy",
            "Chirurgické nástroje"
        ]

        adjectives = ["Titánový", "Zirkónový", "Keramický", "Dočasný", "Trvalý", "Estetický", "Zahnutý", "Rovný"]
        types = ["Implantát", "Abutment", "Skrutka", "Vrták", "Analóg", "Transfer"]
        sizes = ["Ø3.5mm", "Ø4.0mm", "Ø4.5mm", "Ø5.0mm", "L10mm", "L12mm", "L14mm"]

        for i in range(30):
            category = random.choice(categories)
            name = f"{random.choice(adjectives)} {random.choice(types)} {random.choice(sizes)}"

            ProductFactory(
                name=name,
                category=category,
                description=f"Vysokokvalitný {category.lower()} pre dentálnu implantológiu. {name} je vyrobený z prvotriednych materiálov pre dlhodobú stabilitu a estetiku.",
                price=round(random.uniform(50.0, 500.0), 2),
                stock_quantity=random.randint(0, 100),
                low_stock_threshold=5,
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded 30 dental products in Slovak"))
