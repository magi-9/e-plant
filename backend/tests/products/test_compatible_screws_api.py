import csv
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

TIBASE_CATEGORY = "TITANIUM BASE (screw included)"


@pytest.fixture
def screws_csv(tmp_path):
    path = tmp_path / "compatibility_options.csv"
    rows = [
        {
            "compatibility_code": "0001",
            "section": "STRAIGHT",
            "reference": "40.316.003.01-2",
        },
        {
            "compatibility_code": "0001",
            "section": "STRAIGHT",
            "reference": "43.601.103.02-2",
        },  # screwdriver, ignored
        {
            "compatibility_code": "0001",
            "section": "DYNAMIC                                       DYNAMIC",
            "reference": "41.316.084.01-2",
        },
        {
            "compatibility_code": "0001",
            "section": "SCREW               LENGTH         SCREWDRIVER",
            "reference": "41.316.099.01-2",
        },
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["compatibility_code", "section", "reference"]
        )
        writer.writeheader()
        writer.writerows(rows)
    return str(path)


@pytest.mark.django_db
def test_compatible_screws_returns_screws_for_tibase(
    api_client, product_factory, screws_csv
):
    tibase = product_factory(
        category=TIBASE_CATEGORY,
        reference="31.312.001.01-2",
    )
    straight_screw = product_factory(reference="40.316.003.01-2", stock_quantity=5)
    dynamic_screw = product_factory(reference="41.316.084.01-2", stock_quantity=3)
    dynamic_screw2 = product_factory(reference="41.316.099.01-2", stock_quantity=2)

    from products.compatibility import _load_screws_by_code

    url = reverse("product_compatible_screws", kwargs={"pk": tibase.id})
    with patch("products.compatibility._CSV_PATH", screws_csv):
        _load_screws_by_code.cache_clear()
        response = api_client.get(url)
    _load_screws_by_code.cache_clear()

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["compatibility_code"] == "0001"
    screw_ids = [s["id"] for s in data["screws"]]
    assert straight_screw.id in screw_ids
    assert dynamic_screw.id in screw_ids
    assert dynamic_screw2.id in screw_ids
    # screwdriver (43.xxx) must not appear
    assert len(data["screws"]) == 3


@pytest.mark.django_db
def test_compatible_screws_accepts_31_reference_as_tibase(
    api_client, product_factory, screws_csv
):
    tibase = product_factory(
        category="INTERNAL MU",
        reference="31.312.001.01-2",
        parameters={},
    )
    straight_screw = product_factory(reference="40.316.003.01-2", stock_quantity=5)

    from products.compatibility import _load_screws_by_code

    url = reverse("product_compatible_screws", kwargs={"pk": tibase.id})
    with patch("products.compatibility._CSV_PATH", screws_csv):
        _load_screws_by_code.cache_clear()
        response = api_client.get(url)
    _load_screws_by_code.cache_clear()

    assert response.status_code == status.HTTP_200_OK
    assert straight_screw.id in [s["id"] for s in response.json()["screws"]]


@pytest.mark.django_db
def test_compatible_screws_404_for_non_tibase(api_client, product_factory):
    product = product_factory(category="SCREWS", reference="40.316.003.01-2")
    url = reverse("product_compatible_screws", kwargs={"pk": product.id})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_compatible_screws_404_for_unknown_product(api_client):
    url = reverse("product_compatible_screws", kwargs={"pk": 99999})
    response = api_client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_compatible_screws_empty_for_tibase_without_csv_match(
    api_client, product_factory, screws_csv
):
    tibase = product_factory(
        category=TIBASE_CATEGORY,
        reference="31.312.999.01-2",  # code 0999 not in CSV
    )
    url = reverse("product_compatible_screws", kwargs={"pk": tibase.id})
    with patch("products.compatibility._CSV_PATH", screws_csv):
        response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["screws"] == []
