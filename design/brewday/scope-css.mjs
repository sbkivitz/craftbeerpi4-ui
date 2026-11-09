// Make the approved mockup's stylesheet (brew-day.css, unchanged) into the
// brew-day screen's stylesheet: cbpi4gui/src/components/brewday/brewday.css.
//
//   node design/brewday/scope-css.mjs
//
// The rules themselves are not touched - the screen must look exactly like the
// mockup (Scott, 9 Nov 2026: "It is imperitive that the actual dashboard look
// identical to your proposal"). What changes is only where they apply:
//
// - Every selector gets :where(html.bd-page) in front. The screen puts that
//   class on <html> while it is open, so none of these rules reach the other
//   pages, and :where() adds nothing to a selector's weight: the same rule wins
//   here as in the mockup.
// - html and body become html.bd-page and html.bd-page body, deliberately
//   heavier, so they win over index.css's body rule. Both also get
//   touch-action:auto back: index.css sets none on html and body, which stops a
//   phone from scrolling the page at all.
//   body also gets -moz-osx-font-smoothing:auto, the mockup's default, back
//   from index.css's grayscale (Firefox on a Mac).
// - [data-layout=b] matched <html> in the mockup; the screen sets it there too.
// - The mockup's own strip (.mock, html.bare) is left out, and --mock-h is 0.
// - Its animations are renamed bd-blink, bd-march and bd-flow: names are
//   global, and another stylesheet's @keyframes of the same name would win.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "brew-day.css");
const OUT = join(here, "..", "..", "cbpi4gui", "src", "components", "brewday", "brewday.css");
const SCOPE = ":where(html.bd-page)";

function scopeSelector(sel) {
  const s = sel.trim();
  if (s.startsWith(".mock") || s.startsWith("html.bare")) return null;
  if (s === ":root") return SCOPE;
  if (s === "html") return "html.bd-page";
  if (s === "body") return "html.bd-page body";
  if (s.startsWith("[data-layout=")) return SCOPE + s;
  return `${SCOPE} ${s}`;
}

// The stylesheet is plain: rules, @media blocks holding rules, and @keyframes.
// No strings with braces, no nesting deeper than one at-rule.
function blocks(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (depth > 0 && j < text.length) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      j++;
    }
    out.push({ head, body: text.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

function rule(head, body) {
  const sels = head.split(",").map(scopeSelector).filter(Boolean);
  if (!sels.length) return "";
  let decl = body.trim().replace(ANIMATION, (m, prop, name) => `${prop}bd-${name}`);
  if (head.trim() === "html" || head.trim() === "body") decl += ";touch-action:auto";
  if (head.trim() === "body") decl += ";-moz-osx-font-smoothing:auto";
  if (head.trim() === ":root") decl = decl.replace(/--mock-h:[^;]+/, "--mock-h:0px");
  return `${sels.join(",")}{${decl}}`;
}

const KEYFRAMES = ["blink", "march", "flow"];
const ANIMATION = new RegExp(`(animation(?:-name)?:\\s*)(${KEYFRAMES.join("|")})\\b`, "g");

function convert(text) {
  const named = [...text.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]).sort();
  if (named.join() !== [...KEYFRAMES].sort().join()) throw new Error(`@keyframes changed: ${named.join(", ")}`);
  return blocks(text).map(({ head, body }) => {
    if (head.startsWith("@keyframes")) return `${head.replace(/@keyframes\s+/, "@keyframes bd-")}{${body.trim()}}`;
    if (head.startsWith("@media")) {
      const inner = blocks(body).map(b => rule(b.head, b.body)).filter(Boolean);
      return inner.length ? `${head}{\n${inner.join("\n")}\n}` : "";
    }
    return rule(head, body);
  }).filter(Boolean).join("\n");
}

const source = readFileSync(SRC, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const header = `/* GENERATED from design/brewday/brew-day.css by design/brewday/scope-css.mjs - do not edit.
   The approved mockup's rules, unchanged, applied only while the brew-day screen is open. */\n`;
writeFileSync(OUT, header + convert(source) + "\n");
console.log(`wrote ${OUT}`);
