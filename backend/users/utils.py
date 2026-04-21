"""
Email rate-limiting helpers and shared email-sending functions.

Rate limit rules (per email-derived key, e.g. "reset:user@example.com"):
  - Must wait 60 seconds between sends (cooldown).
  - After 5 sends since the last reset, the key is blocked for 2 hours.
  - Once a block expires the counter resets automatically.
  - Rate-limiting is applied before the user lookup so that unknown
    and known email addresses receive consistent responses (no enumeration).
"""

import logging
import os
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .models import EmailRateLimit, GlobalSettings

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

COOLDOWN_SECONDS = 60  # minimum gap between consecutive sends
MAX_ATTEMPTS = 5  # sends before triggering a block
BLOCK_HOURS = 2  # how long the block lasts


# --------------------------------------------------------------------------- #
# Rate limiting
# --------------------------------------------------------------------------- #


def check_and_record_rate_limit(key: str) -> str | None:
    """
    Check whether *key* is rate-limited.

    Returns an error message string if blocked/too-soon, otherwise ``None``
    and records the current send attempt.

    The entire read-modify-write is wrapped in a transaction with
    select_for_update() to prevent race conditions under concurrent requests.
    """
    with transaction.atomic():
        # Ensure the row exists, then lock it for this transaction
        EmailRateLimit.objects.get_or_create(key=key)
        record = EmailRateLimit.objects.select_for_update().get(key=key)
        now = timezone.now()

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
    return os.environ.get("FRONTEND_URL", "http://localhost:5001").rstrip("/")


_PASSWORD_ERRORS_SK = {
    "password_too_short": "Heslo je príliš krátke. Musí mať aspoň 8 znakov.",
    "password_too_common": "Toto heslo je príliš bežné.",
    "password_entirely_numeric": "Heslo nesmí obsahovať iba číslice.",
    "password_too_similar": "Heslo je príliš podobné Vaším osobným údajom.",
}


def _translate_password_errors(exc) -> str:
    """Return a Slovak string summarising Django password ValidationError(s)."""
    messages = [
        _PASSWORD_ERRORS_SK.get(err.code, err.message) for err in exc.error_list
    ]
    return " ".join(messages)


def _verification_email_html(verify_url: str) -> str:
    """HTML template for account verification email."""
    company_name = (GlobalSettings.load().company_name or "").strip() or "E-Plant"
    return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Overenie e-mailovej adresy</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#2563eb;padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">{company_name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">Overenie e-mailovej adresy</h2>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Ďakujeme za Vašu registráciu na <strong>{company_name}</strong>!<br>
              Pre dokončenie registrácie a aktiváciu Vášho účtu kliknite na tlačidlo nižšie.
            </p>
            <a href="{verify_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;">
              Overiť e-mailovú adresu
            </a>
            <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;line-height:1.6;">
              Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
              <a href="{verify_url}" style="color:#2563eb;word-break:break-all;">{verify_url}</a>
            </p>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
              Ak ste si účet nevytvárali, tento e-mail môžete ignorovať.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">S pozdravom, <strong style="color:#64748b;">Tím {company_name}</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _password_reset_email_html(reset_url: str) -> str:
    """HTML template for password reset email."""
    company_name = (GlobalSettings.load().company_name or "").strip() or "E-Plant"
    return f"""<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Obnovenie hesla</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#2563eb;padding:28px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">{company_name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;text-align:center;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">Obnovenie hesla</h2>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Dostali sme žiadosť o obnovenie hesla pre Váš účet.<br>
              Kliknite na tlačidlo nižšie pre nastavenie nového hesla.
            </p>
            <a href="{reset_url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:700;">
              Nastaviť nové heslo
            </a>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;margin:24px 0 0;border-collapse:collapse;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0;font-size:13px;color:#92400e;">
                    <strong>&#x26A0; Pozor:</strong> Tento odkaz je platný iba <strong>30 minút</strong>.
                  </p>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;line-height:1.6;">
              Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
              <a href="{reset_url}" style="color:#2563eb;word-break:break-all;">{reset_url}</a>
            </p>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
              Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — Vaše heslo zostane nezmenené.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">S pozdravom, <strong style="color:#64748b;">Tím {company_name}</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_verification_email(user) -> None:
    """Send (or resend) the e-mail verification link to *user*."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_url = f"{_frontend_url()}/verify-email/{uid}/{token}/"

    company_name = (GlobalSettings.load().company_name or "").strip() or "E-Plant"
    subject = f"Overenie e-mailovej adresy - {company_name}"
    message = (
        "Dobrý deň,\n\n"
        f"Ďakujeme za vašu registráciu na {company_name}.\n"
        "Pre dokončenie registrácie a aktiváciu vášho účtu kliknite na nasledujúci odkaz:\n\n"
        f"{verify_url}\n\n"
        "Ak ste si účet nevytvárali, tento e-mail môžete ignorovať.\n\n"
        f"S pozdravom,\n{company_name} Tím"
    )

    try:
        send_mail(
            subject,
            message,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk"),
            [user.email],
            fail_silently=False,
            html_message=_verification_email_html(verify_url),
        )
    except Exception:
        logger.exception("[send_verification_email] Failed to send to %s", user.email)


def send_password_reset_email(user) -> None:
    """Send a password-reset link to *user*."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{_frontend_url()}/reset-password/{uid}/{token}/"

    company_name = (GlobalSettings.load().company_name or "").strip() or "E-Plant"
    subject = f"Obnovenie hesla - {company_name}"
    message = (
        "Dobrý deň,\n\n"
        f"Dostali sme žiadosť o obnovenie hesla pre váš účet na {company_name}.\n"
        "Pre nastavenie nového hesla kliknite na nasledujúci odkaz:\n\n"
        f"{reset_url}\n\n"
        "Odkaz je platný 30 minút.\n\n"
        "Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — "
        "vaše heslo zostane nezmenené.\n\n"
        f"S pozdravom,\n{company_name} Tím"
    )

    try:
        send_mail(
            subject,
            message,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk"),
            [user.email],
            fail_silently=False,
            html_message=_password_reset_email_html(reset_url),
        )
    except Exception:
        logger.exception("[send_password_reset_email] Failed to send to %s", user.email)
