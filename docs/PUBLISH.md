# Publishing `ai-literacy-habitat` to npm

The package is publish-ready but **not yet published**. `npx ai-literacy-habitat`
returns 404 until the first publish lands. This doc is the runbook for that step.

## Pre-publish state (verified)

- Package name `ai-literacy-habitat` is **available** on the registry (404 = untaken).
- `npm pack --dry-run`: 322 files, ~510 KB packed, ~1.95 MB unpacked. No real
  secrets in the tarball — the only `secret`-matching paths are the habitat's own
  `secrets-check.sh` hook and `secrets-detection` skill.
- `npm test` (8 unit tests) + `npm run test:scratch` (13 E2E assertions) both green.
- `prepublishOnly` runs both suites, so a broken tree cannot be published.

## Prerequisites (one-time, human)

1. An npm account. `npm whoami` currently returns `ENEEDAUTH`.
2. Log in: `npm login` (or `npm adduser`). Use 2FA if enabled on the account.
3. Confirm the name is still free: `npm view ai-literacy-habitat` should 404.

## Publish (gated — requires the steps above)

```bash
cd ~/Development/personal/ai-literacy-habitat
git checkout main            # publish from the release branch, not a feature branch
git pull

npm test && npm run test:scratch   # prepublishOnly runs these too; belt + suspenders
npm pack --dry-run                 # eyeball the file list one last time

npm publish --access public        # scoped-less public package
```

`--access public` is explicit and harmless for an unscoped package; keep it so a
future rename to `@joshedwards237/…` doesn't silently publish private.

## Post-publish verification

```bash
npm view ai-literacy-habitat version         # -> 0.1.0
cd "$(mktemp -d)" && git init -q
npx ai-literacy-habitat@latest init --yes     # should scaffold the habitat
```

Then bump `version` for the next release (`npm version patch|minor`) — never
re-publish the same version; the registry rejects it.

## Rollback

`npm unpublish` is allowed only within 72 hours and only if nothing depends on
it. Prefer `npm deprecate ai-literacy-habitat@0.1.0 "reason"` + a patch release
over unpublishing.

## Plugin front door (no npm needed)

The Claude Code plugin path is independent of npm — it installs from the git repo:

```
/plugin marketplace add joshedwards237/ai-literacy-habitat
```

The `curl | bash` bootstrap also works from the repo pre-publish; only the bare
`npx ai-literacy-habitat` invocation needs the registry.
