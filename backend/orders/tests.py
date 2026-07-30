import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from orders.models import BatchLot, StockReceipt
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
def test_issue_stock_decreases_only_selected_batch_lot():
    product = Product.objects.create(
        name="Selected Lot Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=10,
        is_visible=True,
    )
    first_lot = BatchLot.objects.create(
        product=product, batch_number="LOT-OLD", quantity=3
    )
    selected_lot = BatchLot.objects.create(
        product=product, batch_number="LOT-NEW", quantity=7
    )

    StockIssueService.issue_stock(
        product=product,
        quantity=4,
        batch_lot_id=selected_lot.id,
    )

    product.refresh_from_db()
    first_lot.refresh_from_db()
    selected_lot.refresh_from_db()
    assert product.stock_quantity == 6
    assert first_lot.quantity == 3
    assert selected_lot.quantity == 3


@pytest.mark.django_db
def test_issue_stock_rejects_quantity_unavailable_in_selected_batch_lot():
    product = Product.objects.create(
        name="Selected Lot Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=10,
        is_visible=True,
    )
    BatchLot.objects.create(product=product, batch_number="LOT-OLD", quantity=8)
    selected_lot = BatchLot.objects.create(
        product=product, batch_number="LOT-NEW", quantity=2
    )

    with pytest.raises(ValidationError):
        StockIssueService.issue_stock(
            product=product,
            quantity=3,
            batch_lot_id=selected_lot.id,
        )

    product.refresh_from_db()
    selected_lot.refresh_from_db()
    assert product.stock_quantity == 10
    assert selected_lot.quantity == 2


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


@pytest.mark.django_db
def test_admin_can_correct_batch_lot_number():
    product = Product.objects.create(
        name="Editable Lot Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=4,
        is_visible=True,
    )
    lot = BatchLot.objects.create(product=product, batch_number="WRONG-LOT", quantity=4)
    admin = get_user_model().objects.create_superuser(
        email="inventory-admin@test.com", password="pass"
    )
    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.patch(
        reverse("admin_batch_lot_update", kwargs={"pk": lot.id}),
        {"batch_number": "  CORRECT-LOT  "},
        format="json",
    )

    assert response.status_code == 200
    lot.refresh_from_db()
    assert lot.batch_number == "CORRECT-LOT"
    assert lot.quantity == 4


@pytest.mark.django_db
def test_admin_stock_issue_endpoint_uses_selected_batch_lot():
    product = Product.objects.create(
        name="API Selected Lot Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=10,
        is_visible=True,
    )
    untouched_lot = BatchLot.objects.create(
        product=product, batch_number="LOT-OLD", quantity=5
    )
    selected_lot = BatchLot.objects.create(
        product=product, batch_number="LOT-NEW", quantity=5
    )
    admin = get_user_model().objects.create_superuser(
        email="stock-issue-admin@test.com", password="pass"
    )
    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.post(
        reverse("admin_stock_issue"),
        {
            "product_id": product.id,
            "batch_lot_id": selected_lot.id,
            "quantity": 2,
        },
        format="json",
    )

    assert response.status_code == 200
    untouched_lot.refresh_from_db()
    selected_lot.refresh_from_db()
    assert untouched_lot.quantity == 5
    assert selected_lot.quantity == 3


@pytest.mark.django_db
def test_stock_receipt_note_is_kept_in_internal_audit_record():
    product = Product.objects.create(
        name="Receipt Note Product",
        description="",
        category="A",
        price="10.00",
        stock_quantity=0,
        is_visible=True,
    )

    receipt = StockReceiptService.receive_stock(
        product=product,
        batch_number="LOT-NOTE",
        quantity=2,
        notes="Len pre sklad.",
    )

    assert StockReceipt.objects.get(pk=receipt.pk).notes == "Len pre sklad."
