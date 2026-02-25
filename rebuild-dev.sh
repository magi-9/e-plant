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
echo "--- Waiting for backend to be ready ---"
sleep 3

echo ""
echo "--- Applying migrations ---"
docker compose exec backend python manage.py migrate

echo ""
echo "✅ Dev stack is up! Services:"
echo "   Frontend : http://localhost:5001"
echo "   Backend  : http://localhost:5002"
echo "   Mailhog  : http://localhost:8025"
