import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from orders.models import Order, OrderItem


@pytest.mark.django_db
def test_create_order_success(api_client, user_factory, product_factory):
    """Test that an order can be created successfully"""
    user = user_factory()
    product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
    product2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

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
            {"product_id": product2.id, "quantity": 1},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert Order.objects.count() == 1
    assert OrderItem.objects.count() == 2


@pytest.mark.django_db
def test_order_total_calculated_correctly(api_client, user_factory, product_factory):
    """Test that order total is calculated correctly on backend"""
    user = user_factory()
    product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
    product2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

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
            {"product_id": product1.id, "quantity": 2},  # 200
            {"product_id": product2.id, "quantity": 1},  # 50
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    order = Order.objects.first()
    assert order.total_price == Decimal("250.00")


@pytest.mark.django_db
def test_order_price_snapshot_stored(api_client, user_factory, product_factory):
    """Test that product prices are snapshotted in order items"""
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
            {"product_id": product.id, "quantity": 2},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED

    order_item = OrderItem.objects.first()
    assert order_item.price_snapshot == Decimal("100.00")

    # Change product price
    product.price = Decimal("150.00")
    product.save()

    # Order item should still have old price
    order_item.refresh_from_db()
    assert order_item.price_snapshot == Decimal("100.00")


@pytest.mark.django_db
def test_order_creates_order_items(api_client, user_factory, product_factory):
    """Test that order items are created correctly"""
    user = user_factory()
    product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
    product2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

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

    order = Order.objects.first()
    assert order.items.count() == 2

    item1 = order.items.get(product=product1)
    assert item1.quantity == 2
    assert item1.price_snapshot == product1.price

    item2 = order.items.get(product=product2)
    assert item2.quantity == 3
    assert item2.price_snapshot == product2.price


@pytest.mark.django_db
def test_order_generates_order_number(api_client, user_factory, product_factory):
    """Test that order number is generated automatically"""
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
    order = Order.objects.first()
    assert order.order_number is not None
    assert len(order.order_number) > 0


@pytest.mark.django_db
def test_create_order_invalid_product(api_client, user_factory):
    """Test that creating an order with a non-existent product returns 400"""
    user = user_factory()
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
            {"product_id": 999999, "quantity": 1},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert isinstance(response.data, list)
    assert response.data[0] == "Product with id 999999 does not exist."
    assert Order.objects.count() == 0
    assert OrderItem.objects.count() == 0
