from django.conf import settings
from django.db import models

from businesses.models import Business, Product


class Order(models.Model):
    """Contenedor principal del pedido. Agrupa uno o varios BusinessOrders."""
    class Status(models.TextChoices):
        PENDING      = 'pendiente',    'Pendiente'
        PREPARING    = 'preparando',   'En preparación'
        READY        = 'listo',        'Listo para recoger'
        ASSIGNED     = 'asignado',     'Asignado a delivery'
        IN_ROUTE     = 'en_camino',    'En camino'
        DELIVERED    = 'entregado',    'Entregado'
        CANCELLED    = 'cancelado',    'Cancelado'

    class PaymentMethod(models.TextChoices):
        QR   = 'qr',       'QR'
        CASH = 'efectivo', 'Efectivo'

    client           = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='orders',
        verbose_name='Cliente registrado'
    )
    client_name      = models.CharField(max_length=200, blank=True, verbose_name='Nombre cliente')
    client_phone     = models.CharField(max_length=20, blank=True, verbose_name='Teléfono cliente')
    delivery         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_orders',
        verbose_name='Delivery asignado'
    )
    delivery_address = models.CharField(max_length=400, verbose_name='Dirección de entrega')
    status           = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado general'
    )
    notes            = models.TextField(blank=True, verbose_name='Notas adicionales')
    total            = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    # Envío
    ring             = models.ForeignKey(
        'pricing.ShippingRing',
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name='orders',
        verbose_name='Anillo de envío'
    )
    shipping_cost    = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='Costo de envío')
    payment_method   = models.CharField(
        max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.CASH,
        verbose_name='Método de pago'
    )
    rain_applied     = models.BooleanField(default=False, verbose_name='Recargo lluvia aplicado')
    holiday_applied  = models.BooleanField(default=False, verbose_name='Recargo feriado aplicado')
    night_applied    = models.BooleanField(default=False, verbose_name='Recargo nocturno aplicado')

    # Pago pendiente al repartidor
    is_delivery_paid = models.BooleanField(default=False, verbose_name='Envío pagado al repartidor')
    delivery_paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Pedido'
        verbose_name_plural = 'Pedidos'
        ordering            = ['-created_at']

    def __str__(self):
        return f'Pedido #{self.pk} — {self.get_status_display()} ({self.created_at:%d/%m/%Y %H:%M})'

    def recalculate_total(self):
        self.total = sum(bo.subtotal for bo in self.business_orders.all())
        self.save(update_fields=['total'])

    @property
    def grand_total(self):
        return self.total + self.shipping_cost


class BusinessOrder(models.Model):
    """
    Sub-pedido agrupado por negocio dentro de un Order.
    Es el objeto que ve el Dueño de Negocio en su panel.
    """
    class Status(models.TextChoices):
        PENDING            = 'pendiente',            'Pendiente de preparación'
        IN_PREPARATION     = 'en_preparacion',       'En preparación'
        HANDED_TO_DELIVERY = 'entregado_repartidor', 'Entregado al repartidor'
        CANCELLED          = 'cancelado',            'Cancelado'

    order      = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='business_orders',
        verbose_name='Pedido principal'
    )
    business   = models.ForeignKey(
        Business,
        on_delete=models.PROTECT,
        related_name='business_orders',
        verbose_name='Negocio'
    )
    status     = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado en el negocio'
    )
    subtotal   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes      = models.TextField(blank=True, verbose_name='Notas para el negocio')
    handed_at  = models.DateTimeField(null=True, blank=True, verbose_name='Hora de entrega al repartidor')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Reparto de dinero con el negocio
    admin_commission     = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='Comisión admin')
    business_payout      = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='A pagar al negocio')
    is_paid_to_business  = models.BooleanField(default=False, verbose_name='Pagado al negocio')
    paid_to_business_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Sub-pedido de Negocio'
        verbose_name_plural = 'Sub-pedidos de Negocio'
        ordering            = ['-created_at']

    def __str__(self):
        return f'SubPedido #{self.pk} [{self.business.name}] — {self.get_status_display()}'

    def recalculate_subtotal(self):
        self.subtotal = sum(item.subtotal for item in self.items.all())
        self.save(update_fields=['subtotal'])


class OrderItem(models.Model):
    business_order = models.ForeignKey(
        BusinessOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Sub-pedido'
    )
    product        = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        verbose_name='Producto'
    )
    quantity       = models.PositiveIntegerField(default=1, verbose_name='Cantidad')
    unit_price     = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio unitario')

    class Meta:
        verbose_name        = 'Ítem de pedido'
        verbose_name_plural = 'Ítems de pedido'

    def __str__(self):
        return f'{self.quantity}x {self.product.name} (SubPedido #{self.business_order.pk})'

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    def save(self, *args, **kwargs):
        if not self.pk:
            self.unit_price = self.product.price
        super().save(*args, **kwargs)
