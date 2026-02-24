from django.contrib import admin
from .models import CustomUser, GlobalSettings, EmailRateLimit


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff")
    search_fields = ("username", "email")


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    pass


@admin.register(EmailRateLimit)
class EmailRateLimitAdmin(admin.ModelAdmin):
    list_display = ("key", "count", "last_sent", "blocked_until")
    readonly_fields = ("key", "count", "last_sent", "blocked_until")
    actions = ["clear_block"]

    @admin.action(description="Clear block / reset counter")
    def clear_block(self, request, queryset):
        queryset.update(count=0, blocked_until=None, last_sent=None)
