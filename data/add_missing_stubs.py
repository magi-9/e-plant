"""
One-off script: add stub rows for product references found in compatibility_options.csv
but missing from both products.csv and product_stubs.csv.

Stubs get a generated name and no EAN/price, so they import as is_visible=False.
product_stubs.csv is committed and never overwritten by convert_to_csv.py.

Run from the repo root:
    python3 data/add_missing_stubs.py
Then regenerate and reimport:
    python3 data/convert_to_csv.py
    docker compose exec -T backend python manage.py import_product_data --replace-all
"""

import csv
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent
PRODUCTS_CSV = DATA_DIR / "csv" / "products.csv"
STUBS_CSV = DATA_DIR / "csv" / "product_stubs.csv"
COMPAT_CSV = DATA_DIR / "csv" / "compatibility_options.csv"

_PRIMARY_CATALOG_SECTIONS = (
    "STANDARD DYNAMIC TIBASE",
    "DYNAMIC 3TIBASE",
    "DYNAMIC SCANBODY (LAB/CLIN)",
    "DYNAMIC MILLING TOOL",
    "DYNAMIC SCREWDRIVERS",
    "ANALOG",
    "STRAIGHT MULTI-UNIT",
    "STRAIGHT",
    "INTERNAL MULTI-UNIT",
    "MULTI-UNIT",
    "SCANBODY OP",
    "SCANBODY",
    "DAS MU SYSTEM COMPONENTS",
    "COMPLEMENTS",
    "DIRECTO IMPLANTE",
)
_PRIORITY = {s: i for i, s in enumerate(_PRIMARY_CATALOG_SECTIONS)}


def _clean_section(raw: str) -> str:
    return re.sub(r"\s{2,}", " ", raw.strip())


def _format_options(raw: str) -> str:
    if not raw:
        return ""
    parts = []
    for part in raw.split("|"):
        part = part.strip()
        if not part:
            continue
        part = re.sub(r"\(mm\):(\S+)", r":\1mm", part)
        parts.append(part)
    return " ".join(parts)


def _section_to_label(section: str) -> str:
    section = _clean_section(section)
    section = section.split("  ")[0].strip() if "  " in section else section
    words = section.split()
    return " ".join(w.capitalize() if w.isupper() and len(w) > 1 else w for w in words)


def _make_name(ref: str, section: str, options: str) -> str:
    label = _section_to_label(section) or "Product"
    opts = _format_options(options)
    return f"{label} {opts}" if opts else f"{label} {ref}"


def _ref_to_num(ref: str) -> str:
    return re.sub(r"[.\-]", "", ref)


def main() -> None:
    # Load all already-known references (products.csv + existing stubs)
    known: set[str] = set()
    for path in (PRODUCTS_CSV, STUBS_CSV):
        if path.exists():
            with path.open(newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    known.add(row["reference"].strip())

    # Find best (section, options) per missing ref from compatibility_options.csv
    best: dict[str, tuple[str, str]] = {}
    with COMPAT_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row.get("reference", "").strip()
            section = _clean_section(row.get("section", ""))
            options = row.get("options", "").strip()
            if not ref or ref in known:
                continue
            if ref not in best or _PRIORITY.get(section, 999) < _PRIORITY.get(best[ref][0], 999):
                best[ref] = (section, options)

    if not best:
        print("No missing references found – stubs are already up to date.")
        return

    stubs = sorted(best.items())
    needs_header = not STUBS_CSV.exists()

    print(f"Adding {len(stubs)} stub rows to {STUBS_CSV.name}…")
    with STUBS_CSV.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if needs_header:
            writer.writerow(["reference", "reference_num", "name", "ean13"])
        for ref, (section, options) in stubs:
            writer.writerow([ref, _ref_to_num(ref), _make_name(ref, section, options), ""])

    print(f"Done. {len(stubs)} stubs written.")
    print("\nNext steps:")
    print("  python3 data/convert_to_csv.py")
    print("  docker compose exec -T backend python manage.py import_product_data --replace-all")
    print("\nSample rows added:")
    for ref, (section, options) in stubs[:8]:
        print(f"  {ref}  →  {_make_name(ref, section, options)!r}")


if __name__ == "__main__":
    main()
