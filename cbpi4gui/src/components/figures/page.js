// The Figures page.
//
// Brewery figures learned from past brews: a row per brew, a column per figure (HLT heating, strike water, mash rests,
// grain absorption, the boil kettle), each column's foot a small PID window with what the brews measured over what is set
// now, and USE, BACK TO and LEAVE OUT where a setting takes the figure. A tap on a cell opens that brew day's graph under
// its row. The Figures mockup (design/analytics) is this page: graph(), strip(), foot(), ledger(), evidence(), headLine(),
// pick(), render()'s scrolling and the presses are its analytics.js, writing the same markup, styled by its own
// stylesheet (figures.css, made from the mockup's by design/analytics/port.mjs).
//
// What is different from the mockup:
// - It sits in the brew-day screen's frame (screen.js with page "figures"): the live title bar, last event and tabs, with
//   FIGURES lit. It draws in a shadow root on the frame's host, so the brew-day screen's rules for .main, .note, .cmd and
//   the rest (the same names for other things) can't reach it, nor its rules the title bar.
// - The brews and figures are CraftBeerPi's, worked out on the Pi from its logs and BrewScribe: GET /figures, read as the
//   page opens, when the connection comes back, on each "figures" topic and after its own commands, whose answers carry
//   them. Each figure's state (use, in_use, one, disagree, ...) is CraftBeerPi's; the mockup works it out itself.
// - An opened brew's graph is GET /figures/brews/{id}?figure=<figure>, read as it opens and kept for going back to it.
// - USE, BACK TO and LEAVE OUT are POST /figures/{figure}/use, /back and /out. A refusal (409) changes nothing: its figures
//   take the page's place and a note under the window says why. No answer in 5 s, or another error, says so at the
//   button, as Settings does.
// - An older CraftBeerPi, without /figures (404), gets the head and the words saying it needs an update.
// - Every time is on CraftBeerPi's clock, as the logs are stamped, and times of day follow CLOCK_FORMAT.
import { call } from "../brewday/api";
// As text, exactly as written (config-overrides.js): figures.css for the shadow root; figures-frame.css, the mockup's .app
// rules (one screen tall from 1280 × 860, scrolling below it, room for the phone's tabs), for the document, where they
// apply only while <html> has data-page=figures
import FIGURES_CSS from "./figures.css";
import FRAME_CSS from "./figures-frame.css";

/* GET /figures: CraftBeerPi works the brews out from every past brew's logs, about 40 s on a PC and minutes on a Pi the
   first time, then from what it kept in well under a second. A core from 4.7.7.post64 answers within 3 s whatever, saying
   when it's still working (working: true) with the last brews it worked out, or none the very first time; an older one
   answers only when it has them. Either way the page waits patiently, saying so, and gives up on one read only after
   READ_MS. A brew's graph is read from the logs too, given GRAPH_MS */
const READ_MS = 600000;
const GRAPH_MS = 60000;
/* how long the first read goes before the head says CraftBeerPi is working the figures out */
const PATIENT_MS = 5000;
/* while CraftBeerPi says it's still working the brews out (core 4.7.7.post64), how often the page asks again */
const POLL_MS = 5000;
/* USE, BACK TO and LEAVE OUT */
const CMD_MS = 5000;
/* how long a note under a window stays */
const NOTE_MS = 6000;
const PAUSED = "No connection. Controls are paused.";
/* what the mockup didn't draw: the head's TRY AGAIN, an opened brew's graph while it's read or when it didn't come, and
   LEAVE OUT waiting or failed, in the page's own colours */
const EXTRA_CSS = `
.gwin .evwait{margin:0;padding:34px 4px 30px;font:500 16px/1.4 var(--sans);color:var(--text-2)}
.gwin .evwait.bad{color:var(--alarm-ink)}
.quiet.failed{flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;padding:5px 14px;border:2px solid var(--alarm);background:var(--fault-bg)}
.quiet small{display:block;font:500 13px/1.1 var(--cond);letter-spacing:.04em;text-transform:none;color:var(--alarm-ink)}
`;

/* ---------- the page: one at a time, as the brew-day screen ---------- */
let host = null, sr = null, env = {}, gen = 0, timers = [], off = [];
/* D: CraftBeerPi's last answer to GET /figures; load: where reading it stands ("reading", "ok", "failed" with why, "old"
   for a CraftBeerPi without it) */
let D = null, load = {s: "reading", why: ""}, reading = false, again = false;
/* CFG: what the page takes from CraftBeerPi's settings and state */
let CFG = {connected: null, h24: false, brewery: "", unit: "F", kettles: [], strike: null, topicAt: null};
let st = null;
/* an opened brew's graph, by brew and figure: {s: "reading" | "ok" | "failed", data, why, end}; the last few kept */
let EV = new Map();
const EV_KEEP = 12;
const $ = (s, r = sr) => r.querySelector(s), $$ = (s, r = sr) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { if (g === gen && st) fn(); }, ms); timers.push(t); return t; };
const log = (what, res, tone) => env.frame && env.frame.log(what, res, tone);
const say = (text, urgent) => env.frame && env.frame.say(text, urgent);
const num = x => (x == null || x === "" ? NaN : Number(x));
const fin = x => Number.isFinite(num(x));

function fresh() {
  st = {open: null, focus: null, pick: "hlt", busy: null, outBusy: null, fail: null, outFail: null, note: null, link: "ok",
    scrollOpen: false, fontsAligned: false, own: []};
}

