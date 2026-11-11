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
/* step 4 as recipes in the book have it (a MashStep on the mash tun, whose HERMS runs the wort pump), and as a recipe
   imported on core 4.7.7.post35 or later has it: a SpargeStep on the HLT (Scott, 10 Nov: "sparge step needs to let the
   HLT get up to mash out temperature before pumping wort over to boil kettle. I also may do a "batch sparge" - it
   should be flexible to let me do either"). It heats the sparge water on the HLT's own AUTO with the mash tun's AUTO
   off, asks "Sparge started" when the water is ready, then leaves both pumps to the brewer. The #sparge-… moments
   use it (load()); every other moment keeps the MashStep. */
const SPARGE_MASH = RECIPE.steps[3];
const SPARGE_STEP = {n: "Sparge", type: "SpargeStep", temp: 168, min: 40, k: "hlt"};
const WFY = "WAITING FOR YOU";
const KNAME = {hlt: "HLT", mt: "Mash Tun", bk: "Boil Kettle"}; // the kettles' names in CraftBeerPi, which its own messages use
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
   3.6 °F (2 °C) below again. Today (as built) the threshold is BoilPower._threshold: the kettle's target when it has one
   (the Boil step sets 210.2 °F), else its Boil_Threshold setting (BOIL_TH, 210.2 °F on Scott's set-up), else 99 °C.
   The proposed boil kettle (?bk=power) follows Brett's new BoilPower (10 Nov evening): the boil point is a setting of its
   own, Boil_Threshold (set_boil_at), and the kettle's target is an ordinary target, as on the HLT. A target within
   3.6 °F of the boil point or above, or none, means BOIL; a lower one is a temperature to hold (bkHoldT). */
const BOIL_TH = 210.2;
const boilFrom = () => BK === "power" ? st.v.bk.boilAt ?? BOIL_TH : st.v.bk.sv > 0 ? st.v.bk.sv : BOIL_TH;
const boilFromText = () => String(+boilFrom().toFixed(1)); // 210.2, or 170 for a 170.0 °F target
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
  /* the boil kettle's three phases in AUTO, for boil-kettle.html (Scott, 10 Nov: the power and temperature controls
     are "not intuitive"). Heating up: the Boil step has started and BoilPower runs at full power until 210.2 °F; the
     step's 90 min timer waits for that. Same day and history as #hop, 18 minutes before it boils. */
  heatup: () => Object.assign(SCENES.hop(), {
    t: 15 * 3600 + 12 * 60, banner: null, base: "hop",
    v: {hlt: {pv: 171.1, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 158.1, sv: null, mode: "manual"}, bk: {pv: 170.8, sv: 210.2, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 100}},
    recipe: {state: "running", cur: 4, left: 90 * 60, adds: [], wait: true},
    events: [
      ["15:01:47", "Boil started, boil kettle AUTO", "by recipe", ""],
      ["15:01:45", "Ready to boil? Start the boil", "answered", ""],
      ["14:58:30", "Sparge finished", "by recipe", ""],
      /* the proposed boil kettle: a recipe started from its first step goes back to the usual boil power, here after a
         brew day that ended at 35 % (in LOG) */
      ...(BK === "power" ? [["10:02:16", "Boil power back to your usual 45 % (was 35 %)", "by recipe", ""]] : [])
    ]
  }),
  /* boiling hard: the simulator boils at 212 °F, so PV sits above the 210.2 °F threshold (Scott on 8012, 10 Nov:
     "It pegs at 212 - over SV"). BoilPower holds the element at the boil power. */
  boiling: () => Object.assign(SCENES.hop(), {
    t: 15 * 3600 + 52 * 60 + 40, banner: null,
    v: {hlt: {pv: 165.6, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 151.4, sv: null, mode: "manual"}, bk: {pv: 212.0, sv: 210.2, mode: "auto"}},
    recipe: {state: "running", cur: 4, left: 67 * 60 + 24, adds: []},
    events: [
      ["15:30:04", "Boil: 210.2 °F reached, 90 min timer started", "by recipe", ""],
      ["15:01:47", "Boil started, boil kettle AUTO", "by recipe", ""],
      ["14:58:30", "Sparge finished", "by recipe", ""]
    ]
  }),
  /* a boil-over: 76 s into the boil the hot break foams up. With the proposed boil kettle Scott taps the element button
     at 15:30:55 and the heat pauses; today the element button is locked while AUTO runs, so it keeps heating at 45 % */
  pause: () => {
    const s = SCENES.boiling();
    s.t = 15 * 3600 + 31 * 60 + 20;
    s.v.bk.pv = 210.4;
    s.recipe.left = 88 * 60 + 44;
    s.events = s.events.filter(e => e[0] <= "15:30:04");
    if (BK === "power") {
      s.a.bkEl = {on: false, pct: 0, paused: true, pausedAt: 15 * 3600 + 30 * 60 + 55};
      s.events.unshift(["15:30:55", "BOIL ELEMENT paused", "confirmed", "ok"]);
    }
    return s;
  },
  /* the whirlpool hold: the stand cooled to 166.3 °F, Scott answered "Heat and hold?", and BoilPower holds 170 °F at a
     power that eases from full to Hold_Power (30 %) as the wort closes in: 35 % at 0.6 °F below. The boil power isn't
     used. Today it holds a separate Hold_Target, and the Boil step left the kettle's target at 0, so BoilPower shows its
     210.2 °F threshold as the target: today's faceplate says SV 210.2 and "40.8 °F below target". With Brett's new
     BoilPower (?bk=power) the step sets the kettle's own target to 170 °F instead. */
  hold: () => Object.assign(SCENES.hop(), {
    t: 17 * 3600 + 18 * 60 + 40, banner: null,
    v: {hlt: {pv: 156.8, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 139.6, sv: null, mode: "manual"},
      bk: BK === "power" ? {pv: 169.4, sv: 170.0, mode: "auto"} : {pv: 169.4, sv: 210.2, mode: "auto", hold: 170.0}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 35}},
    recipe: {state: "running", cur: 6, left: 9 * 60 + 30, adds: []},
    events: [
      ["17:14:31", "Whirlpool: heat and hold 170 °F", "confirmed", "ok"],
      ["17:14:20", "Whirlpool: the wort is down to 166.3 °F. Heat and hold?", "answered", ""],
      ["17:08:10", "Whirlpool started, 20 min", "by recipe", ""],
      ["17:07:52", "Whirlpool Hop: 1.50 oz Calypso added", "confirmed", "ok"],
      ["17:00:04", "Boil finished, boil kettle MANUAL", "by recipe", ""]
    ]
  }),
  /* Scott on 8012, 10 Nov: he set the boil power to 2 % and asked why the kettle held about 210 °F. At 2 % the kettle can't
     hold a boil; BoilPower lets go 3.6 °F below its threshold and heats at full power until it boils again, so it cycles
     between about 206 and 211 °F (Brett: ~3 min at 100 %, then 5½ min at 2 %). keepboil: the proposed boil kettle with
     KEEP BOILING ticked, 3¾ min into a fall at 2 %, its line saying what comes next. letfall: unticked at 16:10:21, so
     BoilPower stays at 2 % and the wort falls below a boil, as Scott chose. Both: the #hop day at 16:31:10. */
  keepboil: () => {
    const s = SCENES.hop();
    s.t = 16 * 3600 + 31 * 60 + 10; s.banner = null;
    s.v.hlt.pv = 162.4; s.v.mt.pv = 146.9;
    Object.assign(s.v.bk, {pv: 207.9, bp: 2, latched: true});
    s.a.bkEl = {on: true, pct: 2};
    s.recipe.left = 28 * 60 + 54; s.recipe.adds = ["done"];
    s.events[0] = ["16:00:02", "Hop alert: add 3.00 oz Centennial (1)", "answered", ""];
    s.events.unshift(["16:10:00", "Boil power 2 % (was 45 %)", "confirmed", "ok"], ["16:00:31", "Hop alert answered: 3.00 oz Centennial added", "confirmed", "ok"]);
    return s;
  },
  letfall: () => {
    const s = SCENES.keepboil();
    /* today's BoilPower can't let it fall: it would be cycling, as in #keepboil */
    if (BK !== "power") return s;
    Object.assign(s.v.bk, {pv: 199.3, keep: false});
    s.events.unshift(["16:10:21", "Keep boiling off", "confirmed", "ok", "the boil power only, even below a boil"]);
    return s;
  },
  /* a forgotten pause: the #pause boil-over, 2 min 15 s on. After 2 brewing minutes paused, CraftBeerPi raises a kept
     warning on every page (Scott, 10 Nov), once per pause, taken down when the heat carries on or AUTO stops. The boil's
     timer has carried on all along, as Scott chose. Today there is no pause: the boil carries on at 45 %. */
  "pause-long": () => {
    const s = SCENES.pause();
    s.t = 15 * 3600 + 33 * 60 + 10;
    s.recipe.left = 86 * 60 + 54;
    if (BK !== "power") { s.v.bk.pv = 211.2; return Object.assign(s, {base: "pause-long"}); }
    s.v.bk.pv = 206.3;
    s.a.bkEl.pauseWarned = true;
    s.banner = pauseBanner();
    s.events.unshift(["15:32:55", pauseBanner().title, "waiting for you", "wait"]);
    return Object.assign(s, {base: "pause-long"});
  },
  /* a hop stand by hand, with no recipe (Brett's new BoilPower: the target is BOIL or a temperature to hold, like the
     HLT's). Scott boiled by hand in AUTO from 10:21 and set the target to 170 °F at 12:41:10 with AUTO still on: the
     element went off, and the wort is cooling towards 170 °F, where it will hold. Today the target can't do this (170
     would boil at 45 % from 170 °F up); the old dashboard's "Hold a temperature" sets Hold_Target instead. */
  handhold: () => Object.assign(mash(), {
    t: 12 * 3600 + 58 * 60 + 40, banner: null,
    v: {hlt: {pv: 148.3, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 131.0, sv: null, mode: "manual"},
      bk: BK === "power" ? {pv: 188.4, sv: 170.0, mode: "auto"} : {pv: 188.4, sv: 210.2, mode: "auto", hold: 170.0}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: false, bk: true},
    recipe: null,
    timer: {left: 30 * 60, running: false},
    events: [
      BK === "power" ? ["12:41:10", "Boil kettle target 170.0 °F", "confirmed", "ok"] : ["12:41:10", "Boil kettle holds 170 °F", "confirmed", "ok"],
      ["10:21:40", "Boil kettle AUTO", "confirmed", "ok"],
      ["10:21:31", BK === "power" ? "Boil kettle target BOIL" : "Boil kettle target 210.2 °F", "confirmed", "ok"]
    ]
  }),
  /* the same day at 12:41:02, setting that hold: TARGET's box is open with 170.0 typed. Today the same box moves where
     the boil counts from */
  bktarget: () => {
    const s = SCENES.handhold();
    s.t = 12 * 3600 + 41 * 60 + 2;
    s.v.hlt.pv = 152.0; s.v.mt.pv = 133.9;
    s.v.bk = BK === "power" ? {pv: 212.0, sv: 210.2, mode: "auto", latched: true} : {pv: 212.0, sv: 210.2, mode: "auto"};
    s.a.bkEl = {on: true, pct: 45};
    s.events = s.events.slice(1);
    return Object.assign(s, {base: "handhold", open: {edit: {v: "bk", kind: "tgt", val: 170.0}}});
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
  /* the SpargeStep (core 4.7.7.post35), the #mash day after Saccharification ended at 14:56:21. As it started, the mash
     tun's AUTO went off, stopping the wort pump, and the HLT went to its own AUTO at 168 °F; the HLT pump runs on round
     the HLT, as before the sparge. The valves stay drawn for recirculating until "Sparge started" (renderRig). */
  "sparge-heat": () => Object.assign(mash(), {
    t: 14 * 3600 + 59 * 60 + 40, sparge4: {},
    v: {hlt: {pv: 160.6, sv: 168.0, own: 168.0, mode: "auto"}, mt: {pv: 148.4, sv: 149.0, mode: "manual"}, bk: {pv: 68.0, sv: null, mode: "manual"}},
    a: {hltEl: {on: true, pct: 100}, hltPump: {on: true}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: true, bk: false},
    recipe: {state: "running", cur: 3, left: 40 * 60, adds: [], wait: "HEATING"},
    events: [
      ["14:56:21", "Sparge: heating the sparge water to 168 °F, mash tun MANUAL", "by recipe", ""],
      ["14:56:19", "Saccharification finished", "by recipe", ""],
      ...MASH_EVENTS.map(e => e.slice())
    ]
  }),
  /* 15:04:40: the water reached 168 °F at 15:04:10, and CraftBeerPi asks, on every page, under the step's name. The
     step's 40 min wait for "Sparge started"; the drawing marks the four valves to change */
  "sparge-ready": () => {
    const s = SCENES["sparge-heat"]();
    s.t = 15 * 3600 + 4 * 60 + 40;
    s.v.hlt.pv = 168.2; s.v.mt.pv = 147.9;
    s.a.hltEl = {on: true, pct: 36};
    s.recipe.wait = WFY;
    s.banner = spargeBanner(168);
    s.events.unshift(["15:04:10", "Sparge: the sparge water is ready at 168 °F", "waiting for you", "wait"]);
    return s;
  },
  /* 15:12:40, a fly sparge: Scott set the valves, started the wort pump and pressed Sparge started at 15:05:02. That
     switched the HLT's AUTO off (Scott asked for the element off from here) and started the 40 min. Both pumps run: the
     HLT pump over to the top of the mash tun, the wort pump down to the boil kettle */
  "sparge-run": () => {
    const s = SCENES["sparge-heat"]();
    s.t = 15 * 3600 + 12 * 60 + 40;
    s.v.hlt = {pv: 166.9, sv: 168.0, own: 168.0, mode: "manual"};
    s.v.mt.pv = 151.6; s.v.bk.pv = 146.8;
    s.a = {hltEl: {on: false, pct: 0}, hltPump: {on: true}, wortPump: {on: true}, bkEl: {on: false, pct: 0}};
    s.fill = {mtLiq: true, bk: true};
    Object.assign(s.recipe, {wait: null, started: true, left: 32 * 60 + 22});
    s.events.unshift(
      ["15:05:02", "Sparge: sparge started, 40 min timer started", "confirmed", "ok"],
      ["15:05:02", "HLT AUTO off, so its element won't run as the HLT empties", "by recipe", ""],
      ["15:04:58", "WORT PUMP started", "confirmed", "ok"],
      ["15:04:10", "Sparge: the sparge water is ready at 168 °F", "answered", ""]);
    return s;
  },
  /* 15:20:30, a batch sparge, with the step's Timer at 0, so it runs until NEXT STEP and says SPARGING. The first
     runnings went to the boil kettle (15:05-15:13, wort pump); now the HLT pump refills the mash tun, with the wort pump
     off. One set of valves serves both kinds: each pump runs alone, and only its own line lights */
  "sparge-batch": () => {
    const s = SCENES["sparge-run"]();
    s.sparge4 = {min: 0};
    s.t = 15 * 3600 + 20 * 60 + 30;
    s.v.hlt.pv = 167.1; s.v.mt.pv = 165.3; s.v.bk.pv = 147.6;
    s.a.wortPump = {on: false};
    s.recipe.left = 0;
    s.events = [
      ["15:13:31", "HLT PUMP started", "confirmed", "ok"],
      ["15:13:20", "WORT PUMP stopped", "confirmed", "ok"],
      ["15:05:02", "Sparge: sparge started, until NEXT STEP", "confirmed", "ok"],
      ["15:05:02", "HLT AUTO off, so its element won't run as the HLT empties", "by recipe", ""],
      ["15:04:58", "WORT PUMP started", "confirmed", "ok"],
      ["15:04:50", "HLT PUMP stopped", "confirmed", "ok", "its override switch can still run it"],
      ["15:04:10", "Sparge: the sparge water is ready at 168 °F", "answered", ""],
      ["14:56:21", "Sparge: heating the sparge water to 168 °F, mash tun MANUAL", "by recipe", ""]
    ];
    return s;
  },
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
  /* the timers (?timers=new, approved by Scott 11 Nov 2026, not built yet). #timers: the #mash day, with Stir counting
     down (started 14:24:43) and Yeast set up for later; SOUND on. Today's view of these moments shows the screen as built */
  timers: () => Object.assign(mash(), {
    tmrs: [{id: 1, name: "Stir", set: 15 * 60, left: 7 * 60 + 12, state: "running"}, {id: 2, name: "Yeast", set: 20 * 60, left: 20 * 60, state: "stopped"}],
    snd: {on: true, ok: true},
    events: [...(TIMERS === "new" ? [["14:24:43", "Stir started, 15:00 to go", "confirmed", "ok"]] : []), ...MASH_EVENTS.map(e => e.slice())]
  }),
  /* Stir started at 14:17:19 and ran out at 14:32:19, 12 s ago: its row, the title bar and the screen's edge pulse, and
     it counts up */
  "timer-done": () => {
    const s = SCENES.timers(), t = s.tmrs[0];
    if (TIMERS !== "new") {
      /* today's screen: its one rest timer has finished */
      s.banner = {tone: "prompt", title: "Rest timer", text: "The rest timer has finished.", act: "OK", cmd: "b:ok"};
      s.events = [["14:32:19", "Rest timer finished", "waiting for you", "wait"], ...MASH_EVENTS.map(e => e.slice())];
      return s;
    }
    Object.assign(t, {state: "done", left: 0, at: s.t - 12});
    s.banner = tBanner(t, s.tmrs);
    s.events = [["14:32:19", "Stir finished", "waiting for you", "wait"], ["14:17:19", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())];
    return s;
  },
  /* + TIMER pressed: a third timer, named Vorlauf from the names to pick (BREWDAY_TIMER_NAMES as it comes); YEAST is
     greyed, as the second timer is called Yeast */
  "timer-new": () => Object.assign(SCENES.timers(), {open: {tedit: {id: null, name: "Vorlauf", ph: "Timer 3", set: 10 * 60}}}),
  /* the same with a list of eight in Settings: the first six, the longest a name can be (24 characters) wrapped, and Hop
     stand picked; Star San and Chill can be typed */
  "timer-names": () => Object.assign(SCENES["timer-new"](), {
    names: ["Hop stand", "Yeast", "Vorlauf", "Mash stir", "Whirlpool rest and chill", "PBW soak", "Star San", "Chill"],
    open: {tedit: {id: null, name: "Hop stand", ph: "Timer 3", set: 20 * 60}}
  }),
  /* BREWDAY_TIMER_NAMES left blank: no names to pick, and a line saying why; the name box still takes any */
  "timer-nonames": () => Object.assign(SCENES["timer-new"](), {names: [], open: {tedit: {id: null, name: "", ph: "Timer 3", set: 10 * 60}}}),
  /* brewing by hand, with three: PBW soak counting down, Yeast paused at 10:01:08, Timer 3 ready */
  "timers-hand": () => Object.assign(SCENES.manual(), {
    base: "manual",
    tmrs: [{id: 1, name: "PBW soak", set: 30 * 60, left: 22 * 60 + 40, state: "running"}, {id: 2, name: "Yeast", set: 15 * 60, left: 6 * 60 + 12, state: "paused"},
      {id: 3, name: "Timer 3", set: 10 * 60, left: 10 * 60, state: "stopped"}],
    snd: {on: true, ok: true},
    events: TIMERS !== "new" ? SCENES.manual().events : [
      ["10:04:11", "Hot liquor tank target 168.0 °F", "confirmed", "ok"],
      ["10:03:40", "HLT PUMP started", "confirmed", "ok"],
      ["10:01:08", "Yeast paused, 6:12 to go", "confirmed", "ok"],
      ["09:58:02", "Hot liquor tank AUTO", "confirmed", "ok"],
      ["09:57:00", "PBW soak started, 30:00 to go", "confirmed", "ok"],
      ["09:52:20", "Yeast started, 15:00 to go", "confirmed", "ok"]
    ]
  }),
  /* the same, just after the page was opened again: SOUND is on for this screen, but the browser plays nothing until the
     first tap on the page */
  "sound-allow": () => Object.assign(SCENES["timers-hand"](), {snd: {on: true, ok: false}}),
  offline: () => {
    const s = mash();
    s.link = "lost"; s.age = 48; s.t = 14 * 3600 + 32 * 60 + 58;
    s.banner = {tone: "alarm", title: "No connection", text: "Readings are {age} s old. Trying again every 5 s. Controls are paused until CraftBeerPi answers."};
    s.events.unshift(["14:32:10", "Connection to CraftBeerPi lost", "trying again", "bad"]);
    return s;
  },
  /* AUTO with no target (Scott on 8012, 10 Nov: "I have Mash Tun "Auto" on but HLT is off"). The mash tun's target was 0,
     left from the last recipe, and he held AUTO at 13:26. PID_HERMS takes 0 as a real target: it holds the mash at 0 °F,
     so it never asks the HLT for heat, though its pump still runs. CraftBeerPi now warns after 5 s (Brett's server change). */
  notarget: () => Object.assign(mash(), {
    t: 13 * 3600 + 47 * 60 + 10,
    banner: noTargetBanner("mt"),
    v: {hlt: {pv: 68.0, sv: null, own: 168.0, mode: "manual"}, mt: {pv: 67.6, sv: null, mode: "auto", noTgt: 1270, warned: true}, bk: {pv: 66.9, sv: null, mode: "manual"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: true, bk: false},
    recipe: null,
    timer: {left: 60 * 60, running: false},
    events: [
      ["13:26:21", "No target for the Mash Tun", "waiting for you", "wait"],
      ["13:26:16", "Mash tun AUTO", "confirmed", "ok"],
      ["13:24:50", "Craftbeerpi Test Recipe v5 finished", "by recipe", ""]
    ]
  }),
  /* the same slip on a kettle with its own AUTO: the HLT's PIDBoil, with no target of its own */
  "notarget-hlt": () => Object.assign(mash(), {
    t: 9 * 3600 + 12 * 60 + 40,
    banner: noTargetBanner("hlt"),
    v: {hlt: {pv: 66.2, sv: null, own: null, mode: "auto", noTgt: 95, warned: true}, mt: {pv: 65.8, sv: null, mode: "manual"}, bk: {pv: 66.9, sv: null, mode: "manual"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: false, bk: false},
    recipe: null,
    timer: {left: 60 * 60, running: false},
    events: [
      ["09:11:10", "No target for the HLT", "waiting for you", "wait"],
      ["09:11:05", "Hot liquor tank AUTO", "confirmed", "ok"]
    ]
  })
};
/* CraftBeerPi's kept warning when a kettle's AUTO has run 5 s with no target (unset, 0 or below). It is taken down by
   itself once the kettle has a target or leaves AUTO (Brett's server change, 10 Nov). BoilPower never raises it: it puts
   its boil threshold in as the target as it starts. */
function noTargetBanner(v) {
  return {tone: "prompt", title: `No target for the ${KNAME[v]}`, notgt: v, act: "OK", cmd: "b:ok",
    text: `AUTO is on with no target temperature, so ${v === "mt" ? "the HLT" : "it"} won't heat. Set a target, or switch to MANUAL.`};
}
const noTarget = v => st.v[v].mode === "auto" && st.v[v].sv == null;
/* the SpargeStep's kept prompt, titled with the step's name, in core 4.7.7.post35's words (SPARGE_READY_TEXT); its one
   button answers it. With no water to heat it asks at once: SPARGE_NOW_TEXT */
function spargeBanner(temp) {
  return {tone: "prompt", title: "Sparge", sparge: true, act: "SPARGE STARTED", cmd: "b:sparge",
    text: temp ? `The sparge water is ready at ${temp} °F. Set the valves and start the pumps by hand, for a fly or a batch sparge, then press Sparge started, which switches the HLT's AUTO off.`
      : "Set the valves and start the pumps by hand, for a fly or a batch sparge, then press Sparge started."};
}
/* the proposed boil kettle's warning for a forgotten pause (Scott, 10 Nov): after 2 brewing minutes paused, kept on every
   page with OK, said once per pause, and taken down when the heat carries on or AUTO stops (Brett's server change, which
   uses the kettle's name from CraftBeerPi, as "No target for the Mash Tun" does) */
function pauseBanner() {
  return {tone: "prompt", title: `${KNAME.bk} heat still paused`, pausegt: true, act: "OK", cmd: "b:ok",
    text: `The heat has been paused for 2 minutes. To heat again, press and hold PAUSED on the ${KNAME.bk}.`};
}
/* ---------- the boil kettle: today's faceplate (?bk=today, the default: what is built) or one of the two redesigns that
   boil-kettle.html compares (Scott, 10 Nov: its power and temperature controls are "not intuitive"). BoilPower isn't a
   thermostat. It heats at full power until the wort reaches its threshold (boilFrom), then holds the element at the
   boil power; in a whirlpool hold it holds Hold_Target instead and never uses the boil power. Both redesigns say so:
   words: today's layout. The green number is the temperature the boil counts from, labelled BOIL, and the button
          beside AUTO/MANUAL sets it (BOIL AT, 212 °F at most). BOIL POWER, beside the element, sets the boil power.
   power: the green number is the boil power, as on a boil controller (Auber's EZboil shows "P 45" in its SV window).
          The button beside AUTO/MANUAL sets it, and its box also holds BOIL AT and the usual power. Approved by Scott
          on 10 Nov, with three additions (nudgeHTML below); words was dropped.
   In both, a whirlpool hold shows HOLD and its temperature, and the power button sets the boil power in either mode:
   it never changes meaning with the mode. In MANUAL the element runs at its own level, as the HLT's does.
   Then Brett's new BoilPower (10 Nov evening) gave the boil kettle an ordinary target, BOIL or a temperature to hold
   (Scott: "Set the boil kettle's target to 170 °F, like the HLT, and it holds there"). So power has TARGET beside
   AUTO/MANUAL, as the HLT does, and the boil power's button moved into its window: while the target is BOIL, the green
   45 % is that button. A hold reads like the HLT: SV and its temperature, with OUT. */
const bkNew = v => v === "bk" && BK !== "today";
/* BoilPower's boil latch: set when the wort reaches the threshold (boilFrom), and from then on the element runs at the boil
   power. With Keep_Boiling "Yes" (the default) it lets go 3.6 °F (2 °C) below the threshold and heats at full power until
   the wort boils again; with "No" it holds the boil power until AUTO stops, even if the wort falls below a boil (Scott,
   10 Nov: "let the boil power fully drive the temp (ok to fall if I set it too low %)"). The real screen can't read the
   latch; it can tell from the element running at the boil power while the wort is below the threshold (BUILD-NOTES).
   The same 3.6 °F below the boil point is where the proposed boil kettle's targets stop being BOIL (bkHoldT). */
const BOIL_MARGIN = 3.6;
const bkLetGo = () => +(boilFrom() - BOIL_MARGIN).toFixed(1);
/* the temperature the boil kettle holds, or null while it boils. Proposed (Brett's new BoilPower): its own target when it
   is set and below BOIL. Today: the separate Hold_Target, which only the Whirlpool step and the old dashboard set */
const bkHoldT = () => { const V = st.v.bk; return BK === "power" ? (V.sv > 0 && V.sv < bkLetGo() ? V.sv : null) : V.hold ?? null; };
const bkHolding = () => st.v.bk.mode === "auto" && bkHoldT() != null;
const bkLatched = () => { const V = st.v.bk; return V.mode === "auto" && bkHoldT() == null && (V.latched ?? V.pv >= boilFrom()); };
function bkLine() {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT();
  if (V.mode !== "auto") return "MANUAL · element by hand";
  /* a forgotten pause would quietly stop the boil, so the line counts it, in Prompt Amber like the button */
  if (BK === "power" && el.paused) return `<span class="warn">Heat paused for <span id="pz">${mmss(Math.max(0, st.t - el.pausedAt))}</span></span>`;
  /* proposed: a hold is a target like the HLT's, so its line reads like the HLT's. Inside 3.6 °F below it BoilPower rests
     rather than heat, so then the line says where it heats again, and an element that's off isn't taken for a fault */
  if (ho != null && BK === "power") {
    const d = ho - V.pv;
    if (Math.abs(d) < 0.3) return "At target";
    if (d > 0 && !el.on) return `${d.toFixed(1)} °F below target · heats again at ${+(ho - BOIL_MARGIN).toFixed(1)} °F`;
    const eta = GRAPHS ? graphETA("bk") : "";
    return (d > 0 ? `${d.toFixed(1)} °F below target` : `${(-d).toFixed(1)} °F above target`) + (eta ? ` · ${eta}` : "");
  }
  if (ho != null) {
    const d = ho - V.pv;
    return `Holding ${+ho.toFixed(1)} °F for the whirlpool` + (Math.abs(d) >= 0.3 ? ` · ${Math.abs(d).toFixed(1)} °F ${d > 0 ? "below" : "above"}` : "");
  }
  if (V.pv >= boilFrom()) return BK === "power" ? "Boiling" : `Boiling at ${V.bp} %`;
  /* the proposed boil kettle, still at the boil power below the threshold: say what happens next, or that it won't */
  if (BK === "power" && bkLatched()) return V.keep !== false ? `Below a boil · back to full power at ${bkLetGo()} °F`
    : `Not boiling · ${(boilFrom() - V.pv).toFixed(1)} °F below ${boilFromText()} °F`;
  const eta = GRAPHS ? graphETA("bk").replace(" at this rate", "") : "";
  return (BK === "power" ? "Full power until it boils" : `Full power until it boils, then ${V.bp} %`) + (eta ? ` · ${eta}` : "");
}
/* BoilPower's output in a hold (_hold_climb_power): full power from 7.2 °F below, easing to Hold_Power (30 %) at the hold,
   off at or above it; inside 3.6 °F it only carries on heating, so a fresh start there rests */
function holdOut(T, pv, heating) {
  const below = T - pv;
  if (below >= 7.2) return 100;
  if (below <= 0 || (below <= BOIL_MARGIN && !heating)) return 0;
  return Math.trunc(30 + 70 * below / 7.2);
}
/* ending a pause (carrying on, MANUAL, ALL OFF) also takes CraftBeerPi's forgotten-pause warning down */
function endPause() {
  const el = st.a.bkEl;
  el.paused = false; el.pauseWarned = false;
  if (st.banner && st.banner.pausegt) st.banner = null;
}
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
  return `<button type="button" class="${cls}"${o.label ? ` aria-label="${esc(o.label)}"` : ""}${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ""}${o.expanded != null ? ` aria-expanded="${o.expanded}"` : ""}${o.cmd ? ` data-cmd="${o.cmd}"` : ""}${h ? " data-hold" : ""}${dis ? ` aria-disabled="true" data-why="${esc(o.why)}"` : ""}>${h ? '<span class="fill"></span>' : ""}<span class="lb">${label}</span>${small ? `<small>${small}</small>` : ""}</button>`;
}

/* ---------- faceplates ---------- */
function lampHTML(id) {
  const A = ACT[id], a = st.a[id], pend = st.pend["a:" + id], lost = st.link === "lost";
  const locked = !!a.by && !a.failed;
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = A.name + " · waiting for CraftBeerPi"; }
  else if (a.failed) { s = "failed"; t = a.on ? "DID NOT STOP" : "DID NOT START"; n = `${A.name} · still ${a.on ? (A.kind === "pump" ? "running" : "heating") : "off"} · tap to try again`; }
  else if (a.on) { s = A.kind === "heat" ? "heating" : "running"; t = A.kind === "heat" ? (id === "bkEl" && BK === "power" ? "HEATING" : `HEATING ${a.pct} %`) : "RUNNING"; n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : A.kind === "heat" ? " · tap to turn off" : " · tap to stop"); }
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
  const by = v === "hlt" && st.v.mt.mode === "auto", pend = st.pend["t:" + v], none = !by && noTarget(v);
  const why = st.link === "lost" ? PAUSED : by ? `The mash tun sets this target while it runs the HERMS: up to its own target plus ${HERMS_DELTA} °F.` : pend ? WAIT : "";
  return b(none ? "tgtbtn notgt" : "tgtbtn", "TARGET", by ? "set by mash tun" : pend ? "sending…" : none ? "set SV" : bkNew(v) ? "change" : "change SV", {cmd: `tgt:${v}`, why});
}
/* only a kettle whose logic declares set_boil_power has this (on Scott's rig, the boil kettle). It sits beside the
   element it governs and works at any time, also while a recipe runs (Scott, 10 Nov). In AUTO it sets the logic's
   Boil_Power, used from BoilPower's threshold up (boilFrom); in MANUAL, including the "Ready to boil?" hold, it sets the
   element's own level, used when it is on by hand. The kettle's mode decides what it sets, never the recipe.
   Changing it is a tap on SET, like a target: it changes a level, it doesn't switch heat on */
