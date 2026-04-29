import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403, F405
from .base import BASE_DIR
from .base import EMAIL_DOMAIN
from .base import MIDDLEWARE as BASE_MIDDLEWARE
from .base import REST_FRAMEWORK as BASE_REST_FRAMEWORK

DEBUG = False

MIDDLEWARE = (
    ["django_prometheus.middleware.PrometheusBeforeMiddleware"]
    + list(BASE_MIDDLEWARE)
    + ["django_prometheus.middleware.PrometheusAfterMiddleware"]
)

# Must raise error if not defined in production.
# Support both names to make Dokploy env configuration less fragile.
SECRET_KEY = os.environ.get("SECRET_KEY") or os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY is empty or missing. In Dokploy/.env files, avoid values that start with '#' "
        "(parsed as comment). Set SECRET_KEY (or DJANGO_SECRET_KEY) to a non-empty value."
    )


def _parse_csv_env(var_name: str, default: str) -> list[str]:
    """Split comma-separated env var values and ignore empty items."""
    return [
        item.strip()
        for item in os.environ.get(var_name, default).split(",")
        if item.strip()
    ]


_internal_allowed_hosts = ["localhost", "127.0.0.1", "backend"]
ALLOWED_HOSTS = list(
    dict.fromkeys(
        _parse_csv_env("ALLOWED_HOSTS", "localhost") + _internal_allowed_hosts
    )
)
CORS_ALLOWED_ORIGINS = _parse_csv_env("CORS_ALLOWED_ORIGINS", "http://localhost")

# CSRF Trusted origins (needed if using admin behind proxy/https)
CSRF_TRUSTED_ORIGINS = os.environ.get("CSRF_TRUSTED_ORIGINS", "https://localhost")
CSRF_TRUSTED_ORIGINS = _parse_csv_env("CSRF_TRUSTED_ORIGINS", CSRF_TRUSTED_ORIGINS)

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
        "HOST": (
            os.environ.get("DB_HOST")
            or os.environ.get("POSTGRES_HOST")
            or os.environ.get("DATABASE_HOST")
            or "postgres"
        ),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# Security Headers
# Traefik terminates SSL — do NOT set SECURE_SSL_REDIRECT=True (causes redirect loops).
# SECURE_PROXY_SSL_HEADER tells Django to trust the X-Forwarded-Proto header from Traefik.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# HSTS Configuration
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# NOTE: Content Security Policy (CSP) is set via Traefik middleware labels in
# docker-compose.prod.yml (eplant-security-headers). This covers both the frontend
# (serve container) and backend (/api, /admin) responses at the Traefik edge.

# Rate Limiting (Throttling) configuration for APIs
REST_FRAMEWORK = {
    **BASE_REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/hour",  # General anonymous requests
        "user": "500/hour",  # Authenticated users
        "auth.login": "10/hour",  # Login attempts
        "auth.register": "5/hour",  # Registration attempts
        "auth.password_reset": "5/hour",  # Password reset
        "products.create": "20/hour",  # Admin product creation
        "orders.create": "50/hour",  # Guest order creation
        "orders.lookup": "30/hour",  # Guest order status lookup (prevent enumeration)
    },
}

# Static files for production
STATIC_ROOT = BASE_DIR / "staticfiles"

# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    import warnings

    warnings.warn(
        "EMAIL_HOST_USER or EMAIL_HOST_PASSWORD not set — outgoing emails will fail.",
        RuntimeWarning,
    )

DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", f"noreply@{EMAIL_DOMAIN}")
WAREHOUSE_EMAIL = os.environ.get("WAREHOUSE_EMAIL", f"warehouse@{EMAIL_DOMAIN}")

LOG_LEVEL = os.environ.get("DJANGO_LOG_LEVEL", "INFO")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s %(levelname)s %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security.admin": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "orders": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "services.email": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Sentry — error tracking and performance monitoring
import logging  # noqa: E402 (needed after LOGGING dict)

import sentry_sdk  # noqa: E402
from sentry_sdk.integrations.django import DjangoIntegration  # noqa: E402
from sentry_sdk.integrations.logging import LoggingIntegration  # noqa: E402

SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(transaction_style="url"),
            # Capture logger.error() / logger.exception() as Sentry events
            LoggingIntegration(level=logging.WARNING, event_level=logging.ERROR),
        ],
        environment="production",
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
