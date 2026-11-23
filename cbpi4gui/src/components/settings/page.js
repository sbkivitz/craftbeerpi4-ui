// The Settings page.
//
// The settings sorted and presented in groups by function, not one long list in no particular order. The Settings
// mockup (design/settings) is this page: this is its settings.js, the same functions writing the same markup, styled
// by its own stylesheet (settings.css, made from the mockup's by design/settings/port.mjs). cbpi-testbench's
// test_ui_settings_identity.py
// compares the two pictures, scene by scene and screen size by screen size. The catalogue, what the page knows about each
// setting and the ten groups (the tenth, Phone alerts, only where its plugin is installed), is catalog.js, made from the
// mockup's tables by the same script.
//
// What is different from the mockup:
// - It sits in the brew-day screen's frame (screen.js with page "settings"): the live title bar, last event and tabs,
//   with SETTINGS lit. It draws in a shadow root on the frame's host, so the brew-day screen's rules for .plate, .seg,
//   .note and the rest (the same names for other things) can't reach it, nor its rules the title bar.
// - The values are CraftBeerPi's (GET /config/, kept current by its configupdate topic), and its own kettles, switches,
//   probes, fermenters and step types fill the lists. With ?demo=<scene> (the mockup's scenes) they are the mockup's own
//   (demo-data.js), and SAVE only pretends, as in the mockup.
// - SAVE sends every change at once (PUT /config/{name}/) and waits for every answer, SAVE_MS at most each, without
//   reloading the page: each row then says SAVED or DIDN'T SAVE, and the last-event line, the brew-day screen's own list,
//   says what happened: a SAVE that reloaded the page at once couldn't show a failure.
//   A number setting is sent as a number.
// - Another screen's save: a change waiting here stays, and its "was" follows the new value; if that screen saved the
//   same value, the change clears, as there's nothing left to save.
// - Leaving by a tab, MORE's list, OPEN SYSTEM or OPEN HARDWARE with changes not saved asks first, in the note at the
//   top; closing or reloading the browser tab can only get the browser's own question.
// - TRY plays the brew-day screen's own alarm (brewday/alarm.js).
// - TEST ALERT and TEST TIMER ask the cbpi4-PushOver plugin itself, POST /phone-alerts/test?kind=alert or ?kind=timer,
//   waiting TEST_MS for the answer. With ?demo= the test only pretends, with the answer its scene gives (WILL), as SAVE
//   does.
import axios from "axios";
import { catalog, G, PLUGIN, PLUGIN_ORDER, ELSEWHERE } from "./catalog";
import * as DEMO from "./demo-data";
import { play, soundOf, burstSeconds } from "../brewday/alarm";
import { call, why as callWhy } from "../brewday/api";
// As text, exactly as written (config-overrides.js): settings.css for the shadow root; settings-frame.css, the mockup's
// .app rules (one screen tall from 620 px, scrolling below 1180 px, room for the phone's save bar), for the document, where
// they apply only while <html> has data-page=settings
import SETTINGS_CSS from "./settings.css";
import FRAME_CSS from "./settings-frame.css";

/* how long a save may take before its row says CraftBeerPi didn't answer */
const SAVE_MS = 10000;
const NO_ANSWER = "CraftBeerPi didn't answer, so it may not have it";
/* how long a phone alerts test may take before it says CraftBeerPi didn't answer: the plugin gives the service 10 s, then
   answers itself, so this waits a little longer than that */
const TEST_MS = 15000;
const PAUSED = "No connection. Controls are paused.";

/* ---------- the page: one at a time, as the brew-day screen ---------- */
let host = null, sr = null, env = {}, DEMO_MODE = false, gen = 0, timers = [], off = [];
let CFG = {}, TH = {}, M = {}, F = true, st = null, actx = null, tryT = 0, copyT = 0;
/* each probe's log, as a row of the Logs and data group's last part: dl-1, dl-2, ... by probe, and dl-all, {id, name, n,
   h, syn} each, so FIND and the rows read them as they read a setting's */
