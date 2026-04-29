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
    def test_returns_distinct_codes(self, api_client, compat_csv):
        import products.compatibility as compat_module

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            compat_module.get_compatibility_options.cache_clear()
            response = api_client.get(reverse("compatibility_options"))

        assert response.status_code == status.HTTP_200_OK
        options = response.data["options"]
        codes = [o["compatibility_code"] for o in options]
        assert set(codes) == {"0001", "0022"}
        assert len(codes) == 2

    def test_sorted(self, api_client, compat_csv):
        import products.compatibility as compat_module

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            compat_module.get_compatibility_options.cache_clear()
            response = api_client.get(reverse("compatibility_options"))

        options = response.data["options"]
        codes = [o["compatibility_code"] for o in options]
        assert codes == sorted(codes)


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


@pytest.mark.django_db
class TestCompatibilityCountsEndpoint:
    def test_returns_compatibility_counts(
        self, api_client, product_factory, compat_csv
    ):
        """CompatibilityCountsView returns product counts per compatibility code."""
        import products.compatibility as compat_module
        from django.core.cache import cache

        cache.clear()
        # Create products with references that match compatibility codes
        product_factory(reference="50.313.022.01-2", is_visible=True)
        product_factory(reference="50.313.022.02-2", is_visible=True)
        product_factory(reference="31.322.022.05-2", is_visible=True)
        product_factory(reference="UNRELATED-REF", is_visible=True)

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(reverse("compatibility_counts"))

        assert response.status_code == status.HTTP_200_OK
        counts = response.data["counts"]
        assert counts.get("0022") == 3  # 3 products match code 0022
        assert counts.get("0001") == 0  # 0 products match code 0001

    def test_respects_is_visible_filter(self, api_client, product_factory, compat_csv):
        """Only visible products are counted."""
        import products.compatibility as compat_module
        from django.core.cache import cache

        cache.clear()
        product_factory(reference="50.313.022.01-2", is_visible=True)
        product_factory(reference="50.313.022.02-2", is_visible=False)

        with patch.object(compat_module, "_CSV_PATH", compat_csv):
            compat_module._load.cache_clear()
            response = api_client.get(reverse("compatibility_counts"))

        assert response.status_code == status.HTTP_200_OK
        counts = response.data["counts"]
        assert counts.get("0022") == 1

    def test_endpoint_is_public(self, api_client, product_factory):
        """Endpoint doesn't require authentication."""
        product_factory(reference="TEST-01", is_visible=True)
        response = api_client.get(reverse("compatibility_counts"))
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCategoryCountsEndpoint:
    def test_returns_category_counts(self, api_client, product_factory):
        """CategoryCountsView returns product counts per category."""
        from django.core.cache import cache

        cache.clear()
        product_factory(category="Power Tools", is_visible=True)
        product_factory(category="Power Tools", is_visible=True)
        product_factory(category="Hand Tools", is_visible=True)
        product_factory(category="Power Tools", is_visible=False)  # Not visible

        response = api_client.get(reverse("category_counts"))

        assert response.status_code == status.HTTP_200_OK
        counts = response.data["counts"]
        assert counts.get("Power Tools") == 2
        assert counts.get("Hand Tools") == 1

    def test_includes_parameters_all_categories(self, api_client, product_factory):
        """Counts include categories from parameters.all_categories field."""
        from django.core.cache import cache

        cache.clear()
        product_factory(
            category="Main",
            parameters={"all_categories": "Sub1; Sub2"},
            is_visible=True,
        )

        response = api_client.get(reverse("category_counts"))

        assert response.status_code == status.HTTP_200_OK
        counts = response.data["counts"]
        assert counts.get("Main") == 1
        assert counts.get("Sub1") == 1
        assert counts.get("Sub2") == 1

    def test_endpoint_is_public(self, api_client, product_factory):
        """Endpoint doesn't require authentication."""
        product_factory(category="Test", is_visible=True)
        response = api_client.get(reverse("category_counts"))
        assert response.status_code == status.HTTP_200_OK
