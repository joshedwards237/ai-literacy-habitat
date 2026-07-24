#!/usr/bin/env bash
# End-to-end installer test against a throwaway scratch repo.
#
#   bash scripts/test-scratch.sh
#
# Exercises the CLI engine the way a real user would, then asserts the habitat
# landed correctly. No network, no npm — runs the local bin/cli.js directly.
# Covers: fresh install, sentinel vendoring, hook + settings merge, idempotent
# re-run (0 writes), and --dry-run (0 writes). Cleans up after itself.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/bin/cli.js"
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/habitat-scratch.XXXXXX")"

pass=0; fail=0
ok()   { printf '  \033[32mPASS\033[0m %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail+1)); }
check(){ if eval "$2"; then ok "$1"; else bad "$1"; fi; }

cleanup() { rm -rf "$SCRATCH"; }
trap cleanup EXIT

echo "scratch repo: $SCRATCH"
git -C "$SCRATCH" init -q
git -C "$SCRATCH" config user.email test@scratch.local
git -C "$SCRATCH" config user.name "Scratch Test"

# ── 1. dry-run writes nothing ────────────────────────────────────────────────
echo; echo "[1] --dry-run leaves the tree untouched"
node "$CLI" init --dir "$SCRATCH" --yes --dry-run >/dev/null
check "no .claude/ created by dry-run" '[ ! -e "$SCRATCH/.claude" ]'
check "no HARNESS.md created by dry-run" '[ ! -e "$SCRATCH/HARNESS.md" ]'

# ── 2. real install lands the habitat ────────────────────────────────────────
echo; echo "[2] fresh install scaffolds the full habitat"
node "$CLI" init --dir "$SCRATCH" --yes >/dev/null
check "HARNESS.md exists"            '[ -f "$SCRATCH/HARNESS.md" ]'
check "MODEL_ROUTING.md exists"      '[ -f "$SCRATCH/MODEL_ROUTING.md" ]'
check ".claude/settings.json exists" '[ -f "$SCRATCH/.claude/settings.json" ]'
check "sentinel-suggest hook exists" '[ -f "$SCRATCH/.claude/hooks/sentinel-suggest.py" ]'
check "agents vendored (>=5)"        '[ "$(find "$SCRATCH/.claude/agents" -name "*.md" | wc -l)" -ge 5 ]'
check "no .agent.md leaked in"       '[ "$(find "$SCRATCH/.claude/agents" -name "*.agent.md" | wc -l)" -eq 0 ]'

SENTINELS="$(grep -rl 'role: sentinel' "$SCRATCH/.claude/agents" 2>/dev/null | wc -l | tr -d ' ')"
check "exactly 5 role:sentinel agents (found $SENTINELS)" '[ "$SENTINELS" -eq 5 ]'

check "settings.json registers sentinel-suggest" \
  'grep -q "sentinel-suggest" "$SCRATCH/.claude/settings.json"'
check "settings.json is valid JSON" \
  'node -e "JSON.parse(require(\"fs\").readFileSync(process.argv[1]))" "$SCRATCH/.claude/settings.json"'

# ── 3. idempotent re-run writes nothing new ──────────────────────────────────
echo; echo "[3] re-run is idempotent"
BEFORE="$(cd "$SCRATCH" && find . -type f | sort | xargs -I{} shasum {} 2>/dev/null | shasum)"
node "$CLI" init --dir "$SCRATCH" --yes >/dev/null
AFTER="$(cd "$SCRATCH" && find . -type f | sort | xargs -I{} shasum {} 2>/dev/null | shasum)"
check "no file content changed on re-run" '[ "$BEFORE" = "$AFTER" ]'

HOOKCOUNT="$(grep -c 'sentinel-suggest' "$SCRATCH/.claude/settings.json" || true)"
check "hook not duplicated (found $HOOKCOUNT refs)" '[ "$HOOKCOUNT" -le 2 ]'

# ── summary ──────────────────────────────────────────────────────────────────
echo
printf 'scratch test: \033[32m%d passed\033[0m, ' "$pass"
if [ "$fail" -gt 0 ]; then printf '\033[31m%d failed\033[0m\n' "$fail"; exit 1; fi
printf '0 failed\n'