let LOGS = {};
const isLog = k => /^dl-/.test(String(k));
const fin = x => typeof x === "number" && Number.isFinite(x);
const $ = (s, r = sr) => r.querySelector(s), $$ = (s, r = sr) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const phone = () => matchMedia("(max-width:700px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const calm = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { if (g === gen && st) fn(); }, ms); timers.push(t); return t; };
const fahrenheit = cfg => String((cfg.TEMP_UNIT || {}).v || "C").toUpperCase().startsWith("F");
const toast = msg => env.frame && env.frame.toast(msg);
const say = msg => env.frame && env.frame.say(msg);
/* a link that opens in a browser tab of its own says so before the press, as the BREWSCRIBE tab does */
const EXT = '<svg class="ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg>';

/* ---------- phone alerts: the setup steps that aren't settings (a group's how), the service chosen, and whether alerts
   are on, by what CraftBeerPi has saved ---------- */
const HOWS = Object.assign({}, ...G.map(g => g.how || {}));
const isHow = k => k in HOWS;
const KNOWN = new Set(G.flatMap(g => (g.parts || []).flatMap(p => p.rows)));
/* a group that needs a setting shows only where that setting exists (gs). Where it doesn't, the settings the group lists
   that do exist (the original cbpi4-PushOver has pushover_user and pushover_token) show as any setting the page
   doesn't know does: by key, with CraftBeerPi's own description, under their plugin's name */
const NEEDS = G.filter(g => g.needs).map(g => [g.needs, new Set((g.parts || []).flatMap(p => p.rows))]);
const away = k => NEEDS.some(([n, rows]) => rows.has(k) && !(n in all()));
const known = k => KNOWN.has(k) && !away(k);
const STEPS = new Set(G.flatMap(g => (g.parts || []).filter(p => p.steps).flatMap(p => p.rows)));
const PHONE = new Set(G.filter(g => g.id === "phone").flatMap(g => g.parts.flatMap(p => p.rows)).filter(k => !isHow(k)));
const SVC = "phone_alerts_service";
/* the settings a test goes by: a saved change to one makes its last answer out of date */
const TESTED = [SVC, "ntfy_topic", "ntfy_token", "ntfy_server", "pushover_user", "pushover_token"];
const svcOf = v => String(v == null ? "" : v).trim().toLowerCase() === "pushover" ? "Pushover" : "ntfy";
const svcNow = () => svcOf(val(SVC));
const TOPIC_OK = /^[-_A-Za-z0-9]{1,64}$/, WEB = /^https?:\/\/\S+$/;
const hostOf = u => { try { return new URL(u).host; } catch (e) { return String(u); } };
const ntfyHost = () => hostOf(String(st.saved.ntfy_server || "").trim() || M.ntfy_server.server);
/* the setting a test's refusal names, by service */
const FIELD = {ntfy: {topic: "ntfy_topic", token: "ntfy_token"}, Pushover: {user: "pushover_user", token: "pushover_token"}};
function phoneState() {
  const s = st.saved, svc = svcOf(s[SVC]);
  if (svc === "ntfy") {
    const t = String(s.ntfy_topic == null ? "" : s.ntfy_topic).trim();
    if (!t) return {on: false, svc, text: "Off · no topic yet"};
    if (!TOPIC_OK.test(t)) return {on: false, svc, text: "Off · the topic can't be used", fix: "The topic can hold only letters, digits, - and _: MAKE ONE, and SAVE first."};
    const sv = String(s.ntfy_server == null ? "" : s.ntfy_server).trim().replace(/\/+$/, "");
    if (sv && !WEB.test(sv)) return {on: false, svc, text: "Off · the server address can't be used", fix: "The ntfy server isn't a web address: set it back to https://ntfy.sh, under Optional, and SAVE first."};
    return {on: true, svc, text: "On · through " + ntfyHost()};
  }
  const miss = [["pushover_user", "the user key"], ["pushover_token", "the API token"]].filter(([k]) => blankish(s[k])).map(x => x[1]);
  return miss.length ? {on: false, svc, text: "Off · needs " + miss.join(" and ")} : {on: true, svc, text: "On · through Pushover"};
}
/* the same, by what is on the page now, saved or not: what the switches under What reaches your phone go by */
function phoneReady() {
  if (svcNow() === "Pushover") return !blankish(val("pushover_user")) && !blankish(val("pushover_token"));
  const t = String(val("ntfy_topic") == null ? "" : val("ntfy_topic")).trim(), sv = String(val("ntfy_server") == null ? "" : val("ntfy_server")).trim().replace(/\/+$/, "");
  return TOPIC_OK.test(t) && (!sv || WEB.test(sv));
}

/* ---------- state ---------- */
function fresh() {
  st = {saved: {}, draft: {}, row: {}, q: "", cur: null, shown: {}, view: "index", pg: null, leave: null, leaveTo: null,
    link: "ok", lostAt: null, saving: false, later: [], failKey: null, extra: {}, test: null, fault: null, testWill: "sent",
    dl: {}, events: [["14:31:52", "Mash Tun at target, 149.0 °F", "confirmed", "ok"]]};
  for (const k in CFG) st.saved[k] = CFG[k].v;
  // the demo's ?name= is the Brewery name setting too, so its row says the same as the title bar (the mockup's)
  if (DEMO_MODE && env.name != null) st.saved.BREWERY_NAME = env.name;
}
const all = () => Object.assign({}, CFG, st.extra);
const meta = k => (!away(k) && M[k]) || HOWS[k] || LOGS[k] || {};
const src = k => (all()[k] || {}).s || "craftbeerpi";
const typ = k => (all()[k] || {}).t || "string";
const val = k => (k in st.draft ? st.draft[k] : st.saved[k]);
const blankish = v => v == null || String(v).trim() === "";
const textish = k => ["string", "number"].includes(typ(k));
const same = (k, a, b) => textish(k) ? String(a == null ? "" : a).trim() === String(b == null ? "" : b).trim() : String(a == null ? "" : a) === String(b == null ? "" : b);
const isChanged = k => k in st.draft && !same(k, st.draft[k], st.saved[k]);
const LISTED = ["kettle", "actor", "sensor", "fermenter"];
const ctlOf = k => {
  const m = meta(k), t = typ(k), o = (all()[k] || {}).o || [];
  if (m.ctl) return m.ctl;
  if (m.secret) return "secret";
  if ([...LISTED, "step"].includes(t)) return "select";
  if (t === "number") return "num";
  if (t === "select") return o.length <= 4 ? "seg" : "select";
  return "text";
};
/* what is wrong with a change, so SAVE waits for it: a number that isn't one, a topic ntfy won't take, an address that
   isn't one */
const invalid = k => {
  if (!isChanged(k)) return "";
  const m = meta(k), v = String(st.draft[k] == null ? "" : st.draft[k]).trim();
  if (ctlOf(k) === "num") {
    // a setting that means something empty (m.empty) may be left empty; one with a range says it
    if (v === "" && m.empty) return "";
    const range = fin(m.min) && fin(m.max) ? `from ${m.min} to ${m.max}` : "";
    if (v === "" || !isFinite(Number(v))) return range ? `Type a number ${range}${m.empty ? ", or leave it empty" : ""}.` : `Type a number, like ${esc(st.saved[k])}.`;
    return range && (Number(v) < m.min || Number(v) > m.max) ? `Type a number ${range}${m.empty ? ", or leave it empty" : ""}.` : "";
  }
  if (m.topic && v && !TOPIC_OK.test(v)) return v.length > 64 ? "A topic can be 64 characters at most." : "A topic can hold only letters, digits, - and _.";
  if ((m.link || m.server) && v && !WEB.test(v)) return "A web address starts with http:// or https://.";
  return "";
};
/* what is worth knowing about a value that still saves: a topic easy to guess, a Pushover key of the wrong length, an
   address the phone can't reach, a server that may not reach an iPhone */
function warnOf(k) {
  const m = meta(k), v = String(val(k) == null ? "" : val(k)).trim();
  if (!v || invalid(k)) return "";
  /* a value saved some other way, which the plugin can't use */
  if (m.topic && !TOPIC_OK.test(v)) return "Phone alerts can't use this topic: it can hold only letters, digits, - and _, 64 at most. MAKE ONE for one that works.";
  if (m.server && !WEB.test(v.replace(/\/+$/, ""))) return "Phone alerts can't go: this isn't a web address. Set it back to https://ntfy.sh.";
  if (m.link && !WEB.test(v)) return "Not a web address, so tapping an alert opens the ntfy app.";
  if (m.topic && v.length < 16) return "Short topics are easy to guess: MAKE ONE gives a long, random one.";
  if (m.len && !new RegExp(`^[A-Za-z0-9]{${m.len}}$`).test(v)) return `A Pushover key is ${m.len} letters and digits; this ${/[^A-Za-z0-9]/.test(v) ? "has other characters too" : "has " + v.length}.`;
  if (m.link && /^https?:\/\/(localhost|127\.|\[::1\])/i.test(v)) return "Your phone can't open this address: it is the computer this page is open on. Use the Pi's address on your home network.";
  if (m.server && v.replace(/\/+$/, "") !== m.server) return "An iPhone gets alerts from a server of your own late, or not at all, unless it passes them on to ntfy.sh (its upstream-base-url).";
  return "";
}
const nameOf = k => {
  const m = meta(k);
  return m.cloud && val("INFLUXDBCLOUD") === "Yes" ? m.cloud : (m.n || k);
};
const helpOf = k => { const m = meta(k); if (!m.n) return (all()[k] || {}).d || ""; if (m.hs) return m.hs[svcNow()] || ""; return (m.hc && val("INFLUXDBCLOUD") === "Yes" ? m.hc : m.h) || ""; };
function opts(k) {
  const m = meta(k), c = all()[k] || {}, t = c.t;
  if (LISTED.includes(t)) return [["", m.blank || "None"], ...(TH[t] || []).map(x => [x[0], x[1]])];
  if (t === "step") return [["", m.blank || "None"], ...(TH.step || []).map(s => [s, s])];
  let o = (c.o || []).map(x => [String(x.value), String(x.label)]);
  if (m.order) o.sort((a, b) => m.order.indexOf(a[0]) - m.order.indexOf(b[0]));
  if (m.lab) o = o.map(([v, l]) => [v, m.lab[v] || l]);
  return o;
}
const shown = (k, v) => {
  if (ctlOf(k) === "secret") return blankish(v) ? meta(k).blank || "not set" : meta(k).other || "another key";
  if (blankish(v)) return ([...LISTED, "step"].includes(typ(k)) ? meta(k).blank || "None" : meta(k).blank || "blank");
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
    Object.keys(all()).filter(k => !hidden(k) && !["craftbeerpi", "steps"].includes(src(k)) && !known(k)).forEach(k => (by[src(k)] = by[src(k)] || []).push(k));
    return Object.keys(by).sort((a, b) => (PLUGIN[a] ? 0 : 1) - (PLUGIN[b] ? 0 : 1) || a.localeCompare(b)).map(s => ({
      h: PLUGIN[s] ? PLUGIN[s][0] : s, pl: PLUGIN[s] ? PLUGIN[s][1] : "named by their keys",
      rows: by[s].sort((a, b) => (PLUGIN_ORDER.indexOf(a) + 1 || 99) - (PLUGIN_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))}));
  }
  if (g.id === "system") {
    const loose = Object.keys(all()).filter(k => !hidden(k) && ["craftbeerpi", "steps"].includes(src(k)) && !known(k)).sort();
    return loose.length ? [...g.parts, {h: "Not sorted yet", pl: "new to this page, by their keys", rows: loose}] : g.parts;
  }
  // each probe's log, deleted from here (not in the demo, whose mockup doesn't draw it): last, as it's rarely needed
  if (g.id === "logs" && !DEMO_MODE && Object.keys(LOGS).length) return [...g.parts, {h: "Deleting logs", pl: "rarely needed", rows: Object.keys(LOGS)}];
  return g.parts;
}
/* the groups this CraftBeerPi has: one that needs a plugin's setting shows only where that plugin is installed */
const gs = () => G.filter(g => !g.needs || g.needs in all());
const keysOf = g => partsOf(g).flatMap(p => p.rows).filter(k => k in all());
const groupOf = k => gs().find(g => keysOf(g).includes(k));
const dirty = () => Object.keys(st.draft).filter(isChanged);
const invalids = () => Object.keys(st.draft).filter(invalid);
const failed = () => Object.keys(st.row).filter(k => st.row[k].s === "bad");

