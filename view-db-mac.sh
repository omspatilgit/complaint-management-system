#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$ROOT_DIR/backend/venv/bin/python"
DATABASE="$ROOT_DIR/backend/complaints.db"

if [[ ! -x "$PYTHON" ]]; then
  echo "Dependencies are missing. First run: bash ./setup-mac.sh"
  exit 1
fi
if [[ ! -f "$DATABASE" ]]; then
  echo "Database not found. Start the ClearDesk app once to initialize it, then run this viewer again."
  exit 1
fi

exec "$PYTHON" "$ROOT_DIR/backend/view_db.py"
