// CraftBeerPi's state, in the shapes the brew-day screen draws from.
//
// The mockup draws from its demo data (demo.js): RECIPE, VNAME, VACT, ACT,
// HERMS_DELTA and BOOK, which stay put through a brew day, and a scene - the
// readings, modes and step of one moment. These functions build the same
// shapes from what the web UI already holds (GET /system/ and the websocket),
// so the screen's drawing code does not know where its data came from.
//
// Which kettle is which is worked out from the settings CraftBeerPi already
// has, not from a new mapping to keep up to date:
// - the mash tun is MASH_TUN, else the kettle whose logic has an HLT sensor
//   among its settings (PID_HERMS does), else the one called "mash";
// - the boil kettle is BoilKettle, else the one called "boil";
// - the HLT is the one the mash tun's HERMS works on, found as PIDHerms finds
//   it: the kettle its HLT_Kettle names, else the one whose sensor is its
//   HLT_Sensor; else the one sharing the mash tun's heater, else the one called
//   "HLT".
// The switches follow from the kettles: the HLT element is the HLT's heater,
// the HLT pump its agitator, the wort pump the mash tun's agitator and the boil
// element the boil kettle's heater. On the rig that is HLT_HEAT, Recirc_PUMP,
// Wort PUMP and BK_HEAT. A switch with its own override on the rig is named in
// the setting BREWDAY_OVERRIDE_ACTOR (Recirc_PUMP).

export const VNAME = { hlt: "Hot liquor tank", mt: "Mash tun", bk: "Boil kettle" };
const ACT0 = {
  hltEl: { name: "HLT ELEMENT", kind: "heat", v: "hlt" },
  hltPump: { name: "HLT PUMP", kind: "pump", v: "hlt" },
  wortPump: { name: "WORT PUMP", kind: "pump", v: "mt" },
  bkEl: { name: "BOIL ELEMENT", kind: "heat", v: "bk" },
};
const VACT0 = { hlt: ["hltEl", "hltPump"], mt: ["wortPump"], bk: ["bkEl"] };
export const ROLES = ["hlt", "mt", "bk"];