/* ---------- FIND: every word must appear in the name, key, what it does, its group or a few likely words ---------- */
const norm = s => String(s || "").toLowerCase();
const words = () => norm(st.q).split(/\s+/).filter(Boolean);
const hay = k => { if (isHow(k)) { const m = meta(k); return norm([m.n, m.h, m.syn, "phone alerts"].join(" ")); } const m = meta(k), g = groupOf(k), s = src(k), plug = ["craftbeerpi", "steps"].includes(s) ? "" : (PLUGIN[s] ? PLUGIN[s][0] : s); return norm([nameOf(k), m.n, m.cloud, k, k.replace(/_/g, " "), helpOf(k), m.syn, g && g.name, plug].join(" ")); };
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
    if (c === "sound") return `<div class="try">${seg}<button type="button" class="cmd" data-try="${k}">Try<small>plays it here</small></button></div>`;
    return seg + (m.means ? `<p class="fx" id="x-${k}">${esc(m.means[String(v)] || "")}</p>` : "");
  }
  if (c === "select") return `<select class="fld" id="${id}" ${hd}>${opts(k).map(([o, l]) => `<option value="${esc(o)}"${String(v == null ? "" : v) === o ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  if (c === "num") return `<div class="numf"><input id="${id}" class="${m.wide ? "wide" : ""}" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(v)}"${m.empty ? ' placeholder="empty"' : ""} ${hd}>${m.unit ? `<span aria-hidden="true">${esc(m.unit)}</span>` : ""}</div>${m.calc ? `<p class="fx" id="x-${k}">${calc(k)}</p>` : m.empty ? `<p class="fx" id="x-${k}">${blankish(v) ? esc(m.empty) : ""}</p>` : ""}`;
  if (c === "secret") {
    const set = !blankish(v), open = st.shown[k] || !set;
    let h = `<div class="sec"><input class="fld" id="${id}" type="${open ? "text" : "password"}" autocomplete="off" spellcheck="false" value="${esc(set ? v : "")}" ${hd}><button type="button" class="cmd" data-show="${k}" aria-pressed="${!!st.shown[k]}"${set ? "" : ' aria-disabled="true"'}>${st.shown[k] ? "Hide" : "Show"}<small>${st.shown[k] ? "dots again" : set ? (m.topic ? "the topic" : /token/i.test(k) ? "the token" : "the key") : "nothing set"}</small></button></div>`;
    if (m.topic) h += `<div class="tools"><button type="button" class="cmd" data-make="${k}">Make one<small>${set ? "a new one, in its place" : "a random one"}</small></button><button type="button" class="cmd" data-copy="${k}"${set ? "" : ' aria-disabled="true"'}>Copy<small>${set ? "to paste in the app" : "nothing to copy"}</small></button></div><p class="spell" id="x-${k}" aria-hidden="true"${st.shown[k] && set ? "" : " hidden"}>${spell(v)}</p>`;
    return h + (m.go ? `<div class="gos">${goHTML(m.go)}</div>` : "");
  }
  const here = m.link ? `<div class="tools"><button type="button" class="cmd" data-here="${k}">This CraftBeerPi<small>its address here</small></button></div>` : "";
  return `<textarea class="fld" id="${id}" rows="1" spellcheck="false" ${hd}>${esc(blankish(v) ? "" : v)}</textarea>${here}${m.go ? `<div class="gos">${goHTML(m.go)}</div>` : ""}`;
}
/* a setup step's number sits on a dark band at the left of its row, as a recipe step's does */
const SN = '<span class="sn"><span class="sr">Step </span><b></b></span>';
const goHTML = go => (go || []).map(([t, s, u]) => `<a class="cmd out" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><span class="lbl">${esc(t)}${EXT}</span><small>${esc(s)}</small><span class="sr"> (opens in a new tab)</span></a>`).join("");
/* a topic spelled out in fours, to type it into a phone: the field has the same, so screen readers skip this */
const spell = v => { const s = String(v == null ? "" : v).trim(), m = s.match(/^(cbpi-)(.*)$/), rest = m ? m[2] : s; return `<span class="lab">To type it</span>${m ? `<span class="g">${esc(m[1])}</span>` : ""}${(rest.match(/.{1,4}/g) || []).map(x => `<span class="g">${esc(x)}</span>`).join("")}`; };
function rowHTML(k) {
  if (isHow(k)) return howHTML(k);
  if (isLog(k)) return logHTML(k);
  const m = meta(k), c = ctlOf(k), labelled = c === "seg" || c === "sound", step = STEPS.has(k) && !away(k);
  const tags = [m.adv && "Advanced", m.restart === "on" ? "On after a restart" : m.restart && "After a restart"].filter(Boolean);
  const nm = labelled ? `<p class="nm" id="n-${k}" data-t>${marked(nameOf(k))}</p>` : `<label class="nm" id="n-${k}" for="f-${k}" data-t>${marked(nameOf(k))}</label>`;
  return `<div class="row${m.dep ? " dep" : ""}${step ? " step" : ""}" id="r-${k}" data-k="${k}">${step ? SN : ""}
<div class="lb">${nm}${helpOf(k) ? `<p class="wh" id="w-${k}">${marked(helpOf(k))}</p>` : `<span id="w-${k}" hidden></span>`}<p class="why" id="y-${k}" hidden></p><p class="ky"><span>${marked(k)}</span>${tags.map(x => `<span class="tg">${x}</span>`).join("")}</p></div>
<div class="ct">${ctlHTML(k)}<div class="st" id="s-${k}"></div></div></div>`;
}
/* a setup step that isn't a setting: what to do, and a link to where it's done, or the test */
function howHTML(k) {
  const m = meta(k), st0 = `<div class="st" id="s-${k}"></div>`;
  const ct = m.test ? `${testHTML()}${st0}<p class="tfx" id="t-${k}" hidden></p>` : (m.go ? `<div class="gos">${goHTML(m.go)}</div>` : "") + st0;
  return `<div class="row how step" id="r-${k}" data-k="${k}">${SN}
<div class="lb"><p class="nm" id="n-${k}" data-t>${marked(nameOf(k))}</p><p class="wh" id="w-${k}">${marked(helpOf(k))}</p><p class="why" id="y-${k}" hidden></p></div>
<div class="ct">${ct}</div></div>`;
}
function seeHTML(k) {
  const g = groupOf(k);
  return `<p class="see"><span>${esc(nameOf(k))}: <b>${esc(shown(k, val(k)))}</b>, chosen in ${esc(g.name)}.</span><a href="#r-${k}" data-goto="${k}">Change it in ${esc(g.name)}</a></p>`;
}
/* ---------- each probe's log: its readings, deleted here, each asking first in place, with no answer drawn as the
   default (DELETE /log/{probe id}) ---------- */
const DL_MS = 5000;
const dlName = k => (k === "dl-all" ? "All probes' logs" : `${LOGS[k].name}'s log`);
function dlQuestion(k) {
  return k === "dl-all"
    ? ["Delete every probe's log?", "Brew Day's graphs and Figures lose all their readings. It can't be undone."]
    : [`Delete ${LOGS[k].name}'s log?`, "Brew Day's graphs and Figures lose its readings. It can't be undone."];
}
function logHTML(k) {
  const d = st.dl[k] || {}, every = k === "dl-all", lost = st.link === "lost";
  const btn = d.s === "wait"
    ? `<button type="button" class="cmd busy" data-dl="${k}" aria-disabled="true">Deleting…<small>waiting for CraftBeerPi</small></button>`
    : `<button type="button" class="cmd" data-dl="${k}"${lost || d.ask ? ' aria-disabled="true"' : ""}>${every ? "Delete all" : "Delete"}<small>${lost ? "no connection" : every ? "every probe's log" : "its log"}</small></button>`;
  const [q, more] = dlQuestion(k);
  const ask = d.ask ? `<div class="note" role="group" aria-labelledby="q-${k}" tabindex="-1" id="a-${k}"><p id="q-${k}"><b>${esc(q)}</b> ${esc(more)}</p><div class="acts"><button type="button" class="cmd" data-dlyes="${k}">${every ? "Delete all" : "Delete"}<small>for good</small></button><button type="button" class="cmd" data-dlno="${k}">Keep<small>change nothing</small></button></div></div>` : "";
  const s = d.s === "ok" ? ["st ok", "✓ Deleted"] : d.s === "bad" ? ["st no", `Didn't delete <span class="why2">· ${esc(d.msg)}</span>`] : ["st", ""];
  return `<div class="row log" id="r-${k}" data-k="${k}">
<div class="lb"><p class="nm" id="n-${k}" data-t>${marked(nameOf(k))}</p><p class="wh" id="w-${k}">${marked(helpOf(k))}</p><p class="why" id="y-${k}" hidden></p></div>
<div class="ct">${ask}${btn}<div class="${s[0]}" id="s-${k}">${s[1]}</div></div></div>`;
}
function rebuildLog(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = logHTML(k);
  el.replaceWith(wrap.firstElementChild);
  if (words().length) paintFind();
}
async function deleteLog(k) {
  const ids = k === "dl-all" ? Object.keys(LOGS).filter(x => x !== "dl-all").map(x => LOGS[x].id) : [LOGS[k].id];
  st.dl[k] = {s: "wait"};
  rebuildLog(k);
  const g = gen;
  const res = await Promise.all(ids.map(id => call("DELETE", `/log/${encodeURIComponent(id)}`, undefined, DL_MS)));
  if (g !== gen || !st) return;
  const no = res.filter(r => !r.ok);
  if (!no.length) {
    st.dl[k] = {s: "ok"};
    if (env.frame) env.frame.log(k === "dl-all" ? "All probes' logs deleted" : `${dlName(k)} deleted`, "confirmed", "ok");
    say(`${dlName(k)} deleted`);
  } else {
    const w = callWhy(no[0]);
    st.dl[k] = {s: "bad", msg: k === "dl-all" && no.length < ids.length ? `${ids.length - no.length} of ${ids.length} deleted; ${w}` : w};
    if (env.frame) env.frame.log(`Delete ${k === "dl-all" ? "all probes' logs" : dlName(k)}`, `failed: ${w}`, "bad");
    say(`${dlName(k)}: didn't delete, ${w}`);
  }
  rebuildLog(k);
}
function plateHTML(g, i) {
  return `<section class="plate" id="g-${g.id}" data-g="${g.id}" aria-labelledby="h-${g.id}">
<header class="phd"><a class="up" href="#groups" data-back>‹ All groups</a><h2 id="h-${g.id}"><span class="n">${i + 1}</span>${esc(g.name)}</h2>${g.state ? `<p class="pst" id="pst-${g.id}"></p>` : ""}<p class="sum">${esc(g.sum)}</p></header>
${g.see && g.see in all() ? seeHTML(g.see) : ""}${partsOf(g).map((p, j) => `<div class="part"${p.steps ? " data-steps" : ""}${p.off ? ` data-pl="${esc(p.pl)}" data-off="${esc(p.off)}"` : ""}${p.h ? ` role="group" aria-labelledby="p-${g.id}-${j}"` : ""}>${p.h ? `<h3 id="p-${g.id}-${j}">${esc(p.h)}${p.pl ? `<span class="pl">${esc(p.pl)}</span>` : ""}</h3>` : ""}${p.rows.filter(k => k in all() || isHow(k) || isLog(k)).map(rowHTML).join("")}${p.foot ? `<p class="foot">${esc(p.foot)}</p>` : ""}</div>`).join("")}
</section>`;
}
function giHTML(g, i) {
  const ks = keysOf(g), ch = ks.filter(isChanged).length, fl = ks.filter(k => st.row[k] && st.row[k].s === "bad").length;
  const n = words().length ? [...ks, ...Object.keys(g.how || {})].filter(hit).length : null;
  const s = n !== null ? (n ? `${n} found` : "none") : fl ? `<span class="fl">${fl} DIDN'T SAVE</span>` : ch ? `<span class="chg">${ch} CHANGED</span>` : String(ks.length);
  const d = g.state ? phoneState().text : g.plugins ? partsOf(g).map(p => p.h).join(" · ") : ks.slice(0, 4).map(nameOf).join(" · ");
  return `<li><a class="gi${n === 0 ? " none" : ""}" href="#g-${g.id}" data-g="${g.id}" aria-current="${st.cur === g.id}"><span class="n">${i + 1}</span><span class="t">${esc(g.name)}</span><span class="d">${esc(d)}</span><span class="s">${s}</span></a></li>`;
}
function metaHTML() {
  const n = Object.keys(all()).filter(k => !hidden(k)).length, d = dirty().length, f = failed().length;
  if (st.link === "lost") return `<span class="bad">No connection</span> · ${d ? `<b>${d} not saved</b>` : `${n} settings`}`;
  if (st.saving) return `<b>Saving ${d}…</b>`;
  if (f) return `<span class="bad">${f} didn't save</span>${d - f > 0 ? ` · <b>${d - f} not saved</b>` : ""}`;
  if (d) return `<b>${d} ${d === 1 ? "change" : "changes"} not saved</b>`;
  return `${n} settings in ${gs().length} groups · all saved`;
}
function idxHTML() {
  return `<h1>Settings</h1><p class="meta" id="meta">${metaHTML()}</p><ol class="groups" id="groups" aria-label="Groups, in brewing order">${gs().map(giHTML).join("")}</ol>`;
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
  if (st.link === "lost") return ["note alarm", `<p><b>No connection to CraftBeerPi.</b> These are the settings as they were at ${esc(st.lostAt || "14:31")}. Your changes stay on this page until it is back; then SAVE sends them.</p>`];
  const bad = Object.keys(st.row).filter(k => st.row[k].s === "bad");
  if (bad.length) {
    // CraftBeerPi didn't answer (the mockup's case), or answered with a refusal, which says so
    const one = bad.length === 1, said = bad.some(k => st.row[k].refused) ? `CraftBeerPi refused ${one ? "it" : "them"}.` : `CraftBeerPi didn't answer, so it may not have ${one ? "it" : "them"}.`;
    return ["note alarm", `<p><b>${esc(bad.map(nameOf).join(" and "))} didn't save.</b> ${said} ${one ? "It's" : "They're"} still on this page; nothing else is affected.</p><div class="acts"><button type="button" class="cmd ans" data-retry="${bad[0]}">Try again<small>send it again</small></button><button type="button" class="cmd" data-goto="${bad[0]}">Show it<small>in ${esc(groupOf(bad[0]).name)}</small></button></div>`];
  }
  if (st.later.length) {
    const n = st.later.map(nameOf);
    return ["note", `<p><b>${esc(n.join(" and "))} ${n.length === 1 ? "is" : "are"} saved; CraftBeerPi uses ${n.length === 1 ? "it" : "them"} after a restart.</b> Everything else is in use now. Restart from System, under More, when nothing is brewing.</p><div class="acts"><button type="button" class="cmd" data-tabgo="System">Open System<small>to restart</small></button></div>`];
  }
  return null;
}
/* ---------- the phone alerts' test: what stops it now, its two buttons, and its answer in words ---------- */
function testOff() {
  if (st.link === "lost") return ["no connection", PAUSED];
  const p = phoneState();
  if (!p.on && phoneReady()) return ["save first", "The test uses what CraftBeerPi has saved: SAVE your changes first."];
  if (!p.on) return ["set up first", p.fix || (p.svc === "ntfy" ? "Fill in the topic and SAVE first: the test uses what CraftBeerPi has saved." : "Fill in the user key and the API token, and SAVE first: the test uses what CraftBeerPi has saved.")];
  /* the five switches aren't what the test goes by, so a change to one doesn't hold it up */
  if (dirty().some(k => PHONE.has(k) && !meta(k).on)) return ["save first", "The test uses what CraftBeerPi has saved: SAVE your changes first."];
  return null;
}
function testHTML() {
  const off = testOff(), w = !!st.test && st.test.s === "wait";
  const b = (kind, label, small) => {
    const busy = w && st.test.kind === kind;
    return `<button type="button" class="cmd${busy ? " busy" : ""}" data-test="${kind}"${off || w ? ' aria-disabled="true"' : ""}>${busy ? "Sending…" : label}<small>${busy ? "up to 10 s" : off ? off[0] : small}</small></button>`;
  };
  return `<div class="tests" id="tests">${b("alert", "Test alert", "like a hop alert")}${b("timer", "Test timer", "like a run-out timer")}</div>`;
}
/* the answer: its status line (cls, head), what that means or what to do (fx), the service's own words when it failed
   (det), and the reason in a few words for the last-event line (short) */
