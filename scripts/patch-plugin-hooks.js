#!/usr/bin/env node
// Register the sentinel-suggest hook in the generated plugin/hooks/hooks.json,
// using plugin-relative paths (${CLAUDE_PLUGIN_ROOT}). Idempotent: skips events
// that already reference the script. Run by scripts/build-plugin.sh.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS = join(ROOT, "plugin", "hooks", "hooks.json");
const CMD = 'python3 ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/sentinel-suggest.py';

const ADD = {
  UserPromptSubmit: { hooks: [{ type: "command", command: CMD }] },
  PostToolUse: { matcher: "Write|Edit", hooks: [{ type: "command", command: CMD }] },
};

const data = JSON.parse(readFileSync(HOOKS, "utf8"));
data.hooks ??= {};

let changed = false;
for (const [event, group] of Object.entries(ADD)) {
  data.hooks[event] ??= [];
  const present = data.hooks[event].some((g) =>
    (g.hooks ?? []).some((h) => h.command === CMD),
  );
  if (!present) {
    data.hooks[event].push(group);
    changed = true;
    console.log(`patch-plugin-hooks: registered sentinel-suggest on ${event}`);
  }
}

if (changed) {
  writeFileSync(HOOKS, `${JSON.stringify(data, null, 2)}\n`);
} else {
  console.log("patch-plugin-hooks: already registered, no change");
}
