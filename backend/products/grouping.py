import re


def normalized_storefront_name(name: str) -> str:
    """Normalize product name for storefront grouping.

    Removes common variant markers (e.g. G1, G1.5, G2) so nearby variants
    can collapse into one card.
    """
    raw = (name or "").strip()
    without_variant = re.sub(r"\bG\d+(?:[\.,]\d+)?\b", "", raw, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", without_variant).strip().casefold()


def storefront_group_key(product):
    return (
        normalized_storefront_name(product.name or ""),
        str(product.price) if product.price is not None else "",
        (product.category or "").strip().casefold(),
    )


def masked_variant_reference(references) -> str | None:
    """Return a mask where differing numeric positions are replaced by 'x'.

    Returns None when references are empty, have different lengths, or differ in
    non-numeric positions.
    """
    cleaned = [str(reference).strip() for reference in (references or []) if reference]
    if len(cleaned) < 2:
        return None

    base_length = len(cleaned[0])
    if any(len(reference) != base_length for reference in cleaned):
        return None

    masked_chars = []
    has_masked_position = False

    for idx in range(base_length):
        chars = {reference[idx] for reference in cleaned}
        if len(chars) == 1:
            masked_chars.append(cleaned[0][idx])
            continue

        if all(char.isdigit() for char in chars):
            masked_chars.append("x")
            has_masked_position = True
            continue

        return None

    if not has_masked_position:
        return None

    return "".join(masked_chars)