function powerHTML() {
  const V = st.v.bk, auto = V.mode === "auto", pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  const exp = !!st.edit && st.edit.kind === "pwr";
  if (BK === "words") return b("tgtbtn pwrbtn", `BOIL POWER ${V.bp} %`,
    pend ? "sending…" : `${!auto ? "kept for the boil" : V.hold != null ? "not used while holding" : V.pv >= boilFrom() ? "in use" : "once it boils"} · change`,
    {cmd: "pwr:bk", why, expanded: exp});
  return b("tgtbtn pwrbtn", auto ? `BOIL POWER ${V.bp} %` : `POWER ${st.a.bkEl.lvl} %`,
    pend ? "sending…" : auto ? `used from ${boilFromText()} °F · change` : "used by hand · change",
    {cmd: "pwr:bk", why, expanded: exp});
}
/* the redesigns' name for the boil kettle's target: the temperature the boil counts from (BoilPower's threshold). Only the
   dropped words design still uses it; the proposed design's BOIL AT is in the power box (editorHTML) */
function boilAtHTML() {
  const pend = st.pend["t:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  return b("tgtbtn", "BOIL AT", pend ? "sending…" : "change",
    {cmd: "tgt:bk", why, expanded: !!st.edit && st.edit.kind === "tgt" && st.edit.v === "bk"});
}
/* the proposed boil kettle's boil power, in its window while the target is BOIL: the green number is the setting, so it is
   the button that opens the power box (TARGET took its place beside AUTO/MANUAL). Framed like the graph's chosen span,
   with a small "change" like every other button's, so it reads as a control, not only a reading. Its tap area is at
   least 44 px tall. The HLT's and the mash tun's readings stay readings */
