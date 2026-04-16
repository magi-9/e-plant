"""Product inquiry endpoint integration tests."""

import pytest
from rest_framework.test import APIClient
from rest_framework import status

from products.models import Product
from users.models import CustomUser, GlobalSettings


@pytest.mark.django_db
def test_product_inquiry_requires_authentication():
    """Unauthenticated requests should return 401."""
    client = APIClient()
    response = client.post(
        "/api/products/inquiry/",
        {
            "product_id": 1,
            "product_name": "Test Product",
            "message": "This is a test message",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_product_inquiry_requires_valid_product():
    """Product inquiry with invalid product_id should fail with 404."""
    user = CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/products/inquiry/",
        {
            "product_id": 999,  # Non-existent product
            "product_name": "Test Product",
            "message": "This is a test message with enough characters",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_product_inquiry_requires_minimum_message_length():
    """Product inquiry with message < 10 chars should fail."""
    product = Product.objects.create(
        name="Test Product",
        description="Test description",
        price=99.99,
        stock_quantity=0,
    )
    user = CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/products/inquiry/",
        {
            "product_id": product.id,
            "product_name": product.name,
            "message": "short",  # Only 5 chars
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "10" in response.json()["error"].lower()


@pytest.mark.django_db
def test_product_inquiry_success():
    """Valid product inquiry should return success."""
    product = Product.objects.create(
        name="Test Product",
        description="Test description",
        price=99.99,
        stock_quantity=0,
    )
    user = CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )
    # Ensure GlobalSettings exists
    GlobalSettings.objects.get_or_create(
        pk=1, defaults={"warehouse_email": "warehouse@example.com"}
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/products/inquiry/",
        {
            "product_id": product.id,
            "product_name": product.name,
            "message": "I am very interested in this product and would like to know when it will be back in stock",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True


@pytest.mark.django_db
def test_product_inquiry_respects_message_limit():
    """Product inquiry with message > 2000 chars should fail."""
    product = Product.objects.create(
        name="Test Product",
        description="Test description",
        price=99.99,
        stock_quantity=0,
    )
    user = CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass123",
        first_name="Test",
        last_name="User",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    long_message = "a" * 2001  # Over the 2000 char limit

    response = client.post(
        "/api/products/inquiry/",
        {
            "product_id": product.id,
            "product_name": product.name,
            "message": long_message,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "2000" in response.json()["error"].lower()
