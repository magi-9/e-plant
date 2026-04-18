"""Integration tests covering interactions between service-layer modules."""

from decimal import Decimal
from unittest.mock import patch

import pytest

from orders.services import OrderService
from products.services.product_service import ProductService
from users.services.user_service import UserService


@pytest.mark.django_db
class TestServiceIntegrationPoints:
    """Service integration tests across app boundaries."""

    def test_order_service_calls_email_service_on_order_creation(
        self,
        user_factory,
        product_factory,
        django_capture_on_commit_callbacks,
        zero_shipping,
    ):
        user = user_factory()
        product = product_factory(price=Decimal("60.00"), stock_quantity=6)

        order_data = {
            "customer_name": "Integration User",
            "email": "integration-order@example.com",
            "phone": "+421900123123",
            "payment_method": "bank_transfer",
            "items": [{"product_id": product.id, "quantity": 2}],
        }

        with patch(
            "orders.services.order_service.OrderEmailService.send_confirmation_emails",
            return_value=True,
        ) as mock_send:
            with django_capture_on_commit_callbacks(execute=True):
                order = OrderService(user=user).create_order(order_data)

        assert order.total_price == Decimal("120.00")
        mock_send.assert_called_once()

    def test_user_service_register_user_triggers_auth_email(self):
        with patch(
            "users.services.user_service.AuthEmailService.send_verification_email",
            return_value=True,
        ) as mock_send:
            user = UserService.register_user(
                email="integration-user@example.com",
                password="safe-password-123",
                is_active=False,
                send_verification_email=True,
            )

        assert user.email == "integration-user@example.com"
        assert user.is_active is False
        mock_send.assert_called_once_with(user)

    def test_user_service_register_user_can_skip_auth_email(self):
        with patch(
            "users.services.user_service.AuthEmailService.send_verification_email"
        ) as mock_send:
            user = UserService.register_user(
                email="integration-no-email@example.com",
                password="safe-password-123",
                is_active=False,
                send_verification_email=False,
            )

        assert user.email == "integration-no-email@example.com"
        mock_send.assert_not_called()

    def test_product_service_price_visibility_for_anonymous_user(self):
        class AnonymousUser:
            is_authenticated = False

        payload = {"id": 1, "name": "Plant", "price": Decimal("39.90")}
        result = ProductService.apply_price_visibility(payload, AnonymousUser())

        assert result["price"] is None

    def test_product_service_price_visibility_for_authenticated_user(
        self, user_factory
    ):
        user = user_factory()
        payload = {"id": 1, "name": "Plant", "price": Decimal("39.90")}

        result = ProductService.apply_price_visibility(payload, user)

        assert result["price"] == Decimal("39.90")

    def test_product_service_hides_nested_option_prices_for_anonymous_user(self):
        class AnonymousUser:
            is_authenticated = False

        payload = {
            "results": [
                {
                    "id": 1,
                    "name": "Grouped",
                    "price": Decimal("39.90"),
                    "parameters": {
                        "type": "wildcard_group",
                        "options": [
                            {"reference": "A", "price": Decimal("39.90")},
                            {"reference": "B", "price": Decimal("49.90")},
                        ],
                    },
                }
            ]
        }

        result = ProductService.apply_price_visibility(payload, AnonymousUser())

        assert result["results"][0]["price"] is None
        assert result["results"][0]["parameters"]["options"][0]["price"] is None
        assert result["results"][0]["parameters"]["options"][1]["price"] is None
