#!/usr/bin/env bash
# Bootstrap for ai-literacy-habitat. Two ways to run:
#
#   # from a clone (works today, pre-publish):
#   bash install.sh
#
#   # one-liner once published to npm:
#   curl -fsSL https://raw.githubusercontent.com/joshedwards237/ai-literacy-habitat/main/install.sh | bash
#
# It only checks prerequisites and hands off to the Node CLI engine — the single
# source of truth. If run from inside a checkout it uses the local bin; otherwise
# it falls back to npx against the published package.
set -euo pipefail

need() { command -v "$1" >/dev/null 2>&1 || { echo "ai-literacy-habitat: missing required tool '$1'" >&2; exit 1; }; }
need node

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ai-literacy-habitat: Node >= 18 required (found $(node -v))" >&2
  exit 1
fi

# Resolve the script's own directory when invoked as a file (not via curl|bash).
SELF="${BASH_SOURCE[0]:-}"
LOCAL_BIN=""
if [ -n "$SELF" ] && [ -f "$SELF" ]; then
  SELF_DIR="$(cd "$(dirname "$SELF")" && pwd)"
  [ -f "$SELF_DIR/bin/cli.js" ] && LOCAL_BIN="$SELF_DIR/bin/cli.js"
fi

echo "ai-literacy-habitat: launching installer in $(pwd) ..."
if [ -n "$LOCAL_BIN" ]; then
  exec node "$LOCAL_BIN" init "$@"
else
  need npx
  exec npx ai-literacy-habitat@latest init "$@"
fi
