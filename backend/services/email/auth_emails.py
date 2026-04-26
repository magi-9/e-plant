"""Authentication-related email service (verification, password reset)."""

import os
from typing import Optional

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from users.models import CustomUser

from .base import BaseEmailService
from .branding import get_company_name
from .templates import password_reset_email_html, verification_email_html


VERIFICATION_BRAND_NAME = "Dynamic Abutment"
VERIFICATION_SIGNATURE_NAME = "Martin Ebringer s.r.o."


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
        frontend_url = os.environ.get("FRONTEND_URL") or getattr(
            settings, "FRONTEND_URL", "http://localhost:5001"
        )
        return frontend_url.rstrip("/")

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
        company_name = get_company_name()

        subject = f"Overenie e-mailovej adresy - {VERIFICATION_BRAND_NAME}"
        text_body = (
            "Dobrý deň,\n\n"
            f"Ďakujeme za vašu registráciu na {VERIFICATION_BRAND_NAME}.\n"
            "Pre dokončenie registrácie a aktiváciu vášho účtu kliknite na nasledujúci odkaz:\n\n"
            f"{verify_url}\n\n"
            "Ak ste si účet nevytvárali, tento e-mail môžete ignorovať.\n\n"
            f"S pozdravom,\n{VERIFICATION_SIGNATURE_NAME}"
        )
        html_body = verification_email_html(verify_url, company_name)

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            to_email=user.email,
            fail_silently=True,
        )
        return sent_count > 0

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
        company_name = get_company_name()

        subject = f"Obnovenie hesla - {company_name}"
        text_body = (
            "Dobrý deň,\n\n"
            f"Dostali sme žiadosť o obnovenie hesla pre váš účet na {company_name}.\n"
            "Pre nastavenie nového hesla kliknite na nasledujúci odkaz:\n\n"
            f"{reset_url}\n\n"
            "Odkaz je platný 30 minút.\n\n"
            "Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — "
            "vaše heslo zostane nezmenené.\n\n"
            f"S pozdravom,\n{company_name} Tím"
        )
        html_body = password_reset_email_html(reset_url, company_name)

        sent_count = self.send_email(
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            to_email=user.email,
            fail_silently=True,
        )
        return sent_count > 0
