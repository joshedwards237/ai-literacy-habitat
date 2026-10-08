# ai-literacy-habitat — AI onboarding

Repo: `/Users/joshuaedwards/Development/personal/ai-literacy-habitat`
Derived from `origin/main`. **Divergence: `git rev-list --left-right --count origin/main...HEAD` → `0 0`.** Working tree clean. One other remote branch exists (`origin/feat/m1-scaffold`), fully merged.

13 commits (`git rev-list --count HEAD`), 331 tracked files, 252 tracked `.md`.
All figures below were re-derived by command. See §9 for the commands.

---

## 1. What this is, and what consumes it

**The hypothesis is correct.** This is a Node zero-dependency CLI installer that
writes an AI-governance scaffold into *other* repositories. It is not a library
and nothing imports it. The 252 markdown files are almost entirely **payload**,
not documentation: a redistributed snapshot of the Apache-2.0 upstream
`ai-literacy-superpowers` framework, plus a committed, generated copy of that
snapshot shaped as a Claude Code plugin.

Three front doors, one engine (`docs/ARCHITECTURE.md` D3):

| Front door | Mechanism |
|---|---|
| `/habitat-init` (Claude Code plugin) | `plugin/commands/habitat-init.md` instructs the agent to shell out to **`npx ai-literacy-habitat@latest init`** |
| `npx ai-literacy-habitat init` | runs `bin/cli.js` from the npm registry |
| `curl \| bash` → `install.sh` | uses the local `bin/cli.js` from a checkout, else falls back to `npx …@latest` |

It is **not a submodule and not a dependency.** Install is a one-shot *copy*.
Once a consuming repo is scaffolded there is no link back — no version pin, no
upgrade channel other than re-running the CLI or the plugin's
`/harness-upgrade`.

### Exactly what `init` writes

Reproduced by `node bin/cli.js init --dir <tmp> --yes --dry-run`:
**29 files created, 1 updated, 7 directories** (CI skipped under `--yes`).

- `HARNESS.md` ← `templates/habitat/scaffold-templates/HARNESS.md`
- `MODEL_ROUTING.md` (+ 4 sentinel rows appended idempotently)
- `AGENTS.md`, `REFLECTION_LOG.md`, `reflections/active/.gitkeep`
- `.claude/agents/*.md` — **all 16 agents**, `.agent.md` infix stripped
- `.claude/hooks/sentinel-suggest.py` + its README
- `.claude/settings.json` — **the only mutation of a pre-existing file**: two hook
  entries (`UserPromptSubmit`, `PostToolUse` on `Write|Edit`) merged by
  command-string dedupe (`src/merge/settings.js`)
- `docs/superpowers/{specs,plans,slices,objections,stories}/.gitkeep`
- `observability/costs/.gitkeep`
- optionally `.github/workflows/harness.yml` **or** `scripts/ci-harness.sh`

Everything else is `writeIfAbsent` — existing files are skipped, never
overwritten (`src/scaffold.js`).

### Consuming repos found on this machine

`find ~/Development -maxdepth 4 -name HARNESS.md` → 6 non-worktree repos (plus
9 git worktrees carrying inherited copies). `AGENTS.md` appears in 11 non-worktree
repos; the extra five carry only `AGENTS.md` and were not scaffolded by this CLI.

| Repo | `template-version` in HARNESS.md | Drift vs template | `.claude/agents` |
|---|---|---|---|
| `personal/Amanuensis` | 0.57.0 | heavy (428 diff lines) | 16 |
| `personal/training-assistant` | **0.1.0** | heavy (806) | 16 |
| `personal/financial-accountability` | 0.57.0 | **4 lines — essentially pristine**, 9 unresolved `{{PLACEHOLDER}}`, untracked | 16 |
| `CHE/purchase-request-system` | 0.57.0 | moderate (131) | 16 |
| `Amenue/AMENUE-APP` | 0.57.0 | heavy (256) | 16 |
| `CHE/enrollment-2.0/enrollment-system` | **0.66.1** | heavy (684), file is *shorter* than template | **13** |

Read that table carefully:

