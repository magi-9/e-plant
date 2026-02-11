import pytest
from rest_framework.test import APIClient
from pytest_factoryboy import register
from tests.factories import UserFactory
from products.factories import ProductFactory

register(UserFactory)
register(ProductFactory)


@pytest.fixture
def api_client():
    return APIClient()
