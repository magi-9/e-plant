"""
Management command to import product data from CSV files.

Prerequisites:
  1. Run: python data/convert_to_csv.py   (converts Excel → CSV)
  2. Run: python manage.py migrate        (applies migrations)

Usage:
  python manage.py import_product_data                        # flat import, all rows with ref
  python manage.py import_product_data --update               # update existing products
  python manage.py import_product_data --dry-run              # preview without saving
  python manage.py import_product_data --replace-all          # clean start, reimport everything
  python manage.py import_product_data --master               # import from master CSV (data/new/)

Rules:
  - Every row with a reference is imported (1 ref = 1 product = 1 row).
  - Prices come from dealer prices as dealer_price / 0.60 and are stored without VAT.
  - Products visible only when name + price present and system is in visible_categories.txt.
  - All other products are stored with is_visible=False.
"""

import csv
import os
import re
import shutil
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from products.models import Product, ProductGroup
from products.pricing import calculate_net_price_from_dealer

BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
CSV_DIR = os.path.join(DATA_DIR, "csv")
NEW_DIR = os.path.join(DATA_DIR, "new")
MEDIA_PRODUCTS_DIR = os.path.join(BACKEND_DIR, "media", "products")
DEFAULT_IMAGES_DIR = os.path.join(DATA_DIR, "images")
MANUAL_IMAGES_DIR = os.path.join(DATA_DIR, "raw", "photos-manual")
RAW_ONEDRIVE_IMAGES_DIR = os.path.join(DATA_DIR, "raw", "OneDrive_1_17-3-2026")

PRODUCTS_CSV = os.path.join(CSV_DIR, "products.csv")
DEALER_PRICES_CSV = os.path.join(CSV_DIR, "dealer_prices.csv")
MERGED_IMPORT_CSV = os.path.join(CSV_DIR, "import_all_merged.csv")
MASTER_IMPORT_CSV = os.path.join(NEW_DIR, "product_retail_2025_master.csv")

MANUAL_PRICE_OVERRIDES = {
    "43.620.411.01-2": Decimal("45"),
    "43.621.415.01-2": Decimal("72"),
    "43.624.201.01-2": Decimal("60.1"),
    "43.625.108.01-2": Decimal("50"),
    "43.632.201.01-2": Decimal("60.1"),
}

STANDARD_VAT_RATE = Decimal("23.00")
REDUCED_VAT_RATE = Decimal("5.00")

STANDARD_VAT_CATEGORIES = {"ACCESSORIES", "SCREWDRIVERS"}
REDUCED_VAT_CATEGORIES = {"CAPS SYSTEM"}
REDUCED_VAT_REFERENCE_PREFIXES = ("49.418.", "49.419.", "49.420.")
STANDARD_VAT_SECTION_KEYWORDS = (
    "SCREWDRIVER",
    "SCREWDIVER",
    "ADAPTOR",
    "ADAPTER",
    "DYNAMIC MILLING TOOL",
)
STANDARD_VAT_NAME_KEYWORDS = (
    "SCREWDRIVER",
    "SCREWDIVER",
    "SCREW DRIVER",
    "ADAPTOR",
    "ADAPTER",
    "MILLING TOOL",
    "WRENCH ADAPTOR",
    "WRENCH ADAPTER",
)


def determine_product_vat_rate(
    *,
    reference="",
    name="",
    category="",
    catalog_section="",
    all_categories="",
):
    """Return the product VAT rate from catalogue classification."""

    reference = str(reference or "")
    category_tokens = {
        token.strip().upper()
        for value in (category, all_categories)
        for token in str(value or "").replace(",", ";").split(";")
        if token.strip()
    }
    text = " ".join(
        [
            str(name or ""),
            str(category or ""),
            str(catalog_section or ""),
            str(all_categories or ""),
        ]
    ).upper()

    if category_tokens & REDUCED_VAT_CATEGORIES:
        return REDUCED_VAT_RATE
    if reference.startswith(REDUCED_VAT_REFERENCE_PREFIXES):
        return REDUCED_VAT_RATE

    if category_tokens & STANDARD_VAT_CATEGORIES:
        return STANDARD_VAT_RATE
    if any(keyword in text for keyword in STANDARD_VAT_SECTION_KEYWORDS):
        return STANDARD_VAT_RATE
    if any(keyword in text for keyword in STANDARD_VAT_NAME_KEYWORDS):
        return STANDARD_VAT_RATE

    return REDUCED_VAT_RATE