- **Drift is the healthy state, not a defect.** The template ships as a
  placeholder document; `/harness-init` is supposed to rewrite it against the
  real stack. A repo that still matches the template has *not* been wired up —
  `financial-accountability` is that repo, and it still has 9 live
  `{{PLACEHOLDER}}` tokens and is not git-tracked.
- **Three different template generations are in the field** (0.1.0, 0.57.0,
  0.66.1). `enrollment-system` carries 0.66.1 and only 13 agents, i.e. it was
  scaffolded by something *other* than this repo — this repo's shipped
  `HARNESS.md` is stamped 0.57.0. There is no single source of truth across the
  portfolio.
- **All 16 agents are vendored, not the 5 sentinels** (confirmed in every repo
  above and in the dry-run manifest). Three documents say otherwise; see §3.

### If this repo is wrong or abandoned

The important asymmetry: **already-installed repos keep working; new and
re-running installs break.**

- **Abandoned → consuming repos are unaffected at rest.** Nothing in a scaffolded
  repo resolves back here. `.claude/agents/*.md`, `HARNESS.md`,
  `sentinel-suggest.py` are plain vendored files. They keep working indefinitely.
  What is lost is the *upgrade path*: `/harness-upgrade` and `/harness-sync` were
  designed to adopt new template content, and with three template generations
  already live and no pinned version recorded anywhere in the target repo, there
  is no way to tell which generation a given repo is owed.
- **Wrong → it propagates immediately and widely.** `/habitat-init` and the
  `install.sh` fallback both invoke `npx ai-literacy-habitat@latest`. There is no
  version pin at any call site. A bad npm publish reaches every repo that runs
  `/habitat-init` on the next invocation. The marketplace manifest is read from
  the repo's **default branch**, so `main` is the release channel — there is no
  staging ref.
- **The blast radius inside a target repo is narrow but live.** Only
  `.claude/settings.json` is edited in place, and only to register two hooks that
  run `python3 .claude/hooks/sentinel-suggest.py` on every prompt submit and on
  every `Write|Edit`. That script is the one thing this repo installs that
  executes on someone else's keystrokes. Everything else is inert markdown.
- **Known shipped defect already visible downstream.** The `REFLECTION_LOG.md`
  this installer writes points at `scripts/regenerate-reflection-log.sh`. That
  script exists in the snapshot (`templates/habitat/scripts/`) but **no install
  step copies it** — `templates/habitat/scripts/` (16 files) is never installed.
  3 of 5 scaffolded repos are missing it; one records the dangling reference in
  its own `CLAUDE.md` as a standing defect.

---

## 2. Reading order

252 markdown files group into four tiers. Only the first two are worth a human's
time.

