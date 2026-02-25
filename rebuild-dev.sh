#!/bin/bash
# Rebuild and restart the full dev stack, then apply migrations.
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
echo "--- Waiting for database to be ready ---"
MAX_ATTEMPTS=30
SLEEP_SECONDS=2
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    echo "Database is ready (attempt $attempt)."
    break
  fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    echo "ERROR: Database did not become ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi
  echo "Not ready yet ($attempt/$MAX_ATTEMPTS). Retrying in ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done

echo ""
echo "--- Applying migrations ---"
docker compose exec -T backend python manage.py migrate

echo ""
echo "✅ Dev stack is up! Services:"
echo "   Frontend : http://localhost:5001"
echo "   Backend  : http://localhost:5002"
echo "   Mailhog  : http://localhost:8025"
