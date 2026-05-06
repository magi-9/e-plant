#!/usr/bin/env python3
"""
Parse DAS dental product catalog PDF → products.csv + compat_index.csv

Usage:
    python data/parse_catalog.py data/raw/PRODUCT-REFERENCE-0326_01.pdf
    python data/parse_catalog.py /path/to/file.pdf --output /output/
    python data/parse_catalog.py /path/to/file.pdf --pages-index 9-42 --pages-products 43-329
"""

import argparse
import csv
import os
import re
import subprocess
import sys
from collections import defaultdict

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

SKU_RE = re.compile(r"\b(\d{2}\.\d{3}\.\d{3}\.\d{2}-\d)\b")
# Match "COMPATIBLE WITH 0040" or "COMPATIBLE WITH 0040B" — capture just the 4 digits
CODE_INLINE_RE = re.compile(r"COMPATIBLE\s+WITH\s+(\d{4})[A-Z]?", re.IGNORECASE)
CODE_SPLIT_RE = re.compile(r"^COMPATIBLE\s+WITH\s*$", re.IGNORECASE)
# Match "0040" or "0040B" — letter suffix is a variant of the same code
FOUR_DIGIT_RE = re.compile(r"^(\d{4})[A-Z]?$")
BACK_TO_INDEX_RE = re.compile(r"BACK\s+TO\s+INDEX", re.IGNORECASE)
FOOTER_RE = re.compile(r"^(\d+)\s+PRODUCT REFERENCES", re.IGNORECASE)
LIST_COMPAT_RE = re.compile(r"LIST\s+OF\s+COMPATIBILITIES\s+AVAILABLE", re.IGNORECASE)
ANGLE_RE = re.compile(r"(\d+)\s*[º°]")
NUM_RE = re.compile(r"\b(\d+[,.]?\d*)\b")

# Section header triggers — order matters (more specific first).
# Each entry: (substring_to_detect, canonical_product_type)
# Only matched when line has left-margin indentation ≤ MAX_SECTION_INDENT.
MAX_SECTION_INDENT = 5

SECTION_TRIGGERS = [
    ("DYNAMIC 3TIBASE",          "DYNAMIC 3TIBASE"),
    ("STANDARD DYNAMIC TIBASE",  "STANDARD DYNAMIC TIBASE"),
    ("DYNAMIC SCANBODY",         "DYNAMIC SCANBODY"),
    ("DYNAMIC MILLING TOOL",     "DYNAMIC MILLING TOOL"),
    ("STRAIGHT MULTI-UNIT",      "STRAIGHT MULTI-UNIT"),
    ("ANGULATED MULTI-UNIT",     "ANGULATED MULTI-UNIT"),
    ("INTERNAL MULTI-UNIT",      "INTERNAL MULTI-UNIT"),
    ("SCANBODY OP",              "SCANBODY OP"),
    ("LAB SCANBODY",             "LAB SCANBODY"),  # may also appear inline with SCANALOG
    ("SCANALOG",                 "SCANALOG"),
    ("MULTI-UNIT",               "MULTI-UNIT"),    # after STRAIGHT/ANGULATED/INTERNAL
    ("SCREWS",                   "SCREWS"),
    ("ANALOG",                   "ANALOG"),        # standalone ANALOG section (rare)
]

# Product types that use the NON ENGAGING / ENGAGING two-column layout
TIBASE_TYPES = {"STANDARD DYNAMIC TIBASE", "DYNAMIC 3TIBASE"}

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_text(pdf_path: str, first_page: int = None, last_page: int = None) -> str:
    cmd = ["pdftotext", "-layout"]
    if first_page:
        cmd += ["-f", str(first_page)]
    if last_page:
        cmd += ["-l", str(last_page)]
    cmd += [pdf_path, "-"]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit(f"pdftotext error: {r.stderr.strip()}")
    return r.stdout

# ---------------------------------------------------------------------------
# Column position helpers
# ---------------------------------------------------------------------------

def col_positions(header_line: str, *labels) -> dict:
    """
    Return {label: col_position} for each label found in header_line.
    Searches case-insensitively for each label.
    """
    result = {}
    for label in labels:
        m = re.search(re.escape(label), header_line, re.IGNORECASE)
        if m:
            result[label] = m.start()
    return result


