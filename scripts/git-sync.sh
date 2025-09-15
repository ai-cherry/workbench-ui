#!/usr/bin/env bash
set -euo pipefail

MSG=${1:-"chore: sync"}

echo "🔍 Staging changes…"
git add -A

if git diff --cached --quiet; then
  echo "✅ Nothing to commit."
  exit 0
fi

echo "📝 Committing: $MSG"
git commit -m "$MSG"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE=${2:-origin}

echo "🚀 Pushing to $REMOTE $BRANCH…"
git push "$REMOTE" "$BRANCH"

echo "✅ Done."

