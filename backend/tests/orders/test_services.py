"""
Unit tests for order services.

Tests the business logic layer separated from serialization.
"""

import pytest
import threading
from decimal import Decimal
from django.db import transaction
from django.db import close_old_connections
from rest_framework.serializers import ValidationError
from unittest.mock import patch

from orders.services import OrderService, StockService, PricingService
from orders.models import Order, OrderItem


class TestStockService:
    """Test suite for StockService."""

    @pytest.mark.django_db
    def test_validate_and_reserve_stock_success(self, product_factory):
        """Test successful stock validation and reservation."""
        product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
        product2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

        items_data = [
            {"product_id": product1.id, "quantity": 2},
            {"product_id": product2.id, "quantity": 1},
        ]

        with transaction.atomic():
            prepared_items = StockService.validate_and_reserve_stock(items_data)

        assert len(prepared_items) == 2
        assert prepared_items[0]["product"] == product1
        assert prepared_items[0]["quantity"] == 2
        assert prepared_items[0]["price_snapshot"] == Decimal("100.00")

        # Verify stock was deducted
        product1.refresh_from_db()
        product2.refresh_from_db()
        assert product1.stock_quantity == 8  # 10 - 2
        assert product2.stock_quantity == 4  # 5 - 1

    @pytest.mark.django_db
    def test_validate_and_reserve_stock_insufficient_stock(self, product_factory):
        """Test that ValidationError is raised when stock is insufficient."""
        product = product_factory(price=Decimal("100.00"), stock_quantity=5)

        items_data = [
            {"product_id": product.id, "quantity": 10},  # More than available
        ]

        with pytest.raises(ValidationError) as exc_info:
            with transaction.atomic():
                StockService.validate_and_reserve_stock(items_data)

        assert "Not enough stock" in str(exc_info.value)

        # Verify stock was NOT deducted (transaction rolled back)
        product.refresh_from_db()
        assert product.stock_quantity == 5

    @pytest.mark.django_db
    def test_validate_and_reserve_stock_product_not_found(self):
        """Test that ValidationError is raised when product doesn't exist."""
        items_data = [
            {"product_id": 99999, "quantity": 1},  # Non-existent product
        ]

        with pytest.raises(ValidationError) as exc_info:
            with transaction.atomic():
                StockService.validate_and_reserve_stock(items_data)

        assert "does not exist" in str(exc_info.value)

    @pytest.mark.django_db
    def test_restore_stock(self, product_factory):
        """Test stock restoration functionality."""
        product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
        product2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

        # Deduct stock first
        product1.stock_quantity -= 2
        product1.save()
        product2.stock_quantity -= 3
        product2.save()

        # Prepare items for restoration
        items = [
            {"product": product1, "quantity": 2},
            {"product": product2, "quantity": 3},
        ]

        # Restore stock
        StockService.restore_stock(items)

        # Verify stock was restored
        product1.refresh_from_db()
        product2.refresh_from_db()
        assert product1.stock_quantity == 10
        assert product2.stock_quantity == 5

    @pytest.mark.django_db
    def test_validate_and_reserve_stock_with_transaction(self, product_factory):
        """Test stock reservation and deduction within a database transaction."""
        product = product_factory(price=Decimal("100.00"), stock_quantity=10)

        items_data = [{"product_id": product.id, "quantity": 5}]

        # Perform stock validation and reservation
        # (method now wraps itself in transaction.atomic())
        prepared_items = StockService.validate_and_reserve_stock(items_data)

        # The service should return the expected prepared item
        assert len(prepared_items) == 1
        assert prepared_items[0]["product"] == product
        assert prepared_items[0]["quantity"] == 5

        # After the transaction commits, stock should be reduced
        product.refresh_from_db()
        assert product.stock_quantity == 5

    @pytest.mark.django_db
    def test_validate_and_reserve_stock_handles_duplicate_products(
        self, product_factory
    ):
        """Test that duplicate product_ids are validated correctly but maintain individual items."""
        product = product_factory(price=Decimal("100.00"), stock_quantity=10)

        # Same product appears multiple times in the order
        items_data = [
            {"product_id": product.id, "quantity": 2},
            {"product_id": product.id, "quantity": 3},
            {"product_id": product.id, "quantity": 1},
        ]

        prepared_items = StockService.validate_and_reserve_stock(items_data)

        # Should return individual items (one OrderItem per input), not aggregated
        assert len(prepared_items) == 3
        assert prepared_items[0]["quantity"] == 2
        assert prepared_items[1]["quantity"] == 3
        assert prepared_items[2]["quantity"] == 1

        # Stock should be deducted by total quantity: 2 + 3 + 1 = 6
        product.refresh_from_db()
        assert product.stock_quantity == 4  # 10 - 6

    @pytest.mark.django_db
    def test_validate_and_reserve_stock_duplicate_insufficient_stock(
        self, product_factory
    ):
        """Test that duplicate products validate against total quantity."""
        product = product_factory(price=Decimal("100.00"), stock_quantity=10)

        # Same product ordered multiple times, total exceeds stock
        items_data = [
            {"product_id": product.id, "quantity": 6},
            {"product_id": product.id, "quantity": 5},  # Total: 11 > 10 available
        ]

        with pytest.raises(ValidationError) as exc_info:
            StockService.validate_and_reserve_stock(items_data)

        assert "Not enough stock" in str(exc_info.value)
        assert "Requested: 11" in str(exc_info.value)

        # Stock should not be deducted
        product.refresh_from_db()
        assert product.stock_quantity == 10

    @pytest.mark.django_db(transaction=True)
    def test_validate_and_reserve_stock_concurrent_orders(self, product_factory):
        """Test concurrent stock reservations do not oversell the same product."""
        product = product_factory(price=Decimal("100.00"), stock_quantity=5)

        start_barrier = threading.Barrier(2)
        success_results = []
        errors = []

        def reserve_stock(quantity):
            close_old_connections()
            try:
                start_barrier.wait()
                result = StockService.validate_and_reserve_stock(
                    [{"product_id": product.id, "quantity": quantity}]
                )
                success_results.append(result)
            except ValidationError as exc:
                errors.append(str(exc))
            finally:
                close_old_connections()

        thread_1 = threading.Thread(target=reserve_stock, args=(4,))
        thread_2 = threading.Thread(target=reserve_stock, args=(4,))

        thread_1.start()
        thread_2.start()
        thread_1.join()
        thread_2.join()

        product.refresh_from_db()

        assert len(success_results) == 1
        assert len(errors) == 1
        assert "Not enough stock" in errors[0]
        assert product.stock_quantity == 1


