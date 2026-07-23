# ai-literacy-habitat

One command that installs and wires the complete **AI Literacy habitat** —
agents, the sentinel family, the harness, hooks, model routing, compound
learning, and CI — into any project, prompting you for the decisions that need a
human.

```bash
npx ai-literacy-habitat init
```

> **Not affiliated with Habitat-Thinking or Russ Miles.** This is an independent
> derivative of the Apache-2.0 [ai-literacy-superpowers](https://github.com/Habitat-Thinking/ai-literacy-superpowers)
> framework. See `NOTICE` and `CHANGES.md`.

## Why this exists

The upstream framework ships as a Claude Code plugin. Installing the plugin makes
its agents available *namespaced*, but it does not vendor them into a project's
`.claude/agents/`, so `/superpowers-status` reports `0 sentinels active` and the
sentinels never fire as project-native agents. This tool closes that gap and does
the rest of the project-native scaffolding a plugin install cannot: it writes into
*your* repo.

## Architecture — one engine, three front doors

```
                      ┌──────────────────────────┐
   npx ────────────►  │                          │
   curl | bash ─────► │   ai-literacy-habitat     │  ── writes into your project:
   /habitat-init ───► │   CLI engine (Node, 0-dep)│      HARNESS.md, MODEL_ROUTING.md,
   (Claude plugin)    │                          │      .claude/agents/ (sentinels vendored),
                      └──────────────────────────┘      .claude/hooks/, settings.json (merged),
                                                         docs/superpowers/, observability/, CI
```

- **CLI engine** (`bin/cli.js`, `src/`) — the source of truth for scaffolding.
  Interactive, idempotent, cross-project, testable.
- **Plugin** (`plugin/`) — a Claude Code plugin that natively provides the
  runtime artifacts and ships `/habitat-init`, which calls the CLI.
- **Bootstrap** (`install.sh`) — a `curl | bash` one-liner over the CLI for
  non-Claude-Code contexts.

## What `init` sets up (full habitat)

Discover → present plan → scaffold: `HARNESS.md`, agent team + **sentinels
vendored project-native**, `sentinel-suggest` auto-trigger hook + `settings.json`
merge, `MODEL_ROUTING.md`, compound-learning files, `docs/superpowers/` tree,
`observability/`, and CI templates. Existing files are never overwritten without
confirmation.

## Snapshot & license

`templates/habitat/` is a snapshot of ai-literacy-superpowers **v0.66.1**,
redistributed under Apache-2.0. Refresh with `npm run sync-upstream`. Licensed
under the Apache License 2.0 — see `LICENSE`, `NOTICE`, `CHANGES.md`.

## Status

Early scaffold. Milestones: **M1** repo + snapshot ✅ · M2 interactive `init` ·
M3 sentinel vendoring + hook + reservoir · M4 plugin + bootstrap · M5 test +
publish.
