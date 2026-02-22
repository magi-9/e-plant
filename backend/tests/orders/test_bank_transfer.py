import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal


@pytest.mark.django_db
def test_bank_transfer_status_awaiting_payment(
    api_client, user_factory, product_factory
):
    """Test that bank transfer orders have status awaiting_payment"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=10)

    api_client.force_authenticate(user=user)

    order_data = {
        "customer_name": "John Doe",
        "email": "john@example.com",
        "phone": "+421900123456",
        "street": "Test Street 123",
        "city": "Bratislava",
        "postal_code": "811 01",
        "is_company": False,
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product.id, "quantity": 1},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == "awaiting_payment"
    assert response.data["payment_method"] == "bank_transfer"


@pytest.mark.django_db
def test_card_payment_status_new(api_client, user_factory, product_factory):
    """Test that card payment orders initially have status new"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=10)

    api_client.force_authenticate(user=user)

    order_data = {
        "customer_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+421900123456",
        "street": "Test Street 456",
        "city": "Bratislava",
        "postal_code": "811 02",
        "is_company": False,
        "payment_method": "card",
        "items": [
            {"product_id": product.id, "quantity": 1},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == "new"
    assert response.data["payment_method"] == "card"


@pytest.mark.django_db
def test_order_number_unique(api_client, user_factory, product_factory):
    """Test that each order gets a unique order number"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=20)

    api_client.force_authenticate(user=user)

    order_data = {
        "customer_name": "John Doe",
        "email": "john@example.com",
        "phone": "+421900123456",
        "street": "Test Street 123",
        "city": "Bratislava",
        "postal_code": "811 01",
        "is_company": False,
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product.id, "quantity": 1},
        ],
    }

    url = reverse("order_create")

    # Create first order
    response1 = api_client.post(url, order_data, format="json")
    assert response1.status_code == status.HTTP_201_CREATED
    order_number_1 = response1.data["order_number"]

    # Create second order
    response2 = api_client.post(url, order_data, format="json")
    assert response2.status_code == status.HTTP_201_CREATED
    order_number_2 = response2.data["order_number"]

    # Order numbers should be different
    assert order_number_1 != order_number_2
