// The approved mockup's demo data (design/brewday/brew-day.js, and graphs.js for the graphs' history), unchanged: the
// seven moments of a brew day it shows. The screen's demo mode (?demo=mash, sparge, hop, boilpower, fail, manual or
// offline) runs on this, so it can be compared with the mockup pixel for pixel.

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
/* BoilPower, the boil kettle's logic: below its threshold it heats at full power (Max_Output); once the wort reaches it, it
   holds the element at Boil_Power, which Scott sets with set_boil_power (45 % on the simulators), until the wort falls
   3.6 °F (2 °C) below again. The threshold is BoilPower._threshold: the kettle's target when it has one (the Boil step
   sets 210.2 °F), else its Boil_Threshold setting (BOIL_TH, 210.2 °F on Scott's set-up), else 99 °C / 210.2 °F. */
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

/* ---------- the temperature graphs' demo history (the mockup's graphs.js, gDemo and gHistory) ----------
   The live screen reads CraftBeerPi's own logs instead (history.js). PV keyframes are [time, °F, how it got there:
   l straight, e settling, s smooth, h held]. SV and OUT are runs of [from, to, value]; an OUT of [low, high] hunts
   between the two, as a PID's output does while it holds a temperature. */
const hms = (h, m, s = 0) => h * 3600 + m * 60 + s;
function gKey(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, how] = keys[i], [t0, v0] = keys[i - 1];
    if (t > t1) continue;
    const u = (t - t0) / (t1 - t0);
    const k = how === "h" ? 0 : how === "e" ? (1 - Math.exp(-4 * u)) / (1 - Math.exp(-4)) : how === "s" ? u * u * (3 - 2 * u) : u;
    return v0 + (v1 - v0) * k;
  }
  return keys[keys.length - 1][1];
}
function gRun(runs, t) {
  for (const [a, b, v] of runs || []) if (t >= a && t < b) return v;
  return null;
}
const gWob = (t, k) => 0.16 * Math.sin(t / 47 + k) + 0.09 * Math.sin(t / 13.7 + 2.3 * k) + 0.05 * Math.sin(t / 5.1 + 1.7 * k);

