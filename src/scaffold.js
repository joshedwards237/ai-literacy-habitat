// Filesystem scaffolding primitives with dry-run support and a running tally.
// Every write goes through here so the summary and --dry-run stay honest.
// Non-destructive by default: writeIfAbsent never overwrites an existing file.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";

export function makeScaffold({ dir, dryRun = false, log = console.log }) {
  const results = { created: [], skipped: [], updated: [], dirs: [] };
  const rel = (p) => relative(dir, p) || ".";

  function ensureDir(p) {
    if (!existsSync(p)) {
      if (!dryRun) mkdirSync(p, { recursive: true });
      results.dirs.push(rel(p));
      log(`  dir    ${rel(p)}/`);
    }
  }

  function writeIfAbsent(dest, content) {
    if (existsSync(dest)) {
      results.skipped.push(rel(dest));
      log(`  skip   ${rel(dest)} (exists)`);
      return false;
    }
    if (!dryRun) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, content);
    }
    results.created.push(rel(dest));
    log(`  create ${rel(dest)}`);
    return true;
  }

  // Overwrite deliberately (used by settings-merge, which is itself idempotent).
  function writeAlways(dest, content, label = "update") {
    if (!dryRun) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, content);
    }
    results.updated.push(rel(dest));
    log(`  ${label} ${rel(dest)}`);
    return true;
  }

  function copyFileIfAbsent(src, dest) {
    return writeIfAbsent(dest, readFileSync(src, "utf8"));
  }

  // Recursively copy a directory tree. `transform(name, relPath)` may return
  // null to skip a file, or { name, content } to rename/rewrite it.
  function copyTree(srcDir, destDir, transform) {
    for (const name of readdirSync(srcDir)) {
      const s = join(srcDir, name);
      if (statSync(s).isDirectory()) {
        copyTree(s, join(destDir, name), transform);
        continue;
      }
      const t = transform ? transform(name, s) : {};
      if (t === null) continue;
      const destName = t?.name ?? name;
      const content = t?.content ?? readFileSync(s, "utf8");
      writeIfAbsent(join(destDir, destName), content);
    }
  }

  return { ensureDir, writeIfAbsent, writeAlways, copyFileIfAbsent, copyTree, results, rel };
}
