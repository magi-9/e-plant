import pytest
from django.urls import reverse
from rest_framework import status
from django.core import mail
from decimal import Decimal


@pytest.mark.django_db(transaction=True)
def test_low_stock_warning_in_warehouse_order_email(
    api_client, user_factory, product_factory
):
    """When stock drops below threshold the warehouse order email flags it — no separate alert email."""
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

    # Only 2 emails: 1 customer + 1 warehouse order (no separate low-stock email)
    assert len(mail.outbox) == 2

    # No separate low-stock subject email
    low_stock_email = [
        email for email in mail.outbox if "Nízky stav zásob" in email.subject
    ]
    assert len(low_stock_email) == 0

    # Warehouse order email contains the stock warning inline
    warehouse_email = next(e for e in mail.outbox if "Nová objednávka" in e.subject)
    assert "zostatok na sklade: 4 ks" in warehouse_email.body
    assert "NÍZKY STAV" in warehouse_email.body


@pytest.mark.django_db(transaction=True)
def test_order_always_sends_exactly_two_emails(
    api_client, user_factory, product_factory
):
    """Every order sends exactly 2 emails: 1 customer + 1 warehouse. No separate low-stock email."""
    user = user_factory()
    product = product_factory(
        name="Test Product",
        price=Decimal("100.00"),
        stock_quantity=6,
        low_stock_threshold=10,
    )

    api_client.force_authenticate(user=user)

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
    assert len(mail.outbox) == 2

    subjects = [e.subject for e in mail.outbox]
    assert not any("Nízky" in s for s in subjects)


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
