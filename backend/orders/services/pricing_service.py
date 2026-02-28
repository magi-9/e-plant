"""
Pricing calculation service.

Handles all pricing-related operations for orders.
"""

import logging
from typing import List, Dict, Any
from decimal import Decimal

logger = logging.getLogger(__name__)


class PricingService:
    """
    Service for calculating order prices.

    Responsibilities:
    - Calculate item subtotals
    - Calculate order total
    - Handle price snapshots
    """

    @staticmethod
    def calculate_order_total(prepared_items: List[Dict[str, Any]]) -> Decimal:
        """
        Calculate the total price for an order.

        Args:
            prepared_items: List of dicts with 'price_snapshot' and 'quantity' keys

        Returns:
            Total price as Decimal
        """
        total_price = Decimal("0.00")

        for item in prepared_items:
            price_snapshot = item["price_snapshot"]
            quantity = item["quantity"]
            subtotal = price_snapshot * quantity
            total_price += subtotal

            logger.debug(
                f"Item pricing: {item.get('product', 'Unknown')} - "
                f"{quantity} × {price_snapshot} = {subtotal}"
            )

        logger.info(f"Order total calculated: {total_price}")
        return total_price

    @staticmethod
    def calculate_item_subtotal(price: Decimal, quantity: int) -> Decimal:
        """
        Calculate subtotal for a single item.

        Args:
            price: Unit price
            quantity: Quantity ordered

        Returns:
            Subtotal as Decimal
        """
        return price * quantity
