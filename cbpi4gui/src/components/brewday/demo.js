// The brew-day mockup's demo data (design/brewday/brew-day.js, and graphs.js for the graphs' history), unchanged: the
// moments of a brew day it shows, with its proposed boil kettle (?bk=power), which the screen builds. The screen's demo
// mode (?demo=mash, sparge, sparge-heat, sparge-ready, sparge-run, sparge-batch, boil-hold, hop, boilpower, heatup, pause,
// pause-long, boiling, hold, whirlpool, finished, keepboil, letfall, bktarget, handhold, fail, manual, offline, notarget,
// notarget-hlt, timers, timer-done, timer-back, timer-back-done, timer-back-unknown, timer-new, timer-names,
// timer-nonames, timers-hand, sound-allow, byhand, byhand-past, stopped, reset, reset-done, and the pre-brew check's
// prebrew, probes, probes-apart, probes-off, probes-none, checking, check-clock, check-now, check-probe, check-adds,
// check-many, check-noanswer, check-noprobe, check-slow and check-unsure, and the strike water's sw-plan, sw-forecast,
// sw-volume, sw-grain-edit, sw-grain, sw-hot, sw-used, sw-working, sw-working-open, sw-reworking, sw-levers, sw-refused,
// sw-refused-moved, sw-failed, sw-tunprobe, sw-wait, sw-heat, sw-move, sw-late, sw-doughin, sw-hand, sw-novol,
// sw-missing, sw-noprobe and sw-grain-bad) runs on this, so it can be compared with the mockup pixel for pixel.
import { swModel, SW_MORNING, SW_LEVER_S } from "./strike-demo";

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
/* step 4 as recipes in the book have it (a MashStep on the mash tun, whose HERMS runs the wort pump), and as a recipe
   imported on core 4.7.7.post35 or later has it: a SpargeStep on the HLT, which lets the HLT reach mash-out temperature
   before wort goes over to the boil kettle, for a fly or a batch sparge. It heats the sparge water on the HLT's own AUTO
   with the mash tun's AUTO off, switches each pump off for its hose to move (the wort pump as it starts, the HLT pump as
   the water is ready), asks "Sparge started", then leaves both pumps to the brewer. The sparge-… moments and boil-hold
   use it (sparge4: the screen's demo recipe then has it as step 4); every other moment keeps the MashStep. */
const SPARGE_STEP = {n: "Sparge", type: "SpargeStep", temp: 168, min: 40, k: "hlt"};
/* the boil's additions as the demo recipe has them, and a recipe with eight, whose import kept the first six for the boil
   step's reminders (longest first) and named the last two in a warning, amount first: Citra at 5 minutes, Amarillo at
   the end */
const BIG_ADDS = [[60, "Centennial", "1.00 oz"], [30, "Cascade", "1.00 oz"], [20, "Willamette", "2.00 oz"], [15, "Whirlfloc tablet", "1"], [15, "Yeast nutrient", "1 tsp"], [10, "Citra", "1.00 oz"]];
const BIG_MISSED = [["1.50 oz Citra", 5], ["1.00 oz Amarillo", 0]];
const WFY = "WAITING FOR YOU";
const VNAME = {hlt: "Hot liquor tank", mt: "Mash tun", bk: "Boil kettle"};
const KNAME = {hlt: "HLT", mt: "Mash Tun", bk: "Boil Kettle"}; // the kettles' names in CraftBeerPi, which its own messages use
const PROBE = {hlt: "HLT Temp", mt: "Mash Temp", bk: "Boil Temp"}; // the probes' names in CraftBeerPi, as the Hardware page shows them
const VACT = {hlt: ["hltEl", "hltPump"], mt: ["wortPump"], bk: ["bkEl"]};
const ACT = {
  hltEl: {name: "HLT ELEMENT", kind: "heat", v: "hlt"},
  hltPump: {name: "HLT PUMP", kind: "pump", v: "hlt", override: true}, // the rig's Recirc_PUMP: its own override switch can run it, and CraftBeerPi can't see that switch
  wortPump: {name: "WORT PUMP", kind: "pump", v: "mt"},
  bkEl: {name: "BOIL ELEMENT", kind: "heat", v: "bk"}
};
const HERMS_DELTA = 5.4; // PID_HERMS DeltaTemp in the simulator
/* BoilPower, the boil kettle's logic: below its boil point it heats at full power (Max_Output); once the wort reaches it, it
   holds the element at Boil_Power, which the brewer sets with set_boil_power (45 % on the simulators), until the wort falls
   3.6 °F (2 °C) below again. From 0.0.3.post7 the boil point is a setting of its own, Boil_Threshold (BOIL_TH, 210.2 °F on
   the rig; set_boil_at), and the kettle's target is an ordinary target, as on the HLT: within 3.6 °F of the boil
   point or above, or none, means BOIL; a lower one is a temperature to hold. */
const BOIL_TH = 210.2;
const BOOK = [ // the simulator's Recipe Book (config/recipes/*.yaml)
  {n: "Craftbeerpi Test Recipe v5", d: "7 steps · mash 126, 149 and 168 °F · 90 min boil"},
  {n: "Craftbeerpi Test Recipe v4", d: "6 steps · mash 126 and 149 °F · 90 min boil"},
  {n: "Craftbeerpi Test Recipe v3", d: "6 steps · mash 152 °F, mash out 168 °F · 90 min boil"},
  {n: "BrewStart ready-by demo", d: "3 steps · hot strike water by a set time, 152 °F"}
];

/* a question's line and its answer's are CraftBeerPi's words, as the screen logs them (title: message, then "title
   answered: button"). The malt question is an imported recipe's MashIn Notification (upload_controller), and its button
   is MashInStep's Next Step */
const MASH_EVENTS = [
  ["14:31:52", "HLT PUMP started", "confirmed", "ok"],
  ["14:16:19", "Saccharification: 149 °F reached, 40 min timer started", "by recipe", ""],
  ["14:09:40", "Saccharification started, mash tun target 149.0 °F", "by recipe", ""],
  ["14:09:38", "Protein Rest finished", "by recipe", ""],
  ["13:27:05", "MashIn answered: Next Step", "confirmed", "ok"],
  ["13:26:58", "MashIn: Target temperature reached. Please add malt.", "answered", ""]
];
/* a boil step's start, as the screen logs any step's start (stepStartLine): its kettle's target. With the proposed boil
   kettle, which the demo runs, a target at or above where BOIL starts is BOIL, as TARGET's editor and the window say ("Boil
   kettle target BOIL"). `from` is the boil point, so a moment can call it before the screen has state (the mockup's
   boilStartLine, with ?bk=power) */
const boilStartLine = (s, from = BOIL_TH) => `${s.n} started, boil kettle target ${s.temp >= +(from - 3.6).toFixed(1) ? "BOIL" : `${s.temp.toFixed(1)} °F`}`;
/* the #hop day from the end of the sparge (the MashStep) to the boil's start, newest first, in the order the screen logs it:
   a step's line first, then what CraftBeerPi says because of it. The sparge ending switched the HLT pump off, and the boil
   waited for the brewer, who started it with START THE BOIL. The wort pump was already off, so the boil's start had no
   pump to switch off */
