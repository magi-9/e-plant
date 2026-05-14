from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .cache_utils import invalidate_product_stats_cache
from .models import Product


@receiver(post_save, sender=Product)
def invalidate_product_stats_cache_on_save(sender, **kwargs):
    invalidate_product_stats_cache()


@receiver(post_delete, sender=Product)
def invalidate_product_stats_cache_on_delete(sender, **kwargs):
    invalidate_product_stats_cache()
