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

    def test_counts_letter_suffix_compatibility_codes(
        self, api_client, product_factory, tmp_path
    ):
        """Letter-suffixed compatibility codes get their own cached counts."""
        import products.compatibility as compat_module
        from django.core.cache import cache

        path = tmp_path / "compatibility_options.csv"
        rows = [
            {
                "compatibility_code": "0041",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.313.043.01-2",
            },
            {
                "compatibility_code": "0041B",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.313.041.01-2",
            },
        ]
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=["compatibility_code", "section", "reference"]
            )
            writer.writeheader()
            writer.writerows(rows)

        cache.clear()
        product_factory(reference="31.313.043.01-2", is_visible=True)
        product_factory(reference="31.313.041.01-2", is_visible=True)

        with patch.object(compat_module, "_CSV_PATH", str(path)):
            compat_module._load.cache_clear()
            response = api_client.get(reverse("compatibility_counts"))

        assert response.status_code == status.HTTP_200_OK
        counts = response.data["counts"]
        assert counts.get("0041") == 1
        assert counts.get("0041B") == 1

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

        with patch("products.views._load_allowed_categories", return_value=set()):
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

        with patch("products.views._load_allowed_categories", return_value=set()):
            response = api_client.get(reverse("category_counts"))

        assert response.status_code == status.HTTP_200_OK
        counts = response.data["counts"]
        assert counts.get("Main") == 1
        assert counts.get("Sub1") == 1
        assert counts.get("Sub2") == 1

    def test_cache_is_invalidated_after_admin_product_update(
        self, api_client, user_factory, product_factory
    ):
        """Changing product category invalidates cached category counts immediately."""
        from django.core.cache import cache

        cache.clear()
        admin = user_factory(is_staff=True, is_superuser=True)
        api_client.force_authenticate(user=admin)
        product = product_factory(category="Old", is_visible=True)

        with patch("products.views._load_allowed_categories", return_value=set()):
            first = api_client.get(reverse("category_counts"))
            assert first.status_code == status.HTTP_200_OK
            assert first.data["counts"].get("Old") == 1

            update_response = api_client.patch(
                reverse("admin_product_update", args=[product.id]),
                {"category": "New"},
                format="multipart",
            )
            assert update_response.status_code == status.HTTP_200_OK

            second = api_client.get(reverse("category_counts"))
            assert second.status_code == status.HTTP_200_OK
            assert second.data["counts"].get("Old", 0) == 0
            assert second.data["counts"].get("New") == 1

    def test_cache_is_invalidated_after_bulk_visibility_update(
        self, api_client, user_factory, product_factory
    ):
        """Bulk visibility updates must invalidate cached category counts."""
        from django.core.cache import cache

        cache.clear()
        admin = user_factory(is_staff=True, is_superuser=True)
        api_client.force_authenticate(user=admin)
        product = product_factory(category="VisibleToggle", is_visible=True)

        with patch("products.views._load_allowed_categories", return_value=set()):
            first = api_client.get(reverse("category_counts"))
            assert first.status_code == status.HTTP_200_OK
            assert first.data["counts"].get("VisibleToggle") == 1

            bulk_response = api_client.post(
                reverse("admin_product_bulk_set_visible"),
                {"ids": [product.id], "is_visible": False},
                format="json",
            )
            assert bulk_response.status_code == status.HTTP_200_OK

            second = api_client.get(reverse("category_counts"))
            assert second.status_code == status.HTTP_200_OK
            assert second.data["counts"].get("VisibleToggle", 0) == 0

    def test_endpoint_is_public(self, api_client, product_factory):
        """Endpoint doesn't require authentication."""
        product_factory(category="Test", is_visible=True)
        response = api_client.get(reverse("category_counts"))
        assert response.status_code == status.HTTP_200_OK