def nearest_col(sku_col: int, col_map: dict) -> str:
    """Return the label whose column position is nearest to sku_col."""
    if not col_map:
        return ""
    return min(col_map, key=lambda k: abs(col_map[k] - sku_col))


def sku_column(line: str, sku_match) -> int:
    """Return the character column of the centre of a SKU match."""
    return (sku_match.start() + sku_match.end()) // 2


# ---------------------------------------------------------------------------
# Dimension extraction helpers
# ---------------------------------------------------------------------------

def extract_gh(line: str, right_limit: int) -> str | None:
    """Extract GH/H value from the left portion of a line (before right_limit)."""
    segment = line[:right_limit]
    nums = NUM_RE.findall(segment)
    angles = ANGLE_RE.findall(segment)
    candidates = [n for n in nums if n not in angles and not re.fullmatch(r"\d{4}", n)]
    return candidates[0].replace(",", ".") if candidates else None


def extract_angles(line: str, right_limit: int) -> list[str]:
    """Return list of angle strings (e.g. ['43°', '29°']) from left portion."""
    return [a + "°" for a in ANGLE_RE.findall(line[:right_limit])]


def extract_length(line: str) -> str | None:
    """Extract a length value (typically 18, 24, 32 for screws) from a line."""
    nums = NUM_RE.findall(line)
    for n in nums:
        if not SKU_RE.search(n) and not re.fullmatch(r"\d{4}", n):
            return n.replace(",", ".")
    return None

# ---------------------------------------------------------------------------
# Index parser (pages 9-42)
# ---------------------------------------------------------------------------

def parse_compat_index(text: str) -> list[dict]:
    rows = []
    current_brand = ""
    pending_model: list[str] = []
    header_cols: dict = {}

    def flush(implant, platform, code, page):
        if pending_model:
            rows.append({
                "implant_brand": current_brand,
                "implant_model": " ".join(pending_model).strip(),
                "implant_size": implant,
                "platform": platform,
                "code": code,
                "page": page,
            })

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            continue
        if BACK_TO_INDEX_RE.search(stripped):
            continue
        if FOOTER_RE.match(stripped) or stripped == "COMPATIBILITIES AVAILABLE":
            continue

        # Brand + column-header line: contains MODEL and CODE keywords
        if re.search(r"\bMODEL\b", stripped) and re.search(r"\bCODE\b", stripped):
            m = re.match(r"^([A-Z][A-Z0-9\s\-/&.]+?)\s{3,}", line)
            if m:
                cand = m.group(1).strip()
                if cand and cand not in ("PRODUCT",):
                    current_brand = cand
            header_cols = {}
            for col_name in ("MODEL", "IMPLANT", "PLATFORM", "CODE"):
                m2 = re.search(r"\b" + col_name + r"\b", line)
                if m2:
                    header_cols[col_name] = m2.start()
            pending_model = []
            continue

        # Data row must have a 4-digit code
        code_m = re.search(r"\b(\d{4})\b", stripped)
        if not code_m or not current_brand:
            if re.fullmatch(r"[A-Z][A-Z0-9\s\-/().Ø]+", stripped) and len(stripped) < 60:
                pending_model.append(stripped)
            continue

        code = code_m.group(1).zfill(4)
        nums = re.findall(r"\b(\d+)\b", line)
        page = ""
        for n in reversed(nums):
            if n != code and int(n) > 40:
                page = n
                break

        code_pos = line.find(code)
        implant, platform = "", ""
        if "IMPLANT" in header_cols and "PLATFORM" in header_cols:
            imp_s = header_cols["IMPLANT"]
            plt_s = header_cols["PLATFORM"]
            plt_e = header_cols.get("CODE", code_pos)
            implant = line[imp_s:plt_s].strip()
            platform = line[plt_s:plt_e].strip()

        model_in_line = ""
        if "MODEL" in header_cols and "IMPLANT" in header_cols:
            model_in_line = line[header_cols["MODEL"]:header_cols["IMPLANT"]].strip()
        if model_in_line:
            pending_model = [model_in_line]

        flush(implant, platform, code, page)
        pending_model = []

    return rows

