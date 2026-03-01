import csv
from decimal import Decimal
from io import StringIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from products.models import Product


def _csv_upload(rows: list[list[str]]) -> SimpleUploadedFile:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "name",
            "description",
            "category",
            "price",
            "stock_quantity",
            "low_stock_threshold",
        ]
    )
    for row in rows:
        writer.writerow(row)

    return SimpleUploadedFile(
        "products.csv",
        output.getvalue().encode("utf-8-sig"),
        content_type="text/csv",
    )


@pytest.mark.django_db
def test_admin_product_import_create_update_and_reset_alert(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    existing = Product.objects.create(
        name="Existing Product",
        description="Old",
        category="Old category",
        price=Decimal("10.00"),
        stock_quantity=2,
        low_stock_threshold=5,
        low_stock_alert_sent=True,
    )

    upload = _csv_upload(
        [
            ["Existing Product", "Updated", "Updated category", "15.50", "15", "5"],
            ["New Product", "Created", "New category", "20.00", "7", "2"],
        ]
    )

    response = api_client.post(
        reverse("admin_product_import"), {"file": upload}, format="multipart"
    )

    assert response.status_code == status.HTTP_200_OK
    assert Product.objects.count() == 2

    existing.refresh_from_db()
    assert existing.price == Decimal("15.50")
    assert existing.stock_quantity == 15
    assert existing.low_stock_alert_sent is False

    created = Product.objects.get(name="New Product")
    assert created.price == Decimal("20.00")
    assert created.stock_quantity == 7


@pytest.mark.django_db
def test_product_import_requires_admin_permissions(api_client, user_factory):
    non_admin = user_factory(is_staff=False, is_superuser=False)
    api_client.force_authenticate(user=non_admin)

    upload = _csv_upload([["No Access", "", "", "10.00", "1", "1"]])
    response = api_client.post(
        reverse("admin_product_import"), {"file": upload}, format="multipart"
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_product_import_rolls_back_on_invalid_row(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    Product.objects.create(
        name="Stable Product",
        description="Original",
        category="Original",
        price=Decimal("12.00"),
        stock_quantity=5,
        low_stock_threshold=2,
    )

    upload = _csv_upload(
        [
            ["Stable Product", "Updated", "Updated", "13.00", "6", "2"],
            ["Broken Product", "Broken", "Broken", "invalid-price", "3", "1"],
        ]
    )

    response = api_client.post(
        reverse("admin_product_import"), {"file": upload}, format="multipart"
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid price" in str(response.data)

    stable = Product.objects.get(name="Stable Product")
    assert stable.price == Decimal("12.00")
    assert stable.stock_quantity == 5
    assert not Product.objects.filter(name="Broken Product").exists()