const boilDay = () => [
  ["15:01:47", boilStartLine(RECIPE.steps[4]), "by recipe", ""],
  ["15:01:45", "Boil answered: Start the boil", "confirmed", "ok"],
  ["14:58:30", `Boil: ${boilHoldBanner(RECIPE.steps[4]).text}`, "answered", ""],
  ["14:58:30", "HLT pump: Sparge has ended, so the HLT pump is off.", "from CraftBeerPi", ""],
  ["14:58:30", "Sparge finished", "by recipe", ""]
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
    /* BoilStep's hop alert, in its words: "Hop Alert", "Please add <hop> (<n>)", one button, Added */
    banner: {tone: "prompt", title: "Hop Alert", text: "Please add 3.00 oz Centennial (1)", act: "ADDED", cmd: "b:added"},
    v: {hlt: {pv: 165.3, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 151.2, sv: null, mode: "manual"}, bk: {pv: 210.6, sv: 210.2, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 45}},
    fill: {mtLiq: false, bk: true},
    recipe: {state: "running", cur: 4, left: 59 * 60 + 58, adds: ["due"]},
    events: [
      ["16:00:02", "Hop Alert: Please add 3.00 oz Centennial (1)", "waiting for you", "wait"],
      ["15:30:04", "Boil: 210.2 °F reached, 90 min timer started", "by recipe", ""],
      ...boilDay()
    ]
  }),
  /* boil power mid-recipe: the boil element's power can be changed even while a recipe runs.
     step 5, the Boil, runs the boil kettle's AUTO; the hop is in, and the brewer turns the boil down from 45 to 40 % */
  boilpower: () => {
    const s = SCENES.hop();
    s.t = 16 * 3600 + 4 * 60 + 12; s.banner = null;
    s.recipe.left = 55 * 60 + 48; s.recipe.adds = ["done"];
    s.events[0][2] = "answered"; s.events[0][3] = "";
    s.events.unshift(["16:00:31", "Hop Alert answered: Added", "confirmed", "ok"]);
    return Object.assign(s, {base: "hop", open: {edit: {v: "bk", kind: "pwr", what: "boil", val: 40}}});
  },
  /* the boil kettle's three phases in AUTO.
     Heating up: the Boil step has started and BoilPower runs at full power until 210.2 °F; the step's 90 min timer waits
     for that. Same day and history as #hop, 18 minutes before it boils. A recipe started from its first step went back
     to the usual boil power, here after a brew day that ended at 35 % (in LOG). */
  heatup: () => Object.assign(SCENES.hop(), {
    t: 15 * 3600 + 12 * 60, banner: null, base: "hop",
    v: {hlt: {pv: 171.1, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 158.1, sv: null, mode: "manual"}, bk: {pv: 170.8, sv: 210.2, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 100}},
    recipe: {state: "running", cur: 4, left: 90 * 60, adds: [], wait: "HEATING"},
    events: [
      ...boilDay(),
      ["10:02:16", "Boil power back to your usual 45 % (was 35 %)", "by recipe", ""]
    ]
  }),
  /* boiling hard: the simulator boils at 212 °F, so PV sits above the 210.2 °F boil point, over SV. BoilPower holds the
     element at the boil power. */
  boiling: () => Object.assign(SCENES.hop(), {
    t: 15 * 3600 + 52 * 60 + 40, banner: null,
    v: {hlt: {pv: 165.6, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 151.4, sv: null, mode: "manual"}, bk: {pv: 212.0, sv: 210.2, mode: "auto"}},
    recipe: {state: "running", cur: 4, left: 67 * 60 + 24, adds: []},
    events: [
      ["15:30:04", "Boil: 210.2 °F reached, 90 min timer started", "by recipe", ""],
      ...boilDay()
    ]
  }),
  /* a boil-over: 76 s into the boil the hot break foams up, and the brewer taps the element button at 15:30:55: the heat pauses */
  pause: () => {
    const s = SCENES.boiling();
    s.t = 15 * 3600 + 31 * 60 + 20;
    s.v.bk.pv = 210.4;
    s.recipe.left = 88 * 60 + 44;
    s.events = s.events.filter(e => e[0] <= "15:30:04");
    s.a.bkEl = {on: false, pct: 0, paused: true, pausedAt: 15 * 3600 + 30 * 60 + 55};
    s.events.unshift(["15:30:55", "BOIL ELEMENT paused", "confirmed", "ok"]);
    return s;
  },
  /* the whirlpool hold: the stand cooled to 166.3 °F, the brewer answered "Heat and hold?", and the step set the kettle's
     target to 170 °F, which BoilPower holds. The boil power isn't used: from 0.0.3.post8 a PID holds it. On the
     simulators' kettle, as the plugin's own test models it, it climbs slowly so as not to pass 170 °F: 52 % at once,
     59 % a minute on as the integral builds, then easing as the brake on the rise comes in. At 17:18:40, 4 minutes in,
     the wort is at 168.4 °F with the element at 37 %; it reaches 170 °F at about 17:25:30 and holds it at 26 %. */
  hold: () => Object.assign(SCENES.hop(), {
    t: 17 * 3600 + 18 * 60 + 40, banner: null,
    v: {hlt: {pv: 156.8, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 139.6, sv: null, mode: "manual"}, bk: {pv: 168.4, sv: 170.0, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 37}},
    recipe: {state: "running", cur: 6, left: 9 * 60 + 30, adds: []},
    /* as the screen logs them: read from the core, screen.js's observe() and BoilPower. The Boil's "Boiling completed" is
       one of the routine notices the screen leaves out; Whirlpool Hop, a NotificationStep, asks a moment after it starts
       and moves on when NEXT STEP answers it; the stand asks in CraftBeerPi's own words; and BoilPower 0.0.3.post8 says
       what it does as it starts to hold */
    events: [
      ["17:14:32", `${KNAME.bk}: Holding 170.0, its target, instead of boiling: a PID sets the element's power, up to 100%. To boil, set its target to 206.6 or above.`, "from CraftBeerPi", ""],
      ["17:14:31", "Whirlpool answered: Heat and hold", "confirmed", "ok"],
      ["17:14:20", `Whirlpool: The wort in ${KNAME.bk} has cooled to 166.3 °F, below the 170 °F whirlpool, with 14 minutes of the stand left. Heat it back to 170 °F and hold it there until the stand ends?`, "answered", ""],
      ["17:08:10", "Whirlpool started, 20 min", "by recipe", ""],
      ["17:08:10", "Whirlpool Hop finished", "by recipe", ""],
      ["17:08:10", "Whirlpool Hop answered: Next Step", "confirmed", "ok"],
      ["17:00:06", `Whirlpool Hop: ${RECIPE.steps[5].note}`, "answered", ""],
      ["17:00:04", "Whirlpool Hop started", "by recipe", ""],
      ["17:00:04", "Boil finished", "by recipe", ""]
    ]
  }),
  /* the same whirlpool hold with the wort pump running, for a whirlpool. From the boil's start the drawing has the pump at
     the boil kettle, on a short loop through the chiller, not through the HERMS coil; lit here */
  whirlpool: () => {
    const s = SCENES.hold();
    s.a.wortPump = {on: true};
    s.events.splice(s.events.findIndex(e => e[0] < "17:08:16"), 0, ["17:08:16", "WORT PUMP started", "confirmed", "ok"]);
    return Object.assign(s, {base: "hold"});
  },
  /* the recipe has finished, and the brewer chills the wort. The #whirlpool day: the stand ended at 17:28:10 and switched the
     boil kettle off, and the wort pump runs on through the chiller. CraftBeerPi keeps the recipe's steps, all done, so the
     pump stays drawn at the boil kettle until a recipe is loaded or reset, or the mash tun's AUTO is on.
     The drawing can't show the wort going on to the fermenter */
  finished: () => {
    const s = SCENES.whirlpool();
    /* the stand's notice comes first: CraftBeerPi sends it as the stand stops, before it marks the step done, and the
       screen logs CraftBeerPi's notices before the steps' changes in each update. Brewing Complete was answered here, so
       its question's line says so */
    s.events.unshift(
      ["17:28:52", "Brewing Complete answered: OK", "confirmed", "ok"],
      ["17:28:10", "Brewing Complete: Now the yeast will take over", "answered", ""],
      ["17:28:10", "Recipe finished", "by recipe", "ok"],
      ["17:28:10", "Whirlpool finished", "by recipe", ""],
      ["17:28:10", `Whirlpool: Stand over: ${KNAME.bk} is off and no longer holding 170 °F.`, "from CraftBeerPi", ""]);
    /* the boil kettle's target is 0 again, as the stand found it: the Boil step leaves it at 0 as it ends */
    return Object.assign(s, {
      t: 17 * 3600 + 41 * 60 + 30, base: "finished",
      v: {hlt: {pv: 154.9, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 137.2, sv: null, mode: "manual"}, bk: {pv: 88.4, sv: null, mode: "manual"}},
      a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
      recipe: null, finished: true,
      timer: {left: 60 * 60, running: false}
    });
  },
  /* the boil power at 2 %: the kettle can't hold a boil, so BoilPower lets go 3.6 °F below its boil point and heats at
     full power until it boils again, cycling between about 206 and 211 °F. keepboil: KEEP BOILING ticked, 3¾ min into a
     fall at 2 %, its line saying what comes next. letfall: unticked at 16:10:21, so BoilPower stays at 2 % and the wort
     falls below a boil. Both: the #hop day at 16:31:10. */
  keepboil: () => {
    const s = SCENES.hop();
    s.t = 16 * 3600 + 31 * 60 + 10; s.banner = null;
    s.v.hlt.pv = 162.4; s.v.mt.pv = 146.9;
    Object.assign(s.v.bk, {pv: 207.9, bp: 2, latched: true});
    s.a.bkEl = {on: true, pct: 2};
    s.recipe.left = 28 * 60 + 54; s.recipe.adds = ["done"];
    s.events[0][2] = "answered"; s.events[0][3] = "";
    s.events.unshift(["16:10:00", "Boil power 2 % (was 45 %)", "confirmed", "ok"], ["16:00:31", "Hop Alert answered: Added", "confirmed", "ok"]);
    return s;
  },
  letfall: () => {
    const s = SCENES.keepboil();
    Object.assign(s.v.bk, {pv: 199.3, keep: false});
    s.events.unshift(["16:10:21", "Keep boiling off", "confirmed", "ok", "the boil power only, even below a boil"]);
    return s;
  },
  /* a forgotten pause: the #pause boil-over, 2 min 15 s on. After 2 brewing minutes paused, BoilPower raises a kept warning
     on every page, once per pause, taken down when the heat carries on or AUTO stops. The boil's timer has carried on all
     along. */
  "pause-long": () => {
    const s = SCENES.pause();
    s.t = 15 * 3600 + 33 * 60 + 10;
    s.recipe.left = 86 * 60 + 54;
    s.v.bk.pv = 206.3;
    s.a.bkEl.pauseWarned = true;
    s.banner = pauseBanner();
    s.events.unshift(["15:32:55", pauseBanner().title, "waiting for you", "wait"]);
    return Object.assign(s, {base: "pause-long"});
  },
  /* a hop stand by hand, with no recipe: the boil kettle's target set to 170 °F, like the HLT's, and it holds there. The
     brewer boiled by hand in AUTO from 10:21 and set the target to 170 °F at 12:41:10 with AUTO still on: the element
     went off, and the wort is cooling towards 170 °F, where it will hold. */
  handhold: () => Object.assign(mash(), {
    t: 12 * 3600 + 58 * 60 + 40, banner: null,
    v: {hlt: {pv: 148.3, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 131.0, sv: null, mode: "manual"}, bk: {pv: 188.4, sv: 170.0, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: false, bk: true},
    recipe: null,
    timer: {left: 30 * 60, running: false},
    events: [
      ["12:41:10", "Boil kettle target 170.0 °F", "confirmed", "ok"],
      ["10:21:40", "Boil kettle AUTO", "confirmed", "ok"],
      ["10:21:31", "Boil kettle target BOIL", "confirmed", "ok"]
    ]
  }),
  /* the same day at 12:41:02, setting that hold: TARGET's box is open with 170.0 typed */
  bktarget: () => {
    const s = SCENES.handhold();
    s.t = 12 * 3600 + 41 * 60 + 2;
    s.v.hlt.pv = 152.0; s.v.mt.pv = 133.9;
    s.v.bk = {pv: 212.0, sv: 210.2, mode: "auto", latched: true};
    s.a.bkEl = {on: true, pct: 45};
    s.events = s.events.slice(1);
    return Object.assign(s, {base: "handhold", open: {edit: {v: "bk", kind: "tgt", val: 170.0}}});
  },
  /* fly sparge: the HLT pump sends sparge water to the top of the mash tun while the wort pump runs
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
     step's 40 min wait for "Sparge started"; the drawing marks the four valves to change. As it asked, CraftBeerPi
     switched the HLT pump off for its hose to move, so both pumps are off, and the prompt says so */
  "sparge-ready": () => {
    const s = SCENES["sparge-heat"]();
    s.t = 15 * 3600 + 4 * 60 + 40;
    s.v.hlt.pv = 168.2; s.v.mt.pv = 147.9;
    s.a.hltEl = {on: true, pct: 36};
    s.a.hltPump = {on: false};
    s.recipe.wait = WFY;
    s.banner = spargeBanner(168, s.a);
    s.events.unshift(["15:04:10", `${s.banner.title}: ${s.banner.text}`, "waiting for you", "wait"]);
    return s;
  },
  /* 15:12:40, a fly sparge: the brewer set the hoses, started both pumps and pressed Sparge started at 15:05:02. That
     switched the HLT's AUTO off (the element stays off from here) and started the 40 min. Both pumps run: the
     HLT pump over to the top of the mash tun, the wort pump down to the boil kettle */
  "sparge-run": () => {
    const s = SCENES["sparge-heat"]();
    s.t = 15 * 3600 + 12 * 60 + 40;
    s.v.hlt = {pv: 166.9, sv: 168.0, own: 168.0, mode: "manual"};
    s.v.mt.pv = 151.6; s.v.bk.pv = 146.8;
    s.a = {hltEl: {on: false, pct: 0}, hltPump: {on: true}, wortPump: {on: true}, bkEl: {on: false, pct: 0}};
    s.fill = {mtLiq: true, bk: true};
    Object.assign(s.recipe, {wait: null, started: true, left: 32 * 60 + 22});
    /* CraftBeerPi's words after the press (SpargeStep._start_sparge): the HLT's AUTO off, as the step heated the water,
       and the timer's end on the brewing clock */
    s.events.unshift(
      ["15:05:02", "Sparge: The HLT's AUTO is off now, so its element won't run as the HLT empties. Sparge timer started. Estimated completion: 15:45", "from CraftBeerPi", ""],
      ["15:05:02", "Sparge: sparge started, 40 min timer started", "confirmed", "ok"],
      ["15:04:58", "WORT PUMP started", "confirmed", "ok"],
      ["15:04:55", "HLT PUMP started", "confirmed", "ok"],
      ["15:04:10", SPARGE_ASKED, "answered", ""]);
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
      ["15:05:02", "Sparge: The HLT's AUTO is off now, so its element won't run as the HLT empties.", "from CraftBeerPi", ""],
      ["15:05:02", "Sparge: sparge started, until NEXT STEP", "confirmed", "ok"],
      ["15:04:58", "WORT PUMP started", "confirmed", "ok"],
      ["15:04:10", SPARGE_ASKED, "answered", ""],
      ["14:56:21", "Sparge: heating the sparge water to 168 °F, mash tun MANUAL", "by recipe", ""]
    ];
    return s;
  },
  /* 15:53:12, after the fly sparge (#sparge-run). Its 40 min ran out at 15:45:02. CraftBeerPi switched the HLT pump off
     and left the wort pump draining the mash tun into the boil kettle, and holds before the boil
     (CONFIRM_BEFORE_BOIL, as on the rig): nothing heats until the brewer starts it. Its question is CraftBeerPi's longest,
     and the screen writes it in the event line word for word. START THE BOIL puts heat on, so it takes a held press, as
     START does; NEXT STEP is greyed (CraftBeerPi would take it as "start the boil") */
  "boil-hold": () => {
    const s = SCENES["sparge-run"](), q = boilHoldBanner(RECIPE.steps[4]);
    s.t = 15 * 3600 + 53 * 60 + 12;
    s.v = {hlt: {pv: 164.4, sv: null, own: 168.0, mode: "manual"}, mt: {pv: 166.9, sv: 149.0, mode: "manual"}, bk: {pv: 151.3, sv: null, mode: "manual"}};
    s.a = {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: true}, bkEl: {on: false, pct: 0}};
    s.recipe = {state: "ready", cur: 4, left: 90 * 60, adds: [], held: true, wait: WFY};
    s.banner = q;
    s.events.unshift(
      ["15:45:02", `${q.title}: ${q.text}`, "waiting for you", "wait"],
      ["15:45:02", "HLT pump: Sparge has ended, so the HLT pump is off. The wort pump is still running, to finish draining the mash tun.", "from CraftBeerPi", ""],
      ["15:45:02", "Sparge finished", "by recipe", ""]);
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
  /* the timers. #timers: the #mash day, with Stir counting
     down (started 14:24:43) and Yeast set up for later; SOUND on */
  timers: () => Object.assign(mash(), {
    tmrs: [{id: 1, name: "Stir", set: 15 * 60, left: 7 * 60 + 12, state: "running"}, {id: 2, name: "Yeast", set: 20 * 60, left: 20 * 60, state: "stopped"}],
    snd: {on: true, ok: true},
    events: [["14:24:43", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())]
  }),
  /* Stir started at 14:17:19 and ran out at 14:32:19, 12 s ago: its row, the title bar and the screen's edge pulse, and
     it counts up */
  "timer-done": () => {
    const s = SCENES.timers(), t = s.tmrs[0];
    Object.assign(t, {state: "done", left: 0, at: s.t - 12});
    s.banner = tBanner(t, s.tmrs);
    s.events = [["14:32:19", "Stir finished", "waiting for you", "wait"], ["14:17:19", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())];
    return s;
  },
  /* CraftBeerPi off for 12 minutes, a power cut from 14:20:31 to 14:32:31. Stir had been counting down since 14:12:43,
     with 7:12 left at the cut, so it comes back paused there, and a line across its row says how long CraftBeerPi was
     off until it is started; Yeast, set up for later, is as it was */
  "timer-back": () => {
    const s = SCENES.timers(), t = s.tmrs[0];
    Object.assign(t, {state: "paused", run: 15 * 60, interrupted: true, off: 12 * 60});
    s.events = [["14:12:43", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())];
    return s;
  },
  /* the same cut, with Stir started at 14:10:00: it ran out at 14:25:00, while CraftBeerPi was off, so it comes back run
     out, with its alarm, counting up from then, the time off included */
  "timer-back-done": () => {
    const s = SCENES.timers(), t = s.tmrs[0];
    Object.assign(t, {state: "done", left: 0, run: 15 * 60, at: s.t - (7 * 60 + 31), interrupted: true, off: 12 * 60});
    s.banner = tBanner(t, s.tmrs);
    s.events = [["14:32:31", "Stir finished", "waiting for you", "wait"], ["14:10:00", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())];
    return s;
  },
  /* the same, before the network has set CraftBeerPi's clock: how long it was off isn't known yet, so neither is how
     long ago Stir ran out ("– –"); Yeast, counting down at the cut, comes back paused */
  "timer-back-unknown": () => {
    const s = SCENES["timer-back-done"](), [t, y] = s.tmrs;
    Object.assign(t, {at: null, off: null});
    Object.assign(y, {state: "paused", left: 12 * 60 + 30, run: 20 * 60, interrupted: true, off: null});
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
    events: [
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
  /* AUTO with no target: the mash tun's AUTO is on but the HLT stays off. The mash tun's target was 0, left from the last
     recipe, and the brewer held AUTO at 13:26. PID_HERMS takes 0 as a real target: it holds the mash at 0 °F, so it never
     asks the HLT for heat, though its pump still runs. CraftBeerPi warns after 5 s. */
  notarget: () => Object.assign(mash(), {
    t: 13 * 3600 + 47 * 60 + 10,
    banner: noTargetBanner("mt"),
    v: {hlt: {pv: 68.0, sv: null, own: 168.0, mode: "manual"}, mt: {pv: 67.6, sv: null, mode: "auto", noTgt: 1270, warned: true}, bk: {pv: 66.9, sv: null, mode: "manual"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: true, bk: false},
    recipe: null, finished: true,
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
  }),
  /* heating by hand, with no recipe: at 08:17:31 the brewer set the HLT's target to 150 °F and at 08:18 held its element
     on, in MANUAL. In MANUAL nothing compares the temperature with the target,
     so the element runs until someone turns it off. #byhand at 08:52:40: heating, 18.4 °F short of the target;
     #byhand-past at 09:03:30: 3.3 °F past it, with CraftBeerPi's alarm, raised at 09:03:22, 30 s after it was 2 °F past */
  byhand: () => Object.assign(SCENES.manual(), {
    t: 8 * 3600 + 52 * 60 + 40,
    v: {hlt: {pv: 131.6, sv: 150.0, own: 150.0, mode: "manual"}, mt: {pv: 64.4, sv: null, mode: "manual"}, bk: {pv: 64.9, sv: null, mode: "manual"}},
    a: {hltEl: {on: true, pct: 100}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: false, bk: false},
    events: [
      ["08:18:00", "HLT ELEMENT on", "confirmed", "ok"],
      ["08:17:31", "Hot liquor tank target 150.0 °F", "confirmed", "ok"]
    ]
  }),
  "byhand-past": () => {
    const s = SCENES.byhand();
    s.t = 9 * 3600 + 3 * 60 + 30;
    Object.assign(s.v.hlt, {pv: 153.3, byT: 150.0, byRaised: ["target"]});
    s.banner = byHandBanner("hlt", {t: 150.0, over: "target"});
    s.events.unshift(["09:03:22", `${KNAME.hlt}: ${s.banner.text}`, "from CraftBeerPi", "bad"]);
    return Object.assign(s, {base: "byhand"});
  },
  /* RESET, to reset the brew day's progress after STOP. The #mash day, stopped at 14:32:31 in Saccharification, 16 of
     its 40 minutes run. STOP took the mash tun's AUTO off, as CraftBeerPi's MashStep does (its HERMS stops with it: HLT
     element and wort pump off, the HLT's own target back); the middle button offers RESET. #reset: RESET pressed, its
     question open. #reset-done: RESET TO STEP 1 pressed at 14:32:58: the same recipe at step 1, waiting for START; NEXT
     STEP greyed (screen.js NOT_BEGUN) */
  stopped: () => {
    const s = mash();
    s.t = 14 * 3600 + 32 * 60 + 44;
    s.recipe.state = "stopped";
    s.v.mt.mode = "manual"; s.v.hlt.sv = s.v.hlt.own;
    s.a.hltEl = {on: false, pct: 0}; s.a.wortPump = {on: false};
    s.events.unshift(["14:32:31", "Recipe stopped", "confirmed", "ok"]);
    return s;
  },
  reset: () => Object.assign(SCENES.stopped(), {base: "stopped", open: {confirmReset: true}}),
  "reset-done": () => {
    const s = SCENES.stopped();
    s.t = 14 * 3600 + 33 * 60 + 4;
    s.recipe = {state: "ready", cur: 0, left: 0, adds: []};
    s.events.unshift(["14:32:58", "Recipe reset to step 1", "confirmed", "ok"]);
    return s;
  },
  /* the pre-brew check (pbMorning). #prebrew: COMPARE PROBES under START. #probes, #probes-apart, #probes-off,
     #probes-none: the probes side by side, agreeing; the boil kettle 3.8 °F cooler than the others, as one by a door
     can be; the boil kettle's 17.5 °F low, more than its spot explains; the mash tun's giving no reading for 4 min.
     #checking: START held, CraftBeerPi checking. #check-clock: the Pi's clock not set yet (it sets itself 30 s on, and
     the box follows: #check-now). #check-probe: the boil kettle's probe silent for 3 min. #check-adds: a recipe with
     eight boil additions, two without a reminder. #check-many: the clock and the reminders both. #check-noanswer:
     CraftBeerPi gave no answer to the check within 5 s. #check-noprobe: no probe chosen for the boil kettle in Hardware
     (no_probe). #check-slow: the Pi's clock still unanswered after START waited 6 s for it (no_answer_yet; the answer
     comes 5 s on, set, and the box follows). #check-unsure: the Pi didn't say whether its clock is set (unconfirmed).
     pb is CraftBeerPi's answer, as the mockup keeps it: the clock set or not (clockAt: when it gets set; clockWhy: "slow"
     or "unsure"), how long each probe has given no reading (none), a kettle with no probe in Hardware (why), and the
     boil's additions */
  prebrew: () => pbMorning(),
  probes: () => Object.assign(pbMorning(), {open: {cmpOpen: true}}),
  "probes-apart": () => { const s = pbMorning(); Object.assign(s.v.hlt, {pv: 63.6}); Object.assign(s.v.mt, {pv: 67.5}); Object.assign(s.v.bk, {pv: 60.7}); return Object.assign(s, {open: {cmpOpen: true}}); },
  "probes-off": () => { const s = pbMorning(); s.v.bk.pv = 45.0; return Object.assign(s, {open: {cmpOpen: true}}); },
  "probes-none": () => { const s = pbMorning(); s.v.mt.pv = null; s.pb.none.mt = 240; return Object.assign(s, {pbLast: {mt: 65.5}, gap: {mt: 240}, open: {cmpOpen: true}}); },
  checking: () => Object.assign(pbMorning(), {open: {pend: {"r:check": "check"}}}),
  "check-clock": () => { const s = pbMorning(); s.pb.clock = false; s.pb.clockAt = s.t + 30; return Object.assign(s, {open: {pbOpen: true}}); },
  "check-now": () => Object.assign(pbMorning(), {open: {pbOpen: true}}),
  "check-probe": () => { const s = pbMorning(); s.v.bk.pv = null; s.pb.none.bk = 180; return Object.assign(s, {pbLast: {bk: 61.4}, gap: {bk: 180}, open: {pbOpen: true}}); },
  "check-adds": () => { const s = pbMorning(); s.pb.adds = {n: 8, missed: BIG_MISSED}; return Object.assign(s, {adds5: BIG_ADDS, open: {pbOpen: true}}); },
  "check-many": () => { const s = pbMorning(); s.pb.clock = false; s.pb.adds = {n: 8, missed: BIG_MISSED}; return Object.assign(s, {adds5: BIG_ADDS, open: {pbOpen: true}}); },
  "check-noanswer": () => { const s = pbMorning(); s.pb.noAnswer = true; return Object.assign(s, {open: {pbOpen: true}}); },
  "check-noprobe": () => { const s = pbMorning(); s.v.bk.pv = null; s.pb.why = {bk: "no_probe"}; return Object.assign(s, {pbLast: {bk: 61.4}, gap: {bk: 9 * 3600}, open: {pbOpen: true}}); },
  "check-slow": () => { const s = pbMorning(); s.pb.clock = false; s.pb.clockWhy = "slow"; s.pb.clockAt = s.t + 5; return Object.assign(s, {open: {pbOpen: true}}); },
  "check-unsure": () => { const s = pbMorning(); s.pb.clock = false; s.pb.clockWhy = "unsure"; return Object.assign(s, {open: {pbOpen: true}}); },
  /* the strike water helper (swDay, swMorning): the brewer's own flow (the rig page, 9b) in front of Test Recipe v5.
     The night before: #sw-plan, the recipe loaded and not begun, its strike water at the rest, as under Kal's way,
     and USE offered; #sw-forecast, the box opened out with FORECAST; #sw-volume, the HLT's water being changed there;
     #sw-grain-edit, the grain's temperature being given there, for grain kept indoors; #sw-grain, given on BrewStart;
     #sw-hot, the strike water typed in too hot, so the mash would go over its rest; #sw-used, USE pressed. CraftBeerPi
     working USE out: #sw-working, the recipe just loaded and nothing worked out yet, and #sw-working-open with FORECAST
     open; #sw-reworking, the HLT's water just changed, the last figures shown until the new ones come; #sw-levers, USE
     worked out for the new water and FORECAST waiting for what would raise it most. #sw-refused: USE pressed on a
     screen that hadn't caught up with the grain's temperature given on another, so CraftBeerPi refused it and the box
     offers its new figure; #sw-refused-moved, USE pressed on a screen that hadn't caught up with the water going to the
     mash tun. #sw-failed: CraftBeerPi's work on USE failed. #sw-tunprobe: the mash probe at the tun's outlet instead,
     where PID_HERMS takes the mash over the rest by itself. Brew day: #sw-wait, BrewStart waiting to start heating for
     07:00; #sw-heat, the strike water step heating the HLT; #sw-move, the water there and CraftBeerPi asking for it to
     be moved; #sw-late, the same at the rest, with USE not pressed the night before; #sw-doughin, the water in the mash
     tun, MashIn on the Mash Tun asking for the malt and its probe reading the HLT's water. #sw-hand: the recipe as
     imported, without the flow, and the HLT heating the strike water on its own AUTO. With a number missing: #sw-novol,
     BrewStart without a water volume; #sw-missing, a recipe built on Brew Steps, with no grain weight or mash water;
     #sw-noprobe, the boil kettle's probe giving no reading; #sw-grain-bad, BrewStart's grain temperature saved on Brew
     Steps as 150 °F. swd: the moment's numbers, which the demo's stand-in for CraftBeerPi works the box's state out from
     (strike-demo.js) */
  "sw-plan": () => swDay(21 * 3600 + 12 * 60 + 5, {}),
  "sw-forecast": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {open: {swOpen: true}}),
  "sw-volume": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {open: {swOpen: true, swVol: {val: 13.5}}}),
  "sw-grain-edit": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {open: {swOpen: true, swGrain: {val: 70}}}),
  "sw-grain": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.swd.grain = 70; return Object.assign(s, {open: {swOpen: true}}); },
  "sw-hot": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.swd.plan = 145; return s; },
  "sw-used": () => swDay(21 * 3600 + 12 * 60 + 40, {used: true}),
  "sw-working": () => swWorking(21 * 3600 + 8 * 60 + 50),
  "sw-working-open": () => Object.assign(swWorking(21 * 3600 + 8 * 60 + 50), {open: {swOpen: true}}),
  /* SET 13.5 gal in the HLT's box (#sw-volume) at 21:12:25: the figures for 15 gal stay, greyed, until CraftBeerPi has
     worked USE out for 13.5 */
  "sw-reworking": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 34, {});
    s.swd.vol = 13.5;
    s.swd.has = {grain: 60.4, vol: 15, probe: "coil", room: 60.4};
    s.swd.work = {since: 21 * 3600 + 12 * 60 + 25, why: "vol"};
    s.events.unshift(["21:12:25", "HLT water set to 13.5 gal, was 15.0 gal · Campden ¾ tablet", "confirmed", "ok"]);
    return Object.assign(s, {open: {swOpen: true}});
  },
  /* the same, USE worked out for 13.5 gal at 21:12:55, and FORECAST, at NOT MEASURED YET, still waiting for what would
     raise it most */
  "sw-levers": () => {
    const s = swDay(21 * 3600 + 13 * 60 + 5, {});
    s.swd.vol = 13.5;
    s.swd.has = {grain: 60.4, vol: 13.5, probe: "coil", room: 60.4, lvAt: 21 * 3600 + 12 * 60 + 55 + SW_LEVER_S};
    s.events.unshift(["21:12:25", "HLT water set to 13.5 gal, was 15.0 gal · Campden ¾ tablet", "confirmed", "ok"]);
    return Object.assign(s, {open: {swOpen: true, swAt: "#sw-lv"}});
  },
  /* BrewStart's grain temperature given as 70 °F on another screen at 21:11:40, and USE worked out again for it; this
     screen, a phone woken from sleep, still showed the figure for the probe's 60.4 °F when USE was pressed at 21:12:31 */
  "sw-refused": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 32, {});
    s.swd.grain = 70;
    s.events.unshift(["21:11:40", "Grain temperature set to 70.0 °F, was the boil kettle's probe", "confirmed", "ok"]);
    return Object.assign(s, {open: {notes: {r: `USE ${swHot().toFixed(1)} °F wasn't applied: BrewStart's grain temperature is now 70.0 °F, so USE is ${swModel(70, 15, "coil").use.toFixed(1)} °F.`}}});
  },
  /* the water moved to the mash tun with USE never pressed; a phone woken from sleep still showed the night before's
     box, and USE pressed on it is refused (409 moved): the note, and the box as CraftBeerPi has it */
  "sw-refused-moved": () => Object.assign(swMorning(SW_MOVED + 40, 126), {open: {notes: {r: `USE ${swHot().toFixed(1)} °F wasn't applied: the strike water is already in the mash tun.`}}}),
  /* CraftBeerPi's work on USE for the recipe loaded at 21:08:30 failed at 21:09:12, so there's no USE until a number it
     works from changes */
  "sw-failed": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 5, {});
    s.swd.has = null;
    s.swd.failed = {at: 21 * 3600 + 9 * 60 + 12, detail: "the model's process stopped without an answer", for: {grain: 60.4, vol: 15, probe: "coil", room: 60.4}};
    s.events.unshift(["21:09:12", `Strike water forecast failed: ${s.swd.failed.detail}`, "failed", "bad"]);
    return s;
  },
  "sw-tunprobe": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.swd.probe = "tun"; return Object.assign(s, {open: {swOpen: true}}); },
  "sw-wait": () => {
    const s = swDay(DAY2 + 5 * 3600 + 40 * 60 + 12, {used: true, state: "running"});
    s.v.hlt.pv = 59.8;
    s.recipe.wait = `STARTS ${hhmm(swStartAt(s.swd.plan, 59.8))}`;
    return s;
  },
  "sw-heat": () => swMorning(DAY2 + 6 * 3600 + 41 * 60 + 30, swHot()),
  "sw-move": () => swMorning(DAY2 + 6 * 3600 + 51 * 60 + 10, swHot()),
  "sw-late": () => swMorning(DAY2 + 6 * 3600 + 51 * 60 + 10, 126),
  "sw-doughin": () => swMorning(SW_MOVED + 40, swHot()),
  "sw-hand": () => {
    const s = swDay(DAY2 + 9 * 3600 + 5 * 60, {}), on = DAY2 + 8 * 3600 + 41 * 60 + 20;
    s.swd.hand = true;
    Object.assign(s.v.hlt, {pv: +(59.9 + (s.t - on) / 60 * SW_RATE).toFixed(1), sv: 126, own: 126, mode: "auto"});
    Object.assign(s.a, {hltEl: {on: true, pct: 100}, hltPump: {on: true}});
    s.swd.g = {from: 59.9, heat: on, plan: 126, hand: true};
    s.events = [["08:41:20", "Hot liquor tank AUTO", "confirmed", "ok"], ["08:41:12", "Hot liquor tank target 126.0 °F", "confirmed", "ok"],
      ["08:40:10", "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]];
    return s;
  },
  "sw-novol": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.swd.vol = null; return s; },
  "sw-missing": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.swd.from = null; return s; },
  "sw-noprobe": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.v.bk.pv = null; s.pb.none.bk = 300; return Object.assign(s, {pbLast: {bk: 61.4}, gap: {bk: 300}}); },
  "sw-grain-bad": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.swd.grain = 150; return s; }
};
/* ---------- the strike water's moments ----------
   The brewer's own flow (the rig page, 9b) in front of the recipe: BrewStart waits for Ready by on the HLT, then a
   MashInStep on the HLT, the strike water step, heats all the water in it, strike and sparge, and holds it until he has
   moved the strike water to the Mash Tun and pressed Next; then the recipe's steps from MashIn on the Mash Tun. Under
   Kal's way (The Electric Brewery's method) the strike water is at the rest temperature, as the recipe comes; USE
   changes it to the strike temperature the forecast works out. The moments put the two in front of Test Recipe v5, with
   the numbers its BeerSmith export carries: 20 lb of grain at 1.5 qt/lb, so 7.50 gal for the grain (INFUSE_AMOUNT), plus
   the equipment profile's recoverable mash deadspace, 0.76 gal, which BeerSmith adds to the first infusion
   (DISPLAY_INFUSE_AMT 33.04 qt), so it is never added again; the mash tun, 33 lb of steel (TUN_WEIGHT, TUN_SPECIFIC_HEAT
   0.12); and BeerSmith's own strike temperature, INFUSE_TEMP 134.6 °F, worked out for grain at 65 °F (GRAIN_TEMP). The
   export doesn't say how much water is in the HLT: that is BrewStart's water volume (vol, from the moment: swDay), which
   also sets its Campden dose */
