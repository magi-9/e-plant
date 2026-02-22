import os
from .base import *  # noqa: F403, F401
from .base import REST_FRAMEWORK as BASE_REST_FRAMEWORK

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
        "NAME": os.environ.get("POSTGRES_DB", "e_plant_db"),
        "USER": os.environ.get("POSTGRES_USER", "postgres"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "password"),
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

# Rate Limiting (Throttling) configuration for APIs
REST_FRAMEWORK = {
    **BASE_REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "100/day", "user": "1000/day"},
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
