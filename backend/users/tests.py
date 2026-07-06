import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_register_persists_title_field():
    client = APIClient()

    response = client.post(
        "/api/auth/register/",
        {
            "email": "title-test@example.com",
            "password": "SafePass123!",
            "title": "MUDr.",
            "first_name": "Jana",
            "last_name": "Novakova",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = get_user_model().objects.get(email="title-test@example.com")
    assert user.title == "MUDr."
    assert user.first_name == "Jana"
    assert user.last_name == "Novakova"


@pytest.mark.django_db
def test_register_requires_first_name():
    client = APIClient()

    response = client.post(
        "/api/auth/register/",
        {
            "email": "missing-first-name@example.com",
            "password": "SafePass123!",
            "last_name": "Novak",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "first_name" in response.data


@pytest.mark.django_db
def test_register_requires_last_name():
    client = APIClient()

    response = client.post(
        "/api/auth/register/",
        {
            "email": "missing-last-name@example.com",
            "password": "SafePass123!",
            "first_name": "Jan",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "last_name" in response.data


@pytest.mark.django_db
def test_admin_can_set_user_password():
    User = get_user_model()
    admin = User.objects.create_superuser(
        email="admin@example.com", password="AdminPass123!"
    )
    user = User.objects.create_user(
        email="client@example.com",
        password="OldPass123!",
        first_name="Client",
        last_name="User",
    )
    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.post(
        f"/api/auth/admin/users/{user.id}/set-password/",
        {"new_password": "NewSafePass123!"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.check_password("NewSafePass123!")


@pytest.mark.django_db
def test_non_admin_cannot_set_user_password():
    User = get_user_model()
    user = User.objects.create_user(
        email="client@example.com",
        password="OldPass123!",
        first_name="Client",
        last_name="User",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        f"/api/auth/admin/users/{user.id}/set-password/",
        {"new_password": "NewSafePass123!"},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    user.refresh_from_db()
    assert user.check_password("OldPass123!")
