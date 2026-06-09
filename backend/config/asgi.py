import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Carga la app Django primero (necesario antes de importar consumers)
django_asgi_app = get_asgi_application()

from config.routing import websocket_urlpatterns
from orders.middleware import TokenAuthMiddlewareStack

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
