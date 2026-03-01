import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
def test_register_login_and_access_me_flow(api_client):
    register_response = api_client.post(
        reverse("register"),
        {"email": "integration.auth@example.com", "password": "Xk7#mPqZ92"},
        format="json",
    )
    assert register_response.status_code == status.HTTP_201_CREATED
    assert User.objects.filter(email="integration.auth@example.com").exists()

    registered_user = User.objects.get(email="integration.auth@example.com")
    registered_user.is_active = True
    registered_user.save(update_fields=["is_active"])

    login_response = api_client.post(
        reverse("token_obtain_pair"),
        {"email": "integration.auth@example.com", "password": "Xk7#mPqZ92"},
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK
    assert "access" in login_response.data
    assert "refresh" in login_response.data

    access_token = login_response.data["access"]
    me_url = reverse("me")

    unauthorized_client_response = api_client.get(me_url)
    assert unauthorized_client_response.status_code == status.HTTP_401_UNAUTHORIZED

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    me_response = api_client.get(me_url)
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["email"] == "integration.auth@example.com"


@pytest.mark.django_db
def test_refresh_token_returns_new_access_and_authorizes_requests(
    api_client, user_factory
):
    user = user_factory(password="password123")

    login_response = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "password123"},
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK

    refresh_response = api_client.post(
        reverse("token_refresh"),
        {"refresh": login_response.data["refresh"]},
        format="json",
    )
    assert refresh_response.status_code == status.HTTP_200_OK
    assert "access" in refresh_response.data

    api_client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['access']}"
    )
    me_response = api_client.get(reverse("me"))
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.data["email"] == user.email


@pytest.mark.django_db
def test_invalid_refresh_token_fails(api_client):
    response = api_client.post(
        reverse("token_refresh"),
        {"refresh": "invalid-token"},
        format="json",
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
