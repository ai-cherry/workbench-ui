#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
TEMPLATE="$ROOT_DIR/.roo/mcp.json.template"
TARGET="$ROOT_DIR/.roo/mcp.json"
ENV_FILE="$ROOT_DIR/.env.local"

if [ ! -f "$TEMPLATE" ]; then
  echo "❌ Missing template: $TEMPLATE" >&2
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/#.*//') >/dev/null 2>&1 || true
fi

echo "🧩 Generating $TARGET from template…"

tmp=$(mktemp)
cp "$TEMPLATE" "$tmp"

vars=(GITHUB_PERSONAL_ACCESS_TOKEN APIFY_API_TOKEN BRAVE_API_KEY EXA_API_KEY)
for v in "${vars[@]}"; do
  val="${!v-}"
  # Escape slashes for sed
  esc=${val//\//\\/}
  sed -i.bak "s/\$\{$v\}/$esc/g" "$tmp"
done

mkdir -p "$ROOT_DIR/.roo"
mv "$tmp" "$TARGET"
rm -f "$tmp.bak" 2>/dev/null || true

echo "✅ Wrote $TARGET"

