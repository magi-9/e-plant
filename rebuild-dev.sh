#!/bin/bash
# Rebuild and restart the full dev stack.
# Migrations are run automatically by the backend container on startup.
# Usage: ./rebuild-dev.sh
set -e

cd "$(dirname "$0")"

echo "========================================"
echo " Rebuilding dev stack"
echo "========================================"

echo ""
echo "--- Stopping containers ---"
docker compose down

echo ""
echo "--- Building images ---"
docker compose build

echo ""
echo "--- Starting containers ---"
docker compose up -d

echo ""
echo "--- Ensuring demo users exist ---"

max_attempts=20
attempt=1
seed_ok=0

while [ "$attempt" -le "$max_attempts" ]; do
	if docker compose exec -T backend python manage.py shell <<'PY'
from django.contrib.auth import get_user_model

User = get_user_model()

demo_users = [
		{"email": "admin@example.com", "password": "admin", "is_admin": True},
		{"email": "client@example.com", "password": "client", "is_admin": False},
]

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
	exit 1
fi

echo ""
echo "✅ Dev stack is up! Migrations run automatically on backend startup."
echo "   Demo users     : admin@example.com/admin, client@example.com/client"
echo "   Check progress : docker compose logs -f backend"
echo "   Frontend       : http://localhost:5001"
echo "   Backend        : http://localhost:5002"
echo "   Mailhog        : http://localhost:8025"
