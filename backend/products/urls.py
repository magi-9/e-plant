from django.urls import path
from .views import (
    ProductViewSet,
    ProductGroupListView,
    AdminProductImport,
)

urlpatterns = [
    path("groups/", ProductGroupListView.as_view(), name="product_group_list"),
    path("", ProductViewSet.as_view({"get": "list"}), name="product_list"),
    path(
        "<int:pk>/", ProductViewSet.as_view({"get": "retrieve"}), name="product_detail"
    ),
    path(
        "admin/create/",
        ProductViewSet.as_view({"post": "create"}),
        name="admin_product_create",
    ),
    path(
        "admin/<int:pk>/",
        ProductViewSet.as_view({"put": "update", "patch": "partial_update"}),
        name="admin_product_update",
    ),
    path(
        "admin/<int:pk>/delete/",
        ProductViewSet.as_view({"delete": "destroy"}),
        name="admin_product_delete",
    ),
    path("admin/import/", AdminProductImport.as_view(), name="admin_product_import"),
]
