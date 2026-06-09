from django.contrib import admin
from .models import DeliveryProfile, RegistrationCode


@admin.register(RegistrationCode)
class RegistrationCodeAdmin(admin.ModelAdmin):
    list_display  = ('short_code', 'is_used', 'used_by', 'created_at', 'used_at')
    list_filter   = ('is_used',)
    readonly_fields = ('code', 'created_at', 'used_at', 'used_by')

    def short_code(self, obj):
        return str(obj.code).upper()
    short_code.short_description = 'Código'


@admin.register(DeliveryProfile)
class DeliveryProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'ci', 'license_plate', 'status', 'has_ruat', 'updated_at')
    list_filter   = ('status', 'has_ruat')
    search_fields = ('user__first_name', 'user__last_name', 'ci', 'license_plate')
    readonly_fields = ('created_at', 'updated_at', 'shift_started_at')
