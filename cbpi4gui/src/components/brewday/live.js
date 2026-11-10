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
// CraftBeerPi keeps a kettle's settings when its logic changes, and the rig's
// HLT kept one from PIDAutoTune when it went to PIDBoil (rig record, 10 Oct),
// which never runs its pump. `herms` is the set of such logics, from the logic
// types CraftBeerPi publishes; until they arrive, a logic's name decides.
export const hermsLogics = (logic) =>
  new Set((logic || []).filter((t) => t && (t.properties || []).some((p) => p && p.label === "HLT_Sensor")).map((t) => t.name));
export const isHerms = (k, herms) =>
  !!(k && (herms && herms.size ? herms.has(k.type) : /herms/i.test(String(k.type || ""))));

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

export function stepModel(s, roleOf, U) {
  const p = (s && s.props) || {};
  const temp = num(p.Temp), t = num(p.Timer);
  const m = {
    n: String((s && s.name) ?? ""),
    k: roleOf[p.Kettle] || (/boil|whirlpool|cool/i.test(String(s.type || "")) ? "bk" : "mt"),
    id: s.id, type: s.type, status: s.status, text: s.state_text,
  };
  if (temp != null) m.temp = temp;
  if (t != null && t > 0) m.min = t;
  if (s.type === "MashInStep") m.note = temp != null ? `Add the malt when it reaches ${temp} ${U}` : "Add the malt when it is up to temperature";
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
  const roleOf = {};
  for (const v of ROLES) if (K[v]) roleOf[K[v].id] = v;
  const steps = (snap.steps || []).filter(Boolean).map((s) => stepModel(s, roleOf, U));
  return {
    K, A, VNAME, ACT, VACT, U, C,
    HERMS: isHerms(K.mt, herms),
    HERMS_LOGICS: herms,
    HERMS_DELTA: num(K.mt && K.mt.props && K.mt.props.DeltaTemp) ?? 0,
    RECIPE: { name: (snap.basic && snap.basic.name) || "Brew steps", steps },
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
