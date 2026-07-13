from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminPricingConfigView, AdminShippingRingViewSet, PublicPricingView

router = DefaultRouter()
router.register(r'admin/rings', AdminShippingRingViewSet, basename='admin-ring')

app_name = 'pricing'

urlpatterns = [
    path('pricing/', PublicPricingView.as_view(), name='pricing-public'),
    path('admin/pricing/', AdminPricingConfigView.as_view(), name='pricing-admin'),
    path('', include(router.urls)),
]
