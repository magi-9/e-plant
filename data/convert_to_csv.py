"""
One-time script to convert Excel product data to CSV files.
Run from the project root: python data/convert_to_csv.py

Outputs (gitignored via data/):
  data/csv/products.csv       — product catalog from references product_ecommerce.xlsx
  data/csv/retail_prices.csv  — retail pricing from DEALER PRICES 2025.xlsx
"""

import csv
import datetime
import os
import re
import subprocess
import openpyxl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "csv")
os.makedirs(CSV_DIR, exist_ok=True)

RAW_DIR = os.path.join(BASE_DIR, "raw")

PRODUCTS_CSV = os.path.join(CSV_DIR, "products.csv")
RETAIL_PRICES_CSV = os.path.join(CSV_DIR, "retail_prices.csv")
MERGED_IMPORT_CSV = os.path.join(CSV_DIR, "import_all_merged.csv")
COMPATIBILITY_OPTIONS_CSV = os.path.join(CSV_DIR, "compatibility_options.csv")
CATEGORIES_TXT = os.path.join(RAW_DIR, "categories.txt")

REFERENCE_PATTERN = re.compile(r"(?<!\d)(\d{2}\.\d{3}\.\d{3}\.\d{2}-\d)(?!\d)")


def resolve_source_file(filename):
    """Resolve source files from data/raw first, then fallback to data/."""
    candidates = [
        os.path.join(RAW_DIR, filename),
        os.path.join(BASE_DIR, filename),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    raise FileNotFoundError(f"Source file not found: {filename}")


def format_reference(num):
    """Convert numeric reference 49604000082 → '49.604.000.08-2'"""
    s = str(int(num))
    if len(s) == 11:
        return f"{s[0:2]}.{s[2:5]}.{s[5:8]}.{s[8:10]}-{s[10]}"
    return s


def normalize_ref(ref_str):
    """Strip all non-alphanumeric chars and lowercase for matching."""
    return re.sub(r"[^a-z0-9]", "", str(ref_str).lower())


def ref_to_regex(ref_str):
    """Convert wildcard reference to a regex, matching x/y wildcard groups."""
    normalized = normalize_ref(ref_str)
    pattern = re.sub(r"[xy]+", lambda m: r"\\d{" + str(len(m.group())) + r"}", normalized)
    return re.compile(r"^" + pattern + r"$")


def parse_reference_parts(reference):
    """Split reference into stable numeric groups for easier option handling."""
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


def normalize_system_name(name):
    """Normalize system names for resilient matching."""
    return re.sub(r"[^A-Z0-9]", "", str(name).upper())


def load_active_categories(categories_path):
    """Load allowed/active system categories from categories.txt."""
    if not os.path.exists(categories_path):
        return {}

    with open(categories_path, encoding="utf-8") as f:
        raw = f.read()

    tokens = []
    for part in re.split(r"[,\n]+", raw):
        cleaned = part.strip()
        if cleaned:
            tokens.append(cleaned)

    by_norm = {}
    for token in tokens:
        by_norm[normalize_system_name(token)] = token
    return by_norm


def convert_products():
    path = resolve_source_file("references product_ecommerce.xlsx")
    wb = openpyxl.load_workbook(path)
    ws = wb.active

    out_path = os.path.join(CSV_DIR, "products.csv")
    count = 0
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["reference", "reference_num", "name", "ean13"])
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:
                continue  # skip header
            ref_num, name, _title, ean13 = row[0], row[1], row[2], row[3]
            if not ref_num or not name:
                continue
            ref_formatted = format_reference(ref_num)
            writer.writerow([ref_formatted, int(ref_num), name.strip(), ean13 or ""])
            count += 1

    print(f"products.csv: {count} rows → {out_path}")


