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
        1. Locks products using select_for_update() to prevent race conditions
        2. Validates that sufficient stock is available
        3. Deducts stock quantities
        4. Returns prepared item data with product instances and price snapshots

        Args:
            items_data: List of dicts with 'product_id' and 'quantity' keys

        Returns:
            List of dicts with 'product', 'quantity', and 'price_snapshot' keys

        Raises:
            serializers.ValidationError: If product not found or insufficient stock
        """
        products_to_update = []
        prepared_items = []

        for item_data in items_data:
            product_id = item_data["product_id"]
            quantity = item_data["quantity"]

            # Lock the product row to prevent race conditions
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Product with id {product_id} does not exist."
                )

            # Validate stock availability
            if product.stock_quantity < quantity:
                raise serializers.ValidationError(
                    f"Not enough stock for product '{product.name}'. "
                    f"Available: {product.stock_quantity}, Requested: {quantity}"
                )

            # Deduct stock
            product.stock_quantity -= quantity
            products_to_update.append(product)

            # Prepare item data with product instance and price snapshot
            prepared_items.append(
                {
                    "product": product,
                    "quantity": quantity,
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
