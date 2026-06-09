from django.conf import settings
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from deliveries.serializers import DeliveryProfileSerializer
from businesses.serializers import BusinessOwnerProfileSerializer

from .models import User
from .serializers import (
    ChangePasswordSerializer,
    ClientRegisterSerializer,
    DeliveryRegisterSerializer,
    LoginSerializer,
    OwnerRegisterSerializer,
    UpdateProfileSerializer,
    UserPublicSerializer,
)


def _token_response(user):
    """Construye la respuesta estándar de autenticación con token + datos del usuario."""
    token, _ = Token.objects.get_or_create(user=user)
    data = {'token': token.key, 'user': UserPublicSerializer(user).data}

    # Añade datos de perfil extendido según el rol
    if user.is_delivery and hasattr(user, 'delivery_profile'):
        data['profile'] = DeliveryProfileSerializer(user.delivery_profile).data
    elif user.is_owner and hasattr(user, 'owner_profile'):
        data['profile'] = BusinessOwnerProfileSerializer(user.owner_profile).data

    return data


class LoginView(APIView):
    """POST /api/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response(_token_response(user), status=status.HTTP_200_OK)


class LogoutView(APIView):
    """POST /api/auth/logout/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Sesión cerrada correctamente.'}, status=status.HTTP_200_OK)


class ClientRegisterView(APIView):
    """POST /api/auth/register/client/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClientRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_token_response(user), status=status.HTTP_201_CREATED)


class DeliveryRegisterView(APIView):
    """POST /api/auth/register/delivery/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DeliveryRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_token_response(user), status=status.HTTP_201_CREATED)


class OwnerRegisterView(APIView):
    """POST /api/auth/register/owner/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OwnerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_token_response(user), status=status.HTTP_201_CREATED)


class MeView(APIView):
    """
    GET  /api/auth/me/   → datos del usuario autenticado + perfil extendido
    PATCH /api/auth/me/  → actualiza nombre/teléfono
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_token_response(request.user), status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserPublicSerializer(request.user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        new_token = serializer.save()
        return Response(
            {'detail': 'Contraseña actualizada.', 'token': new_token.key},
            status=status.HTTP_200_OK,
        )


class VapidPublicKeyView(APIView):
    """GET /api/push/vapid-public-key/  → devuelve la clave pública VAPID al frontend."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'vapid_public_key': settings.VAPID_PUBLIC_KEY})


class PushSubscribeView(APIView):
    """
    POST /api/push/subscribe/
    El frontend envía la suscripción obtenida del ServiceWorker.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import PushSubscription
        endpoint = request.data.get('endpoint')
        p256dh   = request.data.get('keys', {}).get('p256dh')
        auth     = request.data.get('keys', {}).get('auth')

        if not all([endpoint, p256dh, auth]):
            return Response({'detail': 'Datos de suscripción incompletos.'}, status=status.HTTP_400_BAD_REQUEST)

        PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={'user': request.user, 'p256dh': p256dh, 'auth': auth},
        )
        return Response({'detail': 'Suscripción registrada.'}, status=status.HTTP_201_CREATED)


class PushUnsubscribeView(APIView):
    """DELETE /api/push/unsubscribe/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        from .models import PushSubscription
        endpoint = request.data.get('endpoint')
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
