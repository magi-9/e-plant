from django.urls import path

from .views import (
    AdminBulkDeleteView,
    AdminBulkSetVisibleView,
    AdminCategoriesView,
    AdminProductIdsView,
    AdminProductImport,
    AdminSeedView,
    ProductCountView,
    ProductGroupListView,
    ProductInquiryView,
    ProductViewSet,
)

urlpatterns = [
    path("groups/", ProductGroupListView.as_view(), name="product_group_list"),
    path("count/", ProductCountView.as_view(), name="product_count"),
    path("inquiry/", ProductInquiryView.as_view(), name="product_inquiry"),
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
    path("admin/seed/", AdminSeedView.as_view(), name="admin_product_seed"),
    path(
        "admin/bulk-delete/",
        AdminBulkDeleteView.as_view(),
        name="admin_product_bulk_delete",
    ),
    path(
        "admin/bulk-set-visible/",
        AdminBulkSetVisibleView.as_view(),
        name="admin_product_bulk_set_visible",
    ),
    path(
        "admin/all-ids/",
        AdminProductIdsView.as_view(),
        name="admin_product_all_ids",
    ),
    path(
        "admin/categories/",
        AdminCategoriesView.as_view(),
        name="admin_product_categories",
    ),
]
