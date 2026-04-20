import csv
import re
from copy import copy
from decimal import Decimal, InvalidOperation
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import models, transaction
from django.db.models import Count
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from services.email import ProductInquiryEmailService

from .grouping import normalized_storefront_name, storefront_group_key
from .models import GroupingSettings, Product, ProductGroup, WildcardGroup
from .serializers import (
    GroupingSettingsSerializer,
    ProductGroupSerializer,
    ProductSerializer,
    WildcardGroupSerializer,
)
from .services import ProductService
from .services.wildcard_sync import sync_wildcard_groups


def _parse_categories(request):
    # Handle both 'categories' and 'categories[]' (for array serialization compatibility)
    raw_values = request.query_params.getlist("categories")
    raw_values += request.query_params.getlist("categories[]")
    categories = []
    for raw in raw_values:
        if not raw:
            continue
        for value in raw.split(","):
            item = value.strip()
            if item and item not in categories:
                categories.append(item)
    return categories


def _apply_product_filters(queryset, request):
    qs = queryset

    group_id = request.query_params.get("group")
    if group_id:
        try:
            qs = qs.filter(group_id=int(group_id))
        except (ValueError, TypeError):
            raise ValidationError({"group": "Must be a valid integer ID."})

    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(
            models.Q(name__icontains=search)
            | models.Q(description__icontains=search)
            | models.Q(category__icontains=search)
            | models.Q(parameters__all_categories__icontains=search)
            | models.Q(reference__icontains=search)
            | models.Q(
                parameters__options__icontains=search
            )  # catches variant reference numbers
        )

    categories = _parse_categories(request)
    if categories:
        category_filter = models.Q()
        for category in categories:
            escaped = re.escape(category)
            boundary_pattern = rf"(^|;\\s*){escaped}(\\s*;|$)"
            category_filter |= models.Q(category__iexact=category)
            category_filter |= models.Q(parameters__all_categories__icontains=category)
            category_filter |= models.Q(
                parameters__all_categories__iregex=boundary_pattern
            )
        qs = qs.filter(category_filter)

    visible_param = request.query_params.get("is_visible")
    if visible_param == "true":
        qs = qs.filter(is_visible=True)
    elif visible_param == "false":
        qs = qs.filter(is_visible=False)

    stock_param = request.query_params.get("stock")
    if stock_param == "in":
        qs = qs.filter(stock_quantity__gt=0)
    elif stock_param == "out":
        qs = qs.filter(stock_quantity=0)

    return qs


def _is_admin_view(request):
    """Return True when the request is explicitly flagged as an admin view by staff."""
    return (
        request.user
        and request.user.is_staff
        and request.query_params.get("admin_view") == "1"
    )


def _option_entry(m):
    option_reference = m.reference or str(m.id)
    option_label = (
        f"{option_reference} - {m.name}"
        if option_reference and m.name
        else option_reference or m.name or (m.parameters or {}).get("label", "")
    )
    return {
        "id": m.id,
        "reference": option_reference,
        "name": m.name,
        "description": m.description,
        "category": m.category,
        "all_categories": (m.parameters or {}).get("all_categories", ""),
        "price": str(m.price) if m.price is not None else None,
        "image": m.image.url if getattr(m, "image", None) and m.image else "",
        "stock_quantity": m.stock_quantity,
        "label": option_label,
        "parameter_code": (m.parameters or {}).get("parameter_code", ""),
        "option_tokens": (m.parameters or {}).get("option_tokens", ""),
    }


def _make_wildcard_group_card(members, group_name: str):
    """Return a virtual product representing a wildcard group card."""
    rep = copy(members[0])
    rep.parameters = {
        "type": "wildcard_group",
        "wildcard_reference": rep.reference or "",
        "options": [_option_entry(m) for m in members],
        "option_fields": ["reference", "parameter_code", "name"],
    }
    # Use the stored group name (may differ from any individual product name)
    rep.name = group_name
    return rep