def convert_retail_prices():
    path = resolve_source_file("DEALER PRICES 2025.xlsx")
    wb = openpyxl.load_workbook(path)
    ws = wb["Retail 2025"]

    out_path = os.path.join(CSV_DIR, "retail_prices.csv")
    count = 0
    current_section = ""

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["section", "name", "detail", "reference", "price_eur"])

        for row in ws.iter_rows(values_only=True):
            col_a, col_b, col_c, col_d = row[0], row[1], row[2], row[3]

            # Skip completely empty rows and header rows
            if all(v is None for v in [col_a, col_b, col_c, col_d]):
                continue
            if col_a in ("PRICES 2025",):
                continue
            if isinstance(col_d, datetime.datetime):
                continue

            # Section header: col_a has a name but no usable price data
            if col_a and col_c in (None, "Item reference") and not isinstance(col_d, (int, float)):
                current_section = str(col_a).strip()
                continue

            if col_c in ("Item reference",):
                continue

            # Product row: has reference in col_c
            if col_c:
                name = str(col_a).strip() if col_a else ""
                detail = str(col_b).strip() if col_b else ""
                reference = str(col_c).strip()
                price = float(col_d) if col_d is not None else None

                # Skip rows with no name and no price (just extra references for same item)
                if not name and price is None:
                    continue

                writer.writerow([current_section, name, detail, reference, price if price is not None else ""])
                count += 1
            elif col_d is not None:
                # Rows with price but no reference (e.g. Novox Pack)
                name = str(col_a).strip() if col_a else ""
                writer.writerow([current_section, name, "", "", float(col_d)])
                count += 1

    print(f"retail_prices.csv: {count} rows → {out_path}")


def load_pdf_text(pdf_path):
    """Extract catalog text with pdftotext first; fallback to pypdf."""
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", pdf_path, "-"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout
    except (FileNotFoundError, subprocess.CalledProcessError):
        try:
            import pypdf

            reader = pypdf.PdfReader(pdf_path)
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return ""