class TestPricingService:
    """Test suite for PricingService."""

    def test_calculate_order_total(self):
        """Test total price calculation for multiple items."""
        prepared_items = [
            {"price_snapshot": Decimal("100.00"), "quantity": 2},
            {"price_snapshot": Decimal("50.00"), "quantity": 3},
            {"price_snapshot": Decimal("25.50"), "quantity": 1},
        ]

        total = PricingService.calculate_order_total(prepared_items)

        # Expected: (100 * 2) + (50 * 3) + (25.50 * 1) = 200 + 150 + 25.50 = 375.50
        assert total == Decimal("375.50")

    def test_calculate_order_total_single_item(self):
        """Test total price calculation for a single item."""
        prepared_items = [
            {"price_snapshot": Decimal("99.99"), "quantity": 1},
        ]

        total = PricingService.calculate_order_total(prepared_items)

        assert total == Decimal("99.99")

    def test_calculate_order_total_empty_list(self):
        """Test total price calculation for empty order."""
        prepared_items = []

        total = PricingService.calculate_order_total(prepared_items)

        assert total == Decimal("0.00")

    def test_calculate_item_subtotal(self):
        """Test subtotal calculation for a single item."""
        price = Decimal("15.99")
        quantity = 5

        subtotal = PricingService.calculate_item_subtotal(price, quantity)

        assert subtotal == Decimal("79.95")

    def test_calculate_item_subtotal_single_quantity(self):
        """Test subtotal when quantity is 1."""
        price = Decimal("42.50")
        quantity = 1

        subtotal = PricingService.calculate_item_subtotal(price, quantity)

        assert subtotal == Decimal("42.50")


