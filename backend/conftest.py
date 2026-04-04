import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from pytest_factoryboy import register
from tests.factories import UserFactory
from products.factories import ProductFactory

register(UserFactory)
register(ProductFactory)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def zero_shipping():
    """Set global shipping cost to 0 for tests that don't exercise shipping logic."""
    from users.models import GlobalSettings
    shop = GlobalSettings.load()
    shop.shipping_cost = Decimal("0.00")
    shop.save()
