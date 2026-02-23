import pytest
from rest_framework.test import APIClient
from products.models import Product
from users.models import CustomUser


@pytest.mark.django_db
def test_admin_create_product_price_issue():
    client = APIClient()
    user = CustomUser.objects.create_superuser("admin", "admin@example.com", "password")
    client.force_authenticate(user=user)

    data = {
        "name": "Test Product",
        "description": "Test Description",
        "category": "Test Category",
        "price": "100.00",
        "stock_quantity": 10,
    }

    response = client.post("/api/products/admin/create/", data, format="json")

    print(f"Status Code: {response.status_code}")
    # print(f"Response Data: {response.data}")

    assert response.status_code == 201
    product = Product.objects.get(name="Test Product")
    print(f"Created Product Price: {product.price}")
    assert product.price == 100.00


@pytest.mark.django_db
def test_admin_update_product():
    client = APIClient()
    user = CustomUser.objects.create_superuser("admin", "admin@example.com", "password")
    client.force_authenticate(user=user)

    product = Product.objects.create(
        name="Update Test",
        description="Original Description",
        category="Original Category",
        price=50.00,
        stock_quantity=5,
    )

    data = {"name": "Updated Name", "price": "75.00"}

    response = client.patch(f"/api/products/admin/{product.id}/", data, format="json")

    assert response.status_code == 200
    product.refresh_from_db()
    assert product.name == "Updated Name"
    assert product.price == 75.00


@pytest.mark.django_db
def test_admin_delete_product():
    client = APIClient()
    user = CustomUser.objects.create_superuser("admin", "admin@example.com", "password")
    client.force_authenticate(user=user)

    product = Product.objects.create(
        name="Delete Test",
        description="Desc",
        category="Cat",
        price=10.00,
        stock_quantity=1,
    )

    response = client.delete(f"/api/products/admin/{product.id}/delete/")

    assert response.status_code == 204
    assert not Product.objects.filter(id=product.id).exists()


@pytest.mark.django_db
def test_anonymous_cannot_create():
    client = APIClient()
    data = {"name": "Anon Product", "price": "10.00"}
    response = client.post("/api/products/admin/create/", data, format="json")
    assert response.status_code == 401  # Or 403 depending on auth config


@pytest.mark.django_db
def test_anonymous_cannot_update():
    client = APIClient()
    product = Product.objects.create(name="Anon", price=10)
    data = {"name": "Hacked"}
    response = client.put(f"/api/products/admin/{product.id}/", data, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_anonymous_cannot_delete():
    client = APIClient()
    product = Product.objects.create(name="Anon", price=10)
    response = client.delete(f"/api/products/admin/{product.id}/delete/")
    assert response.status_code == 401
