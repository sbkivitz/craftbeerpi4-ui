"use strict";
/* ---------- demo data (from Scott's simulator config; nothing here talks to CraftBeerPi) ---------- */
const RECIPE = {
  name: "Craftbeerpi Test Recipe v5",
  steps: [
    {n: "MashIn", temp: 126, k: "mt", note: "Add the malt when it reaches 126 °F"},
    {n: "Protein Rest", temp: 126, min: 20, k: "mt"},
    {n: "Saccharification", temp: 149, min: 40, k: "mt"},
    {n: "Sparge", temp: 168, min: 40, k: "mt"},
    {n: "Boil", temp: 210.2, min: 90, k: "bk", boil: true, adds: [[60, "Centennial", "3.00 oz"], [15, "Willamette", "6.00 oz"], [15, "Whirlfloc tablet", "1"], [5, "Citra", "3.00 oz"]]},
    {n: "Whirlpool Hop", k: "bk", note: "Cool down to 170 °F. Then add 1.50 oz Calypso."},
    {n: "Whirlpool", temp: 170, min: 20, k: "bk"}
  ]
};
const VNAME = {hlt: "Hot liquor tank", mt: "Mash tun", bk: "Boil kettle"};
const VACT = {hlt: ["hltEl", "hltPump"], mt: ["wortPump"], bk: ["bkEl"]};
const ACT = {
  hltEl: {name: "HLT ELEMENT", kind: "heat", v: "hlt"},
  hltPump: {name: "HLT PUMP", kind: "pump", v: "hlt", override: true}, // the rig's Recirc_PUMP: its own override switch can run it, and CraftBeerPi can't see that switch
  wortPump: {name: "WORT PUMP", kind: "pump", v: "mt"},
  bkEl: {name: "BOIL ELEMENT", kind: "heat", v: "bk"}
};
const HERMS_DELTA = 5.4; // PID_HERMS DeltaTemp in the simulator
/* BoilPower, the boil kettle's logic: below Boil_Threshold it heats at full power (Max_Output); at or above it, it holds
   the element at Boil_Power, which Scott sets with set_boil_power (45 % on the simulators) */
const BOIL_TH = 210.2;
const BOOK = [ // the simulator's Recipe Book (config/recipes/*.yaml)
  {n: "Craftbeerpi Test Recipe v5", d: "7 steps · mash 126, 149 and 168 °F · 90 min boil"},
  {n: "Craftbeerpi Test Recipe v4", d: "6 steps · mash 126 and 149 °F · 90 min boil"},
  {n: "Craftbeerpi Test Recipe v3", d: "6 steps · mash 152 °F, mash out 168 °F · 90 min boil"},
  {n: "BrewStart ready-by demo", d: "3 steps · hot strike water by a set time, 152 °F"}
];

const MASH_EVENTS = [
  ["14:31:52", "HLT PUMP started", "confirmed", "ok"],
  ["14:16:19", "Saccharification: 149 °F reached, 40 min timer started", "by recipe", ""],
  ["14:09:40", "Saccharification started, mash tun target 149.0 °F", "by recipe", ""],
  ["14:09:38", "Protein Rest finished", "by recipe", ""],
  ["13:27:05", "MashIn: malt added", "confirmed", "ok"],
  ["13:26:58", "MashIn: 126 °F reached. Please add malt.", "answered", ""]
];
const mash = () => ({
  t: 14 * 3600 + 32 * 60 + 31, link: "ok", age: 0, banner: null,
  v: {hlt: {pv: 154.2, sv: 154.4, own: 168.0, mode: "manual"}, mt: {pv: 148.6, sv: 149.0, mode: "auto"}, bk: {pv: 68.0, sv: null, mode: "manual"}},
  a: {hltEl: {on: true, pct: 62}, hltPump: {on: true}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
  fill: {mtLiq: true, bk: false},
  recipe: {state: "running", cur: 2, left: 23 * 60 + 41, adds: []},
  events: MASH_EVENTS.map(e => e.slice())
});
const SCENES = {
  mash,
  hop: () => Object.assign(mash(), {
    t: 16 * 3600 + 2,
    banner: {tone: "prompt", title: "Hop alert", text: "Please add 3.00 oz Centennial (1)", act: "ADDED", cmd: "b:added"},
    v: {hlt: {pv: 165.3, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 151.2, sv: null, mode: "manual"}, bk: {pv: 210.6, sv: 210.2, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 45}},
    fill: {mtLiq: false, bk: true},
    recipe: {state: "running", cur: 4, left: 59 * 60 + 58, adds: ["due"]},
    events: [
      ["16:00:02", "Hop alert: add 3.00 oz Centennial (1)", "waiting for you", "wait"],
      ["15:30:04", "Boil: 210.2 °F reached, 90 min timer started", "by recipe", ""],
      ["15:01:47", "Boil started, boil kettle AUTO", "by recipe", ""],
      ["14:58:30", "Sparge finished", "by recipe", ""]
    ]
  }),
  /* boil power mid-recipe (Scott, 10 Nov: "I need to be able to adjust boil element power even while running a recipe"):
     step 5, the Boil, runs the boil kettle's AUTO; the hop is in, and Scott turns the boil down from 45 to 40 % */
  boilpower: () => {
    const s = SCENES.hop();
    s.t = 16 * 3600 + 4 * 60 + 12; s.banner = null;
    s.recipe.left = 55 * 60 + 48; s.recipe.adds = ["done"];
    s.events[0] = ["16:00:02", "Hop alert: add 3.00 oz Centennial (1)", "answered", ""];
    s.events.unshift(["16:00:31", "Hop alert answered: 3.00 oz Centennial added", "confirmed", "ok"]);
    return Object.assign(s, {base: "hop", open: {edit: {v: "bk", kind: "pwr", what: "boil", val: 40}}});
  },
  /* fly sparge (Scott, 9 Nov): the HLT pump sends sparge water to the top of the mash tun while the wort pump runs
     the wort off to the boil kettle. The mash tun's AUTO (HERMS) still runs the wort pump and the HLT element. */
  sparge: () => Object.assign(mash(), {
    t: 15 * 3600 + 12 * 60 + 40,
    v: {hlt: {pv: 171.6, sv: 173.4, own: 168.0, mode: "manual"}, mt: {pv: 168.1, sv: 168.0, mode: "auto"}, bk: {pv: 146.8, sv: null, mode: "manual"}},
    a: {hltEl: {on: true, pct: 74}, hltPump: {on: true}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: true, bk: true},
    recipe: {state: "running", cur: 3, left: 31 * 60 + 30, adds: []},
    events: [
      ["15:04:10", "Sparge: 168 °F reached, 40 min timer started", "by recipe", ""],
      ["14:56:21", "Sparge started, mash tun target 168.0 °F", "by recipe", ""],
      ["14:56:19", "Saccharification finished", "by recipe", ""],
      ...MASH_EVENTS.map(e => e.slice())
    ]
  }),
  fail: () => {
    const s = mash();
    s.t = 14 * 3600 + 33 * 60 + 9;
    s.a.hltPump = {on: true, failed: "off"};
    s.banner = {tone: "alarm", title: "Command failed", text: "HLT PUMP did not switch off. It is still running.", act: "TRY AGAIN", cmd: "act:hltPump"};
    s.events.unshift(["14:33:05", "HLT PUMP off", "failed: no answer in 5 s", "bad"]);
    return s;
  },
  manual: () => Object.assign(mash(), {
    t: 10 * 3600 + 4 * 60 + 20,
    v: {hlt: {pv: 161.3, sv: 168.0, own: 168.0, mode: "auto"}, mt: {pv: 150.2, sv: null, mode: "manual"}, bk: {pv: 71.6, sv: null, mode: "manual"}},
    a: {hltEl: {on: true, pct: 100}, hltPump: {on: true}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    recipe: null,
    timer: {left: 60 * 60, running: false},
    events: [
      ["10:04:11", "Hot liquor tank target 168.0 °F", "confirmed", "ok"],
      ["10:03:40", "HLT PUMP started", "confirmed", "ok"],
      ["09:58:02", "Hot liquor tank AUTO", "confirmed", "ok"]
    ]
  }),
  offline: () => {
    const s = mash();
    s.link = "lost"; s.age = 48; s.t = 14 * 3600 + 32 * 60 + 58;
    s.banner = {tone: "alarm", title: "No connection", text: "Readings are {age} s old. Trying again every 5 s. Controls are paused until CraftBeerPi answers."};
    s.events.unshift(["14:32:10", "Connection to CraftBeerPi lost", "trying again", "bad"]);
    return s;
  }
};
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
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
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8 23 21.5H1z"/><path d="M12 8.5v6M12 17.5v.5" stroke="#6e1414" stroke-width="2.6" stroke-linecap="round"/></svg>'
};
let st, timers = [], noteTimers = {}, hold = null;

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
  return `<button type="button" class="${cls}"${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ""}${o.expanded != null ? ` aria-expanded="${o.expanded}"` : ""}${o.cmd ? ` data-cmd="${o.cmd}"` : ""}${h ? " data-hold" : ""}${dis ? ` aria-disabled="true" data-why="${esc(o.why)}"` : ""}>${h ? '<span class="fill"></span>' : ""}<span class="lb">${label}</span>${small ? `<small>${small}</small>` : ""}</button>`;
}

