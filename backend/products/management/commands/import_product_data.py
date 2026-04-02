"""
Management command to import product data from CSV files.

Prerequisites:
  1. Run: python data/convert_to_csv.py   (converts Excel → CSV)
  2. Run: python manage.py migrate        (applies reference field migration)

Usage:
  python manage.py import_product_data            # import 107 priced products (default)
  python manage.py import_product_data --update   # update existing products
  python manage.py import_product_data --dry-run  # preview without saving
  python manage.py import_product_data --variants # import all 1885 SKU variants instead
"""

import csv
import os
import re
import shutil
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from products.models import Product

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
CSV_DIR = os.path.join(DATA_DIR, "csv")
IMAGES_DIR = os.path.join(DATA_DIR, "OneDrive_1_17-3-2026")
MEDIA_PRODUCTS_DIR = os.path.join(BACKEND_DIR, "media", "products")

PRODUCTS_CSV = os.path.join(CSV_DIR, "products.csv")
RETAIL_PRICES_CSV = os.path.join(CSV_DIR, "retail_prices.csv")


def normalize_ref(ref_str):
    """Strip all non-alphanumeric chars, lowercase → used for matching."""
    return re.sub(r"[^a-z0-9]", "", str(ref_str).lower())


def ref_to_regex(ref_str):
    """
    Convert a possibly-wildcard reference to a regex pattern.
    e.g. '54.315.xxx.21-2' → r'^54315\d{3}212$'
    """
    normalized = normalize_ref(ref_str)
    pattern = re.sub(r"x+", lambda m: r"\d{" + str(len(m.group())) + r"}", normalized)
    return re.compile(r"^" + pattern + r"$")


def build_image_index(images_dir):
    """
    Walk all subdirs, index images by their stem (numeric reference without extension).
    Returns {reference_num_str: absolute_path}
    """
    index = {}
    for root, _dirs, files in os.walk(images_dir):
        for fname in files:
            if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                stem = os.path.splitext(fname)[0]
                index[stem] = os.path.join(root, fname)
    return index


def find_image_for_ref(ref_str, image_index):
    """
    Find an image path for a reference that may contain wildcards.
    For exact refs: direct lookup.
    For wildcard refs: return the first matching image key.
    Returns the image stem string (key in image_index) or None.
    """
    if not ref_str or not image_index:
        return None

    has_wildcard = bool(re.search(r"[xXyY]", ref_str))

    if not has_wildcard:
        norm = normalize_ref(ref_str)
        return norm if norm in image_index else None

    regex = ref_to_regex(ref_str)
    for key in image_index:
        if regex.match(key):
            return key
    return None


def copy_image(image_key, image_index, dry_run):
    """
    Copy image from source to media/products/. Returns relative path for DB or None.
    """
    src = image_index.get(image_key)
    if not src:
        return None

    ext = os.path.splitext(src)[1]
    dest_name = f"{image_key}{ext}"
    dest_abs = os.path.join(MEDIA_PRODUCTS_DIR, dest_name)

    if not dry_run:
        os.makedirs(MEDIA_PRODUCTS_DIR, exist_ok=True)
        if not os.path.exists(dest_abs):
            shutil.copy2(src, dest_abs)

    return f"products/{dest_name}"


