"""
Tests for ProductGroup model and auto-assignment logic (Issue #87).
"""
import pytest
from django.db import IntegrityError
from products.models import Product, ProductGroup


@pytest.mark.django_db
class TestProductGroupModel:
    def test_create_product_group(self):
        group = ProductGroup.objects.create(name="CAD-CAM", prefix="100", description="CAD-CAM products")
        assert group.name == "CAD-CAM"
        assert group.prefix == "100"
        assert group.description == "CAD-CAM products"

    def test_prefix_unique(self):
        ProductGroup.objects.create(name="Group A", prefix="100")
        with pytest.raises(IntegrityError):
            ProductGroup.objects.create(name="Group B", prefix="100")

    def test_str_representation(self):
        group = ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        assert str(group) == "CAD-CAM (100)"


@pytest.mark.django_db
class TestProductGroupAutoAssign:
    def test_product_assigned_to_group_by_prefix(self):
        group = ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        product = Product.objects.create(
            name="Test Product",
            reference="100-001",
            category="Test",
            price=10.00,
        )
        product.refresh_from_db()
        assert product.group == group

    def test_product_no_matching_prefix_stays_ungrouped(self):
        ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        product = Product.objects.create(
            name="Other Product",
            reference="200-001",
            category="Test",
            price=10.00,
        )
        product.refresh_from_db()
        assert product.group is None

    def test_empty_reference_stays_ungrouped(self):
        ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        product = Product.objects.create(
            name="No Ref Product",
            reference="",
            category="Test",
            price=10.00,
        )
        product.refresh_from_db()
        assert product.group is None

    def test_longest_prefix_wins(self):
        """When two prefixes match, the longer one takes priority."""
        short = ProductGroup.objects.create(name="Short", prefix="10")
        ProductGroup.objects.create(name="Long", prefix="100")
        product = Product.objects.create(
            name="Product",
            reference="100-001",
            category="Test",
            price=10.00,
        )
        product.refresh_from_db()
        assert product.group != short
        assert product.group.prefix == "100"

    def test_group_reassigned_when_reference_changes(self):
        group_a = ProductGroup.objects.create(name="Group A", prefix="100")
        group_b = ProductGroup.objects.create(name="Group B", prefix="200")
        product = Product.objects.create(
            name="Product",
            reference="100-001",
            category="Test",
            price=10.00,
        )
        assert product.group == group_a

        product.reference = "200-005"
        product.save()
        product.refresh_from_db()
        assert product.group == group_b

    def test_multiple_products_assigned_to_same_group(self):
        group = ProductGroup.objects.create(name="Group", prefix="100")
        p1 = Product.objects.create(name="P1", reference="100-001", category="T", price=1)
        p2 = Product.objects.create(name="P2", reference="100-002", category="T", price=1)
        assert p1.group == group
        assert p2.group == group


@pytest.mark.django_db
class TestProductGroupAPI:
    def test_groups_list_endpoint(self, client):
        ProductGroup.objects.create(name="CAD-CAM", prefix="100")
        ProductGroup.objects.create(name="Multi Unit", prefix="200")
        response = client.get("/api/products/groups/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        prefixes = {g["prefix"] for g in data}
        assert prefixes == {"100", "200"}
