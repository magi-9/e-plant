import pytest
from rest_framework.exceptions import ValidationError

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