def extract_option_tokens(line_text):
    """Extract compact option tokens (A-E, lengths, angles) from a line."""
    cleaned = REFERENCE_PATTERN.sub(" ", line_text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return ""

    letter_tokens = re.findall(r"\b[A-E]\b", cleaned)
    angle_tokens = re.findall(r"\b\d{1,2}º\b", cleaned)
    number_tokens = re.findall(r"\b\d+(?:[\.,]\d+)?\b", cleaned)

    merged_tokens = []
    for token in letter_tokens + angle_tokens + number_tokens:
        if token not in merged_tokens:
            merged_tokens.append(token)

    return "|".join(merged_tokens[:8])


def parse_pdf_compatibility_rows(pdf_text):
    """Parse rows with references, compatibility code and option tokens from catalog text."""
    rows = []
    current_code = ""
    current_section = ""
    expect_code_next_line = False

    for raw_line in pdf_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        compatible = re.search(r"COMPATIBLE\s+WITH\s*([0-9]{4})", line, flags=re.IGNORECASE)
        if compatible:
            current_code = compatible.group(1)
            continue

        if re.fullmatch(r"COMPATIBLE\s+WITH", line, flags=re.IGNORECASE):
            expect_code_next_line = True
            continue

        if expect_code_next_line and re.fullmatch(r"\d{4}", line):
            current_code = line
            expect_code_next_line = False
            continue

        expect_code_next_line = False

        if re.fullmatch(r"[A-Z][A-Z\s\-/()]{2,60}", line) and "PRODUCT REFERENCES" not in line:
            current_section = line

        refs = REFERENCE_PATTERN.findall(line)
        if not refs:
            continue

        option_tokens = extract_option_tokens(line)
        for ref in refs:
            parts = parse_reference_parts(ref)
            rows.append(
                {
                    "compatibility_code": current_code,
                    "section": current_section,
                    "reference": ref,
                    "reference_prefix": parts["segment_1"],
                    "reference_group": parts["segment_2"],
                    "reference_family": parts["segment_3"],
                    "reference_option": parts["segment_4"],
                    "reference_variant": parts["check_digit"],
                    "options": option_tokens,
                    "source_line": line,
                }
            )

    return rows


def parse_code_to_systems_map(pdf_text):
    """Parse `COMPATIBLE WITH XXXX` blocks and extract listed implant systems."""
    code_to_systems = {}
    current_code = ""
    collect_systems = False
    expect_code_next_line = False

    for raw_line in pdf_text.splitlines():
        line = raw_line.strip()
        if not line:
            if collect_systems:
                collect_systems = False
            continue

        compatible = re.search(r"COMPATIBLE\s+WITH\s*([0-9]{4})", line, flags=re.IGNORECASE)
        if compatible:
            current_code = compatible.group(1)
            code_to_systems.setdefault(current_code, [])
            collect_systems = False
            continue

        if re.fullmatch(r"COMPATIBLE\s+WITH", line, flags=re.IGNORECASE):
            expect_code_next_line = True
            collect_systems = False
            continue

        if expect_code_next_line and re.fullmatch(r"\d{4}", line):
            current_code = line
            code_to_systems.setdefault(current_code, [])
            expect_code_next_line = False
            continue

        if expect_code_next_line:
            expect_code_next_line = False

        if "LIST OF COMPATIBILITIES AVAILABLE" in line.upper():
            collect_systems = True
            continue

        if not collect_systems or not current_code:
            continue

        if any(
            marker in line.upper()
            for marker in (
                "STANDARD DYNAMIC",
                "DYNAMIC 3TIBASE",
                "SCANBODY",
                "DYNAMIC MILLING TOOL",
                "SCREWS",
                "STRAIGHT",
                "MULTI-UNIT",
                "LIBRARY OPTIONS",
                "PRODUCT REFERENCES",
            )
        ):
            collect_systems = False
            continue

        candidates = [s.strip(" -") for s in re.split(r"\s+-\s+", line) if s.strip(" -")]
        if len(candidates) == 1 and "-" in line and " - " not in line:
            candidates = [s.strip(" -") for s in line.split("-") if s.strip(" -")]

        for candidate in candidates:
            if len(candidate) < 2:
                continue
            if re.search(r"\d{2}\.\d{3}\.\d{3}\.\d{2}-\d", candidate):
                continue
            if candidate not in code_to_systems[current_code]:
                code_to_systems[current_code].append(candidate)

    return code_to_systems


def write_compatibility_options_csv(rows):
    """Write parsed PDF compatibility/option rows to CSV for auditing and import."""
    with open(COMPATIBILITY_OPTIONS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "compatibility_code",
                "section",
                "reference",
                "reference_prefix",
                "reference_group",
                "reference_family",
                "reference_option",
                "reference_variant",
                "options",
                "source_line",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row["compatibility_code"],
                    row["section"],
                    row["reference"],
                    row["reference_prefix"],
                    row["reference_group"],
                    row["reference_family"],
                    row["reference_option"],
                    row["reference_variant"],
                    row["options"],
                    row["source_line"],
                ]
            )

    print(f"compatibility_options.csv: {len(rows)} rows → {COMPATIBILITY_OPTIONS_CSV}")


def build_option_map(parsed_rows):
    """Map compatibility family number to aggregated option token string."""
    by_family = {}
    for row in parsed_rows:
        family = row.get("reference_family")
        if not family:
            continue
        by_family.setdefault(family, [])
        token = row.get("options", "")
        if token and token not in by_family[family]:
            by_family[family].append(token)
    return {family: ";".join(tokens[:12]) for family, tokens in by_family.items()}


