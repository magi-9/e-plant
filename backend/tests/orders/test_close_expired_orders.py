"""Tests for the close_expired_orders management command."""

from datetime import timedelta
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from orders.models import Order


def _make_order(
    product_factory,
    status="awaiting_payment",
    hours_ago=25,
    payment_method="bank_transfer",
):
    product_factory(price=Decimal("10.00"), stock_quantity=0)
    order = Order.objects.create(
        customer_name="Test",
        email="t@t.com",
        phone="+421",
        order_number=f"ORD-{Order.objects.count() + 1:04d}",
        total_price=Decimal("10.00"),
        payment_method=payment_method,
        status=status,
        street="A",
        city="B",
        postal_code="811 01",
        country="SK",
    )
    Order.objects.filter(pk=order.pk).update(
        created_at=timezone.now() - timedelta(hours=hours_ago)
    )
    return order


@pytest.mark.django_db
def test_cancels_expired_awaiting_payment_order(product_factory):
    order = _make_order(product_factory, hours_ago=25)
    call_command("close_expired_orders", stdout=StringIO())
    order.refresh_from_db()
    assert order.status == "cancelled"


@pytest.mark.django_db
def test_does_not_cancel_recent_order(product_factory):
    order = _make_order(product_factory, hours_ago=10)
    call_command("close_expired_orders", stdout=StringIO())
    order.refresh_from_db()
    assert order.status == "awaiting_payment"


@pytest.mark.django_db
def test_does_not_affect_other_statuses(product_factory):
    paid_order = _make_order(product_factory, status="paid", hours_ago=48)
    call_command("close_expired_orders", stdout=StringIO())
    paid_order.refresh_from_db()
    assert paid_order.status == "paid"


@pytest.mark.django_db
def test_does_not_cancel_expired_card_orders(product_factory):
    card_order = _make_order(
        product_factory,
        status="awaiting_payment",
        hours_ago=48,
        payment_method="card",
    )
    call_command("close_expired_orders", stdout=StringIO())
    card_order.refresh_from_db()
    assert card_order.status == "awaiting_payment"


@pytest.mark.django_db
def test_dry_run_does_not_cancel(product_factory):
    order = _make_order(product_factory, hours_ago=25)
    out = StringIO()
    call_command("close_expired_orders", "--dry-run", stdout=out)
    order.refresh_from_db()
    assert order.status == "awaiting_payment"
    assert "dry-run" in out.getvalue()


@pytest.mark.django_db
def test_custom_hours_threshold(product_factory):
    order = _make_order(product_factory, hours_ago=5)
    call_command("close_expired_orders", "--hours=4", stdout=StringIO())
    order.refresh_from_db()
    assert order.status == "cancelled"
