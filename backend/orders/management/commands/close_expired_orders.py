from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from orders.models import Order
from orders.services import StockService


class Command(BaseCommand):
    help = (
        "Cancel bank transfer orders that have been awaiting payment for over 24 hours."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Hours after which awaiting_payment bank transfer orders are cancelled (default: 24).",
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
            payment_method="bank_transfer",
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

        updated = 0
        for order in expired.iterator():
            with transaction.atomic():
                locked = (
                    Order.objects.select_for_update()
                    .prefetch_related("items__batch_allocations")
                    .get(pk=order.pk)
                )
                StockService.restore_order_stock(locked)
                locked.status = "cancelled"
                locked.save(update_fields=["status", "updated_at"])
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"Cancelled {updated} expired order(s)."))
