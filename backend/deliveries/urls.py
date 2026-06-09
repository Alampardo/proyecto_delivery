from django.urls import path
from .views import (
    AdminDeliveryPanelView,
    AdminGenerateBusinessTokenView,
    AdminGenerateCodeView,
    AdminListCodesView,
    DeliveryHistoryView,
    DeliveryProfileView,
    DeliveryToggleShiftView,
)

app_name = 'deliveries'

urlpatterns = [
    # Panel del Delivery (requiere rol delivery)
    path('delivery/profile/',        DeliveryProfileView.as_view(),     name='delivery-profile'),
    path('delivery/toggle-shift/',   DeliveryToggleShiftView.as_view(), name='delivery-toggle-shift'),
    path('delivery/history/',        DeliveryHistoryView.as_view(),     name='delivery-history'),

    # Panel del Administrador (requiere rol admin)
    path('admin/deliveries/',                AdminDeliveryPanelView.as_view(),       name='admin-deliveries'),
    path('admin/generate-delivery-code/',    AdminGenerateCodeView.as_view(),        name='admin-gen-code'),
    path('admin/delivery-codes/',            AdminListCodesView.as_view(),           name='admin-list-codes'),
    path('admin/generate-business-token/',   AdminGenerateBusinessTokenView.as_view(), name='admin-gen-biz-token'),
]
