from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

from .models import Order, ShippingRate
from .serializers import (
    AdminOrderInterventionDeleteSerializer,
    AdminOrderInterventionUpdateSerializer,
    AdminOrderStatusUpdateSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    ShippingRateSerializer,
    StockIssueInputSerializer,
    StockReceiptInputSerializer,
)
from .services.stock_issue_service import StockIssueService
from .services.order_service import OrderService
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
    throttle_scope = "orders.lookup"
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
            variant_reference=data.get("variant_reference", ""),
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


class AdminStockIssueView(APIView):
    """Admin endpoint to record outbound/manual stock decrease."""

    permission_classes = (IsAdminUser,)

    def post(self, request):
        serializer = StockIssueInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        product = get_object_or_404(Product, pk=data["product_id"])
        updated_product = StockIssueService.issue_stock(
            product=product,
            quantity=data["quantity"],
            issued_by=request.user,
            notes=data.get("notes", ""),
            variant_reference=data.get("variant_reference", ""),
        )

        return Response(
            {
                "message": f"Vyskladnených {data['quantity']} ks.",
                "product_id": updated_product.pk,
                "new_stock_quantity": updated_product.stock_quantity,
            },
            status=status.HTTP_200_OK,
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


class AdminOrderInterventionUpdateView(APIView):
    """Admin endpoint to edit order with mandatory intervention reason."""

    permission_classes = (IsAdminUser,)

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = AdminOrderInterventionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = OrderService(user=request.user)
        updated_order = service.admin_update_order(
            order=order,
            validated_data=serializer.validated_data,
            changed_by=request.user,
        )

        return Response(OrderSerializer(updated_order).data, status=status.HTTP_200_OK)


class AdminOrderInterventionDeleteView(APIView):
    """Admin endpoint to delete order with mandatory intervention reason."""

    permission_classes = (IsAdminUser,)

    def delete(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = AdminOrderInterventionDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = OrderService(user=request.user)
        service.admin_delete_order(
            order=order,
            reason=serializer.validated_data["reason"],
            deleted_by=request.user,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
