import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_email_verified', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN    = 'admin',    'Administrador'
        DELIVERY = 'delivery', 'Delivery'
        CLIENT   = 'client',   'Cliente'
        OWNER    = 'owner',    'Dueño de Negocio'

    email             = models.EmailField(unique=True)
    first_name        = models.CharField(max_length=100)
    last_name         = models.CharField(max_length=100)
    role              = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)
    phone             = models.CharField(max_length=20, blank=True)
    is_active         = models.BooleanField(default=True)
    is_staff          = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False, verbose_name='Email verificado')
    created_at        = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name        = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering            = ['-created_at']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.role})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_delivery(self):
        return self.role == self.Role.DELIVERY

    @property
    def is_owner(self):
        return self.role == self.Role.OWNER


class PushSubscription(models.Model):
    """Suscripción Web Push almacenada por usuario y dispositivo."""
    user              = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='push_subscriptions'
    )
    endpoint          = models.TextField(unique=True)
    p256dh            = models.TextField()
    auth              = models.TextField()
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Suscripción Push'
        verbose_name_plural = 'Suscripciones Push'

    def __str__(self):
        return f'Push [{self.user.email}] {self.endpoint[:50]}...'

    @property
    def subscription_info(self):
        return {
            'endpoint': self.endpoint,
            'keys': {'p256dh': self.p256dh, 'auth': self.auth},
        }


class EmailVerificationToken(models.Model):
    user       = models.OneToOneField(
        'User', on_delete=models.CASCADE, related_name='email_verification'
    )
    token      = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Token de verificación de email'
        verbose_name_plural = 'Tokens de verificación de email'

    @property
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at


class PasswordResetToken(models.Model):
    user       = models.ForeignKey(
        'User', on_delete=models.CASCADE, related_name='password_reset_tokens'
    )
    token      = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Token de restablecimiento de contraseña'
        verbose_name_plural = 'Tokens de restablecimiento de contraseña'
        ordering            = ['-created_at']

    @property
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
