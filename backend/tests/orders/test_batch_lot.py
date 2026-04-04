"""Tests for BatchLot and StockReceipt models (Issues #90, #91)."""

import pytest
from django.db import IntegrityError
from products.factories import ProductFactory


@pytest.mark.django_db
class TestBatchLotModel:
    def test_create_batch_lot(self):
        from orders.models import BatchLot

        product = ProductFactory()
        lot = BatchLot.objects.create(
            product=product, batch_number="BATCH-001", quantity=50
        )
        assert lot.batch_number == "BATCH-001"
        assert lot.quantity == 50
        assert lot.product == product

    def test_batch_number_unique_per_product(self):
        from orders.models import BatchLot

        product = ProductFactory()
        BatchLot.objects.create(product=product, batch_number="BATCH-001", quantity=10)
        with pytest.raises(IntegrityError):
            BatchLot.objects.create(
                product=product, batch_number="BATCH-001", quantity=5
            )

    def test_same_batch_number_different_products_allowed(self):
        from orders.models import BatchLot

        p1 = ProductFactory()
        p2 = ProductFactory()
        BatchLot.objects.create(product=p1, batch_number="BATCH-001", quantity=10)
        lot2 = BatchLot.objects.create(
            product=p2, batch_number="BATCH-001", quantity=20
        )
        assert lot2.pk is not None

    def test_batch_lot_str(self):
        from orders.models import BatchLot

        product = ProductFactory(name="Implant A")
        lot = BatchLot.objects.create(product=product, batch_number="B001", quantity=10)
        assert "B001" in str(lot)
        assert "Implant A" in str(lot)

    def test_ordered_by_received_at_asc(self):
        from orders.models import BatchLot
        from django.utils import timezone
        from datetime import timedelta

        product = ProductFactory()
        now = timezone.now()
        BatchLot.objects.create(
            product=product,
            batch_number="FIRST",
            quantity=5,
            received_at=now - timedelta(hours=1),
        )
        BatchLot.objects.create(
            product=product, batch_number="SECOND", quantity=5, received_at=now
        )
        lots = list(BatchLot.objects.filter(product=product))
        assert lots[0].batch_number == "FIRST"
        assert lots[1].batch_number == "SECOND"


@pytest.mark.django_db
class TestStockReceiptService:
    def test_creates_new_batch_lot_and_updates_stock(self):
        from orders.services.stock_receipt_service import StockReceiptService

        product = ProductFactory(stock_quantity=0)
        receipt = StockReceiptService.receive_stock(
            product=product, batch_number="B001", quantity=20
        )
        product.refresh_from_db()
        assert product.stock_quantity == 20
        assert receipt.quantity == 20
        assert receipt.batch_lot.batch_number == "B001"
        assert receipt.batch_lot.quantity == 20

    def test_increments_existing_batch_lot(self):
        from orders.models import BatchLot
        from orders.services.stock_receipt_service import StockReceiptService

        product = ProductFactory(stock_quantity=10)
        BatchLot.objects.create(product=product, batch_number="B001", quantity=10)
        StockReceiptService.receive_stock(
            product=product, batch_number="B001", quantity=5
        )
        product.refresh_from_db()
        assert product.stock_quantity == 15
        lot = BatchLot.objects.get(product=product, batch_number="B001")
        assert lot.quantity == 15

    def test_creates_audit_record(self):
        from orders.models import StockReceipt
        from orders.services.stock_receipt_service import StockReceiptService

        product = ProductFactory(stock_quantity=0)
        StockReceiptService.receive_stock(
            product=product, batch_number="B001", quantity=10
        )
        assert StockReceipt.objects.filter(product=product).count() == 1

    def test_validates_quantity_positive(self):
        from orders.services.stock_receipt_service import StockReceiptService
        from rest_framework.exceptions import ValidationError

        product = ProductFactory()
        with pytest.raises(ValidationError):
            StockReceiptService.receive_stock(
                product=product, batch_number="B001", quantity=0
            )

    def test_validates_batch_number_not_empty(self):
        from orders.services.stock_receipt_service import StockReceiptService
        from rest_framework.exceptions import ValidationError

        product = ProductFactory()
        with pytest.raises(ValidationError):
            StockReceiptService.receive_stock(
                product=product, batch_number="", quantity=5
            )
