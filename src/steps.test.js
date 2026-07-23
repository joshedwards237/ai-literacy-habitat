import { test } from "node:test";
import assert from "node:assert/strict";
import { projectAgentName, uncommentReservoir } from "./steps.js";

test("projectAgentName strips the .agent infix", () => {
  assert.equal(projectAgentName("carpaccio.agent.md"), "carpaccio.md");
  assert.equal(projectAgentName("reservoir-warden.agent.md"), "reservoir-warden.md");
  assert.equal(projectAgentName("already.md"), "already.md");
});

test("uncommentReservoir activates a commented block", () => {
  const src = [
    "## Status",
    "",
    "<!-- ## Cognitive reservoir  (OPTIONAL — opt in by uncommenting)",
    "",
    "- window_hours: 8",
    "-->",
    "",
    "## Next",
  ].join("\n");
  const { text, changed, note } = uncommentReservoir(src);
  assert.equal(changed, true);
  assert.equal(note, "activated");
  assert.match(text, /^## Cognitive reservoir$/m);
  assert.match(text, /- window_hours: 8/);
  assert.ok(!text.includes("<!--"));
  assert.ok(!text.includes("-->"));
});

test("uncommentReservoir is a no-op when already active", () => {
  const src = "## Cognitive reservoir\n\n- window_hours: 8\n";
  const { changed, note } = uncommentReservoir(src);
  assert.equal(changed, false);
  assert.equal(note, "already active");
});

test("uncommentReservoir reports when block absent", () => {
  const { changed, note } = uncommentReservoir("# nothing here\n");
  assert.equal(changed, false);
  assert.equal(note, "block not found");
});
