// The recipe pages: the Recipe Book, a recipe's steps, importing a recipe, and Brew Steps.
//
// A recipe is shown as Brew Day's recipe column shows it, in the same place; the book, a step's settings and importing
// sit beside it. LOAD puts a recipe on Brew Day: one tap, unless a brew has begun or the recipe it replaces isn't in the
// Recipe Book (then it asks), or a step runs (then it says why not). A new step goes in where its kind belongs in a brew;
// MOVE, then PUT IT HERE, moves a step any distance in two taps; a recipe without BrewStart offers it as step 1, filled
// in from the rig. The recipe pages' mockup (design/recipes) is this page: this is its recipes.js, the same functions
// writing the same markup, styled by its own stylesheet (recipes.css, made from the mockup's by design/recipes/port.mjs).
// What the page knows about each kind of step - plain names, lines, units, parts - is catalog.js, made from the mockup's
// recipes-catalog.js by the same script. A step reads as Brew Day reads it (brewday/live.js stepModel and bookLine).
//
// What is different from the mockup:
// - It sits in the brew-day screen's frame (screen.js with page "recipes" or "brewsteps"): the live title bar, last event
//   and tabs, with RECIPE BOOK or BREW STEPS lit; LOG and ALL OFF are the frame's own. It draws in a shadow root on the
//   frame's host, so the brew-day screen's rules for .main, .steps, .plate and the rest (the same names for other things)
//   can't reach it, nor its rules the title bar. One mode per page: the Recipe Book's addresses open "book", Brew Steps'
//   open "steps", and a tab between them opens the other page.
// - The recipes are CraftBeerPi's Recipe Book (GET /recipe/, then every recipe's steps, GET /recipe/{file}), read again
//   after anything that changes it. The brew steps, vessels, probes, switches, settings and kinds of step are CraftBeerPi's
//   (GET /system/, kept current by its websocket).
// - Every command waits for CraftBeerPi's answer, up to 5 s: LOAD (POST /recipe/{file}/brew), UNLOAD (POST /step2/clear),
//   SAVE in the book (PUT /recipe/{file}, the whole recipe), SAVE on Brew Steps (each changed step, each removed one, the
//   new order, then each new step at its place: PUT /step2/{id}, DELETE /step2/{id}, PUT /step2/order, POST /step2/ with
//   index), SAVE TO BOOK (POST /step2/savetobook), COPY, + NEW and DELETE (POST /recipe/{file}/clone, POST
//   /recipe/create, DELETE /recipe/{file}), sending a file (POST /upload/) and IMPORT (POST /upload/{kind}). A refusal
//   says CraftBeerPi's own sentence under the button for 6 s; no answer is a failed command, in the event line.
// - Where CraftBeerPi doesn't yet say which book recipe the brew steps came from (book_file and loaded_at in their basic
//   data), the page goes by names: the book's recipe of the same name. SAVE TO BOOK then saves the steps as a new recipe,
//   under their own name. Where an import doesn't yet answer with the book file it kept, the page finds it in the book by
//   its name. Where a recipe has no water figures from its import (mash_numbers' boil_l) or CraftBeerPi has no
//   GRAIN_ABSORPTION setting, a new BrewStart takes the water of the newest past brew that recorded it (GET /figures/),
//   saying which brew, and else none, saying so. Before CraftBeerPi 4.7.7.post72, an IMPORT of a BeerXML recipe whose
//   name the book has doesn't ask whether to UPDATE that recipe or ADD AS A NEW RECIPE: it replaces an earlier import, as
//   it always did. Before CraftBeerPi 4.7.7.post58, which has no
//   PUT /step2/order and ignores a new step's index, MOVE on Brew Steps is greyed and a new step goes last.
// - The addresses: #/recipes (the book), #/recipes/<file> (that recipe in the column), #/recipe/<file> (changing it),
//   #/upload (importing), #/mashprofile and #/brewsteps (Brew Steps), #/step/<id> (that step's settings) and #/step
//   (+ STEP). At 899 px and narrower, where one thing shows at a time, each move to the next is a history entry, so Back
//   goes back one, as the ‹ link does.
// - Leaving with changes not saved, by a tab, MORE's list, a link or Back within these pages, asks first; closing or
//   reloading the browser tab can only get the browser's own question.
// - Times of day follow CraftBeerPi's CLOCK_FORMAT setting through util/timefmt.js, the one formatter and typed-time
//   reader for every screen, where the mockup has its own timeOfDay, boxText and readTime.
import { GROUPS, KINDS, TYPES, START } from "./catalog";
import { call, why as callWhy } from "../brewday/api";
import { stepModel, bookLine as dayBookLine, cfg as cfgOf, parseLeft, recipeWater, waterLacks, pastWater, brewWords, inWords, kettleRoles, hermsLogics, ROLES, declares } from "../brewday/live";
import { settingsClockFormat, formatTimeOfDay, formatDayTime, parseTypedTime, halfOfDay, NBSP, TWELVE_HOUR } from "../util/timefmt";
import { clearKeyboard } from "../util/keyboard";
// As text, exactly as written (config-overrides.js): recipes.css for the shadow root; recipes-frame.css, the mockup's
// .app rules (one screen tall from 620 px, scrolling below 1180 px, room for the phone's save bar), for the document,
// where they apply only while <html> has data-page=recipes or brewsteps
import RECIPES_CSS from "./recipes.css";
import FRAME_CSS from "./recipes-frame.css";
import { brewNow, brewScale } from "../brewday/screen";

/* the page's own rules, for a state the mockup doesn't draw: + BrewStart, and BrewStart among + STEP's kinds, greyed
   while CraftBeerPi's clock, Brew Day's steps or the Recipe Book's steps are still coming (bsWhy), as a greyed command
   is; a recipe without BeerSmith's mash figures (NOFIG), on its book row and in its column, quieter than what the row
   says of it; the question before importing a BeerXML recipe of a name the book has, whose answers each say what they
   do; on Brew Steps, the recipe's author over its notes; and BrewStart's plate opened from Brew Day (ALL SETTINGS),
   whose BACK TO BREW DAY is as tall as SAVE's answers */
const OWN_CSS = `
.bsadd[aria-disabled=true],.kind[aria-disabled=true]{color:var(--text-3);cursor:not-allowed}
.bsadd[aria-disabled=true]:hover,.kind[aria-disabled=true]:hover{background:none}
.kind[aria-disabled=true]:hover{background:var(--panel-2)}
.bsadd[aria-disabled=true] .n,.bsadd[aria-disabled=true] .d,.kind[aria-disabled=true] span,.kind[aria-disabled=true] em{color:var(--text-3)}
.bko .nofig{grid-column:1;font:500 15px/1.3 var(--cond);letter-spacing:.02em;color:var(--text-3)}
.bk[aria-current=true] .nofig{color:var(--active-ink)}
.col .nofig{margin:0;font:500 15px/1.35 var(--cond);letter-spacing:.02em;color:var(--text-3)}
.col .by{margin:0;font:500 15px/1.35 var(--sans);color:var(--text-3)}
.imr .confirm{grid-column:1/-1;margin:8px 0 4px}
.confirm .acts.ways{grid-template-columns:1fr}
.confirm .acts.ways button{display:grid;gap:3px;justify-items:start;padding:8px 12px;text-align:left}
.confirm .acts.ways button small{font:500 15px/1.25 var(--sans);letter-spacing:0;text-transform:none;color:var(--text-2)}
.pnote.day{border-color:var(--select)}
.pnote.day .cmd{min-height:54px}
`;

const CAT = {GROUPS, KINDS, TYPES, START};
const PAUSED = "No connection. Controls are paused.";
const WAIT = "Waiting for CraftBeerPi to answer.";
const NOTE_MS = 6000;
/* how long the page keeps its own copy of the brew steps after SAVE, while CraftBeerPi's word on them comes */
const SETTLE_MS = 1500;
const ICON = {
  tick: '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8.5 14.5l3.8 3.8 7.2-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const TAB_PATH = {"Brew Day": "/", "Brew Steps": "/mashprofile", "Recipe Book": "/recipes", "Settings": "/settings/All"};
/* the files CraftBeerPi keeps from the last one of each kind sent (UploadController.UPLOAD_KINDS), and the importer for each */
const FILES = [{kind: "xml", file: "beer.xml", label: "BeerXML", ext: /\.xml$/i}, {kind: "json", file: "mmum.json", label: "MMuM", ext: /\.json$/i},
  {kind: "kbh", file: "kbh.db", label: "Kleiner Brauhelfer", ext: /\.(sqlite|db)$/i}];

/* ---------- the page: one at a time, as the brew-day screen ---------- */
let host = null, sr = null, env = {}, gen = 0, timers = [], off = [], raf = 0, fileIn = null;
let st = null, D = null, KEY = 0;
const $ = (s, r = sr) => r.querySelector(s), $$ = (s, r = sr) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const narrow = () => matchMedia("(max-width:899px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { if (g === gen && st) fn(); }, ms); timers.push(t); return t; };
const toast = msg => env.frame && env.frame.toast(msg);
const say = msg => env.frame && env.frame.say(msg);
const log = (what, res, tone) => env.frame && env.frame.log(what, res, tone);
const enc = s => encodeURIComponent(s);
const pad2 = n => String(n).padStart(2, "0");
/* now, by CraftBeerPi's clock (brewNow(), the one the title bar shows; on a simulator it can run fast and be on another
   date), as a Date; null until CraftBeerPi has said where its clock is. Real seconds (Date.now()) are only for the page's
   own waits */
const cbNow = () => { const e = brewNow(); return e == null ? null : new Date(e * 1000); };
const hhmmOf = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const isoOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => { const d = cbNow(); return d ? isoOf(d) : null; };
const CLOCK_WAIT = "Waiting for CraftBeerPi's clock.";
const STEPS_WAIT = "Waiting for Brew Day's steps from CraftBeerPi.";
/* times of day as the brewer reads them, by CLOCK_FORMAT (util/timefmt.js): "7:00 AM" or "07:00", 24-hour on a
   CraftBeerPi without the setting. Times kept in a step stay "HH:MM" */
const clockFmt = () => settingsClockFormat(D.config);
const twelve = () => clockFmt() === TWELVE_HOUR;
const tod = (t, o = {}) => formatTimeOfDay(t, {...o, format: clockFmt()});

/* ---------- numbers and words ---------- */
const num = v => { if (v === null || v === undefined || typeof v === "boolean" || String(v).trim() === "") return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
const fmt = n => String(Math.round(n * 10) / 10);
const norm = v => v === null || v === undefined ? "" : String(v).trim();
const same = (a, b) => norm(a) === norm(b) || (num(a) !== null && num(a) === num(b));
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const andList = xs => xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const U = () => (D.unit === "F" ? "°F" : "°C");
const nameOf = (list, id) => (list.find(x => x.id === id) || {}).name;
const firstSentence = s => { s = String(s || "").trim(); const m = s.match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : s; };
/* the kinds of step CraftBeerPi has (GET /system/ step.types); until they come, the catalogue's */
const hasKind = t => !Object.keys(D.types).length || t in D.types;
const kindName = t => (CAT.KINDS[t] || {}).n || (D.types[t] && (D.types[t].display_label || D.types[t].name)) || t || "No kind chosen";
const nameIn = s => s.name || kindName(s.type);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// BrewStart's Timing: only "Ready by" heats; a step saved with no Timing runs as Start at, as it did before Timing existed
const readyBy = p => norm((p || {}).Timing) === "Ready by";
const hm = t => { const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(t ?? "")); return m ? `${m[1].padStart(2, "0")}:${m[2]}` : ""; };
/* CraftBeerPi's times, as seconds (GET /recipe/'s modified), milliseconds or a date and time */
function epoch(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v))) { const n = +v; return n > 1e11 ? n / 1000 : n; }
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t / 1000 : null;
}
/* a recipe file's time: "Today 7:44 AM" in the book's column, "today at 7:44 AM" in a sentence (inLine), or its date */
function dateWords(ep, inLine) {
  if (ep == null) return "";
  const d = new Date(ep * 1000);
  if (isoOf(d) === today()) return `${inLine ? "today at" : "Today"} ${tod(d)}`;
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}
/* when the brew steps were loaded, on CraftBeerPi's clock, for "loaded at 7:38 AM": the time today; within the week
   before, the time and its weekday, "loaded at 8:31 PM Sat"; else its date, "loaded at 8:31 PM 14 Nov". Nothing when
   CraftBeerPi doesn't say */
function atWords(ep) {
  if (ep == null) return "";
  const d = new Date(ep * 1000), now = cbNow();
  if (isoOf(d) === today()) return ` at ${tod(d)}`;
  const week = now && now - d > 0 && now - d < 6 * 86400000;
  return ` at ${formatDayTime(d, {day: week ? "weekday" : "date", format: clockFmt()})}`;
}
/* a step as Brew Day's recipe column lists it (live.js stepModel): its name, its temperature and minutes, a note, the
   boil's additions; a BrewStart on Ready by gives the water's temperature, when it's ready by and how much there is,
   with the weekday where its day is a date ("ready by 7:00 AM Sat") */
function stepView(s) {
  const p = s.props || {}, m = stepModel({...s, props: p}, D.roles, U()), v = {n: s.name || kindName(s.type)};
  if (s.type === "BrewStart" && readyBy(p)) {
    const on = norm(p.Mode) === "Date" && ymd(p.StartDate) ? WEEK[new Date(`${ymd(p.StartDate)}T12:00:00`).getDay()] : "";
    v.p = [m.temp != null ? `${fmt(m.temp)} ${U()}` : "", m.ready ? `ready by ${tod(m.ready)}${on ? NBSP + on : ""}` : "", m.vol ? `${fmt(m.vol)} ${m.volU}` : ""].filter(Boolean).join(" · ");
  } else v.p = [m.temp != null ? `${s.type === "SpargeStep" ? "water " : ""}${fmt(m.temp)} ${U()}` : "", m.min ? `${fmt(m.min)} min` : ""].filter(Boolean).join(" · ");
  if (m.note) v.note = m.note;
  if (m.adds) v.adds = m.adds;
  return v;
}
const additionsOf = p => stepModel({type: "BoilStep", props: p || {}}, {}, U()).adds || [];
/* the book's numbers: the mash temperatures (mash in and rests, each once, in order) and the boil's minutes */
function mashTemps(steps) {
  const m = [];
  for (const s of steps) { const t = num((s.props || {}).Temp); if (/^Mash(In)?Step$/.test(s.type) && t != null && !m.includes(t)) m.push(t); }
  return m;
}
const boilMin = steps => { const b = steps.find(s => s.type === "BoilStep"); return b ? num((b.props || {}).Timer) : null; };
// Brew Day's one-line summary of a recipe, for the narrow book
const bookLine = steps => dayBookLine({steps}, U());
const fromLine = r => r.desc || (r.imported_from ? `Imported from ${r.imported_from}` : "");
/* a book recipe without BeerSmith's mash figures (basic data mash_numbers), which Brew Day's strike water box and a new
   BrewStart's water need, and what gives it them: an import of its BeerSmith file, UPDATE */
const NOFIG = "No BeerSmith mash figures: import its BeerSmith file again to add them.";
const noFig = r => !!r && !r.bad && !r.figures;

/* ---------- state ---------- */
function fresh() {
  st = {
    page: env.mode === "steps" ? "steps" : "book",   // the RECIPE BOOK tab, or "steps": BREW STEPS
    book: [],           // the Recipe Book: GET /recipe/, each recipe's steps as they arrive (GET /recipe/{file})
    bookRead: false,    // the list has come
    bookFail: "",       // the list couldn't be read, and why
    open: null,         // the recipe in the column
    pane: "list",       // what the right side shows on the book page: list, edit, import, copy, new
    view: "list",       // 899 px and narrower, one at a time: list, recipe or plate
    q: "",
    loaded: null,       // the recipe on Brew Day: CraftBeerPi's brew steps
    pend: {},           // commands waiting for CraftBeerPi's answer
    ask: null,          // a question that waits for an answer, in the place it was asked
    notes: {},          // why a control can't be used, or what CraftBeerPi said, where it was pressed, for six seconds
    ed: null,           // the Recipe Book's copy being changed
    bs: null,           // Brew Day's copy being changed (Brew Steps)
    offer: null,        // after SAVE: the copy on Brew Day is older than the book's, and LOAD AGAIN would bring it up to date
    imp: {lists: null, sent: null, result: null, bq: "", busy: null, path: "upload", bfBusy: false, ask: null},
    past: undefined,    // a past brew's water for a new BrewStart (askPast): "wait" while CraftBeerPi is asked, then it or null
    link: "ok",
    leaveTo: null,      // where a question about changes not saved would go
    elsewhere: false,   // the brew steps were changed on another screen while this page had changes
    hold: 0,            // until when the page keeps its own copy of the brew steps after SAVE
    wantEdit: null,     // a recipe to open for changing once its steps arrive
    wantPick: null,     // a step's settings to open once the brew steps arrive
    nav: "",            // the address and history entry the page last moved to
    pushed: 0,          // history entries the page has added, which ‹ and Back go back through
    land: null,         // a plate to flash its heading, until when
    dragOver: false,
    stepsSig: ""
  };
  D = {unit: "C", kettles: [], sensors: [], actors: [], config: {}, types: {}, version: "", connected: false, loaded: false, steps: [], basic: {}, bf: [], roles: {}};
}
const book = file => st.book.find(r => r.file === file);
const sorted = () => [...st.book].sort((p, q) => (q.modified || 0) - (p.modified || 0) || String(p.name).localeCompare(String(q.name), undefined, {sensitivity: "base"}));
const stepsOf = r => (r && Array.isArray(r.steps) ? r.steps : []);
const C = k => D.config[k];
/* CraftBeerPi says which book recipe the brew steps came from (book_file, book_modified, loaded_at); before it does, the
   page goes by names */
const knowsBook = () => !!D.basic && ("book_file" in D.basic || "book_modified" in D.basic || "loaded_at" in D.basic);
/* whether CraftBeerPi is 4.7.7.post<post> or later; null while it hasn't said its version */
function coreFrom(post) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?(?:\.post(\d+))?/.exec(String(D.version || ""));
  if (!m) return null;
  const v = [+m[1], +m[2], +m[3], m[4] == null ? 0 : +m[4], m[5] == null ? -1 : +m[5]], want = [4, 7, 7, 0, post];
  for (let i = 0; i < want.length; i++) if (v[i] !== want[i]) return v[i] > want[i];
  return true;
}
/* PUT /step2/order and POST /step2/'s index: CraftBeerPi 4.7.7.post58 and later */
const orders = () => coreFrom(58);
/* an import's UPDATE and ADD AS A NEW RECIPE (POST /upload/xml with update or new): 4.7.7.post72 and later */
const updates = () => coreFrom(72) === true;
/* the recipe on Brew Day, from CraftBeerPi's brew steps: where it came from in the book, when, and how far it has got */
function refreshLoaded() {
  const S = D.steps, B = D.basic || {};
  if (!S.length) { st.loaded = null; return; }
  let file = null;
  if (knowsBook()) file = B.book_file || null;
  else if (norm(B.name)) { const r = sorted().find(x => x.name === B.name); file = r ? r.file : null; }
  const steps = S.map(s => ({id: s.id, name: s.name, type: s.type, status: s.status, state_text: s.state_text, props: s.props || {}}));
  const L = {file, name: B.name || "", author: norm(B.author), desc: norm(B.desc), at: epoch(B.loaded_at), bm: epoch(B.book_modified), steps, left: null, ran: null, mash_numbers: B.mash_numbers || null};
  st.loaded = L;
  const b = brew();
  if (b.state === "running" || b.state === "stopped") {
    const s = steps[b.cur], left = parseLeft(s.state_text), t = num((s.props || {}).Timer);
    if (b.state === "running") L.left = left;
    else if (left != null && t) L.ran = Math.max(0, Math.floor((t * 60 - left) / 60));
    else if (num(s.props._elapsed_seconds) != null) L.ran = Math.floor(num(s.props._elapsed_seconds) / 60);
  }
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
  if (st.pend.load || st.pend.unload || !st.bookRead) return {why: WAIT};
  const b = brew();
  if (b.state === "running") return {why: runningWhy()};
  if (b.begun || (b.state !== "none" && !loadedInBook())) return {ask: true};
  return {};
}
function runningWhy() {
  const L = st.loaded, s = L.steps[brew().cur], p = s.props || {}, nx = L.steps[brew().cur + 1];
  const what = s.type !== "BrewStart" ? `${s.name}${L.left != null ? `, ${mmss(L.left)} left` : ""}`
    : readyBy(p) ? `BrewStart is waiting to have the ${nameOf(D.kettles, p.Heat_Kettle) || "water"} at ${fmt(num(p.Ready_Temp))} ${U()} by ${tod(hm(p.StartTime)) || norm(p.StartTime)}`
    : `BrewStart is waiting until ${tod(hm(p.StartTime)) || norm(p.StartTime)} to start ${nx ? nameIn(nx) : "the next step"}`;
  return `${L.name || "The steps on Brew Day"} ${L.name ? "is" : "are"} running: ${what}. Stop it on Brew Day first.`;
}
// where the brew stopped, for a question: "stopped at step 3, Saccharification, after 16 of its 40 min"
function whereStopped() {
  const L = st.loaded, b = brew(), s = L.steps[b.cur], t = num((s.props || {}).Timer);
  return b.state === "stopped" ? `stopped at step ${b.cur + 1}, ${s.name}${L.ran != null && t ? `, after ${L.ran} of its ${fmt(t)} min` : ""}` : `is at step ${b.cur + 1}, ${s.name}, waiting for you`;
}
/* ---------- changing a recipe: the book's copy (st.ed) or Brew Day's (st.bs, the Brew Steps page) ---------- */
const E = () => st.page === "steps" ? st.bs : st.ed;
/* a book recipe's steps have no ids: the page gives each a key of its own. Brew Day's steps are keyed by CraftBeerPi's
   ids, and a new one by the page's until CraftBeerPi gives it one */
