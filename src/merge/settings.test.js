import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeHabitatHooks } from "./settings.js";

test("adds hooks to an empty settings object", () => {
  const { settings, added } = mergeHabitatHooks({});
  assert.ok(settings.hooks.UserPromptSubmit.length === 1);
  assert.ok(settings.hooks.PostToolUse.length === 1);
  assert.deepEqual(added.sort(), ["PostToolUse", "UserPromptSubmit"]);
});

test("is idempotent — re-merging adds nothing", () => {
  const once = mergeHabitatHooks({}).settings;
  const { settings: twice, added } = mergeHabitatHooks(once);
  assert.equal(twice.hooks.UserPromptSubmit.length, 1);
  assert.equal(twice.hooks.PostToolUse.length, 1);
  assert.deepEqual(added, []);
});

test("preserves an existing unrelated Stop hook", () => {
  const base = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "bash ./x.sh" }] }],
    },
  };
  const { settings } = mergeHabitatHooks(base);
  assert.equal(settings.hooks.Stop.length, 1);
  assert.equal(settings.hooks.Stop[0].hooks[0].command, "bash ./x.sh");
  assert.equal(settings.hooks.UserPromptSubmit.length, 1);
});

test("does not clobber a pre-existing UserPromptSubmit entry", () => {
  const base = {
    hooks: {
      UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo hi" }] }],
    },
  };
  const { settings } = mergeHabitatHooks(base);
  // original + ours
  assert.equal(settings.hooks.UserPromptSubmit.length, 2);
  const cmds = settings.hooks.UserPromptSubmit.flatMap((e) => e.hooks.map((h) => h.command));
  assert.ok(cmds.includes("echo hi"));
  assert.ok(cmds.some((c) => c.includes("sentinel-suggest.py")));
});