const SW_STEPS = [
  {n: "BrewStart", type: "BrewStart", k: "hlt", ready: "07:00", campden: true},
  {n: "Strike water", type: "MashInStep", k: "hlt", note: "Move the strike water to the Mash Tun, then press Next"}
];
const SW_FROM = {grainLb: 20, forGrain: 7.5, dead: 0.76, tunLb: 33, bs: 134.6, bsGrain: 65, bsTun: 72};
/* BrewStart's Ready by plan, from the rig's measured heat-up (rig page 9b: 15 gal from 60 to 152 °F in 42 min, so
   2.19 °F a minute, plus 10 spare minutes) */
const SW_RATE = 2.19, SW_SPARE = 10;
/* the brew-day morning's moments run on from the night before, so the clock and the graphs carry on past midnight */
const DAY2 = 24 * 3600;
const pad2 = n => String(n).padStart(2, "0");
const hhmm = t => `${pad2(Math.floor(t / 3600) % 24)}:${pad2(Math.floor(t / 60) % 60)}`;
const hhmmss = t => `${hhmm(t)}:${pad2(t % 60)}`;
/* the strike water's temperature once USE is pressed in the moments: USE for Test Recipe v5 with 15 gal in the HLT and
   the grain at 60.4 °F (the boil kettle's 61.4 °F, less its 1.0 °F offset), from the model's answers */
