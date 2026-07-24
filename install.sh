#!/usr/bin/env bash
# ai-literacy-habitat bootstrap.
#
#   # from a clone (works today):
#   bash install.sh
#
#   # one-liner once published to npm:
#   curl -fsSL https://raw.githubusercontent.com/joshedwards237/ai-literacy-habitat/main/install.sh | bash
#
# The bootstrap runs in phases and checkpoints each one to a state file in the
# target directory. If a run fails partway, re-running resumes from the failed
# phase instead of starting over. Pass --restart to clear the checkpoint and run
# clean. All other flags (--dir, --dry-run, --yes) pass through to the CLI.
set -euo pipefail

# ── colour ───────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  BOLD="$(tput bold)"; DIM="$(tput dim)"; RESET="$(tput sgr0)"
  RED="$(tput setaf 1)"; GREEN="$(tput setaf 2)"; YELLOW="$(tput setaf 3)"
  BLUE="$(tput setaf 4)"; CYAN="$(tput setaf 6)"
else
  BOLD=""; DIM=""; RESET=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""
fi

section() { printf '\n%s%s━━ %s %s%s\n' "$BOLD" "$CYAN" "$1" "$(printf '━%.0s' $(seq 1 $((60 - ${#1}))))" "$RESET"; }
step()    { printf '  %s▸%s %s\n' "$BLUE" "$RESET" "$1"; }
ok()      { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()    { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die()     { printf '\n  %s✗ %s%s\n' "$RED" "$1" "$RESET" >&2; exit 1; }
note()    { printf '    %s%s%s\n' "$DIM" "$1" "$RESET"; }

# ── args: peel --restart and --dir, forward the rest ─────────────────────────
TARGET="$(pwd)"
RESTART=0
FORWARD=()
while [ $# -gt 0 ]; do
  case "$1" in
    --restart) RESTART=1; shift ;;
    --dir) TARGET="$2"; FORWARD+=("--dir" "$2"); shift 2 ;;
    --dir=*) TARGET="${1#--dir=}"; FORWARD+=("$1"); shift ;;
    *) FORWARD+=("$1"); shift ;;
  esac
done

STATE="$TARGET/.habitat-install.state"
[ "$RESTART" -eq 1 ] && rm -f "$STATE"
done_phase() { [ -f "$STATE" ] && grep -qx "$1" "$STATE"; }
mark()       { echo "$1" >>"$STATE"; }

printf '%s%sai-literacy-habitat%s  bootstrap\n' "$BOLD" "$CYAN" "$RESET"
note "target: $TARGET"
if [ -f "$STATE" ]; then
  warn "resuming — checkpoint found ($(wc -l <"$STATE" | tr -d ' ') phase(s) already done)"
  note "run with --restart to start clean"
fi

# ── phase 1: preflight ───────────────────────────────────────────────────────
section "1/4  preflight"
if done_phase preflight; then
  ok "preflight (cached)"
else
  step "checking node"
  command -v node >/dev/null 2>&1 || die "missing required tool 'node' — install Node >= 18"
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$NODE_MAJOR" -ge 18 ] || die "Node >= 18 required (found $(node -v))"
  ok "node $(node -v)"
  step "checking git"
  command -v git >/dev/null 2>&1 && ok "git present" || warn "git not found — fine, but the target should be a repo"
  mark preflight
fi

# ── phase 2: locate engine ───────────────────────────────────────────────────
section "2/4  locate engine"
SELF="${BASH_SOURCE[0]:-}"
LOCAL_BIN=""
if [ -n "$SELF" ] && [ -f "$SELF" ]; then
  SELF_DIR="$(cd "$(dirname "$SELF")" && pwd)"
  [ -f "$SELF_DIR/bin/cli.js" ] && LOCAL_BIN="$SELF_DIR/bin/cli.js"
fi
if [ -n "$LOCAL_BIN" ]; then
  ok "local engine: $LOCAL_BIN"
  RUN=(node "$LOCAL_BIN")
else
  command -v npx >/dev/null 2>&1 || die "no local checkout and 'npx' not found — install npm or run from a clone"
  ok "using published package via npx"
  RUN=(npx ai-literacy-habitat@latest)
fi
mark_once() { done_phase "$1" || mark "$1"; }
mark_once engine

# ── phase 3: install ─────────────────────────────────────────────────────────
section "3/4  install habitat"
if done_phase install; then
  ok "install (cached) — re-run is idempotent, skipping"
else
  step "running: ${RUN[*]} init ${FORWARD[*]:-}"
  note "the installer is idempotent; safe to re-run if it stops"
  if "${RUN[@]}" init "${FORWARD[@]:-}"; then
    ok "habitat scaffolded"
    mark install
  else
    printf '\n'
    warn "install phase failed — nothing partial to clean (writes are idempotent)"
    note "fix the cause above, then re-run: bash install.sh ${FORWARD[*]:-}"
    note "it will resume from this phase (preflight is cached)"
    exit 1
  fi
fi

# ── phase 4: verify ──────────────────────────────────────────────────────────
section "4/4  verify"
MISS=0
for f in HARNESS.md .claude/agents .claude/settings.json; do
  if [ -e "$TARGET/$f" ]; then ok "$f"; else warn "missing: $f"; MISS=1; fi
done
if [ "$MISS" -eq 0 ]; then
  SENT="$(grep -rl 'role: sentinel' "$TARGET/.claude/agents" 2>/dev/null | wc -l | tr -d ' ')"
  ok "sentinels vendored: $SENT"
  mark verify
fi

# ── done ─────────────────────────────────────────────────────────────────────
if [ "$MISS" -eq 0 ]; then
  rm -f "$STATE"
  printf '\n%s%s✓ habitat installed%s  %s\n' "$BOLD" "$GREEN" "$RESET" "$TARGET"
  section "next steps"
  printf '  %s1.%s Open this project in %sClaude Code%s\n' "$BOLD" "$RESET" "$BOLD" "$RESET"
  printf '  %s2.%s %s/superpowers-status%s   %ssee what is active (confirm 5 sentinels)%s\n' "$BOLD" "$RESET" "$CYAN" "$RESET" "$DIM" "$RESET"
  printf '  %s3.%s %s/harness-init%s         %sdiscover your stack + wire real enforcement%s\n' "$BOLD" "$RESET" "$CYAN" "$RESET" "$DIM" "$RESET"
  printf '                          %s(the scaffolded HARNESS.md is generic)%s\n' "$DIM" "$RESET"
  printf '  %s4.%s %s/assess%s               %sbaseline your AI-literacy level + README badge%s\n' "$BOLD" "$RESET" "$CYAN" "$RESET" "$DIM" "$RESET"
  printf '  %s5.%s %s/reflect%s              %scapture learnings after your first task%s\n' "$BOLD" "$RESET" "$CYAN" "$RESET" "$DIM" "$RESET"
  printf '\n'
else
  printf '\n'
  warn "install finished with warnings — checkpoint kept at $STATE"
  exit 1
fi
