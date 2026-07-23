# sentinel-suggest hook

Advisory, conservative, silent auto-triggers for the AI-literacy **Sentinel**
agents. When a conversation reaches a moment where a sentinel would be valuable,
this hook injects a one-line suggestion into the assistant's context nudging it
to *consider* dispatching that sentinel. It never dispatches, never blocks,
never surfaces to the user — hooks cannot call the Agent tool, so the assistant
stays the dispatcher (which preserves the human-judgement gate).

## What fires when

Registered in `.claude/settings.json` for two events.

### `UserPromptSubmit` — classify the incoming prompt (at most one nudge)

Priority order (first match wins):

| Priority | Sentinel | Fires on (conservative signals) |
|---|---|---|
| 1 | `cost-estimator` | workflow / swarm / orchestrate / ultracode / fan-out / "many agents" — about to spend big |
| 2 | `carpaccio` | a build verb (build/implement/add/migrate/refactor/…) **and** a multi-part signal (numbered/bulleted list, ≥2 " and ", or "features/multiple/several/end-to-end") **and** prompt ≥ 60 chars (`MIN_TASK_LEN`) |
| 3 | `advocatus-diaboli` | finalise / approve / ship it / lock in / "is this right" / "should we" / "which approach" |

### `PostToolUse` (Write\|Edit) — react to spec writes

When a `docs/superpowers/specs/*.md` file is written or edited, nudge
`advocatus-diaboli` (spec mode) **and** `choice-cartographer`.

`reservoir-warden` is intentionally absent — it already has its own `Stop` hook
(`reservoir-check.sh`, from the plugin) gated on the HARNESS.md
`## Cognitive reservoir` heading.

## Tuning

Edit the regex tables at the top of `sentinel-suggest.py`:

- Loosen a table → more nudges (more false positives).
- Tighten it → fewer.
- `MIN_TASK_LEN` raises/lowers the carpaccio length floor.

To disable one sentinel, comment out its branch in `handle_prompt` /
`handle_tool`. To disable the whole hook, remove its two entries from
`.claude/settings.json`.

## Design constraints (do not break)

- **Never block, never non-zero.** Any error exits 0 with no output.
- **Advisory only.** Output is a suggestion; the assistant may ignore it.
- **Silent.** Uses `additionalContext`, not `systemMessage` — no user-facing
  chatter (the chosen default; switch to `systemMessage` if you want the user
  to see and veto each trigger).

## Test

```bash
# carpaccio nudge
echo '{"hook_event_name":"UserPromptSubmit","prompt":"build the enrollment export and add a parent portal and create the audit report"}' | python3 sentinel-suggest.py

# cost-estimator nudge
echo '{"hook_event_name":"UserPromptSubmit","prompt":"run a workflow to fan out across all the campuses"}' | python3 sentinel-suggest.py

# spec-write nudge
echo '{"hook_event_name":"PostToolUse","tool_name":"Write","tool_input":{"file_path":"docs/superpowers/specs/2026-07-23-x-design.md"}}' | python3 sentinel-suggest.py

# silent (no match)
echo '{"hook_event_name":"UserPromptSubmit","prompt":"what time is it"}' | python3 sentinel-suggest.py
```
