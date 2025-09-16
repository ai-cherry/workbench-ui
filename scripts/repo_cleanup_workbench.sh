#!/bin/bash
# Repository Cleanup Script
# Date: 2025-09-16

set -euo pipefail

BACKUP_DIR=".repo_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "\U0001F9F9 Starting comprehensive repository cleanup for workbench-ui..."

move_path() {
  local src="$1"
  if [[ ! -e "$src" ]]; then
    return
  fi
  local rel="${src#./}"
  local dest="$BACKUP_DIR/$rel"
  mkdir -p "$(dirname "$dest")"
  mv "$src" "$dest"
  echo "Moved $src -> $dest"
}

find . \
  -path "./node_modules" -prune -o \
  -path "./.venv" -prune -o \
  -path "./backend/.venv" -prune -o \
  -path "./$BACKUP_DIR" -prune -o \
  -type f \
  \( -name "*.tmp" -o -name "*.temp" -o -name "*.bak" -o -name "*.backup" -o -name "*~" -o -name "*.old" \) \
  -print0 | while IFS= read -r -d '' path; do
    move_path "$path"
  done

for artifact in \
  ./.roo/mcp.json.backup-* \
  ./codex-review-test.md \
  ./codex-smoke.md \
  ./logs/qc-scan-full.json \
  ./.pytest_cache \
  ./.roo/mcp.json.template \
  ./.next/package.json \
  ; do
  if [[ -e "$artifact" ]]; then
    move_path "$artifact"
  fi
done

for env_file in \
  ./.env \
  ./.env.local \
  ; do
  if [[ -e "$env_file" ]]; then
    move_path "$env_file"
  fi
done

if [[ -f ./fly.toml ]]; then
  move_path ./fly.toml
fi

for doc in \
  ./ARCHITECTURE.md \
  ./SOPHIA_SYSTEM_ARCHITECTURE.md \
  ./SETUP_GUIDE.md \
  ./QUICK_START.md \
  ; do
  if [[ -f "$doc" ]]; then
    move_path "$doc"
  fi
done

moved_count=$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')
echo "Cleanup complete. Files moved to backup: $moved_count"
echo "Backup directory: $BACKUP_DIR"
