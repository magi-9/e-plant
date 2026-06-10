"""Tests for free bundled screw on TiBase order items."""

import csv
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from orders.models import BatchLot, Order, OrderItem

TIBASE_CATEGORY = "TITANIUM BASE (screw included)"


@pytest.fixture
def screws_csv(tmp_path):
    path = tmp_path / "compatibility_options.csv"
    rows = [
        {
            "compatibility_code": "0001",
            "section": "STRAIGHT",
            "reference": "40.316.003.01-2",
        },
        {
            "compatibility_code": "0001",
            "section": "DYNAMIC",
            "reference": "41.316.084.01-2",
        },
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["compatibility_code", "section", "reference"]
        )
        writer.writeheader()
        writer.writerows(rows)
    return str(path)


def _make_order_payload(tibase_id, screw_id=None, quantity=2):
    items = [{"product_id": tibase_id, "quantity": quantity}]
    if screw_id is not None:
        items[0]["bundled_screw_product_id"] = screw_id
    return {
        "customer_name": "Test User",
        "email": "test@example.com",
        "phone": "+421900000000",
        "street": "Test 1",
        "city": "Bratislava",
        "postal_code": "81101",
        "is_company": False,
        "payment_method": "bank_transfer",
        "items": items,
    }


@pytest.mark.django_db
def test_order_with_bundled_screw_creates_free_item(
    api_client, user_factory, product_factory, zero_shipping, screws_csv
):
    user = user_factory()
    tibase = product_factory(
        category=TIBASE_CATEGORY,
        reference="31.312.001.01-2",
        price=Decimal("42.00"),
        stock_quantity=5,
    )
    screw = product_factory(
        reference="40.316.003.01-2",
        price=Decimal("10.00"),
        stock_quantity=10,
    )
    BatchLot.objects.create(product=screw, batch_number="LOT001", quantity=10)

    api_client.force_authenticate(user=user)
    url = reverse("order_create")
    with patch("products.compatibility._CSV_PATH", screws_csv):
        response = api_client.post(
            url, _make_order_payload(tibase.id, screw.id, quantity=3), format="json"
        )

    assert response.status_code == status.HTTP_201_CREATED
    assert Order.objects.count() == 1
    assert OrderItem.objects.count() == 2

    free_item = OrderItem.objects.get(is_free=True)
    assert free_item.product == screw
    assert free_item.quantity == 3
    assert free_item.price_snapshot == Decimal("0.00")
    assert free_item.vat_rate_snapshot == Decimal("0.00")

    # Screw stock must have been decremented
    screw.refresh_from_db()
    assert screw.stock_quantity == 7


@pytest.mark.django_db
def test_order_rejects_incompatible_screw(
    api_client, user_factory, product_factory, zero_shipping, screws_csv
):
    user = user_factory()
    tibase = product_factory(
        category=TIBASE_CATEGORY,
        reference="31.312.001.01-2",
        stock_quantity=5,
    )
    wrong_screw = product_factory(reference="40.999.999.01-2", stock_quantity=10)

    api_client.force_authenticate(user=user)
    url = reverse("order_create")
    with patch("products.compatibility._CSV_PATH", screws_csv):
        response = api_client.post(
            url, _make_order_payload(tibase.id, wrong_screw.id), format="json"
        )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Order.objects.count() == 0


@pytest.mark.django_db
def test_order_rejects_out_of_stock_screw(
    api_client, user_factory, product_factory, zero_shipping, screws_csv
):
    user = user_factory()
    tibase = product_factory(
        category=TIBASE_CATEGORY,
        reference="31.312.001.01-2",
        stock_quantity=5,
    )
    screw = product_factory(
        reference="40.316.003.01-2",
        stock_quantity=1,  # only 1 in stock but ordering 3 TiBases
    )

    api_client.force_authenticate(user=user)
    url = reverse("order_create")
    with patch("products.compatibility._CSV_PATH", screws_csv):
        response = api_client.post(
            url, _make_order_payload(tibase.id, screw.id, quantity=3), format="json"
        )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert Order.objects.count() == 0


@pytest.mark.django_db
def test_order_without_bundled_screw_is_unaffected(
    api_client, user_factory, product_factory, zero_shipping
):
    user = user_factory()
    tibase = product_factory(
        category=TIBASE_CATEGORY,
        reference="31.312.001.01-2",
        stock_quantity=5,
    )

    api_client.force_authenticate(user=user)
    url = reverse("order_create")
    response = api_client.post(url, _make_order_payload(tibase.id), format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert OrderItem.objects.filter(is_free=True).count() == 0
