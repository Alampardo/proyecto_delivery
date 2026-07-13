from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminOrderViewSet, OrderCreateViewSet, OwnerBusinessOrderViewSet
from .views_payouts import (
    AdminBusinessPayoutsView,
    AdminDeliveryPayoutsView,
    AdminMarkBusinessPaidView,
    AdminMarkDeliveryPaidView,
)

router = DefaultRouter()
router.register(r'orders',        OrderCreateViewSet,       basename='order')
router.register(r'owner/orders',  OwnerBusinessOrderViewSet, basename='owner-order')
router.register(r'admin/orders',  AdminOrderViewSet,         basename='admin-order')

app_name = 'orders'

urlpatterns = [
    path('admin/payouts/businesses/',                        AdminBusinessPayoutsView.as_view()),
    path('admin/payouts/businesses/<int:business_id>/mark-paid/', AdminMarkBusinessPaidView.as_view()),
    path('admin/payouts/deliveries/',                         AdminDeliveryPayoutsView.as_view()),
    path('admin/payouts/deliveries/<int:user_id>/mark-paid/', AdminMarkDeliveryPaidView.as_view()),
    path('', include(router.urls)),
]