function boilReadHTML() {
  const V = st.v.bk, pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  return `<button type="button" class="svbtn" data-cmd="pwr:bk" aria-expanded="${!!st.edit && st.edit.kind === "pwr"}" aria-label="Boil power ${V.bp} percent: change"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="svv">${V.bp}<span class="u">%</span></span><small>${pend === "set" ? "sending…" : "change"}</small></button>`;
}
/* the proposed boil kettle's TARGET box: the HLT's, plus BOIL (Scott: "Set the boil kettle's target to 170 °F, like the
   HLT, and it holds there"). Anything from the boil point less 3.6 °F up is BOIL, so the steps run …205.6, 206.5, BOIL,
   and a typed 212 is BOIL too; BOIL is the top, so + is refused there. SET BOIL sends the boil point as the target.
   The third row: BOIL, pressed while the box says BOIL, and BOIL POWER, the second way to the power box */
function bkTgtEditorHTML() {
  const val = st.edit.val, boil = val >= bkLetGo(), x = boil ? "BOIL" : val.toFixed(1);
  const top = boil ? "BOIL is the top. BOIL AT, under BOIL POWER, sets where the boil starts." : "";
  const key = (d, l) => `<button type="button" data-cmd="tstep:${d}" aria-label="${l}"${d > 0 && top ? ` aria-disabled="true" data-why="${esc(top)}"` : ""}>${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  return `<div class="editor bktgt" role="group" aria-label="New target for the boil kettle">
    ${key(-1, "Down 1 degree")}${key(-0.1, "Down 0.1 degree")}
    <input id="tin" inputmode="decimal" value="${x}" aria-label="New target in °F, or BOIL">
    ${key(0.1, "Up 0.1 degree")}${key(1, "Up 1 degree")}
    <button type="button" class="ok" data-cmd="tset">SET <span id="tok">${boil ? "BOIL" : x + " °F"}</span></button><button type="button" class="no" data-cmd="tcancel">CANCEL</button>
    <button type="button" class="tboil" data-cmd="tboil" aria-pressed="${boil}">BOIL<small>full power to ${boilFromText()} °F</small></button><button type="button" class="tpwr" data-cmd="pwr:bk">BOIL POWER<small>change</small></button></div>`;
}
/* ---------- the proposed boil kettle (?bk=power): three ideas from commercial boil controllers, all chosen by Scott
   on 10 Nov ("All three"). While AUTO boils, −5 % and +5 % sit either side of the element button and change the boil
   power with one tap, like a Grainfather's arrow keys. The element button itself pauses the heat for a boil-over and
   keeps AUTO, the recipe and the boil power, like the heater button on an Ss Brewtech eController; carrying on is a
   held press, like any heat. Each recipe starts at the usual boil power, like a Grainfather's default boil power. */
function nudgeHTML(d) {
  const V = st.v.bk, pend = st.pend["p:bk"];
  /* a step that would pass 0 or 100 % stops there; only at the end itself is the button refused */
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : d < 0 && V.bp <= 0 ? "The boil power is already 0 %." : d > 0 && V.bp >= 100 ? "The boil power is already 100 %." : "";
  return b("cmdbtn nudge", `${d < 0 ? "−" : "+"}${Math.abs(d)} %`, pend === (d < 0 ? "down" : "up") ? "sending…" : d < 0 ? "turn down" : "turn up",
    {cmd: `pnudge:${d}`, why, label: `Boil power ${d < 0 ? "down" : "up"} ${Math.abs(d)} percent`});
}
function bkLampHTML() {
  const a = st.a.bkEl, V = st.v.bk, pend = st.pend["a:bkEl"];
  if (V.mode !== "auto" || (a.failed && !pend)) return lampHTML("bkEl");
  let s, t, n, cmd, h = false;
  if (pend) { s = "pending"; t = pend === "pause" ? "PAUSING…" : pend === "resume" ? "CARRYING ON…" : pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = "BOIL ELEMENT · waiting for CraftBeerPi"; cmd = "noop"; }
  else if (a.paused) { s = "paused"; t = "PAUSED"; n = "BOIL ELEMENT · hold to heat"; cmd = "pause:off"; h = true; }
  else { s = a.on ? "heating" : "off"; t = a.on ? "HEATING" : "OFF"; n = "BOIL ELEMENT · tap to pause"; cmd = "pause:on"; }
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hh = h && !why;
  return `<button type="button" class="lamp" data-state="${s}" data-cmd="${cmd}"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
/* the steps show only while AUTO can use the boil power: not in MANUAL, where they would seem to set the element's
   own level, nor in a hold, nor while the boil kettle's box is open, which has steps of its own */
const bkNudges = () => BK === "power" && st.v.bk.mode === "auto" && !bkHolding() && !(st.edit && st.edit.v === "bk");
/* the proposed boil kettle's Keep boiling choice (Scott, 10 Nov: "add a small checkbox with LED to choose keep at boil
   temp or let the boil power fully drive the temp"). A small checkbox at the end of the nameplate row; the box is the LED,
   lit Setpoint Green with a tick while ticked. One tap sets Keep_Boiling (set_keep_boiling), in any mode, like the boil
   power. Its tap area reaches 44 px into the padding above and the gap below without making the row taller. It shows
   only while the target is BOIL: a hold never uses it. */
function keepHTML() {
  const V = st.v.bk, on = V.keep !== false, pend = st.pend["k:bk"], lost = st.link === "lost";
  const why = lost ? PAUSED : pend ? WAIT : "";
  return `<button type="button" class="keep${lost ? " stale" : ""}" role="checkbox" aria-checked="${on}" data-cmd="keep:bk"${pend ? ' data-state="pending"' : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.2 8.4l3 3 6.6-7"/></svg></span><span class="kl">KEEP BOILING</span><span class="sr">: full power again if the wort falls ${BOIL_MARGIN} °F below a boil</span></button>`;
}
function editorHTML(v) {
  if (st.edit.kind === "pwr") {
    const p = st.edit.val;
    return `<div class="editor pwr" role="group" aria-label="${st.edit.what === "boil" ? "New boil power for the boil kettle" : "New power for the boil element by hand"}">
    <button type="button" data-cmd="pstep:-5" aria-label="Down 5 percent">−5</button><button type="button" data-cmd="pstep:-1" aria-label="Down 1 percent">−1</button>
    <input id="tin" inputmode="numeric" value="${p}" aria-label="${st.edit.what === "boil" ? "New boil power in percent" : "New power by hand in percent"}">
    <button type="button" data-cmd="pstep:1" aria-label="Up 1 percent">+1</button><button type="button" data-cmd="pstep:5" aria-label="Up 5 percent">+5</button>
    <button type="button" class="ok" data-cmd="pset">SET <span id="tok">${p}</span> %</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button>${BK === "power" ? `
    <button type="button" class="bkat" data-cmd="bat">BOIL AT ${boilFromText()} °F<small>full power until then · change</small></button><p class="usual">${st.v.bk.usual != null ? `USUAL ${st.v.bk.usual} %<small>starts each recipe · set in Hardware</small>` : "USUAL – –<small>none · set one in Hardware</small>"}</p>` : ""}</div>`;
  }
  if (v === "bk" && BK === "power" && st.edit.kind === "tgt") return bkTgtEditorHTML();
  /* the HLT's and the mash tun's target, or the boil point (the proposed design's BOIL AT; the words design's target) */
  const x = st.edit.val.toFixed(1), at = bkNew(v);
  return `<div class="editor" role="group" aria-label="${at ? "New boil temperature for the boil kettle" : `New target for the ${VNAME[v].toLowerCase()}`}">
    <button type="button" data-cmd="tstep:-1" aria-label="Down 1 degree">−1</button><button type="button" data-cmd="tstep:-0.1" aria-label="Down 0.1 degree">−.1</button>
    <input id="tin" inputmode="decimal" value="${x}" aria-label="${at ? "New boil temperature in °F" : "New target in °F"}">
    <button type="button" data-cmd="tstep:0.1" aria-label="Up 0.1 degree">+.1</button><button type="button" data-cmd="tstep:1" aria-label="Up 1 degree">+1</button>
    <button type="button" class="ok" data-cmd="tset">SET <span id="tok">${x}</span> °F</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button></div>`;
}
function devHTML(v) {
  if (st.link === "lost") return `<span class="age">Last reading ${st.age} s ago</span>`;
  if (bkNew(v)) return bkLine();
  const V = st.v[v], herms = v === "hlt" && st.v.mt.mode === "auto", driven = V.mode === "auto" || herms;
  /* AUTO with no target (unset, 0 or below) runs but holds nothing, so nothing heats. The line says so at once, in Prompt
     Amber, and never calls it MANUAL; CraftBeerPi's own warning follows in the title bar after 5 s (Scott, 10 Nov) */
  if (herms && st.v.mt.sv == null) return `<span class="warn">Not heating: the mash tun has no target</span>`;
  if (noTarget(v)) return `<span class="warn">${v === "mt" ? "No target, so the HLT won't heat" : "No target, so it won't heat"}</span>`;
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
  /* power first: the boil power is the boil kettle's green number, so its window doesn't repeat the element's power as
     OUT (Scott, 10 Nov: "I don't need the heating element power echoed so many places"). In a hold the green number is
     the target, so OUT comes back, as on the HLT */
  if (bkNew(v) && BK === "power" && bkHoldT() == null) return `<dl class="aux"><dt>MODE</dt><dd>${mode}</dd></dl>`;
  const pct = el && el.on ? el.pct : 0;
  return `<dl class="aux"><dt>OUT</dt><dd>${el ? pct + " %" : "– –"}<span class="outbar"${el ? "" : ' style="visibility:hidden"'} aria-hidden="true"><i style="width:${pct}%"></i></span></dd><dt>MODE</dt><dd>${mode}</dd></dl>`;
}
function hermsRowHTML() {
  const why = st.link === "lost" ? PAUSED : `The mash tun's AUTO runs this vessel for the HERMS: it switches the HLT element and sets this target up to the mash tun's target plus ${HERMS_DELTA} °F. Switch the mash tun to MANUAL to take the HLT over.`;
  return `<div class="moderow"><button type="button" class="tgtbtn herms" data-cmd="noop" aria-disabled="true" data-why="${esc(why)}"><span class="lb">HERMS</span><small>run by the mash tun · switch it to MANUAL to take over</small></button></div>`;
}
/* the faceplate's second readout: the SV, or in the boil kettle's redesigns what its AUTO works to, named */
function svCell(v) {
  const V = st.v[v], u = s => `<span class="u">${s}</span>`;
  if (!bkNew(v)) return ["SV", V.sv == null ? "– –" : f1(V.sv) + u("°F")];
  /* proposed: a hold reads like the HLT's target; while the target is BOIL the green number is the boil power, and its button */
  if (BK === "power") { const ho = bkHoldT(); return ho != null ? ["SV", f1(ho) + u("°F")] : ["BOIL", boilReadHTML()]; }
  if (bkHolding()) return ["HOLD", f1(V.hold) + u("°F")];
  return ["BOIL", f1(boilFrom()) + u("°F")];
}
function plateHTML(v) {
  const V = st.v[v], by = v === "hlt" && st.v.mt.mode === "auto" && st.v.mt.sv != null, [svT, svV] = svCell(v);
  const second = v === "bk" ? (BK === "power" ? "" : powerHTML()) : "";
  /* the proposed boil kettle has TARGET beside AUTO/MANUAL, as the HLT does; the words design had BOIL AT there */
  const setBtn = bkNew(v) && BK !== "power" ? boilAtHTML() : tgtHTML(v);
  const nudge = v === "bk" && bkNudges();
  const lamps = v === "bk" && BK === "power" ? (nudge ? nudgeHTML(-5) + bkLampHTML() + nudgeHTML(5) : bkLampHTML()) : VACT[v].map(lampHTML).join("") + second;
  return `<section class="plate" id="pl-${v}" aria-labelledby="h-${v}">
    ${v === "bk" && BK === "power" ? `<div class="phead"><h2 id="h-${v}">${VNAME[v]}</h2>${bkHoldT() == null ? keepHTML() : ""}</div>` : `<h2 id="h-${v}">${VNAME[v]}</h2>`}
    <div class="face${st.link === "lost" ? " stale" : ""}">
      <dl class="pvsv"><dt>PV</dt><dd class="pv">${f1(V.pv)}<span class="u">°F</span></dd>
      <dt>${svT}</dt><dd class="sv">${svV}</dd></dl>
      ${LAYOUT === "b" ? auxHTML(v) : ""}
      ${GRAPHS ? graphHTML(v, "f") : ""}
    </div>
    <p class="dev">${devHTML(v)}${by ? " · SV set by the mash tun" : ""}</p>
    <div class="ctrls${nudge ? " bkpow" : ""}">${lamps}</div>
    ${st.edit && st.edit.v === v ? editorHTML(v) : v === "hlt" && st.v.mt.mode === "auto" ? hermsRowHTML() : `<div class="moderow">${modeHTML(v)}${setBtn}</div>`}
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
    <ol class="steps" aria-label="Recipe steps">${S.map(stepHTML).join("")}</ol>${TIMERS === "new" ? timersHTML() : ""}`;
}
function confirmHTML() {
  const r = st.recipe, cur = RECIPE.steps[r.cur], nx = RECIPE.steps[r.cur + 1];
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Skip the rest of <b>${cur.n}</b>${cur.min ? ` (${mmss(r.left)} left)` : ""} and start <b>${nx.n}</b>${nx.temp ? ` at ${nx.temp} °F` : ""}?</p><div><button type="button" class="yes" data-cmd="r:next-yes">SKIP TO ${nx.n.toUpperCase()}</button><button type="button" data-cmd="r:next-no">KEEP GOING</button></div></div>`;
}
function stepHTML(s, i) {
  const r = st.recipe, state = i < r.cur ? "done" : i === r.cur ? "cur" : "";
  const p = [s.temp != null ? `${stepTemp(s)} °F` : "", s.min ? `${s.min} min` : ""].filter(Boolean).join(" · ");
  const right = state === "done" ? "✓ DONE" : state === "cur" ? (r.state === "running" ? (r.wait ? waitHTML(r.wait) : s.min ? `<span id="r-left">${mmss(r.left)}</span> LEFT` : runWord(s)) : r.state === "ready" ? "READY" : "STOPPED") : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
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
    ${TIMERS === "new" ? timersHTML() : `<section class="timer" aria-labelledby="tm-h"><h3 id="tm-h">Rest timer</h3>
      <output id="tm-out">${mmss(t.left)}</output>
      <div>${b("cmdbtn", "−5 MIN", "", {cmd: "tm:-300", why: off})}${b("cmdbtn", "+5 MIN", "", {cmd: "tm:300", why: off})}${b("cmdbtn go", pt ? (pt === "start" ? "STARTING…" : "PAUSING…") : t.running ? "PAUSE TIMER" : "START TIMER", t.running ? "counting down on every screen" : "alarm at zero, on every screen", {cmd: "tm:go", why: off || (pt ? WAIT : "")})}</div>
    </section>`}
    <section class="book" aria-labelledby="bk-h"><h3 id="bk-h">Recipe book</h3><ul>${BOOK.map((x, i) => `<li><span class="bn">${x.n}</span><span class="bd">${x.d}</span>${b("cmdbtn", "LOAD", "", {cmd: "load:" + i, why: off})}</li>`).join("")}</ul></section>
    <div class="handlinks">${b("cmdbtn", "RECIPE BOOK", "all recipes", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "BREW STEPS", "build or edit steps", {cmd: "tab:Brew Steps"})}</div>
    <p class="note">${st.notes.r || ""}</p>`;
}
function nowHTML() {
  const r = st.recipe;
  if (!r) return `<span class="n">–</span><b>No recipe running</b><span class="p">Brewing by hand · ${TIMERS === "new" ? "timers" : "rest timer"} below</span>${tmlHTML()}`;
  const s = RECIPE.steps[r.cur], pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) : 0;
  const p = [s.temp != null ? `${stepTemp(s)} °F` : "", s.min ? `${s.min} min` : "", `step ${r.cur + 1} of ${RECIPE.steps.length}`].filter(Boolean).join(" · ");
  const nx = RECIPE.steps[r.cur + 1];
  const nxt = nx ? `<span class="nx">Next: ${nx.n}${nx.temp != null ? ` · ${stepTemp(nx)} °F` : ""}${nx.min ? ` · ${nx.min} min` : ""}</span>` : `<span class="nx">Last step</span>`;
  return `<span class="n">${r.cur + 1}</span><b>${s.n}</b><span class="p">${p}</span><span class="left">${r.state === "running" ? (r.wait ? waitHTML(r.wait).toLowerCase() : s.min ? `<span id="now-left">${mmss(r.left)}</span> left` : runWord(s).toLowerCase()) : r.state === "ready" ? "ready" : "stopped"}</span>  ${s.min ? `<span class="bar"><i id="now-bar" style="width:${pct}%"></i></span>` : ""}${nxt}${tmlHTML()}`;
}
/* a running step whose timer hasn't started says what it waits for: HEATING, or WAITING FOR YOU (in the brighter amber
   of Brett's screen) while CraftBeerPi's question under the step's name is up. A SpargeStep's temperature is the HLT's
   water, not the mash, so it says so; once started with no timer it is SPARGING rather than NOW */