const keyed = steps => steps.map(s => ({_k: "k" + (KEY++), name: s.name, type: s.type, props: clone(s.props || {})}));
const keyedById = steps => steps.map(s => ({_k: s.id, id: s.id, name: s.name, type: s.type, status: s.status, state_text: s.state_text, props: clone(s.props || {})}));
function startEdit(file, cur) {
  const r = book(file);
  if (!r || !Array.isArray(r.steps)) { st.wantEdit = {file, cur: cur || null}; st.pane = "edit"; st.open = file; return false; }
  const doc = {name: r.name, author: r.author || "", desc: r.desc || "", steps: keyed(r.steps)};
  st.ed = {file, doc, orig: clone(doc), cur: cur || "r", kinds: cur === "kinds", mv: null, from: null, pick: cur === "kinds" ? "kinds" : null};
  st.pane = "edit"; st.open = file; st.ask = null; st.offer = null; st.wantEdit = null;
  return true;
}
function ensureBs() {
  if (st.bs) return;
  const doc = {name: st.loaded ? st.loaded.name : "", steps: keyedById(st.loaded ? st.loaded.steps : [])};
  st.bs = {doc, orig: clone(doc), cur: "o", kinds: false, mv: null, from: null, pick: null};
}
const origOf = (ed, s) => ed.orig.steps.find(o => o._k === s._k);
const live = ed => ed.doc.steps.filter(s => !s._removed);
const isRunning = s => s.status === "A";
/* a running BrewStart's settings still change on Brew Steps, where BrewStart takes them while it runs (its own
   change_settings, 1.3.0.post6): waiting for its time, heating the water or holding it. SAVE sends them through it
   (saveSteps), as CraftBeerPi changes no running step itself. Its name and kind stay as they are while it runs, and
   every other running step stays locked */
const bsTakes = () => declares(Object.values(D.types), "BrewStart", "change_settings");
const liveBs = s => st.page === "steps" && isRunning(s) && s.type === "BrewStart" && bsTakes();
/* what a running BrewStart is doing, as it keeps it with the step: heating the water, holding it for the move, or
   waiting for its time */
const bsDoing = s => { const p = s.props || {}; return p._brewstart_heating ? (p._brewstart_asked ? "holding" : "heating") : "waiting"; };
/* a running BrewStart whose name or kind has a change not saved (made before it began, on this page): BrewStart can't
   take those, so SAVE waits for them to be put back */
const bsFixed = (ed, s) => liveBs(s) && stepChange(ed, s).keys.some(k => k === "name" || k === "type");
/* a step's settings as the brewer sets them: not the ones a step keeps for itself while it runs (_elapsed_seconds and
   the rest), which CraftBeerPi writes */
const ownKeys = p => Object.keys(p || {}).filter(k => !k.startsWith("_"));
/* what changed in a step: a new or removed step counts once; otherwise its name, kind, each setting and a move */
function stepChange(ed, s) {
  const o = origOf(ed, s);
  if (!o) return {tag: "new", n: 1, keys: []};
  if (s._removed) return {tag: "removed", n: 1, keys: []};
  const keys = [];
  if (norm(s.name) !== norm(o.name)) keys.push("name");
  if (s.type !== o.type) keys.push("type");
  new Set([...ownKeys(s.props), ...ownKeys(o.props)]).forEach(k => { if (!same((s.props || {})[k], (o.props || {})[k])) keys.push(k); });
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
const stepByKey = k => E() && E().doc.steps.find(s => s._k === k);
/* what CraftBeerPi declares about a kind's setting (GET /system/ step.types) */
function propOf(type, label) {
  const t = D.types[type];
  return t && Array.isArray(t.properties) ? t.properties.find(p => p && p.label === label) || null : null;
}
/* what a setting is called, what it does, and what kind of control it gets: the catalogue's plain words, or, for a
   setting it doesn't know, CraftBeerPi's own */
function meta(type, label) {
  const m = ((CAT.KINDS[type] || {}).p || {})[label];
  if (m) return m;
  const p = propOf(type, label);
  return p ? {n: p.display_label || label.replace(/_/g, " "), h: firstSentence(p.description), unit: p.unit || "", raw: true} : {n: label.replace(/_/g, " ")};
}
const optVal = o => String(o && typeof o === "object" ? (o.value ?? o.label) : o);
function typeOf(type, label) {
  const c = (CAT.TYPES[type] || {})[label];
  if (c) return c;
  const p = propOf(type, label), k = p ? String(p.type || "").toLowerCase() : "";
  if (k === "select") return Array.isArray(p.options) ? p.options.map(optVal) : "text";
  if (["number", "kettle", "sensor", "actor", "date", "time"].includes(k)) return k;
  if (p) return "text";
  return /^Hop_\d$|Timer|Temp/.test(label) ? "number" : "text";
}
/* every setting a kind has: the catalogue's, and any CraftBeerPi declares for it */
const labelsOf = type => [...new Set([...Object.keys(CAT.TYPES[type] || {}), ...((D.types[type] || {}).properties || []).filter(p => p && p.label).map(p => p.label)])];
const volUnit = () => (D.unit === "C" ? "L" : "gal");
const unitOf = (m, s) => m.unit === "deg" ? U() : m.unit === "vol" ? ((s.props || {}).Volume_Unit || volUnit()) : m.unit || "";
function shownValue(s, label, v) {
  const t = typeOf(s.type, label), m = meta(s.type, label);
  if (norm(v) === "") return m.blankAs ? `${(m.opts || {})[m.blankAs] || m.blankAs}, left blank` : m.blank || "blank";
  if (t === "kettle") return nameOf(D.kettles, v) || "not found";
  if (t === "sensor") return nameOf(D.sensors, v) || "not found";
  if (t === "actor") return nameOf(D.actors, v) || "not found";
  if (Array.isArray(t)) return (m.opts || {})[v] || v;
  if (t === "time") return tod(hm(v)) || v;
  const u = unitOf(m, s);
  return `${v}${u ? " " + u : ""}`;
}
/* the HLT: the vessel this recipe's sparge heats, else the kettle that is neither the mash tun nor the boil kettle, else
   the one called HLT */
function hltOf(steps) {
  const sp = (steps || []).find(s => s.type === "SpargeStep" && (s.props || {}).Kettle);
  if (sp) return sp.props.Kettle;
  const other = D.kettles.find(k => k.id !== C("MASH_TUN") && k.id !== C("BoilKettle"));
  return (other || D.kettles.find(k => /\bHLT\b|hot liquor/i.test(k.name)) || {}).id || "";
}
// a new step of a kind: CraftBeerPi's own starting values, and the vessel its kind belongs to. A BrewStart is filled in
// from the rig (brewStartProps), and says from where
function newStep(type) {
  const g = (CAT.KINDS[type] || {}).g, ed = E(), props = {...(CAT.START[type] || {})};
  const s = {_k: "n" + (KEY++), name: kindName(type), type, props, status: st.page === "steps" ? "I" : undefined};
  if (type === "BrewStart") { const f = brewStartProps(ed); s.props = f.props; s._fill = f.fill; return s; }
  if (!CAT.KINDS[type]) ((D.types[type] || {}).properties || []).forEach(p => { if (p && p.label && p.default_value != null && !(p.label in props)) props[p.label] = p.default_value; });
  const labels = labelsOf(type), kettleish = l => typeOf(type, l) === "kettle";
  if (labels.includes("Kettle") && kettleish("Kettle")) props.Kettle = g === "mash" ? C("MASH_TUN") || "" : g === "sparge" ? hltOf(ed ? live(ed) : []) : C("BoilKettle") || "";
  if (labels.includes("Heat_Kettle")) props.Heat_Kettle = hltOf(ed ? live(ed) : []);
  if (labels.includes("Mash_Tun")) props.Mash_Tun = C("MASH_TUN") || "";
  if (type === "BoilStep" && num(C("steps_boil_temp")) != null) props.Temp = C("steps_boil_temp");
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
/* Brew Steps on a CraftBeerPi before 4.7.7.post58: no order in one change, and a new step's place is ignored */
const lastOnly = () => st.page === "steps" && orders() === false;
/* where a new step of a kind belongs in a brew, so it rarely needs moving: BrewStart first, mash in before the rests,
   a rest before the mash out, the sparge after the mash, the boil after the sparge, the whirlpool after the boil,
   cooling last; anything else after the step that was open, or last. Returns the place among the live steps (0 is
   first) and where that is, in words */
function naturalPlace(ed, type) {
  const L = live(ed), cur = L.findIndex(s => s._k === (ed.from || ed.cur));
  if (lastOnly()) return {at: L.length, where: L.length ? "at the end: this CraftBeerPi adds every step last" : "the first step"};
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
/* the newest BrewStart there is: on Brew Day's steps, or in the newest recipe in the book that has one. Its HLT, element
   and Campden choice are the rig's, which a new BrewStart takes; never its water, which was that recipe's */
function newestBrewStart() {
  const onDay = st.loaded && st.loaded.steps.find(s => s.type === "BrewStart");
  if (onDay) return {s: onDay, from: `${st.loaded.name || "the steps"} on Brew Day`};
  for (const r of sorted()) { const s = stepsOf(r).find(x => x.type === "BrewStart"); if (s) return {s, from: r.name}; }
  return null;
}
const PAST_WAIT = "Waiting for CraftBeerPi's past brews, for the HLT's water.";
/* the water of a brew that was brewed, for a new BrewStart on a recipe whose own can't be worked out: the newest past
   brew in CraftBeerPi's logs and BrewScribe (GET /figures/) whose HLT heating recorded its water (pastWater, which Brew
   Day's + BrewStart shares). Asked once, when a new BrewStart first needs it; st.past is "wait" until it answers, then
   the brew or null. A recipe that was only loaded, or kept in the book, is never where it comes from */
async function askPast() {
  if (st.past !== undefined) return;
  st.past = "wait";
  const g = gen, res = await call("GET", "/figures/", undefined, 15000);
  if (g !== gen || !st) return;
  st.past = pastWater(res.ok ? res.data : null, volUnit());
  schedule();
}
/* whether a new BrewStart's water can't come from the recipe it joins: no BeerSmith mash figures, or no Grain absorption */
const waterFromPast = () => !recipeWater(recipeNumbers(), C("GRAIN_ABSORPTION"), D.unit);
/* why adding a BrewStart waits: CraftBeerPi's clock isn't known yet (its day); Brew Day's steps haven't come (GET
   /system/ not answered, so a BrewStart there isn't known), which on a slow Pi can come after the clock and the book;
   the Recipe Book's steps are still coming, where its HLT, element and Campden choice come from when Brew Day has no
   BrewStart; or, for a recipe whose own water can't be worked out, CraftBeerPi's past brews */
function bsWhy() {
  const fromPast = waterFromPast();
  if (fromPast && st.past === undefined) askPast();
  if (!cbNow()) return CLOCK_WAIT;
  if (!D.loaded) return STEPS_WAIT;
  const onDay = st.loaded && st.loaded.steps.some(s => s.type === "BrewStart");
  if (!onDay && !st.bookFail && !(st.bookRead && st.book.every(r => Array.isArray(r.steps) || r.bad))) return WAIT;
  if (fromPast && st.past === "wait") return PAST_WAIT;
  return "";
}
const v1 = n => (Math.round(n * 10) / 10).toFixed(1);
// the recipe a new BrewStart joins: Brew Day's copy on Brew Steps, else the book's copy being changed or open
function recipeNumbers() {
  if (st.page === "steps") return (st.loaded || {}).mash_numbers;
  const r = book(st.ed ? st.ed.file : st.open);
  return r ? (r.basic || {}).mash_numbers : null;
}
/* a new BrewStart: Ready by, with the HLT, its element and the Campden choice of the newest BrewStart, the water this
   recipe needs, else the water of the newest past brew that recorded it (labelled with that brew), else none, saying
   so, and the water temperature of its mash in. The time is left for the brewer: it is the one thing only he knows,
   and SAVE waits for it. The day is Tomorrow from noon by CraftBeerPi's clock (the night before), Today before; every
   way of adding one waits for that clock (bsWhy) */
function brewStartProps(ed) {
  const L = ed ? live(ed) : [], src = newestBrewStart(), q = src ? src.s.props || {} : {}, mi = L.find(s => s.type === "MashInStep");
  const numbers = recipeNumbers(), w = recipeWater(numbers, C("GRAIN_ABSORPTION"), D.unit), unit = volUnit(), now = cbNow();
  const past = !w && st.past && st.past !== "wait" ? st.past : null;
  const props = {Timing: "Ready by", Mode: now && hhmmOf(now) >= "12:00" ? "Tomorrow" : "Today", StartDate: "", StartTime: "",
    Heat_Kettle: q.Heat_Kettle || hltOf(L), Ready_Temp: mi && num(mi.props.Temp) != null ? mi.props.Temp : q.Ready_Temp ?? "",
    Volume: w ? Math.round(w.total * 10) / 10 : past ? Math.round(past.vol * 10) / 10 : "", Volume_Unit: w ? w.unit : past ? past.unit : unit, Grain_Temp: "", Heater_Watts: q.Heater_Watts ?? "",
    Campden_Reminder: q.Campden_Reminder || "No", NotifyBefore: "", AutoNext: "Yes"};
  const got = [props.Heat_Kettle && nameOf(D.kettles, props.Heat_Kettle) && `the ${nameOf(D.kettles, props.Heat_Kettle)}`, num(props.Heater_Watts) != null && `its ${fmt(num(props.Heater_Watts))} W element`,
    props.Campden_Reminder === "Yes" && "the Campden reminder"].filter(Boolean);
  const from = src && got.length ? `Filled in from ${src.from}, the newest recipe with a BrewStart: ${andList(got)}.` : "No recipe has a BrewStart yet, so the element is blank.";
  const lacks = waterLacks(numbers, C("GRAIN_ABSORPTION"));
  const water = w ? ` The water, ${v1(w.total)} ${w.unit}, is what this recipe needs, worked out from the recipe file: ${v1(w.before)} ${w.unit} before the boil, and ${v1(w.kept)} ${w.unit} the grain keeps (Grain absorption in Settings, ${w.rate})${w.lost ? `, and ${v1(w.lost)} ${w.unit} lost under the mash` : ""}.`
    : past ? ` The water, ${v1(past.vol)} ${past.unit}, is what the HLT heated for ${brewWords(past)}, the last brew that recorded it: ${lacks}.`
    : ` No water filled in: ${lacks}, and ${st.past === "wait" ? "CraftBeerPi's past brews haven't come yet" : "no past brew recorded the HLT's water"}. Give it under The water, or in Brew Day's strike water box.`;
  const temp = mi && num(mi.props.Temp) != null ? ` The water temperature is ${nameIn(mi)}'s, ${fmt(num(mi.props.Temp))} ${U()}; on Brew Day the strike water box can change it.` : "";
  return {props, fill: `${from}${water}${temp}`};
}
const ymd = t => /^\d{4}-\d{2}-\d{2}$/.test(norm(t)) ? norm(t) : "";
const dayAfter = iso => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + 1); return isoOf(d); };
/* a day and a time of it as seconds on one count, as Brew Day counts its BrewStart box's: the day's number, and the
   seconds into it */
const daySecs = (iso, sec) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 1000 + sec;
/* how far off that is, in the words of Brew Day's BrewStart box (live.js inWords): "in 10 h 20 min", kept on one line,
   and on a simulator not at 1x the real time too, ", about 35 real minutes at 30×" */
function awayWords(sec) {
  const w = inWords(sec, brewScale()), i = w.indexOf(",");
  return i < 0 ? w.replace(/ /g, NBSP) : `${w.slice(0, i).replace(/ /g, NBSP)}${w.slice(i)}`;
}
/* when a BrewStart's time comes, as the plugin works it out: Today and Tomorrow count from when START is pressed, by
   CraftBeerPi's clock, and a time that has passed by then starts nothing by itself. Then how far off it is from now, by
   that clock. Left out until that clock is known */
function whenHTML(ed, s) {
  const p = s.props || {}, t = hm(p.StartTime), mode = norm(p.Mode) || "Today", ready = readyBy(p), cb = cbNow();
  if (!cb || !t || (mode === "Date" && !ymd(p.StartDate))) return "";
  const now = isoOf(cb), iso = mode === "Date" ? ymd(p.StartDate) : mode === "Tomorrow" ? dayAfter(now) : now;
  const day = new Date(`${iso}T12:00:00`), dw = `${WEEK[day.getDay()]} ${day.getDate()} ${MON[day.getMonth()]}`, tt = tod(t);
  const rel = iso === now ? "today" : iso === dayAfter(now) ? "tomorrow" : "";
  const left = daySecs(iso, +t.slice(0, 2) * 3600 + +t.slice(3) * 60) - daySecs(now, cb.getHours() * 3600 + cb.getMinutes() * 60 + cb.getSeconds());
  if (left <= 0) return `<span class="late">${tt} ${rel || dw} has passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW.</span>`;
  const L = live(ed), nx = L[L.indexOf(s) + 1], when = `<b>${tt}</b>${rel ? ` ${rel},` : ""} ${dw}: ${awayWords(left)}.`;
  const what = ready ? `the ${esc(nameOf(D.kettles, p.Heat_Kettle) || "HLT")}'s water is hot by ${when}` : `${esc(nx ? nameIn(nx) : "the next step")} starts at ${when}`;
  return mode === "Date" ? `${what[0].toUpperCase()}${what.slice(1)}` : `With START pressed today, ${what}`;
}
/* CraftBeerPi's clock at the top of BrewStart's When settings, where it isn't the screen's (a simulator: another date,
   or a speed other than 1×), as the title bar's tag decides it, in the words of Brew Day's BrewStart box: TODAY,
   TOMORROW and the time in words are all by that clock, and the brewer is looking here, not at the title bar, while he
   sets the time. The screen's own date only decides whether it shows. A screen reader hears it as a sentence. Its band
   (.cbbar) is pinned at the top of When, under the tool row where that sticks (--tool-h, fitPinned) or at the top of the
   pane, so it stays in view while When's rows scroll under it, as Brew Day's box pins its tag */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function cbClockHTML() {
  const d = cbNow(), sc = brewScale();
  if (!d) return "";
  const other = isoOf(d) !== isoOf(new Date()), fast = sc !== 1;
  if (!other && !fast) return "";
  const t = tod(d);
  // a narrow screen breaks it only after a "·", never inside a part
  const seen = ["CraftBeerPi's clock", `${WEEK[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}, ${t}`, fast ? `${sc}× speed` : ""].filter(Boolean).map(x => x.replace(/ /g, NBSP)).join(`${NBSP}· `);
  const said = `CraftBeerPi's clock: ${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${t}${fast ? `, running ${sc} times as fast` : ""}.`;
  return `<div class="cbbar"><p class="cbclk"><span class="seen" aria-hidden="true">${esc(seen)}</span><span class="sr">${esc(said)}</span></p></div>`;
}
/* what a BrewStart still needs before it can be saved, for a setting (said under it) or for the whole step (said by
   SAVE): the time always; the vessel and the element's watts for Ready by, which works out from them when to heat. A
   time typed that can't be read is said once its box is left, not while it is being typed */
function needOf(s, label) {
  if (s.type !== "BrewStart" || s._removed) return "";
  const p = s.props || {}, ready = readyBy(p);
  if (label === "StartTime" && !hm(p.StartTime)) return !norm(s._tt ?? p.StartTime) ? "Needed: without a time, BrewStart can't start." : s._typing ? ""
    : twelve() ? "That isn't a time: type it as 7, 7:30 or 730, and tap AM or PM." : "That isn't a time: type it as 7, 7:30 or 19:30.";
  if (label === "StartDate" && p.Mode === "Date" && !ymd(p.StartDate)) return "Needed with DATE.";
  if (label === "Heat_Kettle" && ready && !norm(p.Heat_Kettle)) return "Needed for Ready by: the vessel to heat.";
  if (label === "Heater_Watts" && ready && num(p.Heater_Watts) == null) return "Needed for Ready by: it works out when to start heating from the element's watts.";
  return "";
}
/* on Brew Steps, a step that has begun since a new or moved step was put above it, on another screen: CraftBeerPi
   keeps every step up to the last one that has begun in its place, so that one can't go there now */
function blockedOf(ed) {
  if (!ed || st.page !== "steps") return null;
  const L = live(ed), f = firstFree(ed);
  for (let i = 0; i < f; i++) { const s = L[i]; if (!origOf(ed, s) || s._moved) return {s, begun: L[f - 1]}; }
  return null;
}
const blockedWords = x => `${nameIn(x.begun)} has begun, so ${nameIn(x.s)} can't go above it now. MOVE it below ${nameIn(x.begun)}, or remove it.`;
function needsWhy(ed) {
  if (!ed) return "";
  const x = blockedOf(ed);
  if (x) return blockedWords(x);
  const words = {StartTime: "Set BrewStart's time first.", StartDate: "Give BrewStart its date first.", Heat_Kettle: "Choose BrewStart's vessel first.", Heater_Watts: "Give BrewStart the element's watts first."};
  for (const s of live(ed)) {
    if (s.type !== "BrewStart" || !stepChange(ed, s).tag) continue;
    if (bsFixed(ed, s)) return "Put BrewStart's name and kind back first: they can't change while it runs.";
    for (const l of Object.keys(words)) if (needOf(s, l)) return words[l];
  }
  return "";
}
// SAVE's second line for what it waits for: "set BrewStart's time first", "move BrewStart below MashIn first"
function needsSmall(ed) {
  const x = blockedOf(ed);
  if (x) return `move ${nameIn(x.s)} below ${nameIn(x.begun)} first`;
  return needsWhy(ed).replace(/^Set/, "set").replace(/^Give/, "give").replace(/^Choose/, "choose").replace(/^Put/, "put").replace(/:.*$/, "").replace(/\.$/, "");
}
/* what SAVE does to a running BrewStart that the brewer should know before pressing it, said under the setting: a new
   vessel while it heats asks first (saveSteps' question), and Start at while it heats stops the heating */
function bsSaveSays(ed, s, label) {
  if (!liveBs(s) || bsDoing(s) === "waiting") return "";
  const o = origOf(ed, s), p = s.props || {}, q = (o && o.props) || {}, was = nameOf(D.kettles, q.Heat_Kettle) || "vessel";
  if (label === "Heat_Kettle" && norm(p.Heat_Kettle) !== "" && !same(p.Heat_Kettle, q.Heat_Kettle)) return `BrewStart is heating the ${was}: SAVE asks before the heating moves.`;
  if (label === "Timing" && readyBy(q) && !readyBy(p)) return `SAVE stops BrewStart's heating: the ${was}'s AUTO goes off.`;
  return "";
}
// whether a setting shows: as the plugin's form shows it (its show_if, where CraftBeerPi sends one), any one of the
// conditions being enough; else the catalogue's copy of it, where a blank setting counts as the choice it stands for
function shows(s, label) {
  const p = propOf(s.type, label), r = p && p.show_if;
  const holds = rule => Object.entries(rule).every(([k, allowed]) => (Array.isArray(allowed) ? allowed : [allowed]).some(v => norm(v) === norm((s.props || {})[k])));
  if (Array.isArray(r)) { const rs = r.filter(x => x && typeof x === "object" && !Array.isArray(x)); return !rs.length || rs.some(holds); }
  if (r && typeof r === "object") return holds(r);
  const c = ((CAT.KINDS[s.type] || {}).show || {})[label];
  if (c) return c.some(cond => Object.entries(cond).every(([k, vals]) => vals.includes(norm((s.props || {})[k]))));
  return true;
}
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
      const isCur = b && b.state === "running" && st.loaded && st.loaded.steps[b.cur] && st.loaded.steps[b.cur].id === s.id;
      right = s.status === "D" ? "✓ DONE" : s.status === "A" ? `<span class="run"><i aria-hidden="true"></i>RUNNING</span>${st.loaded && st.loaded.left != null && isCur ? `<span class="left">${mmss(st.loaded.left)} LEFT</span>` : ""}`
        : (s.status === "S" || s.status === "E") ? "STOPPED" : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
    } else right = esc(kindName(s.type).toUpperCase());
    if (s === mv) right += `<span class="tag">MOVING</span>`;
    else if (ch.tag) right += `<span class="tag${ch.tag === "removed" ? " gone" : ""}">${ch.tag === "new" ? "NEW" : ch.tag === "removed" ? "REMOVED" : ch.tag === "moved" ? "MOVED" : "CHANGED"}</span>`;
    const cur = !mv && o.cur && s._k && o.cur === s._k ? ' aria-current="true"' : "";
    const cls = `step${s.status === "D" && o.run ? " done" : ""}${ch.tag === "removed" ? " removed" : ""}${s === mv ? " moving" : ""}`;
    const inner = `<span class="n">${i + 1}</span><span class="t">${esc(v.n)}</span>${v.p ? `<span class="p">${esc(v.p)}</span>` : ""}${v.note ? `<span class="p">${esc(v.note)}</span>` : ""}<span class="s">${right}</span>${v.adds ? `<span class="adds">${v.adds.map(a => `<span>${typeof a[0] === "number" ? `${fmt(a[0])} min` : esc(a[0])}</span><span>${esc(a[1])}</span><span>${esc(a[2])}</span>`).join("")}</span>` : ""}`;
    const go = s._k || "i" + i, before = mv && !s._removed ? slot(L.indexOf(s)) : "";
    if (mv) return `${before}<li id="c-${esc(go)}"><div class="${cls}">${inner}</div></li>`;
    return `<li id="c-${esc(go)}"><button type="button" class="${cls}" data-go="${esc(go)}"${cur} aria-label="Step ${i + 1}, ${esc(v.n)}${v.p ? ", " + esc(v.p) : ""}. Open its settings">${inner}</button></li>`;
  }).join("") + slot(L.length);
  const offers = o.bsadd && !mv && hasKind("BrewStart"), bw = offers ? bsWhy() : "", bsWait = bw ? ` aria-disabled="true" data-why="${esc(bw)}"` : "";
  const at = (ed ? firstFree(ed) : 0) + 1;
  const offer = offers ? `<li class="bsrow"><button type="button" class="bsadd" data-bsadd aria-label="Add BrewStart: hot water by a set time, goes in as step ${at}"${bsWait}><span class="n" aria-hidden="true">+</span><b>BrewStart</b><span class="d">Hot water by a set time · goes in as step ${at}</span></button></li>` : "";
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
  const back = `<a href="#list" class="back" data-back="list">‹ All recipes</a>`;
  if (!st.bookRead) return st.bookFail ? `<h2>Recipe Book</h2><p class="rmeta">Couldn't be read: ${esc(st.bookFail)}.</p>` : `<h2>Recipe Book</h2><p class="rmeta">Reading the Recipe Book…</p>`;
  const r = st.open && book(st.open);
  if (!r) return `<h2>The Recipe Book is empty</h2><p class="rmeta">Import a recipe from BeerSmith or Brewfather, or write one with + NEW.</p>`;
  const ed = st.pane === "edit" && st.ed && st.ed.file === r.file ? st.ed : null;
  if (ed) {
    const d = ed.doc, n = changes(ed);
    return `${back}<h2>${esc(d.name || "No name yet")}</h2>
      <p class="rmeta">Changing the Recipe Book's copy${n ? ` · <b>${n} ${n === 1 ? "change" : "changes"} not saved</b>` : ""}</p>
      <div class="rctl">${cmd("", "+ STEP", "add one", {data: " data-addstep"})}${cmd("", "NAME", "and notes", {data: ' data-go="r"'})}${cmd("", "CLOSE", "back to the book", {data: " data-close"})}</div>
      ${st.ask && st.ask.kind === "leave" && narrow() ? leaveHTML() : ""}
      ${ed.mv ? moveBarHTML(ed) : ""}${d.steps.length ? stepsListHTML(d.steps, {ed, cur: ed.cur, bsadd: !hasBrewStart(d.steps)}) : `<p class="empty"><b>No steps yet</b>+ STEP adds the first.</p>`}`;
  }
  const b = brew(), on = isLoaded(r.file) && b.state !== "finished", bad = r.bad ? "CraftBeerPi couldn't read this recipe." : "";
  const meta = on ? `<span class="on${b.state === "running" ? " run" : ""}">On Brew Day · ${statusWords(b).toLowerCase()}</span>`
    : `Recipe Book${r.imported_from ? ` · imported from ${esc(r.imported_from)}, ${dateWords(r.modified, true)}` : ` · changed ${dateWords(r.modified, true)}`}`;
  const first = on ? cmd("", "BREW DAY", b.state === "running" ? "running there" : b.state === "ready" && !b.begun ? "start it there" : "where it is", {data: " data-tabgo=\"Brew Day\""})
    : bad ? cmd("", "LOAD", "onto Brew Day", {why: bad}) : loadBtn(r.file, "col");
  const ask = st.ask && st.ask.kind === "load" && st.ask.from === "col" ? loadAskHTML(st.ask.file) : "";
  const steps = r.bad ? `<p class="empty"><b>Couldn't be read</b>${esc(bad)}</p>` : !Array.isArray(r.steps) ? `<p class="empty"><b>Reading its steps</b>CraftBeerPi is sending them.</p>` : stepsListHTML(r.steps, {bsadd: !hasBrewStart(r.steps)});
  return `${back}<h2>${esc(r.name)}</h2>
    <p class="rmeta">${meta}</p>
    ${r.desc ? `<p class="desc">${esc(r.desc)}</p>` : ""}${noFig(r) ? `<p class="nofig">${NOFIG}</p>` : ""}
    <div class="rctl">${first}${cmd("", "EDIT", "steps and name", {data: " data-edit", why: bad || (Array.isArray(r.steps) ? "" : WAIT)})}${cmd("", "COPY", "as a new recipe", {data: " data-copy", why: bad})}</div>
    ${ask}${offerHTML(r.file)}<p class="note" id="col-note" role="status">${esc(st.notes.col || "")}</p>
    ${steps}`;
}
/* after SAVE on the recipe that is on Brew Day: Brew Day keeps the copy it loaded, so the page says so, and LOAD AGAIN
   brings the change across, by LOAD's own rules. Where CraftBeerPi says the book copy's time when it was loaded or kept
   (book_modified), whenever the book's copy is newer than that: both are the file's times, so a fast simulator's clock
   doesn't come into it. Otherwise after every SAVE */