/* ---------- faceplates ---------- */
function lampHTML(id) {
  const A = ACT[id], a = st.a[id], pend = st.pend["a:" + id], lost = st.link === "lost";
  const locked = !!a.by && !a.failed;
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = A.name + " · waiting for CraftBeerPi"; }
  else if (a.failed) { s = "failed"; t = a.on ? "DID NOT STOP" : "DID NOT START"; n = `${A.name} · still ${a.on ? (A.kind === "pump" ? "running" : "heating") : "off"} · tap to try again`; }
  else if (a.on) { s = A.kind === "heat" ? "heating" : "running"; t = A.kind === "heat" ? `HEATING ${a.pct} %` : "RUNNING"; n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : A.kind === "heat" ? " · tap to turn off" : " · tap to stop"); }
  else { s = "off"; t = "OFF"; if (A.kind === "heat" && !locked) { h = true; n = A.name + " · hold to turn on"; } else n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : " · tap to start"); }
  const why = lost ? PAUSED : pend ? WAIT : locked ? lockWhy(id) : "";
  const hh = h && !why;
  return `<button type="button" class="lamp${locked ? " locked" : ""}" data-state="${s}" data-cmd="act:${id}"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
function modeHTML(v) {
  const V = st.v[v], pend = st.pend["m:" + v], auto = V.mode === "auto";
  const off = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  const lockA = v === "hlt" && st.v.mt.mode === "auto" ? "The mash tun's AUTO is driving the HLT element for the HERMS. Turning on the HLT's own AUTO would fight it." : "";
  const aBtn = auto
    ? b("", "AUTO", pend ? "" : "", {pressed: true, cmd: "noop", why: off})
    : b("", "AUTO", pend === "auto" ? "switching…" : lockA ? "mash tun in charge" : "hold to start", {pressed: false, cmd: `mode:${v}:auto`, hold: true, why: off || lockA});
  const mBtn = auto
    ? b("", "MANUAL", pend === "manual" ? "switching…" : "tap to stop AUTO", {pressed: false, cmd: `mode:${v}:manual`, why: off})
    : b("", "MANUAL", "", {pressed: true, cmd: "noop", why: off});
  return `<div class="seg" role="group" aria-label="${VNAME[v]} mode">${aBtn}${mBtn}</div>`;
}
function tgtHTML(v) {
  const by = v === "hlt" && st.v.mt.mode === "auto", pend = st.pend["t:" + v];
  const why = st.link === "lost" ? PAUSED : by ? `The mash tun sets this target while it runs the HERMS: up to its own target plus ${HERMS_DELTA} °F.` : pend ? WAIT : "";
  return b("tgtbtn", "TARGET", by ? "set by mash tun" : pend ? "sending…" : "change SV", {cmd: `tgt:${v}`, why});
}
/* only a kettle whose logic declares set_boil_power has this (on Scott's rig, the boil kettle). It sits beside the
   element it governs and works at any time, also while a recipe runs (Scott, 10 Nov). In AUTO it sets the logic's
   Boil_Power, used from the boil threshold up; in MANUAL it sets the element's own level, used when it is on by hand.
   Changing it is a tap on SET, like a target: it changes a level, it doesn't switch heat on */
function powerHTML() {
  const V = st.v.bk, auto = V.mode === "auto", pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  return b("tgtbtn pwrbtn", auto ? `BOIL POWER ${V.bp} %` : `POWER ${st.a.bkEl.lvl} %`,
    pend ? "sending…" : auto ? `used from ${BOIL_TH} °F · change` : "used by hand · change",
    {cmd: "pwr:bk", why, expanded: !!st.edit && st.edit.kind === "pwr"});
}
function editorHTML(v) {
  if (st.edit.kind === "pwr") {
    const p = st.edit.val;
    return `<div class="editor pwr" role="group" aria-label="${st.edit.what === "boil" ? "New boil power for the boil kettle" : "New power for the boil element by hand"}">
    <button type="button" data-cmd="pstep:-5" aria-label="Down 5 percent">−5</button><button type="button" data-cmd="pstep:-1" aria-label="Down 1 percent">−1</button>
    <input id="tin" inputmode="numeric" value="${p}" aria-label="New boil power in percent">
    <button type="button" data-cmd="pstep:1" aria-label="Up 1 percent">+1</button><button type="button" data-cmd="pstep:5" aria-label="Up 5 percent">+5</button>
    <button type="button" class="ok" data-cmd="pset">SET <span id="tok">${p}</span> %</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button></div>`;
  }
  const x = st.edit.val.toFixed(1);
  return `<div class="editor" role="group" aria-label="New target for the ${VNAME[v].toLowerCase()}">
    <button type="button" data-cmd="tstep:-1" aria-label="Down 1 degree">−1</button><button type="button" data-cmd="tstep:-0.1" aria-label="Down 0.1 degree">−.1</button>
    <input id="tin" inputmode="decimal" value="${x}" aria-label="New target in °F">
    <button type="button" data-cmd="tstep:0.1" aria-label="Up 0.1 degree">+.1</button><button type="button" data-cmd="tstep:1" aria-label="Up 1 degree">+1</button>
    <button type="button" class="ok" data-cmd="tset">SET <span id="tok">${x}</span> °F</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button></div>`;
}
function devHTML(v) {
  if (st.link === "lost") return `<span class="age">Last reading ${st.age} s ago</span>`;
  const V = st.v[v], driven = V.mode === "auto" || (v === "hlt" && st.v.mt.mode === "auto");
  if (!driven || V.sv == null) return v === "mt" ? "MANUAL · wort pump by hand" : "MANUAL · element by hand";
  if (v === "bk" && V.pv >= V.sv - 0.5) return "Boiling";
  const d = V.sv - V.pv;
  if (Math.abs(d) < 0.3) return "At target";
  const eta = GRAPHS ? graphETA(v) : "";
  return (d > 0 ? `${d.toFixed(1)} °F below target` : `${(-d).toFixed(1)} °F above target`) + (eta ? ` · ${eta}` : "");
}
/* layout B's faceplate also shows output and mode, like a hardware PID controller */
function auxHTML(v) {
  const el = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null;
  const mode = v === "hlt" && st.v.mt.mode === "auto" ? "HERMS" : st.v[v].mode === "auto" ? "AUTO" : "MAN";
  const pct = el && el.on ? el.pct : 0;
  return `<dl class="aux"><dt>OUT</dt><dd>${el ? pct + " %" : "– –"}<span class="outbar"${el ? "" : ' style="visibility:hidden"'} aria-hidden="true"><i style="width:${pct}%"></i></span></dd><dt>MODE</dt><dd>${mode}</dd></dl>`;
}
function hermsRowHTML() {
  const why = st.link === "lost" ? PAUSED : `The mash tun's AUTO runs this vessel for the HERMS: it switches the HLT element and sets this target up to the mash tun's target plus ${HERMS_DELTA} °F. Switch the mash tun to MANUAL to take the HLT over.`;
  return `<div class="moderow"><button type="button" class="tgtbtn herms" data-cmd="noop" aria-disabled="true" data-why="${esc(why)}"><span class="lb">HERMS</span><small>run by the mash tun · switch it to MANUAL to take over</small></button></div>`;
}
function plateHTML(v) {
  const V = st.v[v], by = v === "hlt" && st.v.mt.mode === "auto";
  return `<section class="plate" id="pl-${v}" aria-labelledby="h-${v}">
    <h2 id="h-${v}">${VNAME[v]}</h2>
    <div class="face${st.link === "lost" ? " stale" : ""}">
      <dl class="pvsv"><dt>PV</dt><dd class="pv">${f1(V.pv)}<span class="u">°F</span></dd>
      <dt>SV</dt><dd class="sv">${V.sv == null ? "– –" : f1(V.sv) + '<span class="u">°F</span>'}</dd></dl>
      ${LAYOUT === "b" ? auxHTML(v) : ""}
      ${GRAPHS ? graphHTML(v, "f") : ""}
    </div>
    <p class="dev">${devHTML(v)}${by ? " · SV set by the mash tun" : ""}</p>
    <div class="ctrls">${VACT[v].map(lampHTML).join("")}${v === "bk" ? powerHTML() : ""}</div>
    ${st.edit && st.edit.v === v ? editorHTML(v) : v === "hlt" && st.v.mt.mode === "auto" ? hermsRowHTML() : `<div class="moderow">${modeHTML(v)}${tgtHTML(v)}</div>`}
    <p class="note">${st.notes[v] || ""}</p>
  </section>`;
}

/* ---------- recipe column ---------- */
function recipeHTML() {
  const r = st.recipe;
  if (!r) return handHTML();
  const S = RECIPE.steps, run = r.state === "running", off = st.link === "lost" ? PAUSED : "";
  const pS = st.pend["r:start"], pX = st.pend["r:stop"], pN = st.pend["r:next"];
  const start = pS ? `<button type="button" class="lamp" data-state="pending" data-cmd="noop" aria-disabled="true" data-why="${WAIT}"><span class="st">STARTING…</span><span class="nm">recipe</span></button>`
    : run ? `<button type="button" class="lamp" data-state="running" data-cmd="noop" aria-disabled="true" data-why="The recipe is already running."><span class="st">RUNNING</span><span class="nm">step ${r.cur + 1} of ${S.length}</span></button>`
    : `<button type="button" class="lamp" data-state="off" data-cmd="r:start"${off ? ` aria-disabled="true" data-why="${off}"` : " data-hold"}>${off ? "" : '<span class="fill"></span>'}<span class="st">START</span><span class="nm">hold to start</span></button>`;
  const stop = b("cmdbtn", pX ? "STOPPING…" : "STOP", run ? "tap to stop" : "not running", {cmd: "r:stop", why: off || (pX ? WAIT : "") || (!run ? "The recipe is not running." : "")});
  const last = r.cur >= S.length - 1;
  const next = b("cmdbtn", pN ? "MOVING ON…" : "NEXT STEP", last ? "last step" : `to ${S[r.cur + 1].n}`, {cmd: "r:next", why: off || (pN ? WAIT : "") || (last ? "This is the last step." : "")});
  return `<h2>${esc(RECIPE.name)}</h2>
    <p class="rmeta">${run ? "Running" : r.state === "ready" ? "Ready to start" : "Stopped"} · step ${r.cur + 1} of ${S.length}</p>
    <div class="rctl">${start}${stop}${next}</div>
    ${st.confirmNext ? confirmHTML() : ""}
    <p class="note">${st.notes.r || ""}</p>
    <ol class="steps" aria-label="Recipe steps">${S.map(stepHTML).join("")}</ol>`;
}
function confirmHTML() {
  const r = st.recipe, cur = RECIPE.steps[r.cur], nx = RECIPE.steps[r.cur + 1];
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Skip the rest of <b>${cur.n}</b>${cur.min ? ` (${mmss(r.left)} left)` : ""} and start <b>${nx.n}</b>${nx.temp ? ` at ${nx.temp} °F` : ""}?</p><div><button type="button" class="yes" data-cmd="r:next-yes">SKIP TO ${nx.n.toUpperCase()}</button><button type="button" data-cmd="r:next-no">KEEP GOING</button></div></div>`;
}
function stepHTML(s, i) {
  const r = st.recipe, state = i < r.cur ? "done" : i === r.cur ? "cur" : "";
  const p = [s.temp != null ? `${s.temp} °F` : "", s.min ? `${s.min} min` : ""].filter(Boolean).join(" · ");
  const right = state === "done" ? "✓ DONE" : state === "cur" ? (r.state === "running" ? (s.min ? `<span id="r-left">${mmss(r.left)}</span> LEFT` : "NOW") : r.state === "ready" ? "READY" : "STOPPED") : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
  const pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) : 0;
  const bar = state === "cur" && s.min ? `<span class="bar"><i id="r-bar" style="width:${pct}%"></i></span>` : "";
  const adds = s.adds ? `<span class="adds">${s.adds.map((a, j) => addHTML(a, j, state)).join("")}</span>` : "";
  return `<li class="step${state === "done" ? " done" : ""}"${state === "cur" ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${s.n}</span>${p ? `<span class="p">${p}</span>` : ""}${s.note ? `<span class="p">${s.note}</span>` : ""}<span class="s">${right}</span>${bar}${adds}</li>`;
}
function addHTML(a, j, state) {
  const s = state === "done" ? "done" : state === "cur" ? (st.recipe.adds[j] || "") : "";
  const c = s === "due" ? "due" : s === "done" ? "gone" : "";
  return `<span class="${c}">${s === "done" ? "✓ " : ""}${a[0]} min</span><span class="${c}">${a[1]}${s === "due" ? " · add now" : ""}</span><span class="${c}">${a[2]}</span>`;
}
function handHTML() {
  const t = st.timer, pt = st.pend.tm, off = st.link === "lost" ? PAUSED : "";
  return `<h2>No recipe running</h2>
    <p class="rmeta">Brewing by hand. Kettles and pumps work as usual.</p>
    <section class="timer" aria-labelledby="tm-h"><h3 id="tm-h">Rest timer</h3>
      <output id="tm-out">${mmss(t.left)}</output>
      <div>${b("cmdbtn", "−5 MIN", "", {cmd: "tm:-300", why: off})}${b("cmdbtn", "+5 MIN", "", {cmd: "tm:300", why: off})}${b("cmdbtn go", pt ? (pt === "start" ? "STARTING…" : "PAUSING…") : t.running ? "PAUSE TIMER" : "START TIMER", t.running ? "counting down on every screen" : "alarm at zero, on every screen", {cmd: "tm:go", why: off || (pt ? WAIT : "")})}</div>
    </section>
    <section class="book" aria-labelledby="bk-h"><h3 id="bk-h">Recipe book</h3><ul>${BOOK.map((x, i) => `<li><span class="bn">${x.n}</span><span class="bd">${x.d}</span>${b("cmdbtn", "LOAD", "", {cmd: "load:" + i, why: off})}</li>`).join("")}</ul></section>
    <div class="handlinks">${b("cmdbtn", "RECIPE BOOK", "all recipes", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "BREW STEPS", "build or edit steps", {cmd: "tab:Brew Steps"})}</div>
    <p class="note">${st.notes.r || ""}</p>`;
}
function nowHTML() {
  const r = st.recipe;
  if (!r) return `<span class="n">–</span><b>No recipe running</b><span class="p">Brewing by hand · rest timer below</span>`;
  const s = RECIPE.steps[r.cur], pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) : 0;
  const p = [s.temp != null ? `${s.temp} °F` : "", s.min ? `${s.min} min` : "", `step ${r.cur + 1} of ${RECIPE.steps.length}`].filter(Boolean).join(" · ");
  const nx = RECIPE.steps[r.cur + 1];
  const nxt = nx ? `<span class="nx">Next: ${nx.n}${nx.temp != null ? ` · ${nx.temp} °F` : ""}${nx.min ? ` · ${nx.min} min` : ""}</span>` : `<span class="nx">Last step</span>`;
  return `<span class="n">${r.cur + 1}</span><b>${s.n}</b><span class="p">${p}</span><span class="left">${r.state === "running" ? (s.min ? `<span id="now-left">${mmss(r.left)}</span> left` : "now") : r.state === "ready" ? "ready" : "stopped"}</span>${s.min ? `<span class="bar"><i id="now-bar" style="width:${pct}%"></i></span>` : ""}${nxt}`;
}

