import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from orders.models import Order
from orders.serializers import OrderCreateSerializer


@pytest.mark.django_db
def test_order_detail_idor_fix(api_client, user_factory, product_factory):
    """Test that order detail endpoint uses order_number and not integer pk"""
    user = user_factory()
    product = product_factory(price=Decimal("100.00"), stock_quantity=10)

    api_client.force_authenticate(user=user)

    order_data = {
        "customer_name": "John Doe",
        "email": "john@example.com",
        "phone": "+421900123456",
        "street": "Test Street 123",
        "city": "Bratislava",
        "postal_code": "811 01",
        "is_company": False,
        "payment_method": "bank_transfer",
        "items": [
            {"product_id": product.id, "quantity": 2},
        ],
    }

    create_url = reverse("order_create")
    response = api_client.post(create_url, order_data, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    order_number = response.data["order_number"]

    # Should be accessible via order_number
    detail_url = reverse("order_detail", kwargs={"order_number": order_number})
    detail_response = api_client.get(detail_url)
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.data["order_number"] == order_number

    # Try accessing with ID (should fail)
    order_id = response.data["id"]
    id_detail_url = detail_url.replace(order_number, str(order_id))
    id_response = api_client.get(id_detail_url)
    assert id_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_admin_orders_list(api_client, user_factory, product_factory):
    """Test that admin can list all orders"""
    admin_user = user_factory(is_staff=True, is_superuser=True)
    normal_user = user_factory()

    url = reverse("admin_orders_list")

    # Try with normal user
    api_client.force_authenticate(user=normal_user)
    response = api_client.get(url)
    assert response.status_code == status.HTTP_403_FORBIDDEN

    # Try with admin user
    api_client.force_authenticate(user=admin_user)
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
