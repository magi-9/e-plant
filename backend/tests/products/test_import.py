import pytest
from rest_framework import status
from products.models import Product
from io import StringIO
from django.core.files.uploadedfile import SimpleUploadedFile
import csv
from decimal import Decimal


@pytest.mark.django_db
def test_import_products_create_and_update(api_client, user_factory):
    # Setup Admin User
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    # Initial state
    Product.objects.create(
        name="Existing Product",
        price=Decimal("10.00"),
        stock_quantity=5,
        low_stock_threshold=5,
    )

    # Create CSV
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

    # Row 1: Update existing product
    writer.writerow(
        [
            "Existing Product",
            "Updated Description",
            "Updated Category",
            "20.00",
            "50",
            "5",
        ]
    )

    # Row 2: Create new product
    writer.writerow(
        ["New Product", "New Description", "New Category", "30.00", "100", "10"]
    )

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    assert response.status_code == status.HTTP_200_OK
    assert Product.objects.count() == 2

    # Verify Update
    p1 = Product.objects.get(name="Existing Product")
    assert p1.price == Decimal("20.00")
    assert p1.stock_quantity == 50
    assert p1.description == "Updated Description"

    # Verify Create
    p2 = Product.objects.get(name="New Product")
    assert p2.price == Decimal("30.00")
    assert p2.stock_quantity == 100


@pytest.mark.django_db
def test_import_products_logic_reset_alert(api_client, user_factory):
    # Setup Admin User
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    # Create product with low stock alert sent
    p = Product.objects.create(
        name="Alert Product",
        price=Decimal("10.00"),
        stock_quantity=2,
        low_stock_threshold=5,
        low_stock_alert_sent=True,
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "stock_quantity"])
    # Update stock to be above threshold
    writer.writerow(["Alert Product", "10"])

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    assert response.status_code == status.HTTP_200_OK

    p.refresh_from_db()
    assert p.stock_quantity == 10
    assert p.low_stock_alert_sent is False  # Should be reset
    assert p.price == Decimal("10.00")
    assert p.low_stock_threshold == 5


@pytest.mark.django_db
def test_import_products_invalid_data_handling(api_client, user_factory):
    """Test that invalid numeric values are ignored or handled gracefully."""
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    # Initial state
    Product.objects.create(
        name="Existing Product", price=Decimal("10.00"), stock_quantity=5
    )

    # Create CSV with invalid price
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "price", "stock_quantity"])

    # Row 1: Invalid price string
    writer.writerow(["Existing Product", "invalid-price", "invalid-stock"])

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid price" in str(response.data)

    # Verify values remained unchanged
    p1 = Product.objects.get(name="Existing Product")
    assert p1.price == Decimal("10.00")
    assert p1.stock_quantity == 5


@pytest.mark.django_db
def test_import_products_duplicate_names_handling(api_client, user_factory):
    """Test that duplicate product names in the CSV are handled without data loss."""
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    # Initial state
    Product.objects.create(
        name="Duplicate Product",
        price=Decimal("20.00"),
        stock_quantity=10,
    )

    # Create CSV with duplicate product names
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "price", "stock_quantity"])

    # First row for the same product name
    writer.writerow(["Duplicate Product", "25.00", "5"])
    # Second row for the same product name
    writer.writerow(["Duplicate Product", "30.00", "15"])

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    # Should fail with duplicate error
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Duplicate product names found in CSV" in str(response.data)

    # Verify original values remained unchanged
    p = Product.objects.get(name="Duplicate Product")
    assert p.price == Decimal("20.00")
    assert p.stock_quantity == 10


@pytest.mark.django_db
def test_import_products_empty_csv(api_client, user_factory):
    """Test import behavior when CSV has headers but no data rows."""
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    # Create CSV with only headers and no data rows
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "price", "stock_quantity"])

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    assert response.status_code == status.HTTP_200_OK
    # Response should indicate that 0 products were processed
    assert "0 products" in str(response.data)
    # No products should be created
    assert Product.objects.count() == 0


@pytest.mark.django_db
def test_import_products_missing_names_skipped(api_client, user_factory):
    """Test that rows with missing product names are skipped."""
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "price", "stock_quantity"])

    # Row with empty name
    writer.writerow(["", "25.00", "5"])
    # Valid row
    writer.writerow(["Valid Product", "10.00", "5"])

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    assert response.status_code == status.HTTP_200_OK
    assert "1 products" in str(response.data)
    assert Product.objects.count() == 1
    assert Product.objects.first().name == "Valid Product"


@pytest.mark.django_db
def test_import_products_transaction_rollback(api_client, user_factory):
    """Test that partial valid rows trigger rollback when an error occurs later."""
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    # Initial state
    Product.objects.create(
        name="Existing Product", price=Decimal("10.00"), stock_quantity=5
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "price", "stock_quantity"])

    # Row 1: Valid update
    writer.writerow(["Existing Product", "12.50", "8"])
    # Row 2: Invalid price
    writer.writerow(["New Product", "invalid-price", "10"])

    csv_content = output.getvalue().encode("utf-8-sig")
    uploaded_file = SimpleUploadedFile(
        "products.csv", csv_content, content_type="text/csv"
    )

    url = "/api/products/admin/import/"
    response = api_client.post(url, {"file": uploaded_file}, format="multipart")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid price" in str(response.data)

    # Verify rollback: Existing Product should not be updated
    p1 = Product.objects.get(name="Existing Product")
    assert p1.price == Decimal("10.00")
    assert p1.stock_quantity == 5
    # New Product should not exist
    assert not Product.objects.filter(name="New Product").exists()
