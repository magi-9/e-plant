from .models import Product
import factory


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Product {n}")
    description = "Test description"
    category = "Test Category"
    price = 100.00
    stock_quantity = 10
