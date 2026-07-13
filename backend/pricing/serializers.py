from django.utils import timezone
from rest_framework import serializers

from .models import PricingConfig, ShippingRing


class ShippingRingSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ShippingRing
        fields = ('id', 'number', 'price')


class PublicPricingSerializer(serializers.ModelSerializer):
    """Config expuesta al cliente en el checkout. NO incluye admin_commission_pct."""
    rings        = serializers.SerializerMethodField()
    is_night_now = serializers.SerializerMethodField()

    class Meta:
        model  = PricingConfig
        fields = (
            'rings',
            'is_rainy_day', 'is_holiday',
            'rain_surcharge', 'holiday_surcharge', 'night_surcharge',
            'is_night_now',
            'admin_qr_image',
        )

    def get_rings(self, obj):
        return ShippingRingSerializer(ShippingRing.objects.all(), many=True).data

    def get_is_night_now(self, obj):
        return obj.is_night(timezone.localtime().time())


class AdminPricingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PricingConfig
        fields = (
            'is_rainy_day', 'is_holiday',
            'rain_surcharge', 'holiday_surcharge', 'night_surcharge',
            'night_start', 'night_end',
            'admin_qr_image', 'admin_commission_pct',
            'updated_at',
        )
        read_only_fields = ('updated_at',)
