from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.permissions import IsAdmin
from .models import PricingConfig, ShippingRing
from .serializers import (
    AdminPricingConfigSerializer,
    PublicPricingSerializer,
    ShippingRingSerializer,
)


class PublicPricingView(APIView):
    """GET /api/pricing/ — anillos, recargos vigentes y QR del admin. Público."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(PublicPricingSerializer(PricingConfig.get_solo()).data)


class AdminPricingConfigView(APIView):
    """GET/PATCH /api/admin/pricing/ — configuración de envío editable por el admin."""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(AdminPricingConfigSerializer(PricingConfig.get_solo()).data)

    def patch(self, request):
        config     = PricingConfig.get_solo()
        serializer = AdminPricingConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminShippingRingViewSet(viewsets.ModelViewSet):
    """GET/PATCH /api/admin/rings/ — editar precio de los anillos (sin crear/borrar)."""
    permission_classes  = [IsAuthenticated, IsAdmin]
    serializer_class    = ShippingRingSerializer
    queryset            = ShippingRing.objects.all()
    http_method_names    = ['get', 'patch', 'head']
