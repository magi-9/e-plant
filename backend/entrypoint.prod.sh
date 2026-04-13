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

# Create superuser if env variables exist (SAFE - using heredoc)
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating admin user $DJANGO_SUPERUSER_EMAIL"
    python manage.py shell << 'PYTHON_EOF'
import os
from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if email and password:
    if not User.objects.filter(email=email).exists():
        User.objects.create_superuser(
            email=email,
            password=password,
            username=email
        )
        print(f"✓ Superuser created: {email}")
    else:
        user = User.objects.get(email=email)
        user.set_password(password)
        user.save()
        print(f"✓ Superuser password updated: {email}")
else:
    print("⚠ DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD not set")
PYTHON_EOF
fi

# start gunicorn
echo "Starting Gunicorn production server..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-4}" \
    --threads "${GUNICORN_THREADS:-4}" \
    --access-logfile - \
    --error-logfile - \
    --log-level "${GUNICORN_LOG_LEVEL:-info}" \
    --capture-output