/* ---------- clock and words ---------- */
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const Mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NB = "\u00a0";
const pad2 = n => String(n).padStart(2, "0");
const DT = t => new Date(t * 1000);
/* a time of day on CraftBeerPi's clock, by CLOCK_FORMAT: "9:59 PM" (AM or PM kept with its time) or "21:59" */
const hm = t => {
  const d = DT(t), h = d.getHours(), m = pad2(d.getMinutes());
  return CFG.h24 ? `${pad2(h)}:${m}` : `${h % 12 || 12}:${m}${NB}${h < 12 ? "AM" : "PM"}`;
};
/* a graph's clock label: "10 PM" on the hour, "10:15" between, or "22:00" */
const tick = t => {
  const d = DT(t), h = d.getHours(), m = d.getMinutes();
  if (CFG.h24) return `${pad2(h)}:${pad2(m)}`;
  return m === 0 ? `${h % 12 || 12}${NB}${h < 12 ? "AM" : "PM"}` : `${h % 12 || 12}:${pad2(m)}`;
};
const day = t => { const d = DT(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const dayShort = t => { const d = DT(t); return `${d.getDate()} ${Mon[d.getMonth()]}`; };
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const pct = x => Math.round(x * 100);
const mins = x => (x >= 60 ? String(Math.round(x)) : f1(x));
/* a temperature as a target: 152, 66.5 */
const tT = x => String(Math.round(num(x) * 10) / 10);
const cel = () => String((D && D.unit) || CFG.unit || "F").toUpperCase().startsWith("C");
const deg = () => (cel() ? "°C" : "°F");
const volU = () => (D && D.vol_unit) || (cel() ? "L" : "gal");
const massU = () => (D && D.mass_unit) || (cel() ? "kg" : "lb");
const boilPt = () => (cel() ? 100 : 212);
const brewery = () => (D && D.brewery) || CFG.brewery || "CraftBeerPi";
const simulated = () => !!(D && D.simulated);

/* ---------- the figures, in the order of a brew day ---------- */
/* the strip's ends, where CraftBeerPi doesn't send them */
const DOMAIN = {hlt: () => [0.7, 1.0], strike: () => [0.45, 1.0], mash: () => [0, 1.5],
  grain: () => (volU() === "L" ? [0.5, 1.3] : [0.06, 0.16]), boil: () => (cel() ? [0, 2] : [0, 3.5])};
const NONE = {
  hlt: {pump_on: "the HLT heated the mash too", not_heated: "the HLT wasn't heated", no_water: "BrewStart didn't record its water",
    no_logs: "no logs for this day"},
  strike: {no_grain: "no grain in the simulated tun", no_forecast: "no forecast kept for it"},
  mash: {no_rest: "no rest", stopped: "stopped before its rest", no_logs: "no logs for this day"},
  grain: {no_brewscribe: "BrewScribe isn't installed", no_volumes: "no volumes in BrewScribe", no_levels: "no HLT level before the sparge",
    no_grain_weight: "no grain weight in the recipe"},
  boil: {no_boil: "no boil", stopped: c => (fin(c.at) ? `stopped at ${Math.round(c.at)} ${deg()}` : "stopped before the boil"), no_logs: "no logs for this day"}
};
const noneWhy = (fid, c) => { const w = (NONE[fid] || {})[c.none]; return typeof w === "function" ? w(c) : w || String(c.none || "none").replace(/_/g, " "); };
const cellOf = (b, fid) => (b && b.cells && b.cells[fid]) || {none: "none"};
const FIGS = [
  {id: "hlt", name: "HLT heating", for: "for BrewStart's ready-by time", short: "HLT", fmt: v => pct(v), unit: () => "%", use: true,
    cell(c) { return {v: pct(c.eff), u: "%", s: `${f1(c.rate)} ${deg()} a min · ${f1(c.volume)} ${volU()}`}; }},
  {id: "strike", name: "Strike water", for: "for the strike water box's forecast", short: "STRIKE", fmt: v => pct(v), unit: () => "%", use: true,
    cell(c) { const d = fin(c.off) ? num(c.off) : c.landed - (c.lo + c.hi) / 2; return {v: f1(c.landed), u: deg(), s: `forecast ${f1(c.lo)}–${f1(c.hi)} · ${f1(Math.abs(d))} ${d >= 0 ? "over" : "under"} its middle`}; }},
  {id: "mash", name: "Mash rests", for: "PID_HERMS on the Mash Tun", short: "MASH", fmt: v => f1(v), unit: () => deg(), nothing: true,
    cell(c) {
      const rs = c.rests || [], dev = Math.max(0, ...rs.map(r => num(r.held) || 0)), over = Math.max(0, ...rs.map(r => num(r.over) || 0));
      const targets = [...new Set(rs.map(r => tT(r.target)))].join(", "), n = rs.length;
      return {v: `±${f1(dev)}`, u: deg(), s: `${n === 1 ? "rest" : n + " rests"} at ${targets} · came ${f1(over)} over`};
    }},
  {id: "grain", name: "Grain absorption", for: "for BrewStart's water", short: "GRAIN", fmt: v => v.toFixed(2), unit: () => `${volU()}/${massU()}`, use: true,
    cell(c) { return {v: num(c.per).toFixed(3), u: `${volU()}/${massU()}`, s: `${f1(c.held)} ${volU()} held by ${f1(c.grain)} ${massU()}`}; }},
  {id: "boil", name: "Boil kettle", for: "nothing plans with this yet", short: "BOIL", fmt: v => f1(v), unit: () => `${deg()}/min`, info: true,
    cell(c) { return {v: f1(c.rate), u: `${deg()}/min`, s: `${Math.round(c.from)} → ${boilPt()} ${deg()} in ${mins(c.minutes)} min`}; }}
];
const FIG = id => FIGS.find(F => F.id === id);
const brews = () => (D && Array.isArray(D.brews) ? D.brews : []);
const brewOf = id => brews().find(b => b.id === id);
/* a figure as CraftBeerPi sent it, with its dots: every brew with the figure, left out or not. Without a list, the dots
   are the brews' cells (a mash rest each) */
function figOf(id) {
  const g = Object.assign({state: "none"}, (D && D.figures && D.figures[id]) || {});
  if (!Array.isArray(g.values)) {
    g.values = [];
    brews().forEach(b => {
      const c = cellOf(b, id);
      if (c.none) return;
      if (id === "mash") (c.rests || []).forEach(r => g.values.push({brew: b.id, v: num(r.over) || 0, out: false, target: r.target}));
      else if (id !== "strike") g.values.push({brew: b.id, v: num(id === "hlt" ? c.eff : id === "grain" ? c.per : c.rate), out: false});
    });
  }
  g.values = g.values.filter(x => x && fin(x.v));
  if (!Array.isArray(g.domain) || g.domain.length !== 2) g.domain = DOMAIN[id]();
  return g;
}
const counted = g => g.values.filter(x => !x.out);
const nBrews = g => (fin(g.n) ? num(g.n) : new Set(counted(g).map(x => x.brew)).size);
const isOut = (fid, bid) => figOf(fid).values.some(x => x.brew === bid && x.out);
const loHi = g => { const v = counted(g).map(x => x.v); return [fin(g.lo) ? num(g.lo) : Math.min(...v), fin(g.hi) ? num(g.hi) : Math.max(...v)]; };
/* the setting the figure would change was set by USE: its BACK TO stands beside USE */
const inUse = g => !!(g.set && g.set.since != null);
/* what CraftBeerPi plans with now, in the window: [the figure, its unit, the line under it, none] */
function setOf(F, g) {
  const s = g.set || null, since = s && s.since != null ? `since ${dayShort(s.since)}` : null;
  if (F.id === "hlt") {
    const v = s && fin(s.value) ? num(s.value) : 0.9;
    return [String(pct(v)), "%", since || (!s || s.built_in || s.value == null ? "built in" : "in Settings")];
  }
  if (F.id === "strike") {
    if (s && fin(s.value)) return [String(pct(s.value)), "%", since || "measured"];
    const lo = s && fin(s.low) ? num(s.low) : 0.45, hi = s && fin(s.high) ? num(s.high) : 1.0;
    return [`${pct(lo)}–${pct(hi)}`, "%", "not measured yet"];
  }
  if (F.id === "mash") return s && fin(s.value) ? [tT(s.value), deg(), "DeltaTemp"] : ["– –", "", "not PID_HERMS", true];
  if (F.id === "grain") return s && fin(s.value) ? [num(s.value).toFixed(2), `${volU()}/${massU()}`, since || "in Settings"] : ["– –", "", "not set", true];
  return ["– –", "", "none", true];
}
/* the setting as it was before USE, for BACK TO's words */
function wasOf(F, g) {
  const s = g.set || {};
  if (F.id === "hlt") return s.was == null ? {label: "BACK TO 90 %", small: "built in", words: "90 % (built in)", short: "90 %"} : {label: `BACK TO ${pct(s.was)} %`, small: "as it was", words: `${pct(s.was)} %`, short: `${pct(s.was)} %`};
  if (F.id === "strike") {
    const w = s.was || {}, lo = fin(w.low) ? pct(w.low) : 45, hi = fin(w.high) ? pct(w.high) : 100;
    return {label: `BACK TO ${lo}–${hi} %`, small: "not measured", words: `${lo}–${hi} % (not measured)`, short: `${lo}–${hi} %`};
  }
  const w = fin(s.was) ? num(s.was).toFixed(2) : "0.12";
  return {label: `BACK TO ${w}`, small: `${volU()}/${massU()}, as it was`, words: `${w} ${volU()}/${massU()}`, short: w};
}
/* what USE sends and says */
function offerOf(F, g) {
  const v = g.use && fin(g.use.value) ? num(g.use.value) : num(g.measured);
  if (F.id === "grain") return {label: `USE ${v.toFixed(2)}`, small: `${volU()}/${massU()} as grain absorption`, value: v, words: `${v.toFixed(2)} ${volU()}/${massU()}`};
  return {label: `USE ${pct(v)} %`, small: F.id === "hlt" ? "as BrewStart's efficiency" : "in the strike water box", value: v, words: `${pct(v)} %`};
}
/* the setting's name in the LOG, and what it holds now in words */
const SETTING = {hlt: "BrewStart's efficiency", strike: "Strike water box: the tun's steel warmed at once", grain: "Grain absorption"};
function nowWords(F, g) {
  const s = g.set || {};
  if (F.id === "hlt") return s.built_in || !fin(s.value) ? "90 % (built in)" : `${pct(s.value)} %`;
  if (F.id === "strike") return fin(s.value) ? `${pct(s.value)} %` : `${pct(fin(s.low) ? s.low : 0.45)}–${pct(fin(s.high) ? s.high : 1)} % (not measured)`;
  return fin(s.value) ? `${num(s.value).toFixed(2)} ${volU()}/${massU()}` : "blank";
}
function still(F, g) {
  const s = g.set || {};
  if (F.id === "hlt") return `BrewStart's efficiency did not change. It is still ${nowWords(F, g)}.`;
  if (F.id === "strike") return `The strike water box's tun steel did not change. It is still ${fin(s.value) ? `${pct(s.value)} %, measured` : `${pct(fin(s.low) ? s.low : 0.45)}–${pct(fin(s.high) ? s.high : 1)} %, not measured`}.`;
  return `Grain absorption did not change. It is still ${nowWords(F, g)}.`;
}
/* the newest brew's grain, for grain absorption's words */
const newestGrain = () => { for (const b of brews()) { const c = cellOf(b, "grain"); if (!c.none && fin(c.grain)) return num(c.grain); } return null; };
/* the strike water box's forecast for the loaded recipe, at the strike in force: [name, lo, hi] or null */
function strikeLands() {
  const s = CFG.strike, a = s && s.answer, r = s && s.recipe;
  if (!a || !r || !r.name || !Array.isArray(a.forecasts)) return null;
  const f = a.forecasts.find(x => Array.isArray(x.for) && x.for.includes("planned")) || a.forecasts[0];
  return f && Array.isArray(f.lo) && Array.isArray(f.hi) && fin(f.lo[0]) && fin(f.hi[0]) ? [r.name, num(f.lo[0]), num(f.hi[0])] : null;
}
function verdictUse(F, g) {
  const m = num(g.measured), s = g.set || {};
  if (inUse(g)) {
    if (F.id === "hlt") return `BrewStart plans with <b>${pct(s.value)} %</b>; the brews now measure ${pct(m)} %.`;
    if (F.id === "strike") return `The strike water box forecasts with <b>${pct(s.value)} %</b>; the landings now measure ${pct(m)} %.`;
    return `BrewStart's water allows <b>${num(s.value).toFixed(2)} ${volU()}</b> for each ${massU() === "kg" ? "kilo" : "pound"} of grain; the brews now measure ${m.toFixed(2)}.`;
  }
  if (F.id === "hlt") {
    const at = fin(s.value) ? num(s.value) : 0.9, longer = Math.round((at / m - 1) * 100);
    return `BrewStart plans with <b>${pct(at)} %</b>: heating runs ${longer} % ${longer >= 0 ? "longer" : "shorter"}, inside its 10 min spare.`;
  }
  if (F.id === "strike") {
    const near = counted(g).map(x => cellOf(brewOf(x.brew), "strike")).filter(c => !c.none && fin(c.fit_lo) && fin(c.fit_hi))
      .map(c => Math.abs(c.landed - (num(c.fit_lo) + num(c.fit_hi)) / 2));
    const n = counted(g).length;
    return `The tun's steel the strike warms at once.${near.length ? ` With ${pct(m)} %, all ${n} landings fall within ${f1(Math.max(...near))} ${deg()} of the forecast's middle.` : ""}`;
  }
  const at = fin(s.value) ? num(s.value) : 0.12, lb = newestGrain(), high = fromFill(g) ? ` ${HIGH}` : "";
  if (lb == null) return `At ${at.toFixed(2)}, BrewStart's water allows for more than the grain holds.${high}`;
  const d = (at - m) * lb;
  return `At ${at.toFixed(2)}, BrewStart's water is <b>${f1(Math.abs(d))} ${volU()}</b> ${d >= 0 ? "more" : "less"} than ${f1(lb)} ${massU()} of grain holds.${high}`;
}
/* grain absorption's strike is the HLT's fill less its level before the sparge, so whatever the HLT loses in between
   counts as strike: said while any brew counted found its strike that way */
const HIGH = "This may read slightly high: the HLT's losses count as strike.";
const fromFill = g => counted(g).some(x => cellOf(brewOf(x.brew), "grain").strike_from === "hlt_fill");
function verdictInUse(F, g) {
  // "It was" only where USE set it: a setting typed by hand to the figure has no earlier value kept
  const s = g.set || {}, w = wasOf(F, g), was = inUse(g) ? ` It was ${w.short}.` : "";
  if (F.id === "hlt") return `BrewStart plans with <b>${pct(s.value)} %</b>, what the brews measured.${was}`;
  if (F.id === "strike") {
    const l = strikeLands();
    return l ? `The strike water box forecasts with <b>${pct(s.value)} %</b>: ${esc(l[0])} lands <b>${f1(l[1])}–${f1(l[2])} ${deg()}</b>.`
      : `The strike water box forecasts with <b>${pct(s.value)} %</b>, what the landings measured.`;
  }
  return `BrewStart's water allows <b>${num(s.value).toFixed(2)} ${volU()}</b> for each ${massU() === "kg" ? "kilo" : "pound"} of grain.${was}`;
}
function noneVerdict(F, g) {
  if (F.id === "strike") {
    if (g.working) return "Working out the tun's steel from the landings: a few minutes.";
    if (simulated()) return "Nothing to compare: the simulated tun has no grain (its Grain_Kg is 0).";
    return "No landings yet: the strike water box keeps its forecast as the malt goes in.";
  }
  if (F.id === "grain") {
    if (D && D.brewscribe === "none") return "No volumes: BrewScribe isn't installed.";
    if (simulated()) return "No volumes yet: BrewScribe has no finished brew on this simulator.";
    return "No volumes yet: BrewScribe has no finished brew with them.";
  }
  return "No brews to measure yet.";
}
/* why a greyed USE can't be used, said under its window when it's tapped (The Say Why Rule) */
function whyGrey(F, g) {
  if (st.link === "lost") return PAUSED;
  if (working()) return `${WORKING_BREWS}: USE waits until it has them.`;
  if (F.id === "hlt" && g.why_not === "brewstart_old") return "This BrewStart can't take a figure from past brews: it always plans with 90 %.";
  if (g.why_not === "no_plant") return "The strike water helper isn't there to take it: the strike water box needs it.";
  if (g.state === "one") return "One brew so far: USE waits for a second that agrees with it.";
  if (g.state === "disagree") return "The brews disagree, so there's no one figure to use. Leave out the odd one, or wait for more brews.";
  return "";
}

/* ---------- a brew in words ---------- */
const COUNT = {2: "Two", 3: "Three", 4: "Four", 5: "Five"};
const VNAME = {hlt: "HLT", mash: "Mash tun", boil: "Boil kettle"};
function what(b) {
  if (b.name) return String(b.name);
  const rests = (b.rests || []).filter(fin), U = deg();
  let s = "";
  if (rests.length) {
    const same = rests.every(r => tT(r) === tT(rests[0]));
    s = same ? (rests.length === 1 ? `A rest at ${tT(rests[0])} ${U}` : `${COUNT[rests.length] || rests.length} rests at ${tT(rests[0])} ${U}`)
      : `Rests at ${rests.map(tT).join(", ")} ${U}`;
  }
  if (b.boil === "done") s = s ? `${s}; a boil` : "A boil";
  else if (b.boil === "stopped") s = s ? `${s}; boil kettle to ${Math.round(b.boil_at)} ${U}` : `Boil kettle to ${Math.round(b.boil_at)} ${U}`;
  if (!s && Array.isArray(b.auto) && b.auto.length) s = b.auto.map(a => `${VNAME[a.vessel] || a.vessel} AUTO at ${tT(a.target)} ${U}, by hand`).join("; ");
  return s || "A brew day";
}

/* ---------- drawing a day graph in a PID window ---------- */
function niceStep(span) {
  for (const s of [2, 5, 10, 20, 25, 50]) if (span / s <= 6) return s;
  return 100;
}
function graph(o) {
  const W = o.w || 1000, H = o.h || 210, L = 40, R = 10, T = 24, B = 24, OUTH = 12;
  const t0 = o.t0, t1 = o.t1, pts = o.series.filter(([t, v]) => t >= t0 && t <= t1 && Number.isFinite(v));
  const svs = (o.sv || []).filter(([, v]) => v > 0);
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
  if (!pts.length) { lo = 60; hi = 70; }
  svs.forEach(([t, v]) => { if (t <= t1) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  (o.hbands || []).forEach(h => { lo = Math.min(lo, h.lo); hi = Math.max(hi, h.hi); });
  if (hi - lo < 8) { const c = (hi + lo) / 2; lo = c - 4; hi = c + 4; }
  const step = niceStep(hi - lo);
  lo = Math.floor((lo - 1) / step) * step; hi = Math.ceil((hi + 1) / step) * step;
  const px = t => L + (t - t0) / (t1 - t0) * (W - L - R);
  const py = v => T + (hi - v) / (hi - lo) * (H - T - B - OUTH);
  let s = "";
  for (let v = lo; v <= hi + 0.001; v += step) {
    const y = py(v).toFixed(1);
    s += `<path class="g-grid" d="M${L} ${y}H${W - R}"/><text class="g-lab" x="4" y="${(+y + 4).toFixed(1)}">${v}</text>`;
  }
  const span = (t1 - t0) / 60, every = span <= 100 ? 15 : span <= 260 ? 30 : 60;
  for (let t = Math.ceil(t0 / (every * 60)) * every * 60; t <= t1; t += every * 60) {
    const x = px(t).toFixed(1);
    s += `<path class="g-grid" d="M${x} ${T}V${H - B}"/><text class="g-lab" x="${x}" y="${H - 6}" text-anchor="middle">${tick(t)}</text>`;
  }
  (o.hbands || []).forEach(hb => {
    const y0 = py(hb.hi), y1 = py(hb.lo);
    s += `<rect class="g-hband" x="${L}" y="${y0.toFixed(1)}" width="${W - L - R}" height="${Math.max(2, y1 - y0).toFixed(1)}"/><text class="g-hbandlab" x="${W - R - 4}" y="${(y0 - 4).toFixed(1)}" text-anchor="end">${esc(hb.label)}</text>`;
  });
  (o.bands || []).forEach((b, i) => {
    const x0 = px(Math.max(t0, b.t0)), x1 = px(Math.min(t1, b.t1));
    s += `<rect class="g-band" x="${x0.toFixed(1)}" y="${T}" width="${Math.max(2, x1 - x0).toFixed(1)}" height="${(H - T - B).toFixed(1)}"/>`;
    if (b.label) s += `<text class="g-bandlab" x="${(x0 + 5).toFixed(1)}" y="${T + 30 + (i % 2) * 14}">${esc(b.label)}</text>`;
  });
  // gaps in the log: longer than 3 minutes, or than three of the readings' usual spacing where they are thinned further
  const gaps = pts.slice(1).map((p, i) => p[0] - pts[i][0]).sort((a, z) => a - z), usual = gaps.length ? gaps[gaps.length >> 1] : 60;
  const GAP = Math.max(180, 3 * usual);
  let d = "", prev = null;
  pts.forEach(([t, v]) => {
    if (prev && t - prev[0] > GAP) s += `<rect class="g-gap" x="${px(prev[0]).toFixed(1)}" y="${T}" width="${(px(t) - px(prev[0])).toFixed(1)}" height="${(H - T - B).toFixed(1)}"/>`;
    d += `${!prev || t - prev[0] > GAP ? "M" : "L"}${px(t).toFixed(1)} ${py(v).toFixed(1)}`;
    prev = [t, v];
  });
  if (svs.length && o.sv) {
    let sd = "";
    o.sv.forEach(([t, v], i) => {
      const tn = i + 1 < o.sv.length ? o.sv[i + 1][0] : t1;
      if (v > 0 && tn > t0 && t < t1) {
        const a = px(Math.max(t, t0)), b2 = px(Math.min(tn, t1)), y = py(v);
        sd += `M${a.toFixed(1)} ${y.toFixed(1)}H${b2.toFixed(1)}`;
      }
    });
    s += `<path class="g-sv" d="${sd}"/>`;
  }
  if (o.out && o.out.length) {
    let od = "";
    const yb = H - B;
    o.out.forEach(([t, v], i) => {
      const tn = i + 1 < o.out.length ? o.out[i + 1][0] : t1;
      if (v > 0 && tn > t0 && t < t1) {
        const a = px(Math.max(t, t0)), b2 = px(Math.min(tn, t1)), hh = OUTH * Math.min(100, v) / 100;
        od += `M${a.toFixed(1)} ${yb}h${(b2 - a).toFixed(1)}v${-hh.toFixed(1)}h${-(b2 - a).toFixed(1)}Z`;
      }
    });
    s += `<path class="g-out" d="${od}"/><text class="g-lab" x="${W - R - 2}" y="${H - B - 2}" text-anchor="end">OUT</text>`;
  }
  s += `<path class="g-pv" d="${d}"/>`;
  (o.marks || []).forEach(([t, n]) => {
    if (t < t0 || t > t1 || !n) return;
    const x = px(t);
    s += `<path class="g-mark" d="M${x.toFixed(1)} ${T + 16}V${H - B}"/><rect class="g-tagbox" x="${(x - 8).toFixed(1)}" y="${T + 1}" width="16" height="15" rx="3"/><text class="g-marktag" x="${x.toFixed(1)}" y="${T + 13}" text-anchor="middle">${esc(n)}</text>`;
  });
  let lastX = -1e9, row = 0;
  (o.entries || []).forEach(([t, label]) => {
    if (t < t0 || t > t1) return;
    const x = px(t); row = x - lastX < 150 ? row + 1 : 0; lastX = x;
    const y = T + 52 + row * 16;
    s += `<path class="g-entry" d="M${x.toFixed(1)} ${y - 6}l5 5-5 5-5-5z"/><text class="g-entrylab" x="${(x + 8).toFixed(1)}" y="${y + 3}">${esc(label)}</text>`;
  });
  const last = pts[pts.length - 1];
  if (last) s += `<circle class="g-dot" cx="${px(last[0]).toFixed(1)}" cy="${py(last[1]).toFixed(1)}" r="2.5"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "")}">${s}</svg>`;
}
const keyLine = o => `<ul class="key"><li><i style="background:var(--pv)"></i>${o.vessel} temperature</li>${o.sv ? `<li><i style="background:var(--sv)"></i>target</li>` : ""}${o.out ? `<li><i style="background:rgb(255 123 28/.6);height:8px"></i>element</li>` : ""}<li><i style="background:rgb(28 87 150/.6);height:8px;outline:1px solid var(--active-edge)"></i>where the figure comes from</li>${o.entries ? `<li><i style="background:var(--text);width:8px;height:8px;transform:rotate(45deg)"></i>BrewScribe's readings</li>` : ""}${o.marks ? `<li>numbers: steps</li>` : ""}${o.nomarks ? `<li>no step marks: this run's steps weren't kept${o.notargets ? ", nor its targets (logged from 15 Nov)" : ""}</li>` : ""}</ul>`;
/* the whole ledger on one screen needs a window at least 1280 wide and 860 tall; smaller, one figure at a time */
const oneScreen = () => window.innerWidth >= 1280 && window.innerHeight >= 860;
/* graphs are drawn at the width they're shown, so their labels keep their size */
const graphW = () => {
  const w = window.innerWidth;
  if (!oneScreen()) return Math.max(300, w - 2 * (w <= 700 ? 12 : 20) - 44);
  return Math.max(600, w - 2 * 20 - Math.min(440, Math.max(300, w * 0.26)) - 60);
};
const gwin = (title, o) => `<div class="gwin"><h3>${esc(title)}</h3>${graph(Object.assign({w: graphW(), h: window.innerWidth <= 700 ? 170 : 178}, o))}${keyLine(o)}</div>`;

/* ---------- the evidence for one brew and one figure ---------- */
const VESSEL = {hlt: ["Hot liquor tank", "HLT"], mash: ["Mash tun", "MASH"], boil: ["Boil kettle", "BOIL"]};
const STAGE = {strike_water: "HLT FILLED", sparge_water: "SPARGE", pre_boil: "PRE-BOIL", post_boil: "POST-BOIL", first_runnings: "FIRST RUNNINGS", mash_end: "MASH END"};
const series = x => (x && Array.isArray(x.t) && Array.isArray(x.v) ? x.t.map((t, i) => [num(t), x.v[i] == null ? NaN : num(x.v[i])]) : null);
/* the graph's marks from CraftBeerPi's answer for a brew and a figure, and the bands' labels from the brew's cell */
function graphOf(b, F, ev, extra) {
  const c = cellOf(b, F.id), U = deg(), vid = ev.vessel || (F.id === "hlt" ? "hlt" : F.id === "boil" ? "boil" : "mash");
  const target = series(ev.target), out = series(ev.element);
  const rd = Array.isArray(ev.readings) && ev.readings.length ? ev.readings.map(([t, stage, v]) => [num(t), `${STAGE[stage] || String(stage).toUpperCase().replace(/_/g, " ")} ${f1(v)} ${volU()}`]) : null;
  const marks = Array.isArray(ev.steps) ? ev.steps.map(([t, n]) => [num(t), n]) : null;
  const str = Array.isArray(ev.stretches) ? ev.stretches : [];
  let labels = [];
  if (!c.none) {
    if (F.id === "hlt") labels = [`MEASURED HERE: ${f1(c.from)} → ${f1(c.to)} ${U} IN ${mins(c.minutes)} MIN`];
    else if (F.id === "mash") labels = (c.rests || []).map(r => `${tT(r.target)} ${U} ±${f1(num(r.held) || 0)}`);
    else if (F.id === "strike") labels = [`LANDED ${f1(c.landed)}`];
    else if (F.id === "grain") labels = ["STRIKE IN TO PRE-BOIL OUT"];
    else labels = [`MEASURED HERE: ${Math.round(c.from)} → ${boilPt()} ${U} IN ${mins(c.minutes)} MIN`];
  }
  const o = {t0: num(ev.t0), t1: num(ev.t1), series: series(ev.temp) || [], vessel: VESSEL[vid][1],
    sv: target && target.some(([, v]) => v > 0) ? target : null, out: out && out.length ? out : null,
    bands: str.map((x, i) => ({t0: num(x.t0), t1: num(x.t1), label: labels[i] || ""})),
    marks, entries: rd, nomarks: !marks, notargets: !marks && !target};
  if (ev.forecast && fin(ev.forecast.lo) && fin(ev.forecast.hi)) o.hbands = [{lo: num(ev.forecast.lo), hi: num(ev.forecast.hi), label: `FORECAST ${f1(ev.forecast.lo)}–${f1(ev.forecast.hi)} ${U}`}];
  return [VESSEL[vid][0], Object.assign(o, extra)];
}
function evidence(b, F) {
  const c = cellOf(b, F.id), U = deg(), V = volU(), sim = b.simulator != null ? !!b.simulator : simulated();
  const out = isOut(F.id, b.id), key = `${b.id}|${F.id}`, ev = EV.get(key);
  const title = `${day(b.start)} · ${esc(what(b))}`;
  const vtitle = (VESSEL[F.id === "hlt" ? "hlt" : F.id === "boil" ? "boil" : "mash"])[0];
  /* the graph: CraftBeerPi's readings for the day, read as the brew opens */
  let graphs;
  if (!ev || ev.s === "reading") graphs = `<div class="gwin"><h3>${esc(vtitle)}</h3><p class="evwait" role="status">Reading this brew day…</p></div>`;
  else if (ev.s === "failed") graphs = `<div class="gwin"><h3>${esc(vtitle)}</h3><p class="evwait bad" role="alert">This brew day's readings didn't come: ${esc(ev.why)}. Tap the row again to try.</p></div>`;
  else {
    let label;
    if (F.id === "hlt") label = c.none ? `Hot liquor tank on ${day(b.start)}.` : `Hot liquor tank on ${day(b.start)}: ${f1(c.from)} to ${f1(c.to)} ${U} in ${mins(c.minutes)} minutes.`;
    else if (F.id === "strike") label = c.none ? `Mash tun on ${day(b.start)}.` : `Mash tun at dough-in on ${day(b.start)}: forecast ${f1(c.lo)} to ${f1(c.hi)}, landed ${f1(c.landed)} ${U}.`;
    else if (F.id === "grain") label = c.none ? `Mash tun on ${day(b.start)}.` : `Mash tun on ${day(b.start)}, with BrewScribe's volumes.`;
    else label = `${vtitle} on ${day(b.start)}.`;
    const [t, o] = graphOf(b, F, ev.data, {label});
    graphs = gwin(t, o);
  }
  let work = "";
  if (F.id === "hlt") {
    if (!c.none) {
      const planned = num(c.planned), took = num(c.minutes), rig = c.planned_by === "brewstart" && fin(c.ready_by);
      const plan = !fin(planned) ? "" : rig
        ? `<dt>BrewStart</dt><dd>planned ${mins(planned)} min at 90 %; it took ${mins(took)}, so the water was hot ${f1(fin(c.early) ? num(c.early) : 10 - (took - planned))} min before ${hm(c.ready_by)}, not 10</dd>`
        : `<dt>BrewStart</dt><dd>would plan ${mins(planned)} min at 90 %; it took ${mins(took)}, ${f1(took - planned)} min more</dd>`;
      work = `<h3>${pct(c.eff)} % of the element's power reached the water<small>${title}</small></h3>
          <dl><dt>Heated</dt><dd>${f1(c.from)} → ${f1(c.to)} ${U} in ${mins(took)} min, ${f1(c.rate)} ${U} a minute</dd>
          <dt>Water</dt><dd>${f1(c.volume)} ${V}${sim ? ", the simulated HLT's Volume" : ", BrewStart's water"}${fin(c.watts) ? ` · ${Math.round(c.watts)} W element` : ""}</dd>
          ${plan}
          <dt>Wort pump</dt><dd>off${sim ? " until the band ends" : ""}, so the coil drew next to no heat</dd></dl>
          ${sim ? `<p>The simulated HLT holds ${f1(c.volume)} ${V} whatever BrewStart's water says, so this says nothing about the rig.</p>` : ""}`;
    } else {
      const why = {pump_on: "The wort pump ran through the HERMS coil while the HLT heated, so the mash drew heat as it went: this heat-up says how fast the two heat together, not the HLT alone.",
        not_heated: "The HLT wasn't heated on this brew.",
        no_water: "BrewStart didn't record the water it heated, so there's nothing to work the figure out from.",
        no_logs: NO_LOGS}[c.none] || "This heat-up isn't part of the figure.";
      work = `<h3>Not part of this figure<small>${title}</small></h3><p>${why}</p>`;
    }
  } else if (F.id === "mash") {
    if (!c.none && (c.rests || []).length) {
      const rows = c.rests.map(r => `<dt>${tT(r.target)} ${U}</dt><dd>${mins(num(r.minutes) || 0)} min within ${f1(num(r.held) || 0)} ${U} · came ${f1(num(r.over) || 0)} over${fin(r.last_degree) ? ` · last degree in ${f1(r.last_degree)} min` : ""}</dd>`).join("");
      const ups = (c.steps_up || []).filter(x => fin(x.rate)).map(x => `<dt>Step up</dt><dd>${tT(x.from)} → ${tT(x.to)} ${U} at ${f1(x.rate)} ${U} a minute</dd>`).join("");
      const dt = figOf("mash").set, dtw = dt && fin(dt.value) ? `${tT(dt.value)} ${U} now` : "as it is now";
      work = `<h3>Each rest, as it held<small>${title}</small></h3><dl>${rows}${ups}</dl>${c.rests.some(r => num(r.over) >= 0.8) ? `<p>A smaller DeltaTemp (${dtw}) comes in gentler but steps up slower. That trade isn't measured, so there's nothing to USE: it's yours to try.</p>` : ""}`;
    } else work = `<h3>No rest on this brew<small>${title}</small></h3><p>${c.none === "stopped" ? "It was stopped before its rest." : c.none === "no_logs" ? NO_LOGS : "The mash wasn't held at a rest."}</p>`;
  } else if (F.id === "boil") {
    if (!c.none) {
      const g = cellOf(b, "grain"), water = !g.none && fin(g.pre_boil) ? `<dt>Water</dt><dd>the runoff, ${f1(g.pre_boil)} ${V}</dd>`
        : fin(c.volume) ? `<dt>Water</dt><dd>${f1(c.volume)} ${V}${sim ? ", the simulated kettle's Volume" : ""}</dd>` : "";
      /* a rate far under the other brews', with no element level logged: it may have boiled at the boil power */
      const others = figOf("boil").values.filter(x => x.brew !== b.id && !x.out).map(x => x.v), top = others.length ? Math.max(...others) : null;
      let slow = "";
      if (ev && ev.s === "ok" && !ev.data.element && top && num(c.rate) / top < 0.6) {
        const r = num(c.rate) / top, FR = [[0.25, "a quarter"], [1 / 3, "a third"], [0.5, "half"]];
        const fr = FR.reduce((a, z) => (Math.abs(z[0] - r) < Math.abs(a[0] - r) ? z : a))[1];
        slow = `<p>About ${fr} of the other ${others.length === 1 ? "brew's" : "brews'"} rate the whole way: the element may have run at the boil power, not full power. Its level wasn't logged then, so the page can't tell.</p>`;
      }
      work = `<h3>${f1(c.rate)} ${U} a minute to the boil<small>${title}</small></h3><dl><dt>Heated</dt><dd>${Math.round(c.from)} → ${boilPt()} ${U} in ${mins(c.minutes)} min</dd>${water}</dl>${slow}`;
    } else work = `<h3>No boil on this brew<small>${title}</small></h3><p>${c.none === "stopped" ? `The boil kettle was heated to ${fin(c.at) ? Math.round(c.at) + " " + U : "short of the boil"} and stopped.` : c.none === "no_logs" ? NO_LOGS : "The boil kettle wasn't heated."}</p>`;
  } else if (F.id === "strike") {
    if (!c.none) {
      const fit = fin(c.fit_lo) && fin(c.fit_hi) && fin(figOf("strike").measured) ? `<dt>With ${pct(figOf("strike").measured)} %</dt><dd>the forecast would have been ${f1(c.fit_lo)}–${f1(c.fit_hi)} ${U}</dd>` : "";
      work = `<h3>Landed ${f1(c.landed)} ${U}<small>${title}</small></h3><dl><dt>Forecast</dt><dd>${f1(c.lo)}–${f1(c.hi)} ${U}, as the strike water box showed it</dd><dt>Landed</dt><dd>${f1(c.landed)} ${U}: the mash probe's average 5 to 15 minutes after the grain went in, with the pump running again</dd>${fit}</dl><p>From the strike water box's own record of its forecast and the numbers it worked from, kept as the malt went in.</p>`;
    } else if (c.none === "no_grain") work = `<h3>No grain here<small>${title}</small></h3><p>The simulated mash tun has no grain (its Grain_Kg is 0), so the strike water never landed on any.</p>`;
    else work = `<h3>Not part of this figure<small>${title}</small></h3><p>The strike water box kept no forecast for this brew: it was brewed before the box kept them. There's nothing to compare where it landed with.</p>`;
  } else if (F.id === "grain") {
    if (!c.none) {
      const per = massU() === "kg" ? `${num(c.per).toFixed(2)} ${V} a kilo` : `${num(c.per).toFixed(3)} ${V} a pound`, fill = c.strike_from === "hlt_fill";
      const strike = fill && fin(c.hlt_fill) && fin(c.sparge_before) ? `<dt>Strike</dt><dd>${f1(c.hlt_fill)} ${V} in the HLT, less the ${f1(c.sparge_before)} ${V} left before the sparge</dd>` : "";
      work = `<h3>${per}<small>${title}</small></h3><dl>${strike}<dt>In</dt><dd>${f1(c.strike)} ${V} strike + ${f1(c.sparge)} ${V} sparge</dd><dt>Out</dt><dd>${f1(c.pre_boil)} ${V} before the boil + ${f1(c.dead)} ${V} left in the tun</dd><dt>Held</dt><dd>${f1(c.held)} ${V} by the recipe's ${f1(c.grain)} ${massU()} of grain</dd></dl><p>From BrewScribe's volumes, at ${cel() ? "20 °C" : "68 °F"}.${fill ? " The HLT's losses before the sparge count as strike, so this may read slightly high." : ""}</p>`;
    } else {
      const why = {no_brewscribe: "BrewScribe isn't installed, so there are no volumes to work from.",
        no_levels: "BrewScribe has the sparge water without the HLT's level before it, so the strike can't be told from the HLT's fill.",
        no_grain_weight: "The recipe has no grain weight, so there's nothing to share the water held between."}[c.none] || "BrewScribe didn't record it, so there's no HLT fill, sparge or pre-boil volume to work from.";
      work = `<h3>No volumes for this brew<small>${title}</small></h3><p>${why}</p>`;
    }
  }
  const has = figOf(F.id).values.some(x => x.brew === b.id);
  const ob = st.outBusy && st.outBusy.fig === F.id && st.outBusy.brew === b.id, of = !ob && st.outFail && st.outFail.fig === F.id && st.outFail.brew === b.id;
  const leave = !has ? "" : `<button class="quiet${of ? " failed" : ""}" type="button" data-act="leave" data-fig="${F.id}" data-brew="${esc(b.id)}"${ob || st.link === "lost" ? ' aria-disabled="true"' : ""}>${ob ? (out ? "PUTTING BACK…" : "LEAVING OUT…") : out ? "PUT BACK IN THE FIGURE" : "LEAVE OUT OF THE FIGURE"}${of ? "<small>didn't change · tap to try again</small>" : ""}</button>`;
  const scribe = b.day_id ? `<a class="quiet" href="/brewscribe/#brew=${encodeURIComponent(b.day_id)}" target="brewscribe" data-act="scribe">THIS BREW IN BREWSCRIBE ${EXT}</a>` : "";
  return `<div class="ev" id="ev"><div class="graphs">${graphs}</div><div class="work">${work}<div class="acts">${leave}${scribe}<button class="quiet" type="button" data-act="close">CLOSE</button></div></div></div>`;
}
/* a BrewScribe day CraftBeerPi found no logs for: only grain absorption comes from it */
const NO_LOGS = "CraftBeerPi has no logs for this brew day, so only grain absorption can come from it.";
const EXT = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg>`;

/* ---------- the foot: one PID window per figure ---------- */
function strip(F, g) {
  const [d0, d1] = g.domain.map(num), y = 17, s0 = g.set || null;
  const px = v => `${(3 + (Math.max(d0, Math.min(d1, v)) - d0) / (d1 - d0) * 94).toFixed(2)}%`;
  let s = `<line class="st-axis" x1="3%" x2="97%" y1="${y}" y2="${y}"/>`;
  if (F.id === "strike" && !(s0 && fin(s0.value))) {
    const a = px(s0 && fin(s0.low) ? num(s0.low) : 0.45), b = px(s0 && fin(s0.high) ? num(s0.high) : 1.0);
    s += `<line class="st-set" x1="${a}" x2="${b}" y1="${y}" y2="${y}" opacity=".7"/><line class="st-set" x1="${a}" x2="${a}" y1="${y - 5}" y2="${y + 5}"/><line class="st-set" x1="${b}" x2="${b}" y1="${y - 5}" y2="${y + 5}"/><text class="st-setlab" x="${b}" y="${y - 8}" text-anchor="end">SET</text>`;
  } else if (["hlt", "strike", "grain"].includes(F.id) && (F.id === "hlt" || (s0 && fin(s0.value)))) {
    const x = px(s0 && fin(s0.value) ? num(s0.value) : 0.9);
    s += `<line class="st-set" x1="${x}" x2="${x}" y1="${y - 9}" y2="${y + 8}"/><text class="st-setlab" x="${x}" y="${y - 11}" text-anchor="middle">SET</text>`;
  }
  const vals = counted(g);
  if (vals.length > 1) {
    const lo = Math.min(...vals.map(x => x.v)), hi = Math.max(...vals.map(x => x.v));
    s += `<line class="st-range" x1="${px(lo)}" x2="${px(hi)}" y1="${y}" y2="${y}"/>`;
  }
  g.values.forEach(x => { s += x.out ? `<circle class="st-out" cx="${px(x.v)}" cy="${y}" r="4"/>` : `<circle class="st-dot" cx="${px(x.v)}" cy="${y}" r="4.5"/>`; });
  const words = `${g.values.length} brews on a line from ${F.fmt(d0)} to ${F.fmt(d1)} ${F.unit()}`;
  return `<svg class="strip" role="img" aria-label="${esc(words)}">${s}</svg>`;
}
function foot(F) {
  const g = figOf(F.id), lost = st.link === "lost", U = F.unit();
  const [sv0, su, sl, snone] = setOf(F, g);
  const sv = `<span class="tag">SET</span><span class="sv${snone || F.info ? " none" : ""}">${sv0}${su ? `<span class="u">${su}</span>` : ""}<span class="was">${esc(sl)}</span></span>`;
  let pv, verdict = "", act = "";
  const vals = counted(g);
  if (g.state === "none" || !vals.length) {
    pv = `<span class="tag">MEASURED</span><span class="pv none">– –</span>`;
    verdict = noneVerdict(F, g);
  } else if (F.nothing) {
    const held = fin(g.held) ? num(g.held) : 0, over = fin(g.over) ? num(g.over) : Math.max(...vals.map(x => x.v));
    pv = `<span class="tag">HELD</span><span class="pv">±${f1(held)}<span class="u">${deg()}</span></span>`;
    const came = Array.isArray(g.came_over) && g.came_over.length ? g.came_over.map(x => ({v: num(x.over), target: x.target})) : vals.filter(x => x.v >= 0.8);
    verdict = g.state === "caution" && came.length
      ? `<b>${came.length} of ${nBrews(g)}</b> came ${f1(Math.min(...came.map(x => x.v)))}–${f1(Math.max(...came.map(x => x.v)))} ${deg()} over ${tT(came[0].target)} ${deg()} arriving, then held within ${f1(held)} ${deg()}.`
      : `<b>Nothing to change:</b> ${vals.length} rests held within ${f1(held)} ${deg()}, none more than ${f1(over)} over.`;
    act = `<button class="quiet" type="button" data-act="hardware">DELTATEMP IN HARDWARE</button>`;
  } else {
    const [lo, hi] = loHi(g), m = num(g.measured);
    pv = g.state === "disagree" || !fin(m)
      ? `<span class="tag">MEASURED</span><span class="pv range">${F.fmt(lo)}–${F.fmt(hi)}<span class="u">${U}</span></span>`
      : `<span class="tag">MEASURED</span><span class="pv">${F.fmt(m)}<span class="u">${U}</span></span>`;
    if (g.state === "one") verdict = `One brew so far: another would show whether it repeats.`;
    else if (g.state === "disagree") verdict = `<b>${nBrews(g)} brews disagree,</b> ${F.fmt(lo)} to ${F.fmt(hi)} ${U}.${F.info ? "" : " Open the odd one."}`;
    else if (g.state === "info") verdict = `${nBrews(g)} brews, ${F.fmt(lo)} to ${F.fmt(hi)} ${U}.`;
    else if (g.state === "in_use") verdict = verdictInUse(F, g);
    else if (F.id === "hlt" && g.why_not === "brewstart_old") verdict = `This BrewStart always plans with 90 %. A newer BrewStart plans with a figure from past brews.`;
    else if (g.state === "use") verdict = verdictUse(F, g);
    if (F.info) verdict += ` Nothing plans with this yet.`;
    // the strike water helper working out the tun's steel again from a new landing: this is its last fit
    if (F.id === "strike" && g.working) verdict += ` Working out the tun's steel again from the landings: a few minutes.`;
    if (F.use) {
      const btn = (kind, label, small, cls, grey) => {
        const busy = !!st.busy && st.busy.fig === F.id && st.busy.act === kind, failed = !busy && !!st.fail && st.fail.fig === F.id && st.fail.act === kind;
        return `<button class="cmd${cls}${busy ? " busy" : ""}${failed ? " failed" : ""}" type="button" data-act="${kind}" data-fig="${F.id}"${grey || busy || (st.busy && st.busy.fig === F.id) ? ' aria-disabled="true"' : ""}>${busy ? "SENDING…" : esc(label)}<small>${esc(busy ? "waiting for CraftBeerPi" : failed ? "didn't change · tap to try again" : small)}</small></button>`;
      };
      if (["use", "one", "disagree"].includes(g.state)) {
        const u = offerOf(F, g);
        act = btn("use", u.label, u.small, " go", g.state !== "use" || lost || !!g.why_not || working());
      }
      // BACK TO only where USE set the figure: one typed by hand has nothing to go back to
      if (inUse(g)) {
        const w = wasOf(F, g);
        act += btn("back", w.label, w.small, "", lost);
      }
    }
  }
  const note = st.note && st.note.fig === F.id ? `<p class="note" role="status">${esc(st.note.text)}</p>`
    : st.fail && st.fail.fig === F.id && !(st.busy && st.busy.fig === F.id) ? `<p class="note bad" role="alert">${esc(st.fail.line)}</p>` : "";
  return `<span class="colh colh-phone">${esc(F.name)}<small>${esc(F.for)}</small></span><div class="fw">${pv}${sv}${g.values.length ? strip(F, g) : ""}</div><p class="verdict">${verdict}</p>${act ? `<div class="footact">${act}</div>` : ""}${note}`;
}

/* ---------- the page ---------- */
const scribeLink = words => (D && D.brewscribe === "none" ? "" : `<a class="quiet" href="/brewscribe/#past" target="brewscribe" data-act="scribe">${words} ${EXT}</a>`);
function headLine() {
  const list = brews(), first = Math.min(...list.map(b => b.start)), last = Math.max(...list.map(b => b.start));
  const n = list.length, span = `${dayShort(first)} to ${dayShort(last)}`, what = `<b>${n} ${n === 1 ? "brew" : "brews"}</b>`;
  const still = working() ? ` ${workingWords()}` : "";
  if (simulated()) return `From ${what} in ${esc(brewery())}'s logs, ${span}. <span class="simtag">Simulated brews</span> They describe the simulator, not the rig, and USE changes only this simulator.${still}`;
  const bs = list.some(b => b.day_id || String(b.id).startsWith("bs:"));
  return `From ${what} in ${esc(brewery())}'s logs${bs ? " and BrewScribe" : ""}, ${span}.${still}`;
}
function ledger() {
  const list = brews();
  const cols = `<colgroup><col class="brew">${FIGS.map(() => "<col>").join("")}</colgroup>`;
  const head = `<thead><tr><th scope="col"><span class="colh">Brew<small>newest first</small></span></th>${FIGS.map(F => `<th scope="col"><span class="colh">${esc(F.name)}<small>${esc(F.for)}</small></span></th>`).join("")}</tr></thead>`;
  let body = "";
  list.forEach(b => {
    const cur = st.open === b.id, id = esc(b.id);
    body += `<tr${cur ? ' aria-current="true"' : ""} data-brew="${id}"><td class="bcell"><button class="cellbtn date" type="button" data-act="open" data-brew="${id}" aria-expanded="${cur}"><span class="d">${day(b.start)}<time>${hm(b.start)}</time></span><span class="w">${esc(what(b))}</span></button></td>`;
    FIGS.forEach(F => {
      const raw = cellOf(b, F.id), out = isOut(F.id, b.id);
      const c = raw.none ? {none: true, why: noneWhy(F.id, raw)} : F.cell(raw);
      const inner = c.none ? `<span class="none">– –</span><span class="why">${esc(c.why)}</span>`
        : `<span class="v">${c.v}<span class="u">${c.u}</span></span><span class="s">${esc(c.s)}</span>${out ? `<span class="chip">left out</span>` : ""}`;
      const label = c.none ? `${F.name}, ${day(b.start)}: none, ${c.why}` : `${F.name}, ${day(b.start)}: ${c.v} ${c.u}, ${c.s}${out ? ", left out" : ""}`;
      body += `<td class="${st.pick === F.id ? "sel" : ""}${cur && st.focus === F.id ? " focus" : ""}"><button class="cellbtn${out ? " out" : ""}" type="button" data-act="open" data-brew="${id}" data-fig="${F.id}" aria-label="${esc(label)}">${inner}</button></td>`;
    });
    body += `</tr>`;
    if (cur) {
      const F = FIG(st.focus || st.pick);
      body += `<tr class="evrow"><td colspan="${FIGS.length + 1}" class="sel">${evidence(b, F)}</td></tr>`;
    }
  });
  const legend = `<div class="legend"><span><b class="m">MEASURED</b> what the brews show</span><span><b class="st">SET</b> what CraftBeerPi plans with now</span><span>Each dot is a brew; a hollow one is left out.</span></div>`;
  const tf = `<tfoot><tr><th scope="row">${legend}</th>${FIGS.map(F => `<td class="${st.pick === F.id ? "sel" : ""}" data-fig="${F.id}">${foot(F)}</td>`).join("")}</tr></tfoot>`;
  return `<table aria-label="Brewery figures by brew">${cols}${head}${tf}<tbody>${body}</tbody></table>`;
}
const pick = () => `<div class="pick" role="group" aria-label="Figure">${FIGS.map(F => `<button type="button" data-act="pick" data-fig="${F.id}" aria-pressed="${st.pick === F.id}">${F.short}</button>`).join("")}</div>`;
const fhead = (from, tools) => `<header class="fhead"><h1>Brewery figures</h1><p class="from">${from}</p><div class="tools">${tools}</div></header>`;

/* the control that had the focus, found again in what render() draws in its place */
function focusKey() {
  const a = sr && sr.activeElement;
  if (!a || !a.dataset || !a.dataset.act) return null;
  return {act: a.dataset.act, fig: a.dataset.fig || "", brew: a.dataset.brew || ""};
}
function refocus(k) {
  if (!k) return;
  const el = $$("[data-act]").find(x => x.dataset.act === k.act && (x.dataset.fig || "") === k.fig && (x.dataset.brew || "") === k.brew);
  if (el) el.focus({preventScroll: true});
}
function render() {
  if (!sr || !st) return;
  const main = $("#main"), keep = focusKey();
  main.dataset.link = st.link;
  if (load.s === "old") main.innerHTML = fhead("This CraftBeerPi can't work out figures from past brews yet: it needs an update. Brewhouse efficiency, boil-off and mash efficiency are in BrewScribe's Past brews.", scribeLink("PAST BREWS IN BREWSCRIBE"));
  else if (!D && load.s === "failed") main.innerHTML = fhead(`CraftBeerPi didn't send the figures: ${esc(load.why)}.`, `<button class="quiet" type="button" data-act="again">TRY AGAIN</button>`);
  else if (!D || firstWait()) main.innerHTML = fhead(`<span id="reading">${readingWords()}</span>`, "");
  else if (!brews().length) main.innerHTML = fhead(`No brews in ${esc(brewery())}'s logs yet. Figures start with the first brew day: an HLT heated, a mash rest held or a boil.`, scribeLink("PAST BREWS IN BREWSCRIBE"));
  else main.innerHTML = `${fhead(headLine(), scribeLink("PAST BREWS IN BREWSCRIBE"))}${pick()}<section class="ledger" id="ledger" aria-label="Figures by brew">${ledger()}</section>`;
  refocus(keep);
  // an opened brew comes to the top of the list, under the column heads, so its day graph is in view above the foot
  const row = st.open && $$("#ledger tr[data-brew]").find(r => r.dataset.brew === st.open);
  if (row) {
    const L = $("#ledger");
    if (oneScreen()) L.scrollTop += row.getBoundingClientRect().top - L.querySelector("thead th").getBoundingClientRect().bottom;
    else if (st.scrollOpen) row.scrollIntoView({block: "start"});
  }
  st.scrollOpen = false;
  if (row && oneScreen() && document.fonts && !st.fontsAligned) {
    const g = gen;
    document.fonts.ready.then(() => {
      if (g !== gen || !st) return;
      st.fontsAligned = true;
      const r2 = st.open && $$("#ledger tr[data-brew]").find(r => r.dataset.brew === st.open), L2 = $("#ledger");
      if (r2 && L2) L2.scrollTop += r2.getBoundingClientRect().top - L2.querySelector("thead th").getBoundingClientRect().bottom;
    });
  }
}

/* ---------- reading CraftBeerPi ---------- */
/* why a read or a command went wrong: no answer, no connection, CraftBeerPi still working the brews out (409 working),
   unable to read its logs (503), or its refusal */
const WORKING_BREWS = "CraftBeerPi is still working out the brews from its logs";
const whyNot = (res, ms) => (res.error === "timeout" ? `no answer in ${ms >= 120000 ? `${Math.round(ms / 60000)} min` : `${Math.round(ms / 1000)} s`}` : res.error === "network" ? "no connection"
  : res.status === 409 && res.data && res.data.error === "working" ? WORKING_BREWS
  : res.status === 503 ? "CraftBeerPi couldn't read its logs" : `CraftBeerPi said no (${res.status})`);
/* the figures in a command's answer, or a refusal's: the whole of GET /figures, or its figures alone */
function absorb(x) {
  if (!x || typeof x !== "object") return;
  if (Array.isArray(x.brews)) take(x);
  else if (D) { D = Object.assign({}, D, {figures: Object.assign({}, D.figures || {}, x)}); }
}
function take(data) {
  const before = new Map(brews().map(b => [b.id, b.end]));
  D = data; load = {s: "ok", why: ""};
  // a brew whose day has grown since its graph was read (the live logs' brew) is read again when it opens
  for (const [k, e] of [...EV]) { const id = k.slice(0, k.lastIndexOf("|")); if (!brewOf(id) || (before.has(id) && before.get(id) !== brewOf(id).end) || e.end !== brewOf(id).end) EV.delete(k); }
  if (st.open && !brewOf(st.open)) { st.open = null; st.focus = null; }
  if (st.open) wantEv(st.open, st.focus || st.pick);
}
async function readFigures() {
  if (reading) { again = true; return; }
  reading = true;
  const g = gen;
  if (!waitSince && !brews().length) waitSince = Date.now();
  patient();
  // the figures' own address; "/figures" without the slash is answered with a redirect to it
  const res = await call("GET", "/figures/", undefined, READ_MS);
  if (g !== gen || !st) return;
  reading = false;
  if (res.ok && res.data && typeof res.data === "object") take(res.data);
  else if (res.status === 404) { D = null; load = {s: "old", why: ""}; }
  else if (!D) load = {s: "failed", why: whyNot(res, READ_MS)};
  if (!firstWait()) waitSince = 0;
  render();
  if (again) { again = false; readFigures(); }
  // still working the brews out: asked again every few seconds, as well as on the topic that says they're ready
  else if (working()) { clearTimeout(pollT); pollT = later(readFigures, POLL_MS); }
}
/* waiting for the first brews: a read not answered yet (a core before 4.7.7.post64 works them out before it answers), or
   CraftBeerPi answering at once that it's still working them out and has none yet (post64) */
const working = () => !!(D && D.working);
const firstWait = () => (!D && reading) || (working() && !brews().length);
/* the head while it waits: what CraftBeerPi is doing, and for how long so far, counted every second */
let waitSince = 0, tickT = 0, pollT = 0;
const lasted = ms => { const s = Math.floor(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`; };
function readingWords() {
  const ms = waitSince ? Date.now() - waitSince : 0;
  if (ms < PATIENT_MS) return "Reading past brews from CraftBeerPi's logs…";
  return `Working out the figures from CraftBeerPi's logs: ${lasted(ms)} so far. The first time, it reads every past brew, which can take a few minutes; after that it's quick.`;
}
function patient() {
  clearInterval(tickT);
  const g = gen;
  tickT = setInterval(() => {
    if (g !== gen || !st || !firstWait()) { clearInterval(tickT); return; }
    const el = $("#reading");
    if (el) el.textContent = readingWords();
  }, 1000);
}
/* the brews shown while CraftBeerPi works them out again: the last it worked out, and when */
function workingWords() {
  const at = D && fin(D.as_of) ? `These are as they were at ${hm(D.as_of)} on ${dayShort(D.as_of)}; ` : "";
  return `${at}CraftBeerPi is looking through its logs for newer brews.`;
}
async function readEv(id, fid) {
  const key = `${id}|${fid}`, b = brewOf(id);
  EV.delete(key);
  EV.set(key, {s: "reading", end: b && b.end});
  while (EV.size > EV_KEEP) EV.delete(EV.keys().next().value);
  const g = gen;
  const res = await call("GET", `/figures/brews/${encodeURIComponent(id)}?figure=${encodeURIComponent(fid)}`, undefined, GRAPH_MS);
  if (g !== gen || !st || !EV.has(key)) return;
  const e = EV.get(key);
  if (res.ok && res.data && typeof res.data === "object") Object.assign(e, {s: "ok", data: res.data});
  else Object.assign(e, {s: "failed", why: whyNot(res, GRAPH_MS)});
  render();
}
const wantEv = (id, fid) => { const e = EV.get(`${id}|${fid}`); if (!e || e.s === "failed") readEv(id, fid); };

/* ---------- commands ---------- */
function noteFor(fig, text) {
  st.note = {fig, text};
  say(text);
  render();
  later(() => { if (st.note && st.note.text === text) { st.note = null; render(); } }, NOTE_MS);
}
/* a command of this page's own: the "figures" topic it causes is this page's, not another screen's */
const mine = (figure, changed) => st.own.push({figure, changed, until: Date.now() + 15000});
/* the LOG's line for a USE or BACK TO that CraftBeerPi applied */
function appliedLine(F, act, a, g) {
  const was = wasOf(F, g);
  if (F.id === "hlt") {
    if (act === "back") return a && a.to_built_in === false && fin(a.to) ? `BrewStart's efficiency set back to ${pct(a.to)} %` : "BrewStart's efficiency set back to 90 % (built in)";
    const to = a && fin(a.to) ? num(a.to) : null, from = a && (a.from_built_in || !fin(a.from)) ? "90 % (built in)" : `${pct(a.from)} %`;
    return `BrewStart's efficiency set to ${to != null ? pct(to) : "?"} %, was ${from}`;
  }
  if (F.id === "strike") {
    if (act === "back") return `Strike water box: the tun's steel warmed at once back to ${was.words}`;
    const from = a && fin(a.from) ? `${pct(a.from)} %` : a && a.from_range && fin(a.from_range.low) && fin(a.from_range.high)
      ? `${pct(a.from_range.low)}–${pct(a.from_range.high)} % (not measured)` : was.words;
    return `Strike water box: the tun's steel warmed at once set to ${a && fin(a.to) ? pct(a.to) : "?"} %, was ${from}`;
  }
  const U = `${volU()}/${massU()}`;
  if (act === "back") return `Grain absorption set back to ${a && fin(a.to) ? num(a.to).toFixed(2) + " " + U : was.words}`;
  return `Grain absorption set to ${a && fin(a.to) ? num(a.to).toFixed(2) : "?"} ${U}, was ${a && fin(a.from) ? num(a.from).toFixed(2) + " " + U : "as it was"}`;
}
/* a refusal in words: what wasn't applied, and why, with what follows from the figures as they are now */
function refusedWords(F, act, label, err, g0, g1) {
  if (err === "brewstart_old") return "This BrewStart can't take a figure from past brews: it always plans with 90 %.";
  if (err === "not_offered") return `${label} wasn't applied: the brews no longer agree.`;
  if (err === "back_changed") return `${label} wasn't applied: ${SETTING[F.id] === SETTING.strike ? "the strike water box's tun steel" : SETTING[F.id]} was changed ${F.id === "strike" ? "since" : "in Settings since"}. It's ${nowWords(F, g1)} now.`;
  if (err === "not_in_use") return `${label} wasn't applied: the figure isn't in use any more.`;
  if (err === "working") return `${label} wasn't applied: ${WORKING_BREWS}. Try again in a minute.`;
  if (err === "brews_changed") {
    const was = new Map(g0.values.map(x => [x.brew, x.out])), outNow = g1.values.filter(x => x.out && was.get(x.brew) === false);
    const then = g1.state === "use" ? `It's ${offerOf(F, g1).words} now.` : g1.state === "one" ? "With one brew left, USE waits for a second." : g1.state === "disagree" ? "The brews left disagree." : g1.state === "none" ? "No brews are left in it." : "";
    if (outNow.length) {
      const b = brewOf(outNow[0].brew);
      return `${label} wasn't applied: ${b ? day(b.start) : "a brew"} was left out of this figure on another screen.${then ? " " + then : ""}`;
    }
    return `${label} wasn't applied: a new brew changed the figure.${then ? " " + then : ""}`;
  }
  return `${label} wasn't applied: CraftBeerPi refused it (${err || "409"}).`;
}
async function command(F, act) {
  const g0 = figOf(F.id), u = offerOf(F, g0), w = wasOf(F, g0);
  const label = act === "use" ? u.label : w.label;
  const body = act === "use" ? {value: g0.use && fin(g0.use.value) ? num(g0.use.value) : u.value, brews: (g0.use && g0.use.brews) || counted(g0).map(x => x.brew)}
    : {value: g0.set ? g0.set.value : null};
  st.busy = {fig: F.id, act}; st.fail = null; st.note = null;
  mine(F.id, act);
  render();
  const gg = gen;
  const res = await call("POST", `/figures/${F.id}/${act}`, body, CMD_MS);
  if (gg !== gen || !st) return;
  st.busy = null;
  if (res.ok) {
    absorb(res.data && res.data.figures);
    log(appliedLine(F, act, res.data && res.data.applied, g0), "confirmed", "ok");
    render();
    return;
  }
  if (res.status === 409) {
    const fx = res.data && res.data.figures;
    absorb(fx);
    // a new brew: its row comes with the whole of GET /figures, which a refusal with the figures alone doesn't carry;
    // brews still being worked out: the page asks again until they're ready
    const err = res.data && res.data.error;
    if ((err === "brews_changed" && !(fx && Array.isArray(fx.brews))) || err === "working") readFigures();
    return noteFor(F.id, refusedWords(F, act, label, err, g0, figOf(F.id)));
  }
  const why = whyNot(res, CMD_MS);
  const end = res.error === "timeout" ? `No answer from CraftBeerPi in ${CMD_MS / 1000} s.` : res.error === "network" ? "No connection to CraftBeerPi."
    : res.status === 503 ? "CraftBeerPi couldn't read its logs." : `CraftBeerPi said no (${res.status}).`;
  st.fail = {fig: F.id, act, line: `${still(F, g0)} ${end}`};
  log(`${F.name}: failed: ${why}`, "failed", "bad");
  say(st.fail.line, true);
  render();
}
async function leaveOut(F, bid) {
  const b = brewOf(bid);
  if (!b) return;
  const out = !isOut(F.id, bid);
  st.outBusy = {fig: F.id, brew: bid}; st.outFail = null;
  mine(F.id, "out");
  render();
  const gg = gen;
  const res = await call("POST", `/figures/${F.id}/out`, {brew: bid, out}, CMD_MS);
  if (gg !== gen || !st) return;
  st.outBusy = null;
  if (res.ok) {
    absorb(res.data && res.data.figures);
    log(`${day(b.start)} ${out ? "left out of" : "put back in"} the ${F.name.toLowerCase()} figure`, "", "");
  } else if (res.status === 409) {
    // refused, nothing changed: a brew CraftBeerPi hasn't got among the brews it's still working out
    absorb(res.data && res.data.figures);
    const err = res.data && res.data.error;
    if (err === "working") readFigures();
    return noteFor(F.id, `${day(b.start)} wasn't ${out ? "left out" : "put back"}: ${err === "working" ? `${WORKING_BREWS}. Try again in a minute.` : `CraftBeerPi refused it (${err || "409"}).`}`);
  } else {
    st.outFail = {fig: F.id, brew: bid};
    log(`${F.name}: failed: ${whyNot(res, CMD_MS)}`, "failed", "bad");
    say(`${day(b.start)} was not ${out ? "left out" : "put back"}: ${whyNot(res, CMD_MS)}.`, true);
  }
  render();
}

/* ---------- another screen: the "figures" topic ---------- */
function topic(t) {
  if (!t || typeof t !== "object") return readFigures();
  const now = Date.now();
  st.own = st.own.filter(x => x.until > now);
  const i = st.own.findIndex(x => x.figure === t.figure && x.changed === t.changed);
  // this page's own command: its answer brought the figures already
  if (i >= 0) { st.own.splice(i, 1); return; }
  const F = FIG(t.figure), g0 = F ? figOf(F.id) : null, bs0 = new Map(brews().map(b => [b.id, b]));
  const done = readFigures();
  if (!F || !["use", "back", "out"].includes(t.changed)) return done;
  return Promise.resolve(done).then(() => {
    if (!st || !D) return;
    const g1 = figOf(F.id);
    if (t.changed === "out") {
      const was = new Map(g0.values.map(x => [x.brew, x.out]));
      g1.values.filter(x => was.has(x.brew) && was.get(x.brew) !== x.out).forEach(x => {
        const b = brewOf(x.brew) || bs0.get(x.brew);
        if (b) log(`${day(b.start)} ${x.out ? "left out of" : "put back in"} the ${F.name.toLowerCase()} figure`, "from another screen", "");
      });
      return;
    }
    if (!F.use) return;
    if (t.changed === "use") log(`${SETTING[F.id]} set to ${nowWords(F, g1).replace(/ \((built in|not measured)\)$/, "")}`, "from another screen", "");
    else log(`${SETTING[F.id]} ${F.id === "strike" ? "back" : "set back"} to ${nowWords(F, g1)}`, "from another screen", "");
  });
}

/* ---------- presses ---------- */
function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act, fig = el.dataset.fig, brew = el.dataset.brew, F = fig ? FIG(fig) : null;
  if (act === "scribe") return; // a link to BrewScribe, in its own tab
  e.preventDefault();
  if (act === "open") {
    const want = fig || st.focus || st.pick, ev = EV.get(`${brew}|${want}`);
    if (st.open === brew && (!fig || st.focus === fig) && !(ev && ev.s === "failed")) { st.open = null; st.focus = null; }
    else { st.open = brew; st.focus = want; if (fig) st.pick = fig; st.scrollOpen = true; wantEv(brew, want); }
    return render();
  }
  if (act === "close") { st.open = null; st.focus = null; return render(); }
  if (act === "pick") { st.pick = fig; st.focus = fig; if (st.open) wantEv(st.open, fig); return render(); }
  if (act === "again") { load = {s: "reading", why: ""}; render(); return readFigures(); }
  if (act === "hardware") {
    const s = figOf("mash").set, k = s && s.kettle;
    return env.navigate && env.navigate(k ? `/kettle/${encodeURIComponent(k)}` : "/hardware");
  }
  if (act === "leave") {
    if (el.getAttribute("aria-disabled") === "true") { if (st.link === "lost") noteFor(fig, PAUSED); return; }
    return leaveOut(F, brew);
  }
  if (act === "use" || act === "back") {
    if (el.getAttribute("aria-disabled") === "true") {
      if (st.busy && st.busy.fig === fig) return;
      const w = st.link === "lost" ? PAUSED : act === "use" ? whyGrey(F, figOf(fig)) : "";
      return w ? noteFor(fig, w) : undefined;
    }
    return command(F, act);
  }
}
function onKey(e) {
  if (e.key === "Escape" && st && st.open) { st.open = null; st.focus = null; render(); }
}
let lastW = 0, lastOne = null;
function onResize() {
  if (!st) return;
  const one = oneScreen();
  if (Math.abs(window.innerWidth - lastW) > 40 || one !== lastOne) { lastW = window.innerWidth; lastOne = one; render(); }
}

/* ---------- CraftBeerPi's state, from the app's data ---------- */
const setting = (config, k) => { const x = config && config[k]; return x && typeof x === "object" ? x.value : x; };
function live(d) {
  // only exactly "12-hour" gives 12-hour times; a core without the setting, or any other value, keeps 24-hour. Until
  // the configuration has come, the times stay as they are (12-hour at first, the core's default).
  const h24 = d.config && Object.keys(d.config).length ? setting(d.config, "CLOCK_FORMAT") !== "12-hour" : CFG.h24;
  const name = String(setting(d.config, "BREWERY_NAME") ?? "").trim(), unit = String(setting(d.config, "TEMP_UNIT") || "F");
  const was = CFG.strike, wasConnected = CFG.connected;
  let redraw = h24 !== CFG.h24 || name !== CFG.brewery || unit !== CFG.unit;
  Object.assign(CFG, {h24, brewery: name, unit, kettles: d.kettles || [], strike: d.strike || null, connected: !!d.connected});
  // the strike water box's state comes often while it works; only its forecast with the tun's steel in use is said here
  if (d.strike !== was) { const now = JSON.stringify(strikeLands()); if (now !== CFG.lands) { CFG.lands = now; redraw = true; } }
  const link = d.connected ? "ok" : "lost";
  if (link !== st.link) { st.link = link; redraw = true; }
  // the connection back: the figures again, as a brew may have ended meanwhile (or, the first time, if the first read
  // found no CraftBeerPi)
  if (wasConnected === false && d.connected && (st.everConnected || load.s === "failed")) readFigures();
  if (d.connected) st.everConnected = true;
  const t = d.figures;
  if (t && t.at !== CFG.topicAt) {
    const first = CFG.topicAt === null && wasConnected === null;
    CFG.topicAt = t.at;
    // a topic already there as the page opens is older than the page's own first read
    if (!first) topic(t.data);
  }
  if (redraw) render();
}

/* ---------- the page ---------- */
// el: the frame's host for the page (screen.js, page "figures"). o.frame: the frame (log, say, toast). o.navigate(path):
// open a page.
export function createFigures(el, o = {}) {
  if (st) teardown();
  const myGen = ++gen;
  host = el; env = o; timers = [];
  // the frame's rules go in once and stay: they are scoped to html[data-page=figures], so they rest while it is off
  if (!document.getElementById("fg-style")) {
    const s = document.createElement("style");
    s.id = "fg-style";
    s.textContent = FRAME_CSS;
    document.head.appendChild(s);
  }
  fresh();
  D = null; load = {s: "reading", why: ""}; reading = false; again = false; EV = new Map();
  CFG = {connected: null, h24: false, brewery: "", unit: "F", kettles: [], strike: null, topicAt: null};
  sr = host.shadowRoot || host.attachShadow({mode: "open"});
  sr.innerHTML = `<style>${FIGURES_CSS}${EXTRA_CSS}</style><main class="main" id="main" data-link="ok"></main>`;
  const on = (t, k, f, x) => { t.addEventListener(k, f, x); off.push(() => t.removeEventListener(k, f, x)); };
  on(sr, "click", onClick);
  on(document, "keydown", onKey);
  on(window, "resize", onResize);
  lastW = window.innerWidth; lastOne = oneScreen();
  render();
  readFigures();
  return {
    update(d) { if (gen === myGen && st && d) live(d); },
    destroy() { if (gen === myGen) teardown(); }
  };
}
function teardown() {
  clearInterval(tickT);
  off.forEach(f => f());
  off = [];
  timers.forEach(clearTimeout);
  timers = [];
  if (sr) sr.innerHTML = "";
  host = null; sr = null; st = null; env = {}; D = null; EV = new Map();
  gen++;
}
