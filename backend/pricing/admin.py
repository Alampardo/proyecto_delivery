from django.contrib import admin

from .models import PricingConfig, ShippingRing


@admin.register(ShippingRing)
class ShippingRingAdmin(admin.ModelAdmin):
    list_display  = ('number', 'price')
    list_editable = ('price',)


@admin.register(PricingConfig)
class PricingConfigAdmin(admin.ModelAdmin):
    list_display = (
        'is_rainy_day', 'is_holiday',
        'rain_surcharge', 'holiday_surcharge', 'night_surcharge',
        'night_start', 'night_end', 'admin_commission_pct',
    )

    def has_add_permission(self, request):
        return not PricingConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