**Tier 1 — read these (6 files, the whole repo's intent):**

1. `README.md` — the install progression and the 29-command surface
2. `docs/ARCHITECTURE.md` — D1–D6 decision record + Apache-2.0 compliance reasoning
3. `src/index.js` → `src/steps.js` → `src/scaffold.js` → `src/merge/settings.js`
   — 383 lines total; this *is* the product
4. `CHANGES.md` — Apache §4(b) record of what diverges from upstream
5. `docs/PUBLISH.md` — the npm release gate
6. `scripts/test-scratch.sh` — the only end-to-end check (13 assertions)

**Tier 2 — the 21 markdown files the installer can actually write:**

- `templates/habitat/scaffold-templates/` — `HARNESS.md` (635 lines),
  `MODEL_ROUTING.md`, `AGENTS.md`, `REFLECTION_LOG.md`. These four are what lands
  in a consuming repo. Change one and you change every future install.
- `templates/habitat/agents/*.agent.md` — 16 agents, vendored verbatim
- `templates/habitat/hooks/scripts/sentinel-suggest.README.md`

Note: `scaffold-templates/` also holds `CLAUDE.md` and `ONBOARDING.md`, which the
CLI **never** writes — they are consumed only by upstream plugin commands.

**Tier 3 — plugin payload, 105 markdown files, do not read serially:**
`templates/habitat/commands/` (28) and `templates/habitat/skills/` (75). These
reach a project only through the Claude Code plugin install, never vendored into
the repo. Read one only when debugging that specific slash command.

**Tier 4 — generated, never edit:** `plugin/{agents,commands,skills,hooks}` (141
files) is produced by `scripts/build-plugin.sh` from Tier 2/3 plus
`templates/plugin-extra/`. It is committed so `/plugin marketplace add` works from
a fresh clone. Verified in sync with the snapshot (§9 command 4); the only
differences are by design — `plugin/commands/habitat-init.md` layered from
`templates/plugin-extra/`, and `plugin/hooks/hooks.json` rewritten by
`scripts/patch-plugin-hooks.js` to plugin-relative paths.

**Nothing in this repo is stale** in the dead-file sense. There is no
`docs/archive`, no superseded spec, no orphaned milestone file. `docs/` holds
exactly two files. What looks like staleness is version skew *in the field*
(§1), not files here.

---

## 3. Non-negotiable constraints

Found in `docs/ARCHITECTURE.md`, `CHANGES.md`, `NOTICE`, and enforced in code
where noted. Nothing invented.

- **Zero runtime dependencies.** `package.json` has no `dependencies`. D1 gives
  the reason explicitly: "no supply-chain surface for a tool run against fresh
  repos." Node stdlib only, `engines.node >= 18`.
- **Non-destructive by default.** D6. Every write goes through
  `src/scaffold.js`; `writeIfAbsent` never overwrites. The two exceptions are
  deliberate and idempotent: `.claude/settings.json` (dedupe-by-command merge)
  and the `MODEL_ROUTING.md` sentinel-row append (guarded by a per-agent regex).
- **Idempotent.** Re-running `init` must write nothing and must not duplicate a
  hook. `scripts/test-scratch.sh` asserts both by content hash.
- **Never edit `plugin/` by hand.** Stated in `README.md`, in
  `scripts/build-plugin.sh`'s preamble, and in commit `1b810bb`'s NOTES.
  Edit the snapshot or `templates/plugin-extra/`, then re-run `build-plugin.sh`.
- **Upstream sync is manual, never automatic.** D5. `scripts/sync-upstream.sh` is
  human-run and must be followed by a `CHANGES.md` update.
- **Apache-2.0 obligations are load-bearing, not cosmetic.** `LICENSE` (full
  text), `NOTICE` (attribution + explicit non-affiliation, addressing the §6
  trademark limit), `CHANGES.md` (§4(b) modification record). The redistributed
  snapshot must stay under `templates/habitat/`. The upstream name is used
  nominatively only.
- **`prepublishOnly` is a hard publish gate.** `npm test && npm run test:scratch`
  — a tree that fails either suite cannot be published.
- **Releases land on `main`.** `/plugin marketplace add` reads
  `.claude-plugin/marketplace.json` from the **default branch**, and the
  `curl | bash` URL is pinned to `main`. A release that is not on `main` is not
  installable.

### Three documents describe a filter the code does not implement

`src/index.js` STEPS detail, `docs/ARCHITECTURE.md` M3, and `CHANGES.md` all say
sentinel vendoring is scoped to `role: sentinel` agents. The code
(`src/steps.js:agents`) calls `copyTree` with a transform that only renames —
**all 16 agents are vendored**, of which 5 carry `role: sentinel`
(`advocatus-diaboli`, `carpaccio`, `choice-cartographer`, `cost-estimator`,
`reservoir-warden`). Commit `fa0f676` is explicit — "vendor ALL upstream agents
project-native" — so the code is intentional and the three documents lag it.
Verified in all six consuming repos (16 agents each, except the one not
scaffolded by this CLI). **Do not "fix" the code to match the docs.**

---

## 4. How work is done

- **Branches:** development on feature branches, releases merged to `main`
  (`README.md` closing line). The one historical branch is `feat/m1-scaffold`.
- **Commit style:** conventional type prefix, then a structured body —
  `WHY: / WHAT: / IMPACT: / TEST: / NOTES:`. 11 of 13 commits follow it; the two
  that do not are one-line fixes. `TEST:` carries the actual evidence.
- **Tests:** `npm test` → `node --test`, **8 tests, 0 fail**, ~65 ms. Covers
  `mergeHabitatHooks` idempotency/non-clobber, `projectAgentName`, and
  `uncommentReservoir`.
- **End-to-end:** `bash scripts/test-scratch.sh` — 13 checks against a throwaway
  `mktemp -d` git repo (dry-run writes nothing, fresh install lands, exactly 5
  `role: sentinel` agents, settings merge valid, idempotent re-run by content
  hash, hook not duplicated). No network, no npm; runs the local `bin/cli.js`.
  *(Not run during this review — it calls `git init`/`git config`, which this
  pass was scoped away from. Its 13/13 result is quoted from commit `03eaf9a`.)*
- **CI: there is none.** `git ls-files '.github/*'` → 0, and there is no
  `.github/` directory. The repo whose job is to install CI templates into other
  repos has no CI of its own. Every quoted test result in the history is a local
  run.
- **How a change here reaches a consuming repo:**
  1. edit `src/` or `templates/habitat/scaffold-templates/`
  2. `npm run build-plugin` if `templates/habitat/{agents,commands,skills,hooks}`
     changed
  3. `npm test` (+ `test:scratch`)
  4. merge to `main` — this publishes the plugin via the marketplace manifest
  5. `npm publish` per `docs/PUBLISH.md` — **required** for `/habitat-init`, which
     calls `npx …@latest`, not the clone
  6. the target repo re-runs `/habitat-init` or `/harness-upgrade`. **There is no
     push mechanism.** Until someone re-runs it in that repo, nothing changes.

---

## 5. Dependencies and integrations

- **Runtime: none.** Zero npm dependencies by constraint.
- **Node >= 18** (`structuredClone`, `node:readline/promises`, `node:test`).
- **Python 3** on the *consuming* machine — the hooks this installer registers in
  `.claude/settings.json` invoke `python3 .claude/hooks/sentinel-suggest.py`.
  Nothing checks for it at install time.
- **Upstream `ai-literacy-superpowers`** (Apache-2.0, Habitat-Thinking) — a
  vendored snapshot, cloned by `scripts/sync-upstream.sh` at sync time only. No
  runtime coupling (D2).
- **npm registry** — `ai-literacy-habitat@latest`, the live path for
  `/habitat-init` and the `install.sh` fallback. Published at `0.1.0`.
- **Claude Code plugin marketplace** — `.claude-plugin/marketplace.json`, read
  from the GitHub default branch.
- **Git** — `scripts/test-scratch.sh` and the installed `reservoir-warden` agent
  both read git state.
- The installed `cost-estimator` / `/cost-capture` surface references provider
  dashboards. No API keys are involved anywhere; the repo holds no credentials
  (checked, §8).

---

## 6. Verification practice, and the incidents behind it

Thirteen commits is a small history, but it is not an empty one — six of the
thirteen are repairs, and each left a rule behind. These are mined from commit
bodies, not supplied.

- **`7a50031` — two load-bearing files were left untracked by the previous
  commit.** `package.json` and `install.sh` were written but never added in the
  M1 scaffold; "without package.json the npx bin does not resolve." → After a
  scaffold commit, verify the *tracked* set, not the working tree.
- **`5185f2d` — the shipped manifest pointed at a GitHub handle that did not
  exist.** A placeholder owner survived into `marketplace.json` and `install.sh`,
  i.e. into the install URL users were told to curl. → Resolve every URL in a
  manifest before publishing; a placeholder in a distribution artifact is a
  broken install, not a TODO.
- **`03eaf9a` — `npx` 404s until the first publish**, so the documented install
  path could not be exercised at all. The response was a 13-assertion scratch-repo
  harness that runs the *local* bin (no npm, no network) plus a `prepublishOnly`
  gate "so a broken tree cannot publish." → Make the E2E path independent of the
  distribution channel.
- **`c0fbe20` — the bootstrap restarted from scratch on any failure.** Fixed with
  a phase checkpoint file and resume-from-failed-phase. The commit's TEST block
  is the model to copy: fresh run (29 created, 5 sentinels), state cleaned on
  success, idempotent re-run, pre-seeded checkpoint resumes, `--restart` runs
  clean — five distinct states, not one happy path.
- **`4bc2aa6` — users hit a wall after a successful install** because
  `/harness-init` (the step that turns a placeholder `HARNESS.md` into real
  enforcement) was undocumented. → A successful install that leaves the product
  non-functional is an incomplete install; the installer now prints the next
  steps itself.
- **`c91236f` — "Users added the marketplace and stopped."** Observed behaviour:
  people ran step 1 of 3 and believed they were done, because
  "Successfully added marketplace" reads like success. → The README now leads with
  a table stating what each step does *and does not* do.

Two things the history does **not** contain, and should be treated as gaps rather
than as absent risk: no incident involving `sync-upstream.sh` (it has no recorded
successful run in any commit), and no incident involving a published-package
regression (there has only been one publish).

---

## 7. Afternoon-wasters

Each verified by running it.

1. **`npm run sync-upstream` destroys the installer.** `scripts/sync-upstream.sh`
   does `rm -rf "$DEST"` on `templates/habitat/`, then restores only the upstream
   directory names `agents commands skills hooks templates scripts` — note
   `templates`, not `scaffold-templates`. The string `scaffold-templates` appears
   **nowhere outside `src/steps.js`**, and `templates/habitat/templates/` does not
   exist. The sync preserves exactly two habitat-only files
   (`sentinel-suggest.py`, its README) and nothing else. So a sync deletes
   `HARNESS.md`, `MODEL_ROUTING.md`, `AGENTS.md`, `REFLECTION_LOG.md`, all four CI
   templates, `gitattributes` and the badge SVG. Proved by simulating it: with
   `scaffold-templates/` removed the CLI dies on step 1 with
   `ENOENT … scaffold-templates/HARNESS.md`, **exit 1** (negative control);
   intact, the same invocation exits 0 (positive control). If you must sync,
   branch first and diff `templates/habitat/` before committing.

2. **Activating the cognitive reservoir corrupts `HARNESS.md`.** The template's
   opener line is
   `` <!-- ## Cognitive reservoir  (OPTIONAL — to opt in, remove this `<!--` line and the closing `-->` below) ``
   — it contains a **backtick-quoted `-->` inside itself**.
   `uncommentReservoir` (`src/steps.js`) does `text.indexOf("-->", open)` and
   therefore matches that inner one, not the real closer. The result: the heading
   is emitted, a literal `` ` below) `` line is orphaned into the document, and
   the block's real `-->` survives as a stray line further down. Measured on the
   shipped template: 29 `-->` in, 28 out — exactly one removed, and it was the
   wrong one. `financial-accountability/HARNESS.md` carries the damage today
   (`` ` below) `` at line 594, stray `-->` at line 626).
   **The unit test passes because its hand-written fixture's opener contains no
   `-->`** — a control rebuilt from a description of the input rather than from
   the input. And `scripts/test-scratch.sh` cannot catch it either: under `--yes`
   the reservoir prompt defaults to *no*. Answer `y` and you get a malformed
   document.

