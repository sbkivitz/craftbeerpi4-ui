// Make the mockup's strike water model answers (strike-model.js, unchanged) into a module the brew-day screen's demo
// can import: cbpi4gui/src/components/brewday/strike-model.js.
//
//   node design/brewday/port-strike-model.mjs
//
// The mockup loads strike-model.js as a script, which declares SW_MODEL. The screen's demo (?demo=) shows the same
// moments with the same figures, so it carries the same answers: this file exports SW_MODEL as it is, and nothing
// else changes. Live, CraftBeerPi works the figures out itself (GET /step2/strike); the screen never uses these then.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "strike-model.js");
const OUT = join(here, "..", "..", "cbpi4gui", "src", "components", "brewday", "strike-model.js");

const text = readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
const decl = text.match(/^const SW_MODEL = /m);
if (!decl || (text.match(/^const /gm) || []).length !== 1) throw new Error("port-strike-model: strike-model.js should declare SW_MODEL alone");
const header = "// GENERATED from design/brewday/strike-model.js by design/brewday/port-strike-model.mjs - do not edit.\n"
  + "// The bench model's answers the mockup carries, for the brew-day screen's demo only (strike-demo.js).\n";
writeFileSync(OUT, header + text.replace(/^const SW_MODEL = /m, "export const SW_MODEL = "));
console.log(`wrote ${OUT}`);
