from django.contrib import admin

from accounts.models import OTPVerification, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["wallet_address", "username", "has_identifier", "created_at"]
    search_fields = ["wallet_address", "username", "email", "phone"]


@admin.register(OTPVerification)
class OTPAdmin(admin.ModelAdmin):
    list_display = ["wallet_address", "identifier_type", "identifier", "is_used", "expires_at"]
    list_filter = ["identifier_type", "is_used"]
