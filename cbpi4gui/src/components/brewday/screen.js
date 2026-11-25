// The brew-day screen.
//
// It must look identical to the brew-day mockup, not a rough likeness, so this is the mockup's own code
// (design/brewday/brew-day.js, layout B): the same functions write the same markup, styled by the mockup's
// own stylesheet (brewday.css, generated from it) and drawn by its own rig drawing (rig.js). cbpi-testbench's
// test_ui_brewday_identity.py compares the two pictures, moment by moment and screen size by size.
//
// What is different from the mockup:
// - The drawing code reads M (what stays put through a brew day: the recipe, which switch is which) and st
//   (this moment) where the mockup reads its globals. With ?demo=<moment> (demo.js lists them) both come from the
//   mockup's demo data (demo.js) and commands are simulated exactly as in the mockup. Otherwise they come from
//   CraftBeerPi (live.js), and commands go to it (api.js).
// - The boil kettle is the mockup's proposed one (?bk=power) while it runs the new BoilPower (M.BKNEW: it declares
//   set_boil_at, from 0.0.3.post7), and the mockup's today's one (?bk=today) with an older BoilPower, whose target
//   is where its boil starts. The demo always shows the proposed one.
// - Its MANUAL is the mockup's (BOIL-MANUAL.md: by hand at the boil power, HAND in the window, the steps kept, MAN
//   boxed where AUTO is usual) while BoilPower declares heat_by_hand_at_boil_power (M.BKHAND, from 0.0.3.post13); with
//   an older one, which heats by hand at the element's own level, MANUAL stays as before (?bkman=today).
// - From the boil's start the drawing is the mockup's ?wp=chill: the wort pump at the
//   boil kettle, on a short loop through the chiller. The mockup's other options for it aren't offered.
// - A command says at its own button whether it worked. One that fails, or gets no answer in 5 s, turns its
//   button red and raises an alarm in the title bar; it is never silently dropped.
// - The regions are patched in place, not rewritten (morph), so readings that change every second do not
//   take a button's focus, a held press or a half-typed target with them.
// - Text from CraftBeerPi (step, hop and recipe names, prompts) is escaped, and the degree sign follows
//   TEMP_UNIT.
// - Heat still needs a held press when a failed "on" is tried again, and a held press is not sent if the
//   button changed under the finger.
// - The timers are CraftBeerPi's, up to four, kept on
//   its brewing clock so every screen shows the same ones (M.TIMERS: it has them; with an older CraftBeerPi the screen
//   keeps its one rest timer). The names to pick for a timer are its BREWDAY_TIMER_NAMES setting, read from the settings so
//   a new list shows at once. A timer's own time is minutes and seconds, from a second to 300 minutes. A timer's alarm is
//   CraftBeerPi's kept prompt, which the title bar shows with its one button, OK. SOUND is this browser's own, kept on this
//   device. Pressing SOUND while it says TAP TO ALLOW allows it and leaves it on; on a phone a finger counts as it lifts.
// - A question's line in the event log says "waiting for you", in amber, only while CraftBeerPi waits for its answer; then
//   the same line says "answered", "no longer needed" or, where the page can't tell which (opened later, or after the
//   connection came back), "no longer waiting". Live, the line
//   keeps the question's CraftBeerPi id to find it by; the mockup's lines have none, so it finds them by their words.
// - What arrives together is logged in the order it happened: questions gone, a step's last words, the steps' lines, then
//   the rest of what CraftBeerPi said, so the event line ends on what it led to. A warning's line is amber only while the
//   warning waits in the title bar for OK. The mockup has
//   neither: its presses log in that order themselves, and it has no warnings without buttons. Live, what a step's
//   change set going can also reach the screen just before the change itself; its line goes before that (logStep).
// - A question answered on another screen gets one short line, in the words an answer here logs, "from another
//   screen", as its own line says "answered": the question isn't logged again. It names the button pressed when
//   CraftBeerPi says which; a SpargeStep's question gets
//   none, as its step's "sparge started" line is its answer. The mockup has no other screen, so this is live only.
// - A reset on another screen (the Brew Steps page's, or another Brew Day's) gets one line, "Recipe reset to step 1",
//   "from another screen". Live only, as above.
// - The versions' line says what is really running: this bundle's release number, commit and build time, stamped in
//   as it is built (config-overrides.js), and CraftBeerPi's from GET /system/. The demo shows the mockup's made-up ones.
// - The title bar shows the most urgent thing waiting, then "· N more waiting": no connection, a command that failed
//   and CraftBeerPi's errors; a timer that has run out; what the brew
//   needs (a question CraftBeerPi sends as a warning or an error, or the current step's own); warnings without buttons;
//   then everything else, which holds nothing up (BrewScribe's reminders, Check mash pH, Brewing Complete). Oldest first
//   within each. It beeps twice only when something that has just arrived takes the title bar: not when one moves up
//   after an answer, nor for one arriving behind another, nor for the questions already waiting as a page opens. A
//   question already waiting as the screen opens inside the app gets its line, as on a page loaded afresh. The demo's
//   moments have one alert at a time and beep as the mockup does, so this is live only.
// - The mash pH's RECORD pH (design/brewday/PH-ENTRY.md) asks the real BrewScribe, on CraftBeerPi's own address. Its OK
//   is the reminder's own CraftBeerPi button; one that fails turns OK red, "tap to try again", under the reminder,
//   rather than raising the title bar's alarm, which would take the reminder's place. While the connection is lost the
//   title bar says so in the reminder's place: what was typed in the pH box stays, and comes back with the reminder.
import { rigSVG, RIG_H } from "./rig";
import * as DEMO from "./demo";
import * as SWD from "./strike-demo";
import { api, why as failWhy } from "./api";
import { model, num, parseLeft, bookLine, isHerms, unitText, ROLES, cfg, timerNames, recipeWater, waterLacks, pastWater, brewWords, inWords, durWords, GAL_L } from "./live";
import { play as playSound, soundOf, DEFAULT_SOUND, SOUNDS } from "./alarm";
import { GSPANS, GSAY, graphHTML, graphSVG, graphETA } from "./graphs";
import { createHistory } from "./history";
import { settingsClockFormat, formatTimeOfDay, timeParts, parseTypedTime, TWELVE_HOUR, TWENTY_FOUR_HOUR } from "../util/timefmt";
import { clearKeyboard } from "../util/keyboard";
// As text, exactly as written (config-overrides.js): the CSS pipeline would rewrite the mockup's colours.
import BREWDAY_CSS from "./brewday.css";
import EXTRA_CSS from "./brewday-extra.css";

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const f1 = n => n == null ? "– –" : n.toFixed(1);
const pad = n => String(n).padStart(2, "0");
const mmss = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
const hhmm = t => `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}`;
/* a time of day as CraftBeerPi or a plugin writes it, in minutes from midnight: "05:53" or "17:53", or on CraftBeerPi's
   12-hour clock (CLOCK_FORMAT) "5:53 AM" or "5:53 PM", 12 AM being midnight; null for anything else */
function clockMin(x) {
  const m = /^\s*(\d{1,2}):(\d{2})(?:\s?([AP])M)?\s*$/i.exec(String(x ?? ""));
  if (!m) return null;
  const h = +m[1], mi = +m[2], ap = m[3] ? m[3].toUpperCase() : "";
  if (mi > 59 || (ap ? h < 1 || h > 12 : h > 23)) return null;
  return ((ap ? h % 12 + (ap === "P" ? 12 : 0) : h) * 60) + mi;
}
const hhmmss = t => `${hhmm(t)}:${pad(t % 60)}`;
const PAUSED = "No connection. Controls are paused.";
const WAIT = "Waiting for CraftBeerPi to answer.";
/* held before the boil, CraftBeerPi takes NEXT as "start the boil" (StepController.next, with nothing active), which would
   put heat on with two taps, so NEXT STEP is greyed and says how to start it */
const HELD_NEXT = "The boil is waiting for you. To start it, hold START here or START THE BOIL at the top.";
/* a recipe with nothing running and nothing stopped: CraftBeerPi takes NEXT as START (StepController.next), which would put
   heat on with two taps, and the screen would say "Skipped to …" untruly. So NEXT STEP is greyed, as before a held boil */
const NOT_BEGUN = s => `${s.n} hasn't started yet. To begin it, hold START.`;
const LONG_Q = 140; // characters: longer questions are the sparge's (about 200) and the boil's (300); the rest are 125 or under
/* the title bar's name: the BREWERY_NAME setting, at every width, so the rig and a simulator can't be taken for each other.
   Blank shows CraftBeerPi. Two lines at most, then an ellipsis (the CSS); a name of more than LONG_NAME characters is drawn
   smaller, with its title giving it whole. The page's title starts with it, as a browser's tab shows the start of it */
const LONG_NAME = 24;
const NO_NAME = "CraftBeerPi";
/* BREWSCRIBE, the last tab: BrewScribe
   in a browser tab of its own, named "brewscribe" so every press goes back to that one, at #now so going back doesn't
   reload it and loses nothing typed. Not rel="noopener": with it, every press opens another. Shown only where BrewScribe
   is installed: CraftBeerPi then has /brewscribe/, which answers a HEAD with anything but 404 (it answers 405). The screen
   asks as it connects and when the connection comes back, and the device remembers the answer, so the tabs don't move
   each time the screen opens */
const BS_KEY = "cbpi.brewday.brewscribe";
const bsTab = demo => `<a href="${demo ? "#tab" : "/brewscribe/#now"}"${demo ? "" : ' target="brewscribe"'} data-tab="BrewScribe" class="ext"><span class="lbl">Brew<wbr><span class="nw">Scribe<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg></span></span><span class="sr"> (opens in its own tab)</span></a>`;
const ICON = {
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1.5h16V16l-2-3.5V8a6 6 0 0 0-6-6zm-2.5 17a2.5 2.5 0 0 0 5 0z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8 23 21.5H1z"/><path d="M12 8.5v6M12 17.5v.5" stroke="#6e1414" stroke-width="2.6" stroke-linecap="round"/></svg>',
  wait: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="4.2 3.2"/></svg>'
};
const LAYOUT = "b"; // the mockup's layout B (D3)
const ACTS = ["hltEl", "hltPump", "wortPump", "bkEl"];
/* a moment's seconds since its local midnight, and its local date: always of a time given, CraftBeerPi's (brewNow), so
   nothing on Brew Day reads the PC's clock for a time it shows (DESIGN.md, The One Clock Rule) */
const daySeconds = d => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
const ymdOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pctOf = (left, min) => Math.max(0, Math.min(100, Math.round(100 * (1 - left / (min * 60)))));
const EVENTS_KEY = "cbpi.brewday.events";
const EVENTS_KEEP_MS = 12 * 3600 * 1000;
const LOST = "Connection to CraftBeerPi lost";
const EXPECT_MS = 3000;
// The websocket's own "server down" and "connected" messages (data/websocket.js): the screen shows the
// connection itself.
const OWN_ALERTS = new Set(["1", "2"]);
// How long the screen says "Connecting…" calmly before a page that has never connected turns red.
const CONNECTING_MS = 5000;
// CraftBeerPi's routine step notices: the event line already says these in its own words.
const ROUTINE = /^(?:timer started|step finished|boiling completed)$/i;
const WAITING_FOR_YOU = "WAITING FOR YOU";
/* the timers: four at most, as the server keeps them. TPRE: the editor's minutes; TMINS the most minutes a timer's own
   time has, and TSECS what its SECONDS keys take off or add. The names to pick are CraftBeerPi's
   BREWDAY_TIMER_NAMES, sent with the timers as `names`. TNAMES is its default, which the demo offers; TNLEN a name's
   length; TNMAX how many buttons the editor has room for: two rows of three */
const TMAX = 4, TPRE = [5, 10, 15, 20, 30, 60], TMINS = 300, TSECS = 5;
/* a removed timer can be put back for TUNDO real seconds, as CraftBeerPi offers it (TimersController.UNDO_FOR); CraftBeerPi
   keeps it 2 s more for an UNDO still on its way (UNDO_GRACE) */
const TUNDO = 5;
const TNAMES = ["Hop stand", "Yeast", "Vorlauf"], TNLEN = 24, TNMAX = 6;
const tfmt = DEMO.tfmt;
// SOUND, for the timers and CraftBeerPi's alerts, on this device only: the phone can stay quiet while the monitor beeps
const SOUND_KEY = "cbpi.brewday.sound";
// how CraftBeerPi words a timer's alarm (TimersController._finish), to know it before the timers' own message names it
const TIMER_RAN_OUT = /^The \d+(?::\d\d){1,2} timer has run out\.$/;

/* ---------- the screen's markup: the mockup's page, after layout B's moves ---------- */
const MORE = [["#/dashboard", "Dashboard"], ["#/fermenterprofile", "Fermenter profile"], ["#/plugins", "Plugins"], ["#/system", "System"], ["#/about", "About"]];
/* page: "" the brew-day screen; "settings", "hardware", "recipes", "brewsteps" or "figures", its frame (title bar, last
   event, tabs) round the Settings, Hardware, Recipe Book, Brew Steps or Figures page, whose host (#sp) takes the
   brewhouse's place and which draws itself (settings/page.js, hardware/page.js, recipes/page.js, figures/page.js) */
const PAGE_TAB = {settings: "Settings", hardware: "Hardware", recipes: "Recipe Book", brewsteps: "Brew Steps", figures: "Figures"};
function skeleton(demo, page) {
  const h = p => demo ? "#tab" : p;
  const cur = t => (PAGE_TAB[page] || "") === t ? ' aria-current="page"' : "";
  return `<div class="app" id="app" data-link="ok">
  <header class="topbar">
    <p class="brand"><span class="bname">CraftBeerPi Brewery</span></p>
    <div class="banner" id="banner" data-tone="ok"></div>
    <section class="phbox" id="ph-box" aria-labelledby="ph-t" hidden></section>
    <p class="link" id="link" data-link="ok"><i aria-hidden="true"></i><span id="link-t">Connected</span></p>
    <button class="alloff" id="alloff" data-cmd="alloff" type="button">ALL OFF</button>
    <p class="clock" id="clock">14:32</p>
    <section class="spdbox" id="spd-box" role="dialog" aria-labelledby="spd-t" hidden></section>
  </header>

  <section class="status" aria-label="Alarms and the last event">
    <div class="event" id="event"></div>
  </section>

  <nav class="tabs" aria-label="Screens">
    <a href="${h("#/")}" data-tab=""${cur("")}>Brew day</a>
    <a href="${h("#/mashprofile")}" data-tab="Brew Steps"${cur("Brew Steps")}><span class="long">Brew steps</span><span class="short">Steps</span></a>
    <a href="${h("#/recipes")}" data-tab="Recipe Book"${cur("Recipe Book")}><span class="long">Recipe book</span><span class="short">Recipes</span></a>
    <a href="${h("#/figures")}" data-tab="Figures"${cur("Figures")}>Figures</a>
    <a href="${h("#/hardware")}" data-tab="Hardware"${cur("Hardware")}>Hardware</a>
    <a href="${h("#/settings/All")}" data-tab="Settings"${cur("Settings")}>Settings</a>
    <a href="${h("#/more")}" data-tab="More"${demo ? "" : ' aria-haspopup="true" aria-expanded="false" aria-controls="bd-more"'}>More</a>
  </nav>

  ${page ? `<div class="sp-host" id="sp"></div>` : `<main class="main">
    <aside class="recipe" id="recipe" aria-label="Recipe"></aside>
    <section class="brewhouse" aria-label="Brewhouse">
      <div class="now" id="now"></div>
      <div class="plates" id="plates"></div>
      <div class="rig" id="rig"></div>
    </section>
  </main>`}
</div>
${demo ? "" : `<ul class="moremenu" id="bd-more" aria-label="More screens" hidden>${MORE.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul>\n`}<div class="toast" id="toast" role="status" hidden></div>
<p class="sr" id="sr" aria-live="polite"></p>
<p class="sr" id="sr-alert" role="alert"></p>`;
}

/* ---------- patching a region in place ---------- */
// Same result as setting innerHTML, but an element that is still there keeps its identity: its focus, the
// "holding" class of a press in progress, and what is being typed into it.
function morph(el, html) {
  const t = document.createElement("template");
  t.innerHTML = html;
  patchChildren(el, t.content);
}
function patchChildren(from, to) {
  const olds = Array.from(from.childNodes), news = Array.from(to.childNodes);
  news.forEach((n, i) => {
    const o = olds[i];
    if (!o) from.appendChild(n);
    else if (o.nodeType === n.nodeType && o.nodeName === n.nodeName && (o.nodeType !== 1 || (o.id === n.id && o.getAttribute("data-cmd") === n.getAttribute("data-cmd")))) patchNode(o, n);
    else from.replaceChild(n, o);
  });
  for (let i = news.length; i < olds.length; i++) olds[i].remove();
}
function patchNode(o, n) {
  if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
  const held = hold && hold.el === o;
  for (const {name} of Array.from(o.attributes)) if (!n.hasAttribute(name) && !(held && name === "class")) o.removeAttribute(name);
  for (const {name, value} of Array.from(n.attributes)) {
    const v = held && name === "class" ? `${value} holding` : value;
    if (o.getAttribute(name) !== v) o.setAttribute(name, v);
  }
  if (held && !n.hasAttribute("class")) o.setAttribute("class", "holding");
  if (o.tagName === "INPUT" && o !== document.activeElement) { const v = n.getAttribute("value") ?? ""; if (o.value !== v) o.value = v; }
  patchChildren(o, n);
}
const setText = (el, s) => { if (el && el.textContent !== s) el.textContent = s; };

/* ---------- state ---------- */
// One screen at a time, as in the mockup: its state lives here. gen tells a command that finishes after the
// screen has gone (or been opened again) to keep its answer to itself.
let root = null, DEMO_MODE = false, opts = {}, gen = 0, PAGE = "";
let st, M, timers = [], noteTimers = {}, hold = null, toastT = 0, raf = 0, rigW = 0, rigRs = 1, teardown = () => {};
// heldOn: the recipe the hold that is running its command now began on (holdStart, recipeOn)
let heldOn = null;
let last = null, everConnected = false, book = [], bookBusy = false, bookAgain = false, bookShown = false;
/* every recipe name the Recipe Book has, for UNLOAD (inBook): null until it has been read, or when its read failed.
   bookFor: the loaded recipe (its steps) it was last read for */
let bookNames = null, bookFor = null;
/* the timers: tAns, a command's answer, newer than the websocket's last word until that catches up; tMsg, the word the
   screen counts from; lastBannerKey, the title bar's last alert, so a new one beeps once; actx, the page's sound; rangAt,
   when a timer's alarm last played (Date.now()) */
let tAns = null, tMsg = null, lastBannerKey = null, actx = null, rangAt = 0;
/* the title bar's beep: newIds, CraftBeerPi's messages that have just
   arrived, until the next render; openIds, the questions it was waiting on as this page first connected, which it sends
   the page then (kept for every page) and which haven't just arrived */
let newIds = new Set(), openIds = null;
/* the temperature graphs in the faceplates, always showing (the mockup's option A); ?graphs=none leaves
   them out. gSpan: the span the three show, kept on each device. H: the live history. */
let GRAPHS = "face", gSpan = "30", H = null;
const GSPAN_KEY = "cbpi.brewday.graphspan";
// the faceplates as last drawn: tight (platesTight), and the page scrolling under them (mainStacked)
let TIGHT = false, STACKED = false;
// the name in the title bar now (LONG_NAME): set again only when the setting changes; null as the screen opens
let brewery = null;
/* retick: the demo's tick started again at a new speed (createBrewDay). clockSeen: the topic "clock" as last seen */
let retick = () => {}, clockSeen = null;
const answered = new Set(), own = {};
const $ = s => root.querySelector(s);
function setBrewery(raw) {
  const name = String(raw ?? "").trim() || NO_NAME;
  const el = root && root.querySelector(".brand"), nm = el && el.querySelector(".bname");
  if (!nm || name === brewery) return;
  brewery = name;
  nm.textContent = name;
  el.toggleAttribute("data-long", name.length > LONG_NAME);
  if (name.length > LONG_NAME) el.title = name; else el.removeAttribute("title");
  document.title = `${name} · ${PAGE_TAB[PAGE] || "Brew day"}`;
}
function showBrewScribe(on) {
  const nav = root && root.querySelector(".tabs"), tab = nav && nav.querySelector('a[data-tab="BrewScribe"]');
  if (!nav || !!tab === !!on) return;
  if (on) nav.insertAdjacentHTML("beforeend", bsTab(DEMO_MODE)); else tab.remove();
}
function probeBrewScribe() {
  const g = gen;
  fetch("/brewscribe/", {method: "HEAD", cache: "no-store"}).then(r => {
    // 401 and 403 can't tell: CraftBeerPi asking for a login answers them for any address
    if (g !== gen || !root || r.status === 401 || r.status === 403) return;
    const on = r.status !== 404;
    try { localStorage.setItem(BS_KEY, on ? "1" : "0"); } catch (e) { /* private mode: asked again next time */ }
    showBrewScribe(on);
  }, () => { /* no answer: as it was */ });
}
// Temperatures in CraftBeerPi's own words follow its unit's sign: "170 F" -> "170 °F".
const ut = s => unitText(s, M.U);
const connecting = () => !DEMO_MODE && !everConnected && Date.now() - st.openedAt < CONNECTING_MS;
const hermsOn = () => M.HERMS !== false && st.v.mt.mode === "auto";
const noVessel = v => `CraftBeerPi has no ${M.VNAME[v].toLowerCase()} set up.`;

/* a running kettle logic owns its actors; the mash tun's PID_HERMS owns the HLT element and the wort pump */
function applyLocks() {
  const {a, v} = st;
  a.hltEl.by = v.mt.mode === "auto" ? "mt" : v.hlt.mode === "auto" ? "hlt" : null;
  a.wortPump.by = v.mt.mode === "auto" ? "mt" : null;
  a.bkEl.by = v.bk.mode === "auto" ? "bk" : null;
  a.hltPump.by = null;
}
function lockWhy(id) {
  return st.a[id].by === "mt"
    ? "The mash tun's AUTO runs the HLT element and the wort pump for the HERMS. Switch the mash tun to MANUAL to take them over."
    : "AUTO runs this element. Switch this vessel to MANUAL to control it by hand.";
}
function b(cls, label, small, o = {}) {
  const dis = !!o.why, h = o.hold && !dis;
  return `<button type="button" class="${cls}"${o.label ? ` aria-label="${esc(o.label)}"` : ""}${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ""}${o.expanded != null ? ` aria-expanded="${o.expanded}"` : ""}${o.controls ? ` aria-controls="${o.controls}"` : ""}${o.cmd ? ` data-cmd="${esc(o.cmd)}"` : ""}${h ? " data-hold" : ""}${dis ? ` aria-disabled="true" data-why="${esc(o.why)}"` : ""}>${h ? '<span class="fill"></span>' : ""}<span class="lb">${label}</span>${small ? `<small>${small}</small>` : ""}</button>`;
}

/* ---------- faceplates ---------- */
function lampHTML(id) {
  const A = M.ACT[id], a = st.a[id], pend = st.pend["a:" + id], lost = st.link === "lost";
  const locked = !!a.by && !a.failed;
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = A.name + " · waiting for CraftBeerPi"; }
  /* trying a failed "on" again is still a held press for heat */
  else if (a.failed) { h = a.failed === "on" && A.kind === "heat"; s = "failed"; t = a.on ? "DID NOT STOP" : "DID NOT START"; n = `${A.name} · still ${a.on ? (A.kind === "pump" ? "running" : "heating") : "off"} · ${h ? "hold" : "tap"} to try again`; }
  /* HEATING, without the element's power, which the graph and the faceplate's OUT already show. Layout A has no OUT and
     no graphs, so there the button is the only place the power shows, and it keeps it */
  else if (a.on) { s = A.kind === "heat" ? "heating" : "running"; t = A.kind === "heat" ? (LAYOUT === "a" && !(id === "bkEl" && M.BKNEW) ? `HEATING ${a.pct} %` : "HEATING") : "RUNNING"; n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : A.kind === "heat" ? " · tap to turn off" : " · tap to stop"); }
  else { s = "off"; t = "OFF"; if (A.kind === "heat" && !locked) { h = true; n = A.name + " · hold to turn on"; } else n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : " · tap to start"); }
  const why = lost ? PAUSED : pend ? WAIT : locked ? lockWhy(id) : "";
  const hh = h && !why;
  return `<button type="button" class="lamp${locked ? " locked" : ""}" data-state="${s}" data-cmd="act:${id}"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
function modeHTML(v) {
  const V = st.v[v], pend = st.pend["m:" + v], auto = V.mode === "auto";
  const off = st.link === "lost" ? PAUSED : pend ? WAIT : V.missing ? noVessel(v) : "";
  const lockA = v === "hlt" && hermsOn() ? "The mash tun's AUTO is driving the HLT element for the HERMS. Turning on the HLT's own AUTO would fight it." : "";
  const aBtn = auto
    ? b("", "AUTO", pend ? "" : "", {pressed: true, cmd: "noop", why: off})
    : b("", "AUTO", pend === "auto" ? "switching…" : lockA ? "mash tun in charge" : "hold to start", {pressed: false, cmd: `mode:${v}:auto`, hold: true, why: off || lockA});
  const mBtn = auto
    ? b("", "MANUAL", pend === "manual" ? "switching…" : "tap to stop AUTO", {pressed: false, cmd: `mode:${v}:manual`, why: off})
    : b("", "MANUAL", "", {pressed: true, cmd: "noop", why: off});
  return `<div class="seg" role="group" aria-label="${M.VNAME[v]} mode">${aBtn}${mBtn}</div>`;
}
/* the HERMS sets the HLT's target anywhere up to the mash target plus DeltaTemp (PIDHerms), not always to it. AUTO with no
   target (unset, 0 or below) runs but holds nothing, so TARGET's hint says "set SV" in Prompt Amber, as the line does */
function tgtHTML(v) {
  const by = v === "hlt" && hermsOn(), pend = st.pend["t:" + v], none = !by && !bkNew(v) && noTarget(v);
  const why = st.link === "lost" ? PAUSED : by ? `The mash tun sets this target while it runs the HERMS: up to its own target plus ${M.HERMS_DELTA} ${M.U}.` : pend ? WAIT : st.v[v].missing ? noVessel(v) : "";
  return b(none ? "tgtbtn notgt" : "tgtbtn", "TARGET", by ? "set by mash tun" : pend ? "sending…" : none ? "set SV" : bkNew(v) ? "change" : "change SV", {cmd: `tgt:${v}`, why});
}
const noTarget = v => st.v[v].mode === "auto" && st.v[v].sv == null;
/* The boil power button: the boil element's power can be changed at any time, even while a recipe runs.
   Only for a boil kettle whose logic declares set_boil_power (live.js BOILPOWER; on the rig, the boil kettle). It
   sits beside the element it governs and works at any time: no step locks it. In AUTO it sets the logic's Boil_Power,
   used from the boil threshold up; in MANUAL it sets the element's own level, used when it is on by hand.
   Changing it is a tap on SET, like a target: it changes a level, it never switches heat on. */
// Where BoilPower starts using the boil power. The new BoilPower (0.0.3.post7 on; M.BKNEW, as it declares set_boil_at) keeps
// it apart, in its Boil_Threshold setting (BOIL AT; st.v.bk.boilAt), and the kettle's target is an ordinary target, BOIL or
// a temperature to hold. An older one counts from the kettle's target when it has one, else from Boil_Threshold
// (M.BOIL_TH; live.js boilThreshold). The mockup's boilFrom, with BK === "power" for M.BKNEW.
const boilFrom = () => M.BKNEW ? st.v.bk.boilAt ?? M.BOIL_TH : st.v.bk.sv > 0 ? st.v.bk.sv : M.BOIL_TH;
const boilTh = () => +boilFrom().toFixed(1);
/* ---------- the boil kettle with the new BoilPower (the mockup's ?bk=power; design/brewday/BUILD-NOTES.md, "The boil
   kettle's target, KEEP BOILING and a forgotten pause"). It works
   like the HLT, plus BOIL: TARGET beside AUTO/MANUAL, and its box has a BOIL key. While the target is BOIL the green number
   is the boil power, and the number is its button; a target below the boil is a temperature to hold, and reads like the
   HLT's. In AUTO the element button pauses the heat for a boil-over, −5 % and +5 % sit either side of it, and KEEP
   BOILING says whether full power comes back if the wort falls below a boil. ---------- */
const bkNew = v => v === "bk" && !!M.BKNEW;
/* BoilPower lets go of a boil 2 °C / 3.6 °F below the boil point (BOIL_EXIT_DROP_C), with Keep_Boiling "Yes"; the same
   margin is where its targets stop being BOIL (bkHoldT). The mockup's BOIL_MARGIN, in the unit's degrees. */
const margin = () => M.U === "°C" ? 2 : 3.6;
const bkLetGo = () => +(boilFrom() - margin()).toFixed(1);
/* the temperature the boil kettle holds, or null while its target is BOIL: its own target when that is set and below BOIL */
const bkHoldT = () => { const V = st.v.bk; return M.BKNEW && V.sv > 0 && V.sv < bkLetGo() ? V.sv : null; };
const bkHolding = () => st.v.bk.mode === "auto" && bkHoldT() != null;
/* BoilPower's boil latch: set when the wort reaches the boil point; from then on the element runs at the boil power. The
   screen can't read it: live, it tells from the element running below full power while the wort is below the boil point
   (applyLive), as design/brewday/BUILD-NOTES.md says */
const bkLatched = () => { const V = st.v.bk; return V.mode === "auto" && bkHoldT() == null && (V.latched ?? V.pv >= boilFrom()); };
/* CraftBeerPi's clock (cbpi.api.clock), in its own seconds: the wall clock on the rig, SIM_TIME_SCALE times as fast on a
   simulator. Every time Brew Day shows is on it (DESIGN.md, The One Clock Rule): the title bar, LOG, the boil's pause,
   which BoilPower stamps on it (Paused_At), so every screen counts the same pause. A log window that reads no logs says
   where it is and how fast it runs: asked as the page opens, once a minute and again as the connection comes back, and
   counted on from the last answer at its speed. Null until the first answer: no other clock stands in for it. */
let bclk = null, bclkAt = 0, bclkBusy = false;
const BCLK_MS = 60000;
// until the first answer, asked again every 5 s while connected: one that failed (CraftBeerPi starting) leaves no clock
const BCLK_RETRY_MS = 5000;
export function brewNow() {
  return bclk ? bclk.srv + (Date.now() - bclk.at) / 1000 * bclk.scale : null;
}
/* how many of CraftBeerPi's seconds go by in a real second, as its clock last said: SIM_TIME_SCALE on a simulator, 1 on
   the rig and until it has said */
export const brewScale = () => bclk ? bclk.scale : 1;
async function syncBrewClock(now = false) {
  if (DEMO_MODE || bclkBusy || (!now && Date.now() - bclkAt < (bclk ? BCLK_MS : BCLK_RETRY_MS))) return;
  bclkAt = Date.now(); bclkBusy = true;
  const g = gen;
  let res = null;
  try { res = await api.logWindow([], null, null); } catch (e) { res = null; }
  if (g !== gen) return;
  bclkBusy = false;
  const d = res && res.ok && res.data;
  if (!d || typeof d !== "object" || !(num(d.now) > 0)) return;
  const first = !bclk;
  bclk = {srv: num(d.now), at: Date.now(), scale: num(d.scale) > 0 ? num(d.scale) : 1};
  if (first) clockKnown();
  schedule();
}
/* lines this page logged before CraftBeerPi first said where its clock is take their time from that answer, counted back
   by the real time since each (e[5]). "Connecting to CraftBeerPi" (e[5] 0) has none, and neither has a line kept from
   an earlier page that never had one: CraftBeerPi may have restarted since */
function clockKnown() {
  let changed = false;
  for (const e of st.events) {
    if (e[0] !== "" || !(e[5] >= st.openedAt)) continue;
    const d = new Date((bclk.srv + (e[5] - bclk.at) / 1000 * bclk.scale) * 1000);
    e[0] = hhmmss(daySeconds(d)); e[8] = ymdOf(d); changed = true;
  }
  if (changed) saveEvents();
}
/* the title bar's clock: CraftBeerPi's time of day (t), its date (day: weekday, day and month; ymd) and its speed, and
   whether that date isn't the screen's own (other); null while it isn't known. The demo's is a moment's st.t; a
   simulator's moment (st.sim) has its speed and a date of its own: day0 its date at st.t 0, pc the screen's */
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], MON3 = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_SAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], MON_SAY = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NO_TIME = "– –:– –";
/* every time of day the screen and its frame show (the title bar, LOG, the graphs, STARTS, BrewStart's box and words) by
   CLOCK_FORMAT (util/timefmt.js), as CraftBeerPi's settings last said it (applyLive): "7:00 AM", or "07:00" in 24-hour,
   as on a CraftBeerPi without the setting.
   The demo draws its mockup's: Brew Day's 12-hour unless ?clock=24, and the Settings mockup's 24-hour */
let clockFmt = settingsClockFormat(null);
const fmtNow = () => !DEMO_MODE ? clockFmt : PAGE === "settings" || opts.clock === "24" || opts.clock === TWENTY_FOUR_HOUR ? TWENTY_FOUR_HOUR : TWELVE_HOUR;
const is12 = () => fmtNow() === TWELVE_HOUR;
/* a time kept as CraftBeerPi keeps it, 24-hour ("07:00", "23:15:40"), shown by the setting, with its seconds where it
   has them; what isn't a time stays as it is */
const todS = x => { const s = String(x ?? ""); return formatTimeOfDay(s, {seconds: /^\s*\d{1,2}:\d{2}:\d{2}\s*$/.test(s), format: fmtNow()}) || s; };
/* a time on the screen's count of seconds (only the time of day counts), shown by the setting */
const daySec = t => ((Math.floor(t) % 86400) + 86400) % 86400;
const tod = (t, seconds = false) => todS(seconds ? hhmmss(daySec(t)) : hhmm(daySec(t)));
/* a length of time keeps to one line: its spaces are no-break spaces ("9 h 48 min") */
const nb = s => String(s).replace(/ /g, "\u00a0");
/* the title bar's time: the digits, then AM or PM at about half their size after a thin space (brewday.css .clock .ap);
   in 24-hour the digits alone */
const clockHTML = hm => { const p = timeParts(hm, {format: fmtNow()}); return !p ? NO_TIME : p.half ? `${p.digits}\u2009<span class="ap">${p.half}</span>` : p.digits; };
/* how many of CraftBeerPi's seconds go by in a real second: SIM_TIME_SCALE on a simulator, else 1 */
const SC = () => DEMO_MODE ? (st && st.sim ? st.sim.scale : 1) : bclk ? bclk.scale : 1;
/* the demo's date on CraftBeerPi's clock: a simulator's moment's own (sim.day0), else the mockup's, Friday 20 Nov 2026
   (DAY0), each at st.t 0 */
function demoDay(t) { const d = new Date(((st.sim && st.sim.day0) || DAY0) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + Math.floor(t / 86400)); return d; }
function clockNow() {
  if (DEMO_MODE) {
    const s = st.sim, d = demoDay(st.t), ymd = d.toISOString().slice(0, 10), day = {w: d.getUTCDay(), d: d.getUTCDate(), m: d.getUTCMonth()};
    if (!s) return {t: st.t, day, ymd, other: false, scale: 1};
    return {t: st.t, day, ymd, other: ymd !== s.pc, scale: s.scale};
  }
  const e = brewNow();
  if (e == null) return null;
  const d = new Date(e * 1000), ymd = ymdOf(d);
  return {t: daySeconds(d), day: {w: d.getDay(), d: d.getDate(), m: d.getMonth()}, ymd, other: ymd !== ymdOf(new Date()), scale: bclk.scale};
}
/* the clock where it isn't the screen's, or null: on another date than the screen's, or at another speed than 1×.
   LOG's lines say their date only then (logDate), and BrewStart's box has its tag only then (bsClockHTML) */
function clockTag() {
  const c = clockNow();
  return c && (c.other || c.scale !== 1) ? c : null;
}
/* a simulator: a CraftBeerPi running the cbpi4-simvessel plugin, with its SIM_TIME_SCALE in the settings (st.simCfg).
   The setting alone isn't enough: the rig's saved settings can keep it from when it ran the simulator plugin. Whether
   the plugin runs is asked once a page has loaded, as it first connects, and again when the connection comes back, as a
   plugin comes or goes with a restart (GET /plugin/list). Until it says so, and where it fails, is slow or doesn't list
   the plugin, there is no SPEED. simv: null until it has answered. The demo's simulator is a moment's st.sim */
let simv = null, simvBusy = false;
const SIMVESSEL = /^cbpi4[-_]simvessel$/i;
const isSim = () => DEMO_MODE ? !!(st && st.sim) : simv === true && !!st.simCfg;
function simvAsk() {
  if (DEMO_MODE || simvBusy) return;
  const g = gen;
  simvBusy = true;
  api.plugins().then(res => {
    simvBusy = false;
    if (!res.ok || !Array.isArray(res.data)) return;
    const on = res.data.some(p => p && SIMVESSEL.test(String(p.Name || "").trim()));
    if (on === simv) return;
    simv = on;
    if (g === gen && root && st) renderAll();
  });
}
/* SPEED's chooser: SIM_TIME_SCALE's usual speeds, with the one the clock runs at where that is another */
const SPEEDS = [1, 10, 30, 60];
const spdList = n => SPEEDS.includes(n) ? SPEEDS : [...SPEEDS, n].sort((x, y) => x - y);
/* this computer's date and time now, in the core's words for a moment on its clock (clock_controller.clock_time), "Sun
   22 Nov 9:02 PM", its time of day by CLOCK_FORMAT (todS): where a new speed starts CraftBeerPi's clock again
   (cbpi.api.clock.reset, core post63). The demo's is its moment's: sim.pc, at sim.pcT or 21:02:40 */
const spdPcT = () => st.sim.pcT != null ? st.sim.pcT : 21 * 3600 + 2 * 60 + 40;
function spdPc() {
  const day = (w, d, m) => `${tcase(DOW[w])} ${d} ${tcase(MON3[m])}`;
  if (DEMO_MODE) { const d = new Date(st.sim.pc + "T00:00:00Z"); return `${day(d.getUTCDay(), d.getUTCDate(), d.getUTCMonth())} ${tod(spdPcT())}`; }
  const d = new Date();
  return `${day(d.getDay(), d.getDate(), d.getMonth())} ${todS(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`;
}
const spdSay = () => `A new speed starts CraftBeerPi's clock again from this computer's time, ${spdPc()}.`;
const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';
/* the title bar's clock. Left of the time, one over the other: CraftBeerPi's date, always, on every CraftBeerPi and at
   every speed (its own date, where it isn't the screen's), on a quiet line with no box, so nothing about it looks
   pressable, and said to a screen reader; and on a simulator SPEED, a button that opens the chooser (spdDraw), there at
   1× too, so the speed can always be changed. A clock at another speed on a CraftBeerPi that isn't a simulator has its
   speed on the date line. On a phone both go under the time. Until CraftBeerPi has said where its clock is, the time's
   dashes alone. Drawn again only where they change, keeping the focus in them, as the time changes every second */
function clockSet() {
  const el = $("#clock");
  if (!el) return;
  const c = clockNow(), sim = !!c && isSim();
  if (!c) {
    if (el.dataset.sim) { el.removeAttribute("data-sim"); el._ct = el._cs = null; }
    if (el.innerHTML !== NO_TIME) el.innerHTML = NO_TIME;
    return;
  }
  const {day, scale: n} = c, fast = n === 1 ? "" : `, running ${n} times as fast`;
  const words = [`${DOW[day.w]} ${day.d} ${MON3[day.m]}`, !sim && n !== 1 ? `${n}× SPEED` : ""].filter(Boolean).join(" · ");
  const said = `CraftBeerPi's clock, ${DOW_SAY[day.w]} ${day.d} ${MON_SAY[day.m]}${sim ? "" : fast}`;
  const date = `<span class="cdl" aria-hidden="true">${words}</span><span class="sr">${said}</span>`;
  const sp = sim ? b("spd", `${n}×<span class="lg"> SPEED</span>${CHEV}`, "", {cmd: "spd:open", expanded: !!st.spdOpen, controls: "spd-box",
    label: `Simulator speed, ${n}×${fast}. Change it`, why: st.link === "lost" ? PAUSED : ""}).replace("<button ", '<button aria-haspopup="dialog" ') : "";
  const ct = clockHTML(hhmm(c.t)), cs = date + sp;
  if (el.dataset.sim !== "spd") { el.innerHTML = '<span class="ct"></span><span class="cs"></span>'; el.dataset.sim = "spd"; el._ct = el._cs = null; }
  if (el._ct !== ct) { el.querySelector(".ct").innerHTML = ct; el._ct = ct; }
  if (el._cs !== cs) {
    const w = el.querySelector(".cs"), a = document.activeElement, f = w.contains(a) ? a.dataset.cmd : null;
    w.innerHTML = cs; el._cs = cs;
    if (f) w.querySelector(`[data-cmd="${f}"]`)?.focus({preventScroll: true});
  }
}
/* the chooser SPEED opens: SIMULATOR SPEED set into its top edge, the speeds in the pressed look's row, the one
   CraftBeerPi runs at pressed, what a new one does to its clock, and CANCEL; under the title bar at its right */
function spdDraw() {
  const box = root && $("#spd-box");
  if (!box) return;
  const c = st.spdOpen && isSim() ? clockNow() : null;
  if (!c) { if (!box.hidden) { box.hidden = true; box.innerHTML = ""; box._h = null; } return; }
  const n = c.scale, P = st.spdPend, why = st.link === "lost" ? PAUSED : P ? WAIT : "";
  const html = '<h3 class="spdt" id="spd-t">SIMULATOR SPEED</h3>'
    + `<div class="seg spdsel" role="group" aria-label="Speeds">${spdList(n).map(v => b("", `${v}×`, "", {cmd: `spd:set:${v}`, pressed: v === (P || n), why: v === P ? "" : why})).join("")}</div>`
    + `<p class="spdsay">${P ? `Setting ${P}×: waiting for CraftBeerPi.` : esc(spdSay())}</p>`
    + `<div class="spdact">${b("cmdbtn", "CANCEL", "", {cmd: "spd:x", why: P ? WAIT : ""})}</div>`;
  if (box._h === html) return;
  const a = document.activeElement, f = box.contains(a) ? a.dataset.cmd : null;
  box.innerHTML = html; box._h = html; box.hidden = false;
  if (f) box.querySelector(`[data-cmd="${f}"]`)?.focus({preventScroll: true});
}
const spdFocus = sel => setTimeout(() => { if (root && st) $(sel)?.focus({preventScroll: true}); }, 0);
/* SPEED opens and closes the chooser, LOG's list closing (one at a time), focus on the speed pressed; CANCEL, Escape
   and a press outside close it, focus back on SPEED. A speed pressed is saved as SIM_TIME_SCALE (spdSetLive), its button
   pressed while it goes; once CraftBeerPi has set its clock back to this computer's time at that speed, the box closes
   (clockReset). The speed it runs at already changes nothing, and closes the box */
function spdCmd(x, y) {
  if (!isSim()) return;
  if (x === "open") { st.spdOpen = !st.spdOpen; if (st.spdOpen) st.logOpen = false; renderAll(); spdFocus(st.spdOpen ? '#spd-box [aria-pressed="true"]' : '#clock [data-cmd="spd:open"]'); return; }
  if (x === "x") return spdClose();
  const c = clockNow();
  if (x !== "set" || !c || st.spdPend != null || st.link === "lost") return;
  const v = +y;
  if (!(v > 0)) return;
  if (v === c.scale) return spdClose();
  if (!DEMO_MODE) return spdSetLive(v);
  /* the demo: CraftBeerPi's answer a moment later. Its clock starts again from the moment's computer time on the
     computer's date; LOG's earlier lines keep the dates they were logged on, and the graphs start again from now, as the
     core archives the sensor logs written ahead of the clock */
  st.spdPend = v; renderAll();
  timers.push(setTimeout(() => {
    if (!st || !st.sim) return;
    const was = st.sim.scale;
    st.events.forEach(e => { if (!e[8]) e[8] = st.sim.day0; });
    st.spdPend = null;
    st.sim = Object.assign({}, st.sim, {scale: v, day0: st.sim.pc});
    st.t = spdPcT();
    if (st.hist) { ["hlt", "mt", "bk"].forEach(k => { const r = st.hist.v[k], l = r[r.length - 1]; st.hist.v[k] = l ? [[st.t - 10, ...l.slice(1)], [st.t, ...l.slice(1)]] : []; }); st.hist.start = st.t - 10; st.hist.steps = []; }
    const said = `CraftBeerPi's clock is back to this computer's time, ${spdPc()}, now running ${v}× (was ${was}×).`;
    logEvent(`Clock: ${said}`, "from CraftBeerPi", "");
    say(said);
    spdDone();
    retick();
  }, 700));
}
function spdClose() {
  if (st.spdPend != null || !st.spdOpen) return;
  st.spdOpen = false; renderAll();
  spdFocus('#clock [data-cmd="spd:open"]');
}
/* the speed set: the box closes, and focus goes back to SPEED where it was in the box */
function spdDone() {
  const was = st.spdOpen;
  st.spdOpen = false; renderAll();
  if (was) spdFocus('#clock [data-cmd="spd:open"]');
}
/* a speed pressed, live: saved as SIM_TIME_SCALE as the Settings page saves it. cbpi4-simvessel then has CraftBeerPi
   set its clock back to this computer's time at the new speed, which tells every screen (the topic "clock",
   clockReset) and says so in a notice LOG shows as any other. No answer in 5 s, or a refusal: as any command, LOG says
   it failed, and the box stays. A CraftBeerPi that saves the speed without setting its clock back tells no screen: after
   SPD_WAIT_MS the clock is asked for again and the box closes, LOG saying the speed was set */
const SPD_WAIT_MS = 5000;
let spdWaitT = 0;
async function spdSetLive(v) {
  const g = gen;
  st.spdPend = v; renderAll();
  const res = await api.setting("SIM_TIME_SCALE", v);
  if (g !== gen || !st || st.spdPend !== v) return;
  if (!res.ok) {
    const w = failWhy(res);
    st.spdPend = null;
    logEvent(`Simulator speed ${v}×`, "failed: " + w, "bad");
    say(`Simulator speed ${v}×: failed, ${w}.`, true);
    renderAll();
    return;
  }
  clearTimeout(spdWaitT);
  spdWaitT = setTimeout(() => {
    if (g !== gen || !st || st.spdPend !== v) return;
    st.spdPend = null;
    logEvent(`Simulator speed ${v}×`, "confirmed", "ok");
    say(`Simulator speed ${v}×: confirmed`);
    syncBrewClock(true);
    spdDone();
  }, SPD_WAIT_MS);
  timers.push(spdWaitT);
}
/* CraftBeerPi's clock set back to the computer's time (the topic "clock"): where it is and how fast it runs from now
   on, and a speed pressed here is done */
function clockReset(c) {
  const now = num(c.now), sc = num(c.scale);
  if (now > 0) {
    const first = !bclk;
    bclk = {srv: now, at: c.received || Date.now(), scale: sc > 0 ? sc : 1}; bclkAt = Date.now();
    if (first) clockKnown();
  }
  if (st.spdPend != null) { clearTimeout(spdWaitT); st.spdPend = null; spdDone(); } else renderAll();
}
/* while the title bar adds a date or a speed, a LOG line from another of CraftBeerPi's days says its date, as
   "26 Nov 11:58:40 PM" (e[8]: CraftBeerPi's date as the line was logged). A line kept from a build before has none, and
   shows none; the demo's own lines are on its moment's first day. On the rig LOG shows times alone */
function logDate(e) {
  const g = clockTag(), on = e[8] || (DEMO_MODE && st.sim ? st.sim.day0 : null);
  if (!g || !on || on === g.ymd) return "";
  const [, m, d] = on.split("-").map(Number);
  return `${d} ${MON_SAY[m - 1].slice(0, 3)} `;
}
function pausedFor() {
  const el = st.a.bkEl, now = DEMO_MODE ? st.t : brewNow();
  return now == null || el.pausedAt == null ? 0 : Math.max(0, Math.floor(now - el.pausedAt));
}
/* the new MANUAL (M.BKHAND: BoilPower 0.0.3.post13 on): by hand the boil element heats at the boil power. The level it
   heats at by hand: the element's own (manual_power), which BoilPower keeps at the boil power while AUTO isn't running,
   so the screen never shows a level it won't heat at; the demo's element runs at its boil power */
const bkHand = () => !!M.BKHAND && st.v.bk.mode !== "auto";
const handLvl = () => DEMO_MODE ? st.v.bk.bp : st.a.bkEl.lvl;
/* the line under the boil kettle's window */
function bkLine() {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT(), U = M.U;
  if (V.mode !== "auto") {
    const w = byHand("bk");
    if (w) return byHandLine("bk", w);
    /* the new MANUAL: by hand the element runs at the boil power, so the line says at what. A boil kettle boiling by
       hand needs no caution (The By Hand Rule) */
    if (M.BKHAND) return el.on ? `Heating by hand at ${handLvl()} %` : `MANUAL · heats at ${handLvl()} % by hand`;
    return "MANUAL · element by hand";
  }
  /* a forgotten pause would quietly stop the boil, so the line counts it, in Prompt Amber like the button */
  if (el.paused) return `<span class="warn">Heat paused for <span id="pz">${mmss(pausedFor())}</span></span>`;
  /* a hold is a target like the HLT's, and from BoilPower 0.0.3.post8 a PID holds it as the HLT's PID holds its own, so
     its line reads exactly like the HLT's. The element can be off just below the target while the wort still rises, and
     comes back on as the rise slows, so the line doesn't say where it heats again */
  if (ho != null) {
    const d = ho - V.pv;
    if (Math.abs(d) < 0.3) return "At target";
    const eta = GRAPHS ? graphETA(G(), "bk") : "";
    return (d > 0 ? `${d.toFixed(1)} ${U} below target` : `${(-d).toFixed(1)} ${U} above target`) + (eta ? ` · ${eta}` : "");
  }
  if (V.pv >= boilFrom()) return "Boiling";
  /* still at the boil power below the boil point: say what happens next, or that it won't */
  if (bkLatched()) return V.keep !== false ? `Below a boil · full power at ${bkLetGo()} ${U}`
    : `Not boiling · ${(boilFrom() - V.pv).toFixed(1)} ${U} below ${boilTh()} ${U}`;
  const eta = GRAPHS ? graphETA(G(), "bk") : "";
  return "Full power until it boils" + (eta ? ` · ${eta}` : "");
}
/* BoilPower's output in a hold. From 0.0.3.post8 (M.BKNEW) a PID sets it: 14 % for each °F short, up to 100 %, plus
   what its integral has built up
   near the target, less a brake on the wort's rise. For the demo, the first moment: a hold just begun has built up
   nothing, so it starts at 14 % a °F short (52 % at 3.7 °F, the plugin's first pass on the simulators' kettle). One
   already running (running) has built up about what the kettle loses where it holds, 21 % at 150 °F and 26 % at 170 °F
   on the simulators' kettle, so it carries on from that, a little past the target too. An older BoilPower
   (_hold_climb_power): full power from 7.2 °F below, easing to Hold_Power (30 %) at the hold, off at or above it; inside
   3.6 °F it only carries on heating (running: it was heating), so a fresh start there rests. For the demo, in °F. */
function holdOut(T, pv, running) {
  const below = T - pv;
  if (M.BKNEW) return Math.round(Math.min(100, Math.max(0, 14 * below + (running ? Math.max(0, 21 + (T - 150) / 4) : 0))));
  if (below >= 7.2) return 100;
  if (below <= 0 || (below <= 3.6 && !running)) return 0;
  return Math.trunc(30 + 70 * below / 7.2);
}
/* ending a pause (carrying on, MANUAL, ALL OFF) also takes CraftBeerPi's forgotten-pause warning down (demo) */
function endPause() {
  const el = st.a.bkEl;
  el.paused = false; el.pauseWarned = false;
  if (st.banner && st.banner.pausegt) st.banner = null;
  questionGone(DEMO.pauseBanner().title, "no longer needed");
}
function powerHTML() {
  const V = st.v.bk, el = st.a.bkEl, auto = V.mode === "auto", pend = st.pend["p:bk"];
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : !auto && el.missing ? "CraftBeerPi has no boil element set up." : "";
  return b("tgtbtn pwrbtn", auto ? `BOIL POWER ${V.bp} %` : `POWER ${el.lvl} %`,
    pend ? "sending…" : auto ? `used from ${boilTh()} ${M.U} · change` : "used by hand · change",
    {cmd: "pwr:bk", why, expanded: !!st.edit && st.edit.kind === "pwr"});
}
/* the new boil kettle's boil power, in its window while the target is BOIL: the green number is the setting, so it is the
   button that opens the power box (TARGET sits beside AUTO/MANUAL). Framed like the graph's chosen span, with a
   small "change" like every other button's, so it reads as a control. Its tap area is at least 44 px tall. In the new
   MANUAL it is the level the element heats at by hand, the boil power, read as HAND (svCell) */
function boilReadHTML() {
  const V = st.v.bk, pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hand = bkHand(), p = hand ? handLvl() : V.bp;
  return `<button type="button" class="svbtn" data-cmd="pwr:bk" aria-expanded="${!!st.edit && st.edit.kind === "pwr"}" aria-label="${hand ? `Power by hand ${p} percent, the boil power` : `Boil power ${p} percent`}: change"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="svv">${p}<span class="u">%</span></span><small>${pend === "set" ? "sending…" : "change"}</small></button>`;
}
/* the new boil kettle's TARGET box: the HLT's, plus BOIL, so a target of 170 °F holds there, as on the HLT. Anything
   from the boil point less the margin up is BOIL, so the steps run …205.6, 206.5, BOIL, and a
   typed 212 is BOIL too; BOIL is the top, so + is refused there. SET BOIL sends the boil point as the target. The third
   row: BOIL, pressed while the box says BOIL, and BOIL POWER, the second way to the power box. */
function bkTgtEditorHTML() {
  const val = st.edit.val, boil = val >= bkLetGo(), x = boil ? "BOIL" : val.toFixed(1);
  const top = boil ? "BOIL is the top. BOIL AT, under BOIL POWER, sets where the boil starts." : "";
  const key = (d, l) => `<button type="button" data-cmd="tstep:${d}" aria-label="${l}"${d > 0 && top ? ` aria-disabled="true" data-why="${esc(top)}"` : ""}>${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  return `<div class="editor bktgt" role="group" aria-label="New target for the boil kettle">
    ${key(-1, "Down 1 degree")}${key(-0.1, "Down 0.1 degree")}
    <input id="tin" inputmode="decimal" value="${x}" aria-label="New target in ${M.U}, or BOIL">
    ${key(0.1, "Up 0.1 degree")}${key(1, "Up 1 degree")}
    <button type="button" class="ok" data-cmd="tset">SET <span id="tok">${boil ? "BOIL" : `${x} ${M.U}`}</span></button><button type="button" class="no" data-cmd="tcancel">CANCEL</button>
    <button type="button" class="tboil" data-cmd="tboil" aria-pressed="${boil}">BOIL<small>full power to ${boilTh()} ${M.U}</small></button><button type="button" class="tpwr" data-cmd="pwr:bk">BOIL POWER<small>change</small></button></div>`;
}
/* the boil power's one-tap steps either side of the element button while AUTO boils, in the power
   box's order, −5 −1 … +1 +5. One tap sends set_boil_power; a step that would pass 0 or 100 % stops there, and only at the
   end itself is the button refused. */
function nudgeHTML(d) {
  const V = st.v.bk, pend = st.pend["p:bk"], p = bkHand() ? handLvl() : V.bp;
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : d < 0 && p <= 0 ? "The boil power is already 0 %." : d > 0 && p >= 100 ? "The boil power is already 100 %." : "";
  /* waiting for CraftBeerPi, all four are greyed and the one pressed shows the lamps' marching stripes; the wait is kept
     under the step itself, so −5 and −1 can't both look pressed. The spoken name says "percent" */
  return b(`cmdbtn nudge${pend === String(d) ? " sending" : ""}`, `${d < 0 ? "−" : "+"}${Math.abs(d)} %`, "",
    {cmd: `pnudge:${d}`, why, label: `Boil power ${d < 0 ? "down" : "up"} ${Math.abs(d)} percent`});
}
/* the element button in AUTO: not locked, a tap pauses the heat (set_paused) and keeps AUTO, the recipe and the boil power;
   PAUSED, in Prompt Amber, heats again with a held press, like any heat. In MANUAL it is the usual element button; in the
   new MANUAL, between the steps, narrow as in AUTO (bkHandLampHTML) */
function bkLampHTML() {
  const a = st.a.bkEl, V = st.v.bk, pend = st.pend["a:bkEl"], name = M.ACT.bkEl.name;
  if (V.mode !== "auto" && M.BKHAND && bkNudges() && !TIGHT && !a.failed) return bkHandLampHTML();
  if (V.mode !== "auto" || (a.failed && !pend)) return lampHTML("bkEl");
  /* between the boil power's four steps the button is narrow, so its name is left to the faceplate's title (it is the
     boil kettle's only element) and kept for screen readers; the line says only what a press does. Waiting for
     CraftBeerPi there, it keeps its state word, as the steps keep theirs, and the line says what is on its way:
     PAUSING… needs 75 px and the button has 63 at 1366 px, and a word that wrapped would make all three faceplates'
     rows taller for that moment. With the steps in a row of their own (TIGHT) it has the row to itself, as in MANUAL */
  const narrow = bkNudges() && !TIGHT, nm = narrow ? `<span class="sr">${name} · </span>` : `${name} · `;
  let s, t, n, cmd, h = false;
  if (pend && narrow) { s = "pending"; t = a.paused ? "PAUSED" : a.on ? "HEATING" : "OFF"; n = nm + ({pause: "pausing…", resume: "heating…"}[pend] || "waiting…"); cmd = "noop"; }
  else if (pend) { s = "pending"; t = pend === "pause" ? "PAUSING…" : pend === "resume" ? "CARRYING ON…" : pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = nm + "waiting for CraftBeerPi"; cmd = "noop"; }
  else if (a.paused) { s = "paused"; t = "PAUSED"; n = nm + "hold to heat"; cmd = "pause:off"; h = true; }
  else { s = a.on ? "heating" : "off"; t = a.on ? "HEATING" : "OFF"; n = nm + "tap to pause"; cmd = "pause:on"; }
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hh = h && !why;
  return `<button type="button" class="lamp" data-state="${s}" data-cmd="${cmd}"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
/* the element in the new MANUAL, narrow between the steps as in AUTO: its name left to the faceplate's title and kept for
   screen readers, the line saying only what a press does. Switching it on by hand is heat, so held */
function bkHandLampHTML() {
  const a = st.a.bkEl, pend = st.pend["a:bkEl"], nm = `<span class="sr">${esc(M.ACT.bkEl.name)} · </span>`;
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = a.on ? "HEATING" : "OFF"; n = nm + (pend === "on" ? "heating…" : "stopping…"); }
  else if (a.on) { s = "heating"; t = "HEATING"; n = nm + "tap to turn off"; }
  else { s = "off"; t = "OFF"; n = nm + "hold to turn on"; h = true; }
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hh = h && !why;
  return `<button type="button" class="lamp" data-state="${s}" data-cmd="act:bkEl"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
/* the steps show while the boil power is what the element heats at: in AUTO, not while it holds a temperature, and in the
   new MANUAL, where the element runs at the boil power by hand too, with a target to hold as well (MANUAL doesn't use the
   target, and the line, element off, or OUT, heating, shows the level they change). Not in MANUAL with an older
   BoilPower, where they would seem to set the element's own level, nor while the boil kettle's box is open, which has
   steps of its own */
const bkNudges = () => !!M.BKNEW && (st.v.bk.mode === "auto" ? !bkHolding() : !!M.BKHAND) && !(st.edit && st.edit.v === "bk");
/* KEEP BOILING, which chooses between keeping the boil and letting the boil power alone drive the temperature: at the end
   of the nameplate row, the box is the LED, lit Setpoint Green with a tick while ticked. One tap
   sets Keep_Boiling (set_keep_boiling), in any mode. Shown only while the target is BOIL: a hold never uses it. */
function keepHTML() {
  const V = st.v.bk, on = V.keep !== false, pend = st.pend["k:bk"], lost = st.link === "lost";
  const why = lost ? PAUSED : pend ? WAIT : "";
  return `<button type="button" class="keep${lost ? " stale" : ""}" role="checkbox" aria-checked="${on}" data-cmd="keep:bk"${pend ? ' data-state="pending"' : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.2 8.4l3 3 6.6-7"/></svg></span><span class="kl">KEEP BOILING</span><span class="sr">: full power again if the wort falls ${margin()} ${M.U} below a boil</span></button>`;
}
/* the usual boil power (Usual_Boil_Power), a reading in the power box: blank in Hardware, each recipe keeps the last. The
   number and its % stay on one line: where the box is narrow, USUAL goes over them */
const usualHTML = () => st.v.bk.usual == null ? `USUAL <span class="nw">– –</span><small>none · set one in Hardware</small>`
  : `USUAL <span class="nw">${st.v.bk.usual} %</span><small>starts each recipe · set in Hardware</small>`;
function editorHTML(v) {
  if (st.edit.kind === "pwr") {
    const p = st.edit.val;
    return `<div class="editor pwr" role="group" aria-label="${st.edit.what === "boil" ? "New boil power for the boil kettle" : "New power for the boil element by hand"}">
    <button type="button" data-cmd="pstep:-5" aria-label="Down 5 percent">−5</button><button type="button" data-cmd="pstep:-1" aria-label="Down 1 percent">−1</button>
    <input id="tin" inputmode="numeric" value="${p}" aria-label="${st.edit.what === "boil" ? "New boil power in percent" : "New power by hand in percent"}">
    <button type="button" data-cmd="pstep:1" aria-label="Up 1 percent">+1</button><button type="button" data-cmd="pstep:5" aria-label="Up 5 percent">+5</button>
    <button type="button" class="ok" data-cmd="pset">SET <span id="tok">${p}</span> %</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button>${M.BKNEW ? `
    <button type="button" class="bkat" data-cmd="bat">BOIL AT ${boilTh()} ${M.U}<small>full power until then · change</small></button><p class="usual">${usualHTML()}</p>` : ""}</div>`;
  }
  if (bkNew(v) && st.edit.kind === "tgt") return bkTgtEditorHTML();
  /* the HLT's and the mash tun's target, the boil kettle's with an older BoilPower, or the new one's boil point (BOIL AT) */
  const x = st.edit.val.toFixed(1), at = st.edit.kind === "bat";
  return `<div class="editor" role="group" aria-label="${at ? "New boil temperature for the boil kettle" : `New target for the ${M.VNAME[v].toLowerCase()}`}">
    <button type="button" data-cmd="tstep:-1" aria-label="Down 1 degree">−1</button><button type="button" data-cmd="tstep:-0.1" aria-label="Down 0.1 degree">−.1</button>
    <input id="tin" inputmode="decimal" value="${x}" aria-label="${at ? `New boil temperature in ${M.U}` : `New target in ${M.U}`}">
    <button type="button" data-cmd="tstep:0.1" aria-label="Up 0.1 degree">+.1</button><button type="button" data-cmd="tstep:1" aria-label="Up 1 degree">+1</button>
    <button type="button" class="ok" data-cmd="tset">SET <span id="tok">${x}</span> ${M.U}</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button></div>`;
}
/* an element on by hand: its vessel in MANUAL, and no AUTO running it, neither its own nor the mash tun's HERMS. In MANUAL
   nothing compares the temperature with the target, so the element runs until someone turns it off. t: the target it
   won't stop at (the HLT's SV; the proposed boil kettle's, when it is below where BOIL starts), or null: none, or one
   at or past where BOIL starts, which the wort or water boils before it reaches. over: "boil" from where BOIL starts,
   else "target" from 2 °F (1 °C) past the target, else "". The boil kettle with its target at BOIL, or none, boils by
   hand as a boil kettle should: not this. CraftBeerPi raises its alarm for the same (cbpi/extension/byhand) */
const byOver = () => M.U === "°C" ? 1 : 2;
function byHand(v) {
  const el = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null, V = st.v[v];
  if (!el || !el.on || el.by || V.mode === "auto" || (v === "hlt" && st.v.mt.mode === "auto")) return null;
  if (v === "bk" && !(M.BKNEW && bkHoldT() != null)) return null;
  const raw = v === "bk" ? bkHoldT() : V.sv, t = raw != null && raw < bkLetGo() ? raw : null;
  return {t, over: V.pv >= bkLetGo() ? "boil" : t != null && V.pv >= t + byOver() ? "target" : ""};
}
/* while it heats by hand, the line under the window says nothing will stop it, in Prompt Amber, in the words of the
   lines it stands in for ("below target") and of the element's button ("tap to turn off"); past its target, or near the
   boil, in light red, with CraftBeerPi's alarm in the title bar. Each fits one line at the narrowest faceplate, 229 px at
   1180 px wide, so the buttons under it don't move as it changes */
function byHandLine(v, w) {
  if (w.over === "target") return `<span class="alarm">${(st.v[v].pv - w.t).toFixed(1)} ${M.U} above target · heating by hand</span>`;
  if (w.over === "boil") return `<span class="alarm">Near the boil · heating by hand</span>`;
  return `<span class="warn">Heating by hand · ${w.t != null ? "won't stop at target" : "until you turn it off"}</span>`;
}
/* the line under the window. From 900 px wide the three faceplates share their rows, so a line on two lines would move
   every AUTO/MANUAL under it: each line here, and in bkLine and byHandLine, fits on one line with at least 8 px to spare
   at the narrowest faceplate (229 px inside, at 1180 px wide), with three-digit numbers */
function devHTML(v) {
  const stale = s => `<span class="stale">${s}</span>`;
  if (st.link === "lost") return st.age == null ? stale("No reading yet") : `<span class="age">Last reading ${st.age} s ago</span>`;
  const V = st.v[v];
  if (V.missing) return stale("Not set up");
  /* live, a probe that hasn't given a reading since the page opened; the demo's moments with a silent probe
     (#probes-none, #check-probe) keep the mockup's line, which goes by the vessel's mode */
  if (V.pv == null && !DEMO_MODE) return stale("No reading yet");
  if (bkNew(v)) return bkLine();
  const herms = v === "hlt" && hermsOn(), driven = V.mode === "auto" || herms;
  /* AUTO with no target (unset, 0 or below) runs but holds nothing, so nothing heats. The line says so at once, in Prompt
     Amber, and never calls it MANUAL; CraftBeerPi's own warning follows in the title bar after 5 s */
  if (herms && st.v.mt.sv == null) return `<span class="warn">No mash tun target, so it won't heat</span>`;
  if (noTarget(v)) return `<span class="warn">${v === "mt" && M.HERMS !== false ? "No target, so the HLT won't heat" : "No target, so it won't heat"}</span>`;
  const w = byHand(v);
  if (w) return byHandLine(v, w);
  if (!driven || V.sv == null) return v === "mt" ? "MANUAL · wort pump by hand" : "MANUAL · element by hand";
  if (v === "bk" && V.pv >= V.sv - 0.5) return "Boiling";
  const d = V.sv - V.pv;
  if (Math.abs(d) < 0.3) return "At target";
  const eta = GRAPHS ? graphETA(G(), v) : "";
  return (d > 0 ? `${d.toFixed(1)} ${M.U} below target` : `${(-d).toFixed(1)} ${M.U} above target`) + (eta ? ` · ${eta}` : "");
}
/* layout B's faceplate also shows output and mode, like a hardware PID controller. OUT is the element's power now, on
   every vessel and in every state: on the boil kettle 100 % while it heats to the boil, the boil power once it boils,
   0 while paused, and the hand level in MANUAL. The green BOIL number is the setting; OUT is what the element is doing */
function auxHTML(v) {
  const e = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null, el = e && !e.missing ? e : null;
  const mode = v === "hlt" && hermsOn() ? "HERMS" : st.v[v].mode === "auto" ? "AUTO" : "MAN";
  const pct = el && el.on ? el.pct : 0;
  const md = v === "bk" && bkManCue() ? `<span class="mc" title="${esc(MAN_CUE)}">MAN</span><span class="sr">. ${MAN_CUE}</span>` : mode;
  return `<dl class="aux"><dt>OUT</dt><dd>${el ? pct + " %" : "– –"}<span class="outbar"${el ? "" : ' style="visibility:hidden"'} aria-hidden="true"><i style="width:${pct}%"></i></span></dd><dt>MODE</dt><dd>${md}</dd></dl>`;
}
/* MANUAL where AUTO is usual (the new MANUAL, The Usual Mode Rule): the boil kettle in MANUAL with a reading AUTO could
   work from, while its element heats by hand or a step that boils or holds a temperature in it runs. Its MODE then says
   MAN boxed in Prompt Amber, so that heating by hand isn't taken for BoilPower's boil. Not while the boil waits for the
   brewer (the recipe ready, held), when nothing heats in either mode, nor with no connection, when nothing on the window
   is current. No sound, no alarm and no line of its own */
const MAN_CUE = "In MANUAL, BoilPower isn't running the boil kettle, as it does in AUTO.";
function bkManCue() {
  const V = st.v.bk, r = st.recipe, s = r && M.RECIPE.steps[r.cur];
  if (!M.BKHAND || st.link === "lost" || V.mode === "auto" || V.pv == null) return false;
  return st.a.bkEl.on || !!(s && s.k === "bk" && s.temp > 0 && r.state === "running");
}
function hermsRowHTML() {
  const why = st.link === "lost" ? PAUSED : `The mash tun's AUTO runs this vessel for the HERMS: it switches the HLT element and sets this target up to the mash tun's target plus ${M.HERMS_DELTA} ${M.U}. Switch the mash tun to MANUAL to take the HLT over.`;
  return `<div class="moderow"><button type="button" class="tgtbtn herms" data-cmd="noop" aria-disabled="true" data-why="${esc(why)}"><span class="lb">HERMS</span><small>run by the mash tun · switch it to MANUAL to take over</small></button></div>`;
}
/* the faceplate's second readout: the SV; the new boil kettle's is its hold, read like the HLT's target, or while its target
   is BOIL, the boil power, and its button. In the new MANUAL that green number is the power the element runs at by hand,
   so it reads HAND, not BOIL, which is AUTO's */
function svCell(v) {
  const V = st.v[v], u = `<span class="u">${M.U}</span>`;
  if (!bkNew(v)) return ["SV", V.sv == null ? "– –" : f1(V.sv) + u];
  const ho = bkHoldT();
  return ho != null ? ["SV", f1(ho) + u] : [bkHand() ? "HAND" : "BOIL", boilReadHTML()];
}
function plateHTML(v) {
  const V = st.v[v], [svT, svV] = svCell(v);
  /* the new boil kettle has TARGET beside AUTO/MANUAL, as the HLT does, and its element button between the boil power's
     steps, −5 −1 … +1 +5, where four 44 px steps and HEATING fit in one row. On tight faceplates (TIGHT) the steps have
     a row of their own under AUTO/MANUAL and TARGET, so that, as they come and go with AUTO, a hold or the power box,
     nothing above them moves. Where the page scrolls (STACKED), the row keeps its place while the steps are away, so
     the page's height doesn't change and nothing below moves either */
  const pw = bkNew(v) && M.VACT.bk.includes("bkEl"), nudge = pw && bkNudges(), own = nudge && TIGHT, keep = pw && TIGHT && STACKED && !own;
  const lamps = pw ? (nudge && !own ? nudgeHTML(-5) + nudgeHTML(-1) + bkLampHTML() + nudgeHTML(1) + nudgeHTML(5) : bkLampHTML())
    : M.VACT[v].map(lampHTML).join("") + (v === "bk" && M.BOILPOWER && !M.BKNEW ? powerHTML() : "");
  const mode = `<div class="moderow">${modeHTML(v)}${tgtHTML(v)}</div>`;
  const steps = own ? `<div class="bksteps" role="group" aria-label="Boil power steps">${nudgeHTML(-5) + nudgeHTML(-1) + nudgeHTML(1) + nudgeHTML(5)}</div>`
    : keep ? `<div class="bkspace"></div>` : "";
  return `<section class="plate" id="pl-${v}" aria-labelledby="h-${v}">
    ${bkNew(v) ? `<div class="phead"><h2 id="h-${v}">${M.VNAME[v]}</h2>${bkHoldT() == null ? keepHTML() : ""}</div>` : `<h2 id="h-${v}">${M.VNAME[v]}</h2>`}
    <div class="face${st.link === "lost" ? " stale" : ""}">
      <dl class="pvsv"><dt>PV</dt><dd class="pv">${f1(V.pv)}<span class="u">${M.U}</span></dd>
      <dt>${svT}</dt><dd class="sv">${svV}</dd></dl>
      ${LAYOUT === "b" ? auxHTML(v) : ""}
      ${GRAPHS ? graphHTML(G(), v, "f") : ""}
    </div>
    <p class="dev">${devHTML(v)}</p>
    <div class="ctrls${nudge && !own ? " bkpow" : ""}">${lamps}</div>
    ${st.edit && st.edit.v === v ? editorHTML(v) : v === "hlt" && hermsOn() ? hermsRowHTML() : steps ? `<div class="mstack">${mode}${steps}</div>` : mode}
    <p class="note">${esc(st.notes[v] || "")}</p>
  </section>`;
}
/* tight faceplates: three side by side, each under 276 px inside, where four 44 px keys, their gaps and HEATING (or a
   box's number) don't fit in one row. There the boil power's steps get a row of their own (plateHTML), and so do a
   box's keys, under its number (.plates[data-tight], brewday.css). Measured from the faceplates' own width, so it holds
   at any window size: windows about 900 to 970 px wide, and 1180 to 1320 beside the recipe column */
const TIGHT_IN = 276;
function platesTight() {
  const P = $("#plates"), s = getComputedStyle(P);
  if (s.gridTemplateColumns.split(" ").length < 3) return false;
  const pl = P.querySelector(".plate"), ps = pl && getComputedStyle(pl);
  const inner = pl ? pl.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) : (P.clientWidth - 2 * parseFloat(s.columnGap)) / 3 - 26;
  return inner < TIGHT_IN;
}
// the recipe column under the brewhouse, not beside it: the page scrolls, rather than the drawing giving up height
const mainStacked = () => getComputedStyle($(".main")).gridTemplateColumns.split(" ").length < 2;

/* ---------- recipe column ---------- */
function recipeHTML() {
  const r = st.recipe;
  if (!r) return handHTML();
  const S = M.RECIPE.steps, run = r.state === "running", off = st.link === "lost" ? PAUSED : "";
  const pS = st.pend["r:start"], pX = st.pend["r:stop"], pN = st.pend["r:next"], pC = st.pend["r:check"], pU = st.pend["r:unload"], pB = st.pend.bs;
  /* while UNLOADING… or BrewStart's SETTING… waits, the recipe's own commands wait with it, greyed */
  const sOff = off || (pU || pB ? WAIT : "");
  const start = pC ? `<button type="button" class="lamp" data-state="pending" data-cmd="noop" aria-disabled="true" data-why="${PB_WAIT}"><span class="st">CHECKING…</span><span class="nm">before it starts</span></button>`
    : pS ? `<button type="button" class="lamp" data-state="pending" data-cmd="noop" aria-disabled="true" data-why="${WAIT}"><span class="st">STARTING…</span><span class="nm">recipe</span></button>`
    : run ? `<button type="button" class="lamp" data-state="running" data-cmd="noop" aria-disabled="true" data-why="The recipe is already running."><span class="st">RUNNING</span><span class="nm">step ${r.cur + 1} of ${S.length}</span></button>`
    : `<button type="button" class="lamp" data-state="off" data-cmd="r:start"${sOff ? ` aria-disabled="true" data-why="${sOff}"` : " data-hold"}>${sOff ? "" : '<span class="fill"></span>'}<span class="st">START</span><span class="nm">hold to start</span></button>`;
  /* the middle button: STOP while a step runs; RESET, to reset the brew day's progress after a stop, while nothing
     runs and some step has begun (stopped, failed, done, or the boil held for you), as a stopwatch's Reset shows once
     it is stopped. CraftBeerPi refuses a reset while a step runs. On a recipe not begun, STOP is greyed. RESET asks
     first (resetConfirmHTML) */
  const pR = st.pend["r:reset"], begun = r.state === "stopped" || r.cur > 0;
  const stop = !run && (begun || pR) ? b("cmdbtn", pR ? "RESETTING…" : "RESET", "back to step 1", {cmd: "r:reset", why: off || (pR || pU || pB ? WAIT : "")})
    : b("cmdbtn", pX ? "STOPPING…" : "STOP", run ? "tap to stop" : "not running", {cmd: "r:stop", why: off || (pX ? WAIT : "") || (!run ? "The recipe is not running." : "")});
  const last = r.cur >= S.length - 1, notBegun = r.state === "ready" && !r.held;
  /* held before the boil, NEXT STEP is greyed and says how to start it (HELD_NEXT): CraftBeerPi would take it as "start the
     boil". The same on a recipe loaded or reset and not begun, where NEXT would start its first step (NOT_BEGUN) */
  const next = b("cmdbtn", pN ? "MOVING ON…" : "NEXT STEP", last ? "last step" : notBegun ? "not started" : `to ${esc(S[r.cur + 1].n)}`, {cmd: "r:next", why: off || (pN || pU || pB ? WAIT : "") || (r.held ? HELD_NEXT : "") || (notBegun ? NOT_BEGUN(S[r.cur]) : "") || (last ? "This is the last step." : "")});
  const unl = b("unl", pU ? "UNLOADING…" : "UNLOAD", "", {cmd: "r:unload", label: pU ? "" : "Unload the recipe", why: unloadRule().why || ""});
  return `<h2>${esc(M.RECIPE.name)}</h2>
    <div class="rstat"><p class="rmeta">${run ? "Running" : r.state === "ready" ? "Ready to start" : "Stopped"} · step ${r.cur + 1} of ${S.length}</p>${unl}</div>
    <div class="rctl">${start}${stop}${next}</div>
    ${st.confirmNext ? confirmHTML() : st.confirmReset && !run && begun ? resetConfirmHTML() : st.confirmUnload && !run && unloadAsks(r) ? unloadAskHTML() : st.pbOpen ? pbHTML() : pbFresh() ? nbHTML() : ""}
    ${swHTML()}
    ${st.bsOpen ? bsHTML() : `<p class="note">${esc(st.notes.r || "")}</p>`}
    <ol class="steps" aria-label="Recipe steps">${bsAddHTML()}${S.map(stepHTML).join("")}</ol>${M.TIMERS ? timersHTML() : ""}`;
}
/* NEXT STEP's question. Skipping BrewStart as the strike water step before it holds the water (while it waits or heats)
   starts MashIn on the Mash Tun with the tun still empty, so it says so; once BrewStart holds the water, the answer moves
   it on as its own question's does */
function confirmHTML() {
  const r = st.recipe, cur = M.RECIPE.steps[r.cur], nx = M.RECIPE.steps[r.cur + 1];
  const dry = cur.type === "BrewStart" && bsStrike() && r.bsHeat !== "holding" && nx.k === "mt"
    ? ` The strike water isn't in the ${esc(DEMO_MODE ? DEMO.KNAME.mt : (M.K && M.K.mt && M.K.mt.name) || "Mash Tun")} yet, so its pump would start with the tun empty.` : "";
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Skip the rest of <b>${esc(cur.n)}</b>${cur.min ? ` (${mmss(r.left)} left)` : ""} and start <b>${esc(nx.n)}</b>${nx.temp ? ` at ${nx.temp} ${M.U}` : ""}?${dry}</p><div><button type="button" class="yes" data-cmd="r:next-yes">SKIP TO ${esc(nx.n.toUpperCase())}</button><button type="button" data-cmd="r:next-no">KEEP GOING</button></div></div>`;
}
/* RESET's question, as NEXT STEP's: a reset can't be undone, so it says what CraftBeerPi forgets (the steps done, and the
   minutes the stopped step had run: a 40 min rest stopped at 16 runs all 40 again), what goes with it (the questions about
   the brew), and what it leaves alone. Its answers say what each does; neither is the default */
function resetConfirmHTML() {
  const r = st.recipe, S = M.RECIPE.steps, cur = S[r.cur], n = r.cur, lost = [];
  if (n) lost.push(n === 1 ? "step 1 is done" : n === 2 ? "steps 1 and 2 are done" : `steps 1 to ${n} are done`);
  const ran = r.state === "stopped" && cur.min ? cur.min * 60 - r.left : 0;
  if (ran > 0) lost.push(`${esc(cur.n)} has run ${ran < 60 ? "under a minute" : Math.floor(ran / 60)} of its ${cur.min} minutes`);
  const said = [lost.length ? `CraftBeerPi forgets that ${lost.join(" and that ")}.` : "Nothing has been done yet.",
    brewQuestions().length ? "Its questions waiting for you are taken down." : "",
    `Kettles, pumps and ${M.TIMERS ? "timers" : "the rest timer"} stay as they are.`].filter(Boolean).join(" ");
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Reset the recipe to step 1, <b>${esc(S[0].n)}</b>? ${said}</p><div><button type="button" class="yes" data-cmd="r:reset-yes">RESET TO STEP 1</button><button type="button" data-cmd="r:reset-no">${n ? `STAY AT STEP ${n + 1}` : "STAY STOPPED"}</button></div></div>`;
}
/* UNLOAD, at the end of the status line: the recipe off Brew Day, back to brewing by hand (POST /step2/clear). The recipe
   pages' rules, for LOAD and UNLOAD alike: one tap on a recipe not begun, which the Recipe Book still has as it was
   saved; a question once a brew has begun and nothing runs (unloadAskHTML), as RESET asks; greyed while a step runs,
   BrewStart waiting for its time included, saying what runs. CraftBeerPi refuses it then (409 step_running). A recipe
   the Recipe Book doesn't have (steps built on Brew Steps and never saved there) can't be loaded again, so UNLOAD asks
   for it even before it begins. The screen finds it in the book by its name: true, false, or null while it can't tell
   (the book not read yet, or its read failed), when UNLOAD asks too */
const inBook = () => DEMO_MODE ? M.BOOK.some(x => x.n === M.RECIPE.name) : bookNames ? bookNames.has(M.RECIPE.name) : null;
function unloadRule() {
  const r = st.recipe, P = st.pend;
  if (st.link === "lost") return {why: PAUSED};
  if (P["r:check"]) return {why: PB_WAIT};
  if (["r:unload", "r:start", "r:stop", "r:next", "r:reset", "r:load", "sw", "swv", "swg", "bs"].some(k => P[k])) return {why: WAIT};
  if (r.state === "running") return {why: unloadRunWhy(r)};
  return unloadAsks(r) ? {ask: true} : {};
}
const unloadAsks = r => r.state === "stopped" || r.cur > 0 || inBook() !== true;
/* what runs, in brewing words, as the recipe pages' greyed LOAD says it: the step and what it waits for, as its row
   says it, or its time left. BrewStart planning Ready by names its kettle (its Heat_Kettle), its water's temperature
   and the time; once it heats (bsHeat), the water it heats, and holding it, that it waits for you */
function unloadRunWhy(r) {
  const s = M.RECIPE.steps[r.cur], U = M.U, at = s.temp == null ? "" : s.type === "SpargeStep" ? ` the water to ${s.temp} ${U}` : ` to ${s.temp} ${U}`;
  const starts = typeof r.wait === "string" && r.wait.startsWith("STARTS ") ? r.wait.slice(7) : "";
  const what = s.type === "BrewStart" && !r.bsHeat ? (s.ready ? `BrewStart is waiting to have the ${s.kn || (DEMO_MODE ? DEMO.KNAME[s.k] : "kettle")} at ${s.temp} ${U} by ${todS(s.ready)}` : `BrewStart is waiting to start${starts ? ` at ${starts}` : ""}`)
    : r.wait === WAITING_FOR_YOU ? `${s.n}, waiting for you`
    : r.wait === true || r.wait === "HEATING" ? `${s.n}, heating${s.type === "BrewStart" ? ` the water to ${s.temp} ${U}` : at}` : r.wait === "COOLING" ? `${s.n}, cooling${at}`
    : r.wait ? `${s.n}, ${String(r.wait).toLowerCase()}` : s.min ? `${s.n}, ${mmss(r.left)} left` : s.n;
  return `${M.RECIPE.name} is running: ${what}. Stop it first.`;
}
/* UNLOAD's question, as short as RESET's, in the recipe pages' words: what CraftBeerPi forgets (how far the brew got),
   whether the Recipe Book can give the recipe back, and what stays as it is. Its answers say what each does; neither
   is the default */
function unloadAskHTML() {
  const r = st.recipe, s = M.RECIPE.steps[r.cur], n = r.cur + 1, begun = r.state === "stopped" || r.cur > 0, kept = inBook();
  const ran = r.state === "stopped" && s.min ? s.min * 60 - r.left : 0;
  const after = ran >= 60 ? `, after ${Math.floor(ran / 60)} of its ${s.min} min` : ran > 0 ? `, under a minute into its ${s.min} min` : "";
  const at = r.state === "stopped" ? `it stopped at step ${n}, ${esc(s.n)}${after}` : r.held || r.wait === WAITING_FOR_YOU ? `it's at step ${n}, ${esc(s.n)}, waiting for you` : `it's at step ${n}, ${esc(s.n)}`;
  const said = [begun ? `CraftBeerPi forgets ${at}.` : "",
    kept ? "The Recipe Book keeps the recipe." : kept === false ? "It isn't in the Recipe Book, so it can't be loaded again." : "The Recipe Book can't be checked right now, so it may not be there to load again.",
    `Kettles, pumps and ${M.TIMERS ? "timers" : "the rest timer"} stay as they are.`].filter(Boolean).join(" ");
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Unload the recipe and brew by hand? ${said}</p><div><button type="button" class="yes" data-cmd="r:unload-yes">UNLOAD</button><button type="button" data-cmd="r:unload-no">${begun ? `STAY AT STEP ${n}` : "DON'T UNLOAD"}</button></div></div>`;
}
/* LOAD over a recipe the Recipe Book doesn't have asks first, by the recipe pages' rule, as UNLOAD does: a finished one,
   whose steps stay loaded, all done, until another is loaded, under the by-hand list; or one not begun, under OTHER
   RECIPE. One the book has, or none at all, loads with one tap. Its question takes the list's place, and names SAVE
   TO BOOK, on Brew Steps, in the recipe pages' words. Live, a finished recipe is steps loaded that show no recipe
   in the column */
const finishedLoaded = () => !st.recipe && (DEMO_MODE ? !!st.finished : M.RECIPE.steps.length > 0);
const loadAsks = () => (finishedLoaded() || (!!st.recipe && pbFresh())) && inBook() !== true;
function loadAskHTML() {
  const x = M.BOOK[st.confirmLoad], to = esc(x ? x.n : ""), name = esc(M.RECIPE.given ?? M.RECIPE.name), kept = inBook();
  const said = !name ? `Load ${to} in place of the steps on Brew Day? They aren't in the Recipe Book, so they can't be loaded again. SAVE TO BOOK on Brew Steps keeps them.`
    : kept === false ? `Load ${to} in place of ${name}? ${name} isn't in the Recipe Book, so it can't be loaded again. SAVE TO BOOK on Brew Steps keeps it.`
    : `Load ${to} in place of ${name}? The Recipe Book can't be checked right now, so ${name} may not be there to load again. SAVE TO BOOK on Brew Steps keeps it.`;
  return `<div class="confirm" role="group" aria-labelledby="ld-t"><p id="ld-t">${said} Kettles, pumps and ${M.TIMERS ? "timers" : "the rest timer"} stay as they are.</p><div><button type="button" class="yes" data-cmd="r:load-yes">LOAD INSTEAD</button><button type="button" data-cmd="r:load-no">DON'T LOAD</button></div></div>`;
}
/* LOAD in the by-hand list or in OTHER RECIPE's book: one tap, unless it would replace a recipe the Recipe Book doesn't
   have, when it asks first (loadAskHTML); LOAD INSTEAD comes back here */
function loadPress(i, asked) {
  if (!asked && loadAsks()) { st.confirmLoad = i; return renderAll(); }
  st.confirmLoad = null;
  if (st.rbOpen && st.recipe) return DEMO_MODE ? cmdLoad2(i) : liveLoad(i, true);
  renderAll();
  return DEMO_MODE ? cmdLoad(i) : liveLoad(i);
}
/* ---------- the pre-brew check (design/brewday/PRE-BREW-CHECK.md) ----------
   START on a recipe not begun checks three things first, as a brewhouse's start conditions: every probe gives a reading,
   the clock is set, and every boil addition has a reminder. CraftBeerPi answers (GET /step2/precheck, core 4.7.7.post45).
   All passed, the recipe starts at once, with a line in LOG; otherwise the recipe column says, under START, which didn't
   pass and what to do, and offers START ANYWAY (held, as START is) or DON'T START. It never blocks, and it says no more
   than it checked: a probe "gives a reading", which one stuck on an old reading also does. It is a notice, not an alarm:
   no sound, nothing in the title bar. The box follows CraftBeerPi while it is open, so a clock set a minute after the Pi
   starts turns its line to passed and START ANYWAY to START, in their places. The switches are the brewer's to check */
const PB_WAIT = "CraftBeerPi is checking the probes, the clock and the reminders. The recipe starts once they pass.";
// a recipe none of whose steps has begun: loaded, or after RESET TO STEP 1; not START carrying on after a STOP or a power cut
const pbFresh = () => { const r = st.recipe; return !!r && r.state === "ready" && !r.held && r.cur === 0; };
/* the recipe a START was held on, as the hold began: its steps, by CraftBeerPi's ids (the demo's have none, so their
   names stand in), its name, and whether it was waiting to start. The check, CHECKING… and the check's box belong to it
   (st.pbFor), and START sends its ids, so CraftBeerPi starts only those steps (core 4.7.7.post46) */
const recipeKey = () => M.RECIPE.steps.map(s => s.id ?? s.n).join("|");
const recipeOn = () => ({key: recipeKey(), ids: M.RECIPE.steps.map(s => s.id).filter(x => x != null), name: M.RECIPE.name, fresh: pbFresh()});
/* what has become of that recipe on another screen: started, unloaded ("cleared": its steps emptied), or another loaded
   in its place (other steps, another recipe's or the same recipe's edited on the Brew Steps page). Nothing while it is
   still the one shown */
function recipeLost(on = {key: recipeKey(), name: M.RECIPE.name, fresh: true}) {
  if (!st.recipe) return "cleared";
  if (recipeKey() !== on.key) return "loaded";
  return on.fresh && !pbFresh() ? "started" : null;
}
/* said once, as another screen's change ends a START. The screen itself shows a recipe started (RUNNING) or unloaded (no
   recipe); another in its place looks just like the one START was held on but for its name and steps, so that is also
   said under START, for the note line's 6 s. name: the recipe now loaded, which CraftBeerPi's refusal names before this
   screen has heard of it */
function lostSay(why, on, name = M.RECIPE.name) {
  const words = why === "started" ? "The recipe was started on another screen." : why === "cleared" ? "The recipe was unloaded on another screen."
    : `Not started: ${on && on.name === name ? "the recipe was changed" : "another recipe was loaded"} on another screen.`;
  say(words);
  if (why === "loaded") timers.push(setTimeout(() => note("r", words), 0));
}
/* the check ended by another screen: CHECKING… gives way at once, the box closes, nothing starts, and the check's answer,
   when it comes, decides nothing (pbDecide) */
function pbEnd(why) {
  delete st.pend["r:check"]; st.pbOpen = false;
  lostSay(why, st.pbFor);
}
/* the check's box, the probes' panel and the strike water box keep, as they are drawn again, the tallest their contents
   have needed since they opened at this column width, with the box's answers at its foot, so a line that gets shorter as
   CraftBeerPi's answers change (the clock set, a probe back, the grain a degree warmer) moves no button under a reaching
   hand. pbKeep: {cls, w, h}, the box's class, the recipe column's width and that height. Every height is measured
   without the one kept, so the box is never taller than its contents have needed; none is kept across a change of the
   column's width, where the lines wrap anew, nor of the box's class (the strike water box's phase), nor measured while
   the fonts are still loading, which the lines lose once they come. The strike water box keeps one only while closed:
   opened out, its buttons are in its head, above everything in it that changes */
let pbKeep = null;
// the box on screen as it is about to be drawn again: the height its contents need now, at the column's width now
function pbMeasure() {
  const kp = $("#recipe .pbc, #recipe .cmp, #recipe .sw:not(.open)");
  if (!kp || (document.fonts && document.fonts.status === "loading")) return null;
  const kept = kp.style.minHeight;
  kp.style.minHeight = "";
  const m = {cls: kp.className, w: $("#recipe").clientWidth, h: kp.getBoundingClientRect().height};
  kp.style.minHeight = kept;
  return m;
}
// after it is drawn again (before: pbMeasure's, from just before): the tallest of what its contents need, at this width
function pbFit(before = null) {
  const kp = $("#recipe .pbc, #recipe .cmp, #recipe .sw:not(.open)");
  if (!kp) { pbKeep = null; return; }
  kp.style.minHeight = "";
  if (document.fonts && document.fonts.status === "loading") { pbKeep = null; return; }
  const w = $("#recipe").clientWidth, need = kp.getBoundingClientRect().height;
  const at = m => (m && m.cls === kp.className && m.w === w ? m.h : 0);
  const h = Math.max(need, at(pbKeep), at(before));
  if (h > need) kp.style.minHeight = `${h}px`;
  pbKeep = {cls: kp.className, w, h};
}
const VWHOSE = {hlt: "the hot liquor tank's", mt: "the mash tun's", bk: "the boil kettle's"};
const VTHE = v => VWHOSE[v].slice(0, -2);
/* a part of the check CraftBeerPi couldn't work out (its "error"): that part says so, and the other two still answer */
const PB_ERR = {probes: "<b>The probes weren't checked:</b> CraftBeerPi ran into a problem.", clock: "<b>The clock wasn't checked:</b> CraftBeerPi ran into a problem.", adds: "<b>The reminders weren't checked:</b> CraftBeerPi ran into a problem."};
const cap = s => s[0].toUpperCase() + s.slice(1);
const andList = a => (a.length < 3 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
const pbFor = s => s >= 60 ? `${Math.round(s / 60)}&nbsp;min` : `${Math.round(s)}&nbsp;s`;
/* the marks beside each check, drawn like the title bar's NO ALARMS tick: a green ring and tick where it passed, a
   Prompt Amber disc with a dark "!" where it didn't, and a plain ring with an "i" for a note that asks nothing of the
   brewer (probes a few degrees apart) */
const MK = {
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11v6.3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="7.3" r="1.6" fill="currentColor"/></svg>',
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7.3 12.4l3.2 3.2 6.3-6.9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  no: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.5" fill="currentColor"/><path d="M12 6.3v7.4" stroke="#241800" stroke-width="2.9" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.7" fill="#241800"/></svg>'
};
/* each check in the place it has whatever CraftBeerPi answers, saying it wasn't checked where there is no answer for it */
const PB_PARTS = {probes: "The probes weren't checked.", clock: "The clock wasn't checked.", adds: "The reminders weren't checked."};
const pbNoAnswer = () => !!(st.pb && st.pb.noAnswer);
/* CraftBeerPi's answer as the checks need it: {noAnswer}, or {probes, clock, adds} with {error} for a part it couldn't
   work out. Live, st.pb is pbNorm's; the demo's is the mockup's own (the clock set or not and why, how long each silent
   probe has given no reading, a kettle with no probe in Hardware, the boil's additions), its probes read from the
   faceplates */
function pbAnswer() {
  const P = st.pb;
  if (!P || P.noAnswer || !DEMO_MODE) return P;
  const E = P.error || {}, why = P.why || {}, unset = v => why[v] === "no_probe" || why[v] === "missing";
  return {probes: E.probes ? {error: true} : {kettles: ["hlt", "mt", "bk"].map(v => ({v, probe: unset(v) ? "" : DEMO.PROBE[v], ok: st.v[v].pv != null, why: why[v] || null, for: P.none[v] ?? null}))},
    clock: E.clock ? {error: true} : {ok: !!P.clock, why: P.clockWhy || null},
    adds: E.adds ? {error: true} : {n: P.adds.n, missed: P.adds.missed, holds: 6, steps: 1}};
}
/* GET /step2/precheck's answer (cbpi/http_endpoints/http_step.py, cbpi/controller/precheck_controller.py). Each kettle
   is matched to its vessel on this screen by its id; one the screen doesn't show is named by its name in CraftBeerPi.
   Each kettle keeps its reason (why): no_probe, none chosen in Hardware, and missing, a probe CraftBeerPi no longer has,
   are settings to put right there; never, stale, not_a_number and out_of_range give no reading, with how long where
   CraftBeerPi knows it, and unreadable without. The clock counts as set by CraftBeerPi's rule (synchronized, or
   no_timedatectl on a computer with its own clock); not set, its why says which: nothing for not_synchronized,
   timedatectl's plain no; "unsure" for unconfirmed, timedatectl failing or answering neither yes nor no (system_clock.
   clock_answer); "slow" for no_answer_yet, timedatectl not answering the first time it was asked, within CraftBeerPi's
   2 s wait. A part CraftBeerPi couldn't work out has an error, kept apart from those */
function pbNorm(d) {
  const P = d.probes, C = d.clock, R = d.reminders, bad = x => !x || typeof x !== "object" || x.error != null;
  const vOf = k => ["hlt", "mt", "bk"].find(v => M.K && M.K[v] && M.K[v].id === k.kettle_id) || null;
  return {
    probes: bad(P) || !Array.isArray(P.kettles) ? {error: true}
      : {kettles: P.kettles.filter(k => k && typeof k === "object").map(k => ({v: vOf(k), name: String(k.kettle ?? ""), probe: k.probe == null ? "" : String(k.probe), ok: k.ok === true, why: k.ok === true || k.reason == null ? null : String(k.reason), for: num(k.no_reading_for)}))},
    clock: bad(C) ? {error: true} : {ok: C.ok === true, why: C.ok === true ? null : C.reason === "no_answer_yet" ? "slow" : C.reason === "unconfirmed" ? "unsure" : null},
    adds: bad(R) ? {error: true} : {n: num(R.additions) ?? 0, missed: (Array.isArray(R.without_reminder) ? R.without_reminder : []).filter(x => x && typeof x === "object").map(x => [String(x.name ?? ""), num(x.minutes)]),
      holds: num(R.per_boil_step) ?? 6, steps: num(R.boil_steps) ?? 1}
  };
}
const pbWhose = k => k.v ? VWHOSE[k.v] : `${esc(k.name)}'s`;
const pbThe = k => k.v ? VTHE(k.v) : esc(k.name);
const pbUnset = why => why === "no_probe" || why === "missing";
const pbMin = x => x == null ? "– –" : String(+x.toFixed(1));
const pbCount = n => ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][n - 1] || String(n);
/* an addition's name as the import's warning gives it, amount first ("1.50 oz Citra"): the amount's number and unit
   stay together on a line */
const pbAmount = n => esc(n).replace(/^([\d.,/]+) /, "$1&nbsp;");
function pbItems() {
  const A = pbAnswer();
  /* no answer within PB_ASK: nothing was checked, so each check says so in its own place, and an answer that comes
     later fills them in where they are */
  if (!A || A.noAnswer) return Object.keys(PB_PARTS).map(key => ({key, html: PB_PARTS[key]}));
  /* the probes. A kettle with no probe in Hardware (no_probe: none chosen; missing: one CraftBeerPi no longer has) is a
     setting to put right there, said in the Hardware page's own words. Any other probe without a reading is a plug or a
     cable to check, with how long it has given none where CraftBeerPi knows it */
  let probes;
  if (A.probes.error) probes = {html: PB_ERR.probes, cav: "the probes weren't checked"};
  else {
    const K = A.probes.kettles, dead = K.filter(k => !k.ok), n = K.length;
    const unset = dead.filter(k => pbUnset(k.why)), silent = dead.filter(k => !pbUnset(k.why)), said = [], cavs = [];
    if (unset.length === 1) {
      const k = unset[0], none = k.why === "no_probe";
      said.push(none ? `<b>No probe is chosen for ${pbThe(k)}.</b> Choose one in Hardware.` : `<b>${cap(pbWhose(k))} probe isn't found:</b> CraftBeerPi no longer has it. Choose one in Hardware.`);
      cavs.push(none ? `no probe was chosen for ${pbThe(k)}` : `${pbWhose(k)} probe wasn't found`);
    } else if (unset.length) {
      said.push(`<b>${unset.length} kettles need a probe chosen in Hardware:</b> ${andList(unset.map(k => `${pbThe(k)} (${k.why === "no_probe" ? "none chosen" : "not found"})`))}.`);
      cavs.push(`${unset.length} kettles had no probe chosen`);
    }
    if (silent.length === 1) {
      const k = silent[0], name = k.probe ? `, ${esc(k.probe)},` : "";
      said.push(k.for != null ? `<b>${cap(pbWhose(k))} probe${name} gives no reading,</b> and hasn't for ${pbFor(k.for)}. Check its plug and cable.`
        : `<b>${cap(pbWhose(k))} probe${name} gives no reading.</b> Check its plug and cable.`);
      cavs.push(`${pbWhose(k)} probe gave no reading`);
    } else if (silent.length) {
      said.push(`<b>${silent.length} probes give no reading:</b> ${andList(silent.map(k => `${pbWhose(k)}${k.probe ? ` (${esc(k.probe)})` : ""}`))}. Check their plugs and cables.`);
      cavs.push(`${silent.length} probes gave no reading`);
    }
    probes = !dead.length ? {ok: true, html: n > 2 ? `All ${n} probes give a reading.` : n === 2 ? "Both probes give a reading." : n ? "The probe gives a reading." : "There are no kettles to check."}
      : {html: said.join(" "), cav: cavs.join(", ")};
  }
  /* the clock: core post44's rule (cbpi/api/system_clock.py). The rig's Pi has no clock board yet, so its time is only
     trusted once timedatectl says it was set from the internet; Windows, as on the simulators, always counts as set. A
     step's timer counts on that clock, so a clock set while a rest's timer runs moves the rest's end. Not set, by its
     why (pbNorm): timedatectl's plain no, as just after the Pi starts, which a minute's wait puts right; "unsure", which
     waiting may not change; "slow", timedatectl not answering yet, which the next ask fills in. The title bar's clock is
     this screen's own, so it can't show whether the Pi's is right */
  const C = A.clock;
  const clock = C.error ? {html: PB_ERR.clock, cav: "the clock wasn't checked"} : C.ok ? {ok: true, html: "The clock is set."}
    : C.why === "slow" ? {html: "<b>The clock hasn't been checked yet:</b> the Pi is slow to answer.", cav: "the clock wasn't checked"}
    : C.why === "unsure" ? {html: "<b>The Pi didn't say whether its clock is set.</b> If it has been on and online for a few minutes, you can start anyway. A clock set during a rest can cut the rest short.", cav: "the Pi's clock wasn't confirmed"}
    : {html: "<b>The Pi's clock isn't set yet.</b> It comes from the internet a minute after the Pi starts; if not, check the Pi's network. Set during a rest, it can cut the rest short.", cav: "the Pi's clock wasn't set"};
  /* the reminders: the boil step holds six (Hop_1 to Hop_6), longest first, and an import names any it had to leave out
     (core post38) as its warning named them, amount first; CraftBeerPi keeps those with the recipe for this check.
     Minutes as the step list gives them: before the end of the boil */
  const R = A.adds, miss = R.missed || [];
  const adds = R.error ? {html: PB_ERR.adds, cav: "the reminders weren't checked"}
    : !miss.length ? {ok: true, html: R.n > 2 ? `All ${R.n} boil additions have a reminder.` : R.n === 2 ? "Both boil additions have a reminder." : R.n ? "The boil addition has a reminder." : "The boil has no additions to remind you of."}
    : {html: `<b>${miss.length} of ${R.n} boil additions ${miss.length === 1 ? "has" : "have"} no reminder:</b> ${andList(miss.map(([n, m]) => `${pbAmount(n)} at ${pbMin(m)}&nbsp;min`))} (${R.steps > 1 ? "each" : "the"} boil step holds ${pbCount(R.holds)}). Watch the clock for ${miss.length === 1 ? "it" : "them"}, or set a timer.`, cav: `${miss.length} addition${miss.length === 1 ? " had" : "s had"} no reminder`};
  return [Object.assign({key: "probes"}, probes), Object.assign({key: "clock"}, clock), Object.assign({key: "adds"}, adds)];
}
/* the answer box, in the recipe column under START, like NEXT STEP's and RESET's questions: the three checks always in
   the same order (the brewer's: probes, clock, reminders), each marked passed or not in its place, so nothing moves as
   CraftBeerPi's answers change. Neither answer is the default */
const PB_NONE = "<b>Not started yet:</b> CraftBeerPi didn't answer the check, so nothing was checked. Hold START to try again.";
function pbHTML() {
  const items = pbItems(), bad = items.filter(i => !i.ok).length, off = st.link === "lost" ? PAUSED : "";
  const head = pbNoAnswer() ? PB_NONE : bad ? `<b>Not started yet:</b> ${bad} check${bad > 1 ? "s" : ""} didn't pass.` : "<b>Not started yet:</b> every check passes.";
  const li = i => `<li class="${i.ok ? "ok" : "no"}"><span class="mk">${i.ok ? MK.ok : MK.no}</span><p><span class="sr">${i.ok ? "Passed: " : pbNoAnswer() ? "" : "Didn't pass: "}</span>${i.html}</p></li>`;
  return `<div class="confirm pbc" role="group" aria-labelledby="pb-t"><p id="pb-t">${head}</p><ul class="pbl">${items.map(li).join("")}</ul>
    <div>${b("yes", bad ? "START ANYWAY" : "START", off ? "" : "hold to start", {cmd: "pb:go", hold: true, why: off})}${b("", "DON'T START", "", {cmd: "pb:no", why: off})}</div></div>`;
}
/* START on a recipe not begun: the check first, while START says CHECKING…. CraftBeerPi answers in under a second; with
   no answer in PB_ASK the box says so and offers the same two answers. An older CraftBeerPi without the check (any answer
   but 200: core 4.7.7.post44 answers 405) starts at once, as before it.
   The clock's first answer since CraftBeerPi started can be slow: CraftBeerPi asks timedatectl, which can take a few
   seconds the first time after the Pi starts, and until it answers the check's clock says no_answer_yet ("slow"). START
   keeps CHECKING… and asks again while it does, for up to PB_CLOCK from the hold, so the box opens with the clock's
   answer, not with a short line that grows when the answer comes and moves the box's buttons down. CraftBeerPi's own
   wait for that answer (CLOCK_WAIT, 2 s) spaces the asks, and timedatectl gives up after 5 s. pbHeld: when it began */
const PB_ASK = 5000, PB_POLL = 5000, PB_CLOCK = 6000;
let pbHeld = 0;
function pbRun() {
  if (st.pend["r:check"] || st.pend["r:start"]) return;
  cmpDone(true);
  // the recipe the check is for: the one START's hold began on, or, without a hold, the one shown
  st.pbFor = heldOn || recipeOn();
  st.pbOpen = false; st.pend["r:check"] = "check"; pbHeld = Date.now(); renderAll();
  if (!DEMO_MODE) { pbAsk(); return; }
  const answered = () => {
    // CHECKING… already ended: a recipe started, cleared or loaded on another screen ends it as soon as it is seen (renderAll, pbEnd)
    if (!st.pend["r:check"]) return;
    // the demo's slow clock answers at clockAt, set
    if (st.pb.clockWhy === "slow" && st.pb.clockAt && st.t >= st.pb.clockAt) { st.pb.clock = true; st.pb.clockWhy = null; }
    if (!st.pb.noAnswer && st.pb.clockWhy === "slow" && Date.now() - pbHeld < PB_CLOCK) { timers.push(setTimeout(answered, 1000)); return; }
    pbDecide();
  };
  timers.push(setTimeout(answered, st.pb.noAnswer ? PB_ASK : 500 + Math.random() * 300));
}
const pbPlain = s => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
/* the check's answer, or none: the recipe starts, or the box says what didn't pass. Only for the recipe START was held
   on: started, cleared or replaced on another screen meanwhile, the check ends there (renderAll, pbEnd), CHECKING… still
   pending until then so that it is said */
function pbDecide() {
  if (recipeLost(st.pbFor)) return renderAll();
  delete st.pend["r:check"];
  const bad = pbItems().filter(i => !i.ok);
  if (!bad.length) { logEvent("Checked before starting: probes, clock, reminders", "all passed", "ok"); return DEMO_MODE ? cmdStart(true) : liveStart(true); }
  st.pbOpen = true;
  const words = pbNoAnswer() ? pbPlain(PB_NONE) : `Not started yet: ${bad.length} check${bad.length > 1 ? "s" : ""} didn't pass. ${bad.map(i => pbPlain(i.html)).join(" ")}`;
  say(`${words} START ANYWAY or DON'T START, under START.`);
  return renderAll();
}
/* the check, live: one request at a time. Each asked while START says CHECKING… may answer after PB_ASK: the box then
   already says nothing was checked, and the answer fills it in. While the box or COMPARE PROBES is open it is asked
   again every PB_POLL. pbBusy: a request on its way; pbAt: when the last was sent; pbNone: CraftBeerPi answered without
   a check */
let pbBusy = false, pbAt = 0, pbNone = false;
async function pbAsk() {
  if (pbBusy) return;
  pbBusy = true; pbAt = Date.now();
  const g = gen;
  const late = st.pend["r:check"] ? setTimeout(() => {
    if (g !== gen || !st.pend["r:check"]) return;
    st.pb = {noAnswer: true}; pbDecide();
  }, PB_ASK) : 0;
  const res = await api.precheck();
  if (g !== gen) return;
  pbBusy = false; clearTimeout(late);
  const checking = !!st.pend["r:check"];
  if (res.ok && res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
    pbNone = false;
    st.pb = pbNorm(res.data);
    if (checking) {
      // the clock not answered yet: START keeps CHECKING… and asks again, a second at least after the last ask
      if (st.pb.clock.why === "slow" && Date.now() - pbHeld < PB_CLOCK) {
        timers.push(setTimeout(() => { if (g === gen && st.pend["r:check"]) pbAsk(); }, Math.max(0, 1000 - (Date.now() - pbAt))));
        return;
      }
      pbDecide(); return;
    }
    if (st.pbOpen || st.cmpOpen) renderAll();
    return;
  }
  if (res.error === "http" || res.ok) {
    pbNone = true;
    if (checking) {
      if (recipeLost(st.pbFor)) return renderAll();
      delete st.pend["r:check"]; liveStart(true);
    }
    return;
  }
  // no connection, or no answer at all
  if (checking) { st.pb = {noAnswer: true}; pbDecide(); }
}
/* START ANYWAY: the recipe's line in LOG says what didn't pass, as a start that went past them. Only while its box is
   open, for the recipe START was held on */
function pbGo() {
  if (!st.pbOpen || recipeLost(st.pbFor)) return renderAll();
  const bad = pbItems().filter(i => !i.ok);
  st.pbOpen = false;
  const cav = pbNoAnswer() ? "started anyway: the check got no answer" : bad.length ? `started anyway: ${bad.map(i => i.cav).join(", ")}` : "";
  return DEMO_MODE ? cmdStart(true, cav) : liveStart(true, cav);
}
/* COMPARE PROBES: the probes side by side, for before filling, while every vessel is empty and has stood at room
   temperature, when they should read nearly alike. Under START on a recipe not begun, and at the end of the column when
   brewing by hand. It follows the readings while open; DONE puts what they read in LOG.
   It compares each probe's own reading: what it shows, less the offset set for it in Hardware (its sensor's `offset`,
   which CraftBeerPi adds in the brewery's unit). An offset can be set for brewing rather than for the probe (a mash probe
   at the HERMS coil's outlet, say), and with it a good probe would read off at room temperature on every brew day.
   It judges how far apart they read, highest to lowest, at three levels (pbLim; °F, or the same in °C):
   - within tol they agree: a DS18B20 is accurate to ±0.5 °C (±0.9 °F), so two good ones can be 1.8 °F apart, and its
     readings move in steps of about 0.1 °F;
   - up to room apart is likely where the vessels sit, not their probes: a door, an outside wall or a cold floor can keep
     one vessel a few degrees cooler than the rest. It says so in the plain colour and points to ice water for certainty;
   - further apart than any spot explains, a probe looks off, in amber.
   A reading no room has, below lo or above hi, is a probe looking off whatever the others read: a fault they share can
   make every probe read the same wrong number, 32 °F from a part that doesn't answer or 185 °F from one that has just
   restarted, and alike they would otherwise agree.
   Which probe gives no reading comes from CraftBeerPi's check, asked as it opens and every PB_POLL while open; the demo's
   are the ones whose faceplate has none. It learns nothing from earlier comparisons: LOG keeps only eight lines, on the
   screen that wrote them, and a gap learned over weeks would also learn a probe slowly going wrong */
const pbLim = () => M.U === "°C" ? {tol: 1.1, room: 5.5, each: 0.5, lo: 1.5, hi: 49, ice: 0} : {tol: 2.0, room: 10.0, each: 0.9, lo: 35, hi: 120, ice: 32};
const KSHORT = {hlt: "HLT", mt: "mash tun", bk: "boil kettle"};
const pbSensor = v => { const k = M.K && M.K[v], S = last && last.sensors; return k && k.sensor && Array.isArray(S) ? S.find(x => x && x.id === k.sensor) || null : null; };
const probeName = v => DEMO_MODE ? DEMO.PROBE[v] : String((pbSensor(v) || {}).name || "");
const probeOff = v => DEMO_MODE ? (st.poff || {})[v] || 0 : num(((pbSensor(v) || {}).props || {}).offset) || 0;
/* a vessel's kettle in CraftBeerPi's check, live: whether its probe gives a reading, and why not (pbNorm) */
const pbKettle = v => { const A = !DEMO_MODE && st.pb && !st.pb.noAnswer && !st.pb.probes.error && st.pb.probes; return A ? A.kettles.find(k => k.v === v) || null : null; };
const pbDead = v => { const k = pbKettle(v); return !!(k && !k.ok); };
const pbWhy = v => DEMO_MODE ? ((st.pb || {}).why || {})[v] || null : (k => k && !k.ok ? k.why : null)(pbKettle(v));
/* each probe's own reading; a kettle with no probe in Hardware (why: the check's no_probe or missing) has neither a
   reading nor an offset */
const cmpRead = () => ["hlt", "mt", "bk"].filter(v => DEMO_MODE || (M.K && M.K[v])).map(v => { const pv = st.v[v].pv, why = pbWhy(v), unset = pbUnset(why), off = unset ? 0 : probeOff(v); return {v, why: unset ? why : null, off, val: pv == null || unset || pbDead(v) ? null : pv - off}; });
const fOff = x => `${x > 0 ? "+" : "−"}${Math.abs(x).toFixed(Math.abs(x * 10 - Math.round(x * 10)) < 1e-6 ? 1 : 2)}&nbsp;${M.U}`;
function cmpVerdict(R) {
  const L = pbLim(), U = M.U, got = R.filter(r => r.val != null), dead = R.filter(r => r.val == null), f = x => `${x.toFixed(1)}&nbsp;${U}`;
  /* first what can't be compared: a kettle with no probe in Hardware, in the check's words, then a probe with no reading */
  const unset = dead.filter(r => r.why), silent = dead.filter(r => !r.why);
  const lead = (unset.length === 1 ? (unset[0].why === "no_probe" ? `No probe is chosen for ${VTHE(unset[0].v)}: choose one in Hardware. ` : `${cap(VWHOSE[unset[0].v])} probe isn't found: choose one in Hardware. `)
    : unset.length ? `${unset.length} kettles need a probe chosen in Hardware. ` : "")
    + (silent.length ? `${cap(andList(silent.map(r => VWHOSE[r.v])))} probe${silent.length > 1 ? "s give" : " gives"} no reading: check ${silent.length > 1 ? "their plugs and cables" : "its plug and cable"}. ` : "");
  const nr = dead.length ? "no reading" : "";
  if (got.length < 2) return {tone: "no", dead: dead.length, log: nr, text: lead + "Not enough readings to compare."};
  /* in ice water a probe's window shows the ice's temperature plus its offset */
  const iceOne = r => `in ice water: ${r.off ? `with its ${fOff(r.off)} offset it should read ${f(L.ice + r.off)}` : `it should read ${f(L.ice)}`}, ±${L.each}&nbsp;${U}`;
  const ice = `put each probe in ice water: each should read ${f(L.ice)}${got.some(r => r.off) ? " plus its offset" : ""}, ±${L.each}&nbsp;${U}.`;
  /* a reading no room has */
  const wild = got.filter(r => r.val < L.lo || r.val > L.hi);
  if (wild.length) {
    const lo = Math.min(...wild.map(r => r.val)), hi = Math.max(...wild.map(r => r.val)), many = wild.length > 1;
    const at = f(lo) === f(hi) ? f(lo) : `${f(lo)} to ${f(hi)}`, than = hi < L.lo ? "colder than" : lo > L.hi ? "hotter than" : "unlike";
    const V = {tone: "no", dead: dead.length, wild: wild.map(r => r.v)};
    if (wild.length === got.length) return Object.assign(V, {log: nr || "every probe looks off",
      text: `${lead}${dead.length ? `The other ${got.length === 2 ? "two" : got.length}` : "All three probes"} read ${at} on their own, ${than} any room. When every probe is wrong at once, look at what they share: one bad probe or plug on their cable can do this. Unplug them one at a time to find it.`});
    return Object.assign(V, {log: nr || "a probe looks off",
      text: `${lead}${cap(andList(wild.map(r => VWHOSE[r.v])))} probe${many ? "s read" : " reads"} ${at} on ${many ? "their" : "its"} own, ${than} any room. ${many ? `Check their plugs and cables, then ${ice}` : `Check its plug and cable, then put it ${iceOne(wild[0])}.`}`});
  }
  const vals = got.map(r => r.val), spread = Math.max(...vals) - Math.min(...vals);
  if (spread <= L.tol + 1e-9) {
    const who = dead.length ? `The other ${got.length === 2 ? "two" : got.length}` : got.length === 2 ? "Both" : `All ${got.length}`;
    return {tone: dead.length ? "no" : "ok", dead: dead.length, log: nr || "agree", text: `${lead}${who} agree${f(spread) === f(0) ? ": they read the same" : `, ${f(spread)} apart at most`}.`};
  }
  const room = spread <= L.room + 1e-9;
  const V = {tone: room && !dead.length ? "near" : "no", dead: dead.length, room, log: nr || (room ? `${spread.toFixed(1)} ${U} apart` : "a probe looks off")};
  /* the odd one: the only probe the other two agree without */
  const without = got.length < 3 ? [] : got.filter(r => { const o = got.filter(x => x !== r).map(x => x.val); return Math.max(...o) - Math.min(...o) <= L.tol + 1e-9; });
  if (without.length === 1) {
    const r = without[0], warm = r.val > Math.max(...got.filter(x => x !== r).map(x => x.val)), side = `${f(spread)} ${warm ? "above" : "below"} the other two`;
    return Object.assign(V, {odd: r.v, warm, text: room
      ? `${lead}${cap(VTHE(r.v))} reads up to ${side}. That's likely where it sits, not its probe. To be sure, put the probe ${iceOne(r)}. If it doesn't, correct its offset in Hardware.`
      : `${lead}${cap(VWHOSE[r.v])} probe looks off: it reads up to ${side}. Where it sits can't explain that much. Check its plug and cable, then put it ${iceOne(r)}.`});
  }
  if (got.length === 2) {
    const pair = `${cap(VTHE(got[0].v))} and ${VTHE(got[1].v)} read ${f(spread)} apart`;
    return Object.assign(V, {text: room
      ? `${lead}${pair}. That's likely where they sit, not their probes. To be sure, ${ice}`
      : `${lead}${pair}, so a probe looks off. Where they sit can't explain that much. Check their plugs and cables, then ${ice}`});
  }
  return Object.assign(V, {text: room
    ? `${lead}They read up to ${f(spread)} apart. That's likely where the vessels sit, not their probes. To be sure, ${ice}`
    : `${lead}No two agree: they read up to ${f(spread)} apart. Where they sit can't explain that much. Are the vessels all empty? If so, ${ice}`});
}
/* the panel: DONE beside its title, so the rows and the verdict keep their room on a laptop's column. Brewing by hand,
   COMPARE PROBES sits with RECIPE BOOK and BREW STEPS at the end of the column, out of the way while a brew runs, and
   the panel opens in their place */
/* a recipe not begun has OTHER RECIPE beside COMPARE PROBES, in the row COMPARE PROBES had to itself, so choosing another
   recipe costs the column no room; each opens its box in that place (RECIPE-COLUMN.md) */
function nbHTML() {
  if (st.cmpOpen) return cmpHTML();
  if (st.rbOpen) return rbHTML();
  const off = st.link === "lost" ? PAUSED : st.pend["r:check"] ? PB_WAIT : st.pend["r:unload"] ? WAIT : "";
  return `<div class="nbrow">${b("cmdbtn", "OTHER RECIPE", "from the recipe book", {cmd: "rb:open", why: off})}${cmpHTML()}</div>`;
}
/* the recipe book in the recipe column, opened by OTHER RECIPE, as agreed with the recipe pages: the newest five, each with
   LOAD, the loaded one saying what it is doing in the recipe column's own words instead; then ALL RECIPES (the Recipe
   Book tab) and CLOSE. LOAD is one tap here, as it replaces only a recipe not begun, which stays in the book; over one the
   book doesn't have, it asks first (loadAskHTML). On one screen the box takes the step list's room, as the other boxes
   do */
function rbHTML() {
  const off = st.link === "lost" ? PAUSED : "", p = st.pend["r:load"], cur = st.recipe ? M.BOOK.findIndex(x => x.n === M.RECIPE.name) : -1;
  if (st.confirmLoad != null) return `<section class="rbox" aria-labelledby="rb-h"><h3 id="rb-h">Recipe book</h3>${loadAskHTML()}</section>`;
  const rows = M.BOOK.slice(0, 5).map((x, i) => {
    const right = i === cur ? `<span class="rbst">${rbState()}</span>`
      : b("cmdbtn", p === String(i) ? "LOADING…" : "LOAD", "", {cmd: "load:" + i, label: p === String(i) ? "" : `Load ${x.n}`, why: off || (p ? WAIT : "")});
    return `<li${i === cur ? ' class="cur"' : ""}><span class="bn">${esc(x.n)}</span><span class="bd">${esc(x.d)}</span>${right}</li>`;
  }).join("");
  return `<section class="rbox" aria-labelledby="rb-h"><h3 id="rb-h">Recipe book</h3><ul>${rows}</ul><div class="rbf">${b("cmdbtn", "ALL RECIPES", "the Recipe Book", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "CLOSE", "", {cmd: "rb:x"})}</div></section>`;
}
/* the loaded recipe's line in the book: the recipe column's status line, in capitals */
function rbState() {
  const r = st.recipe, at = `STEP ${r.cur + 1} OF ${M.RECIPE.steps.length}`;
  return `<span>${r.state === "running" ? "RUNNING" : r.state === "ready" ? "READY TO START" : "STOPPED"}</span><span>${at}</span>`;
}
function cmpHTML(byHand) {
  const off = st.link === "lost" ? PAUSED : st.pend["r:check"] ? PB_WAIT : "";
  if (!st.cmpOpen) return b("cmdbtn cpbtn", "COMPARE PROBES", "before you fill", {cmd: "cmp:open", why: off});
  const R = cmpRead(), V = cmpVerdict(R), offs = R.some(r => r.off), L = pbLim(), U = M.U;
  const row = r => {
    const dead = r.val == null, wild = (V.wild || []).includes(r.v), odd = V.odd === r.v, amber = dead || wild || (odd && !V.room);
    const tag = r.why ? (r.why === "no_probe" ? "no probe chosen" : "probe not found") : dead ? "no reading" : wild ? "looks off" : odd ? (V.room ? (V.warm ? "warmer" : "cooler") : "looks off") : "";
    // a kettle with no probe in Hardware: no probe's name, no offset, only what is wrong
    const sub = (r.why ? [] : [esc(probeName(r.v))].filter(Boolean).concat(r.off ? [`offset ${fOff(r.off)}`] : [])).concat(tag ? [`<span class="ct${amber ? "" : " near"}">${tag}</span>`] : []).join(" · ");
    return `<li${amber ? ' class="odd"' : ""}><span class="cn">${M.VNAME[r.v]}</span><span class="cp">${sub}</span><span class="cr">${dead ? "– –" : r.val.toFixed(1)}<span class="u">${U}</span></span></li>`;
  };
  return `<section class="cmp${byHand ? " byh" : ""}" aria-labelledby="cp-h"><div class="cph"><h3 id="cp-h">Compare probes</h3>${b("cmdbtn cpdone", "DONE", "adds them to LOG", {cmd: "cmp:done"})}</div>
    <p class="cpi">With every vessel empty and at room temperature.${offs ? " Each reading is the probe's own, without its offset." : ""}</p>
    <ul class="cpl">${R.map(row).join("")}</ul>
    <p class="cpv ${V.tone}"><span class="mk">${V.tone === "ok" ? MK.ok : V.tone === "near" ? MK.note : MK.no}</span><span aria-live="polite">${V.text}</span></p>
    <p class="cpn">They agree within ${L.tol.toFixed(1)}&nbsp;${U}: each probe is accurate to ±${L.each}&nbsp;${U}. Where a vessel sits can put it up to ${+L.room.toFixed(1)}&nbsp;${U} from the others; more than that, a probe looks off.</p></section>`;
}
/* DONE, or START while it is open: what they read goes in LOG, so the brew day keeps a record of it */
function cmpDone(log) {
  if (!st.cmpOpen) return;
  st.cmpOpen = false;
  if (log) {
    const R = cmpRead(), V = cmpVerdict(R);
    logEvent(`Probes compared${R.some(r => r.off) ? ", without offsets" : ""}: ${R.map(r => `${KSHORT[r.v]} ${r.val == null ? "no reading" : r.val.toFixed(1)}`).join(", ")} ${M.U}`, V.log, V.tone === "ok" ? "ok" : V.tone === "near" ? "" : "bad");
  }
  renderAll();
}
/* COMPARE PROBES opened: live, CraftBeerPi's check says which probe gives no reading, so it is asked at once, and an
   earlier answer isn't used meanwhile */
function cmpOpen() {
  st.pbOpen = false; st.rbOpen = false; st.cmpOpen = true;
  if (!DEMO_MODE) { st.pb = null; if (!pbNone) pbAsk(); }
  renderAll();
}
/* the questions about the brew that wait for you, which a reset takes down (StepController.reset_all; BrewScribe its own):
   those under a step's name, the hop alerts, Brewing Complete, Resume brew? and BrewScribe's; not a timer's alarm, nor a
   warning, nor another plugin's question. Live, the ones CraftBeerPi waits on; in the demo, as the mockup finds them, by
   their lines in LOG */
function brewQuestions() {
  const names = new Set([...M.RECIPE.steps.map(s => s.n), "Hop Alert", "Brewing Complete", "Resume brew?", "BrewScribe", DEMO.PH_Q[0].title]);
  if (!DEMO_MODE) return st.prompts.map(p => ut(String(p.title || ""))).filter(t => names.has(t) || t.startsWith("BrewScribe: "));
  return st.events.filter(e => e[2] === "waiting for you" && names.has(e[1].split(":")[0])).map(e => e[1].split(":")[0]);
}
/* the title bar's question is one of them: BrewScribe's are titled "BrewScribe: …", so they go by its name */
const brewAsks = (q, x) => q.has(x.title) || (x.title.startsWith("BrewScribe: ") && q.has("BrewScribe"));
/* ---------- the strike water box (design/brewday/STRIKE-WATER.md) ----------
   Under START, STOP and NEXT STEP (and COMPARE PROBES), from the recipe's loading until the malt goes in: how much
   water goes to the mash tun and how hot, where the mash lands once the grain is in, and the forecast and its numbers.
   It offers USE, which puts the strike temperature the forecast works out in the recipe for the strike water, and then
   BACK TO, in the same place; not pressing it is Kal's way. It never changes anything by itself. It gives way to a
   question or a panel in the same place, as they give way to each other.
   CraftBeerPi works its figures out (core's strike water helper: GET /step2/strike, and the topic "strike", whose state
   is st.sw), and USE, BACK TO, the HLT's water and the grain's temperature are its calls. The demo makes the same state
   from the mockup's numbers (strike-demo.js). The strike water step is a MashInStep on the HLT where the recipe has one;
   without one it is a Ready by BrewStart, which heats the HLT itself and holds the water (BrewStart 1.3.0). Its
   phases, by the recipe's place: "plan" while BrewStart is next or waits, "heat" while BrewStart or the strike water
   step heats and holds the water, "moved" while MashIn on the Mash Tun brings the water to the rest before the malt. A
   recipe without the brewer's flow in front (no strike water step) has the box only while it waits to start and the
   HLT heats the strike water by hand; there USE sets the HLT's target, as SET would */
/* the limits, in the brewery's unit: within half a degree the strike water is USE's (SW_SAME); a room's reading is
   35-120 °F; a figure more than 27 °F above the rest is too far to trust, and so is one over MashInStep's ceiling, the
   hottest strike water the box sets; with the pump stopped, a Mash Tun reading 3 °F over the forecast isn't the mash */
const swC = () => M.U === "°C";
const swHalf = () => swC() ? 0.3 : 0.5;
const swRoom = () => swC() ? [1.5, 49] : [35, 120];
const swRise = () => swC() ? 15 : 27;
/* the ceiling, as CraftBeerPi sends it in its state; one that doesn't send it has MashInStep's own, 179.6 °F (82 °C).
   A temperature is over it as CraftBeerPi counts it, to 0.1, the figure its button shows */
const swCeil = () => num(st.sw && st.sw.ceiling) ?? (swC() ? 82 : 179.6);
const swOverCeil = T => T != null && Math.round(T * 10) > Math.round(swCeil() * 10);
const swDough = () => swC() ? 1.7 : 3;
const swVU = () => (st.sw && st.sw.vol_unit) || "gal";
const swMU = () => (st.sw && st.sw.mass_unit) || "lb";
/* the recipe's step ids, as START sends them, so CraftBeerPi changes only the recipe this screen shows */
const swIds = () => M.RECIPE.steps.map(s => s.id).filter(x => x != null);
/* the state belongs to the recipe this screen shows: one that hasn't caught up with it shows no box */
function swSameRecipe(S) {
  if (DEMO_MODE) return true;
  const a = (S.recipe && Array.isArray(S.recipe.steps)) ? S.recipe.steps.map(String) : [], b2 = swIds().map(String);
  return a.length === b2.length && a.every((x, i) => x === b2[i]);
}
/* the box's phase, CraftBeerPi's; brewing by hand only while the recipe waits to start and the mash tun isn't in AUTO */
function swPhase() {
  const S = st.sw, r = st.recipe;
  if (!S || !S.applies || !S.phase || !r || !swSameRecipe(S)) return null;
  if (S.by === "hand" && (r.cur !== 0 || r.state !== "ready" || r.held || st.v.mt.mode === "auto")) return null;
  return S.phase;
}
/* BrewStart in the recipe: the HLT's water and the grain's temperature are its settings */
const swBrewStart = () => !!(st.sw && st.sw.step_ids && st.sw.step_ids.brewstart != null);
/* what the model takes the Mash Tun probe at the coil's outlet to read with the wort pump stopped (rig.still_probe): 0,
   the HLT's water left in the coil, up to 1, the room it cools toward */
const swStillProbe = () => Math.min(1, Math.max(0, num(st.sw && st.sw.rig && st.sw.rig.still_probe) || 0));
/* the box's numbers (N, the mockup's names), from CraftBeerPi's state: what USE is worked out from, and its answer, the
   last it worked out (with the numbers it came from, A). While it works USE out again (work: since, why) that answer is
   still shown, for the numbers it came from (stale); with none yet (wait), there is nothing to show but that it is
   working. Failed: it couldn't work one out for these numbers, and nothing is coming until a number changes. A forecast
   is found by its strike, to 0.1 (fc); one CraftBeerPi hasn't sent yet is none. A USE over the ceiling is too far even
   where CraftBeerPi doesn't say so, as with an answer it kept from an older version: it is never offered. For the
   words when the recipe lacks what USE is worked out from: which of BeerSmith's mash figures it lacks (lacks), which
   the brewer gave on Brew Day (recTyped) and the mash step's name. Every number CraftBeerPi finds missing (misses), the
   first of them its miss; from a core that sends only that one, that one. Whether CraftBeerPi takes the recipe's
   figures and the room given here (canRec, canRoom: a core that sends recipe.typed and inputs.room_from). The room: the
   boil kettle's probe's, or the one given on Brew Day while the probe gives no reading a room can have (roomFrom
   "you"); the one given, kept aside while the probe reads a room again (roomGiven); the probe's own reading
   (roomProbe) */
function swNumbers() {
  const S = st.sw, R = S.recipe || {}, I = S.inputs || {}, A = S.answer;
  const N = {plan: I.planned ?? null, rest: I.rest, room: I.room ?? null, typed: I.typed ?? null, grain: I.grain ?? null, vol: I.vol ?? null,
    left: I.left ?? null, step: S.by === "step", gal: R.strike_vol ?? null, probe: I.probe || "coil", interval: S.sample_time ?? null, R,
    lacks: Array.isArray(R.lacks) ? R.lacks : [], recTyped: Array.isArray(R.typed) ? R.typed : [], mashName: swMashName(S),
    misses: Array.isArray(S.misses) ? S.misses : S.miss ? [S.miss] : [],
    roomFrom: I.room_from === "you" ? "you" : "probe", roomGiven: num(I.room_given), roomProbe: I.room_probe === undefined ? I.room ?? null : num(I.room_probe),
    canRec: Array.isArray(R.typed), canRoom: "room_from" in I};
  if (S.miss && S.miss !== "far") return Object.assign(N, {miss: S.miss});
  N.work = S.working || null;
  if (!A) return Object.assign(N, S.failed && !N.work ? {failed: S.failed} : {wait: true});
  if (S.miss === "far" || A.use == null || swOverCeil(A.use)) return Object.assign(N, {miss: "far", strike: A.use});
  /* the levers come a few minutes after USE: "working" while they are still coming, "ready" with them, and none come for
     this answer once they failed, were overtaken by new numbers, or USE is too far above the rest */
  const L = A.levers || null, lvs = A.levers_status || (L ? "ready" : null);
  return Object.assign(N, {ok: true, stale: !!N.work, A: A.numbers || {}, strike: A.use, restPeak: A.rest_peak, lvWait: lvs === "working",
    mid: L ? L.mid : null, top: L && Array.isArray(L.top) ? L.top : [], lv: (L && L.rise) || {}, fc: T => swFc(A, T)});
}
const swFc = (A, T) => T == null ? null : (A.forecasts || []).find(f => f && Math.round(f.strike * 10) === Math.round(T * 10)) || null;
/* the mash step's name: the step CraftBeerPi takes the rest from (step_ids.mash_in), else the first on the mash tun */
function swMashName(S) {
  const id = S.step_ids && S.step_ids.mash_in, steps = M.RECIPE.steps;
  const s = (id != null && steps.find(x => String(x.id ?? x.n) === String(id))) || steps.find(x => x.k === "mt");
  return s ? s.n : "The mash step";
}
/* how long CraftBeerPi has been working USE out, on its brewing clock: counted on from its state as the timers are */
function swElapsed() {
  const S = st.sw, w = S && S.working;
  if (!w) return 0;
  const gone = DEMO_MODE ? 0 : Math.max(0, Date.now() - (S.received || Date.now())) / 1000 * (num(S.scale) || 1);
  return Math.max(0, Math.floor((DEMO_MODE ? st.t : num(S.now) + gone) - num(w.since)));
}
const swSecs = s => s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
const SW_WORKING = "Not yet: CraftBeerPi is still working USE out for this recipe.";
const SW_WHY = {vol: "the HLT's water changed", grain: "the grain's temperature changed", room: "the room's temperature moved"};
/* what the figures shown were worked out for, by what has changed since */
function swWas(N) {
  const A = N.A, w = N.work && N.work.why;
  if (w === "vol" && A.vol != null) return `${+A.vol.toFixed(2)} ${swVU()} in the HLT`;
  if (w === "grain" && A.grain != null) return `grain at ${A.grain.toFixed(1)} ${M.U}`;
  if (w === "room" && A.room != null) return `the room at ${A.room.toFixed(1)} ${M.U}`;
  return "the numbers before";
}
/* while CraftBeerPi works USE out: that it is, and for how long so far (sw-el, counted on by the clock's tick). One short
   line, so the step list under the closed box keeps its room; why, and what the figures shown meanwhile are for, are
   said where they are read: above the chart, and by the greyed USE */
function swWorkSays(N) {
  return `Working out USE${N.wait ? "" : " again"}: <span id="sw-el">${swSecs(swElapsed())}</span> so far.`;
}
const swWhy = N => SW_WHY[N.work && N.work.why] || "the numbers it is worked out from changed";
const swT = x => `${+(+x).toFixed(1)}&nbsp;${M.U}`;
/* a range, read out as "to"; whole degrees for the mash, where its ends meet one figure */
const swTo = (x, y) => `${x}<span aria-hidden="true">–</span><span class="sr"> to </span>${y}`;
const swR = (a, b2) => { const x = Math.round(a), y = Math.round(b2); return x === y ? `${x}` : swTo(x, y); };
/* over the rest by the strike's doing: the forecast's highest point more than half a degree above both the rest and
   where water heated only to the rest would take the mash, as CraftBeerPi counts a target reached */
const swOver = (N, F) => F.peak > Math.max(N.rest, N.restPeak ?? N.rest) + swHalf();
/* over the rest at all, as the screen shows a temperature, to 0.1 */
const swShows = (N, F) => F.peak >= N.rest + 0.05;
/* the other choice beside the strike water as planned: USE's temperature, until it is the one planned; then BACK TO's,
   the temperature before the first USE, or the rest. None once the water has gone to the mash tun, nor where USE comes
   out at the rest itself with the strike water at the rest already */
function swAlt(N) {
  if (!N.ok || N.strike == null || swPhase() === "moved") return null;
  if (N.plan == null || Math.abs(N.plan - N.strike) >= swHalf()) return N.strike;
  if (st.sw.was != null) return st.sw.was;
  return Math.abs(N.plan - N.rest) < swHalf() ? null : N.rest;
}
/* what the mash does with each choice of strike water, in words: where it lands as the grain goes in, and where it is
   half an hour later; how high it could go, where that shows over the rest. Then once for all of them: that none is
   forecast to go over the rest, or that going over it is PID_HERMS's own overshoot, which it makes whatever the
   strike. list: [temperature, its role], the strike water as planned first; one without its forecast yet is left out */
function swWords(N, list) {
  list = list.filter(([T]) => N.fc(T));
  if (!list.length) return "";
  const U = M.U, F = list.map(([T]) => N.fc(T)), own = N.restPeak != null && N.restPeak >= N.rest + 0.05;
  const say1 = ([T, role], f, i) => {
    const at = `At ${T.toFixed(1)}&nbsp;${U}, ${role}, ${i ? "it" : "the mash"} lands <b>${swR(f.lo[0], f.hi[0])}&nbsp;${U}</b>${i ? "" : " as the grain goes in"}`;
    if (swOver(N, f)) return `${at} and could reach <b>${Math.round(f.peak)}&nbsp;${U}</b>, over the rest: the HERMS can't cool it.`;
    const later = `${swR(f.lo[30], f.hi[30])}&nbsp;${U} half an hour later`;
    return swShows(N, f) ? `${at}, is ${later}, and could reach ${swT(f.peak)}.` : `${at} and is ${later}.`;
  };
  const showing = F.filter(f => swShows(N, f)), allOwn = showing.every(f => !swOver(N, f) && f.peak <= N.restPeak + 0.05);
  const tail = !showing.length ? ` ${list.length > 1 ? "Neither is" : "It isn't"} forecast to go over the ${swT(N.rest)} rest.`
    : own && allOwn ? ` Going over the rest is PID_HERMS's own overshoot, which it makes whatever the strike: with the water heated only to the rest, it takes the mash to ${swT(N.restPeak)}.`
    : own ? ` With the water heated only to the rest, PID_HERMS by itself takes the mash to ${swT(N.restPeak)}.` : "";
  return list.map((x, i) => say1(x, F[i], i)).join(" ") + tail;
}
/* the recipe lacks what USE is worked out from (CraftBeerPi's miss "recipe"): the mash step's temperature, which Brew
   Steps gives; or the grain weight or the strike water to the mash tun (the mash water), which can be typed here
   (swRec), named where CraftBeerPi has neither BeerSmith's, one given here, nor for the grain a mash step's own grain
   weight. Nothing else is named: the mash tun's weight comes from the Hardware page or the recipe and only narrows the
   forecast, and BeerSmith's own strike temperature and the grain's and the tun's are only FORECAST's comparison. The
   other way is the recipe's BeerSmith file imported again with UPDATE, which gives the loaded recipe BeerSmith's
   figures at once, nothing loaded again (core post72). From a CraftBeerPi that takes no figures here, importing again
   and loading the recipe again. more: another sentence follows, so this one leaves out why it matters and the box
   still fits one screen */
const swOr = a => a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} or ${a[a.length - 1]}`;
/* the recipe's figures CraftBeerPi lacks for USE, by their names in swRec: the grain weight, the mash water */
const swRecLacks = N => [N.R.grain == null && "grain", N.R.strike_vol == null && "water"].filter(Boolean);
const SW_REC_NAME = {grain: "grain weight", water: "mash water"};
const SW_UPDATE = "import its BeerSmith file again and choose UPDATE.";
function swMissRecipe(N, more = false) {
  if (N.rest == null) return `${esc(N.mashName)} has no temperature, so where the mash lands isn't known. Give it one in Brew Steps.`;
  const L = swRecLacks(N), why = ", so where the mash lands isn't known.";
  if (!L.length) return `This recipe lacks BeerSmith's mash figures${why} ${N.canRec ? `I${SW_UPDATE.slice(1)}` : "Import it again and load it."}`;
  const named = `This recipe has no ${swOr(L.map(k => SW_REC_NAME[k]))} from BeerSmith`;
  return N.canRec ? `${named}${more ? "." : why} Type ${L.length > 1 ? "them" : "it"} here, or ${SW_UPDATE}` : `${named}${why} Import it again and load it.`;
}
/* why there's no forecast, in the buttons' place */
const SW_MISS = {
  recipe: swMissRecipe,
  /* the room, which can be typed here while the probe can't stand for it (swRec) */
  probe: N => `The boil kettle's probe gives no reading, so the room's temperature isn't known${N.typed == null ? ", nor the grain's" : ""}. Check its plug and cable${N.canRoom ? ", or type the room's temperature here" : ""}.`,
  room: N => `The boil kettle's probe reads ${N.room.toFixed(1)}&nbsp;${M.U}, ${N.room > swRoom()[1] ? "warmer" : "colder"} than any room, so it can't stand for the room${N.typed == null ? " or the grain" : ""}.${N.canRoom ? " Type the room's temperature here." : ""}`,
  /* BrewStart's Grain temperature, saved on Brew Steps, that the forecast can't use: not a number, or one no room has.
     GRAIN beside it opens the grain's box, whose own line says what to give */
  grain: N => `${swBrewStart() ? "BrewStart's grain temperature" : "The grain's temperature"} ${Number.isFinite(N.typed) ? `is ${N.typed.toFixed(1)}&nbsp;${M.U}, ${N.typed > swRoom()[1] ? "warmer" : "colder"} than any room` : "isn't a number"}. The forecast can't use it.`,
  vol: () => "How much water is in the HLT, strike and sparge? The forecast needs it.",
  /* too far to offer: more than 27 °F above the rest; or within that, over the ceiling, which only a rest above
     152.6 °F can bring */
  far: N => N.strike - N.rest <= swRise() && swOverCeil(N.strike)
    ? `It works out at ${swT(N.strike)}, over ${swT(swCeil())}: too hot for strike water. ${swCheck(N)}`
    : `It works out at ${swT(N.strike)}, more than ${swRise()}&nbsp;${M.U} above the rest: too far to trust. ${swCheck(N)}`,
  /* the mash tun's control interval (PID_HERMS's SampleTime), as the Hardware page names it and the values it offers:
     CraftBeerPi asks for it only for a fraction from 1 to 60 s, which the forecast's replay can't step through. "isn't
     a number" is a safety net: PID_HERMS runs one that isn't at its default */
  sample_time: N => `The mash tun's control interval ${num(N.interval) != null ? `is ${num(N.interval)}&nbsp;s` : "isn't a number"}. The forecast can't use it: set it to 2 or 5&nbsp;s in Hardware.`
};
/* the probe's miss behind another, from a CraftBeerPi that takes the room given here: said after the first miss's
   sentence, short, as ROOM beside it asks for the room, so the box fits one screen with every figure asked for */
const SW_MISS_TOO = {
  probe: () => "The boil kettle's probe gives no reading either.",
  room: N => `The boil kettle's probe reads ${N.room.toFixed(1)}&nbsp;${M.U}, ${N.room > swRoom()[1] ? "warmer" : "colder"} than any room.`
};
/* what stands for the grain's temperature when none is given: the room, from the boil kettle's probe or given here */
const swRoomSrc = N => N.roomFrom === "you" ? "the room's temperature given here" : "the boil kettle's probe";
/* where a USE too far comes from: the grain weight and the water, BeerSmith's, or those given here */
const swCheck = N => N.recTyped.length ? "Check the grain weight and the mash water given here." : "Check the grain weight and the water in BeerSmith.";
/* CraftBeerPi's work on USE failed for these numbers: no USE, the strike water as it is, and where to read why (LOG has
   its line, swFailLog) */
function swFailedSays(N) {
  const T = N.plan != null ? `${N.plan.toFixed(1)}&nbsp;${M.U}` : null;
  const stays = N.step ? `The strike water stays as planned${T ? `, at ${T}` : ""}.` : T ? `The HLT's target stays at ${T}.` : "The HLT's target stays as it is.";
  return `CraftBeerPi couldn't work out a forecast for these numbers, so there's no USE. ${stays} What went wrong is in LOG.`;
}
/* the box without a forecast: why; then, where CraftBeerPi lacks a figure the brewer can give, its button with its
   figure or "give it" (swAsks); then USE, HLT WATER and GRAIN side by side, as USE and FORECAST sit in the box with
   one. USE in its place, greyed, saying on a tap what it needs. HLT WATER and GRAIN whatever is missing, each with its
   figure, as they are the brewer's to give and CraftBeerPi takes them without the recipe's figures (POST
   /step2/strike/water refuses too little only where the recipe gives its strike water). The water is asked for
   whenever it is missing, whatever else is: its question after why, and HLT WATER "set it". A button's box, open,
   takes the place of the sentence and the buttons, so the box is no taller than the water's box alone on one screen */
function swMissHTML(N) {
  if (st.swVol) return swVolHTML(N);
  if (st.swGrain) return swGrainHTML(N);
  if (st.swRec) return swRecHTML(N);
  const asks = swAsks(N), ask = asks.length ? `<div class="swa ${["one", "two", "three"][asks.length - 1]}">${asks.map(k => swRecBtn(N, k)).join("")}</div>` : "";
  const noVol = N.miss === "vol" || N.misses.includes("vol") || N.vol == null;
  const too = N.canRoom ? N.misses.filter(k => k !== N.miss && SW_MISS_TOO[k] && (k !== "room" || N.room != null)).map(k => ` ${SW_MISS_TOO[k](N)}`).join("") : "";
  const vq = noVol && N.miss !== "vol" ? ` ${SW_MISS.vol()}` : "";
  const first = N.failed ? swFailedSays(N) : N.miss === "recipe" ? swMissRecipe(N, !!(too || vq)) : SW_MISS[N.miss] ? SW_MISS[N.miss](N) : "";
  const line = first + too + vq;
  const use = b("cmdbtn swuse", `USE –&nbsp;–&nbsp;${M.U}`, N.miss === "far" ? "too far to trust" : "can't work it out", {cmd: "sw:use", why: swNoUse(N)});
  const VU = swVU(), water = noVol ? "set it" : `${+N.vol.toFixed(2)}&nbsp;${VU} · change`;
  /* the grain's figure in use: given, else the boil kettle's probe, which stands for nothing while it gives no reading
     or one no room has */
  const typed = Number.isFinite(N.typed), probe = !typed && N.room != null && N.miss !== "probe" && N.miss !== "room";
  const grain = N.miss === "grain" || N.misses.includes("grain") ? "change it" : typed ? `${N.typed.toFixed(1)}&nbsp;${M.U} · change`
    : probe ? `${N.room.toFixed(1)}&nbsp;${M.U} · change` : "give it";
  return `<p class="swl">${line}</p>${ask}<div class="swa three">${use}${b("cmdbtn", "HLT WATER", water, {cmd: "swv:open", expanded: false})}`
    + `${b("cmdbtn", "GRAIN", grain, {cmd: "swg:open", expanded: false})}</div>${N.vol != null ? hltOverHTML(N.vol, VU) : ""}`;
}
/* the figures CraftBeerPi can't have without the brewer, given here: the recipe's grain weight and its strike water to
   the mash tun (the mash water), kept with the loaded recipe (POST /step2/strike/recipe), and the room's temperature
   for this brew, which stands for the room while the boil kettle's probe gives no reading a room can have (POST
   /step2/strike/room). Each with its button's words, its box's label and line, its unit and decimal places, the range
   CraftBeerPi takes, and its name in LOG's lines */
const SW_REC = {
  grain: {btn: "GRAIN WEIGHT", name: "Grain weight", places: 1, unit: () => swMU(), many: () => swMU() === "kg" ? "kilograms" : "pounds",
    one: () => swMU() === "kg" ? "kilogram" : "pound", range: () => swMU() === "kg" ? [0.2, 90] : [0.5, 200],
    help: "All the grain in the mash, as the recipe's grain bill has it. Kept with this recipe as given here, not as BeerSmith's."},
  water: {btn: "MASH WATER", name: "Mash water", places: 2, unit: () => swVU(), many: () => swUnitWords()[0],
    one: () => swUnitWords()[1], range: () => swVU() === "L" ? [2, 380] : [0.5, 100],
    help: "The strike water that goes to the mash tun, not the sparge. Kept with this recipe as given here, not as BeerSmith's."},
  room: {btn: "ROOM", name: "Room temperature", places: 1, unit: () => M.U, many: () => M.U, one: () => "degree", range: () => swRoom(),
    help: "Where the mash tun and the grain stand, for this brew. Used while the boil kettle's probe gives no reading a room can have; once it reads one again, the probe's is used."}
};
const swRecPlaces = k => SW_REC[k].places;
/* a figure's value as CraftBeerPi has it now, whoever gave it, and whether it was given here */
const swRecFig = (N, k) => k === "grain" ? num(N.R.grain) : k === "water" ? num(N.R.strike_vol) : N.roomGiven;
const swRecGiven = (N, k) => k === "room" ? N.roomGiven != null : N.recTyped.includes(k);
/* which to ask for: the recipe's figures CraftBeerPi lacks for USE, or gave here, while the recipe is what's missing; the
   room while the probe can't stand for it, or the one given here stands for it. Only from a CraftBeerPi that takes them
   (its recipe's typed, its room_from) */
function swAsks(N) {
  const out = [];
  if (N.canRec && N.misses.includes("recipe") && N.rest != null) out.push(...["grain", "water"].filter(k => swRecFig(N, k) == null || swRecGiven(N, k)));
  if (N.canRoom && (N.misses.includes("probe") || N.misses.includes("room") || N.roomFrom === "you")) out.push("room");
  return out;
}
const swRecBtn = (N, k) => { const v = swRecFig(N, k), D = SW_REC[k];
  return b("cmdbtn", D.btn, v != null && swRecGiven(N, k) ? `${+v.toFixed(D.places)}&nbsp;${D.unit()} · change` : "give it", {cmd: `swr:open:${k}`, expanded: false}); };
/* the figure's box, as the HLT water's: −1 −.1, the number, +.1 +1, then SET and CANCEL. The room given has THE PROBE
   too, which takes it back */
function swRecHTML(N) {
  const e = st.swRec, k = e.kind, D = SW_REC[k], q = D.places, v = e.val, x = v == null ? "" : v.toFixed(q), pend = st.pend.swr;
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "";
  const key = (d, l) => `<button type="button" data-cmd="swr:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  const back = k === "room" && N.roomGiven != null ? `<button type="button" class="swprobe" data-cmd="swr:back"${dis}>${pend === "back" ? "SETTING…" : "THE PROBE"}<small>the ${swT(N.roomGiven)} given taken back</small></button>` : "";
  return `<div class="editor swvol" role="group" aria-labelledby="swr-l"><label class="swvl" id="swr-l" for="swrin">${D.name}, in ${D.many()}</label>`
    + `<p class="swvh" id="swr-h">${D.help}</p>`
    + `${key(-1, `1 ${D.one()} less`)}${key(-0.1, `0.1 ${D.one()} less`)}<input id="swrin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swr-h">${key(0.1, `0.1 ${D.one()} more`)}${key(1, `1 ${D.one()} more`)}`
    + `<button type="button" class="ok" data-cmd="swr:set"${dis}>${pend === "set" ? "SETTING…" : `SET <span id="swrok">${x || "– –"}</span> ${D.unit()}`}</button><button type="button" class="no" data-cmd="swr:x">CANCEL</button>${back}</div>`;
}
/* a figure given here (swRecHTML): SET sends it, and CraftBeerPi works USE out from it at once; changed back the same way,
   so nothing asks first. One no brew comes near is refused here, as CraftBeerPi refuses it. A recipe changed or gone, or
   a figure BeerSmith gave meanwhile, closes the box; one out of range keeps it open with the figure, to be put right */
function swRec(x, y) {
  const N = swNumbers(), e = st.swRec;
  if (x === "open") {
    st.swVol = null;
    st.swGrain = null;
    st.swRec = {kind: y, val: swRecFig(N, y)};
    renderAll();
    return swOpened("#swrin");
  }
  if (x === "x") { st.swRec = null; return renderAll(); }
  if (!e || st.pend.swr) return;
  const k = e.kind, D = SW_REC[k], q = D.places, U = D.unit(), was = swRecFig(N, k), given = swRecGiven(N, k), [lo, hi] = D.range();
  const fmt = v => `${v.toFixed(q)} ${U}`, small = D.name.toLowerCase();
  if (x === "step") {
    const from = e.val ?? (k === "room" ? (M.U === "°C" ? 20 : 68) : 0);
    e.val = Math.max(0, Math.round((from + parseFloat(y)) * 10 ** q) / 10 ** q);
    return renderAll();
  }
  const refused = head => (d, status) => {
    if (status === 400) return d.error === "out_of_range" ? `${head}: it has to be between ${num(d.low) ?? lo} and ${num(d.high) ?? hi} ${U}.` : "";
    if (d.error === "beersmith") { st.swRec = null; return `${head}: the recipe has BeerSmith's own, which stays.`; }
    const why = d.error === "recipe_changed" || d.error === "off" ? swWhyNot(d) : "";
    if (why) st.swRec = null;
    return why ? `${head}: ${why}.` : "";
  };
  const fail = `The ${small} did not change. ${given && was != null ? `It is still ${fmt(was)}.` : "None is given yet."}`;
  if (x === "back") {
    if (N.roomGiven == null) { st.swRec = null; return renderAll(); }
    const label = `Room temperature from the boil kettle's probe, the ${fmt(N.roomGiven)} given taken back`;
    if (DEMO_MODE) return send("swr", "back", label, swDemoRec("room", null));
    return swExec("swr", "back", label, () => api.strikeRoom(null, swIds()), {ok: () => { st.swRec = null; return label; },
      refused: refused(`The ${fmt(N.roomGiven)} given wasn't taken back`), fail});
  }
  const v = e.val;
  if (v == null) return note("r", `Type the ${small}, in ${D.many()}.`);
  if (v < lo || v > hi) return note("r", `The ${small} has to be between ${lo} and ${hi} ${U}.`);
  if (given && was != null && Math.abs(v - was) < 0.5 / 10 ** q) { st.swRec = null; return renderAll(); }
  const label = `${D.name} set to ${fmt(v)} ${k === "room" ? "for this brew" : "for this recipe"}${given && was != null ? `, was ${fmt(was)}` : ""}`;
  if (DEMO_MODE) return send("swr", "set", label, swDemoRec(k, v));
  swExec("swr", "set", label, () => k === "room" ? api.strikeRoom(v, swIds()) : api.strikeRecipe(k === "grain" ? {grain: v} : {strike_vol: v}, swIds()), {
    ok: d => { st.swRec = null; return k === "room" && d.applied && d.applied.used === false ? `${label}: kept aside, as the boil kettle's probe reads the room` : label; },
    refused: refused(`The ${small} wasn't set to ${fmt(v)}`), fail
  });
}
/* what USE needs, said on a tap of it greyed: the sentence above it, from USE's side */
function swNoUse(N) {
  const U = M.U;
  if (N.failed) return "CraftBeerPi couldn't work USE out for these numbers. What went wrong is in LOG.";
  if (N.miss === "recipe") {
    if (N.rest == null) return `USE needs ${N.mashName}'s temperature: give it one in Brew Steps.`;
    const L = swRecLacks(N);
    if (!L.length) return `USE needs the recipe's mash figures from BeerSmith: ${N.canRec ? SW_UPDATE : "import the recipe again and load it."}`;
    return `USE needs the recipe's ${swAnd(L.map(k => SW_REC_NAME[k]))}: ${N.canRec ? `give ${L.length > 1 ? "them" : "it"} with ${swAnd(L.map(k => SW_REC[k].btn))}, or ${SW_UPDATE}` : "import the recipe again and load it."}`;
  }
  if (N.miss === "vol") return "USE needs how much water is in the HLT, strike and sparge: set it with HLT WATER.";
  if (N.miss === "grain") return "USE needs a grain temperature it can use: change it with GRAIN.";
  if (N.miss === "probe") return `USE needs the room's temperature, and the boil kettle's probe gives no reading: ${N.canRoom ? "give it with ROOM, or check the probe's plug and cable" : "check its plug and cable"}.`;
  if (N.miss === "room" && N.room != null) return `USE needs the room's temperature, and the boil kettle's probe reads ${N.room.toFixed(1)} ${U}, ${N.room > swRoom()[1] ? "warmer" : "colder"} than any room${N.canRoom ? ": give it with ROOM" : ""}.`;
  if (N.miss === "sample_time") return "USE needs the mash tun's control interval at 2 or 5 s: set it in Hardware.";
  if (N.miss === "far") {
    const T = num(N.strike);
    if (T == null) return `USE isn't offered for these numbers. ${swCheck(N)}`;
    const hot = N.rest != null && T - N.rest <= swRise() && swOverCeil(T);
    return `USE isn't offered: ${T.toFixed(1)} ${U} is ${hot ? `over ${+swCeil().toFixed(1)} ${U}, too hot for strike water` : `more than ${swRise()} ${U} above the rest, too far to trust`}. ${swCheck(N)}`;
  }
  return "USE can't be worked out for these numbers.";
}
/* a grain temperature in LOG's words: BrewStart's can be saved as something that isn't a number */
const swGrainSays = t => Number.isFinite(t) ? `${t.toFixed(1)} ${M.U}` : "not a number";
/* the strike water as planned without its forecast yet, changed elsewhere (its Temp edited on Brew Steps, or by hand
   the HLT's target set): CraftBeerPi sends one within a second or so, and the screen doesn't ask for it. MASH says it
   is working out for the first SW_FC_WAIT ms (swFcGap: that strike, and since when), then shows its dashes alone, so
   nothing claims to be working when nothing comes */
const SW_FC_WAIT = 10000;
let swFcGap = null;
function swFcComing(T) {
  if (!swFcGap || swFcGap.T !== T) swFcGap = {T, at: Date.now()};
  return Date.now() - swFcGap.at < SW_FC_WAIT;
}
/* the window, a small PID window as the faceplates have: the strike water as planned, and where the mash lands as the
   grain goes in, a range while the rig is unmeasured. One line each, whatever the column's width, so nothing under it
   moves as they change. A mash the forecast takes over its rest, which the HERMS can't bring down, in Prompt Amber, with
   how high, and said. While USE is worked out, the mash's figures are the last answer's, in the stale grey readings
   take, or with no answer yet, dashes and that it is working. So too while the strike water as planned has no
   forecast yet (swFcComing) */
function swWin(N) {
  const U = M.U, gal = N.gal == null ? "– –" : N.gal.toFixed(2), T = N.plan == null ? "– –" : N.plan.toFixed(1);
  let mash = "– –", hot = false;
  const F = N.ok && N.plan != null ? N.fc(N.plan) : null, gap = N.ok && N.plan != null && !F;
  if (!gap) swFcGap = null;
  if (N.wait || (gap && swFcComing(N.plan))) mash = `<b>– –</b><span class="swk">working out</span>`;
  else if (F) {
    hot = swOver(N, F);
    mash = hot ? `<span class="swk">up to</span><b>${Math.round(F.peak)}</b><span class="u">${U}</span><span class="swk">over the rest</span>`
      : `<span class="swk">lands</span><b>${swR(F.lo[0], F.hi[0])}</b><span class="u">${U}</span>`;
  }
  return `<dl class="swv"><dt>STRIKE</dt><dd><b>${gal}</b><span class="ug">${swVU()}</span><span class="swk">at</span><span class="swt"><b>${T}</b><span class="u">${U}</span></span></dd><dt>MASH</dt><dd class="swm${hot ? " hot" : ""}${N.stale ? " stale" : ""}">${mash}</dd></dl>`;
}
/* the numbers USE hasn't got from the rig yet, each a range USE allows for in full, in the order of how much knowing it
   would raise USE: its line on the screen, its range in words, and its name in a sentence */
const swPct = x => `${Math.round(x * 100)}&nbsp;%`;
const SW_GUESS = [
  ["next_min", "TO NEXT", g => `${swTo(+g.low, +g.high)}&nbsp;min from the grain going in to pressing Next`, "the minutes from the grain to Next"],
  ["tun_share", "TUN STEEL", g => `${swTo(Math.round(g.low * 100), swPct(g.high))} of it warmed by the water at once`, "how much of the tun's steel warms"],
  ["tun_loss", "TUN LOSS", g => `${swTo(+g.low, +g.high)}&nbsp;W/K: how fast it loses heat with the pump running`, "the tun's heat loss"],
  ["transfer_f", "ON THE WAY", g => `${swTo(+g.low, +g.high)}&nbsp;${M.U} lost between the HLT and the tun`, "the heat lost on the way"],
  ["coil_ua", "COIL", g => `${swTo(+g.low, +g.high)}&nbsp;W/K: how fast it passes heat to the wort`, "the coil"],
  ["dough_min", "TO GRAIN", g => `${swTo(+g.low, +g.high)}&nbsp;min from the water reaching the tun to the grain going in`, "the minutes from the water to the grain"],
  ["flow", "WORT PUMP", g => `${swTo(+g.low, +g.high)}&nbsp;L/min through the coil`, "the wort pump's flow"],
  ["grain_c", "MALT", g => `${swTo(g.low, g.high)}&nbsp;cal/g&nbsp;°C: how much heat it holds`, "the malt's heat"],
  ["hlt_loss", "HLT LOSS", (g, left) => `${swTo(Math.round(g.low * 100), swPct(g.high))} of its heat loss at ${+(+(g.at ?? 15)).toFixed(2)}&nbsp;${swVU()}, with ${left}&nbsp;${swVU()} left in it`, "the HLT's heat loss"],
  ["hlt_steel", "HLT STEEL", g => `${swTo(+g.low, +g.high)}&nbsp;kg with its coil, still hot when the water goes`, "the HLT's steel"],
  ["probe_lag", "PROBE LAG", g => `${swTo(+g.low, +g.high)}&nbsp;s: how far the mash probe's reading trails the wort`, "the mash probe's lag"]
];
/* a list in words: "a, b and c" */
const swAnd = a => a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
/* Campden tablets, as BrewStart writes them (format_tablets): quarters, ¼ to ¾, after the whole ones */
const QUARTERS = ["", "¼", "½", "¾"];
function swTablets(x) {
  const q = Math.round(x * 4), whole = Math.floor(q / 4), rest = q % 4;
  return `${whole ? whole : ""}${QUARTERS[rest]}` || "0";
}
const swCampdenText = x => `${swTablets(x)} tablet${x > 1 ? "s" : ""}`;
/* the dose BrewStart states for the HLT's water now, or none */
const swCampden = () => { const c = num(st.sw && st.sw.inputs && st.sw.inputs.campden); return c != null && c > 0 ? c : null; };
/* a vessel's own figures from the Hardware page, where CraftBeerPi's forecast takes them (its state's vessels: "mt" or
   "hlt" from "hardware"); else null: the recipe's tun, the HLT's steel measured on the rig or still a guess */
const swHw = k => { const v = st.sw && st.sw.vessels && st.sw.vessels[k]; return v && v.from === "hardware" && num(v.empty_weight) != null ? v : null; };
/* such a figure in a sentence: "33 lb of stainless steel", "of aluminum", "of a material holding 0.09 cal/g °C", and with
   no material "33 lb, taken as stainless steel", as the forecast takes it */
function vesselSays(v, tail = "") {
  const w = `${+(+v.empty_weight).toFixed(1)}&nbsp;${swMU()}`;
  return v.material === "aluminium" ? `${w} of aluminum${tail}` : v.material === "other" ? `${w} of a material holding ${+v.specific_heat}&nbsp;cal/g&nbsp;°C${tail}`
    : v.material === "stainless_steel" ? `${w} of stainless steel${tail}` : `${w}${tail}, taken as stainless steel`;
}
/* FORECAST's numbers, by where the model takes each from: the recipe, the vessels' own figures from the Hardware page,
   the brewer, the rig's measurements, the rig's setup, and what hasn't been measured, each a range it allows for in
   full, with the three that would raise USE most if known and USE if every one proved to be the middle of its range;
   then BeerSmith's own strike temperature and what it would do here. The HLT's water and the grain's temperature are
   the brewer's, each with CHANGE, which opens its box in place; so are the recipe's grain weight and mash water where
   they were given here, in place of the recipe's lines, and the room given here, while it stands for the room or waits
   aside as the probe reads it again. A grain weight a mash step keeps itself on Brew Steps says so. They are the
   numbers as they are now; while
   CraftBeerPi works USE out, what needs its answer waits for it. From Hardware is there only when the model takes a
   vessel's figures (swHw): the Mash Tun's in place of the recipe's Mash tun line, the HLT's in place of the guess about
   its steel, which CraftBeerPi then leaves out of the guesses and the levers */
function swList(N) {
  const R = N.R, VU = swVU(), gal = x => `${(+x).toFixed(2)}&nbsp;${VU}`, left = N.left ?? N.vol - N.gal, by = swBrewStart(), U = M.U;
  const g = (h, rows) => `<h4 class="swg">${h}</h4><dl class="swd">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const hwMT = swHw("mt"), hwHLT = swHw("hlt");
  const hw = [hwMT && ["Mash tun", vesselSays(hwMT)], hwHLT && ["HLT", vesselSays(hwHLT, ", with what's fixed in it")]].filter(Boolean);
  const cd = swCampden();
  const water = st.swVol ? swVolHTML(N) : `<div class="swyou"><div><p>${+N.vol.toFixed(2)}&nbsp;${VU} in the HLT, strike and sparge${by ? ": BrewStart's water volume" : ""}.${cd != null ? ` Campden for it: ${swCampdenText(cd)}.` : ""} The ${gal(left)} that stays there warms the mash through the coil.</p>${hltOverHTML(N.vol, VU)}</div>${b("cmdbtn", "CHANGE", "", {cmd: "swv:open", label: "Change the water in the HLT", expanded: false})}</div>`;
  const grainSays = N.typed != null
    ? `Grain at ${swT(N.grain)}${by ? ": BrewStart's grain temperature. Left blank" : ", given for today's brew. Without it"}, ${swRoomSrc(N)} would stand for it, at ${swT(N.room)}.`
    : `Grain at ${swT(N.grain)}: ${swRoomSrc(N)}${by ? ", as BrewStart's grain temperature is blank" : ""}. Grain that spent the night somewhere warmer lands the mash higher: give its temperature.`;
  const grain = st.swGrain ? swGrainHTML(N) : `<div class="swyou"><p>${grainSays}</p>${b("cmdbtn", "CHANGE", "", {cmd: "swg:open", label: "Change the grain's temperature", expanded: false})}</div>`;
  const rec = (k, says) => st.swRec && st.swRec.kind === k ? swRecHTML(N)
    : `<div class="swyou"><p>${says}</p>${b("cmdbtn", "CHANGE", "", {cmd: `swr:open:${k}`, label: `Change the ${SW_REC[k].name.toLowerCase()} given here`, expanded: false})}</div>`;
  const typedG = N.recTyped.includes("grain"), typedW = N.recTyped.includes("water");
  const given = (typedG ? rec("grain", `Grain weight ${+(+R.grain).toFixed(1)}&nbsp;${swMU()}, given here for this recipe.`) : "")
    + (typedW ? rec("water", `Mash water ${gal(N.gal)} to the mash tun, given here for this recipe.`) : "")
    + (N.roomGiven == null ? "" : rec("room", N.roomFrom === "you" ? `Room ${swT(N.room)}, given here while the boil kettle's probe gives no reading a room can have.`
      : `Room ${swT(N.roomGiven)} given here, kept aside: the boil kettle's probe reads the room again${N.room != null ? `, at ${swT(N.room)}` : ""}, so it is used.`));
  const G = new Map((st.sw.guesses || []).filter(x => x && x.name).map(x => [x.name, x])), coil = N.probe === "coil", sp = swStillProbe();
  /* PUMP OFF: what the model takes the probe at the coil's outlet to read with the wort pump stopped, the rig's
     still_probe: 0, the HLT's water left in the coil; above it, that water cooling that share of the way to the room */
  const guesses = SW_GUESS.filter(([k]) => G.has(k)).map(([k, dt, says]) => [dt, says(G.get(k), +(+left).toFixed(2))])
    .concat(coil ? [["PUMP OFF", sp > 0 ? `the Mash Tun probe taken to cool from the HLT's water ${sp >= 1 ? "all the way" : `${swPct(sp)} of the way`} to the room, as still water in its pipe would. Not checked on the rig yet`
      : "the Mash Tun probe taken to read the HLT's water, as still wort beside the coil would. Not checked on the rig yet"]] : []);
  /* the three that would raise USE most if known, and USE at the middle of every range; until CraftBeerPi has worked
     them out, a few minutes after USE, that they are coming */
  const name = k => (SW_GUESS.find(x => x[0] === k) || [])[3];
  const top = N.ok && !N.work ? N.top.filter(k => name(k) && N.lv[k] > 0).slice(0, 3) : [];
  const most = top.length ? `<p class="swn" id="sw-lv">Knowing ${swAnd(top.map(name))} would raise USE the most: about ${swAnd(top.map(k => (+N.lv[k]).toFixed(1)))}&nbsp;${U}.${N.mid != null ? ` If every one proved to be the middle of its range, USE would be ${swT(N.mid)}.` : ""}</p>`
    : N.ok && !N.work && N.lvWait ? `<p class="swn" id="sw-lv">CraftBeerPi is still working out which of these would raise USE most if it were known: that comes a few minutes after USE.</p>` : "";
  const BS = R.beersmith && R.beersmith.strike != null ? R.beersmith : null, bs = BS && N.ok && !N.work ? N.fc(BS.strike) : null;
  const bsSays = bs ? ` It leaves out the HLT's ${gal(left)}, so here ${swOver(N, bs) ? `it could take the mash to ${Math.round(bs.peak)}&nbsp;${U}, over the rest` : `the mash would land ${swR(bs.lo[0], bs.hi[0])}&nbsp;${U}`}.` : "";
  const bsFor = BS ? [BS.grain != null ? `for grain at ${swT(BS.grain)}` : "", BS.tun != null ? `the tun at ${swT(BS.tun)}` : ""].filter(Boolean).join(" and ") : "";
  return g("From the recipe", [
      ...(typedG ? [] : [["Grain", `${+(+R.grain).toFixed(2)}&nbsp;${swMU()}${R.grain_from === "step" ? `: ${esc(N.mashName)}'s own, on Brew Steps` : ""}`]]),
      ...(typedW ? [] : [["Water", `${gal(N.gal)} to the mash tun${R.for_grain != null ? `: ${gal(R.for_grain)} for the grain${R.dead ? ` and ${gal(R.dead)} under the false bottom` : ""}` : ""}`]]),
      ...(hwMT ? [] : [["Mash tun", R.tun ? `${+(+R.tun).toFixed(2)}&nbsp;${swMU()} of steel` : "not counted: the recipe has no equipment profile"]]),
      ["Rest", swT(N.rest)]])
    + (hw.length ? g("From Hardware", hw) : "")
    + `<h4 class="swg">From you</h4>${water}${grain}${given}`
    + g("Measured on the rig", [
      ...(N.roomFrom === "you" ? [] : [["Room", `${swT(N.room)}: the boil kettle's probe, as the kettle is empty, less its offset. The mash tun starts at it, and both vessels lose heat to it`]]),
      ["HLT", "how much heat it holds, how fast it loses it, its element and its probe"]])
    + g("The rig's setup", [
      ["Mash probe", coil ? "at the coil's outlet: with the pump running it reads the wort leaving the coil" : "at the tun's outlet: it reads the mash leaving the tun"],
      ["Strike", st.sw.rig && st.sw.rig.through_coil === false ? "the water goes to the mash tun straight from the HLT, by the HLT pump" : "the water goes to the mash tun through the coil, by the HLT pump"]])
    + `<h4 class="swg">Not measured yet</h4><p class="swn">USE allows for every one of these anywhere in its range, so a wrong guess lands the mash low, where the HERMS can bring it up.</p>`
    + `<dl class="swd">${guesses.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>${most}`
    + (BS ? g("BeerSmith", [["Strike", `${swT(BS.strike)}${bsFor ? `, ${bsFor}` : ""}.${bsSays}`]]) : "");
}
/* the HLT's water, typed or stepped as in TARGET's box: −1 −.1, the number, +.1 +1, then SET and CANCEL. Its label gives
   the unit, and the line under it says what the figure is (WAI's form instructions) */
const swUnitWords = () => swVU() === "L" ? ["litres", "litre"] : ["gallons", "gallon"];
function swVolHTML(N) {
  const v = st.swVol.val, x = v == null ? "" : v.toFixed(1), pend = st.pend.swv, why = st.link === "lost" ? PAUSED : pend ? WAIT : "", [many, one] = swUnitWords();
  const key = (d, l) => `<button type="button" data-cmd="swv:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  return `<div class="editor swvol" role="group" aria-labelledby="swv-l"><label class="swvl" id="swv-l" for="swvin">HLT water, in ${many}</label>`
    + `<p class="swvh" id="swv-h">All the water in the HLT now, strike and sparge${swBrewStart() ? ". It is BrewStart's water volume, which also sets the Campden dose" : ""}.</p>`
    + `${key(-1, `1 ${one} less`)}${key(-0.1, `0.1 ${one} less`)}<input id="swvin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swv-h swv-over">${key(0.1, `0.1 ${one} more`)}${key(1, `1 ${one} more`)}`
    + `<p class="vover" id="swv-over" aria-live="polite">${hltOver(v, swVU())}</p>`
    + `<button type="button" class="ok" data-cmd="swv:set"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${pend ? "SETTING…" : `SET <span id="swvok">${x || "– –"}</span> ${swVU()}`}</button><button type="button" class="no" data-cmd="swv:x">CANCEL</button></div>`;
}
/* a small box opening in FORECAST's details: they are drawn from their top, as the box opens in its place, and the
   input's focus then brings the box into view (the mockup draws them afresh) */
function swOpened(input) {
  const d = root && $("#sw-det");
  if (d) d.scrollTop = 0;
  return setTimeout(() => { const i = root && $(input); if (i) { i.focus(); i.select(); } }, 0);
}
/* the HLT's water (swVolHTML): SET writes BrewStart's water volume where the recipe has BrewStart, or by hand the figure
   CraftBeerPi keeps for the brew day, and CraftBeerPi works USE out again for it. It can be changed back the same way,
   so nothing asks first */
function swVol(x, y) {
  const N = swNumbers(), e = st.swVol, VU = swVU();
  if (x === "open") {
    st.swGrain = null;
    st.swRec = null;
    st.swVol = {val: N.vol};
    renderAll();
    return swOpened("#swvin");
  }
  if (x === "x") { st.swVol = null; return renderAll(); }
  if (!e || st.pend.swv) return;
  if (x === "step") { e.val = Math.max(0, Math.round(((e.val ?? N.gal ?? 0) + parseFloat(y)) * 10) / 10); return renderAll(); }
  const v = e.val, was = N.vol;
  if (v == null) return note("r", `Type how much water is in the HLT, in ${swUnitWords()[0]}.`);
  if (N.gal != null && v < N.gal) return note("r", `The HLT holds the strike water too, so at least ${N.gal.toFixed(2)} ${VU}.`);
  if (was != null && Math.abs(v - was) < 0.05) { st.swVol = null; return renderAll(); }
  const label = `HLT water set to ${v.toFixed(1)} ${VU}${was != null ? `, was ${was.toFixed(1)} ${VU}` : ""}`;
  if (DEMO_MODE) {
    /* while BrewStart's Campden reminder is on, LOG gives the dose for the new water, as BrewStart works it out */
    const {S, bi} = swDemoSteps(), camp = bi >= 0 && S[bi].campden ? ` · Campden ${swCampdenText(SWD.campdenTablets(v))}` : "";
    return send("swv", "set", label + camp, () => { if (bi >= 0) S[bi].vol = v; else st.swd.vol = v; st.swVol = null; swRework("vol"); });
  }
  swExec("swv", "set", label, () => api.strikeWater(v, swIds()), {
    ok: d => {
      st.swVol = null;
      const a = d.applied || {}, to = num(a.to) ?? v, from = num(a.from), c = num(a.campden);
      return `HLT water set to ${to.toFixed(1)} ${VU}${from != null ? `, was ${from.toFixed(1)} ${VU}` : ""}${c != null && c > 0 ? ` · Campden ${swCampdenText(c)}` : ""}`;
    },
    /* under the strike water, the box stays open with the figure, to be put right; a recipe changed or gone closes it */
    refused: (d, status) => {
      const head = `The HLT's water wasn't set to ${v.toFixed(1)} ${VU}`;
      if (status === 400) return d.error === "too_little" && num(d.min) != null ? `${head}: the HLT holds the strike water too, so at least ${num(d.min).toFixed(2)} ${VU}.` : "";
      const why = d.error === "recipe_changed" || d.error === "off" ? swWhyNot(d) : "";
      if (why) st.swVol = null;
      return why ? `${head}: ${why}.` : "";
    },
    fail: `The HLT's water did not change. ${was == null ? "None is given yet." : `It is still ${was.toFixed(1)} ${VU}.`}`
  });
}
/* the grain's temperature, typed or stepped as in TARGET's box: −1 −.1, the number, +.1 +1, then SET and CANCEL; while a
   figure is in use, THE PROBE under them goes back to the boil kettle's probe, as a blank grain temperature on
   BrewStart does. While BrewStart's grain isn't answered for this brew, that button is IN THE GARAGE, in BrewStart's
   box's words, as USE waits for an answer. Its label gives the unit, and the line under it says when to give it (WAI's
   form instructions) */
function swGrainHTML(N) {
  const v = st.swGrain.val, x = v == null ? "" : v.toFixed(1), pend = st.pend.swg, why = st.link === "lost" ? PAUSED : pend ? WAIT : "", U = M.U;
  const key = (d, l) => `<button type="button" data-cmd="swg:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  const dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "";
  /* THE PROBE: while a figure is in use, or BrewStart's can't be used, and the probe has a reading to stand for it; THE
     ROOM where the room given here stands for it instead */
  const probe = bsGrainAsk() ? `<button type="button" class="swprobe" data-cmd="swg:probe"${dis}>${pend === "probe" ? "SETTING…" : "IN THE GARAGE"}<small>the boil kettle's probe, ${f1(st.v.bk.pv)} ${U}</small></button>`
    : (N.typed == null && N.miss !== "grain") || N.room == null ? "" : `<button type="button" class="swprobe" data-cmd="swg:probe"${dis}>${pend === "probe" ? "SETTING…" : N.roomFrom === "you" ? "THE ROOM" : "THE PROBE"}<small>${N.roomFrom === "you" ? `the ${swT(N.room)} given here` : `the boil kettle's, ${swT(N.room)}`}, instead</small></button>`;
  return `<div class="editor swvol" role="group" aria-labelledby="swg-l"><label class="swvl" id="swg-l" for="swgin">Grain temperature, in ${U}</label>`
    + `<p class="swvh" id="swg-h">For grain that spent the night away from the boil kettle. ${swBrewStart() ? "It is BrewStart's grain temperature: left blank" : "Without it"}, ${N.roomFrom === "you" ? "the room's temperature given here" : "the kettle's probe"} is used.</p>`
    + `${key(-1, "Down 1 degree")}${key(-0.1, "Down 0.1 degree")}<input id="swgin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swg-h">${key(0.1, "Up 0.1 degree")}${key(1, "Up 1 degree")}`
    + `<button type="button" class="ok" data-cmd="swg:set"${dis}>${pend === "set" ? "SETTING…" : `SET <span id="swgok">${x || "– –"}</span> ${U}`}</button><button type="button" class="no" data-cmd="swg:x">CANCEL</button>${probe}</div>`;
}
/* the grain's temperature (swGrainHTML): SET writes BrewStart's grain temperature where the recipe has BrewStart, or by
   hand the figure CraftBeerPi keeps for the brew day, and THE PROBE blanks it; either way CraftBeerPi works USE out
   again. Changed back the same way, so nothing asks first. A figure no room has is refused, as COMPARE PROBES counts a
   reading like that a probe looking off. One saved on BrewStart that the forecast can't use (bad) opens the box at the
   probe's reading, and LOG says what it was: its figure, or "not a number". Each also answers where the grain spent
   the night, as BrewStart's box asks it (place, core post59): a figure is indoors, the probe the garage. While that
   isn't answered yet on a recipe with BrewStart, IN THE GARAGE answers it, and SET answers indoors even with the same
   figure, its LOG line saying so ("Grain indoors at 61.4 °F") */
function swGrain(x, y) {
  const N = swNumbers(), e = st.swGrain, U = M.U, [lo, hi] = swRoom(), bad = N.miss === "grain", ask = bsGrainAsk();
  if (x === "open") {
    st.swVol = null;
    st.swRec = null;
    st.swGrain = {val: !bad && Number.isFinite(N.typed) ? N.typed : N.room};
    renderAll();
    return swOpened("#swgin");
  }
  if (x === "x") { st.swGrain = null; return renderAll(); }
  if (!e || st.pend.swg) return;
  if (x === "step") { e.val = Math.round(((e.val ?? N.grain ?? N.room ?? 0) + parseFloat(y)) * 10) / 10; return renderAll(); }
  const was = bad || N.typed != null ? swGrainSays(N.typed) : null, src = swRoomSrc(N);
  /* a call that fails leaves the grain's temperature as it is: the figure in use, or the room's */
  const fail = `The grain's temperature did not change. It is still ${was || `${N.roomFrom === "you" ? "the room's given here" : "the boil kettle's probe's"}, ${f1(N.room)} ${U}`}.`;
  /* a recipe changed or gone closes the box; a figure out of range keeps it open with the figure, to be put right */
  const refused = head => (d, status) => {
    if (status === 400) return d.error === "out_of_range" ? `${head}: it has to be between ${num(d.low) ?? lo} and ${num(d.high) ?? hi} ${U}.` : "";
    const why = d.error === "recipe_changed" || d.error === "off" ? swWhyNot(d) : "";
    if (why) st.swGrain = null;
    return why ? `${head}: ${why}.` : "";
  };
  if (x === "probe") {
    if (N.typed == null && !bad && !ask) { st.swGrain = null; return renderAll(); }
    const label = ask ? `Grain in the garage: the boil kettle's probe, ${f1(st.v.bk.pv)} ${U}` : `Grain temperature from ${src}, was ${was}`;
    if (DEMO_MODE) return send("swg", "probe", label, swDemoGrain(null));
    return swExec("swg", "probe", label, () => api.strikeGrain(null, swIds(), "garage"), {ok: () => { st.swGrain = null; return label; },
      refused: refused(`The grain's temperature wasn't changed to ${src}`), fail});
  }
  const v = e.val;
  if (v == null) return note("r", `Type the grain's temperature, in ${U}.`);
  if (v < lo || v > hi) return note("r", `The grain's temperature has to be between ${lo} and ${hi} ${U}.`);
  if (!bad && !ask && N.typed != null && Math.abs(v - N.typed) < 0.05) { st.swGrain = null; return renderAll(); }
  const label = ask ? `Grain indoors at ${v.toFixed(1)} ${U}` : `Grain temperature set to ${v.toFixed(1)} ${U}, was ${was || src}`;
  if (DEMO_MODE) return send("swg", "set", label, swDemoGrain(v));
  swExec("swg", "set", label, () => api.strikeGrain(v, swIds()), {
    ok: d => {
      st.swGrain = null;
      const a = d.applied || {}, to = num(a.to) ?? v, from = num(a.from);
      return ask ? `Grain indoors at ${to.toFixed(1)} ${U}` : `Grain temperature set to ${to.toFixed(1)} ${U}, was ${from != null ? `${from.toFixed(1)} ${U}` : bad ? was : src}`;
    },
    refused: refused(`The grain's temperature wasn't set to ${v.toFixed(1)} ${U}`), fail
  });
}
/* FORECAST's chart, as the graphs draw theirs: the mash's temperature for an hour from the grain going in, on the PID
   windows' black face. The rest in Setpoint Green; the band the forecast spans for the strike water as planned, in the
   readings' red, or Prompt Amber when it goes over the rest; the other choice's band as a grey dashed outline. Degrees
   down the right-hand side, minutes along the foot. While USE is worked out again, the bands are the last answer's, in
   the stale grey */
function drawSw() {
  const box = root && $("#swc");
  if (!box || !st.sw) return;
  const N = swNumbers();
  if (!N.ok) return;
  const w = Math.floor(box.clientWidth), h = Math.floor(box.clientHeight);
  if (w < 60 || h < 40) return;
  const alt = swAlt(N), P = N.plan != null ? N.fc(N.plan) : null, Q = alt != null ? N.fc(alt) : null, all = [P, Q].filter(Boolean);
  if (!all.length) { box.innerHTML = ""; return; }
  const lo = Math.min(...all.map(F => Math.min(...F.lo))) - 1, hi = Math.max(N.rest + 1.5, ...all.map(F => Math.max(...F.hi) + 0.8));
  const yT = 6, yB = h - 20, X = i => 1 + i / 60 * (w - 2), Y = T => yB - (T - lo) / (hi - lo) * (yB - yT), q = v => v.toFixed(1);
  const gs = [1, 2, 5, 10].find(s => (yB - yT) * s / (hi - lo) >= 22) || 10;
  let grid = "", gl = "", tl = "";
  for (let v = Math.ceil(lo / gs) * gs; v <= hi; v += gs) {
    const y = Y(v);
    if (y < yT + 10 || y > yB - 4) continue;
    grid += `M0 ${q(y)}H${w}`;
    if (Math.abs(Y(N.rest) - y) >= 14) gl += `<text x="${w - 4}" y="${q(y - 3)}" text-anchor="end">${v}</text>`;
  }
  for (const m of [0, 15, 30, 45, 60]) {
    if (m > 0 && m < 60) grid += `M${q(X(m))} ${yT}V${yB}`;
    tl += `<text x="${q(m === 0 ? 3 : m === 60 ? w - 3 : X(m))}" y="${h - 5}" text-anchor="${m === 0 ? "start" : m === 60 ? "end" : "middle"}">${m === 0 ? "GRAIN IN" : m === 60 ? "60 MIN" : m}</text>`;
  }
  const edge = a => a.map((v, i) => `${i ? "L" : "M"}${q(X(i))} ${q(Y(v))}`).join("");
  const band = (F, cls) => `<path class="swb${cls}" d="${edge(F.hi)}${F.lo.map((v, i) => `L${q(X(60 - i))} ${q(Y(F.lo[60 - i]))}`).join("")}Z"/><path class="swe${cls}" d="${edge(F.hi)}"/><path class="swe${cls}" d="${edge(F.lo)}"/>`;
  box.innerHTML = `<svg${N.stale ? ' class="stale"' : ""} viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false"><path class="g-grid" d="${grid}"/>`
    + `${Q ? band(Q, " alt") : ""}${P ? band(P, swOver(N, P) ? " hot" : "") : ""}<path class="g-sv" d="M0 ${q(Y(N.rest))}H${w}"/>`
    + `<text class="swrl" x="${w - 4}" y="${q(Y(N.rest) - 4)}" text-anchor="end">${+N.rest.toFixed(1)} ${M.U} REST</text>${gl}${tl}</svg>`;
}
/* the box: its head, the window, then USE (or BACK TO) and FORECAST side by side. With a number missing, why, then USE
   greyed, HLT WATER and GRAIN side by side (swMissHTML). FORECAST opens the
   forecast in detail under the head and turns into CLOSE in its own place, so nothing in the head moves: the forecast
   drawn and in words, why it is a range, what the Mash Tun's probe may read, and the numbers by where they come from.
   The head stays in reach while it is open: on one screen the details take the step list's room and scroll under it,
   as the probes' panel does; where the page scrolls, the head stays at the top of the screen while the details pass
   under it. Once the water is in the mash tun and the pump has stopped for the dough-in, the head says when the Mash
   Tun's reading isn't the mash. While CraftBeerPi works USE out, the head says so, with how long it has been at it,
   and greys USE */
function swHTML() {
  const phase = swPhase();
  if (!phase || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.bsOpen) return "";
  /* USE and BACK TO wait while their own call, UNLOAD's or BrewStart's SET does */
  const N = swNumbers(), pend = st.pend.sw, why = st.link === "lost" ? PAUSED : pend || st.pend["r:unload"] || st.pend.bs ? WAIT : "", has = N.ok || !!N.wait, open = !!st.swOpen && has;
  const cls = `sw sw-${phase}${has ? "" : " sw-miss"}`;
  if (!has) return `<section class="${cls}" aria-label="Strike water">${head0(N, swMissHTML(N))}</section>`;
  /* USE, or once it is in use BACK TO, in one place. While the HLT heats the strike water, a temperature below the
     water's is greyed: the HLT can't cool it, and the step would ask for the water at once, hotter than the box says.
     While CraftBeerPi works USE out, USE is greyed, with the last figure if there is one: CraftBeerPi refuses a figure
     worked out from numbers that have changed since. BACK TO is never hotter, so it stays, unless the plan it goes
     back to is over the ceiling, which the box doesn't set: then it's greyed and says so, and by hand that the HLT's
     own TARGET can still set it. With BrewStart, USE waits for where the grain spent the night, which is asked once a
     brew: until it is answered for this brew, USE's place says so, in the look CraftBeerPi's questions have in the
     title bar, and leads to the answer (sw:where). The grain matters only through USE, so nothing else waits for it */
  const alt = swAlt(N), used = alt != null && N.plan != null && Math.abs(N.plan - N.strike) < swHalf(), U = M.U;
  let act = "";
  if (N.wait && phase !== "moved") act = b("cmdbtn swuse", `USE –&nbsp;–&nbsp;${U}`, "working it out", {cmd: "sw:use", why: SW_WORKING});
  else if (alt != null) {
    const H = st.v.hlt, water = (phase === "heat" && st.recipe.state === "running") || (!N.step && H.mode === "auto") ? H.pv : null;
    const cool = T => water != null && T < water - swHalf() ? `The water is already at ${water.toFixed(1)} ${U}, above ${T.toFixed(1)} ${U}, and the HLT can't cool it.` : "";
    const hot = T => swOverCeil(T) ? `${T.toFixed(1)} ${U} is over ${+swCeil().toFixed(1)} ${U}, too hot for strike water, so BACK TO can't set it.${N.step ? "" : " TARGET can set the HLT to it."}` : "";
    const stale = N.stale ? `Not yet: ${swWhy(N)}, and CraftBeerPi is working USE out again. ${N.strike.toFixed(1)} ${U} was for ${swWas(N)}.` : "";
    const ask = !used && !N.stale && !cool(alt) && bsGrainAsk();
    act = used ? b("cmdbtn", pend ? "SENDING…" : `BACK TO ${alt.toFixed(1)}&nbsp;${U}`, st.sw.was != null ? "as it was" : "the rest", {cmd: "sw:back", why: why || hot(alt) || cool(alt)})
      : ask ? b("cmdbtn swuse swask", `USE –&nbsp;–&nbsp;${U}`, "where's the grain?", {cmd: "sw:where", label: "USE: where the grain spent the night isn't given yet. Say where it is first: USE depends on it.", why})
      : b("cmdbtn swuse", pend ? "SENDING…" : `USE ${alt.toFixed(1)}&nbsp;${U}`, N.stale ? "working it out" : N.step ? "aims under the rest" : "as the HLT's target", {cmd: "sw:use", why: why || stale || cool(alt)});
  }
  /* with the pump stopped for the dough-in, a Mash Tun reading more than 3 °F over the top of where the forecast lands
     the mash: whatever the probe at the coil's outlet reads then, it isn't the mash. Nearer, nothing is said, so the
     line holds however that probe behaves, which hasn't been measured. Where the rig's setup takes the probe to cool
     toward the room with the pump stopped (rig.still_probe above 0), a reading as far under where the mash lands isn't
     the mash either */
  const mt = st.v.mt, P0 = N.ok && N.plan != null ? N.fc(N.plan) : null, cools = swStillProbe() > 0;
  const reads = P0 && N.probe === "coil" && phase === "moved" && !st.a.wortPump.on && mt.pv != null
    && (mt.pv > P0.hi[0] + swDough() || (cools && mt.pv < P0.lo[0] - swDough()));
  const line = (N.work ? `<p class="swl swwk"><span>${swWorkSays(N)}</span></p>` : "")
    + (reads ? `<p class="swl swmt">The Mash Tun's ${swT(mt.pv)} isn't the mash: with the pump stopped, its probe reads ${cools ? "the still water at the coil's outlet" : "the water left in the HLT's coil"}.</p>` : "");
  const more = b("cmdbtn swmore", open ? "CLOSE" : "FORECAST", open ? "the forecast" : "in detail", {cmd: "sw:more", expanded: open, controls: open ? "sw-det" : ""});
  const head = head0(N, `${line}<div class="swa${act ? "" : " one"}">${act}${more}</div>`);
  if (!open) return `<section class="${cls}" aria-label="Strike water">${head}</section>`;
  if (N.wait) return `<section class="${cls} open" aria-label="Strike water">${head}<div class="swdet" id="sw-det">`
    + `<p class="swn">The chart, and where the mash lands, come once USE is worked out. These are the numbers it is worked out from.</p>${swList(N)}</div></section>`;
  /* opened out. The words describe the chart for everyone. They are kept as tall as they would be once USE or BACK TO
     swaps the two choices (the ghost), so the swap moves nothing under them */
  const back = st.sw.was != null ? "as it was" : "with BACK TO", role = used ? back : "with USE";
  const words = swWords(N, [[N.plan, "as planned"], [alt, role]].filter(([T]) => T != null));
  const ghost = alt != null && N.plan != null ? swWords(N, [[alt, "as planned"], [N.plan, used ? "with USE" : "as it was"]]) : "";
  const top = [N.plan, alt].filter(T => T != null && N.fc(T)).map(T => [T, N.fc(T).reads]).sort((x, y) => y[1] - x[1])[0];
  /* what the Mash Tun's probe may read during dough-in, and why it isn't the mash: it reads the HLT's water left in the
     coil, or, where the rig's setup takes it to cool with the pump stopped, water cooling toward the room */
  const notMash = swStillProbe() > 0 ? "Neither that nor the lower readings after it will be the mash: its probe sits at the coil's outlet, and with the pump stopped the water there cools toward the room."
    : "That won't be the mash: its probe sits at the coil's outlet, and with the pump stopped it reads the water left in the HLT's coil.";
  const probeSays = N.probe === "coil" && top && top[1] > N.rest + (swC() ? 1.1 : 2) ? `<p class="swn">${top[0] === N.plan ? "During dough-in the Mash Tun may read" : "With USE, the Mash Tun may read"} up to ${Math.round(top[1])}&nbsp;${U}${top[0] === N.plan ? "" : " during dough-in"}. ${notMash}</p>` : "";
  const P = N.plan != null ? N.fc(N.plan) : null, hot = P && swOver(N, P) ? " hot" : "";
  /* the chart, its key and its label hold the choices with a forecast: while the strike water as planned waits for its
     own (swFcComing), the other choice alone */
  const drawn = [N.plan, alt].filter(T => T != null && N.fc(T));
  const label = `Chart of the mash's temperature for an hour from the grain going in, ${drawn.map(T => `with the strike water at ${T.toFixed(1)} ${U}`).join(" and ")}, against the ${+N.rest.toFixed(1)} ${U} rest.${N.stale ? ` The figures are for ${swWas(N)}, while USE is worked out again.` : ""} Described under it.`;
  const key = (P ? `<li><i class="k-plan${hot}"></i>${N.plan.toFixed(1)} ${U}, as planned</li>` : "")
    + (alt != null && N.fc(alt) ? `<li><i class="k-alt"></i>${alt.toFixed(1)} ${U}, ${role}</li>` : "")
    + `<li><i class="k-rest"></i>the rest, ${+N.rest.toFixed(1)} ${U}</li>`;
  const was = N.stale ? `<p class="swn">${swWhy(N)[0].toUpperCase() + swWhy(N).slice(1)}, so CraftBeerPi is working USE out again. Until then, these are the figures for ${swWas(N)}.</p>` : "";
  /* no USE because it comes out at the rest itself, with the strike water there already: said, so its absence isn't a
     puzzle */
  const atRest = alt == null && phase !== "moved" && Math.abs(N.strike - N.rest) < swHalf()
    ? `<p class="swn">USE would be the rest itself here, so there's nothing to change: hotter water could take the mash higher than water heated only to the rest would.</p>` : "";
  return `<section class="${cls} open" aria-label="Strike water">${head}<div class="swdet" id="sw-det">${was}`
    + `<figure class="swf${N.stale ? " stale" : ""}"><div class="swc" id="swc" role="img" aria-label="${esc(label)}"></div><ul class="swkey" aria-hidden="true">${key}</ul>`
    + `<figcaption class="swl"><span>${words}</span>${ghost ? `<span class="ghost" aria-hidden="true">${ghost}</span>` : ""}</figcaption></figure>`
    + `${atRest}<p class="swn">It's a range because some of the rig hasn't been measured yet (below). USE errs low: even at the top of the range, it takes the mash no higher than water heated only to the rest would.</p>`
    + `${probeSays}${swList(N)}</div></section>`;
}
/* the box's head: the window, then what goes under it */
const head0 = (N, under) => `<div class="swhead">${swWin(N)}${under}</div>`;
/* USE waiting for the grain (swHTML) leads to the answer: while BrewStart's row is the way to its box, that box, with
   focus on IN THE GARAGE and back on USE as it closes; once BrewStart heats or has finished, the strike water box's own
   grain box, in its details */
function swWhere() {
  const bi = bsIdx();
  if (bi >= 0 && bsLive(bi)) return bsOpen({focus: "garage", from: "use"});
  st.swOpen = true;
  swGrain("open");
}
/* USE: CraftBeerPi's call puts the temperature in the strike water step, and in BrewStart's while it is next or waits,
   so Ready by plans for it; and while the strike water step heats or holds the water (BrewStart heating included), in
   the HLT's target too. A question already up from the old temperature goes, and the step asks again at the new one. By
   hand it sets the HLT's target alone, as SET does. BACK TO undoes it the same way, to the temperature before the first
   USE. A figure worked out from numbers since changed on another screen is refused, and said (swRefusal) */
function swUse() {
  const N = swNumbers();
  if (!N.ok || N.stale || st.pend.sw) return;
  const to = N.strike, from = N.plan, U = M.U;
  const label = N.step ? `Strike water set to ${to.toFixed(1)} ${U}${from != null ? `, was ${from.toFixed(1)} ${U}` : ""}`
    : `${M.VNAME.hlt} target ${to.toFixed(1)} ${U} for the strike water${from != null ? `, was ${from.toFixed(1)} ${U}` : ""}`;
  if (DEMO_MODE) return send("sw", "use", label, () => { if (st.swd.was == null) st.swd.was = from; swSet(to); });
  const before = Object.assign({}, st.sw.inputs), what = `USE ${to.toFixed(1)} ${U}`;
  swExec("sw", "use", label, () => api.strikeUse(to, st.sw.answer && st.sw.answer.plan, swIds()), {
    ok: d => swApplied(d.applied, "use") || label,
    refused: d => d.error === "plan_changed" ? swRefusal(to, swChanged(before, (d.strike || {}).inputs || {}), d.working ? null : num(d.use))
      : d.error === "missing" ? `${what} wasn't applied: a number it's worked out from is missing now.` : swNotApplied(what, d),
    fail: swStill(N)
  });
}
/* the refusal in words: what wasn't applied, what changed, and the figure now (none while it is worked out again). The
   window shows the strike water still as it was */
function swRefusal(sent, what, use) {
  return `USE ${sent.toFixed(1)} ${M.U} wasn't applied: ${what}, ${use == null ? "and CraftBeerPi is working USE out again" : `so USE is ${use.toFixed(1)} ${M.U}`}.`;
}
/* what changed between two sets of numbers, in words */
function swChanged(a, z) {
  const by = swBrewStart(), U = M.U;
  if ((a.typed ?? null) !== (z.typed ?? null)) return z.typed == null ? `the grain's temperature is the boil kettle's probe's again, ${num(z.grain) != null ? num(z.grain).toFixed(1) : "– –"} ${U}` : `${by ? "BrewStart's grain temperature" : "the grain's temperature"} is now ${(+z.typed).toFixed(1)} ${U}`;
  if (Math.abs((a.vol ?? 0) - (z.vol ?? 0)) >= 0.05 && z.vol != null) return `${by ? "BrewStart's water volume" : "the HLT's water"} is now ${(+z.vol).toFixed(1)} ${swVU()}`;
  if (Math.abs((a.room ?? 0) - (z.room ?? 0)) >= 0.05 && z.room != null) return `the room is now ${(+z.room).toFixed(1)} ${U}`;
  return "the numbers it is worked out from changed";
}
function swBack() {
  const N = swNumbers(), to = st.sw.was ?? N.rest, U = M.U;
  if (st.pend.sw || to == null) return;
  const label = N.step ? `Strike water set back to ${to.toFixed(1)} ${U}` : `${M.VNAME.hlt} target back to ${to.toFixed(1)} ${U}`;
  if (DEMO_MODE) return send("sw", "back", label, () => { st.swd.was = null; swSet(to); });
  swExec("sw", "back", label, () => api.strikeBack(to, swIds()), {
    ok: d => swApplied(d.applied, "back") || label,
    refused: d => d.error === "back_changed" ? swBackChanged(to, d) : swNotApplied(`BACK TO ${to.toFixed(1)} ${U}`, d),
    fail: swStill(N)
  });
}
/* USE or BACK TO failed: what is still in force, the strike water as planned, or by hand the HLT's target, in SET's
   words */
const swStill = N => `${N.step ? "The strike water" : `The ${M.VNAME.hlt.toLowerCase()} target`} did not change. It is still ${f1(N.plan)} ${M.U}.`;
/* BACK TO refused because another screen has moved the strike water since: what is in force now, from the state the
   refusal brings */
function swBackChanged(to, d) {
  const S = d.strike && typeof d.strike === "object" ? d.strike : st.sw, now = num(S && S.inputs && S.inputs.planned);
  return `BACK TO ${to.toFixed(1)} ${M.U} wasn't applied: ${S && S.by === "hand" ? "the HLT's target" : "the strike water"} was changed on another screen.${now != null ? ` It's ${now.toFixed(1)} ${M.U} now.` : ""}`;
}
/* the LOG line for what CraftBeerPi applied, in its own figures */
function swApplied(a, how) {
  if (!a || num(a.to) == null) return "";
  const to = num(a.to), from = num(a.from), U = M.U, hand = a.by === "hand";
  if (how === "back") return hand ? `${M.VNAME.hlt} target back to ${to.toFixed(1)} ${U}` : `Strike water set back to ${to.toFixed(1)} ${U}`;
  return hand ? `${M.VNAME.hlt} target ${to.toFixed(1)} ${U} for the strike water${from != null ? `, was ${from.toFixed(1)} ${U}` : ""}`
    : `Strike water set to ${to.toFixed(1)} ${U}${from != null ? `, was ${from.toFixed(1)} ${U}` : ""}`;
}
/* why CraftBeerPi refused a strike water call from a screen that hadn't caught up with it, as START's refusal says it:
   the water already in the mash tun (409 moved), the box no longer applying (409 off, why), the recipe changed on
   another screen (409 recipe_changed, decided from its name and steps as START's is: none, unloaded; the same name,
   changed; another, another loaded), or USE or BACK TO over the ceiling (400 too_hot, with CraftBeerPi's own figure).
   None for an answer that isn't one of these: the call has failed. sample_time is for a CraftBeerPi that sends the
   mash tun's control interval as off rather than as a number missing */
const SW_OFF = {no_recipe: "no recipe is loaded now", malt_in: "the malt is already in", not_herms: "the mash tun no longer runs PID_HERMS",
  sample_time: "the forecast can't use the mash tun's control interval now", no_mash_in: "the recipe's first mash tun step isn't MashIn now",
  no_mash_tun: "CraftBeerPi doesn't find the mash tun now", no_hlt: "CraftBeerPi doesn't find the HLT now"};
function swWhyNot(d) {
  if (d.error === "moved") return "the strike water is already in the mash tun";
  if (d.error === "off") return SW_OFF[d.why] || "the strike water helper doesn't apply now";
  if (d.error === "too_hot") return `it's over ${+(num(d.max) ?? swCeil()).toFixed(1)} ${M.U}, too hot for strike water`;
  if (d.error !== "recipe_changed") return "";
  const steps = Array.isArray(d.steps) ? d.steps : [];
  if (!steps.length) return "the recipe was unloaded on another screen";
  return (String(d.name || "") || "Brew steps") === M.RECIPE.name ? "the recipe was changed on another screen" : "another recipe was loaded on another screen";
}
/* USE or BACK TO refused that way: what: the button and its figure */
const swNotApplied = (what, d) => (why => why ? `${what} wasn't applied: ${why}.` : "")(swWhyNot(d));
/* a strike water call to CraftBeerPi, as exec sends a command: its button says SENDING… or SETTING… until CraftBeerPi
   answers. label: the LOG line if it goes through as sent; o.ok(answer) gives the line in CraftBeerPi's own figures. A
   refusal the call knows (o.refused(answer, status) gives its words) logs nothing and is said under the box for 6 s;
   the box then follows the state that comes with it, or, where none does, the state asked for afresh after
   recipe_changed; too_hot changes nothing, so the box stays as it is. Anything else (no answer, an error that isn't
   one of its refusals) has failed: LOG says so, in light red, and the title bar's alarm says what is still in force
   (o.fail) */
function swExec(key, dir, label, request, o) {
  return exec(key, dir, label, request, {
    quiet: true,
    refused: res => {
      const d = res && res.data && typeof res.data === "object" ? res.data : null;
      if (!d || (res.status !== 409 && res.status !== 400)) return false;
      const words = o.refused(d, res.status);
      if (!words) return false;
      if (d.strike && typeof d.strike === "object") swTake(d.strike);
      else if (d.error === "recipe_changed") swFetch();
      note("r", words); say(words);
      return true;
    },
    ok: res => {
      const d = res.data && typeof res.data === "object" ? res.data : {};
      if (d.strike) swTake(d.strike);
      const line = (o.ok ? o.ok(d) : "") || label;
      logEvent(line, "confirmed", "ok");
      say(`${line}: confirmed`);
    },
    fail: () => alarm(o.fail, "OK", "b:ok")
  });
}
/* CraftBeerPi's state asked for afresh, where its refusal brought none */
function swFetch() {
  const g = gen;
  api.strikeState().then(r => {
    if (g !== gen || !r.ok || !r.data || typeof r.data !== "object") return;
    swTake(r.data);
    renderAll();
  });
}
/* a command's own answer carries the whole state: shown at once, until the websocket's word catches up with it */
let sAns = null;
function swTake(x) {
  if (!x || typeof x !== "object") return;
  sAns = {...x, received: Date.now()};
  st.sw = sAns;
}
function strikeMsg(snap) {
  const w = snap && snap.strike;
  if (sAns && !(w && num(w.now) >= num(sAns.now))) return sAns;
  sAns = null;
  return w && typeof w === "object" ? w : null;
}
/* the forecast failing for these numbers: one LOG line, once, in light red as a failed command's; nothing in the title
   bar and no sound, as nothing waits for the brewer */
let swFailedAt = null;
function swFailLog() {
  const f = st.sw && st.sw.failed;
  if (!f || f.at == null || f.at === swFailedAt) return;
  const line = `Strike water forecast failed: ${String(f.detail || "no reason given")}`;
  /* the first look after the page opened: kept from before, it was logged then */
  const first = swFailedAt === null;
  swFailedAt = f.at;
  if (first && st.events.some(e => e[1] === line)) return;
  logEvent(line, "failed", "bad");
}
/* r.wait: a running step whose timer has not started yet says what it is waiting for (HEATING, COOLING, WAITING,
   WAITING FOR YOU, or a BrewStart's STARTS 5:30 AM, its time by the clock's setting, which in 12-hour can go under the
   word (bsFit); the demo's true is HEATING); a step held for the brewer says WAITING FOR YOU. A SpargeStep's
   temperature is the HLT's water, not the mash, so it says so; once started with no timer it is SPARGING rather than
   NOW */
const waitHTML = w => w === true ? "HEATING" : w === WAITING_FOR_YOU ? `<span class="wfy">${w}</span>` : is12() && typeof w === "string" && w.startsWith("STARTS ") ? `STARTS <span class="wt">${w.slice(7)}</span>` : w;
/* the same in the phone's now line, in lower case, a time in it keeping its AM or PM: "starts 5:53 AM" */
const waitLow = w => typeof w === "string" && w.startsWith("STARTS ") ? `starts ${w.slice(7)}` : waitHTML(w).toLowerCase();
const stepTemp = s => (s.type === "SpargeStep" ? "water " : "") + s.temp;
const runWord = s => s.type === "SpargeStep" ? "SPARGING" : "NOW";
/* ---------- BrewStart's box (design/brewday BREWSTART-EDIT.md; BUILD-NOTES "BrewStart on Brew Day") ----------
   BrewStart's time is set on Brew Day the night before, from its row in the step list: Ready by first (the water hot by
   a time, BrewStart working out when heating must start), Start at the second choice; the day as TODAY or TOMORROW on
   CraftBeerPi's clock, which the step keeps as a date; and where the grain spent the night, asked once a brew as USE
   depends on it: in the garage, where the boil kettle's probe stands for it, or indoors, at a figure. BrewStart's water
   is a fact here: the strike water box (USE, HLT WATER) and Brew Steps (ALL SETTINGS) change it. Every other setting
   BrewStart has is on Brew Steps, one press away (ALL SETTINGS), so there is one editor for them. The row opens the box
   until BrewStart has finished: on a recipe not begun, while it waits for its time, while it heats or holds the water,
   and stopped. A recipe without BrewStart has + BrewStart
   above its first step, which opens the box for a new one. On one screen the box takes the step list's room, as the
   pre-brew check's box does; where the page scrolls it sits where the list is */
/* a day on CraftBeerPi's clock as a number, and its time counted the same way, in seconds (bsNow): the demo's days from
   its moment's first day (a simulator's own date, else Friday 20 Nov 2026, the night before brew day in the strike
   water moments), as st.t counts them; live, from 1 Jan 1970 by CraftBeerPi's own date and time of day (The One Clock
   Rule), and none until CraftBeerPi has said where its clock is */
const DAY0 = "2026-11-20";
const bsEpoch = () => Date.parse(`${DEMO_MODE ? (st && st.sim && st.sim.day0) || DAY0 : "1970-01-01"}T00:00:00Z`);
const dayOf = t => Math.floor(t / 86400);
const dayDate = i => new Date(bsEpoch() + i * 86400000);
const dateOf = i => dayDate(i).toISOString().slice(0, 10);
const dayIdx = iso => Math.round((Date.parse(iso + "T00:00:00Z") - bsEpoch()) / 86400000);
function bsNow() {
  if (DEMO_MODE) return st.t;
  const e = brewNow();
  if (e == null) return null;
  const d = new Date(e * 1000);
  return dayIdx(ymdOf(d)) * 86400 + daySeconds(d);
}
/* a day in words: "Sat" (dShort), "Sat 21 Nov" (dMid), "Saturday 21 November" (dLong), "SAT 21" (dKey) */
const tcase = w => w[0] + w.slice(1).toLowerCase();
const dShort = i => tcase(DOW[dayDate(i).getUTCDay()]);
const dMid = i => { const d = dayDate(i); return `${tcase(DOW[d.getUTCDay()])} ${d.getUTCDate()} ${tcase(MON3[d.getUTCMonth()])}`; };
const dLong = i => { const d = dayDate(i); return `${DOW_SAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON_SAY[d.getUTCMonth()]}`; };
const dKey = i => { const d = dayDate(i); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()}`; };
/* the recipe pages' words for a wait on CraftBeerPi's clock (its day) */
const CLOCK_WAIT = "Waiting for CraftBeerPi's clock.";
/* BrewStart in the recipe: the first one, which the box changes */
const bsIdx = () => M.RECIPE.steps.findIndex(s => s.type === "BrewStart");
const bsKind = s => s.kind || (s.start ? "start" : "ready");
const bsTime = s => s.start || s.ready || null;
const bsWaits = () => { const r = st.recipe, s = r && M.RECIPE.steps[r.cur]; return !!s && s.type === "BrewStart" && r.state === "running" && typeof r.wait === "string" && r.wait.startsWith("STARTS "); };
/* BrewStart as the strike water step (BrewStart 1.3.0; BUILD-NOTES "BrewStart heats the HLT itself"): with Ready by on
   the HLT, in a recipe with no MashInStep on the HLT, it heats the HLT itself at its heating start, then holds the water
   until it has been moved to the Mash Tun and Next pressed. The recipe's shape says so, as the strike water box finds
   its steps (swSteps). A recipe with a strike water step on the HLT keeps that step, which BrewStart hands over to as
   heating is due */
const bsStrike = () => {
  const S = M.RECIPE.steps, i = bsIdx();
  return i >= 0 && bsKind(S[i]) === "ready" && S[i].k === "hlt" && !S.some(s => s.k === "hlt" && s.type === "MashInStep");
};
/* BrewStart's question while it holds the water, in its words: live as CraftBeerPi asked it, naming the next kettle;
   with no question up (after a restart it doesn't ask a second time), the same words for the Mash Tun */
function bsAsk(s) {
  const q = !DEMO_MODE && st.prompts.find(p => String(p.title || "") === s.n && p.message);
  return q ? ut(q.message) : `Move the strike water to the ${DEMO_MODE ? DEMO.KNAME.mt : (M.K && M.K.mt && M.K.mt.name) || "Mash Tun"}, then press Next`;
}
/* BrewStart before its heating has begun: on a recipe not begun, and while it waits. Its row then gives its day, and
   USE waiting for the grain opens its box (after that, the strike water box's GRAIN) */
function bsLive(i) {
  const r = st.recipe, s = M.RECIPE.steps[i];
  if (!r || !s || s.type !== "BrewStart" || i !== bsIdx()) return false;
  return pbFresh() ? i >= r.cur : i === r.cur && bsWaits();
}
/* BrewStart running as the current step: waiting for its time, heating the water or holding it */
const bsRuns = () => { const r = st.recipe, bi = bsIdx(); return !!r && bi >= 0 && bi === r.cur && r.state === "running"; };
/* BrewStart stopped as the current step, after START: not done, and START carries it on */
const bsStopped = () => { const r = st.recipe, bi = bsIdx(); return !!r && bi >= 0 && bi === r.cur && r.state === "stopped"; };
/* BrewStart's row opens its box until BrewStart has finished: where bsLive has it, and while it heats or holds the water
   or is stopped as the current step. There the box changes its time and the grain, and ALL SETTINGS opens every
   setting it has on Brew Steps */
function bsOpens(i) {
  if (bsLive(i)) return true;
  return i === bsIdx() && (bsRuns() || bsStopped());
}
/* Brew Steps changes a running BrewStart's settings where BrewStart says it can (change_settings: M.BSSETS); the demo's
   can, as the mockup's does */
const bsSets = () => DEMO_MODE || !!M.BSSETS;
/* a waiting BrewStart takes a new time where BrewStart says it can (change_time, 1.2.0.post10: M.BSRETIME), and plans
   again at once. An older one can't (BUILD-NOTES, "In CraftBeerPi"): the box greys the time, the day and START AT while
   BrewStart waits, saying how to change it; the grain still changes, through the strike water's own call. The demo's
   BrewStart takes one, as the mockup's does */
const bsRetimes = () => DEMO_MODE || !!M.BSRETIME;
const BS_HELD = "BrewStart is waiting, so its time can't change now. Press STOP, change it, then hold START.";
/* BrewStart's day as a day number: the date it keeps (Mode Date); live, while it waits, the day it planned for, and
   otherwise the day its Mode counts from now on CraftBeerPi's clock, as START now would (Today, Tomorrow, or an older
   form's Daily, the next time the clock shows it); null where there is none, or CraftBeerPi's clock isn't known */
function bsDayOf(s) {
  if (DEMO_MODE) return s.date ? dayIdx(s.date) : null;
  if (s.planned && bsWaits() && M.RECIPE.steps[st.recipe.cur] === s) return dayIdx(s.planned);
  if (s.date) return dayIdx(s.date);
  const t = bsNow();
  if (t == null || s.mode === "Date" || s.mode === "DateTime") return null;
  const m = hmMin(bsTime(s)), today = dayOf(t);
  if (s.mode === "Tomorrow") return today + 1;
  if (s.mode === "Daily") return m != null && today * 86400 + m * 60 <= t ? today + 1 : today;
  return today;
}
/* where the grain spent the night, answered for this brew: "garage", "indoors", or null while it isn't. CraftBeerPi keeps
   the answer with the loaded steps (grain_place, core post59; the demo's stand-in too), and its strike state shows it
   (inputs.grain_place). One from before has no answer to keep and doesn't ask ("old"): its grain counts as answered */
function bsPlace() {
  const I = st.sw && st.sw.inputs;
  if (!I || typeof I !== "object" || !("grain_place" in I)) return "old";
  return I.grain_place === "garage" || I.grain_place === "indoors" ? I.grain_place : null;
}
/* the grain is asked only where USE depends on it, while the strike water box applies to this recipe */
const bsGrainHere = () => !!swPhase();
const bsGrainSaid = () => !bsGrainHere() || bsPlace() !== null;
/* a recipe with BrewStart whose grain isn't answered yet for this brew: USE waits for the answer (swHTML) */
const bsGrainAsk = () => bsIdx() >= 0 && !bsGrainSaid();
/* the grain's temperature as given (BrewStart's Grain_Temp), as CraftBeerPi's strike state reads it */
const bsGrainFig = s => { const I = st.sw && st.sw.inputs; return I && typeof I === "object" && "typed" in I ? num(I.typed) : s ? s.grain ?? null : null; };
/* the indoor grain's quick figures, the middle one pressed first, and the figures indoor grain can have */
const bsChips = () => M.U === "°C" ? [18, 20, 22] : [64, 68, 72];
const bsIndoor = () => M.U === "°C" ? [4, 38] : [40, 100];
/* a time kept 24-hour, as BrewStart's StartTime keeps it ("07:00"): minutes from midnight, or null */
function hmMin(x) {
  const m = /^\s*(\d{1,2}):?(\d{2})\s*$/.exec(x || "");
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
}
/* a time as typed in BrewStart's box, read by the one rule every page reads typed times by (util/timefmt.js
   parseTypedTime): "7", "700", "7:00", "7.30" and "7 30" in the half of the day the box showed as typing began (half,
   "AM" or "PM"), leading zeros or not; "7a", "7 am", "7p", "7 pm", "19", "19:00"; "12" noon and "12a" midnight. In
   24-hour, 7, 700, 0700 and 7:00 are all 07:00. Minutes from midnight, or null */
const bsParse = (x, half) => hmMin(parseTypedTime(x, half === "PM" ? "pm" : "am", {format: fmtNow()}));
/* the box's time as it shows it: "7:00", its half on the AM and PM buttons beside it; in 24-hour "07:00" */
const bsShow = m => m == null ? "" : formatTimeOfDay(hhmm(m * 60), {format: fmtNow(), ampm: false});
const bsHalf = m => m < 720 ? "AM" : "PM";
/* BrewStart's time on CraftBeerPi's clock (bsNow's count), from its day and its time; null without them */
function bsAt(s) { const m = hmMin(bsTime(s)), d = bsDayOf(s); return m == null || d == null ? null : d * 86400 + m * 60; }
/* the row and + BrewStart wait with the recipe's own commands, pause with no connection and, live, wait for CraftBeerPi's
   clock, which gives the box its days; a tap says why */
function bsRowWhy() {
  const P = st.pend;
  if (st.link === "lost") return PAUSED;
  if (P["r:check"]) return PB_WAIT;
  if (["bs", "r:start", "r:stop", "r:next", "r:reset", "r:unload", "r:load"].some(k => P[k])) return WAIT;
  return bsNow() == null ? CLOCK_WAIT : "";
}
/* what BrewStart's row asks first, in the order of what waits on the brewer: no time set ("time"), then where the grain
   spent the night ("grain"); nothing once both are given */
const bsRowAsks = s => !bsTime(s) ? "time" : !bsGrainSaid() ? "grain" : "";
const bsVolSaid = s => `${+s.vol.toFixed(2)} ${(s.volU || "gal") === "L" ? (s.vol === 1 ? "litre" : "litres") : (s.vol === 1 ? "gallon" : "gallons")}`;
/* BrewStart's row as a button (stepHTML): the row as it was, with the day in its details before its heating, and under
   its state a small hint for what it asks: "set a time", "where's the grain?", or "change". Holding the water it keeps
   its question as its note line (nt). Its label says the same in words */
function bsRowHTML(s, i, state, p, right, nt) {
  const tm = bsTime(s), d = bsDayOf(s), why = bsRowWhy(), asks = bsRowAsks(s), heat = state === "cur" && bsRuns() ? st.recipe.bsHeat : null;
  const hint = asks === "time" ? '<small class="bsh amb">set a time</small>' : asks === "grain" ? "<small class=\"bsh amb\">where's the grain?</small>" : '<small class="bsh">change</small>';
  const said = `${s.n}: ${tm ? `${bsKind(s) === "start" ? "start at" : "ready by"} ${todS(tm)}${d != null ? ` ${dLong(d)}` : ""}` : "no time set"}${s.temp != null ? `, ${stepTemp(s)} ${M.U}` : ""}${s.vol != null ? `, ${bsVolSaid(s)}` : ""}${heat === "heating" ? ", heating the water" : heat === "holding" ? ", holding the water, waiting for you" : ""}. ${tm ? "Change it" : "Set a time"}${!bsGrainSaid() ? ". Where the grain spent the night isn't given yet" : ""}`;
  const note = nt ? `<span class="p pn${state === "cur" && st.banner && st.banner.title === s.n ? " asked" : ""}">${esc(nt)}</span>` : "";
  return `<li class="stepb"><button type="button" class="step bs"${state === "cur" ? ' aria-current="step"' : ""} data-cmd="bs:open" aria-label="${esc(said)}" aria-expanded="${!!st.bsOpen}"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="n">${i + 1}</span><span class="t">${esc(s.n)}</span><span class="p">${p}</span>${note}<span class="s">${right}${hint}</span></button></li>`;
}
/* the row's hint on one line under its state where that leaves the name and the details their lines; where the width it
   takes would give them another line, it wraps inside the state's own width instead (data-wrap, brewday.css). In
   12-hour, STARTS's time goes under the word (data-stack) where its AM or PM would otherwise cost the row height, as
   the state then takes less of the row's width. Tried each time the column is drawn, when it changes size and once the
   fonts are in; while the list is hidden the hint stays on one line and STARTS on one line. True where it changed */
function bsFit() {
  const r = root && $("#recipe .step.bs");
  if (!r) return false;
  const was = [r.hasAttribute("data-wrap"), r.hasAttribute("data-stack")], h = () => r.querySelector(".t").offsetHeight + r.querySelector(".p").offsetHeight;
  const set = (w, s) => { r.toggleAttribute("data-wrap", w); r.toggleAttribute("data-stack", s); };
  set(false, false);
  const one = h();
  set(true, false);
  const wrap = h() < one;
  let stack = false;
  if (is12() && r.querySelector(".s .wt")) { set(wrap, false); const flat = r.offsetHeight; set(wrap, true); stack = r.offsetHeight < flat; }
  set(wrap, stack);
  return wrap !== was[0] || stack !== was[1];
}
/* POST /step2/ with index, so a new step goes in at its place: CraftBeerPi 4.7.7.post58 and later. An older one puts it
   last, so + BrewStart, which puts BrewStart in as step 1, waits for a CraftBeerPi that says it is new enough */
function bsAddsFirst() {
  if (DEMO_MODE) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?(?:\.post(\d+))?/.exec(String((last || {}).version || ""));
  if (!m) return false;
  const v = [+m[1], +m[2], +m[3], m[4] == null ? 0 : +m[4], m[5] == null ? -1 : +m[5]], want = [4, 7, 7, 0, 58];
  for (let i = 0; i < want.length; i++) if (v[i] !== want[i]) return v[i] > want[i];
  return true;
}
/* + BrewStart: on a recipe loaded and not begun that has no BrewStart, a dashed row above its first step, not a step
   yet, that opens BrewStart's box for a new one */
function bsAddHTML() {
  if (!pbFresh() || bsIdx() >= 0 || !bsAddsFirst()) return "";
  const why = bsRowWhy();
  return `<li class="bsnew"><button type="button" class="bsadd" data-cmd="bs:new" aria-expanded="${!!st.bsOpen}"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="pl" aria-hidden="true">+</span><span class="t"><span class="sr">Add </span>BrewStart</span><span class="p">Hot water by a set time&nbsp;· goes in as step 1</span></button></li>`;
}
/* a time not yet set takes its day by the noon rule: TOMORROW from noon on CraftBeerPi's clock, TODAY before it */
const bsNoon = () => { const t = bsNow(); return dayOf(t) + (t % 86400 >= 12 * 3600 ? 1 : 0); };
/* a new BrewStart's temperature: the strike water step's, or without one the first mash step's. Live, the first
   MashInStep's, as the recipe pages take it: the strike water step where there is one */
function bsNewTemp() {
  if (DEMO_MODE) { const {S, si, mi} = swDemoSteps(); return si >= 0 ? S[si].temp : mi >= 0 ? S[mi].temp : null; }
  const s = M.RECIPE.steps.find(x => x.type === "MashInStep");
  return s && s.temp != null ? s.temp : null;
}
/* how long until then, in words, kept on one line; on a simulator not at 1×, in real time too (inWords, as the recipe
   pages say it) */
const bsIn = sec => { const w = inWords(sec, SC()), i = w.indexOf(","); return i < 0 ? nb(w) : nb(w.slice(0, i)) + w.slice(i); };
/* while BrewStart waits with Ready by, what it plans for heating the water: its ready time less its heating start, as
   its row has them (live, the heating start is the STARTS its status line gives, on the ready day or the day before);
   null otherwise. A new ready time no further away than that, and a minute, has BrewStart start heating at once
   (change_time), as START does for a time too soon */
function bsLead() {
  const bi = bsIdx(), s = bi >= 0 ? M.RECIPE.steps[bi] : null, at = s ? bsAt(s) : null;
  if (!s || bsKind(s) === "start" || !bsWaits() || at == null) return null;
  if (DEMO_MODE) return at - bsHeatAt(s, st.v.hlt.pv);
  const m = clockMin(st.recipe.wait.slice(7));
  if (m == null) return null;
  const heat = Math.floor(at / 86400) * 86400 + m * 60;
  return at - (heat > at ? heat - 86400 : heat);
}
/* the HLT's name, for a new BrewStart, which heats it: CraftBeerPi's name for it, live */
const bsHltName = () => DEMO_MODE ? DEMO.KNAME.hlt : (M.K && M.K.hlt && M.K.hlt.name) || "HLT";
/* what BrewStart heats, as its settings have it: its kettle, its element's power, its water and its temperature. A new
   one's are filled in as the recipe pages fill one (bsFillOf); the demo's from the mockup's numbers */
function bsWaterOf(B) {
  const s = B.neu ? null : M.RECIPE.steps[bsIdx()];
  if (DEMO_MODE) return s ? {kn: DEMO.KNAME[s.k], watts: s.watts, temp: s.temp, vol: s.vol ?? null, volU: "gal"}
    : {kn: DEMO.KNAME.hlt, watts: DEMO.SW_WATTS, temp: bsNewTemp(), vol: DEMO.SW_NEED, volU: "gal", from: "recipe"};
  if (s) { const W = s.water || {}; return {kn: W.kn || bsHltName(), watts: W.watts, temp: W.temp, vol: W.vol, volU: W.volU || "gal"}; }
  const F = B.fill || {};
  return {kn: F.kn || bsHltName(), watts: F.watts, temp: bsNewTemp(), vol: F.vol ?? null, volU: F.volU || "gal", from: F.from, past: F.past, lacks: F.lacks};
}
/* the box's time in words, or that it has passed (past), or that it is too soon to wait for, so SET starts the heating
   (soon); null while what's typed isn't a time (B.m, the time the box stands for) */
function bsSays(B) {
  const m = B.m, t = bsNow();
  if (m == null || t == null) return null;
  const at = B.day * 86400 + m * 60, now = dayOf(t), hm = tod(m * 60), rel = B.day === now ? "today" : B.day === now + 1 ? "tomorrow" : "";
  if (at <= t) return {past: true, text: `${hm} ${rel || dMid(B.day)} has passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW.`};
  const lead = B.neu || B.kind === "start" ? null : bsLead();
  if (lead != null && at - t <= lead + 60) return {past: false, soon: true, text: `Heating starts as soon as you press HEAT NOW: BrewStart plans ${nb(durWords(lead))} for heating the water, and ${hm} ${rel || dMid(B.day)} is ${nb(durWords(at - t))} away.`};
  const S = M.RECIPE.steps, bi = bsIdx(), nx = B.neu ? S[0] : S[bi + 1], when = `${hm}${rel ? ` ${rel},` : ""} ${dMid(B.day)}: ${bsIn(at - t)}.`;
  /* Start at chosen while BrewStart heats or holds the water: SET stops its heating, so the box says so first */
  const stops = !B.neu && B.kind === "start" && bsRuns() && st.recipe.bsHeat && bsKind(S[bi]) !== "start" ? `SET stops BrewStart's heating: the ${bsWaterOf(B).kn}'s AUTO goes off. ` : "";
  return {past: false, text: B.kind === "start" ? `${stops}${nx ? nx.n : "The next step"} starts at ${when}` : `The ${bsWaterOf(B).kn}'s water is hot by ${when}`};
}
/* the water, last in the box: what BrewStart heats, a fact here. A new one's is the recipe pages' (bsFillOf): worked
   out from the recipe; else the water of the newest brew that was brewed and recorded it, saying which brew and why
   the recipe's own can't be worked out; else none, saying both. It says where it changes: ALL SETTINGS always, and the
   strike water box only where that box is on the screen and offers the water (swWaterAt). Under it, where the HLT's
   capacity is known and the water is more (hltOver) */
function swWaterAt() {
  if (!swPhase() || !st.sw) return "";
  const N = swNumbers();
  return N.ok || N.wait ? "CHANGE in the strike water box's FORECAST" : "HLT WATER in the strike water box";
}
function bsWater(B) {
  const w = bsWaterOf(B), U = M.U, el = `The ${esc(w.kn)}'s ${w.watts ? `${w.watts} W ` : ""}element heats`, to = w.temp == null ? "" : ` to ${w.temp.toFixed(1)} ${U}`, sw = swWaterAt();
  const none = B.neu && w.lacks ? `${w.lacks}, and no past brew recorded the HLT's water. Give it` : "give it";
  if (w.vol == null) return `<p class="bswat">${el} the water${to}. <b>How much water isn't known yet</b>: ${none} with ALL SETTINGS${sw ? `, or ${sw},` : ""} before you START.</p>`;
  if (B.neu) return `<p class="bswat">${el} ${+w.vol.toFixed(2)} ${w.volU}${to}, ${w.from === "past" && w.past ? `the water the HLT heated for ${esc(brewWords(w.past))}, the last brew that recorded it: ${w.lacks}` : "worked out from the recipe"}.</p>${hltOverHTML(w.vol, w.volU)}`;
  return `<p class="bswat">${el} ${+w.vol.toFixed(2)} ${w.volU}${to}. ALL SETTINGS changes them.${sw ? ` ${sw[0].toUpperCase()}${sw.slice(1)} changes the water too.` : ""}</p>${hltOverHTML(w.vol, w.volU)}`;
}
/* how much the HLT holds, in the volume unit vu ("gal" or "L"), where the Hardware page gives it (CraftBeerPi's kettle
   field capacity, kept in the brewery's own unit); null where it isn't given or can't be right, which changes nothing
   (The Only Improves Rule). The demo's moments give it in st.vessels, in gallons */
function hltHolds(vu) {
  const c = DEMO_MODE ? num(((st.vessels || {}).hlt || {}).capacity) : num(M.K && M.K.hlt && M.K.hlt.capacity);
  if (c == null || !(c > 0)) return null;
  const kept = DEMO_MODE || M.C === "F" ? "gal" : "L";
  return kept === vu ? c : vu === "L" ? c * GAL_L : c / GAL_L;
}
/* BrewStart's water, or the HLT's water typed in the strike water box, more than the HLT holds: one line in Note Amber
   under the figure, saying both figures and where the capacity comes from, so either can be put right. It greys and
   refuses nothing, and with no capacity given there is no line */
function hltOver(vol, vu) {
  const c = hltHolds(vu);
  return c != null && vol != null && vol > c + 0.005 ? `${+vol.toFixed(2)} ${vu} is more than the HLT holds: ${+c.toFixed(2)} ${vu}, on the Hardware page.` : "";
}
const hltOverHTML = (vol, vu) => { const t = hltOver(vol, vu); return t ? `<p class="vover">${t}</p>` : ""; };
const bsHint = B => `${B.kind === "start" ? "start at" : "ready by"} ${B.m == null ? "– –" : tod(B.m * 60)} ${dShort(B.day)}`;
/* a time that can't be read, said once the time box is left and by SET; in 24-hour SET says it as before */
const BS_BAD = "That isn't a time: type it as 7, 7:30 or 730, and tap AM or PM.";
const bsBad = () => is12() ? BS_BAD : "Type the time as 07:00.";
/* SET, or ADD BREWSTART for a new one, in Selection Blue as the editors' main action; greyed with no connection, while
   a command waits, while a new one's settings are still being read from the Recipe Book (bsFillLoad), and for a time
   that has passed, with the sentence that says so as its reason. For a ready time too soon for BrewStart to wait, it
   says what it does: HEAT NOW */
const bsGoWhy = (B, ws) => {
  const P = st.pend;
  return st.link === "lost" ? PAUSED : P.bs ? WAIT : P["r:check"] ? PB_WAIT : ["r:start", "r:stop", "r:next", "r:reset", "r:unload", "r:load"].some(k => P[k]) || B.fillBusy ? WAIT : ws && ws.past ? ws.text : "";
};
function bsGoHTML(B, ws) {
  const busy = !!st.pend.bs, why = bsGoWhy(B, ws);
  return B.neu ? b("cmdbtn bsgo", busy ? "ADDING…" : "ADD BREWSTART", "as step 1", {cmd: "bs:set", why})
    : b("cmdbtn bsgo", busy ? "SETTING…" : ws && ws.soon ? "HEAT NOW" : "SET", bsHint(B), {cmd: "bs:set", why});
}
let bsGoLast = "", bsClkLast = "";
/* BrewStart's box on a simulator whose clock isn't the screen's (clockTag): where that clock is, in the title bar tag's
   look, always with its date and with its speed where it isn't 1×: "CRAFTBEERPI'S CLOCK · MON 23 NOV, 1:16 PM · 30×
   SPEED", said in full in sentence case. Each part keeps to one line; the tag wraps between them. Nothing on the rig */
function bsClockHTML() {
  const g = clockTag();
  if (!g || !g.day) return "";
  const {day, scale} = g, fast = scale !== 1, t = tod(g.t);
  const line = [nb("CRAFTBEERPI'S CLOCK"), nb(`${DOW[day.w]} ${day.d} ${MON3[day.m]}, ${t}`), fast ? nb(`${scale}× SPEED`) : ""].filter(Boolean).join(" · ");
  const said = `CraftBeerPi's clock: ${DOW_SAY[day.w]} ${day.d} ${MON_SAY[day.m]}, ${t}${fast ? `, running ${scale} times as fast` : ""}.`;
  return `<p class="bsclk" id="bs-clk"><span aria-hidden="true">${line}</span><span class="sr">${said}</span></p>`;
}
/* the box: a legend in its top border as the timer editor's; then, on a simulator whose clock isn't the screen's, where
   that clock is (bsClockHTML), and while BrewStart runs or is stopped, what it is doing (waiting, heating or holding the
   water, stopped), both
   pinned above the middle so they stay in view while the middle scrolls. In the middle, Ready by (or Start at) with the
   other as a quiet button; the time's keys and box; AM and PM (not in 24-hour); the day; the time in words; where the
   grain spent the night, where USE depends on it; and last the water, only a fact here, so the part that may scroll out
   of view. At its foot, pinned so they stay in reach while the middle scrolls, the note line, SET and CANCEL, and ALL
   SETTINGS under them, which opens every setting BrewStart has on Brew Steps (bsAllGo), asking first (bsAskHTML) where
   the box has something not set yet. While its command waits, everything in it is greyed; while BrewStart runs and
   can't take a new time (bsRetimes), the time, AM and PM, the day and START AT */
function bsHTML() {
  const B = st.bs, S = M.RECIPE.steps, bi = bsIdx(), s = B.neu ? null : S[bi], busy = !!st.pend.bs, wait = !B.neu && bsWaits(), now = dayOf(bsNow()), U = M.U;
  const off = busy ? WAIT : "", ws = bsSays(B), nx = S[bi + 1], run = !B.neu && bsRuns(), heat = run ? st.recipe.bsHeat : null, w = bsWaterOf(B);
  const held = run && !bsRetimes() ? BS_HELD : "", hoff = off || held, hdis = hoff ? ` aria-disabled="true" data-why="${esc(hoff)}"` : "";
  const key = (d, l, a) => `<button type="button" data-cmd="bs:step:${d}" aria-label="${a}"${hdis}>${l}</button>`;
  const at = w.temp == null ? "" : ` ${heat === "holding" ? "at" : "to"} ${w.temp.toFixed(1)} ${U}`;
  const head = wait ? `<p class="bsw">BrewStart is waiting: ${bsKind(s) === "start" ? `${nx ? esc(nx.n) : "the next step"} starts at ${todS(bsTime(s))}` : `heating starts about ${st.recipe.wait.slice(7)}`}.${held ? "" : " A change here plans it again at once."}</p>`
    : heat === "heating" ? `<p class="bsw">BrewStart is heating the ${esc(w.kn)}'s water${at}. A new time here changes when it should be ready; the heating carries on.</p>`
    : heat === "holding" ? `<p class="bsw">BrewStart is holding the ${esc(w.kn)}'s water${at} for you to move it.</p>`
    : !B.neu && bsStopped() ? '<p class="bsw">BrewStart is stopped: START carries it on with what is set here.</p>' : "";
  /* Ready by and Start at swap here whenever BrewStart isn't done: SET sends the swap through BrewStart's change_settings
     while it runs or is stopped (bsSets). An older BrewStart can't take it while it runs: STOP first, then the row
     still opens the box */
  const doing = heat === "holding" ? "holds the water" : heat ? "heats the water" : "waits";
  const kindWhy = !run || bsSets() ? "" : held || `Not while BrewStart ${doing}: STOP it first.`;
  const kind = `<div class="bskind"><p class="bsl" id="bs-kl">${B.kind === "start" ? "Start at" : "Ready by"}</p>${b("bsq", B.kind === "start" ? "READY BY INSTEAD" : "START AT INSTEAD", "", {cmd: "bs:kind", why: off || kindWhy})}</div>`;
  const as = is12() ? "7:00" : "07:00";
  const time = `<div class="editor bstime" role="group" aria-labelledby="bs-kl">${key(-60, "−1 H", "An hour earlier")}${key(-15, "−15", "15 minutes earlier")}<input id="bstin" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="${as}" value="${esc(B.txt)}" aria-label="Time, as ${as}"${busy || held ? " readonly" : ""}${held ? ` data-cmd="noop"${hdis}` : ""}>${key(15, "+15", "15 minutes later")}${key(60, "+1 H", "An hour later")}</div>`;
  /* the half of the day the time is in, pressed; a tap moves the same time to the other half. A compact pair, without
     hints: the time in words below says which half it is */
  const half = !is12() ? "" : `<div class="bsday bsap" role="group" aria-label="AM or PM">${b("cmdbtn", "AM", "", {cmd: "bs:ap:AM", pressed: B.ap === "AM", why: hoff})}${b("cmdbtn", "PM", "", {cmd: "bs:ap:PM", pressed: B.ap === "PM", why: hoff})}</div>`;
  const day = `<div class="bsday" role="group" aria-label="Day">${b("cmdbtn", "TODAY", dKey(now), {cmd: "bs:day:0", pressed: B.day === now, why: hoff})}${b("cmdbtn", "TOMORROW", dKey(now + 1), {cmd: "bs:day:1", pressed: B.day === now + 1, why: hoff})}</div>`;
  const chips = B.where !== "indoors" ? "" : `<div class="bsin" role="group" aria-label="The grain's temperature indoors">${bsChips().map(c => b("cmdbtn bschip", `${c} ${U}`, "", {cmd: `bs:chip:${c}`, pressed: B.chip === c, why: off})).join("")}`
    + `<span class="bsor"><span aria-hidden="true">or</span><input id="bsgin" inputmode="decimal" autocomplete="off" maxlength="5" value="${esc(B.fig)}" aria-label="Or another figure, in ${U}"${busy ? " readonly" : ""}><span aria-hidden="true">${U}</span></span></div>`;
  const grain = !bsGrainHere() ? "" : `<div class="bsgrain"><p class="bsl" id="bs-gl">Where is the grain tonight?</p><p class="bsgh">Asked once a brew: USE depends on it.</p>`
    + `<div class="bswhere" role="group" aria-labelledby="bs-gl">${b("cmdbtn", "IN THE GARAGE", `the boil kettle's probe, ${f1(st.v.bk.pv)} ${U}`, {cmd: "bs:where:garage", pressed: B.where === "garage", why: off})}${b("cmdbtn", "INDOORS", "give its temperature", {cmd: "bs:where:indoors", pressed: B.where === "indoors", why: off})}</div>${chips}</div>`;
  bsGoLast = bsGoHTML(B, ws); bsClkLast = bsClockHTML();
  const foot = B.ask ? bsAskHTML(B, ws) : `<div class="bsact">${bsGoLast}${b("cmdbtn", "CANCEL", "", {cmd: "bs:x", why: off})}</div>${b("cmdbtn bsall", "ALL SETTINGS", "every setting, on Brew Steps", {cmd: "bs:all", why: off})}`;
  return `<section class="bsbox" id="bs-box" aria-labelledby="bs-t"><h3 class="bst" id="bs-t">BrewStart</h3>${bsClkLast}${head}<div class="bsmid">${kind}${time}${half}${day}`
    + `<p class="bssay${ws && ws.past ? " past" : ""}" id="bs-say">${ws ? esc(ws.text) : ""}</p>${grain}${bsWater(B)}</div>`
    + `<div class="bsfoot"><p class="note">${esc(st.notes.r || "")}</p>${foot}</div></section>`;
}
/* what the box has that BrewStart hasn't yet: a new time (its kind, time or day) and the grain's answer, against what
   the box opened with. A new BrewStart has nothing to keep until a time or the grain is given */
const bsSnap = B => ({time: JSON.stringify([B.kind, B.m, B.day]), grain: JSON.stringify([B.where, B.chip, String(B.fig || "").trim()])});
function bsUnset(B) {
  const a = B.init || bsSnap(B), n = bsSnap(B);
  return {time: a.time !== n.time, grain: a.grain !== n.grain};
}
/* ALL SETTINGS with something in the box not set yet asks in its foot, in place of SET and CANCEL, as the recipe's
   questions ask: what isn't set, and what each answer does. SET AND GO (HEAT NOW AND GO, ADD AND GO, as the main
   button says it) sends it as SET would, greyed where SET is, then opens Brew Steps; GO WITHOUT IT opens it, leaving
   BrewStart as it is; STAY goes back to the box. No answer is the default */
function bsAskHTML(B, ws) {
  const u = bsUnset(B), both = u.time && u.grain, it = both ? "them" : "it", verb = B.neu ? "ADD" : ws && ws.soon ? "HEAT NOW" : "SET", why = bsGoWhy(B, ws);
  const what = B.neu ? "BrewStart isn't added yet." : both ? "Your changes here aren't set yet." : u.time ? "The new time isn't set yet." : "The grain's answer isn't set yet.";
  const does = B.neu ? `${verb} AND GO adds it as step 1, then opens all its settings; GO WITHOUT IT opens a new one there, not added until you SAVE it.`
    : `${verb} AND GO ${verb === "HEAT NOW" ? "starts the heating" : `sets ${it}`}, then opens all of BrewStart's settings; GO WITHOUT ${it.toUpperCase()} leaves BrewStart as it is.`;
  const yes = `<button type="button" class="yes" data-cmd="bs:all-set"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${verb} AND GO</button>`;
  return `<div class="confirm bsask" role="group" aria-labelledby="bs-ask-t"><p id="bs-ask-t" tabindex="-1">${what} ${does}</p><div>${yes}<button type="button" data-cmd="bs:all-go">GO WITHOUT ${it.toUpperCase()}</button></div><div class="one"><button type="button" data-cmd="bs:all-stay">STAY</button></div></div>`;
}
/* ALL SETTINGS' question wholly in view by the least scrolling, its three answers included: where the page scrolls,
   and on a phone above the tab bar fixed at the foot of the window */
function bsAskInView() {
  const a = root && $("#bs-box .bsask");
  if (!a) return;
  a.scrollIntoView({block: "nearest"});
  const tabs = $(".tabs"), foot = tabs && getComputedStyle(tabs).position === "fixed" ? tabs.getBoundingClientRect().top - 8 : window.innerHeight;
  const r = a.getBoundingClientRect();
  if (r.bottom > foot) window.scrollBy(0, Math.ceil(r.bottom - foot));
}
/* ALL SETTINGS done: Brew Steps at BrewStart's settings (#/step/<id>), told it came from here (from "brewday") so it
   offers the way back; for a new BrewStart, + BrewStart pressed there (bsadd). The box closes, changing nothing more.
   The demo says where it would go, as its tabs do */
function bsAllGo(B) {
  const s = B.neu ? null : M.RECIPE.steps[bsIdx()], found = s || (B.then === "all" && bsIdx() >= 0 ? M.RECIPE.steps[bsIdx()] : null);
  if (st.bs === B) { st.bsOpen = false; st.bs = null; }
  if (st.alarm && st.alarm.cmd === "bs:again") st.alarm = null;
  if (DEMO_MODE) { renderAll(); bsBack(B.neu && !found ? "new" : "row"); return toast("Mockup: this opens Brew Steps at BrewStart's settings."); }
  renderAll();
  go(found && found.id != null ? `/step/${encodeURIComponent(found.id)}` : "/mashprofile", {from: "brewday", bsadd: !found});
}
/* the box as the brewer types, or as the clock moves on: its words, AM and PM, SET and the simulator's clock, in place,
   so the time box keeps its caret. The words are said aloud for the brewer's own changes (bsAnnounce) and once as a
   time passes, never as the minutes count down */
function bsPatch(ticked) {
  const B = st.bs, w = root && $("#bs-say"), go = root && $("#bs-box .bsgo");
  if (!B || !w) return;
  const ws = bsSays(B), text = ws ? ws.text : "", past = !!(ws && ws.past);
  if (w.textContent !== text) w.textContent = text;
  w.classList.toggle("past", past);
  root.querySelectorAll("#bs-box .bsap button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cmd === `bs:ap:${B.ap}`)));
  const clk = $("#bs-clk"), ch = bsClockHTML();
  if (clk && ch !== bsClkLast) { clk.outerHTML = ch; bsClkLast = ch; }
  const html = bsGoHTML(B, ws);
  if (go && html !== bsGoLast) { go.outerHTML = html; bsGoLast = html; }
  if (ticked && past && !B.saidPast) say(text);
  B.saidPast = past;
}
/* what's typed in the time box, read in the half the box showed as typing began (B.ap0): the half pressed is the one
   the time is in, which what's typed can change ("7p", "19"), and while it can't be read, the half typing began in. A
   time that can't be read waits to be said until the box is left (bsLeft) */
function bsTyped(v) {
  const B = st.bs;
  if (B.ap0 == null) B.ap0 = B.ap;
  const m = bsParse(v, B.ap0);
  B.txt = v; B.m = m;
  if (is12()) B.ap = m != null ? bsHalf(m) : B.ap0;
  bsUnbad();
  if (B.ask) { B.ask = false; renderAll(); }
  /* again once the browser has brought the caret into view, which it does after this, before the screen is drawn:
     where the time box and the sentence don't both fit, the sentence stays in view */
  bsPatch(); bsSayInView(); requestAnimationFrame(() => { if (st && st.bs === B) bsSayInView(); }); bsAnnounce(true);
}
/* the time box left (not just drawn again as the column changes): the next typing starts from the half then pressed,
   and a time that can't be read is said in the note line. In place, so a key or button just pressed keeps its press */
function bsLeft() {
  const B = st && st.bs;
  if (!root || !B || (document.activeElement && document.activeElement.id === "bstin")) return;
  B.ap0 = null;
  if (!is12() || B.m != null || !String(B.txt || "").trim()) return;
  st.notes.r = BS_BAD;
  const n = $("#bs-box .bsfoot .note");
  if (n) n.textContent = BS_BAD;
  clearTimeout(noteTimers.r);
  noteTimers.r = setTimeout(() => { if (st && st.notes.r === BS_BAD) { st.notes.r = ""; renderAll(); } }, 6000);
}
/* the sentence goes once the time can be read again, or as typing starts again */
function bsUnbad() {
  if (st.notes.r !== BS_BAD) return;
  st.notes.r = "";
  const n = root && $("#bs-box .bsfoot .note");
  if (n) n.textContent = "";
}
/* the time in words wholly in view in the box's middle, by the least scrolling, while it says something the brewer must
   read before SET: HEAT NOW's sentence, or that the time has passed. The time box above it stays in view wherever both
   fit; where they don't, the sentence wins, as the main button acts on it. The middle scrolls, not the page, except on
   a phone while its on-screen keyboard is up: it covers the page's foot without making the page shorter, so where the
   sentence is under it the page scrolls by the difference, the time box kept in view above it (util/keyboard.js, as
   the recipe pages keep BrewStart's time in words in view) */
function bsSayInView() {
  const B = st && st.bs, ws = B && bsSays(B), m = root && $("#bs-box .bsmid"), w = root && $("#bs-say"), tb = root && $("#bs-box .bstime");
  if (!ws || !(ws.soon || ws.past) || !m || !w || !tb) return;
  if (m.scrollHeight > m.clientHeight) {
    const R = m.getBoundingClientRect(), W = w.getBoundingClientRect(), T = tb.getBoundingClientRect();
    let d = W.bottom > R.bottom ? W.bottom - R.bottom : W.top < R.top ? W.top - R.top : 0;
    /* the time box too where both fit, with room for its focus ring (the middle's 5 px) */
    const ring = W.bottom - T.top + 5 <= R.height ? 5 : 0;
    if (W.bottom - T.top <= R.height && T.top - d < R.top + ring) d = T.top - R.top - ring;
    if (d) m.scrollTop += d > 0 ? Math.ceil(d) : Math.floor(d);
  }
  clearKeyboard(w, {keep: tb, gap: 8});
}
/* the keyboard coming up (the visual viewport growing shorter) while the time box has focus: the sentence again kept
   clear of it */
const onKeyboard = () => { if (root && st && st.bsOpen && document.activeElement && document.activeElement.id === "bstin") bsSayInView(); };
let bsSayT;
function bsAnnounce(later) {
  clearTimeout(bsSayT);
  const tell = () => { const ws = root && st && st.bs && bsSays(st.bs); if (ws) say(ws.text); };
  if (later) { bsSayT = setTimeout(tell, 700); timers.push(bsSayT); } else tell();
}
/* opening the box: one box at a time in the column, so it closes NEXT STEP's, RESET's and UNLOAD's questions, LOAD's,
   the probes' panel, the pre-brew check's box and the strike water box's FORECAST and its small boxes; a timer's editor
   makes way with the timers on one screen, as for the pre-brew check's box. It starts from the step: its kind, time and
   day, and the grain's answer; a new BrewStart from Ready by with no time, its day by the noon rule. o: what a moment
   opens it with (rel: the day, 0 today or 1 tomorrow; at: a part of the box to show), or what the row and USE waiting
   for the grain open it with (focus "garage": on IN THE GARAGE; from "use": focus back on USE as the box closes) */
function bsOpen(o = {}) {
  const S = M.RECIPE.steps, bi = bsIdx(), neu = !!o.neu || bi < 0, s = neu ? null : S[bi], now = dayOf(bsNow()), d = s ? bsDayOf(s) : null;
  Object.assign(st, {confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null, pbOpen: false, cmpOpen: false, rbOpen: false, swOpen: false, swVol: null, swGrain: null, swRec: null});
  const place = bsPlace(), fig = bsGrainFig(s);
  const where = !s || !bsGrainHere() ? null : place === "old" ? (fig != null ? "indoors" : null) : place;
  const B = {neu, from: o.from || (neu ? "new" : "row"), kind: s ? bsKind(s) : "ready", day: d === now || d === now + 1 ? d : bsNoon(), where, chip: null, fig: ""};
  ["kind", "where"].forEach(k => { if (o[k] !== undefined) B[k] = o[k]; });
  /* the time as the step keeps it, 24-hour, or as a moment opens the box with it (txt); shown as the box shows it, its
     half pressed. An empty box starts at AM */
  B.m = hmMin(o.txt !== undefined ? o.txt : s ? bsTime(s) || "" : "");
  Object.assign(B, {txt: bsShow(B.m), ap: B.m == null ? "AM" : bsHalf(B.m), ap0: null});
  if (o.rel != null) B.day = now + o.rel;
  if (B.where === "indoors") { const g = where === "indoors" ? fig : null, C = bsChips(); if (g == null || C.includes(g)) B.chip = g ?? C[1]; else B.fig = g.toFixed(1); }
  B.init = bsSnap(B);
  st.bs = B; st.bsOpen = true;
  if (neu && !DEMO_MODE) bsFillLoad(B);
  renderAll(); bsFocus(o.at, o.focus, !!o.now);
}
/* focus goes to the time box, or to IN THE GARAGE with the grain's two answers scrolled into view in the box's middle
   (for USE waiting for the grain, and for the row while its hint asks where the grain is); a moment can show the
   middle scrolled to a part of it (at). Opened at the time, the time in words is brought into view where it must be
   read before SET (bsSayInView). On a phone the page first brings the box itself into view (boxInView), the focus
   moving in without the browser's own scrolling, which only looks for the box focused. Once the press that opened the
   box is done; for a moment opening it as it loads (now), once the fonts are in, as the mockup's moments have it, so
   what is scrolled into view is where it ends up */
const bsFocus = (at, on, now = false) => {
  const go = () => {
    if (!root) return;
    const gar = on === "garage" ? $('#bs-box [data-cmd="bs:where:garage"]') : null, i = gar || $("#bstin"), keep = !!at || !!gar;
    if (i && document.activeElement !== i) { i.focus({preventScroll: keep || PHONE.matches}); if (i.select) i.select(); }
    boxInView($("#bs-box"));
    /* a font the box is the first to use comes in after it is drawn, and its lines wrap again, the box's height with
       them: brought into view again by its height then */
    if (document.fonts && document.fonts.status === "loading") { const g = gen; document.fonts.ready.then(() => { if (g === gen && root && st.bsOpen) boxInView($("#bs-box")); }); }
    if (keep) $(at || "#bs-box .bswhere")?.scrollIntoView({block: "nearest"});
    else bsSayInView();
  };
  if (!now) { timers.push(setTimeout(go, 0)); return; }
  const g = gen;
  /* laid out first, so the fonts it needs are asked for and fonts.ready waits for them */
  if (root) void root.offsetHeight;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (g === gen) go(); });
};
/* on a phone a box opening in the page (BrewStart's, and the pH and readings box) comes into view by the least
   scrolling: all of it, from the title set into its top edge to its foot, between the window's top and the tabs, 8 px
   clear of each. A box taller than that goes to the window's top, so its title and first figure show and its main
   button is a scroll away. A box already in view doesn't move the page */
function boxInView(box) {
  if (!box || box.hidden || !PHONE.matches) return;
  const tabs = $(".tabs"), foot = (tabs ? tabs.getBoundingClientRect().top : window.innerHeight) - 8, R = box.getBoundingClientRect();
  const t = box.querySelector(":scope > .bst, :scope > .pht"), top = Math.min(R.top, t ? t.getBoundingClientRect().top : R.top);
  const d = R.bottom - top > foot - 8 ? top - 8 : R.bottom > foot ? R.bottom - foot : top < 8 ? top - 8 : 0;
  if (d) window.scrollBy(0, d > 0 ? Math.ceil(d) : Math.floor(d));
}
/* focus goes back to where the box was opened from: BrewStart's row, + BrewStart, or the strike water box's USE */
const bsBack = from => timers.push(setTimeout(() => { if (root) root.querySelector(from === "use" ? "#recipe .sw .swuse" : `[data-cmd="bs:${from === "new" ? "new" : "open"}"]`)?.focus({preventScroll: true}); }, 0));
/* CANCEL and Escape close it, changing nothing; not while its command waits, which can't be called back. A failed SET's
   TRY AGAIN goes with it */
function bsClose() {
  if (st.pend.bs || !st.bsOpen) return;
  const from = st.bs && st.bs.from;
  st.bsOpen = false; st.bs = null;
  if (st.alarm && st.alarm.cmd === "bs:again") st.alarm = null;
  renderAll();
  bsBack(from);
}
/* the box's keys: −1 H −15 +15 +1 H and AM and PM (below); the day; the kind (while BrewStart runs, only where it takes
   change_settings); where the
   grain is, INDOORS starting at 68 °F; the chips. A change in the box takes ALL SETTINGS' question down, as it was about
   the box before it. The row opens the box at the question its hint names: "where's the grain?" at the grain's two
   answers, else at the time. again: a failed SET's TRY AGAIN, while the box is open. all: ALL SETTINGS, at once where
   the box has nothing not set yet, else its question; all-set, all-go and all-stay its three answers */
function bsCmd(x, y) {
  if (x === "open" || x === "new") {
    if (st.bsOpen) return bsFocus();
    const bi = bsIdx();
    return bsOpen({neu: x === "new", focus: x === "open" && bi >= 0 && bsRowAsks(M.RECIPE.steps[bi]) === "grain" ? "garage" : undefined});
  }
  if (x === "again") { if (st.bsOpen && st.bs) return bsSet(); st.alarm = null; return renderAll(); }
  const B = st.bs;
  if (!B) return;
  if (x === "x") return bsClose();
  if (st.pend.bs) return;
  if (x === "set") return bsSet();
  if (x === "all") {
    const u = bsUnset(B);
    if (!u.time && !u.grain) return bsAllGo(B);
    B.ask = true; renderAll();
    const q = $("#bs-ask-t");
    if (q) { q.focus({preventScroll: true}); bsAskInView(); say(q.textContent); }
    return;
  }
  if (x === "all-go") return bsAllGo(B);
  if (x === "all-stay") { B.ask = false; renderAll(); return $("#bs-box .bsall")?.focus({preventScroll: true}); }
  if (x === "all-set") {
    B.ask = false; B.then = "all";
    bsSet();
    /* SET refused it in the box (its note says why), or sent nothing and closed: the question's answer ends there */
    if (st.bs === B && !st.pend.bs) { B.then = null; renderAll(); }
    else if (!st.bsOpen && !st.pend.bs) bsAllGo(B);
    return;
  }
  const held = !B.neu && bsRuns() && !bsRetimes();
  B.ask = false;
  if (x === "step" || x === "ap") {
    if (held) return;
    /* the keys from the time, or from 7:00 AM while there is none, round the clock within the day, crossing noon and
       midnight with the half; AM and PM move the same time to that half (with none yet, the half the next typing is in) */
    const m = x === "ap" ? (B.m == null ? null : B.m % 720 + (y === "PM" ? 720 : 0)) : ((((B.m ?? 7 * 60) + parseInt(y, 10)) % 1440) + 1440) % 1440;
    Object.assign(B, {m, ap: m == null ? y : bsHalf(m), ap0: null}, m == null ? {} : {txt: bsShow(m)});
    if (m != null) bsUnbad();
  }
  else if (x === "day") { if (held) return; B.day = dayOf(bsNow()) + parseInt(y, 10); }
  else if (x === "kind") { if (!B.neu && bsRuns() && !bsSets()) return; B.kind = B.kind === "start" ? "ready" : "start"; }
  else if (x === "where") { B.where = y; if (y === "indoors" && B.chip == null && !B.fig) B.chip = bsChips()[1]; }
  else if (x === "chip") { B.chip = parseInt(y, 10); B.fig = ""; }
  renderAll();
  if (["step", "ap", "day", "kind"].includes(x)) { bsAnnounce(); bsSayInView(); }
}
/* SET: what changed, its LOG line saying so; with nothing changed the box closes and nothing is sent. The day is always
   saved as a date (never Today or Tomorrow, which BrewStart counts from START), with the time and the kind; a new grain
   answer has CraftBeerPi work USE out again, as the strike water box's GRAIN does. While BrewStart waits it plans again
   at once (change_time): STARTS for the new time, and its notification in its words; HEAT NOW, a time too soon to wait
   for, has it start heating the HLT at once (bsHeat), and focus goes to LOG, where its notice comes. Asked for by ALL
   SETTINGS' SET AND GO (B.then "all"), Brew Steps opens once it has gone through (bsAllGo). ADD
   BREWSTART puts a new BrewStart in as step 1 (bsAdd, bsAddLive) */
function bsSet() {
  const B = st.bs, r = st.recipe, U = M.U;
  if (!B || st.pend.bs || B.fillBusy) return;
  const m = B.m, ws = bsSays(B);
  if (m == null) return note("r", bsBad());
  if (!ws) return note("r", CLOCK_WAIT);
  if (ws.past) return note("r", ws.text);
  let g = null;
  if (B.where === "indoors") {
    const [lo, hi] = bsIndoor(), v = B.chip != null ? B.chip : parseFloat(B.fig);
    if (!Number.isFinite(v) || v < lo || v > hi) return note("r", `Indoors, the grain would be between ${lo} and ${hi} ${U}: check the figure.`);
    g = Math.round(v * 10) / 10;
  }
  /* the step keeps the time 24-hour (hm); LOG says it by the clock's setting (said) */
  const hm = hhmm(m * 60), said = tod(m * 60), date = dateOf(B.day), kw = B.kind === "start" ? "start at" : "ready by";
  const grainSays = B.where === "garage" ? "grain in the garage, the boil kettle's probe" : B.where === "indoors" ? `grain indoors at ${g.toFixed(1)} ${U}` : "";
  if (B.neu) {
    const label = `BrewStart added as step 1: ${kw} ${said} ${dMid(B.day)}${grainSays ? ` · ${grainSays}` : ""}`;
    return DEMO_MODE ? send("bs", "add", label, () => bsAdd(B, hm, date, g)) : bsAddLive(B, {hm, said, date, g, kw, grainSays, label});
  }
  const s = M.RECIPE.steps[bsIdx()], was = bsTime(s), wasKind = bsKind(s), wasDay = bsDayOf(s), place = bsPlace(), fig = bsGrainFig(s);
  const timeCh = B.kind !== wasKind || hm !== was || B.day !== wasDay;
  const grainCh = B.where != null && (B.where !== place || (B.where === "indoors" && !(fig != null && Math.abs(fig - g) < 0.05)));
  if (!timeCh && !grainCh) return bsClose();
  const wasT = was ? `, was ${B.kind === wasKind ? "" : `${wasKind === "start" ? "start at" : "ready by"} `}${todS(was)}${wasDay != null ? ` ${dShort(wasDay)}` : ""}` : "";
  const wasG = B.where === "garage" ? (fig == null ? "" : `, was ${place === "indoors" ? "indoors at " : ""}${swGrainSays(fig)}`) : fig == null ? ", was the boil kettle's probe" : `, was ${swGrainSays(fig)}`;
  const timeSays = `${s.n}: ${kw} ${said} ${dMid(B.day)}${wasT}`, grainLine = `${s.n}: ${grainSays}${wasG}`;
  const label = timeCh ? `${timeSays}${grainCh ? ` · ${grainSays}` : ""}` : grainLine;
  B.soon = !!ws.soon && timeCh;
  if (!DEMO_MODE) return bsSetLive(B, s, {hm, date, g, timeCh, grainCh, timeSays, grainLine, label, was, wasKind, wasDay});
  const wasAt = bsAt(s);
  send("bs", "set", label, () => {
    if (timeCh) Object.assign(s, {ready: B.kind === "ready" ? hm : null, start: B.kind === "start" ? hm : null, date});
    if (grainCh) Object.assign(s, {where: B.where, grain: B.where === "indoors" ? g : null});
    st.bsOpen = false; st.bs = null;
    if (grainCh && st.swd) swRework("grain");
    /* Start at while BrewStart heats or holds the water: its heating stops, the HLT's AUTO off, and it waits for its
       time, as BrewStart's change_settings does */
    if (timeCh && r.bsHeat && M.RECIPE.steps[r.cur] === s && B.kind === "start" && wasKind !== "start") {
      if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
      r.bsHeat = null; r.wait = `STARTS ${tod(bsHeatAt(s, st.v.hlt.pv))}`;
      soon(() => logEvent(`BrewStart: BrewStart's heating stopped: the HLT's AUTO is off. Brew start scheduled for ${bsFmt(bsAt(s))}`, "from CraftBeerPi", ""));
    } else if (timeCh && M.RECIPE.steps[r.cur] === s && bsWaits()) {
      const pv = st.v.hlt.pv;
      if (ws.soon) {
        /* HEAT NOW: BrewStart's notice, then it heats the HLT itself at once (bsHeat), the current step still */
        soon(() => {
          const due = bsDueLine(s, pv);
          logEvent(due, "from CraftBeerPi", "");
          bsHeat(s);
          say(due);
          if (B.then !== "all") setTimeout(() => $("#event .logbtn")?.focus({preventScroll: true}), 0);
        });
        if (B.then === "all") bsAllGo(B);
        return;
      }
      r.wait = `STARTS ${tod(bsHeatAt(s, pv))}`;
      soon(() => logEvent(bsChangedLine(s, pv, wasAt), "from CraftBeerPi", ""));
    }
    if (B.then === "all") return bsAllGo(B);
    bsBack(B.from);
  });
}
/* the grain's answer as CraftBeerPi's strike water call takes it (POST /step2/strike/grain): the garage blanks the grain's
   temperature, so the boil kettle's probe stands for it, and says so (place); a figure is indoors. Refused (c.refused),
   as the strike water box's GRAIN is; failed (c.fail), its temperature is as it was */
function bsGrainCall(B, g, label) {
  const U = M.U, [lo, hi] = swRoom(), was = bsGrainFig(M.RECIPE.steps[bsIdx()]);
  const head = B.where === "garage" ? "The grain's temperature wasn't changed to the boil kettle's probe" : `The grain's temperature wasn't set to ${g.toFixed(1)} ${U}`;
  return {
    label,
    req: () => api.strikeGrain(B.where === "garage" ? null : g, swIds(), B.where === "garage" ? "garage" : undefined),
    done: res => { if (res.data && typeof res.data === "object" && res.data.strike) swTake(res.data.strike); },
    refused: res => {
      const d = res.data && typeof res.data === "object" ? res.data : null;
      if (!d || (res.status !== 409 && res.status !== 400)) return "";
      const words = res.status === 400 ? (d.error === "out_of_range" ? `${head}: it has to be between ${num(d.low) ?? lo} and ${num(d.high) ?? hi} ${U}.` : "")
        : d.error === "recipe_changed" || d.error === "off" ? `${head}: ${swWhyNot(d)}.` : "";
      if (words && d.strike && typeof d.strike === "object") swTake(d.strike);
      else if (words && d.error === "recipe_changed") swFetch();
      return words;
    },
    fail: `The grain's temperature did not change. It is still ${was != null ? swGrainSays(was) : `the boil kettle's probe's, ${f1(st.v.bk.pv)} ${U}`}.`
  };
}
/* SET, for real: a changed time or day by PUT /step2/{id}, with BrewStart's settings as read, all of them, and Timing,
   Mode Date, StartDate and StartTime as the box has them, confirmed once the steps show them, as RESET is; a changed
   grain by the strike water's call. A grain answer alone on a step that counts its day (Today or Tomorrow) saves the
   day as a date too, so what the box showed is what happens. Once BrewStart has begun (running: waiting, heating or
   holding the water; or stopped) the time, the day and Ready by or Start at go by BrewStart's own change_settings
   (bsRetime), which takes them then, a stopped BrewStart's heating marks included. CraftBeerPi refuses a change to a
   step while it runs (409, its sentence), so an older BrewStart running takes only a new time, by its change_time: the
   moment it planned stands for its day. Where BrewStart can't take one, only the grain goes */
function bsSetLive(B, s, o) {
  const calls = [], runs = bsRuns(), sets = (runs || bsStopped()) && bsSets();
  if (runs ? o.timeCh && (sets || bsRetimes()) : o.timeCh || (o.grainCh && s.mode !== "Date")) calls.push(sets || runs ? bsRetime(s, o, B, sets) : bsPut(B, s, o));
  if (o.grainCh) calls.push(bsGrainCall(B, o.g, o.grainLine));
  if (!calls.length) return bsClose();
  bsSendLive("set", o.label, calls, B);
}
/* what is still in force when a new time didn't go through */
const bsStill = (s, o) => `${s.n} did not change. It is still ${o.was ? `${o.wasKind === "start" ? "start at" : "ready by"} ${todS(o.was)}${o.wasDay != null ? ` ${dShort(o.wasDay)}` : ""}` : "without a time"}.`;
/* the steps showing BrewStart's new day and time, as CraftBeerPi sends them: SET's confirmation */
const bsShows = (s, o, timing) => {
  const x = ((last || {}).steps || []).find(z => z && z.id === s.id), q = (x && x.props) || {};
  return q.StartTime === o.hm && q.StartDate === o.date && q.Mode === "Date" && (timing == null || q.Timing === timing);
};
const bsConfirm = async (res, ok) => {
  if (!res.ok) return res;
  for (let i = 0; i < 30 && !ok(); i++) await new Promise(r => setTimeout(r, 100));
  return ok() ? res : {ok: false, status: res.status, data: null, error: "kept"};
};
function bsPut(B, s, o) {
  const props = {};
  for (const k of Object.keys(s.props || {})) if (!String(k).startsWith("_")) props[k] = s.props[k];
  Object.assign(props, {Timing: B.kind === "start" ? "Start at" : "Ready by", Mode: "Date", StartDate: o.date, StartTime: o.hm});
  return {
    label: o.timeCh ? o.timeSays : "",
    req: async () => bsConfirm(await api.stepUpdate(s.id, {name: s.n, type: s.type, props}), () => bsShows(s, o, props.Timing)),
    refused: res => res.status === 409 && res.data && typeof res.data === "object" && typeof res.data.error === "string" ? res.data.error : "",
    fail: bsStill(s, o)
  };
}
/* a new time once BrewStart has begun: its change_settings (sets: Timing, Mode Date, StartDate and StartTime, Ready by
   or Start at with them) or, an older BrewStart's, its change_time (the day as a date and the time), by POST
   /step2/action/{id}, confirmed once the steps show it; BrewStart plans again from the water as it is and says so in a
   notice of its own, or, for a ready time too soon to wait for (HEAT NOW), starts heating at once (BrewStart 1.3.0 heats
   the HLT itself; an older one, or one before a strike water step on the HLT, hands over), its notice then spoken.
   Not taken (400): BrewStart's reason, as the answer's detail where CraftBeerPi passes it on ("action refused"); else
   as BrewStart tells every screen, in a notice under the step's name, which comes on the websocket just before or after
   the answer and is waited for a second; else that the time wasn't taken. Said under the box, and logged as failed */
function bsRetime(s, o, B, sets = false) {
  const own = d => d && typeof d === "object" && d.error === "action refused" && typeof d.detail === "string" && d.detail.trim() ? d.detail.trim() : "";
  const timing = sets ? (B.kind === "start" ? "Start at" : "Ready by") : null;
  return {
    label: o.timeSays,
    logs: true,
    req: async () => {
      const at = Date.now();
      bsSpeak = B.soon ? {title: s.n, until: at + 10000} : null;
      const res = await api.stepAction(s.id, sets ? "change_settings" : "change_time", {...(sets ? {Timing: timing} : {}), Mode: "Date", StartDate: o.date, StartTime: o.hm});
      if (!res.ok && res.status === 400 && !own(res.data)) res.reason = await bsHeard(s.n, at);
      return bsConfirm(res, () => bsShows(s, o, timing));
    },
    refused: res => res.status !== 400 ? "" : own(res.data) || res.reason || `${s.n} didn't take the new time, so nothing changed.`,
    fail: bsStill(s, o)
  };
}
/* CraftBeerPi's notices as they came, newest first, for a refusal whose reason comes in one (bsRetime): its words, under
   its title, since a moment, waiting up to ms for it. bsSpeak: BrewStart's notice to say aloud as it starts heating for
   HEAT NOW (logAlert) */
let bsHeardList = [], bsSpeak = null;
const bsHear = a => { bsHeardList.unshift({title: String(a.title ?? ""), msg: ut(a.message), at: Date.now()}); bsHeardList = bsHeardList.slice(0, 8); };
async function bsHeard(title, since, ms = 1000) {
  for (const end = Date.now() + ms; ;) {
    const h = bsHeardList.find(x => x.title === title && x.at >= since);
    if (h) return h.msg;
    if (Date.now() >= end) return "";
    await new Promise(r => setTimeout(r, 100));
  }
}
/* ADD BREWSTART, for real: POST /step2/ with index 0 (core post58), BrewStart filled in as the recipe pages fill one
   (bsFillOf) with the box's time and day, confirmed once it is step 1; then the grain's answer, where given, by the
   strike water's call, as SET gives it. Refused while a step has begun (409 begun, its detail) */
function bsAddLive(B, o) {
  const F = B.fill || bsFillOf(null);
  const props = {...F.props, Timing: B.kind === "start" ? "Start at" : "Ready by", Mode: "Date", StartDate: o.date, StartTime: o.hm, Grain_Temp: B.where === "indoors" ? o.g : ""};
  let id = null;
  const first = () => { const x = ((last || {}).steps || []).filter(Boolean); return id != null && x.length > 0 && x[0].id === id; };
  const calls = [{
    label: `BrewStart added as step 1: ${o.kw} ${o.said} ${dMid(B.day)}`,
    req: async () => {
      const res = await api.stepAdd({name: "BrewStart", type: "BrewStart", props, index: 0});
      if (!res.ok) return res;
      id = res.data && typeof res.data === "object" ? res.data.id : null;
      for (let i = 0; i < 30 && !first(); i++) await new Promise(r => setTimeout(r, 100));
      return first() ? res : {ok: false, status: res.status, data: null, error: "kept"};
    },
    refused: res => { const d = res.data && typeof res.data === "object" ? res.data : null; return d && (res.status === 409 || res.status === 400) && (d.detail || d.error) ? String(d.detail || d.error) : ""; },
    fail: "BrewStart was not added. The recipe's steps are as they were."
  }];
  if (B.where) calls.push(bsGrainCall(B, o.g, `BrewStart: ${o.grainSays}`));
  bsSendLive("add", o.label, calls, B);
}
/* BrewStart's SET and ADD BREWSTART go to CraftBeerPi as one or two calls in turn, with SETTING… or ADDING… until the last
   answers, as exec sends one command. All through: one LOG line (label), and the box closes, focus going back where it
   was opened from, or to LOG after HEAT NOW, where BrewStart's notice comes; for SET AND GO, on to Brew Steps
   (bsAllGo). A call CraftBeerPi refuses
   (c.refused gives its words) is said under the box for 6 s, and the box stays open; BrewStart's change_time logs it as
   failed too (c.logs). One with no answer, or another error, is a failed command: LOG says so in light red, and the
   title bar's alarm says what is still in force (c.fail), with TRY AGAIN, which sends the box's SET again. A call before
   it that went through stands, with its own LOG line */
async function bsSendLive(dir, label, calls, B) {
  if (st.pend.bs) return;
  const g = gen;
  st.pend.bs = dir; renderAll();
  let i = 0, res = null;
  for (; i < calls.length; i++) {
    try { res = await calls[i].req(); } catch (e) { res = {ok: false, status: 0, error: "network"}; }
    if (g !== gen) return;
    if (!res.ok) break;
    if (calls[i].done) calls[i].done(res);
  }
  delete st.pend.bs;
  const onward = i === calls.length && B.then === "all";
  if (i === calls.length) {
    if (st.bs === B) {
      st.bsOpen = false; st.bs = null;
      if (!onward && B.soon) timers.push(setTimeout(() => { if (root) $("#event .logbtn")?.focus({preventScroll: true}); }, 0));
      else if (!onward) bsBack(B.from === "new" ? "row" : B.from);
    }
    if (st.alarm && st.alarm.cmd === "bs:again") st.alarm = null;
    logEvent(label, "confirmed", "ok"); say(`${label}: confirmed`);
  } else {
    B.then = null;
    bsSpeak = null;
    calls.slice(0, i).forEach(c => { if (c.label) logEvent(c.label, "confirmed", "ok"); });
    const c = calls[i], words = c.refused ? c.refused(res) : "";
    if (words) { if (c.logs) logEvent(c.label || label, "failed", "bad"); note("r", words); say(words); }
    else {
      const w = failWhy(res), line = c.label || label;
      logEvent(line, "failed: " + w, "bad"); say(`${line}: failed, ${w}.`, true);
      alarm(c.fail, "TRY AGAIN", "bs:again");
    }
  }
  if (last) applyLive(last);
  renderAll();
  if (onward) bsAllGo(B);
}
/* the recipe on Brew Day's own water, worked out from its mash numbers (recipeWater: GRAIN_ABSORPTION), or null; and
   why not (waterLacks) */
function bsOwnWater() {
  const mn = ((last && last.basic) || {}).mash_numbers, a = cfg(last && last.config, "GRAIN_ABSORPTION");
  const w = recipeWater(mn, a, M.C === "F" ? "F" : "C");
  return {w, lacks: w ? "" : waterLacks(mn, a)};
}
/* a new BrewStart's settings, as the recipe pages fill one (RECIPES.md, decision 13): Ready by, with the HLT, its
   element and the Campden choice of the newest BrewStart in the Recipe Book (src), which belong to the rig; the water
   this recipe needs, else the water of the newest brew that was brewed and recorded it (past, pastWater), else none:
   never the water of a recipe that was only loaded or kept in the book. The temperature of its first MashInStep. The
   time and the day are the box's; NotifyBefore blank, AutoNext Yes */
function bsFillOf(src, past = null) {
  const q = (src && src.props) || {}, C = M.C === "F" ? "F" : "C", {w, lacks} = bsOwnWater(), T = bsNewTemp();
  const kettle = q.Heat_Kettle || (M.K && M.K.hlt ? M.K.hlt.id : "");
  const p = w ? null : past, vol = w ? Math.round(w.total * 10) / 10 : p ? Math.round(p.vol * 10) / 10 : null, volU = w ? w.unit : p ? p.unit : C === "F" ? "gal" : "L";
  const props = {Timing: "Ready by", Mode: "Date", StartDate: "", StartTime: "", Heat_Kettle: kettle, Ready_Temp: T != null ? T : q.Ready_Temp ?? "",
    Volume: vol ?? "", Volume_Unit: volU, Grain_Temp: "", Heater_Watts: q.Heater_Watts ?? "", Campden_Reminder: q.Campden_Reminder || "No", NotifyBefore: "", AutoNext: "Yes"};
  const k = ((last && last.kettles) || []).find(x => x && x.id === kettle), watts = num(q.Heater_Watts);
  return {props, kn: k && k.name ? String(k.name) : bsHltName(), watts: watts > 0 ? watts : null, vol, volU, from: w ? "recipe" : p ? "past" : null, past: p, lacks};
}
/* the newest BrewStart in the Recipe Book, for a new one's settings: every recipe read, newest first; and where the
   recipe on Brew Day can't give its water, CraftBeerPi's past brews (GET /figures/), read alongside. Until they are in,
   ADD BREWSTART waits; a read that fails leaves the settings blank where they would come from it */
async function bsFillLoad(B) {
  const g = gen;
  B.fillBusy = true;
  let src = null, past = null;
  const pastRead = bsOwnWater().w ? null : api.figures().then(r => pastWater(r.ok ? r.data : null, M.C === "F" ? "gal" : "L"), () => null);
  try {
    const res = await api.recipes();
    if (g !== gen) return;
    if (res.ok && Array.isArray(res.data)) {
      const list = res.data.filter(x => x && x.file).sort((p, q) => (num(q.modified) ?? 0) - (num(p.modified) ?? 0));
      const found = await Promise.all(list.map(x => api.recipe(x.file)));
      if (g !== gen) return;
      for (const r of found) {
        const s = r.ok && r.data && Array.isArray(r.data.steps) ? r.data.steps.find(z => z && z.type === "BrewStart") : null;
        if (s) { src = {props: s.props || {}}; break; }
      }
    }
  } catch (e) { src = null; }
  if (pastRead) past = await pastRead;
  if (g !== gen || st.bs !== B) return;
  B.fill = bsFillOf(src, past); B.fillBusy = false;
  renderAll();
}
/* BrewStart's row says when it's ready by and its water: "126 °F · ready by 7:00 AM Sat · 15 gal". It is the way to its
   box until BrewStart has finished (bsOpens); before its heating it says its day too, or that no time is set; heating or
   finished, it stays as it was, and holding the water for
   the move it drops the ready time, which has come. The details line never splits a figure from its unit, or a time
   from its AM or PM and its day ("ready by" can end a line, as a narrow column beside STARTS or HEATING needs), and
   each "·" stays with what comes before it, so a line can end with one but never start with one. BrewStart holding
   the strike water has its question as its note line, as the strike water step's note shows it. On one screen the
   title bar is always in view, so a step's note steps aside while the title bar shows that step's own question
   (brewday.css) */
function stepHTML(s, i) {
  const r = st.recipe, state = i < r.cur ? "done" : i === r.cur ? "cur" : "", live = bsLive(i), tm = s.type === "BrewStart" ? bsTime(s) : null;
  const held = state === "cur" && s.type === "BrewStart" && r.bsHeat === "holding";
  const when = live ? (tm ? `${bsKind(s) === "start" ? "start at" : "ready by"} ${esc(todS(tm))}${(d => d != null ? `&nbsp;${dShort(d)}` : "")(bsDayOf(s))}` : '<span class="amb">no time set</span>')
    : held ? "" : s.ready ? `ready&nbsp;by ${esc(todS(s.ready))}` : s.start ? `start&nbsp;at ${esc(todS(s.start))}` : "";
  const p = [s.temp != null ? `${stepTemp(s)}&nbsp;${M.U}` : "", s.min ? `${s.min}&nbsp;min` : "", when, s.vol != null ? `${+s.vol.toFixed(2)}&nbsp;${s.volU || "gal"}` : ""].filter(Boolean).join("&nbsp;· ");
  const right = state === "done" ? "✓ DONE" : state === "cur" ? (r.state === "running" ? (r.wait ? waitHTML(r.wait) : (s.min ? `<span id="r-left">${mmss(r.left)}</span> LEFT` : runWord(s))) : r.state === "ready" ? (r.wait ? waitHTML(r.wait) : "READY") : "STOPPED") : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
  if (bsOpens(i)) return bsRowHTML(s, i, state, p, right, state === "cur" && held ? bsAsk(s) : "");
  const pct = s.min ? pctOf(r.left, s.min) : 0;
  const bar = state === "cur" && s.min ? `<span class="bar"><i id="r-bar" style="width:${pct}%"></i></span>` : "";
  const adds = s.adds ? `<span class="adds">${s.adds.map((a, j) => addHTML(a, j, state, s)).join("")}</span>` : "";
  const nt = s.note || (state === "cur" && s.type === "BrewStart" && r.bsHeat === "holding" ? bsAsk(s) : "");
  return `<li class="step${state === "done" ? " done" : ""}"${state === "cur" ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${esc(s.n)}</span>${p ? `<span class="p">${p}</span>` : ""}${nt ? `<span class="p pn${state === "cur" && st.banner && st.banner.title === s.n ? " asked" : ""}">${esc(nt)}</span>` : ""}<span class="s">${right}</span>${bar}${adds}</li>`;
}
/* a finished boil ticks the additions it asked for; one it never asked for (skipped, or ended early) is dimmed,
   without a tick. The demo's steps don't say, so all of a finished step's are ticked, as in the mockup. */
function addHTML(a, j, state, step) {
  const missed = state === "done" && step && step.addsDone && !step.addsDone[j];
  const s = state === "done" ? (missed ? "missed" : "done") : state === "cur" ? (st.recipe.adds[j] || "") : "";
  const c = s === "due" ? "due" : s === "done" ? "gone" : s === "missed" ? "gone missed" : "";
  return `<span class="${c}">${s === "done" ? "✓ " : ""}${typeof a[0] === "number" ? `${a[0]} min` : esc(a[0])}${s === "missed" ? '<span class="sr"> not added</span>' : ""}</span><span class="${c}">${esc(a[1])}${s === "due" ? " · add now" : ""}</span><span class="${c}">${esc(a[2])}</span>`;
}
function handHTML() {
  const t = st.timer, pt = st.pend.tm, off = st.link === "lost" ? PAUSED : "", ld = st.pend["r:load"] ? WAIT : "";
  /* the recipe book's list, or LOAD's question in its place (loadAskHTML) */
  const list = st.confirmLoad != null ? loadAskHTML()
    : `<section class="book" aria-labelledby="bk-h"><h3 id="bk-h">Recipe book</h3><ul>${M.BOOK.map((x, i) => `<li><span class="bn">${esc(x.n)}</span><span class="bd">${esc(x.d)}</span>${b("cmdbtn", "LOAD", "", {cmd: "load:" + i, why: off || ld})}</li>`).join("")}</ul></section>`;
  return `<h2>No recipe running</h2>
    <p class="rmeta">Brewing by hand. Kettles and pumps work as usual.</p>
    ${M.TIMERS ? timersHTML() : `<section class="timer" aria-labelledby="tm-h"><h3 id="tm-h">Rest timer</h3>
      <output id="tm-out">${mmss(t.left)}</output>
      <div>${b("cmdbtn", "−5 MIN", "", {cmd: "tm:-300", why: off})}${b("cmdbtn", "+5 MIN", "", {cmd: "tm:300", why: off})}${b("cmdbtn go", pt ? (pt === "start" ? "STARTING…" : "PAUSING…") : t.running ? "PAUSE TIMER" : "START TIMER", t.running ? "counting down on every screen" : "alarm at zero, on every screen", {cmd: "tm:go", why: off || (pt ? WAIT : "")})}</div>
    </section>`}
    ${list}
    ${st.cmpOpen ? cmpHTML(true) : `<div class="handlinks">${b("cmdbtn", "RECIPE BOOK", "all recipes", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "BREW STEPS", "build or edit steps", {cmd: "tab:Brew Steps"})}${cmpHTML(true)}</div>`}
    <p class="note">${esc(st.notes.r || "")}</p>`;
}
/* the versions, the recipe column's last line: the quietest words on the screen, in the bottom left corner on a monitor
   and at the end of the page on a phone. The web UI's, with when it was built, then CraftBeerPi's. Each keeps whole;
   where the column is narrow the two go on two lines. Before CraftBeerPi has answered, the web UI's alone */
function verHTML() {
  const v = versions();
  if (!v) return "";
  return `<p class="ver"><span>Web UI ${esc(v.ui)}${v.built ? `, built ${esc(v.built)}` : ""}</span>${v.cbpi ? `<span>CraftBeerPi ${esc(v.cbpi)}</span>` : ""}</p>`;
}
/* this bundle's own: its release number (cbpi4gui/version.py), the commit it was built from, and when, on the building
   machine's clock, stamped in as it is built (config-overrides.js). A build made without git has the number alone */
/* global __CBPI_UI__ */
const UI_BUILD = typeof __CBPI_UI__ !== "undefined" ? __CBPI_UI__ : {version: "", commit: null, built: null};
/* -> {ui, built, cbpi}, or null for no line. Live: CraftBeerPi's as GET /system/ gives it, with the commit of the checkout
   it runs from, which one installed by pip doesn't have. A part without its commit is the release number alone, as an
   installed release has it, and says nothing of when it was built. The demo's are the mockup's, made up and fixed */
function versions() {
  if (DEMO_MODE) return DEMO.versions(opts.ver);
  if (!UI_BUILD.version) return null;
  const s = last || {}, cb = s.version && s.version !== "---" ? `${s.version}${s.commit ? `+${s.commit}` : ""}` : "";
  return {ui: `${UI_BUILD.version}${UI_BUILD.commit ? `+${UI_BUILD.commit}` : ""}`, built: UI_BUILD.commit ? builtSays(UI_BUILD.built) : "", cbpi: cb};
}
/* when the bundle was built, stamped 24-hour ("12 Nov 21:47"), its time shown by the clock's setting ("12 Nov 9:47 PM") */
const builtSays = x => String(x || "").replace(/\b\d{1,2}:\d{2}$/, todS);
function nowHTML() {
  const r = st.recipe;
  if (!r) return `<span class="n">–</span><b>No recipe running</b><span class="p">Brewing by hand · ${M.TIMERS ? "timers" : "rest timer"} below</span>${tmlHTML()}`;
  const S = M.RECIPE.steps, s = S[r.cur], pct = s.min ? pctOf(r.left, s.min) : 0;
  const p = [s.temp != null ? `${stepTemp(s)} ${M.U}` : "", s.min ? `${s.min} min` : "", `step ${r.cur + 1} of ${S.length}`].filter(Boolean).join(" · ");
  const nx = S[r.cur + 1];
  const nxt = nx ? `<span class="nx">Next: ${esc(nx.n)}${nx.temp != null ? ` · ${stepTemp(nx)} ${M.U}` : ""}${nx.min ? ` · ${nx.min} min` : ""}</span>` : `<span class="nx">Last step</span>`;
  return `<span class="n">${r.cur + 1}</span><b>${esc(s.n)}</b><span class="p">${p}</span><span class="left">${r.state === "running" ? (r.wait ? waitLow(r.wait) : s.min ? `<span id="now-left">${mmss(r.left)}</span> left` : runWord(s).toLowerCase()) : r.state === "ready" ? (r.wait ? waitLow(r.wait) : "ready") : "stopped"}</span>${s.min ? `<span class="bar"><i id="now-bar" style="width:${pct}%"></i></span>` : ""}${nxt}${tmlHTML()}`;
}

/* ---------- alarms, last event, rig ---------- */
/* a prompt from CraftBeerPi can have several buttons (x.acts); x.more counts what waits behind it. A timer's alarm has one,
   OK. What it waits for is its timer's command, not the title bar's */
function bannerHTML() {
  const x = st.banner;
  if (!x) return `${ICON.ok}<span class="msg">No alarms</span>`;
  const acts = x.acts || (x.act ? [{label: x.act, cmd: x.cmd, hold: x.hold}] : []), busy = x.timer != null ? st.pend["t:" + x.timer] : st.pend.b;
  /* an answer that switches heat on (START THE BOIL) takes a held press, as START does, and says so under it. A reminder
     BrewScribe takes a pH for has OK and RECORD pH (phActsHTML) */
  const ph = phOffer(x), act = ph ? phActsHTML(x, ph) : acts.map(y => b(y.sec ? "act sec" : "act", busy && (acts.length === 1 || busy === y.dir || busy === y.cmd) ? "SENDING…" : esc(y.label), y.hold && !busy ? "hold to start" : "", {cmd: y.cmd, why: busy ? WAIT : "", hold: y.hold})).join("");
  /* the title in capitals, but a unit's own spelling kept: "CHECK MASH pH" */
  return `${x.tone === "prompt" ? ICON.bell : x.tone === "connecting" ? ICON.wait : ICON.warn}<span class="msg"><b>${esc(x.title).replace(/\bpH\b/g, '<span class="nc">pH</span>')}${x.more ? ` · ${x.more} more waiting` : ""}</b>${esc(x.text).replace("{age}", `<span id="ban-age">${st.age}</span>`)}</span>${act}`;
}
/* an event with no result word (the connection coming and going) has no " · " after it; one with no time yet
   ("Connecting to CraftBeerPi", or a line before CraftBeerPi has said where its clock is) has no time. Each line keeps
   its time as CraftBeerPi does, 24-hour, and shows it by the clock's setting */
function eventHTML() {
  const e = st.events[0], row = e => `${e[0] ? `<time>${logDate(e)}${todS(e[0])}</time>` : ""}${esc(e[1])}${e[2] ? ` · <span class="res ${e[3]}">${esc(e[2])}</span>` : ""}${e[4] ? ` · <span class="res">${esc(e[4])}</span>` : ""}`;
  return `<span class="line">${row(e)}</span><button type="button" class="logbtn" data-cmd="log" aria-expanded="${!!st.logOpen}" aria-controls="log">LOG</button>${st.logOpen ? `<ol class="log" id="log" aria-label="Recent events">${st.events.slice(0, 8).map(e => `<li>${row(e)}</li>`).join("")}</ol>` : ""}`;
}
const needleAngle = pv => -120 + 240 * (Math.min(220, Math.max(50, pv)) - 50) / 170;
/* ---------- which way the hand valves are drawn ----------
   CraftBeerPi can't see the valves, so the drawing goes by the recipe. It finds the runoff the way the core finds
   it for the first-wort reminder (StepController._collects_wort): from the start of the step named for the runoff
   until the boil starts, the wort pump sends wort to the boil kettle and the HLT pump sends sparge water through the
   HERMS coil, which flushes the wort out of it, and on into the top of the mash tun along the coil's own line, as in a
   fly sparge. At any other time, and with no recipe, it shows recirculating. */
const RUNOFF_NAME = /^(?:step \d+ )?(?:(?:start|begin) )?(?:(?:fly|batch|continuous) )?(?:sparge|sparging|lauter|lautering|run ?off)(?: |$)/;
const NOT_RUNOFF = /\b(?:water|heat|heating|prepare|preparation|salts|treatment)\b/;
function collectsWort(s) {
  if (s.type === "HeatStep") return false;
  /* a SpargeStep is the runoff whatever it is called, as in the core (StepController._collects_wort) */
  if (s.type === "SpargeStep") return true;
  const name = s.n.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return RUNOFF_NAME.test(name) && !NOT_RUNOFF.test(name);
}
/* a step's status as CraftBeerPi reports it: D done, A active, S stopped, E failed, I waiting (a boil held for
   "Ready to boil?" is I). Live, CraftBeerPi's own: it keeps a finished recipe's steps, all D, until a recipe is loaded or
   reset. In the demo, worked out from the scene, as in the mockup; with no recipe running, a moment's finished flag
   says the last one's steps are all done (#finished, #notarget), else there are none */
function stepStatus(i) {
  const r = st.recipe, s = M.RECIPE.steps[i];
  if (s && s.status) return s.status;
  if (!r) return st.finished ? "D" : "I";
  return i < r.cur ? "D" : i > r.cur ? "I" : r.state === "running" ? "A" : r.state === "stopped" ? "S" : "I";
}
/* the runoff step's index while the wort should be on its way to the boil kettle, else -1 */
function runoffStep() {
  const S = M.RECIPE.steps;
  if (!st.recipe) return -1;
  const ro = S.findIndex(s => collectsWort(s)), bo = S.findIndex((s, i) => i > ro && s.boil);
  return ro >= 0 && stepStatus(ro) !== "I" && (bo < 0 || stepStatus(bo) === "I") ? ro : -1;
}
/* the boil has started (its step running, stopped, failed or done; held for "Ready to boil?" it is still I). From then
   on the wort pump's hoses are on the boil kettle: the brewer moves them in that hold, as CraftBeerPi's notification says
   ("The wort pump is off, so you can move its hoses"). After the recipe finishes its steps are all D, so the hoses stay
   there for the chill and the transfer, until a recipe is loaded or reset and its boil is I again */
function boilStarted() {
  const bo = M.RECIPE.steps.findIndex(s => s.boil);
  return bo >= 0 && stepStatus(bo) !== "I";
}
function rigDesc(ro, held, setNow, post) {
  const spLine = !!$("#ln-sparge"), head = "Hot liquor tank, mash tun and boil kettle. ";
  // with no recipe running, the boil can only have started if the recipe has finished (boilStarted)
  if (post) return head + (st.recipe ? "The boil has started, so the wort pump's hoses are on the boil kettle. " : "The recipe has finished, and the wort pump's hoses are still on the boil kettle, where they went for the boil. ")
    + "The wort pump is drawn under the boil kettle: it takes wort from the bottom of the kettle and sends it through the chiller and back in at the top. The mash tun and the HERMS coil are out of use. The HLT pump circulates hot water around the hot liquor tank. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating.";
  if (ro < 0 || held) return head + "The HLT pump circulates hot water around the hot liquor tank. The wort pump moves wort from the mash tun, through the coil inside the hot liquor tank, and back into the mash tun. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating, with the line to the boil kettle"
    + (spLine ? " and the sparge line into the coil" : "") + " closed."
    + (setNow ? ` Step ${ro + 1}, ${M.RECIPE.steps[ro].n}, is waiting for you to set them for the sparge: close the wort pump's line to the coil${spLine ? " and the HLT return" : ""}, and open the line to the boil kettle${spLine ? " and the sparge line into the coil" : ""}.` : "");
  return head + (spLine ? "The HLT pump sends hot water through the coil inside the hot liquor tank, flushing the wort out of it, and on into the top of the mash tun for the sparge. " : "The HLT pump circulates hot water around the hot liquor tank. ")
    + `The wort pump moves wort from the mash tun down and across to the boil kettle. The valves are set by hand and CraftBeerPi can't see them: they are shown as step ${ro + 1}, ${M.RECIPE.steps[ro].n}, needs them.`;
}
/* change: the valve is drawn where it is now and marked, in Prompt Amber, with where it has to go (a SpargeStep's prompt).
   The HLT return's run is too short for SET CLOSED, so that tag moves left of the riser, level with its valve (rig.js's
   data-alt), and back under it afterwards */
function setValve(id, open, flowing, change) {
  const g = $("#vl-" + id), t = $("#vt-" + id);
  if (!g) return;
  g.classList.toggle("shut", !open);
  g.classList.toggle("live", open && flowing);
  g.classList.toggle("set", !!change);
  t.classList.toggle("set", !!change);
  setText(t, change ? (open ? "SET CLOSED" : "SET OPEN") : open ? "OPEN" : "CLOSED");
  if (t.dataset.alt) {
    if (!t.dataset.home) t.dataset.home = [t.getAttribute("x"), t.getAttribute("y"), t.getAttribute("text-anchor")].join(" ");
    const [x, y, an] = (change ? t.dataset.alt : t.dataset.home).split(" ");
    t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("text-anchor", an);
  }
}
function renderRig() {
  if (!st || !$("#rigsvg")) return;
  const a = st.a, on = (sel, x) => { const n = $(sel); if (n) n.classList.toggle("on", !!x); };
  const live = st.link !== "lost";
  [["hlt", "hltPump"], ["wort", "wortPump"], ["wort-bk", "wortPump"]].forEach(([id, k]) => {
    const p = a[k], word = $(`#pump-${id} .p-st`);
    if (!word) return;
    on("#pump-" + id, live && p.on);
    setText(word, (live ? "" : "LAST: ") + (p.on ? "RUNNING" : "OFF"));
    setText($(`#pump-${id} .p-ovr`), M.ACT[k].override && !p.on ? "UNLESS OVERRIDE SWITCH IS ON" : "");
  });
  /* layout A's drawing has no sparge line: its HLT pump always goes back round the hot liquor tank. A SpargeStep keeps
     the valves on recirculating until "Sparge started" (r.started, its _sparge_started; not the countdown, which a
     Timer of 0 never has): the HLT is still heating the water, and the wort pump is off. While its "Sparge started"
     question waits, the valves to change are marked */
  const ro = runoffStep(), r = st.recipe, held = ro >= 0 && M.RECIPE.steps[ro].type === "SpargeStep" && r.cur === ro && !r.started;
  const setNow = held && r.wait === WAITING_FOR_YOU && live, hasSp = !!$("#ln-sparge");
  const out = ro >= 0 && !held, sp = out && hasSp;
  /* after the boil starts, the wort pump serves the boil kettle (drawn there, on a short loop through the chiller), so
     nothing on the mash tun's side lights. The valves are drawn as before: for recirculating, so
     a running HLT pump (the HLT's stirrer too) still goes round the hot liquor tank. While the mash tun's AUTO is on, its
     HERMS runs the wort pump through the coil, so the hoses are back on the mash tun (#notarget), as they are once a
     recipe is loaded or reset */
  const post = LAYOUT === "b" && boilStarted() && st.v.mt.mode !== "auto";
  const wp = live && a.wortPump.on, hp = live && a.hltPump.on, mtw = wp && !post;
  /* the coil, its inlet stub and its line on to the mash tun carry the wort while the wort pump recirculates, or the
     sparge water, in the liquor's colour, while the HLT pump sparges through it */
  const coilW = mtw && !out, coilL = hp && sp;
  on("#ln-wort-in", mtw); on("#ln-wort-out", mtw); on("#ln-wort-coil", coilW); on("#ln-xfer", mtw && out);
  for (const s of ["#ln-coil-in", "#ln-coil-out", "#coil"]) {
    const n = $(s);
    if (!n) continue;
    n.classList.toggle("on", coilW || coilL);
    n.classList.toggle("liq", coilL);
    if (s !== "#coil") n.classList.toggle("wrt", !coilL);
  }
  on("#ln-bk-loop", wp && post);
  ["#pump-wort-bk", "#ln-bk-loop", "#chiller"].forEach(s => { const n = $(s); if (n) n.classList.toggle("gone", !post); });
  $("#pump-wort").classList.toggle("gone", post && !!$("#pump-wort-bk"));
  on("#ln-hlt-in", hp); on("#ln-hlt-up", hp); on("#ln-hlt-ret", hp && !sp); on("#ln-sparge", hp && sp);
  setValve("coil", !out, mtw, setNow); setValve("bk", out, mtw, setNow); setValve("ret", !sp, hp, setNow && hasSp); setValve("sp", sp, hp, setNow);
  const vn = $("#vnote-2");
  setText(vn, setNow ? `SET THEM FOR STEP ${ro + 1} (${M.RECIPE.steps[ro].n.toUpperCase()})` : out ? `SHOWN FOR STEP ${ro + 1} (${M.RECIPE.steps[ro].n.toUpperCase()})` : "SHOWN FOR RECIRCULATING");
  vn.classList.toggle("set", setNow);
  setText($("#rig-d"), rigDesc(ro, held, setNow, post));
  on("#el-hlt", live && a.hltEl.on); on("#el-bk", live && a.bkEl.on);
  ["hlt", "mt", "bk"].forEach(v => { const n = $("#needle-" + v); if (n && st.v[v].pv != null) n.setAttribute("transform", `rotate(${needleAngle(st.v[v].pv).toFixed(1)})`); });
}
function drawRig() {
  if (!root) return;
  /* --rig-r: room left at the drawing's right for + TIMER and SOUND where they can't clear it (tsideCorner) */
  const box = $("#rig"), w = box.clientWidth - 12 - (parseFloat(box.style.getPropertyValue("--rig-r")) || 0), h = box.clientHeight - 12;
  if (w < 60 || h < 60) return;
  const W = Math.max(1200, Math.round(RIG_H * w / h));
  /* with graphs in the faceplates the drawing gets shorter, so its labels grow to stay readable (up to 1.3 times) */
  const rs = GRAPHS === "face" ? Math.round(Math.min(1.3, Math.max(1, 0.68 / Math.min(h / RIG_H, w / 1200))) * 100) / 100 : 1;
  if (Math.abs(W - rigW) < 4 && rs === rigRs && $("#rigsvg")) return;
  rigW = W; rigRs = rs;
  // after the boil, the wort pump at the boil kettle on its loop through the chiller (the mockup's ?wp=chill)
  box.innerHTML = rigSVG(LAYOUT === "b" ? "line" : "kettle", W, rs, "chill");
  renderRig();
  tsideCorner();
}
function renderAll() {
  if (!root || !st) return;
  if (!DEMO_MODE) liveBanner();
  else if (st.banner && st.banner.timer != null) st.banner.more = st.tmrs.filter(t => t.state === "done").length - 1;
  phCheck();
  const lost = st.link === "lost", hello = lost && connecting();
  // the new boil kettle's rules (brewday.css [data-bk=power]) apply while its BoilPower is the new one
  if (M.BKNEW) document.documentElement.dataset.bk = "power"; else delete document.documentElement.dataset.bk;
  // and the timers' ([data-timers=new]: on a phone they come before the steps) while CraftBeerPi has them
  if (M.TIMERS) document.documentElement.dataset.timers = "new"; else delete document.documentElement.dataset.timers;
  $("#app").dataset.link = st.link;
  $("#app").toggleAttribute("data-editing", !!st.edit);
  $("#link").dataset.link = hello ? "connecting" : st.link;
  setText($("#link-t"), hello ? "Connecting…" : lost ? "No connection" : "Connected");
  if (!DEMO_MODE) { const c = clockNow(); st.t = c ? c.t : null; }
  clockSet(); spdDraw();
  const ho = $("#alloff");
  setText(ho, st.pend.alloff ? "SWITCHING OFF…" : "ALL OFF");
  if (lost || st.pend.alloff) { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = lost ? PAUSED : WAIT; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  const bn = $("#banner");
  bn.dataset.tone = st.banner ? st.banner.tone : "ok";
  /* a long question with a button (CraftBeerPi's sparge and boil prompts): on a phone its words keep the width and its
     buttons go under them, rather than a column of three or four words a line beside them (brewday.css). So do a
     reminder's OK and RECORD pH (data-ph); the pH box is drawn with them, under the reminder (phDraw) */
  const phx = phOffer();
  bn.toggleAttribute("data-long", !!(st.banner && (st.banner.act || st.banner.acts) && (String(st.banner.text || "").length > LONG_Q || phx)));
  bn.toggleAttribute("data-ph", !!phx);
  morph(bn, bannerHTML());
  phDraw();
  morph($("#event"), eventHTML());
  if (!PAGE) {
    /* the timers' column beside the drawing, on one screen, or + TIMER and SOUND over its corner (tsideDraw) */
    tsideDraw();
    TIGHT = platesTight();
    STACKED = mainStacked();
    $("#plates").toggleAttribute("data-tight", TIGHT);
    // the boil power's steps in a row of their own: on one screen the drawing gives up their height (brewday.css)
    $("#app").toggleAttribute("data-steps", TIGHT && bkNew("bk") && M.VACT.bk.includes("bkEl") && bkNudges());
    morph($("#plates"), ["hlt", "mt", "bk"].map(plateHTML).join(""));
    /* the check belongs to the recipe START was held on (st.pbFor): started, cleared or another loaded in its place on
       another screen, the check ends here (pbEnd), so CHECKING… gives way and the box closes at once, it can't come back
       for the next recipe loaded, and the check's answer, when it comes, decides nothing (pbAsk finds it no longer
       checking). The probes' panel closes once a recipe has begun; brewing by hand there is no recipe, and the panel
       stays */
    const pbGone = st.pend["r:check"] || st.pbOpen ? recipeLost(st.pbFor) : null;
    if (pbGone) pbEnd(pbGone);
    if (st.recipe && !pbFresh()) { st.cmpOpen = false; st.rbOpen = false; }
    /* OTHER RECIPE's book belongs to a recipe not begun: it goes with the recipe too (UNLOAD, here or elsewhere) */
    if (!st.recipe) st.rbOpen = false;
    /* UNLOAD's question stays while its words stay true: it goes with the recipe, or as a step starts here or elsewhere */
    if (st.confirmUnload && !(st.recipe && st.recipe.state !== "running" && unloadAsks(st.recipe))) st.confirmUnload = false;
    /* LOAD's, while the recipe it would replace is still the one loaded and still isn't in the book */
    if (st.confirmLoad != null && !loadAsks()) st.confirmLoad = null;
    /* the strike water's state: the demo's, made from its numbers as CraftBeerPi would send it (strike-demo.js) */
    if (DEMO_MODE) st.sw = SWD.strikeState(st, M);
    /* the strike water box opened out closes when another box takes its place, or the malt has gone in. A timer's editor
       open as a box opens in the column (this one, the check's, the probes') stays open, with what was typed in it: on
       one screen it makes way with the timers until the box closes (brewday.css) */
    const swGone = !swPhase() || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload;
    if (st.swOpen && swGone) st.swOpen = false;
    if (st.swVol && swGone) st.swVol = null;
    if (st.swGrain && swGone) st.swGrain = null;
    if (st.swRec && swGone) st.swRec = null;
    /* BrewStart's box: one box at a time, so another opened in the column closes it; it also goes once it no longer
       applies (BrewStart has finished or is no longer the current step, the recipe has gone, or for a new one the recipe
       has begun or has a BrewStart), unless its command is on its way */
    if (st.bsOpen && !st.pend.bs) {
      const bi = bsIdx(), still = st.bs && (st.bs.neu ? pbFresh() && bi < 0 : bi >= 0 && bsOpens(bi));
      if (!still || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.swOpen || st.swVol || st.swGrain || st.swRec || st.rbOpen || st.confirmLoad != null) { st.bsOpen = false; st.bs = null; }
    }
    // the check's box, the probes' panel or the strike water box as it is on screen, before the column is drawn again (pbFit)
    const before = pbMeasure();
    /* a timer's editor open in the column: on the one-screen layout the step list (by hand, the recipe book) makes room for
       it, and the strike water box while that box is closed (brewday.css). Beside the drawing it has a box of its own, and
       the column stays as it is */
    $("#recipe").toggleAttribute("data-tedit", !!M.TIMERS && !!st.tedit && tHere() === "col");
    /* and while something in it waits for you (NEXT STEP's, RESET's or UNLOAD's question, the pre-brew check's box or the
       probes side by side, the strike water box opened out or giving a number, a timer's alarm), or BrewStart's box is
       open, the versions' line steps aside on a monitor, so the step list keeps the current step whole (brewday.css) */
    $("#recipe").toggleAttribute("data-asking", !!(st.confirmNext || st.confirmReset || st.confirmUnload || st.pbOpen || st.cmpOpen || st.swOpen || st.swVol || st.swGrain || st.swRec || st.rbOpen || st.bsOpen || (M.TIMERS && st.tmrs.some(t => t.state === "done"))));
    /* the pre-brew check's box, the probes side by side and the strike water box opened out, or with the HLT's water or
       the grain's temperature being given, take the step list's room on one screen, as a timer's editor does, and the
       timers' too, so the box isn't squeezed and the page doesn't grow; so do BrewStart's box and OTHER RECIPE's book. A timer's editor open as
       the box opens stays open, with what was typed in it: it makes way with the timers until the box closes
       (brewday.css) */
    $("#recipe").toggleAttribute("data-pb", !!(st.pbOpen || st.cmpOpen || st.swOpen || st.swVol || st.swGrain || st.swRec || st.rbOpen || st.bsOpen));
    /* BrewStart's box: COMPARE PROBES makes way for it on one screen too, as the step list does (brewday.css) */
    $("#recipe").toggleAttribute("data-bs", !!st.bsOpen);
    /* typing in BrewStart's box keeps its caret, whatever draws the column again meanwhile */
    const fa = document.activeElement, fid = fa && (fa.id === "bstin" || fa.id === "bsgin") && root.contains(fa) ? fa.id : null, fsel = fid ? [fa.selectionStart, fa.selectionEnd] : null;
    /* the demo draws the step list from its top each time, as the mockup, which writes the column anew, does; the list
       then scrolls only as far as the current step needs (keepStepInView), the scroll not taken as one by hand. Live, a
       scroll is kept */
    if (DEMO_MODE) { const l = $("#recipe .steps"); if (l) l.scrollTop = 0; stepSeen = null; }
    morph($("#recipe"), recipeHTML() + verHTML());
    if (fid) { const fi = $("#" + fid); if (fi && document.activeElement !== fi) { fi.focus({preventScroll: true}); try { fi.setSelectionRange(...fsel); } catch (_) { /* not a text box now */ } } }
    bsFit();
    pbFit(before);
    drawSw();
    morph($("#now"), nowHTML());
  }
  /* a timer that has run out and not been answered: its row, the title bar and a frame round the whole screen pulse
     together, on every screen. Any other alert beeps twice as it arrives, with SOUND on */
  $("#app").toggleAttribute("data-ring", !!M.TIMERS && st.tmrs.some(t => t.state === "done"));
  bn.toggleAttribute("data-ring", !!(M.TIMERS && st.banner && st.banner.timer != null));
  const key = bannerKey(st.banner);
  if (key !== lastBannerKey) {
    /* two beeps when something that has just arrived takes the title bar. Not when one moves up because the one in
       front went: it was waiting already, and the sound would follow
       a press. Not for one arriving behind another: it's in the count, amber in LOG. The demo beeps at each new alert,
       as its mockup does */
    if (key && st.banner.timer == null && st.banner.tone !== "connecting" && (DEMO_MODE || st.banner.fresh)) ring(2);
    lastBannerKey = key;
  }
  // what had just arrived has had its chance at the title bar
  newIds.clear();
  if (st.alarm) st.alarm.fresh = false;
  // the Settings and Hardware pages' frame has no brewhouse to draw
  if (PAGE) return;
  keepStepInView();
  tPlaceFit();
  renderRig();
  /* with no timers: + TIMER and SOUND placed clear of the drawing as it now reads */
  tsideCorner();
  if (GRAPHS) drawGraphs();
}
const bannerKey = x => x ? [x.tone, x.title, x.text, x.cmd || "", (x.acts || []).map(a => a.cmd).join(",")].join("|") : "";

/* ---------- the temperature graphs (graphs.js) ---------- */
// What the graphs draw. Their clock: the demo's, or CraftBeerPi's brewing clock, which a simulation runs faster. Its
// times are seconds since a midnight, and a span can reach back past it, so the labels wrap round the day.
const graphNow = () => H ? H.now() : (e => e == null ? 0 : daySeconds(new Date(e * 1000)))(brewNow());
// a graph's clock labels: live, the local time at that moment, so a day with a daylight-saving change (23 or 25 hours)
// is labelled right; the mockup's demo counts from its midnight
const ghhmm = t => H && !DEMO_MODE ? hhmm(daySeconds(new Date((H.day() + t) * 1000)))
  : hhmm(((Math.floor(t) % 86400) + 86400) % 86400);
// the labels by the clock's setting, in parts: the digits, and AM or PM, which the axis gives only where it changes
const gparts = t => timeParts(ghhmm(t), {format: fmtNow()});
// BK: the new boil kettle's boil point, where its targets stop being BOIL, and its hold, for its graph and its line
const G = () => ({hist: st.hist, t: DEMO_MODE ? st.t : graphNow(), span: gSpan, lost: st.link === "lost", V: st.v, VNAME: M.VNAME, U: M.U, hhmm: ghhmm, tparts: gparts, scale: H && !DEMO_MODE ? H.scale() : 1,
  BK: M.BKNEW ? {from: boilFrom(), edge: bkLetGo(), hold: bkHoldT()} : null});
// the logs the live history reads: each vessel's temperature, its kettle's target and AUTO, its element's level
function graphNames() {
  const n = {};
  for (const v of ROLES) {
    const k = M.K[v], el = v === "hlt" ? M.ACT.hltEl.id : v === "bk" ? M.ACT.bkEl.id : null;
    n[v] = k && k.sensor ? {pv: k.sensor, sv: `${k.id}.target`, auto: `${k.id}.auto`, out: el ? `${el}.out` : null,
      herms: v === "hlt" && M.HERMS && M.K.mt ? `${M.K.mt.id}.auto` : null} : {};
  }
  return n;
}
async function loadHistory() {
  const g = gen, h = H;
  if (!h || !h.due()) return;
  const ok = await h.load(graphNames());
  if (g === gen && root && ok) schedule();
}
function drawGraphs() {
  if (!root || !st || !st.hist) return;
  const g = G();
  const boxes = Array.from(root.querySelectorAll(".graph")).map(el => {
    const box = el.querySelector(".gsvg");
    return {v: el.dataset.v, box, w: Math.floor(box.clientWidth), h: Math.floor(box.clientHeight)};
  }).filter(b => b.w >= 60 && b.h >= 40);
  /* the three show one span, so they share time marks: chosen for the narrowest */
  const tw = Math.min(...boxes.map(b => b.w));
  boxes.forEach(b => { b.box.innerHTML = graphSVG(g, b.v, b.w, b.h, b.box.id, tw); });
}
/* tapping a graph moves all three to the next span; tapping a span's name goes straight to it */
function graphCmd(x) {
  const i = GSPANS.findIndex(s => s[0] === gSpan);
  gSpan = x === "next" ? GSPANS[(i + 1) % GSPANS.length][0] : GSPANS.some(s => s[0] === x) ? x : gSpan;
  if (!DEMO_MODE) { try { localStorage.setItem(GSPAN_KEY, gSpan); } catch (e) { /* private mode: kept for this page */ } }
  renderAll();
  say(`Graphs: ${GSAY[gSpan]}`);
}
// Live readings arrive many times a second (each step tick under SIM_TIME_SCALE): drawn once a frame.
function schedule() {
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderAll(); });
}

/* ---------- messages ---------- */
function toast(text) { const t = $("#toast"); t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3800); }
// shared: a line for every tab (the Settings and Hardware pages'), marked so another tab open on this device adds it
// (onStorage).
// q: the CraftBeerPi notification a "waiting for you" line is about, so the line can say what became of it (questionGone).
// A line's time is CraftBeerPi's (The One Clock Rule), with its date kept beside it (e[8], for logDate); before
// CraftBeerPi has said where its clock is, it has none until it does (clockKnown). e[5], the real time, keeps the lines
// and groups a burst.
function logEvent(what, res, tone, cav = "", shared = false, q = null) {
  if (DEMO_MODE) { st.events.unshift([hhmmss(st.t % 86400), what, res, tone, cav, null, 0, null, st.sim ? demoDay(st.t).toISOString().slice(0, 10) : null]); return; }
  const e = brewNow(), d = e == null ? null : new Date(e * 1000);
  st.events.unshift([d ? hhmmss(daySeconds(d)) : "", what, res, tone, cav, Date.now(), shared ? 1 : 0, q != null ? String(q) : null, d ? ymdOf(d) : null]);
  if (st.events.length > 50) st.events.length = 50;
  saveEvents();
}
/* a step's line, live, goes before what CraftBeerPi said in the second before it, as that followed from the step's change
   but reached the screen first: CraftBeerPi tells a plugin a step has ended before it sends the step's own update, and the
   HLT pump's "Batch Sparge has ended, so the HLT pump is off" can come 18 ms ahead of "Batch Sparge finished". The
   event line then ends on the consequence, as it does when they come together (observe). Not before
   what a step itself said as it stopped (ending: its name's lines), its last words; nor past another step's line, an
   answer, or anything older. name is CraftBeerPi's name for the step, the title of its own messages */
const BURST = 1000;
function logStep(what, res, tone, name, ending = false) {
  logEvent(what, res, tone);
  if (DEMO_MODE) return;
  const line = st.events[0], title = `${ut(String(name))}: `;
  let i = 1;
  for (; i < st.events.length; i++) {
    const e = st.events[i];
    if (!(line[5] - (e[5] || 0) <= BURST) || (e[2] !== "from CraftBeerPi" && e[2] !== "waiting for you")) break;
    if (ending && String(e[1]).startsWith(title)) break;
  }
  if (i === 1) return;
  // just newer than the line it stops at, which the shift leaves at i - 1
  st.events.splice(i - 1, 0, st.events.shift());
  saveEvents();
}
/* a question's line says "waiting for you", in Prompt Amber, only while CraftBeerPi waits for its answer. Once the
   question goes, the same line says what became of it, in the plain colour, and keeps the time it was asked: amber in
   the log always means something still needs you. Live, q is
   CraftBeerPi's notification id. The demo's lines have none, so there q is the question's title, as in the mockup: the
   newest line still waiting whose words are the title, or start with "title:" or "title finished". False if this tab
   has no line for it */
function questionGone(q, res = "answered") {
  const k = String(q);
  const e = st.events.find(DEMO_MODE
    ? x => x[2] === "waiting for you" && (x[1] === k || x[1].startsWith(k + ":") || x[1].startsWith(k + " finished"))
    : x => x[2] === "waiting for you" && x[7] === k);
  if (!e) return false;
  e[2] = res; e[3] = "";
  if (!DEMO_MODE) saveEvents();
  return true;
}
function say(text, urgent) { const el = $(urgent ? "#sr-alert" : "#sr"); el.textContent = ""; const g = gen; setTimeout(() => { if (g === gen && root) el.textContent = text; }, 40); }
function note(where, text) {
  st.notes[where] = text; renderAll();
  clearTimeout(noteTimers[where]);
  noteTimers[where] = setTimeout(() => { if (st.notes[where] === text) { st.notes[where] = ""; renderAll(); } }, 6000);
}
function noteAt(el, text) {
  const pl = el.closest(".plate");
  if (pl) note(pl.id.slice(3), text); else if (el.closest(".tmrs, .tside")) note("t", text); else if (el.closest(".recipe")) note("r", text); else if (el.closest("#ph-box")) note("ph", text); else toast(text);
}
function explain(el) {
  const why = el.dataset.why;
  if (!why) return;
  noteAt(el, why);
}

/* ---------- demo commands (the mockup's: each one answers after a short delay) ---------- */
/* cav: what "confirmed" can't promise, such as a pump that its own override switch can still run */
function send(key, dir, label, apply, cav = "") {
  if (st.pend[key]) return;
  st.pend[key] = dir; renderAll();
  timers.push(setTimeout(() => {
    delete st.pend[key];
    apply(); applyLocks();
    logEvent(label, "confirmed", "ok", cav); say(label + ": confirmed" + (cav ? `. ${cav[0].toUpperCase()}${cav.slice(1)}.` : ""));
    renderAll();
  }, 700 + Math.random() * 400));
}
/* the new MANUAL: by hand the boil element comes on at the boil power, and its line says at what */
const actLabel = (id, on) => `${M.ACT[id].name} ${M.ACT[id].kind === "pump" ? (on ? "started" : "stopped") : (on ? "on" : "off")}${on && id === "bkEl" && bkHand() ? ` at ${handLvl()} %` : ""}`;
function setActor(id, on) { const a = st.a[id]; a.on = on; a.failed = null; a.paused = false; if (id === "bkEl") endPause(); if (M.ACT[id].kind === "heat") a.pct = on ? (id === "bkEl" && M.BKHAND ? st.v.bk.bp : a.lvl ?? 100) : 0; }
function cmdAct(id) {
  const a = st.a[id], want = a.failed ? a.failed === "on" : !a.on;
  send("a:" + id, want ? "on" : "off", actLabel(id, want), () => {
    setActor(id, want);
    if (st.banner && st.banner.cmd === "act:" + id) st.banner = null;
  }, !want && M.ACT[id].override ? "its override switch can still run it" : "");
}
/* switching a kettle's logic off also switches its actors off (PID_HERMS on_stop: heater and pump). AUTO with no target
   (unset, 0 or below) runs but holds nothing: PID_HERMS still runs its pump, but asks the HLT for nothing, and PIDBoil
   leaves the element off. The demo doesn't invent a target for it; CraftBeerPi warns after 5 s (demoTick). */
function setMode(v, m) {
  const V = st.v[v], a = st.a;
  V.mode = m;
  V.noTgt = 0; V.warned = false;
  if (m === "manual" && st.banner && st.banner.notgt === v) st.banner = null;
  if (m === "manual") questionGone(`No target for the ${DEMO.KNAME[v]}`, "no longer needed");
  if (v === "mt") {
    if (m === "auto" && V.sv == null) { st.v.hlt.mode = "manual"; st.v.hlt.sv = null; a.hltEl.on = false; a.hltEl.pct = 0; a.wortPump.on = true; }
    else if (m === "auto") { st.v.hlt.mode = "manual"; st.v.hlt.sv = +(V.sv + M.HERMS_DELTA).toFixed(1); a.hltEl.on = true; a.hltEl.pct = 62; a.wortPump.on = true; }
    else { a.hltEl.on = false; a.hltEl.pct = 0; a.wortPump.on = false; st.v.hlt.sv = st.v.hlt.own; }
  } else if (v === "hlt") {
    if (m === "auto" && V.sv == null) V.sv = V.own;
    a.hltEl.on = m === "auto" && V.sv != null; a.hltEl.pct = a.hltEl.on ? (V.sv - V.pv > 2 ? 100 : 40) : 0;
  } else {
    if (m === "auto" && V.sv == null) V.sv = M.BKNEW ? boilFrom() : 210.2;
    endPause();
    /* BoilPower latches the boil as it starts if the wort is already at the boil point, and lets go when AUTO stops */
    const ho = bkHoldT();
    V.latched = m === "auto" && ho == null && V.pv >= boilFrom();
    if (m === "auto" && ho != null) { const p = holdOut(ho, V.pv, false); a.bkEl.on = p > 0; a.bkEl.pct = p; }
    else { a.bkEl.on = m === "auto"; a.bkEl.pct = m === "auto" ? (V.latched ? V.bp : 100) : 0; }
    powerModeChanged(m);
  }
  ["hltEl", "wortPump", "bkEl"].forEach(id => { a[id].failed = null; });
}
/* the power editor edits the setting its button named when it opened; if a step or ALL OFF changes the mode, that
   setting is no longer the one in use, so the editor closes without sending anything. The new boil kettle's button always
   sets the boil power, so a mode change leaves its box open. */
function powerModeChanged(m) {
  if (M.BKNEW) return;
  if (st.edit && st.edit.kind === "pwr" && st.edit.what !== (m === "auto" ? "boil" : "hand")) {
    st.edit = null;
    note("bk", `The boil kettle switched to ${m.toUpperCase()}, so the button now sets ${m === "auto" ? "the boil power" : "the element's power by hand"}. Nothing was changed.`);
  }
}
function cmdMode(v, m) { send("m:" + v, m, `${M.VNAME[v]} ${m.toUpperCase()}`, () => setMode(v, m)); }
/* every box opens with its number selected, so typing replaces it: otherwise typing 150 into "168.0" gives "150168.0".
   The new boil kettle's boxes do the same, "BOIL" included */
const focusTin = () => setTimeout(() => { if (!root) return; const i = $("#tin"); if (!i) return; i.focus(); i.select(); }, 0);
function cmdTgtOpen(v) {
  const V = st.v[v], pw = bkNew(v);
  st.edit = {v, kind: "tgt", val: pw ? bkHoldT() ?? boilFrom() : V.sv ?? (DEMO_MODE ? (v === "bk" ? 210.2 : v === "mt" ? 149.0 : V.own ?? 168.0) : M.START[v])};
  renderAll(); focusTin();
}
/* the new boil kettle's BOIL AT, in the power box: the boil point, Boil_Threshold (set_boil_at) */
function cmdBatOpen() { st.edit = {v: "bk", kind: "bat", val: boilFrom()}; renderAll(); focusTin(); }
function cmdTgtStep(d) {
  const e = st.edit;
  /* the new boil kettle's target: BOIL sits just above the highest hold, so − from BOIL gives 206.5 or 205.6 */
  if (bkNew(e.v) && e.kind === "tgt") {
    const edge = bkLetGo();
    if (e.val >= edge) { if (d > 0) return; e.val = edge; }
    e.val = Math.round((e.val + d) * 10) / 10;
    if (e.val >= edge) e.val = boilFrom();
  } else e.val = Math.round((e.val + d) * 10) / 10;
  renderAll();
}
function cmdTgtBoil() { st.edit.val = boilFrom(); renderAll(); }
function cmdTgtSet() {
  const {v, val, kind} = st.edit;
  if (kind === "bat") return cmdBatSet(val);
  if (bkNew(v)) return cmdBkTgtSet(val);
  const [lo, hi] = M.LIMITS;
  if (!(val >= lo && val <= hi)) { note(v, `Enter a target between ${lo} and ${hi} ${M.U}.`); return; }
  st.edit = null; st.notes[v] = "";
  if (!DEMO_MODE) return liveTarget(v, val);
  send("t:" + v, "set", `${M.VNAME[v]} target ${val.toFixed(1)} ${M.U}`, () => {
    const had = !noTarget(v);
    st.v[v].sv = val;
    if (v === "hlt") st.v.hlt.own = val;
    if (v === "mt" && st.v.mt.mode === "auto") st.v.hlt.sv = +(val + M.HERMS_DELTA).toFixed(1);
    /* a target for an AUTO that had none: it starts heating if it is below it, and CraftBeerPi takes its warning down */
    if (!had) {
      const hv = st.v.hlt, he = st.a.hltEl;
      if (v === "mt") { he.on = hv.sv > hv.pv; he.pct = he.on ? (hv.sv - hv.pv > 5 ? 100 : 62) : 0; }
      if (v === "hlt") { he.on = val > hv.pv; he.pct = he.on ? (val - hv.pv > 2 ? 100 : 40) : 0; }
    }
    st.v[v].noTgt = 0; st.v[v].warned = false;
    if (st.banner && st.banner.notgt === v) st.banner = null;
    questionGone(`No target for the ${DEMO.KNAME[v]}`, "no longer needed");
  });
}
/* the new boil kettle's TARGET: SET BOIL sends the boil point as the target, and anything from the boil point less the
   margin up counts as BOIL; a lower temperature is held, as on the HLT. A hold set during the Boil step is honoured and the
   step's timer carries on, so the event says so. Pause wins: a paused element stays off. */
function cmdBkTgtSet(val) {
  const V = st.v.bk, el = st.a.bkEl, B = boilFrom(), boil = val >= bkLetGo(), lo = M.LIMITS[0];
  if (!boil && !(val >= lo)) { note("bk", `Enter a target from ${lo} to ${+(bkLetGo() - 0.1).toFixed(1)} ${M.U}, or press BOIL.`); return; }
  const T = boil ? B : val, r = st.recipe, auto = V.mode === "auto";
  st.edit = null; st.notes.bk = "";
  if (V.sv === T) { renderAll(); return; }
  const inBoil = r && r.state === "running" && M.RECIPE.steps[r.cur].boil;
  const cav = [!boil && auto && inBoil ? "it holds instead of boiling; the Boil step's timer carries on" : "", auto && el.paused ? "the heat stays paused" : ""].filter(Boolean).join("; ");
  const label = `${M.VNAME.bk} target ${boil ? "BOIL" : `${T.toFixed(1)} ${M.U}`}`;
  if (!DEMO_MODE) return liveTarget("bk", T, label, cav);
  send("t:bk", "set", label, () => { const was = bkHolding(); V.sv = T; bkRetarget(was); }, cav);
}
/* BOIL AT: where full power gives way to the boil power (190-212 °F, 88-100 °C, as BoilPower takes it; above the boiling
   point the wort may never get there). A target at BOIL moves with it, so raising the boil point never turns BOIL into a
   hold (BoilPower does the same). */
function cmdBatSet(val) {
  const [lo, hi] = M.U === "°C" ? [88, 100] : [190, 212];
  if (!(val >= lo && val <= hi)) {
    note("bk", val > hi ? `Above ${hi} ${M.U} the wort may never count as boiling, and the element would stay at full power. Enter ${hi} ${M.U} or less.` : `Enter a boil temperature from ${lo} to ${hi} ${M.U}.`);
    return;
  }
  const V = st.v.bk, el = st.a.bkEl, was = boilFrom(), ho = bkHoldT();
  st.edit = null; st.notes.bk = "";
  if (val === was) { renderAll(); return; }
  const label = `${M.VNAME.bk} boils at ${val.toFixed(1)} ${M.U} (was ${was.toFixed(1)} ${M.U})`;
  const cav = ho != null ? `not used while it holds ${+ho.toFixed(1)} ${M.U}` : "";
  if (!DEMO_MODE) return liveBoilAt(val, was, label, cav);
  send("t:bk", "set", label, () => {
    V.boilAt = val;
    if (ho != null) return;
    V.sv = val;
    if (V.mode !== "auto") return;
    V.latched = V.pv >= val || (!!V.latched && (V.keep === false || V.pv >= val - margin()));
    if (!el.paused) { el.on = true; el.pct = V.latched ? V.bp : 100; }
  }, cav);
}
/* set_boil_power: kept in the kettle's Boil_Power setting, so it can be set at any time, also during a recipe; AUTO uses it
   at its next control decision (every 2 s) once the kettle is at or above the boil threshold. With an older BoilPower, in
   MANUAL the button sets the element's own level instead (set_power), which it runs at when it is on by hand; the new boil
   kettle's always sets the boil power. */
function cmdPwrOpen() {
  const boil = !!M.BKNEW || st.v.bk.mode === "auto";
  st.edit = {v: "bk", kind: "pwr", what: boil ? "boil" : "hand", val: boil ? (bkHand() ? handLvl() : st.v.bk.bp) : st.a.bkEl.lvl};
  renderAll(); focusTin();
}
function cmdPwrStep(d) { st.edit.val = Math.min(100, Math.max(0, st.edit.val + d)); renderAll(); }
function cmdPwrSet() {
  const {what, val} = st.edit, boil = what === "boil", V = st.v.bk, el = st.a.bkEl, was = boil ? (bkHand() ? handLvl() : V.bp) : el.lvl;
  if (!(Number.isInteger(val) && val >= 0 && val <= 100)) { note("bk", `Enter a ${boil ? "boil power" : "power"} from 0 to 100 %.`); return; }
  st.edit = null; st.notes.bk = "";
  if (val === was) { renderAll(); return; }
  /* when the new level isn't in use yet, the event says when it will be, so an OUT that doesn't move isn't taken for a
     failure. In the new MANUAL the boil power is what the element heats at by hand, so it is in use at once while it heats */
  const ho = bkHoldT();
  const cav = M.BKNEW ? (V.mode !== "auto" ? (M.BKHAND ? (el.on ? "" : "used when you heat by hand") : "kept for the boil in AUTO")
      : bkHolding() ? `not used while it holds ${+ho.toFixed(1)} ${M.U}`
      : el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilTh()} ${M.U}, full power until then`)
    : boil ? (V.mode === "auto" && V.pv >= boilFrom() ? "" : `used from ${boilTh()} ${M.U}, full power until then`)
    : (el.on ? "" : "used when you switch the element on");
  const label = boil ? `Boil power ${val} % (was ${was} %)` : `Boil element by hand ${val} % (was ${was} %)`;
  if (!DEMO_MODE) return livePower(boil, val, was, label, cav);
  send("p:bk", "set", label, () => {
    if (boil) { V.bp = val; if (V.mode === "auto" && el.on && bkHoldT() == null && (M.BKNEW ? bkLatched() : V.pv >= boilFrom())) el.pct = val; if (bkHand() && el.on) el.pct = val; }
    else { el.lvl = val; if (V.mode !== "auto" && el.on) el.pct = val; }
  }, cav);
}
/* the boil power's one-tap steps, −5 % −1 % +1 % +5 %: sent at once, no SET. The same set_boil_power as the box; a tap that
   would go past 0 or 100 % stops there (2 % − 5 → 0 %), and only at 0 or 100 % itself is the button refused. The wait is
   kept under the step ("-5", "-1", "1", "5"), so only the button pressed shows it. In the new MANUAL they step from the
   level shown, the element's own, which set_boil_power keeps in step with the boil power */
function cmdNudge(d) {
  const V = st.v.bk, el = st.a.bkEl, hand = bkHand(), was = hand ? handLvl() : V.bp, val = Math.min(100, Math.max(0, was + d));
  if (val === was) return;
  const cav = hand ? (el.on ? "" : "used when you heat by hand") : el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilTh()} ${M.U}, full power until then`;
  const label = `Boil power ${val} % (was ${was} %)`;
  if (!DEMO_MODE) return livePower(true, val, was, label, cav, String(d));
  send("p:bk", String(d), label, () => {
    V.bp = val;
    if (V.mode === "auto" && el.on && bkLatched()) el.pct = val;
    if (hand && el.on) el.pct = val;
  }, cav);
}
/* KEEP BOILING: set_keep_boiling, kept in the kettle's Keep_Boiling setting, so it can be set in any mode and stays as set.
   Ticking it while BoilPower holds the boil power more than the margin below the boil point lets go of the boil at once:
   full power until it boils again. A hold doesn't use it. */
function cmdKeep() {
  const V = st.v.bk, el = st.a.bkEl, want = V.keep === false, far = bkLatched() && V.pv < boilFrom() - margin(), ho = bkHoldT();
  const cav = V.mode !== "auto" ? "kept for the boil in AUTO" : bkHolding() ? `not used while it holds ${+ho.toFixed(1)} ${M.U}`
    : el.paused ? "used when the heat carries on"
    : want ? (far ? "full power until it boils" : bkLatched() ? `back to full power if it falls to ${bkLetGo()} ${M.U}` : "")
    : bkLatched() ? "the boil power only, even below a boil" : "full power until it boils, then the boil power only";
  const label = `Keep boiling ${want ? "on" : "off"}`;
  if (!DEMO_MODE) return liveKeep(want, label, cav);
  send("k:bk", want ? "on" : "off", label, () => {
    V.keep = want;
    if (want && far) { V.latched = false; if (el.on) el.pct = 100; }
  }, cav);
}
/* the pause, for a boil-over: the element goes off and AUTO, the recipe and the boil power carry on. BoilPower does it with
   set_paused(Paused="Yes"), and "No" carries on; it refuses unless AUTO runs. Carrying on picks up where AUTO is: the boil
   power while boiling, full power below the boil, a hold's own power. */
function cmdPause(on) {
  const el = st.a.bkEl, V = st.v.bk, label = `${M.ACT.bkEl.name} ${on ? "paused" : "heating again"}`;
  if (!DEMO_MODE) return livePause(on, label);
  send("a:bkEl", on ? "pause" : "resume", label, () => {
    el.failed = null;
    if (on) { el.paused = true; el.pausedAt = st.t; el.on = false; el.pct = 0; return; }
    endPause();
    /* a hold's PID kept what it had built up through the pause (it stops building up while paused) */
    const ho = bkHoldT(), p = ho != null ? holdOut(ho, V.pv, !!M.BKNEW) : bkLatched() ? V.bp : 100;
    el.on = p > 0; el.pct = p;
  });
}
/* the new boil kettle, after its target changes while AUTO runs: BOIL heats at full power until the boil point, then at the
   boil power; a hold's PID sets the power, none once the wort is well above it. was: it was holding before the change, so
   its PID carries on with what it had built up; from BOIL a hold starts a new one. A paused element stays off. (Demo.) */
function bkRetarget(was = false) {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT();
  if (V.mode !== "auto") return;
  V.latched = ho == null && V.pv >= boilFrom();
  if (el.paused) return;
  const p = ho == null ? (V.latched ? V.bp : 100) : holdOut(ho, V.pv, M.BKNEW ? was : el.on);
  el.on = p > 0; el.pct = p;
}
/* a recipe step sets its kettle's target. With the new BoilPower the Boil step sets the boil kettle's target to BOIL (the
   boil point), so a hold left from the day before can't stop a boil. (Demo.) */
function stepTarget(s) {
  const pw = bkNew(s.k), was = pw && bkHolding();
  st.v[s.k].sv = pw && s.boil ? boilFrom() : s.temp;
  if (st.v[s.k].mode !== "auto") setMode(s.k, "auto");
  else if (s.k === "mt") st.v.hlt.sv = +(s.temp + M.HERMS_DELTA).toFixed(1);
  else if (pw) bkRetarget(was);
}
function stepStart(i) {
  const r = st.recipe, s = M.RECIPE.steps[i], was = M.RECIPE.steps[r.cur], moved = was && i !== r.cur;
  /* a SpargeStep ending: the HLT's AUTO off. Only its timer running out also puts the HLT's target to 0
     (SpargeStep.on_timer_done); NEXT STEP leaves it */
  if (moved && was.type === "SpargeStep") {
    if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
    if (was.min && r.left === 0) st.v.hlt.sv = null;
    r.started = false; r.hoses = [];
    if (st.banner && st.banner.sparge) { st.banner = null; questionGone(was.n, "no longer needed"); }
  }
  /* a NotificationStep's question goes unanswered as its step ends some other way (NEXT): CraftBeerPi takes it down */
  if (moved && st.banner && st.banner.cmd === "b:done" && st.banner.title === was.n) { st.banner = null; questionGone(was.n, "no longer needed"); }
  /* BrewStart ending once it has heated the strike water (bsHeat): as the strike water step, by Next once the water is
     moved (or NEXT STEP before), it switches the HLT's AUTO off. LOG says so, then the next step's start, after the
     press's own line */
  const bsHot = moved && was.type === "BrewStart" ? r.bsHeat : null;
  if (bsHot) {
    if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
    r.bsHeat = null;
    soon(() => {
      logEvent("BrewStart finished, HLT AUTO off", "by recipe", "");
      logEvent(`${s.n} started${s.temp != null ? `, ${kettleWord(s.k)} target ${s.temp.toFixed(1)} ${M.U}` : ""}`, "by recipe", "");
    });
  }
  /* on to the boil kettle: the mash tun's AUTO, and a mash step's HERMS with it, has done its work */
  if (s.k === "bk") { st.fill.bk = true; if (st.v.mt.mode === "auto") setMode("mt", "manual"); }
  /* the runoff over (the hltpump extension): as the last step named for the runoff ends, by NEXT here or its
     time up, CraftBeerPi switches the HLT pump off and leaves the wort pump to finish draining the mash tun. Its
     information notification goes in the event line word for word, as CraftBeerPi's notifications do on the screen */
  if (moved && collectsWort(was) && !collectsWort(s) && st.a.hltPump.on) {
    const wort = st.a.wortPump.on;
    setActor("hltPump", false);
    soon(() => logEvent(`HLT pump: ${was.n} has ended, so the HLT pump is off.${wort ? " The wort pump is still running, to finish draining the mash tun." : ""}`, "from CraftBeerPi", ""));
  }
  r.cur = i; r.left = (s.min || 0) * 60; r.adds = []; r.wait = null;
  /* the boil waits for the brewer (CONFIRM_BEFORE_BOIL, as on the rig): nothing is active, so nothing heats, and the
     wort pump, if it runs, goes on draining the mash tun. The step says WAITING FOR YOU, as the live screen shows it. Its
     prompt goes in the event line in CraftBeerPi's words, as there */
  if (s.boil) {
    const q = DEMO.boilHoldBanner(s);
    Object.assign(r, {held: true, state: "ready", wait: WAITING_FOR_YOU});
    st.banner = q;
    soon(() => logEvent(`${q.title}: ${q.text}`, "waiting for you", "wait"));
    return;
  }
  if (st.hist) st.hist.steps.push([st.t, i + 1]);
  if (s.k === "bk") st.fill.mtLiq = false;
  if (s.type === "SpargeStep") { r.started = false; spargeBegin(s); return; }
  if (s.type === "BrewStart") { swWaitBegin(s); return; }
  if (s.temp != null) {
    stepTarget(s);
    /* the strike water step on the HLT says HEATING, then asks for the water to be moved; on to the mash tun from it,
       or from BrewStart once it has held the water for the move, the water is there (the strike water box's moments).
       From BrewStart skipped while it still heats, the tun is empty */
    if (s.k === "hlt" && s.type === "MashInStep") swHeating(s);
    else if (st.swd && moved && s.k === "mt" && ((was.k === "hlt" && was.type === "MashInStep") || bsHot === "holding")) swMovedIn(s);
  }
  /* a NotificationStep asks a moment after it starts, in its own words; NEXT STEP, CraftBeerPi's label, answers it */
  else if (s.note) {
    st.banner = {tone: "prompt", title: s.n, text: s.note, act: "NEXT STEP", cmd: "b:done"};
    soon(() => logEvent(`${s.n}: ${s.note}`, "waiting for you", "wait"));
  }
}
/* the brewer starts the held boil, with START THE BOIL or a held START (BoilStep._runoff_over): the runoff
   is over, so CraftBeerPi switches the wort pump and the HLT pump off, whichever run, once a brew, and says so; then the
   boil kettle's AUTO, heating to the boil before the step's timer starts. (Demo.) */
function boilStart() {
  const r = st.recipe, s = M.RECIPE.steps[r.cur], off = [];
  if (st.banner && st.banner.boilHold) st.banner = null;
  /* answered, with START THE BOIL or a held START here. CraftBeerPi takes its question down as "withdrawn" when the boil
     is started some other way than its button, so the screen counts its own START too */
  questionGone(s.n);
  [["wortPump", "the wort pump"], ["hltPump", "the HLT pump"]].forEach(([id, w]) => { if (st.a[id].on) { setActor(id, false); off.push(w); } });
  st.fill.mtLiq = false;
  if (st.v.mt.mode === "auto") setMode("mt", "manual");
  if (st.hist) st.hist.steps.push([st.t, r.cur + 1]);
  stepTarget(s);
  Object.assign(r, {held: false, state: "running", wait: st.v.bk.pv < boilFrom()});
  /* the step's line first, then what CraftBeerPi says as it starts: the screen logs a step's change before the words it
     sets going (observe) */
  soon(() => {
    logEvent(DEMO.boilStartLine(s, boilFrom()), "by recipe", "");
    if (off.length) {
      const w = off.join(" and ");
      logEvent(`${s.n}: ${w[0].toUpperCase()}${w.slice(1)} ${off.length > 1 ? "are" : "is"} off, so you can move ${off.length > 1 ? "their" : "its"} hoses.`, "from CraftBeerPi", "");
    }
  });
}
/* a SpargeStep switches a pump off for the brewer to move its hoses, once a run of the step (_hose_off): the
   wort pump as the step starts, the HLT pump as the water gets there. A Stop and Start never stops one the brewer has
   since started. CraftBeerPi says so only in the prompt's words. (Demo.) */
function spargeHose(which) {
  const r = st.recipe, id = which === "hlt" ? "hltPump" : "wortPump";
  r.hoses = r.hoses || [];
  if (r.hoses.includes(which)) return;
  r.hoses.push(which);
  if (st.a[id].on) setActor(id, false);
}
/* what CraftBeerPi says as a command takes effect (its notifications, a step's start, a prompt) reaches the screen just
   after the command's own "confirmed", so it comes out on top. (Demo.) */
function soon(f) { timers.push(setTimeout(() => { f(); renderAll(); }, 300)); }
/* a SpargeStep starting, or starting again after a Stop (SpargeStep.on_start): the mash tun's AUTO off, so its HERMS and
   the wort pump stop. Until "Sparge started" has been pressed, the HLT goes on its own AUTO at the step's temperature,
   HEATING until the water is there, when the step asks; after it, a Start carries on and doesn't heat again */
function spargeBegin(s) {
  const r = st.recipe, i = r.cur;
  if (st.v.mt.mode === "auto") setMode("mt", "manual");
  if (r.started) { r.wait = null; return; }
  /* its hoses go over from recirculating to the runoff */
  spargeHose("wort");
  st.v.hlt.sv = st.v.hlt.own = s.temp;
  if (st.v.hlt.mode !== "auto") setMode("hlt", "auto");
  r.wait = "HEATING";
  if (st.v.hlt.pv < s.temp) return;
  /* the water is already there: the step's next look (within a brewing second) finds it, switches the HLT pump off for
     its hose to go over to the mash tun, and asks */
  timers.push(setTimeout(() => {
    if (st.recipe !== r || r.cur !== i || r.state !== "running" || r.started) return;
    spargeHose("hlt");
    r.wait = WAITING_FOR_YOU; st.banner = DEMO.spargeBanner(s.temp, st.a);
    logEvent(`${st.banner.title}: ${st.banner.text}`, "waiting for you", "wait");
    renderAll();
  }, 600));
}
/* ---------- the strike water, in the demo (the mockup's stand-in for CraftBeerPi's helper) ----------
   st.swd holds the moment's numbers as the mockup keeps them (its st.sw); strike-demo.js makes CraftBeerPi's state from
   them (st.sw) each time the screen is drawn. CraftBeerPi works USE out in SW_WORK_S here, as the mockup does */
const SW_WORK_S = 30;
const swDemoSteps = () => Object.assign({S: M.RECIPE.steps}, SWD.swSteps(M.RECIPE.steps));
/* CraftBeerPi working USE out again, as a number it works from has changed (why: "vol", "grain", "room"). For the
   numbers its answer was worked out from it has nothing to do, nor for those its work failed on: a grain temperature
   put right, back to the last answer's numbers, has that answer hold again at once */
function swRework(why) {
  const now = SWD.swNow(st, M), d = st.swd;
  if (d.failed && SWD.swSameIn(now, d.failed.for)) return;
  d.failed = null;
  if (!now || SWD.swSameIn(now, d.has)) { d.work = null; return; }
  d.work = {since: st.t, why};
  say("Working out USE again.");
}
/* its answer comes: the figures for the numbers as they are now, and which unmeasured numbers would raise USE most
   SW_LEVER_S later (lvAt) */
function swWorked() {
  const now = SWD.swNow(st, M);
  st.swd.has = now ? {...now, lvAt: st.t + SWD.SW_LEVER_S} : null; st.swd.work = null; st.swd.at = st.t;
  st.sw = SWD.strikeState(st, M);
  const N = swNumbers();
  if (N.ok) say(`USE worked out: ${N.strike.toFixed(1)} ${M.U}.`);
  renderAll();
}
/* the grain's temperature given, or blanked for the boil kettle's probe (THE PROBE): BrewStart's, or by hand the brew
   day's. On BrewStart it also answers where the grain spent the night: a figure is indoors, the probe the garage */
const swDemoGrain = v => () => { const {S, bi} = swDemoSteps(); if (bi >= 0) Object.assign(S[bi], {grain: v, where: v == null ? "garage" : "indoors"}); else st.swd.grain = v; st.swGrain = null; swRework("grain"); };
/* a figure given in the strike water box (swRec), as CraftBeerPi keeps it: the recipe's in its numbers, the room for the
   brew day */
const swDemoRec = (k, v) => () => { const d = st.swd; if (k === "room") d.room = v; else d.rec = Object.assign({}, d.rec, {[k]: v}); st.swRec = null; swRework(k === "room" ? "room" : "recipe"); };
/* USE or BACK TO, as CraftBeerPi applies it: the strike water step's temperature, BrewStart's while it is next or waits,
   and while the strike water step heats or holds the water (BrewStart heating included) the HLT's target; by hand the
   HLT's target alone */
function swSet(t) {
  const r = st.recipe, {S, bi, si} = swDemoSteps(), H = st.v.hlt, he = st.a.hltEl, run = r.state === "running";
  const heatTo = () => { he.on = t > H.pv; he.pct = he.on ? (t - H.pv > 2 ? 100 : 40) : 0; };
  if (si < 0) { H.sv = H.own = t; if (H.mode === "auto") heatTo(); return; }
  S[si].temp = t;
  if (bi >= 0 && r.cur <= bi) S[bi].temp = t;
  /* the step heating or holding the water: BrewStart once it heats (bsHeat), or the strike water step on the HLT */
  const hs = r.cur === bi && r.bsHeat ? S[bi] : r.cur === si && si !== bi ? S[si] : null;
  if (run && hs) {
    H.sv = H.own = t; heatTo();
    if (st.banner && st.banner.title === hs.n) { st.banner = null; questionGone(hs.n, "no longer needed"); }
    if (hs.type === "BrewStart") bsHeating(hs); else swHeating(hs);
  } else if (run && r.cur === bi && bsWaits()) r.wait = `STARTS ${tod(bsHeatAt(S[bi], H.pv))}`;
}
/* the strike water step heats until the water is half a degree short of its temperature, then asks for it to be moved
   (its Notification), and holds it */
function swHeating(s) {
  const r = st.recipe;
  if (st.v.hlt.pv < s.temp - 0.5) { r.wait = true; return; }
  r.wait = WAITING_FOR_YOU;
  soon(() => { st.banner = {tone: "prompt", title: s.n, text: s.note, act: "NEXT STEP", cmd: "b:done"}; logEvent(`${s.n}: ${s.note}`, "waiting for you", "wait"); });
}
/* BrewStart, started: it heats nothing yet, and waits for the time its plan works out: with Ready by, as early as
   heating the water needs; with Start at, the time itself (bsHeatAt). Without a time it can't plan, and says so in its
   words (err_time_missing), waiting for the brewer */
function swWaitBegin(s) {
  const r = st.recipe, pv = st.v.hlt.pv;
  r.bsHeat = null;
  if (bsAt(s) == null) { r.wait = WAITING_FOR_YOU; soon(() => logEvent("BrewStart: Error: The time is blank - set it", "from CraftBeerPi", "bad")); return; }
  r.wait = `STARTS ${tod(bsHeatAt(s, pv))}`;
  soon(() => logEvent(bsPlanLine(s, pv), "from CraftBeerPi", ""));
}
/* BrewStart (1.3.0) with Ready by, at its heating start: it heats the HLT itself to its own temperature, the strike
   water's, on the HLT's AUTO, with the HLT pump on as the brew morning has it, and stays the current step (bsHeat:
   "heating", then "holding"). Its line in LOG comes just after what set it going */
function bsHeat(s) {
  const H = st.v.hlt, he = st.a.hltEl;
  st.recipe.bsHeat = "heating";
  H.own = s.temp;
  stepTarget(s);
  he.on = s.temp > H.pv; he.pct = he.on ? (s.temp - H.pv > 2 ? 100 : 40) : 0;
  if (!st.a.hltPump.on) setActor("hltPump", true);
  soon(() => logEvent(`BrewStart heating, HLT target ${s.temp.toFixed(1)} °F`, "by recipe", ""));
  bsHeating(s);
}
/* BrewStart heating: HEATING until the water is half a degree short of its temperature, as the strike water step
   counts it. Then, as the strike water step, it holds the water and asks in the title bar for it to be moved, until
   Next (cmdBanner, stepStart) */
function bsHeating(s) {
  const r = st.recipe;
  if (st.v.hlt.pv < s.temp - 0.5) { r.wait = true; r.bsHeat = "heating"; return; }
  r.wait = WAITING_FOR_YOU; r.bsHeat = "holding";
  soon(() => {
    st.banner = {tone: "prompt", title: s.n, text: DEMO.SW_ASK, act: "NEXT STEP", cmd: "b:done"};
    logEvent(`${s.n}: ${DEMO.SW_ASK}`, "waiting for you", "wait");
    say(`${s.n}. ${DEMO.SW_ASK}.`, true);
  });
}
/* when the demo's BrewStart goes on to the heating: with Start at, at its time; with Ready by, as early as heating the
   water at pv needs (swStartAt) */
const bsHeatAt = (s, pv) => bsKind(s) === "start" ? bsAt(s) : DEMO.swStartAt(s.temp, pv, bsAt(s));
/* BrewStart's own words for a time on the demo's clock (format_start), the time by the clock's setting:
   "Sat Nov 21, 7:00 AM" */
function bsFmt(t) { const d = dayDate(dayOf(t)); return `${tcase(DOW[d.getUTCDay()])} ${tcase(MON3[d.getUTCMonth()])} ${d.getUTCDate()}, ${tod(t)}`; }
/* BrewStart's notification as it plans, in its words: Ready by's (notify_ready_scheduled), as swPlanLine says it for
   07:00, for any time; Start at's (notify_scheduled) */
function bsPlanLine(s, pv) {
  if (bsKind(s) === "start") return `BrewStart: Brew start scheduled for ${bsFmt(bsAt(s))}`;
  return `BrewStart: Ready by ${bsFmt(bsAt(s))}: heating starts about ${bsFmt(bsHeatAt(s, pv))}. ${pv.toFixed(1)} °F to ${s.temp.toFixed(1)} °F takes about ${Math.round((s.temp - pv) / DEMO.SW_RATE)} min, plus ${DEMO.SW_SPARE} min spare.`;
}
/* BrewStart's notification for a new time taken while it waits (change_time's notify_time_changed): the time it had,
   then its plan as above */
const bsChangedLine = (s, pv, was) => `BrewStart: Time changed, was ${bsFmt(was)}. ${bsPlanLine(s, pv).slice(11)}`;
/* BrewStart's notification as a new ready time makes it start heating at once (_due_message): on time if heating the
   water from pv, without the spare minutes, still makes it; else when the water will be ready */
function bsDueLine(s, pv) {
  const at = bsAt(s), heat = (s.temp - pv) / DEMO.SW_RATE, eta = st.t + Math.round(heat * 60);
  return eta <= at ? `BrewStart: Time to heat - the water should be ready by ${bsFmt(at)}.`
    : `BrewStart: Heating has to start now: from ${pv.toFixed(1)} °F it needs about ${Math.round(heat)} min, so the water will be ready around ${bsFmt(eta)}, after ${bsFmt(at)}.`;
}
/* the demo's ADD BREWSTART answered: BrewStart in as step 1, on the HLT with its element, heating the recipe's water to
   the strike water step's temperature; every step after it moves down one. Its water, and the grain's answer, are
   numbers USE is worked out from, so CraftBeerPi works it out again */
function bsAdd(B, hm, date, g) {
  M.RECIPE.steps.unshift({n: "BrewStart", type: "BrewStart", k: "hlt", ready: B.kind === "ready" ? hm : null, start: B.kind === "start" ? hm : null,
    date, temp: bsNewTemp(), vol: DEMO.SW_NEED, watts: DEMO.SW_WATTS, where: B.where, grain: B.where === "indoors" ? g : null});
  st.bsOpen = false; st.bs = null;
  if (st.swd) swRework(Math.abs(DEMO.SW_NEED - (st.swd.vol ?? 0)) >= 0.05 ? "vol" : "grain");
  if (B.then === "all") return bsAllGo(B);
  bsBack("row");
}
/* the strike water moved and Next pressed: the water is in the mash tun. It came through the coil, so the Mash Tun's
   probe, at the coil's outlet, reads it: at the rest or above, MashIn on the Mash Tun asks for the malt at once, and its
   pump stops for the dough-in (Stop_Pump_At_Strike), so the probe reads the HLT's water. Below the rest, the coil
   brings it up first */
function swMovedIn(s) {
  const r = st.recipe, {S, si} = swDemoSteps(), T = si >= 0 ? S[si].temp : st.v.hlt.sv;
  st.fill.mtLiq = true;
  if (T == null) return;
  st.v.mt.pv = +T.toFixed(1);
  if (st.v.mt.pv < s.temp - 0.5) { r.wait = true; return; }
  r.wait = WAITING_FOR_YOU; setActor("wortPump", false);
  soon(() => { st.v.mt.pv = +(st.v.hlt.pv - 0.1).toFixed(1); st.banner = {tone: "prompt", title: s.n, text: "Target temperature reached. Please add malt.", act: "NEXT STEP", cmd: "b:done"}; logEvent(`${s.n}: Target temperature reached. Please add malt.`, "waiting for you", "wait"); });
}
function cmdStart(force, cav = "") {
  st.confirmReset = false; st.confirmUnload = false;
  /* a recipe not begun is checked first (pbRun); START ANYWAY, or the check passed, comes back here with force */
  if (!force && pbFresh()) return pbRun();
  send("r:start", "start", "Recipe started", () => {
    /* held before the boil, START starts the boil, as START THE BOIL does */
    if (st.recipe.held) return boilStart();
    const r = st.recipe, s = M.RECIPE.steps[r.cur], fresh = r.state === "ready";
    if (fresh && st.hist) st.hist.steps.push([st.t, r.cur + 1]);
    r.state = "running";
    if (s.type === "SpargeStep") spargeBegin(s);
    /* BrewStart started again after a STOP once it had begun heating carries on heating, as its time has passed */
    else if (s.type === "BrewStart") { if (r.bsHeat) bsHeat(s); else swWaitBegin(s); }
    else if (s.temp != null) { stepTarget(s); if (s.k === "hlt" && s.type === "MashInStep") swHeating(s); }
    /* a recipe started from its first step puts the boil power back to the usual power (Usual_Boil_Power). A change made
       later that day, before or during the boil, is kept for the boil, and doesn't carry over to the next brew day */
    const V = st.v.bk;
    if (M.BKNEW && fresh && V.usual != null && V.bp !== V.usual) {
      const was = V.bp; V.bp = V.usual;
      timers.push(setTimeout(() => { logEvent(`Boil power back to your usual ${V.usual} % (was ${was} %)`, "by recipe", ""); renderAll(); }, 300));
    }
  }, cav);
}
function cmdStop() {
  st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false;
  send("r:stop", "stop", "Recipe stopped", () => {
    const k = M.RECIPE.steps[st.recipe.cur].k;
    st.recipe.state = "stopped";
    if (st.v[k].mode === "auto") setMode(k, "manual");
    /* a SpargeStep's "Sparge started" question is taken down when the step stops, and asked again when it starts */
    if (st.banner && st.banner.sparge) { st.banner = null; st.recipe.wait = null; questionGone(M.RECIPE.steps[st.recipe.cur].n, "no longer needed"); }
  });
}
function cmdNextYes() {
  const r = st.recipe, nx = M.RECIPE.steps[r.cur + 1];
  st.confirmNext = false;
  send("r:next", "next", `Skipped to ${nx.n}`, () => { stepStart(r.cur + 1); if (!r.held) r.state = "running"; });
}
/* RESET TO STEP 1: CraftBeerPi's reset (POST /step2/reset). Every step back to not started, the time a step had run and
   what the steps kept about this brew forgotten, its questions taken down: their lines say "no longer needed". It
   switches nothing. The recipe stays loaded, back at step 1, waiting for START. The graphs lose their step marks, which
   CraftBeerPi forgets too, and DAY goes back to the last 8 hours, as with no recipe begun */
function cmdReset() {
  st.confirmReset = false;
  send("r:reset", "reset", "Recipe reset to step 1", () => {
    const q = new Set(brewQuestions());
    q.forEach(t => questionGone(t, "no longer needed"));
    if (st.banner && brewAsks(q, st.banner)) st.banner = null;
    st.recipe = {state: "ready", cur: 0, left: 0, adds: []};
    st.finished = false;
    if (st.hist) { st.hist.steps = []; st.hist.start = st.t - 8 * 3600; }
  });
}
/* UNLOAD on a recipe not begun, at once; on one begun, the question first (unloadAskHTML). Greyed, the press says why
   before it gets here (explain). Opening the question closes the column's other questions and boxes, as RESET's does */
function cmdUnload() {
  const u = unloadRule();
  if (u.why) return;
  Object.assign(st, {confirmNext: false, confirmReset: false, pbOpen: false, cmpOpen: false, rbOpen: false, swOpen: false, swVol: null, swGrain: null, swRec: null, bsOpen: false, bs: null});
  if (u.ask) { st.confirmUnload = true; return renderAll(); }
  (DEMO_MODE ? cmdUnloadGo : liveUnload)();
}
/* UNLOAD, or the question's UNLOAD: CraftBeerPi empties the brew steps and takes down the brew's questions, whose lines
   say "no longer needed". Kettles, pumps and timers stay as they are. The column goes back to brewing by hand, with
   the recipe book's LOAD to have the recipe back as the Recipe Book keeps it (swAsSaved). The graphs lose their step
   marks, as with a reset */
function cmdUnloadGo() {
  st.confirmUnload = false;
  send("r:unload", "unload", `${M.RECIPE.name} unloaded: Brew Day is brewing by hand`, () => {
    const q = new Set(brewQuestions());
    q.forEach(t => questionGone(t, "no longer needed"));
    if (st.banner && (brewAsks(q, st.banner) || st.banner.cmd === "r:unload-yes")) st.banner = null;
    if (st.swd && !st.swd.hand) swAsSaved();
    st.recipe = null; st.finished = false; st.pbOpen = false; st.cmpOpen = false; st.rbOpen = false;
    if (st.hist) { st.hist.steps = []; st.hist.start = st.t - 8 * 3600; }
  });
}
/* the demo's Recipe Book keeps Test Recipe v5 as it was saved: its strike water at the rest's 126 °F, BrewStart's 15 gal,
   Ready by 07:00 the next day and no grain temperature of its own. What this brew changed since loading (USE's figure,
   the HLT's water, the grain's temperature, BrewStart's time and where the grain spent the night) isn't kept, so LOAD
   brings the recipe back as saved, the grain is asked again, and the strike water helper starts a new day for it */
function swAsSaved() {
  const {S, bi, si} = swDemoSteps();
  if (si >= 0) S[si].temp = DEMO.SW_PLAN0;
  if (bi >= 0) Object.assign(S[bi], {temp: DEMO.SW_PLAN0, vol: DEMO.SW_VOL0, grain: null, where: null, ready: "07:00", start: null, date: dateOf(dayOf(st.t) + 1)});
  Object.assign(st.swd, {plan: DEMO.SW_PLAN0, was: null, vol: DEMO.SW_VOL0, grain: null, work: null, failed: null});
  st.swd.has = SWD.swNow(st, M);
}
function cmdBanner(x) {
  if (x === "added") send("b", "x", "Hop Alert answered: Added", () => { questionGone("Hop Alert"); st.banner = null; if (st.recipe) st.recipe.adds[0] = "done"; });
  else if (x === "boil") send("b", "x", `${M.RECIPE.steps[st.recipe.cur].n} answered: Start the boil`, boilStart);
  else if (x === "done") {
    const s = M.RECIPE.steps[st.recipe.cur];
    send("b", "x", `${s.n} answered: Next Step`, () => { questionGone(s.n); st.banner = null; stepStart(st.recipe.cur + 1); });
  }
  /* the SpargeStep's "Sparge started": its timer starts (or it runs until NEXT STEP), the HLT's AUTO goes off, and the
     drawing goes over to the runoff */
  else if (x === "sparge") {
    const s = M.RECIPE.steps[st.recipe.cur];
    send("b", "x", spargeStartedLine(s), () => {
      const r = st.recipe;
      questionGone(s.n);
      st.banner = null; r.wait = null; r.started = true;
      if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
      /* CraftBeerPi says what it did, in its words, just after the press's own line (SpargeStep._start_sparge): the HLT's
         AUTO off, when the step heated the sparge water, and the timer's end on the brewing clock, when it has one */
      const said = [s.temp > 0 ? "The HLT's AUTO is off now, so its element won't run as the HLT empties." : "",
        s.min ? `Sparge timer started. Estimated completion: ${tod(st.t + s.min * 60)}` : ""].filter(Boolean).join(" ");
      if (said) timers.push(setTimeout(() => { logEvent(`${s.n}: ${said}`, "from CraftBeerPi", ""); renderAll(); }, 300));
    });
  }
  /* OK on CraftBeerPi's own warning or error, one without buttons (cbpi): it goes from every screen's title bar, and its
     lines say "seen", a warning's in the plain colour, an error's still red.
     No line of its own. (Demo; live, liveOk.) */
  else if (st.banner && st.banner.cbpi) { seenLines(`${st.banner.title}: ${st.banner.text}`); st.banner = null; renderAll(); }
  /* OK on a reminder whose OK CraftBeerPi runs, such as the two that ask for the mash pH (phAck) */
  else if (x === "ack") phAck();
  /* OK: the rest timer's alarm, or a warning that waits for one (no target, a forgotten pause) */
  else { if (st.banner) questionGone(st.banner.title); st.banner = null; renderAll(); }
}
const spargeStartedLine = s => `${s.n}: sparge started, ${s.min ? `${s.min} min timer started` : "until NEXT STEP"}`;
/* ---------- the mash pH for BrewScribe (design/brewday/PH-ENTRY.md) ----------
   The two reminders that ask for the mash pH take the reading here, for BrewScribe's brew log, without a trip to its
   page. Brew Day keeps no list of them: BrewScribe names them in its answer to GET /brewscribe/api/brew-day/readings,
   asked as a reminder shows, as its box opens, and every 15 real seconds while one it names is up, with its open log,
   the stage and vessel each reading goes to, and the reading standing there now. Such a reminder gets RECORD pH, its main
   answer, at the right end, with OK, the lesser one, to its left. RECORD pH opens the pH box under the reminder; SAVE
   sends the reading (POST /brewscribe/api/brew-day/readings), then closes the reminder as OK does. While BrewScribe can't
   take a reading (no log open, the vessel unclear) RECORD pH is greyed and says why; where BrewScribe isn't installed
   (404), or doesn't answer, there is none. st.scribe is Brew Day's copy of BrewScribe's last answer, and st.scribeSeen the
   reminder it was for: in the demo the moment's own banner, live CraftBeerPi's notification id, as the title bar is
   drawn afresh from CraftBeerPi's list each time. In the demo st.bscribe is BrewScribe, holding what its answer says, and
   st.scribeMock what a moment has BrewScribe or CraftBeerPi do: refuse a SAVE, not answer it, or save it and lose the
   answer (post); not answer an OK (ack); not answer the GET (get); and the entries BrewScribe has saved from Brew Day
   (ids). Live, an OK on such a reminder that gets no answer turns OK red, "tap to try again", with the reminder still up,
   rather than raising the title bar's alarm in the reminder's place.
   Every other BrewScribe reminder that asks for a reading (design/brewday/READINGS-ENTRY.md; BrewScribe's contract,
   draft 5) gets the same, the pH box made general: RECORD with a word for what its box takes, and the readings box
   (rdHTML), titled with the stage. Brew Day shows only the readings it knows, whole (rdClean): a reminder BrewScribe
   doesn't name, or names with nothing Brew Day can show, keeps its OK alone, as before */
const PH_WAIT = "Waiting for BrewScribe to answer.";
const PH_ASK = 15; // real seconds between asks while such a reminder is up, as often as BrewScribe's own page asks
const EXT_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg>';
const PHONE = window.matchMedia("(max-width:700px)");
const phCopy = o => o == null ? null : JSON.parse(JSON.stringify(o));
/* a new entry's id, in lower case as BrewScribe keeps it: crypto.randomUUID only exists on a secure page (https or
   localhost), which the rig's address isn't, so otherwise a version 4 UUID from crypto.getRandomValues */
function phUUID() {
  if (window.crypto && typeof crypto.randomUUID === "function") { try { return crypto.randomUUID(); } catch (_) { /* not a secure page */ } }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
/* the reminder an answer of BrewScribe's is kept for: the demo's banner itself; live, CraftBeerPi's notification id. A
   timer's alarm and the screen's own alarms have none */
const phWho = x => !x ? null : DEMO_MODE ? x : x.pid != null ? String(x.pid) : null;
const phTitle = x => x.rawTitle != null ? x.rawTitle : x.title;
/* the demo: BrewScribe as the moment has it, none with ?brewscribe=none, where CraftBeerPi answers 404. Brew Day had its
   answer before the moment, as it asked when the reminder went up; a moment can give it an older copy (bscribeSeen) */
function phLoad() {
  if (opts.brewscribe === "none") st.bscribe = null;
  else if (st.bscribe === undefined) st.bscribe = DEMO.scribeDay();
  st.scribeMock = Object.assign({post: [], ack: [], get: null, ids: {}}, st.scribeMock);
  const seen = st.bscribe && st.bscribeSeen !== undefined ? st.bscribeSeen : st.bscribe;
  delete st.bscribeSeen;
  Object.assign(st, {scribe: rdClean(phCopy(seen)), scribeSeen: st.banner, scribeTried: st.banner, scribeAsking: null, scribeAt: Date.now(), scribePosts: [], ph: null, phSent: null, rdSent: null});
}
/* live: nothing from BrewScribe yet. phMine: the reminders this screen answered (OK or SAVE), so one gone for that isn't
   taken for one answered on another screen; phAckFailed: those whose OK got no answer */
function phInit() {
  Object.assign(st, {scribe: null, scribeSeen: null, scribeTried: null, scribeAsking: null, scribeAt: 0, ph: null, phSent: null, rdSent: null, phMine: new Set(), phAckFailed: new Set()});
}
/* the reminder in the title bar, if BrewScribe takes a reading for it that Brew Day can show: BrewScribe's answer since
   it showed, its entry for the reminder, and the readings. A reminder whose readings are only the pH has the pH box (ph,
   rd its pH reading); any other has the readings box (rdHTML), with the readings it can show (rds) */
function phOffer(x = st.banner) {
  const A = st.scribe, who = phWho(x);
  if (!x || !A || !Array.isArray(A.reminders) || who == null || st.scribeSeen !== who) return null;
  const rem = A.reminders.find(r => r && r.title === phTitle(x)), rds = rem ? rem.readings : [];
  if (!rds.length) return null;
  return rds.every(r => r.kind === "ph") ? {A, rem, rd: rds[0], ph: true} : {A, rem, rd: rds[0], rds, ph: false};
}
/* the open box's offer: Brew Day's newest copy for the reminder it was opened from, while that reminder is still the one
   in the title bar and its readings are still of the box's kind (the pH alone, or others); else the copy it opened
   with. Another reminder's answer, arriving while a SAVE waits, never becomes this box's */
function phOwn() {
  const P = st.ph, o = phOffer();
  if (!P) return null;
  return o && phTitle(st.banner) === P.title && !!o.ph === !!(P.o && P.o.ph) ? o : P.o;
}
/* why BrewScribe can't take a reading, in its words, and the small line under RECORD pH that says so */
const phCant = o => !o.A.log ? {why: o.A.why_not || DEMO.PH_NOLOG, small: "no BrewScribe log"}
  : o.rem.vessel_problem ? {why: `${o.rem.vessel_problem} Record it on BrewScribe's page.`, small: "on BrewScribe's page"} : null;
const phUnit = A => A.temperature_unit === "f" ? "°F" : A.temperature_unit === "c" ? "°C" : null;
/* where the keys start: the recipe's target, else 5.40; the sample's at a cooled sample's usual temperature */
const phFrom = rd => rd.target != null && Number.isFinite(+rd.target) ? +rd.target : 5.4;
const phTFrom = A => A.temperature_unit === "c" ? 20 : 68;
const phDec = rd => Number.isInteger(rd.decimals) && rd.decimals >= 0 && rd.decimals <= 4 ? rd.decimals : 2;
/* the sample's temperature is asked only where the reminder's own words ask for it, and only with a unit to give it in */
const phTemp = o => o.rd.sample_temperature === "asked" && !!phUnit(o.A);
/* a figure as typed, "5.42" or "5,42", to dec decimals; null while it isn't one */
function phNum(txt, dec) {
  const s = String(txt || "").trim().replace(",", ".");
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const f = 10 ** dec;
  return Math.round(parseFloat(s) * f) / f;
}
/* the reminder's two answers (bannerHTML): OK, the lesser one, then RECORD at the right end (RECORD pH for the pH box,
   else its word for the readings box, rdRecWord), its small line saying what BrewScribe has for that stage. Both wait
   while SAVE does, and with no connection, as every command does. Greyed while BrewScribe can't take a reading, RECORD
   says why when tapped, unless its box is open, which it then closes. An OK that got no answer shows it failed, as a
   failed command's button does, until it is pressed again */
function phActsHTML(x, o) {
  const P = st.ph, open = !!(P && P.open), cant = phCant(o), sending = st.pend.b;
  const wait = st.link === "lost" ? PAUSED : st.pend.ph === "post" ? PH_WAIT : st.pend.ph || sending ? WAIT : "";
  const failed = !!x.ackFailed && !sending;
  const ok = b(`act sec${failed ? " failed" : ""}`, sending ? "SENDING…" : "OK", failed ? "tap to try again" : "", {cmd: DEMO_MODE ? x.cmd : "ph:ack", why: wait, label: failed ? `OK: ${x.title} didn't close. Tap to try again` : ""});
  const small = cant ? cant.small : !o.ph ? esc(rdRecSmall(o)) : o.rd.saved ? `${esc(o.rd.saved.text)} recorded` : "for BrewScribe";
  return ok + b("act phrec", o.ph ? "RECORD pH" : rdRecWord(o), small, {cmd: "ph:open", why: wait || (open || !cant ? "" : cant.why), expanded: open, controls: "ph-box"});
}
/* why SAVE waits or is greyed: no connection, a command on its way, BrewScribe unable to take a reading, no reading yet,
   a figure outside what BrewScribe accepts, or a sample's temperature that isn't a figure (the readings box: rdSaveWhy) */
function phSaveWhy(o) {
  if (!o.ph) return rdSaveWhy(o);
  const P = st.ph, rd = o.rd, dec = phDec(rd), v = phNum(P.txt, dec), cant = phCant(o);
  if (st.link === "lost") return PAUSED;
  if (st.pend.ph) return st.pend.ph === "post" ? PH_WAIT : WAIT;
  if (st.pend.b) return WAIT;
  if (cant) return cant.why;
  if (v == null) return `Give the pH first: type it, or step from ${phFrom(rd).toFixed(dec)}.`;
  if (v < rd.min || v > rd.max) return `pH is between ${rd.min} and ${rd.max}: check the figure.`;
  if (phTemp(o) && P.ttxt.trim() && phNum(P.ttxt, 1) == null) return "The sample temperature isn't a figure: check it, or leave it empty.";
  return "";
}
/* SAVE names the figure it sends, "SAVE pH 5.42", or "SAVE pH – –" while there is none */
function phGoHTML(o) {
  if (!o.ph) return rdGoHTML(o);
  const dec = phDec(o.rd), v = phNum(st.ph.txt, dec);
  return b("cmdbtn phgo", st.pend.ph ? "SAVING…" : `SAVE pH ${v == null ? "– –" : v.toFixed(dec)}`, "closes the reminder too", {cmd: "ph:save", why: phSaveWhy(o)});
}
/* a sample outside a cooled sample's usual range is questioned as it is set, in a line read before SAVE; SAVE still
   saves it */
function phWarm(o) {
  const U = phUnit(o.A), u = o.rd.sample_usual, t = phNum(st.ph.ttxt, 1);
  if (!phTemp(o) || !u || t == null || (t >= u.min && t <= u.max)) return "";
  return `${t.toFixed(1)} ${U} is ${t > u.max ? "warmer" : "colder"} than a cooled sample (${u.min} to ${u.max} ${U}): check it.`;
}
/* the pH box: MASH pH set into its top edge; for BrewScribe's log, the stage and vessel; what BrewScribe has for the
   stage already, without its time, which is the real clock's (The One Clock Rule); the pH's keys round its figure, as
   TARGET's are, with the recipe's target at the right; the sample's temperature where the reminder asks for it; the
   line for what went wrong; SAVE and CANCEL; and a quiet way to BrewScribe's page instead. While SAVE waits, everything
   in it waits too. Any other reminder has the readings box (rdHTML) */
function phHTML() {
  const P = st.ph, o = phOwn();
  if (!o.ph) return rdHTML(o);
  const {A, rem, rd} = o, dec = phDec(rd), U = phUnit(A), tg = rd.target != null && Number.isFinite(+rd.target);
  const why = st.pend.ph ? (st.pend.ph === "post" ? PH_WAIT : WAIT) : "", dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "", ro = why ? " readonly" : "";
  const key = (k, d, l, a) => `<button type="button" data-cmd="ph:step:${k}:${d}" aria-label="${a}"${dis}>${l}</button>`;
  const pH = `<div class="phsec"><p class="phlab"><label for="phin" id="ph-l">pH</label>${tg ? `<span class="phtgt" id="ph-tg">recipe target ${+rd.target}</span>` : ""}</p>`
    + `<div class="editor phkeys" role="group" aria-labelledby="ph-l">${key("v", -0.1, "−.1", "Down 0.1")}${key("v", -0.01, "−.01", "Down 0.01")}`
    + `<input id="phin" inputmode="decimal" autocomplete="off" maxlength="6" value="${esc(P.txt)}" aria-describedby="${tg ? "ph-tg " : ""}ph-h"${ro}>`
    + `${key("v", 0.01, "+.01", "Up 0.01")}${key("v", 0.1, "+.1", "Up 0.1")}</div>`
    + `<p class="phhelp" id="ph-h">From the meter, to ${dec} decimals: type it, or step from ${phFrom(rd).toFixed(dec)}.</p></div>`;
  const temp = !phTemp(o) ? "" : `<div class="phsec"><p class="phlab"><label for="phtin" id="pht-l">Sample temperature, ${U}</label></p>`
    + `<div class="editor phkeys" role="group" aria-labelledby="pht-l">${key("t", -1, "−1", "Down 1 degree")}${key("t", -0.1, "−.1", "Down 0.1 degree")}`
    + `<input id="phtin" inputmode="decimal" autocomplete="off" maxlength="6" value="${esc(P.ttxt)}" aria-describedby="pht-h phw"${ro}>`
    + `${key("t", 0.1, "+.1", "Up 0.1 degree")}${key("t", 1, "+1", "Up 1 degree")}</div>`
    + `<p class="phhelp" id="pht-h">If you took it: type it, or step from ${phTFrom(A)} ${U}.</p><p class="phwarm" id="phw">${esc(phWarm(o))}</p></div>`;
  return `<h2 class="pht" id="ph-t">MASH pH</h2><p class="phfor">For BrewScribe's log: ${esc(rem.stage_name)}${rem.vessel ? `, ${esc(rem.vessel)}` : ""}.</p>`
    + (rd.saved ? `<p class="phhad">BrewScribe has ${esc(rd.saved.text)} for ${esc(rem.stage_name)}. A new reading here is kept as well, as the latest.</p>` : "")
    + `<div class="phmid">${pH}${temp}</div><p class="note" id="ph-note">${esc(st.notes.ph || P.err || "")}</p>`
    + `<div class="phact">${phGoHTML(o)}${b("cmdbtn", "CANCEL", "", {cmd: "ph:x", why})}</div>`
    + b("phpage", `ON BREWSCRIBE'S PAGE${EXT_ICON}<span class="sr"> (opens ${esc(rem.stage_name)} in BrewScribe's tab)</span>`, "", {cmd: "ph:page", why});
}
/* the box drawn again in place (morph), so what has focus in it keeps it, a typed figure's caret included, then fitted
   under the reminder */
function phDraw() {
  const box = $("#ph-box"), P = st.ph, o = P && phOwn(), own = o && o !== P.o ? o : null;
  if (!box) return;
  if (!(P && P.open && (own || st.pend.ph))) { if (!box.hidden) { box.hidden = true; box.innerHTML = ""; } return; }
  if (own) P.o = own;
  morph(box, phHTML());
  box.hidden = false;
  phFit();
}
/* from 701 px wide the box drops under the reminder, right-aligned to its right edge and clear of it (MASH pH sits in
   the box's top edge), kept inside the window; where the window is too short for it, its middle scrolls. On a phone it
   is in the page under the reminder (brewday.css) */
function phFit() {
  const box = root && $("#ph-box");
  if (!box || box.hidden) return;
  const mid = box.querySelector(".phmid");
  box.style.top = box.style.right = "";
  if (mid) mid.style.maxHeight = "";
  if (PHONE.matches || !box.offsetParent) return;
  const P = box.offsetParent.getBoundingClientRect(), B = $("#banner").getBoundingClientRect(), W = document.documentElement.clientWidth;
  let right = P.right - B.right;
  box.style.top = `${Math.round(B.bottom - P.top + 14)}px`;
  box.style.right = `${right}px`;
  const r = box.getBoundingClientRect();
  if (r.left < 8) right -= 8 - r.left; else if (r.right > W - 8) right += r.right - (W - 8);
  box.style.right = `${right}px`;
  const over = r.bottom - (window.innerHeight - 8);
  if (over > 0 && mid) mid.style.maxHeight = `${Math.max(120, mid.getBoundingClientRect().height - over)}px`;
}
/* as each reminder shows, Brew Day asks BrewScribe about it (phAsk). The box goes with its reminder, answered here or
   elsewhere or taken down, unless its SAVE is on its way; answered on another screen, it says so (phOther). Live, while
   the connection is lost the title bar says so in the reminder's place: what was typed stays, and the box comes back
   with its reminder */
function phCheck() {
  if (!st || !("scribe" in st)) return;
  const x = st.banner, who = phWho(x);
  if (who != null && x.tone === "prompt" && x.timer == null && st.scribeSeen !== who && st.scribeTried !== who && st.link !== "lost") phAsk();
  const P = st.ph;
  if (!P || st.pend.ph || (x && phTitle(x) === P.title && phOffer(x))) return;
  if (!DEMO_MODE) {
    if (st.link === "lost") return;
    if (!st.prompts.some(p => String(p.id) === P.pid) && !st.phMine.has(P.pid)) {
      const here = $("#ph-box").contains(document.activeElement) || $("#banner").contains(document.activeElement);
      st.ph = null;
      return phOther({title: P.name}, here);
    }
  }
  st.ph = null;
}
/* GET /brewscribe/api/brew-day/readings. No answer: the screen keeps what BrewScribe said last and asks again 15 s on.
   404, where BrewScribe isn't installed, or any other refusal, is an answer: nothing to offer. The screen is drawn
   again only where what it shows changes. The demo's BrewScribe answers within a second (600 ms), or with the moment's
   get "none" not at all */
function phAsk() {
  const x = st.banner, who = phWho(x);
  Object.assign(st, {scribeAsking: who, scribeTried: who, scribeAt: Date.now()});
  const took = A => {
    st.scribeAsking = null;
    const was = phView();
    st.scribe = rdClean(A); st.scribeSeen = who;
    if (phView() !== was) renderAll();
  };
  if (DEMO_MODE) {
    const none = st.scribeMock.get === "none";
    timers.push(setTimeout(() => {
      if (st.scribeAsking !== who) return;
      if (none) { st.scribeAsking = null; return; }
      took(phCopy(st.bscribe));
    }, none ? 5000 : 600));
    return;
  }
  const g = gen;
  api.brewDayReadings().then(res => {
    if (g !== gen || !st || st.scribeAsking !== who) return;
    if (res.status === 0) { st.scribeAsking = null; return; }
    took(res.ok && res.data && typeof res.data === "object" && Array.isArray(res.data.reminders) ? res.data : null);
  });
}
/* what the screen shows from BrewScribe for the reminder in the title bar */
function phView() { const o = phOffer(); return o ? JSON.stringify([o.A.log, o.A.why_not, o.A.temperature_unit, o.A.volume_unit, o.A.volume_label, o.rem]) : ""; }
/* every real second: while a reminder BrewScribe names is up, or one it hasn't answered for, Brew Day asks again every
   15 s, so a reading saved on BrewScribe's page shows here too */
function phPoll() {
  if (!st || !("scribe" in st)) return;
  const x = st.banner, who = phWho(x);
  if (who == null || x.tone !== "prompt" || x.timer != null || st.scribeAsking || st.link === "lost" || (st.scribeSeen === who && !phOffer(x))) return;
  if (Date.now() - st.scribeAt >= PH_ASK * 1000) phAsk();
}
/* RECORD pH: the box opens under the reminder, LOG's list closing (one at a time), the pH empty and focus in it with its
   text selected; pressed again, it closes. A moment can open it with figures typed, BrewScribe's sentence from a SAVE
   that didn't go, and the entry that SAVE sent (o). Live, BrewScribe is asked again as it opens. The readings box opens
   the same way, focus in its first figure, with the gravity's pair BrewScribe starts it in and the sparge water from the
   HLT's levels; a moment can give it its figures (f), pair (pick), readings added with "+" (add), way, the entries an
   earlier SAVE sent (sent, by kind), and SAVE tapped while greyed (go). On a phone the page brings the box into view as
   it opens (boxInView), the focus moving in without the browser's own scrolling, which only looks for the figure */
function phOpen(o = {}) {
  const x = st.banner, f = phOffer(x);
  if (!f || st.pend.ph) return;
  if (st.ph && st.ph.open && !o.moment) return phClose();
  st.logOpen = false; st.notes.ph = "";
  st.ph = {title: phTitle(x), name: x.title, pid: DEMO_MODE ? null : String(x.pid), open: true, txt: o.txt || "", ttxt: o.ttxt || "", err: o.err || "", o: f};
  if (!f.ph) { const g = rdOf(f, "gravity"); Object.assign(st.ph, {f: Object.assign({}, o.f), add: (o.add || []).slice(), way: o.way || "levels", pick: o.pick || (g ? rdPair(rdPick(g, null)) : "")}); }
  if (o.sent) { if (f.ph) st.phSent = {key: phBody(f).key, id: o.sent}; else st.rdSent = rdSentFor(f, o.sent); }
  if (!DEMO_MODE && !st.scribeAsking) phAsk();
  renderAll();
  /* focus in the first figure with its text selected, once the press is done; for a moment opening it as it loads, once
     the fonts are in, as the mockup's moments have it. A moment's SAVE tapped while greyed says why */
  const go = () => {
    const i = root && (f.ph ? $("#phin") : $("#ph-box .phmid input"));
    if (i) { i.focus({preventScroll: PHONE.matches}); i.select(); }
    boxInView(root && $("#ph-box"));
    if (o.go) { const s = root && $("#ph-box .phgo"); if (s && s.getAttribute("aria-disabled") === "true") explain(s); }
  };
  if (!o.moment) { timers.push(setTimeout(go, 0)); return; }
  const g = gen;
  if (root) void root.offsetHeight;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (g === gen) go(); });
}
/* CANCEL, Escape and RECORD pH pressed again close the box and keep nothing, focus back on RECORD pH; not while SAVE
   waits, which can't be called back */
function phClose() {
  if (!st.ph || st.pend.ph) return;
  st.ph = null; renderAll();
  timers.push(setTimeout(() => { if (root) $('#banner [data-cmd="ph:open"]')?.focus({preventScroll: true}); }, 0));
}
/* LOG's list and the box, one at a time: LOG opened closes the box, keeping nothing; while its SAVE waits the box only
   steps out of sight, and comes back if BrewScribe doesn't take the reading */
function phLogOpened() { if (st.ph) { if (st.pend.ph) st.ph.open = false; else st.ph = null; } }
/* the keys: −.1 −.01 +.01 +.1 from the pH typed, or from the recipe's target, else 5.40, while there is none, kept within
   what BrewScribe accepts; −1 −.1 +.1 +1 for the sample, from 68 °F. The new figure is said aloud */
function phStep(k, d) {
  const P = st.ph, o = P && phOwn();
  if (!o || st.pend.ph || !Number.isFinite(d)) return;
  if (!o.ph) return rdStep(o, k, d);
  const rd = o.rd, dec = phDec(rd);
  if (k === "v") {
    const f = 10 ** dec;
    P.txt = Math.min(rd.max, Math.max(rd.min, Math.round(((phNum(P.txt, dec) ?? phFrom(rd)) + d) * f) / f)).toFixed(dec);
    say(`pH ${P.txt}`);
  } else {
    P.ttxt = (Math.round(((phNum(P.ttxt, 1) ?? phTFrom(o.A)) + d) * 10) / 10).toFixed(1);
    const w = phWarm(o);
    say(`${P.ttxt} ${phUnit(o.A)}${w ? `. ${w}` : ""}`);
  }
  renderAll();
}
/* what SAVE sends: the reading to its decimals, and the sample's temperature with its unit when one is given. key: its
   content, so the same reading sent again keeps its entry_id */
function phBody(o) {
  const P = st.ph, v = phNum(P.txt, phDec(o.rd)), t = phTemp(o) && P.ttxt.trim() ? phNum(P.ttxt, 1) : null, u = t == null ? null : o.A.temperature_unit;
  const day = o.A.log ? o.A.log.day_id : null, body = {entry_id: null, day_id: day, title: P.title, kind: "ph", value: v};
  if (t != null) Object.assign(body, {temperature: t, temperature_unit: u});
  return {body, key: DEMO.phKey(day, P.title, v, t, u)};
}
/* SAVE: SAVING… at once, everything in the box and both of the reminder's answers waiting. BrewScribe saves it, then the
   reminder closes as OK closes it (phAck). The same reading sent again keeps its entry_id, so BrewScribe never saves it
   twice; a changed one is a new reading, with a new one. The readings box sends draft 5's body (rdBody), each reading
   with its own entry_id */
function phSave() {
  const P = st.ph, x = st.banner, o = phOffer(x);
  if (!P || !o || st.pend.ph || st.pend.b) return;
  const why = phSaveWhy(o);
  if (why) return note("ph", why);
  let body, what = "";
  if (o.ph) {
    const r = phBody(o);
    if (!st.phSent || st.phSent.key !== r.key) st.phSent = {key: r.key, id: phUUID()};
    body = r.body; body.entry_id = st.phSent.id;
  } else ({body, what} = rdBody(o));
  P.err = ""; st.notes.ph = ""; st.pend.ph = "post";
  renderAll();
  phPost(body, (code, res, raw) => phAnswer(code, res, body, x, raw, what));
}
/* POST /brewscribe/api/brew-day/readings: BrewScribe's answer, or none in 5 s (status 0). The demo's BrewScribe answers
   about half a second on (scribeTake), unless the moment has it refuse ({status, error, reason}), not answer ("none"),
   or save it and lose the answer ("lost") */
function phPost(body, done) {
  if (!DEMO_MODE) {
    const g = gen;
    api.brewDayReading(body).then(res => { if (g === gen && st) done(res.status, res.data && typeof res.data === "object" ? res.data : null, res); });
    return;
  }
  st.scribePosts.push(phCopy(body));
  const SM = st.scribeMock, how = SM.post.length ? SM.post.shift() : null;
  if (how === "none" || how === "lost") {
    if (how === "lost") scribeTake(body);
    timers.push(setTimeout(() => done(0, null), 5000));
    return;
  }
  timers.push(setTimeout(() => how ? done(how.status, {error: how.error, reason: how.reason}) : done(...scribeTake(body)), 500));
}
/* the demo's BrewScribe taking a reading, as its call does: the same entry again answers 200 and saves nothing; no log
   open, a log that isn't the open one any more, a vessel it can't tell, or an entry_id saved with other figures are
   refused (409); a value outside its range is a bad request (400). Saved, it is the reading standing in that stage.
   Draft 5's body, with its readings, is rdTake's */
function scribeTake(b) {
  if (b.readings) return rdTake(b);
  const S = st.bscribe, SM = st.scribeMock;
  if (!S) return [404, null];
  const rem = S.reminders.find(r => r.title === b.title), rd = rem && rem.readings.find(r => r.kind === b.kind);
  if (!rd) return [400, {error: `BrewScribe takes no ${b.kind} reading for ${b.title}`}];
  if (typeof b.value !== "number" || b.value < rd.min || b.value > rd.max) return [400, {error: `pH must be between ${rd.min} and ${rd.max}`}];
  const key = DEMO.phKey(b.day_id, b.title, b.value, b.temperature ?? null, b.temperature_unit ?? null), text = `pH ${b.value.toFixed(rd.decimals)}`;
  const ok = () => ({entry_id: b.entry_id, day_id: b.day_id, stage: rem.stage, vessel: rem.vessel, text: `${text} saved in BrewScribe (${rem.stage_name}, ${rem.vessel})`});
  if (SM.ids[b.entry_id] != null) return SM.ids[b.entry_id] === key ? [200, ok()] : [409, {error: "BrewScribe already has a different reading saved under this one's ID, so this one wasn't saved.", reason: "entry_id_reused"}];
  if (!S.log) return [409, {error: S.why_not, reason: "no_open_log"}];
  if (S.log.day_id !== b.day_id) return [409, {error: "BrewScribe's open log has changed, so this reading wasn't saved. Check BrewScribe's page, then try again.", reason: "log_changed"}];
  if (rem.vessel_problem) return [409, {error: `${rem.vessel_problem} This reading wasn't saved: record it on BrewScribe's page.`, reason: "vessel_unknown"}];
  SM.ids[b.entry_id] = key;
  rd.saved = {entry_id: b.entry_id, value: b.value, text, occurred_at: new Date().toISOString()};
  return [201, ok()];
}
/* the reminder SAVE was pressed on is still waiting: in the demo the title bar's, live CraftBeerPi's notification */
const phStill = x => DEMO_MODE ? st.banner === x : st.prompts.some(p => String(p.id) === String(x.pid));
/* BrewScribe's answer to SAVE. Saved (201, or 200 for the same entry again): Brew Day's copy has it at once, so RECORD
   says so, and the reminder closes as OK closes it, unless it went on another screen meanwhile, or, from the readings
   box, something it asks for is still to come (rdStays); LOG has BrewScribe's own sentence. Refused, or no answer in
   5 s: nothing closes, the box says why above SAVE, in BrewScribe's words as it sent them, LOG says it failed (what: the
   readings box's words for what it sent), and after a 409 Brew Day asks BrewScribe again */
function phAnswer(code, res, body, x, raw, what = "") {
  const P = st.ph, dec = P && P.o && P.o.ph ? phDec(P.o.rd) : 2, v = body.readings ? what : `pH ${body.value.toFixed(dec)}`;
  if (code === 200 || code === 201) {
    phHad(body, res);
    st.phSent = null; st.rdSent = null;
    const text = res && typeof res.text === "string" && res.text.trim() ? res.text : `${v} saved in BrewScribe`;
    if (body.readings && phStill(x) && !rdDone(x)) return rdStays(text);
    if (phStill(x)) { st.pend.ph = "close"; renderAll(); return phAck((closed, w) => phDone(text, x, closed, w), x); }
    return phDone(text, x, null);
  }
  delete st.pend.ph;
  const why = code === 0 ? DEMO.PH_SLOW : (res && typeof res.error === "string" && res.error.trim()) || "BrewScribe didn't take the reading.";
  logEvent(code === 0 ? `${v} may not be saved in BrewScribe` : `${v} not saved in BrewScribe`, code === 0 ? `failed: ${raw ? failWhy(raw) : "no answer in 5 s"}` : "failed", "bad");
  if (code === 409) phAsk();
  if (!P || !phStill(x)) { st.ph = null; renderAll(); return phOther(x); }
  Object.assign(P, {err: why, open: true});
  st.logOpen = false;
  say(why, true);
  renderAll();
}
/* the reading BrewScribe now has, in Brew Day's copy; from the readings box, each of them, in BrewScribe's words where
   its answer gives them */
function phHad(b, res) {
  if (b.readings) {
    if (!st.scribe) return;
    const said = res && Array.isArray(res.saved) ? res.saved : [];
    b.readings.forEach(r => {
      try { DEMO.rdApply(st.scribe, b.title, r); } catch (_) { return; } /* a copy it can't follow waits for the next ask */
      const s = said.find(y => y && y.entry_id === r.entry_id && typeof y.text === "string");
      if (s && r.kind !== "level" && r.kind !== "sparge_water") st.scribe.reminders.forEach(m => m.readings.filter(y => y.kind === r.kind && y.saved && y.saved.entry_id === r.entry_id).forEach(y => { y.saved.text = s.text; }));
    });
    return;
  }
  const rem = st.scribe && st.scribe.reminders.find(r => r.title === b.title), rd = rem && rem.readings.find(r => r.kind === b.kind);
  if (rd) rd.saved = {entry_id: b.entry_id, value: b.value, text: `pH ${b.value.toFixed(phDec(rd))}`, occurred_at: new Date().toISOString()};
}
/* OK on these reminders: CraftBeerPi's own button, which it runs for every screen, so the reminder goes from all of them;
   for BrewScribe's reminder it is also how BrewScribe knows it was seen. SAVE closes the reminder the same way (after,
   told whether it closed and, if not, why). With no answer in 5 s the reminder stays and OK shows it failed, as any
   failed command's button does */
function phAck(after, x = st.banner) {
  if (!DEMO_MODE) return phAckLive(after, x);
  if (!x || st.pend.b) return;
  st.pend.b = "ok"; x.ackFailed = false;
  renderAll();
  const SM = st.scribeMock, fail = SM.ack.length ? SM.ack.shift() === "none" : false;
  timers.push(setTimeout(() => {
    delete st.pend.b;
    const line = `${x.title} answered: OK`;
    if (fail) { x.ackFailed = true; logEvent(line, "failed: no answer in 5 s", "bad"); }
    else { questionGone(x.title); if (st.banner === x) st.banner = null; logEvent(line, "confirmed", "ok"); }
    if (after) return after(!fail);
    say(fail ? `${line}: failed, no answer in 5 s. The reminder is still up.` : `${line}: confirmed`, fail);
    renderAll();
  }, fail ? 5000 : 700 + Math.random() * 400));
}
/* live: the reminder's own OK action, as livePrompt sends it, logged as "Check mash pH answered: OK". A 400 means
   CraftBeerPi no longer waits for it (answered elsewhere, or withdrawn), so it has gone all the same */
async function phAckLive(after, x) {
  const pid = x && x.pid != null ? String(x.pid) : null, p = pid && st.prompts.find(q => String(q.id) === pid);
  if (!p || st.pend.b) { if (after) after(!p); return; }
  const a = (p.action || []).find(q => /^ok$/i.test(String(q.label || "").trim())) || p.action[0];
  const done = () => { if (opts.removeAlert) opts.removeAlert(p.id); }, g = gen;
  st.phAckFailed.delete(pid); st.phMine.add(pid); answered.add(pid);
  let closed = false, w = "";
  await exec("b", "ok", `${p.title} answered: ${a ? a.label : "OK"}`, () => api.answer(pid, a.id), {
    ok: () => { closed = true; done(); },
    fail: (res, why) => {
      if (res.status === 400) { closed = true; done(); return; }
      w = why;
      answered.delete(pid); st.phMine.delete(pid); st.phAckFailed.add(pid);
    }
  });
  if (after && g === gen && st) after(closed, w);
}
/* SAVE done: the box closes, and BrewScribe's sentence goes in LOG, on top of CraftBeerPi's answer, and is said aloud;
   focus goes to LOG. If OK didn't close the reminder, the reminder stays, with "pH 5.42 recorded" under RECORD pH and
   its failure on OK */
function phDone(text, x, closed, w = "") {
  delete st.pend.ph; st.ph = null;
  logEvent(text, "confirmed", "ok");
  const why = !w || /^no answer/.test(w) ? "OK got no answer in 5 s" : `OK failed, ${w}`;
  say(closed === false ? `${text}. ${x.title} didn't close: ${why}.` : `${text}: confirmed`, closed === false);
  renderAll();
  timers.push(setTimeout(() => { if (root) $("#event .logbtn")?.focus({preventScroll: true}); }, 0));
}
/* the box closed because the reminder was answered on another screen: it says so, and that nothing was sent */
function phOther(x, here = true) {
  const w = `${x.title} was answered on another screen, so nothing was saved here.`;
  toast(w); say(w);
  if (here) timers.push(setTimeout(() => { if (root) $("#event .logbtn")?.focus({preventScroll: true}); }, 0));
}
/* the demo: CraftBeerPi telling this screen the reminder was answered on another (a moment's phElse). Its line says
   "answered" and one line says where; an open box closes, unless its SAVE is on its way, whose answer then decides
   (phAnswer). Live, observe() logs it, and phCheck closes the box */
function phElsewhere() {
  const x = st.banner, P = st.ph;
  if (!x) return;
  const here = $("#ph-box").contains(document.activeElement) || $("#banner").contains(document.activeElement);
  questionGone(x.title); st.banner = null;
  logEvent(`${x.title} answered`, "from another screen", "");
  if (P && !st.pend.ph) { st.ph = null; renderAll(); return phOther(x, here); }
  renderAll();
}
function phCmd(cmd) {
  const [, x, k, d] = cmd.split(":");
  if (x === "open") return phOpen();
  if (x === "x") return phClose();
  if (x === "save") return phSave();
  if (x === "ack") return phAck();
  if (x === "step") return phStep(k, parseFloat(d));
  if (x === "pick") return rdChoose(+k);
  if (x === "add") return rdAdd(k);
  if (x === "way") return rdWay();
  if (x === "page") {
    const o = phOwn() || phOffer(), what = !o || o.ph ? "pH" : RD_NAME[(rdParts(o).parts[0] || o.rds[0]).kind];
    if (DEMO_MODE) return toast(`Mockup: this opens ${o ? `${o.rem.stage_name} on BrewScribe's page` : "BrewScribe's page"} in BrewScribe's own tab, with the cursor in its ${what} box${o ? ` (${o.rem.page})` : ""}.`);
    /* that stage in BrewScribe's tab (named "brewscribe", as the BREWSCRIBE tab opens it), ready for the reading */
    const page = o && typeof o.rem.page === "string" && o.rem.page.startsWith("/brewscribe/") ? o.rem.page : "/brewscribe/#now";
    try { window.open(page, "brewscribe"); } catch (_) { /* a blocked window: BREWSCRIBE's tab still opens it */ }
  }
}
/* ---------- every BrewScribe reminder that asks for a reading (design/brewday/READINGS-ENTRY.md) ----------
   The pH box made general. A reminder BrewScribe names with readings other than the mash pH gets RECORD with a word for
   what its box takes (RECORD VOLUME, LEVEL or GRAVITY, or READINGS where two are asked), and the same box under it,
   titled with the stage: a part for each asked reading still to come, the others a "+" away, and one SAVE for them all
   (draft 5's POST, all or nothing, each reading with its own entry_id). Where something asked is still to come after
   SAVE, the reminder stays, its RECORD saying what. Volumes, levels and the sparge water are in BrewScribe's unit
   (volume_unit), never converted, and shown only with one. st.ph holds the pH's figures as the pH box does (txt, ttxt),
   the others' as typed (f: g and gt for the gravity and its sample, vol, lvl, bef and aft for the HLT's levels before
   and after the sparge, spv for the sparge water typed), the gravity's pair (pick), the readings added with "+" (add)
   and the sparge water's way (way: "levels" or "volume"); st.rdSent the entry_id each reading went with */
const RD_VOLS = ["volume", "level", "sparge_water"];
/* each kind in the box's words: "the reminder stays for the gravity", "gravity to come" */
const RD_NAME = {ph: "pH", gravity: "gravity", volume: "volume", level: "level", sparge_water: "sparge water"};
const RD_PLUS = {ph: "+ pH", gravity: "+ GRAVITY", volume: "+ VOLUME", level: "+ LEVEL", sparge_water: "+ SPARGE WATER"};
const rdJoin = DEMO.rdJoin;
/* BrewScribe's answer as Brew Day uses it: each reminder with only the readings Brew Day knows and can show whole, the
   kinds ph, gravity (with its choices), volume, level and sparge_water, the last three only in a unit BrewScribe gives,
   one of each kind; each with the figures its part needs. So an older BrewScribe's answer, or one with something
   missing, only ever means fewer readings offered, never a broken box. null where it isn't an answer at all */
function rdClean(A) {
  if (!A || typeof A !== "object" || !Array.isArray(A.reminders)) return null;
  const num = v => typeof v === "number" && Number.isFinite(v), str = v => typeof v === "string", obj = v => !!v && typeof v === "object";
  const vu = A.volume_unit === "us_gal" || A.volume_unit === "l" ? A.volume_unit : null, l = vu === "l";
  const dec = (v, d) => Number.isInteger(v) && v >= 0 && v <= 4 ? v : d;
  const saved = s => obj(s) && str(s.text) ? s : null;
  const tgt = t => obj(t) && str(t.text) ? Object.assign({}, t, {value: num(t.value) ? t.value : null}) : null;
  const range = u => obj(u) && num(u.min) && num(u.max) ? u : null;
  const one = r => {
    if (!obj(r) || !str(r.kind)) return null;
    const base = Object.assign({}, r, {label: str(r.label) ? r.label : RD_NAME[r.kind], asked: r.asked !== false, saved: saved(r.saved), sample_usual: range(r.sample_usual)});
    if (r.kind === "ph") return num(r.min) && num(r.max) ? Object.assign(base, {target: num(r.target) ? r.target : null}) : null;
    if (r.kind === "gravity") {
      const C = (Array.isArray(r.choices) ? r.choices : []).filter(c => obj(c) && str(c.instrument) && str(c.scale) && str(c.label) && num(c.min) && num(c.max)
        && Number.isInteger(c.decimals) && c.decimals >= 0 && c.decimals <= 4 && obj(c.usual) && num(c.usual.start));
      if (!C.length) return null;
      const R = obj(r.refractometer) ? Object.assign({}, r.refractometer) : null;
      if (R && !num(R.wort_correction_factor)) delete R.wort_correction_factor;
      return Object.assign(base, {choices: C, chosen: obj(r.chosen) && str(r.chosen.instrument) && str(r.chosen.scale) ? r.chosen : null, refractometer: R, target: tgt(r.target)});
    }
    if (!RD_VOLS.includes(r.kind) || !vu) return null;
    const u = obj(r.usual) ? r.usual : {};
    Object.assign(base, {decimals: dec(r.decimals, l ? 1 : 2), min: num(r.min) ? r.min : 0, max: num(r.max) ? r.max : null, usual: Object.assign({}, u, {start: num(u.start) ? u.start : l ? 20 : 5}),
      sample_temperature: "none", target: tgt(r.target)});
    if (r.kind === "sparge_water") base.level_before = obj(r.level_before) && num(r.level_before.value) && str(r.level_before.text) ? r.level_before : null;
    return base;
  };
  return Object.assign({}, A, {log: obj(A.log) && str(A.log.day_id) ? A.log : null, why_not: str(A.why_not) ? A.why_not : null,
    temperature_unit: A.temperature_unit === "f" || A.temperature_unit === "c" ? A.temperature_unit : null,
    volume_unit: vu, volume_label: vu ? (str(A.volume_label) && A.volume_label.trim() ? A.volume_label : l ? "L" : "gal") : null,
    reminders: A.reminders.filter(m => obj(m) && str(m.title) && str(m.stage_name)).map(m => {
      const kinds = new Set();
      const readings = (Array.isArray(m.readings) ? m.readings : []).map(one).filter(r => r && !kinds.has(r.kind) && kinds.add(r.kind));
      return Object.assign({}, m, {vessel: str(m.vessel) ? m.vessel : null, vessel_problem: str(m.vessel_problem) ? m.vessel_problem : null, readings});
    })});
}
/* the gravity's pair as one key; a reading in the box by its kind; a reading's content, which keeps its entry_id while
   it's unchanged; and a figure as typed, by its key (v and t the pH's, as the pH box keeps them) */
const rdPair = c => `${c.instrument}:${c.scale}`;
const rdOf = (o, kind) => o.rds.find(r => r.kind === kind);
const rdKey = (day, title, r) => JSON.stringify([day, title, r]);
const rdTxt = (P, k) => k === "v" ? P.txt : k === "t" ? P.ttxt : ((P.f || {})[k] || "");
function rdPut(P, k, s) { if (k === "v") P.txt = s; else if (k === "t") P.ttxt = s; else P.f[k] = s; }
/* a volume, level or sparge water as BrewScribe has it: in its unit, to that unit's decimals ("10.00 gal"), else its
   own words */
const rdHas = (s, A) => typeof s.value === "number" && Number.isFinite(s.value) ? DEMO.rdAmt(s, A) : s.text;
/* the gravity's pair: the one chosen in the box, else BrewScribe's chosen (the brew's last), else its first */
function rdPick(rd, P) {
  const want = P && P.pick ? P.pick : rd.chosen ? rdPair(rd.chosen) : "";
  return rd.choices.find(c => rdPair(c) === want) || rd.choices[0];
}
/* the sample's temperature, where the reading's own words ask for it (for a gravity, its pair's), with a unit to give
   it in */
const rdTempOn = (o, rd) => !!phUnit(o.A) && (rd.kind === "gravity" ? rdPick(rd, st.ph).sample_temperature : rd.sample_temperature) === "asked";
/* something typed in a reading's part, so a part the brewer has started on stays in the box */
const rdTyped = (P, kind) => !!P && (kind === "ph" ? !!P.txt.trim() : kind === "gravity" ? !!(P.f.g || "").trim() : kind === "volume" ? !!(P.f.vol || "").trim()
  : kind === "level" ? !!(P.f.lvl || "").trim() : ["bef", "aft", "spv"].some(k => (P.f[k] || "").trim()));
/* the box's parts: the asked readings still to come, in BrewScribe's order (every asked one once all are recorded, so
   it never opens empty), then those added with "+" in the order added, and any other with something typed in it; the
   rest wait behind "+" (more) */
function rdParts(o, P = st.ph) {
  const due = o.rds.filter(r => r.asked && !r.saved), first = due.length ? due : o.rds.filter(r => r.asked);
  const added = [...((P && P.add) || []).map(k => rdOf(o, k)), ...o.rds.filter(r => P && P.f && rdTyped(P, r.kind))].filter((r, i, L) => r && !first.includes(r) && L.indexOf(r) === i);
  const parts = [...first, ...added];
  return {parts, more: o.rds.filter(r => !parts.includes(r))};
}
/* the figures in a reading's part, in the box's order */
function rdKeys(o, rd) {
  if (rd.kind === "ph") return rdTempOn(o, rd) ? ["v", "t"] : ["v"];
  if (rd.kind === "gravity") return rdTempOn(o, rd) ? ["g", "gt"] : ["g"];
  if (rd.kind === "volume") return ["vol"];
  if (rd.kind === "level") return ["lvl"];
  return st.ph.way === "volume" ? ["spv"] : rdKept(rd) ? ["aft"] : ["bef", "aft"];
}
/* the HLT's level before the sparge that BrewScribe keeps: as its answer has it, or as a SAVE this box sent used it.
   BrewScribe that saved a SAVE which got no answer has let its kept level go, and SAVE again must send the same
   reading, with the same entry_id, for it to be saved once */
const rdKept = rd => rd.level_before || (st.ph && st.ph.kept) || null;
/* the HLT's level before the sparge: the one BrewScribe keeps, else the one typed in the box */
function rdBefore(o, rd = rdOf(o, "sparge_water")) {
  const kept = rdKept(rd);
  return kept ? kept.value : phNum(rdTxt(st.ph, "bef"), rd.decimals ?? 2);
}
/* a figure: its decimals, what BrewScribe accepts, its keys and where they start. The pH (v) as in the pH box; a
   gravity (g) from the recipe's OG where it's in the chosen scale, else BrewScribe's usual start; a volume, level or
   sparge water from the recipe's figure in BrewScribe's unit, else its usual start; the level after the sparge (aft)
   from the level before less the recipe's sparge, else the level before; the samples' temperatures (t, gt) from a
   cooled sample's 68 °F (20 °C). name: what a refusal calls it */
function rdField(o, k) {
  const A = o.A, vu = A.volume_unit, ves = o.rem.vessel || "HLT";
  const T = rd => ({rd, dec: 1, min: -Infinity, max: Infinity, from: phTFrom(A), keys: [-1, -0.1, 0.1, 1], unit: phUnit(A), temp: true});
  const V = (rd, from, name = rd.label) => ({rd, dec: rd.decimals ?? (vu === "l" ? 1 : 2), min: rd.min ?? 0, max: rd.max ?? Infinity, from: Math.max(rd.min ?? 0, from), keys: [-1, -0.1, 0.1, 1], unit: A.volume_label, name});
  const own = rd => rd.target && rd.target.unit === vu && rd.target.value != null ? rd.target.value : null;
  if (k === "v") { const rd = rdOf(o, "ph"); return {rd, dec: phDec(rd), min: rd.min, max: rd.max, from: phFrom(rd), keys: [-0.1, -0.01, 0.01, 0.1], unit: "pH", name: "pH"}; }
  if (k === "t") return T(rdOf(o, "ph"));
  if (k === "gt") return T(rdOf(o, "gravity"));
  if (k === "g") {
    const rd = rdOf(o, "gravity"), c = rdPick(rd, st.ph), t = rd.target;
    return {rd, c, dec: c.decimals, min: c.min, max: c.max, from: t && t.scale === c.scale && t.value != null ? t.value : c.usual.start, keys: c.decimals > 2 ? [-0.01, -0.001, 0.001, 0.01] : [-1, -0.1, 0.1, 1], unit: c.label, name: c.label};
  }
  const rd = rdOf(o, k === "vol" ? "volume" : k === "lvl" ? "level" : "sparge_water");
  if (k === "aft") { const f = rdBefore(o, rd), t = own(rd); return V(rd, f == null ? rd.usual.start : t != null && f - t >= (rd.min ?? 0) ? f - t : f, `${ves} level`); }
  return k === "bef" ? V(rd, rd.usual.start, `${ves} level`) : V(rd, own(rd) ?? rd.usual.start, k === "lvl" ? `${ves} level` : rd.label);
}
/* the Note Amber line under a figure, empty until there's something to check: a sample's temperature outside a cooled
   sample's usual range, as the pH box says it, and a °Bx or °P figure that looks like an SG ("1.048"), as BrewScribe's
   page says it. Neither stops SAVE */
function rdCheckLine(o, k) {
  const P = st.ph;
  if (k === "t" || k === "gt") {
    const rd = rdOf(o, k === "t" ? "ph" : "gravity"), U = phUnit(o.A), u = rd.sample_usual, t = phNum(rdTxt(P, k), 1);
    if (!rdTempOn(o, rd) || !u || t == null || (t >= u.min && t <= u.max)) return "";
    return `${t.toFixed(1)} ${U} is ${t > u.max ? "warmer" : "colder"} than a cooled sample (${u.min} to ${u.max} ${U}): check it.`;
  }
  if (k !== "g") return "";
  const c = rdPick(rdOf(o, "gravity"), P), s = String(P.f.g || "").trim().replace(",", ".");
  if (c.scale === "sg" || !/^1\.\d{3,}$/.test(s) || +s < 1.001 || +s > 1.15) return "";
  return `${s} looks like an SG reading, but ${c.label} is chosen: choose SG, or check the figure.`;
}
/* a °Bx or °P figure as an SG, to read against the recipe's OG: BrewScribe's page's formula (draft 5, section 5), for
   wort from 0 to 40, with the refractometer's wort correction factor for °Bx only. Shown, never sent */
function rdAbout(o) {
  const rd = rdOf(o, "gravity"), c = rdPick(rd, st.ph), v = phNum(st.ph.f.g, c.decimals), f = rd.refractometer && rd.refractometer.wort_correction_factor;
  if (c.scale === "sg" || v == null || v < 0 || v > 40) return "";
  const x = c.scale === "brix" && f ? v / f : v;
  return `About ${(1 + x / (258.6 - (x / 258.2) * 227.1)).toFixed(3)} SG.`;
}
/* the sparge water from the HLT's levels: before less after, to the levels' decimals, as BrewScribe works it out (10.00
   and 4.60 give 5.40); null until both are given and the level after is lower */
function rdSparge(o) {
  const rd = rdOf(o, "sparge_water"), dec = rd.decimals ?? 2, a = phNum(rdTxt(st.ph, "aft"), dec), b = rdBefore(o, rd);
  return a == null || b == null || a < 0 || a >= b ? null : Number((b - a).toFixed(dec));
}
const rdSpargeLine = o => { const v = rdSparge(o); return v == null ? "" : `Sparge water: ${v.toFixed(rdOf(o, "sparge_water").decimals ?? 2)} ${o.A.volume_label}.`; };
/* the gravity's help line: the instrument, the decimals and where the keys start; for °Bx, whether BrewScribe has the
   refractometer's wort correction factor, which it applies itself. It asks for nothing */
function rdGHelp(rd, F) {
  const c = F.c, f = rd.refractometer && rd.refractometer.wort_correction_factor;
  const h = `From the ${c.instrument}, to ${c.decimals === 1 ? "1 decimal" : `${c.decimals} decimals`}: type it, or step from ${F.from.toFixed(F.dec)}.`;
  return c.scale !== "brix" ? h : `${h} ${f != null ? `BrewScribe applies your wort correction factor, ${f}.` : "BrewScribe has no wort correction factor for it yet, so its SG is an estimate."}`;
}
/* what SAVE sends, in BrewScribe's order: each part with a figure, its body (draft 5), its words ("6.40 gal",
   "1.048 SG", "pH 5.42") and, where those don't say what it is, its words for LOG; and the first thing that stops SAVE:
   a figure outside what BrewScribe accepts, a sample's temperature that isn't a figure, or the HLT's levels incomplete
   or the wrong way round, in BrewScribe's words where it has them */
function rdReads(o) {
  const P = st.ph, A = o.A, vl = A.volume_label, list = [], bad = [], {parts} = rdParts(o, P);
  const fig = (k, F) => {
    const v = phNum(rdTxt(P, k), F.dec);
    if (v != null && (v < F.min || v > F.max)) bad.push(F.max === Infinity ? `${F.name} is ${F.min} or more: check the figure.` : `${F.name} is between ${F.min} and ${F.max}: check the figure.`);
    return v;
  };
  const temp = (k, rd, r) => {
    const s = rdTxt(P, k).trim(), t = phNum(s, 1);
    if (!rdTempOn(o, rd) || !s) return;
    if (t == null) bad.push("The sample temperature isn't a figure: check it, or leave it empty.");
    else Object.assign(r, {temperature: t, temperature_unit: A.temperature_unit});
  };
  o.rds.filter(rd => parts.includes(rd)).forEach(rd => {
    if (rd.kind === "ph" || rd.kind === "gravity") {
      const g = rd.kind === "gravity", F = rdField(o, g ? "g" : "v"), v = fig(g ? "g" : "v", F);
      if (v == null) return;
      const r = g ? {kind: "gravity", value: v, instrument: F.c.instrument, scale: F.c.scale} : {kind: "ph", value: v};
      temp(g ? "gt" : "t", rd, r);
      return list.push({rd, send: r, text: g ? `${v.toFixed(F.dec)} ${F.c.label}` : `pH ${v.toFixed(F.dec)}`});
    }
    if (rd.kind !== "sparge_water" || P.way === "volume") {
      const k = rd.kind === "volume" ? "vol" : rd.kind === "level" ? "lvl" : "spv", F = rdField(o, k), v = fig(k, F);
      if (v == null) return;
      const text = `${v.toFixed(F.dec)} ${vl}`;
      return list.push({rd, send: {kind: rd.kind, value: v, unit: A.volume_unit}, text, log: rd.kind === "level" ? `${F.name} ${text}` : rd.kind === "sparge_water" ? `Sparge water ${text}` : ""});
    }
    const Fa = rdField(o, "aft"), a = fig("aft", Fa), kept = rdKept(rd), b = kept ? kept.value : fig("bef", rdField(o, "bef"));
    if (a == null && (kept || b == null)) return;
    if (a == null) return bad.push("Give the HLT's level after the sparge too.");
    if (b == null) return bad.push("Give the HLT's level before the sparge too.");
    if (a >= b) return bad.push("The HLT's level after the sparge should be lower than before it.");
    const r = {kind: "sparge_water", unit: A.volume_unit, level_after: a}, text = `${Number((b - a).toFixed(Fa.dec)).toFixed(Fa.dec)} ${vl}`;
    if (!kept) r.level_before = b;
    list.push({rd, send: r, text, log: `Sparge water ${text}`});
  });
  return {list, bad: bad[0] || ""};
}
/* where the first part's keys start, for SAVE's reason while nothing is given */
function rdStart(o) {
  const rd = rdParts(o).parts[0] || o.rds[0], F = rdField(o, rdKeys(o, rd)[0]);
  return F.from.toFixed(F.dec);
}
/* why SAVE waits or is greyed, as in the pH box: no connection, a command on its way, BrewScribe unable to take a
   reading, a figure it wouldn't take, or nothing given yet */
function rdSaveWhy(o) {
  const cant = phCant(o);
  if (st.link === "lost") return PAUSED;
  if (st.pend.ph) return st.pend.ph === "post" ? PH_WAIT : WAIT;
  if (st.pend.b) return WAIT;
  if (cant) return cant.why;
  const R = rdReads(o);
  if (R.bad) return R.bad;
  return R.list.length ? "" : `Give a reading first: type it, or step from ${rdStart(o)}.`;
}
/* SAVE's small line: what happens to the reminder. It closes once every asked reading is recorded; else it stays for
   what's still to come. With nothing given yet, as if every part shown were */
function rdGoSmall(o, R) {
  const given = new Set((R.list.length ? R.list.map(r => r.rd) : rdParts(o).parts).map(r => r.kind));
  const left = o.rds.filter(r => r.asked && !r.saved && !given.has(r.kind));
  return left.length ? `the reminder stays for the ${rdJoin(left.map(r => RD_NAME[r.kind]))}` : "closes the reminder too";
}
/* SAVE names what it sends: "SAVE 1.048 SG", "SAVE 6.40 gal", "SAVE pH 5.42", "SAVE 2 READINGS"; "SAVE – –" while
   nothing is given */
function rdGoHTML(o) {
  const R = rdReads(o), n = R.list.length;
  return b("cmdbtn phgo", st.pend.ph ? "SAVING…" : n === 0 ? "SAVE – –" : n === 1 ? `SAVE ${esc(R.list[0].text)}` : `SAVE ${n} READINGS`, rdGoSmall(o, R), {cmd: "ph:save", why: rdSaveWhy(o)});
}
/* RECORD's word says what the box takes, and its small line what BrewScribe has: "for BrewScribe"; once some of what
   the reminder asks for is recorded, what's still to come ("gravity to come"); once all of it is, the figure ("6.40
   gal recorded"), or "both recorded" */
function rdRecWord(o) {
  const asked = o.rds.filter(r => r.asked), k = (asked[0] || o.rds[0]).kind;
  return asked.length > 1 ? "RECORD READINGS" : k === "ph" ? "RECORD pH" : k === "gravity" ? "RECORD GRAVITY" : k === "volume" ? "RECORD VOLUME" : "RECORD LEVEL";
}
function rdRecSmall(o) {
  const asked = o.rds.filter(r => r.asked), left = asked.filter(r => !r.saved), r = asked[0];
  if (!asked.length || left.length === asked.length) return "for BrewScribe";
  if (left.length) return `${rdJoin(left.map(x => RD_NAME[x.kind]))} to come`;
  if (asked.length > 1) return asked.length === 2 ? "both recorded" : "all recorded";
  return `${RD_VOLS.includes(r.kind) ? rdHas(r.saved, o.A) : r.saved.text} recorded`;
}
/* what BrewScribe has for the stage already, in its words; for the level before the sparge, the level it keeps */
function rdHad(o) {
  const lv = rdOf(o, "level"), has = o.rds.filter(r => r.saved);
  if (lv && lv.saved) return `BrewScribe is keeping the ${o.rem.vessel || "HLT"}'s level before the sparge, ${rdHas(lv.saved, o.A)}. A new one here replaces it.`;
  if (!has.length) return "";
  return `BrewScribe has ${rdJoin(has.map(r => r.saved.text))} for ${o.rem.stage_name}. ${has.length > 1 ? "New readings here are kept as well, as the latest." : "A new reading here is kept as well, as the latest."}`;
}
/* the readings box: the pH box's anatomy, titled with the stage's name in capitals; for BrewScribe's log, the stage and
   vessel; what BrewScribe has for it; a part for each reading still to come, each figure with its label (the recipe's
   target at the right), its keys round it, a help line saying where they start, and a Note Amber line for what to
   check; the gravity's three pairs over its figure; the others a "+" away; what SAVE sends where it's more than one;
   the line for what went wrong; SAVE and CANCEL; and the way to BrewScribe's page. While SAVE waits, everything in it
   waits too */
function rdHTML(o) {
  const P = st.ph, {A, rem} = o, U = phUnit(A), vl = esc(A.volume_label || ""), ves = rem.vessel || "HLT";
  const why = st.pend.ph ? (st.pend.ph === "post" ? PH_WAIT : WAIT) : "", dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "", ro = why ? " readonly" : "";
  const key = (k, d, deg) => `<button type="button" data-cmd="ph:step:${k}:${d}" aria-label="${d < 0 ? "Down" : "Up"} ${Math.abs(d)}${deg ? " degree" : ""}"${dis}>${d < 0 ? "−" : "+"}${String(Math.abs(d)).replace(/^0\./, ".")}</button>`;
  const fig = (k, q) => {
    const F = rdField(o, k), id = k === "v" ? ["phin", "ph-l", "ph-tg", "ph-h"] : k === "t" ? ["phtin", "pht-l", "pht-tg", "pht-h"] : [`rd${k}`, `rd${k}-l`, `rd${k}-tg`, `rd${k}-h`];
    const w = k === "v" ? null : k === "t" ? "phw" : `rd${k}-w`, L = q.lines || [];
    const by = [q.tgt ? id[2] : "", id[3], ...L.map(l => l[1]), w || ""].filter(Boolean).join(" ");
    return `<div class="phsec"><p class="phlab"><label for="${id[0]}" id="${id[1]}">${q.lab}</label>${q.tgt ? `<span class="phtgt" id="${id[2]}">${esc(q.tgt)}</span>` : ""}</p>${q.top || ""}`
      + `<div class="editor phkeys" role="group" aria-labelledby="${id[1]}">${key(k, F.keys[0], F.temp)}${key(k, F.keys[1], F.temp)}`
      + `<input id="${id[0]}"${k === "v" || k === "t" ? "" : ` data-k="${k}"`} inputmode="decimal" autocomplete="off" maxlength="${F.unit === A.volume_label ? 7 : 6}" value="${esc(rdTxt(P, k))}" aria-describedby="${by}"${ro}>`
      + `${key(k, F.keys[2], F.temp)}${key(k, F.keys[3], F.temp)}</div><p class="phhelp" id="${id[3]}" data-live>${esc(q.help(F))}</p>`
      + L.map(l => `<p class="${l[0]}" id="${l[1]}" data-live>${esc(l[2])}</p>`).join("") + (w ? `<p class="phwarm" id="${w}" data-live>${esc(rdCheckLine(o, k))}</p>` : "") + "</div>";
  };
  const from = F => F.from.toFixed(F.dec), temp = k => fig(k, {lab: `Sample temperature, ${U}`, help: F => `If you took it: type it, or step from ${F.from} ${U}.`});
  /* each reading's part. Its target: a pH's is a plain number, shown as "recipe target 5.4", as in the pH box; every
     other kind's is an object whose text is shown as it is ("recipe OG 1.053") */
  const part = rd => {
    const k = rd.kind, tg = rd.target != null && typeof rd.target === "object" ? rd.target.text : "";
    let h;
    if (k === "ph") h = fig("v", {lab: "pH", tgt: typeof rd.target === "number" ? `recipe target ${+rd.target}` : tg, help: F => `From the meter, to ${F.dec} decimals: type it, or step from ${from(F)}.`}) + (rdTempOn(o, rd) ? temp("t") : "");
    else if (k === "gravity") {
      const c = rdPick(rd, P), C = rd.choices.map((x, i) => `<button type="button" role="radio" aria-checked="${x === c}" tabindex="${x === c ? 0 : -1}" data-cmd="ph:pick:${i}"${dis}><span class="lb">${esc(x.label)}</span><small>${esc(x.instrument)}</small></button>`).join("");
      h = fig("g", {lab: esc(rd.label), tgt: tg, top: `<div class="rdpick" role="radiogroup" aria-labelledby="rdg-l">${C}</div>`, help: F => rdGHelp(rd, F), lines: [["rdeq", "rdg-eq", rdAbout(o)]]}) + (rdTempOn(o, rd) ? temp("gt") : "");
    }
    else if (k === "volume") h = fig("vol", {lab: `${esc(rd.label)}, ${vl}`, tgt: tg, help: F => `In the ${rem.vessel || "kettle"}, as you read it: type it, or step from ${from(F)}.`});
    else if (k === "level") h = fig("lvl", {lab: `${esc(ves)} level, ${vl}`, tgt: tg, help: F => `Read it before the sparge pump starts: type it, or step from ${from(F)}.`});
    else if (P.way === "volume") h = fig("spv", {lab: `${esc(rd.label)}, ${vl}`, tgt: tg, help: F => `The water the sparge used: type it, or step from ${from(F)}.`})
      + b("rdq rdway", `USE THE ${esc(ves.toUpperCase())}'S LEVELS INSTEAD`, "", {cmd: "ph:way", why});
    else h = (rdKept(rd) ? `<p class="rdkept">Before the sparge: ${esc(ves)} ${esc(rdKept(rd).text)}, kept in BrewScribe.</p>`
        : fig("bef", {lab: `${esc(ves)} level before, ${vl}`, help: F => `As you read it before the sparge: type it, or step from ${from(F)}.`}))
      + fig("aft", {lab: `${esc(ves)} level after, ${vl}`, tgt: tg, help: F => `Read it now the sparge is done: type it, or step from ${from(F)}.`, lines: [["rdeq", "rdaft-eq", rdSpargeLine(o)]]})
      + b("rdq rdway", "TYPE THE SPARGE VOLUME INSTEAD", "", {cmd: "ph:way", why});
    return `<div class="rdpart" data-part="${k}">${h}</div>`;
  };
  const {parts, more} = rdParts(o, P), R = rdReads(o), had = rdHad(o);
  const also = !more.length ? "" : `<div class="rdalso" role="group" aria-labelledby="rd-also"><span id="rd-also">Also:</span>${more.map(r => b("rdq", RD_PLUS[r.kind], "", {cmd: `ph:add:${r.kind}`, why})).join("")}</div>`;
  return `<h2 class="pht" id="ph-t">${esc(rem.stage_name.toUpperCase())}</h2><p class="phfor">For BrewScribe's log: ${esc(rem.stage_name)}${rem.vessel ? `, ${esc(rem.vessel)}` : ""}.</p>`
    + (had ? `<p class="phhad">${esc(had)}</p>` : "")
    + `<div class="phmid">${parts.map(part).join("")}${also}</div>`
    + `<p class="rdsaves" id="rd-saves" data-live>${esc(R.list.length > 1 ? `Saves ${rdJoin(R.list.map(r => r.text))}.` : "")}</p>`
    + `<p class="note" id="ph-note">${esc(st.notes.ph || P.err || "")}</p>`
    + `<div class="phact">${rdGoHTML(o)}${b("cmdbtn", "CANCEL", "", {cmd: "ph:x", why})}</div>`
    + b("phpage", `ON BREWSCRIBE'S PAGE${EXT_ICON}<span class="sr"> (opens ${esc(rem.stage_name)} in BrewScribe's tab)</span>`, "", {cmd: "ph:page", why});
}
/* a key pressed: from the figure typed, or where the keys start while there is none, kept within what BrewScribe
   accepts; the new figure is said aloud, with what it questions or works out */
function rdStep(o, k, d) {
  const P = st.ph;
  if (!P.f || !rdParts(o, P).parts.some(rd => rdKeys(o, rd).includes(k))) return;
  const F = rdField(o, k), f = 10 ** F.dec;
  rdPut(P, k, Math.min(F.max, Math.max(F.min, Math.round(((phNum(rdTxt(P, k), F.dec) ?? F.from) + d) * f) / f)).toFixed(F.dec));
  const more = [rdCheckLine(o, k), k === "aft" || k === "bef" ? rdSpargeLine(o) : k === "g" ? rdAbout(o) : ""].filter(Boolean).join(" ");
  say(`${k === "v" ? `pH ${P.txt}` : `${rdTxt(P, k)} ${F.unit}`}${more ? `. ${more}` : ""}`);
  renderAll();
}
/* a gravity pair chosen: its figure empties, as a figure in one scale means something else in another; the sample's
   temperature stays. Said aloud */
function rdChoose(i) {
  const P = st.ph, o = P && phOwn(), rd = o && !o.ph ? rdOf(o, "gravity") : null, c = rd && rd.choices[i];
  if (!c || st.pend.ph) return;
  if (rdPair(c) !== P.pick) { P.pick = rdPair(c); if (P.f) P.f.g = ""; }
  say(`${c.label}, ${c.instrument}`);
  renderAll();
}
/* the arrow keys move the gravity's choice, as in any group of radio buttons, focus going with it */
function rdPickStep(dir) {
  const P = st.ph, o = P && phOwn(), rd = o && !o.ph ? rdOf(o, "gravity") : null;
  if (!rd || st.pend.ph) return;
  const n = rd.choices.length, j = (rd.choices.indexOf(rdPick(rd, P)) + dir + n) % n;
  rdChoose(j);
  if (root) $(`#ph-box [data-cmd="ph:pick:${j}"]`)?.focus();
}
/* "+ pH", "+ VOLUME": that reading's part in the button's place, focus in its figure */
function rdAdd(kind) {
  const P = st.ph, o = P && phOwn();
  if (!P || !P.add || !o || o.ph || !rdOf(o, kind) || st.pend.ph || P.add.includes(kind)) return;
  P.add.push(kind); renderAll();
  timers.push(setTimeout(() => { const i = root && $(`#ph-box [data-part="${kind}"] input`); if (i) i.focus(); }, 0));
}
/* TYPE THE SPARGE VOLUME INSTEAD, and back: one way or the other is sent, never both. What was typed the other way
   stays, for a change of mind. Focus goes to the way's first figure */
function rdWay() {
  const P = st.ph;
  if (!P || !P.f || st.pend.ph) return;
  P.way = P.way === "volume" ? "levels" : "volume"; renderAll();
  timers.push(setTimeout(() => { const i = root && $('#ph-box [data-part="sparge_water"] input'); if (i) i.focus(); }, 0));
}
/* what SAVE sends for these reminders (draft 5): the readings SAVE names, each with an entry_id. A reading sent again
   as it was keeps its entry_id, so a SAVE again after no answer saves nothing twice; a changed one gets a new one.
   what: its words for LOG, should it not be saved */
function rdBody(o) {
  const P = st.ph, R = rdReads(o), day = o.A.log ? o.A.log.day_id : null, sent = st.rdSent || {};
  const readings = R.list.map(r => {
    const key = rdKey(day, P.title, r.send), k = r.send.kind, id = sent[k] && sent[k].key === key ? sent[k].id : phUUID();
    sent[k] = {key, id};
    if (k === "sparge_water" && r.send.level_before == null) P.kept = rdKept(r.rd);
    return Object.assign({entry_id: id}, r.send);
  });
  st.rdSent = sent;
  return {body: {day_id: day, title: P.title, readings}, what: rdJoin(R.list.map(r => r.log || r.text))};
}
/* the entry_ids a moment's earlier SAVE sent (ids, by kind), for the readings as the box now has them */
function rdSentFor(o, ids) {
  const day = o.A.log ? o.A.log.day_id : null, sent = {};
  rdReads(o).list.forEach(r => { if (ids[r.send.kind]) sent[r.send.kind] = {key: rdKey(day, st.ph.title, r.send), id: ids[r.send.kind]}; });
  return sent;
}
/* SAVE done with something asked still to come: the box closes and the reminder stays, its RECORD saying what's to
   come; BrewScribe's sentence goes in LOG and is said aloud; focus back on RECORD. OK still closes it at any time */
function rdStays(text) {
  delete st.pend.ph; st.ph = null;
  logEvent(text, "confirmed", "ok");
  say(`${text}: confirmed`);
  renderAll();
  timers.push(setTimeout(() => { if (root) $('#banner [data-cmd="ph:open"]')?.focus({preventScroll: true}); }, 0));
}
/* every reading the reminder asks for recorded, in Brew Day's copy of BrewScribe's answer */
function rdDone(x) { const o = phOffer(x); return !o || o.ph || o.rds.filter(r => r.asked).every(r => r.saved); }
/* the demo's BrewScribe: why it refuses one reading of draft 5's body (400), in its words; "" when it takes it */
function rdRefuse(S, rem, r) {
  const rd = rem.readings.find(x => x.kind === r.kind), num = x => typeof x === "number" && Number.isFinite(x);
  if (!rd) return `BrewScribe takes no ${r.kind} reading for ${rem.title}`;
  if ((r.temperature != null) !== (r.temperature_unit != null)) return "Send the sample's temperature with its unit, or neither.";
  if (r.kind === "ph") return num(r.value) && r.value >= rd.min && r.value <= rd.max ? "" : `pH must be between ${rd.min} and ${rd.max}`;
  if (r.kind === "gravity") {
    const c = rd.choices.find(x => x.instrument === r.instrument && x.scale === r.scale);
    if (!c) return "Choose SG, °Bx or °P.";
    return num(r.value) && r.value >= c.min && r.value <= c.max ? "" : `${c.label} must be between ${c.min} and ${c.max}`;
  }
  if (!S.volume_unit) return "BrewScribe has no volume unit for this brew yet.";
  if (r.unit !== S.volume_unit) return `Send it in ${S.volume_label}, BrewScribe's unit for this brew.`;
  if (r.kind !== "sparge_water") return num(r.value) && r.value >= 0 ? "" : `${rd.label} must be 0 or more`;
  if (r.value != null && r.level_after != null) return "Send the HLT's level after the sparge or the sparge volume, not both.";
  if (r.level_after == null) return num(r.value) && r.value >= 0 ? "" : "Send the HLT's level after the sparge or the sparge volume.";
  const before = r.level_before ?? (rd.level_before ? rd.level_before.value : null);
  if (before == null) return "Give the HLT's level before the sparge too.";
  if (!num(r.level_after) || !num(before) || r.level_after < 0) return "The HLT's levels must be figures of 0 or more.";
  return r.level_after < before ? "" : "The HLT's level after the sparge should be lower than before it.";
}
/* the demo's BrewScribe taking draft 5's body, as its call does: all or nothing. A reading that reminder doesn't take,
   two of one kind, a pair it doesn't offer, a figure outside its range or levels it can't work from are a bad request
   (400), in its words; an entry_id saved with other figures, no log open, a log that isn't the open one any more or a
   vessel it can't tell are refused (409). The same readings again answer 200 and save nothing. Saved (201), each is the
   one standing in its stage */
function rdTake(b) {
  const S = st.bscribe, SM = st.scribeMock;
  if (!S) return [404, null];
  const rem = S.reminders.find(r => r.title === b.title), L = Array.isArray(b.readings) ? b.readings : [];
  if (!rem) return [400, {error: `BrewScribe takes no readings for ${b.title}`}];
  if (!L.length) return [400, {error: "Send at least one reading."}];
  if (new Set(L.map(r => r.kind)).size < L.length) return [400, {error: "Send one reading of each kind at most."}];
  for (const r of L) { const why = rdRefuse(S, rem, r); if (why) return [400, {error: why}]; }
  const keys = L.map(r => rdKey(b.day_id, b.title, Object.fromEntries(Object.entries(r).filter(([k]) => k !== "entry_id")))), said = SM.said || (SM.said = {});
  if (L.some((r, i) => SM.ids[r.entry_id] != null && SM.ids[r.entry_id] !== keys[i])) return [409, {error: "BrewScribe already has a different reading saved under this one's ID, so this one wasn't saved.", reason: "entry_id_reused"}];
  const ok = texts => ({day_id: b.day_id, stage: rem.stage, vessel: rem.vessel, saved: L.map((r, i) => ({entry_id: r.entry_id, kind: r.kind, text: texts[i]})), text: DEMO.rdSaid(rem, L[0].kind, texts)});
  if (L.every(r => SM.ids[r.entry_id] != null)) return [200, ok(L.map(r => said[r.entry_id]))];
  if (!S.log) return [409, {error: S.why_not, reason: "no_open_log"}];
  if (S.log.day_id !== b.day_id) return [409, {error: "BrewScribe's open log has changed, so this reading wasn't saved. Check BrewScribe's page, then try again.", reason: "log_changed"}];
  if (rem.vessel_problem) return [409, {error: `${rem.vessel_problem} This reading wasn't saved: record it on BrewScribe's page.`, reason: "vessel_unknown"}];
  return [201, ok(L.map((r, i) => { if (SM.ids[r.entry_id] == null) { SM.ids[r.entry_id] = keys[i]; said[r.entry_id] = DEMO.rdApply(S, b.title, r); } return said[r.entry_id]; }))];
}
function cmdLoad(i) {
  if (i !== 0) { renderAll(); return toast(`Mockup: only Test Recipe v5 is filled in here. On the real screen, LOAD sends ${M.BOOK[i].n} to Brew Steps, as the Recipe Book does today.`); }
  send("r:load", "load", `${M.BOOK[0].n} loaded`, () => { M.RECIPE = {...M.RECIPE, name: M.BOOK[0].n}; st.recipe = {state: "ready", cur: 0, left: 0, adds: []}; st.finished = false; });
}
/* LOAD from OTHER RECIPE's book: one LOADING… at the row pressed, the others greyed meanwhile; once CraftBeerPi has the
   recipe, the box closes and the column is the recipe, ready to start. Kettles, pumps and timers stay as they are. The
   strike water box goes with the recipe it was for: the demo has its numbers for v5's brew only */
function cmdLoad2(i) {
  const steps = i === 0 ? DEMO.RECIPE.steps : DEMO.BOOK_STEPS[i];
  if (!steps) { renderAll(); return toast(`Mockup: ${M.BOOK[i].n} isn't filled in here. On the real screen, LOAD sends it to Brew Steps.`); }
  send("r:load", String(i), `${M.BOOK[i].n} loaded`, () => {
    st.swd = null;
    M.RECIPE = {...M.RECIPE, name: M.BOOK[i].n, steps: steps.map(s => ({...s}))};
    st.recipe = {state: "ready", cur: 0, left: 0, adds: []};
    st.finished = false; st.rbOpen = false; st.cmpOpen = false;
  });
}
/* ALL OFF: stop the recipe first so it can't switch a kettle back on, then every vessel to MANUAL,
   then both elements and both pumps off */
function cmdAllOff() {
  const running = st.recipe && st.recipe.state === "running";
  const cav = Object.keys(M.ACT).filter(id => M.ACT[id].override).map(id => `${M.ACT[id].name}'s override switch can still run it`).join(" · ");
  st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false; st.edit = null;
  send("alloff", "off", `ALL OFF: elements and pumps off, every vessel MANUAL${running ? ", recipe stopped" : ""}`, () => {
    if (running) st.recipe.state = "stopped";
    ["hlt", "mt", "bk"].forEach(v => { if (st.v[v].mode === "auto") setMode(v, "manual"); });
    Object.keys(M.ACT).forEach(id => setActor(id, false));
    if (st.banner && /^act:/.test(st.banner.cmd || "")) st.banner = null;
  }, cav);
}
/* one rest timer, kept by CraftBeerPi, so the monitor and the phone show the same one */
function cmdTimer(x) {
  const t = st.timer;
  if (x === "go") {
    if (t.running) send("tm", "pause", `Rest timer paused, ${mmss(t.left)} to go`, () => { t.running = false; });
    else if (t.left > 0) send("tm", "start", `Rest timer started, ${mmss(t.left)} to go`, () => { t.running = true; });
    return;
  }
  t.left = Math.min(5 * 3600, Math.max(60, t.left + parseInt(x, 10)));
  renderAll();
}

/* ---------- live commands: sent to CraftBeerPi ---------- */
// The mockup's send(), for real: the button says "switching…" until CraftBeerPi answers, then the event line
// says "confirmed", or "failed" and why. o.ok and o.fail run before the screen is drawn again.
async function exec(key, dir, label, request, o = {}) {
  if (st.pend[key]) return null;
  const g = gen;
  st.pend[key] = dir; renderAll();
  let res;
  try { res = await request(); } catch (e) { res = {ok: false, status: 0, error: "network"}; }
  if (g !== gen) return res;
  delete st.pend[key];
  /* CraftBeerPi refused it for a reason the command says in its own words (o.refused: true when it has): neither
     "confirmed" nor "failed" */
  if (!res.ok && o.refused && o.refused(res)) {
    if (last) applyLive(last);
    renderAll();
    return res;
  }
  if (res.ok) {
    if (o.ok) o.ok(res);
    if (!o.quiet) {
      logEvent(label, "confirmed", "ok", o.cav || "");
      say(label + ": confirmed" + (o.cav ? `. ${o.cav[0].toUpperCase()}${o.cav.slice(1)}.` : ""));
    }
  } else {
    // o.why: the reason in the command's own words, when it has them for this answer (a timer's UNDO refused)
    const w = (o.why && o.why(res)) || failWhy(res);
    logEvent(label, "failed: " + w, "bad");
    say(`${label}: failed, ${w}.`, true);
    if (o.fail) o.fail(res, w);
  }
  if (last) applyLive(last);
  renderAll();
  return res;
}
const expect = (key, value) => { st.expect[key] = {value, until: Date.now() + EXPECT_MS}; };
const alarm = (text, act, cmd) => { st.alarm = {tone: "alarm", title: "Command failed", text, act, cmd, fresh: true}; };
function liveAct(id) {
  const A = M.ACT[id], a = st.a[id];
  if (!A.id) return;
  const want = a.failed ? a.failed === "on" : !a.on;
  exec("a:" + id, want ? "on" : "off", actLabel(id, want), () => api.actor(A.id, want), {
    cav: !want && A.override ? "its override switch can still run it" : "",
    ok: () => {
      delete st.fail[id]; expect("a:" + id, want);
      if (st.alarm && st.alarm.cmd === "act:" + id) st.alarm = null;
    },
    fail: () => {
      st.fail[id] = want ? "on" : "off";
      const still = want ? "off" : A.kind === "pump" ? "running" : "heating";
      // heat is not switched on from the title bar: the button itself takes a held press
      if (want && A.kind === "heat") alarm(`${A.name} did not switch on. It is still off. Hold its button to try again.`, "OK", "b:ok");
      else alarm(`${A.name} did not switch ${want ? "on" : "off"}. It is still ${still}.`, "TRY AGAIN", "act:" + id);
    }
  });
}
function liveMode(v, m) {
  const k = M.K[v], auto = m === "auto";
  if (!k) return;
  exec("m:" + v, m, `${M.VNAME[v]} ${m.toUpperCase()}`, async () => {
    // The mash tun's HERMS drives the HLT element; the HLT's own AUTO would fight it, so it stops first,
    // as in the mockup. (CraftBeerPi only warns when two logics share a heater.)
    if (auto && v === "mt" && M.HERMS && M.K.hlt && st.v.hlt.mode === "auto") {
      const r = await api.kettle(M.K.hlt.id, false);
      if (!r.ok) return r;
      expect("m:hlt", false);
    }
    return api.kettle(k.id, auto);
  }, {
    ok: () => expect("m:" + v, auto),
    fail: () => auto
      ? alarm(`The ${M.VNAME[v].toLowerCase()} did not switch to AUTO. It is still MANUAL. Hold AUTO to try again.`, "OK", "b:ok")
      : alarm(`The ${M.VNAME[v].toLowerCase()} did not switch to MANUAL. Its AUTO may still be running.`, "TRY AGAIN", `mode:${v}:manual`)
  });
}
function liveTarget(v, val, label, cav = "") {
  const k = M.K[v];
  if (!k) return renderAll();
  // what it was, in the words the faceplate used: the new boil kettle's target is BOIL or a hold
  const was = st.v[v].sv, wasText = bkNew(v) && !(was > 0 && was < bkLetGo()) ? "BOIL" : `${f1(was)} ${M.U}`;
  exec("t:" + v, "set", label || `${M.VNAME[v]} target ${val.toFixed(1)} ${M.U}`, () => api.target(k.id, val), {
    cav,
    ok: () => expect("t:" + v, val),
    fail: () => alarm(`The ${M.VNAME[v].toLowerCase()} target did not change. It is still ${wasText}.`, "OK", "b:ok")
  });
}
// The boil power button's command. CraftBeerPi answers both with "done" whatever happened: BoilPower refuses a level it
// can't use with a warning and keeps its own, and set_power only logs a failure. So what counts is the level CraftBeerPi
// holds afterwards, which every page is sent as soon as it changes. dir: which button waits, the box's SET or −5 %/+5 %.
function livePower(boil, val, was, label, cav, dir = "set") {
  const k = M.K.bk, id = M.ACT.bkEl.id;
  if (boil ? !k : !id) return renderAll();
  const holds = () => {
    const s = last || {};
    if (boil) {
      const x = (s.kettles || []).find(q => q && q.id === k.id);
      return !!x && Math.round(num(x.props && x.props.Boil_Power) ?? NaN) === val;
    }
    const a = (s.actors || []).find(q => q && q.id === id);
    return !!a && Math.round(num(a.manual_power ?? a.power) ?? NaN) === val;
  };
  exec("p:bk", dir, label, async () => {
    const res = await (boil ? api.kettleAction(k.id, "set_boil_power", {Boil_Power: val}) : api.power(id, val));
    if (!res.ok) return res;
    for (let i = 0; i < 30 && !holds(); i++) await new Promise(r => setTimeout(r, 100));
    return holds() ? res : {ok: false, status: res.status, data: null, error: "kept"};
  }, {
    cav,
    fail: () => alarm(`The ${boil ? "boil power" : "boil element's power"} did not change. It is still ${was} %.`, "OK", "b:ok")
  });
}
/* The new BoilPower's other settings, sent as kettle actions as the boil power is, and for the same reason confirmed only
   once CraftBeerPi holds the new setting (BoilPower refuses a value it can't use with a warning and keeps its own). */
const bkProps = () => {
  const x = ((last || {}).kettles || []).find(q => q && M.K.bk && q.id === M.K.bk.id);
  return (x && x.props) || {};
};
const yes = (x, dflt) => { const s = String(x ?? "").trim().toLowerCase(); return s ? s === "yes" : dflt; };
function liveSetting(key, dir, label, action, param, holds, o) {
  const k = M.K.bk;
  if (!k) return renderAll();
  exec(key, dir, label, async () => {
    const res = await api.kettleAction(k.id, action, param);
    if (!res.ok) return res;
    for (let i = 0; i < 30 && !holds(bkProps()); i++) await new Promise(r => setTimeout(r, 100));
    return holds(bkProps()) ? res : {ok: false, status: res.status, data: null, error: "kept"};
  }, o);
}
function liveBoilAt(val, was, label, cav) {
  liveSetting("t:bk", "set", label, "set_boil_at", {Boil_Threshold: val}, p => Math.abs((num(p.Boil_Threshold) ?? NaN) - val) < 0.05, {
    cav, fail: () => alarm(`The boil kettle's boil temperature did not change. It still boils at ${was.toFixed(1)} ${M.U}.`, "OK", "b:ok")
  });
}
function liveKeep(want, label, cav) {
  liveSetting("k:bk", want ? "on" : "off", label, "set_keep_boiling", {Keep_Boiling: want ? "Yes" : "No"}, p => yes(p.Keep_Boiling, true) === want, {
    cav, ok: () => expect("k:bk", want),
    fail: () => alarm(`Keep boiling did not change. It is still ${want ? "off" : "on"}.`, "OK", "b:ok")
  });
}
function livePause(on, label) {
  const name = M.ACT.bkEl.name;
  liveSetting("a:bkEl", on ? "pause" : "resume", label, "set_paused", {Paused: on ? "Yes" : "No"}, p => yes(p.Paused, false) === on, {
    ok: () => expect("z:bk", on),
    fail: () => alarm(on ? `${name} did not pause. It is still heating.` : `${name} did not carry on. The heat is still paused: hold PAUSED to try again.`, "OK", "b:ok")
  });
}
function liveStart(force, cav = "") {
  /* a recipe not begun is checked first (pbRun); START ANYWAY, the check passed, or no check on this CraftBeerPi, comes
     back here with force */
  if (!force && pbFresh()) return pbRun();
  const r = st.recipe, s = r && M.RECIPE.steps[r.cur];
  /* the recipe this START is for: the one its hold began on (heldOn), or, for a check that passed, the one START was
     held on (st.pbFor). Its steps go with the start, so CraftBeerPi (core 4.7.7.post46) starts only those, and none
     already running: a recipe loaded or started on another screen just before, whose news hasn't reached this screen
     yet, is refused there (startRefused). An older CraftBeerPi ignores them */
  const on = heldOn || (force && st.pbFor) || recipeOn();
  st.confirmReset = false; st.confirmUnload = false;
  own.start = {at: Date.now(), ids: s ? [s.id] : []};
  exec("r:start", "start", "Recipe started", () => api.start(on.ids), {cav, refused: res => startRefused(res, on),
    fail: () => alarm("The recipe did not start.", "OK", "b:ok")});
}
/* CraftBeerPi refused the start (409) because its steps aren't the ones this START was held on any more (recipe_changed),
   or one of them already runs (already_running): what this screen does when it sees that change itself (pbEnd).
   Nothing started, so no LOG line; the words come from CraftBeerPi's answer, as this screen hasn't heard of the change:
   no steps, unloaded; the same name, the recipe changed; another, another recipe loaded */
function startRefused(res, on) {
  const d = res && res.status === 409 && res.data && typeof res.data === "object" ? res.data : null;
  if (!d || (d.error !== "recipe_changed" && d.error !== "already_running")) return false;
  own.start = null;
  delete st.pend["r:check"]; st.pbOpen = false;
  const steps = Array.isArray(d.steps) ? d.steps : [];
  lostSay(d.error === "already_running" ? "started" : steps.length ? "loaded" : "cleared", on, String(d.name || "") || "Brew steps");
  return true;
}
function liveStop() {
  st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false;
  own.stop = Date.now();
  exec("r:stop", "stop", "Recipe stopped", api.stop, {fail: () => alarm("The recipe did not stop. It may still be running.", "TRY AGAIN", "r:stop")});
}
/* RESET TO STEP 1, for real: confirmed from the steps, as the boil power is from what CraftBeerPi holds. CraftBeerPi
   refuses a reset while a step runs (409; an older one answers 200 all the same), and another screen's START can bring
   that about after the question opened. So after its answer, up to 3 s for every step to read I */
function liveReset() {
  st.confirmReset = false;
  own.reset = Date.now();
  const waiting = () => { const S = ((last || {}).steps || []).filter(Boolean); return S.length > 0 && S.every(s => s.status === "I"); };
  exec("r:reset", "reset", "Recipe reset to step 1", async () => {
    const res = await api.reset();
    if (!res.ok) return res;
    for (let i = 0; i < 30 && !waiting(); i++) await new Promise(r => setTimeout(r, 100));
    return waiting() ? res : {ok: false, status: res.status, data: null, error: "kept"};
  }, {fail: () => alarm("The recipe was not reset. A step may be running.", "OK", "b:ok")});
}
/* UNLOAD, for real: CraftBeerPi's clear (POST /step2/clear), confirmed once the steps are gone, as RESET is from the
   steps: up to 3 s after its answer. While a step runs CraftBeerPi refuses it (409 step_running), which only a screen
   that hadn't caught up meets: nothing changes, so nothing is logged here; its sentence, the answer's detail, shows
   under the buttons for 6 s, as on the recipe pages, and its own notice of it goes in LOG as its others do. No answer,
   or another error, is a failed command, whose alarm's TRY AGAIN sends it again without asking again; an answer that
   comes after all, the steps gone, takes the alarm down (applyLive) */
function liveUnload() {
  const name = M.RECIPE.name;
  st.confirmUnload = false;
  own.unload = Date.now();
  const gone = () => !((last || {}).steps || []).some(Boolean);
  exec("r:unload", "unload", `${name} unloaded: Brew Day is brewing by hand`, async () => {
    const res = await api.clear();
    if (!res.ok) return res;
    for (let i = 0; i < 30 && !gone(); i++) await new Promise(r => setTimeout(r, 100));
    return gone() ? res : {ok: false, status: res.status, data: null, error: "kept"};
  }, {
    refused: res => {
      const d = res && res.status === 409 && res.data && typeof res.data === "object" ? res.data : null;
      if (!d || d.error !== "step_running") return false;
      const words = String(d.detail || "").trim() || `${d.step || "A step"} is running. Stop it before unloading the recipe.`;
      note("r", words); say(words);
      return true;
    },
    fail: () => alarm(`${name} did not unload. It is still loaded.`, "TRY AGAIN", "r:unload-yes")
  });
}
function liveNext() {
  const r = st.recipe, nx = r && M.RECIPE.steps[r.cur + 1];
  st.confirmNext = false;
  if (!nx) return renderAll();
  own.next = {at: Date.now(), ids: [M.RECIPE.steps[r.cur].id, nx.id]};
  exec("r:next", "next", `Skipped to ${nx.n}`, api.next, {fail: () => alarm(`The recipe did not move on to ${nx.n}.`, "OK", "b:ok")});
}
function livePrompt(nid, aid) {
  const p = st.prompts.find(q => String(q.id) === nid);
  if (!p) return renderAll();
  const a = (p.action || []).find(q => String(q.id) === aid);
  // answered here already counts from the press (below), so taking it down here is all that's left
  const done = () => { if (opts.removeAlert) opts.removeAlert(p.id); };
  // a SpargeStep's Sparge started says what it starts, and its flag turning true isn't logged a second time (observe)
  const r = st.recipe, s = r && M.RECIPE.steps[r.cur];
  const sparge = !!(s && s.type === "SpargeStep" && String(p.title || "") === s.n && a && /^sparge started$/i.test(String(a.label || "").trim()));
  if (sparge) own.sparge = {at: Date.now(), id: s.id};
  /* answered here from the press, as a timer's alarm is: CraftBeerPi takes the question down on every page, this one
     too, and that can come before its answer to the press, when observe() would log it as answered on another screen */
  if (!st.pend.b) answered.add(nid);
  exec("b", `p:${nid}:${aid}`, sparge ? spargeStartedLine(s) : `${p.title} answered: ${a ? a.label : "OK"}`, () => api.answer(nid, aid), {
    ok: done,
    // 400: CraftBeerPi no longer waits for it (answered elsewhere, or withdrawn)
    fail: res => {
      if (res.status === 400) return done();
      answered.delete(nid);
      alarm(`${p.title}: your answer did not reach CraftBeerPi.`, "TRY AGAIN", `p:${nid}:${aid}`);
    }
  });
}
/* LOAD, live: the Recipe Book's own (POST /recipe/{file}/brew). From OTHER RECIPE's book (box) the row pressed says
   LOADING… and the others wait, and the box closes once CraftBeerPi has the recipe; the column is then the new one */
function liveLoad(i, box = false) {
  const x = M.BOOK[i];
  if (!x) return;
  own.load = Date.now();
  exec("r:load", box ? String(i) : "load", `${x.n} loaded`, () => api.brew(x.file), {ok: () => { if (box) { st.rbOpen = false; st.cmpOpen = false; } }, fail: () => alarm(`${x.n} did not load.`, "OK", "b:ok")});
}
/* ALL OFF: the recipe stops first so it can't switch a kettle back on, then every kettle to
   MANUAL, then both elements and both pumps. Kettle /off always answers 204, so what counts is the state
   CraftBeerPi reports a moment later. */
async function liveAllOff() {
  if (st.pend.alloff) return;
  const g = gen, running = st.recipe && st.recipe.state === "running";
  const cav = Object.keys(M.ACT).filter(id => M.ACT[id].id && M.ACT[id].override).map(id => `${M.ACT[id].name}'s override switch can still run it`).join(" · ");
  st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false; st.edit = null;
  st.pend.alloff = "off"; renderAll();
  const failed = [];
  if (M.RECIPE.steps.some(s => s.status === "A")) {
    own.stop = Date.now();
    if (!(await api.stop()).ok) failed.push("the recipe");
  }
  const kettles = ROLES.filter(v => M.K[v]);
  (await Promise.all(kettles.map(v => api.kettle(M.K[v].id, false)))).forEach((r, i) => { if (!r.ok) failed.push(`${M.VNAME[kettles[i]].toLowerCase()} AUTO`); });
  const ids = ACTS.filter(id => M.ACT[id].id), seen = new Set();
  const uniq = ids.filter(id => !seen.has(M.ACT[id].id) && seen.add(M.ACT[id].id));
  (await Promise.all(uniq.map(id => api.actor(M.ACT[id].id, false)))).forEach((r, i) => { if (!r.ok) failed.push(M.ACT[uniq[i]].name); });
  await new Promise(res => setTimeout(res, 1500));
  if (g !== gen) return;
  if (last) applyLive(last);
  ACTS.forEach(id => { if (st.a[id].on && M.ACT[id].id && !failed.includes(M.ACT[id].name)) failed.push(M.ACT[id].name); });
  ROLES.forEach(v => { if (st.v[v].mode === "auto" && !failed.includes(`${M.VNAME[v].toLowerCase()} AUTO`)) failed.push(`${M.VNAME[v].toLowerCase()} AUTO`); });
  delete st.pend.alloff;
  const label = `ALL OFF: elements and pumps off, every vessel MANUAL${running ? ", recipe stopped" : ""}`;
  if (!failed.length) {
    ACTS.forEach(id => { if (st.fail[id] === "off") delete st.fail[id]; });
    if (st.alarm && /^(act:|alloff|mode:)/.test(st.alarm.cmd || "")) st.alarm = null;
    logEvent(label, "confirmed", "ok", cav);
    say(label + ": confirmed" + (cav ? `. ${cav[0].toUpperCase()}${cav.slice(1)}.` : ""));
  } else {
    logEvent("ALL OFF", `failed: still on: ${failed.join(", ")}`, "bad");
    st.alarm = {tone: "alarm", title: "ALL OFF incomplete", text: `Still on: ${failed.join(", ")}.`, act: "TRY AGAIN", cmd: "alloff", fresh: true};
    say(`ALL OFF failed. Still on: ${failed.join(", ")}.`, true);
  }
  if (last) applyLive(last);
  renderAll();
}
function liveTimer(x) {
  const t = st.timer, fail = (res, w) => note("r", `The rest timer did not answer: ${w}.`);
  if (x === "go") {
    if (t.running) exec("tm", "pause", `Rest timer paused, ${mmss(t.left)} to go`, api.timerPause, {fail});
    else if (t.left > 0) exec("tm", "start", `Rest timer started, ${mmss(t.left)} to go`, api.timerStart, {fail});
    else note("r", "The rest timer is at 0:00. Add time with +5 MIN first.");
    return;
  }
  const s = parseInt(x, 10);
  exec(s > 0 ? "tm:up" : "tm:down", "add", `Rest timer ${s > 0 ? "plus" : "minus"} ${Math.abs(s) / 60} min`, () => api.timerAdd(s), {quiet: true, fail});
}

/* ---------- the timers ----------
   Several timers at once, each with a name, an alarm that can sound and an alert that draws the eye when it runs out.
   The mockup's (?timers=new), modelled on a four-channel kitchen timer (ThermoWorks TimeStack): all four in view, a
   finished one pulses and counts up until it is answered, and OK puts it back to its own time, ready to start again.
   CraftBeerPi keeps them on its brewing clock, so every screen shows the same ones, during a recipe as well as by hand.
   SOUND belongs to each screen: its timers and CraftBeerPi's alerts. */
const tById = id => st.tmrs.find(t => t.id === id);
/* a timer's alarm is over (answered, or the timer set anew or removed): in the demo its prompt goes, and the next one
   waiting takes the title bar at the next second; set anew or removed, CraftBeerPi takes the alarm down unanswered, so
   its line says "no longer needed". Live, CraftBeerPi withdraws the prompt and observe() changes the line */
function tAnswered(t, res = "answered") { delete t.at; delete t.interrupted; questionGone(t.name, res); if (st.banner && st.banner.timer === t.id) st.banner = null; }
const tPct = t => t.run ? Math.round(100 * (1 - t.left / t.run)) : 0;
// how long ago a timer ran out: on the demo's clock, or CraftBeerPi's brewing clock. For one brought back after a restart,
// CraftBeerPi tells only once its clock can be trusted (tOff); until then its row shows "– –" in place of the count
const tUpKnown = t => DEMO_MODE ? t.at != null : t.up != null;
const tUp = t => Math.max(0, DEMO_MODE ? st.t - t.at : t.up);
const tUpText = t => tUpKnown(t) ? "+" + tfmt(tUp(t)) : "– –";
/* a timer CraftBeerPi brought back when it started again (a power cut, say): one that was counting down comes back paused,
   one that had run out still run out. Until it is started or answered, a line across its row says how long CraftBeerPi was
   off, or, while CraftBeerPi can't tell, that it isn't known yet: a Raspberry Pi with no clock board starts with a wrong
   time after a power cut, until the network sets it */
const offFor = s => {
  if (s < 59.5) return `${Math.max(1, Math.round(s))}\u00a0s`;
  const m = Math.round(s / 60), h = Math.floor(m / 60);
  return nb(m < 60 ? `${m} min` : h >= 48 ? `${Math.round(m / 1440)} days` : m % 60 ? `${h} h ${m % 60} min` : `${h} h`);
};
const tBack = t => !!t.interrupted && (t.state === "paused" || t.state === "done");
const tOff = t => t.off == null ? "CraftBeerPi was off; how long isn't known yet" : `CraftBeerPi was off for ${offFor(t.off)}`;
/* two timers never share a name (whatever its capitals): their alarms, titled with it, would be hard to tell apart */
const tTwin = (name, t) => st.tmrs.find(z => z !== t && z.name.toLowerCase() === name.toLowerCase());
const tTwinWhy = n => `Another timer is already called ${n}. Give this one another name, so you can tell their alarms apart.`;
function tDefaultName() { let n = st.tmrs.length + 1; while (tTwin(`Timer ${n}`)) n++; return `Timer ${n}`; }
function timersHTML() {
  /* on one screen the timers are beside the drawing (tsideHTML), not in the column */
  if (tHere() !== "col") return "";
  const off = st.link === "lost" ? PAUSED : "", T = st.tmrs, e = st.tedit;
  const rows = T.map(t => trowHTML(t, off) + (e && e.id === t.id ? teditHTML(off) : ""));
  /* a timer just removed keeps its place for TUNDO seconds, with UNDO where its buttons were (tgoneHTML). While its REMOVE is on
     its way, a CraftBeerPi that has already said it's gone still has its row here, REMOVING…, so nothing below moves */
  const g = st.tgone;
  if (g && !(g.sending && T.some(t => t.id === g.t.id))) rows.splice(Math.min(g.idx, rows.length), 0, g.sending ? trowHTML(g.t, off) : tgoneHTML(g, off));
  /* + TIMER in the heading, beside SOUND, rather than a row of its own under the timers: it costs the step list nothing.
     A new timer's editor still opens at the end of the list, where the timer will be. While an editor is open it is
     greyed and says why (one editor at a time) */
  const plus = tplusHTML(off, "tplus2");
  return `<section class="tmrs" id="tmrs" aria-labelledby="tmrs-h"${e ? " data-editing" : ""}><div class="thead"><h3 id="tmrs-h">Timers</h3><div class="thr">${soundHTML()}${plus}</div></div>${rows.join("")}${e && e.id == null ? teditHTML(off) : ""}<p class="note">${esc(st.notes.t || "")}</p></section>`;
}
/* a timer just removed, for TUNDO seconds: its row keeps its place and height, so the timers under it don't move under a reaching
   hand, and UNDO takes the place of both its buttons, so a second tap on REMOVE puts it back rather than reaching
   anything else. Then the row goes. Only on the screen where REMOVE was pressed: other screens simply lose the timer */
function tgoneHTML(g, off) {
  const p = st.pend["t:" + g.t.id];
  const undo = b("cmdbtn tundo", p ? "SENDING…" : "UNDO", "put it back", {cmd: `tm2:undo:${g.t.id}`, label: p ? "" : `Undo: put ${g.t.name} back`, why: off || (p ? WAIT : "")});
  return `<div class="trow tgone" data-state="gone" id="tr-${g.t.id}" role="group" aria-label="${esc(g.t.name)} removed"${g.h ? ` style="min-height:${g.h}px;--tw:${g.w}px"` : ""}><p class="tgn"><span class="tn">${esc(g.t.name)}</span><span class="ts">removed</span></p><div class="tbtn">${undo}</div></div>`;
}
/* a timer's row: its name and state, its time large, and its buttons. Its left part opens its editor. run: this countdown's
   length (its own time, as −1 MIN and +1 MIN left it), for "of" and the bar. "of 20:00" stays whole, so a narrow
   row wraps "PAUSED ·" over "of 20:00". A timer brought back after a restart has its own line across the row, under the
   name and state, saying how long CraftBeerPi was off; the button's label ends with it, so the line is hidden from screen
   readers */
function trowHTML(t, off) {
  const p = st.pend["t:" + t.id], why = off || (p ? WAIT : ""), done = t.state === "done", run = t.state === "running", live = run || t.state === "paused";
  const time = done ? tUpText(t) : tfmt(t.left), back = tBack(t);
  const of = `<span class="nw">of ${tfmt(t.run)}</span>`;
  const sub = done ? "TIME'S UP" : run ? of : live ? `<span class="nw">PAUSED ·</span> ${of}` : "ready";
  const said = tSaid(t);
  // while its time or name is being changed, START or PAUSE waits without saying it is starting or pausing
  const btn = done ? b("cmdbtn tok", p === "ok" ? "SENDING…" : "OK", "stops the alarm", {cmd: `tm2:ok:${t.id}`, why})
    : b("cmdbtn", p === "start" ? "STARTING…" : p === "pause" ? "PAUSING…" : run ? "PAUSE" : "START", t.state === "paused" ? "carry on" : "", {cmd: `tm2:go:${t.id}`, why});
  const open = !!(st.tedit && st.tedit.id === t.id);
  /* two lines, the name and its state over the time and two buttons. REMOVE sits beside START or PAUSE in every state but
     a run-out one, always in the same place; START or PAUSE keeps the far right, where it was. A run-out timer has OK
     across the row. While its editor is open the timer keeps the one-line row, with START or PAUSE only:
     the editor fits a 1180 × 860 window with nothing to spare, and REMOVE is back when it closes */
  if (!done && !open) {
    const rm = b("cmdbtn trm", p === "rm" ? "REMOVING…" : "REMOVE", "", {cmd: `tm2:rm:${t.id}`, label: p === "rm" ? "" : `Remove ${t.name}`, why});
    return `<div class="trow tr2" data-state="${t.state}" id="tr-${t.id}"><button type="button" class="tsel" data-cmd="te:open:${t.id}" aria-expanded="false" aria-label="${esc(said)}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${sub}</span><span class="tt" id="tt-${t.id}">${time}</span></button>${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}<div class="tbtn">${rm}${btn}</div>${live ? `<span class="bar"><i id="tb-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
  }
  return `<div class="trow${open ? " editing" : ""}" data-state="${t.state}" id="tr-${t.id}"><button type="button" class="tsel" data-cmd="te:open:${t.id}" aria-expanded="${open}" aria-label="${esc(said)}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${sub}</span><span class="tt" id="tt-${t.id}">${time}</span></button>${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}<div class="tbtn">${btn}</div>${live ? `<span class="bar"><i id="tb-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
}
/* the names to pick, under NAME: the names in BREWDAY_TIMER_NAMES as buttons, in the setting's order, three to a row (two
   on a phone, where the page scrolls), the first six (two rows: the editor then still fits a 1920×950 screen). A tap names
   the timer, a second tap clears it; typing any other name still works. A name another timer has is greyed, and a tap
   says why. Nothing is filled in: a timer nobody names is "Timer 3", as on the server. The buttons carry their place in
   the list, not the name, so a name with a colon or quote can't break the command */
function namesHTML(e, t) {
  const all = st.names;
  if (!all.length) return `<p class="tnote">No names to pick: BREWDAY_TIMER_NAMES in Settings is blank.</p>`;
  const btns = all.slice(0, TNMAX).map((n, i) => {
    const twin = tTwin(n, t);
    return b("cmdbtn", esc(n.toUpperCase()), "", {cmd: `te:pick:${i}`, pressed: !twin && e.name === n, label: n, why: twin ? tTwinWhy(twin.name) : ""});
  }).join("");
  return `<div class="tsug" role="group" aria-label="Names to pick">${btns}</div>`;
}
/* a stopped or new timer's own time in its editor: MINUTES (0 to 300) and SECONDS (0 to 59) side by side, so a timer can
   be minutes and seconds, or seconds only. Each box keeps what was typed in it (e.mt, e.st) until a key or a preset sets
   the time again (teSet); a blank box counts as 0. The time they make is at least a second and at most 300 minutes:
   anything else greys START, SAVE and SET, which say why (teTime) */
const teText = e => ({m: e.mt ?? String(Math.floor(e.set / 60)), s: e.st ?? String(e.set % 60)});
function teNums(e) {
  const x = teText(e), n = v => /^\s*\d*\s*$/.test(v) ? Number(v) || 0 : null;
  return {m: n(x.m), s: n(x.s)};
}
function teTime(e) {
  const {m, s} = teNums(e);
  if (m == null || m > TMINS) return {why: `Minutes are a whole number from 0 to ${TMINS}.`};
  if (s == null || s > 59) return {why: "Seconds are a whole number from 0 to 59."};
  if (m * 60 + s > TMINS * 60) return {why: `${TMINS} minutes is the longest a timer can be.`};
  if (!m && !s) return {why: "A timer needs at least 1 second."};
  return {set: m * 60 + s, why: ""};
}
function teSet(e, set) { e.set = set; delete e.mt; delete e.st; }
/* the minutes' keys change the minutes and keep the seconds (to 300:00 at most); the seconds' keys take TSECS seconds off
   or add them, into the minutes past 0:55 or under 1:00. The presets are whole minutes: each sets the seconds to 0, and
   is pressed while the time is exactly its minutes */
function teTimeHTML(e, tm) {
  const x = teText(e);
  return `<div class="ttime"><div class="tfield tmin"><label for="tmin">Minutes</label>${b("cmdbtn", "−1", "", {cmd: "te:step:-1", label: "One minute less"})}<input id="tmin" type="text" inputmode="numeric" maxlength="3" autocomplete="off" value="${esc(x.m)}">${b("cmdbtn", "+1", "", {cmd: "te:step:1", label: "One minute more"})}</div><div class="tfield tsec"><label for="tsec">Seconds</label>${b("cmdbtn", `−${TSECS}`, "", {cmd: `te:sec:-${TSECS}`, label: `${TSECS} seconds less`})}<input id="tsec" type="text" inputmode="numeric" maxlength="2" autocomplete="off" value="${esc(x.s)}">${b("cmdbtn", `+${TSECS}`, "", {cmd: `te:sec:${TSECS}`, label: `${TSECS} seconds more`})}</div></div>
      <div class="tpre" role="group" aria-label="Minutes">${TPRE.map(m => b("cmdbtn", String(m), "", {cmd: `te:min:${m}`, pressed: tm.set === m * 60, label: `${m} minutes`})).join("")}</div>`;
}
/* the editor drawn again in place as its time is typed: the presets and the greyed START, SAVE or SET follow the boxes,
   and the box being typed in keeps what it has and its caret (patchNode) */
function tePatch() {
  const el = $(".tedit");
  if (!el || !st.tedit) return;
  const n = document.createElement("template");
  n.innerHTML = teditHTML(st.link === "lost" ? PAUSED : "");
  if (n.content.firstElementChild) patchNode(el, n.content.firstElementChild);
}
/* one editor at a time, in place: under its timer, or where + TIMER was for a new one. A running or paused timer's time
   changes by a minute at once, as the boil power's nudges do; a stopped one is set and then saved */
function teditHTML(off) {
  const e = st.tedit, t = e.id != null ? tById(e.id) : null, live = !!t && (t.state === "running" || t.state === "paused");
  const pT = st.pend["t:" + (t ? t.id : "new")], why = off || (pT ? WAIT : "");
  /* START, SAVE and SET send the time: greyed while the boxes don't make one, saying why */
  const tm = live ? null : teTime(e), tWhy = why || (tm ? tm.why : "");
  const nm = `<div class="tfield"><label for="tnm">Name</label><input id="tnm" type="text" maxlength="${TNLEN}" autocomplete="off" spellcheck="false" value="${esc(e.name)}" placeholder="${esc(e.ph)}"></div>
    ${namesHTML(e, t)}`;
  const time = live
    ? `<p class="tleft">Time left <b id="te-left">${tfmt(t.left)}</b></p><div class="tkeys">${[[-60, "−1 MIN"], [60, "+1 MIN"]].map(([s, l]) => b("cmdbtn", l, "", {cmd: `tm2:add:${t.id}:${s}`, why})).join("")}</div><p class="tnote">Changes the time left at once, on every screen.</p>`
    : teTimeHTML(e, tm);
  const acts = !t ? [b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn", pT === "save" ? "SAVING…" : "SAVE", "start it later", {cmd: "te:save", why: tWhy}), b("cmdbtn tgo", pT === "start" ? "STARTING…" : "START", "counts down now", {cmd: "te:start", why: tWhy})]
    /* REMOVE is on the row, so the editor doesn't repeat it. A timer counting down or paused can go back to its own
       time here, stopped, as OK does after its alarm and a kitchen timer's clear does: the editor stays open, now a
       stopped timer's, so a name typed and not yet saved stays */
    : live ? [b("cmdbtn", pT === "reset" ? "SENDING…" : `BACK TO ${tfmt(t.set)}`, "ready to start again", {cmd: "te:reset", why}), b("cmdbtn tgo", pT === "name" ? "SAVING…" : "DONE", "", {cmd: "te:done", why})]
    : [b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn tgo", pT === "save" ? "SAVING…" : "SET", "", {cmd: "te:save", why: tWhy})];
  /* a timer shown as a row without its buttons, where the column beside the drawing is too narrow for them (tMode): the
     editor has a second row with what the row would have, REMOVE (one tap, with UNDO on its row) and START or PAUSE */
  const two = t && t.state !== "done" && ["plain", "go"].includes(tChipped(t))
    ? `<div class="tact tact2">${b("cmdbtn trm", pT === "rm" ? "REMOVING…" : "REMOVE", "", {cmd: `tm2:rm:${t.id}`, label: pT === "rm" ? "" : `Remove ${t.name}`, why})}${tGo(t, pT, why, t.state === "paused" ? "carry on" : "")}</div>` : "";
  return `<div class="tedit" role="group" aria-labelledby="te-t"><p class="tet" id="te-t">${t ? `Change ${esc(t.name)}` : "New timer"}</p>${nm}${time}<div class="tact">${acts.join("")}</div>${two}</div>`;
}
/* SOUND: this screen's own setting, for its timers and CraftBeerPi's alerts. A browser plays sound only after a tap on the
   page, so after a reload it says so until the first tap anywhere */
function soundHTML() {
  const s = st.snd, blocked = s.on && !s.ok, alarm = SOUNDS[soundOf(st.alarmSound)].label;
  return `<button type="button" class="keep snd${blocked ? " blocked" : ""}" role="switch" aria-checked="${s.on}" data-cmd="snd" data-sound="${soundOf(st.alarmSound)}"><span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.2 8.4l3 3 6.6-7"/></svg></span><span class="kl">${blocked ? "SOUND · TAP TO ALLOW" : "SOUND"}</span><span class="sr"> for timers and alerts, on this screen, as the ${esc(alarm)} sound${blocked ? ". The browser allows it after the first tap on this page" : ""}</span></button>`;
}
/* the phone's step strip: the timers that are counting, paused or have run out, one tap from their section */
function tmlHTML() {
  if (!M.TIMERS || !st.tmrs.some(t => t.state !== "stopped")) return "";
  return `<button type="button" class="tml" data-cmd="tjump"><span class="tl">TIMERS</span><span id="tml-t">${tmlText()}</span></button>`;
}
const tmlText = () => st.tmrs.filter(t => t.state !== "stopped").map(t => t.state === "done" ? `<span class="d">${esc(t.name)} TIME'S UP</span>` : `${esc(t.name)} ${t.state === "paused" ? "paused " : ""}${tfmt(t.left)}`).join(" · ");
/* the one-screen layout (brewday.css): from 1180 px wide the page never scrolls, and the recipe column's parts make way
   for one another */
const ONE_SCREEN = window.matchMedia("(min-width:1180px)");
/* where the timers are drawn (TIMER-PLACE.md, D): on one screen in a column beside the drawing, which gets narrower while
   there is a timer and is full width with none; narrower, and on a phone, in the recipe column. A CraftBeerPi without the
   timers keeps its rest timer in the column */
const tHere = () => M && M.TIMERS && ONE_SCREEN.matches ? "side" : "col";
/* what a timer's row or chip says to a screen reader, before "Change it": its name and time, how long ago it ran out,
   and how long CraftBeerPi was off where it was brought back after a restart */
function tSaid(t) {
  const done = t.state === "done", run = t.state === "running", live = run || t.state === "paused";
  return (done ? `${t.name}: time's up, ${tUpKnown(t) ? `${tfmt(tUp(t))} ago` : "how long ago isn't known yet"}` : `${t.name}: ${tfmt(t.left)}${run ? " left" : live ? " left, paused" : ", ready"}`)
    + (tBack(t) ? `. ${tOff(t)}` : "");
}
/* + TIMER, greyed while four timers are set or an editor is open, saying why */
const tplusHTML = (off, cls) => b(`cmdbtn ${cls}`, "+ TIMER", "", {cmd: "te:new", why: off || (st.tmrs.length >= TMAX ? "Four timers at most. Remove one to add another." : st.tedit ? "One timer at a time: close the one that's open first." : "")});
/* START or PAUSE as on a timer's row: STARTING… or PAUSING… while CraftBeerPi answers */
const tGo = (t, p, why, hint) => b("cmdbtn", p === "start" ? "STARTING…" : p === "pause" ? "PAUSING…" : t.state === "running" ? "PAUSE" : "START", hint, {cmd: `tm2:go:${t.id}`, why});
/* a running timer with 3:00 or less to go: its time beside the drawing is bigger */
const TSOON = 180, tSoon = t => t.state === "running" && t.left <= TSOON;
/* a timer as one row of the column beside the drawing (brewday.css .tside .tchip): its name, giving way first with its
   ellipsis, its state word (paused, ready; none while counting) and its time on one line, the row's bar along its foot.
   The name and time open its editor. mode is what else it holds: "plain" nothing, "go" START or PAUSE, "full" REMOVE and
   START or PAUSE. One that has run out is Prompt Amber, counts up and has OK, while its alarm stays in the title bar. A
   timer brought back after a restart has the row's line under its name and time, saying how long CraftBeerPi was off
   (data-back), until it is started or answered */
function tchipHTML(t, off, mode) {
  const p = st.pend["t:" + t.id], why = off || (p ? WAIT : ""), done = t.state === "done", live = t.state === "running" || t.state === "paused";
  const word = done ? "TIME'S UP" : t.state === "paused" ? "paused" : t.state === "stopped" ? "ready" : "";
  const editing = !!(st.tedit && st.tedit.id === t.id), back = tBack(t) && tHere() === "side";
  const btns = mode === "plain" ? "" : done ? b("cmdbtn tok", p === "ok" ? "SENDING…" : "OK", "", {cmd: `tm2:ok:${t.id}`, label: p === "ok" ? "" : "OK, stops the alarm", why})
    : (mode === "full" ? b("cmdbtn trm", p === "rm" ? "REMOVING…" : "REMOVE", "", {cmd: `tm2:rm:${t.id}`, label: p === "rm" ? "" : `Remove ${t.name}`, why}) : "") + tGo(t, p, why, "");
  return `<div class="tchip" data-mode="${mode}" data-state="${t.state}" id="tc-${t.id}"${tSoon(t) ? " data-soon" : ""}${back ? " data-back" : ""}><button type="button" class="tcsel" data-cmd="te:open:${t.id}" aria-expanded="${editing}" aria-label="${esc(tSaid(t))}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${word}</span><span class="tt" id="tct-${t.id}">${done ? tUpText(t) : tfmt(t.left)}</span></button>${btns ? `<span class="tcx">${btns}</span>` : ""}${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}${live ? `<span class="bar"><i id="tcbar-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
}
/* a timer just removed, as a row of the same size in its place: its name and "removed", in Dim Steel, and UNDO, for its
   TUNDO real seconds, whatever the rows around it hold, as it is the only way back */
function tcgoneHTML(g, off, mode) {
  const p = st.pend["t:" + g.t.id];
  const undo = b("cmdbtn tundo", p ? "SENDING…" : "UNDO", "put it back", {cmd: `tm2:undo:${g.t.id}`, label: p ? "" : `Undo: put ${g.t.name} back`, why: off || (p ? WAIT : "")});
  return `<div class="tchip tcgone" data-mode="${mode}" data-state="gone" id="tc-${g.t.id}" role="group" aria-label="${esc(g.t.name)} removed"><p class="tcg"><span class="tn">${esc(g.t.name)}</span><span class="ts">removed</span></p><span class="tcx">${undo}</span></div>`;
}
/* a timer just removed is in the list while its UNDO shows; while its REMOVE is on its way, a CraftBeerPi that has already
   said it's gone still has its row here, REMOVING…, so nothing below moves */
const tGoneShown = () => { const g = st.tgone; return !!g && !(g.sending && st.tmrs.some(t => t.id === g.t.id)); };
const tN = () => st.tmrs.length + (tGoneShown() ? 1 : 0);
/* the rows in the timers' order, a timer just removed in its place; after(id) is what follows a row (its editor's box) */
function tchipsHTML(off, mode, after) {
  const out = st.tmrs.map(t => tchipHTML(t, off, mode) + after(t.id)), g = st.tgone;
  if (tGoneShown()) out.splice(Math.min(g.idx, out.length), 0, g.sending ? tchipHTML(g.t, off, mode) : tcgoneHTML(g, off, mode));
  return out.join("");
}
/* what the rows beside the drawing hold, from the column's width (tsideFit): REMOVE and START or PAUSE where a row has
   --tcw-full, START or PAUSE where it has --tcw-go, else the name and time alone. At its 300 px it is always the first */
const tMode = () => ["go", "plain"].includes(st.tcm) ? st.tcm : "full";
/* how a timer is drawn now where it isn't a row of the recipe column's: its mode beside the drawing, else "" */
const tChipped = () => tHere() !== "col" ? tMode() : "";
/* a timer's editor beside the drawing, in a box of its own, with the timers' notes in it */
const tpopHTML = off => st.tedit ? `<div class="tpop" id="tpop">${teditHTML(off)}<p class="note">${esc(st.notes.t || "")}</p></div>` : "";
/* the timers' note while no editor is open (UNDO or + TIMER refused), for its 6 s, to the column's left */
const tpnoteHTML = () => !st.tedit && st.notes.t ? `<p class="tpnote">${esc(st.notes.t)}</p>` : "";
/* the timers in a column beside the drawing, on one screen, while there is at least one (a timer just removed counts while
   its UNDO shows): TIMERS with how many there are ("TIMERS · 2"), + TIMER and SOUND, then the timers one to a row, which
   scroll inside the column where they don't all fit; the count says they are there even where a long question in the
   title bar leaves no room for a row. The drawing beside it gets narrower, not shorter, so its vessels keep their size
   (brewday.css). With no timers the drawing is full width, and + TIMER and SOUND are two small buttons over its top-right
   corner (tsideCorner). A timer's editor opens in a box beside its timer, a new one's beside the end of the timers, kept
   on screen (tsidePop) */
let tsideTop = 0, placeBusy = false;
/* the step list as keepStepInView last left it: the list, the current step (its recipe and number), the list's height,
   where it was scrolled to, and whether it has been scrolled by hand since the step or the height last changed */
let stepSeen = null;
function tsideHTML(off, n) {
  const e = st.tedit, pop = tpopHTML(off), plus = tplusHTML(off, "tplus3"), m = st.tmrs.length;
  if (!n) return `<div class="tcorner">${plus}${soundHTML()}</div>${pop}${tpnoteHTML()}`;
  const rows = tchipsHTML(off, tMode(), id => e && e.id === id ? pop : "") + (e && e.id == null ? pop : "");
  return `<div class="tsh"><h3 id="tside-h">Timers${m ? ` <span aria-hidden="true">·</span> ${m}` : ""}</h3><div class="tshr">${plus}${soundHTML()}</div></div><div class="tsl">${rows}</div>${tpnoteHTML()}`;
}
/* the column, or the corner's buttons, drawn again in the drawing's row (data-tside: split; data-tcorner: the buttons over
   the drawing's corner, in its cell); patched in place, so the editor keeps what is being typed and the list where it was
   scrolled to */
function tsideDraw() {
  const bh = $(".brewhouse");
  if (!bh) return;
  const on = tHere() === "side", n = tN();
  let el = $("#tside");
  bh.toggleAttribute("data-tside", on && n > 0);
  bh.toggleAttribute("data-tcorner", on && !n);
  if (!on) { if (el) el.remove(); return; }
  if (!el) { bh.insertAdjacentHTML("beforeend", '<section class="tside" id="tside" aria-label="Timers"></section>'); el = $("#tside"); }
  const l = el.querySelector(".tsl");
  tsideTop = n && l ? l.scrollTop : 0;
  el.classList.toggle("empty", !n);
  morph(el, tsideHTML(st.link === "lost" ? PAUSED : "", n));
}
/* after drawing: the column as tall as the drawing's box, which keeps its own least height where the row is shorter (a
   long question in the title bar); what the rows hold, from the column's width. Where they don't all fit, the list's
   height: a next row that would show all but its last 12 px is cut at half, so it reads as cut; one that would show less
   is left as it is, as the heading's count says there are more. Then the list scrolled back to where it was, and the
   editor's box */
const TSIDE_CUT = 12;
function tsideFit() {
  const el = $("#tside"), l = el && el.querySelector(".tsl");
  if (el) el.style.minHeight = l ? `${$("#rig").offsetHeight}px` : "";
  if (l && !placeBusy) {
    const s = getComputedStyle(l), w = l.clientWidth, need = m => parseFloat(s.getPropertyValue("--tcw-" + m));
    const mode = w >= need("full") ? "full" : w >= need("go") ? "go" : "plain";
    if (mode !== tMode()) { st.tcm = mode; placeBusy = true; renderAll(); placeBusy = false; return; }
  }
  if (l) {
    l.style.maxHeight = "";
    /* the tiles' own tops and heights, as one brought back after a restart is taller */
    const t = [...l.children].filter(x => x.classList.contains("tchip")), H = l.clientHeight;
    if (t.length > 1 && l.scrollHeight > H + 1) {
      const y0 = t[0].offsetTop, nx = t.find(x => x.offsetTop - y0 + x.offsetHeight > H);
      if (nx) {
        const y = nx.offsetTop - y0, th = nx.offsetHeight;
        if (H - y > th - TSIDE_CUT) l.style.maxHeight = `${y + th / 2}px`;
      }
    }
    l.scrollTop = tsideTop;
  }
  tsidePop();
}
/* the editor's box to the left of the column (of the corner's buttons, with no timers), level with its timer, or for a new
   timer with the end of the timers, moved up or down as far as it must to stay on screen */
function tsidePop() {
  const pop = $("#tpop"), el = $("#tside");
  if (!pop || !el) return;
  const e = st.tedit, l = el.querySelector(".tsl"), rows = l ? [...l.querySelectorAll(".tchip")] : [];
  const a = e && e.id != null ? $("#tc-" + e.id) : rows[rows.length - 1] || el.querySelector(".tcorner");
  if (!a) return;
  const r = el.getBoundingClientRect(), ar = a.getBoundingClientRect(), m = 8;
  let y = e && e.id == null && l ? Math.min(ar.bottom, l.getBoundingClientRect().bottom) : ar.top;
  y = Math.max(m, Math.min(y, window.innerHeight - m - pop.offsetHeight));
  pop.style.top = `${Math.round(y - r.top - el.clientTop)}px`;
}
/* with no timers: + TIMER and SOUND in the drawing's top-right corner, in the first of these that stays inside the
   drawing's box and clears every part of the drawing as it is drawn (outlines, lines, pumps, labels, the valves' note):
   side by side, one over the other, then the same with smaller words, still 44 px tall. Tried after every draw of the
   drawing and once the fonts are in. Where none clears (a drawing about 130 px tall, from the boil on, when the wort
   pump's words sit beside the boil kettle near the box's right edge; or one under about 100 px, with a long question in
   the title bar or an editor open), the two stand one over the other, or side by side where the box is too short for
   that, and the drawing leaves room for them at its right (--rig-r): it gets narrower, not smaller, as beside the
   timers' column. That holds while the drawing's box and words stay as they were (tcornerKeep), and the fonts: buttons
   measured before Barlow is in are wider; when any of these changes, the drawing goes back to full width and the corner
   is tried again */
const TCORNER = ["row", "stack", "row small", "stack small"];
let tcornerKeep = null;
function tsideCorner() {
  const c = $("#tside .tcorner"), svg = $("#rigsvg"), rig = $("#rig");
  if (!rig) return;
  const room = () => { if (!rig.style.getPropertyValue("--rig-r")) return false; rig.style.removeProperty("--rig-r"); tcornerKeep = null; drawRig(); return true; };
  if (!c) { room(); return; }
  const key = svg ? `${document.fonts ? document.fonts.status : ""}|${rig.clientWidth}x${rig.clientHeight}|${[...svg.querySelectorAll("text")].map(x => (x.getClientRects().length ? "" : "-") + x.textContent).join("|")}` : "";
  if (tcornerKeep) {
    if (tcornerKeep.key === key) { c.dataset.fit = tcornerKeep.fit; return; }
    if (room()) return;
  }
  const box = rig.getBoundingClientRect(), parts = svg ? [...svg.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon, text")].map(x => x.getBoundingClientRect()).filter(p => p.width > 0 && p.height > 0) : [];
  const clear = () => [...c.children].every(x => {
    const r = x.getBoundingClientRect();
    return r.top >= box.top && r.bottom <= box.bottom && r.left >= box.left && r.right <= box.right && !parts.some(p => r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top);
  });
  for (const f of TCORNER) { c.dataset.fit = f; if (clear()) return; }
  if (!svg) return;
  c.dataset.fit = "stack";
  if (c.offsetHeight + 12 > rig.clientHeight) c.dataset.fit = "row";
  tcornerKeep = {key, fit: c.dataset.fit};
  rig.style.setProperty("--rig-r", `${Math.ceil(c.offsetWidth) + 6}px`);
  drawRig();
}
/* after drawing, with the timers beside the drawing: the column fitted (tsideFit) */
function tPlaceFit() { if (tHere() === "side") tsideFit(); }
/* the step list scrolls, where it has to, so the current step is whole in view: on the one-screen layout the list is
   the part of the column that gives up height, to the timers, a question or an editor, with or without the timers.
   Where the current step is taller than the list has room for even at its top (a box above it, a long note), the
   versions' line steps aside, as it does while something in the column waits for you (brewday.css). + BrewStart, right
   above the first step, is kept in view with it as one: the versions' line steps aside for the two where it would for
   the step alone, and only where they still don't fit does the list keep the step whole without it.
   A list scrolled by hand stays where it was left, through every update from CraftBeerPi, until the current step
   changes or the list's height does (a question opening or closing): then it follows the step again. `again`: the
   sizes have changed (the window, the fonts), which counts as the list's height changing */
function keepStepInView(again = false) {
  const rc = $("#recipe"), l = $("#recipe .steps"), c = l && l.querySelector('[aria-current="step"]'), add = c && l.querySelector(".bsnew");
  if (!rc) return;
  const need = c ? (add ? c.getBoundingClientRect().bottom - add.getBoundingClientRect().top : c.offsetHeight) : 0;
  if (rc.hasAttribute("data-short")) rc.removeAttribute("data-short");
  if (c && ONE_SCREEN.matches && c.offsetHeight && need > l.clientHeight - 6) rc.setAttribute("data-short", "");
  if (!l) { stepSeen = null; return; }
  const key = `${(M.RECIPE && M.RECIPE.name) || ""}|${st.recipe ? st.recipe.cur : -1}`, was = stepSeen;
  const same = !again && !!was && was.el === l && was.key === key && was.h === l.clientHeight;
  const byHand = same && (was.byHand || Math.abs(l.scrollTop - was.top) > 1);
  stepSeen = {el: l, key, h: l.clientHeight, top: l.scrollTop, byHand};
  if (byHand || !c || l.scrollHeight <= l.clientHeight + 1) return;
  const top = add && need <= l.clientHeight - 6 ? add : c, h = top === add ? need : c.offsetHeight;
  const d = top.getBoundingClientRect().top - l.getBoundingClientRect().top;
  if (d < 0 || d + h > l.clientHeight) l.scrollTop += d - 6;
  stepSeen.top = l.scrollTop;
}
/* a timer's command: the demo answers it itself, as the mockup does; live it goes to CraftBeerPi, whose answer carries every
   timer, shown at once rather than when the websocket's word follows. A refusal says why under the timers */
function tSend(key, dir, label, apply, request, o = {}) {
  if (DEMO_MODE) return send(key, dir, label, apply);
  return exec(key, dir, label, request, {
    quiet: o.quiet, why: o.why,
    ok: res => {
      if (res.data && Array.isArray(res.data.timers)) tAns = {...res.data, received: Date.now()};
      if (o.ok) o.ok(res);
    },
    fail: (res, w) => {
      note("t", (o.why && o.why(res)) || (res.data && res.data.error ? String(res.data.error) : `That didn't go through: ${w}.`));
      if (o.fail) o.fail(res, w);
    }
  });
}
function cmdTe(x, y) {
  const e = st.tedit;
  if (x === "new") { st.tedit = {id: null, name: "", ph: tDefaultName(), set: 10 * 60}; return renderAll(); }
  if (x === "open") {
    const t = tById(+y);
    if (!t) return;
    st.tedit = e && e.id === t.id ? null : {id: t.id, name: t.name, ph: t.name, set: t.set};
    return renderAll();
  }
  if (!e) return;
  if (x === "x") { st.tedit = null; return renderAll(); }
  if (x === "pick") { const n = st.names[+y]; if (n != null) e.name = e.name === n ? "" : n; return renderAll(); }
  if (x === "step") { const m = Math.min(TMINS, Math.max(0, Math.floor(e.set / 60) + parseInt(y, 10))); teSet(e, m === TMINS ? m * 60 : m * 60 + e.set % 60); return renderAll(); }
  if (x === "sec") { teSet(e, Math.min(TMINS * 60, Math.max(0, e.set + parseInt(y, 10)))); return renderAll(); }
  if (x === "min") { teSet(e, parseInt(y, 10) * 60); return renderAll(); }
  /* spaces as the server keeps them: trimmed, and one between words */
  const t = e.id != null ? tById(e.id) : null, name = (e.name || "").split(/\s+/).filter(Boolean).join(" ") || e.ph, shut = {ok: () => { st.tedit = null; }};
  if (e.id != null && !t) { st.tedit = null; return renderAll(); } // removed on another screen meanwhile
  if ((x === "reset" || x === "done") && !t) return;
  /* BACK TO: the timer goes back to its own time, stopped; its editor stays open, now a stopped timer's, so a name typed
     and not yet saved is kept. CraftBeerPi refuses it for one that has run out meanwhile: its sentence, and the editor
     closes, leaving the row's OK */
  if (x === "reset") {
    return tSend("t:" + t.id, "reset", `${t.name} back to ${tfmt(t.set)}, stopped with ${tfmt(t.left)} to go`,
      () => { t.state = "stopped"; t.left = t.run = t.set; delete t.interrupted; teSet(e, t.set); }, () => api.timersReset(t.id),
      {ok: () => { teSet(e, t.set); }, fail: res => { if (res.status === 409 && st.tedit === e) st.tedit = null; },
        why: res => res.status === 409 && res.data && res.data.error ? String(res.data.error) : ""});
  }
  /* a typed name another timer has is refused as its greyed button is, before anything is sent */
  const twin = (!t || name !== t.name) && tTwin(name, t);
  if (twin) return note("t", tTwinWhy(twin.name));
  if (x === "done") {
    if (name === t.name) { st.tedit = null; return renderAll(); }
    return tSend("t:" + t.id, "name", `${t.name} is now ${name}`, () => { t.name = name; st.tedit = null; }, () => api.timersChange(t.id, {name}), shut);
  }
  /* START, SAVE and SET send the time the boxes make, greyed while they make none (teTime) */
  const tm = teTime(e);
  if (tm.why) return note("t", tm.why);
  const set = tm.set;
  if (!t) {
    if (st.tmrs.length >= TMAX) return note("t", "Four timers at most. Remove one to add another.");
    const go = x === "start";
    return tSend("t:new", x, `${name} added${go ? " and started" : ""}, ${tfmt(set)}`, () => {
      st.tmrs.push({id: Math.max(0, ...st.tmrs.map(z => z.id)) + 1, name, set, left: set, run: set, state: go ? "running" : "stopped"});
      st.tedit = null;
    }, () => api.timersAdd(name, set, go), shut);
  }
  const said = name !== t.name ? `${t.name} is now ${name}, ${tfmt(set)}` : `${t.name} set to ${tfmt(set)}`;
  /* SET on one that has run out answers its alarm too, and stops it at its new time, as CraftBeerPi does */
  return tSend("t:" + t.id, "save", said, () => { if (t.state === "done") { tAnswered(t, "no longer needed"); t.state = "stopped"; } t.name = name; t.set = t.left = t.run = set; st.tedit = null; },
    () => api.timersChange(t.id, name !== t.name ? {name, seconds: set} : {seconds: set}), shut);
}
function cmdTm2(x, id, y) {
  if (x === "undo") return tUndo(+id);
  const t = tById(+id), key = "t:" + id;
  if (!t || st.pend[key]) return;
  /* REMOVE on the row: one tap, no question, in any state but a run-out one. The row keeps its place for TUNDO real seconds
     with UNDO (tgoneHTML), its height and its buttons' width measured as REMOVE is pressed, so nothing under it moves */
  if (x === "rm") {
    if (t.state === "done") return;
    const live = t.state === "running" || t.state === "paused", row = $("#tr-" + t.id), btns = row && row.querySelector(".tbtn");
    const g = {t: Object.assign({}, t), idx: st.tmrs.indexOf(t), h: row ? row.offsetHeight : 0, w: btns ? btns.offsetWidth : 0, at: st.t};
    const gone = () => { st.tgone = Object.assign(g, {real: Date.now(), sending: false}); st.tmrs = st.tmrs.filter(z => z.id !== t.id); if (st.tedit && st.tedit.id === t.id) st.tedit = null; };
    if (DEMO_MODE) return send(key, "rm", `${t.name} removed${live ? `, ${tfmt(t.left)} to go` : ""}`, gone);
    st.tgone = Object.assign(g, {sending: true});
    return tSend(key, "rm", `${t.name} removed${live ? `, ${tfmt(t.left)} to go` : ""}`, null, () => api.timersRemove(t.id),
      {ok: gone, fail: () => { if (st.tgone === g) st.tgone = null; }});
  }
  if (x === "go") {
    if (t.state === "running") return tSend(key, "pause", `${t.name} paused, ${tfmt(t.left)} to go`, () => { t.state = "paused"; }, () => api.timersPause(t.id));
    return tSend(key, "start", `${t.name} started, ${tfmt(t.left)} to go`, () => { if (t.state === "stopped") t.run = t.left; t.state = "running"; delete t.interrupted; }, () => api.timersStart(t.id));
  }
  if (x === "add") {
    const s = parseInt(y, 10), want = Math.max(10, t.left + s);
    return tSend(key, "add", `${t.name}: ${s > 0 ? "+" : "−"}${Math.abs(s) / 60} min, ${tfmt(want)} to go`,
      () => { const was = t.left; t.left = Math.max(10, t.left + s); t.run = Math.max(t.left, t.run + t.left - was); }, () => api.timersAddTime(t.id, s));
  }
  /* answering: OK puts the timer back to its own time, stopped (a kitchen timer's recall). Live, the answer takes
     CraftBeerPi's prompt down on every screen; this one doesn't log it as answered elsewhere */
  const answer = () => tAnswered(t);
  const heard = !DEMO_MODE && t.prompt, o = heard ? {ok: () => { if (opts.removeAlert) opts.removeAlert(heard); }, fail: () => answered.delete(heard)} : {};
  if (x !== "ok") return;
  if (heard) answered.add(heard);
  return tSend(key, "ok", `${t.name}: alarm answered`, () => { answer(); t.state = "stopped"; t.left = t.run = t.set; }, () => api.timersOk(t.id), o);
}
/* UNDO, within TUNDO seconds of REMOVE: CraftBeerPi puts the timer back with its id, in its place, as it would be now: one that
   was counting down has counted on meanwhile. Live, its line says the time left in CraftBeerPi's answer. Refused (409:
   four timers, or another of its name, both made on another screen meanwhile), CraftBeerPi's sentence, and the row stays
   for the rest of its TUNDO seconds; too late (404, after CraftBeerPi's 7 s), the screen names the timer, as CraftBeerPi has only
   its number by then, and the row goes */
function tUndo(id) {
  const g = st.tgone;
  if (!g || g.sending || g.t.id !== id || st.pend["t:" + id]) return;
  const t = g.t, live = t.state === "running" || t.state === "paused", said = `${t.name} put back`;
  if (DEMO_MODE) {
    const left = () => Math.max(1, t.state === "running" ? t.left - (st.t - g.at) : t.left);
    return send("t:" + id, "undo", `${said}${live ? `, ${tfmt(left())} to go` : ""}`, () => {
      t.left = left();
      st.tmrs.splice(Math.min(g.idx, st.tmrs.length), 0, t);
      st.tgone = null;
    });
  }
  return tSend("t:" + id, "undo", said, null, () => api.timersUndo(id), {
    quiet: true,
    ok: res => {
      if (st.tgone === g) st.tgone = null;
      const back = res.data && Array.isArray(res.data.timers) ? liveTmrs({...res.data, received: Date.now()}).find(z => z.id === id) : null;
      const line = said + (back && (back.state === "running" || back.state === "paused") ? `, ${tfmt(back.left)} to go` : "");
      logEvent(line, "confirmed", "ok"); say(line + ": confirmed");
    },
    fail: res => { if (res.status === 404 && st.tgone === g) st.tgone = null; },
    why: res => res.status === 404 ? `${t.name} can't be put back now: a removed timer can be put back for ${TUNDO} seconds.`
      : res.status === 409 && res.data && res.data.error ? String(res.data.error) : ""
  });
}
/* the alarm sound: the one chosen in Settings, BREWDAY_ALARM_SOUND (alarm.js). ring() plays its whole burst, ring(2) its
   first two pulses */
function audioOK() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    /* a silent one-sample sound, started inside the press. Some browsers, Safari on an iPhone in particular, have let a
       page play sound later only once a sound has started inside a press, not just on resume(); this one is silent */
    const z = actx.createBufferSource(); z.buffer = actx.createBuffer(1, 1, 22050); z.connect(actx.destination); z.start(0);
    return true;
  } catch (_) { return false; }
}
function ring(pulses) {
  if (!M.TIMERS || !st.snd || !st.snd.on || !st.snd.ok || !actx) return;
  playSound(actx, actx.destination, actx.currentTime + 0.02, st.alarmSound, pulses);
}
/* a timer that has run out: its whole burst every 3 s until it is answered, checked at each second's tick and as each
   message from CraftBeerPi arrives. A tab behind another runs its ticks as seldom as once a minute, but the messages
   still arrive on time, so the first burst sounds as CraftBeerPi says the timer has run out. Timed from the last burst,
   not by the clock's seconds: a tick a few ms early or late could land twice in one second, and two bursts a second
   apart would run into each other */
function alarmCheck() {
  if (DEMO_MODE || !st || !M || !M.TIMERS) return;
  if ((st.tmrs || []).some(t => t.state === "done") && Date.now() - rangAt >= 2500) { rangAt = Date.now(); ring(); }
}
/* SOUND as this device left it. A browser set to play sound without a tap (a kiosk's --autoplay-policy) is allowed at once */
function soundInit() {
  let on = false;
  try { on = window.localStorage.getItem(SOUND_KEY) === "on"; } catch (e) { /* private mode: off */ }
  if (!on) return {on, ok: true};
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return {on, ok: false}; }
  return {on, ok: actx.state === "running"};
}
/* SOUND is silent: switching it on, or allowing it while it says TAP TO ALLOW, plays nothing. Sound means a timer that
   has run out, or a new alert or question, never a press. The lit box says it's on; Settings' Try plays the sound on
   purpose. The press still lets the page play sound later (audioOK) */
function cmdSnd() {
  const s = st.snd;
  /* pressed while it says TAP TO ALLOW: the press allows it and leaves it on */
  if (s.on && !s.ok) { s.ok = audioOK(); return renderAll(); }
  s.on = !s.on;
  if (!DEMO_MODE) { try { window.localStorage.setItem(SOUND_KEY, s.on ? "on" : "off"); } catch (e) { /* private mode: for this page */ } }
  if (s.on) s.ok = audioOK();
  renderAll();
}
/* the first tap or key on the page lets it play sound; not Escape, which a browser doesn't count. A browser counts a mouse
   button as it goes down, but a finger only as it lifts (the HTML standard's activation-triggering events), so a touch
   tries again on pointerup. A press on SOUND is left to SOUND's own click (cmdSnd), so one that slides off it allows
   nothing */
function unlockSound(target) {
  const s = st && st.snd;
  if (!M.TIMERS || !s || !s.on || (target && target.closest && target.closest(".snd"))) return;
  if (s.ok) { if (actx && actx.state === "suspended") actx.resume(); return; }
  if (!audioOK()) return;
  s.ok = true;
  renderAll();
}
/* the demo's every brewing second, as the mockup's: the running timers count down and the finished ones up; a finished one's
   alarm takes the title bar when it is free (behind another prompt it waits its turn); the alarm sound every 3 s while any
   alarm waits */
function tmTick() {
  let changed = false;
  /* the rows beside the drawing are drawn again as a timer gets to 3:00 to go, or back over it, as its time grows */
  const soon0 = st.tmrs.filter(tSoon).map(t => t.id).join();
  for (const t of st.tmrs) {
    if (t.state === "running") {
      t.left = Math.max(0, t.left - 1);
      if (t.left === 0) {
        t.state = "done"; t.at = st.t; changed = true;
        if (st.tedit && st.tedit.id === t.id) st.tedit = null;
        logEvent(`${t.name} finished`, "waiting for you", "wait"); say(`${t.name}: time's up.`, true);
        continue;
      }
      tmShow(t);
    } else if (t.state === "done") tmUp(t);
  }
  if (st.tmrs.filter(tSoon).map(t => t.id).join() !== soon0) changed = true;
  if (!st.banner) { const d = st.tmrs.find(t => t.state === "done"); if (d) { st.banner = DEMO.tBanner(d, st.tmrs); changed = true; } }
  /* a removed timer's row goes TUNDO real seconds after REMOVE, at any speed of CraftBeerPi's clock, unless its UNDO is on
     its way. At 1× CraftBeerPi's seconds are real ones, so they count it, as in a moment set up with no real time */
  const g0 = st.tgone, gone = g0 && (SC() !== 1 && g0.real != null ? Date.now() - g0.real >= TUNDO * 1000 : st.t - g0.at >= TUNDO);
  if (gone && !st.pend["t:" + g0.t.id]) { st.tgone = null; changed = true; }
  if (changed) renderAll();
  else { const m = $("#tml-t"); if (m) m.innerHTML = tmlText(); }
  // the beep while a timer's alarm waits is the screen's own: every 3 real seconds, at any speed of the demo's clock
  if (st.tmrs.some(t => t.state === "done") && st.t % (3 * SC()) === 0) ring();
}
function tmShow(t) {
  setText($("#tt-" + t.id), tfmt(t.left));
  setText($("#tct-" + t.id), tfmt(t.left));
  const bar = $("#tb-" + t.id); if (bar) bar.style.width = tPct(t) + "%";
  const cb = $("#tcbar-" + t.id); if (cb) cb.style.width = tPct(t) + "%";
  if (st.tedit && st.tedit.id === t.id) setText($("#te-left"), tfmt(t.left));
}
// a run-out timer counting up, on its row in the column or beside the drawing
function tmUp(t) { setText($("#tt-" + t.id), tUpText(t)); setText($("#tct-" + t.id), tUpText(t)); }
/* live: the timers as CraftBeerPi last told them, counted on between its messages, a running one down and a finished one
   up, on its brewing clock (its scale: a simulator runs it faster). up: null while how long ago one ran out isn't known */
function liveTmrs(x) {
  if (!x || !Array.isArray(x.timers)) return [];
  const gone = Math.max(0, Date.now() - (x.received || Date.now())) / 1000 * (num(x.scale) || 1), now = num(x.now);
  return x.timers.filter(t => t && t.id != null).map(t => {
    const set = Math.round(num(t.set) ?? 0), left0 = Math.max(0, num(t.left) ?? 0), at = num(t.at);
    const left = t.state === "running" ? Math.max(0, left0 - gone) : left0;
    return {id: t.id, name: String(t.name ?? ""), set, run: Math.round(num(t.run) ?? set), left: Math.ceil(left - 1e-6), state: String(t.state || "stopped"),
      up: t.state === "done" && at != null && now != null ? Math.floor(now + gone - at + 1e-6) : null, prompt: t.prompt == null ? null : String(t.prompt),
      interrupted: t.interrupted === true, off: num(t.off)};
  });
}
/* the newest word on the timers: a command's own answer until the websocket's catches up with it */
function timersMsg(snap) {
  const w = snap && snap.timers;
  if (tAns && !(w && num(w.now) >= num(tAns.now))) return tAns;
  tAns = null;
  return w;
}
/* the timer a prompt of CraftBeerPi's belongs to: the one that names it, or, until the timers' own message does (the prompt
   comes first), a timer of its title that has no prompt yet, in the server's words */
function promptTimer(p) {
  if (!M.TIMERS || !p) return null;
  const id = String(p.id), title = String(p.title || "");
  return st.tmrs.find(t => t.prompt === id)
    || (TIMER_RAN_OUT.test(String(p.message || "").trim()) ? st.tmrs.find(t => !t.prompt && t.state !== "stopped" && t.name === title) : null) || null;
}
function liveTmTick() {
  if (!tMsg) return;
  const soon0 = st.tmrs.filter(tSoon).map(t => t.id).join();
  st.tmrs = liveTmrs(tMsg);
  for (const t of st.tmrs) {
    if (t.state === "running") tmShow(t);
    else if (t.state === "done") tmUp(t);
  }
  const m = $("#tml-t"); if (m) m.innerHTML = tmlText();
  // a removed timer's row goes TUNDO real seconds after CraftBeerPi took it, unless its UNDO is on its way
  const g = st.tgone;
  if (g && !g.sending && Date.now() - g.real >= TUNDO * 1000 && !st.pend["t:" + g.t.id]) { st.tgone = null; renderAll(); }
  /* a timer getting to 3:00 to go, or back over it: its row beside the drawing is drawn again, its time bigger */
  else if (st.tmrs.filter(tSoon).map(t => t.id).join() !== soon0) renderAll();
  alarmCheck();
}
const TAB_PATH = {"Recipe Book": "/recipes", "Brew Steps": "/mashprofile"};
/* another page, with what it is told (state: Brew Steps' from "brewday", from BrewStart's ALL SETTINGS) */
function go(path, state) { if (opts.navigate) opts.navigate(path, state ? {state} : undefined); else window.location.hash = "#" + path; }

function run(cmd) {
  const [k, x, y] = cmd.split(":");
  // the Settings page's demo has a title bar and no brewhouse: ALL OFF only says what it does, as in its mockup
  if (DEMO_MODE && PAGE && k !== "log") return toast("Mockup: ALL OFF works here exactly as on the brew-day screen.");
  switch (k) {
    case "act": return DEMO_MODE ? cmdAct(x) : liveAct(x);
    case "mode": return DEMO_MODE ? cmdMode(x, y) : liveMode(x, y);
    case "tgt": return cmdTgtOpen(x);
    case "tstep": return cmdTgtStep(parseFloat(x));
    case "tboil": return cmdTgtBoil();
    case "bat": return cmdBatOpen();
    case "tset": return cmdTgtSet();
    case "tcancel": st.edit = null; return renderAll();
    case "pwr": if (st.edit && st.edit.kind === "pwr") { st.edit = null; return renderAll(); } return cmdPwrOpen();
    case "pstep": return cmdPwrStep(parseInt(x, 10));
    case "pset": return cmdPwrSet();
    case "pnudge": return cmdNudge(parseInt(x, 10));
    case "pause": return cmdPause(x === "on");
    case "keep": return cmdKeep();
    case "r":
      if (x === "start") return DEMO_MODE ? cmdStart() : liveStart();
      if (x === "stop") return DEMO_MODE ? cmdStop() : liveStop();
      if (x === "next-yes") return DEMO_MODE ? cmdNextYes() : liveNext();
      if (x === "reset-yes") return DEMO_MODE ? cmdReset() : liveReset();
      if (x === "unload") return cmdUnload();
      if (x === "unload-yes") return DEMO_MODE ? cmdUnloadGo() : liveUnload();
      if (x === "load-yes") return st.confirmLoad != null ? loadPress(st.confirmLoad, true) : renderAll();
      if (x === "load-no") { st.confirmLoad = null; return renderAll(); }
      /* NEXT STEP's, RESET's and UNLOAD's questions, one at a time: NEXT STEP or RESET opening theirs closes the others
         (UNLOAD closes theirs as it opens, cmdUnload), and their other answers close them all */
      st.confirmNext = x === "next"; st.confirmReset = x === "reset"; st.confirmUnload = false; st.confirmFor = st.recipe ? st.recipe.cur : null; return renderAll();
    case "b":
      if (DEMO_MODE) return cmdBanner(x);
      if (x === "ok") st.alarm = null;
      return renderAll();
    case "p": return livePrompt(x, y);
    case "pb": if (x === "go") return pbGo(); st.pbOpen = false; return renderAll();
    case "cmp": if (x === "open") return cmpOpen(); return cmpDone(true);
    /* OTHER RECIPE's book, opened and closed: opening it closes the probes' panel, and reads the book again, so a recipe
       imported meanwhile on another screen is in it */
    case "rb": st.rbOpen = x === "open"; st.confirmLoad = null; if (st.rbOpen) { st.cmpOpen = false; if (!DEMO_MODE) loadBook(); } return renderAll();
    /* the strike water box: USE, BACK TO, USE waiting for the grain (where), and FORECAST or CLOSE, one button that opens
       and closes the details; closing them closes a small box open in them. BrewStart's row, + BrewStart and its box */
    case "sw": if (x === "use") return swUse(); if (x === "back") return swBack(); if (x === "where") return swWhere(); st.swOpen = x === "more" ? !st.swOpen : x === "open"; if (!st.swOpen) { st.swVol = null; st.swGrain = null; st.swRec = null; } return renderAll();
    case "swv": return swVol(x, y);
    case "swg": return swGrain(x, y);
    case "swr": return swRec(x, y);
    case "bs": return bsCmd(x, y);
    case "e": case "w": return liveOk(k, x);
    case "alloff": return DEMO_MODE ? cmdAllOff() : liveAllOff();
    case "log": st.logOpen = !st.logOpen; if (st.logOpen) { phLogOpened(); st.spdOpen = false; } return renderAll();
    case "spd": return spdCmd(x, y);
    case "ph": return phCmd(cmd);
    case "tm": return DEMO_MODE ? cmdTimer(x) : liveTimer(x);
    case "te": return cmdTe(x, y);
    case "tm2": { const p = cmd.split(":"); return cmdTm2(p[1], p[2], p[3]); }
    case "snd": return cmdSnd();
    case "tjump": return $("#tmrs")?.scrollIntoView({block: "start"});
    case "tab": return DEMO_MODE ? toast(`Mockup: this opens the existing ${x} page.`) : go(TAB_PATH[x] || "/");
    case "load": return loadPress(+x);
    case "gspan": return graphCmd(x);
    default: return undefined;
  }
}

/* ---------- live state: what CraftBeerPi says, with what this screen is waiting for ---------- */
function blankMoment() {
  const v = {}, a = {};
  ROLES.forEach(x => { v[x] = {pv: null, sv: null, own: null, mode: "manual"}; });
  ACTS.forEach(x => { a[x] = {on: false, pct: 0}; });
  return {t: null, link: "lost", age: null, banner: null, v, a, recipe: null, timer: {left: 3600, running: false},
    tmrs: [], names: [], tedit: null, snd: soundInit(),
    events: loadEvents(), pend: {}, notes: {}, edit: null, confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null, logOpen: false, rbOpen: false,
    sw: null, swOpen: false, swVol: null, swGrain: null, swRec: null, bsOpen: false, bs: null, simCfg: false, spdOpen: false, spdPend: null,
    fail: {}, expect: {}, alarm: null, errors: [], warnings: [], prompts: [], lostAt: null, openedAt: Date.now(),
    waitN: 0, oldAt: 0, seenN: 0, seenDone: new Set()};
}
function expected(key, raw) {
  const x = st.expect[key];
  if (!x) return raw;
  if (x.value === raw || Date.now() > x.until) { delete st.expect[key]; return raw; }
  return x.value;
}
function timerNow(t) {
  if (!t || typeof t !== "object") return {left: 3600, running: false};
  const rem = num(t.remaining) ?? 0, scale = num(t.scale) || 1;
  const left = t.running ? Math.max(0, rem - (Date.now() - (t.received || Date.now())) / 1000 * scale) : Math.max(0, rem);
  return {left: Math.ceil(left - 1e-6), running: !!t.running};
}
function applyLive(snap) {
  M = model({...snap, book});
  const now = Date.now();
  if (snap.connected) { st.link = "ok"; st.lostAt = null; st.age = 0; }
  else { st.link = "lost"; if (st.lostAt == null) st.lostAt = now; st.age = everConnected ? Math.floor((now - st.lostAt) / 1000) : null; }
  for (const v of ROLES) {
    const k = M.K[v];
    if (!k) { st.v[v] = {pv: null, sv: null, own: null, mode: "manual", missing: true}; continue; }
    const pv = num(snap.sensorData ? snap.sensorData[k.sensor] : null);
    let sv = num(expected("t:" + v, num(k.target_temp)));
    if (!(sv > 0)) sv = null;
    const auto = expected("m:" + v, !!k.state);
    st.v[v] = {pv, sv, own: sv, mode: auto ? "auto" : "manual"};
  }
  for (const id of ACTS) {
    const x = M.A[id];
    if (!x) { st.a[id] = {on: false, pct: 0, missing: true}; delete st.fail[id]; continue; }
    const on = expected("a:" + id, x.state === true);
    // a failure clears itself once CraftBeerPi shows the switch the way it was wanted
    if (st.fail[id] && on === (st.fail[id] === "on")) {
      delete st.fail[id];
      if (st.alarm && st.alarm.cmd === "act:" + id) st.alarm = null;
    }
    const pw = num(x.power);
    st.a[id] = {on, pct: on ? Math.round(pw == null ? 100 : pw) : 0, failed: st.fail[id] || null};
  }
  // The boil power button's two levels: BoilPower's Boil_Power, 85 % when it has none (BoilPower's default), and the boil
  // element's own level, which it comes on at by hand (manual_power; power from an older CraftBeerPi without it).
  const bkp = M.K.bk && M.K.bk.props, be = M.A.bkEl;
  st.v.bk.bp = Math.round(num(bkp && bkp.Boil_Power) ?? 85);
  st.a.bkEl.lvl = Math.round(num(be && (be.manual_power ?? be.power)) ?? 100);
  // The new BoilPower's settings: the boil point (BOIL AT), KEEP BOILING, the usual boil power and a pause, which it keeps
  // in the kettle's settings so every page shows them. Its boil latch it doesn't publish: below the boil point in AUTO, an
  // element on below full power (Max_Output) is running at the boil power (design/brewday/BUILD-NOTES.md).
  if (M.BKNEW) {
    const V = st.v.bk, el = st.a.bkEl, p = bkp || {}, usual = num(p.Usual_Boil_Power), full = num(p.Max_Output) ?? 100;
    V.boilAt = M.BOIL_TH;
    V.keep = expected("k:bk", yes(p.Keep_Boiling, true));
    V.usual = usual == null ? null : Math.round(usual);
    el.paused = V.mode === "auto" && expected("z:bk", yes(p.Paused, false));
    el.pausedAt = num(p.Paused_At);
    V.latched = V.mode === "auto" && !el.paused && V.pv != null && V.pv < boilFrom() ? !(el.on && el.pct >= full) : undefined;
  }
  liveLocks();
  st.prompts = (snap.alerts || []).filter(x => x && Array.isArray(x.action) && x.action.length);
  st.recipe = liveRecipe(snap);
  /* the strike water helper's state: CraftBeerPi's newest word (GET /step2/strike, the topic "strike"), or a command's own
     answer until that catches up. None from a CraftBeerPi without the helper: no box. Its forecast failing for these
     numbers is logged once */
  st.sw = strikeMsg(snap);
  swFailLog();
  /* a question in the recipe column stays open while its words stay true, and goes with the recipe or when the current
     step changes. NEXT STEP's also when the recipe is ready (not begun, or the boil held), where NEXT STEP is greyed: on a
     stopped recipe it stays, as CraftBeerPi's NEXT then marks the stopped step done and starts the next one. RESET's also
     when the middle button stops being RESET: a step starts, or the recipe is reset or replaced */
  const rc = st.recipe, begun = !!rc && (rc.state === "stopped" || rc.cur > 0);
  if (st.confirmNext && (!rc || rc.cur !== st.confirmFor || rc.state === "ready")) st.confirmNext = false;
  if (st.confirmReset && (!rc || rc.cur !== st.confirmFor || rc.state === "running" || !begun)) st.confirmReset = false;
  st.timer = timerNow(snap.timer);
  /* the timers, while CraftBeerPi has them: a CraftBeerPi that tells of its rest timer and not of them has none, and keeps
     the rest timer. An editor shuts when its timer goes (removed on another screen) or runs out */
  tMsg = timersMsg(snap);
  M.TIMERS = !!(tMsg && Array.isArray(tMsg.timers)) || !snap.timer;
  const was = st.tedit && st.tedit.id != null ? tById(st.tedit.id) : null;
  st.tmrs = liveTmrs(tMsg);
  // the names to pick: BREWDAY_TIMER_NAMES as the settings have it now, or as CraftBeerPi last sent it with the timers
  const raw = cfg(snap.config, "BREWDAY_TIMER_NAMES");
  st.names = raw != null ? timerNames(raw) : tMsg && Array.isArray(tMsg.names) ? tMsg.names.map(String) : [];
  // the alarm sound: BREWDAY_ALARM_SOUND as the settings have it now; an older CraftBeerPi has none, the default. Not
  // st.alarm, which is a command that failed, in the title bar
  st.alarmSound = soundOf(cfg(snap.config, "BREWDAY_ALARM_SOUND"));
  // the name: until the settings arrive, the title bar keeps the one it opened with
  const bn = cfg(snap.config, "BREWERY_NAME");
  if (bn !== undefined) setBrewery(bn);
  /* a simulator's setting, SIM_TIME_SCALE (isSim) */
  st.simCfg = cfg(snap.config, "SIM_TIME_SCALE") != null;
  clockFmt = settingsClockFormat(snap.config);
  if (st.tedit && st.tedit.id != null) {
    const t = tById(st.tedit.id);
    if (!t || (t.state === "done" && was && was.state !== "done")) st.tedit = null;
  }
  if (!M.TIMERS) st.tedit = null;
  if (!PAGE && !st.recipe && !bookShown) { bookShown = true; loadBook(); }
  if (st.recipe) bookShown = false;
  /* UNLOAD asks for a recipe the Recipe Book doesn't have, so the book's names are read while one is loaded too: as the
     page opens, and again for each recipe loaded (by its steps). For a recipe not begun the newest five as well, for
     OTHER RECIPE's book */
  if (!PAGE && st.recipe) { const k = recipeKey(); if (k !== bookFor) { bookFor = k; loadBook(!pbFresh()); } } else bookFor = null;
  /* UNLOAD's alarm goes once the steps have gone after all */
  if (st.alarm && st.alarm.cmd === "r:unload-yes" && !M.RECIPE.steps.length) st.alarm = null;
  powerModeChanged(st.v.bk.mode);
  alarmCheck();
}
/* a running kettle logic owns its heater, and a HERMS also the pump through its coil (the mash tun's first:
   its HERMS outranks the HLT's own AUTO) */
function liveLocks() {
  for (const id of ACTS) {
    const aid = M.ACT[id].id;
    st.a[id].by = null;
    if (!aid) continue;
    for (const v of ["mt", "hlt", "bk"]) {
      const k = M.K[v];
      if (k && st.v[v].mode === "auto" && (k.heater === aid || (isHerms(k, M.HERMS_LOGICS) && k.agitator === aid))) { st.a[id].by = v; break; }
    }
  }
}
function liveRecipe(snap) {
  const S = M.RECIPE.steps;
  if (!S.length || S.every(s => s.status === "D")) return null;
  let cur = S.findIndex(s => s.status === "A"), state = "running";
  if (cur < 0) { cur = S.findIndex(s => s.status === "S" || s.status === "E"); state = "stopped"; }
  if (cur < 0) { cur = S.findIndex(s => s.status === "I"); state = "ready"; }
  if (cur < 0) return null;
  const s = S[cur], text = String(s.text || "").trim(), left = parseLeft(text);
  const p = (snap.steps || []).find(x => x && x.id === s.id);
  const props = (p && p.props) || {}, done = new Set((props._hops_done || []).map(Number));
  /* BrewStart 1.3.0 heating the HLT itself (its _brewstart_heating, kept with the step), then holding the water for the
     move once it has asked (_brewstart_asked), until Next: its row says HEATING, then WAITING FOR YOU */
  const heat = s.type === "BrewStart" && state !== "ready" && props._brewstart_heating ? (props._brewstart_asked ? "holding" : "heating") : null;
  let wait = null;
  // a question CraftBeerPi asks under the step's own name that holds the step up - the malt, a notification step,
  // the boil's hold - but not one asked while the step's timer runs on (the whirlpool's "Heat and hold?")
  if (((state === "running" && left == null) || state === "ready") && st.prompts.some(q => String(q.title || "") === s.n)) wait = WAITING_FOR_YOU;
  else if (state === "running" && heat) wait = heat === "holding" ? WAITING_FOR_YOU : "HEATING";
  else if (state === "running" && s.type === "BrewStart") {
    // cbpi4_BrewStart: "Start Fri Oct 30, 07:00 · 2:35:10 to go", "Ready … · heating from Fri Oct 30, 05:30 · …", or on
    // CraftBeerPi's 12-hour clock (CLOCK_FORMAT) "… heating from Sat Nov 21, 5:53 AM · …"; STARTS says it by
    // the clock's setting, 5:53 AM or 05:53
    const at = /(?:^start|heating from)\s+[^·]*?(\d{1,2}:\d{2}(?:\s?[AP]M)?)\s*·/i.exec(text), mn = at ? clockMin(at[1]) : null;
    if (mn != null) wait = `STARTS ${tod(mn * 60)}`;
  }
  if (!wait && state === "running" && left == null && text && (s.min || s.temp != null)) {
    const pv = st.v[s.k] ? st.v[s.k].pv : null;
    wait = /cool/i.test(s.type || "") || (/target temp/i.test(text) && pv != null && s.temp != null && pv > s.temp + 0.5) ? "COOLING"
      : /target temp/i.test(text) ? "HEATING" : "WAITING";
  }
  const adds = (s.adds || []).map(a => {
    const n = a[3];
    const due = st.prompts.some(q => n === "fw" ? /first wort/i.test(q.message || "") : /hop alert/i.test(q.title || "") && (String(q.message || "").trim().endsWith(`(${n})`) || String(q.message || "").trim() === `Please add Hop ${n}`));
    return due ? "due" : (n === "fw" ? props._first_wort_done : done.has(n)) ? "done" : "";
  });
  // a SpargeStep holds the drawing on recirculating until Sparge started: its _sparge_started, kept with the step
  // held: the boil waiting for the brewer (StepController, CONFIRM_BEFORE_BOIL), not started, the profile begun, and
  // CraftBeerPi's question under its name, whose button starts it. NEXT STEP is greyed then (HELD_NEXT), and the
  // question's button takes a held press, as START does
  const held = state === "ready" && !!s.boil && S.some(x => x.status === "D") && st.prompts.some(q => String(q.title || "") === s.n);
  return {state, cur, left: left ?? (s.min ? s.min * 60 : 0), wait, adds, held, started: s.type === "SpargeStep" && !!props._sparge_started, bsHeat: heat};
}
// The title bar: no connection first, then a command that failed, then CraftBeerPi's errors, then the rest by how urgent
// (rank, below). For its first few seconds a page that has not connected yet says so calmly. fresh: it has just arrived,
// and beeps if it takes the title bar (renderAll)
function liveBanner() {
  if (st.link === "lost") {
    st.banner = everConnected
      ? {tone: "alarm", title: "No connection", text: "Readings are {age} s old. Trying again every 5 s. Controls are paused until CraftBeerPi answers.", fresh: true}
      : connecting()
      ? {tone: "connecting", title: "Connecting", text: "Waiting for CraftBeerPi to answer."}
      : {tone: "alarm", title: "Connecting", text: "Waiting for CraftBeerPi to answer. Controls are paused until it does.", fresh: true};
    return;
  }
  const queue = [], isNew = id => newIds.has(String(id));
  if (st.alarm) queue.push(st.alarm);
  /* CraftBeerPi's errors, the same words once, as its warnings are: the count says how many presses are left, and one OK
     clears every copy. Each copy keeps its own line */
  const errs = new Set();
  st.errors.forEach(e => {
    const k = `${e.title}\n${e.message}`;
    if (errs.has(k)) return;
    errs.add(k);
    queue.push({tone: "alarm", title: ut(e.title || "Error"), text: ut(e.message || ""), act: "OK", cmd: `e:${e.id}`, fresh: isNew(e.id)});
  });
  // the held boil's question (liveRecipe, held): its button puts heat on, so it takes a held press, as START does
  const hs = st.recipe && st.recipe.held ? M.RECIPE.steps[st.recipe.cur] : null;
  const ask = p => {
    const t = promptTimer(p), hold = !!hs && String(p.title || "") === hs.n;
    return t ? {tone: "prompt", title: ut(p.title || t.name), text: ut(p.message || ""), timer: t.id, fresh: isNew(p.id),
      acts: [{label: "OK", cmd: `tm2:ok:${t.id}`, dir: "ok"}]}
      : {tone: "prompt", title: ut(p.title || "CraftBeerPi"), text: ut(p.message || ""), fresh: isNew(p.id), acts: p.action.map(a => ({label: String(a.label || "OK").toUpperCase(), cmd: `p:${p.id}:${a.id}`, hold})),
        /* for the mash pH (phOffer): the notification, its title as CraftBeerPi words it, and an OK that got no answer */
        pid: String(p.id), rawTitle: String(p.title || ""), ackFailed: !!(st.phAckFailed && st.phAckFailed.has(String(p.id)))};
  };
  /* the most urgent first, then a count. Oldest first within each:
     0 a timer that has run out: it rings until answered, and its row and the frame pulse with the title bar;
     1 what the brew needs from you: a question CraftBeerPi sends as a warning or an error (a hop to add, Heating is
       not working, Resume brew?, the hold before the boil, the stand's), or the current step's own (the sparge's, a
       NotificationStep's), which the recipe column calls WAITING FOR YOU;
     then CraftBeerPi's warnings without buttons;
     3 everything else, which holds nothing up: BrewScribe's reminders, Check mash pH, Brewing Complete, other
       plugins' questions */
  const cur = st.recipe ? M.RECIPE.steps[st.recipe.cur] : null;
  const rank = p => promptTimer(p) ? 0
    : /^(warning|error)$/i.test(String(p.type || "")) || (cur && String(p.title || "") === cur.n) ? 1 : 3;
  const asks = st.prompts.map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  asks.filter(a => a[0] < 2).forEach(a => queue.push(ask(a[2])));
  st.warnings.forEach(w => queue.push({tone: "warning", title: ut(w.title || "Warning"), text: ut(w.message || ""), act: "OK", cmd: `w:${w.id}`, fresh: isNew(w.id)}));
  asks.filter(a => a[0] > 2).forEach(a => queue.push(ask(a[2])));
  st.banner = queue.length ? {...queue[0], more: queue.length - 1} : null;
}
/* a warning stays in the title bar until OK; the same one again is not shown twice. Ten at most: a newer one pushes the
   oldest out, and its line turns plain (warningsGone) */
function addWarning(id, title, message) {
  if (st.warnings.some(w => w.title === title && w.message === message)) return;
  st.warnings.push({id, title, message});
  if (st.warnings.length > 10) { st.warnings.shift(); warningsGone(); }
}
/* a warning's line is amber only while the warning waits in this screen's title bar for OK. Once it has gone (OK, or pushed
   out by newer ones), each line with its words takes the plain colour and keeps "from CraftBeerPi"; one OK'd anywhere
   also says "seen" (seenLines). Lines kept from an earlier page
   load plain: this page's title bar has no warnings yet. Errors stay red */
function warningsGone() {
  const shown = new Set((st.warnings || []).map(w => `${ut(w.title)}: ${ut(w.message)}`));
  let changed = false;
  for (const e of st.events) if (e[2] === "from CraftBeerPi" && e[3] === "wait" && !shown.has(e[1])) { e[3] = ""; changed = true; }
  if (changed) saveEvents();
}
/* CraftBeerPi's warning or error OK'd, here or on any screen or in BrewScribe (CraftBeerPi tells every page, with its
   earlier copies in the same words): each of its lines says "seen". A warning's turns plain, as it no longer
   waits; an error's stays red, as it records that something went wrong (The Amber Means Waiting Rule). A line already
   plain, its warning pushed out or kept from an earlier page, is left */
function seenLines(words) {
  st.events.forEach(e => {
    if (e[1] !== words || e[2] !== "from CraftBeerPi" || (e[3] !== "wait" && e[3] !== "bad")) return;
    e[4] = "seen";
    if (e[3] === "wait") e[3] = "";
  });
}
/* OK on CraftBeerPi's warning or error, one without buttons: every copy in its words goes from this title bar, and
   CraftBeerPi is told, so it goes from every screen's title bar and from BrewScribe too, rather than waiting there to be
   acknowledged again. No line of its own.
   Nothing waits on CraftBeerPi's answer: one from before a restart, or more than 100 ago, it no longer knows, and that
   one goes from this screen only */
function liveOk(k, id) {
  const a = (k === "e" ? st.errors : st.warnings).find(x => String(x.id) === id);
  if (a) seenHere(`${ut(a.title)}: ${ut(a.message)}`);
  api.seen(id);
  renderAll();
}
/* a warning or an error seen, by its words: each copy leaves the title bar, and their lines say "seen" */
function seenHere(words) {
  const same = x => `${ut(x.title)}: ${ut(x.message)}` === words;
  st.errors = st.errors.filter(x => !same(x));
  st.warnings = st.warnings.filter(x => !same(x));
  seenLines(words);
  warningsGone();
  saveEvents();
}
/* CraftBeerPi says warnings or errors were seen: OK'd on another screen or in BrewScribe (notification_retired, reason
   "seen"), or before this page connected (notification_seen). Each leaves the title bar with no line and no beep, and
   its lines say "seen". Each id once: a copy that comes later is news. A
   warning shown once for its copies is found by any copy's id, through that copy's own line */
function seenElsewhere(snap) {
  const s = snap.seen;
  if (!s || s.n === st.seenN) return;
  st.seenN = s.n;
  const words = new Set();
  for (const id of s.ids() || []) {
    if (st.seenDone.has(id)) continue;
    st.seenDone.add(id);
    const a = st.errors.find(x => String(x.id) === id) || st.warnings.find(x => String(x.id) === id);
    if (a) words.add(`${ut(a.title)}: ${ut(a.message)}`);
    for (const e of st.events) if (e[7] === id && e[2] === "from CraftBeerPi") words.add(e[1]);
  }
  words.forEach(seenHere);
}
/* BrewStart 1.3.0 heating the HLT itself, as CraftBeerPi's steps tell it: its heating begun (_brewstart_heating, kept
   with the step) and its status line no longer the waiting one, which it writes just after its notice ("Time to heat -
   …"); bsHadHeat, it had begun. bsOff: the step after a BrewStart that heated, as it finished, and when */
const BS_WAITING = /(?:^start|heating from)\s+[^·]*?\d{1,2}:\d{2}/i;
const bsHadHeat = x => !!x && x.type === "BrewStart" && !!(x.props || {})._brewstart_heating;
const bsHeatsNow = x => bsHadHeat(x) && !BS_WAITING.test(String(x.state_text || "").trim());
const kettleWord = k => k === "hlt" ? "HLT" : M.VNAME[k].toLowerCase();
let bsOff = null;
/* a step starting, or resuming after a Stop, for the event line. A SpargeStep says what it does as it starts: it heats
   the sparge water with the mash tun MANUAL, or with no water to heat leaves the pumps to the brewer.
   Resumed after Sparge started, it doesn't heat again, so it names no target. BrewStart sets no target as it starts: it
   waits, and its heating has a line of its own */
function stepStartLine(m, resumed, s) {
  const p = (s && s.props) || {};
  if (s && s.type === "SpargeStep") {
    if (resumed && p._sparge_started) return `${m.n} resumed`;
    if (!resumed) return p.Kettle && m.temp > 0 ? `${m.n}: heating the sparge water to ${m.temp} ${M.U}, mash tun MANUAL` : `${m.n}: mash tun MANUAL, the pumps are yours`;
  }
  if (s && s.type === "BrewStart") return `${m.n} ${resumed ? "resumed" : "started"}`;
  /* a whirlpool sets no target as it starts: it holds its temperature only after "Heat and hold" */
  if (s && s.type === "WhirlpoolStep") return `${m.n} ${resumed ? "resumed" : "started"}${m.min ? `, ${m.min} min` : ""}`;
  /* the proposed boil kettle shows a target at or above where BOIL starts as BOIL, never as a temperature, as its window
     and TARGET's editor do. An older BoilPower shows the temperature */
  const tgt = m.temp == null ? "" : m.boil && M.BKNEW && m.temp >= bkLetGo() ? "BOIL" : `${m.temp.toFixed(1)} ${M.U}`;
  return `${m.n} ${resumed ? "resumed" : "started"}${tgt ? `, ${M.VNAME[m.k].toLowerCase()} target ${tgt}` : ""}`;
}
/* a question's words in the event line: a timer's alarm as "<name> finished", any other "title: message" */
function promptWords(a) {
  const tm = promptTimer(a);
  return tm ? `${tm.name} finished` : `${ut(a.title)}: ${ut(a.message)}`;
}
/* a question this tab has a line for already: CraftBeerPi shows a page the questions it keeps for every page again as the
   page connects (a reload, the wifi back), and they are the same questions, asked when the line says. A line kept from
   before the lines had ids is matched by its words, and takes the id */
function askedBefore(id, words) {
  const e = st.events.find(x => x[2] === "waiting for you" && (x[7] === id || (x[7] == null && x[1] === words)));
  if (!e) return false;
  if (e[7] == null) { e[6] = e[6] || 0; e[7] = id; saveEvents(); }
  return true;
}
/* the hold before the boil, started with this screen's START: its question offers Start as an answer, but CraftBeerPi
   takes it down as "withdrawn" when the boil starts that way, so the screen counts it as answered. START puts the
   current step in own.start; held, that is the boil, whose name is the
   question's title */
const startedHere = a => !!(own.start && Date.now() - own.start.at < 10000
  && M.RECIPE.steps.some(s => own.start.ids.includes(s.id) && s.n === ut(a.title)));
/* an answer given on another screen, in the words an answer here logs, naming the button pressed when CraftBeerPi says
   which (said). A timer's alarm: "alarm answered"; a SpargeStep's question: none, as its step's
   "sparge started" line is its answer; any other: "<title> answered", with ": <button>" */
function elsewhereLine(a, said) {
  const title = ut(a.title), b = said == null ? "" : String(said).trim();
  if (M.TIMERS && TIMER_RAN_OUT.test(String(a.message || "").trim())) return `${title}: alarm answered`;
  if (spargeQuestion(a)) return null;
  return b ? `${title} answered: ${b}` : `${title} answered`;
}
/* a SpargeStep's question: titled with the step's name, with a Sparge started button (livePrompt asks the same). Any of
   the recipe's, so it doesn't matter which of the question going and the step's flag arrives first */
const spargeQuestion = p => M.RECIPE.steps.some(s => s.type === "SpargeStep" && String(p.title || "") === s.n)
  && (p.action || []).some(b => /^sparge started$/i.test(String(b.label || "").trim()));
// What happened since the last update, for the event line: the connection, everything CraftBeerPi says, and the
// recipe's steps starting, finishing and starting their timers. Commands from this screen log themselves.
function observe(prev, snap) {
  if (!prev) return firstLines(snap);
  if (prev.connected && !snap.connected) logEvent(LOST, "trying again", "bad");
  if (!prev.connected && snap.connected && everConnected) {
    // CraftBeerPi's clock may have moved meanwhile: restarted, set by the network, or at another SIM_TIME_SCALE
    syncBrewClock(true);
    logEvent("Connection to CraftBeerPi back", "", "");
    if (!PAGE && !st.recipe) loadBook();
    // a plugin comes or goes with a restart: ask again whether BrewScribe is there, and the simulator
    probeBrewScribe();
    simvAsk();
  }
  /* What came in this update is logged in the order it happened,
     so the event line ends on what it led to: the question that waits, or that the hoses can be moved. First the questions
     that have gone, as an answer comes before what it sets going; then what a step said as it stopped; then the steps'
     lines and "Recipe finished"; then everything else CraftBeerPi said, in the order it came */
  const before = new Map((prev.alerts || []).map(a => [String(a.id), a]));
  const now = new Set((snap.alerts || []).map(a => String(a.id)));
  /* a question gone: its own line says so (questionGone): answered, here or on another screen; taken down by CraftBeerPi,
     no longer needed; or dropped as this page connected again, with no word of why, no longer waiting, as on a page
     opened later. Answered on another screen, which is news: one short line, as an answer here reads, not the question
     again. Never logged here: the question whole, to say what
     was asked */
  for (const [id, a] of before) {
    if (now.has(id) || !Array.isArray(a.action) || !a.action.length) continue;
    const why = typeof snap.retired === "function" ? snap.retired(a.id) : null;
    const here = answered.delete(id) || startedHere(a);
    const res = here || why === "answered" ? "answered" : why ? "no longer needed" : "no longer waiting";
    const found = questionGone(id, res);
    if (here || (found && why !== "answered")) continue;
    if (found) {
      const line = elsewhereLine(a, typeof snap.answer === "function" ? snap.answer(a.id) : null);
      if (line) logEvent(line, "from another screen", "");
      continue;
    }
    logEvent(`${ut(a.title)}: ${ut(a.message)}`, why === "answered" ? "answered on another screen" : res, "");
  }
  const old = new Map((prev.steps || []).filter(Boolean).map(s => [s.id, s]));
  const steps = (snap.steps || []).filter(Boolean);
  /* CraftBeerPi's new messages, in two parts. What a step says as it stops is titled with its name ("Whirlpool: Stand
     over: …"), and CraftBeerPi sends it before it marks the step done: it goes before the step's line. Everything else
     goes after the steps' lines, because their changes set it going: the runoff's pump off and the held boil's question
     after "Sparge finished", a step's own words after its start, Brewing Complete after "Recipe finished" */
  const fresh = (snap.alerts || []).filter(a => !before.has(String(a.id)) && !OWN_ALERTS.has(String(a.id)));
  /* for the title bar's beep: what has just arrived, but not the questions CraftBeerPi sends a page as it first connects,
     which were waiting already (openIds). One that arrived while the connection was down is news, and beeps if it takes
     the title bar */
  fresh.forEach(a => { if (!(openIds && openIds.has(String(a.id)))) newIds.add(String(a.id)); });
  const ending = new Set(steps.filter(s => { const o = old.get(s.id); return o && o.status === "A" && s.status !== "A"; }).map(s => String(s.name)));
  const lastWords = a => ending.has(String(a.title));
  fresh.filter(lastWords).forEach(logAlert);
  // START and NEXT STEP pressed here have logged themselves ("Recipe started", "Skipped to …"), as in the
  // mockup: the steps they start and finish are the brewer's doing, not the recipe's.
  const mine = id => ["start", "next"].some(k => own[k] && Date.now() - own[k].at < 10000 && own[k].ids.includes(id));
  /* BrewStart heating the HLT itself, seen as it begins: its line goes after BrewStart's own notice (below) */
  const heatLines = [];
  for (const s of steps) {
    const o = old.get(s.id);
    if (!o) continue;
    const m = M.RECIPE.steps.find(x => x.id === s.id) || {n: s.name}, sparge = s.type === "SpargeStep";
    // a SpargeStep's Sparge started pressed elsewhere: its timer starts at the press, not at a temperature
    if (sparge && !(o.props || {})._sparge_started && (s.props || {})._sparge_started
      && !(own.sparge && own.sparge.id === s.id && Date.now() - own.sparge.at < 10000)) logStep(spargeStartedLine(m), "from another screen", "", s.name);
    if (s.status === "A" && bsHeatsNow(s) && !bsHeatsNow(o)) heatLines.push(`${m.n} heating${m.temp != null ? `, ${kettleWord(m.k)} target ${m.temp.toFixed(1)} ${M.U}` : ""}`);
    if (o.status === s.status && parseLeft(o.state_text) != null) continue;
    if (o.status !== "A" && s.status === "A") {
      /* the step after a BrewStart that heated the HLT itself starts with the strike water moved: said whoever moved on */
      const after = !!bsOff && bsOff.id === s.id && o.status === "I" && Date.now() - bsOff.at < 10000;
      if (!mine(s.id) || after) logStep(stepStartLine(m, o.status === "S", s), "by recipe", "", s.name);
    } else if (o.status === "A" && s.status === "D") {
      /* BrewStart that heated the HLT itself switches the HLT's AUTO off as it ends (BrewStart 1.3.0), NEXT pressed here
         or not: the press's own line says only what it skipped to */
      const hot = bsHadHeat(o), i = M.RECIPE.steps.findIndex(x => x.id === s.id), nx = i >= 0 ? M.RECIPE.steps[i + 1] : null;
      if (hot) bsOff = nx ? {id: nx.id, at: Date.now()} : null;
      if (!mine(s.id) || hot) logStep(`${m.n} finished${hot ? `, ${kettleWord(m.k)} AUTO off` : ""}`, "by recipe", "", s.name, true);
    }
    else if (o.status === "A" && s.status === "S" && !(Date.now() - (own.stop || 0) < 10000)) logStep(`${m.n} stopped`, "from another screen", "", s.name, true);
    else if (s.status === "E" && o.status !== "E") logStep(`${m.n}: error`, "by recipe", "bad", s.name, true);
    /* a timer that waited for a temperature. Not a SpargeStep's, which starts at the press, nor a whirlpool's, which starts
       with the step whatever the temperature (WaitStep.on_start): its start line says the minutes */
    else if (o.status === "A" && s.status === "A" && parseLeft(o.state_text) == null && parseLeft(s.state_text) != null
      && m.min && !sparge && s.type !== "WhirlpoolStep") {
      logStep(`${m.n}: ${m.temp != null ? `${m.temp} ${M.U} reached, ` : ""}${m.min} min timer started`, "by recipe", "", s.name);
    }
  }
  if (steps.length && steps.every(s => s.status === "D") && (prev.steps || []).some(s => s && s.status !== "D") && steps.every(s => old.has(s.id))) {
    logStep("Recipe finished", "by recipe", "ok", steps[steps.length - 1].name, true);
  }
  /* a reset on another screen (the Brew Steps page's, or another Brew Day's): every step waiting again, the same steps as
     before. The same recipe loaded again on another page reads the same, to the same effect; a different one has new
     steps. Not RESET or LOAD pressed here, which log themselves */
  if (steps.length && steps.length === old.size && steps.every(s => s.status === "I" && old.has(s.id))
    && (prev.steps || []).some(s => s && s.status !== "I") && !(Date.now() - Math.max(own.reset || 0, own.load || 0) < 10000)) {
    logEvent("Recipe reset to step 1", "from another screen", "");
  }
  /* an unload on another screen (the recipe pages' UNLOAD, the Brew Steps page's Clear, another Brew Day): the steps
     from some to none, the recipe named as the state before had it. Not UNLOAD pressed here, which logs itself */
  if (!steps.length && old.size && !(Date.now() - (own.unload || 0) < 10000)) {
    logEvent(`${String((prev.basic && prev.basic.name) || "") || "Brew steps"} unloaded`, "from another screen", "");
  }
  fresh.filter(a => !lastWords(a)).forEach(logAlert);
  heatLines.forEach(w => logEvent(w, "by recipe", ""));
}
/* the screen opened inside the app (back from Brew Steps, say) with questions already waiting: each gets its "waiting for
   you" line if this tab has none, as on a page loaded afresh, where CraftBeerPi sends them again as it connects. LOG's
   amber lines are where the questions behind the title bar's first one are seen. They haven't just arrived: no beep,
   and nothing said. Warnings stay as they are */
function firstLines(snap) {
  for (const a of snap.alerts || []) {
    const id = String(a.id);
    if (OWN_ALERTS.has(id) || !Array.isArray(a.action) || !a.action.length) continue;
    const words = promptWords(a);
    if (!askedBefore(id, words)) logEvent(words, "waiting for you", "wait", "", false, id);
  }
}
/* one of CraftBeerPi's new messages, for the event line, and for the title bar when it waits there: a question (a timer's
   alarm, by its name) waits for you, in amber, until it goes (questionGone); an error stays red; a warning is amber while
   it waits in the title bar for OK (warningsGone); anything else, but the routine, in the plain colour. Each is kept a
   moment too, for a refusal whose reason comes in a notice (bsHeard), and BrewStart's notice as it starts heating for
   HEAT NOW is said aloud (bsSpeak) */
function logAlert(a) {
  const id = String(a.id), type = String(a.type || "").toLowerCase(), title = ut(a.title), msg = ut(a.message), line = `${title}: ${msg}`;
  bsHear(a);
  const tm = Array.isArray(a.action) && a.action.length ? promptTimer(a) : null;
  if (tm) { if (!askedBefore(id, `${tm.name} finished`)) logEvent(`${tm.name} finished`, "waiting for you", "wait", "", false, id); say(`${tm.name}: time's up.`, true); }
  else if (Array.isArray(a.action) && a.action.length) { if (!askedBefore(id, line)) logEvent(line, "waiting for you", "wait", "", false, id); say(`${title}. ${msg}`, true); }
  else if (type === "error") { st.errors.push({id, title: a.title, message: a.message}); logEvent(line, "from CraftBeerPi", "bad", "", false, id); say(`${title}. ${msg}`, true); }
  else if (type === "warning") { addWarning(id, a.title, a.message); logEvent(line, "from CraftBeerPi", "wait", "", false, id); say(`${title}. ${msg}`); }
  else if (!ROUTINE.test(String(a.message || "").trim())) {
    logEvent(line, "from CraftBeerPi", "");
    if (bsSpeak && type === "success" && String(a.title ?? "") === bsSpeak.title && Date.now() < bsSpeak.until) { bsSpeak = null; say(line); }
  }
}
/* a page opened later: the lines kept on this device can hold a question that still waited as the last page closed. Once
   CraftBeerPi's list of the questions it waits on has come (it sends it as the page connects: snap.waiting), each such
   line whose question isn't among them, nor on show, says "no longer waiting", in the plain colour: this page can't tell
   whether it was answered or taken down. Again each time the list
   comes: after the wifi, or a restart. A line kept from before the lines had ids is matched by its words, a moment later
   (oldLines): the questions CraftBeerPi keeps for every page come just after the list, and one may be the line's */
function noLongerWaiting(snap) {
  const w = snap.waiting;
  if (!w || w.n === st.waitN) return;
  st.waitN = w.n;
  const ids = w.ids(), shown = new Set(st.prompts.map(p => String(p.id)));
  let changed = false;
  for (const e of st.events) {
    if (e[2] !== "waiting for you") continue;
    if (e[7] == null) { st.oldAt = Date.now() + 1500; continue; }
    if ((ids && ids.has(e[7])) || shown.has(e[7])) continue;
    e[2] = "no longer waiting"; e[3] = ""; changed = true;
  }
  if (changed) saveEvents();
}
function oldLines() {
  st.oldAt = 0;
  const asked = new Map(st.prompts.map(p => [promptWords(p), String(p.id)])), taken = new Set(st.events.map(x => x[7]).filter(Boolean));
  for (const e of st.events) {
    if (e[2] !== "waiting for you" || e[7] != null) continue;
    const id = asked.get(e[1]);
    if (id && !taken.has(id)) { e[6] = e[6] || 0; e[7] = id; taken.add(id); } else { e[2] = "no longer waiting"; e[3] = ""; }
  }
  saveEvents();
  renderAll();
}

/* ---------- the event log is kept on this device ---------- */
function loadEvents(text) {
  try {
    const xs = JSON.parse((text === undefined ? window.localStorage.getItem(EVENTS_KEY) : text) || "[]");
    const keep = Date.now() - EVENTS_KEEP_MS;
    return Array.isArray(xs) ? xs.filter(e => Array.isArray(e) && e.length >= 4 && e[5] > keep).slice(0, 50) : [];
  } catch (e) { return []; }
}
function saveEvents() {
  try { window.localStorage.setItem(EVENTS_KEY, JSON.stringify(st.events.slice(0, 50))); } catch (e) { /* private window: kept for this visit only */ }
}

/* ---------- the Recipe Book: its newest five when no recipe is loaded or one isn't begun, and every name, for UNLOAD ---------- */
/* names: the names alone, while a recipe that has begun is loaded (inBook); otherwise the newest five with their summaries
   too, for the column's recipe book and OTHER RECIPE's. A read that fails leaves the names unknown, so UNLOAD asks */
async function loadBook(names = false) {
  if (DEMO_MODE) return;
  /* a read already under way may have started before what is asked for now (a recipe imported on another screen just
     before OTHER RECIPE is pressed): the book is read again once it is done */
  if (bookBusy) { if (!names) bookAgain = true; return; }
  const g = gen;
  bookBusy = true;
  try {
    const res = await api.recipes();
    if (g !== gen) return;
    if (!res.ok || !Array.isArray(res.data)) { bookNames = null; return; }
    bookNames = new Set(res.data.filter(x => x && x.name != null).map(x => String(x.name)));
    if (names) {
      if (last) applyLive(last);
      schedule();
      return;
    }
    // the newest first - the one just imported or edited is the one about to be brewed - then by name
    const list = res.data.filter(x => x && x.file)
      .sort((p, q) => (num(q.modified) ?? 0) - (num(p.modified) ?? 0) || String(p.name || "").localeCompare(String(q.name || ""), undefined, {sensitivity: "base"}))
      .slice(0, 5);
    const found = await Promise.all(list.map(x => api.recipe(x.file)));
    if (g !== gen) return;
    book = list.map((x, i) => ({n: String(x.name || x.file), d: found[i].ok ? bookLine(found[i].data, M.U) : "", file: x.file}));
    if (last) applyLive(last);
    schedule();
  } finally {
    if (g === gen) {
      bookBusy = false;
      if (bookAgain) { bookAgain = false; loadBook(); }
    }
  }
}

/* ---------- press and hold (pointer and keyboard): heat only starts on a held press ---------- */
const HOLD_MS = 1000;
// The button a pointer hold has just fired from. Letting go of it makes a click, and this screen keeps the
// button between updates (the mockup draws a new one), so the click would land on it as a tap - by then a
// heater's "tap to turn off". The click is the end of the hold, not a tap.
let afterHold = null;
function holdStart(el, pointer) {
  if (hold) return;
  el.classList.add("holding");
  // START, and START ANYWAY in the check's box, act on the recipe they were held on: which one, as the press begins
  const on = el.dataset.cmd === "r:start" || el.dataset.cmd === "pb:go" ? recipeOn() : null;
  hold = {el, cmd: el.dataset.cmd, timer: setTimeout(() => {
    const c = hold.cmd; el.classList.remove("holding"); hold = null;
    if (pointer) afterHold = el;
    /* started, cleared or another loaded on another screen while the finger was on it: nothing starts. START ANYWAY's
       box has said why as it closed (pbEnd) */
    const lost = on && recipeLost(on);
    if (lost) { if (c === "r:start") lostSay(lost, on); return; }
    // live: not sent if the button stopped being this hold while the finger was on it
    if (!DEMO_MODE && !(el.isConnected && el.hasAttribute("data-hold") && el.getAttribute("aria-disabled") !== "true" && el.dataset.cmd === c)) {
      noteAt(el.isConnected ? el : $("#app"), "Not sent: the screen changed while you held it. Hold it again if you still want it.");
      return;
    }
    heldOn = on;
    try { run(c); } finally { heldOn = null; }
  }, HOLD_MS)};
}
function holdEnd(early) {
  if (!hold) return;
  const el = hold.el;
  clearTimeout(hold.timer); el.classList.remove("holding"); hold = null;
  if (!early) return;
  const pl = el.closest(".plate");
  if (pl) note(pl.id.slice(3), "Keep holding for one second. Heat only comes on with a held press.");
  else if (el.closest(".recipe")) note("r", "Keep holding for one second to start the recipe.");
  // the title bar's START THE BOIL: it has no note line
  else toast("Keep holding for one second. Heat only comes on with a held press.");
}

/* ---------- the MORE tab: the screens that have no tab of their own ---------- */
function moreOpen() { const m = $("#bd-more"); return !!m && !m.hidden; }
function closeMore() {
  const m = $("#bd-more"), t = $('.tabs a[data-tab="More"]');
  if (!m || m.hidden) return;
  m.hidden = true;
  if (t) t.setAttribute("aria-expanded", "false");
}
function toggleMore(tab) {
  const m = $("#bd-more");
  if (!m) return;
  if (!m.hidden) return closeMore();
  const r = tab.getBoundingClientRect(), up = r.top > window.innerHeight / 2;
  m.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  m.style.left = "auto";
  if (up) { m.style.top = "auto"; m.style.bottom = `${window.innerHeight - r.top + 6}px`; } else { m.style.bottom = "auto"; m.style.top = `${r.bottom + 6}px`; }
  m.hidden = false;
  tab.setAttribute("aria-expanded", "true");
  const first = m.querySelector("a");
  if (first) first.focus({preventScroll: true});
}

/* ---------- events ---------- */
const handlers = {
  pointerdown: e => {
    afterHold = null;
    unlockSound(e.target);
    const el = e.target.closest && e.target.closest("[data-hold]");
    if (!el || !root.contains(el) || e.button !== 0) return;
    // not focused, as in the mockup, where the button is drawn anew: a pointer hold leaves no focus ring
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    holdStart(el, true);
  },
  pointerup: e => { if (e.pointerType !== "mouse") unlockSound(e.target); holdEnd(true); },
  pointercancel: () => holdEnd(false),
  contextmenu: e => { if (e.target.closest && e.target.closest("[data-hold]")) e.preventDefault(); },
  keydown: e => {
    afterHold = null;
    // a key lets the page play sound too, except Escape, which a browser doesn't count
    if (e.key !== "Escape") unlockSound(e.target);
    const el = e.target.closest ? e.target.closest("[data-hold]") : null;
    if (el && root.contains(el) && (e.key === " " || e.key === "Enter")) { e.preventDefault(); if (!e.repeat) holdStart(el, false); return; }
    if (e.target.id === "tin" && e.key === "Enter") { e.preventDefault(); if (st.edit && st.edit.kind === "pwr") cmdPwrSet(); else cmdTgtSet(); return; }
    /* Enter in the pH box's figures is SAVE, as in the readings box's; a greyed SAVE says why, in the box's line for what
       went wrong */
    const rdIn = !!(e.target.dataset && e.target.dataset.k && e.target.closest && e.target.closest("#ph-box"));
    if ((e.target.id === "phin" || e.target.id === "phtin" || rdIn) && e.key === "Enter" && st.ph) {
      e.preventDefault();
      const go = $("#ph-box .phgo");
      if (go && go.getAttribute("aria-disabled") === "true") explain(go); else phSave();
      return;
    }
    /* the gravity's three pairs: the arrow keys move the choice, as in any group of radio buttons */
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key) && e.target.closest && e.target.closest("#ph-box .rdpick") && st.ph) {
      e.preventDefault(); rdPickStep(e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1); return;
    }
    /* Enter in a timer box presses the editor's main button: START for a new timer, SET for a stopped one, DONE otherwise */
    if (["tnm", "tmin", "tsec"].includes(e.target.id) && e.key === "Enter" && st.tedit) {
      e.preventDefault();
      const go = $(".tedit .tgo"), id = e.target.id;
      if (go) { if (go.getAttribute("aria-disabled") === "true") explain(go); else run(go.dataset.cmd); }
      /* still open (a name refused, or waiting for CraftBeerPi): the box keeps the caret, at its end */
      const box = $("#" + id);
      if (box && document.activeElement !== box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
      return;
    }
    if (e.key === "Escape" && moreOpen()) { closeMore(); const t = $('.tabs a[data-tab="More"]'); if (t) t.focus(); return; }
    /* the strike water box's water and grain boxes: Enter sets, Escape cancels, before anything else Escape closes */
    if (e.target.id === "swvin" && e.key === "Enter") { e.preventDefault(); swVol("set"); return; }
    if (e.target.id === "swgin" && e.key === "Enter") { e.preventDefault(); swGrain("set"); return; }
    if (e.target.id === "swrin" && e.key === "Enter") { e.preventDefault(); swRec("set"); return; }
    /* Enter in BrewStart's time box, or its grain figure, is SET; a greyed SET says why. The box drawn again keeps the
       caret, at its end */
    if ((e.target.id === "bstin" || e.target.id === "bsgin") && e.key === "Enter" && st.bs) {
      e.preventDefault();
      const id = e.target.id, go = $("#bs-box .bsgo");
      if (go && go.getAttribute("aria-disabled") === "true") explain(go); else bsSet();
      const box = $("#" + id);
      if (box && document.activeElement !== box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
      return;
    }
    if (e.key === "Escape" && (st.swVol || st.swGrain || st.swRec)) { st.swVol = null; st.swGrain = null; st.swRec = null; renderAll(); return; }
    /* the pH box: Escape closes it while focus is in it or on its reminder; from elsewhere, once nothing else open is left
       to close first (below) */
    if (e.key === "Escape" && st.ph && st.ph.open && e.target.closest && e.target.closest("#ph-box, #banner")) { phClose(); return; }
    /* the speed chooser: Escape closes it while focus is in it or on SPEED, before anything else open */
    if (e.key === "Escape" && st.spdOpen && e.target.closest && e.target.closest("#spd-box, #clock")) { spdClose(); return; }
    /* a timer's editor: with the timers in the column on one screen, a box open in the column has them make way, the editor
       with them, so Escape is for the box. Beside the drawing the editor is in a box of its own and closes first, unless
       focus is in a box open in the recipe column, which then closes first: Escape closes the box being worked in */
    const inColBox = !!(e.target.closest && e.target.closest("#recipe")) && !!(st.bsOpen || st.pbOpen || st.cmpOpen || st.swOpen || st.rbOpen || st.confirmLoad != null);
    if (e.key === "Escape" && st.tedit && (tHere() !== "col" ? !inColBox : !(ONE_SCREEN.matches && (st.pbOpen || st.cmpOpen || st.swOpen || st.rbOpen || st.bsOpen)))) { st.tedit = null; renderAll(); return; }
    if (e.key === "Escape" && st.bsOpen && st.bs && st.bs.ask && !st.pend.bs) { bsCmd("all-stay"); return; }
    if (e.key === "Escape" && st.bsOpen) { bsClose(); return; }
    if (e.key === "Escape" && st.spdOpen) { spdClose(); return; }
    if (e.key === "Escape" && st.confirmLoad != null) { st.confirmLoad = null; renderAll(); return; }
    // OTHER RECIPE's book
    if (e.key === "Escape" && st.rbOpen) { st.rbOpen = false; renderAll(); return; }
    if (e.key === "Escape" && (st.edit || st.logOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.pbOpen || st.cmpOpen || st.swOpen)) { st.edit = null; st.logOpen = false; st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false; st.pbOpen = false; st.cmpOpen = false; st.swOpen = false; renderAll(); }
    else if (e.key === "Escape" && st.ph && st.ph.open) phClose();
  },
  keyup: e => { if (hold && (e.key === " " || e.key === "Enter")) { e.preventDefault(); holdEnd(true); } },
  /* BrewStart's time box left: looked at once focus has settled, as the column drawn again puts focus back in a new one */
  focusout: e => { if (e.target && e.target.id === "bstin" && st && st.bs) timers.push(setTimeout(bsLeft, 0)); },
  input: e => {
    /* the pH box's figures: kept as typed, SAVE and the sample's range line following them in place, so the caret
       stays where it is (phDraw) */
    if ((e.target.id === "phin" || e.target.id === "phtin") && st.ph) { st.ph[e.target.id === "phin" ? "txt" : "ttxt"] = e.target.value; phDraw(); return; }
    /* the readings box's other figures, the same way */
    if (st.ph && st.ph.f && e.target.dataset && e.target.dataset.k && e.target.closest("#ph-box")) { rdPut(st.ph, e.target.dataset.k, e.target.value); phDraw(); return; }
    /* BrewStart's time box: kept as typed and read (bsTyped), its words, AM and PM, and SET following it in place
       (bsPatch), and said aloud once the brewer stops typing; its grain figure, kept as typed, un-presses the chips */
    if (e.target.id === "bstin" && st.bs) { bsTyped(e.target.value); return; }
    if (e.target.id === "bsgin" && st.bs) {
      st.bs.fig = e.target.value; st.bs.chip = null;
      root.querySelectorAll("#bs-box .bschip").forEach(x => x.setAttribute("aria-pressed", "false"));
      if (st.bs.ask) { st.bs.ask = false; renderAll(); }
      return;
    }
    /* the strike water box's water and grain: kept as typed, and said on SET, without redrawing */
    if (e.target.id === "swgin" && st.swGrain) {
      const x = parseFloat(e.target.value), ok = $("#swgok");
      st.swGrain.val = Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
      if (ok) ok.textContent = st.swGrain.val == null ? "– –" : st.swGrain.val.toFixed(1);
      return;
    }
    if (e.target.id === "swrin" && st.swRec) {
      const x = parseFloat(e.target.value), ok = $("#swrok"), q = swRecPlaces(st.swRec.kind);
      st.swRec.val = Number.isFinite(x) ? Math.round(x * 10 ** q) / 10 ** q : null;
      if (ok) ok.textContent = st.swRec.val == null ? "– –" : st.swRec.val.toFixed(q);
      return;
    }
    if (e.target.id === "swvin" && st.swVol) {
      const x = parseFloat(e.target.value), ok = $("#swvok"), ov = $("#swv-over");
      st.swVol.val = Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
      if (ok) ok.textContent = st.swVol.val == null ? "– –" : st.swVol.val.toFixed(1);
      // the line saying it is more than the HLT holds follows the figure as it is typed
      if (ov) ov.textContent = hltOver(st.swVol.val, swVU());
      return;
    }
    /* the timer editor's boxes: kept as typed, the box keeping its caret. The names' buttons follow the name in place; a
       time typed follows at once in the presets and in START, SAVE or SET, greyed while the boxes make none (tePatch) */
    if (["tnm", "tmin", "tsec"].includes(e.target.id) && st.tedit) {
      if (e.target.id === "tnm") {
        st.tedit.name = e.target.value;
        root.querySelectorAll(".tsug button").forEach((x, i) => x.setAttribute("aria-pressed", String(x.getAttribute("aria-disabled") !== "true" && st.names[i] === e.target.value)));
      } else {
        st.tedit[e.target.id === "tmin" ? "mt" : "st"] = e.target.value;
        const n = teNums(st.tedit);
        if (n.m != null && n.s != null) st.tedit.set = n.m * 60 + n.s;
        tePatch();
      }
      return;
    }
    if (e.target.id !== "tin" || !st.edit) return;
    const x = parseFloat(e.target.value), pwr = st.edit.kind === "pwr", ok = $("#tok");
    if (!Number.isFinite(x)) return;
    st.edit.val = pwr ? Math.round(x) : Math.round(x * 10) / 10;
    if (!ok) return;
    /* the new boil kettle's TARGET: a typed number from the boil point less the margin up is BOIL, and SET says so before
       it is pressed; the box keeps what was typed */
    if (bkNew(st.edit.v) && st.edit.kind === "tgt") {
      const boil = st.edit.val >= bkLetGo();
      ok.textContent = boil ? "BOIL" : `${st.edit.val.toFixed(1)} ${M.U}`;
      root.querySelector(".editor .tboil")?.setAttribute("aria-pressed", String(boil));
    } else ok.textContent = pwr ? String(st.edit.val) : st.edit.val.toFixed(1);
  },
  click: e => {
    if (!root.contains(e.target)) return;
    if (moreOpen() && !e.target.closest('#bd-more, .tabs a[data-tab="More"]')) closeMore();
    if (e.target.closest("#bd-more a")) { closeMore(); return; }
    const tab = e.target.closest(".tabs a");
    if (tab) {
      if (DEMO_MODE) {
        e.preventDefault();
        if (tab.dataset.tab === "BrewScribe") toast("Mockup: this opens BrewScribe in a browser tab of its own, or goes back to that tab if it's open, without reloading it.");
        else if (tab.dataset.tab) toast(tab.dataset.tab === "More" ? "Mockup: MORE holds Fermenter Profile, Plugins, System and About." : `Mockup: this opens the existing ${tab.dataset.tab} page.`);
      } else if (tab.dataset.tab === "More") { e.preventDefault(); toggleMore(tab); }
      // the page's own tab goes nowhere: Brew day on the brew-day screen, SETTINGS, HARDWARE, RECIPE BOOK or BREW STEPS
      // on those pages
      else if (tab.getAttribute("aria-current") === "page") e.preventDefault();
      return;
    }
    const el = e.target.closest("[data-cmd]");
    const held = afterHold;
    afterHold = null;
    if (held && el === held) return;
    if (!el) {
      if (st.logOpen && !e.target.closest(".log")) { st.logOpen = false; renderAll(); }
      if (st.spdOpen && !e.target.closest("#spd-box")) spdClose();
      return;
    }
    if (el.hasAttribute("data-hold")) return;
    if (el.getAttribute("aria-disabled") === "true") { explain(el); return; }
    const cmd = el.dataset.cmd;
    if (cmd === "noop") return;
    /* a button in BrewStart's box pressed with the pointer while it shows a focus ring (the box opened at it): the
       mockup draws the box afresh, so the ring goes; drawn again here, the button stays, so its ring is dropped */
    if (e.detail > 0 && el === document.activeElement && el.closest("#bs-box") && el.matches(":focus-visible")) el.blur();
    run(cmd);
    requestAnimationFrame(() => { if (root && document.activeElement === document.body) root.querySelector(`[data-cmd="${CSS.escape(cmd)}"]`)?.focus({preventScroll: true}); });
  }
};
const onWindow = () => closeMore();
/* the pH box kept inside the window as it changes size (phFit) */
const onPhResize = () => { if (root && st) phFit(); };

/* ---------- clock, step timer, rest timer, reading age ---------- */
/* the graphs' rows: one every 10 s, none while the connection is lost (the mockup's graphTick) */
const gDriven = v => st.v[v].mode === "auto" || (v === "hlt" && hermsOn());
function gOut(v) {
  const a = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null;
  return a && !a.missing ? (a.on ? a.pct : 0) : null;
}
const gRow = (v, t) => [t, st.v[v].pv, gDriven(v) && st.v[v].sv != null ? st.v[v].sv : null, gOut(v)];
function graphTick() {
  // a row every 10 real seconds, at any speed of the demo's clock, as the readings reach the live screen
  if (!st.hist || st.t % (10 * SC())) return;
  if (st.link !== "lost") ["hlt", "mt", "bk"].forEach(v => st.hist.v[v].push(gRow(v, st.t)));
  drawGraphs();
}
/* one of CraftBeerPi's seconds a tick: a real second, or a SIM_TIME_SCALE-th of one in a simulator's moment (st.sim) */
function demoTick() {
  st.t++;
  clockSet();
  /* BrewStart's box follows CraftBeerPi's clock: how long until its time, and whether it has passed */
  if (st.bsOpen) bsPatch(true);
  if (GRAPHS) graphTick();
  if (st.link === "lost") {
    // how long since the last reading is the screen's own wait, so it counts real seconds
    if (st.t % SC() === 0) st.age++;
    root.querySelectorAll(".age").forEach(n => { n.textContent = `Last reading ${st.age} s ago`; });
    const ba = $("#ban-age"); if (ba) ba.textContent = st.age;
    return;
  }
  const r = st.recipe;
  /* CraftBeerPi working USE out: how long it has been at it, and its answer once it comes */
  const sww = st.swd && st.swd.work;
  if (sww) {
    if (st.t - sww.since >= SW_WORK_S) swWorked();
    else setText(root.querySelector("#sw-el"), swSecs(st.t - sww.since));
  }
  /* the levers come after USE: FORECAST's sentence on what would raise USE most, once they're in */
  const swa = st.swd && st.swd.has;
  if (swa && swa.lvAt != null && st.t >= swa.lvAt) { delete swa.lvAt; if (st.swOpen) renderAll(); }
  /* the pre-brew check's box follows CraftBeerPi while it is open: here, the Pi's clock set from the internet */
  if (st.pbOpen && st.pb.clockAt && !st.pb.clock && st.t >= st.pb.clockAt) { st.pb.clock = true; st.pb.clockWhy = null; say("The clock is set now. Every check passes."); renderAll(); }
  const pz = root.querySelector("#pz");
  if (pz && st.a.bkEl.paused) pz.textContent = mmss(pausedFor());
  /* CraftBeerPi's warning, 5 s after a kettle's AUTO started with no target. The boil kettle never gets one:
     BoilPower puts its boil point in as the target as it starts. Under the HERMS the HLT isn't in AUTO itself; the mash
     tun's warning covers it. Raised once, from 5 s on; the demo shows one prompt at a time, so behind a hop alert it waits
     its turn. */
  ["mt", "hlt"].forEach(v => {
    const V = st.v[v];
    if (!noTarget(v)) { V.noTgt = 0; V.warned = false; return; }
    V.noTgt = (V.noTgt || 0) + 1;
    if (V.noTgt < 5 || V.warned || st.banner) return;
    V.warned = true;
    st.banner = DEMO.noTargetBanner(v);
    logEvent(`No target for the ${DEMO.KNAME[v]}`, "waiting for you", "wait");
    say(`No target for the ${DEMO.KNAME[v]}. ${st.banner.text}`, true);
    renderAll();
  });
  /* BoilPower's warning after 2 brewing minutes paused, once per pause, waiting its turn as that one does */
  const pe = st.a.bkEl;
  if (M.BKNEW && pe.paused && !pe.pauseWarned && st.t - pe.pausedAt >= 120 && !st.banner) {
    pe.pauseWarned = true;
    st.banner = DEMO.pauseBanner();
    logEvent(st.banner.title, "waiting for you", "wait");
    say(`${st.banner.title}. ${st.banner.text}`, true);
    renderAll();
  }
  /* CraftBeerPi's alarm for an element on by hand: 2 °F past its
     target, or where BOIL starts, for 30 s of the brewing clock. At most twice a stretch of heating by hand: once past the
     target, once near the boil, so an OK'd alarm left unheeded comes back before the water boils. A stretch ends when the
     element is off, the vessel in AUTO, or the target changes. Behind another prompt it waits its turn here, as the others
     do; live, the title bar puts it first, as CraftBeerPi sends it as an error */
  ["hlt", "bk"].forEach(v => {
    const V = st.v[v], w = byHand(v);
    if (!w || w.t !== V.byT) { V.byFor = 0; V.byRaised = []; V.byT = w ? w.t : undefined; }
    if (!w || !w.over || (V.byRaised || []).includes(w.over)) { V.byFor = 0; return; }
    V.byFor = (V.byFor || 0) + 1;
    if (V.byFor < 30 || st.banner) return;
    V.byRaised = [...(V.byRaised || []), w.over]; V.byFor = 0;
    st.banner = DEMO.byHandBanner(v, w);
    logEvent(`${DEMO.KNAME[v]}: ${st.banner.text}`, "from CraftBeerPi", "bad");
    say(`${DEMO.KNAME[v]}. ${st.banner.text}`, true);
    renderAll();
  });
  if (r && r.state === "running" && r.left > 0 && !r.wait) {
    r.left--;
    const s = M.RECIPE.steps[r.cur], pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) + "%" : "0%";
    ["r-left", "now-left"].forEach(id => { const n = root.querySelector("#" + id); if (n) n.textContent = mmss(r.left); });
    ["r-bar", "now-bar"].forEach(id => { const n = root.querySelector("#" + id); if (n) n.style.width = pct; });
  }
  const t = st.timer;
  if (t && t.running) {
    t.left = Math.max(0, t.left - 1);
    const o = $("#tm-out"); if (o) o.textContent = mmss(t.left);
    if (t.left === 0) {
      t.running = false;
      st.banner = {tone: "prompt", title: "Rest timer", text: "The rest timer has finished.", act: "OK", cmd: "b:ok"};
      logEvent("Rest timer finished", "waiting for you", "wait"); say("Rest timer finished.", true); renderAll();
    }
  }
  if (M.TIMERS) tmTick();
}
function liveTick() {
  const c = clockNow();
  st.t = c ? c.t : null;
  clockSet();
  // the chooser's sentence names this computer's time now
  if (st.spdOpen) spdDraw();
  if (st.bsOpen) bsPatch(true);
  // where CraftBeerPi's clock is: once a minute while connected, and every 5 s until it first says
  if (st.link !== "lost") syncBrewClock();
  if (st.oldAt && Date.now() >= st.oldAt) oldLines();
  if (st.link === "lost") {
    // the graphs go grey, and a dark stretch grows over the time with no readings
    if (H) { H.tick(gRow, false); drawGraphs(); }
    // never connected: calm for the first few seconds, then red
    if (!everConnected) { renderAll(); return; }
    if (everConnected && st.lostAt != null) st.age = Math.floor((Date.now() - st.lostAt) / 1000);
    if (st.age != null) {
      root.querySelectorAll(".age").forEach(n => setText(n, `Last reading ${st.age} s ago`));
      const ba = $("#ban-age"); if (ba) setText(ba, String(st.age));
    }
    return;
  }
  if (last && Object.values(st.expect).some(x => Date.now() > x.until)) { applyLive(last); schedule(); }
  if (last && last.timer && last.timer.running) { st.timer = timerNow(last.timer); const o = $("#tm-out"); if (o) setText(o, mmss(st.timer.left)); }
  if (M.TIMERS) liveTmTick();
  // how long CraftBeerPi has been working USE out, counted on between its messages
  if (st.sw && st.sw.working) setText(root.querySelector("#sw-el"), swSecs(swElapsed()));
  // the strike water as planned still without its forecast after SW_FC_WAIT: MASH drops its WORKING OUT (swWin)
  if (swFcGap && !swFcGap.dropped && Date.now() - swFcGap.at >= SW_FC_WAIT) { swFcGap.dropped = true; renderAll(); }
  // the pre-brew check's box, and COMPARE PROBES, follow CraftBeerPi's check while open
  if ((st.pbOpen || st.cmpOpen) && !pbBusy && !(st.cmpOpen && pbNone) && Date.now() - pbAt >= PB_POLL) pbAsk();
  // a pause counts on CraftBeerPi's clock, from when BoilPower stamped it
  if (st.a.bkEl.paused) {
    const pz = $("#pz"); if (pz) setText(pz, mmss(pausedFor()));
  }
  if (H) {
    if (H.tick(gRow, true)) drawGraphs();
    loadHistory();
  }
}

/* ---------- the screen ---------- */
// root: an empty element the screen owns. o.demo: a mockup moment to show instead of CraftBeerPi.
// o.navigate(path, options): open another page, options.state what it is told. o.removeAlert(id): take an answered prompt down at once.
export function createBrewDay(el, o = {}) {
  if (root) teardown();
  const myGen = ++gen;
  root = el; opts = o; DEMO_MODE = !!o.demo; PAGE = PAGE_TAB[o.page] ? o.page : "";
  /* this tab's name, so BrewScribe's BREW DAY button (target="craftbeerpi") comes back to it rather than opening
     another */
  if (!DEMO_MODE) { try { window.name = "craftbeerpi"; } catch (_) { /* a sandboxed frame: no name */ } }
  timers = []; noteTimers = {}; hold = null; afterHold = null; heldOn = null; pbKeep = null; rigW = 0; tcornerKeep = null; last = null; everConnected = false; book = []; bookBusy = false; bookAgain = false; bookShown = false;
  bookNames = null; bookFor = null;
  tAns = null; tMsg = null; lastBannerKey = null; rangAt = 0; newIds = new Set(); openIds = null; sAns = null; swFailedAt = null; swFcGap = null; bsOff = null; clockSeen = null; stepSeen = null;
  answered.clear(); Object.keys(own).forEach(k => delete own[k]);
  const html = document.documentElement;
  // The stylesheets go in once and stay: every rule is scoped to html.bd-page, so they rest while it is off.
  if (!document.getElementById("bd-style")) {
    const s = document.createElement("style");
    s.id = "bd-style";
    s.textContent = `${BREWDAY_CSS}\n${EXTRA_CSS}`;
    document.head.appendChild(s);
  }
  html.classList.add("bd-page");
  html.dataset.layout = LAYOUT;
  if (PAGE) html.dataset.page = PAGE; else delete html.dataset.page;
  GRAPHS = PAGE || o.graphs === "none" ? "" : "face";
  if (GRAPHS) html.dataset.graphs = GRAPHS; else delete html.dataset.graphs;
  // the span: ?span= for a screenshot, else the one this device last chose (the demo always starts at 30 MIN, as the mockup)
  gSpan = "30";
  let kept = null;
  if (!DEMO_MODE) { try { kept = localStorage.getItem(GSPAN_KEY); } catch (e) { /* private mode */ } }
  for (const s of [o.span, kept]) if (GSPANS.some(x => x[0] === s)) { gSpan = s; break; }
  rigRs = 1; H = null;
  root.innerHTML = skeleton(DEMO_MODE, PAGE);
  // the name: the demo's (?name= tries another, as in the mockup); live, CraftBeerPi's once its settings arrive (applyLive)
  brewery = null;
  if (DEMO_MODE) setBrewery(o.name != null ? o.name : "CraftBeerPi Brewery");
  // BREWSCRIBE: in the demo unless ?brewscribe=none, as in the mockup; live, as this device last found it, until asked
  let bsKept = false;
  if (!DEMO_MODE) { try { bsKept = localStorage.getItem(BS_KEY) === "1"; } catch (e) { /* private mode: not shown until asked */ } }
  showBrewScribe(DEMO_MODE ? o.brewscribe !== "none" : bsKept);
  if (DEMO_MODE && PAGE) {
    /* the Settings page's mockup: a still title bar, at 14:32 with no alarms; the page hands it the last event and the
       connection (demo below) */
    M = {TIMERS: false, BKNEW: false, U: "°F"};
    st = {link: "ok", banner: null, t: 14 * 3600 + 32 * 60, pend: {}, notes: {}, edit: null, tedit: null, logOpen: false,
      confirmNext: false, confirmReset: false, tmrs: [], events: [["14:31:52", "Mash Tun at target, 149.0 °F", "confirmed", "ok"]]};
  } else if (DEMO_MODE) {
    const key = DEMO.SCENES[o.demo] || DEMO.EXTRA[o.demo] ? o.demo : "mash";
    M = {RECIPE: DEMO.RECIPE, VNAME: DEMO.VNAME, VACT: DEMO.VACT, ACT: DEMO.ACT, HERMS_DELTA: DEMO.HERMS_DELTA, BOOK: DEMO.BOOK, U: "°F", LIMITS: [32, 230],
      BOILPOWER: true, BKNEW: true, BKHAND: true, BOIL_TH: DEMO.BOIL_TH, TIMERS: true};
    DEMO.setClock(fmtNow());
    st = (DEMO.SCENES[key] || DEMO.EXTRA[key])();
    // #unload-notinbook: steps built on Brew Steps under a name the Recipe Book doesn't have
    if (st.recipeName) { M.RECIPE = {...M.RECIPE, name: st.recipeName}; delete st.recipeName; }
    // the sparge-… moments run a recipe whose step 4 is a SpargeStep; every other moment keeps the MashStep
    if (st.sparge4) M.RECIPE = {...DEMO.RECIPE, steps: DEMO.RECIPE.steps.map((s, i) => i === 3 ? {...DEMO.SPARGE_STEP, ...st.sparge4} : s)};
    // #check-adds and #check-many: a recipe with eight boil additions, of which the boil step holds the first six
    if (st.adds5) M.RECIPE = {...M.RECIPE, steps: M.RECIPE.steps.map((s, i) => i === 4 ? {...s, adds: st.adds5} : s)};
    /* the strike water moments put the brewer's own flow in front of the recipe, BrewStart (SW_STEPS), at the strike
       water's temperature in that moment; #sw-hand has the recipe as imported, without it, and #bs-new without
       BrewStart. BrewStart is Ready by 07:00 on brew day, the moment's second day,
       and anything else a moment changes is in swd.bs. Where the grain spent the night is answered unless a moment says
       otherwise (swd.where, null for not yet): in the garage with BrewStart's grain temperature blank, so the boil
       kettle's probe stands for it, and indoors with a figure. swd.stepGrain: MashIn has its grain weight, as Test
       Recipe v5's import gave it (#sw-missing) */
    if (st.swd && !st.swd.hand) {
      const d = st.swd, where = d.where !== undefined ? d.where : d.grain == null ? "garage" : "indoors";
      M.RECIPE = {...M.RECIPE, steps: DEMO.SW_STEPS.filter(s => !(d.noBS && s.type === "BrewStart"))
        .map(s => ({...s, temp: d.plan, ...(s.type === "BrewStart" ? {vol: d.vol, grain: d.grain, where, date: dateOf(1), ...d.bs} : {})}))
        .concat(M.RECIPE.steps.map((s, i) => i === 0 && d.stepGrain ? {...s, kg: DEMO.SW_GRAIN_KG} : s))};
    }
    // a moment can open an editor (open) and borrow another moment's graph history (base)
    const open = st.open, base = st.base || key;
    delete st.open; delete st.base;
    Object.assign(st, {scene: key, pend: {}, notes: {}, edit: null, confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null, logOpen: false, pbOpen: false, cmpOpen: false, rbOpen: false, swOpen: false, swVol: null, swGrain: null, swRec: null, bsOpen: false, bs: null, spdOpen: false, spdPend: null}, open);
    /* BrewScribe as the moment has it, and Brew Day's copy of its answer (phLoad) */
    phLoad();
    /* the strike water box: CraftBeerPi's answer for the moment's numbers, worked out already, unless the moment has it
       working one out (swd.has: null) */
    if (st.swd && st.swd.has === undefined) st.swd.has = SWD.swNow(st, M);
    // a box or CHECKING… a moment opens belongs to the recipe it shows, as one START opens does
    if (st.pbOpen || st.pend["r:check"]) st.pbFor = recipeOn();
    // CraftBeerPi's answers to the pre-brew check: all pass, unless a moment says otherwise
    if (!st.pb) st.pb = {clock: true, none: {}, adds: {n: M.RECIPE.steps[4].adds.length, missed: []}};
    if (st.v.bk.bp == null) st.v.bk.bp = 45; // the boil kettle's Boil_Power setting, read from its props
    if (st.a.bkEl.lvl == null) st.a.bkEl.lvl = 100; // the boil element's own level (its power), used when it is on by hand
    if (st.v.bk.usual === undefined) st.v.bk.usual = 45; // its Usual_Boil_Power setting; null: none set
    if (st.v.bk.keep == null) st.v.bk.keep = true; // its Keep_Boiling setting, "Yes" unless the brewer unticks it
    if (st.v.bk.boilAt == null) st.v.bk.boilAt = DEMO.BOIL_TH; // its boil point, Boil_Threshold (BOIL AT)
    // the timers: the moment's own, or none; SOUND off unless the moment has it on; no editor unless the moment opens one
    st.tmrs = (st.tmrs || []).map(t => ({run: t.set, ...t}));
    if (!st.snd) st.snd = {on: false, ok: true};
    if (st.tedit === undefined) st.tedit = null;
    // BREWDAY_TIMER_NAMES: its default, or the moment's own list
    st.names = st.names || TNAMES.slice();
    // BREWDAY_ALARM_SOUND: its default, or the moment's own
    st.alarmSound = soundOf(st.alarmSound || DEFAULT_SOUND);
    // the moment's own alert was there as it opened: it doesn't beep
    lastBannerKey = bannerKey(st.banner);
    if (GRAPHS) {
      st.hist = DEMO.history(base, st.t, {pbDay: st.pbDay, pv: {hlt: st.v.hlt.pv, mt: st.v.mt.pv, bk: st.v.bk.pv}, last: st.pbLast, sw: st.swd && st.swd.g, hltSv: st.v.hlt.sv});
      /* a probe that has given no reading for a while: its graph has a gap, dark, for that time */
      if (st.gap) Object.entries(st.gap).forEach(([v, s]) => st.hist.v[v].forEach(row => { if (row[0] > st.t - s) row[1] = null; }));
    }
    applyLocks();
  } else {
    st = blankMoment();
    phInit();
    M = model({book});
    // a warning's line kept from an earlier page is plain: this page's title bar has none of them (warningsGone)
    warningsGone();
    // the timers until CraftBeerPi says it has none (applyLive)
    M.TIMERS = true;
    if (GRAPHS) { H = createHistory(); st.hist = H.hist; }
    // shown until the first connection, and never kept: e[5] is 0. It has no time: CraftBeerPi hasn't said its clock yet
    if (!st.events.length) st.events.unshift(["", "Connecting to CraftBeerPi", "", "", "", 0]);
    // where CraftBeerPi's clock is, as the page opens
    syncBrewClock(true);
  }
  renderAll();
  /* a moment can show a greyed button tapped: its reason in its note line (tap: #unload-running, #unload-wait) */
  if (DEMO_MODE && st.tap) { const el = $(`[data-cmd="${st.tap}"]`); delete st.tap; if (el) explain(el); }
  /* a moment can open BrewStart's box, as its row or + BrewStart does (bsAt: what it opens it with) */
  if (DEMO_MODE && st.bsAt) { const o = st.bsAt; delete st.bsAt; bsOpen({...o, now: true}); }
  /* a moment can open the pH box, as RECORD pH does (phAt: what it opens it with), put focus on LOG, as SAVE does once
     it is done (phLog), or on RECORD, as a SAVE that leaves the reminder up does (phRec), and have the reminder answered
     on another screen some real milliseconds on (phElse) */
  if (DEMO_MODE && st.phAt) { const o = st.phAt; delete st.phAt; phOpen(Object.assign({moment: true}, o)); }
  if (DEMO_MODE && st.phLog) { delete st.phLog; void root.offsetHeight; (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (gen === myGen && root) $("#event .logbtn")?.focus(); }); }
  if (DEMO_MODE && st.phRec) { delete st.phRec; void root.offsetHeight; (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (gen === myGen && root) $('#banner [data-cmd="ph:open"]')?.focus(); }); }
  if (DEMO_MODE && st.phElse) { const ms = st.phElse; delete st.phElse; timers.push(setTimeout(() => { if (gen === myGen && st) phElsewhere(); }, ms)); }
  /* a moment can show FORECAST's details scrolled to a part of them (swAt: #sw-levers, the sentence on what would
     raise USE most) */
  if (DEMO_MODE && st.swAt) {
    const at = st.swAt;
    delete st.swAt;
    requestAnimationFrame(() => { const el = gen === myGen && root && $(at); if (el) el.scrollIntoView({block: "center"}); });
  }
  for (const k in handlers) document.addEventListener(k, handlers[k]);
  window.addEventListener("resize", onWindow);
  window.addEventListener("resize", onPhResize);
  window.addEventListener("scroll", onWindow, {passive: true});
  if (window.visualViewport) window.visualViewport.addEventListener("resize", onKeyboard);
  // the Settings and Hardware pages' lines from another tab (onStorage), so a save there shows here
  if (!DEMO_MODE) window.addEventListener("storage", onStorage);
  // the Settings page's demo stands still, as its mockup's title bar does
  const tock = () => gen === myGen && st && !(DEMO_MODE && PAGE);
  /* a tick a second; a simulator's moment (st.sim) runs the demo's clock, and everything on it, SIM_TIME_SCALE times as
     fast: every 50 ms the seconds due by the real time since it began, so the page keeps up at any size. Started again
     at a new speed (retick: a speed chosen in the demo) */
  let ticker = 0, tickSc = 0;
  const startTick = () => {
    const sc = DEMO_MODE && st && st.sim ? st.sim.scale : 1;
    if (ticker && sc === tickSc) return;
    clearInterval(ticker); tickSc = sc;
    if (sc === 1) { ticker = setInterval(() => { if (tock()) (DEMO_MODE ? demoTick : liveTick)(); }, 1000); return; }
    const t0 = performance.now();
    let done = 0;
    ticker = setInterval(() => {
      if (!tock()) return;
      const due = Math.floor((performance.now() - t0) / 1000 * sc), n = Math.min(due - done, sc);
      for (let i = 0; i < n && tock(); i++) demoTick();
      done = Math.max(done + n, due - sc);
    }, 50);
  };
  startTick();
  retick = () => { if (gen === myGen) startTick(); };
  const ro = PAGE ? null : new ResizeObserver(drawRig);
  if (ro) ro.observe($("#rig"));
  /* the pH box follows its reminder as the title bar changes size, and Brew Day asks BrewScribe again on its own time
     (phPoll), every real second */
  const phro = new ResizeObserver(() => { if (gen === myGen && st) phFit(); });
  phro.observe($("#banner"));
  const phTick = setInterval(() => { if (gen === myGen && st) phPoll(); }, 1000);
  /* the faceplates' width crossing 276 px inside moves the boil power's steps and a box's keys between one row and two;
     the recipe column going under the brewhouse, or back beside it, decides whether the steps' row keeps its place; and
     a new width for the recipe column, which changes with the faceplates', drops the check box's kept height (pbFit) */
  const pro = PAGE ? null : new ResizeObserver(() => {
    if (gen === myGen && st && (platesTight() !== TIGHT || mainStacked() !== STACKED || (pbKeep && $("#recipe").clientWidth !== pbKeep.w))) renderAll();
  });
  if (pro) pro.observe($("#plates"));
  // each graph is drawn to its box: again when the boxes change size, and when the fonts arrive, which widens them
  const gro = GRAPHS ? new ResizeObserver(() => drawGraphs()) : null;
  if (gro) gro.observe($(".brewhouse"));
  const onFonts = () => { if (gen === myGen) drawGraphs(); };
  if (GRAPHS && document.fonts) document.fonts.addEventListener("loadingdone", onFonts);
  /* the current step whole again once the fonts are in, and as the recipe column changes size; the strike water's chart
     too. BrewStart's hint is fitted again (bsFit): once the fonts are in, before the step; after a change of size, in the
     next frame, as on a phone fitting it can change the column's height again */
  const rro = PAGE ? null : new ResizeObserver(() => {
    if (gen !== myGen || !st) return;
    keepStepInView(true); drawSw();
    requestAnimationFrame(() => { if (gen === myGen && st && root && bsFit()) keepStepInView(); });
  });
  if (rro) rro.observe($("#recipe"));
  const onFontsStep = () => { if (gen === myGen && st && !PAGE) { bsFit(); keepStepInView(true); } };
  if (document.fonts) document.fonts.addEventListener("loadingdone", onFontsStep);
  /* the timers move between the recipe column and their column beside the drawing as the window crosses one screen's
     width; the rows hold what fits as it changes size; + TIMER and SOUND over the drawing's corner, and the rows, are
     worked out again once the fonts are in, which change the words' widths and the drawing's labels */
  const onOneScreen = () => { if (gen === myGen && st && !PAGE) renderAll(); };
  if (!PAGE) ONE_SCREEN.addEventListener("change", onOneScreen);
  const tro = PAGE ? null : new ResizeObserver(() => { if (gen === myGen && st) tPlaceFit(); });
  if (tro) tro.observe($("#app"));
  const onFontsSide = () => { if (gen === myGen && st && !PAGE) { tPlaceFit(); tsideCorner(); } };
  if (document.fonts) document.fonts.addEventListener("loadingdone", onFontsSide);
  function teardownThis() {
    clearInterval(ticker);
    clearInterval(phTick);
    phro.disconnect();
    if (ro) ro.disconnect();
    if (pro) pro.disconnect();
    if (gro) gro.disconnect();
    if (rro) rro.disconnect();
    if (tro) tro.disconnect();
    ONE_SCREEN.removeEventListener("change", onOneScreen);
    if (document.fonts) { document.fonts.removeEventListener("loadingdone", onFonts); document.fonts.removeEventListener("loadingdone", onFontsStep); document.fonts.removeEventListener("loadingdone", onFontsSide); }
  }
  teardown = () => {
    teardownThis();
    for (const k in handlers) document.removeEventListener(k, handlers[k]);
    window.removeEventListener("resize", onWindow);
    window.removeEventListener("resize", onPhResize);
    window.removeEventListener("scroll", onWindow);
    if (window.visualViewport) window.visualViewport.removeEventListener("resize", onKeyboard);
    window.removeEventListener("storage", onStorage);
    timers.forEach(clearTimeout); Object.values(noteTimers).forEach(clearTimeout); clearTimeout(toastT);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (hold) clearTimeout(hold.timer);
    hold = null;
    html.classList.remove("bd-page");
    delete html.dataset.layout;
    delete html.dataset.page;
    delete html.dataset.graphs;
    delete html.dataset.bk;
    delete html.dataset.timers;
    if (actx) { try { actx.close().catch(() => {}); } catch (e) { /* already closed */ } }
    actx = null;
    H = null; bclk = null; bclkAt = 0; bclkBusy = false; retick = () => {};
    if (root) root.innerHTML = "";
    root = null; st = null; gen++;
    teardown = () => {};
  };
  return {
    update(snap) {
      if (gen !== myGen || DEMO_MODE || !snap) return;
      const prev = last;
      last = snap;
      applyLive(snap);
      // the graphs' step marks: when each step started, as CraftBeerPi keeps it
      if (H) H.steps(snap.steps);
      if (snap.connected && !everConnected) {
        if (st.events[0] && st.events[0][5] === 0) st.events.shift();
        // the page's own ask for CraftBeerPi's clock may have gone before CraftBeerPi could answer
        if (!bclk) syncBrewClock(true);
        /* a fresh page says it's connected when nothing is kept, or when the newest line kept is a lost connection. That
           line can come from the page this one replaced, logged as it closed, and nothing else would follow it, as this
           page never lost its own connection, and the tab would show "Connection to CraftBeerPi lost · trying again"
           while connected */
        if (!st.events.length || st.events[0][1] === LOST) logEvent("Connected to CraftBeerPi", "", "");
        if (!PAGE && !st.recipe) loadBook();
        probeBrewScribe();
        if (simv == null) simvAsk();
      }
      /* CraftBeerPi's clock set back to the computer's time. One heard before this screen opened is old news: the
         screen asks where the clock is as it opens */
      if (snap.clock !== clockSeen) { const heard = prev != null && !!snap.clock; clockSeen = snap.clock; if (heard) clockReset(snap.clock); }
      /* the questions CraftBeerPi was waiting on as this page first connected: it sends them again then, and they haven't
         just arrived (observe). Taken before observe, as they can come in the same update as its list */
      if (openIds == null && snap.waiting && snap.waiting.n === 1) openIds = new Set(snap.waiting.ids() || []);
      observe(prev, snap);
      noLongerWaiting(snap);
      seenElsewhere(snap);
      if (snap.connected) everConnected = true;
      schedule();
    },
    /* for the Settings, Hardware and recipe pages (page "settings", "hardware", "recipes" or "brewsteps"): its host;
       the last-event line, the screen reader's line and the toast, which it shares; MORE's list; and in the Settings
       page's demo, the title bar's connection and last events, from its mockup */
    host: PAGE ? $("#sp") : null,
    log(what, res, tone, cav = "") { if (gen === myGen && st) { logEvent(what, res, tone, cav, true); schedule(); } },
    say(text, urgent) { if (gen === myGen && st) say(text, urgent); },
    toast(text) { if (gen === myGen && st) toast(text); },
    closeMore() { if (gen === myGen && st) closeMore(); },
    demo(x) {
      if (gen !== myGen || !st || !DEMO_MODE || !PAGE || !x) return;
      if (x.link) st.link = x.link;
      if (x.events && x.events.length) st.events = x.events.map(e => e.slice());
      if ("name" in x) setBrewery(x.name);
      renderAll();
    },
    destroy() { if (gen === myGen) teardown(); }
  };
}
/* another tab's Settings and Hardware lines, so a save there reaches a brew-day screen open in another tab: added here
   in time order, and kept with this tab's own lines from then on. Only those: every tab logs what it sees CraftBeerPi do
   (the connection, its messages, the steps), so taking the other tab's list would show each of those twice. Read from
   the event, not from storage, which this tab may already have written over */
function onStorage(e) {
  if (e.key !== EVENTS_KEY || !st || DEMO_MODE) return;
  const have = new Set(st.events.map(x => `${x[5]}|${x[1]}`));
  const add = loadEvents(e.newValue).filter(x => x[6] && !have.has(`${x[5]}|${x[1]}`));
  if (!add.length) return;
  // "Connecting to CraftBeerPi", never kept (0), stays first
  st.events = st.events.concat(add).sort((a, b) => (b[5] || Infinity) - (a[5] || Infinity)).slice(0, 50);
  schedule();
}
