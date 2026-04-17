"""
Tests for Product is_visible field and API filtering (Issue #88).
"""

import pytest

from products.factories import ProductFactory
from products.models import Product


@pytest.mark.django_db
class TestProductVisibilityDefaults:
    def test_product_is_visible_default_true(self):
        p = Product.objects.create(name="P", category="T", price=1)
        assert p.is_visible is True


@pytest.mark.django_db
class TestProductStorefrontVisibilityFilter:
    def test_api_hides_invisible_products(self, client):
        ProductFactory(name="Visible", is_visible=True)
        ProductFactory(name="Hidden", is_visible=False)
        response = client.get("/api/products/")
        assert response.status_code == 200
        data = response.json()
        names = [p["name"] for p in data.get("results", data)]
        assert "Visible" in names
        assert "Hidden" not in names

    def test_api_hides_invisible_products_for_admin_without_admin_view(self):
        """Admin using the shop endpoint (no admin_view=1) sees only visible products."""
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        User = get_user_model()
        admin = User.objects.create_superuser(email="admin@test.com", password="pw")
        api_client = APIClient()
        api_client.force_authenticate(user=admin)
        ProductFactory(name="Visible", is_visible=True)
        ProductFactory(name="Hidden", is_visible=False)
        response = api_client.get("/api/products/")
        assert response.status_code == 200
        data = response.json()
        names = [p["name"] for p in data.get("results", data)]
        assert "Visible" in names
        assert "Hidden" not in names

    def test_api_shows_all_to_admin_with_admin_view(self):
        """Admin using admin_view=1 sees all products including hidden."""
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        User = get_user_model()
        admin = User.objects.create_superuser(email="admin2@test.com", password="pw")
        api_client = APIClient()
        api_client.force_authenticate(user=admin)
        ProductFactory(name="Visible", is_visible=True)
        ProductFactory(name="Hidden", is_visible=False)
        response = api_client.get("/api/products/?admin_view=1")
        assert response.status_code == 200
        data = response.json()
        names = [p["name"] for p in data.get("results", data)]
        assert "Visible" in names
        assert "Hidden" in names

    def test_api_admin_view_requires_staff(self, client):
        """Non-staff cannot use admin_view=1 to bypass visibility filter."""
        ProductFactory(name="Visible", is_visible=True)
        ProductFactory(name="Hidden", is_visible=False)
        response = client.get("/api/products/?admin_view=1")
        assert response.status_code == 200
        data = response.json()
        names = [p["name"] for p in data.get("results", data)]
        assert "Hidden" not in names


@pytest.mark.django_db
class TestProductGroupFilter:
    def test_filter_by_group(self, client):
        from products.models import ProductGroup

        group = ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        ProductFactory(name="In Group", reference="100-001")
        ProductFactory(name="Not In Group", reference="200-001")

        response = client.get(f"/api/products/?group={group.pk}")
        assert response.status_code == 200
        data = response.json()
        names = [p["name"] for p in data.get("results", data)]
        assert "In Group" in names
        assert "Not In Group" not in names


@pytest.mark.django_db
class TestProductCountEndpoint:
    def test_count_returns_visible_only_for_anonymous(self, client):
        ProductFactory(name="Visible", is_visible=True)
        ProductFactory(name="Hidden", is_visible=False)

        response = client.get("/api/products/count/")
        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_count_filters_by_multiple_categories_with_union(self, client):
        ProductFactory(
            name="A only",
            category="Fallback",
            parameters={"all_categories": "Category A"},
            is_visible=True,
        )
        ProductFactory(
            name="B only",
            category="Fallback",
            parameters={"all_categories": "Category B"},
            is_visible=True,
        )
        ProductFactory(
            name="A and B",
            category="Fallback",
            parameters={"all_categories": "Category A; Category B"},
            is_visible=True,
        )
        ProductFactory(
            name="Other",
            category="Fallback",
            parameters={"all_categories": "Category C"},
            is_visible=True,
        )

        response = client.get(
            "/api/products/count/",
            {"categories": ["Category A", "Category B"]},
        )
        assert response.status_code == 200
        assert response.json()["count"] == 3
