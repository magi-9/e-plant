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
    """Return {code: frozenset(family_prefixes)} mapping, ignoring section."""
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
    """Return sorted list of compatibility codes that apply to a product reference."""
    if not ref:
        return []
    parts = ref.split(".")
    if len(parts) < 4:
        return []
    family = ".".join(parts[:3])
    data = _load()
    return sorted(code for code, prefixes in data.items() if family in prefixes)


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