/* ---------- alarms, last event, rig ---------- */
function bannerHTML() {
  const x = st.banner;
  if (!x) return `${ICON.ok}<span class="msg">No alarms</span>`;
  const act = x.act ? b("act", st.pend.b ? "SENDING…" : x.act, "", {cmd: x.cmd, why: st.pend.b ? WAIT : ""}) : "";
  return `${x.tone === "prompt" ? ICON.bell : ICON.warn}<span class="msg"><b>${x.title}</b>${x.text.replace("{age}", `<span id="ban-age">${st.age}</span>`)}</span>${act}`;
}
function eventHTML() {
  const e = st.events[0], row = e => `<time>${e[0]}</time>${esc(e[1])} · <span class="res ${e[3]}">${e[2]}</span>${e[4] ? ` · <span class="res">${esc(e[4])}</span>` : ""}`;
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
  const name = s.n.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return RUNOFF_NAME.test(name) && !NOT_RUNOFF.test(name);
}
/* a step's status as CraftBeerPi reports it: D done, A active, S stopped, I waiting (a boil held for "Ready to boil?" is I) */
function stepStatus(i) {
  const r = st.recipe;
  return i < r.cur ? "D" : i > r.cur ? "I" : r.state === "running" ? "A" : r.state === "stopped" ? "S" : "I";
}
/* the runoff step's index while the wort should be on its way to the boil kettle, else -1 */
function runoffStep() {
  const S = RECIPE.steps;
  if (!st.recipe) return -1;
  const ro = S.findIndex(s => collectsWort(s)), bo = S.findIndex((s, i) => i > ro && s.boil);
  return ro >= 0 && stepStatus(ro) !== "I" && (bo < 0 || stepStatus(bo) === "I") ? ro : -1;
}
function rigDesc(ro) {
  const spLine = !!$("#ln-sparge"), head = "Hot liquor tank, mash tun and boil kettle. ";
  if (ro < 0) return head + "The HLT pump circulates hot water around the hot liquor tank. The wort pump moves wort from the mash tun, through the coil inside the hot liquor tank, and back into the mash tun. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating, with the lines to the boil kettle"
    + (spLine ? " and to the top of the mash tun" : "") + " closed.";
  return head + (spLine ? "The HLT pump sends hot water over to the top of the mash tun for the sparge. " : "The HLT pump circulates hot water around the hot liquor tank. ")
    + `The wort pump moves wort from the mash tun down and across to the boil kettle, past the HERMS coil. The valves are set by hand and CraftBeerPi can't see them: they are shown as step ${ro + 1}, ${RECIPE.steps[ro].n}, needs them.`;
}
function setValve(id, open, flowing) {
  const g = $("#vl-" + id), t = $("#vt-" + id);
  if (!g) return;
  g.classList.toggle("shut", !open);
  g.classList.toggle("live", open && flowing);
  t.textContent = open ? "OPEN" : "CLOSED";
}
function renderRig() {
  if (!st || !$("#rigsvg")) return;
  const a = st.a, on = (sel, x) => { const n = $(sel); if (n) n.classList.toggle("on", !!x); };
  const live = st.link !== "lost";
  [["hlt", "hltPump"], ["wort", "wortPump"]].forEach(([id, k]) => {
    const p = a[k];
    on("#pump-" + id, live && p.on);
    $(`#pump-${id} .p-st`).textContent = (live ? "" : "LAST: ") + (p.on ? "RUNNING" : "OFF");
    $(`#pump-${id} .p-ovr`).textContent = ACT[k].override && !p.on ? "UNLESS OVERRIDE SWITCH IS ON" : "";
  });
  /* layout A's drawing has no sparge line: its HLT pump always goes back round the hot liquor tank */
  const ro = runoffStep(), out = ro >= 0, sp = out && !!$("#ln-sparge");
  const wp = live && a.wortPump.on, hp = live && a.hltPump.on;
  on("#ln-wort-in", wp); on("#ln-wort-out", wp); on("#ln-wort-coil", wp && !out); on("#ln-xfer", wp && out); on("#coil", wp && !out);
  on("#ln-hlt-in", hp); on("#ln-hlt-up", hp); on("#ln-hlt-ret", hp && !sp); on("#ln-sparge", hp && sp);
  setValve("coil", !out, wp); setValve("bk", out, wp); setValve("ret", !sp, hp); setValve("sp", sp, hp);
  $("#vnote-2").textContent = out ? `SHOWN FOR STEP ${ro + 1} (${RECIPE.steps[ro].n.toUpperCase()})` : "SHOWN FOR RECIRCULATING";
  $("#rig-d").textContent = rigDesc(ro);
  on("#el-hlt", live && a.hltEl.on); on("#el-bk", live && a.bkEl.on);
  ["hlt", "mt", "bk"].forEach(v => { const n = $("#needle-" + v); if (n) n.setAttribute("transform", `rotate(${needleAngle(st.v[v].pv).toFixed(1)})`); });
}
let rigW = 0, rigRs = 1;
function drawRig() {
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
  const lost = st.link === "lost";
  $("#app").dataset.link = st.link;
  $("#app").toggleAttribute("data-editing", !!st.edit);
  $("#link").dataset.link = st.link;
  $("#link-t").textContent = lost ? "No connection" : "Connected";
  $("#clock").textContent = hhmm(st.t);
  const ho = $("#alloff");
  ho.textContent = st.pend.alloff ? "SWITCHING OFF…" : "ALL OFF";
  if (lost || st.pend.alloff) { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = lost ? PAUSED : WAIT; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  const bn = $("#banner");
  bn.dataset.tone = st.banner ? st.banner.tone : "ok";
  bn.innerHTML = bannerHTML();
  $("#event").innerHTML = eventHTML();
  $("#plates").innerHTML = ["hlt", "mt", "bk"].map(plateHTML).join("");
  $("#recipe").innerHTML = recipeHTML();
  $("#now").innerHTML = nowHTML();
  renderRig();
  if (GRAPHS) { renderGraphPanel(); drawGraphs(); }
}
/* ---------- commands (simulated: each one answers after a short delay) ---------- */
let toastT;
function toast(text) { const t = $("#toast"); t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3800); }
function logEvent(what, res, tone, cav = "") { st.events.unshift([hhmmss(st.t), what, res, tone, cav]); }
function say(text, urgent) { const el = $(urgent ? "#sr-alert" : "#sr"); el.textContent = ""; setTimeout(() => { el.textContent = text; }, 40); }
function note(where, text) {
  st.notes[where] = text; renderAll();
  clearTimeout(noteTimers[where]);
  noteTimers[where] = setTimeout(() => { if (st.notes[where] === text) { st.notes[where] = ""; renderAll(); } }, 6000);
}
function explain(el) {
  const why = el.dataset.why, pl = el.closest(".plate");
  if (!why) return;
  if (pl) note(pl.id.slice(3), why); else if (el.closest(".recipe")) note("r", why); else toast(why);
}
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
const actLabel = (id, on) => `${ACT[id].name} ${ACT[id].kind === "pump" ? (on ? "started" : "stopped") : (on ? "on" : "off")}`;
function setActor(id, on) { const a = st.a[id]; a.on = on; a.failed = null; if (ACT[id].kind === "heat") a.pct = on ? (a.lvl ?? 100) : 0; }
function cmdAct(id) {
  const a = st.a[id], want = a.failed ? a.failed === "on" : !a.on;
  send("a:" + id, want ? "on" : "off", actLabel(id, want), () => {
    setActor(id, want);
    if (st.banner && st.banner.cmd === "act:" + id) st.banner = null;
  }, !want && ACT[id].override ? "its override switch can still run it" : "");
}
/* switching a kettle's logic off also switches its actors off (PID_HERMS on_stop: heater and pump) */
function setMode(v, m) {
  const V = st.v[v], a = st.a;
  V.mode = m;
  if (v === "mt") {
    if (m === "auto") { if (V.sv == null) V.sv = 149.0; st.v.hlt.mode = "manual"; st.v.hlt.sv = +(V.sv + HERMS_DELTA).toFixed(1); a.hltEl.on = true; a.hltEl.pct = 62; a.wortPump.on = true; }
    else { a.hltEl.on = false; a.hltEl.pct = 0; a.wortPump.on = false; st.v.hlt.sv = st.v.hlt.own; }
  } else if (v === "hlt") {
    if (m === "auto" && V.sv == null) V.sv = V.own;
    a.hltEl.on = m === "auto"; a.hltEl.pct = m === "auto" ? (V.sv - V.pv > 2 ? 100 : 40) : 0;
  } else {
    if (m === "auto" && V.sv == null) V.sv = 210.2;
    a.bkEl.on = m === "auto"; a.bkEl.pct = m === "auto" ? (V.pv >= BOIL_TH ? V.bp : 100) : 0;
    /* the power editor edits the setting its button named when it opened; if a step or ALL OFF changes the mode,
       that setting is no longer the one in use, so the editor closes without sending anything */
    if (st.edit && st.edit.kind === "pwr" && st.edit.what !== (m === "auto" ? "boil" : "hand")) {
      st.edit = null;
      note("bk", `The boil kettle switched to ${m.toUpperCase()}, so the button now sets ${m === "auto" ? "the boil power" : "the element's power by hand"}. Nothing was changed.`);
    }
  }
  ["hltEl", "wortPump", "bkEl"].forEach(id => { a[id].failed = null; });
}
function cmdMode(v, m) { send("m:" + v, m, `${VNAME[v]} ${m.toUpperCase()}`, () => setMode(v, m)); }
function cmdTgtOpen(v) {
  const V = st.v[v];
  st.edit = {v, kind: "tgt", val: V.sv ?? (v === "bk" ? 210.2 : v === "mt" ? 149.0 : V.own)};
  renderAll(); setTimeout(() => $("#tin")?.focus(), 0);
}
function cmdTgtStep(d) { st.edit.val = Math.round((st.edit.val + d) * 10) / 10; renderAll(); }
function cmdTgtSet() {
  const v = st.edit.v, val = st.edit.val;
  if (!(val >= 32 && val <= 230)) { note(v, "Enter a target between 32 and 230 °F."); return; }
  st.edit = null; st.notes[v] = "";
  send("t:" + v, "set", `${VNAME[v]} target ${val.toFixed(1)} °F`, () => {
    st.v[v].sv = val;
    if (v === "hlt") st.v.hlt.own = val;
    if (v === "mt" && st.v.mt.mode === "auto") st.v.hlt.sv = +(val + HERMS_DELTA).toFixed(1);
  });
}
/* set_boil_power: kept in the kettle's Boil_Power setting, so it can be set at any time, also during a recipe; AUTO uses it
   at its next control decision (every 2 s) once the kettle is at or above the boil threshold. In MANUAL the button sets
   the element's own level instead (set_power), which it runs at when it is on by hand. */