# ---------------------------------------------------------------------------
# Product page state machine
# ---------------------------------------------------------------------------

def _make_base(code, ptype, brands, page):
    return {
        "sku": None, "engaging": None, "code": code, "product_type": ptype,
        "GH_mm": None, "CH_mm": None, "alpha_S": None, "alpha_C": None, "alpha_di": None,
        "H_mm": None, "length_mm": None, "height_mm": None, "type_label": None,
        "compatible_brands": "; ".join(brands), "page_start": page,
    }


def parse_products(text: str, pdf_first_page: int = 43) -> list[dict]:
    products = []

    # --- State ---
    code = ""
    page = pdf_first_page
    section = ""              # Current section name
    subsection = ""           # Within SCREWS: DYNAMIC SCREW / STRAIGHT SCREW
    brands: list[str] = []
    collecting_brands = False
    after_back_to_index = False
    expect_4digit_code = False  # After seeing "COMPATIBLE WITH" alone

    # Engaging table state (TIBASE)
    engaging_cols = None      # (ne_col, e_col)
    is_3tibase = False
    ch_vals: list[str] = []   # e.g. ["5", "7", "9"] from CH=Nmm headers

    # MULTI-UNIT single-column state
    mu_engaging: int | None = None   # 0 = NON ENGAGING col, 1 = ENGAGING col

    # Column maps for column-classified sections
    scanbody_cols: dict = {}   # DYNAMIC SCANBODY column positions
    screws_cols: dict = {}     # SCREWS subsection column positions
    milling_cols: dict = {}    # MILLING TOOL / ANALOG column positions
    scanbodyop_cols: dict = {} # SCANBODY OP column positions
    lab_scanalog_col: int | None = None  # SCANALOG col pos in LAB SCANBODY section

    # Persistent context within a section
    current_h: str | None = None      # H (mm) value, carried across multi-line rows
    current_gh: str | None = None     # GH (mm) value
    current_length: str | None = None # LENGTH for screws
    pending_line_prefix: str = ""     # For multi-line headers: "DYNAMIC", "STRAIGHT", "LAB"

    lines = text.splitlines()

    for i, raw_line in enumerate(lines):
        line = raw_line.rstrip()
        stripped = line.strip()

        # ---- Page break -----------------------------------------------
        if "\x0c" in line:
            page += line.count("\x0c")
            stripped = stripped.replace("\x0c", "").strip()
            after_back_to_index = False
            if not stripped:
                continue

        # ---- Footer ---------------------------------------------------
        footer_m = FOOTER_RE.match(stripped)
        if footer_m:
            page = int(footer_m.group(1))
            after_back_to_index = BACK_TO_INDEX_RE.search(stripped) is not None
            continue
        if BACK_TO_INDEX_RE.search(stripped):
            after_back_to_index = True
            continue
        if stripped.startswith("LIBRARY OPTIONS"):
            continue

        # ---- Empty line -----------------------------------------------
        if not stripped:
            collecting_brands = False
            pending_line_prefix = ""
            continue

        # ---- COMPATIBLE WITH detection --------------------------------
        inline_m = CODE_INLINE_RE.search(stripped)
        if inline_m:
            new_code = inline_m.group(1).zfill(4)
            if new_code == code and after_back_to_index:
                after_back_to_index = False
                continue
            # New code
            code = new_code
            section = ""
            subsection = ""
            brands = []
            collecting_brands = False
            engaging_cols = None
            is_3tibase = False
            ch_vals = []
            mu_engaging = None
            scanbody_cols = {}
            screws_cols = {}
            milling_cols = {}
            scanbodyop_cols = {}
            lab_scanalog_col = None
            current_h = None
            current_gh = None
            current_length = None
            pending_line_prefix = ""
            after_back_to_index = False
            expect_4digit_code = False
            continue

        if CODE_SPLIT_RE.match(stripped):
            expect_4digit_code = True
            continue

        four_m = FOUR_DIGIT_RE.fullmatch(stripped)
        if expect_4digit_code and four_m:
            new_code = four_m.group(1)  # just the 4 digits, letter suffix stripped
            if not (new_code == code and after_back_to_index):
                code = new_code
                section = ""
                subsection = ""
                brands = []
                collecting_brands = False
                engaging_cols = None
                is_3tibase = False
                ch_vals = []
                mu_engaging = None
                scanbody_cols = {}
                screws_cols = {}
                milling_cols = {}
                scanbodyop_cols = {}
                lab_scanalog_col = None
                current_h = None
                current_gh = None
                current_length = None
                pending_line_prefix = ""
            after_back_to_index = False
            expect_4digit_code = False
            continue

        expect_4digit_code = False
        if not code:
            continue

        # ---- Brand collection -----------------------------------------
        if LIST_COMPAT_RE.search(stripped):
            collecting_brands = True
            brands = []
            continue

        if collecting_brands:
            if (re.fullmatch(r"[A-Z][A-Z0-9\s\-/()&.]+", stripped)
                    and not SKU_RE.search(stripped) and len(stripped) < 100):
                for part in re.split(r"\s*-\s*|\s{3,}", stripped):
                    part = part.strip(" -")
                    if part and len(part) > 1:
                        brands.append(part)
            else:
                collecting_brands = False
            # Fall through — line might also be a section header

        # ---- Section detection ----------------------------------------
        indent = len(line) - len(line.lstrip())
        upper = stripped.upper()

        # Multi-line header continuation: "DYNAMIC/STRAIGHT/LAB" → next line completes it
        if pending_line_prefix:
            combined = pending_line_prefix + " " + upper
            detected = ""
            for kw, ptype in SECTION_TRIGGERS:
                if kw in combined and not SKU_RE.search(stripped):
                    detected = ptype
                    break
            if detected:
                section = detected
                subsection = ""
                engaging_cols = None
                is_3tibase = (section == "DYNAMIC 3TIBASE")
                ch_vals = []
                mu_engaging = None
                scanbody_cols = {}
                screws_cols = {}
                milling_cols = {}
                scanbodyop_cols = {}
                lab_scanalog_col = None
                current_h = None
                current_gh = None
                current_length = None
                pending_line_prefix = ""
                # LAB SCANBODY + SCANALOG: second line has "SCANBODY   SCANALOG"
                # Save SCANALOG column position from this header line for data classification
                if "LAB SCANBODY" in combined and "SCANALOG" in upper:
                    scanalog_m = re.search(r"SCANALOG", line, re.IGNORECASE)
                    lab_scanalog_col = scanalog_m.start() if scanalog_m else None
                continue
            pending_line_prefix = ""

        # Detect single-word prefixes that might start multi-line headers.
        # "LAB" appears at indent ~11 in the PDF; use a generous limit of 15.
        if (indent <= 15 and not SKU_RE.search(stripped)
                and re.fullmatch(r"[A-Z][A-Z]+", stripped)
                and stripped in ("DYNAMIC", "STRAIGHT", "LAB")):
            pending_line_prefix = stripped
            continue

        # Standard section trigger (keyword at left margin, no SKU on line)
        if indent <= MAX_SECTION_INDENT and not SKU_RE.search(stripped):
            detected_section = ""
            for kw, ptype in SECTION_TRIGGERS:
                if kw in upper:
                    detected_section = ptype
                    break
            if detected_section:
                section = detected_section
                subsection = ""
                engaging_cols = None
                is_3tibase = (section == "DYNAMIC 3TIBASE")
                ch_vals = []
                mu_engaging = None
                scanbody_cols = {}
                screws_cols = {}
                milling_cols = {}
                scanbodyop_cols = {}
                current_h = None
                current_gh = None
                current_length = None

                lab_scanalog_col = None
                # Inline LAB SCANBODY + SCANALOG: both on same line — save SCANALOG col
                if "LAB" in upper and "SCANALOG" in upper:
                    section = "LAB SCANBODY"
                    scanalog_m = re.search(r"SCANALOG", line, re.IGNORECASE)
                    lab_scanalog_col = scanalog_m.start() if scanalog_m else None
                continue

        if not section:
            continue

        # ---- Table header detection ------------------------------------

        # TIBASE: detect NON ENGAGING / ENGAGING header
        if section in TIBASE_TYPES:
            if "NON ENGAGING" in upper and not SKU_RE.search(stripped):
                ne_m = re.search(r"NON\s+ENGAGING", line, re.IGNORECASE)
                e_m = None
                for m in re.finditer(r"ENGAGING", line, re.IGNORECASE):
                    if m.start() > ne_m.end():
                        e_m = m
                        break
                if ne_m and e_m:
                    engaging_cols = (ne_m.start(), e_m.start())
                continue

            # 3TIBASE CH= sub-header
            if is_3tibase and re.search(r"CH=\d+mm", stripped, re.IGNORECASE):
                ch_vals = re.findall(r"CH=(\d+)mm", stripped, re.IGNORECASE)
                continue

        # DYNAMIC SCANBODY: detect column header
        if section == "DYNAMIC SCANBODY" and not scanbody_cols and not SKU_RE.search(stripped):
            if "SCANBODY" in upper and "H" in upper:
                scanbody_cols = col_positions(line, "SCANBODY", "ADAPTOR", "SCREWDRIVER")
                # SCANBODY column is for actual scanbody SKUs; ADAPTOR + SCREWDRIVER → SCREWDRIVER type
                continue

        # SCREWS: detect subsection and column header
        if section == "SCREWS":
            # Within SCREWS, detect DYNAMIC SCREW / STRAIGHT SCREW subsection table headers
            # These appear at indentation ~8-10 and contain "SCREW"
            if not SKU_RE.search(stripped) and "SCREW" in upper and indent > MAX_SECTION_INDENT:
                if "DYNAMIC" in upper or (subsection == "DYNAMIC SCREW"):
                    subsection = "DYNAMIC SCREW"
                    # Extract column positions for SCREW and SCREWDRIVER within this header
                    screws_cols = col_positions(line, "SCREWDRIVER", "LENGTH", "TYPE", "HIGH")
                    # The SCREW column is at the leftmost non-space position (~indent)
                    screws_cols["DYNAMIC SCREW"] = indent
                    continue
                if "STRAIGHT" in upper:
                    subsection = "STRAIGHT SCREW"
                    screws_cols = col_positions(line, "SCREWDRIVER", "TYPE")
                    screws_cols["STRAIGHT SCREW"] = indent
                    continue

            # Detect LENGTH / TYPE values on non-SKU lines
            if not SKU_RE.search(stripped):
                ln_m = re.search(r"\b(18|24|32)\b", stripped)
                if ln_m:
                    current_length = ln_m.group(1)
                continue  # non-SKU line in SCREWS section

        # DYNAMIC MILLING TOOL: detect column header
        if section == "DYNAMIC MILLING TOOL" and not milling_cols and not SKU_RE.search(stripped):
            if "MILLING" in upper or "ANALOG" in upper or "SHANK" in upper:
                milling_cols = col_positions(
                    line, "DYNAMIC MILLING TOOL", "ANALOG", "DIGITAL ANALOG"
                )
                # SHANK col is leftmost (indent position)
                milling_cols["SHANK"] = indent
                continue

        # MULTI-UNIT: detect single NON ENGAGING or ENGAGING column header
        if section in ("STRAIGHT MULTI-UNIT", "MULTI-UNIT", "INTERNAL MULTI-UNIT",
                       "ANGULATED MULTI-UNIT"):
            if "NON ENGAGING" in upper and not SKU_RE.search(stripped):
                mu_engaging = 0
                continue
            if "ENGAGING" in upper and "NON" not in upper and not SKU_RE.search(stripped):
                mu_engaging = 1
                continue

        # SCANBODY OP: detect column header
        if section == "SCANBODY OP" and not scanbodyop_cols and not SKU_RE.search(stripped):
            if "PEEK PINS" in upper or "SCANBODY" in upper:
                scanbodyop_cols = col_positions(line, "SCANBODY", "PEEK PINS", "SCREWDRIVER")
                continue

        # ---- Skip non-SKU lines (collect context) ----------------------
        if not SKU_RE.search(stripped):
            # Collect H (mm) value if present in non-SKU lines
            if section == "DYNAMIC SCANBODY":
                h_m = re.search(r"^\s+(\d+)\s*$", line)
                if h_m:
                    current_h = h_m.group(1)
            # Collect GH value for MULTI-UNIT tables
            if section in ("STRAIGHT MULTI-UNIT", "MULTI-UNIT", "INTERNAL MULTI-UNIT",
                           "ANGULATED MULTI-UNIT"):
                gh_m = re.search(r"(\d+[,.]?\d*)", stripped)
                if gh_m and not re.fullmatch(r"\d{4}", gh_m.group(1)):
                    current_gh = gh_m.group(1).replace(",", ".")
            continue

        # ---- Emit rows for all SKUs in this line ----------------------
        skus = list(SKU_RE.finditer(line))

        # == TIBASE: two-column engaging table ==========================
        if section in TIBASE_TYPES and engaging_cols:
            ne_col, e_col = engaging_cols
            gh = extract_gh(line, ne_col)
            angles = extract_angles(line, ne_col)

            if is_3tibase and ch_vals:
                # alpha_S encodes all three CH columns: "5mm:25°/7mm:20°/9mm:10°"
                alpha_s_parts = []
                for j, cv in enumerate(ch_vals):
                    a = angles[j] if j < len(angles) else "-"
                    alpha_s_parts.append(f"CH={cv}mm:{a}")
                alpha_s = " / ".join(alpha_s_parts)
                alpha_c = None
            else:
                alpha_s = angles[0] if angles else None
                alpha_c = angles[1] if len(angles) > 1 else None

            ne_sku = e_sku = None
            for sm in skus:
                mid = sku_column(line, sm)
                if abs(mid - ne_col) <= abs(mid - e_col):
                    ne_sku = sm.group(1)
                else:
                    e_sku = sm.group(1)

            base = _make_base(code, section, brands, page)
            base.update(GH_mm=gh, alpha_S=alpha_s, alpha_C=alpha_c)
            if ne_sku:
                products.append({**base, "sku": ne_sku, "engaging": 0})
            if e_sku:
                products.append({**base, "sku": e_sku, "engaging": 1})
            continue

        # == MULTI-UNIT: single-column engaging/non-engaging ============
        if section in ("STRAIGHT MULTI-UNIT", "MULTI-UNIT", "INTERNAL MULTI-UNIT",
                       "ANGULATED MULTI-UNIT"):
            gh = extract_gh(line, len(line))
            if not gh:
                gh = current_gh
            else:
                current_gh = gh
            base = _make_base(code, section, brands, page)
            base.update(GH_mm=gh, engaging=mu_engaging)
            for sm in skus:
                products.append({**base, "sku": sm.group(1)})
            continue

        # == DYNAMIC SCANBODY: column-classified ========================
        if section == "DYNAMIC SCANBODY":
            # Try to pick up H value from this line
            h_candidates = [n for n in NUM_RE.findall(line[:30])
                            if not re.fullmatch(r"\d{4}", n)
                            and not SKU_RE.search(n)]
            if h_candidates:
                current_h = h_candidates[0].replace(",", ".")

            for sm in skus:
                mid = sku_column(line, sm)
                if scanbody_cols:
                    col_label = nearest_col(mid, scanbody_cols)
                    if col_label == "SCANBODY":
                        ptype = "DYNAMIC SCANBODY"
                    else:
                        ptype = "SCREWDRIVER"
                else:
                    ptype = "DYNAMIC SCANBODY"
                base = _make_base(code, ptype, brands, page)
                base["H_mm"] = current_h
                products.append({**base, "sku": sm.group(1)})
            continue

        # == LAB SCANBODY + SCANALOG: use saved column position from header ==
        if section in ("LAB SCANBODY", "SCANALOG"):
            # Fall back to searching the data line (rare case where header col unknown)
            if lab_scanalog_col is None:
                scanalog_m = re.search(r"SCANALOG", line, re.IGNORECASE)
                scanalog_pos = scanalog_m.start() if scanalog_m else 999
            else:
                scanalog_pos = lab_scanalog_col

            for sm in skus:
                mid = sku_column(line, sm)
                ptype = "SCANALOG" if mid >= scanalog_pos else "LAB SCANBODY"
                base = _make_base(code, ptype, brands, page)
                products.append({**base, "sku": sm.group(1)})
            continue

        # == SCREWS: column-classified ==================================
        if section == "SCREWS":
            effective_sub = subsection or "DYNAMIC SCREW"
            for sm in skus:
                mid = sku_column(line, sm)
                if screws_cols:
                    col_label = nearest_col(mid, screws_cols)
                    if "SCREWDRIVER" in col_label:
                        ptype = "SCREWDRIVER"
                    else:
                        ptype = effective_sub
                else:
                    ptype = effective_sub

                base = _make_base(code, ptype, brands, page)
                base["length_mm"] = current_length
                # TYPE label for STRAIGHT SCREW
                type_m = re.search(r"Hex\.\s*[\d.]+|HEX\s*[\d.]+", stripped, re.IGNORECASE)
                if type_m:
                    base["type_label"] = type_m.group(0)
                products.append({**base, "sku": sm.group(1)})
            continue

        # == DYNAMIC MILLING TOOL / ANALOG: column-classified ===========
        if section == "DYNAMIC MILLING TOOL":
            # Extract αdi and SHANK from left side
            alpha_di = None
            shank = None
            if milling_cols:
                left_limit = min(milling_cols.values()) if milling_cols else 50
                angles = extract_angles(line, left_limit)
                alpha_di = angles[0] if angles else None
                shank_candidates = [n for n in NUM_RE.findall(line[:left_limit])
                                    if n in ("3", "4", "6")]
                shank = shank_candidates[0] if shank_candidates else None

            for sm in skus:
                mid = sku_column(line, sm)
                if milling_cols:
                    col_label = nearest_col(mid, milling_cols)
                    if "DIGITAL" in col_label:
                        ptype = "DIGITAL ANALOG"
                    elif "ANALOG" in col_label:
                        ptype = "ANALOG"
                    else:
                        ptype = "DYNAMIC MILLING TOOL"
                else:
                    ptype = "DYNAMIC MILLING TOOL"
                base = _make_base(code, ptype, brands, page)
                base["alpha_di"] = alpha_di
                base["type_label"] = shank  # reuse type_label for shank
                products.append({**base, "sku": sm.group(1)})
            continue

        # == SCANBODY OP: column-classified =============================
        if section == "SCANBODY OP":
            # HEIGHT and TYPE come from text on this line or recently seen context
            height_m = re.search(r"\b(6|9|13)\b", stripped)
            type_m = re.search(r"\b([A-E])\b", stripped)
            height = height_m.group(1) if height_m else None
            type_label = type_m.group(1) if type_m else None

            for sm in skus:
                mid = sku_column(line, sm)
                if scanbodyop_cols:
                    col_label = nearest_col(mid, scanbodyop_cols)
                    if "SCREWDRIVER" in col_label:
                        ptype = "SCREWDRIVER"
                    elif "PEEK PINS" in col_label:
                        ptype = "PEEK PINS"
                    else:
                        ptype = "SCANBODY OP"
                else:
                    ptype = "SCANBODY OP"
                base = _make_base(code, ptype, brands, page)
                base["height_mm"] = height
                base["type_label"] = type_label
                products.append({**base, "sku": sm.group(1)})
            continue

        # == Default: emit each SKU with current section ================
        base = _make_base(code, section, brands, page)
        for sm in skus:
            products.append({**base, "sku": sm.group(1)})

    return products

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate(products: list[dict], index: list[dict]) -> None:
    print("\n=== VALIDATION ===")

    type_counts: dict[str, int] = defaultdict(int)
    for p in products:
        type_counts[p.get("product_type", "UNKNOWN")] += 1
    print("\nProducts per type:")
    for t, n in sorted(type_counts.items()):
        print(f"  {n:5d}  {t}")

    codes = {p["code"] for p in products}
    print(f"\nUnique codes found: {len(codes)} (expected ~141-270)")

    sku_seen: dict[str, list] = defaultdict(list)
    for p in products:
        if p.get("sku"):
            sku_seen[p["sku"]].append(p["code"])
    # Duplicates within the same code come from variant codes (e.g. 0040B → 0040)
    # where the PDF lists the same products twice. These are deduplicated in write_csvs.
    same_code_dupes = {s: codes for s, codes in sku_seen.items()
                       if len(codes) != len(set(codes))}
    if same_code_dupes:
        print(f"\nSAME-CODE DUPLICATE SKUs ({len(same_code_dupes)}) — will be deduplicated in output:")
        for s, codes_list in sorted(same_code_dupes.items())[:5]:
            print(f"  {s}  codes={codes_list}")
    else:
        print("\nNo same-code duplicate SKUs ✓")

    cross_code = {s: sorted(set(c)) for s, c in sku_seen.items() if len(set(c)) > 1}
    print(f"SKUs shared across multiple codes (expected for shared tools): {len(cross_code)}")

    bad = [p for p in products if p.get("sku") and not re.fullmatch(
        r"\d{2}\.\d{3}\.\d{3}\.\d{2}-\d", p["sku"])]
    if bad:
        print(f"Invalid SKU format: {len(bad)}")
    else:
        print("All SKUs match pattern ✓")

    print("\n--- Samples (first 3 per type) ---")
    shown: dict[str, int] = defaultdict(int)
    for p in products:
        t = p.get("product_type", "UNKNOWN")
        if shown[t] < 3:
            print(f"  [{t}] {p.get('sku')}  code={p.get('code')}  "
                  f"eng={p.get('engaging')}  GH={p.get('GH_mm')}  "
                  f"αS={p.get('alpha_S')}  H={p.get('H_mm')}  "
                  f"brands={str(p.get('compatible_brands',''))[:35]}")
            shown[t] += 1

    print(f"\nIndex rows: {len(index)}")
    print(f"Total product rows: {len(products)}")

