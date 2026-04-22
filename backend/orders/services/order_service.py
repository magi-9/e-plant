"""
Order creation and management service.

Contains the core business logic for order processing.
"""

import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from orders.models import BatchLot, Order, OrderItem, OrderItemBatch, ShippingRate
from services.email import OrderEmailService
from users.models import GlobalSettings

from .pricing_service import PricingService
from .stock_service import StockService

logger = logging.getLogger(__name__)

MAX_ORDER_NUMBER_RETRIES = 5

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

        logger.info(
            "ORDER_CHECKOUT_STARTED payment_method=%s items=%d",
            validated_data.get("payment_method", "unknown"),
            len(items_data),
        )
        try:
            return self._create_order_transactional(validated_data, items_data)
        except Exception:
            logger.exception(
                "ORDER_CHECKOUT_FAILED payment_method=%s",
                validated_data.get("payment_method", "unknown"),
            )
            raise

    def _create_order_transactional(
        self, validated_data: Dict[str, Any], items_data: List[Dict[str, Any]]
    ) -> "Order":
        with transaction.atomic():
            # Validate stock and prepare items (locks products)
            prepared_items = self.stock_service.validate_and_reserve_stock(items_data)

            # Calculate items total
            items_total = self.pricing_service.calculate_order_total(prepared_items)

            # Resolve shipping cost
            shipping_method = validated_data.get("shipping_method", "courier")
            if shipping_method == "pickup":
                shipping_cost = Decimal("0.00")
                shipping_carrier = "Osobný odber"
            else:
                # Treat blank/missing country as "SK" to avoid empty-string DB lookups.
                country = validated_data.get("country") or "SK"
                # Picks the cheapest carrier for the country (ordering = ["country", "price"]).
                shipping_rate = ShippingRate.objects.filter(country=country).first()
                if shipping_rate is not None:
                    shipping_cost = self.pricing_service.calculate_shipping(
                        items_total, shipping_rate
                    )
                    shipping_carrier = shipping_rate.carrier
                else:
                    shop = GlobalSettings.load()
                    shipping_cost = Decimal(str(shop.shipping_cost))
                    shipping_carrier = ""

            total_price = items_total + shipping_cost

            # Determine order status based on payment method
            status = self._determine_initial_status(
                validated_data.get("payment_method", "bank_transfer")
            )

            order = None
            for attempt in range(1, MAX_ORDER_NUMBER_RETRIES + 1):
                order_number = self._generate_order_number()
                try:
                    # Savepoint lets us retry after a unique collision without
                    # breaking the surrounding transaction.
                    with transaction.atomic():
                        order = self._create_order_instance(
                            validated_data=validated_data,
                            order_number=order_number,
                            total_price=total_price,
                            status=status,
                            shipping_cost=shipping_cost,
                            shipping_carrier=shipping_carrier,
                        )
                    break
                except IntegrityError as exc:
                    if not self._is_order_number_collision(exc):
                        raise
                    if attempt == MAX_ORDER_NUMBER_RETRIES:
                        raise RuntimeError(
                            "Could not allocate a unique order number after retries."
                        ) from exc
                    logger.warning(
                        "Order number collision detected for %s (attempt %s/%s), retrying.",
                        order_number,
                        attempt,
                        MAX_ORDER_NUMBER_RETRIES,
                    )

            if order is None:
                raise RuntimeError(
                    "Order creation failed before order instance was created."
                )

            # Create order items
            self._create_order_items(order, prepared_items)

            # Schedule email notifications after transaction commits
            # This ensures DB locks are released before potentially slow SMTP calls
            transaction.on_commit(lambda: self._send_order_notifications(order))

            if status == "awaiting_payment":
                logger.info(
                    "ORDER_PAYMENT_PENDING order_number=%s total=%s",
                    order.order_number,
                    order.total_price,
                )

            logger.info(
                "ORDER_CREATED order_number=%s status=%s total=%s",
                order.order_number,
                status,
                order.total_price,
            )

            return order

    def _generate_order_number(self) -> str:
        """
        Generate a unique order number in format YYYYX0001.

        Sequence resets every year and uses fixed 4-digit padding.

        Returns:
            Order number in format YYYYXNNNN
        """
        year = timezone.now().year
        prefix = f"{year}X"

        last_order_number = (
            Order.objects.filter(order_number__startswith=prefix)
            .order_by("-order_number")
            .values_list("order_number", flat=True)
            .first()
        )

        if not last_order_number:
            sequence = 1
        else:
            suffix = last_order_number[len(prefix) :]
            if suffix.isdigit():
                sequence = int(suffix) + 1
            else:
                logger.warning(
                    "Unexpected order number format '%s' for prefix '%s'. Restarting yearly sequence from 0001.",
                    last_order_number,
                    prefix,
                )
                sequence = 1

        return f"{prefix}{sequence:04d}"

    @staticmethod
    def _is_order_number_collision(exc: IntegrityError) -> bool:
        message = str(exc).lower()
        return "order_number" in message and "unique" in message

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
            batch_allocations = item_data.pop("batch_allocations", [])
            order_item = OrderItem.objects.create(order=order, **item_data)

            if batch_allocations:
                allocated_batch_numbers = [bn for bn, _ in batch_allocations]
                batch_number_to_lot = {
                    lot.batch_number: lot
                    for lot in BatchLot.objects.filter(
                        product=order_item.product,
                        batch_number__in=allocated_batch_numbers,
                    )
                }
                missing = [
                    bn
                    for bn in allocated_batch_numbers
                    if bn not in batch_number_to_lot
                ]
                if missing:
                    raise RuntimeError(
                        f"FIFO batch lots not found for product "
                        f"'{order_item.product}': {missing}. "
                        "Order cannot be created with inconsistent batch data."
                    )
                OrderItemBatch.objects.bulk_create(
                    [
                        OrderItemBatch(
                            order_item=order_item,
                            batch_lot=batch_number_to_lot[batch_number],
                            quantity=qty,
                        )
                        for batch_number, qty in batch_allocations
                    ]
                )

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

    def admin_update_order(
        self,
        order: Order,
        validated_data: Dict[str, Any],
        changed_by: Optional[User] = None,
    ) -> Order:
        """
        Admin intervention edit of an existing order.

        Restores old stock, re-reserves stock for the new item list,
        recalculates totals, updates order fields, and emails customer.
        """
        reason = validated_data.pop("reason")
        items_data = validated_data.pop("items")

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)

            # Return all quantities currently consumed by this order.
            self.stock_service.restore_order_stock(order)

            # Remove current items and recreate from edited payload.
            order.items.all().delete()
            prepared_items = self.stock_service.validate_and_reserve_stock(items_data)
            self._create_order_items(order, prepared_items)

            items_total = self.pricing_service.calculate_order_total(prepared_items)
            shipping_method = (
                validated_data.get("shipping_method")
                or order.shipping_method
                or "courier"
            )
            if shipping_method == "pickup":
                shipping_cost = Decimal("0.00")
                shipping_carrier = "Osobný odber"
            else:
                country = validated_data.get("country") or order.country or "SK"
                shipping_rate = ShippingRate.objects.filter(country=country).first()
                if shipping_rate is not None:
                    shipping_cost = self.pricing_service.calculate_shipping(
                        items_total, shipping_rate
                    )
                    shipping_carrier = shipping_rate.carrier
                else:
                    shop = GlobalSettings.load()
                    shipping_cost = Decimal(str(shop.shipping_cost))
                    shipping_carrier = ""

            for field, value in validated_data.items():
                setattr(order, field, value)

            order.shipping_cost = shipping_cost
            order.shipping_carrier = shipping_carrier
            order.total_price = items_total + shipping_cost
            order.save()

            transaction.on_commit(
                lambda: self._send_admin_intervention_notification(order, reason)
            )

            logger.info(
                "Admin updated order %s by user=%s reason=%s",
                order.order_number,
                getattr(changed_by, "id", None),
                reason,
            )

            return order

    def admin_delete_order(
        self,
        order: Order,
        reason: str,
        deleted_by: Optional[User] = None,
    ) -> None:
        """
        Admin intervention delete of an existing order.

        Restores stock, sends notification, then deletes the order.
        """
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)

            # Preserve minimal snapshot for on_commit notification.
            order_id = order.id
            order_number = order.order_number

            self.stock_service.restore_order_stock(order)
            order.delete()

            transaction.on_commit(
                lambda: self._send_admin_deleted_notification(order, reason)
            )

            logger.info(
                "Admin deleted order %s(id=%s) by user=%s reason=%s",
                order_number,
                order_id,
                getattr(deleted_by, "id", None),
                reason,
            )

    def _send_admin_intervention_notification(self, order: Order, reason: str) -> None:
        """Best-effort customer notification for admin order edits."""
        try:
            OrderEmailService(order).send_admin_intervention_email(reason)
        except Exception:
            logger.exception(
                "Failed to send admin intervention email for order %s",
                order.order_number,
            )

    def _send_admin_deleted_notification(self, order: Order, reason: str) -> None:
        """Best-effort customer notification for admin order deletion."""
        try:
            OrderEmailService(order).send_admin_deleted_email(reason)
        except Exception:
            logger.exception(
                "Failed to send admin deleted email for order %s",
                order.order_number,
            )
