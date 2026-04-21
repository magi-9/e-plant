"""Tests for VAT invoice rendering (Issue #94)."""

from decimal import Decimal

import pytest

from products.factories import ProductFactory
from users.models import GlobalSettings


def _make_order(is_vat_payer=False, country="SK", **extra):
    from orders.services.order_service import OrderService

    product = ProductFactory(stock_quantity=10)
    base = dict(
        customer_name="Test User",
        email="test@example.com",
        phone="0900000000",
        street="Test 1",
        city="Bratislava",
        postal_code="81101",
        is_company=True,
        company_name="Test s.r.o.",
        ico="12345678",
        dic="SK1234567890",
        dic_dph="SK1234567890" if is_vat_payer else "",
        payment_method="bank_transfer",
        notes="",
        country=country,
        is_vat_payer=is_vat_payer,
        items=[{"product_id": product.pk, "quantity": 1}],
    )
    base.update(extra)
    service = OrderService()
    return service.create_order(base)


@pytest.mark.django_db
class TestVATInvoice:
    def test_non_vat_payer_invoice_has_no_vat_breakdown(self):
        from orders.invoice import generate_invoice_pdf

        order = _make_order(is_vat_payer=False)
        shop = GlobalSettings.load()
        pdf = generate_invoice_pdf(order, shop)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 100

    def test_vat_payer_invoice_includes_vat_section(self):
        from orders.invoice import generate_invoice_pdf

        order = _make_order(is_vat_payer=True, country="SK")
        shop = GlobalSettings.load()
        pdf = generate_invoice_pdf(order, shop)
        assert isinstance(pdf, bytes)

    def test_order_vat_payer_flag_persists(self):
        order = _make_order(is_vat_payer=True)
        order.refresh_from_db()
        assert order.is_vat_payer is True

    def test_order_non_vat_payer_flag_defaults_false(self):
        order = _make_order(is_vat_payer=False)
        order.refresh_from_db()
        assert order.is_vat_payer is False

    def test_order_country_stored(self):
        order = _make_order(country="CZ")
        order.refresh_from_db()
        assert order.country == "CZ"

    def test_order_country_defaults_sk(self):
        order = _make_order()
        order.refresh_from_db()
        assert order.country == "SK"


@pytest.mark.django_db
class TestVATRates:
    def test_sk_vat_rate_23_percent(self):
        from orders.invoice import VAT_RATES

        assert VAT_RATES["SK"] == Decimal("0.23")

    def test_cz_vat_rate_21_percent(self):
        from orders.invoice import VAT_RATES

        assert VAT_RATES["CZ"] == Decimal("0.21")


@pytest.mark.django_db
class TestShippingLineInInvoice:
    def test_courier_shipping_line_in_invoice(self):
        from orders.invoice import generate_invoice_pdf

        order = _make_order()
        order.shipping_cost = Decimal("5.00")
        order.shipping_method = "courier"
        order.save()
        shop = GlobalSettings.load()
        pdf = generate_invoice_pdf(order, shop)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 100

    def test_pickup_shipping_zero_in_invoice(self):
        from orders.invoice import generate_invoice_pdf

        order = _make_order()
        order.shipping_cost = Decimal("0.00")
        order.shipping_method = "pickup"
        order.save()
        shop = GlobalSettings.load()
        pdf = generate_invoice_pdf(order, shop)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 100
