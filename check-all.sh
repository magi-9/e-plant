#!/bin/bash
# Run all backend checks (black, flake8, pytest) inside the running dev container.
# Usage: ./check-all.sh
set -e

cd "$(dirname "$0")"

echo "========================================"
echo " Running all checks against dev stack"
echo "========================================"

echo ""
echo "--- black (format check) ---"
docker compose exec backend black . --check

echo ""
echo "--- flake8 ---"
docker compose exec backend flake8 . --max-line-length=120

echo ""
echo "--- pytest ---"
docker compose exec \
  -e DJANGO_SETTINGS_MODULE=config.settings.dev \
  -e SECRET_KEY=ci-cd-testing-secret-key-123 \
  backend pytest tests/ -q

echo ""
echo "✅ All checks passed!"
