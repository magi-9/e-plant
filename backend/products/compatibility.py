import csv
import os
from functools import lru_cache

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


def get_compatibility_options():
    """Return sorted list of unique {section, compatibility_code} dicts (for UI)."""
    if not os.path.exists(_CSV_PATH):
        return []
    options = []
    seen = set()
    with open(_CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            section = row.get("section", "").strip()
            code = row.get("compatibility_code", "").strip()
            if section and code and (section, code) not in seen:
                seen.add((section, code))
                options.append({"section": section, "compatibility_code": code})
    return sorted(options, key=lambda o: (o["section"], o["compatibility_code"]))


def get_ref_prefixes_for_code(code):
    """Return frozenset of 3-segment family prefixes for all refs with this code."""
    return _load().get(code, frozenset())