function gDemo(scene) {
  const E = 30 * 3600;
  /* mash, sparge, fail, offline: recipe started 12:40; MashIn, malt in at 13:27, Protein Rest, Saccharification from 14:09 */
  const hltMash = [[hms(12, 40), 64.0], [hms(13, 1), 129.0, "l"], [hms(13, 6), 131.4, "e"], [hms(13, 27, 5), 131.4, "h"], [hms(13, 30), 128.6, "s"],
    [hms(13, 37), 131.4, "e"], [hms(14, 9, 40), 131.4, "h"], [hms(14, 16, 30), 153.0, "l"], [hms(14, 19), 154.4, "e"]];
  const mtMash = [[hms(12, 40), 64.0], [hms(13, 10), 118.0, "l"], [hms(13, 26, 58), 126.0, "e"], [hms(13, 27, 5), 126.0, "h"], [hms(13, 28, 30), 117.2, "s"],
    [hms(13, 49, 38), 126.0, "e"], [hms(14, 9, 40), 126.0, "h"], [hms(14, 15, 30), 147.6, "l"], [hms(14, 16, 19), 149.0, "e"], [hms(14, 18), 149.4, "s"], [hms(14, 22), 148.8, "s"]];
  const hltOut = [[hms(12, 40), hms(13, 2), 100], [hms(13, 2), hms(13, 27, 5), [28, 46]], [hms(13, 27, 5), hms(13, 36), 100], [hms(13, 36), hms(14, 9, 40), [30, 50]],
    [hms(14, 9, 40), hms(14, 17, 30), 100]];
  const steps = [[hms(12, 40), 1], [hms(13, 27, 5), 2], [hms(14, 9, 40), 3]];
  if (scene === "sparge") return {
    start: hms(12, 40), steps: [...steps, [hms(14, 56, 21), 4]],
    hlt: {pv: [...hltMash, [hms(14, 56, 21), 154.4, "h"], [hms(15, 1, 50), 172.4, "l"], [hms(15, 4), 173.4, "e"], [hms(15, 8), 172.3, "s"], [hms(15, 12, 40), 171.6, "s"]],
      sv: [[hms(12, 40), hms(14, 9, 40), 131.4], [hms(14, 9, 40), hms(14, 56, 21), 154.4], [hms(14, 56, 21), E, 173.4]],
      out: [...hltOut, [hms(14, 17, 30), hms(14, 56, 21), [52, 72]], [hms(14, 56, 21), hms(15, 2, 30), 100], [hms(15, 2, 30), E, [64, 84]]]},
    mt: {pv: [...mtMash, [hms(14, 56, 21), 148.7, "s"], [hms(15, 3, 20), 166.8, "l"], [hms(15, 4, 10), 168.0, "e"], [hms(15, 12, 40), 168.1, "s"]],
      sv: [[hms(12, 40), hms(14, 9, 40), 126.0], [hms(14, 9, 40), hms(14, 56, 21), 149.0], [hms(14, 56, 21), E, 168.0]]},
    bk: {pv: [[hms(12, 40), 68.0], [hms(14, 57, 30), 68.0, "h"], [hms(14, 59), 147.6, "s"], [hms(15, 6), 148.3, "s"], [hms(15, 12, 40), 146.8, "s"]],
      out: [[hms(12, 40), E, 0]]}
  };
  /* hop: an earlier day, started 11:58; sparge 14:14-14:58, "Ready to boil?" until 15:01:47, boiling from 15:30 */
  if (scene === "hop") return {
    start: hms(11, 58), steps: [[hms(11, 58), 1], [hms(12, 45), 2], [hms(13, 27, 22), 3], [hms(14, 14, 2), 4], [hms(15, 1, 47), 5]],
    hlt: {pv: [[hms(11, 58), 63.0], [hms(12, 19), 129.0, "l"], [hms(12, 24), 131.4, "e"], [hms(12, 45), 131.4, "h"], [hms(12, 48), 128.8, "s"], [hms(12, 55), 131.4, "e"],
      [hms(13, 27, 22), 131.4, "h"], [hms(13, 34), 153.6, "l"], [hms(13, 36, 30), 154.4, "e"], [hms(14, 14, 2), 154.4, "h"], [hms(14, 19, 30), 172.8, "l"],
      [hms(14, 21, 30), 173.4, "e"], [hms(14, 58, 30), 171.9, "s"], [hms(16, 0, 2), 165.3, "s"]],
      sv: [[hms(11, 58), hms(13, 27, 22), 131.4], [hms(13, 27, 22), hms(14, 14, 2), 154.4], [hms(14, 14, 2), hms(14, 58, 30), 173.4]],
      out: [[hms(11, 58), hms(12, 20), 100], [hms(12, 20), hms(12, 45), [28, 46]], [hms(12, 45), hms(12, 54), 100], [hms(12, 54), hms(13, 27, 22), [30, 50]],
        [hms(13, 27, 22), hms(13, 35), 100], [hms(13, 35), hms(14, 14, 2), [52, 72]], [hms(14, 14, 2), hms(14, 20, 30), 100], [hms(14, 20, 30), hms(14, 58, 30), [64, 84]],
        [hms(14, 58, 30), E, 0]]},
    mt: {pv: [[hms(11, 58), 64.0], [hms(12, 28), 118.0, "l"], [hms(12, 44, 50), 126.0, "e"], [hms(12, 45), 126.0, "h"], [hms(12, 46, 30), 117.0, "s"], [hms(13, 7, 20), 126.0, "e"],
      [hms(13, 27, 22), 126.0, "h"], [hms(13, 33, 10), 147.6, "l"], [hms(13, 34), 149.0, "e"], [hms(13, 36), 149.4, "s"], [hms(13, 40), 148.8, "s"], [hms(14, 14, 2), 148.8, "h"],
      [hms(14, 17, 40), 166.8, "l"], [hms(14, 18, 30), 168.0, "e"], [hms(14, 58, 30), 168.2, "s"], [hms(16, 0, 2), 151.2, "e"]],
      sv: [[hms(11, 58), hms(13, 27, 22), 126.0], [hms(13, 27, 22), hms(14, 14, 2), 149.0], [hms(14, 14, 2), hms(14, 58, 30), 168.0]]},
    bk: {pv: [[hms(11, 58), 68.0], [hms(14, 15), 68.0, "h"], [hms(14, 16, 30), 147.0, "s"], [hms(14, 58, 30), 148.4, "s"], [hms(15, 1, 47), 147.6, "s"],
      [hms(15, 28, 40), 208.6, "l"], [hms(15, 30, 4), 210.2, "e"], [hms(15, 33), 210.7, "s"], [hms(16, 0, 2), 210.6, "s"]],
      sv: [[hms(15, 1, 47), E, 210.2]],
      out: [[hms(11, 58), hms(15, 1, 47), 0], [hms(15, 1, 47), hms(15, 29, 30), 100], [hms(15, 29, 30), E, 45]]}
  };
  /* manual, no recipe: strike water heated by hand from 08:30 and moved to the mash tun at 09:25; the HLT refilled,
     heated by hand again, then on its own AUTO to 168 °F from 09:58 */
  if (scene === "manual") return {
    start: hms(8, 30), steps: [],
    hlt: {pv: [[hms(8, 30), 62.0], [hms(9, 20), 160.0, "l"], [hms(9, 25), 159.4, "s"], [hms(9, 29), 96.0, "s"], [hms(9, 31), 95.6, "s"], [hms(9, 42), 137.0, "l"],
      [hms(9, 58, 2), 136.2, "s"], [hms(10, 4, 20), 161.3, "l"]],
      sv: [[hms(9, 58, 2), E, 168.0]],
      out: [[hms(8, 30), hms(9, 20), 100], [hms(9, 20), hms(9, 31), 0], [hms(9, 31), hms(9, 42), 100], [hms(9, 42), hms(9, 58, 2), 0], [hms(9, 58, 2), E, 100]]},
    mt: {pv: [[hms(8, 30), 66.0], [hms(9, 25), 66.0, "h"], [hms(9, 26), 156.0, "s"], [hms(9, 28), 156.0, "h"], [hms(9, 30), 150.9, "s"], [hms(10, 4, 20), 150.2, "l"]]},
    bk: {pv: [[hms(8, 30), 71.6]], out: [[hms(8, 30), E, 0]]}
  };
  return {
    start: hms(12, 40), steps, until: scene === "offline" ? hms(14, 32, 10) : null,
    hlt: {pv: [...hltMash, [hms(14, 32, 31), 154.2, "s"]], sv: [[hms(12, 40), hms(14, 9, 40), 131.4], [hms(14, 9, 40), E, 154.4]],
      out: [...hltOut, [hms(14, 17, 30), E, [52, 72]]]},
    mt: {pv: [...mtMash, [hms(14, 32, 31), 148.6, "s"]], sv: [[hms(12, 40), hms(14, 9, 40), 126.0], [hms(14, 9, 40), E, 149.0]]},
    bk: {pv: [[hms(12, 40), 68.0]], out: [[hms(12, 40), E, 0]]}
  };
}
/* one row every 10 s up to now, the moment's own time: [time, PV, SV or null, OUT % or null]. The small wobble fades
   out at now, so each line ends on the reading its faceplate shows. */