# ---------------------------------------------------------------------------
# CSV output
# ---------------------------------------------------------------------------

PRODUCT_FIELDS = [
    "sku", "engaging", "code", "product_type",
    "GH_mm", "CH_mm", "alpha_S", "alpha_C", "alpha_di",
    "H_mm", "length_mm", "height_mm", "type_label",
    "compatible_brands", "page_start",
]

INDEX_FIELDS = [
    "implant_brand", "implant_model", "implant_size",
    "platform", "code", "page",
]


def write_csvs(products: list[dict], index: list[dict], output_dir: str) -> None:
    os.makedirs(output_dir, exist_ok=True)

    # Deduplicate on (sku, code): variant codes like 0040B map to 0040, so the
    # same physical product may appear twice in the PDF — keep the first occurrence.
    seen_sku_code: set = set()
    deduped = []
    for p in products:
        key = (p.get("sku"), p.get("code"))
        if key not in seen_sku_code:
            seen_sku_code.add(key)
            deduped.append(p)
    n_dropped = len(products) - len(deduped)
    if n_dropped:
        print(f"Deduplicated {n_dropped} same-code duplicate rows (variant codes like 0040B → 0040)")

    p_path = os.path.join(output_dir, "products.csv")
    with open(p_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=PRODUCT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(deduped)
    print(f"Wrote {len(deduped)} rows → {p_path}")

    i_path = os.path.join(output_dir, "compat_index.csv")
    with open(i_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=INDEX_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(index)
    print(f"Wrote {len(index)} rows → {i_path}")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse DAS dental product catalog PDF → products.csv + compat_index.csv"
    )
    parser.add_argument("pdf", help="Path to the PDF catalog file")
    parser.add_argument("--output", default="output", help="Output directory (default: ./output)")
    parser.add_argument("--pages-index", default="9-42")
    parser.add_argument("--pages-products", default="43-329")
    args = parser.parse_args()

    if not os.path.exists(args.pdf):
        sys.exit(f"File not found: {args.pdf}")

    def parse_range(s):
        a, b = s.split("-")
        return int(a), int(b)

    idx_first, idx_last = parse_range(args.pages_index)
    prod_first, prod_last = parse_range(args.pages_products)

    print(f"Extracting index pages {idx_first}–{idx_last}…")
    index_text = extract_text(args.pdf, idx_first, idx_last)

    print(f"Extracting product pages {prod_first}–{prod_last}…")
    product_text = extract_text(args.pdf, prod_first, prod_last)

    print("Parsing compatibility index…")
    index = parse_compat_index(index_text)

    print("Parsing product pages…")
    products = parse_products(product_text, pdf_first_page=prod_first)

    validate(products, index)
    write_csvs(products, index, args.output)


if __name__ == "__main__":
    main()
