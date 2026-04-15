"""Tests for FIFO batch allocation on order creation (Issue #92)."""

import pytest

from products.factories import ProductFactory


@pytest.mark.django_db
class TestFifoAllocation:
    def _make_product_with_batches(self, batches):
        """batches: list of (batch_number, quantity) tuples, oldest first."""
        from orders.models import BatchLot

        product = ProductFactory(stock_quantity=sum(q for _, q in batches))
        for batch_number, qty in batches:
            BatchLot.objects.create(
                product=product, batch_number=batch_number, quantity=qty
            )
        return product

    def test_single_batch_allocation(self):
        from orders.services.stock_service import StockService

        product = self._make_product_with_batches([("B001", 10)])
        items = [{"product_id": product.pk, "quantity": 5}]
        prepared = StockService.validate_and_reserve_stock(items)
        assert prepared[0]["batch_allocations"] == [("B001", 5)]

    def test_fifo_uses_oldest_batch_first(self):
        from orders.services.stock_service import StockService

        product = self._make_product_with_batches([("OLD", 3), ("NEW", 10)])
        items = [{"product_id": product.pk, "quantity": 3}]
        prepared = StockService.validate_and_reserve_stock(items)
        batch_numbers = [b for b, _ in prepared[0]["batch_allocations"]]
        assert batch_numbers == ["OLD"]

    def test_splits_across_batches_when_needed(self):
        from orders.services.stock_service import StockService

        product = self._make_product_with_batches([("B001", 3), ("B002", 10)])
        items = [{"product_id": product.pk, "quantity": 5}]
        prepared = StockService.validate_and_reserve_stock(items)
        allocations = prepared[0]["batch_allocations"]
        assert ("B001", 3) in allocations
        assert ("B002", 2) in allocations

    def test_batch_quantity_decremented_after_allocation(self):
        from orders.models import BatchLot
        from orders.services.stock_service import StockService

        product = self._make_product_with_batches([("B001", 10)])
        items = [{"product_id": product.pk, "quantity": 4}]
        StockService.validate_and_reserve_stock(items)
        lot = BatchLot.objects.get(product=product, batch_number="B001")
        assert lot.quantity == 6

    def test_product_without_batches_still_works(self):
        """Legacy products with no BatchLot should still create orders normally."""
        from orders.services.stock_service import StockService

        product = ProductFactory(stock_quantity=10)
        items = [{"product_id": product.pk, "quantity": 3}]
        prepared = StockService.validate_and_reserve_stock(items)
        assert prepared[0]["batch_allocations"] == []

    def test_order_item_batch_records_created(self):
        """End-to-end: creating an order creates OrderItemBatch records."""
        from orders.models import OrderItemBatch
        from orders.services.order_service import OrderService

        product = self._make_product_with_batches([("B001", 5)])
        service = OrderService()
        order = service.create_order(
            {
                "customer_name": "Test User",
                "email": "test@test.com",
                "phone": "0900000000",
                "street": "Test Street 1",
                "city": "Bratislava",
                "postal_code": "81101",
                "is_company": False,
                "company_name": "",
                "ico": "",
                "dic": "",
                "dic_dph": "",
                "payment_method": "bank_transfer",
                "notes": "",
                "items": [{"product_id": product.pk, "quantity": 3}],
            }
        )
        assert OrderItemBatch.objects.filter(order_item__order=order).count() == 1
        oib = OrderItemBatch.objects.get(order_item__order=order)
        assert oib.batch_lot.batch_number == "B001"
        assert oib.quantity == 3

    def test_order_shows_batch_numbers_in_serializer(self):
        """OrderItemSerializer includes batch_allocations."""
        from orders.serializers import OrderSerializer
        from orders.services.order_service import OrderService

        product = self._make_product_with_batches([("B001", 5)])
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
                "items": [{"product_id": product.pk, "quantity": 2}],
            }
        )
        data = OrderSerializer(order).data
        batch_allocs = data["items"][0]["batch_allocations"]
        assert len(batch_allocs) == 1
        assert batch_allocs[0]["batch_number"] == "B001"
        assert batch_allocs[0]["quantity"] == 2
