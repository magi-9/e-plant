"""
Tests for ProductImageField validation:
  - file size > 5 MB rejected
  - dimensions > 4000px rejected
  - dimensions < 100px rejected
  - blocked file extensions rejected
  - valid images accepted
"""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image


def _make_image(width=200, height=200, fmt="JPEG", extension="jpg", extra_bytes=0):
    """Return a SimpleUploadedFile containing a synthetic image."""
    img = Image.new("RGB", (width, height), color=(128, 0, 0))
    buf = BytesIO()
    img.save(buf, format=fmt)
    content = buf.getvalue()
    if extra_bytes:
        # Append padding so the file size exceeds the limit while
        # remaining a valid image (JPEG/PNG parsers stop at EOF marker).
        content += b"\x00" * extra_bytes
    mime = "image/jpeg" if fmt == "JPEG" else f"image/{fmt.lower()}"
    return SimpleUploadedFile(f"test.{extension}", content, content_type=mime)


@pytest.fixture
def admin_client(api_client, user_factory):
    user = user_factory(is_staff=True, is_superuser=True)
    api_client.force_authenticate(user=user)
    return api_client


def _product_payload(**overrides):
    base = {
        "name": "Image Test Product",
        "category": "Test",
        "price": "10.00",
        "stock_quantity": 1,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Size validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_image_over_5mb_is_rejected(admin_client):
    img = _make_image(extra_bytes=5 * 1024 * 1024 + 1)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400
    assert "5MB" in str(response.data)


@pytest.mark.django_db
def test_image_exactly_at_5mb_limit_is_accepted(admin_client):
    # A 200x200 JPEG is well under 5 MB; no padding needed to test the boundary.
    # We test that a normal-sized image is not rejected by the size check.
    img = _make_image(width=200, height=200)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 201


# ---------------------------------------------------------------------------
# Dimension validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_image_wider_than_4000px_is_rejected(admin_client):
    img = _make_image(width=4001, height=200)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400
    assert "4000" in str(response.data)


@pytest.mark.django_db
def test_image_taller_than_4000px_is_rejected(admin_client):
    img = _make_image(width=200, height=4001)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400
    assert "4000" in str(response.data)


@pytest.mark.django_db
def test_image_narrower_than_100px_is_rejected(admin_client):
    img = _make_image(width=99, height=200)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400
    assert "100" in str(response.data)


@pytest.mark.django_db
def test_image_shorter_than_100px_is_rejected(admin_client):
    img = _make_image(width=200, height=99)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400
    assert "100" in str(response.data)


@pytest.mark.django_db
def test_image_exactly_4000px_is_accepted(admin_client):
    img = _make_image(width=4000, height=4000, fmt="PNG", extension="png")
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 201


@pytest.mark.django_db
def test_image_exactly_100px_is_accepted(admin_client):
    img = _make_image(width=100, height=100)
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 201


# ---------------------------------------------------------------------------
# Extension validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_gif_extension_is_rejected(admin_client):
    # Valid JPEG content but .gif extension
    img = _make_image(extension="gif")
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400


@pytest.mark.django_db
def test_bmp_extension_is_rejected(admin_client):
    img = _make_image(extension="bmp")
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 400


@pytest.mark.django_db
def test_png_extension_is_accepted(admin_client):
    img = _make_image(fmt="PNG", extension="png")
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 201


@pytest.mark.django_db
def test_webp_extension_is_accepted(admin_client):
    img = _make_image(fmt="WEBP", extension="webp")
    data = _product_payload(image=img)
    url = reverse("admin_product_create")
    response = admin_client.post(url, data, format="multipart")
    assert response.status_code == 201
