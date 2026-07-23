---
name: habitat-init
description: Install the full AI Literacy habitat into this project — runs the ai-literacy-habitat CLI installer interactively (agents, sentinels, harness, hooks, model routing, CI).
---

# /habitat-init

Scaffold the AI Literacy habitat into the current project by running the
installer CLI. The CLI is the source of truth; this command is a convenience
front door from inside Claude Code.

## Steps

1. Confirm the target is the current project root.
2. Run a dry run first so the user sees the plan:

   ```bash
   npx ai-literacy-habitat@latest init --dry-run
   ```

3. Present the discovery + planned steps to the user. Confirm before writing.
4. Run the real install, forwarding the user's answers:

   ```bash
   npx ai-literacy-habitat@latest init
   ```

5. After it completes, verify: `.claude/agents/` contains the sentinels
   (`role: sentinel`), `.claude/settings.json` has the `sentinel-suggest` hooks,
   and `HARNESS.md` / `MODEL_ROUTING.md` exist.

## Notes

- The installer never overwrites existing files without confirmation.
- Derived from ai-literacy-superpowers (Apache-2.0); not affiliated. See NOTICE.
