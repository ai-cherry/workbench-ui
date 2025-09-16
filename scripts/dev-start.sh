#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)

# Run preflight to compute ports and sync env
bash "$ROOT_DIR/scripts/dev-preflight.sh" >/tmp/dev_preflight.log 2>&1 || true
FRONTEND_PORT=$(grep '^FRONTEND_PORT=' /tmp/dev_preflight.log | tail -1 | cut -d= -f2)
BACKEND_PORT=$(grep '^BACKEND_PORT=' /tmp/dev_preflight.log | tail -1 | cut -d= -f2)

if [[ -z "${FRONTEND_PORT:-}" || -z "${BACKEND_PORT:-}" ]]; then
  echo "[dev] Could not read ports from preflight. Inspect /tmp/dev_preflight.log" >&2
  exit 1
fi

echo "[dev] Using ports -> frontend:$FRONTEND_PORT backend:$BACKEND_PORT"

# Ensure Python venv and dependencies
if [[ ! -d "$ROOT_DIR/backend/.venv" ]]; then
  echo "[dev] Creating Python venv at backend/.venv ..."
  python3 -m venv "$ROOT_DIR/backend/.venv"
fi

echo "[dev] Ensuring backend dependencies (uvicorn, fastapi, etc.) ..."
"$ROOT_DIR/backend/.venv/bin/python" -m pip install --upgrade pip >/dev/null 2>&1 || true
"$ROOT_DIR/backend/.venv/bin/python" -m pip install -r "$ROOT_DIR/backend/requirements.txt" >/tmp/backend_pip.log 2>&1 || true

# Start backend in background using venv Python
echo "[dev] Starting backend (uvicorn) on $BACKEND_PORT ..."
ENVIRONMENT=development ALLOW_DEV_NOAUTH=true \
  "$ROOT_DIR/backend/.venv/bin/python" -m uvicorn backend.app.main:app --reload --port "$BACKEND_PORT" >/tmp/backend.log 2>&1 &
BACK_PID=$!

cleanup() {
  echo "[dev] Stopping backend (pid=$BACK_PID)"
  kill "$BACK_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Wait for backend health
echo -n "[dev] Waiting for backend health"
for i in {1..40}; do
  if curl -fsS "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
    echo " ... ok"
    break
  fi
  echo -n "."
  sleep 0.25
done

# Start frontend (foreground)
echo "[dev] Starting frontend (Next.js) on $FRONTEND_PORT ..."
echo "[dev] UI URL: http://localhost:$FRONTEND_PORT"
npm run dev -- -p "$FRONTEND_PORT"
