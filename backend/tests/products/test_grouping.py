"""Tests for grouping helpers and wildcard sync group naming."""

import pytest

from products.grouping import strip_gh_variant_from_name
from products.models import Product, WildcardGroup
from products.services.wildcard_sync import sync_wildcard_groups


class TestStripGhVariantFromName:
    def test_strips_decimal_with_period(self):
        assert strip_gh_variant_from_name("Adaptor IO G4.5") == "Adaptor IO"

    def test_strips_decimal_with_comma(self):
        assert strip_gh_variant_from_name("Adaptor IO G4,5") == "Adaptor IO"

    def test_strips_integer_variant(self):
        assert strip_gh_variant_from_name("Adaptor IO G2 HA") == "Adaptor IO HA"

    def test_no_variant_unchanged(self):
        assert (
            strip_gh_variant_from_name("Product without variant")
            == "Product without variant"
        )

    def test_leading_variant_stripped(self):
        assert strip_gh_variant_from_name("G1 Implant") == "Implant"

    def test_preserves_original_casing(self):
        # Result is NOT casefolded, unlike normalized_storefront_name
        assert strip_gh_variant_from_name("Adaptor IO G3.5") == "Adaptor IO"

    def test_empty_string(self):
        assert strip_gh_variant_from_name("") == ""

    def test_none_returns_empty(self):
        assert strip_gh_variant_from_name(None) == ""  # type: ignore[arg-type]


@pytest.mark.django_db
class TestSyncGroupNameStripsGhValue:
    def _make_product(self, name, reference, price="10.00", category="cat"):
        return Product.objects.create(
            name=name,
            reference=reference,
            price=price,
            category=category,
            is_visible=True,
        )

    def test_new_group_name_has_gh_stripped(self):
        self._make_product("Adaptor IO G2", "54.315.001.01-2")
        self._make_product("Adaptor IO G3", "54.315.002.01-2")
        sync_wildcard_groups()
        wg = WildcardGroup.objects.get(is_auto_generated=True)
        assert wg.name == "Adaptor IO"

    def test_existing_group_name_healed_on_resync(self):
        p1 = self._make_product("Adaptor IO G2", "54.315.001.01-2")
        p2 = self._make_product("Adaptor IO G3", "54.315.002.01-2")
        # Create group manually with an old-style (un-stripped) name
        from products.grouping import storefront_group_key

        norm_key = "|".join(storefront_group_key(p1))
        wg = WildcardGroup.objects.create(
            name="Adaptor IO G2",
            norm_key=norm_key,
            is_auto_generated=True,
        )
        p1.wildcard_group = wg
        p1.save()
        p2.wildcard_group = wg
        p2.save()

        sync_wildcard_groups()
        wg.refresh_from_db()
        assert wg.name == "Adaptor IO"
