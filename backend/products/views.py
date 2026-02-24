import csv
from io import StringIO
from decimal import Decimal, InvalidOperation
from django.db import transaction
from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
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

            # Check for large files
            if len(rows) > 10000:
                return Response(
                    {"error": "File too large. Maximum 10,000 rows allowed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not rows:
                return Response(
                    {"message": "Successfully processed 0 products."},
                    status=status.HTTP_200_OK,
                )

            # Check for duplicate names in CSV
            seen_names = set()
            duplicates = set()
            for row in rows:
                name = row.get("name")
                if name:
                    if name in seen_names:
                        duplicates.add(name)
                    seen_names.add(name)

            if duplicates:
                return Response(
                    {
                        "error": "Duplicate product names found in CSV.",
                        "duplicates": sorted(list(duplicates)),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            product_names = set(row.get("name") for row in rows if row.get("name"))

            # Fetch existing products
            # Using filter instead of in_bulk(field_name='name') to handle potential non-unique names safely
            existing_products_qs = Product.objects.filter(name__in=product_names)

            # Check for duplicates in database
            existing_products_map = {}
            db_duplicates = set()
            for p in existing_products_qs:
                if p.name in existing_products_map:
                    db_duplicates.add(p.name)
                existing_products_map[p.name] = p

            if db_duplicates:
                return Response(
                    {
                        "error": "Multiple products with the same name found in the database.",
                        "duplicate_names": sorted(list(db_duplicates)),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            products_to_create = {}  # name -> Product instance
            products_to_update = {}  # pk -> Product instance

            for row in rows:
                name = row.get("name")
                if not name:
                    continue

                # Validate name length
                if len(name) > 255:
                    raise ValidationError(
                        f"Product name too long (max 255 characters): {name[:50]}..."
                    )

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
                    product.low_stock_alert_sent = False  # Explicit initialization
                    products_to_create[name] = product

                # Update fields with type conversion
                if "description" in row:
                    product.description = row["description"]

                if "category" in row:
                    product.category = row["category"]

                price_value = row.get("price")
                if price_value is not None and str(price_value).strip():
                    try:
                        product.price = Decimal(price_value)
                    except (ValueError, InvalidOperation):
                        raise ValidationError(
                            f"Invalid price for product {name}: {price_value}"
                        )

                stock_value = row.get("stock_quantity")
                if stock_value is not None and str(stock_value).strip():
                    try:
                        product.stock_quantity = int(stock_value)
                    except (ValueError, TypeError):
                        raise ValidationError(
                            f"Invalid stock_quantity for product {name}: {stock_value}"
                        )

                threshold_value = row.get("low_stock_threshold")
                if threshold_value is not None and str(threshold_value).strip():
                    try:
                        product.low_stock_threshold = int(threshold_value)
                    except (ValueError, TypeError):
                        raise ValidationError(
                            f"Invalid low_stock_threshold for product {name}: {threshold_value}"
                        )

                # Custom logic for alert reset
                if (
                    product.stock_quantity > product.low_stock_threshold
                    and product.low_stock_alert_sent
                ):
                    product.low_stock_alert_sent = False

                if not is_new:
                    products_to_update[product.pk] = product

            # Count unique products actually being created or updated
            processed_count = len(products_to_create) + len(products_to_update)

            # Perform bulk operations inside a transaction
            with transaction.atomic():
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
                    Product.objects.bulk_update(
                        products_to_update.values(), fields_to_update
                    )

            return Response(
                {"message": f"Successfully processed {processed_count} products."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # Re-raise ValidationErrors so DRF handles them properly (400 Bad Request)
            if isinstance(e, ValidationError):
                raise e
            return Response(
                {"error": f"Error processing file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
