"""Tests for the AdminStatsView endpoint."""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status as http_status


def _create_order_with_item(product, qty, order_status="paid"):
    """Helper that creates an Order + OrderItem without going through the full API."""
    from orders.models import Order, OrderItem

    order = Order.objects.create(
        customer_name="Test",
        email="t@t.com",
        phone="+421",
        order_number=f"ORD-{Order.objects.count() + 1:04d}",
        total_price=product.price * qty,
        payment_method="bank_transfer",
        status=order_status,
        street="A",
        city="B",
        postal_code="811 01",
        country="SK",
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        quantity=qty,
        price_snapshot=product.price,
    )
    return order


@pytest.mark.django_db
def test_stats_requires_admin(api_client, user_factory):
    user = user_factory()
    api_client.force_authenticate(user=user)
    url = reverse("admin_stats")
    response = api_client.get(url)
    assert response.status_code == http_status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_stats_returns_counts(api_client, user_factory, product_factory):
    admin = user_factory()
    admin.is_staff = True
    admin.save()
    api_client.force_authenticate(user=admin)

    product = product_factory(price=Decimal("20.00"), stock_quantity=100)
    _create_order_with_item(product, 2, order_status="paid")
    _create_order_with_item(product, 1, order_status="awaiting_payment")

    url = reverse("admin_stats")
    response = api_client.get(url, {"days": 30})

    assert response.status_code == http_status.HTTP_200_OK
    data = response.data
    assert data["total_orders"] == 2
    assert data["paid_orders"] == 1
    assert data["unpaid_orders"] == 1
    assert len(data["top_products"]) == 1
    assert data["top_products"][0]["total_qty"] == 2
    assert data["top_products"][0]["total_revenue"] == 40.0


@pytest.mark.django_db
def test_stats_invalid_days_defaults_to_30(api_client, user_factory):
    admin = user_factory()
    admin.is_staff = True
    admin.save()
    api_client.force_authenticate(user=admin)

    url = reverse("admin_stats")
    response = api_client.get(url, {"days": 999})
    assert response.status_code == http_status.HTTP_200_OK
    assert response.data["period_days"] == 30
