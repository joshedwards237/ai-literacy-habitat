// Idempotent merge of habitat hook entries into a project's .claude/settings.json.
// Preserves existing content; adds our hooks only if an entry with the same
// command string is not already present. Re-running never duplicates.
//
// Pure functions (no fs) so they are unit-testable; the caller reads/writes.

const HABITAT_HOOKS = {
  UserPromptSubmit: [
    {
      hooks: [
        {
          type: "command",
          command: 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/sentinel-suggest.py"',
        },
      ],
    },
  ],
  PostToolUse: [
    {
      matcher: "Write|Edit",
      hooks: [
        {
          type: "command",
          command: 'python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/sentinel-suggest.py"',
        },
      ],
    },
  ],
};

function commandStrings(group) {
  // Collect every hook command string within a settings hook-group array.
  const out = [];
  for (const entry of group ?? []) {
    for (const h of entry.hooks ?? []) {
      if (typeof h.command === "string") out.push(h.command);
    }
  }
  return out;
}

// Merge HABITAT_HOOKS into `settings`, returning { settings, added }.
// `added` lists event names that gained at least one entry.
export function mergeHabitatHooks(settings) {
  const next = structuredClone(settings ?? {});
  next.hooks ??= {};
  const added = [];

  for (const [event, groups] of Object.entries(HABITAT_HOOKS)) {
    next.hooks[event] ??= [];
    const existing = new Set(commandStrings(next.hooks[event]));
    for (const group of groups) {
      const cmds = commandStrings([group]);
      const alreadyThere = cmds.every((c) => existing.has(c));
      if (!alreadyThere) {
        next.hooks[event].push(group);
        if (!added.includes(event)) added.push(event);
      }
    }
  }
  return { settings: next, added };
}

export { HABITAT_HOOKS };
