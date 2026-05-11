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
try:
    SPEC.loader.exec_module(convert_to_csv)
except ImportError as exc:
    pytest.skip(
        f"convert_to_csv.py dependencies not installed: {exc}",
        allow_module_level=True,
    )


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
    tokens = convert_to_csv.extract_option_tokens(line, section="SCANBODY OP")

    assert tokens == "αS:25º|Typ:A|H(mm):6"


def test_extract_option_tokens_tibase_line():
    line = "43º 29º 0,3      31.312.001.21-2    31.312.001.22-1"
    tokens = convert_to_csv.extract_option_tokens(
        line, section="STANDARD DYNAMIC TIBASE"
    )

    assert tokens == "αS:43º|αC:29º|GH(mm):0.3"


def test_extract_option_tokens_3tibase_line():
    line = "0,3   25º   20º   10º   31.322.001.21-2   31.312.001.21-2"
    tokens = convert_to_csv.extract_option_tokens(
        line, section="DYNAMIC 3TIBASE", ch_vals=["5", "7", "9"]
    )

    assert tokens == "αS(CH=5mm):25º|αS(CH=7mm):20º|αS(CH=9mm):10º|GH(mm):0.3"


def test_extract_option_tokens_no_section_defaults_to_gh():
    line = "25º 2 31.312.001.21-2"
    tokens = convert_to_csv.extract_option_tokens(line)

    assert tokens == "αS:25º|GH(mm):2"


def test_parse_pdf_compatibility_rows_extracts_code_and_family():
    pdf_text = """
    COMPATIBLE WITH 0002
    SCANBODY OP
    54.315.002.21-2 43.601.103.02-2
    49.414.000.03-2 6 A
    """

    rows = convert_to_csv.parse_pdf_compatibility_rows(pdf_text)

    assert len(rows) == 3
    assert rows[0]["compatibility_code"] == "0002"
    assert rows[0]["section"] == "SCANBODY OP"
    assert rows[0]["reference_family"] == "002"
    assert rows[2]["reference_family"] == "000"


def test_build_option_map_by_reference():
    parsed_rows = [
        {"reference": "54.315.002.21-2", "options": "αS:43º|GH(mm):0.3"},
        {
            "reference": "54.315.002.21-2",
            "options": "αS:43º|GH(mm):0.3",
        },  # duplicate — keep first
        {"reference": "43.601.103.02-2", "options": "αS:25º|GH(mm):2"},
        {"reference": "54.315.003.21-1", "options": "Typ:A|H(mm):6"},
    ]

    option_map = convert_to_csv.build_option_map(parsed_rows)

    assert option_map["54.315.002.21-2"] == "αS:43º|GH(mm):0.3"
    assert option_map["43.601.103.02-2"] == "αS:25º|GH(mm):2"
    assert option_map["54.315.003.21-1"] == "Typ:A|H(mm):6"
