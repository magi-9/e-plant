from django.urls import path
from .views import (
    RegisterView, 
    MeView,
    AdminUsersListView,
    AdminUserCreateView,
    AdminUserUpdateView,
    AdminUserDeleteView,
    admin_toggle_staff
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("admin/users/", AdminUsersListView.as_view(), name="admin_users_list"),
    path("admin/users/create/", AdminUserCreateView.as_view(), name="admin_user_create"),
    path("admin/users/<int:pk>/", AdminUserUpdateView.as_view(), name="admin_user_update"),
    path("admin/users/<int:pk>/delete/", AdminUserDeleteView.as_view(), name="admin_user_delete"),
    path("admin/users/<int:user_id>/toggle-staff/", admin_toggle_staff, name="admin_toggle_staff"),
]
