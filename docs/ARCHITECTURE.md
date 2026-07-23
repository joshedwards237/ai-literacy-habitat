# Architecture & decision record

`ai-literacy-habitat` — a one-command installer that scaffolds the full AI
Literacy habitat into any project.

## Problem

The upstream framework (`ai-literacy-superpowers`) ships as a Claude Code plugin.
Enabling the plugin exposes its agents *namespaced* (`ai-literacy-superpowers:carpaccio`)
but does not vendor them into a project's `.claude/agents/`. Result:
`/superpowers-status` reports `0 sentinels active`, and no project-native wiring
(HARNESS.md, MODEL_ROUTING.md, hooks, docs tree) is done. This tool closes that
gap and packages the whole setup behind one command.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Node zero-dep CLI** is the engine | Fast `npx` cold start; the prompts we need fit stdlib `readline`; no supply-chain surface for a tool run against fresh repos. |
| D2 | **Self-contained snapshot** of upstream | Legal under Apache-2.0 (verified: stock, unmodified license, © 2026 Russ Miles). Standalone install, no runtime coupling to the plugin. |
| D3 | **One engine, three front doors** | CLI = scaffolding brain; Claude Code plugin = native runtime artifacts + `/habitat-init`; `curl \| bash` = one-liner. No logic duplicated. |
| D4 | **Full-habitat scope** | Installs the complete framework, not just sentinels. |
| D5 | **Manual upstream sync** (`scripts/sync-upstream.sh`) | Human decides when to pull upstream; snapshot never auto-updates; CHANGES.md records diffs (Apache §4b). |
| D6 | **Idempotent, non-destructive** | Re-runnable; existing files never overwritten without confirmation; `settings.json` hooks merged by command-string dedupe. |

## License compliance (Apache-2.0)

Upstream LICENSE verified as unmodified Apache 2.0 (the GitHub `NOASSERTION`
label is a classifier artifact of the appended copyright line, not a custom
term). Obligations met by this repo:

- `LICENSE` — full Apache 2.0 text (copied).
- `NOTICE` — attribution to Russ Miles / ai-literacy-superpowers + explicit
  non-affiliation (addresses the §6 trademark limit — name is nominative only).
- `CHANGES.md` — records significant modifications (§4b).
- Redistributed snapshot lives under `templates/habitat/`.

## Layout

```
bin/cli.js                 CLI entry (arg parse → runInit)
src/index.js               STEPS (9-step plan) + discover() + runInit()
src/merge/settings.js      idempotent .claude/settings.json hook merge (pure, tested)
templates/habitat/         Apache-2.0 snapshot of upstream v0.66.1 + sentinel-suggest hook
plugin/                    Claude Code plugin front door (plugin.json, /habitat-init)
.claude-plugin/            marketplace.json (installable via /plugin marketplace add)
install.sh                 curl|bash bootstrap → npx
scripts/sync-upstream.sh   refresh snapshot from upstream
```

## Milestones

- **M1** — repo skeleton, license/attribution, upstream snapshot, runnable
  discovery/dry-run CLI. *(current)*
- **M2** — interactive `init` write path: prompts, idempotent scaffolding of
  HARNESS/MODEL_ROUTING/docs/observability, `settings.json` merge.
- **M3** — sentinel vendoring (`role: sentinel` → `.claude/agents/*.md`) +
  `sentinel-suggest` hook install + cognitive-reservoir opt-in prompt.
- **M4** — plugin native artifacts + `curl|bash` bootstrap end-to-end.
- **M5** — test against a scratch repo; then publish (npm + marketplace) — gated.

## Open questions

- Final public name (trademark-safe; `ai-literacy-habitat` is descriptive +
  disclaimed, acceptable).
- Publish target: npm public registry vs `npx github:…` vs both.
- Whether to also snapshot the sibling `model-cards` / `diagnostic-legibility`
  plugins (separate versions/licenses — out of scope for M1).
