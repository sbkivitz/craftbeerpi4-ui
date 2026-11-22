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
//   a new list shows at once. A timer's alarm is CraftBeerPi's
//   kept prompt, which the title bar shows with +5 MIN as the lesser button. SOUND is this browser's own, kept on this
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
import { rigSVG, RIG_H } from "./rig";
import * as DEMO from "./demo";
import * as SWD from "./strike-demo";
import { api, why as failWhy } from "./api";
import { model, num, parseLeft, bookLine, isHerms, unitText, ROLES, cfg, timerNames } from "./live";
import { play as playSound, soundOf, DEFAULT_SOUND, SOUNDS } from "./alarm";
import { GSPANS, GSAY, graphHTML, graphSVG, graphETA } from "./graphs";
import { createHistory } from "./history";
// As text, exactly as written (config-overrides.js): the CSS pipeline would rewrite the mockup's colours.
import BREWDAY_CSS from "./brewday.css";
import EXTRA_CSS from "./brewday-extra.css";

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const f1 = n => n == null ? "– –" : n.toFixed(1);
const pad = n => String(n).padStart(2, "0");
const mmss = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
const hhmm = t => `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}`;
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
const daySeconds = (d = new Date()) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
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
/* the timers: four at most, as the server keeps them. TPRE: the editor's minutes. The names to pick are CraftBeerPi's
   BREWDAY_TIMER_NAMES, sent with the timers as `names`. TNAMES is its default, which the demo offers; TNLEN a name's
   length; TNMAX how many buttons the editor has room for: two rows of three */
const TMAX = 4, TPRE = [5, 10, 15, 20, 30, 60];
const TNAMES = ["Hop stand", "Yeast", "Vorlauf"], TNLEN = 24, TNMAX = 6;
const tfmt = DEMO.tfmt;
// SOUND, for the timers and CraftBeerPi's alerts, on this device only: the phone can stay quiet while the monitor beeps
const SOUND_KEY = "cbpi.brewday.sound";
// how CraftBeerPi words a timer's alarm (TimersController._finish), to know it before the timers' own message names it
const TIMER_RAN_OUT = /^The \d+(?::\d\d){1,2} timer has run out\.$/;

/* ---------- the screen's markup: the mockup's page, after layout B's moves ---------- */
const MORE = [["#/dashboard", "Dashboard"], ["#/fermenterprofile", "Fermenter profile"], ["#/plugins", "Plugins"], ["#/system", "System"], ["#/about", "About"]];
/* page: "" the brew-day screen; "settings" or "hardware", its frame (title bar, last event, tabs) round the Settings or
   Hardware page, whose host (#sp) takes the brewhouse's place and which draws itself (settings/page.js,
   hardware/page.js) */
const PAGE_TAB = {settings: "Settings", hardware: "Hardware"};
function skeleton(demo, page) {
  const h = p => demo ? "#tab" : p;
  const cur = t => (PAGE_TAB[page] || "") === t ? ' aria-current="page"' : "";
  return `<div class="app" id="app" data-link="ok">
  <header class="topbar">
    <p class="brand"><span class="bname">CraftBeerPi Brewery</span></p>
    <div class="banner" id="banner" data-tone="ok"></div>
    <p class="link" id="link" data-link="ok"><i aria-hidden="true"></i><span id="link-t">Connected</span></p>
    <button class="alloff" id="alloff" data-cmd="alloff" type="button">ALL OFF</button>
    <p class="clock" id="clock">14:32</p>
  </header>

  <section class="status" aria-label="Alarms and the last event">
    <div class="event" id="event"></div>
  </section>

  <nav class="tabs" aria-label="Screens">
    <a href="${h("#/")}" data-tab=""${cur("")}>Brew day</a>
    <a href="${h("#/mashprofile")}" data-tab="Brew Steps"><span class="long">Brew steps</span><span class="short">Steps</span></a>
    <a href="${h("#/recipes")}" data-tab="Recipe Book"><span class="long">Recipe book</span><span class="short">Recipes</span></a>
    <a href="${h("#/charting")}" data-tab="Analytics">Analytics</a>
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
let last = null, everConnected = false, book = [], bookBusy = false, bookShown = false;
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
/* CraftBeerPi's brewing clock, in its own seconds (the wall clock on the rig, SIM_TIME_SCALE times as fast in a simulation),
   which BoilPower stamps a pause with (Paused_At), so every screen counts the same pause. While the heat is paused, a log
   window that reads no logs says where it is, once a minute; until the first answer, the graphs' history's clock. */
let bclk = null, bclkAt = 0;
function brewNow() {
  if (bclk) return bclk.srv + (Date.now() - bclk.at) / 1000 * bclk.scale;
  return H ? H.now() + H.day() : null;
}
async function syncBrewClock() {
  if (DEMO_MODE || Date.now() - bclkAt < 60000) return;
  bclkAt = Date.now();
  const g = gen;
  let res = null;
  try { res = await api.logWindow([], null, null); } catch (e) { res = null; }
  const d = res && res.ok && res.data;
  if (g !== gen || !d || typeof d !== "object" || !(num(d.now) > 0)) return;
  bclk = {srv: num(d.now), at: Date.now(), scale: num(d.scale) > 0 ? num(d.scale) : 1};
  schedule();
}
function pausedFor() {
  const el = st.a.bkEl, now = DEMO_MODE ? st.t : brewNow();
  return now == null || el.pausedAt == null ? 0 : Math.max(0, Math.floor(now - el.pausedAt));
}
/* the line under the boil kettle's window */
function bkLine() {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT(), U = M.U;
  if (V.mode !== "auto") { const w = byHand("bk"); return w ? byHandLine("bk", w) : "MANUAL · element by hand"; }
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
   small "change" like every other button's, so it reads as a control. Its tap area is at least 44 px tall. */
function boilReadHTML() {
  const V = st.v.bk, pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  return `<button type="button" class="svbtn" data-cmd="pwr:bk" aria-expanded="${!!st.edit && st.edit.kind === "pwr"}" aria-label="Boil power ${V.bp} percent: change"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="svv">${V.bp}<span class="u">%</span></span><small>${pend === "set" ? "sending…" : "change"}</small></button>`;
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
  const V = st.v.bk, pend = st.pend["p:bk"];
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : d < 0 && V.bp <= 0 ? "The boil power is already 0 %." : d > 0 && V.bp >= 100 ? "The boil power is already 100 %." : "";
  /* waiting for CraftBeerPi, all four are greyed and the one pressed shows the lamps' marching stripes; the wait is kept
     under the step itself, so −5 and −1 can't both look pressed. The spoken name says "percent" */
  return b(`cmdbtn nudge${pend === String(d) ? " sending" : ""}`, `${d < 0 ? "−" : "+"}${Math.abs(d)} %`, "",
    {cmd: `pnudge:${d}`, why, label: `Boil power ${d < 0 ? "down" : "up"} ${Math.abs(d)} percent`});
}
/* the element button in AUTO: not locked, a tap pauses the heat (set_paused) and keeps AUTO, the recipe and the boil power;
   PAUSED, in Prompt Amber, heats again with a held press, like any heat. In MANUAL it is the usual element button. */
function bkLampHTML() {
  const a = st.a.bkEl, V = st.v.bk, pend = st.pend["a:bkEl"], name = M.ACT.bkEl.name;
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
/* the steps show only while AUTO can use the boil power: not in MANUAL, where they would seem to set the element's own
   level, nor in a hold, nor while the boil kettle's box is open, which has steps of its own */
const bkNudges = () => !!M.BKNEW && st.v.bk.mode === "auto" && !bkHolding() && !(st.edit && st.edit.v === "bk");
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
  return `<dl class="aux"><dt>OUT</dt><dd>${el ? pct + " %" : "– –"}<span class="outbar"${el ? "" : ' style="visibility:hidden"'} aria-hidden="true"><i style="width:${pct}%"></i></span></dd><dt>MODE</dt><dd>${mode}</dd></dl>`;
}
function hermsRowHTML() {
  const why = st.link === "lost" ? PAUSED : `The mash tun's AUTO runs this vessel for the HERMS: it switches the HLT element and sets this target up to the mash tun's target plus ${M.HERMS_DELTA} ${M.U}. Switch the mash tun to MANUAL to take the HLT over.`;
  return `<div class="moderow"><button type="button" class="tgtbtn herms" data-cmd="noop" aria-disabled="true" data-why="${esc(why)}"><span class="lb">HERMS</span><small>run by the mash tun · switch it to MANUAL to take over</small></button></div>`;
}
/* the faceplate's second readout: the SV; the new boil kettle's is its hold, read like the HLT's target, or while its target
   is BOIL, the boil power, and its button */
function svCell(v) {
  const V = st.v[v], u = `<span class="u">${M.U}</span>`;
  if (!bkNew(v)) return ["SV", V.sv == null ? "– –" : f1(V.sv) + u];
  const ho = bkHoldT();
  return ho != null ? ["SV", f1(ho) + u] : ["BOIL", boilReadHTML()];
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
  const pS = st.pend["r:start"], pX = st.pend["r:stop"], pN = st.pend["r:next"], pC = st.pend["r:check"], pU = st.pend["r:unload"];
  /* while UNLOADING… waits, the recipe's own commands wait with it, greyed */
  const sOff = off || (pU ? WAIT : "");
  const start = pC ? `<button type="button" class="lamp" data-state="pending" data-cmd="noop" aria-disabled="true" data-why="${PB_WAIT}"><span class="st">CHECKING…</span><span class="nm">before it starts</span></button>`
    : pS ? `<button type="button" class="lamp" data-state="pending" data-cmd="noop" aria-disabled="true" data-why="${WAIT}"><span class="st">STARTING…</span><span class="nm">recipe</span></button>`
    : run ? `<button type="button" class="lamp" data-state="running" data-cmd="noop" aria-disabled="true" data-why="The recipe is already running."><span class="st">RUNNING</span><span class="nm">step ${r.cur + 1} of ${S.length}</span></button>`
    : `<button type="button" class="lamp" data-state="off" data-cmd="r:start"${sOff ? ` aria-disabled="true" data-why="${sOff}"` : " data-hold"}>${sOff ? "" : '<span class="fill"></span>'}<span class="st">START</span><span class="nm">hold to start</span></button>`;
  /* the middle button: STOP while a step runs; RESET, to reset the brew day's progress after a stop, while nothing
     runs and some step has begun (stopped, failed, done, or the boil held for you), as a stopwatch's Reset shows once
     it is stopped. CraftBeerPi refuses a reset while a step runs. On a recipe not begun, STOP is greyed. RESET asks
     first (resetConfirmHTML) */
  const pR = st.pend["r:reset"], begun = r.state === "stopped" || r.cur > 0;
  const stop = !run && (begun || pR) ? b("cmdbtn", pR ? "RESETTING…" : "RESET", "back to step 1", {cmd: "r:reset", why: off || (pR || pU ? WAIT : "")})
    : b("cmdbtn", pX ? "STOPPING…" : "STOP", run ? "tap to stop" : "not running", {cmd: "r:stop", why: off || (pX ? WAIT : "") || (!run ? "The recipe is not running." : "")});
  const last = r.cur >= S.length - 1, notBegun = r.state === "ready" && !r.held;
  /* held before the boil, NEXT STEP is greyed and says how to start it (HELD_NEXT): CraftBeerPi would take it as "start the
     boil". The same on a recipe loaded or reset and not begun, where NEXT would start its first step (NOT_BEGUN) */
  const next = b("cmdbtn", pN ? "MOVING ON…" : "NEXT STEP", last ? "last step" : notBegun ? "not started" : `to ${esc(S[r.cur + 1].n)}`, {cmd: "r:next", why: off || (pN || pU ? WAIT : "") || (r.held ? HELD_NEXT : "") || (notBegun ? NOT_BEGUN(S[r.cur]) : "") || (last ? "This is the last step." : "")});
  const unl = b("unl", pU ? "UNLOADING…" : "UNLOAD", "", {cmd: "r:unload", label: pU ? "" : "Unload the recipe", why: unloadRule().why || ""});
  return `<h2>${esc(M.RECIPE.name)}</h2>
    <div class="rstat"><p class="rmeta">${run ? "Running" : r.state === "ready" ? "Ready to start" : "Stopped"} · step ${r.cur + 1} of ${S.length}</p>${unl}</div>
    <div class="rctl">${start}${stop}${next}</div>
    ${st.confirmNext ? confirmHTML() : st.confirmReset && !run && begun ? resetConfirmHTML() : st.confirmUnload && !run && unloadAsks(r) ? unloadAskHTML() : st.pbOpen ? pbHTML() : pbFresh() ? cmpHTML() : ""}
    ${swHTML()}
    <p class="note">${esc(st.notes.r || "")}</p>
    <ol class="steps" aria-label="Recipe steps">${S.map(stepHTML).join("")}</ol>${M.TIMERS ? timersHTML() : ""}`;
}
function confirmHTML() {
  const r = st.recipe, cur = M.RECIPE.steps[r.cur], nx = M.RECIPE.steps[r.cur + 1];
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Skip the rest of <b>${esc(cur.n)}</b>${cur.min ? ` (${mmss(r.left)} left)` : ""} and start <b>${esc(nx.n)}</b>${nx.temp ? ` at ${nx.temp} ${M.U}` : ""}?</p><div><button type="button" class="yes" data-cmd="r:next-yes">SKIP TO ${esc(nx.n.toUpperCase())}</button><button type="button" data-cmd="r:next-no">KEEP GOING</button></div></div>`;
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
  if (["r:unload", "r:start", "r:stop", "r:next", "r:reset", "r:load", "sw", "swv", "swg"].some(k => P[k])) return {why: WAIT};
  if (r.state === "running") return {why: unloadRunWhy(r)};
  return unloadAsks(r) ? {ask: true} : {};
}
const unloadAsks = r => r.state === "stopped" || r.cur > 0 || inBook() !== true;
/* what runs, in brewing words, as the recipe pages' greyed LOAD says it: the step and what it waits for, as its row
   says it, or its time left. BrewStart planning Ready by names its kettle (its Heat_Kettle), its water's temperature
   and the time */
