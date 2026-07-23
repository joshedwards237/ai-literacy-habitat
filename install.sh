#!/usr/bin/env bash
# curl | bash bootstrap for ai-literacy-habitat.
#
#   curl -fsSL https://raw.githubusercontent.com/joshedwards237/ai-literacy-habitat/main/install.sh | bash
#
# It only checks prerequisites and hands off to the CLI engine via npx, so the
# single source of truth stays the Node installer — not this shell.
set -euo pipefail

need() { command -v "$1" >/dev/null 2>&1 || { echo "ai-literacy-habitat: missing required tool '$1'" >&2; exit 1; }; }

need node
need npx

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ai-literacy-habitat: Node >= 18 required (found $(node -v))" >&2
  exit 1
fi

echo "ai-literacy-habitat: launching installer in $(pwd) ..."
exec npx ai-literacy-habitat@latest init "$@"
