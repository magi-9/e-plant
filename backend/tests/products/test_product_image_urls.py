import pytest

from products.models import Product


@pytest.mark.django_db
def test_product_image_url_uses_media_prefix_when_file_exists(
    client, settings, tmp_path
):
    settings.MEDIA_ROOT = str(tmp_path)

    image_relative_path = "products/test-image.jpg"
    image_path = tmp_path / image_relative_path
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(b"fake-image-content")

    Product.objects.create(
        name="Image Product",
        reference="100-001",
        category="Test",
        price=1,
        image=image_relative_path,
    )

    response = client.get("/api/products/")
    assert response.status_code == 200
    data = response.json()
    results = data.get("results", data)
    assert len(results) == 1
    assert "/media/products/test-image.jpg" in results[0]["image"]


@pytest.mark.django_db
def test_product_image_url_is_null_when_file_missing(client, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)

    Product.objects.create(
        name="Image Product Missing",
        reference="100-002",
        category="Test",
        price=1,
        image="products/missing-image.jpg",
    )

    response = client.get("/api/products/")
    assert response.status_code == 200
    data = response.json()
    results = data.get("results", data)
    assert len(results) == 1
    assert results[0]["image"] is None
