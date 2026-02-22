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


class AdminProductCreate(generics.CreateAPIView):
    """Admin endpoint to create a product"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.IsAdminUser,)


class AdminProductUpdate(generics.UpdateAPIView):
    """Admin endpoint to update product"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.IsAdminUser,)


class AdminProductDelete(generics.DestroyAPIView):
    """Admin endpoint to delete product"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.IsAdminUser,)


import csv
from io import StringIO
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

class AdminProductImport(APIView):
    """Admin endpoint to import products from CSV"""
    permission_classes = (permissions.IsAdminUser,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file_obj.name.endswith('.csv'):
            return Response({"error": "File must be a CSV"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            csv_file = file_obj.read().decode('utf-8-sig')
            reader = csv.DictReader(StringIO(csv_file))
            
            created_count = 0
            for row in reader:
                name = row.get('name')
                if not name:
                    continue
                
                # Create or update based on name
                product, created = Product.objects.get_or_create(
                    name=name,
                    defaults={
                        'description': row.get('description', ''),
                        'category': row.get('category', 'Uncategorized'),
                        'price': row.get('price', 0.00),
                        'stock_quantity': row.get('stock_quantity', 0),
                        'low_stock_threshold': row.get('low_stock_threshold', 5)
                    }
                )
                
                if not created:
                    # Update existing product
                    if 'price' in row: product.price = row['price']
                    if 'stock_quantity' in row: product.stock_quantity = row['stock_quantity']
                    if 'category' in row: product.category = row['category']
                    if 'description' in row: product.description = row['description']
                    if 'low_stock_threshold' in row: product.low_stock_threshold = row['low_stock_threshold']
                    product.save()
                    
                created_count += 1
                
            return Response({"message": f"Successfully processed {created_count} products."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"Error processing file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
