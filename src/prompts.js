// Minimal interactive prompts over Node's readline. No dependencies.
// In --yes mode every prompt resolves to its default without reading stdin.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export function makePrompt({ yes = false } = {}) {
  let rl;
  const ensure = () => (rl ??= createInterface({ input: stdin, output: stdout }));

  return {
    async confirm(question, def = true) {
      if (yes) return def;
      const hint = def ? "Y/n" : "y/N";
      const a = (await ensure().question(`${question} [${hint}] `)).trim().toLowerCase();
      if (!a) return def;
      return a === "y" || a === "yes";
    },

    async input(question, def = "") {
      if (yes) return def;
      const suffix = def ? ` (${def})` : "";
      const a = (await ensure().question(`${question}${suffix}: `)).trim();
      return a || def;
    },

    async select(question, options, def = 0) {
      if (yes) return options[def];
      console.log(question);
      options.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
      const a = (await ensure().question(`Choose [${def + 1}]: `)).trim();
      const idx = a ? Number.parseInt(a, 10) - 1 : def;
      return options[Number.isInteger(idx) && idx >= 0 && idx < options.length ? idx : def];
    },

    close() {
      rl?.close();
    },
  };
}
