from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Business, Product
from .permissions import IsAdmin, IsBusinessOwner, IsOwnerOfBusiness
from .serializers import (
    BusinessListSerializer,
    BusinessSerializer,
    BusinessWriteSerializer,
    ProductAvailabilitySerializer,
    ProductSerializer,
)


class BusinessViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Público: cualquier visitante puede listar y ver negocios activos.
    Solo Admin puede crear/editar desde el panel Django (/admin/).
    """
    queryset = Business.objects.filter(is_active=True).prefetch_related('schedules', 'products')

    def get_serializer_class(self):
        return BusinessSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class OwnerProductViewSet(viewsets.ModelViewSet):
    """
    CRUD de productos exclusivo para el Dueño de Negocio autenticado.
    Solo opera sobre los productos de SU propio negocio.
    """
    serializer_class    = ProductSerializer
    permission_classes  = [IsAuthenticated, IsBusinessOwner]

    def get_queryset(self):
        business = self.request.user.owner_profile.business
        return Product.objects.filter(business=business).order_by('name')

    def perform_create(self, serializer):
        business = self.request.user.owner_profile.business
        serializer.save(business=business)

    def get_object(self):
        obj = super().get_object()
        # Verifica que el producto pertenece al negocio del dueño autenticado
        IsOwnerOfBusiness().has_object_permission(self.request, self, obj)
        return obj

    @action(detail=True, methods=['patch'], url_path='toggle-availability')
    def toggle_availability(self, request, pk=None):
        """PATCH /api/owner/products/{id}/toggle-availability/"""
        product = self.get_object()
        product.is_available = not product.is_available
        product.save(update_fields=['is_available'])
        return Response(
            ProductAvailabilitySerializer(product).data,
            status=status.HTTP_200_OK,
        )


class AdminBusinessViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de negocios para el Administrador.
    GET    /api/admin/businesses/          → lista todos (activos + inactivos)
    POST   /api/admin/businesses/          → crea negocio
    PUT/PATCH /api/admin/businesses/{id}/  → edita negocio + horarios
    DELETE /api/admin/businesses/{id}/     → desactiva (soft-delete)
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Business.objects.all().prefetch_related('schedules').order_by('category', 'name')

    def get_serializer_class(self):
        if self.request.method in ('POST', 'PUT', 'PATCH'):
            return BusinessWriteSerializer
        return BusinessSerializer

    def get_parsers(self):
        # Acepta multipart (logo upload) y JSON
        from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
        return [MultiPartParser(), FormParser(), JSONParser()]

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: desactiva en lugar de borrar."""
        business = self.get_object()
        business.is_active = False
        business.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
