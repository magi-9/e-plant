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


def test_build_option_map_merges_repeated_reference_values_and_relations():
    parsed_rows = [
        {"reference": "43.621.410.01-2", "options": "H(mm):8"},
        {"reference": "43.621.410.01-2", "options": "H(mm):10/12"},
        {
            "reference": "40.320.007.01-2",
            "options": "TYPE:TORX T6|SCREWDRIVER:43.601.107.01-2",
        },
        {
            "reference": "40.320.007.01-2",
            "options": "TYPE:TORX T6|SCREWDRIVER:43.601.107.01-2",
        },
    ]

    option_map = convert_to_csv.build_option_map(parsed_rows)

    assert option_map["43.621.410.01-2"] == "H(mm):8/10/12"
    assert option_map["40.320.007.01-2"] == "TYPE:TORX T6|SCREWDRIVER:43.601.107.01-2"


def test_row_to_option_tokens_uses_specific_labels_for_reported_parameters():
    screw_tokens = convert_to_csv._row_to_option_tokens(
        {
            "product_type": "STRAIGHT SCREW",
            "type_label": "TORX T6",
            "screwdriver_refs": "43.601.107.01-2",
        }
    )
    screwdriver_tokens = convert_to_csv._row_to_option_tokens(
        {
            "product_type": "SCREWDRIVER",
            "straight_screw_refs": "40.320.007.01-2",
        }
    )
    dynamic_tokens = convert_to_csv._row_to_option_tokens(
        {"product_type": "DYNAMIC SCREW", "length_mm": "18"}
    )
    milling_tokens = convert_to_csv._row_to_option_tokens(
        {
            "product_type": "ANALOG",
            "alpha_di": "35°",
            "type_label": "4",
        }
    )

    assert screw_tokens == "TYPE:TORX T6|SCREWDRIVER:43.601.107.01-2"
    assert screwdriver_tokens == "STRAIGHT SCREW:40.320.007.01-2"
    assert dynamic_tokens == "LENGTH:18|DYNAMIC SCREW:18"
    assert milling_tokens == "αdi:35°|SHANK:4"


def test_product_name_option_tokens_fill_milling_dimensions():
    tokens = convert_to_csv._product_name_option_tokens(
        "DMT Ø2.0mm, Seat 35º, Cutting L 7.5mm, Shank 4mm",
        reference="33.435.758.01-2",
    )

    assert tokens == "αdi:30°|SHANK:4"


def test_product_name_option_tokens_correct_known_dmt_angle():
    tokens = convert_to_csv._product_name_option_tokens(
        "DMT Ø1.6mm, Seat 20º, Cutting L 7.0mm, Shank 3mm",
        reference="33.320.704.01-2",
    )

    assert tokens == "αdi:25°|SHANK:3"


def test_product_name_option_tokens_extract_multi_unit_gh_and_type():
    tokens = convert_to_csv._product_name_option_tokens(
        "DAS Multi-Unit 20º, G1.5/2.9, Comp.0021 20N·cm",
        reference="48.312.021.01-2",
    )

    assert tokens == "GH(mm):1.5/2.9|TYPE:ANGULATED MULTI-UNIT 20º"


def test_product_name_option_tokens_correct_all_known_dmt_angle_variants():
    for reference in ("33.320.704.01-2", "33.420.704.01-2", "33.620.704.01-2"):
        tokens = convert_to_csv._product_name_option_tokens(
            "DMT Ø2.0mm, Seat 20º, Cutting L 7.0mm, Shank 4mm",
            reference=reference,
        )

        assert "αdi:25°" in tokens


def test_manual_product_overrides_replace_bad_pdf_tokens():
    row_tokens = ["H(mm):8/10/12", "LENGTH:18", "DYNAMIC SCREW:18"]

    tokens, catalog_section = convert_to_csv._apply_product_manual_override(
        "43.618.201.01-2",
        row_tokens,
        "DYNAMIC SCREW",
    )

    assert tokens == ["LENGTH:18", "DYNAMIC SCREW:41.316.080.01-2"]
    assert catalog_section == "SCREWDRIVER"


def test_product_name_gh_tokens_replace_merged_pdf_gh_values():
    row_tokens = ["GH(mm):1.5/3.5", "TYPE:ANGULATED MULTI-UNIT 28º"]

    convert_to_csv._merge_product_name_option_tokens(
        row_tokens,
        "GH(mm):3.5/5.4|TYPE:ANGULATED MULTI-UNIT 28º",
    )

    assert row_tokens == ["TYPE:ANGULATED MULTI-UNIT 28º", "GH(mm):3.5/5.4"]


def test_manual_product_overrides_set_dynamic_screw_tool_family():
    row_tokens = [
        "LENGTH:24",
        "DYNAMIC SCREW:41.320.117.01-2",
        "SCREWDRIVER:43.624.201.01-2",
    ]

    tokens, catalog_section = convert_to_csv._apply_product_manual_override(
        "41.320.117.01-2",
        row_tokens,
        "DYNAMIC SCREW",
    )

    assert tokens == [
        "DYNAMIC SCREW:41.320.075.01-2",
        "LENGTH:18/24/32",
        "SCREWDRIVER:43.618.201.01-2/43.624.201.01-2/43.632.201.01-2",
    ]
    assert catalog_section == "DYNAMIC SCREW"


def test_manual_product_overrides_remove_scanalog_gh_values():
    for reference in ("23.313.025.01-2", "23.413.025.01-2"):
        tokens, _catalog_section = convert_to_csv._apply_product_manual_override(
            reference,
            ["TYPE:ADAPTOR", "H(mm):8/10"],
            "ADAPTOR",
        )

        assert tokens == ["TYPE:ADAPTOR"]


def test_row_to_option_tokens_links_dynamic_screws_to_screwdrivers():
    tokens = convert_to_csv._row_to_option_tokens(
        {
            "sku": "41.320.117.01-2",
            "product_type": "DYNAMIC SCREW",
            "length_mm": "24",
            "screwdriver_refs": "43.624.201.01-2",
        }
    )

    assert "LENGTH:24" in tokens
    assert "DYNAMIC SCREW:41.320.117.01-2" in tokens
    assert "SCREWDRIVER:43.624.201.01-2" in tokens


def test_row_to_option_tokens_labels_product_type_and_related_tools():
    adaptor_tokens = convert_to_csv._row_to_option_tokens(
        {"product_type": "ADAPTOR", "H_mm": "8/10/12"}
    )
    scanbody_tokens = convert_to_csv._row_to_option_tokens(
        {
            "product_type": "DYNAMIC SCANBODY",
            "H_mm": "10",
            "adaptor_refs": "50.311.119.03-2",
            "screwdriver_adaptor_refs": "43.621.410.01-2",
        }
    )
    dynamic_screw_tokens = convert_to_csv._row_to_option_tokens(
        {"product_type": "DYNAMIC SCREW", "length_mm": "18"}
    )

    assert "TYPE:ADAPTOR" in adaptor_tokens
    assert "ADAPTOR:50.311.119.03-2" in scanbody_tokens
    assert "SCREWDRIVER ADAPTOR:43.621.410.01-2" in scanbody_tokens
    assert "DYNAMIC SCREW:18" in dynamic_screw_tokens
