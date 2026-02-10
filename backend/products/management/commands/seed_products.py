from django.core.management.base import BaseCommand
from products.models import Product
from products.factories import ProductFactory
import random

class Command(BaseCommand):
    help = 'Seeds the database with initial products'

    def handle(self, *args, **options):
        self.stdout.write('Seeding products...')
        
        # Clear existing products
        Product.objects.all().delete()
        
        categories = ['Indoor', 'Outdoor', 'Succulents', 'Ferns']
        
        for i in range(30):
            ProductFactory(
                name=f'Plant {i+1}',
                category=random.choice(categories),
                price=random.uniform(10.0, 100.0),
                stock_quantity=random.randint(0, 50),
                low_stock_threshold=5
            )
            
        self.stdout.write(self.style.SUCCESS('Successfully seeded 30 products'))
