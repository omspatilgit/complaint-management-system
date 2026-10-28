#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [[ ! -x "$BACKEND_DIR/venv/bin/python" || ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Dependencies are missing. First run: bash ./setup-mac.sh"
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/.env" ]]; then
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
fi

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  echo
  echo "Stopping ClearDesk servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit "$exit_code"
}

echo "ClearDesk URLs:"
echo "  Dashboard: http://localhost:5173"
echo "  API docs:  http://127.0.0.1:8000/docs"
echo "Press Ctrl+C to stop both servers."
echo

(
  cd "$BACKEND_DIR"
  "$BACKEND_DIR/venv/bin/python" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 127.0.0.1 --port 5173
) &
FRONTEND_PID=$!

trap cleanup EXIT INT TERM

sleep 2
if command -v open >/dev/null 2>&1; then
  open http://localhost:5173
fi

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done
