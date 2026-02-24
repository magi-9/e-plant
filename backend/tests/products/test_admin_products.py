import pytest
from django.urls import reverse
from products.models import Product


@pytest.mark.django_db
def test_admin_create_product_price_issue(api_client, user_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    data = {
        "name": "Test Product",
        "description": "Test Description",
        "category": "Test Category",
        "price": "100.00",
        "stock_quantity": 10,
    }

    url = reverse("admin_product_create")
    response = api_client.post(url, data, format="json")

    assert response.status_code == 201
    product = Product.objects.get(name="Test Product")
    assert product.price == 100.00


@pytest.mark.django_db
def test_admin_update_product(api_client, user_factory, product_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    product = product_factory(
        name="Update Test",
        description="Original Description",
        category="Original Category",
        price=50.00,
        stock_quantity=5,
    )

    data = {"name": "Updated Name", "price": "75.00"}

    url = reverse("admin_product_update", args=[product.id])
    response = api_client.patch(url, data, format="json")

    assert response.status_code == 200
    product.refresh_from_db()
    assert product.name == "Updated Name"
    assert product.price == 75.00


@pytest.mark.django_db
def test_admin_delete_product(api_client, user_factory, product_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    product = product_factory(
        name="Delete Test",
        description="Desc",
        category="Cat",
        price=10.00,
        stock_quantity=1,
    )

    url = reverse("admin_product_delete", args=[product.id])
    response = api_client.delete(url)

    assert response.status_code == 204
    assert not Product.objects.filter(id=product.id).exists()


@pytest.mark.django_db
def test_anonymous_cannot_create(api_client):
    data = {"name": "Anon Product", "price": "10.00"}
    url = reverse("admin_product_create")
    response = api_client.post(url, data, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_anonymous_cannot_update(api_client, product_factory):
    product = product_factory(name="Anon", price=10.00)
    data = {"name": "Hacked"}
    url = reverse("admin_product_update", args=[product.id])
    response = api_client.put(url, data, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_anonymous_cannot_delete(api_client, product_factory):
    product = product_factory(name="Anon", price=10.00)
    url = reverse("admin_product_delete", args=[product.id])
    response = api_client.delete(url)
    assert response.status_code == 401