const waitHTML = w => w === true ? "HEATING" : w === WFY ? `<span class="wfy">${w}</span>` : w;
const stepTemp = s => (s.type === "SpargeStep" ? "water " : "") + s.temp;
const runWord = s => s.type === "SpargeStep" ? "SPARGING" : "NOW";

/* ---------- alarms, last event, rig ---------- */
function bannerHTML() {
  const x = st.banner;
  if (!x) return `${ICON.ok}<span class="msg">No alarms</span>`;
  /* several answers, as the screen as built shows them (acts). A timer's alarm (?timers=new) has two: +5 MIN, drawn as the
     lesser one (sec), and OK. Its own command is pending, not the banner's */
  const acts = x.acts || (x.act ? [{label: x.act, cmd: x.cmd}] : []), busy = x.timer != null ? st.pend["t:" + x.timer] : st.pend.b;
  const act = acts.map(y => b(y.sec ? "act sec" : "act", busy && (acts.length === 1 || busy === y.dir || busy === y.cmd) ? "SENDING…" : y.label, "", {cmd: y.cmd, why: busy ? WAIT : ""})).join("");
  return `${x.tone === "prompt" ? ICON.bell : ICON.warn}<span class="msg"><b>${esc(x.title)}${x.more ? ` · ${x.more} more waiting` : ""}</b>${x.text.replace("{age}", `<span id="ban-age">${st.age}</span>`)}</span>${act}`;
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
  /* a SpargeStep is the runoff whatever it is called, as in the core (StepController._collects_wort) */
  if (s.type === "SpargeStep") return true;
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
function rigDesc(ro, held, setNow) {
  const spLine = !!$("#ln-sparge"), head = "Hot liquor tank, mash tun and boil kettle. ";
  if (ro < 0 || held) return head + "The HLT pump circulates hot water around the hot liquor tank. The wort pump moves wort from the mash tun, through the coil inside the hot liquor tank, and back into the mash tun. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating, with the lines to the boil kettle"
    + (spLine ? " and to the top of the mash tun" : "") + " closed."
    + (setNow ? ` Step ${ro + 1}, ${RECIPE.steps[ro].n}, is waiting for you to set them for the sparge: close the coil line${spLine ? " and the HLT return" : ""}, and open the line to the boil kettle${spLine ? " and the sparge line to the top of the mash tun" : ""}.` : "");
  return head + (spLine ? "The HLT pump sends hot water over to the top of the mash tun for the sparge. " : "The HLT pump circulates hot water around the hot liquor tank. ")
    + `The wort pump moves wort from the mash tun down and across to the boil kettle, past the HERMS coil. The valves are set by hand and CraftBeerPi can't see them: they are shown as step ${ro + 1}, ${RECIPE.steps[ro].n}, needs them.`;
}
/* change: the valve is drawn where it is now and marked, in Prompt Amber, with where it has to go (a SpargeStep's prompt).
   The HLT return's run is too short for SET CLOSED, so that tag moves left of the riser, level with its valve */
function setValve(id, open, flowing, change) {
  const g = $("#vl-" + id), t = $("#vt-" + id);
  if (!g) return;
  g.classList.toggle("shut", !open);
  g.classList.toggle("live", open && flowing);
  g.classList.toggle("set", !!change);
  t.classList.toggle("set", !!change);
  t.textContent = change ? (open ? "SET CLOSED" : "SET OPEN") : open ? "OPEN" : "CLOSED";
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
    $(`#pump-${id} .p-st`).textContent = (live ? "" : "LAST: ") + (p.on ? "RUNNING" : "OFF");
    $(`#pump-${id} .p-ovr`).textContent = ACT[k].override && !p.on ? "UNLESS OVERRIDE SWITCH IS ON" : "";
  });
  /* layout A's drawing has no sparge line: its HLT pump always goes back round the hot liquor tank. A SpargeStep keeps
     the valves on recirculating until "Sparge started" (or its countdown): the HLT is still heating the water, and the
     wort pump is off. While its "Sparge started" question waits, the valves to change are marked */
  const ro = runoffStep(), r = st.recipe, held = ro >= 0 && RECIPE.steps[ro].type === "SpargeStep" && r.cur === ro && !r.started;
  const setNow = held && r.wait === WFY && live, hasSp = !!$("#ln-sparge");
  const out = ro >= 0 && !held, sp = out && hasSp;
  const wp = live && a.wortPump.on, hp = live && a.hltPump.on;
  on("#ln-wort-in", wp); on("#ln-wort-out", wp); on("#ln-wort-coil", wp && !out); on("#ln-xfer", wp && out); on("#coil", wp && !out);
  on("#ln-hlt-in", hp); on("#ln-hlt-up", hp); on("#ln-hlt-ret", hp && !sp); on("#ln-sparge", hp && sp);
  setValve("coil", !out, wp, setNow); setValve("bk", out, wp, setNow); setValve("ret", !sp, hp, setNow && hasSp); setValve("sp", sp, hp, setNow);
  const vn = $("#vnote-2");
  vn.textContent = setNow ? `SET THEM FOR STEP ${ro + 1} (${RECIPE.steps[ro].n.toUpperCase()})` : out ? `SHOWN FOR STEP ${ro + 1} (${RECIPE.steps[ro].n.toUpperCase()})` : "SHOWN FOR RECIRCULATING";
  vn.classList.toggle("set", setNow);
  $("#rig-d").textContent = rigDesc(ro, held, setNow);
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
  if (TIMERS === "new" && st.banner && st.banner.timer != null) st.banner.more = st.tmrs.filter(t => t.state === "done").length - 1;
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
  /* while a timer's editor is open, the one-screen layout gives it the step list's room (by hand, the recipe book's) */
  $("#recipe").toggleAttribute("data-tedit", TIMERS === "new" && !!st.tedit);
  $("#now").innerHTML = nowHTML();
  if (TIMERS === "new") {
    /* a timer that has run out and not been answered: its row, the title bar and a frame round the whole screen pulse
       together, on every screen. CraftBeerPi's other alerts beep twice once as they arrive, with SOUND on */
    $("#app").toggleAttribute("data-ring", st.tmrs.some(t => t.state === "done"));
    bn.toggleAttribute("data-ring", !!(st.banner && st.banner.timer != null));
    if (st.banner && st.banner !== lastBanner && st.banner.timer == null) ring(2);
    lastBanner = st.banner;
    keepStepInView();
  }
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
  if (pl) note(pl.id.slice(3), why); else if (el.closest(".tmrs")) note("t", why); else if (el.closest(".recipe")) note("r", why); else toast(why);
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
function setActor(id, on) { const a = st.a[id]; a.on = on; a.failed = null; a.paused = false; if (id === "bkEl") endPause(); if (ACT[id].kind === "heat") a.pct = on ? (a.lvl ?? 100) : 0; }
function cmdAct(id) {
  const a = st.a[id], want = a.failed ? a.failed === "on" : !a.on;
  send("a:" + id, want ? "on" : "off", actLabel(id, want), () => {
    setActor(id, want);
    if (st.banner && st.banner.cmd === "act:" + id) st.banner = null;
  }, !want && ACT[id].override ? "its override switch can still run it" : "");
}
/* switching a kettle's logic off also switches its actors off (PID_HERMS on_stop: heater and pump). AUTO with no target
   (unset, 0 or below) runs but holds nothing: PID_HERMS still runs its pump, but asks the HLT for nothing, and PIDBoil
   leaves the element off. The mockup doesn't invent a target for it; CraftBeerPi warns after 5 s (the 1 s tick). */
