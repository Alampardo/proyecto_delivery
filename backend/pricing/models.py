from datetime import time

from django.db import models


class ShippingRing(models.Model):
    """Zona de distancia de entrega ('anillo'). Precio fijo por anillo, editable por el admin."""
    number = models.PositiveSmallIntegerField(unique=True, verbose_name='Anillo')
    price  = models.DecimalField(max_digits=6, decimal_places=2, verbose_name='Precio (Bs.)')

    class Meta:
        verbose_name        = 'Anillo de envío'
        verbose_name_plural = 'Anillos de envío'
        ordering             = ['number']

    def __str__(self):
        return f'Anillo {self.number} — Bs. {self.price}'


class PricingConfig(models.Model):
    """Configuración global de envío. Singleton (siempre pk=1)."""
    is_rainy_day       = models.BooleanField(default=False, verbose_name='Hoy es día lluvioso')
    is_holiday         = models.BooleanField(default=False, verbose_name='Hoy es feriado')
    rain_surcharge     = models.DecimalField(max_digits=6, decimal_places=2, default=2, verbose_name='Recargo por lluvia (Bs.)')
    holiday_surcharge  = models.DecimalField(max_digits=6, decimal_places=2, default=2, verbose_name='Recargo por feriado (Bs.)')
    night_surcharge    = models.DecimalField(max_digits=6, decimal_places=2, default=4, verbose_name='Recargo nocturno (Bs.)')
    night_start        = models.TimeField(default=time(23, 59), verbose_name='Inicio horario nocturno')
    night_end          = models.TimeField(default=time(6, 0), verbose_name='Fin horario nocturno')
    admin_qr_image     = models.ImageField(upload_to='pricing/qr/', blank=True, null=True, verbose_name='QR de pago del admin')
    admin_commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12, verbose_name='Comisión admin sobre venta (%)')
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Configuración de envío'
        verbose_name_plural = 'Configuración de envío'

    def __str__(self):
        return 'Configuración de envío'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def is_night(self, t):
        """t: datetime.time. Maneja el rango que cruza medianoche (ej. 23:59 → 06:00)."""
        if self.night_start <= self.night_end:
            return self.night_start <= t < self.night_end
        return t >= self.night_start or t < self.night_end
