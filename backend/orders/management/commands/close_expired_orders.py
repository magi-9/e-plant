from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from orders.models import Order


class Command(BaseCommand):
    help = (
        "Cancel bank transfer orders that have been awaiting payment for over 24 hours."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Hours after which awaiting_payment orders are cancelled (default: 24).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print which orders would be cancelled without making changes.",
        )

    def handle(self, *args, **options):
        hours = options["hours"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(hours=hours)

        expired = Order.objects.filter(
            status="awaiting_payment",
            created_at__lt=cutoff,
        )

        count = expired.count()
        if count == 0:
            self.stdout.write("No expired orders found.")
            return

        if dry_run:
            for order in expired:
                self.stdout.write(
                    f"[dry-run] Would cancel order #{order.order_number} "
                    f"(created {order.created_at.isoformat()})"
                )
            self.stdout.write(f"[dry-run] {count} order(s) would be cancelled.")
            return

        updated = expired.update(status="cancelled")
        self.stdout.write(self.style.SUCCESS(f"Cancelled {updated} expired order(s)."))
