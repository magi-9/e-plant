import pytest
from django.urls import reverse
from rest_framework import status
from django.core import mail
from decimal import Decimal
from orders.models import Order
from products.models import Product


@pytest.mark.django_db
def test_low_stock_alert_sent(api_client, user_factory, product_factory):
    """Test that warehouse receives a low stock alert email when stock falls below threshold"""
    user = user_factory()
    # Initially 10 in stock, threshold is 5
    product = product_factory(
        name="Test Product",
        price=Decimal("100.00"),
        stock_quantity=10,
        low_stock_threshold=5,
        low_stock_alert_sent=False,
    )

    api_client.force_authenticate(user=user)

    # Ordering 6 items will bring stock to 4, which is < 5 (threshold)
    order_data = {
        "customer_name": "Test User",
        "email": "test@example.com",
        "phone": "+421900123456",
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product.id, "quantity": 6},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED

    # Check that emails were sent (1 customer, 1 warehouse for order, 1 warehouse for low stock)
    assert len(mail.outbox) == 3

    low_stock_email = [
        email for email in mail.outbox if "Nízky stav zásob" in email.subject
    ]
    assert len(low_stock_email) == 1
    assert "Upozornenie: Nízky stav zásob" in low_stock_email[0].subject

    product.refresh_from_db()
    assert product.low_stock_alert_sent is True


@pytest.mark.django_db
def test_low_stock_alert_not_sent_again(api_client, user_factory, product_factory):
    """Test that low stock alert is not sent repeatedly if flag is already True"""
    user = user_factory()
    # Initially 6 in stock, threshold is 10, flag is already True
    product = product_factory(
        name="Test Product",
        price=Decimal("100.00"),
        stock_quantity=6,
        low_stock_threshold=10,
        low_stock_alert_sent=True,
    )

    api_client.force_authenticate(user=user)

    # Ordering 1 item will bring stock to 5, which is still < 10, but flag is True
    order_data = {
        "customer_name": "Test User",
        "email": "test@example.com",
        "phone": "+421900123456",
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product.id, "quantity": 1},
        ],
    }

    url = reverse("order_create")
    response = api_client.post(url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED

    # Check that only order emails were sent (1 customer, 1 warehouse for order), no low stock email
    assert len(mail.outbox) == 2

    low_stock_email = [email for email in mail.outbox if "Nízky" in email.subject]
    assert len(low_stock_email) == 0


@pytest.mark.django_db
def test_low_stock_alert_reset_on_replenish(product_factory):
    """Test that low stock alert flag is reset to False when stock is replenished"""
    # Create product with low stock flag True
    product = product_factory(
        name="Test Product",
        price=Decimal("100.00"),
        stock_quantity=4,
        low_stock_threshold=5,
        low_stock_alert_sent=True,
    )

    # Replenish stock to above threshold
    product.stock_quantity = 10
    product.save()

    product.refresh_from_db()
    assert product.low_stock_alert_sent is False
