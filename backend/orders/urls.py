from django.urls import path
from .views import OrderCreateView, OrderDetailView, MyOrdersView

urlpatterns = [
    path("", OrderCreateView.as_view(), name="order_create"),
    path("my/", MyOrdersView.as_view(), name="my_orders"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order_detail"),
]
