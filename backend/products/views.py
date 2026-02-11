from rest_framework import generics, permissions, filters
from .models import Product
from .serializers import ProductSerializer


class ProductList(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['name', 'price', 'category', 'stock_quantity']
    search_fields = ['name', 'description', 'category']


class ProductDetail(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
