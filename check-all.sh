#!/bin/bash
# Run all backend checks (black, flake8, pytest) inside the running dev container.
# Usage: ./check-all.sh
set -euo pipefail

cd "$(dirname "$0")"

FAILED=()
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

run_step() {
    local label="$1"
    shift
    local log_file="$TMP_DIR/${label// /_}.log"
    if "$@" >"$log_file" 2>&1; then
        echo "✅ $label OK"
    else
        echo "❌ $label FAILED"
        echo "   Poslednych 20 riadkov logu:"
        tail -n 30 "$log_file"
        FAILED+=("$label")
    fi
}

run_pytest() {
    local label="pytest"
    local log_file="$TMP_DIR/pytest.log"
    local spinner='|/-\\'
    local i=0

    docker compose exec -T \
        -e DJANGO_SETTINGS_MODULE=config.settings.dev \
        -e SECRET_KEY=ci-cd-testing-secret-key-123 \
        backend pytest tests/ -q -ra --tb=short >"$log_file" 2>&1 &
    local pid=$!

    while kill -0 "$pid" 2>/dev/null; do
        printf "\r⏳ pytest bezi %c" "${spinner:i++%${#spinner}:1}"
        sleep 0.2
    done

    wait "$pid"
    local exit_code=$?
    printf "\r\033[K"

    if [ "$exit_code" -eq 0 ]; then
        echo "✅ $label OK"
    else
        echo "❌ $label FAILED"
        echo "   Failed testy:"
        if grep -q '^FAILED ' "$log_file"; then
            grep '^FAILED ' "$log_file" | sed 's/^FAILED /   - /'
        else
            echo "   - Nepodarilo sa nacitat zoznam failed testov, poslednych 30 riadkov:"
            tail -n 30 "$log_file"
        fi
        FAILED+=("$label")
    fi
}

echo "========================================"
echo " Running all checks against dev stack"
echo "========================================"

run_step "eslint" docker compose exec -T frontend npm run lint

mkdir -p frontend/.tmp

run_step "frontend build" docker compose exec -T frontend npm run build

run_step "black (format check)" docker compose exec -T backend black . --check

run_step "flake8" docker compose exec -T backend flake8 . --max-line-length=120 --select=E,F,W,C,9

run_pytest

echo ""
echo "========================================"
if [ ${#FAILED[@]} -eq 0 ]; then
    echo "✅ All checks passed!"
    exit 0
else
    echo "❌ Failed checks: ${FAILED[*]}"
    exit 1
fi
