// The approved mockup's demo data (design/brewday/brew-day.js, and graphs.js for the graphs' history), unchanged: the
// moments of a brew day it shows, with its proposed boil kettle (?bk=power), which the screen builds. The screen's demo
// mode (?demo=mash, sparge, sparge-heat, sparge-ready, sparge-run, sparge-batch, boil-hold, hop, boilpower, heatup, pause,
// pause-long, boiling, hold, whirlpool, finished, keepboil, letfall, bktarget, handhold, fail, manual, offline, notarget,
// notarget-hlt, timers, timer-done, timer-new, timer-names, timer-nonames, timers-hand or sound-allow) runs on this, so
// it can be compared with the mockup pixel for pixel.

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
   imported on core 4.7.7.post35 or later has it: a SpargeStep on the HLT (Scott, 10 Nov: "sparge step needs to let the
   HLT get up to mash out temperature before pumping wort over to boil kettle. I also may do a "batch sparge" - it
   should be flexible to let me do either"). It heats the sparge water on the HLT's own AUTO with the mash tun's AUTO
   off, switches each pump off for its hose to move (the wort pump as it starts, the HLT pump as the water is ready:
   core 1c08d4c), asks "Sparge started", then leaves both pumps to the brewer. The sparge-… moments and boil-hold use
   it (sparge4: the screen's demo recipe then has it as step 4); every other moment keeps the MashStep. */
const SPARGE_STEP = {n: "Sparge", type: "SpargeStep", temp: 168, min: 40, k: "hlt"};
const WFY = "WAITING FOR YOU";
const VNAME = {hlt: "Hot liquor tank", mt: "Mash tun", bk: "Boil kettle"};
const KNAME = {hlt: "HLT", mt: "Mash Tun", bk: "Boil Kettle"}; // the kettles' names in CraftBeerPi, which its own messages use
const VACT = {hlt: ["hltEl", "hltPump"], mt: ["wortPump"], bk: ["bkEl"]};
const ACT = {
  hltEl: {name: "HLT ELEMENT", kind: "heat", v: "hlt"},
  hltPump: {name: "HLT PUMP", kind: "pump", v: "hlt", override: true}, // the rig's Recirc_PUMP: its own override switch can run it, and CraftBeerPi can't see that switch
  wortPump: {name: "WORT PUMP", kind: "pump", v: "mt"},
  bkEl: {name: "BOIL ELEMENT", kind: "heat", v: "bk"}
};
const HERMS_DELTA = 5.4; // PID_HERMS DeltaTemp in the simulator
/* BoilPower, the boil kettle's logic: below its boil point it heats at full power (Max_Output); once the wort reaches it, it
   holds the element at Boil_Power, which Scott sets with set_boil_power (45 % on the simulators), until the wort falls
   3.6 °F (2 °C) below again. From 0.0.3.post7 the boil point is a setting of its own, Boil_Threshold (BOIL_TH, 210.2 °F on
   Scott's set-up; set_boil_at), and the kettle's target is an ordinary target, as on the HLT: within 3.6 °F of the boil
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
    s.events[0][2] = "answered"; s.events[0][3] = "";
    s.events.unshift(["16:00:31", "Hop Alert answered: Added", "confirmed", "ok"]);
    return Object.assign(s, {base: "hop", open: {edit: {v: "bk", kind: "pwr", what: "boil", val: 40}}});
  },
  /* the boil kettle's three phases in AUTO (Scott, 10 Nov: the power and temperature controls were "not intuitive").
     Heating up: the Boil step has started and BoilPower runs at full power until 210.2 °F; the step's 90 min timer waits
     for that. Same day and history as #hop, 18 minutes before it boils. A recipe started from its first step went back
     to the usual boil power, here after a brew day that ended at 35 % (in LOG). */
  heatup: () => Object.assign(SCENES.hop(), {
    t: 15 * 3600 + 12 * 60, banner: null, base: "hop",
    v: {hlt: {pv: 171.1, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 158.1, sv: null, mode: "manual"}, bk: {pv: 170.8, sv: 210.2, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 100}},
    recipe: {state: "running", cur: 4, left: 90 * 60, adds: [], wait: "HEATING"},
    events: [
      ["15:01:47", "Boil started, boil kettle AUTO", "by recipe", ""],
      ["15:01:45", "Boil answered: Start the boil", "confirmed", "ok"],
      ["14:58:30", `Boil: ${boilHoldBanner(RECIPE.steps[4]).text}`, "answered", ""],
      ["14:58:30", "Sparge finished", "by recipe", ""],
      ["10:02:16", "Boil power back to your usual 45 % (was 35 %)", "by recipe", ""]
    ]
  }),
  /* boiling hard: the simulator boils at 212 °F, so PV sits above the 210.2 °F boil point (Scott on 8012, 10 Nov: "It
     pegs at 212 - over SV"). BoilPower holds the element at the boil power. */
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
  /* a boil-over: 76 s into the boil the hot break foams up, and Scott taps the element button at 15:30:55: the heat pauses */
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
  /* the whirlpool hold: the stand cooled to 166.3 °F, Scott answered "Heat and hold?", and the step set the kettle's target
     to 170 °F, which BoilPower holds at a power that eases from full to Hold_Power (30 %) as the wort closes in: 35 % at
     0.6 °F below. The boil power isn't used. */
  hold: () => Object.assign(SCENES.hop(), {
    t: 17 * 3600 + 18 * 60 + 40, banner: null,
    v: {hlt: {pv: 156.8, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 139.6, sv: null, mode: "manual"}, bk: {pv: 169.4, sv: 170.0, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 35}},
    recipe: {state: "running", cur: 6, left: 9 * 60 + 30, adds: []},
    /* as the screen logs them: read from the core, screen.js's observe() and BoilPower (the dashboard agent's hand-off of
       12 Nov, afternoon). The Boil's "Boiling completed" is one of the routine notices the screen leaves out; Whirlpool
       Hop, a NotificationStep, asks a moment after it starts and moves on when NEXT STEP answers it; the stand asks in
       CraftBeerPi's own words; and the new BoilPower says what it does as it starts to hold */
    events: [
      ["17:14:32", `${KNAME.bk}: Holding 170.0, its target, instead of boiling. Below it, it heats at 100% while the wort is more than 7.2 below, easing to 30% as it reaches the hold; then it rests until the wort is 3.6 below. To boil, set its target to 206.6 or above.`, "from CraftBeerPi", ""],
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
  /* the same whirlpool hold with the wort pump running, as Scott whirlpools (Scott, 12 Nov: "whirlpool / hop-stand step
     pump symbol shows it going through the HERMS coil"). From the boil's start the drawing has the pump at the boil
     kettle, on a short loop through the chiller (he chose it on 12 Nov), lit here */
  whirlpool: () => {
    const s = SCENES.hold();
    s.a.wortPump = {on: true};
    s.events.splice(s.events.findIndex(e => e[0] < "17:08:16"), 0, ["17:08:16", "WORT PUMP started", "confirmed", "ok"]);
    return Object.assign(s, {base: "hold"});
  },
  /* the recipe has finished, and Scott chills the wort. The #whirlpool day: the stand ended at 17:28:10 and switched the
     boil kettle off, and the wort pump runs on through the chiller. CraftBeerPi keeps the recipe's steps, all done, so the
     pump stays drawn at the boil kettle until a recipe is loaded or reset, or the mash tun's AUTO is on (Scott, 12 Nov).
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
  /* Scott on 8012, 10 Nov: he set the boil power to 2 % and asked why the kettle held about 210 °F. At 2 % the kettle can't
     hold a boil; BoilPower lets go 3.6 °F below its boil point and heats at full power until it boils again, so it cycles
     between about 206 and 211 °F. keepboil: KEEP BOILING ticked, 3¾ min into a fall at 2 %, its line saying what comes
     next. letfall: unticked at 16:10:21, so BoilPower stays at 2 % and the wort falls below a boil, as Scott chose. Both:
     the #hop day at 16:31:10. */
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
     on every page (Scott, 10 Nov), once per pause, taken down when the heat carries on or AUTO stops. The boil's timer has
     carried on all along, as Scott chose. */
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
  /* a hop stand by hand, with no recipe (Scott, 10 Nov: "Set the boil kettle's target to 170 °F, like the HLT, and it holds
     there"). He boiled by hand in AUTO from 10:21 and set the target to 170 °F at 12:41:10 with AUTO still on: the element
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
     step's 40 min wait for "Sparge started"; the drawing marks the four valves to change. As it asked, CraftBeerPi
     switched the HLT pump off for its hose to move (core 1c08d4c), so both pumps are off, and the prompt says so */
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
  /* 15:12:40, a fly sparge: Scott set the hoses, started both pumps and pressed Sparge started at 15:05:02. That
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
      ["15:05:02", "Sparge: sparge started, until NEXT STEP", "confirmed", "ok"],
      ["15:05:02", "HLT AUTO off, so its element won't run as the HLT empties", "by recipe", ""],
      ["15:04:58", "WORT PUMP started", "confirmed", "ok"],
      ["15:04:10", SPARGE_ASKED, "answered", ""],
      ["14:56:21", "Sparge: heating the sparge water to 168 °F, mash tun MANUAL", "by recipe", ""]
    ];
    return s;
  },
  /* 15:53:12, after the fly sparge (#sparge-run). Its 40 min ran out at 15:45:02. CraftBeerPi switched the HLT pump off
     and left the wort pump draining the mash tun into the boil kettle (core 1c08d4c), and holds before the boil
     (CONFIRM_BEFORE_BOIL, as on Scott's rig): nothing heats until Scott starts it. Its question is CraftBeerPi's longest,
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
  /* the timers (Scott, 11 Nov: "add the timers that design agent discussed"). #timers: the #mash day, with Stir counting
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
  /* AUTO with no target (Scott on 8012, 10 Nov: "I have Mash Tun "Auto" on but HLT is off"). The mash tun's target was 0,
     left from the last recipe, and he held AUTO at 13:26. PID_HERMS takes 0 as a real target: it holds the mash at 0 °F,
     so it never asks the HLT for heat, though its pump still runs. CraftBeerPi warns after 5 s (M64). */
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
  })
};
/* CraftBeerPi's kept warning when a kettle's AUTO has run 5 s with no target (unset, 0 or below), taken down by itself once
   the kettle has a target or leaves AUTO (M64). BoilPower never raises it: it puts its boil point in as the target. */
function noTargetBanner(v) {
  return {tone: "prompt", title: `No target for the ${KNAME[v]}`, notgt: v, act: "OK", cmd: "b:ok",
    text: `AUTO is on with no target temperature, so ${v === "mt" ? "the HLT" : "it"} won't heat. Set a target, or switch to MANUAL.`};
}
/* the SpargeStep's kept prompt, titled with the step's name, in core 1c08d4c's words (SPARGE_READY_TEXT, SPARGE_NOW_TEXT).
   It says which pumps are off for the brewer's hoses (Scott, 11 Nov: "Any time I need to change hoses or "valves" that
   respective pump should be off"), as CraftBeerPi finds them when it asks: a, the pumps as they are then. Its one button
   answers it */
const SPARGE_PUMPS_OFF = {"hlt,wort": "both pumps are off", hlt: "the HLT pump is off", wort: "the wort pump is off"};
function spargeBanner(temp, a) {
  const off = SPARGE_PUMPS_OFF[[!a.hltPump.on && "hlt", !a.wortPump.on && "wort"].filter(Boolean).join(",")] || "";
  return {tone: "prompt", title: "Sparge", sparge: true, act: "SPARGE STARTED", cmd: "b:sparge",
    text: temp ? `The sparge water is ready at ${temp} °F${off ? `, and ${off}` : ""}. Set the hoses or valves for a fly or a batch sparge, start the pumps by hand, then press Sparge started, which switches the HLT's AUTO off.`
      : `${off ? `${off[0].toUpperCase()}${off.slice(1)}. ` : ""}Set the hoses or valves for a fly or a batch sparge, start the pumps by hand, then press Sparge started.`};
}
/* its line in the event log, as #sparge-ready asks it with both pumps off, for the moments after it */
const SPARGE_ASKED = (q => `${q.title}: ${q.text}`)(spargeBanner(168, {hltPump: {on: false}, wortPump: {on: false}}));
/* the hold before the boil (CraftBeerPi's StepController, with CONFIRM_BEFORE_BOIL Yes, as on Scott's rig): the boil waits,
   with nothing active, until the brewer starts it. Its words are BoilStep.wait_for_brewer's in core 1c08d4c. Starting the
   boil switches heat on, so here, as with START, it takes a held press (the Held Heat Rule) */
function boilHoldBanner(s) {
  return {tone: "prompt", title: s.n, boilHold: true, act: "START THE BOIL", cmd: "b:boil", hold: true,
    text: "Ready to boil? Move the wort to the boil kettle first - the dashboard is yours meanwhile. The boil kettle stays off until you press Start the boil, or Start on the Brew Steps page. That also switches the wort pump off, so you can move its hoses. (Set CONFIRM_BEFORE_BOIL to No to go straight on.)"};
}
/* BoilPower's warning for a forgotten pause (Scott, 10 Nov): after 2 brewing minutes paused, kept on every page with OK,
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
  /* boiling and hold: the #hop day, carried on. The simulator boils at 212 °F, so the boil kettle settles there. At 17:00:04
     the boil ends; the wort is chilled to 170 °F for the whirlpool and cools to 166.3 °F in the stand, and from 17:14:31
     BoilPower holds 170 °F, the kettle's own target. finished: the stand ends at 17:28:10, switching the boil kettle off,
     and the chiller takes the wort down to 88.4 °F by 17:41:30 */
  if (scene === "boiling" || scene === "hold" || scene === "finished") {
    const d = gDemo("hop"), bk = d.bk, fin = scene === "finished", OFF = fin ? hms(17, 28, 10) : E;
    bk.pv = bk.pv.filter(k => k[0] <= hms(15, 30, 4)).concat([[hms(15, 36), 212.0, "s"], [hms(17, 0, 4), 212.0, "h"]]);
    if (scene === "boiling") return d;
    d.steps.push([hms(17, 0, 4), 6], [hms(17, 8, 10), 7]);
    bk.pv.push([hms(17, 1, 30), 209.8, "s"], [hms(17, 7, 30), 170.6, "e"], [hms(17, 8, 10), 170.4, "s"], [hms(17, 14, 20), 166.3, "s"], [hms(17, 18, 40), 169.4, "e"]);
    if (fin) bk.pv.push([hms(17, 22), 170.0, "s"], [OFF, 170.0, "h"], [hms(17, 29, 10), 169.2, "s"], [hms(17, 41, 30), 88.4, "e"]);
    bk.sv = [[hms(15, 1, 47), hms(17, 0, 4), 210.2], [hms(17, 14, 31), OFF, 170.0]];
    bk.out = [[hms(11, 58), hms(15, 1, 47), 0], [hms(15, 1, 47), hms(15, 29, 30), 100], [hms(15, 29, 30), hms(17, 0, 4), 45], [hms(17, 0, 4), hms(17, 14, 31), 0],
      [hms(17, 14, 31), hms(17, 15, 40), 64], [hms(17, 15, 40), hms(17, 16, 50), 54], [hms(17, 16, 50), hms(17, 17, 50), 44], [hms(17, 17, 50), OFF, 35], [OFF, E, 0]];
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

export { RECIPE, SPARGE_STEP, VNAME, KNAME, VACT, ACT, HERMS_DELTA, BOIL_TH, BOOK, SCENES, history, noTargetBanner, pauseBanner, spargeBanner, boilHoldBanner, tfmt, tBanner };

// Not the mockup's: two moments of the screen's own, for checking how the title bar holds what CraftBeerPi
// really asks (the dashboard agent's review, 9 Nov). Not compared with the mockup.
// ?demo=resume: the server restarted mid-mash and asks, with two buttons.
// ?demo=longprompt: the hold before the boil, CraftBeerPi's longest question. The mockup has it now, as #boil-hold
// (11 Nov), so this is that moment, kept for the links that name it.
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
