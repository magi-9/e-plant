# Internal product prefix audit

Source snapshot: `data/csv/import_all_merged.csv`, `data/csv/compatibility_options.csv`, `data/csv/retail_prices.csv`.

Scope: only products with a real `compatibility_code` are included. Rows with `compatibility_code = 0000` are ignored for this audit.

Generated on: 2026-06-18.

## How to read prefixes

- First segment prefix means the first part of a reference, for example `31` in `31.312.210.01-2`.
- Family prefix means the first two segments, for example `31.312`.
- `ProductGroup.prefix` is not the same as product type. It is generated from `retail_prices.csv` wildcard rows up to the first wildcard segment, for example `54.315.xxx.21-2` creates `54.315`, while `31.xxx.xxx.01-2` creates `31`.
- Compatibility number means `compatibility_code` from `import_all_merged.csv`, excluding `0000`.
- Compatibility option rows are references present in `compatibility_options.csv`; this is useful for screw/options lookup, but it is not required for this prefix audit.

## Prefix summary

| Prefix | Working meaning | Products with compatibility num | Compatibility option rows | Distinct compatibility nums | Blank catalog/category | 5% VAT candidate | Audit status |
|---|---:|---:|---:|---:|---:|---|---|
| `11` | Accessory / torque wrench | 1 | 0 | 1 | 0 | No | OK |
| `21` | Dynamic abutment | 117 | 0 | 42 | 117 | No | OK for prefix audit; catalog section blank, but compatibility nums exist |
| `22` | Lab analog | 43 | 35 | 41 | 7 | No | OK |
| `23` | ScAnalog | 31 | 29 | 29 | 1 | No | OK |
| `30` | Extraoral/lab scanbody for TiBase | 8 | 8 | 8 | 0 | Maybe | OK |
| `31` | Dynamic TiBase / Dynamic 3TiBase | 724 | 638 | 153 | 80 | Yes | OK; blank section rows should not override prefix rule |
| `33` | Dynamic Milling Tool | 69 | 64 | 18 | 0 | No | OK |
| `34` | Digital analog | 109 | 91 | 107 | 17 | No | OK |
| `35` | Straight TiBase / Straight 3TiBase | 66 | 0 | 35 | 65 | Yes | Check: TiBase by retail/name and compatibility nums, but no compatibility options rows |
| `40` | Straight screw / healing cap | 104 | 60 | 11 | 43 | No | Check: mixed straight screw/healing cap naming |
| `41` | Dynamic screw | 131 | 86 | 58 | 43 | No | OK; blank section rows should not override prefix rule |
| `42` | Straight Multi-Unit | 168 | 148 | 51 | 20 | Yes | OK; blank section rows should not override prefix rule |
| `43` | Screwdriver / screwdriver adaptor | 20 | 14 | 12 | 4 | No | OK |
| `48` | Angulated Multi-Unit | 54 | 54 | 20 | 0 | Yes | OK |
| `50` | Scanbody adaptor | 121 | 104 | 98 | 16 | No | OK |
| `52` | Dynamic scanbody | 77 | 56 | 37 | 20 | No | OK; blank section rows should not override prefix rule |
| `53` | Scanbody / MU scanbody edge cases | 7 | 3 | 6 | 1 | Maybe | OK |
| `54` | Scanbody OP / reference scanbody | 65 | 58 | 61 | 8 | No | OK |
| `61` | DAS MU4.0 straight Multi-Unit | 53 | 1 | 14 | 52 | Yes | Check: MU by name/compatibility nums, catalog section mostly blank |
| `62` | Internal Multi-Unit | 21 | 21 | 10 | 0 | Yes | OK |

## Main validation notes

- The audit now ignores no-compatibility-number rows. In this snapshot that excludes `0000` rows, including the previously listed `49.*` accessory/tool bucket.
- `31.*` is confirmed as TiBase in scoped data: 724 product rows with compatibility nums, 638 compatibility option rows, mostly `STANDARD DYNAMIC TIBASE` or `DYNAMIC 3TIBASE`.
- `35.*` should probably be treated as TiBase for business logic and VAT: it has 66 rows with compatibility nums, but 0 compatibility option rows and 65 blank catalog/category rows.
- Multi-Unit is not one prefix only. Current data indicates `42.*`, `48.*`, `61.*`, and `62.*`; there are also small MU spillovers in other prefixes from import/category data.
- `61.*` is the biggest classification gap inside scoped data: names and compatibility nums look like DAS MU4.0 straight Multi-Unit, but 52 of 53 rows have blank catalog/category.
- Screw prefixes are split as `40.*` straight screw/healing-cap-ish rows and `41.*` dynamic screw rows. Both have many blank rows.
- `ProductGroup.prefix` should not be used as the single source of product type because import grouping can create broad wildcard groups such as `31`, `35`, `40`, `41`, `42`, `52`, etc.

## Family prefixes worth checking

| Family prefix | Rows | Current signal |
|---|---:|---|
| `31.312` | 139 | TiBase, mostly standard/dynamic 3TiBase |
| `31.313` | 129 | TiBase, mostly standard/dynamic 3TiBase |
| `31.322` | 141 | TiBase, mostly standard/dynamic 3TiBase |
| `31.323` | 135 | TiBase, mostly standard/dynamic 3TiBase |
| `35.312` | 10 | Straight TiBase, mostly blank catalog data |
| `35.313` | 10 | Straight TiBase, blank catalog data |
| `35.322` | 10 | Straight TiBase, blank catalog data |
| `35.323` | 10 | Straight TiBase, blank catalog data |
| `42.302` | 75 | Straight Multi-Unit |
| `42.303` | 76 | Straight Multi-Unit |
| `48.312` | 50 | Angulated Multi-Unit |
| `61.302` | 24 | MU4.0 straight Multi-Unit by name, blank section |
| `61.303` | 29 | MU4.0 straight Multi-Unit by name, mostly blank section |
| `62.303` | 11 | Internal Multi-Unit |

## Suggested rule draft

| Business bucket | Prefix rule draft | Confidence | Notes |
|---|---|---|---|
| TiBase | `31.*`, `35.*` | Medium-high | `31.*` is strong; `35.*` needs parser/category cleanup. |
| Multi-Unit | `42.*`, `48.*`, `61.*`, `62.*` | Medium | `42/48/62` are strong; `61.*` needs section cleanup. |
| Screws | `40.*`, `41.*` | Medium | Need separate straight/dynamic screw mapping and healing cap exceptions. |
| Scanbody | `30.*`, `52.*`, `53.*`, `54.*` | Medium | `53.*` is mixed and small. |
| Analogs / ScAnalog | `22.*`, `23.*`, `34.*` | High | Mostly consistent. |
| Accessories/tools | `11.*`, `33.*`, `43.*`, `50.*` | Medium | `49.*` is out of scope here because current rows are `0000`. |

## Next checks

1. Decide whether VAT 5% should be driven by scoped prefix bucket, catalog section, or explicit product flag.
2. Add parser/manual overrides for `35.*` and `61.*` if we want storefront/business logic to classify them reliably.
3. Investigate blank catalog/category rows only for scoped prefixes that affect business rules: `31`, `35`, `42`, `48`, `61`, `62`.
4. Keep exact compatibility CSV mappings as the source of screw/options compatibility; do not derive screw options from prefix alone.
