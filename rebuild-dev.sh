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
echo "✅ Dev stack is up! Migrations run automatically on backend startup."
echo "   Check progress : docker compose logs -f backend"
echo "   Frontend       : http://localhost:5001"
echo "   Backend        : http://localhost:5002"
echo "   Mailhog        : http://localhost:8025"
