from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.permissions import IsAdmin
from .models import DeliveryProfile, RegistrationCode
from .serializers import (
    DeliveryPanelSerializer,
    DeliveryProfileSerializer,
    DeliveryProfileUpdateSerializer,
    DeliveryStatusSerializer,
    RegistrationCodeSerializer,
)


class DeliveryProfileView(APIView):
    """
    GET   /api/delivery/profile/   → perfil completo del delivery autenticado
    PATCH /api/delivery/profile/   → actualiza datos del perfil
    """
    permission_classes = [IsAuthenticated]

    def _get_profile(self, user):
        if not user.is_delivery:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo los deliverys tienen perfil de repartidor.')
        try:
            return user.delivery_profile
        except DeliveryProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Perfil de delivery no encontrado.')

    def get(self, request):
        profile = self._get_profile(request.user)
        return Response(DeliveryProfileSerializer(profile).data)

    def patch(self, request):
        profile = self._get_profile(request.user)
        serializer = DeliveryProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DeliveryProfileSerializer(profile).data)


class DeliveryToggleShiftView(APIView):
    """
    PATCH /api/delivery/toggle-shift/
    Alterna el estado del delivery entre Disponible y Fuera de servicio.
    El delivery lo usa como botón "Iniciar/Finalizar turno".
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        if not request.user.is_delivery:
            return Response(
                {'detail': 'Solo los deliverys pueden usar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = request.user.delivery_profile
        if profile.status == DeliveryProfile.Status.OUT_OF_SERVICE:
            profile.status          = DeliveryProfile.Status.AVAILABLE
            profile.shift_started_at = timezone.now()
        else:
            profile.status          = DeliveryProfile.Status.OUT_OF_SERVICE
            profile.shift_started_at = None
        profile.save(update_fields=['status', 'shift_started_at', 'updated_at'])
        return Response(DeliveryStatusSerializer(profile).data)


class DeliveryHistoryView(APIView):
    """
    GET /api/delivery/history/
    Historial de pedidos del delivery autenticado (hoy y hasta 3 días atrás).
    Query param: ?days=1  (1, 2 o 3 — default 1 = solo hoy)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_delivery:
            return Response(
                {'detail': 'Solo los deliverys pueden ver este historial.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        from datetime import timedelta
        from orders.models import Order
        from orders.serializers import OrderSerializer

        try:
            days = min(int(request.query_params.get('days', 1)), 3)
        except (ValueError, TypeError):
            days = 1

        since = timezone.now() - timedelta(days=days)
        orders = (
            Order.objects
            .filter(delivery=request.user, created_at__gte=since)
            .prefetch_related('business_orders__items__product', 'business_orders__business')
            .order_by('-created_at')
        )
        return Response(OrderSerializer(orders, many=True).data)


# ── Endpoints del Administrador ──────────────────────────────────────────────

class AdminDeliveryPanelView(APIView):
    """
    GET /api/admin/deliveries/
    Vista en tiempo real de todos los repartidores con su estado e info de contacto.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        profiles = (
            DeliveryProfile.objects
            .select_related('user')
            .order_by('status', 'user__first_name')
        )
        return Response(DeliveryPanelSerializer(profiles, many=True).data)


class AdminGenerateCodeView(APIView):
    """
    POST /api/admin/generate-delivery-code/
    Genera un nuevo código de registro para un delivery.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        code = RegistrationCode.objects.create()
        return Response(
            RegistrationCodeSerializer(code).data,
            status=status.HTTP_201_CREATED,
        )


class AdminListCodesView(APIView):
    """
    GET /api/admin/delivery-codes/
    Lista todos los códigos (disponibles y usados).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        only_available = request.query_params.get('available') == 'true'
        qs = RegistrationCode.objects.select_related('used_by').order_by('-created_at')
        if only_available:
            qs = qs.filter(is_used=False)
        return Response(RegistrationCodeSerializer(qs, many=True).data)


class AdminGenerateBusinessTokenView(APIView):
    """
    POST /api/admin/generate-business-token/
    Genera un token de registro para el dueño de un negocio específico.
    Body: { "business": <id> }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        from businesses.models import Business, BusinessToken
        from businesses.serializers import BusinessTokenSerializer

        business_id = request.data.get('business')
        if not business_id:
            return Response({'detail': 'El campo "business" es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            business = Business.objects.get(pk=business_id)
        except Business.DoesNotExist:
            return Response({'detail': 'Negocio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        token, created = BusinessToken.objects.get_or_create(business=business)
        if not created and token.is_used:
            # Si el token fue usado, crea uno nuevo eliminando el anterior
            token.delete()
            token = BusinessToken.objects.create(business=business)

        return Response(
            BusinessTokenSerializer(token).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
