#!/bin/bash
# Repository Cleanup Script
# Date: 2025-09-16

set -euo pipefail

BACKUP_DIR=".repo_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "\U0001F9F9 Starting comprehensive repository cleanup for workbench-ui..."

# Helper to move a path into the backup directory while preserving structure
move_path() {
  local src="$1"
  if [[ ! -e "$src" ]]; then
    return
  fi
  local rel
  rel="${src#./}"
  local dest="$BACKUP_DIR/$rel"
  mkdir -p "$(dirname "$dest")"
  mv "$src" "$dest"
  echo "Moved $src -> $dest"
}

# 1. Move all temporary and backup files
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

# 2. Move AI artifacts and agent session logs
for artifact in \
  ./.roo/mcp.json.backup-* \
  ./codex-review-test.md \
  ./codex-smoke.md \
  ./logs/qc-scan-full.json \
  ./.pytest_cache \
  ./.pytest_cache/README.md \
  ./.roo/mcp.json.template \
  ./.next/package.json \
  ; do
  if [[ -e "$artifact" ]]; then
    move_path "$artifact"
  fi
done

# 3. Move one-time or generated environment files
for env_file in \
  ./.env \
  ./.env.local \
  ; do
  if [[ -e "$env_file" ]]; then
    move_path "$env_file"
  fi
done

# 4. Handle duplicates (keep newest/most complete version)
#    Retaining fly.toml.frontend as primary deploy config.
if [[ -f ./fly.toml ]]; then
  move_path ./fly.toml
fi

# 5. Consolidate fragmented code/docs placeholders (archived for review)
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

# 6. Provide summary
moved_count=$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')
echo "Cleanup complete. Files moved to backup: $moved_count"
echo "Backup directory: $BACKUP_DIR"
