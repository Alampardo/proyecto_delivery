# 🛵 Sistema de Delivery

Sistema completo de delivery con panel para administradores, dueños de negocio, repartidores y clientes. Tiempo real vía WebSocket, notificaciones push y checkout vía WhatsApp.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django 6.x + Django REST Framework |
| Base de datos | PostgreSQL |
| Tiempo real | Django Channels 4.x + Daphne (ASGI) |
| Push Notifications | pywebpush + VAPID |
| Frontend | React + Vite + TailwindCSS v4 |
| Estado global | Zustand |

## Roles

| Rol | Acceso |
|-----|--------|
| **Admin** | Gestión total: negocios, repartidores, pedidos, actividad en tiempo real |
| **Dueño de Negocio** | Panel propio: pedidos entrantes (WebSocket), productos, notificaciones push |
| **Repartidor** | Panel de turno, historial de entregas, perfil con datos vehiculares |
| **Cliente** | Explorar negocios, agregar al carrito, checkout vía WhatsApp |

---

## Requisitos previos

- **Python 3.11+**
- **Node.js 18+** y npm
- **PostgreSQL 14+**

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/Alampardo/proyecto_delivery.git
cd proyecto_delivery
```

---

## 2. Configurar PostgreSQL

Abre `psql` (o pgAdmin) y ejecuta:

```sql
CREATE DATABASE delivery_db;
CREATE USER postgres WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE delivery_db TO postgres;
```

> Si tu usuario de PostgreSQL es distinto, ajusta `DB_USER` y `DB_PASSWORD` en el paso siguiente.

---

## 3. Configurar el Backend

### 3.1 Crear entorno virtual e instalar dependencias

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3.2 Crear el archivo `.env`

```bash
# En Windows
copy .env.example .env

# En Linux/Mac
cp .env.example .env
```

Edita `backend/.env` con tus valores reales:

```env
SECRET_KEY=una-clave-secreta-larga-y-aleatoria
DEBUG=True

DB_NAME=delivery_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432

ADMIN_WHATSAPP=591XXXXXXXXX
CORS_ALLOWED_ORIGINS=http://localhost:5173

VAPID_PRIVATE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_CLAIMS_EMAIL=admin@tudominio.com
```

### 3.3 Generar claves VAPID (Push Notifications)

```bash
python manage.py generate_vapid_keys
```

Copia las claves generadas en `backend/.env` (`VAPID_PRIVATE_KEY` y `VAPID_PUBLIC_KEY`).  
Copia también `VAPID_PUBLIC_KEY` en `frontend/.env` como `VITE_VAPID_PUBLIC_KEY`.

### 3.4 Aplicar migraciones

```bash
python manage.py migrate
```

### 3.5 Crear el superusuario administrador

```bash
python manage.py shell -c "
from users.models import User
if not User.objects.filter(email='admin@delivery.com').exists():
    User.objects.create_superuser(email='admin@delivery.com', password='Admin1234!', first_name='Admin', last_name='Sistema', phone='00000000', role='admin')
    print('Admin creado')
else:
    print('Ya existe')
"
```

### 3.6 Iniciar el servidor backend

```bash
daphne -p 8000 config.asgi:application
```

> **Importante:** usa `daphne`, no `python manage.py runserver`, para que WebSocket funcione.

---

## 4. Configurar el Frontend

### 4.1 Instalar dependencias

```bash
cd ../frontend
npm install
```

### 4.2 Crear el archivo `.env`

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edita `frontend/.env`:

```env
VITE_ADMIN_WHATSAPP=591XXXXXXXXX
VITE_VAPID_PUBLIC_KEY=<pega aquí el VAPID_PUBLIC_KEY del backend>
```

### 4.3 Iniciar el servidor frontend

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

---

## 5. Acceder al sistema

| Usuario | Email | Contraseña | Panel |
|---------|-------|-----------|-------|
| Admin | `admin@delivery.com` | `Admin1234!` | `http://localhost:5173/admin` |

Desde el panel Admin podés:
- Crear **Tokens de Negocio** para que los dueños se registren
- Crear **Códigos de Registro** para que los repartidores se registren
- Gestionar negocios, productos, pedidos y repartidores

---

## 6. Flujo de registro por rol