function cmdPwrOpen() {
  const boil = st.v.bk.mode === "auto";
  st.edit = {v: "bk", kind: "pwr", what: boil ? "boil" : "hand", val: boil ? st.v.bk.bp : st.a.bkEl.lvl};
  renderAll(); setTimeout(() => $("#tin")?.focus(), 0);
}
function cmdPwrStep(d) { st.edit.val = Math.min(100, Math.max(0, st.edit.val + d)); renderAll(); }
function cmdPwrSet() {
  const {what, val} = st.edit, boil = what === "boil", V = st.v.bk, el = st.a.bkEl, was = boil ? V.bp : el.lvl;
  if (!(Number.isInteger(val) && val >= 0 && val <= 100)) { note("bk", `Enter a ${boil ? "boil power" : "power"} from 0 to 100 %.`); return; }
  st.edit = null; st.notes.bk = "";
  if (val === was) { renderAll(); return; }
  /* when the new level isn't in use yet, the event says when it will be, so an OUT that doesn't move isn't taken for a failure */
  const cav = boil ? (V.mode === "auto" && V.pv >= BOIL_TH ? "" : `used from ${BOIL_TH} °F, full power until then`)
    : (el.on ? "" : "used when you switch the element on");
  send("p:bk", "set", boil ? `Boil power ${val} % (was ${was} %)` : `Boil element by hand ${val} % (was ${was} %)`, () => {
    if (boil) { V.bp = val; if (V.mode === "auto" && el.on && V.pv >= BOIL_TH) el.pct = val; }
    else { el.lvl = val; if (V.mode !== "auto" && el.on) el.pct = val; }
  }, cav);
}
function stepStart(i) {
  const r = st.recipe, s = RECIPE.steps[i];
  r.cur = i; r.left = (s.min || 0) * 60; r.adds = [];
  if (st.hist) st.hist.steps.push([st.t, i + 1]);
  if (s.k === "bk") { st.fill.bk = true; st.fill.mtLiq = false; if (st.v.mt.mode === "auto") setMode("mt", "manual"); }
  if (s.temp != null) {
    st.v[s.k].sv = s.temp;
    if (st.v[s.k].mode !== "auto") setMode(s.k, "auto");
    else if (s.k === "mt") st.v.hlt.sv = +(s.temp + HERMS_DELTA).toFixed(1);
  } else if (s.note) st.banner = {tone: "prompt", title: s.n, text: s.note, act: "DONE", cmd: "b:done"};
}
function cmdStart() {
  send("r:start", "start", "Recipe started", () => {
    const r = st.recipe, s = RECIPE.steps[r.cur];
    if (r.state === "ready" && st.hist) st.hist.steps.push([st.t, r.cur + 1]);
    r.state = "running";
    if (s.temp != null && st.v[s.k].mode !== "auto") setMode(s.k, "auto");
  });
}
function cmdStop() {
  st.confirmNext = false;
  send("r:stop", "stop", "Recipe stopped", () => {
    const k = RECIPE.steps[st.recipe.cur].k;
    st.recipe.state = "stopped";
    if (st.v[k].mode === "auto") setMode(k, "manual");
  });
}
function cmdNextYes() {
  const r = st.recipe, nx = RECIPE.steps[r.cur + 1];
  st.confirmNext = false;
  send("r:next", "next", `Skipped to ${nx.n}`, () => { stepStart(r.cur + 1); r.state = "running"; });
}
function cmdBanner(x) {
  if (x === "added") send("b", "x", "Hop alert answered: 3.00 oz Centennial added", () => { st.banner = null; if (st.recipe) st.recipe.adds[0] = "done"; });
  else if (x === "done") send("b", "x", `${RECIPE.steps[st.recipe.cur].n} done`, () => { st.banner = null; stepStart(st.recipe.cur + 1); });
  else { st.banner = null; renderAll(); }
}
function cmdLoad(i) {
  if (i !== 0) return toast(`Mockup: only Test Recipe v5 is filled in here. On the real screen, LOAD sends ${BOOK[i].n} to Brew Steps, as the Recipe Book does today.`);
  send("r:load", "load", `${BOOK[0].n} loaded`, () => { st.recipe = {state: "ready", cur: 0, left: 0, adds: []}; });
}
/* ALL OFF (Scott, 9 Nov): stop the recipe first so it can't switch a kettle back on, then every vessel to MANUAL,
   then both elements and both pumps off */
