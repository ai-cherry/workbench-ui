#!/usr/bin/env bash
set -euo pipefail

# Preflight checks for local dev: ports, env, versions, caches

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)

FRONTEND_BASE_PORT=${FRONTEND_BASE_PORT:-3000}
BACKEND_BASE_PORT=${BACKEND_BASE_PORT:-8000}
MCP_PORTS=(8081 8082 8084 8085)

info() { echo -e "\033[1;34m[dev]\033[0m $*"; }
warn() { echo -e "\033[1;33m[dev]\033[0m $*"; }
err()  { echo -e "\033[1;31m[dev]\033[0m $*"; }

port_in_use() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -i :"$p" -sTCP:LISTEN -t >/dev/null 2>&1
  else
    (echo >/dev/tcp/127.0.0.1/"$p") >/dev/null 2>&1 && return 0 || return 1
  fi
}

find_free_port() {
  local base="$1"; local max_tries=${2:-10}
  local p=$base
  for ((i=0;i<max_tries;i++)); do
    if ! port_in_use "$p"; then echo "$p"; return 0; fi
    p=$((p+1))
  done
  echo ""; return 1
}

require_cmd() {
  local c="$1"; command -v "$c" >/dev/null 2>&1 || { err "Missing command: $c"; exit 1; }
}

# 1) Versions
require_cmd node
NODE_VER=$(node -v | sed 's/v//')
info "Node version: ${NODE_VER}"

if command -v python3 >/dev/null 2>&1; then
  PY_VER=$(python3 -V 2>&1)
  info "Python: ${PY_VER}"
else
  err "python3 not found; please install Python 3.11+"
  exit 1
fi

# 2) Ports
FRONTEND_PORT=$(find_free_port "$FRONTEND_BASE_PORT" 20 || true)
BACKEND_PORT=$(find_free_port "$BACKEND_BASE_PORT" 20 || true)

if [[ -z "$FRONTEND_PORT" || -z "$BACKEND_PORT" ]]; then
  err "Unable to find free ports near $FRONTEND_BASE_PORT/$BACKEND_BASE_PORT."
  exit 1
fi

info "Frontend port -> $FRONTEND_PORT"
info "Backend port  -> $BACKEND_PORT"

for p in "${MCP_PORTS[@]}"; do
  if port_in_use "$p"; then
    warn "MCP port $p is in use (ok if your MCP server is running)."
  fi
done

# 3) Env sync (.env.local)
ENV_LOCAL="$ROOT_DIR/.env.local"
touch "$ENV_LOCAL"
if grep -q '^NEXT_PUBLIC_API_ORIGIN=' "$ENV_LOCAL" 2>/dev/null; then
  sed -i.bak "s#^NEXT_PUBLIC_API_ORIGIN=.*#NEXT_PUBLIC_API_ORIGIN=http://localhost:$BACKEND_PORT#g" "$ENV_LOCAL" || true
else
  echo "NEXT_PUBLIC_API_ORIGIN=http://localhost:$BACKEND_PORT" >> "$ENV_LOCAL"
fi

info "Synced NEXT_PUBLIC_API_ORIGIN=http://localhost:$BACKEND_PORT into .env.local"

# 4) Node deps check
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  info "Installing node dependencies..."
  (cd "$ROOT_DIR" && npm install)
fi

# 5) Cache guidance (do not auto-delete)
if [[ -d "$ROOT_DIR/.next" ]]; then
  info "Next.js cache present (.next). Use 'npm run clean' if you need a clean build."
fi

cat << 'EOF'

Preflight complete. Suggested commands:

  Backend:
    ENVIRONMENT=development ALLOW_DEV_NOAUTH=true uvicorn backend.app.main:app --reload --port <BACKEND_PORT>

  Frontend:
    npm run dev -- -p <FRONTEND_PORT>

Replace the angle-bracketed ports above with the values printed by this script.

EOF

echo "FRONTEND_PORT=$FRONTEND_PORT"
echo "BACKEND_PORT=$BACKEND_PORT"