function offerHTML(file) {
  if (!isLoaded(file)) return "";
  const r = book(file), L = st.loaded;
  if (knowsBook() && L.bm != null ? !(r && r.modified != null && r.modified - L.bm > 0.001) : st.offer !== file) return "";
  const b = brew(), at = atWords(L.at), copy = at ? `the copy loaded${at}` : "the copy it loaded";
  if (b.state === "running" || b.begun) return `<p class="pnote">Brew Day keeps ${copy.replace("the copy loaded", "the copy it loaded")}, without this change, while its brew goes on. The change is for next time.</p>`;
  return `<div class="pnote"><b>Brew Day still has ${copy}</b>, without this change. LOAD AGAIN to brew with it.<div class="acts">${loadBtnAgain(file)}</div></div>`;
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
  ensureBs();
  const ed = st.bs, n = changes(ed);
  if ((!L || b.state === "none") && !ed.doc.steps.length) return `<h2>No recipe loaded</h2><p class="rmeta">Brew Day is brewing by hand.</p>
    <div class="rctl two">${cmd("", "RECIPE BOOK", "choose one", {data: ' data-tabgo="Recipe Book"'})}${cmd("", "+ STEP", "build steps here", {data: " data-addstep"})}</div>
    <p class="note" id="col-note" role="status">${esc(st.notes.col || "")}</p>`;
  const un = unloadRule(), pendU = st.pend.unload, pendB = st.pend.tobook;
  const ask = st.ask && (st.ask.kind === "unload" ? unloadAskHTML() : st.ask.kind === "tobook" ? toBookHTML() : !narrow() ? ""
    : st.ask.kind === "leave" ? leaveHTML() : st.ask.kind === "vessel" && st.view !== "plate" ? vesselHTML() : "");
  const meta = L ? `<span class="on${b.state === "running" ? " run" : ""}">On Brew Day · ${statusWords(b).toLowerCase()}</span>` : `<span class="on">Not on Brew Day yet</span>`;
  return `<h2>${esc((L && L.name) || "Steps with no name")}</h2>
    <p class="rmeta">${meta}${n ? ` · <b>${n} ${n === 1 ? "change" : "changes"} not saved</b>` : ""}</p>
    ${L && L.author ? `<p class="by">by ${esc(L.author)}</p>` : ""}${L && L.desc ? `<p class="desc">${esc(L.desc)}</p>` : ""}
    <div class="rctl">${cmd("", "BREW DAY", b.state === "running" ? "running there" : "start it there", {data: ' data-tabgo="Brew Day"'})}${cmd("", pendB ? "SAVING…" : "SAVE TO BOOK", pendB ? "waiting for CraftBeerPi" : "keep for next time", {busy: pendB, data: " data-tobook", why: pendB ? WAIT : n ? "SAVE your changes to the brew steps first, then keep them in the book." : !L ? "SAVE the steps first, then keep them in the book." : "", live: true})}${cmd("", pendU ? "UNLOADING…" : "UNLOAD", pendU ? "waiting for CraftBeerPi" : "brew by hand", {busy: pendU, data: " data-unload", why: pendU ? WAIT : un.why || ""})}</div>
    ${ask || ""}<p class="note" id="col-note" role="status">${esc(st.notes.col || "")}</p>
    ${ed.mv ? moveBarHTML(ed) : ""}${stepsListHTML(ed.doc.steps, {ed, cur: ed.cur, run: true, bsadd: (b.state === "none" || (b.state === "ready" && !b.begun)) && !hasBrewStart(ed.doc.steps) && !lastOnly()})}
    ${ed.mv ? "" : cmd("addstep", "+ STEP", "add one to this brew", {data: " data-addstep"})}`;
}
function unloadRule() {
  if (st.link === "lost") return {why: PAUSED};
  if (!st.loaded) return {why: "Nothing is loaded: Brew Day is brewing by hand."};
  if (st.pend.load || st.pend.unload || !st.bookRead) return {why: WAIT};
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
/* SAVE TO BOOK: replace the book's copy the steps came from, or save them as a new recipe under a name. Where CraftBeerPi
   doesn't say which copy that is, it saves them as a new recipe, named as they are */
function toBookHTML() {
  const L = st.loaded, r = L && L.file ? book(L.file) : null, d = cbNow();
  if (!knowsBook()) return `<div class="confirm" role="group" aria-labelledby="ask-t" id="ask"><p id="ask-t">Keep these steps in the Recipe Book, as a new recipe named <b>${esc(L.name || "Brew steps")}</b>?</p>
    <div class="acts"><button type="button" class="yes" data-yes="asnew">Save as new</button><button type="button" data-no>Cancel</button></div></div>`;
  const name = L.name ? (d ? `${L.name}, ${d.getDate()} ${MON[d.getMonth()]}` : L.name) : "";
  return `<div class="confirm" role="group" aria-labelledby="ask-t" id="ask"><p id="ask-t">Keep these steps in the Recipe Book. ${r ? `<b>Replace ${esc(r.name)}</b> there, the copy they were loaded from, saved ${dateWords(r.modified, true)}? Or save them as a new recipe:` : "Save them as a new recipe:"}</p>
    <input class="fld" id="tb-name" value="${esc(name)}" placeholder="Its name" aria-label="The new recipe's name"><p class="note" id="tb-note" role="status">${esc(st.notes.tb || "")}</p>
    <div class="acts">${r ? `<button type="button" class="yes" data-yes="replace">Replace the book's copy</button>` : ""}<button type="button"${r ? "" : ' class="yes"'} data-yes="asnew">Save as new</button></div>
    <div class="acts three"><button type="button" data-no>Cancel</button></div></div>`;
}
function leaveHTML() {
  const ed = E(), n = changes(ed), to = st.ask.to;
  return `<div class="confirm" role="group" aria-labelledby="lv-t" id="ask"><p id="lv-t"><b>${esc(ed.doc.name || "Steps with no name")}</b> has ${n} ${n === 1 ? "change" : "changes"} not saved. ${to ? `Save ${n === 1 ? "it" : "them"} before opening ${esc(to)}?` : "Save them before closing?"}</p>
    <div class="acts"><button type="button" class="yes" data-yes="save-go">Save and go</button><button type="button" data-yes="drop-go">Go without saving</button></div><div class="acts three"><button type="button" data-no>Stay</button></div></div>`;
}
/* ---------- the tool row ---------- */
function toolHTML() {
  if (st.page === "steps") {
    const ed = st.bs, n = ed ? changes(ed) : 0, L = st.loaded;
    if (!L && !(ed && ed.doc.steps.length)) return `<h1>Brew Steps<small>The steps of the recipe on Brew Day. None is loaded.</small></h1>`;
    if (!L) return `<h1>Brew Steps<small>Steps built here, for Brew Day. Nothing is saved until SAVE.</small></h1>${saveBtns(n, "for this brew")}`;
    return `<h1>Brew Steps<small>Brew Day's copy of ${esc(L.name || "steps with no name")}${L.at != null ? `, loaded${atWords(L.at)}` : ""}. Changes here are for this brew.</small></h1>${saveBtns(n, "for this brew")}`;
  }
  if (st.pane === "edit") return `<h1>Changing a recipe<small>The Recipe Book's copy. Brew Day's isn't changed.</small></h1>${saveBtns(changes(st.ed), "in the Recipe Book")}`;
  if (st.pane === "import") return `<h1>Import a recipe<small>It goes into the Recipe Book. Brew Day isn't changed.</small></h1><div class="btns ed nb">${cmd("", "RECIPE BOOK", "back to the list", {data: " data-list"})}</div>`;
  if (st.pane === "copy") return `<h1>Copy a recipe<small>The copy is a new recipe in the book.</small></h1><div class="btns ed nb">${cmd("", "CANCEL", "", {data: " data-list"})}</div>`;
  if (st.pane === "new") return `<h1>A new recipe<small>It starts with no steps.</small></h1><div class="btns ed nb">${cmd("", "CANCEL", "", {data: " data-list"})}</div>`;
  return `<div class="find fi"><label for="q">Find a recipe</label><input id="q" type="search" autocomplete="off" spellcheck="false" value="${esc(st.q)}"><button type="button" class="clr" data-clear aria-label="Clear the search"${st.q ? "" : " hidden"}>CLEAR</button></div>
    <div class="btns">${cmd("", "+ NEW", "write one", {data: " data-new", live: true})}${cmd("", "IMPORT", "from a file or Brewfather", {data: " data-import"})}</div>`;
}
function saveBtns(n, where) {
  const s = st.pend.save, ed = E(), need = !s && n ? needsWhy(ed) : "";
  return `<div class="btns ed sv">${cmd("", "UNDO", n ? `all ${n}` : "nothing yet", {data: " data-undoall", why: s ? WAIT : n ? "" : "Nothing to undo."})}${cmd("go", s ? "SAVING…" : "SAVE", s ? "waiting for CraftBeerPi" : need ? needsSmall(ed) : n ? `${n} ${n === 1 ? "change" : "changes"}, ${where}` : "nothing to save yet", {busy: s, data: " data-save", why: s ? WAIT : !n ? "Nothing has changed yet: change a step, then SAVE." : need, live: true})}</div>`;
}
/* what SAVE has to say, under it: CraftBeerPi's refusal for six seconds, or that the brew steps were changed elsewhere */
function saveNoteHTML() {
  const t = st.notes.save || (st.elsewhere && dirty() ? "The brew steps were changed on another screen. Your changes are still here." : "");
  return `<p class="note" id="save-note" role="status">${esc(t)}</p>`;
}

/* ---------- the right-hand side ---------- */
function workHTML() {
  if (st.page === "steps") return platesHTML();
  if (st.pane === "edit") return st.ed ? platesHTML() : `<div class="plates"><section class="plate pick"><div class="phd"><h2>Reading the recipe</h2><p class="sum">CraftBeerPi is sending its steps.</p></div></section></div>`;
  if (st.pane === "import") return importHTML();
  if (st.pane === "copy" || st.pane === "new") return nameHTML();
  return bookHTML();
}
/* the book: a row per recipe, newest first, the numbers that tell recipes apart in fixed columns, LOAD at the end, or
   what the recipe on Brew Day is doing. FIND looks in names, where they came from, step names and additions */
