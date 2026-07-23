// Installer orchestrator. M1: discovery + dry-run plan. M2 wires each step to
// real file operations. The STEPS list is the single source of truth for the
// nine-step habitat install, so front doors and docs stay in sync.
import { existsSync } from "node:fs";
import { join } from "node:path";

export const STEPS = [
  { key: "discover", title: "Discover", detail: "stack, CI, tests, existing habitat files" },
  { key: "present", title: "Present", detail: "show the plan; confirm before writing" },
  { key: "harness", title: "Harness", detail: "scaffold HARNESS.md (+ cognitive reservoir opt-in)" },
  { key: "agents", title: "Agent team", detail: "install agents; vendor sentinels project-native (role: sentinel)" },
  { key: "hooks", title: "Hooks", detail: "install sentinel-suggest.py; merge into .claude/settings.json" },
  { key: "routing", title: "Model routing", detail: "scaffold MODEL_ROUTING.md incl. sentinel rows" },
  { key: "compound", title: "Compound learning", detail: "AGENTS.md, REFLECTION_LOG.md, reflections/" },
  { key: "docs", title: "Docs & observability", detail: "docs/superpowers/ tree, observability/costs/" },
  { key: "ci", title: "CI", detail: "GitHub Actions / generic CI templates" },
];

// Files whose presence signals an existing (partial) habitat.
const PROBE = [
  "HARNESS.md",
  "MODEL_ROUTING.md",
  "CLAUDE.md",
  "AGENTS.md",
  ".claude/settings.json",
  ".claude/agents",
  "docs/superpowers",
];

export function discover(dir) {
  const found = {};
  for (const p of PROBE) found[p] = existsSync(join(dir, p));
  return found;
}

export async function runInit({ dir, dryRun }) {
  console.log(`\nai-literacy-habitat · target: ${dir}\n`);

  const found = discover(dir);
  console.log("Discovery:");
  for (const [p, present] of Object.entries(found)) {
    console.log(`  ${present ? "present" : "absent "}  ${p}`);
  }

  console.log("\nPlanned steps (full habitat):");
  for (const [i, s] of STEPS.entries()) {
    console.log(`  ${i + 1}. ${s.title.padEnd(20)} ${s.detail}`);
  }

  if (dryRun) {
    console.log("\n--dry-run: no files written.\n");
    return;
  }

  // M2 implements the write path (interactive prompts + idempotent scaffolding).
  console.log(
    "\n[M1 scaffold] The install engine is not wired to write yet. " +
    "Re-run with --dry-run to preview, or track progress in README milestones.\n"
  );
}
