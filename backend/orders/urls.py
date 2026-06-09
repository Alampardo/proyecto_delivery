from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminOrderViewSet, OrderCreateViewSet, OwnerBusinessOrderViewSet

router = DefaultRouter()
router.register(r'orders',        OrderCreateViewSet,       basename='order')
router.register(r'owner/orders',  OwnerBusinessOrderViewSet, basename='owner-order')
router.register(r'admin/orders',  AdminOrderViewSet,         basename='admin-order')

app_name = 'orders'

urlpatterns = [
    path('', include(router.urls)),
]