function unloadRunWhy(r) {
  const s = M.RECIPE.steps[r.cur], U = M.U, at = s.temp == null ? "" : s.type === "SpargeStep" ? ` the water to ${s.temp} ${U}` : ` to ${s.temp} ${U}`;
  const starts = typeof r.wait === "string" && r.wait.startsWith("STARTS ") ? r.wait.slice(7) : "";
  const what = s.type === "BrewStart" ? (s.ready ? `BrewStart is waiting to have the ${s.kn || (DEMO_MODE ? DEMO.KNAME[s.k] : "kettle")} at ${s.temp} ${U} by ${s.ready}` : `BrewStart is waiting to start${starts ? ` at ${starts}` : ""}`)
    : r.wait === WAITING_FOR_YOU ? `${s.n}, waiting for you`
    : r.wait === true || r.wait === "HEATING" ? `${s.n}, heating${at}` : r.wait === "COOLING" ? `${s.n}, cooling${at}`
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
   whose steps stay loaded, all done, until another is loaded, under the by-hand list. One the book has, or none at all,
   loads with one tap. Its question takes the list's place. Live, a finished recipe is steps loaded that show no recipe
   in the column */
const finishedLoaded = () => !st.recipe && (DEMO_MODE ? !!st.finished : M.RECIPE.steps.length > 0);
const loadAsks = () => finishedLoaded() && inBook() !== true;
function loadAskHTML() {
  const x = M.BOOK[st.confirmLoad], to = esc(x ? x.n : ""), name = esc(M.RECIPE.given ?? M.RECIPE.name), kept = inBook();
  const said = !name ? `Load ${to} in place of the steps on Brew Day? They aren't in the Recipe Book, so they can't be loaded again. Save them there on Brew Steps to keep them.`
    : kept === false ? `Load ${to} in place of ${name}? ${name} isn't in the Recipe Book, so it can't be loaded again. Save it there on Brew Steps to keep it.`
    : `Load ${to} in place of ${name}? The Recipe Book can't be checked right now, so ${name} may not be there to load again. Save it there on Brew Steps to keep it.`;
  return `<div class="confirm" role="group" aria-labelledby="ld-t"><p id="ld-t">${said} Kettles, pumps and ${M.TIMERS ? "timers" : "the rest timer"} stay as they are.</p><div><button type="button" class="yes" data-cmd="r:load-yes">LOAD INSTEAD</button><button type="button" data-cmd="r:load-no">DON'T LOAD</button></div></div>`;
}
/* LOAD in the by-hand list: one tap, unless it would replace a finished recipe the Recipe Book doesn't have, when it asks
   first (loadAskHTML); LOAD INSTEAD comes back here */
function loadPress(i, asked) {
  if (!asked && loadAsks()) { st.confirmLoad = i; return renderAll(); }
  st.confirmLoad = null;
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
  st.pbOpen = false; st.cmpOpen = true;
  if (!DEMO_MODE) { st.pb = null; if (!pbNone) pbAsk(); }
  renderAll();
}
/* the questions about the brew that wait for you, which a reset takes down (StepController.reset_all; BrewScribe its own):
   those under a step's name, the hop alerts, Brewing Complete, Resume brew? and BrewScribe's; not a timer's alarm, nor a
   warning, nor another plugin's question. Live, the ones CraftBeerPi waits on; in the demo, as the mockup finds them, by
   their lines in LOG */
function brewQuestions() {
  const names = new Set([...M.RECIPE.steps.map(s => s.n), "Hop Alert", "Brewing Complete", "Resume brew?", "BrewScribe"]);
  if (!DEMO_MODE) return st.prompts.map(p => ut(String(p.title || ""))).filter(t => names.has(t));
  return st.events.filter(e => e[2] === "waiting for you" && names.has(e[1].split(":")[0])).map(e => e[1].split(":")[0]);
}
/* ---------- the strike water box (design/brewday/STRIKE-WATER.md) ----------
   Under START, STOP and NEXT STEP (and COMPARE PROBES), from the recipe's loading until the malt goes in: how much
   water goes to the mash tun and how hot, where the mash lands once the grain is in, and the forecast and its numbers.
   It offers USE, which puts the strike temperature the forecast works out in the recipe for the strike water, and then
   BACK TO, in the same place; not pressing it is Kal's way. It never changes anything by itself. It gives way to a
   question or a panel in the same place, as they give way to each other.
   CraftBeerPi works its figures out (core's strike water helper: GET /step2/strike, and the topic "strike", whose state
   is st.sw), and USE, BACK TO, the HLT's water and the grain's temperature are its calls. The demo makes the same state
   from the mockup's numbers (strike-demo.js). Its phases, by the recipe's place: "plan" while BrewStart is next or
   waits, "heat" while the strike water step heats and holds the water, "moved" while MashIn on the Mash Tun brings the
   water to the rest before the malt. A recipe without the brewer's flow in front (no strike water step) has the box only
   while it waits to start and the HLT heats the strike water by hand; there USE sets the HLT's target, as SET would */
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
   where CraftBeerPi doesn't say so, as with an answer it kept from an older version: it is never offered */
function swNumbers() {
  const S = st.sw, R = S.recipe || {}, I = S.inputs || {}, A = S.answer;
  const N = {plan: I.planned ?? null, rest: I.rest, room: I.room ?? null, typed: I.typed ?? null, grain: I.grain ?? null, vol: I.vol ?? null,
    left: I.left ?? null, step: S.by === "step", gal: R.strike_vol ?? null, probe: I.probe || "coil", interval: S.sample_time ?? null, R};
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
/* why there's no forecast, in the buttons' place */
const SW_MISS = {
  recipe: () => "No grain weight or mash water in this recipe, so where the mash lands isn't known. A recipe imported from BeerSmith has both.",
  probe: N => `The boil kettle's probe gives no reading, so the room's temperature isn't known${N.typed == null ? ", nor the grain's" : ""}. Check its plug and cable.`,
  room: N => `The boil kettle's probe reads ${N.room.toFixed(1)}&nbsp;${M.U}, ${N.room > swRoom()[1] ? "warmer" : "colder"} than any room, so it can't stand for the room${N.typed == null ? " or the grain" : ""}.`,
  /* BrewStart's Grain temperature, saved on Brew Steps, that the forecast can't use: not a number, or one no room has.
     GRAIN beside it opens the grain's box, whose own line says what to give */
  grain: N => `${swBrewStart() ? "BrewStart's grain temperature" : "The grain's temperature"} ${Number.isFinite(N.typed) ? `is ${N.typed.toFixed(1)}&nbsp;${M.U}, ${N.typed > swRoom()[1] ? "warmer" : "colder"} than any room` : "isn't a number"}. The forecast can't use it.`,
  vol: () => "How much water is in the HLT, strike and sparge? The forecast needs it.",
  /* too far to offer: more than 27 °F above the rest; or within that, over the ceiling, which only a rest above
     152.6 °F can bring */
  far: N => N.strike - N.rest <= swRise() && swOverCeil(N.strike)
    ? `It works out at ${swT(N.strike)}, over ${swT(swCeil())}: too hot for strike water. Check the grain weight and the water in BeerSmith.`
    : `It works out at ${swT(N.strike)}, more than ${swRise()}&nbsp;${M.U} above the rest: too far to trust. Check the grain weight and the water in BeerSmith.`,
  /* the mash tun's control interval (PID_HERMS's SampleTime), as the Hardware page names it and the values it offers:
     CraftBeerPi asks for it only for a fraction from 1 to 60 s, which the forecast's replay can't step through. "isn't
     a number" is a safety net: PID_HERMS runs one that isn't at its default */
  sample_time: N => `The mash tun's control interval ${num(N.interval) != null ? `is ${num(N.interval)}&nbsp;s` : "isn't a number"}. The forecast can't use it: set it to 2 or 5&nbsp;s in Hardware.`
};
/* CraftBeerPi's work on USE failed for these numbers: no USE, the strike water as it is, and where to read why (LOG has
   its line, swFailLog) */
function swFailedSays(N) {
  const T = N.plan != null ? `${N.plan.toFixed(1)}&nbsp;${M.U}` : null;
  const stays = N.step ? `The strike water stays as planned${T ? `, at ${T}` : ""}.` : T ? `The HLT's target stays at ${T}.` : "The HLT's target stays as it is.";
  return `CraftBeerPi couldn't work out a forecast for these numbers, so there's no USE. ${stays} What went wrong is in LOG.`;
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
/* FORECAST's numbers, by where the model takes each from: the recipe, the brewer, the rig's measurements, the rig's
   setup, and what hasn't been measured, each a range it allows for in full, with the three that would raise USE most
   if known and USE if every one proved to be the middle of its range; then BeerSmith's own strike temperature and
   what it would do here. The HLT's water and the grain's temperature are the brewer's, each with CHANGE, which opens
   its box in place. They are the numbers as they are now; while CraftBeerPi works USE out, what needs its answer
   waits for it */
function swList(N) {
  const R = N.R, VU = swVU(), gal = x => `${(+x).toFixed(2)}&nbsp;${VU}`, left = N.left ?? N.vol - N.gal, by = swBrewStart(), U = M.U;
  const g = (h, rows) => `<h4 class="swg">${h}</h4><dl class="swd">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  const cd = swCampden();
  const water = st.swVol ? swVolHTML(N) : `<div class="swyou"><p>${+N.vol.toFixed(2)}&nbsp;${VU} in the HLT, strike and sparge${by ? ": BrewStart's water volume" : ""}.${cd != null ? ` Campden for it: ${swCampdenText(cd)}.` : ""} The ${gal(left)} that stays there warms the mash through the coil.</p>${b("cmdbtn", "CHANGE", "", {cmd: "swv:open", label: "Change the water in the HLT", expanded: false})}</div>`;
  const grainSays = N.typed != null
    ? `Grain at ${swT(N.grain)}${by ? ": BrewStart's grain temperature. Left blank" : ", given for today's brew. Without it"}, the boil kettle's probe would stand for it, at ${swT(N.room)}.`
    : `Grain at ${swT(N.grain)}: the boil kettle's probe${by ? ", as BrewStart's grain temperature is blank" : ""}. Grain that spent the night somewhere warmer lands the mash higher: give its temperature.`;
  const grain = st.swGrain ? swGrainHTML(N) : `<div class="swyou"><p>${grainSays}</p>${b("cmdbtn", "CHANGE", "", {cmd: "swg:open", label: "Change the grain's temperature", expanded: false})}</div>`;
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
      ["Grain", `${+(+R.grain).toFixed(2)}&nbsp;${swMU()}`],
      ["Water", `${gal(N.gal)} to the mash tun: ${gal(R.for_grain)} for the grain${R.dead ? ` and ${gal(R.dead)} under the false bottom` : ""}`],
      ["Mash tun", R.tun ? `${+(+R.tun).toFixed(2)}&nbsp;${swMU()} of steel` : "not counted: the recipe has no equipment profile"],
      ["Rest", swT(N.rest)]])
    + `<h4 class="swg">From you</h4>${water}${grain}`
    + g("Measured on the rig", [
      ["Room", `${swT(N.room)}: the boil kettle's probe, as the kettle is empty, less its offset. The mash tun starts at it, and both vessels lose heat to it`],
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
    + `${key(-1, `1 ${one} less`)}${key(-0.1, `0.1 ${one} less`)}<input id="swvin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swv-h">${key(0.1, `0.1 ${one} more`)}${key(1, `1 ${one} more`)}`
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
   BrewStart does. Its label gives the unit, and the line under it says when to give it (WAI's form instructions) */
function swGrainHTML(N) {
  const v = st.swGrain.val, x = v == null ? "" : v.toFixed(1), pend = st.pend.swg, why = st.link === "lost" ? PAUSED : pend ? WAIT : "", U = M.U;
  const key = (d, l) => `<button type="button" data-cmd="swg:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  const dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "";
  /* THE PROBE: while a figure is in use, or BrewStart's can't be used */
  const probe = N.typed == null && N.miss !== "grain" ? "" : `<button type="button" class="swprobe" data-cmd="swg:probe"${dis}>${pend === "probe" ? "SETTING…" : "THE PROBE"}<small>the boil kettle's, ${swT(N.room)}, instead</small></button>`;
  return `<div class="editor swvol" role="group" aria-labelledby="swg-l"><label class="swvl" id="swg-l" for="swgin">Grain temperature, in ${U}</label>`
    + `<p class="swvh" id="swg-h">For grain that spent the night away from the boil kettle. ${swBrewStart() ? "It is BrewStart's grain temperature: left blank" : "Without it"}, the kettle's probe is used.</p>`
    + `${key(-1, "Down 1 degree")}${key(-0.1, "Down 0.1 degree")}<input id="swgin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swg-h">${key(0.1, "Up 0.1 degree")}${key(1, "Up 1 degree")}`
    + `<button type="button" class="ok" data-cmd="swg:set"${dis}>${pend === "set" ? "SETTING…" : `SET <span id="swgok">${x || "– –"}</span> ${U}`}</button><button type="button" class="no" data-cmd="swg:x">CANCEL</button>${probe}</div>`;
}
/* the grain's temperature (swGrainHTML): SET writes BrewStart's grain temperature where the recipe has BrewStart, or by
   hand the figure CraftBeerPi keeps for the brew day, and THE PROBE blanks it; either way CraftBeerPi works USE out
   again. Changed back the same way, so nothing asks first. A figure no room has is refused, as COMPARE PROBES counts a
   reading like that a probe looking off. One saved on BrewStart that the forecast can't use (bad) opens the box at the
   probe's reading, and LOG says what it was: its figure, or "not a number" */
function swGrain(x, y) {
  const N = swNumbers(), e = st.swGrain, U = M.U, [lo, hi] = swRoom(), bad = N.miss === "grain";
  if (x === "open") {
    st.swVol = null;
    st.swGrain = {val: !bad && Number.isFinite(N.typed) ? N.typed : N.room};
    renderAll();
    return swOpened("#swgin");
  }
  if (x === "x") { st.swGrain = null; return renderAll(); }
  if (!e || st.pend.swg) return;
  if (x === "step") { e.val = Math.round(((e.val ?? N.grain ?? N.room ?? 0) + parseFloat(y)) * 10) / 10; return renderAll(); }
  const was = bad || N.typed != null ? swGrainSays(N.typed) : null;
  /* a call that fails leaves the grain's temperature as it is: the figure in use, or the probe's reading */
  const fail = `The grain's temperature did not change. It is still ${was || `the boil kettle's probe's, ${f1(N.room)} ${U}`}.`;
  /* a recipe changed or gone closes the box; a figure out of range keeps it open with the figure, to be put right */
  const refused = head => (d, status) => {
    if (status === 400) return d.error === "out_of_range" ? `${head}: it has to be between ${num(d.low) ?? lo} and ${num(d.high) ?? hi} ${U}.` : "";
    const why = d.error === "recipe_changed" || d.error === "off" ? swWhyNot(d) : "";
    if (why) st.swGrain = null;
    return why ? `${head}: ${why}.` : "";
  };
  if (x === "probe") {
    if (N.typed == null && !bad) { st.swGrain = null; return renderAll(); }
    const label = `Grain temperature from the boil kettle's probe, was ${was}`;
    if (DEMO_MODE) return send("swg", "probe", label, swDemoGrain(null));
    return swExec("swg", "probe", label, () => api.strikeGrain(null, swIds()), {ok: () => { st.swGrain = null; return label; },
      refused: refused("The grain's temperature wasn't changed to the boil kettle's probe"), fail});
  }
  const v = e.val;
  if (v == null) return note("r", `Type the grain's temperature, in ${U}.`);
  if (v < lo || v > hi) return note("r", `The grain's temperature has to be between ${lo} and ${hi} ${U}.`);
  if (!bad && N.typed != null && Math.abs(v - N.typed) < 0.05) { st.swGrain = null; return renderAll(); }
  const label = `Grain temperature set to ${v.toFixed(1)} ${U}, was ${was || "the boil kettle's probe"}`;
  if (DEMO_MODE) return send("swg", "set", label, swDemoGrain(v));
  swExec("swg", "set", label, () => api.strikeGrain(v, swIds()), {
    ok: d => {
      st.swGrain = null;
      const a = d.applied || {}, to = num(a.to) ?? v, from = num(a.from);
      return `Grain temperature set to ${to.toFixed(1)} ${U}, was ${from != null ? `${from.toFixed(1)} ${U}` : bad ? was : "the boil kettle's probe"}`;
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
/* the box: its head, the window, then USE (or BACK TO) and FORECAST side by side. With a number missing, why, in their
   place, and for the HLT's water or the grain's temperature a way to give it. FORECAST opens the forecast in detail under
   the head and turns into CLOSE in its own place, so nothing in the head moves: the forecast drawn and in words, why it is
   a range, what the Mash Tun's probe may read, and the numbers by where they come from. The head stays in reach while it
   is open: on one screen the details take the step list's room and scroll under it, as the probes' panel does; where the
   page scrolls, the head stays at the top of the screen while the details pass under it. Once the water is in the mash
   tun and the pump has stopped for the dough-in, the head says when the Mash Tun's reading isn't the mash. While
   CraftBeerPi works USE out, the head says so, with how long it has been at it, and greys USE */
function swHTML() {
  const phase = swPhase();
  if (!phase || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload) return "";
  /* USE and BACK TO wait while their own call or UNLOAD's does */
  const N = swNumbers(), pend = st.pend.sw, why = st.link === "lost" ? PAUSED : pend || st.pend["r:unload"] ? WAIT : "", has = N.ok || !!N.wait, open = !!st.swOpen && has;
  const cls = `sw sw-${phase}${has ? "" : " sw-miss"}`;
  if (!has) {
    /* without the HLT's water, or with a grain temperature the forecast can't use, the question beside its button, as
       CHANGE sits beside the figure; once pressed, its box, whose label and line say what to give */
    const ask = N.miss === "vol" ? (st.swVol ? swVolHTML(N) : `<div class="swyou"><p>${SW_MISS.vol()}</p>${b("cmdbtn", "HLT WATER", "set it", {cmd: "swv:open", expanded: false})}</div>`)
      : N.miss === "grain" ? (st.swGrain ? swGrainHTML(N) : `<div class="swyou"><p>${SW_MISS.grain(N)}</p>${b("cmdbtn", "GRAIN", "change it", {cmd: "swg:open", label: "Change the grain's temperature", expanded: false})}</div>`)
      : `<p class="swl">${N.failed ? swFailedSays(N) : SW_MISS[N.miss] ? SW_MISS[N.miss](N) : ""}</p>`;
    return `<section class="${cls}" aria-label="Strike water">${head0(N, ask)}</section>`;
  }
  /* USE, or once it is in use BACK TO, in one place. While the HLT heats the strike water, a temperature below the
     water's is greyed: the HLT can't cool it, and the step would ask for the water at once, hotter than the box says.
     While CraftBeerPi works USE out, USE is greyed, with the last figure if there is one: CraftBeerPi refuses a figure
     worked out from numbers that have changed since. BACK TO is never hotter, so it stays, unless the plan it goes
     back to is over the ceiling, which the box doesn't set: then it's greyed and says so, and by hand that the HLT's
     own TARGET can still set it */
  const alt = swAlt(N), used = alt != null && N.plan != null && Math.abs(N.plan - N.strike) < swHalf(), U = M.U;
  let act = "";
  if (N.wait && phase !== "moved") act = b("cmdbtn swuse", `USE –&nbsp;–&nbsp;${U}`, "working it out", {cmd: "sw:use", why: SW_WORKING});
  else if (alt != null) {
    const H = st.v.hlt, water = (phase === "heat" && st.recipe.state === "running") || (!N.step && H.mode === "auto") ? H.pv : null;
    const cool = T => water != null && T < water - swHalf() ? `The water is already at ${water.toFixed(1)} ${U}, above ${T.toFixed(1)} ${U}, and the HLT can't cool it.` : "";
    const hot = T => swOverCeil(T) ? `${T.toFixed(1)} ${U} is over ${+swCeil().toFixed(1)} ${U}, too hot for strike water, so BACK TO can't set it.${N.step ? "" : " TARGET can set the HLT to it."}` : "";
    const stale = N.stale ? `Not yet: ${swWhy(N)}, and CraftBeerPi is working USE out again. ${N.strike.toFixed(1)} ${U} was for ${swWas(N)}.` : "";
    act = used ? b("cmdbtn", pend ? "SENDING…" : `BACK TO ${alt.toFixed(1)}&nbsp;${U}`, st.sw.was != null ? "as it was" : "the rest", {cmd: "sw:back", why: why || hot(alt) || cool(alt)})
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
/* USE: CraftBeerPi's call puts the temperature in the strike water step, and in BrewStart's while it is next or waits,
   so Ready by plans for it; and while the strike water step runs, in the HLT's target too. A question already up from
   the old temperature goes, and the step asks again at the new one. By hand it sets the HLT's target alone, as SET does.
   BACK TO undoes it the same way, to the temperature before the first USE. A figure worked out from numbers since changed
   on another screen is refused, and said (swRefusal) */
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
   WAITING FOR YOU, or a BrewStart's STARTS 05:30; the demo's true is HEATING); a step held for the brewer says WAITING
   FOR YOU. A SpargeStep's temperature is the HLT's water, not the mash, so it says so; once started with no timer it is
   SPARGING rather than NOW */
const waitHTML = w => w === true ? "HEATING" : w === WAITING_FOR_YOU ? `<span class="wfy">${w}</span>` : w;
const stepTemp = s => (s.type === "SpargeStep" ? "water " : "") + s.temp;
const runWord = s => s.type === "SpargeStep" ? "SPARGING" : "NOW";
/* BrewStart's row says when it's ready by and its water: "126 °F · ready by 07:00 · 15 gal". On one screen the title bar
   is always in view, so a step's note steps aside while the title bar shows that step's own question (brewday.css) */
function stepHTML(s, i) {
  const r = st.recipe, state = i < r.cur ? "done" : i === r.cur ? "cur" : "";
  const p = [s.temp != null ? `${stepTemp(s)} ${M.U}` : "", s.min ? `${s.min} min` : "", s.ready ? `ready by ${esc(s.ready)}` : "", s.vol != null ? `${+s.vol.toFixed(2)} ${s.volU || "gal"}` : ""].filter(Boolean).join(" · ");
  const right = state === "done" ? "✓ DONE" : state === "cur" ? (r.state === "running" ? (r.wait ? waitHTML(r.wait) : (s.min ? `<span id="r-left">${mmss(r.left)}</span> LEFT` : runWord(s))) : r.state === "ready" ? (r.wait ? waitHTML(r.wait) : "READY") : "STOPPED") : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
  const pct = s.min ? pctOf(r.left, s.min) : 0;
  const bar = state === "cur" && s.min ? `<span class="bar"><i id="r-bar" style="width:${pct}%"></i></span>` : "";
  const adds = s.adds ? `<span class="adds">${s.adds.map((a, j) => addHTML(a, j, state, s)).join("")}</span>` : "";
  return `<li class="step${state === "done" ? " done" : ""}"${state === "cur" ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${esc(s.n)}</span>${p ? `<span class="p">${p}</span>` : ""}${s.note ? `<span class="p pn${state === "cur" && st.banner && st.banner.title === s.n ? " asked" : ""}">${esc(s.note)}</span>` : ""}<span class="s">${right}</span>${bar}${adds}</li>`;
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
  return {ui: `${UI_BUILD.version}${UI_BUILD.commit ? `+${UI_BUILD.commit}` : ""}`, built: UI_BUILD.commit ? UI_BUILD.built || "" : "", cbpi: cb};
}
function nowHTML() {
  const r = st.recipe;
  if (!r) return `<span class="n">–</span><b>No recipe running</b><span class="p">Brewing by hand · ${M.TIMERS ? "timers" : "rest timer"} below</span>${tmlHTML()}`;
  const S = M.RECIPE.steps, s = S[r.cur], pct = s.min ? pctOf(r.left, s.min) : 0;
  const p = [s.temp != null ? `${stepTemp(s)} ${M.U}` : "", s.min ? `${s.min} min` : "", `step ${r.cur + 1} of ${S.length}`].filter(Boolean).join(" · ");
  const nx = S[r.cur + 1];
  const nxt = nx ? `<span class="nx">Next: ${esc(nx.n)}${nx.temp != null ? ` · ${stepTemp(nx)} ${M.U}` : ""}${nx.min ? ` · ${nx.min} min` : ""}</span>` : `<span class="nx">Last step</span>`;
  return `<span class="n">${r.cur + 1}</span><b>${esc(s.n)}</b><span class="p">${p}</span><span class="left">${r.state === "running" ? (r.wait ? waitHTML(r.wait).toLowerCase() : s.min ? `<span id="now-left">${mmss(r.left)}</span> left` : runWord(s).toLowerCase()) : r.state === "ready" ? (r.wait ? waitHTML(r.wait).toLowerCase() : "ready") : "stopped"}</span>${s.min ? `<span class="bar"><i id="now-bar" style="width:${pct}%"></i></span>` : ""}${nxt}${tmlHTML()}`;
}

/* ---------- alarms, last event, rig ---------- */
/* a prompt from CraftBeerPi can have several buttons (x.acts); x.more counts what waits behind it. A timer's alarm has two:
   +5 MIN, drawn as the lesser one (sec), and OK. What it waits for is its timer's command, not the title bar's */
function bannerHTML() {
  const x = st.banner;
  if (!x) return `${ICON.ok}<span class="msg">No alarms</span>`;
  const acts = x.acts || (x.act ? [{label: x.act, cmd: x.cmd, hold: x.hold}] : []), busy = x.timer != null ? st.pend["t:" + x.timer] : st.pend.b;
  /* an answer that switches heat on (START THE BOIL) takes a held press, as START does, and says so under it */
  const act = acts.map(y => b(y.sec ? "act sec" : "act", busy && (acts.length === 1 || busy === y.dir || busy === y.cmd) ? "SENDING…" : esc(y.label), y.hold && !busy ? "hold to start" : "", {cmd: y.cmd, why: busy ? WAIT : "", hold: y.hold})).join("");
  return `${x.tone === "prompt" ? ICON.bell : x.tone === "connecting" ? ICON.wait : ICON.warn}<span class="msg"><b>${esc(x.title)}${x.more ? ` · ${x.more} more waiting` : ""}</b>${esc(x.text).replace("{age}", `<span id="ban-age">${st.age}</span>`)}</span>${act}`;
}
/* an event with no result word (the connection coming and going) has no " · " after it */
function eventHTML() {
  const e = st.events[0], row = e => `<time>${e[0]}</time>${esc(e[1])}${e[2] ? ` · <span class="res ${e[3]}">${esc(e[2])}</span>` : ""}${e[4] ? ` · <span class="res">${esc(e[4])}</span>` : ""}`;
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
  const box = $("#rig"), w = box.clientWidth - 12, h = box.clientHeight - 12;
  if (w < 60 || h < 60) return;
  const W = Math.max(1200, Math.round(RIG_H * w / h));
  /* with graphs in the faceplates the drawing gets shorter, so its labels grow to stay readable (up to 1.3 times) */
  const rs = GRAPHS === "face" ? Math.round(Math.min(1.3, Math.max(1, 0.68 / Math.min(h / RIG_H, w / 1200))) * 100) / 100 : 1;
  if (Math.abs(W - rigW) < 4 && rs === rigRs && $("#rigsvg")) return;
  rigW = W; rigRs = rs;
  // after the boil, the wort pump at the boil kettle on its loop through the chiller (the mockup's ?wp=chill)
  box.innerHTML = rigSVG(LAYOUT === "b" ? "line" : "kettle", W, rs, "chill");
  renderRig();
}
function renderAll() {
  if (!root || !st) return;
  if (!DEMO_MODE) liveBanner();
  else if (st.banner && st.banner.timer != null) st.banner.more = st.tmrs.filter(t => t.state === "done").length - 1;
  const lost = st.link === "lost", hello = lost && connecting();
  // the new boil kettle's rules (brewday.css [data-bk=power]) apply while its BoilPower is the new one
  if (M.BKNEW) document.documentElement.dataset.bk = "power"; else delete document.documentElement.dataset.bk;
  // and the timers' ([data-timers=new]: on a phone they come before the steps) while CraftBeerPi has them
  if (M.TIMERS) document.documentElement.dataset.timers = "new"; else delete document.documentElement.dataset.timers;
  $("#app").dataset.link = st.link;
  $("#app").toggleAttribute("data-editing", !!st.edit);
  $("#link").dataset.link = hello ? "connecting" : st.link;
  setText($("#link-t"), hello ? "Connecting…" : lost ? "No connection" : "Connected");
  setText($("#clock"), hhmm(st.t));
  const ho = $("#alloff");
  setText(ho, st.pend.alloff ? "SWITCHING OFF…" : "ALL OFF");
  if (lost || st.pend.alloff) { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = lost ? PAUSED : WAIT; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  const bn = $("#banner");
  bn.dataset.tone = st.banner ? st.banner.tone : "ok";
  /* a long question with a button (CraftBeerPi's sparge and boil prompts): on a phone its words keep the width and its
     buttons go under them, rather than a column of three or four words a line beside them (brewday.css) */
  bn.toggleAttribute("data-long", !!(st.banner && (st.banner.act || st.banner.acts) && String(st.banner.text || "").length > LONG_Q));
  morph(bn, bannerHTML());
  morph($("#event"), eventHTML());
  if (!PAGE) {
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
    if (st.recipe && !pbFresh()) st.cmpOpen = false;
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
    // the check's box, the probes' panel or the strike water box as it is on screen, before the column is drawn again (pbFit)
    const before = pbMeasure();
    /* a timer's editor open: on the one-screen layout the step list (by hand, the recipe book) makes room for it, and the
       strike water box while that box is closed (brewday.css) */
    $("#recipe").toggleAttribute("data-tedit", !!M.TIMERS && !!st.tedit);
    /* and while something in it waits for you (NEXT STEP's, RESET's or UNLOAD's question, the pre-brew check's box or the
       probes side by side, the strike water box opened out or giving a number, a timer's alarm), the versions' line
       steps aside on a monitor, so the step list keeps the current step whole (brewday.css) */
    $("#recipe").toggleAttribute("data-asking", !!(st.confirmNext || st.confirmReset || st.confirmUnload || st.pbOpen || st.cmpOpen || st.swOpen || st.swVol || st.swGrain || (M.TIMERS && st.tmrs.some(t => t.state === "done"))));
    /* the pre-brew check's box, the probes side by side and the strike water box opened out, or with the HLT's water or
       the grain's temperature being given, take the step list's room on one screen, as a timer's editor does, and the
       timers' too, so the box isn't squeezed and the page doesn't grow. A timer's editor open as the box opens stays
       open, with what was typed in it: it makes way with the timers until the box closes (brewday.css) */
    $("#recipe").toggleAttribute("data-pb", !!(st.pbOpen || st.cmpOpen || st.swOpen || st.swVol || st.swGrain));
    morph($("#recipe"), recipeHTML() + verHTML());
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
  renderRig();
  if (GRAPHS) drawGraphs();
}
const bannerKey = x => x ? [x.tone, x.title, x.text, x.cmd || "", (x.acts || []).map(a => a.cmd).join(",")].join("|") : "";

/* ---------- the temperature graphs (graphs.js) ---------- */
// What the graphs draw. Their clock: the demo's, or CraftBeerPi's brewing clock, which a simulation runs faster. Its
// times are seconds since a midnight, and a span can reach back past it, so the labels wrap round the day.
const graphNow = () => H ? H.now() : daySeconds();
// a graph's clock labels: live, the local time at that moment, so a day with a daylight-saving change (23 or 25 hours)
// is labelled right; the mockup's demo counts from its midnight
const ghhmm = t => H && !DEMO_MODE ? hhmm(daySeconds(new Date((H.day() + t) * 1000)))
  : hhmm(((Math.floor(t) % 86400) + 86400) % 86400);
// BK: the new boil kettle's boil point, where its targets stop being BOIL, and its hold, for its graph and its line
const G = () => ({hist: st.hist, t: DEMO_MODE ? st.t : graphNow(), span: gSpan, lost: st.link === "lost", V: st.v, VNAME: M.VNAME, U: M.U, hhmm: ghhmm, scale: H && !DEMO_MODE ? H.scale() : 1,
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
// q: the CraftBeerPi notification a "waiting for you" line is about, so the line can say what became of it (questionGone)
function logEvent(what, res, tone, cav = "", shared = false, q = null) {
  if (DEMO_MODE) { st.events.unshift([hhmmss(st.t), what, res, tone, cav]); return; }
  st.t = daySeconds();
  st.events.unshift([hhmmss(st.t), what, res, tone, cav, Date.now(), ...(q != null ? [shared ? 1 : 0, String(q)] : shared ? [1] : [])]);
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
  if (pl) note(pl.id.slice(3), text); else if (el.closest(".tmrs")) note("t", text); else if (el.closest(".recipe")) note("r", text); else toast(text);
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
const actLabel = (id, on) => `${M.ACT[id].name} ${M.ACT[id].kind === "pump" ? (on ? "started" : "stopped") : (on ? "on" : "off")}`;
function setActor(id, on) { const a = st.a[id]; a.on = on; a.failed = null; a.paused = false; if (id === "bkEl") endPause(); if (M.ACT[id].kind === "heat") a.pct = on ? (a.lvl ?? 100) : 0; }
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
  st.edit = {v: "bk", kind: "pwr", what: boil ? "boil" : "hand", val: boil ? st.v.bk.bp : st.a.bkEl.lvl};
  renderAll(); focusTin();
}
function cmdPwrStep(d) { st.edit.val = Math.min(100, Math.max(0, st.edit.val + d)); renderAll(); }
function cmdPwrSet() {
  const {what, val} = st.edit, boil = what === "boil", V = st.v.bk, el = st.a.bkEl, was = boil ? V.bp : el.lvl;
  if (!(Number.isInteger(val) && val >= 0 && val <= 100)) { note("bk", `Enter a ${boil ? "boil power" : "power"} from 0 to 100 %.`); return; }
  st.edit = null; st.notes.bk = "";
  if (val === was) { renderAll(); return; }
  /* when the new level isn't in use yet, the event says when it will be, so an OUT that doesn't move isn't taken for a failure */
  const ho = bkHoldT();
  const cav = M.BKNEW ? (V.mode !== "auto" ? "kept for the boil in AUTO" : bkHolding() ? `not used while it holds ${+ho.toFixed(1)} ${M.U}`
      : el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilTh()} ${M.U}, full power until then`)
    : boil ? (V.mode === "auto" && V.pv >= boilFrom() ? "" : `used from ${boilTh()} ${M.U}, full power until then`)
    : (el.on ? "" : "used when you switch the element on");
  const label = boil ? `Boil power ${val} % (was ${was} %)` : `Boil element by hand ${val} % (was ${was} %)`;
  if (!DEMO_MODE) return livePower(boil, val, was, label, cav);
  send("p:bk", "set", label, () => {
    if (boil) { V.bp = val; if (V.mode === "auto" && el.on && bkHoldT() == null && (M.BKNEW ? bkLatched() : V.pv >= boilFrom())) el.pct = val; }
    else { el.lvl = val; if (V.mode !== "auto" && el.on) el.pct = val; }
  }, cav);
}
/* the boil power's one-tap steps, −5 % −1 % +1 % +5 %: sent at once, no SET. The same set_boil_power as the box; a tap that
   would go past 0 or 100 % stops there (2 % − 5 → 0 %), and only at 0 or 100 % itself is the button refused. The wait is
   kept under the step ("-5", "-1", "1", "5"), so only the button pressed shows it */
function cmdNudge(d) {
  const V = st.v.bk, el = st.a.bkEl, was = V.bp, val = Math.min(100, Math.max(0, was + d));
  if (val === was) return;
  const cav = el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilTh()} ${M.U}, full power until then`;
  const label = `Boil power ${val} % (was ${was} %)`;
  if (!DEMO_MODE) return livePower(true, val, was, label, cav, String(d));
  send("p:bk", String(d), label, () => {
    V.bp = val;
    if (V.mode === "auto" && el.on && bkLatched()) el.pct = val;
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
       the water is there (the strike water box's moments) */
    if (s.k === "hlt" && s.type === "MashInStep") swHeating(s);
    else if (st.swd && moved && was.k === "hlt" && was.type === "MashInStep" && s.k === "mt") swMovedIn(s);
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
   day's */
const swDemoGrain = v => () => { const {S, bi} = swDemoSteps(); if (bi >= 0) S[bi].grain = v; else st.swd.grain = v; st.swGrain = null; swRework("grain"); };
/* USE or BACK TO, as CraftBeerPi applies it: the strike water step's temperature, BrewStart's while it is next or waits,
   and while the strike water step runs the HLT's target; by hand the HLT's target alone */
function swSet(t) {
  const r = st.recipe, {S, bi, si} = swDemoSteps(), H = st.v.hlt, he = st.a.hltEl;
  const heatTo = () => { he.on = t > H.pv; he.pct = he.on ? (t - H.pv > 2 ? 100 : 40) : 0; };
  if (si < 0) { H.sv = H.own = t; if (H.mode === "auto") heatTo(); return; }
  S[si].temp = t;
  if (bi >= 0 && r.cur <= bi) { S[bi].temp = t; if (r.cur === bi && r.state === "running") r.wait = `STARTS ${hhmm(DEMO.swStartAt(t, H.pv))}`; }
  if (r.cur === si && r.state === "running") {
    H.sv = H.own = t; heatTo();
    if (st.banner && st.banner.title === S[si].n) { st.banner = null; questionGone(S[si].n, "no longer needed"); }
    swHeating(S[si]);
  }
}
/* the strike water step heats until the water is half a degree short of its temperature, then asks for it to be moved
   (its Notification), and holds it */
function swHeating(s) {
  const r = st.recipe;
  if (st.v.hlt.pv < s.temp - 0.5) { r.wait = true; return; }
  r.wait = WAITING_FOR_YOU;
  soon(() => { st.banner = {tone: "prompt", title: s.n, text: s.note, act: "NEXT STEP", cmd: "b:done"}; logEvent(`${s.n}: ${s.note}`, "waiting for you", "wait"); });
}
/* BrewStart, started: it heats nothing, and waits for the time its Ready by plan works out */
function swWaitBegin(s) {
  const r = st.recipe;
  r.wait = `STARTS ${hhmm(DEMO.swStartAt(s.temp, st.v.hlt.pv))}`;
  soon(() => logEvent(DEMO.swPlanLine(s.temp, st.v.hlt.pv), "from CraftBeerPi", ""));
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
    else if (s.type === "BrewStart") swWaitBegin(s);
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
    if (st.banner && q.has(st.banner.title)) st.banner = null;
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
  Object.assign(st, {confirmNext: false, confirmReset: false, pbOpen: false, cmpOpen: false, swOpen: false, swVol: null, swGrain: null});
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
    if (st.banner && (q.has(st.banner.title) || st.banner.cmd === "r:unload-yes")) st.banner = null;
    if (st.swd && !st.swd.hand) swAsSaved();
    st.recipe = null; st.finished = false; st.pbOpen = false; st.cmpOpen = false;
    if (st.hist) { st.hist.steps = []; st.hist.start = st.t - 8 * 3600; }
  });
}
/* the demo's Recipe Book keeps Test Recipe v5 as it was saved: its strike water at the rest's 126 °F, BrewStart's 15 gal
   and no grain temperature of its own. What this brew changed since loading (USE's figure, the HLT's water, the
   grain's temperature) isn't kept, so LOAD brings the recipe back as saved, and the strike water helper starts a new
   day for it */
function swAsSaved() {
  const {S, bi, si} = swDemoSteps();
  if (si >= 0) S[si].temp = DEMO.SW_PLAN0;
  if (bi >= 0) Object.assign(S[bi], {temp: DEMO.SW_PLAN0, vol: DEMO.SW_VOL0, grain: null});
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
        s.min ? `Sparge timer started. Estimated completion: ${hhmm(st.t + s.min * 60)}` : ""].filter(Boolean).join(" ");
      if (said) timers.push(setTimeout(() => { logEvent(`${s.n}: ${said}`, "from CraftBeerPi", ""); renderAll(); }, 300));
    });
  }
  /* OK on CraftBeerPi's own warning or error, one without buttons (cbpi): it goes from every screen's title bar, and its
     lines say "seen", a warning's in the plain colour, an error's still red.
     No line of its own. (Demo; live, liveOk.) */
  else if (st.banner && st.banner.cbpi) { seenLines(`${st.banner.title}: ${st.banner.text}`); st.banner = null; renderAll(); }
  /* OK: the rest timer's alarm, or a warning that waits for one (no target, a forgotten pause) */
  else { if (st.banner) questionGone(st.banner.title); st.banner = null; renderAll(); }
}
const spargeStartedLine = s => `${s.n}: sparge started, ${s.min ? `${s.min} min timer started` : "until NEXT STEP"}`;
function cmdLoad(i) {
  if (i !== 0) { renderAll(); return toast(`Mockup: only Test Recipe v5 is filled in here. On the real screen, LOAD sends ${M.BOOK[i].n} to Brew Steps, as the Recipe Book does today.`); }
  send("r:load", "load", `${M.BOOK[0].n} loaded`, () => { M.RECIPE = {...M.RECIPE, name: M.BOOK[0].n}; st.recipe = {state: "ready", cur: 0, left: 0, adds: []}; st.finished = false; });
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
    const w = failWhy(res);
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
function liveLoad(i) {
  const x = M.BOOK[i];
  if (!x) return;
  own.load = Date.now();
  exec("r:load", "load", `${x.n} loaded`, () => api.brew(x.file), {fail: () => alarm(`${x.n} did not load.`, "OK", "b:ok")});
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
  if (s < 59.5) return `${Math.max(1, Math.round(s))} s`;
  const m = Math.round(s / 60), h = Math.floor(m / 60);
  return m < 60 ? `${m} min` : h >= 48 ? `${Math.round(m / 1440)} days` : m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
};
const tBack = t => !!t.interrupted && (t.state === "paused" || t.state === "done");
const tOff = t => t.off == null ? "CraftBeerPi was off; how long isn't known yet" : `CraftBeerPi was off for ${offFor(t.off)}`;
/* two timers never share a name (whatever its capitals): their alarms, titled with it, would be hard to tell apart */
const tTwin = (name, t) => st.tmrs.find(z => z !== t && z.name.toLowerCase() === name.toLowerCase());
const tTwinWhy = n => `Another timer is already called ${n}. Give this one another name, so you can tell their alarms apart.`;
function tDefaultName() { let n = st.tmrs.length + 1; while (tTwin(`Timer ${n}`)) n++; return `Timer ${n}`; }
function timersHTML() {
  const off = st.link === "lost" ? PAUSED : "", T = st.tmrs, e = st.tedit, full = T.length >= TMAX;
  const rows = T.map(t => trowHTML(t, off) + (e && e.id === t.id ? teditHTML(off) : "")).join("");
  /* + TIMER: where a new timer's editor opens; while another timer's editor is open it steps out of the way (one editor
     at a time, and a press would drop that editor's changes) */
  const plus = e && e.id == null ? teditHTML(off) : e ? ""
    : b("cmdbtn tplus", "+ TIMER", full ? "four at most" : T.length ? `up to ${TMAX}` : "counts down on every screen", {cmd: "te:new", why: off || (full ? "Four timers at most. Remove one to add another." : "")});
  return `<section class="tmrs" id="tmrs" aria-labelledby="tmrs-h"${e ? " data-editing" : ""}><div class="thead"><h3 id="tmrs-h">Timers</h3>${soundHTML()}</div>${rows}${plus}<p class="note">${esc(st.notes.t || "")}</p></section>`;
}
/* a timer's row: its name and state, its time large, and one button. Its left part opens its editor. run: this countdown's
   length (its own time, or the 5 minutes more after it ran out), for "of" and the bar. "of 20:00" stays whole, so a narrow
   row wraps "PAUSED ·" over "of 20:00". A timer brought back after a restart has its own line across the row, under the
   name and state, saying how long CraftBeerPi was off; the button's label ends with it, so the line is hidden from screen
   readers */
function trowHTML(t, off) {
  const p = st.pend["t:" + t.id], why = off || (p ? WAIT : ""), done = t.state === "done", run = t.state === "running", live = run || t.state === "paused";
  const up = done && tUpKnown(t) ? tfmt(tUp(t)) : "", time = done ? tUpText(t) : tfmt(t.left), back = tBack(t);
  const of = `<span class="nw">of ${tfmt(t.run)}</span>`;
  const sub = done ? "TIME'S UP" : run ? of : live ? `<span class="nw">PAUSED ·</span> ${of}` : "ready";
  const said = (done ? `${t.name}: time's up, ${up ? `${up} ago` : "how long ago isn't known yet"}` : `${t.name}: ${tfmt(t.left)}${run ? " left" : live ? " left, paused" : ", ready"}`)
    + (back ? `. ${tOff(t)}` : "");
  // while its time or name is being changed, START or PAUSE waits without saying it is starting or pausing
  const btn = done ? b("cmdbtn", p === "plus5" ? "ADDING…" : "+5 MIN", "", {cmd: `tm2:plus5:${t.id}`, why}) + b("cmdbtn tok", p === "ok" ? "SENDING…" : "OK", "stops the alarm", {cmd: `tm2:ok:${t.id}`, why})
    : b("cmdbtn", p === "start" ? "STARTING…" : p === "pause" ? "PAUSING…" : run ? "PAUSE" : "START", t.state === "paused" ? "carry on" : "", {cmd: `tm2:go:${t.id}`, why});
  const open = !!(st.tedit && st.tedit.id === t.id);
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
/* one editor at a time, in place: under its timer, or where + TIMER was for a new one. A running or paused timer's time
   changes by a minute or five at once, as the boil power's nudges do; a stopped one is set and then saved */
function teditHTML(off) {
  const e = st.tedit, t = e.id != null ? tById(e.id) : null, live = !!t && (t.state === "running" || t.state === "paused");
  const pT = st.pend["t:" + (t ? t.id : "new")], why = off || (pT ? WAIT : "");
  if (e.confirm && t) return `<div class="confirm tconf" role="group" aria-labelledby="tc-t"><p id="tc-t">Remove <b>${esc(t.name)}</b>? It has ${tfmt(t.left)} left.</p><div>${b("yes", pT ? "REMOVING…" : "REMOVE IT", "", {cmd: "te:rm", why})}${b("", "KEEP IT", "", {cmd: "te:keep"})}</div></div>`;
  const nm = `<div class="tfield"><label for="tnm">Name</label><input id="tnm" type="text" maxlength="${TNLEN}" autocomplete="off" spellcheck="false" value="${esc(e.name)}" placeholder="${esc(e.ph)}"></div>
    ${namesHTML(e, t)}`;
  const time = live
    ? `<p class="tleft">Time left <b id="te-left">${tfmt(t.left)}</b></p><div class="tkeys">${[[-60, "−1 MIN"], [60, "+1 MIN"], [300, "+5 MIN"]].map(([s, l]) => b("cmdbtn", l, "", {cmd: `tm2:add:${t.id}:${s}`, why})).join("")}</div><p class="tnote">Changes the time left at once, on every screen.</p>`
    : `<div class="tfield tmin"><label for="tmin">Minutes</label>${b("cmdbtn", "−1", "", {cmd: "te:step:-1", label: "One minute less"})}<input id="tmin" type="text" inputmode="numeric" maxlength="3" autocomplete="off" value="${e.set / 60}">${b("cmdbtn", "+1", "", {cmd: "te:step:1", label: "One minute more"})}</div>
      <div class="tpre" role="group" aria-label="Minutes">${TPRE.map(m => b("cmdbtn", String(m), "", {cmd: `te:min:${m}`, pressed: e.set === m * 60, label: `${m} minutes`})).join("")}</div>`;
  const acts = !t ? [b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn", pT === "save" ? "SAVING…" : "SAVE", "start it later", {cmd: "te:save", why}), b("cmdbtn tgo", pT === "start" ? "STARTING…" : "START", "counts down now", {cmd: "te:start", why})]
    : live ? [b("cmdbtn", "REMOVE", "", {cmd: "te:rm", why}), b("cmdbtn tgo", pT === "name" ? "SAVING…" : "DONE", "", {cmd: "te:done", why})]
    : [b("cmdbtn", "REMOVE", "", {cmd: "te:rm", why}), b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn tgo", pT === "save" ? "SAVING…" : "SET", "", {cmd: "te:save", why})];
  return `<div class="tedit" role="group" aria-labelledby="te-t"><p class="tet" id="te-t">${t ? `Change ${esc(t.name)}` : "New timer"}</p>${nm}${time}<div class="tact">${acts.join("")}</div></div>`;
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
/* the step list scrolls, where it has to, so the current step is whole in view: on the one-screen layout the list is
   the part of the column that gives up height, to the timers, a question or an editor, with or without the timers.
   Where the current step is taller than the list has room for even at its top (a box above it, a long note), the
   versions' line steps aside, as it does while something in the column waits for you (brewday.css) */
function keepStepInView() {
  const rc = $("#recipe"), l = $("#recipe .steps"), c = l && l.querySelector('[aria-current="step"]');
  if (!rc) return;
  if (rc.hasAttribute("data-short")) rc.removeAttribute("data-short");
  if (c && ONE_SCREEN.matches && c.offsetHeight && c.offsetHeight > l.clientHeight - 6) rc.setAttribute("data-short", "");
  if (!c || l.scrollHeight <= l.clientHeight + 1) return;
  const d = c.getBoundingClientRect().top - l.getBoundingClientRect().top;
  if (d < 0 || d + c.offsetHeight > l.clientHeight) l.scrollTop += d - 6;
}
/* a timer's command: the demo answers it itself, as the mockup does; live it goes to CraftBeerPi, whose answer carries every
   timer, shown at once rather than when the websocket's word follows. A refusal says why under the timers */
function tSend(key, dir, label, apply, request, o = {}) {
  if (DEMO_MODE) return send(key, dir, label, apply);
  return exec(key, dir, label, request, {
    ok: res => {
      if (res.data && Array.isArray(res.data.timers)) tAns = {...res.data, received: Date.now()};
      if (o.ok) o.ok(res);
    },
    fail: (res, w) => {
      note("t", res.data && res.data.error ? String(res.data.error) : `That didn't go through: ${w}.`);
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
  if (x === "step") { e.set = Math.min(300, Math.max(1, e.set / 60 + parseInt(y, 10))) * 60; return renderAll(); }
  if (x === "min") { e.set = parseInt(y, 10) * 60; return renderAll(); }
  if (x === "keep") { e.confirm = false; return renderAll(); }
  /* spaces as the server keeps them: trimmed, and one between words */
  const t = e.id != null ? tById(e.id) : null, name = (e.name || "").split(/\s+/).filter(Boolean).join(" ") || e.ph, shut = {ok: () => { st.tedit = null; }};
  if (e.id != null && !t) { st.tedit = null; return renderAll(); } // removed on another screen meanwhile
  if ((x === "rm" || x === "done") && !t) return;
  if (x === "rm") {
    /* a timer with time left on it (running or paused) is asked about once, in place, as NEXT STEP is; a stopped one, or
       one that has run out, goes at once, and its alarm with it */
    if ((t.state === "running" || t.state === "paused") && !e.confirm) { e.confirm = true; return renderAll(); }
    return tSend("t:" + t.id, "rm", `${t.name} removed`, () => { tAnswered(t, "no longer needed"); st.tmrs = st.tmrs.filter(z => z !== t); st.tedit = null; }, () => api.timersRemove(t.id), shut);
  }
  /* a typed name another timer has is refused as its greyed button is, before anything is sent */
  const twin = (!t || name !== t.name) && tTwin(name, t);
  if (twin) return note("t", tTwinWhy(twin.name));
  if (x === "done") {
    if (name === t.name) { st.tedit = null; return renderAll(); }
    return tSend("t:" + t.id, "name", `${t.name} is now ${name}`, () => { t.name = name; st.tedit = null; }, () => api.timersChange(t.id, {name}), shut);
  }
  if (!t) {
    if (st.tmrs.length >= TMAX) return note("t", "Four timers at most. Remove one to add another.");
    const go = x === "start", set = e.set;
    return tSend("t:new", x, `${name} added${go ? " and started" : ""}, ${tfmt(set)}`, () => {
      st.tmrs.push({id: Math.max(0, ...st.tmrs.map(z => z.id)) + 1, name, set, left: set, run: set, state: go ? "running" : "stopped"});
      st.tedit = null;
    }, () => api.timersAdd(name, set, go), shut);
  }
  const said = name !== t.name ? `${t.name} is now ${name}, ${tfmt(e.set)}` : `${t.name} set to ${tfmt(e.set)}`, set = e.set;
  /* SET on one that has run out answers its alarm too, and stops it at its new time, as CraftBeerPi does */
  return tSend("t:" + t.id, "save", said, () => { if (t.state === "done") { tAnswered(t, "no longer needed"); t.state = "stopped"; } t.name = name; t.set = t.left = t.run = set; st.tedit = null; },
    () => api.timersChange(t.id, name !== t.name ? {name, seconds: set} : {seconds: set}), shut);
}
function cmdTm2(x, id, y) {
  const t = tById(+id), key = "t:" + id;
  if (!t || st.pend[key]) return;
  if (x === "go") {
    if (t.state === "running") return tSend(key, "pause", `${t.name} paused, ${tfmt(t.left)} to go`, () => { t.state = "paused"; }, () => api.timersPause(t.id));
    return tSend(key, "start", `${t.name} started, ${tfmt(t.left)} to go`, () => { if (t.state === "stopped") t.run = t.left; t.state = "running"; delete t.interrupted; }, () => api.timersStart(t.id));
  }
  if (x === "add") {
    const s = parseInt(y, 10), want = Math.max(10, t.left + s);
    return tSend(key, "add", `${t.name}: ${s > 0 ? "+" : "−"}${Math.abs(s) / 60} min, ${tfmt(want)} to go`,
      () => { const was = t.left; t.left = Math.max(10, t.left + s); t.run = Math.max(t.left, t.run + t.left - was); }, () => api.timersAddTime(t.id, s));
  }
  /* answering: OK puts the timer back to its own time, stopped (a kitchen timer's recall); +5 MIN runs it five more. Live, the
     answer takes CraftBeerPi's prompt down on every screen; this one doesn't log it as answered elsewhere */
  const answer = () => tAnswered(t);
  const heard = !DEMO_MODE && t.prompt, o = heard ? {ok: () => { if (opts.removeAlert) opts.removeAlert(heard); }, fail: () => answered.delete(heard)} : {};
  if (x !== "ok" && x !== "plus5") return;
  if (heard) answered.add(heard);
  if (x === "ok") return tSend(key, "ok", `${t.name}: alarm answered`, () => { answer(); t.state = "stopped"; t.left = t.run = t.set; }, () => api.timersOk(t.id), o);
  return tSend(key, "plus5", `${t.name}: 5 more minutes`, () => { answer(); t.state = "running"; t.left = t.run = 300; }, () => api.timersPlus5(t.id), o);
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
    } else if (t.state === "done") setText($("#tt-" + t.id), tUpText(t));
  }
  if (!st.banner) { const d = st.tmrs.find(t => t.state === "done"); if (d) { st.banner = DEMO.tBanner(d, st.tmrs); changed = true; } }
  if (changed) renderAll();
  else { const m = $("#tml-t"); if (m) m.innerHTML = tmlText(); }
  if (st.tmrs.some(t => t.state === "done") && st.t % 3 === 0) ring();
}
function tmShow(t) {
  setText($("#tt-" + t.id), tfmt(t.left));
  const bar = $("#tb-" + t.id); if (bar) bar.style.width = tPct(t) + "%";
  if (st.tedit && st.tedit.id === t.id) setText($("#te-left"), tfmt(t.left));
}
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
  st.tmrs = liveTmrs(tMsg);
  for (const t of st.tmrs) {
    if (t.state === "running") tmShow(t);
    else if (t.state === "done") setText($("#tt-" + t.id), tUpText(t));
  }
  const m = $("#tml-t"); if (m) m.innerHTML = tmlText();
  alarmCheck();
}
const TAB_PATH = {"Recipe Book": "/recipes", "Brew Steps": "/mashprofile"};
function go(path) { if (opts.navigate) opts.navigate(path); else window.location.hash = "#" + path; }

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
    /* the strike water box: USE, BACK TO, and FORECAST or CLOSE, one button that opens and closes the details; closing
       them closes a small box open in them */
    case "sw": if (x === "use") return swUse(); if (x === "back") return swBack(); st.swOpen = x === "more" ? !st.swOpen : x === "open"; if (!st.swOpen) { st.swVol = null; st.swGrain = null; } return renderAll();
    case "swv": return swVol(x, y);
    case "swg": return swGrain(x, y);
    case "e": case "w": return liveOk(k, x);
    case "alloff": return DEMO_MODE ? cmdAllOff() : liveAllOff();
    case "log": st.logOpen = !st.logOpen; return renderAll();
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
  return {t: daySeconds(), link: "lost", age: null, banner: null, v, a, recipe: null, timer: {left: 3600, running: false},
    tmrs: [], names: [], tedit: null, snd: soundInit(),
    events: loadEvents(), pend: {}, notes: {}, edit: null, confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null, logOpen: false,
    sw: null, swOpen: false, swVol: null, swGrain: null,
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
  if (st.tedit && st.tedit.id != null) {
    const t = tById(st.tedit.id);
    if (!t || (t.state === "done" && was && was.state !== "done")) st.tedit = null;
  }
  if (!M.TIMERS) st.tedit = null;
  if (!PAGE && !st.recipe && !bookShown) { bookShown = true; loadBook(); }
  if (st.recipe) bookShown = false;
  /* UNLOAD asks for a recipe the Recipe Book doesn't have, so the book's names are read while one is loaded too: as the
     page opens, and again for each recipe loaded (by its steps) */
  if (!PAGE && st.recipe) { const k = recipeKey(); if (k !== bookFor) { bookFor = k; loadBook(true); } } else bookFor = null;
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
  let wait = null;
  // a question CraftBeerPi asks under the step's own name that holds the step up - the malt, a notification step,
  // the boil's hold - but not one asked while the step's timer runs on (the whirlpool's "Heat and hold?")
  if (((state === "running" && left == null) || state === "ready") && st.prompts.some(q => String(q.title || "") === s.n)) wait = WAITING_FOR_YOU;
  else if (state === "running" && s.type === "BrewStart") {
    // cbpi4_BrewStart: "Start Fri Oct 30, 07:00 · 2:35:10 to go", "Ready … · heating from Fri Oct 30, 05:30 · …"
    const at = /(?:^start|heating from)\s+[^·]*?(\d{1,2}:\d{2})\s*·/i.exec(text);
    if (at) wait = `STARTS ${at[1]}`;
  }
  if (!wait && state === "running" && left == null && text && (s.min || s.temp != null)) {
    const pv = st.v[s.k] ? st.v[s.k].pv : null;
    wait = /cool/i.test(s.type || "") || (/target temp/i.test(text) && pv != null && s.temp != null && pv > s.temp + 0.5) ? "COOLING"
      : /target temp/i.test(text) ? "HEATING" : "WAITING";
  }
  const p = (snap.steps || []).find(x => x && x.id === s.id);
  const props = (p && p.props) || {}, done = new Set((props._hops_done || []).map(Number));
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
  return {state, cur, left: left ?? (s.min ? s.min * 60 : 0), wait, adds, held, started: s.type === "SpargeStep" && !!props._sparge_started};
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
      acts: [{label: "+5 MIN", cmd: `tm2:plus5:${t.id}`, dir: "plus5", sec: true}, {label: "OK", cmd: `tm2:ok:${t.id}`, dir: "ok"}]}
      : {tone: "prompt", title: ut(p.title || "CraftBeerPi"), text: ut(p.message || ""), fresh: isNew(p.id), acts: p.action.map(a => ({label: String(a.label || "OK").toUpperCase(), cmd: `p:${p.id}:${a.id}`, hold}))};
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
/* a step starting, or resuming after a Stop, for the event line. A SpargeStep says what it does as it starts: it heats
   the sparge water with the mash tun MANUAL, or with no water to heat leaves the pumps to the brewer.
   Resumed after Sparge started, it doesn't heat again, so it names no target */
function stepStartLine(m, resumed, s) {
  const p = (s && s.props) || {};
  if (s && s.type === "SpargeStep") {
    if (resumed && p._sparge_started) return `${m.n} resumed`;
    if (!resumed) return p.Kettle && m.temp > 0 ? `${m.n}: heating the sparge water to ${m.temp} ${M.U}, mash tun MANUAL` : `${m.n}: mash tun MANUAL, the pumps are yours`;
  }
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
   which (said). A timer's alarm: "alarm answered",
   or "5 more minutes" for +5 MIN (told neither, its row shows which); a SpargeStep's question: none, as its step's
   "sparge started" line is its answer; any other: "<title> answered", with ": <button>" */
function elsewhereLine(a, said) {
  const title = ut(a.title), b = said == null ? "" : String(said).trim();
  if (M.TIMERS && TIMER_RAN_OUT.test(String(a.message || "").trim())) return `${title}: ${/^\+\s*5\s*min$/i.test(b) ? "5 more minutes" : "alarm answered"}`;
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
    logEvent("Connection to CraftBeerPi back", "", "");
    if (!PAGE && !st.recipe) loadBook();
    // a plugin comes or goes with a restart: ask again whether BrewScribe is there
    probeBrewScribe();
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
  for (const s of steps) {
    const o = old.get(s.id);
    if (!o) continue;
    const m = M.RECIPE.steps.find(x => x.id === s.id) || {n: s.name}, sparge = s.type === "SpargeStep";
    // a SpargeStep's Sparge started pressed elsewhere: its timer starts at the press, not at a temperature
    if (sparge && !(o.props || {})._sparge_started && (s.props || {})._sparge_started
      && !(own.sparge && own.sparge.id === s.id && Date.now() - own.sparge.at < 10000)) logStep(spargeStartedLine(m), "from another screen", "", s.name);
    if (o.status === s.status && parseLeft(o.state_text) != null) continue;
    if (o.status !== "A" && s.status === "A") {
      if (!mine(s.id)) logStep(stepStartLine(m, o.status === "S", s), "by recipe", "", s.name);
    } else if (o.status === "A" && s.status === "D") { if (!mine(s.id)) logStep(`${m.n} finished`, "by recipe", "", s.name, true); }
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
   it waits in the title bar for OK (warningsGone); anything else, but the routine, in the plain colour */
function logAlert(a) {
  const id = String(a.id), type = String(a.type || "").toLowerCase(), title = ut(a.title), msg = ut(a.message), line = `${title}: ${msg}`;
  const tm = Array.isArray(a.action) && a.action.length ? promptTimer(a) : null;
  if (tm) { if (!askedBefore(id, `${tm.name} finished`)) logEvent(`${tm.name} finished`, "waiting for you", "wait", "", false, id); say(`${tm.name}: time's up.`, true); }
  else if (Array.isArray(a.action) && a.action.length) { if (!askedBefore(id, line)) logEvent(line, "waiting for you", "wait", "", false, id); say(`${title}. ${msg}`, true); }
  else if (type === "error") { st.errors.push({id, title: a.title, message: a.message}); logEvent(line, "from CraftBeerPi", "bad", "", false, id); say(`${title}. ${msg}`, true); }
  else if (type === "warning") { addWarning(id, a.title, a.message); logEvent(line, "from CraftBeerPi", "wait", "", false, id); say(`${title}. ${msg}`); }
  else if (!ROUTINE.test(String(a.message || "").trim())) logEvent(line, "from CraftBeerPi", "");
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

/* ---------- the Recipe Book: its newest five when no recipe is loaded, and every name, for UNLOAD ---------- */
/* names: the names alone, while a recipe is loaded (inBook); otherwise the newest five with their summaries too, for the
   column's recipe book. A read that fails leaves the names unknown, so UNLOAD asks */
async function loadBook(names = false) {
  if (bookBusy || DEMO_MODE) return;
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
    if (g === gen) bookBusy = false;
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
    /* Enter in a timer box presses the editor's main button: START for a new timer, SET for a stopped one, DONE otherwise */
    if ((e.target.id === "tnm" || e.target.id === "tmin") && e.key === "Enter" && st.tedit) {
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
    if (e.key === "Escape" && (st.swVol || st.swGrain)) { st.swVol = null; st.swGrain = null; renderAll(); return; }
    /* on one screen a box open in the column has the timers make way, a timer's editor with them, so Escape is for the box */
    if (e.key === "Escape" && st.tedit && !(ONE_SCREEN.matches && (st.pbOpen || st.cmpOpen || st.swOpen))) { st.tedit = null; renderAll(); return; }
    if (e.key === "Escape" && st.confirmLoad != null) { st.confirmLoad = null; renderAll(); return; }
    if (e.key === "Escape" && (st.edit || st.logOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.pbOpen || st.cmpOpen || st.swOpen)) { st.edit = null; st.logOpen = false; st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false; st.pbOpen = false; st.cmpOpen = false; st.swOpen = false; renderAll(); }
  },
  keyup: e => { if (hold && (e.key === " " || e.key === "Enter")) { e.preventDefault(); holdEnd(true); } },
  input: e => {
    /* the strike water box's water and grain: kept as typed, and said on SET, without redrawing */
    if (e.target.id === "swgin" && st.swGrain) {
      const x = parseFloat(e.target.value), ok = $("#swgok");
      st.swGrain.val = Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
      if (ok) ok.textContent = st.swGrain.val == null ? "– –" : st.swGrain.val.toFixed(1);
      return;
    }
    if (e.target.id === "swvin" && st.swVol) {
      const x = parseFloat(e.target.value), ok = $("#swvok");
      st.swVol.val = Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
      if (ok) ok.textContent = st.swVol.val == null ? "– –" : st.swVol.val.toFixed(1);
      return;
    }
    /* the timer editor's boxes: kept as typed, without redrawing, so the caret stays put */
    if ((e.target.id === "tnm" || e.target.id === "tmin") && st.tedit) {
      if (e.target.id === "tnm") {
        st.tedit.name = e.target.value;
        root.querySelectorAll(".tsug button").forEach((x, i) => x.setAttribute("aria-pressed", String(x.getAttribute("aria-disabled") !== "true" && st.names[i] === e.target.value)));
      } else {
        const m = parseInt(e.target.value, 10);
        if (m >= 1 && m <= 300) st.tedit.set = m * 60;
        root.querySelectorAll(".tpre button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cmd === `te:min:${st.tedit.set / 60}`)));
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
      // the page's own tab goes nowhere: Brew day on the brew-day screen, SETTINGS or HARDWARE on those pages
      else if (tab.getAttribute("aria-current") === "page") e.preventDefault();
      return;
    }
    const el = e.target.closest("[data-cmd]");
    const held = afterHold;
    afterHold = null;
    if (held && el === held) return;
    if (!el) { if (st.logOpen && !e.target.closest(".log")) { st.logOpen = false; renderAll(); } return; }
    if (el.hasAttribute("data-hold")) return;
    if (el.getAttribute("aria-disabled") === "true") { explain(el); return; }
    const cmd = el.dataset.cmd;
    if (cmd === "noop") return;
    run(cmd);
    requestAnimationFrame(() => { if (root && document.activeElement === document.body) root.querySelector(`[data-cmd="${CSS.escape(cmd)}"]`)?.focus({preventScroll: true}); });
  }
};
const onWindow = () => closeMore();

/* ---------- clock, step timer, rest timer, reading age ---------- */
/* the graphs' rows: one every 10 s, none while the connection is lost (the mockup's graphTick) */
const gDriven = v => st.v[v].mode === "auto" || (v === "hlt" && hermsOn());
function gOut(v) {
  const a = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null;
  return a && !a.missing ? (a.on ? a.pct : 0) : null;
}
const gRow = (v, t) => [t, st.v[v].pv, gDriven(v) && st.v[v].sv != null ? st.v[v].sv : null, gOut(v)];
function graphTick() {
  if (!st.hist || st.t % 10) return;
  if (st.link !== "lost") ["hlt", "mt", "bk"].forEach(v => st.hist.v[v].push(gRow(v, st.t)));
  drawGraphs();
}
function demoTick() {
  st.t++;
  $("#clock").textContent = hhmm(st.t);
  if (GRAPHS) graphTick();
  if (st.link === "lost") {
    st.age++;
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
  st.t = daySeconds();
  setText($("#clock"), hhmm(st.t));
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
  // a pause counts on the brewing clock, from when BoilPower stamped it
  if (st.a.bkEl.paused) {
    syncBrewClock();
    const pz = $("#pz"); if (pz) setText(pz, mmss(pausedFor()));
  }
  if (H) {
    if (H.tick(gRow, true)) drawGraphs();
    loadHistory();
  }
}

/* ---------- the screen ---------- */
// root: an empty element the screen owns. o.demo: a mockup moment to show instead of CraftBeerPi.
// o.navigate(path): open another page. o.removeAlert(id): take an answered prompt down at once.
export function createBrewDay(el, o = {}) {
  if (root) teardown();
  const myGen = ++gen;
  root = el; opts = o; DEMO_MODE = !!o.demo; PAGE = PAGE_TAB[o.page] ? o.page : "";
  /* this tab's name, so BrewScribe's BREW DAY button (target="craftbeerpi") comes back to it rather than opening
     another */
  if (!DEMO_MODE) { try { window.name = "craftbeerpi"; } catch (_) { /* a sandboxed frame: no name */ } }
  timers = []; noteTimers = {}; hold = null; afterHold = null; heldOn = null; pbKeep = null; rigW = 0; last = null; everConnected = false; book = []; bookBusy = false; bookShown = false;
  bookNames = null; bookFor = null;
  tAns = null; tMsg = null; lastBannerKey = null; rangAt = 0; newIds = new Set(); openIds = null; sAns = null; swFailedAt = null; swFcGap = null;
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
      BOILPOWER: true, BKNEW: true, BOIL_TH: DEMO.BOIL_TH, TIMERS: true};
    st = (DEMO.SCENES[key] || DEMO.EXTRA[key])();
    // #unload-notinbook: steps built on Brew Steps under a name the Recipe Book doesn't have
    if (st.recipeName) { M.RECIPE = {...M.RECIPE, name: st.recipeName}; delete st.recipeName; }
    // the sparge-… moments run a recipe whose step 4 is a SpargeStep; every other moment keeps the MashStep
    if (st.sparge4) M.RECIPE = {...DEMO.RECIPE, steps: DEMO.RECIPE.steps.map((s, i) => i === 3 ? {...DEMO.SPARGE_STEP, ...st.sparge4} : s)};
    // #check-adds and #check-many: a recipe with eight boil additions, of which the boil step holds the first six
    if (st.adds5) M.RECIPE = {...M.RECIPE, steps: M.RECIPE.steps.map((s, i) => i === 4 ? {...s, adds: st.adds5} : s)};
    /* the strike water moments put the brewer's own flow in front of the recipe, BrewStart and the strike water step on
       the HLT, at the strike water's temperature in that moment; #sw-hand has the recipe as imported, without them */
    if (st.swd && !st.swd.hand) M.RECIPE = {...M.RECIPE, steps: DEMO.SW_STEPS.map(s => ({...s, temp: st.swd.plan, ...(s.type === "BrewStart" ? {vol: st.swd.vol, grain: st.swd.grain} : {})})).concat(M.RECIPE.steps)};
    // a moment can open an editor (open) and borrow another moment's graph history (base)
    const open = st.open, base = st.base || key;
    delete st.open; delete st.base;
    Object.assign(st, {scene: key, pend: {}, notes: {}, edit: null, confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null, logOpen: false, pbOpen: false, cmpOpen: false, swOpen: false, swVol: null, swGrain: null}, open);
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
    M = model({book});
    // a warning's line kept from an earlier page is plain: this page's title bar has none of them (warningsGone)
    warningsGone();
    // the timers until CraftBeerPi says it has none (applyLive)
    M.TIMERS = true;
    if (GRAPHS) { H = createHistory(); st.hist = H.hist; }
    // shown until the first connection, and never kept: e[5] is 0
    if (!st.events.length) st.events.unshift([hhmmss(st.t), "Connecting to CraftBeerPi", "", "", "", 0]);
  }
  renderAll();
  /* a moment can show a greyed button tapped: its reason in its note line (tap: #unload-running, #unload-wait) */
  if (DEMO_MODE && st.tap) { const el = $(`[data-cmd="${st.tap}"]`); delete st.tap; if (el) explain(el); }
  /* a moment can show FORECAST's details scrolled to a part of them (swAt: #sw-levers, the sentence on what would
     raise USE most) */
  if (DEMO_MODE && st.swAt) {
    const at = st.swAt;
    delete st.swAt;
    requestAnimationFrame(() => { const el = gen === myGen && root && $(at); if (el) el.scrollIntoView({block: "center"}); });
  }
  for (const k in handlers) document.addEventListener(k, handlers[k]);
  window.addEventListener("resize", onWindow);
  window.addEventListener("scroll", onWindow, {passive: true});
  // the Settings and Hardware pages' lines from another tab (onStorage), so a save there shows here
  if (!DEMO_MODE) window.addEventListener("storage", onStorage);
  // the Settings page's demo stands still, as its mockup's title bar does
  const ticker = setInterval(() => { if (gen === myGen && st && !(DEMO_MODE && PAGE)) (DEMO_MODE ? demoTick : liveTick)(); }, 1000);
  const ro = PAGE ? null : new ResizeObserver(drawRig);
  if (ro) ro.observe($("#rig"));
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
  // the current step whole again once the fonts are in, and as the recipe column changes size; the strike water's chart too
  const rro = PAGE ? null : new ResizeObserver(() => { if (gen === myGen && st) { keepStepInView(); drawSw(); } });
  if (rro) rro.observe($("#recipe"));
  const onFontsStep = () => { if (gen === myGen && st && !PAGE) keepStepInView(); };
  if (document.fonts) document.fonts.addEventListener("loadingdone", onFontsStep);
  function teardownThis() {
    clearInterval(ticker);
    if (ro) ro.disconnect();
    if (pro) pro.disconnect();
    if (gro) gro.disconnect();
    if (rro) rro.disconnect();
    if (document.fonts) { document.fonts.removeEventListener("loadingdone", onFonts); document.fonts.removeEventListener("loadingdone", onFontsStep); }
  }
  teardown = () => {
    teardownThis();
    for (const k in handlers) document.removeEventListener(k, handlers[k]);
    window.removeEventListener("resize", onWindow);
    window.removeEventListener("scroll", onWindow);
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
    H = null; bclk = null; bclkAt = 0;
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
        /* a fresh page says it's connected when nothing is kept, or when the newest line kept is a lost connection. That
           line can come from the page this one replaced, logged as it closed, and nothing else would follow it, as this
           page never lost its own connection, and the tab would show "Connection to CraftBeerPi lost · trying again"
           while connected */
        if (!st.events.length || st.events[0][1] === LOST) logEvent("Connected to CraftBeerPi", "", "");
        if (!PAGE && !st.recipe) loadBook();
        probeBrewScribe();
      }
      /* the questions CraftBeerPi was waiting on as this page first connected: it sends them again then, and they haven't
         just arrived (observe). Taken before observe, as they can come in the same update as its list */
      if (openIds == null && snap.waiting && snap.waiting.n === 1) openIds = new Set(snap.waiting.ids() || []);
      observe(prev, snap);
      noLongerWaiting(snap);
      seenElsewhere(snap);
      if (snap.connected) everConnected = true;
      schedule();
    },
    /* for the Settings and Hardware pages (page "settings" or "hardware"): its host; the last-event line, the screen
       reader's line and the toast, which it shares; MORE's list; and in the Settings page's demo, the title bar's
       connection and last events, from its mockup */
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
