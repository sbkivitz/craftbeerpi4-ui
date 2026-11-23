/* Recipe Book mockup: the Recipe Book, a recipe's steps, importing, and Brew Steps, in the brew-day screen's world.
   A recipe is shown as Brew Day's recipe column shows it, in the same place; the book, a step's settings and importing
   sit beside it. LOAD puts a recipe on Brew Day: one tap, unless a brew has begun (then it asks) or a step runs (then it
   says why not). A new step goes in where its kind belongs in a brew; MOVE, then PUT IT HERE, moves a step any distance
   in two taps; a recipe without BrewStart offers it as step 1, filled in from the rig. Vanilla JS like the Settings and
   Hardware mockups. A mockup: nothing here talks to CraftBeerPi, and a command "answers" after a second. Recipes and
   settings are the simulator's (recipes-data.js); the plain names of each kind of step and its settings are in
   recipes-catalog.js. */
"use strict";
(() => {
const D = window.CBPI_RECIPES, CAT = window.CBPI_STEP_CATALOG;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const QS = new URLSearchParams(location.search);
const U = "°" + D.UNIT;
const narrow = () => matchMedia("(max-width:899px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const PAUSED = "No connection. Controls are paused.";
const WAIT = "Waiting for CraftBeerPi to answer.";
const LONG_NAME = 24;
const ICON = {
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1.5h16V16l-2-3.5V8a6 6 0 0 0-6-6zm-2.5 17a2.5 2.5 0 0 0 5 0z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8 23 21.5H1z"/><path d="M12 8.5v6M12 17.5v.5" stroke="#6e1414" stroke-width="2.6" stroke-linecap="round"/></svg>',
  tick: '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8.5 14.5l3.8 3.8 7.2-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* ---------- numbers and words ---------- */
const num = v => { if (v === null || v === undefined || String(v).trim() === "") return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const fmt = n => String(Math.round(n * 10) / 10);
const norm = v => v === null || v === undefined ? "" : String(v).trim();
const same = (a, b) => norm(a) === norm(b) || (num(a) !== null && num(a) === num(b));
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const andList = xs => xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
// temperatures in a step's message follow the unit's sign: "170 F" -> "170 °F" (Brew Day's unitText)
const unitText = t => String(t || "").replace(/(\d)\s*°?\s*([FC])\b(?![\w'])/g, (m, d, c) => `°${c}` === U ? `${d} ${U}` : m);
const nameOf = (list, id) => (list.find(x => x.id === id) || {}).name;
const kindName = t => (CAT.KINDS[t] || {}).n || t || "No kind chosen";
const nameIn = s => s.name || kindName(s.type);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// BrewStart's Timing: only "Ready by" heats; a step saved with no Timing runs as Start at, as it did before Timing existed
const readyBy = p => norm((p || {}).Timing) === "Ready by";
const hm = t => { const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(t ?? "")); return m ? `${m[1].padStart(2, "0")}:${m[2]}` : ""; };
const todayAt = hm => Date.parse(`${D.TODAY}T${hm}:00`) / 1000;
/* ---------- times of day: Brew Day's Twelve-Hour Rule ----------
   Every time of day reads the way the brewer reads a clock, by CraftBeerPi's CLOCK_FORMAT setting: "12-hour", the
   default, gives 7:00 AM and 11:15:40 PM; "24-hour" gives 07:00 and 23:15:40. A step keeps its time as 24-hour text
   ("19:00") either way. Lengths of time aren't times of day and don't change: "in 9 h 48 min", "23:41 left" */
const TWELVE = norm(QS.get("clock") || D.CONFIG.CLOCK_FORMAT) !== "24-hour";
const NB = "\u00a0";
// a time of day for the screen, "HH:MM" or "HH:MM:SS" in; AM or PM stays with its time (a no-break space)
function timeOfDay(t, secs) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(t ?? ""));
  if (!m) return "";
  const h = +m[1], sec = secs && m[3] != null ? `:${m[3]}` : "";
  return TWELVE ? `${h % 12 || 12}:${m[2]}${sec}${NB}${h < 12 ? "AM" : "PM"}` : `${String(h).padStart(2, "0")}:${m[2]}${sec}`;
}
// a time in a time box: 7:00, beside its AM and PM; or 07:00
const boxText = t => { const m = /^(\d{2}):(\d{2})$/.exec(hm(t)); return !m ? "" : TWELVE ? `${+m[1] % 12 || 12}:${m[2]}` : `${m[1]}:${m[2]}`; };
const halfOf = t => +hm(t).slice(0, 2) >= 12 ? "pm" : "am";
/* a time as typed, by the same rule: "7", "700" and "7:00", with leading zeros or without, are 7:00 in the half of the
   day the box shows (half); "7a" and "7 am" are morning; "7p", "7 pm", "19" and "19:00" are evening; "12" alone is noon
   and "12a" midnight. With 24-hour, a time without AM or PM is the 24-hour time. Answers "HH:MM", or null */
function readTime(text, half) {
  const m = /^\s*(\d{1,2})(?:[:.\s]?(\d{2}))?\s*(?:([ap])\.?\s*m?\.?)?\s*$/i.exec(String(text ?? ""));
  if (!m) return null;
  let h = +m[1];
  const mi = m[2] == null ? 0 : +m[2], mark = (m[3] || "").toLowerCase();
  if (mi > 59) return null;
  if (mark) { if (h < 1 || h > 12) return null; h = h % 12 + (mark === "p" ? 12 : 0); }
  else if (h > 23) return null;
  else if (TWELVE && half === "pm" && h >= 1 && h <= 11) h += 12;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}
/* ---------- CraftBeerPi's clock: Brew Day's One Clock Rule ----------
   st.clock is its time of day ("HH:MM"), on its date. A simulator's clock (st.sim) runs scale times as fast and keeps a
   date of its own; the screen's (the PC's) date is D.TODAY, and its time st.sim.pc. A recipe file's time is the PC's */
const cbDate = () => st.sim ? st.sim.day : D.TODAY;
const speed = () => st.sim ? st.sim.scale : 1;
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayAfter = iso => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + 1); return isoOf(d); };
const dateAt = iso => new Date(`${iso}T12:00:00`);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// what the title bar and BrewStart's When settings add where CraftBeerPi's clock isn't the screen's: its date, its speed
const clockTag = () => { const other = cbDate() !== D.TODAY, fast = speed() !== 1; return other || fast ? {other, fast} : null; };
// a recipe file's time, as CraftBeerPi will give it: the PC's
const fileNow = () => todayAt(st.sim ? st.sim.pc : st.clock);
/* a recipe file's time, which is the PC's: "Today 7:44 AM" in the book's column, "today at 7:44 AM" in a sentence, or
   its date */
function dateWords(ep, inLine) {
  const d = new Date(ep * 1000);
  if (isoOf(d) !== D.TODAY) return `${d.getDate()} ${MON[d.getMonth()]}`;
  const t = timeOfDay(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
  return inLine ? `today at ${t}` : `Today ${t}`;
}
/* a boil addition's words, as Brew Day splits them: "3.00 oz Centennial" -> ["Centennial", "3.00 oz"] */
const AMOUNT = /^(\d+(?:[.,]\d+)?)\s*(oz|g|gr|kg|lbs?|ml|l|tsp|tbsp|pkg|packs?|tablets?|items?|x)?\.?(?=\s|$)\s*(.*)$/i;
function splitAddition(text) {
  const s = String(text ?? "").trim(), m = AMOUNT.exec(s);
  if (!m) return [s, ""];
  return [m[3].trim(), m[2] ? `${m[1]} ${m[2]}` : m[1]];
}
function additions(p) {
  const out = [];
  if (p.First_Wort === "Yes") { const [n, a] = splitAddition(p.First_Wort_text); out.push(["First wort", n || "First-wort hops", a]); }
  for (let i = 1; i <= 6; i++) {
    const t = num(p[`Hop_${i}`]);
    if (t == null) continue;
    const [n, a] = splitAddition(p[`Hop_${i}_text`]);
    out.push([t, n || `Hop ${i}`, a]);
  }
  return out;
}
/* a step as Brew Day's recipe column lists it (live.js stepModel): its name, its temperature and minutes, a note, the
   boil's additions; a BrewStart on Ready by gives the water's temperature, when it's ready by and how much there is */
function stepView(s) {
  const p = s.props || {}, temp = num(p.Temp), t = num(p.Timer), v = {n: s.name || kindName(s.type)};
  if (s.type === "BrewStart" && readyBy(p)) {
    const rt = num(p.Ready_Temp), vol = num(p.Volume), at = hm(p.StartTime);
    // a date's weekday stays with its time, as on Brew Day's row: "ready by 7:00 AM Sat"
    const on = norm(p.Mode) === "Date" && ymd(p.StartDate) ? WEEK[dateAt(ymd(p.StartDate)).getDay()] : "";
    v.p = [rt != null ? `${fmt(rt)}${NB}${U}` : "", at ? `ready by ${timeOfDay(at)}${on ? NB + on : ""}` : "", vol != null && vol > 0 ? `${fmt(vol)}${NB}${p.Volume_Unit === "L" || p.Volume_Unit === "gal" ? p.Volume_Unit : D.UNIT === "C" ? "L" : "gal"}` : ""].filter(Boolean).join(`${NB}· `);
  } else v.p = [temp != null ? `${s.type === "SpargeStep" ? "water " : ""}${fmt(temp)}${NB}${U}` : "", t ? `${fmt(t)}${NB}min` : ""].filter(Boolean).join(`${NB}· `);
  if (s.type === "MashInStep") v.note = temp != null ? `Add the malt when it reaches ${fmt(temp)} ${U}` : "Add the malt when it is up to temperature";
  else if (s.type === "NotificationStep" && p.Notification) v.note = unitText(p.Notification);
  if (s.type === "BoilStep") { const a = additions(p); if (a.length) v.adds = a; }
  return v;
}
/* the book's numbers: the mash temperatures (mash in and rests, each once, in order) and the boil's minutes */
function mashTemps(steps) {
  const m = [];
  for (const s of steps) { const t = num((s.props || {}).Temp); if (/^Mash(In)?Step$/.test(s.type) && t != null && !m.includes(t)) m.push(t); }
  return m;
}
const boilMin = steps => { const b = steps.find(s => s.type === "BoilStep"); return b ? num(b.props.Timer) : null; };
// Brew Day's one-line summary of a recipe, for the narrow book and Brew Day's own list
function bookLine(steps) {
  const m = mashTemps(steps).map(fmt), b = boilMin(steps), parts = [`${steps.length} step${steps.length === 1 ? "" : "s"}`];
  if (m.length) parts.push(`mash ${andList(m)} ${U}`);
  if (b) parts.push(`${fmt(b)} min boil`);
  return parts.join(" · ");
}
const fromLine = r => r.desc || (r.imported_from ? `Imported from ${r.imported_from}` : "");

/* ---------- state ---------- */
let st, KEY = 0;
const keyed = steps => steps.map(s => ({_k: "k" + (KEY++), ...clone(s)}));
function fresh() {
  st = {
    page: "book",       // the RECIPE BOOK tab, or "steps": BREW STEPS
    book: clone(D.BOOK),
    open: null,         // the recipe in the column
    pane: "list",       // what the right side shows on the book page: list, edit, import, copy, new
    view: "list",       // 899 px and narrower, one at a time: list, recipe or plate
    pick: null,         // 899 px and narrower: the plate shown on its own
    q: "",
    loaded: null,       // the recipe on Brew Day: CraftBeerPi's brew steps
    pend: {},           // commands waiting for CraftBeerPi's answer
    ask: null,          // a question that waits for an answer, in the place it was asked
    notes: {},          // why a control can't be used, said where it was pressed, for six seconds
    ed: null,           // the Recipe Book's copy being changed
    bs: null,           // Brew Day's copy being changed (Brew Steps)
    offer: null,        // after SAVE: the copy on Brew Day is older than the book's, and LOAD AGAIN would bring it up to date
    imp: {file: "kept", result: null, bf: false, bq: "", busy: null},
    banner: null,
    link: "ok",
    clock: "07:41",
    sim: null,          // a simulator's clock: {scale, day: its date, pc: the screen's time}
    events: [["07:38:40", "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]]
  };
}
const book = file => st.book.find(r => r.file === file);
const sorted = () => [...st.book].sort((p, q) => q.modified - p.modified || p.name.localeCompare(q.name, undefined, {sensitivity: "base"}));
function loadFrom(file, state = "ready", cur = 0, extra = {}) {
  const r = book(file);
  const steps = clone(r.steps).map((s, i) => ({...s, status: state === "finished" ? "D" : i < cur ? "D" : i === cur ? ({ready: "I", running: "A", stopped: "S"})[state] : "I"}));
  st.loaded = {file, name: r.name, at: "07:38", day: cbDate(), steps, left: null, ran: null, mash_numbers: r.mash_numbers ? clone(r.mash_numbers) : null, ...extra};
}
/* where Brew Day is with the recipe loaded, in Brew Day's words: not begun, running, stopped (or waiting for the brewer
   at a later step), finished. begun: a step has started, so loading another makes CraftBeerPi forget how far it got */
function brew() {
  const L = st.loaded;
  if (!L || !L.steps.length) return {state: "none"};
  const S = L.steps, n = S.length;
  if (S.every(s => s.status === "D")) return {state: "finished", n, cur: n - 1};
  let cur = S.findIndex(s => s.status === "A");
  if (cur >= 0) return {state: "running", cur, n, begun: true};
  cur = S.findIndex(s => s.status === "S" || s.status === "E");
  if (cur >= 0) return {state: "stopped", cur, n, begun: true};
  cur = S.findIndex(s => s.status === "I");
  return {state: "ready", cur, n, begun: cur > 0};
}
const statusWords = b => b.state === "finished" ? "FINISHED" : `${b.state === "running" ? "RUNNING" : b.state === "ready" ? "READY TO START" : "STOPPED"} · STEP ${b.cur + 1} OF ${b.n}`;
const isLoaded = file => !!st.loaded && st.loaded.file === file;
/* whether the recipe on Brew Day can be loaded again: the Recipe Book still has the copy it was loaded from. Steps
   built on Brew Steps, or a recipe whose copy was deleted, can't, so LOAD and UNLOAD ask before replacing them */
const loadedInBook = () => !!(st.loaded && st.loaded.file && book(st.loaded.file));
/* LOAD, the same rules everywhere, Brew Day included: one tap while nothing has begun; a question once a brew has
   begun, or when the recipe it replaces isn't in the Recipe Book; while a step runs, greyed, saying in brewing words
   what runs */
function loadRule() {
  if (st.link === "lost") return {why: PAUSED};
  if (st.pend.load || st.pend.unload) return {why: WAIT};
  const b = brew();
  if (b.state === "running") return {why: runningWhy()};
  if (b.begun || (b.state !== "none" && !loadedInBook())) return {ask: true};
  return {};
}
function runningWhy() {
  const L = st.loaded, s = L.steps[brew().cur], p = s.props || {}, nx = L.steps[brew().cur + 1];
  const what = s.type !== "BrewStart" ? `${s.name}${L.left != null ? `, ${mmss(L.left)} left` : ""}`
    : readyBy(p) ? `BrewStart is waiting to have the ${nameOf(D.KETTLES, p.Heat_Kettle) || "water"} at ${fmt(num(p.Ready_Temp))} ${U} by ${timeOfDay(hm(p.StartTime))}`
    : `BrewStart is waiting until ${timeOfDay(hm(p.StartTime))} to start ${nx ? nameIn(nx) : "the next step"}`;
  return `${L.name} is running: ${what}. Stop it on Brew Day first.`;
}
// where the brew stopped, for a question: "stopped at step 3, Saccharification, after 16 of its 40 min"
function whereStopped() {
  const L = st.loaded, b = brew(), s = L.steps[b.cur], t = num((s.props || {}).Timer);
  return b.state === "stopped" ? `stopped at step ${b.cur + 1}, ${s.name}${L.ran != null && t ? `, after ${L.ran} of its ${fmt(t)} min` : ""}` : `is at step ${b.cur + 1}, ${s.name}, waiting for you`;
}

/* ---------- changing a recipe: the book's copy (st.ed) or Brew Day's (st.bs, the Brew Steps page) ---------- */
const E = () => st.page === "steps" ? st.bs : st.ed;
function startEdit(file, cur) {
  const r = book(file), doc = {name: r.name, author: r.author || "", desc: r.desc || "", steps: keyed(r.steps)};
  st.ed = {file, doc, orig: clone(doc), cur: cur || "r", kinds: false, mv: null, from: null};
  st.pane = "edit"; st.open = file; st.ask = null; st.offer = null;
}
function ensureBs() {
  if (st.bs || !st.loaded) return;
  const doc = {name: st.loaded.name, steps: keyed(st.loaded.steps)};
  st.bs = {doc, orig: clone(doc), cur: "o", kinds: false, mv: null, from: null};
}
const origOf = (ed, s) => ed.orig.steps.find(o => o._k === s._k);
const live = ed => ed.doc.steps.filter(s => !s._removed);
const isRunning = s => s.status === "A";
/* what changed in a step: a new or removed step counts once; otherwise its name, kind, each setting and a move */
function stepChange(ed, s) {
  const o = origOf(ed, s);
  if (!o) return {tag: "new", n: 1, keys: []};
  if (s._removed) return {tag: "removed", n: 1, keys: []};
  const keys = [];
  if (norm(s.name) !== norm(o.name)) keys.push("name");
  if (s.type !== o.type) keys.push("type");
  new Set([...Object.keys(s.props || {}), ...Object.keys(o.props || {})]).forEach(k => { if (!same((s.props || {})[k], (o.props || {})[k])) keys.push(k); });
  const n = keys.length + (s._moved ? 1 : 0);
  return {tag: n ? (keys.length ? "changed" : "moved") : "", n, keys, moved: !!s._moved};
}
const recipeKeys = ed => ed.doc.author === undefined ? [] : ["name", "author", "desc"].filter(k => norm(ed.doc[k]) !== norm(ed.orig[k]));
const changes = ed => !ed ? 0 : recipeKeys(ed).length + ed.doc.steps.reduce((n, s) => n + stepChange(ed, s).n, 0);
const dirty = () => changes(E()) > 0;
// a move is undone by moving the step back; once the steps are in their first order again, no step counts as moved
function settleMoves(ed) {
  const now = ed.doc.steps.filter(s => origOf(ed, s) && !s._removed).map(s => s._k), was = ed.orig.steps.map(s => s._k).filter(k => now.includes(k));
  if (now.join() === was.join()) ed.doc.steps.forEach(s => delete s._moved);
}
const stepByKey = k => E().doc.steps.find(s => s._k === k);
/* what a setting is called, what it does, and what kind of control it gets: the catalogue's plain words, or, for a
   setting it doesn't know, CraftBeerPi's own */
const meta = (type, label) => ((CAT.KINDS[type] || {}).p || {})[label] || {n: label.replace(/_/g, " ")};
const typeOf = (type, label) => (CAT.TYPES[type] || {})[label] || (/^Hop_\d$|Timer|Temp/.test(label) ? "number" : "text");
const unitOf = (m, s) => m.unit === "deg" ? U : m.unit === "vol" ? (s.props.Volume_Unit || "gal") : m.unit || "";
function shownValue(s, label, v) {
  const t = typeOf(s.type, label), m = meta(s.type, label);
  if (norm(v) === "") return m.blankAs ? `${(m.opts || {})[m.blankAs] || m.blankAs}, left blank` : m.blank || "blank";
  if (t === "kettle") return nameOf(D.KETTLES, v) || "not found";
  if (t === "sensor") return nameOf(D.SENSORS, v) || "not found";
  if (t === "actor") return nameOf(D.ACTORS, v) || "not found";
  if (Array.isArray(t)) return (m.opts || {})[v] || v;
  if (t === "time") return timeOfDay(hm(v)) || v;
  const u = unitOf(m, s);
  return `${v}${u ? " " + u : ""}`;
}
// a new step of a kind: CraftBeerPi's own starting values, and the vessel its kind belongs to. A BrewStart is filled in
// from the rig (brewStartProps), and says from where
function newStep(type) {
  const g = (CAT.KINDS[type] || {}).g, props = {...(CAT.START[type] || {})}, C = D.CONFIG;
  const types = CAT.TYPES[type] || {}, s = {_k: "n" + (KEY++), name: kindName(type), type, props, status: st.page === "steps" ? "I" : undefined};
  if (type === "BrewStart") { const f = brewStartProps(E()); s.props = f.props; s._fill = f.fill; return s; }
  if ("Kettle" in types) props.Kettle = g === "mash" ? C.MASH_TUN : g === "sparge" ? D.KETTLES[0].id : C.BoilKettle;
  if ("Heat_Kettle" in types) props.Heat_Kettle = D.KETTLES[0].id;
  if ("Mash_Tun" in types) props.Mash_Tun = C.MASH_TUN;
  if (type === "BoilStep") props.Temp = C.steps_boil_temp;
  return s;
}
const hasBrewStart = steps => steps.some(s => s.type === "BrewStart" && !s._removed);
/* the first place a step can go: on Brew Steps, after the last step that has begun (done, running, stopped or
   failed), since CraftBeerPi runs the steps still to come in order; in the book, anywhere */
function firstFree(ed) {
  if (st.page !== "steps") return 0;
  let f = 0;
  live(ed).forEach((s, i) => { if (s.status && s.status !== "I") f = i + 1; });
  return f;
}
/* where a new step of a kind belongs in a brew, so it rarely needs moving: BrewStart first, mash in before the rests,
   a rest before the mash out, the sparge after the mash, the boil after the sparge, the whirlpool after the boil,
   cooling last; anything else after the step that was open, or last. Returns the place among the live steps (0 is
   first) and where that is, in words */
function naturalPlace(ed, type) {
  const L = live(ed), cur = L.findIndex(s => s._k === (ed.from || ed.cur));
  const lastOf = f => { for (let i = L.length - 1; i >= 0; i--) if (f(L[i])) return i; return -1; };
  const isMash = s => s.type === "MashInStep" || s.type === "MashStep", isOut = s => s.type === "MashStep" && /mash\s*-?out/i.test(s.name || "");
  const after = i => i >= 0 ? {at: i + 1, where: `after ${nameIn(L[i])}`} : null, before = i => i >= 0 ? {at: i, where: `before ${nameIn(L[i])}`} : null;
  const brewStart = () => after(lastOf(s => s.type === "BrewStart")) || {at: 0, where: "first"};
  let pl;
  if (!L.length) pl = {at: 0, where: "the first step"};
  else if (type === "BrewStart") pl = {at: 0, where: "before everything else"};
  else if (type === "MashInStep") pl = before(L.findIndex(s => s.type === "MashStep")) || brewStart();
  else if (type === "MashStep") pl = before(L.findIndex(isOut)) || after(lastOf(isMash)) || brewStart();
  else if (type === "SpargeStep") pl = after(lastOf(isMash)) || brewStart();
  else if (type === "BoilStep") pl = after(Math.max(lastOf(s => s.type === "SpargeStep"), lastOf(isMash))) || brewStart();
  else if (type === "WhirlpoolStep") pl = after(lastOf(s => s.type === "WhirlpoolStep")) || after(lastOf(s => s.type === "BoilStep")) || {at: L.length, where: "at the end"};
  else if (type === "CooldownStep") pl = {at: L.length, where: "at the end"};
  else pl = cur >= 0 ? {at: cur + 1, where: `after ${nameIn(L[cur])}, the step you had open`} : {at: L.length, where: "at the end"};
  const f = firstFree(ed);
  if (pl.at < f) pl = {at: f, where: `after ${nameIn(L[f - 1])}: the steps before it have begun`};
  return pl;
}
// put a step in before the live step at place g, or after the last live step
function insertAt(ed, s, g) {
  const L = live(ed).filter(x => x !== s), target = L[g];
  if (target) return ed.doc.steps.splice(ed.doc.steps.indexOf(target), 0, s);
  const last = L[L.length - 1];
  ed.doc.steps.splice(last ? ed.doc.steps.indexOf(last) + 1 : ed.doc.steps.length, 0, s);
}
/* MOVE's PUT IT HERE: the step goes before the live step that was at place g (g past the end: last) */
function moveTo(ed, s, g) {
  const target = live(ed)[g];
  ed.doc.steps.splice(ed.doc.steps.indexOf(s), 1);
  if (target) ed.doc.steps.splice(ed.doc.steps.indexOf(target), 0, s);
  else { const L = live(ed), last = L[L.length - 1]; ed.doc.steps.splice(last ? ed.doc.steps.indexOf(last) + 1 : ed.doc.steps.length, 0, s); }
}

/* ---------- BrewStart: filled in from the rig, and its time in words ---------- */
/* the newest BrewStart there is: on Brew Day's steps, or in the newest recipe in the book that has one */
function newestBrewStart() {
  const onDay = st.loaded && st.loaded.steps.find(s => s.type === "BrewStart");
  if (onDay) return {s: onDay, from: `${st.loaded.name} on Brew Day`};
  for (const r of sorted()) { const s = r.steps.find(x => x.type === "BrewStart"); if (s) return {s, from: r.name}; }
  return null;
}
// the HLT: the vessel this recipe's sparge heats, or the one called HLT
const hltOf = steps => { const sp = steps.find(s => s.type === "SpargeStep" && s.props.Kettle); return sp ? sp.props.Kettle : (D.KETTLES.find(k => /\bHLT\b|hot liquor/i.test(k.name)) || {}).id || ""; };
const GAL_L = 3.785411784, LB_KG = 0.45359237;
/* the water a recipe needs, all of it through the HLT, from its import's figures (mash_numbers, in litres and kg): what
   goes into the boil kettle before the boil, less anything topped up there, plus what the grain keeps and what is lost
   under the mash. The grain's share is the Grain absorption setting's, since a BeerXML file has no figure for it. In
   the brewery's volume unit; null when the import didn't give the figures */
function recipeWater(mn) {
  const C = D.CONFIG, a = num(C.GRAIN_ABSORPTION), boil = mn ? num(mn.boil_l) : null, grain = mn ? num(mn.grain_kg) : null;
  if (boil == null || grain == null || a == null) return null;
  const perKg = D.UNIT === "F" ? a * GAL_L / LB_KG : a, toU = l => D.UNIT === "F" ? l / GAL_L : l;
  const before = boil - (num(mn.top_up_kettle_l) || 0), kept = grain * perKg;
  return {total: toU(before + kept + (num(mn.lauter_dead_l) || 0)), before: toU(before), kept: toU(kept), lost: toU(num(mn.lauter_dead_l) || 0),
    unit: D.UNIT === "F" ? "gal" : "L", rate: `${a} ${D.UNIT === "F" ? "gal/lb" : "L/kg"}`};
}
const v1 = n => (Math.round(n * 10) / 10).toFixed(1);
// the recipe a new BrewStart joins: Brew Day's copy on Brew Steps, else the book's copy being changed
const recipeNumbers = () => st.page === "steps" ? (st.loaded || {}).mash_numbers : st.ed && book(st.ed.file) ? book(st.ed.file).mash_numbers : null;
/* a new BrewStart: Ready by, with the HLT, its element and the Campden choice of the newest BrewStart, the water this
   recipe needs (else the newest BrewStart's: the last brew's), and the water temperature of its mash in. The time is
   left for the brewer: it is the one thing only he knows, and SAVE waits for it. The day is Tomorrow from noon by
   CraftBeerPi's clock (the night before), Today before */
function brewStartProps(ed) {
  const L = ed ? live(ed) : [], src = newestBrewStart(), q = src ? src.s.props : {}, mi = L.find(s => s.type === "MashInStep");
  const w = recipeWater(recipeNumbers()), unit = D.UNIT === "F" ? "gal" : "L";
  const props = {Timing: "Ready by", Mode: st.clock >= "12:00" ? "Tomorrow" : "Today", StartDate: "", StartTime: "",
    Heat_Kettle: q.Heat_Kettle || hltOf(L), Ready_Temp: mi && num(mi.props.Temp) != null ? mi.props.Temp : q.Ready_Temp ?? "",
    Volume: w ? Math.round(w.total * 10) / 10 : q.Volume ?? "", Volume_Unit: w ? unit : q.Volume_Unit || unit, Grain_Temp: "", Heater_Watts: q.Heater_Watts ?? "",
    Campden_Reminder: q.Campden_Reminder || "No", NotifyBefore: "", AutoNext: "Yes"};
  const got = [props.Heat_Kettle && `the ${nameOf(D.KETTLES, props.Heat_Kettle)}`, num(props.Heater_Watts) != null && `its ${fmt(num(props.Heater_Watts))} W element`,
    !w && num(props.Volume) != null && `${fmt(num(props.Volume))} ${props.Volume_Unit} of water, the last brew's`, props.Campden_Reminder === "Yes" && "the Campden reminder"].filter(Boolean);
  const from = src && got.length ? `Filled in from ${src.from}, the newest recipe with a BrewStart: ${andList(got)}.` : "No recipe has a BrewStart yet, so the element is blank.";
  const water = w ? ` The water, ${v1(w.total)} ${w.unit}, is what this recipe needs, worked out from the recipe file: ${v1(w.before)} ${w.unit} before the boil, and ${v1(w.kept)} ${w.unit} the grain keeps (Grain absorption in Settings, ${w.rate})${w.lost ? `, and ${v1(w.lost)} ${w.unit} lost under the mash` : ""}.`
    : num(props.Volume) == null ? " No water figure yet: Brew Day asks for it." : "";
  const temp = mi && num(mi.props.Temp) != null ? ` The water temperature is ${nameIn(mi)}'s, ${fmt(num(mi.props.Temp))} ${U}; on Brew Day the strike water box can change it.` : "";
  return {props, fill: `${from}${water}${temp}`};
}
const ymd = t => /^\d{4}-\d{2}-\d{2}$/.test(norm(t)) ? norm(t) : "";
/* how long until then, in words; on a simulator not at 1×, in real time too (Brew Day's BrewStart box, bsIn) */
function inWords(sec) {
  const m = Math.round(sec / 60), sc = speed();
  // how long it is keeps to one line ("in 9 h 48 min"), so the sentence breaks before it or after it
  const says = (sec < 60 ? "in under a minute" : m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`).replace(/ /g, NB);
  if (sc === 1) return says;
  const real = sec / sc, rm = Math.round(real / 60);
  return `${says}, ${real < 60 ? "under a real minute" : rm < 90 ? `about ${rm} real minute${rm === 1 ? "" : "s"}` : `about ${Math.round(real / 3600)} real hours`} at ${sc}×`;
}
/* when a BrewStart's time comes, as the plugin works it out, on CraftBeerPi's clock: Today and Tomorrow count from when
   START is pressed, and a time that has passed by then starts nothing by itself. Worded as Brew Day's BrewStart box
   words it, with how long that is from now */
function whenHTML(ed, s) {
  const p = s.props || {}, t = hm(p.StartTime), mode = norm(p.Mode) || "Today", ready = readyBy(p);
  if (!t || (mode === "Date" && !ymd(p.StartDate))) return "";
  const today = cbDate(), iso = mode === "Date" ? ymd(p.StartDate) : mode === "Tomorrow" ? dayAfter(today) : today, day = dateAt(iso);
  const dw = `${WEEK[day.getDay()]} ${day.getDate()} ${MON[day.getMonth()]}`, tt = timeOfDay(t);
  const rel = iso === today ? "today" : iso === dayAfter(today) ? "tomorrow" : "";
  const left = (Date.parse(`${iso}T${t}:00`) - Date.parse(`${today}T${st.clock}:00`)) / 1000;
  if (left <= 0) return `<span class="late">${tt} ${rel || dw} has passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW.</span>`;
  const L = live(ed), nx = L[L.indexOf(s) + 1], when = `<b>${tt}</b>${rel ? ` ${rel},` : ""} ${dw}: ${inWords(left)}.`;
  const what = ready ? `the ${esc(nameOf(D.KETTLES, p.Heat_Kettle) || "HLT")}'s water is hot by ${when}` : `${esc(nx ? nameIn(nx) : "the next step")} starts at ${when}`;
  return mode === "Date" ? `${what[0].toUpperCase()}${what.slice(1)}` : `With START pressed today, ${what}`;
}
/* what a BrewStart still needs before it can be saved, for a setting (said under it) or for the whole step (said by
   SAVE): the time always; the vessel and the element's watts for Ready by, which works out from them when to heat */
function needOf(s, label) {
  if (s.type !== "BrewStart" || s._removed) return "";
  const p = s.props || {}, ready = readyBy(p);
  // what's typed but isn't a time is said once the box is left, not while it's being typed
  if (label === "StartTime" && !hm(p.StartTime)) return !norm(s._tt) ? "Needed: without a time, BrewStart can't start." : s._typing ? ""
    : TWELVE ? "That isn't a time: type it as 7, 7:30 or 730, and tap AM or PM." : "That isn't a time: type it as 7, 7:30 or 19:30.";
  if (label === "StartDate" && p.Mode === "Date" && !ymd(p.StartDate)) return "Needed with DATE.";
  if (label === "Heat_Kettle" && ready && !norm(p.Heat_Kettle)) return "Needed for Ready by: the vessel to heat.";
  if (label === "Heater_Watts" && ready && num(p.Heater_Watts) == null) return "Needed for Ready by: it works out when to start heating from the element's watts.";
  return "";
}
function needsWhy(ed) {
  if (!ed) return "";
  const words = {StartTime: "Set BrewStart's time first.", StartDate: "Give BrewStart its date first.", Heat_Kettle: "Choose BrewStart's vessel first.", Heater_Watts: "Give BrewStart the element's watts first."};
  for (const s of live(ed)) {
    if (s.type !== "BrewStart" || !stepChange(ed, s).tag) continue;
    for (const l of Object.keys(words)) if (needOf(s, l)) return words[l];
  }
  return "";
}
// whether a setting shows: as the plugin's form shows it, any one of the kind's conditions for it is enough
function shows(s, label) {
  const c = ((CAT.KINDS[s.type] || {}).show || {})[label];
  return !c || c.some(cond => Object.entries(cond).every(([k, vals]) => vals.includes(norm((s.props || {})[k]))));
}

/* ---------- the frame: title bar, last event, tabs ---------- */
function paintFrame() {
  const nm = (QS.get("name") ?? D.BREWERY).trim() || "CraftBeerPi", br = $(".brand"), long = nm.length > LONG_NAME;
  $(".bname", br).textContent = nm;
  br.toggleAttribute("data-long", long);
  if (long) br.title = nm; else br.removeAttribute("title");
  document.title = `${nm} · ${st.page === "steps" ? "Brew Steps" : "Recipe Book"} (mockup)`;
  const bn = $("#banner"), lost = st.link === "lost";
  if (lost) { bn.dataset.tone = "alarm"; bn.innerHTML = `${ICON.warn}<span class="msg"><b>No connection</b>Controls are paused.</span>`; }
  else if (st.banner) { bn.dataset.tone = "prompt"; bn.innerHTML = `${ICON.bell}<span class="msg"><b>${esc(st.banner[0])}</b>${esc(st.banner[1])}</span><button type="button" class="act" data-bok>OK</button>`; }
  else { bn.dataset.tone = "ok"; bn.innerHTML = `${ICON.ok}<span class="msg">No alarms</span>`; }
  const e = st.events[0];
  $("#event").innerHTML = `<span class="line"><time>${timeOfDay(e[0], true)}</time>${esc(e[1])} · <span class="res ${e[3]}">${esc(e[2])}</span></span><button type="button" class="logbtn" data-log>LOG</button>`;
  $("#app").dataset.link = st.link;
  $("#link").dataset.link = st.link;
  $("#link-t").textContent = lost ? "No connection" : "Connected";
  const ho = $("#alloff");
  if (lost) { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = PAUSED; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  paintClock();
  $$(".tabs a").forEach(a => { if ((a.dataset.tab === "Recipe Book" && st.page === "book") || (a.dataset.tab === "Brew Steps" && st.page === "steps")) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}
/* the title bar's clock: CraftBeerPi's time, and where its clock isn't the screen's, its date and speed, as Brew Day's
   title bar shows them (clockSet). The weekday and SPEED give way on a phone */
function paintClock() {
  const el = $("#clock"), g = clockTag(), t = timeOfDay(st.clock);
  if (!g) { el.removeAttribute("data-sim"); el.textContent = t; return; }
  const d = dateAt(cbDate()), sc = speed();
  const line = [g.other ? `<span class="lg">${WEEK[d.getDay()].toUpperCase()} </span>${d.getDate()} ${MON[d.getMonth()].toUpperCase()}` : "", g.fast ? `${sc}×<span class="lg"> SPEED</span>` : ""].filter(Boolean).join(" · ");
  const said = `CraftBeerPi's clock${g.other ? `, ${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : ""}${g.fast ? `, running ${sc} times as fast` : ""}`;
  el.innerHTML = `<span class="ct">${t}</span><span class="cd" aria-hidden="true">${line}</span><span class="sr">${said}</span>`;
  el.setAttribute("data-sim", "");
}
/* BrewStart's When settings say what CraftBeerPi's clock reads where it isn't the screen's, in the words of Brew Day's
   BrewStart box: TODAY, TOMORROW and the time in words are all by that clock, and the brewer is looking here, not at the
   title bar, while he sets the time */
function cbClockHTML() {
  const g = clockTag();
  if (!g) return "";
  const d = dateAt(cbDate()), sc = speed(), t = timeOfDay(st.clock);
  // a narrow screen breaks the tag only after a "·", never inside a part
  const seen = ["CraftBeerPi's clock", `${WEEK[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}, ${t}`, g.fast ? `${sc}× speed` : ""].filter(Boolean).map(x => x.replace(/ /g, NB)).join(`${NB}· `);
  const said = `CraftBeerPi's clock: ${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${t}${g.fast ? `, running ${sc} times as fast` : ""}.`;
  return `<div class="cbbar"><p class="cbclk"><span class="seen" aria-hidden="true">${esc(seen)}</span><span class="sr">${esc(said)}</span></p></div>`;
}
// when the steps on Brew Day were loaded, on CraftBeerPi's clock, with the weekday when it isn't CraftBeerPi's today
const loadedAt = (L = st.loaded) => `${timeOfDay(L.at)}${L.day && L.day !== cbDate() ? NB + WEEK[dateAt(L.day).getDay()] : ""}`;
function event(text, res, cls) { st.events.unshift([st.clock + ":" + String(10 + (st.events.length * 7) % 49).padStart(2, "0"), text, res, cls]); }

/* ---------- buttons ---------- */
// a command button: label, its second line, and when it can't be used, why (said when it is tapped)
function cmd(cls, label, small, o = {}) {
  const why = o.why || (st.link === "lost" && o.live ? PAUSED : "");
  return `<button type="button" class="cmd${cls ? " " + cls : ""}${o.busy ? " busy" : ""}"${o.data || ""}${o.label ? ` aria-label="${esc(o.label)}"` : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${label}${small != null && small !== "" ? `<small>${small}</small>` : ""}</button>`;
}
function loadBtn(file, where) {
  const r = book(file), pend = st.pend.load === file, rule = loadRule(), why = pend ? WAIT : rule.why || "";
  const small = where === "col" ? (pend ? "waiting for CraftBeerPi" : "onto Brew Day") : "";
  return cmd("", pend ? "LOADING…" : "LOAD", small, {busy: pend, why, data: ` data-load="${esc(file)}" data-from="${where}"`, label: pend ? `Loading ${r.name}` : `Load ${r.name} onto Brew Day`});
}
function lampChip(b) {
  return `<p class="lch" data-s="${b.state}"><span class="on">On Brew Day</span><span class="lm"><i aria-hidden="true"></i>${b.state === "finished" ? "FINISHED" : statusWords(b).split(" · ")[0]}</span>${b.state === "finished" ? "" : `<span class="st2">${statusWords(b).split(" · ")[1]}</span>`}</p>`;
}

/* ---------- the recipe column ---------- */
/* while a step is being moved (ed.mv), the rows only show where things are: the buttons are PUT IT HERE between them,
   one before each place the step can go, skipping the two beside it, where it already is */
function stepsListHTML(steps, o = {}) {
  const ed = o.ed, b = o.run ? brew() : null, mv = ed && ed.mv ? steps.find(s => s._k === ed.mv) : null;
  const L = ed ? live(ed) : steps, mi = mv ? L.indexOf(mv) : -1, free = ed ? firstFree(ed) : 0;
  const slot = g => {
    if (!mv || g < free || g === mi || g === mi + 1) return "";
    const n = g < mi ? g + 1 : g;
    return `<li class="slot"><button type="button" class="put" data-put="${g}" aria-label="Put ${esc(nameIn(mv))} here, as step ${n}">PUT IT HERE<small>as step ${n}</small></button></li>`;
  };
  const rows = steps.map((s, i) => {
    const v = stepView(s), ch = ed ? stepChange(ed, s) : {tag: ""};
    let right;
    if (o.run) {
      right = s.status === "D" ? "✓ DONE" : s.status === "A" ? `<span class="run"><i aria-hidden="true"></i>RUNNING</span>${st.loaded.left != null && i === b.cur ? `<span class="left">${mmss(st.loaded.left)} LEFT</span>` : ""}`
        : (s.status === "S" || s.status === "E") ? "STOPPED" : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
    } else right = esc(kindName(s.type).toUpperCase());
    if (s === mv) right += `<span class="tag">MOVING</span>`;
    else if (ch.tag) right += `<span class="tag${ch.tag === "removed" ? " gone" : ""}">${ch.tag === "new" ? "NEW" : ch.tag === "removed" ? "REMOVED" : ch.tag === "moved" ? "MOVED" : "CHANGED"}</span>`;
    const cur = !mv && o.cur && s._k && o.cur === s._k ? ' aria-current="true"' : "";
    const cls = `step${s.status === "D" && o.run ? " done" : ""}${ch.tag === "removed" ? " removed" : ""}${s === mv ? " moving" : ""}`;
    const inner = `<span class="n">${i + 1}</span><span class="t">${esc(v.n)}</span>${v.p ? `<span class="p">${esc(v.p)}</span>` : ""}${v.note ? `<span class="p">${esc(v.note)}</span>` : ""}<span class="s">${right}</span>${v.adds ? `<span class="adds">${v.adds.map(a => `<span>${typeof a[0] === "number" ? `${fmt(a[0])} min` : esc(a[0])}</span><span>${esc(a[1])}</span><span>${esc(a[2])}</span>`).join("")}</span>` : ""}`;
    const go = s._k || "i" + i, before = mv && !s._removed ? slot(L.indexOf(s)) : "";
    if (mv) return `${before}<li id="c-${go}"><div class="${cls}">${inner}</div></li>`;
    return `<li id="c-${go}"><button type="button" class="${cls}" data-go="${go}"${cur} aria-label="Step ${i + 1}, ${esc(v.n)}${v.p ? ", " + esc(v.p) : ""}. Open its settings">${inner}</button></li>`;
  }).join("") + slot(L.length);
  const offer = o.bsadd && !mv ? `<li class="bsrow"><button type="button" class="bsadd" data-bsadd><span class="n" aria-hidden="true">+</span><b>BrewStart</b><span class="d">Hot water by a set time · goes in as step 1</span></button></li>` : "";
  return `<ol class="steps${mv ? " moving" : ""}" id="steps" aria-label="Steps">${offer}${rows}</ol>`;
}
/* MOVE's bar, over the steps while one is moved: what moves, FIRST and LAST for the far moves that are the usual ones
   (BrewStart to the top, a forgotten step to the end), and CANCEL. It stays at the top of the screen as the steps scroll */
function moveBarHTML(ed) {
  const s = stepByKey(ed.mv), L = live(ed), i = L.indexOf(s), free = firstFree(ed);
  return `<div class="mvbar" id="mvbar" role="group" aria-labelledby="mv-t"><p id="mv-t">Moving <b>${esc(nameIn(s))}</b>, now step ${i + 1}. Tap <b>PUT IT HERE</b> where it goes.</p>
    <div class="rctl">${cmd("", "FIRST", `as step ${free + 1}`, {data: ` data-put="${free}"`, why: i === free ? `It is step ${free + 1} already.` : ""})}${cmd("", "LAST", `as step ${L.length}`, {data: ` data-put="${L.length}"`, why: i === L.length - 1 ? "It is the last step already." : ""})}${cmd("", "CANCEL", "leave it there", {data: " data-mvcancel"})}</div></div>`;
}
function colHTML() {
  if (st.page === "steps") return colStepsHTML();
  const r = st.open && book(st.open);
  if (!r) return `<h2>The Recipe Book is empty</h2><p class="rmeta">Import a recipe from BeerSmith or Brewfather, or write one with + NEW.</p>`;
  const ed = st.pane === "edit" ? st.ed : null, back = `<a href="#list" class="back" data-back="list">‹ All recipes</a>`;
  if (ed) {
    const d = ed.doc, n = changes(ed);
    return `${back}<h2>${esc(d.name || "No name yet")}</h2>
      <p class="rmeta">Changing the Recipe Book's copy${n ? ` · <b>${n} ${n === 1 ? "change" : "changes"} not saved</b>` : ""}</p>
      <div class="rctl">${cmd("", "+ STEP", "add one", {data: " data-addstep"})}${cmd("", "NAME", "and notes", {data: ' data-go="r"'})}${cmd("", "CLOSE", "back to the book", {data: " data-close"})}</div>
      ${st.ask && st.ask.kind === "leave" && narrow() ? leaveHTML() : ""}
      ${ed.mv ? moveBarHTML(ed) : ""}${d.steps.length ? stepsListHTML(d.steps, {ed, cur: ed.cur, bsadd: !hasBrewStart(d.steps)}) : `<p class="empty"><b>No steps yet</b>+ STEP adds the first.</p>`}`;
  }
  const b = brew(), on = isLoaded(r.file) && b.state !== "finished";
  const meta = on ? `<span class="on${b.state === "running" ? " run" : ""}">On Brew Day · ${statusWords(b).toLowerCase().replace("ready to start", "ready to start")}</span>`
    : `Recipe Book${r.imported_from ? ` · imported from ${esc(r.imported_from)}, ${dateWords(r.modified, true)}` : ` · changed ${dateWords(r.modified, true)}`}`;
  const first = on ? cmd("", "BREW DAY", b.state === "running" ? "running there" : b.state === "ready" && !b.begun ? "start it there" : "where it is", {data: " data-tabgo=\"Brew Day\""}) : loadBtn(r.file, "col");
  const ask = st.ask && st.ask.kind === "load" && st.ask.from === "col" ? loadAskHTML(st.ask.file) : "";
  return `${back}<h2>${esc(r.name)}</h2>
    <p class="rmeta">${meta}</p>
    ${r.desc ? `<p class="desc">${esc(r.desc)}</p>` : ""}
    <div class="rctl">${first}${cmd("", "EDIT", "steps and name", {data: " data-edit"})}${cmd("", "COPY", "as a new recipe", {data: " data-copy"})}</div>
    ${ask}${offerHTML(r.file)}<p class="note" id="col-note">${esc(st.notes.col || "")}</p>
    ${stepsListHTML(r.steps, {bsadd: !hasBrewStart(r.steps)})}`;
}
/* after SAVE on the recipe that is on Brew Day: Brew Day keeps the copy it loaded, so the page says so, and LOAD AGAIN
   brings the change across, by LOAD's own rules */
function offerHTML(file) {
  if (st.offer !== file || !isLoaded(file)) return "";
  const b = brew();
  if (b.state === "running" || b.begun) return `<p class="pnote">Brew Day keeps the copy it loaded at ${esc(loadedAt())}, without this change, while its brew goes on. The change is for next time.</p>`;
  return `<div class="pnote"><b>Brew Day still has the copy loaded at ${esc(loadedAt())}</b>, without this change. LOAD AGAIN to brew with it.<div class="acts">${loadBtnAgain(file)}</div></div>`;
}
function loadBtnAgain(file) {
  const pend = st.pend.load === file, rule = loadRule();
  return cmd("", pend ? "LOADING…" : "LOAD AGAIN", pend ? "waiting for CraftBeerPi" : "replaces Brew Day's copy", {busy: pend, why: pend ? WAIT : rule.why || "", data: ` data-load="${esc(file)}" data-from="col"`});
}
function loadAskHTML(file) {
  const r = book(file), L = st.loaded, b = brew(), kept = loadedInBook(), old = L.name ? `<b>${esc(L.name)}</b>` : "the steps on Brew Day";
  const text = b.begun
    ? `Load <b>${esc(r.name)}</b> in place of ${old}? It ${whereStopped()}${kept ? "" : ", and it isn't in the Recipe Book, so it can't be loaded again"}. CraftBeerPi forgets which steps are done. Kettles, pumps and timers stay as they are.`
    : `Load <b>${esc(r.name)}</b> in place of ${old}? ${L.name ? `${esc(L.name)} isn't` : "They aren't"} in the Recipe Book, so ${L.name ? "it" : "they"} can't be loaded again. SAVE TO BOOK on Brew Steps keeps ${L.name ? "it" : "them"}. Kettles, pumps and timers stay as they are.`;
  return `<div class="confirm" role="group" aria-labelledby="ask-t" id="ask"><p id="ask-t">${text}</p><div class="acts"><button type="button" class="yes" data-yes="load">Load instead</button><button type="button" data-no>${b.begun ? `Stay at step ${b.cur + 1}` : "Don't load"}</button></div></div>`;
}
function colStepsHTML() {
  const L = st.loaded, b = brew();
  if (!L || b.state === "none") return `<h2>No recipe loaded</h2><p class="rmeta">Brew Day is brewing by hand.</p>
    <div class="rctl two">${cmd("", "RECIPE BOOK", "choose one", {data: ' data-tabgo="Recipe Book"'})}${cmd("", "+ STEP", "build steps here", {data: " data-addstep"})}</div>`;
  ensureBs();
  const ed = st.bs, n = changes(ed), un = unloadRule();
  const pendU = st.pend.unload, pendB = st.pend.tobook;
  const ask = st.ask && (st.ask.kind === "unload" ? unloadAskHTML() : st.ask.kind === "tobook" ? toBookHTML() : "");
  return `<h2>${esc(L.name || "Steps with no name")}</h2>
    <p class="rmeta"><span class="on${b.state === "running" ? " run" : ""}">On Brew Day · ${statusWords(b).toLowerCase()}</span>${n ? ` · <b>${n} ${n === 1 ? "change" : "changes"} not saved</b>` : ""}</p>
    <div class="rctl">${cmd("", "BREW DAY", b.state === "running" ? "running there" : "start it there", {data: ' data-tabgo="Brew Day"'})}${cmd("", pendB ? "SAVING…" : "SAVE TO BOOK", pendB ? "waiting for CraftBeerPi" : "keep for next time", {busy: pendB, data: " data-tobook", why: pendB ? WAIT : n ? "SAVE your changes to the brew steps first, then keep them in the book." : "", live: true})}${cmd("", pendU ? "UNLOADING…" : "UNLOAD", pendU ? "waiting for CraftBeerPi" : "brew by hand", {busy: pendU, data: " data-unload", why: pendU ? WAIT : un.why || ""})}</div>
    ${ask || ""}<p class="note" id="col-note">${esc(st.notes.col || "")}</p>
    ${ed.mv ? moveBarHTML(ed) : ""}${stepsListHTML(ed.doc.steps, {ed, cur: ed.cur, run: true, bsadd: b.state === "ready" && !b.begun && !hasBrewStart(ed.doc.steps)})}
    ${ed.mv ? "" : cmd("addstep", "+ STEP", "add one to this brew", {data: " data-addstep"})}`;
}
function unloadRule() {
  if (st.link === "lost") return {why: PAUSED};
  if (st.pend.load || st.pend.unload) return {why: WAIT};
  const b = brew();
  if (b.state === "running") return {why: runningWhy()};
  return b.begun || !loadedInBook() ? {ask: true} : {};
}
/* UNLOAD's question, in the brew-day screen's words for its own UNLOAD, so both screens ask the same */
function unloadAskHTML() {
  const b = brew(), kept = loadedInBook();
  const text = b.begun
    ? `Unload the recipe and brew by hand? CraftBeerPi forgets it ${whereStopped()}${kept ? ". The Recipe Book keeps the recipe" : ", and the recipe isn't in the Recipe Book, so it can't be loaded again"}. Kettles, pumps and timers stay as they are.`
    : "Unload the recipe and brew by hand? It isn't in the Recipe Book, so it can't be loaded again. Kettles, pumps and timers stay as they are.";
  return `<div class="confirm" role="group" aria-labelledby="ask-t" id="ask"><p id="ask-t">${text}</p><div class="acts"><button type="button" class="yes" data-yes="unload">Unload</button><button type="button" data-no>${b.begun ? `Stay at step ${b.cur + 1}` : "Don't unload"}</button></div></div>`;
}
/* a brew step as CraftBeerPi's book_data() keeps it (server change 8): the recipe, not this brew. A BrewStart's day,
   which Brew Day sets as a date so that a START after midnight still means the same morning, goes in as Tomorrow with
   its time; its grain temperature goes in blank, since Brew Day asks where the grain is for every brew. CraftBeerPi
   also puts the strike water back to its temperature before USE; this mockup has no USE, so nothing here does. */
function bookStep(s) {
  delete s.status;
  if (s.type === "BrewStart" && s.props) {
    if (s.props.Mode === "Date") Object.assign(s.props, {Mode: "Tomorrow", StartDate: ""});
    s.props.Grain_Temp = "";
  }
  return s;
}
function toBookHTML() {
  const L = st.loaded, r = book(L.file);
  const today = dateAt(cbDate()), name = L.name ? `${L.name}, ${today.getDate()} ${MON[today.getMonth()]}` : "";
  return `<div class="confirm" role="group" aria-labelledby="ask-t" id="ask"><p id="ask-t">Keep these steps in the Recipe Book. ${r ? `<b>Replace ${esc(r.name)}</b> there, the copy they were loaded from, saved ${dateWords(r.modified, true)}? Or save them as a new recipe:` : "Save them as a new recipe:"}</p>
    <input class="fld" id="tb-name" value="${esc(name)}" placeholder="Its name" aria-label="The new recipe's name"><p class="note" id="tb-note">${esc(st.notes.tb || "")}</p>
    <div class="acts">${r ? `<button type="button" class="yes" data-yes="replace">Replace the book's copy</button>` : ""}<button type="button"${r ? "" : ' class="yes"'} data-yes="asnew">Save as new</button></div>
    <div class="acts three"><button type="button" data-no>Cancel</button></div></div>`;
}
function leaveHTML() {
  const ed = E(), n = changes(ed), to = st.ask.to;
  return `<div class="confirm" role="group" aria-labelledby="lv-t" id="ask"><p id="lv-t"><b>${esc(ed.doc.name)}</b> has ${n} ${n === 1 ? "change" : "changes"} not saved. ${to ? `Save ${n === 1 ? "it" : "them"} before opening ${esc(to)}?` : "Save them before closing?"}</p>
    <div class="acts"><button type="button" class="yes" data-yes="save-go">Save and go</button><button type="button" data-yes="drop-go">Go without saving</button></div><div class="acts three"><button type="button" data-no>Stay</button></div></div>`;
}

/* ---------- the tool row ---------- */
function toolHTML() {
  if (st.page === "steps") {
    const ed = st.bs, n = ed ? changes(ed) : 0;
    if (!st.loaded) return `<h1>Brew Steps<small>The steps of the recipe on Brew Day. None is loaded.</small></h1>`;
    return `<h1>Brew Steps<small>Brew Day's copy of ${esc(st.loaded.name)}, loaded at ${esc(loadedAt())}. Changes here are for this brew.</small></h1>${saveBtns(n, "for this brew")}`;
  }
  if (st.pane === "edit") return `<h1>Changing a recipe<small>The Recipe Book's copy. Brew Day's isn't changed.</small></h1>${saveBtns(changes(st.ed), "in the Recipe Book")}`;
  if (st.pane === "import") return `<h1>Import a recipe<small>It goes into the Recipe Book. Brew Day isn't changed.</small></h1><div class="btns ed nb">${cmd("", "RECIPE BOOK", "back to the list", {data: " data-list"})}</div>`;
  if (st.pane === "copy") return `<h1>Copy a recipe<small>The copy is a new recipe in the book.</small></h1><div class="btns ed nb">${cmd("", "CANCEL", "", {data: " data-list"})}</div>`;
  if (st.pane === "new") return `<h1>A new recipe<small>It starts with no steps.</small></h1><div class="btns ed nb">${cmd("", "CANCEL", "", {data: " data-list"})}</div>`;
  return `<div class="find fi"><label for="q">Find a recipe</label><input id="q" type="search" autocomplete="off" spellcheck="false" value="${esc(st.q)}"><button type="button" class="clr" data-clear aria-label="Clear the search"${st.q ? "" : " hidden"}>CLEAR</button></div>
    <div class="btns">${cmd("", "+ NEW", "write one", {data: " data-new"})}${cmd("", "IMPORT", "from a file or Brewfather", {data: " data-import"})}</div>`;
}
function saveBtns(n, where) {
  const s = st.pend.save, need = !s && n ? needsWhy(E()) : "";
  return `<div class="btns ed sv">${cmd("", "UNDO", n ? `all ${n}` : "nothing yet", {data: " data-undoall", why: s ? WAIT : n ? "" : "Nothing to undo."})}${cmd("go", s ? "SAVING…" : "SAVE", s ? "waiting for CraftBeerPi" : need ? need.replace(/^Set/, "set").replace(/^Give/, "give").replace(/^Choose/, "choose").replace(/\.$/, "") : n ? `${n} ${n === 1 ? "change" : "changes"}, ${where}` : "nothing to save yet", {busy: s, data: " data-save", why: s ? WAIT : !n ? "Nothing has changed yet: change a step, then SAVE." : need, live: true})}</div>`;
}

/* ---------- the right-hand side ---------- */
function workHTML() {
  if (st.page === "steps") return platesHTML();
  if (st.pane === "edit") return platesHTML();
  if (st.pane === "import") return importHTML();
  if (st.pane === "copy" || st.pane === "new") return nameHTML();
  return bookHTML();
}
/* the book: a row per recipe, newest first, the numbers that tell recipes apart in fixed columns, LOAD at the end, or
   what the recipe on Brew Day is doing. FIND looks in names, where they came from, step names and additions */
function words() { return st.q.toLowerCase().split(/\s+/).filter(Boolean); }
function hay(r) { return [r.name, r.desc, r.imported_from, ...r.steps.map(s => `${s.name} ${kindName(s.type)}`), ...r.steps.flatMap(s => s.type === "BoilStep" ? additions(s.props).map(a => `${a[1]} ${a[2]}`) : [])].join(" \u0001 ").toLowerCase(); }
const hit = r => words().every(w => hay(r).includes(w));
function marked(text) {
  let h = esc(text);
  for (const w of words()) h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
  return h;
}
function hitLine(r) {
  const ws = words();
  if (!ws.length || ws.every(w => `${r.name} ${fromLine(r)}`.toLowerCase().includes(w))) return "";
  for (const s of r.steps) {
    if (s.type === "BoilStep") for (const a of additions(s.props)) { const t = `${a[2]} ${a[1]}`.trim(); if (ws.some(w => t.toLowerCase().includes(w))) return `<span class="hit">Boil: ${marked(t)} at ${typeof a[0] === "number" ? fmt(a[0]) + " min" : esc(a[0])}</span>`; }
    if (ws.some(w => (s.name || "").toLowerCase().includes(w))) return `<span class="hit">Step: ${marked(s.name)}</span>`;
  }
  return "";
}
function bookRowHTML(r) {
  const b = brew(), on = isLoaded(r.file) && b.state !== "finished", m = mashTemps(r.steps), bm = boilMin(r.steps);
  const act = on ? lampChip(b) : loadBtn(r.file, "row");
  const ask = st.ask && st.ask.kind === "load" && st.ask.from === "row" && st.ask.file === r.file ? loadAskHTML(r.file) : "";
  const note = st.notes.row && st.notes.row.file === r.file ? `<p class="note">${esc(st.notes.row.text)}</p>` : "";
  return `<li class="bk" data-f="${esc(r.file)}"${st.open === r.file ? ' aria-current="true"' : ""}>
    <button type="button" class="bko" data-open="${esc(r.file)}" aria-label="${esc(r.name)}: ${esc(bookLine(r.steps))}. Open it">
      <span class="bn">${marked(r.name)}</span><span class="bs">${marked(fromLine(r))}</span>${hitLine(r)}<span class="sum">${esc(bookLine(r.steps))}</span>
      <span class="c n">${r.steps.length}</span><span class="c m">${m.length ? `${m.map(fmt).join(", ")} ${U}` : "–"}</span><span class="c b">${bm ? `${fmt(bm)} min` : "–"}</span><span class="c d">${esc(dateWords(r.modified))}</span>
    </button><div class="act">${act}</div>${ask}${note}</li>`;
}
function bookHTML() {
  const list = sorted().filter(hit);
  if (!st.book.length) return `<div class="nohit"><b>No recipes yet</b><p>Import one from BeerSmith (as a BeerXML file) or from Brewfather, or write one with + NEW. Every recipe you import stays here.</p><p class="pnote-acts">${cmd("", "IMPORT", "from a file or Brewfather", {data: " data-import"})}</p></div>`;
  if (!list.length) return `<div class="nohit"><b>Nothing matches “${esc(st.q)}”</b><p>FIND looks in recipe names, where they came from, step names and boil additions.</p></div>`;
  return `<div class="book"><div class="bkh" aria-hidden="true"><span>Recipe · newest first</span><span>Steps</span><span>Mash</span><span>Boil</span><span>Changed</span><span></span></div>
    <ul class="bkl" aria-label="Recipes, newest first">${list.map(bookRowHTML).join("")}</ul></div>`;
}

/* ---------- plates: the recipe's name and notes, each step, + STEP, delete; on Brew Steps, an overview first ---------- */
function platesHTML() {
  if (st.page === "steps" && !st.loaded) return `<div class="plates"><section class="plate pick"><div class="phd"><h2>Nothing is loaded</h2><p class="sum">Brew Day is brewing by hand.</p></div><p class="lead">Choose a recipe in the <b>Recipe Book</b> and LOAD it, and its steps appear here. Or build steps here with + STEP: they run on Brew Day like a recipe's.</p></section>${E() && E().kinds ? kindsHTML() : ""}</div>`;
  const ed = E(), steps = ed.doc.steps, back = `<a href="#recipe" class="back" data-back="recipe">‹ Steps</a>`;
  let h = "";
  if (st.page === "steps") h += overviewHTML();
  else h += recipePlateHTML();
  h += steps.map((s, i) => stepPlateHTML(ed, s, i)).join("");
  if (ed.kinds) h += kindsHTML();
  if (st.page === "book") h += deletePlateHTML();
  return `${back}${st.ask && st.ask.kind === "leave" && !narrow() ? leaveHTML() : ""}<div class="plates" id="plates">${h}</div>`;
}
const pickCls = k => E() && E().pick === k ? " pick" : "";
function overviewHTML() {
  const L = st.loaded, b = brew();
  return `<section class="plate${pickCls("o")}" id="p-o" data-k="o" aria-labelledby="h-o"><div class="phd"><h2 id="h-o">This brew's steps</h2><p class="sum">Brew Day's copy of <b>${esc(L.name)}</b>, loaded at ${esc(loadedAt(L))} from the Recipe Book.</p></div>
    <p class="lead">Change a step here and SAVE: the change is for this brew. To keep it for next time, <b>SAVE TO BOOK</b>. The steps run on <b>Brew Day</b>, where START is held for a second.</p>
    ${b.state === "running" ? `<p class="lead">Step ${b.cur + 1}, ${esc(L.steps[b.cur].name)}, is running: CraftBeerPi doesn't change a step while it runs. The steps still to come can change.</p>` : ""}</section>`;
}
function recipePlateHTML() {
  const ed = st.ed, d = ed.doc;
  const row = (k, n, h, multi) => {
    const ch = norm(d[k]) !== norm(ed.orig[k]);
    return `<div class="row${ch ? " chg" : ""}" id="r-r-${k}" data-s="r" data-p="${k}"><div class="lb"><label class="nm" for="i-r-${k}" id="n-r-${k}">${n}</label>${h ? `<p class="wh">${h}</p>` : ""}<p class="ky">${k}</p></div>
      <div class="ct"><textarea class="fld" id="i-r-${k}" rows="1" data-s="r" data-p="${k}"${multi ? "" : ""}>${esc(d[k])}</textarea>${stHTML(ch, ed.orig[k], "r", k)}</div></div>`;
  };
  return `<section class="plate${pickCls("r")}" id="p-r" data-k="r" aria-labelledby="h-r"><div class="phd"><h2 id="h-r">Name and notes</h2><p class="sum">${d.steps.length} ${d.steps.length === 1 ? "step" : "steps"} · ${esc(bookLine(d.steps.filter(s => !s._removed)).split(" · ").slice(1).join(" · ") || "no mash or boil yet")}</p></div>
    <div class="part">${row("name", "Name", "As the Recipe Book, Brew Day and BrewScribe show it.")}${row("author", "Author", "Put on recipes you write or import: Settings, Recipe author.")}${row("desc", "Description", "A line or two of your own. Shown under the name in the book.", true)}</div></section>`;
}
// a changed row's status line: what it was, and UNDO
function stHTML(changed, was, k, label, wasShown) {
  if (!changed) return `<p class="st" id="st-${k}-${label}"></p>`;
  return `<p class="st" id="st-${k}-${label}"><span class="was">was ${esc(wasShown != null ? wasShown : norm(was) === "" ? "blank" : was)}</span><button type="button" class="lnk" data-undo="${k}" data-p="${label}">UNDO</button></p>`;
}
function stepPlateHTML(ed, s, i) {
  const kc = CAT.KINDS[s.type], ch = stepChange(ed, s), run = st.page === "steps" && isRunning(s), done = st.page === "steps" && s.status === "D";
  const L = live(ed), li = L.indexOf(s), free = firstFree(ed), begun = st.page === "steps" && s.status && s.status !== "I";
  // CraftBeerPi keeps every step up to the last one that has begun in its place, a step still to come among them too
  const held = st.page === "steps" && li < free;
  const moveWhy = begun ? "It has begun, so it stays where it ran." : held ? `${nameIn(L[free - 1])} has begun, so the steps above it stay where they are.`
    : L.length - free < 2 ? (free ? "It is the only step still to come." : "It is the only step.") : "";
  const tools = ch.tag === "removed" ? `<button type="button" class="lnk" data-unremove="${s._k}">UNDO</button>`
    : run ? "" : ed.mv === s._k ? `<button type="button" class="lnk" data-mvcancel>Cancel move</button>`
    : `<button type="button" class="lnk" data-move="${s._k}"${moveWhy ? ` aria-disabled="true" data-why="${esc(moveWhy)}"` : ""}>Move</button><button type="button" class="lnk" data-remove="${s._k}">${ch.tag === "new" ? "Drop it" : "Remove step"}</button>`;
  const head = `<div class="phd"><h2 id="h-${s._k}"><span class="n">${i + 1}</span>${esc(s.name || kindName(s.type))}</h2><div class="stools">${tools}</div>
    <p class="sum"><b>${esc(kindName(s.type))}</b>${kc ? ` · ${esc(kc.h)}` : " · A kind of step from a plugin."}${ch.moved && origOf(ed, s) ? ` Moved: it was step ${ed.orig.steps.indexOf(origOf(ed, s)) + 1}.` : ""}</p></div>`;
  if (ch.tag === "removed") return `<section class="plate removed${pickCls(s._k)}" id="p-${s._k}" data-k="${s._k}" aria-labelledby="h-${s._k}">${head}<p class="lead">Removed. It goes when you SAVE; UNDO keeps it.</p></section>`;
  const lockNote = run ? `<p class="pnote"><b>Running now.</b> CraftBeerPi doesn't change a step while it runs. To change it, STOP the brew on Brew Day first; or change the steps still to come.</p>`
    : done ? `<p class="pnote"><b>Done.</b> A change here counts only if the recipe is reset to step 1.</p>` : "";
  const moving = ed.mv === s._k ? `<p class="pnote mv">Moving it: tap <b>PUT IT HERE</b> in the steps where it goes, or FIRST or LAST above them.</p>` : "";
  const placed = ch.tag === "new" && s._where ? `<p class="pnote"><b>Went in as step ${li + 1}, ${esc(s._where)}.</b> MOVE puts it elsewhere.</p>` : "";
  const parts = kc ? kc.parts : [{rows: Object.keys(s.props || {})}];
  const body = [{rows: ["name", "type"]}, ...parts].map(p => {
    const rows = p.adds ? addsHTML(ed, s, run) : (p.rows || []).filter(l => shows(s, l)).map(l => rowHTML(ed, s, l, run)).join("");
    const when = p.when ? `<p class="whenl" id="when-${s._k}">${whenHTML(ed, s)}</p>` : "";
    const fill = p.fill && s._fill && ch.tag === "new" ? `<p class="pnote fill">${esc(s._fill)}</p>` : "";
    return `<div class="part">${p.h ? `<h3>${esc(p.h)}</h3>` : ""}${p.when ? cbClockHTML() : ""}${fill}${rows}${when}${p.note ? `<p class="foot">${esc(p.note)}</p>` : ""}</div>`;
  }).join("");
  return `<section class="plate${run ? " locked" : ""}${pickCls(s._k)}" id="p-${s._k}" data-k="${s._k}" aria-labelledby="h-${s._k}">${head}${lockNote}${moving}${placed}${body}</section>`;
}
function rowHTML(ed, s, label, locked) {
  const o = origOf(ed, s), isName = label === "name", isType = label === "type";
  const m = isName ? {n: "Name", h: "As Brew Day, the event line and BrewScribe show it."} : isType ? {n: "Kind of step", h: "What it does. Changing it keeps the settings the new kind also has."} : meta(s.type, label);
  const v = isName ? s.name : isType ? s.type : (s.props || {})[label];
  const ov = !o ? undefined : isName ? o.name : isType ? o.type : (o.props || {})[label];
  const changed = !!o && !same(v, ov);
  const key = isName ? "name" : isType ? `type · ${s.type}` : label;
  const was = !changed ? null : isType ? kindName(ov) : isName ? ov : shownValue(s, label, ov);
  // a time box says what it reads, as it's typed now rather than picked
  const help = m.h && !isName && !isType && typeOf(s.type, label) === "time" ? `${m.h} ${TWELVE ? "Type it as 7, 7:30 or 730, and tap AM or PM." : "Type it as 7, 7:30 or 19:30."}` : m.h;
  return `<div class="row${changed ? " chg" : ""}" id="r-${s._k}-${label}" data-s="${s._k}" data-p="${label}"><div class="lb"><label class="nm" for="i-${s._k}-${label}" id="n-${s._k}-${label}">${esc(m.n)}</label>${help ? `<p class="wh" id="wh-${s._k}-${label}">${esc(help)}</p>` : ""}<p class="ky">${esc(key)}</p></div>
    <div class="ct">${ctlHTML(s, label, v, locked)}${stHTML(changed, ov, s._k, label, was)}<p class="why" id="need-${s._k}-${label}">${esc(needOf(s, label))}</p></div></div>`;
}
function ctlHTML(s, label, v, locked) {
  const id = `i-${s._k}-${label}`, dis = locked ? " disabled" : "", data = ` data-s="${s._k}" data-p="${label}"`;
  if (label === "name") return `<textarea class="fld" id="${id}" rows="1"${data}${dis}>${esc(v)}</textarea>`;
  if (label === "type") {
    const known = Object.keys(CAT.KINDS);
    return `<select class="fld" id="${id}"${data}${dis}>${(known.includes(v) ? known : [v, ...known]).map(t => `<option value="${esc(t)}"${t === v ? " selected" : ""}>${esc(kindName(t))}</option>`).join("")}</select>`;
  }
  const t = typeOf(s.type, label), m = meta(s.type, label);
  if (Array.isArray(t)) {
    // a blank setting shows the choice the step takes for it (blankAs): a BrewStart saved with no Timing runs as Start at
    const opts = m.opts ? Object.keys(m.opts) : t, cur = norm(v) === "" && m.blankAs ? m.blankAs : norm(v);
    return `<div class="seg" role="radiogroup" aria-labelledby="n-${s._k}-${label}" id="${id}">${opts.map(x => `<button type="button" role="radio" aria-checked="${String(cur === x)}" data-set="${esc(x)}"${data}${locked ? ' aria-disabled="true" data-why="Running now: CraftBeerPi doesn\'t change a step while it runs."' : ""}>${esc((m.opts || {})[x] || x)}</button>`).join("")}</div>`;
  }
  if (t === "kettle" || t === "sensor" || t === "actor") {
    const list = t === "kettle" ? D.KETTLES : t === "sensor" ? D.SENSORS : D.ACTORS;
    return `<select class="fld" id="${id}"${data}${dis}><option value=""${norm(v) === "" ? " selected" : ""}>${esc(m.blank || "None chosen")}</option>${list.map(x => `<option value="${esc(x.id)}"${x.id === v ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`;
  }
  if (t === "number") { const u = unitOf(m, s); return `<span class="numf"><input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(norm(v))}"${data}${dis}${m.blank ? ` placeholder="${esc(m.blank)}"` : ""}>${u ? `<span>${esc(u)}</span>` : ""}</span>`; }
  if (t === "time") return timeCtl(s, label, v, locked);
  if (t === "date") return `<input class="fld" type="date" id="${id}" value="${esc(norm(v))}"${data}${dis}>`;
  return `<textarea class="fld" id="${id}" rows="1"${data}${dis}>${esc(norm(v))}</textarea>`;
}
/* a time of day, typed in a box and read by readTime(); with 12-hour times, AM and PM are two buttons beside it, as a
   phone's number keys have no letters. A box with no time yet shows AM: BrewStart's water is nearly always for the
   morning. What can't be read stays in the box as typed (_tt), and the step has no time until it can be */
function timeCtl(s, label, v, locked) {
  const id = `i-${s._k}-${label}`, t = hm(v), half = t ? halfOf(t) : s._half || "am";
  const why = locked ? ' aria-disabled="true" data-why="Running now: CraftBeerPi doesn\'t change a step while it runs."' : "";
  const box = `<input class="fld tmbox" id="${id}" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="${TWELVE ? "7:00" : "07:00"}" value="${esc(t ? boxText(t) : norm(s._tt))}" data-s="${s._k}" data-p="${label}" aria-describedby="wh-${s._k}-${label}"${locked ? " disabled" : ""}>`;
  if (!TWELVE) return box;
  const b = h => `<button type="button" role="radio" aria-checked="${String(half === h)}" data-half="${h}" data-s="${s._k}" data-p="${label}"${why}>${h.toUpperCase()}</button>`;
  return `<div class="tmf" role="group" aria-labelledby="n-${s._k}-${label}">${box}<div class="seg ampm" role="radiogroup" aria-label="AM or PM" id="${id}-half">${b("am")}${b("pm")}</div></div>`;
}
/* the boil's additions: one line each, minutes before the end and what to add; six at most, as the boil step has six
   reminders; and first wort */
function addsHTML(ed, s, locked) {
  const p = s.props, o = origOf(ed, s), used = [];
  for (let i = 1; i <= 6; i++) if (num(p[`Hop_${i}`]) != null || norm(p[`Hop_${i}_text`]) !== "") used.push(i);
  const dis = locked ? " disabled" : "";
  const line = i => {
    const ch = !!o && (!same(p[`Hop_${i}`], o.props[`Hop_${i}`]) || !same(p[`Hop_${i}_text`], o.props[`Hop_${i}_text`]));
    return `<li id="r-${s._k}-Hop_${i}" class="${ch ? "chg" : ""}"><span class="numf"><input id="i-${s._k}-Hop_${i}" inputmode="decimal" autocomplete="off" value="${esc(norm(p[`Hop_${i}`]))}" data-s="${s._k}" data-p="Hop_${i}" aria-label="Addition ${i}, minutes left in the boil"${dis}><span>min</span></span><textarea class="fld" rows="1" id="i-${s._k}-Hop_${i}_text" data-s="${s._k}" data-p="Hop_${i}_text" aria-label="Addition ${i}, what to add"${dis}>${esc(norm(p[`Hop_${i}_text`]))}</textarea><button type="button" class="lnk" data-rmadd="${i}" data-s="${s._k}"${locked ? ' aria-disabled="true" data-why="Running now: CraftBeerPi doesn\'t change a step while it runs."' : ""}>Remove</button></li>`;
  };
  const full = used.length >= 6;
  return `${used.length ? `<div class="addh" aria-hidden="true"><span>Minutes left</span><span>What to add</span><span></span></div><ul class="addl">${used.map(line).join("")}</ul>` : `<p class="foot">No additions yet.</p>`}
    <div class="addf">${cmd("", "+ ADDITION", full ? "six already" : `${6 - used.length} more possible`, {data: ` data-addadd="${s._k}"`, why: locked ? "Running now: CraftBeerPi doesn't change a step while it runs." : full ? "The boil step has six reminders. For a seventh, set a timer on Brew Day." : ""})}<span class="fx">Six at most: the boil step has six reminders.</span></div>
    ${rowHTML(ed, s, "First_Wort", locked)}${p.First_Wort === "Yes" ? rowHTML(ed, s, "First_Wort_text", locked) : ""}`;
}
function kindsHTML() {
  const ed = E();
  const groups = CAT.GROUPS.map(([g, name]) => {
    const ks = Object.keys(CAT.KINDS).filter(k => CAT.KINDS[k].g === g);
    return `<section aria-labelledby="kg-${g}"><h3 id="kg-${g}">${esc(name)}</h3><div class="kl">${ks.map(k => {
      const pl = ed ? naturalPlace(ed, k) : null;
      return `<button type="button" class="kind" data-kind="${k}"><b>${esc(CAT.KINDS[k].n)}</b><span>${esc(CAT.KINDS[k].h)}</span>${pl ? `<em>Goes in as step ${pl.at + 1}, ${esc(pl.where)}</em>` : ""}<small>${k}</small></button>`;
    }).join("")}</div></section>`;
  }).join("");
  return `<section class="plate pick${E() && E().landKinds ? " land" : ""}" id="p-kinds" data-k="kinds" aria-labelledby="h-kinds"><div class="phd"><h2 id="h-kinds">Add a step</h2><p class="sum">Choose what kind. It goes in where that kind belongs in a brew and opens for its settings; MOVE puts it elsewhere. Nothing is saved until SAVE.</p></div>
    <div class="kinds">${groups}</div><p class="addf">${cmd("", "CANCEL", "add nothing", {data: " data-kinds-close"})}</p></section>`;
}
function deletePlateHTML() {
  const r = book(st.ed.file);
  if (!r) return "";
  const asking = st.ask && st.ask.kind === "delete", pend = st.pend.del;
  const on = isLoaded(r.file) ? " Brew Day keeps its own copy until another recipe is loaded." : "";
  return `<section class="plate${pickCls("del")}" id="p-del" data-k="del" aria-labelledby="h-del"><div class="phd"><h2 id="h-del">Delete this recipe</h2><p class="sum">Takes it out of the Recipe Book. It asks first.</p></div>
    ${asking ? `<div class="confirm" role="group" aria-labelledby="del-t" id="ask"><p id="del-t">Delete <b>${esc(r.name)}</b> from the Recipe Book? This can't be undone.${on}</p><div class="acts"><button type="button" class="yes" data-yes="delete">${pend ? "Deleting…" : "Delete it"}</button><button type="button" data-no>Keep it</button></div></div>`
      : `<p class="addf">${cmd("del", "DELETE", "asks first", {data: " data-del", live: true})}</p>`}</section>`;
}

/* ---------- copy and new: a name first ---------- */
function nameHTML() {
  const copy = st.pane === "copy", r = copy && book(st.open), v = copy ? `${r.name} copy` : "";
  return `<a href="#list" class="back" data-back="list">‹ All recipes</a><div class="plates"><section class="plate pick" aria-labelledby="h-nm"><div class="phd"><h2 id="h-nm">${copy ? `Copy ${esc(r.name)}` : "A new recipe"}</h2><p class="sum">${copy ? "Every step comes with it. The copy opens so you can change it." : "It opens with no steps; + STEP adds the first."}</p></div>
    <div class="row"><div class="lb"><label class="nm" for="nm-in">Name</label><p class="wh">As the Recipe Book and Brew Day show it.</p></div><div class="ct"><input class="fld" id="nm-in" value="${esc(v)}" autocomplete="off"${copy ? "" : ' placeholder="Its name"'}><p class="note" id="nm-note">${esc(st.notes.nm || "")}</p></div></div>
    <p class="addf">${cmd("go", copy ? "MAKE THE COPY" : "MAKE IT", copy ? "and open it" : "and add its steps", {data: " data-make", live: true})}${cmd("", "CANCEL", "", {data: " data-list"})}</p></section></div>`;
}

/* ---------- importing ---------- */
function importHTML() {
  const I = st.imp, f = D.FILES[I.file], C = D.CONFIG;
  const rows = f ? f.recipes.map(x => {
    const busy = I.busy === x.id, got = I.result && I.result.ok && I.result.id === x.id;
    return `<li class="imr${got ? " got" : ""}"><span class="in">${esc(x.name)}</span>${book(x.file || "") ? "" : ""}<span class="is">${got ? "Imported" : inBook(x.name) ? "Its earlier import is in the book; importing replaces it" : "Not in the book yet"}</span>${cmd("", busy ? "IMPORTING…" : got ? "IMPORT AGAIN" : "IMPORT", busy ? "waiting for CraftBeerPi" : "into the book", {busy, why: busy ? WAIT : I.busy ? WAIT : "", data: ` data-imp="${x.id}"`, live: true, label: `Import ${x.name} into the Recipe Book`})}</li>`;
  }).join("") : "";
  const res = I.result ? resultHTML(I.result) : "";
  const fileH = f ? `<p class="fileh"><b>${esc(f.name)}</b><span>${f.kept ? "the last file sent, kept by CraftBeerPi" : "just sent"} · ${esc(f.kind)} · ${f.recipes.length} ${f.recipes.length === 1 ? "recipe" : "recipes"}</span></p><ul class="iml">${rows}</ul>` : "";
  const bf = I.bf ? bfHTML() : `<p class="pnote">Brewfather isn't set up here. To list your Brewfather recipes, add your <b>Brewfather user ID</b> and <b>API key</b> in Settings, under Recipes.<span class="acts">${cmd("", "SETTINGS", "Recipes", {data: ' data-tabgo="Settings"'})}</span></p>`;
  const uses = `<dl class="uses">
      <dt>Mash tun<small>Mash in and the rests heat it.</small></dt><dd>${esc(nameOf(D.KETTLES, C.MASH_TUN) || "None chosen")}<small>MASH_TUN</small></dd>
      <dt>Boil kettle<small>The boil, whirlpool and cooling happen in it.</small></dt><dd>${esc(nameOf(D.KETTLES, C.BoilKettle) || "None chosen")}<small>BoilKettle</small></dd>
      <dt>Boil temperature<small>The recipe file doesn't give one.</small></dt><dd>${fmt(C.steps_boil_temp)} ${U}<small>steps_boil_temp</small></dd>
      <dt>Whirlpool temperature<small>A BeerXML file never gives one. Set it before importing a recipe that wants another.</small></dt><dd>${fmt(C.steps_whirlpool_temp)} ${U}<small>steps_whirlpool_temp</small></dd>
      <dt>The sparge<small>Heats the sparge water and leaves the pumps to you.</small></dt><dd>A sparge step<small>steps_sparge</small></dd>
      <dt>Mash in and mash out<small>Added when the recipe has none.</small></dt><dd>${C.AddMashInStep === "Yes" ? "Mash in" : ""}${C.AddMashInStep === "Yes" && C.AddMashOutStep === "Yes" ? " and " : ""}${C.AddMashOutStep === "Yes" ? "mash out" : ""}<small>AddMashInStep, AddMashOutStep</small></dd></dl>
      <p class="addf">${cmd("", "SETTINGS", "change them", {data: ' data-tabgo="Settings"'})}</p>`;
  const over = st.dragOver ? " over" : "";
  return `<a href="#list" class="back" data-back="list">‹ All recipes</a><div class="plates">
    <section class="plate pick" id="p-file" aria-labelledby="h-file"><div class="phd"><h2 id="h-file">From a file</h2><p class="sum">A BeerXML file from BeerSmith or most brewing programs, an MMuM file, or a Kleiner Brauhelfer database.</p></div>
      ${res}
      <div class="drop${over}" id="drop"><p class="big">Drop a recipe file here</p><p class="or">or</p>${cmd("go", st.pend.upload ? "SENDING…" : "CHOOSE FILE", st.pend.upload ? "waiting for CraftBeerPi" : ".xml, .json or .sqlite", {busy: st.pend.upload, data: " data-choose", live: true})}</div>
      <p class="how"><b>From BeerSmith:</b> select the recipe in My Recipes, then File, Export Selected Items, BeerXML. One recipe a file is simplest.</p>
      ${fileH}
      <p class="how">IMPORT puts the recipe in your Recipe Book; Brew Day isn't changed until you LOAD it. Importing a recipe again under the same name replaces the earlier import, never a recipe you've changed or saved here.</p></section>
    <section class="plate pick" id="p-bf" aria-labelledby="h-bf"><div class="phd"><h2 id="h-bf">From Brewfather</h2><p class="sum">Your recipes in Brewfather's web app.</p></div>${bf}</section>
    <section class="plate pick" id="p-uses" aria-labelledby="h-uses"><div class="phd"><h2 id="h-uses">Imports use these settings</h2><p class="sum">What a recipe file can't say, CraftBeerPi takes from Settings as it imports.</p></div>${uses}</section></div>`;
}
const inBook = name => st.book.some(r => r.name === name && r.imported_from);
function resultHTML(R) {
  if (!R.ok) return `<div class="fail" role="alert"><b>Not imported</b><p>${esc(R.why)}</p><div class="acts">${cmd("", "SETTINGS", "Brewhouse", {data: ' data-tabgo="Settings"'})}</div></div>`;
  const r = book(R.file);
  return `<div class="impok" role="status">${ICON.tick}<p><b>Imported ${esc(r.name)}.</b> ${R.replaced ? "Its earlier import in the Recipe Book was replaced." : "It's in your Recipe Book, at the top."} ${narrow() ? "Open it to check its steps before you brew it." : "Check its steps on the left before you brew it."}</p><ul class="bkl">${bookRowHTML(r)}</ul></div>
    ${R.warn ? `<div class="warn" role="note"><b>${esc(R.warn[0])}</b><p>${esc(R.warn[1])}</p></div>` : ""}`;
}
function bfHTML() {
  const q = st.imp.bq.toLowerCase(), list = D.BREWFATHER.filter(x => x.name.toLowerCase().includes(q));
  return `<div class="bff"><div class="find"><label for="bq">Find</label><input id="bq" type="search" autocomplete="off" value="${esc(st.imp.bq)}" style="padding-left:70px"></div>${cmd("", "REFRESH LIST", "asks Brewfather again", {data: " data-bfre", live: true})}</div>
    <p class="fileh"><b>${D.BREWFATHER.length} recipes</b><span>from Brewfather, A to Z${q ? ` · ${list.length} match` : ""}</span></p>
    <ul class="iml">${list.map(x => `<li class="imr"><span class="in">${esc(x.name)}</span><span class="is">${inBook(x.name) || st.book.some(r => r.name === x.name) ? "In the book" : "Not in the book yet"}</span>${cmd("", "IMPORT", "into the book", {data: ` data-bfimp="${x.id}"`, live: true, label: `Import ${x.name} from Brewfather`})}</li>`).join("")}</ul>`;
}

/* ---------- drawing it all ---------- */
function render() {
  paintFrame();
  $("#tool").innerHTML = toolHTML();
  $("#col").innerHTML = colHTML();
  $("#work").innerHTML = workHTML();
  $("#pane").setAttribute("aria-label", st.page === "steps" ? "This brew's steps" : st.pane === "edit" ? "The recipe's settings" : st.pane === "import" ? "Import a recipe" : "Recipe Book");
  const ed = E(), n = ed ? changes(ed) : 0, bar = $("#savebar"), editing = st.page === "steps" ? !!st.loaded : st.pane === "edit";
  bar.hidden = !(editing && (n || st.pend.save));
  if (!bar.hidden) bar.innerHTML = `<p>${st.pend.save ? "Saving…" : `${n} ${n === 1 ? "change" : "changes"} not saved`}</p>${saveBtns(n, st.page === "steps" ? "for this brew" : "in the book")}`;
  $("#app").toggleAttribute("data-dirty", !bar.hidden);
  applyView();
  grow();
  fitTool();
}
// the tool row's height where it sticks to the top of the window (701 to 1179 px), else 0
const stickTop = () => { const t = $("#tool"); return t && getComputedStyle(t).position === "sticky" ? t.offsetHeight : 0; };
// the clock band and the time in words stay clear of it
const fitTool = () => document.documentElement.style.setProperty("--tool-h", stickTop() + "px");
function applyView() {
  const m = $("#main");
  m.dataset.view = narrow() ? st.view : "split";
}
function grow() { $$("textarea.fld").forEach(t => { if (!t.getClientRects().length) return; t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }); }
// a change typed in a box: the row, the column's step and the counts follow, and the box keeps its focus
function paintEdit(k, label) {
  const ed = E();
  if (k === "r") {
    const ch = norm(ed.doc[label]) !== norm(ed.orig[label]), row = $(`#r-r-${label}`);
    if (row) { row.classList.toggle("chg", ch); $(`#st-r-${label}`).outerHTML = stHTML(ch, ed.orig[label], "r", label); }
  } else {
    const s = stepByKey(k), o = origOf(ed, s), row = $(`#r-${k}-${label}`);
    if (row && o) {
      if (/^Hop_\d(_text)?$/.test(label)) { const i = label.slice(4, 5); const li = $(`#r-${k}-Hop_${i}`); li.classList.toggle("chg", !same(s.props[`Hop_${i}`], o.props[`Hop_${i}`]) || !same(s.props[`Hop_${i}_text`], o.props[`Hop_${i}_text`])); }
      else {
        const v = label === "name" ? s.name : s.props[label], ov = label === "name" ? o.name : o.props[label], ch = !same(v, ov);
        row.classList.toggle("chg", ch);
        $(`#st-${k}-${label}`).outerHTML = stHTML(ch, ov, k, label, ch ? (label === "name" ? ov : shownValue(s, label, ov)) : null);
      }
    }
    if (s.type === "BrewStart") { const w = $(`#when-${k}`), nd = $(`#need-${k}-${label}`); if (w) w.innerHTML = whenHTML(ed, s); if (nd) nd.textContent = needOf(s, label); }
    if (label === "name") { const h = $(`#h-${k}`); if (h) h.innerHTML = `<span class="n">${ed.doc.steps.indexOf(s) + 1}</span>${esc(s.name || kindName(s.type))}`; }
  }
  const sc = $("#steps"), top = sc ? sc.scrollTop : 0;
  $("#col").innerHTML = colHTML();
  if ($("#steps")) $("#steps").scrollTop = top;
  $("#tool").innerHTML = toolHTML();
  const n = changes(ed), bar = $("#savebar");
  bar.hidden = !n;
  if (n) bar.innerHTML = `<p>${n} ${n === 1 ? "change" : "changes"} not saved</p>${saveBtns(n, st.page === "steps" ? "for this brew" : "in the book")}`;
  $("#app").toggleAttribute("data-dirty", !bar.hidden);
  fitTool();
}

/* ---------- moving about ---------- */
function setCur(k) {
  const ed = E();
  if (!ed || ed.cur === k) return;
  ed.cur = k;
  $$(".col .step").forEach(b => b.dataset.go === k ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
  const c = $(`#c-${k}`), sc = $("#steps");
  if (c && sc && wide()) { const top = c.offsetTop - sc.offsetTop; if (top < sc.scrollTop || top + c.offsetHeight > sc.scrollTop + sc.clientHeight) sc.scrollTop = top - 8; }
}
// the plate nearest the top of the pane is the one the column marks as where you are
function spy() {
  const ed = E();
  if (!ed || narrow()) return;
  const pane = $("#pane"), top = wide() ? pane.getBoundingClientRect().top : 80, plates = $$("#plates > .plate");
  let cur = plates.length ? plates[0].dataset.k : null;
  for (const p of plates) if (p.getBoundingClientRect().top - top < 140) cur = p.dataset.k;
  // the delete box and + STEP's kinds aren't steps: while they are at the top, no step is marked
  if (cur) setCur(cur);
}
function land(el) { el.classList.remove("land"); void el.offsetWidth; el.classList.add("land"); setTimeout(() => el.classList.remove("land"), 1300); }
/* the time in words is what shows a slip of twelve hours, so while BrewStart's time is being set it stays in view: the
   page scrolls as little as it can, clear of the sticky tool row and of a phone's save bar and tabs (the sentence's
   scroll margins). Called after a key or a tap, never as a box is left: a scroll between a finger going down and coming
   up can put the tap on another control. A phone's on-screen keyboard covers the page without making it shorter, so the
   visual viewport is checked too */
function keepWhenInView(k) {
  const w = $(`#when-${k}`);
  if (!w || !w.textContent.trim()) return;
  w.scrollIntoView({block: "nearest"});
  const vv = window.visualViewport;
  if (vv && !wide()) { const over = w.getBoundingClientRect().bottom + 12 - (vv.offsetTop + vv.height); if (over > 0) window.scrollBy(0, over); }
}
/* a new BrewStart opens at its When settings with its time box ready: the time is the one thing only the brewer knows.
   The column (or, one thing at a time, the way back) still says where it went */
function showWhen(k) {
  jump(k);
  const t = $(`#r-${k}-Timing`), part = t && t.closest(".part"), f = $(`#i-${k}-StartTime`);
  if (!part) return;
  const put = () => {
    if (wide()) { const pane = $("#pane"); pane.scrollTop += part.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8; }
    else window.scrollTo(0, part.getBoundingClientRect().top + scrollY - (stickTop() ? stickTop() + 16 : 8));
  };
  put();
  if (f) { f.focus({preventScroll: true}); put(); }
  keepWhenInView(k);
}
function jump(k) {
  const ed = E();
  if (!ed) return;
  if (narrow()) { ed.pick = k; ed.cur = k; st.view = "plate"; render(); window.scrollTo(0, 0); return; }
  setCur(k);
  const p = $(`#p-${k}`);
  if (!p) return;
  if (wide()) { const pane = $("#pane"); pane.scrollTop = p.offsetTop - pane.offsetTop - 8; }
  else window.scrollTo({top: p.getBoundingClientRect().top + scrollY - ($("#tool").offsetHeight + 16)});
  land(p);
  ed.cur = k;
  $$(".col .step").forEach(b => b.dataset.go === k ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 4000);
}
function say(where, file, text) {
  if (where === "row") st.notes.row = {file, text}; else st.notes.col = text;
  render();
  // the note goes by itself; only the note, so nothing being typed elsewhere loses its place
  clearTimeout(say.t); say.t = setTimeout(() => { st.notes = {}; $$(".col .note, .bk .note").forEach(n => { n.textContent = ""; }); }, 6000);
}
const later = f => setTimeout(f, 900);

/* ---------- commands ---------- */
function pressLoad(file, from) {
  const rule = loadRule();
  if (rule.why) return say(from, file, rule.why);
  if (rule.ask) { st.ask = {kind: "load", file, from}; render(); const a = $("#ask"); if (a) a.scrollIntoView({block: "nearest"}); return; }
  doLoad(file);
}
function doLoad(file) {
  st.ask = null; st.pend.load = file; render();
  later(() => {
    delete st.pend.load;
    const r = book(file);
    loadFrom(file, "ready", 0);
    st.loaded.at = st.clock; st.loaded.day = cbDate();
    st.bs = null; st.offer = null;
    event(`${r.name} loaded`, "confirmed", "ok");
    $("#sr").textContent = `${r.name} loaded onto Brew Day, ready to start.`;
    render();
  });
}
function pressUnload() {
  const rule = unloadRule();
  if (rule.why) return say("col", null, rule.why);
  if (rule.ask) { st.ask = {kind: "unload"}; return render(); }
  doUnload();
}
function doUnload() {
  st.ask = null; st.pend.unload = true; render();
  later(() => { delete st.pend.unload; const n = st.loaded.name || "The steps"; st.loaded = null; st.bs = null; event(`${n} unloaded: Brew Day is brewing by hand`, "confirmed", "ok"); render(); });
}
function save() {
  const ed = E();
  if (!ed || !changes(ed) || st.pend.save) return;
  const need = needsWhy(ed);
  if (need) return toast(need);
  st.pend.save = true; render();
  later(() => {
    delete st.pend.save;
    const keep = ed.doc.steps.filter(s => !s._removed).map(s => { const c = clone(s); for (const x of ["_moved", "_where", "_fill", "_tt", "_half", "_base", "_typing"]) delete c[x]; return c; });
    ed.doc.steps = keep;
    if (st.page === "steps") {
      st.loaded.steps = keep.map(s => { const c = clone(s); delete c._k; return c; });
      ed.orig = clone(ed.doc);
      event(`${st.loaded.name}: brew steps saved for this brew`, "confirmed", "ok");
    } else {
      const r = book(ed.file);
      Object.assign(r, {name: ed.doc.name, author: ed.doc.author, desc: ed.doc.desc, steps: keep.map(s => { const c = clone(s); delete c._k; return c; }), modified: fileNow()});
      delete r.imported_from;
      ed.orig = clone(ed.doc);
      event(`${r.name} saved in the Recipe Book`, "confirmed", "ok");
      if (isLoaded(r.file)) st.offer = r.file;
    }
    render();
  });
}
function closeEdit(to) {
  if (dirty()) { st.ask = {kind: "leave", to: to && to.name}; st.leaveTo = to || null; render(); const a = $("#ask"); if (a) { a.scrollIntoView({block: "nearest"}); $(".yes", a).focus(); } return; }
  st.ed = null; st.pane = "list"; st.ask = null;
  if (to && to.file) st.open = to.file;
  st.view = narrow() ? "recipe" : st.view;
  render();
}
function setProp(k, label, value) {
  const ed = E();
  if (k === "r") ed.doc[label] = value;
  else {
    const s = stepByKey(k);
    if (label === "name") s.name = value;
    else if (label === "type") {
      // a new kind keeps the settings it shares with the old one: its vessel, probe, temperature, minutes
      const types = CAT.TYPES[value] || {}, props = value === "BrewStart" ? brewStartProps(E()).props : {...(CAT.START[value] || {})};
      Object.keys(types).forEach(l => { if (norm(s.props[l]) !== "") props[l] = s.props[l]; });
      s.type = value; s.props = props;
    } else s.props[label] = value;
  }
}

/* ---------- input ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button, a");
  if (!b) return;
  const ds = b.dataset;
  if (b.closest("#mock")) return;
  if (b.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if (ds.load) return say(ds.from, ds.load, ds.why);
    if ("unload" in ds || "tobook" in ds) return say("col", null, ds.why);
    return toast(ds.why || "Not now.");
  }
  // moving a step lasts for one placing: any other command ends it first, as CANCEL would
  const em = E();
  if (em && em.mv && ds.put === undefined && !("mvcancel" in ds) && !ds.move) em.mv = null;
  if (ds.tab) {
    e.preventDefault();
    if (ds.tab === "Recipe Book" || ds.tab === "Brew Steps") {
      const pg = ds.tab === "Recipe Book" ? "book" : "steps";
      if (pg === st.page) return;
      if (dirty()) return toast("Mockup: with changes not saved, the page asks first, as Settings does: SAVE AND GO, GO WITHOUT SAVING or STAY.");
      st.page = pg; st.ask = null; st.view = pg === "steps" ? "recipe" : "list";
      if (pg === "steps") { st.bs = null; ensureBs(); }
      return render();
    }
    if (ds.tab === "BrewScribe") return toast("Mockup: this opens BrewScribe in a browser tab of its own.");
    return toast(`Mockup: this would open ${ds.tab}.${ds.tab === "Brew Day" ? " Its OTHER RECIPE list uses the same rows and LOAD." : ""}`);
  }
  if (ds.tabgo) return toast(`Mockup: this would open ${ds.tabgo}.`);
  if ("log" in ds) return toast("Mockup: LOG lists the last eight events, as on the brew-day screen.");
  if ("bok" in ds) { st.banner = null; return paintFrame(); }
  if (b.id === "alloff") return toast("Mockup: ALL OFF works here exactly as on the brew-day screen.");
  if (ds.back) {
    e.preventDefault();
    if (ds.back === "list") { if (st.pane === "edit") return closeEdit(); st.view = "list"; st.pane = "list"; return render(); }
    st.view = "recipe"; if (E()) E().pick = null; render(); return window.scrollTo(0, 0);
  }
  if (ds.open) {
    if (st.pane === "edit" && st.ed && st.ed.file !== ds.open) return closeEdit({file: ds.open, name: book(ds.open).name});
    st.open = ds.open; st.ask = null; st.notes = {}; st.offer = st.offer === ds.open ? st.offer : null;
    if (narrow()) st.view = "recipe";
    render();
    if (!narrow()) { const c = $("#col"); c.scrollTop = 0; }
    return window.scrollTo(0, narrow() ? 0 : scrollY);
  }
  if (ds.load) return pressLoad(ds.load, ds.from);
  if (ds.yes) {
    const a = st.ask;
    if (ds.yes === "load") return doLoad(a.file);
    if (ds.yes === "unload") return doUnload();
    if (ds.yes === "delete") {
      st.pend.del = true; render();
      return later(() => { const r = book(st.ed.file); st.book = st.book.filter(x => x !== r); delete st.pend.del; st.ask = null; st.ed = null; st.pane = "list"; st.open = sorted()[0] ? sorted()[0].file : null; st.view = "list"; event(`${r.name} deleted from the Recipe Book`, "confirmed", "ok"); render(); });
    }
    if (ds.yes === "replace" || ds.yes === "asnew") {
      const nm = norm(($("#tb-name") || {}).value);
      if (ds.yes === "asnew" && !nm) { st.notes.tb = "Give it a name first: the Recipe Book lists recipes by name."; render(); const f = $("#tb-name"); return f && f.focus(); }
      st.ask = null; st.notes = {}; st.pend.tobook = true; render();
      // CraftBeerPi keeps the steps as a book recipe and records it as where the steps on Brew Day came from (server
      // change 4), so LOAD and UNLOAD know they can be loaded again
      return later(() => {
        delete st.pend.tobook;
        const steps = clone(st.loaded.steps).map(bookStep);
        if (ds.yes === "replace") { const r = book(st.loaded.file); Object.assign(r, {steps, modified: fileNow()}); delete r.imported_from; event(`${r.name} replaced in the Recipe Book`, "confirmed", "ok"); }
        else { const f = "new" + (KEY++); st.book.push({file: f, name: nm, author: D.CONFIG.AUTHOR, steps, modified: fileNow()}); st.loaded.file = f; st.loaded.name = nm; if (st.bs) st.bs.doc.name = st.bs.orig.name = nm; event(`${nm} saved in the Recipe Book`, "confirmed", "ok"); }
        render();
      });
    }
    if (ds.yes === "save-go" || ds.yes === "drop-go") {
      const to = st.leaveTo;
      if (ds.yes === "save-go") { save(); return later(() => setTimeout(() => { st.ask = null; st.ed = null; st.pane = "list"; if (to && to.file) st.open = to.file; render(); }, 50)); }
      st.ask = null; st.ed = null; st.pane = "list"; if (to && to.file) st.open = to.file; return render();
    }
  }
  if ("no" in ds) { st.ask = null; return render(); }
  if ("edit" in ds) { startEdit(st.open); if (narrow()) st.view = "recipe"; render(); return; }
  if (ds.go) {
    if (st.page === "book" && st.pane !== "edit") { startEdit(st.open, ds.go === "r" ? "r" : null); render(); const r = book(st.open); const i = +String(ds.go).replace("i", ""); const k = ds.go === "r" ? "r" : st.ed.doc.steps[i] ? st.ed.doc.steps[i]._k : "r"; return requestAnimationFrame(() => jump(k)); }
    if (st.page === "steps") ensureBs();
    return jump(ds.go);
  }
  if ("close" in ds) return closeEdit();
  if ("copy" in ds) { st.pane = "copy"; st.view = "plate"; render(); const f = $("#nm-in"); if (f) { f.focus(); f.select(); } return; }
  if ("new" in ds) { st.pane = "new"; st.view = "plate"; render(); const f = $("#nm-in"); if (f) f.focus(); return; }
  if ("list" in ds) { st.pane = "list"; st.view = "list"; st.ed = null; return render(); }
  if ("make" in ds) {
    const nm = $("#nm-in").value.trim();
    if (!nm) { st.notes.nm = "Give it a name first: the book lists recipes by name."; return render(); }
    st.notes = {};
    const f = "made" + (KEY++), from = st.pane === "copy" ? book(st.open) : null;
    st.book.push({file: f, name: nm, author: D.CONFIG.AUTHOR, steps: from ? clone(from.steps) : [], modified: fileNow()});
    event(`${nm} ${from ? "copied" : "added"} to the Recipe Book`, "confirmed", "ok");
    startEdit(f);
    if (!from) { st.ed.kinds = true; st.ed.cur = "kinds"; }
    st.view = narrow() ? (from ? "recipe" : "plate") : st.view;
    if (!from) st.ed.pick = "kinds";
    return render();
  }
  if ("addstep" in ds) {
    if (st.page === "steps" && !st.loaded) { st.loaded = {file: null, name: "", at: st.clock, day: cbDate(), steps: [], left: null}; st.bs = null; ensureBs(); }
    const ed = E();
    ed.kinds = true; ed.from = ed.cur; ed.pick = "kinds"; ed.landKinds = true;
    if (narrow()) st.view = "plate";
    render(); ed.landKinds = false;
    const p = $("#p-kinds");
    if (p && !narrow()) { if (wide()) $("#pane").scrollTop = p.offsetTop - $("#pane").offsetTop - 8; else p.scrollIntoView(); }
    return;
  }
  if ("kindsClose" in ds) { const ed = E(); ed.kinds = false; ed.from = null; if (narrow()) st.view = "recipe"; return render(); }
  if (ds.kind) {
    const ed = E(), pl = naturalPlace(ed, ds.kind), s = newStep(ds.kind);
    insertAt(ed, s, pl.at); s._where = pl.where;
    ed.kinds = false; ed.from = null; ed.cur = s._k;
    render();
    return requestAnimationFrame(() => jump(s._k));
  }
  // + BrewStart, over step 1 of a recipe without one: added first, filled in, its time to set
  if ("bsadd" in ds) {
    if (st.page === "book" && st.pane !== "edit") startEdit(st.open);
    const ed = E(), s = newStep("BrewStart");
    insertAt(ed, s, firstFree(ed)); s._where = "before everything else";
    ed.kinds = false; ed.cur = s._k;
    if (narrow()) st.view = "recipe";
    render();
    return requestAnimationFrame(() => showWhen(s._k));
  }
  // MOVE: the step is marked, and PUT IT HERE shows between the steps; one tap there puts it, however far
  if (ds.move) {
    const ed = E(), s = stepByKey(ds.move);
    ed.mv = ds.move; ed.kinds = false; ed.cur = ds.move;
    if (narrow()) st.view = "recipe";
    render();
    $("#sr").textContent = `Moving ${nameIn(s)}. PUT IT HERE is between the steps, with FIRST and LAST above them. CANCEL leaves it where it is.`;
    return requestAnimationFrame(() => { const c = $(`#c-${ds.move}`); if (c) c.scrollIntoView({block: narrow() ? "center" : "nearest"}); });
  }
  if (ds.put !== undefined) {
    const ed = E(), s = ed && ed.mv ? stepByKey(ed.mv) : null;
    if (!s) return;
    moveTo(ed, s, +ds.put);
    if (origOf(ed, s)) s._moved = true;
    delete s._where;
    settleMoves(ed); ed.mv = null; ed.cur = s._k;
    render();
    $("#sr").textContent = `${nameIn(s)} moved: it is step ${live(ed).indexOf(s) + 1} now.`;
    return requestAnimationFrame(() => { if (!narrow()) return jump(s._k); const c = $(`#c-${s._k}`); if (c) c.scrollIntoView({block: "center"}); });
  }
  if ("mvcancel" in ds) { const ed = E(), k = ed.mv; ed.mv = null; render(); return k && !narrow() ? requestAnimationFrame(() => jump(k)) : undefined; }
  if (ds.remove) {
    const ed = E(), s = stepByKey(ds.remove);
    if (!origOf(ed, s)) ed.doc.steps = ed.doc.steps.filter(x => x !== s); else s._removed = true;
    return render();
  }
  if (ds.unremove) { const s = stepByKey(ds.unremove); delete s._removed; return render(); }
  // AM or PM: the time moves to that half of the day, and a time typed next without one is read in it
  if (ds.half) {
    const s = stepByKey(ds.s), t = hm(s.props[ds.p]);
    s._half = s._base = ds.half;
    if (t) setProp(ds.s, ds.p, `${String(+t.slice(0, 2) % 12 + (ds.half === "pm" ? 12 : 0)).padStart(2, "0")}${t.slice(2)}`);
    else if (norm(s._tt)) { const r = readTime(s._tt, ds.half); if (r) setProp(ds.s, ds.p, r); }
    render();
    const nb = $(`#i-${ds.s}-${ds.p}-half [data-half="${ds.half}"]`); if (nb) nb.focus({preventScroll: true});
    return keepWhenInView(ds.s);
  }
  if (ds.set !== undefined && b.closest(".seg")) {
    setProp(ds.s, ds.p, ds.set); const id = b.closest(".seg").id; render(); const nb = $(`#${id} [data-set="${CSS.escape(ds.set)}"]`); if (nb) nb.focus({preventScroll: true});
    const sk = ds.s && ds.s !== "r" ? stepByKey(ds.s) : null;
    if (sk && sk.type === "BrewStart" && (ds.p === "Timing" || ds.p === "Mode")) keepWhenInView(ds.s);
    return;
  }
  if (ds.undo) {
    const ed = E(), k = ds.undo, label = ds.p;
    if (k === "r") ed.doc[label] = ed.orig[label];
    else { const s = stepByKey(k), o = origOf(ed, s); delete s._tt; delete s._typing; if (label === "name") s.name = o.name; else if (label === "type") { s.type = o.type; s.props = clone(o.props); } else s.props[label] = o.props[label]; }
    return render();
  }
  if ("undoall" in ds) { const ed = E(); ed.doc = clone(ed.orig); ed.kinds = false; event(st.page === "steps" ? "Brew Steps: changes put back" : `${ed.doc.name}: changes put back`, "done", "ok"); return render(); }
  if ("save" in ds) return save();
  if (ds.rmadd) { const s = stepByKey(ds.s), i = +ds.rmadd; s.props[`Hop_${i}`] = null; s.props[`Hop_${i}_text`] = null; return render(); }
  if (ds.addadd) {
    const s = stepByKey(ds.addadd);
    for (let i = 1; i <= 6; i++) if (num(s.props[`Hop_${i}`]) == null && norm(s.props[`Hop_${i}_text`]) === "") { s.props[`Hop_${i}`] = 0; s.props[`Hop_${i}_text`] = ""; render(); const f = $(`#i-${s._k}-Hop_${i}`); if (f) { f.focus(); f.select(); } return; }
    return;
  }
  if ("del" in ds) { st.ask = {kind: "delete"}; render(); const a = $("#ask"); if (a) a.scrollIntoView({block: "nearest"}); return; }
  if ("unload" in ds) return pressUnload();
  if ("tobook" in ds) { st.ask = {kind: "tobook"}; render(); const f = $("#tb-name"); return f && f.focus({preventScroll: true}); }
  if ("import" in ds) { st.pane = "import"; st.view = "plate"; st.imp.result = null; render(); return; }
  if ("choose" in ds) { st.pend.upload = true; render(); return later(() => { delete st.pend.upload; st.imp.file = "v6"; st.imp.result = null; event("XML Recipe Craftbeerpi Test Recipe v6.xml has been uploaded", "from CraftBeerPi", ""); render(); }); }
  if (ds.imp) return doImport(ds.imp);
  if ("bfre" in ds) return toast("Mockup: REFRESH LIST asks Brewfather for your recipes again; the list says so while it waits.");
  if (ds.bfimp) return toast("Mockup: importing from Brewfather works as importing from a file does, and ends on the new recipe's row, with LOAD.");
  if ("clear" in ds) { st.q = ""; render(); return $("#q").focus(); }
});
function doImport(id) {
  const I = st.imp, f = D.FILES[I.file], x = f.recipes.find(r => r.id === id);
  I.busy = id; I.result = null; render();
  later(() => {
    I.busy = null;
    if (I.refuse) { I.result = {ok: false, why: "No boil kettle is set, so the boil would go on 'Mash Tun', the mash kettle. Choose the boil kettle in Settings, BoilKettle. Nothing was added to the Recipe Book."}; event("Recipe not imported", "from CraftBeerPi", "bad"); return render(); }
    const old = st.book.find(r => r.name === x.name && r.imported_from);
    const file = old ? old.file : "imp" + (KEY++);
    if (old) Object.assign(old, {steps: clone(x.steps), modified: fileNow()});
    else st.book.push({file, name: x.name, author: D.CONFIG.AUTHOR, imported_from: f.kind, steps: clone(x.steps), modified: fileNow()});
    I.result = {ok: true, id, file, replaced: !!old, warn: x.warn};
    st.open = file;
    event(`${f.kind} recipe imported: ${x.name}. ${old ? "Its earlier copy in your Recipe Book was replaced." : "Kept in your Recipe Book."}`, "from CraftBeerPi", "");
    if (x.warn) st.banner = x.warn;
    render();
  });
}
document.addEventListener("input", e => {
  const f = e.target;
  if (f.id === "q") { st.q = f.value; const pos = f.selectionStart; $("#work").innerHTML = bookHTML(); $(".clr").hidden = !st.q; return; }
  if (f.id === "bq") { st.imp.bq = f.value; const pos = f.selectionStart; render(); const n = $("#bq"); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (f.id === "nm-in" || f.id === "tb-name") return;
  const k = f.dataset.s, label = f.dataset.p;
  if (!k || !label || f.tagName === "SELECT") return;
  if (f.classList.contains("tmbox")) {
    // read as it's typed, in the half of the day the box showed when typing began (_base); AM and PM follow the time
    const s = stepByKey(k), r = norm(f.value) === "" ? "" : readTime(f.value, s._base || (hm(s.props[label]) ? halfOf(s.props[label]) : s._half || "am"));
    s._tt = f.value; s._typing = true;
    setProp(k, label, r || "");
    if (r) { s._half = halfOf(r); $$(`#${CSS.escape(f.id)}-half [data-half]`).forEach(x => x.setAttribute("aria-checked", String(x.dataset.half === s._half))); }
    paintEdit(k, label);
    return keepWhenInView(k);
  }
  if (f.tagName === "TEXTAREA") {
    const v = f.value.replace(/(\r\n|\r|\n)+/g, " ");
    if (v !== f.value) f.value = v;
    f.style.height = "auto"; f.style.height = f.scrollHeight + 2 + "px";
  }
  setProp(k, label, f.value);
  paintEdit(k, label);
  if (label === "StartDate") keepWhenInView(k);
});
document.addEventListener("focusin", e => {
  const f = e.target;
  if (!f.classList || !f.classList.contains("tmbox")) return;
  const s = stepByKey(f.dataset.s), t = s && hm(s.props[f.dataset.p]);
  if (s) s._base = t ? halfOf(t) : s._half || "am";
});
document.addEventListener("change", e => {
  const f = e.target;
  // a time box, once left (or Enter): a time it read is shown as it reads; what it couldn't read is said
  if (f.classList && f.classList.contains("tmbox")) {
    const s = stepByKey(f.dataset.s);
    if (!s) return;
    s._typing = false;
    const t = hm(s.props[f.dataset.p]);
    if (t) { f.value = boxText(t); s._tt = f.value; }
    return paintEdit(f.dataset.s, f.dataset.p);
  }
  if (f.tagName !== "SELECT" || !f.dataset.s) return;
  setProp(f.dataset.s, f.dataset.p, f.value);
  const id = f.id; render(); const n = $("#" + id); if (n) n.focus({preventScroll: true});
});
document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA" && e.key === "Enter" && !e.isComposing) e.preventDefault();
  if (e.key === "Escape") {
    if (e.target.id === "q" && st.q) { st.q = ""; e.target.value = ""; $("#work").innerHTML = bookHTML(); return; }
    if (E() && E().mv) { E().mv = null; return render(); }
    if (st.ask) { st.ask = null; render(); }
  }
  if (e.target.getAttribute && e.target.getAttribute("role") === "radio" && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
    e.preventDefault();
    const rs = $$("[role=radio]", e.target.closest(".seg")), i = rs.indexOf(e.target), nx = rs[(i + (/Right|Down/.test(e.key) ? 1 : rs.length - 1)) % rs.length];
    nx.focus(); nx.click();
  }
});
/* a file dropped on the drop area is sent as CHOOSE FILE sends one; the mockup shows the made-up v6 file */
document.addEventListener("dragover", e => { const d = e.target.closest && e.target.closest("#drop"); if (!d) return; e.preventDefault(); d.classList.add("over"); });
document.addEventListener("dragleave", e => { const d = e.target.closest && e.target.closest("#drop"); if (d) d.classList.remove("over"); });
document.addEventListener("drop", e => { const d = e.target.closest && e.target.closest("#drop"); if (!d) return; e.preventDefault(); d.classList.remove("over"); $("[data-choose]").click(); });
$("#pane").addEventListener("scroll", () => requestAnimationFrame(spy), {passive: true});
addEventListener("scroll", () => requestAnimationFrame(spy), {passive: true});
addEventListener("resize", () => { applyView(); grow(); fitTool(); });

/* ---------- moments (the strip at the top) ---------- */
const V4 = "FtHtz5YsgsSFEikqEieXJb", V5 = "YhweWUoDCyYKB887DJ9EXd", V3 = "JimaSx8vJFQoZ2wjioiVRT", BS = "Sm2ziW9v2nxAMid7ft6PTr";
const at = (clock, evs) => { st.clock = clock; if (evs) st.events = evs.concat(st.events); };
const editScene = (file, fn, cur) => () => { loadFrom(V5); st.open = file; startEdit(file); st.view = "recipe"; fn(st.ed); if (cur != null) { const k = typeof cur === "number" ? st.ed.doc.steps[cur]._k : cur; st.after = () => jump(k); } };
const SCENES = {
  book: () => { loadFrom(V5); st.open = V5; },
  choose: () => { loadFrom(V5); st.open = V4; st.view = "recipe"; },
  loading: () => { loadFrom(V5); st.open = V4; st.pend.load = V4; st.view = "recipe"; },
  loaded: () => { loadFrom(V4); st.loaded.at = "07:42"; st.open = V4; at("07:42", [["07:42:05", "Craftbeerpi Test Recipe v4 loaded", "confirmed", "ok"]]); st.view = "recipe"; },
  ask: () => { loadFrom(V5, "stopped", 2, {ran: 16}); st.open = V4; st.ask = {kind: "load", file: V4, from: "col"}; at("09:30", [["09:24:31", "Recipe stopped", "confirmed", "ok"]]); st.view = "recipe"; },
  /* Rye Pale Ale on Brew Day, not begun, its book copy deleted: LOAD asks, as it can't be loaded again */
  "ask-lost": () => { const x = D.FILES.export.recipes[1]; st.loaded = {file: "deletedRyePaleAle000001", name: x.name, at: "07:20", steps: clone(x.steps).map(s => ({...s, status: "I"})), left: null, ran: null}; st.open = V4; st.ask = {kind: "load", file: V4, from: "col"}; st.view = "recipe"; },
  running: () => { loadFrom(V5, "running", 2, {left: 23 * 60 + 41}); st.open = V4; st.notes.col = runningWhy(); at("09:12", [["09:08:10", "Saccharification started", "confirmed", "ok"]]); st.view = "recipe"; },
  brewstart: () => { loadFrom(BS, "running", 0); st.loaded.at = "15:58"; st.open = V5; st.notes.col = runningWhy(); at("16:20", [["16:02:44", "Recipe started", "confirmed", "ok"]]); st.view = "recipe"; },
  finished: () => { loadFrom(V5, "finished"); st.open = V5; at("13:05", [["12:58:02", "Brewing Complete: Now the yeast will take over", "from CraftBeerPi", ""]]); },
  find: () => { loadFrom(V5); st.open = V5; st.q = "citra"; },
  empty: () => { st.book = []; st.open = null; st.events = [["07:30:02", "Connected to CraftBeerPi", "confirmed", "ok"]]; },
  edit: editScene(V4, ed => { const s = ed.doc.steps; s[1].name = "Protein Rest"; s[2].name = "Saccharification"; s[2].props.Timer = "45"; }, 2),
  boil: () => { editScene(V5, () => {}, 5)(); const k = st.ed.doc.steps[5]._k; st.after = () => { jump(k); const a = $(`#p-${k} .addh`), pane = $("#pane"); if (a && wide()) pane.scrollTop += a.getBoundingClientRect().top - pane.getBoundingClientRect().top - 90; }; },
  add: editScene(V4, ed => { ed.kinds = true; ed.from = ed.doc.steps[2]._k; ed.pick = "kinds"; }, "kinds"),
  saved: () => { loadFrom(V5); st.open = V5; const r = book(V5); r.steps[2].props.Temp = "150"; r.modified = todayAt("07:52"); delete r.imported_from; st.offer = V5; at("07:52", [["07:52:10", "Craftbeerpi Test Recipe v5 saved in the Recipe Book", "confirmed", "ok"]]); st.view = "recipe"; },
  copy: () => { loadFrom(V5); st.open = V4; st.pane = "copy"; st.view = "plate"; st.focus = "#nm-in"; },
  new: () => { loadFrom(V5); st.open = V5; st.pane = "new"; st.view = "plate"; },
  delete: editScene(V3, () => { st.ask = {kind: "delete"}; }, "del"),
  leave: editScene(V4, ed => { const s = ed.doc.steps; s[1].name = "Protein Rest"; s[2].props.Timer = "45"; st.ask = {kind: "leave", to: "House Pale Ale"}; st.leaveTo = {file: "demoHousePaleAle0000001", name: "House Pale Ale"}; }),
  import: () => { loadFrom(V5); st.open = V5; st.pane = "import"; st.view = "plate"; },
  "import-file": () => { loadFrom(V5); st.open = V5; st.pane = "import"; st.view = "plate"; st.imp.file = "export"; at("07:43", [["07:43:30", "XML Recipe BeerSmith export.xml has been uploaded", "from CraftBeerPi", ""]]); },
  imported: () => { loadFrom(V5); st.pane = "import"; st.view = "plate"; st.imp.file = "v6"; at("07:44"); const x = D.FILES.v6.recipes[0]; st.book.push({file: "impV6", name: x.name, author: "John Doe", imported_from: "BeerXML", steps: clone(x.steps), modified: todayAt("07:44")}); st.imp.result = {ok: true, id: "1", file: "impV6", replaced: false, warn: x.warn}; st.open = "impV6"; st.banner = x.warn; st.events.unshift(["07:44:10", "BeerXML recipe imported: Craftbeerpi Test Recipe v6. Kept in your Recipe Book.", "from CraftBeerPi", ""]); },
  reimported: () => { loadFrom(V5); st.pane = "import"; st.view = "plate"; st.imp.file = "export"; at("07:46"); book(V5).modified = todayAt("07:46"); st.imp.result = {ok: true, id: "1", file: V5, replaced: true}; st.open = V5; st.events.unshift(["07:46:12", "BeerXML recipe imported: Craftbeerpi Test Recipe v5. Its earlier copy in your Recipe Book was replaced.", "from CraftBeerPi", ""]); },
  refused: () => { loadFrom(V5); st.open = V5; st.pane = "import"; st.view = "plate"; st.imp.file = "v6"; st.imp.refuse = true; at("07:44"); st.imp.result = {ok: false, why: "No boil kettle is set, so the boil would go on 'Mash Tun', the mash kettle. Choose the boil kettle in Settings, BoilKettle. Nothing was added to the Recipe Book."}; st.events.unshift(["07:44:10", "Recipe not imported", "from CraftBeerPi", "bad"]); },
  brewfather: () => { loadFrom(V5); st.open = V5; st.pane = "import"; st.view = "plate"; st.imp.bf = true; st.after = () => { const p = $("#p-bf"); if (p && wide()) $("#pane").scrollTop = p.offsetTop - $("#pane").offsetTop - 8; }; },
  steps: () => { loadFrom(V5); st.page = "steps"; st.view = "recipe"; },
  "steps-running": () => { loadFrom(V5, "running", 2, {left: 23 * 60 + 41}); st.page = "steps"; at("09:12", [["09:08:10", "Saccharification started", "confirmed", "ok"]]); ensureBs(); st.bs.doc.steps[3].props.Timer = "15"; st.view = "recipe"; st.after = () => jump(st.bs.doc.steps[3]._k); },
  "to-book": () => { loadFrom(V5); st.page = "steps"; st.ask = {kind: "tobook"}; st.view = "recipe"; },
  "steps-none": () => { st.page = "steps"; st.view = "recipe"; st.events = [["07:30:02", "Connected to CraftBeerPi", "confirmed", "ok"]]; },
  unload: () => { loadFrom(V5, "stopped", 2, {ran: 16}); st.page = "steps"; st.ask = {kind: "unload"}; at("09:30", [["09:24:31", "Recipe stopped", "confirmed", "ok"]]); st.view = "recipe"; },
  "brewstart-add": () => { evening(); },
  "brewstart-added": () => { evening(); addedBrewStart(); },
  "brewstart-time": () => { evening(); addedBrewStart().props.StartTime = "07:00"; },
  // the try-out simulator at 30×: CraftBeerPi's clock reads Mon 23 Nov, 1:16 PM while the screen's reads Sun 22 Nov, 11:20 PM
  "brewstart-sim": () => { evening(false, {clock: "13:16", at: "13:02", sim: {scale: 30, day: "2026-11-23", pc: "23:20"}}); addedBrewStart().props.StartTime = "07:00"; },
  move: () => { evening(true); const ed = st.bs, s = ed.doc.steps[ed.doc.steps.length - 1]; ed.mv = s._k; ed.cur = s._k; st.after = () => inColumn(s._k); },
  moved: () => { evening(true); const ed = st.bs, s = ed.doc.steps[ed.doc.steps.length - 1]; moveTo(ed, s, 0); s._moved = true; ed.cur = s._k; st.after = () => inColumn(s._k); },
  offline: () => { loadFrom(V5); st.open = V4; st.link = "lost"; }
};
// a monitor opens the step's settings beside the column; one thing at a time, the steps stay in view, as after a move
const inColumn = k => { if (!narrow()) return jump(k); const c = $(`#c-${k}`); if (c) c.scrollIntoView({block: "center"}); };
/* the night before: v5 loaded on Brew Day, not begun, on the Brew Steps page. withLast adds a saved BrewStart as the last
   step, where + on today's Brew Steps page puts every new step: the case MOVE is for. o.sim puts it on a simulator whose
   clock (o.clock, o.at) isn't the screen's */
function evening(withLast, o = {}) {
  st.sim = o.sim || null;
  loadFrom(V5); st.loaded.at = o.at || "20:31"; st.page = "steps"; st.view = "recipe";
  at(o.clock || "20:40", [[`${o.at || "20:31"}:12`, "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]]);
  if (withLast) st.loaded.steps.push({name: "BrewStart", type: "BrewStart", status: "I", props: {Timing: "Ready by", Mode: "Tomorrow", StartDate: "", StartTime: "07:00",
    Heat_Kettle: D.KETTLES[0].id, Ready_Temp: 126, Volume: 20, Volume_Unit: "gal", Grain_Temp: "", Heater_Watts: 6500, Campden_Reminder: "Yes", NotifyBefore: "", AutoNext: "Yes"}});
  ensureBs();
}
function addedBrewStart() {
  const ed = st.bs, s = newStep("BrewStart");
  insertAt(ed, s, 0); s._where = "before everything else"; ed.cur = s._k;
  st.after = () => showWhen(s._k);
  return s;
}
/* a simulator's clock counts on at its speed, a minute of CraftBeerPi's every 60/scale real seconds, and what is on that
   clock follows it: the title bar, the clock in BrewStart's settings and the time in words */
let ticker = null;
function startTick() {
  clearInterval(ticker); ticker = null;
  const reset = $("#mock-reset");
  if (reset) reset.hidden = !st.sim;
  if (!st.sim || st.sim.scale <= 1) return;
  ticker = setInterval(() => {
    const [h, m] = st.clock.split(":").map(Number), n = h * 60 + m + 1;
    if (n >= 1440) st.sim.day = dayAfter(st.sim.day);
    st.clock = `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
    paintClock();
    const tag = cbClockHTML(), ed = E();
    $$(".cbbar").forEach(x => { x.outerHTML = tag; });
    $$(".whenl").forEach(w => { const s = ed && ed.doc.steps.find(x => `when-${x._k}` === w.id); if (s) w.innerHTML = whenHTML(ed, s); });
  }, 60000 / st.sim.scale);
}
/* Mockup: SIM_TIME_SCALE changed in Settings. CraftBeerPi puts its clock back to the PC's date and time and tells every
   open screen at once, and the page redraws what is on that clock: at 1×, on the screen's date, the clock tags go */
const resetBtn = $("#mock-reset");
if (resetBtn) resetBtn.addEventListener("click", () => {
  if (!st.sim) return;
  st.clock = st.sim.pc; st.sim = null; startTick(); render();
  toast("Mockup: SIM_TIME_SCALE set back to 1. CraftBeerPi's clock is the PC's again, and every open screen redraws.");
});
function scene() {
  const h = location.hash.slice(1) || "book";
  if (!(h in SCENES)) return;
  fresh();
  SCENES[h]();
  if (!narrow() && (st.view === "recipe" || st.view === "plate") && st.pane === "list" && st.page === "book") st.view = "list";
  render();
  startTick();
  $("#pane").scrollTop = 0; window.scrollTo(0, 0);
  const sc = $("#steps"); if (sc) sc.scrollTop = 0;
  if (st.after) { const f = st.after; st.after = null; requestAnimationFrame(() => requestAnimationFrame(f)); }
  if (st.focus) { const f = $(st.focus); if (f) { f.focus({preventScroll: true}); if (f.select) f.select(); } st.focus = null; }
  $$('#mock a[href^="#"]').forEach(a => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + h)));
}
if (QS.has("bare")) document.documentElement.classList.add("bare");
/* the strip wraps on narrower windows: the screen under it takes what is left of the window */
const fitMock = () => { const mk = $("#mock"); if (mk && !QS.has("bare")) document.documentElement.style.setProperty("--mock-h", mk.offsetHeight + "px"); };
addEventListener("resize", fitMock);
fitMock();
if (document.fonts) document.fonts.ready.then(() => { fitMock(); grow(); });
if (QS.get("brewscribe") === "none") $('.tabs a[data-tab="BrewScribe"]').remove();
addEventListener("hashchange", scene);
scene();
})();
