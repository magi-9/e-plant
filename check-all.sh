#!/bin/bash
# Run all backend checks (black, flake8, pytest) inside the running dev container.
# Usage: ./check-all.sh
set -euo pipefail

cd "$(dirname "$0")"

FAILED=()

run_step() {
    local label="$1"
    shift
    echo ""
    echo "--- $label ---"
    if "$@"; then
        echo "✅ $label passed"
    else
        echo "❌ $label FAILED"
        FAILED+=("$label")
    fi
}

echo "========================================"
echo " Running all checks against dev stack"
echo "========================================"

run_step "black (format check)" docker compose exec -T backend black . --check

run_step "flake8" docker compose exec -T backend flake8 . --max-line-length=120

run_step "pytest" docker compose exec -T \
    -e DJANGO_SETTINGS_MODULE=config.settings.dev \
    -e SECRET_KEY=ci-cd-testing-secret-key-123 \
    backend pytest tests/ -v

echo ""
echo "========================================"
if [ ${#FAILED[@]} -eq 0 ]; then
    echo "✅ All checks passed!"
    exit 0
else
    echo "❌ Failed checks: ${FAILED[*]}"
    exit 1
fi
