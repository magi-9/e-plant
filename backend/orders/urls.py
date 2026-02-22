from django.urls import path
from .views import (
    OrderCreateView,
    OrderDetailView,
    MyOrdersView,
    AdminOrdersListView,
    AdminOrderUpdateView
)

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order_create"),
    path("my/", MyOrdersView.as_view(), name="my_orders"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order_detail"),
    path("admin/orders/", AdminOrdersListView.as_view(), name="admin_orders_list"),
    path("admin/orders/<int:pk>/", AdminOrderUpdateView.as_view(), name="admin_order_update"),
]
