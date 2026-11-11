// The brew-day screen.
//
// Scott, 9 Nov 2026: "It is imperitive that the actual dashboard look identical to your proposal here. I
// don't want a crude representation of what I currently see". So this is the approved mockup's own code
// (design/brewday/brew-day.js, layout B): the same functions write the same markup, styled by the mockup's
// own stylesheet (brewday.css, generated from it) and drawn by its own rig drawing (rig.js). The bench's
// test_ui_brewday_identity.py compares the two pictures, moment by moment and screen size by size.
//
// What is different from the mockup:
// - The drawing code reads M (what stays put through a brew day: the recipe, which switch is which) and st
//   (this moment) where the mockup read its globals. With ?demo=<moment> (demo.js lists them) both come from the
//   mockup's demo data (demo.js) and commands are simulated exactly as in the mockup. Otherwise they come from
//   CraftBeerPi (live.js), and commands go to it (api.js).
// - The boil kettle is the mockup's proposed one (?bk=power) while it runs the new BoilPower (M.BKNEW: it declares
//   set_boil_at, from 0.0.3.post7), and the mockup's today's one (?bk=today) with an older BoilPower, whose target
//   is where its boil starts. The demo always shows the proposed one.
// - A command says at its own button whether it worked. One that fails, or gets no answer in 5 s, turns its
//   button red and raises an alarm in the title bar; it is never silently dropped (DEFECTS U1).
// - The regions are patched in place, not rewritten (morph), so readings that change every second do not
//   take a button's focus, a held press or a half-typed target with them.
// - Text from CraftBeerPi (step, hop and recipe names, prompts) is escaped, and the degree sign follows
//   TEMP_UNIT.
// - Heat still needs a held press when a failed "on" is tried again, and a held press is not sent if the
//   button changed under the finger.
import { rigSVG, RIG_H } from "./rig";
import * as DEMO from "./demo";
import { api, why as failWhy } from "./api";
import { model, num, parseLeft, bookLine, isHerms, unitText, ROLES } from "./live";
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
const ICON = {
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1.5h16V16l-2-3.5V8a6 6 0 0 0-6-6zm-2.5 17a2.5 2.5 0 0 0 5 0z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8 23 21.5H1z"/><path d="M12 8.5v6M12 17.5v.5" stroke="#6e1414" stroke-width="2.6" stroke-linecap="round"/></svg>',
  wait: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="4.2 3.2"/></svg>'
};
const LAYOUT = "b"; // Scott chose layout B (D3) on 9 Nov 2026
const ACTS = ["hltEl", "hltPump", "wortPump", "bkEl"];
const daySeconds = (d = new Date()) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
const pctOf = (left, min) => Math.max(0, Math.min(100, Math.round(100 * (1 - left / (min * 60)))));
const EVENTS_KEY = "cbpi.brewday.events";
const EVENTS_KEEP_MS = 12 * 3600 * 1000;
const EXPECT_MS = 3000;
// The websocket's own "server down" and "connected" messages (data/websocket.js): the screen shows the
// connection itself.
const OWN_ALERTS = new Set(["1", "2"]);
// How long the screen says "Connecting…" calmly before a page that has never connected turns red.
const CONNECTING_MS = 5000;
// CraftBeerPi's routine step notices: the event line already says these in its own words.
const ROUTINE = /^(?:timer started|step finished|boiling completed)$/i;
const WAITING_FOR_YOU = "WAITING FOR YOU";