3. **`--dry-run` is not non-interactive, and fails silently when piped.** Dry-run
   skips only the top-level "Proceed?" confirm; the reservoir prompt and the CI
   selector still read stdin. With stdin closed the readline promise never
   resolves, the event loop empties, and node **exits 0 after printing a single
   `create HARNESS.md` line** — steps 4–9 are never even listed. This is exactly
   what `/habitat-init` step 2 runs (`npx … init --dry-run`) to show the user the
   plan. Always pass `--yes` with `--dry-run` to get the full 29-file manifest.

4. **`git ls-files <path>` exits 0 when nothing matches**, so it cannot be used as
   an existence test — it was the first thing that misled this review about
   whether the repo has CI. Count the output, or test the directory.

5. **"Drift" in a consuming repo is usually correct.** The template is a
   placeholder document with `{{TOKENS}}`; `/harness-init` is meant to rewrite it.
   A `HARNESS.md` that still matches the template is the broken one. Diff for
   `{{[A-Z_]*}}` tokens, not for similarity to the template.

6. **`npm test` covers four pure functions.** It passes on a tree whose templates
   are deleted, whose plugin payload is stale, and whose scaffold-template paths
   are wrong. Only `scripts/test-scratch.sh` exercises the install.

---

## 8. Current state and open questions

