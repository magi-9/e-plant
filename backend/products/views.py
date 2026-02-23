import csv
from io import StringIO
from decimal import Decimal, InvalidOperation
from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Product
from .serializers import ProductSerializer


class ProductList(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ["name", "price", "category", "stock_quantity"]
    search_fields = ["name", "description", "category"]


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


class AdminProductImport(APIView):
    """Admin endpoint to import products from CSV"""

    permission_classes = (permissions.IsAdminUser,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not file_obj.name.endswith(".csv"):
            return Response(
                {"error": "File must be a CSV"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            csv_file = file_obj.read().decode("utf-8-sig")
            reader = csv.DictReader(StringIO(csv_file))

            # Read all rows first
            rows = list(reader)
            if not rows:
                return Response(
                    {"message": "Successfully processed 0 products."},
                    status=status.HTTP_200_OK,
                )

            product_names = set(row.get("name") for row in rows if row.get("name"))

            # Fetch existing products
            # Using filter instead of in_bulk(field_name='name') to handle potential non-unique names safely
            existing_products_qs = Product.objects.filter(name__in=product_names)
            existing_products_map = {p.name: p for p in existing_products_qs}

            products_to_create = {}  # name -> Product instance
            products_to_update = {}  # pk -> Product instance

            processed_count = 0

            for row in rows:
                name = row.get("name")
                if not name:
                    continue

                product = None
                is_new = False

                # Check if we've already seen this product in this batch (created or updated)
                if name in products_to_create:
                    product = products_to_create[name]
                    is_new = True
                elif name in existing_products_map:
                    product = existing_products_map[name]
                    is_new = False
                else:
                    # New product
                    is_new = True
                    product = Product(name=name)
                    # Set defaults
                    product.description = ""
                    product.category = "Uncategorized"
                    product.price = Decimal("0.00")
                    product.stock_quantity = 0
                    product.low_stock_threshold = 5
                    products_to_create[name] = product

                # Update fields with type conversion
                if "description" in row:
                    product.description = row["description"]

                if "category" in row:
                    product.category = row["category"]

                if "price" in row:
                    try:
                        product.price = Decimal(row["price"])
                    except (ValueError, InvalidOperation):
                        raise ValueError(f"Invalid price for product {name}: {row['price']}")

                if "stock_quantity" in row:
                    try:
                        product.stock_quantity = int(row["stock_quantity"])
                    except (ValueError, TypeError):
                        raise ValueError(f"Invalid stock_quantity for product {name}: {row['stock_quantity']}")

                if "low_stock_threshold" in row:
                    try:
                        product.low_stock_threshold = int(row["low_stock_threshold"])
                    except (ValueError, TypeError):
                        raise ValueError(f"Invalid low_stock_threshold for product {name}: {row['low_stock_threshold']}")

                # Custom logic for alert reset
                if (
                    product.stock_quantity > product.low_stock_threshold
                    and product.low_stock_alert_sent
                ):
                    product.low_stock_alert_sent = False

                if not is_new:
                    products_to_update[product.pk] = product

                processed_count += 1

            # Perform bulk operations
            if products_to_create:
                Product.objects.bulk_create(products_to_create.values())

            if products_to_update:
                fields_to_update = [
                    "description",
                    "category",
                    "price",
                    "stock_quantity",
                    "low_stock_threshold",
                    "low_stock_alert_sent",
                ]
                Product.objects.bulk_update(products_to_update.values(), fields_to_update)

            return Response(
                {"message": f"Successfully processed {processed_count} products."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"Error processing file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