def build_price_lookup():
    """Build exact + wildcard pricing lookups from retail prices CSV."""
    exact = {}
    patterns = []

    with open(RETAIL_PRICES_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref = row["reference"].strip()
            price = row["price_eur"].strip()
            if not ref:
                continue

            payload = {
                "name": row["name"].strip(),
                "price": price,
                "section": row["section"].strip(),
                "detail": row["detail"].strip(),
                "reference": ref,
            }
            norm = normalize_ref(ref)
            if re.search(r"[xXyY]", ref):
                patterns.append((ref_to_regex(ref), payload))
            else:
                exact[norm] = payload

    return exact, patterns


def match_price(reference_num, exact, patterns):
    """Match variant reference number to exact or wildcard retail pricing."""
    norm = normalize_ref(reference_num)
    if norm in exact:
        return exact[norm], "exact"

    for regex, payload in patterns:
        if regex.match(norm):
            return payload, "wildcard"

    return {"price": "", "section": "", "detail": "", "reference": ""}, "none"


def build_merged_import_csv(option_map, code_to_systems, active_categories):
    """Merge products, prices and parsed PDF option families into one import-ready CSV."""
    exact, patterns = build_price_lookup()

    count = 0
    with open(PRODUCTS_CSV, newline="", encoding="utf-8") as src, open(
        MERGED_IMPORT_CSV, "w", newline="", encoding="utf-8"
    ) as dst:
        reader = csv.DictReader(src)
        writer = csv.writer(dst)
        writer.writerow(
            [
                "name",
                "description",
                "category",
                "price",
                "stock_quantity",
                "reference",
                "reference_num",
                "ean13",
                "price_match_type",
                "price_reference",
                "retail_name",
                "compatibility_code",
                "ref_segment_1",
                "ref_segment_2",
                "ref_segment_3",
                "ref_segment_4",
                "ref_check_digit",
                "options",
                "generated_description",
                "system_categories",
                "active_system_categories",
                "primary_system_category",
                "is_active_from_categories",
            ]
        )

        for row in reader:
            ref = row["reference"].strip()
            ref_num = row["reference_num"].strip()
            name = row["name"].strip()
            parts = parse_reference_parts(ref)
            price_payload, match_type = match_price(ref_num, exact, patterns)
            family_code = parts["segment_3"]
            padded_family = family_code.zfill(4) if family_code else ""
            systems = code_to_systems.get(padded_family, [])
            active_systems = [
                active_categories[normalize_system_name(system)]
                for system in systems
                if normalize_system_name(system) in active_categories
            ]
            primary_system = active_systems[0] if active_systems else (systems[0] if systems else "")
            is_active = 1 if active_systems else 0
            retail_name = price_payload.get("name", "")
            description_parts = [
                price_payload["detail"],
                f"Referenčný kód: {ref}",
                f"Systém: {primary_system}" if primary_system else "",
                f"Parametre: {option_map.get(family_code, '')}" if option_map.get(family_code, "") else "",
            ]
            generated_description = " | ".join([p for p in description_parts if p])

            writer.writerow(
                [
                    name,
                    price_payload["detail"],
                    price_payload["section"],
                    price_payload["price"],
                    0,
                    ref,
                    ref_num,
                    row.get("ean13", "").strip(),
                    match_type,
                    price_payload["reference"],
                    retail_name,
                    family_code,
                    parts["segment_1"],
                    parts["segment_2"],
                    parts["segment_3"],
                    parts["segment_4"],
                    parts["check_digit"],
                    option_map.get(family_code, ""),
                    generated_description,
                    ";".join(systems),
                    ";".join(active_systems),
                    primary_system,
                    is_active,
                ]
            )
            count += 1

    print(f"import_all_merged.csv: {count} rows → {MERGED_IMPORT_CSV}")


def convert_catalog_pdf_options():
    """Parse PDF catalog and generate compatibility options CSV + merged import CSV."""
    pdf_path = resolve_source_file("PRODUCT-REFERENCE-0326_01.pdf")
    pdf_text = load_pdf_text(pdf_path)
    active_categories = load_active_categories(CATEGORIES_TXT)
    if not pdf_text:
        print("compatibility_options.csv: skipped (could not parse PDF text)")
        build_merged_import_csv({}, {}, active_categories)
        return

    rows = parse_pdf_compatibility_rows(pdf_text)
    code_to_systems = parse_code_to_systems_map(pdf_text)
    write_compatibility_options_csv(rows)
    option_map = build_option_map(rows)
    build_merged_import_csv(option_map, code_to_systems, active_categories)


if __name__ == "__main__":
    print("Converting Excel files to CSV...\n")
    convert_products()
    convert_retail_prices()
    convert_catalog_pdf_options()
    print("\nDone. Files are in data/csv/ (gitignored).")
