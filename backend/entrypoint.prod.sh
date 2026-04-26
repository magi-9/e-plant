#!/bin/sh

set -e

echo "Waiting for PostgreSQL to start..."
python -c "
import os
import socket
import time

host = os.environ.get('DB_HOST') or os.environ.get('POSTGRES_HOST') or os.environ.get('DATABASE_HOST') or 'postgres'
port = int(os.environ.get('DB_PORT', 5432))
wait_timeout = int(os.environ.get('DB_WAIT_TIMEOUT', 180))
deadline = time.time() + wait_timeout

while True:
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        if time.time() >= deadline:
            raise SystemExit(
                f'Timeout waiting for {host}:{port} after {wait_timeout}s. '
                'Set DB_HOST (or POSTGRES_HOST) to your Dokploy Postgres service name.'
            )
        print(f'Waiting for {host}:{port}...')
        time.sleep(1)
"
echo "PostgreSQL started properly."

# apply database migrations
attempt=1
max_attempts=20
until python manage.py migrate --noinput; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "Migrations failed after ${max_attempts} attempts."
        exit 1
    fi
    echo "Migration attempt ${attempt}/${max_attempts} failed, retrying in 2s..."
    attempt=$((attempt + 1))
    sleep 2
done

# Optional startup import from mounted data directory.
if [ "${IMPORT_PRODUCTS_ON_STARTUP:-false}" = "true" ]; then
    MASTER_CSV="/data/new/product_retail_2025_master.csv"
    MERGED_CSV="/data/csv/import_all_merged.csv"
    RETAIL_CSV="/data/csv/retail_prices.csv"

    if [ -f "$MASTER_CSV" ]; then
        echo "Importing products from master CSV: $MASTER_CSV"
        if ! python manage.py import_product_data --master --update; then
            echo "WARNING: Product import from master CSV failed; continuing startup."
        fi
    elif [ -f "$MERGED_CSV" ] && [ -f "$RETAIL_CSV" ]; then
        echo "Master CSV not found; importing from merged CSV dataset in /data/csv"
        if ! python manage.py import_product_data --update; then
            echo "WARNING: Product import from merged CSV failed; continuing startup."
        fi
    else
        echo "WARNING: No importable product CSV files found under /data; skipping product import."
    fi
fi

# collect static files
python manage.py collectstatic --noinput

# Create/update default users for staging and production
if [ "${CREATE_DEFAULT_USERS:-true}" = "true" ]; then
    echo "Ensuring default admin and user accounts exist"
    python manage.py shell << 'PYTHON_EOF'
import os
from django.contrib.auth import get_user_model

User = get_user_model()

admin_email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
admin_password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
default_user_email = os.environ.get('DJANGO_DEFAULT_USER_EMAIL', 'user@example.com')
default_user_password = os.environ.get('DJANGO_DEFAULT_USER_PASSWORD', 'user123')


def ensure_admin(email, password):
    user, created = User.objects.get_or_create(email=email)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.set_password(password)
    user.save()
    action = "created" if created else "updated"
    print(f"✓ Default admin {action}: {email}")


def ensure_user(email, password):
    user, created = User.objects.get_or_create(email=email)
    user.is_staff = False
    user.is_superuser = False
    user.is_active = True
    user.set_password(password)
    user.save()
    action = "created" if created else "updated"
    print(f"✓ Default user {action}: {email}")


ensure_admin(admin_email, admin_password)
ensure_user(default_user_email, default_user_password)
PYTHON_EOF
else
    echo "Skipping default user creation (CREATE_DEFAULT_USERS=${CREATE_DEFAULT_USERS})"
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
