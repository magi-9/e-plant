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

from products.models import Product, ProductGroup

BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
CSV_DIR = os.path.join(DATA_DIR, "csv")
IMAGES_DIR = os.environ.get("PRODUCT_IMAGES_DIR", os.path.join(DATA_DIR, "images"))
MEDIA_PRODUCTS_DIR = os.path.join(BACKEND_DIR, "media", "products")

PRODUCTS_CSV = os.path.join(CSV_DIR, "products.csv")
RETAIL_PRICES_CSV = os.path.join(CSV_DIR, "retail_prices.csv")
MERGED_IMPORT_CSV = os.path.join(CSV_DIR, "import_all_merged.csv")


def normalize_ref(ref_str):
    """Strip all non-alphanumeric chars, lowercase → used for matching."""
    return re.sub(r"[^a-z0-9]", "", str(ref_str).lower())


def ref_to_regex(ref_str):
    """
    Convert a possibly-wildcard reference to a regex pattern.
    e.g. '54.315.xxx.21-2' -> r'^54315\\d{3}212$'
    """
    normalized = normalize_ref(ref_str)
    pattern = re.sub(r"x+", lambda m: r"\d{" + str(len(m.group())) + r"}", normalized)
    return re.compile(r"^" + pattern + r"$")


def parse_reference_parts(reference):
    """Split formatted reference into numeric segments."""
    m = re.match(r"^(\d{2})\.(\d{3})\.(\d{3})\.(\d{2})-(\d)$", str(reference).strip())
    if not m:
        return {
            "segment_1": "",
            "segment_2": "",
            "segment_3": "",
            "segment_4": "",
            "check_digit": "",
        }
    return {
        "segment_1": m.group(1),
        "segment_2": m.group(2),
        "segment_3": m.group(3),
        "segment_4": m.group(4),
        "check_digit": m.group(5),
    }


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

            products.append(
                {
                    "name": name,
                    "reference": ref,
                    "category": section,
                    "price": price,
                    "description": detail,
                }
            )
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

            products.append(
                {
                    "name": name,
                    "reference": ref,
                    "reference_num": ref_num,
                    "category": category,
                    "price": price,
                    "description": "",
                }
            )
    return products


