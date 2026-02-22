import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestAdminToggleStaff:
    def test_admin_can_toggle_user_to_staff(self, api_client, user_factory):
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

    def test_admin_can_toggle_staff_to_user(self, api_client, user_factory):
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

    def test_non_admin_cannot_toggle_staff(self, api_client, user_factory):
        """Test that a regular user cannot toggle staff status"""
        user = user_factory(is_staff=False)
        target_user = user_factory(is_staff=False)

        url = reverse("admin_toggle_staff", kwargs={"user_id": target_user.id})
        api_client.force_authenticate(user=user)

        response = api_client.patch(url)

        target_user.refresh_from_db()
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert target_user.is_staff is False

    def test_unauthenticated_cannot_toggle_staff(self, api_client, user_factory):
        """Test that an unauthenticated user cannot toggle staff status"""
        target_user = user_factory(is_staff=False)

        url = reverse("admin_toggle_staff", kwargs={"user_id": target_user.id})

        response = api_client.patch(url)

        target_user.refresh_from_db()
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert target_user.is_staff is False

    def test_admin_cannot_toggle_themselves(self, api_client, user_factory):
        """Test that an admin cannot toggle their own staff status"""
        admin = user_factory(is_staff=True)

        url = reverse("admin_toggle_staff", kwargs={"user_id": admin.id})
        api_client.force_authenticate(user=admin)

        response = api_client.patch(url)

        admin.refresh_from_db()
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "Cannot toggle your own status"
        assert admin.is_staff is True

    def test_admin_toggle_non_existent_user(self, api_client, user_factory):
        """Test that toggling a non-existent user returns 404"""
        admin = user_factory(is_staff=True)

        url = reverse("admin_toggle_staff", kwargs={"user_id": 99999})
        api_client.force_authenticate(user=admin)

        response = api_client.patch(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["error"] == "User not found"
