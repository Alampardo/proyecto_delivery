import uuid

from django.conf import settings
from django.db import models


class Business(models.Model):
    class Category(models.TextChoices):
        PHARMACY   = 'farmacia',    'Farmacia'
        RESTAURANT = 'restaurante', 'Restaurante'
        COURIER    = 'encomienda',  'Encomienda'

    name        = models.CharField(max_length=200, verbose_name='Nombre')
    category    = models.CharField(max_length=20, choices=Category.choices, verbose_name='Categoría')
    description = models.TextField(blank=True, verbose_name='Descripción')
    address     = models.CharField(max_length=300, blank=True, verbose_name='Dirección')
    phone       = models.CharField(max_length=20, blank=True, verbose_name='Teléfono principal')
    whatsapp    = models.CharField(max_length=20, blank=True, verbose_name='WhatsApp')
    logo        = models.ImageField(upload_to='businesses/logos/', blank=True, null=True)
    is_active   = models.BooleanField(default=True, verbose_name='Activo')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Negocio'
        verbose_name_plural = 'Negocios'
        ordering            = ['category', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'


class BusinessToken(models.Model):
    """Token único generado por el Admin para que un Dueño de Negocio pueda registrarse."""
    code       = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    business   = models.OneToOneField(
        Business,
        on_delete=models.CASCADE,
        related_name='registration_token',
        verbose_name='Negocio asociado',
        null=True, blank=True,
    )
    is_used    = models.BooleanField(default=False, verbose_name='Usado')
    used_by    = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='business_token',
        verbose_name='Usado por'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Token de Comercio'
        verbose_name_plural = 'Tokens de Comercio'
        ordering            = ['-created_at']

    def __str__(self):
        status = 'Usado' if self.is_used else 'Disponible'
        name = self.business.name if self.business else 'Sin asignar'
        return f'Token [{name}] — {status}'

    @property
    def short_code(self):
        return str(self.code).upper()


class BusinessOwnerProfile(models.Model):
    """Perfil que vincula a un usuario Dueño con su negocio."""
    user       = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owner_profile',
        verbose_name='Usuario'
    )
    business   = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='owners',
        verbose_name='Negocio'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Perfil Dueño de Negocio'
        verbose_name_plural = 'Perfiles Dueños de Negocio'

    def __str__(self):
        return f'{self.user.full_name} → {self.business.name}'


class BusinessSchedule(models.Model):
    class DayOfWeek(models.IntegerChoices):
        MONDAY    = 0, 'Lunes'
        TUESDAY   = 1, 'Martes'
        WEDNESDAY = 2, 'Miércoles'
        THURSDAY  = 3, 'Jueves'
        FRIDAY    = 4, 'Viernes'
        SATURDAY  = 5, 'Sábado'
        SUNDAY    = 6, 'Domingo'

    business   = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='schedules')
    day        = models.IntegerField(choices=DayOfWeek.choices, verbose_name='Día')
    open_time  = models.TimeField(verbose_name='Hora apertura')
    close_time = models.TimeField(verbose_name='Hora cierre')
    is_closed  = models.BooleanField(default=False, verbose_name='Cerrado este día')

    class Meta:
        verbose_name        = 'Horario'
        verbose_name_plural = 'Horarios'
        unique_together     = ('business', 'day')
        ordering            = ['day']

    def __str__(self):
        return f'{self.business.name} - {self.get_day_display()}'


class Product(models.Model):
    business     = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='products')
    name         = models.CharField(max_length=200, verbose_name='Nombre')
    description  = models.TextField(blank=True, verbose_name='Descripción')
    price        = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio')
    image        = models.ImageField(upload_to='products/', blank=True, null=True)
    stock        = models.PositiveIntegerField(default=0, verbose_name='Stock')
    is_available = models.BooleanField(default=True, verbose_name='Disponible')
    is_featured  = models.BooleanField(default=False, verbose_name='Oferta destacada')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Producto'
        verbose_name_plural = 'Productos'
        ordering            = ['business', 'name']

    def __str__(self):
        return f'{self.name} - {self.business.name} (Bs. {self.price})'
