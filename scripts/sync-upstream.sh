#!/usr/bin/env bash
# Refresh templates/habitat/ from upstream ai-literacy-superpowers.
#
# Deliberate, human-run sync (not automatic). Clones upstream at a ref, replaces
# the snapshot, records the version, and reminds you to update CHANGES.md per
# Apache License §4(b). Preserves habitat-only additions (e.g. sentinel-suggest).
set -euo pipefail

UPSTREAM="https://github.com/Habitat-Thinking/ai-literacy-superpowers.git"
REF="${1:-main}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/templates/habitat"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "sync-upstream: cloning $UPSTREAM @ $REF ..."
git clone --depth 1 --branch "$REF" "$UPSTREAM" "$TMP/up" >/dev/null 2>&1
SRC="$TMP/up/ai-literacy-superpowers"
VERSION="$(node -p "require('$SRC/.claude-plugin/plugin.json').version" 2>/dev/null || echo unknown)"

# Preserve habitat-only files that live inside the snapshot tree.
KEEP="$TMP/keep"; mkdir -p "$KEEP"
for f in hooks/scripts/sentinel-suggest.py hooks/scripts/sentinel-suggest.README.md; do
  [ -f "$DEST/$f" ] && { mkdir -p "$KEEP/$(dirname "$f")"; cp "$DEST/$f" "$KEEP/$f"; }
done

echo "sync-upstream: replacing snapshot (v$VERSION) ..."
rm -rf "$DEST"
mkdir -p "$DEST"
for d in agents commands skills hooks templates scripts; do
  [ -d "$SRC/$d" ] && cp -R "$SRC/$d" "$DEST/$(basename "$d")"
done
# Restore habitat-only files.
( cd "$KEEP" && find . -type f -print0 | while IFS= read -r -d '' f; do
    mkdir -p "$DEST/$(dirname "$f")"; cp "$f" "$DEST/$f"; done )

echo "sync-upstream: snapshot now at v$VERSION."
echo "  -> Update CHANGES.md with the new version and any behavioural diffs (Apache §4b)."
