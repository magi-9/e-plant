from django.urls import path
from .views import (
    ProductList, 
    ProductDetail,
    AdminProductCreate,
    AdminProductUpdate,
    AdminProductDelete,
    AdminProductImport
)

urlpatterns = [
    path("", ProductList.as_view(), name="product_list"),
    path("<int:pk>/", ProductDetail.as_view(), name="product_detail"),
    path("admin/create/", AdminProductCreate.as_view(), name="admin_product_create"),
    path("admin/<int:pk>/", AdminProductUpdate.as_view(), name="admin_product_update"),
    path("admin/<int:pk>/delete/", AdminProductDelete.as_view(), name="admin_product_delete"),
    path("admin/import/", AdminProductImport.as_view(), name="admin_product_import"),
]
