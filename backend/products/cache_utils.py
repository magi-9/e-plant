from django.core.cache import cache

PRODUCT_STATS_CACHE_KEYS = (
    "category_counts",
    "compatibility_counts",
    "product_type_counts",
)


def invalidate_product_stats_cache() -> None:
    """Invalidate cached storefront stats derived from products."""
    cache.delete_many(PRODUCT_STATS_CACHE_KEYS)