function testWords(t) {
  const ntfy = t.svc === "ntfy", via = ntfy ? ntfyHost() : "Pushover", timer = t.kind === "timer";
  if (t.s === "wait") return {cls: "st", head: `Sending through ${esc(via)}…`, fx: "", det: ""};
  if (t.s === "ok") return {cls: "st ok", head: `✓ Sent ${t.at} <span class="why2">· ${timer ? "as a run-out timer's alert" : "through " + esc(via)}</span>`, det: "",
    fx: ntfy ? (timer ? "A real one comes again every 2 minutes, 10 more times at most, until you answer the timer on a screen. On an iPhone it makes a sound only with the ringer on and no Focus."
                      : "Not on your phone within a minute? The topic in the ntfy app must be exactly the one above, and the app's notifications must be allowed: on the iPhone, Settings, Notifications, ntfy. If it still doesn't come, remove the topic in the app and add it again.")
             : (timer ? "Pushover repeats it once, in about a minute, then it stops. With the phone on silent, it sounds only with Critical Alerts on for emergency priority (step 4)."
                      : "Not on your phone within a minute? The Pushover app must be logged in to the same account, with its notifications allowed.")};
  const R = {
    refused: t.field === "topic" ? [`${via} refused the topic`, "Someone else may have reserved it there. MAKE ONE for a new topic, subscribe to it in the ntfy app, SAVE, and test again."]
      : t.field === "token" && ntfy ? [`${via} refused the access token`, "Check the token, or leave it blank: ntfy.sh needs none."]
      : t.field === "user" ? ["Pushover doesn't know the user key", "Copy it again from your dashboard at pushover.net: 30 letters and digits."]
      : t.field === "token" ? ["Pushover doesn't know the API token", "Copy it again from CraftBeerPi's application at pushover.net/apps."]
      : [`${via} refused it`, "What it said is below."],
    no_devices: ["no phone is logged in to this Pushover account", "Log in to the Pushover app on your iPhone with the same account, then test again."],
    limit: ntfy ? [`${via}'s limit for this network`, "ntfy.sh takes 250 alerts a day from one internet address, and only a few a minute. Try again in a few minutes. If this comes back, today's 250 are used up, and alerts are lost until they free up."]
      : ["Pushover's monthly limit", "Pushover takes 10,000 alerts a month for each account, and refuses more until the 1st."],
    unreachable: [`couldn't reach ${via}`, "Check the Pi's internet. Without it, phone alerts are lost; the screens still alarm."],
    not_set_up: ["not set up", (testOff() || ["", "Fill it in and SAVE first."])[1]],
    no_answer: ["no answer from CraftBeerPi", "The test may or may not have gone. Check the connection, then try again."]
  }[t.reason] || ["it didn't go", ""];
  const verb = t.reason === "no_devices" ? "Didn't arrive" : t.reason === "limit" ? "Not sent" : "Didn't send";
  return {cls: "st no", head: `${verb} <span class="why2">· ${esc(R[0])}</span>`, fx: R[1], det: t.detail || "", short: R[0]};
}
const eventOf = t => { const what = t.kind === "timer" ? "test timer alert" : "test alert"; return t.s === "ok" ? [now(), `Phone alerts: ${what} sent through ${t.svc}`, "confirmed", "ok"] : [now(), `Phone alerts: ${what} didn't go, ${testWords(t).short}`, "failed", "bad"]; };
/* the demo's answer to a test, after a second, as its scene says it will be: sent, or one of these, as the plugin words
   them */
const WILL = {
  refused: svc => svc === "ntfy" ? {reason: "refused", field: "topic", detail: "ntfy answered 403 (40301): forbidden"} : {reason: "refused", field: "token", detail: "Pushover answered 400: application token is invalid, see https://pushover.net/api"},
  no_devices: () => ({reason: "no_devices", field: "user", detail: "Pushover has no phone to send it to (no active devices to send to): sign in to the Pushover app on the phone with the account whose user key is in pushover_user"}),
  limit: svc => svc === "ntfy" ? {reason: "limit", field: null, detail: "ntfy answered 429 (42908): limit reached: daily message quota reached; increase your limits with a paid plan, see https://ntfy.sh"} : {reason: "limit", field: null, detail: "Pushover answered 429: application has exceeded its monthly limit"},
  unreachable: svc => ({reason: "unreachable", field: null, detail: `${svc} didn't answer within 10 s`})
};
/* a test's answer, as state: st.test, and the row a refusal names (st.fault), red until it is changed */
function testAnswer(t) {
  st.test = t;
  st.fault = t.s === "bad" && t.reason === "refused" && t.field && (FIELD[t.svc] || {})[t.field] ? {k: FIELD[t.svc][t.field], at: t.at} : null;
}
/* the demo's answer, as state only; the scenes use it before the page is drawn */
function settleTest(kind, svc, will, at) {
  at = at || now().slice(0, 5);
  const f = WILL[will] ? WILL[will](svc) : null;
  testAnswer(f ? Object.assign({s: "bad", kind, svc, at}, f) : {s: "ok", kind, svc, at});
  st.events.unshift(eventOf(st.test));
}
/* CraftBeerPi's answer: the plugin's {sent, reason, field, detail, service, kind}, whatever its HTTP status. A request
   that fails, or has no answer in TEST_MS, is no_answer: the test may or may not have gone */
