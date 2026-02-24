from django.urls import reverse
from rest_framework import status
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_use_registration(api_client):
    url = reverse("register")
    data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123",
    }
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.count() == 1
    assert User.objects.get().username == "newuser"


@pytest.mark.django_db
def test_user_login(api_client, user_factory):
    user = user_factory(password="password123")
    url = reverse("token_obtain_pair")
    data = {"username": user.username, "password": "password123"}
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data


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
    assert response.data["username"] == user.username
