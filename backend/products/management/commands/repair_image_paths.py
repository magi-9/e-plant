"""
Management command to audit and repair stale product image paths.

Usage:
  python manage.py repair_image_paths           # report mismatches only
  python manage.py repair_image_paths --fix     # clear stale paths in DB
"""

import os
from collections import Counter

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from products.models import Product


class Command(BaseCommand):
    help = "Audit and optionally repair stale product image paths."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Clear stale image paths from the database (default: report only).",
        )

    def handle(self, *args, **options):
        fix = options["fix"]
        media_root = str(settings.MEDIA_ROOT)

        products_with_image = Product.objects.exclude(image="").exclude(
            image__isnull=True
        )
        total = products_with_image.count()
        self.stdout.write(f"Checking {total} products with image paths...")

        missing = []
        ext_counter = Counter()
        ref_counter = Counter()

        for product in products_with_image.iterator(chunk_size=500):
            image_path = str(product.image).lstrip("/")
            abs_path = os.path.join(media_root, image_path)

            if not os.path.exists(abs_path):
                missing.append(product)
                ext = os.path.splitext(image_path)[1].lower() or "(no ext)"
                ext_counter[ext] += 1
                ref_counter[product.reference] += 1

        self.stdout.write(f"\nMissing files: {len(missing)} / {total}")

        if missing:
            self.stdout.write("\nBreakdown by extension:")
            for ext, count in ext_counter.most_common():
                self.stdout.write(f"  {ext}: {count}")

            self.stdout.write("\nAffected products (first 20 references):")
            for product in missing[:20]:
                self.stdout.write(f"  ref={product.reference}  path={product.image}")
            if len(missing) > 20:
                self.stdout.write(f"  ... and {len(missing) - 20} more")

        if fix:
            if not missing:
                self.stdout.write(self.style.SUCCESS("Nothing to fix."))
                return
            with transaction.atomic():
                ids = [p.pk for p in missing]
                updated = Product.objects.filter(pk__in=ids).update(image="")
            self.stdout.write(
                self.style.SUCCESS(f"\nCleared {updated} stale image paths.")
            )
        else:
            if missing:
                self.stdout.write(
                    self.style.WARNING(
                        "\nRun with --fix to clear stale paths from the database."
                    )
                )
            else:
                self.stdout.write(self.style.SUCCESS("All image paths are valid."))
