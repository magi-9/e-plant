import pytest
from rest_framework import status
from rest_framework.test import APIClient

from products.models import (
    GroupingSettings,
    Product,
    WildcardGroup,
)
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
def test_sync_skips_single_product_groups():
    make_product(name="Solo G1", price="20.00", category="X")

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
