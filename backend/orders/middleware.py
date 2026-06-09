from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        return Token.objects.select_related('user').get(key=token_key).user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Autentica conexiones WebSocket leyendo el token DRF
    desde el query string: ws://...?token=<TOKEN>
    """
    async def __call__(self, scope, receive, send):
        params    = parse_qs(scope.get('query_string', b'').decode())
        token_key = params.get('token', [None])[0]
        scope['user'] = (
            await get_user_from_token(token_key)
            if token_key else AnonymousUser()
        )
        return await super().__call__(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)
