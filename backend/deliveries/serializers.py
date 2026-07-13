from django.utils import timezone
from rest_framework import serializers

from .models import DeliveryProfile, RegistrationCode


class DeliveryProfileSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name      = serializers.CharField(source='user.full_name', read_only=True)
    user_phone     = serializers.CharField(source='user.phone', read_only=True)
    user_email     = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model  = DeliveryProfile
        fields = (
            'id', 'user', 'user_name', 'user_phone', 'user_email',
            'birth_date', 'ci', 'drivers_license', 'license_plate',
            'has_ruat', 'bank_qr_image',
            'status', 'status_display', 'shift_started_at',
            'created_at', 'updated_at',
        )
        read_only_fields = ('user', 'status', 'shift_started_at', 'created_at', 'updated_at')


class DeliveryProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer para que el delivery actualice sus datos de perfil."""
    class Meta:
        model  = DeliveryProfile
        fields = ('birth_date', 'ci', 'drivers_license', 'license_plate', 'has_ruat', 'bank_qr_image')


class DeliveryStatusSerializer(serializers.ModelSerializer):
    """Solo para el toggle de turno/estado."""
    class Meta:
        model  = DeliveryProfile
        fields = ('status', 'shift_started_at')
        read_only_fields = ('shift_started_at',)


class DeliveryPanelSerializer(serializers.ModelSerializer):
    """Vista del Admin: todos los deliverys con sus datos de contacto."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    full_name      = serializers.CharField(source='user.full_name', read_only=True)
    phone          = serializers.CharField(source='user.phone', read_only=True)
    email          = serializers.CharField(source='user.email', read_only=True)
    whatsapp_url   = serializers.SerializerMethodField()

    class Meta:
        model  = DeliveryProfile
        fields = (
            'id', 'user_id', 'full_name', 'phone', 'email',
            'license_plate', 'has_ruat',
            'status', 'status_display', 'shift_started_at',
            'whatsapp_url',
        )

    def get_whatsapp_url(self, obj):
        phone = obj.user.phone.replace('+', '').replace(' ', '').replace('-', '')
        if phone:
            return f'https://wa.me/{phone}'
        return None


class RegistrationCodeSerializer(serializers.ModelSerializer):
    short_code = serializers.CharField(read_only=True)

    class Meta:
        model  = RegistrationCode
        fields = ('id', 'code', 'short_code', 'is_used', 'used_by', 'created_at', 'used_at')
        read_only_fields = ('code', 'short_code', 'is_used', 'used_by', 'created_at', 'used_at')
