#!/usr/bin/env bash
# Generate the Claude Code plugin payload (plugin/{agents,commands,skills,hooks})
# from the Apache-2.0 snapshot in templates/habitat/, layer the hand-authored
# plugin extras (templates/plugin-extra/), and register the sentinel-suggest
# hook. The generated output is committed so `/plugin marketplace add` works from
# a fresh clone. Re-run after sync-upstream. Idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/templates/habitat"
EXTRA="$ROOT/templates/plugin-extra"
DST="$ROOT/plugin"

echo "build-plugin: regenerating $DST from snapshot ..."
for d in agents commands skills hooks; do
  rm -rf "${DST:?}/$d"
  cp -R "$SRC/$d" "$DST/$d"
done

# Layer hand-authored plugin-only additions (e.g. /habitat-init).
if [ -d "$EXTRA" ]; then
  for d in "$EXTRA"/*/; do
    [ -d "$d" ] || continue
    name="$(basename "$d")"
    mkdir -p "$DST/$name"
    cp -R "$d"* "$DST/$name/"
  done
fi

# Register sentinel-suggest in the plugin hooks manifest (plugin-relative paths).
node "$ROOT/scripts/patch-plugin-hooks.js"

echo "build-plugin: done."
echo "  agents:   $(find "$DST/agents" -name '*.md' | wc -l | tr -d ' ')"
echo "  commands: $(find "$DST/commands" -name '*.md' | wc -l | tr -d ' ')"
echo "  skills:   $(find "$DST/skills" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')"
echo "  hooks:    $(find "$DST/hooks/scripts" -type f | wc -l | tr -d ' ')"
