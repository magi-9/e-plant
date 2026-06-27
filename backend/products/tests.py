import csv

import pytest
import sys
import types
from django.core.cache import cache
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient

from products import views
from products.models import (
    GroupingSettings,
    Product,
    WildcardGroup,
)
from products.grouping import masked_variant_reference
from products.services.wildcard_sync import sync_wildcard_groups

# ─── helpers ──────────────────────────────────────────────────────────────────


def make_product(**kwargs):
    defaults = dict(
        description="",
        category="A",
        price="10.00",
        stock_quantity=1,
        is_visible=True,
    )
    defaults.update(kwargs)
    return Product.objects.create(**defaults)


def admin_client():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_superuser(email="admin@test.com", password="pass")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_admin_create_accepts_parameters_json_string():
    client = admin_client()
    response = client.post(
        "/api/products/admin/create/",
        data={
            "name": "Json Product",
            "description": "",
            "category": "CatA",
            "price": "12.50",
            "stock_quantity": 5,
            "is_visible": "true",
            "parameters": '{"all_categories": "CatA; CatB", "details": {"key": "value"}}',
        },
        format="multipart",
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["parameters"]["details"]["key"] == "value"
    assert response.data["parameters"]["all_categories"] == "CatA; CatB"


@pytest.mark.django_db
def test_admin_create_rejects_invalid_parameters_json():
    client = admin_client()
    response = client.post(
        "/api/products/admin/create/",
        data={
            "name": "Bad Json",
            "description": "",
            "category": "CatA",
            "price": "12.50",
            "stock_quantity": 5,
            "is_visible": "true",
            "parameters": "{bad json",
        },
        format="multipart",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "parameters" in response.data


@pytest.mark.django_db
def test_admin_create_rejects_non_object_details():
    client = admin_client()
    response = client.post(
        "/api/products/admin/create/",
        data={
            "name": "Bad Details",
            "description": "",
            "category": "CatA",
            "price": "12.50",
            "stock_quantity": 5,
            "is_visible": "true",
            "parameters": '{"details": ["nope"]}',
        },
        format="multipart",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "parameters" in response.data


# ─── existing visibility tests ─────────────────────────────────────────────────


@pytest.mark.django_db
def test_public_product_list_uses_visible_filter():
    visible = make_product(name="Visible")
    make_product(name="Hidden", is_visible=False)

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == visible.id


@pytest.mark.django_db
def test_public_product_count_uses_visible_filter():
    make_product(name="Visible Count")
    make_product(name="Hidden Count", is_visible=False)

    response = APIClient().get("/api/products/count/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


# ─── wildcard sync ────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_sync_creates_groups_for_matching_products():
    p1 = make_product(name="Implant G1", price="100.00", category="Impl")
    p2 = make_product(name="Implant G2", price="100.00", category="Impl")
    make_product(name="Solo product", price="50.00", category="Other")

    result = sync_wildcard_groups()

    assert result["created"] == 1
    p1.refresh_from_db()
    p2.refresh_from_db()
    assert p1.wildcard_group_id == p2.wildcard_group_id
    assert p1.wildcard_group is not None


@pytest.mark.django_db
def test_import_product_data_syncs_wildcard_groups_after_upload(monkeypatch):
    from products.management.commands import import_product_data

    monkeypatch.setattr(import_product_data, "get_image_source_dirs", lambda: [])
    monkeypatch.setattr(
        import_product_data,
        "load_flat_products",
        lambda *_args, **_kwargs: [
            {
                "name": "Implant G1",
                "reference": "10.001.001.01-2",
                "reference_num": "10001001012",
                "category": "Impl",
                "price": "100.00",
                "description": "",
                "is_visible": True,
                "parameters": {},
            },
            {
                "name": "Implant G2",
                "reference": "10.001.002.01-2",
                "reference_num": "10001002012",
                "category": "Impl",
                "price": "100.00",
                "description": "",
                "is_visible": True,
                "parameters": {},
            },
        ],
    )

    call_command("import_product_data")

    products = list(Product.objects.order_by("reference"))
    assert len(products) == 2
    assert products[0].wildcard_group_id == products[1].wildcard_group_id
    assert WildcardGroup.objects.count() == 1


def test_manual_price_override_applies_before_visibility(monkeypatch, tmp_path):
    from products import compatibility
    from products.management.commands import import_product_data

    monkeypatch.setattr(
        compatibility, "_load", lambda: {"0041": frozenset({"43.620.411"})}
    )

    merged_csv = tmp_path / "import_all_merged.csv"
    with merged_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "name",
                "description",
                "category",
                "price",
                "stock_quantity",
                "reference",
                "reference_num",
                "ean13",
                "price_match_type",
                "price_reference",
                "retail_name",
                "compatibility_code",
                "ref_segment_1",
                "ref_segment_2",
                "ref_segment_3",
                "ref_segment_4",
                "ref_check_digit",
                "options",
                "generated_description",
                "system_categories",
                "active_system_categories",
                "primary_system_category",
                "is_active_from_categories",
                "engaging",
                "catalog_section",
            ]
        )
        writer.writerow(
            [
                "screwdriver Adaptor IO. MB MD L20mm",
                "",
                "",
                "",
                "0",
                "43.620.411.01-2",
                "43620411012",
                "",
                "",
                "",
                "",
                "0041",
                "43",
                "620",
                "411",
                "01",
                "2",
                "",
                "",
                "MIS",
                "MIS",
                "MIS",
                "1",
                "",
                "SCREWDRIVER",
            ]
        )

    products = import_product_data.load_flat_products(str(merged_csv))

    assert (
        products[0]["price"]
        == import_product_data.MANUAL_PRICE_OVERRIDES["43.620.411.01-2"]
    )
    assert products[0]["is_visible"] is True


def test_product_import_vat_classification():
    from products.management.commands import import_product_data

    classify = import_product_data.determine_product_vat_rate

    assert (
        classify(reference="31.312.001.01-2", name="Dynamic TiBase")
        == import_product_data.REDUCED_VAT_RATE
    )
    assert (
        classify(
            reference="49.418.000.01-2",
            name="CAPS 3,8mm S",
            category="CAPS system",
            catalog_section="DYNAMIC MILLING TOOL",
        )
        == import_product_data.REDUCED_VAT_RATE
    )
    assert (
        classify(reference="43.601.103.02-2", name="Screwdrivers for straight screws")
        == import_product_data.STANDARD_VAT_RATE
    )
    assert (
        classify(
            reference="50.312.209.01-2",
            name="Dynamic scanbody adaptor",
            catalog_section="ADAPTOR",
        )
        == import_product_data.STANDARD_VAT_RATE
    )
    assert (
        classify(
            reference="33.390.716.01-2",
            name="Dynamic Milling Tool",
            catalog_section="DYNAMIC MILLING TOOL",
        )
        == import_product_data.STANDARD_VAT_RATE
    )
    assert (
        classify(
            reference="49.604.000.08-2",
            name="Nobel Biocare wrench adaptor",
            category="ACCESSORIES",
        )
        == import_product_data.STANDARD_VAT_RATE
    )


def test_manual_photo_suffix_matches_reference_number(tmp_path):
    from products.management.commands import import_product_data

    image_dir = tmp_path / "photos-manual"
    image_dir.mkdir()
    image_path = image_dir / "22612006012_l.jpg"
    image_path.write_bytes(b"fake-image")

    image_index = import_product_data.build_image_index(str(image_dir))

    image_key = import_product_data.find_image_for_ref("22612006012", image_index)
    assert image_key == "22612006012"
    assert image_index[image_key] == str(image_path)


def test_manual_image_fallback_uses_42303186052_for_lower_gh_variants(tmp_path):
    from products.management.commands import import_product_data

    image_dir = tmp_path / "photos-manual"
    image_dir.mkdir()
    image_path = image_dir / "42303186052.jpg"
    image_path.write_bytes(b"fake-image")

    image_index = import_product_data.build_image_index(str(image_dir))

    image_key = import_product_data.find_image_for_ref("42303186012", image_index)
    assert image_key == "42303186052"
    assert image_index[image_key] == str(image_path)


@pytest.mark.django_db
def test_sync_skips_single_product_groups():
    make_product(name="Solo G1", price="20.00", category="X")

    result = sync_wildcard_groups()

    assert result["created"] == 0
    assert WildcardGroup.objects.count() == 0


@pytest.mark.django_db
def test_sync_groups_references_differing_by_one_digit_with_same_price_and_compatibility():
    products = [
        make_product(
            name="DMT Shank 3",
            reference="33.345.856.01-2",
            price="88.00",
            category="A",
            parameters={"compatibility_code": "0856"},
        ),
        make_product(
            name="DMT Shank 4",
            reference="33.445.856.01-2",
            price="88.00",
            category="B",
            parameters={"compatibility_code": "0856"},
        ),
        make_product(
            name="DMT Shank 6",
            reference="33.645.856.01-2",
            price="88.00",
            category="C",
            parameters={"compatibility_code": "0856"},
        ),
    ]

    result = sync_wildcard_groups()

    assert result["created"] == 1
    group_ids = {
        Product.objects.get(pk=product.pk).wildcard_group_id for product in products
    }
    assert len(group_ids) == 1
    assert None not in group_ids


@pytest.mark.django_db
def test_sync_does_not_group_one_digit_references_with_different_compatibility():
    make_product(
        name="Multi unit GH 1",
        reference="42.303.186.01-2",
        price="48.00",
        category="A",
        parameters={"compatibility_code": "0186"},
    )
    make_product(
        name="Multi unit GH 2",
        reference="42.303.186.02-2",
        price="48.00",
        category="B",
        parameters={"compatibility_code": "9999"},
    )

    result = sync_wildcard_groups()

    assert result["created"] == 0
    assert WildcardGroup.objects.count() == 0


@pytest.mark.django_db
def test_sync_preserves_manually_managed_groups():
    p1 = make_product(name="Drill G1", price="200.00", category="D")
    p2 = make_product(name="Drill G2", price="200.00", category="D")

    # Admin manually creates a group and assigns p1/p2
    manual = WildcardGroup.objects.create(name="Manual Drills", is_auto_generated=False)
    Product.objects.filter(pk__in=[p1.pk, p2.pk]).update(wildcard_group=manual)

    result = sync_wildcard_groups()

    # Sync must NOT touch the manually managed group
    assert result["created"] == 0
    p1.refresh_from_db()
    assert p1.wildcard_group_id == manual.id


@pytest.mark.django_db
def test_sync_is_idempotent():
    make_product(name="Screw G1", price="5.00", category="S")
    make_product(name="Screw G2", price="5.00", category="S")

    sync_wildcard_groups()
    result2 = sync_wildcard_groups()

    assert result2["created"] == 0
    assert WildcardGroup.objects.count() == 1


@pytest.mark.django_db
def test_sync_deletes_stale_auto_groups():
    p1 = make_product(name="Temp G1", price="1.00", category="T")
    p2 = make_product(name="Temp G2", price="1.00", category="T")

    sync_wildcard_groups()
    assert WildcardGroup.objects.count() == 1

    # Hide one product so only 1 remains eligible → group dissolves
    p2.is_visible = False
    p2.save()

    result = sync_wildcard_groups()
    assert result["deleted"] == 1
    assert WildcardGroup.objects.count() == 0
    p1.refresh_from_db()
    assert p1.wildcard_group_id is None


# ─── storefront collapse / payload ────────────────────────────────────────────


@pytest.mark.django_db
def test_storefront_uses_persistent_wildcard_group():
    """Phase 2: persistent WildcardGroup produces wildcard_group payload."""
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    p1 = make_product(name="Prod A", price="10.00", category="A")
    p2 = make_product(name="Prod B", price="10.00", category="A")

    wg = WildcardGroup.objects.create(name="Group AB", is_auto_generated=True)
    Product.objects.filter(pk__in=[p1.pk, p2.pk]).update(wildcard_group=wg)

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    results = response.data["results"]
    assert len(results) == 1
    assert results[0]["parameters"]["type"] == "wildcard_group"
    assert len(results[0]["parameters"]["options"]) == 2


@pytest.mark.django_db
def test_storefront_wildcard_group_exposes_masked_reference():
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    p1 = make_product(
        name="Implant A", reference="AB12345", price="10.00", category="A"
    )
    p2 = make_product(
        name="Implant B", reference="AB12355", price="10.00", category="A"
    )

    wg = WildcardGroup.objects.create(name="Group AB", is_auto_generated=True)
    Product.objects.filter(pk__in=[p1.pk, p2.pk]).update(wildcard_group=wg)

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    results = response.data["results"]
    assert len(results) == 1
    assert results[0]["parameters"]["masked_reference"] == "AB123x5"


@pytest.mark.django_db
def test_storefront_screw_wildcard_options_use_total_length_labels():
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    p1 = make_product(
        name="Dynamic Screw M1.8 L7.1mm",
        reference="41.318.071.01-2",
        price="10.00",
        category="SCREWS",
        parameters={
            "catalog_section": "DYNAMIC SCREW",
            "option_tokens": "METRIC:1.8|TOTAL LENGTH(mm):7.1|TORQUE:25 N·cm",
        },
    )
    p2 = make_product(
        name="Dynamic Screw M1.8 L10.6mm",
        reference="41.318.106.01-2",
        price="10.00",
        category="SCREWS",
        parameters={
            "catalog_section": "DYNAMIC SCREW",
            "option_tokens": "METRIC:1.8|TOTAL LENGTH(mm):10.6|TORQUE:25 N·cm",
        },
    )

    wg = WildcardGroup.objects.create(
        name="Dynamic Screw Group", is_auto_generated=True
    )
    Product.objects.filter(pk__in=[p1.pk, p2.pk]).update(wildcard_group=wg)

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    options = response.data["results"][0]["parameters"]["options"]
    assert [option["label"] for option in options] == ["7.1 mm", "10.6 mm"]


@pytest.mark.django_db
def test_storefront_non_screw_wildcard_options_keep_default_labels():
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    p1 = make_product(
        name="TiBase G1",
        reference="31.312.001.01-2",
        price="10.00",
        category="TITANIUM BASE",
        parameters={"option_tokens": "TOTAL LENGTH(mm):7.1|GH(mm):1"},
    )
    p2 = make_product(
        name="TiBase G2",
        reference="31.312.001.02-2",
        price="10.00",
        category="TITANIUM BASE",
        parameters={"option_tokens": "TOTAL LENGTH(mm):10.6|GH(mm):2"},
    )

    wg = WildcardGroup.objects.create(name="TiBase Group", is_auto_generated=True)
    Product.objects.filter(pk__in=[p1.pk, p2.pk]).update(wildcard_group=wg)

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    options = response.data["results"][0]["parameters"]["options"]
    assert options[0]["label"] == "31.312.001.01-2 - TiBase G1"
    assert options[1]["label"] == "31.312.001.02-2 - TiBase G2"


def test_masked_variant_reference_masks_only_numeric_differences():
    references = ["AB12345", "AB12355", "AB12365"]

    assert masked_variant_reference(references) == "AB123x5"


def test_masked_variant_reference_rejects_non_numeric_differences():
    references = ["AB12345", "AC12345"]

    assert masked_variant_reference(references) is None


@pytest.mark.django_db
def test_storefront_fallback_without_persistent_groups():
    """Phase 3 fallback: products with same normalised key still collapse."""
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    make_product(name="Implant G1", price="99.00", category="Impl")
    make_product(name="Implant G2", price="99.00", category="Impl")

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    results = response.data["results"]
    assert len(results) == 1
    assert results[0]["parameters"]["type"] == "wildcard_group"


@pytest.mark.django_db
def test_disabled_wildcard_group_shows_products_individually():
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    wg = WildcardGroup.objects.create(name="Disabled", is_enabled=False)
    p1 = make_product(name="X G1", price="10.00", category="X")
    p2 = make_product(name="X G2", price="10.00", category="X")
    # Give unique names so in-memory fallback also doesn't collapse them
    Product.objects.filter(pk=p1.pk).update(wildcard_group=wg, name="Unique Alpha")
    Product.objects.filter(pk=p2.pk).update(wildcard_group=wg, name="Unique Beta")

    response = APIClient().get("/api/products/")

    # Both show individually (disabled group, names differ → no in-memory collapse)
    results = response.data["results"]
    assert len(results) == 2


@pytest.mark.django_db
def test_count_endpoint_stable_after_refactor():
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    make_product(name="A G1", price="1.00", category="A")
    make_product(name="A G2", price="1.00", category="A")
    make_product(name="B alone", price="2.00", category="B")

    response = APIClient().get("/api/products/count/")

    assert response.status_code == status.HTTP_200_OK
    # 2 products collapse to 1 group + 1 individual = 2 cards
    assert response.data["count"] == 2


# ─── admin API ────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_admin_wildcard_group_list():
    WildcardGroup.objects.create(name="G1")
    WildcardGroup.objects.create(name="G2")
    client = admin_client()

    response = client.get("/api/products/admin/wildcard-groups/")

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2


@pytest.mark.django_db
def test_admin_wildcard_group_sync_endpoint():
    make_product(name="Sync G1", price="10.00", category="S")
    make_product(name="Sync G2", price="10.00", category="S")
    client = admin_client()

    response = client.post("/api/products/admin/wildcard-groups/sync/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["created"] == 1
    assert WildcardGroup.objects.count() == 1


@pytest.mark.django_db
def test_admin_add_remove_products_promotes_group():
    p1 = make_product(name="P1")
    p2 = make_product(name="P2")
    wg = WildcardGroup.objects.create(name="WG", is_auto_generated=True)
    Product.objects.filter(pk=p1.pk).update(wildcard_group=wg)

    client = admin_client()

    # Add p2
    r = client.post(
        f"/api/products/admin/wildcard-groups/{wg.pk}/add-products/",
        {"product_ids": [p2.pk]},
        format="json",
    )
    assert r.status_code == status.HTTP_200_OK
    wg.refresh_from_db()
    assert wg.is_auto_generated is False

    # Remove p1
    r = client.post(
        f"/api/products/admin/wildcard-groups/{wg.pk}/remove-products/",
        {"product_ids": [p1.pk]},
        format="json",
    )
    assert r.status_code == status.HTTP_200_OK
    p1.refresh_from_db()
    assert p1.wildcard_group_id is None


# ─── list / count consistency ──────────────────────────────────────────────────


@pytest.mark.django_db
def test_list_and_count_match_with_wildcard_enabled():
    """Storefront list count must equal /count/ when wildcard grouping is on."""
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = True
    s.save()

    wg = WildcardGroup.objects.create(
        name="Group", is_enabled=True, is_auto_generated=True
    )
    p1 = make_product(name="Item G1", price="10.00", category="X")
    p2 = make_product(name="Item G2", price="10.00", category="X")
    Product.objects.filter(pk__in=[p1.pk, p2.pk]).update(wildcard_group=wg)
    make_product(name="Solo", price="5.00", category="Y")

    list_resp = APIClient().get("/api/products/")
    count_resp = APIClient().get("/api/products/count/")

    assert list_resp.status_code == status.HTTP_200_OK
    assert count_resp.status_code == status.HTTP_200_OK
    assert list_resp.data["count"] == count_resp.data["count"]


@pytest.mark.django_db
def test_list_and_count_match_with_wildcard_disabled():
    """When wildcard grouping is off, list and count both return raw product count."""
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = False
    s.save()

    make_product(name="Item G1", price="10.00", category="X")
    make_product(name="Item G2", price="10.00", category="X")

    list_resp = APIClient().get("/api/products/")
    count_resp = APIClient().get("/api/products/count/")

    assert list_resp.data["count"] == 2
    assert count_resp.data["count"] == 2


@pytest.mark.django_db
def test_wildcard_off_no_deduplication():
    """When wildcard grouping is off, products with same name/price show individually."""
    s = GroupingSettings.get()
    s.wildcard_grouping_enabled = False
    s.save()

    make_product(name="Screw G1", price="5.00", category="S")
    make_product(name="Screw G2", price="5.00", category="S")

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2
    for result in response.data["results"]:
        assert result.get("parameters", {}).get("type") != "wildcard_group"


# ─── default ordering ─────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_default_ordering_puts_in_stock_before_out_of_stock():
    """Products in stock should appear before out-of-stock when no filters."""
    out_of_stock = make_product(name="OutOfStock", stock_quantity=0)
    in_stock = make_product(name="InStock", stock_quantity=5)

    response = APIClient().get("/api/products/")

    assert response.status_code == status.HTTP_200_OK
    ids = [r["id"] for r in response.data["results"]]
    assert ids.index(in_stock.id) < ids.index(out_of_stock.id)


@pytest.mark.django_db
def test_filter_active_bypasses_default_ordering():
    """With an active search, default ordering must not be applied (no crash)."""
    make_product(name="Alpha", stock_quantity=5)
    make_product(name="Beta", stock_quantity=5)

    response = APIClient().get("/api/products/", {"search": "Alpha"})

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


@pytest.mark.django_db
def test_product_type_filter_uses_prefixes_and_real_compatibility_code():
    tibase = make_product(
        name="TiBase",
        reference="31.312.001.01-2",
        parameters={"compatibility_code": "0001"},
    )
    straight_tibase = make_product(
        name="Straight TiBase",
        reference="35.312.001.21-2",
        parameters={"compatibility_code": "0001"},
    )
    make_product(
        name="No compatibility number",
        reference="31.312.999.01-2",
        parameters={"compatibility_code": "0000"},
    )
    make_product(
        name="Missing compatibility number",
        reference="31.312.998.01-2",
        parameters={},
    )
    make_product(
        name="Multi Unit",
        reference="42.302.001.01-2",
        parameters={"compatibility_code": "0001"},
    )

    response = APIClient().get("/api/products/", {"product_type": "tibase"})
    count_response = APIClient().get("/api/products/count/", {"product_type": "tibase"})

    assert response.status_code == status.HTTP_200_OK
    assert count_response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2
    assert count_response.data["count"] == 2
    assert {item["id"] for item in response.data["results"]} == {
        tibase.id,
        straight_tibase.id,
    }


@pytest.mark.django_db
def test_product_type_filter_rejects_unknown_group():
    response = APIClient().get("/api/products/", {"product_type": "unknown"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_product_type_counts_split_adapters_and_hide_zero_groups():
    cache.clear()
    make_product(
        name="Adaptor",
        reference="50.312.001.01-2",
        parameters={"compatibility_code": "0001"},
    )
    make_product(
        name="Screwdriver",
        reference="43.621.410.01-2",
        parameters={"compatibility_code": "0001"},
    )
    make_product(
        name="Ignored adaptor",
        reference="50.312.999.01-2",
        parameters={"compatibility_code": "0000"},
    )

    response = APIClient().get("/api/products/product-type-counts/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["counts"]["adapters"] == 1
    assert response.data["counts"]["tools"] == 1
    assert response.data["counts"]["tibase"] == 0


@pytest.mark.django_db
def test_search_exact_category_match_is_first_result():
    category_match = make_product(
        name="ZZZ Category product",
        category="Impl",
        parameters={"all_categories": "Other; Implant system"},
    )
    text_match = make_product(
        name="AAA Implant system mentioned",
        category="Other",
        description="Implant system",
    )

    response = APIClient().get("/api/products/", {"search": "Implant system"})

    assert response.status_code == status.HTTP_200_OK
    ids = [r["id"] for r in response.data["results"]]
    assert ids[:2] == [category_match.id, text_match.id]


@pytest.mark.django_db
def test_reference_search_exact_match_is_first_result():
    mentioned = make_product(
        name="AAA Mentioned product",
        reference="MENTIONED-REF",
        description="Works with 52.410.132.01-2",
        stock_quantity=10,
    )
    exact = make_product(
        name="ZZZ Exact product",
        reference="52.410.132.01-2",
        description="",
        stock_quantity=0,
    )

    response = APIClient().get("/api/products/", {"search": "52.410.132.01-2"})

    assert response.status_code == status.HTTP_200_OK
    ids = [r["id"] for r in response.data["results"]]
    assert ids[:2] == [exact.id, mentioned.id]


def test_catalog_reference_matching_ignores_pdf_spacing():
    assert views._catalog_page_contains_reference(
        "Visual code: 50.312.120.03 - 2",
        "50.312.120.03-2",
    )


def test_catalog_page_search_prefers_pdftotext(monkeypatch):
    def fake_run(*_args, **_kwargs):
        return types.SimpleNamespace(
            returncode=0, stdout="page one\fcontains 50.312.120.03-2\fpage three"
        )

    monkeypatch.setattr(views.subprocess, "run", fake_run)

    assert views._find_reference_pages("catalog.pdf", "50.312.120.03-2") == [2]


def test_catalog_page_search_falls_back_to_pypdf_without_pdftotext(monkeypatch):
    class MatchingPage:
        def extract_text(self):
            return "contains 50.312.120.03-2"

    class FakePdfReader:
        def __init__(self, _path):
            self.pages = [MatchingPage()]

    fake_pypdf = types.SimpleNamespace(PdfReader=FakePdfReader)
    monkeypatch.setitem(sys.modules, "pypdf", fake_pypdf)

    def fake_run(*_args, **_kwargs):
        raise FileNotFoundError

    monkeypatch.setattr(views.subprocess, "run", fake_run)

    assert views._find_reference_pages("catalog.pdf", "50.312.120.03-2") == [1]


def test_find_multiple_reference_pages_merges_refs(monkeypatch):
    def fake_run(*_args, **_kwargs):
        return types.SimpleNamespace(
            returncode=0,
            stdout="page one 40.316.003.01-2\fpage two 31.322.001.01-2\fpage three",
        )

    monkeypatch.setattr(views.subprocess, "run", fake_run)
    refs = frozenset({"40.316.003.01-2", "31.322.001.01-2"})
    assert views._find_multiple_reference_pages("catalog.pdf", refs) == [1, 2]


def test_find_multiple_reference_pages_falls_back_to_pypdf(monkeypatch):
    class Page:
        def __init__(self, text):
            self._text = text

        def extract_text(self):
            return self._text

    class FakePdfReader:
        def __init__(self, _path):
            self.pages = [Page("contains 40.316.003.01-2"), Page("unrelated")]

    fake_pypdf = types.SimpleNamespace(PdfReader=FakePdfReader)
    monkeypatch.setitem(sys.modules, "pypdf", fake_pypdf)
    monkeypatch.setattr(
        views.subprocess,
        "run",
        lambda *_a, **_k: (_ for _ in ()).throw(FileNotFoundError()),
    )

    refs = frozenset({"40.316.003.01-2", "99.999.999.01-2"})
    assert views._find_multiple_reference_pages("catalog.pdf", refs) == [1]


def test_catalog_pages_include_compatible_uses_compatibility_codes(monkeypatch):
    """include_compatible=1 should search for compatibility codes, not all compatible product refs."""
    from products import views as v

    monkeypatch.setattr(v, "_catalog_pdf_path", lambda: "catalog.pdf")
    monkeypatch.setattr(
        "products.compatibility.get_compatibility_codes_for_ref",
        lambda ref: ["0001"],
    )

    captured = {}

    def fake_find_multiple(path, refs):
        captured["refs"] = refs
        return [43, 44]

    monkeypatch.setattr(v, "_find_multiple_reference_pages", fake_find_multiple)

    from django.test import RequestFactory

    rf = RequestFactory()
    request = rf.get(
        "/api/products/catalog-pdf/pages/",
        {"reference": "31.322.001.01-2", "include_compatible": "1"},
    )
    response = v.CatalogPdfPagesView.as_view()(request)

    assert response.data == {"pages": [43, 44]}
    assert captured["refs"] == frozenset({"0001"})


def test_catalog_pages_include_compatible_uses_real_adaptor_0050_code(monkeypatch):
    from products import views as v

    monkeypatch.setattr(v, "_catalog_pdf_path", lambda: "catalog.pdf")

    captured = {}

    def fake_find_multiple(path, refs):
        captured["refs"] = refs
        return [151, 152]

    monkeypatch.setattr(v, "_find_multiple_reference_pages", fake_find_multiple)

    from django.test import RequestFactory

    rf = RequestFactory()
    request = rf.get(
        "/api/products/catalog-pdf/pages/",
        {"reference": "50.312.050.04-2", "include_compatible": "1"},
    )
    response = v.CatalogPdfPagesView.as_view()(request)

    assert response.data == {"pages": [151, 152]}
    assert captured["refs"] == frozenset({"0050"})


def test_catalog_pages_include_compatible_prefers_0041b_for_tibase(monkeypatch):
    from products import views as v

    monkeypatch.setattr(v, "_catalog_pdf_path", lambda: "catalog.pdf")
    monkeypatch.setattr(
        "products.compatibility.get_compatibility_codes_for_ref",
        lambda ref: ["0041", "0041B"],
    )

    captured = {}

    def fake_find_multiple(path, refs):
        captured["refs"] = refs
        return [137, 138]

    monkeypatch.setattr(v, "_find_multiple_reference_pages", fake_find_multiple)

    from django.test import RequestFactory

    rf = RequestFactory()
    request = rf.get(
        "/api/products/catalog-pdf/pages/",
        {"reference": "31.323.041.02-2", "include_compatible": "1"},
    )
    response = v.CatalogPdfPagesView.as_view()(request)

    assert response.data == {"pages": [137, 138]}
    assert captured["refs"] == frozenset({"0041B"})


def test_find_multiple_reference_pages_matches_compatibility_code_headers(monkeypatch):
    pages = ["unrelated page"] * 153
    pages[9] = "S/RI/RS/RSX        3,25/3,75        3,67       0050            151"
    pages[150] = "COMPATIBLE WITH\n0050\nLIST OF COMPATIBILITIES AVAILABLE"
    pages[151] = "COMPATIBLE WITH 0050\n50.312.050.04-2"
    pages[152] = "COMPATIBLE WITH\n0051\nLIST OF COMPATIBILITIES AVAILABLE"

    def fake_run(*_args, **_kwargs):
        return types.SimpleNamespace(returncode=0, stdout="\f".join(pages))

    monkeypatch.setattr(views.subprocess, "run", fake_run)

    result = views._find_multiple_reference_pages("catalog.pdf", frozenset({"0050"}))

    assert result == [151, 152]
    assert not any(page <= 42 for page in result)


def test_find_multiple_reference_pages_distinguishes_suffixed_codes(monkeypatch):
    pages = ["COMPATIBLE WITH 0041", "COMPATIBLE WITH\n0041B"]

    def fake_run(*_args, **_kwargs):
        return types.SimpleNamespace(returncode=0, stdout="\f".join(pages))

    monkeypatch.setattr(views.subprocess, "run", fake_run)

    assert views._find_multiple_reference_pages("catalog.pdf", frozenset({"0041"})) == [
        1
    ]
    assert views._find_multiple_reference_pages(
        "catalog.pdf", frozenset({"0041B"})
    ) == [2]
