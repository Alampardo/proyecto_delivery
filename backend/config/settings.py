from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,192.168.0.3',
).split(',')

# Apps propias del proyecto
LOCAL_APPS = [
    'users',
    'businesses',
    'deliveries',
    'orders',
    'pricing',
]

# Dependencias de terceros
THIRD_PARTY_APPS = [
    'daphne',        # debe ir antes de staticfiles
    'channels',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
]

INSTALLED_APPS = [
    'daphne',   # antes de staticfiles (requerido por daphne)
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    *LOCAL_APPS,
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# --- Base de datos PostgreSQL ---
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME':     config('DB_NAME',     default='delivery_db'),
        'USER':     config('DB_USER',     default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST':     config('DB_HOST',     default='localhost'),
        'PORT':     config('DB_PORT',     default='5432'),
    }
}

# --- Modelo de usuario personalizado ---
AUTH_USER_MODEL = 'users.User'

# --- Django REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# --- CORS (permite peticiones desde el frontend) ---
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173',
).split(',')

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-bo'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True

# --- Archivos estáticos y media ---
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- ASGI / Django Channels ---
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
    # Para producción con múltiples workers, reemplazar con:
    # 'BACKEND': 'channels_redis.core.RedisChannelLayer',
    # 'CONFIG': {'hosts': [('127.0.0.1', 6379)]},
}

# Número WhatsApp del administrador para checkout
ADMIN_WHATSAPP = config('ADMIN_WHATSAPP', default='591XXXXXXXXX')

# URL base del frontend (para armar los links en los emails)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# --- Email ---
EMAIL_BACKEND       = config('EMAIL_BACKEND',    default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST          = config('EMAIL_HOST',        default='smtp.gmail.com')
EMAIL_PORT          = config('EMAIL_PORT',        default=587, cast=int)
EMAIL_USE_TLS       = config('EMAIL_USE_TLS',     default=True, cast=bool)
EMAIL_HOST_USER     = config('EMAIL_HOST_USER',   default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL', default='DeliveryApp <noreply@deliveryapp.com>')

# --- Web Push (VAPID) ---
# La clave privada se almacena en .env con \n literales; las convertimos a saltos de línea reales
VAPID_PRIVATE_KEY  = config('VAPID_PRIVATE_KEY', default='').replace('\\n', '\n')
VAPID_PUBLIC_KEY   = config('VAPID_PUBLIC_KEY',  default='')
VAPID_CLAIMS_EMAIL = config('VAPID_CLAIMS_EMAIL', default='admin@deliveryapp.com')
