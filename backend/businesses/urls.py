from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminBusinessViewSet, BusinessViewSet, OwnerProductViewSet

router = DefaultRouter()
router.register(r'businesses',        BusinessViewSet,       basename='business')
router.register(r'owner/products',    OwnerProductViewSet,   basename='owner-product')
router.register(r'admin/businesses',  AdminBusinessViewSet,  basename='admin-business')

app_name = 'businesses'

urlpatterns = [
    path('', include(router.urls)),
]
