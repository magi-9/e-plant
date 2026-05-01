"""Shared branding and presentation helpers for email content."""

from users.models import DEFAULT_COMPANY_PROFILE, GlobalSettings


def get_company_name(default: str = DEFAULT_COMPANY_PROFILE["company_name"]) -> str:
    """Return seller/company name from GlobalSettings with safe fallback."""
    try:
        shop = GlobalSettings.objects.get_settings()
    except Exception:
        return default
    name = (getattr(shop, "company_name", "") or "").strip()
    return name or default


def get_order_status_label(status: str, fallback_display: str) -> str:
    """Return localized, email-friendly order status label."""
    labels = {
        "awaiting_payment": "Čaká na platbu",
        "paid": "Zaplatená",
        "shipped": "Odoslaná",
        "completed": "Ukončená",
        "cancelled": "Zrušená",
    }
    return labels.get(status, fallback_display)
