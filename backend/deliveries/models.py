import uuid
from django.conf import settings
from django.db import models


class RegistrationCode(models.Model):
    """Códigos únicos que el Admin genera para que un Delivery pueda registrarse."""
    code       = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used    = models.BooleanField(default=False, verbose_name='Usado')
    used_by    = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='registration_code'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Código de registro'
        verbose_name_plural = 'Códigos de registro'
        ordering = ['-created_at']

    def __str__(self):
        status = 'Usado' if self.is_used else 'Disponible'
        return f'{str(self.code)[:8]}... ({status})'

    @property
    def short_code(self):
        return str(self.code).upper()


class DeliveryProfile(models.Model):
    """Perfil extendido exclusivo para usuarios con rol Delivery."""
    class Status(models.TextChoices):
        AVAILABLE    = 'disponible',       'Disponible'
        BUSY         = 'ocupado',          'Ocupado'
        OUT_OF_SERVICE = 'fuera_servicio', 'Fuera de servicio'

    user             = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='delivery_profile'
    )
    birth_date       = models.DateField(verbose_name='Fecha de nacimiento')
    ci               = models.CharField(max_length=20, unique=True, verbose_name='Carnet de Identidad')
    drivers_license  = models.CharField(max_length=50, verbose_name='Permiso de conducir')
    license_plate    = models.CharField(max_length=20, verbose_name='Placa de moto')
    has_ruat         = models.BooleanField(default=False, verbose_name='Tiene RUAT')
    bank_qr_image    = models.ImageField(
        upload_to='deliveries/qr/',
        blank=True, null=True,
        verbose_name='QR Bancario'
    )
    status           = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OUT_OF_SERVICE,
        verbose_name='Estado actual'
    )
    shift_started_at = models.DateTimeField(null=True, blank=True, verbose_name='Turno iniciado')
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Perfil Delivery'
        verbose_name_plural = 'Perfiles Delivery'

    def __str__(self):
        return f'Delivery: {self.user.full_name} [{self.get_status_display()}]'
