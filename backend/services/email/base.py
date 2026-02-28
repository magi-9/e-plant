"""Base email service with common email-sending functionality."""

import logging
from typing import Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


class BaseEmailService:
    """Base class for email services with common email-sending utilities."""

    def __init__(self, from_email: Optional[str] = None):
        """
        Initialize the email service.

        Args:
            from_email: The sender's email address. Defaults to DEFAULT_FROM_EMAIL.
        """
        self.from_email = from_email or getattr(
            settings, "DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk"
        )

    def send_email(
        self,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
        to_email: Optional[str] = None,
        to_list: Optional[list[str]] = None,
        attachments: Optional[list[tuple]] = None,
        fail_silently: bool = True,
    ) -> int:
        """
        Send an email with optional HTML alternative and attachments.

        Args:
            subject: Email subject line
            text_body: Plain text email body
            html_body: Optional HTML version of the email
            to_email: Single recipient email address
            to_list: List of recipient email addresses
            attachments: List of (filename, content, mimetype) tuples
            fail_silently: Whether to suppress exceptions during sending

        Returns:
            Number of successfully delivered messages (typically 0 or 1 for this method)
        """
        # Determine recipient list
        if to_email:
            to = [to_email]
        elif to_list:
            to = to_list
        else:
            logger.warning("No recipients specified for email: %s", subject)
            return 0

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=self.from_email,
                to=to,
            )

            if html_body:
                msg.attach_alternative(html_body, "text/html")

            if attachments:
                for filename, content, mimetype in attachments:
                    msg.attach(filename, content, mimetype)

            return msg.send(fail_silently=fail_silently)
        except Exception:
            logger.exception("Failed to send email '%s' to %s", subject, to)
            if not fail_silently:
                raise
            return 0