function words() { return st.q.toLowerCase().split(/\s+/).filter(Boolean); }
function hay(r) { const S = stepsOf(r); return [r.name, r.desc, r.imported_from, ...S.map(s => `${s.name} ${kindName(s.type)}`), ...S.flatMap(s => s.type === "BoilStep" ? additionsOf(s.props).map(a => `${a[1]} ${a[2]}`) : [])].join(" \u0001 ").toLowerCase(); }
const hit = r => words().every(w => hay(r).includes(w));
function marked(text) {
  let h = esc(text);
  for (const w of words()) h = h.replace(new RegExp(`(${esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
  return h;
}
function hitLine(r) {
  const ws = words();
  if (!ws.length || ws.every(w => `${r.name} ${fromLine(r)}`.toLowerCase().includes(w))) return "";
  for (const s of stepsOf(r)) {
    if (s.type === "BoilStep") for (const a of additionsOf(s.props)) { const t = `${a[2]} ${a[1]}`.trim(); if (ws.some(w => t.toLowerCase().includes(w))) return `<span class="hit">Boil: ${marked(t)} at ${typeof a[0] === "number" ? fmt(a[0]) + " min" : esc(a[0])}</span>`; }
    if (ws.some(w => (s.name || "").toLowerCase().includes(w))) return `<span class="hit">Step: ${marked(s.name)}</span>`;
  }
  return "";
}
function bookRowHTML(r) {
  const b = brew(), on = isLoaded(r.file) && b.state !== "finished", S = stepsOf(r), got = Array.isArray(r.steps), m = mashTemps(S), bm = boilMin(S);
  const act = on ? lampChip(b) : r.bad ? "" : loadBtn(r.file, "row");
  const ask = st.ask && st.ask.kind === "load" && st.ask.from === "row" && st.ask.file === r.file ? loadAskHTML(r.file) : "";
  const note = st.notes.row && st.notes.row.file === r.file ? `<p class="note" role="status">${esc(st.notes.row.text)}</p>` : "";
  const line = r.bad ? "Couldn't be read" : got ? bookLine(S) : "";
  return `<li class="bk" data-f="${esc(r.file)}"${st.open === r.file ? ' aria-current="true"' : ""}>
    <button type="button" class="bko" data-open="${esc(r.file)}" aria-label="${esc(r.name)}${line ? `: ${esc(line)}` : ""}${noFig(r) ? ". No BeerSmith mash figures" : ""}. Open it">
      <span class="bn">${marked(r.name)}</span><span class="bs">${r.bad ? "Couldn't be read" : marked(fromLine(r))}</span>${noFig(r) ? `<span class="nofig">${NOFIG}</span>` : ""}${hitLine(r)}<span class="sum">${esc(line)}</span>
      <span class="c n">${got ? S.length : ""}</span><span class="c m">${got ? (m.length ? `${m.map(fmt).join(", ")} ${U()}` : "–") : ""}</span><span class="c b">${got ? (bm ? `${fmt(bm)} min` : "–") : ""}</span><span class="c d">${esc(dateWords(r.modified))}</span>
    </button><div class="act">${act}</div>${ask}${note}</li>`;
}
function bookHTML() {
  if (!st.bookRead) return `<div class="nohit"><b>${st.bookFail ? "The Recipe Book couldn't be read" : "Reading the Recipe Book"}</b><p>${st.bookFail ? `CraftBeerPi: ${esc(st.bookFail)}.` : "CraftBeerPi is sending it."}</p></div>`;
  const list = sorted().filter(hit);
  if (!st.book.length) return `<div class="nohit"><b>No recipes yet</b><p>Import one from BeerSmith (as a BeerXML file) or from Brewfather, or write one with + NEW. Every recipe you import stays here.</p><p class="pnote-acts">${cmd("", "IMPORT", "from a file or Brewfather", {data: " data-import"})}</p></div>`;
  if (!list.length) return `<div class="nohit"><b>Nothing matches “${esc(st.q)}”</b><p>FIND looks in recipe names, where they came from, step names and boil additions.</p></div>`;
  return `<div class="book"><div class="bkh" aria-hidden="true"><span>Recipe · newest first</span><span>Steps</span><span>Mash</span><span>Boil</span><span>Changed</span><span></span></div>
    <ul class="bkl" aria-label="Recipes, newest first">${list.map(bookRowHTML).join("")}</ul></div>`;
}

/* ---------- plates: the recipe's name and notes, each step, + STEP, delete; on Brew Steps, an overview first ---------- */
function platesHTML() {
  const ed = E();
  if (st.page === "steps" && !st.loaded && !(ed && ed.doc.steps.length)) return `${saveNoteHTML()}<div class="plates" id="plates"><section class="plate pick" id="p-o" data-k="o"><div class="phd"><h2>Nothing is loaded</h2><p class="sum">Brew Day is brewing by hand.</p></div><p class="lead">Choose a recipe in the <b>Recipe Book</b> and LOAD it, and its steps appear here. Or build steps here with + STEP: they run on Brew Day like a recipe's.</p></section>${ed && ed.kinds ? kindsHTML() : ""}</div>`;
  const steps = ed.doc.steps, back = `<a href="#recipe" class="back" data-back="recipe">‹ Steps</a>`;
  let h = "";
  if (st.page === "steps") h += overviewHTML();
  else h += recipePlateHTML();
  h += steps.map((s, i) => stepPlateHTML(ed, s, i)).join("");
  if (ed.kinds) h += kindsHTML();
  if (st.page === "book") h += deletePlateHTML();
  const vessel = st.ask && st.ask.kind === "vessel" && (!narrow() || st.view === "plate") ? vesselHTML() : "";
  return `${back}${st.ask && st.ask.kind === "leave" && !narrow() ? leaveHTML() : ""}${vessel}${saveNoteHTML()}<div class="plates" id="plates">${h}</div>`;
}
const pickCls = k => E() && E().pick === k ? " pick" : "";
const landCls = k => st.land && st.land.k === k && Date.now() < st.land.until ? " land" : "";
function overviewHTML() {
  const L = st.loaded, b = brew();
  if (!L) return `<section class="plate${pickCls("o")}" id="p-o" data-k="o" aria-labelledby="h-o"><div class="phd"><h2 id="h-o">This brew's steps</h2><p class="sum">Built here, for Brew Day. Nothing is on Brew Day until you SAVE.</p></div>
    <p class="lead">SAVE puts these steps on Brew Day, where START is held for a second. To keep them for next time, <b>SAVE TO BOOK</b> once they are saved.</p></section>`;
  return `<section class="plate${pickCls("o")}" id="p-o" data-k="o" aria-labelledby="h-o"><div class="phd"><h2 id="h-o">This brew's steps</h2><p class="sum">Brew Day's copy of <b>${esc(L.name || "steps with no name")}</b>${L.at != null || loadedInBook() ? `, loaded${atWords(L.at)}${loadedInBook() ? " from the Recipe Book" : ""}` : ""}.</p></div>
    <p class="lead">Change a step here and SAVE: the change is for this brew. To keep it for next time, <b>SAVE TO BOOK</b>. The steps run on <b>Brew Day</b>, where START is held for a second.</p>
    ${b.state === "running" ? `<p class="lead">Step ${b.cur + 1}, ${esc(L.steps[b.cur].name)}, is running: ${liveBs(L.steps[b.cur]) ? "BrewStart takes its own settings while it runs, at SAVE, and the steps still to come can change too." : "CraftBeerPi doesn't change a step while it runs. The steps still to come can change."}</p>` : ""}</section>`;
}
function recipePlateHTML() {
  const ed = st.ed, d = ed.doc;
  const row = (k, n, h) => {
    const ch = norm(d[k]) !== norm(ed.orig[k]);
    return `<div class="row${ch ? " chg" : ""}" id="r-r-${k}" data-s="r" data-p="${k}"><div class="lb"><label class="nm" for="i-r-${k}" id="n-r-${k}">${n}</label>${h ? `<p class="wh">${h}</p>` : ""}<p class="ky">${k}</p></div>
      <div class="ct"><textarea class="fld" id="i-r-${k}" rows="1" data-s="r" data-p="${k}">${esc(d[k])}</textarea>${stHTML(ch, ed.orig[k], "r", k, null, n)}</div></div>`;
  };
  return `<section class="plate${pickCls("r")}${landCls("r")}" id="p-r" data-k="r" aria-labelledby="h-r"><div class="phd"><h2 id="h-r">Name and notes</h2><p class="sum">${d.steps.length} ${d.steps.length === 1 ? "step" : "steps"} · ${esc(bookLine(d.steps.filter(s => !s._removed)).split(" · ").slice(1).join(" · ") || "no mash or boil yet")}</p></div>
    <div class="part">${row("name", "Name", "As the Recipe Book, Brew Day and BrewScribe show it.")}${row("author", "Author", "Put on recipes you write or import: Settings, Recipe author.")}${row("desc", "Description", "A line or two of your own. Shown under the name in the book.")}</div></section>`;
}
// a changed row's status line: what it was, and UNDO, named for the setting (named) and what it goes back to
function stHTML(changed, was, k, label, wasShown, named) {
  if (!changed) return `<p class="st" id="st-${esc(k)}-${label}"></p>`;
  const w = esc(wasShown != null ? wasShown : norm(was) === "" ? "blank" : was);
  return `<p class="st" id="st-${esc(k)}-${label}"><span class="was">was ${w}</span><button type="button" class="lnk" data-undo="${esc(k)}" data-p="${label}" aria-label="Undo ${esc(named || label)}, back to ${w}">UNDO</button></p>`;
}
/* a kind's settings in its parts: the catalogue's, then any CraftBeerPi declares that the catalogue doesn't place; a kind
   the catalogue doesn't know shows CraftBeerPi's settings for it, under its own words */
function partsOf(s) {
  const kc = CAT.KINDS[s.type];
  if (!kc) { const rows = labelsOf(s.type); return [{rows: rows.length ? rows : ownKeys(s.props)}]; }
  const placed = new Set(kc.parts.flatMap(p => p.rows || []));
  ["First_Wort", "First_Wort_text"].forEach(l => placed.add(l));
  for (let i = 1; i <= 6; i++) { placed.add(`Hop_${i}`); placed.add(`Hop_${i}_text`); }
  const rest = ((D.types[s.type] || {}).properties || []).map(p => p && p.label).filter(l => l && !placed.has(l));
  return rest.length ? [...kc.parts, {h: "Other settings", rows: rest}] : kc.parts;
}
function stepPlateHTML(ed, s, i) {
  const kc = CAT.KINDS[s.type], ch = stepChange(ed, s), run = st.page === "steps" && isRunning(s), done = st.page === "steps" && s.status === "D";
  // a running BrewStart takes its settings itself (liveBs): only its name and kind stay locked
  const lv = run && liveBs(s), lock = run && !lv, fixed = l => lock || (lv && (l === "name" || l === "type"));
  const L = live(ed), li = L.indexOf(s), free = firstFree(ed), begun = st.page === "steps" && s.status && s.status !== "I";
  // CraftBeerPi keeps every step up to the last one that has begun in its place, a step still to come among them too
  const held = st.page === "steps" && li >= 0 && li < free && origOf(ed, s) && !s._moved;
  const moveWhy = lastOnly() ? "Needs CraftBeerPi 4.7.7.post58 or later." : st.page === "steps" && orders() == null ? WAIT
    : begun ? "It has begun, so it stays where it ran." : held ? `${nameIn(L[free - 1])} has begun, so the steps above it stay where they are.`
    : L.length - free < 2 ? (free ? "It is the only step still to come." : "It is the only step.") : "";
  const k = esc(s._k), sn = `step ${i + 1}, ${esc(nameIn(s))}`;
  // each named for its step, as a screen reader lists the buttons of every plate together
  const tools = ch.tag === "removed" ? `<button type="button" class="lnk" data-unremove="${k}" aria-label="Undo removing ${sn}">UNDO</button>`
    : run ? "" : ed.mv === s._k ? `<button type="button" class="lnk" data-mvcancel aria-label="Cancel move of ${sn}">Cancel move</button>`
    : `<button type="button" class="lnk" data-move="${k}" aria-label="Move ${sn}"${moveWhy ? ` aria-disabled="true" data-why="${esc(moveWhy)}"` : ""}>Move</button><button type="button" class="lnk" data-remove="${k}" aria-label="${ch.tag === "new" ? `Drop it: new ${sn}` : `Remove ${sn}`}">${ch.tag === "new" ? "Drop it" : "Remove step"}</button>`;
  const head = `<div class="phd"><h2 id="h-${k}"><span class="n">${i + 1}</span>${esc(s.name || kindName(s.type))}</h2><div class="stools">${tools}</div>
    <p class="sum"><b>${esc(kindName(s.type))}</b>${kc ? ` · ${esc(kc.h)}` : " · A kind of step from a plugin."}${ch.moved && origOf(ed, s) ? ` Moved: it was step ${ed.orig.steps.indexOf(origOf(ed, s)) + 1}.` : ""}</p></div>`;
  if (ch.tag === "removed") return `<section class="plate removed${pickCls(s._k)}" id="p-${k}" data-k="${k}" aria-labelledby="h-${k}">${head}<p class="lead">Removed. It goes when you SAVE; UNDO keeps it.</p></section>`;
  const lockNote = lv ? bsRunNote(ed, s)
    : run ? `<p class="pnote"><b>Running now.</b> CraftBeerPi doesn't change a step while it runs. To change it, STOP the brew on Brew Day first; or change the steps still to come.</p>`
    : done ? `<p class="pnote"><b>Done.</b> A change here counts only if the recipe is reset to step 1.</p>` : "";
  const moving = ed.mv === s._k ? `<p class="pnote mv">Moving it: tap <b>PUT IT HERE</b> in the steps where it goes, or FIRST or LAST above them.</p>` : "";
  const bl = blockedOf(ed), blocked = bl && bl.s === s ? `<p class="pnote">${esc(blockedWords(bl))}</p>` : "";
  const placed = ch.tag === "new" && s._where ? `<p class="pnote"><b>Went in as step ${li + 1}, ${esc(s._where)}.</b> MOVE puts it elsewhere.</p>` : "";
  const body = [{rows: ["name", "type"]}, ...partsOf(s)].map(p => {
    const rows = p.adds ? addsHTML(ed, s, lock) : (p.rows || []).filter(l => shows(s, l)).map(l => rowHTML(ed, s, l, fixed(l))).join("");
    const when = p.when ? `<p class="whenl" id="when-${k}">${whenHTML(ed, s)}</p>` : "";
    const fill = p.fill && s._fill && ch.tag === "new" ? `<p class="pnote fill">${esc(s._fill)}</p>` : "";
    return `<div class="part">${p.h ? `<h3>${esc(p.h)}</h3>` : ""}${p.when ? cbClockHTML() : ""}${fill}${rows}${when}${p.note ? `<p class="foot">${esc(p.note)}</p>` : ""}</div>`;
  }).join("");
  return `<section class="plate${lock ? " locked" : ""}${pickCls(s._k)}${landCls(s._k)}" id="p-${k}" data-k="${k}" aria-labelledby="h-${k}">${head}${dayBackHTML(s)}${lockNote}${blocked}${moving}${placed}${body}</section>`;
}
/* a running BrewStart's plate says what it is doing and that SAVE gives it the changes at once; its name and kind stay
   as they are while it runs */
function bsRunNote(ed, s) {
  const o = origOf(ed, s), kn = nameOf(D.kettles, ((o || s).props || {}).Heat_Kettle) || "HLT", doing = bsDoing(s);
  const now = doing === "heating" ? `<b>Heating the ${esc(kn)}'s water now.</b> SAVE gives BrewStart the changes at once: a new water temperature is the ${esc(kn)}'s target from then, and a new vessel asks first.`
    : doing === "holding" ? `<b>Holding the ${esc(kn)}'s water now.</b> SAVE gives BrewStart the changes at once: a new water temperature is the ${esc(kn)}'s target from then, and a new vessel asks first.`
    : "<b>Waiting for its time.</b> SAVE gives BrewStart the changes at once, and it plans again from them.";
  return `<p class="pnote">${now} Its name and kind stay as they are while it runs.</p>`;
}
/* BrewStart's plate opened from Brew Day's BrewStart box (ALL SETTINGS, st.fromDay): the way straight back, as BREW
   DAY's tab goes, so changes not saved are asked about first (leaveFor). After SAVE focus comes here */
function dayBackHTML(s) {
  const f = st.page === "steps" && s.type === "BrewStart" ? st.fromDay : null;
  if (!f || !(f === true || f === s._k || f === s.id)) return "";
  return `<div class="pnote day" id="dayback"><b>Opened from Brew Day.</b> Every BrewStart setting is here: change it, SAVE, then go back.<div class="acts">${cmd("", "BACK TO BREW DAY", "", {data: ' data-tabgo="Brew Day"'})}</div></div>`;
}
function rowHTML(ed, s, label, locked) {
  const o = origOf(ed, s), isName = label === "name", isType = label === "type", k = esc(s._k);
  const m = isName ? {n: "Name", h: "As Brew Day, the event line and BrewScribe show it."} : isType ? {n: "Kind of step", h: "What it does. Changing it keeps the settings the new kind also has."} : meta(s.type, label);
  const v = isName ? s.name : isType ? s.type : (s.props || {})[label];
  const ov = !o ? undefined : isName ? o.name : isType ? o.type : (o.props || {})[label];
  const changed = !!o && !same(v, ov);
  const key = isName ? "name" : isType ? `type · ${s.type}` : label;
  const was = !changed ? null : isType ? kindName(ov) : isName ? ov : shownValue(s, label, ov);
  // a time box says how to type a time, as it is typed now rather than picked
  const timed = !isName && !isType && typeOf(s.type, label) === "time";
  const help = timed ? [m.h, twelve() ? "Type it as 7, 7:30 or 730, and tap AM or PM." : "Type it as 7, 7:30 or 19:30."].filter(Boolean).join(" ") : m.h;
  return `<div class="row${changed ? " chg" : ""}" id="r-${k}-${label}" data-s="${k}" data-p="${label}"><div class="lb"><label class="nm" for="i-${k}-${label}" id="n-${k}-${label}">${esc(m.n)}</label>${help ? `<p class="wh" id="wh-${k}-${label}">${esc(help)}</p>` : ""}<p class="ky">${esc(key)}</p></div>
    <div class="ct">${ctlHTML(s, label, v, locked)}${stHTML(changed, ov, s._k, label, was, m.n)}<p class="why" id="need-${k}-${label}" role="status">${esc(needOf(s, label) || bsSaveSays(ed, s, label))}</p></div></div>`;
}
/* the kinds the page offers: the catalogue's that CraftBeerPi has, in its order, then any a plugin adds */
function kindsOffered() {
  const known = Object.keys(CAT.KINDS).filter(hasKind);
  return [...known, ...Object.keys(D.types).filter(t => !CAT.KINDS[t]).sort()];
}
function ctlHTML(s, label, v, locked) {
  const k = esc(s._k), id = `i-${k}-${label}`, dis = locked ? " disabled" : "", data = ` data-s="${k}" data-p="${label}"`;
  if (label === "name") return `<textarea class="fld" id="${id}" rows="1"${data}${dis}>${esc(v)}</textarea>`;
  if (label === "type") {
    const known = kindsOffered(), wait = t => t === "BrewStart" && t !== v && bsWhy() ? " disabled" : "";
    return `<select class="fld" id="${id}"${data}${dis}>${(known.includes(v) ? known : [v, ...known]).map(t => `<option value="${esc(t)}"${t === v ? " selected" : ""}${wait(t)}>${esc(kindName(t))}</option>`).join("")}</select>`;
  }
  const t = typeOf(s.type, label), m = meta(s.type, label);
  if (Array.isArray(t)) {
    // a blank setting shows the choice the step takes for it (blankAs): a BrewStart saved with no Timing runs as Start at.
    // A value saved that isn't among the choices any more (an older form's) shows as it is, chosen
    const opts0 = m.opts ? Object.keys(m.opts) : t, cur = norm(v) === "" && m.blankAs ? m.blankAs : norm(v);
    const opts = cur !== "" && !opts0.includes(cur) ? [...opts0, cur] : opts0;
    return `<div class="seg" role="radiogroup" aria-labelledby="n-${k}-${label}" id="${id}">${opts.map(x => `<button type="button" role="radio" aria-checked="${String(cur === x)}" data-set="${esc(x)}"${data}${locked ? ' aria-disabled="true" data-why="Running now: CraftBeerPi doesn\'t change a step while it runs."' : ""}>${esc((m.opts || {})[x] || x)}</button>`).join("")}</div>`;
  }
  if (t === "kettle" || t === "sensor" || t === "actor") {
    const list = t === "kettle" ? D.kettles : t === "sensor" ? D.sensors : D.actors;
    const found = norm(v) === "" || list.some(x => x.id === v);
    return `<select class="fld" id="${id}"${data}${dis}><option value=""${norm(v) === "" ? " selected" : ""}>${esc(m.blank || "None chosen")}</option>${found ? "" : `<option value="${esc(v)}" selected>Not found (${esc(v)})</option>`}${list.map(x => `<option value="${esc(x.id)}"${x.id === v ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`;
  }
  if (t === "number") { const u = unitOf(m, s); return `<span class="numf"><input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(norm(v))}"${data}${dis}${m.blank ? ` placeholder="${esc(m.blank)}"` : ""}>${u ? `<span>${esc(u)}</span>` : ""}</span>`; }
  if (t === "time") return timeCtl(s, label, v, locked);
  // a date an older form saved in its own words, which the browser's picker can't show, stays in view as text
  if (t === "date") return `<input class="fld" type="${norm(v) === "" || /^\d{4}-\d{2}-\d{2}$/.test(norm(v)) ? "date" : "text"}" id="${id}" value="${esc(norm(v))}"${data}${dis}>`;
  return `<textarea class="fld" id="${id}" rows="1"${data}${dis}>${esc(norm(v))}</textarea>`;
}
/* a time of day, typed in a box and read by util/timefmt.js's parseTypedTime: not the browser's time box, whose 12- or
   24-hour look follows the browser's language rather than CLOCK_FORMAT. With 12-hour times, AM and PM are two buttons
   beside it, as a phone's number keys have no letters, and the box shows "7:00". A box with no time yet shows AM:
   BrewStart's water is nearly always for the morning. What can't be read stays in the box as typed (_tt), and the step
   has no time until it can be read */
function timeCtl(s, label, v, locked) {
  const k = esc(s._k), id = `i-${k}-${label}`, t = hm(v), half = t ? halfOfDay(t) : s._half || "am", tw = twelve();
  const shown = (t && formatTimeOfDay(t, {format: clockFmt(), ampm: false})) || norm(s._tt ?? v);
  const box = `<input class="fld tmbox" id="${id}" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="${tw ? "7:00" : "07:00"}" value="${esc(shown)}" data-s="${k}" data-p="${label}" aria-describedby="wh-${k}-${label}"${locked ? " disabled" : ""}>`;
  // the same box in a .tmf either way, so a change of CLOCK_FORMAT while it has the focus keeps it, and what's typed
  if (!tw) return `<div class="tmf" role="group" aria-labelledby="n-${k}-${label}">${box}</div>`;
  const why = locked ? ' aria-disabled="true" data-why="Running now: CraftBeerPi doesn\'t change a step while it runs."' : "";
  const b = h => `<button type="button" role="radio" aria-checked="${String(half === h)}" data-half="${h}" data-s="${k}" data-p="${label}"${why}>${h.toUpperCase()}</button>`;
  return `<div class="tmf" role="group" aria-labelledby="n-${k}-${label}">${box}<div class="seg ampm" role="radiogroup" aria-label="AM or PM" id="${id}-half">${b("am")}${b("pm")}</div></div>`;
}
/* the boil's additions: one line each, minutes before the end and what to add; six at most, as the boil step has six
   reminders; and first wort */
function addsHTML(ed, s, locked) {
  const p = s.props, o = origOf(ed, s), used = [], k = esc(s._k);
  for (let i = 1; i <= 6; i++) if (num(p[`Hop_${i}`]) != null || norm(p[`Hop_${i}_text`]) !== "") used.push(i);
  const dis = locked ? " disabled" : "";
  const line = i => {
    const ch = !!o && (!same(p[`Hop_${i}`], (o.props || {})[`Hop_${i}`]) || !same(p[`Hop_${i}_text`], (o.props || {})[`Hop_${i}_text`]));
    return `<li id="r-${k}-Hop_${i}" class="${ch ? "chg" : ""}"><span class="numf"><input id="i-${k}-Hop_${i}" inputmode="decimal" autocomplete="off" value="${esc(norm(p[`Hop_${i}`]))}" data-s="${k}" data-p="Hop_${i}" aria-label="Addition ${i}, minutes left in the boil"${dis}><span>min</span></span><textarea class="fld" rows="1" id="i-${k}-Hop_${i}_text" data-s="${k}" data-p="Hop_${i}_text" aria-label="Addition ${i}, what to add"${dis}>${esc(norm(p[`Hop_${i}_text`]))}</textarea><button type="button" class="lnk" data-rmadd="${i}" data-s="${k}" aria-label="Remove addition ${i}"${locked ? ' aria-disabled="true" data-why="Running now: CraftBeerPi doesn\'t change a step while it runs."' : ""}>Remove</button></li>`;
  };
  const full = used.length >= 6;
  return `${used.length ? `<div class="addh" aria-hidden="true"><span>Minutes left</span><span>What to add</span><span></span></div><ul class="addl">${used.map(line).join("")}</ul>` : `<p class="foot">No additions yet.</p>`}
    <div class="addf">${cmd("", "+ ADDITION", full ? "six already" : `${6 - used.length} more possible`, {data: ` data-addadd="${k}"`, why: locked ? "Running now: CraftBeerPi doesn't change a step while it runs." : full ? "The boil step has six reminders. For a seventh, set a timer on Brew Day." : ""})}<span class="fx">Six at most: the boil step has six reminders.</span></div>
    ${rowHTML(ed, s, "First_Wort", locked)}${p.First_Wort === "Yes" ? rowHTML(ed, s, "First_Wort_text", locked) : ""}`;
}
function kindsHTML() {
  const ed = E(), all = kindsOffered();
  const groups = CAT.GROUPS.map(([g, name]) => {
    const ks = all.filter(k => ((CAT.KINDS[k] || {}).g || "any") === g);
    if (!ks.length) return "";
    return `<section aria-labelledby="kg-${g}"><h3 id="kg-${g}">${esc(name)}</h3><div class="kl">${ks.map(k => {
      const pl = ed ? naturalPlace(ed, k) : null, kc = CAT.KINDS[k], wait = k === "BrewStart" ? bsWhy() : "";
      return `<button type="button" class="kind" data-kind="${esc(k)}"${wait ? ` aria-disabled="true" data-why="${esc(wait)}"` : ""}><b><span class="sr">Add </span>${esc(kindName(k))}</b><span>${esc(kc ? kc.h : "A kind of step from a plugin.")}</span>${pl ? `<em>${wait ? esc(wait) : `Goes in as step ${pl.at + 1}, ${esc(pl.where)}`}</em>` : ""}<small>${esc(k)}</small></button>`;
    }).join("")}</div></section>`;
  }).join("");
  return `<section class="plate pick${ed && ed.landKinds ? " land" : ""}" id="p-kinds" data-k="kinds" aria-labelledby="h-kinds"><div class="phd"><h2 id="h-kinds">Add a step</h2><p class="sum">Choose what kind. It goes in where that kind belongs in a brew and opens for its settings; MOVE puts it elsewhere. Nothing is saved until SAVE.</p></div>
    <div class="kinds">${groups}</div><p class="addf">${cmd("", "CANCEL", "add nothing", {data: " data-kinds-close"})}</p></section>`;
}
function deletePlateHTML() {
  const r = book(st.ed.file);
  if (!r) return "";
  const asking = st.ask && st.ask.kind === "delete", pend = st.pend.del;
  const on = isLoaded(r.file) ? " Brew Day keeps its own copy until another recipe is loaded." : "";
  return `<section class="plate${pickCls("del")}" id="p-del" data-k="del" aria-labelledby="h-del"><div class="phd"><h2 id="h-del">Delete this recipe</h2><p class="sum">Takes it out of the Recipe Book. It asks first.</p></div>
    ${asking ? `<div class="confirm" role="group" aria-labelledby="del-t" id="ask"><p id="del-t">Delete <b>${esc(r.name)}</b> from the Recipe Book? This can't be undone.${on}</p><div class="acts"><button type="button" class="yes" data-yes="delete"${pend ? ' aria-disabled="true" data-why="Waiting for CraftBeerPi to answer."' : ""}>${pend ? "Deleting…" : "Delete it"}</button><button type="button" data-no>Keep it</button></div><p class="note" id="del-note" role="status">${esc(st.notes.del || "")}</p></div>`
      : `<p class="addf">${cmd("del", "DELETE", "asks first", {data: " data-del", live: true})}</p>`}</section>`;
}

/* ---------- copy and new: a name first ---------- */
function nameHTML() {
  const copy = st.pane === "copy", r = copy && book(st.open), v = copy && r ? `${r.name} copy` : "", pend = st.pend.make;
  return `<a href="#list" class="back" data-back="list">‹ All recipes</a><div class="plates"><section class="plate pick" aria-labelledby="h-nm"><div class="phd"><h2 id="h-nm">${copy && r ? `Copy ${esc(r.name)}` : "A new recipe"}</h2><p class="sum">${copy ? "Every step comes with it. The copy opens so you can change it." : "It opens with no steps; + STEP adds the first."}</p></div>
    <div class="row"><div class="lb"><label class="nm" for="nm-in">Name</label><p class="wh">As the Recipe Book and Brew Day show it.</p></div><div class="ct"><input class="fld" id="nm-in" value="${esc(st.nmValue != null ? st.nmValue : v)}" autocomplete="off"${copy ? "" : ' placeholder="Its name"'}><p class="note" id="nm-note" role="status">${esc(st.notes.nm || "")}</p></div></div>
    <p class="addf">${cmd("go", pend ? "MAKING…" : copy ? "MAKE THE COPY" : "MAKE IT", pend ? "waiting for CraftBeerPi" : copy ? "and open it" : "and add its steps", {busy: pend, why: pend ? WAIT : "", data: " data-make", live: true})}${cmd("", "CANCEL", "", {data: " data-list"})}</p></section></div>`;
}
/* ---------- importing ---------- */
const bfSet = () => norm(C("brewfather_user_id")) !== "" && norm(C("brewfather_api_key")) !== "";
function importHTML() {
  const I = st.imp;
  const lists = I.lists ? FILES.filter(f => (I.lists[f.kind] || []).length && (!I.sent || I.sent.kind === f.kind)) : [];
  const fileH = lists.map(f => {
    const L = I.lists[f.kind], sent = I.sent && I.sent.kind === f.kind;
    const rows = L.map(x => {
      const busy = I.busy && I.busy.kind === f.kind && I.busy.id === x.value, got = I.result && I.result.ok && I.result.kind === f.kind && I.result.id === x.value;
      const asks = f.kind === "xml" && updates(), there = asks && sameNamed(x.label).length, asking = I.ask && I.ask.kind === f.kind && I.ask.id === x.value;
      const is = got ? (I.result.updated ? "Updated" : "Imported") : there ? "In the book: IMPORT asks whether to update it or add a new recipe" : !asks && inBook(x.label) ? "Its earlier import is in the book; importing replaces it" : "Not in the book yet";
      return `<li class="imr${got ? " got" : ""}"><span class="in">${esc(x.label)}</span><span class="is">${is}</span>${cmd("", busy ? "IMPORTING…" : got ? "IMPORT AGAIN" : "IMPORT", busy ? "waiting for CraftBeerPi" : there ? "asks first" : "into the book", {busy, why: busy || I.busy ? WAIT : "", data: ` data-imp="${esc(x.value)}" data-ik="${f.kind}"`, live: true, label: `Import ${x.label} into the Recipe Book`})}${asking ? importAskHTML(I.ask) : ""}</li>`;
    }).join("");
    return `<p class="fileh"><b>${esc(sent ? I.sent.name : f.file)}</b><span>${sent ? "just sent" : "the last file sent, kept by CraftBeerPi"} · ${esc(f.label)} · ${L.length} ${L.length === 1 ? "recipe" : "recipes"}</span></p><ul class="iml">${rows}</ul>`;
  }).join("");
  const res = I.result && I.result.from !== "bf" ? resultHTML(I.result) : "";
  const bf = bfSet() ? bfHTML() : `<p class="pnote">Brewfather isn't set up here. To list your Brewfather recipes, add your <b>Brewfather user ID</b> and <b>API key</b> in Settings, under Recipes.<span class="acts">${cmd("", "SETTINGS", "Recipes", {data: ' data-tabgo="Settings"'})}</span></p>`;
  const kettle = id => esc(nameOf(D.kettles, id) || "None chosen"), t = v => num(v) != null ? `${fmt(num(v))} ${U()}` : "Not set";
  const inOut = [C("AddMashInStep") === "Yes" && "Mash in", C("AddMashOutStep") === "Yes" && (C("AddMashInStep") === "Yes" ? "mash out" : "Mash out")].filter(Boolean).join(" and ") || "Neither";
  const sparge = norm(C("steps_sparge"));
  const uses = `<dl class="uses">
      <dt>Mash tun<small>Mash in and the rests heat it.</small></dt><dd>${kettle(C("MASH_TUN"))}<small>MASH_TUN</small></dd>
      <dt>Boil kettle<small>The boil, whirlpool and cooling happen in it.</small></dt><dd>${kettle(C("BoilKettle"))}<small>BoilKettle</small></dd>
      <dt>Boil temperature<small>The recipe file doesn't give one.</small></dt><dd>${t(C("steps_boil_temp"))}<small>steps_boil_temp</small></dd>
      <dt>Whirlpool temperature<small>A BeerXML file never gives one. Set it before importing a recipe that wants another.</small></dt><dd>${t(C("steps_whirlpool_temp"))}<small>steps_whirlpool_temp</small></dd>
      <dt>The sparge<small>Heats the sparge water and leaves the pumps to you.</small></dt><dd>${sparge ? (sparge === "SpargeStep" ? "A sparge step" : esc(kindName(sparge))) : "Not set"}<small>steps_sparge</small></dd>
      <dt>Mash in and mash out<small>Added when the recipe has none.</small></dt><dd>${inOut}<small>AddMashInStep, AddMashOutStep</small></dd></dl>
      <p class="addf">${cmd("", "SETTINGS", "change them", {data: ' data-tabgo="Settings"'})}</p>`;
  const over = st.dragOver ? " over" : "", up = st.pend.upload;
  return `<a href="#list" class="back" data-back="list">‹ All recipes</a><div class="plates">
    <section class="plate pick" id="p-file" aria-labelledby="h-file"><div class="phd"><h2 id="h-file">From a file</h2><p class="sum">A BeerXML file from BeerSmith or most brewing programs, an MMuM file, or a Kleiner Brauhelfer database.</p></div>
      ${res}
      <div class="drop${over}" id="drop"><p class="big">Drop a recipe file here</p><p class="or">or</p>${cmd("go", up ? "SENDING…" : "CHOOSE FILE", up ? "waiting for CraftBeerPi" : ".xml, .json or .sqlite", {busy: up, why: up ? WAIT : "", data: " data-choose", live: true})}<p class="note" id="file-note" role="status">${esc(st.notes.file || "")}</p></div>
      <p class="how"><b>From BeerSmith:</b> select the recipe in My Recipes, then File, Export Selected Items, BeerXML. One recipe a file is simplest.</p>
      ${fileH}
      <p class="how">IMPORT puts the recipe in your Recipe Book; Brew Day isn't changed until you LOAD it. ${updates() ? "A BeerXML recipe whose name is in the book already asks first: UPDATE that recipe, which adds BeerSmith's mash figures and keeps your steps, or ADD AS A NEW RECIPE. Other files replace an earlier import of the same name, never a recipe you've changed or saved here." : "Importing a recipe again under the same name replaces the earlier import, never a recipe you've changed or saved here."}</p></section>
    <section class="plate pick" id="p-bf" aria-labelledby="h-bf"><div class="phd"><h2 id="h-bf">From Brewfather</h2><p class="sum">Your recipes in Brewfather's web app.</p></div>${I.result && I.result.from === "bf" ? resultHTML(I.result) : ""}${bf}</section>
    <section class="plate pick" id="p-uses" aria-labelledby="h-uses"><div class="phd"><h2 id="h-uses">Imports use these settings</h2><p class="sum">What a recipe file can't say, CraftBeerPi takes from Settings as it imports.</p></div>${uses}</section></div>`;
}
const inBook = name => st.book.some(r => r.name === name && r.imported_from);
/* a recipe's name as CraftBeerPi compares names (beerxml.name_key): its letters without their marks, in any case, with
   single spaces. "Kölsch" is " kolsch " */
const nameKey = s => String(s == null ? "" : s).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
/* the book's recipes of a name, newest first: what an import of that name could UPDATE */
const sameNamed = name => sorted().filter(r => !r.bad && nameKey(r.name) === nameKey(name));
/* before a BeerXML recipe of a name the book has is imported: UPDATE that recipe (each, where several share the name),
   or ADD AS A NEW RECIPE, each saying what it does, and neither the default: the question, not an answer, has the focus.
   CANCEL, or Escape, imports nothing */
function importAskHTML(a) {
  const R = sameNamed(a.label), many = R.length > 1;
  const ways = R.map(r => {
    const what = r.imported_from ? "Takes this file's steps, mash figures and file in place of its earlier import: you haven't changed it here."
      : "Adds BeerSmith's mash figures and this file to it, and keeps every step as you left it.";
    const day = many ? ` · ${r.imported_from ? "imported" : "changed"} ${dateWords(r.modified)}` : "";
    const on = isLoaded(r.file) ? " It's on Brew Day: its copy there gets the mash figures at once, with its steps as they are." : "";
    return `<button type="button" data-imq="update" data-file="${esc(r.file)}">Update “${esc(r.name)}”${esc(day)}<small>${what}${on}</small></button>`;
  }).join("");
  return `<div class="confirm" role="group" aria-labelledby="imq-t" id="imq"><p id="imq-t" tabindex="-1"><b>${esc(a.label)}</b> is in your Recipe Book already${many ? `, ${R.length} times` : ""}. Nothing changes until you choose.</p>
    <div class="acts ways">${ways}<button type="button" data-imq="new">Add as a new recipe<small>${many ? "They stay" : "It stays"} as ${many ? "they are" : "it is"}, and this file's recipe goes in beside ${many ? "them" : "it"}.</small></button></div>
    <div class="acts three"><button type="button" data-no>Cancel</button></div></div>`;
}
const focusImq = () => requestAnimationFrame(() => { const a = $("#imq"); if (a) a.scrollIntoView({block: "nearest"}); const t = $("#imq-t"); if (t) t.focus({preventScroll: true}); });
function resultHTML(R) {
  if (!R.ok) return `<div class="fail" role="alert"><b>${R.update ? "Not updated" : "Not imported"}</b><p>${esc(R.why)}</p><div class="acts">${cmd("", "SETTINGS", "Brewhouse", {data: ' data-tabgo="Settings"'})}</div></div>`;
  const r = book(R.file);
  if (!r) return `<div class="impok" role="status">${ICON.tick}<p><b>${R.updated ? "Updated" : "Imported"} ${esc(R.name)}.</b> It's in your Recipe Book.</p></div>`;
  const said = R.updated ? `${R.steps === "file" ? "Its steps, mash figures and file are this file's: you hadn't changed it here." : "It has BeerSmith's mash figures and this file now, and its steps are as you left them."}${R.loaded ? " Brew Day's copy has the mash figures too, and its steps are as they were." : ""}`
    : R.replaced ? "Its earlier import in the Recipe Book was replaced." : "It's in your Recipe Book, at the top.";
  return `<div class="impok" role="status">${ICON.tick}<p><b>${R.updated ? "Updated" : "Imported"} ${esc(r.name)}.</b> ${said} ${narrow() ? "Open it to check its steps before you brew it." : "Check its steps on the left before you brew it."}</p><ul class="bkl">${bookRowHTML(r)}</ul></div>
    ${(R.warnings || []).map(w => `<div class="warn" role="note"><b>${esc(w.title)}</b><p>${esc(w.text)}</p></div>`).join("")}`;
}
function bfHTML() {
  const I = st.imp, q = I.bq.toLowerCase(), all = [...D.bf].filter(x => x && x.label != null).sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, {sensitivity: "base"}));
  const list = all.filter(x => String(x.label).toLowerCase().includes(q));
  return `<div class="bff"><div class="find"><label for="bq">Find</label><input id="bq" type="search" autocomplete="off" value="${esc(I.bq)}" style="padding-left:70px"></div>${cmd("", I.bfBusy ? "ASKING…" : "REFRESH LIST", I.bfBusy ? "waiting for Brewfather" : "asks Brewfather again", {busy: I.bfBusy, why: I.bfBusy ? WAIT : "", data: " data-bfre", live: true})}</div>
    <p class="fileh"><b>${all.length} ${all.length === 1 ? "recipe" : "recipes"}</b><span>from Brewfather, A to Z${q ? ` · ${list.length} match` : ""}</span></p>
    <ul class="iml">${list.map(x => {
      const busy = I.busy && I.busy.kind === "bf" && I.busy.id === String(x.value);
      return `<li class="imr"><span class="in">${esc(x.label)}</span><span class="is">${inBook(x.label) || st.book.some(r => r.name === x.label) ? "In the book" : "Not in the book yet"}</span>${cmd("", busy ? "IMPORTING…" : "IMPORT", busy ? "waiting for CraftBeerPi" : "into the book", {busy, why: busy || I.busy ? WAIT : "", data: ` data-bfimp="${esc(x.value)}"`, live: true, label: `Import ${x.label} from Brewfather`})}</li>`;
    }).join("")}</ul>`;
}

