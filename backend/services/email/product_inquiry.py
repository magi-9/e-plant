"""Email service for product inquiry requests."""

import logging

from django.conf import settings
from django.utils.html import escape

from users.models import GlobalSettings

from .base import BaseEmailService

logger = logging.getLogger(__name__)


class ProductInquiryEmailService(BaseEmailService):
    """Service for sending product inquiry emails to warehouse."""

    def send_product_inquiry(
        self,
        product_name: str,
        customer_name: str,
        customer_email: str,
        message: str,
    ) -> bool:
        """
        Send product inquiry email to warehouse.

        Args:
            product_name: Name of the product being inquired about
            customer_name: Name of the customer (from profile)
            customer_email: Email of the customer
            message: Customer's message/description for the inquiry

        Returns:
            True if email was sent successfully
        """
        shop = GlobalSettings.objects.get_settings()
        warehouse_email = shop.warehouse_email or getattr(
            settings, "WAREHOUSE_EMAIL", "warehouse@dentalshop.sk"
        )

        subject = f"Dotaz na produkt: {product_name}"
        html_body = self._build_inquiry_html(
            product_name, customer_name, customer_email, message
        )
        text_body = self._build_inquiry_text(
            product_name, customer_name, customer_email, message
        )

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            to_email=warehouse_email,
            fail_silently=True,
        )
        return sent_count > 0

    @staticmethod
    def _build_inquiry_html(
        product_name: str, customer_name: str, customer_email: str, message: str
    ) -> str:
        """Build HTML version of product inquiry email."""
        safe_product_name = escape(product_name)
        safe_customer_name = escape(customer_name)
        safe_customer_email = escape(customer_email)
        safe_message = escape(message).replace("\n", "<br>")

        return f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Nový dotaz na produkt</h2>
                <p><strong>Produkt:</strong> {safe_product_name}</p>
                <p><strong>Meno zákazníka:</strong> {safe_customer_name}</p>
                <p>
                    <strong>Email zákazníka:</strong>
                    <a href="mailto:{safe_customer_email}">{safe_customer_email}</a>
                </p>
                <hr />
                <h3>Správa:</h3>
                <p>{safe_message}</p>
            </body>
        </html>
        """

    @staticmethod
    def _build_inquiry_text(
        product_name: str, customer_name: str, customer_email: str, message: str
    ) -> str:
        """Build plain text version of product inquiry email."""
        return f"""
Nový dotaz na produkt

Produkt: {product_name}
Meno zákazníka: {customer_name}
Email zákazníka: {customer_email}

Správa:
{message}
        """.strip()
