from rest_framework import serializers

from .models import Business, BusinessOwnerProfile, BusinessSchedule, BusinessToken, Product


class BusinessScheduleSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model  = BusinessSchedule
        fields = ('id', 'day', 'day_display', 'open_time', 'close_time', 'is_closed')


class ProductSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model  = Product
        fields = (
            'id', 'business', 'business_name',
            'name', 'description', 'price',
            'image', 'stock', 'is_available', 'is_featured',
            'created_at', 'updated_at',
        )
        read_only_fields = ('business', 'created_at', 'updated_at')

    def validate(self, attrs):
        # Precio no puede ser negativo
        if attrs.get('price', 0) < 0:
            raise serializers.ValidationError({'price': 'El precio no puede ser negativo.'})
        return attrs


class ProductAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer ligero solo para el toggle de disponibilidad."""
    class Meta:
        model  = Product
        fields = ('id', 'is_available')


class BusinessSerializer(serializers.ModelSerializer):
    schedules = BusinessScheduleSerializer(many=True, read_only=True)
    products  = ProductSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model  = Business
        fields = (
            'id', 'name', 'category', 'category_display',
            'description', 'address', 'phone', 'whatsapp',
            'logo', 'is_active', 'schedules', 'products',
            'created_at', 'updated_at',
        )


class BusinessListSerializer(serializers.ModelSerializer):
    """Versión ligera para listados (sin productos completos)."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model  = Business
        fields = ('id', 'name', 'category', 'category_display', 'address', 'phone', 'logo', 'is_active')


class BusinessTokenSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True, default=None)

    class Meta:
        model  = BusinessToken
        fields = ('id', 'code', 'business', 'business_name', 'is_used', 'created_at', 'used_at')
        read_only_fields = ('code', 'is_used', 'created_at', 'used_at')


class BusinessOwnerProfileSerializer(serializers.ModelSerializer):
    business = BusinessListSerializer(read_only=True)

    class Meta:
        model  = BusinessOwnerProfile
        fields = ('id', 'user', 'business', 'created_at')
        read_only_fields = ('user', 'created_at')


# ── Admin: escritura ─────────────────────────────────────────────────────────

class BusinessScheduleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BusinessSchedule
        fields = ('id', 'day', 'open_time', 'close_time', 'is_closed')


class BusinessWriteSerializer(serializers.ModelSerializer):
    """Para crear/editar negocios desde el panel Admin (soporta multipart para logo)."""
    schedules = BusinessScheduleWriteSerializer(many=True, required=False)

    class Meta:
        model  = Business
        fields = (
            'id', 'name', 'category', 'description',
            'address', 'phone', 'whatsapp', 'logo',
            'is_active', 'schedules',
        )

    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        business = Business.objects.create(**validated_data)
        for s in schedules_data:
            BusinessSchedule.objects.create(business=business, **s)
        return business

    def update(self, instance, validated_data):
        schedules_data = validated_data.pop('schedules', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if schedules_data is not None:
            instance.schedules.all().delete()
            for s in schedules_data:
                BusinessSchedule.objects.create(business=instance, **s)
        return instance
