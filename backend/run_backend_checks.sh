#!/bin/bash
# Note: This script is intended to be executed directly.
# Ensure it has execute permissions, e.g.:
#   chmod +x backend/run_backend_checks.sh
set -e

echo "Running Backend Checks inside Docker..."

# Format code first
echo "--- Running black ---"
docker compose exec backend black . --check || echo "Black formatting found issues. Run 'black .' to fix."

# Linting
echo "--- Running flake8 ---"
docker compose exec backend flake8 . --max-line-length=120 || echo "Flake8 found issues."

# Pytest
echo "--- Running pytest ---"
docker compose exec -e DJANGO_SETTINGS_MODULE=config.settings.dev -e SECRET_KEY=ci-cd-testing-secret-key-123 backend pytest

echo "✅ All checks finished!"
