from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'stock_quantity', 'low_stock_threshold', 'low_stock_alert_sent')
    list_filter = ('category', 'low_stock_alert_sent')
    search_fields = ('name', 'description')
    ordering = ('name',)
