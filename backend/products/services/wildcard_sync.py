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

from ..models import Product, WildcardGroup


def _build_norm_key(product) -> str:
    """Return the pipe-delimited normalisation key stored on WildcardGroup.norm_key."""
    from ..views import _storefront_group_key

    return "|".join(_storefront_group_key(product))


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

    # Group by norm_key
    buckets: dict[str, list[Product]] = {}
    for p in eligible:
        key = _build_norm_key(p)
        buckets.setdefault(key, []).append(p)

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
                # Representative name: use the actual name of the first member
                group_name = members[0].name
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
