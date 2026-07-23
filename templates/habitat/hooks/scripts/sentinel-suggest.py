#!/usr/bin/env python3
"""Sentinel suggestion hook — advisory only, conservative, silent.

Reads a Claude Code hook event on stdin and, when the incoming prompt or a
just-written spec file matches a sentinel's *value moment*, injects an
`additionalContext` line nudging the assistant to consider dispatching that
sentinel. It never dispatches anything itself — hooks cannot call the Agent
tool — and it never blocks: any error or non-match exits 0 with no output.

Wired for two events (see .claude/settings.json):
  - UserPromptSubmit : classify the user's prompt (carpaccio / cost-estimator /
                       advocatus-diaboli). At most ONE nudge per prompt.
  - PostToolUse      : when a docs/superpowers/specs/*.md file was just written,
                       nudge advocatus-diaboli (spec mode) + choice-cartographer.

Design: conservative signals only (explicit language / real file writes), so
false positives stay rare. Tune the regex tables below. Silent by contract —
additionalContext reaches the assistant's context, not the user's transcript.

Full rationale + tuning guide: sentinel-suggest.README.md (same directory).
"""
import json
import re
import sys

# --- Conservative signal tables (edit these to tune) -----------------------

# About to spend big → ballpark first.
COST_RE = re.compile(
    r"\b(work ?flow|swarm|orchestrat\w*|ultracode|fan[-\s]?out|"
    r"parallel agents|many agents|dispatch\s+\w+\s+agents)\b",
    re.I,
)

# Task-shaped verb — necessary but not sufficient for a carpaccio nudge.
BUILD_RE = re.compile(
    r"\b(build|implement|add|create|migrat\w*|refactor\w*|integrat\w*|"
    r"set up|design|develop|rewrite)\b",
    re.I,
)

# A plan/spec/decision is being finalised, or a strong approach is asserted.
DECIDE_RE = re.compile(
    r"\b(finali[sz]e|approve|approved|ship it|lock in|sign off|go with|"
    r"is this (right|correct|ok|okay)|should we|are we sure|"
    r"which (approach|option|design))\b",
    re.I,
)

# Numbered/bulleted list line — a multi-part signal.
LIST_RE = re.compile(r"(?m)^\s*(?:\d+[.)]|[-*])\s+\S")
MULTI_WORD_RE = re.compile(r"\b(features?|multiple|several|end[-\s]to[-\s]end)\b", re.I)

SPEC_PATH_RE = re.compile(r"docs/superpowers/specs/.+\.md$")

MIN_TASK_LEN = 60  # skip short quick-asks for carpaccio (multi-part signal is the real gate)


def emit(event: str, text: str) -> None:
    """Print the hook JSON that injects `text` into the assistant's context."""
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": event,
            "additionalContext": "[sentinel-suggest] " + text,
        }
    }))


def is_multipart(prompt: str) -> bool:
    if LIST_RE.search(prompt):
        return True
    if MULTI_WORD_RE.search(prompt):
        return True
    return prompt.lower().count(" and ") >= 2


def handle_prompt(data: dict) -> None:
    prompt = data.get("prompt", "") or ""
    if not prompt.strip():
        return

    # Priority order: expensive-run > slicing > challenge. One nudge only.
    if COST_RE.search(prompt):
        emit("UserPromptSubmit",
             "This looks like it will spin up a workflow/swarm or many agents. "
             "Consider dispatching the `cost-estimator` sentinel first for a "
             "token/compute ballpark (no dollar figure until a per-model cost "
             "snapshot exists). Advisory — skip if the run is small.")
        return

    if BUILD_RE.search(prompt) and is_multipart(prompt) and len(prompt) >= MIN_TASK_LEN:
        emit("UserPromptSubmit",
             "This request is task-shaped with multiple deliverables. Consider "
             "dispatching the `carpaccio` sentinel to slice it into thin "
             "end-to-end-complete pieces before implementing. Advisory — skip "
             "if the task is already atomic.")
        return

    if DECIDE_RE.search(prompt):
        emit("UserPromptSubmit",
             "A plan/spec/decision looks like it is being finalised here. "
             "Consider dispatching the `advocatus-diaboli` sentinel to produce "
             "an objection record before locking it in. Advisory — skip for "
             "reversible or low-stakes calls.")
        return


def handle_tool(data: dict) -> None:
    if data.get("tool_name", "") not in ("Write", "Edit"):
        return
    path = (data.get("tool_input", {}) or {}).get("file_path", "") or ""
    if not SPEC_PATH_RE.search(path):
        return
    emit("PostToolUse",
         "A spec under docs/superpowers/specs/ was just written. Per the "
         "spec-first workflow, consider dispatching `advocatus-diaboli` "
         "(spec mode) for an objection record, then `choice-cartographer` "
         "to surface the silent decisions the spec implies. Advisory.")


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    event = data.get("hook_event_name", "")
    if event == "UserPromptSubmit":
        handle_prompt(data)
    elif event == "PostToolUse":
        handle_tool(data)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never let a hook error interrupt the session.
        pass
    sys.exit(0)