def load_merged_products(merged_csv_path):
    """
    Load all products from merged CSV and group multi-variant families into
    one wildcard_group product with variant options for frontend dropdown.
    """
    rows = []
    with open(merged_csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            name = row.get("name", "").strip()
            if not ref or not name:
                continue

            price_str = row.get("price", "").strip()
            price = Decimal("0.00")
            has_price = False
            if price_str:
                try:
                    price = Decimal(price_str)
                    has_price = True
                except InvalidOperation:
                    price = Decimal("0.00")

            row["_price"] = price
            row["_has_price"] = has_price
            rows.append(row)

    families = {}
    singles = []

    for row in rows:
        seg1 = row.get("ref_segment_1", "").strip()
        seg2 = row.get("ref_segment_2", "").strip()
        seg3 = row.get("ref_segment_3", "").strip()
        family_key = f"{seg1}.{seg2}.{seg3}" if seg1 and seg2 and seg3 else ""
        if not family_key:
            singles.append(row)
            continue

        families.setdefault(family_key, []).append(row)

    products = []

    def row_to_single_product(row):
        return {
            "name": row.get("name", "").strip(),
            "reference": row.get("reference", "").strip(),
            "reference_num": row.get("reference_num", "").strip(),
            "category": (
                row.get("primary_system_category", "").strip()
                or row.get("category", "").strip()
            ),
            "price": row["_price"],
            "description": row.get("generated_description", "").strip()
            or row.get("description", "").strip(),
            "is_active": bool(
                str(row.get("is_active_from_categories", "1")).strip()
                in ("1", "true", "True", "yes", "YES")
                and row["_has_price"]
            ),
            "parameters": {
                "type": "single",
                "parameter_code": row.get("ref_segment_4", "").strip(),
                "option_tokens": row.get("options", "").strip(),
            },
        }

    for key, family_rows in families.items():
        if len(family_rows) < 2:
            products.append(row_to_single_product(family_rows[0]))
            continue

        sorted_rows = sorted(
            family_rows,
            key=lambda r: (
                r.get("name", ""),
                r.get("ref_segment_4", ""),
                r.get("reference", ""),
            ),
        )
        representative = sorted_rows[0]
        seg1 = representative.get("ref_segment_1", "").strip()
        seg2 = representative.get("ref_segment_2", "").strip()
        seg3 = representative.get("ref_segment_3", "").strip()
        prefix = f"{seg1}.{seg2}.{seg3}"
        wildcard_reference = f"{prefix}.xx-2"

        options = []
        seen_refs = set()
        for row in sorted_rows:
            ref = row.get("reference", "").strip()
            if not ref or ref in seen_refs:
                continue
            seen_refs.add(ref)
            code = row.get("ref_segment_4", "").strip()
            token = row.get("options", "").strip()
            name = row.get("name", "").strip()
            label_parts = [code, token]
            label_suffix = ", ".join([p for p in label_parts if p])
            label = f"{name} ({label_suffix})" if label_suffix else f"{name} ({ref})"
            options.append(
                {
                    "reference": ref,
                    "reference_num": row.get("reference_num", "").strip(),
                    "name": name,
                    "parameter_code": code,
                    "option_tokens": token,
                    "label": label,
                }
            )

        any_has_price = any(r["_has_price"] for r in sorted_rows)
        min_price = min(
            (r["_price"] for r in sorted_rows if r["_price"] is not None),
            default=Decimal("0.00"),
        )
        any_active_category = any(
            str(r.get("is_active_from_categories", "0")).strip()
            in ("1", "true", "True", "yes", "YES")
            for r in sorted_rows
        )

        description = (
            representative.get("generated_description", "").strip()
            or representative.get("description", "").strip()
        )
        description = (
            description + " | " if description else ""
        ) + f"Počet variantov: {len(options)}"

        products.append(
            {
                "name": representative.get("retail_name", "").strip()
                or representative.get("name", "").strip(),
                "reference": wildcard_reference,
                "reference_num": "",
                "category": (
                    representative.get("primary_system_category", "").strip()
                    or representative.get("category", "").strip()
                ),
                "price": min_price,
                "description": description,
                "is_active": bool(any_active_category and any_has_price),
                "parameters": {
                    "type": "wildcard_group",
                    "wildcard_reference": wildcard_reference,
                    "option_fields": [
                        "reference",
                        "parameter_code",
                        "option_tokens",
                        "name",
                    ],
                    "options": options,
                },
            }
        )

    for row in singles:
        products.append(row_to_single_product(row))
    return products


def load_grouped_retail_products(
    products_csv_path, retail_prices_path, merged_csv_path
):
    """
    Legacy loader kept for compatibility. Prefer load_merged_products.
    """
    concrete_products = []
    with open(products_csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            concrete_products.append(
                {
                    "reference": row.get("reference", "").strip(),
                    "reference_num": row.get("reference_num", "").strip(),
                    "name": row.get("name", "").strip(),
                }
            )

    family_meta = {}
    if os.path.exists(merged_csv_path):
        with open(merged_csv_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                family = row.get("ref_segment_3", "").strip()
                if not family:
                    continue
                family_meta.setdefault(
                    family,
                    {
                        "primary_system_category": row.get(
                            "primary_system_category", ""
                        ).strip(),
                        "is_active": str(
                            row.get("is_active_from_categories", "1")
                        ).strip()
                        in ("1", "true", "True", "yes", "YES"),
                        "options": row.get("options", "").strip(),
                    },
                )

    products = []
    with open(retail_prices_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = row.get("name", "").strip()
            ref = row.get("reference", "").strip()
            price_str = row.get("price_eur", "").strip()
            section = row.get("section", "").strip()
            detail = row.get("detail", "").strip()

            if not name:
                if ref:
                    name = f"{section or 'Produkt'} {ref}".strip()
                elif detail:
                    name = f"{section or 'Produkt'} {detail}".strip()
                else:
                    continue

            price = Decimal("0.00")
            has_price = False
            if price_str:
                try:
                    price = Decimal(price_str)
                    has_price = True
                except InvalidOperation:
                    price = Decimal("0.00")
                    has_price = False

            parts = parse_reference_parts(ref)
            family = parts.get("segment_3", "")
            meta = family_meta.get(family, {})

            parameters = {
                "type": "single",
                "reference": ref,
                "option_tokens": meta.get("options", ""),
            }

            if re.search(r"[xXyY]", ref):
                regex = ref_to_regex(ref)
                variant_options = []
                for item in concrete_products:
                    norm_num = normalize_ref(item["reference_num"])
                    if not norm_num:
                        continue
                    if regex.match(norm_num):
                        ref_parts = parse_reference_parts(item["reference"])
                        variant_options.append(
                            {
                                "reference": item["reference"],
                                "reference_num": item["reference_num"],
                                "name": item["name"],
                                "parameter_code": ref_parts.get("segment_4", ""),
                                "label": f"{item['name']} ({item['reference']})",
                            }
                        )

                variant_options.sort(
                    key=lambda x: (x.get("parameter_code", ""), x["reference"])
                )
                parameters = {
                    "type": "wildcard_group",
                    "wildcard_reference": ref,
                    "option_fields": ["reference", "parameter_code", "name"],
                    "options": variant_options,
                    "option_tokens": meta.get("options", ""),
                }

            description_parts = [
                detail,
                f"Referenčný kód: {ref}",
                f"Parametre: {meta.get('options', '')}" if meta.get("options") else "",
                (
                    f"Počet variantov: {len(parameters.get('options', []))}"
                    if parameters.get("type") == "wildcard_group"
                    else ""
                ),
            ]

            products.append(
                {
                    "name": name,
                    "reference": ref,
                    "reference_num": "",
                    "category": meta.get("primary_system_category") or section,
                    "price": price,
                    "description": " | ".join([p for p in description_parts if p]),
                    "is_active": bool(meta.get("is_active", False) and has_price),
                    "parameters": parameters,
                }
            )

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
        parser.add_argument(
            "--merged",
            action="store_true",
            help="Import from data/csv/import_all_merged.csv (one merged source)",
        )
        parser.add_argument(
            "--replace-all",
            action="store_true",
            help="Delete existing products before import",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        do_update = options["update"]
        use_variants = options["variants"]
        use_merged = options["merged"]
        replace_all = options["replace_all"]

        required_files = []
        if use_merged:
            required_files.append((MERGED_IMPORT_CSV, "import_all_merged.csv"))
            required_files.append((PRODUCTS_CSV, "products.csv"))
            required_files.append((RETAIL_PRICES_CSV, "retail_prices.csv"))
        else:
            required_files.append((RETAIL_PRICES_CSV, "retail_prices.csv"))
            if use_variants:
                required_files.append((PRODUCTS_CSV, "products.csv"))

        for path, label in required_files:
            if not os.path.exists(path):
                raise CommandError(
                    f"{label} not found at {path}\nRun: python data/convert_to_csv.py"
                )

        self.stdout.write("Indexing product images...")
        image_index = build_image_index(IMAGES_DIR) if os.path.isdir(IMAGES_DIR) else {}
        self.stdout.write(f"  {len(image_index)} images indexed")

        if use_merged:
            self.stdout.write("Loading products from merged CSV...")
            products = load_merged_products(MERGED_IMPORT_CSV)
            self.stdout.write(f"  {len(products)} products with price")
        elif use_variants:
            self.stdout.write("Loading 1885 SKU variants...")
            products = load_variant_products(PRODUCTS_CSV, RETAIL_PRICES_CSV)
            priced = sum(1 for p in products if p["price"] is not None)
            self.stdout.write(
                f"  {len(products)} variants, {priced} with matched retail price"
            )
        else:
            self.stdout.write("Loading 107 retail products...")
            products = load_retail_products(RETAIL_PRICES_CSV)
            self.stdout.write(f"  {len(products)} products")

        existing_refs = (
            {}
            if replace_all
            else {p.reference: p for p in Product.objects.exclude(reference="")}
        )
        existing_names = (
            {}
            if replace_all
            else {p.name: p for p in Product.objects.filter(reference="")}
        )

        stats = {"created": 0, "updated": 0, "skipped": 0, "no_price": 0, "images": 0}
        to_create = []
        to_update = []

        for prod in products:
            price = prod["price"]
            if price is None:
                stats["no_price"] += 1
                continue

            ref = prod["reference"]
            ref_for_image = (
                prod.get("reference_num") or ref
            )  # variants/merged use numeric, retail uses formatted

            # Find image
            image_key = find_image_for_ref(ref_for_image, image_index)
            image_relative = None
            if image_key:
                image_relative = copy_image(image_key, image_index, dry_run)
                if image_relative and not dry_run:
                    stats["images"] += 1

            # Match existing product
            existing = existing_refs.get(ref) or (
                existing_names.get(prod["name"]) if not ref else None
            )

            if existing:
                if do_update:
                    existing.price = price
                    if prod["category"]:
                        existing.category = prod["category"]
                    if "is_active" in prod:
                        existing.is_active = prod["is_active"]
                    if image_relative:
                        existing.image = image_relative
                    existing.description = prod.get("description", "")
                    existing_params = prod.get("parameters")
                    if hasattr(existing, "parameters") and existing_params is not None:
                        existing.parameters = existing_params
                    to_update.append(existing)
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            else:
                create_kwargs = {
                    "name": prod["name"],
                    "reference": ref,
                    "description": prod.get("description", ""),
                    "category": prod["category"],
                    "price": price,
                    "stock_quantity": 0,
                    "image": image_relative or "",
                    "is_active": prod.get("is_active", True),
                }
                if "parameters" in prod:
                    create_kwargs["parameters"] = prod["parameters"]

                to_create.append(Product(**create_kwargs))
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
                    self.stdout.write(
                        f"  [{p.reference or 'no-ref':25s}] {p.name[:55]:55s} €{p.price}"
                    )
            return

        # Apply group auto-assignment before bulk ops (bypassed by bulk_create/update).
        # Pre-fetch all groups once to avoid N+1 queries.
        all_groups = list(ProductGroup.objects.only("id", "prefix"))
        for product in to_create:
            product._auto_assign_group(groups=all_groups)
        for product in to_update:
            product._auto_assign_group(groups=all_groups)

        with transaction.atomic():
            if replace_all:
                Product.objects.all().delete()
            if to_create:
                Product.objects.bulk_create(to_create, batch_size=200)
            if to_update:
                update_fields = [
                    "price",
                    "category",
                    "image",
                    "description",
                    "is_active",
                    "group",
                ]
                if hasattr(Product, "parameters"):
                    update_fields.append("parameters")
                Product.objects.bulk_update(
                    to_update,
                    update_fields,
                    batch_size=200,
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Created {stats['created']}, updated {stats['updated']} products."
            )
        )
