import pytest
from products.models import Product


@pytest.mark.django_db
def test_product_image_url_uses_media_prefix(client):
    Product.objects.create(
        name="Image Product",
        reference="100-001",
        category="Test",
        price=1,
        image="products/test-image.jpg",
    )

    response = client.get("/api/products/")
    assert response.status_code == 200
    data = response.json()
    results = data.get("results", data)
    assert len(results) == 1
    assert "/media/products/test-image.jpg" in results[0]["image"]
