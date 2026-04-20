import pytest
from rest_framework.exceptions import ValidationError

from orders.models import BatchLot
from orders.services.stock_issue_service import StockIssueService
from orders.services.stock_receipt_service import StockReceiptService
from products.models import Product


@pytest.mark.django_db
def test_receive_stock_rejects_invalid_variant_reference_for_wildcard_group():
    product = Product.objects.create(
        name="Wildcard Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=0,
        is_visible=True,
        parameters={
            "type": "wildcard_group",
            "options": [
                {"reference": "REF-1", "label": "Variant 1", "stock_quantity": 0}
            ],
        },
    )

    with pytest.raises(ValidationError):
        StockReceiptService.receive_stock(
            product=product,
            batch_number="LOT-1",
            quantity=2,
            variant_reference="UNKNOWN-REF",
        )


@pytest.mark.django_db
def test_issue_stock_decreases_product_and_batch_quantity():
    product = Product.objects.create(
        name="Issue Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=10,
        is_visible=True,
    )
    BatchLot.objects.create(product=product, batch_number="LOT-1", quantity=10)

    StockIssueService.issue_stock(product=product, quantity=4)

    product.refresh_from_db()
    lot = BatchLot.objects.get(product=product, batch_number="LOT-1")
    assert product.stock_quantity == 6
    assert lot.quantity == 6


@pytest.mark.django_db
def test_issue_stock_rejects_when_variant_has_not_enough_stock():
    product = Product.objects.create(
        name="Wildcard Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=10,
        is_visible=True,
        parameters={
            "type": "wildcard_group",
            "options": [
                {"reference": "REF-1", "label": "Variant 1", "stock_quantity": 2}
            ],
        },
    )
    BatchLot.objects.create(product=product, batch_number="LOT-1", quantity=10)

    with pytest.raises(ValidationError):
        StockIssueService.issue_stock(
            product=product,
            quantity=3,
            variant_reference="REF-1",
        )


@pytest.mark.django_db
def test_issue_stock_rejects_when_no_batch_lots_exist():
    product = Product.objects.create(
        name="No Batch Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=4,
        is_visible=True,
    )

    with pytest.raises(ValidationError):
        StockIssueService.issue_stock(product=product, quantity=1)

    product.refresh_from_db()
    assert product.stock_quantity == 4
