"""
Email rate-limiting helpers and shared email-sending functions.

Rate limit rules (per unique key, e.g. "reset:user@example.com"):
  - Must wait 60 seconds between sends (cooldown).
  - After 5 sends since the last reset, the key is blocked for 2 hours.
  - Once a block expires the counter resets automatically.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
import os

from .models import EmailRateLimit

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

COOLDOWN_SECONDS = 60          # minimum gap between consecutive sends
MAX_ATTEMPTS = 5               # sends before triggering a block
BLOCK_HOURS = 2                # how long the block lasts


# --------------------------------------------------------------------------- #
# Rate limiting
# --------------------------------------------------------------------------- #

def check_and_record_rate_limit(key: str) -> str | None:
    """
    Check whether *key* is rate-limited.

    Returns an error message string if blocked/too-soon, otherwise ``None``
    and records the current send attempt.
    """
    now = timezone.now()
    record, _ = EmailRateLimit.objects.get_or_create(key=key)

    # Active block?
    if record.blocked_until and record.blocked_until > now:
        minutes_left = int((record.blocked_until - now).total_seconds() / 60) + 1
        return (
            f"Príliš veľa pokusov. Skúste to znova o {minutes_left} "
            f"{'minútu' if minutes_left == 1 else 'minút'}."
        )

    # Expired block → reset counter so the user can start fresh
    if record.blocked_until and record.blocked_until <= now:
        record.count = 0
        record.blocked_until = None

    # Cooldown between individual sends
    if record.last_sent:
        elapsed = (now - record.last_sent).total_seconds()
        if elapsed < COOLDOWN_SECONDS:
            wait = int(COOLDOWN_SECONDS - elapsed) + 1
            return f"Prosím počkajte {wait} sekúnd pred ďalším odoslaním."

    # Record the send
    record.count += 1
    record.last_sent = now

    if record.count >= MAX_ATTEMPTS:
        record.blocked_until = now + timedelta(hours=BLOCK_HOURS)
        record.count = 0  # reset for the next window after the block lifts

    record.save()
    return None


# --------------------------------------------------------------------------- #
# Email helpers
# --------------------------------------------------------------------------- #

def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:5001")


def send_verification_email(user) -> None:
    """Send (or resend) the e-mail verification link to *user*."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_url = f"{_frontend_url()}/verify-email/{uid}/{token}/"

    subject = "Overenie e-mailovej adresy - DentalShop"
    message = (
        "Dobrý deň,\n\n"
        "Ďakujeme za vašu registráciu na DentalShop.\n"
        "Pre dokončenie registrácie a aktiváciu vášho účtu kliknite na nasledujúci odkaz:\n\n"
        f"{verify_url}\n\n"
        "Ak ste si účet nevytvárali, tento e-mail môžete ignorovať.\n\n"
        "S pozdravom,\nDentalShop Tím"
    )

    try:
        send_mail(
            subject,
            message,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk"),
            [user.email],
            fail_silently=True,
        )
    except Exception as exc:
        print(f"[send_verification_email] Failed: {exc}")


def send_password_reset_email(user) -> None:
    """Send a password-reset link to *user*."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{_frontend_url()}/reset-password/{uid}/{token}/"

    subject = "Obnovenie hesla - DentalShop"
    message = (
        "Dobrý deň,\n\n"
        "Dostali sme žiadosť o obnovenie hesla pre váš účet na DentalShop.\n"
        "Pre nastavenie nového hesla kliknite na nasledujúci odkaz:\n\n"
        f"{reset_url}\n\n"
        "Odkaz je platný 3 dni.\n\n"
        "Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — "
        "vaše heslo zostane nezmenené.\n\n"
        "S pozdravom,\nDentalShop Tím"
    )

    try:
        send_mail(
            subject,
            message,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk"),
            [user.email],
            fail_silently=True,
        )
    except Exception as exc:
        print(f"[send_password_reset_email] Failed: {exc}")