function setMode(v, m) {
  const V = st.v[v], a = st.a;
  V.mode = m;
  V.noTgt = 0; V.warned = false;
  if (m === "manual" && st.banner && st.banner.notgt === v) st.banner = null;
  if (v === "mt") {
    if (m === "auto" && V.sv == null) { st.v.hlt.mode = "manual"; st.v.hlt.sv = null; a.hltEl.on = false; a.hltEl.pct = 0; a.wortPump.on = true; }
    else if (m === "auto") { st.v.hlt.mode = "manual"; st.v.hlt.sv = +(V.sv + HERMS_DELTA).toFixed(1); a.hltEl.on = true; a.hltEl.pct = 62; a.wortPump.on = true; }
    else { a.hltEl.on = false; a.hltEl.pct = 0; a.wortPump.on = false; st.v.hlt.sv = st.v.hlt.own; }
  } else if (v === "hlt") {
    if (m === "auto" && V.sv == null) V.sv = V.own;
    a.hltEl.on = m === "auto" && V.sv != null; a.hltEl.pct = a.hltEl.on ? (V.sv - V.pv > 2 ? 100 : 40) : 0;
  } else {
    if (m === "auto" && V.sv == null) V.sv = BK === "power" ? boilFrom() : 210.2;
    endPause();
    /* BoilPower latches the boil as it starts if the wort is already at the threshold, and lets go when AUTO stops */
    const ho = bkHoldT();
    V.latched = m === "auto" && ho == null && V.pv >= boilFrom();
    if (m === "auto" && ho != null) { const p = holdOut(ho, V.pv, false); a.bkEl.on = p > 0; a.bkEl.pct = p; }
    else { a.bkEl.on = m === "auto"; a.bkEl.pct = m === "auto" ? (V.latched ? V.bp : 100) : 0; }
    /* today's power editor edits the setting its button named when it opened; if a step or ALL OFF changes the mode,
       that setting is no longer the one in use, so the editor closes without sending anything. (In the redesigns the
       button always sets the boil power, so a mode change leaves the editor open.) */
    if (BK === "today" && st.edit && st.edit.kind === "pwr" && st.edit.what !== (m === "auto" ? "boil" : "hand")) {
      st.edit = null;
      note("bk", `The boil kettle switched to ${m.toUpperCase()}, so the button now sets ${m === "auto" ? "the boil power" : "the element's power by hand"}. Nothing was changed.`);
    }
  }
  ["hltEl", "wortPump", "bkEl"].forEach(id => { a[id].failed = null; });
}
function cmdMode(v, m) { send("m:" + v, m, `${VNAME[v]} ${m.toUpperCase()}`, () => setMode(v, m)); }
/* every target box, and the proposed boil kettle's other boxes, start with their number selected, so typing replaces it
   ("BOIL" included): typing 150 into 168.0 used to give 150168.0 (Brett, 10 Nov) */
