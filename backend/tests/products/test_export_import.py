import json
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from products.models import Product


def _make_json_file(data: list) -> SimpleUploadedFile:
    content = json.dumps(data, ensure_ascii=False).encode("utf-8")
    return SimpleUploadedFile(
        "products_export.json", content, content_type="application/json"
    )


# ── Export ────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_export_requires_admin(api_client, user_factory):
    user = user_factory(is_staff=False)
    api_client.force_authenticate(user=user)
    response = api_client.get(reverse("admin_product_export"))
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_export_returns_all_products_as_json(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    Product.objects.create(
        name="Implant A",
        reference="12.345.678.01-1",
        category="IMPLANTS",
        price=Decimal("99.00"),
        stock_quantity=10,
        is_visible=True,
    )
    Product.objects.create(
        name="Screw B",
        reference="12.345.678.02-2",
        category="SCREWS",
        price=Decimal("19.50"),
        stock_quantity=0,
        is_visible=False,
    )

    response = api_client.get(reverse("admin_product_export"))

    assert response.status_code == status.HTTP_200_OK
    assert "attachment" in response["Content-Disposition"]
    assert "products_export.json" in response["Content-Disposition"]

    data = json.loads(response.content)
    assert len(data) == 2

    names = {p["name"] for p in data}
    assert names == {"Implant A", "Screw B"}

    implant = next(p for p in data if p["name"] == "Implant A")
    assert implant["reference"] == "12.345.678.01-1"
    assert implant["price"] == "99.00"
    assert implant["stock_quantity"] == 10
    assert implant["is_visible"] is True
    assert implant["category"] == "IMPLANTS"


@pytest.mark.django_db
def test_export_includes_all_required_fields(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    Product.objects.create(
        name="Test",
        price=Decimal("1.00"),
        parameters={"type": "single", "compatibility_code": "0030"},
    )

    response = api_client.get(reverse("admin_product_export"))
    data = json.loads(response.content)
    assert len(data) == 1

    required = {
        "name",
        "reference",
        "description",
        "category",
        "price",
        "vat_rate",
        "stock_quantity",
        "low_stock_threshold",
        "low_stock_alert_sent",
        "is_visible",
        "parameters",
        "wildcard_group_id",
        "wildcard_group_name",
    }
    assert required.issubset(set(data[0].keys()))
    assert data[0]["parameters"]["compatibility_code"] == "0030"
    assert data[0]["wildcard_group_id"] is None
    assert data[0]["wildcard_group_name"] is None


# ── Full Import ───────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_full_import_requires_admin(api_client, user_factory):
    user = user_factory(is_staff=False)
    api_client.force_authenticate(user=user)
    f = _make_json_file([])
    response = api_client.post(
        reverse("admin_product_full_import"), {"file": f}, format="multipart"
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_full_import_creates_new_products(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    payload = [
        {
            "name": "Implant X",
            "reference": "10.001.002.01-1",
            "description": "Good implant",
            "category": "IMPLANTS",
            "price": "150.00",
            "vat_rate": "23.00",
            "stock_quantity": 5,
            "low_stock_threshold": 3,
            "low_stock_alert_sent": False,
            "is_visible": True,
            "parameters": {"type": "single"},
        }
    ]

    response = api_client.post(
        reverse("admin_product_full_import"),
        {"file": _make_json_file(payload)},
        format="multipart",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["created"] == 1
    assert response.data["updated"] == 0

    p = Product.objects.get(reference="10.001.002.01-1")
    assert p.name == "Implant X"
    assert p.price == Decimal("150.00")
    assert p.vat_rate == Decimal("23.00")
    assert p.stock_quantity == 5
    assert p.is_visible is True
    assert p.parameters == {"type": "single"}


@pytest.mark.django_db
def test_full_import_updates_existing_by_reference(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    existing = Product.objects.create(
        name="Old Name",
        reference="10.001.002.01-1",
        category="OLD",
        price=Decimal("50.00"),
        stock_quantity=3,
    )

    payload = [
        {
            "name": "New Name",
            "reference": "10.001.002.01-1",
            "description": "Updated",
            "category": "IMPLANTS",
            "price": "99.00",
            "stock_quantity": 20,
            "low_stock_threshold": 5,
            "low_stock_alert_sent": False,
            "is_visible": True,
            "parameters": {},
        }
    ]

    response = api_client.post(
        reverse("admin_product_full_import"),
        {"file": _make_json_file(payload)},
        format="multipart",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["created"] == 0
    assert response.data["updated"] == 1

    existing.refresh_from_db()
    assert existing.name == "New Name"
    assert existing.category == "IMPLANTS"
    assert existing.price == Decimal("99.00")
    assert existing.stock_quantity == 20


@pytest.mark.django_db
def test_full_import_rejects_non_json_file(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    f = SimpleUploadedFile(
        "products.csv", b"name,price\nTest,10", content_type="text/csv"
    )
    response = api_client.post(
        reverse("admin_product_full_import"), {"file": f}, format="multipart"
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "JSON" in response.data["error"]


@pytest.mark.django_db
def test_full_import_rejects_no_file(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    response = api_client.post(
        reverse("admin_product_full_import"), {}, format="multipart"
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_full_import_skips_rows_without_name(api_client, user_factory):
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    payload = [
        {"name": "", "reference": "10.001.002.01-1", "price": "10.00"},
        {"name": "Valid Product", "reference": "10.001.002.02-1", "price": "20.00"},
    ]

    response = api_client.post(
        reverse("admin_product_full_import"),
        {"file": _make_json_file(payload)},
        format="multipart",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["created"] == 1
    assert Product.objects.count() == 1


@pytest.mark.django_db
def test_export_then_full_import_roundtrip(api_client, user_factory):
    """Export products, delete them, re-import — DB state must match."""
    admin = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=admin)

    Product.objects.create(
        name="Round Trip Product",
        reference="99.001.002.01-1",
        category="TEST",
        price=Decimal("42.00"),
        stock_quantity=7,
        low_stock_threshold=2,
        is_visible=True,
        parameters={"type": "single", "compatibility_code": "0010"},
    )

    export_response = api_client.get(reverse("admin_product_export"))
    assert export_response.status_code == status.HTTP_200_OK
    exported_data = json.loads(export_response.content)

    Product.objects.all().delete()
    assert Product.objects.count() == 0

    f = _make_json_file(exported_data)
    import_response = api_client.post(
        reverse("admin_product_full_import"), {"file": f}, format="multipart"
    )
    assert import_response.status_code == status.HTTP_200_OK
    assert import_response.data["created"] == 1

    p = Product.objects.get(reference="99.001.002.01-1")
    assert p.name == "Round Trip Product"
    assert p.price == Decimal("42.00")
    assert p.stock_quantity == 7
    assert p.parameters["compatibility_code"] == "0010"