const swHot = () => swModel(60.4, 15, "coil").use;
/* the recipe loaded at 21:08:30 and CraftBeerPi working USE out since, with nothing worked out yet */
function swWorking(t) {
  const s = swDay(t, {});
  s.swd.has = null;
  s.swd.work = {since: 21 * 3600 + 8 * 60 + 30, why: "load"};
  return s;
}
/* brew day, as cbpi4_BrewStart writes it (format_start), and the moment the strike water has been moved and Next
   pressed */
const SW_DAY = "Sat Nov 21";
const SW_MOVED = DAY2 + 6 * 3600 + 55 * 60 + 40;
/* when BrewStart starts heating for 07:00, water at pv heated to t: its heat-up at the rig's rate plus its spare minutes */
const swStartAt = (t, pv) => DAY2 + 7 * 3600 - Math.ceil(((t - pv) / SW_RATE + SW_SPARE) * 60);
/* BrewStart's notification as the recipe starts (notify_ready_scheduled), in its words */
const swPlanLine = (t, pv) => `BrewStart: Ready by ${SW_DAY}, 07:00: heating starts about ${SW_DAY}, ${hhmm(swStartAt(t, pv))}. ${pv.toFixed(1)} °F to ${t.toFixed(1)} °F takes about ${Math.round((t - pv) / SW_RATE)} min, plus ${SW_SPARE} min spare.`;
/* the night before, Friday 21:12: all the strike and sparge water in the HLT, 15 gal at the garage's temperature, every
   other vessel empty, every probe with the rig's offset, and the graphs showing the evening (pbMorning's pbDay); the
   recipe loaded at 21:08, its strike water at the rest, and BrewStart's water volume 15 gal, as the rig page sets it
   (swd.vol; brewing by hand, the figure given in the box). used: USE pressed at 21:12:31. state "running": START held
   at 21:13, the check passed and BrewStart waits. CraftBeerPi has worked USE out for the numbers as the moment has them
   (swd.has, set as it loads) unless the moment says otherwise */
