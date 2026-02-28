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
        1. Aggregates quantities by product_id to handle duplicates
        2. Locks products using select_for_update() to prevent race conditions
        3. Validates that sufficient stock is available
        4. Deducts stock quantities
        5. Returns prepared item data with product instances and price snapshots

        Note: Wraps operations in transaction.atomic() to ensure select_for_update()
        works correctly. Nested transactions are safe in Django.

        Args:
            items_data: List of dicts with 'product_id' and 'quantity' keys

        Returns:
            List of dicts with 'product', 'quantity', and 'price_snapshot' keys

        Raises:
            serializers.ValidationError: If product not found or insufficient stock
        """
        with transaction.atomic():
            # Aggregate quantities by product_id to handle duplicate products
            product_quantities = {}
            for item_data in items_data:
                product_id = item_data["product_id"]
                quantity = item_data["quantity"]
                product_quantities[product_id] = (
                    product_quantities.get(product_id, 0) + quantity
                )

            products_to_update = []
            prepared_items = []

            for product_id, total_quantity in product_quantities.items():
                # Lock the product row to prevent race conditions
                try:
                    product = Product.objects.select_for_update().get(id=product_id)
                except Product.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Product with id {product_id} does not exist."
                    )

                # Validate stock availability
                if product.stock_quantity < total_quantity:
                    raise serializers.ValidationError(
                        f"Not enough stock for product '{product.name}'. "
                        f"Available: {product.stock_quantity}, Requested: {total_quantity}"
                    )

                # Deduct stock
                product.stock_quantity -= total_quantity
                products_to_update.append(product)

                # Prepare item data with product instance and price snapshot
                prepared_items.append(
                    {
                        "product": product,
                        "quantity": total_quantity,
                        "price_snapshot": product.price,
                    }
                )

            # Save all updated products
            for product in products_to_update:
                product.save()
                logger.info(
                    f"Stock deducted: {product.name} - "
                    f"New quantity: {product.stock_quantity}"
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
                    f"Stock restored: {product.name} - "
                    f"New quantity: {product.stock_quantity}"
                )
