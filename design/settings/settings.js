/* Settings mockup (proposal, 11 Nov 2026): the groups in brewing order, each setting's plain name over its key, FIND A
   SETTING, one SAVE for every change, and the answer at each row. Vanilla JS like brew-day.js. A mockup: SAVE only
   pretends, and nothing here talks to CraftBeerPi. Values are the simulator's (settings-data.js). */
"use strict";
(() => {
const CFG = window.CBPI_CONFIG, TH = window.CBPI_THINGS;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const F = String((CFG.TEMP_UNIT || {}).v || "C").toUpperCase().startsWith("F");
const DEG = F ? "°F" : "°C", tmp = (f, c) => (F ? f : c) + " " + DEG;
const phone = () => matchMedia("(max-width:700px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const calm = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ---------- what the page knows about each setting: its plain name (n), what it does (h), its control, and the rest.
   A setting it doesn't know still shows: under its plugin's name in Plugins, or under "Not sorted yet" in System, by
   its key, with its own description. ---------- */
const M = {
  BREWERY_NAME: {n: "Brewery name", h: "Your brewery's name, at the top of the screen.", syn: "title header brand"},
  TEMP_UNIT: {n: "Temperature unit", h: "Every temperature CraftBeerPi shows.", order: ["F", "C"], lab: {F: "°F", C: "°C"}, keep: 1, syn: "fahrenheit celsius degrees"},
  PRESSURE_UNIT: {n: "Pressure unit", h: "Used by the fermenter widgets.", keep: 1, syn: "psi kpa fermenter"},
  MASH_TUN: {n: "Mash tun", h: "The kettle that mashes. The brew-day screen, the HLT pump and imported recipes go by it.", blank: "None chosen", syn: "kettle mlt"},
  BoilKettle: {n: "Boil kettle", h: "The kettle that boils. Imported recipes boil, whirlpool and cool in it; with more than one kettle they won't import until it's chosen.", blank: "None chosen", syn: "kettle bk"},
  ACTOR_INTERLOCK_MODE: {n: "Heating element interlock", h: "One at a time stops two heating elements running together, using the heaters your kettles name. Off if your supply can run both.", order: ["One heating element at a time", "Off"], lab: {"One heating element at a time": "One at a time"}, syn: "safety supply breaker element heater"},
  ACTOR_INTERLOCK_GROUPS: {n: "Switches never on together", dep: {on: "ACTOR_INTERLOCK_MODE"}, adv: 1, h: "Only if the interlock above can't describe your rig. Switch names, such as HLT Heater,Boil Heater; separate groups with ;. Renaming a switch breaks this without warning.", syn: "interlock actor groups"},
  BREWDAY_OVERRIDE_ACTOR: {n: "Switch with a hand override", h: "A switch the rig can run by hand whatever CraftBeerPi says. The brew-day screen then warns that it may still run after you switch it off.", blank: "None", syn: "override recirc pump"},

  AUTHOR: {n: "Recipe author", h: "Put on recipes you create or import."},
  AutoMode: {n: "Imported steps run their kettle in AUTO", h: "Steps from an imported recipe switch their kettle's AUTO on and off. You can still change each step.", syn: "automode auto mode kettle logic"},
  brewfather_user_id: {n: "Brewfather user ID", h: "With the API key, lets the Recipe book list your Brewfather recipes."},
  brewfather_api_key: {n: "Brewfather API key", secret: 1},
  brewfather_list_length: {n: "Brewfather recipes shown", ctl: "select", h: "How many the Brewfather list shows."},
  RECIPE_CREATION_PATH: {n: "Recipe creation plugin path", adv: 1, h: "Change it only for a recipe creation plugin. Normally upload."},

  HLT_PUMP_WITH_HEAT: {n: "Run the HLT pump while the HLT heats", h: "Until the recipe reaches its sparge, so the water doesn't settle into hot and cool layers. It keeps running when the heat stops; you can still stop it.", syn: "recirc agitator layers"},
  AddMashInStep: {n: "Add a mash-in step if the recipe has none"},
  steps_mashin: {n: "Mash-in step type", blank: "Standard: MashInStep"},
  steps_mash: {n: "Mash step type", blank: "Standard: MashStep"},
  AddMashOutStep: {n: "Add a mash out if the recipe has none", h: "10 minutes at " + tmp(168, 76) + " before the sparge.", syn: "mashout"},
  steps_mashout: {n: "Lautering stop after the mash", blank: "None", h: "NotificationStep adds a Lautering step that waits for you; nothing else adds one.", syn: "mashout mash out lauter"},
  steps_sparge: {n: "Sparge step type", blank: "Standard: SpargeStep", h: "SpargeStep heats the HLT to the sparge temperature and leaves both pumps to you; MashStep runs the sparge as a mash rest."},

  CONFIRM_BEFORE_BOIL: {n: "Ask before heating the boil kettle", h: "A mash step moves on the moment its timer ends, which could heat the boil element before the wort is in.", syn: "confirm safety element"},
  BoilAutoTimer: {n: "Start the boil timer by itself", h: "Once the temperature holds above " + tmp(203, 95) + " for 5 minutes.", syn: "auto timer"},
  steps_boil_lid_alert: {n: "Lid alert message", h: "Shown as the wort nears the boil, in a boil step with its lid alert on.", syn: "lid steam slayer mister condenser"},
  steps_boil_actor: {n: "Lid alert switch", blank: "None", h: "Switched on with the lid alert: an exhaust fan or a steam condenser.", syn: "exhaust fan steam condenser mister"},
  steps_boil: {n: "Boil step type", blank: "Standard: BoilStep"},
  steps_boil_temp: {n: "Boil temperature", unit: DEG, h: "For imported recipes that give none."},

  steps_whirlpool_temp: {n: "Whirlpool temperature", unit: DEG, h: "Cool to this before the whirlpool hops go in, when the recipe gives none (BeerXML files never do)."},
  steps_cooldown: {n: "Cooldown step type", blank: "Standard: WaitStep"},
  steps_cooldown_temp: {n: "Cooldown temperature", unit: DEG, h: "A notification when the wort gets there."},
  steps_cooldown_sensor: {n: "Cooldown probe", blank: "The kettle's own probe"},
  steps_cooldown_actor: {n: "Cooldown water switch", blank: "None", h: "Turns the cooling water on and off."},

  BREWDAY_TIMER_NAMES: {n: "Timer names to pick", h: "Separated by commas, up to 24 characters each; the first six show, in this order. You can still type any name on brew day. Blank shows none.", syn: "timers"},
  BREWDAY_ALARM_SOUND: {n: "Timer alarm sound", ctl: "sound", order: ["kitchen", "alarm", "high", "soft"], h: "What the brew-day screen plays when a timer runs out, every 3 seconds until you answer it.", syn: "sound beep alarm kitchen high ping"},
  PLAY_BUZZER: {n: "Buzzer for notifications", h: "The browser beeps when a notification arrives.", syn: "sound beep"},
  NOTIFY_ON_ERROR: {n: "Warnings and errors as notifications", h: "When CraftBeerPi logs a warning or an error.", syn: "log error notify"},

  CSVLOGFILES: {n: "Save readings to log files", restart: "on", h: "Each probe's readings, as CSV files.", syn: "csv logging sensor data"},
  SENSOR_LOG_MAX_BYTES: {n: "Largest log file", unit: "bytes", wide: 1, dep: {on: "CSVLOGFILES", is: "Yes"}, restart: "next", h: "Then it starts a new one.", calc: "size"},
  SENSOR_LOG_BACKUP_COUNT: {n: "Old log files kept", unit: "per probe", dep: {on: "CSVLOGFILES", is: "Yes"}, restart: "next", calc: "span"},
  PID_LOGGING: {n: "Log element power and target too", h: "Beside the temperatures, so a PID can be judged after the brew. It writes more.", syn: "pid duty setpoint"},
  INFLUXDB: {n: "Send readings to InfluxDB", restart: "on", h: "Each probe's readings, written to an InfluxDB database as well.", syn: "influx grafana database"},
  INFLUXDBCLOUD: {n: "InfluxDB Cloud", dep: {on: "INFLUXDB", is: "Yes"}, h: "Yes if the database is on InfluxDB Cloud. The boxes below then ask for its bucket, organisation and token."},
  INFLUXDBADDR: {n: "Address", dep: {on: "INFLUXDB", is: "Yes"}, h: "With http:// and the port, such as http://localhost:8086.", syn: "influxdb url"},
  INFLUXDBNAME: {n: "Database", cloud: "Bucket", dep: {on: "INFLUXDB", is: "Yes"}, h: "The database the readings go into.", hc: "The bucket the readings go into.", syn: "influxdb bucket"},
  INFLUXDBUSER: {n: "User", cloud: "Organisation", dep: {on: "INFLUXDB", is: "Yes"}, h: "Only if the database needs one.", hc: "Your organisation's name on InfluxDB Cloud.", syn: "influxdb organisation organization"},
  INFLUXDBPWD: {n: "Password", cloud: "Token", secret: 1, dep: {on: "INFLUXDB", is: "Yes"}, h: "Only if the database needs one.", hc: "The token from your InfluxDB Cloud account.", syn: "influxdb token"},
  INFLUXDBMEASUREMENT: {n: "Measurement", dep: {on: "INFLUXDB", is: "Yes"}, h: "The name the readings are filed under. Blank means “measurement”.", syn: "influxdb"},
  MQTTUpdate: {n: "MQTT resend interval", ctl: "select", restart: "any", order: ["30", "60", "120", "300", "0"], lab: {"30": "Every 30 s", "60": "Every 60 s", "120": "Every 2 min", "300": "Every 5 min", "0": "Never"}, h: "Sends kettle and fermenter state over MQTT this often, even when nothing changed."},

  BREWSTART_LANGUAGE: {n: "Language", restart: "any", keep: 1, h: "BrewStart's settings and messages. Its step form changes after a restart."},
  SIM_TIME_SCALE: {n: "Simulation speed", unit: "× real time", h: "Simulated seconds per real second. 1 is real time; 60 rehearses an hour-long ramp in a minute. Every simulated vessel at once."},

  MIN_MEMORY: {n: "Warn when free memory falls below", unit: "MB", h: "CraftBeerPi needs about this much to run properly."},
  max_dashboard_number: {n: "Free-form dashboards", ctl: "select", h: "How many the Dashboard page offers."},
  slow_pipe_animation: {n: "Slow the dashboard's pipe animation", h: "At full speed it can take nearly all of the Pi's CPU."}
};
/* the groups, in brewing order; a see-also line names a setting that lives in another group but matters here */
const G = [
  {id: "brewhouse", name: "Brewhouse", sum: "Its name and units, which kettle is which, and what may run together",
    parts: [{rows: ["BREWERY_NAME", "TEMP_UNIT", "PRESSURE_UNIT", "MASH_TUN", "BoilKettle", "ACTOR_INTERLOCK_MODE", "ACTOR_INTERLOCK_GROUPS", "BREWDAY_OVERRIDE_ACTOR"]}]},
  {id: "recipes", name: "Recipes", sum: "Bringing recipes in, from Brewfather or a file",
    parts: [{rows: ["AUTHOR", "AutoMode", "brewfather_user_id", "brewfather_api_key", "brewfather_list_length", "RECIPE_CREATION_PATH"]}]},
  {id: "mash", name: "Mash and sparge", sum: "Mash in, the mash, mash out and the sparge", see: "MASH_TUN",
    parts: [{h: "While you brew", rows: ["HLT_PUMP_WITH_HEAT"]}, {h: "In imported recipes", rows: ["AddMashInStep", "steps_mashin", "steps_mash", "AddMashOutStep", "steps_mashout", "steps_sparge"]}]},
  {id: "boil", name: "Boil", sum: "Heating to the boil, the boil timer and the lid alert", see: "BoilKettle",
    parts: [{h: "While you brew", rows: ["CONFIRM_BEFORE_BOIL", "BoilAutoTimer", "steps_boil_lid_alert", "steps_boil_actor"]}, {h: "In imported recipes", rows: ["steps_boil", "steps_boil_temp"]}]},
  {id: "cool", name: "Whirlpool and cooling", sum: "The whirlpool hops and cooling the wort",
    parts: [{h: "In imported recipes", rows: ["steps_whirlpool_temp", "steps_cooldown", "steps_cooldown_temp", "steps_cooldown_sensor", "steps_cooldown_actor"]}]},
  {id: "timers", name: "Timers and alerts", sum: "What you see and hear while you brew",
    parts: [{rows: ["BREWDAY_TIMER_NAMES", "BREWDAY_ALARM_SOUND", "PLAY_BUZZER", "NOTIFY_ON_ERROR"]}]},
  {id: "logs", name: "Logs and data", sum: "What CraftBeerPi keeps and sends",
    parts: [{h: "Log files", rows: ["CSVLOGFILES", "SENSOR_LOG_MAX_BYTES", "SENSOR_LOG_BACKUP_COUNT", "PID_LOGGING"]}, {h: "InfluxDB", rows: ["INFLUXDB", "INFLUXDBCLOUD", "INFLUXDBADDR", "INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD", "INFLUXDBMEASUREMENT"]}, {h: "MQTT", rows: ["MQTTUpdate"]}]},
  {id: "plugins", name: "Plugins", sum: "Each plugin's settings, under its name", plugins: true},
  {id: "system", name: "System and dashboards", sum: "The software itself",
    parts: [{rows: ["MIN_MEMORY", "max_dashboard_number", "slow_pipe_animation"]}]}
];
const PLUGIN = {cbpi4_BrewStart: ["BrewStart", ""], simvessel: ["SimVessel", "on the simulator only"]};
const PLUGIN_ORDER = ["BREWSTART_LANGUAGE", "SIM_TIME_SCALE"];
/* words that belong to settings kept elsewhere, for FIND when nothing here matches */
const ELSEWHERE = /\b(pid|hysteresis|kp|ki|kd|gain|gains|logic|boil ?power|threshold|offset|calibrat\w*|gpio|pin)\b/i;
const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* the frame reads the address as the brew-day mockup does: ?name=… stands for the BREWERY_NAME setting (so its row here
   says the same), ?brewscribe=none for a CraftBeerPi without BrewScribe */
const QS = new URLSearchParams(location.search);
const LONG_NAME = 24;
const QNAME = (QS.has("name") ? QS.get("name") : "CraftBeerPi Brewery").trim() || "CraftBeerPi";
const PAUSED = "No connection. Controls are paused.";

/* ---------- state ---------- */
let st;
function fresh() {
  st = {saved: {}, draft: {}, row: {}, q: "", cur: null, shown: {}, view: "index", pg: null, leave: null,
    link: "ok", saving: false, later: [], failKey: null, extra: {},
    events: [["14:31:52", "Mash Tun at target, 149.0 °F", "confirmed", "ok"]]};
  for (const k in CFG) st.saved[k] = CFG[k].v;
  if (QS.has("name")) st.saved.BREWERY_NAME = QS.get("name");
}
const all = () => Object.assign({}, CFG, st.extra);
const meta = k => M[k] || {};
const src = k => (all()[k] || {}).s || "craftbeerpi";
const typ = k => (all()[k] || {}).t || "string";
const val = k => (k in st.draft ? st.draft[k] : st.saved[k]);
const blankish = v => v == null || String(v).trim() === "";
const textish = k => ["string", "number"].includes(typ(k));
const same = (k, a, b) => textish(k) ? String(a == null ? "" : a).trim() === String(b == null ? "" : b).trim() : String(a == null ? "" : a) === String(b == null ? "" : b);
const isChanged = k => k in st.draft && !same(k, st.draft[k], st.saved[k]);
const ctlOf = k => {
  const m = meta(k), t = typ(k), o = (all()[k] || {}).o || [];
  if (m.ctl) return m.ctl;
  if (m.secret) return "secret";
  if (["kettle", "actor", "sensor", "step", "fermenter"].includes(t)) return "select";
  if (t === "number") return "num";
  if (t === "select") return o.length <= 4 ? "seg" : "select";
  return "text";
};
const invalid = k => {
  if (ctlOf(k) !== "num" || !isChanged(k)) return "";
  const v = String(st.draft[k]).trim();
  return v === "" || !isFinite(Number(v)) ? `Type a number, like ${esc(st.saved[k])}.` : "";
};
const nameOf = k => {
  const m = meta(k);
  return m.cloud && val("INFLUXDBCLOUD") === "Yes" ? m.cloud : (m.n || k);
};
const helpOf = k => { const m = meta(k); if (!m.n) return (all()[k] || {}).d || ""; return (m.hc && val("INFLUXDBCLOUD") === "Yes" ? m.hc : m.h) || ""; };
function opts(k) {
  const m = meta(k), c = all()[k] || {}, t = c.t;
  if (["kettle", "actor", "sensor"].includes(t)) return [["", m.blank || "None"], ...TH[t].map(x => [x[0], x[1]])];
  if (t === "step") return [["", m.blank || "None"], ...TH.step.map(s => [s, s])];
  let o = (c.o || []).map(x => [String(x.value), String(x.label)]);
  if (m.order) o.sort((a, b) => m.order.indexOf(a[0]) - m.order.indexOf(b[0]));
  if (m.lab) o = o.map(([v, l]) => [v, m.lab[v] || l]);
  return o;
}
const shown = (k, v) => {
  if (ctlOf(k) === "secret") return blankish(v) ? "not set" : "another key";
  if (blankish(v)) return (["kettle", "actor", "sensor", "step"].includes(typ(k)) ? meta(k).blank || "None" : "blank");
  const o = opts(k).find(x => x[0] === String(v));
  if (o) return o[1];
  const s = String(v);
  return ctlOf(k) === "num" ? s + (meta(k).unit ? " " + meta(k).unit : "") : `"${s.length > 40 ? s.slice(0, 38) + "…" : s}"`;
};
const mb = b => b >= 1e6 ? (b / 1e6).toFixed(1).replace(/\.0$/, "") + " MB" : Math.round(b / 1e3) + " KB";
function calc(k) {
  const max = Number(val("SENSOR_LOG_MAX_BYTES")), n = Number(val("SENSOR_LOG_BACKUP_COUNT"));
  if (meta(k).calc === "size") return max > 0 ? `That is ${mb(max)}.` : "";
  if (!(max > 0) || !(n >= 0)) return "";
  // a probe logs about one row a second at roughly 32 bytes a row (SensorLogTarget_CSV's own sizing note)
  const total = max * (Math.floor(n) + 1), hours = total / 32 / 3600;
  return `Each probe keeps up to ${mb(total)}, about ${hours >= 48 ? Math.round(hours / 24) + " days" : Math.round(hours) + " hours"} of readings.`;
}

/* ---------- which settings go where ---------- */
const hidden = k => src(k) === "hidden";
function partsOf(g) {
  if (g.plugins) {
    const by = {};
    Object.keys(all()).filter(k => !hidden(k) && !["craftbeerpi", "steps"].includes(src(k))).forEach(k => (by[src(k)] = by[src(k)] || []).push(k));
    return Object.keys(by).sort((a, b) => (PLUGIN[a] ? 0 : 1) - (PLUGIN[b] ? 0 : 1) || a.localeCompare(b)).map(s => ({
      h: PLUGIN[s] ? PLUGIN[s][0] : s, pl: PLUGIN[s] ? PLUGIN[s][1] : "named by their keys",
      rows: by[s].sort((a, b) => (PLUGIN_ORDER.indexOf(a) + 1 || 99) - (PLUGIN_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))}));
  }
  if (g.id === "system") {
    const known = new Set(G.flatMap(x => (x.parts || []).flatMap(p => p.rows)));
    const loose = Object.keys(all()).filter(k => !hidden(k) && ["craftbeerpi", "steps"].includes(src(k)) && !known.has(k)).sort();
    return loose.length ? [...g.parts, {h: "Not sorted yet", pl: "new to this page, by their keys", rows: loose}] : g.parts;
  }
  return g.parts;
}
const keysOf = g => partsOf(g).flatMap(p => p.rows).filter(k => k in all());
const groupOf = k => G.find(g => keysOf(g).includes(k));
const dirty = () => Object.keys(st.draft).filter(isChanged);
const invalids = () => Object.keys(st.draft).filter(invalid);
const failed = () => Object.keys(st.row).filter(k => st.row[k].s === "bad");

/* ---------- FIND: every word must appear in the name, key, what it does, its group or a few likely words ---------- */
const norm = s => String(s || "").toLowerCase();
const words = () => norm(st.q).split(/\s+/).filter(Boolean);
const hay = k => { const m = meta(k), g = groupOf(k), s = src(k), plug = ["craftbeerpi", "steps"].includes(s) ? "" : (PLUGIN[s] ? PLUGIN[s][0] : s); return norm([nameOf(k), m.n, m.cloud, k, k.replace(/_/g, " "), helpOf(k), m.syn, g && g.name, plug].join(" ")); };
const hit = k => { const w = words(); return !w.length || w.every(x => hay(k).includes(x)); };
function marked(text) {
  let s = esc(text);
  const w = words().filter(x => x.length > 1).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return w.length ? s.replace(new RegExp(`(${w.join("|")})`, "gi"), "<mark>$1</mark>") : s;
}

/* ---------- rendering ---------- */
function ctlHTML(k) {
  const v = val(k), m = meta(k), c = ctlOf(k), id = "f-" + k, hd = `aria-describedby="w-${k} s-${k}"`;
  if (c === "seg" || c === "sound") {
    const seg = `<div class="seg${m.keep || c === "sound" ? " keep" : ""}${c === "sound" ? " four" : ""}" role="radiogroup" aria-labelledby="n-${k}" ${hd}>${opts(k).map(([o, l], i, a) => { const on = String(v) === o, first = i === 0 && !a.some(x => x[0] === String(v)); return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on || first ? 0 : -1}" data-set="${esc(o)}">${esc(l)}</button>`; }).join("")}</div>`;
    return c === "sound" ? `<div class="try">${seg}<button type="button" class="cmd" data-try="${k}">Try<small>plays it here</small></button></div>` : seg;
  }
  if (c === "select") return `<select class="fld" id="${id}" ${hd}>${opts(k).map(([o, l]) => `<option value="${esc(o)}"${String(v == null ? "" : v) === o ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  if (c === "num") return `<div class="numf"><input id="${id}" class="${m.wide ? "wide" : ""}" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(v)}" ${hd}>${m.unit ? `<span aria-hidden="true">${esc(m.unit)}</span>` : ""}</div>${m.calc ? `<p class="fx" id="x-${k}">${calc(k)}</p>` : ""}`;
  if (c === "secret") {
    const set = !blankish(v), open = st.shown[k] || !set;
    return `<div class="sec"><input class="fld" id="${id}" type="${open ? "text" : "password"}" autocomplete="off" spellcheck="false" value="${esc(set ? v : "")}" ${hd}><button type="button" class="cmd" data-show="${k}" aria-pressed="${!!st.shown[k]}"${set ? "" : ' aria-disabled="true"'}>${st.shown[k] ? "Hide" : "Show"}<small>${st.shown[k] ? "dots again" : set ? "the key" : "nothing set"}</small></button></div>`;
  }
  return `<textarea class="fld" id="${id}" rows="1" spellcheck="false" ${hd}>${esc(blankish(v) ? "" : v)}</textarea>`;
}
function rowHTML(k) {
  const m = meta(k), c = ctlOf(k), labelled = c === "seg" || c === "sound";
  const tags = [m.adv && "Advanced", m.restart === "on" ? "On after a restart" : m.restart && "After a restart"].filter(Boolean);
  const nm = labelled ? `<p class="nm" id="n-${k}" data-t>${marked(nameOf(k))}</p>` : `<label class="nm" id="n-${k}" for="f-${k}" data-t>${marked(nameOf(k))}</label>`;
  return `<div class="row${m.dep ? " dep" : ""}" id="r-${k}" data-k="${k}">
<div class="lb">${nm}${helpOf(k) ? `<p class="wh" id="w-${k}">${marked(helpOf(k))}</p>` : `<span id="w-${k}" hidden></span>`}<p class="why" id="y-${k}" hidden></p><p class="ky"><span>${marked(k)}</span>${tags.map(x => `<span class="tg">${x}</span>`).join("")}</p></div>
<div class="ct">${ctlHTML(k)}<div class="st" id="s-${k}"></div></div></div>`;
}
function seeHTML(k) {
  const g = groupOf(k);
  return `<p class="see"><span>${esc(nameOf(k))}: <b>${esc(shown(k, val(k)))}</b>, chosen in ${esc(g.name)}.</span><a href="#r-${k}" data-goto="${k}">Change it in ${esc(g.name)}</a></p>`;
}
function plateHTML(g, i) {
  return `<section class="plate" id="g-${g.id}" data-g="${g.id}" aria-labelledby="h-${g.id}">
<header class="phd"><a class="up" href="#groups" data-back>‹ All groups</a><h2 id="h-${g.id}"><span class="n">${i + 1}</span>${esc(g.name)}</h2><p class="sum">${esc(g.sum)}</p></header>
${g.see ? seeHTML(g.see) : ""}${partsOf(g).map((p, j) => `<div class="part"${p.h ? ` role="group" aria-labelledby="p-${g.id}-${j}"` : ""}>${p.h ? `<h3 id="p-${g.id}-${j}">${esc(p.h)}${p.pl ? `<span class="pl">${esc(p.pl)}</span>` : ""}</h3>` : ""}${p.rows.filter(k => k in all()).map(rowHTML).join("")}</div>`).join("")}
</section>`;
}
function giHTML(g, i) {
  const ks = keysOf(g), ch = ks.filter(isChanged).length, fl = ks.filter(k => st.row[k] && st.row[k].s === "bad").length;
  const n = words().length ? ks.filter(hit).length : null;
  const s = n !== null ? (n ? `${n} found` : "none") : fl ? `<span class="fl">${fl} DIDN'T SAVE</span>` : ch ? `<span class="chg">${ch} CHANGED</span>` : String(ks.length);
  const d = g.plugins ? partsOf(g).map(p => p.h).join(" · ") : ks.slice(0, 4).map(nameOf).join(" · ");
  return `<li><a class="gi${n === 0 ? " none" : ""}" href="#g-${g.id}" data-g="${g.id}" aria-current="${st.cur === g.id}"><span class="n">${i + 1}</span><span class="t">${esc(g.name)}</span><span class="d">${esc(d)}</span><span class="s">${s}</span></a></li>`;
}
function metaHTML() {
  const n = Object.keys(all()).filter(k => !hidden(k)).length, d = dirty().length, f = failed().length;
  if (st.link === "lost") return `<span class="bad">No connection</span> · ${d ? `<b>${d} not saved</b>` : `${n} settings`}`;
  if (st.saving) return `<b>Saving ${d}…</b>`;
  if (f) return `<span class="bad">${f} didn't save</span>${d - f > 0 ? ` · <b>${d - f} not saved</b>` : ""}`;
  if (d) return `<b>${d} ${d === 1 ? "change" : "changes"} not saved</b>`;
  return `${n} settings in ${G.length} groups · all saved`;
}
function idxHTML() {
  return `<h1>Settings</h1><p class="meta" id="meta">${metaHTML()}</p><ol class="groups" id="groups" aria-label="Groups, in brewing order">${G.map(giHTML).join("")}</ol>`;
}
function btnsHTML() {
  const d = dirty().length, bad = invalids().length, lost = st.link === "lost";
  const undo = `<button type="button" class="cmd" data-undoall${d && !st.saving ? "" : ' aria-disabled="true"'}>Undo<small>${d ? `put back ${d === 1 ? "the change" : "all " + d}` : "nothing to undo"}</small></button>`;
  const why = lost ? "no connection" : bad ? `fix ${bad === 1 ? "the entry" : bad + " entries"} first` : d ? `${d} ${d === 1 ? "change" : "changes"}` : "nothing changed";
  const off = !st.saving && (!d || bad || lost);
  const save = `<button type="button" class="cmd go${st.saving ? " busy" : ""}" data-save${off ? ' aria-disabled="true"' : ""}>${st.saving ? "Saving…" : "Save"}<small>${st.saving ? "waiting for CraftBeerPi" : why}</small></button>`;
  return undo + save;
}
function toolHTML() {
  return `<div class="find" role="search"><label for="q">Find a setting</label><input id="q" type="search" autocomplete="off" spellcheck="false" value="${esc(st.q)}"><button type="button" class="clr" data-clear aria-label="Clear the search"${st.q ? "" : " hidden"}>×</button></div><span class="sp"></span><span class="btns" id="btns">${btnsHTML()}</span>`;
}
function noteHTML() {
  const d = dirty();
  if (st.leave) return ["note", `<p><b>Leave Settings with ${d.length} ${d.length === 1 ? "change" : "changes"} not saved?</b> ${esc(d.map(nameOf).join(", "))}.</p><div class="acts"><button type="button" class="cmd ans" data-leave="save">Save and go<small>then ${esc(st.leave)}</small></button><button type="button" class="cmd" data-leave="drop">Go without saving<small>drops ${d.length === 1 ? "it" : "them"}</small></button><button type="button" class="cmd" data-leave="stay">Stay<small>keep changing</small></button></div>`];
  if (st.link === "lost") return ["note alarm", `<p><b>No connection to CraftBeerPi.</b> These are the settings as they were at 14:31. Your changes stay on this page until it is back; then SAVE sends them.</p>`];
  const bad = Object.keys(st.row).filter(k => st.row[k].s === "bad");
  if (bad.length) return ["note alarm", `<p><b>${esc(bad.map(nameOf).join(" and "))} didn't save.</b> CraftBeerPi didn't answer, so it may not have ${bad.length === 1 ? "it" : "them"}. ${bad.length === 1 ? "It's" : "They're"} still on this page; nothing else is affected.</p><div class="acts"><button type="button" class="cmd ans" data-retry="${bad[0]}">Try again<small>send it again</small></button><button type="button" class="cmd" data-goto="${bad[0]}">Show it<small>in ${esc(groupOf(bad[0]).name)}</small></button></div>`];
  if (st.later.length) {
    const n = st.later.map(nameOf);
    return ["note", `<p><b>${esc(n.join(" and "))} ${n.length === 1 ? "is" : "are"} saved; CraftBeerPi uses ${n.length === 1 ? "it" : "them"} after a restart.</b> Everything else is in use now. Restart from System, under More, when nothing is brewing.</p><div class="acts"><button type="button" class="cmd" data-tabgo="System">Open System<small>to restart</small></button></div>`];
  }
  return null;
}
function stHTML(k) {
  const r = st.row[k] || {}, bad = invalid(k);
  if (bad) return ["st no", `<span class="why2">${bad}</span>`];
  if (r.s === "wait") return ["st", "Saving…"];
  if (r.s === "bad") return ["st no", `Didn't save <span class="why2">· ${esc(r.msg)}</span><button type="button" class="cmd ans" data-retry="${k}">Try again<small>send it again</small></button>`];
  if (isChanged(k)) return ["st", `Changed <span class="was">· was ${esc(shown(k, st.saved[k]))}</span><button type="button" class="lnk" data-undo="${k}">Undo</button>`];
  if (r.s === "ok") return ["st ok", `✓ Saved ${r.at}${r.later ? ` <span class="later">· ${r.later}</span>` : ""}`];
  if (ctlOf(k) === "secret" && blankish(val(k))) return ["st", `<span class="was">Not set</span>`];
  return ["st", ""];
}

/* ---------- updating in place, so a field being typed in keeps its focus ---------- */
function paintRow(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const r = st.row[k] || {}, m = meta(k), [cls, html] = stHTML(k), s = $("#s-" + k);
  el.classList.toggle("chg", isChanged(k) && !invalid(k) && r.s !== "bad" && r.s !== "wait");
  el.classList.toggle("wait", r.s === "wait");
  el.classList.toggle("bad", r.s === "bad" || !!invalid(k));
  if (s.innerHTML !== html) s.innerHTML = html;
  s.className = cls;
  $$(".seg [data-set]", el).forEach(b => { const on = String(val(k)) === b.dataset.set; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
  const y = $("#y-" + k), off = m.dep && m.dep.is && val(m.dep.on) !== m.dep.is;
  el.classList.toggle("idle", !!off);
  y.hidden = !off;
  if (off) y.textContent = `Used when ${nameOf(m.dep.on)} is ${shown(m.dep.on, m.dep.is)}.`;
  if (m.cloud) $("#n-" + k).innerHTML = marked(nameOf(k));
  if (m.hc) { const w = $("#w-" + k); if (w && !w.hidden) w.innerHTML = marked(helpOf(k)); }
  if (m.calc) { const x = $("#x-" + k); if (x) x.textContent = calc(k); }
}
function paintChrome() {
  $("#meta").innerHTML = metaHTML();
  $("#groups").innerHTML = G.map(giHTML).join("");
  $("#btns").innerHTML = btnsHTML();
  $$(".see").forEach(p => { const a = $("a", p); p.outerHTML = seeHTML(a.dataset.goto); });
  const n = noteHTML(), note = $("#note");
  note.hidden = !n;
  if (n) { note.className = n[0]; note.innerHTML = n[1]; }
  const d = dirty().length, bar = $("#savebar");
  bar.hidden = !(d || st.saving);
  if (!bar.hidden) bar.innerHTML = `<p>${st.saving ? "Saving…" : `${d} ${d === 1 ? "change" : "changes"} not saved`}</p>${btnsHTML()}`;
  $("#app").toggleAttribute("data-dirty", !bar.hidden);
  const e = st.events[0];
  $("#event").innerHTML = `<span class="line"><time>${e[0]}</time>${esc(e[1])} · <span class="res ${e[3]}">${e[2]}</span>${e[4] ? ` · <span class="res">${esc(e[4])}</span>` : ""}</span><button type="button" class="logbtn" data-log>LOG</button>`;
  $("#app").dataset.link = st.link;
  const lk = $("#link");
  lk.dataset.link = st.link;
  $("#link-t").textContent = st.link === "lost" ? "No connection" : "Connected";
  /* without the connection a press of ALL OFF can't reach CraftBeerPi, so it is dimmed and says why, as on brew day */
  const ho = $("#alloff");
  if (st.link === "lost") { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = PAUSED; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  paintBrand();
}
/* the title bar's name (M74): the Brewery name setting as CraftBeerPi has it, so it changes on SAVE, not while typing.
   Blank shows CraftBeerPi; a name of more than LONG_NAME characters is drawn smaller (brew-day.css), and its title gives
   it whole. The browser tab's title starts with it, as on the brew-day screen */
function paintBrand() {
  const nm = String(st.saved.BREWERY_NAME == null ? "" : st.saved.BREWERY_NAME).trim() || "CraftBeerPi", br = $(".brand"), long = nm.length > LONG_NAME;
  $(".bname", br).textContent = nm;
  br.toggleAttribute("data-long", long);
  if (long) br.title = nm; else br.removeAttribute("title");
  document.title = `${nm} · Settings (mockup)`;
}
function paintFind() {
  const on = words().length > 0, main = $("#main");
  main.toggleAttribute("data-finding", on);
  $(".plates").classList.toggle("finding", on);
  let total = 0;
  G.forEach(g => {
    const plate = $("#g-" + g.id);
    let n = 0;
    $$(".part", plate).forEach(p => {
      let pn = 0;
      $$(".row", p).forEach(r => { const ok = hit(r.dataset.k); r.classList.toggle("miss", !ok); if (ok) pn++; });
      p.classList.toggle("empty", on && !pn);
      n += pn;
    });
    plate.classList.toggle("none", on && !n);
    total += n;
  });
  $$(".row").forEach(r => {
    const k = r.dataset.k, nm = $("#n-" + k), wh = $("#w-" + k), ky = $(".ky span", r);
    nm.innerHTML = marked(nameOf(k));
    if (wh && !wh.hidden) wh.innerHTML = marked(helpOf(k));
    ky.innerHTML = marked(k);
  });
  let nh = $("#nohit");
  if (on && !total) {
    if (!nh) { nh = document.createElement("div"); nh.id = "nohit"; nh.className = "nohit"; $("#plates").prepend(nh); }
    const away = ELSEWHERE.test(st.q);
    nh.innerHTML = `<b>Nothing here matches “${esc(st.q)}”</b><p>Try a word from a setting's name, its key or what it does.</p>${away ? `<p>Settings for one kettle, switch or probe, such as a PID's or the boil power, are kept with it in Hardware.</p><p><button type="button" class="cmd" data-tabgo="Hardware">Open Hardware<small>kettles, switches, probes</small></button></p>` : ""}`;
  } else if (nh) nh.remove();
  $("[data-clear]").hidden = !on;
  $("#groups").innerHTML = G.map(giHTML).join("");
  $("#sr").textContent = on ? (total ? `${total} ${total === 1 ? "setting" : "settings"} found` : "Nothing found") : "";
  grow();
  spy();
}
function render() {
  $("#banner").innerHTML = `${ICON_OK}<span class="msg">No alarms</span>`;
  $("#idx").innerHTML = idxHTML();
  $("#tool").innerHTML = toolHTML();
  $("#plates").innerHTML = G.map(plateHTML).join("");
  Object.keys(all()).forEach(paintRow);
  paintChrome();
  paintFind();
  applyView();
}
function refresh() { Object.keys(all()).forEach(paintRow); paintChrome(); }
/* each text box as tall as its words. One that isn't drawn (a phone's closed group, a row FIND hides) has no height to go
   by, so it waits until it shows: applyView and paintFind measure again */
function grow() { $$("textarea.fld").forEach(t => { if (!t.getClientRects().length) return; t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }); }
function applyView() {
  const main = $("#main");
  main.dataset.view = phone() ? st.view : "index";
  $$(".plate").forEach(p => p.classList.toggle("pick", p.dataset.g === st.pg));
  grow();
}

/* ---------- moving about ---------- */
function setCur(id) {
  if (st.cur === id) return;
  st.cur = id;
  $$(".gi").forEach(a => a.setAttribute("aria-current", String(a.dataset.g === id)));
}
function spy() {
  if (phone()) return;
  const pane = $("#pane"), top = wide() ? pane.getBoundingClientRect().top : 90, vis = $$(".plate:not(.none)");
  let cur = vis.length ? vis[0].dataset.g : null;
  for (const p of vis) { if (p.getBoundingClientRect().top - top < 120) cur = p.dataset.g; }
  if (wide() && vis.length && pane.scrollTop > 0 && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4) cur = vis[vis.length - 1].dataset.g;
  setCur(cur);
}
function land(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1700); }
function jump(id, key) {
  if (phone()) { st.view = "group"; st.pg = id; applyView(); window.scrollTo(0, 0); }
  const el = key ? $("#r-" + key) : $("#g-" + id);
  if (!phone() || key) el.scrollIntoView({block: key ? "center" : "start", behavior: calm() ? "auto" : "smooth"});
  setCur(id);
  land(key ? el : $("#g-" + id), key ? "flash" : "land");
  if (key) setTimeout(() => { const f = $("#f-" + key) || $("[role=radio][aria-checked=true]", el); f && f.focus({preventScroll: true}); }, calm() ? 0 : 450);
}
function back() {
  const id = st.pg;
  st.view = "index"; st.pg = null; applyView();
  const a = $(`.gi[data-g="${id}"]`);
  if (a) { a.scrollIntoView({block: "center"}); a.focus({preventScroll: true}); }
}

/* ---------- changing, saving ---------- */
function setDraft(k, v) {
  st.draft[k] = v;
  if (st.row[k] && st.row[k].s !== "wait") delete st.row[k];
  st.later = st.later.filter(x => x !== k);
  paintRow(k);
  const m = meta(k);
  Object.keys(M).filter(x => M[x].dep && M[x].dep.on === k || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (m && !isChanged(k)) delete st.draft[k];
  paintChrome();
}
const now = () => new Date().toTimeString().slice(0, 8);
function save() {
  const ks = dirty();
  if (st.saving) return;
  if (st.link === "lost") return toast("No connection: SAVE sends your changes once CraftBeerPi is back.");
  if (!ks.length) return toast("Nothing has changed yet.");
  if (invalids().length) return toast("Fix the entry marked in red first: it needs a number.");
  st.saving = true;
  ks.forEach(k => (st.row[k] = {s: "wait"}));
  $$("[data-retry]").forEach(b => b.remove());
  refresh();
  setTimeout(() => done(ks), 1100);
}
function done(ks) {
  const [ok, no] = settle(ks);
  $("#sr").textContent = no.length ? `${no.length} didn't save` : `${ok.length} saved`;
  refresh();
}
/* the answer from CraftBeerPi, as state only; the scenes use it before the page is drawn */
function settle(ks, at) {
  at = at || now().slice(0, 5);
  ks.forEach(k => {
    if (k === st.failKey) { st.row[k] = {s: "bad", msg: "CraftBeerPi didn't answer, so it may not have it"}; return; }
    const was = st.saved[k], m = meta(k);
    st.saved[k] = st.draft[k]; delete st.draft[k];
    const later = m.restart === "on" ? (st.saved[k] === "Yes" && was !== "Yes" ? "on after a restart" : "") : m.restart ? "used after a restart" : "";
    st.row[k] = {s: "ok", at, later};
    if (later && !st.later.includes(k)) st.later.push(k);
  });
  st.saving = false;
  const ok = ks.filter(k => st.row[k].s === "ok"), no = ks.filter(k => st.row[k].s === "bad");
  st.events.unshift(no.length
    ? [now(), `Settings: ${no.map(nameOf).join(", ")} didn't save${ok.length ? `; ${ok.length} saved` : ""}`, "failed", "bad"]
    : [now(), `Settings: ${ok.length === 1 ? nameOf(ok[0]) : ok.length + " changes"} saved`, "confirmed", "ok"]);
  return [ok, no];
}
function undo(k) { delete st.draft[k]; delete st.row[k]; rebuild(k); paintChrome(); }
function rebuild(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = rowHTML(k);
  el.replaceWith(wrap.firstElementChild);
  paintRow(k);
  Object.keys(M).filter(x => M[x].dep && M[x].dep.on === k || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (words().length) paintFind();
  grow();
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 4000);
}
/* TRY: the brew-day screen's own sound (alarm.js, a copy of Brett's), its whole burst, as a timer that has run out plays
   it, whatever that screen's SOUND switch says: pressing TRY is asking to hear it. Its small line says "playing" for the
   burst, so a muted device still shows that it worked */
let actx;
function tryIt(k, b) {
  const A = window.CBPI_ALARM, key = A.soundOf(val(k));
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    A.play(actx, actx.destination, actx.currentTime + 0.02, key);
  } catch (e) { return toast("This browser can't play sound here."); }
  const s = b && $("small", b);
  if (!s) return;
  s.textContent = "playing";
  clearTimeout(tryIt.t); tryIt.t = setTimeout(() => (s.textContent = "plays it here"), A.burstSeconds(key) * 1000 + 150);
}

/* ---------- input ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button, a");
  if (!b) return;
  const ds = b.dataset;
  if (b.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if ("save" in ds) return toast(st.link === "lost" ? "No connection: SAVE sends your changes once CraftBeerPi is back." : invalids().length ? "Fix the entry marked in red first: it needs a number." : "Nothing has changed yet: change a setting, then SAVE.");
    if ("undoall" in ds) return toast("Nothing to undo.");
    if ("show" in ds) return toast("Nothing is set yet: type the key in the box.");
    if (ds.why) return toast(ds.why);
    return;
  }
  if (b.closest("#mock")) return;
  if (ds.g && b.classList.contains("gi")) { e.preventDefault(); return jump(ds.g); }
  if (ds.goto) { e.preventDefault(); const k = ds.goto; return jump(groupOf(k).id, k); }
  if ("back" in ds) { e.preventDefault(); return back(); }
  if (ds.set !== undefined && b.closest(".seg")) { const k = b.closest(".row").dataset.k; return setDraft(k, ds.set); }
  if ("save" in ds) return save();
  if ("undoall" in ds) { const ks = dirty(); ks.forEach(k => { delete st.draft[k]; delete st.row[k]; }); ks.forEach(rebuild); st.leave = null; paintChrome(); st.events.unshift([now(), `Settings: ${ks.length} ${ks.length === 1 ? "change" : "changes"} put back`, "done", "ok"]); return paintChrome(); }
  if (ds.undo) return undo(ds.undo);
  if (ds.retry) { const k = ds.retry; st.failKey = null; st.row[k] = {s: "wait"}; refresh(); return setTimeout(() => done([k]), 900); }
  if (ds.show) { st.shown[ds.show] = !st.shown[ds.show]; return rebuild(ds.show); }
  if (ds.try) return tryIt(ds.try, b);
  if ("clear" in ds) { st.q = ""; $("#q").value = ""; paintFind(); return $("#q").focus(); }
  if (ds.leave) {
    const to = st.leave;
    if (ds.leave === "stay") { st.leave = null; return paintChrome(); }
    if (ds.leave === "drop") { const ks = dirty(); ks.forEach(k => delete st.draft[k]); ks.forEach(rebuild); st.leave = null; paintChrome(); return toast(`Mockup: this would now open ${to}, without the changes.`); }
    st.leave = null; save(); return toast(`Mockup: once they're saved, this would open ${to}.`);
  }
  if (ds.tab) {
    e.preventDefault();
    if (ds.tab === "Settings") return;
    /* BrewScribe opens in a browser tab of its own, so this page and its unsaved changes stay: no question first */
    if (ds.tab === "BrewScribe") return toast("Mockup: this opens BrewScribe in a browser tab of its own, or goes back to that tab if it's open, without reloading it. Your changes here stay as they are.");
    if (dirty().length && !st.saving) { st.leave = ds.tab; paintChrome(); const n = $("#note"); n.scrollIntoView({block: "nearest"}); return $(".cmd.ans", n).focus(); }
    return toast(`Mockup: this would open ${ds.tab}.`);
  }
  if (ds.tabgo) return toast(`Mockup: this would open ${ds.tabgo}.`);
  if ("log" in ds) return toast("Mockup: LOG lists the last eight events, as on the brew-day screen.");
  if (b.id === "alloff") return toast("Mockup: ALL OFF works here exactly as on the brew-day screen.");
});
document.addEventListener("input", e => {
  const f = e.target;
  if (f.id === "q") { st.q = f.value; return paintFind(); }
  const row = f.closest && f.closest(".row");
  if (!row) return;
  if (f.tagName === "TEXTAREA") {
    // one line, as the page's text boxes are now: a pasted line break becomes a space
    const v = f.value.replace(/^(\r\n|\r|\n)+|(\r\n|\r|\n)+$/g, "").replace(/(\r\n|\r|\n)+/g, " ");
    if (v !== f.value) f.value = v;
    f.style.height = "auto"; f.style.height = f.scrollHeight + 2 + "px";
  }
  setDraft(row.dataset.k, f.value);
});
document.addEventListener("change", e => { const f = e.target, row = f.closest && f.closest(".row"); if (row && f.tagName === "SELECT") setDraft(row.dataset.k, f.value); });
document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA" && e.key === "Enter" && !e.isComposing) e.preventDefault();
  if (e.key === "Escape" && e.target.id === "q" && st.q) { st.q = ""; e.target.value = ""; paintFind(); }
  // the radios of a YES | NO control move with the arrow keys, as radios do
  if (e.target.getAttribute && e.target.getAttribute("role") === "radio" && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
    e.preventDefault();
    const rs = $$("[role=radio]", e.target.closest(".seg")), i = rs.indexOf(e.target), nx = rs[(i + (/Right|Down/.test(e.key) ? 1 : rs.length - 1)) % rs.length];
    nx.focus(); nx.click();
  }
});
$("#pane").addEventListener("scroll", () => requestAnimationFrame(spy), {passive: true});
addEventListener("scroll", () => requestAnimationFrame(spy), {passive: true});
addEventListener("resize", () => { applyView(); spy(); });

