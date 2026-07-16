#!/bin/sh
set -e

echo "Aplicando migraciones..."
python manage.py migrate --noinput

echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

echo "Iniciando Daphne (ASGI)..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
