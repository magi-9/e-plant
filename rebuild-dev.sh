#!/bin/bash
# Rebuild and restart the full dev stack.
# Migrations are run automatically by the backend container on startup.
# Usage: ./rebuild-dev.sh
set -e

cd "$(dirname "$0")"

echo "========================================"
echo " Rebuilding dev stack"
echo "========================================"

# Use .env.local for dev so prod credentials in .env don't leak into the dev stack.
ENV_FILE_ARG=""
if [ -f ".env.local" ]; then
	ENV_FILE_ARG="--env-file .env.local"
fi

echo ""
echo "--- Stopping containers and wiping volumes ---"
docker compose $ENV_FILE_ARG down -v

echo ""
echo "--- Building images ---"
docker compose $ENV_FILE_ARG build

echo ""
echo "--- Starting containers ---"
docker compose $ENV_FILE_ARG up -d

echo ""
echo "--- Ensuring demo users exist ---"

max_attempts=20
attempt=1
seed_ok=0

while [ "$attempt" -le "$max_attempts" ]; do
	if docker compose $ENV_FILE_ARG exec -T backend python manage.py shell <<'PY'
import sys
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.utils import OperationalError, ProgrammingError

User = get_user_model()

demo_users = [
		{"email": "admin@example.com", "password": "admin", "is_admin": True},
		{"email": "client@example.com", "password": "client", "is_admin": False},
]

try:
	# Avoid racing against in-progress migrations: only seed after required schema is present.
	with connection.cursor() as cursor:
		cursor.execute(
			"""
			SELECT 1
			FROM django_migrations
			WHERE app = 'users' AND name = '0002_globalsettings_customuser_city_and_more'
			LIMIT 1
			"""
		)
		if cursor.fetchone() is None:
			sys.exit(1)

		cursor.execute(
			"""
			SELECT 1
			FROM information_schema.columns
			WHERE table_name = 'users_customuser' AND column_name = 'street'
			LIMIT 1
			"""
		)
		if cursor.fetchone() is None:
			sys.exit(1)

	for data in demo_users:
			user, created = User.objects.get_or_create(
					email=data["email"],
					defaults={
							"is_active": True,
							"is_staff": data["is_admin"],
							"is_superuser": data["is_admin"],
					},
			)

			user.is_active = True
			if data["is_admin"]:
					user.is_staff = True
					user.is_superuser = True
			user.set_password(data["password"])
			user.save()

			state = "created" if created else "updated"
			print(f"{state}: {data['email']}")
except (OperationalError, ProgrammingError):
	# Database and schema may still be initializing; let caller retry quietly.
	sys.exit(1)
PY
	then
		seed_ok=1
		break
	fi

	echo "Backend not ready yet (attempt ${attempt}/${max_attempts}), retrying..."
	attempt=$((attempt + 1))
	sleep 2
done

if [ "$seed_ok" -ne 1 ]; then
	echo "❌ Failed to create demo users after ${max_attempts} attempts."
	echo "   Check backend logs: docker compose logs backend"
	exit 1
fi

echo ""
echo "--- Importing products and images ---"

import_attempts=10
import_try=1
import_ok=0

while [ "$import_try" -le "$import_attempts" ]; do
	if docker compose $ENV_FILE_ARG exec -T backend python manage.py import_product_data --update; then
		import_ok=1
		break
	fi

	echo "Product import not ready yet (attempt ${import_try}/${import_attempts}), retrying..."
	import_try=$((import_try + 1))
	sleep 3
done

if [ "$import_ok" -ne 1 ]; then
	echo "❌ Failed to import products after ${import_attempts} attempts."
	echo "   Check backend logs: docker compose logs backend"
	exit 1
fi

echo ""
echo "✅ Dev stack is up! Migrations run automatically on backend startup."
echo "   Demo users     : admin@example.com/admin, client@example.com/client"
echo "   Products import: completed"
echo "   Check progress : docker compose logs -f backend"
echo "   Frontend       : http://localhost:5001"
echo "   Backend        : http://localhost:5002"
echo "   Mailhog        : http://localhost:8025"
