from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import User


class UserPublicSerializer(serializers.ModelSerializer):
    """Datos básicos del usuario para respuestas de autenticación."""
    class Meta:
        model  = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'phone')
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Credenciales incorrectas.')
        if not user.is_active:
            raise serializers.ValidationError('Esta cuenta está desactivada.')
        attrs['user'] = user
        return attrs


class ClientRegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ('email', 'first_name', 'last_name', 'phone', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        return attrs

    def create(self, validated_data):
        validated_data['role'] = User.Role.CLIENT
        return User.objects.create_user(**validated_data)


class DeliveryRegisterSerializer(serializers.Serializer):
    """
    Registro del Delivery.
    Requiere el código UUID generado por el administrador.
    """
    # Datos personales
    email      = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name  = serializers.CharField(max_length=100)
    phone      = serializers.CharField(max_length=20)
    password   = serializers.CharField(write_only=True, min_length=8)
    password2  = serializers.CharField(write_only=True)

    # Código de registro del admin
    registration_code = serializers.UUIDField()

    # Perfil delivery (opcionales al registrar, se completan después)
    birth_date      = serializers.DateField()
    ci              = serializers.CharField(max_length=20)
    drivers_license = serializers.CharField(max_length=50)
    license_plate   = serializers.CharField(max_length=20)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Este email ya está registrado.')
        return value

    def validate_registration_code(self, value):
        from deliveries.models import RegistrationCode
        try:
            code = RegistrationCode.objects.get(code=value, is_used=False)
        except RegistrationCode.DoesNotExist:
            raise serializers.ValidationError('Código inválido o ya utilizado.')
        return code  # devuelve el objeto para usarlo en create()

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        from django.db import transaction
        from deliveries.models import DeliveryProfile

        code_obj = validated_data.pop('registration_code')

        with transaction.atomic():
            user = User.objects.create_user(
                email      = validated_data['email'],
                password   = validated_data['password'],
                first_name = validated_data['first_name'],
                last_name  = validated_data['last_name'],
                phone      = validated_data['phone'],
                role       = User.Role.DELIVERY,
            )
            DeliveryProfile.objects.create(
                user            = user,
                birth_date      = validated_data['birth_date'],
                ci              = validated_data['ci'],
                drivers_license = validated_data['drivers_license'],
                license_plate   = validated_data['license_plate'],
            )
            code_obj.is_used = True
            code_obj.used_by = user
            code_obj.used_at = timezone.now()
            code_obj.save(update_fields=['is_used', 'used_by', 'used_at'])

        return user


class OwnerRegisterSerializer(serializers.Serializer):
    """
    Registro del Dueño de Negocio.
    Requiere el token UUID generado por el administrador para un negocio específico.
    """
    email          = serializers.EmailField()
    first_name     = serializers.CharField(max_length=100)
    last_name      = serializers.CharField(max_length=100)
    phone          = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password       = serializers.CharField(write_only=True, min_length=8)
    password2      = serializers.CharField(write_only=True)
    business_token = serializers.UUIDField()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Este email ya está registrado.')
        return value

    def validate_business_token(self, value):
        from businesses.models import BusinessToken
        try:
            token = BusinessToken.objects.select_related('business').get(code=value, is_used=False)
        except BusinessToken.DoesNotExist:
            raise serializers.ValidationError('Token de comercio inválido o ya utilizado.')
        return token

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': 'Las contraseñas no coinciden.'})
        return attrs

    def create(self, validated_data):
        from django.utils import timezone
        from django.db import transaction
        from businesses.models import BusinessOwnerProfile

        token_obj = validated_data.pop('business_token')

        with transaction.atomic():
            user = User.objects.create_user(
                email      = validated_data['email'],
                password   = validated_data['password'],
                first_name = validated_data['first_name'],
                last_name  = validated_data['last_name'],
                phone      = validated_data.get('phone', ''),
                role       = User.Role.OWNER,
            )
            BusinessOwnerProfile.objects.create(
                user     = user,
                business = token_obj.business,
            )
            token_obj.is_used = True
            token_obj.used_by = user
            token_obj.used_at = timezone.now()
            token_obj.save(update_fields=['is_used', 'used_by', 'used_at'])

        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ('first_name', 'last_name', 'phone')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('La contraseña actual es incorrecta.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        # Regenera el token para invalidar sesiones anteriores
        Token.objects.filter(user=user).delete()
        return Token.objects.create(user=user)
