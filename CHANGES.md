# Changes from upstream

`ai-literacy-habitat` is a derivative of **ai-literacy-superpowers**
(snapshotted at **v0.66.1**, Apache-2.0). Per Apache License §4(b), this file
records significant changes relative to the upstream work.

## Added

- **Single-command interactive installer** (`npx ai-literacy-habitat init`) that
  scaffolds the full habitat into any target project — including project-native
  wiring the upstream plugin's `/superpowers-init` does not perform.
- **Project-native sentinel vendoring**: the `role: sentinel` agents (carpaccio,
  advocatus-diaboli, choice-cartographer, cost-estimator, reservoir-warden) are
  copied into the target repo's `.claude/agents/*.md`, fixing the
  "0 sentinels active" gap a bare plugin install leaves.
- **`sentinel-suggest` advisory auto-trigger hook** (UserPromptSubmit +
  PostToolUse) that nudges dispatch of the right sentinel at its value moment.
- **Multiple front doors over one engine**: a `curl | bash` bootstrap and a
  Claude Code plugin (`/habitat-init`) that both invoke the same CLI.

## Redistributed unchanged

- Snapshot of upstream `agents/`, `commands/`, `skills/`, `hooks/`, and
  scaffold `templates/` at v0.66.1, under `templates/habitat/`, redistributed
  under the Apache License, Version 2.0.

## Sync

`scripts/sync-upstream.sh` refreshes the snapshot from upstream and appends the
observed version + diff summary here. Run it deliberately; the snapshot does not
auto-update.
