from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import CustomUser


class Command(BaseCommand):
    help = "Delete unverified accounts older than 2 hours."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=2,
            help="Age threshold in hours (default: 2).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without deleting.",
        )

    def handle(self, *args, **options):
        hours = options["hours"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(hours=hours)

        qs = CustomUser.objects.filter(is_active=False, date_joined__lt=cutoff)
        count = qs.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[dry-run] Would delete {count} unverified account(s) older than {hours}h."
                )
            )
            return

        qs.delete()
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {count} unverified account(s) older than {hours}h."
            )
        )
