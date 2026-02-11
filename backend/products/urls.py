from django.urls import path
from .views import (
    ProductList, 
    ProductDetail,
    AdminProductUpdate,
    AdminProductDelete
)

urlpatterns = [
    path("", ProductList.as_view(), name="product_list"),
    path("<int:pk>/", ProductDetail.as_view(), name="product_detail"),
    path("admin/<int:pk>/", AdminProductUpdate.as_view(), name="admin_product_update"),
    path("admin/<int:pk>/delete/", AdminProductDelete.as_view(), name="admin_product_delete"),
]
