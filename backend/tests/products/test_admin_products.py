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


@pytest.mark.django_db
def test_bulk_delete_products(api_client, user_factory, product_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    p1 = product_factory(name="Bulk1", price=10.00)
    p2 = product_factory(name="Bulk2", price=20.00)
    p3 = product_factory(name="Bulk3", price=30.00)

    url = reverse("admin_product_bulk_delete")
    response = api_client.post(url, {"ids": [p1.id, p2.id]}, format="json")

    assert response.status_code == 200
    assert response.data["deleted"] == 2
    assert not Product.objects.filter(id__in=[p1.id, p2.id]).exists()
    assert Product.objects.filter(id=p3.id).exists()


@pytest.mark.django_db
def test_bulk_delete_requires_ids(api_client, user_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    url = reverse("admin_product_bulk_delete")
    response = api_client.post(url, {}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_bulk_set_active(api_client, user_factory, product_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    p1 = product_factory(name="Active1", price=10.00, is_active=True)
    p2 = product_factory(name="Active2", price=20.00, is_active=True)

    url = reverse("admin_product_bulk_set_active")
    response = api_client.post(
        url, {"ids": [p1.id, p2.id], "is_active": False}, format="json"
    )

    assert response.status_code == 200
    assert response.data["updated"] == 2
    p1.refresh_from_db()
    p2.refresh_from_db()
    assert not p1.is_active
    assert not p2.is_active


@pytest.mark.django_db
def test_bulk_set_active_requires_is_active(api_client, user_factory, product_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)

    p1 = product_factory(name="Active1", price=10.00)
    url = reverse("admin_product_bulk_set_active")
    response = api_client.post(url, {"ids": [p1.id]}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_bulk_delete_anonymous(api_client, product_factory):
    p1 = product_factory(name="Bulk1", price=10.00)
    url = reverse("admin_product_bulk_delete")
    response = api_client.post(url, {"ids": [p1.id]}, format="json")
    assert response.status_code == 401
