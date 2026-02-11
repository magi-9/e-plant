import pytest
from django.urls import reverse

from rest_framework import status

from decimal import Decimal


@pytest.mark.django_db
def test_anonymous_user_price_hidden(api_client, product_factory):
    product = product_factory(price=50.00)
    url = reverse("product_list")

    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["name"] == product.name
    # Price should be None or missing for anonymous
    assert response.data[0]["price"] is None


@pytest.mark.django_db
def test_authenticated_user_price_visible(api_client, user_factory, product_factory):
    user = user_factory()
    product_factory(price=50.00)
    url = reverse("product_list")

    api_client.force_authenticate(user=user)
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data[0]["price"] == Decimal("50.00")


@pytest.mark.django_db
def test_product_detail_visibility(api_client, user_factory, product_factory):
    product = product_factory(price=99.99)
    url = reverse("product_detail", args=[product.id])

    # Anon
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["price"] is None

    # Auth
    user = user_factory()
    api_client.force_authenticate(user=user)
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["price"] == Decimal("99.99")