/* ---------- patching a region in place ---------- */
// Same result as setting innerHTML, but an element that is still there keeps its identity: its focus, and what is being
// typed into it, as CraftBeerPi's news redraws the page many times a minute
function morph(el, html) {
  if (!el) return;
  const t = document.createElement("template");
  t.innerHTML = html;
  patchChildren(el, t.content);
}
const KEYS = ["id", "data-go", "data-k", "data-f", "data-open", "data-load", "data-put", "data-kind", "data-imp", "data-set"];
const alike = (o, n) => o.nodeType === n.nodeType && o.nodeName === n.nodeName && (o.nodeType !== 1 || KEYS.every(a => o.getAttribute(a) === n.getAttribute(a)));
function patchChildren(from, to) {
  const olds = Array.from(from.childNodes), news = Array.from(to.childNodes);
  news.forEach((n, i) => {
    const o = olds[i];
    if (!o) from.appendChild(n);
    else if (alike(o, n)) patchNode(o, n);
    else from.replaceChild(n, o);
  });
  for (let i = news.length; i < olds.length; i++) olds[i].remove();
}
function patchNode(o, n) {
  if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
  const focused = sr && sr.activeElement === o;
  let want = null;
  if (o.tagName === "SELECT") { const opt = n.querySelector("option[selected]"); want = opt ? opt.getAttribute("value") || "" : ""; }
  for (const {name} of Array.from(o.attributes)) if (!n.hasAttribute(name) && name !== "style") o.removeAttribute(name);
  for (const {name, value} of Array.from(n.attributes)) if (o.getAttribute(name) !== value) o.setAttribute(name, value);
  if (o.tagName === "INPUT" && !focused) { const v = n.getAttribute("value") ?? ""; if (o.value !== v) o.value = v; }
  if (o.tagName === "TEXTAREA") { const v = n.textContent; if (!focused && o.value !== v) o.value = v; return; }
  patchChildren(o, n);
  if (want !== null && !focused && o.value !== want) o.value = want;
}

