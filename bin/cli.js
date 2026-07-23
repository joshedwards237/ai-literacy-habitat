#!/usr/bin/env node
// ai-literacy-habitat — one-command installer for the AI Literacy habitat.
// Zero runtime dependencies: Node stdlib only.
import { runInit } from "../src/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const HELP = `ai-literacy-habitat v${pkg.version}

Install the AI Literacy habitat (agents, sentinels, harness, hooks, model
routing, CI) into a project.

USAGE
  ai-literacy-habitat <command> [options]

COMMANDS
  init            Scaffold the habitat into the target project (interactive).
  help            Show this help.

OPTIONS
  --dir <path>    Target project directory (default: current directory).
  --dry-run       Show what would change; write nothing.
  --yes, -y       Accept defaults; skip prompts where a default exists.
  --version       Print version.
  --help, -h      Show this help.

Derived from ai-literacy-superpowers (Apache-2.0). Not affiliated. See NOTICE.`;

function parseArgs(argv) {
  const args = { _: [], dir: process.cwd(), dryRun: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") args.dir = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--version") args.version = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.version) return console.log(pkg.version);
  const cmd = args._[0];
  if (args.help || !cmd || cmd === "help") return console.log(HELP);

  switch (cmd) {
    case "init":
      await runInit({ root: ROOT, ...args });
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("ai-literacy-habitat failed:", err?.message ?? err);
  process.exitCode = 1;
});
