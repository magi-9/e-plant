"""
Tests for:
  - POST /auth/password-reset/request/
  - POST /auth/password-reset/confirm/
  - POST /auth/resend-verification/
  - Email rate-limiting (cooldown + block)
"""

from datetime import timedelta

import pytest
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status

from users.models import EmailRateLimit, GlobalSettings
from users.utils import (
    BLOCK_HOURS,
    COOLDOWN_SECONDS,
    MAX_ATTEMPTS,
    check_and_record_rate_limit,
)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _make_reset_link(user):
    """Return (uid, token) for *user*."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return uid, token


# ─────────────────────────────────────────────────────────────────────────────
# password-reset/request/
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_password_reset_request_sends_email(api_client, user_factory):
    """A valid active user receives a password-reset e-mail."""
    user = user_factory(email="user@example.com")
    url = reverse("password_reset_request")

    response = api_client.post(url, {"email": user.email}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 1
    assert (
        "obnovenie" in mail.outbox[0].subject.lower()
        or "heslo" in mail.outbox[0].subject.lower()
    )
    assert user.email in mail.outbox[0].to
    assert "reset-password" in mail.outbox[0].body


@pytest.mark.django_db
def test_password_reset_request_unknown_email_returns_200(api_client):
    """Unknown e-mail still returns 200 (no user enumeration)."""
    url = reverse("password_reset_request")
    response = api_client.post(url, {"email": "nobody@example.com"}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 0  # nothing was sent


@pytest.mark.django_db
def test_password_reset_request_inactive_user_no_email(api_client, user_factory):
    """Inactive (unverified) accounts do not receive a reset link."""
    user = user_factory(is_active=False)
    url = reverse("password_reset_request")
    response = api_client.post(url, {"email": user.email}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_password_reset_request_missing_email(api_client):
    """Empty body returns 400."""
    url = reverse("password_reset_request")
    response = api_client.post(url, {}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_password_reset_email_escapes_company_name_in_html(api_client, user_factory):
    user = user_factory(email="escaped@example.com")
    settings = GlobalSettings.load()
    settings.company_name = "<script>alert(1)</script>"
    settings.save(update_fields=["company_name"])
    url = reverse("password_reset_request")

    response = api_client.post(url, {"email": user.email}, format="json")

    assert response.status_code == status.HTTP_200_OK
    html_body = mail.outbox[0].alternatives[0][0]
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html_body
    assert "<script>alert(1)</script>" not in html_body


# ─────────────────────────────────────────────────────────────────────────────
# password-reset/confirm/
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_password_reset_confirm_success(api_client, user_factory):
    """Valid uid + token + new password → password is changed."""
    user = user_factory()
    uid, token = _make_reset_link(user)
    url = reverse("password_reset_confirm")

    response = api_client.post(
        url,
        {"uid": uid, "token": token, "new_password": "newSecure99"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    user.refresh_from_db()
    assert user.check_password("newSecure99")


@pytest.mark.django_db
def test_password_reset_confirm_invalid_token(api_client, user_factory):
    """Tampered token is rejected."""
    user = user_factory()
    uid, _ = _make_reset_link(user)
    url = reverse("password_reset_confirm")

    response = api_client.post(
        url,
        {"uid": uid, "token": "invalid-token-xyz", "new_password": "newSecure99"},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_password_reset_confirm_invalid_uid(api_client):
    """Garbage uid is rejected."""
    url = reverse("password_reset_confirm")
    response = api_client.post(
        url,
        {"uid": "notavaliduid", "token": "sometoken", "new_password": "newSecure99"},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_password_reset_confirm_token_used_twice(api_client, user_factory):
    """A token can only be used once — second use is rejected."""
    user = user_factory()
    uid, token = _make_reset_link(user)
    url = reverse("password_reset_confirm")
    payload = {"uid": uid, "token": token, "new_password": "firstPassword1"}

    first = api_client.post(url, payload, format="json")
    assert first.status_code == status.HTTP_200_OK

    # Token is now invalid because Django's token generator hashes the password,
    # so changing the password hash invalidates any previously issued token.
    second = api_client.post(
        url,
        {"uid": uid, "token": token, "new_password": "secondPassword2"},
        format="json",
    )
    assert second.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_password_reset_confirm_too_short(api_client, user_factory):
    """Passwords shorter than 8 chars are rejected."""
    user = user_factory()
    uid, token = _make_reset_link(user)
    url = reverse("password_reset_confirm")

    response = api_client.post(
        url,
        {"uid": uid, "token": token, "new_password": "short"},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    user.refresh_from_db()
    assert not user.check_password("short")  # password unchanged


@pytest.mark.django_db
def test_password_reset_confirm_missing_fields(api_client):
    """Missing any required field returns 400."""
    url = reverse("password_reset_confirm")
    response = api_client.post(url, {"uid": "abc"}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────────────────────────────
# resend-verification/
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_resend_verification_sends_email(api_client, user_factory):
    """Inactive user receives a new verification e-mail."""
    user = user_factory(is_active=False, email="inactive@example.com")
    url = reverse("resend_verification")

    response = api_client.post(url, {"email": user.email}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 1
    assert user.email in mail.outbox[0].to
    assert "verify-email" in mail.outbox[0].body


@pytest.mark.django_db
def test_resend_verification_escapes_company_name_in_html(api_client, user_factory):
    user = user_factory(is_active=False, email="inactive2@example.com")
    settings = GlobalSettings.load()
    settings.company_name = "<img src=x onerror=alert(1)>"
    settings.save(update_fields=["company_name"])
    url = reverse("resend_verification")

    response = api_client.post(url, {"email": user.email}, format="json")

    assert response.status_code == status.HTTP_200_OK
    html_body = mail.outbox[0].alternatives[0][0]
    assert "&lt;img src=x onerror=alert(1)&gt;" in html_body
    assert "<img src=x onerror=alert(1)>" not in html_body


@pytest.mark.django_db
def test_resend_verification_already_active(api_client, user_factory):
    """Already-active accounts get a generic 200 (no enumeration) and no email is sent."""
    user = user_factory(is_active=True)
    url = reverse("resend_verification")

    response = api_client.post(url, {"email": user.email}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_resend_verification_unknown_email(api_client):
    """Unknown e-mail returns 200 (no user enumeration), nothing sent."""
    url = reverse("resend_verification")
    response = api_client.post(url, {"email": "ghost@example.com"}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_resend_verification_missing_email(api_client):
    """Empty body returns 400."""
    url = reverse("resend_verification")
    response = api_client.post(url, {}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────────────────────────────
# Rate limiting – unit tests for check_and_record_rate_limit()
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_rate_limit_first_send_allowed():
    """First request is always allowed."""
    result = check_and_record_rate_limit("reset:fresh@example.com")
    assert result is None


@pytest.mark.django_db
def test_rate_limit_cooldown_blocks_immediate_resend():
    """A second request within COOLDOWN_SECONDS is rejected."""
    key = "reset:cooldown@example.com"
    check_and_record_rate_limit(key)  # first — OK

    result = check_and_record_rate_limit(key)  # second immediately — blocked
    assert result is not None
    assert "sekúnd" in result


@pytest.mark.django_db
def test_rate_limit_cooldown_passes_after_wait():
    """After the cooldown window the send is allowed again."""
    key = "reset:waitok@example.com"
    check_and_record_rate_limit(key)

    # Manually back-date last_sent so the cooldown has passed
    record = EmailRateLimit.objects.get(key=key)
    record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
    record.save()

    result = check_and_record_rate_limit(key)
    assert result is None


@pytest.mark.django_db
def test_rate_limit_blocks_after_max_attempts():
    """After MAX_ATTEMPTS sends the key is blocked for BLOCK_HOURS."""
    key = "reset:spammer@example.com"

    for i in range(MAX_ATTEMPTS):
        # Backdate last_sent so cooldown never fires
        record, _ = EmailRateLimit.objects.get_or_create(key=key)
        record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
        record.save()
        result = check_and_record_rate_limit(key)
        if i < MAX_ATTEMPTS - 1:
            assert result is None, f"Attempt {i + 1} should be allowed"
        else:
            # On the MAX_ATTEMPTS-th send the block is applied; the send still
            # succeeds but the next one will be blocked.
            assert result is None

    # Next attempt should be blocked
    result = check_and_record_rate_limit(key)
    assert result is not None
    assert "minút" in result or "minútu" in result


@pytest.mark.django_db
def test_rate_limit_block_expires():
    """After the block duration the key is unblocked and counter resets."""
    key = "reset:expired@example.com"
    record = EmailRateLimit.objects.create(
        key=key,
        count=0,
        last_sent=timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1),
        blocked_until=timezone.now()
        - timedelta(hours=BLOCK_HOURS + 1),  # already expired
    )
    _ = record  # silence lint

    result = check_and_record_rate_limit(key)
    assert result is None  # block has expired → allowed


@pytest.mark.django_db
def test_rate_limit_active_block_returns_minutes():
    """An active block returns a human-readable wait message."""
    key = "reset:blocked@example.com"
    EmailRateLimit.objects.create(
        key=key,
        count=0,
        last_sent=timezone.now(),
        blocked_until=timezone.now() + timedelta(hours=BLOCK_HOURS),
    )

    result = check_and_record_rate_limit(key)
    assert result is not None
    assert "minút" in result or "minútu" in result


# ─────────────────────────────────────────────────────────────────────────────
# Rate limiting – integration tests through the HTTP endpoints
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
def test_password_reset_request_rate_limited_via_api(api_client, user_factory):
    """Spamming the password-reset endpoint returns 429 after exhausting quota."""
    user = user_factory()
    url = reverse("password_reset_request")
    key = f"reset:{user.email.lower()}"

    for _ in range(MAX_ATTEMPTS):
        # Bypass cooldown between iterations
        record, _ = EmailRateLimit.objects.get_or_create(key=key)
        record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
        record.save()
        api_client.post(url, {"email": user.email}, format="json")

    # Next request should be 429
    record = EmailRateLimit.objects.get(key=key)
    record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
    record.save()

    response = api_client.post(url, {"email": user.email}, format="json")
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_resend_verification_rate_limited_via_api(api_client, user_factory):
    """Spamming the resend-verification endpoint returns 429 after exhausting quota."""
    user = user_factory(is_active=False)
    url = reverse("resend_verification")
    key = f"verify:{user.email.lower()}"

    for _ in range(MAX_ATTEMPTS):
        record, _ = EmailRateLimit.objects.get_or_create(key=key)
        record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
        record.save()
        api_client.post(url, {"email": user.email}, format="json")

    record = EmailRateLimit.objects.get(key=key)
    record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
    record.save()

    response = api_client.post(url, {"email": user.email}, format="json")
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_unknown_email_gets_429_after_quota_exhausted(api_client):
    """An unknown email address can also exhaust the rate limit and receive 429.

    This ensures both known and unknown emails are treated consistently,
    preventing account enumeration via differing response codes.
    """
    email = "ghost@example.com"
    url = reverse("password_reset_request")
    key = f"reset:{email}"

    for _ in range(MAX_ATTEMPTS):
        record, _ = EmailRateLimit.objects.get_or_create(key=key)
        record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
        record.save()
        api_client.post(url, {"email": email}, format="json")

    record = EmailRateLimit.objects.get(key=key)
    record.last_sent = timezone.now() - timedelta(seconds=COOLDOWN_SECONDS + 1)
    record.save()

    response = api_client.post(url, {"email": email}, format="json")
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_cooldown_between_reset_requests_via_api(api_client, user_factory):
    """Second password-reset request within 60 s returns 429 with cooldown message."""
    user = user_factory()
    url = reverse("password_reset_request")

    first = api_client.post(url, {"email": user.email}, format="json")
    assert first.status_code == status.HTTP_200_OK

    second = api_client.post(url, {"email": user.email}, format="json")
    assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "sekúnd" in second.data.get("error", "")