async function askTest(kind, svc) {
  const g = gen;
  let a;
  try {
    a = (await axios.post(`/phone-alerts/test?kind=${kind}`, null, {timeout: TEST_MS})).data;
  } catch (e) {
    a = e.response ? e.response.data : {reason: "no_answer"};
  }
  if (g !== gen || !st) return;
  a = a && typeof a === "object" ? a : {};
  const at = now().slice(0, 5), by = a.service === "ntfy" || a.service === "Pushover" ? a.service : svc;
  testAnswer(a.sent === true ? {s: "ok", kind, svc: by, at} : {s: "bad", kind, svc: by, at, reason: a.reason, field: a.field, detail: a.detail});
  const [, what, res, tone] = eventOf(st.test);
  if (env.frame) env.frame.log(what, res, tone);
  say(st.test.s === "ok" ? "The test is sent" : "The test didn't go");
  refresh();
}
function runTest(kind) {
  const svc = svcOf(st.saved[SVC]);
  st.test = {s: "wait", kind, svc};
  paintRow("how_test"); paintTest();
  if (!DEMO_MODE) return askTest(kind, svc);
  later(() => { settleTest(kind, svc, st.testWill); say(st.test.s === "ok" ? "The test is sent" : "The test didn't go"); refresh(); }, 1200);
}
/* the buttons change in place, so the one pressed keeps its focus */
function paintTest() {
  const t = $("#tests");
  if (!t) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = testHTML();
  $$("[data-test]", tmp).forEach(n => { const o = $(`[data-test="${n.dataset.test}"]`, t); if (o.outerHTML !== n.outerHTML) { o.className = n.className; o.innerHTML = n.innerHTML; if (n.hasAttribute("aria-disabled")) o.setAttribute("aria-disabled", "true"); else o.removeAttribute("aria-disabled"); } });
}
/* MAKE ONE: the page makes the topic itself, so it works with no connection and can't fail: cbpi- and 24 random letters
   and digits, as /phone-alerts/topic makes one, lower case and without l, o, 0 and 1, which are easily mistaken for one
   another on a phone. crypto.getRandomValues is there over plain http too */
const newTopic = () => { const from = "abcdefghijkmnpqrstuvwxyz23456789", a = new Uint32Array(24); crypto.getRandomValues(a); return "cbpi-" + [...a].map(x => from[x % 32]).join(""); };
/* the new topic is shown, as it has to be typed into the ntfy app; it is a change, saved with SAVE */
function makeTopic(k) {
  st.shown[k] = true;
  setDraft(k, newTopic());
  rebuild(k);
  const n = $(`[data-make="${k}"]`);
  if (n) n.focus({preventScroll: true});
  say("A new topic, shown, not saved yet");
}
/* COPY: the clipboard where the browser allows it (https, or this computer), else the older way, which works over plain
   http as the Pi serves the page */