/* ---------- drawing it all ---------- */
function render() {
  if (!st || !sr) return;
  refreshLoaded();
  if (st.page === "steps") ensureBs();
  morph($("#tool"), toolHTML());
  morph($("#col"), colHTML());
  morph($("#work"), workHTML());
  $("#pane").setAttribute("aria-label", st.page === "steps" ? "This brew's steps" : st.pane === "edit" ? "The recipe's settings" : st.pane === "import" ? "Import a recipe" : "Recipe Book");
  const ed = E(), n = ed ? changes(ed) : 0, bar = $("#savebar"), editing = st.page === "steps" ? !!(st.loaded || (ed && ed.doc.steps.length)) : st.pane === "edit";
  bar.hidden = !(editing && (n || st.pend.save));
  morph(bar, bar.hidden ? "" : `<p>${st.pend.save ? "Saving…" : st.notes.save ? esc(st.notes.save) : `${n} ${n === 1 ? "change" : "changes"} not saved`}</p>${saveBtns(n, st.page === "steps" ? "for this brew" : "in the book")}`);
  const app = host && host.closest(".app");
  if (app) app.toggleAttribute("data-dirty", !bar.hidden);
  const m = $("#main");
  m.dataset.link = st.link;
  /* with the save bar up, a phone keeps the time in words clear of it too (recipes.css .main[data-dirty] .whenl) */
  m.toggleAttribute("data-dirty", !bar.hidden);
  applyView();
  grow();
  fitPinned();
}
// the tool row's height where it sticks to the top of the window (701 to 1179 px), else 0
const stickTop = () => { const t = $("#tool"); return t && getComputedStyle(t).position === "sticky" ? t.offsetHeight : 0; };
/* what is pinned over the settings, for what is kept in view under it (recipes.css scroll margins): the tool row where
   it sticks (--tool-h, which When's clock band sticks under too), and a BrewStart's clock band (--band-h, on its part) */
function fitPinned() {
  if (host) host.style.setProperty("--tool-h", stickTop() + "px");
  $$(".cbbar").forEach(b => { if (b.parentElement) b.parentElement.style.setProperty("--band-h", b.offsetHeight + "px"); });
}
function applyView() { const m = $("#main"); if (m) m.dataset.view = narrow() ? st.view : "split"; }
function grow() { $$("textarea.fld").forEach(t => { if (!t.getClientRects().length) return; t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }); }
/* CraftBeerPi's word on things arrives many times a second: drawn once a frame */
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (st && st.wantBsAdd) tryBsAdd(); render(); }); }

