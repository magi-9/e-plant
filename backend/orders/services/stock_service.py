"""
Stock management service.

Handles all stock-related operations for order processing.
"""

import logging
from typing import List, Dict, Any, Tuple
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
    - Allocate batches FIFO (oldest received_at first)
    """

    @staticmethod
    def validate_and_reserve_stock(
        items_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Validate stock availability and prepare items for order creation.

        Each prepared item dict contains a 'batch_allocations' key:
          list of (batch_number, qty) tuples — empty when no BatchLots exist.
        """
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
        product_quantities: Dict[int, int] = {}
        for item_data in items_data:
            product_id = item_data["product_id"]
            quantity = item_data["quantity"]
            product_quantities[product_id] = (
                product_quantities.get(product_id, 0) + quantity
            )

        # Second pass: lock products, validate, and deduct total stock
        locked_products: Dict[int, Product] = {}

        for product_id, total_quantity in product_quantities.items():
            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Product with id {product_id} does not exist."
                )

            if product.stock_quantity < total_quantity:
                raise serializers.ValidationError(
                    f"Not enough stock for product '{product.name}'. "
                    f"Available: {product.stock_quantity}, Requested: {total_quantity}"
                )

            product.stock_quantity -= total_quantity
            product.save(update_fields=["stock_quantity"])
            locked_products[product_id] = product

            logger.debug(
                "Stock deducted: %s — new qty: %s",
                product.name,
                product.stock_quantity,
            )

        # Third pass: build prepared items with per-item FIFO batch allocation
        prepared_items = []
        for item_data in items_data:
            product_id = item_data["product_id"]
            quantity = item_data["quantity"]
            product = locked_products[product_id]
            # Allocate batches for this specific item's quantity
            allocations = StockService._allocate_batches_fifo(product, quantity)
            prepared_items.append(
                {
                    "product": product,
                    "quantity": quantity,
                    "price_snapshot": product.price,
                    "batch_allocations": allocations,
                }
            )

        logger.info(
            "Stock reserved for %s items across %s unique products",
            len(prepared_items),
            len(locked_products),
        )
        return prepared_items

    @staticmethod
    def _allocate_batches_fifo(
        product: Product, quantity: int
    ) -> List[Tuple[str, int]]:
        """
        Allocate `quantity` units from BatchLots in FIFO order (oldest first).

        Decrements batch_lot.quantity in-place (DB update via select_for_update).
        Returns list of (batch_number, allocated_qty) tuples.
        Returns [] if no BatchLots exist (legacy product with no batch tracking).
        """
        from orders.models import BatchLot

        lots = list(
            BatchLot.objects.select_for_update()
            .filter(product=product, quantity__gt=0)
            .order_by("received_at", "id")
        )

        if not lots:
            return []

        allocations: List[Tuple[str, int]] = []
        remaining = quantity

        for lot in lots:
            if remaining <= 0:
                break
            take = min(lot.quantity, remaining)
            lot.quantity -= take
            lot.save(update_fields=["quantity"])
            allocations.append((lot.batch_number, take))
            remaining -= take

        if remaining > 0:
            raise serializers.ValidationError(
                f"Batch stock for '{product.name}' is inconsistent: "
                f"could not allocate {remaining} of {quantity} units from batches. "
                "Reconcile batch quantities before placing this order."
            )

        return allocations

    @staticmethod
    def restore_stock(items: List[Dict[str, Any]]) -> None:
        """
        Restore stock quantities (e.g., in case of order cancellation).
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
