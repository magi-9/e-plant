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
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = get_user_model().objects.get(email="title-test@example.com")
    assert user.title == "MUDr."
