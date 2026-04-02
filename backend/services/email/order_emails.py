"""Order-related email service for confirmations and warehouse notifications."""

import logging
from typing import Optional

from django.conf import settings

from orders.models import Order
from users.models import GlobalSettings
from .base import BaseEmailService
from .templates import (
    order_confirmation_customer_html,
    order_notification_warehouse_html,
)
from orders.invoice import generate_invoice_pdf

logger = logging.getLogger(__name__)


class OrderEmailService(BaseEmailService):
    """Service for sending order-related emails."""

    def __init__(self, order: Order, from_email: Optional[str] = None):
        """
        Initialize the order email service.

        Args:
            order: The Order instance to send emails for
            from_email: Optional custom from email address
        """
        super().__init__(from_email)
        self.order = order

    def send_confirmation_emails(self) -> bool:
        """
        Send confirmation emails to customer and warehouse.

        Generates PDF invoice and attaches it to both customer and warehouse emails.
        Loads GlobalSettings once and reuses for all email operations.
        Logs any failures but does not raise exceptions.

        Returns:
            True if at least one email was sent successfully
        """
        shop = GlobalSettings.objects.get_settings()
        try:
            pdf_bytes = self._generate_invoice_pdf(shop)
        except Exception:
            logger.exception(
                "Failed to generate invoice PDF for order %s", self.order.order_number
            )
            pdf_bytes = None

        customer_sent = self._send_customer_confirmation(shop, pdf_bytes)
        warehouse_sent = self._send_warehouse_notification(shop, pdf_bytes)

        return customer_sent or warehouse_sent

    def _generate_invoice_pdf(self, shop) -> Optional[bytes]:
        """Generate invoice PDF for the order."""
        return generate_invoice_pdf(self.order, shop)

    def _send_customer_confirmation(self, shop, pdf_bytes: Optional[bytes]) -> bool:
        """
        Send order confirmation email to customer.

        Args:
            shop: GlobalSettings instance (pre-loaded to avoid extra queries)
            pdf_bytes: Optional PDF invoice bytes to attach

        Returns:
            True if email was sent successfully
        """
        subject = f"Potvrdenie objednávky #{self.order.order_number}"
        text_body = self._build_customer_email_text(shop)
        html_body = order_confirmation_customer_html(self.order, shop)

        attachments = []
        if pdf_bytes:
            filename = f"faktura_{self.order.order_number}.pdf"
            attachments.append((filename, pdf_bytes, "application/pdf"))

        return (
            self.send_email(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                to_email=self.order.email,
                attachments=attachments,
                fail_silently=True,
            )
            > 0
        )

    def _send_warehouse_notification(self, shop, pdf_bytes: Optional[bytes]) -> bool:
        """
        Send order notification email to warehouse.

        Args:
            shop: GlobalSettings instance (pre-loaded to avoid extra queries)
            pdf_bytes: Optional PDF invoice bytes to attach

        Returns:
            True if email was sent successfully
        """
        warehouse_email = shop.warehouse_email or getattr(
            settings, "WAREHOUSE_EMAIL", "warehouse@dentalshop.sk"
        )

        subject = f"Nová objednávka #{self.order.order_number}"
        text_body = self._build_warehouse_email_text()
        html_body = order_notification_warehouse_html(self.order)

        attachments = []
        if pdf_bytes:
            filename = f"faktura_{self.order.order_number}.pdf"
            attachments.append((filename, pdf_bytes, "application/pdf"))

        return (
            self.send_email(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                to_email=warehouse_email,
                attachments=attachments,
                fail_silently=True,
            )
            > 0
        )

    def _build_customer_email_text(self, shop) -> str:
        """Build plain text version of customer confirmation email."""
        item_lines = []
        for item in self.order.items.select_related("product").prefetch_related(
            "batch_allocations__batch_lot"
        ):
            line = f"  - {item.product.name} x {item.quantity} @ {item.price_snapshot}€ = {item.get_subtotal()}€"
            batches = item.batch_allocations.all()
            if batches:
                batch_str = ", ".join(ba.batch_lot.batch_number for ba in batches)
                line += f"\n    Šarža: {batch_str}"
            item_lines.append(line)
        items_text = "\n".join(item_lines)

        payment_info = ""
        if self.order.payment_method == "bank_transfer":
            iban_line = f"\nIBAN: {shop.iban}" if shop.iban else ""
            payment_info = f"""
PLATOBNÉ ÚDAJE:
Variabilný symbol: {self.order.order_number}{iban_line}
Suma: {self.order.total_price}€
"""

        company_info = ""
        if self.order.is_company:
            dic_dph_line = (
                f"\nIČ DPH: {self.order.dic_dph}" if self.order.dic_dph else ""
            )
            company_info = f"""
Fakturačné údaje:
{self.order.company_name}
IČO: {self.order.ico}
DIČ: {self.order.dic}{dic_dph_line}
"""

        return f"""Dobrý deň {self.order.customer_name},

Ďakujeme za Vašu objednávku v DentalShop!

ČÍSLO OBJEDNÁVKY: {self.order.order_number}
Stav: {self.order.get_status_display()}

OBJEDNANÉ PRODUKTY:
{items_text}

CELKOVÁ SUMA: {self.order.total_price}€

DODACIA ADRESA:
{self.order.street}
{self.order.city}, {self.order.postal_code}
{company_info}
Telefón: {self.order.phone}
Email: {self.order.email}
{payment_info}
Poznámka: {self.order.notes or "Žiadna"}

V prípade otázok nás neváhajte kontaktovať.

S pozdravom,
Tím DentalShop
"""

    def _build_warehouse_email_text(self) -> str:
        """Build plain text version of warehouse notification email."""
        item_lines = []
        for item in self.order.items.select_related("product").prefetch_related(
            "batch_allocations__batch_lot"
        ):
            remaining = item.product.stock_quantity
            threshold = item.product.low_stock_threshold
            warning = (
                "  ⚠ NÍZKY STAV – treba doobjednať!" if remaining < threshold else ""
            )
            batch_line = ""
            batches = item.batch_allocations.all()
            if batches:
                batch_str = ", ".join(ba.batch_lot.batch_number for ba in batches)
                batch_line = f"\n    Šarža: {batch_str}"
            item_lines.append(
                f"  - {item.product.name} (ID: {item.product.id}) x {item.quantity}"
                f"{batch_line}\n"
                f"    →  zostatok na sklade: {remaining} ks{warning}"
            )
        items_text = "\n".join(item_lines)

        company_info = ""
        if self.order.is_company:
            dic_dph_line = (
                f"\nIČ DPH: {self.order.dic_dph}" if self.order.dic_dph else ""
            )
            company_info = f"""
FIREMNÁ OBJEDNÁVKA:
{self.order.company_name}
IČO: {self.order.ico}
DIČ: {self.order.dic}{dic_dph_line}
"""

        return f"""NOVÁ OBJEDNÁVKA #{self.order.order_number}

Zákazník: {self.order.customer_name}
Email: {self.order.email}
Telefón: {self.order.phone}
{company_info}
Dodacia adresa:
{self.order.street}
{self.order.city}, {self.order.postal_code}

PRODUKTY NA VYSKLADNENIE:
{items_text}

Celková suma: {self.order.total_price}€
Platba: {self.order.get_payment_method_display()}
Stav: {self.order.get_status_display()}

Poznámka zákazníka: {self.order.notes or "Žiadna"}
"""
