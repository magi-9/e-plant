import os
from .base import *  # noqa: F403, F401

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "e_plant_db"),
        "USER": os.environ.get("POSTGRES_USER", "postgres"),
        # Keep fallback aligned with docker-compose.yml defaults.
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "dev_password_change_me"),
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# Email configuration for development
# Mailhog catches all outgoing mail — view at http://localhost:8025
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "mailhog")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", 1025))
EMAIL_USE_TLS = False
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""
DEFAULT_FROM_EMAIL = "noreply@dentalshop.sk"
WAREHOUSE_EMAIL = "warehouse@dentalshop.sk"
