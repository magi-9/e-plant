from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
def test_anonymous_user_price_hidden(api_client, product_factory):
    product = product_factory(price=50.00)
    url = reverse("product_list")

    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    results = response.data.get("results", response.data)
    assert len(results) == 1
    assert results[0]["name"] == product.name
    # Price should be None or missing for anonymous
    assert results[0]["price"] is None


@pytest.mark.django_db
def test_authenticated_user_price_visible(api_client, user_factory, product_factory):
    user = user_factory()
    product_factory(price=50.00)
    url = reverse("product_list")

    api_client.force_authenticate(user=user)
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    results = response.data.get("results", response.data)
    assert Decimal(results[0]["price"]) == Decimal("50.00")


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
    assert Decimal(response.data["price"]) == Decimal("99.99")


@pytest.mark.django_db
def test_ordering_query_param_skips_default_ordering(
    api_client, user_factory, product_factory
):
    user = user_factory()
    api_client.force_authenticate(user=user)
    product_factory(
        name="P-high", category="cat-a", price=Decimal("30.00"), stock_quantity=10
    )
    product_factory(
        name="P-low", category="cat-b", price=Decimal("10.00"), stock_quantity=10
    )
    product_factory(
        name="P-mid", category="cat-c", price=Decimal("20.00"), stock_quantity=10
    )

    url = reverse("product_list")
    response = api_client.get(url, {"ordering": "price"})

    assert response.status_code == status.HTTP_200_OK
    results = response.data.get("results", response.data)
    prices = [Decimal(item["price"]) for item in results]
    assert prices == sorted(prices)
