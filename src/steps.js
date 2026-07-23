// The habitat install steps. Each export takes the shared context and performs
// its slice of the scaffold. Kept non-destructive (writeIfAbsent) except the
// settings-merge, which is idempotent by construction.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeHabitatHooks } from "./merge/settings.js";

// --- helpers ---------------------------------------------------------------

// Turn an upstream agent filename into its project-native form: strip the
// `.agent` infix so `carpaccio.agent.md` -> `carpaccio.md`, matching how a
// project's own .claude/agents/ files are named.
export function projectAgentName(name) {
  return name.replace(/\.agent\.md$/, ".md");
}

// Activate the (opt-in, commented) `## Cognitive reservoir` block in HARNESS.md.
export function uncommentReservoir(text) {
  if (/^#{1,6}\s+Cognitive reservoir/m.test(text)) {
    return { text, changed: false, note: "already active" };
  }
  const open = text.indexOf("<!-- ## Cognitive reservoir");
  if (open === -1) return { text, changed: false, note: "block not found" };
  const lineEnd = text.indexOf("\n", open);
  const close = text.indexOf("-->", open);
  if (close === -1) return { text, changed: false, note: "no closing -->" };
  const before = text.slice(0, open);
  const inner = text.slice(lineEnd + 1, close).replace(/\s+$/, "");
  const after = text.slice(close + 3).replace(/^\n/, "");
  return { text: `${before}## Cognitive reservoir\n${inner}\n${after}`, changed: true, note: "activated" };
}

const SENTINEL_ROWS = [
  "| carpaccio | Flagship | Slicing a task into end-to-end-complete pieces requires reasoning about vertical completeness and hidden coupling — a judgment-heavy sentinel. |",
  "| choice-cartographer | Flagship | Reconstructing the decisions a spec implies (including silent ones) is deep inferential reasoning; a sentinel over the decision record. |",
  "| cost-estimator | Balanced | Estimation is a structured methodology over a routing table and cost snapshot; refuses when ungrounded. |",
  "| reservoir-warden | Balanced | Counts observable proxies over the git window against fixed thresholds — structured, read-only. |",
];

// --- steps -----------------------------------------------------------------

export async function harness(ctx) {
  const { templates, dir, scaffold, prompt, dryRun, log } = ctx;
  const src = join(templates, "scaffold-templates", "HARNESS.md");
  const dest = join(dir, "HARNESS.md");
  scaffold.copyFileIfAbsent(src, dest);

  const activate = await prompt.confirm(
    "Activate the cognitive-reservoir advisory watch in HARNESS.md?",
    false,
  );
  if (!activate) return;
  const current = existsSync(dest) ? readFileSync(dest, "utf8") : readFileSync(src, "utf8");
  const { text, changed, note } = uncommentReservoir(current);
  if (changed) scaffold.writeAlways(dest, text, "reservoir");
  else log(`  skip   HARNESS.md reservoir (${note})`);
}

export function agents(ctx) {
  const { templates, dir, scaffold } = ctx;
  scaffold.copyTree(
    join(templates, "agents"),
    join(dir, ".claude", "agents"),
    (name) => ({ name: projectAgentName(name) }),
  );
}

export function hooks(ctx) {
  const { templates, dir, scaffold, log, dryRun } = ctx;
  const hookSrc = join(templates, "hooks", "scripts");
  const hookDest = join(dir, ".claude", "hooks");
  for (const f of ["sentinel-suggest.py", "sentinel-suggest.README.md"]) {
    scaffold.copyFileIfAbsent(join(hookSrc, f), join(hookDest, f));
  }
  const settingsPath = join(dir, ".claude", "settings.json");
  let existing = {};
  if (existsSync(settingsPath)) {
    try {
      existing = JSON.parse(readFileSync(settingsPath, "utf8"));
    } catch {
      log("  warn   .claude/settings.json is not valid JSON — leaving it untouched");
      return;
    }
  }
  const { settings, added } = mergeHabitatHooks(existing);
  if (added.length) scaffold.writeAlways(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "merge ");
  else log("  skip   .claude/settings.json (sentinel hooks already present)");
}

export function routing(ctx) {
  const { templates, dir, scaffold, log, dryRun } = ctx;
  const src = join(templates, "scaffold-templates", "MODEL_ROUTING.md");
  const dest = join(dir, "MODEL_ROUTING.md");
  scaffold.copyFileIfAbsent(src, dest);

  // Ensure sentinel rows exist (idempotent append).
  if (dryRun || !existsSync(dest)) return;
  let text = readFileSync(dest, "utf8");
  const missing = SENTINEL_ROWS.filter((row) => {
    const agent = row.split("|")[1].trim();
    return !new RegExp(`\\|\\s*${agent}\\s*\\|`).test(text);
  });
  if (!missing.length) {
    log("  skip   MODEL_ROUTING.md sentinel rows (present)");
    return;
  }
  // Insert after the table header separator row, else append.
  const anchor = text.match(/\|\s*Agent\s*\|.*\n\|[-\s|]+\|\n/);
  if (anchor) {
    const at = anchor.index + anchor[0].length;
    text = text.slice(0, at) + missing.join("\n") + "\n" + text.slice(at);
  } else {
    text += "\n" + missing.join("\n") + "\n";
  }
  scaffold.writeAlways(dest, text, "routing");
}

export function compound(ctx) {
  const { templates, dir, scaffold } = ctx;
  const st = join(templates, "scaffold-templates");
  scaffold.copyFileIfAbsent(join(st, "AGENTS.md"), join(dir, "AGENTS.md"));
  scaffold.copyFileIfAbsent(join(st, "REFLECTION_LOG.md"), join(dir, "REFLECTION_LOG.md"));
  scaffold.ensureDir(join(dir, "reflections", "active"));
  scaffold.writeIfAbsent(join(dir, "reflections", "active", ".gitkeep"), "");
}

export function docs(ctx) {
  const { dir, scaffold } = ctx;
  for (const sub of ["specs", "plans", "slices", "objections", "stories"]) {
    const d = join(dir, "docs", "superpowers", sub);
    scaffold.ensureDir(d);
    scaffold.writeIfAbsent(join(d, ".gitkeep"), "");
  }
}

export function observability(ctx) {
  const { dir, scaffold } = ctx;
  const d = join(dir, "observability", "costs");
  scaffold.ensureDir(d);
  scaffold.writeIfAbsent(
    join(d, ".gitkeep"),
    "Cost snapshots land here as <YYYY-MM-DD>-costs.md via /cost-capture.\n",
  );
}

export async function ci(ctx) {
  const { templates, dir, scaffold, prompt, log } = ctx;
  const st = join(templates, "scaffold-templates");
  const choice = await prompt.select(
    "Install a CI template?",
    ["GitHub Actions", "Generic CI script", "Skip"],
    2,
  );
  if (choice === "GitHub Actions") {
    scaffold.copyFileIfAbsent(join(st, "ci-github-actions.yml"), join(dir, ".github", "workflows", "harness.yml"));
  } else if (choice === "Generic CI script") {
    scaffold.copyFileIfAbsent(join(st, "ci-generic.sh"), join(dir, "scripts", "ci-harness.sh"));
  } else {
    log("  skip   CI (none selected)");
  }
}

export const WRITE_STEPS = [harness, agents, hooks, routing, compound, docs, observability, ci];