State: `main`, clean, no divergence from `origin/main`. Published to npm at
`0.1.0`; `package.json`, `plugin.json` and `marketplace.json` all agree on
`0.1.0`. M1–M5 closed per `README.md`. Plugin payload verified in sync with the
snapshot. **No committed secrets or credentials** — the only email-shaped string
in the tracked tree is a synthetic git identity in the scratch harness.

Open, and left open:

- **`docs/ARCHITECTURE.md` "Open questions" are unresolved in writing** even
  though two were decided by action: the public name (`ai-literacy-habitat` was
  shipped), the publish target (npm, shipped), and whether to snapshot the
  sibling `model-cards` / `diagnostic-legibility` plugins (still out of scope).
- **Which upstream version is actually vendored.** `README.md`,
  `CHANGES.md` and `docs/ARCHITECTURE.md` all say **v0.66.1** — that is the
  upstream `plugin.json` version at sync time. But the shipped `HARNESS.md`
  carries `template-version: 0.57.0`, one other template carries `0.29.0`, and
  six templates carry an empty stamp. A consuming repo in the field carries
  `0.66.1`. Nothing reconciles the package version with the per-template stamps,
  and nothing records in a target repo which generation it received.
- **No upgrade story for the six scaffolded repos.** Three template generations
  are live. `/harness-upgrade` exists as a plugin command; whether it can
  reconcile a heavily-drifted `HARNESS.md` is untested here.
