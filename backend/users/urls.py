from django.urls import path
from .views import (
    ChangePasswordView,
    ClientRegisterView,
    DeliveryRegisterView,
    LoginView,
    LogoutView,
    MeView,
    OwnerRegisterView,
    PushSubscribeView,
    PushUnsubscribeView,
    VapidPublicKeyView,
)

app_name = 'users'

urlpatterns = [
    path('auth/login/',                  LoginView.as_view(),          name='login'),
    path('auth/logout/',                 LogoutView.as_view(),         name='logout'),
    path('auth/me/',                     MeView.as_view(),             name='me'),
    path('auth/change-password/',        ChangePasswordView.as_view(), name='change-password'),
    path('auth/register/client/',        ClientRegisterView.as_view(), name='register-client'),
    path('auth/register/delivery/',      DeliveryRegisterView.as_view(), name='register-delivery'),
    path('auth/register/owner/',         OwnerRegisterView.as_view(),  name='register-owner'),

    # Web Push
    path('push/vapid-public-key/', VapidPublicKeyView.as_view(),  name='vapid-key'),
    path('push/subscribe/',        PushSubscribeView.as_view(),   name='push-subscribe'),
    path('push/unsubscribe/',      PushUnsubscribeView.as_view(), name='push-unsubscribe'),
]
