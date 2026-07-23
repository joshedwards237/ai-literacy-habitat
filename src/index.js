// Installer orchestrator. discover -> present -> confirm -> write steps -> summary.
// STEPS is the single source of truth for the nine-step habitat install so
// front doors and docs stay in sync.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { makePrompt } from "./prompts.js";
import { makeScaffold } from "./scaffold.js";
import { WRITE_STEPS } from "./steps.js";

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

export async function runInit({ root, dir, dryRun, yes }) {
  const log = console.log;
  log(`\nai-literacy-habitat · target: ${dir}${dryRun ? "  (dry run)" : ""}\n`);

  const found = discover(dir);
  log("Discovery:");
  for (const [p, present] of Object.entries(found)) {
    log(`  ${present ? "present" : "absent "}  ${p}`);
  }

  log("\nPlanned steps (full habitat):");
  for (const [i, s] of STEPS.entries()) log(`  ${i + 1}. ${s.title.padEnd(20)} ${s.detail}`);

  const prompt = makePrompt({ yes });
  try {
    if (!dryRun) {
      const go = await prompt.confirm("\nProceed and write these into the project?", true);
      if (!go) {
        log("\nAborted — nothing written.\n");
        return;
      }
    }

    const scaffold = makeScaffold({ dir, dryRun, log });
    const templates = join(root, "templates", "habitat");
    const ctx = { root, dir, templates, scaffold, prompt, dryRun, yes, log };

    log("");
    for (const step of WRITE_STEPS) {
      // eslint-disable-next-line no-await-in-loop
      await step(ctx);
    }

    const { created, skipped, updated, dirs } = scaffold.results;
    log(
      `\nSummary: ${created.length} created, ${updated.length} updated, ` +
      `${skipped.length} skipped, ${dirs.length} dirs.${dryRun ? " (dry run — nothing written)" : ""}\n`,
    );
    if (!dryRun) {
      log("Next: open the project in Claude Code and run /superpowers-status to confirm sentinels are active.\n");
    }
  } finally {
    prompt.close();
  }
}