def _collapse_products(products, wildcard_enabled=True):
    """Storefront collapse — wildcard grouping only.

    When wildcard_enabled is False every product is returned as-is.
    When True:
      1. Persistent WildcardGroup (is_enabled=True, ≥2 members) → DB-backed card
      2. In-memory fallback — products without a DB group that share the same
         (normalized_name, price, category) key collapse into one card
    """
    if not wildcard_enabled:
        return list(products)

    # ── Phase 1: Persistent WildcardGroup ────────────────────────────────────
    enabled_wc_ids: set[int] = set(
        WildcardGroup.objects.filter(is_enabled=True).values_list("id", flat=True)
    )
    wc_members: dict[int, list] = {}
    wc_names: dict[int, str] = {}
    for p in products:
        wid = p.wildcard_group_id
        if wid and wid in enabled_wc_ids:
            wc_members.setdefault(wid, []).append(p)
            if wid not in wc_names:
                wc_names[wid] = p.wildcard_group.name if p.wildcard_group else ""

    # Treat as active only groups that have >=2 members in the currently filtered list.
    active_wc_ids: set[int] = {
        wid for wid, members in wc_members.items() if len(members) >= 2
    }

    # ── Phase 2: In-memory fallback ───────────────────────────────────────────
    fallback_members: dict[tuple, list] = {}
    for p in products:
        wid = p.wildcard_group_id
        if wid and wid in active_wc_ids:
            continue
        key = storefront_group_key(p)
        fallback_members.setdefault(key, []).append(p)

    # ── Build result preserving order of first appearance ─────────────────────
    result = []
    seen_wc: set[int] = set()
    seen_fb: set[tuple] = set()

    for p in products:
        # Phase 1: DB wildcard group with ≥2 members
        wid = p.wildcard_group_id
        if wid and wid in active_wc_ids:
            if wid in seen_wc:
                continue
            members = wc_members.get(wid, [])
            if len(members) >= 2:
                result.append(
                    _make_wildcard_group_card(
                        members, wc_names.get(wid, members[0].name)
                    )
                )
                seen_wc.add(wid)
                continue
            # Single-member group → fall through to phase 2

        # Phase 2: in-memory fallback
        key = storefront_group_key(p)
        members = fallback_members.get(key, [])
        if len(members) >= 2:
            if key in seen_fb:
                continue
            result.append(_make_wildcard_group_card(members, members[0].name))
            seen_fb.add(key)
            continue

        result.append(p)

    return result