function history(scene, now) {
  const d = gDemo(scene), end = d.until || now, seed = {hlt: 1.3, mt: 2.9, bk: 4.4};
  const h = {start: d.start, steps: d.steps.map(s => s.slice()), v: {}};
  ["hlt", "mt", "bk"].forEach(v => {
    const s = d[v], rows = [];
    for (let t = Math.ceil(d.start / 10) * 10; t <= end; t += 10) {
      const fade = Math.min(1, (end - t) / 180);
      let out = s.out ? gRun(s.out, t) : null;
      if (Array.isArray(out)) out = Math.round(out[0] + (out[1] - out[0]) * (0.5 + 0.5 * Math.sin(t / 53 + seed[v]) * fade));
      rows.push([t, +(gKey(s.pv, t) + gWob(t, seed[v]) * fade).toFixed(2), gRun(s.sv, t), out]);
    }
    h.v[v] = rows;
  });
  return h;
}

export { RECIPE, VNAME, VACT, ACT, HERMS_DELTA, BOIL_TH, BOOK, SCENES, history };

// Not the mockup's: two moments of the screen's own, for checking how the title bar holds what CraftBeerPi
// really asks (the dashboard agent's review, 9 Nov). Not compared with the mockup, which has neither.
// ?demo=resume: the server restarted mid-mash and asks, with two buttons.
// ?demo=longprompt: the hold before the boil, CraftBeerPi's longest question, with the boil waiting for you.
const EXTRA = {
  resume: () => Object.assign(mash(), {
    banner: {tone: "prompt", title: "Resume brew?", text: "'Saccharification' was interrupted when the server stopped. About 16 min 19 s of it had already run, and that is remembered - resuming continues from there rather than starting the step again. Check your kettle first, then choose.",
      acts: [{label: "RESUME", cmd: "b:ok"}, {label: "SKIP THIS STEP", cmd: "b:ok"}]},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    v: {hlt: {pv: 152.9, sv: 154.4, own: 168.0, mode: "manual"}, mt: {pv: 147.8, sv: 149.0, mode: "manual"}, bk: {pv: 68.0, sv: null, mode: "manual"}},
    recipe: {state: "stopped", cur: 2, left: 23 * 60 + 41, adds: []}
  }),
  longprompt: () => Object.assign(mash(), {
    t: 15 * 3600 + 53 * 60 + 12,
    banner: {tone: "prompt", title: "Boil", text: "Ready to boil? Move the wort to the boil kettle first - the dashboard is yours meanwhile. The boil kettle stays off until you press Start the boil, or Start on the Brew Steps page. (Set CONFIRM_BEFORE_BOIL to No to go straight on.)", act: "START THE BOIL", cmd: "b:ok"},
    v: {hlt: {pv: 170.2, sv: null, own: 168.0, mode: "manual"}, mt: {pv: 166.9, sv: null, mode: "manual"}, bk: {pv: 151.3, sv: null, mode: "manual"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: true}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: true, bk: true},
    recipe: {state: "ready", cur: 4, left: 90 * 60, adds: [], wait: "WAITING FOR YOU"}
  })
};

export { EXTRA };
