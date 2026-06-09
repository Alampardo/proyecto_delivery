from rest_framework import serializers

from businesses.serializers import ProductSerializer
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
            'client_name', 'client_phone', 'delivery_address',
            'order_created_at', 'handed_at',
            'created_at', 'updated_at',
            'items',
        )
        read_only_fields = (
            'business', 'subtotal', 'handed_at',
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
    items            = OrderCreateItemSerializer(many=True, min_length=1)

    def create(self, validated_data):
        from collections import defaultdict
        from django.db import transaction

        items_data = validated_data.pop('items')

        with transaction.atomic():
            order = Order.objects.create(
                client_name      = validated_data['client_name'],
                client_phone     = validated_data['client_phone'],
                delivery_address = validated_data['delivery_address'],
                notes            = validated_data.get('notes', ''),
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
                bo.subtotal = subtotal
                bo.save(update_fields=['subtotal'])
                total += subtotal

            order.total = total
            order.save(update_fields=['total'])

        return order


class OrderSerializer(serializers.ModelSerializer):
    business_orders = BusinessOrderSerializer(many=True, read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Order
        fields = (
            'id', 'client', 'client_name', 'client_phone',
            'delivery', 'delivery_address',
            'status', 'status_display',
            'notes', 'total',
            'created_at', 'updated_at',
            'business_orders',
        )
        read_only_fields = ('total', 'created_at', 'updated_at')
