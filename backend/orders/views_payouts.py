from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.permissions import IsAdmin
from .models import BusinessOrder, Order


class AdminBusinessPayoutsView(APIView):
    """
    GET /api/admin/payouts/businesses/
    Cuánto le debe el admin a cada negocio (88% de lo vendido, no pagado aún).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        rows = (
            BusinessOrder.objects
            .filter(is_paid_to_business=False)
            .exclude(status=BusinessOrder.Status.CANCELLED)
            .values('business_id', 'business__name')
            .annotate(total_pending=Sum('business_payout'), orders_count=Count('id'))
            .order_by('-total_pending')
        )
        return Response(list(rows))


class AdminMarkBusinessPaidView(APIView):
    """POST /api/admin/payouts/businesses/{business_id}/mark-paid/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, business_id):
        updated = (
            BusinessOrder.objects
            .filter(business_id=business_id, is_paid_to_business=False)
            .exclude(status=BusinessOrder.Status.CANCELLED)
            .update(is_paid_to_business=True, paid_to_business_at=timezone.now())
        )
        return Response({'updated': updated})


class AdminDeliveryPayoutsView(APIView):
    """
    GET /api/admin/payouts/deliveries/
    Cuánto le debe el admin a cada repartidor por envíos ya entregados y no pagados.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        rows = (
            Order.objects
            .filter(status=Order.Status.DELIVERED, is_delivery_paid=False, delivery__isnull=False)
            .values('delivery_id', 'delivery__first_name', 'delivery__last_name')
            .annotate(total_pending=Sum('shipping_cost'), orders_count=Count('id'))
            .order_by('-total_pending')
        )
        return Response(list(rows))


class AdminMarkDeliveryPaidView(APIView):
    """POST /api/admin/payouts/deliveries/{user_id}/mark-paid/"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        updated = (
            Order.objects
            .filter(delivery_id=user_id, status=Order.Status.DELIVERED, is_delivery_paid=False)
            .update(is_delivery_paid=True, delivery_paid_at=timezone.now())
        )
        return Response({'updated': updated})
