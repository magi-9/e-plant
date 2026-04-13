import os
from .base import *  # noqa: F401, F403, F405
from .base import BASE_DIR, REST_FRAMEWORK as BASE_REST_FRAMEWORK

DEBUG = False

# Must raise error if not defined in production
SECRET_KEY = os.environ["SECRET_KEY"]

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost").split(",")
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost").split(
    ","
)

# CSRF Trusted origins (needed if using admin behind proxy/https)
CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS", "https://localhost"
).split(",")

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# Security Headers
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "False").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# HSTS Configuration
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# NOTE: Content Security Policy (CSP) is configured in nginx/conf.d/default.conf
# Django's SECURE_CONTENT_SECURITY_POLICY requires django-csp middleware.
# For now, CSP is handled by nginx which is sufficient since Traefik
# terminates SSL and nginx serves as reverse proxy.

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

DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@dentalshop.sk")
WAREHOUSE_EMAIL = os.environ.get("WAREHOUSE_EMAIL", "warehouse@dentalshop.sk")

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
    },
}
