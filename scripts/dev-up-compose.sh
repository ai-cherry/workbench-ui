#!/usr/bin/env bash
set -euo pipefail

export FRONTEND_PORT=${FRONTEND_PORT:-3000}
export BACKEND_PORT=${BACKEND_PORT:-8000}

echo "[compose] Bringing up Workbench UI on http://localhost:${FRONTEND_PORT} (backend http://localhost:${BACKEND_PORT})"
docker compose -f docker-compose.dev.yml up --build