function legacyCopy(v) {
  const t = document.createElement("textarea");
  t.value = v; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
  document.body.append(t); t.select(); t.setSelectionRange(0, v.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  t.remove();
  return ok;
}
function copyText(k, b) {
  const v = String(val(k) == null ? "" : val(k)).trim(), s = $("small", b);
  const done = ok => {
    if (!st) return;
    b.focus({preventScroll: true});
    if (!ok) return toast("This browser won't copy here: SHOW the topic, then select it and copy it.");
    s.textContent = "copied";
    clearTimeout(copyT); copyT = later(() => (s.textContent = "to paste in the app"), 2000);
  };
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(v).then(() => done(true), () => done(legacyCopy(v)));
  done(legacyCopy(v));
}
/* the chosen service's rows show; the other's wait, hidden, with their values kept, and FIND still finds them. A part with
   none of the chosen service's rows goes too. Each step is numbered among the steps of its own service */
function applySvc() {
  const s = svcNow();
  $$(".part[data-off]").forEach(p => { $(".pl", p).textContent = phoneReady() ? p.dataset.pl : p.dataset.off; });
  $$(".part").forEach(p => { const rows = $$(".row", p); p.classList.toggle("other", rows.length > 0 && rows.every(r => r.classList.contains("other"))); });
  $$(".part[data-steps]").forEach(p => {
    const rows = $$(".row", p);
    rows.forEach((r, i) => { const v = meta(r.dataset.k).svc || s, b = $(".sn b", r); if (b) b.textContent = rows.slice(0, i + 1).filter(x => { const xv = meta(x.dataset.k).svc; return !xv || xv === v; }).length; });
  });
}
function stHTML(k) {
  if (k === "how_test") { const w = st.test ? testWords(st.test) : null; return w ? [w.cls, w.head] : ["st", ""]; }
  if (isHow(k)) return ["st", ""];
  const r = st.row[k] || {}, bad = invalid(k);
  if (bad) return ["st no", `<span class="why2">${bad}</span>`];
  if (r.s === "wait") return ["st", "Saving…"];
  if (r.s === "bad") return ["st no", `Didn't save <span class="why2">· ${esc(r.msg)}</span><button type="button" class="cmd ans" data-retry="${k}">Try again<small>send it again</small></button>`];
  if (isChanged(k)) return ["st", `Changed <span class="was">· was ${esc(shown(k, st.saved[k]))}</span><button type="button" class="lnk" data-undo="${k}">Undo</button>`];
  if (st.fault && st.fault.k === k) return ["st no", `Refused in the test at ${st.fault.at} <span class="why2">· see Send a test</span>`];
  if (r.s === "ok") return ["st ok", `✓ Saved ${r.at}${r.later ? ` <span class="later">· ${r.later}</span>` : ""}`];
  if (ctlOf(k) === "secret" && blankish(val(k))) return ["st", `<span class="was">${esc(meta(k).unset || "Not set")}</span>`];
  return ["st", ""];
}

/* ---------- updating in place, so a field being typed in keeps its focus ---------- */
function paintRow(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const r = st.row[k] || {}, m = meta(k), [cls, html] = stHTML(k), s = $("#s-" + k);
  el.classList.toggle("chg", isChanged(k) && !invalid(k) && r.s !== "bad" && r.s !== "wait");
  el.classList.toggle("wait", r.s === "wait");
  el.classList.toggle("bad", r.s === "bad" || !!invalid(k) || (!!st.fault && st.fault.k === k && !isChanged(k)));
  if (s.innerHTML !== html) s.innerHTML = html;
  s.className = cls;
  $$(".seg [data-set]", el).forEach(b => { const on = String(val(k)) === b.dataset.set; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
  /* greyed while it isn't used: its main switch is off, phone alerts aren't set up, or the other service is chosen (then
     hidden too, but for FIND); and a note on a value that saves but is worth knowing about */
  const y = $("#y-" + k), offDep = m.dep && m.dep.is && val(m.dep.on) !== m.dep.is, offOn = m.on && !phoneReady(), offSvc = !!m.svc && m.svc !== svcNow();
  el.classList.toggle("idle", !!(offDep || offOn || offSvc));
  el.classList.toggle("other", offSvc);
  const why = [offSvc ? `Used when phone alerts go through ${m.svc}.` : offDep ? `Used when ${nameOf(m.dep.on)} is ${shown(m.dep.on, m.dep.is)}.` : "", warnOf(k)].filter(Boolean).join(" ");
  y.hidden = !why;
  y.textContent = why;
  if (m.cloud) $("#n-" + k).innerHTML = marked(nameOf(k));
  if (m.hc) { const w = $("#w-" + k); if (w && !w.hidden) w.innerHTML = marked(helpOf(k)); }
  if (m.calc) { const x = $("#x-" + k); if (x) x.textContent = calc(k); }
  else if (m.empty) { const x = $("#x-" + k); if (x) x.textContent = blankish(val(k)) ? m.empty : ""; }
  if (m.hs) { const w = $("#w-" + k); if (w) w.innerHTML = marked(helpOf(k)); }
  if (m.means) { const x = $("#x-" + k); if (x) x.textContent = m.means[String(val(k))] || ""; }
  if (m.topic) { const x = $("#x-" + k), on = !!st.shown[k] && !blankish(val(k)); if (x) { x.hidden = !on; if (on) x.innerHTML = spell(val(k)); } }
  if (m.test) { const t = $("#t-" + k), w = st.test && st.test.s !== "wait" ? testWords(st.test) : null; if (t) { t.hidden = !w || !(w.fx || w.det); if (w) t.innerHTML = `${esc(w.fx)}${w.det ? `<span class="det">${esc(w.det)}</span>` : ""}`; } }
}
const paintAll = () => { Object.keys(all()).forEach(paintRow); Object.keys(HOWS).forEach(paintRow); applySvc(); };
function paintChrome() {
  $("#meta").innerHTML = metaHTML();
  $("#groups").innerHTML = gs().map(giHTML).join("");
  $("#btns").innerHTML = btnsHTML();
  /* phone alerts: on or off, by what CraftBeerPi has saved, at the top of their plate; and whether the test can go */
  $$(".pst").forEach(ps => { const p = phoneState(); ps.className = "pst" + (p.on ? " on" : ""); ps.innerHTML = `<i aria-hidden="true"></i>${esc(p.text)}`; });
  paintTest();
  $$(".see").forEach(p => { const a = $("a", p); p.outerHTML = seeHTML(a.dataset.goto); });
  const n = noteHTML(), note = $("#note");
  note.hidden = !n;
  if (n) { note.className = n[0]; note.innerHTML = n[1]; }
  const d = dirty().length, bar = $("#savebar");
  bar.hidden = !(d || st.saving);
  if (!bar.hidden) bar.innerHTML = `<p>${st.saving ? "Saving…" : `${d} ${d === 1 ? "change" : "changes"} not saved`}</p>${btnsHTML()}`;
  const app = host.closest(".app");
  if (app) app.toggleAttribute("data-dirty", !bar.hidden);
  // the title bar and the last event are the frame's; the demo hands it the mockup's, and the name as saved, so it
  // changes on SAVE, not while typing (live, the frame reads BREWERY_NAME from CraftBeerPi)
  if (DEMO_MODE && env.frame) env.frame.demo({link: st.link, events: st.events, name: st.saved.BREWERY_NAME});
}
function paintFind() {
  const on = words().length > 0, main = $("#main");
  main.toggleAttribute("data-finding", on);
  $(".plates").classList.toggle("finding", on);
  let total = 0, found = 0;
  gs().forEach(g => {
    const plate = $("#g-" + g.id);
    let n = 0;
    $$(".part", plate).forEach(p => {
      let pn = 0;
      $$(".row", p).forEach(r => { const ok = hit(r.dataset.k); r.classList.toggle("miss", !ok); if (ok) { pn++; if (!isHow(r.dataset.k) && !isLog(r.dataset.k)) total++; } });
      p.classList.toggle("empty", on && !pn);
      n += pn;
    });
    plate.classList.toggle("none", on && !n);
    found += n;
  });
  $$(".row").forEach(r => {
    const k = r.dataset.k, nm = $("#n-" + k), wh = $("#w-" + k), ky = $(".ky span", r);
    nm.innerHTML = marked(nameOf(k));
    if (wh && !wh.hidden) wh.innerHTML = marked(helpOf(k));
    if (ky) ky.innerHTML = marked(k);
  });
  let nh = $("#nohit");
  if (on && !found) {
    if (!nh) { nh = document.createElement("div"); nh.id = "nohit"; nh.className = "nohit"; $("#plates").prepend(nh); }
    const away = ELSEWHERE.test(st.q);
    nh.innerHTML = `<b>Nothing here matches “${esc(st.q)}”</b><p>Try a word from a setting's name, its key or what it does.</p>${away ? `<p>Settings for one kettle, switch or probe, such as a PID's or the boil power, are kept with it in Hardware.</p><p><button type="button" class="cmd" data-tabgo="Hardware">Open Hardware<small>kettles, switches, probes</small></button></p>` : ""}`;
  } else if (nh) nh.remove();
  $("[data-clear]").hidden = !on;
  $("#groups").innerHTML = gs().map(giHTML).join("");
  say(on ? (total ? `${total} ${total === 1 ? "setting" : "settings"} found` : "Nothing found") : "");
  grow();
  spy();
}
function render() {
  $("#idx").innerHTML = idxHTML();
  $("#tool").innerHTML = toolHTML();
  $("#plates").innerHTML = gs().map(plateHTML).join("");
  paintAll();
  paintChrome();
  paintFind();
  applyView();
}
function refresh() { paintAll(); paintChrome(); }
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
  if (!st || phone()) return;
  const pane = $("#pane"), top = wide() ? pane.getBoundingClientRect().top : 90, vis = $$(".plate:not(.none)");
  let cur = vis.length ? vis[0].dataset.g : null;
  for (const p of vis) { if (p.getBoundingClientRect().top - top < 120) cur = p.dataset.g; }
  if (wide() && vis.length && pane.scrollTop > 0 && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4) cur = vis[vis.length - 1].dataset.g;
  setCur(cur);
}
function land(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); later(() => el.classList.remove(cls), 1700); }
function jump(id, key) {
  if (phone()) { st.view = "group"; st.pg = id; applyView(); window.scrollTo(0, 0); }
  const el = key ? $("#r-" + key) : $("#g-" + id);
  if (!el) return;
  if (!phone() || key) el.scrollIntoView({block: key ? "center" : "start", behavior: calm() ? "auto" : "smooth"});
  setCur(id);
  land(key ? el : $("#g-" + id), key ? "flash" : "land");
  if (key) later(() => { const f = $("#f-" + key) || $("[role=radio][aria-checked=true]", el); if (f) f.focus({preventScroll: true}); }, calm() ? 0 : 450);
}
function back() {
  const id = st.pg;
  st.view = "index"; st.pg = null; applyView();
  const a = $(`.gi[data-g="${id}"]`);
  if (a) { a.scrollIntoView({block: "center"}); a.focus({preventScroll: true}); }
}

/* ---------- leaving: with changes not saved, the note asks first ---------- */
const go = href => env.navigate && env.navigate(String(href || "#/").replace(/^#/, "") || "/");
function leaveFor(label, href) {
  st.leave = label; st.leaveTo = href;
  paintChrome();
  const n = $("#note");
  n.scrollIntoView({block: "nearest"});
  const b = $(".cmd.ans", n);
  if (b) b.focus();
}
// a tab or MORE's list in the frame: the capture phase, so the frame's own handling and the link wait for the answer
function onFrameClick(e) {
  if (!st || !host || !e.target.closest) return;
  const a = e.target.closest(".tabs a, #bd-more a");
  if (!a || a.getAttribute("aria-current") === "page" || ["More", "BrewScribe"].includes(a.dataset.tab)) return;
  if (!dirty().length || st.saving) return;
  e.preventDefault();
  e.stopPropagation();
  if (env.frame && a.closest("#bd-more")) env.frame.closeMore();
  const label = (a.querySelector(".long") || a).textContent.trim();
  leaveFor(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(), a.getAttribute("href"));
}
function tabGo(name) {
  const href = {System: "#/system", Hardware: "#/hardware"}[name] || "#/";
  if (DEMO_MODE) return toast(`Mockup: this would open ${name}.`);
  if (dirty().length && !st.saving) return leaveFor(name, href);
  go(href);
}
function onUnload(e) {
  if (DEMO_MODE || !st || !dirty().length) return;
  e.preventDefault();
  e.returnValue = "";
}

/* ---------- changing, saving ---------- */
function setDraft(k, v) {
  st.draft[k] = v;
  if (st.fault && st.fault.k === k) st.fault = null;
  if (st.row[k] && st.row[k].s !== "wait") delete st.row[k];
  st.later = st.later.filter(x => x !== k);
  paintRow(k);
  const m = meta(k);
  Object.keys(M).filter(x => (M[x].dep && M[x].dep.on === k) || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (m && !isChanged(k)) delete st.draft[k];
  /* a phone alerts setting: what shows goes by the service, and the switches by whether alerts are set up */
  if (PHONE.has(k)) { paintAll(); if (k === SVC && words().length) paintFind(); }
  paintChrome();
}
const now = () => new Date().toTimeString().slice(0, 8);
function save(then) {
  const ks = dirty();
  if (st.saving) return;
  if (st.link === "lost") return toast("No connection: SAVE sends your changes once CraftBeerPi is back.");
  if (!ks.length) return toast("Nothing has changed yet.");
  if (invalids().length) return toast("Fix the entry marked in red first: its line says what it needs.");
  st.saving = true;
  ks.forEach(k => (st.row[k] = {s: "wait"}));
  $$("[data-retry]").forEach(b => b.remove());
  refresh();
  if (DEMO_MODE) { later(() => done(ks), 1100); return; }
  send(ks, then);
}
function done(ks) {
  const [ok, no] = settle(ks);
  say(no.length ? `${no.length} didn't save` : `${ok.length} saved`);
  refresh();
}
/* the demo's answer, as state only; the scenes use it before the page is drawn */
function settle(ks, at) {
  at = at || now().slice(0, 5);
  ks.forEach(k => {
    if (k === st.failKey) { st.row[k] = {s: "bad", msg: NO_ANSWER}; return; }
    const was = st.saved[k], m = meta(k);
    st.saved[k] = st.draft[k]; delete st.draft[k];
    const later = m.restart === "on" ? (st.saved[k] === "Yes" && was !== "Yes" ? "on after a restart" : "") : m.restart ? "used after a restart" : "";
    st.row[k] = {s: "ok", at, later};
    if (later && !st.later.includes(k)) st.later.push(k);
  });
  st.saving = false;
  const ok = ks.filter(k => st.row[k].s === "ok"), no = ks.filter(k => st.row[k].s === "bad");
  /* a saved change to where the test goes makes its last answer out of date */
  if (ok.some(k => TESTED.includes(k)) && !(st.test && st.test.s === "wait")) { st.test = null; st.fault = null; }
  st.events.unshift([now(), ...savedLine(ok, no)]);
  return [ok, no];
}
// the last-event line for a save: [what, result, tone]
const savedLine = (ok, no) => no.length
  ? [`Settings: ${no.map(nameOf).join(", ")} didn't save${ok.length ? `; ${ok.length} saved` : ""}`, "failed", "bad"]
  : [`Settings: ${ok.length === 1 ? nameOf(ok[0]) : ok.length + " changes"} saved`, "confirmed", "ok"];
/* CraftBeerPi's answers: every change at once, each waited for, none longer than SAVE_MS. then(true) once all saved */
async function send(ks, then) {
  const g = gen, before = {}, sent = {};
  // a number setting left empty goes as empty, not as 0 (only one that means something empty, m.empty, saves so)
  ks.forEach(k => { before[k] = st.saved[k]; const t = String(st.draft[k] == null ? "" : st.draft[k]).trim(); sent[k] = typ(k) === "number" && t === "" ? "" : typ(k) === "number" && isFinite(Number(t)) ? Number(t) : st.draft[k]; });
  const res = await Promise.all(ks.map(k => axios.put(`/config/${k}/`, {value: sent[k]}, {timeout: SAVE_MS}).then(() => null, e => e)));
  if (g !== gen || !st) return;
  const at = now().slice(0, 5), ok = [], no = [];
  ks.forEach((k, i) => {
    const e = res[i];
    if (e) {
      const refused = !!e.response;
      st.row[k] = {s: "bad", refused, msg: refused ? `CraftBeerPi refused it (${e.response.status})` : NO_ANSWER};
      no.push(k);
      return;
    }
    const m = meta(k), v = sent[k];
    st.saved[k] = v;
    if (k in st.draft && same(k, st.draft[k], v)) delete st.draft[k];
    const later = m.restart === "on" ? (String(v) === "Yes" && before[k] !== "Yes" ? "on after a restart" : "") : m.restart ? "used after a restart" : "";
    st.row[k] = {s: "ok", at, later};
    if (later && !st.later.includes(k)) st.later.push(k);
    ok.push(k);
  });
  st.saving = false;
  /* a saved change to where the test goes makes its last answer out of date */
  if (ok.some(k => TESTED.includes(k)) && !(st.test && st.test.s === "wait")) { st.test = null; st.fault = null; }
  const [what, res2, tone] = savedLine(ok, no);
  if (env.frame) env.frame.log(what, res2, tone);
  say(no.length ? `${no.length} didn't save` : `${ok.length} saved`);
  refresh();
  if (then) then(!no.length);
}
function undo(k) { delete st.draft[k]; delete st.row[k]; rebuild(k); paintChrome(); }
function rebuild(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = rowHTML(k);
  el.replaceWith(wrap.firstElementChild);
  paintRow(k);
  Object.keys(M).filter(x => (M[x].dep && M[x].dep.on === k) || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (PHONE.has(k)) paintAll();
  if (words().length) paintFind();
  grow();
}
/* TRY: the brew-day screen's own sound (brewday/alarm.js), its whole burst, as a timer that has run out plays it, whatever
   that screen's SOUND switch says: pressing TRY is asking to hear it. Its small line says "playing" for the burst, so a
   muted device still shows that it worked */
function tryIt(k, b) {
  const key = soundOf(val(k));
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    play(actx, actx.destination, actx.currentTime + 0.02, key);
  } catch (e) { return toast("This browser can't play sound here."); }
  const s = b && $("small", b);
  if (!s) return;
  s.textContent = "playing";
  clearTimeout(tryT); tryT = later(() => (s.textContent = "plays it here"), burstSeconds(key) * 1000 + 150);
}
function putBack(ks) {
  ks.forEach(k => { delete st.draft[k]; delete st.row[k]; });
  ks.forEach(rebuild);
}

/* ---------- input ---------- */
function onClick(e) {
  const b = e.target.closest("button, a");
  if (!b) return;
  const ds = b.dataset;
  if (b.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if ("save" in ds) return toast(st.link === "lost" ? "No connection: SAVE sends your changes once CraftBeerPi is back." : invalids().length ? "Fix the entry marked in red first: its line says what it needs." : "Nothing has changed yet: change a setting, then SAVE.");
    if ("undoall" in ds) return toast("Nothing to undo.");
    if ("show" in ds) return toast(meta(ds.show).topic ? "No topic yet: MAKE ONE, or type one." : "Nothing is set yet: type the key in the box.");
    if ("copy" in ds) return toast("No topic yet to copy: MAKE ONE, or type one.");
    if ("test" in ds) return toast(st.test && st.test.s === "wait" ? "A test is on its way: its answer comes in a few seconds." : (testOff() || ["", "The test can't go just now."])[1]);
    if (ds.dl) return toast(st.link === "lost" ? PAUSED : (st.dl[ds.dl] || {}).s === "wait" ? "Deleting: CraftBeerPi's answer comes in a few seconds." : "Answer the question above it first: DELETE or KEEP.");
    return;
  }
  /* a probe's log: DELETE asks first, in place; DELETE there sends it, KEEP closes the question */
  if (ds.dl) {
    st.dl[ds.dl] = {ask: true};
    rebuildLog(ds.dl);
    const a = $("#a-" + ds.dl);
    if (a) a.focus();
    return;
  }
  if (ds.dlno) { const k = ds.dlno; delete st.dl[k]; rebuildLog(k); const b2 = $(`[data-dl="${k}"]`); if (b2) b2.focus(); return; }
  if (ds.dlyes) {
    const k = ds.dlyes;
    if (st.link === "lost") return toast(PAUSED);
    deleteLog(k).then(() => { const b2 = st && $(`[data-dl="${k}"]`); if (b2) b2.focus(); });
    return;
  }
  if (ds.g && b.classList.contains("gi")) { e.preventDefault(); return jump(ds.g); }
  if (ds.goto) { e.preventDefault(); const k = ds.goto; return jump(groupOf(k).id, k); }
  if ("back" in ds) { e.preventDefault(); return back(); }
  if (ds.set !== undefined && b.closest(".seg")) { const k = b.closest(".row").dataset.k; return setDraft(k, ds.set); }
  if ("save" in ds) return save();
  if ("undoall" in ds) {
    const ks = dirty();
    putBack(ks);
    st.leave = null;
    const what = `Settings: ${ks.length} ${ks.length === 1 ? "change" : "changes"} put back`;
    if (DEMO_MODE) st.events.unshift([now(), what, "done", "ok"]); else if (env.frame) env.frame.log(what, "done", "ok");
    return paintChrome();
  }
  if (ds.undo) return undo(ds.undo);
  if (ds.retry) {
    const k = ds.retry;
    st.failKey = null; st.row[k] = {s: "wait"};
    if (DEMO_MODE) { refresh(); return later(() => done([k]), 900); }
    st.saving = true; refresh();
    return send([k]);
  }
  if (ds.show) { st.shown[ds.show] = !st.shown[ds.show]; return rebuild(ds.show); }
  if (ds.try) return tryIt(ds.try, b);
  if (ds.test) return runTest(ds.test);
  if (ds.make) return makeTopic(ds.make);
  if (ds.copy) return copyText(ds.copy, b);
  /* THIS CRAFTBEERPI: the address this page came from, which opens the brew-day screen */
  if (ds.here) { const k = ds.here; setDraft(k, window.location.origin + "/"); return rebuild(k); }
  if ("clear" in ds) { st.q = ""; $("#q").value = ""; paintFind(); return $("#q").focus(); }
  if (ds.leave) {
    const to = st.leave, href = st.leaveTo;
    if (ds.leave === "stay") { st.leave = null; return paintChrome(); }
    if (ds.leave === "drop") {
      putBack(dirty());
      st.leave = null; paintChrome();
      return DEMO_MODE ? toast(`Mockup: this would now open ${to}, without the changes.`) : go(href);
    }
    st.leave = null;
    if (DEMO_MODE) { save(); return toast(`Mockup: once they're saved, this would open ${to}.`); }
    // SAVE AND GO: goes once everything saved; if anything didn't, the page stays and says so
    if (st.link === "lost" || invalids().length) { paintChrome(); return save(); }
    return save(all => { if (all) go(href); });
  }
  if (ds.tabgo) return tabGo(ds.tabgo);
}
function onInput(e) {
  const f = e.target;
  if (f.id === "q") { st.q = f.value; return paintFind(); }
  const row = f.closest && f.closest(".row");
  if (!row) return;
  if (f.tagName === "TEXTAREA") {
    // the page's text boxes hold one line: a pasted line break becomes a space
    const v = f.value.replace(/^(\r\n|\r|\n)+|(\r\n|\r|\n)+$/g, "").replace(/(\r\n|\r|\n)+/g, " ");
    if (v !== f.value) f.value = v;
    f.style.height = "auto"; f.style.height = f.scrollHeight + 2 + "px";
  }
  setDraft(row.dataset.k, f.value);
}
function onChange(e) { const f = e.target, row = f.closest && f.closest(".row"); if (row && f.tagName === "SELECT") setDraft(row.dataset.k, f.value); }
function onKey(e) {
  if (e.target.tagName === "TEXTAREA" && e.key === "Enter" && !e.isComposing) e.preventDefault();
  if (e.key === "Escape" && e.target.id === "q" && st.q) { st.q = ""; e.target.value = ""; paintFind(); }
  // the radios of a YES | NO control move with the arrow keys, as radios do
  if (e.target.getAttribute && e.target.getAttribute("role") === "radio" && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
    e.preventDefault();
    const rs = $$("[role=radio]", e.target.closest(".seg")), i = rs.indexOf(e.target), nx = rs[(i + (/Right|Down/.test(e.key) ? 1 : rs.length - 1)) % rs.length];
    nx.focus(); nx.click();
  }
}
const onScroll = () => requestAnimationFrame(spy);
const onResize = () => { if (st) { applyView(); spy(); } };

/* ---------- the mockup's scenes (?demo=) ---------- */
/* an example topic for the phone alerts' scenes: nothing is ever sent to it. The Pushover scenes' keys are placeholders, shown
   as dots */
const EX_TOPIC = "cbpi-k7mq3xa9b2cd8fgh4jkr6stv";
const EX_PUSHOVER = {phone_alerts_service: "Pushover", pushover_user: "u".repeat(30), pushover_token: "a".repeat(30)};
const phoneScene = f => () => { f(); later(() => jump("phone"), 60); };
const CH = {ACTOR_INTERLOCK_MODE: "One heating element at a time", BREWDAY_TIMER_NAMES: "Hop stand, Yeast, Vorlauf, Dry hop", MQTTUpdate: "60"};
const SCENES = {
  top: () => {},
  boil: () => later(() => jump("boil"), 60),
  "find-lid": () => { st.q = "lid"; },
  "find-key": () => { st.q = "MASH_TUN"; },
  "find-none": () => { st.q = "hysteresis"; },
  changes: () => { Object.assign(st.draft, CH); },
  saving: () => { Object.assign(st.draft, CH); st.saving = true; Object.keys(CH).forEach(k => (st.row[k] = {s: "wait"})); },
  saved: () => { Object.assign(st.draft, CH); settle(Object.keys(CH), "14:32"); st.events[0][0] = "14:32:06"; },
  failed: () => { Object.assign(st.draft, CH); st.failKey = "ACTOR_INTERLOCK_MODE"; settle(Object.keys(CH), "14:32"); st.events[0][0] = "14:32:06"; },
  leave: () => { Object.assign(st.draft, {ACTOR_INTERLOCK_MODE: CH.ACTOR_INTERLOCK_MODE, BREWDAY_TIMER_NAMES: CH.BREWDAY_TIMER_NAMES}); st.leave = "Brew day"; },
  cloud: () => { st.saved.INFLUXDB = "Yes"; st.saved.INFLUXDBCLOUD = "Yes"; later(() => jump("logs", "INFLUXDBCLOUD"), 60); },
  plugin: () => {
    const sel = v => ({label: v, value: v});
    st.extra = {
      DEMO_INTERVAL: {v: 30, t: "number", s: "cbpi4-DemoPlugin", d: "Demonstration data, not a real plugin: seconds between this plugin's readings."},
      demo_mode: {v: "Fast", t: "select", s: "cbpi4-DemoPlugin", d: "Demonstration data: how this plugin reads its sensor.", o: [sel("Fast"), sel("Slow")]},
      DEMO_LABEL: {v: "Garage", t: "string", s: "cbpi4-DemoPlugin", d: "Demonstration data: a name this plugin shows."}
    };
    for (const k in st.extra) st.saved[k] = st.extra[k].v;
    later(() => jump("plugins"), 60);
  },
  offline: () => { st.link = "lost"; st.draft.BREWDAY_TIMER_NAMES = CH.BREWDAY_TIMER_NAMES; },
  phone: phoneScene(() => {}),
  "phone-made": phoneScene(() => { st.draft.ntfy_topic = EX_TOPIC; st.shown.ntfy_topic = true; }),
  "phone-on": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; }),
  "phone-sent": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; settleTest("alert", "ntfy", "sent", "14:32"); st.events[0][0] = "14:32:06"; }),
  "phone-refused": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; st.testWill = "refused"; settleTest("alert", "ntfy", "refused", "14:32"); st.events[0][0] = "14:32:06"; }),
  "phone-unreachable": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; st.testWill = "unreachable"; settleTest("timer", "ntfy", "unreachable", "14:32"); st.events[0][0] = "14:32:16"; }),
  pushover: phoneScene(() => { Object.assign(st.saved, EX_PUSHOVER); settleTest("timer", "Pushover", "sent", "14:32"); st.events[0][0] = "14:32:06"; }),
  "pushover-nophone": phoneScene(() => { Object.assign(st.saved, EX_PUSHOVER); st.testWill = "no_devices"; settleTest("alert", "Pushover", "no_devices", "14:32"); st.events[0][0] = "14:32:06"; })
};
export const SCENE_NAMES = Object.keys(SCENES);

