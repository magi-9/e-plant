import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal


@pytest.mark.django_db
def test_stock_decreases_after_order(api_client, user_factory, product_factory):
    """Test that stock quantity decreases after order is created"""
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
            {"product_id": product.id, "quantity": 3},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED

    # Refresh product from database
    product.refresh_from_db()
    assert product.stock_quantity == 7  # 10 - 3


@pytest.mark.django_db
def test_cannot_order_more_than_stock(api_client, user_factory, product_factory):
    """Test that order fails when requested quantity exceeds stock"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=5)

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
            {"product_id": product.id, "quantity": 10},  # More than available
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Stock should remain unchanged
    product.refresh_from_db()
    assert product.stock_quantity == 5


@pytest.mark.django_db
def test_stock_never_goes_below_zero(api_client, user_factory, product_factory):
    """Test that stock cannot go negative"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=3)

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
            {"product_id": product.id, "quantity": 5},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Stock should remain unchanged
    product.refresh_from_db()
    assert product.stock_quantity == 3


@pytest.mark.django_db
def test_multiple_products_stock_deduction(api_client, user_factory, product_factory):
    """Test that stock is correctly deducted for multiple products in one order"""
    user = user_factory()
    product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
    product2 = product_factory(price=Decimal("50.00"), stock_quantity=8)

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
            {"product_id": product1.id, "quantity": 2},
            {"product_id": product2.id, "quantity": 3},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED

    # Check both products
    product1.refresh_from_db()
    product2.refresh_from_db()

    assert product1.stock_quantity == 8  # 10 - 2
    assert product2.stock_quantity == 5  # 8 - 3


@pytest.mark.django_db
def test_stock_deduction_is_atomic(api_client, user_factory, product_factory):
    """Test that if one product fails stock check, no stock is deducted from any product"""
    user = user_factory()
    product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
    product2 = product_factory(price=Decimal("50.00"), stock_quantity=2)  # Low stock

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
            {"product_id": product1.id, "quantity": 3},  # Should be OK
            {"product_id": product2.id, "quantity": 5},  # Not enough stock
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST

    # Neither product should have stock deducted
    product1.refresh_from_db()
    product2.refresh_from_db()

    assert product1.stock_quantity == 10  # Unchanged
    assert product2.stock_quantity == 2  # Unchanged
