"""Comprehensive tests for email service layer."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth import get_user_model

from services.email import (
    OrderEmailService,
    AuthEmailService,
    NotificationEmailService,
)
from services.email.base import BaseEmailService
from orders.models import Order
from products.models import Product

User = get_user_model()


class TestBaseEmailService(TestCase):
    """Test the BaseEmailService."""

    def setUp(self):
        self.service = BaseEmailService()

    @patch("services.email.base.EmailMultiAlternatives.send")
    def test_send_email_simple(self, mock_send):
        """Test sending a simple email."""
        mock_send.return_value = 1

        result = self.service.send_email(
            subject="Test",
            text_body="Test body",
            to_email="test@example.com",
        )

        assert result == 1
        mock_send.assert_called_once()

    @patch("services.email.base.EmailMultiAlternatives.send")
    def test_send_email_with_html(self, mock_send):
        """Test sending email with HTML alternative."""
        mock_send.return_value = 1

        result = self.service.send_email(
            subject="Test",
            text_body="Text version",
            html_body="<p>HTML version</p>",
            to_email="test@example.com",
        )

        assert result == 1
        mock_send.assert_called_once()

    @patch("services.email.base.EmailMultiAlternatives.send")
    def test_send_email_with_attachment(self, mock_send):
        """Test sending email with attachments."""
        mock_send.return_value = 1

        result = self.service.send_email(
            subject="Test",
            text_body="Test body",
            to_email="test@example.com",
            attachments=[("test.pdf", b"PDF content", "application/pdf")],
        )

        assert result == 1
        mock_send.assert_called_once()

    @patch("services.email.base.EmailMultiAlternatives.send")
    def test_send_email_to_list(self, mock_send):
        """Test sending email to multiple recipients."""
        mock_send.return_value = 2

        result = self.service.send_email(
            subject="Test",
            text_body="Test body",
            to_list=["test1@example.com", "test2@example.com"],
        )

        assert result == 2

    @patch("services.email.base.EmailMultiAlternatives.send")
    def test_send_email_no_recipients(self, mock_send):
        """Test sending email without recipients."""
        result = self.service.send_email(
            subject="Test",
            text_body="Test body",
        )

        assert result == 0
        mock_send.assert_not_called()

    @patch("services.email.base.EmailMultiAlternatives.send")
    def test_send_email_exception_handling(self, mock_send):
        """Test exception handling when email fails."""
        mock_send.side_effect = Exception("SMTP error")

        result = self.service.send_email(
            subject="Test",
            text_body="Test body",
            to_email="test@example.com",
            fail_silently=True,
        )

        assert result == 0

    def test_send_email_exception_not_silent(self):
        """Test that exception is raised when fail_silently=False."""
        with patch("services.email.base.EmailMultiAlternatives.send") as mock_send:
            mock_send.side_effect = Exception("SMTP error")

            with pytest.raises(Exception):
                self.service.send_email(
                    subject="Test",
                    text_body="Test body",
                    to_email="test@example.com",
                    fail_silently=False,
                )


class TestAuthEmailService(TestCase):
    """Test the AuthEmailService."""

    def setUp(self):
        self.service = AuthEmailService()
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )

    @patch.object(AuthEmailService, "send_email")
    def test_send_verification_email(self, mock_send_email):
        """Test sending verification email."""
        mock_send_email.return_value = 1

        result = self.service.send_verification_email(self.user)

        assert result is True
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        assert "Overenie" in kwargs["subject"]
        assert kwargs["to_email"] == self.user.email
        assert "verify-email" in kwargs["html_body"]

    @patch.object(AuthEmailService, "send_email")
    def test_send_password_reset_email(self, mock_send_email):
        """Test sending password reset email."""
        mock_send_email.return_value = 1

        result = self.service.send_password_reset_email(self.user)

        assert result is True
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        assert "Obnovenie" in kwargs["subject"]
        assert kwargs["to_email"] == self.user.email
        assert "reset-password" in kwargs["html_body"]

    def test_frontend_url_from_env(self):
        """Test that frontend URL is read from environment."""
        with patch.dict("os.environ", {"FRONTEND_URL": "https://example.com"}):
            url = AuthEmailService._get_frontend_url()
            assert url == "https://example.com"

    def test_frontend_url_default(self):
        """Test default frontend URL."""
        with patch.dict("os.environ", {}, clear=True):
            # Clear FRONTEND_URL if it exists
            if "FRONTEND_URL" in __import__("os").environ:
                del __import__("os").environ["FRONTEND_URL"]
            url = AuthEmailService._get_frontend_url()
            assert "localhost:5001" in url


@pytest.mark.django_db
class TestOrderEmailService:
    """Test the OrderEmailService."""

    def setup_method(self):
        """Set up test fixtures."""
        self.product = Product.objects.create(
            name="Test Product",
            price=100.00,
            stock_quantity=10,
        )
        self.order = Order.objects.create(
            customer_name="John Doe",
            email="john@example.com",
            phone="1234567890",
            street="123 Main St",
            city="Test City",
            postal_code="12345",
            payment_method="bank_transfer",
            total_price=100.00,
        )
        from orders.models import OrderItem

        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price_snapshot=100.00,
        )

    @patch.object(OrderEmailService, "send_email")
    @patch("services.email.order_emails.generate_invoice_pdf")
    def test_send_confirmation_emails(self, mock_pdf, mock_send_email):
        """Test sending order confirmation emails."""
        mock_pdf.return_value = b"PDF content"
        mock_send_email.return_value = 1

        service = OrderEmailService(self.order)
        result = service.send_confirmation_emails()

        assert result is True
        assert mock_send_email.call_count == 2  # Customer and warehouse

    @patch.object(OrderEmailService, "send_email")
    @patch("services.email.order_emails.generate_invoice_pdf")
    def test_send_confirmation_emails_pdf_generation_fails(self, mock_pdf, mock_send_email):
        """Test that emails are sent even if PDF generation fails."""
        mock_pdf.side_effect = Exception("PDF generation failed")
        mock_send_email.return_value = 1

        service = OrderEmailService(self.order)
        result = service.send_confirmation_emails()

        assert result is True
        assert mock_send_email.call_count == 2  # Emails still sent

    @patch.object(OrderEmailService, "send_email")
    def test_send_customer_confirmation(self, mock_send_email):
        """Test sending customer confirmation email."""
        mock_send_email.return_value = 1

        service = OrderEmailService(self.order)
        result = service._send_customer_confirmation(None)

        assert result is True
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        assert "Potvrdenie" in kwargs["subject"]
        assert self.order.order_number in kwargs["subject"]

    @patch.object(OrderEmailService, "send_email")
    def test_send_warehouse_notification(self, mock_send_email):
        """Test sending warehouse notification email."""
        mock_send_email.return_value = 1

        service = OrderEmailService(self.order)
        result = service._send_warehouse_notification()

        assert result is True
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        assert "Nová objednávka" in kwargs["subject"]


class TestNotificationEmailService(TestCase):
    """Test the NotificationEmailService."""

    def setUp(self):
        self.service = NotificationEmailService()

    @patch.object(NotificationEmailService, "send_email")
    def test_send_low_stock_alert(self, mock_send_email):
        """Test sending low stock alert."""
        mock_send_email.return_value = 1

        result = self.service.send_low_stock_alert(
            product_name="Test Product",
            current_stock=2,
            threshold=5,
            to_email="warehouse@example.com",
        )

        assert result is True
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        assert "Nízky stav" in kwargs["subject"]
        assert kwargs["to_email"] == "warehouse@example.com"
        assert "Test Product" in kwargs["html_body"]


class TestEmailIntegration(TestCase):
    """Integration tests for email services."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="integration@example.com",
            password="testpass123",
        )

    @patch("django.core.mail.EmailMultiAlternatives.send")
    def test_full_registration_flow(self, mock_send):
        """Test complete registration with email verification."""
        mock_send.return_value = 1

        auth_service = AuthEmailService()
        auth_service.send_verification_email(self.user)

        mock_send.assert_called_once()

    @patch("django.core.mail.EmailMultiAlternatives.send")
    def test_full_password_reset_flow(self, mock_send):
        """Test complete password reset flow."""
        mock_send.return_value = 1

        auth_service = AuthEmailService()
        auth_service.send_password_reset_email(self.user)

        mock_send.assert_called_once()