/* ---------- CraftBeerPi's settings and things, from the app's data ---------- */
function cfgOf(config) {
  const out = {};
  for (const [k, x] of Object.entries(config || {})) if (x) out[k] = {v: x.value, t: x.type, s: x.source, d: x.description, o: x.options};
  return out;
}
const thingsOf = d => ({
  kettle: (d.kettles || []).map(x => [x.id, x.name]), actor: (d.actors || []).map(x => [x.id, x.name]),
  sensor: (d.sensors || []).map(x => [x.id, x.name]), fermenter: (d.fermenters || []).map(x => [x.id, x.name]),
  step: (d.stepTypes || []).map(s => s.name)
});
const LIST_TYPES = new Set([...LISTED, "step"]);
/* the probes' logs, a row each, then one for them all: the same keys while the probes stay the same, so a question open
   on one stays open */
function logsOf(th) {
  const sensors = th.sensor || [], out = {};
  if (!sensors.length) return out;
  const HELP = "Its readings, for Brew Day's graphs and Figures", SYN = "delete clear remove log logs readings history graph graphs figures";
  sensors.forEach(([id, name], i) => { out[`dl-${i + 1}`] = {id, name: String(name || id), n: String(name || id), h: HELP, syn: SYN}; });
  out["dl-all"] = {id: null, name: "All probes' logs", n: "All probes' logs", h: "Every probe's readings, for Brew Day's graphs and Figures", syn: SYN};
  return out;
}
function live(d) {
  const cfg = cfgOf(d.config), th = thingsOf(d), link = d.connected ? "ok" : "lost";
  if (!Object.keys(cfg).length) return;
  const first = !Object.keys(CFG).length;
  const keysMoved = first || Object.keys(cfg).sort().join("|") !== Object.keys(CFG).sort().join("|");
  const thMoved = JSON.stringify(th) !== JSON.stringify(TH);
  const logs = logsOf(th), logsMoved = JSON.stringify(logs) !== JSON.stringify(LOGS);
  const linkMoved = link !== st.link;
  const prev = CFG;
  CFG = cfg; TH = th; LOGS = logs;
  if (logsMoved) for (const k of Object.keys(st.dl)) if (!(k in LOGS)) delete st.dl[k];
  if (link !== st.link) { st.link = link; if (link === "lost") st.lostAt = now().slice(0, 5); }
  // CraftBeerPi's own values: another screen's save, or this page's own coming back
  const moved = [];
  let outdated = false;
  for (const k in cfg) {
    if (first) { st.saved[k] = cfg[k].v; continue; }
    if (!(k in prev) || String(prev[k].v) === String(cfg[k].v)) continue;
    // a test's answer is out of date once a setting it went by is saved anew; this page's own save, coming back, has
    // cleared it already
    if (TESTED.includes(k) && !same(k, st.saved[k], cfg[k].v)) outdated = true;
    st.saved[k] = cfg[k].v;
    const waiting = st.row[k] && st.row[k].s === "wait";
    if (k in st.draft && !waiting && same(k, st.draft[k], cfg[k].v)) { delete st.draft[k]; delete st.row[k]; }
    moved.push(k);
  }
  if (outdated && !(st.test && st.test.s === "wait")) { st.test = null; st.fault = null; }
  for (const k of Object.keys(st.saved)) if (!(k in cfg) && !(k in st.extra)) { delete st.saved[k]; delete st.draft[k]; delete st.row[k]; }
  const f = fahrenheit(cfg);
  if (first || keysMoved || f !== F || logsMoved) {
    F = f; M = catalog(F);
    render();
    return;
  }
  // a row with no change waiting shows CraftBeerPi's value; one with a change keeps it, and its "was" follows
  const redo = new Set(moved.filter(k => !(k in st.draft) && !(st.row[k] && st.row[k].s === "wait")));
  if (thMoved) Object.keys(cfg).filter(k => LIST_TYPES.has(cfg[k].t)).forEach(k => { if (!(k in st.draft)) redo.add(k); });
  redo.forEach(rebuild);
  moved.forEach(paintRow);
  Object.keys(M).filter(x => M[x].dep || M[x].calc).forEach(paintRow);
  if (moved.includes("INFLUXDBCLOUD")) ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  // phone alerts: the service, the steps and the switches go by what is saved, and the test's lines by its answer
  if (outdated || moved.some(k => PHONE.has(k))) { paintAll(); if (moved.includes(SVC) && words().length) paintFind(); }
  // the probes' DELETE buttons wait while there's no connection
  if (linkMoved) Object.keys(LOGS).forEach(rebuildLog);
  paintChrome();
}