def normalize_ref(ref_str):
    """Strip all non-alphanumeric chars, lowercase → used for matching."""
    return re.sub(r"[^a-z0-9]", "", str(ref_str).lower())


MANUAL_IMAGE_REFERENCE_FALLBACKS = {
    normalize_ref("42.303.186.01-2"): normalize_ref("42.303.186.05-2"),
    normalize_ref("42.303.186.02-2"): normalize_ref("42.303.186.05-2"),
    normalize_ref("42.303.186.03-2"): normalize_ref("42.303.186.05-2"),
    normalize_ref("42.303.186.04-2"): normalize_ref("42.303.186.05-2"),
}


def ref_to_regex(ref_str):
    """
    Convert a possibly-wildcard reference to a regex pattern.
    e.g. '54.315.xxx.21-2' -> r'^54315\\d{3}212$'
    """
    normalized = normalize_ref(ref_str)
    pattern = re.sub(
        r"[xy]+", lambda m: r"\d{" + str(len(m.group())) + r"}", normalized
    )
    return re.compile(r"^" + pattern + r"$")


def wildcard_specificity(ref_str):
    normalized = normalize_ref(ref_str)
    literal_chars = sum(1 for char in normalized if char not in ("x", "y"))
    wildcard_chars = len(normalized) - literal_chars
    return literal_chars, -wildcard_chars


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
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                stem = os.path.splitext(fname)[0]
                path = os.path.join(root, fname)
                index[stem] = path
                normalized_stem = normalize_ref(stem)
                if normalized_stem:
                    index.setdefault(normalized_stem, path)
                base_stem = re.split(r"[_-]", stem, maxsplit=1)[0]
                normalized_base = normalize_ref(base_stem)
                if normalized_base:
                    index.setdefault(normalized_base, path)
    return index


def get_image_source_dirs():
    """Resolve image source directories in priority order."""
    env_dir = os.environ.get("PRODUCT_IMAGES_DIR")
    candidates = [
        env_dir,
        MANUAL_IMAGES_DIR,
        RAW_ONEDRIVE_IMAGES_DIR,
        DEFAULT_IMAGES_DIR,
        MEDIA_PRODUCTS_DIR,
    ]
    source_dirs = []
    for directory in candidates:
        if directory and os.path.isdir(directory) and directory not in source_dirs:
            source_dirs.append(directory)
    return source_dirs


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
        if norm in image_index:
            return norm
        fallback_norm = MANUAL_IMAGE_REFERENCE_FALLBACKS.get(norm)
        if fallback_norm and fallback_norm in image_index:
            return fallback_norm
        return None

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

    ext = os.path.splitext(src)[1].lower()
    dest_name = f"{image_key}{ext}"
    dest_abs = os.path.join(MEDIA_PRODUCTS_DIR, dest_name)

    if not dry_run:
        os.makedirs(MEDIA_PRODUCTS_DIR, exist_ok=True)
        if not os.path.exists(dest_abs):
            shutil.copy2(src, dest_abs)

    return f"products/{dest_name}"


