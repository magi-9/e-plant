"""Tests for ShippingRate model and API (Issue #101)."""

import pytest
from decimal import Decimal
from products.factories import ProductFactory


@pytest.mark.django_db
class TestShippingRateModel:
    def test_create_shipping_rate(self):
        from orders.models import ShippingRate

        rate = ShippingRate.objects.create(
            country="SK",
            carrier="SPS",
            price=Decimal("3.90"),
            free_above=Decimal("50.00"),
        )
        assert rate.country == "SK"
        assert rate.price == Decimal("3.90")

    def test_str_representation(self):
        from orders.models import ShippingRate

        rate = ShippingRate.objects.create(
            country="SK", carrier="SPS", price=Decimal("3.90")
        )
        assert "SK" in str(rate)
        assert "SPS" in str(rate)

    def test_free_above_nullable(self):
        from orders.models import ShippingRate

        rate = ShippingRate.objects.create(
            country="CZ", carrier="PPL", price=Decimal("5.50")
        )
        assert rate.free_above is None


@pytest.mark.django_db
class TestShippingRateAPI:
    def test_list_shipping_rates_by_country(self, client):
        from orders.models import ShippingRate

        ShippingRate.objects.create(country="SK", carrier="SPS", price=Decimal("3.90"))
        ShippingRate.objects.create(country="CZ", carrier="PPL", price=Decimal("5.50"))
        response = client.get("/api/shipping-rates/?country=SK")
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", data)
        assert len(results) == 1
        assert results[0]["country"] == "SK"

    def test_list_all_rates_without_filter(self, client):
        from orders.models import ShippingRate

        ShippingRate.objects.create(country="SK", carrier="SPS", price=Decimal("3.90"))
        ShippingRate.objects.create(country="CZ", carrier="PPL", price=Decimal("5.50"))
        response = client.get("/api/shipping-rates/")
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", data)
        assert len(results) == 2

    def test_rate_response_includes_free_above(self, client):
        from orders.models import ShippingRate

        ShippingRate.objects.create(
            country="SK",
            carrier="SPS",
            price=Decimal("3.90"),
            free_above=Decimal("50.00"),
        )
        response = client.get("/api/shipping-rates/?country=SK")
        data = response.json()
        results = data.get("results", data)
        assert results[0]["free_above"] == "50.00"


@pytest.mark.django_db
class TestShippingIntegration:
    def test_order_includes_shipping_cost(self):
        from orders.models import ShippingRate
        from orders.services.order_service import OrderService

        product = ProductFactory(stock_quantity=10, price=Decimal("30.00"))
        ShippingRate.objects.create(
            country="SK",
            carrier="SPS",
            price=Decimal("3.90"),
            free_above=Decimal("50.00"),
        )
        service = OrderService()
        order = service.create_order(
            {
                "customer_name": "Test",
                "email": "t@t.com",
                "phone": "000",
                "street": "St",
                "city": "City",
                "postal_code": "00000",
                "is_company": False,
                "company_name": "",
                "ico": "",
                "dic": "",
                "dic_dph": "",
                "payment_method": "card",
                "notes": "",
                "country": "SK",
                "items": [{"product_id": product.pk, "quantity": 1}],
            }
        )
        # total = product price + shipping = 30 + 3.90 = 33.90
        assert order.total_price == Decimal("33.90")
        assert order.shipping_cost == Decimal("3.90")

    def test_free_shipping_when_above_threshold(self):
        from orders.models import ShippingRate
        from orders.services.order_service import OrderService

        product = ProductFactory(stock_quantity=10, price=Decimal("60.00"))
        ShippingRate.objects.create(
            country="SK",
            carrier="SPS",
            price=Decimal("3.90"),
            free_above=Decimal("50.00"),
        )
        service = OrderService()
        order = service.create_order(
            {
                "customer_name": "Test",
                "email": "t@t.com",
                "phone": "000",
                "street": "St",
                "city": "City",
                "postal_code": "00000",
                "is_company": False,
                "company_name": "",
                "ico": "",
                "dic": "",
                "dic_dph": "",
                "payment_method": "card",
                "notes": "",
                "country": "SK",
                "items": [{"product_id": product.pk, "quantity": 1}],
            }
        )
        # total = 60, free_above = 50 → shipping = 0
        assert order.total_price == Decimal("60.00")
        assert order.shipping_cost == Decimal("0.00")

    def test_no_shipping_rate_falls_back_to_global_settings(self):
        from orders.services.order_service import OrderService
        from users.models import GlobalSettings

        product = ProductFactory(stock_quantity=10, price=Decimal("20.00"))
        shop = GlobalSettings.load()
        shop.shipping_cost = Decimal("5.00")
        shop.save()
        service = OrderService()
        order = service.create_order(
            {
                "customer_name": "Test",
                "email": "t@t.com",
                "phone": "000",
                "street": "St",
                "city": "City",
                "postal_code": "00000",
                "is_company": False,
                "company_name": "",
                "ico": "",
                "dic": "",
                "dic_dph": "",
                "payment_method": "card",
                "notes": "",
                "country": "SK",
                "items": [{"product_id": product.pk, "quantity": 1}],
            }
        )
        assert order.shipping_cost == Decimal("5.00")
        assert order.total_price == Decimal("25.00")
