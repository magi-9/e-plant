import csv
import os
from functools import lru_cache

from django.core.cache import cache

_CSV_PATH = os.path.join(
    os.path.dirname(__file__), "../../data/csv/compatibility_options.csv"
)


def _ref_family(ref):
    parts = ref.split(".")
    return ".".join(parts[:3]) if len(parts) >= 3 else ref


@lru_cache(maxsize=1)
def _load():
    """Return {code: frozenset(family_prefixes)} mapping (used for filtering by code)."""
    if not os.path.exists(_CSV_PATH):
        return {}
    raw = {}
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row.get("compatibility_code", "").strip()
            ref = row.get("reference", "").strip()
            if code and ref:
                raw.setdefault(code, set()).add(_ref_family(ref))
    return {k: frozenset(v) for k, v in raw.items()}


@lru_cache(maxsize=1)
def _load_ref_to_codes():
    """Return {ref: frozenset(codes)} for exact per-product compatibility lookup."""
    if not os.path.exists(_CSV_PATH):
        return {}
    raw = {}
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row.get("compatibility_code", "").strip()
            ref = row.get("reference", "").strip()
            if code and ref:
                raw.setdefault(ref, set()).add(code)
    return {k: frozenset(v) for k, v in raw.items()}


@lru_cache(maxsize=1)
def _load_family_to_codes():
    """Return {family_prefix: frozenset(codes)} for variant-family lookup."""
    raw = {}
    for code, families in _load().items():
        for family in families:
            raw.setdefault(family, set()).add(code)
    return {k: frozenset(v) for k, v in raw.items()}


@lru_cache(maxsize=1)
def get_compatibility_options():
    """Return sorted list of distinct compatibility codes with a representative section."""
    if not os.path.exists(_CSV_PATH):
        return []
    by_code = {}
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            section = row.get("section", "").strip()
            code = row.get("compatibility_code", "").strip()
            if section and code and code not in by_code:
                # Keep first section encountered for a code as representative metadata.
                by_code[code] = {"section": section, "compatibility_code": code}
    return sorted(by_code.values(), key=lambda o: o["compatibility_code"])


def get_ref_prefixes_for_code(code):
    """Return frozenset of 3-segment family prefixes for all refs with this code."""
    return _load().get(code, frozenset())


def get_compatibility_codes_for_ref(ref):
    """Return sorted compatibility codes for a product reference.

    Prefer exact rows from compatibility_options.csv; fall back to the
    3-segment reference family so sibling variants share the same code.
    """
    if not ref:
        return []
    exact_codes = _load_ref_to_codes().get(ref, frozenset())
    if exact_codes:
        return sorted(exact_codes)
    return sorted(_load_family_to_codes().get(_ref_family(ref), frozenset()))


TIBASE_CATEGORY = "TITANIUM BASE (screw included)"


@lru_cache(maxsize=1)
def _load_screws_by_code():
    """Return {compatibility_code: {"straight": [...], "dynamic": [...]}} from CSV.

    Cached for the process lifetime like the other _load* helpers.
    """
    if not os.path.exists(_CSV_PATH):
        return {}
    result = {}
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = row.get("compatibility_code", "").strip()
            section = row.get("section", "").strip().upper()
            ref = row.get("reference", "").strip()
            if not (code and ref):
                continue
            entry = result.setdefault(code, {"straight": [], "dynamic": []})
            if ref.startswith("40.") and ("STRAIGHT" in section or "SCREW" in section):
                if ref not in entry["straight"]:
                    entry["straight"].append(ref)
            elif ref.startswith("41.") and ("DYNAMIC" in section or "SCREW" in section):
                if ref not in entry["dynamic"]:
                    entry["dynamic"].append(ref)
    return result


def get_compatible_screws_for_tibase(reference):
    """Return compatible screw references for a TiBase product reference.

    Extracts the 4-digit compatibility code from segment 3 of the reference
    (e.g. '31.3XX.CCCC.VV-2' → code = segment[2].zfill(4)), then returns
    matching STRAIGHT (40.xxx) and DYNAMIC (41.xxx) screw refs from the CSV.

    Returns a dict:
        {'compatibility_code': '0001', 'straight': [ref, ...], 'dynamic': [ref, ...]}
    """
    parts = reference.split(".")
    if len(parts) < 3:
        return {"compatibility_code": "", "straight": [], "dynamic": []}

    code = parts[2].zfill(4)
    entry = _load_screws_by_code().get(code, {"straight": [], "dynamic": []})
    return {
        "compatibility_code": code,
        "straight": entry["straight"],
        "dynamic": entry["dynamic"],
    }


def get_compatibility_counts():
    """Return {compatibility_code: product_count} dict. Cached with TTL."""
    cache_key = "compatibility_counts"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from django.db import connection  # noqa: F401 – ensure DB is ready
    from products.models import Product

    refs = list(
        Product.objects.filter(is_visible=True).values_list("reference", flat=True)
    )
    # Build family -> product count map (only refs with 4+ segments can match)
    family_count: dict[str, int] = {}
    for ref in refs:
        if not ref:
            continue
        parts = ref.split(".")
        if len(parts) >= 4:
            fam = ".".join(parts[:3])
            family_count[fam] = family_count.get(fam, 0) + 1

    data = _load()
    result = {
        code: sum(family_count.get(p, 0) for p in prefixes)
        for code, prefixes in data.items()
    }
    # Cache for 1 hour (3600 seconds)
    cache.set(cache_key, result, 3600)
    return result