class TestOrderService:
    """Test suite for OrderService."""

    @pytest.mark.django_db
    def test_create_order_success(self, user_factory, product_factory):
        """Test successful order creation with all components."""
        user = user_factory()
        product1 = product_factory(price=Decimal("100.00"), stock_quantity=10)
        product2 = product_factory(price=Decimal("50.00"), stock_quantity=5)

        order_data = {
            "customer_name": "John Doe",
            "email": "john@example.com",
            "phone": "+421900123456",
            "street": "Test Street 123",
            "city": "Bratislava",
            "postal_code": "811 01",
            "is_company": False,
            "payment_method": "bank_transfer",
            "items": [
                {"product_id": product1.id, "quantity": 2},
                {"product_id": product2.id, "quantity": 1},
            ],
        }

        service = OrderService(user=user)
        order = service.create_order(order_data)

        # Verify order was created
        assert order.id is not None
        assert order.user == user
        assert order.customer_name == "John Doe"
        assert order.email == "john@example.com"
        assert order.total_price == Decimal("250.00")  # (100 * 2) + (50 * 1)
        assert order.status == "awaiting_payment"  # bank_transfer status
        assert len(order.order_number) == 8

        # Verify order items were created
        assert order.items.count() == 2
        item1 = order.items.get(product=product1)
        assert item1.quantity == 2
        assert item1.price_snapshot == Decimal("100.00")

        # Verify stock was deducted
        product1.refresh_from_db()
        product2.refresh_from_db()
        assert product1.stock_quantity == 8
        assert product2.stock_quantity == 4

    @pytest.mark.django_db
    def test_create_order_unauthenticated_user(self, product_factory):
        """Test order creation without authenticated user."""
        product = product_factory(price=Decimal("75.00"), stock_quantity=10)

        order_data = {
            "customer_name": "Guest User",
            "email": "guest@example.com",
            "phone": "+421900000000",
            "street": "Guest Street 1",
            "city": "Kosice",
            "postal_code": "040 01",
            "is_company": False,
            "payment_method": "card",
            "items": [
                {"product_id": product.id, "quantity": 1},
            ],
        }

        # Create service without user
        service = OrderService(user=None)
        order = service.create_order(order_data)

        assert order.id is not None
        assert order.user is None  # No user associated
        assert order.total_price == Decimal("75.00")

    @pytest.mark.django_db
    def test_create_order_card_payment_status(self, user_factory, product_factory):
        """Test that card payment creates order with 'new' status."""
        user = user_factory()
        product = product_factory(price=Decimal("50.00"), stock_quantity=5)

        order_data = {
            "customer_name": "Test User",
            "email": "test@example.com",
            "phone": "+421900111222",
            "payment_method": "card",  # Not bank_transfer
            "items": [
                {"product_id": product.id, "quantity": 1},
            ],
        }

        service = OrderService(user=user)
        order = service.create_order(order_data)

        assert order.status == "new"  # Card payment gets 'new' status

    @pytest.mark.django_db
    def test_create_order_bank_transfer_status(self, user_factory, product_factory):
        """Test that bank transfer creates order with 'awaiting_payment' status."""
        user = user_factory()
        product = product_factory(price=Decimal("50.00"), stock_quantity=5)

        order_data = {
            "customer_name": "Test User",
            "email": "test@example.com",
            "phone": "+421900111222",
            "payment_method": "bank_transfer",
            "items": [
                {"product_id": product.id, "quantity": 1},
            ],
        }

        service = OrderService(user=user)
        order = service.create_order(order_data)

        assert order.status == "awaiting_payment"

    @pytest.mark.django_db
    def test_create_order_company_details(self, user_factory, product_factory):
        """Test order creation with company information."""
        user = user_factory()
        product = product_factory(price=Decimal("100.00"), stock_quantity=10)

        order_data = {
            "customer_name": "John Doe",
            "email": "john@company.com",
            "phone": "+421900123456",
            "is_company": True,
            "company_name": "Test Company s.r.o.",
            "ico": "12345678",
            "dic": "1234567890",
            "dic_dph": "SK1234567890",
            "payment_method": "bank_transfer",
            "items": [
                {"product_id": product.id, "quantity": 1},
            ],
        }

        service = OrderService(user=user)
        order = service.create_order(order_data)

        assert order.is_company is True
        assert order.company_name == "Test Company s.r.o."
        assert order.ico == "12345678"
        assert order.dic == "1234567890"
        assert order.dic_dph == "SK1234567890"

    @pytest.mark.django_db
    def test_create_order_generates_unique_order_number(
        self, user_factory, product_factory
    ):
        """Test that each order gets a unique order number."""
        user = user_factory()
        product = product_factory(price=Decimal("50.00"), stock_quantity=20)

        order_data = {
            "customer_name": "Test User",
            "email": "test@example.com",
            "phone": "+421900000000",
            "payment_method": "card",
            "items": [
                {"product_id": product.id, "quantity": 1},
            ],
        }

        service = OrderService(user=user)

        # Create multiple orders
        order1 = service.create_order(order_data.copy())
        order2 = service.create_order(order_data.copy())
        order3 = service.create_order(order_data.copy())

        # Verify all order numbers are unique
        order_numbers = {order1.order_number, order2.order_number, order3.order_number}
        assert len(order_numbers) == 3  # All unique

    @pytest.mark.django_db
    def test_create_order_transaction_rollback_on_error(
        self, user_factory, product_factory
    ):
        """Test that transaction rolls back if order creation fails."""
        user = user_factory()
        product = product_factory(price=Decimal("50.00"), stock_quantity=5)

        order_data = {
            "customer_name": "Test User",
            "email": "test@example.com",
            "phone": "+421900000000",
            "payment_method": "card",
            "items": [
                {"product_id": product.id, "quantity": 10},  # More than available
            ],
        }

        service = OrderService(user=user)

        # This should fail due to insufficient stock
        with pytest.raises(ValidationError):
            service.create_order(order_data)

        # Verify no order was created
        assert Order.objects.count() == 0
        assert OrderItem.objects.count() == 0

        # Verify stock was not deducted
        product.refresh_from_db()
        assert product.stock_quantity == 5

    def test_generate_order_number_format(self):
        """Test order number generation format."""
        service = OrderService(user=None)

        order_number = service._generate_order_number()

        # Should be 8 characters, uppercase alphanumeric
        assert len(order_number) == 8
        assert order_number == order_number.upper()
        assert order_number.isalnum()

    def test_determine_initial_status_bank_transfer(self):
        """Test status determination for bank transfer."""
        service = OrderService(user=None)

        status = service._determine_initial_status("bank_transfer")

        assert status == "awaiting_payment"

    def test_determine_initial_status_card(self):
        """Test status determination for card payment."""
        service = OrderService(user=None)

        status = service._determine_initial_status("card")

        assert status == "new"

    @pytest.mark.django_db
    def test_create_order_rolls_back_when_item_creation_fails(
        self, user_factory, product_factory
    ):
        """Test full rollback when order item creation fails after stock reservation."""
        user = user_factory()
        product = product_factory(price=Decimal("20.00"), stock_quantity=10)
        order_data = {
            "customer_name": "Rollback User",
            "email": "rollback@example.com",
            "phone": "+421900555555",
            "payment_method": "card",
            "items": [{"product_id": product.id, "quantity": 3}],
        }

        service = OrderService(user=user)

        with patch.object(
            service,
            "_create_order_items",
            side_effect=RuntimeError("Order item write failed"),
        ):
            with pytest.raises(RuntimeError, match="Order item write failed"):
                service.create_order(order_data)

        assert Order.objects.count() == 0
        assert OrderItem.objects.count() == 0
        product.refresh_from_db()
        assert product.stock_quantity == 10

    @pytest.mark.django_db
    def test_create_order_sends_notifications_after_commit(
        self, user_factory, product_factory, django_capture_on_commit_callbacks
    ):
        """Test that OrderService invokes order email notifications after order creation."""
        user = user_factory()
        product = product_factory(price=Decimal("15.00"), stock_quantity=5)
        order_data = {
            "customer_name": "Notify User",
            "email": "notify@example.com",
            "phone": "+421900666666",
            "payment_method": "card",
            "items": [{"product_id": product.id, "quantity": 1}],
        }

        with patch(
            "orders.services.order_service.OrderEmailService.send_confirmation_emails",
            return_value=True,
        ) as mock_send_confirmation:
            with django_capture_on_commit_callbacks(execute=True):
                service = OrderService(user=user)
                order = service.create_order(order_data)

        assert order.id is not None
        mock_send_confirmation.assert_called_once()

    @pytest.mark.django_db
    def test_send_order_notifications_swallow_email_exceptions(self):
        """Test email notification errors are logged and not re-raised."""
        order = Order(order_number="ABCD1234")
        service = OrderService(user=None)

        with patch(
            "orders.services.order_service.OrderEmailService.send_confirmation_emails",
            side_effect=Exception("SMTP unavailable"),
        ):
            service._send_order_notifications(order)