export const num = (x) => {
  if (x === null || x === undefined || x === "" || typeof x === "boolean") return null;
  const n = typeof x === "number" ? x : parseFloat(String(x).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// config[KEY] is {name, value, type, ...}: its value.
export const cfg = (config, key) => {
  const c = config ? config[key] : undefined;
  return c && typeof c === "object" && "value" in c ? c.value : c;
};

// BREWDAY_TIMER_NAMES as CraftBeerPi reads it (TimersController.names): separated by commas, each with one space between
// words and kept to 24 characters, repeats dropped whatever their capitals; blank gives none. Read from the settings, a
// change shows at once on every screen: the timers' own message carries the names only when a timer changes.
export function timerNames(raw) {
  const out = [];
  for (const part of String(raw).split(",")) {
    const n = part.split(/\s+/).filter(Boolean).join(" ").slice(0, 24).trim();
    if (n && !out.some((o) => o.toLowerCase() === n.toLowerCase())) out.push(n);
  }
  return out;
}

export function kettleRoles(kettles, config, herms) {
  const ks = (kettles || []).filter(Boolean);
  const byId = (id) => (id ? ks.find((k) => k.id === id) : undefined);
  const named = (re, among = ks) => among.find((k) => re.test(String(k.name || "")));
  const mt = byId(cfg(config, "MASH_TUN")) || ks.find((k) => isHerms(k, herms)) || named(/mash/i) || null;
  const others = ks.filter((k) => k !== mt);
  const bk = byId(cfg(config, "BoilKettle")) || named(/boil/i, others) || others.find((k) => /boil/i.test(String(k.type || ""))) || null;
  const rest = ks.filter((k) => k !== mt && k !== bk);
  const p = (mt && mt.props) || {};
  const hk = p.HLT_Kettle, hs = p.HLT_Sensor;
  const hlt =
    (hk && rest.find((k) => k.id === hk)) ||
    (hs && rest.find((k) => k.sensor === hs)) ||
    (mt && mt.heater && rest.find((k) => k.heater === mt.heater)) ||
    named(/\bhlt\b|hot liquor/i, rest) ||
    (rest.length === 1 ? rest[0] : null);
  return { hlt: hlt || null, mt: mt && mt !== bk ? mt : null, bk: bk || null };
}

export function actorRoles(K, actors) {
  const list = (actors || []).filter(Boolean);
  const find = (id) => (id ? list.find((a) => a.id === id) || null : null);
  return {
    hltEl: find((K.hlt && K.hlt.heater) || (K.mt && K.mt.heater)),
    hltPump: find(K.hlt && K.hlt.agitator),
    wortPump: find(K.mt && K.mt.agitator),
    bkEl: find(K.bk && K.bk.heater),
  };
}

// A kettle runs a HERMS when its logic has an HLT sensor among its settings, as
// PID_HERMS does: it drives the HLT's element and the pump that moves wort
// through the coil. Not a kettle that only still holds an HLT_Sensor value:
// CraftBeerPi keeps a kettle's settings when its logic changes, so an HLT that
// went from PIDAutoTune to PIDBoil, which never runs its pump, can still hold
// one. `herms` is the set of logics with an HLT sensor setting, from the logic
// types CraftBeerPi publishes; until they arrive, a logic's name decides.
export const hermsLogics = (logic) =>
  new Set((logic || []).filter((t) => t && (t.properties || []).some((p) => p && p.label === "HLT_Sensor")).map((t) => t.name));
export const isHerms = (k, herms) =>
  !!(k && (herms && herms.size ? herms.has(k.type) : /herms/i.test(String(k.type || ""))));

// Does a kettle's logic declare this action, as BoilPower declares set_boil_power? Read from the logic types
// CraftBeerPi publishes, as the dashboard's kettle dialog reads them.
export const declares = (logic, type, method) =>
  !!type && (logic || []).some((t) => t && t.name === type && (t.actions || []).some((a) => a && a.method === method));

// Where BoilPower's boil power starts to be used (BoilPower._threshold, before 0.0.3.post7): the kettle's target when it
// has one, else its Boil_Threshold setting, else BoilPower's default, 99 °C / 210.2 °F. From 0.0.3.post7 (it declares
// set_boil_at) the target is an ordinary target, BOIL or a temperature to hold, and the boil point is Boil_Threshold alone.
export function boilThreshold(k, C, fromSetting = false) {
  const sv = num(k && k.target_temp);
  if (!fromSetting && sv != null && sv > 0) return sv;
  return num(k && k.props && k.props.Boil_Threshold) ?? (C === "F" ? 210.2 : 99);
}

// Timer.format_time: "HH:MM:SS", or "DDD HH:MM:SS" past a day. -> seconds, or null.
export function parseLeft(text) {
  const m = /^(?:(\d+)D )?(\d{1,2}):(\d{2}):(\d{2})$/.exec(String(text || "").trim());
  return m ? +(m[1] || 0) * 86400 + +m[2] * 3600 + +m[3] * 60 + +m[4] : null;
}

// Temperatures in a step's note follow the unit's sign: "170 F" -> "170 °F".
export const unitText = (text, U) =>
  String(text || "").replace(/(\d)\s*°?\s*([FC])\b(?![\w'])/g, (m, d, c) => (`°${c}` === U ? `${d} ${U}` : m));

// "3.00 oz Centennial" -> ["Centennial", "3.00 oz"]; "1 Whirlfloc Tablet" ->
// ["Whirlfloc Tablet", "1"]; "Centennial" -> ["Centennial", ""].
const AMOUNT = /^(\d+(?:[.,]\d+)?)\s*(oz|g|gr|kg|lbs?|ml|l|tsp|tbsp|pkg|packs?|tablets?|items?|x)?\.?(?=\s|$)\s*(.*)$/i;
export function splitAddition(text) {
  const s = String(text ?? "").trim();
  const m = AMOUNT.exec(s);
  if (!m) return [s, ""];
  return [m[3].trim(), m[2] ? `${m[1]} ${m[2]}` : m[1]];
}

// A boil step's additions as the mockup lists them, [time, name, amount], plus
// which one it is: the hop's number (Hop_1 is 1) or "fw" for first wort.
export function additions(p) {
  const out = [];
  if (p.First_Wort === "Yes") {
    const [n, amt] = splitAddition(p.First_Wort_text);
    out.push(["First wort", n || "First-wort hops", amt, "fw"]);
  }
  for (let i = 1; i <= 6; i++) {
    const t = num(p[`Hop_${i}`]);
    if (t == null) continue;
    const [n, amt] = splitAddition(p[`Hop_${i}_text`]);
    out.push([t, n || `Hop ${i}`, amt, i]);
  }
  return out;
}

/* BrewStart, as Brew Day's row and box read it (design/brewday BREWSTART-EDIT.md):
   - its time, as "07:00": Ready by's (ready: hot by then) or Start at's (start: heating starts then); either heats the
     water and holds it until the brewer's NEXT (BrewStart 1.3.0.post7), and a blank Timing is Ready by, as it reads it;
   - its day: a date ("2026-11-21") where its Mode is Date, or how it counts one (mode: Today or Tomorrow, from START;
     Daily, an older form's next time the clock shows it); while it waits, the day it planned for, which it keeps with the
     step (planned, from _brewstart_planned: "<settings>|<moment>");
   - the water's temperature, how much there is and its unit; the kettle it heats (Heat_Kettle) by its name in
     CraftBeerPi, which UNLOAD's reason gives while it waits; its element's power; the grain's temperature, blank for the
     boil kettle's probe; the Campden reminder;
   - its settings as read (props), which a change on Brew Day sends back whole */
const BS_DAY = [/^(\d{4})-(\d{2})-(\d{2})$/, /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})$/];
function bsDay(x) {
  const t = String(x ?? "").trim(), a = BS_DAY[0].exec(t), b = BS_DAY[1].exec(t);
  const [y, mo, d] = a ? [+a[1], +a[2], +a[3]] : b ? [b[3].length === 2 ? 2000 + +b[3] : +b[3], +b[2], +b[1]] : [];
  if (!y) return null;
  const day = new Date(Date.UTC(y, mo - 1, d));
  return day.getUTCMonth() === mo - 1 && day.getUTCDate() === d ? day.toISOString().slice(0, 10) : null;
}
function brewStartModel(p, U, kname) {
  const m = {kind: String(p.Timing || "").trim() === "Start at" ? "start" : "ready", props: p};
  const at = /^\s*(\d{1,2})(?::(\d{2})(?::\d{2})?)?\s*$/.exec(String(p.StartTime ?? "")), h = at ? +at[1] : 99, mi = at && at[2] != null ? +at[2] : 0;
  if (h < 24 && mi < 60) m[m.kind] = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  m.mode = String(p.Mode || "").trim() || "Today";
  if (m.mode === "Date" || m.mode === "DateTime") m.date = bsDay(p.StartDate);
  const kept = String(p._brewstart_planned || ""), moment = kept.slice(kept.lastIndexOf("|") + 1);
  if (kept.includes("|")) m.planned = bsDay(moment.slice(0, 10));
  /* the water as its settings have it: both timings heat it, so the row and the box give it for either */
  const ready = num(p.Ready_Temp), vol = num(p.Volume), watts = num(p.Heater_Watts);
  const W = {temp: ready, vol: vol != null && vol > 0 ? vol : null, volU: p.Volume_Unit === "L" || p.Volume_Unit === "gal" ? p.Volume_Unit : U === "°C" ? "L" : "gal",
    watts: watts != null && watts > 0 ? watts : null, kn: kname[p.Heat_Kettle] || null};
  m.water = W;
  if (W.temp != null) m.temp = W.temp;
  if (W.vol != null) { m.vol = W.vol; m.volU = W.volU; }
  if (W.kn) m.kn = W.kn;
  m.grain = num(p.Grain_Temp);
  m.campden = p.Campden_Reminder === "Yes";
  return m;
}

/* BrewStart's question while it holds the strike water, in its own words (1.3.0.post7), for either timing: the screen
   says it where CraftBeerPi's question isn't up (after a restart BrewStart doesn't ask twice), and the demo asks it */
export const bsHoldWords = (temp, U, mt = "Mash Tun") => `Strike water hot and holding at ${temp != null && Number.isFinite(+temp) ? `${(+temp).toFixed(1)} ${U}` : "its temperature"}. When you've moved the strike water to the ${mt} and connected the hoses and pumps for recirculating, press NEXT.`;

export function stepModel(s, roleOf, U, kname = {}) {
  const p = (s && s.props) || {};
  const temp = num(p.Temp), t = num(p.Timer);
  // BrewStart names its kettle Heat_Kettle: on the HLT it is the step that heats the strike water (BrewStart 1.3.0)
  const m = {
    n: String((s && s.name) ?? ""),
    k: roleOf[p.Kettle] || (s && s.type === "BrewStart" && roleOf[p.Heat_Kettle]) || (/boil|whirlpool|cool/i.test(String(s.type || "")) ? "bk" : "mt"),
    id: s.id, type: s.type, status: s.status, text: s.state_text,
  };
  if (temp != null) m.temp = temp;
  if (t != null && t > 0) m.min = t;
  if (s.type === "BrewStart") Object.assign(m, brewStartModel(p, U, kname));
  if (s.type === "MashInStep") {
    /* the malt goes in where a MashInStep runs on the mash tun (or a kettle not known to be another); on the HLT it heats
       the strike water, and its line is its own question, as CraftBeerPi will ask it, else what it does */
    const onHlt = roleOf[p.Kettle] === "hlt", ask = onHlt ? unitText(p.Notification, U).trim() : "";
    m.note = onHlt ? ask || (temp != null ? `Heats the water to ${temp} ${U}` : "Heats the water")
      : temp != null ? `Add the malt when it reaches ${temp} ${U}` : "Add the malt when it is up to temperature";
    // its grain weight, by which the strike water box knows the recipe has one where BeerSmith's mash figures are missing
    const kg = num(p.Grain_Kg);
    if (kg != null && kg > 0) m.kg = kg;
  }
  else if (s.type === "NotificationStep" && p.Notification) m.note = unitText(p.Notification, U);
  if (s.type === "BoilStep") {
    m.boil = true;
    const adds = additions(p);
    if (adds.length) {
      m.adds = adds;
      // which reminders the boil gave - all of them, unless it was skipped or ended early
      const done = new Set((p._hops_done || []).map(Number));
      m.addsDone = adds.map((a) => (a[3] === "fw" ? !!p._first_wort_done : done.has(a[3])));
    }
  }
  return m;
}

// The water a recipe needs, all of it through the HLT, strike and sparge, from its import's figures (the recipe's
// mash_numbers, in litres and kg): what goes into the boil kettle before the boil (boil_l), less anything topped up there
// (top_up_kettle_l), plus what the grain keeps and what is lost under the mash (lauter_dead_l). The grain's share is the
// Grain absorption setting's (GRAIN_ABSORPTION, gal/lb for a °F brewery, L/kg for °C), as a BeerXML file has no figure for
// it. In the brewery's volume unit (gal for °F, L for °C), with the parts the sum is made of; null when the recipe or the
// setting doesn't give the figures. For a new BrewStart's water, on the Recipe Book, Brew Steps and Brew Day alike.
export const GAL_L = 3.785411784;
const LB_KG = 0.45359237;
export function recipeWater(mn, absorption, C) {
  const a = num(absorption), boil = mn ? num(mn.boil_l) : null, grain = mn ? num(mn.grain_kg) : null;
  if (boil == null || grain == null || a == null) return null;
  const F = C === "F", perKg = F ? (a * GAL_L) / LB_KG : a, toU = (l) => (F ? l / GAL_L : l);
  const before = boil - (num(mn.top_up_kettle_l) || 0), kept = grain * perKg, lost = num(mn.lauter_dead_l) || 0;
  return { total: toU(before + kept + lost), before: toU(before), kept: toU(kept), lost: toU(lost), unit: F ? "gal" : "L",
    rate: `${a} ${F ? "gal/lb" : "L/kg"}` };
}

// The recipe's mash figures as CraftBeerPi keeps them (mash_numbers) are BeerSmith's, from an import of its file, and
// any typed in Brew Day's strike water box where BeerSmith's were missing. Those typed are named in its typed: "grain",
// kept as grain_kg, and "water", the strike water to the mash tun, kept as infuse_l. They are never BeerSmith's.
// typedFigures: the names of those typed, grain first; beerSmithFigures: whether any figure is BeerSmith's; typedWords:
// those typed, in words ("grain weight and mash water").
const TYPED_FIELD = { grain: "grain_kg", water: "infuse_l" };
const TYPED_WORDS = { grain: "grain weight", water: "mash water" };
export function typedFigures(mn) {
  if (!mn || typeof mn !== "object" || !Array.isArray(mn.typed)) return [];
  return Object.keys(TYPED_FIELD).filter((k) => mn.typed.includes(k) && num(mn[TYPED_FIELD[k]]) != null);
}
export function beerSmithFigures(mn) {
  if (!mn || typeof mn !== "object") return false;
  const typed = typedFigures(mn).map((k) => TYPED_FIELD[k]);
  return Object.keys(mn).some((k) => k !== "lacks" && k !== "typed" && !typed.includes(k) && mn[k] != null);
}
export const typedWords = (typed) => typed.map((k) => TYPED_WORDS[k]).join(" and ");

// Why a recipe's own water can't be worked out (recipeWater gives none), in the words of a new BrewStart's note on the
// recipe pages and of Brew Day's BrewStart box alike. Figures typed on Brew Day are named as typed, never as
// BeerSmith's.
export function waterLacks(mn, absorption) {
  const typed = typedFigures(mn);
  return !beerSmithFigures(mn) ? `this recipe has no BeerSmith mash figures to work it out from${typed.length ? `, only the ${typedWords(typed)} typed on Brew Day` : ""}`
    : num(absorption) == null ? "CraftBeerPi has no Grain absorption setting to work this recipe's out with"
    : "this recipe's BeerSmith figures lack the volume before the boil or the grain's weight";
}

// The water of a brew that was brewed, for a new BrewStart on a recipe whose own can't be worked out: of CraftBeerPi's
// past brews (GET /figures/, from its logs and BrewScribe, `data`), the newest whose HLT heating recorded its water (its
// hlt cell's volume, in the answer's vol_unit, else vu). A recipe that was only loaded, or kept in the book, is never
// one of them. The recipe pages and Brew Day's + BrewStart take it the same way.
// -> {vol, unit, name, start (seconds)}, or null
export function pastWater(data, vu) {
  const d = data && typeof data === "object" ? data : {};
  const brews = (Array.isArray(d.brews) ? d.brews : []).filter((b) => b && typeof b === "object")
    .sort((p, q) => (num(q.start) ?? -Infinity) - (num(p.start) ?? -Infinity));
  const b = brews.find((x) => x.cells && x.cells.hlt && num(x.cells.hlt.volume) > 0);
  if (!b) return null;
  return { vol: num(b.cells.hlt.volume), unit: d.vol_unit === "L" || d.vol_unit === "gal" ? d.vol_unit : vu,
    name: b.name == null ? "" : String(b.name).trim(), start: num(b.start) };
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// A past brew (pastWater) in words: "Rye Pale Ale, brewed Sat 21 Nov", or "the brew of Sat 21 Nov".
export function brewWords(p) {
  const d = p.start != null ? new Date(p.start * 1000) : null, day = d ? `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}` : "";
  return p.name ? `${p.name}${day ? `, brewed ${day}` : ""}` : day ? `the brew of ${day}` : "an earlier brew";
}

// A length of time in words: "under a minute", "20 min", "9 h 35 min".
export const durWords = (sec) => {
  const m = Math.round(sec / 60);
  return sec < 60 ? "under a minute" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
};

// How far off a time is, counted from now by CraftBeerPi's clock, in the same words in BrewStart's box on Brew Day and
// under a BrewStart's time on the recipe pages: "in 9 h 35 min". On a simulator, whose clock runs `scale` times as fast
// as the real one, the real time too: "in 9 h 35 min, about 19 real minutes at 30×".
export function inWords(sec, scale = 1) {
  const says = `in ${durWords(sec)}`;
  if (!(scale > 0) || scale === 1) return says;
  const real = sec / scale, rm = Math.round(real / 60);
  return `${says}, ${real < 60 ? "under a real minute" : rm < 90 ? `about ${rm} real minute${rm === 1 ? "" : "s"}` : `about ${Math.round(real / 3600)} real hours`} at ${scale}×`;
}

export function model(snap) {
  const herms = hermsLogics(snap.logic);
  const K = kettleRoles(snap.kettles, snap.config, herms);
  const A = actorRoles(K, snap.actors);
  const override = cfg(snap.config, "BREWDAY_OVERRIDE_ACTOR");
  const ACT = {}, VACT = {};
  for (const id in ACT0) {
    const a = A[id];
    ACT[id] = { ...ACT0[id], id: a ? a.id : null, override: !!(a && override && a.id === override) };
  }
  for (const v in VACT0) VACT[v] = VACT0[v].filter((id) => ACT[id].id);
  const C = String(cfg(snap.config, "TEMP_UNIT") || "C").toUpperCase() === "F" ? "F" : "C";
  const U = `°${C}`;
  const roleOf = {}, kname = {};
  for (const v of ROLES) if (K[v]) roleOf[K[v].id] = v;
  for (const k of snap.kettles || []) if (k && k.id != null && k.name) kname[k.id] = String(k.name);
  const steps = (snap.steps || []).filter(Boolean).map((s) => stepModel(s, roleOf, U, kname));
  // the new boil kettle: a BoilPower whose target is BOIL or a hold, from 0.0.3.post7
  const BKNEW = !!K.bk && declares(snap.logic, K.bk.type, "set_boil_at");
  // the boil kettle's steam condenser on its lid (design/brewday STEAM-SLAYER.md), from its kettle fields: none (""), its
  // mister set by hand ("hand"), or switched by CraftBeerPi ("switched": steps_boil_actor names an actor, MISTER). Its
  // name, as the drawing, the phone's line and CraftBeerPi's reminder say it: "steam condenser" when blank
  const fitted = !!K.bk && String(K.bk.condenser ?? "").trim().toLowerCase() === "fitted";
  const misterId = cfg(snap.config, "steps_boil_actor");
  const mister = misterId ? (snap.actors || []).find((a) => a && a.id === misterId) : null;
  const SS = fitted ? (mister ? "switched" : "hand") : "";
  const SS_NAME = (fitted && String(K.bk.condenser_name ?? "").trim()) || "steam condenser";
  return {
    K, A, VNAME, ACT, VACT, U, C,
    HERMS: isHerms(K.mt, herms),
    HERMS_LOGICS: herms,
    HERMS_DELTA: num(K.mt && K.mt.props && K.mt.props.DeltaTemp) ?? 0,
    // the boil power button: only for a boil kettle whose logic declares set_boil_power
    BOILPOWER: !!K.bk && declares(snap.logic, K.bk.type, "set_boil_power"),
    BKNEW,
    // the new MANUAL: a BoilPower that heats by hand at the boil power declares heat_by_hand_at_boil_power (0.0.3.post13).
    // An older one heats by hand at the element's own level, so MANUAL stays as before there
    BKHAND: BKNEW && declares(snap.logic, K.bk.type, "heat_by_hand_at_boil_power"),
    BOIL_TH: boilThreshold(K.bk, C, BKNEW),
    SS, SS_NAME, MISTER: SS === "switched" ? mister.id : null,
    // a waiting BrewStart takes a new day and time: one that declares change_time (1.2.0.post10), read from the step
    // types as BoilPower's markers are from the logic types. An older one can't, so its time is greyed while it waits
    BSRETIME: declares(snap.stepTypes, "BrewStart", "change_time"),
    // Brew Steps changes a running BrewStart's settings through its change_settings (1.3.0.post6); BrewStart's box says
    // so where it can't swap Ready by and Start at itself
    BSSETS: declares(snap.stepTypes, "BrewStart", "change_settings"),
    // the recipe's name as CraftBeerPi has it, blank for steps that have none (given); name stands in for it on screen
    RECIPE: { name: (snap.basic && snap.basic.name) || "Brew steps", given: String((snap.basic && snap.basic.name) || ""), steps },
    BOOK: snap.book || [],
    LIMITS: C === "F" ? [32, 230] : [0, 110],
    // where a target editor starts when a vessel has none: the mockup's, in °F
    START: C === "F" ? { hlt: 168.0, mt: 149.0, bk: 210.2 } : { hlt: 76.0, mt: 65.0, bk: 99.0 },
  };
}

// The Recipe Book's one-line summary: "7 steps · mash 126, 149 and 168 °F · 90 min boil".
const and = (xs) => (xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export function bookLine(recipe, U) {
  const steps = (recipe && Array.isArray(recipe.steps) ? recipe.steps : []).filter(Boolean);
  const mash = [];
  let boil = null;
  for (const s of steps) {
    const p = s.props || {}, t = num(p.Temp);
    if (s.type === "BoilStep") boil = num(p.Timer);
    else if (/^Mash(In)?Step$/.test(String(s.type || "")) && t != null && !mash.includes(t)) mash.push(t);
  }
  const parts = [`${steps.length} step${steps.length === 1 ? "" : "s"}`];
  if (mash.length) parts.push(`mash ${and(mash)} ${U}`);
  if (boil) parts.push(`${boil} min boil`);
  return parts.join(" · ");
}