function swDay(t, o) {
  const s = pbMorning(), used = !!o.used, hot = used ? swHot() : null;
  s.t = t;
  s.v.hlt.pv = 60.6; s.v.mt.pv = 64.6; s.v.bk.pv = 61.4;
  s.recipe = {state: o.state || "ready", cur: 0, left: 0, adds: []};
  s.swd = {plan: used ? hot : 126, was: used ? 126 : null, from: Object.assign({}, SW_FROM), vol: 15, grain: null};
  s.events = [["21:08:30", "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]];
  if (used) s.events.unshift(["21:12:31", `Strike water set to ${hot.toFixed(1)} °F, was 126.0 °F`, "confirmed", "ok"]);
  if (o.state) s.events.unshift(["21:13:04", swPlanLine(s.swd.plan, 60.6), "from CraftBeerPi", ""], ["21:13:02", "Recipe started", "confirmed", "ok"],
    ["21:13:01", "Checked before starting: probes, clock, reminders", "all passed", "ok"]);
  return s;
}
/* brew day, from BrewStart's start: the strike water step heats the HLT on its own AUTO at the rig's rate to plan, and
   asks for the water to be moved half a degree short of it, as the step counts it there; the HLT holds it until Next.
   At SW_MOVED the water is in the mash tun and Next pressed. It came through the coil, so the Mash Tun's probe, at the
   coil's outlet, reads the strike water: MashIn on the Mash Tun finds the rest reached and asks for the malt within
   seconds, the strike water at the rest as much as above it. Its pump stops for the dough-in, PID_HERMS holds the HLT
   at no more than the rest while it does, and the probe reads the HLT's water. The time of the ask and the readings
   40 s on are the model's, its middle guesses (SW_MORNING). swd.g gives the graphs the times */
function swMorning(t, plan) {
  const s = swDay(t, {used: plan !== 126, state: "running"}), S = SW_STEPS[1], kal = plan <= 126;
  const heat = swStartAt(plan, 59.8), hot = heat + Math.round((plan - 0.5 - 59.8) / SW_RATE * 60);
  const M = SW_MORNING[kal ? "rest" : "use"], ask = SW_MOVED + M.ask;
  const log = s.events.slice().reverse();
  log.push([hhmmss(heat), `BrewStart: Time to heat - the water should be ready by ${SW_DAY}, 07:00.`, "from CraftBeerPi", ""],
    [hhmmss(heat), "BrewStart finished", "by recipe", ""], [hhmmss(heat), `${S.n} started, HLT target ${plan.toFixed(1)} °F`, "by recipe", ""]);
  Object.assign(s.a, {hltPump: {on: true}});
  s.swd.g = {from: 59.8, heat, hot, plan, ask};
  if (t < SW_MOVED) {
    s.recipe.cur = 1;
    const held = t >= hot;
    Object.assign(s.v.hlt, {pv: held ? +(plan - 0.1).toFixed(1) : +(59.8 + (t - heat) / 60 * SW_RATE).toFixed(1), sv: plan, own: plan, mode: "auto"});
    s.a.hltEl = {on: true, pct: held ? 16 : 100};
    s.recipe.wait = held ? WFY : true;
    if (held) {
      s.banner = {tone: "prompt", title: S.n, text: S.note, act: "NEXT STEP", cmd: "b:done"};
      log.push([hhmmss(hot + 6), `${S.n}: ${S.note}`, "waiting for you", "wait"]);
    }
  } else {
    s.recipe.cur = 2; s.swd.g.moved = SW_MOVED;
    log.push([hhmmss(hot + 6), `${S.n}: ${S.note}`, "answered", ""], [hhmmss(SW_MOVED), `${S.n} answered: Next Step`, "confirmed", "ok"],
      [hhmmss(SW_MOVED + 1), "MashIn started, mash tun target 126.0 °F", "by recipe", ""]);
    const asked = t >= ask;
    Object.assign(s.v.mt, {pv: asked ? M.mt : plan, sv: 126, mode: "auto"});
    Object.assign(s.v.hlt, {pv: M.hlt, sv: +(126 + HERMS_DELTA).toFixed(1), mode: "manual"});
    s.a.hltEl = M.el >= 0.5 ? {on: true, pct: Math.round(M.el)} : {on: false, pct: 0};
    s.a.wortPump = {on: !asked};
    s.fill.mtLiq = true;
    s.recipe.wait = asked ? WFY : true;
    if (asked) {
      s.banner = {tone: "prompt", title: "MashIn", text: "Target temperature reached. Please add malt.", act: "NEXT STEP", cmd: "b:done"};
      log.push([hhmmss(ask), "MashIn: Target temperature reached. Please add malt.", "waiting for you", "wait"]);
    }
  }
  s.events = log.reverse();
  return s;
}
/* brew day's morning, for the pre-brew check: 07:41, the recipe loaded at 07:38 and not begun, every vessel empty and at
   the garage's temperature since the night before, nothing on and no targets set. Each probe has an offset set in
   Hardware (poff), as a rig's can: the mash probe, at the HERMS coil's outlet, +4.0 °F, so the mash tun shows 4 °F
   above the others while its probe reads alike. The graphs show the night (pbDay) */
function pbMorning() {
  return {
    t: 7 * 3600 + 41 * 60 + 12, link: "ok", age: 0, banner: null, pbDay: true,
    v: {hlt: {pv: 61.5, sv: null, own: null, mode: "manual"}, mt: {pv: 65.5, sv: null, mode: "manual"}, bk: {pv: 61.4, sv: null, mode: "manual"}},
    poff: {hlt: 0.23, mt: 4.0, bk: 1.0},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    fill: {mtLiq: false, bk: false},
    recipe: {state: "ready", cur: 0, left: 0, adds: []},
    pb: {clock: true, none: {}, adds: {n: 4, missed: []}},
    events: [["07:38:40", "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]]
  };
}
/* the versions' line (screen.js verHTML): made up and fixed, as the mockup's, so the pictures don't change with each
   build. ver "release" (?ver=release): an installed release's, the release numbers only; "none": no line */
const versions = ver => ver === "none" ? null : ver === "release" ? {ui: "0.5.1.a3.post12", built: "", cbpi: "4.7.7.post36"}
  : {ui: "0.5.1.a3.post12+abc1234", built: "12 Nov 21:47", cbpi: "4.7.7.post36+def5678"};
/* CraftBeerPi's alarm for an element left on by hand: past its target (w.over "target"), or near the boil
   (w.over "boil"), whatever its target. An error, not a warning, so the title bar puts it first, before a timer or a
   step's question, and its line stays red: it is the one time heat goes in with nothing watching the temperature. cbpi:
   CraftBeerPi's own warning or error, one without buttons, which OK marks "seen" */
function byHandBanner(v, w) {
  const n = KNAME[v], T = w.t == null ? "" : `${+w.t.toFixed(1)} °F`;
  return {tone: "alarm", cbpi: true, title: n, act: "OK", cmd: "b:ok", text: w.over === "target"
    ? `Above its ${T} target and still heating: its element is on by hand, and in MANUAL nothing stops it at the target. Turn the element off, or put the ${n} in AUTO to hold ${T}.`
    : "Near the boil and still heating: its element is on by hand, and in MANUAL nothing stops it before it boils. Turn the element off."};
}
/* CraftBeerPi's kept warning when a kettle's AUTO has run 5 s with no target (unset, 0 or below), taken down by itself once
   the kettle has a target or leaves AUTO. BoilPower never raises it: it puts its boil point in as the target. */
function noTargetBanner(v) {
  return {tone: "prompt", title: `No target for the ${KNAME[v]}`, notgt: v, act: "OK", cmd: "b:ok",
    text: `AUTO is on with no target temperature, so ${v === "mt" ? "the HLT" : "it"} won't heat. Set a target, or switch to MANUAL.`};
}
/* the SpargeStep's kept prompt, titled with the step's name, in CraftBeerPi's words (SPARGE_READY_TEXT, SPARGE_NOW_TEXT).
   It says which pumps are off for the brewer's hoses (a pump is off whenever its hoses or valves change), as CraftBeerPi
   finds them when it asks: a, the pumps as they are then. Its one button answers it */
const SPARGE_PUMPS_OFF = {"hlt,wort": "both pumps are off", hlt: "the HLT pump is off", wort: "the wort pump is off"};
function spargeBanner(temp, a) {
  const off = SPARGE_PUMPS_OFF[[!a.hltPump.on && "hlt", !a.wortPump.on && "wort"].filter(Boolean).join(",")] || "";
  return {tone: "prompt", title: "Sparge", sparge: true, act: "SPARGE STARTED", cmd: "b:sparge",
    text: temp ? `The sparge water is ready at ${temp} °F${off ? `, and ${off}` : ""}. Set the hoses or valves for a fly or a batch sparge, start the pumps by hand, then press Sparge started, which switches the HLT's AUTO off.`
      : `${off ? `${off[0].toUpperCase()}${off.slice(1)}. ` : ""}Set the hoses or valves for a fly or a batch sparge, start the pumps by hand, then press Sparge started.`};
}
/* its line in the event log, as #sparge-ready asks it with both pumps off, for the moments after it */
const SPARGE_ASKED = (q => `${q.title}: ${q.text}`)(spargeBanner(168, {hltPump: {on: false}, wortPump: {on: false}}));
/* the hold before the boil (CraftBeerPi's StepController, with CONFIRM_BEFORE_BOIL Yes, as on the rig): the boil waits,
   with nothing active, until the brewer starts it. Its words are BoilStep.wait_for_brewer's. Starting the
   boil switches heat on, so here, as with START, it takes a held press (the Held Heat Rule) */
function boilHoldBanner(s) {
  return {tone: "prompt", title: s.n, boilHold: true, act: "START THE BOIL", cmd: "b:boil", hold: true,
    text: "Ready to boil? Move the wort to the boil kettle first - the dashboard is yours meanwhile. The boil kettle stays off until you press Start the boil, or Start on the Brew Steps page. That also switches the wort pump off, so you can move its hoses. (Set CONFIRM_BEFORE_BOIL to No to go straight on.)"};
}
/* BoilPower's warning for a forgotten pause: after 2 brewing minutes paused, kept on every page with OK,
   said once per pause, and taken down when the heat carries on or AUTO stops; in the kettle's name from CraftBeerPi */
function pauseBanner() {
  return {tone: "prompt", title: `${KNAME.bk} heat still paused`, pausegt: true, act: "OK", cmd: "b:ok",
    text: `The heat has been paused for 2 minutes. To heat again, press and hold PAUSED on the ${KNAME.bk}.`};
}
/* a timer's time, as its row and CraftBeerPi's prompt write it: 15:00, or 1:30:00 from an hour */
const tpad = n => String(n).padStart(2, "0");
const tfmt = s => s >= 3600 ? `${Math.floor(s / 3600)}:${tpad(Math.floor(s / 60) % 60)}:${tpad(s % 60)}` : `${Math.floor(s / 60)}:${tpad(s % 60)}`;
/* CraftBeerPi's kept prompt for a timer that has run out: titled with its name, on every screen until answered. Its
   +5 MIN is the lesser button (sec); a second one run out waits behind it ("1 more waiting") */
function tBanner(t, list) {
  return {tone: "prompt", title: t.name, text: `The ${tfmt(t.set)} timer has run out.`, timer: t.id, more: list.filter(x => x.state === "done").length - 1,
    acts: [{label: "+5 MIN", cmd: `tm2:plus5:${t.id}`, dir: "plus5", sec: true}, {label: "OK", cmd: `tm2:ok:${t.id}`, dir: "ok"}]};
}

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

function gDemo(scene, now, x = {}) {
  const E = 30 * 3600;
  /* the strike water moments (x.sw, swMorning's swd.g): the night in the garage, then from BrewStart's start (g.heat) the
     HLT heating the strike water at the rig's rate to g.plan, the step asking half a degree short (g.hot), and the HLT
     holding it; from g.moved the water in the mash tun and PID_HERMS on it, MashIn asking for the malt at once (g.ask).
     #sw-hand: the HLT on its own AUTO from g.heat, and no recipe begun. Times run on past midnight, so the end is a day
     and a bit on. The mash tun's probe sits at the coil's outlet: it reads the strike water as it comes through the coil,
     and with the pump stopped for the dough-in, the HLT's water. x.pv: the moment's readings; x.hltSv: the HLT's target */
  const g = x.sw;
  if (g) {
    const Z = now + 3600, start = now - 8 * 3600, hot = g.hot ?? Infinity, mv = g.moved ?? Infinity, kal = g.plan <= 126;
    const hlt = [[start, g.from + 0.7], [g.heat, g.from, "s"]];
    if (now < hot) hlt.push([now, x.pv.hlt, "l"]);
    else {
      hlt.push([hot, g.plan - 0.5, "l"], [hot + 40, g.plan - 0.1, "e"]);
      if (now >= mv) hlt.push([mv, g.plan - 0.1, "h"], [now, x.pv.hlt, "s"]); else hlt.push([now, g.plan - 0.1, "h"]);
    }
    /* the strike water through the coil: the probe at its outlet reads it from the transfer's start, about 4 minutes
       before Next; MashIn asks for the malt at once, the pump stops, and the probe settles on the HLT's water */
    const mt = [[start, 63.9]];
    if (now >= mv) mt.push([mv - 240, 64.6, "s"], [mv - 200, g.plan - 0.2, "e"], [mv, g.plan - 0.1, "h"], [now, x.pv.mt, "s"]);
    else mt.push([now, 64.6, "s"]);
    const out = [[start, g.heat, 0], [g.heat, Math.min(hot, mv, Z), 100]];
    if (now >= hot) out.push([hot, Math.min(mv, Z), [8, 24]]);
    /* PID_HERMS holds the HLT at no more than the rest while the pump is stopped: off above it, a trickle at it */
    if (now >= mv) out.push([mv, Z, kal ? [0, 6] : 0]);
    return {
      start, steps: g.hand ? [] : [[g.heat, 2], ...(now >= mv ? [[mv, 3]] : [])],
      hlt: {pv: hlt, sv: [[g.heat, Math.min(mv, Z), g.plan], ...(now >= mv ? [[mv, Z, x.hltSv]] : [])], out},
      mt: {pv: mt, sv: now >= mv ? [[mv, Z, 126]] : []},
      bk: {pv: [[start, x.pv.bk - 1.2], [now, x.pv.bk, "s"]], out: [[start, Z, 0]]}
    };
  }
  /* the pre-brew moments (#prebrew, #probes…, #check…): the night before in the garage, every vessel empty and slowly
     warming with the morning, each probe ending on its own reading (one silent for a while ends on its last); nothing
     heated, so no SV and no OUT. DAY is the last 8 hours, as with no recipe begun. x: the moment's own readings (pv) and a
     silent probe's last one (last) */
  if (x.pbDay) {
    const keys = v => { const r = x.pv[v] ?? (x.last || {})[v]; return [[now - 8 * 3600, r - 2.4], [now - 3 * 3600, r - 1.1, "s"], [now - 900, r, "s"], [now, r, "h"]]; };
    return {start: now - 8 * 3600, steps: [], hlt: {pv: keys("hlt"), out: [[0, E, 0]]}, mt: {pv: keys("mt")}, bk: {pv: keys("bk"), out: [[0, E, 0]]}};
  }
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
  /* the SpargeStep (#sparge-heat, -ready, -run, -batch): the #mash day on, Saccharification ending at 14:56:21. The
     mash tun's AUTO off then (its SV stays 149); the HLT on its own AUTO heats to 168 °F by 15:04:10 and holds it until
     Sparge started at 15:05:02, which switches its AUTO off. Then a fly sparge (-run) fills the boil kettle from 15:05;
     a batch sparge (-batch) drains the first runnings until 15:13:20 and refills the mash tun from 15:13:31. The fly
     sparge's 40 min end at 15:45:02, and #boil-hold has the wort pump still draining into the boil kettle at 15:53:12 */
  if (/^sparge-/.test(scene) || scene === "boil-hold") {
    const S0 = hms(14, 56, 21), RDY = hms(15, 4, 10), GO = hms(15, 5, 2), batch = scene === "sparge-batch";
    const END = hms(15, 45, 2), NOW = hms(15, 53, 12), held = scene === "boil-hold";
    const hltPv = [...hltMash, [S0, 154.4, "h"], [hms(15, 3), 166.8, "l"], [RDY, 168.1, "e"], [GO, 168.2, "s"],
      batch ? [hms(15, 20, 30), 167.1, "s"] : [hms(15, 12, 40), 166.9, "s"], ...(held ? [[END, 165.2, "s"], [NOW, 164.4, "s"]] : [])];
    const mtPv = [...mtMash, [S0, 148.7, "s"], [GO, 147.9, "s"], ...(batch ? [[hms(15, 13, 20), 147.1, "s"], [hms(15, 20, 30), 165.3, "s"]] : [[hms(15, 12, 40), 151.6, "s"]]),
      ...(held ? [[END, 166.2, "s"], [NOW, 166.9, "s"]] : [])];
    const bkPv = [[hms(12, 40), 68.0], [hms(15, 5, 40), 68.0, "h"], [hms(15, 7), 146.0, "s"], ...(batch ? [[hms(15, 13, 20), 148.0, "s"], [hms(15, 20, 30), 147.6, "s"]] : [[hms(15, 12, 40), 146.8, "s"]]),
      ...(held ? [[END, 150.2, "s"], [NOW, 151.3, "s"]] : [])];
    return {
      start: hms(12, 40), steps: [...steps, [S0, 4]],
      hlt: {pv: hltPv, sv: [[hms(12, 40), hms(14, 9, 40), 131.4], [hms(14, 9, 40), S0, 154.4], [S0, GO, 168.0]],
        out: [...hltOut, [hms(14, 17, 30), S0, [52, 72]], [S0, hms(15, 3), 100], [hms(15, 3), GO, [28, 44]], [GO, E, 0]]},
      mt: {pv: mtPv, sv: [[hms(12, 40), hms(14, 9, 40), 126.0], [hms(14, 9, 40), S0, 149.0]]},
      bk: {pv: bkPv, out: [[hms(12, 40), E, 0]]}
    };
  }
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
  /* a boil-over (#pause): the boiling day at 15:31:20. The heat was paused at 15:30:55, so the OUT band drops to 0 there.
     #pause-long, at 15:33:10, has the wort falling since */
  if (scene === "pause" || scene === "pause-long") {
    const d = gDemo("boiling");
    d.bk.out = [[hms(11, 58), hms(15, 1, 47), 0], [hms(15, 1, 47), hms(15, 29, 30), 100], [hms(15, 29, 30), hms(15, 30, 55), 45], [hms(15, 30, 55), E, 0]];
    if (scene === "pause-long") d.bk.pv = d.bk.pv.filter(k => k[0] <= hms(15, 30, 4)).concat([[hms(15, 30, 55), 210.4, "s"], [hms(15, 33, 10), 206.3, "s"]]);
    return d;
  }
  /* a hop stand by hand (#handhold at 12:58:40; #bktarget borrows it at 12:41:02): no recipe. The boil kettle in AUTO from
     10:21:40, boiling from 11:03 at 45 %; its target set to 170 °F at 12:41:10, so the element went off and the wort cools
     towards it. The HLT and the mash tun, done for the day, cool too. */
  if (scene === "handhold") {
    const t0 = hms(10, 20), a = hms(10, 21, 40), T = hms(12, 41, 10), now = hms(12, 58, 40);
    return {
      start: t0, steps: [],
      hlt: {pv: [[t0, 166.2], [now, 148.3, "s"]], out: [[t0, E, 0]]},
      mt: {pv: [[t0, 150.6], [now, 131.0, "s"]]},
      bk: {pv: [[t0, 146.0], [a, 145.8, "h"], [hms(11, 1, 30), 208.4, "l"], [hms(11, 3, 12), 210.2, "e"], [hms(11, 8), 212.0, "s"], [T, 212.0, "h"],
        [hms(12, 46), 203.0, "s"], [now, 188.4, "l"]],
        sv: [[a, T, 210.2], [T, E, 170.0]],
        out: [[t0, a, 0], [a, hms(11, 3, 12), 100], [hms(11, 3, 12), T, 45], [T, E, 0]]}
    };
  }
  /* AUTO with no target (#notarget at 13:47, #notarget-hlt at 09:12): cold kettles, and nothing has heated */
  if (scene === "notarget" || scene === "notarget-hlt") {
    const a = scene === "notarget", s0 = a ? hms(13, 0) : hms(8, 40);
    return {start: s0, steps: [], hlt: {pv: [[s0, a ? 68.0 : 66.2]], out: [[s0, E, 0]]}, mt: {pv: [[s0, a ? 67.6 : 65.8]]}, bk: {pv: [[s0, 66.9]], out: [[s0, E, 0]]}};
  }
  /* heating by hand (#byhand at 08:52:40, #byhand-past at 09:03:30): the HLT's element on by hand at 100 % from 08:18, in
     MANUAL, so it climbs about 2 °F a minute through its 150 °F target. No green SV line: MANUAL holds nothing */
  if (scene === "byhand") return {
    start: hms(8, 0), steps: [],
    hlt: {pv: [[hms(8, 0), 62.0], [hms(8, 18), 62.0, "h"], [hms(8, 52, 40), 131.6, "l"], [hms(9, 3, 30), 153.3, "l"]], out: [[hms(8, 0), hms(8, 18), 0], [hms(8, 18), E, 100]]},
    mt: {pv: [[hms(8, 0), 64.4]]},
    bk: {pv: [[hms(8, 0), 64.9]], out: [[hms(8, 0), E, 0]]}
  };
  /* boiling and hold: the #hop day, carried on. The simulator boils at 212 °F, so the boil kettle settles there. At 17:00:04
     the boil ends; the wort is chilled to 170 °F for the whirlpool and cools to 166.3 °F in the stand, and from 17:14:31
     BoilPower holds 170 °F, the kettle's own target, held from 0.0.3.post8 by a PID. Its readings and powers are the
     plugin's own on the simulators' kettle, as its test models it: 52-59 % in the first minute, easing as the brake on the
     rise comes in, 37 % at 168.4 °F at 17:18:40, 170 °F at about 17:25:30, then 26 %. finished: the stand ends at
     17:28:10, switching the boil kettle off, and the chiller takes the wort down to 88.4 °F by 17:41:30 */
  if (scene === "boiling" || scene === "hold" || scene === "finished") {
    const d = gDemo("hop"), bk = d.bk, fin = scene === "finished", OFF = fin ? hms(17, 28, 10) : E;
    bk.pv = bk.pv.filter(k => k[0] <= hms(15, 30, 4)).concat([[hms(15, 36), 212.0, "s"], [hms(17, 0, 4), 212.0, "h"]]);
    if (scene === "boiling") return d;
    d.steps.push([hms(17, 0, 4), 6], [hms(17, 8, 10), 7]);
    bk.pv.push([hms(17, 1, 30), 209.8, "s"], [hms(17, 7, 30), 170.6, "e"], [hms(17, 8, 10), 170.4, "s"], [hms(17, 14, 20), 166.3, "s"],
      [hms(17, 15, 31), 166.4, "s"], [hms(17, 16, 31), 167.2, "l"], [hms(17, 17, 31), 167.9, "l"], [hms(17, 18, 40), 168.4, "l"]);
    if (fin) bk.pv.push([hms(17, 20, 31), 169.1, "l"], [hms(17, 22, 31), 169.6, "s"], [hms(17, 25, 31), 170.0, "s"], [OFF, 170.1, "s"],
      [hms(17, 29, 10), 169.2, "s"], [hms(17, 41, 30), 88.4, "e"]);
    bk.sv = [[hms(15, 1, 47), hms(17, 0, 4), 210.2], [hms(17, 14, 31), OFF, 170.0]];
    bk.out = [[hms(11, 58), hms(15, 1, 47), 0], [hms(15, 1, 47), hms(15, 29, 30), 100], [hms(15, 29, 30), hms(17, 0, 4), 45], [hms(17, 0, 4), hms(17, 14, 31), 0],
      [hms(17, 14, 31), hms(17, 15, 31), 56], [hms(17, 15, 31), hms(17, 16, 1), 54], [hms(17, 16, 1), hms(17, 16, 31), 45], [hms(17, 16, 31), hms(17, 17, 31), 38],
      [hms(17, 17, 31), hms(17, 19, 1), 37], [hms(17, 19, 1), hms(17, 20, 1), 35], [hms(17, 20, 1), hms(17, 21, 1), 33], [hms(17, 21, 1), hms(17, 22, 16), 31],
      [hms(17, 22, 16), hms(17, 23, 1), 30], [hms(17, 23, 1), hms(17, 24, 1), 29], [hms(17, 24, 1), hms(17, 25, 1), 28], [hms(17, 25, 1), hms(17, 27, 1), 27],
      [hms(17, 27, 1), OFF, 26], [OFF, E, 0]];
    d.hlt.pv.push([hms(17, 18, 40), 156.8, "s"]);
    d.mt.pv.push([hms(17, 18, 40), 139.6, "s"]);
    if (fin) { d.hlt.pv.push([hms(17, 41, 30), 154.9, "s"]); d.mt.pv.push([hms(17, 41, 30), 137.2, "s"]); }
    return d;
  }
  /* the boil power set to 2 % at 16:10 (#keepboil, #letfall: the #hop day at 16:31:10). Ticked, BoilPower cycles: 5½ min at
     2 % falling to 206.6 °F, where it lets go, then full power until 210.2 °F, with a little overshoot. Unticked from
     16:10:21, it stays at 2 % and the wort keeps falling. */
  if (scene === "keepboil" || scene === "letfall") {
    const d = gDemo("hop"), bk = d.bk, fall = scene === "letfall";
    bk.pv = bk.pv.filter(k => k[0] <= hms(15, 30, 4)).concat([[hms(15, 36), 212.0, "s"], [hms(16, 10), 212.0, "h"]]);
    if (fall) {
      bk.pv.push([hms(16, 15, 30), 207.4, "l"], [hms(16, 31, 10), 199.3, "l"]);
      bk.out = [[hms(11, 58), hms(15, 1, 47), 0], [hms(15, 1, 47), hms(15, 29, 30), 100], [hms(15, 29, 30), hms(16, 10), 45], [hms(16, 10), E, 2]];
    } else {
      bk.pv.push([hms(16, 15, 30), 206.6, "l"], [hms(16, 18, 10), 210.2, "l"], [hms(16, 18, 40), 211.0, "e"], [hms(16, 24, 10), 206.6, "l"],
        [hms(16, 26, 50), 210.2, "l"], [hms(16, 27, 20), 211.0, "e"], [hms(16, 31, 10), 207.9, "l"]);
      bk.out = [[hms(11, 58), hms(15, 1, 47), 0], [hms(15, 1, 47), hms(15, 29, 30), 100], [hms(15, 29, 30), hms(16, 10), 45], [hms(16, 10), hms(16, 15, 30), 2],
        [hms(16, 15, 30), hms(16, 18, 10), 100], [hms(16, 18, 10), hms(16, 24, 10), 2], [hms(16, 24, 10), hms(16, 26, 50), 100], [hms(16, 26, 50), E, 2]];
    }
    d.hlt.pv.push([hms(16, 31, 10), 162.4, "s"]);
    d.mt.pv.push([hms(16, 31, 10), 146.9, "s"]);
    return d;
  }
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
  /* #stopped, #reset, #reset-done: STOP at 14:32:31 took the mash tun's AUTO off, and its HERMS with it: no SV from then,
     and the HLT element off */
  const end = ["stopped", "reset", "reset-done"].includes(scene) ? hms(14, 32, 31) : E;
  return {
    /* #reset-done: CraftBeerPi has forgotten the steps' start times, so no step marks, and DAY is the last 8 hours */
    start: scene === "reset-done" ? now - 8 * 3600 : hms(12, 40), steps: scene === "reset-done" ? [] : steps, until: scene === "offline" ? hms(14, 32, 10) : null,
    hlt: {pv: [...hltMash, [hms(14, 32, 31), 154.2, "s"]], sv: [[hms(12, 40), hms(14, 9, 40), 131.4], [hms(14, 9, 40), end, 154.4]],
      out: [...hltOut, [hms(14, 17, 30), end, [52, 72]], ...(end < E ? [[end, E, 0]] : [])]},
    mt: {pv: [...mtMash, [hms(14, 32, 31), 148.6, "s"]], sv: [[hms(12, 40), hms(14, 9, 40), 126.0], [hms(14, 9, 40), end, 149.0]]},
    bk: {pv: [[hms(12, 40), 68.0]], out: [[hms(12, 40), E, 0]]}
  };
}
/* one row every 10 s up to now, the moment's own time: [time, PV, SV or null, OUT % or null]. The small wobble fades
   out at now, so each line ends on the reading its faceplate shows. x: for the pre-brew moments (gDemo) */
function history(scene, now, x) {
  const d = gDemo(scene, now, x), end = d.until || now, seed = {hlt: 1.3, mt: 2.9, bk: 4.4};
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

export { RECIPE, SPARGE_STEP, BIG_ADDS, VNAME, KNAME, PROBE, VACT, ACT, HERMS_DELTA, BOIL_TH, BOOK, SCENES, history, noTargetBanner, pauseBanner, spargeBanner, boilHoldBanner, boilStartLine, tfmt, tBanner, byHandBanner, versions,
  SW_STEPS, swStartAt, swPlanLine };

// Not the mockup's: two moments of the screen's own, for checking how the title bar holds what CraftBeerPi
// really asks. Not compared with the mockup.
// ?demo=resume: the server restarted mid-mash and asks, with two buttons.
// ?demo=longprompt: the hold before the boil, CraftBeerPi's longest question. It is the mockup's #boil-hold moment,
// kept under this name for the links that use it.
const EXTRA = {
  resume: () => Object.assign(mash(), {
    banner: {tone: "prompt", title: "Resume brew?", text: "'Saccharification' was interrupted when the server stopped. About 16 min 19 s of it had already run, and that is remembered - resuming continues from there rather than starting the step again. Check your kettle first, then choose.",
      acts: [{label: "RESUME", cmd: "b:ok"}, {label: "SKIP THIS STEP", cmd: "b:ok"}]},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: false, pct: 0}},
    v: {hlt: {pv: 152.9, sv: 154.4, own: 168.0, mode: "manual"}, mt: {pv: 147.8, sv: 149.0, mode: "manual"}, bk: {pv: 68.0, sv: null, mode: "manual"}},
    recipe: {state: "stopped", cur: 2, left: 23 * 60 + 41, adds: []}
  }),
  longprompt: () => SCENES["boil-hold"]()
};

export { EXTRA };
