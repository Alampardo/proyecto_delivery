from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from deliveries.serializers import DeliveryProfileSerializer
from businesses.serializers import BusinessOwnerProfileSerializer

from .models import EmailVerificationToken, PasswordResetToken, User
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
    """Respuesta estándar de autenticación con token + datos del usuario."""
    token, _ = Token.objects.get_or_create(user=user)
    data = {'token': token.key, 'user': UserPublicSerializer(user).data}
    if user.is_delivery and hasattr(user, 'delivery_profile'):
        data['profile'] = DeliveryProfileSerializer(user.delivery_profile).data
    elif user.is_owner and hasattr(user, 'owner_profile'):
        data['profile'] = BusinessOwnerProfileSerializer(user.owner_profile).data
    return data


def _email_html(title, greeting, body_text, url, button_text, footer_text):
    return f"""<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f9fafb;padding:20px;margin:0">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07)">
  <div style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:32px;text-align:center">
    <div style="font-size:40px">🛵</div>
    <h1 style="color:white;margin:8px 0 0;font-size:22px;font-weight:800">DeliveryApp</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#111827;margin:0 0 8px;font-size:20px">{title}</h2>
    <p style="color:#6b7280;margin:0 0 6px">{greeting},</p>
    <p style="color:#374151;margin:0 0 24px">{body_text}</p>
    <div style="text-align:center;margin:24px 0">
      <a href="{url}" style="background:#f97316;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">{button_text}</a>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:16px 0 4px;text-align:center">{footer_text}</p>
    <p style="color:#d1d5db;font-size:11px;margin:0;text-align:center;word-break:break-all">{url}</p>
  </div>
</div>
</body></html>"""


def _send_verification_email(user):
    EmailVerificationToken.objects.filter(user=user).delete()
    token = EmailVerificationToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=24),
    )
    url = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
    send_mail(
        subject='Verifica tu email — DeliveryApp',
        message=f'Hola {user.first_name}, verifica tu email abriendo este enlace: {url}',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=_email_html(
            'Verificación de email',
            f'Hola {user.first_name}',
            'Haz click en el botón para activar tu cuenta:',
            url, 'Verificar email',
            'Este enlace expira en 24 horas.',
        ),
        fail_silently=True,
    )


def _send_password_reset_email(user):
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
    token = PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    url = f"{settings.FRONTEND_URL}/reset-password?token={token.token}"
    send_mail(
        subject='Restablecer contraseña — DeliveryApp',
        message=f'Hola {user.first_name}, restablece tu contraseña: {url}',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=_email_html(
            'Restablecer contraseña',
            f'Hola {user.first_name}',
            'Haz click en el botón para crear una nueva contraseña:',
            url, 'Restablecer contraseña',
            'Este enlace expira en 1 hora. Si no solicitaste esto, ignora este email.',
        ),
        fail_silently=True,
    )


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """POST /api/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_email_verified:
            return Response(
                {'detail': 'Debes verificar tu email antes de ingresar.', 'email_not_verified': True},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        _send_verification_email(user)
        return Response(
            {'detail': 'Cuenta creada. Revisa tu email para verificar tu cuenta.', 'email_sent': True},
            status=status.HTTP_201_CREATED,
        )


class DeliveryRegisterView(APIView):
    """POST /api/auth/register/delivery/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DeliveryRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _send_verification_email(user)
        return Response(
            {'detail': 'Cuenta creada. Revisa tu email para verificar tu cuenta.', 'email_sent': True},
            status=status.HTTP_201_CREATED,
        )


class OwnerRegisterView(APIView):
    """POST /api/auth/register/owner/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OwnerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _send_verification_email(user)
        return Response(
            {'detail': 'Cuenta creada. Revisa tu email para verificar tu cuenta.', 'email_sent': True},
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET/PATCH /api/auth/me/"""
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


# ── Verificación de email ─────────────────────────────────────────────────────

class VerifyEmailView(APIView):
    """POST /api/auth/verify-email/  — verifica el token del email y activa la cuenta."""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token')
        if not token_str:
            return Response({'detail': 'Token requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ev_token = EmailVerificationToken.objects.select_related('user').get(token=token_str)
        except EmailVerificationToken.DoesNotExist:
            return Response({'detail': 'Enlace inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not ev_token.is_valid:
            return Response(
                {'detail': 'El enlace ya expiró o fue utilizado.', 'expired': True},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ev_token.is_used = True
        ev_token.save(update_fields=['is_used'])
        ev_token.user.is_email_verified = True
        ev_token.user.save(update_fields=['is_email_verified'])
        return Response(_token_response(ev_token.user), status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Si el email existe, recibirás un nuevo enlace de verificación.'},
                status=status.HTTP_200_OK,
            )
        if user.is_email_verified:
            return Response({'detail': 'Tu email ya está verificado. Puedes iniciar sesión.'}, status=status.HTTP_200_OK)
        _send_verification_email(user)
        return Response({'detail': 'Email de verificación reenviado. Revisa tu bandeja.'}, status=status.HTTP_200_OK)


# ── Recuperación de contraseña ────────────────────────────────────────────────

class RequestPasswordResetView(APIView):
    """POST /api/auth/request-password-reset/"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        try:
            user = User.objects.get(email=email)
            _send_password_reset_email(user)
        except User.DoesNotExist:
            pass  # No revelar si el email existe
        return Response(
            {'detail': 'Si el email existe en el sistema, recibirás un enlace para restablecer tu contraseña.'},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/"""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str    = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')
        new_password2 = request.data.get('new_password2', '')

        if not all([token_str, new_password, new_password2]):
            return Response({'detail': 'Todos los campos son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != new_password2:
            return Response({'new_password2': ['Las contraseñas no coinciden.']}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'new_password': ['La contraseña debe tener al menos 8 caracteres.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pr_token = PasswordResetToken.objects.select_related('user').get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Enlace inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pr_token.is_valid:
            return Response(
                {'detail': 'El enlace expiró o ya fue utilizado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pr_token.is_used = True
        pr_token.save(update_fields=['is_used'])
        pr_token.user.set_password(new_password)
        pr_token.user.save(update_fields=['password'])
        Token.objects.filter(user=pr_token.user).delete()
        return Response({'detail': 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'}, status=status.HTTP_200_OK)


# ── Web Push ──────────────────────────────────────────────────────────────────

class VapidPublicKeyView(APIView):
    """GET /api/push/vapid-public-key/"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'vapid_public_key': settings.VAPID_PUBLIC_KEY})


class PushSubscribeView(APIView):
    """POST /api/push/subscribe/"""
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
