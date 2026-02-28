"""
Stock management service.

Handles all stock-related operations for order processing.
"""

import logging
from typing import List, Dict, Any
from django.db import transaction
from rest_framework import serializers
from products.models import Product

logger = logging.getLogger(__name__)


class StockService:
    """
    Service for managing product stock operations.

    Responsibilities:
    - Validate stock availability
    - Deduct stock quantities
    - Lock products during transactions
    """

    @staticmethod
    def validate_and_reserve_stock(
        items_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Validate stock availability and prepare items for order creation.

        This method:
        1. Aggregates quantities by product_id to validate against total (prevents overselling)
        2. Locks products using select_for_update() to prevent race conditions
        3. Validates that sufficient stock is available for the total quantity
        4. Deducts stock quantities once per unique product
        5. Returns individual prepared items (maintains one OrderItem per input item)

        Note: Only wraps in transaction.atomic() if not already in an atomic block,
        to avoid unnecessary savepoints.

        Args:
            items_data: List of dicts with 'product_id' and 'quantity' keys

        Returns:
            List of dicts with 'product', 'quantity', and 'price_snapshot' keys
            (one entry per input item, preserving order and individual quantities)

        Raises:
            serializers.ValidationError: If product not found or insufficient stock
        """
        # Only create transaction if not already in one (avoid unnecessary savepoint)
        if not transaction.get_connection().in_atomic_block:
            with transaction.atomic():
                return StockService._validate_and_reserve_stock_impl(items_data)
        else:
            return StockService._validate_and_reserve_stock_impl(items_data)

    @staticmethod
    def _validate_and_reserve_stock_impl(
        items_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Internal implementation of validate_and_reserve_stock."""
        # First pass: aggregate quantities by product_id for validation
        product_quantities = {}
        for item_data in items_data:
            product_id = item_data["product_id"]
            quantity = item_data["quantity"]
            product_quantities[product_id] = (
                product_quantities.get(product_id, 0) + quantity
            )

        # Second pass: lock products, validate, and deduct stock
        locked_products = {}  # Cache locked products by id
        for product_id, total_quantity in product_quantities.items():
            # Lock the product row to prevent race conditions
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Product with id {product_id} does not exist."
                )

            # Validate stock availability against total quantity
            if product.stock_quantity < total_quantity:
                raise serializers.ValidationError(
                    f"Not enough stock for product '{product.name}'. "
                    f"Available: {product.stock_quantity}, Requested: {total_quantity}"
                )

            # Deduct total stock for this product
            product.stock_quantity -= total_quantity
            product.save()
            locked_products[product_id] = product

            logger.debug(
                "Stock deducted: %s - New quantity: %s",
                product.name,
                product.stock_quantity,
            )

        # Third pass: prepare individual items (maintains original structure)
        # This ensures one OrderItem per input item, not per unique product
        prepared_items = []
        for item_data in items_data:
            product_id = item_data["product_id"]
            product = locked_products[product_id]
            prepared_items.append(
                {
                    "product": product,
                    "quantity": item_data["quantity"],
                    "price_snapshot": product.price,
                }
            )

        logger.info(
            "Stock reserved for %s items across %s unique products",
            len(prepared_items),
            len(locked_products),
        )
        return prepared_items

    @staticmethod
    def restore_stock(items: List[Dict[str, Any]]) -> None:
        """
        Restore stock quantities (e.g., in case of order cancellation).

        Args:
            items: List of dicts with 'product' and 'quantity' keys
        """
        with transaction.atomic():
            for item in items:
                product = Product.objects.select_for_update().get(id=item["product"].id)
                product.stock_quantity += item["quantity"]
                product.save()
                logger.info(
                    "Stock restored: %s - New quantity: %s",
                    product.name,
                    product.stock_quantity,
                )
