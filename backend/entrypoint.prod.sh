#!/bin/sh

echo "Waiting for PostgreSQL to start..."
python -c "
import socket
import time
import os

host = os.environ.get('DB_HOST', 'db')
port = int(os.environ.get('DB_PORT', 5432))
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

while True:
    try:
        s.connect((host, port))
        s.close()
        break
    except socket.error:
        print(f'Waiting for {host}:{port}...')
        time.sleep(1)
"
echo "PostgreSQL started properly."

# apply database migrations
python manage.py migrate

# collect static files
python manage.py collectstatic --noinput --clear

# Create superuser if env variables exist
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating admin user $DJANGO_SUPERUSER_EMAIL"
    python manage.py createsuperuser --noinput || echo "Superuser might already exist"
    # Ensure superuser password is set — env vars are read inside Python, never interpolated into code
    python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if email and password:
    u = User.objects.filter(email=email).first()
    if u:
        u.set_password(password)
        u.save()
" || echo "Failed to set password"
fi

# start gunicorn
echo "Starting Gunicorn production server..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --threads 4