function cmdAllOff() {
  const running = st.recipe && st.recipe.state === "running";
  const cav = Object.keys(ACT).filter(id => ACT[id].override).map(id => `${ACT[id].name}'s override switch can still run it`).join(" · ");
  st.confirmNext = false; st.edit = null;
  send("alloff", "off", `ALL OFF: elements and pumps off, every vessel MANUAL${running ? ", recipe stopped" : ""}`, () => {
    if (running) st.recipe.state = "stopped";
    ["hlt", "mt", "bk"].forEach(v => { if (st.v[v].mode === "auto") setMode(v, "manual"); });
    Object.keys(ACT).forEach(id => setActor(id, false));
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
function run(cmd) {
  const [k, x, y] = cmd.split(":");
  switch (k) {
    case "act": return cmdAct(x);
    case "mode": return cmdMode(x, y);
    case "tgt": return cmdTgtOpen(x);
    case "tstep": return cmdTgtStep(parseFloat(x));
    case "tset": return cmdTgtSet();
    case "tcancel": st.edit = null; return renderAll();
    case "pwr": if (st.edit && st.edit.kind === "pwr") { st.edit = null; return renderAll(); } return cmdPwrOpen();
    case "pstep": return cmdPwrStep(parseInt(x, 10));
    case "pset": return cmdPwrSet();
    case "r":
      if (x === "start") return cmdStart();
      if (x === "stop") return cmdStop();
      if (x === "next-yes") return cmdNextYes();
      st.confirmNext = x === "next"; return renderAll();
    case "b": return cmdBanner(x);
    case "alloff": return cmdAllOff();
    case "log": st.logOpen = !st.logOpen; return renderAll();
    case "tm": return cmdTimer(x);
    case "tab": return toast(`Mockup: this opens the existing ${x} page.`);
    case "load": return cmdLoad(+x);
    case "gspan": case "gview": return graphCmd(k, x);
  }
}

/* ---------- press and hold (pointer and keyboard): heat only starts on a held press ---------- */
const HOLD_MS = 1000;
function holdStart(el) {
  if (hold) return;
  el.classList.add("holding");
  hold = {el, cmd: el.dataset.cmd, timer: setTimeout(() => { const c = hold.cmd; el.classList.remove("holding"); hold = null; run(c); }, HOLD_MS)};
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
document.addEventListener("pointerdown", e => {
  const el = e.target.closest("[data-hold]");
  if (!el || e.button !== 0) return;
  // no focus on a pointer press: the focus ring is for the keyboard (DESIGN.md, Focus Ring Blue)
  e.preventDefault();
  try { el.setPointerCapture(e.pointerId); } catch (_) {}
  holdStart(el);
});
document.addEventListener("pointerup", () => holdEnd(true));
document.addEventListener("pointercancel", () => holdEnd(false));
document.addEventListener("contextmenu", e => { if (e.target.closest("[data-hold]")) e.preventDefault(); });
document.addEventListener("keydown", e => {
  const el = e.target.closest ? e.target.closest("[data-hold]") : null;
  if (el && (e.key === " " || e.key === "Enter")) { e.preventDefault(); if (!e.repeat) holdStart(el); return; }
  if (e.target.id === "tin" && e.key === "Enter") { e.preventDefault(); if (st.edit && st.edit.kind === "pwr") cmdPwrSet(); else cmdTgtSet(); return; }
  if (e.key === "Escape" && (st.edit || st.logOpen || st.confirmNext)) { st.edit = null; st.logOpen = false; st.confirmNext = false; renderAll(); }
});
document.addEventListener("keyup", e => { if (hold && (e.key === " " || e.key === "Enter")) { e.preventDefault(); holdEnd(true); } });
document.addEventListener("input", e => {
  if (e.target.id !== "tin" || !st.edit) return;
  const x = parseFloat(e.target.value), pwr = st.edit.kind === "pwr";
  if (Number.isFinite(x)) { st.edit.val = pwr ? Math.round(x) : Math.round(x * 10) / 10; const ok = $("#tok"); if (ok) ok.textContent = pwr ? String(st.edit.val) : st.edit.val.toFixed(1); }
});
document.addEventListener("click", e => {
  const tab = e.target.closest(".tabs a");
  if (tab) {
    e.preventDefault();
    if (tab.dataset.tab) toast(tab.dataset.tab === "More" ? "Mockup: MORE holds Fermenter Profile, Plugins, System and About." : `Mockup: this opens the existing ${tab.dataset.tab} page.`);
    return;
  }
  const el = e.target.closest("[data-cmd]");
  if (!el) { if (st.logOpen && !e.target.closest(".log")) { st.logOpen = false; renderAll(); } return; }
  if (el.hasAttribute("data-hold")) return;
  if (el.getAttribute("aria-disabled") === "true") { explain(el); return; }
  const cmd = el.dataset.cmd;
  if (cmd === "noop") return;
  run(cmd);
  requestAnimationFrame(() => { if (document.activeElement === document.body) document.querySelector(`[data-cmd="${cmd}"]`)?.focus({preventScroll: true}); });
});

/* ---------- clock, step timer, rest timer, reading age ---------- */
setInterval(() => {
  if (!st) return;
  st.t++;
  $("#clock").textContent = hhmm(st.t);
  if (GRAPHS) graphTick();
  if (st.link === "lost") {
    st.age++;
    document.querySelectorAll(".age").forEach(n => { n.textContent = `Last reading ${st.age} s ago`; });
    const ba = $("#ban-age"); if (ba) ba.textContent = st.age;
    return;
  }
  const r = st.recipe;
  if (r && r.state === "running" && r.left > 0) {
    r.left--;
    const s = RECIPE.steps[r.cur], pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) + "%" : "0%";
    ["r-left", "now-left"].forEach(id => { const n = document.getElementById(id); if (n) n.textContent = mmss(r.left); });
    ["r-bar", "now-bar"].forEach(id => { const n = document.getElementById(id); if (n) n.style.width = pct; });
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
}, 1000);

/* ---------- scenes ---------- */
function load(name) {
  timers.forEach(clearTimeout); timers = []; holdEnd(false);
  const key = SCENES[name] ? name : "mash";
  st = SCENES[key]();
  /* a moment can open an editor (open) and borrow another moment's graph history (base) */
  const open = st.open, base = st.base || key;
  delete st.open; delete st.base;
  Object.assign(st, {scene: key, pend: {}, notes: {}, edit: null, confirmNext: false, logOpen: false}, open);
  if (st.v.bk.bp == null) st.v.bk.bp = 45; // the boil kettle's Boil_Power setting, read from its props
  if (st.a.bkEl.lvl == null) st.a.bkEl.lvl = 100; // the boil element's own level (its power), used when it is on by hand
  if (GRAPHS) st.hist = gHistory(base);
  applyLocks(); renderAll();
  document.querySelectorAll(".mock a[href^='#']").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + key ? "true" : "false"));
  document.querySelectorAll(".mock a[data-layout]").forEach(a => {
    a.href = `?layout=${a.dataset.layout}#${key}`;
    a.setAttribute("aria-current", a.dataset.layout === LAYOUT ? "true" : "false");
  });
}

/* ---------- layout A (D1) or B (D3): same parts, arranged differently ---------- */
const QS = new URLSearchParams(location.search);
const LAYOUT = QS.get("layout") === "a" ? "a" : "b";
document.documentElement.dataset.layout = LAYOUT;
if (QS.has("bare")) document.documentElement.classList.add("bare");
if (LAYOUT === "b") {
  $(".topbar .link").before($("#banner"));
  $(".main").before($(".tabs"));
  $(".main").prepend($("#recipe"));
  $(".brewhouse").append($("#rig"));
}
/* temperature graphs (graphs.js), in the faceplates as Scott chose on 10 Nov 2026. ?graphs=none shows the screen
   without them; ?graphs=panel is option B, which he turned down, kept only for graphs.html. Layout A has none. */
const GRAPHS = LAYOUT === "a" || QS.get("graphs") === "none" ? "" : QS.get("graphs") === "panel" ? "panel" : "face";
if (GRAPHS) { document.documentElement.dataset.graphs = GRAPHS; graphSetup(QS); }
window.addEventListener("hashchange", () => load(location.hash.slice(1)));
load(location.hash.slice(1));
new ResizeObserver(drawRig).observe($("#rig"));
