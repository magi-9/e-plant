from django.contrib import admin
from django.utils import timezone

from .models import CustomUser, EmailRateLimit, GlobalSettings


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "title",
        "first_name",
        "last_name",
        "is_active",
        "is_staff",
        "annual_discount_percent",
        "annual_discount_year",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff")
    search_fields = ("email", "title", "first_name", "last_name")

    def save_model(self, request, obj, form, change):
        if "annual_discount_percent" in form.changed_data:
            obj.annual_discount_year = timezone.localdate().year
        super().save_model(request, obj, form, change)


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        if GlobalSettings.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EmailRateLimit)
class EmailRateLimitAdmin(admin.ModelAdmin):
    list_display = ("key", "count", "last_sent", "blocked_until")
    readonly_fields = ("key", "count", "last_sent", "blocked_until")
    actions = ["clear_block"]

    @admin.action(description="Clear block / reset counter")
    def clear_block(self, request, queryset):
        queryset.update(count=0, blocked_until=None, last_sent=None)
