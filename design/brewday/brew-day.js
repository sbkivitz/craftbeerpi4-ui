"use strict";
/* ---------- demo data (from the brewer's simulator config; nothing here talks to CraftBeerPi) ---------- */
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
/* the recipe's steps as the book has them: each moment starts from them (load) */
const RECIPE_STEPS = RECIPE.steps.slice();
const VNAME = {hlt: "Hot liquor tank", mt: "Mash tun", bk: "Boil kettle"};
/* step 4 as recipes in the book have it (a MashStep on the mash tun, whose HERMS runs the wort pump), and as a recipe
   imported on core 4.7.7.post35 or later has it: a SpargeStep on the HLT, which lets the HLT get up to mash-out
   temperature before any wort is pumped over to the boil kettle, and suits a batch sparge as well as a continuous one.
   It heats the sparge water on the HLT's own AUTO with the mash tun's AUTO off, switches each pump off for its hose to
   move (the wort pump as it starts, the HLT pump as the water is ready), asks "Sparge started", then leaves both pumps
   to the brewer. The #sparge-… moments and #boil-hold use it (load()); every other moment keeps the MashStep. */
const SPARGE_MASH = RECIPE.steps[3];
const SPARGE_STEP = {n: "Sparge", type: "SpargeStep", temp: 168, min: 40, k: "hlt"};
/* the boil's additions as the demo recipe has them, and a recipe with eight, whose import kept the first six for the boil
   step's reminders (longest first) and named the last two in a warning: Citra at 5 minutes, Amarillo at the end */
const BOIL_ADDS = RECIPE.steps[4].adds;
const BIG_ADDS = [[60, "Centennial", "1.00 oz"], [30, "Cascade", "1.00 oz"], [20, "Willamette", "2.00 oz"], [15, "Whirlfloc tablet", "1"], [15, "Yeast nutrient", "1 tsp"], [10, "Citra", "1.00 oz"]];
const BIG_MISSED = [["1.50 oz Citra", 5], ["1.00 oz Amarillo", 0]];
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
   holds the element at Boil_Power, which the brewer sets with set_boil_power (45 % on the simulators), until the wort
   falls 3.6 °F (2 °C) below again. In an older BoilPower, without set_boil_at (?bk=today), the threshold is
   BoilPower._threshold: the kettle's target when it has one (the Boil step sets 210.2 °F), else its Boil_Threshold
   setting (BOIL_TH, 210.2 °F on the brewer's set-up), else 99 °C. The new boil kettle (?bk=power) follows the
   newer BoilPower: the boil point is a setting of its own, Boil_Threshold (set_boil_at), and the kettle's target is an
   ordinary target, as on the HLT. A target within 3.6 °F of the boil point or above, or none, means BOIL; a lower one
   is a temperature to hold (bkHoldT). */
const BOIL_TH = 210.2;
const boilFrom = () => BK === "power" ? st.v.bk.boilAt ?? BOIL_TH : st.v.bk.sv > 0 ? st.v.bk.sv : BOIL_TH;
const boilFromText = () => String(+boilFrom().toFixed(1)); // 210.2, or 170 for a 170.0 °F target
const BOOK = [ // the simulator's Recipe Book (config/recipes/*.yaml)
  {n: "Craftbeerpi Test Recipe v5", d: "7 steps · mash 126, 149 and 168 °F · 90 min boil"},
  {n: "Craftbeerpi Test Recipe v4", d: "6 steps · mash 126 and 149 °F · 90 min boil"},
  {n: "Craftbeerpi Test Recipe v3", d: "6 steps · mash 152 °F, mash out 168 °F · 90 min boil"},
  {n: "BrewStart ready-by demo", d: "3 steps · hot strike water by a set time, 152 °F"}
];
/* steps for v4 and v3, so the proposal's OTHER RECIPE (?col=new) can load them: demonstration data that matches their
   summaries above, as the simulator's book gives the mockup only those. v5 is RECIPE's own */
const BOOK_STEPS = {
  1: [{n: "MashIn", temp: 126, k: "mt", note: "Add the malt when it reaches 126 °F"}, {n: "Protein Rest", temp: 126, min: 20, k: "mt"},
    {n: "Saccharification", temp: 149, min: 40, k: "mt"}, {n: "Boil", temp: 210.2, min: 90, k: "bk", boil: true, adds: [[60, "Centennial", "2.00 oz"], [10, "Cascade", "2.00 oz"]]},
    {n: "Whirlpool Hop", k: "bk", note: "Cool down to 170 °F. Then add 1.00 oz Citra."}, {n: "Whirlpool", temp: 170, min: 20, k: "bk"}],
  2: [{n: "MashIn", temp: 152, k: "mt", note: "Add the malt when it reaches 152 °F"}, {n: "Saccharification", temp: 152, min: 60, k: "mt"},
    {n: "Mash out", temp: 168, min: 10, k: "mt"}, {n: "Boil", temp: 210.2, min: 90, k: "bk", boil: true, adds: [[60, "Magnum", "1.00 oz"]]},
    {n: "Whirlpool Hop", k: "bk", note: "Cool down to 170 °F. Then add 2.00 oz Mosaic."}, {n: "Whirlpool", temp: 170, min: 20, k: "bk"}]
};
const RECIPE_NAME = RECIPE.name;
/* the strike water helper (STRIKE-WATER.md). The brewer's own flow (the rig page, step 9b): BrewStart (1.3.0), Ready by
   on the HLT, which works out when heating must start, then at that time heats all the water in the HLT, strike and
   sparge, on the HLT's own AUTO, and holds it until the strike water has been moved to the Mash Tun and Next pressed;
   then the recipe's steps from MashIn on the Mash Tun. Under Kal's way (The Electric Brewery's method) the strike water
   is at the rest temperature, as the recipe comes; USE changes it to the strike temperature the forecast works out.
   The moments put BrewStart in front of Test Recipe v5, with the numbers its BeerSmith export carries: 20 lb of grain
   at 1.5 qt/lb, so 7.50 gal for the grain (INFUSE_AMOUNT), plus the equipment profile's recoverable mash deadspace,
   0.76 gal, which BeerSmith adds to the first infusion (DISPLAY_INFUSE_AMT 33.04 qt), so it is never added again; the
   mash tun, 33 lb of steel (TUN_WEIGHT, TUN_SPECIFIC_HEAT 0.12); and BeerSmith's own strike temperature, INFUSE_TEMP
   134.6 °F, worked out for grain at 65 °F (GRAIN_TEMP). The export doesn't say how much water is in the HLT: that is
   BrewStart's water volume (vol, from the moment: swDay), which also sets its Campden dose. BrewStart's element power
   (Heater_Watts) is the HLT element's, SW_WATTS */
const SW_WATTS = 6500;
/* the question that holds the strike water until it has been moved, in CraftBeerPi's words: BrewStart's, or in the
   older shape the strike water step's */
const SW_ASK = "Move the strike water to the Mash Tun, then press Next";
/* BrewStart's question while it holds the strike water (1.3.0.post7), either timing */
const bsHoldWords = (temp, mt = "Mash Tun") => `Strike water hot and holding at ${(+temp).toFixed(1)} °F. When you've moved the strike water to the ${mt} and connected the hoses and pumps for recirculating, press NEXT.`;
/* the steps the strike water moments put in front of the recipe (load): BrewStart alone, as the brewer's recipe has it.
   ?sws=step (SWS) adds the older shape's strike water step after it, a MashInStep on the HLT that BrewStart hands over
   to at its heating start and that heats the water and asks for it to be moved, kept for comparison */
const SW_STEPS = [{n: "BrewStart", type: "BrewStart", k: "hlt", ready: "07:00", campden: true, watts: SW_WATTS}];
const SW_STRIKE = {n: "Strike water", type: "MashInStep", k: "hlt", note: SW_ASK};
const SW_FROM = {grainLb: 20, forGrain: 7.5, dead: 0.76, tunLb: 33, bs: 134.6, bsGrain: 65, bsTun: 72};
/* Test Recipe v5 as the Recipe Book keeps it: its strike water at the rest, and BrewStart's water (swAsSaved) */
const SW_PLAN0 = 126, SW_VOL0 = 15;
/* the water a BrewStart added on Brew Day (+ BrewStart) heats: all the strike and sparge water the recipe needs, as
   CraftBeerPi works it out from the recipe's mash numbers */
const SW_NEED = 25.4;
/* how far above the rest a strike temperature may be before the screen won't offer it: a mistyped grain bill would
   scald the enzymes before anyone noticed (MashInStep.MAX_STRIKE_RISE_C, 15 °C) */
const SW_MAX_RISE = 27;
/* the hottest strike water the box sets, °F (MashInStep.MAX_STRIKE_ABS_C, 82 °C), kept safely below what would scald
   the first grain the water touches; CraftBeerPi sends it in the state as `ceiling`. A USE over it is too far to
   offer, and BACK TO to a plan over it is greyed. MashInStep itself still heats to any temperature typed on Brew
   Steps */
const SW_CEIL = 179.6;
/* the strike water in use: within half a degree of the worked-out figure, so the grain warming a little through the
   morning doesn't take USE back from BACK TO */
const SW_SAME = 0.5;
/* how long CraftBeerPi takes to work USE out in the mockup, in seconds. The server works it out in a process of its
   own, replaying the dough-in hundreds of times: on the Pi about 12 to 55 s, an estimate not yet measured there */
const SW_WORK_S = 30;
/* how long after USE CraftBeerPi takes to work out which unmeasured numbers would raise it most (the levers), in the
   mockup, in seconds: eleven more plans, about 40 s on a PC and 3 to 6 minutes on the Pi. USE doesn't wait for them */
const SW_LEVER_S = 60;
/* BrewStart's Campden dose for v gal of water, as BrewStart works it out (campden_tablets, format_tablets): one tablet
   per 20 gal, rounded up to a quarter and never under one, written "¾", "1" or "1¼" */
function swCampden(v) {
  const q = Math.max(1, Math.ceil(v / 20 * 4 - 1e-9)), w = Math.floor(q / 4);
  return `${w || ""}${["", "¼", "½", "¾"][q % 4]} tablet${q > 4 ? "s" : ""}`;
}
/* BrewStart's Ready by plan, from the rig's measured heat-up (rig page 9b: 15 gal from 60 to 152 °F in 42 min, so
   2.19 °F a minute, plus 10 spare minutes) */
const SW_RATE = 2.19, SW_SPARE = 10;
/* the brew-day morning's moments run on from the night before, so the clock and the graphs carry on past midnight */
const DAY2 = 24 * 3600;

/* a question's line and its answer's are CraftBeerPi's words, as screen.js logs them (title: message, then
   "title answered: button"). The malt question is an imported recipe's MashIn Notification (upload_controller), and its
   button is MashInStep's Next Step */
const MASH_EVENTS = [
  ["14:31:52", "HLT PUMP started", "confirmed", "ok"],
  ["14:16:19", "Saccharification: 149 °F reached, 40 min timer started", "by recipe", ""],
  ["14:09:40", "Saccharification started, mash tun target 149.0 °F", "by recipe", ""],
  ["14:09:38", "Protein Rest finished", "by recipe", ""],
  ["13:27:05", "MashIn answered: Next Step", "confirmed", "ok"],
  ["13:26:58", "MashIn: Target temperature reached. Please add malt.", "answered", ""]
];
/* a boil step's start, as screen.js logs any step's start: its kettle's target. With the new boil kettle a target
   at or above where BOIL starts is BOIL, as TARGET's editor and the window say ("Boil kettle target BOIL"); with an
   older BoilPower (?bk=today) it shows as a temperature. `from` is the boil point, so a moment can call it before the
   screen has state */
const boilStartLine = (s, from = BOIL_TH) => `${s.n} started, boil kettle target ${BK === "power" && s.temp >= +(from - BOIL_MARGIN).toFixed(1) ? "BOIL" : `${s.temp.toFixed(1)} °F`}`;
/* the #hop day from the end of the sparge (the MashStep) to the boil's start, newest first, in the order screen.js logs
   it: a step's line first, then what CraftBeerPi says because of it. The sparge's end switches the HLT pump off, and the
   boil waits for the brewer, who starts it with START THE BOIL. The wort pump is already off, so the boil's start has
   no pump to switch off */
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
  /* boil power mid-recipe, which the brewer can set at any time, also while a recipe runs: step 5, the Boil, runs the
     boil kettle's AUTO; the hop is in, and the brewer turns the boil down from 45 to 40 % */
  boilpower: () => {
    const s = SCENES.hop();
    s.t = 16 * 3600 + 4 * 60 + 12; s.banner = null;
    s.recipe.left = 55 * 60 + 48; s.recipe.adds = ["done"];
    s.events[0][2] = "answered"; s.events[0][3] = "";
    s.events.unshift(["16:00:31", "Hop Alert answered: Added", "confirmed", "ok"]);
    return Object.assign(s, {base: "hop", open: {edit: {v: "bk", kind: "pwr", what: "boil", val: 40}}});
  },
  /* the boil kettle's three phases in AUTO, for boil-kettle.html, which shows how the power and temperature controls
     read in each. Heating up: the Boil step has started and BoilPower runs at full power until 210.2 °F; the step's
     90 min timer waits for that. Same day and history as #hop, 18 minutes before it boils. */
  heatup: () => Object.assign(SCENES.hop(), {
    t: 15 * 3600 + 12 * 60, banner: null, base: "hop",
    v: {hlt: {pv: 171.1, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 158.1, sv: null, mode: "manual"}, bk: {pv: 170.8, sv: 210.2, mode: "auto"}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: 100}},
    recipe: {state: "running", cur: 4, left: 90 * 60, adds: [], wait: true},
    events: [
      ...boilDay(),
      /* the new boil kettle: a recipe started from its first step goes back to the usual boil power, here after a
         brew day that ended at 35 % (in LOG) */
      ...(BK === "power" ? [["10:02:16", "Boil power back to your usual 45 % (was 35 %)", "by recipe", ""]] : [])
    ]
  }),
  /* boiling hard: the simulator boils at 212 °F, so PV sits above the 210.2 °F threshold, over SV. BoilPower holds the
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
  /* a boil-over: 76 s into the boil the hot break foams up. With the new boil kettle the brewer taps the element
     button at 15:30:55 and the heat pauses; on the older faceplate (?bk=today) the element button is locked while AUTO
     runs, so it keeps heating at 45 % */
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
  /* the whirlpool hold: the stand has cooled to 166.3 °F, the brewer has answered "Heat and hold?", and BoilPower holds
     170 °F. The boil power isn't used. With the newer BoilPower (?bk=power) the step sets the kettle's own target to
     170 °F, and from 0.0.3.post8 a PID holds it. On the simulators' kettle, as the plugin's own test models it, it
     climbs slowly so as not to pass 170 °F: 52 % at once, 59 % a minute on as the integral builds, then easing as the
     brake on the rise comes in. At 17:18:40, 4 minutes in, the wort is at 168.4 °F with the element at 37 %; it
     reaches 170 °F at about 17:25:30 and holds it at 26 %. An older BoilPower (?bk=today) holds a separate Hold_Target
     at a power that eases from full to Hold_Power (30 %): 35 % at 169.4 °F. The Boil step leaves the kettle's target
     at 0, so it shows its 210.2 °F threshold as the target: the older faceplate says SV 210.2 and
     "40.8 °F below target". */
  hold: () => Object.assign(SCENES.hop(), {
    t: 17 * 3600 + 18 * 60 + 40, banner: null,
    v: {hlt: {pv: 156.8, sv: 168.0, own: 168.0, mode: "manual"}, mt: {pv: 139.6, sv: null, mode: "manual"},
      bk: BK === "power" ? {pv: 168.4, sv: 170.0, mode: "auto"} : {pv: 169.4, sv: 210.2, mode: "auto", hold: 170.0}},
    a: {hltEl: {on: false, pct: 0}, hltPump: {on: false}, wortPump: {on: false}, bkEl: {on: true, pct: BK === "power" ? 37 : 35}},
    recipe: {state: "running", cur: 6, left: 9 * 60 + 30, adds: []},
    /* as the screen logs them, read from the core, screen.js's observe() and BoilPower; the stand's question and its
       answer are read the same way. The Boil's "Boiling completed" is one of the routine notices the screen leaves out;
       Whirlpool Hop, a NotificationStep, asks a second after it starts and moves on when NEXT STEP answers it; the
       stand asks in CraftBeerPi's own words; and the newer BoilPower says what it does as it starts to hold (an older
       one speaks for itself, in words the mockup doesn't have). Its words are BoilPower 0.0.3.post8's */
    events: [
      ...(BK === "power" ? [["17:14:32", `${KNAME.bk}: Holding 170.0, its target, instead of boiling: a PID sets the element's power, up to 100%. To boil, set its target to 206.6 or above.`, "from CraftBeerPi", ""]] : []),
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
  /* the same whirlpool hold with the wort pump running, as the brewer whirlpools. With ?wp=today the drawing shows it
     going round the HERMS coil into the mash tun, though it serves the boil kettle; ?wp= shows the options for it. The
     same goes for the hop stand (Whirlpool Hop) and the boil */
  whirlpool: () => {
    const s = SCENES.hold();
    s.a.wortPump = {on: true};
    s.events.splice(s.events.findIndex(e => e[0] < "17:08:16"), 0, ["17:08:16", "WORT PUMP started", "confirmed", "ok"]);
    return Object.assign(s, {base: "hold"});
  },
  /* the recipe has finished, and the brewer chills the wort. The #whirlpool day: the stand ended at 17:28:10 and
     switched the boil kettle off, and the wort pump runs on through the chiller. CraftBeerPi keeps the recipe's steps,
     all done, so the pump stays drawn at the boil kettle until a recipe is loaded or reset, or the mash tun's AUTO is
     on; if the pump were drawn back by the mash tun, chilling and the transfer would light the HERMS coil. The drawing
     can't show the wort going on to the fermenter */
  finished: () => {
    const s = SCENES.whirlpool();
    /* the stand's notice comes first: CraftBeerPi sends it as the stand stops, before it marks the step done, so it's
       the step's last words, logged just before its "finished" line. Brewing Complete has been answered here, so its
       question's line says so */
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
  /* the boil power at 2 %, where the kettle seems to hold about 210 °F. At 2 % the kettle can't hold a boil; BoilPower
     lets go 3.6 °F below its threshold and heats at full power until it boils again, so it cycles between about 206
     and 211 °F (about 3 min at 100 %, then 5½ min at 2 %). keepboil: the new boil kettle with KEEP BOILING ticked,
     3¾ min into a fall at 2 %, its line saying what comes next. letfall: unticked at 16:10:21, so BoilPower stays at
     2 % and the wort falls below a boil. Both: the #hop day at 16:31:10. */
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
    /* an older BoilPower can't let it fall: it would be cycling, as in #keepboil */
    if (BK !== "power") return s;
    Object.assign(s.v.bk, {pv: 199.3, keep: false});
    s.events.unshift(["16:10:21", "Keep boiling off", "confirmed", "ok", "the boil power only, even below a boil"]);
    return s;
  },
  /* a forgotten pause: the #pause boil-over, 2 min 15 s on. After 2 brewing minutes paused, CraftBeerPi raises a kept
     warning on every page, once per pause, taken down when the heat carries on or AUTO stops. The boil's timer has
     carried on all along, as a pause stops only the element. With an older BoilPower (?bk=today) there is no pause:
     the boil carries on at 45 %. */
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
  /* a hop stand by hand, with no recipe (the newer BoilPower: the target is BOIL or a temperature to hold, like the
     HLT's). The brewer has boiled by hand in AUTO from 10:21 and set the target to 170 °F at 12:41:10 with AUTO still
     on: the element has gone off, and the wort is cooling towards 170 °F, where it will hold. With an older BoilPower
     (?bk=today) the target can't do this (170 would boil at 45 % from 170 °F up); on CraftBeerPi's own dashboard, "Hold a
     temperature" sets Hold_Target instead. */
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
  /* the same day at 12:41:02, setting that hold: TARGET's box is open with 170.0 typed. With an older BoilPower
     (?bk=today) the same box moves where the boil counts from */
  bktarget: () => {
    const s = SCENES.handhold();
    s.t = 12 * 3600 + 41 * 60 + 2;
    s.v.hlt.pv = 152.0; s.v.mt.pv = 133.9;
    s.v.bk = BK === "power" ? {pv: 212.0, sv: 210.2, mode: "auto", latched: true} : {pv: 212.0, sv: 210.2, mode: "auto"};
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
     step's 40 min wait for "Sparge started"; the drawing marks the four valves to change. With its question, CraftBeerPi
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
  /* 15:12:40, a fly sparge: the brewer has set the hoses, started both pumps and pressed Sparge started at 15:05:02.
     That switched the HLT's AUTO off, so its element won't run as the HLT empties, and started the 40 min. Both pumps
     run: the HLT pump over to the top of the mash tun, the wort pump down to the boil kettle */
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
      ["15:05:02", `Sparge: The HLT's AUTO is off now, so its element won't run as the HLT empties. Sparge timer started. Estimated completion: ${todS("15:45")}`, "from CraftBeerPi", ""],
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
     and left the wort pump draining the mash tun into the boil kettle, and holds before the boil (CONFIRM_BEFORE_BOIL,
     as on the brewer's rig): nothing heats until the brewer starts it. Its question is CraftBeerPi's longest, and the
     screen writes it in the event line word for word. START THE BOIL puts heat on, so it takes a held press, as START
     does; NEXT STEP is greyed (CraftBeerPi would take it as "start the boil"). The screen's ?demo=longprompt */
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
  /* the timers (the default). #timers: the #mash day, with Stir counting down (started 14:24:43) and Yeast set up for
     later; SOUND on. ?timers=today shows these moments with the one rest timer, as the screen keeps it for an older
     CraftBeerPi */
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
      /* the screen for an older CraftBeerPi (?timers=today): its one rest timer has finished */
      s.banner = {tone: "prompt", title: "Rest timer", text: "The rest timer has finished.", act: "OK", cmd: "b:ok"};
      s.events = [["14:32:19", "Rest timer finished", "waiting for you", "wait"], ...MASH_EVENTS.map(e => e.slice())];
      return s;
    }
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
    if (TIMERS !== "new") return s;
    Object.assign(t, {state: "paused", run: 15 * 60, interrupted: true, off: 12 * 60});
    s.events = [["14:12:43", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())];
    return s;
  },
  /* the same cut, with Stir started at 14:10:00: it ran out at 14:25:00, while CraftBeerPi was off, so it comes back run
     out, with its alarm, counting up from then, the time off included */
  "timer-back-done": () => {
    const s = SCENES.timers(), t = s.tmrs[0];
    if (TIMERS !== "new") return s;
    Object.assign(t, {state: "done", left: 0, run: 15 * 60, at: s.t - (7 * 60 + 31), interrupted: true, off: 12 * 60});
    s.banner = tBanner(t, s.tmrs);
    s.events = [["14:32:31", "Stir finished", "waiting for you", "wait"], ["14:10:00", "Stir started, 15:00 to go", "confirmed", "ok"], ...MASH_EVENTS.map(e => e.slice())];
    return s;
  },
  /* the same, before the network has set CraftBeerPi's clock: how long it was off isn't known yet, so neither is how
     long ago Stir ran out ("– –"); Yeast, counting down at the cut, comes back paused */
  "timer-back-unknown": () => {
    const s = SCENES["timer-back-done"](), [t, y] = s.tmrs;
    if (TIMERS !== "new") return s;
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
  /* Stir's editor while it counts down: its time left changes at once, and BACK TO 15:00 is there, as REMOVE is on the
     row. As built before (?trow=today), with REMOVE */
  "timer-change": () => Object.assign(SCENES.timers(), {open: {tedit: {id: 1, name: "Stir", ph: "Stir", set: 15 * 60}}}),
  /* Stir removed 3 s ago, at 14:32:28 with 7:15 to go: its row keeps its place for 5 s, with UNDO. As built before
     (?trow=today), removing a timer with time left asks first, in its editor */
  "timer-removed": () => {
    const s = SCENES.timers(), t = s.tmrs[0];
    if (TROW !== "new") return Object.assign(s, {open: {tedit: {id: t.id, name: t.name, ph: t.name, set: t.set, confirm: true}}});
    s.tmrs = s.tmrs.slice(1);
    s.tgone = {t: Object.assign({run: t.set}, t, {left: t.left + 3}), idx: 0, h: 0, at: s.t - 3};
    s.events = [["14:32:28", "Stir removed, 7:15 to go", "confirmed", "ok"], ...s.events];
    return s;
  },
  /* a timer's time in minutes and seconds, or seconds only: Hop stand, 45 seconds, started at 14:32:18 and counting down
     with 0:32 to go, and + TIMER's editor at 1 minute 30 seconds, no preset pressed */
  "timer-secs": () => {
    const s = SCENES.timers();
    if (TIMERS !== "new") return s;
    s.tmrs.push({id: 3, name: "Hop stand", set: 45, left: 32, state: "running"});
    s.events = [["14:32:18", "Hop stand added and started, 0:45", "confirmed", "ok"], ...s.events];
    return Object.assign(s, {open: {tedit: {id: null, name: "Vorlauf", ph: "Timer 4", set: 90}}});
  },
  /* the same editor at 0 minutes 0 seconds: SAVE and START greyed, each saying why when tapped */
  "timer-zero": () => {
    const s = SCENES["timer-secs"]();
    return TIMERS !== "new" ? s : Object.assign(s, {open: {tedit: {id: null, name: "Vorlauf", ph: "Timer 4", set: 0}}});
  },
  /* the proposal's recipe column (?col=new, RECIPE-COLUMN.md). #timers-fold: heating the strike water (#sw-heat) with two
     timers, Campden counting down and Vorlauf set up for later: on one screen where the step list can't hold the current
     step beside them, they fold into one line. #timers-open: the same, opened from that line. #other-recipe: the recipe
     not begun on brew morning (#prebrew), with OTHER RECIPE's book open. #hand-choose: brewing by hand (#timers-hand),
     with CHOOSE A RECIPE's book open. Without ?col=new they show the moment they start from */
  "timers-fold": () => Object.assign(SCENES["sw-heat"](), {tmrs: [{id: 1, name: "Campden", set: 300, left: 220, state: "running"}, {id: 2, name: "Vorlauf", set: 600, left: 600, state: "stopped"}], snd: {on: true, ok: true}}),
  "timers-open": () => Object.assign(SCENES["timers-fold"](), {open: {tfold: "line", tfOpen: true}}),
  "other-recipe": () => Object.assign(SCENES.prebrew(), {open: {rbOpen: true}}),
  "hand-choose": () => Object.assign(SCENES["timers-hand"](), {open: {rbOpen: true}}),
  /* the boil kettle in MANUAL, brewing by hand: the wort just under a boil, the element on by hand, the boil power
     45 %. The element runs at that 45 %, which the window reads as HAND 45 %, with the steps beside it, and MODE's MAN
     is boxed (bkManCue). As built before (?bkman=today), at its own level, 70 % as on 8012, while the window shows
     BOIL 45 %. #bk-hand-off: the same with the element off */
  "bk-hand": () => {
    const s = SCENES.manual();
    Object.assign(s.v.bk, {pv: 207.6, sv: null, mode: "manual", bp: 45});
    Object.assign(s.a.bkEl, {on: true, pct: BKMAN === "new" ? 45 : 70, lvl: 70});
    s.events = [["10:04:40", `BOIL ELEMENT on${BKMAN === "new" ? " at 45 %" : ""}`, "confirmed", "ok"], ...s.events];
    return s;
  },
  "bk-hand-off": () => { const s = SCENES["bk-hand"](); Object.assign(s.a.bkEl, {on: false, pct: 0}); s.events.shift(); return s; },
  /* the boil at 15:52:40, as #boiling, with the boil kettle put in MANUAL at 15:51:58 and its element off: the Boil
     step's 90 min still count down, but BoilPower doesn't run the kettle, so MODE's MAN is boxed in Prompt Amber
     (bkManCue). As built (?bkman=today) MAN looks as it always does */
  "bk-man-boil": () => {
    const s = SCENES.boiling();
    Object.assign(s.v.bk, {pv: 211.6, mode: "manual", bp: 45});
    Object.assign(s.a.bkEl, {on: false, pct: 0});
    s.events.unshift(["15:51:58", "Boil kettle MANUAL", "confirmed", "ok"]);
    return Object.assign(s, {base: "boiling"});
  },
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
  /* AUTO with no target, where the mash tun's AUTO is on but the HLT stays off. The mash tun's target is 0, left from
     the last recipe, and the brewer held AUTO at 13:26. PID_HERMS takes 0 as a real target: it holds the mash at 0 °F,
     so it never asks the HLT for heat, though its pump still runs. CraftBeerPi warns after 5 s (noTargetBanner). */
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
  /* heating by hand: an element switched on in MANUAL, without AUTO, which is dangerous. Brewing by hand, no recipe: at
     08:17:31 the brewer set the HLT's target to 150 °F and at 08:18 held its element on, in MANUAL. In MANUAL nothing
     compares the temperature with the target, so the element runs until someone turns it off. #byhand at 08:52:40:
     heating, 18.4 °F short of the target; #byhand-past at 09:03:30: 3.3 °F past it, with CraftBeerPi's alarm, raised at
     09:03:22, 30 s after it was 2 °F past */
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
  /* RESET, a way to reset the brew day's progress after STOP. The #mash day, stopped at 14:32:31 in Saccharification,
     16 of its 40 minutes run. STOP took the mash tun's AUTO off, as CraftBeerPi's MashStep does (its HERMS stops with
     it: HLT element and wort pump off, the HLT's own target back); the middle button offers RESET. #reset: RESET
     pressed, its question open. #reset-done: RESET TO STEP 1 pressed at 14:32:58: the same recipe at step 1, waiting
     for START; NEXT STEP greyed (NOT_BEGUN) */
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
  /* UNLOAD, at the end of the status line, takes the recipe off Brew Day (POST /step2/clear), as the recipe pages'
     UNLOAD does. #unloaded: the #prebrew morning's recipe, not begun, unloaded with one tap at 07:41:31: brewing by
     hand, with the recipe book's LOAD to have it back. #unload-ask: the #stopped day's, its question open.
     #unload-notinbook: steps built on Brew Steps, never saved to the Recipe Book, not begun: it asks, as they'd be gone.
     #unload-held: the boil waiting for the brewer (#boil-hold), its question open. #unload-running: the #mash day's,
     greyed, tapped. #unload-wait: BrewStart waiting overnight for its time (#sw-wait), greyed, tapped.
     #unload-refused: UNLOAD pressed on a screen that hadn't caught up with a step started on another, and refused by
     CraftBeerPi (409 step_running). #unload-failed: no answer from CraftBeerPi */
  unloaded: () => {
    const s = pbMorning();
    s.t = 7 * 3600 + 41 * 60 + 40; s.recipe = null;
    s.events.unshift(["07:41:31", `${RECIPE_NAME} unloaded: Brew Day is brewing by hand`, "confirmed", "ok"]);
    return Object.assign(s, {base: "prebrew"});
  },
  "unload-ask": () => Object.assign(SCENES.stopped(), {base: "stopped", open: {confirmUnload: true}}),
  /* steps built on Brew Steps and never saved to the Recipe Book: UNLOAD asks before they begin, as they'd be gone */
  "unload-notinbook": () => { RECIPE.name = "Quick Pale Ale"; return Object.assign(pbMorning(), {base: "prebrew", events: [["07:36:02", "Hot liquor tank MANUAL", "confirmed", "ok"]], open: {confirmUnload: true}}); },
  /* a simulator at 60× (SIM_TIME_SCALE), as 8012 runs: the #sw-plan night before on its clock, 21:12 on Thursday 26 Nov
     while it is Sunday 22 Nov on the screen's own. Everything on CraftBeerPi's clock runs 60 times as fast, the title
     bar's clock included, which isn't the real time: its date and time in italics and Note Amber, SPEED left of them;
     past its midnight the date moves on, and LOG's lines from the day before say theirs. #sim-clock-1x: the same evening
     on a simulator at 1×, its clock the screen's, the real time: the date beside the time in the usual look */
  "sim-clock": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {base: "sw-plan", sim: {scale: 60, day0: "2026-11-26", pc: "2026-11-22"}}),
  "sim-clock-1x": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {base: "sw-plan", sim: {scale: 1, day0: "2026-11-22", pc: "2026-11-22"}}),
  /* the boil kettle's Steam Slayer (STEAM-SLAYER.md), its mister set by hand. #ss-heat: #heatup at 3:12 PM, the boil
     heating, before the lid reminder: the mister shown off. #ss-ask: 3:24:40 PM, the boil kettle at 203.4 °F since
     3:24:10, the lid reminder waiting: the lid asked about and the mister marked. #ss-on: #boiling, the reminder
     answered at 3:25:02: the mister shown open. #ss-sag: a sag below 203 °F in the boil: still open. #ss-after: the boil
     over, the wort at 207.6 °F: still open. #ss-cool: below 203 °F, the turn-off reminder waiting. #ss-cooled: the
     whirlpool, closed. #ss-switched: #boiling with a mister CraftBeerPi switches (steps_boil_actor), on since the boil
     kettle reached 203 °F */
  "ss-heat": () => Object.assign(SCENES.heatup(), {slayer: "hand"}),
  "ss-ask": () => {
    const s = Object.assign(SCENES.heatup(), {slayer: "hand", t: 15 * 3600 + 24 * 60 + 40});
    s.v.bk.pv = 203.4;
    s.banner = {tone: "prompt", lid: true, title: LID_Q.title, text: LID_Q.text, act: "DONE", cmd: "b:lid"};
    s.events.unshift(["15:24:10", `${LID_Q.title}: ${LID_Q.text}`, "waiting for you", "wait"]);
    return s;
  },
  "ss-on": () => {
    const s = Object.assign(SCENES.boiling(), {slayer: "hand", lidDone: true});
    s.events.splice(1, 0, ["15:25:02", `${LID_Q.title} answered: Done`, "confirmed", "ok"], ["15:24:10", `${LID_Q.title}: ${LID_Q.text}`, "answered", ""]);
    return s;
  },
  /* #ss-sag: #hop, the 60 min hops in at 4:00:31 PM and the wort dipped to 201.6 °F, below the lid's 203 °F, while the
     boil step runs: still open, nothing asked */
  "ss-sag": () => {
    const s = Object.assign(SCENES.hop(), {slayer: "hand", lidDone: true, t: 16 * 3600 + 44, banner: null});
    s.v.bk.pv = 201.6; s.recipe.left = 59 * 60 + 16; s.recipe.adds = ["done"];
    s.events[0][2] = "answered"; s.events[0][3] = "";
    s.events.unshift(["16:00:31", "Hop Alert answered: Added", "confirmed", "ok"]);
    s.events.splice(s.events.findIndex(e => e[0] < "15:25:02"), 0, ["15:25:02", `${LID_Q.title} answered: Done`, "confirmed", "ok"], ["15:24:10", `${LID_Q.title}: ${LID_Q.text}`, "answered", ""]);
    return s;
  },
  "ss-after": () => ssPostBoil(17 * 3600 + 40, 207.6, false),
  "ss-cool": () => ssPostBoil(17 * 3600 + 60 + 30, 202.4, true),
  /* #ss-cooled: #whirlpool, the turn-off reminder answered at 5:08:14 PM, after Whirlpool Hop's NEXT STEP */
  "ss-cooled": () => {
    const s = Object.assign(SCENES.whirlpool(), {slayer: "hand", lidDone: true, ssOff: true});
    ssEv(s, ["17:08:14", `${OFF_Q.title} answered: Done`, "confirmed", "ok"]);
    ssEv(s, ["17:01:22", `${OFF_Q.title}: ${OFF_Q.text}`, "answered", ""]);
    return s;
  },
  "ss-switched": () => {
    const s = Object.assign(SCENES.boiling(), {slayer: "switched", lidDone: true, mister: {on: true}});
    s.events.splice(1, 0, ["15:25:02", `${LID_Q.title} answered: Done`, "confirmed", "ok"], ["15:24:10", `${LID_Q.title}: ${LID_Q.text}`, "answered", ""]);
    return s;
  },
  /* a level sensor (LEVELS.md, proposal; none on the rig yet), on the HLT and the boil kettle, with the tint.
     #lv-sensor-night: #sw-plan, the night before: the HLT measured at 15.0 gal, which the estimate can't know until
     BrewStart runs, the boil kettle empty. #lv-sensor: #sparge-run: the HLT at 4.2 gal on its way to about 1.7, the boil
     kettle at 3.1 on its way to about 7.0. #lv-sensor-diff: #boil-hold: the boil kettle at 6.4 gal where the estimate
     is about 7.0; the HLT at 1.8, within a quart of its 1.7. #lv-sensor-lost: the same, the connection lost 48 s ago.
     #lv-sensor-none: the boil kettle's sensor with no reading */
  "lv-sensor-night": () => Object.assign(SCENES["sw-plan"](), {levels: "tint", lsens: ["hlt", "bk"], lvm: {hlt: 15.0, bk: 0}}),
  "lv-sensor": () => Object.assign(SCENES["sparge-run"](), {levels: "tint", lsens: ["hlt", "bk"], lvm: {hlt: 4.2, bk: 3.1}}),
  "lv-sensor-diff": () => Object.assign(SCENES["boil-hold"](), {levels: "tint", lsens: ["hlt", "bk"], lvm: {hlt: 1.8, bk: 6.4}}),
  "lv-sensor-lost": () => {
    const s = SCENES["lv-sensor-diff"]();
    s.link = "lost"; s.age = 48;
    s.banner = {tone: "alarm", title: "No connection", text: "Readings are {age} s old. Trying again every 5 s. Controls are paused until CraftBeerPi answers."};
    s.events.unshift([hhmmss(s.t - 48), "Connection to CraftBeerPi lost", "trying again", "bad"]);
    return s;
  },
  "lv-sensor-none": () => Object.assign(SCENES["boil-hold"](), {levels: "tint", lsens: ["hlt", "bk"], lvm: {hlt: 1.8, bk: null}}),
  /* #sim-speed: #sim-clock with SPEED pressed, its chooser open, SIMULATOR VESSELS under the speeds (with ?simtag=b the
     row has no chooser); #sim-reset-all: RESET ALL pressed in it, its question open */
  "sim-speed": () => Object.assign(SCENES["sim-clock"](), {open: {spdOpen: true}}),
  "sim-reset-all": () => Object.assign(SCENES["sim-clock"](), {open: {spdOpen: true, svAsk: true}}),
  /* LOAD in the by-hand list over a finished recipe the Recipe Book doesn't have (Rye Pale Ale, built on Brew Steps):
     it asks first, as its steps would be gone */
  "load-notinbook": () => { RECIPE.name = "Rye Pale Ale"; return Object.assign(SCENES.finished(), {base: "finished", open: {confirmLoad: 0}}); },
  "unload-held": () => Object.assign(SCENES["boil-hold"](), {base: "boil-hold", open: {confirmUnload: true}}),
  "unload-running": () => Object.assign(mash(), {base: "mash", open: {tap: "r:unload"}}),
  "unload-wait": () => Object.assign(SCENES["sw-wait"](), {base: "sw-wait", open: {tap: "r:unload"}}),
  "unload-refused": () => {
    const s = mash(), d = unloadRefused(RECIPE_STEPS[2].n);
    s.t = 14 * 3600 + 32 * 60 + 36;
    s.events.unshift(["14:32:35", `Recipe not unloaded: ${d}`, "from CraftBeerPi", ""]);
    return Object.assign(s, {base: "mash", open: {notes: {r: d}}});
  },
  "unload-failed": () => {
    const s = pbMorning();
    s.banner = {tone: "alarm", title: "Command failed", text: `${RECIPE_NAME} did not unload. It is still loaded.`, act: "TRY AGAIN", cmd: "r:unload-yes"};
    s.events.unshift(["07:41:17", `${RECIPE_NAME} unloaded: Brew Day is brewing by hand`, "failed: no answer in 5 s", "bad"]);
    return Object.assign(s, {base: "prebrew"});
  },
  /* the pre-brew check (pbMorning). #prebrew: COMPARE PROBES under START. #probes, #probes-apart, #probes-off,
     #probes-none: the probes side by side, agreeing; the boil kettle 3.8 °F cooler than the others, as one by a door
     can be; the boil kettle's 17.5 °F low, more than its spot explains; the mash tun's giving no reading for 4 min.
     #checking: START held, CraftBeerPi checking. #check-clock: the Pi's clock not set yet (it sets itself 30 s on, and
     the box follows: #check-now). #check-probe: the boil kettle's probe silent for 3 min. #check-adds: a recipe with
     eight boil additions, two without a reminder. #check-many: the clock and the reminders both. #check-noanswer:
     CraftBeerPi gave no answer to the check within PB_ASK. #check-noprobe: no probe chosen for the boil kettle in
     Hardware (no_probe). #check-slow: the Pi's clock still unanswered after START waited PB_CLOCK for it (no_answer_yet;
     the answer comes 5 s on, set, and the box follows). #check-unsure: the Pi didn't say whether its clock is set
     (unconfirmed) */
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
     #sw-grain-edit, the grain's temperature being given there, for grain kept indoors; #sw-grain, given on BrewStart,
     which answers where the grain spent the night (indoors);
     #sw-hot, the strike water typed in too hot, so the mash would go over its rest; #sw-used, USE pressed; #sw-backhot,
     USE pressed on a plan typed on Brew Steps as 185 °F, so BACK TO would pass the ceiling and is greyed. CraftBeerPi
     working USE out: #sw-working, the recipe just loaded and nothing worked out yet, and #sw-working-open with FORECAST
     open; #sw-reworking, the HLT's water just changed, the last figures shown until the new ones come; #sw-levers, USE
     worked out for the new water and FORECAST waiting for what would raise it most. #sw-refused: USE pressed on a
     screen that hadn't caught up with the grain's temperature given on another, so CraftBeerPi refused it and the box
     offers its new figure; #sw-refused-moved, USE pressed on a screen that hadn't caught up with the water going to the
     mash tun. #sw-failed: CraftBeerPi's work on USE failed. #sw-tunprobe: the mash probe at the tun's outlet instead,
     where PID_HERMS takes the mash over the rest by itself. Brew day, with BrewStart step 1 and the current step until
     the water is moved: #sw-wait, BrewStart waiting to start heating for 07:00; #sw-heat, BrewStart heating the HLT on
     its AUTO; #sw-move, BrewStart holding the strike water, asking for it to be moved; #sw-late, the same at the rest,
     with USE not pressed the night before; #sw-doughin, the water in the mash tun, BrewStart finished and MashIn on the
     Mash Tun asking for the malt, its probe reading the HLT's water. With ?sws=step, the older shape: BrewStart heats
     nothing and hands over at its heating start to the strike water step on the HLT, which heats the water and asks
     for it to be moved.
     #sw-hand: the recipe as imported, without the flow, and the HLT heating the strike water on its own AUTO. With a
     number missing: #sw-novol, BrewStart without a water volume; #sw-missing, a recipe imported before CraftBeerPi kept
     BeerSmith's mash figures (core post55), as every recipe in the rig's book is, its MashIn with a grain weight;
     #sw-missing-steps, a recipe built on Brew Steps, with no grain weight either; #sw-noprobe, the boil kettle's probe
     giving no reading; #sw-grain-bad, BrewStart's grain temperature saved on Brew Steps as 150 °F; #sw-interval, the
     mash tun's control interval set to 2.5 s. Figures given in the box: #sw-typed, a recipe built on Brew Steps, its
     grain weight and mash water given there, FORECAST opened; #sw-room, the boil kettle's probe giving no reading and
     the room's temperature given as 66 °F, FORECAST opened; #sw-asks, a recipe built on Brew Steps, its grain weight
     given, with the probe giving no reading: the box asks for the mash water and the room. */
  "sw-plan": () => swDay(21 * 3600 + 12 * 60 + 5, {}),
  "sw-forecast": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {open: {swOpen: true}}),
  "sw-volume": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {open: {swOpen: true, swVol: {val: 13.5}}}),
  "sw-grain-edit": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {open: {swOpen: true, swGrain: {val: 70}}}),
  "sw-grain": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.grain = 70; s.sw.where = "indoors"; return Object.assign(s, {open: {swOpen: true}}); },
  "sw-hot": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.plan = 145; return s; },
  "sw-used": () => swDay(21 * 3600 + 12 * 60 + 40, {used: true}),
  "sw-working": () => swWorking(21 * 3600 + 8 * 60 + 50),
  "sw-working-open": () => Object.assign(swWorking(21 * 3600 + 8 * 60 + 50), {open: {swOpen: true}}),
  /* SET 13.5 gal in the HLT's box (#sw-volume) at 21:12:25: the figures for 15 gal stay, greyed, until CraftBeerPi has
     worked USE out for 13.5 */
  "sw-reworking": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 34, {});
    s.sw.vol = 13.5;
    s.sw.has = {grain: 60.4, vol: 15, probe: "coil", room: 60.4};
    s.sw.work = {since: 21 * 3600 + 12 * 60 + 25, why: "vol"};
    s.events.unshift(["21:12:25", "HLT water set to 13.5 gal, was 15.0 gal · Campden ¾ tablet", "confirmed", "ok"]);
    return Object.assign(s, {open: {swOpen: true}});
  },
  /* the same, USE worked out for 13.5 gal at 21:12:55, and FORECAST, at NOT MEASURED YET, still waiting for what would
     raise it most */
  "sw-levers": () => {
    const s = swDay(21 * 3600 + 13 * 60 + 5, {});
    s.sw.vol = 13.5;
    s.sw.has = {grain: 60.4, vol: 13.5, probe: "coil", room: 60.4, lvAt: 21 * 3600 + 12 * 60 + 55 + SW_LEVER_S};
    s.events.unshift(["21:12:25", "HLT water set to 13.5 gal, was 15.0 gal · Campden ¾ tablet", "confirmed", "ok"]);
    return Object.assign(s, {open: {swOpen: true, swAt: "#sw-lv"}});
  },
  /* BrewStart's grain temperature given as 70 °F on another screen at 21:11:40, and USE worked out again for it; this
     screen, a phone woken from sleep, still showed the figure for the probe's 60.4 °F when USE was pressed at 21:12:31 */
  "sw-refused": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 32, {});
    s.sw.grain = 70; s.sw.where = "indoors";
    s.events.unshift(["21:11:40", "Grain temperature set to 70.0 °F, was the boil kettle's probe", "confirmed", "ok"]);
    return Object.assign(s, {open: {notes: {r: swRefusal(swHot(), "BrewStart's grain temperature is now 70.0 °F", swModel(70, 15, "coil").use)}}});
  },
  /* the water moved to the mash tun with USE never pressed; a phone woken from sleep still showed the night before's
     box, and USE pressed on it is refused (409 moved): the note, and the box as CraftBeerPi has it */
  "sw-refused-moved": () => Object.assign(swMorning(SW_MOVED + 40, 126), {open: {notes: {r: swNotApplied("USE", swHot(), "moved")}}}),
  /* CraftBeerPi's work on USE for the recipe loaded at 21:08:30 failed at 21:09:12, so there's no USE until a number it
     works from changes */
  "sw-failed": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 5, {});
    s.sw.has = null;
    s.sw.failed = {at: 21 * 3600 + 9 * 60 + 12, detail: "the model's process stopped without an answer", for: {grain: 60.4, vol: 15, probe: "coil", room: 60.4}};
    s.events.unshift(["21:09:12", `Strike water forecast failed: ${s.sw.failed.detail}`, "failed", "bad"]);
    return s;
  },
  "sw-tunprobe": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.probe = "tun"; return Object.assign(s, {open: {swOpen: true}}); },
  "sw-wait": () => {
    const s = swDay(DAY2 + 5 * 3600 + 40 * 60 + 12, {used: true, state: "running"});
    s.v.hlt.pv = 59.8;
    s.recipe.wait = `STARTS ${tod(swStartAt(s.sw.plan, 59.8))}`;
    return s;
  },
  "sw-heat": () => swMorning(DAY2 + 6 * 3600 + 41 * 60 + 30, swHot()),
  "sw-move": () => swMorning(DAY2 + 6 * 3600 + 51 * 60 + 10, swHot()),
  "sw-late": () => swMorning(DAY2 + 6 * 3600 + 51 * 60 + 10, 126),
  "sw-doughin": () => swMorning(SW_MOVED + 40, swHot()),
  "sw-hand": () => {
    const s = swDay(DAY2 + 9 * 3600 + 5 * 60, {}), on = DAY2 + 8 * 3600 + 41 * 60 + 20;
    s.sw.hand = true;
    Object.assign(s.v.hlt, {pv: +(59.9 + (s.t - on) / 60 * SW_RATE).toFixed(1), sv: 126, own: 126, mode: "auto"});
    Object.assign(s.a, {hltEl: {on: true, pct: 100}, hltPump: {on: true}});
    s.sw.g = {from: 59.9, heat: on, plan: 126, hand: true};
    s.events = [["08:41:20", "Hot liquor tank AUTO", "confirmed", "ok"], ["08:41:12", "Hot liquor tank target 126.0 °F", "confirmed", "ok"],
      ["08:40:10", "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]];
    return s;
  },
  "sw-novol": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.vol = null; return s; },
  "sw-missing": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); Object.assign(s.sw, {from: null, stepGrain: true}); return s; },
  "sw-missing-steps": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.from = null; return s; },
  /* #sw-give: #sw-missing-steps with GIVE THEM pressed, the figures open */
  "sw-give": () => Object.assign(SCENES["sw-missing-steps"](), {base: "sw-missing-steps", open: {swOpen: true}}),
  "sw-noprobe": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.v.bk.pv = null; s.pb.none.bk = 300; return Object.assign(s, {pbLast: {bk: 61.4}, gap: {bk: 300}}); },
  "sw-grain-bad": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.grain = 150; return s; },
  /* the strike water's temperature (BrewStart's, or with ?sws=step the strike water step's) typed on Brew Steps as
     185 °F, and USE pressed at 21:12:31. The model's answers stop at a 175 °F strike, so the mockup can't chart BACK
     TO's 185 °F: the moment is the box closed */
  "sw-backhot": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 40, {used: true});
    s.sw.was = 185;
    s.events[0] = ["21:12:31", `Strike water set to ${s.sw.plan.toFixed(1)} °F, was 185.0 °F`, "confirmed", "ok"];
    return s;
  },
  "sw-interval": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.interval = 2.5; return s; },
  "sw-typed": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 5, {});
    Object.assign(s.sw, {from: null, rec: {grain: 20, water: 8.26}});
    s.events.unshift(["21:10:40", "Mash water set to 8.26 gal for this recipe", "confirmed", "ok"], ["21:10:31", "Grain weight set to 20.0 lb for this recipe", "confirmed", "ok"]);
    return Object.assign(s, {open: {swOpen: true}});
  },
  "sw-room": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 5, {});
    s.v.bk.pv = null; s.pb.none.bk = 300; s.sw.room = 66;
    s.events.unshift(["21:11:20", "Room temperature set to 66.0 °F for this brew", "confirmed", "ok"]);
    return Object.assign(s, {pbLast: {bk: 61.4}, gap: {bk: 300}, open: {swOpen: true}});
  },
  "sw-asks": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 5, {});
    Object.assign(s.sw, {from: null, rec: {grain: 20}});
    s.v.bk.pv = null; s.pb.none.bk = 300;
    s.events.unshift(["21:10:31", "Grain weight set to 20.0 lb for this recipe", "confirmed", "ok"]);
    return Object.assign(s, {pbLast: {bk: 61.4}, gap: {bk: 300}});
  },
  /* BrewStart's box (bsHTML), the #sw-plan night before at 21:12. #bs-edit: opened from BrewStart's row, whose hint asks
     where the grain is: Ready by 07:00, TOMORROW pressed, the grain not answered yet, focus on IN THE GARAGE with the
     two answers in view. #bs-indoors: the same with INDOORS pressed, at 68 °F, the box scrolled to it. #bs-past: TODAY
     pressed, so 07:00 has passed and SET is greyed. #bs-startat: START AT chosen, 05:30 tomorrow. #bs-set: SET pressed
     at 21:12:31 for Ready by 06:30 with the grain indoors at 68 °F: the box closed, the row and LOG saying so, and
     CraftBeerPi working USE out again for the grain. #bs-wait: #sw-wait, BrewStart waiting for its time, with the box
     opened from its row as #bs-edit's is. #bs-new: a recipe without BrewStart, so + BrewStart above its first step.
     Without BrewStart there is no strike water step either, so the strike water box works from the HLT's water
     CraftBeerPi keeps for brewing by hand, and USE sets the HLT's target; the BrewStart + BrewStart adds, Ready by,
     becomes the strike water step. With ?sws=step the recipe keeps the strike water step on the HLT, which the box
     works from. #bs-new-open: its box, for a new BrewStart. #bs-sim: #bs-edit on a simulator at 60×, its own clock on
     the same Friday night, so the time in words also says how long that is in real minutes, and the box's top says
     where that clock is. #bs-sim-day: the same on a simulator at 1× whose date isn't the screen's. #bs-novol: #bs-edit
     with BrewStart's water blank. #bs-soon: #sw-wait, BrewStart waiting at 05:40 to have the water hot by 07:00, the
     box opened from its row with 06:00 typed: sooner than BrewStart plans for heating the water, so the time in words
     says the heating starts at once and SET reads HEAT NOW, which has BrewStart heat the HLT at once. #bs-past,
     #bs-startat, #bs-sim, #bs-sim-day, #bs-novol and #bs-soon show the box from its top, focus in the time box */
  "bs-edit": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan", open: {bsAt: {focus: "garage"}}}),
  "bs-indoors": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan", open: {bsAt: {where: "indoors", at: "#bs-box .bsin"}}}),
  "bs-past": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan", open: {bsAt: {rel: 0}}}),
  "bs-startat": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan", open: {bsAt: {kind: "start", txt: "05:30"}}}),
  "bs-set": () => {
    const s = swDay(21 * 3600 + 12 * 60 + 40, {});
    s.sw.grain = 68; s.sw.where = "indoors"; s.sw.bs = {ready: "06:30"};
    s.sw.has = {grain: 60.4, vol: 15, probe: "coil", room: 60.4};
    s.sw.work = {since: 21 * 3600 + 12 * 60 + 31, why: "grain"};
    s.events.unshift(["21:12:31", `BrewStart: ready by ${todS("06:30")} Sat 21 Nov, was ${todS("07:00")} Sat · grain indoors at 68.0 °F`, "confirmed", "ok"]);
    return Object.assign(s, {base: "sw-plan"});
  },
  "bs-wait": () => Object.assign(swUnsaid(SCENES["sw-wait"]()), {base: "sw-wait", open: {bsAt: {focus: "garage"}}}),
  "bs-new": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.noBS = true; return Object.assign(s, {base: "sw-plan"}); },
  "bs-new-open": () => Object.assign(SCENES["bs-new"](), {open: {bsAt: {neu: true}}}),
  "bs-sim": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan", sim: {scale: 60, day0: "2026-11-20", pc: "2026-11-22"}, open: {bsAt: {}}}),
  "bs-sim-day": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan", sim: {scale: 1, day0: "2026-11-20", pc: "2026-11-22"}, open: {bsAt: {}}}),
  "bs-novol": () => { const s = swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})); s.sw.vol = null; return Object.assign(s, {base: "sw-plan", open: {bsAt: {}}}); },
  "bs-soon": () => Object.assign(SCENES["sw-wait"](), {base: "sw-wait", open: {bsAt: {txt: "06:00"}}}),
  /* the vessels' own figures from the Hardware page (VESSELS.md), none of which anything needs. #bs-over: the HLT holds
     20 gal, given on the Hardware page, and BrewStart's water is 25.4 gal, as Test Recipe v5 fills it in: a line under the
     water in BrewStart's box says so. #sw-hw: FORECAST with the Mash Tun's and the HLT's empty weight and material
     given, under From Hardware, in place of BeerSmith's tun and the guess about the HLT's steel. #sw-over: FORECAST
     with BrewStart's water more than the HLT holds, the line under From you's water. With no figures given, every
     moment is as before */
  "bs-over": () => { const s = swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})); s.sw.vol = 25.4; s.vessels = {hlt: {capacity: 20}}; return Object.assign(s, {base: "sw-plan", open: {bsAt: {at: "#bs-box .vover"}}}); },
  "sw-hw": () => Object.assign(swDay(21 * 3600 + 12 * 60 + 5, {}), {vessels: {hlt: {capacity: 20, empty_weight: 30, material: "stainless_steel"}, mt: {capacity: 20, empty_weight: 33, material: "stainless_steel"}}, open: {swOpen: true}}),
  "sw-over": () => { const s = swDay(21 * 3600 + 12 * 60 + 5, {}); s.sw.vol = 25.4; return Object.assign(s, {vessels: {hlt: {capacity: 20}}, open: {swOpen: true}}); },
  /* USE waiting for where the grain spent the night (swHTML). #sw-where: the #sw-plan night before, BrewStart's time
     set and the grain not answered yet, so BrewStart's row asks "where's the grain?" and USE's place says so too,
     leading to BrewStart's box. #sw-where-am: brew morning (#sw-late), BrewStart holding the strike water, not
     finished, and the grain still not answered; BrewStart's row isn't a button once it heats, so USE leads to the
     strike water box's own grain box */
  "sw-where": () => Object.assign(swUnsaid(swDay(21 * 3600 + 12 * 60 + 5, {})), {base: "sw-plan"}),
  "sw-where-am": () => Object.assign(swUnsaid(swMorning(DAY2 + 6 * 3600 + 51 * 60 + 10, 126)), {base: "sw-late"}),
  /* the mash pH for BrewScribe (PH-ENTRY.md), on the #mash day (phMash, phEnd). #ph: "Check mash pH" up since 13:42:05,
     at 13:42:20, BrewScribe's log open and nothing saved for Early mash, so RECORD pH sits beside OK. #ph-open: RECORD
     pH pressed, the pH box open and empty. #ph-set: 5.42 typed. #ph-target: the recipe's target 5.3. #ph-had: a reading
     already saved for Early mash, 5.42. #ph-end: BrewScribe's reminder before mash-out, up since 14:51:19, the box open
     with the sample temperature. #ph-warm: the same with pH 5.38 and the sample at 140 °F. #ph-nolog: no BrewScribe log
     open, and #ph-vessel: BrewScribe can't tell the vessel: RECORD pH greyed, tapped. #ph-saved: SAVE pressed at
     13:42:30, the reading saved and the reminder closed, focus on LOG. #ph-fail: SAVE refused by BrewScribe (503).
     #ph-slow: no answer from BrewScribe in 5 s; the reading had reached it, so SAVE again sends the same entry and
     BrewScribe answers that it has it. #ph-noclose: the reading saved, and the OK that closes the reminder got no answer.
     #ph-other: the box open with 5.42 typed, the reminder answered on another screen a moment on. With ?brewscribe=none,
     BrewScribe isn't installed (404) and the reminders have OK alone, as without this design */
  ph: () => phMash(),
  "ph-open": () => Object.assign(phMash(), {open: {phAt: {}}}),
  "ph-set": () => Object.assign(phMash(), {open: {phAt: {txt: "5.42"}}}),
  "ph-target": () => { const s = phMash(); s.bscribe.reminders[0].readings[0].target = 5.3; return Object.assign(s, {open: {phAt: {}}}); },
  "ph-had": () => { const s = phMash(); scribeHas(s, 0, 5.42); return Object.assign(s, {open: {phAt: {}}}); },
  "ph-end": () => Object.assign(phEnd(), {open: {phAt: {}}}),
  "ph-warm": () => Object.assign(phEnd(), {open: {phAt: {txt: "5.38", ttxt: "140.0"}}}),
  "ph-nolog": () => Object.assign(phMash(), {bscribe: scribeDay(false), open: {tap: "ph:open"}}),
  "ph-vessel": () => {
    const s = phMash();
    s.bscribe.reminders.forEach(r => Object.assign(r, {vessel: null, vessel_problem: "The recipe has ambiguous actual mash step vessels. Choose the actual vessel."}));
    return Object.assign(s, {open: {tap: "ph:open"}});
  },
  "ph-saved": () => {
    const s = phMash(13 * 3600 + 42 * 60 + 33);
    scribeHas(s, 0, 5.42, PH_SENT);
    s.banner = null; s.events[0][2] = "answered"; s.events[0][3] = "";
    s.events.unshift(...phSavedLines("13:42:32"));
    return Object.assign(s, {open: {phLog: true}});
  },
  "ph-fail": () => {
    const s = phMash(13 * 3600 + 42 * 60 + 31);
    s.events.unshift(["13:42:31", "pH 5.42 not saved in BrewScribe", "failed", "bad"]);
    return Object.assign(s, {open: {phAt: {txt: "5.42", err: "BrewScribe storage is unavailable; retry the operation", sent: PH_SENT}}});
  },
  "ph-slow": () => {
    const s = phMash(13 * 3600 + 42 * 60 + 36);
    /* Brew Day's copy is from before SAVE; BrewScribe has the reading, under the entry Brew Day sent */
    s.bscribeSeen = JSON.parse(JSON.stringify(s.bscribe));
    scribeHas(s, 0, 5.42, PH_SENT);
    s.scribeMock = {ids: {[PH_SENT]: phKey(SCRIBE_DAY, PH_Q[0].title, 5.42, null, null)}};
    s.events.unshift(["13:42:35", "pH 5.42 may not be saved in BrewScribe", "failed: no answer in 5 s", "bad"]);
    return Object.assign(s, {open: {phAt: {txt: "5.42", err: PH_SLOW, sent: PH_SENT}}});
  },
  "ph-noclose": () => {
    const s = phMash(13 * 3600 + 42 * 60 + 38);
    scribeHas(s, 0, 5.42, PH_SENT);
    s.banner.ackFailed = true;
    s.events.unshift(["13:42:36", "pH 5.42 saved in BrewScribe (Early mash, Mash Tun)", "confirmed", "ok"], ["13:42:36", `${PH_Q[0].title} answered: OK`, "failed: no answer in 5 s", "bad"]);
    return s;
  },
  "ph-other": () => Object.assign(phMash(), {open: {phAt: {txt: "5.42"}, phElse: 1200}}),
  /* BrewScribe's readings from every reminder that asks for one (READINGS-ENTRY.md), each on the moment for its time of
     the brew, BrewScribe's log open (scribeDay). #rd-strike: brew morning (#sw-heat), BrewStart heating the HLT since
     its heating start. BrewScribe raises "Record strike water" with the first step that prepares the strike water
     before the first rest, here BrewStart, once per brew; it stays up, through MashIn too, until answered. The box open
     for the HLT's volume */
  "rd-strike": () => { const s = SCENES["sw-heat"](); return Object.assign(rdUp(s, 0, hhmmss(s.sw.g.heat)), {base: "sw-heat", open: {phAt: {}}}); },
  /* the sparge, on the SpargeStep's day (#sparge-heat, #sparge-run). As the sparge step started at 14:56:21, "HLT level
     before the sparge" went up, then "Check first runnings". #rd-level: 14:59:40, the sparge water heating, both
     waiting, the box open for the level. #rd-first: 15:12:40, the fly sparge running, the level saved at 14:58:12 and
     kept, the box open for the first runnings' gravity in SG, the brew's last pair. #rd-first-bx: the brew's last pair
     the refractometer's °Bx, 12.4 typed, its SG worked out with the wort correction factor 1.04. #rd-first-nofactor:
     the same with no refractometer setup in BrewScribe. #rd-first-noatc: a refractometer without temperature
     compensation, so °Bx asks for the sample's temperature. #rd-looks-sg: 1.048 typed with °Bx chosen. #rd-nounit:
     BrewScribe with no volume unit for the brew: the first runnings still offer their gravity, and "Record strike
     water" would have no RECORD */
  "rd-level": () => Object.assign(rdLevel(), {open: {phAt: {}}}),
  "rd-first": () => Object.assign(rdFirst(), {open: {phAt: {}}}),
  "rd-first-bx": () => Object.assign(rdRefr(rdFirst()), {open: {phAt: {f: {g: "12.4"}}}}),
  "rd-first-nofactor": () => Object.assign(rdRefr(rdFirst(), null), {open: {phAt: {f: {g: "12.4"}}}}),
  "rd-first-noatc": () => Object.assign(rdRefr(rdFirst(), Object.assign({}, SCRIBE_REFR, {temperature_compensation: "no"})), {open: {phAt: {f: {g: "12.4"}}}}),
  "rd-looks-sg": () => Object.assign(rdRefr(rdFirst()), {open: {phAt: {f: {g: "1.048"}}}}),
  "rd-nounit": () => { const s = rdFirst(); Object.assign(s.bscribe, {volume_unit: null, volume_label: null}); return Object.assign(s, {open: {phAt: {}}}); },
  /* #rd-last: 15:40:20, "Check last runnings" up since 15:40:02, 5 minutes before the sparge's 40 minutes end, the
     first runnings' 1.072 SG saved at 15:07:31; the box open for the gravity, pH and volume a "+" away. #rd-last-all:
     both added, and 1.012 SG, pH 5.62 and 6.95 gal typed */
  "rd-last": () => Object.assign(rdLast(), {open: {phAt: {}}}),
  "rd-last-all": () => Object.assign(rdLast(), {open: {phAt: {add: ["ph", "volume"], f: {g: "1.012", vol: "6.95"}, txt: "5.62"}}}),
  /* the sparge done at 15:45:02 (#boil-hold's day, at 15:45:40) and the boil started at 15:45:31: "HLT level after the
     sparge" up, then "Record before-boil readings". #rd-sparge: BrewScribe keeping the level before, 10.00
     gal, and 4.60 typed: the sparge water 5.40 gal. #rd-sparge-nolevel: no level BrewScribe can work from (none kept;
     one kept in another unit than its volume_unit gives the same box), so both levels asked. #rd-sparge-volume: the
     sparge water typed instead, 5.40 gal. #rd-sparge-bad: 10.20 typed, not lower than the level before, and SAVE
     tapped */
  "rd-sparge": () => Object.assign(rdAfter(), {open: {phAt: {f: {aft: "4.60"}}}}),
  "rd-sparge-nolevel": () => Object.assign(rdAfter(false), {open: {phAt: {}}}),
  "rd-sparge-volume": () => Object.assign(rdAfter(), {open: {phAt: {way: "volume", f: {spv: "5.40"}}}}),
  "rd-sparge-bad": () => Object.assign(rdAfter(), {open: {phAt: {f: {aft: "10.20"}, go: true}}}),
  /* the boil: #rd-preboil: the boil heating at 15:12 (#heatup), "Record before-boil readings" up since the boil step
     started at 14:58:30, the box open for the volume and gravity. #rd-postboil: the whirlpool at 17:18:40 (#whirlpool),
     "Record after-boil readings" up since the step after the boil started at 17:00:04, the box open, the pH a "+" away.
     #rd-partial: the volume saved at 17:18:22, 6.40 gal, the reminder still up for the gravity, focus on RECORD.
     #rd-saved: both saved at 17:18:34, 6.40 gal and 1.048 SG, and the reminder closed, focus on LOG. #rd-fail: SAVE
     refused by BrewScribe (503) at 17:18:31, the box open with both figures. #rd-final: the wort chilling at 17:41:30
     (#finished), "Record final volume and OG" up since every step was done at 17:28:10, the box open with 6.10 gal,
     1.052 SG and the sample at 68.0 °F */
  "rd-preboil": () => Object.assign(rdUp(SCENES.heatup(), 5, "14:58:30"), {open: {phAt: {}}}),
  "rd-postboil": () => Object.assign(rdUp(SCENES.whirlpool(), 6, "17:00:04"), {open: {phAt: {}}}),
  "rd-partial": () => {
    const s = rdUp(SCENES.whirlpool(), 6, "17:00:04"), rem = s.bscribe.reminders.find(r => r.title === RD_Q[6].title);
    rdLine(s, ["17:18:22", rdSaid(rem, "volume", [rdApply(s.bscribe, rem.title, {entry_id: RD_SENT[0], kind: "volume", value: 6.4, unit: "us_gal"})]), "confirmed", "ok"]);
    return Object.assign(s, {open: {phRec: true}});
  },
  "rd-saved": () => {
    const s = SCENES.whirlpool();
    s.bscribe = scribeDay();
    rdAnswered(s, 6, "17:00:04", "17:18:34", [{kind: "volume", value: 6.4, unit: "us_gal"}, {kind: "gravity", value: 1.048, instrument: "hydrometer", scale: "sg"}]);
    return Object.assign(s, {open: {phLog: true}});
  },
  "rd-fail": () => {
    const s = rdUp(SCENES.whirlpool(), 6, "17:00:04");
    rdLine(s, ["17:18:31", "6.40 gal and 1.048 SG not saved in BrewScribe", "failed", "bad"]);
    return Object.assign(s, {open: {phAt: {f: {vol: "6.40", g: "1.048"}, err: "BrewScribe storage is unavailable; retry the operation", sent: {volume: RD_SENT[0], gravity: RD_SENT[1]}}}});
  },
  "rd-final": () => Object.assign(rdUp(SCENES.finished(), 7, "17:28:10"), {open: {phAt: {f: {vol: "6.10", g: "1.052", gt: "68.0"}}}})
};
/* BrewScribe's readings moments (READINGS-ENTRY.md): a moment with BrewScribe's reminder i (RD_Q) up since `at`, in the
   title bar, its line waiting in LOG */
function rdUp(s, i, at) {
  if (!s.bscribe) s.bscribe = scribeDay();
  s.banner = rdBanner(i);
  rdLine(s, [at, `${RD_Q[i].title}: ${RD_Q[i].text}`, "waiting for you", "wait"]);
  return s;
}
/* lines put into a moment's LOG by their times, newest first, each above the lines of the same second already there */
function rdLine(s, ...L) { L.forEach(l => { const i = s.events.findIndex(e => e[0] <= l[0]); s.events.splice(i < 0 ? s.events.length : i, 0, l); }); }
/* an earlier BrewScribe reminder i, up at `at` and answered with SAVE at `done`: the readings it saved (rs) in the
   moment's BrewScribe, and LOG's lines for it, as SAVE logs them */
function rdAnswered(s, i, at, done, rs) {
  const rem = s.bscribe.reminders.find(r => r.title === RD_Q[i].title), texts = rs.map((r, k) => rdApply(s.bscribe, rem.title, Object.assign({entry_id: RD_SENT[k]}, r)));
  rdLine(s, [at, `${RD_Q[i].title}: ${RD_Q[i].text}`, "answered", ""], [done, `${RD_Q[i].title} answered: OK`, "confirmed", "ok"], [done, rdSaid(rem, rs[0].kind, texts), "confirmed", "ok"]);
  return s;
}
/* the entries Brew Day sends in the readings moments */
const RD_SENT = ["5e1b7c2a-8d34-4f6e-a1b9-3c7d2e8f4a10", "a3f9d6e1-2b47-4c8d-9e5f-6a1b0c7d2e43", "c8e2a4f6-1d3b-4e5c-8f7a-9b0d1e2f3a54"];
/* the HLT's level before the sparge saved at 14:58:12, 10.00 gal, which BrewScribe keeps for the sparge water */
function rdKept(s) {
  if (!s.bscribe) s.bscribe = scribeDay();
  return rdAnswered(s, 1, "14:56:21", "14:58:12", [{kind: "level", value: 10, unit: "us_gal"}]);
}
/* 14:59:40, the sparge water heating (#sparge-heat): "HLT level before the sparge" and "Check first runnings" both
   waiting since the sparge step started at 14:56:21 */
function rdLevel() {
  const s = rdUp(SCENES["sparge-heat"](), 1, "14:56:21");
  rdLine(s, ["14:56:21", `${RD_Q[2].title}: ${RD_Q[2].text}`, "waiting for you", "wait"]);
  return Object.assign(s, {base: "sparge-heat"});
}
/* 15:12:40, the fly sparge running (#sparge-run): the level kept, "Check first runnings" up since 14:56:21 */
function rdFirst() { return Object.assign(rdUp(rdKept(SCENES["sparge-run"]()), 2, "14:56:21"), {base: "sparge-run"}); }
/* 15:40:20 on the same day: "Check last runnings" up since 15:40:02, 5 minutes before the sparge's 40 minutes end at
   15:45:02; the first runnings' gravity saved at 15:07:31 */
function rdLast() {
  const s = rdKept(SCENES["sparge-run"]());
  rdAnswered(s, 2, "14:56:21", "15:07:31", [{kind: "gravity", value: 1.072, instrument: "hydrometer", scale: "sg"}]);
  s.t = 15 * 3600 + 40 * 60 + 20; s.recipe.left = 15 * 3600 + 45 * 60 + 2 - s.t;
  return Object.assign(rdUp(s, 3, "15:40:02"), {base: "sparge-run"});
}
/* 15:45:40 on #boil-hold's day: the sparge done at 15:45:02, when CraftBeerPi asked "Ready to boil?" and BrewScribe
   put up "HLT level after the sparge", then "Record before-boil readings". The title bar shows prompts in the order
   they came, so the boil's question came first; START THE BOIL answered it at 15:45:31, which switched the wort pump off
   and the boil kettle's AUTO on, and the level is up now. The level before kept, unless kept is false */
function rdAfter(kept = true) {
  const s = SCENES["boil-hold"](), b = RECIPE.steps[4], q = s.events.find(e => e[3] === "wait" && e[1].startsWith(`${b.n}: Ready to boil?`));
  s.bscribe = scribeDay();
  if (kept) rdKept(s);
  s.t = 15 * 3600 + 45 * 60 + 40; s.v.hlt.pv = 165.2; s.v.mt.pv = 166.2;
  s.v.bk = {pv: 150.2, sv: b.temp, mode: "auto"};
  Object.assign(s.a, {wortPump: {on: false}, bkEl: {on: true, pct: 100}});
  s.recipe = {state: "running", cur: 4, left: 90 * 60, adds: [], wait: true};
  q[2] = "answered"; q[3] = "";
  rdLine(s, ["15:45:31", `${b.n} answered: Start the boil`, "confirmed", "ok"], ["15:45:33", boilStartLine(b), "by recipe", ""],
    ["15:45:33", `${b.n}: The wort pump is off, so you can move its hoses.`, "from CraftBeerPi", ""]);
  rdUp(s, 4, "15:45:02");
  rdLine(s, ["15:45:02", `${RD_Q[5].title}: ${RD_Q[5].text}`, "waiting for you", "wait"]);
  return Object.assign(s, {base: "boil-hold"});
}
/* the brew's last gravity read with the refractometer in °Bx, so the box starts there, and the brewer's refractometer
   setup as BrewScribe has it (refr; null for none), which asks for the sample's temperature where it has no
   temperature compensation */
function rdRefr(s, refr = SCRIBE_REFR) {
  s.bscribe.reminders.forEach(r => r.readings.filter(x => x.kind === "gravity").forEach(g => {
    g.refractometer = refr && Object.assign({}, refr);
    g.choices.find(c => c.scale === "brix").sample_temperature = refr && refr.temperature_compensation === "no" ? "asked" : "optional";
    rdChosen(g, {instrument: "refractometer", scale: "brix"});
  }));
  return s;
}
/* the mash pH moments (PH-ENTRY.md), the #mash day. MashIn was confirmed at 13:27:05, so "Check mash pH" went up at
   13:42:05, in Protein Rest, with the mash still coming back to 126 °F after the malt went in (its 20 minutes start at
   13:49:38), its pump recirculating through the coil and the HLT holding 131.4 °F for it */
function phMash(t = 13 * 3600 + 42 * 60 + 20) {
  return Object.assign(mash(), {
    t, banner: phBanner(0),
    v: {hlt: {pv: 131.4, sv: 131.4, own: 168.0, mode: "manual"}, mt: {pv: 125.5, sv: 126.0, mode: "auto"}, bk: {pv: 68.0, sv: null, mode: "manual"}},
    a: {hltEl: {on: true, pct: 40}, hltPump: {on: false}, wortPump: {on: true}, bkEl: {on: false, pct: 0}},
    recipe: {state: "running", cur: 1, left: 20 * 60, adds: [], wait: true},
    events: [["13:42:05", `${PH_Q[0].title}: ${PH_Q[0].text}`, "waiting for you", "wait"], ...MASH_EVENTS.slice(4).map(e => e.slice())],
    bscribe: scribeDay()
  });
}
/* BrewScribe's reminder before mash-out, the same day: Saccharification's 40 minutes started at 14:16:19, so it went up
   at 14:51:19, 5 minutes before they end. "Check mash pH" was answered with SAVE at 13:42:30: pH 5.42 */
function phEnd() {
  const s = mash(), t = 14 * 3600 + 51 * 60 + 34, E = MASH_EVENTS.map(e => e.slice());
  Object.assign(s, {t, banner: phBanner(1), bscribe: scribeDay()});
  s.recipe.left = 14 * 3600 + 56 * 60 + 19 - t;
  s.events = [["14:51:19", `${PH_Q[1].title}: ${PH_Q[1].text}`, "waiting for you", "wait"], ...E.slice(0, 4), ...phSavedLines("13:42:32"),
    ["13:42:05", `${PH_Q[0].title}: ${PH_Q[0].text}`, "answered", ""], ...E.slice(4)];
  scribeHas(s, 0, 5.42);
  return s;
}
/* SAVE's LOG lines for "Check mash pH", logged as the reminder closes: BrewScribe's sentence, with CraftBeerPi's answer
   to OK under it */
const phSavedLines = at => [[at, "pH 5.42 saved in BrewScribe (Early mash, Mash Tun)", "confirmed", "ok"], [at, `${PH_Q[0].title} answered: OK`, "confirmed", "ok"]];
/* the entry Brew Day sends in the moments, and a reading BrewScribe has for reminder i's stage (the one standing there
   now, which BrewScribe's page shows as recorded) */
const PH_SENT = "0b6f8a52-3d4e-4f1a-9c7b-5e2d8a1f6c30";
function scribeHas(s, i, v, id = "9f0c3b7e-5d21-4a8c-b6e4-1f2a3c4d5e6f") {
  const rd = s.bscribe.reminders[i].readings[0];
  rd.saved = {entry_id: id, value: v, text: `pH ${v.toFixed(rd.decimals)}`, occurred_at: "2026-11-22T18:41:07Z"};
}
/* the strike water's temperature once USE is pressed in the moments: USE for Test Recipe v5 with 15 gal in the HLT and
   the grain at 60.4 °F (the boil kettle's 61.4 °F, less its 1.0 °F offset), from the model's answers */
const swHot = () => swModel(60.4, 15, "coil").use;
/* the recipe loaded at 21:08:30 and CraftBeerPi working USE out since, with nothing worked out yet */
function swWorking(t) {
  const s = swDay(t, {});
  s.sw.has = null;
  s.sw.work = {since: 21 * 3600 + 8 * 60 + 30, why: "load"};
  return s;
}
/* a moment with where the grain spent the night not answered yet for this load (BrewStart's where) */
function swUnsaid(s) { s.sw.where = null; return s; }
/* brew day, as cbpi4_BrewStart writes it (format_start), and the moment the strike water has been moved and Next
   pressed */
const SW_DAY = "Sat Nov 21";
const SW_MOVED = DAY2 + 6 * 3600 + 55 * 60 + 40;
/* when BrewStart starts heating for its Ready by time (at, on CraftBeerPi's clock: 07:00 on brew day unless given),
   water at pv heated to t: its heat-up at the rig's rate plus its spare minutes */
const swStartAt = (t, pv, at = DAY2 + 7 * 3600) => at - Math.ceil(((t - pv) / SW_RATE + SW_SPARE) * 60);
/* BrewStart's notification as the recipe starts (notify_ready_scheduled), in its words */
const swPlanLine = (t, pv) => `BrewStart: Ready by ${SW_DAY}, ${todS("07:00")}: heating starts about ${SW_DAY}, ${tod(swStartAt(t, pv))}. ${pv.toFixed(1)} °F to ${t.toFixed(1)} °F takes about ${Math.round((t - pv) / SW_RATE)} min, plus ${SW_SPARE} min spare.`;
/* the night before, Friday 21:12: all the strike and sparge water in the HLT, 15 gal at the garage's temperature, every
   other vessel empty, every probe with the rig's offset, and the graphs showing the evening (pbMorning's pbDay); the
   recipe loaded at 21:08, its strike water at the rest, and BrewStart's water volume 15 gal, as the rig page sets it
   (sw.vol; brewing by hand, the figure given in the box). used: USE pressed at 21:12:31. state "running": START held
   at 21:13, the check passed and BrewStart waits. CraftBeerPi has worked USE out for the numbers as the moment has them
   (sw.has, set as it loads) unless the moment says otherwise */
function swDay(t, o) {
  const s = pbMorning(), used = !!o.used, hot = used ? swHot() : null;
  s.t = t;
  s.v.hlt.pv = 60.6; s.v.mt.pv = 64.6; s.v.bk.pv = 61.4;
  s.recipe = {state: o.state || "ready", cur: 0, left: 0, adds: []};
  s.sw = {plan: used ? hot : 126, was: used ? 126 : null, from: Object.assign({}, SW_FROM), vol: 15, grain: null};
  s.events = [["21:08:30", "Craftbeerpi Test Recipe v5 loaded", "confirmed", "ok"]];
  if (used) s.events.unshift(["21:12:31", `Strike water set to ${hot.toFixed(1)} °F, was 126.0 °F`, "confirmed", "ok"]);
  if (o.state) s.events.unshift(["21:13:04", swPlanLine(s.sw.plan, 60.6), "from CraftBeerPi", ""], ["21:13:02", "Recipe started", "confirmed", "ok"],
    ["21:13:01", "Checked before starting: probes, clock, reminders", "all passed", "ok"]);
  return s;
}
/* brew day, from BrewStart's heating start: BrewStart (1.3.0) heats the HLT on its own AUTO at the rig's rate to plan,
   and once the water is half a degree short of it, as it counts it there, holds it and asks for it to be moved; it
   stays the current step until Next. With ?sws=step (the older shape) BrewStart heats nothing: at its heating start it
   hands over to the strike water step, which heats the HLT and asks, as before BrewStart heated (bsHandsOver). At
   SW_MOVED the water is in the mash tun and Next pressed: BrewStart (in the older shape the strike water step)
   finishes, the HLT's AUTO off. The water came through the coil, so the Mash Tun's probe, at the coil's outlet, reads
   the strike water: MashIn on the Mash Tun finds the rest reached and asks for the malt within seconds, the strike
   water at the rest as much as above it. Its pump stops for the dough-in, PID_HERMS holds the HLT at no more than the
   rest while it does, and the probe reads the HLT's water. The time of the ask and the readings 40 s on are the
   model's, its middle guesses (SW_MODEL.morning). sw.g gives graphs.js the times, and the steps' starts (marks) */
function swMorning(t, plan) {
  const s = swDay(t, {used: plan !== 126, state: "running"}), old = SW_STEPS.length > 1, kal = plan <= 126;
  const heat = swStartAt(plan, 59.8), hot = heat + Math.round((plan - 0.5 - 59.8) / SW_RATE * 60);
  const M = SW_MODEL.morning[kal ? "rest" : "use"], ask = SW_MOVED + M.ask, held = t >= hot, S = SW_STEPS[old ? 1 : 0];
  const log = s.events.slice().reverse();
  log.push([hhmmss(heat), `BrewStart: Time to heat - the water should be ready by ${SW_DAY}, ${todS("07:00")}.`, "from CraftBeerPi", ""],
    ...(old ? [[hhmmss(heat), "BrewStart finished", "by recipe", ""], [hhmmss(heat), `${S.n} started, HLT target ${plan.toFixed(1)} °F`, "by recipe", ""]]
      : [[hhmmss(heat), `BrewStart heating, HLT target ${plan.toFixed(1)} °F`, "by recipe", ""]]));
  Object.assign(s.a, {hltPump: {on: true}});
  s.sw.g = {from: 59.8, heat, hot, plan, ask, marks: old ? [[heat, 2]] : []};
  if (t < SW_MOVED) {
    s.recipe.cur = old ? 1 : 0;
    if (!old) s.recipe.bsHeat = held ? "holding" : "heating";
    Object.assign(s.v.hlt, {pv: held ? +(plan - 0.1).toFixed(1) : +(59.8 + (t - heat) / 60 * SW_RATE).toFixed(1), sv: plan, own: plan, mode: "auto"});
    s.a.hltEl = {on: true, pct: held ? 16 : 100};
    s.recipe.wait = held ? WFY : true;
    if (held) {
      s.banner = {tone: "prompt", title: S.n, text: bsHoldWords(plan), act: "NEXT STEP", cmd: "b:done"};
      log.push([hhmmss(hot + 6), `${S.n}: ${bsHoldWords(plan)}`, "waiting for you", "wait"]);
    }
  } else {
    s.recipe.cur = old ? 2 : 1; s.sw.g.moved = SW_MOVED; s.sw.g.marks.push([SW_MOVED, s.recipe.cur + 1]);
    log.push([hhmmss(hot + 6), `${S.n}: ${bsHoldWords(plan)}`, "answered", ""], [hhmmss(SW_MOVED), `${S.n} answered: Next Step`, "confirmed", "ok"],
      ...(old ? [] : [[hhmmss(SW_MOVED), "BrewStart finished, HLT AUTO off", "by recipe", ""]]),
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
/* CraftBeerPi's alarm for an element left on by hand: past its target (w.over "target"), or near the boil
   (w.over "boil"), whatever its target. An error, not a warning, so screen.js puts it first in the title bar, before a
   timer or a step's question, and its line stays red: it is the one time heat goes in with nothing watching the
   temperature. cbpi: CraftBeerPi's own warning or error, one without buttons, which OK marks "seen" */
function byHandBanner(v, w) {
  const n = KNAME[v], T = w.t == null ? "" : `${+w.t.toFixed(1)} °F`;
  return {tone: "alarm", cbpi: true, title: n, act: "OK", cmd: "b:ok", text: w.over === "target"
    ? `Above its ${T} target and still heating: its element is on by hand, and in MANUAL nothing stops it at the target. Turn the element off, or put the ${n} in AUTO to hold ${T}.`
    : "Near the boil and still heating: its element is on by hand, and in MANUAL nothing stops it before it boils. Turn the element off."};
}
/* CraftBeerPi's kept warning when a kettle's AUTO has run 5 s with no target (unset, 0 or below). CraftBeerPi takes it
   down by itself once the kettle has a target or leaves AUTO. BoilPower never raises it: it puts its boil threshold in
   as the target as it starts. */
function noTargetBanner(v) {
  return {tone: "prompt", title: `No target for the ${KNAME[v]}`, notgt: v, act: "OK", cmd: "b:ok",
    text: `AUTO is on with no target temperature, so ${v === "mt" ? "the HLT" : "it"} won't heat. Set a target, or switch to MANUAL.`};
}
const noTarget = v => st.v[v].mode === "auto" && st.v[v].sv == null;
/* the SpargeStep's kept prompt, titled with the step's name, in CraftBeerPi's words (SPARGE_READY_TEXT,
   SPARGE_NOW_TEXT). A pump must be off whenever its hoses or valves change, so the prompt says which pumps are off for
   the brewer's hoses, as CraftBeerPi finds them when it asks: both, after the step has switched the wort pump off as it
   started and the HLT pump as the water got there. Its one button answers it */
const SPARGE_PUMPS_OFF = {"hlt,wort": "both pumps are off", hlt: "the HLT pump is off", wort: "the wort pump is off"};
function spargeBanner(temp, a = st.a) {
  const off = SPARGE_PUMPS_OFF[[!a.hltPump.on && "hlt", !a.wortPump.on && "wort"].filter(Boolean).join(",")] || "";
  return {tone: "prompt", title: "Sparge", sparge: true, act: "SPARGE STARTED", cmd: "b:sparge",
    text: temp ? `The sparge water is ready at ${temp} °F${off ? `, and ${off}` : ""}. Set the hoses or valves for a fly or a batch sparge, start the pumps by hand, then press Sparge started, which switches the HLT's AUTO off.`
      : `${off ? `${off[0].toUpperCase()}${off.slice(1)}. ` : ""}Set the hoses or valves for a fly or a batch sparge, start the pumps by hand, then press Sparge started.`};
}
/* its line in the event log, as #sparge-ready asks it with both pumps off, for the moments after it */
const SPARGE_ASKED = (q => `${q.title}: ${q.text}`)(spargeBanner(168, {hltPump: {on: false}, wortPump: {on: false}}));
/* a SpargeStep switches a pump off for the brewer to move its hoses, once a run of the step (CraftBeerPi's _hose_off):
   the wort pump as the step starts, the HLT pump as the water gets there. A Stop and Start never stops one the brewer
   has since started. CraftBeerPi says so only in the prompt's words */
function spargeHose(which) {
  const r = st.recipe, id = which === "hlt" ? "hltPump" : "wortPump";
  r.hoses = r.hoses || [];
  if (r.hoses.includes(which)) return;
  r.hoses.push(which);
  if (st.a[id].on) setActor(id, false);
}
/* the hold before the boil (CraftBeerPi's StepController, with CONFIRM_BEFORE_BOIL Yes, as on the brewer's rig): the
   boil waits, with nothing active, until the brewer starts it. Its words are BoilStep.wait_for_brewer's. Starting the
   boil switches heat on, so here, as with START, it takes a held press (the Held Heat Rule) */
function boilHoldBanner(s) {
  return {tone: "prompt", title: s.n, boilHold: true, act: "START THE BOIL", cmd: "b:boil", hold: true,
    text: "Ready to boil? Move the wort to the boil kettle first - the dashboard is yours meanwhile. The boil kettle stays off until you press Start the boil, or Start on the Brew Steps page. That also switches the wort pump off, so you can move its hoses. (Set CONFIRM_BEFORE_BOIL to No to go straight on.)"};
}
/* the new boil kettle's warning for a forgotten pause: after 2 brewing minutes paused, kept on every page with OK,
   said once per pause, and taken down when the heat carries on or AUTO stops (a CraftBeerPi warning, which uses the
   kettle's name from CraftBeerPi, as "No target for the Mash Tun" does) */
function pauseBanner() {
  return {tone: "prompt", title: `${KNAME.bk} heat still paused`, pausegt: true, act: "OK", cmd: "b:ok",
    text: `The heat has been paused for 2 minutes. To heat again, press and hold PAUSED on the ${KNAME.bk}.`};
}
/* the two reminders that ask for the mash pH, in their own words: CraftBeerPi's, 15 brewing minutes after the malt is
   confirmed, and BrewScribe's, 5 minutes before the last rest's timer ends. Each has CraftBeerPi's own OK, which
   CraftBeerPi runs for every screen (b:ack, phAck) */
const PH_Q = [
  {title: "Check mash pH", text: "It has been 15 minutes since you confirmed mash-in. Check mash pH. Acknowledging this reminder does not record a measurement or change the brew."},
  {title: "BrewScribe: Check mash pH before mash-out", text: "Check mash pH again before mash-out or transfer. Cool a separate sample and record its actual temperature."}
];
const phBanner = i => ({tone: "prompt", title: PH_Q[i].title, text: PH_Q[i].text, act: "OK", cmd: "b:ack"});
/* BrewScribe's other reminders that ask for a reading (READINGS-ENTRY.md), in their own words, in the order they go up:
   the strike water with the first step that prepares it before the first rest (BrewStart, a heating step or MashIn;
   here BrewStart, as it heats the HLT), once per brew and up until answered; the HLT's level as the sparge step
   starts, then the first runnings; the last runnings 5 minutes before the sparge's timer ends; the HLT's level as the
   sparge step is done, then the boil's start; the step after the boil; and once every step is done, the last, which
   names the recipe's planned OG (Test Recipe v5 adds no top-up water). CraftBeerPi shows each titled "BrewScribe: …",
   with its own OK (b:ack, phAck) */
const RD_Q = [
  {title: "BrewScribe: Record strike water", text: "Record the measured strike-water total and any treatments you actually added. This does not confirm that grain has been mixed in."},
  {title: "BrewScribe: HLT level before the sparge", text: "Read the HLT's level before the sparge pump starts. BrewScribe keeps it until the level after the sparge, then saves the difference as the sparge water."},
  {title: "BrewScribe: Check first runnings", text: "Once wort is flowing into the boil kettle, sample the incoming stream for first runnings. Check last runnings before collection ends. A timed later alert needs a running sparge timer."},
  {title: "BrewScribe: Check last runnings", text: "Check the last incoming runnings before finishing collection, while you can still decide whether to continue. Sample the stream, not the mixed kettle."},
  {title: "BrewScribe: HLT level after the sparge", text: "Read the HLT's level now the sparge is done. BrewScribe saves the sparge water: the level before the sparge less this one."},
  {title: "BrewScribe: Record before-boil readings", text: "Before a rolling boil, record the actual kettle volume and gravity. If boiling has already begun, record the actual sample now; do not backdate it. Record actual additions as you make them."},
  {title: "BrewScribe: Record after-boil readings", text: "Record the actual after-boil volume, gravity and any pH sample you take. Keep each sample's own temperature."},
  {title: "BrewScribe: Record final volume and OG", text: "Before the wort leaves the kettle, read its volume. Take the OG from the cooled wort going into the fermenter; the recipe plans 1.053. Then finish your BrewScribe log."}
];
const rdBanner = i => ({tone: "prompt", title: RD_Q[i].title, text: RD_Q[i].text, act: "OK", cmd: "b:ack"});
/* BrewScribe's answer to GET /brewscribe/api/brew-day/readings, in its shape (draft 5, as BrewScribe 0.1.0.dev56 gives
   it): Test Recipe v5's brew log open, in US gallons, every reminder that asks for a reading with its stage, vessel and
   readings, asked first, and nothing saved yet. The two mash pH reminders come first, for the Mash Tun; the strike
   water and the sparge water are the HLT's, the only kettle named HLT; the runnings and the boil are the Boil
   Kettle's. The recipe's targets: a pH's is a plain number, as in draft 4, and this recipe has none (#ph-target gives
   5.3); every other kind's is {value, unit or scale, text}: OG 1.053 (After boil and Final), boil volume 7.00 gal
   (Before boil and Last runnings), sparge 5.00 gal. The brewer's refractometer, from his last Brix reading: wort
   correction factor 1.04, with temperature compensation. His last gravity: the hydrometer's SG, whose usual range and
   sample temperature the gravity reading gives too (rdChosen). The last reminder's older title is listed as well, as
   BrewScribe answers it for a reminder CraftBeerPi kept up across an update. With no log open (log false) the
   reminders are still listed, with no vessel and nothing saved, and why_not says why, in BrewScribe's words */
const SCRIBE_DAY = "4c1d2e0a-7b1f-4c55-9a8e-2f6d1b0c9e31";
const PH_NOLOG = "No BrewScribe log is open, so there's nowhere to save it. Start one on BrewScribe's page.";
const SCRIBE_REFR = {wort_correction_factor: 1.04, temperature_compensation: "yes", calibration_temperature: 68, calibration_temperature_unit: "f"};
function scribeDay(log = true) {
  const usual = {min: 50, max: 95}, boilV = {value: 7.0, unit: "us_gal", text: "recipe boil volume 7.00 gal"};
  const rd = (asks, asked = true) => ({kind: "ph", label: "pH", min: 0, max: 14, decimals: 2, usual: {min: 4, max: 7, start: 5.4}, asked, sample_temperature: asks, sample_usual: usual, target: null, saved: null});
  const grav = og => rdChosen({kind: "gravity", label: "Gravity", asked: true, usual: null, sample_temperature: null, sample_usual: usual,
    choices: [{instrument: "hydrometer", scale: "sg", label: "SG", min: 0.9, max: 1.5, decimals: 3, usual: {min: 1, max: 1.12, start: 1.05}, sample_temperature: "asked"},
      {instrument: "refractometer", scale: "brix", label: "°Bx", min: 0, max: 100, decimals: 1, usual: {min: 0, max: 25, start: 12}, sample_temperature: "optional"},
      {instrument: "hydrometer", scale: "plato", label: "°P", min: 0, max: 100, decimals: 1, usual: {min: 0, max: 25, start: 12}, sample_temperature: "asked"}],
    chosen: null, refractometer: Object.assign({}, SCRIBE_REFR), target: og ? {value: 1.053, scale: "sg", text: "recipe OG 1.053"} : null, saved: null}, {instrument: "hydrometer", scale: "sg"});
  const vol = (kind, label, asked, target, more) => Object.assign({kind, label, asked, unit: "us_gal", min: 0, max: null, decimals: 2, usual: {min: 0, max: 20, start: 5}, sample_temperature: "none", sample_usual: null}, more, {target, saved: null});
  const rem = (title, stage, name, v, readings, focus = readings[0].kind) => ({title, stage, stage_name: name, vessel: log ? v : null, vessel_problem: null,
    page: `/brewscribe/#stage=${stage}&focus=${focus}`, readings});
  const last = title => rem(title, "transfer", "Final volume / transfer", KNAME.bk, [vol("volume", "Volume", true, null), grav(true)]);
  return {log: log ? {day_id: SCRIBE_DAY, name: RECIPE_NAME} : null, why_not: log ? null : PH_NOLOG, temperature_unit: "f", volume_unit: "us_gal", volume_label: "gal",
    reminders: [rem(PH_Q[0].title, "mash_start", "Early mash", KNAME.mt, [rd("optional")]), rem(PH_Q[1].title, "mash_end", "End of mash", KNAME.mt, [rd("asked")]),
      rem(RD_Q[0].title, "strike_water", "HLT water prep", KNAME.hlt, [vol("volume", "Volume", true, null)]),
      rem(RD_Q[1].title, "sparge_water", "Sparge water", KNAME.hlt, [vol("level", "HLT level before the sparge", true, null)], "level-before"),
      rem(RD_Q[2].title, "first_runnings", "First runnings", KNAME.bk, [grav(false), rd("optional", false)]),
      rem(RD_Q[3].title, "last_runnings", "Last runnings", KNAME.bk, [grav(false), rd("optional", false), vol("volume", "Volume", false, boilV)]),
      rem(RD_Q[4].title, "sparge_water", "Sparge water", KNAME.hlt, [vol("sparge_water", "Sparge water", true, {value: 5.0, unit: "us_gal", text: "recipe sparge 5.00 gal"}, {level_before: null})], "level-after"),
      rem(RD_Q[5].title, "pre_boil", "Before boil", KNAME.bk, [vol("volume", "Volume", true, boilV), grav(false)]),
      rem(RD_Q[6].title, "post_boil", "After boil", KNAME.bk, [vol("volume", "Volume", true, null), grav(true), rd("asked", false)]),
      last(RD_Q[7].title), last("BrewScribe: Review the finished brew")]};
}
/* a gravity reading's pair to start in, with that pair's usual range and sample temperature, as BrewScribe gives them
   beside its choices */
function rdChosen(g, pair) {
  const c = g.choices.find(x => x.instrument === pair.instrument && x.scale === pair.scale) || g.choices[0];
  return Object.assign(g, {chosen: {instrument: c.instrument, scale: c.scale}, usual: Object.assign({}, c.usual), sample_temperature: c.sample_temperature});
}
/* ---------- the boil kettle: the default faceplate (?bk=power), the faceplate the screen shows with an older BoilPower
   (?bk=today), which boil-kettle.html compares with it, or ?bk=words, a words-only alternative kept for comparison. The
   older faceplate's power and temperature controls are not intuitive. BoilPower isn't a thermostat. It heats at full
   power until the wort reaches its threshold (boilFrom), then holds the element at the boil power; in a whirlpool hold
   it holds that temperature instead (the kettle's target, or Hold_Target in an older BoilPower) and never uses the boil
   power. Both redesigns say so:
   words: the older faceplate's layout. The green number is the temperature the boil counts from, labelled BOIL, and the
          button beside AUTO/MANUAL sets it (BOIL AT, 212 °F at most). BOIL POWER, beside the element, sets the boil power.
          A whirlpool hold shows HOLD and its temperature.
   power: the green number is the boil power, as on a boil controller (Auber's EZboil shows "P 45" in its SV window).
          The power box also holds BOIL AT and the usual power. Three ideas from commercial boil controllers come with
          it (nudgeHTML below).
   In both, the power button sets the boil power in either mode: it never changes meaning with the mode. In MANUAL the
   element runs at its own level, as the HLT's does.
   The newer BoilPower gives the boil kettle an ordinary target, BOIL or a temperature to hold: set to 170 °F, like the
   HLT's, it holds there. So power has TARGET beside AUTO/MANUAL, as the HLT does, and the boil power's button sits in
   its window: while the target is BOIL, the green 45 % is that button. A hold reads like the HLT: SV and its
   temperature, with OUT. */
const bkNew = v => v === "bk" && BK !== "today";
/* BoilPower's boil latch: set when the wort reaches the threshold (boilFrom), and from then on the element runs at the boil
   power. With Keep_Boiling "Yes" (the default) it lets go 3.6 °F (2 °C) below the threshold and heats at full power until
   the wort boils again; with "No" the boil power alone drives the temperature: it holds the boil power until AUTO stops,
   even if the wort falls below a boil, as when the boil power is set too low. The real screen can't read the latch; it
   can tell from the element running at the boil power while the wort is below the threshold (BUILD-NOTES).
   The same 3.6 °F below the boil point is where the new boil kettle's targets stop being BOIL (bkHoldT). */
const BOIL_MARGIN = 3.6;
const bkLetGo = () => +(boilFrom() - BOIL_MARGIN).toFixed(1);
/* the temperature the boil kettle holds, or null while it boils. With the newer BoilPower (?bk=power): its own target
   when it is set and below BOIL. With an older one: the separate Hold_Target, which only the Whirlpool step and
   CraftBeerPi's own dashboard set */
const bkHoldT = () => { const V = st.v.bk; return BK === "power" ? (V.sv > 0 && V.sv < bkLetGo() ? V.sv : null) : V.hold ?? null; };
const bkHolding = () => st.v.bk.mode === "auto" && bkHoldT() != null;
const bkLatched = () => { const V = st.v.bk; return V.mode === "auto" && bkHoldT() == null && (V.latched ?? V.pv >= boilFrom()); };
function bkLine() {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT();
  if (V.mode !== "auto") {
    const w = byHand("bk");
    if (w) return byHandLine("bk", w);
    /* the new MANUAL: by hand the element runs at the boil power, so the line says at what. A boil kettle boiling by
       hand needs no caution (The By Hand Rule) */
    if (BKMAN === "new") return el.on ? `Heating by hand at ${V.bp} %` : `MANUAL · heats at ${V.bp} % by hand`;
    return "MANUAL · element by hand";
  }
  /* a forgotten pause would quietly stop the boil, so the line counts it, in Prompt Amber like the button */
  if (BK === "power" && el.paused) return `<span class="warn">Heat paused for <span id="pz">${mmss(Math.max(0, st.t - el.pausedAt))}</span></span>`;
  /* the new boil kettle: a hold is a target like the HLT's, and from BoilPower 0.0.3.post8 a PID holds it as the HLT's PID holds its
     own, so its line reads exactly like the HLT's. The element can be off just below the target while the wort still
     rises, and comes back on as the rise slows, so the line doesn't say where it heats again */
  if (ho != null && BK === "power") {
    const d = ho - V.pv;
    if (Math.abs(d) < 0.3) return "At target";
    const eta = GRAPHS ? graphETA("bk") : "";
    return (d > 0 ? `${d.toFixed(1)} °F below target` : `${(-d).toFixed(1)} °F above target`) + (eta ? ` · ${eta}` : "");
  }
  if (ho != null) {
    const d = ho - V.pv;
    return `Holding ${+ho.toFixed(1)} °F for the whirlpool` + (Math.abs(d) >= 0.3 ? ` · ${Math.abs(d).toFixed(1)} °F ${d > 0 ? "below" : "above"}` : "");
  }
  if (V.pv >= boilFrom()) return BK === "power" ? "Boiling" : `Boiling at ${V.bp} %`;
  /* the new boil kettle, still at the boil power below the threshold: say what happens next, or that it won't */
  if (BK === "power" && bkLatched()) return V.keep !== false ? `Below a boil · full power at ${bkLetGo()} °F`
    : `Not boiling · ${(boilFrom() - V.pv).toFixed(1)} °F below ${boilFromText()} °F`;
  const eta = GRAPHS ? graphETA("bk") : "";
  return (BK === "power" ? "Full power until it boils" : `Full power until it boils, then ${V.bp} %`) + (eta ? ` · ${eta}` : "");
}
/* BoilPower's output in a hold. From 0.0.3.post8 (?bk=power) a PID sets it: 14 % for each °F short, up to 100 %, plus
   what its integral has built up near the target, less a brake on the wort's rise. For the demo, the first moment: a
   hold just begun has built up nothing, so it starts at 14 % a °F short (52 % at 3.7 °F, the plugin's first pass on the
   simulators' kettle). One already running (running) has built up about what the kettle loses where it holds, 21 % at
   150 °F and 26 % at 170 °F on the simulators' kettle, so it carries on from that, a little past the target too. An
   older BoilPower (_hold_climb_power): full power from 7.2 °F below, easing to Hold_Power (30 %) at the hold, off at or
   above it; inside 3.6 °F it only carries on heating (running: it was heating), so a fresh start there rests */
function holdOut(T, pv, running) {
  const below = T - pv;
  if (BK === "power") return Math.round(Math.min(100, Math.max(0, 14 * below + (running ? Math.max(0, 21 + (T - 150) / 4) : 0))));
  if (below >= 7.2) return 100;
  if (below <= 0 || (below <= BOIL_MARGIN && !running)) return 0;
  return Math.trunc(30 + 70 * below / 7.2);
}
/* ending a pause (carrying on, MANUAL, ALL OFF) also takes CraftBeerPi's forgotten-pause warning down */
function endPause() {
  const el = st.a.bkEl;
  el.paused = false; el.pauseWarned = false;
  if (st.banner && st.banner.pausegt) st.banner = null;
  questionGone(pauseBanner().title, "no longer needed");
}
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const f1 = n => n == null ? "– –" : n.toFixed(1);
const pad = n => String(n).padStart(2, "0");
const mmss = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
/* a time of day as CraftBeerPi keeps it, 24-hour: "07:00", "23:15:40" (saved times and LOG's lines keep this form) */
const hhmm = t => `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}`;
const hhmmss = t => `${hhmm(t)}:${pad(t % 60)}`;
/* CraftBeerPi's CLOCK_FORMAT setting (The Twelve-Hour Rule): "12-hour", which CraftBeerPi writes into a configuration
   without it and the mockup shows, or "24-hour", which the mockup shows with ?clock=24. A /config without the setting,
   a blank one or any other value is 24-hour, as on a core that has no such setting */
const CLOCK24 = new URLSearchParams(location.search).get("clock") === "24";
/* every time of day the screen shows, in parts: t in seconds on CraftBeerPi's clock (only the time of day counts), as
   the digits, "7:00" or with seconds "11:15:40", and the half, "AM" or "PM": midnight's hour is 12 AM, noon's 12 PM.
   In 24-hour the digits are "07:00" and there is no half */
function todParts(t, secs) {
  const d = ((Math.floor(t) % 86400) + 86400) % 86400, h = Math.floor(d / 3600), rest = `:${pad(Math.floor(d / 60) % 60)}${secs ? `:${pad(d % 60)}` : ""}`;
  return CLOCK24 ? {hm: pad(h) + rest, ap: ""} : {hm: (h % 12 || 12) + rest, ap: h < 12 ? "AM" : "PM"};
}
/* the one formatter for a time of day: "7:00 AM", "11:15:40 PM" with seconds, the half kept with the digits by a
   no-break space so a line never ends between them; in 24-hour "07:00", "23:15:40" */
const tod = (t, secs) => { const p = todParts(t, secs); return p.ap ? `${p.hm}\u00a0${p.ap}` : p.hm; };
/* a time kept 24-hour ("07:00", "23:15:40"), shown by the setting, with its seconds where it has them */
const todS = x => { const [h, m, s] = String(x).split(":").map(Number); return tod(h * 3600 + m * 60 + (s || 0), s != null); };
/* a length of time keeps to one line: its spaces are no-break spaces ("9 h 48 min") */
const nb = s => s.replace(/ /g, "\u00a0");
/* CraftBeerPi's clock, which every brewing time on the screen is on (The One Clock Rule): st.t, its seconds from the
   moment's midnight. A simulator's (st.sim) runs SIM_TIME_SCALE times as fast and has a date of its own, day0 being
   its date at st.t 0; the screen's own date is pc, and its time of day pcT where the moment gives one (else st.t's).
   The title bar always shows CraftBeerPi's date, and on a simulator SPEED */
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], MON3 = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_SAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], MON_SAY = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayOf = t => Math.floor(t / 86400);
/* how many of CraftBeerPi's seconds go by in a real second: SIM_TIME_SCALE on a simulator, else 1 */
const SC = () => st && st.sim ? st.sim.scale : 1;
/* CraftBeerPi's date at st.t 0: a simulator's own (day0); otherwise the moment's (st.day0), by default Friday 20 Nov
   2026, the night before brew day in the strike water moments */
const DAY0 = "2026-11-20";
const day0 = () => (st && st.sim && st.sim.day0) || (st && st.day0) || DAY0;
function clockDay(t) { const d = new Date(day0() + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + dayOf(t)); return d; }
const ymd = d => d.toISOString().slice(0, 10);
/* a day on CraftBeerPi's clock (dayOf) as the date a step keeps, and back */
const dateOf = i => ymd(clockDay(i * 86400));
const dayIdx = iso => Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(day0() + "T00:00:00Z")) / 86400000);
/* a day in words: "Sat" (dShort), "Sat 21 Nov" (dMid), "Saturday 21 November" (dLong), "SAT 21" (dKey) */
const tcase = w => w[0] + w.slice(1).toLowerCase();
const dShort = i => tcase(DOW[clockDay(i * 86400).getUTCDay()]);
const dMid = i => { const d = clockDay(i * 86400); return `${tcase(DOW[d.getUTCDay()])} ${d.getUTCDate()} ${tcase(MON3[d.getUTCMonth()])}`; };
const dLong = i => { const d = clockDay(i * 86400); return `${DOW_SAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON_SAY[d.getUTCMonth()]}`; };
const dKey = i => { const d = clockDay(i * 86400); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()}`; };
/* CraftBeerPi's clock where it isn't the screen's (another date, or a speed other than 1×), or null: the tag
   ?simtag=today draws, LOG's dates and BrewStart's clock tag */
function clockTag() {
  const sim = st.sim;
  if (!sim) return null;
  const d = clockDay(st.t), other = ymd(d) !== sim.pc, fast = sim.scale !== 1;
  return other || fast ? {d, other, fast, scale: sim.scale} : null;
}
/* whether CraftBeerPi's clock is the real time: at 1× and within a minute of the screen's own clock. The rig's moments
   are; a simulator's is where it runs at 1× on the screen's date (and time, where the moment gives it) */
function clockReal() {
  const sim = st.sim;
  if (!sim) return true;
  const off = (Date.parse(ymd(clockDay(st.t)) + "T00:00:00Z") - Date.parse(sim.pc + "T00:00:00Z")) / 1000
    + (sim.pcT != null ? (((st.t % 86400) + 86400) % 86400) - sim.pcT : 0);
  return sim.scale === 1 && Math.abs(off) <= 60;
}
/* the title bar's time: the digits, then AM or PM at about half their size after a thin space (brew-day.css .ap); in
   24-hour the digits alone */
const clockHTML = () => { const p = todParts(st.t); return p.ap ? `${p.hm}\u2009<span class="ap">${p.ap}</span>` : p.hm; };
/* the title bar's clock (SIMTAG). By default (a) CraftBeerPi's date, always, on every CraftBeerPi and at every speed,
   on a quiet line just left of the time, said to a screen reader; on a simulator SPEED left of them, a button which
   opens a chooser of speeds (spdDraw); ?simtag=b the speeds in a row in the button's place; ?simtag=c a two-line SPEED
   button as tall as ALL OFF; ?simtag=today the tag as built before, the date and speed in one blue box, only on a
   simulator where either isn't the screen's, and the time alone elsewhere. SPEED shows on any simulator, at 1× on the
   screen's date too, so its speed can always be changed; on a phone the date and a compact SPEED button go under the
   time. Where CraftBeerPi's clock isn't the real time (clockReal), the time and the date are in italics and Note Amber,
   and a screen reader hears so. A simulator (st.sim) is a CraftBeerPi running the cbpi4-simvessel plugin
   (/plugin/list) with SIM_TIME_SCALE in /config */
const SIMTAG = (v => ["a", "b", "c", "today"].includes(v) ? v : "a")(new URLSearchParams(location.search).get("simtag"));
/* the speeds offered: SIM_TIME_SCALE's usual ones, with the one it has where that is another */
const SPEEDS = [1, 10, 30, 60];
const spdList = () => SPEEDS.includes(st.sim.scale) ? SPEEDS : [...SPEEDS, st.sim.scale].sort((x, y) => x - y);
/* this computer's time of day (a moment's sim.pcT, else 9:02:40 PM) and, in the core's words for a moment on its clock
   (clock_controller.clock_time), its date and time, "Sun 22 Nov 9:02 PM": where a new speed starts CraftBeerPi's clock
   again (cbpi.api.clock.reset, core post63) */
const spdPcT = () => st.sim.pcT != null ? st.sim.pcT : 21 * 3600 + 2 * 60 + 40;
function spdPc() { const d = new Date(st.sim.pc + "T00:00:00Z"); return `${tcase(DOW[d.getUTCDay()])} ${d.getUTCDate()} ${tcase(MON3[d.getUTCMonth()])} ${tod(spdPcT())}`; }
const spdSay = () => `A new speed starts CraftBeerPi's clock again from this computer's time, ${spdPc()}.`;
const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';
/* the date line and SPEED (a, c) or the speeds' row (b), left of the time; drawn again only where they change, keeping
   the focus in them, as the time changes every second. The date's words are drawn twice: .cdz, unseen, holds their
   room beside the time; .cdl is the date itself, there or above the time (clockRoom) */
function spdClock(el, ct) {
  const sim = st.sim, n = sim ? sim.scale : 1, d = clockDay(st.t), phone = matchMedia("(max-width:700px)").matches, real = clockReal();
  const lost = st.link === "lost", P = st.spdPend, fast = n === 1 ? "" : `, running ${n} times as fast`;
  const words = `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON3[d.getUTCMonth()]}`, when = `${DOW_SAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON_SAY[d.getUTCMonth()]}`;
  const said = real ? `CraftBeerPi's clock, ${when}` : `CraftBeerPi's clock, not the real time: ${when}, ${tod(st.t)}`;
  const date = `<span class="cdr"><span class="cdz" aria-hidden="true">${words}</span><span class="cdl" aria-hidden="true">${words}</span><span class="sr">${said}</span></span>`;
  const big = SIMTAG === "c" && !phone;
  const sp = !sim ? "" : SIMTAG === "b" && !phone
    ? `<span class="spdrow" role="group" aria-label="Simulator speed${fast}">${spdList().map(v => `<button type="button" data-cmd="spd:set:${v}" aria-pressed="${v === (P || n)}" title="${esc(spdSay())}"${lost || (P && v !== P) ? ` aria-disabled="true" data-why="${lost ? PAUSED : WAIT}"` : ""}>${v}×</button>`).join("")}</span>`
    : b(`spd${big ? " spdc" : ""}`, `${n}×<span class="lg"> SPEED</span>${big ? "" : CHEV}`, big ? "change" : "", {cmd: "spd:open", expanded: !!st.spdOpen, controls: "spd-box", label: `Simulator speed, ${n}×${fast}. Change it`, why: lost ? PAUSED : ""}).replace("<button ", '<button aria-haspopup="dialog" ');
  const cs = date + sp;
  if (el.dataset.sim !== "spd") { el.innerHTML = '<span class="ct"></span><span class="cs"></span>'; el.dataset.sim = "spd"; el._ct = el._cs = null; }
  if (el._ct !== ct) { el.querySelector(".ct").innerHTML = ct; el._ct = ct; }
  if (real !== !el.hasAttribute("data-real")) {
    if (real) { el.removeAttribute("data-real"); el.querySelector(".ct").removeAttribute("aria-hidden"); }
    else { el.dataset.real = "no"; el.querySelector(".ct").setAttribute("aria-hidden", "true"); }
  }
  if (el._cs !== cs) {
    const w = el.querySelector(".cs"), a = document.activeElement, f = w.contains(a) ? a.dataset.cmd : null;
    w.innerHTML = cs; el._cs = cs;
    if (f) w.querySelector(`[data-cmd="${f}"]`)?.focus({preventScroll: true});
    clockWatch();
  }
}
/* the date beside the time while its room (.cdr) holds its words (.cdz), above the time once something longer in the
   title bar has taken the room (data-over); the time's width (--ctw) lines the date up with it there. Measured whenever
   the room, the words or the time change size */
let clockRO = null;
function clockRoom() {
  const el = $("#clock"), r = el && el.querySelector(".cdr"), z = el && el.querySelector(".cdz"), t = el && el.querySelector(".ct");
  if (!r || !z || !t) return;
  const cs = getComputedStyle(r);
  const over = cs.display !== "contents" && r.getBoundingClientRect().width + .5 < z.getBoundingClientRect().width + (parseFloat(cs.paddingRight) || 0);
  if (el.hasAttribute("data-over") !== over) el.toggleAttribute("data-over", over);
  const w = `${t.getBoundingClientRect().width}px`;
  if (el.style.getPropertyValue("--ctw") !== w) el.style.setProperty("--ctw", w);
}
function clockWatch() {
  if (typeof ResizeObserver !== "function") return;
  clockRO = clockRO || new ResizeObserver(clockRoom);
  clockRO.disconnect();
  ["#clock", "#clock .cdr", "#clock .cdz", "#clock .ct"].forEach(s => { const n = $(s); if (n) clockRO.observe(n); });
}
/* the chooser SPEED opens (a, c): SIMULATOR SPEED set into its top edge, the speeds in the pressed look's row, the one
   CraftBeerPi runs at pressed, what a new one does to its clock, SIMULATOR VESSELS (svHTML), then RESET ALL and CANCEL;
   under the title bar at its right, on a phone as wide as the window allows. Drawn again only where it changes, a
   temperature being typed keeping its caret; the vessels' temperatures follow the readings in place (svTemps) */
function spdDraw() {
  const box = $("#spd-box");
  if (!box) return;
  if (!(st.spdOpen && st.sim && SIMTAG !== "today")) { if (!box.hidden) { box.hidden = true; box.innerHTML = ""; box._h = null; } return; }
  const n = st.sim.scale, P = st.spdPend, why = st.link === "lost" ? PAUSED : P ? WAIT : "", sv = svHTML();
  const html = '<h3 class="spdt" id="spd-t">SIMULATOR SPEED</h3><div class="spdin">'
    + `<div class="seg spdsel" role="group" aria-label="Speeds">${spdList().map(v => b("", `${v}×`, "", {cmd: `spd:set:${v}`, pressed: v === (P || n), why: v === P ? "" : why})).join("")}</div>`
    + `<p class="spdsay">${P ? `Setting ${P}×: waiting for CraftBeerPi.` : esc(spdSay())}</p>`
    + sv + (st.svAsk && sv ? "" : `<div class="spdact">${sv ? b("cmdbtn svall", "RESET ALL", "", {cmd: "spd:vall", why: st.link === "lost" ? PAUSED : svBusy() ? WAIT : ""}) : ""}${b("cmdbtn", "CANCEL", "", {cmd: "spd:x", why: P ? WAIT : ""})}</div>`) + "</div>";
  if (box._h !== html) {
    const a = document.activeElement, f = box.contains(a) ? a.dataset.cmd : null, inp = box.contains(a) && a.tagName === "INPUT" ? [a.id, a.selectionStart, a.selectionEnd] : null;
    const was = box.querySelector(".spdin"), top = was ? was.scrollTop : 0;
    box.innerHTML = html; box._h = html; box.hidden = false;
    spdFit(box);
    box.querySelector(".spdin").scrollTop = top;
    if (inp) { const i = document.getElementById(inp[0]); if (i) { i.focus({preventScroll: true}); i.setSelectionRange(inp[1], inp[2]); } }
    else if (f) box.querySelector(`[data-cmd="${f}"]`)?.focus({preventScroll: true});
  }
  spdFit(box);
  svTemps();
}
/* the chooser kept inside the window: what is under its title scrolls inside it where the window is too short for all
   of it (a phone with RESET ALL's question open). Its height is what the window has below where it starts on the page,
   so scrolling the page never makes it taller */
function spdFit(box) {
  const inner = box.querySelector(".spdin");
  if (!inner) return;
  const h = `${Math.max(160, Math.floor(window.innerHeight - inner.getBoundingClientRect().top - window.scrollY - 24))}px`;
  if (box.style.getPropertyValue("--spd-max") !== h) box.style.setProperty("--spd-max", h);
}
/* SIMULATOR VESSELS, the chooser's second part: the brewery's vessels whose probe is a simulated vessel (cbpi4-simvessel's
   SimVessel sensors), named as their kettles are in CraftBeerPi. Each has the temperature Brew Day reads for it, RESET,
   and a small box for a temperature in the brewery's unit with SET TEMPERATURE; RESET ALL is beside CANCEL. RESET sends
   the vessel's "Reset to room" (cbpi4-simvessel 0.0.18): room temperature (its Ambient), the probe with it at once,
   water refilled, a strike water move and dough-in cleared. SET TEMPERATURE sends "Set Temperature", for a hot start.
   RESET ALL asks first, naming each vessel's room temperature; neither answer is the default, and RESET THE VESSELS
   sends every vessel's RESET at once. Neither RESET nor SET TEMPERATURE asks: each is quick to do again. Commands go
   only to SimVessel sensors; with none (the rig, which has no chooser either) the part isn't drawn. A vessel's buttons
   wait while its command does; the plugin's notice says what each did, in LOG. Here every vessel is a simulated one at
   room temperature 68 °F, and CraftBeerPi answers a moment later */
const SV_U = "°F", SV_ROOM = 68;
/* the vessels' water once refilled, in litres, as the simulator's own notice gives it: the HLT BrewStart's 25.4 gal, the
   mash tun's and the boil kettle's Volume */
const SV_WATER = {hlt: 96.1, mt: 30.0, bk: 40.0};
const svList = () => ["hlt", "mt", "bk"].map(v => ({v, name: KNAME[v], probe: PROBE[v], room: SV_ROOM}));
const svBusy = () => Object.keys(st.svPend || {}).length > 0;
/* a temperature as the question says it, "68 °F" or "168.8 °F" */
const svT = x => `${+(+x).toFixed(1)}&nbsp;${SV_U}`;
/* what SET TEMPERATURE takes: a number from freezing to boiling, in the brewery's unit */
const svLim = () => [32, 212];
const svNum = t => { const s = String(t ?? "").trim(), x = s === "" ? NaN : Number(s); return Number.isFinite(x) ? Math.round(x * 10) / 10 : null; };
const svWhy = t => { const [lo, hi] = svLim(), x = svNum(t); return x != null && x >= lo && x <= hi ? "" : `Type a temperature from ${lo} to ${hi} ${SV_U} first.`; };
function svHTML() {
  const V = svList();
  if (!V.length) return "";
  const lost = st.link === "lost", P = st.svPend || {}, busy = svBusy() ? WAIT : "";
  const rows = V.map(x => {
    const why = lost ? PAUSED : P[x.v] ? WAIT : "", t = (st.svIn || {})[x.v] || "", room = `${+(+x.room).toFixed(1)} ${SV_U}`;
    return `<div class="svrow" role="group" aria-labelledby="sv-n-${x.v}"><p class="svn"><span id="sv-n-${x.v}">${esc(x.name)}</span><span class="svt" id="sv-t-${x.v}"></span></p>`
      + b("cmdbtn svr", "RESET", "", {cmd: `spd:vreset:${x.v}`, label: `Reset the ${x.name} to room temperature, ${room}`, why})
      + `<div class="svset"><span class="svin"><input id="sv-in-${x.v}" data-v="${x.v}" inputmode="decimal" autocomplete="off" maxlength="5" value="${esc(t)}" aria-label="New temperature for the ${esc(x.name)}, in ${SV_U}"><span aria-hidden="true">${SV_U}</span></span>`
      + b("cmdbtn svs", "SET TEMPERATURE", "", {cmd: `spd:vset:${x.v}`, label: `Set temperature of the ${x.name}`, why: why || svWhy(t)}) + "</div></div>";
  }).join("");
  const ask = st.svAsk ? `<div class="confirm svask" role="group" aria-labelledby="sv-q"><p id="sv-q" tabindex="-1">Put every simulated vessel back at room temperature: ${V.map(x => `${esc(x.name)} ${svT(x.room)}`).join(", ")}, water refilled? A running recipe keeps running.</p>`
    + `<div>${b("yes", "RESET THE VESSELS", "", {cmd: "spd:vall-yes", why: lost ? PAUSED : busy})}${b("", "CANCEL", "", {cmd: "spd:vall-no", why: busy})}</div></div>` : "";
  return `<h3 class="svh" id="sv-h">SIMULATOR VESSELS</h3><div class="svl" role="group" aria-labelledby="sv-h">${rows}</div>${ask}`;
}
/* each vessel's temperature as Brew Day reads it, in place, as the readings come */
function svTemps() {
  svList().forEach(x => { const el = document.getElementById(`sv-t-${x.v}`), s = `${f1(st.v[x.v].pv)} ${SV_U}`; if (el && el.textContent !== s) el.textContent = s; });
}
const svFocus = sel => setTimeout(() => $(sel)?.focus({preventScroll: true}), 0);
/* RESET ALL (vall) opens its question, focus on its words; CANCEL (vall-no) closes it, focus back on RESET ALL; RESET THE
   VESSELS (vall-yes) resets each; RESET (vreset) one; SET TEMPERATURE (vset) one, to the figure typed in its box */
function svCmd(x, y) {
  const lost = st.link === "lost";
  if (x === "vall") { if (lost || svBusy()) return; st.svAsk = true; renderAll(); setTimeout(() => { const q = $("#sv-q"); if (q) { q.focus({preventScroll: true}); const i = q.closest(".spdin"); if (i) i.scrollTop = i.scrollHeight; } }, 0); return; }
  if (x === "vall-no") { st.svAsk = false; renderAll(); svFocus('#spd-box [data-cmd="spd:vall"]'); return; }
  if (lost) return;
  if (x === "vall-yes") return svGo(svList(), "reset_to_room");
  if (x === "vreset") return svGo(svList().filter(s => s.v === y), "reset_to_room");
  if (x === "vset") {
    const t = (st.svIn || {})[y] || "";
    if (svWhy(t)) return;
    return svGo(svList().filter(s => s.v === y), "set_temperature", svNum(t));
  }
}
/* the vessels' command: CraftBeerPi's answer a moment later, the vessel there, and the plugin's own notice in LOG */
function svGo(list, action, temp) {
  if (!list.length || list.some(x => st.svPend[x.v])) return;
  const reset = action === "reset_to_room";
  list.forEach(x => { st.svPend[x.v] = action; });
  renderAll();
  timers.push(setTimeout(() => {
    list.forEach(x => {
      delete st.svPend[x.v];
      st.v[x.v].pv = reset ? x.room : temp;
      logEvent(reset ? `SimVessel: ${x.name} back at room temperature, ${(+x.room).toFixed(1)} ${SV_U}, full of water: ${SV_WATER[x.v].toFixed(1)} L.`
        : `SimVessel: ${x.probe} set to ${temp.toFixed(1)}`, "from CraftBeerPi", "");
    });
    const asked = st.svAsk;
    st.svAsk = false;
    renderAll();
    if (asked) svFocus('#spd-box [data-cmd="spd:vall"]');
  }, 700));
}
/* SPEED opens and closes the chooser, LOG's list closing (one at a time), focus on the speed pressed; CANCEL, Escape
   and a press outside close it, focus back on SPEED. A speed pressed is saved as SIM_TIME_SCALE at once, its button
   pressed while it goes; once CraftBeerPi has it, its clock starts again from this computer's time (core post63): LOG
   gets the core's own words, the box closes, and the date line goes where the clock is now on the screen's date. The
   speed it runs at already changes nothing, and closes the box. In the row (b) a speed applies the same way */
function spdCmd(x, y) {
  if (!st.sim) return;
  if (x === "open") { st.spdOpen = !st.spdOpen; if (st.spdOpen) st.logOpen = false; renderAll(); setTimeout(() => (st.spdOpen ? $('#spd-box [aria-pressed="true"]') : $('#clock [data-cmd="spd:open"]'))?.focus({preventScroll: true}), 0); return; }
  if (x === "x") return spdClose();
  if (x.startsWith("v")) return svCmd(x, y);
  if (x !== "set" || st.spdPend || st.link === "lost") return;
  const v = +y;
  if (v === st.sim.scale) return spdClose();
  st.spdPend = v; renderAll();
  timers.push(setTimeout(() => {
    const was = st.sim.scale, wasT = st.t, shift = Math.round((Date.parse(day0() + "T00:00:00Z") - Date.parse(st.sim.pc + "T00:00:00Z")) / 86400000);
    st.spdPend = null;
    st.events.forEach(e => { e[5] = (e[5] || 0) + shift; });
    st.sim = Object.assign({}, st.sim, {scale: v, day0: st.sim.pc});
    st.t = spdPcT();
    /* the core moves the sensor logs' readings with its clock, so the graphs keep them and carry on from them: a row's
       time counts from its day's midnight, so it moves as far as the clock did from one day to the other */
    if (st.hist) { const by = Math.round((st.t - wasT) / 10) * 10; ["hlt", "mt", "bk"].forEach(k => { st.hist.v[k] = st.hist.v[k].map(r => [r[0] + by, ...r.slice(1)]); }); st.hist.start += by; st.hist.steps = st.hist.steps.map(([t, n]) => [t + by, n]); }
    const said = `CraftBeerPi's clock is back to this computer's time, ${spdPc()}, now running ${v}× (was ${was}×).`;
    logEvent(`Clock: ${said}`, "from CraftBeerPi", "");
    say(said);
    const wasOpen = st.spdOpen;
    st.spdOpen = false; st.svAsk = false; renderAll(); startTick();
    if (wasOpen) setTimeout(() => $('#clock [data-cmd="spd:open"]')?.focus({preventScroll: true}), 0);
  }, 700));
}
function spdClose() {
  if (st.spdPend || !st.spdOpen) return;
  st.spdOpen = false; st.svAsk = false; renderAll();
  setTimeout(() => $('#clock [data-cmd="spd:open"]')?.focus({preventScroll: true}), 0);
}
function clockSet() {
  const el = $("#clock"), ct = clockHTML();
  if (SIMTAG !== "today") return spdClock(el, ct);
  if (el.dataset.sim === "spd") { el.innerHTML = ""; el._ct = el._cs = null; el.removeAttribute("data-real"); el.removeAttribute("data-over"); }
  const g = clockTag();
  /* the rig, and a simulator on the screen's date at 1×: the time alone, as ever */
  if (!g) { el.removeAttribute("data-sim"); if (el.innerHTML !== ct) el.innerHTML = ct; return; }
  const {d, other, fast, scale} = g;
  /* the weekday and SPEED give way on a phone (.lg), so the brewery's name keeps its room */
  const line = [other ? `<span class="lg">${DOW[d.getUTCDay()]} </span>${d.getUTCDate()} ${MON3[d.getUTCMonth()]}` : "", fast ? `${scale}×<span class="lg"> SPEED</span>` : ""].filter(Boolean).join(" · ");
  const said = `CraftBeerPi's clock${other ? `, ${DOW_SAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON_SAY[d.getUTCMonth()]}` : ""}${fast ? `, running ${scale} times as fast` : ""}`;
  const html = `<span class="ct">${ct}</span><span class="cd" aria-hidden="true">${line}</span><span class="sr">${said}</span>`;
  if (el.innerHTML !== html) el.innerHTML = html;
  el.setAttribute("data-sim", "tag");
}
/* BrewStart's box on a simulator whose clock isn't the screen's (clockTag): where that clock is, in the title bar tag's
   look, always with its date and with its speed where it isn't 1×: "CRAFTBEERPI'S CLOCK · MON 23 NOV, 1:16 PM · 30×
   SPEED", said in full in sentence case. Each part keeps to one line; the tag wraps between them. Nothing on the rig */
function bsClockHTML() {
  const g = clockTag();
  if (!g) return "";
  const {d, fast, scale} = g, t = tod(st.t);
  const line = [nb("CRAFTBEERPI'S CLOCK"), nb(`${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON3[d.getUTCMonth()]}, ${t}`), fast ? nb(`${scale}× SPEED`) : ""].filter(Boolean).join(" · ");
  const said = `CraftBeerPi's clock: ${DOW_SAY[d.getUTCDay()]} ${d.getUTCDate()} ${MON_SAY[d.getUTCMonth()]}, ${t}${fast ? `, running ${scale} times as fast` : ""}.`;
  return `<p class="bsclk" id="bs-clk"><span aria-hidden="true">${line}</span><span class="sr">${said}</span></p>`;
}
/* while the title bar adds a date or a speed, a LOG line from another of CraftBeerPi's days says its date, as
   "26 Nov 11:58:40 PM" (e[5]: the line's day). On the rig LOG shows times alone */
function logDate(e) {
  if (!clockTag() || (e[5] || 0) === dayOf(st.t)) return "";
  const d = new Date(st.sim.day0 + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + (e[5] || 0));
  return `${d.getUTCDate()} ${MON_SAY[d.getUTCMonth()].slice(0, 3)} `;
}
const PAUSED = "No connection. Controls are paused.";
const WAIT = "Waiting for CraftBeerPi to answer.";
const HELD_NEXT = "The boil is waiting for you. To start it, hold START here or START THE BOIL at the top.";
/* a recipe with nothing running and nothing stopped: CraftBeerPi takes NEXT as START (StepController.next), which would put
   heat on with two taps, and the screen would say "Skipped to …" untruly. So NEXT STEP is greyed, as before a held boil */
const NOT_BEGUN = s => `${s.n} hasn't started yet. To begin it, hold START.`;
const LONG_Q = 140; // characters: longer questions are the sparge's (about 200) and the boil's (300); the rest are 125 or under
const ICON = {
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1.5h16V16l-2-3.5V8a6 6 0 0 0-6-6zm-2.5 17a2.5 2.5 0 0 0 5 0z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8 23 21.5H1z"/><path d="M12 8.5v6M12 17.5v.5" stroke="#6e1414" stroke-width="2.6" stroke-linecap="round"/></svg>'
};
let st, timers = [], noteTimers = {}, hold = null, heldOn = null;

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
  return `<button type="button" class="${cls}"${o.label ? ` aria-label="${esc(o.label)}"` : ""}${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ""}${o.expanded != null ? ` aria-expanded="${o.expanded}"` : ""}${o.controls ? ` aria-controls="${o.controls}"` : ""}${o.cmd ? ` data-cmd="${o.cmd}"` : ""}${h ? " data-hold" : ""}${dis ? ` aria-disabled="true" data-why="${esc(o.why)}"` : ""}>${h ? '<span class="fill"></span>' : ""}<span class="lb">${label}</span>${small ? `<small>${small}</small>` : ""}</button>`;
}

/* ---------- faceplates ---------- */
function lampHTML(id) {
  const A = ACT[id], a = st.a[id], pend = st.pend["a:" + id], lost = st.link === "lost";
  const locked = !!a.by && !a.failed;
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = A.name + " · waiting for CraftBeerPi"; }
  else if (a.failed) { s = "failed"; t = a.on ? "DID NOT STOP" : "DID NOT START"; n = `${A.name} · still ${a.on ? (A.kind === "pump" ? "running" : "heating") : "off"} · tap to try again`; }
  /* HEATING, without the element's power, as the power shows in the graph and as OUT on the right of the faceplate's
     readout. Layout A has no OUT and no graphs, so there the button, the only place the power shows, keeps it */
  else if (a.on) { s = A.kind === "heat" ? "heating" : "running"; t = A.kind === "heat" ? (LAYOUT === "a" && !(id === "bkEl" && BK === "power") ? `HEATING ${a.pct} %` : "HEATING") : "RUNNING"; n = A.name + (locked ? ` · run by ${a.by === "mt" ? "mash tun" : "AUTO"}` : A.kind === "heat" ? " · tap to turn off" : " · tap to stop"); }
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
/* only a kettle whose logic declares set_boil_power has this (on the brewer's rig, the boil kettle). It sits beside the
   element it governs and works at any time, also while a recipe runs. In AUTO it sets the logic's Boil_Power, used
   from BoilPower's threshold up (boilFrom); in MANUAL, including the "Ready to boil?" hold, it sets the element's own
   level, used when it is on by hand. The kettle's mode decides what it sets, never the recipe.
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
   words design uses it here; the new design's BOIL AT is in the power box (editorHTML) */
function boilAtHTML() {
  const pend = st.pend["t:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  return b("tgtbtn", "BOIL AT", pend ? "sending…" : "change",
    {cmd: "tgt:bk", why, expanded: !!st.edit && st.edit.kind === "tgt" && st.edit.v === "bk"});
}
/* the new boil kettle's boil power, in its window while the target is BOIL: the green number is the setting, so it is
   the button that opens the power box (TARGET sits beside AUTO/MANUAL). Framed like the graph's selected span,
   with a small "change" like every other button's, so it reads as a control, not only a reading. Its tap area is at
   least 44 px tall. The HLT's and the mash tun's readings stay readings */
function boilReadHTML() {
  const V = st.v.bk, pend = st.pend["p:bk"], why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hand = BKMAN === "new" && V.mode !== "auto";
  return `<button type="button" class="svbtn" data-cmd="pwr:bk" aria-expanded="${!!st.edit && st.edit.kind === "pwr"}" aria-label="${hand ? `Power by hand ${V.bp} percent, the boil power` : `Boil power ${V.bp} percent`}: change"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="svv">${V.bp}<span class="u">%</span></span><small>${pend === "set" ? "sending…" : "change"}</small></button>`;
}
/* the new boil kettle's TARGET box: the HLT's, plus BOIL. Like the HLT, the kettle holds a target such as 170 °F.
   Anything from the boil point less 3.6 °F up is BOIL, so the steps run …205.6, 206.5, BOIL, and a typed 212 is BOIL
   too; BOIL is the top, so + is refused there. SET BOIL sends the boil point as the target. The third row: BOIL,
   pressed while the box says BOIL, and BOIL POWER, the second way to the power box */
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
/* ---------- the new boil kettle (?bk=power): three ideas from commercial boil controllers. While AUTO boils, the
   boil power's one-tap steps sit either side of the element button, like a Grainfather's arrow keys: −5 % and +5 %,
   with −1 % and +1 % between them and the button, in the power box's order, −5 −1 … +1 +5. The element button itself
   pauses the heat for a boil-over and keeps AUTO, the recipe and the boil power, like the heater button on an Ss
   Brewtech eController; carrying on is a held press, like any heat. Each recipe starts at the usual boil power, like a
   Grainfather's default boil power. */
function nudgeHTML(d) {
  const V = st.v.bk, pend = st.pend["p:bk"];
  /* a step that would pass 0 or 100 % stops there; only at the end itself is the button refused */
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : d < 0 && V.bp <= 0 ? "The boil power is already 0 %." : d > 0 && V.bp >= 100 ? "The boil power is already 100 %." : "";
  /* waiting for CraftBeerPi, all four are greyed and the one pressed shows the lamps' marching stripes; the wait is
     kept under the step itself, so −5 and −1 can't both look pressed. The spoken name says "percent" */
  return b(`cmdbtn nudge${pend === String(d) ? " sending" : ""}`, `${d < 0 ? "−" : "+"}${Math.abs(d)} %`, "",
    {cmd: `pnudge:${d}`, why, label: `Boil power ${d < 0 ? "down" : "up"} ${Math.abs(d)} percent`});
}
function bkLampHTML() {
  const a = st.a.bkEl, V = st.v.bk, pend = st.pend["a:bkEl"];
  if (V.mode !== "auto" && BKMAN === "new" && bkNudges() && !TIGHT && !a.failed) return bkHandLampHTML();
  if (V.mode !== "auto" || (a.failed && !pend)) return lampHTML("bkEl");
  /* between the boil power's four steps the button is narrow, so its name is left to the faceplate's title (it is the
     boil kettle's only element) and kept for screen readers; the line says only what a press does. Waiting for
     CraftBeerPi there, it keeps its state word, as the steps keep theirs, and the line says what is on its way:
     PAUSING… needs 75 px and the button has 63 at 1366 px, and a word that wrapped would make all three faceplates'
     rows taller for that moment. With the steps in a row of their own (TIGHT) it has the row to itself, as in MANUAL */
  const narrow = bkNudges() && !TIGHT, nm = narrow ? '<span class="sr">BOIL ELEMENT · </span>' : "BOIL ELEMENT · ";
  let s, t, n, cmd, h = false;
  if (pend && narrow) { s = "pending"; t = a.paused ? "PAUSED" : a.on ? "HEATING" : "OFF"; n = nm + ({pause: "pausing…", resume: "heating…"}[pend] || "waiting…"); cmd = "noop"; }
  else if (pend) { s = "pending"; t = pend === "pause" ? "PAUSING…" : pend === "resume" ? "CARRYING ON…" : pend === "on" ? "SWITCHING ON…" : "SWITCHING OFF…"; n = nm + "waiting for CraftBeerPi"; cmd = "noop"; }
  else if (a.paused) { s = "paused"; t = "PAUSED"; n = nm + "hold to heat"; cmd = "pause:off"; h = true; }
  else { s = a.on ? "heating" : "off"; t = a.on ? "HEATING" : "OFF"; n = nm + "tap to pause"; cmd = "pause:on"; }
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hh = h && !why;
  return `<button type="button" class="lamp" data-state="${s}" data-cmd="${cmd}"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
/* the element in the new MANUAL, narrow between the steps as in AUTO: its name left to the faceplate's title and kept
   for screen readers, the line saying only what a press does. Switching it on by hand is heat, so held */
function bkHandLampHTML() {
  const a = st.a.bkEl, pend = st.pend["a:bkEl"], nm = '<span class="sr">BOIL ELEMENT · </span>';
  let s, t, n, h = false;
  if (pend) { s = "pending"; t = a.on ? "HEATING" : "OFF"; n = nm + (pend === "on" ? "heating…" : "stopping…"); }
  else if (a.on) { s = "heating"; t = "HEATING"; n = nm + "tap to turn off"; }
  else { s = "off"; t = "OFF"; n = nm + "hold to turn on"; h = true; }
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", hh = h && !why;
  return `<button type="button" class="lamp" data-state="${s}" data-cmd="act:bkEl"${hh ? " data-hold" : ""}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${hh ? '<span class="fill"></span>' : ""}<span class="st">${t}</span><span class="nm">${n}</span></button>`;
}
/* the steps show while the boil power is what the element heats at: in AUTO, not while it holds a temperature, and in
   the new MANUAL, where the element runs at the boil power by hand too, with a target to hold as well (MANUAL doesn't
   use the target, and the line, element off, or OUT, heating, shows the level they change). Not in MANUAL as built
   before (?bkman=today), where they would seem to set the element's own level, nor while the boil kettle's box is
   open, which has steps of its own */
const bkNudges = () => BK === "power" && (st.v.bk.mode === "auto" ? !bkHolding() : BKMAN === "new") && !(st.edit && st.edit.v === "bk");
/* the new boil kettle's Keep boiling choice: keep the wort at a boil, or let the boil power alone drive the
   temperature. A small checkbox at the end of the nameplate row; the box is the LED, lit Setpoint Green with a tick
   while ticked. One tap sets Keep_Boiling (set_keep_boiling), in any mode, like the boil power. Its tap area reaches
   44 px into the padding above and the gap below without making the row taller. It shows only while the target is
   BOIL: a hold never uses it. */
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
    <button type="button" class="bkat" data-cmd="bat">BOIL AT ${boilFromText()} °F<small>full power until then · change</small></button><p class="usual">${st.v.bk.usual != null ? `USUAL <span class="nw">${st.v.bk.usual} %</span><small>starts each recipe · set in Hardware</small>` : `USUAL <span class="nw">– –</span><small>none · set one in Hardware</small>`}</p>` : ""}</div>`;
  }
  if (v === "bk" && BK === "power" && st.edit.kind === "tgt") return bkTgtEditorHTML();
  /* the HLT's and the mash tun's target, or the boil point (the new design's BOIL AT; the words design's target) */
  const x = st.edit.val.toFixed(1), at = bkNew(v);
  return `<div class="editor" role="group" aria-label="${at ? "New boil temperature for the boil kettle" : `New target for the ${VNAME[v].toLowerCase()}`}">
    <button type="button" data-cmd="tstep:-1" aria-label="Down 1 degree">−1</button><button type="button" data-cmd="tstep:-0.1" aria-label="Down 0.1 degree">−.1</button>
    <input id="tin" inputmode="decimal" value="${x}" aria-label="${at ? "New boil temperature in °F" : "New target in °F"}">
    <button type="button" data-cmd="tstep:0.1" aria-label="Up 0.1 degree">+.1</button><button type="button" data-cmd="tstep:1" aria-label="Up 1 degree">+1</button>
    <button type="button" class="ok" data-cmd="tset">SET <span id="tok">${x}</span> °F</button><button type="button" class="no" data-cmd="tcancel">CANCEL</button></div>`;
}
/* an element on by hand, which is dangerous, so the screen warns of it: its vessel in MANUAL, and no AUTO running it,
   neither its own nor the mash tun's HERMS. In MANUAL nothing compares the temperature with the target, so the element
   runs until someone turns it off. t: the target it won't stop at (the HLT's SV; the new boil kettle's, when it is
   below where BOIL starts), or null: none, or one at or past where BOIL starts, which the wort or water boils before it
   reaches. over: "boil" from where BOIL starts, else "target" from 2 °F past the target, else "". The boil kettle with
   its target at BOIL, or none, boils by hand as a boil kettle should: not this */
const BY_OVER = 2;
function byHand(v) {
  const el = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null, V = st.v[v];
  if (!el || !el.on || el.by || V.mode === "auto" || (v === "hlt" && st.v.mt.mode === "auto")) return null;
  if (v === "bk" && !(BK === "power" && bkHoldT() != null)) return null;
  const raw = v === "bk" ? bkHoldT() : V.sv, t = raw != null && raw < bkLetGo() ? raw : null;
  return {t, over: V.pv >= bkLetGo() ? "boil" : t != null && V.pv >= t + BY_OVER ? "target" : ""};
}
/* while it heats by hand, the line under the window says nothing will stop it, in Prompt Amber, in the words of the
   lines it stands in for ("below target") and of the element's button ("tap to turn off"); past its target, or near the
   boil, in light red, with CraftBeerPi's alarm in the title bar (byHandBanner). Each fits one line at the narrowest
   faceplate, 229 px at 1180 px wide, so the buttons under it don't move as it changes */
function byHandLine(v, w) {
  if (w.over === "target") return `<span class="alarm">${(st.v[v].pv - w.t).toFixed(1)} °F above target · heating by hand</span>`;
  if (w.over === "boil") return `<span class="alarm">Near the boil · heating by hand</span>`;
  return `<span class="warn">Heating by hand · ${w.t != null ? "won't stop at target" : "until you turn it off"}</span>`;
}
/* the line under the window. From 900 px wide the three faceplates share their rows, so a line on two lines would move
   every AUTO/MANUAL under it: each line here, and in bkLine and byHandLine, fits on one line with at least 8 px to spare
   at the narrowest faceplate (229 px inside, at 1180 px wide), with three-digit numbers */
function devHTML(v) {
  if (st.link === "lost") return `<span class="age">Last reading ${st.age} s ago</span>`;
  if (bkNew(v)) return bkLine();
  const V = st.v[v], herms = v === "hlt" && st.v.mt.mode === "auto", driven = V.mode === "auto" || herms;
  /* AUTO with no target (unset, 0 or below) runs but holds nothing, so nothing heats. The line says so at once, in Prompt
     Amber, and never calls it MANUAL; CraftBeerPi's own warning follows in the title bar after 5 s */
  if (herms && st.v.mt.sv == null) return `<span class="warn">No mash tun target, so it won't heat</span>`;
  if (noTarget(v)) return `<span class="warn">${v === "mt" ? "No target, so the HLT won't heat" : "No target, so it won't heat"}</span>`;
  const w = byHand(v);
  if (w) return byHandLine(v, w);
  if (!driven || V.sv == null) return v === "mt" ? "MANUAL · wort pump by hand" : "MANUAL · element by hand";
  if (v === "bk" && V.pv >= V.sv - 0.5) return "Boiling";
  const d = V.sv - V.pv;
  if (Math.abs(d) < 0.3) return "At target";
  const eta = GRAPHS ? graphETA(v) : "";
  return (d > 0 ? `${d.toFixed(1)} °F below target` : `${(-d).toFixed(1)} °F above target`) + (eta ? ` · ${eta}` : "");
}
/* layout B's faceplate also shows output and mode, like a hardware PID controller. OUT is the element's power now, on
   every vessel and in every state: on the boil kettle 100 % while it heats to the boil, the boil power once it boils,
   0 while paused, and the hand level in MANUAL. The green BOIL number is the setting; OUT is what the element does */
function auxHTML(v) {
  const el = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null;
  const mode = v === "hlt" && st.v.mt.mode === "auto" ? "HERMS" : st.v[v].mode === "auto" ? "AUTO" : "MAN";
  const pct = el && el.on ? el.pct : 0;
  const md = v === "bk" && bkManCue() ? `<span class="mc" title="${esc(MAN_CUE)}">MAN</span><span class="sr">. ${MAN_CUE}</span>` : mode;
  return `<dl class="aux"><dt>OUT</dt><dd>${el ? pct + " %" : "– –"}<span class="outbar"${el ? "" : ' style="visibility:hidden"'} aria-hidden="true"><i style="width:${pct}%"></i></span></dd><dt>MODE</dt><dd>${md}</dd></dl>`;
}
/* MANUAL where AUTO is usual (the new MANUAL): the boil kettle in MANUAL with a reading AUTO could work from, while its
   element heats by hand or a step that boils or holds a temperature in it runs. Its MODE then says MAN boxed in Prompt
   Amber, so that heating by hand isn't taken for BoilPower's boil. Not while the boil waits for the brewer (the
   recipe "ready", held), when nothing heats in either mode, nor with no connection, when nothing on the window is
   current */
const MAN_CUE = "In MANUAL, BoilPower isn't running the boil kettle, as it does in AUTO.";
function bkManCue() {
  const V = st.v.bk, r = st.recipe, s = r && RECIPE.steps[r.cur];
  if (BKMAN !== "new" || st.link === "lost" || V.mode === "auto" || V.pv == null) return false;
  return st.a.bkEl.on || !!(s && s.k === "bk" && s.temp > 0 && r.state === "running");
}
function hermsRowHTML() {
  const why = st.link === "lost" ? PAUSED : `The mash tun's AUTO runs this vessel for the HERMS: it switches the HLT element and sets this target up to the mash tun's target plus ${HERMS_DELTA} °F. Switch the mash tun to MANUAL to take the HLT over.`;
  return `<div class="moderow"><button type="button" class="tgtbtn herms" data-cmd="noop" aria-disabled="true" data-why="${esc(why)}"><span class="lb">HERMS</span><small>run by the mash tun · switch it to MANUAL to take over</small></button></div>`;
}
/* the faceplate's second readout: the SV, or in the boil kettle's redesigns what its AUTO works to, named */
function svCell(v) {
  const V = st.v[v], u = s => `<span class="u">${s}</span>`;
  if (!bkNew(v)) return ["SV", V.sv == null ? "– –" : f1(V.sv) + u("°F")];
  /* the new boil kettle: a hold reads like the HLT's target; while the target is BOIL the green number is the boil power, and its button */
  if (BK === "power") {
    const ho = bkHoldT();
    /* the new MANUAL: the green number is the power the element runs at by hand, so it reads HAND, not BOIL, which is
       AUTO's */
    return ho != null ? ["SV", f1(ho) + u("°F")] : [BKMAN === "new" && V.mode !== "auto" ? "HAND" : "BOIL", boilReadHTML()];
  }
  if (bkHolding()) return ["HOLD", f1(V.hold) + u("°F")];
  return ["BOIL", f1(boilFrom()) + u("°F")];
}
function plateHTML(v) {
  const V = st.v[v], [svT, svV] = svCell(v);
  const second = v === "bk" ? (BK === "power" ? "" : powerHTML()) : "";
  /* the new boil kettle has TARGET beside AUTO/MANUAL, as the HLT does; the words design has BOIL AT there */
  const setBtn = bkNew(v) && BK !== "power" ? boilAtHTML() : tgtHTML(v);
  /* the boil power's steps: either side of the element where four 44 px steps and HEATING fit in one row; on tight
     faceplates in a row of their own under AUTO/MANUAL and TARGET, so that, as they come and go with AUTO, a hold
     or the power box, nothing above them moves. Where the page scrolls (STACKED), the row keeps its place while the
     steps are away, so the page's height doesn't change and nothing below moves either */
  const nudge = v === "bk" && bkNudges(), own = nudge && TIGHT, keep = v === "bk" && BK === "power" && TIGHT && STACKED && !own;
  const steps = () => nudgeHTML(-5) + nudgeHTML(-1) + nudgeHTML(1) + nudgeHTML(5);
  const lamps = v === "bk" && BK === "power" ? (nudge && !own ? nudgeHTML(-5) + nudgeHTML(-1) + bkLampHTML() + nudgeHTML(1) + nudgeHTML(5) : bkLampHTML()) : VACT[v].map(lampHTML).join("") + second;
  const mode = `<div class="moderow">${modeHTML(v)}${setBtn}</div>`;
  return `<section class="plate" id="pl-${v}" aria-labelledby="h-${v}">
    ${v === "bk" && BK === "power" ? `<div class="phead"><h2 id="h-${v}">${VNAME[v]}</h2>${bkHoldT() == null ? keepHTML() : ""}</div>` : `<h2 id="h-${v}">${VNAME[v]}</h2>`}
    <div class="face${st.link === "lost" ? " stale" : ""}">
      <dl class="pvsv"><dt>PV</dt><dd class="pv">${f1(V.pv)}<span class="u">°F</span></dd>
      <dt>${svT}</dt><dd class="sv">${svV}</dd></dl>
      ${LAYOUT === "b" ? auxHTML(v) : ""}
      ${GRAPHS ? graphHTML(v, "f") : ""}
    </div>
    <p class="dev">${devHTML(v)}</p>${v === "bk" && slayer() ? `<p class="ssline">${slayerLine()}</p>` : ""}${lvMode() ? `<p class="ssline lvline">${lvLine(v)}</p>` : ""}
    <div class="ctrls${nudge && !own ? " bkpow" : ""}">${lamps}</div>
    ${st.edit && st.edit.v === v ? editorHTML(v) : v === "hlt" && st.v.mt.mode === "auto" ? hermsRowHTML() : own ? `<div class="mstack">${mode}<div class="bksteps" role="group" aria-label="Boil power steps">${steps()}</div></div>` : keep ? `<div class="mstack">${mode}<div class="bkspace"></div></div>` : mode}
    <p class="note">${st.notes[v] || ""}</p>
  </section>`;
}
/* tight faceplates: three side by side, each under 276 px inside, where four 44 px keys, their gaps and HEATING (or a
   box's number) don't fit in one row. There the boil power's steps get a row of their own (plateHTML), and so do a
   box's keys, under its number (#plates[data-tight], brew-day.css). Measured from the faceplates' own width, so it
   holds at any window size: windows about 900 to 970 px wide, and 1180 to 1320 beside the recipe column */
const TIGHT_IN = 276;
let TIGHT = false, STACKED = false;
function platesTight() {
  const P = $("#plates"), s = getComputedStyle(P);
  if (s.gridTemplateColumns.split(" ").length < 3) return false;
  const pl = P.querySelector(".plate"), ps = pl && getComputedStyle(pl);
  const inner = pl ? pl.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) : (P.clientWidth - 2 * parseFloat(s.columnGap)) / 3 - 26;
  return inner < TIGHT_IN;
}
/* the recipe column under the brewhouse, not beside it: the page scrolls, rather than the drawing giving up height */
const mainStacked = () => getComputedStyle($(".main")).gridTemplateColumns.split(" ").length < 2;

/* ---------- recipe column ---------- */
function recipeHTML() {
  const r = st.recipe;
  if (!r) return handHTML();
  const S = RECIPE.steps, run = r.state === "running", off = st.link === "lost" ? PAUSED : "";
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
  /* held before the boil, CraftBeerPi takes NEXT as "start the boil" (StepController.next), which would put heat on with
     two taps, so NEXT STEP is greyed and says how to start it. The same on a recipe loaded or reset and not begun, where
     NEXT would start its first step (NOT_BEGUN) */
  const next = b("cmdbtn", pN ? "MOVING ON…" : "NEXT STEP", last ? "last step" : notBegun ? "not started" : `to ${S[r.cur + 1].n}`, {cmd: "r:next", why: off || (pN || pU || pB ? WAIT : "") || (r.held ? HELD_NEXT : "") || (notBegun ? NOT_BEGUN(S[r.cur]) : "") || (last ? "This is the last step." : "")});
  const unl = b("unl", pU ? "UNLOADING…" : "UNLOAD", "", {cmd: "r:unload", label: pU ? "" : "Unload the recipe", why: unloadRule().why || ""});
  return `<h2>${esc(RECIPE.name)}</h2>
    <div class="rstat"><p class="rmeta">${run ? "Running" : r.state === "ready" ? "Ready to start" : "Stopped"} · step ${r.cur + 1} of ${S.length}</p>${unl}</div>
    <div class="rctl">${start}${stop}${next}</div>
    ${st.confirmNext ? confirmHTML() : st.confirmReset && !run && begun ? resetConfirmHTML() : st.confirmUnload && !run && unloadAsks(r) ? unloadAskHTML() : st.pbOpen ? pbHTML() : pbFresh() ? (COL === "new" ? nbHTML() : cmpHTML()) : ""}
    ${swHTML()}
    ${st.bsOpen ? bsHTML() : st.mwOpen ? mwHTML() : `<p class="note">${st.notes.r || ""}</p>`}
    <ol class="steps" aria-label="Recipe steps">${bsAddHTML()}${S.map(stepHTML).join("")}</ol>${TIMERS === "new" ? timersHTML() : ""}`;
}
/* NEXT STEP's question. Skipping BrewStart as the strike water step before it holds the water (while it waits or heats)
   starts MashIn on the Mash Tun with the tun still empty, so it says so; once BrewStart holds the water, NEXT STEP
   answers its question, as it does the strike water step's */
function confirmHTML() {
  const r = st.recipe, cur = RECIPE.steps[r.cur], nx = RECIPE.steps[r.cur + 1];
  const dry = cur.type === "BrewStart" && bsStrike() && r.bsHeat !== "holding" && nx.k === "mt"
    ? ` The strike water isn't in the ${KNAME.mt} yet, so its pump would start with the tun empty.` : "";
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Skip the rest of <b>${cur.n}</b>${cur.min ? ` (${mmss(r.left)} left)` : ""} and start <b>${nx.n}</b>${nx.temp ? ` at ${nx.temp} °F` : ""}?${dry}</p><div><button type="button" class="yes" data-cmd="r:next-yes">SKIP TO ${nx.n.toUpperCase()}</button><button type="button" data-cmd="r:next-no">KEEP GOING</button></div></div>`;
}
/* RESET's question, as NEXT STEP's: a reset can't be undone, so it says what CraftBeerPi forgets (the steps done, and the
   minutes the stopped step had run: a 40 min rest stopped at 16 runs all 40 again), what goes with it (the questions about
   the brew), and what it leaves alone. Its answers say what each does; neither is the default */
function resetConfirmHTML() {
  const r = st.recipe, S = RECIPE.steps, cur = S[r.cur], n = r.cur, lost = [];
  if (n) lost.push(n === 1 ? "step 1 is done" : n === 2 ? "steps 1 and 2 are done" : `steps 1 to ${n} are done`);
  const ran = r.state === "stopped" && cur.min ? cur.min * 60 - r.left : 0;
  if (ran > 0) lost.push(`${cur.n} has run ${ran < 60 ? "under a minute" : Math.floor(ran / 60)} of its ${cur.min} minutes`);
  const said = [lost.length ? `CraftBeerPi forgets that ${lost.join(" and that ")}.` : "Nothing has been done yet.",
    brewQuestions().length ? "Its questions waiting for you are taken down." : "",
    `Kettles, pumps and ${TIMERS === "new" ? "timers" : "the rest timer"} stay as they are.`].filter(Boolean).join(" ");
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Reset the recipe to step 1, <b>${S[0].n}</b>? ${said}</p><div><button type="button" class="yes" data-cmd="r:reset-yes">RESET TO STEP 1</button><button type="button" data-cmd="r:reset-no">${n ? `STAY AT STEP ${n + 1}` : "STAY STOPPED"}</button></div></div>`;
}
/* UNLOAD, at the end of the status line: the recipe off Brew Day, back to brewing by hand (POST /step2/clear). The recipe
   pages' rules, for LOAD and UNLOAD alike: one tap on a recipe not begun, which the Recipe Book still has as it was
   saved; a question once a brew has begun and nothing runs (unloadAskHTML), as RESET asks; greyed while a step runs,
   BrewStart waiting for its time included, saying what runs. CraftBeerPi refuses it then (409 step_running). A recipe
   the Recipe Book doesn't have (steps built on Brew Steps and never saved there) can't be loaded again, so UNLOAD asks
   for it even before it begins. The screen finds it in the book by its name, as the book lists it */
const inBook = () => BOOK.some(x => x.n === RECIPE.name);
function unloadRule() {
  const r = st.recipe, P = st.pend;
  if (st.link === "lost") return {why: PAUSED};
  if (P["r:check"]) return {why: PB_WAIT};
  if (["r:unload", "r:start", "r:stop", "r:next", "r:reset", "r:load", "sw", "bs"].some(k => P[k])) return {why: WAIT};
  if (r.state === "running") return {why: unloadRunWhy(r)};
  return unloadAsks(r) ? {ask: true} : {};
}
const unloadAsks = r => r.state === "stopped" || r.cur > 0 || !inBook();
/* what runs, in brewing words, as the recipe pages' greyed LOAD says it */
function unloadRunWhy(r) {
  const s = RECIPE.steps[r.cur], at = s.temp == null ? "" : s.type === "SpargeStep" ? ` the water to ${s.temp} °F` : ` to ${s.temp} °F`;
  const starts = typeof r.wait === "string" && r.wait.startsWith("STARTS ") ? r.wait.slice(7) : "";
  const what = s.type === "BrewStart" && !r.bsHeat ? (s.ready ? `BrewStart is waiting to have the ${KNAME[s.k]} at ${s.temp} °F by ${todS(s.ready)}` : `BrewStart is waiting to start${starts ? ` at ${starts}` : ""}`)
    : r.wait === WFY ? `${s.n}, waiting for you`
    : r.wait === true || r.wait === "HEATING" ? `${s.n}, heating${s.type === "BrewStart" ? ` the water to ${s.temp} °F` : at}` : r.wait === "COOLING" ? `${s.n}, cooling${at}`
    : r.wait ? `${s.n}, ${String(r.wait).toLowerCase()}` : s.min ? `${s.n}, ${mmss(r.left)} left` : s.n;
  return `${RECIPE.name} is running: ${what}. Stop it first.`;
}
/* CraftBeerPi's refusal (409 step_running), on a screen that hadn't caught up with a step started elsewhere: nothing
   changes, so the screen logs nothing of its own. CraftBeerPi's sentence, the answer's detail, shows under the buttons
   for 6 s, as on the recipe pages; CraftBeerPi's own notice of it, titled "Recipe not unloaded" (core post58), goes in
   LOG as its other notices do */
const unloadRefused = step => `${step} is running. Stop it before unloading the recipe.`;
/* UNLOAD's question, as short as RESET's, in the recipe pages' words: what CraftBeerPi forgets (how far the brew got),
   whether the Recipe Book can give the recipe back, and what stays as it is. Its answers say what each does; neither
   is the default */
function unloadAskHTML() {
  const r = st.recipe, s = RECIPE.steps[r.cur], n = r.cur + 1, begun = r.state === "stopped" || r.cur > 0;
  const ran = r.state === "stopped" && s.min ? s.min * 60 - r.left : 0;
  const after = ran >= 60 ? `, after ${Math.floor(ran / 60)} of its ${s.min} min` : ran > 0 ? `, under a minute into its ${s.min} min` : "";
  const at = r.state === "stopped" ? `it stopped at step ${n}, ${s.n}${after}` : r.held || r.wait === WFY ? `it's at step ${n}, ${s.n}, waiting for you` : `it's at step ${n}, ${s.n}`;
  const said = [begun ? `CraftBeerPi forgets ${at}.` : "",
    inBook() ? "The Recipe Book keeps the recipe." : "It isn't in the Recipe Book, so it can't be loaded again.",
    "Kettles, pumps and timers stay as they are."].filter(Boolean).join(" ");
  return `<div class="confirm" role="group" aria-labelledby="cf-t"><p id="cf-t">Unload the recipe and brew by hand? ${said}</p><div><button type="button" class="yes" data-cmd="r:unload-yes">UNLOAD</button><button type="button" data-cmd="r:unload-no">${begun ? `STAY AT STEP ${n}` : "DON'T UNLOAD"}</button></div></div>`;
}
/* LOAD over a recipe the Recipe Book doesn't have asks first, by the recipe pages' rule, as UNLOAD does: one finished
   (its steps stay loaded, all done, until another is loaded) under the by-hand list, or one not begun under OTHER
   RECIPE (?col=new). One the book has, or none at all, loads with one tap. Its question takes the list's place */
const loadAsks = () => !inBook() && ((!st.recipe && st.finished) || (!!st.recipe && pbFresh()));
function loadAskHTML() {
  const to = esc(BOOK[st.confirmLoad].n), name = esc(RECIPE.name);
  const said = name ? `Load ${to} in place of ${name}? ${name} isn't in the Recipe Book, so it can't be loaded again. SAVE TO BOOK on Brew Steps keeps it.`
    : `Load ${to} in place of the steps on Brew Day? They aren't in the Recipe Book, so they can't be loaded again. SAVE TO BOOK on Brew Steps keeps them.`;
  return `<div class="confirm" role="group" aria-labelledby="ld-t"><p id="ld-t">${said} Kettles, pumps and timers stay as they are.</p><div><button type="button" class="yes" data-cmd="r:load-yes">LOAD INSTEAD</button><button type="button" data-cmd="r:load-no">DON'T LOAD</button></div></div>`;
}
/* ---------- the pre-brew check ----------
   START on a recipe not begun checks three things first, as a brewhouse's start conditions: every probe gives a reading,
   the clock is set, and every boil addition has a reminder. CraftBeerPi answers (st.pb). All passed, the recipe starts at
   once, with a line in LOG; otherwise the recipe column says, under START, which didn't pass and what to do, and offers
   START ANYWAY (held, as START is) or DON'T START. It never blocks, and it says no more than it checked: a probe "gives a
   reading", which one stuck on an old reading also does. It is a notice, not an alarm: no sound, nothing in the title
   bar. The box follows CraftBeerPi while it is open, so a clock set a minute after the Pi starts turns its line to
   passed and START ANYWAY to START, in their places. The switches are the brewer's to check */
const PB_WAIT = "CraftBeerPi is checking the probes, the clock and the reminders. The recipe starts once they pass.";
const pbFresh = () => { const r = st.recipe; return !!r && r.state === "ready" && !r.held && r.cur === 0; };
/* the recipe a START was held on, as the hold began: its steps, by CraftBeerPi's ids where they have them (the demo's
   have none, so their names stand in), its name, and whether it was waiting to start. The check, CHECKING… and the
   check's box belong to it (st.pbFor) */
const recipeKey = () => RECIPE.steps.map(s => s.id ?? s.n).join("|");
const recipeOn = () => ({key: recipeKey(), name: RECIPE.name, fresh: pbFresh()});
/* what has become of that recipe on another screen: started, cleared, or another loaded in its place (other steps,
   another recipe's or the same recipe's edited on the Brew Steps page). Nothing while it is still the one shown */
function recipeLost(on = {key: recipeKey(), name: RECIPE.name, fresh: true}) {
  if (!st.recipe) return "cleared";
  if (recipeKey() !== on.key) return "loaded";
  return on.fresh && !pbFresh() ? "started" : null;
}
/* said once, as another screen's change ends a START. The screen itself shows a recipe started (RUNNING) or cleared (no
   recipe); another in its place looks just like the one START was held on but for its name and steps, so that is also
   said under START */
function lostSay(why, on) {
  const words = why === "started" ? "The recipe was started on another screen." : why === "cleared" ? "The recipe was unloaded on another screen."
    : `Not started: ${on && on.name === RECIPE.name ? "the recipe was changed" : "another recipe was loaded"} on another screen.`;
  say(words);
  if (why === "loaded") timers.push(setTimeout(() => note("r", words), 0));
}
/* the check ended by another screen: CHECKING… gives way at once, the box closes, nothing starts, and the check's answer,
   when it comes, decides nothing (pbRun's answered, pbDecide) */
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
/* the box on screen as it is about to be drawn again: the height its contents need now, at the column's width now */
function pbMeasure() {
  const kp = $("#recipe .pbc, #recipe .cmp, #recipe .sw:not(.open)");
  if (!kp || (document.fonts && document.fonts.status === "loading")) return null;
  const kept = kp.style.minHeight;
  kp.style.minHeight = "";
  const m = {cls: kp.className, w: $("#recipe").clientWidth, h: kp.getBoundingClientRect().height};
  kp.style.minHeight = kept;
  return m;
}
/* after it is drawn again (before: pbMeasure's, from just before): the tallest of what its contents need, at this width */
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
const PROBE = {hlt: "HLT Temp", mt: "Mash Temp", bk: "Boil Temp"}; // the probes' names in CraftBeerPi, as the Hardware page shows them
const cap = s => s[0].toUpperCase() + s.slice(1);
const andList = a => (a.length < 3 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
const pbFor = s => s >= 60 ? `${Math.round(s / 60)}&nbsp;min` : `${s}&nbsp;s`;
/* the marks beside each check, drawn like the title bar's NO ALARMS tick: a green ring and tick where it passed, a
   Prompt Amber disc with a dark "!" where it didn't, and a plain ring with an "i" for a note that asks nothing of the
   brewer (probes a few degrees apart) */
const MK = {
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 11v6.3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="7.3" r="1.6" fill="currentColor"/></svg>',
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7.3 12.4l3.2 3.2 6.3-6.9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  no: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.5" fill="currentColor"/><path d="M12 6.3v7.4" stroke="#241800" stroke-width="2.9" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.7" fill="#241800"/></svg>'
};
function pbItems() {
  const P = st.pb, E = P.error || {};
  /* no answer within PB_ASK: nothing was checked, so each check says so in its own place, and an answer that comes
     later fills them in where they are */
  if (P.noAnswer) return [{key: "probes", html: "The probes weren't checked."}, {key: "clock", html: "The clock wasn't checked."}, {key: "adds", html: "The reminders weren't checked."}];
  /* the probes. A kettle with no probe in Hardware (CraftBeerPi's no_probe: none chosen; missing: one CraftBeerPi no
     longer has) is a setting to put right there, said in the Hardware page's own words. Any other probe without a
     reading is a plug or a cable to check, with how long it has given none where CraftBeerPi knows it (P.none) */
  const why = P.why || {}, dead = ["hlt", "mt", "bk"].filter(v => st.v[v].pv == null);
  const unset = dead.filter(v => why[v] === "no_probe" || why[v] === "missing"), silent = dead.filter(v => !unset.includes(v));
  const said = [], cavs = [];
  if (unset.length === 1) {
    const v = unset[0], none = why[v] === "no_probe";
    said.push(none ? `<b>No probe is chosen for ${VTHE(v)}.</b> Choose one in Hardware.` : `<b>${cap(VWHOSE[v])} probe isn't found:</b> CraftBeerPi no longer has it. Choose one in Hardware.`);
    cavs.push(none ? `no probe was chosen for ${VTHE(v)}` : `${VWHOSE[v]} probe wasn't found`);
  } else if (unset.length) {
    said.push(`<b>${unset.length} kettles need a probe chosen in Hardware:</b> ${andList(unset.map(v => `${VTHE(v)} (${why[v] === "no_probe" ? "none chosen" : "not found"})`))}.`);
    cavs.push(`${unset.length} kettles had no probe chosen`);
  }
  if (silent.length === 1) {
    const v = silent[0], s = P.none[v];
    said.push(s != null ? `<b>${cap(VWHOSE[v])} probe, ${PROBE[v]}, gives no reading,</b> and hasn't for ${pbFor(s)}. Check its plug and cable.`
      : `<b>${cap(VWHOSE[v])} probe, ${PROBE[v]}, gives no reading.</b> Check its plug and cable.`);
    cavs.push(`${VWHOSE[v]} probe gave no reading`);
  } else if (silent.length) {
    said.push(`<b>${silent.length} probes give no reading:</b> ${andList(silent.map(v => `${VWHOSE[v]} (${PROBE[v]})`))}. Check their plugs and cables.`);
    cavs.push(`${silent.length} probes gave no reading`);
  }
  const probes = E.probes ? {html: PB_ERR.probes, cav: "the probes weren't checked"}
    : !dead.length ? {ok: true, html: "All 3 probes give a reading."} : {html: said.join(" "), cav: cavs.join(", ")};
  /* the clock: core post44's rule (cbpi/api/system_clock.py). The rig's Pi has no clock board yet, so its time is only
     trusted once timedatectl says it was set from the internet; Windows, as on the simulators, always counts as set. A
     step's timer counts on that clock, so a clock set while a rest's timer runs moves the rest's end. Not set, by
     CraftBeerPi's reason: not_synchronized, timedatectl's plain no, as just after the Pi starts; unconfirmed (clockWhy
     "unsure"), timedatectl failing or answering neither yes nor no, which waiting may not change; no_answer_yet
     (clockWhy "slow"), timedatectl not answering in the 2 s the check waits, which the next ask fills in. The title
     bar's clock is the screen's own, so it can't show whether the Pi's is right */
  const clock = E.clock ? {html: PB_ERR.clock, cav: "the clock wasn't checked"}
    : P.clock ? {ok: true, html: "The clock is set."}
    : P.clockWhy === "slow" ? {html: "<b>The clock hasn't been checked yet:</b> the Pi is slow to answer.", cav: "the clock wasn't checked"}
    : P.clockWhy === "unsure" ? {html: "<b>The Pi didn't say whether its clock is set.</b> If it has been on and online for a few minutes, you can start anyway. A clock set during a rest can cut the rest short.", cav: "the Pi's clock wasn't confirmed"}
    : {html: "<b>The Pi's clock isn't set yet.</b> It comes from the internet a minute after the Pi starts; if not, check the Pi's network. Set during a rest, it can cut the rest short.", cav: "the Pi's clock wasn't set"};
  /* the reminders: the boil step holds six (Hop_1 to Hop_6), longest first, and an import names any it had to leave out
     (core post38) as its warning named them, amount first ("1.50 oz Citra"); CraftBeerPi keeps those with the recipe
     for this check. Minutes as the step list gives them: before the end of the boil */
  const A = P.adds, miss = A.missed, amount = n => String(n).replace(/^([\d.,/]+) /, "$1&nbsp;");
  const adds = E.adds ? {html: PB_ERR.adds, cav: "the reminders weren't checked"}
    : !miss.length ? {ok: true, html: A.n > 2 ? `All ${A.n} boil additions have a reminder.` : A.n === 2 ? "Both boil additions have a reminder." : A.n ? "The boil addition has a reminder." : "The boil has no additions to remind you of."}
    : {html: `<b>${miss.length} of ${A.n} boil additions ${miss.length === 1 ? "has" : "have"} no reminder:</b> ${andList(miss.map(([n, m]) => `${amount(n)} at ${m}&nbsp;min`))} (the boil step holds six). Watch the clock for ${miss.length === 1 ? "it" : "them"}, or set a timer.`, cav: `${miss.length} addition${miss.length === 1 ? " had" : "s had"} no reminder`};
  return [Object.assign({key: "probes"}, probes), Object.assign({key: "clock"}, clock), Object.assign({key: "adds"}, adds)];
}
/* the answer box, in the recipe column under START, like NEXT STEP's and RESET's questions: the three checks always in
   the same order (the brewer's: probes, clock, reminders), each marked passed or not in its place, so nothing moves as
   CraftBeerPi's answers change. Neither answer is the default */
const PB_NONE = "<b>Not started yet:</b> CraftBeerPi didn't answer the check, so nothing was checked. Hold START to try again.";
function pbHTML() {
  const items = pbItems(), bad = items.filter(i => !i.ok).length, off = st.link === "lost" ? PAUSED : "";
  const head = st.pb.noAnswer ? PB_NONE : bad ? `<b>Not started yet:</b> ${bad} check${bad > 1 ? "s" : ""} didn't pass.` : "<b>Not started yet:</b> every check passes.";
  const li = i => `<li class="${i.ok ? "ok" : "no"}"><span class="mk">${i.ok ? MK.ok : MK.no}</span><p><span class="sr">${i.ok ? "Passed: " : st.pb.noAnswer ? "" : "Didn't pass: "}</span>${i.html}</p></li>`;
  return `<div class="confirm pbc" role="group" aria-labelledby="pb-t"><p id="pb-t">${head}</p><ul class="pbl">${items.map(li).join("")}</ul>
    <div>${b("yes", bad ? "START ANYWAY" : "START", off ? "" : "hold to start", {cmd: "pb:go", hold: true, why: off})}${b("", "DON'T START", "", {cmd: "pb:no", why: off})}</div></div>`;
}
/* START on a recipe not begun: the check first, while START says CHECKING…. CraftBeerPi answers in under a second; with
   no answer in PB_ASK the box says so and offers the same two answers. An older CraftBeerPi without the check starts at
   once, as before it */
const PB_ASK = 5000;
/* the clock's first answer since CraftBeerPi started can be slow: CraftBeerPi asks timedatectl, which can take a few
   seconds the first time after the Pi starts, and until it answers the check's clock says no_answer_yet ("slow"
   here). START keeps CHECKING… and asks again while it does, for up to PB_CLOCK from the hold, so the box opens with
   the clock's answer, not with a short line that grows when the answer comes and moves the box's buttons down.
   CraftBeerPi's own wait for the answer (CLOCK_WAIT, 2 s) spaces the asks, and timedatectl gives up after 5 s */
const PB_CLOCK = 6000;
function pbRun() {
  if (st.pend["r:check"] || st.pend["r:start"]) return;
  cmpDone(true);
  st.pbFor = heldOn || recipeOn();
  st.pbOpen = false; st.pend["r:check"] = "check"; renderAll();
  const held = Date.now();
  const answered = () => {
    /* CHECKING… already ended: a recipe started, cleared or loaded on another screen ends it as soon as it is seen
       (renderAll, pbEnd) */
    if (!st.pend["r:check"]) return;
    /* the demo's slow clock answers at clockAt, set */
    if (st.pb.clockWhy === "slow" && st.pb.clockAt && st.t >= st.pb.clockAt) { st.pb.clock = true; st.pb.clockWhy = null; }
    if (!st.pb.noAnswer && st.pb.clockWhy === "slow" && Date.now() - held < PB_CLOCK) { timers.push(setTimeout(answered, 1000)); return; }
    pbDecide();
  };
  timers.push(setTimeout(answered, st.pb.noAnswer ? PB_ASK : 500 + Math.random() * 300));
}
/* the check's answer, or none: the recipe starts, or the box says what didn't pass. Only for the recipe START was held
   on: started, cleared or replaced on another screen meanwhile, the check ends there (renderAll, pbEnd) */
function pbDecide() {
  if (recipeLost(st.pbFor)) return renderAll();
  delete st.pend["r:check"];
  const items = pbItems(), bad = items.filter(i => !i.ok);
  if (!bad.length) { logEvent("Checked before starting: probes, clock, reminders", "all passed", "ok"); cmdStart(true); return; }
  st.pbOpen = true;
  const words = st.pb.noAnswer ? PB_NONE.replace(/<[^>]+>/g, "") : `Not started yet: ${bad.length} check${bad.length > 1 ? "s" : ""} didn't pass. ${bad.map(i => i.html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")).join(" ")}`;
  say(`${words} START ANYWAY or DON'T START, under START.`);
  renderAll();
}
/* START ANYWAY: the recipe's line in LOG says what didn't pass, as a start that went past them. Only while its box is
   open, for the recipe START was held on */
function pbGo() {
  if (!st.pbOpen || recipeLost(st.pbFor)) return renderAll();
  const bad = pbItems().filter(i => !i.ok);
  st.pbOpen = false;
  cmdStart(true, st.pb.noAnswer ? "started anyway: the check got no answer" : bad.length ? `started anyway: ${bad.map(i => i.cav).join(", ")}` : "");
}
/* COMPARE PROBES: the probes side by side, for before filling, while every vessel is empty and has stood at room
   temperature, when they should read nearly alike. Under START on a recipe not begun, and at the end of the column when
   brewing by hand. It follows the readings while open; DONE puts what they read in LOG.
   It compares each probe's own reading: what it shows, less the offset set for it in Hardware. An offset can be set
   for brewing rather than for the probe (a mash probe at the HERMS coil's outlet, say), and with it a good probe would
   read off at room temperature on every brew day.
   It judges how far apart they read, highest to lowest, at three levels:
   - within PB_TOL they agree: a DS18B20 is accurate to ±0.5 °C (±0.9 °F), so two good ones can be 1.8 °F apart, and
     its readings move in steps of about 0.1 °F;
   - up to PB_ROOM apart is likely where the vessels sit, not their probes: a door, an outside wall or a cold floor can
     keep one vessel a few degrees cooler than the rest. It says so in the plain colour and points to ice water for
     certainty;
   - further apart than any spot explains, a probe looks off, in amber.
   A reading no room has, below ROOM_LO or above ROOM_HI, is a probe looking off whatever the others read: a fault they
   share can make every probe read the same wrong number, 32 °F from a part that doesn't answer or 185 °F from one that
   has just restarted, and alike they would otherwise agree.
   A probe's real faults are mostly no reading at all or a wild one, not a few degrees. CraftBeerPi doesn't know where
   each vessel sits, so the words hold for any brewery. It learns nothing from earlier comparisons: LOG keeps only eight
   lines, on the screen that wrote them, and a gap learned over weeks would also learn a probe slowly going wrong */
const PB_TOL = 2.0, PB_ROOM = 10.0, PB_EACH = 0.9, ROOM_LO = 35, ROOM_HI = 120;
const KSHORT = {hlt: "HLT", mt: "mash tun", bk: "boil kettle"};
/* each probe's own reading; a kettle with no probe in Hardware (why: the check's no_probe or missing) has neither a
   reading nor an offset */
const cmpRead = () => ["hlt", "mt", "bk"].map(v => { const pv = st.v[v].pv, why = ((st.pb || {}).why || {})[v], unset = why === "no_probe" || why === "missing", off = unset ? 0 : (st.poff || {})[v] || 0; return {v, why: unset ? why : null, off, val: pv == null || unset ? null : pv - off}; });
const fOff = x => `${x > 0 ? "+" : "−"}${Math.abs(x).toFixed(Math.abs(x * 10 - Math.round(x * 10)) < 1e-6 ? 1 : 2)}&nbsp;°F`;
function cmpVerdict(R) {
  const got = R.filter(r => r.val != null), dead = R.filter(r => r.val == null), f = x => `${x.toFixed(1)}&nbsp;°F`;
  /* first what can't be compared: a kettle with no probe in Hardware, in the check's words, then a probe with no reading */
  const unset = dead.filter(r => r.why), silent = dead.filter(r => !r.why);
  const lead = (unset.length === 1 ? (unset[0].why === "no_probe" ? `No probe is chosen for ${VTHE(unset[0].v)}: choose one in Hardware. ` : `${cap(VWHOSE[unset[0].v])} probe isn't found: choose one in Hardware. `)
    : unset.length ? `${unset.length} kettles need a probe chosen in Hardware. ` : "")
    + (silent.length ? `${cap(andList(silent.map(r => VWHOSE[r.v])))} probe${silent.length > 1 ? "s give" : " gives"} no reading: check ${silent.length > 1 ? "their plugs and cables" : "its plug and cable"}. ` : "");
  const nr = dead.length ? "no reading" : "";
  if (got.length < 2) return {tone: "no", dead: dead.length, log: nr, text: lead + "Not enough readings to compare."};
  /* in ice water a probe's window shows 32 °F plus its offset */
  const iceOne = r => `in ice water: ${r.off ? `with its ${fOff(r.off)} offset it should read ${f(32 + r.off)}` : `it should read ${f(32)}`}, ±0.9&nbsp;°F`;
  const ice = `put each probe in ice water: each should read 32.0&nbsp;°F${got.some(r => r.off) ? " plus its offset" : ""}, ±0.9&nbsp;°F.`;
  /* a reading no room has */
  const wild = got.filter(r => r.val < ROOM_LO || r.val > ROOM_HI);
  if (wild.length) {
    const lo = Math.min(...wild.map(r => r.val)), hi = Math.max(...wild.map(r => r.val)), many = wild.length > 1;
    const at = f(lo) === f(hi) ? f(lo) : `${f(lo)} to ${f(hi)}`, than = hi < ROOM_LO ? "colder than" : lo > ROOM_HI ? "hotter than" : "unlike";
    const V = {tone: "no", dead: dead.length, wild: wild.map(r => r.v)};
    if (wild.length === got.length) return Object.assign(V, {log: nr || "every probe looks off",
      text: `${lead}${dead.length ? `The other ${got.length === 2 ? "two" : got.length}` : "All three probes"} read ${at} on their own, ${than} any room. When every probe is wrong at once, look at what they share: one bad probe or plug on their cable can do this. Unplug them one at a time to find it.`});
    return Object.assign(V, {log: nr || "a probe looks off",
      text: `${lead}${cap(andList(wild.map(r => VWHOSE[r.v])))} probe${many ? "s read" : " reads"} ${at} on ${many ? "their" : "its"} own, ${than} any room. ${many ? `Check their plugs and cables, then ${ice}` : `Check its plug and cable, then put it ${iceOne(wild[0])}.`}`});
  }
  const vals = got.map(r => r.val), spread = Math.max(...vals) - Math.min(...vals);
  if (spread <= PB_TOL + 1e-9) {
    const who = dead.length ? `The other ${got.length === 2 ? "two" : got.length}` : got.length === 2 ? "Both" : `All ${got.length}`;
    return {tone: dead.length ? "no" : "ok", dead: dead.length, log: nr || "agree", text: `${lead}${who} agree${f(spread) === f(0) ? ": they read the same" : `, ${f(spread)} apart at most`}.`};
  }
  const room = spread <= PB_ROOM + 1e-9;
  const V = {tone: room && !dead.length ? "near" : "no", dead: dead.length, room, log: nr || (room ? `${spread.toFixed(1)} °F apart` : "a probe looks off")};
  /* the odd one: the only probe the other two agree without */
  const without = got.length < 3 ? [] : got.filter(r => { const o = got.filter(x => x !== r).map(x => x.val); return Math.max(...o) - Math.min(...o) <= PB_TOL + 1e-9; });
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
/* by default (not with ?col=today), a recipe not begun has OTHER RECIPE beside COMPARE PROBES, in the row COMPARE
   PROBES had to itself, so choosing another recipe costs the column no room; each opens its box in that place */
function nbHTML() {
  if (st.cmpOpen) return cmpHTML();
  if (st.rbOpen) return rbHTML();
  const off = st.link === "lost" ? PAUSED : st.pend["r:check"] ? PB_WAIT : st.pend["r:unload"] ? WAIT : "";
  return `<div class="nbrow">${b("cmdbtn", "OTHER RECIPE", "from the recipe book", {cmd: "rb:open", why: off})}${cmpHTML()}</div>`;
}
/* the recipe book in the recipe column, opened by OTHER RECIPE (by ?col=new's CHOOSE A RECIPE too), as agreed with the
   recipe pages' designer: the newest five, each with LOAD, the loaded one saying what it is doing in the recipe
   column's own words instead; then ALL RECIPES (the Recipe Book tab) and CLOSE. LOAD is one tap here, as it replaces
   only a recipe not begun, or loads one brewing by hand: the recipe it replaces stays in the book. On one screen the box
   takes the step list's room and the timers', as the other boxes do */
function rbHTML() {
  const off = st.link === "lost" ? PAUSED : "", p = st.pend["r:load"], cur = st.recipe ? BOOK.findIndex(x => x.n === RECIPE.name) : -1;
  if (st.confirmLoad != null) return `<section class="rbox" aria-labelledby="rb-h"><h3 id="rb-h">Recipe book</h3>${loadAskHTML()}</section>`;
  const rows = BOOK.slice(0, 5).map((x, i) => {
    const right = i === cur ? `<span class="rbst">${rbState()}</span>`
      : b("cmdbtn", p === String(i) ? "LOADING…" : "LOAD", "", {cmd: "load:" + i, label: p === String(i) ? "" : `Load ${x.n}`, why: off || (p ? WAIT : "")});
    return `<li${i === cur ? ' class="cur"' : ""}><span class="bn">${x.n}</span><span class="bd">${x.d}</span>${right}</li>`;
  }).join("");
  return `<section class="rbox" aria-labelledby="rb-h"><h3 id="rb-h">Recipe book</h3><ul>${rows}</ul><div class="rbf">${b("cmdbtn", "ALL RECIPES", "the Recipe Book", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "CLOSE", "", {cmd: "rb:x"})}</div></section>`;
}
/* the loaded recipe's line in the book: the recipe column's status line, in capitals */
function rbState() {
  const r = st.recipe, n = RECIPE.steps.length, at = `STEP ${r.cur + 1} OF ${n}`;
  return `<span>${r.state === "running" ? "RUNNING" : r.state === "ready" ? "READY TO START" : "STOPPED"}</span><span>${at}</span>`;
}
function cmpHTML(byHand) {
  const off = st.link === "lost" ? PAUSED : st.pend["r:check"] ? PB_WAIT : "";
  if (!st.cmpOpen) return b("cmdbtn cpbtn", "COMPARE PROBES", "before you fill", {cmd: "cmp:open", why: off});
  const R = cmpRead(), V = cmpVerdict(R), offs = R.some(r => r.off);
  const row = r => {
    const dead = r.val == null, wild = (V.wild || []).includes(r.v), odd = V.odd === r.v, amber = dead || wild || (odd && !V.room);
    const tag = r.why ? (r.why === "no_probe" ? "no probe chosen" : "probe not found") : dead ? "no reading" : wild ? "looks off" : odd ? (V.room ? (V.warm ? "warmer" : "cooler") : "looks off") : "";
    const sub = (r.why ? [] : [PROBE[r.v]].concat(r.off ? [`offset ${fOff(r.off)}`] : [])).concat(tag ? [`<span class="ct${amber ? "" : " near"}">${tag}</span>`] : []).join(" · ");
    return `<li${amber ? ' class="odd"' : ""}><span class="cn">${VNAME[r.v]}</span><span class="cp">${sub}</span><span class="cr">${dead ? "– –" : r.val.toFixed(1)}<span class="u">°F</span></span></li>`;
  };
  return `<section class="cmp${byHand ? " byh" : ""}" aria-labelledby="cp-h"><div class="cph"><h3 id="cp-h">Compare probes</h3>${b("cmdbtn cpdone", "DONE", "adds them to LOG", {cmd: "cmp:done"})}</div>
    <p class="cpi">With every vessel empty and at room temperature.${offs ? " Each reading is the probe's own, without its offset." : ""}</p>
    <ul class="cpl">${R.map(row).join("")}</ul>
    <p class="cpv ${V.tone}"><span class="mk">${V.tone === "ok" ? MK.ok : V.tone === "near" ? MK.note : MK.no}</span><span aria-live="polite">${V.text}</span></p>
    <p class="cpn">They agree within ${PB_TOL.toFixed(1)}&nbsp;°F: each probe is accurate to ±${PB_EACH}&nbsp;°F. Where a vessel sits can put it up to ${PB_ROOM.toFixed(0)}&nbsp;°F from the others; more than that, a probe looks off.</p></section>`;
}
/* DONE, or START while it is open: what they read goes in LOG, so the brew day keeps a record of it */
function cmpDone(log) {
  if (!st.cmpOpen) return;
  st.cmpOpen = false;
  if (log) {
    const R = cmpRead(), V = cmpVerdict(R);
    logEvent(`Probes compared${R.some(r => r.off) ? ", without offsets" : ""}: ${R.map(r => `${KSHORT[r.v]} ${r.val == null ? "no reading" : r.val.toFixed(1)}`).join(", ")} °F`, V.log, V.tone === "ok" ? "ok" : V.tone === "near" ? "" : "bad");
  }
  renderAll();
}
/* the questions about the brew that wait for you, by their lines in LOG: those under a step's name, the hop alerts,
   Brewing Complete, Resume brew? and BrewScribe's. A reset takes them down (StepController.reset_all; BrewScribe its
   own); not a timer's alarm, nor a warning, nor another plugin's question */
function brewQuestions() {
  const names = new Set([...RECIPE.steps.map(s => s.n), "Hop Alert", "Brewing Complete", "Resume brew?", "BrewScribe", PH_Q[0].title]);
  return st.events.filter(e => e[2] === "waiting for you" && names.has(e[1].split(":")[0])).map(e => e[1].split(":")[0]);
}
/* the title bar's question is one of them: BrewScribe's are titled "BrewScribe: …", so they go by its name */
const brewAsks = (q, x) => q.has(x.title) || (x.title.startsWith("BrewScribe: ") && q.has("BrewScribe"));
/* ---------- the strike water box (STRIKE-WATER.md) ----------
   Under START, STOP and NEXT STEP (and COMPARE PROBES), from the recipe's loading until the malt goes in: how much
   water goes to the mash tun and how hot, where the mash lands once the grain is in, and the forecast and its numbers.
   It offers USE, which puts the strike temperature the forecast works out in the recipe for the strike water, and then
   BACK TO, in the same place; not pressing it is Kal's way. It never changes anything by itself. It gives way to a question or a panel in the same place, as they give way to
   each other.
   The steps it works from: BrewStart (bi), the strike water step (si) and the first step on the mash tun (mi), whose
   temperature is the rest the mash lands on. The strike water step is a MashInStep on the HLT where the recipe has one
   (the older shape, ?sws=step); without one it is BrewStart itself with Ready by, which heats and holds the water
   (bsHeat), so then si is bi. Its phases, by the recipe's place: "plan" while BrewStart is next or waits, "heat" while
   BrewStart or the strike water step heats and holds the water, "moved" while MashIn on the Mash Tun brings the water
   to the rest before the malt. A recipe without the brewer's flow in front (no strike water step)
   has the box only while it waits to start and the HLT heats the strike water by hand; there USE sets the HLT's
   target, as SET would */
function swSteps() {
  const S = RECIPE.steps, bi = S.findIndex(s => s.type === "BrewStart"), hi = S.findIndex(s => s.k === "hlt" && s.type === "MashInStep");
  return {S, bi, si: hi >= 0 ? hi : bi, mi: S.findIndex(s => s.k === "mt" && (s.type == null || s.type === "MashInStep"))};
}
/* BrewStart as the strike water step: it heats the HLT itself at its heating start and holds the water for the move */
const bsStrike = () => { const {bi, si} = swSteps(); return bi >= 0 && si === bi; };
/* ---------- the mash water and the HLT's water, as every page says them (cbpi4gui util/mashwater.js) ----------
   MASH WATER is the strike water that goes to the mash tun; HLT WATER is all the water in the HLT, strike and sparge;
   what the HLT water leaves after the mash water is the sparge water. The HLT keeps the least water that covers its
   element and coil: its least water on the Hardware page, else 15% of its capacity, else 3 gal. Mash water, or HLT
   water, that would leave it less is refused, saying what would be left and the least. The mash water's
   water-to-grain ratio, in qt/lb, is shown beside it and can be typed instead of it; one outside 0.75-3 qt/lb is said
   to be unusual, never refused. Figures and units are joined by a no-break space */
const L_PER_GAL = 3.785411784, KG_PER_LB = 0.45359237, NB = "\u00a0";
const MASH_WATER = {label: "MASH WATER", says: "the strike water that goes to the mash tun"};
const HLT_WATER = {label: "HLT WATER", says: "all the water in the HLT, strike and sparge"};
const LEAST_SHARE = 0.15, LEAST_DEFAULT = {gal: 3, L: 11.4};
const RATIO_RANGE = {"qt/lb": [0.75, 3], "L/kg": [1.6, 6.3]};
function mwPos(x) {
  if (x == null || typeof x === "boolean") return null;
  const v = typeof x === "string" ? parseFloat(x.trim().replace(",", ".")) : Number(x);
  return Number.isFinite(v) && v > 0 ? v : null;
}
const mwR2 = x => Math.round(x * 100) / 100;
const volText = (x, vu) => `${(+x).toFixed(2)}${NB}${vu}`;
const massText = (x, mu) => `${+(+x).toFixed(1)}${NB}${mu}`;
function leastWater(hlt, C, vu) {
  const kept = C === "C" ? "L" : "gal";
  const to = x => x == null ? null : kept === vu ? x : vu === "L" ? x * L_PER_GAL : x / L_PER_GAL;
  const own = to(mwPos(hlt && hlt.min_water)), cap = to(mwPos(hlt && hlt.capacity));
  if (own != null) return {value: mwR2(own), from: "hardware", capacity: cap == null ? null : mwR2(cap)};
  if (cap != null) return {value: mwR2(cap * LEAST_SHARE), from: "capacity", capacity: mwR2(cap)};
  return {value: LEAST_DEFAULT[vu] ?? LEAST_DEFAULT[kept], from: "default", capacity: null};
}
function leastFrom(least, vu) {
  if (!least || least.from === "hardware") return "its least water on the Hardware page";
  if (least.from === "capacity") return `${Math.round(LEAST_SHARE * 100)}% of its ${least.capacity != null ? `${+(+least.capacity).toFixed(2)}${NB}${vu} ` : ""}capacity, until its least water is set on the Hardware page`;
  return `a cautious ${+(+least.value).toFixed(2)}${NB}${vu}, as the Hardware page gives neither its least water nor its capacity`;
}
const spargeLeft = (hlt, mash) => mwPos(hlt) == null || mwPos(mash) == null ? null : mwR2(hlt - mash);
function spargeText(hlt, mash, vu) {
  const left = spargeLeft(hlt, mash);
  if (left == null) return "";
  return left < 0 ? "Sparge water left: none, as the mash water is more than the HLT water" : `Sparge water left: ${volText(left, vu)}`;
}
const mashWaterLow = (mash, hlt, least) => mwPos(mash) != null && mwPos(hlt) != null && least && hlt - mash < least.value - 1e-9;
function mashWaterRefused({mash, hlt, least, vu}) {
  const left = mwR2(hlt - mash), most = mwR2(hlt - least.value);
  const leaves = left >= 0 ? `would leave ${volText(left, vu)} in the HLT` : `is more than the HLT's ${volText(hlt, vu)}`;
  return `Mash water ${volText(mash, vu)} ${leaves}. The HLT needs at least ${volText(least.value, vu)} over its element and coil (${leastFrom(least, vu)}). `
    + (most > 0 ? `With ${volText(hlt, vu)} of HLT water, the mash water can be at most ${volText(most, vu)}.` : `HLT WATER, ${volText(hlt, vu)}, leaves no room for mash water: raise it first.`);
}
const hltWaterLow = (hlt, mash, least) => mashWaterLow(mash, hlt, least);
function hltWaterRefused({hlt, mash, least, vu}) {
  const left = mwR2(hlt - mash);
  const leaves = left >= 0 ? `would leave ${volText(left, vu)} in the HLT after the ${volText(mash, vu)} of mash water` : `is less than the ${volText(mash, vu)} of mash water`;
  return `HLT water ${volText(hlt, vu)} ${leaves}. The HLT needs at least ${volText(least.value, vu)} over its element and coil (${leastFrom(least, vu)}), so the HLT water has to be at least ${volText(mwR2(mash + least.value), vu)}.`;
}
const ratioUnit = C => C === "C" ? "L/kg" : "qt/lb";
function waterRatio(water, vu, grain, mu, C) {
  const w = mwPos(water), g = mwPos(grain);
  if (w == null || g == null) return null;
  const L = vu === "L" ? w : w * L_PER_GAL, kg = mu === "kg" ? g : g * KG_PER_LB;
  return C === "C" ? L / kg : (L / L_PER_GAL * 4) / (kg / KG_PER_LB);
}
function waterForRatio(ratio, grain, mu, vu, C) {
  const q = mwPos(ratio), g = mwPos(grain);
  if (q == null || g == null) return null;
  const kg = mu === "kg" ? g : g * KG_PER_LB, L = C === "C" ? q * kg : q * (kg / KG_PER_LB) / 4 * L_PER_GAL;
  return vu === "L" ? L : L / L_PER_GAL;
}
const ratioText = (q, C) => `${+(+q).toFixed(2)}${NB}${ratioUnit(C)}`;
function ratioUnusual(q, C) {
  if (q == null) return false;
  const [lo, hi] = RATIO_RANGE[ratioUnit(C)], x = mwR2(q);
  return x < lo || x > hi;
}
function ratioWarning(q, C) {
  if (!ratioUnusual(q, C)) return "";
  const u = ratioUnit(C), [lo, hi] = RATIO_RANGE[u];
  return `${ratioText(q, C)} is unusual: most mashes take ${lo} to ${hi}${NB}${u}. ${mwR2(q) > hi ? "Is that the mash water alone, not all the HLT's water?" : "Check the mash water and the grain weight."}`;
}
function mashWaterText({water, forGrain, vu, grain, mu, C}) {
  const q = waterRatio(mwPos(forGrain) ?? water, vu, grain, mu, C);
  return `${volText(water, vu)}${q != null ? ` · ${ratioText(q, C)} for ${massText(grain, mu)}` : ""}`;
}
/* the least water the HLT keeps, from the moment's HLT figures (st.vessels, in gallons); the mash water as the box and
   the MashIn row show it, and its ratio: from the water for the grain where BeerSmith gives it, else the mash water */
const swLeast = () => leastWater((st.vessels || {}).hlt, "F", "gal");
const swMashText = R => mashWaterText({water: R.strike_vol ?? null, forGrain: R.for_grain ?? null, vu: "gal", grain: R.grain ?? null, mu: "lb", C: "F"});
const swRatio = R => waterRatio(R.for_grain ?? R.strike_vol ?? null, "gal", R.grain ?? null, "lb", "F");
/* the figures leave the HLT less than covers its element and coil: one line in Note Amber where the two figures are,
   blocking nothing */
function swLowHTML(N) {
  if (N.vol == null || N.gal == null) return "";
  const least = swLeast();
  if (!(N.vol - N.gal < least.value - 1e-9)) return "";
  return `<p class="vover swlow">Only ${volText(Math.max(0, N.vol - N.gal), "gal")} stays in the HLT after the ${volText(N.gal, "gal")} of mash water: it needs at least ${volText(least.value, "gal")} over its element and coil (${leastFrom(least, "gal")}). Check MASH WATER and HLT WATER.</p>`;
}
function swPhase() {
  const r = st.recipe;
  if (!st.sw || !r || r.held) return null;
  const {bi, si, mi} = swSteps();
  if (mi < 0 || r.cur > mi) return null;
  if (si < 0) return r.cur === 0 && r.state === "ready" && st.v.mt.mode !== "auto" ? "plan" : null;
  /* a recipe whose first step is the strike water step (no BrewStart in front) is still planning until it begins;
     BrewStart plans until it heats */
  return r.cur === mi ? "moved" : (r.cur === si && si !== bi && !pbFresh()) || (r.cur === bi && !!r.bsHeat) ? "heat" : "plan";
}
/* the model's answers (strike-model.js, SW_MODEL). In CraftBeerPi the server works USE and its forecasts out with the
   bench's model of the whole HERMS, in a process of its own (STRIKE-WATER.md); the mockup carries the model's answers
   for Test Recipe v5 and stands in for that process. The water that goes to the mash tun: what the grain takes, and
   what stays under the false bottom */
const swGal = F => +(F.forGrain + (F.dead || 0)).toFixed(2);
/* a forecast, decoded from its code and kept, as the box is drawn often: the mash's highest from the grain going in to
   an hour after Next (peak), the Mash Tun probe's highest reading from the ask for the malt to Next (reads), and the
   mash's lowest and highest each minute for an hour from the grain going in (lo, hi; minute 0 is where it lands) */
const swFcs = new Map();
function swFcOf(c) {
  let F = swFcs.get(c);
  if (!F) {
    const n = (i, k) => parseInt(c.substr(i, k), 36), lo = [], hi = [];
    for (let m = 0; m <= 60; m++) { lo.push((n(5 + 2 * m, 2) + 900) / 10); hi.push((n(127 + 2 * m, 2) + 900) / 10); }
    F = {peak: (n(0, 3) + 9000) / 100, reads: (n(3, 2) + 900) / 10, lo, hi};
    swFcs.set(c, F);
  }
  return F;
}
/* forecasts weighted together: [forecast, weight] */
function swMix(parts) {
  const F = {peak: 0, reads: 0, lo: Array(61).fill(0), hi: Array(61).fill(0)};
  parts.forEach(([G, w]) => {
    if (!w) return;
    F.peak += G.peak * w; F.reads += G.reads * w;
    for (let m = 0; m <= 60; m++) { F.lo[m] += G.lo[m] * w; F.hi[m] += G.hi[m] * w; }
  });
  return F;
}
/* where x falls on an axis: the points either side and how far between them, held at the axis's ends */
function swAt(axis, x) {
  if (x <= axis[0]) return [0, 0, 0];
  for (let i = 0; i < axis.length - 1; i++) if (x <= axis[i + 1]) return [i, i + 1, (x - axis[i]) / (axis[i + 1] - axis[i])];
  return [axis.length - 1, axis.length - 1, 0];
}
/* one of the model's points: its forecast for strike water at T, its own at USE, otherwise between the strikes either
   side */
function swPtFc(P, T, strikes, codes) {
  if (Math.abs(T - P.use) < 0.05) return swFcOf(P.u);
  const [i, j, w] = swAt(strikes, T);
  return swMix([[swFcOf(codes[i]), 1 - w], [swFcOf(codes[j]), w]]);
}
/* the model's answer for grain at g °F and v gal in the HLT, with the mash probe at the coil's outlet ("coil") or the
   tun's ("tun"): USE, rounded down to 0.1 °F and never under the rest; USE if every guess proved to be the middle of
   its range (mid); how far each guess, known at its middle, would raise USE (lv); the HLT's own heat loss there as a
   share of its loss when full (hlt: its range); and the forecast for strike water at any temperature (fc). Between the
   model's points the answer is weighted from the four around it. The tun's outlet has the model's answers for its
   moment's own numbers only (#sw-tunprobe); with other numbers the coil's stand in */
const swModels = new Map();
function swModel(g, v, probe) {
  const key = `${g}|${v}|${probe}`;
  if (swModels.has(key)) return swModels.get(key);
  const M = SW_MODEL, U = M.tun, nv = M.vols.length;
  const [gi, gj, gw] = swAt(M.grains, g), [vi, vj, vw] = swAt(M.vols, v);
  const pts = [[gi, vi, (1 - gw) * (1 - vw)], [gj, vi, gw * (1 - vw)], [gi, vj, (1 - gw) * vw], [gj, vj, gw * vw]]
    .filter(x => x[2] > 1e-9).map(([a, c, w]) => [M.pts[a * nv + c], w]);
  const sum = f => pts.reduce((s, [P, w]) => s + f(P) * w, 0), near = pts.reduce((x, y) => y[1] > x[1] ? y : x)[0];
  let A;
  if (probe === "tun" && Math.abs(g - U.g) < 0.05 && Math.abs(v - U.v) < 0.05) {
    const at = U.strikes.map((s, i) => [s, U.f[i]]).concat([[U.use, U.u]]).sort((x, y) => x[0] - y[0]);
    A = {use: U.use, mid: U.mid, lv: U.lv, hlt: near.hlt, fc: T => swPtFc({use: NaN}, T, at.map(x => x[0]), at.map(x => x[1]))};
  } else {
    const use = Math.max(M.rest, Math.floor(sum(P => P.ex) * 10 + 1e-9) / 10);
    A = {use, mid: Math.round(sum(P => P.mid) * 10) / 10, lv: near.lv, hlt: near.hlt,
      fc: T => swMix(pts.map(([P, w]) => [Math.abs(T - use) < 0.05 ? swFcOf(P.u) : swPtFc(P, T, M.strikes, P.f), w]))};
  }
  const fcs = new Map(), raw = A.fc;
  A.fc = T => { const k = T.toFixed(2); if (!fcs.has(k)) fcs.set(k, raw(T)); return fcs.get(k); };
  swModels.set(key, A);
  return A;
}
/* the water in the HLT, strike and sparge: BrewStart's water volume where the recipe has BrewStart; brewing by hand, the
   figure given in the box, which CraftBeerPi keeps for the brew day */
function swVolOf() { const {S, bi} = swSteps(); return bi >= 0 ? S[bi].vol ?? null : st.sw.vol ?? null; }
/* the grain's temperature, for grain that spent the night away from the boil kettle: BrewStart's grain temperature
   where the recipe has BrewStart; brewing by hand, the figure given in the box, which CraftBeerPi keeps for the brew
   day. Blank (null): the boil kettle's probe stands for it */
function swGrainOf() { const {S, bi} = swSteps(); return bi >= 0 ? S[bi].grain ?? null : st.sw.grain ?? null; }
/* what USE is worked out from, and every number missing (misses, the first of them the miss). The strike water as
   planned: the strike water step's temperature, or by hand the HLT's target. The recipe's grain weight and its strike
   water to the mash tun (the mash water): BeerSmith's (sw.from), else those typed in the box for this recipe (sw.rec),
   else for the grain a mash step's own on Brew Steps (stepGrain: a MashIn with a Grain_Kg, as a recipe imported before
   CraftBeerPi kept BeerSmith's mash figures has). The room's temperature, which the mash tun's steel starts at and both
   vessels lose heat to: the boil kettle's probe, empty until the sparge, its own reading without its offset, as COMPARE
   PROBES reads it; while that gives no reading a room can have, the room's temperature typed in the box for this brew
   (sw.room), which waits aside once the probe reads a room again. The grain's: the brewer's figure, or without one the
   room's. Nothing stands in for a grain temperature saved on BrewStart that no room has or that isn't a number: the
   forecast waits for a new one, or for it to be blanked. Nor for the mash tun's control interval (PID_HERMS's
   SampleTime, sw.interval; CraftBeerPi sends it as `sample_time`) when it is a fraction from 1 to 60 s, such as 2.5,
   which the forecast's replay can't step through. What stays in the HLT is its water less the strike water. Where the
   mash probe sits is the rig's setup (sw.probe): the coil's outlet unless set otherwise. R: the recipe's figures as
   CraftBeerPi sends them (grain, strike_vol, and where the grain weight came from) */
function swIn() {
  const F = st.sw.from, {S, si, mi} = swSteps(), rest = S[mi].temp, plan = si >= 0 ? S[si].temp : st.v.hlt.sv;
  const probeRoom = st.v.bk.pv == null ? null : +(st.v.bk.pv - ((st.poff || {}).bk || 0)).toFixed(1);
  const usable = probeRoom != null && probeRoom >= ROOM_LO && probeRoom <= ROOM_HI, given = !usable && st.sw.room != null;
  const room = given ? st.sw.room : probeRoom, raw = swGrainOf(), typed = raw == null || !Number.isFinite(raw) ? null : raw, vol = swVolOf();
  const rec = st.sw.rec || {}, beer = !!(F && F.grainLb && F.forGrain);
  const grainLb = beer ? F.grainLb : rec.grain ?? (st.sw.stepGrain ? SW_FROM.grainLb : null), gal = beer ? swGal(F) : rec.water ?? null;
  const both = grainLb != null && gal != null ? gal : null;
  const R = beer ? {grain: F.grainLb, strike_vol: gal, for_grain: F.forGrain, dead: F.dead || 0, tun: F.tunLb ?? null, grain_from: "beersmith"}
    : {grain: grainLb, strike_vol: gal, for_grain: null, dead: null, tun: null, grain_from: rec.grain != null ? "typed" : grainLb != null ? "step" : null};
  const N = {plan: plan ?? null, rest, room, typed, grain: typed ?? room, vol, step: si >= 0, gal, probe: st.sw.probe || "coil", interval: st.sw.interval,
    mashName: S[mi].n, R, recTyped: beer ? [] : ["grain", "water"].filter(k => rec[k] != null), roomFrom: given ? "you" : "probe", roomGiven: st.sw.room ?? null, roomProbe: probeRoom};
  N.misses = [(both == null || rest == null) && "recipe", !swIntervalOk(N.interval) && "sample_time", !given && probeRoom == null && "probe",
    !given && probeRoom != null && !usable && "room", raw != null && !swGrainOk(raw) && "grain", (vol == null || (both != null && vol < both)) && "vol"].filter(Boolean);
  if (N.misses.length) N.miss = N.misses[0];
  return N;
}
/* a grain temperature the forecast can use: a number a room can have, as COMPARE PROBES counts one. BrewStart's, saved
   on Brew Steps, can be anything */
const swGrainOk = t => typeof t === "number" && Number.isFinite(t) && t >= ROOM_LO && t <= ROOM_HI;
/* a control interval the forecast can use, as PID_HERMS uses it: from 1 to 60 s as it is, so a fraction there is the
   one it can't step through; blank, not a number, or outside 1-60 s, PID_HERMS runs at its 5 s default and says so in
   a notice, and the forecast does the same */
const swIntervalOk = s => !(typeof s === "number" && Number.isFinite(s) && s >= 1 && s <= 60 && !Number.isInteger(s));
/* a grain temperature in LOG's words, one that isn't a number included */
const swGrainSays = t => typeof t === "number" && Number.isFinite(t) ? `${t.toFixed(1)} °F` : "not a number";
/* the numbers USE is worked out from, as CraftBeerPi keeps them with its answer; none while one is missing. An answer
   holds for numbers within a twentieth of a degree or gallon of its own, and for a room within half a degree, which is
   how far the room moves before CraftBeerPi works USE out again */
function swNow() {
  const N = swIn();
  return N.miss ? null : {grain: N.grain, vol: N.vol, probe: N.probe, room: N.room};
}
const swSameIn = (a, b) => !!a && !!b && a.probe === b.probe && Math.abs(a.grain - b.grain) < 0.05 && Math.abs(a.vol - b.vol) < 0.05 && Math.abs(a.room - b.room) <= 0.5;
/* the box's numbers: what USE is worked out from, and CraftBeerPi's answer. Its answer is the last it worked out
   (sw.has, with the numbers it was worked out from). While it works USE out again (sw.work: since when, and why), that
   answer is still shown, for the numbers it came from (stale); with none yet (wait), there is nothing to show but that
   it is working. Its work can fail (sw.failed: when, what went wrong, and for which numbers): then there's no answer,
   as the last was for other numbers, and nothing is offered until a number changes. Which unmeasured numbers would
   raise USE most (lv), and USE at their middles (mid), come after USE (sw.has.lvAt); until then, lvWait */
function swNumbers() {
  const N = swIn();
  if (N.miss) return N;
  N.work = st.sw.work || null;
  const A = st.sw.has;
  if (!A) {
    const F = st.sw.failed;
    return Object.assign(N, F && !N.work && swSameIn(swNow(), F.for) ? {failed: F} : {wait: true});
  }
  const M = swModel(A.grain, A.vol, A.probe), lvIn = A.lvAt == null || st.t >= A.lvAt;
  if (M.use - N.rest > SW_MAX_RISE || M.use > SW_CEIL) return Object.assign(N, {miss: "far", strike: M.use});
  return Object.assign(N, {ok: true, stale: !!N.work, A, strike: M.use, mid: lvIn ? M.mid : null, lv: lvIn ? M.lv : null, lvWait: !lvIn,
    restPeak: M.fc(N.rest).peak, fc: M.fc});
}
/* CraftBeerPi working USE out again, as a number it works from has changed (why: "vol", "grain", "room"). For the
   numbers its answer was worked out from it has nothing to do, nor for those its work failed on */
function swRework(why) {
  const now = swNow();
  if (st.sw.failed && swSameIn(now, st.sw.failed.for)) return;
  st.sw.failed = null;
  if (!now || swSameIn(now, st.sw.has)) { st.sw.work = null; return; }
  st.sw.work = {since: st.t, why};
  say("Working out USE again.");
}
/* its answer comes: the figures for the numbers as they are now, and the levers SW_LEVER_S later */
function swWorked() {
  st.sw.has = Object.assign(swNow(), {lvAt: st.t + SW_LEVER_S}); st.sw.work = null;
  const N = swNumbers();
  if (N.ok) say(`USE worked out: ${N.strike.toFixed(1)} °F.`);
  renderAll();
}
const swSecs = s => s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
const SW_WORKING = "Not yet: CraftBeerPi is still working USE out for this recipe.";
const SW_WHY = {vol: "the HLT's water changed", grain: "the grain's temperature changed", room: "the room's temperature moved"};
/* what the figures shown were worked out for, by what has changed since */
function swWas(N) {
  const A = N.A, w = N.work && N.work.why;
  if (w === "vol") return `${+A.vol.toFixed(2)} gal in the HLT`;
  if (w === "grain") return `grain at ${A.grain.toFixed(1)} °F`;
  if (w === "room") return `the room at ${A.room.toFixed(1)} °F`;
  return "the numbers before";
}
/* while CraftBeerPi works USE out: that it is, and for how long so far (sw-el, counted on by the clock's tick). One short
   line under USE's row, so the step list under the closed box keeps its room and USE doesn't move as it lights up; why,
   and what the figures shown meanwhile are for, are said where they are read: above the chart, and by the greyed USE */
function swWorkSays(N) {
  return `Working out USE${N.wait ? "" : " again"}: <span id="sw-el">${swSecs(Math.max(0, st.t - N.work.since))}</span> so far.`;
}
const swWhy = N => SW_WHY[N.work && N.work.why] || "the numbers it is worked out from changed";
const swT = x => `${+(+x).toFixed(1)}&nbsp;°F`;
/* a range, read out as "to"; whole degrees for the mash, where its ends meet one figure */
const swTo = (x, y) => `${x}<span aria-hidden="true">–</span><span class="sr"> to </span>${y}`;
const swR = (a, b) => { const x = Math.round(a), y = Math.round(b); return x === y ? `${x}` : swTo(x, y); };
/* over the rest by the strike's doing: the forecast's highest point more than half a degree above both the rest and
   where water heated only to the rest would take the mash, as CraftBeerPi counts a target reached */
const swOver = (N, F) => F.peak > Math.max(N.rest, N.restPeak) + 0.5;
/* over the rest at all, as the screen shows a temperature, to 0.1 °F */
const swShows = (N, F) => F.peak >= N.rest + 0.05;
/* the other choice beside the strike water as planned: USE's temperature, until it is the one planned; then BACK TO's,
   the temperature before the first USE, or the rest. None once the water has gone to the mash tun, nor where USE comes
   out at the rest itself with the strike water at the rest already */
function swAlt(N) {
  if (!N.ok || swPhase() === "moved") return null;
  if (N.plan == null || Math.abs(N.plan - N.strike) >= SW_SAME) return N.strike;
  if (st.sw.was != null) return st.sw.was;
  return Math.abs(N.plan - N.rest) < SW_SAME ? null : N.rest;
}
/* what the mash does with each choice of strike water, in words: where it lands as the grain goes in, and where it is
   half an hour later; how high it could go, where that shows over the rest. Then once for all of them: that none is
   forecast to go over the rest, or that going over it is PID_HERMS's own overshoot, which it makes whatever the
   strike. list: [temperature, its role], the strike water as planned first */
function swWords(N, list) {
  const F = list.map(([T]) => N.fc(T)), own = N.restPeak >= N.rest + 0.05;
  const say = ([T, role], f, i) => {
    const at = `At ${T.toFixed(1)}&nbsp;°F, ${role}, ${i ? "it" : "the mash"} lands <b>${swR(f.lo[0], f.hi[0])}&nbsp;°F</b>${i ? "" : " as the grain goes in"}`;
    if (swOver(N, f)) return `${at} and could reach <b>${Math.round(f.peak)}&nbsp;°F</b>, over the rest: the HERMS can't cool it.`;
    const later = `${swR(f.lo[30], f.hi[30])}&nbsp;°F half an hour later`;
    return swShows(N, f) ? `${at}, is ${later}, and could reach ${swT(f.peak)}.` : `${at} and is ${later}.`;
  };
  const showing = F.filter(f => swShows(N, f)), allOwn = showing.every(f => !swOver(N, f) && f.peak <= N.restPeak + 0.05);
  const tail = !showing.length ? ` ${list.length > 1 ? "Neither is" : "It isn't"} forecast to go over the ${swT(N.rest)} rest.`
    : own && allOwn ? ` Going over the rest is PID_HERMS's own overshoot, which it makes whatever the strike: with the water heated only to the rest, it takes the mash to ${swT(N.restPeak)}.`
    : own ? ` With the water heated only to the rest, PID_HERMS by itself takes the mash to ${swT(N.restPeak)}.` : "";
  return list.map((x, i) => say(x, F[i], i)).join(" ") + tail;
}
/* the recipe lacks what USE is worked out from (CraftBeerPi's miss "recipe"): the mash step's temperature, which Brew
   Steps gives; or the grain weight or the strike water to the mash tun (the mash water), which can be typed here
   (swRec), named where there's neither BeerSmith's, one given here, nor for the grain a mash step's own grain weight.
   Nothing else is named: the mash tun's weight comes from the Hardware page or the recipe and only narrows the
   forecast, and BeerSmith's own strike temperature and the grain's and the tun's are only FORECAST's comparison. The
   other way is the recipe's BeerSmith file imported again with UPDATE, which gives the loaded recipe BeerSmith's
   figures at once, nothing loaded again. more: another sentence follows, so this one leaves out why it matters and the
   box still fits one screen */
const swOr = a => a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} or ${a[a.length - 1]}`;
/* the recipe's figures missing for USE, by their names in swRec: the grain weight, the mash water */
const swRecLacks = N => [N.R.grain == null && "grain", N.R.strike_vol == null && "water"].filter(Boolean);
const SW_REC_NAME = {grain: "grain weight", water: "mash water"};
const SW_UPDATE = "import its BeerSmith file again and choose UPDATE.";
function swMissRecipe(N, more = false) {
  if (N.rest == null) return `${esc(N.mashName)} has no temperature, so where the mash lands isn't known. Give it one in Brew Steps.`;
  const L = swRecLacks(N), why = ", so where the mash lands isn't known.";
  if (!L.length) return `This recipe lacks BeerSmith's mash figures${why} I${SW_UPDATE.slice(1)}`;
  return `This recipe has no ${swOr(L.map(k => SW_REC_NAME[k]))} from BeerSmith${more ? "." : why} Type ${L.length > 1 ? "them" : "it"} here, or ${SW_UPDATE}`;
}
const SW_MISS = {
  recipe: swMissRecipe,
  /* the room, which can be typed here while the probe can't stand for it (swRec) */
  probe: N => `The boil kettle's probe gives no reading, so the room's temperature isn't known${N.typed == null ? ", nor the grain's" : ""}. Check its plug and cable, or type the room's temperature here.`,
  room: N => `The boil kettle's probe reads ${N.room.toFixed(1)}&nbsp;°F, ${N.room > ROOM_HI ? "warmer" : "colder"} than any room, so it can't stand for the room${N.typed == null ? " or the grain" : ""}. Type the room's temperature here.`,
  grain: N => `${swSteps().bi >= 0 ? "BrewStart's grain temperature" : "The grain's temperature"} ${typeof N.typed === "number" && Number.isFinite(N.typed) ? `is ${N.typed.toFixed(1)}&nbsp;°F, ${N.typed > ROOM_HI ? "warmer" : "colder"} than any room` : "isn't a number"}. The forecast can't use it.`,
  vol: () => "How much water is in the HLT, strike and sparge? The forecast needs it.",
  /* too far to offer: more than 27 °F above the rest, in today's words; or within that, over the ceiling, which only a
     rest above 152.6 °F can bring */
  far: N => N.strike - N.rest > SW_MAX_RISE
    ? `It works out at ${swT(N.strike)}, more than ${SW_MAX_RISE}&nbsp;°F above the rest: too far to trust. ${swCheck(N)}`
    : `It works out at ${swT(N.strike)}, over ${swT(SW_CEIL)}: too hot for strike water. ${swCheck(N)}`,
  /* the mash tun's control interval, as the Hardware page names it and the values it offers. "isn't a number" is a
     safety net: PID_HERMS runs one that isn't at its default */
  sample_time: N => `The mash tun's control interval ${typeof N.interval === "number" && Number.isFinite(N.interval) ? `is ${+N.interval}&nbsp;s` : "isn't a number"}. The forecast can't use it: set it to 2 or 5&nbsp;s in Hardware.`
};
/* the probe's miss behind another: said after the first miss's sentence, short, as ROOM beside it asks for the room, so
   the box fits one screen with every figure asked for */
const SW_MISS_TOO = {
  probe: () => "The boil kettle's probe gives no reading either.",
  room: N => `The boil kettle's probe reads ${N.room.toFixed(1)}&nbsp;°F, ${N.room > ROOM_HI ? "warmer" : "colder"} than any room.`
};
/* what stands for the grain's temperature when none is given: the room, from the boil kettle's probe or given here */
const swRoomSrc = N => N.roomFrom === "you" ? "the room's temperature given here" : "the boil kettle's probe";
/* where a USE too far comes from: the grain weight and the water, BeerSmith's, or those given here */
const swCheck = N => N.recTyped.length ? "Check the grain weight and the mash water given here." : "Check the grain weight and the water in BeerSmith.";
/* CraftBeerPi's work on USE failed for these numbers: no USE, the strike water as it is, and where to read why */
function swFailedSays(N) {
  const T = N.plan != null ? `${N.plan.toFixed(1)}&nbsp;°F` : null;
  const stays = N.step ? `The strike water stays as planned${T ? `, at ${T}` : ""}.` : T ? `The HLT's target stays at ${T}.` : "The HLT's target stays as it is.";
  return `CraftBeerPi couldn't work out a forecast for these numbers, so there's no USE. ${stays} What went wrong is in LOG.`;
}
/* the box without a forecast: why; then, where a figure the brewer can give is missing, its button with its figure or
   "give it" (swAsks); then USE, HLT WATER and GRAIN side by side, as USE and FORECAST sit in the box with one. USE in
   its place, greyed, saying on a tap what it needs. HLT WATER and GRAIN whatever is missing, each with its figure, as
   they are the brewer's to give and CraftBeerPi takes them without the recipe's figures. The water is asked for
   whenever it is missing, whatever else is: its question after why, and HLT WATER "set it". A button's box, open,
   takes the place of the sentence and the buttons, so the box is no taller than the water's box alone on one screen */
function swMissHTML(N) {
  if (st.swVol && st.swVol.at !== "row") return swVolHTML(N);
  if (st.swGrain) return swGrainHTML(N);
  if (st.swRec && st.swRec.at !== "row") return swRecHTML(N);
  const B = swMissBits(N);
  return `<p class="swl">${B.says}</p>${B.ask}<div class="swa three">${B.use}${B.hlt}${B.grain}</div>${B.sparge}${B.warn}`;
}
/* a figure's own box open in the strike water box, in its place */
const swEditing = () => !!((st.swVol && st.swVol.at !== "row") || st.swGrain || (st.swRec && st.swRec.at !== "row"));
/* the box without a forecast, in parts: why, the figures to give, USE greyed, HLT WATER and GRAIN, the sparge water left,
   and CraftBeerPi's warnings about the HLT's water */
function swMissBits(N) {
  const asks = swAsks(N), ask = asks.length ? `<div class="swa ${["one", "two", "three"][asks.length - 1]}">${asks.map(k => swRecBtn(N, k)).join("")}</div>` : "";
  const noVol = N.miss === "vol" || N.misses.includes("vol") || N.vol == null;
  const too = N.misses.filter(k => k !== N.miss && SW_MISS_TOO[k] && (k !== "room" || N.room != null)).map(k => ` ${SW_MISS_TOO[k](N)}`).join("");
  const vq = noVol && N.miss !== "vol" ? ` ${SW_MISS.vol()}` : "";
  const first = N.failed ? swFailedSays(N) : N.miss === "recipe" ? swMissRecipe(N, !!(too || vq)) : SW_MISS[N.miss] ? SW_MISS[N.miss](N) : "";
  const use = b("cmdbtn swuse", "USE –&nbsp;–&nbsp;°F", N.miss === "far" ? "too far to trust" : "can't work it out", {cmd: "sw:use", why: swNoUse(N)});
  const water = noVol ? "set it" : `${+N.vol.toFixed(2)}&nbsp;gal · change`;
  /* the grain's figure in use: given, else the boil kettle's probe, which stands for nothing while it gives no reading
     or one no room has */
  const typed = Number.isFinite(N.typed), probe = !typed && N.room != null && N.miss !== "probe" && N.miss !== "room";
  const grain = N.miss === "grain" || N.misses.includes("grain") ? "change it" : typed ? `${N.typed.toFixed(1)}&nbsp;°F · change`
    : probe ? `${N.room.toFixed(1)}&nbsp;°F · change` : "give it";
  /* the sparge water left, under the two figures, where MASH WATER is one of them */
  const sparge = asks.includes("water") && N.vol != null && N.gal != null ? `<p class="swn swsp">${spargeText(N.vol, N.gal, "gal")}.</p>` : "";
  return {says: `${first}${too}${vq}`, ask, use, hlt: b("cmdbtn", "HLT WATER", water, {cmd: "swv:open", expanded: false}),
    grain: b("cmdbtn", "GRAIN", grain, {cmd: "swg:open", expanded: false}), sparge, warn: `${swLowHTML(N)}${N.vol != null ? hltOverHTML(N.vol) : ""}`};
}
/* the figures USE needs that are missing and can be given here, by their names in swRec: the recipe's grain weight and
   mash water, and the room while the boil kettle's probe can't stand for it; with any of them, the HLT's water where it
   is missing too. Those already given here aren't among them: they are changed in the open box. None unless every
   missing number is one of these (SW_GIVES): with the mash step's temperature, the control interval, a grain
   temperature it can't use, USE too far or a failure among them, giving the figures wouldn't bring USE, so the box
   says why as before */
const SW_GIVE = {grain: "grain weight", water: "mash water", room: "room", vol: "HLT water"};
const SW_GIVES = ["recipe", "probe", "room", "vol"];
function swGives(N) {
  if (N.failed || N.rest == null || ![N.miss, ...(N.misses || [])].every(k => SW_GIVES.includes(k))) return [];
  const g = swAsks(N).filter(k => k === "room" ? N.misses.includes("probe") || N.misses.includes("room") : swRecFig(N, k) == null);
  if (g.length && (N.miss === "vol" || N.misses.includes("vol") || N.vol == null)) g.push("vol");
  return g;
}
/* the closed box's one row: USE greyed, saying on a tap what it needs, and GIVE THEM (GIVE IT for one) naming them, in
   two equal halves; two names fit there on one line at every size, so with more the first is named and the rest
   counted ("grain weight and 2 more"), its name for a screen reader naming all. Opened, CLOSE in its place.
   CraftBeerPi's warnings about the HLT's water stay under it either way */
function swGiveRow(N, open) {
  const B = swMissBits(N), names = swGives(N).map(k => SW_GIVE[k]);
  const give = b("cmdbtn swgive", open ? "CLOSE" : names.length > 1 ? "GIVE THEM" : "GIVE IT", open ? "the figures" : names.length > 2 ? `${names[0]} and ${names.length - 1} more` : names.join(" · "),
    {cmd: "sw:more", expanded: open, controls: open ? "sw-give" : "", label: open ? "Close the figures USE needs" : `Give the figures USE needs: the ${swAnd(names)}`});
  return `<div class="swa two">${B.use}${give}</div>${B.warn}`;
}
/* opened: why, the figures' buttons, then HLT WATER and GRAIN, and the sparge water left */
function swGiveDet(N) {
  const B = swMissBits(N);
  return `<div class="swdet swgive" id="sw-give"><p class="swl">${B.says}</p>${B.ask}<div class="swa two">${B.hlt}${B.grain}</div>${B.sparge}</div>`;
}
/* the figures given here: the recipe's grain weight and its strike water to the mash tun (the mash water), kept with
   the loaded recipe, and the room's temperature for this brew, which stands for the room while the boil kettle's probe
   gives no reading a room can have. Each with its button's words, its box's label and line, its unit and decimal
   places, and the range CraftBeerPi takes */
const SW_REC = {
  grain: {btn: "GRAIN WEIGHT", name: "Grain weight", places: 1, unit: "lb", many: "pounds", one: "pound", range: [0.5, 200],
    help: "All the grain in the mash, as the recipe's grain bill has it. Kept with this recipe as given here, not as BeerSmith's."},
  water: {btn: MASH_WATER.label, name: "Mash water", places: 2, unit: "gal", many: "gallons", one: "gallon", range: [0.5, 100],
    help: "Not the sparge. Kept with this recipe as given here, not as BeerSmith's."},
  room: {btn: "ROOM", name: "Room temperature", places: 1, unit: "°F", many: "°F", one: "degree", range: [ROOM_LO, ROOM_HI],
    help: "Where the mash tun and the grain stand, for this brew. Used while the boil kettle's probe gives no reading a room can have; once it reads one again, the probe's is used."}
};
/* a figure's value as it is now, whoever gave it, and whether it was given here */
const swRecFig = (N, k) => k === "grain" ? N.R.grain ?? null : k === "water" ? N.R.strike_vol ?? null : N.roomGiven;
const swRecGiven = (N, k) => k === "room" ? N.roomGiven != null : N.recTyped.includes(k);
/* which to ask for: the recipe's figures missing for USE, or given here, while the recipe is what's missing; the room
   while the probe can't stand for it, or the one given here stands for it */
function swAsks(N) {
  const out = [];
  if (N.misses.includes("recipe") && N.rest != null) out.push(...["grain", "water"].filter(k => swRecFig(N, k) == null || swRecGiven(N, k)));
  if (N.misses.includes("probe") || N.misses.includes("room") || N.roomFrom === "you") out.push("room");
  return out;
}
const swRecBtn = (N, k) => { const v = swRecFig(N, k), D = SW_REC[k], q = k === "water" && v != null ? swRatio(N.R) : null;
  return b("cmdbtn", D.btn, v != null && swRecGiven(N, k) ? `${+v.toFixed(D.places)}&nbsp;${D.unit}${q != null ? ` · ${ratioText(q, "F")}` : ""} · change` : "give it", {cmd: `swr:open:${k}`, expanded: false}); };
/* the figure's box, as the HLT water's: −1 −.1, the number, +.1 +1, then SET and CANCEL. The room given has THE PROBE
   too, which takes it back. The mash water's names itself as MASH WATER, the strike water that goes to the mash tun,
   with HLT WATER and the sparge water left beside it, and takes its water-to-grain ratio instead where the grain weight
   is known (swRatioHTML); a figure that would leave the HLT less than covers its element and coil says so as it is
   typed, and SET refuses it. In CraftBeerPi, opened with no figure, it is filled with CraftBeerPi's suggestion from
   BeerSmith's data where there is one, saying where it comes from; SET takes it, and nothing is kept before */
function swRecHTML(N) {
  const e = st.swRec, k = e.kind, D = SW_REC[k], q = D.places, v = e.val, x = v == null ? "" : v.toFixed(q), pend = st.pend.swr;
  const why = st.link === "lost" ? PAUSED : pend ? WAIT : "", dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "";
  const key = (d, l) => `<button type="button" data-cmd="swr:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  const back = k === "room" && N.roomGiven != null ? `<button type="button" class="swprobe" data-cmd="swr:back"${dis}>${pend === "back" ? "SETTING…" : "THE PROBE"}<small>the ${swT(N.roomGiven)} given taken back</small></button>` : "";
  const water = k === "water";
  const label = water ? `<span class="swvk">${MASH_WATER.label}</span><span class="swvs">: ${MASH_WATER.says}, in ${D.many}</span>` : `${D.name}, in ${D.many}`;
  const more = water ? `<p class="swvo" id="swr-o">${swRecOther(N, v)}</p>${swRatioHTML(N, v)}<p class="vover" id="swr-w" aria-live="polite">${swRecWarn(N, v)}</p>` : "";
  return `<div class="editor swvol" role="group" aria-labelledby="swr-l"><label class="swvl" id="swr-l" for="swrin">${label}</label>`
    + `<p class="swvh" id="swr-h">${D.help}</p>`
    + `${key(-1, `1 ${D.one} less`)}${key(-0.1, `0.1 ${D.one} less`)}<input id="swrin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swr-h${water ? " swr-o swr-w" : ""}">${key(0.1, `0.1 ${D.one} more`)}${key(1, `1 ${D.one} more`)}`
    + `${more}<button type="button" class="ok" data-cmd="swr:set"${dis}>${pend === "set" ? "SETTING…" : `SET <span id="swrok">${x || "– –"}</span> ${D.unit}`}</button><button type="button" class="no" data-cmd="swr:x">CANCEL</button>${back}</div>`;
}
/* beside the mash water being given: HLT WATER, the other figure, and under them the sparge water it leaves */
function swRecOther(N, v) {
  if (N.vol == null) return `${HLT_WATER.label}: not given yet.`;
  return `${HLT_WATER.label}: ${volText(N.vol, "gal")}.${v != null ? ` ${spargeText(N.vol, v, "gal")}.` : ""}`;
}
/* what the mash water being given would do that it shouldn't: leave the HLT less than covers its element and coil
   (refused), or give a ratio no usual mash has (said, never refused) */
function swRecWarn(N, v) {
  const least = swLeast();
  if (v != null && N.vol != null && mashWaterLow(v, N.vol, least)) return mashWaterRefused({mash: v, hlt: N.vol, least, vu: "gal"});
  return ratioWarning(waterRatio(v, "gal", N.R.grain ?? null, "lb", "F"), "F");
}
/* the ratio, typed instead of the mash water: it fills the mash water from the grain weight, and the water typed shows
   the ratio it gives. Without a grain weight, what it needs */
function swRatioHTML(N, v) {
  const g = N.R.grain ?? null;
  if (g == null) return `<p class="swvo swvq" id="swr-q">The ratio needs the grain weight: give it with GRAIN WEIGHT.</p>`;
  const q = waterRatio(v, "gal", g, "lb", "F");
  return `<p class="swvq"><label for="swrq">or as a ratio, in ${ratioUnit("F")}</label><input id="swrq" inputmode="decimal" autocomplete="off" value="${q == null ? "" : +q.toFixed(2)}" aria-describedby="swr-q">`
    + `<span id="swr-q">for ${massText(g, "lb")}</span></p>`;
}
/* a figure given here (swRecHTML): SET keeps it, the recipe's with the loaded recipe and the room for this brew, and
   CraftBeerPi works USE out from it at once; changed back the same way, so nothing asks first. One no brew comes near
   is refused here, as CraftBeerPi refuses it, and so is mash water that would leave the HLT less than covers its
   element and coil. THE PROBE takes the room given back. Opened from the MashIn row's box (at "row"), it is drawn
   there */
function swRec(x, y, at) {
  const N = swNumbers(), e = st.swRec;
  if (x === "open") {
    st.swVol = null;
    st.swGrain = null;
    st.swRec = {kind: y, val: swRecFig(N, y), at: at === "row" ? "row" : "box"};
    renderAll();
    return setTimeout(() => { const i = $("#swrin"); if (i) { i.focus(); i.select(); } }, 0);
  }
  if (x === "x") { st.swRec = null; return renderAll(); }
  if (!e || st.pend.swr) return;
  const k = e.kind, D = SW_REC[k], q = D.places, U = D.unit, was = swRecFig(N, k), given = swRecGiven(N, k), [lo, hi] = D.range;
  const fmt = v => `${v.toFixed(q)} ${U}`, small = D.name.toLowerCase();
  const keep = v => () => { if (k === "room") st.sw.room = v; else st.sw.rec = Object.assign({}, st.sw.rec, {[k]: v}); st.swRec = null; swRework(k === "room" ? "room" : "recipe"); };
  if (x === "step") {
    const from = e.val ?? (k === "room" ? 68 : 0);
    e.val = Math.max(0, Math.round((from + parseFloat(y)) * 10 ** q) / 10 ** q);
    e.typed = true;
    return renderAll();
  }
  if (x === "back") {
    if (N.roomGiven == null) { st.swRec = null; return renderAll(); }
    return send("swr", "back", `Room temperature from the boil kettle's probe, the ${fmt(N.roomGiven)} given taken back`, keep(null));
  }
  const v = e.val;
  if (v == null) return note("r", `Type the ${small}, in ${D.many}.`);
  if (v < lo || v > hi) return note("r", `The ${small} has to be between ${lo} and ${hi} ${U}.`);
  if (given && was != null && Math.abs(v - was) < 0.5 / 10 ** q) { st.swRec = null; return renderAll(); }
  if (k === "water" && N.vol != null && mashWaterLow(v, N.vol, swLeast())) return note("r", mashWaterRefused({mash: v, hlt: N.vol, least: swLeast(), vu: "gal"}));
  send("swr", "set", `${D.name} set to ${fmt(v)} ${k === "room" ? "for this brew" : "for this recipe"}${given && was != null ? `, was ${fmt(was)}` : ""}`, keep(v));
}
/* what USE needs, said on a tap of it greyed: the sentence above it, from USE's side */
function swNoUse(N) {
  if (N.failed) return "CraftBeerPi couldn't work USE out for these numbers. What went wrong is in LOG.";
  if (N.miss === "recipe") {
    if (N.rest == null) return `USE needs ${N.mashName}'s temperature: give it one in Brew Steps.`;
    const L = swRecLacks(N);
    if (!L.length) return `USE needs the recipe's mash figures from BeerSmith: ${SW_UPDATE}`;
    return `USE needs the recipe's ${swAnd(L.map(k => SW_REC_NAME[k]))}: give ${L.length > 1 ? "them" : "it"} with ${swAnd(L.map(k => SW_REC[k].btn))}, or ${SW_UPDATE}`;
  }
  if (N.miss === "vol") return "USE needs how much water is in the HLT, strike and sparge: set it with HLT WATER.";
  if (N.miss === "grain") return "USE needs a grain temperature it can use: change it with GRAIN.";
  if (N.miss === "probe") return "USE needs the room's temperature, and the boil kettle's probe gives no reading: give it with ROOM, or check the probe's plug and cable.";
  if (N.miss === "room" && N.room != null) return `USE needs the room's temperature, and the boil kettle's probe reads ${N.room.toFixed(1)} °F, ${N.room > ROOM_HI ? "warmer" : "colder"} than any room: give it with ROOM.`;
  if (N.miss === "sample_time") return "USE needs the mash tun's control interval at 2 or 5 s: set it in Hardware.";
  if (N.miss === "far") {
    const T = N.strike;
    if (T == null) return `USE isn't offered for these numbers. ${swCheck(N)}`;
    const hot = N.rest != null && T - N.rest <= SW_MAX_RISE && T > SW_CEIL;
    return `USE isn't offered: ${T.toFixed(1)} °F is ${hot ? `over ${SW_CEIL} °F, too hot for strike water` : `more than ${SW_MAX_RISE} °F above the rest, too far to trust`}. ${swCheck(N)}`;
  }
  return "USE can't be worked out for these numbers.";
}
/* USE or BACK TO refused by a CraftBeerPi that has moved on, reaching a screen that hadn't caught up: the strike water
   already in the mash tun (409 moved), the box no longer applying (409 off, why), or the temperature over the ceiling
   (400 too_hot, which an up-to-date screen never sends, as it greys BACK TO over it). Said under the box for 6 s, as
   START's refusal is, with nothing logged; the box then follows CraftBeerPi. sample_time is for core post56, which
   reports the control interval as off; from post57 it is a number missing */
const SW_OFF = {
  no_recipe: "no recipe is loaded now",
  malt_in: "the malt is already in",
  not_herms: "the mash tun no longer runs PID_HERMS",
  sample_time: "the forecast can't use the mash tun's control interval now",
  no_mash_in: "the recipe's first mash tun step isn't MashIn now",
  no_mash_tun: "CraftBeerPi doesn't find the mash tun now",
  no_hlt: "CraftBeerPi doesn't find the HLT now"
};
const swNotApplied = (what, T, why) => `${what} ${T.toFixed(1)} °F wasn't applied: ${why === "moved" ? "the strike water is already in the mash tun" : why === "too_hot" ? `it's over ${SW_CEIL} °F, too hot for strike water` : SW_OFF[why]}.`;
/* the window, a small PID window as the faceplates have: the strike water as planned, and where the mash lands as the
   grain goes in, a range while the rig is unmeasured. One line each, whatever the column's width, so nothing under it
   moves as they change. A mash the forecast takes over its rest, which the HERMS can't bring down, in Prompt Amber, with
   how high, and said. While USE is worked out, the mash's figures are the last answer's, in the stale grey readings
   take, or with no answer yet, dashes and that it is working */
function swWin(N) {
  const gal = N.gal == null ? "– –" : N.gal.toFixed(2), T = N.plan == null ? "– –" : N.plan.toFixed(1);
  let mash = "– –", hot = false;
  if (N.wait) mash = `<b>– –</b><span class="swk">working out</span>`;
  else if (N.ok && N.plan != null) {
    const F = N.fc(N.plan);
    hot = swOver(N, F);
    mash = hot ? `<span class="swk">up to</span><b>${Math.round(F.peak)}</b><span class="u">°F</span><span class="swk">over the rest</span>`
      : `<span class="swk">lands</span><b>${swR(F.lo[0], F.hi[0])}</b><span class="u">°F</span>`;
  }
  return `<dl class="swv"><dt>STRIKE</dt><dd><b>${gal}</b><span class="ug">gal</span><span class="swk">at</span><span class="swt"><b>${T}</b><span class="u">°F</span></span></dd><dt>MASH</dt><dd class="swm${hot ? " hot" : ""}${N.stale ? " stale" : ""}">${mash}</dd></dl>`;
}
/* the numbers USE hasn't got from the rig yet, each a range the model allows for in full, in the order of how much
   knowing it would raise USE: its line on the screen, its range in words, and its name in a sentence */
const swPct = x => `${Math.round(x * 100)}&nbsp;%`;
const SW_GUESS = [
  ["next_min", "TO NEXT", r => `${swTo(+r[0], +r[1])}&nbsp;min from the grain going in to pressing Next`, "the minutes from the grain to Next"],
  ["tun_share", "TUN STEEL", r => `${swTo(Math.round(r[0] * 100), swPct(r[1]))} of it warmed by the water at once`, "how much of the tun's steel warms"],
  ["tun_loss", "TUN LOSS", r => `${swTo(+r[0], +r[1])}&nbsp;W/K: how fast it loses heat with the pump running`, "the tun's heat loss"],
  ["transfer_f", "ON THE WAY", r => `${swTo(+r[0], +r[1])}&nbsp;°F lost between the HLT and the tun`, "the heat lost on the way"],
  ["coil_ua", "COIL", r => `${swTo(+r[0], +r[1])}&nbsp;W/K: how fast it passes heat to the wort`, "the coil"],
  ["dough_min", "TO GRAIN", r => `${swTo(+r[0], +r[1])}&nbsp;min from the water reaching the tun to the grain going in`, "the minutes from the water to the grain"],
  ["flow", "WORT PUMP", r => `${swTo(+r[0], +r[1])}&nbsp;L/min through the coil`, "the wort pump's flow"],
  ["grain_c", "MALT", r => `${swTo(r[0], r[1])}&nbsp;cal/g&nbsp;°C: how much heat it holds`, "the malt's heat"],
  ["hlt_loss", "HLT LOSS", (r, left) => `${swTo(Math.round(r[0] * 100), swPct(r[1]))} of its heat loss at 15&nbsp;gal, with ${left}&nbsp;gal left in it`, "the HLT's heat loss"],
  ["hlt_steel", "HLT STEEL", r => `${swTo(+r[0], +r[1])}&nbsp;kg with its coil, still hot when the water goes`, "the HLT's steel"],
  ["probe_lag", "PROBE LAG", r => `${swTo(+r[0], +r[1])}&nbsp;s: how far the mash probe's reading trails the wort`, "the mash probe's lag"]
];
/* a list in words: "a, b and c" */
const swAnd = a => a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
/* FORECAST's numbers, by where the model takes each from: the recipe, the brewer, the rig's measurements, the rig's
   setup, and what hasn't been measured, each a range it allows for in full, with the three that would raise USE most
   if known and USE if every one proved to be the middle of its range; then BeerSmith's own strike temperature and
   what it would do here. The HLT's water and the grain's temperature are the brewer's, each with CHANGE, which opens
   its box in place. They are the numbers as they are now; while CraftBeerPi works USE out, what needs its answer
   waits for it */
function swList(N) {
  const F = st.sw.from, gal = x => `${x.toFixed(2)}&nbsp;gal`, left = N.vol - N.gal, {S, bi} = swSteps(), by = bi >= 0;
  const g = (h, rows) => `<h4 class="swg">${h}</h4><dl class="swd">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  /* BrewStart's Campden dose for the water, while its Campden reminder is on, as the water sets it */
  const camp = by && S[bi].campden ? ` Campden for it: ${swCampden(N.vol)}.` : "";
  const water = st.swVol && st.swVol.at !== "row" ? swVolHTML(N) : `<div class="swyou"><div><p>${+N.vol.toFixed(2)}&nbsp;gal in the HLT, strike and sparge${by ? ": BrewStart's water volume" : ""}.${camp} The ${gal(left)} that stays there warms the mash through the coil.</p>${hltOverHTML(N.vol)}${swLowHTML(N)}</div>${b("cmdbtn", "CHANGE", "", {cmd: "swv:open", label: "Change the water in the HLT", expanded: false})}</div>`;
  const grainSays = N.typed != null
    ? `Grain at ${swT(N.grain)}${by ? ": BrewStart's grain temperature. Left blank" : ", given for today's brew. Without it"}, ${swRoomSrc(N)} would stand for it, at ${swT(N.room)}.`
    : `Grain at ${swT(N.grain)}: ${swRoomSrc(N)}${by ? ", as BrewStart's grain temperature is blank" : ""}. Grain that spent the night somewhere warmer lands the mash higher: give its temperature.`;
  const grain = st.swGrain ? swGrainHTML(N) : `<div class="swyou"><p>${grainSays}</p>${b("cmdbtn", "CHANGE", "", {cmd: "swg:open", label: "Change the grain's temperature", expanded: false})}</div>`;
  /* the recipe's grain weight and mash water given here, in place of the recipe's lines, and the room given here while
     it stands for the room or waits aside as the probe reads it again, each with CHANGE */
  const rec = (k, says) => st.swRec && st.swRec.kind === k && st.swRec.at !== "row" ? swRecHTML(N)
    : `<div class="swyou"><p>${says}</p>${b("cmdbtn", "CHANGE", "", {cmd: `swr:open:${k}`, label: `Change the ${SW_REC[k].name.toLowerCase()} given here`, expanded: false})}</div>`;
  const typedG = N.recTyped.includes("grain"), typedW = N.recTyped.includes("water");
  const q = swRatio(N.R), qs = q != null ? ` · ${ratioText(q, "F")} for ${massText(N.R.grain, "lb")}` : "", qw = ratioWarning(q, "F");
  const given = (typedG ? rec("grain", `Grain weight ${+(+N.R.grain).toFixed(1)}&nbsp;lb, given here for this recipe.`) : "")
    + (typedW ? rec("water", `Mash water ${gal(N.gal)}${qs} to the mash tun, given here for this recipe.${qw ? ` ${qw}` : ""}`) : "")
    + (N.roomGiven == null ? "" : rec("room", N.roomFrom === "you" ? `Room ${swT(N.room)}, given here while the boil kettle's probe gives no reading a room can have.`
      : `Room ${swT(N.roomGiven)} given here, kept aside: the boil kettle's probe reads the room again${N.room != null ? `, at ${swT(N.room)}` : ""}, so it is used.`));
  const R = Object.assign({}, SW_MODEL.box, {hlt_loss: swModel(N.grain, N.vol, N.probe).hlt}), coil = N.probe === "coil";
  /* the vessels' own figures from the Hardware page, where given: the Mash Tun's in place of BeerSmith's, and the HLT's in
     place of the guess about its steel. Named under From Hardware only when there are some */
  const vMT = vesselOf("mt"), vHLT = vesselOf("hlt"), hwMT = vesselWeighed(vMT), hwHLT = vesselWeighed(vHLT);
  const hw = [hwMT && ["Mash tun", vesselSays(vMT)], hwHLT && ["HLT", vesselSays(vHLT, ", with what's fixed in it")]].filter(Boolean);
  const GUESS = SW_GUESS.filter(([k]) => !(hwHLT && k === "hlt_steel"));
  const guesses = GUESS.map(([k, dt, says]) => [dt, says(R[k], +left.toFixed(2))])
    .concat(coil ? [["PUMP OFF", "the Mash Tun probe taken to read the HLT's water, as still wort beside the coil would. Not checked on the rig yet"]] : []);
  const top = N.ok && !N.work && N.lv ? GUESS.map(([k, , , name]) => [name, N.lv[k]]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 3) : [];
  /* the levers come a few minutes after USE on the Pi; until then the sentence says they're coming */
  const most = top.length ? `<p class="swn" id="sw-lv">Knowing ${swAnd(top.map(x => x[0]))} would raise USE the most: about ${swAnd(top.map(x => x[1].toFixed(1)))}&nbsp;°F. If every one proved to be the middle of its range, USE would be ${swT(N.mid)}.</p>`
    : N.ok && !N.work && N.lvWait ? `<p class="swn" id="sw-lv">CraftBeerPi is still working out which of these would raise USE most if it were known: that comes a few minutes after USE.</p>` : "";
  const bs = F && F.bs && N.ok && !N.work ? N.fc(F.bs) : null;
  const bsSays = bs ? ` It leaves out the HLT's ${gal(left)}, so here ${swOver(N, bs) ? `it could take the mash to ${Math.round(bs.peak)}&nbsp;°F, over the rest` : `the mash would land ${swR(bs.lo[0], bs.hi[0])}&nbsp;°F`}.` : "";
  return g("From the recipe", [
      ...(typedG ? [] : [["Grain", `${+(+N.R.grain).toFixed(2)}&nbsp;lb${N.R.grain_from === "step" ? `: ${esc(N.mashName)}'s own, on Brew Steps` : ""}`]]),
      ...(typedW ? [] : [["Water", `${gal(N.gal)}${qs} to the mash tun${N.R.for_grain != null ? `: ${gal(N.R.for_grain)} for the grain${N.R.dead ? ` and ${gal(N.R.dead)} under the false bottom` : ""}` : ""}${qw ? `. ${qw}` : ""}`]]),
      ...(hwMT ? [] : [["Mash tun", N.R.tun ? `${+(+N.R.tun).toFixed(2)}&nbsp;lb of steel` : "not counted: the recipe has no equipment profile"]]),
      ["Rest", swT(N.rest)]])
    + (hw.length ? g("From Hardware", hw) : "")
    + `<h4 class="swg">From you</h4>${water}${grain}${given}`
    + g("Measured on the rig", [
      ...(N.roomFrom === "you" ? [] : [["Room", `${swT(N.room)}: the boil kettle's probe, as the kettle is empty, less its offset. The mash tun starts at it, and both vessels lose heat to it`]]),
      ["HLT", "how much heat it holds, how fast it loses it, its element and its probe"]])
    + g("The rig's setup", [
      ["Mash probe", coil ? "at the coil's outlet: with the pump running it reads the wort leaving the coil" : "at the tun's outlet: it reads the mash leaving the tun"],
      ["Strike", "the water goes to the mash tun through the coil, by the HLT pump"]])
    + `<h4 class="swg">Not measured yet</h4><p class="swn">USE allows for every one of these anywhere in its range, so a wrong guess lands the mash low, where the HERMS can bring it up.</p>`
    + `<dl class="swd">${guesses.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>${most}`
    + (F && F.bs ? g("BeerSmith", [["Strike", `${swT(F.bs)}, for grain at ${swT(F.bsGrain)} and the tun at ${swT(F.bsTun)}.${bsSays}`]]) : "");
}
/* the HLT's water, typed or stepped as in TARGET's box: −1 −.1, the number, +.1 +1, then SET and CANCEL. Its label gives
   the unit, and the line under it says what the figure is (WAI's form instructions) */
function swVolHTML(N) {
  const v = st.swVol.val, x = v == null ? "" : v.toFixed(1), pend = st.pend.swv, why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  const key = (d, l) => `<button type="button" data-cmd="swv:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  return `<div class="editor swvol" role="group" aria-labelledby="swv-l"><label class="swvl" id="swv-l" for="swvin"><span class="swvk">${HLT_WATER.label}</span><span class="swvs">: ${HLT_WATER.says}, in gallons</span></label>`
    + `<p class="swvh" id="swv-h">${swSteps().bi >= 0 ? "It is BrewStart's water volume, which also sets the Campden dose." : "What is in the HLT now."}</p>`
    + `${key(-1, "1 gallon less")}${key(-0.1, "0.1 gallon less")}<input id="swvin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swv-h swv-o swv-over swv-w">${key(0.1, "0.1 gallon more")}${key(1, "1 gallon more")}`
    + `<p class="swvo" id="swv-o">${swVolOther(N, v)}</p><p class="vover" id="swv-over" aria-live="polite">${hltOver(v)}</p><p class="vover" id="swv-w" aria-live="polite">${swVolWarn(N, v)}</p>`
    + `<button type="button" class="ok" data-cmd="swv:set"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}>${pend ? "SETTING…" : `SET <span id="swvok">${x || "– –"}</span> gal`}</button><button type="button" class="no" data-cmd="swv:x">CANCEL</button></div>`;
}
/* beside the HLT water being given: MASH WATER, the other figure, and under them the sparge water it leaves */
function swVolOther(N, v) {
  if (N.gal == null) return `${MASH_WATER.label}: not given yet.`;
  return `${MASH_WATER.label}: ${swMashText(N.R)}.${v != null ? ` ${spargeText(v, N.gal, "gal")}.` : ""}`;
}
/* HLT water that would leave the HLT less than covers its element and coil once the mash water has gone: refused */
function swVolWarn(N, v) {
  const least = swLeast();
  return v != null && N.gal != null && hltWaterLow(v, N.gal, least) ? hltWaterRefused({hlt: v, mash: N.gal, least, vu: "gal"}) : "";
}
/* the HLT's water (swVolHTML): SET writes BrewStart's water volume where the recipe has BrewStart, or by hand the figure
   CraftBeerPi keeps for the brew day, and CraftBeerPi works USE out again for it. It can be changed back the same way,
   so nothing asks first. The HLT keeps the mash water and, once it has gone, the least that covers its element and
   coil: less is refused. Opened from the MashIn row's box (at "row"), it is drawn there */
function swVol(x, y) {
  const N = swNumbers(), e = st.swVol;
  if (x === "open") {
    st.swGrain = null;
    st.swRec = null;
    st.swVol = {val: N.vol, at: y === "row" ? "row" : "box"};
    renderAll();
    return setTimeout(() => { const i = $("#swvin"); if (i) { i.focus(); i.select(); } }, 0);
  }
  if (x === "x") { st.swVol = null; return renderAll(); }
  if (!e || st.pend.swv) return;
  if (x === "step") { e.val = Math.max(0, Math.round(((e.val ?? N.gal ?? 0) + parseFloat(y)) * 10) / 10); return renderAll(); }
  const v = e.val, was = N.vol;
  if (v == null) return note("r", "Type how much water is in the HLT, in gallons.");
  if (N.gal != null && hltWaterLow(v, N.gal, swLeast())) return note("r", hltWaterRefused({hlt: v, mash: N.gal, least: swLeast(), vu: "gal"}));
  if (was != null && Math.abs(v - was) < 0.05) { st.swVol = null; return renderAll(); }
  /* while BrewStart's Campden reminder is on, LOG gives the dose for the new water, as it matters when the water does */
  const {S: S0, bi: b0} = swSteps(), camp = b0 >= 0 && S0[b0].campden ? ` · Campden ${swCampden(v)}` : "";
  send("swv", "set", `HLT water set to ${v.toFixed(1)} gal${was != null ? `, was ${was.toFixed(1)} gal` : ""}${camp}`, () => {
    const {S, bi} = swSteps();
    if (bi >= 0) S[bi].vol = v; else st.sw.vol = v;
    st.swVol = null;
    swRework("vol");
  });
}
/* the grain's temperature, typed or stepped as in TARGET's box: −1 −.1, the number, +.1 +1, then SET and CANCEL; while a
   figure is in use, THE PROBE under them goes back to the boil kettle's probe, as a blank grain temperature on
   BrewStart does. While BrewStart's grain isn't answered for this load, that button is IN THE GARAGE, in BrewStart's
   box's words, as USE waits for an answer. Its label gives the unit, and the line under it says when to give it (WAI's
   form instructions) */
function swGrainHTML(N) {
  const v = st.swGrain.val, x = v == null ? "" : v.toFixed(1), pend = st.pend.swg, why = st.link === "lost" ? PAUSED : pend ? WAIT : "";
  const key = (d, l) => `<button type="button" data-cmd="swg:step:${d}" aria-label="${l}">${d < 0 ? "−" : "+"}${Math.abs(d) === 1 ? "1" : ".1"}</button>`;
  const dis = why ? ` aria-disabled="true" data-why="${esc(why)}"` : "";
  /* THE PROBE: while a figure is in use, or BrewStart's can't be used, and the probe has a reading to stand for it; THE
     ROOM where the room given here stands for it instead */
  const probe = bsGrainAsk() ? `<button type="button" class="swprobe" data-cmd="swg:probe"${dis}>${pend === "probe" ? "SETTING…" : "IN THE GARAGE"}<small>the boil kettle's probe, ${f1(st.v.bk.pv)} °F</small></button>`
    : (N.typed == null && N.miss !== "grain") || N.room == null ? "" : `<button type="button" class="swprobe" data-cmd="swg:probe"${dis}>${pend === "probe" ? "SETTING…" : N.roomFrom === "you" ? "THE ROOM" : "THE PROBE"}<small>${N.roomFrom === "you" ? `the ${swT(N.room)} given here` : `the boil kettle's, ${swT(N.room)}`}, instead</small></button>`;
  return `<div class="editor swvol" role="group" aria-labelledby="swg-l"><label class="swvl" id="swg-l" for="swgin">Grain temperature, in °F</label>`
    + `<p class="swvh" id="swg-h">For grain that spent the night away from the boil kettle. ${swSteps().bi >= 0 ? "It is BrewStart's grain temperature: left blank" : "Without it"}, ${N.roomFrom === "you" ? "the room's temperature given here" : "the kettle's probe"} is used.</p>`
    + `${key(-1, "Down 1 degree")}${key(-0.1, "Down 0.1 degree")}<input id="swgin" inputmode="decimal" autocomplete="off" value="${x}" aria-describedby="swg-h">${key(0.1, "Up 0.1 degree")}${key(1, "Up 1 degree")}`
    + `<button type="button" class="ok" data-cmd="swg:set"${dis}>${pend === "set" ? "SETTING…" : `SET <span id="swgok">${x || "– –"}</span> °F`}</button><button type="button" class="no" data-cmd="swg:x">CANCEL</button>${probe}</div>`;
}
/* the grain's temperature (swGrainHTML): SET writes BrewStart's grain temperature where the recipe has BrewStart, or by
   hand the figure CraftBeerPi keeps for the brew day, and THE PROBE blanks it; either way CraftBeerPi works USE out
   again. Changed back the same way, so nothing asks first. A figure no room has is refused, as COMPARE PROBES counts a
   reading like that a probe looking off. One saved on BrewStart that the forecast can't use (bad) opens the box at the
   probe's reading, and LOG says what it was: its figure, or "not a number". On BrewStart it also answers where the
   grain spent the night, as BrewStart's box asks it: a figure is indoors, the probe the garage. While that isn't
   answered yet, IN THE GARAGE answers it, and SET answers indoors even with the same figure, its LOG line saying so
   ("Grain indoors at 61.4 °F") */
function swGrain(x, y) {
  const N = swNumbers(), e = st.swGrain, bad = N.miss === "grain", ask = bsGrainAsk();
  if (x === "open") {
    st.swVol = null;
    st.swRec = null;
    st.swGrain = {val: !bad && Number.isFinite(N.typed) ? N.typed : N.room};
    renderAll();
    return setTimeout(() => { const i = $("#swgin"); if (i) { i.focus(); i.select(); } }, 0);
  }
  if (x === "x") { st.swGrain = null; return renderAll(); }
  if (!e || st.pend.swg) return;
  if (x === "step") { e.val = Math.round(((e.val ?? N.grain ?? N.room ?? 0) + parseFloat(y)) * 10) / 10; return renderAll(); }
  const was = bad || N.typed != null ? swGrainSays(N.typed) : null, src = swRoomSrc(N);
  const keep = v => () => { const {S, bi} = swSteps(); if (bi >= 0) Object.assign(S[bi], {grain: v, where: v == null ? "garage" : "indoors"}); else st.sw.grain = v; st.swGrain = null; swRework("grain"); };
  if (x === "probe") {
    if (N.typed == null && !bad && !ask) { st.swGrain = null; return renderAll(); }
    return send("swg", "probe", ask ? `Grain in the garage: the boil kettle's probe, ${f1(st.v.bk.pv)} °F` : `Grain temperature from ${src}, was ${was}`, keep(null));
  }
  const v = e.val;
  if (v == null) return note("r", "Type the grain's temperature, in °F.");
  if (v < ROOM_LO || v > ROOM_HI) return note("r", `The grain's temperature has to be between ${ROOM_LO} and ${ROOM_HI} °F.`);
  if (!bad && !ask && N.typed != null && Math.abs(v - N.typed) < 0.05) { st.swGrain = null; return renderAll(); }
  send("swg", "set", ask ? `Grain indoors at ${v.toFixed(1)} °F` : `Grain temperature set to ${v.toFixed(1)} °F, was ${was || src}`, keep(v));
}
/* FORECAST's chart, as the graphs draw theirs: the mash's temperature for an hour from the grain going in, on the PID
   windows' black face. The rest in Setpoint Green; the band the forecast spans for the strike water as planned, in the
   readings' red, or Prompt Amber when it goes over the rest; the other choice's band as a grey dashed outline. Degrees
   down the right-hand side, minutes along the foot. While USE is worked out again, the bands are the last answer's, in
   the stale grey */
function drawSw() {
  const box = $("#swc");
  if (!box) return;
  const N = swNumbers();
  if (!N.ok) return;
  const w = Math.floor(box.clientWidth), h = Math.floor(box.clientHeight);
  if (w < 60 || h < 40) return;
  const alt = swAlt(N), P = N.plan != null ? N.fc(N.plan) : null, Q = alt != null ? N.fc(alt) : null, all = [P, Q].filter(Boolean);
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
    + `<text class="swrl" x="${w - 4}" y="${q(Y(N.rest) - 4)}" text-anchor="end">${+N.rest.toFixed(1)} °F REST</text>${gl}${tl}</svg>`;
}
/* the box: its head, the window, then USE (or BACK TO) and FORECAST side by side. With a number missing, why, in their
   place, and for the HLT's water a way to give it. FORECAST opens the forecast in detail under the head and turns into
   CLOSE in its own place, so nothing in the head moves: the forecast drawn and in words, why it is a range, what the
   Mash Tun's probe may read, and the numbers by where they come from. The head stays in reach while it is open: on one
   screen the details take the step list's room and scroll under it, as the probes' panel does; where the page scrolls,
   the head stays at the top of the screen while the details pass under it. Once the water is in the mash tun and the
   pump has stopped for the dough-in, the head says when the Mash Tun's reading isn't the mash. While CraftBeerPi works
   USE out, the head says so, with how long it has been at it, and greys USE */
function swHTML() {
  const phase = swPhase();
  if (!phase || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.bsOpen || st.mwOpen) return "";
  const N = swNumbers(), pend = st.pend.sw, why = st.link === "lost" ? PAUSED : pend || st.pend["r:unload"] || st.pend.bs ? WAIT : "", has = N.ok || !!N.wait, open = !!st.swOpen && has;
  /* sw-wk while CraftBeerPi works USE out: its own class, so the height the box keeps closed (pbFit) is let go as the
     forecast comes, and the box is then as tall as on a fresh load */
  const cls = `sw sw-${phase}${has ? "" : " sw-miss"}${N.work || N.wait ? " sw-wk" : ""}`;
  /* figures USE needs that the brewer can give here (swGives): one row, USE greyed and GIVE THEM in FORECAST's place,
     so the box is no taller than with a forecast and the step list keeps its room. GIVE THEM opens the box as FORECAST
     does (swOpen): why, and the figures' buttons, under the head; once they are all given and USE is worked out, the
     forecast is there in their place, under the same CLOSE. A figure's own box, open, takes the place of all of it, as
     before */
  if (!has) {
    const give = swGives(N).length && !swEditing() ? (st.swOpen ? "open" : "closed") : "";
    if (give) return `<section class="${cls}${give === "open" ? " open" : ""}" aria-label="Strike water">${head0(N, swGiveRow(N, give === "open"))}${give === "open" ? swGiveDet(N) : ""}</section>`;
    return `<section class="${cls}" aria-label="Strike water">${head0(N, swMissHTML(N))}</section>`;
  }
  /* USE, or once it is in use BACK TO, in one place. While the HLT heats the strike water, a temperature below the
     water's is greyed: the HLT can't cool it, and the step would ask for the water at once, hotter than the box says.
     While CraftBeerPi works USE out, USE is greyed, with the last figure if there is one: CraftBeerPi refuses a figure
     worked out from numbers that have changed since. BACK TO is never hotter, so it stays, unless the plan it goes
     back to is over the ceiling, which the box doesn't set: then it's greyed and says so, and by hand that the HLT's
     own TARGET can still set it. With BrewStart, USE waits for where the grain spent the night, which is asked once a
     brew: until it is answered for this load, USE's place says so, in the look CraftBeerPi's questions have in the
     title bar, and leads to the answer (sw:where). The grain matters only through USE, so nothing else waits for it */
  const alt = swAlt(N), used = alt != null && N.plan != null && Math.abs(N.plan - N.strike) < SW_SAME;
  let act = "";
  if (N.wait && phase !== "moved") act = b("cmdbtn swuse", "USE –&nbsp;–&nbsp;°F", "working it out", {cmd: "sw:use", why: SW_WORKING});
  else if (alt != null) {
    const H = st.v.hlt, water = (phase === "heat" && st.recipe.state === "running") || (!N.step && H.mode === "auto") ? H.pv : null;
    const cool = T => water != null && T < water - 0.5 ? `The water is already at ${water.toFixed(1)} °F, above ${T.toFixed(1)} °F, and the HLT can't cool it.` : "";
    const hot = T => T > SW_CEIL ? `${T.toFixed(1)} °F is over ${SW_CEIL} °F, too hot for strike water, so BACK TO can't set it.${N.step ? "" : " TARGET can set the HLT to it."}` : "";
    const stale = N.stale ? `Not yet: ${swWhy(N)}, and CraftBeerPi is working USE out again. ${N.strike.toFixed(1)} °F was for ${swWas(N)}.` : "";
    const ask = !used && !N.stale && !cool(alt) && bsGrainAsk();
    act = used ? b("cmdbtn", pend ? "SENDING…" : `BACK TO ${alt.toFixed(1)}&nbsp;°F`, st.sw.was != null ? "as it was" : "the rest", {cmd: "sw:back", why: why || hot(alt) || cool(alt)})
      : ask ? b("cmdbtn swuse swask", "USE –&nbsp;–&nbsp;°F", "where's the grain?", {cmd: "sw:where", label: "USE: where the grain spent the night isn't given yet. Say where it is first: USE depends on it.", why})
      : b("cmdbtn swuse", pend ? "SENDING…" : `USE ${alt.toFixed(1)}&nbsp;°F`, N.stale ? "working it out" : N.step ? "aims under the rest" : "as the HLT's target", {cmd: "sw:use", why: why || stale || cool(alt)});
  }
  /* with the pump stopped for the dough-in, a Mash Tun reading more than 3 °F over the top of where the forecast lands
     the mash: whatever the probe at the coil's outlet reads then, it isn't the mash. Nearer, nothing is said, so the
     line holds however that probe behaves, which hasn't been measured */
  const mt = st.v.mt, reads = N.ok && N.probe === "coil" && phase === "moved" && !st.a.wortPump.on && mt.pv != null && N.plan != null && mt.pv > N.fc(N.plan).hi[0] + 3;
  /* the line saying CraftBeerPi is working USE out goes under USE's row, so USE stays where it is as it lights up; the
     Mash Tun's line, which doesn't come and go under a reaching hand, stays above it */
  const line = reads ? `<p class="swl swmt">The Mash Tun's ${swT(mt.pv)} isn't the mash: with the pump stopped, its probe reads the water left in the HLT's coil.</p>` : "";
  const wk = N.work ? `<p class="swl swwk"><span>${swWorkSays(N)}</span></p>` : "";
  const more = b("cmdbtn swmore", open ? "CLOSE" : "FORECAST", open ? "the forecast" : "in detail", {cmd: "sw:more", expanded: open, controls: open ? "sw-det" : ""});
  const head = head0(N, `${line}<div class="swa${act ? "" : " one"}">${act}${more}</div>${wk}`);
  if (!open) return `<section class="${cls}" aria-label="Strike water">${head}</section>`;
  if (N.wait) return `<section class="${cls} open" aria-label="Strike water">${head}<div class="swdet" id="sw-det">`
    + `<p class="swn">The chart, and where the mash lands, come once USE is worked out. These are the numbers it is worked out from.</p>${swList(N)}</div></section>`;
  /* opened out. The words describe the chart for everyone. They are kept as tall as they would be once USE or BACK TO
     swaps the two choices (the ghost), so the swap moves nothing under them */
  const back = st.sw.was != null ? "as it was" : "with BACK TO", role = used ? back : "with USE";
  const words = swWords(N, [[N.plan, "as planned"], [alt, role]].filter(([T]) => T != null));
  const ghost = alt != null && N.plan != null ? swWords(N, [[alt, "as planned"], [N.plan, used ? "with USE" : "as it was"]]) : "";
  const top = [N.plan, alt].filter(T => T != null).map(T => [T, N.fc(T).reads]).sort((x, y) => y[1] - x[1])[0];
  const probeSays = N.probe === "coil" && top && top[1] > N.rest + 2 ? `<p class="swn">${top[0] === N.plan ? "During dough-in the Mash Tun may read" : "With USE, the Mash Tun may read"} up to ${Math.round(top[1])}&nbsp;°F${top[0] === N.plan ? "" : " during dough-in"}. That won't be the mash: its probe sits at the coil's outlet, and with the pump stopped it reads the water left in the HLT's coil.</p>` : "";
  const P = N.plan != null ? N.fc(N.plan) : null, hot = P && swOver(N, P) ? " hot" : "";
  const label = `Chart of the mash's temperature for an hour from the grain going in, ${[N.plan, alt].filter(T => T != null).map(T => `with the strike water at ${T.toFixed(1)} °F`).join(" and ")}, against the ${+N.rest.toFixed(1)} °F rest.${N.stale ? ` The figures are for ${swWas(N)}, while USE is worked out again.` : ""} Described under it.`;
  const key = (P ? `<li><i class="k-plan${hot}"></i>${N.plan.toFixed(1)} °F, as planned</li>` : "")
    + (alt != null ? `<li><i class="k-alt"></i>${alt.toFixed(1)} °F, ${role}</li>` : "")
    + `<li><i class="k-rest"></i>the rest, ${+N.rest.toFixed(1)} °F</li>`;
  const was = N.stale ? `<p class="swn">${swWhy(N)[0].toUpperCase() + swWhy(N).slice(1)}, so CraftBeerPi is working USE out again. Until then, these are the figures for ${swWas(N)}.</p>` : "";
  /* no USE because it comes out at the rest itself, with the strike water there already: said, so its absence isn't a
     puzzle */
  const atRest = alt == null && phase !== "moved" && Math.abs(N.strike - N.rest) < SW_SAME
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
  const {bi} = swSteps();
  if (bi >= 0 && bsLive(bi)) return bsOpen({focus: "garage", from: "use"});
  st.swOpen = true;
  swGrain("open");
}
/* USE: the server's call puts the temperature in the strike water step, and in BrewStart's while it is next or
   waits, so Ready by plans for it; and while the strike water step heats or holds the water (BrewStart heating
   included), in the HLT's target too. A question already up from the old temperature goes, and the step asks again
   at the new one. By hand it sets the HLT's target alone, as SET does. BACK TO undoes it the same way, to the
   temperature before the first USE. A figure worked out from numbers since changed on another screen is refused
   (swRefuse) */
function swUse() {
  const N = swNumbers();
  if (!N.ok || N.stale || st.pend.sw) return;
  const to = N.strike, from = N.plan;
  if (st.sw.srv) return swRefuse(to);
  send("sw", "use", N.step ? `Strike water set to ${to.toFixed(1)} °F, was ${from.toFixed(1)} °F`
    : `${VNAME.hlt} target ${to.toFixed(1)} °F for the strike water${from != null ? `, was ${from.toFixed(1)} °F` : ""}`,
  () => { if (st.sw.was == null) st.sw.was = from; swSet(to); });
}
/* CraftBeerPi's refusal (409 plan_changed): the screen's figure was worked out from numbers since changed on another
   screen (sw.srv: the change, and whether CraftBeerPi has the new figure yet). Nothing is applied, so nothing is
   logged. The box takes the change and CraftBeerPi's answer, says once under it what happened, and offers the new
   figure in USE's place; still being worked out, it shows that instead */
function swRefuse(to) {
  st.pend.sw = "use"; renderAll();
  timers.push(setTimeout(() => {
    const srv = st.sw.srv, before = swIn(), {S, bi} = swSteps();
    delete st.pend.sw; delete st.sw.srv;
    if (srv.grain !== undefined) { if (bi >= 0) Object.assign(S[bi], {grain: srv.grain, where: srv.grain == null ? "garage" : "indoors"}); else st.sw.grain = srv.grain; }
    if (srv.vol !== undefined) { if (bi >= 0) S[bi].vol = srv.vol; else st.sw.vol = srv.vol; }
    if (srv.working) st.sw.work = {since: st.t - (srv.for || 0), why: srv.why};
    else { st.sw.has = Object.assign(swNow(), {lvAt: st.t + SW_LEVER_S}); st.sw.work = null; }
    const N = swNumbers(), words = swRefusal(to, swChanged(before, swIn()), N.ok && !N.stale ? N.strike : null);
    note("r", words); say(words);
    renderAll();
  }, 700 + Math.random() * 400));
}
/* the refusal in words: what wasn't applied, what changed, and the figure now (none while it is worked out again). The
   window shows the strike water still as it was */
function swRefusal(sent, what, use) {
  return `USE ${sent.toFixed(1)} °F wasn't applied: ${what}, ${use == null ? "and CraftBeerPi is working USE out again" : `so USE is ${use.toFixed(1)} °F`}.`;
}
/* what changed between two sets of numbers, in words */
function swChanged(a, z) {
  const by = swSteps().bi >= 0;
  if (a.typed !== z.typed) return z.typed == null ? `the grain's temperature is the boil kettle's probe's again, ${z.grain.toFixed(1)} °F` : `${by ? "BrewStart's grain temperature" : "the grain's temperature"} is now ${z.typed.toFixed(1)} °F`;
  if (Math.abs((a.vol ?? 0) - (z.vol ?? 0)) >= 0.05) return `${by ? "BrewStart's water volume" : "the HLT's water"} is now ${z.vol.toFixed(1)} gal`;
  if (Math.abs((a.room ?? 0) - (z.room ?? 0)) >= 0.05) return `the room is now ${z.room.toFixed(1)} °F`;
  return "the numbers it is worked out from changed";
}
function swBack() {
  const N = swNumbers(), to = st.sw.was ?? N.rest;
  if (st.pend.sw) return;
  send("sw", "back", N.step ? `Strike water set back to ${to.toFixed(1)} °F` : `${VNAME.hlt} target back to ${to.toFixed(1)} °F`, () => { st.sw.was = null; swSet(to); });
}
function swSet(t) {
  const r = st.recipe, {S, bi, si} = swSteps(), H = st.v.hlt, he = st.a.hltEl, run = r.state === "running";
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
  r.wait = WFY;
  soon(() => { st.banner = {tone: "prompt", title: s.n, text: s.note, act: "NEXT STEP", cmd: "b:done"}; logEvent(`${s.n}: ${s.note}`, "waiting for you", "wait"); });
}
/* BrewStart, started: it heats nothing yet, and waits for the time its plan works out: with Ready by, as early as
   heating the water needs; with Start at, the time itself (bsHeatAt). Without a time it can't plan, and says so in its
   words (err_time_missing), waiting for the brewer */
function swWaitBegin(s) {
  const r = st.recipe, pv = st.v.hlt.pv;
  r.bsHeat = null;
  if (bsAt(s) == null) { r.wait = WFY; soon(() => logEvent("BrewStart: Error: The time is blank - set it", "from CraftBeerPi", "bad")); return; }
  r.wait = `STARTS ${tod(bsHeatAt(s, pv))}`;
  soon(() => logEvent(bsPlanLine(s, pv), "from CraftBeerPi", ""));
}
/* BrewStart (1.3.0) with Ready by, at its heating start: it heats the HLT itself to its own temperature, the strike
   water's, on the HLT's AUTO, with the HLT pump on as the brew morning has it, and stays the current step (bsHeat:
   "heating", then "holding"). Its line in LOG comes just after what set it going. In the older shape (bsHandsOver) it
   heats nothing and hands over at once */
function bsHeat(s) {
  if (bsHandsOver(s)) { bsHandOver(); return; }
  const H = st.v.hlt, he = st.a.hltEl;
  st.recipe.bsHeat = "heating";
  H.own = s.temp;
  stepTarget(s);
  he.on = s.temp > H.pv; he.pct = he.on ? (s.temp - H.pv > 2 ? 100 : 40) : 0;
  if (!st.a.hltPump.on) setActor("hltPump", true);
  soon(() => logEvent(`BrewStart heating, HLT target ${s.temp.toFixed(1)} °F`, "by recipe", ""));
  bsHeating(s);
}
/* the older shape (?sws=step): a strike water step, a MashInStep on the HLT, after a Ready by BrewStart. There
   BrewStart 1.3.0 heats nothing: at its heating start it hands over at once, and the strike water step heats the HLT
   and asks for the water to be moved, as before BrewStart heated */
const bsHandsOver = s => { const nx = RECIPE.steps[RECIPE.steps.indexOf(s) + 1]; return !s.start && !!nx && nx.k === "hlt" && nx.type === "MashInStep"; };
function bsHandOver() {
  const r = st.recipe, nx = RECIPE.steps[r.cur + 1];
  r.bsHeat = null;
  logEvent("BrewStart finished", "by recipe", "");
  stepStart(r.cur + 1);
  logEvent(`${nx.n} started${nx.temp != null ? `, HLT target ${nx.temp.toFixed(1)} °F` : ""}`, "by recipe", "");
}
/* BrewStart heating: HEATING until the water is half a degree short of its temperature, as the strike water step
   counts it. Then, as the strike water step, it holds the water and asks in the title bar for it to be moved, until
   Next (cmdBanner, stepStart) */
function bsHeating(s) {
  const r = st.recipe;
  if (st.v.hlt.pv < s.temp - 0.5) { r.wait = true; r.bsHeat = "heating"; return; }
  r.wait = WFY; r.bsHeat = "holding";
  soon(() => {
    const ask = bsHoldWords(s.temp, KNAME.mt);
    st.banner = {tone: "prompt", title: s.n, text: ask, act: "NEXT STEP", cmd: "b:done"};
    logEvent(`${s.n}: ${ask}`, "waiting for you", "wait");
    say(`${s.n}. ${ask}`, true);
  });
}
/* the strike water moved and Next pressed: the water is in the mash tun. It came through the coil, so the Mash Tun's
   probe, at the coil's outlet, reads it: at the rest or above, MashIn on the Mash Tun asks for the malt at once, and its
   pump stops for the dough-in (Stop_Pump_At_Strike), so the probe reads the HLT's water. Below the rest, the coil
   brings it up first */
function swMovedIn(s) {
  const r = st.recipe, {S, si} = swSteps(), T = si >= 0 ? S[si].temp : st.v.hlt.sv;
  st.fill.mtLiq = true;
  if (T == null) return;
  st.v.mt.pv = +T.toFixed(1);
  if (st.v.mt.pv < s.temp - 0.5) { r.wait = true; return; }
  r.wait = WFY; setActor("wortPump", false);
  soon(() => { st.v.mt.pv = +(st.v.hlt.pv - 0.1).toFixed(1); st.banner = {tone: "prompt", title: s.n, text: "Target temperature reached. Please add malt.", act: "NEXT STEP", cmd: "b:done"}; logEvent(`${s.n}: Target temperature reached. Please add malt.`, "waiting for you", "wait"); });
}
/* ---------- BrewStart's box ----------
   BrewStart's time is set on Brew Day the night before, from its row in the step list: Ready by first (the water hot
   by a time, BrewStart working out when heating must start), Start at the second choice; the day as TODAY or TOMORROW
   on CraftBeerPi's clock, which the step keeps as a date; and where the grain spent the night, asked once a brew as
   USE depends on it: in the garage, where the boil kettle's probe stands for it, or indoors, at a figure. BrewStart's
   water is never typed here: the strike water box gives it (USE, HLT WATER). The row opens the box while BrewStart
   hasn't started heating: on a recipe not begun, and while it waits for its time, when a change plans it again at
   once. A recipe without BrewStart has + BrewStart above its first step, which opens the box for a new one. On one
   screen the box takes the step list's room, as the pre-brew check's box does; where the page scrolls it sits where
   the list is */
const bsWaits = () => { const r = st.recipe, s = r && RECIPE.steps[r.cur]; return !!s && s.type === "BrewStart" && r.state === "running" && typeof r.wait === "string" && r.wait.startsWith("STARTS "); };
/* BrewStart before its heating has begun: on a recipe not begun, and while it waits. Its row then gives its day, and
   USE waiting for the grain opens its box (after that, the strike water box's GRAIN) */
function bsLive(i) {
  const r = st.recipe, s = RECIPE.steps[i];
  if (!r || !s || s.type !== "BrewStart") return false;
  return pbFresh() ? i >= r.cur : i === r.cur && bsWaits();
}
/* BrewStart running as the current step: waiting for its time, heating the water or holding it */
const bsRuns = () => { const r = st.recipe, {bi} = swSteps(); return !!r && bi >= 0 && bi === r.cur && r.state === "running"; };
/* BrewStart stopped as the current step, after START: not done, and START carries it on */
const bsStopped = () => { const r = st.recipe, {bi} = swSteps(); return !!r && bi >= 0 && bi === r.cur && r.state === "stopped"; };
/* BrewStart's row opens its box until BrewStart has finished: where bsLive has it, and while it heats or holds the water
   or is stopped as the current step. There the box changes its time and the grain, and ALL SETTINGS opens every
   setting it has on Brew Steps */
function bsOpens(i) {
  if (bsLive(i)) return true;
  return i === swSteps().bi && (bsRuns() || bsStopped());
}
/* where the grain spent the night, answered for this load: kept on the step, as the box or the strike water box's GRAIN
   gave it. A load from the Recipe Book asks again */
const bsGrainSaid = s => s.where === "garage" || s.where === "indoors";
/* a recipe with BrewStart whose grain isn't answered yet for this load: USE waits for the answer (swHTML) */
const bsGrainAsk = () => { const {S, bi} = swSteps(); return bi >= 0 && !bsGrainSaid(S[bi]); };
/* a time kept 24-hour, as a step keeps it ("07:00"): minutes from midnight, or null */
function hmMin(x) {
  const m = /^\s*(\d{1,2}):?(\d{2})\s*$/.exec(x || "");
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
}
/* a time as typed in BrewStart's box (The Twelve-Hour Rule), read in the half of the day the box showed as typing
   began (half, "AM" or "PM"): minutes from midnight, and whether what was typed said the half itself (said), or null.
   "7", "700", "7:00", "7.30" and "7 30" are in that half, leading zeros or not ("07:00" showing PM is 7:00 PM); "7a"
   and "7 am" are morning, "7p" and "7 pm" evening, the hour then 1 to 12; an hour only the 24-hour clock has says its
   half: 0 is midnight's, 13 to 23 the evening's ("19", "19:00"); "12" is noon and "12a" midnight. Minutes are 00 to
   59. In 24-hour a time without AM or PM is the 24-hour time (7, 700, 0700, 7:00 and 7.00 are all 07:00), and one with
   it is read as above, so "7p" is 19:00 */
function bsParse(x, half) {
  const k = /^\s*(\d{1,2})(?:[:. ]?(\d{2}))?\s*(?:([ap])\.?(?:m\.?)?)?\s*$/i.exec(x || "");
  if (!k) return null;
  const h = +k[1], mi = k[2] == null ? 0 : +k[2], ap = k[3] && k[3].toLowerCase();
  if (mi > 59) return null;
  if (ap) return h >= 1 && h <= 12 ? {m: (h % 12 + (ap === "p" ? 12 : 0)) * 60 + mi, said: true} : null;
  if (h > 23) return null;
  if (CLOCK24 || h === 0 || h >= 12) return {m: h * 60 + mi, said: true};
  return {m: (h + (half === "PM" ? 12 : 0)) * 60 + mi, said: false};
}
/* the box's time as it shows it: "7:00", the half beside it on its own buttons; in 24-hour "07:00" */
const bsShow = m => m == null ? "" : todParts(m * 60).hm;
const bsHalf = m => m < 720 ? "AM" : "PM";
/* BrewStart's time on CraftBeerPi's clock (st.t), from the date and the time the step keeps; null without them */
function bsAt(s) { const m = hmMin(s.start || s.ready); return m == null || !s.date ? null : dayIdx(s.date) * 86400 + m * 60; }
/* when BrewStart goes on to the heating: with Start at, at its time; with Ready by, as early as heating the water at pv
   needs (swStartAt) */
const bsHeatAt = (s, pv) => s.start ? bsAt(s) : swStartAt(s.temp, pv, bsAt(s));
/* BrewStart's own words for a time on CraftBeerPi's clock (format_start), the time by the clock's setting:
   "Sat Nov 21, 7:00 AM" */
function bsFmt(t) { const d = clockDay(t); return `${tcase(DOW[d.getUTCDay()])} ${tcase(MON3[d.getUTCMonth()])} ${d.getUTCDate()}, ${tod(t)}`; }
/* BrewStart's notification as it plans, in its words: Ready by's (notify_ready_scheduled), as swPlanLine says it for
   07:00, for any time; Start at's (notify_scheduled) */
function bsPlanLine(s, pv) {
  if (s.start) return `BrewStart: Brew start scheduled for ${bsFmt(bsAt(s))}`;
  return `BrewStart: Ready by ${bsFmt(bsAt(s))}: heating starts about ${bsFmt(bsHeatAt(s, pv))}. ${pv.toFixed(1)} °F to ${s.temp.toFixed(1)} °F takes about ${Math.round((s.temp - pv) / SW_RATE)} min, plus ${SW_SPARE} min spare.`;
}
/* BrewStart's notification for a new time taken while it waits (change_time's notify_time_changed): the time it had,
   then its plan as above */
const bsChangedLine = (s, pv, was) => `BrewStart: Time changed, was ${bsFmt(was)}. ${bsPlanLine(s, pv).slice(11)}`;
/* BrewStart's notification as a new ready time makes it hand over at once (_due_message): on time if heating the water
   from pv, without the spare minutes, still makes it; else when the water will be ready */
function bsDueLine(s, pv) {
  const at = bsAt(s), heat = (s.temp - pv) / SW_RATE, eta = st.t + Math.round(heat * 60);
  return eta <= at ? `BrewStart: Time to heat - the water should be ready by ${bsFmt(at)}.`
    : `BrewStart: Heating has to start now: from ${pv.toFixed(1)} °F it needs about ${Math.round(heat)} min, so the water will be ready around ${bsFmt(eta)}, after ${bsFmt(at)}.`;
}
/* the row and + BrewStart wait with the recipe's own commands and pause with no connection; a tap says why */
function bsRowWhy() {
  const P = st.pend;
  if (st.link === "lost") return PAUSED;
  if (P["r:check"]) return PB_WAIT;
  return ["bs", "r:start", "r:stop", "r:next", "r:reset", "r:unload", "r:load"].some(k => P[k]) ? WAIT : "";
}
/* what BrewStart's row asks first, in the order of what waits on the brewer: no time set ("time"), then where the grain
   spent the night ("grain"); nothing once both are given */
const bsRowAsks = s => !(s.start || s.ready) ? "time" : !bsGrainSaid(s) ? "grain" : "";
/* BrewStart's row as a button (stepHTML): the row as it was, with the day in its details before its heating, and under
   its state a small hint for what it asks: "set a time", "where's the grain?", or "change". Holding the water it keeps
   its question as its note line (nt). Its label says the same in words */
function bsRowHTML(s, i, state, p, right, nt) {
  const tm = s.start || s.ready, grain = !bsGrainSaid(s), d = s.date ? dayIdx(s.date) : null, why = bsRowWhy(), asks = bsRowAsks(s), heat = state === "cur" && bsRuns() ? st.recipe.bsHeat : null;
  const hint = asks === "time" ? '<small class="bsh amb">set a time</small>' : asks === "grain" ? "<small class=\"bsh amb\">where's the grain?</small>" : '<small class="bsh">change</small>';
  const said = `BrewStart: ${tm ? `${s.start ? "start at" : "ready by"} ${todS(tm)}${d != null ? ` ${dLong(d)}` : ""}` : "no time set"}${s.temp != null ? `, ${stepTemp(s)} °F` : ""}${s.vol != null ? `, ${+s.vol.toFixed(2)} gallon${s.vol === 1 ? "" : "s"}` : ""}${heat === "heating" ? ", heating the water" : heat === "holding" ? ", holding the water, waiting for you" : ""}. ${tm ? "Change it" : "Set a time"}${grain ? ". Where the grain spent the night isn't given yet" : ""}`;
  const note = nt ? `<span class="p pn${state === "cur" && st.banner && st.banner.title === s.n ? " asked" : ""}">${nt}</span>` : "";
  return `<li class="stepb"><button type="button" class="step bs"${state === "cur" ? ' aria-current="step"' : ""} data-cmd="bs:open" aria-label="${esc(said)}" aria-expanded="${!!st.bsOpen}"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="n">${i + 1}</span><span class="t">${s.n}</span><span class="p">${p}</span>${note}<span class="s">${right}${hint}</span></button></li>`;
}
/* the row's hint on one line under its state where that leaves the name and the details their lines; where the width it
   takes would give them another line, it wraps inside the state's own width instead (data-wrap, brew-day.css). In
   12-hour, STARTS's time goes under the word (data-stack) where its AM or PM would otherwise cost the row height, as
   the state then takes less of the row's width. Tried each time the column is drawn, when it changes size and once the
   fonts are in; while the list is hidden the hint stays on one line and STARTS on one line. True where it changed */
function bsFit() {
  const r = $("#recipe .step.bs");
  if (!r) return false;
  const was = [r.hasAttribute("data-wrap"), r.hasAttribute("data-stack")], h = () => r.querySelector(".t").offsetHeight + r.querySelector(".p").offsetHeight;
  const set = (w, s) => { r.toggleAttribute("data-wrap", w); r.toggleAttribute("data-stack", s); };
  set(false, false);
  const one = h();
  set(true, false);
  const wrap = h() < one;
  let stack = false;
  if (!CLOCK24 && r.querySelector(".s .wt")) { set(wrap, false); const flat = r.offsetHeight; set(wrap, true); stack = r.offsetHeight < flat; }
  set(wrap, stack);
  return wrap !== was[0] || stack !== was[1];
}
/* + BrewStart: on a recipe loaded and not begun that has no BrewStart, a dashed row above its first step, not a step
   yet, that opens BrewStart's box for a new one */
function bsAddHTML() {
  if (!pbFresh() || swSteps().bi >= 0) return "";
  const why = bsRowWhy();
  return `<li class="bsnew"><button type="button" class="bsadd" data-cmd="bs:new" aria-expanded="${!!st.bsOpen}"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="pl" aria-hidden="true">+</span><span class="t"><span class="sr">Add </span>BrewStart</span><span class="p">Hot water by a set time&nbsp;· goes in as step 1</span></button></li>`;
}
/* a time not yet set takes its day by the noon rule: TOMORROW from noon on CraftBeerPi's clock, TODAY before it */
const bsNoon = () => dayOf(st.t) + (st.t % 86400 >= 12 * 3600 ? 1 : 0);
/* a new BrewStart's temperature: the strike water step's, or without one the first mash step's */
function bsNewTemp() { const {S, si, mi} = swSteps(); return si >= 0 ? S[si].temp : mi >= 0 ? S[mi].temp : null; }
/* how long until then, in words; on a simulator not at 1×, in real time too */
function bsIn(sec) {
  const m = Math.round(sec / 60), sc = SC();
  const says = nb(sec < 60 ? "in under a minute" : m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);
  if (sc === 1) return says;
  const real = sec / sc, rm = Math.round(real / 60);
  return `${says}, ${real < 60 ? "under a real minute" : rm < 90 ? `about ${rm} real minute${rm === 1 ? "" : "s"}` : `about ${Math.round(real / 3600)} real hours`} at ${sc}×`;
}
/* a length of time in words, for the sentence of a ready time too soon to wait for: "20 min", "1 h 5 min", kept
   on one line */
function bsDur(sec) { const m = Math.round(sec / 60); return nb(sec < 60 ? "under a minute" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`); }
/* while BrewStart waits with Ready by, what it plans for heating the water: its ready time less its heating start, as
   its row's STARTS says it; null otherwise. A new ready time no further away than that, and a minute, has BrewStart
   hand over at once (change_time), as START does for a time too soon */
function bsLead() {
  const {S, bi} = swSteps(), s = bi >= 0 ? S[bi] : null;
  return !s || s.start || !bsWaits() ? null : bsAt(s) - bsHeatAt(s, st.v.hlt.pv);
}
/* the box's time in words, or that it has passed (past), or that it is too soon to wait for, so SET starts the heating
   (soon); null while what's typed isn't a time (B.m, the time the box stands for) */
function bsSays(B) {
  const m = B.m;
  if (m == null) return null;
  const at = B.day * 86400 + m * 60, now = dayOf(st.t), hm = tod(m * 60), rel = B.day === now ? "today" : B.day === now + 1 ? "tomorrow" : "";
  if (at <= st.t) return {past: true, text: `${hm} ${rel || dMid(B.day)} has passed. For tomorrow morning, choose TOMORROW.`};
  const lead = B.neu || B.kind === "start" ? null : bsLead();
  if (lead != null && at - st.t <= lead + 60) return {past: false, soon: true, text: `Heating starts as soon as you press HEAT NOW: BrewStart plans ${bsDur(lead)} for heating the water, and ${hm} ${rel || dMid(B.day)} is ${bsDur(at - st.t)} away.`};
  const {S, bi} = swSteps(), nx = B.neu ? S[0] : S[bi + 1], when = `${hm}${rel ? ` ${rel},` : ""} ${dMid(B.day)}: ${bsIn(at - st.t)}.`;
  /* Start at chosen while BrewStart heats or holds the water: SET stops its heating, so the box says so first */
  if (!B.neu && B.kind === "start" && bsRuns() && st.recipe.bsHeat) return {past: false, text: "Heating has begun, so Start at's time changes nothing now: the heating carries on."};
  return {past: false, text: B.kind === "start" ? `Heating starts at ${when}` : `The ${KNAME[B.neu ? "hlt" : S[bi].k]}'s water is hot by ${when}`};
}
/* what BrewStart heats, from the step: its kettle, its element's power, its water and its temperature; a new one's
   water is the recipe's, worked out from its mash numbers. It says where it changes: ALL SETTINGS always, and the strike
   water box only where that box is on the screen and offers the water (swWaterAt). Under it, where the HLT's capacity
   is known and the water is more (hltOver) */
function swWaterAt() {
  if (!swPhase()) return "";
  const N = swNumbers();
  return N.ok || N.wait ? "CHANGE in the strike water box's FORECAST" : N.miss === "vol" ? "HLT WATER in the strike water box" : "";
}
function bsWater(B) {
  const {S, bi} = swSteps(), s = B.neu ? null : S[bi], W = s ? s.watts : SW_WATTS, T = s ? s.temp : bsNewTemp(), sw = swWaterAt();
  const el = `The ${KNAME[s ? s.k : "hlt"]}'s ${W ? `${W} W ` : ""}element heats`, to = T == null ? "" : ` to ${T.toFixed(1)} °F`;
  if (!s) return `<p class="bswat">${el} ${+SW_NEED.toFixed(2)} gal${to}, worked out from the recipe.</p>${hltOverHTML(SW_NEED)}`;
  if (s.vol == null) return `<p class="bswat">${el} the water${to}. <b>How much water isn't known yet</b>: give it with ALL SETTINGS${sw ? `, or ${sw},` : ""} before you START.</p>`;
  return `<p class="bswat">${el} ${+s.vol.toFixed(2)} gal${to}. ALL SETTINGS changes them.${sw ? ` ${sw[0].toUpperCase()}${sw.slice(1)} changes the water too.` : ""}</p>${hltOverHTML(s.vol)}`;
}
/* the vessels' own figures, from the Hardware page (CraftBeerPi's kettle fields capacity, empty_weight, material and
   specific_heat), each null where it isn't given, which is usual: nothing here needs them. st.vessels[k] for the HLT
   ("hlt") and the Mash Tun ("mt"); the demo's are none unless a moment gives them */
const vesselOf = k => (st.vessels || {})[k] || {};
/* BrewStart's water, or the HLT's water typed in the strike water box, more than the HLT holds: one line in Note Amber
   under the figure, saying both figures and where the capacity comes from, so either can be put right. It greys and
   refuses nothing, and with no capacity given there is no line */
function hltOver(gal) {
  const c = vesselOf("hlt").capacity;
  return c != null && c > 0 && gal != null && gal > c + 0.005 ? `${+gal.toFixed(2)} gal is more than the HLT holds: ${+c.toFixed(2)} gal, on the Hardware page.` : "";
}
const hltOverHTML = (gal, id) => { const t = hltOver(gal); return t ? `<p class="vover"${id ? ` id="${id}"` : ""}>${t}</p>` : ""; };
/* the material's name in a sentence, from the Hardware page; with an empty weight but no material, the forecast takes
   stainless steel, as most brewing vessels are, and says so */
function vesselSays(v, tail = "") {
  const lb = `${+v.empty_weight.toFixed(1)}&nbsp;lb`;
  return v.material === "aluminium" ? `${lb} of aluminum${tail}` : v.material === "other" ? `${lb} of a material holding ${v.specific_heat}&nbsp;cal/g&nbsp;°C${tail}`
    : v.material === "stainless_steel" ? `${lb} of stainless steel${tail}` : `${lb}${tail}, taken as stainless steel`;
}
/* a vessel's weight the forecast can use: given, and more than 0; with "other" as its material, only with its
   specific heat */
const vesselWeighed = v => v.empty_weight != null && v.empty_weight > 0 && !(v.material === "other" && !(v.specific_heat > 0));
const bsHint = B => `${B.kind === "start" ? "start at" : "ready by"} ${B.m == null ? "– –" : tod(B.m * 60)} ${dShort(B.day)}`;
/* a time that can't be read, said once the time box is left and by SET; in 24-hour SET says it as before */
const BS_BAD = "That isn't a time: type it as 7, 7:30 or 730, and tap AM or PM.";
const bsBad = () => CLOCK24 ? "Type the time as 07:00." : BS_BAD;
/* SET, or ADD BREWSTART for a new one, in Selection Blue as the editors' main action; greyed with no connection, while
   a command waits, and for a time that has passed, with the sentence that says so as its reason. For a ready time too
   soon for BrewStart to wait, it says what it does: HEAT NOW */
const bsGoWhy = (B, ws) => {
  const P = st.pend;
  return st.link === "lost" ? PAUSED : P.bs ? WAIT : P["r:check"] ? PB_WAIT : ["r:start", "r:stop", "r:next", "r:reset", "r:unload", "r:load"].some(k => P[k]) ? WAIT : ws && ws.past ? ws.text : "";
};
function bsGoHTML(B, ws) {
  const busy = !!st.pend.bs, why = bsGoWhy(B, ws);
  return B.neu ? b("cmdbtn bsgo", busy ? "ADDING…" : "ADD BREWSTART", "as step 1", {cmd: "bs:set", why})
    : b("cmdbtn bsgo", busy ? "SETTING…" : ws && ws.soon ? "HEAT NOW" : "SET", bsHint(B), {cmd: "bs:set", why});
}
let bsGoLast = "", bsClkLast = "";
/* the box: a legend in its top border as the timer editor's; then, on a simulator whose clock isn't the screen's, where
   that clock is (bsClockHTML), and while BrewStart runs, what it is doing (waiting, heating or holding the water), both
   pinned above the middle so they stay in view while the middle scrolls. In the middle, Ready by (or Start at) with the
   other as a quiet button; the time's keys and box; AM and PM (not in 24-hour); the day; the time in words; where the
   grain spent the night; and last the water, only a fact here, so the part that may scroll out of view. At its foot,
   pinned so they stay in reach while the middle scrolls, the note line, SET and CANCEL, and ALL SETTINGS under them,
   which opens every setting BrewStart has on Brew Steps, asking first (bsAskHTML) where the box has something not set
   yet. While its command waits, everything in it is greyed */
function bsHTML() {
  const B = st.bs, {S, bi} = swSteps(), s = B.neu ? null : S[bi], busy = !!st.pend.bs, wait = !B.neu && bsWaits(), now = dayOf(st.t);
  const off = busy ? WAIT : "", dis = off ? ` aria-disabled="true" data-why="${esc(off)}"` : "", ws = bsSays(B), nx = S[bi + 1];
  const run = !B.neu && bsRuns(), heat = run ? st.recipe.bsHeat : null, at = s && s.temp != null ? ` ${heat === "holding" ? "at" : "to"} ${s.temp.toFixed(1)} °F` : "";
  const key = (d, l, a) => `<button type="button" data-cmd="bs:step:${d}" aria-label="${a}"${dis}>${l}</button>`;
  const head = wait ? `<p class="bsw">BrewStart is waiting: ${s.start ? `heating starts at ${todS(s.start)}` : `heating starts about ${st.recipe.wait.slice(7)}`}. A change here plans it again at once.</p>`
    : heat === "heating" ? `<p class="bsw">BrewStart is heating the ${KNAME[s.k]}'s water${at}. A new time here changes when it should be ready; the heating carries on.</p>`
    : heat === "holding" ? `<p class="bsw">BrewStart is holding the ${KNAME[s.k]}'s water${at} for you to move it.</p>`
    : !B.neu && bsStopped() ? '<p class="bsw">BrewStart is stopped: START carries it on with what is set here.</p>' : "";
  /* Ready by and Start at swap here whenever BrewStart isn't done: SET sends the swap through BrewStart's change_settings */
  const kind = `<div class="bskind"><p class="bsl" id="bs-kl">${B.kind === "start" ? "Start at" : "Ready by"}</p>${b("bsq", B.kind === "start" ? "READY BY INSTEAD" : "START AT INSTEAD", "", {cmd: "bs:kind", why: off})}</div>`
    + `<p class="bsgh" id="bs-kh">${B.kind === "start" ? "Heating starts at the time" : "Hot by the time"}, and held until you press NEXT.</p>`;
  const as = CLOCK24 ? "07:00" : "7:00";
  const time = `<div class="editor bstime" role="group" aria-labelledby="bs-kl">${key(-60, "−1 H", "An hour earlier")}${key(-15, "−15", "15 minutes earlier")}<input id="bstin" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="${as}" value="${esc(B.txt)}" aria-label="Time, as ${as}"${busy ? " readonly" : ""}>${key(15, "+15", "15 minutes later")}${key(60, "+1 H", "An hour later")}</div>`;
  /* the half of the day the time is in, pressed; a tap moves the same time to the other half. A compact pair, without
     hints: the time in words below says which half it is */
  const half = CLOCK24 ? "" : `<div class="bsday bsap" role="group" aria-label="AM or PM">${b("cmdbtn", "AM", "", {cmd: "bs:ap:AM", pressed: B.ap === "AM", why: off})}${b("cmdbtn", "PM", "", {cmd: "bs:ap:PM", pressed: B.ap === "PM", why: off})}</div>`;
  const day = `<div class="bsday" role="group" aria-label="Day">${b("cmdbtn", "TODAY", dKey(now), {cmd: "bs:day:0", pressed: B.day === now, why: off})}${b("cmdbtn", "TOMORROW", dKey(now + 1), {cmd: "bs:day:1", pressed: B.day === now + 1, why: off})}</div>`;
  const chips = B.where !== "indoors" ? "" : `<div class="bsin" role="group" aria-label="The grain's temperature indoors">${[64, 68, 72].map(c => b("cmdbtn bschip", `${c} °F`, "", {cmd: `bs:chip:${c}`, pressed: B.chip === c, why: off})).join("")}`
    + `<span class="bsor"><span aria-hidden="true">or</span><input id="bsgin" inputmode="decimal" autocomplete="off" maxlength="5" value="${esc(B.fig)}" aria-label="Or another figure, in °F"${busy ? " readonly" : ""}><span aria-hidden="true">°F</span></span></div>`;
  const grain = `<div class="bsgrain"><p class="bsl" id="bs-gl">Where is the grain tonight?</p><p class="bsgh">Asked once a brew: USE depends on it.</p>`
    + `<div class="bswhere" role="group" aria-labelledby="bs-gl">${b("cmdbtn", "IN THE GARAGE", `the boil kettle's probe, ${f1(st.v.bk.pv)} °F`, {cmd: "bs:where:garage", pressed: B.where === "garage", why: off})}${b("cmdbtn", "INDOORS", "give its temperature", {cmd: "bs:where:indoors", pressed: B.where === "indoors", why: off})}</div>${chips}</div>`;
  bsGoLast = bsGoHTML(B, ws); bsClkLast = bsClockHTML();
  const foot = B.ask ? bsAskHTML(B, ws) : `<div class="bsact">${bsGoLast}${b("cmdbtn", "CANCEL", "", {cmd: "bs:x", why: off})}</div>${b("cmdbtn bsall", "ALL SETTINGS", "every setting, on Brew Steps", {cmd: "bs:all", why: off})}`;
  return `<section class="bsbox" id="bs-box" aria-labelledby="bs-t"><h3 class="bst" id="bs-t">BrewStart</h3>${bsClkLast}${head}<div class="bsmid">${kind}${time}${half}${day}`
    + `<p class="bssay${ws && ws.past ? " past" : ""}" id="bs-say">${ws ? ws.text : ""}</p>${grain}${bsWater(B)}</div>`
    + `<div class="bsfoot"><p class="note">${st.notes.r || ""}</p>${foot}</div></section>`;
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
  const a = $("#bs-box .bsask");
  if (!a) return;
  a.scrollIntoView({block: "nearest"});
  const tabs = $(".tabs"), foot = tabs && getComputedStyle(tabs).position === "fixed" ? tabs.getBoundingClientRect().top - 8 : window.innerHeight;
  const r = a.getBoundingClientRect();
  if (r.bottom > foot) window.scrollBy(0, Math.ceil(r.bottom - foot));
}
/* ALL SETTINGS done: in CraftBeerPi, Brew Steps at BrewStart's settings, with a way back; the mockup says so, as its tabs
   do, the box closing */
function bsAllGo(B) {
  if (st.bs === B) { st.bsOpen = false; st.bs = null; }
  renderAll(); bsBack(B.neu && swSteps().bi < 0 ? "new" : "row");
  toast("Mockup: this opens Brew Steps at BrewStart's settings.");
}
/* the box as the brewer types, or as the clock moves on: its words, AM and PM, SET and the simulator's clock, in place,
   so the time box keeps its caret. The words are said aloud for the brewer's own changes (bsAnnounce) and once as a
   time passes, never as the minutes count down */
function bsPatch(ticked) {
  const B = st.bs, w = $("#bs-say"), go = $("#bs-box .bsgo");
  if (!B || !w) return;
  const ws = bsSays(B), text = ws ? ws.text : "", past = !!(ws && ws.past);
  if (w.textContent !== text) w.textContent = text;
  w.classList.toggle("past", past);
  document.querySelectorAll("#bs-box .bsap button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cmd === `bs:ap:${B.ap}`)));
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
  const r = bsParse(v, B.ap0);
  B.txt = v; B.m = r ? r.m : null;
  if (!CLOCK24) B.ap = r ? bsHalf(r.m) : B.ap0;
  bsUnbad();
  if (B.ask) { B.ask = false; renderAll(); }
  /* again once the browser has brought the caret into view, which it does after this, before the screen is drawn:
     where the time box and the sentence don't both fit, the sentence stays in view */
  bsPatch(); bsSayInView(); requestAnimationFrame(() => { if (st && st.bs === B) bsSayInView(); }); bsAnnounce(true);
}
/* the time box left (not just drawn again as the column changes): the next typing starts from the half then pressed,
   and a time that can't be read is said in the note line. In place, so a key or button just pressed keeps its press */
function bsLeft() {
  const B = st.bs;
  if (!B || document.activeElement && document.activeElement.id === "bstin") return;
  B.ap0 = null;
  if (CLOCK24 || B.m != null || !B.txt.trim()) return;
  st.notes.r = BS_BAD;
  const n = $("#bs-box .bsfoot .note");
  if (n) n.textContent = BS_BAD;
  clearTimeout(noteTimers.r);
  noteTimers.r = setTimeout(() => { if (st.notes.r === BS_BAD) { st.notes.r = ""; renderAll(); } }, 6000);
}
/* the sentence goes once the time can be read again, or as typing starts again */
function bsUnbad() {
  if (st.notes.r !== BS_BAD) return;
  st.notes.r = "";
  const n = $("#bs-box .bsfoot .note");
  if (n) n.textContent = "";
}
let bsSayT;
function bsAnnounce(later) {
  clearTimeout(bsSayT);
  const tell = () => { const ws = st.bs && bsSays(st.bs); if (ws) say(ws.text); };
  if (later) bsSayT = setTimeout(tell, 700); else tell();
}
/* opening the box: one box at a time in the column, so it closes NEXT STEP's, RESET's and UNLOAD's questions, the
   probes' panel, the pre-brew check's box and the strike water box's FORECAST and its small boxes (and, in the
   column's proposal, the recipe book and the opened timers); a timer's editor makes way with the timers on one screen,
   as for the pre-brew check's box. It starts from the step: its kind, time and day, and the grain's answer; a new
   BrewStart from Ready by with no time, its day by the noon rule. o: what a moment opens it with (rel: the day, 0 today
   or 1 tomorrow; at: a part of the box to show), or what the row and USE waiting for the grain open it with (focus
   "garage": on IN THE GARAGE; from "use": focus back on USE as the box closes) */
function bsOpen(o = {}) {
  const {S, bi} = swSteps(), neu = !!o.neu || bi < 0, s = neu ? null : S[bi], now = dayOf(st.t), d = s && s.date ? dayIdx(s.date) : null;
  Object.assign(st, {confirmNext: false, confirmReset: false, confirmUnload: false, pbOpen: false, cmpOpen: false, swOpen: false, swVol: null, swGrain: null, swRec: null, rbOpen: false, confirmLoad: null, tfOpen: false});
  const B = {neu, from: o.from || (neu ? "new" : "row"), kind: s && s.start ? "start" : "ready", day: d === now || d === now + 1 ? d : bsNoon(), where: s && bsGrainSaid(s) ? s.where : null, chip: null, fig: ""};
  ["kind", "where"].forEach(k => { if (o[k] !== undefined) B[k] = o[k]; });
  /* the time as the step keeps it, 24-hour, or as a moment opens the box with it (txt); shown as the box shows it, its
     half pressed. An empty box starts at AM */
  B.m = hmMin(o.txt !== undefined ? o.txt : s ? s.start || s.ready : "");
  Object.assign(B, {txt: bsShow(B.m), ap: B.m == null ? "AM" : bsHalf(B.m), ap0: null});
  if (o.rel != null) B.day = now + o.rel;
  if (B.where === "indoors") { const g = s && s.where === "indoors" ? s.grain : null; if (g == null || [64, 68, 72].includes(g)) B.chip = g ?? 68; else B.fig = g.toFixed(1); }
  B.init = bsSnap(B);
  st.bs = B; st.bsOpen = true;
  renderAll(); bsFocus(o.at, o.focus);
}
/* focus goes to the time box, or to IN THE GARAGE with the grain's two answers scrolled into view in the box's middle
   (for USE waiting for the grain, and for the row while its hint asks where the grain is); a moment can show the
   middle scrolled to a part of it (at). Opened at the time, the time in words is brought into view where it must be
   read before SET (bsSayInView). On a phone the page first brings the box itself into view (boxInView) */
let bsFocusCmd = null;
document.addEventListener("pointerdown", () => { bsFocusCmd = null; }, true);
const bsFocus = (at, on) => setTimeout(() => {
  const i = on === "garage" ? $('#bs-box [data-cmd="bs:where:garage"]') : $("#bstin"), keep = !!at || on === "garage";
  if (i && document.activeElement !== i) { i.focus({preventScroll: keep || PHONE.matches}); if (i.select) i.select(); }
  bsFocusCmd = i && i.dataset ? i.dataset.cmd || null : null;
  const y0 = window.scrollY, place = () => {
    boxInView($("#bs-box"));
    if (keep) $(at || "#bs-box .bswhere")?.scrollIntoView({block: "nearest"});
    else bsSayInView();
  };
  place();
  /* a font the box is the first to use comes in after it is drawn, and its lines wrap again, the box's height with them:
     brought into view again from where the page was, by its height then, as the screen does once the fonts are in */
  if (document.fonts && document.fonts.status === "loading") document.fonts.ready.then(() => { if (st.bsOpen) { window.scrollTo(0, y0); place(); } });
}, 0);
/* the time in words wholly in view in the box's middle, by the least scrolling ("nearest"), while it says something the
   brewer must read before SET: HEAT NOW's sentence, or that the time has passed. The time box above it stays in view
   wherever both fit; where they don't, the sentence wins, as the main button acts on it. The middle scrolls, not the
   page, except on a phone while its on-screen keyboard is up: it covers the page's foot without making the page
   shorter, so where the sentence is under it (below the visual viewport's foot), the page scrolls by the difference,
   the time box kept in view above it where both fit */
function bsSayInView() {
  const B = st.bs, ws = B && bsSays(B), m = $("#bs-box .bsmid"), w = $("#bs-say"), tb = $("#bs-box .bstime");
  if (!ws || !(ws.soon || ws.past) || !m || !w || !tb) return;
  if (m.scrollHeight > m.clientHeight) {
    const M = m.getBoundingClientRect(), W = w.getBoundingClientRect(), T = tb.getBoundingClientRect();
    let d = W.bottom > M.bottom ? W.bottom - M.bottom : W.top < M.top ? W.top - M.top : 0;
    /* the time box too where both fit, with room for its focus ring (the middle's 5 px) */
    const ring = W.bottom - T.top + 5 <= M.height ? 5 : 0;
    if (W.bottom - T.top <= M.height && T.top - d < M.top + ring) d = T.top - M.top - ring;
    if (d) m.scrollTop += d > 0 ? Math.ceil(d) : Math.floor(d);
  }
  const vv = window.visualViewport;
  /* the keyboard is up where the visual viewport is shorter than the window by more than a zoom explains */
  if (!vv || window.innerHeight - vv.height * vv.scale < 120) return;
  const W = w.getBoundingClientRect(), T = tb.getBoundingClientRect(), top = vv.offsetTop, foot = vv.offsetTop + vv.height - 8;
  if (W.bottom > foot) window.scrollBy(0, Math.ceil(Math.min(W.bottom - foot, Math.max(0, T.top - top - 8))));
}
window.visualViewport?.addEventListener("resize", () => { if (st.bsOpen && document.activeElement === $("#bstin")) bsSayInView(); });
/* focus goes back to where the box was opened from: BrewStart's row, + BrewStart, or the strike water box's USE */
const bsBack = from => setTimeout(() => document.querySelector(from === "use" ? "#recipe .sw .swuse" : `[data-cmd="bs:${from === "new" ? "new" : "open"}"]`)?.focus({preventScroll: true}), 0);
/* CANCEL and Escape close it, changing nothing; not while its command waits, which can't be called back */
function bsClose() {
  if (st.pend.bs || !st.bsOpen) return;
  const from = st.bs && st.bs.from;
  st.bsOpen = false; st.bs = null; renderAll();
  bsBack(from);
}
/* the box's keys: −1 H −15 +15 +1 H and AM and PM (below); the day; the kind (not while BrewStart runs); where the
   grain is, INDOORS starting at 68 °F; the chips. A change in the box takes ALL SETTINGS' question down. The row opens
   the box at the question its hint names: "where's the grain?" at the grain's two answers, else at the time. all: ALL
   SETTINGS, at once where the box has nothing not set yet, else its question; all-set, all-go and all-stay its answers */
function bsCmd(x, y) {
  if (x === "open" || x === "new") {
    if (st.bsOpen) return bsFocus();
    const {S, bi} = swSteps();
    return bsOpen({neu: x === "new", focus: x === "open" && bi >= 0 && bsRowAsks(S[bi]) === "grain" ? "garage" : undefined});
  }
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
    if (st.bs === B && !st.pend.bs) { B.then = null; renderAll(); }
    else if (!st.bsOpen && !st.pend.bs) bsAllGo(B);
    return;
  }
  B.ask = false;
  if (x === "step" || x === "ap") {
    /* the keys from the time, or from 7:00 AM while there is none, round the clock within the day, crossing noon and
       midnight with the half; AM and PM move the same time to that half (with none yet, the half the next typing is in) */
    const m = x === "ap" ? (B.m == null ? null : B.m % 720 + (y === "PM" ? 720 : 0)) : ((((B.m ?? 7 * 60) + parseInt(y, 10)) % 1440) + 1440) % 1440;
    Object.assign(B, {m, ap: m == null ? y : bsHalf(m), ap0: null}, m == null ? {} : {txt: bsShow(m)});
    if (m != null) bsUnbad();
  }
  else if (x === "day") B.day = dayOf(st.t) + parseInt(y, 10);
  else if (x === "kind") { B.kind = B.kind === "start" ? "ready" : "start"; }
  else if (x === "where") { B.where = y; if (y === "indoors" && B.chip == null && !B.fig) B.chip = 68; }
  else if (x === "chip") { B.chip = parseInt(y, 10); B.fig = ""; }
  renderAll();
  if (["step", "ap", "day", "kind"].includes(x)) { bsAnnounce(); bsSayInView(); }
}
/* SET: one command with what changed, its LOG line saying so; with nothing changed the box closes and nothing is sent.
   On the answer the step keeps the time, the day as a date (never Today or Tomorrow), the kind and the grain's answer;
   a new grain answer has CraftBeerPi work USE out again, as the strike water box's GRAIN does. While BrewStart waits it
   plans again at once (change_time): STARTS for the new time, and its notification in its words; HEAT NOW, a time too
   soon to wait for, has it start heating the HLT at once (bsHeat), and focus goes to LOG, the row being no longer a
   button. ADD BREWSTART puts a new BrewStart in as step 1 (bsAdd) */
function bsSet() {
  const B = st.bs, r = st.recipe;
  if (!B || st.pend.bs) return;
  const m = B.m, ws = bsSays(B);
  if (m == null) return note("r", bsBad());
  if (ws.past) return note("r", ws.text);
  let g = null;
  if (B.where === "indoors") {
    const v = B.chip != null ? B.chip : parseFloat(B.fig);
    if (!Number.isFinite(v) || v < 40 || v > 100) return note("r", "Indoors, the grain would be between 40 and 100 °F: check the figure.");
    g = Math.round(v * 10) / 10;
  }
  /* the step keeps the time 24-hour (hm); LOG says it by the clock's setting (said) */
  const hm = hhmm(m * 60), said = tod(m * 60), date = dateOf(B.day), kw = B.kind === "start" ? "start at" : "ready by";
  const grainSays = B.where === "garage" ? "grain in the garage, the boil kettle's probe" : B.where === "indoors" ? `grain indoors at ${g.toFixed(1)} °F` : "";
  if (B.neu) return send("bs", "add", `BrewStart added as step 1: ${kw} ${said} ${dMid(B.day)}${grainSays ? ` · ${grainSays}` : ""}`, () => bsAdd(B, hm, date, g));
  const {S, bi} = swSteps(), s = S[bi], was = s.start || s.ready, wasKind = s.start ? "start" : "ready";
  const timeCh = B.kind !== wasKind || hm !== was || date !== s.date;
  const grainCh = B.where != null && (B.where !== s.where || (B.where === "indoors" && !(s.grain != null && Math.abs(s.grain - g) < 0.05)));
  if (!timeCh && !grainCh) return bsClose();
  const wasT = was ? `, was ${B.kind === wasKind ? "" : `${wasKind === "start" ? "start at" : "ready by"} `}${todS(was)}${s.date ? ` ${dShort(dayIdx(s.date))}` : ""}` : "";
  const wasG = B.where === "garage" ? (s.grain == null ? "" : `, was ${s.where === "indoors" ? "indoors at " : ""}${swGrainSays(s.grain)}`) : s.grain == null ? ", was the boil kettle's probe" : `, was ${swGrainSays(s.grain)}`;
  const wasAt = bsAt(s);
  send("bs", "set", timeCh ? `BrewStart: ${kw} ${said} ${dMid(B.day)}${wasT}${grainCh ? ` · ${grainSays}` : ""}` : `BrewStart: ${grainSays}${wasG}`, () => {
    if (timeCh) Object.assign(s, {ready: B.kind === "ready" ? hm : null, start: B.kind === "start" ? hm : null, date});
    if (grainCh) Object.assign(s, {where: B.where, grain: B.where === "indoors" ? g : null});
    st.bsOpen = false; st.bs = null;
    if (grainCh && st.sw) swRework("grain");
    /* Start at while BrewStart heats or holds the water: its heating stops, the HLT's AUTO off, and it waits for its
       time, as BrewStart's change_settings does */
    if (timeCh && r.bsHeat && RECIPE.steps[r.cur] === s && B.kind === "start" && wasKind !== "start") {
      if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
      r.bsHeat = null; r.wait = `STARTS ${tod(bsHeatAt(s, st.v.hlt.pv))}`;
      soon(() => logEvent(`BrewStart: BrewStart's heating stopped: the HLT's AUTO is off. Brew start scheduled for ${bsFmt(bsAt(s))}`, "from CraftBeerPi", ""));
    } else if (timeCh && RECIPE.steps[r.cur] === s && bsWaits()) {
      const pv = st.v.hlt.pv;
      if (ws.soon) {
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
/* ADD BREWSTART's answer: BrewStart in as step 1, on the HLT with its element, heating the recipe's water to the strike
   water step's temperature, or without one the first mash step's (bsNewTemp); with Ready by it is then the strike
   water step itself (swSteps). Every step after it moves down one. Its water, and the grain's answer, are numbers USE
   is worked out from, so CraftBeerPi works it out again */
function bsAdd(B, hm, date, g) {
  RECIPE.steps.unshift({n: "BrewStart", type: "BrewStart", k: "hlt", ready: B.kind === "ready" ? hm : null, start: B.kind === "start" ? hm : null,
    date, temp: bsNewTemp(), vol: SW_NEED, watts: SW_WATTS, where: B.where, grain: B.where === "indoors" ? g : null});
  st.bsOpen = false; st.bs = null;
  if (st.sw) swRework(Math.abs(SW_NEED - (st.sw.vol ?? 0)) >= 0.05 ? "vol" : "grain");
  if (B.then === "all") return bsAllGo(B);
  bsBack("row");
}
/* ---------- the mash water on the MashIn row (STRIKE-WATER.md, "The mash water on the MashIn row") ----------
   The recipe's mash water, the strike water that goes to the mash tun, is on Brew Day whenever a recipe is loaded,
   whether or not the strike water box is: in the line of MashIn on the mash tun, "126 °F · mash water 8.26 gal · 1.5
   qt/lb", or "mash water not given" in Note Amber. Until the malt is in, that row opens a small box (mwHTML) with MASH
   WATER (and its ratio), GRAIN WEIGHT and HLT WATER and the sparge water they leave, each changed through the strike
   water box's own small boxes, with the same rules and refusals; once the malt is in, the line stays and the row no
   longer opens. MashIn is the first step on the mash tun */
const mwIdx = () => swSteps().mi;
const mwShows = i => !!(st.recipe && st.sw && i >= 0 && i === mwIdx());
const mwMaltIn = () => { const r = st.recipe; return !r || !!r.held || r.cur > mwIdx(); };
const mwOpens = i => mwShows(i) && !mwMaltIn();
/* the row's words for it: the figure and its ratio, never split from their units */
function mwSays() {
  const R = swIn().R, w = R.strike_vol ?? null;
  if (w == null) return '<span class="amb">mash water not given</span>';
  const q = swRatio(R);
  return `mash water ${volText(w, "gal")}${q != null ? `&nbsp;· ${ratioText(q, "F")}` : ""}`;
}
/* the row, and the box's buttons, wait with the recipe's own commands and pause with no connection; a tap says why */
function mwWhy() {
  const P = st.pend;
  if (st.link === "lost") return PAUSED;
  return ["swr", "swv", "bs", "r:start", "r:stop", "r:next", "r:reset", "r:unload", "r:load", "r:check"].some(k => P[k]) ? WAIT : "";
}
/* the row as a button, as BrewStart's is: the row as it was, with a small hint under its state, "give it" in Note
   Amber while the mash water isn't given, else "change"; its label says the same in words */
function mwRowHTML(s, i, state, p, right, nt, bar) {
  const R = swIn().R, missing = (R.strike_vol ?? null) == null, why = mwWhy();
  const hint = missing ? '<small class="bsh amb">give it</small>' : '<small class="bsh">change</small>';
  const said = `${s.n}${s.temp != null ? `, ${stepTemp(s)} °F` : ""}: mash water ${missing ? "not given" : swMashText(R).replace(/\u00a0/g, " ")}. ${missing ? "Give it" : "Change it"}, with the grain weight and the HLT water`;
  const note = nt ? `<span class="p pn${state === "cur" && st.banner && st.banner.title === s.n ? " asked" : ""}">${esc(nt)}</span>` : "";
  return `<li class="stepb"><button type="button" class="step mwrow"${state === "cur" ? ' aria-current="step"' : ""} data-cmd="mw:open" aria-label="${esc(said)}" aria-expanded="${!!st.mwOpen}"${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ""}><span class="n">${i + 1}</span><span class="t">${esc(s.n)}</span><span class="p">${p}</span>${note}<span class="s">${right}${hint}</span>${bar}</button></li>`;
}
/* the box: MASH WATER, GRAIN WEIGHT and HLT WATER, each in plain words with its figure, where it comes from and CHANGE
   (GIVE IT while it isn't given), then the sparge water they leave and anything they would do that they shouldn't. A
   figure BeerSmith gave changes only where CraftBeerPi keeps BeerSmith's beside it; else it says where to change it.
   A small box opened from here takes the box's place, under its heading */
function mwHTML() {
  const N = swNumbers(), R = N.R, s = RECIPE.steps[mwIdx()], locked = mwMaltIn(), why = mwWhy();
  const wrap = inner => `<section class="bsbox mwbox" id="mw-box" aria-labelledby="mw-h"><h3 class="bst" id="mw-h">${esc(s ? s.n : "MashIn")}: the mash water</h3>${inner}</section><p class="note">${esc(st.notes.r || "")}</p>`;
  if (st.swRec && st.swRec.at === "row") return wrap(swRecHTML(N));
  if (st.swVol && st.swVol.at === "row") return wrap(swVolHTML(N));
  const typed = k => N.recTyped.includes(k);
  const from = k => typed(k) ? "given here for this recipe" : k === "grain" && R.grain_from === "step" ? `${esc(N.mashName)}'s own, on Brew Steps` : "BeerSmith's";
  const can = (k, v) => !locked && (v == null || typed(k) || (k === "grain" && R.grain_from === "step"));
  const btn = (k, v, cmd, name) => can(k, v) ? b("cmdbtn", v == null ? "GIVE IT" : "CHANGE", "", {cmd, why, label: `${v == null ? "Give" : "Change"} the ${name}`}) : "";
  const w = R.strike_vol ?? null, g = R.grain ?? null, qw = ratioWarning(swRatio(R), "F");
  const wSays = w == null ? '<span class="amb">Not given yet.</span>' : `${swMashText(R)}, ${from("water")}.${!can("water", w) && !locked ? " Import the recipe's BeerSmith file again with UPDATE to change it." : ""}`;
  const gSays = g == null ? '<span class="amb">Not given yet.</span>' : `${massText(g, "lb")}, ${from("grain")}.`;
  const hSays = N.vol == null ? '<span class="amb">Not given yet.</span>' : `${volText(N.vol, "gal")}${swSteps().bi >= 0 ? ", BrewStart's water volume" : ", given here"}.`;
  const row = (label, says, text, button) => `<div class="swyou"><p><b>${label}</b>, ${says}: ${text}</p>${button}</div>`;
  const sparge = N.vol != null && w != null ? `<p class="swn swsp">${spargeText(N.vol, w, "gal")}.</p>` : "";
  return wrap(row(MASH_WATER.label, MASH_WATER.says, wSays, btn("water", w, "mw:water", "mash water"))
    + (qw ? `<p class="vover">${qw}</p>` : "")
    + row(SW_REC.grain.btn, "all the grain in the mash", gSays, btn("grain", g, "mw:grain", "grain weight"))
    + row(HLT_WATER.label, HLT_WATER.says, hSays, locked ? "" : b("cmdbtn", N.vol == null ? "GIVE IT" : "CHANGE", "", {cmd: "mw:hlt", why, label: `${N.vol == null ? "Give" : "Change"} the HLT water`}))
    + sparge + swLowHTML(N)
    + (locked ? `<p class="swn">The malt is in, so these don't change now.</p>` : "")
    + `<div class="swa one">${b("cmdbtn", "CLOSE", "the mash water", {cmd: "mw:x"})}</div>`);
}
function mwCmd(x) {
  if (x === "open") {
    if (st.mwOpen) return mwClose();
    if (!mwOpens(mwIdx())) return;
    Object.assign(st, {mwOpen: true, bsOpen: false, bs: null, swOpen: false, swVol: null, swGrain: null, swRec: null, pbOpen: false, cmpOpen: false,
      rbOpen: false, confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null});
    renderAll();
    return mwFocus();
  }
  if (x === "x") return mwClose();
  if (!st.mwOpen || mwMaltIn()) return;
  if (x === "water" || x === "grain") return swRec("open", x, "row");
  if (x === "hlt") return swVol("open", "row");
}
function mwClose() {
  st.mwOpen = false;
  if (st.swRec && st.swRec.at === "row") st.swRec = null;
  if (st.swVol && st.swVol.at === "row") st.swVol = null;
  renderAll();
  const r = $("#recipe .step.mwrow");
  if (r) r.focus();
}
/* focus on the box's first button as it opens, or as a small box in it closes */
const mwFocus = () => setTimeout(() => { const f = $("#mw-box [data-cmd^=\"mw:\"]"); if (f) f.focus(); }, 0);
function stepHTML(s, i) {
  const r = st.recipe, state = i < r.cur ? "done" : i === r.cur ? "cur" : "", live = bsLive(i), tm = s.start || s.ready;
  /* BrewStart's row as the way to its box says its day too, or that no time is set; heating or finished, it stays as it
     was, and holding the water for the move it drops the ready time, which has come. The details line never splits a
     figure from its unit, or a time from its AM or PM and its day ("ready by" can end a line, as a narrow column
     beside STARTS or HEATING needs), and each "·" stays with what comes before it, so a line can end with one but never
     start with one */
  const held = state === "cur" && s.type === "BrewStart" && r.wait === WFY && bsStrike();
  const when = live ? (tm ? `${s.start ? "start at" : "ready by"} ${todS(tm)}${s.date ? `&nbsp;${dShort(dayIdx(s.date))}` : ""}` : '<span class="amb">no time set</span>') : held ? "" : s.ready ? `ready&nbsp;by ${todS(s.ready)}` : s.start ? `start&nbsp;at ${todS(s.start)}` : "";
  const p = [s.temp != null ? `${stepTemp(s)}&nbsp;°F` : "", s.min ? `${s.min}&nbsp;min` : "", when, s.vol != null ? `${+s.vol.toFixed(2)}&nbsp;gal` : "", mwShows(i) ? mwSays() : ""].filter(Boolean).join("&nbsp;· ");
  const right = state === "done" ? "✓ DONE" : state === "cur" ? (r.state === "running" ? (r.wait ? waitHTML(r.wait) : s.min ? `<span id="r-left">${mmss(r.left)}</span> LEFT` : runWord(s)) : r.state === "ready" ? (r.wait ? waitHTML(r.wait) : "READY") : "STOPPED") : '<i class="todo" aria-hidden="true"></i><span class="sr">to come</span>';
  if (bsOpens(i)) return bsRowHTML(s, i, state, p, right, state === "cur" && s.type === "BrewStart" && r.bsHeat === "holding" ? bsHoldWords(s.temp, KNAME.mt) : "");
  const pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) : 0;
  const bar = state === "cur" && s.min ? `<span class="bar"><i id="r-bar" style="width:${pct}%"></i></span>` : "";
  const adds = s.adds ? `<span class="adds">${s.adds.map((a, j) => addHTML(a, j, state)).join("")}</span>` : "";
  /* BrewStart holding the strike water has its question as its note line, as the strike water step's note shows it */
  const nt = s.note || (state === "cur" && s.type === "BrewStart" && r.bsHeat === "holding" ? bsHoldWords(s.temp, KNAME.mt) : "");
  if (mwOpens(i)) return mwRowHTML(s, i, state, p, right, nt, bar);
  return `<li class="step${state === "done" ? " done" : ""}"${state === "cur" ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="t">${s.n}</span>${p ? `<span class="p">${p}</span>` : ""}${nt ? `<span class="p pn${state === "cur" && st.banner && st.banner.title === s.n ? " asked" : ""}">${nt}</span>` : ""}<span class="s">${right}</span>${bar}${adds}</li>`;
}
function addHTML(a, j, state) {
  const s = state === "done" ? "done" : state === "cur" ? (st.recipe.adds[j] || "") : "";
  const c = s === "due" ? "due" : s === "done" ? "gone" : "";
  return `<span class="${c}">${s === "done" ? "✓ " : ""}${a[0]} min</span><span class="${c}">${a[1]}${s === "due" ? " · add now" : ""}</span><span class="${c}">${a[2]}</span>`;
}
function handHTML() {
  const t = st.timer, pt = st.pend.tm, off = st.link === "lost" ? PAUSED : "";
  /* RECIPE-COLUMN.md's whole proposal (?col=new): brewing by hand the timers have the column, and the recipe book folds
     behind CHOOSE A RECIPE, beside COMPARE PROBES; it opens in that place, as OTHER RECIPE's does on a recipe not begun.
     RECIPE BOOK and BREW STEPS are the screen's own tabs, so they aren't repeated here. By default, and with the timers
     out of the column on one screen, the column keeps the recipe book as built */
  if (FOLD && tHere() === "col") return `<h2>No recipe running</h2>
    <p class="rmeta">Brewing by hand. Kettles and pumps work as usual.</p>
    ${timersHTML()}
    ${st.rbOpen ? rbHTML() : st.cmpOpen ? cmpHTML(true) : `<div class="nbrow">${b("cmdbtn", "CHOOSE A RECIPE", "from the recipe book", {cmd: "rb:open", why: off})}${cmpHTML(true)}</div>`}
    <p class="note">${st.notes.r || ""}</p>`;
  return `<h2>No recipe running</h2>
    <p class="rmeta">Brewing by hand. Kettles and pumps work as usual.</p>
    ${TIMERS === "new" ? timersHTML() : `<section class="timer" aria-labelledby="tm-h"><h3 id="tm-h">Rest timer</h3>
      <output id="tm-out">${mmss(t.left)}</output>
      <div>${b("cmdbtn", "−5 MIN", "", {cmd: "tm:-300", why: off})}${b("cmdbtn", "+5 MIN", "", {cmd: "tm:300", why: off})}${b("cmdbtn go", pt ? (pt === "start" ? "STARTING…" : "PAUSING…") : t.running ? "PAUSE TIMER" : "START TIMER", t.running ? "counting down on every screen" : "alarm at zero, on every screen", {cmd: "tm:go", why: off || (pt ? WAIT : "")})}</div>
    </section>`}
    ${st.confirmLoad != null ? loadAskHTML() : `<section class="book" aria-labelledby="bk-h"><h3 id="bk-h">Recipe book</h3><ul>${BOOK.map((x, i) => `<li><span class="bn">${x.n}</span><span class="bd">${x.d}</span>${b("cmdbtn", "LOAD", "", {cmd: "load:" + i, why: off})}</li>`).join("")}</ul></section>`}
    ${st.cmpOpen ? cmpHTML(true) : `<div class="handlinks">${b("cmdbtn", "RECIPE BOOK", "all recipes", {cmd: "tab:Recipe Book"})}${b("cmdbtn", "BREW STEPS", "build or edit steps", {cmd: "tab:Brew Steps"})}${cmpHTML(true)}</div>`}
    <p class="note">${st.notes.r || ""}</p>`;
}
/* the versions, the recipe column's last line (VERSIONS): the quietest words on the screen, in the bottom left corner on
   a monitor and at the end of the page on a phone. The web UI's, with when it was built, then CraftBeerPi's. Each keeps
   whole; where the column is narrow the two go on two lines. Live, before CraftBeerPi has answered, the web UI's alone */
function verHTML() {
  const v = VERSIONS;
  if (!v) return "";
  return `<p class="ver"><span>Web UI ${v.ui}${v.built ? `, built ${v.built}` : ""}</span>${v.cbpi ? `<span>CraftBeerPi ${v.cbpi}</span>` : ""}</p>`;
}
function nowHTML() {
  const r = st.recipe;
  if (!r) return `<span class="n">–</span><b>No recipe running</b><span class="p">Brewing by hand · ${TIMERS === "new" ? "timers" : "rest timer"} below</span>${tmlHTML()}`;
  const s = RECIPE.steps[r.cur], pct = s.min ? Math.round(100 * (1 - r.left / (s.min * 60))) : 0;
  const p = [s.temp != null ? `${stepTemp(s)} °F` : "", s.min ? `${s.min} min` : "", `step ${r.cur + 1} of ${RECIPE.steps.length}`].filter(Boolean).join(" · ");
  const nx = RECIPE.steps[r.cur + 1];
  const nxt = nx ? `<span class="nx">Next: ${nx.n}${nx.temp != null ? ` · ${stepTemp(nx)} °F` : ""}${nx.min ? ` · ${nx.min} min` : ""}</span>` : `<span class="nx">Last step</span>`;
  return `<span class="n">${r.cur + 1}</span><b>${s.n}</b><span class="p">${p}</span><span class="left">${r.state === "running" ? (r.wait ? waitLow(r.wait) : s.min ? `<span id="now-left">${mmss(r.left)}</span> left` : runWord(s).toLowerCase()) : r.state === "ready" ? (r.wait ? waitLow(r.wait) : "ready") : "stopped"}</span>  ${s.min ? `<span class="bar"><i id="now-bar" style="width:${pct}%"></i></span>` : ""}${nxt}${tmlHTML()}`;
}
/* a running step whose timer hasn't started says what it waits for: HEATING, or WAITING FOR YOU (in the brighter amber
   screen.js uses) while CraftBeerPi's question under the step's name is up; waiting BrewStart, STARTS and its time,
   which in 12-hour can go under the word (bsFit). A SpargeStep's temperature is the HLT's water, not the mash, so it
   says so; once started with no timer it is SPARGING rather than NOW */
const waitHTML = w => w === true ? "HEATING" : w === WFY ? `<span class="wfy">${w}</span>` : !CLOCK24 && typeof w === "string" && w.startsWith("STARTS ") ? `STARTS <span class="wt">${w.slice(7)}</span>` : w;
/* the same in the phone's now line, in lower case, a time in it keeping its AM or PM: "starts 5:53 AM" */
const waitLow = w => typeof w === "string" && w.startsWith("STARTS ") ? `starts ${w.slice(7)}` : waitHTML(w).toLowerCase();
const stepTemp = s => (s.type === "SpargeStep" ? "water " : "") + s.temp;
const runWord = s => s.type === "SpargeStep" ? "SPARGING" : "NOW";

/* ---------- alarms, last event, rig ---------- */
function bannerHTML() {
  const x = st.banner;
  if (!x) return `${ICON.ok}<span class="msg">No alarms</span>`;
  /* several answers, as screen.js shows them (acts). A timer's alarm (?timers=new) has one, OK. Its own command is
     pending, not the banner's */
  const acts = x.acts || (x.act ? [{label: x.act, cmd: x.cmd, hold: x.hold}] : []), busy = x.timer != null ? st.pend["t:" + x.timer] : st.pend.b;
  /* an answer that switches heat on (START THE BOIL) takes a held press, as START does, and says so under it. A reminder
     BrewScribe takes a pH for has OK and RECORD pH (phActsHTML) */
  const ph = phOffer(x), act = ph ? phActsHTML(x, ph) : acts.map(y => b(y.sec ? "act sec" : "act", busy && (acts.length === 1 || busy === y.dir || busy === y.cmd) ? "SENDING…" : y.label, y.hold && !busy ? "hold to start" : "", {cmd: y.cmd, why: busy ? WAIT : "", hold: y.hold})).join("");
  /* the title in capitals, but a unit's own spelling kept: "CHECK MASH pH" */
  return `${x.tone === "prompt" ? ICON.bell : ICON.warn}<span class="msg"><b>${esc(x.title).replace(/\bpH\b/g, '<span class="nc">pH</span>')}${x.more ? ` · ${x.more} more waiting` : ""}</b>${x.text.replace("{age}", `<span id="ban-age">${st.age}</span>`)}</span>${act}`;
}
function eventHTML() {
  /* each line keeps its time as CraftBeerPi does, 24-hour, and shows it by the clock's setting */
  const e = st.events[0], row = e => `<time>${logDate(e)}${todS(e[0])}</time>${esc(e[1])} · <span class="res ${e[3]}">${e[2]}</span>${e[4] ? ` · <span class="res">${esc(e[4])}</span>` : ""}`;
  /* ?tplace=event: the timers between the line and LOG (tevHTML). The line is shorter there, so its parts are kept apart
     and brew-day.css cuts what was done first, keeping the time and "confirmed" or "failed" in view */
  const tev = tHere() === "event" ? tevHTML() : "";
  const line = !tev ? row(e) : `<time>${logDate(e)}${todS(e[0])}</time><span class="wh">${esc(e[1])}</span><span class="rs"> · <span class="res ${e[3]}">${e[2]}</span></span>${e[4] ? `<span class="cv"> · <span class="res">${esc(e[4])}</span></span>` : ""}`;
  return `<span class="line">${line}</span>${tev}<button type="button" class="logbtn" data-cmd="log" aria-expanded="${!!st.logOpen}" aria-controls="log">LOG</button>${st.logOpen ? `<ol class="log" id="log" aria-label="Recent events">${st.events.slice(0, 8).map(e => `<li>${row(e)}</li>`).join("")}</ol>` : ""}${tev ? tpnoteHTML() : ""}`;
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
/* a step's status as CraftBeerPi reports it: D done, A active, S stopped, I waiting (a boil held for "Ready to boil?" is I).
   With no recipe running, CraftBeerPi still has the finished one's steps, all D, until a recipe is loaded or reset
   (finished: #finished, #notarget); otherwise it has none */
function stepStatus(i) {
  const r = st.recipe;
  if (!r) return st.finished ? "D" : "I";
  return i < r.cur ? "D" : i > r.cur ? "I" : r.state === "running" ? "A" : r.state === "stopped" ? "S" : "I";
}
/* the runoff step's index while the wort should be on its way to the boil kettle, else -1 */
function runoffStep() {
  const S = RECIPE.steps;
  if (!st.recipe) return -1;
  const ro = S.findIndex(s => collectsWort(s)), bo = S.findIndex((s, i) => i > ro && s.boil);
  return ro >= 0 && stepStatus(ro) !== "I" && (bo < 0 || stepStatus(bo) === "I") ? ro : -1;
}
/* the boil has started (its step is running, stopped or done; held for "Ready to boil?" it is still I). From then on the
   wort pump's hoses are on the boil kettle: the brewer moves them in that hold, as CraftBeerPi's notification says ("The
   wort pump is off, so you can move its hoses"). After the recipe finishes its steps are all D, so the hoses stay there
   for the chill and the transfer, until a recipe is loaded or reset and its boil is I again */
function boilStarted() {
  const bo = RECIPE.steps.findIndex(s => s.boil);
  return bo >= 0 && stepStatus(bo) !== "I";
}
function rigDesc(ro, held, setNow, post) {
  const spLine = !!$("#ln-sparge"), head = "Hot liquor tank, mash tun and boil kettle. ";
  if (post) {
    /* with no recipe running, it has finished (boilStarted) */
    return head + (st.recipe ? "The boil has started, so the wort pump's hoses are on the boil kettle. " : "The recipe has finished, and the wort pump's hoses are still on the boil kettle, where they went for the boil. ")
      + (WP === "swirl" ? "The wort pump is still drawn by the mash tun; while it runs, the wort turns in the boil kettle. "
        : `The wort pump is drawn under the boil kettle: it takes wort from the bottom of the kettle and sends it${WP === "chill" ? " through the chiller and" : ""} back in at the top. `)
      + "The mash tun and the HERMS coil are out of use. The HLT pump circulates hot water around the hot liquor tank. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating.";
  }
  if (ro < 0 || held) return head + "The HLT pump circulates hot water around the hot liquor tank. The wort pump moves wort from the mash tun, through the coil inside the hot liquor tank, and back into the mash tun. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating, with the line to the boil kettle"
    + (spLine ? " and the sparge line into the coil" : "") + " closed."
    + (setNow ? ` Step ${ro + 1}, ${RECIPE.steps[ro].n}, is waiting for you to set them for the sparge: close the wort pump's line to the coil${spLine ? " and the HLT return" : ""}, and open the line to the boil kettle${spLine ? " and the sparge line into the coil" : ""}.` : "");
  return head + (spLine ? "The HLT pump sends hot water through the coil inside the hot liquor tank, flushing the wort out of it, and on into the top of the mash tun for the sparge. " : "The HLT pump circulates hot water around the hot liquor tank. ")
    + `The wort pump moves wort from the mash tun down and across to the boil kettle. The valves are set by hand and CraftBeerPi can't see them: they are shown as step ${ro + 1}, ${RECIPE.steps[ro].n}, needs them.`;
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
  [["hlt", "hltPump"], ["wort", "wortPump"], ["wort-bk", "wortPump"]].forEach(([id, k]) => {
    const p = a[k], word = $(`#pump-${id} .p-st`);
    if (!word) return;
    on("#pump-" + id, live && p.on);
    word.textContent = (live ? "" : "LAST: ") + (p.on ? "RUNNING" : "OFF");
    $(`#pump-${id} .p-ovr`).textContent = ACT[k].override && !p.on ? "UNLESS OVERRIDE SWITCH IS ON" : "";
  });
  /* layout A's drawing has no sparge line: its HLT pump always goes back round the hot liquor tank. A SpargeStep keeps
     the valves on recirculating until "Sparge started" (or its countdown): the HLT is still heating the water, and the
     wort pump is off. While its "Sparge started" question waits, the valves to change are marked */
  const ro = runoffStep(), r = st.recipe, held = ro >= 0 && RECIPE.steps[ro].type === "SpargeStep" && r.cur === ro && !r.started;
  const setNow = held && r.wait === WFY && live, hasSp = !!$("#ln-sparge");
  const out = ro >= 0 && !held, sp = out && hasSp;
  /* after the boil starts, the wort pump serves the boil kettle (?wp=chill, the default, draws it there, on a short
     loop through the chiller), so nothing on the mash tun's side lights. The valves are drawn for recirculating, as
     before the boil, so a running HLT pump (the HLT's stirrer too) still goes round the hot liquor tank. The hoses stay
     on the boil kettle until a recipe is loaded or reset, or the mash tun's AUTO is on: its HERMS runs the wort pump
     through the coil, so then the hoses are back on the mash tun (#notarget) */
  const post = WP !== "today" && LAYOUT === "b" && boilStarted() && st.v.mt.mode !== "auto";
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
  on("#ln-bk-loop", wp && post); on("#ln-swirl", wp && post);
  if ($("#pump-wort-bk")) ["#pump-wort-bk", "#ln-bk-loop", "#chiller"].forEach(s => { const n = $(s); if (n) n.classList.toggle("gone", !post); });
  $("#pump-wort").classList.toggle("gone", post && !!$("#pump-wort-bk"));
  /* swirl: the pump stays, and its name says where its hoses go, as a drawing's off-page connector does. On its own line
     (the third) it would sit on the runoff's pipe along the bottom */
  const wn = $("#pump-wort .p-name"), wName = post && WP === "swirl" ? "WORT PUMP → BOIL KETTLE" : "WORT PUMP";
  if (wn && wn.textContent !== wName) wn.textContent = wName;
  on("#ln-hlt-in", hp); on("#ln-hlt-up", hp); on("#ln-hlt-ret", hp && !sp); on("#ln-sparge", hp && sp);
  setValve("coil", !out, mtw, setNow); setValve("bk", out, mtw, setNow); setValve("ret", !sp, hp, setNow && hasSp); setValve("sp", sp, hp, setNow);
  const vn = $("#vnote-2");
  vn.textContent = setNow ? `SET THEM FOR STEP ${ro + 1} (${RECIPE.steps[ro].n.toUpperCase()})` : out ? `SHOWN FOR STEP ${ro + 1} (${RECIPE.steps[ro].n.toUpperCase()})` : "SHOWN FOR RECIRCULATING";
  vn.classList.toggle("set", setNow);
  $("#rig-d").textContent = rigDesc(ro, held, setNow, post) + slayerDesc() + lvDesc();
  renderSlayer(live);
  renderLevels();
  on("#el-hlt", live && a.hltEl.on); on("#el-bk", live && a.bkEl.on);
  ["hlt", "mt", "bk"].forEach(v => { const n = $("#needle-" + v); if (n) n.setAttribute("transform", `rotate(${needleAngle(st.v[v].pv).toFixed(1)})`); });
}
/* the Steam Slayer's moments just after the boil (#ss-after, #ss-cool): the boil over at 5:00:04 PM, Whirlpool Hop
   asking to cool to 170 °F since 5:00:06, the boil kettle's AUTO off with the step's end and the wort cooling. ask: the
   wort is below the lid's 203 °F (since 5:01:22), so the turn-off reminder is up, waiting behind Whirlpool Hop's
   question, the older one, as the title bar shows them in turn */
function ssPostBoil(t, pv, ask) {
  const s = Object.assign(SCENES.hold(), {slayer: "hand", lidDone: true, t, base: "hold", offWait: ask});
  s.v.bk = {pv, sv: null, mode: "manual"};
  s.a.bkEl = {on: false, pct: 0};
  s.recipe = {state: "running", cur: 5, left: 0, adds: []};
  s.banner = {tone: "prompt", title: RECIPE.steps[5].n, text: RECIPE.steps[5].note, act: "NEXT STEP", cmd: "b:done", more: ask ? 1 : 0};
  s.events = s.events.filter(e => e[0] <= "17:00:04");
  s.events.unshift(["17:00:06", `${RECIPE.steps[5].n}: ${RECIPE.steps[5].note}`, "waiting for you", "wait"]);
  if (ask) s.events.unshift(["17:01:22", `${OFF_Q.title}: ${OFF_Q.text}`, "waiting for you", "wait"]);
  return s;
}
/* a line into LOG's events (newest first) in its place by time */
function ssEv(s, e) {
  const i = s.events.findIndex(x => x[0] < e[0]);
  s.events.splice(i < 0 ? s.events.length : i, 0, e);
}
/* the boil kettle's steam condenser on its lid (STEAM-SLAYER.md): none (as today), "hand" (its mister set by hand) or
   "switched" (CraftBeerPi switches its mister, the actor in steps_boil_actor). The Hardware page would set it on the
   boil kettle; in the mockup a moment's slayer, or ?slayer=hand or ?slayer=switched */
const slayer = () => (st && st.slayer) || (["hand", "switched"].includes(QS.get("slayer")) ? QS.get("slayer") : "");
/* the lid reminder up in the title bar: the boil step's LidAlert, its words the steps_boil_lid_alert setting */
const LID_Q = {title: "Turn on the Steam Slayer mister", text: "Reached temp close to boiling"};
const lidAsk = () => !!(st.banner && st.banner.lid);
/* after the boil the condenser stays on until the wort falls back below the lid reminder's own temperature (BoilStep's
   lid_temp, 203 °F or 95 °C), so on and off follow one figure. Only once the boil step has ended: a sag below it during
   the boil (low boil power, a hop addition) changes nothing. Set by hand, CraftBeerPi then asks, once a brew, for the
   mister to be turned off (OFF_Q); offWait: that reminder is up, shown or waiting behind another question */
const SS_LID_F = 203;
const OFF_Q = {title: "Turn off the Steam Slayer mister", text: `The boil is over and the wort is below ${SS_LID_F} °F`};
const offBanner = () => ({tone: "prompt", lidOff: true, title: OFF_Q.title, text: OFF_Q.text, act: "DONE", cmd: "b:lidoff"});
const offAsk = () => !!st.offWait;
/* the mister as the drawing shows it. Set by hand, CraftBeerPi can't see it, so it is drawn as the brew needs it, as the
   hand valves are: open once the lid reminder is answered, through the boil and after it, until the reminder to turn it
   off is answered; closed before. Switched, it is the actor's own state, as a pump's is (a solenoid on steps_boil_actor
   would follow the same rule, the core switching it off at the cut-off rather than as the boil step ends) */
function misterOn() {
  if (slayer() === "switched") return !!(st.mister && st.mister.on);
  const bo = RECIPE.steps.findIndex(s => s.boil);
  if (bo < 0 || !st.lidDone) return false;
  const bs = stepStatus(bo);
  return bs === "A" || bs === "S" || (bs === "D" && !st.ssOff);
}
function renderSlayer(live) {
  const ss = slayer(), g = $("#slayer");
  if (!ss || !g) return;
  const on = misterOn(), ask = lidAsk() && live, off = offAsk() && live, hand = ss === "hand";
  const mark = hand && ((ask && !on) || (off && on));
  /* set by hand, open: its water and spray in the liquor's blue, still, as the brew needs them, with no moving dashes
     or arrows, so nothing says CraftBeerPi sees it flowing. Switched and on: lit as a running pump's line, its dashes
     moving */
  g.classList.toggle("on", on);
  g.classList.toggle("need", hand && on);
  g.classList.toggle("lit", !hand && on && live);
  $("#vl-mist").classList.toggle("shut", !on);
  $("#vl-mist").classList.toggle("set", mark);
  $("#ln-mist").classList.toggle("on", !hand && on && live);
  $("#ln-mist").classList.toggle("need", hand && on);
  /* set by hand its tag is a hand valve's (CLOSED, SET OPEN, OPEN, SET CLOSED), under VALVES ARE SET BY HAND; switched,
     the actor's state, as a pump's */
  const t = $("#ss-st");
  t.textContent = hand ? (ask && !on ? "SET OPEN" : off && on ? "SET CLOSED" : on ? "OPEN" : "CLOSED") : `${live ? "" : "LAST: "}${on ? "ON" : "OFF"}`;
  t.classList.toggle("set", mark);
  t.classList.toggle("run", !hand && on && live);
  /* the lid: asked, not ordered, as it may be on already */
  $("#ss-lid").classList.toggle("set", ask);
  $("#ss-lidt").textContent = ask ? "LID ON?" : "";
  $("#ss-lidt").classList.toggle("set", ask);
}
/* the drawing's words for the condenser, for a screen reader */
function slayerDesc() {
  const ss = slayer();
  if (!ss) return "";
  const on = misterOn(), ask = lidAsk(), off = offAsk();
  if (ss === "switched") return ` A Steam Slayer on the boil kettle's lid condenses its steam; CraftBeerPi switches its mister's valve, which is ${on ? "on" : "off"}.${ask ? " The lid reminder is waiting: check the lid is on." : ""}`;
  return ` A Steam Slayer on the boil kettle's lid condenses its steam. Its mister's valve is set by hand, like the others, and CraftBeerPi can't see it: ${ask && !on ? "the lid reminder is waiting for you to open it, with the lid on." : off && on ? `the boil is over and the wort is below ${SS_LID_F} °F, and the reminder to close it is waiting.` : on ? `it is shown open, as the brew needs it until the wort falls below ${SS_LID_F} °F after the boil.` : "it is shown closed."}`;
}
/* on a phone, which has no drawing, the boil kettle's faceplate says what the drawing shows, in one quiet line under
   its own, whenever the kettle has the condenser, so nothing under a hand moves as the mister comes on */
function slayerLine() {
  const ss = slayer();
  if (!ss) return "";
  /* set by hand, a valve's words, as the drawing's; switched, the actor's */
  if (ss === "hand") return `Steam Slayer: mister ${misterOn() ? "open" : "closed"} · set by hand`;
  return `Steam Slayer: mister ${st.link === "lost" ? "last " : ""}${misterOn() ? "on" : "off"}`;
}
/* the liquid in each vessel (LEVELS.md, proposal): ?levels=tint, a faint tint of the liquid with its surface, or
   ?levels=line, the surface alone; none, as today, without it. The rig has no level sensors, so every figure is worked
   out from the recipe and the steps, never measured: its surface is dashed and its figure has "≈". While liquid is on
   its way (a move, the runoff, the boil-off) the screen can't know where it is, so the range it is somewhere in is
   hatched, from where it was to where it is going, and nothing moves on its own */
const LEVELS = (v => ["tint", "line"].includes(v) ? v : "")(new URLSearchParams(location.search).get("levels"));
/* the vessels' capacities from the Hardware page, gal; without one a vessel shows its figure but no fill */
const LV_CAP = {hlt: 20, mt: 20, bk: 20};
/* the element-cover minimum (the mash water guard's figure, an example here), gal; the mash tun has no element */
const LV_MIN = {hlt: 4, bk: 4};
/* the recipe's figures (BeerXML through CraftBeerPi's mash numbers): its sparge water, its boil volume and its volume
   after the boil; and how much a pound of grain adds to the mash, a common rule of thumb (about 0.67 L a kg) */
const LV_SPARGE = 5.0, LV_BOIL = 7.0, LV_POST = 6.3, LV_GRAIN = 0.08;
const lvF = g => (Math.round(g * 10) / 10).toFixed(1);
/* each vessel's contents, from the step list alone. kind: water, mash, wort or grain (spent grain, after the runoff);
   gal; to, while it is on its way to another figure; from, the words for where the figure comes from. A recipe's first
   steps decide: BrewStart running means its water is in the HLT; its question to move the strike water means the
   strike water is on its way; MashIn done means the grain is in; the runoff running means the sparge water and the wort
   are on their way; the boil running, once it boils, means the wort is boiling off. Moments whose recipe has no
   BrewStart take its 15 gal once the recipe has begun, as the brewer's recipes all start with it */
function lvState() {
  const S = RECIPE.steps, r = st.recipe;
  if (!r && !st.finished) return {};
  const begun = st.finished || (r && (r.cur > 0 || stepStatus(0) !== "I"));
  const at = f => S.findIndex(f), ss = i => i < 0 ? (begun ? "D" : "I") : stepStatus(i);
  const bs = at(s => s.type === "BrewStart"), mi = at(s => s.k === "mt" && /^mash ?in$/i.test(s.n)), ro = at(s => collectsWort(s)), bo = at(s => s.boil);
  const bsS = ss(bs), miS = ss(mi), boS = ss(bo), roS = ro < 0 ? (boS === "I" && !(r && r.held) ? "I" : "D") : ss(ro);
  if (bsS === "I") return {};
  const W = st.sw && st.sw.vol || SW_VOL0, K = SW_FROM.forGrain + SW_FROM.dead, H1 = W - K, H2 = H1 - LV_SPARGE;
  const M = K + SW_FROM.grainLb * LV_GRAIN, L = {};
  if (bsS !== "D") {
    if (st.banner && st.banner.text === SW_ASK) {
      L.hlt = {kind: "water", gal: W, to: H1, from: "strike water out"};
      L.mt = {kind: "water", gal: 0, to: K, from: "strike water in"};
    } else L.hlt = {kind: "water", gal: W, from: "BrewStart's water"};
    return L;
  }
  const running = roS === "A" || roS === "S";
  const flowing = running && !(S[ro] && S[ro].type === "SpargeStep" && !(r && r.started));
  L.hlt = roS === "D" ? {kind: "water", gal: H2, from: "less the sparge water"}
    : flowing ? {kind: "water", gal: H1, to: H2, from: "sparge water out"} : {kind: "water", gal: H1, from: "less the strike water"};
  L.mt = roS === "D" ? {kind: "grain", gal: 0, from: "the runoff is over"}
    : miS === "D" ? {kind: "mash", gal: M, from: `strike water and ${SW_FROM.grainLb} lb of grain`} : {kind: "water", gal: K, from: "the strike water"};
  if (flowing) L.bk = {kind: "wort", gal: 0, to: LV_BOIL, from: "running off"};
  else if (roS === "D") {
    const boiling = (boS === "A" || boS === "S") && r && !r.wait;
    L.bk = boS === "D" ? {kind: "wort", gal: LV_POST, from: "the recipe's volume after the boil"}
      : boiling ? {kind: "wort", gal: LV_BOIL, to: LV_POST, from: "boiling off"} : {kind: "wort", gal: LV_BOIL, from: "the recipe's boil volume"};
  }
  return L;
}
/* a level sensor per vessel (LEVELS.md): none on the rig yet, perhaps later. The Hardware page would name a vessel's
   sensor, a CraftBeerPi sensor that reads its volume; in the mockup a moment's lsens, or ?lsens=hlt,mt,bk. Its reading:
   a moment's lvm (gal; null for a sensor with no reading), else a stand-in, the estimate's figure (midway while it
   moves). A reading is drawn solid and its figure has no "≈"; the estimate stays dashed beside it */
const LSENS = (v => (v || "").split(",").filter(x => ["hlt", "mt", "bk"].includes(x)))(new URLSearchParams(location.search).get("lsens"));
const lvMode = () => LEVELS || (st && st.levels) || "";
/* a reading and the estimate differ when the reading is more than a quart (0.25 gal, about 1 L) from the estimate's
   figure, or outside the range a move is in */
const LV_AGREE = 0.25;
const LV_VKIND = {hlt: "water", mt: "water", bk: "wort"};
function lvMeas(v, o) {
  if (!((st && st.lsens) || LSENS).includes(v)) return null;
  const g = st.lvm && v in st.lvm ? st.lvm[v] : !o || o.kind === "grain" ? 0 : o.to != null ? Math.round((o.gal + o.to) * 5) / 10 : o.gal;
  return g == null ? {none: true} : {gal: g, live: st.link !== "lost"};
}
/* how far a reading is from the estimate: 0 when they agree */
function lvDiff(o, g) {
  if (!o || o.kind === "grain") return 0;
  const lo = Math.min(o.gal, o.to ?? o.gal), hi = Math.max(o.gal, o.to ?? o.gal), d = g < lo ? g - lo : g > hi ? g - hi : 0;
  return Math.abs(d) > LV_AGREE ? d : 0;
}
/* a vessel's estimate (o, as lvState gives it), its reading (m), whether its sensor has no reading (none), and the
   estimate that can be drawn (est: not spent grain) */
function lvView(v, L) {
  const o = L[v], r = lvMeas(v, o);
  return {o, m: r && !r.none ? r : null, none: !!(r && r.none), est: o && o.kind !== "grain" ? o : null};
}
const LV_KIND = {water: "Water", mash: "Mash", wort: "Wort"};
const lvLess = d => `${lvF(Math.abs(d))} ${d < 0 ? "less" : "more"}`;
/* a vessel's figure in words: the phone's line, the drawing's tooltip */
function lvLine(v, L = lvState()) {
  const {o, m, none, est} = lvView(v, L);
  if (m) {
    const name = est ? LV_KIND[est.kind] : o ? "Spent grain:" : LV_KIND[LV_VKIND[v]];
    if (!m.live) return `${name} last reading ${lvF(m.gal)} gal`;
    if (!est) return m.gal < 0.05 ? (o ? "Spent grain · no liquid measured" : "Empty · measured") : `${name} ${lvF(m.gal)} gal measured`;
    if (est.to != null) return `${name} ${lvF(m.gal)} gal measured → ≈ ${lvF(est.to)} · ${est.from}`;
    const d = lvDiff(est, m.gal);
    return `${name} ${lvF(m.gal)} gal measured · estimate ≈ ${lvF(est.gal)}${d ? `, ${lvLess(d)}` : ""}`;
  }
  if (!o) return none ? "Level sensor: no reading" : "";
  if (o.kind === "grain") return `Spent grain · ${o.from}`;
  return `${LV_KIND[o.kind]} ${o.to != null ? `${o.gal ? lvF(o.gal) : "0"} → ≈ ${lvF(o.to)}` : `≈ ${lvF(o.gal)}`} gal · ${none ? "level sensor: no reading" : o.from}`;
}
const lvY = (v, g) => 298 - Math.max(0, Math.min(g, LV_CAP[v])) / LV_CAP[v] * 186;
function lvSVG(v, V) {
  const {o, m, est} = V, mode = lvMode(), y = g => r1(lvY(v, g));
  if (!est && !m) return "";
  const k = (est ? est.kind : LV_VKIND[v]) === "water" ? "water" : "wort";
  const why = m ? (m.live ? `. Measured by its level sensor${est ? "; the dashed line is the estimate" : ""}.` : ". The last reading before the connection was lost.") : ". Worked out, not measured.";
  let s = `<title>${esc(lvLine(v))}${why}</title>`;
  if (!LV_CAP[v]) return s;
  /* measured: the tint to the reading, and its surface solid; the estimate's surface (where a move is going) dashed,
     with no tint or hatching of its own. With no connection the last reading's surface is in the drawing's steel, with
     no tint */
  if (m) {
    if (m.live && mode === "tint" && m.gal > 0) s += `<rect class="lv-body ${k}" x="-112" y="${y(m.gal)}" width="224" height="${r1(320 - y(m.gal))}"/>`;
    const e = est ? est.to ?? est.gal : 0;
    if (e > 0) s += `<path class="lv-top ${k}" d="M-112 ${y(e)} H112"/>`;
    if (m.gal > 0) s += `<path class="lv-top meas ${m.live ? k : "stale"}" d="M-112 ${y(m.gal)} H112"/>`;
    return s;
  }
  const to = o.to ?? o.gal, lo = Math.min(o.gal, to), hi = Math.max(o.gal, to);
  if (mode === "tint" && lo > 0) s += `<rect class="lv-body ${k}" x="-112" y="${y(lo)}" width="224" height="${r1(320 - y(lo))}"/>`;
  if (hi > lo) {
    if (mode === "tint") s += `<rect class="lv-band" x="-112" y="${y(hi)}" width="224" height="${r1(y(lo) - y(hi))}" fill="url(#lvh-${k})"/>`;
    else s += `<path class="lv-top was ${k}" d="M-112 ${y(o.gal)} H112"/>`;
  }
  if (to > 0) s += `<path class="lv-top ${k}" d="M-112 ${y(to)} H112"/>`;
  return s;
}
/* the dome's figure. Worked out: "≈ 6.7 GAL", "→ ≈ 6.7 GAL" while on its way, SPENT GRAIN. Measured: "6.4 GAL", with
   the estimate beside it only when they differ ("6.4 GAL · ≈ 7.0"), "3.1 → ≈ 7.0 GAL" while on its way, EMPTY, and
   "LAST 6.4 GAL" with no connection. A sensor with no reading: the estimate's */
function lvDome(V) {
  const {o, m, est} = V;
  if (m) {
    if (!m.live) return `LAST ${lvF(m.gal)} GAL`;
    if (est && est.to != null) return `${lvF(m.gal)} → ≈ ${lvF(est.to)} GAL`;
    if (m.gal < 0.05 && !est) return o ? "SPENT GRAIN" : "EMPTY";
    return est && lvDiff(est, m.gal) ? `${lvF(m.gal)} GAL · ≈ ${lvF(est.gal)}` : `${lvF(m.gal)} GAL`;
  }
  if (!o) return "";
  return o.kind === "grain" ? "SPENT GRAIN" : o.to != null ? `→ ≈ ${lvF(o.to)} GAL` : o.gal > 0 ? `≈ ${lvF(o.gal)} GAL` : "";
}
/* the figures in the drawing, on every render; drawn again only when they change */
function renderLevels() {
  if (!lvMode() || !$("#lv-hlt")) return;
  const L = lvState(), lid = $("#ss-lidt") && $("#ss-lidt").textContent;
  ["hlt", "mt", "bk"].forEach(v => {
    const V = lvView(v, L), g = $("#lv-" + v), html = lvSVG(v, V);
    if (g.dataset.k !== html) { g.innerHTML = html; g.dataset.k = html; }
    /* the boil kettle's figure gives way to the lid's question while the lid reminder waits */
    const t = $("#lvt-" + v), txt = v === "bk" && lid ? "" : lvDome(V);
    if (t.textContent !== txt) t.textContent = txt;
    const m = $("#lvm-" + v), y = (V.o || V.m) && LV_MIN[v] && LV_CAP[v] ? r1(lvY(v, LV_MIN[v])) : null;
    const mh = y == null ? "" : `<path class="lv-mtick" d="M-122 ${y} H-100"/><text class="lv-mt" x="-126" y="${r1(y + 5)}">MIN</text>`;
    if (m.dataset.k !== mh) { m.innerHTML = mh; m.dataset.k = mh; }
  });
}
/* the drawing's words for screen readers */
function lvDesc() {
  if (!lvMode()) return "";
  const L = lvState(), K = {water: "water", mash: "mash", wort: "wort"};
  const say = o => o.kind === "grain" ? "only spent grain, the runoff over" : o.to != null ? `from ${o.gal ? lvF(o.gal) : "0"} to about ${lvF(o.to)} gallons of ${K[o.kind]}, ${o.from}` : `about ${lvF(o.gal)} gallons of ${K[o.kind]}, ${o.from}`;
  let measured = false;
  const parts = ["hlt", "mt", "bk"].map(v => {
    const {o, m, none, est} = lvView(v, L), name = VNAME[v].toLowerCase();
    if (m) {
      measured = true;
      if (!m.live) return `${name}, ${lvF(m.gal)} gallons at its last reading, before the connection was lost`;
      if (m.gal < 0.05 && !est) return `${name}, ${o ? "no liquid with the spent grain" : "empty"}, measured`;
      const s = `${name}, ${lvF(m.gal)} gallons ${est ? `of ${K[est.kind]}` : o ? "with the spent grain" : `of ${K[LV_VKIND[v]]}`}, measured`;
      if (!est) return s;
      if (est.to != null) return `${s}, on its way to about ${lvF(est.to)}`;
      const d = lvDiff(est, m.gal);
      return `${s}; the estimate is about ${lvF(est.gal)}${d ? `, so ${lvF(Math.abs(d))} gallons ${d < 0 ? "less" : "more"} than expected` : ""}`;
    }
    if (!o) return none ? `${name}, its level sensor has no reading` : null;
    return `${name}, ${say(o)}${none ? ", worked out, as its level sensor has no reading" : ""}`;
  }).filter(Boolean);
  if (!parts.length) return "";
  return measured ? ` Liquid in each vessel, measured where it has a level sensor, otherwise worked out from the recipe and its steps: ${parts.join("; ")}.`
    : ` Liquid, worked out from the recipe and its steps, not measured: ${parts.join("; ")}.`;
}
let rigW = 0, rigRs = 1, rigSs = "", rigLv = "";
function drawRig() {
  /* --rig-r: room left at the drawing's right for + TIMER and SOUND where they can't clear it (tsideCorner) */
  const box = $("#rig"), w = box.clientWidth - 12 - (parseFloat(box.style.getPropertyValue("--rig-r")) || 0), h = box.clientHeight - 12;
  /* too small to be worth drawing; with the timers' bar along the bottom (?tplace=bottom) the drawing can be as short
     as 40 px on one screen, and is drawn that small rather than left empty */
  if (w < 60 || h < ($("#app").hasAttribute("data-tbarb") ? 24 : 60)) return;
  const W = Math.max(1200, Math.round(RIG_H * w / h));
  /* with graphs in the faceplates the drawing gets shorter, so its labels grow to stay readable (up to 1.3 times) */
  const rs = GRAPHS === "face" ? Math.round(Math.min(1.3, Math.max(1, 0.68 / Math.min(h / RIG_H, w / 1200))) * 100) / 100 : 1;
  if (Math.abs(W - rigW) < 4 && rs === rigRs && slayer() === rigSs && lvMode() === rigLv && $("#rigsvg")) return;
  rigW = W; rigRs = rs; rigSs = slayer(); rigLv = lvMode();
  box.innerHTML = rigSVG(LAYOUT === "b" ? "line" : "kettle", W, rs, WP, rigSs, rigLv);
  renderRig();
  if (TPLACE) tsideCorner();
}
function renderAll() {
  const lost = st.link === "lost";
  if (TIMERS === "new" && st.banner && st.banner.timer != null) st.banner.more = st.tmrs.filter(t => t.state === "done").length - 1;
  phCheck();
  $("#app").dataset.link = st.link;
  $("#app").toggleAttribute("data-editing", !!st.edit);
  $("#link").dataset.link = st.link;
  $("#link-t").textContent = lost ? "No connection" : "Connected";
  clockSet(); spdDraw();
  const ho = $("#alloff");
  ho.textContent = st.pend.alloff ? "SWITCHING OFF…" : "ALL OFF";
  if (lost || st.pend.alloff) { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = lost ? PAUSED : WAIT; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  const bn = $("#banner");
  bn.dataset.tone = st.banner ? st.banner.tone : "ok";
  /* a long question with a button (CraftBeerPi's sparge and boil prompts): on a phone its words keep the width and its
     buttons go under them, rather than a column of three or four words a line beside them (brew-day.css). So do a
     reminder's OK and RECORD pH (data-ph), which keep their focus as the bar is drawn again, as LOG keeps its own */
  const phx = phOffer(), bf = phx && bn.contains(document.activeElement) ? document.activeElement.dataset.cmd : null;
  bn.toggleAttribute("data-long", !!(st.banner && (st.banner.act || st.banner.acts) && (st.banner.text.length > LONG_Q || phx)));
  bn.toggleAttribute("data-ph", !!phx);
  bn.innerHTML = bannerHTML();
  if (bf) bn.querySelector(`[data-cmd="${bf}"]`)?.focus({preventScroll: true});
  phDraw();
  const lf = !!document.activeElement && document.activeElement.classList.contains("logbtn");
  $("#event").innerHTML = eventHTML();
  if (lf) $("#event .logbtn").focus({preventScroll: true});
  /* ?tplace: the event line holding the timers keeps its height (brew-day.css), the bottom bar is drawn, or goes, and so
     does the column beside the drawing */
  if (TPLACE) { $("#event").toggleAttribute("data-tev", tHere() === "event"); tbarDraw(); tsideDraw(); }
  TIGHT = platesTight();
  STACKED = mainStacked();
  $("#plates").toggleAttribute("data-tight", TIGHT);
  /* the boil power's steps in a row of their own: on one screen the drawing gives up their height (brew-day.css) */
  $("#app").toggleAttribute("data-steps", TIGHT && bkNudges());
  $("#plates").innerHTML = ["hlt", "mt", "bk"].map(plateHTML).join("");
  /* the check belongs to the recipe START was held on (st.pbFor): started, cleared or another loaded in its place on
     another screen, the check ends here (pbEnd), so CHECKING… gives way and the box closes at once, it can't come back
     for the next recipe loaded, and the check's answer, when it comes, decides nothing. The probes' panel closes once a
     recipe has begun; brewing by hand there is no recipe, and the panel stays */
  const pbGone = st.pend["r:check"] || st.pbOpen ? recipeLost(st.pbFor) : null;
  if (pbGone) pbEnd(pbGone);
  if (st.recipe && !pbFresh()) { st.cmpOpen = false; st.rbOpen = false; }
  /* with the timers out of the column (?tplace, on one screen), brewing by hand shows the recipe book as built, with
     nothing to open */
  if (!st.recipe && tHere() !== "col") st.rbOpen = false;
  /* UNLOAD's question stays while its words stay true: it goes with the recipe, or as a step starts here or elsewhere */
  if (st.confirmUnload && !(st.recipe && st.recipe.state !== "running" && unloadAsks(st.recipe))) st.confirmUnload = false;
  /* LOAD's, while the recipe it would replace is still the one loaded and still isn't in the book */
  if (st.confirmLoad != null && !loadAsks()) st.confirmLoad = null;
  /* the strike water box opened out closes when another box takes its place, or the malt has gone in. A timer's editor
     open as a box opens in the column (this one, the check's, the probes') stays open, with what was typed in it: on
     one screen it makes way with the timers until the box closes (brew-day.css) */
  if (st.swOpen && (!swPhase() || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload)) st.swOpen = false;
  if (st.swVol && st.swVol.at !== "row" && (!swPhase() || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload)) st.swVol = null;
  if (st.swGrain && (!swPhase() || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload)) st.swGrain = null;
  if (st.swRec && st.swRec.at !== "row" && (!swPhase() || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload)) st.swRec = null;
  /* BrewStart's box: one box at a time, so another opened in the column closes it; it also goes once it no longer
     applies (BrewStart has started heating, the recipe has stopped or gone, or for a new one the recipe has begun or
     has a BrewStart), unless its command is on its way */
  if (st.bsOpen && !st.pend.bs) {
    const {bi} = swSteps(), still = st.bs && (st.bs.neu ? pbFresh() && bi < 0 : bi >= 0 && bsOpens(bi));
    if (!still || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.swOpen || st.swVol || st.swGrain || st.swRec || st.rbOpen || st.confirmLoad != null || st.tfOpen) { st.bsOpen = false; st.bs = null; }
  }
  /* the MashIn row's mash water box: one box at a time, so another opened in the column closes it; it also goes with
     the recipe, or once the row no longer offers it, unless its command is on its way. Its small boxes go with it, and
     once the malt is in */
  if (st.mwOpen && !st.pend.swr && !st.pend.swv) {
    const still = !!st.recipe && mwOpens(mwIdx());
    if (!still || st.pbOpen || st.cmpOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.swOpen || st.bsOpen || st.rbOpen || st.confirmLoad != null) st.mwOpen = false;
  }
  if (!st.mwOpen || mwMaltIn()) {
    if (st.swRec && st.swRec.at === "row" && !st.pend.swr) st.swRec = null;
    if (st.swVol && st.swVol.at === "row" && !st.pend.swv) st.swVol = null;
  }
  /* the check's box, the probes' panel or the strike water box as it is on screen, before the column is drawn again
     (pbFit) */
  const before = pbMeasure();
  /* while a timer's editor is open, the one-screen layout gives it the step list's room (by hand, the recipe book's), and
     the strike water box's while that box is closed (brew-day.css). An editor opened from a chip beside the last event or
     in the bottom bar (?tplace) has a box of its own, and the column stays as it is */
  $("#recipe").toggleAttribute("data-tedit", TIMERS === "new" && !!st.tedit && tHere() === "col");
  /* and while something in it waits for you (NEXT STEP's, RESET's or UNLOAD's question, a timer's alarm), or
     BrewStart's box is open, the versions' line steps aside on a monitor, so the step list keeps the current step whole
     (brew-day.css) */
  $("#recipe").toggleAttribute("data-asking", !!(st.confirmNext || st.confirmReset || st.confirmUnload || st.pbOpen || st.cmpOpen || st.swOpen || st.swVol || st.swGrain || st.swRec || st.rbOpen || st.tfOpen || st.bsOpen || st.mwOpen || (TIMERS === "new" && st.tmrs.some(t => t.state === "done"))));
  /* the pre-brew check's box, the probes side by side and the strike water box opened out, or with the HLT's water being
     given, take the step list's room on one screen, as a timer's editor does; so do BrewStart's box and the proposal's
     recipe book */
  $("#recipe").toggleAttribute("data-pb", !!(st.pbOpen || st.cmpOpen || st.swOpen || st.swVol || st.swGrain || st.swRec || st.rbOpen || st.bsOpen || st.mwOpen));
  /* BrewStart's box: COMPARE PROBES makes way for it on one screen too, as the step list does (brew-day.css) */
  $("#recipe").toggleAttribute("data-bs", !!st.bsOpen);
  /* the proposal's timers (?col=new), opened from their folded line, take the step list's room and the strike water
     box's */
  $("#recipe").toggleAttribute("data-tbox", FOLD && !!st.tfOpen);
  /* typing in BrewStart's box keeps its caret, whatever draws the column again meanwhile */
  const fa = document.activeElement, fid = fa && (fa.id === "bstin" || fa.id === "bsgin") ? fa.id : null, fsel = fid ? [fa.selectionStart, fa.selectionEnd] : null;
  /* and the box's middle where it was scrolled to, and the button the box gave the focus as it opened keeping it until
     something is pressed, as the screen keeps them while it draws the column again */
  const mid = $("#bs-box .bsmid"), midTop = mid ? mid.scrollTop : 0;
  const fcmd = !fid && bsFocusCmd && fa && fa.dataset && fa.dataset.cmd === bsFocusCmd ? bsFocusCmd : null;
  $("#recipe").innerHTML = recipeHTML() + verHTML();
  if (fid) { const fi = document.getElementById(fid); if (fi) { fi.focus({preventScroll: true}); try { fi.setSelectionRange(...fsel); } catch (_) {} } }
  else if (fcmd) $(`#bs-box [data-cmd="${fcmd}"]`)?.focus({preventScroll: true});
  bsFit();
  if (midTop) { const m2 = $("#bs-box .bsmid"); if (m2) m2.scrollTop = midTop; }
  pbFit(before);
  drawSw();
  $("#now").innerHTML = nowHTML();
  if (TIMERS === "new") {
    /* a timer that has run out and not been answered: its row, the title bar and a frame round the whole screen pulse
       together, on every screen. CraftBeerPi's other alerts beep twice once as they arrive, with SOUND on */
    $("#app").toggleAttribute("data-ring", st.tmrs.some(t => t.state === "done"));
    bn.toggleAttribute("data-ring", !!(st.banner && st.banner.timer != null));
    if (st.banner && st.banner !== lastBanner && st.banner.timer == null) ring(2);
    lastBanner = st.banner;
  }
  keepStepInView();
  tFold();
  tPlaceFit();
  renderRig();
  /* ?tplace=side with no timers: + TIMER and SOUND placed clear of the drawing as it now reads */
  if (TPLACE) tsideCorner();
  if (GRAPHS) { renderGraphPanel(); drawGraphs(); }
}
/* ---------- commands (simulated: each one answers after a short delay) ---------- */
let toastT;
function toast(text) { const t = $("#toast"); t.textContent = text; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3800); }
function logEvent(what, res, tone, cav = "") { st.events.unshift([hhmmss(st.t % 86400), what, res, tone, cav, dayOf(st.t)]); }
/* a question's line says "waiting for you", in Prompt Amber, only while CraftBeerPi waits for its answer. Once it goes,
   answered on any screen or taken down by CraftBeerPi, the same line says so in the plain colour and keeps the time of
   the question; the answer itself is logged on a line of its own. So amber in the log always means something still
   needs you. A question's line starts with its title: "Hop Alert: …", "Stir finished", "No target for the Mash Tun" */
function questionGone(title, res = "answered") {
  const e = st.events.find(x => x[2] === "waiting for you" && (x[1] === title || x[1].startsWith(title + ":") || x[1].startsWith(title + " finished")));
  if (e) { e[2] = res; e[3] = ""; }
}
/* what CraftBeerPi says as a command takes effect (its notifications, a step's start, a prompt) reaches the screen just
   after the command's own "confirmed", so it comes out on top */
function soon(f) { timers.push(setTimeout(() => { f(); renderAll(); }, 300)); }
function say(text, urgent) { const el = $(urgent ? "#sr-alert" : "#sr"); el.textContent = ""; setTimeout(() => { el.textContent = text; }, 40); }
function note(where, text) {
  st.notes[where] = text; renderAll();
  clearTimeout(noteTimers[where]);
  noteTimers[where] = setTimeout(() => { if (st.notes[where] === text) { st.notes[where] = ""; renderAll(); } }, 6000);
}
function explain(el) {
  const why = el.dataset.why, pl = el.closest(".plate");
  if (!why) return;
  if (pl) note(pl.id.slice(3), why); else if (el.closest(".tmrs, .tev, .tbarb, .tside")) note("t", why); else if (el.closest(".recipe")) note("r", why); else if (el.closest("#ph-box")) note("ph", why); else toast(why);
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
const actLabel = (id, on) => `${ACT[id].name} ${ACT[id].kind === "pump" ? (on ? "started" : "stopped") : (on ? "on" : "off")}${on && id === "bkEl" && BKMAN === "new" && st.v.bk.mode !== "auto" ? ` at ${st.v.bk.bp} %` : ""}`;
function setActor(id, on) { const a = st.a[id]; a.on = on; a.failed = null; a.paused = false; if (id === "bkEl") endPause(); if (ACT[id].kind === "heat") a.pct = on ? (id === "bkEl" && BKMAN === "new" ? st.v.bk.bp : a.lvl ?? 100) : 0; }
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
  if (m === "manual") questionGone(`No target for the ${KNAME[v]}`, "no longer needed");
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
    /* the older faceplate's power editor (?bk=today) edits the setting its button named when it opened; if a step or
       ALL OFF changes the mode, that setting is no longer the one in use, so the editor closes without sending anything.
       (In the redesigns the button always sets the boil power, so a mode change leaves the editor open.) */
    if (BK === "today" && st.edit && st.edit.kind === "pwr" && st.edit.what !== (m === "auto" ? "boil" : "hand")) {
      st.edit = null;
      note("bk", `The boil kettle switched to ${m.toUpperCase()}, so the button now sets ${m === "auto" ? "the boil power" : "the element's power by hand"}. Nothing was changed.`);
    }
  }
  ["hltEl", "wortPump", "bkEl"].forEach(id => { a[id].failed = null; });
}
function cmdMode(v, m) { send("m:" + v, m, `${VNAME[v]} ${m.toUpperCase()}`, () => setMode(v, m)); }
/* every target box, and the new boil kettle's other boxes, start with their number selected, so typing replaces it
   ("BOIL" included): typing 150 into 168.0 gives 150, not 150168.0 */
const focusTin = sel => setTimeout(() => { const i = $("#tin"); if (!i) return; i.focus(); if (sel) i.select(); }, 0);
function cmdTgtOpen(v) {
  const V = st.v[v], pw = v === "bk" && BK === "power";
  st.edit = {v, kind: "tgt", val: pw ? bkHoldT() ?? boilFrom() : bkNew(v) ? boilFrom() : V.sv ?? (v === "bk" ? 210.2 : v === "mt" ? 149.0 : V.own ?? 168.0)};
  renderAll(); focusTin(true);
}
/* the new boil kettle's BOIL AT, in the power box: the boil point, Boil_Threshold (set_boil_at) */
function cmdBatOpen() { st.edit = {v: "bk", kind: "bat", val: boilFrom()}; renderAll(); focusTin(true); }
function cmdTgtStep(d) {
  const e = st.edit;
  /* the new boil kettle's target: BOIL sits just above the highest hold, so − from BOIL gives 206.5 or 205.6 */
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
    questionGone(`No target for the ${KNAME[v]}`, "no longer needed");
  });
}
/* the new boil kettle's TARGET (the newer BoilPower): SET BOIL sends the boil point as the target, and anything from
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
  send("t:bk", "set", `Boil kettle target ${boil ? "BOIL" : T.toFixed(1) + " °F"}`, () => { const was = bkHolding(); V.sv = T; bkRetarget(was); }, cav);
}
/* BOIL AT: where full power gives way to the boil power (190-212 °F; above 212 °F the wort may never get there). A target
   at BOIL moves with it, so raising the boil point never turns BOIL into a hold (the mockup expects BoilPower's
   set_boil_at to do the same) */
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
   at its next control decision (every 2 s) once the kettle is at or above the boil threshold. In MANUAL the older
   faceplate's button (?bk=today) sets the element's own level instead (set_power), which it runs at when it is on by
   hand; the redesigns' button always sets the boil power. */
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
  const cav = BK !== "today" ? (V.mode !== "auto" ? (BKMAN === "new" ? (el.on ? "" : "used when you heat by hand") : "kept for the boil in AUTO") : bkHolding() ? `not used while it holds ${+ho.toFixed(1)} °F`
      : el.paused ? "used when the heat carries on" : (BK === "power" ? bkLatched() : V.pv >= boilFrom()) ? "" : `used once it boils at ${boilFromText()} °F, full power until then`)
    : boil ? (V.mode === "auto" && V.pv >= boilFrom() ? "" : `used from ${boilFromText()} °F, full power until then`)
    : (el.on ? "" : "used when you switch the element on");
  send("p:bk", "set", boil ? `Boil power ${val} % (was ${was} %)` : `Boil element by hand ${val} % (was ${was} %)`, () => {
    if (boil) { V.bp = val; if (V.mode === "auto" && el.on && bkHoldT() == null && (BK === "power" ? bkLatched() : V.pv >= boilFrom())) el.pct = val; if (BKMAN === "new" && V.mode !== "auto" && el.on) el.pct = val; }
    else { el.lvl = val; if (V.mode !== "auto" && el.on) el.pct = val; }
  }, cav);
}
/* the new boil kettle's one-tap steps, −5 % −1 % +1 % +5 %: sent at once, no SET. The same set_boil_power as the
   editor; a tap that would go past 0 or 100 % stops there (2 % − 5 → 0 %), and only at 0 or 100 % itself is the button
   refused. The wait is kept under the step ("-5", "-1", "1", "5"), so only the button pressed shows it */
function cmdNudge(d) {
  const V = st.v.bk, el = st.a.bkEl, was = V.bp, val = Math.min(100, Math.max(0, was + d)), hand = BKMAN === "new" && V.mode !== "auto";
  if (val === was) return;
  const cav = hand ? (el.on ? "" : "used when you heat by hand") : el.paused ? "used when the heat carries on" : bkLatched() ? "" : `used once it boils at ${boilFromText()} °F, full power until then`;
  send("p:bk", String(d), `Boil power ${val} % (was ${was} %)`, () => {
    V.bp = val;
    if (V.mode === "auto" && el.on && bkLatched()) el.pct = val;
    if (hand && el.on) el.pct = val;
  }, cav);
}
/* the new boil kettle's Keep boiling checkbox: set_keep_boiling, kept in the kettle's Keep_Boiling setting, so it can
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
/* the new boil kettle's pause, for a boil-over: the element goes off and AUTO, the recipe and the boil power carry
   on. The newer BoilPower does it with set_paused(Paused="Yes"), and "No" carries on; it is refused unless AUTO runs.
   Carrying on picks up where AUTO is: the boil power while boiling, full power below the boil, a hold's own power */
function cmdPause(on) {
  const el = st.a.bkEl, V = st.v.bk;
  send("a:bkEl", on ? "pause" : "resume", on ? "BOIL ELEMENT paused" : "BOIL ELEMENT heating again", () => {
    el.failed = null;
    if (on) { el.paused = true; el.pausedAt = st.t; el.on = false; el.pct = 0; return; }
    endPause();
    /* a hold's PID kept what it had built up through the pause (it stops building up while paused) */
    const ho = bkHoldT(), p = ho != null ? holdOut(ho, V.pv, BK === "power") : bkLatched() ? V.bp : 100;
    el.on = p > 0; el.pct = p;
  });
}
/* the new boil kettle, after its target changes while AUTO runs: BOIL heats at full power until the boil point, then
   at the boil power; a hold's PID sets the power, none once the wort is well above it. was: it was holding before the
   change, so its PID carries on with what it had built up; from BOIL a hold starts a new one. A paused element stays off */
function bkRetarget(was = false) {
  const V = st.v.bk, el = st.a.bkEl, ho = bkHoldT();
  if (V.mode !== "auto") return;
  V.latched = ho == null && V.pv >= boilFrom();
  if (el.paused) return;
  const p = ho == null ? (V.latched ? V.bp : 100) : holdOut(ho, V.pv, BK === "power" ? was : el.on);
  el.on = p > 0; el.pct = p;
}
/* a recipe step sets its kettle's target. With the newer BoilPower the Boil step sets the boil kettle's target to BOIL
   (the boil point), so a hold left from the day before can't stop a boil */
function stepTarget(s) {
  const pw = s.k === "bk" && BK === "power", was = pw && bkHolding();
  st.v[s.k].sv = pw && s.boil ? boilFrom() : s.temp;
  if (st.v[s.k].mode !== "auto") setMode(s.k, "auto");
  else if (s.k === "mt") st.v.hlt.sv = +(s.temp + HERMS_DELTA).toFixed(1);
  else if (pw) bkRetarget(was);
}
function stepStart(i) {
  const r = st.recipe, s = RECIPE.steps[i], was = RECIPE.steps[r.cur], moved = was && i !== r.cur;
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
     press's own line. In the older shape BrewStart never heats (bsHandsOver), so it ends as any step does */
  const bsHot = moved && was.type === "BrewStart" ? r.bsHeat : null;
  if (bsHot) {
    if (st.v.hlt.mode === "auto") setMode("hlt", "manual");
    r.bsHeat = null;
    soon(() => {
      logEvent("BrewStart finished, HLT AUTO off", "by recipe", "");
      logEvent(`${s.n} started${s.temp != null ? `, ${s.k === "hlt" ? "HLT" : VNAME[s.k].toLowerCase()} target ${s.temp.toFixed(1)} °F` : ""}`, "by recipe", "");
    });
  }
  /* on to the boil kettle: the mash tun's AUTO, and a mash step's HERMS with it, has done its work */
  if (s.k === "bk") { st.fill.bk = true; if (st.v.mt.mode === "auto") setMode("mt", "manual"); }
  /* the runoff over (the core's hltpump extension): as the last step named for the runoff ends, by NEXT here or its
     time up, CraftBeerPi switches the HLT pump off and leaves the wort pump to finish draining the mash tun. Its
     information notification goes in the event line word for word, as CraftBeerPi's notifications do on the screen */
  if (moved && collectsWort(was) && !collectsWort(s) && st.a.hltPump.on) {
    const wort = st.a.wortPump.on;
    setActor("hltPump", false);
    soon(() => logEvent(`HLT pump: ${was.n} has ended, so the HLT pump is off.${wort ? " The wort pump is still running, to finish draining the mash tun." : ""}`, "from CraftBeerPi", ""));
  }
  r.cur = i; r.left = (s.min || 0) * 60; r.adds = []; r.wait = false;
  /* the boil waits for the brewer (CONFIRM_BEFORE_BOIL, as on the brewer's rig): nothing is active, so nothing heats,
     and the wort pump, if it runs, goes on draining the mash tun. The step says WAITING FOR YOU, as in screen.js. Its
     prompt goes in the event line in CraftBeerPi's words, as there */
  if (s.boil) {
    const q = boilHoldBanner(s);
    Object.assign(r, {held: true, state: "ready", wait: WFY});
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
    else if (st.sw && moved && s.k === "mt" && ((was.k === "hlt" && was.type === "MashInStep") || bsHot === "holding")) swMovedIn(s);
  }
  /* a NotificationStep asks a second after it starts, in its own words; NEXT STEP, CraftBeerPi's label, answers it */
  else if (s.note) {
    st.banner = {tone: "prompt", title: s.n, text: s.note, act: "NEXT STEP", cmd: "b:done"};
    soon(() => logEvent(`${s.n}: ${s.note}`, "waiting for you", "wait"));
  }
}
/* the brewer starts the held boil, with START THE BOIL or a held START (BoilStep._runoff_over): the runoff
   is over, so CraftBeerPi switches the wort pump and the HLT pump off, whichever run, once a brew, and says so; then the
   boil kettle's AUTO, heating to the boil before the step's timer starts */
function boilStart() {
  const r = st.recipe, s = RECIPE.steps[r.cur], off = [];
  if (st.banner && st.banner.boilHold) st.banner = null;
  /* answered, with START THE BOIL or a held START here. CraftBeerPi takes its question down as "withdrawn" when the boil
     is started some other way than its button, so the screen counts its own START too (BUILD-NOTES) */
  questionGone(s.n);
  [["wortPump", "the wort pump"], ["hltPump", "the HLT pump"]].forEach(([id, w]) => { if (st.a[id].on) { setActor(id, false); off.push(w); } });
  st.fill.mtLiq = false;
  if (st.v.mt.mode === "auto") setMode("mt", "manual");
  if (st.hist) st.hist.steps.push([st.t, r.cur + 1]);
  stepTarget(s);
  Object.assign(r, {held: false, state: "running", wait: st.v.bk.pv < boilFrom()});
  /* the step's line first, then what CraftBeerPi says as it starts: screen.js logs a step's change before the words it
     sets going */
  soon(() => {
    logEvent(boilStartLine(s, boilFrom()), "by recipe", "");
    if (off.length) {
      const w = off.join(" and ");
      logEvent(`${s.n}: ${w[0].toUpperCase()}${w.slice(1)} ${off.length > 1 ? "are" : "is"} off, so you can move ${off.length > 1 ? "their" : "its"} hoses.`, "from CraftBeerPi", "");
    }
  });
}
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
    r.wait = WFY; st.banner = spargeBanner(s.temp);
    logEvent(`${st.banner.title}: ${st.banner.text}`, "waiting for you", "wait");
    renderAll();
  }, 600));
}
function cmdStart(force, cav = "") {
  st.confirmReset = false; st.confirmUnload = false;
  /* a recipe not begun is checked first (pbRun); START ANYWAY, or the check passed, comes back here with force */
  if (!force && pbFresh()) return pbRun();
  send("r:start", "start", "Recipe started", () => {
    /* held before the boil, START starts the boil, as START THE BOIL does */
    if (st.recipe.held) return boilStart();
    const r = st.recipe, s = RECIPE.steps[r.cur], fresh = r.state === "ready";
    if (fresh && st.hist) st.hist.steps.push([st.t, r.cur + 1]);
    r.state = "running";
    if (s.type === "SpargeStep") spargeBegin(s);
    /* BrewStart started again after a STOP once it had begun heating carries on heating, as its time has passed */
    else if (s.type === "BrewStart") { if (r.bsHeat) bsHeat(s); else swWaitBegin(s); }
    else if (s.temp != null) { stepTarget(s); if (s.k === "hlt" && s.type === "MashInStep") swHeating(s); }
    /* the new boil kettle: a recipe started from its first step puts the boil power back to the usual power
       (BoilPower's Usual_Boil_Power setting, see BUILD-NOTES). A change made later that day, before or during the boil,
       is kept for the boil, and doesn't carry over to the next brew day */
    if (BK === "power" && fresh && st.v.bk.usual != null && st.v.bk.bp !== st.v.bk.usual) {
      const was = st.v.bk.bp; st.v.bk.bp = st.v.bk.usual;
      timers.push(setTimeout(() => { logEvent(`Boil power back to your usual ${st.v.bk.usual} % (was ${was} %)`, "by recipe", ""); renderAll(); }, 300));
    }
  }, cav);
}
function cmdStop() {
  st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false;
  send("r:stop", "stop", "Recipe stopped", () => {
    const k = RECIPE.steps[st.recipe.cur].k;
    st.recipe.state = "stopped";
    if (st.v[k].mode === "auto") setMode(k, "manual");
    /* a SpargeStep's "Sparge started" question is taken down when the step stops, and put up again when it starts */
    if (st.banner && st.banner.sparge) { st.banner = null; st.recipe.wait = null; questionGone(RECIPE.steps[st.recipe.cur].n, "no longer needed"); }
  });
}
function cmdNextYes() {
  const r = st.recipe, nx = RECIPE.steps[r.cur + 1];
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
   before it gets here (explain) */
function cmdUnload() {
  const u = unloadRule();
  if (u.why) return;
  Object.assign(st, {confirmNext: false, confirmReset: false, pbOpen: false, cmpOpen: false, rbOpen: false, swOpen: false, swVol: null, swGrain: null, swRec: null, bsOpen: false, bs: null, mwOpen: false});
  if (u.ask) { st.confirmUnload = true; return renderAll(); }
  cmdUnloadGo();
}
/* UNLOAD, or the question's UNLOAD: CraftBeerPi empties the brew steps and takes down the brew's questions, whose lines
   say "no longer needed". Kettles, pumps and timers stay as they are. The column goes back to brewing by hand, with
   the recipe book's LOAD to have the recipe back as the Recipe Book keeps it (swAsSaved). The graphs lose their step
   marks, as with a reset */
function cmdUnloadGo() {
  st.confirmUnload = false;
  send("r:unload", "unload", `${RECIPE.name} unloaded: Brew Day is brewing by hand`, () => {
    const q = new Set(brewQuestions());
    q.forEach(t => questionGone(t, "no longer needed"));
    if (st.banner && (brewAsks(q, st.banner) || st.banner.cmd === "r:unload-yes")) st.banner = null;
    if (st.sw && !st.sw.hand) swAsSaved();
    st.recipe = null; st.finished = false; st.pbOpen = false; st.cmpOpen = false; st.rbOpen = false;
    if (st.hist) { st.hist.steps = []; st.hist.start = st.t - 8 * 3600; }
  });
}
/* the mockup's Recipe Book keeps Test Recipe v5 as it was saved: its strike water at the rest's 126 °F, BrewStart's
   15 gal, Ready by 07:00 the next day and no grain temperature of its own. What this brew changed since loading (USE's
   figure, the HLT's water, the grain's temperature, BrewStart's time and where the grain spent the night) isn't kept,
   so LOAD brings the recipe back as saved, the grain is asked again, and the strike water helper starts a new day for
   it */
function swAsSaved() {
  const {S, bi, si} = swSteps();
  if (si >= 0) S[si].temp = SW_PLAN0;
  if (bi >= 0) Object.assign(S[bi], {temp: SW_PLAN0, vol: SW_VOL0, grain: null, where: null, ready: "07:00", start: null, date: dateOf(dayOf(st.t) + 1)});
  Object.assign(st.sw, {plan: SW_PLAN0, was: null, vol: SW_VOL0, grain: null, work: null, failed: null});
  delete st.sw.srv;
  st.sw.has = swNow();
}
function cmdBanner(x) {
  if (x === "added") send("b", "x", "Hop Alert answered: Added", () => { questionGone("Hop Alert"); st.banner = null; if (st.recipe) st.recipe.adds[0] = "done"; });
  else if (x === "boil") send("b", "x", `${RECIPE.steps[st.recipe.cur].n} answered: Start the boil`, boilStart);
  /* the lid reminder's DONE (BoilStep's LidAlert): CraftBeerPi takes it down; set by hand, the drawing now shows the
     mister open, as the brew needs it */
  else if (x === "lid") send("b", "x", `${LID_Q.title} answered: Done`, () => { questionGone(LID_Q.title); st.banner = null; st.lidDone = true; });
  /* the reminder to turn a hand-set mister off, once the boil kettle has cooled below the cut-off: answered, the drawing
     shows it closed */
  else if (x === "lidoff") send("b", "x", `${OFF_Q.title} answered: Done`, () => { questionGone(OFF_Q.title); st.banner = null; st.offWait = false; st.ssOff = true; });
  else if (x === "done") {
    const s = RECIPE.steps[st.recipe.cur];
    /* a question waiting behind this one (the turn-off reminder, after the boil) comes up once it is answered */
    send("b", "x", `${s.n} answered: Next Step`, () => { questionGone(s.n); st.banner = null; stepStart(st.recipe.cur + 1); if (st.offWait && !st.banner) st.banner = offBanner(); });
  }
  /* the SpargeStep's "Sparge started": its timer starts (or it runs until NEXT STEP), the HLT's AUTO goes off, and the
     drawing goes over to the runoff */
  else if (x === "sparge") {
    const s = RECIPE.steps[st.recipe.cur];
    send("b", "x", `${s.n}: sparge started, ${s.min ? `${s.min} min timer started` : "until NEXT STEP"}`, () => {
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
     lines say "seen", a warning's in the plain colour, an error's still red. No line of its own */
  else if (st.banner && st.banner.cbpi) { seenLines(`${st.banner.title}: ${st.banner.text}`); st.banner = null; renderAll(); }
  /* OK on a reminder whose OK CraftBeerPi runs, such as the two that ask for the mash pH (phAck) */
  else if (x === "ack") phAck();
  /* OK: the rest timer's alarm, or a warning that waits for one (no target, a forgotten pause) */
  else { if (st.banner) questionGone(st.banner.title); st.banner = null; renderAll(); }
}
/* CraftBeerPi's warning or error OK'd, here or on any screen or in BrewScribe (CraftBeerPi tells every page, with its
   earlier copies in the same words): each of its lines says "seen". A warning's turns plain, as it no
   longer waits; an error's stays red, as it records that something went wrong (The Amber Means Waiting Rule) */
function seenLines(words) {
  st.events.forEach(e => {
    if (e[1] !== words || e[2] !== "from CraftBeerPi" || (e[3] !== "wait" && e[3] !== "bad")) return;
    e[4] = "seen";
    if (e[3] === "wait") e[3] = "";
  });
}
/* ---------- the mash pH for BrewScribe (PH-ENTRY.md) ----------
   The two reminders that ask for the mash pH take the reading here, for BrewScribe's brew log, without a trip to its
   page. Brew Day keeps no list of them: BrewScribe names them in its answer to GET /brewscribe/api/brew-day/readings,
   asked as a reminder shows and every 15 real seconds while one it names is up, with its open log, the stage and vessel
   each reading goes to, and the reading standing there now. Such a reminder gets RECORD pH, its main answer, at the
   right end, with OK, the lesser one, to its left. RECORD pH opens the pH box under the reminder; SAVE sends the reading
   (POST /brewscribe/api/brew-day/readings), then closes the reminder as OK does. While BrewScribe can't take a reading
   (no log open, the vessel unclear) RECORD pH is greyed and says why; where BrewScribe isn't installed or doesn't
   answer, there is none. In the mockup st.bscribe is BrewScribe, holding what its answer says, and st.scribe is Brew
   Day's copy of the last answer it had (st.scribeSeen: the reminder it was for). st.scribeMock holds what a moment has
   BrewScribe or CraftBeerPi do: refuse a SAVE, not answer it, or save it and lose the answer (post); not answer an OK
   (ack); not answer the GET (get); take a reading on BrewScribe's own page (page); and the entries BrewScribe has saved
   from Brew Day (ids). st.scribePosts keeps what each SAVE sent */
const PH_WAIT = "Waiting for BrewScribe to answer.";
const PH_SLOW = "BrewScribe didn't answer, so it may not have saved it. SAVE again: it won't be saved twice.";
const PH_ASK = 15; // real seconds between asks while such a reminder is up, as often as BrewScribe's own page asks
const EXT_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg>';
const phKey = (day, title, v, t, u) => JSON.stringify([day, title, v, t, u]);
const phCopy = o => o == null ? null : JSON.parse(JSON.stringify(o));
const phUUID = () => crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
/* a moment's BrewScribe: the #mash day's unless the moment says otherwise, or none with ?brewscribe=none, where
   CraftBeerPi answers 404. Brew Day had its answer before the moment, as it asked when the reminder went up; a moment can
   give it an older copy (bscribeSeen) */
function phLoad() {
  if (QS.get("brewscribe") === "none") st.bscribe = null;
  else if (st.bscribe === undefined) st.bscribe = scribeDay();
  st.scribeMock = Object.assign({post: [], ack: [], get: null, page: null, ids: {}}, st.scribeMock);
  const seen = st.bscribe && st.bscribeSeen !== undefined ? st.bscribeSeen : st.bscribe;
  delete st.bscribeSeen;
  Object.assign(st, {scribe: phCopy(seen), scribeSeen: st.banner, scribeTried: st.banner, scribeAsking: null, scribeAt: Date.now(), scribeT0: Date.now(), scribePosts: [], ph: null, phSent: null, rdSent: null});
}
/* the reminder in the title bar, if BrewScribe takes a reading for it that Brew Day can show: BrewScribe's answer since
   it showed, its entry for the reminder, and the readings. A reminder whose readings are only the pH has the pH box
   (ph, rd its pH reading); any other has the readings box (rdHTML), with the readings it can show (rds) */
function phOffer(x = st.banner) {
  const A = st.scribe;
  if (!x || !A || st.scribeSeen !== x) return null;
  const rem = A.reminders.find(r => r.title === x.title), rds = rem ? rem.readings.filter(r => rdKnown(A, r)) : [];
  if (!rds.length) return null;
  return rds.every(r => r.kind === "ph") ? {A, rem, rd: rds[0], ph: true} : {A, rem, rd: rds[0], rds, ph: false};
}
/* why BrewScribe can't take a reading, in its words, and the small line under RECORD pH that says so */
const phCant = o => !o.A.log ? {why: o.A.why_not || PH_NOLOG, small: "no BrewScribe log"}
  : o.rem.vessel_problem ? {why: `${o.rem.vessel_problem} Record it on BrewScribe's page.`, small: "on BrewScribe's page"} : null;
const phUnit = A => A.temperature_unit === "f" ? "°F" : A.temperature_unit === "c" ? "°C" : null;
/* where the keys start: the recipe's target, else 5.40; the sample's at a cooled sample's usual temperature */
const phFrom = rd => rd.target != null ? +rd.target : 5.4;
const phTFrom = A => A.temperature_unit === "c" ? 20 : 68;
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
  const ok = b(`act sec${failed ? " failed" : ""}`, sending ? "SENDING…" : "OK", failed ? "tap to try again" : "", {cmd: x.cmd, why: wait, label: failed ? `OK: ${x.title} didn't close. Tap to try again` : ""});
  const small = cant ? cant.small : !o.ph ? rdRecSmall(o) : o.rd.saved ? `${o.rd.saved.text} recorded` : "for BrewScribe";
  return ok + b("act phrec", o.ph ? "RECORD pH" : rdRecWord(o), small, {cmd: "ph:open", why: wait || (open || !cant ? "" : cant.why), expanded: open, controls: "ph-box"});
}
/* why SAVE waits or is greyed: no connection, a command on its way, BrewScribe unable to take a reading, no reading yet,
   a figure outside what BrewScribe accepts, or a sample's temperature that isn't a figure (the readings box: rdSaveWhy) */
function phSaveWhy(o) {
  if (!o.ph) return rdSaveWhy(o);
  const P = st.ph, rd = o.rd, dec = rd.decimals ?? 2, v = phNum(P.txt, dec), cant = phCant(o);
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
let phGoLast = "";
function phGoHTML(o) {
  if (!o.ph) return rdGoHTML(o);
  const dec = o.rd.decimals ?? 2, v = phNum(st.ph.txt, dec);
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
   stage already; the pH's keys round its figure, as TARGET's are, with the recipe's target at the right; the sample's
   temperature where the reminder asks for it; the line for what went wrong; SAVE and CANCEL; and a quiet way to
   BrewScribe's page instead. While SAVE waits, everything in it waits too. Any other reminder has the readings box
   (rdHTML) */
function phHTML() {
  const P = st.ph, o = phOffer() || P.o;
  if (!o.ph) return rdHTML(o);
  const {A, rem, rd} = o, dec = rd.decimals ?? 2, U = phUnit(A), tg = rd.target != null;
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
    + `<p class="phhelp" id="pht-h">If you took it: type it, or step from ${phTFrom(A)} ${U}.</p><p class="phwarm" id="phw">${phWarm(o)}</p></div>`;
  phGoLast = phGoHTML(o);
  return `<h2 class="pht" id="ph-t">MASH pH</h2><p class="phfor">For BrewScribe's log: ${esc(rem.stage_name)}${rem.vessel ? `, ${esc(rem.vessel)}` : ""}.</p>`
    + (rd.saved ? `<p class="phhad">BrewScribe has ${esc(rd.saved.text)} for ${esc(rem.stage_name)}. A new reading here is kept as well, as the latest.</p>` : "")
    + `<div class="phmid">${pH}${temp}</div><p class="note" id="ph-note">${esc(st.notes.ph || P.err || "")}</p>`
    + `<div class="phact">${phGoLast}${b("cmdbtn", "CANCEL", "", {cmd: "ph:x", why})}</div>`
    + b("phpage", `ON BREWSCRIBE'S PAGE${EXT_ICON}<span class="sr"> (opens ${esc(rem.stage_name)} in BrewScribe's tab)</span>`, "", {cmd: "ph:page", why});
}
/* the box drawn again, keeping what has focus in it, a typed figure's caret included, then fitted under the reminder */
function phDraw() {
  const box = $("#ph-box"), P = st.ph, o = phOffer();
  if (!(P && P.open && (o || st.pend.ph))) { if (!box.hidden) { box.hidden = true; box.innerHTML = ""; } return; }
  if (o) P.o = o;
  const fa = document.activeElement, inn = !!fa && box.contains(fa);
  const sel = inn ? (fa.id ? "#" + fa.id : fa.dataset.cmd ? `[data-cmd="${fa.dataset.cmd}"]` : "") : "", rng = inn && fa.tagName === "INPUT" ? [fa.selectionStart, fa.selectionEnd] : null;
  box.innerHTML = phHTML(); box.hidden = false;
  if (sel) { const n = box.querySelector(sel); if (n) { n.focus({preventScroll: true}); if (rng) try { n.setSelectionRange(...rng); } catch (_) {} } }
  phFit();
}
/* from 701 px wide the box drops under the reminder, right-aligned to its right edge and clear of it (MASH pH sits in
   the box's top edge), kept inside the window; where the window is too short for it, its middle scrolls. On a phone it
   is in the page under the reminder (brew-day.css) */
const PHONE = matchMedia("(max-width:700px)");
function phFit() {
  const box = $("#ph-box");
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
  const over = r.bottom - (innerHeight - 8);
  if (over > 0 && mid) mid.style.maxHeight = `${Math.max(120, mid.getBoundingClientRect().height - over)}px`;
}
/* on a phone, where the screen tabs are fixed along the foot, a box opening in the page (BrewStart's, the pH and
   readings box) comes into view by the least scrolling: all of it, from the title set into its top edge to its foot,
   between the window's top and the tabs, 8 px clear of each. A box taller than that goes to the window's top, so its
   title and first figure show and its main button is a scroll away. A box already in view doesn't move the page */
function boxInView(box) {
  if (!box || box.hidden || !PHONE.matches) return;
  const tabs = $(".tabs"), foot = (tabs ? tabs.getBoundingClientRect().top : innerHeight) - 8, R = box.getBoundingClientRect();
  const t = box.querySelector(":scope > .bst, :scope > .pht"), top = Math.min(R.top, t ? t.getBoundingClientRect().top : R.top);
  const d = R.bottom - top > foot - 8 ? top - 8 : R.bottom > foot ? R.bottom - foot : top < 8 ? top - 8 : 0;
  if (d) window.scrollBy(0, d > 0 ? Math.ceil(d) : Math.floor(d));
}
/* as each reminder shows, Brew Day asks BrewScribe about it (phAsk); the box goes with its reminder, answered here or
   elsewhere or taken down, unless its SAVE is on its way */
function phCheck() {
  const x = st.banner;
  if (x && x.tone === "prompt" && st.scribeSeen !== x && st.scribeTried !== x && st.link !== "lost") phAsk();
  if (st.ph && !st.pend.ph && !(x && x.title === st.ph.title && phOffer(x))) st.ph = null;
}
/* GET /brewscribe/api/brew-day/readings, simulated: BrewScribe's answer within a second (600 ms); with the moment's get
   "none", no answer, so the screen keeps what BrewScribe said last and asks again 15 s on. 404, where BrewScribe isn't
   installed, is an answer: nothing to offer. The screen is drawn again only where what it shows changes */
function phAsk() {
  const x = st.banner, none = st.scribeMock.get === "none";
  Object.assign(st, {scribeAsking: x, scribeTried: x, scribeAt: Date.now()});
  timers.push(setTimeout(() => {
    if (st.scribeAsking !== x) return;
    st.scribeAsking = null;
    if (none) return;
    const was = phView();
    st.scribe = phCopy(st.bscribe); st.scribeSeen = x;
    if (phView() !== was) renderAll();
  }, none ? 5000 : 600));
}
/* what the screen shows from BrewScribe for the reminder in the title bar */
function phView() { const o = phOffer(); return o ? JSON.stringify([o.A.log, o.A.why_not, o.A.temperature_unit, o.A.volume_unit, o.A.volume_label, o.rem]) : ""; }
/* every real second: a reading typed on BrewScribe's own page reaches BrewScribe at the moment's time (page), and while a
   reminder BrewScribe names is up, or one it hasn't answered for, Brew Day asks again every 15 s */
function phPoll() {
  if (!st || !st.scribeMock) return;
  const M = st.scribeMock, x = st.banner;
  if (M.page && Date.now() - st.scribeT0 >= M.page.after * 1000) { scribePage(M.page); M.page = null; }
  if (!x || x.tone !== "prompt" || st.scribeAsking || st.link === "lost" || (st.scribeSeen === x && !phOffer(x))) return;
  if (Date.now() - st.scribeAt >= PH_ASK * 1000) phAsk();
}
/* a reading saved on BrewScribe's page for reminder i's stage, which becomes the one standing there: the pH, or another
   kind's (kind, with what else it needs in r) */
function scribePage(p) {
  const S = st.bscribe, rem = S && S.log && S.reminders[p.i];
  if (rem && p.kind && p.kind !== "ph") return rdApply(S, rem.title, Object.assign({entry_id: phUUID(), kind: p.kind, value: p.value, unit: S.volume_unit}, p.r));
  const rd = rem && rem.readings[0];
  if (rd) rd.saved = {entry_id: phUUID(), value: p.value, text: `pH ${p.value.toFixed(rd.decimals)}`, occurred_at: new Date().toISOString()};
}
/* CraftBeerPi raising reminder i in its own time: its line in LOG, said aloud; RECORD pH comes with BrewScribe's answer
   to the ask its showing starts */
function phRaise(i) {
  st.banner = phBanner(i);
  logEvent(`${PH_Q[i].title}: ${PH_Q[i].text}`, "waiting for you", "wait");
  say(`${PH_Q[i].title}. ${PH_Q[i].text}`, true);
  renderAll();
}
/* RECORD pH: the box opens under the reminder, LOG's list closing (one at a time), the pH empty and focus in it with its
   text selected, and on a phone the page brings the box into view (boxInView); pressed again, it closes. A moment can open it with figures typed, BrewScribe's sentence from a SAVE
   that didn't go, and the entry that SAVE sent (o). The readings box opens the same way, focus in its first figure,
   with the gravity's pair BrewScribe starts it in and the sparge water from the HLT's levels; a moment can give it its
   figures (f), pair (pick), readings added with "+" (add), way, the entries an earlier SAVE sent (sent, by kind), a
   figure to focus, and SAVE tapped while greyed (go) */
function phOpen(o = {}) {
  const x = st.banner, f = phOffer(x);
  if (!f || st.pend.ph) return;
  if (st.ph && st.ph.open && !o.moment) return phClose();
  st.logOpen = false; st.notes.ph = "";
  st.ph = {title: x.title, open: true, txt: o.txt || "", ttxt: o.ttxt || "", err: o.err || "", o: f};
  if (!f.ph) { const g = rdOf(f, "gravity"); Object.assign(st.ph, {f: Object.assign({}, o.f), add: (o.add || []).slice(), way: o.way || "levels", pick: o.pick || (g ? rdPair(rdPick(g, null)) : "")}); }
  if (o.sent) { if (f.ph) st.phSent = {key: phBody(f).key, id: o.sent}; else st.rdSent = rdSentFor(f, o.sent); }
  renderAll();
  setTimeout(() => { const i = f.ph ? $("#phin") : $(o.focus ? "#" + o.focus : "#ph-box .phmid input"); if (i) { i.focus({preventScroll: PHONE.matches}); i.select(); } boxInView($("#ph-box")); }, 0);
  if (o.go) setTimeout(() => { const g = $("#ph-box .phgo"); if (g && g.getAttribute("aria-disabled") === "true") explain(g); }, 0);
}
/* CANCEL, Escape and RECORD pH pressed again close the box and keep nothing, focus back on RECORD pH; not while SAVE
   waits, which can't be called back */
function phClose() {
  if (!st.ph || st.pend.ph) return;
  st.ph = null; renderAll();
  setTimeout(() => $('#banner [data-cmd="ph:open"]')?.focus({preventScroll: true}), 0);
}
/* LOG's list and the box, one at a time: LOG opened closes the box, keeping nothing; while its SAVE waits the box only
   steps out of sight, and comes back if BrewScribe doesn't take the reading */
function phLogOpened() { if (st.ph) { if (st.pend.ph) st.ph.open = false; else st.ph = null; } }
/* the keys: −.1 −.01 +.01 +.1 from the pH typed, or from the recipe's target, else 5.40, while there is none, kept within
   what BrewScribe accepts; −1 −.1 +.1 +1 for the sample, from 68 °F. The new figure is said aloud. In the readings box,
   each figure's own keys (rdStep) */
function phStep(k, d) {
  const P = st.ph, o = P && (phOffer() || P.o);
  if (!o || st.pend.ph) return;
  if (!o.ph) return rdStep(o, k, d);
  const rd = o.rd, dec = rd.decimals ?? 2;
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
/* typing in the box: SAVE and the sample's range line follow the figures in place, so the caret stays where it is (the
   readings box: rdPatch) */
function phPatch() {
  const o = st.ph && (phOffer() || st.ph.o), go = $("#ph-box .phgo"), w = $("#phw");
  if (!o) return;
  if (!o.ph) return rdPatch(o);
  const h = phGoHTML(o);
  if (go && h !== phGoLast) { go.outerHTML = h; phGoLast = h; }
  if (w) { const t = phWarm(o); if (w.textContent !== t) w.textContent = t; }
  phFit();
}
/* what SAVE sends: the reading to its decimals, and the sample's temperature with its unit when one is given. key: its
   content, so the same reading sent again keeps its entry_id */
function phBody(o) {
  const P = st.ph, v = phNum(P.txt, o.rd.decimals ?? 2), t = phTemp(o) && P.ttxt.trim() ? phNum(P.ttxt, 1) : null, u = t == null ? null : o.A.temperature_unit;
  const day = o.A.log ? o.A.log.day_id : null, body = {entry_id: null, day_id: day, title: P.title, kind: "ph", value: v};
  if (t != null) Object.assign(body, {temperature: t, temperature_unit: u});
  return {body, key: phKey(day, P.title, v, t, u)};
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
  let body, what;
  if (o.ph) {
    const r = phBody(o);
    if (!st.phSent || st.phSent.key !== r.key) st.phSent = {key: r.key, id: phUUID()};
    body = r.body; body.entry_id = st.phSent.id;
  } else ({body, what} = rdBody(o));
  P.err = ""; st.notes.ph = ""; st.pend.ph = "post";
  renderAll();
  phPost(body, (code, res) => phAnswer(code, res, body, x, what));
}
/* POST /brewscribe/api/brew-day/readings, simulated: BrewScribe's answer about half a second on (scribeTake), unless the
   moment has it refuse ({status, error, reason}), not answer ("none"), or save it and lose the answer ("lost"). Brew
   Day waits 5 s for an answer */
function phPost(body, done) {
  st.scribePosts.push(phCopy(body));
  const M = st.scribeMock, how = M.post.length ? M.post.shift() : null;
  if (how === "none" || how === "lost") {
    if (how === "lost") scribeTake(body);
    return timers.push(setTimeout(() => done(0, null), 5000));
  }
  timers.push(setTimeout(() => how ? done(how.status, {error: how.error, reason: how.reason}) : done(...scribeTake(body)), 500));
}
/* BrewScribe taking a reading, as its call does: the same entry again answers 200 and saves nothing; no log open, a log
   that isn't the open one any more, a vessel it can't tell, or an entry_id saved with other figures are refused (409);
   a value outside its range is a bad request (400). Saved, it is the reading standing in that stage. Draft 5's body,
   with its readings, is rdTake's */
function scribeTake(b) {
  if (b.readings) return rdTake(b);
  const S = st.bscribe, M = st.scribeMock;
  if (!S) return [404, null];
  const rem = S.reminders.find(r => r.title === b.title), rd = rem && rem.readings.find(r => r.kind === b.kind);
  if (!rd) return [400, {error: `BrewScribe takes no ${b.kind} reading for ${b.title}`}];
  if (typeof b.value !== "number" || b.value < rd.min || b.value > rd.max) return [400, {error: `pH must be between ${rd.min} and ${rd.max}`}];
  const key = phKey(b.day_id, b.title, b.value, b.temperature ?? null, b.temperature_unit ?? null), text = `pH ${b.value.toFixed(rd.decimals)}`;
  const ok = () => ({entry_id: b.entry_id, day_id: b.day_id, stage: rem.stage, vessel: rem.vessel, text: `${text} saved in BrewScribe (${rem.stage_name}, ${rem.vessel})`});
  if (M.ids[b.entry_id] != null) return M.ids[b.entry_id] === key ? [200, ok()] : [409, {error: "BrewScribe already has a different reading saved under this one's ID, so this one wasn't saved.", reason: "entry_id_reused"}];
  if (!S.log) return [409, {error: S.why_not, reason: "no_open_log"}];
  if (S.log.day_id !== b.day_id) return [409, {error: "BrewScribe's open log has changed, so this reading wasn't saved. Check BrewScribe's page, then try again.", reason: "log_changed"}];
  if (rem.vessel_problem) return [409, {error: `${rem.vessel_problem} This reading wasn't saved: record it on BrewScribe's page.`, reason: "vessel_unknown"}];
  M.ids[b.entry_id] = key;
  rd.saved = {entry_id: b.entry_id, value: b.value, text, occurred_at: new Date().toISOString()};
  return [201, ok()];
}
/* BrewScribe's answer to SAVE. Saved (201, or 200 for the same entry again): Brew Day's copy has it at once, so RECORD
   says so, and the reminder closes as OK closes it, unless it went on another screen meanwhile, or, from the readings
   box, something it asks for is still to come (rdStays). Refused, or no answer in 5 s: nothing closes, the box says why
   above SAVE, LOG says it failed (what: the readings box's words for what it sent), and after a 409 Brew Day asks
   BrewScribe again */
function phAnswer(code, res, body, x, what) {
  const P = st.ph, v = body.readings ? what : `pH ${body.value.toFixed(2)}`;
  if (code === 200 || code === 201) {
    phHad(body);
    st.phSent = null; st.rdSent = null;
    if (body.readings && st.banner === x && !rdDone(x)) return rdStays(res.text);
    if (st.banner === x) { st.pend.ph = "close"; renderAll(); return phAck(closed => phDone(res.text, x, closed)); }
    return phDone(res.text, x, null);
  }
  delete st.pend.ph;
  const why = code === 0 ? PH_SLOW : (res && res.error) || "BrewScribe didn't take the reading.";
  logEvent(code === 0 ? `${v} may not be saved in BrewScribe` : `${v} not saved in BrewScribe`, code === 0 ? "failed: no answer in 5 s" : "failed", "bad");
  if (code === 409) phAsk();
  if (st.banner !== x || !P) { st.ph = null; renderAll(); return phOther(x); }
  Object.assign(P, {err: why, open: true});
  st.logOpen = false;
  say(why, true);
  renderAll();
}
/* the reading BrewScribe now has, in Brew Day's copy; from the readings box, each of them */
function phHad(b) {
  if (b.readings) { if (st.scribe) b.readings.forEach(r => rdApply(st.scribe, b.title, r)); return; }
  const rem = st.scribe && st.scribe.reminders.find(r => r.title === b.title), rd = rem && rem.readings.find(r => r.kind === b.kind);
  if (rd) rd.saved = {entry_id: b.entry_id, value: b.value, text: `pH ${b.value.toFixed(rd.decimals)}`, occurred_at: new Date().toISOString()};
}
/* OK on these reminders: CraftBeerPi's own button, which it runs for every screen, so the reminder goes from all of them;
   for BrewScribe's reminder it is also how BrewScribe knows it was seen. SAVE closes the reminder the same way (after).
   With no answer in 5 s the reminder stays and OK shows it failed, as any failed command's button does */
function phAck(after) {
  const x = st.banner;
  if (!x || st.pend.b) return;
  st.pend.b = "ok"; x.ackFailed = false;
  renderAll();
  const M = st.scribeMock, fail = M.ack.length ? M.ack.shift() === "none" : false;
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
/* SAVE done: the box closes, and BrewScribe's sentence goes in LOG, on top of CraftBeerPi's answer, and is said aloud;
   focus goes to LOG. If OK didn't close the reminder, the reminder stays, with "pH 5.42 recorded" under RECORD pH and
   its failure on OK */
function phDone(text, x, closed) {
  delete st.pend.ph; st.ph = null;
  logEvent(text, "confirmed", "ok");
  say(closed === false ? `${text}. ${x.title} didn't close: OK got no answer in 5 s.` : `${text}: confirmed`, closed === false);
  renderAll();
  setTimeout(() => $("#event .logbtn")?.focus({preventScroll: true}), 0);
}
/* the box closed because the reminder was answered on another screen: it says so, and that nothing was sent */
function phOther(x, here = true) {
  const w = `${x.title} was answered on another screen, so nothing was saved here.`;
  toast(w); say(w);
  if (here) setTimeout(() => $("#event .logbtn")?.focus({preventScroll: true}), 0);
}
/* the mockup: CraftBeerPi telling this screen the reminder was answered on another (a moment's phElse). Its line says
   "answered" and one line says where; an open box closes, unless its SAVE is on its way, whose answer then decides
   (phAnswer) */
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
  if (x === "step") return phStep(k, parseFloat(d));
  if (x === "pick") return rdChoose(+k);
  if (x === "add") return rdAdd(k);
  if (x === "way") return rdWay();
  if (x === "page") {
    const o = phOffer() || (st.ph && st.ph.o), what = !o || o.ph ? "pH" : RD_NAME[(rdParts(o).parts[0] || o.rds[0]).kind];
    return toast(`Mockup: this opens ${o ? `${o.rem.stage_name} on BrewScribe's page` : "BrewScribe's page"} in BrewScribe's own tab, with the cursor in its ${what} box${o ? ` (${o.rem.page})` : ""}.`);
  }
}
/* ---------- every BrewScribe reminder that asks for a reading (READINGS-ENTRY.md) ----------
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
/* the readings Brew Day can show: the kinds it knows, a gravity with its choices, and volumes only in a unit BrewScribe
   gives */
const rdKnown = (A, r) => r.kind === "ph" || (r.kind === "gravity" && !!(r.choices && r.choices.length)) || (RD_VOLS.includes(r.kind) && (A.volume_unit === "us_gal" || A.volume_unit === "l"));
/* each kind in the box's words: "the reminder stays for the gravity", "gravity to come" */
const RD_NAME = {ph: "pH", gravity: "gravity", volume: "volume", level: "level", sparge_water: "sparge water"};
const RD_PLUS = {ph: "+ pH", gravity: "+ GRAVITY", volume: "+ VOLUME", level: "+ LEVEL", sparge_water: "+ SPARGE WATER"};
/* a list in words: "a", "a and b", "a, b and c" */
const rdJoin = L => L.length < 2 ? L.join("") : `${L.slice(0, -1).join(", ")} and ${L[L.length - 1]}`;
/* the gravity's pair as one key; a reading in the box by its kind; a reading's content, which keeps its entry_id while
   it's unchanged; and a figure as typed, by its key (v and t the pH's, as the pH box keeps them) */
const rdPair = c => `${c.instrument}:${c.scale}`;
const rdOf = (o, kind) => o.rds.find(r => r.kind === kind);
const rdKey = (day, title, r) => JSON.stringify([day, title, r]);
const rdTxt = (P, k) => k === "v" ? P.txt : k === "t" ? P.ttxt : (P.f[k] || "");
function rdPut(P, k, s) { if (k === "v") P.txt = s; else if (k === "t") P.ttxt = s; else P.f[k] = s; }
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
  const added = [...((P && P.add) || []).map(k => rdOf(o, k)), ...o.rds.filter(r => rdTyped(P, r.kind))].filter((r, i, L) => r && !first.includes(r) && L.indexOf(r) === i);
  const parts = [...first, ...added];
  return {parts, more: o.rds.filter(r => !parts.includes(r))};
}
/* the figures in a reading's part, in the box's order */
function rdKeys(o, rd) {
  if (rd.kind === "ph") return rdTempOn(o, rd) ? ["v", "t"] : ["v"];
  if (rd.kind === "gravity") return rdTempOn(o, rd) ? ["g", "gt"] : ["g"];
  if (rd.kind === "volume") return ["vol"];
  if (rd.kind === "level") return ["lvl"];
  return st.ph.way === "volume" ? ["spv"] : rd.level_before ? ["aft"] : ["bef", "aft"];
}
/* the HLT's level before the sparge: the one BrewScribe keeps, else the one typed in the box */
function rdBefore(o, rd = rdOf(o, "sparge_water")) {
  return rd.level_before ? rd.level_before.value : phNum(rdTxt(st.ph, "bef"), rd.decimals ?? 2);
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
  const own = rd => rd.target && rd.target.unit === vu ? rd.target.value : null;
  if (k === "v") { const rd = rdOf(o, "ph"); return {rd, dec: rd.decimals ?? 2, min: rd.min, max: rd.max, from: phFrom(rd), keys: [-0.1, -0.01, 0.01, 0.1], unit: "pH", name: "pH"}; }
  if (k === "t") return T(rdOf(o, "ph"));
  if (k === "gt") return T(rdOf(o, "gravity"));
  if (k === "g") {
    const rd = rdOf(o, "gravity"), c = rdPick(rd, st.ph), t = rd.target;
    return {rd, c, dec: c.decimals, min: c.min, max: c.max, from: t && t.scale === c.scale ? t.value : c.usual.start, keys: c.decimals > 2 ? [-0.01, -0.001, 0.001, 0.01] : [-1, -0.1, 0.1, 1], unit: c.label, name: c.label};
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
      const F = rdField(o, rd.kind === "volume" ? "vol" : rd.kind === "level" ? "lvl" : "spv"), v = fig(rd.kind === "volume" ? "vol" : rd.kind === "level" ? "lvl" : "spv", F);
      if (v == null) return;
      const text = `${v.toFixed(F.dec)} ${vl}`;
      return list.push({rd, send: {kind: rd.kind, value: v, unit: A.volume_unit}, text, log: rd.kind === "level" ? `${F.name} ${text}` : rd.kind === "sparge_water" ? `Sparge water ${text}` : ""});
    }
    const Fa = rdField(o, "aft"), a = fig("aft", Fa), kept = rd.level_before, b = kept ? kept.value : fig("bef", rdField(o, "bef"));
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
  return b("cmdbtn phgo", st.pend.ph ? "SAVING…" : n === 0 ? "SAVE – –" : n === 1 ? `SAVE ${R.list[0].text}` : `SAVE ${n} READINGS`, rdGoSmall(o, R), {cmd: "ph:save", why: rdSaveWhy(o)});
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
  return `${RD_VOLS.includes(r.kind) ? rdAmt(r.saved, o.A) : r.saved.text} recorded`;
}
/* what BrewScribe has for the stage already, in its words; for the level before the sparge, the level it keeps */
function rdHad(o) {
  const lv = rdOf(o, "level"), has = o.rds.filter(r => r.saved);
  if (lv && lv.saved) return `BrewScribe is keeping the ${o.rem.vessel || "HLT"}'s level before the sparge, ${rdAmt(lv.saved, o.A)}. A new one here replaces it.`;
  if (!has.length) return "";
  return `BrewScribe has ${rdJoin(has.map(r => r.saved.text))} for ${o.rem.stage_name}. ${has.length > 1 ? "New readings here are kept as well, as the latest." : "A new reading here is kept as well, as the latest."}`;
}
/* the readings box: the pH box's anatomy, titled with the stage's name in capitals; for BrewScribe's log, the stage and
   vessel; what BrewScribe has for it; a part for each reading still to come, each figure with its label (the recipe's
   target at the right), its keys round it, a help line saying where they start, and a Note Amber line for what to
   check; the gravity's three pairs over its figure; the others a "+" away; what SAVE sends where it's more than one;
   the line for what went wrong; SAVE and CANCEL; and the way to BrewScribe's page. While SAVE waits, everything in it
   waits too. Lines that follow what's typed are data-live (rdPatch) */
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
    else h = (rd.level_before ? `<p class="rdkept">Before the sparge: ${esc(ves)} ${esc(rd.level_before.text)}, kept in BrewScribe.</p>`
        : fig("bef", {lab: `${esc(ves)} level before, ${vl}`, help: F => `As you read it before the sparge: type it, or step from ${from(F)}.`}))
      + fig("aft", {lab: `${esc(ves)} level after, ${vl}`, tgt: tg, help: F => `Read it now the sparge is done: type it, or step from ${from(F)}.`, lines: [["rdeq", "rdaft-eq", rdSpargeLine(o)]]})
      + b("rdq rdway", "TYPE THE SPARGE VOLUME INSTEAD", "", {cmd: "ph:way", why});
    return `<div class="rdpart" data-part="${k}">${h}</div>`;
  };
  const {parts, more} = rdParts(o, P), R = rdReads(o), had = rdHad(o);
  const also = !more.length ? "" : `<div class="rdalso" role="group" aria-labelledby="rd-also"><span id="rd-also">Also:</span>${more.map(r => b("rdq", RD_PLUS[r.kind], "", {cmd: `ph:add:${r.kind}`, why})).join("")}</div>`;
  phGoLast = rdGoHTML(o);
  return `<h2 class="pht" id="ph-t">${esc(rem.stage_name.toUpperCase())}</h2><p class="phfor">For BrewScribe's log: ${esc(rem.stage_name)}${rem.vessel ? `, ${esc(rem.vessel)}` : ""}.</p>`
    + (had ? `<p class="phhad">${esc(had)}</p>` : "")
    + `<div class="phmid">${parts.map(part).join("")}${also}</div>`
    + `<p class="rdsaves" id="rd-saves" data-live>${esc(R.list.length > 1 ? `Saves ${rdJoin(R.list.map(r => r.text))}.` : "")}</p>`
    + `<p class="note" id="ph-note">${esc(st.notes.ph || P.err || "")}</p>`
    + `<div class="phact">${phGoLast}${b("cmdbtn", "CANCEL", "", {cmd: "ph:x", why})}</div>`
    + b("phpage", `ON BREWSCRIBE'S PAGE${EXT_ICON}<span class="sr"> (opens ${esc(rem.stage_name)} in BrewScribe's tab)</span>`, "", {cmd: "ph:page", why});
}
/* typing in the box: SAVE and the lines that follow the figures (data-live) change in place, so the caret stays where
   it is */
function rdPatch(o) {
  const box = $("#ph-box"), T = document.createElement("div");
  T.innerHTML = rdHTML(o);
  box.querySelectorAll("[data-live]").forEach(n => { const m = T.querySelector("#" + n.id); if (m && n.textContent !== m.textContent) n.textContent = m.textContent; });
  const go = box.querySelector(".phgo"), g = T.querySelector(".phgo");
  if (go && g && go.outerHTML !== g.outerHTML) go.replaceWith(g);
  phFit();
}
/* a key pressed: from the figure typed, or where the keys start while there is none, kept within what BrewScribe
   accepts; the new figure is said aloud, with what it questions or works out */
function rdStep(o, k, d) {
  const P = st.ph, F = rdField(o, k), f = 10 ** F.dec;
  rdPut(P, k, Math.min(F.max, Math.max(F.min, Math.round(((phNum(rdTxt(P, k), F.dec) ?? F.from) + d) * f) / f)).toFixed(F.dec));
  const more = [rdCheckLine(o, k), k === "aft" || k === "bef" ? rdSpargeLine(o) : k === "g" ? rdAbout(o) : ""].filter(Boolean).join(" ");
  say(`${k === "v" ? `pH ${P.txt}` : `${rdTxt(P, k)} ${F.unit}`}${more ? `. ${more}` : ""}`);
  renderAll();
}
/* a gravity pair chosen: its figure empties, as a figure in one scale means something else in another; the sample's
   temperature stays. Said aloud */
function rdChoose(i) {
  const P = st.ph, o = P && (phOffer() || P.o), rd = o && !o.ph ? rdOf(o, "gravity") : null, c = rd && rd.choices[i];
  if (!c || st.pend.ph) return;
  if (rdPair(c) !== P.pick) { P.pick = rdPair(c); P.f.g = ""; }
  say(`${c.label}, ${c.instrument}`);
  renderAll();
}
/* the arrow keys move the gravity's choice, as in any group of radio buttons, focus going with it */
function rdPickStep(dir) {
  const P = st.ph, o = P && (phOffer() || P.o), rd = o && !o.ph ? rdOf(o, "gravity") : null;
  if (!rd || st.pend.ph) return;
  const n = rd.choices.length, j = (rd.choices.indexOf(rdPick(rd, P)) + dir + n) % n;
  rdChoose(j);
  $(`#ph-box [data-cmd="ph:pick:${j}"]`)?.focus();
}
/* "+ pH", "+ VOLUME": that reading's part in the button's place, focus in its figure */
function rdAdd(kind) {
  const P = st.ph;
  if (!P || !P.add || st.pend.ph || P.add.includes(kind)) return;
  P.add.push(kind); renderAll();
  setTimeout(() => { const i = $(`#ph-box [data-part="${kind}"] input`); if (i) i.focus(); }, 0);
}
/* TYPE THE SPARGE VOLUME INSTEAD, and back: one way or the other is sent, never both. What was typed the other way
   stays, for a change of mind. Focus goes to the way's first figure */
function rdWay() {
  const P = st.ph;
  if (!P || !P.f || st.pend.ph) return;
  P.way = P.way === "volume" ? "levels" : "volume"; renderAll();
  setTimeout(() => { const i = $('#ph-box [data-part="sparge_water"] input'); if (i) i.focus(); }, 0);
}
/* what SAVE sends for these reminders (draft 5): the readings SAVE names, each with an entry_id. A reading sent again
   as it was keeps its entry_id, so a SAVE again after no answer saves nothing twice; a changed one gets a new one.
   what: its words for LOG, should it not be saved */
function rdBody(o) {
  const P = st.ph, R = rdReads(o), day = o.A.log ? o.A.log.day_id : null, sent = st.rdSent || {};
  const readings = R.list.map(r => {
    const key = rdKey(day, P.title, r.send), k = r.send.kind, id = sent[k] && sent[k].key === key ? sent[k].id : phUUID();
    sent[k] = {key, id};
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
  setTimeout(() => $('#banner [data-cmd="ph:open"]')?.focus({preventScroll: true}), 0);
}
/* every reading the reminder asks for recorded, in Brew Day's copy of BrewScribe's answer */
function rdDone(x) { const o = phOffer(x); return !o || o.ph || o.rds.filter(r => r.asked).every(r => r.saved); }
/* BrewScribe's sentence for a SAVE: a level kept until the level after, the sparge water saved, or the readings saved,
   with the stage and vessel */
function rdSaid(rem, kind, texts) {
  const where = `(${rem.stage_name}, ${rem.vessel})`;
  return kind === "level" ? `${texts[0]} kept in BrewScribe until the level after ${where}` : kind === "sparge_water" ? `Sparge water ${texts[0]} saved in BrewScribe ${where}` : `${rdJoin(texts)} saved in BrewScribe ${where}`;
}
/* a reading BrewScribe has taken, in an answer's shape (BrewScribe's own, or Brew Day's copy of it): it becomes the one
   standing in its stage, on every reminder for that stage (the last reminder's older title too). A level is kept, not
   saved: the sparge water reminder works from it until the sparge water is saved, which takes it, and is then that
   reading's level before. A level kept in another unit than BrewScribe's volume_unit isn't offered to work from, as
   nothing is converted. A gravity's pair becomes the one to start in. Returns the reading's words */
function rdApply(S, title, r) {
  const rem = S.reminders.find(x => x.title === title), rd = rem && rem.readings.find(x => x.kind === r.kind);
  if (!rd) return "";
  const at = new Date().toISOString(), ves = rem.vessel || "HLT", all = k => S.reminders.flatMap(x => x.readings).filter(x => x.kind === k);
  const amt = v => rdAmt({value: v, unit: r.unit}, S);
  let saved;
  if (r.kind === "ph") saved = {entry_id: r.entry_id, value: r.value, text: `pH ${r.value.toFixed(rd.decimals ?? 2)}`, occurred_at: at};
  else if (r.kind === "gravity") {
    const c = rd.choices.find(x => x.instrument === r.instrument && x.scale === r.scale);
    saved = {entry_id: r.entry_id, value: r.value, instrument: r.instrument, scale: r.scale, text: `${r.value.toFixed(c.decimals)} ${c.label}`, occurred_at: at};
    all("gravity").forEach(x => rdChosen(x, r));
  } else if (r.kind === "volume") saved = {entry_id: r.entry_id, value: r.value, unit: r.unit, text: amt(r.value), occurred_at: at};
  else if (r.kind === "level") {
    saved = {value: r.value, unit: r.unit, text: `${ves} ${amt(r.value)} before the sparge`};
    all("sparge_water").forEach(x => { x.level_before = r.unit === S.volume_unit ? {value: r.value, text: amt(r.value)} : null; });
  } else {
    const levels = r.level_after != null, before = levels ? r.level_before ?? rd.level_before.value : null, dec = (r.unit || S.volume_unit) === "l" ? 1 : 2;
    const value = levels ? Number((before - r.level_after).toFixed(dec)) : r.value;
    saved = {entry_id: r.entry_id, value, unit: r.unit, level_before: before, level_after: levels ? r.level_after : null,
      text: levels ? `${amt(value)} (${ves} ${before.toFixed(dec)} → ${r.level_after.toFixed(dec)})` : amt(value), occurred_at: at};
    all("sparge_water").forEach(x => { x.level_before = null; });
    all("level").forEach(x => { x.saved = levels ? {value: before, unit: r.unit, text: `${ves} ${amt(before)} before the sparge`} : null; });
  }
  S.reminders.filter(x => x.stage === rem.stage).forEach(x => x.readings.filter(y => y.kind === r.kind).forEach(y => { y.saved = Object.assign({}, saved); }));
  return saved.text;
}
/* a volume, level or sparge water in the unit it's in, to that unit's decimals: "6.40 gal", "37.9 L" (BrewScribe's own
   label for its volume_unit) */
function rdAmt(s, A) {
  const l = (s.unit || A.volume_unit) === "l";
  return `${s.value.toFixed(l ? 1 : 2)} ${(s.unit || A.volume_unit) === A.volume_unit && A.volume_label ? A.volume_label : l ? "L" : "gal"}`;
}
/* why BrewScribe refuses one reading of draft 5's body (400), in its words; "" when it takes it */
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
/* BrewScribe taking draft 5's body, as its call does: all or nothing. A reading that reminder doesn't take, two of one
   kind, a pair it doesn't offer, a figure outside its range or levels it can't work from are a bad request (400), in its
   words; an entry_id saved with other figures, no log open, a log that isn't the open one any more or a vessel it can't
   tell are refused (409). The same readings again answer 200 and save nothing. Saved (201), each is the one standing in
   its stage */
function rdTake(b) {
  const S = st.bscribe, M = st.scribeMock;
  if (!S) return [404, null];
  const rem = S.reminders.find(r => r.title === b.title), L = Array.isArray(b.readings) ? b.readings : [];
  if (!rem) return [400, {error: `BrewScribe takes no readings for ${b.title}`}];
  if (!L.length) return [400, {error: "Send at least one reading."}];
  if (new Set(L.map(r => r.kind)).size < L.length) return [400, {error: "Send one reading of each kind at most."}];
  for (const r of L) { const why = rdRefuse(S, rem, r); if (why) return [400, {error: why}]; }
  const keys = L.map(r => rdKey(b.day_id, b.title, Object.fromEntries(Object.entries(r).filter(([k]) => k !== "entry_id")))), said = M.said || (M.said = {});
  if (L.some((r, i) => M.ids[r.entry_id] != null && M.ids[r.entry_id] !== keys[i])) return [409, {error: "BrewScribe already has a different reading saved under this one's ID, so this one wasn't saved.", reason: "entry_id_reused"}];
  const ok = texts => ({day_id: b.day_id, stage: rem.stage, vessel: rem.vessel, saved: L.map((r, i) => ({entry_id: r.entry_id, kind: r.kind, text: texts[i]})), text: rdSaid(rem, L[0].kind, texts)});
  if (L.every(r => M.ids[r.entry_id] != null)) return [200, ok(L.map(r => said[r.entry_id]))];
  if (!S.log) return [409, {error: S.why_not, reason: "no_open_log"}];
  if (S.log.day_id !== b.day_id) return [409, {error: "BrewScribe's open log has changed, so this reading wasn't saved. Check BrewScribe's page, then try again.", reason: "log_changed"}];
  if (rem.vessel_problem) return [409, {error: `${rem.vessel_problem} This reading wasn't saved: record it on BrewScribe's page.`, reason: "vessel_unknown"}];
  return [201, ok(L.map((r, i) => { if (M.ids[r.entry_id] == null) { M.ids[r.entry_id] = keys[i]; said[r.entry_id] = rdApply(S, b.title, r); } return said[r.entry_id]; }))];
}
/* CraftBeerPi raising BrewScribe's reminder i in its own time, as phRaise does the pH reminders */
function rdRaise(i) {
  st.banner = rdBanner(i);
  logEvent(`${RD_Q[i].title}: ${RD_Q[i].text}`, "waiting for you", "wait");
  say(`${RD_Q[i].title}. ${RD_Q[i].text}`, true);
  renderAll();
}
function cmdLoad(i, asked) {
  /* over a recipe the Recipe Book doesn't have, LOAD asks first (loadAskHTML); LOAD INSTEAD comes back here */
  if (!asked && loadAsks()) { st.confirmLoad = i; return renderAll(); }
  st.confirmLoad = null;
  /* LOAD in the book OTHER RECIPE (or ?col=new's CHOOSE A RECIPE) opened; the by-hand list loads as built */
  if (COL === "new" && st.rbOpen) return cmdLoad2(i);
  if (i !== 0) { renderAll(); return toast(`Mockup: only Test Recipe v5 is filled in here. On the real screen, LOAD sends ${BOOK[i].n} to Brew Steps, as the Recipe Book does today.`); }
  send("r:load", "load", `${BOOK[0].n} loaded`, () => { RECIPE.name = BOOK[0].n; st.recipe = {state: "ready", cur: 0, left: 0, adds: []}; st.finished = false; });
}
/* LOAD from the column's recipe book (by default; not with ?col=today): one LOADING… at the row pressed, the others
   greyed meanwhile; once CraftBeerPi has the recipe, the box closes and the column is the recipe, ready to start.
   Kettles, pumps and timers stay as they are. The strike water box starts again for the new recipe: the mockup has the
   numbers of v5 only */
function cmdLoad2(i) {
  const steps = i === 0 ? RECIPE_STEPS : BOOK_STEPS[i];
  if (!steps) return toast(`Mockup: ${BOOK[i].n} isn't filled in here. On the real screen, LOAD sends it to Brew Steps.`);
  send("r:load", String(i), `${BOOK[i].n} loaded`, () => {
    RECIPE.name = BOOK[i].n;
    RECIPE.steps = steps.map(s => Object.assign({}, s));
    st.recipe = {state: "ready", cur: 0, left: 0, adds: []};
    st.finished = false; st.book = i; st.rbOpen = false; st.cmpOpen = false;
    if (i !== 0) st.sw = null;
  });
}
/* ALL OFF: stop the recipe first so it can't switch a kettle back on, then every vessel to MANUAL,
   then both elements and both pumps off */
function cmdAllOff() {
  const running = st.recipe && st.recipe.state === "running";
  const cav = Object.keys(ACT).filter(id => ACT[id].override).map(id => `${ACT[id].name}'s override switch can still run it`).join(" · ");
  st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false; st.edit = null;
  send("alloff", "off", `ALL OFF: elements and pumps off, every vessel MANUAL${running ? ", recipe stopped" : ""}`, () => {
    if (running) st.recipe.state = "stopped";
    ["hlt", "mt", "bk"].forEach(v => { if (st.v[v].mode === "auto") setMode(v, "manual"); });
    Object.keys(ACT).forEach(id => setActor(id, false));
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
/* ---------- timers (?timers=new) ----------
   Timers rather than one rest timer, as many things use a timer during a brew day: several at once, added with a "+",
   each with a name and an alarm that can sound, and an alert that catches the eye but stays elegant when one runs out.
   Up to four, kept by CraftBeerPi on the brewing clock, so every screen shows the same ones (as the rest timer is),
   during a recipe as well as by hand. Modelled on a four-channel kitchen timer (ThermoWorks TimeStack): all four in
   view at once, a finished one pulses and counts up until it is answered, and OK puts it back to its own time, ready
   to start again. SOUND belongs to each screen: its timers and CraftBeerPi's alerts. */
const TMAX = 4, TPRE = [5, 10, 15, 20, 30, 60], TMINS = 300, TSECS = 5;
/* a removed timer can be put back for TUNDO real seconds, as CraftBeerPi offers it (TimersController.UNDO_FOR); CraftBeerPi
   keeps it 2 s more for an UNDO still on its way (UNDO_GRACE) */
const TUNDO = 5;
/* the names to pick come from CraftBeerPi's BREWDAY_TIMER_NAMES setting, sent with the timers as `names`, so the usual
   names are set up once; the editor offers them as buttons, and the name box takes any other name as well. TNAMES is
   its default; TNLEN a name's length; TNMAX how many buttons the editor has room for: two rows of three */
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
/* how long ago a timer ran out, while that is known: one brought back after a restart may not know it yet (tOff), and
   shows "– –" in its place */
const tUpKnown = t => t.at != null;
const tUpText = t => tUpKnown(t) ? "+" + tfmt(st.t - t.at) : "– –";
/* a timer CraftBeerPi brought back when it started again (a power cut, say): one that was counting down comes back
   paused, one that had run out still run out. Until it is started or answered, a line across its row says how long
   CraftBeerPi was off, or, while CraftBeerPi can't tell, that it isn't known yet: a Raspberry Pi with no clock board
   starts with a wrong time after a power cut, until the network sets it */
const offFor = s => {
  if (s < 59.5) return `${Math.max(1, Math.round(s))}\u00a0s`;
  const m = Math.round(s / 60), h = Math.floor(m / 60);
  return nb(m < 60 ? `${m} min` : h >= 48 ? `${Math.round(m / 1440)} days` : m % 60 ? `${h} h ${m % 60} min` : `${h} h`);
};
const tBack = t => !!t.interrupted && (t.state === "paused" || t.state === "done");
const tOff = t => t.off == null ? "CraftBeerPi was off; how long isn't known yet" : `CraftBeerPi was off for ${offFor(t.off)}`;
let lastBanner = null, actx = null;
/* two timers never share a name (whatever its capitals): their alarms, titled with it, would be hard to tell apart */
const tTwin = (name, t) => st.tmrs.find(z => z !== t && z.name.toLowerCase() === name.toLowerCase());
const tTwinWhy = n => `Another timer is already called ${n}. Give this one another name, so you can tell their alarms apart.`;
function tDefaultName() { let n = st.tmrs.length + 1; while (tTwin(`Timer ${n}`)) n++; return `Timer ${n}`; }
/* CraftBeerPi's kept prompt for a timer that has run out: titled with its name, on every screen until answered, with OK */
function tBanner(t, list = st.tmrs) {
  return {tone: "prompt", title: t.name, text: `The ${tfmt(t.set)} timer has run out.`, timer: t.id, more: list.filter(x => x.state === "done").length - 1,
    acts: [{label: "OK", cmd: `tm2:ok:${t.id}`, dir: "ok"}]};
}
/* its alarm is over (answered, or the timer set anew or removed): the prompt goes, and the next one waiting takes the
   title bar at the next second. Set anew or removed, CraftBeerPi takes the alarm down unanswered */
function tAnswered(t, res = "answered") { delete t.at; delete t.interrupted; questionGone(t.name, res); if (st.banner && st.banner.timer === t.id) st.banner = null; }
function timersHTML() {
  /* on one screen, out of the column (?tplace): beside the drawing by default, or beside the last event or in the
     bottom bar */
  if (tHere() !== "col") return "";
  const off = st.link === "lost" ? PAUSED : "", T = st.tmrs, e = st.tedit, full = T.length >= TMAX;
  if (TROW === "new") {
    /* the proposal's recipe column (?col=new): where the current step wouldn't be whole beside the timers' rows (tFold),
       they shrink to chips (tsmallHTML), and as a last resort fold into one line; opened from it, the timers take the
       step list's room, and the line's place holds CLOSE */
    if (FOLD && st.tfold === "line" && !st.tfOpen && !e) return tstripHTML();
    if (FOLD && st.tfold === "small") return tsmallHTML(off);
    const rows = T.map(t => trowHTML(t, off) + (e && e.id === t.id ? teditHTML(off) : ""));
    /* a timer just removed keeps its place for TUNDO seconds, with UNDO where its buttons were (tgoneHTML) */
    const g = st.tgone;
    if (g) rows.splice(Math.min(g.idx, rows.length), 0, tgoneHTML(g, off));
    /* + TIMER in the heading, beside SOUND, rather than a row of its own under the timers: it costs the step list nothing.
       A new timer's editor still opens at the end of the list, where the timer will be. While an editor is open it is
       greyed and says why (one editor at a time) */
    const plus = tplusHTML(off, "tplus2");
    const close = FOLD && st.tfold === "line" && st.tfOpen ? b("cmdbtn tclose", "CLOSE", "the timers", {cmd: "tf:x", expanded: true}) : "";
    return `<section class="tmrs" id="tmrs" aria-labelledby="tmrs-h"${e ? " data-editing" : ""}><div class="thead"><h3 id="tmrs-h">Timers</h3><div class="thr">${soundHTML()}${plus}</div></div>${rows.join("")}${e && e.id == null ? teditHTML(off) : ""}<p class="note">${st.notes.t || ""}</p>${close}</section>`;
  }
  const rows = T.map(t => trowHTML(t, off) + (e && e.id === t.id ? teditHTML(off) : "")).join("");
  /* + TIMER: where a new timer's editor opens; while another timer's editor is open it steps out of the way (one editor
     at a time, and a press would drop that editor's changes) */
  const plus = e && e.id == null ? teditHTML(off) : e ? ""
    : b("cmdbtn tplus", "+ TIMER", full ? "four at most" : T.length ? `up to ${TMAX}` : "counts down on every screen", {cmd: "te:new", why: off || (full ? "Four timers at most. Remove one to add another." : "")});
  return `<section class="tmrs" id="tmrs" aria-labelledby="tmrs-h"${e ? " data-editing" : ""}><div class="thead"><h3 id="tmrs-h">Timers</h3>${soundHTML()}</div>${rows}${plus}<p class="note">${st.notes.t || ""}</p></section>`;
}
function trowHTML(t, off) {
  const p = st.pend["t:" + t.id], why = off || (p ? WAIT : ""), done = t.state === "done", run = t.state === "running", live = run || t.state === "paused";
  const time = done ? tUpText(t) : tfmt(t.left), back = tBack(t);
  /* run: this countdown's length (its own time, as −1 MIN and +1 MIN left it), for "of" and the bar. "of 20:00"
     stays whole, so a narrow row wraps "PAUSED ·" over "of 20:00" */
  const of = `<span class="nw">of ${tfmt(t.run)}</span>`;
  const sub = done ? "TIME'S UP" : run ? of : live ? `<span class="nw">PAUSED ·</span> ${of}` : "ready";
  const said = tSaid(t);
  /* the go button says STARTING… or PAUSING… only for those two; for anything else the timer waits on (a new time, a
     new name, minutes more) it keeps its label, greyed, with the usual wait */
  const btn = done ? b("cmdbtn tok", p === "ok" ? "SENDING…" : "OK", "stops the alarm", {cmd: `tm2:ok:${t.id}`, why})
    : b("cmdbtn", p === "start" ? "STARTING…" : p === "pause" ? "PAUSING…" : run ? "PAUSE" : "START", t.state === "paused" ? "carry on" : "", {cmd: `tm2:go:${t.id}`, why});
  const editing = !!(st.tedit && st.tedit.id === t.id);
  /* two lines, the name and its state over the time and two buttons. REMOVE sits beside START or PAUSE in
     every state but a run-out one, always in the same place; START or PAUSE keeps the far right, where it was. A run-out
     timer has OK across the row. While its editor is open the timer keeps the one-line row as built,
     with START or PAUSE only: the editor fits a 1180 × 860 window with nothing to spare, and REMOVE is back when it
     closes */
  if (TROW === "new" && !done && !editing) {
    const rm = b("cmdbtn trm", p === "rm" ? "REMOVING…" : "REMOVE", "", {cmd: `tm2:rm:${t.id}`, label: p === "rm" ? "" : `Remove ${t.name}`, why});
    return `<div class="trow tr2${editing ? " editing" : ""}" data-state="${t.state}" id="tr-${t.id}"><button type="button" class="tsel" data-cmd="te:open:${t.id}" aria-expanded="${editing}" aria-label="${esc(said)}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${sub}</span><span class="tt" id="tt-${t.id}">${time}</span></button>${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}<div class="tbtn">${rm}${btn}</div>${live ? `<span class="bar"><i id="tb-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
  }
  return `<div class="trow${editing ? " editing" : ""}" data-state="${t.state}" id="tr-${t.id}"><button type="button" class="tsel" data-cmd="te:open:${t.id}" aria-expanded="${editing}" aria-label="${esc(said)}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${sub}</span><span class="tt" id="tt-${t.id}">${time}</span></button>${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}<div class="tbtn">${btn}</div>${live ? `<span class="bar"><i id="tb-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
}
/* the timers folded into one line (?col=new): each timer counting down, paused or run out, by name and time, and how many
   wait ready; a tap opens them in the step list's room. A run-out one is in Prompt Amber, and the line pulses as its row
   would, with its alarm in the title bar */
function tstripHTML() {
  const T = st.tmrs, act = T.filter(t => t.state !== "stopped"), ready = T.length - act.length, done = T.some(t => t.state === "done");
  const items = act.map(t => t.state === "done" ? `<span class="d">${esc(t.name)} TIME'S UP</span>` : `<span>${esc(t.name)} ${t.state === "paused" ? "paused " : ""}<b id="ts-${t.id}">${tfmt(t.left)}</b></span>`)
    .concat(ready ? [`<span class="r">${ready} ready</span>`] : []);
  const said = T.map(t => `${t.name}: ${t.state === "done" ? "time's up" : t.state === "stopped" ? "ready" : `${tfmt(t.left)} left${t.state === "paused" ? ", paused" : ""}`}`).join("; ");
  return `<section class="tmrs tfold" id="tmrs"${done ? ' data-state="done"' : ""}><button type="button" class="tstrip" data-cmd="tf:open" aria-expanded="false" aria-label="Timers. ${esc(said)}. Open them"><span class="tl">TIMERS</span><span class="tsi">${items.join("")}</span><span class="tso">OPEN</span></button></section>`;
}
/* a timer just removed, for TUNDO seconds: its row keeps its place and height, so the timers under it don't move under a reaching
   hand, and UNDO takes the place of both its buttons, so a second tap on REMOVE puts it back rather than reaching
   anything else. Then the row goes */
function tgoneHTML(g, off) {
  const p = st.pend["t:" + g.t.id];
  const undo = b("cmdbtn tundo", p ? "SENDING…" : "UNDO", "put it back", {cmd: `tm2:undo:${g.t.id}`, label: p ? "" : `Undo: put ${g.t.name} back`, why: off || (p ? WAIT : "")});
  return `<div class="trow tgone" data-state="gone" id="tr-${g.t.id}" role="group" aria-label="${esc(g.t.name)} removed"${g.h ? ` style="min-height:${g.h}px;--tw:${g.w}px"` : ""}><p class="tgn"><span class="tn">${esc(g.t.name)}</span><span class="ts">removed</span></p><div class="tbtn">${undo}</div></div>`;
}
/* what a timer's row or chip says to a screen reader, before "Change it": its name and time, how long ago it ran out,
   and how long CraftBeerPi was off where it was brought back after a restart */
function tSaid(t) {
  const done = t.state === "done", run = t.state === "running", live = run || t.state === "paused";
  return (done ? `${t.name}: time's up, ${tUpKnown(t) ? `${tfmt(st.t - t.at)} ago` : "how long ago isn't known yet"}` : `${t.name}: ${tfmt(t.left)}${run ? " left" : live ? " left, paused" : ", ready"}`)
    + (tBack(t) ? `. ${tOff(t)}` : "");
}
/* + TIMER, greyed while four timers are set or an editor is open, saying why */
const tplusHTML = (off, cls) => b(`cmdbtn ${cls}`, "+ TIMER", "", {cmd: "te:new", why: off || (st.tmrs.length >= TMAX ? "Four timers at most. Remove one to add another." : st.tedit ? "One timer at a time: close the one that's open first." : "")});
/* START or PAUSE as on a timer's row: STARTING… or PAUSING… while CraftBeerPi answers */
const tGo = (t, p, why, hint) => b("cmdbtn", p === "start" ? "STARTING…" : p === "pause" ? "PAUSING…" : t.state === "running" ? "PAUSE" : "START", hint, {cmd: `tm2:go:${t.id}`, why});
/* a running timer with 3:00 or less to go: its chip's time is bigger, and the small timers give it its row where there
   is room for it (tFold) */
const TSOON = 180, tSoon = t => t.state === "running" && t.left <= TSOON;
/* a timer as a chip, where the timers have less room than their rows need (the small timers of ?col=new, and ?tplace):
   a Raised Slate tile 48 px tall, the name and its state over the time, and the row's bar along its foot. The name and
   time open its editor, as on the row. mode is what else it holds: "plain" nothing, "go" START or PAUSE, "full" REMOVE
   and START or PAUSE. One that has run out is Prompt Amber, counts up and has OK, while its alarm stays in the title
   bar; one with 3:00 or less to go has a bigger time (data-soon). In the column beside the drawing, a timer brought
   back after a restart has the row's line under its name and time, saying how long CraftBeerPi was off (data-back) */
function tchipHTML(t, off, mode) {
  const p = st.pend["t:" + t.id], why = off || (p ? WAIT : ""), done = t.state === "done", live = t.state === "running" || t.state === "paused";
  const word = done ? "TIME'S UP" : t.state === "paused" ? "paused" : t.state === "stopped" ? "ready" : "";
  const editing = !!(st.tedit && st.tedit.id === t.id), back = tBack(t) && tHere() === "side";
  const btns = mode === "plain" ? "" : done ? b("cmdbtn tok", p === "ok" ? "SENDING…" : "OK", "", {cmd: `tm2:ok:${t.id}`, label: p === "ok" ? "" : "OK, stops the alarm", why})
    : (mode === "full" ? b("cmdbtn trm", p === "rm" ? "REMOVING…" : "REMOVE", "", {cmd: `tm2:rm:${t.id}`, label: p === "rm" ? "" : `Remove ${t.name}`, why}) : "") + tGo(t, p, why, "");
  return `<div class="tchip" data-mode="${mode}" data-state="${t.state}" id="tc-${t.id}"${tSoon(t) ? " data-soon" : ""}${back ? " data-back" : ""}><button type="button" class="tcsel" data-cmd="te:open:${t.id}" aria-expanded="${editing}" aria-label="${esc(tSaid(t))}. Change it"${off ? ` aria-disabled="true" data-why="${off}"` : ""}><span class="tn">${esc(t.name)}</span><span class="ts">${word}</span><span class="tt" id="tct-${t.id}">${done ? tUpText(t) : tfmt(t.left)}</span></button>${btns ? `<span class="tcx">${btns}</span>` : ""}${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}${live ? `<span class="bar"><i id="tcbar-${t.id}" style="width:${tPct(t)}%"></i></span>` : ""}</div>`;
}
/* a timer just removed, as a chip of the same size in its place: its name over "removed", in Dim Steel, and UNDO, for its
   TUNDO real seconds, whatever the chips around it hold, as it is the only way back */
function tcgoneHTML(g, off, mode) {
  const p = st.pend["t:" + g.t.id];
  const undo = b("cmdbtn tundo", p ? "SENDING…" : "UNDO", "put it back", {cmd: `tm2:undo:${g.t.id}`, label: p ? "" : `Undo: put ${g.t.name} back`, why: off || (p ? WAIT : "")});
  return `<div class="tchip tcgone" data-mode="${mode}" data-state="gone" id="tc-${g.t.id}" role="group" aria-label="${esc(g.t.name)} removed"><p class="tcg"><span class="tn">${esc(g.t.name)}</span><span class="ts">removed</span></p><span class="tcx">${undo}</span></div>`;
}
/* the chips in the timers' order, a timer just removed in its place; after(id) is what follows a chip (its editor's box) */
function tchipsHTML(off, mode, after) {
  const out = st.tmrs.map(t => tchipHTML(t, off, mode) + after(t.id)), g = st.tgone;
  if (g) out.splice(Math.min(g.idx, out.length), 0, tcgoneHTML(g, off, mode));
  return out.join("");
}
/* the proposal's small timers (?col=new, tFold): where the current step wouldn't be whole beside the timers' rows, they
   keep their heading and shrink to chips, two to a line. A timer that has run out keeps its row, across both, and so do
   those near their end wherever the step stays whole beside them (st.tgrow); those rows come first. A chip opens its
   editor in the column, under the chips, where it has what the chip lacks (teditHTML); a row's opens under the row */
function tsmallHTML(off) {
  const e = st.tedit, it = tItems(st.tgrow || []), ed = id => e && e.id === id ? teditHTML(off) : "";
  const rows = it.filter(x => x.row).map(x => trowHTML(x.t, off) + ed(x.t.id)).join("");
  const chips = it.filter(x => !x.row).map(x => x.gone ? tcgoneHTML(x.gone, off, "plain") : tchipHTML(x.t, off, "plain")).join("");
  const below = e && (e.id == null || it.some(x => !x.row && !x.gone && x.t.id === e.id)) ? teditHTML(off) : "";
  return `<section class="tmrs tsmall" id="tmrs" aria-labelledby="tmrs-h"${e ? " data-editing" : ""}><div class="thead"><h3 id="tmrs-h">Timers</h3><div class="thr">${soundHTML()}${tplusHTML(off, "tplus2")}</div></div><div class="tchips">${rows}${chips}</div>${below}<p class="note">${st.notes.t || ""}</p></section>`;
}
/* how a timer is drawn now, where it isn't a row: its chip's mode ("plain", "go", "full"), else "" */
const tChipped = t => tHere() !== "col" ? tMode() : FOLD && st.tfold === "small" && ONE_SCREEN.matches && t.state !== "done" && !(st.tgrow || []).includes(t.id) ? "plain" : "";
/* where the timers are on one screen (?tplace): what the chips hold. Beside the last event START or PAUSE, or nothing;
   in the bottom bar and in the column beside the drawing REMOVE and START or PAUSE, START or PAUSE, or nothing
   (tPlaceFit) */
const tMode = () => TPLACE === "bottom" || TPLACE === "side" ? (["go", "plain"].includes(st.tcm) ? st.tcm : "full") : st.tcm === "plain" ? "plain" : "go";
/* a timer's editor in a box of its own (?tplace), with the timers' notes in it */
const tpopHTML = off => st.tedit ? `<div class="tpop" id="tpop">${teditHTML(off)}<p class="note">${st.notes.t || ""}</p></div>` : "";
/* the timers' note while no editor is open (UNDO or + TIMER refused), for its 6 s: small, under the event line's right
   end, or above the bottom bar's */
const tpnoteHTML = () => !st.tedit && st.notes.t ? `<p class="tpnote">${st.notes.t}</p>` : "";
/* ?tplace=event: the timers between the last event and LOG, under the title bar, on one screen: the chips in a row, then
   + TIMER and SOUND. A timer's editor opens in a box under the line, right-aligned under the chip pressed (tPopPlace) */
function tevHTML() {
  const off = st.link === "lost" ? PAUSED : "", e = st.tedit, pop = tpopHTML(off), n = st.tmrs.length + (st.tgone ? 1 : 0);
  const chips = n ? `<div class="tcs">${tchipsHTML(off, tMode(), id => e && e.id === id ? pop : "")}</div>` : "";
  return `<div class="tev" role="group" aria-label="Timers">${chips}${tplusHTML(off, "tplus3")}${e && e.id == null ? pop : ""}${soundHTML()}</div>`;
}
/* ?tplace=bottom: the timers in a bar along the bottom of the screen, on one screen: TIMERS, the chips, then + TIMER and
   SOUND at the right end. A timer's editor opens in a box above the bar, right-aligned to the chip pressed */
function tbarHTML() {
  const off = st.link === "lost" ? PAUSED : "", e = st.tedit, pop = tpopHTML(off);
  return `<span class="tbl" id="tbarb-h">Timers</span><div class="tcs">${tchipsHTML(off, tMode(), id => e && e.id === id ? pop : "")}</div><div class="tbr">${tplusHTML(off, "tplus3")}${e && e.id == null ? pop : ""}${soundHTML()}</div>${tpnoteHTML()}`;
}
/* the bar is a row of the page's grid of its own, there only while it is drawn (brew-day.css) */
function tbarDraw() {
  const on = tHere() === "bottom";
  let bar = $("#tbarb");
  $("#app").toggleAttribute("data-tbarb", on);
  if (!on) { if (bar) bar.remove(); return; }
  if (!bar) { $("#app").insertAdjacentHTML("beforeend", '<div class="tbarb" id="tbarb" role="group" aria-labelledby="tbarb-h"></div>'); bar = $("#tbarb"); }
  bar.innerHTML = tbarHTML();
}
/* ?tplace, after drawing: the most each chip can hold, from the widths brew-day.css gives a chip in each mode
   (--tcw-plain, --tcw-go, --tcw-full) and the room around the chips, which is the same in every mode, so it never
   flickers between two. Beside the last event: START or PAUSE in every chip while the event's words keep 480 px, else
   the chips alone. In the bottom bar: REMOVE as well while they all fit, else START or PAUSE, else the chips alone. Then
   the editor's box is put under (or above) the chip it belongs to */
const TEV_LINE = 480;
let placeBusy = false;
function tPlaceFit() {
  const at = tHere();
  if (at === "col") return;
  if (at === "side") return tsideFit();
  const n = st.tmrs.length + (st.tgone ? 1 : 0), cs = $(at === "event" ? "#event .tcs" : "#tbarb .tcs");
  if (!placeBusy && n && cs) {
    const s = getComputedStyle(cs), w = m => n * parseFloat(s.getPropertyValue("--tcw-" + m)) + (n - 1) * parseFloat(s.columnGap);
    let mode;
    if (at === "event") {
      const ev = $("#event"), es = getComputedStyle(ev), tev = $("#event .tev");
      const room = ev.clientWidth - parseFloat(es.paddingLeft) - parseFloat(es.paddingRight) - $("#event .logbtn").offsetWidth - 2 * parseFloat(es.columnGap) - TEV_LINE - (tev.offsetWidth - cs.offsetWidth);
      mode = w("go") <= room ? "go" : "plain";
    } else mode = w("full") <= cs.clientWidth ? "full" : w("go") <= cs.clientWidth ? "go" : "plain";
    if (mode !== tMode()) { st.tcm = mode; placeBusy = true; renderAll(); placeBusy = false; return; }
  }
  tPopPlace();
}
/* the editor's box right-aligned to its chip, or for a new timer to the end of the timers, inside the line or the bar */
function tPopPlace() {
  if (tHere() === "side") return tsidePop();
  const pop = $("#tpop"), box = pop && pop.offsetParent, e = st.tedit, a = e && e.id != null ? $("#tc-" + e.id) : pop && pop.parentElement;
  if (!box || !a) return;
  const x = box.getBoundingClientRect().left + box.clientLeft + box.clientWidth - a.getBoundingClientRect().right;
  pop.style.right = `${Math.round(Math.max(0, Math.min(x, box.clientWidth - pop.offsetWidth)))}px`;
}
/* ?tplace=side: the timers in a column beside the drawing, on one screen, while there is at least one (a timer just
   removed counts while its UNDO shows): TIMERS with how many there are ("TIMERS · 2"), + TIMER and SOUND, then the
   timers one to a row, which scroll inside the column where they don't all fit; the count says they are there even
   where a long question in the title bar leaves no room for a row. The drawing beside it gets narrower, not shorter, so
   its vessels keep their size (brew-day.css). With no timers the drawing is full width, as without the timers, and
   + TIMER and SOUND are two small buttons in its top-right corner (tsideCorner). A timer's editor opens in a box beside
   its timer, a new one's beside the end of the timers, kept on screen (tsidePop) */
let tsideTop = 0;
function tsideHTML(off, n) {
  const e = st.tedit, pop = tpopHTML(off), plus = tplusHTML(off, "tplus3"), m = st.tmrs.length;
  if (!n) return `<div class="tcorner">${plus}${soundHTML()}</div>${pop}${tpnoteHTML()}`;
  const tiles = tchipsHTML(off, tMode(), id => e && e.id === id ? pop : "") + (e && e.id == null ? pop : "");
  return `<div class="tsh"><h3 id="tside-h">Timers${m ? ` <span aria-hidden="true">·</span> ${m}` : ""}</h3><div class="tshr">${plus}${soundHTML()}</div></div><div class="tsl">${tiles}</div>${tpnoteHTML()}`;
}
/* the column, or the corner's buttons, drawn again in the drawing's row (data-tside: split; data-tcorner: the buttons
   over the drawing's corner, in its cell); the list keeps where it was scrolled to */
function tsideDraw() {
  const on = tHere() === "side", bh = $(".brewhouse"), n = st.tmrs.length + (st.tgone ? 1 : 0);
  let el = $("#tside");
  bh.toggleAttribute("data-tside", on && n > 0);
  bh.toggleAttribute("data-tcorner", on && !n);
  if (!on) { if (el) el.remove(); return; }
  if (!el) { bh.insertAdjacentHTML("beforeend", '<section class="tside" id="tside" aria-label="Timers"></section>'); el = $("#tside"); }
  const l = el.querySelector(".tsl");
  tsideTop = n && l ? l.scrollTop : 0;
  el.classList.toggle("empty", !n);
  el.innerHTML = tsideHTML(st.link === "lost" ? PAUSED : "", n);
}
/* after drawing: the column as tall as the drawing's box, which keeps its own least height where the row is shorter (a
   long question in the title bar); what the timers hold, from the column's width (REMOVE and START or PAUSE where a
   timer has --tcw-full, START or PAUSE where it has --tcw-go, else the name and time alone, as in the bottom bar). Where
   they don't all fit, the list's height: a next row that would show all but its last 12 px is cut at half, so it reads
   as cut; one that would show less is left as it is, as the heading's count says there are more, and no row in view is
   given up for it. Then the list scrolled back to where it was, and the editor's box */
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
  tPopPlace();
}
/* the editor's box beside its timer, to the left of the column (of the corner's buttons, with no timers), level with the
   timer, or for a new timer with the end of the timers, moved up or down as far as it must to stay on screen */
function tsidePop() {
  const pop = $("#tpop"), el = $("#tside");
  if (!pop || !el) return;
  const e = st.tedit, l = el.querySelector(".tsl"), tiles = l ? [...l.querySelectorAll(".tchip")] : [];
  const a = e && e.id != null ? $("#tc-" + e.id) : tiles[tiles.length - 1] || el.querySelector(".tcorner");
  if (!a) return;
  const r = el.getBoundingClientRect(), ar = a.getBoundingClientRect(), m = 8;
  let y = e && e.id == null && l ? Math.min(ar.bottom, l.getBoundingClientRect().bottom) : ar.top;
  y = Math.max(m, Math.min(y, innerHeight - m - pop.offsetHeight));
  pop.style.top = `${Math.round(y - r.top - el.clientTop)}px`;
}
/* with no timers: + TIMER and SOUND in the drawing's top-right corner, in the first of these that stays inside the
   drawing's box and clears every part of the drawing as it is drawn (outlines, lines, pumps, labels, the valves' note):
   side by side, one over the other, then the same with smaller words, still 44 px tall. Where none clears (a drawing
   about 130 px tall, from the boil on, when the wort pump's words sit beside the boil kettle near the box's right
   edge; or one under about 100 px, with a long question in the title bar or an editor open), the two stand one over
   the other, or side by side where the box is too short for that, and the drawing leaves room for them at its right
   (--rig-r): it gets narrower, not smaller, as beside the timers' column. That holds while the drawing's box and words
   stay as they were (tcornerKeep); when either changes, the drawing goes back to full width and the corner is tried
   again */
const TCORNER = ["row", "stack", "row small", "stack small"];
let tcornerKeep = null;
function tsideCorner() {
  const c = $("#tside .tcorner"), svg = $("#rigsvg"), rig = $("#rig");
  const room = () => { if (!rig.style.getPropertyValue("--rig-r")) return false; rig.style.removeProperty("--rig-r"); tcornerKeep = null; drawRig(); return true; };
  if (!c) { room(); return; }
  const key = svg ? `${rig.clientWidth}x${rig.clientHeight}|${[...svg.querySelectorAll("text")].map(x => (x.getClientRects().length ? "" : "-") + x.textContent).join("|")}` : "";
  if (tcornerKeep) {
    if (tcornerKeep.key === key) { c.dataset.fit = tcornerKeep.fit; return; }
    if (room()) return;
  }
  const box = rig.getBoundingClientRect(), parts = svg ? [...svg.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon, text")].map(x => x.getBoundingClientRect()).filter(p => p.width > 0 && p.height > 0) : [];
  const clear = () => [...c.children].every(b => {
    const r = b.getBoundingClientRect();
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
/* one editor at a time, in place: under its timer, or where + TIMER was for a new one. A running or paused timer's time
   changes by a minute at once, as the boil power's nudges do; a stopped one is set and then saved */
/* the names to pick, under NAME: the names in BREWDAY_TIMER_NAMES as buttons, in the setting's order, three to a row
   (two on a phone, where the page scrolls), the first six (two rows: the editor then still fits a 1920×950 screen; the
   setting's description says so). A tap names the timer, a second tap clears it; typing any other name still works. A
   name another timer has is greyed, and a tap says why. Nothing is filled in for the brewer: a timer nobody names is
   "Timer 3", as on the server. The buttons carry their place in the list, not the name, so a name with a colon or quote
   can't break the command */
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
/* as a time is typed, the presets and the greyed START, SAVE or SET follow the boxes, in place, so the box being typed in
   keeps its caret */
function tePatch() {
  const e = st.tedit, ed = $(".tedit");
  if (!e || !ed) return;
  const tm = teTime(e), t = e.id != null ? tById(e.id) : null, pT = st.pend["t:" + (t ? t.id : "new")];
  const why = (st.link === "lost" ? PAUSED : "") || (pT ? WAIT : "") || tm.why;
  ed.querySelectorAll(".tpre button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.cmd === `te:min:${tm.set / 60}`)));
  ed.querySelectorAll('.tact [data-cmd="te:save"], .tact [data-cmd="te:start"]').forEach(x => {
    if (why) { x.setAttribute("aria-disabled", "true"); x.dataset.why = why; } else { x.removeAttribute("aria-disabled"); delete x.dataset.why; }
  });
}
function teditHTML(off) {
  const e = st.tedit, t = e.id != null ? tById(e.id) : null, live = !!t && (t.state === "running" || t.state === "paused");
  const pT = st.pend["t:" + (t ? t.id : "new")], why = off || (pT ? WAIT : "");
  if (e.confirm) return `<div class="confirm tconf" role="group" aria-labelledby="tc-t"><p id="tc-t">Remove <b>${esc(t.name)}</b>? It has ${tfmt(t.left)} left.</p><div>${b("yes", pT ? "REMOVING…" : "REMOVE IT", "", {cmd: "te:rm", why})}${b("", "KEEP IT", "", {cmd: "te:keep"})}</div></div>`;
  /* START, SAVE and SET send the time: greyed while the boxes don't make one, saying why */
  const tm = live ? null : teTime(e), tWhy = why || (tm ? tm.why : "");
  const nm = `<div class="tfield"><label for="tnm">Name</label><input id="tnm" type="text" maxlength="${TNLEN}" autocomplete="off" spellcheck="false" value="${esc(e.name)}" placeholder="${esc(e.ph)}"></div>
    ${namesHTML(e, t)}`;
  const time = live
    ? `<p class="tleft">Time left <b id="te-left">${tfmt(t.left)}</b></p><div class="tkeys">${[[-60, "−1 MIN"], [60, "+1 MIN"]].map(([s, l]) => b("cmdbtn", l, "", {cmd: `tm2:add:${t.id}:${s}`, why})).join("")}</div><p class="tnote">Changes the time left at once, on every screen.</p>`
    : teTimeHTML(e, tm);
  const acts = !t ? [b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn", pT === "save" ? "SAVING…" : "SAVE", "start it later", {cmd: "te:save", why: tWhy}), b("cmdbtn tgo", pT === "start" ? "STARTING…" : "START", "counts down now", {cmd: "te:start", why: tWhy})]
    /* REMOVE is on the row, so the editor doesn't repeat it. A timer counting down or paused can go back to
       its own time here, stopped, as OK does after its alarm and a kitchen timer's clear does: the editor stays open, now
       a stopped timer's, so a name typed and not yet saved stays */
    : TROW === "new" ? (live ? [b("cmdbtn", pT === "reset" ? "SENDING…" : `BACK TO ${tfmt(t.set)}`, "ready to start again", {cmd: "te:reset", why}), b("cmdbtn tgo", pT === "name" ? "SAVING…" : "DONE", "", {cmd: "te:done", why})]
      : [b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn tgo", pT === "save" ? "SAVING…" : "SET", "", {cmd: "te:save", why: tWhy})])
    : live ? [b("cmdbtn", "REMOVE", "", {cmd: "te:rm", why}), b("cmdbtn tgo", pT === "name" ? "SAVING…" : "DONE", "", {cmd: "te:done", why})]
    : [b("cmdbtn", "REMOVE", "", {cmd: "te:rm", why}), b("cmdbtn", "CANCEL", "", {cmd: "te:x"}), b("cmdbtn tgo", pT === "save" ? "SAVING…" : "SET", "", {cmd: "te:save", why: tWhy})];
  /* a timer shown as a chip without its buttons, with no row on screen (the small timers, ?tplace): the editor has a
     second row with what the row would have, REMOVE (one tap, with UNDO on its chip) and START or PAUSE */
  const two = t && TROW === "new" && t.state !== "done" && ["plain", "go"].includes(tChipped(t))
    ? `<div class="tact tact2">${b("cmdbtn trm", pT === "rm" ? "REMOVING…" : "REMOVE", "", {cmd: `tm2:rm:${t.id}`, label: pT === "rm" ? "" : `Remove ${t.name}`, why})}${tGo(t, pT, why, t.state === "paused" ? "carry on" : "")}</div>` : "";
  return `<div class="tedit" role="group" aria-labelledby="te-t"><p class="tet" id="te-t">${t ? `Change ${esc(t.name)}` : "New timer"}</p>${nm}${time}<div class="tact">${acts.join("")}</div>${two}</div>`;
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
/* the step list scrolls, where it has to, so the current step is whole in view: on the one-screen layout the list is
   the part of the column that gives up height, to the timers, a question or an editor, with or without the timers.
   Where the current step is taller than the list has room for even at its top (a box above it, a long note), the
   versions' line steps aside, as it does while something in the column waits for you (brew-day.css) */
const ONE_SCREEN = matchMedia("(min-width:1180px)");
/* where the timers are drawn: in the recipe column, or (?tplace) beside the last event, in the bottom bar or in a column
   beside the drawing, which is only on one screen; narrower, they stay in the column */
const tHere = () => TPLACE && ONE_SCREEN.matches ? TPLACE : "col";
/* + BrewStart, right above the first step, is kept in view with it as one: the versions' line steps aside for the two
   where it would for the step alone, and only where they still don't fit does the list keep the step whole without
   it */
function keepStepInView() {
  const rc = $("#recipe"), l = $("#recipe .steps"), c = l && l.querySelector('[aria-current="step"]'), add = c && l.querySelector(".bsnew");
  const need = c ? (add ? c.getBoundingClientRect().bottom - add.getBoundingClientRect().top : c.offsetHeight) : 0;
  if (rc.hasAttribute("data-short")) rc.removeAttribute("data-short");
  if (c && ONE_SCREEN.matches && c.offsetHeight && need > l.clientHeight - 6) rc.setAttribute("data-short", "");
  if (!c || l.scrollHeight <= l.clientHeight + 1) return;
  const top = add && need <= l.clientHeight - 6 ? add : c, h = top === add ? need : c.offsetHeight;
  const d = top.getBoundingClientRect().top - l.getBoundingClientRect().top;
  if (d < 0 || d + h > l.clientHeight) l.scrollTop += d - 6;
}
/* the proposal (?col=new): on one screen, where the current step wouldn't be whole in the step list beside the timers'
   rows, the timers shrink to chips ("small"), and only where it wouldn't be whole beside those either fold into one line
   ("line"). Worked out from the heights the timers would take, the rows' as measured, so the column doesn't flicker
   between two. While a box is open, or the timers are opened from their line, it stays as it is */
let foldBusy = false, TROW_H = 95, THEAD_H = 44;
const tSig = () => st.tmrs.map(t => t.state + (tBack(t) ? "+" : "")).join() + (st.tgone ? "|gone" : "");
/* the timers in their order, a timer just removed in its place, and which of them keep a full row in the small timers:
   one that has run out, and those near their end given their row (grown, their ids) */
function tItems(grown) {
  const out = st.tmrs.map(t => ({t, row: t.state === "done" || grown.includes(t.id)})), g = st.tgone;
  if (g) out.splice(Math.min(g.idx, out.length), 0, {t: g.t, gone: g, row: false});
  return out;
}
const tRowH = t => TROW_H + (t.state === "done" ? 40 : 0) + (tBack(t) ? 26 : 0);
/* the small timers' height, as brew-day.css draws them: the heading, then 8 px on, a grid with 6 px gaps of the full rows
   and the 48 px chips, two to a line */
function tSmallH(grown) {
  const it = tItems(grown), rows = it.filter(x => x.row), lines = Math.ceil((it.length - rows.length) / 2), n = rows.length + lines;
  return THEAD_H + (n ? 8 + rows.reduce((h, x) => h + tRowH(x.t), 0) + lines * 48 + (n - 1) * 6 : 0);
}
function tFold() {
  if (!FOLD || foldBusy) return;
  /* the timers out of the column (?tplace): nothing to fold or open, and the column drawn again without them if it was */
  if (tHere() !== "col") { if (st.tfold || st.tfOpen) { st.tfold = false; st.tfOpen = false; foldBusy = true; renderAll(); foldBusy = false; } return; }
  const rc = $("#recipe"), l = $("#recipe .steps"), c = l && l.querySelector('[aria-current="step"]'), tm = $("#tmrs"), row = $("#tmrs .tr2"), hd = $("#tmrs .thead"), add = c && l.querySelector(".bsnew");
  if (row) TROW_H = row.offsetHeight;
  if (hd) THEAD_H = hd.offsetHeight;
  let fold = st.tfold || false, grow = st.tgrow || [];
  if (!ONE_SCREEN.matches || !st.recipe || !st.tmrs.length) fold = false;
  else if (st.tfOpen || rc.hasAttribute("data-pb") || rc.hasAttribute("data-tedit") || !c || getComputedStyle(l).display === "none") return;
  else {
    /* the room the step list and the timers share: from the list's top to the column's foot, less the gap between them.
       The versions' line under them steps aside where the step needs that room too (keepStepInView) */
    const cs = getComputedStyle(rc), R = rc.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth) - l.getBoundingClientRect().top - parseFloat(cs.rowGap);
    /* the timers' full height: measured while their rows are shown, and kept while the same timers are in the same states */
    if (!st.tfold) st.tfoldAt = {sig: tSig(), h: tm.offsetHeight};
    const full = st.tfoldAt && st.tfoldAt.sig === tSig() ? st.tfoldAt.h : THEAD_H + st.tmrs.reduce((h, t) => h + 8 + tRowH(t), 0) + (st.tgone ? TROW_H + 8 : 0);
    /* + BrewStart above the first step is kept whole with it (keepStepInView) */
    const need = c.offsetHeight + (add ? add.offsetHeight + 6 : 0);
    const fits = h => need <= R - h - 6, soon = st.tmrs.filter(tSoon).map(t => t.id);
    /* the timers near their end get their rows back where the step stays whole beside them, else their chips' time grows.
       Which they are is kept while an editor is open, so nothing moves under it */
    if (fits(full)) fold = false;
    else if (soon.length && fits(tSmallH(soon))) { fold = "small"; grow = soon; }
    else if (fits(tSmallH([]))) { fold = "small"; grow = []; }
    else fold = "line";
  }
  if (fold === (st.tfold || false) && (fold !== "small" || grow.join() === (st.tgrow || []).join())) return;
  st.tfold = fold; st.tgrow = fold === "small" ? grow : [];
  if (fold !== "line") st.tfOpen = false;
  foldBusy = true; renderAll(); foldBusy = false;
}
function cmdTe(x, y) {
  const e = st.tedit;
  if (x === "new") { st.tedit = {id: null, name: "", ph: tDefaultName(), set: 10 * 60}; return renderAll(); }
  if (x === "open") { const t = tById(+y); st.tedit = e && e.id === t.id ? null : {id: t.id, name: t.name, ph: t.name, set: t.set}; return renderAll(); }
  if (!e) return;
  if (x === "x") { st.tedit = null; return renderAll(); }
  if (x === "pick") { const n = st.names[+y]; if (n != null) e.name = e.name === n ? "" : n; return renderAll(); }
  if (x === "step") { const m = Math.min(TMINS, Math.max(0, Math.floor(e.set / 60) + parseInt(y, 10))); teSet(e, m === TMINS ? m * 60 : m * 60 + e.set % 60); return renderAll(); }
  if (x === "sec") { teSet(e, Math.min(TMINS * 60, Math.max(0, e.set + parseInt(y, 10)))); return renderAll(); }
  if (x === "min") { teSet(e, parseInt(y, 10) * 60); return renderAll(); }
  if (x === "keep") { e.confirm = false; return renderAll(); }
  /* spaces as the server keeps them: trimmed, and one between words */
  const t = e.id != null ? tById(e.id) : null, name = (e.name || "").split(/\s+/).filter(Boolean).join(" ") || e.ph;
  if (x === "rm") {
    /* a timer with time left on it (running or paused) gets a question first, in place, as NEXT STEP does; a stopped
       one, or one that has run out, goes at once, and its alarm with it */
    if ((t.state === "running" || t.state === "paused") && !e.confirm) { e.confirm = true; return renderAll(); }
    return send("t:" + t.id, "rm", `${t.name} removed`, () => { tAnswered(t, "no longer needed"); st.tmrs = st.tmrs.filter(z => z !== t); st.tedit = null; });
  }
  /* BACK TO: the timer goes back to its own time, stopped; its editor stays open, now a stopped timer's */
  if (x === "reset") return send("t:" + t.id, "reset", `${t.name} back to ${tfmt(t.set)}, stopped with ${tfmt(t.left)} to go`, () => { t.state = "stopped"; t.left = t.run = t.set; delete t.interrupted; teSet(e, t.set); });
  /* a typed name another timer has is refused as its greyed button is, before anything is sent */
  const twin = (!t || name !== t.name) && tTwin(name, t);
  if (twin) return note("t", tTwinWhy(twin.name));
  if (x === "done") {
    if (name === t.name) { st.tedit = null; return renderAll(); }
    return send("t:" + t.id, "name", `${t.name} is now ${name}`, () => { t.name = name; st.tedit = null; });
  }
  /* START, SAVE and SET send the time the boxes make, greyed while they make none (teTime) */
  const tm = teTime(e);
  if (tm.why) return note("t", tm.why);
  const set = tm.set;
  if (!t) {
    if (st.tmrs.length >= TMAX) return;
    const go = x === "start";
    return send("t:new", x, `${name} added${go ? " and started" : ""}, ${tfmt(set)}`, () => {
      st.tmrs.push({id: Math.max(0, ...st.tmrs.map(z => z.id)) + 1, name, set, left: set, run: set, state: go ? "running" : "stopped"});
      st.tedit = null;
    });
  }
  const said = name !== t.name ? `${t.name} is now ${name}, ${tfmt(set)}` : `${t.name} set to ${tfmt(set)}`;
  /* SET on one that has run out answers its alarm too, and stops it at its new time, as CraftBeerPi does */
  return send("t:" + t.id, "save", said, () => { if (t.state === "done") { tAnswered(t, "no longer needed"); t.state = "stopped"; } t.name = name; t.set = t.left = t.run = set; st.tedit = null; });
}
function cmdTm2(x, id, y) {
  if (x === "undo") return tUndo(+id);
  const t = tById(+id), key = "t:" + id;
  if (!t) return;
  /* REMOVE on the row: one tap, no question, in any state but a run-out one. The row keeps its place for TUNDO real
     seconds with UNDO (tgoneHTML) */
  if (x === "rm") {
    const live = t.state === "running" || t.state === "paused";
    return send(key, "rm", `${t.name} removed${live ? `, ${tfmt(t.left)} to go` : ""}`, () => {
      const row = $("#tr-" + t.id), btns = row && row.querySelector(".tbtn");
      st.tgone = {t: Object.assign({}, t), idx: st.tmrs.indexOf(t), h: row ? row.offsetHeight : 0, w: btns ? btns.offsetWidth : 0, at: st.t, real: Date.now()};
      st.tmrs = st.tmrs.filter(z => z !== t);
      if (st.tedit && st.tedit.id === t.id) st.tedit = null;
    });
  }
  if (x === "go") {
    if (t.state === "running") return send(key, "pause", `${t.name} paused, ${tfmt(t.left)} to go`, () => { t.state = "paused"; });
    return send(key, "start", `${t.name} started, ${tfmt(t.left)} to go`, () => { if (t.state === "stopped") t.run = t.left; t.state = "running"; delete t.interrupted; });
  }
  if (x === "add") {
    const s = parseInt(y, 10), want = Math.max(10, t.left + s);
    return send(key, "add", `${t.name}: ${s > 0 ? "+" : "−"}${Math.abs(s) / 60} min, ${tfmt(want)} to go`, () => { const was = t.left; t.left = Math.max(10, t.left + s); t.run = Math.max(t.left, t.run + t.left - was); });
  }
  /* answering: OK puts the timer back to its own time, stopped (a kitchen timer's recall) */
  const answer = () => tAnswered(t);
  if (x === "ok") return send(key, "ok", `${t.name}: alarm answered`, () => { answer(); t.state = "stopped"; t.left = t.run = t.set; });
}
/* UNDO, within TUNDO seconds of REMOVE: CraftBeerPi puts the timer back as it was, in its place. One that was counting down has
   counted on meanwhile, as if it had never gone */
function tUndo(id) {
  const g = st.tgone;
  if (!g || g.t.id !== id) return;
  const t = g.t, live = t.state === "running" || t.state === "paused", left = () => Math.max(1, t.state === "running" ? t.left - (st.t - g.at) : t.left);
  send("t:" + id, "undo", `${t.name} put back${live ? `, ${tfmt(left())} to go` : ""}`, () => {
    t.left = left();
    st.tmrs.splice(Math.min(g.idx, st.tmrs.length), 0, t);
    st.tgone = null;
  });
}
/* the mockup's alarm sound: a piezo-style beep, as a panel controller's buzzer, softened (a sine at 1760 Hz, 120 ms each).
   The screen plays the sound set in Settings, BREWDAY_ALARM_SOUND (alarm.js); this is its "Soft ping" */
function audioOK() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    /* a silent one-sample sound, started inside the press. Some browsers, Safari on an iPhone in particular, let a page
       play sound later only once a sound has started inside a press, not just on resume(). This starts one unheard, as
       a press never beeps (cmdSnd) */
    const z = actx.createBufferSource(); z.buffer = actx.createBuffer(1, 1, 22050); z.connect(actx.destination); z.start(0);
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
/* SOUND is silent: switching it on, or allowing it while it says TAP TO ALLOW, plays nothing. Sound means a timer that
   has run out, or a new alert or question, never a press. The lit box says it's on; Settings' Try plays the sound on
   purpose. The press still lets the page play sound later (audioOK) */
function cmdSnd() {
  const s = st.snd;
  /* pressed while it says TAP TO ALLOW: the press allows it and leaves it on */
  if (s.on && !s.ok) { s.ok = audioOK(); return renderAll(); }
  s.on = !s.on;
  if (s.on) s.ok = audioOK();
  renderAll();
}
/* the first tap or key on the page lets it play sound; not Escape, which a browser doesn't count. A browser counts a mouse
   button as it goes down, but a finger only as it lifts (the HTML standard's activation-triggering events), so a touch
   tries again on pointerup. A press on SOUND is left to SOUND's own click (cmdSnd), so one that slides off it allows
   nothing. Elsewhere only the switch is redrawn, so the pressed button is still there for its click */
function unlockSound(target) {
  const s = st && st.snd;
  if (TIMERS !== "new" || !s || !s.on || (target && target.closest && target.closest(".snd"))) return;
  if (s.ok) { if (actx && actx.state === "suspended") actx.resume(); return; }
  if (!audioOK()) return;
  s.ok = true;
  const el = $(".snd");
  if (el) el.outerHTML = soundHTML();
}
document.addEventListener("pointerdown", e => unlockSound(e.target), true);
document.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") unlockSound(e.target); }, true);
/* every brewing second: count the running timers down and the finished ones up; raise a finished one's alarm when the
   title bar is free (behind another prompt it waits its turn); beep every 3 real seconds while any alarm waits. The
   timers' chips (beside the drawing, and ?col=new's) are drawn again as a timer gets to 3:00 to go, or back over it, as
   its chip's time grows and the small timers may give it its row */
function tmTick() {
  let changed = false;
  const chips = FOLD || !!TPLACE, soon0 = chips ? st.tmrs.filter(tSoon).map(t => t.id).join() : "";
  for (const t of st.tmrs) {
    if (t.state === "running") {
      t.left = Math.max(0, t.left - 1);
      if (t.left === 0) {
        t.state = "done"; t.at = st.t; changed = true;
        if (st.tedit && st.tedit.id === t.id) st.tedit = null;
        logEvent(`${t.name} finished`, "waiting for you", "wait"); say(`${t.name}: time's up.`, true);
        continue;
      }
      const o = $("#tt-" + t.id), bar = $("#tb-" + t.id), l = st.tedit && st.tedit.id === t.id && $("#te-left"), sl = $("#ts-" + t.id), co = $("#tct-" + t.id), cb = $("#tcbar-" + t.id);
      if (o) o.textContent = tfmt(t.left);
      if (sl) sl.textContent = tfmt(t.left);
      if (bar) bar.style.width = tPct(t) + "%";
      if (l) l.textContent = tfmt(t.left);
      if (co) co.textContent = tfmt(t.left);
      if (cb) cb.style.width = tPct(t) + "%";
    } else if (t.state === "done") { const o = $("#tt-" + t.id), co = $("#tct-" + t.id); if (o) o.textContent = tUpText(t); if (co) co.textContent = tUpText(t); }
  }
  if (chips && st.tmrs.filter(tSoon).map(t => t.id).join() !== soon0) changed = true;
  if (!st.banner) { const d = st.tmrs.find(t => t.state === "done"); if (d) { st.banner = tBanner(d); changed = true; } }
  /* a removed timer's row goes TUNDO real seconds after REMOVE, at any speed of CraftBeerPi's clock, unless its UNDO is on
     its way. CraftBeerPi keeps the timer 7 real seconds, for a press still on its way (TimersController.UNDO_FOR and
     UNDO_GRACE). At 1× CraftBeerPi's seconds are real ones, so they count it, as in a moment set up with no real time */
  const g0 = st.tgone, gone = g0 && (SC() !== 1 && g0.real != null ? Date.now() - g0.real >= TUNDO * 1000 : st.t - g0.at >= TUNDO);
  if (gone && !st.pend["t:" + st.tgone.t.id]) { st.tgone = null; changed = true; }
  if (changed) renderAll();
  else { const m = $("#tml-t"); if (m) m.innerHTML = tmlText(); }
  if (st.tmrs.some(t => t.state === "done") && st.t % (3 * SC()) === 0) ring(3);
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
      if (x === "reset-yes") return cmdReset();
      if (x === "unload") return cmdUnload();
      if (x === "unload-yes") return cmdUnloadGo();
      if (x === "load-yes") return cmdLoad(st.confirmLoad, true);
      if (x === "load-no") { st.confirmLoad = null; return renderAll(); }
      st.confirmNext = x === "next"; st.confirmReset = x === "reset"; st.confirmUnload = false; return renderAll();
    case "b": return cmdBanner(x);
    case "pb": if (x === "go") return pbGo(); st.pbOpen = false; return renderAll();
    case "cmp": if (x === "open") { st.pbOpen = false; st.rbOpen = false; st.cmpOpen = true; return renderAll(); } return cmpDone(true);
    /* the proposal (?col=new): the recipe book in the column, and the timers folded into one line, opened and closed */
    case "rb": st.rbOpen = x === "open"; st.confirmLoad = null; if (st.rbOpen) { st.cmpOpen = false; st.tfOpen = false; } return renderAll();
    case "tf": st.tfOpen = x === "open"; if (st.tfOpen) st.rbOpen = false; return renderAll();
    case "sw": if (x === "use") return swUse(); if (x === "back") return swBack(); if (x === "where") return swWhere(); st.swOpen = x === "more" ? !st.swOpen : x === "open"; if (!st.swOpen) { st.swVol = null; st.swGrain = null; st.swRec = null; } return renderAll();
    case "swv": return swVol(x, y);
    case "swg": return swGrain(x, y);
    case "swr": return swRec(x, y);
    case "mw": return mwCmd(x);
    case "bs": return bsCmd(x, y);
    case "alloff": return cmdAllOff();
    case "log": st.logOpen = !st.logOpen; if (st.logOpen) { phLogOpened(); st.spdOpen = false; } return renderAll();
    case "spd": return spdCmd(x, y);
    case "ph": return phCmd(cmd);
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
  /* START, and START ANYWAY in the check's box, act on the recipe they were held on: which one, as the press begins */
  const on = el.dataset.cmd === "r:start" || el.dataset.cmd === "pb:go" ? recipeOn() : null;
  hold = {el, cmd: el.dataset.cmd, timer: setTimeout(() => {
    const c = hold.cmd; el.classList.remove("holding"); hold = null;
    /* started, cleared or another loaded on another screen while the finger was on it: nothing starts. START ANYWAY's
       box has said why as it closed (pbEnd) */
    const lost = on && recipeLost(on);
    if (lost) { if (c === "r:start") lostSay(lost, on); return; }
    heldOn = on; run(c); heldOn = null;
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
  else toast("Keep holding for one second. Heat only comes on with a held press.");
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
  if (e.key !== "Escape") unlockSound(e.target);
  const el = e.target.closest ? e.target.closest("[data-hold]") : null;
  if (el && (e.key === " " || e.key === "Enter")) { e.preventDefault(); if (!e.repeat) holdStart(el); return; }
  if (e.target.id === "tin" && e.key === "Enter") { e.preventDefault(); if (st.edit && st.edit.kind === "pwr") cmdPwrSet(); else cmdTgtSet(); return; }
  /* Enter in a timer box presses the editor's main button: START for a new timer, SET for a stopped one, DONE otherwise */
  if (["tnm", "tmin", "tsec"].includes(e.target.id) && e.key === "Enter" && st.tedit) {
    e.preventDefault();
    const go = $(".tedit .tgo"), id = e.target.id;
    /* a greyed main button says why, as a press on it does */
    if (go) { if (go.getAttribute("aria-disabled") === "true") explain(go); else run(go.dataset.cmd); }
    /* still open (a name refused, or waiting for CraftBeerPi): the box that was redrawn keeps the caret, at its end */
    const box = $("#" + id);
    if (box && document.activeElement !== box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
    return;
  }
  if (e.target.id === "swvin" && e.key === "Enter") { e.preventDefault(); swVol("set"); return; }
  if (e.target.id === "swgin" && e.key === "Enter") { e.preventDefault(); swGrain("set"); return; }
  if (e.target.id === "swrin" && e.key === "Enter") { e.preventDefault(); swRec("set"); return; }
  if (e.target.id === "swrq" && e.key === "Enter") { e.preventDefault(); swRec("set"); return; }
  /* Enter in a simulated vessel's temperature box is its SET TEMPERATURE; greyed, it says why */
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.v && e.target.closest && e.target.closest("#spd-box")) {
    e.preventDefault();
    const go = $(`#spd-box [data-cmd="spd:vset:${e.target.dataset.v}"]`);
    if (go) { if (go.getAttribute("aria-disabled") === "true") explain(go); else run(go.dataset.cmd); }
    return;
  }
  /* RESET ALL's question: Escape closes it while focus is in the chooser, focus back on RESET ALL */
  if (e.key === "Escape" && st.spdOpen && st.svAsk && e.target.closest && e.target.closest("#spd-box")) { svCmd("vall-no"); return; }
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
  if (e.key === "Escape" && (st.swVol || st.swGrain || st.swRec)) { st.swVol = null; st.swGrain = null; st.swRec = null; renderAll(); if (st.mwOpen) mwFocus(); return; }
  /* the pH box: Escape closes it while focus is in it or on its reminder; from elsewhere, once nothing else open is left
     to close first (below) */
  if (e.key === "Escape" && st.ph && st.ph.open && e.target.closest && e.target.closest("#ph-box, #banner")) { phClose(); return; }
  /* a timer's editor: with the timers in the column on one screen, a box open in the column has them make way, the
     editor with them, so Escape is for the box. In a box of its own (beside the drawing, ?tplace) the editor closes
     first, unless focus is in a box open in the recipe column, which then closes first: Escape closes the box being
     worked in */
  const inColBox = !!(e.target.closest && e.target.closest("#recipe")) && !!(st.bsOpen || st.pbOpen || st.cmpOpen || st.swOpen || st.rbOpen || st.confirmLoad != null);
  if (e.key === "Escape" && st.tedit && (tHere() !== "col" ? !inColBox : !(ONE_SCREEN.matches && (st.pbOpen || st.cmpOpen || st.swOpen || st.rbOpen || st.bsOpen)))) { st.tedit = null; renderAll(); return; }
  if (e.key === "Escape" && st.bsOpen && st.bs && st.bs.ask && !st.pend.bs) { bsCmd("all-stay"); return; }
  if (e.key === "Escape" && st.bsOpen) { bsClose(); return; }
  if (e.key === "Escape" && st.mwOpen) { mwClose(); return; }
  if (e.key === "Escape" && st.spdOpen) { spdClose(); return; }
  if (e.key === "Escape" && st.confirmLoad != null) { st.confirmLoad = null; renderAll(); return; }
  /* the proposal's boxes (?col=new): the recipe book, and the timers opened from their folded line */
  if (e.key === "Escape" && (st.rbOpen || st.tfOpen)) { st.rbOpen = false; st.tfOpen = false; renderAll(); return; }
  if (e.key === "Escape" && (st.edit || st.logOpen || st.confirmNext || st.confirmReset || st.confirmUnload || st.pbOpen || st.cmpOpen || st.swOpen)) { st.edit = null; st.logOpen = false; st.confirmNext = false; st.confirmReset = false; st.confirmUnload = false; st.pbOpen = false; st.cmpOpen = false; st.swOpen = false; renderAll(); }
  else if (e.key === "Escape" && st.ph && st.ph.open) phClose();
});
document.addEventListener("keyup", e => { if (hold && (e.key === " " || e.key === "Enter")) { e.preventDefault(); holdEnd(true); } });
/* BrewStart's time box left: looked at once focus has settled, as the column drawn again puts focus back in a new
   one */
document.addEventListener("focusout", e => { if (e.target.id === "bstin" && st && st.bs) setTimeout(bsLeft, 0); });
document.addEventListener("input", e => {
  /* a simulated vessel's temperature box: kept as typed, its SET TEMPERATURE following it */
  if (e.target.dataset && e.target.dataset.v && e.target.closest("#spd-box") && st.spdOpen) { st.svIn[e.target.dataset.v] = e.target.value; spdDraw(); return; }
  /* the pH box's figures: kept as typed, SAVE and the sample's range line following them in place (phPatch) */
  if ((e.target.id === "phin" || e.target.id === "phtin") && st.ph) { st.ph[e.target.id === "phin" ? "txt" : "ttxt"] = e.target.value; phPatch(); return; }
  /* the readings box's other figures, the same way */
  if (st.ph && st.ph.f && e.target.dataset && e.target.dataset.k && e.target.closest("#ph-box")) { rdPut(st.ph, e.target.dataset.k, e.target.value); phPatch(); return; }
  /* BrewStart's time box: kept as typed and read (bsTyped), its words, AM and PM, and SET following it in place
     (bsPatch), and said aloud once the brewer stops typing; its grain figure, kept as typed, un-presses the chips */
  if (e.target.id === "bstin" && st.bs) { bsTyped(e.target.value); return; }
  if (e.target.id === "bsgin" && st.bs) {
    st.bs.fig = e.target.value; st.bs.chip = null;
    document.querySelectorAll("#bs-box .bschip").forEach(x => x.setAttribute("aria-pressed", "false"));
    if (st.bs.ask) { st.bs.ask = false; renderAll(); }
    return;
  }
  /* the strike water box's water, grain and the figures given in it: kept as typed, and said on SET, without redrawing */
  if (e.target.id === "swgin" && st.swGrain) {
    const x = parseFloat(e.target.value), ok = $("#swgok");
    st.swGrain.val = Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
    if (ok) ok.textContent = st.swGrain.val == null ? "– –" : st.swGrain.val.toFixed(1);
    return;
  }
  if (e.target.id === "swrin" && st.swRec) {
    const x = parseFloat(e.target.value), ok = $("#swrok"), q = SW_REC[st.swRec.kind].places;
    st.swRec.val = Number.isFinite(x) ? Math.round(x * 10 ** q) / 10 ** q : null;
    st.swRec.typed = true;
    if (ok) ok.textContent = st.swRec.val == null ? "– –" : st.swRec.val.toFixed(q);
    /* the mash water: the ratio it gives, the sparge water it leaves and what it shouldn't do follow it in place */
    if (st.swRec.kind === "water") {
      const N = swNumbers(), r = $("#swrq"), o = $("#swr-o"), w = $("#swr-w");
      const ratio = waterRatio(st.swRec.val, "gal", N.R.grain ?? null, "lb", "F");
      if (r) r.value = ratio == null ? "" : String(+ratio.toFixed(2));
      if (o) o.textContent = swRecOther(N, st.swRec.val);
      if (w) w.textContent = swRecWarn(N, st.swRec.val);
    }
    return;
  }
  /* the mash water's ratio typed instead: it fills the mash water from the grain weight */
  if (e.target.id === "swrq" && st.swRec && st.swRec.kind === "water") {
    const N = swNumbers(), w = waterForRatio(parseFloat(String(e.target.value).replace(",", ".")), N.R.grain ?? null, "lb", "gal", "F");
    st.swRec.val = w == null ? null : Math.round(w * 100) / 100;
    st.swRec.typed = true;
    const i = $("#swrin"), ok = $("#swrok"), o = $("#swr-o"), warn = $("#swr-w");
    if (i) i.value = st.swRec.val == null ? "" : st.swRec.val.toFixed(2);
    if (ok) ok.textContent = st.swRec.val == null ? "– –" : st.swRec.val.toFixed(2);
    if (o) o.textContent = swRecOther(N, st.swRec.val);
    if (warn) warn.textContent = swRecWarn(N, st.swRec.val);
    return;
  }
  if (e.target.id === "swvin" && st.swVol) {
    const x = parseFloat(e.target.value), ok = $("#swvok");
    st.swVol.val = Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
    if (ok) ok.textContent = st.swVol.val == null ? "– –" : st.swVol.val.toFixed(1);
    const ov = $("#swv-over"), o = $("#swv-o"), w = $("#swv-w"), N = swNumbers();
    if (ov) ov.textContent = hltOver(st.swVol.val);
    if (o) o.textContent = swVolOther(N, st.swVol.val);
    if (w) w.textContent = swVolWarn(N, st.swVol.val);
    return;
  }
  /* the timer editor's boxes: kept as typed, without redrawing, so the caret stays put. A time typed follows at once in
     the presets and in START, SAVE or SET, greyed while the boxes make none (tePatch) */
  if (["tnm", "tmin", "tsec"].includes(e.target.id) && st.tedit) {
    if (e.target.id === "tnm") {
      st.tedit.name = e.target.value;
      document.querySelectorAll(".tsug button").forEach((x, i) => x.setAttribute("aria-pressed", String(x.getAttribute("aria-disabled") !== "true" && st.names[i] === e.target.value)));
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
  /* the new boil kettle's TARGET: a typed number from the boil point less 3.6 °F up is BOIL, and SET says so before
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
    if (tab.dataset.tab === "BrewScribe") toast("Mockup: this opens BrewScribe in a browser tab of its own, or goes back to that tab if it's open, without reloading it.");
    else if (tab.dataset.tab) toast(tab.dataset.tab === "More" ? "Mockup: MORE holds Fermenter Profile, Plugins, System and About." : `Mockup: this opens the existing ${tab.dataset.tab} page.`);
    return;
  }
  const el = e.target.closest("[data-cmd]");
  if (!el) {
    if (st.logOpen && !e.target.closest(".log")) { st.logOpen = false; renderAll(); }
    if (st.spdOpen && !e.target.closest("#spd-box")) spdClose();
    return;
  }
  if (el.hasAttribute("data-hold")) return;
  if (el.getAttribute("aria-disabled") === "true") { explain(el); return; }
  const cmd = el.dataset.cmd;
  if (cmd === "noop") return;
  run(cmd);
  requestAnimationFrame(() => { if (document.activeElement === document.body) document.querySelector(`[data-cmd="${cmd}"]`)?.focus({preventScroll: true}); });
});

/* ---------- clock, step timer, rest timer, reading age ----------
   one of CraftBeerPi's seconds a tick: a real second, or a SIM_TIME_SCALE-th of one on a simulator (st.sim, load) */
function tick() {
  if (!st) return;
  st.t++;
  clockSet();
  /* BrewStart's box follows CraftBeerPi's clock: how long until its time, and whether it has passed */
  if (st.bsOpen) bsPatch(true);
  /* the graphs get a row every 10 real seconds, at any speed, as the readings reach the live screen */
  if (GRAPHS && st.t % (10 * SC()) === 0) graphTick();
  if (st.link === "lost") {
    /* how long since the last reading is the screen's own wait, so it counts real seconds */
    if (st.t % SC() === 0) st.age++;
    document.querySelectorAll(".age").forEach(n => { n.textContent = `Last reading ${st.age} s ago`; });
    const ba = $("#ban-age"); if (ba) ba.textContent = st.age;
    return;
  }
  const r = st.recipe;
  /* CraftBeerPi working USE out: how long it has been at it, and its answer once it comes */
  const sww = st.sw && st.sw.work;
  if (sww) {
    if (st.t - sww.since >= SW_WORK_S) swWorked();
    else { const el = document.getElementById("sw-el"); if (el) el.textContent = swSecs(st.t - sww.since); }
  }
  /* the levers come after USE: FORECAST's sentence on what would raise USE most, once they're in */
  const swa = st.sw && st.sw.has;
  if (swa && swa.lvAt != null && st.t >= swa.lvAt) { delete swa.lvAt; if (st.swOpen) renderAll(); }
  /* the pre-brew check's box follows CraftBeerPi while it is open: here, the Pi's clock set from the internet */
  if (st.pbOpen && st.pb.clockAt && !st.pb.clock && st.t >= st.pb.clockAt) { st.pb.clock = true; st.pb.clockWhy = null; say("The clock is set now. Every check passes."); renderAll(); }
  const pz = document.getElementById("pz");
  if (pz && st.a.bkEl.paused) pz.textContent = mmss(Math.max(0, st.t - st.a.bkEl.pausedAt));
  /* CraftBeerPi's warning, 5 s after a kettle's AUTO started with no target. The boil kettle never gets one: BoilPower
     puts its boil threshold in as the target as it starts. Under the HERMS the HLT isn't in AUTO itself; the mash tun's
     warning covers it. */
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
  /* the new boil kettle: CraftBeerPi's warning after 2 brewing minutes paused, once per pause. Behind another
     prompt it waits its turn, as the no-target warning does */
  const pe = st.a.bkEl;
  if (BK === "power" && pe.paused && !pe.pauseWarned && st.t - pe.pausedAt >= 120 && !st.banner) {
    pe.pauseWarned = true;
    st.banner = pauseBanner();
    logEvent(st.banner.title, "waiting for you", "wait");
    say(`${st.banner.title}. ${st.banner.text}`, true);
    renderAll();
  }
  /* CraftBeerPi's alarm for an element on by hand: 2 °F past its target, or where BOIL starts, for 30 s of the brewing
     clock. At most twice a stretch of heating by hand: once past the target, once near the boil, so an OK'd alarm left
     unheeded comes back before the water boils. A stretch ends when the element is off, the vessel in AUTO, or the
     target changes. Behind another prompt it waits its turn here, as the others do; screen.js puts it first, as
     CraftBeerPi sends it as an error */
  ["hlt", "bk"].forEach(v => {
    const V = st.v[v], w = byHand(v);
    if (!w || w.t !== V.byT) { V.byFor = 0; V.byRaised = []; V.byT = w ? w.t : undefined; }
    if (!w || !w.over || (V.byRaised || []).includes(w.over)) { V.byFor = 0; return; }
    V.byFor = (V.byFor || 0) + 1;
    if (V.byFor < 30 || st.banner) return;
    V.byRaised = [...(V.byRaised || []), w.over]; V.byFor = 0;
    st.banner = byHandBanner(v, w);
    logEvent(`${KNAME[v]}: ${st.banner.text}`, "from CraftBeerPi", "bad");
    say(`${KNAME[v]}. ${st.banner.text}`, true);
    renderAll();
  });
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
}
/* at 1× a tick a second; a simulator's moment (st.sim) runs its clock, and everything on it, SIM_TIME_SCALE times as
   fast: every 50 ms the seconds due by the real time since it began, so the page keeps up at any size */
let tickT = setInterval(tick, 1000), tickSc = 1;
function startTick() {
  const sc = st.sim ? st.sim.scale : 1;
  if (sc === 1 && tickSc === 1) return;
  clearInterval(tickT); tickSc = sc;
  if (sc === 1) { tickT = setInterval(tick, 1000); return; }
  const t0 = performance.now();
  let done = 0;
  tickT = setInterval(() => {
    const due = Math.floor((performance.now() - t0) / 1000 * sc), n = Math.min(due - done, sc);
    for (let i = 0; i < n; i++) tick();
    done = Math.max(done + n, due - sc);
  }, 50);
}

/* ---------- scenes ---------- */
function load(name) {
  timers.forEach(clearTimeout); timers = []; holdEnd(false); pbKeep = null;
  const key = SCENES[name] ? name : "mash";
  RECIPE.steps = RECIPE_STEPS.slice();
  RECIPE.name = RECIPE_NAME;
  st = SCENES[key]();
  /* the #sparge-… moments and #boil-hold run a recipe whose step 4 is a SpargeStep; every other moment keeps the MashStep */
  RECIPE.steps[3] = st.sparge4 ? Object.assign({}, SPARGE_STEP, st.sparge4) : SPARGE_MASH;
  /* #check-adds and #check-many: a recipe with eight boil additions, of which the boil step holds the first six */
  RECIPE.steps[4].adds = st.adds5 || BOIL_ADDS;
  /* the strike water moments put the brewer's own flow in front of the recipe: BrewStart, and with ?sws=step the strike
     water step on the HLT after it (SW_STEPS), at the strike water's temperature in that moment; #sw-hand has the
     recipe as imported, without them, and #bs-new without BrewStart. BrewStart is Ready by 07:00 on brew day, the
     moment's second day, and anything else a moment changes is in sw.bs. Where the grain spent the night is answered
     unless a moment says otherwise (sw.where, null for not yet): in the garage with BrewStart's grain temperature
     blank, so the boil kettle's probe stands for it, and indoors with a figure */
  if (st.sw && !st.sw.hand) RECIPE.steps = SW_STEPS.filter(s => !(st.sw.noBS && s.type === "BrewStart")).map(s => Object.assign({}, s, {temp: st.sw.plan},
    s.type === "BrewStart" ? Object.assign({vol: st.sw.vol, grain: st.sw.grain, where: st.sw.where !== undefined ? st.sw.where : st.sw.grain == null ? "garage" : "indoors", date: dateOf(1)}, st.sw.bs) : {})).concat(RECIPE.steps);
  /* a moment can open an editor (open) and borrow another moment's graph history (base) */
  const open = st.open, base = st.base || key;
  delete st.open; delete st.base;
  Object.assign(st, {scene: key, pend: {}, notes: {}, edit: null, confirmNext: false, confirmReset: false, confirmUnload: false, confirmLoad: null, logOpen: false, pbOpen: false, cmpOpen: false, swOpen: false, swVol: null, swGrain: null, swRec: null, bsOpen: false, bs: null, mwOpen: false, spdOpen: false, spdPend: null, svAsk: false, svPend: {}, svIn: {}}, open);
  /* BrewScribe as the moment has it, and Brew Day's copy of its answer (phLoad) */
  phLoad();
  /* the strike water box: CraftBeerPi's answer for the moment's numbers, worked out already, unless the moment has it
     working one out (sw.has: null) or showing an older one */
  if (st.sw && st.sw.has === undefined) st.sw.has = swNow();
  /* a box or CHECKING… a moment opens belongs to the recipe it shows, as one START opens does */
  if (st.pbOpen || st.pend["r:check"]) st.pbFor = recipeOn();
  /* CraftBeerPi's answers to the pre-brew check: all pass, unless a moment says otherwise */
  if (!st.pb) st.pb = {clock: true, none: {}, adds: {n: RECIPE.steps[4].adds.length, missed: []}};
  if (st.v.bk.bp == null) st.v.bk.bp = 45; // the boil kettle's Boil_Power setting, read from its props
  if (st.a.bkEl.lvl == null) st.a.bkEl.lvl = 100; // the boil element's own level (its power), used when it is on by hand
  if (st.v.bk.usual === undefined) st.v.bk.usual = 45; // the new boil kettle's usual boil power (Usual_Boil_Power); null: none set
  if (st.v.bk.keep == null) st.v.bk.keep = true; // its Keep_Boiling setting, "Yes" unless the brewer unticks it
  if (st.v.bk.boilAt == null) st.v.bk.boilAt = BOIL_TH; // the new boil kettle's boil point, Boil_Threshold (BOIL AT)
  if (TIMERS === "new") {
    st.tmrs = (st.tmrs || []).map(t => Object.assign({run: t.set}, t));
    if (!st.snd) st.snd = {on: false, ok: true};
    if (st.tedit === undefined) st.tedit = null;
    /* BREWDAY_TIMER_NAMES: its default, or a moment's own list; ?names=… (blank for none) tries another */
    st.names = QS.has("names") ? tNames(QS.get("names")) : st.names || TNAMES.slice();
    lastBanner = st.banner;
  }
  if (GRAPHS) st.hist = gHistory(base);
  /* a probe that has given no reading for a while: its graph has a gap, dark, for that time */
  if (st.hist && st.gap) Object.entries(st.gap).forEach(([v, s]) => st.hist.v[v].forEach(row => { if (row[0] > st.t - s) row[1] = null; }));
  applyLocks(); renderAll();
  startTick();
  /* a moment can show a greyed button tapped: its reason in its note line (tap) */
  if (st.tap) { const el = document.querySelector(`[data-cmd="${st.tap}"]`); delete st.tap; if (el) explain(el); }
  /* a moment can open BrewStart's box, as its row or + BrewStart does (bsAt: what it opens it with) */
  if (st.bsAt) { const o = st.bsAt; delete st.bsAt; bsOpen(o); }
  /* a moment can show FORECAST's details scrolled to a part of them (swAt) */
  if (st.swAt) { const at = st.swAt; delete st.swAt; requestAnimationFrame(() => { const el = $(at); if (el) el.scrollIntoView({block: "center"}); }); }
  /* a moment can open the pH box, as RECORD pH does (phAt: what it opens it with), put focus on LOG, as SAVE does once
     it is done (phLog), or on RECORD, as a SAVE that leaves the reminder up does (phRec), and have the reminder
     answered on another screen some real milliseconds on (phElse) */
  if (st.phAt) { const o = st.phAt; delete st.phAt; phOpen(Object.assign({moment: true}, o)); }
  if (st.phLog) { delete st.phLog; setTimeout(() => $("#event .logbtn")?.focus(), 0); }
  if (st.phRec) { delete st.phRec; setTimeout(() => $('#banner [data-cmd="ph:open"]')?.focus(), 0); }
  if (st.phElse) { const ms = st.phElse; delete st.phElse; timers.push(setTimeout(phElsewhere, ms)); }
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
  document.querySelectorAll(".mock a[data-clk]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.clk === "24") q.set("clock", "24"); else q.delete("clock");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", (a.dataset.clk === "24") === CLOCK24 ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-cue]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.cue === "today") q.set("cues", "today"); else q.delete("cues");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", (a.dataset.cue === "today") === (QS.get("cues") === "today") ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-slayer]").forEach(a => {
    const q = new URLSearchParams(location.search), v = a.dataset.slayer;
    if (v) q.set("slayer", v); else q.delete("slayer");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", v === (QS.get("slayer") || "") ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-lsens]").forEach(a => {
    const q = new URLSearchParams(location.search), v = a.dataset.lsens;
    if (v) q.set("lsens", v); else q.delete("lsens");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", v === LSENS.join(",") ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-levels]").forEach(a => {
    const q = new URLSearchParams(location.search), v = a.dataset.levels;
    if (v) q.set("levels", v); else q.delete("levels");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", v === LEVELS ? "true" : "false");
  });
  [["simtag", "a"], ["plan", "soft"]].forEach(([p, def]) => document.querySelectorAll(`.mock a[data-${p}]`).forEach(a => {
    const q = new URLSearchParams(location.search), v = a.dataset[p];
    if (v === def) q.delete(p); else q.set(p, v);
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", v === document.documentElement.dataset[p] ? "true" : "false");
  }));
  document.querySelectorAll(".mock a[data-tm]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.tm === "today") q.set("timers", "today"); else q.delete("timers");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.tm === TIMERS ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-trow]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.trow === "today") q.set("trow", "today"); else q.delete("trow");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.trow === TROW ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-col]").forEach(a => {
    const q = new URLSearchParams(location.search), c = a.dataset.col;
    if (c === "new") q.delete("col"); else q.set("col", c === "fold" ? "new" : "today");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", c === (FOLD ? "fold" : COL) ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-tplace]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.tplace === "today") q.set("tplace", "today"); else q.delete("tplace");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.tplace === (TPLACE || "today") ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-bkman]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.bkman === "today") q.set("bkman", "today"); else q.delete("bkman");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.bkman === BKMAN ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-wp]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.wp === "chill") q.delete("wp"); else q.set("wp", a.dataset.wp);
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", a.dataset.wp === WP ? "true" : "false");
  });
  document.querySelectorAll(".mock a[data-nm]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.nm) q.set("name", a.dataset.nm); else q.delete("name");
    a.href = `?${q}#${key}`;
    a.setAttribute("aria-current", (a.dataset.nm || "CraftBeerPi Brewery") === BREWERY ? "true" : "false");
  });
}

/* ---------- layout A (D1) or B (D3): same parts, arranged differently ---------- */
const QS = new URLSearchParams(location.search);
const LAYOUT = QS.get("layout") === "a" ? "a" : "b";
document.documentElement.dataset.layout = LAYOUT;
if (QS.has("bare")) document.documentElement.classList.add("bare");
if (LAYOUT === "b") {
  $(".topbar .link").before($("#banner"));
  /* the pH box goes with the reminder, just after it (phFit) */
  $("#banner").after($("#ph-box"));
  $(".main").before($(".tabs"));
  $(".main").prepend($("#recipe"));
  $(".brewhouse").append($("#rig"));
}
/* temperature graphs (graphs.js), in the faceplates. ?graphs=none shows the screen without them; ?graphs=panel is
   option B, the graphs in a panel, kept only for graphs.html. Layout A has none. */
const GRAPHS = LAYOUT === "a" || QS.get("graphs") === "none" ? "" : QS.get("graphs") === "panel" ? "panel" : "face";
if (GRAPHS) { document.documentElement.dataset.graphs = GRAPHS; graphSetup(QS); }
/* the boil kettle's faceplate: the redesign (the default, ?bk=power); the faceplate the screen keeps for an older
   BoilPower without set_boil_at (?bk=today); or ?bk=words, a words-only alternative kept for comparison.
   boil-kettle.html compares the first two. */
const BK = ["words", "today"].includes(QS.get("bk")) ? QS.get("bk") : "power";
document.documentElement.dataset.bk = BK;
/* the boil kettle's MANUAL: by default (BOIL-MANUAL.md, approved on 22 Nov) in MANUAL the element runs at the boil power,
   the one green number, which reads HAND there; the −5 % … +5 % steps stay beside the element, OUT matches the green
   number while it heats, and MODE's MAN is boxed in Prompt Amber where AUTO is usual (bkManCue). ?bkman=today is
   MANUAL as built before: the element at its own level, which the screen neither shows nor sets. boil-manual.html
   compares the two */
const BKMAN = BK === "power" && QS.get("bkman") !== "today" ? "new" : "today";
/* the timers: several, named, with sound (the default; ?timers=new is the same, as the identity test asks for it), or
   ?timers=today, the one rest timer, which the screen keeps for an older CraftBeerPi without the timers */
const TIMERS = QS.get("timers") === "today" ? "today" : "new";
document.documentElement.dataset.timers = TIMERS;
/* the section cues: by default (CUES.md, A, approved on 22 Nov) each kind of section on a ground of its own, in
   brew-day.css; ?cues=today is every section on the same panel ground, as built before */
if (QS.get("cues") === "today") document.documentElement.dataset.cues = "today";
/* the simulator's clock in the title bar: SIMTAG (clockSet). The recipe column's blue (brew-day.css): by default (soft)
   a quieter Plan Slate ground and a 3px, darker Plan Edge; ?plan=edge the panel's own slate with the 4px edge as built;
   ?plan=ground the ground as built without the edge; ?plan=today as built before */
document.documentElement.dataset.simtag = SIMTAG;
document.documentElement.dataset.plan = ["soft", "edge", "ground", "today"].includes(QS.get("plan")) ? QS.get("plan") : "soft";
/* the recipe column: by default a recipe not begun has OTHER RECIPE beside COMPARE PROBES, in the row COMPARE PROBES
   had to itself, which opens the recipe book in that place (RECIPE-COLUMN.md; the brewer kept it on 22 Nov, and it comes
   with the timers' column beside the drawing). ?col=today is the column as built before. ?col=new is the rest of
   RECIPE-COLUMN.md's proposal as well (FOLD), kept for comparison: with the timers in the column on one screen, they
   shrink to chips where the current step wouldn't be whole beside their rows, and fold into one line only where it
   wouldn't be whole beside the chips either, opening from it in the step list's room; and brewing by hand the recipe
   book folds behind CHOOSE A RECIPE. With ?col=new the timers stay in the column unless ?tplace says where else */
const COL = TIMERS === "new" && QS.get("col") !== "today" ? "new" : "today";
const FOLD = COL === "new" && QS.get("col") === "new";
document.documentElement.dataset.col = COL;
/* the timer's row: by default (TIMER-REMOVE.md, approved on 22 Nov) REMOVE on every row beside START or PAUSE, one tap,
   with UNDO in its place for 5 real seconds; BACK TO its own time in its editor; + TIMER in the section's heading.
   ?trow=today is the row as built before, with the timers in the column; timers.html compares the two */
const TROW = TIMERS === "new" && (QS.get("trow") !== "today" || FOLD) ? "new" : "today";
document.documentElement.dataset.trow = TROW;
/* where the timers are on one screen (windows 1180 px wide and more), so the recipe column keeps the current step
   whole: by default (TIMER-PLACE.md, D, approved on 22 Nov) in a column beside the drawing, which gets narrower while
   there is a timer and is full width with none; it needs layout B, where the drawing has a row of its own under the
   faceplates. ?tplace=today keeps them in the recipe column, as built before. Kept for comparison: ?tplace=event
   beside the last event, under the title bar, and ?tplace=bottom in a bar along the bottom of the screen. Out of the
   column the timers are chips. Narrower than one screen, they stay in the column, as built */
const TPP = QS.get("tplace");
const TPLACE = TIMERS !== "new" || TROW !== "new" ? "" : ["event", "bottom"].includes(TPP) ? TPP
  : (TPP === "side" || (TPP == null && QS.get("col") !== "new")) && LAYOUT === "b" ? "side" : "";
if (TPLACE) document.documentElement.dataset.tplace = TPLACE;
/* the drawing after the boil. During the whirlpool and the hop stand the wort pump serves the boil kettle, not the
   HERMS coil, and the drawing stays simple: rather than pipes and valves drawn across from where the pump sits, it
   represents the wort pump another way. From the boil's start, layout B: ?wp=chill, the default, draws the wort pump at
   the boil kettle on a short loop through the chiller. ?wp=move is the same loop without the chiller and ?wp=swirl
   keeps the pump where it is and draws the wort turning in the kettle, both alternatives kept for comparison;
   ?wp=today is the released build's drawing, which goes back to recirculating after the boil, through the coil.
   whirlpool.html compares them */
const WP = ["today", "move", "swirl"].includes(QS.get("wp")) ? QS.get("wp") : "chill";
/* the strike water moments' recipe: by default the brewer's own, BrewStart (1.3.0, Ready by) heating the HLT itself at
   its heating start and holding the strike water until it has been moved, then MashIn on the Mash Tun. ?sws=step is
   the older shape, kept for comparison: a strike water step on the HLT (a MashInStep) after BrewStart, which BrewStart
   hands over to at its heating start, heating nothing itself, and which heats the water and asks for it to be moved
   (SW_STEPS, bsHandsOver) */
const SWS = QS.get("sws") === "step" ? "step" : "";
if (SWS) SW_STEPS.push(SW_STRIKE);
/* the title bar's name: the BREWERY_NAME setting, at every width, so the rig and a simulator can't be taken for each
   other. ?name=… tries another; blank shows CraftBeerPi. Two lines at most, then an ellipsis. A name of more than
   LONG_NAME characters is drawn smaller (0.7 of the size), so two lines fit the title bar's height on a monitor and a
   phone's narrow corner holds it; from 701 to 1023 px wide, where the question has a row of its own, it keeps the full
   size. Its title gives it whole. The page's title starts with it too, as the browser's tab is where two CraftBeerPis
   sit side by side */
const LONG_NAME = 24;
const BREWERY = (QS.has("name") ? QS.get("name") : "CraftBeerPi Brewery").trim() || "CraftBeerPi";
$(".brand .bname").textContent = BREWERY;
if (BREWERY.length > LONG_NAME) { $(".brand").setAttribute("data-long", ""); $(".brand").title = BREWERY; }
document.title = `${BREWERY} · Brew day (mockup)`;
/* BREWSCRIBE: the screen shows it where BrewScribe is installed; ?brewscribe=none shows the screen without it */
if (QS.get("brewscribe") === "none") $('.tabs a[data-tab="BrewScribe"]').remove();
/* the versions, shown somewhere inconspicuous: the recipe column's last line (verHTML). Each build carries its own: the
   release number and the commit it was built from, with when it was built; an installed release, as on the rig, the
   release number only. The demo's are made up and fixed, so the pictures don't change with each build. ?ver=release
   shows an installed release's; ?ver=none the screen without the line, as an older release draws it (for the picture
   test's comparison with that release) */
const VERSIONS = QS.get("ver") === "none" ? null : QS.get("ver") === "release" ? {ui: "0.5.1.a3.post12", built: "", cbpi: "4.7.7.post36"}
  : {ui: "0.5.1.a3.post12+abc1234", built: `12 Nov ${todS("21:47")}`, cbpi: "4.7.7.post36+def5678"};
/* ?focus=bk (boil-kettle.html): keep that vessel's faceplate in view and tell the page around this one where it is,
   so the page can show just that faceplate. ?focus=rig (whirlpool.html) does the same for the drawing, and
   ?focus=recipe and ?focus=tmrs (timers.html) for the recipe column and the timers */
const FOCUS = QS.get("focus");
const FOCUS_EL = {rig: "#rig", recipe: "#recipe", tmrs: "#tmrs"};
function reportFocus() {
  const el = FOCUS && parent !== window && (FOCUS_EL[FOCUS] ? $(FOCUS_EL[FOCUS]) : document.getElementById("pl-" + FOCUS));
  if (!el) return;
  let r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) { scrollBy(0, r.top - Math.max(0, (innerHeight - r.height) / 2)); r = el.getBoundingClientRect(); }
  parent.postMessage({type: "plate", x: r.left, y: r.top, w: r.width, h: r.height}, "*");
}
if (FOCUS) {
  new ResizeObserver(() => reportFocus()).observe(document.body);
  new MutationObserver(() => requestAnimationFrame(reportFocus)).observe(FOCUS === "recipe" || FOCUS === "tmrs" ? $("#recipe") : $("#plates"), {childList: true, subtree: true});
  addEventListener("scroll", () => requestAnimationFrame(reportFocus));
}
window.addEventListener("hashchange", () => load(location.hash.slice(1)));
load(location.hash.slice(1));
new ResizeObserver(drawRig).observe($("#rig"));
/* the pH box follows its reminder as the title bar changes size, and Brew Day asks BrewScribe again on its own time
   (phPoll) */
new ResizeObserver(() => phFit()).observe($("#banner"));
addEventListener("resize", () => phFit());
setInterval(phPoll, 1000);
/* the faceplates' width crossing 276 px inside moves the boil power's steps and a box's keys between one row and two;
   the recipe column going under the brewhouse, or back beside it, decides whether the steps' row keeps its place; and
   a new width for the recipe column, which changes with the faceplates', drops the kept height (pbFit) */
new ResizeObserver(() => { if (platesTight() !== TIGHT || mainStacked() !== STACKED || (pbKeep && $("#recipe").clientWidth !== pbKeep.w)) renderAll(); }).observe($("#plates"));
/* the current step whole again once the fonts are in, and as the column changes size. BrewStart's hint is fitted again
   too (bsFit): once the fonts are in, before the step; after a change of size, in the next frame, as on a phone fitting
   it can change the column's height again */
new ResizeObserver(() => { if (st) { keepStepInView(); drawSw(); requestAnimationFrame(() => { if (st && bsFit()) keepStepInView(); }); } }).observe($("#recipe"));
if (document.fonts) document.fonts.addEventListener("loadingdone", () => { if (st) { bsFit(); keepStepInView(); } });
/* ?tplace: the timers move between the column and their place as the window crosses one screen's width, and the chips
   hold what fits as it changes width */
if (TPLACE) {
  ONE_SCREEN.addEventListener("change", () => { if (st) renderAll(); });
  new ResizeObserver(() => { if (st) tPlaceFit(); }).observe($("#app"));
}
/* the timers' chips (beside the drawing, ?col=new's) worked out again once the fonts are in: the step's height, the
   widths of + TIMER and SOUND, and the drawing's labels beside the corner's buttons change with them */
if ((FOLD || TPLACE) && document.fonts) document.fonts.addEventListener("loadingdone", () => { if (st) { tFold(); tPlaceFit(); if (TPLACE) tsideCorner(); } });
