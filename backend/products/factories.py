import factory

from .models import Product


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Product {n}")
    reference = factory.Sequence(lambda n: f"TEST-{n:05d}")
    description = "Test description"
    category = "Test Category"
    price = 100.00
    stock_quantity = 10
    is_visible = True
