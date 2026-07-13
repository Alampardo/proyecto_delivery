from django.contrib.auth import get_user_model
from rest_framework import serializers

from businesses.serializers import ProductSerializer
from pricing.models import ShippingRing
from .models import BusinessOrder, Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name  = serializers.CharField(source='product.name', read_only=True)
    business_name = serializers.CharField(source='product.business.name', read_only=True)
    subtotal      = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model  = OrderItem
        fields = ('id', 'product', 'product_name', 'business_name', 'quantity', 'unit_price', 'subtotal')
        read_only_fields = ('unit_price',)


class BusinessOrderSerializer(serializers.ModelSerializer):
    """Serializer completo para el panel del Dueño de Negocio."""
    items          = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    business_name  = serializers.CharField(source='business.name', read_only=True)
    client_name    = serializers.CharField(source='order.client_name', read_only=True)
    client_phone   = serializers.CharField(source='order.client_phone', read_only=True)
    delivery_address = serializers.CharField(source='order.delivery_address', read_only=True)
    order_created_at = serializers.DateTimeField(source='order.created_at', read_only=True)

    class Meta:
        model  = BusinessOrder
        fields = (
            'id', 'order', 'business', 'business_name',
            'status', 'status_display',
            'subtotal', 'notes',
            'admin_commission', 'business_payout', 'is_paid_to_business', 'paid_to_business_at',
            'client_name', 'client_phone', 'delivery_address',
            'order_created_at', 'handed_at',
            'created_at', 'updated_at',
            'items',
        )
        read_only_fields = (
            'business', 'subtotal', 'handed_at',
            'admin_commission', 'business_payout', 'is_paid_to_business', 'paid_to_business_at',
            'created_at', 'updated_at',
        )


class BusinessOrderStatusSerializer(serializers.ModelSerializer):
    """Serializer ligero para actualizaciones de estado."""
    class Meta:
        model  = BusinessOrder
        fields = ('id', 'status')


class OrderCreateItemSerializer(serializers.Serializer):
    """Valida cada ítem al crear un pedido desde el cliente."""
    product  = serializers.PrimaryKeyRelatedField(queryset=__import__('businesses').models.Product.objects.filter(is_available=True))
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    """Crea un Order completo con BusinessOrders agrupados por negocio."""
    client_name      = serializers.CharField(max_length=200)
    client_phone     = serializers.CharField(max_length=20)
    delivery_address = serializers.CharField(max_length=400)
    notes            = serializers.CharField(required=False, allow_blank=True, default='')
    ring             = serializers.PrimaryKeyRelatedField(queryset=ShippingRing.objects.all())
    payment_method   = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    items            = OrderCreateItemSerializer(many=True, min_length=1)

    def create(self, validated_data):
        from collections import defaultdict

        from django.db import transaction
        from django.utils import timezone

        from pricing.models import PricingConfig

        items_data = validated_data.pop('items')
        ring       = validated_data.pop('ring')
        pricing    = PricingConfig.get_solo()
        is_night   = pricing.is_night(timezone.localtime().time())

        shipping_cost = ring.price
        if pricing.is_rainy_day:
            shipping_cost += pricing.rain_surcharge
        if pricing.is_holiday:
            shipping_cost += pricing.holiday_surcharge
        if is_night:
            shipping_cost += pricing.night_surcharge

        with transaction.atomic():
            order = Order.objects.create(
                client_name      = validated_data['client_name'],
                client_phone     = validated_data['client_phone'],
                delivery_address = validated_data['delivery_address'],
                notes            = validated_data.get('notes', ''),
                ring             = ring,
                shipping_cost    = shipping_cost,
                payment_method   = validated_data['payment_method'],
                rain_applied     = pricing.is_rainy_day,
                holiday_applied  = pricing.is_holiday,
                night_applied    = is_night,
            )

            # Agrupa los ítems por negocio
            by_business = defaultdict(list)
            for item in items_data:
                by_business[item['product'].business_id].append(item)

            total = 0
            for business_id, items in by_business.items():
                from businesses.models import Business
                business = Business.objects.get(pk=business_id)
                bo = BusinessOrder.objects.create(order=order, business=business)
                subtotal = 0
                for item in items:
                    oi = OrderItem.objects.create(
                        business_order=bo,
                        product=item['product'],
                        quantity=item['quantity'],
                    )
                    subtotal += oi.subtotal
                commission = round(subtotal * pricing.admin_commission_pct / 100, 2)
                bo.subtotal         = subtotal
                bo.admin_commission = commission
                bo.business_payout  = subtotal - commission
                bo.save(update_fields=['subtotal', 'admin_commission', 'business_payout'])
                total += subtotal

            order.total = total
            order.save(update_fields=['total'])

        return order


class OrderSerializer(serializers.ModelSerializer):
    business_orders       = BusinessOrderSerializer(many=True, read_only=True)
    status_display         = serializers.CharField(source='get_status_display', read_only=True)
    ring_number            = serializers.IntegerField(source='ring.number', read_only=True, default=None)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    grand_total             = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model  = Order
        fields = (
            'id', 'client', 'client_name', 'client_phone',
            'delivery', 'delivery_address',
            'status', 'status_display',
            'notes', 'total',
            'ring', 'ring_number', 'shipping_cost', 'grand_total',
            'payment_method', 'payment_method_display',
            'rain_applied', 'holiday_applied', 'night_applied',
            'is_delivery_paid', 'delivery_paid_at',
            'created_at', 'updated_at',
            'business_orders',
        )
        read_only_fields = (
            'total', 'shipping_cost', 'rain_applied', 'holiday_applied', 'night_applied',
            'is_delivery_paid', 'delivery_paid_at', 'created_at', 'updated_at',
        )


class AssignDeliverySerializer(serializers.Serializer):
    """Valida al asignar un repartidor a un pedido desde el panel admin."""
    delivery = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(role='delivery')
    )
