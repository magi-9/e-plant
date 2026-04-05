"""
Order creation and management service.

Contains the core business logic for order processing.
"""

import logging
import uuid
from decimal import Decimal
from typing import Dict, Any, Optional, List
from django.db import transaction
from django.contrib.auth import get_user_model

from orders.models import Order, OrderItem, ShippingRate
from services.email import OrderEmailService
from users.models import GlobalSettings
from .stock_service import StockService
from .pricing_service import PricingService

logger = logging.getLogger(__name__)

User = get_user_model()


class OrderService:
    """
    Service for managing order creation and lifecycle.

    This service orchestrates the entire order creation process:
    1. Stock validation and reservation
    2. Price calculation
    3. Order instance creation
    4. Order items creation
    5. Email notifications

    All operations are wrapped in a database transaction for data consistency.
    """

    def __init__(self, user: Optional[User] = None):
        """
        Initialize the order service.

        Args:
            user: The authenticated user creating the order (optional)
        """
        self.user = user
        self.stock_service = StockService()
        self.pricing_service = PricingService()

    def create_order(self, validated_data: Dict[str, Any]) -> Order:
        """
        Create a new order with all associated items.

        This method:
        1. Extracts items data from validated_data
        2. Wraps everything in a database transaction
        3. Validates and reserves stock
        4. Calculates total price
        5. Creates order and order items
        6. Sends confirmation emails (after transaction commits)

        Args:
            validated_data: Validated order data including items

        Returns:
            Created Order instance

        Raises:
            ValidationError: If stock validation fails or products don't exist
        """
        items_data = validated_data.pop("items")

        with transaction.atomic():
            # Validate stock and prepare items (locks products)
            prepared_items = self.stock_service.validate_and_reserve_stock(items_data)

            # Calculate items total
            items_total = self.pricing_service.calculate_order_total(prepared_items)

            # Resolve shipping cost
            country = validated_data.get("country", "SK")
            # Picks the cheapest carrier for the country (ordering = ["country", "price"]).
            shipping_rate = ShippingRate.objects.filter(country=country).first()
            if shipping_rate is not None:
                shipping_cost = self.pricing_service.calculate_shipping(items_total, shipping_rate)
                shipping_carrier = shipping_rate.carrier
            else:
                shop = GlobalSettings.load()
                shipping_cost = Decimal(str(shop.shipping_cost))
                shipping_carrier = ""

            total_price = items_total + shipping_cost

            # Generate unique order number
            order_number = self._generate_order_number()

            # Determine order status based on payment method
            status = self._determine_initial_status(
                validated_data.get("payment_method", "bank_transfer")
            )

            # Create the order instance
            order = self._create_order_instance(
                validated_data=validated_data,
                order_number=order_number,
                total_price=total_price,
                status=status,
                shipping_cost=shipping_cost,
                shipping_carrier=shipping_carrier,
            )

            # Create order items
            self._create_order_items(order, prepared_items)

            # Schedule email notifications after transaction commits
            # This ensures DB locks are released before potentially slow SMTP calls
            transaction.on_commit(lambda: self._send_order_notifications(order))

            logger.info(
                "Order created successfully: %s - Total: %s",
                order.order_number,
                order.total_price,
            )

            return order

    def _generate_order_number(self) -> str:
        """
        Generate a unique order number.

        Returns:
            8-character uppercase alphanumeric order number
        """
        return str(uuid.uuid4())[:8].upper()

    def _determine_initial_status(self, payment_method: str) -> str:
        """
        Determine the initial order status based on payment method.

        Args:
            payment_method: Payment method chosen by customer

        Returns:
            Initial order status
        """
        if payment_method == "bank_transfer":
            return "awaiting_payment"
        return "new"

    def _create_order_instance(
        self,
        validated_data: Dict[str, Any],
        order_number: str,
        total_price: Decimal,
        status: str,
        shipping_cost: Decimal = Decimal("0.00"),
        shipping_carrier: str = "",
    ) -> Order:
        """
        Create the Order instance.

        Args:
            validated_data: Validated order data
            order_number: Generated order number
            total_price: Calculated total price
            status: Initial order status
            shipping_cost: Calculated shipping cost
            shipping_carrier: Carrier name from ShippingRate

        Returns:
            Created Order instance
        """
        order = Order.objects.create(
            user=self.user,
            order_number=order_number,
            status=status,
            total_price=total_price,
            shipping_cost=shipping_cost,
            shipping_carrier=shipping_carrier,
            **validated_data,
        )

        logger.info("Order instance created: %s", order.order_number)
        return order

    def _create_order_items(
        self, order: Order, prepared_items: List[Dict[str, Any]]
    ) -> None:
        """
        Create OrderItem instances for the order.

        Args:
            order: The order to attach items to
            prepared_items: List of prepared item data with product, quantity, price_snapshot
        """
        for item_data in prepared_items:
            OrderItem.objects.create(order=order, **item_data)

        logger.info(
            "Created %s order items for %s", len(prepared_items), order.order_number
        )

    def _send_order_notifications(self, order: Order) -> None:
        """
        Send email notifications for the order.

        This is called after the transaction commits to avoid holding
        database locks during potentially slow email operations.

        Args:
            order: The order to send notifications for
        """
        try:
            OrderEmailService(order).send_confirmation_emails()
            logger.info("Email notifications sent for order %s", order.order_number)
        except Exception:
            # Log the error with full traceback but don't raise - order is already created
            logger.exception(
                "Failed to send email notifications for order %s", order.order_number
            )
