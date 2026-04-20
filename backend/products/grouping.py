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
