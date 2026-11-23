// Make the Figures page's mockup (design/analytics) into the page's own stylesheets, untouched where they can be:
//
//   node design/analytics/port.mjs            (writes cbpi4gui/src/components/figures)
//   node design/analytics/port.mjs <folder>   (writes there instead, to compare)
//
// It writes:
//
// - figures.css: the page's own rules, for its shadow root. The page draws inside a shadow root so the brew-day screen's
//   rules for .main, .note, .cmd and the rest (the same names, other things) can't reach it, and its rules can't reach
//   the title bar. So :root becomes :host, and the frame's rules (title bar, last event and its list, tabs, toast: the
//   brew-day screen's own, which it draws) are left out, and so are .app's, which go in figures-frame.css. A rule for
//   what the page draws under .app[data-link=lost] is written for .main[data-link=lost], which the page marks the same
//   way. Everything from the mockup's "mockup only" section on (its strip of moments, the made-up label, the views of
//   today, the sizes and the other two layouts) is left out.
// - figures-frame.css: the mockup's .app rules (one screen tall from 620 px; scrolling below 1280 × 860; room for the
//   phone's tabs), for <html data-page=figures> only.
//
// The stylesheets are kept as text (config-overrides.js), as the brew-day screen's are: the CSS pipeline would rewrite
// them.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || join(here, "..", "..", "cbpi4gui", "src", "components", "figures");
const crlf = s => s.replace(/\r\n/g, "\n");
const read = f => crlf(readFileSync(join(here, f), "utf8"));
const fail = msg => { throw new Error(`port.mjs: ${msg} - has the mockup's shape changed?`); };
const write = (name, text) => { mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, name), text); console.log(`wrote ${join(OUT, name)}`); };

const css = read("analytics.css");
const FRAME = "/* ---------- the frame:", OWN = "/* ---------- figures ---------- */", MOCK = "/* ---------- mockup only:";
for (const mark of [FRAME, OWN, MOCK]) if (css.indexOf(mark) < 0) fail(`no ${JSON.stringify(mark)} section`);
if (!(css.indexOf(FRAME) < css.indexOf(OWN) && css.indexOf(OWN) < css.indexOf(MOCK))) fail("the sections are out of order");
const base = css.slice(0, css.indexOf(FRAME));
const frame = css.slice(css.indexOf(FRAME), css.indexOf(OWN));
const own = css.slice(css.indexOf(OWN), css.indexOf(MOCK));

// the rules of a piece of CSS, at the top level or in @media, @supports and @container blocks, nested as they are:
// [{media: [the blocks' preludes, outermost first], sel, body}]
function rules(text) {
  const out = [], s = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const block = (from, media) => {
    let k = from;
    while (k < s.length) {
      const open = s.indexOf("{", k), close = s.indexOf("}", k);
      if (close >= 0 && (open < 0 || close < open)) return close + 1;
      if (open < 0) return s.length;
      const sel = s.slice(k, open).trim();
      if (/^@(media|supports|container)\b/.test(sel)) { k = block(open + 1, [...media, sel]); continue; }
      if (sel.startsWith("@keyframes")) {
        let depth = 1, p = open + 1;
        while (depth && p < s.length) { if (s[p] === "{") depth++; else if (s[p] === "}") depth--; p++; }
        out.push({ media, sel, body: s.slice(open + 1, p - 1), raw: true });
        k = p; continue;
      }
      const end = s.indexOf("}", open);
      out.push({ media, sel, body: s.slice(open + 1, end) });
      k = end + 1;
    }
    return k;
  };
  let i = 0;
  while (i < s.length) i = block(i, []) || s.length;
  return out;
}
// the rules again as CSS, each block opened once for the rules in a row that share it
const emit = list => {
  let out = "", open = [];
  for (const r of list) {
    let same = 0;
    while (same < open.length && same < r.media.length && open[same] === r.media[same]) same++;
    out += "}\n".repeat(open.length - same) + r.media.slice(same).map(m => `${m}{\n`).join("");
    open = r.media;
    out += `${r.sel}{${r.body}}\n`;
  }
  return out + "}\n".repeat(open.length);
};
const sels = sel => sel.split(",").map(x => x.trim());
// the frame's elements: the brew-day screen draws them, with its own rules, some of which the page's @media blocks
// repeat for the phone
const FRAME_EL = /^(\.app\b(?![^\s]*\s)|\.topbar\b|\.banner\b|\.brand\b|#link-t\b|\.link\b|\.clock\b|\.alloff\b|\.event\b|\.status\b|\.tabs\b|\.toast\b|\.res\b|\.logbtn\b|\.loglist\b)/;
const isFrame = x => FRAME_EL.test(x);
// .app itself (its grid, height and the phone's room under it), not what the page draws inside it
const appOnly = x => /^\.app(\[[^\]]*\])*$/.test(x);
const isApp = sel => sels(sel).every(appOnly);
// what the page draws inside .app: in the shadow root, under the page's own .main, which carries the same marks
const inApp = x => x.replace(/^\.app((?:\[[^\]]*\])*)\s+/, ".main$1 ");

const shadow = [], outer = [];
// base: the page's element defaults, which a shadow root doesn't get from the document
for (const r of rules(base)) {
  if (r.sel === "body" || r.sel.startsWith("html.bare")) continue;
  if (r.sel === "html") { shadow.push({ media: r.media, sel: ":host", body: "color-scheme:dark" }); continue; }
  if (r.sel === ":root") { shadow.push({ ...r, sel: ":host", body: r.body.replace(/--mock-h:[^;]*;?/, "").replace(/;\s*$/, "") }); continue; }
  shadow.push(r);
}
for (const r of rules(frame)) if (isApp(r.sel)) outer.push(r);
for (const r of rules(own)) {
  if (r.raw) { shadow.push(r); continue; }
  if (r.sel === ":root") { shadow.push({ ...r, sel: ":host", body: r.body.replace(/--mock-h:[^;]*;?/, "").replace(/;\s*$/, "") }); continue; }
  if (isApp(r.sel)) { outer.push(r); continue; }
  const keep = sels(r.sel).filter(x => !isFrame(x)).map(inApp);
  if (!keep.length) continue;
  shadow.push({ ...r, sel: keep.join(",") });
}
if (!outer.length) fail("no .app rules");
if (shadow.some(r => /\.mock\b|\.mockonly\b|\.view\b|\.alts\b/.test(r.sel))) fail("a mockup-only rule is outside the mockup-only section");
// the host fills the frame's fourth row, and the page's .main fills the host
shadow.unshift({ media: [], sel: ":host", body: "display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);min-width:0;min-height:0" });
const SCOPE = "html.bd-page[data-page=figures] ";
const CHEAD = "/* Generated by design/analytics/port.mjs from the Figures page's mockup (design/analytics). Don't edit by hand:\n   change the mockup and run it again. */\n";
write("figures.css", CHEAD + emit(shadow));
write("figures-frame.css", CHEAD + emit(outer.map(r => ({ ...r, sel: sels(r.sel).map(x => SCOPE + x).join(",") }))));
