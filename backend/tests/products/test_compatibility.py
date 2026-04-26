import csv
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.fixture
def compat_csv(tmp_path):
    """Minimal compatibility_options.csv: code 0022 maps to refs in family 50.313.022."""
    path = tmp_path / "compatibility_options.csv"
    rows = [
        # code 0022 — only .01-2 is listed, but .02-2 is same family
        {
            "compatibility_code": "0022",
            "section": "SCREWDRIVER",
            "reference": "50.313.022.01-2",
        },
        {
            "compatibility_code": "0022",
            "section": "SCREWDRIVER",
            "reference": "50.313.022.03-2",
        },
        {
            "compatibility_code": "0022",
            "section": "TIBASE",
            "reference": "31.322.022.01-2",
        },
        {
            "compatibility_code": "0001",
            "section": "TIBASE",
            "reference": "31.322.001.01-2",
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
class TestCompatibilityFilter:
    def test_50_313_022_02_found_by_code_0022(
        self, api_client, user_factory, product_factory, compat_csv
    ):
        """THE core test: 50.313.022.02-2 is NOT in CSV but shares family 50.313.022 with .01-2.
        Filtering by code 0022 must return it."""
        import products.compatibility as compat_module

        user = user_factory()
        api_client.force_authenticate(user=user)

        target = product_factory(reference="50.313.022.02-2")
        product_factory(reference="UNRELATED-REF-99")

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(
                reverse("product_list"),
                {"compatibility_code": "0022"},
            )

        assert response.status_code == status.HTTP_200_OK
        ids = {r["id"] for r in response.data["results"]}
        assert target.id in ids

    def test_section_param_is_ignored(
        self, api_client, user_factory, product_factory, compat_csv
    ):
        """compatibility_section is accepted but does not narrow results — code is the only filter."""
        import products.compatibility as compat_module

        user = user_factory()
        api_client.force_authenticate(user=user)

        target = product_factory(reference="50.313.022.02-2")

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            # Passing section=DYNAMIC (not in CSV) still returns the product
            response = api_client.get(
                reverse("product_list"),
                {"compatibility_section": "DYNAMIC", "compatibility_code": "0022"},
            )

        assert response.status_code == status.HTTP_200_OK
        ids = {r["id"] for r in response.data["results"]}
        assert target.id in ids

    def test_all_families_for_code_returned(
        self, api_client, user_factory, product_factory, compat_csv
    ):
        """Code 0022 covers both 50.313.022 and 31.322.022 families."""
        import products.compatibility as compat_module

        user = user_factory()
        api_client.force_authenticate(user=user)

        screwdriver = product_factory(reference="50.313.022.02-2")
        tibase = product_factory(reference="31.322.022.05-2")
        other = product_factory(reference="UNRELATED-REF")

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(
                reverse("product_list"),
                {"compatibility_code": "0022"},
            )

        assert response.status_code == status.HTTP_200_OK
        ids = {r["id"] for r in response.data["results"]}
        assert screwdriver.id in ids
        assert tibase.id in ids
        assert other.id not in ids

    def test_unknown_code_returns_empty(
        self, api_client, user_factory, product_factory, compat_csv
    ):
        import products.compatibility as compat_module

        user = user_factory()
        api_client.force_authenticate(user=user)
        product_factory(reference="50.313.022.02-2")

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(
                reverse("product_list"),
                {"compatibility_code": "9999"},
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []


@pytest.mark.django_db
class TestCompatibilityOptionsEndpoint:
    def test_returns_section_code_combos(self, api_client, compat_csv):
        import products.compatibility as compat_module

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(reverse("compatibility_options"))

        assert response.status_code == status.HTTP_200_OK
        options = response.data["options"]
        codes = {(o["section"], o["compatibility_code"]) for o in options}
        assert ("SCREWDRIVER", "0022") in codes
        assert ("TIBASE", "0022") in codes
        assert ("TIBASE", "0001") in codes

    def test_sorted(self, api_client, compat_csv):
        import products.compatibility as compat_module

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(reverse("compatibility_options"))

        options = response.data["options"]
        keys = [(o["section"], o["compatibility_code"]) for o in options]
        assert keys == sorted(keys)


@pytest.mark.django_db
class TestCompatibilityCodeSerializer:
    def test_compatibility_code_in_response(
        self, api_client, user_factory, product_factory
    ):
        user = user_factory()
        api_client.force_authenticate(user=user)
        product = product_factory(
            parameters={"type": "single", "compatibility_code": "022"}
        )

        response = api_client.get(reverse("product_detail", args=[product.id]))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["compatibility_code"] == "022"

    def test_admin_can_update_compatibility_code(
        self, api_client, user_factory, product_factory
    ):
        admin = user_factory(is_staff=True)
        api_client.force_authenticate(user=admin)
        product = product_factory(
            parameters={"type": "single", "compatibility_code": "022"}
        )

        response = api_client.patch(
            reverse("admin_product_update", args=[product.id]),
            {"compatibility_code": "099"},
            format="multipart",
        )

        assert response.status_code == status.HTTP_200_OK
        product.refresh_from_db()
        assert product.parameters["compatibility_code"] == "099"