/* ---------- moving about ---------- */
function setCur(k) {
  const ed = E();
  if (!ed || ed.cur === k) return;
  ed.cur = k;
  $$(".col .step").forEach(b => b.dataset.go === k ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
  const c = $(`#c-${CSS.escape(k)}`), sc = $("#steps");
  if (c && sc && wide()) { const top = c.offsetTop - sc.offsetTop; if (top < sc.scrollTop || top + c.offsetHeight > sc.scrollTop + sc.clientHeight) sc.scrollTop = top - 8; }
}
// the plate nearest the top of the pane is the one the column marks as where you are
function spy() {
  const ed = E();
  if (!ed || narrow() || !sr) return;
  const pane = $("#pane"), top = wide() ? pane.getBoundingClientRect().top : 80, plates = $$("#plates > .plate");
  let cur = plates.length ? plates[0].dataset.k : null;
  for (const p of plates) if (p.getBoundingClientRect().top - top < 140) cur = p.dataset.k;
  if (cur) setCur(cur);
}
function land(k) {
  st.land = {k, until: Date.now() + 1300};
  const el = $(`#p-${CSS.escape(k)}`);
  if (el) { el.classList.remove("land"); void el.offsetWidth; el.classList.add("land"); }
  later(() => { if (st.land && st.land.k === k) { st.land = null; const p = $(`#p-${CSS.escape(k)}`); if (p) p.classList.remove("land"); } }, 1300);
}
/* a new BrewStart opens at its When settings with its time box ready: the time is the one thing only the brewer knows.
   Where the tool row sticks (701 to 1179 px), When opens below it. The column (or, one thing at a time, the way back)
   still says where it went */
function showWhen(k) {
  jump(k);
  const t = $(`#r-${CSS.escape(k)}-Timing`), part = t && t.closest(".part"), f = $(`#i-${CSS.escape(k)}-StartTime`);
  if (!part) return;
  const put = () => {
    if (wide()) { const pane = $("#pane"); pane.scrollTop += part.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8; }
    else window.scrollTo(0, part.getBoundingClientRect().top + window.scrollY - (stickTop() ? stickTop() + 16 : 8));
  };
  put();
  if (f) { f.focus({preventScroll: true}); put(); }
  keepWhenInView(k);
}
// the top of the part of the screen BrewStart's settings scroll in: the pane's from 1180 px; else under the tool row
// where it sticks, or the window's
const coverTop = () => wide() ? $("#pane").getBoundingClientRect().top : stickTop() ? $("#tool").getBoundingClientRect().bottom : 0;
/* while BrewStart's time is set, its time box (with AM and PM) stays in view, and so does what is said under it: the
   time in words, which shows a slip of twelve hours, or with no time yet what it needs. Where both don't fit, the box
   wins: it has the focus, and it's where the brewer types. The page scrolls as little as it can, clear of the sticky tool
   row and the pinned clock band above, and of a phone's save bar and tabs below (their scroll margins, recipes.css), and
   doesn't leave When's heading cut in two. Called as When opens, with or without a time, and after a key or a tap; never
   as a box is left: a scroll between a finger going down and coming up can put the tap on another control. A phone's
   on-screen keyboard covers the page without making it shorter, so while it is up the page scrolls on by what it
   covers, no further than keeps the box clear of the top (util/keyboard.js, as Brew Day's BrewStart box does), and again
   as it comes up while the time box has focus */
function keepWhenInView(k) {
  const box = $(`#i-${CSS.escape(k)}-StartTime`);
  if (!box) return;
  const ctl = box.closest(".tmf") || box, sc = wide() ? $("#pane") : document.scrollingElement, was = sc ? sc.scrollTop : 0;
  const said = [$(`#when-${CSS.escape(k)}`), $(`#need-${CSS.escape(k)}-StartTime`)].find(e => e && e.textContent.trim());
  if (said) said.scrollIntoView({block: "nearest"});
  ctl.scrollIntoView({block: "nearest"});
  if (!wide()) clearKeyboard(said || ctl, {keep: ctl, gap: 12, top: parseFloat(getComputedStyle(ctl).scrollMarginTop) || 12});
  if (!sc || sc.scrollTop === was) return;
  // When's heading goes out of view whole rather than cut in two; the box is well below it, so stays in view
  const part = ctl.closest(".part"), h = part && part.querySelector(":scope > h3"), top = coverTop(), r = h && h.getBoundingClientRect();
  if (r && r.top < top - 1 && r.bottom > top + 1) sc.scrollTop += r.bottom - top;
}
const onKeyboard = () => { const f = sr && sr.activeElement; if (st && f && f.classList && f.classList.contains("tmbox") && f.dataset.s) keepWhenInView(f.dataset.s); };
function jump(k) {
  const ed = E();
  if (!ed) return;
  if (narrow()) {
    const was = st.view === "plate";
    ed.pick = k; ed.cur = k; st.view = "plate";
    goView(was);
    render(); window.scrollTo(0, 0); return;
  }
  setCur(k);
  const p = $(`#p-${CSS.escape(k)}`);
  if (!p) return;
  if (wide()) { const pane = $("#pane"); pane.scrollTop = p.offsetTop - pane.offsetTop - 8; }
  else window.scrollTo({top: p.getBoundingClientRect().top + window.scrollY - ($("#tool").offsetHeight + 16)});
  land(k);
  ed.cur = k;
  $$(".col .step").forEach(b => b.dataset.go === k ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
}
// a note where a control was pressed, for six seconds: it goes by itself, and only the note, so nothing being typed
// elsewhere loses its place
function sayAt(where, file, text) {
  if (where === "row") st.notes.row = {file, text}; else st.notes[where] = text;
  render();
  const mine = where === "row" ? st.notes.row : text;
  later(() => {
    if (where === "row" ? st.notes.row !== mine : st.notes[where] !== mine) return;
    delete st.notes[where];
    const sel = {row: ".bk .note", col: "#col-note", tb: "#tb-note", nm: "#nm-note", save: "#save-note", file: "#file-note", del: "#del-note"}[where];
    if (sel) $$(sel).forEach(n => { n.textContent = ""; });
    if (where === "save") { const bar = $("#savebar p"); if (bar && !bar.closest("[hidden]")) render(); }
  }, NOTE_MS);
}
/* ---------- the address: the page's view, and each view one at a time a history entry ---------- */
const keyOf = (path, state) => JSON.stringify([path, state || null]);
/* the address and history entry the page's view is at now */
function where() {
  const ed = E(), pick = narrow() && st.view === "plate" && ed ? ed.pick : null;
  if (st.page === "steps") {
    if (pick === "kinds") return ["/step", null];
    if (pick && pick !== "o" && D.steps.some(s => s.id === pick)) return [`/step/${enc(pick)}`, null];
    return [st.base || "/mashprofile", pick ? {pick} : null];
  }
  if (st.pane === "import") return ["/upload", null];
  if (st.pane === "edit" && (st.ed || st.wantEdit)) return [`/recipe/${enc((st.ed || st.wantEdit).file)}`, pick ? {pick} : null];
  if (st.pane === "copy" || st.pane === "new") return [st.open ? `/recipes/${enc(st.open)}` : "/recipes", {pane: st.pane}];
  if (st.open && (!narrow() || st.view !== "list")) return [`/recipes/${enc(st.open)}`, null];
  return ["/recipes", null];
}
/* the address follows the view: one at a time, a move forward is a history entry, so Back goes back one; side by side,
   the address changes in place */
function goView(replace) {
  const [path, state] = where(), k = keyOf(path, state);
  if (k === st.nav || !env.navigate) return;
  const push = narrow() && !replace;
  st.nav = k;
  if (push) st.pushed++;
  env.navigate(path, {replace: !push, state});
}
/* back one view: through the history the page made, else to where that view is, in place */
function goBack() {
  if (narrow() && st.pushed > 0) { st.pushed--; st.backing = true; window.history.back(); return; }
  goView(true);
}
/* the router's address, on opening, Back and Forward, or a link: the view it names */
function route(r) {
  const k = keyOf(r.path, r.state);
  if (st.backing) { st.backing = false; st.nav = k; return; }
  if (k === st.nav) return;
  /* leaving the recipe being changed, with changes not saved: the page stays, and asks */
  if (st.page === "book" && st.ed && dirty() && !(r.kind === "edit" && r.file === st.ed.file)) {
    st.ask = {kind: "leave", to: r.kind === "open" && book(r.file) ? book(r.file).name : r.kind === "upload" ? "Import a recipe" : "the Recipe Book"};
    st.leaveTo = {route: r};
    const [path, state] = where();
    st.nav = keyOf(path, state);
    if (env.navigate) env.navigate(path, {state});
    render();
    return focusAsk();
  }
  st.nav = k;
  apply(r);
}
function apply(r) {
  const s = r.state || {};
  if (st.ask && st.ask.kind === "leave") st.ask = null;
  if (st.page === "steps") {
    if (r.path === "/brewsteps" || r.path === "/mashprofile") st.base = r.path;
    ensureBs();
    const ed = st.bs;
    ed.mv = null;
    /* from Brew Day's BrewStart box (ALL SETTINGS): BrewStart's plate offers the way back, and for a new BrewStart
       + BrewStart is pressed here (tryBsAdd) */
    if (s.from === "brewday") { st.fromDay = r.kind === "step" ? r.id : true; st.wantBsAdd = !!s.bsadd; }
    if (r.kind === "add") { ed.kinds = true; ed.from = ed.from || ed.cur; ed.pick = "kinds"; st.view = "plate"; }
    else if (r.kind === "step" || s.pick) { st.wantPick = r.id || s.pick; st.view = "plate"; }
    else { ed.pick = null; st.view = "recipe"; }
    render();
    if (st.wantPick) tryPick();
    else if (st.wantBsAdd) tryBsAdd();
    else if (r.kind === "add" && !narrow()) requestAnimationFrame(() => { const p = $("#p-kinds"); if (p && wide()) $("#pane").scrollTop = p.offsetTop - $("#pane").offsetTop - 8; else if (p) p.scrollIntoView(); });
    return;
  }
  if (r.kind === "upload") { st.ed = null; st.pane = "import"; st.view = "plate"; openImport(); }
  else if (r.kind === "edit") {
    if (!st.ed || st.ed.file !== r.file) startEdit(r.file);
    if (st.ed) { st.ed.pick = s.pick || null; if (s.pick === "kinds") { st.ed.kinds = true; st.ed.from = st.ed.from || st.ed.cur; } }
    st.view = s.pick ? "plate" : "recipe";
  } else if (r.kind === "open") { st.ed = null; st.wantEdit = null; st.pane = s.pane === "copy" || s.pane === "new" ? s.pane : "list"; st.open = r.file; st.autoOpen = false; st.view = st.pane === "list" ? "recipe" : "plate"; }
  else { st.ed = null; st.wantEdit = null; st.pane = "list"; st.view = "list"; }
  render();
  if (st.ed && st.ed.pick && !narrow()) { const k = st.ed.pick; requestAnimationFrame(() => jump(k)); }
}
/* a step's settings named by the address, once the brew steps have it; from Brew Day's BrewStart box, with focus on its
   first setting */
function tryPick() {
  const ed = st.bs, k = st.wantPick;
  if (!ed || !k || !ed.doc.steps.some(s => s._k === k)) return;
  st.wantPick = null;
  ed.pick = k; ed.cur = k;
  render();
  const day = st.fromDay === k;
  requestAnimationFrame(() => { if (!narrow()) jump(k); if (day) focusFirst(k); });
}
/* BrewStart's plate opened from Brew Day: focus on its first setting (When's Timing), in view */
function focusFirst(k) {
  const p = $(`#p-${CSS.escape(k)}`);
  if (!p) return;
  const row = $$(".row", p).find(r => !["name", "type"].includes(r.dataset.p));
  const c = row && (row.querySelector('[role=radio][aria-checked="true"]') || row.querySelector("input, select, textarea, button"));
  if (c) { c.focus({preventScroll: true}); c.scrollIntoView({block: "nearest"}); }
}
/* + BrewStart, over step 1 of a recipe without one: added first, filled in, its When settings open with its time box
   ready (showWhen). Its key */
function addBrewStart() {
  if (st.page === "steps") ensureBs();
  const ed = E(), s = newStep("BrewStart");
  insertAt(ed, s, firstFree(ed)); s._where = "before everything else";
  ed.kinds = false; ed.cur = s._k;
  if (narrow()) st.view = "recipe";
  render();
  if (!narrow()) goView(true);
  requestAnimationFrame(() => showWhen(s._k));
  return s._k;
}
/* Brew Day's + BrewStart box's ALL SETTINGS (st.wantBsAdd): + BrewStart pressed here once it can be (bsWhy: CraftBeerPi's
   clock, and where its HLT and element come from), where Brew Steps offers it; a BrewStart already there is shown */
function tryBsAdd() {
  if (!st.wantBsAdd || st.page !== "steps" || !D.loaded || bsWhy()) return;
  st.wantBsAdd = false;
  ensureBs();
  const b = brew(), had = st.bs.doc.steps.find(s => s.type === "BrewStart" && !s._removed);
  if (had) { st.fromDay = had._k; st.wantPick = had._k; return tryPick(); }
  if (!(b.state === "none" || (b.state === "ready" && !b.begun)) || lastOnly()) return;
  st.fromDay = addBrewStart();
}
const focusAsk = () => requestAnimationFrame(() => { const a = $("#ask"); if (a) a.scrollIntoView({block: "nearest"}); const b = a && a.querySelector("button"); if (b) b.focus({preventScroll: true}); });
/* the column's choice when no recipe is named: the recipe on Brew Day, else the newest */
function defaultOpen() {
  const L = st.loaded && st.loaded.file && book(st.loaded.file) ? st.loaded.file : null, first = sorted()[0];
  /* until the brewer opens one, the column follows the recipe on Brew Day, which may come after the book */
  if (st.open && book(st.open) && !(st.autoOpen && L && st.pane === "list")) return;
  st.open = L || (first ? first.file : null);
  st.autoOpen = true;
}

/* ---------- CraftBeerPi's word ---------- */
/* the Recipe Book: the list, shown as soon as it comes, then each recipe's steps as they arrive */
async function readBook() {
  const g = gen, my = (st.bookGen = (st.bookGen || 0) + 1);
  const res = await call("GET", "/recipe/");
  if (g !== gen || !st || my !== st.bookGen) return;
  if (!res.ok || !Array.isArray(res.data)) { if (!st.bookRead) st.bookFail = callWhy(res) || "CraftBeerPi sent no list"; render(); return; }
  const was = new Map(st.book.map(r => [r.file, r]));
  st.book = res.data.filter(x => x && x.file).map(x => {
    const o = was.get(x.file), modified = epoch(x.modified), keep = o && o.modified === modified && Array.isArray(o.steps);
    return {file: x.file, name: x.name || "", author: x.author || "", desc: x.desc || "", imported_from: x.imported_from || "", modified,
      figures: !!x.mash_numbers && typeof x.mash_numbers === "object", steps: keep ? o.steps : null, basic: keep ? o.basic : null, bad: false};
  });
  st.bookRead = true; st.bookFail = "";
  refreshLoaded();
  defaultOpen();
  render();
  await Promise.all(st.book.filter(r => !Array.isArray(r.steps)).map(async r => {
    const one = await call("GET", `/recipe/${enc(r.file)}`, undefined, 10000);
    if (g !== gen || !st || my !== st.bookGen) return;
    const row = book(r.file);
    if (!row) return;
    const data = one.ok && one.data && typeof one.data === "object" ? one.data : null;
    if (data) { row.basic = data.basic && typeof data.basic === "object" ? data.basic : {}; row.steps = Array.isArray(data.steps) ? data.steps.filter(x => x && typeof x === "object") : []; }
    else row.bad = true;
    if (st.wantEdit && st.wantEdit.file === r.file && data) { const w = st.wantEdit; startEdit(w.file, w.cur); }
    schedule();
  }));
}
const typesOf = list => Object.fromEntries((list || []).filter(t => t && t.name).map(t => [t.name, t]));
const listOf = xs => (xs || []).filter(x => x && x.id).map(x => ({id: x.id, name: String(x.name || x.id)}));
function intake(d) {
  const c = {};
  for (const k of Object.keys(d.config || {})) c[k] = cfgOf(d.config, k);
  // which kettle is the HLT, the mash tun and the boil kettle, as Brew Day works it out: a step's line can depend on it
  const K = kettleRoles(d.kettles, d.config, hermsLogics(d.logic)), roles = {};
  for (const v of ROLES) if (K[v]) roles[K[v].id] = v;
  const steps = (Array.isArray(d.steps) ? d.steps : []).filter(x => x && typeof x === "object");
  const basic = d.basic && typeof d.basic === "object" && !Array.isArray(d.basic) ? d.basic : {};
  const bf = Array.isArray(d.bf) && Array.isArray(d.bf[0]) ? d.bf[0] : [];
  const sig = JSON.stringify([c, listOf(d.kettles), listOf(d.sensors), listOf(d.actors), Object.keys(typesOf(d.stepTypes)), d.version, !!d.connected, !!d.loaded, steps, basic, bf, roles]);
  if (sig === st.sig) return;
  st.sig = sig;
  const wasLink = st.link;
  D.config = c;
  D.roles = roles;
  D.unit = String(c.TEMP_UNIT || "C").toUpperCase().startsWith("F") ? "F" : "C";
  D.kettles = listOf(d.kettles); D.sensors = listOf(d.sensors); D.actors = listOf(d.actors);
  D.types = typesOf(d.stepTypes);
  D.version = d.version && d.version !== "---" ? String(d.version) : "";
  D.connected = !!d.connected; D.loaded = !!d.loaded; D.bf = bf;
  st.link = d.connected ? "ok" : "lost";
  const stepsSig = JSON.stringify([steps, basic]);
  D.steps = steps; D.basic = basic;
  if (stepsSig !== st.stepsSig) { st.stepsSig = stepsSig; refreshLoaded(); onSteps(); if (st.bookRead && st.page === "book" && st.autoOpen) defaultOpen(); }
  if (wasLink === "lost" && st.link === "ok") readBook();
  if (st.wantPick) tryPick();
  schedule();
}
/* the brew steps changed: on Brew Steps, the page's copy follows, keeping each change not saved by the step's id */
function onSteps() {
  if (st.page !== "steps" || !st.bs) return;
  if (st.pend.save) return;
  const wait = st.hold - Date.now();
  if (wait > 0) { if (!st.holdT) st.holdT = later(() => { st.holdT = 0; rebase(); schedule(); }, wait + 20); return; }
  rebase();
}
function rebase() {
  const ed = st.bs;
  if (!ed || !st) return;
  const S = D.steps, B = D.basic || {};
  const keep = {cur: ed.cur, pick: ed.pick, kinds: ed.kinds, from: ed.from, mv: ed.mv};
  const valid = ed2 => {
    const has = k => k && ed2.doc.steps.some(s => s._k === k);
    Object.assign(ed2, keep);
    if (!has(ed2.mv)) ed2.mv = null;
    if (ed2.cur && !["o", "kinds"].includes(ed2.cur) && !has(ed2.cur)) ed2.cur = "o";
    if (ed2.pick && !["o", "kinds"].includes(ed2.pick) && !has(ed2.pick)) ed2.pick = null;
    if (ed2.from && !has(ed2.from)) ed2.from = null;
  };
  if (!changes(ed)) { st.bs = null; st.elsewhere = false; ensureBs(); valid(st.bs); return; }
  const was = new Map(ed.orig.steps.map(o => [o._k, o])), now = keyedById(S), nowBy = new Map(now.map(s => [s._k, s]));
  const content = list => JSON.stringify(list.map(s => [s._k, norm(s.name), s.type, ownKeys(s.props).sort().map(k => [k, norm(s.props[k])])]));
  if (content(now) !== content(ed.orig.steps)) st.elsewhere = true;
  const sameIds = now.length === ed.orig.steps.length && now.every(s => was.has(s._k));
  const carry = d => {
    const o = was.get(d._k), n = nowBy.get(d._k), x = clone(n);
    if (norm(d.name) !== norm(o.name)) x.name = d.name;
    if (d.type !== o.type) {
      x.type = d.type; x.props = {};
      Object.keys(n.props || {}).filter(k => k.startsWith("_")).forEach(k => (x.props[k] = n.props[k]));
      ownKeys(d.props).forEach(k => (x.props[k] = d.props[k]));
    } else new Set([...ownKeys(d.props), ...ownKeys(o.props)]).forEach(k => { if (!same((d.props || {})[k], (o.props || {})[k])) x.props[k] = (d.props || {})[k]; });
    if (d._removed) x._removed = true;
    if (sameIds && d._moved) x._moved = true;
    // what is being typed in a time box, and the half of the day it is read in, stay with the step
    ["_tt", "_typing", "_half", "_base"].forEach(f => { if (f in d) x[f] = d[f]; });
    return x;
  };
  let doc;
  if (sameIds) doc = ed.doc.steps.map(d => !was.has(d._k) ? d : nowBy.has(d._k) ? carry(d) : null).filter(Boolean);
  else {
    doc = now.map(n => { const d = ed.doc.steps.find(x => x._k === n._k); return d && was.has(n._k) ? carry(d) : clone(n); });
    ed.doc.steps.forEach((d, i) => { if (!was.has(d._k)) doc.splice(Math.min(i, doc.length), 0, d); });
  }
  ed.orig = {name: B.name || "", steps: now};
  ed.doc = {name: B.name || "", steps: doc};
  settleMoves(ed);
  valid(ed);
  if (!changes(ed)) st.elsewhere = false;
}
/* ---------- commands ---------- */
const failWords = res => res.error === "timeout" ? "CraftBeerPi didn't answer, so it may not have them all" : res.error === "network" ? "no connection, so CraftBeerPi may not have them all" : `CraftBeerPi said no (${res.status})`;
const detailOf = res => (res && res.data && typeof res.data === "object" && typeof res.data.detail === "string" && res.data.detail) || "";
function pressLoad(file, from) {
  const rule = loadRule();
  if (rule.why) return sayAt(from, file, rule.why);
  if (rule.ask) { st.ask = {kind: "load", file, from}; render(); return focusAsk(); }
  doLoad(file, from);
}
async function doLoad(file, from) {
  const r = book(file);
  if (!r || st.pend.load) return;
  st.ask = null; st.pend.load = file; render();
  const g = gen, res = await call("POST", `/recipe/${enc(file)}/brew`);
  if (g !== gen || !st) return;
  delete st.pend.load;
  if (res.ok) {
    st.offer = null; st.bs = null;
    log(`${r.name} loaded`, "confirmed", "ok");
    say(`${r.name} loaded onto Brew Day, ready to start.`);
    render();
    return;
  }
  const d = detailOf(res);
  if (res.status === 409 && d) return sayAt(from || "col", file, d);
  log(`Loading ${r.name}`, `failed: ${callWhy(res)}`, "bad");
  sayAt(from || "col", file, `Not loaded: ${callWhy(res)}.`);
}
function pressUnload() {
  const rule = unloadRule();
  if (rule.why) return sayAt("col", null, rule.why);
  if (rule.ask) { st.ask = {kind: "unload"}; render(); return focusAsk(); }
  doUnload();
}
async function doUnload() {
  if (st.pend.unload) return;
  const n = (st.loaded && st.loaded.name) || "The steps";
  st.ask = null; st.pend.unload = true; render();
  const g = gen, res = await call("POST", "/step2/clear");
  if (g !== gen || !st) return;
  delete st.pend.unload;
  if (res.ok) { st.bs = null; log(`${n} unloaded: Brew Day is brewing by hand`, "confirmed", "ok"); say(`${n} unloaded: Brew Day is brewing by hand.`); render(); return; }
  const d = detailOf(res);
  if (res.status === 409 && d) return sayAt("col", null, d);
  log(`Unloading ${n}`, `failed: ${callWhy(res)}`, "bad");
  sayAt("col", null, `Not unloaded: ${callWhy(res)}.`);
}
function save(then) {
  const ed = E();
  if (!ed || !changes(ed) || st.pend.save) return;
  if (st.link === "lost") return toast(PAUSED);
  // a time still being typed counts as left: what can't be read stops SAVE, and is said
  ed.doc.steps.forEach(s => { s._typing = false; });
  const need = needsWhy(ed);
  if (need) { render(); return sayAt("save", null, need); }
  if (st.page === "steps") {
    const v = vesselMove(ed);
    if (v && !st.vesselOk) { st.ask = {kind: "vessel", ...v, then}; render(); return focusVessel(); }
  }
  st.vesselOk = false;
  return st.page === "steps" ? saveSteps(then) : saveBook(then);
}
/* a new vessel for a BrewStart heating (or holding) the water: the one change SAVE asks about first, once, naming what
   happens, as the heating moves from one element to another. Neither answer is the default; MOVE THE HEATING saves
   it with the rest, KEEP THE HLT (its vessel's name) puts the vessel back and saves the rest */
function vesselMove(ed) {
  for (const s of live(ed)) {
    if (!liveBs(s) || bsDoing(s) === "waiting") continue;
    const o = origOf(ed, s), p = s.props || {}, q = (o && o.props) || {};
    if (o && norm(p.Heat_Kettle) !== "" && !same(p.Heat_Kettle, q.Heat_Kettle)) return {k: s._k, from: nameOf(D.kettles, q.Heat_Kettle) || "vessel", to: nameOf(D.kettles, p.Heat_Kettle) || "new vessel"};
  }
  return null;
}
function vesselHTML() {
  const a = st.ask;
  return `<div class="confirm" role="group" aria-labelledby="vs-t" id="ask"><p id="vs-t" tabindex="-1">Heating moves from the ${esc(a.from)} to the ${esc(a.to)}: the ${esc(a.from)}'s element stops and the ${esc(a.to)}'s starts.</p>
    <div class="acts"><button type="button" data-yes="vessel-move">Move the heating</button><button type="button" data-yes="vessel-keep">Keep the ${esc(a.from)}</button></div></div>`;
}
/* the question in view, and focus on its words, not on an answer, as neither is the default */
const focusVessel = () => requestAnimationFrame(() => { const a = $("#ask"), p = $("#vs-t"); if (a) a.scrollIntoView({block: "nearest"}); if (p) p.focus({preventScroll: true}); if (p) say(p.textContent); });
function vesselAnswer(move) {
  const a = st.ask, ed = E();
  st.ask = null;
  if (!a || a.kind !== "vessel" || !ed) return render();
  if (move) { st.vesselOk = true; render(); return save(a.then); }
  const s = stepByKey(a.k), o = s && origOf(ed, s);
  if (s && o) s.props.Heat_Kettle = (o.props || {}).Heat_Kettle;
  if (changes(ed)) { render(); return save(a.then); }
  render();
  say(`BrewStart keeps heating the ${a.from}.`);
}
const tidy = steps => steps.filter(s => !s._removed).map(s => { const c = {...s, props: clone(s.props || {})}; delete c._moved; delete c._where; delete c._fill; return c; });
async function saveBook(then) {
  const ed = st.ed, r = book(ed.file);
  if (!r) return;
  const basic = {...(r.basic || {}), name: ed.doc.name, author: ed.doc.author, desc: ed.doc.desc};
  const steps = live(ed).map(s => ({name: s.name, type: s.type, props: clone(s.props || {})}));
  st.pend.save = true; render();
  const g = gen, res = await call("PUT", `/recipe/${enc(ed.file)}`, {basic, steps});
  if (g !== gen || !st) return;
  delete st.pend.save;
  const name = ed.doc.name || r.name;
  if (!res.ok) {
    log(`${name}: saving in the Recipe Book`, `failed: ${callWhy(res)}`, "bad");
    sayAt("save", null, `Not saved: ${failWords(res)}.`);
    return;
  }
  ed.doc.steps = tidy(ed.doc.steps);
  ed.orig = clone(ed.doc);
  Object.assign(r, {name: ed.doc.name, author: ed.doc.author, desc: ed.doc.desc, steps: steps.map(s => clone(s)), basic, imported_from: ""});
  log(`${name} saved in the Recipe Book`, "confirmed", "ok");
  say(`${name} saved in the Recipe Book.`);
  st.offer = ed.file;
  render();
  readBook();
  if (then) then();
}
/* SAVE on Brew Steps: each changed step, each removed one, the new order of the steps that were there, then each new
   step at its place, lowest first; so after every call the steps are in a right order, and a refusal partway leaves
   nothing out of place. It stops at the first refusal: what was sent before it stands */
async function saveSteps(then) {
  const ed = st.bs, L = st.loaded, name = (L && L.name) || "Brew Steps";
  const ops = [];
  /* a running BrewStart's changes go to it through its change_settings (liveBs), only the settings changed: CraftBeerPi
     refuses PUT on a running step */
  for (const s of ed.doc.steps) { const o = origOf(ed, s); if (o && !s._removed) { const c = stepChange(ed, s); if (c.keys.length) ops.push(liveBs(s) ? {kind: "act", s, n: c.keys.length, params: Object.fromEntries(c.keys.map(k => [k, s.props[k] ?? ""]))} : {kind: "put", s, n: c.keys.length}); } }
  for (const s of ed.doc.steps) if (s._removed && origOf(ed, s)) ops.push({kind: "del", s, n: 1});
  const ids = ed.doc.steps.filter(s => origOf(ed, s) && !s._removed).map(s => s._k), was = ed.orig.steps.map(s => s._k).filter(k => ids.includes(k));
  if (ids.join() !== was.join()) ops.push({kind: "order", ids, n: ed.doc.steps.filter(s => s._moved && !s._removed).length || 1});
  live(ed).forEach((s, i) => { if (!origOf(ed, s)) ops.push({kind: "add", s, index: i, n: 1}); });
  const total = ops.reduce((n, o) => n + o.n, 0);
  st.pend.save = true; st.elsewhere = false; render();
  const g = gen, body = s => ({name: s.name, type: s.type, props: clone(s.props || {})});
  let done = 0, failed = null;
  for (const op of ops) {
    const res = op.kind === "put" ? await call("PUT", `/step2/${enc(op.s._k)}`, body(op.s))
      : op.kind === "act" ? await call("POST", `/step2/action/${enc(op.s._k)}`, {action: "change_settings", parameter: op.params})
      : op.kind === "del" ? await call("DELETE", `/step2/${enc(op.s._k)}`)
      : op.kind === "order" ? await call("PUT", "/step2/order", {ids: op.ids})
      : await call("POST", "/step2/", {...body(op.s), index: op.index});
    if (g !== gen || !st) return;
    if (!res.ok) { failed = {op, res}; break; }
    if (op.kind === "put" || op.kind === "act") { const o = origOf(ed, op.s); o.name = op.s.name; o.type = op.s.type; o.props = clone(op.s.props || {}); }
    else if (op.kind === "del") { ed.doc.steps = ed.doc.steps.filter(x => x !== op.s); ed.orig.steps = ed.orig.steps.filter(x => x._k !== op.s._k); }
    else if (op.kind === "order") { ed.orig.steps = op.ids.map(k => ed.orig.steps.find(o => o._k === k)).filter(Boolean); ed.doc.steps.forEach(x => delete x._moved); }
    else {
      const saved = res.data && typeof res.data === "object" ? res.data : {}, old = op.s._k, id = saved.id || old;
      op.s._k = id; op.s.id = saved.id; op.s.status = saved.status || "I";
      delete op.s._where; delete op.s._fill;
      ["cur", "pick", "from", "mv"].forEach(f => { if (ed[f] === old) ed[f] = id; });
      ed.orig.steps.splice(op.index, 0, {...clone(op.s)});
    }
    done += op.n;
  }
  delete st.pend.save;
  st.hold = Date.now() + SETTLE_MS;
  later(() => { rebase(); schedule(); }, SETTLE_MS + 20);
  if (!failed) {
    log(`${name}: brew steps saved for this brew`, "confirmed", "ok");
    say(`${name}: brew steps saved for this brew.`);
    render();
    /* from Brew Day's BrewStart box: the way back next, in view and focused */
    if (!then && st.fromDay) requestAnimationFrame(() => { const d = $("#dayback"), x = d && d.querySelector("button"); if (d) d.scrollIntoView({block: "nearest"}); if (x) x.focus({preventScroll: true}); });
    if (then) then();
    return;
  }
  const {op, res} = failed, data = res.data && typeof res.data === "object" ? res.data : {};
  let words;
  if (op.kind === "put" && res.status === 409 && typeof data.error === "string" && data.error.includes(" ")) words = data.error;
  else if (res.status === 409 && data.error === "steps_changed") { words = "The brew steps were changed on another screen, so the new order wasn't saved. Your changes are still here."; st.elsewhere = true; }
  else if (res.status === 409 && detailOf(res)) words = detailOf(res);
  else if (res.status === 400 && detailOf(res)) { words = detailOf(res); log(`${name}: saving the brew steps`, "failed", "bad"); }
  else { words = `Not saved: ${failWords(res)}.`; log(`${name}: saving the brew steps`, `failed: ${callWhy(res)}`, "bad"); }
  if (done && (res.status === 409 || (res.status === 400 && detailOf(res)))) log(`${name}: ${done} of ${total} changes to the brew steps saved for this brew`, "the rest refused", "bad");
  sayAt("save", null, words);
}
function closeEdit(to) {
  if (dirty()) { st.ask = {kind: "leave", to: to && to.name}; st.leaveTo = to || null; render(); return focusAsk(); }
  leaveEditor(to);
}
function leaveEditor(to) {
  st.ed = null; st.pane = "list"; st.ask = null; st.leaveTo = null;
  if (to && to.file) st.open = to.file;
  if (to && to.route) return apply(to.route);
  if (to && to.href) return goTo(to.href);
  st.view = narrow() ? "recipe" : st.view;
  render();
  goView(true);
}
/* a tab, MORE's list or a button that opens another page: with changes not saved, it asks first */
function goTo(href) {
  const path = String(href || "#/").replace(/^#/, "") || "/";
  if (env.navigate) env.navigate(path);
}
function leaveFor(label, href) {
  st.ask = {kind: "leave", to: label};
  st.leaveTo = {href};
  if (narrow() && st.page === "steps") st.view = "recipe";
  render();
  focusAsk();
}
function setProp(k, label, value) {
  const ed = E();
  if (k === "r") ed.doc[label] = value;
  else {
    const s = stepByKey(k);
    if (!s) return;
    if (label === "name") s.name = value;
    else if (label === "type") {
      // a new kind keeps the settings it shares with the old one: its vessel, probe, temperature, minutes
      const props = value === "BrewStart" ? brewStartProps(E()).props : {...(CAT.START[value] || {})};
      labelsOf(value).forEach(l => { if (norm(s.props[l]) !== "") props[l] = s.props[l]; });
      Object.keys(s.props || {}).filter(x => x.startsWith("_")).forEach(x => (props[x] = s.props[x]));
      s.type = value; s.props = props;
    } else s.props[label] = value;
  }
}
async function readLists() {
  const out = {}, g = gen;
  await Promise.all(FILES.map(async f => {
    const r = await call("GET", `/upload/${f.kind}`, undefined, 10000);
    out[f.kind] = r.ok && Array.isArray(r.data) ? r.data.filter(x => x && x.value != null).map(x => ({value: String(x.value), label: String(x.label ?? x.value)})) : [];
  }));
  if (g !== gen || !st) return;
  st.imp.lists = out;
}
function openImport() {
  if (st.imp.asked) return;
  st.imp.asked = true;
  const g = gen;
  readLists().then(() => { if (g === gen && st) render(); });
  call("GET", "/upload/getpath").then(r => { if (g === gen && st && r.ok && r.data && r.data.path) st.imp.path = String(r.data.path); });
}
/* a file sent as CHOOSE FILE or a drop sends it: kept (200) or not (400, and CraftBeerPi says why in its message) */
async function sendFile(f) {
  if (!f || st.pend.upload) return;
  if (st.link === "lost") return toast(PAUSED);
  st.pend.upload = true; render();
  const fd = new FormData();
  fd.append("File", f);
  let ok = false, why = "";
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
  try { const res = await fetch("/upload/", {method: "POST", body: fd, cache: "no-store", signal: ctl.signal}); ok = res.ok; if (!ok) why = `CraftBeerPi said no (${res.status})`; }
  catch (e) { why = e && e.name === "AbortError" ? "no answer in 30 s" : "no connection"; }
  finally { clearTimeout(t); }
  if (!st) return;
  delete st.pend.upload;
  if (!ok) { render(); return sayAt("file", null, why.startsWith("CraftBeerPi said no") ? `${f.name} wasn't kept: CraftBeerPi says why in the title bar.` : `${f.name} wasn't sent: ${why}.`); }
  const kind = FILES.find(x => x.ext.test(f.name));
  st.imp.sent = {kind: kind ? kind.kind : "", name: f.name};
  st.imp.result = null;
  await readLists();
  if (st) render();
}
/* IMPORT: the recipe goes into the Recipe Book, and the result shows in place, over the list, with its row and LOAD. A
   BeerXML recipe of a name the book has asks first, in its row, before anything changes (importAskHTML): `how` is the
   answer, {update: the book file} or {new: true}, sent with it */
async function doImport(kind, id, label, how) {
  const I = st.imp;
  if (I.busy) return;
  if (!how && kind === "xml" && updates() && sameNamed(label).length) { I.ask = {kind, id, label}; I.result = null; render(); return focusImq(); }
  const before = st.book.some(r => r.name === label && r.imported_from);
  I.busy = {kind, id}; I.result = null; I.ask = null; render();
  const g = gen, res = await call("POST", `/${I.path}/${kind}`, how ? {id, ...how} : {id}, 30000);
  if (g !== gen || !st) return;
  const from = kind === "bf" ? "bf" : "file";
  if (!res.ok) {
    I.busy = null;
    I.result = {ok: false, from, update: !!(how && how.update), why: detailOf(res) || (res.error === "http" ? `CraftBeerPi said no (${res.status}).` : `CraftBeerPi didn't answer: ${callWhy(res)}.`)};
    render();
    return;
  }
  const R = res.data && typeof res.data === "object" ? res.data : {}, name = R.name || label;
  await readBook();
  if (!st) return;
  I.busy = null;
  let file = R.file && book(R.file) ? R.file : null;
  if (!file) { const r = sorted().find(x => x.name === name && x.imported_from) || sorted().find(x => x.name === name); file = r ? r.file : null; }
  I.result = {ok: true, from, kind, id, file, name, replaced: "replaced" in R ? !!R.replaced : before,
    updated: !!R.updated, steps: R.steps === "file" ? "file" : "kept", loaded: !!R.loaded,
    warnings: Array.isArray(R.warnings) ? R.warnings.filter(w => w && (w.title || w.text)) : []};
  if (file) st.open = file;
  render();
}
async function refreshBf() {
  if (st.imp.bfBusy) return;
  st.imp.bfBusy = true; render();
  const g = gen, res = await call("GET", "/upload/bfupdate/", undefined, 30000);
  if (g !== gen || !st) return;
  st.imp.bfBusy = false;
  if (!res.ok) log("Brewfather's list", `failed: ${callWhy(res)}`, "bad");
  render();
}
/* COPY and + NEW: a name, then the recipe made, and opened for changing */
async function make() {
  const f = $("#nm-in"), nm = norm(f && f.value), copy = st.pane === "copy", from = copy ? book(st.open) : null;
  st.nmValue = f ? f.value : null;
  if (!nm) { sayAt("nm", null, "Give it a name first: the book lists recipes by name."); const n = $("#nm-in"); return n && n.focus(); }
  if (st.pend.make) return;
  st.pend.make = true; render();
  const g = gen, res = copy ? await call("POST", `/recipe/${enc(from.file)}/clone`, {name: nm}) : await call("POST", "/recipe/create", {name: nm});
  if (g !== gen || !st) return;
  delete st.pend.make;
  const id = res.ok && res.data && res.data.id;
  if (!id) { log(copy ? `Copying ${from.name}` : `Adding ${nm}`, `failed: ${callWhy(res) || "no id"}`, "bad"); return sayAt("nm", null, `Not made: ${callWhy(res) || "CraftBeerPi gave no id"}.`); }
  st.nmValue = null;
  log(`${nm} ${copy ? "copied" : "added"} to the Recipe Book`, "confirmed", "ok");
  await readBook();
  if (!st) return;
  st.open = id;
  startEdit(id, copy ? null : "kinds");
  st.view = narrow() ? (copy ? "recipe" : "plate") : st.view;
  render();
  goView(true);
}
async function delRecipe() {
  const r = st.ed && book(st.ed.file);
  if (!r || st.pend.del) return;
  st.pend.del = true; render();
  const g = gen, res = await call("DELETE", `/recipe/${enc(r.file)}`);
  if (g !== gen || !st) return;
  delete st.pend.del;
  if (!res.ok) { log(`Deleting ${r.name}`, `failed: ${callWhy(res)}`, "bad"); return sayAt("del", null, `Not deleted: ${callWhy(res)}.`); }
  log(`${r.name} deleted from the Recipe Book`, "confirmed", "ok");
  st.book = st.book.filter(x => x !== r);
  st.ask = null; st.ed = null; st.pane = "list"; st.open = null; st.view = "list";
  defaultOpen();
  render();
  goView(true);
  readBook();
}
/* SAVE TO BOOK: CraftBeerPi keeps the steps as a book recipe (replacing the copy they came from, or as a new one) and,
   where it records it, as where the steps on Brew Day came from, so LOAD and UNLOAD know they can be loaded again */
async function toBook(how) {
  const L = st.loaded, r = L && L.file ? book(L.file) : null, c4 = knowsBook();
  let body, nm = L ? L.name : "";
  if (c4) {
    if (how === "replace" && r) body = {file: r.file};
    else {
      nm = norm(($("#tb-name") || {}).value);
      if (!nm) { sayAt("tb", null, "Give it a name first: the Recipe Book lists recipes by name."); const f = $("#tb-name"); return f && f.focus(); }
      body = {name: nm};
    }
  }
  st.ask = null; st.pend.tobook = true; render();
  const g = gen, res = await call("POST", "/step2/savetobook", body);
  if (g !== gen || !st) return;
  delete st.pend.tobook;
  if (!res.ok) { log(`Keeping ${nm || "the steps"} in the Recipe Book`, `failed: ${callWhy(res)}`, "bad"); return sayAt("col", null, `Not kept: ${callWhy(res)}.`); }
  log(how === "replace" && r ? `${r.name} replaced in the Recipe Book` : `${nm || "Brew steps"} saved in the Recipe Book`, "confirmed", "ok");
  render();
  readBook();
}
/* ---------- input ---------- */
function onClick(e) {
  const b = e.target.closest("button, a");
  if (!b || !sr.contains(b)) return;
  const ds = b.dataset;
  if (b.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if (ds.load) return sayAt(ds.from, ds.load, ds.why);
    if ("unload" in ds || "tobook" in ds) return sayAt("col", null, ds.why);
    if ("save" in ds) return sayAt("save", null, ds.why);
    return toast(ds.why || "Not now.");
  }
  // moving a step lasts for one placing: any other command ends it first, as CANCEL would
  const em = E();
  if (em && em.mv && ds.put === undefined && !("mvcancel" in ds) && !ds.move) em.mv = null;
  if (ds.tabgo) {
    e.preventDefault();
    const href = "#" + (TAB_PATH[ds.tabgo] || "/");
    if (dirty() && !st.pend.save) return leaveFor(ds.tabgo, href);
    return goTo(href);
  }
  if (ds.back) {
    e.preventDefault();
    if (ds.back === "list") { if (st.pane === "edit" && st.ed) return closeEdit(); st.view = "list"; st.pane = "list"; render(); return goBack(); }
    st.view = "recipe"; if (E()) E().pick = null; render(); goBack(); return window.scrollTo(0, 0);
  }
  if (ds.open) {
    if (st.pane === "edit" && st.ed && st.ed.file !== ds.open) return closeEdit({file: ds.open, name: (book(ds.open) || {}).name});
    st.open = ds.open; st.autoOpen = false; st.ask = null; st.notes = {}; st.offer = st.offer === ds.open ? st.offer : null;
    if (st.pane !== "edit") st.pane = "list";
    if (narrow()) st.view = "recipe";
    render();
    goView(false);
    if (!narrow()) { const c = $("#col"); c.scrollTop = 0; const sc = $("#steps"); if (sc) sc.scrollTop = 0; }
    return window.scrollTo(0, narrow() ? 0 : window.scrollY);
  }
  if (ds.load) return pressLoad(ds.load, ds.from);
  if (ds.yes) {
    const a = st.ask || {};
    if (ds.yes === "vessel-move" || ds.yes === "vessel-keep") return vesselAnswer(ds.yes === "vessel-move");
    if (ds.yes === "load") return doLoad(a.file, a.from);
    if (ds.yes === "unload") return doUnload();
    if (ds.yes === "delete") return delRecipe();
    if (ds.yes === "replace" || ds.yes === "asnew") return toBook(ds.yes);
    if (ds.yes === "save-go" || ds.yes === "drop-go") {
      const to = st.leaveTo, onward = () => (st.page === "book" ? leaveEditor(to) : (st.ask = null, st.leaveTo = null, to && to.href ? goTo(to.href) : render()));
      st.ask = null;
      if (ds.yes === "save-go") { render(); return save(onward); }
      const ed = E();
      if (ed) { ed.doc = clone(ed.orig); ed.mv = null; ed.kinds = false; }
      st.elsewhere = false;
      return onward();
    }
  }
  if ("no" in ds) { st.ask = null; st.leaveTo = null; st.imp.ask = null; return render(); }
  if ("edit" in ds) { if (!startEdit(st.open)) return render(); if (narrow()) st.view = "recipe"; render(); return goView(false); }
  if (ds.go) {
    if (st.page === "book" && st.pane !== "edit") {
      const i = +String(ds.go).replace("i", "");
      if (!startEdit(st.open, ds.go === "r" ? "r" : null)) return render();
      const k = ds.go === "r" ? "r" : st.ed.doc.steps[i] ? st.ed.doc.steps[i]._k : "r";
      if (narrow()) st.view = "recipe";
      render();
      if (!narrow()) goView(true);
      return requestAnimationFrame(() => jump(k));
    }
    if (st.page === "steps") ensureBs();
    return jump(ds.go);
  }
  if ("close" in ds) return closeEdit();
  if ("copy" in ds) { st.pane = "copy"; st.view = "plate"; st.nmValue = null; render(); goView(false); const f = $("#nm-in"); if (f) { f.focus(); f.select(); } return; }
  if ("new" in ds) { st.pane = "new"; st.view = "plate"; st.nmValue = null; render(); goView(false); const f = $("#nm-in"); if (f) f.focus(); return; }
  if ("list" in ds) { st.pane = "list"; st.view = "list"; st.ed = null; render(); return goBack(); }
  if ("make" in ds) return make();
  if ("addstep" in ds) {
    ensureBs();
    const ed = E();
    if (!ed) return;
    ed.kinds = true; ed.from = ed.cur; ed.pick = "kinds"; ed.landKinds = true;
    if (narrow()) st.view = "plate";
    render(); ed.landKinds = false;
    goView(false);
    const p = $("#p-kinds");
    if (p && !narrow()) { if (wide()) $("#pane").scrollTop = p.offsetTop - $("#pane").offsetTop - 8; else p.scrollIntoView(); }
    return;
  }
  if ("kindsClose" in ds) { const ed = E(); ed.kinds = false; ed.from = null; ed.pick = null; if (narrow()) { st.view = "recipe"; render(); return goBack(); } return render(); }
  if (ds.kind) {
    const ed = E(), pl = naturalPlace(ed, ds.kind), s = newStep(ds.kind);
    insertAt(ed, s, pl.at); s._where = pl.where;
    ed.kinds = false; ed.from = null; ed.cur = s._k;
    render();
    return requestAnimationFrame(() => jump(s._k));
  }
  // + BrewStart, over step 1 of a recipe without one: added first, filled in, its time to set
  if ("bsadd" in ds) {
    if (st.page === "book" && st.pane !== "edit" && !startEdit(st.open)) return render();
    addBrewStart();
    return;
  }
  // MOVE: the step is marked, and PUT IT HERE shows between the steps; one tap there puts it, however far
  if (ds.move) {
    const ed = E(), s = stepByKey(ds.move), wasPlate = narrow() && st.view === "plate";
    ed.mv = ds.move; ed.kinds = false; ed.cur = ds.move;
    if (narrow()) { st.view = "recipe"; ed.pick = null; }
    render();
    if (wasPlate) goBack();
    say(`Moving ${nameIn(s)}. PUT IT HERE is between the steps, with FIRST and LAST above them. CANCEL leaves it where it is.`);
    return requestAnimationFrame(() => { const c = $(`#c-${CSS.escape(ds.move)}`); if (c) c.scrollIntoView({block: narrow() ? "center" : "nearest"}); });
  }
  if (ds.put !== undefined) {
    const ed = E(), s = ed && ed.mv ? stepByKey(ed.mv) : null;
    if (!s) return;
    moveTo(ed, s, +ds.put);
    if (origOf(ed, s)) s._moved = true;
    delete s._where;
    settleMoves(ed); ed.mv = null; ed.cur = s._k;
    render();
    say(`${nameIn(s)} moved: it is step ${live(ed).indexOf(s) + 1} now.`);
    return requestAnimationFrame(() => { if (!narrow()) return jump(s._k); const c = $(`#c-${CSS.escape(s._k)}`); if (c) c.scrollIntoView({block: "center"}); });
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
    const s = stepByKey(ds.s);
    if (!s) return;
    const t = hm(s.props[ds.p]);
    s._half = s._base = ds.half;
    if (t) setProp(ds.s, ds.p, `${pad2(+t.slice(0, 2) % 12 + (ds.half === "pm" ? 12 : 0))}${t.slice(2)}`);
    else if (norm(s._tt)) { const r = parseTypedTime(s._tt, ds.half, {format: clockFmt()}); if (r) setProp(ds.s, ds.p, r); }
    render();
    const nb = $(`#${CSS.escape(`i-${ds.s}-${ds.p}-half`)} [data-half="${ds.half}"]`);
    if (nb) nb.focus({preventScroll: true});
    return keepWhenInView(ds.s);
  }
  if (ds.set !== undefined && b.closest(".seg")) {
    setProp(ds.s, ds.p, ds.set); const id = b.closest(".seg").id; render(); const nb = $(`#${CSS.escape(id)} [data-set="${CSS.escape(ds.set)}"]`); if (nb) nb.focus({preventScroll: true});
    /* READY BY or START AT, TODAY, TOMORROW or DATE change the time in words: it stays in view */
    const sk = ds.s && ds.s !== "r" ? stepByKey(ds.s) : null;
    if (sk && sk.type === "BrewStart" && (ds.p === "Timing" || ds.p === "Mode")) keepWhenInView(ds.s);
    return;
  }
  if (ds.undo) {
    const ed = E(), k = ds.undo, label = ds.p;
    if (k === "r") ed.doc[label] = ed.orig[label];
    else { const s = stepByKey(k), o = origOf(ed, s); delete s._tt; delete s._typing; if (label === "name") s.name = o.name; else if (label === "type") { s.type = o.type; s.props = clone(o.props); } else s.props[label] = (o.props || {})[label]; }
    return render();
  }
  if ("undoall" in ds) { const ed = E(); ed.doc = clone(ed.orig); ed.kinds = false; ed.mv = null; st.elsewhere = false; log(st.page === "steps" ? "Brew Steps: changes put back" : `${ed.doc.name}: changes put back`, "done", "ok"); return render(); }
  if ("save" in ds) return save();
  if (ds.rmadd) { const s = stepByKey(ds.s), i = +ds.rmadd; s.props[`Hop_${i}`] = null; s.props[`Hop_${i}_text`] = null; return render(); }
  if (ds.addadd) {
    const s = stepByKey(ds.addadd);
    for (let i = 1; i <= 6; i++) if (num(s.props[`Hop_${i}`]) == null && norm(s.props[`Hop_${i}_text`]) === "") { s.props[`Hop_${i}`] = 0; s.props[`Hop_${i}_text`] = ""; render(); const f = $(`#i-${CSS.escape(s._k)}-Hop_${i}`); if (f) { f.focus(); f.select(); } return; }
    return;
  }
  if ("del" in ds) { st.ask = {kind: "delete"}; render(); return focusAsk(); }
  if ("unload" in ds) return pressUnload();
  if ("tobook" in ds) { st.ask = {kind: "tobook"}; render(); const f = $("#tb-name"); if (f) { f.focus({preventScroll: true}); f.select(); } else focusAsk(); return; }
  if ("import" in ds) { st.pane = "import"; st.view = "plate"; st.imp.result = null; openImport(); render(); return goView(false); }
  if ("choose" in ds) { if (fileIn) { fileIn.value = ""; fileIn.click(); } return; }
  if (ds.imp) { const x = ((st.imp.lists || {})[ds.ik] || []).find(r => r.value === ds.imp); return doImport(ds.ik, ds.imp, x ? x.label : ""); }
  if (ds.imq) { const a = st.imp.ask; st.imp.ask = null; if (!a) return render(); return doImport(a.kind, a.id, a.label, ds.imq === "new" ? {new: true} : {update: ds.file}); }
  if ("bfre" in ds) return refreshBf();
  if (ds.bfimp) { const x = D.bf.find(r => String(r.value) === ds.bfimp); return doImport("bf", ds.bfimp, x ? String(x.label) : ""); }
  if ("clear" in ds) { st.q = ""; render(); const q = $("#q"); return q && q.focus(); }
}
// a tab or MORE's list in the frame: the capture phase, so the frame's own handling and the link wait for the answer
function onFrameClick(e) {
  if (!st || !host || !e.target.closest) return;
  const a = e.target.closest(".tabs a, #bd-more a");
  if (!a || a.getAttribute("aria-current") === "page" || ["More", "BrewScribe"].includes(a.dataset.tab)) return;
  if (!dirty() || st.pend.save) return;
  e.preventDefault();
  e.stopPropagation();
  if (env.frame && a.closest("#bd-more")) env.frame.closeMore();
  const label = (a.querySelector(".long") || a).textContent.trim();
  leaveFor(label.replace(/\b\w/g, c => c.toUpperCase()), a.getAttribute("href"));
}
function onUnload(e) {
  if (!st || !dirty()) return;
  e.preventDefault();
  e.returnValue = "";
}
function onInput(e) {
  const f = e.target;
  if (f.id === "q") { st.q = f.value; return render(); }
  if (f.id === "bq") { st.imp.bq = f.value; return render(); }
  if (f.id === "nm-in") { st.nmValue = f.value; return; }
  if (f.id === "tb-name" || f === fileIn) return;
  const k = f.dataset.s, label = f.dataset.p;
  if (!k || !label || f.tagName === "SELECT") return;
  if (f.classList.contains("tmbox")) {
    // read as it's typed, in the half of the day the box showed as typing began (_base); AM and PM follow the time
    const s = stepByKey(k);
    if (!s) return;
    const base = s._base || (hm(s.props[label]) ? halfOfDay(hm(s.props[label])) : s._half || "am");
    const r = norm(f.value) === "" ? "" : parseTypedTime(f.value, base, {format: clockFmt()});
    s._tt = f.value; s._typing = true;
    setProp(k, label, r || "");
    if (r) s._half = halfOfDay(r);
    render();
    return keepWhenInView(k);
  }
  if (f.tagName === "TEXTAREA") {
    const v = f.value.replace(/(\r\n|\r|\n)+/g, " ");
    if (v !== f.value) f.value = v;
    f.style.height = "auto"; f.style.height = f.scrollHeight + 2 + "px";
  }
  setProp(k, label, f.value);
  render();
  if (label === "StartDate") keepWhenInView(k);
}
function onChange(e) {
  const f = e.target;
  if (f === fileIn) { const file = f.files && f.files[0]; if (file) sendFile(file); return; }
  if (f.classList && f.classList.contains("tmbox")) return settleTime(f);
  if (f.tagName !== "SELECT" || !f.dataset.s) return;
  setProp(f.dataset.s, f.dataset.p, f.value);
  const id = f.id;
  render();
  const n = $("#" + CSS.escape(id));
  if (n) n.focus({preventScroll: true});
}
/* a time box once left, or on Enter: a time it read shows as it reads it ("7" becomes "7:00"); what it couldn't read
   stays as typed, and is said */
function settleTime(f) {
  const s = stepByKey(f.dataset.s);
  if (!s || !s._typing) return;
  s._typing = false;
  const t = hm(s.props[f.dataset.p]);
  if (t) { f.value = formatTimeOfDay(t, {format: clockFmt(), ampm: false}); s._tt = f.value; }
  render();
}
// a time typed next is read in the half of the day the box shows as typing begins
function onFocusIn(e) {
  const f = e.target;
  if (!f || !f.classList || !f.classList.contains("tmbox")) return;
  const s = stepByKey(f.dataset.s), t = s && hm(s.props[f.dataset.p]);
  if (s) s._base = t ? halfOfDay(t) : s._half || "am";
}
function onFocusOut(e) {
  const f = e.target;
  if (f && f.classList && f.classList.contains("tmbox")) settleTime(f);
}
function onKey(e) {
  const t = (e.composedPath && e.composedPath()[0]) || e.target;
  if (!t || (t !== document.body && t !== document.documentElement && !sr.contains(t) && t !== host)) return;
  if (t.tagName === "TEXTAREA" && e.key === "Enter" && !e.isComposing) e.preventDefault();
  if (e.key === "Escape") {
    if (t.id === "q" && st.q) { st.q = ""; t.value = ""; return render(); }
    if (E() && E().mv) { E().mv = null; return render(); }
    if (st.ask) { st.ask = null; st.leaveTo = null; render(); }
    if (st.imp.ask) { st.imp.ask = null; render(); }
  }
  if (t.getAttribute && t.getAttribute("role") === "radio" && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
    e.preventDefault();
    const rs = $$("[role=radio]", t.closest(".seg")), i = rs.indexOf(t), nx = rs[(i + (/Right|Down/.test(e.key) ? 1 : rs.length - 1)) % rs.length];
    nx.focus(); nx.click();
  }
}
/* a file dropped on the drop area is sent as CHOOSE FILE sends one */
const dropOf = e => e.target && e.target.closest && e.target.closest("#drop");
function onDragOver(e) { const d = dropOf(e); if (!d) return; e.preventDefault(); d.classList.add("over"); }
function onDragLeave(e) { const d = dropOf(e); if (d) d.classList.remove("over"); }
function onDrop(e) { const d = dropOf(e); if (!d) return; e.preventDefault(); d.classList.remove("over"); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) sendFile(f); }
let lastNarrow = null;
function onResize() { if (!st) return; const n = narrow(); if (n !== lastNarrow) { lastNarrow = n; render(); } else { applyView(); grow(); fitPinned(); } }
const onScroll = () => requestAnimationFrame(spy);

/* ---------- the page ---------- */
// el: the frame's host for the page (screen.js, page "recipes" or "brewsteps"). o.frame: the frame (log, say, toast,
// closeMore). o.navigate(path, options): open a page, or change the address. o.mode: "book" or "steps"
export function createRecipes(el, o = {}) {
  if (st) teardown();
  const myGen = ++gen;
  host = el; env = o; timers = [];
  // the frame's rules go in once and stay: they are scoped to html[data-page=recipes] and [data-page=brewsteps], so they
  // rest while neither is on
  if (!document.getElementById("rc-style")) {
    const s = document.createElement("style");
    s.id = "rc-style";
    s.textContent = FRAME_CSS;
    document.head.appendChild(s);
  }
  fresh();
  sr = host.shadowRoot || host.attachShadow({mode: "open"});
  sr.innerHTML = `<style>${RECIPES_CSS}${OWN_CSS}</style><main class="main" id="main" data-view="list">
    <div class="tool" id="tool"></div>
    <aside class="col" id="col" aria-label="Recipe"></aside>
    <section class="pane" id="pane" aria-label="Recipe Book"><div id="work"></div></section>
  </main><div class="savebar" id="savebar" hidden></div><input type="file" id="file-input" accept=".xml,.json,.sqlite" hidden>`;
  fileIn = $("#file-input");
  const on = (t, k, f, x) => { t.addEventListener(k, f, x); off.push(() => t.removeEventListener(k, f, x)); };
  on(sr, "click", onClick);
  on(sr, "input", onInput);
  on(sr, "change", onChange);
  on(sr, "focusin", onFocusIn);
  on(sr, "focusout", onFocusOut);
  on(document, "keydown", onKey);
  on(sr, "dragover", onDragOver);
  on(sr, "dragleave", onDragLeave);
  on(sr, "drop", onDrop);
  on($("#pane"), "scroll", onScroll, {passive: true});
  on(window, "scroll", onScroll, {passive: true});
  on(window, "resize", onResize);
  if (window.visualViewport) on(window.visualViewport, "resize", onKeyboard);
  on(document, "click", onFrameClick, true);
  on(window, "beforeunload", onUnload);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (gen === myGen && st) grow(); });
  // CraftBeerPi's clock: drawn again as it becomes known, as its minute turns and as its speed changes (+ BrewStart, the
  // time in words, the clock in BrewStart's When settings)
  let clockKey = null;
  const clockTick = setInterval(() => {
    if (gen !== myGen || !st) return;
    const d = cbNow(), key = d ? `${isoOf(d)} ${hhmmOf(d)} ${brewScale()}` : "";
    if (key !== clockKey) { clockKey = key; schedule(); }
  }, 1000);
  off.push(() => clearInterval(clockTick));
  lastNarrow = narrow();
  render();
  readBook();
  return {
    update(d) { if (gen === myGen && st && d) intake(d); },
    route(r) { if (gen === myGen && st && r) route(r); },
    // how many changes aren't saved yet, for a test or a question before leaving
    unsaved() { return gen === myGen && st ? changes(E()) : 0; },
    destroy() { if (gen === myGen) teardown(); }
  };
}
function teardown() {
  off.forEach(f => f());
  off = [];
  timers.forEach(clearTimeout);
  timers = [];
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  const app = host && host.closest(".app");
  if (app) app.removeAttribute("data-dirty");
  if (sr) sr.innerHTML = "";
  host = null; sr = null; fileIn = null; st = null; env = {}; D = null;
  gen++;
}