class TestCatalogIntegrity:
    """Tests verify data matches the physical PDF catalog (PRODUCT-REFERENCE-0326_01.pdf).

    These tests read the real compatibility_options.csv — no mocking.
    Each assertion maps to a specific page and section in the PDF.
    """

    # ── Code 0001 · BIOMET 3L · pages 43-46 ──────────────────────────────────

    def test_0001_tibase_families_present(self):
        """PDF p.43: STANDARD DYNAMIC TIBASE for 0001 has NE family 31.322.001 and E family 31.312.001."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0001")
        assert "31.322.001" in prefixes, "NE TIBASE family missing for code 0001"
        assert "31.312.001" in prefixes, "E TIBASE family missing for code 0001"

    def test_0001_3tibase_families_present(self):
        """PDF p.43: DYNAMIC 3TIBASE for 0001 has 31.322.001 (NE) and 31.312.001 (E)."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0001")
        # 3TIBASE refs 31.322.001.21-2 and 31.312.001.21-2 share the same family as TIBASE
        assert "31.322.001" in prefixes
        assert "31.312.001" in prefixes

    def test_0001_scanbody_adaptor_screwdriver_families(self):
        """PDF p.43: DYNAMIC SCANBODY section for 0001 contains scanbody, adaptor, screwdriver families."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0001")
        assert "52.410.103" in prefixes, "Scanbody 52.410.103 missing"  # H=10 scanbody
        assert "50.312.001" in prefixes, "Adaptor 50.312.001 missing"
        assert "43.621.410" in prefixes, "Screwdriver 43.621.410 missing"

    def test_0001_milling_tool_analog_families(self):
        """PDF p.44: DYNAMIC MILLING TOOL and ANALOG for 0001."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0001")
        assert "33.390.754" in prefixes, "Milling tool shank 3 missing"
        assert "33.490.754" in prefixes, "Milling tool shank 4 missing"
        assert "22.612.001" in prefixes, "Analog missing"

    def test_0001_screw_families(self):
        """PDF p.44: SCREWS section for 0001 — dynamic screw 41.316.084, straight screw 40.316.003."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0001")
        assert "41.316.084" in prefixes, "Dynamic screw 41.316.084 missing"
        assert "40.316.003" in prefixes, "Straight screw 40.316.003 missing"

    # ── Code 0022 · ADIN / HI-TEC / NOBEL BIOCARE / etc. · pages 93-96 ──────

    def test_0022_tibase_ne_family(self):
        """PDF p.93: NE TIBASE family 31.323.022 present for code 0022."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "31.323.022" in get_ref_prefixes_for_code("0022")

    def test_0022_tibase_e_family(self):
        """PDF p.93: E TIBASE family 31.313.022 present for code 0022."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "31.313.022" in get_ref_prefixes_for_code("0022")

    def test_0022_scanbody_and_adaptor(self):
        """PDF p.93: SCANBODY 52.408.106, adaptor 50.313.022 present for code 0022."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0022")
        assert "52.408.106" in prefixes, "Scanbody H=8 missing for 0022"
        assert "50.313.022" in prefixes, "Adaptor missing for 0022"

    def test_0022_multi_unit_families(self):
        """PDF p.95: STRAIGHT MULTI-UNIT family 42.303.022 and ANGULATED 48.312.022 for 0022."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0022")
        assert "42.303.022" in prefixes, "Straight multi-unit family missing for 0022"
        assert "48.312.022" in prefixes, "Angulated multi-unit family missing for 0022"
        assert "62.303.022" in prefixes, "Internal multi-unit family missing for 0022"

    def test_0022_dynamic_screw(self):
        """PDF p.94: Dynamic screw 41.320.075 and straight screw 40.320.008 for code 0022."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0022")
        assert "41.320.075" in prefixes, "Dynamic screw missing for 0022"
        assert "40.320.008" in prefixes, "Straight screw missing for 0022"

    def test_0022_scanbody_op(self):
        """PDF p.94: SCANBODY OP 54.315.022 present for code 0022."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "54.315.022" in get_ref_prefixes_for_code("0022")

    # ── Code 0030 · DENTIS / OSSTEM / NEOBIOTECH · pages 112-115 ─────────────

    def test_0030_is_padded_code(self):
        """Bug fix: code must be stored as '0030', not '030' (zero-padding fix)."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert len(get_ref_prefixes_for_code("0030")) > 0, "Code 0030 has no entries"
        assert (
            len(get_ref_prefixes_for_code("030")) == 0
        ), "Non-padded code 030 must return nothing"

    def test_0030_tibase_families(self):
        """PDF p.112: TIBASE NE family 31.323.030 and E family 31.313.030 for 0030 (DENTIS)."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0030")
        assert "31.323.030" in prefixes, "NE TIBASE family missing for 0030"
        assert "31.313.030" in prefixes, "E TIBASE family missing for 0030"

    def test_0030_3tibase_families(self):
        """PDF p.112: 3TIBASE for 0030 — refs .21, .22, .23 in families 31.323.030 / 31.313.030."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0030")
        assert "31.323.030" in prefixes
        assert "31.313.030" in prefixes

    def test_0030_multi_unit_families(self):
        """PDF p.113-115: MULTI-UNIT families for 0030 — straight, angulated, internal."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0030")
        assert "42.303.030" in prefixes, "Straight MU missing for 0030"
        assert "48.312.030" in prefixes, "Angulated MU missing for 0030"
        assert "62.303.030" in prefixes, "Internal MU missing for 0030"

    def test_0030_scanbody_and_adaptor(self):
        """PDF p.112: Scanbody and adaptor families for 0030."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0030")
        assert (
            "52.410.101" in prefixes or "52.408.101" in prefixes
        ), "Scanbody missing for 0030"
        assert "50.313.030" in prefixes, "Adaptor missing for 0030"

    def test_0030_page_114_screws(self):
        """PDF p.114: DENTIS/OSSTEM/NEOBIOTECH 0030 screw table."""
        from products.compatibility import (
            _load_screws_by_code,
            get_compatible_screws_for_tibase,
        )

        _load_screws_by_code.cache_clear()
        screws = get_compatible_screws_for_tibase("31.323.030.01-2")

        assert "41.320.079.01-2" in screws["dynamic"]
        assert "41.320.125.01-2" in screws["dynamic"]
        assert "40.320.003.04-2" in screws["straight"]

    # ── Code 0075 · ANKYLOS · pages 171-173 ──────────────────────────────────

    def test_0075_is_padded_code(self):
        """Bug fix: code must be stored as '0075', not '075' (zero-padding fix)."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert len(get_ref_prefixes_for_code("0075")) > 0, "Code 0075 has no entries"
        assert (
            len(get_ref_prefixes_for_code("075")) == 0
        ), "Non-padded code 075 must return nothing"

    def test_0075_tibase_ne_family(self):
        """PDF p.172: NE TIBASE family 31.322.075 present for 0075 (ANKYLOS)."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "31.322.075" in get_ref_prefixes_for_code("0075")

    def test_0075_tibase_e_family(self):
        """PDF p.172: E TIBASE family 31.312.075 present for 0075 (ANKYLOS).
        Note: GH=1 has no E variant, but GH=2,3,4 do — so family must exist."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "31.312.075" in get_ref_prefixes_for_code("0075")

    def test_0075_3tibase_family(self):
        """PDF p.172: 3TIBASE ref 31.322.075.21-2 (NE only, no E) present for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "31.322.075" in get_ref_prefixes_for_code("0075")

    def test_0075_milling_tool_family(self):
        """PDF p.172: Milling tool family 33.330.734 / 33.430.734 / 33.630.734 for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0075")
        assert "33.330.734" in prefixes, "Milling shank 3 missing for 0075"
        assert "33.430.734" in prefixes, "Milling shank 4 missing for 0075"
        assert "33.630.734" in prefixes, "Milling shank 6 missing for 0075"

    def test_0075_dynamic_screw(self):
        """PDF p.172: Dynamic screw 41.318.077 and straight screw 40.318.013 for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0075")
        assert "41.318.077" in prefixes, "Dynamic screw missing for 0075"
        assert "40.318.013" in prefixes, "Straight screw missing for 0075"

    def test_0075_multi_unit_engaging(self):
        """PDF p.173: STRAIGHT MULTI-UNIT family 42.302.075 (ENGAGING only) for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "42.302.075" in get_ref_prefixes_for_code("0075")

    def test_0075_scanbody_op(self):
        """PDF p.172: SCANBODY OP 54.315.075 present for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "54.315.075" in get_ref_prefixes_for_code("0075")

    def test_0075_analog_family(self):
        """PDF p.172: ANALOG family 22.612.075 and DIGITAL ANALOG 34.612.075 for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        prefixes = get_ref_prefixes_for_code("0075")
        assert "22.612.075" in prefixes, "Analog missing for 0075"
        assert "34.612.075" in prefixes, "Digital analog missing for 0075"

    def test_0075_adaptor_family(self):
        """PDF p.172: Adaptor 50.312.075 present for 0075."""
        from products.compatibility import _load, get_ref_prefixes_for_code

        _load.cache_clear()
        assert "50.312.075" in get_ref_prefixes_for_code("0075")

    # ── Cross-code integrity ──────────────────────────────────────────────────

    def test_all_codes_are_4_digit_padded(self):
        """Every compatibility code in the CSV must be 4 digits with an optional suffix."""
        import csv as csv_mod
        import os

        csv_path = os.path.join(
            os.path.dirname(__file__), "../../../data/csv/compatibility_options.csv"
        )
        with open(csv_path, newline="", encoding="utf-8") as f:
            bad = [
                row["compatibility_code"]
                for row in csv_mod.DictReader(f)
                if row["compatibility_code"]
                and not (
                    len(row["compatibility_code"]) in (4, 5)
                    and row["compatibility_code"][:4].isdigit()
                    and (
                        len(row["compatibility_code"]) == 4
                        or row["compatibility_code"][4:].isalpha()
                    )
                )
            ]
        assert bad == [], f"Non-padded codes found: {bad[:10]}"

    def test_143_distinct_codes_in_csv(self):
        """CSV must contain exactly 143 distinct compatibility codes matching the PDF catalog."""
        import csv as csv_mod
        import os

        csv_path = os.path.join(
            os.path.dirname(__file__), "../../../data/csv/compatibility_options.csv"
        )
        with open(csv_path, newline="", encoding="utf-8") as f:
            codes = {
                row["compatibility_code"]
                for row in csv_mod.DictReader(f)
                if row["compatibility_code"]
            }
        assert (
            len(codes) == 143
        ), f"Expected 143 codes, got {len(codes)}: {sorted(codes)}"

    def test_no_ankylos_typo_in_csv(self):
        """ANKLYOS typo (transposed letters) must not appear in compatibility_options.csv sections."""
        import csv as csv_mod
        import os

        csv_path = os.path.join(
            os.path.dirname(__file__), "../../../data/csv/compatibility_options.csv"
        )
        with open(csv_path, newline="", encoding="utf-8") as f:
            typos = [
                row["section"]
                for row in csv_mod.DictReader(f)
                if "ANKLYOS" in row.get("section", "").upper()
            ]
        assert typos == [], f"ANKLYOS typo still present in {len(typos)} rows"


class TestCompatibilityCodePadding:
    """Verify that compatibility codes are always 4-digit padded (e.g. '0075', not '075').

    These tests guard against the bug where convert_to_csv.py wrote the non-padded
    segment_3 value ('075', '030') instead of the padded 4-digit code ('0075', '0030').
    """

    def test_get_ref_prefixes_uses_padded_code(self, tmp_path):
        """get_ref_prefixes_for_code must find prefixes when queried with 4-digit code."""
        from unittest.mock import patch
        import products.compatibility as compat_module

        path = tmp_path / "compatibility_options.csv"
        rows = [
            {
                "compatibility_code": "0075",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.322.075.01-2",
            },
            {
                "compatibility_code": "0075",
                "section": "SCREWDRIVER",
                "reference": "43.621.410.01-2",
            },
            {
                "compatibility_code": "0075",
                "section": "SCREW",
                "reference": "40.318.013.01-2",
            },
            {
                "compatibility_code": "0030",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.323.030.01-2",
            },
        ]
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=["compatibility_code", "section", "reference"]
            )
            writer.writeheader()
            writer.writerows(rows)

        with patch.object(compat_module, "_CSV_PATH", str(path)):
            compat_module._load.cache_clear()
            prefixes_0075 = compat_module.get_ref_prefixes_for_code("0075")
            prefixes_075 = compat_module.get_ref_prefixes_for_code("075")

        # 4-digit padded code must return all 3 cross-family prefixes
        assert "31.322.075" in prefixes_0075
        assert "43.621.410" in prefixes_0075
        assert "40.318.013" in prefixes_0075
        # Non-padded 3-digit code must return nothing (it's not in the CSV)
        assert len(prefixes_075) == 0

    def test_get_compatibility_codes_for_ref_returns_padded(self, tmp_path):
        """get_compatibility_codes_for_ref must return 4-digit codes like '0075', not '075'."""
        from unittest.mock import patch
        import products.compatibility as compat_module

        path = tmp_path / "compatibility_options.csv"
        rows = [
            {
                "compatibility_code": "0075",
                "section": "TIBASE",
                "reference": "31.322.075.01-2",
            },
            {
                "compatibility_code": "0030",
                "section": "TIBASE",
                "reference": "31.323.030.01-2",
            },
        ]
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=["compatibility_code", "section", "reference"]
            )
            writer.writeheader()
            writer.writerows(rows)

        with patch.object(compat_module, "_CSV_PATH", str(path)):
            compat_module._load.cache_clear()
            compat_module._load_ref_to_codes.cache_clear()
            compat_module._load_family_to_codes.cache_clear()
            codes_075 = compat_module.get_compatibility_codes_for_ref("31.322.075.02-2")
            codes_030 = compat_module.get_compatibility_codes_for_ref("31.323.030.02-2")

        assert codes_075 == ["0075"], f"Expected ['0075'], got {codes_075}"
        assert codes_030 == ["0030"], f"Expected ['0030'], got {codes_030}"

    def test_tibase_screws_prefer_exact_csv_code_over_reference_segment(self, tmp_path):
        """Friction-fit TiBases can live in a different PDF block than ref segment."""
        from unittest.mock import patch
        import products.compatibility as compat_module

        path = tmp_path / "compatibility_options.csv"
        rows = [
            {
                "compatibility_code": "0040",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.312.042.01-2",
            },
            {
                "compatibility_code": "0040",
                "section": "DYNAMIC",
                "reference": "41.318.071.01-2",
            },
            {
                "compatibility_code": "0040",
                "section": "STRAIGHT",
                "reference": "40.317.004.01-2",
            },
        ]
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=["compatibility_code", "section", "reference"]
            )
            writer.writeheader()
            writer.writerows(rows)

        with patch.object(compat_module, "_CSV_PATH", str(path)):
            compat_module._load.cache_clear()
            compat_module._load_ref_to_codes.cache_clear()
            compat_module._load_family_to_codes.cache_clear()
            compat_module._load_screws_by_code.cache_clear()
            result = compat_module.get_compatible_screws_for_tibase("31.312.042.01-2")

        assert result["compatibility_code"] == "0040"
        assert result["straight"] == ["40.317.004.01-2"]
        assert result["dynamic"] == ["41.318.071.01-2"]

    def test_tibase_screws_keep_letter_suffix_codes_separate(self, tmp_path):
        """Letter-suffixed PDF blocks like 0041B must not merge into 0041."""
        from unittest.mock import patch
        import products.compatibility as compat_module

        path = tmp_path / "compatibility_options.csv"
        rows = [
            {
                "compatibility_code": "0041",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.313.041.01-2",
            },
            {
                "compatibility_code": "0041",
                "section": "DYNAMIC",
                "reference": "41.317.071.01-2",
            },
            {
                "compatibility_code": "0041B",
                "section": "STANDARD DYNAMIC TIBASE",
                "reference": "31.313.041.01-2",
            },
            {
                "compatibility_code": "0041B",
                "section": "DYNAMIC",
                "reference": "41.318.071.01-2",
            },
            {
                "compatibility_code": "0041B",
                "section": "STRAIGHT",
                "reference": "40.317.004.01-2",
            },
        ]
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, fieldnames=["compatibility_code", "section", "reference"]
            )
            writer.writeheader()
            writer.writerows(rows)

        with patch.object(compat_module, "_CSV_PATH", str(path)):
            compat_module._load.cache_clear()
            compat_module._load_ref_to_codes.cache_clear()
            compat_module._load_family_to_codes.cache_clear()
            compat_module._load_screws_by_code.cache_clear()
            normal = compat_module.get_compatible_screws_for_tibase("31.313.041.01-2")
            suffixed = compat_module.get_compatible_screws_for_tibase(
                "31.313.041.01-2",
                compatibility_code="0041B",
            )

        assert normal["compatibility_code"] == "0041"
        assert normal["dynamic"] == ["41.317.071.01-2"]
        assert suffixed["compatibility_code"] == "0041B"
        assert suffixed["straight"] == ["40.317.004.01-2"]
        assert suffixed["dynamic"] == ["41.318.071.01-2"]
