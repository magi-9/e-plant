"""Authentication-related email service (verification, password reset)."""

import os
from typing import Optional

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from users.models import CustomUser
from .base import BaseEmailService
from .templates import verification_email_html, password_reset_email_html


class AuthEmailService(BaseEmailService):
    """Service for sending authentication-related emails."""

    def __init__(self, from_email: Optional[str] = None):
        """
        Initialize the auth email service.

        Args:
            from_email: Optional custom from email address
        """
        super().__init__(from_email)

    @staticmethod
    def _get_frontend_url() -> str:
        """Get the frontend base URL from environment, then settings, then default."""
        return (
            os.environ.get("FRONTEND_URL")
            or getattr(settings, "FRONTEND_URL", "http://localhost:5001")
        ).rstrip("/")

    def send_verification_email(self, user: CustomUser) -> bool:
        """
        Send email verification link to user.

        Args:
            user: The user to send verification email to

        Returns:
            True if email was sent successfully
        """
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"{self._get_frontend_url()}/verify-email/{uid}/{token}/"

        subject = "Overenie e-mailovej adresy - DentalShop"
        text_body = (
            "Dobrý deň,\n\n"
            "Ďakujeme za vašu registráciu na DentalShop.\n"
            "Pre dokončenie registrácie a aktiváciu vášho účtu kliknite na nasledujúci odkaz:\n\n"
            f"{verify_url}\n\n"
            "Ak ste si účet nevytvárali, tento e-mail môžete ignorovať.\n\n"
            "S pozdravom,\nDentalShop Tím"
        )
        html_body = verification_email_html(verify_url)

        return (
            self.send_email(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                to_email=user.email,
                fail_silently=True,
            )
            > 0
        )

    def send_password_reset_email(self, user: CustomUser) -> bool:
        """
        Send password reset link to user.

        Args:
            user: The user to send password reset email to

        Returns:
            True if email was sent successfully
        """
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{self._get_frontend_url()}/reset-password/{uid}/{token}/"

        subject = "Obnovenie hesla - DentalShop"
        text_body = (
            "Dobrý deň,\n\n"
            "Dostali sme žiadosť o obnovenie hesla pre váš účet na DentalShop.\n"
            "Pre nastavenie nového hesla kliknite na nasledujúci odkaz:\n\n"
            f"{reset_url}\n\n"
            "Odkaz je platný 30 minút.\n\n"
            "Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — "
            "vaše heslo zostane nezmenené.\n\n"
            "S pozdravom,\nDentalShop Tím"
        )
        html_body = password_reset_email_html(reset_url)

        return (
            self.send_email(
                subject=subject,
                text_body=text_body,
                html_body=html_body,
                to_email=user.email,
                fail_silently=True,
            )
            > 0
        )
