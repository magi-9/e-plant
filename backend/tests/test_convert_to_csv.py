import importlib.util
from pathlib import Path

import pytest


def resolve_converter_path():
    current = Path(__file__).resolve()
    candidates = []
    for parent in current.parents:
        candidates.append(parent / "data" / "convert_to_csv.py")
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


module_path = resolve_converter_path()
if module_path is None:
    pytest.skip(
        "convert_to_csv.py is not available in this runtime", allow_module_level=True
    )

SPEC = importlib.util.spec_from_file_location("convert_to_csv", module_path)
convert_to_csv = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(convert_to_csv)


def test_parse_reference_parts_splits_numeric_reference():
    parts = convert_to_csv.parse_reference_parts("54.315.002.21-2")

    assert parts == {
        "segment_1": "54",
        "segment_2": "315",
        "segment_3": "002",
        "segment_4": "21",
        "check_digit": "2",
    }


def test_extract_option_tokens_from_mixed_option_line():
    line = "49.414.000.03-2 6 A 25º"
    tokens = convert_to_csv.extract_option_tokens(line)

    assert tokens == "A|25º|6"


def test_parse_pdf_compatibility_rows_extracts_code_and_family():
    pdf_text = """
    COMPATIBLE WITH 0002
    SCANBODY OP
    54.315.002.21-2 43.601.103.02-2
    49.414.000.03-2 6 A
    """

    rows = convert_to_csv.parse_pdf_compatibility_rows(pdf_text)

    assert len(rows) == 4
    assert rows[0]["compatibility_code"] == "0002"
    assert rows[0]["section"] == "SCANBODY OP"
    assert rows[0]["reference_family"] == "002"
    assert rows[2]["reference_family"] == "000"


def test_build_option_map_aggregates_by_family_without_duplicates():
    parsed_rows = [
        {"reference_family": "002", "options": "A|6"},
        {"reference_family": "002", "options": "A|6"},
        {"reference_family": "002", "options": "B|9"},
        {"reference_family": "003", "options": "C|13"},
    ]

    option_map = convert_to_csv.build_option_map(parsed_rows)

    assert option_map["002"] == "A|6;B|9"
    assert option_map["003"] == "C|13"