class ProductGroupListView(generics.ListAPIView):
    """Public read-only list of product groups."""

    permission_classes = (permissions.AllowAny,)
    serializer_class = ProductGroupSerializer

    def get_queryset(self):
        return ProductGroup.objects.annotate(
            product_count=Count(
                "products",
                filter=models.Q(products__is_visible=True),
            )
        ).order_by("name")


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling Product CRUD operations.
    - List/Retrieve: AllowAny (public) — returns only is_visible=True products
    - Create/Update/Delete: IsAdminUser (admin only) — returns all products
    """

    serializer_class = ProductSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "price", "category", "stock_quantity"]

    def get_queryset(self):
        qs = Product.objects.select_related("group", "wildcard_group").all()
        if self.action in ["list", "retrieve"] and not _is_admin_view(self.request):
            qs = qs.filter(is_visible=True)
        return _apply_product_filters(qs, self.request)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        if not _is_admin_view(request):
            queryset = self.filter_queryset(self.get_queryset())
            settings = GroupingSettings.get()
            collapsed = _collapse_products(
                list(queryset),
                wildcard_enabled=settings.wildcard_grouping_enabled,
            )
            page = self.paginate_queryset(collapsed)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                data = ProductService.apply_price_visibility(
                    {"results": list(serializer.data)}, request.user
                )
                return self.get_paginated_response(data["results"])
            serializer = self.get_serializer(collapsed, many=True)
            data = list(serializer.data)
            return Response(ProductService.apply_price_visibility(data, request.user))

        response = super().list(request, *args, **kwargs)
        response.data = ProductService.apply_price_visibility(
            response.data, request.user
        )
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        response.data = ProductService.apply_price_visibility(
            response.data, request.user
        )
        return response


class AdminSeedView(APIView):
    """
    Admin endpoint: seeds demo users (admin + client) and imports real products
    by running the import_product_data management command with the master
    dataset (final master CSV in data/new/).
    """

    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, *args, **kwargs):
        User = get_user_model()
        messages = []

        # Seed demo users
        if not User.objects.filter(email="admin@example.com").exists():
            User.objects.create_superuser("admin@example.com", "admin")
            messages.append("Vytvorený admin (admin@example.com / admin)")
        else:
            messages.append("Admin už existuje")

        if not User.objects.filter(email="client@example.com").exists():
            User.objects.create_user("client@example.com", "client", is_active=True)
            messages.append("Vytvorený klient (client@example.com / client)")
        else:
            messages.append("Klient už existuje")

        # Import products from final master CSV in data/new/
        try:
            out = StringIO()
            call_command("import_product_data", master=True, update=True, stdout=out)
            messages.append(out.getvalue())
        except Exception as e:
            return Response(
                {
                    "error": f"Import produktov zlyhal: {str(e)}",
                    "messages": messages,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"message": "\n".join(messages)}, status=status.HTTP_200_OK)


class ProductCountView(APIView):
    """Public endpoint to return DB-level distinct count of products for selected filters."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request, *args, **kwargs):
        qs = Product.objects.all()

        if not _is_admin_view(request):
            qs = qs.filter(is_visible=True)

        qs = _apply_product_filters(qs, request)

        if not _is_admin_view(request):
            settings = GroupingSettings.get()

            if not settings.wildcard_grouping_enabled:
                count = qs.count()
            else:
                # Persistent wildcard groups with ≥2 visible members
                active_wc_ids: set[int] = set(
                    qs.filter(
                        wildcard_group__is_enabled=True,
                        wildcard_group_id__isnull=False,
                    )
                    .values("wildcard_group_id")
                    .annotate(_cnt=Count("id"))
                    .filter(_cnt__gte=2)
                    .values_list("wildcard_group_id", flat=True)
                )

                seen: set = set()
                for name, price, category, wc_gid in qs.values_list(
                    "name", "price", "category", "wildcard_group_id"
                ):
                    if wc_gid and wc_gid in active_wc_ids:
                        key = ("wc_db", wc_gid)
                    else:
                        key = (
                            "wc_mem",
                            normalized_storefront_name(name),
                            str(price) if price is not None else "",
                            (category or "").strip().casefold(),
                        )
                    seen.add(key)
                count = len(seen)
        else:
            count = qs.distinct().count()

        return Response({"count": count}, status=status.HTTP_200_OK)


class AdminWildcardGroupListView(generics.ListAPIView):
    """Admin: list all WildcardGroups (no create – groups are generated by sync)."""

    permission_classes = (permissions.IsAdminUser,)
    serializer_class = WildcardGroupSerializer
    pagination_class = None

    def get_queryset(self):
        return WildcardGroup.objects.annotate(product_count=Count("products")).order_by(
            "name"
        )


class AdminWildcardGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update name/is_enabled, or delete a WildcardGroup."""

    permission_classes = (permissions.IsAdminUser,)
    serializer_class = WildcardGroupSerializer

    def get_queryset(self):
        return WildcardGroup.objects.annotate(product_count=Count("products"))


class AdminWildcardGroupProductsView(APIView):
    """Admin: list products in a WildcardGroup."""

    permission_classes = (permissions.IsAdminUser,)

    def get(self, request, pk, *args, **kwargs):
        try:
            group = WildcardGroup.objects.get(pk=pk)
        except WildcardGroup.DoesNotExist:
            return Response(
                {"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND
            )
        products = Product.objects.filter(wildcard_group=group).order_by("name")
        serializer = ProductSerializer(
            products, many=True, context={"request": request}
        )
        return Response(serializer.data)


class AdminWildcardGroupAddProductsView(APIView):
    """Admin: assign products to a WildcardGroup (promotes it to manually-managed)."""

    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, pk, *args, **kwargs):
        try:
            group = WildcardGroup.objects.get(pk=pk)
        except WildcardGroup.DoesNotExist:
            return Response(
                {"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND
            )
        product_ids = request.data.get("product_ids", [])
        if not isinstance(product_ids, list):
            return Response(
                {"error": "product_ids must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = Product.objects.filter(pk__in=product_ids).update(
            wildcard_group=group
        )
        # Promote to manually managed so sync won't overwrite
        if updated:
            group.is_auto_generated = False
            group.save(update_fields=["is_auto_generated"])
        return Response({"updated": updated}, status=status.HTTP_200_OK)


class AdminWildcardGroupRemoveProductsView(APIView):
    """Admin: remove products from a WildcardGroup (promotes it to manually-managed)."""

    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, pk, *args, **kwargs):
        product_ids = request.data.get("product_ids", [])
        if not isinstance(product_ids, list):
            return Response(
                {"error": "product_ids must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = Product.objects.filter(
            pk__in=product_ids, wildcard_group_id=pk
        ).update(wildcard_group=None)
        if updated:
            try:
                group = WildcardGroup.objects.get(pk=pk)
                group.is_auto_generated = False
                group.save(update_fields=["is_auto_generated"])
            except WildcardGroup.DoesNotExist:
                pass
        return Response({"updated": updated}, status=status.HTTP_200_OK)


class AdminWildcardGroupSyncView(APIView):
    """Admin: regenerate auto-generated WildcardGroups from current normalisation logic."""

    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, *args, **kwargs):
        result = sync_wildcard_groups()
        return Response(result, status=status.HTTP_200_OK)


class AdminGroupingSettingsView(APIView):
    """Admin: get or update grouping settings."""

    permission_classes = (permissions.IsAdminUser,)

    def get(self, request, *args, **kwargs):
        settings = GroupingSettings.get()
        serializer = GroupingSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        settings = GroupingSettings.get()
        serializer = GroupingSettingsSerializer(
            settings, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminBulkDeleteView(APIView):
    """Admin endpoint: delete multiple products by ID."""

    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, *args, **kwargs):
        ids = request.data.get("ids", [])
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "ids must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = Product.objects.filter(pk__in=ids)
        deleted_count = qs.count()
        qs.delete()
        return Response({"deleted": deleted_count}, status=status.HTTP_200_OK)


class AdminBulkSetVisibleView(APIView):
    """Admin endpoint: set is_visible on multiple products by ID."""

    permission_classes = (permissions.IsAdminUser,)

    def post(self, request, *args, **kwargs):
        ids = request.data.get("ids", [])
        is_visible = request.data.get("is_visible")
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "ids must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if is_visible is None:
            return Response(
                {"error": "is_visible is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if isinstance(is_visible, str):
            is_visible = is_visible.lower() in ("true", "1", "yes")
        updated_count = Product.objects.filter(pk__in=ids).update(
            is_visible=bool(is_visible)
        )
        return Response({"updated": updated_count}, status=status.HTTP_200_OK)


class AdminProductIdsView(APIView):
    """Admin endpoint: return all product IDs matching current filters (for bulk select-all)."""

    permission_classes = (permissions.IsAdminUser,)

    def get(self, request, *args, **kwargs):
        qs = Product.objects.all()
        qs = _apply_product_filters(qs, request)
        ids = list(qs.values_list("id", flat=True))
        return Response({"ids": ids}, status=status.HTTP_200_OK)


class AdminCategoriesView(APIView):
    """Admin endpoint: return all unique product categories."""

    permission_classes = (permissions.IsAdminUser,)

    def get(self, request, *args, **kwargs):

        raw_cats = (
            Product.objects.exclude(category="")
            .values_list("category", flat=True)
            .distinct()
        )
        params_cats = (
            Product.objects.exclude(parameters__all_categories__isnull=True)
            .exclude(parameters__all_categories="")
            .values_list("parameters__all_categories", flat=True)
        )

        categories: set[str] = set()
        for cat in raw_cats:
            if cat:
                categories.add(cat.strip())
        for raw in params_cats:
            if raw:
                for part in raw.split(";"):
                    part = part.strip()
                    if part:
                        categories.add(part)

        return Response({"categories": sorted(categories)}, status=status.HTTP_200_OK)


class ProductCategoriesView(APIView):
    """Public endpoint: return all unique categories for visible storefront products."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request, *args, **kwargs):
        qs = Product.objects.all()
        if not _is_admin_view(request):
            qs = qs.filter(is_visible=True)

        raw_cats = qs.exclude(category="").values_list("category", flat=True).distinct()
        params_cats = (
            qs.exclude(parameters__all_categories__isnull=True)
            .exclude(parameters__all_categories="")
            .values_list("parameters__all_categories", flat=True)
        )

        categories: set[str] = set()
        for cat in raw_cats:
            if cat:
                categories.add(cat.strip())
        for raw in params_cats:
            if raw:
                for part in raw.split(";"):
                    part = part.strip()
                    if part:
                        categories.add(part)

        return Response({"categories": sorted(categories)}, status=status.HTTP_200_OK)


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

            products_to_create = {}
            products_to_update = {}

            for row in rows:
                name = row.get("name")
                if not name:
                    continue

                if len(name) > 255:
                    raise ValidationError(
                        f"Product name too long (max 255 characters): {name[:50]}..."
                    )

                product = None
                is_new = False

                if name in products_to_create:
                    product = products_to_create[name]
                    is_new = True
                elif name in existing_products_map:
                    product = existing_products_map[name]
                    is_new = False
                else:
                    is_new = True
                    product = Product(name=name)
                    product.description = ""
                    product.category = "Uncategorized"
                    product.price = Decimal("0.00")
                    product.stock_quantity = 0
                    product.low_stock_threshold = 5
                    product.low_stock_alert_sent = False
                    products_to_create[name] = product

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

                if (
                    product.stock_quantity > product.low_stock_threshold
                    and product.low_stock_alert_sent
                ):
                    product.low_stock_alert_sent = False

                if not is_new:
                    products_to_update[product.pk] = product

            processed_count = len(products_to_create) + len(products_to_update)

            # Apply group auto-assignment before bulk ops (bypassed by bulk_create/update).
            # Pre-fetch all groups once to avoid N+1 queries.
            all_groups = list(ProductGroup.objects.only("id", "prefix"))
            for product in products_to_create.values():
                product._auto_assign_group(groups=all_groups)
            for product in products_to_update.values():
                product._auto_assign_group(groups=all_groups)

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
                        "group",
                    ]
                    Product.objects.bulk_update(
                        products_to_update.values(), fields_to_update
                    )

            return Response(
                {"message": f"Successfully processed {processed_count} products."},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            if isinstance(e, ValidationError):
                raise e
            return Response(
                {"error": f"Error processing file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProductInquiryView(APIView):
    """Public endpoint to send product inquiry emails."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        """
        Send a product inquiry email to warehouse.

        Request body:
        {
            "product_id": int,
            "message": str
        }

        Returns:
            {"success": bool, "message": str}
        """
        product_id = request.data.get("product_id")
        message = request.data.get("message", "").strip()

        if not product_id or not message:
            return Response(
                {"error": "product_id and message are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) < 10:
            return Response(
                {"error": "Message must be at least 10 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) > 2000:
            return Response(
                {"error": "Message is too long (max 2000 characters)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "product_id must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify product exists and use canonical public identifier only.
        try:
            product = Product.objects.only("id", "reference").get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND
            )

        product_label = (
            product.reference.strip() if product.reference else f"ID:{product.id}"
        )

        # Get customer name from profile
        customer_name = (
            request.user.get_full_name() or request.user.username or request.user.email
        )
        customer_email = request.user.email

        # Send email
        service = ProductInquiryEmailService()
        success = service.send_product_inquiry(
            product_name=product_label,
            customer_name=customer_name,
            customer_email=customer_email,
            message=message,
        )

        if success:
            return Response(
                {"success": True, "message": "Dotaz bol úspešne odoslaný."},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Došlo k chybe pri odoslaní dotazu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