const focusTin = sel => setTimeout(() => { const i = $("#tin"); if (!i) return; i.focus(); if (sel) i.select(); }, 0);
function cmdTgtOpen(v) {
  const V = st.v[v], pw = v === "bk" && BK === "power";
  st.edit = {v, kind: "tgt", val: pw ? bkHoldT() ?? boilFrom() : bkNew(v) ? boilFrom() : V.sv ?? (v === "bk" ? 210.2 : v === "mt" ? 149.0 : V.own ?? 168.0)};
  renderAll(); focusTin(true);
}
/* the proposed boil kettle's BOIL AT, in the power box: the boil point, Boil_Threshold (set_boil_at) */
function cmdBatOpen() { st.edit = {v: "bk", kind: "bat", val: boilFrom()}; renderAll(); focusTin(true); }
function cmdTgtStep(d) {
  const e = st.edit;
  /* the proposed boil kettle's target: BOIL sits just above the highest hold, so − from BOIL gives 206.5 or 205.6 */
  if (e.v === "bk" && BK === "power" && e.kind === "tgt") {
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
  if (v === "bk" && BK === "power") return cmdBkTgtSet(val);
  /* the words design's BOIL AT: above the boiling point the wort may never get there, and BoilPower would stay at full power */
  if (bkNew(v) && !(val >= 190 && val <= 212)) {
    note(v, val > 212 ? "Above 212 °F the wort may never count as boiling, and the element would stay at full power. Enter 212 °F or less." : "Enter a boil temperature from 190 to 212 °F.");
    return;
  }
  if (!(val >= 32 && val <= 230)) { note(v, "Enter a target between 32 and 230 °F."); return; }
  st.edit = null; st.notes[v] = "";
  send("t:" + v, "set", bkNew(v) ? `Boil kettle boils from ${val.toFixed(1)} °F` : `${VNAME[v]} target ${val.toFixed(1)} °F`, () => {
    const had = !noTarget(v);
    st.v[v].sv = val;
    if (v === "hlt") st.v.hlt.own = val;
    if (v === "mt" && st.v.mt.mode === "auto") st.v.hlt.sv = +(val + HERMS_DELTA).toFixed(1);
    const V = st.v.bk, el = st.a.bkEl;
    if (bkNew(v)) V.latched = V.mode === "auto" && bkHoldT() == null && V.pv >= val;
    if (bkNew(v) && V.mode === "auto" && !bkHolding()) el.pct = V.pv >= val ? V.bp : 100;
    /* a target for an AUTO that had none: it starts heating if it is below it, and CraftBeerPi takes its warning down */
    if (!had) {
      const H = st.v.hlt, he = st.a.hltEl;
      if (v === "mt") { he.on = H.sv > H.pv; he.pct = he.on ? (H.sv - H.pv > 5 ? 100 : 62) : 0; }
      if (v === "hlt") { he.on = val > H.pv; he.pct = he.on ? (val - H.pv > 2 ? 100 : 40) : 0; }
    }
    st.v[v].noTgt = 0; st.v[v].warned = false;
    if (st.banner && st.banner.notgt === v) st.banner = null;
  });
}
/* the proposed boil kettle's TARGET (Brett's new BoilPower): SET BOIL sends the boil point as the target, and anything from
   the boil point less 3.6 °F up counts as BOIL; a lower temperature is held, as on the HLT. A hold set during the Boil
   step is honoured and the step's timer carries on, so the event says so. Pause wins: a paused element stays off */
function cmdBkTgtSet(val) {
  const V = st.v.bk, el = st.a.bkEl, B = boilFrom(), boil = val >= bkLetGo();
  if (!boil && !(val >= 32)) { note("bk", `Enter a target from 32 to ${+(bkLetGo() - 0.1).toFixed(1)} °F, or press BOIL.`); return; }
  const T = boil ? B : val, r = st.recipe, auto = V.mode === "auto";
  st.edit = null; st.notes.bk = "";
  if (V.sv === T) { renderAll(); return; }
  const inBoil = r && r.state === "running" && RECIPE.steps[r.cur].boil;
  const cav = [!boil && auto && inBoil ? "it holds instead of boiling; the Boil step's timer carries on" : "", auto && el.paused ? "the heat stays paused" : ""].filter(Boolean).join("; ");
  send("t:bk", "set", `Boil kettle target ${boil ? "BOIL" : T.toFixed(1) + " °F"}`, () => { V.sv = T; bkRetarget(); }, cav);
}
/* BOIL AT: where full power gives way to the boil power (190-212 °F; above 212 °F the wort may never get there). A target
   at BOIL moves with it, so raising the boil point never turns BOIL into a hold (asked of Brett's server change) */
function cmdBatSet(val) {
  if (!(val >= 190 && val <= 212)) {
    note("bk", val > 212 ? "Above 212 °F the wort may never count as boiling, and the element would stay at full power. Enter 212 °F or less." : "Enter a boil temperature from 190 to 212 °F.");
    return;
  }
  const V = st.v.bk, el = st.a.bkEl, was = boilFrom(), ho = bkHoldT();
  st.edit = null; st.notes.bk = "";
  if (val === was) { renderAll(); return; }
  send("t:bk", "set", `Boil kettle boils at ${val.toFixed(1)} °F (was ${was.toFixed(1)} °F)`, () => {
    V.boilAt = val;
    if (ho != null) return;
    V.sv = val;
    if (V.mode !== "auto") return;
    V.latched = V.pv >= val || (!!V.latched && (V.keep === false || V.pv >= val - BOIL_MARGIN));
    if (!el.paused) { el.on = true; el.pct = V.latched ? V.bp : 100; }
  }, ho != null ? `not used while it holds ${+ho.toFixed(1)} °F` : "");
}
/* set_boil_power: kept in the kettle's Boil_Power setting, so it can be set at any time, also during a recipe; AUTO uses it
   at its next control decision (every 2 s) once the kettle is at or above the boil threshold. In MANUAL today's button
   sets the element's own level instead (set_power), which it runs at when it is on by hand; the redesigns' button
   always sets the boil power. */
function cmdPwrOpen() {
  const boil = BK !== "today" || st.v.bk.mode === "auto";
  st.edit = {v: "bk", kind: "pwr", what: boil ? "boil" : "hand", val: boil ? st.v.bk.bp : st.a.bkEl.lvl};
  renderAll(); focusTin(BK === "power");
}
function cmdPwrStep(d) { st.edit.val = Math.min(100, Math.max(0, st.edit.val + d)); renderAll(); }
function cmdPwrSet() {
  const {what, val} = st.edit, boil = what === "boil", V = st.v.bk, el = st.a.bkEl, was = boil ? V.bp : el.lvl;
  if (!(Number.isInteger(val) && val >= 0 && val <= 100)) { note("bk", `Enter a ${boil ? "boil power" : "power"} from 0 to 100 %.`); return; }
  st.edit = null; st.notes.bk = "";
  if (val === was) { renderAll(); return; }
  /* when the new level isn't in use yet, the event says when it will be, so an OUT that doesn't move isn't taken for a failure */
  const ho = bkHoldT();
  const cav = BK !== "today" ? (V.mode !== "auto" ? "kept for the boil in AUTO" : bkHolding() ? `not used while it holds ${+ho.toFixed(1)} °F`
      : el.paused ? "used when the heat carries on" : (BK === "power" ? bkLatched() : V.pv >= boilFrom()) ? "" : `used once it boils at ${boilFromText()} °F, full power until then`)
    : boil ? (V.mode === "auto" && V.pv >= boilFrom() ? "" : `used from ${boilFromText()} °F, full power until then`)
    : (el.on ? "" : "used when you switch the element on");
  send("p:bk", "set", boil ? `Boil power ${val} % (was ${was} %)` : `Boil element by hand ${val} % (was ${was} %)`, () => {
    if (boil) { V.bp = val; if (V.mode === "auto" && el.on && bkHoldT() == null && (BK === "power" ? bkLatched() : V.pv >= boilFrom())) el.pct = val; }
    else { el.lvl = val; if (V.mode !== "auto" && el.on) el.pct = val; }
  }, cav);
}
/* the proposed boil kettle's −5 % and +5 %: sent at once, no SET. The same set_boil_power as the editor; a tap that would
   go past 0 or 100 % stops there (2 % − 5 → 0 %), and only at 0 or 100 % itself is the button refused */
function cmdNudge(d) {
  const V = st.v.bk, el = st.a.bkEl, was = V.bp, val = Math.min(100, Math.max(0, was + d));
  if (val === was) return;
  const cav = el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilFromText()} °F, full power until then`;
  send("p:bk", d < 0 ? "down" : "up", `Boil power ${val} % (was ${was} %)`, () => {
    V.bp = val;
    if (V.mode === "auto" && el.on && bkLatched()) el.pct = val;
  }, cav);
}
/* the proposed boil kettle's Keep boiling checkbox: set_keep_boiling, kept in the kettle's Keep_Boiling setting, so it can
   be set in any mode and stays as set. Ticking it while BoilPower holds the boil power more than 3.6 °F below the
   threshold lets go of the boil at once: full power until it boils again. A hold doesn't use it */
function cmdKeep() {
  const V = st.v.bk, el = st.a.bkEl, want = V.keep === false, far = bkLatched() && V.pv < boilFrom() - BOIL_MARGIN, ho = bkHoldT();
  const cav = V.mode !== "auto" ? "kept for the boil in AUTO" : bkHolding() ? `not used while it holds ${+ho.toFixed(1)} °F`
    : el.paused ? "used when the heat carries on"
    : want ? (far ? "full power until it boils" : bkLatched() ? `back to full power if it falls to ${bkLetGo()} °F` : "")
    : bkLatched() ? "the boil power only, even below a boil" : "full power until it boils, then the boil power only";
  send("k:bk", want ? "on" : "off", `Keep boiling ${want ? "on" : "off"}`, () => {
    V.keep = want;
    if (want && far) { V.latched = false; if (el.on) el.pct = 100; }
  }, cav);
}
/* the proposed boil kettle's pause, for a boil-over: the element goes off and AUTO, the recipe and the boil power carry
   on. Brett's BoilPower does it with set_paused(Paused="Yes"), and "No" carries on; it is refused unless AUTO runs.
   Carrying on picks up where AUTO is: the boil power while boiling, full power below the boil, a hold's own power */
function cmdPause(on) {
  const el = st.a.bkEl, V = st.v.bk;
  send("a:bkEl", on ? "pause" : "resume", on ? "BOIL ELEMENT paused" : "BOIL ELEMENT heating again", () => {
    el.failed = null;
    if (on) { el.paused = true; el.pausedAt = st.t; el.on = false; el.pct = 0; return; }
    endPause();
    const ho = bkHoldT(), p = ho != null ? holdOut(ho, V.pv, false) : bkLatched() ? V.bp : 100;
    el.on = p > 0; el.pct = p;
  });
}
/* the proposed boil kettle, after its target changes while AUTO runs: BOIL heats at full power until the boil point, then
   at the boil power; a hold eases in, or rests while the wort is above it. A paused element stays off */
function bkRetarget() {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT();
  if (V.mode !== "auto") return;
  V.latched = ho == null && V.pv >= boilFrom();
  if (el.paused) return;
  const p = ho == null ? (V.latched ? V.bp : 100) : holdOut(ho, V.pv, el.on);
  el.on = p > 0; el.pct = p;
}
/* a recipe step sets its kettle's target. With Brett's new BoilPower the Boil step sets the boil kettle's target to BOIL
   (the boil point), so a hold left from the day before can't stop a boil */
function stepTarget(s) {
  const pw = s.k === "bk" && BK === "power";
  st.v[s.k].sv = pw && s.boil ? boilFrom() : s.temp;
  if (st.v[s.k].mode !== "auto") setMode(s.k, "auto");
  else if (s.k === "mt") st.v.hlt.sv = +(s.temp + HERMS_DELTA).toFixed(1);
  else if (pw) bkRetarget();
}
function stepStart(i) {
  const r = st.recipe, s = RECIPE.steps[i], was = RECIPE.steps[r.cur];
  /* a SpargeStep ending: the HLT's AUTO off, the pumps left as they are. Only its timer running out also puts the HLT's
     target to 0 (SpargeStep.on_timer_done); NEXT STEP leaves it */
  if (was && was.type === "SpargeStep" && i !== r.cur) {
    if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
    if (was.min && r.left === 0) st.v.hlt.sv = null;
    r.started = false;
    if (st.banner && st.banner.sparge) st.banner = null;
  }
  r.cur = i; r.left = (s.min || 0) * 60; r.adds = []; r.wait = false;
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
    r.wait = WFY; st.banner = spargeBanner(s.temp);
    logEvent(`${s.n}: the sparge water is ready at ${s.temp} °F`, "waiting for you", "wait");
    renderAll();
  }, 600));
}
function cmdStart() {
  send("r:start", "start", "Recipe started", () => {
    const r = st.recipe, s = RECIPE.steps[r.cur], fresh = r.state === "ready";
    if (fresh && st.hist) st.hist.steps.push([st.t, r.cur + 1]);
    r.state = "running";
    if (s.type === "SpargeStep") spargeBegin(s);
    else if (s.temp != null) stepTarget(s);
    /* the proposed boil kettle: a recipe started from its first step puts the boil power back to the usual power (a new
       BoilPower setting, see BUILD-NOTES). A change made later that day, before or during the boil, is kept for the boil,
       and doesn't carry over to the next brew day */
    if (BK === "power" && fresh && st.v.bk.usual != null && st.v.bk.bp !== st.v.bk.usual) {
      const was = st.v.bk.bp; st.v.bk.bp = st.v.bk.usual;
      timers.push(setTimeout(() => { logEvent(`Boil power back to your usual ${st.v.bk.usual} % (was ${was} %)`, "by recipe", ""); renderAll(); }, 300));
    }
  });
}
function cmdStop() {
  st.confirmNext = false;
  send("r:stop", "stop", "Recipe stopped", () => {
    const k = RECIPE.steps[st.recipe.cur].k;
    st.recipe.state = "stopped";
    if (st.v[k].mode === "auto") setMode(k, "manual");
    /* a SpargeStep's "Sparge started" question is taken down when the step stops, and asked again when it starts */
    if (st.banner && st.banner.sparge) { st.banner = null; st.recipe.wait = null; }
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
  /* the SpargeStep's "Sparge started": its timer starts (or it runs until NEXT STEP), the HLT's AUTO goes off, and the
     drawing goes over to the runoff */
  else if (x === "sparge") {
    const s = RECIPE.steps[st.recipe.cur];
    send("b", "x", `${s.n}: sparge started, ${s.min ? `${s.min} min timer started` : "until NEXT STEP"}`, () => {
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
/* ---------- timers (?timers=new) ----------
   Scott, 10 Nov 2026, after using the rest timer: "why is it named that? lots of things use a timer during a brew day",
   an optionally audible alarm, a more attention-grabbing but still elegant alert when one runs out, several at once with
   a "+", and names. Up to four, kept by CraftBeerPi on the brewing clock, so every screen shows the same ones (as the
   rest timer is), during a recipe as well as by hand. Modelled on a four-channel kitchen timer (ThermoWorks TimeStack):
   all four in view at once, a finished one pulses and counts up until it is answered, and OK puts it back to its own
   time, ready to start again. SOUND belongs to each screen: its timers and CraftBeerPi's alerts (Scott's choice). */
const TMAX = 4, TPRE = [5, 10, 15, 20, 30, 60];
/* the names to pick come from CraftBeerPi's BREWDAY_TIMER_NAMES setting, sent with the timers as `names` (Scott, 11 Nov
   2026: "an easy config setting to choose the default timer names from the setup", then "multiple choice boxes from
   preconfigured list", "or freeform in addition to mult choice"). TNAMES is its default; TNLEN a name's length;
   TNMAX how many buttons the editor has room for: two rows of three */
const TNAMES = ["Hop stand", "Yeast", "Vorlauf"], TNLEN = 24, TNMAX = 6;
/* the setting as the server reads it: separated by commas, each trimmed and kept to 24 characters, repeats dropped
   (whatever their capitals); blank gives none. The mockup's ?names=… goes through it, to try a list */
function tNames(raw) {
  const out = [];
  for (const part of String(raw).split(",")) {
    const n = part.split(/\s+/).filter(Boolean).join(" ").slice(0, TNLEN).trim();
    if (n && !out.some(o => o.toLowerCase() === n.toLowerCase())) out.push(n);
  }
  return out;
}
const tfmt = s => s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : mmss(s);
const tById = id => st.tmrs.find(t => t.id === id);
const tPct = t => t.run ? Math.round(100 * (1 - t.left / t.run)) : 0;
let lastBanner = null, actx = null;
/* two timers never share a name (whatever its capitals): their alarms, titled with it, would be hard to tell apart */
const tTwin = (name, t) => st.tmrs.find(z => z !== t && z.name.toLowerCase() === name.toLowerCase());
const tTwinWhy = n => `Another timer is already called ${n}. Give this one another name, so you can tell their alarms apart.`;
function tDefaultName() { let n = st.tmrs.length + 1; while (tTwin(`Timer ${n}`)) n++; return `Timer ${n}`; }
/* CraftBeerPi's kept prompt for a timer that has run out: titled with its name, on every screen until answered */
function tBanner(t, list = st.tmrs) {
  return {tone: "prompt", title: t.name, text: `The ${tfmt(t.set)} timer has run out.`, timer: t.id, more: list.filter(x => x.state === "done").length - 1,
    acts: [{label: "+5 MIN", cmd: `tm2:plus5:${t.id}`, dir: "plus5", sec: true}, {label: "OK", cmd: `tm2:ok:${t.id}`, dir: "ok"}]};
}
function timersHTML() {
  const off = st.link === "lost" ? PAUSED : "", T = st.tmrs, e = st.tedit, full = T.length >= TMAX;
  const rows = T.map(t => trowHTML(t, off) + (e && e.id === t.id ? teditHTML(off) : "")).join("");
  /* + TIMER: where a new timer's editor opens; while another timer's editor is open it steps out of the way (one editor
     at a time, and a press would drop that editor's changes) */
  const plus = e && e.id == null ? teditHTML(off) : e ? ""
    : b("cmdbtn tplus", "+ TIMER", full ? "four at most" : T.length ? `up to ${TMAX}` : "counts down on every screen", {cmd: "te:new", why: off || (full ? "Four timers at most. Remove one to add another." : "")});
  return `<section class="tmrs" id="tmrs" aria-labelledby="tmrs-h"${e ? " data-editing" : ""}><div class="thead"><h3 id="tmrs-h">Timers</h3>${soundHTML()}</div>${rows}${plus}<p class="note">${st.notes.t || ""}</p></section>`;
}
function trowHTML(t, off) {
  const p = st.pend["t:" + t.id], why = off || (p ? WAIT : ""), done = t.state === "done", run = t.state === "running", live = run || t.state === "paused";
  const time = done ? "+" + tfmt(st.t - t.at) : tfmt(t.left);
  /* run: this countdown's length (its own time, or the 5 minutes more after it ran out), for "of" and the bar */
  const sub = done ? "TIME'S UP" : run ? `of ${tfmt(t.run)}` : live ? `PAUSED · of ${tfmt(t.run)}` : "ready";
  const said = done ? `${t.name}: time's up, ${tfmt(st.t - t.at)} ago` : `${t.name}: ${tfmt(t.left)}${run ? " left" : live ? " left, paused" : ", ready"}`;
  const btn = done ? b("cmdbtn", p === "plus5" ? "ADDING…" : "+5 MIN", "", {cmd: `tm2:plus5:${t.id}`, why}) + b("cmdbtn tok", p === "ok" ? "SENDING…" : "OK", "stops the alarm", {cmd: `tm2:ok:${t.id}`, why})
    : b("cmdbtn", p ? (p === "start" ? "STARTING…" : "PAUSING…") : run ? "PAUSE" : "START", t.state === "paused" ? "carry on" : "", {cmd: `tm2:go:${t.id}`, why});
  return `<div class="trow${st.tedit && st.tedit.id === t.id ? " editing" : ""}" data-state="${t.state}" id="tr-${t.id}"><button type="button" class="tsel" data-cmd="te:open:${t.id}" aria-expanded="${!!(st.tedit && st.tedit.id === t.id)}" aria-label="${esc(said)}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${sub}</span><span class="tt" id="tt-${t.id}">${time}</span></button><div class="tbtn">${btn}</div>${live ? `<span class="bar"><i id="tb-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
}
/* one editor at a time, in place: under its timer, or where + TIMER was for a new one. A running or paused timer's time
   changes by a minute or five at once, as the boil power's nudges do; a stopped one is set and then saved */
