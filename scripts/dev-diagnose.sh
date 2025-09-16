#!/usr/bin/env bash
set -euo pipefail

echo "== Workbench Local Diagnostics =="

has() { command -v "$1" >/dev/null 2>&1; }
try() { "$@" >/dev/null 2>&1 || true; }

echo "-- OS ----------------------------"
uname -a || true

echo "-- Node / NPM --------------------"
if has node; then node -v; else echo "node: NOT FOUND"; fi
if has npm; then npm -v; else echo "npm: NOT FOUND"; fi

echo "-- Python ------------------------"
if has python3; then python3 -V; else echo "python3: NOT FOUND"; fi

echo "-- Env (proxy) -------------------"
echo "HTTP_PROXY=${HTTP_PROXY-}"
echo "HTTPS_PROXY=${HTTPS_PROXY-}"
echo "NO_PROXY=${NO_PROXY-}"

echo "-- Loopback check ----------------"
if has ping; then ping -c 1 127.0.0.1 || true; fi

echo "-- Port listeners ----------------"
list_port() {
  local p="$1"
  if has lsof; then lsof -nPi ":$p" | sed -n '1,5p';
  elif has netstat; then netstat -an | grep ".$p ";
  else echo "(no lsof/netstat)"; fi
}
for p in 3000 3001 3002 8000 8001 8002; do
  echo "Port $p:"; list_port "$p"; echo "";
done

echo "-- Backend health probes ---------"
probe() { curl -fsS "http://127.0.0.1:$1/health" || true; }
for p in 8000 8001 8002; do echo -n "$p: "; probe "$p"; echo; done

echo "-- Frontend HEAD probes ----------"
head_probe() { curl -I --max-time 2 "http://127.0.0.1:$1" || true; }
for p in 3000 3001 3002; do echo "http://127.0.0.1:$p"; head_probe "$p"; done

echo "-- .env.local --------------------"
if [ -f .env.local ]; then sed -n '1,50p' .env.local; else echo "(no .env.local)"; fi

echo "-- Backend logs (if present) -----"
if [ -f /tmp/backend.log ]; then tail -n 60 /tmp/backend.log; else echo "(no /tmp/backend.log)"; fi

echo "== End diagnostics =="

