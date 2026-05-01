"""Order-related email service for confirmations and warehouse notifications."""

import logging
from typing import Optional

from django.conf import settings

from orders.invoice import generate_invoice_pdf, skonto_amount, skonto_date
from orders.models import Order
from users.models import DEFAULT_COMPANY_PROFILE, GlobalSettings

from .base import BaseEmailService
from .branding import get_company_name, get_order_status_label
from .templates import (
    final_invoice_customer_html,
    order_confirmation_customer_html,
    order_notification_warehouse_html,
)

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
        """Send confirmation emails with a pre-invoice (not a tax document) attached."""
        shop = GlobalSettings.objects.get_settings()
        try:
            pdf_bytes = self._generate_invoice_pdf(shop, pre_invoice=True)
        except Exception:
            logger.exception(
                "Failed to generate pre-invoice PDF for order %s",
                self.order.order_number,
            )
            pdf_bytes = None

        customer_sent = self._send_customer_confirmation(
            shop, pdf_bytes, pre_invoice=True
        )
        warehouse_sent = self._send_warehouse_notification(shop, pdf_bytes)

        return customer_sent or warehouse_sent

    def send_final_invoice_email(self) -> bool:
        """Send the real (tax document) invoice once, when order is paid/shipped/completed."""
        shop = GlobalSettings.objects.get_settings()
        try:
            pdf_bytes = self._generate_invoice_pdf(shop, pre_invoice=False)
        except Exception:
            logger.exception(
                "Failed to generate final invoice PDF for order %s",
                self.order.order_number,
            )
            pdf_bytes = None

        subject = f"Faktúra k objednávke #{self.order.order_number}"
        status_label = get_order_status_label(
            self.order.status, self.order.get_status_display()
        )
        text_body = self._build_customer_email_text(shop, status_label)
        html_body = final_invoice_customer_html(self.order, shop, status_label)

        attachments = []
        if pdf_bytes:
            filename = f"faktura_{self.order.order_number}.pdf"
            attachments.append((filename, pdf_bytes, "application/pdf"))

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            to_email=self.order.email,
            attachments=attachments,
            fail_silently=True,
        )
        return sent_count > 0

    def _generate_invoice_pdf(self, shop, pre_invoice: bool = False) -> Optional[bytes]:
        """Generate invoice PDF for the order."""
        return generate_invoice_pdf(self.order, shop, pre_invoice=pre_invoice)

    def _send_customer_confirmation(
        self, shop, pdf_bytes: Optional[bytes], pre_invoice: bool = False
    ) -> bool:
        """Send order confirmation email to customer with optional pre-invoice attachment."""
        subject = f"Potvrdenie objednávky #{self.order.order_number}"
        status_label = get_order_status_label(
            self.order.status, self.order.get_status_display()
        )
        text_body = self._build_customer_email_text(shop, status_label)
        html_body = order_confirmation_customer_html(self.order, shop, status_label)

        attachments = []
        if pdf_bytes:
            prefix = "predfaktura" if pre_invoice else "faktura"
            filename = f"{prefix}_{self.order.order_number}.pdf"
            attachments.append((filename, pdf_bytes, "application/pdf"))

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            to_email=self.order.email,
            attachments=attachments,
            fail_silently=True,
        )
        return sent_count > 0

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
            settings, "WAREHOUSE_EMAIL", DEFAULT_COMPANY_PROFILE["warehouse_email"]
        )

        subject = f"Nová objednávka #{self.order.order_number}"
        company_name = (
            getattr(shop, "company_name", "") or ""
        ).strip() or get_company_name()
        status_label = get_order_status_label(
            self.order.status, self.order.get_status_display()
        )
        text_body = self._build_warehouse_email_text(company_name, status_label)
        html_body = order_notification_warehouse_html(
            self.order,
            company_name,
            status_label,
        )

        attachments = []
        if pdf_bytes:
            filename = f"faktura_{self.order.order_number}.pdf"
            attachments.append((filename, pdf_bytes, "application/pdf"))

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            to_email=warehouse_email,
            attachments=attachments,
            fail_silently=True,
        )
        return sent_count > 0

    def _build_customer_email_text(self, shop, status_label: str) -> str:
        """Build plain text version of customer confirmation email."""
        company_name = (
            getattr(shop, "company_name", "") or ""
        ).strip() or get_company_name()
        item_lines = []
        for item in self.order.items.select_related("product").prefetch_related(
            "batch_allocations__batch_lot"
        ):
            line = f"  - {item.product.name} x {item.quantity} @ {item.price_snapshot}€ = {item.get_subtotal()}€"
            batches = item.batch_allocations.all()
            if batches:
                batch_str = ", ".join(
                    f"{ba.batch_lot.batch_number} {ba.quantity}x" for ba in batches
                )
                line += f"\n    Šarža: {batch_str}"
            item_lines.append(line)
        items_text = "\n".join(item_lines)

        shipping_cost_display = (
            "Zadarmo"
            if self.order.shipping_method == "pickup"
            else f"{self.order.shipping_cost}€"
        )
        shipping_info = f"\nDOPRAVA: {self.order.get_shipping_method_display()} • {shipping_cost_display}"

        payment_info = ""
        if self.order.payment_method == "bank_transfer":
            iban_line = f"\nIBAN: {shop.iban}" if shop.iban else ""
            sk_date = skonto_date(self.order.created_at.date())
            sk_amount = skonto_amount(self.order.total_price)
            payment_info = f"""
PLATOBNÉ ÚDAJE:
Variabilný symbol: {self.order.order_number}{iban_line}
Suma: {self.order.total_price}€

Pri úhrade do {sk_date.strftime('%d.%m.%Y')}: {sk_amount:.2f}€ (-2% skonto za včasnú platbu)
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

Ďakujeme za Vašu objednávku v {company_name}!

ČÍSLO OBJEDNÁVKY: {self.order.order_number}
Stav: {status_label}

OBJEDNANÉ PRODUKTY:
{items_text}{shipping_info}

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
Tím {company_name}
"""

    def _build_warehouse_email_text(self, company_name: str, status_label: str) -> str:
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
                batch_str = ", ".join(
                    f"{ba.batch_lot.batch_number} {ba.quantity}x" for ba in batches
                )
                batch_line = f"\n    Šarža: {batch_str}"
            item_lines.append(
                f"  - {item.product.name} (ID: {item.product.id}) x {item.quantity}"
                f"{batch_line}\n"
                f"    →  zostatok na sklade: {remaining} ks{warning}"
            )
        items_text = "\n".join(item_lines)

        shipping_cost_display_wh = (
            "Zadarmo"
            if self.order.shipping_method == "pickup"
            else f"{self.order.shipping_cost}€"
        )

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

