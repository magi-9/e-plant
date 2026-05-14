"""Sync service: auto-generate WildcardGroup records from the normalisation logic.

Rules
-----
* Products in manually-managed groups (is_auto_generated=False) are excluded from
  auto-sync so that admin overrides are never overwritten.
* Auto-generated groups are matched to their calculated bucket via norm_key.
* Groups with < 2 members are dissolved after sync (products cleared, group deleted).
* A group's name and is_enabled state are preserved across re-syncs; only the
  product-assignment is updated for auto-generated groups.
"""

from django.db import transaction

from ..grouping import storefront_group_key, strip_gh_variant_from_name
from ..compatibility import get_compatibility_codes_for_ref
from ..models import Product, WildcardGroup


def _build_norm_key(product) -> str:
    """Return the pipe-delimited normalisation key stored on WildcardGroup.norm_key."""
    return "|".join(storefront_group_key(product))


def _compatibility_group_value(product) -> str:
    """Return the compatibility value used for automatic reference-variant grouping."""
    params = product.parameters or {}
    compat_code = str(params.get("compatibility_code") or "").strip()
    if compat_code:
        return compat_code
    return ",".join(get_compatibility_codes_for_ref(product.reference or ""))


def _one_digit_reference_masks(reference: str | None) -> list[str]:
    """Return masks made by replacing exactly one digit in the reference with x."""
    ref = (reference or "").strip()
    if not ref:
        return []
    return [
        f"{ref[:idx]}x{ref[idx + 1:]}" for idx, char in enumerate(ref) if char.isdigit()
    ]


def _reference_variant_keys(product) -> list[str]:
    """Return grouping keys for products whose references differ by one digit."""
    price = str(product.price) if product.price is not None else ""
    compat = _compatibility_group_value(product)
    if not price or not compat:
        return []
    return [
        f"ref_variant|{mask}|{price}|{compat}"
        for mask in _one_digit_reference_masks(product.reference)
    ]


def _build_group_buckets(products: list[Product]) -> dict[str, list[Product]]:
    """Build auto-group buckets, preferring reference masks over legacy name keys."""
    candidate_ref_buckets: dict[str, list[Product]] = {}
    for product in products:
        for key in _reference_variant_keys(product):
            candidate_ref_buckets.setdefault(key, []).append(product)

    buckets: dict[str, list[Product]] = {}
    assigned_ids: set[int] = set()
    for key, members in sorted(
        candidate_ref_buckets.items(),
        key=lambda item: (-len(item[1]), item[0]),
    ):
        available_members = [
            member for member in members if member.id not in assigned_ids
        ]
        if len(available_members) < 2:
            continue
        buckets[key] = available_members
        assigned_ids.update(member.id for member in available_members)

    for product in products:
        if product.id in assigned_ids:
            continue
        key = _build_norm_key(product)
        buckets.setdefault(key, []).append(product)

    return buckets


def sync_wildcard_groups() -> dict:
    """Rebuild auto-generated WildcardGroups.

    Returns a summary dict with keys created / updated / deleted.
    """
    # IDs of products protected by a manually-managed group
    manual_product_ids: set[int] = set(
        Product.objects.filter(
            wildcard_group__isnull=False,
            wildcard_group__is_auto_generated=False,
        ).values_list("id", flat=True)
    )

    # Eligible products: visible and not manually grouped
    eligible = list(
        Product.objects.filter(is_visible=True).exclude(id__in=manual_product_ids)
    )

    buckets = _build_group_buckets(eligible)

    # Existing auto-generated groups indexed by norm_key
    existing: dict[str, WildcardGroup] = {
        wg.norm_key: wg for wg in WildcardGroup.objects.filter(is_auto_generated=True)
    }

    created = updated = deleted = 0

    with transaction.atomic():
        processed_keys: set[str] = set()

        for norm_key, members in buckets.items():
            member_ids = {m.id for m in members}

            if len(members) < 2:
                # Single product – dissolve any existing auto group for this key
                if norm_key in existing:
                    wg = existing[norm_key]
                    Product.objects.filter(wildcard_group=wg).update(
                        wildcard_group=None
                    )
                    wg.delete()
                    deleted += 1
                else:
                    # Clear stray assignment for this product if any
                    Product.objects.filter(
                        id__in=member_ids, wildcard_group__is_auto_generated=True
                    ).update(wildcard_group=None)
                # Mark as processed so stale-keys loop doesn't try to delete it again
                processed_keys.add(norm_key)
                continue

            if norm_key in existing:
                wg = existing[norm_key]
                current_ids = set(wg.products.values_list("id", flat=True))

                # Heal name if it still contains a GH variant segment
                clean_name = strip_gh_variant_from_name(members[0].name)
                if wg.name != clean_name:
                    wg.name = clean_name
                    wg.save(update_fields=["name"])

                # Remove products that drifted out of this bucket
                removed = current_ids - member_ids
                if removed:
                    Product.objects.filter(id__in=removed, wildcard_group=wg).update(
                        wildcard_group=None
                    )

                # Add new members
                new_members = member_ids - current_ids
                if new_members:
                    Product.objects.filter(id__in=new_members).update(wildcard_group=wg)

                updated += 1
            else:
                group_name = strip_gh_variant_from_name(members[0].name)
                wg = WildcardGroup.objects.create(
                    name=group_name,
                    norm_key=norm_key,
                    is_auto_generated=True,
                )
                Product.objects.filter(id__in=member_ids).update(wildcard_group=wg)
                created += 1

            processed_keys.add(norm_key)

        # Delete auto groups whose norm_key is no longer active
        stale_keys = set(existing.keys()) - processed_keys
        for norm_key in stale_keys:
            wg = existing[norm_key]
            Product.objects.filter(wildcard_group=wg).update(wildcard_group=None)
            wg.delete()
            deleted += 1

    return {"created": created, "updated": updated, "deleted": deleted}
