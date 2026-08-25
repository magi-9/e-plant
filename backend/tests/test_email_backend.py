"""Prometheus instrumentation of the outgoing-mail path.

A broken mail configuration is silent: Django keeps calling send_mail(), the
relay rejects everything and nothing surfaces it. MonitoredEmailBackend turns
that into a counter on /metrics/ so Grafana can alert on it.
"""

from unittest import mock

from prometheus_client import REGISTRY

from common.email_backend import MonitoredEmailBackend

SMTP_SEND = "django.core.mail.backends.smtp.EmailBackend.send_messages"


def _counter(result: str) -> float:
    """Current value of the counter, 0 when it has not been touched yet."""
    value = REGISTRY.get_sample_value("eplant_email_send_total", {"result": result})
    return value or 0.0


def test_successful_send_increments_sent_counter():
    backend = MonitoredEmailBackend()
    before = _counter("sent")

    with mock.patch(SMTP_SEND, return_value=2):
        sent = backend.send_messages([mock.Mock(), mock.Mock()])

    assert sent == 2
    assert _counter("sent") - before == 2


def test_raising_backend_increments_error_counter_and_reraises():
    backend = MonitoredEmailBackend()
    before = _counter("error")

    with mock.patch(SMTP_SEND, side_effect=OSError("relay refused sender")):
        try:
            backend.send_messages([mock.Mock(), mock.Mock()])
        except OSError:
            pass
        else:  # pragma: no cover - guards against silently swallowing errors
            raise AssertionError("MonitoredEmailBackend must re-raise SMTP errors")

    assert _counter("error") - before == 2


def test_partial_delivery_increments_failed_counter():
    """fail_silently=True returns a short count instead of raising."""
    backend = MonitoredEmailBackend()
    before_sent = _counter("sent")
    before_failed = _counter("failed")

    with mock.patch(SMTP_SEND, return_value=1):
        sent = backend.send_messages([mock.Mock(), mock.Mock(), mock.Mock()])

    assert sent == 1
    assert _counter("sent") - before_sent == 1
    assert _counter("failed") - before_failed == 2


def test_empty_message_list_is_a_noop():
    backend = MonitoredEmailBackend()
    before_sent = _counter("sent")
    before_error = _counter("error")

    with mock.patch(SMTP_SEND) as smtp_send:
        assert backend.send_messages([]) == 0

    smtp_send.assert_not_called()
    assert _counter("sent") == before_sent
    assert _counter("error") == before_error
