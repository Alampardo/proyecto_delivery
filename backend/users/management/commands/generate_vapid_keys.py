from django.core.management.base import BaseCommand
from py_vapid import Vapid


class Command(BaseCommand):
    help = 'Genera el par de claves VAPID para Web Push y las muestra para copiar en .env'

    def handle(self, *args, **options):
        v = Vapid()
        v.generate_keys()

        private_key = v.private_pem().decode().strip()
        public_key  = v.public_key.public_bytes(
            __import__('cryptography').hazmat.primitives.serialization.Encoding.X962,
            __import__('cryptography').hazmat.primitives.serialization.PublicFormat.UncompressedPoint,
        )
        import base64
        public_key_b64 = base64.urlsafe_b64encode(public_key).rstrip(b'=').decode()

        self.stdout.write(self.style.SUCCESS('\n=== Claves VAPID generadas ==='))
        self.stdout.write(self.style.WARNING('\nCopia estas líneas en tu archivo .env:\n'))
        self.stdout.write(f'VAPID_PRIVATE_KEY={private_key.replace(chr(10), r"\\n")}')
        self.stdout.write(f'VAPID_PUBLIC_KEY={public_key_b64}')
        self.stdout.write('\nY esta clave pública en el frontend (.env):')
        self.stdout.write(f'VITE_VAPID_PUBLIC_KEY={public_key_b64}')
        self.stdout.write('')