def load_retail_products(retail_prices_path):
    """
    Load the 107 priced products directly from retail_prices.csv.
    Each row with a name + price becomes one product.
    Returns list of dicts: {name, reference, category, price, detail}
    """
    products = []
    with open(retail_prices_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = row["name"].strip()
            price_str = row["price_eur"].strip()
            ref = row["reference"].strip()
            section = row["section"].strip()
            detail = row["detail"].strip()

            if not name or not price_str:
                continue
            try:
                price = Decimal(price_str)
            except InvalidOperation:
                continue

            products.append({
                "name": name,
                "reference": ref,
                "category": section,
                "price": price,
                "description": detail,
            })
    return products


def load_variant_products(products_csv_path, retail_prices_path):
    """
    Load all 1885 SKU variants, matching each to a retail price.
    Returns list of dicts with price=None if unmatched.
    """
    # Build price lookup
    exact = {}
    patterns = []
    with open(retail_prices_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row["reference"].strip()
            price_str = row["price_eur"].strip()
            if not ref or not price_str:
                continue
            try:
                price = Decimal(price_str)
            except InvalidOperation:
                continue
            norm = normalize_ref(ref)
            if re.search(r"[xXyY]", ref):
                patterns.append((ref_to_regex(ref), price, row["section"].strip()))
            else:
                exact[norm] = (price, row["section"].strip())

    products = []
    with open(products_csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row["reference"].strip()
            ref_num = row["reference_num"].strip()
            name = row["name"].strip()
            norm = normalize_ref(ref_num)

            price, category = None, ""
            if norm in exact:
                price, category = exact[norm]
            else:
                for regex, p, cat in patterns:
                    if regex.match(norm):
                        price, category = p, cat
                        break

            products.append({
                "name": name,
                "reference": ref,
                "reference_num": ref_num,
                "category": category,
                "price": price,
                "description": "",
            })
    return products


class Command(BaseCommand):
    help = "Import products from data/csv/ (run data/convert_to_csv.py first)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without saving",
        )
        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing products matched by reference",
        )
        parser.add_argument(
            "--variants",
            action="store_true",
            help="Import all 1885 SKU variants instead of the 107 priced products",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        do_update = options["update"]
        use_variants = options["variants"]

        for path, label in [(RETAIL_PRICES_CSV, "retail_prices.csv")]:
            if not os.path.exists(path):
                raise CommandError(f"{label} not found at {path}\nRun: python data/convert_to_csv.py")

        if use_variants and not os.path.exists(PRODUCTS_CSV):
            raise CommandError(f"products.csv not found at {PRODUCTS_CSV}\nRun: python data/convert_to_csv.py")

        self.stdout.write("Indexing product images...")
        image_index = build_image_index(IMAGES_DIR) if os.path.isdir(IMAGES_DIR) else {}
        self.stdout.write(f"  {len(image_index)} images indexed")

        if use_variants:
            self.stdout.write("Loading 1885 SKU variants...")
            products = load_variant_products(PRODUCTS_CSV, RETAIL_PRICES_CSV)
            priced = sum(1 for p in products if p["price"] is not None)
            self.stdout.write(f"  {len(products)} variants, {priced} with matched retail price")
        else:
            self.stdout.write("Loading 107 retail products...")
            products = load_retail_products(RETAIL_PRICES_CSV)
            self.stdout.write(f"  {len(products)} products")

        existing_refs = {p.reference: p for p in Product.objects.exclude(reference="")}
        existing_names = {p.name: p for p in Product.objects.filter(reference="")}

        stats = {"created": 0, "updated": 0, "skipped": 0, "no_price": 0, "images": 0}
        to_create = []
        to_update = []

        for prod in products:
            price = prod["price"]
            if price is None:
                stats["no_price"] += 1
                continue

            ref = prod["reference"]
            ref_for_image = prod.get("reference_num") or ref  # variants use numeric, retail uses formatted

            # Find image
            image_key = find_image_for_ref(ref_for_image, image_index)
            image_relative = None
            if image_key:
                image_relative = copy_image(image_key, image_index, dry_run)
                if image_relative and not dry_run:
                    stats["images"] += 1

            # Match existing product
            existing = existing_refs.get(ref) or (existing_names.get(prod["name"]) if not ref else None)

            if existing:
                if do_update:
                    existing.price = price
                    if prod["category"]:
                        existing.category = prod["category"]
                    if image_relative:
                        existing.image = image_relative
                    if prod["description"] and not existing.description:
                        existing.description = prod["description"]
                    to_update.append(existing)
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            else:
                to_create.append(
                    Product(
                        name=prod["name"],
                        reference=ref,
                        description=prod.get("description", ""),
                        category=prod["category"],
                        price=price,
                        stock_quantity=0,
                        image=image_relative or "",
                    )
                )
                stats["created"] += 1

        self.stdout.write(
            f"\nResults:\n"
            f"  To create:  {stats['created']}\n"
            f"  To update:  {stats['updated']}\n"
            f"  Skipped (already exist, use --update): {stats['skipped']}\n"
            f"  No price (variants only):              {stats['no_price']}\n"
            f"  Images found: {stats['images']}\n"
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — no changes saved."))
            if to_create:
                self.stdout.write("\nProducts that would be created (first 10):")
                for p in to_create[:10]:
                    self.stdout.write(f"  [{p.reference or 'no-ref':25s}] {p.name[:55]:55s} €{p.price}")
            return

        with transaction.atomic():
            if to_create:
                Product.objects.bulk_create(to_create, batch_size=200)
            if to_update:
                Product.objects.bulk_update(to_update, ["price", "category", "image", "description"], batch_size=200)

        self.stdout.write(
            self.style.SUCCESS(f"Done! Created {stats['created']}, updated {stats['updated']} products.")
        )
