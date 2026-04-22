import json
import os
import time
import uuid
from decimal import Decimal
from urllib.error import URLError
from urllib.request import Request, urlopen

import pytest
from django.conf import settings
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

MAILHOG_HTTP_HOST = os.environ.get("MAILHOG_HTTP_HOST", "mailhog")
MAILHOG_HTTP_PORT = int(os.environ.get("MAILHOG_HTTP_PORT", "8025"))
MAILHOG_BASE_URL = f"http://{MAILHOG_HTTP_HOST}:{MAILHOG_HTTP_PORT}"


def _mailhog_request(path: str, method: str = "GET"):
    request = Request(f"{MAILHOG_BASE_URL}{path}", method=method)
    with urlopen(request, timeout=3) as response:
        return response.read().decode("utf-8")


def _mailhog_clear_messages() -> None:
    _mailhog_request("/api/v1/messages", method="DELETE")


def _mailhog_list_messages() -> list[dict]:
    payload = _mailhog_request("/api/v2/messages?limit=100")
    return json.loads(payload).get("items", [])


def _wait_for_mailhog_messages(
    expected_count: int, timeout_seconds: int = 6
) -> list[dict]:
    deadline = time.time() + timeout_seconds
    last_messages: list[dict] = []

    while time.time() < deadline:
        last_messages = _mailhog_list_messages()
        if len(last_messages) >= expected_count:
            return last_messages
        time.sleep(0.2)

    return last_messages


def _extract_recipients(message: dict) -> list[str]:
    to_headers = message.get("Content", {}).get("Headers", {}).get("To", [])
    recipients: list[str] = []
    for header_value in to_headers:
        parts = [part.strip() for part in header_value.split(",") if part.strip()]
        recipients.extend(parts)
    return recipients


def _mailhog_available() -> bool:
    try:
        _mailhog_list_messages()
    except (URLError, TimeoutError, OSError):
        return False
    return True


@pytest.fixture
def mailhog_guard():
    if not _mailhog_available():
        pytest.skip(
            "MailHog API is not reachable. Start docker compose services first."
        )

    _mailhog_clear_messages()
    yield
    _mailhog_clear_messages()


@pytest.mark.django_db(transaction=True)
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    EMAIL_HOST="mailhog",
    EMAIL_PORT=1025,
    EMAIL_USE_TLS=False,
)
def test_password_reset_request_delivers_email_to_mailhog(
    api_client, user_factory, mailhog_guard
):
    user = user_factory(email=f"mailhog-reset-{uuid.uuid4().hex[:8]}@example.com")

    response = api_client.post(
        reverse("password_reset_request"),
        {"email": user.email},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK

    messages = _wait_for_mailhog_messages(expected_count=1)
    assert len(messages) == 1

    recipients = _extract_recipients(messages[0])
    assert any(user.email in recipient for recipient in recipients)

    subject = (
        messages[0].get("Content", {}).get("Headers", {}).get("Subject", [""]) or [""]
    )[0]
    assert "obnovenie" in subject.lower() or "heslo" in subject.lower()


@pytest.mark.django_db(transaction=True)
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    EMAIL_HOST="mailhog",
    EMAIL_PORT=1025,
    EMAIL_USE_TLS=False,
)
def test_resend_verification_delivers_email_to_mailhog(
    api_client, user_factory, mailhog_guard
):
    user = user_factory(
        email=f"mailhog-verify-{uuid.uuid4().hex[:8]}@example.com",
        is_active=False,
    )

    response = api_client.post(
        reverse("resend_verification"),
        {"email": user.email},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK

    messages = _wait_for_mailhog_messages(expected_count=1)
    assert len(messages) == 1

    recipients = _extract_recipients(messages[0])
    assert any(user.email in recipient for recipient in recipients)

    body = messages[0].get("Content", {}).get("Body", "")
    assert "verify-email" in body


@pytest.mark.django_db(transaction=True)
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    EMAIL_HOST="mailhog",
    EMAIL_PORT=1025,
    EMAIL_USE_TLS=False,
)
def test_order_creation_delivers_customer_and_warehouse_emails_to_mailhog(
    api_client,
    user_factory,
    product_factory,
    zero_shipping,
    mailhog_guard,
):
    user = user_factory(email=f"mailhog-order-{uuid.uuid4().hex[:8]}@example.com")
    product = product_factory(
        name="Mailhog Product",
        price=Decimal("99.99"),
        stock_quantity=10,
    )

    api_client.force_authenticate(user=user)

    customer_email = f"mailhog-customer-{uuid.uuid4().hex[:8]}@example.com"
    response = api_client.post(
        reverse("order_create"),
        {
            "customer_name": "MailHog Customer",
            "email": customer_email,
            "phone": "+421900123456",
            "street": "Mailhog 1",
            "city": "Bratislava",
            "postal_code": "81101",
            "is_company": False,
            "payment_method": "bank_transfer",
            "items": [{"product_id": product.id, "quantity": 1}],
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED

    messages = _wait_for_mailhog_messages(expected_count=2)
    assert len(messages) >= 2

    all_recipients = {
        recipient for message in messages for recipient in _extract_recipients(message)
    }
    assert any(customer_email in recipient for recipient in all_recipients)
    assert any(settings.WAREHOUSE_EMAIL in recipient for recipient in all_recipients)
