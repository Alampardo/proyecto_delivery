from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver


def _broadcast(group, event_type, data):
    """Envía un mensaje al channel layer. No lanza error si no está disponible."""
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group, {'type': event_type, 'data': data})
    except Exception:
        pass


def _broadcast_many(groups, event_type, data):
    for group in groups:
        _broadcast(group, event_type, data)


@receiver(post_save, sender='orders.BusinessOrder')
def on_business_order_save(sender, instance, created, **kwargs):
    data = {
        'id':             instance.pk,
        'order_id':       instance.order_id,
        'status':         instance.status,
        'status_display': instance.get_status_display(),
        'business_id':    instance.business_id,
        'business_name':  instance.business.name,
        'subtotal':       str(instance.subtotal),
        'client_name':    instance.order.client_name,
        'client_phone':   instance.order.client_phone,
    }
    event_type  = 'new_order' if created else 'order_status_changed'
    biz_group   = f'business_{instance.business_id}'
    _broadcast_many([biz_group, 'admin_orders'], event_type, data)

    # Si hay suscripciones push registradas para este negocio, enviar notificación
    if created:
        _send_push_to_business_owners(instance)


@receiver(post_save, sender='deliveries.DeliveryProfile')
def on_delivery_status_save(sender, instance, created, **kwargs):
    if created:
        return
    data = {
        'id':             instance.pk,
        'user_id':        instance.user_id,
        'full_name':      instance.user.full_name,
        'status':         instance.status,
        'status_display': instance.get_status_display(),
    }
    _broadcast('delivery_status', 'delivery_status_changed', data)


def _send_push_to_business_owners(business_order):
    """Envía notificación push a los dueños suscritos del negocio."""
    from django.conf import settings
    from users.models import PushSubscription
    from pywebpush import webpush, WebPushException

    if not settings.VAPID_PRIVATE_KEY:
        return

    subscriptions = PushSubscription.objects.filter(
        user__owner_profile__business_id=business_order.business_id
    )

    payload = {
        'title': f'Nuevo pedido — {business_order.business.name}',
        'body':  f'{business_order.order.client_name} • Bs. {business_order.subtotal}',
        'icon':  '/icon-192.png',
        'badge': '/icon-72.png',
        'data':  {'url': '/owner'},
    }

    import json
    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub.subscription_info,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={'sub': f'mailto:{settings.VAPID_CLAIMS_EMAIL}'},
            )
        except WebPushException:
            pass