def load_retail_products(retail_prices_path):
    """
    Load priced products directly from a price CSV.
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
                price = calculate_net_price_from_dealer(price_str)
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
    Load all SKU variants, matching each to a dealer-derived net price.
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
                price = calculate_net_price_from_dealer(price_str)
            except InvalidOperation:
                continue
            norm = normalize_ref(ref)
            if re.search(r"[xXyY]", ref):
                patterns.append((ref_to_regex(ref), price, row["section"].strip(), ref))
            else:
                exact[norm] = (price, row["section"].strip())
    patterns.sort(key=lambda item: wildcard_specificity(item[3]), reverse=True)

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
                for regex, p, cat, _raw_ref in patterns:
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


def _build_price_lookup(dealer_prices_path):
    """
    Build exact and wildcard price lookup dicts from dealer_prices.csv.

    Returns:
        exact   — {normalize_ref(ref): (net_price, section)}
        patterns — [(compiled_regex, net_price, section), ...]
    """
    exact = {}
    patterns = []
    with open(dealer_prices_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            price_str = row.get("price_eur", "").strip()
            section = row.get("section", "").strip()
            if not ref or not price_str:
                continue
            try:
                price = calculate_net_price_from_dealer(price_str)
            except InvalidOperation:
                continue
            if re.search(r"[xXyY]", ref):
                patterns.append((ref_to_regex(ref), price, section, ref))
            else:
                exact[normalize_ref(ref)] = (price, section)
    patterns.sort(key=lambda item: wildcard_specificity(item[3]), reverse=True)
    return exact, patterns


def _lookup_price(ref, reference_num, exact, patterns):
    """
    Try to match a price for the given reference/reference_num.
    Tries exact match first (on reference_num, then formatted reference),
    then wildcard pattern match.
    Returns (price, section, matched_wildcard_ref) where matched_wildcard_ref
    is the raw wildcard string (e.g. "54.315.xxx.21-2") or None for exact matches.
    """
    candidates = [normalize_ref(reference_num), normalize_ref(ref)]
    for key in candidates:
        if key and key in exact:
            price, section = exact[key]
            return price, section, None
    for regex, price, section, raw_ref in patterns:
        for key in candidates:
            if key and regex.match(key):
                return price, section, raw_ref
    return None, "", None


def load_flat_products(merged_csv_path, dealer_prices_path=None):
    """
    Load all products from merged CSV as flat 1:1 rows — no wildcard grouping.

    Rules:
    - Every row with a reference is imported (even if name/category/price missing).
    - Duplicate references: first occurrence wins.
    - Price comes from dealer_prices_path using dealer_price / 0.60
      (exact match on reference_num/reference, then wildcard pattern match).
    - is_visible = True only when name, valid price, and an active system category are all present.
    - Missing name falls back to the reference string.
    - Missing category falls back to 'Uncategorized'.
    - Missing price is stored as 0.00 with is_visible = False.

    Returns list of dicts ready for bulk_create.
    """
    # Build dealer-derived net price lookup once if path provided.
    exact_prices, wildcard_prices = {}, []
    if dealer_prices_path and os.path.exists(dealer_prices_path):
        exact_prices, wildcard_prices = _build_price_lookup(dealer_prices_path)

    from products.compatibility import _load as _load_compat

    compat_data = _load_compat()
    all_compat_families = {f for prefixes in compat_data.values() for f in prefixes}

    seen_refs = set()
    products = []

    with open(merged_csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            if not ref:
                continue
            if ref in seen_refs:
                continue
            seen_refs.add(ref)

            name = row.get("name", "").strip()
            category = (
                row.get("primary_system_category", "").strip()
                or row.get("category", "").strip()
            )
            description = (
                row.get("generated_description", "").strip()
                or row.get("description", "").strip()
            )
            reference_num = row.get("reference_num", "").strip()

            price = None
            if exact_prices or wildcard_prices:
                matched_price, matched_section, _ = _lookup_price(
                    ref, reference_num, exact_prices, wildcard_prices
                )
                if matched_price is not None:
                    price = matched_price
                    if not category:
                        category = matched_section

            if ref in MANUAL_PRICE_OVERRIDES:
                price = MANUAL_PRICE_OVERRIDES[ref]

            is_active = str(row.get("is_active_from_categories", "0")).strip() == "1"
            ref_parts = ref.split(".")
            ref_family = ".".join(ref_parts[:3]) if len(ref_parts) >= 3 else ""
            has_compat = bool(all_compat_families) and ref_family in all_compat_families
            is_visible = bool(name and price is not None and is_active and has_compat)

            all_categories = row.get("system_categories", "").strip()
            engaging_raw = row.get("engaging", "").strip()
            engaging = int(engaging_raw) if engaging_raw in ("0", "1") else None
            catalog_section = row.get("catalog_section", "").strip()
            vat_rate = determine_product_vat_rate(
                reference=ref,
                name=name,
                category=category,
                catalog_section=catalog_section,
                all_categories=all_categories,
            )
            params = {
                "type": "single",
                "reference_num": reference_num,
                "parameter_code": row.get("ref_segment_4", "").strip(),
                "option_tokens": row.get("options", "").strip(),
                # Only store compatibility_code when the product has active systems.
                "compatibility_code": (
                    row.get("compatibility_code", "").strip() if is_active else ""
                ),
                "all_categories": all_categories,
                "engaging": engaging,
                "catalog_section": catalog_section,
            }

            products.append(
                {
                    "name": name or ref,
                    "reference": ref,
                    "reference_num": reference_num,
                    "category": category or "Uncategorized",
                    "price": price if price is not None else Decimal("0.00"),
                    "vat_rate": vat_rate,
                    "description": description,
                    "is_visible": is_visible,
                    "parameters": params,
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
        primary_category = row.get("primary_system_category", "").strip()
        fallback_category = row.get("category", "").strip()
        generated_description = row.get("generated_description", "").strip()
        fallback_description = row.get("description", "").strip()
        active_flag = str(row.get("is_active_from_categories", "1")).strip()
        return {
            "name": row.get("name", "").strip(),
            "reference": row.get("reference", "").strip(),
            "reference_num": row.get("reference_num", "").strip(),
            "category": primary_category or fallback_category,
            "price": row["_price"],
            "description": generated_description or fallback_description,
            "is_active": bool(
                active_flag in ("1", "true", "True", "yes", "YES") and row["_has_price"]
            ),
            "parameters": {
                "type": "single",
                "parameter_code": row.get("ref_segment_4", "").strip(),
                "option_tokens": row.get("options", "").strip(),
                "engaging": (
                    int(row.get("engaging", ""))
                    if row.get("engaging", "").strip() in ("0", "1")
                    else None
                ),
                "catalog_section": row.get("catalog_section", "").strip(),
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
            engaging_raw = row.get("engaging", "").strip()
            options.append(
                {
                    "reference": ref,
                    "reference_num": row.get("reference_num", "").strip(),
                    "name": name,
                    "parameter_code": code,
                    "option_tokens": token,
                    "label": label,
                    "engaging": (
                        int(engaging_raw) if engaging_raw in ("0", "1") else None
                    ),
                    "catalog_section": row.get("catalog_section", "").strip(),
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
        description_prefix = f"{description} | " if description else ""
        description = f"{description_prefix}Počet variantov: {len(options)}"
        retail_name = representative.get("retail_name", "").strip()
        base_name = representative.get("name", "").strip()
        primary_category = representative.get("primary_system_category", "").strip()
        fallback_category = representative.get("category", "").strip()

        products.append(
            {
                "name": retail_name or base_name,
                "reference": wildcard_reference,
                "reference_num": "",
                "category": primary_category or fallback_category,
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


def load_master_products(master_csv_path, dealer_prices_path=None):
    """Load products from final master CSV generated in data/new/."""
    exact_prices, wildcard_prices = {}, []
    if dealer_prices_path and os.path.exists(dealer_prices_path):
        exact_prices, wildcard_prices = _build_price_lookup(dealer_prices_path)

    def parse_bool(value):
        return str(value).strip().lower() in ("1", "true", "yes")

    def first_category(value):
        parts = [p.strip() for p in str(value or "").split(";") if p.strip()]
        return parts[0] if parts else ""

    def normalize_category_set(value):
        categories = [p.strip() for p in str(value or "").split(";") if p.strip()]
        return ";".join(sorted(set(categories)))

    def build_product_payload(row):
        reference = row.get("reference_formatted", "").strip()
        reference_num = row.get("reference_number", "").strip()
        product_name = row.get("product_name", "").strip()
        retail_name = row.get("retail_name", "").strip()
        name = retail_name or product_name

        if not reference or not name:
            return None

        price, _, _ = _lookup_price(
            reference, reference_num, exact_prices, wildcard_prices
        )
        has_price = price is not None

        categories = row.get("categories", "").strip()
        category = first_category(categories)
        compatibility_codes = row.get("compatibility_codes", "").strip()
        raw_systems = row.get("raw_systems", "").strip()
        sections = row.get("sections", "").strip()
        vat_rate = determine_product_vat_rate(
            reference=reference,
            name=name,
            category=category,
            catalog_section=sections,
            all_categories=categories,
        )

        description_parts = [
            f"Product name: {product_name}" if product_name else "",
            f"Retail name: {retail_name}" if retail_name else "",
            f"EAN13: {row.get('ean13', '').strip()}" if row.get("ean13") else "",
            f"Categories: {categories}" if categories else "",
            (
                f"Compatibility codes: {compatibility_codes}"
                if compatibility_codes
                else ""
            ),
            f"Raw systems: {raw_systems}" if raw_systems else "",
            f"Sections: {sections}" if sections else "",
        ]

        return {
            "name": name,
            "product_name": product_name,
            "reference": reference,
            "reference_num": reference_num,
            "category": category or "Uncategorized",
            "price": price if price is not None else Decimal("0.00"),
            "vat_rate": vat_rate,
            "description": " | ".join([p for p in description_parts if p]),
            "is_active": parse_bool(row.get("active", "false")),
            "is_visible": parse_bool(row.get("chosen", "false")) and has_price,
            "compatibility_codes": compatibility_codes,
            "raw_systems": raw_systems,
            "all_categories": categories,
            "normalized_categories": normalize_category_set(categories),
        }

    family_rows = {}
    with open(master_csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            payload = build_product_payload(row)
            if not payload:
                continue

            family_key = (
                payload["name"].strip().lower(),
                str(payload["price"]) if payload["price"] is not None else "",
                payload["normalized_categories"],
                payload["is_active"],
                payload["is_visible"],
            )
            family_rows.setdefault(family_key, []).append(payload)

    products = []
    for rows in family_rows.values():
        if len(rows) == 1:
            row = rows[0]
            products.append(
                {
                    "name": row["name"],
                    "reference": row["reference"],
                    "reference_num": row["reference_num"],
                    "category": row["category"],
                    "price": row["price"],
                    "vat_rate": row["vat_rate"],
                    "description": row["description"],
                    "is_active": row["is_active"],
                    "is_visible": row["is_visible"],
                    "parameters": {
                        "type": "single",
                        "compatibility_codes": row["compatibility_codes"],
                        "raw_systems": row["raw_systems"],
                        "all_categories": row["all_categories"],
                    },
                    "hidden_refs": [],
                }
            )
            continue

        sorted_rows = sorted(rows, key=lambda r: (r["reference"], r["product_name"]))
        representative = sorted_rows[0]

        options = []
        for option_row in sorted_rows:
            option_label = option_row["product_name"] or (
                f"{option_row['name']} ({option_row['reference']})"
            )
            options.append(
                {
                    "reference": option_row["reference"],
                    "reference_num": option_row["reference_num"],
                    "name": option_row["name"],
                    "label": option_label,
                    "compatibility_codes": option_row["compatibility_codes"],
                    "raw_systems": option_row["raw_systems"],
                    "stock_quantity": 0,
                }
            )

        hidden_refs = [
            option_row["reference"]
            for option_row in sorted_rows
            if option_row["reference"] != representative["reference"]
        ]

        products.append(
            {
                "name": representative["name"],
                "reference": representative["reference"],
                "reference_num": representative["reference_num"],
                "category": representative["category"],
                "price": representative["price"],
                "vat_rate": representative["vat_rate"],
                "description": representative["description"],
                "is_active": representative["is_active"],
                "is_visible": representative["is_visible"],
                "parameters": {
                    "type": "wildcard_group",
                    "wildcard_reference": representative["reference"],
                    "option_fields": [
                        "reference",
                        "reference_num",
                        "name",
                        "label",
                    ],
                    "options": options,
                    "compatibility_codes": representative["compatibility_codes"],
                    "raw_systems": representative["raw_systems"],
                    "all_categories": representative["all_categories"],
                },
                "hidden_refs": hidden_refs,
            }
        )

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
                    price = calculate_net_price_from_dealer(price_str)
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
            "--replace-all",
            action="store_true",
            help="Delete existing products before import",
        )
        parser.add_argument(
            "--master",
            action="store_true",
            help="Import from data/new/product_retail_2025_master.csv",
        )

    def _ensure_product_groups(self, retail_prices_path):
        """Create/update ProductGroup records for narrow wildcard families.

        Only patterns with exactly one wildcard segment (e.g. 54.315.xxx.21-2)
        are treated as true product families. Broader price-level wildcards
        (two or more wildcard segments) are skipped.
        Clears all existing ProductGroups first so stale entries are removed.
        """
        ProductGroup.objects.all().delete()
        with open(retail_prices_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                ref = row.get("reference", "").strip()
                if not ref or not re.search(r"[xXyY]", ref):
                    continue
                segments = ref.split(".")
                if sum(1 for s in segments if re.search(r"[xXyY]", s)) != 1:
                    continue
                prefix_parts = []
                for seg in segments:
                    if re.search(r"[xXyY]", seg):
                        break
                    prefix_parts.append(seg)
                prefix = ".".join(prefix_parts)
                if not prefix:
                    continue  # skip patterns where first segment itself is wildcard
                name = row.get("name", "").strip() or prefix
                ProductGroup.objects.update_or_create(
                    prefix=prefix, defaults={"name": name}
                )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        do_update = options["update"]
        replace_all = options["replace_all"]
        use_master = options["master"]

        required_files = []
        if use_master:
            required_files.append((MASTER_IMPORT_CSV, "product_retail_2025_master.csv"))
            required_files.append((DEALER_PRICES_CSV, "dealer_prices.csv"))
        else:
            required_files.append((MERGED_IMPORT_CSV, "import_all_merged.csv"))
            required_files.append((DEALER_PRICES_CSV, "dealer_prices.csv"))

        for path, label in required_files:
            if not os.path.exists(path):
                raise CommandError(
                    f"{label} not found at {path}\nRun: python data/convert_to_csv.py"
                )

        self.stdout.write("Indexing product images...")
        image_index = {}
        image_source_dirs = get_image_source_dirs()
        for source_dir in image_source_dirs:
            for key, value in build_image_index(source_dir).items():
                image_index.setdefault(key, value)
        self.stdout.write(
            f"  {len(image_index)} images indexed from {len(image_source_dirs)} source dirs"
        )

        if use_master:
            self.stdout.write("Loading products from final master CSV...")
            products = load_master_products(MASTER_IMPORT_CSV, DEALER_PRICES_CSV)
            self.stdout.write(f"  {len(products)} products from master CSV")
        else:
            self.stdout.write(
                "Loading all products from merged CSV (flat, 1 ref = 1 product)..."
            )
            products = load_flat_products(MERGED_IMPORT_CSV, DEALER_PRICES_CSV)
            visible_count = sum(1 for p in products if p["is_visible"])
            self.stdout.write(
                f"  {len(products)} products ({visible_count} visible, "
                f"{len(products) - visible_count} hidden due to incomplete data)"
            )

        existing_refs = (
            {}
            if replace_all
            else {
                p.reference: p
                for p in Product.objects.exclude(reference__isnull=True).exclude(
                    reference=""
                )
            }
        )

        stats = {"created": 0, "updated": 0, "skipped": 0, "images": 0}
        to_create = []
        to_update = []

        for prod in products:
            ref = prod["reference"]
            ref_for_image = prod.get("reference_num") or ref
            vat_rate = prod.get("vat_rate", REDUCED_VAT_RATE)

            # Find image
            image_key = find_image_for_ref(ref_for_image, image_index)
            image_relative = None
            if image_key:
                image_relative = copy_image(image_key, image_index, dry_run)
                if image_relative and not dry_run:
                    stats["images"] += 1

            existing = existing_refs.get(ref)

            if existing:
                if do_update:
                    existing.price = prod["price"]
                    existing.vat_rate = vat_rate
                    existing.category = prod["category"]
                    existing.is_visible = prod["is_visible"]
                    existing.description = prod.get("description", "")
                    if image_relative:
                        existing.image = image_relative
                    elif existing.image:
                        existing_image_abs = os.path.join(
                            str(settings.MEDIA_ROOT), str(existing.image).lstrip("/")
                        )
                        if not os.path.exists(existing_image_abs):
                            existing.image = ""
                    if prod.get("parameters") is not None:
                        existing.parameters = prod["parameters"]
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
                    "price": prod["price"],
                    "vat_rate": vat_rate,
                    "stock_quantity": 0,
                    "image": image_relative or "",
                    "is_visible": prod.get("is_visible", True),
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

        # Group rebuild recreates ProductGroup rows. Run it only for a full replace
        # import to avoid nulling groups on skipped products during partial runs.
        if replace_all and not use_master and os.path.exists(DEALER_PRICES_CSV):
            self._ensure_product_groups(DEALER_PRICES_CSV)

        # Apply group auto-assignment before bulk ops (bypassed by bulk_create/update).
        # Pre-fetch all groups once to avoid N+1 queries.
        all_groups = list(ProductGroup.objects.only("id", "prefix"))
        for product in to_create:
            product._auto_assign_group(groups=all_groups)
        for product in to_update:
            product._auto_assign_group(groups=all_groups)

        with transaction.atomic():
            if replace_all:
                # Delete in PROTECT-safe order before wiping products.
                from orders.models import (
                    BatchLot,
                    OrderItem,
                    OrderItemBatch,
                    StockReceipt,
                )

                OrderItemBatch.objects.all().delete()
                StockReceipt.objects.all().delete()
                BatchLot.objects.all().delete()
                OrderItem.objects.all().delete()
                Product.objects.all().delete()
            if to_create:
                Product.objects.bulk_create(to_create, batch_size=200)
            if to_update:
                update_fields = [
                    "price",
                    "vat_rate",
                    "category",
                    "image",
                    "description",
                    "is_visible",
                    "group",
                    "parameters",
                ]
                Product.objects.bulk_update(to_update, update_fields, batch_size=200)

        from products.services.wildcard_sync import sync_wildcard_groups

        group_stats = sync_wildcard_groups()
        self.stdout.write(
            "Wildcard groups synced: "
            f"{group_stats['created']} created, "
            f"{group_stats['updated']} updated, "
            f"{group_stats['deleted']} deleted."
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Created {stats['created']}, updated {stats['updated']} products."
            )
        )
