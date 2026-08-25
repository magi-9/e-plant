"""Guard against unexpanded ${VAR} placeholders in prod settings.

docker-compose's `env_file:` does not expand ${VAR} references (unlike
`environment:`/build `args:` entries, which docker compose itself
interpolates). If a deployer's .env keeps the `${DOMAIN_MAIN}` style
placeholders from the .env.*.example templates, Django would otherwise
receive the literal placeholder text for ALLOWED_HOSTS/CORS_ALLOWED_ORIGINS/
CSRF_TRUSTED_ORIGINS, silently breaking CORS and host validation in
production. config.settings.prod must fail fast instead.

The mail settings need the same treatment, and are worse when wrong: a
DEFAULT_FROM_EMAIL of "noreply@${EMAIL_DOMAIN}" — or the half cleaned up
"noreply@$domain.tld" that actually reached production — makes the SMTP relay
reject every outgoing message, and nothing in the app surfaces it.

Importing config.settings.prod has real side effects (Sentry init, DB env
lookups, etc.), so each case is exercised in a subprocess with a minimal,
controlled environment rather than by importing the module in-process.
"""

import subprocess
import sys

BASE_ENV = {
    "DJANGO_SETTINGS_MODULE": "config.settings.prod",
    "SECRET_KEY": "test-secret-key",
    "POSTGRES_DB": "test_db",
    "POSTGRES_USER": "test_user",
    "POSTGRES_PASSWORD": "test_password",
    "EMAIL_HOST_USER": "test@example.com",
    "EMAIL_HOST_PASSWORD": "test-password",
}

IMPORT_SETTINGS_CODE = "import django; django.setup()"


def _run_with_env(extra_env: dict[str, str]) -> subprocess.CompletedProcess:
    import os

    env = {**os.environ, **BASE_ENV, **extra_env}
    return subprocess.run(
        [sys.executable, "-c", IMPORT_SETTINGS_CODE],
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_unexpanded_allowed_hosts_placeholder_raises():
    result = _run_with_env(
        {
            "ALLOWED_HOSTS": "${DOMAIN_MAIN},${DOMAIN_SUB}",
            "CORS_ALLOWED_ORIGINS": "https://example.com",
            "CSRF_TRUSTED_ORIGINS": "https://example.com",
        }
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "ALLOWED_HOSTS" in result.stderr
    assert "unexpanded" in result.stderr


def test_unexpanded_cors_allowed_origins_placeholder_raises():
    result = _run_with_env(
        {
            "ALLOWED_HOSTS": "example.com",
            "CORS_ALLOWED_ORIGINS": "https://${DOMAIN_MAIN}",
            "CSRF_TRUSTED_ORIGINS": "https://example.com",
        }
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "CORS_ALLOWED_ORIGINS" in result.stderr


def test_unexpanded_csrf_trusted_origins_placeholder_raises():
    result = _run_with_env(
        {
            "ALLOWED_HOSTS": "example.com",
            "CORS_ALLOWED_ORIGINS": "https://example.com",
            "CSRF_TRUSTED_ORIGINS": "https://${DOMAIN_SUB}",
        }
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "CSRF_TRUSTED_ORIGINS" in result.stderr


def test_literal_domain_values_do_not_raise():
    result = _run_with_env(
        {
            "ALLOWED_HOSTS": "example.com,shop.example.com",
            "CORS_ALLOWED_ORIGINS": "https://example.com,https://shop.example.com",
            "CSRF_TRUSTED_ORIGINS": "https://example.com,https://shop.example.com",
        }
    )
    assert result.returncode == 0, result.stderr


VALID_DOMAIN_ENV = {
    "ALLOWED_HOSTS": "example.com",
    "CORS_ALLOWED_ORIGINS": "https://example.com",
    "CSRF_TRUSTED_ORIGINS": "https://example.com",
}


def test_unexpanded_default_from_email_placeholder_raises():
    result = _run_with_env(
        {**VALID_DOMAIN_ENV, "DEFAULT_FROM_EMAIL": "noreply@${EMAIL_DOMAIN}"}
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "DEFAULT_FROM_EMAIL" in result.stderr


def test_half_substituted_email_with_bare_dollar_raises():
    """A stray '$' left behind by a manual ${VAR} clean-up must fail too.

    This is the shape that actually reached production: the braces were
    removed but the dollar sign was not, so the address stayed invalid while
    looking almost right.
    """
    result = _run_with_env(
        {**VALID_DOMAIN_ENV, "DEFAULT_FROM_EMAIL": "noreply@$shop.example.com"}
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "DEFAULT_FROM_EMAIL" in result.stderr


def test_unexpanded_warehouse_email_placeholder_raises():
    result = _run_with_env(
        {**VALID_DOMAIN_ENV, "WAREHOUSE_EMAIL": "sklad@$shop.example.com"}
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "WAREHOUSE_EMAIL" in result.stderr


def test_unexpanded_frontend_url_placeholder_raises():
    result = _run_with_env(
        {**VALID_DOMAIN_ENV, "FRONTEND_URL": "https://${DOMAIN_MAIN}"}
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "FRONTEND_URL" in result.stderr


def test_malformed_email_without_placeholder_raises():
    """Catches plain typos too, not just leftover placeholders."""
    result = _run_with_env(
        {**VALID_DOMAIN_ENV, "DEFAULT_FROM_EMAIL": "noreply-at-shop"}
    )
    assert result.returncode != 0
    assert "ImproperlyConfigured" in result.stderr
    assert "not a valid e-mail address" in result.stderr


def test_valid_email_settings_do_not_raise():
    result = _run_with_env(
        {
            **VALID_DOMAIN_ENV,
            "DEFAULT_FROM_EMAIL": "noreply@shop.example.com",
            "WAREHOUSE_EMAIL": "sklad@shop.example.com",
            "FRONTEND_URL": "https://shop.example.com",
        }
    )
    assert result.returncode == 0, result.stderr