- **`scripts/sync-upstream.sh` has never been run successfully** in recorded
  history, and §7 item 1 says why it would not survive one.
- **Should this repo run its own CI?** It ships four CI templates and installs
  none for itself. A GitHub Actions job running `npm test` + `test-scratch.sh`
  would have caught nothing in §7 — but a job that ran the install with the
  reservoir prompt answered `y` would have caught item 2.
- **`index.js` calls `STEPS` "the single source of truth for the nine-step
  install."** There are 9 `STEPS` entries and 8 `WRITE_STEPS`; two write steps
  (`docs`, `observability`) share one `STEPS` entry, and nothing asserts the two
  lists correspond. Harmless today; it is how the `role: sentinel` doc/code gap
  (§3) stayed invisible.
- **`financial-accountability` is scaffolded, untracked, placeholder-filled and
  carries the reservoir corruption.** Someone should decide whether that repo is
  live.

---

## 9. Five-command orientation

Each was executed against this tree and exits 0 on the healthy state.

```bash
cd /Users/joshuaedwards/Development/personal/ai-literacy-habitat

# 1. Divergence from the release channel. Expect "0	0".
git rev-list --left-right --count origin/main...HEAD

# 2. Unit suite. Expect "# pass 8", "# fail 0".
npm test 2>&1 | grep -E '^# (tests|pass|fail)'

# 3. The complete install manifest, without writing anything.
#    --yes is REQUIRED: without it the dry run blocks on a prompt and, when
#    stdin is closed, exits 0 after one line. Expect "29 created, 1 updated".
D=$(mktemp -d); node bin/cli.js init --dir "$D" --yes --dry-run | tail -2; rm -rf "$D"

# 4. Is the committed plugin payload still generated from the snapshot?
#    agents/ and skills/ must match byte-for-byte; commands/ and hooks/ differ
#    by design (habitat-init.md, patched hooks.json) so they are excluded.
diff -rq templates/habitat/agents plugin/agents \
  && diff -rq templates/habitat/skills plugin/skills \
  && echo "plugin payload in sync with snapshot"

# 5. Which repos this one has written into, and which generation they carry.
for h in $(find ~/Development -maxdepth 4 -name HARNESS.md -not -path '*/node_modules/*' -not -path '*/worktrees*/*'); do
  printf '%-60s %s  agents=%s\n' "$h" \
    "$(grep -m1 -o 'template-version: [0-9.]*' "$h" || echo 'template-version: ?')" \
    "$(ls "$(dirname "$h")/.claude/agents" 2>/dev/null | wc -l | tr -d ' ')"
done
```

Commands fixed during this pass:

- Command 4 was first written as `diff -rq templates/habitat/commands
  plugin/commands`, which **exits 1 on the healthy tree** because
  `habitat-init.md` is a by-design addition. Narrowed to the two directories that
  must match exactly.
- Command 3 was first run without `--yes` and produced a one-line plan while
  exiting 0 — the failure mode in §7 item 3. `--yes` is now mandatory in the
  recipe.
- Command 5 originally used `find … | wc -l`. `find` (like `git ls-files <path>`)
  **exits 0 on no match**, so neither can serve as an existence test; the command
  now prints per-repo evidence instead of a bare count.
