from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from products.models import Product
from .models import Order, ShippingRate
from .serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    AdminOrderStatusUpdateSerializer,
    ShippingRateSerializer,
    StockReceiptInputSerializer,
)
from .services.stock_receipt_service import StockReceiptService


class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = (permissions.AllowAny,)  # Can be changed to IsAuthenticated

    def perform_create(self, serializer):
        order = serializer.save()
        # Return full order data in response
        return order

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = self.perform_create(serializer)
        # Use OrderSerializer to return full order details including status and order_number
        output_serializer = OrderSerializer(order)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field = "order_number"


class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class AdminOrdersListView(generics.ListAPIView):
    """Admin endpoint to list all orders"""

    serializer_class = OrderSerializer
    permission_classes = (IsAdminUser,)
    queryset = Order.objects.all()


class ShippingRateListView(generics.ListAPIView):
    serializer_class = ShippingRateSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        qs = ShippingRate.objects.all()
        country = self.request.query_params.get("country")
        if country:
            qs = qs.filter(country=country)
        return qs


class AdminStockReceiptView(APIView):
    """Admin endpoint to record incoming stock with batch lot tracking."""

    permission_classes = (IsAdminUser,)

    def post(self, request):
        serializer = StockReceiptInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        product = get_object_or_404(Product, pk=data["product_id"])
        receipt = StockReceiptService.receive_stock(
            product=product,
            batch_number=data["batch_number"],
            quantity=data["quantity"],
            received_by=request.user,
            notes=data.get("notes", ""),
        )
        product.refresh_from_db()
        return Response(
            {
                "message": f"Naskladnených {receipt.quantity} ks šarže {receipt.batch_number}.",
                "product_id": product.pk,
                "new_stock_quantity": product.stock_quantity,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminOrderUpdateView(generics.UpdateAPIView):
    """Admin endpoint to update order status"""

    serializer_class = AdminOrderStatusUpdateSerializer
    permission_classes = (IsAdminUser,)
    queryset = Order.objects.all()
    partial = True  # Allow PATCH requests

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        output_serializer = OrderSerializer(instance=serializer.instance)
        return Response(output_serializer.data)
