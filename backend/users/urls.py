from django.urls import path
from .views import (
    RegisterView,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    MeView,
    AdminUsersListView,
    AdminUserCreateView,
    AdminUserUpdateView,
    AdminUserDeleteView,
    GlobalSettingsView,
    admin_toggle_staff,
)

urlpatterns = [
    path("settings/", GlobalSettingsView.as_view(), name="global_settings"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path(
        "resend-verification/",
        ResendVerificationView.as_view(),
        name="resend_verification",
    ),
    path(
        "password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="password_reset_request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("me/", MeView.as_view(), name="me"),
    path("admin/users/", AdminUsersListView.as_view(), name="admin_users_list"),
    path(
        "admin/users/create/", AdminUserCreateView.as_view(), name="admin_user_create"
    ),
    path(
        "admin/users/<int:pk>/", AdminUserUpdateView.as_view(), name="admin_user_update"
    ),
    path(
        "admin/users/<int:pk>/delete/",
        AdminUserDeleteView.as_view(),
        name="admin_user_delete",
    ),
    path(
        "admin/users/<int:user_id>/toggle-staff/",
        admin_toggle_staff,
        name="admin_toggle_staff",
    ),
]
