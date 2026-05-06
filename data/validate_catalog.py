"""
Catalog validation script — compare compatibility_options.csv (PDF catalog)
against products.csv (Excel source) and import_all_merged.csv (priced data).

Usage:
    python data/validate_catalog.py
    python data/validate_catalog.py --code 0075
    python data/validate_catalog.py --missing-only
"""

import argparse
import csv
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "csv")
RAW_DIR = os.path.join(BASE_DIR, "raw")

COMPATIBILITY_OPTIONS_CSV = os.path.join(CSV_DIR, "compatibility_options.csv")
PRODUCTS_CSV = os.path.join(CSV_DIR, "products.csv")
MERGED_IMPORT_CSV = os.path.join(CSV_DIR, "import_all_merged.csv")
CATEGORIES_TXT = os.path.join(RAW_DIR, "categories.txt")


def load_catalog_refs():
    """Return {code: [(section, reference), ...]} from compatibility_options.csv."""
    result = {}
    with open(COMPATIBILITY_OPTIONS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row.get("compatibility_code", "").strip()
            ref = row.get("reference", "").strip()
            section = row.get("section", "").strip()
            if code and ref:
                result.setdefault(code, []).append((section, ref))
    return result


def load_excel_refs():
    """Return set of references from products.csv (derived from Excel)."""
    refs = set()
    with open(PRODUCTS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            if ref:
                refs.add(ref)
    return refs


def load_merged_data():
    """Return {reference: {price, compatibility_code, system_categories, is_active}} from import_all_merged.csv."""
    data = {}
    with open(MERGED_IMPORT_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            if ref:
                data[ref] = {
                    "price": row.get("price", "").strip(),
                    "category": row.get("category", "").strip(),
                    "compatibility_code": row.get("compatibility_code", "").strip(),
                    "system_categories": row.get("system_categories", "").strip(),
                    "active_system_categories": row.get("active_system_categories", "").strip(),
                    "is_active": row.get("is_active_from_categories", "0").strip(),
                    "name": row.get("name", "").strip(),
                }
    return data


def load_active_categories():
    """Return set of canonical system names from categories.txt."""
    if not os.path.exists(CATEGORIES_TXT):
        return set()
    with open(CATEGORIES_TXT, encoding="utf-8") as f:
        raw = f.read()
    return {t.strip() for t in re.split(r"[,\n]+", raw) if t.strip()}


def check_compatibility_code_padding(merged_data):
    """Detect products where stored compatibility_code is not 4 digits."""
    bad = []
    for ref, d in merged_data.items():
        code = d["compatibility_code"]
        if code and len(code) < 4 and code.isdigit():
            bad.append((ref, code))
    return bad


def validate(filter_code=None, missing_only=False):
    catalog = load_catalog_refs()
    excel_refs = load_excel_refs()
    merged = load_merged_data()
    active_cats = load_active_categories()

    codes = sorted(catalog.keys())
    if filter_code:
        codes = [c for c in codes if c == filter_code]
        if not codes:
            print(f"Code {filter_code} not found in compatibility_options.csv")
            return

    total_missing = 0
    total_no_price = 0
    total_ok = 0

    for code in codes:
        entries = catalog[code]
        refs_in_catalog = [(sec, ref) for sec, ref in entries]

        missing_from_excel = []
        no_price = []
        ok = []

        for section, ref in refs_in_catalog:
            if ref not in excel_refs:
                missing_from_excel.append((section, ref))
            elif ref not in merged or not merged[ref].get("price"):
                entry = merged.get(ref, {})
                no_price.append((section, ref, entry.get("name", "")))
            else:
                ok.append(ref)

        if missing_only and not missing_from_excel and not no_price:
            continue
        if not missing_from_excel and not no_price:
            continue

        total_missing += len(missing_from_excel)
        total_no_price += len(no_price)
        total_ok += len(ok)

        # Find representative section name for display
        sections = list({s for s, _ in refs_in_catalog if s})
        print(f"\n{'='*60}")
        print(f"Code {code}  |  {', '.join(sections[:3])}")
        print(f"  Catalog: {len(refs_in_catalog)} refs  |  OK: {len(ok)}  |  "
              f"Missing from Excel: {len(missing_from_excel)}  |  No price: {len(no_price)}")

        if missing_from_excel:
            print(f"  MISSING FROM EXCEL (not importable):")
            for sec, ref in missing_from_excel:
                print(f"    [{sec}]  {ref}")

        if no_price and not missing_only:
            print(f"  NO PRICE (invisible in shop):")
            for sec, ref, name in no_price[:10]:
                print(f"    [{sec}]  {ref}  {name[:50]}")
            if len(no_price) > 10:
                print(f"    ... and {len(no_price) - 10} more")

    # Padding check
    bad_padding = check_compatibility_code_padding(merged)
    if bad_padding and not filter_code:
        print(f"\n{'='*60}")
        print(f"COMPATIBILITY CODE PADDING ERRORS ({len(bad_padding)} products):")
        print("  These products have 3-digit codes instead of 4-digit.")
        for ref, code in bad_padding[:20]:
            print(f"  {ref}  →  code='{code}' (should be '{code.zfill(4)}')")
        if len(bad_padding) > 20:
            print(f"  ... and {len(bad_padding) - 20} more")

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"  Codes checked:           {len(codes)}")
    print(f"  Missing from Excel:      {total_missing}")
    print(f"  No price (invisible):    {total_no_price}")
    print(f"  Bad code padding:        {len(bad_padding) if not filter_code else 'N/A'}")
    if total_missing > 0:
        print(f"\n  ACTION REQUIRED: Add missing references to 'references product_ecommerce.xlsx'")
    if total_no_price > 0:
        print(f"  ACTION REQUIRED: Add prices to 'DEALER PRICES 2025.xlsx' for no-price products")
    if bad_padding and not filter_code:
        print(f"  ACTION REQUIRED: Re-run 'python data/convert_to_csv.py' to fix padding (bug already fixed in code)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate catalog against product data")
    parser.add_argument("--code", help="Check only a specific compatibility code (e.g. 0075)")
    parser.add_argument("--missing-only", action="store_true", help="Show only codes with problems")
    args = parser.parse_args()
    validate(filter_code=args.code, missing_only=args.missing_only)
