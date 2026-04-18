import pytest
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Product


@pytest.mark.django_db
def test_public_product_list_uses_visible_filter():
    visible = Product.objects.create(
        name="Visible",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=True,
    )
    Product.objects.create(
        name="Hidden",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=False,
    )

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == visible.id


@pytest.mark.django_db
def test_public_product_count_uses_visible_filter():
    Product.objects.create(
        name="Visible Count",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=True,
    )
    Product.objects.create(
        name="Hidden Count",
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=False,
    )

    response = APIClient().get("/api/products/count/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