DOPRAVA: {self.order.get_shipping_method_display()} • {shipping_cost_display_wh}
Celková suma: {self.order.total_price}€
Platba: {self.order.get_payment_method_display()}
Stav: {status_label}

Poznámka zákazníka: {self.order.notes or "Žiadna"}

{company_name} - Interná notifikácia
"""

    def send_admin_intervention_email(self, reason: str) -> bool:
        """Notify customer that admin changed the order."""
        subject = f"Aktualizácia objednávky #{self.order.order_number}"
        text_body = (
            f"Dobrý deň {self.order.customer_name},\n\n"
            f"Vaša objednávka #{self.order.order_number} bola upravená administrátorom.\n"
            f"Aktuálny stav: {get_order_status_label(self.order.status, self.order.get_status_display())}\n"
            f"Nová celková suma: {self.order.total_price} €\n\n"
            f"Dôvod zásahu: {reason}\n\n"
            "Ak máte otázky, kontaktujte nás odpoveďou na tento email.\n\n"
            f"Tím {get_company_name()}\n"
        )

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            to_email=self.order.email,
            fail_silently=True,
        )
        return sent_count > 0

    def send_admin_deleted_email(self, reason: str) -> bool:
        """Notify customer that admin deleted the order."""
        subject = f"Objednávka #{self.order.order_number} bola zrušená"
        text_body = (
            f"Dobrý deň {self.order.customer_name},\n\n"
            f"Vaša objednávka #{self.order.order_number} bola administrátorom zrušená a vymazaná zo systému.\n"
            f"Dôvod zásahu: {reason}\n\n"
            "Ak už prebehla platba, kontaktujte nás pre doriešenie refundácie.\n\n"
            f"Tím {get_company_name()}\n"
        )

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            to_email=self.order.email,
            fail_silently=True,
        )
        return sent_count > 0
