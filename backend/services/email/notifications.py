"""Notification email service for alerts and stock notifications."""

from typing import Optional

from django.utils.html import escape

from .base import BaseEmailService


class NotificationEmailService(BaseEmailService):
    """Service for sending notification emails."""

    def __init__(self, from_email: Optional[str] = None):
        """
        Initialize the notification email service.

        Args:
            from_email: Optional custom from email address
        """
        super().__init__(from_email)

    def send_low_stock_alert(
        self, product_name: str, current_stock: int, threshold: int, to_email: str
    ) -> bool:
        """
        Send low stock alert for a product.

        Args:
            product_name: Name of the product
            current_stock: Current stock quantity
            threshold: Stock threshold
            to_email: Email address to send the alert to

        Returns:
            True if email was sent successfully
        """
        subject = f"⚠️ Nízky stav skladu - {product_name}"
        text_body = (
            f"Produkt: {product_name}\n"
            f"Aktuálny stav: {current_stock} ks\n"
            f"Minimálny limit: {threshold} ks\n\n"
            "Prosím, doobjednajte produkt."
        )
        html_body = self._low_stock_alert_html(product_name, current_stock, threshold)

        return (
            self.send_email(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                to_email=to_email,
                fail_silently=True,
            )
            > 0
        )

    @staticmethod
    def _low_stock_alert_html(
        product_name: str, current_stock: int, threshold: int
    ) -> str:
        """Build HTML version of low stock alert email."""
        product_name_escaped = escape(product_name)
        return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Nízky stav skladu</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#dc2626;padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">⚠️ Nízky stav skladu</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Produkt <strong>{product_name_escaped}</strong> má nízky stav skladu a je potrebný nový nákup.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;margin-bottom:24px;border-collapse:collapse;">
              <tr>
                <td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;color:#991b1b;text-transform:uppercase;letter-spacing:0.8px;">Aktuálny stav</p>
                  <p style="margin:0;font-size:32px;font-weight:700;color:#dc2626;">{current_stock} ks</p>
                  <p style="margin:8px 0 0;font-size:12px;color:#991b1b;">Minimálny limit: {threshold} ks</p>
                </td>
              </tr>
            </table>
            <p style="color:#475569;font-size:14px;margin:0;">
              Prosím, doobjednajte produkt tak skoro ako možno.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">DentalShop &middot; Notifikácia skladu</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
