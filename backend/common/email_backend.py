import logging

from django.core.mail.backends.smtp import EmailBackend as SMTPEmailBackend
from prometheus_client import Counter

logger = logging.getLogger(__name__)

email_send_total = Counter(
    "eplant_email_send_total",
    "Outgoing e-mails handled by the SMTP backend, labelled by result.",
    ["result"],
)


class MonitoredEmailBackend(SMTPEmailBackend):
    """SMTP backend that records Prometheus counters for outgoing mail.

    A broken mail configuration is otherwise invisible: Django keeps calling
    send_mail(), the relay rejects every message and nobody notices until a
    customer reports a missing order confirmation. Counting the outcome makes
    the failure alertable from the /metrics/ endpoint Alloy already scrapes.

    Counters are safe under gunicorn's multiple workers because
    entrypoint.prod.sh provisions PROMETHEUS_MULTIPROC_DIR, which puts
    prometheus_client into multiprocess mode.
    """

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        try:
            sent = super().send_messages(email_messages) or 0
        except Exception:
            email_send_total.labels(result="error").inc(len(email_messages))
            logger.exception(
                "SMTP backend raised while sending %d message(s)", len(email_messages)
            )
            raise

        email_send_total.labels(result="sent").inc(sent)

        # fail_silently=True makes send_messages() return a short count instead
        # of raising, so the difference is the only trace of a rejected message.
        failed = len(email_messages) - sent
        if failed > 0:
            email_send_total.labels(result="failed").inc(failed)
            logger.warning(
                "SMTP backend delivered %d of %d message(s)", sent, len(email_messages)
            )

        return sent