/* ---------- the page ---------- */
// el: the frame's host for the page (screen.js, page "settings"). o.demo: one of the mockup's scenes to show instead of
// CraftBeerPi; o.name, the demo's ?name=, its Brewery name. o.frame: the frame (log, say, toast, closeMore, and the demo's
// title bar). o.navigate(path): open a page.
export function createSettings(el, o = {}) {
  if (st) teardown();
  const myGen = ++gen;
  host = el; env = o; DEMO_MODE = !!o.demo; timers = [];
  // the frame's rules go in once and stay: they are scoped to html[data-page=settings], so they rest while it is off
  if (!document.getElementById("sp-style")) {
    const s = document.createElement("style");
    s.id = "sp-style";
    s.textContent = FRAME_CSS;
    document.head.appendChild(s);
  }
  sr = host.shadowRoot || host.attachShadow({mode: "open"});
  sr.innerHTML = `<style>${SETTINGS_CSS}</style><main class="main" id="main" data-view="index">
    <div class="tool" id="tool"></div>
    <aside class="idx" id="idx" aria-label="Setting groups"></aside>
    <section class="pane" id="pane" aria-label="Settings">
      <div class="note" id="note" role="region" aria-label="Waiting for you" hidden></div>
      <div class="plates" id="plates"></div>
    </section>
  </main><div class="savebar" id="savebar" hidden></div>`;
  const on = (t, k, f, x) => { t.addEventListener(k, f, x); off.push(() => t.removeEventListener(k, f, x)); };
  on(sr, "click", onClick);
  on(sr, "input", onInput);
  on(sr, "change", onChange);
  on(sr, "keydown", onKey);
  on($("#pane"), "scroll", onScroll, {passive: true});
  on(window, "scroll", onScroll, {passive: true});
  on(window, "resize", onResize);
  on(document, "click", onFrameClick, true);
  on(window, "beforeunload", onUnload);
  if (DEMO_MODE) {
    CFG = DEMO.CFG; TH = DEMO.THINGS; F = fahrenheit(CFG); M = catalog(F);
    const name = SCENES[o.demo] ? o.demo : "top";
    fresh();
    SCENES[name]();
    render();
    if (!["boil", "cloud", "plugin"].includes(name) && !/^(phone|pushover)/.test(name)) { $("#pane").scrollTop = 0; window.scrollTo(0, 0); }
  } else {
    CFG = {}; TH = {}; LOGS = {}; F = true; M = catalog(F);
    fresh();
  }
  return {
    update(d) { if (gen === myGen && st && !DEMO_MODE && d) live(d); },
    // what isn't saved yet, for a test or a question before leaving
    unsaved() { return gen === myGen && st ? dirty() : []; },
    destroy() { if (gen === myGen) teardown(); }
  };
}
function teardown() {
  off.forEach(f => f());
  off = [];
  timers.forEach(clearTimeout);
  timers = [];
  if (actx) { try { actx.close().catch(() => {}); } catch (e) { /* already closed */ } }
  actx = null;
  const app = host && host.closest(".app");
  if (app) app.removeAttribute("data-dirty");
  if (sr) sr.innerHTML = "";
  host = null; sr = null; st = null; env = {}; CFG = {}; TH = {}; LOGS = {};
  gen++;
}
