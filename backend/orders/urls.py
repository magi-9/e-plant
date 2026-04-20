from django.urls import path

from .views import (
    AdminOrderInterventionDeleteView,
    AdminOrderInterventionUpdateView,
    AdminOrdersListView,
    AdminStockIssueView,
    AdminOrderUpdateView,
    AdminStockReceiptView,
    MyOrdersView,
    OrderCreateView,
    OrderDetailView,
)

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order_create"),
    path("my/", MyOrdersView.as_view(), name="my_orders"),
    path("admin/orders/", AdminOrdersListView.as_view(), name="admin_orders_list"),
    path(
        "admin/orders/<int:pk>/",
        AdminOrderUpdateView.as_view(),
        name="admin_order_update",
    ),
    path(
        "admin/orders/<int:pk>/intervention/",
        AdminOrderInterventionUpdateView.as_view(),
        name="admin_order_intervention_update",
    ),
    path(
        "admin/orders/<int:pk>/intervention-delete/",
        AdminOrderInterventionDeleteView.as_view(),
        name="admin_order_intervention_delete",
    ),
    path(
        "admin/stock-receipts/",
        AdminStockReceiptView.as_view(),
        name="admin_stock_receipt",
    ),
    path(
        "admin/stock-issues/",
        AdminStockIssueView.as_view(),
        name="admin_stock_issue",
    ),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order_detail"),
]
