#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: Python 3.10+ is required. Install it, then run this script again."
  exit 1
fi
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo "ERROR: Python 3.10+ is required."
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js 18+ is required. Install it, then run this script again."
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  echo "ERROR: Node.js 18+ is required."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required. Install Node.js with npm included."
  exit 1
fi

if [[ ! -x "$BACKEND_DIR/venv/bin/python" ]]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$BACKEND_DIR/venv"
fi

echo "Installing backend dependencies..."
"$BACKEND_DIR/venv/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"

echo "Installing frontend dependencies..."
(
  cd "$FRONTEND_DIR"
  npm ci
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi
)

echo
echo "ClearDesk setup completed. Start the app with: bash ./run-mac.sh"
