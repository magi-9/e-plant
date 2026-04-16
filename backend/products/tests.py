import pytest
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Product


@pytest.mark.django_db
def test_public_product_list_uses_is_visible_only_filter():
    visible_inactive = Product.objects.create(
        name="Visible Inactive",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=True,
        is_active=False,
    )
    Product.objects.create(
        name="Hidden Active",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=False,
        is_active=True,
    )

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == visible_inactive.id


@pytest.mark.django_db
def test_public_product_count_uses_is_visible_only_filter():
    Product.objects.create(
        name="Visible Inactive Count",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=True,
        is_active=False,
    )
    Product.objects.create(
        name="Hidden Active Count",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=False,
        is_active=True,
    )

    response = APIClient().get("/api/products/count/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
