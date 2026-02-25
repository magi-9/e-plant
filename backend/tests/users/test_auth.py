from django.urls import reverse
from rest_framework import status
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@pytest.mark.django_db
def test_use_registration(api_client):
    url = reverse("register")
    data = {
        "email": "newuser@example.com",
        "password": "password123",
    }
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.count() == 1
    assert User.objects.get().email == "newuser@example.com"


@pytest.mark.django_db
def test_user_login(api_client, user_factory):
    user = user_factory(password="password123", is_staff=True, is_superuser=False)
    url = reverse("token_obtain_pair")
    data = {"email": user.email, "password": "password123"}
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data

    # Verify custom claims in the access token
    access_token = response.data["access"]
    token = AccessToken(access_token)

    assert token["email"] == user.email
    assert token["is_staff"] == user.is_staff
    assert token["is_superuser"] == user.is_superuser


@pytest.mark.django_db
def test_access_protected_route(api_client, user_factory):
    user = user_factory()
    url = reverse("me")

    # Unauthenticated
    response = api_client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # Authenticated
    api_client.force_authenticate(user=user)
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["email"] == user.email
