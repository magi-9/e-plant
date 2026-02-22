from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from .models import Order
from .serializers import OrderCreateSerializer, OrderSerializer


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


class AdminOrderUpdateView(generics.UpdateAPIView):
    """Admin endpoint to update order status"""

    serializer_class = OrderSerializer
    permission_classes = (IsAdminUser,)
    queryset = Order.objects.all()
    partial = True  # Allow PATCH requests
