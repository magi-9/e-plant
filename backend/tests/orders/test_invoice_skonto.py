"""Tests for Skonto early-payment discount block (Issue #95)."""

from decimal import Decimal

import pytest

from products.factories import ProductFactory
from users.models import GlobalSettings


def _make_order(payment_method="bank_transfer"):
    from orders.services.order_service import OrderService

    product = ProductFactory(stock_quantity=10, price=Decimal("100.00"))
    service = OrderService()
    return service.create_order(
        {
            "customer_name": "Test",
            "email": "test@example.com",
            "phone": "000",
            "street": "St",
            "city": "City",
            "postal_code": "00000",
            "is_company": False,
            "company_name": "",
            "ico": "",
            "dic": "",
            "dic_dph": "",
            "payment_method": payment_method,
            "notes": "",
            "country": "SK",
            "is_vat_payer": False,
            "items": [{"product_id": product.pk, "quantity": 1}],
        }
    )


@pytest.mark.django_db
class TestSkontoInvoice:
    def test_invoice_generated_with_skonto_for_bank_transfer(self):
        from orders.invoice import generate_invoice_pdf

        order = _make_order(payment_method="bank_transfer")
        shop = GlobalSettings.load()
        pdf = generate_invoice_pdf(order, shop)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 100

    def test_invoice_generated_without_skonto_for_card(self):
        from orders.invoice import generate_invoice_pdf

        order = _make_order(payment_method="card")
        shop = GlobalSettings.load()
        pdf = generate_invoice_pdf(order, shop)
        assert isinstance(pdf, bytes)

    def test_skonto_amount_is_2_percent_discount(self):
        from orders.invoice import _skonto_amount

        total = Decimal("100.00")
        assert _skonto_amount(total) == Decimal("98.00")

    def test_skonto_date_is_3_days_after_invoice(self):
        from datetime import date

        from orders.invoice import _skonto_date

        invoice_date = date(2026, 1, 1)
        assert _skonto_date(invoice_date) == date(2026, 1, 4)
