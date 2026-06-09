from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from businesses.permissions import IsAdmin, IsBusinessOwner, IsOwnerOfBusiness
from .models import BusinessOrder, Order
from .serializers import (
    BusinessOrderSerializer,
    BusinessOrderStatusSerializer,
    OrderCreateSerializer,
    OrderSerializer,
)


class OrderCreateViewSet(viewsets.GenericViewSet):
    """
    Endpoint público para que el Cliente cree un pedido.
    POST /api/orders/  →  crea Order + BusinessOrders agrupados por negocio.
    """
    permission_classes  = [AllowAny]
    serializer_class    = OrderCreateSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OwnerBusinessOrderViewSet(viewsets.GenericViewSet):
    """
    Panel de pedidos para el Dueño de Negocio.
    Solo ve los BusinessOrders de SU negocio.
    """
    permission_classes = [IsAuthenticated, IsBusinessOwner]
    serializer_class   = BusinessOrderSerializer

    def get_queryset(self):
        business = self.request.user.owner_profile.business
        return (
            BusinessOrder.objects
            .filter(business=business)
            .select_related('order', 'business')
            .prefetch_related('items__product')
            .order_by('-created_at')
        )

    def list(self, request):
        """
        GET /api/owner/orders/
        Por defecto lista los pedidos pendientes + en preparación.
        Query param ?all=true devuelve todo el historial.
        """
        qs = self.get_queryset()
        if request.query_params.get('all') != 'true':
            qs = qs.filter(
                status__in=[
                    BusinessOrder.Status.PENDING,
                    BusinessOrder.Status.IN_PREPARATION,
                ]
            )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """GET /api/owner/orders/{id}/"""
        bo = self._get_own_business_order(pk)
        return Response(self.get_serializer(bo).data)

    @action(detail=True, methods=['patch'], url_path='start-preparation')
    def start_preparation(self, request, pk=None):
        """
        PATCH /api/owner/orders/{id}/start-preparation/
        Dueño confirma que está preparando el pedido.
        Estado: pendiente → en_preparacion
        """
        bo = self._get_own_business_order(pk)
        if bo.status != BusinessOrder.Status.PENDING:
            return Response(
                {'detail': 'Solo se puede iniciar preparación desde estado pendiente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        bo.status = BusinessOrder.Status.IN_PREPARATION
        bo.save(update_fields=['status', 'updated_at'])
        return Response(BusinessOrderStatusSerializer(bo).data)

    @action(detail=True, methods=['patch'], url_path='hand-to-delivery')
    def hand_to_delivery(self, request, pk=None):
        """
        PATCH /api/owner/orders/{id}/hand-to-delivery/
        Dueño marca que entregó el pedido al repartidor.
        Estado: en_preparacion → entregado_repartidor
        """
        bo = self._get_own_business_order(pk)
        if bo.status != BusinessOrder.Status.IN_PREPARATION:
            return Response(
                {'detail': 'El pedido debe estar en preparación antes de entregarlo al repartidor.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        bo.status    = BusinessOrder.Status.HANDED_TO_DELIVERY
        bo.handed_at = timezone.now()
        bo.save(update_fields=['status', 'handed_at', 'updated_at'])

        # Sincroniza el estado general del Order si todos los sub-pedidos están entregados
        order = bo.order
        all_handed = not order.business_orders.exclude(
            status__in=[
                BusinessOrder.Status.HANDED_TO_DELIVERY,
                BusinessOrder.Status.CANCELLED,
            ]
        ).exists()
        if all_handed:
            order.status = Order.Status.READY
            order.save(update_fields=['status'])

        return Response(BusinessOrderStatusSerializer(bo).data)

    def _get_own_business_order(self, pk):
        """Helper: obtiene el BusinessOrder verificando que pertenece al negocio del dueño."""
        try:
            bo = BusinessOrder.objects.select_related('order', 'business').get(pk=pk)
        except BusinessOrder.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Pedido no encontrado.')

        if bo.business != self.request.user.owner_profile.business:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No tienes permisos sobre este pedido.')

        return bo


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Panel de pedidos para el Administrador.
    GET /api/admin/orders/  →  todos los pedidos con sus sub-pedidos.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class   = OrderSerializer
    queryset = (
        Order.objects
        .select_related('client', 'delivery')
        .prefetch_related('business_orders__items__product', 'business_orders__business')
        .order_by('-created_at')
    )

    def get_queryset(self):
        qs    = super().get_queryset()
        s     = self.request.query_params.get('status')
        date  = self.request.query_params.get('date')
        if s:
            qs = qs.filter(status=s)
        if date:
            qs = qs.filter(created_at__date=date)
        return qs
