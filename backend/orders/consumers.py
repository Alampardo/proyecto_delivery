import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class OrderConsumer(AsyncWebsocketConsumer):
    """
    Grupos:
      - 'admin_orders'          → el Admin recibe todos los cambios
      - 'business_{id}'         → el Dueño recibe pedidos de SU negocio
      - 'delivery_status'       → el Admin recibe cambios de estado de deliverys
    """

    async def connect(self):
        user = self.scope['user']

        if not user.is_authenticated:
            await self.close(code=4001)
            return

        self.groups = []

        if user.is_admin:
            self.groups = ['admin_orders', 'delivery_status']

        elif user.is_owner:
            profile = await self._get_owner_profile(user)
            if profile is None:
                await self.close(code=4003)
                return
            self.groups = [f'business_{profile.business_id}']

        elif user.is_delivery:
            self.groups = [f'delivery_{user.pk}']

        else:
            await self.close(code=4002)
            return

        for group in self.groups:
            await self.channel_layer.group_add(group, self.channel_name)

        await self.accept()
        # Confirma la conexión al cliente
        await self.send(text_data=json.dumps({'type': 'connected', 'groups': self.groups}))

    async def disconnect(self, close_code):
        for group in getattr(self, 'groups', []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data):
        # Solo acepta pings para mantener la conexión viva
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except (json.JSONDecodeError, KeyError):
            pass

    # ── Handlers de mensajes del Channel Layer ──────────────────────────────

    async def new_order(self, event):
        await self.send(text_data=json.dumps({'type': 'new_order', 'data': event['data']}))

    async def order_status_changed(self, event):
        await self.send(text_data=json.dumps({'type': 'order_status_changed', 'data': event['data']}))

    async def delivery_status_changed(self, event):
        await self.send(text_data=json.dumps({'type': 'delivery_status_changed', 'data': event['data']}))

    async def order_assigned(self, event):
        await self.send(text_data=json.dumps({'type': 'order_assigned', 'data': event['data']}))

    # ── Helpers ─────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _get_owner_profile(self, user):
        try:
            return user.owner_profile
        except Exception:
            return None