/* ---------- the screen's markup: the mockup's page, after layout B's moves ---------- */
const MORE = [["#/dashboard", "Dashboard"], ["#/fermenterprofile", "Fermenter profile"], ["#/plugins", "Plugins"], ["#/system", "System"], ["#/about", "About"]];
function skeleton(demo) {
  const h = p => demo ? "#tab" : p;
  return `<div class="app" id="app" data-link="ok">
  <header class="topbar">
    <p class="brand"><span class="long">CraftBeerPi Brewery</span><span class="short">CraftBeerPi</span></p>
    <div class="banner" id="banner" data-tone="ok"></div>
    <p class="link" id="link" data-link="ok"><i aria-hidden="true"></i><span id="link-t">Connected</span></p>
    <button class="alloff" id="alloff" data-cmd="alloff" type="button">ALL OFF</button>
    <p class="clock" id="clock">14:32</p>
  </header>

  <section class="status" aria-label="Alarms and the last event">
    <div class="event" id="event"></div>
  </section>

  <nav class="tabs" aria-label="Screens">
    <a href="${h("#/")}" data-tab="" aria-current="page">Brew day</a>
    <a href="${h("#/mashprofile")}" data-tab="Brew Steps"><span class="long">Brew steps</span><span class="short">Steps</span></a>
    <a href="${h("#/recipes")}" data-tab="Recipe Book"><span class="long">Recipe book</span><span class="short">Recipes</span></a>
    <a href="${h("#/charting")}" data-tab="Analytics">Analytics</a>
    <a href="${h("#/hardware")}" data-tab="Hardware">Hardware</a>
    <a href="${h("#/settings/All")}" data-tab="Settings">Settings</a>
    <a href="${h("#/more")}" data-tab="More"${demo ? "" : ' aria-haspopup="true" aria-expanded="false" aria-controls="bd-more"'}>More</a>
  </nav>

  <main class="main">
    <aside class="recipe" id="recipe" aria-label="Recipe"></aside>
    <section class="brewhouse" aria-label="Brewhouse">
      <div class="now" id="now"></div>
      <div class="plates" id="plates"></div>
      <div class="rig" id="rig"></div>
    </section>
  </main>
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
let root = null, DEMO_MODE = false, opts = {}, gen = 0;
let st, M, timers = [], noteTimers = {}, hold = null, toastT = 0, raf = 0, rigW = 0, rigRs = 1, teardown = () => {};
let last = null, everConnected = false, book = [], bookBusy = false, bookShown = false;
/* the temperature graphs in the faceplates (Scott, 10 Nov: option A, "graphs always showing"); ?graphs=none leaves
   them out, as the screen was first built. gSpan: the span the three show, kept on each device. H: the live history. */
let GRAPHS = "face", gSpan = "30", H = null;
const GSPAN_KEY = "cbpi.brewday.graphspan";
const answered = new Set(), own = {};
const $ = s => root.querySelector(s);
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
  return `<button type="button" class="${cls}"${o.label ? ` aria-label="${esc(o.label)}"` : ""}${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ""}${o.expanded != null ? ` aria-expanded="${o.expanded}"` : ""}${o.cmd ? ` data-cmd="${esc(o.cmd)}"` : ""}${h ? " data-hold" : ""}${dis ? ` aria-disabled="true" data-why="${esc(o.why)}"` : ""}>${h ? '<span class="fill"></span>' : ""}<span class="lb">${label}</span>${small ? `<small>${small}</small>` : ""}</button>`;
}

/* ---------- faceplates ---------- */
function lampHTML(id) {
  const A = M.ACT[id], a = st.a[id], pend = st.pend["a:" + id], lost = st.link === "lost";
  const locked = !!a.by && !a.failed;
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = A.name + " · waiting for CraftBeerPi"; }
  /* trying a failed "on" again is still a held press for heat */
  else if (a.failed) { h = a.failed === "on" && A.kind === "heat"; s = "failed"; t = a.on ? "DID NOT STOP" : "DID NOT START"; n = `${A.name} · still ${a.on ? (A.kind === "pump" ? "running" : "heating") : "off"} · ${h ? "hold" : "tap"} to try again`; }
  else if (a.on) { s = A.kind === "heat" ? "heating" : "running"; t = A.kind === "heat" ? (id === "bkEl" && M.BKNEW ? "HEATING" : `HEATING ${a.pct} %`) : "RUNNING"; n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : A.kind === "heat" ? " · tap to turn off" : " · tap to stop"); }
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
/* The boil power button (Scott, 10 Nov: "I need to be able to adjust boil element power even while running a recipe").
   Only for a boil kettle whose logic declares set_boil_power (live.js BOILPOWER; on Scott's rig, the boil kettle). It
   sits beside the element it governs and works at any time: no step locks it. In AUTO it sets the logic's Boil_Power,
   used from the boil threshold up; in MANUAL it sets the element's own level, used when it is on by hand (M61).
   Changing it is a tap on SET, like a target: it changes a level, it never switches heat on. */
// Where BoilPower starts using the boil power. The new BoilPower (0.0.3.post7 on; M.BKNEW, as it declares set_boil_at) keeps
// it apart, in its Boil_Threshold setting (BOIL AT; st.v.bk.boilAt), and the kettle's target is an ordinary target, BOIL or
// a temperature to hold. An older one counts from the kettle's target when it has one, else from Boil_Threshold
// (M.BOIL_TH; live.js boilThreshold). The mockup's boilFrom, with BK === "power" for M.BKNEW.
const boilFrom = () => M.BKNEW ? st.v.bk.boilAt ?? M.BOIL_TH : st.v.bk.sv > 0 ? st.v.bk.sv : M.BOIL_TH;
const boilTh = () => +boilFrom().toFixed(1);
/* ---------- the boil kettle with the new BoilPower (the mockup's ?bk=power, which Scott approved on 10 Nov: "Yes, hand it
   to Brett"; then BUILD-NOTES' "The boil kettle's target, KEEP BOILING and a forgotten pause", the same evening). It works
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
   (applyLive), as BUILD-NOTES says */
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
  if (V.mode !== "auto") return "MANUAL · element by hand";
  /* a forgotten pause would quietly stop the boil, so the line counts it, in Prompt Amber like the button */
  if (el.paused) return `<span class="warn">Heat paused for <span id="pz">${mmss(pausedFor())}</span></span>`;
  /* a hold is a target like the HLT's, so its line reads like the HLT's. Inside the margin below it BoilPower rests rather
     than heat, so then the line says where it heats again, and an element that's off isn't taken for a fault */
  if (ho != null) {
    const d = ho - V.pv;
    if (Math.abs(d) < 0.3) return "At target";
    if (d > 0 && !el.on) return `${d.toFixed(1)} ${U} below target · heats again at ${+(ho - margin()).toFixed(1)} ${U}`;
    const eta = GRAPHS ? graphETA(G(), "bk") : "";
    return (d > 0 ? `${d.toFixed(1)} ${U} below target` : `${(-d).toFixed(1)} ${U} above target`) + (eta ? ` · ${eta}` : "");
  }
  if (V.pv >= boilFrom()) return "Boiling";
  /* still at the boil power below the boil point: say what happens next, or that it won't */
  if (bkLatched()) return V.keep !== false ? `Below a boil · back to full power at ${bkLetGo()} ${U}`
    : `Not boiling · ${(boilFrom() - V.pv).toFixed(1)} ${U} below ${boilTh()} ${U}`;
  const eta = GRAPHS ? graphETA(G(), "bk").replace(" at this rate", "") : "";
  return "Full power until it boils" + (eta ? ` · ${eta}` : "");
}
/* BoilPower's output in a hold (_hold_climb_power): full power from 7.2 °F below, easing to Hold_Power (30 %) at the hold,
   off at or above it; inside 3.6 °F it only carries on heating, so a fresh start there rests. For the demo, in °F. */
function holdOut(T, pv, heating) {
  const below = T - pv;
  if (below >= 7.2) return 100;
  if (below <= 0 || (below <= 3.6 && !heating)) return 0;
  return Math.trunc(30 + 70 * below / 7.2);
}
/* ending a pause (carrying on, MANUAL, ALL OFF) also takes CraftBeerPi's forgotten-pause warning down (demo) */
function endPause() {
  const el = st.a.bkEl;
  el.paused = false; el.pauseWarned = false;
  if (st.banner && st.banner.pausegt) st.banner = null;
}
function powerHTML() {
  const V = st.v.bk, el = st.a.bkEl, auto = V.mode === "auto", pend = st.pend["p:bk"];
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : !auto && el.missing ? "CraftBeerPi has no boil element set up." : "";
  return b("tgtbtn pwrbtn", auto ? `BOIL POWER ${V.bp} %` : `POWER ${el.lvl} %`,
    pend ? "sending…" : auto ? `used from ${boilTh()} ${M.U} · change` : "used by hand · change",
    {cmd: "pwr:bk", why, expanded: !!st.edit && st.edit.kind === "pwr"});
}
/* the new boil kettle's boil power, in its window while the target is BOIL: the green number is the setting, so it is the
   button that opens the power box (TARGET took its place beside AUTO/MANUAL). Framed like the graph's chosen span, with a
   small "change" like every other button's, so it reads as a control. Its tap area is at least 44 px tall. */
function boilReadHTML() {
  const V = st.v.bk, pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  return `<button type="button" class="svbtn" data-cmd="pwr:bk" aria-expanded="${!!st.edit && st.edit.kind === "pwr"}" aria-label="Boil power ${V.bp} percent: change"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="svv">${V.bp}<span class="u">%</span></span><small>${pend === "set" ? "sending…" : "change"}</small></button>`;
}
/* the new boil kettle's TARGET box: the HLT's, plus BOIL (Scott: "Set the boil kettle's target to 170 °F, like the HLT, and
   it holds there"). Anything from the boil point less the margin up is BOIL, so the steps run …205.6, 206.5, BOIL, and a
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
/* −5 % and +5 % either side of the element button while AUTO boils (Scott chose them on 10 Nov, with the pause and the usual
   power: "All three"). One tap sends set_boil_power; a step that would pass 0 or 100 % stops there, and only at the end
   itself is the button refused. */
function nudgeHTML(d) {
  const V = st.v.bk, pend = st.pend["p:bk"];
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : d < 0 && V.bp <= 0 ? "The boil power is already 0 %." : d > 0 && V.bp >= 100 ? "The boil power is already 100 %." : "";
  return b("cmdbtn nudge", `${d < 0 ? "−" : "+"}${Math.abs(d)} %`, pend === (d < 0 ? "down" : "up") ? "sending…" : d < 0 ? "turn down" : "turn up",
    {cmd: `pnudge:${d}`, why, label: `Boil power ${d < 0 ? "down" : "up"} ${Math.abs(d)} percent`});
}
/* the element button in AUTO: not locked, a tap pauses the heat (set_paused) and keeps AUTO, the recipe and the boil power;
   PAUSED, in Prompt Amber, heats again with a held press, like any heat. MANUAL is today's button. */
function bkLampHTML() {
  const a = st.a.bkEl, V = st.v.bk, pend = st.pend["a:bkEl"], name = M.ACT.bkEl.name;
  if (V.mode !== "auto" || (a.failed && !pend)) return lampHTML("bkEl");
  let s, t, n, cmd, h = false;
  if (pend) { s = "pending"; t = pend === "pause" ? "PAUSING…" : pend === "resume" ? "CARRYING ON…" : pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = `${name} · waiting for CraftBeerPi`; cmd = "noop"; }
  else if (a.paused) { s = "paused"; t = "PAUSED"; n = `${name} · hold to heat`; cmd = "pause:off"; h = true; }
  else { s = a.on ? "heating" : "off"; t = a.on ? "HEATING" : "OFF"; n = `${name} · tap to pause`; cmd = "pause:on"; }
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hh = h && !why;
  return `<button type="button" class="lamp" data-state="${s}" data-cmd="${cmd}"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
/* the steps show only while AUTO can use the boil power: not in MANUAL, where they would seem to set the element's own
   level, nor in a hold, nor while the boil kettle's box is open, which has steps of its own */
const bkNudges = () => !!M.BKNEW && st.v.bk.mode === "auto" && !bkHolding() && !(st.edit && st.edit.v === "bk");
/* KEEP BOILING (Scott, 10 Nov: "add a small checkbox with LED to choose keep at boil temp or let the boil power fully drive
   the temp"): at the end of the nameplate row, the box is the LED, lit Setpoint Green with a tick while ticked. One tap
   sets Keep_Boiling (set_keep_boiling), in any mode. Shown only while the target is BOIL: a hold never uses it. */
function keepHTML() {
  const V = st.v.bk, on = V.keep !== false, pend = st.pend["k:bk"], lost = st.link === "lost";
  const why = lost ? PAUSED : pend ? WAIT : "";
  return `<button type="button" class="keep${lost ? " stale" : ""}" role="checkbox" aria-checked="${on}" data-cmd="keep:bk"${pend ? ' data-state="pending"' : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.2 8.4l3 3 6.6-7"/></svg></span><span class="kl">KEEP BOILING</span><span class="sr">: full power again if the wort falls ${margin()} ${M.U} below a boil</span></button>`;
}
/* the usual boil power (Usual_Boil_Power), a reading in the power box: blank in Hardware, each recipe keeps the last */
const usualHTML = () => st.v.bk.usual == null ? `USUAL – –<small>none · set one in Hardware</small>`
  : `USUAL ${st.v.bk.usual} %<small>starts each recipe · set in Hardware</small>`;
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
function devHTML(v) {
  const stale = s => `<span class="stale">${s}</span>`;
  if (st.link === "lost") return st.age == null ? stale("No reading yet") : `<span class="age">Last reading ${st.age} s ago</span>`;
  const V = st.v[v];
  if (V.missing) return stale("Not set up");
  if (V.pv == null) return stale("No reading yet");
  if (bkNew(v)) return bkLine();
  const herms = v === "hlt" && hermsOn(), driven = V.mode === "auto" || herms;
  /* AUTO with no target (unset, 0 or below) runs but holds nothing, so nothing heats. The line says so at once, in Prompt
     Amber, and never calls it MANUAL; CraftBeerPi's own warning follows in the title bar after 5 s (Scott, 10 Nov) */
  if (herms && st.v.mt.sv == null) return `<span class="warn">Not heating: the mash tun has no target</span>`;
  if (noTarget(v)) return `<span class="warn">${v === "mt" && M.HERMS !== false ? "No target, so the HLT won't heat" : "No target, so it won't heat"}</span>`;
  if (!driven || V.sv == null) return v === "mt" ? "MANUAL · wort pump by hand" : "MANUAL · element by hand";
  if (v === "bk" && V.pv >= V.sv - 0.5) return "Boiling";
  const d = V.sv - V.pv;
  if (Math.abs(d) < 0.3) return "At target";
  const eta = GRAPHS ? graphETA(G(), v) : "";
  return (d > 0 ? `${d.toFixed(1)} ${M.U} below target` : `${(-d).toFixed(1)} ${M.U} above target`) + (eta ? ` · ${eta}` : "");
}
/* layout B's faceplate also shows output and mode, like a hardware PID controller */
function auxHTML(v) {
  const e = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null, el = e && !e.missing ? e : null;
  const mode = v === "hlt" && hermsOn() ? "HERMS" : st.v[v].mode === "auto" ? "AUTO" : "MAN";
  /* the new boil kettle: while its target is BOIL the boil power is its green number, so its window doesn't repeat the
     element's power as OUT (Scott, 10 Nov: "I don't need the heating element power echoed so many places"). In a hold the
     green number is the target, so OUT comes back, as on the HLT */
  if (bkNew(v) && bkHoldT() == null) return `<dl class="aux"><dt>MODE</dt><dd>${mode}</dd></dl>`;
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
  const V = st.v[v], by = v === "hlt" && hermsOn() && st.v.mt.sv != null, [svT, svV] = svCell(v);
  /* the new boil kettle has TARGET beside AUTO/MANUAL, as the HLT does, and its element button between −5 % and +5 % */
  const pw = bkNew(v) && M.VACT.bk.includes("bkEl"), nudge = pw && bkNudges();
  const lamps = pw ? (nudge ? nudgeHTML(-5) + bkLampHTML() + nudgeHTML(5) : bkLampHTML())
    : M.VACT[v].map(lampHTML).join("") + (v === "bk" && M.BOILPOWER && !M.BKNEW ? powerHTML() : "");
  return `<section class="plate" id="pl-${v}" aria-labelledby="h-${v}">
    ${bkNew(v) ? `<div class="phead"><h2 id="h-${v}">${M.VNAME[v]}</h2>${bkHoldT() == null ? keepHTML() : ""}</div>` : `<h2 id="h-${v}">${M.VNAME[v]}</h2>`}
    <div class="face${st.link === "lost" ? " stale" : ""}">
      <dl class="pvsv"><dt>PV</dt><dd class="pv">${f1(V.pv)}<span class="u">${M.U}</span></dd>
      <dt>${svT}</dt><dd class="sv">${svV}</dd></dl>
      ${LAYOUT === "b" ? auxHTML(v) : ""}
      ${GRAPHS ? graphHTML(G(), v, "f") : ""}
    </div>
    <p class="dev">${devHTML(v)}${by ? " · SV set by the mash tun" : ""}</p>
    <div class="ctrls${nudge ? " bkpow" : ""}">${lamps}</div>
    ${st.edit && st.edit.v === v ? editorHTML(v) : v === "hlt" && hermsOn() ? hermsRowHTML() : `<div class="moderow">${modeHTML(v)}${tgtHTML(v)}</div>`}
    <p class="note">${esc(st.notes[v] || "")}</p>
  </section>`;
}

/* ---------- recipe column ---------- */
function recipeHTML() {
  const r = st.recipe;
  if (!r) return handHTML();
  const S = M.RECIPE.steps, run = r.state === "running", off = st.link === "lost" ? PAUSED : "";
  const pS = st.pend["r:start"], pX = st.pend["r:stop"], pN = st.pend["r:next"];
  const start = pS ? `<button type="button" class="lamp" data-state="pending" data-cmd="noop" aria-disabled="true" data-why="${WAIT}"><span class="st">STARTING…</span><span class="nm">recipe</span></button>`
    : run ? `<button type="button" class="lamp" data-state="running" data-cmd="noop" aria-disabled="true" data-why="The recipe is already running."><span class="st">RUNNING</span><span class="nm">step ${r.cur + 1} of ${S.length}</span></button>`
    : `<button type="button" class="lamp" data-state="off" data-cmd="r:start"${off ? ` aria-disabled="true" data-why="${off}"` : " data-hold"}>${off ? "" : '<span class="fill"></span>'}<span class="st">START</span><span class="nm">hold to start</span></button>`;
  const stop = b("cmdbtn", pX ? "STOPPING…" : "STOP", run ? "tap to stop" : "not running", {cmd: "r:stop", why: off || (pX ? WAIT : "") || (!run ? "The recipe is not running." : "")});
  const last = r.cur >= S.length - 1;
  const next = b("cmdbtn", pN ? "MOVING ON…" : "NEXT STEP", last ? "last step" : `to ${esc(S[r.cur + 1].n)}`, {cmd: "r:next", why: off || (pN ? WAIT : "") || (last ? "This is the last step." : "")});
  return `<h2>${esc(M.RECIPE.name)}</h2>
    <p class="rmeta">${run ? "Running" : r.state === "ready" ? "Ready to start" : "Stopped"} · step ${r.cur + 1} of ${S.length}</p>
    <div class="rctl">${start}${stop}${next}</div>
    ${st.confirmNext ? confirmHTML() : ""}
    <p class="note">${esc(st.notes.r || "")}</p>
    <ol class="steps" aria-label="Recipe steps">${S.map(stepHTML).join("")}</ol>`;
}
function confirmHTML() {
  const r = st.recipe, cur = M.RECIPE.steps[r.cur], nx = M.RECIPE.steps[r.cur + 1];
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Skip the rest of <b>${esc(cur.n)}</b>${cur.min ? ` (${mmss(r.left)} left)` : ""} and start <b>${esc(nx.n)}</b>${nx.temp ? ` at ${nx.temp} ${M.U}` : ""}?</p><div><button type="button" class="yes" data-cmd="r:next-yes">SKIP TO ${esc(nx.n.toUpperCase())}</button><button type="button" data-cmd="r:next-no">KEEP GOING</button></div></div>`;
}
/* r.wait: a running step whose timer has not started yet says what it is waiting for (HEATING, COOLING, WAITING,
   WAITING FOR YOU, or a BrewStart's STARTS 05:30); a step held for the brewer says WAITING FOR YOU. A SpargeStep's
   temperature is the HLT's water, not the mash, so it says so; once started with no timer it is SPARGING rather than NOW */
const waitHTML = w => w === WAITING_FOR_YOU ? `<span class="wfy">${w}</span>` : w;
const stepTemp = s => (s.type === "SpargeStep" ? "water " : "") + s.temp;
const runWord = s => s.type === "SpargeStep" ? "SPARGING" : "NOW";
function stepHTML(s, i) {
  const r = st.recipe, state = i < r.cur ? "done" : i === r.cur ? "cur" : "";
  const p = [s.temp != null ? `${stepTemp(s)} ${M.U}` : "", s.min ? `${s.min} min` : ""].filter(Boolean).join(" · ");
  const right = state === "done" ? "✓ DONE" : state === "cur" ? (r.state === "running" ? (r.wait ? waitHTML(r.wait) : (s.min ? `<span id="r-left">${mmss(r.left)}</span> LEFT` : runWord(s))) : r.state === "ready" ? (r.wait ? waitHTML(r.wait) : "READY") : "STOPPED") : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
  const pct = s.min ? pctOf(r.left, s.min) : 0;
  const bar = state === "cur" && s.min ? `<span class="bar"><i id="r-bar" style="width:${pct}%"></i></span>` : "";
  const adds = s.adds ? `<span class="adds">${s.adds.map((a, j) => addHTML(a, j, state, s)).join("")}</span>` : "";
  return `<li class="step${state === "done" ? " done" : ""}"${state === "cur" ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${esc(s.n)}</span>${p ? `<span class="p">${p}</span>` : ""}${s.note ? `<span class="p">${esc(s.note)}</span>` : ""}<span class="s">${right}</span>${bar}${adds}</li>`;
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
  return `<h2>No recipe running</h2>
    <p class="rmeta">Brewing by hand. Kettles and pumps work as usual.</p>
    <section class="timer" aria-labelledby="tm-h"><h3 id="tm-h">Rest timer</h3>
      <output id="tm-out">${mmss(t.left)}</output>
      <div>${b("cmdbtn", "−5 MIN", "", {cmd: "tm:-300", why: off})}${b("cmdbtn", "+5 MIN", "", {cmd: "tm:300", why: off})}${b("cmdbtn go", pt ? (pt === "start" ? "STARTING…" : "PAUSING…") : t.running ? "PAUSE TIMER" : "START TIMER", t.running ? "counting down on every screen" : "alarm at zero, on every screen", {cmd: "tm:go", why: off || (pt ? WAIT : "")})}</div>
    </section>
    <section class="book" aria-labelledby="bk-h"><h3 id="bk-h">Recipe book</h3><ul>${M.BOOK.map((x, i) => `<li><span class="bn">${esc(x.n)}</span><span class="bd">${esc(x.d)}</span>${b("cmdbtn", "LOAD", "", {cmd: "load:" + i, why: off || ld})}</li>`).join("")}</ul></section>
    <div class="handlinks">${b("cmdbtn", "RECIPE BOOK", "all recipes", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "BREW STEPS", "build or edit steps", {cmd: "tab:Brew Steps"})}</div>
    <p class="note">${esc(st.notes.r || "")}</p>`;
}
function nowHTML() {
  const r = st.recipe;
  if (!r) return `<span class="n">–</span><b>No recipe running</b><span class="p">Brewing by hand · rest timer below</span>`;
  const S = M.RECIPE.steps, s = S[r.cur], pct = s.min ? pctOf(r.left, s.min) : 0;
  const p = [s.temp != null ? `${stepTemp(s)} ${M.U}` : "", s.min ? `${s.min} min` : "", `step ${r.cur + 1} of ${S.length}`].filter(Boolean).join(" · ");
  const nx = S[r.cur + 1];
  const nxt = nx ? `<span class="nx">Next: ${esc(nx.n)}${nx.temp != null ? ` · ${stepTemp(nx)} ${M.U}` : ""}${nx.min ? ` · ${nx.min} min` : ""}</span>` : `<span class="nx">Last step</span>`;
  return `<span class="n">${r.cur + 1}</span><b>${esc(s.n)}</b><span class="p">${p}</span><span class="left">${r.state === "running" ? (r.wait ? waitHTML(r.wait).toLowerCase() : s.min ? `<span id="now-left">${mmss(r.left)}</span> left` : runWord(s).toLowerCase()) : r.state === "ready" ? (r.wait ? waitHTML(r.wait).toLowerCase() : "ready") : "stopped"}</span>${s.min ? `<span class="bar"><i id="now-bar" style="width:${pct}%"></i></span>` : ""}${nxt}`;
}

/* ---------- alarms, last event, rig ---------- */
/* a prompt from CraftBeerPi can have several buttons (x.acts); x.more counts what waits behind it */
function bannerHTML() {
  const x = st.banner;
  if (!x) return `${ICON.ok}<span class="msg">No alarms</span>`;
  const acts = x.acts || (x.act ? [{label: x.act, cmd: x.cmd}] : []);
  const act = acts.map(y => b("act", st.pend.b && (acts.length === 1 || st.pend.b === y.cmd) ? "SENDING…" : esc(y.label), "", {cmd: y.cmd, why: st.pend.b ? WAIT : ""})).join("");
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
   until the boil starts, the wort pump sends wort to the boil kettle and the HLT pump sends sparge water to the top
   of the mash tun (Scott, 9 Nov: "I fly sparge"). At any other time, and with no recipe, it shows recirculating. */
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
   "Ready to boil?" is I). Live, CraftBeerPi's own; in the demo, worked out from the scene, as in the mockup. */
function stepStatus(i) {
  const r = st.recipe, s = M.RECIPE.steps[i];
  if (s && s.status) return s.status;
  return i < r.cur ? "D" : i > r.cur ? "I" : r.state === "running" ? "A" : r.state === "stopped" ? "S" : "I";
}
/* the runoff step's index while the wort should be on its way to the boil kettle, else -1 */
function runoffStep() {
  const S = M.RECIPE.steps;
  if (!st.recipe) return -1;
  const ro = S.findIndex(s => collectsWort(s)), bo = S.findIndex((s, i) => i > ro && s.boil);
  return ro >= 0 && stepStatus(ro) !== "I" && (bo < 0 || stepStatus(bo) === "I") ? ro : -1;
}
function rigDesc(ro, held, setNow) {
  const spLine = !!$("#ln-sparge"), head = "Hot liquor tank, mash tun and boil kettle. ";
  if (ro < 0 || held) return head + "The HLT pump circulates hot water around the hot liquor tank. The wort pump moves wort from the mash tun, through the coil inside the hot liquor tank, and back into the mash tun. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating, with the lines to the boil kettle"
    + (spLine ? " and to the top of the mash tun" : "") + " closed."
    + (setNow ? ` Step ${ro + 1}, ${M.RECIPE.steps[ro].n}, is waiting for you to set them for the sparge: close the coil line${spLine ? " and the HLT return" : ""}, and open the line to the boil kettle${spLine ? " and the sparge line to the top of the mash tun" : ""}.` : "");
  return head + (spLine ? "The HLT pump sends hot water over to the top of the mash tun for the sparge. " : "The HLT pump circulates hot water around the hot liquor tank. ")
    + `The wort pump moves wort from the mash tun down and across to the boil kettle, past the HERMS coil. The valves are set by hand and CraftBeerPi can't see them: they are shown as step ${ro + 1}, ${M.RECIPE.steps[ro].n}, needs them.`;
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
  [["hlt", "hltPump"], ["wort", "wortPump"]].forEach(([id, k]) => {
    const p = a[k];
    on("#pump-" + id, live && p.on);
    setText($(`#pump-${id} .p-st`), (live ? "" : "LAST: ") + (p.on ? "RUNNING" : "OFF"));
    setText($(`#pump-${id} .p-ovr`), M.ACT[k].override && !p.on ? "UNLESS OVERRIDE SWITCH IS ON" : "");
  });
  /* layout A's drawing has no sparge line: its HLT pump always goes back round the hot liquor tank. A SpargeStep keeps
     the valves on recirculating until "Sparge started" (r.started, its _sparge_started; not the countdown, which a
     Timer of 0 never has): the HLT is still heating the water, and the wort pump is off. While its "Sparge started"
     question waits, the valves to change are marked */
  const ro = runoffStep(), r = st.recipe, held = ro >= 0 && M.RECIPE.steps[ro].type === "SpargeStep" && r.cur === ro && !r.started;
  const setNow = held && r.wait === WAITING_FOR_YOU && live, hasSp = !!$("#ln-sparge");
  const out = ro >= 0 && !held, sp = out && hasSp;
  const wp = live && a.wortPump.on, hp = live && a.hltPump.on;
  on("#ln-wort-in", wp); on("#ln-wort-out", wp); on("#ln-wort-coil", wp && !out); on("#ln-xfer", wp && out); on("#coil", wp && !out);
  on("#ln-hlt-in", hp); on("#ln-hlt-up", hp); on("#ln-hlt-ret", hp && !sp); on("#ln-sparge", hp && sp);
  setValve("coil", !out, wp, setNow); setValve("bk", out, wp, setNow); setValve("ret", !sp, hp, setNow && hasSp); setValve("sp", sp, hp, setNow);
  const vn = $("#vnote-2");
  setText(vn, setNow ? `SET THEM FOR STEP ${ro + 1} (${M.RECIPE.steps[ro].n.toUpperCase()})` : out ? `SHOWN FOR STEP ${ro + 1} (${M.RECIPE.steps[ro].n.toUpperCase()})` : "SHOWN FOR RECIRCULATING");
  vn.classList.toggle("set", setNow);
  setText($("#rig-d"), rigDesc(ro, held, setNow));
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
  box.innerHTML = rigSVG(LAYOUT === "b" ? "line" : "kettle", W, rs);
  renderRig();
}
function renderAll() {
  if (!root || !st) return;
  if (!DEMO_MODE) liveBanner();
  const lost = st.link === "lost", hello = lost && connecting();
  // the new boil kettle's rules (brewday.css [data-bk=power]) apply while its BoilPower is the new one
  if (M.BKNEW) document.documentElement.dataset.bk = "power"; else delete document.documentElement.dataset.bk;
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
  morph(bn, bannerHTML());
  morph($("#event"), eventHTML());
  morph($("#plates"), ["hlt", "mt", "bk"].map(plateHTML).join(""));
  morph($("#recipe"), recipeHTML());
  morph($("#now"), nowHTML());
  renderRig();
  if (GRAPHS) drawGraphs();
}

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
// the logs the live history reads: each vessel's temperature, its kettle's target and AUTO, its element's level (M63)
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
function logEvent(what, res, tone, cav = "") {
  if (DEMO_MODE) { st.events.unshift([hhmmss(st.t), what, res, tone, cav]); return; }
  st.t = daySeconds();
  st.events.unshift([hhmmss(st.t), what, res, tone, cav, Date.now()]);
  if (st.events.length > 50) st.events.length = 50;
  saveEvents();
}
function say(text, urgent) { const el = $(urgent ? "#sr-alert" : "#sr"); el.textContent = ""; const g = gen; setTimeout(() => { if (g === gen && root) el.textContent = text; }, 40); }
function note(where, text) {
  st.notes[where] = text; renderAll();
  clearTimeout(noteTimers[where]);
  noteTimers[where] = setTimeout(() => { if (st.notes[where] === text) { st.notes[where] = ""; renderAll(); } }, 6000);
}
function noteAt(el, text) {
  const pl = el.closest(".plate");
  if (pl) note(pl.id.slice(3), text); else if (el.closest(".recipe")) note("r", text); else toast(text);
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
/* every box opens with its number selected, so typing replaces it: typing 150 into "168.0" gave "150168.0" (the dashboard
   agent, 10 Nov; the new boil kettle's boxes did it first, "BOIL" included) */
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
  send("t:bk", "set", label, () => { V.sv = T; bkRetarget(); }, cav);
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
/* −5 % and +5 %: sent at once, no SET. The same set_boil_power as the box; a tap that would go past 0 or 100 % stops there
   (2 % − 5 → 0 %), and only at 0 or 100 % itself is the button refused */
function cmdNudge(d) {
  const V = st.v.bk, el = st.a.bkEl, was = V.bp, val = Math.min(100, Math.max(0, was + d));
  if (val === was) return;
  const cav = el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilTh()} ${M.U}, full power until then`;
  const label = `Boil power ${val} % (was ${was} %)`;
  if (!DEMO_MODE) return livePower(true, val, was, label, cav, d < 0 ? "down" : "up");
  send("p:bk", d < 0 ? "down" : "up", label, () => {
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
    const ho = bkHoldT(), p = ho != null ? holdOut(ho, V.pv, false) : bkLatched() ? V.bp : 100;
    el.on = p > 0; el.pct = p;
  });
}
/* the new boil kettle, after its target changes while AUTO runs: BOIL heats at full power until the boil point, then at the
   boil power; a hold eases in, or rests while the wort is above it. A paused element stays off. (Demo.) */
function bkRetarget() {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT();
  if (V.mode !== "auto") return;
  V.latched = ho == null && V.pv >= boilFrom();
  if (el.paused) return;
  const p = ho == null ? (V.latched ? V.bp : 100) : holdOut(ho, V.pv, el.on);
  el.on = p > 0; el.pct = p;
}
/* a recipe step sets its kettle's target. With the new BoilPower the Boil step sets the boil kettle's target to BOIL (the
   boil point), so a hold left from the day before can't stop a boil. (Demo.) */
function stepTarget(s) {
  const pw = bkNew(s.k);
  st.v[s.k].sv = pw && s.boil ? boilFrom() : s.temp;
  if (st.v[s.k].mode !== "auto") setMode(s.k, "auto");
  else if (s.k === "mt") st.v.hlt.sv = +(s.temp + M.HERMS_DELTA).toFixed(1);
  else if (pw) bkRetarget();
}
function stepStart(i) {
  const r = st.recipe, s = M.RECIPE.steps[i], was = M.RECIPE.steps[r.cur];
  /* a SpargeStep ending: the HLT's AUTO off, the pumps left as they are. Only its timer running out also puts the HLT's
     target to 0 (SpargeStep.on_timer_done); NEXT STEP leaves it */
  if (was && was.type === "SpargeStep" && i !== r.cur) {
    if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
    if (was.min && r.left === 0) st.v.hlt.sv = null;
    r.started = false;
    if (st.banner && st.banner.sparge) st.banner = null;
  }
  r.cur = i; r.left = (s.min || 0) * 60; r.adds = []; r.wait = null;
  if (st.hist) st.hist.steps.push([st.t, i + 1]);
  if (s.k === "bk") { st.fill.bk = true; st.fill.mtLiq = false; if (st.v.mt.mode === "auto") setMode("mt", "manual"); }
  if (s.type === "SpargeStep") { r.started = false; spargeBegin(s); return; }
  if (s.temp != null) stepTarget(s);
  else if (s.note) st.banner = {tone: "prompt", title: s.n, text: s.note, act: "DONE", cmd: "b:done"};
}
/* a SpargeStep starting, or starting again after a Stop (SpargeStep.on_start): the mash tun's AUTO off, so its HERMS and
   the wort pump stop. Until "Sparge started" has been pressed, the HLT goes on its own AUTO at the step's temperature,
   HEATING until the water is there, when the step asks; after it, a Start carries on and doesn't heat again */
function spargeBegin(s) {
  const r = st.recipe, i = r.cur;
  if (st.v.mt.mode === "auto") setMode("mt", "manual");
  if (r.started) { r.wait = null; return; }
  st.v.hlt.sv = st.v.hlt.own = s.temp;
  if (st.v.hlt.mode !== "auto") setMode("hlt", "auto");
  r.wait = "HEATING";
  if (st.v.hlt.pv < s.temp) return;
  /* the water is already there: the step's next look (within a brewing second) finds it and asks */
  timers.push(setTimeout(() => {
    if (st.recipe !== r || r.cur !== i || r.state !== "running" || r.started) return;
    r.wait = WAITING_FOR_YOU; st.banner = DEMO.spargeBanner(s.temp);
    logEvent(`${s.n}: the sparge water is ready at ${s.temp} ${M.U}`, "waiting for you", "wait");
    renderAll();
  }, 600));
}
function cmdStart() {
  send("r:start", "start", "Recipe started", () => {
    const r = st.recipe, s = M.RECIPE.steps[r.cur], fresh = r.state === "ready";
    if (fresh && st.hist) st.hist.steps.push([st.t, r.cur + 1]);
    r.state = "running";
    if (s.type === "SpargeStep") spargeBegin(s);
    else if (s.temp != null) stepTarget(s);
    /* a recipe started from its first step puts the boil power back to the usual power (Usual_Boil_Power). A change made
       later that day, before or during the boil, is kept for the boil, and doesn't carry over to the next brew day */
    const V = st.v.bk;
    if (M.BKNEW && fresh && V.usual != null && V.bp !== V.usual) {
      const was = V.bp; V.bp = V.usual;
      timers.push(setTimeout(() => { logEvent(`Boil power back to your usual ${V.usual} % (was ${was} %)`, "by recipe", ""); renderAll(); }, 300));
    }
  });
}
function cmdStop() {
  st.confirmNext = false;
  send("r:stop", "stop", "Recipe stopped", () => {
    const k = M.RECIPE.steps[st.recipe.cur].k;
    st.recipe.state = "stopped";
    if (st.v[k].mode === "auto") setMode(k, "manual");
    /* a SpargeStep's "Sparge started" question is taken down when the step stops, and asked again when it starts */
    if (st.banner && st.banner.sparge) { st.banner = null; st.recipe.wait = null; }
  });
}
function cmdNextYes() {
  const r = st.recipe, nx = M.RECIPE.steps[r.cur + 1];
  st.confirmNext = false;
  send("r:next", "next", `Skipped to ${nx.n}`, () => { stepStart(r.cur + 1); r.state = "running"; });
}
function cmdBanner(x) {
  if (x === "added") send("b", "x", "Hop alert answered: 3.00 oz Centennial added", () => { st.banner = null; if (st.recipe) st.recipe.adds[0] = "done"; });
  else if (x === "done") send("b", "x", `${M.RECIPE.steps[st.recipe.cur].n} done`, () => { st.banner = null; stepStart(st.recipe.cur + 1); });
  /* the SpargeStep's "Sparge started": its timer starts (or it runs until NEXT STEP), the HLT's AUTO goes off, and the
     drawing goes over to the runoff */
  else if (x === "sparge") {
    const s = M.RECIPE.steps[st.recipe.cur];
    send("b", "x", spargeStartedLine(s), () => {
      const r = st.recipe;
      st.banner = null; r.wait = null; r.started = true;
      if (st.v.hlt.mode === "auto") {
        setMode("hlt", "manual");
        timers.push(setTimeout(() => { logEvent("HLT AUTO off, so its element won't run as the HLT empties", "by recipe", ""); renderAll(); }, 300));
      }
    });
  }
  else { st.banner = null; renderAll(); }
}
const spargeStartedLine = s => `${s.n}: sparge started, ${s.min ? `${s.min} min timer started` : "until NEXT STEP"}`;
function cmdLoad(i) {
  if (i !== 0) return toast(`Mockup: only Test Recipe v5 is filled in here. On the real screen, LOAD sends ${M.BOOK[i].n} to Brew Steps, as the Recipe Book does today.`);
  send("r:load", "load", `${M.BOOK[0].n} loaded`, () => { st.recipe = {state: "ready", cur: 0, left: 0, adds: []}; });
}
/* ALL OFF (Scott, 9 Nov): stop the recipe first so it can't switch a kettle back on, then every vessel to MANUAL,
   then both elements and both pumps off */
function cmdAllOff() {
  const running = st.recipe && st.recipe.state === "running";
  const cav = Object.keys(M.ACT).filter(id => M.ACT[id].override).map(id => `${M.ACT[id].name}'s override switch can still run it`).join(" · ");
  st.confirmNext = false; st.edit = null;
  send("alloff", "off", `ALL OFF: elements and pumps off, every vessel MANUAL${running ? ", recipe stopped" : ""}`, () => {
    if (running) st.recipe.state = "stopped";
    ["hlt", "mt", "bk"].forEach(v => { if (st.v[v].mode === "auto") setMode(v, "manual"); });
    Object.keys(M.ACT).forEach(id => setActor(id, false));
    if (st.banner && /^act:/.test(st.banner.cmd || "")) st.banner = null;
  }, cav);
}
/* one rest timer, kept by CraftBeerPi, so the monitor and the phone show the same one (Scott, 9 Nov) */
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
const alarm = (text, act, cmd) => { st.alarm = {tone: "alarm", title: "Command failed", text, act, cmd}; };
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
function liveStart() {
  const r = st.recipe, s = r && M.RECIPE.steps[r.cur];
  own.start = {at: Date.now(), ids: s ? [s.id] : []};
  exec("r:start", "start", "Recipe started", api.start, {fail: () => alarm("The recipe did not start.", "OK", "b:ok")});
}
function liveStop() {
  st.confirmNext = false;
  own.stop = Date.now();
  exec("r:stop", "stop", "Recipe stopped", api.stop, {fail: () => alarm("The recipe did not stop. It may still be running.", "TRY AGAIN", "r:stop")});
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
  const done = () => { answered.add(nid); if (opts.removeAlert) opts.removeAlert(p.id); };
  // a SpargeStep's Sparge started says what it starts, and its flag turning true isn't logged a second time (observe)
  const r = st.recipe, s = r && M.RECIPE.steps[r.cur];
  const sparge = !!(s && s.type === "SpargeStep" && String(p.title || "") === s.n && a && /^sparge started$/i.test(String(a.label || "").trim()));
  if (sparge) own.sparge = {at: Date.now(), id: s.id};
  exec("b", `p:${nid}:${aid}`, sparge ? spargeStartedLine(s) : `${p.title} answered: ${a ? a.label : "OK"}`, () => api.answer(nid, aid), {
    ok: done,
    // 400: CraftBeerPi no longer waits for it (answered elsewhere, or withdrawn)
    fail: res => res.status === 400 ? done() : alarm(`${p.title}: your answer did not reach CraftBeerPi.`, "TRY AGAIN", `p:${nid}:${aid}`)
  });
}
function liveLoad(i) {
  const x = M.BOOK[i];
  if (!x) return;
  exec("r:load", "load", `${x.n} loaded`, () => api.brew(x.file), {fail: () => alarm(`${x.n} did not load.`, "OK", "b:ok")});
}
/* ALL OFF (Scott, 9 Nov): the recipe stops first so it can't switch a kettle back on, then every kettle to
   MANUAL, then both elements and both pumps. Kettle /off always answers 204, so what counts is the state
   CraftBeerPi reports a moment later. */
async function liveAllOff() {
  if (st.pend.alloff) return;
  const g = gen, running = st.recipe && st.recipe.state === "running";
  const cav = Object.keys(M.ACT).filter(id => M.ACT[id].id && M.ACT[id].override).map(id => `${M.ACT[id].name}'s override switch can still run it`).join(" · ");
  st.confirmNext = false; st.edit = null;
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
    st.alarm = {tone: "alarm", title: "ALL OFF incomplete", text: `Still on: ${failed.join(", ")}.`, act: "TRY AGAIN", cmd: "alloff"};
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
const TAB_PATH = {"Recipe Book": "/recipes", "Brew Steps": "/mashprofile"};
function go(path) { if (opts.navigate) opts.navigate(path); else window.location.hash = "#" + path; }

function run(cmd) {
  const [k, x, y] = cmd.split(":");
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
      st.confirmNext = x === "next"; st.confirmFor = st.recipe ? st.recipe.cur : null; return renderAll();
    case "b":
      if (DEMO_MODE) return cmdBanner(x);
      if (x === "ok") st.alarm = null;
      return renderAll();
    case "p": return livePrompt(x, y);
    case "e": st.errors = st.errors.filter(e => String(e.id) !== x); return renderAll();
    case "w": st.warnings = st.warnings.filter(w => String(w.id) !== x); return renderAll();
    case "alloff": return DEMO_MODE ? cmdAllOff() : liveAllOff();
    case "log": st.logOpen = !st.logOpen; return renderAll();
    case "tm": return DEMO_MODE ? cmdTimer(x) : liveTimer(x);
    case "tab": return DEMO_MODE ? toast(`Mockup: this opens the existing ${x} page.`) : go(TAB_PATH[x] || "/");
    case "load": return DEMO_MODE ? cmdLoad(+x) : liveLoad(+x);
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
    events: loadEvents(), pend: {}, notes: {}, edit: null, confirmNext: false, logOpen: false,
    fail: {}, expect: {}, alarm: null, errors: [], warnings: [], prompts: [], lostAt: null, openedAt: Date.now()};
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
  // element's own level, which it comes on at by hand (manual_power since M61; power from a CraftBeerPi before it).
  const bkp = M.K.bk && M.K.bk.props, be = M.A.bkEl;
  st.v.bk.bp = Math.round(num(bkp && bkp.Boil_Power) ?? 85);
  st.a.bkEl.lvl = Math.round(num(be && (be.manual_power ?? be.power)) ?? 100);
  // The new BoilPower's settings: the boil point (BOIL AT), KEEP BOILING, the usual boil power and a pause, which it keeps
  // in the kettle's settings so every page shows them. Its boil latch it doesn't publish: below the boil point in AUTO, an
  // element on below full power (Max_Output) is running at the boil power (BUILD-NOTES).
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
  if (st.confirmNext && (!st.recipe || st.recipe.cur !== st.confirmFor || st.recipe.state !== "running")) st.confirmNext = false;
  st.timer = timerNow(snap.timer);
  if (!st.recipe && !bookShown) { bookShown = true; loadBook(); }
  if (st.recipe) bookShown = false;
  powerModeChanged(st.v.bk.mode);
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
  return {state, cur, left: left ?? (s.min ? s.min * 60 : 0), wait, adds, started: s.type === "SpargeStep" && !!props._sparge_started};
}
// The title bar: no connection first, then a command that failed, then CraftBeerPi's errors, its warnings, then
// its prompts. For its first few seconds a page that has not connected yet says so calmly.
function liveBanner() {
  if (st.link === "lost") {
    st.banner = everConnected
      ? {tone: "alarm", title: "No connection", text: "Readings are {age} s old. Trying again every 5 s. Controls are paused until CraftBeerPi answers."}
      : connecting()
      ? {tone: "connecting", title: "Connecting", text: "Waiting for CraftBeerPi to answer."}
      : {tone: "alarm", title: "Connecting", text: "Waiting for CraftBeerPi to answer. Controls are paused until it does."};
    return;
  }
  const queue = [];
  if (st.alarm) queue.push(st.alarm);
  st.errors.forEach(e => queue.push({tone: "alarm", title: ut(e.title || "Error"), text: ut(e.message || ""), act: "OK", cmd: `e:${e.id}`}));
  st.warnings.forEach(w => queue.push({tone: "warning", title: ut(w.title || "Warning"), text: ut(w.message || ""), act: "OK", cmd: `w:${w.id}`}));
  st.prompts.forEach(p => queue.push({tone: "prompt", title: ut(p.title || "CraftBeerPi"), text: ut(p.message || ""), acts: p.action.map(a => ({label: String(a.label || "OK").toUpperCase(), cmd: `p:${p.id}:${a.id}`}))}));
  st.banner = queue.length ? {...queue[0], more: queue.length - 1} : null;
}
/* a warning stays in the title bar until OK; the same one again is not shown twice */
function addWarning(id, title, message) {
  if (st.warnings.some(w => w.title === title && w.message === message)) return;
  st.warnings.push({id, title, message});
  if (st.warnings.length > 10) st.warnings.shift();
}
/* a step starting, or resuming after a Stop, for the event line. A SpargeStep says what it does as it starts (the design,
   10 Nov): it heats the sparge water with the mash tun MANUAL, or with no water to heat leaves the pumps to the brewer.
   Resumed after Sparge started, it doesn't heat again, so it names no target */
function stepStartLine(m, resumed, s) {
  const p = (s && s.props) || {};
  if (s && s.type === "SpargeStep") {
    if (resumed && p._sparge_started) return `${m.n} resumed`;
    if (!resumed) return p.Kettle && m.temp > 0 ? `${m.n}: heating the sparge water to ${m.temp} ${M.U}, mash tun MANUAL` : `${m.n}: mash tun MANUAL, the pumps are yours`;
  }
  return `${m.n} ${resumed ? "resumed" : "started"}${m.temp != null ? `, ${M.VNAME[m.k].toLowerCase()} target ${m.temp.toFixed(1)} ${M.U}` : ""}`;
}
// What happened since the last update, for the event line: the connection, everything CraftBeerPi says, and the
// recipe's steps starting, finishing and starting their timers. Commands from this screen log themselves.
function observe(prev, snap) {
  if (!prev) return;
  if (prev.connected && !snap.connected) logEvent("Connection to CraftBeerPi lost", "trying again", "bad");
  if (!prev.connected && snap.connected && everConnected) {
    logEvent("Connection to CraftBeerPi back", "", "");
    if (!st.recipe) loadBook();
  }
  const before = new Map((prev.alerts || []).map(a => [String(a.id), a]));
  const now = new Set((snap.alerts || []).map(a => String(a.id)));
  for (const a of snap.alerts || []) {
    const id = String(a.id), type = String(a.type || "").toLowerCase(), title = ut(a.title), msg = ut(a.message), line = `${title}: ${msg}`;
    if (before.has(id) || OWN_ALERTS.has(id)) continue;
    if (Array.isArray(a.action) && a.action.length) { logEvent(line, "waiting for you", "wait"); say(`${title}. ${msg}`, true); }
    else if (type === "error") { st.errors.push({id, title: a.title, message: a.message}); logEvent(line, "from CraftBeerPi", "bad"); say(`${title}. ${msg}`, true); }
    else if (type === "warning") { addWarning(id, a.title, a.message); logEvent(line, "from CraftBeerPi", "wait"); say(`${title}. ${msg}`); }
    else if (!ROUTINE.test(String(a.message || "").trim())) logEvent(line, "from CraftBeerPi", "");
  }
  // a prompt gone without an answer from here: answered on another screen, or CraftBeerPi no longer needs it
  for (const [id, a] of before) {
    if (now.has(id) || !Array.isArray(a.action) || !a.action.length) continue;
    if (answered.delete(id)) continue;
    const why = typeof snap.retired === "function" ? snap.retired(a.id) : null;
    logEvent(`${ut(a.title)}: ${ut(a.message)}`, why === "answered" ? "answered on another screen" : "no longer needed", "");
  }
  const old = new Map((prev.steps || []).filter(Boolean).map(s => [s.id, s]));
  const steps = (snap.steps || []).filter(Boolean);
  // START and NEXT STEP pressed here have logged themselves ("Recipe started", "Skipped to …"), as in the
  // mockup: the steps they start and finish are the brewer's doing, not the recipe's.
  const mine = id => ["start", "next"].some(k => own[k] && Date.now() - own[k].at < 10000 && own[k].ids.includes(id));
  for (const s of steps) {
    const o = old.get(s.id);
    if (!o) continue;
    const m = M.RECIPE.steps.find(x => x.id === s.id) || {n: s.name}, sparge = s.type === "SpargeStep";
    // a SpargeStep's Sparge started pressed elsewhere: its timer starts at the press, not at a temperature
    if (sparge && !(o.props || {})._sparge_started && (s.props || {})._sparge_started
      && !(own.sparge && own.sparge.id === s.id && Date.now() - own.sparge.at < 10000)) logEvent(spargeStartedLine(m), "from another screen", "");
    if (o.status === s.status && parseLeft(o.state_text) != null) continue;
    if (o.status !== "A" && s.status === "A") {
      if (!mine(s.id)) logEvent(stepStartLine(m, o.status === "S", s), "by recipe", "");
    } else if (o.status === "A" && s.status === "D") { if (!mine(s.id)) logEvent(`${m.n} finished`, "by recipe", ""); }
    else if (o.status === "A" && s.status === "S" && !(Date.now() - (own.stop || 0) < 10000)) logEvent(`${m.n} stopped`, "from another screen", "");
    else if (s.status === "E" && o.status !== "E") logEvent(`${m.n}: error`, "by recipe", "bad");
    else if (o.status === "A" && s.status === "A" && parseLeft(o.state_text) == null && parseLeft(s.state_text) != null && m.min && !sparge) {
      logEvent(`${m.n}: ${m.temp != null ? `${m.temp} ${M.U} reached, ` : ""}${m.min} min timer started`, "by recipe", "");
    }
  }
  if (steps.length && steps.every(s => s.status === "D") && (prev.steps || []).some(s => s && s.status !== "D") && steps.every(s => old.has(s.id))) {
    logEvent("Recipe finished", "by recipe", "ok");
  }
}

/* ---------- the event log is kept on this device ---------- */
function loadEvents() {
  try {
    const xs = JSON.parse(window.localStorage.getItem(EVENTS_KEY) || "[]");
    const keep = Date.now() - EVENTS_KEEP_MS;
    return Array.isArray(xs) ? xs.filter(e => Array.isArray(e) && e.length >= 4 && e[5] > keep).slice(0, 50) : [];
  } catch (e) { return []; }
}
function saveEvents() {
  try { window.localStorage.setItem(EVENTS_KEY, JSON.stringify(st.events.slice(0, 50))); } catch (e) { /* private window: kept for this visit only */ }
}

/* ---------- the Recipe Book, when no recipe is loaded ---------- */
async function loadBook() {
  if (bookBusy || DEMO_MODE) return;
  const g = gen;
  bookBusy = true;
  try {
    const res = await api.recipes();
    if (g !== gen || !res.ok || !Array.isArray(res.data)) return;
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
// button between updates (the mockup drew a new one), so the click would land on it as a tap - by then a
// heater's "tap to turn off". The click is the end of the hold, not a tap.
let afterHold = null;
function holdStart(el, pointer) {
  if (hold) return;
  el.classList.add("holding");
  hold = {el, cmd: el.dataset.cmd, timer: setTimeout(() => {
    const c = hold.cmd; el.classList.remove("holding"); hold = null;
    if (pointer) afterHold = el;
    // live: not sent if the button stopped being this hold while the finger was on it
    if (!DEMO_MODE && !(el.isConnected && el.hasAttribute("data-hold") && el.getAttribute("aria-disabled") !== "true" && el.dataset.cmd === c)) {
      noteAt(el.isConnected ? el : $("#app"), "Not sent: the screen changed while you held it. Hold it again if you still want it.");
      return;
    }
    run(c);
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
    const el = e.target.closest && e.target.closest("[data-hold]");
    if (!el || !root.contains(el) || e.button !== 0) return;
    // not focused, as in the mockup, where the button was drawn anew: a pointer hold leaves no focus ring
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    holdStart(el, true);
  },
  pointerup: () => holdEnd(true),
  pointercancel: () => holdEnd(false),
  contextmenu: e => { if (e.target.closest && e.target.closest("[data-hold]")) e.preventDefault(); },
  keydown: e => {
    afterHold = null;
    const el = e.target.closest ? e.target.closest("[data-hold]") : null;
    if (el && root.contains(el) && (e.key === " " || e.key === "Enter")) { e.preventDefault(); if (!e.repeat) holdStart(el, false); return; }
    if (e.target.id === "tin" && e.key === "Enter") { e.preventDefault(); if (st.edit && st.edit.kind === "pwr") cmdPwrSet(); else cmdTgtSet(); return; }
    if (e.key === "Escape" && moreOpen()) { closeMore(); const t = $('.tabs a[data-tab="More"]'); if (t) t.focus(); return; }
    if (e.key === "Escape" && (st.edit || st.logOpen || st.confirmNext)) { st.edit = null; st.logOpen = false; st.confirmNext = false; renderAll(); }
  },
  keyup: e => { if (hold && (e.key === " " || e.key === "Enter")) { e.preventDefault(); holdEnd(true); } },
  input: e => {
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
        if (tab.dataset.tab) toast(tab.dataset.tab === "More" ? "Mockup: MORE holds Fermenter Profile, Plugins, System and About." : `Mockup: this opens the existing ${tab.dataset.tab} page.`);
      } else if (tab.dataset.tab === "More") { e.preventDefault(); toggleMore(tab); }
      else if (!tab.dataset.tab) e.preventDefault();
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
  const pz = root.querySelector("#pz");
  if (pz && st.a.bkEl.paused) pz.textContent = mmss(pausedFor());
  /* CraftBeerPi's warning, 5 s after a kettle's AUTO started with no target (M64). The boil kettle never gets one:
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
  /* BoilPower's warning after 2 brewing minutes paused, once per pause (Scott, 10 Nov), waiting its turn as that one does */
  const pe = st.a.bkEl;
  if (M.BKNEW && pe.paused && !pe.pauseWarned && st.t - pe.pausedAt >= 120 && !st.banner) {
    pe.pauseWarned = true;
    st.banner = DEMO.pauseBanner();
    logEvent(st.banner.title, "waiting for you", "wait");
    say(`${st.banner.title}. ${st.banner.text}`, true);
    renderAll();
  }
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
}
function liveTick() {
  st.t = daySeconds();
  setText($("#clock"), hhmm(st.t));
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
  root = el; opts = o; DEMO_MODE = !!o.demo;
  timers = []; noteTimers = {}; hold = null; afterHold = null; rigW = 0; last = null; everConnected = false; book = []; bookBusy = false; bookShown = false;
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
  GRAPHS = o.graphs === "none" ? "" : "face";
  if (GRAPHS) html.dataset.graphs = GRAPHS; else delete html.dataset.graphs;
  // the span: ?span= for a screenshot, else the one this device last chose (the demo always starts at 30 MIN, as the mockup)
  gSpan = "30";
  let kept = null;
  if (!DEMO_MODE) { try { kept = localStorage.getItem(GSPAN_KEY); } catch (e) { /* private mode */ } }
  for (const s of [o.span, kept]) if (GSPANS.some(x => x[0] === s)) { gSpan = s; break; }
  rigRs = 1; H = null;
  root.innerHTML = skeleton(DEMO_MODE);
  if (DEMO_MODE) {
    const key = DEMO.SCENES[o.demo] || DEMO.EXTRA[o.demo] ? o.demo : "mash";
    M = {RECIPE: DEMO.RECIPE, VNAME: DEMO.VNAME, VACT: DEMO.VACT, ACT: DEMO.ACT, HERMS_DELTA: DEMO.HERMS_DELTA, BOOK: DEMO.BOOK, U: "°F", LIMITS: [32, 230],
      BOILPOWER: true, BKNEW: true, BOIL_TH: DEMO.BOIL_TH};
    st = (DEMO.SCENES[key] || DEMO.EXTRA[key])();
    // the sparge-… moments run a recipe whose step 4 is a SpargeStep; every other moment keeps the MashStep
    if (st.sparge4) M.RECIPE = {...DEMO.RECIPE, steps: DEMO.RECIPE.steps.map((s, i) => i === 3 ? {...DEMO.SPARGE_STEP, ...st.sparge4} : s)};
    // a moment can open an editor (open) and borrow another moment's graph history (base)
    const open = st.open, base = st.base || key;
    delete st.open; delete st.base;
    Object.assign(st, {scene: key, pend: {}, notes: {}, edit: null, confirmNext: false, logOpen: false}, open);
    if (st.v.bk.bp == null) st.v.bk.bp = 45; // the boil kettle's Boil_Power setting, read from its props
    if (st.a.bkEl.lvl == null) st.a.bkEl.lvl = 100; // the boil element's own level (its power), used when it is on by hand
    if (st.v.bk.usual === undefined) st.v.bk.usual = 45; // its Usual_Boil_Power setting; null: none set
    if (st.v.bk.keep == null) st.v.bk.keep = true; // its Keep_Boiling setting, "Yes" unless Scott unticks it
    if (st.v.bk.boilAt == null) st.v.bk.boilAt = DEMO.BOIL_TH; // its boil point, Boil_Threshold (BOIL AT)
    if (GRAPHS) st.hist = DEMO.history(base, st.t);
    applyLocks();
  } else {
    st = blankMoment();
    M = model({book});
    if (GRAPHS) { H = createHistory(); st.hist = H.hist; }
    // shown until the first connection, and never kept: e[5] is 0
    if (!st.events.length) st.events.unshift([hhmmss(st.t), "Connecting to CraftBeerPi", "", "", "", 0]);
  }
  renderAll();
  for (const k in handlers) document.addEventListener(k, handlers[k]);
  window.addEventListener("resize", onWindow);
  window.addEventListener("scroll", onWindow, {passive: true});
  const ticker = setInterval(() => { if (gen === myGen && st) (DEMO_MODE ? demoTick : liveTick)(); }, 1000);
  const ro = new ResizeObserver(drawRig);
  ro.observe($("#rig"));
  // each graph is drawn to its box: again when the boxes change size, and when the fonts arrive, which widens them
  const gro = GRAPHS ? new ResizeObserver(() => drawGraphs()) : null;
  if (gro) gro.observe($(".brewhouse"));
  const onFonts = () => { if (gen === myGen) drawGraphs(); };
  if (GRAPHS && document.fonts) document.fonts.addEventListener("loadingdone", onFonts);
  function teardownThis() {
    clearInterval(ticker);
    ro.disconnect();
    if (gro) gro.disconnect();
    if (document.fonts) document.fonts.removeEventListener("loadingdone", onFonts);
  }
  teardown = () => {
    teardownThis();
    for (const k in handlers) document.removeEventListener(k, handlers[k]);
    window.removeEventListener("resize", onWindow);
    window.removeEventListener("scroll", onWindow);
    timers.forEach(clearTimeout); Object.values(noteTimers).forEach(clearTimeout); clearTimeout(toastT);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (hold) clearTimeout(hold.timer);
    hold = null;
    html.classList.remove("bd-page");
    delete html.dataset.layout;
    delete html.dataset.graphs;
    delete html.dataset.bk;
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
      // the graphs' step marks: when each step started, as CraftBeerPi keeps it (M63)
      if (H) H.steps(snap.steps);
      if (snap.connected && !everConnected) {
        if (st.events[0] && st.events[0][5] === 0) st.events.shift();
        if (!st.events.length) logEvent("Connected to CraftBeerPi", "", "");
        if (!st.recipe) loadBook();
      }
      observe(prev, snap);
      if (snap.connected) everConnected = true;
      schedule();
    },
    destroy() { if (gen === myGen) teardown(); }
  };
}