### Dueño de Negocio
1. Admin genera un **Token de Negocio** en el panel → `Admin > Negocios > Tokens`
2. El dueño va a `/register`, selecciona pestaña **"Soy dueño de negocio"**
3. Ingresa el token UUID recibido + sus datos personales
4. Accede en `http://localhost:5173/owner`

### Repartidor
1. Admin genera un **Código de Registro** en el panel → `Admin > Repartidores > Códigos`
2. El repartidor va a `/register`, selecciona pestaña **"Soy repartidor"**
3. Ingresa el código UUID + datos (CI, placa, RUAT)
4. Accede en `http://localhost:5173/delivery`

### Cliente
- Va a `/register` → pestaña **"Soy cliente"** → registro libre sin código
- Accede en `http://localhost:5173` para explorar negocios

---

## 7. Estructura del proyecto

```
proyecto_delivery/
├── backend/
│   ├── config/          # settings.py, urls.py, asgi.py, routing.py
│   ├── users/           # Modelo User (email-based), PushSubscription, VAPID
│   ├── businesses/      # Business, Product, BusinessSchedule, BusinessToken
│   ├── deliveries/      # RegistrationCode, DeliveryProfile
│   ├── orders/          # Order, BusinessOrder, OrderItem, Consumer WS, Signals
│   ├── .env.example     # Plantilla de variables de entorno
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── sw.js        # Service Worker para push notifications
│   ├── src/
│   │   ├── api/         # Axios client + endpoints por módulo
│   │   ├── components/  # UI reutilizable (Button, Badge, Modal, Input)
│   │   ├── hooks/       # useWebSocket, usePushNotifications
│   │   ├── pages/       # admin/, owner/, delivery/, client/, auth/
│   │   ├── routes/      # ProtectedRoute por rol
│   │   ├── stores/      # useAuthStore, useCartStore (Zustand)
│   │   └── App.jsx
│   ├── .env.example
│   └── vite.config.js   # Proxy /api y /ws → localhost:8000
└── README.md
```

---

## 8. Variables de entorno — referencia completa

### `backend/.env`

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Clave secreta de Django (generá una con `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
| `DEBUG` | `True` en desarrollo, `False` en producción |
| `DB_NAME` | Nombre de la base de datos PostgreSQL |
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `DB_HOST` | Host de PostgreSQL (por defecto `localhost`) |
| `DB_PORT` | Puerto de PostgreSQL (por defecto `5432`) |
| `ADMIN_WHATSAPP` | Número de WhatsApp del admin para el checkout (ej: `59178901234`) |
| `CORS_ALLOWED_ORIGINS` | Origen del frontend (ej: `http://localhost:5173`) |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID para Web Push |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID para Web Push |
| `VAPID_CLAIMS_EMAIL` | Email del remitente VAPID (ej: `admin@tudominio.com`) |

### `frontend/.env`

| Variable | Descripción |
|----------|-------------|
| `VITE_ADMIN_WHATSAPP` | Mismo número que `ADMIN_WHATSAPP` del backend |
| `VITE_VAPID_PUBLIC_KEY` | Misma clave pública que `VAPID_PUBLIC_KEY` del backend |

---

## 9. Endpoints principales (API)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Registro de usuarios (cliente/delivery/owner) |
| POST | `/api/auth/login/` | Login → devuelve token |
| GET | `/api/businesses/` | Lista de negocios activos (público) |
| GET | `/api/businesses/{id}/products/` | Productos de un negocio (público) |
| POST | `/api/orders/` | Crear pedido (cliente autenticado) |
| GET | `/api/owner/orders/` | Pedidos del negocio propio (owner) |
| PATCH | `/api/owner/orders/{id}/start-preparation/` | Iniciar preparación (owner) |
| PATCH | `/api/owner/orders/{id}/hand-to-delivery/` | Entregar al repartidor (owner) |
| WS | `ws://localhost:8000/ws/orders/?token=<token>` | Canal WebSocket tiempo real |

---

## 10. Tecnologías y licencias

- [Django](https://www.djangoproject.com/) — BSD
- [Django REST Framework](https://www.django-rest-framework.org/) — BSD
- [Django Channels](https://channels.readthedocs.io/) — BSD
- [React](https://react.dev/) — MIT
- [Vite](https://vitejs.dev/) — MIT
- [TailwindCSS](https://tailwindcss.com/) — MIT
- [Zustand](https://zustand-demo.pmnd.rs/) — MIT
