"""
Tests for Product is_active / is_visible fields and API filtering (Issue #88).
"""

import pytest
from products.models import Product
from products.factories import ProductFactory


@pytest.mark.django_db
class TestProductVisibilityDefaults:
    def test_product_is_active_default_true(self):
        p = Product.objects.create(name="P", category="T", price=1)
        assert p.is_active is True

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
        names = [p["name"] for p in response.json()]
        assert "Visible" in names
        assert "Hidden" not in names

    def test_api_shows_all_to_admin(self):
        from rest_framework.test import APIClient
        from django.contrib.auth import get_user_model

        User = get_user_model()
        admin = User.objects.create_superuser(email="admin@test.com", password="pw")
        api_client = APIClient()
        api_client.force_authenticate(user=admin)
        ProductFactory(name="Visible", is_visible=True)
        ProductFactory(name="Hidden", is_visible=False)
        response = api_client.get("/api/products/")
        assert response.status_code == 200
        names = [p["name"] for p in response.json()]
        assert "Visible" in names
        assert "Hidden" in names

    def test_api_hides_inactive_products_for_anonymous(self, client):
        ProductFactory(name="Active", is_active=True, is_visible=True)
        ProductFactory(name="Inactive", is_active=False, is_visible=True)
        response = client.get("/api/products/")
        names = [p["name"] for p in response.json()]
        assert "Inactive" not in names


@pytest.mark.django_db
class TestProductGroupFilter:
    def test_filter_by_group(self, client):
        from products.models import ProductGroup

        group = ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        ProductFactory(name="In Group", reference="100-001")
        ProductFactory(name="Not In Group", reference="200-001")

        response = client.get(f"/api/products/?group={group.pk}")
        assert response.status_code == 200
        names = [p["name"] for p in response.json()]
        assert "In Group" in names
        assert "Not In Group" not in names
