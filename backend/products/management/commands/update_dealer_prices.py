"""
Management command to update product prices from dealer prices CSV.

Reads data/csv/dealer_prices.csv (generated from DEALER PRICES 2025.xlsx),
then sets each product's price to dealer_price / 0.60 (dealer price is 60%).
The stored price is ex-VAT (bez DPH).

Prerequisites:
  Run on host: python data/convert_to_csv.py dealer

Usage:
  python manage.py update_dealer_prices              # apply dealer / 0.60 prices
  python manage.py update_dealer_prices --dry-run    # preview without saving
  python manage.py update_dealer_prices --dealer-share 0.65
"""

import csv
import os
import re
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from products.models import Product

BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DEALER_PRICES_CSV = os.path.join(PROJECT_DIR, "data", "csv", "dealer_prices.csv")


def _normalize_ref(ref_str):
    return re.sub(r"[^a-z0-9]", "", str(ref_str).lower())


def _ref_to_regex(ref_str):
    normalized = _normalize_ref(ref_str)
    pattern = re.sub(r"x+", lambda m: r"\d{" + str(len(m.group())) + r"}", normalized)
    return re.compile(r"^" + pattern + r"$")


def _build_dealer_price_lookup(csv_path):
    """Return (exact, patterns) dicts from dealer_prices.csv."""
    exact = {}
    patterns = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            price_str = row.get("price_eur", "").strip()
            if not ref or not price_str:
                continue
            try:
                price = Decimal(price_str)
            except InvalidOperation:
                continue
            if re.search(r"[xXyY]", ref):
                patterns.append((_ref_to_regex(ref), price, ref))
            else:
                exact[_normalize_ref(ref)] = price
    return exact, patterns


def _lookup_dealer_price(reference, exact, patterns):
    key = _normalize_ref(reference)
    if key and key in exact:
        return exact[key]
    for regex, price, _raw in patterns:
        if key and regex.match(key):
            return price
    return None


class Command(BaseCommand):
    help = "Update product prices from dealer prices CSV (dealer price / dealer share, ex-VAT)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to the database.",
        )
        parser.add_argument(
            "--dealer-share",
            type=float,
            default=0.60,
            help="Dealer price share of the original price (default: 0.60).",
        )
        parser.add_argument(
            "--markup",
            type=float,
            default=None,
            help=(
                "Deprecated: multiplier applied to dealer price. "
                "Use --dealer-share for margin-based pricing."
            ),
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        dealer_share = Decimal(str(options["dealer_share"]))
        legacy_markup = options["markup"]
        markup = Decimal(str(legacy_markup)) if legacy_markup is not None else None
        pricing_label = (
            f"legacy markup x{markup}"
            if markup is not None
            else f"dealer share {dealer_share}"
        )

        if dealer_share <= 0:
            raise CommandError("--dealer-share must be greater than 0")

        if not os.path.exists(DEALER_PRICES_CSV):
            raise CommandError(
                f"dealer_prices.csv not found at {DEALER_PRICES_CSV}. "
                "Run: python data/convert_to_csv.py dealer"
            )

        exact, patterns = _build_dealer_price_lookup(DEALER_PRICES_CSV)
        self.stdout.write(
            f"Loaded {len(exact)} exact + {len(patterns)} wildcard dealer prices."
        )

        products = Product.objects.all()
        updated = []
        not_found = []

        for product in products:
            dealer_price = _lookup_dealer_price(
                product.reference or "",
                exact,
                patterns,
            )
            if dealer_price is None:
                not_found.append(
                    product.reference or product.reference_num or str(product.pk)
                )
                continue

            if markup is not None:
                new_price = (dealer_price * markup).quantize(Decimal("0.01"))
            else:
                new_price = (dealer_price / dealer_share).quantize(Decimal("0.01"))
            updated.append((product, new_price))

        self.stdout.write(f"\nMatched:   {len(updated)} products")
        self.stdout.write(f"Not found: {len(not_found)} products")

        if dry_run:
            self.stdout.write("\n--- DRY RUN (no changes saved) ---")
            for product, new_price in updated[:20]:
                self.stdout.write(
                    f"  {product.reference:<25}  {product.price} → {new_price}"
                )
            if len(updated) > 20:
                self.stdout.write(f"  ... and {len(updated) - 20} more")
            return

        with transaction.atomic():
            for product, new_price in updated:
                product.price = new_price
            Product.objects.bulk_update(
                [p for p, _ in updated], ["price"], batch_size=200
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nUpdated {len(updated)} product prices ({pricing_label})."
            )
        )
