from django.contrib import admin

from .models import CustomUser, EmailRateLimit, GlobalSettings


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff")
    search_fields = ("email",)


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