/* ---------- scenes (the strip at the top) ---------- */
const CH = {ACTOR_INTERLOCK_MODE: "One heating element at a time", BREWDAY_TIMER_NAMES: "Hop stand, Yeast, Vorlauf, Dry hop", MQTTUpdate: "60"};
const SCENES = {
  top: () => {},
  boil: () => setTimeout(() => jump("boil"), 60),
  "find-lid": () => { st.q = "lid"; },
  "find-key": () => { st.q = "MASH_TUN"; },
  "find-none": () => { st.q = "hysteresis"; },
  changes: () => { Object.assign(st.draft, CH); },
  saving: () => { Object.assign(st.draft, CH); st.saving = true; Object.keys(CH).forEach(k => (st.row[k] = {s: "wait"})); },
  saved: () => { Object.assign(st.draft, CH); settle(Object.keys(CH), "14:32"); st.events[0][0] = "14:32:06"; },
  failed: () => { Object.assign(st.draft, CH); st.failKey = "ACTOR_INTERLOCK_MODE"; settle(Object.keys(CH), "14:32"); st.events[0][0] = "14:32:06"; },
  leave: () => { Object.assign(st.draft, {ACTOR_INTERLOCK_MODE: CH.ACTOR_INTERLOCK_MODE, BREWDAY_TIMER_NAMES: CH.BREWDAY_TIMER_NAMES}); st.leave = "Brew day"; },
  cloud: () => { st.saved.INFLUXDB = "Yes"; st.saved.INFLUXDBCLOUD = "Yes"; setTimeout(() => jump("logs", "INFLUXDBCLOUD"), 60); },
  plugin: () => {
    const sel = v => ({label: v, value: v});
    st.extra = {
      DEMO_INTERVAL: {v: 30, t: "number", s: "cbpi4-DemoPlugin", d: "Demonstration data, not a real plugin: seconds between this plugin's readings."},
      demo_mode: {v: "Fast", t: "select", s: "cbpi4-DemoPlugin", d: "Demonstration data: how this plugin reads its sensor.", o: [sel("Fast"), sel("Slow")]},
      DEMO_LABEL: {v: "Garage", t: "string", s: "cbpi4-DemoPlugin", d: "Demonstration data: a name this plugin shows."}
    };
    for (const k in st.extra) st.saved[k] = st.extra[k].v;
    setTimeout(() => jump("plugins"), 60);
  },
  offline: () => { st.link = "lost"; st.draft.BREWDAY_TIMER_NAMES = CH.BREWDAY_TIMER_NAMES; }
};
function scene() {
  const h = location.hash.slice(1) || "top";
  if (!(h in SCENES)) return;
  fresh();
  SCENES[h]();
  render();
  if (!["boil", "cloud", "plugin"].includes(h)) { $("#pane").scrollTop = 0; window.scrollTo(0, 0); }
  $$('#mock a[href^="#"]').forEach(a => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + h)));
  $$("#mock a[data-nm]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.nm) q.set("name", a.dataset.nm); else q.delete("name");
    a.href = `?${q}#${h}`;
    a.setAttribute("aria-current", String((a.dataset.nm || "CraftBeerPi Brewery") === QNAME));
  });
}
if (QS.has("bare")) document.documentElement.classList.add("bare");
/* BREWSCRIBE: shown where BrewScribe is installed; ?brewscribe=none shows the page without it */
if (QS.get("brewscribe") === "none") $('.tabs a[data-tab="BrewScribe"]').remove();
addEventListener("hashchange", scene);
scene();
})();
