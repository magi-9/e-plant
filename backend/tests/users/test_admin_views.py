from decimal import Decimal

import pytest
from django.utils import timezone
from django.urls import reverse
from rest_framework import status

from orders.models import Order


@pytest.mark.django_db
def test_admin_can_toggle_user_to_staff(api_client, user_factory):
    """Test that an admin can promote a user to staff status"""
    admin = user_factory(is_staff=True)
    target_user = user_factory(is_staff=False)

    url = reverse("admin_toggle_staff", kwargs={"user_id": target_user.id})
    api_client.force_authenticate(user=admin)

    response = api_client.patch(url)

    target_user.refresh_from_db()
    assert response.status_code == status.HTTP_200_OK
    assert target_user.is_staff is True
    assert response.data["is_staff"] is True


@pytest.mark.django_db
def test_admin_can_toggle_staff_to_user(api_client, user_factory):
    """Test that an admin can demote a staff member to regular user"""
    admin = user_factory(is_staff=True)
    target_user = user_factory(is_staff=True)

    url = reverse("admin_toggle_staff", kwargs={"user_id": target_user.id})
    api_client.force_authenticate(user=admin)

    response = api_client.patch(url)

    target_user.refresh_from_db()
    assert response.status_code == status.HTTP_200_OK
    assert target_user.is_staff is False
    assert response.data["is_staff"] is False


@pytest.mark.django_db
def test_non_admin_cannot_toggle_staff(api_client, user_factory):
    """Test that a regular user cannot toggle staff status"""
    user = user_factory(is_staff=False)
    target_user = user_factory(is_staff=False)

    url = reverse("admin_toggle_staff", kwargs={"user_id": target_user.id})
    api_client.force_authenticate(user=user)

    response = api_client.patch(url)

    target_user.refresh_from_db()
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert target_user.is_staff is False


@pytest.mark.django_db
def test_unauthenticated_cannot_toggle_staff(api_client, user_factory):
    """Test that an unauthenticated user cannot toggle staff status"""
    target_user = user_factory(is_staff=False)

    url = reverse("admin_toggle_staff", kwargs={"user_id": target_user.id})

    response = api_client.patch(url)

    target_user.refresh_from_db()
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert target_user.is_staff is False


@pytest.mark.django_db
def test_admin_cannot_toggle_themselves(api_client, user_factory):
    """Test that an admin cannot toggle their own staff status"""
    admin = user_factory(is_staff=True)

    url = reverse("admin_toggle_staff", kwargs={"user_id": admin.id})
    api_client.force_authenticate(user=admin)

    response = api_client.patch(url)

    admin.refresh_from_db()
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["error"] == "Cannot toggle your own status"
    assert admin.is_staff is True


@pytest.mark.django_db
def test_admin_toggle_non_existent_user(api_client, user_factory):
    """Test that toggling a non-existent user returns 404"""
    admin = user_factory(is_staff=True)

    url = reverse("admin_toggle_staff", kwargs={"user_id": 99999})
    api_client.force_authenticate(user=admin)

    response = api_client.patch(url)

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.data["error"] == "User not found"


@pytest.mark.django_db
def test_admin_can_create_client(api_client, user_factory):
    admin = user_factory(is_staff=True)
    url = reverse("admin_user_create")
    api_client.force_authenticate(user=admin)

    response = api_client.post(
        url,
        {
            "email": "client@example.com",
            "password": "StrongPass123!",
            "first_name": "Jan",
            "last_name": "Novak",
            "is_staff": False,
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.get(email="client@example.com")
    assert user.is_staff is False
    assert user.is_active is True


@pytest.mark.django_db
def test_admin_can_create_admin_user(api_client, user_factory):
    admin = user_factory(is_staff=True)
    url = reverse("admin_user_create")
    api_client.force_authenticate(user=admin)

    response = api_client.post(
        url,
        {
            "email": "newadmin@example.com",
            "password": "StrongPass123!",
            "first_name": "Eva",
            "last_name": "Admin",
            "is_staff": True,
            "is_active": True,
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.get(email="newadmin@example.com")
    assert user.is_staff is True
    assert user.is_active is True


@pytest.mark.django_db
def test_admin_can_set_customer_discount_for_current_year(api_client, user_factory):
    admin = user_factory(is_staff=True)
    customer = user_factory(is_staff=False, annual_discount_year=2024)
    api_client.force_authenticate(user=admin)

    response = api_client.patch(
        reverse("admin_user_update", kwargs={"pk": customer.id}),
        {"annual_discount_percent": "7.50"},
        format="json",
    )

    customer.refresh_from_db()
    assert response.status_code == status.HTTP_200_OK
    assert customer.annual_discount_percent == Decimal("7.50")
    assert customer.annual_discount_year == timezone.localdate().year


@pytest.mark.django_db
def test_admin_users_list_includes_customer_turnover(api_client, user_factory):
    admin = user_factory(is_staff=True)
    customer = user_factory(is_staff=False)
    Order.objects.create(
        user=customer,
        order_number="TURNOVER-1",
        customer_name="Turnover Customer",
        email=customer.email,
        phone="+421900123456",
        total_price=Decimal("120.50"),
        payment_method="bank_transfer",
        status="paid",
    )
    Order.objects.create(
        user=customer,
        order_number="TURNOVER-2",
        customer_name="Unpaid Customer",
        email=customer.email,
        phone="+421900123456",
        total_price=Decimal("20.00"),
        payment_method="bank_transfer",
        status="awaiting_payment",
    )
    api_client.force_authenticate(user=admin)

    response = api_client.get(reverse("admin_users_list"))

    assert response.status_code == status.HTTP_200_OK
    users = response.data.get("results", response.data)
    payload = next(item for item in users if item["id"] == customer.id)
    assert payload["turnover_last_12_months"] == 120.5
    assert len(payload["turnover_monthly"]) == 12