/* the names to pick, under NAME: the names in BREWDAY_TIMER_NAMES as buttons, in Scott's order, three to a row, the first
   six (two rows: the editor then still fits a 1920×950 screen; the setting's description says so). A tap names the
   timer, a second tap clears it; typing any other name still works. A name another timer has is greyed, and a tap says
   why. Nothing is filled in for him: a timer nobody names is "Timer 3", as on the server. The buttons carry their place
   in the list, not the name, so a name with a colon or quote can't break the command */
function namesHTML(e, t) {
  const all = st.names;
  if (!all.length) return `<p class="tnote">No names to pick: BREWDAY_TIMER_NAMES in Settings is blank.</p>`;
  const btns = all.slice(0, TNMAX).map((n, i) => {
    const twin = tTwin(n, t);
    return b("cmdbtn", esc(n.toUpperCase()), "", {cmd: `te:pick:${i}`, pressed: !twin && e.name === n, label: n, why: twin ? tTwinWhy(twin.name) : ""});
  }).join("");
  return `<div class="tsug" role="group" aria-label="Names to pick">${btns}</div>`;
}
function teditHTML(off) {
  const e = st.tedit, t = e.id != null ? tById(e.id) : null, live = !!t && (t.state === "running" || t.state === "paused");
  const pT = st.pend["t:" + (t ? t.id : "new")], why = off || (pT ? WAIT : "");
  if (e.confirm) return `<div class="confirm tconf" role="group" aria-labelledby="tc-t"><p id="tc-t">Remove <b>${esc(t.name)}</b>? It has ${tfmt(t.left)} left.</p><div>${b("yes", pT ? "REMOVING…" : "REMOVE IT", "", {cmd: "te:rm", why})}${b("", "KEEP IT", "", {cmd: "te:keep"})}</div></div>`;
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
/* SOUND: this screen's own setting (kept in the browser, not in CraftBeerPi), for its timers and CraftBeerPi's alerts.
   A browser plays sound only after a tap on the page, so after a reload it says so until the first tap anywhere */
function soundHTML() {
  const s = st.snd, blocked = s.on && !s.ok;
  return `<button type="button" class="keep snd${blocked ? " blocked" : ""}" role="switch" aria-checked="${s.on}" data-cmd="snd"><span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.2 8.4l3 3 6.6-7"/></svg></span><span class="kl">${blocked ? "SOUND · TAP TO ALLOW" : "SOUND"}</span><span class="sr"> for timers and alerts, on this screen${blocked ? ". The browser allows it after the first tap on this page" : ""}</span></button>`;
}
/* the phone's step strip: the timers that are counting, paused or have run out, one tap from their section */
function tmlHTML() {
  if (TIMERS !== "new" || !st.tmrs.some(t => t.state !== "stopped")) return "";
  return `<button type="button" class="tml" data-cmd="tjump"><span class="tl">TIMERS</span><span id="tml-t">${tmlText()}</span></button>`;
}
const tmlText = () => st.tmrs.filter(t => t.state !== "stopped").map(t => t.state === "done" ? `<span class="d">${esc(t.name)} TIME'S UP</span>` : `${esc(t.name)} ${t.state === "paused" ? "paused " : ""}${tfmt(t.left)}`).join(" · ");
function keepStepInView() {
  const l = $("#recipe .steps"), c = l && l.querySelector('[aria-current="step"]');
  if (!c || l.scrollHeight <= l.clientHeight + 1) return;
  const d = c.getBoundingClientRect().top - l.getBoundingClientRect().top;
  if (d < 0 || d + c.offsetHeight > l.clientHeight) l.scrollTop += d - 6;
}
function cmdTe(x, y) {
  const e = st.tedit;
  if (x === "new") { st.tedit = {id: null, name: "", ph: tDefaultName(), set: 10 * 60}; return renderAll(); }
  if (x === "open") { const t = tById(+y); st.tedit = e && e.id === t.id ? null : {id: t.id, name: t.name, ph: t.name, set: t.set}; return renderAll(); }
  if (!e) return;
  if (x === "x") { st.tedit = null; return renderAll(); }
  if (x === "pick") { const n = st.names[+y]; if (n != null) e.name = e.name === n ? "" : n; return renderAll(); }
  if (x === "step") { e.set = Math.min(300, Math.max(1, e.set / 60 + parseInt(y, 10))) * 60; return renderAll(); }
  if (x === "min") { e.set = parseInt(y, 10) * 60; return renderAll(); }
  if (x === "keep") { e.confirm = false; return renderAll(); }
  /* spaces as the server keeps them: trimmed, and one between words */
  const t = e.id != null ? tById(e.id) : null, name = (e.name || "").split(/\s+/).filter(Boolean).join(" ") || e.ph;
  if (x === "rm") {
    if (t.state !== "stopped" && !e.confirm) { e.confirm = true; return renderAll(); }
    return send("t:" + t.id, "rm", `${t.name} removed`, () => { st.tmrs = st.tmrs.filter(z => z !== t); st.tedit = null; });
  }
  /* a typed name another timer has is refused as its greyed button is, before anything is sent */
  const twin = (!t || name !== t.name) && tTwin(name, t);
  if (twin) return note("t", tTwinWhy(twin.name));
  if (x === "done") {
    if (name === t.name) { st.tedit = null; return renderAll(); }
    return send("t:" + t.id, "name", `${t.name} is now ${name}`, () => { t.name = name; st.tedit = null; });
  }
  if (!t) {
    if (st.tmrs.length >= TMAX) return;
    const go = x === "start", set = e.set;
    return send("t:new", x, `${name} added${go ? " and started" : ""}, ${tfmt(set)}`, () => {
      st.tmrs.push({id: Math.max(0, ...st.tmrs.map(z => z.id)) + 1, name, set, left: set, run: set, state: go ? "running" : "stopped"});
      st.tedit = null;
    });
  }
  const said = name !== t.name ? `${t.name} is now ${name}, ${tfmt(e.set)}` : `${t.name} set to ${tfmt(e.set)}`, set = e.set;
  return send("t:" + t.id, "save", said, () => { t.name = name; t.set = t.left = t.run = set; st.tedit = null; });
}
function cmdTm2(x, id, y) {
  const t = tById(+id), key = "t:" + id;
  if (!t) return;
  if (x === "go") {
    if (t.state === "running") return send(key, "pause", `${t.name} paused, ${tfmt(t.left)} to go`, () => { t.state = "paused"; });
    return send(key, "start", `${t.name} started, ${tfmt(t.left)} to go`, () => { if (t.state === "stopped") t.run = t.left; t.state = "running"; });
  }
  if (x === "add") {
    const s = parseInt(y, 10), want = Math.max(10, t.left + s);
    return send(key, "add", `${t.name}: ${s > 0 ? "+" : "−"}${Math.abs(s) / 60} min, ${tfmt(want)} to go`, () => { const was = t.left; t.left = Math.max(10, t.left + s); t.run = Math.max(t.left, t.run + t.left - was); });
  }
  /* answering: OK puts the timer back to its own time, stopped (a kitchen timer's recall); +5 MIN runs it five more */
  const answer = () => { delete t.at; if (st.banner && st.banner.timer === t.id) st.banner = null; };
  if (x === "ok") return send(key, "ok", `${t.name}: alarm answered`, () => { answer(); t.state = "stopped"; t.left = t.run = t.set; });
  if (x === "plus5") return send(key, "plus5", `${t.name}: 5 more minutes`, () => { answer(); t.state = "running"; t.left = t.run = 300; });
}
/* the alarm sound: a piezo-style beep, as a panel controller's buzzer, softened (a sine at 1760 Hz, 120 ms each).
   One sound for now; choosing between presets modelled on real controllers is Scott's later todo */
function audioOK() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    return true;
  } catch (_) { return false; }
}
function ring(n) {
  if (TIMERS !== "new" || !st.snd || !st.snd.on || !st.snd.ok || !actx) return;
  const t0 = actx.currentTime + 0.02;
  for (let i = 0; i < n; i++) {
    const o = actx.createOscillator(), g = actx.createGain(), s = t0 + i * 0.2;
    o.type = "sine"; o.frequency.value = 1760;
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.3, s + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.12);
    o.connect(g).connect(actx.destination); o.start(s); o.stop(s + 0.13);
  }
}
function cmdSnd() {
  const s = st.snd;
  s.on = !s.on;
  if (s.on) { s.ok = audioOK(); ring(2); } // the tap itself lets the page play sound, and two beeps say what it sounds like
  renderAll();
}
document.addEventListener("pointerdown", () => { if (TIMERS === "new" && st && st.snd && st.snd.on && !st.snd.ok && audioOK()) { st.snd.ok = true; renderAll(); } }, true);
/* every brewing second: count the running timers down and the finished ones up; raise a finished one's alarm when the
   title bar is free (behind another prompt it waits its turn); beep every 3 s while any alarm waits */
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
      const o = $("#tt-" + t.id), bar = $("#tb-" + t.id), l = st.tedit && st.tedit.id === t.id && $("#te-left");
      if (o) o.textContent = tfmt(t.left);
      if (bar) bar.style.width = tPct(t) + "%";
      if (l) l.textContent = tfmt(t.left);
    } else if (t.state === "done") { const o = $("#tt-" + t.id); if (o) o.textContent = "+" + tfmt(st.t - t.at); }
  }
  if (!st.banner) { const d = st.tmrs.find(t => t.state === "done"); if (d) { st.banner = tBanner(d); changed = true; } }
  if (changed) renderAll();
  else { const m = $("#tml-t"); if (m) m.innerHTML = tmlText(); }
  if (st.tmrs.some(t => t.state === "done") && st.t % 3 === 0) ring(3);
}
function run(cmd) {
  const [k, x, y] = cmd.split(":");
  switch (k) {
    case "act": return cmdAct(x);
    case "mode": return cmdMode(x, y);
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
      if (x === "start") return cmdStart();
      if (x === "stop") return cmdStop();
      if (x === "next-yes") return cmdNextYes();
      st.confirmNext = x === "next"; return renderAll();
    case "b": return cmdBanner(x);
    case "alloff": return cmdAllOff();
    case "log": st.logOpen = !st.logOpen; return renderAll();
    case "tm": return cmdTimer(x);
    case "te": return cmdTe(x, y);
    case "tm2": { const p = cmd.split(":"); return cmdTm2(p[1], p[2], p[3]); }
    case "snd": return cmdSnd();
    case "tjump": return $("#tmrs")?.scrollIntoView({block: "start"});
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
  /* Enter in a timer box presses the editor's main button: START for a new timer, SET for a stopped one, DONE otherwise */
  if ((e.target.id === "tnm" || e.target.id === "tmin") && e.key === "Enter" && st.tedit) {
    e.preventDefault();
    const go = $(".tedit .tgo"), id = e.target.id;
    if (go) run(go.dataset.cmd);
    /* still open (a name refused, or waiting for CraftBeerPi): the box that was redrawn keeps the caret, at its end */
    const box = $("#" + id);
    if (box && document.activeElement !== box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
    return;
  }
  if (e.key === "Escape" && st.tedit) { st.tedit = null; renderAll(); return; }
  if (e.key === "Escape" && (st.edit || st.logOpen || st.confirmNext)) { st.edit = null; st.logOpen = false; st.confirmNext = false; renderAll(); }
});
document.addEventListener("keyup", e => { if (hold && (e.key === " " || e.key === "Enter")) { e.preventDefault(); holdEnd(true); } });
document.addEventListener("input", e => {
  /* the timer editor's boxes: kept as typed, without redrawing, so the caret stays put */
  if ((e.target.id === "tnm" || e.target.id === "tmin") && st.tedit) {
    if (e.target.id === "tnm") {
      st.tedit.name = e.target.value;
      document.querySelectorAll(".tsug button").forEach((x, i) => x.setAttribute("aria-pressed", String(x.getAttribute("aria-disabled") !== "true" && st.names[i] === e.target.value)));
    } else {
      const m = parseInt(e.target.value, 10);
      if (m >= 1 && m <= 300) st.tedit.set = m * 60;
      document.querySelectorAll(".tpre button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cmd === `te:min:${st.tedit.set / 60}`)));
    }
    return;
  }
  if (e.target.id !== "tin" || !st.edit) return;
  const x = parseFloat(e.target.value), pwr = st.edit.kind === "pwr", ok = $("#tok");
  if (!Number.isFinite(x)) return;
  st.edit.val = pwr ? Math.round(x) : Math.round(x * 10) / 10;
  if (!ok) return;
  /* the proposed boil kettle's TARGET: a typed number from the boil point less 3.6 °F up is BOIL, and SET says so before
     it is pressed; the box keeps what was typed */
  if (st.edit.v === "bk" && BK === "power" && st.edit.kind === "tgt") {
    const boil = st.edit.val >= bkLetGo();
    ok.textContent = boil ? "BOIL" : st.edit.val.toFixed(1) + " °F";
    $(".editor .tboil")?.setAttribute("aria-pressed", String(boil));
  } else ok.textContent = pwr ? String(st.edit.val) : st.edit.val.toFixed(1);
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
  const pz = document.getElementById("pz");
  if (pz && st.a.bkEl.paused) pz.textContent = mmss(Math.max(0, st.t - st.a.bkEl.pausedAt));
  /* CraftBeerPi's warning, 5 s after a kettle's AUTO started with no target (Brett's server change, 10 Nov). The boil
     kettle never gets one: BoilPower puts its boil threshold in as the target as it starts. Under the HERMS the HLT
     isn't in AUTO itself; the mash tun's warning covers it. */
  ["mt", "hlt"].forEach(v => {
    const V = st.v[v];
    if (!noTarget(v)) { V.noTgt = 0; V.warned = false; return; }
    V.noTgt = (V.noTgt || 0) + 1;
    /* raised once, from 5 s on; the mockup shows one prompt at a time, so behind a hop alert it waits its turn */
    if (V.noTgt < 5 || V.warned || st.banner) return;
    V.warned = true;
    st.banner = noTargetBanner(v);
    logEvent(`No target for the ${KNAME[v]}`, "waiting for you", "wait");
    say(`No target for the ${KNAME[v]}. ${st.banner.text}`, true);
    renderAll();
  });
  /* the proposed boil kettle: CraftBeerPi's warning after 2 brewing minutes paused, once per pause (Scott, 10 Nov). Behind
     another prompt it waits its turn, as the no-target warning does */
  const pe = st.a.bkEl;
  if (BK === "power" && pe.paused && !pe.pauseWarned && st.t - pe.pausedAt >= 120 && !st.banner) {
    pe.pauseWarned = true;
    st.banner = pauseBanner();
    logEvent(st.banner.title, "waiting for you", "wait");
    say(`${st.banner.title}. ${st.banner.text}`, true);
    renderAll();
  }
  if (r && r.state === "running" && r.left > 0 && !r.wait) {
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
  if (TIMERS === "new") tmTick();
}, 1000);

/* ---------- scenes ---------- */
function load(name) {
  timers.forEach(clearTimeout); timers = []; holdEnd(false);
  const key = SCENES[name] ? name : "mash";
  st = SCENES[key]();
  /* the #sparge-… moments run a recipe whose step 4 is a SpargeStep; every other moment keeps the MashStep */
  RECIPE.steps[3] = st.sparge4 ? Object.assign({}, SPARGE_STEP, st.sparge4) : SPARGE_MASH;
  /* a moment can open an editor (open) and borrow another moment's graph history (base) */
  const open = st.open, base = st.base || key;
  delete st.open; delete st.base;
  Object.assign(st, {scene: key, pend: {}, notes: {}, edit: null, confirmNext: false, logOpen: false}, open);
  if (st.v.bk.bp == null) st.v.bk.bp = 45; // the boil kettle's Boil_Power setting, read from its props
  if (st.a.bkEl.lvl == null) st.a.bkEl.lvl = 100; // the boil element's own level (its power), used when it is on by hand
  if (st.v.bk.usual === undefined) st.v.bk.usual = 45; // the proposed boil kettle's usual boil power (Usual_Boil_Power); null: none set
  if (st.v.bk.keep == null) st.v.bk.keep = true; // its Keep_Boiling setting, "Yes" unless Scott unticks it
  if (st.v.bk.boilAt == null) st.v.bk.boilAt = BOIL_TH; // the proposed boil kettle's boil point, Boil_Threshold (BOIL AT)
  if (TIMERS === "new") {
    st.tmrs = (st.tmrs || []).map(t => Object.assign({run: t.set}, t));
    if (!st.snd) st.snd = {on: false, ok: true};
    if (st.tedit === undefined) st.tedit = null;
    /* BREWDAY_TIMER_NAMES: its default, or a moment's own list; ?names=… (blank for none) tries another */
    st.names = QS.has("names") ? tNames(QS.get("names")) : st.names || TNAMES.slice();
    lastBanner = st.banner;
  }
  if (GRAPHS) st.hist = gHistory(base);
  applyLocks(); renderAll();
  document.querySelectorAll(".mock a[href^='#']").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + key ? "true" : "false"));
  document.querySelectorAll(".mock a[data-layout]").forEach(a => {
    a.href = `?layout=${a.dataset.layout}#${key}`;
    a.setAttribute("aria-current", a.dataset.layout === LAYOUT ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-bk]").forEach(a => {
    const q = new URLSearchParams(location.search);
    q.set("bk", a.dataset.bk);
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.bk === BK ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-tm]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.tm === "new") q.set("timers", "new"); else q.delete("timers");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.tm === TIMERS ? "true" : "false");
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
/* the boil kettle's faceplate: the redesign Scott approved, built on the screen on 10 Nov (the default, ?bk=power); the
   faceplate from before it, which the screen keeps for an older BoilPower without set_boil_at (?bk=today); or ?bk=words,
   an option he didn't take. boil-kettle.html compares the first two. */
const BK = ["words", "today"].includes(QS.get("bk")) ? QS.get("bk") : "power";
document.documentElement.dataset.bk = BK;
/* the timers: today's one rest timer (the default, as built), or ?timers=new, the proposal for several, named, with sound */
const TIMERS = QS.get("timers") === "new" ? "new" : "today";
document.documentElement.dataset.timers = TIMERS;
/* ?focus=bk (boil-kettle.html): keep that vessel's faceplate in view and tell the page around this one where it is,
   so the page can show just that faceplate */
const FOCUS = QS.get("focus");
function reportFocus() {
  const el = FOCUS && parent !== window && document.getElementById("pl-" + FOCUS);
  if (!el) return;
  let r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) { scrollBy(0, r.top - Math.max(0, (innerHeight - r.height) / 2)); r = el.getBoundingClientRect(); }
  parent.postMessage({type: "plate", x: r.left, y: r.top, w: r.width, h: r.height}, "*");
}
if (FOCUS) {
  new ResizeObserver(() => reportFocus()).observe(document.body);
  new MutationObserver(() => requestAnimationFrame(reportFocus)).observe($("#plates"), {childList: true, subtree: true});
  addEventListener("scroll", () => requestAnimationFrame(reportFocus));
}
window.addEventListener("hashchange", () => load(location.hash.slice(1)));
load(location.hash.slice(1));
new ResizeObserver(drawRig).observe($("#rig"));
