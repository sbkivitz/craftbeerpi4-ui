// The Hardware page.
//
// The brewer's kettles, probes and switches, arranged by vessel in brewhouse order, in the brew-day screen's world. The
// Hardware mockup (design/hardware) is this page: this is its hardware.js, the same functions writing the same markup,
// styled by its own stylesheet (hardware.css, made from the mockup's by design/hardware/port.mjs). What the page knows
// about each control's and part's settings - plain names, lines, units, parts - is catalog.js, made from the mockup's
// hardware-catalog.js by the same script.
//
// What is different from the mockup:
// - It sits in the brew-day screen's frame (screen.js with page "hardware"): the live title bar, last event and tabs,
//   with HARDWARE lit, and ALL OFF is the frame's own. It draws in a shadow root on the frame's host, so the brew-day
//   screen's rules for .main, .seg, .note and the rest (the same names for other things) can't reach it, nor its rules
//   the title bar.
// - The name box, input#name, is one of the host's own children, shown in the Name row through a slot, so it is in the
//   document, where a script reading the page finds the item's name. Its label is its aria-label.
// - The kettles, probes and switches, their types, readings and the controls' built-in values for empty settings are
//   CraftBeerPi's (GET /system/, kept current by its websocket). Settings' MASH_TUN and BoilKettle say which kettle is
//   which in the drawing.
// - SAVE sends each changed item in turn (PUT, or POST for a new one), as CraftBeerPi saves a whole kettle, probe or
//   switch at once, and waits SAVE_MS at most for each answer. The item's rows then say SAVED or DIDN'T SAVE, and the
//   last-event line, the brew-day screen's own list, says what happened. CraftBeerPi takes a kettle's record without its
//   target and sets the target to 0, so a saved kettle's target is sent back after (POST /kettle/{id}/target_temp).
// - A switch's ON/OFF asks CraftBeerPi (POST /actor/{id}/on or off) and waits for its answer; DELETE asks it too.
// - A kettle's settings file is CraftBeerPi's: saved (GET /kettle/{id}/file), previewed (POST .../file/preview, with
//   fill=1 to fill in its empty settings) and loaded with that preview's token and the same fill. A kettle changed on
//   another screen since its preview is refused, and LOOK AGAIN shows the changes as they are then.
// - #/kettle/<id>, #/sensor/<id> and #/actor/<id> open that item, and #/kettle, #/sensor and #/actor a new one; the
//   address follows what is open.
// - Leaving by a tab, MORE's list or the Fermenters link with changes not saved asks first, in the note at the top;
//   closing or reloading the browser tab can only get the browser's own question.
import { HW_OWN, HW_TYPES, HW_EMPTY, HW_SYN } from "./catalog";
import { rigSVG, RIG_H, rigGeom, r1 } from "../brewday/rig";
import { call, why as callWhy } from "../brewday/api";
import { kettleapi, fileError } from "../data/kettleapi";
import { readChosenFile, saveKettleFile } from "./kettleFile";
// As text, exactly as written (config-overrides.js): hardware.css for the shadow root; hardware-frame.css, the mockup's
// .app rules (one screen tall from 620 px, scrolling below 1180 px, room for the phone's save bar) and the name box's,
// for the document, where they apply only while <html> has data-page=hardware
import HARDWARE_CSS from "./hardware.css";
import FRAME_CSS from "./hardware-frame.css";

/* how long a save may take before its rows say CraftBeerPi didn't answer */
const SAVE_MS = 10000;
const NO_ANSWER = "CraftBeerPi didn't answer, so it may not have it";
/* how long a switch shows the state it was sent to before CraftBeerPi's own word on it */
const EXPECT_MS = 3000;
const PAUSED = "No connection. Switches wait until CraftBeerPi is back.";

/* ---------- the page: one at a time, as the brew-day screen ---------- */
let host = null, sr = null, nameBox = null, env = {}, gen = 0, timers = [], off = [], raf = 0;
let D = null, LAST = null, TYPES = {kettle: {}, sensor: {}, actor: {}}, BLANKS = {}, st = null;
const $ = (s, r = sr) => r.querySelector(s), $$ = (s, r = sr) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
/* a CraftBeerPi name such as Sensor_Stale_Seconds may break after an underscore, not inside a word, in a narrow column */
const brk = s => esc(s).replace(/_/g, "_<wbr>");
const phone = () => matchMedia("(max-width:700px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { if (g === gen && st) fn(); }, ms); timers.push(t); return t; };
const toast = msg => env.frame && env.frame.toast(msg);
const say = msg => env.frame && env.frame.say(msg);
const log = (what, res, tone) => env.frame && env.frame.log(what, res, tone);
const blankish = v => v == null || String(v).trim() === "";
const same = (a, b) => String(a == null ? "" : a).trim() === String(b == null ? "" : b).trim();
const LINKS = [["sensor", "sensor"], ["heater", "actor"], ["agitator", "actor"]];
const ROLE = {sensor: "Probe", heater: "Element", agitator: "Pump"};
const ROLE_OF = {sensor: "probe", heater: "heating element", agitator: "pump"};
const hhmm = () => new Date().toTimeString().slice(0, 5);

/* ---------- state ---------- */
function fresh() {
  st = {open: null, draft: {}, row: {}, q: "", saving: false, link: "ok", lostAt: null, leave: null, del: null, menu: false,
    file: null, fileSay: null, fileListSay: null, wait: null, waitFor: null, view: "index", more: {}, adding: 0, aside: {},
    ask: null, news: [], patch: {}, expect: {}, busy: {}, gone: new Set(), deleting: null, why: {}, hotKey: null,
    flash: null, path: null, loaded: false};
  D = {brewery: "", unit: "C", mashTun: "", boilKettle: "", kettle: [], sensor: [], actor: [], readings: {}, fermenters: 0};
}
const ik = (kind, id) => kind + ":" + id;
const split = k => { const i = k.indexOf(":"); return [k.slice(0, i), k.slice(i + 1)]; };
const find = (kind, id) => (D[kind] || []).find(x => x.id === id);
const unit = () => (String(D.unit || "C").toUpperCase().startsWith("F") ? "°F" : "°C");
const F = () => unit() === "°F";
/* a temperature and its unit stay together on one line */
const fmtT = v => (blankish(v) || isNaN(+v) ? "–" : (+v).toFixed(1)) + "\u00a0" + unit();
/* CraftBeerPi keeps 0 for a kettle whose target was never set */
const targetText = v => (blankish(v) || +v === 0 ? "no target" : `target ${fmtT(v)}`);

/* a field's value: as saved, or as changed on this page. Fields are "name", "type", a kettle's links, or "props.<key>" */
function saved(kind, id, f) {
  const x = find(kind, id);
  if (!x || x.fresh) return f === "type" && x ? x.type : "";
  return f.startsWith("props.") ? (x.props || {})[f.slice(6)] : x[f];
}
const drafts = k => st.draft[k] || {};
/* a field's value before any change on this page, for the kind chosen here: a kettle's control chosen here starts from the
   settings it last had on this kettle (CraftBeerPi's props_by_type), or none, as a new kettle does: another control's
   numbers under the same names mean something else. A probe or switch keeps the settings two kinds share, such as a
   switch's GPIO pin, as CraftBeerPi's own forms do */
function kept(kind, id, f) {
  const d = drafts(ik(kind, id));
  if (kind === "kettle" && f.startsWith("props.") && "type" in d && !same(d.type, saved(kind, id, "type"))) {
    const x = find(kind, id), had = ((x && x.props_by_type) || {})[d.type] || {};
    return f.slice(6) in had ? had[f.slice(6)] : "";
  }
  return saved(kind, id, f);
}
function val(kind, id, f) {
  const d = drafts(ik(kind, id));
  return f in d ? d[f] : kept(kind, id, f);
}
const isChanged = (kind, id, f) => { const d = drafts(ik(kind, id)); return f in d && !same(d[f], kept(kind, id, f)); };
const changedFields = k => { const [kind, id] = split(k); return Object.keys(drafts(k)).filter(f => isChanged(kind, id, f)); };
const isNew = k => { const [kind, id] = split(k); const x = find(kind, id); return !!(x && x.fresh); };
const dirty = () => Object.keys(st.draft).filter(k => isNew(k) || changedFields(k).length);
const nDirty = () => dirty().reduce((n, k) => n + (isNew(k) ? 1 : changedFields(k).length), 0);
const failed = () => Object.keys(st.row).filter(k => st.row[k].s === "bad");
const invalid = (kind, id, f) => {
  const v = val(kind, id, f);
  if (f === "name") return blankish(v) ? "Needs a name" : "";
  const p = propDef(kind, id, f);
  return p && p.type === "number" && !blankish(v) && isNaN(+String(v).replace(",", ".")) ? "Needs a number" : "";
};
const invalids = () => dirty().flatMap(k => { const [kind, id] = split(k); return [...new Set([...(isNew(k) ? ["name"] : []), ...changedFields(k)])].filter(f => invalid(kind, id, f)); });
const nameOf = (kind, id) => { const v = val(kind, id, "name"); return blankish(v) ? `New ${kindWord(kind)}` : String(v); };
const kindWord = kind => ({kettle: "kettle", sensor: "probe", actor: "switch"}[kind]);

/* ---------- what each type declares, and what this page calls it (catalog.js) ---------- */
const typeDefs = (kind, type) => (TYPES[kind] || {})[type] || [];
function propDef(kind, id, f) {
  if (!f.startsWith("props.")) return null;
  return typeDefs(kind, val(kind, id, "type")).find(p => p.label === f.slice(6)) || null;
}
const cat = (kind, type) => (HW_TYPES[kind] || {})[type] || null;
const pick = line => (Array.isArray(line) ? line[F() ? 0 : 1] : line) || "";
const unitText = u => (u === "deg" ? unit() : u || "");
/* a choice's values as the page compares them: a plugin may give plain values, or {value, label} */
const optVal = o => String(o && typeof o === "object" ? o.value : o);
/* what an empty kettle setting means: its control's built-in value in the brewery's units (CraftBeerPi's blank_defaults
   for the control), or what the control does when it's empty (HW_EMPTY); a setting with neither is only empty */
const builtIn = (kind, id, f) => (kind === "kettle" && f.startsWith("props.") ? (BLANKS[val(kind, id, "type")] || {})[f.slice(6)] : undefined);
function emptyText(kind, id, f) {
  if (kind !== "kettle" || !f.startsWith("props.") || !blankish(val(kind, id, f))) return "";
  const b = builtIn(kind, id, f), u = unitText(rowMeta(kind, id, f).u), e = HW_EMPTY[f.slice(6)];
  if (b != null) return `Empty: ${val(kind, id, "type")} uses ${ownText(b)}${u ? " " + u : ""}`;
  return e ? `Empty: ${e}` : "Empty";
}
/* a kettle's empty settings that its control fills with a built-in value, as [field, value] */
function emptiesOf(k) {
  const [kind, id] = split(k);
  if (kind !== "kettle") return [];
  return partsOf(kind, id).flatMap(p => p.rows).map(r => r.f).filter(f => f.startsWith("props.") && blankish(val(kind, id, f)) && builtIn(kind, id, f) != null).map(f => [f, builtIn(kind, id, f)]);
}
const valueText = (kind, id, f, v) => { const u = unitText(rowMeta(kind, id, f).u); return `${v}${u ? " " + u : ""}`; };
/* a control's own value as CraftBeerPi words it: a number to seven significant figures, as one worked out for °F has more */
const ownText = v => (typeof v === "number" && isFinite(v) ? String(+v.toPrecision(7)) : String(v));
/* the parts an item's settings fall into: its own rows, its type's parts in the catalogue's order, then any setting the
   catalogue doesn't know, under its key and its plugin's words */
function partsOf(kind, id) {
  const type = val(kind, id, "type"), defs = typeDefs(kind, type), c = cat(kind, type), data = propsNow(kind, id);
  const shownDefs = defs.filter(p => isShown(p, data));
  const known = new Set();
  const parts = [{h: {kettle: "Kettle", sensor: "Probe", actor: "Switch"}[kind], rows: HW_OWN[kind].map(([k, n, l, u]) => ({f: k, n, l, u}))}];
  (c ? c.parts : []).forEach(([h, rows]) => {
    const r = rows.filter(([k]) => shownDefs.some(p => p.label === k)).map(([k, n, l, u]) => { known.add(k); return {f: "props." + k, n, l: pick(l), u}; });
    if (r.length) parts.push({h, rows: r});
  });
  const rest = shownDefs.filter(p => !known.has(p.label)).map(p => ({f: "props." + p.label, n: p.display_label || p.label, l: firstSentence(p.description), u: p.unit || "", raw: true}));
  if (rest.length) parts.push({h: c ? "Other settings" : `${type || "Its"} settings`, rows: rest});
  return parts;
}
const firstSentence = s => { s = String(s || "").trim(); const m = s.match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : s; };
function propsNow(kind, id) {
  const o = {};
  typeDefs(kind, val(kind, id, "type")).forEach(p => (o[p.label] = val(kind, id, "props." + p.label)));
  return o;
}
/* a setting a plugin shows only when others hold given values (show_if) */
function isShown(p, data) {
  const holds = rule => Object.entries(rule).every(([k, allowed]) => (Array.isArray(allowed) ? allowed : [allowed]).some(v => String(v == null ? "" : v) === String(data[k] == null ? "" : data[k])));
  const r = p && p.show_if;
  if (Array.isArray(r)) { const rs = r.filter(x => x && typeof x === "object" && !Array.isArray(x)); return !rs.length || rs.some(holds); }
  if (r && typeof r === "object") return holds(r);
  return true;
}
function rowMeta(kind, id, f) {
  for (const p of partsOf(kind, id)) for (const r of p.rows) if (r.f === f) return r;
  return {f, n: f.replace(/^props\./, ""), l: "", u: ""};
}
/* a setting's plain name and unit for a control, whatever item holds it: for a settings file's preview */
function metaFor(kind, type, label) {
  for (const [, rows] of (cat(kind, type) || {parts: []}).parts) for (const [k, n, , u] of rows) if (k === label) return {n, u};
  const p = typeDefs(kind, type).find(x => x.label === label);
  return {n: (p && (p.display_label || p.label)) || label, u: (p && p.unit) || ""};
}

/* ---------- where each part goes: kettles in brewhouse order, each with what it uses; then what no kettle uses ---------- */
function kettles() {
  const rank = k => (k.id === D.mashTun ? 1 : k.id === D.boilKettle ? 2 : 0);
  return D.kettle.slice().sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)));
}
function arrange() {
  const owner = {}, groups = kettles().map(k => {
    const parts = [];
    if (!k.fresh) LINKS.forEach(([f, kind]) => {
      const id = saved("kettle", k.id, f);
      /* a link not chosen, or to something CraftBeerPi no longer has, is shown as a gap, so a missing part is in the list */
      if (!id || !find(kind, id)) { parts.push({kind, id: id || "", role: f, gap: true, k: k.id}); return; }
      const key = ik(kind, id);
      parts.push(owner[key] ? {kind, id, role: f, with: owner[key]} : {kind, id, role: f});
      owner[key] = owner[key] || k.id;
    });
    return {k, parts};
  });
  const loose = ["sensor", "actor"].flatMap(kind => D[kind].filter(x => !owner[ik(kind, x.id)]).map(x => ({kind, id: x.id})));
  return {groups, loose, owner};
}
/* who uses a probe or switch: kettles by their links, and any kettle or probe setting that points at it */
function usesOf(kind, id) {
  const out = [];
  D.kettle.filter(k => !k.fresh).forEach(k => {
    LINKS.forEach(([f, kd]) => { if (kd === kind && saved("kettle", k.id, f) === id) out.push({by: ik("kettle", k.id), name: k.name, how: `its ${ROLE_OF[f]}`, role: f, auto: k.auto, herms: k.type === "PID_HERMS"}); });
    typeDefs("kettle", k.type).forEach(p => { if (p.type === kind && same((k.props || {})[p.label], id)) out.push({by: ik("kettle", k.id), name: k.name, how: `its ${k.type}'s ${rowMeta("kettle", k.id, "props." + p.label).n}`, auto: k.auto}); });
  });
  D.sensor.filter(s => !s.fresh && s.id !== id).forEach(s => typeDefs("sensor", s.type).forEach(p => { if (p.type === kind && same((s.props || {})[p.label], id)) out.push({by: ik("sensor", s.id), name: s.name, how: `its ${rowMeta("sensor", s.id, "props." + p.label).n.toLowerCase()}`}); }));
  return out;
}
/* two switches on one GPIO pin switch each other: each says so, with the other's name */
function pinOf(a) { return a && a.props && !blankish(a.props.GPIO) && /GPIO/.test(a.type) ? String(a.props.GPIO) : ""; }
function pinMates(id) { const a = find("actor", id), p = pinOf(a); return p ? D.actor.filter(x => x.id !== id && pinOf(x) === p) : []; }
function wiring(kind, id) {
  const x = find(kind, id);
  if (!x || x.fresh) return "";
  if (kind === "actor") { const p = pinOf(x); return p ? `GPIO ${p}` : ""; }
  if (kind === "sensor" && x.type === "OneWire") { const a = String((x.props || {}).Sensor || ""); return a; }
  return "";
}
/* the drawing's three vessels: the mash tun and boil kettle chosen in Settings, and the kettle before them, the HLT */
function vessels() {
  const ks = kettles().filter(k => !k.fresh), mt = ks.find(k => k.id === D.mashTun), bk = ks.find(k => k.id === D.boilKettle);
  const hlt = ks.find(k => k !== mt && k !== bk);
  return hlt && mt && bk ? [hlt, mt, bk] : null;
}
/* the part of the drawing an item is: a vessel, its probe, the HLT's or boil kettle's element, or a pump */
function partOf(k) {
  const v = vessels(), [kind, id] = split(k);
  if (!v) return null;
  const at = v.findIndex(x => x.id === id);
  if (kind === "kettle" && at >= 0) return `vessel-${at}`;
  for (let i = 0; i < 3; i++) {
    const kk = v[i];
    if (kind === "sensor" && kk.sensor === id) return `probe-${i}`;
    if (kind === "actor" && kk.heater === id && i !== 1) return i === 0 ? "el-hlt" : "el-bk";
    if (kind === "actor" && kk.agitator === id && i < 2) return i === 0 ? "pump-hlt" : "pump-wort";
  }
  if (kind === "actor" && v[1].heater === id && v[0].heater === id) return "el-hlt";
  return null;
}

/* ---------- live state ---------- */
const reading = id => (D.readings || {})[id];
/* a probe's reading: a temperature in the brewery's unit, or another kind's number as it is */
const isTemp = id => ["OneWire", "SimVessel"].includes((find("sensor", id) || {}).type);
const fmtR = id => (isTemp(id) ? fmtT(reading(id)) : reading(id) == null ? "–" : String(reading(id)));
const numR = id => { const r = reading(id); return r == null || isNaN(+r) ? "–" : isTemp(id) ? (+r).toFixed(1) : String(r); };
const lost = () => st.link === "lost";
function liveText(kind, id) {
  const x = find(kind, id);
  if (!x || x.fresh) return ["", ""];
  if (kind === "sensor") return [fmtR(id), lost() ? "v stale" : "v pv"];
  if (kind === "actor") return [st.busy[id] ? "…" : x.on ? (x.power < 100 ? `ON ${x.power} %` : "ON") : "OFF", "v" + (x.on ? isHeater(id) ? " heat" : " on" : "")];
  return [x.auto ? "AUTO ON" : "AUTO OFF", "v"];
}
const isHeater = id => D.kettle.some(k => !k.fresh && k.heater === id);
function swHTML(id) {
  const a = find("actor", id);
  if (!a || a.fresh) return "";
  const off = lost() ? ` aria-disabled="true" title="${esc(PAUSED)}"` : "";
  return `<button type="button" class="hsw${isHeater(id) ? " heat" : ""}${st.busy[id] ? " busy" : ""}" role="switch" aria-checked="${!!a.on}" aria-label="${esc(a.name)}" data-sw="${esc(id)}"${off}>${st.busy[id] ? "…" : a.on ? "ON" : "OFF"}</button>`;
}

/* ---------- FIND: every word must appear in the item's name, kind, type, wiring, or a setting's name, key or value ---------- */
const norm = s => String(s == null ? "" : s).toLowerCase();
const words = () => norm(st.q).split(/\s+/).filter(Boolean);
function itemHay(kind, id) {
  const x = find(kind, id);
  return norm([nameOf(kind, id), kindWord(kind), HW_SYN[kind], x && x.type, wiring(kind, id), x && x.props && x.props.Sensor, kind === "sensor" ? id : ""].join(" "));
}
function rowHay(kind, id, r) { return norm([r.n, r.f.replace(/^props\./, ""), r.f.replace(/^props\./, "").replace(/_/g, " "), r.l, shown(kind, id, r.f, val(kind, id, r.f))].join(" ")); }
const all = (hay, w) => w.every(x => hay.includes(x));
/* the item matches as a whole, or by the settings that match: those are listed under it */
function hitsOf(kind, id) {
  const w = words();
  if (!w.length) return {item: true, rows: []};
  if (all(itemHay(kind, id), w)) return {item: true, rows: []};
  const rows = partsOf(kind, id).flatMap(p => p.rows).filter(r => all(rowHay(kind, id, r) + " " + itemHay(kind, id), w) && !all(itemHay(kind, id), w));
  /* a setting whose own name matches comes before one whose description does */
  const named = r => all(norm(`${r.n} ${r.f.replace(/^props\./, "").replace(/_/g, " ")}`), w);
  return {item: false, rows: [...rows.filter(named), ...rows.filter(r => !named(r))]};
}
function marked(text) {
  const s = esc(text), w = words().filter(x => x.length > 1).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return w.length ? s.replace(new RegExp(`(${w.join("|")})`, "gi"), "<mark>$1</mark>") : s;
}

/* ---------- what a value reads as ---------- */
function shown(kind, id, f, v) {
  if (blankish(v)) return f === "type" ? "none" : "blank";
  const link = f === "sensor" ? "sensor" : f === "heater" || f === "agitator" ? "actor" : null;
  const p = propDef(kind, id, f), lk = link || (p && ["sensor", "actor", "kettle"].includes(p.type) ? p.type : null);
  if (lk) { const x = find(lk, v); return x ? x.name : `an unknown one (${v})`; }
  const u = unitText(rowMeta(kind, id, f).u);
  return u ? `${v} ${u}` : String(v);
}

/* ---------- rendering: the list ---------- */
function stateChip(k) {
  if (failed().some(x => x.startsWith(k + "|"))) return `<span class="chip fl">Didn't save</span>`;
  if (isNew(k)) return `<span class="chip nwc">New</span>`;
  const n = changedFields(k).length;
  return n ? `<span class="chip chg">${n} changed</span>` : "";
}
function hitsHTML(kind, id, h) {
  const k = ik(kind, id);
  return h.rows.length ? `<ul class="hits">${h.rows.slice(0, 4).map(r => `<li><button type="button" data-hit="${esc(k)}|${esc(r.f)}"><b>${marked(r.n)}</b> ${esc(shown(kind, id, r.f, val(kind, id, r.f)))}</button></li>`).join("")}${h.rows.length > 4 ? `<li><button type="button" data-open="${esc(k)}">and ${h.rows.length - 4} more</button></li>` : ""}</ul>` : "";
}
function partRowHTML(p) {
  if (p.gap) {
    if (words().length) return "";
    const kk = ik("kettle", p.k);
    return `<li class="hp gap"><a href="#/kettle/${esc(p.k)}" data-open="${esc(kk)}"><span class="k">${ROLE[p.role]}</span><span class="t">${p.id ? "Not found" : "None chosen"}<small>${p.id ? `CraftBeerPi has no ${p.kind === "sensor" ? "probe" : "switch"} ${esc(p.id)}` : "choose one in the kettle"}</small></span><span class="v"></span></a></li>`;
  }
  const k = ik(p.kind, p.id), x = find(p.kind, p.id), cur = st.open === k;
  const word = p.role ? ROLE[p.role] : p.kind === "sensor" ? "Probe" : "Switch";
  const h = hitsOf(p.kind, p.id), q = words().length;
  if (q && !h.item && !h.rows.length) return "";
  const [lv, lc] = liveText(p.kind, p.id), chip = stateChip(k);
  const mates = p.kind === "actor" ? pinMates(p.id) : [], pin = p.kind === "actor" ? pinOf(x) : "", sw0 = p.kind === "actor" && !p.with;
  /* under the name and its reading or pin, across the line: its kind, a probe's OneWire address and CraftBeerPi's
     Sensor ID */
  const kindLine = x && !x.fresh ? (p.kind === "sensor" && x.type === "OneWire" && (x.props || {}).Sensor ? `${x.type} · ${x.props.Sensor}` : x.type || "") : "";
  const sub = p.with ? `with the ${esc(find("kettle", p.with).name)}${pin ? ` · GPIO ${esc(pin)}` : ""}` : `${esc(kindLine)}${sw0 ? ` <span class="pin2">· ${pin ? `GPIO ${esc(pin)}` : "no pin"}</span>` : ""}${mates.length ? ` · <span class="dup">${esc(andList(mates.map(m => m.name)))} ${mates.length === 1 ? "has" : "have"} GPIO ${esc(pin)} too</span>` : ""}`;
  const sid = p.kind === "sensor" && x && !x.fresh ? `<small class="sid">Sensor ID ${esc(p.id)}</small>` : "";
  const pinCol = `<span class="pin${!pin ? " none" : mates.length ? " dup" : ""}">${pin ? `GPIO ${esc(pin)}` : "no pin"}</span>`;
  const hits = hitsHTML(p.kind, p.id, h);
  const sw = sw0 ? swHTML(p.id) : "";
  return `<li class="hp${p.with ? " ref" : ""}"><a href="#/${p.kind}/${esc(p.id)}" data-open="${esc(k)}" data-hot="${esc(k)}" aria-current="${cur}"><span class="k">${word}</span><span class="t">${marked(x ? nameOf(p.kind, p.id) : "")}${sw0 && chip ? ` ${chip}` : ""}</span><span class="v ${sw0 || chip ? "" : lc}">${sw0 ? pinCol : chip || esc(lv)}</span>${sub || sid ? `<span class="sub">${sub ? `<small>${sub}</small>` : ""}${sid}</span>` : ""}</a>${sw}</li>${hits ? `<li class="hp-hits">${hits}</li>` : ""}`;
}
function groupHTML(g, i) {
  const k = ik("kettle", g.k.id), q = words().length, h = hitsOf("kettle", g.k.id);
  const parts = g.parts.map(p => partRowHTML(p)).join("");
  const none = q && !h.item && !h.rows.length && !parts;
  const [lv] = liveText("kettle", g.k.id), chip = stateChip(k);
  const d = g.k.fresh ? "Not saved yet" : `AUTO runs ${val("kettle", g.k.id, "type") || "nothing yet"} · ${targetText(g.k.target_temp)}`;
  const hits = q && !h.item ? hitsHTML("kettle", g.k.id, h) : "";
  /* a saved kettle can be saved to a file from its line too, as it was last saved: not while it has changes on this page */
  const fileWhy = g.k.fresh ? "" : changedFields(k).length ? "unsaved" : lost() ? "lost" : "";
  const file = g.k.fresh ? "" : `<button type="button" class="kfb" data-file-row="${esc(k)}" aria-label="Save ${esc(g.k.name)} to a file" title="Save ${esc(g.k.name)} to a file"${fileWhy ? ' aria-disabled="true"' : ""}><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.6v6.2M3.3 5.3 6 8l2.7-2.7M2 10.4h8"/></svg>File</button>`;
  const said = st.fileListSay && st.fileListSay.k === k ? `<p class="say" data-kettle-file="table-status" role="status">${esc(st.fileListSay.text)}</p>` : "";
  return `<li class="hg${none ? " none" : ""}"><div class="hkw"><a class="hk" href="#/kettle/${esc(g.k.id)}" data-open="${esc(k)}" data-hot="${esc(k)}" aria-current="${st.open === k}"><span class="n">${i + 1}</span><span class="t">${marked(nameOf("kettle", g.k.id))}</span><span class="d">${esc(d)}</span><span class="s">${chip || (g.k.auto ? `<span class="on">${esc(lv)}</span>` : esc(lv))}</span></a>${file}</div>${said}${hits}${parts ? `<ul>${parts}</ul>` : ""}</li>`;
}
function looseHTML(loose, n) {
  const rows = loose.map(p => partRowHTML(p)).join("");
  const none = !rows;
  return `<li class="hg${none ? " none" : ""}"><p class="hh"><span class="n">${n}</span><span>Not in a kettle</span><span class="s">${none ? "none" : loose.length}</span></p>${rows ? `<ul>${rows}</ul>` : ""}</li>`;
}
function metaHTML() {
  const d = nDirty(), f = new Set(failed().map(x => x.split("|")[0])).size;
  if (lost()) return `<span class="bad">No connection</span>${d ? ` · <b>${d} not saved</b>` : ""}`;
  if (st.saving) return `<b>Saving…</b>`;
  if (f) return `<span class="bad">${f} didn't save</span>${d ? ` · <b>${d} not saved</b>` : ""}`;
  if (d) return `<b>${d} ${d === 1 ? "change" : "changes"} not saved</b>`;
  const c = kind => D[kind].filter(x => !x.fresh).length;
  return `${c("kettle")} kettles · ${c("sensor")} probes · ${c("actor")} switches · all saved`;
}
function idxHTML() {
  const {groups, loose} = arrange();
  const fer = D.fermenters ? `${D.fermenters} on their own page` : "on their own page, none yet";
  return `<h1>Hardware</h1><p class="meta" id="meta">${metaHTML()}</p><ol class="hl" id="hl" aria-label="Hardware, by vessel in brewhouse order">${groups.map(groupHTML).join("")}${looseHTML(loose, groups.length + 1)}</ol><a class="fer" href="#/fermenters" data-fer>Fermenters<small>${fer} ›</small></a>`;
}

/* ---------- rendering: the tool bar and notes ---------- */
function btnsHTML() {
  const d = nDirty(), bad = invalids().length, waiting = st.wait === "loading", none = st.wait === "missing";
  const undo = `<button type="button" class="cmd" data-undoall${d && !st.saving ? "" : ' aria-disabled="true"'}>Undo<small>${d ? `put back ${d === 1 ? "the change" : "all " + d}` : "nothing to undo"}</small></button>`;
  const why = waiting ? "waiting for CraftBeerPi" : none ? "nothing to save" : lost() ? "no connection" : bad ? "fix the entry first" : d ? `${d} ${d === 1 ? "change" : "changes"}` : "nothing changed";
  /* with nothing changed SAVE stays usable, and quiet: pressing it says so. A record that never arrived can't be saved */
  const off = waiting || none || (!st.saving && (bad || lost())), idle = !d && !off && !st.saving;
  const save = `<button type="button" class="cmd go${st.saving ? " busy" : ""}${idle ? " idle" : ""}" data-save aria-label="Save" aria-describedby="save-why"${off ? ' aria-disabled="true"' : ""}>${st.saving ? "Saving…" : "Save"}<small id="save-why">${st.saving ? "waiting for CraftBeerPi" : why}</small></button>`;
  const add = `<button type="button" class="cmd add" data-add aria-expanded="${st.menu}" aria-controls="addm">+ Add<small>kettle, probe, switch</small></button>`;
  return add + undo + save;
}
function menuHTML() {
  return `<div class="addm" id="addm"${st.menu ? "" : " hidden"}><button type="button" data-new="kettle"><b>Kettle</b><span>A vessel's controller: what AUTO runs, and its probe, element and pump.</span></button><button type="button" data-new="sensor"><b>Probe</b><span>A probe or other sensor. It joins a vessel once a kettle uses it.</span></button><button type="button" data-new="actor"><b>Switch</b><span>An element, pump or anything else CraftBeerPi switches.</span></button></div>`;
}
function toolHTML() {
  return `<div class="find" role="search"><label for="q">Find hardware</label><input id="q" type="search" autocomplete="off" spellcheck="false" value="${esc(st.q)}"><button type="button" class="clr" data-clear aria-label="Clear the search"${st.q ? "" : " hidden"}>×</button></div><span class="sp"></span><span class="btns" id="btns">${btnsHTML()}</span>${menuHTML()}`;
}
/* what saving will switch off, said before SAVE: CraftBeerPi switches a kettle's AUTO off when its settings are saved,
   and leaves it off; it switches a switch off before it is replaced */
function effects() {
  return dirty().map(k => {
    const [kind, id] = split(k), x = find(kind, id);
    if (!x || x.fresh) return "";
    if (kind === "kettle" && x.auto) return `Saving <b>${esc(x.name)}</b> switches its AUTO off, as CraftBeerPi does whenever a kettle's settings are saved. Switch it on again on Brew Day.`;
    if (kind === "actor" && x.on) return `Saving <b>${esc(x.name)}</b> switches it off first.`;
    return "";
  }).filter(Boolean);
}
const andList = a => (a.length < 3 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
function noteHTML() {
  const d = dirty();
  if (st.ask) {
    const list = d.map(k => [k, emptiesOf(k)]).filter(([, e]) => e.length), n = list.reduce((a, [, e]) => a + e.length, 0);
    if (!n) st.ask = null;
    else {
      const items = list.map(([k, e]) => { const [kind, id] = split(k); return `<li><b>${esc(nameOf(kind, id))}</b> (${esc(val(kind, id, "type"))}): ${e.map(([f, v]) => `${esc(rowMeta(kind, id, f).n)} ${esc(valueText(kind, id, f, ownText(v)))}`).join(", ")}</li>`; }).join("");
      return ["note empties", `<p><b>${n === 1 ? "A setting is" : n + " settings are"} empty.</b> Left empty, ${n === 1 ? "it uses" : "each uses"} its control's built-in value:</p><ul class="emp">${items}</ul>${effects().map(t => `<p>${t}</p>`).join("")}<div class="acts"><button type="button" class="cmd" data-ask="fill">Fill in and save<small>with ${n === 1 ? "this value" : "these values"}</small></button><button type="button" class="cmd" data-ask="empty">Save with ${n === 1 ? "it" : "them"} empty<small>built-in ${n === 1 ? "value applies" : "values apply"}</small></button><button type="button" class="cmd" data-ask="back">Back<small>nothing saved</small></button></div>`];
    }
  }
  if (st.leave) return ["note", `<p><b>Leave Hardware with ${nDirty()} ${nDirty() === 1 ? "change" : "changes"} to ${esc(andList(d.map(k => nameOf(...split(k)))))} not saved?</b></p><div class="acts"><button type="button" class="cmd ans" data-leave="save">Save and go<small>then ${esc(st.leave.label)}</small></button><button type="button" class="cmd" data-leave="drop">Go without saving<small>drops ${d.length === 1 && nDirty() === 1 ? "it" : "them"}</small></button><button type="button" class="cmd" data-leave="stay">Stay<small>keep changing</small></button></div>`];
  if (lost()) return ["note alarm", `<p><b>No connection to CraftBeerPi.</b> Readings are as they were at ${esc(st.lostAt || hhmm())}, in grey. Your changes stay on this page until it's back; then SAVE sends them. Switches wait too.</p>`];
  const bad = [...new Set(failed().map(x => x.split("|")[0]))];
  if (bad.length) {
    const why = st.why[bad[0]] || {}, them = bad.length === 1 ? "it" : "them";
    const said = why.refused ? `${why.msg}.` : `CraftBeerPi didn't answer, so it may not have ${them}.`;
    return ["note alarm", `<p><b>${esc(andList(bad.map(k => nameOf(...split(k)))))} didn't save.</b> ${esc(said)} ${bad.length === 1 ? "It's" : "They're"} still on this page; nothing else is affected.</p><div class="acts"><button type="button" class="cmd ans" data-retry="${esc(bad[0])}">Try again<small>send it again</small></button>${st.open === bad[0] ? "" : `<button type="button" class="cmd" data-open="${esc(bad[0])}">Show it<small>${esc(nameOf(...split(bad[0])))}</small></button>`}</div>`];
  }
  const fx = effects();
  if (fx.length && !st.saving) return ["note effect", fx.map(t => `<p>${t}</p>`).join("")];
  return null;
}

/* ---------- rendering: the brewhouse, x-rayed ---------- */
function npLineHTML(kind, id, word, withK) {
  const k = ik(kind, id), x = find(kind, id);
  if (!x) return "";
  const [lv, lc] = liveText(kind, id), mates = kind === "actor" ? pinMates(id) : [];
  const sub = withK ? `with the ${esc(withK.name)}` : mates.length ? `<span class="dup">${esc(wiring(kind, id))} · also ${esc(mates.map(m => m.name).join(", "))}</span>` : esc(kind === "kettle" ? `AUTO runs ${x.type}` : wiring(kind, id) || x.type);
  return `<button type="button" class="${[withK ? "ref" : "", st.hotKey === k ? "hot" : ""].filter(Boolean).join(" ")}" data-open="${esc(k)}" data-hot="${esc(k)}"><span class="k">${word}</span><span class="t">${esc(x.name)}<small>${sub}</small></span><span class="${lc}">${esc(lv)}</span></button>`;
}
function xrHTML() {
  const v = vessels(), {groups, loose} = arrange();
  const nps = v ? v.map((kk, i) => {
    const g = groups.find(x => x.k.id === kk.id);
    const lines = [npLineHTML("kettle", kk.id, "Kettle")].concat(g.parts.filter(p => !p.gap).map(p => npLineHTML(p.kind, p.id, ROLE[p.role], p.with ? find("kettle", p.with) : null)));
    return `<section class="np" aria-label="${esc(kk.name)}"><h3>${esc(["HLT", "Mash tun", "Boil kettle"][i])}</h3>${lines.join("")}</section>`;
  }).join("") : "";
  const extra = groups.filter(g => !v || !v.includes(g.k)).map(g => g.k.name);
  const also = [...extra.map(n => `the kettle <b>${esc(n)}</b>`), ...loose.map(p => `<b>${esc(find(p.kind, p.id).name)}</b>`)];
  const alsoP = `<p class="xalso">${also.length ? `Not in the drawing: ${also.join(", ")}${loose.length ? ", which no kettle uses" : ""}. ` : ""}Fermenters are on <a href="#/fermenters" data-fer>their own page</a>.</p>`;
  return `<section class="xr" aria-labelledby="xr-h"><header class="xhd"><h2 id="xr-h">Brewhouse</h2><p>${v ? `<span class="np-on">Tap a part, or its line under the drawing, to open its settings.</span><span class="np-off">Tap a part, or its line in the list, to open its settings.</span>` : "Choose the mash tun and boil kettle in Settings to see them drawn here."}</p></header><div class="xrig" id="xrig" data-keep${v ? "" : " hidden"}></div><div class="nps">${nps}</div>${alsoP}</section>`;
}
/* the drawing, at the width of its box as on Brew Day, with a probe drawn into each vessel and every part marked. It is
   drawn again only when what it shows changes: its size, the part lit, the switches and their names */
function drawRig(box, sel, mini) {
  const v = vessels();
  if (!box || !v) return;
  const w = box.clientWidth, h = box.clientHeight;
  if (!w || !h) return;
  const W = mini ? 1200 : Math.max(1200, Math.round(RIG_H * w / h)), g = rigGeom(W);
  const at = {"el-hlt": v[0].heater, "el-bk": v[2].heater, "pump-hlt": v[0].agitator, "pump-wort": v[1].agitator};
  const sig = JSON.stringify([W, sel, lost(), v.map(k => [k.id, k.sensor]), Object.entries(at).map(([p, id]) => { const a = find("actor", id); return [p, id, a ? [a.name, !!a.on] : null]; })]);
  if (box.dataset.sig === sig && $("svg", box)) return;
  const keep = mini ? $("span", box) : null;
  box.innerHTML = rigSVG("line", W, 1, "today");
  if (keep) box.appendChild(keep);
  box.dataset.sig = sig;
  const svg = $("svg", box);
  svg.setAttribute("aria-hidden", "true");
  svg.removeAttribute("role");
  svg.removeAttribute("aria-labelledby");
  const NS = "http://www.w3.org/2000/svg", vs = $$(".vessel", svg);
  vs.forEach((el, i) => el.setAttribute("data-part", `vessel-${i}`));
  g.x.forEach((x, i) => {
    const p = document.createElementNS(NS, "g");
    p.setAttribute("class", "probe");
    p.setAttribute("data-part", `probe-${i}`);
    p.innerHTML = `<path d="M${r1(x + 112)} 200 H${r1(x + 86)}"/><circle cx="${r1(x + 80)}" cy="200" r="6"/>`;
    svg.appendChild(p);
  });
  [["el-hlt", "el-hlt"], ["el-bk", "el-bk"], ["pump-hlt", "pump-hlt"], ["pump-wort", "pump-wort"]].forEach(([elId, part]) => { const el = $("#" + elId, svg); if (el) { el.setAttribute("data-part", part); el.removeAttribute("id"); } });
  $$("[id]", svg).forEach(el => el.removeAttribute("id"));
  /* the pumps' labels name what CraftBeerPi switches there; the elements and pumps show whether they are on */
  Object.entries(at).forEach(([part, id]) => {
    const el = $(`[data-part="${part}"]`, svg), a = find("actor", id);
    if (!el) return;
    if (!a) { el.classList.add("gone-part"); return; }
    el.classList.toggle("on", !!a.on && !lost());
    el.setAttribute("data-key", ik("actor", id));
    const st2 = $(".p-st", el), nm = $(".p-name", el);
    if (st2) st2.textContent = a.on ? "ON" : "OFF";
    if (nm) nm.textContent = a.name.length > 16 ? a.name.slice(0, 15) + "…" : a.name;
  });
  v.forEach((kk, i) => { const pv = $(`[data-part="vessel-${i}"]`, svg), pr = $(`[data-part="probe-${i}"]`, svg); if (pv) pv.setAttribute("data-key", ik("kettle", kk.id)); if (pr) pr.setAttribute("data-key", kk.sensor ? ik("sensor", kk.sensor) : ""); });
  if (sel) $$(`[data-part="${sel}"]`, svg).forEach(el => el.classList.add("sel"));
  if (st.hotKey) hot(st.hotKey, true);
}
function hot(k, on) {
  st.hotKey = on ? k : null;
  const p = k && partOf(k);
  $$(".xrig .hot").forEach(el => el.classList.remove("hot"));
  $$(".np button.hot").forEach(el => el.classList.remove("hot"));
  if (!on || !p) return;
  $$(`.xrig [data-part="${p}"]`).forEach(el => el.classList.add("hot"));
  $$(`.np button[data-hot="${CSS.escape(k)}"]`).forEach(el => el.classList.add("hot"));
}

/* ---------- rendering: an item open ---------- */
function roleLine(kind, id) {
  const x = find(kind, id);
  if (x.fresh) return kind === "kettle" ? "Not saved yet. Choose what AUTO runs, and its probe, element and pump." : `Not saved yet. Once a kettle uses it, it joins that vessel.`;
  if (kind === "kettle") { const roles = [x.id === D.mashTun && "the mash tun", x.id === D.boilKettle && "the boil kettle"].filter(Boolean); return `AUTO runs <b>${esc(val("kettle", id, "type") || "nothing yet")}</b>.${roles.length ? ` Settings chooses it as ${roles.join(" and ")}.` : ""}`; }
  const u = usesOf(kind, id);
  if (!u.length) return `No kettle uses it. Choose it as a kettle's ${kind === "sensor" ? "probe" : "element or pump"} in that kettle.`;
  const first = u[0], rest = u.slice(1);
  let s = `The <b>${esc(first.name)}</b>'s ${esc(first.how.replace(/^its /, ""))}.`;
  if (rest.length) s += ` ${rest.map(r => `The ${esc(r.name)} uses it too, as ${esc(r.how)}${r.role === "heater" && r.herms ? ": it heats the mash through the HERMS coil" : ""}.`).join(" ")}`;
  return s;
}
function liveHTML(kind, id) {
  const x = find(kind, id);
  if (!x || x.fresh) return "";
  const at = esc(st.lostAt || "");
  if (kind === "sensor") return `<p class="pv${lost() ? " stale" : ""} num">${esc(numR(id))}${isTemp(id) ? `<span class="u">${unit()}</span>` : ""}</p><p>${lost() ? `as at ${at}` : "reading now"}</p>`;
  if (kind === "actor") { const m = pinMates(id); return `${swHTML(id)}<p>${x.on ? `<span class="on">on</span> at ${esc(x.power)} %` : "off"} · one tap</p>${m.length ? `<p class="dup">${esc(m.map(a => a.name).join(", "))} uses GPIO ${esc(pinOf(x))} too</p>` : ""}`; }
  const s = x.sensor && find("sensor", x.sensor);
  return `${s ? `<p class="pv${lost() ? " stale" : ""} num">${esc(numR(x.sensor))}${isTemp(x.sensor) ? `<span class="u">${unit()}</span>` : ""}</p>` : ""}<p>${x.auto ? `<span class="on">AUTO on</span>` : "AUTO off"} · ${esc(targetText(x.target_temp))}</p>`;
}
/* a date or time a browser's own picker can show: "YYYY-MM-DD", or a 24-hour "HH:MM[:SS]" */
const pickable = (type, v) => blankish(v) || (type === "date" ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{2}:\d{2}(:\d{2})?$/).test(String(v).trim());
function ctlHTML(kind, id, f) {
  const v = val(kind, id, f), fid = "f-" + f.replace(/\W/g, "-"), d = `aria-describedby="w-${f.replace(/\W/g, "-")} s-${f.replace(/\W/g, "-")}"`;
  /* the name box is in the document, not in this shadow root: it shows here */
  if (f === "name") return `<slot name="name"></slot>`;
  if (f === "type") {
    const types = Object.keys(TYPES[kind] || {});
    const c = cat(kind, v), list = blankish(v) || types.includes(v) ? types : [...types, v];
    return `<select class="fld" id="${fid}" data-f="type" ${d}><option value=""${blankish(v) ? " selected" : ""}>${find(kind, id).fresh ? "Choose one" : "None"}</option>${list.map(t => `<option value="${esc(t)}"${t === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>${c ? `<p class="fx">${esc(c.does)}</p>` : ""}`;
  }
  const linkKind = f === "sensor" ? "sensor" : f === "heater" || f === "agitator" ? "actor" : null;
  const p = propDef(kind, id, f), lk = linkKind || (p && ["sensor", "actor", "kettle", "fermenter"].includes(p.type) ? p.type : null);
  if (lk) {
    const list = (D[lk] || []).filter(x => !x.fresh && !(lk === kind && x.id === id));
    const live = lk === "sensor" && !blankish(v) && find("sensor", v) ? `<p class="fx">Reads ${esc(fmtR(v))} now.</p>` : "";
    return `<select class="fld" id="${fid}" data-f="${esc(f)}" ${d}><option value=""${blankish(v) ? " selected" : ""}>None</option>${list.map(x => `<option value="${esc(x.id)}"${x.id === v ? " selected" : ""}>${esc(x.name)}</option>`).join("")}${!blankish(v) && !list.some(x => x.id === v) ? `<option value="${esc(v)}" selected>An unknown one (${esc(v)})</option>` : ""}</select>${live}`;
  }
  if (p && p.type === "select") {
    const o = (p.options || []).map(optVal);
    if (o.length && o.length <= 4 && o.every(x => x.length <= 4)) return `<div class="seg" role="radiogroup" aria-labelledby="n-${f.replace(/\W/g, "-")}" ${d}>${o.map((x, i) => { const on = same(x, v), first = i === 0 && !o.some(y => same(y, v)); return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on || first ? 0 : -1}" data-set="${esc(x)}" data-f="${esc(f)}">${esc(x)}</button>`; }).join("")}</div>`;
    const list = o.includes(String(v)) || blankish(v) ? o : [...o, String(v)];
    return `<select class="fld" id="${fid}" data-f="${esc(f)}" ${d}><option value=""${blankish(v) ? " selected" : ""}>${f === "props.Sensor" ? "Choose the probe" : "Empty"}</option>${list.map(x => `<option value="${esc(x)}"${same(x, v) ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  }
  if (p && p.type === "number") {
    const u = unitText(rowMeta(kind, id, f).u);
    /* an empty box says so; the line under the row says what its control uses instead */
    return `<div class="numf"><input id="${fid}" data-f="${esc(f)}" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(v)}" placeholder="empty" ${d}>${u ? `<span aria-hidden="true">${esc(u)}</span>` : ""}</div>`;
  }
  const kindOf = p && (p.type === "date" || p.type === "time") && pickable(p.type, v) ? p.type : "text";
  return `<input class="fld" id="${fid}" type="${kindOf}" data-f="${esc(f)}" autocomplete="off" spellcheck="false" value="${esc(v)}" ${d}>`;
}
function stHTML(kind, id, f) {
  const k = ik(kind, id), r = st.row[k + "|" + f] || {}, bad = invalid(kind, id, f);
  if (bad) return ["st no", `<span class="why2">${bad}</span>`];
  if (r.s === "wait") return ["st", "Saving…"];
  if (r.s === "bad") return ["st no", `Didn't save <span class="why2">· ${esc(r.msg)}</span>`];
  if (isChanged(kind, id, f) && !isNew(k)) return ["st", `Changed <span class="was">· was ${esc(shown(kind, id, f, kept(kind, id, f)))}</span><button type="button" class="lnk" data-undo="${esc(f)}">Undo</button>`];
  if (r.s === "ok") return ["st ok", `✓ Saved ${r.at}`];
  return ["st", ""];
}
/* the line under a row's control: two switches on one pin, which CraftBeerPi allows, or what an empty setting uses */
const extraLine = (kind, id, f) => { const c = pinClash(kind, id, f); return c ? ["fx warn", c] : ["fx", emptyText(kind, id, f)]; };
function pinClash(kind, id, f) {
  const v = kind === "actor" && f === "props.GPIO" ? val(kind, id, f) : "";
  const m = blankish(v) ? [] : D.actor.filter(x => x.id !== id && !x.fresh && pinOf(x) === String(v));
  return m.length ? `${andList(m.map(a => a.name))} ${m.length === 1 ? "has" : "have"} GPIO ${v} too: both would switch the same pin.` : "";
}
function rowHTML(kind, id, r) {
  const f = r.f, s = f.replace(/\W/g, "-"), p = propDef(kind, id, f), full = p && p.description && String(p.description).length > (r.l || "").length + 12 ? p.description : "";
  const labelled = p && p.type === "select" && (p.options || []).length <= 4 && (p.options || []).every(x => optVal(x).length <= 4);
  const nm = labelled ? `<p class="nm" id="n-${s}">${marked(r.n)}</p>` : `<label class="nm" id="n-${s}" for="${f === "name" ? "name" : "f-" + s}">${marked(r.n)}</label>`;
  const key = f.startsWith("props.") ? f.slice(6) : f === "type" ? (kind === "kettle" ? "logic" : "type") : f;
  const [cls, html] = stHTML(kind, id, f), k = ik(kind, id), rs = st.row[k + "|" + f] || {};
  const flash = st.flash && st.flash.k === k && st.flash.f === f && Date.now() < st.flash.until;
  const rowCls = ["row", isChanged(kind, id, f) && !isNew(k) ? "chg" : "", rs.s === "wait" ? "wait" : "", rs.s === "bad" ? "bad" : "", flash ? "flash" : ""].filter(Boolean).join(" ");
  const more = full ? `<button type="button" class="lnk" data-more="${esc(f)}" aria-expanded="${!!st.more[f]}" aria-controls="m-${s}">${st.more[f] ? "Less" : "More"}</button>` : "";
  const [xc, xt] = extraLine(kind, id, f);
  return `<div class="${rowCls}" id="r-${s}" data-f="${esc(f)}"><div class="lb">${nm}${r.l ? `<p class="wh" id="w-${s}">${marked(r.l)}</p>` : `<span id="w-${s}" hidden></span>`}<p class="ky"><span>${marked(key)}</span>${r.raw ? '<span class="tg">Its plugin\'s words</span>' : ""}${more}</p>${full ? `<p class="full" id="m-${s}"${st.more[f] ? "" : " hidden"}>${esc(full)}</p>` : ""}</div><div class="ct">${ctlHTML(kind, id, f)}<div class="${cls}" id="s-${s}">${html}</div><p class="${xc}" id="x-${s}" aria-live="polite"${xt ? "" : " hidden"}>${esc(xt)}</p></div></div>`;
}
function delHTML(kind, id) {
  const k = ik(kind, id), x = find(kind, id), u = x.fresh ? [] : usesOf(kind, id), w = kindWord(kind);
  const running = kind === "kettle" ? (x.auto ? [x] : []) : u.filter(r => r.auto);
  if (st.del === k) {
    const who = u.length ? u.map((r, i) => `${i ? (i === u.length - 1 ? " and " : ", ") : ""}the ${esc(r.name)} as ${esc(r.how)}`).join("") : "";
    const roles = kind === "kettle" ? [x.id === D.mashTun && "the mash tun", x.id === D.boilKettle && "the boil kettle"].filter(Boolean) : [];
    const what = kind === "kettle" ? `Its probe, element and pump stay in CraftBeerPi${roles.length ? `. Settings chooses it as ${roles.join(" and ")}, which will be blank` : ""}.` : u.length ? `It's used by ${who}. ${u.length === 1 ? "It" : "They"}'ll have none until you choose another.` : `No kettle uses it.`;
    const busy = st.deleting === k;
    return `<div class="ask" role="group" aria-labelledby="ask-q" tabindex="-1" id="ask"><p id="ask-q"><b>Delete the ${w} ${esc(x.name)}?</b> ${what} This can't be undone.</p><div class="acts"><button type="button" class="cmd del${busy ? " busy" : ""}" data-del-yes${busy ? ' aria-disabled="true"' : ""}>${busy ? "Deleting…" : `Delete ${esc(x.name)}`}<small>${busy ? "waiting for CraftBeerPi" : "from CraftBeerPi"}</small></button><button type="button" class="cmd" data-del-no${busy ? ' aria-disabled="true"' : ""}>Keep it<small>change nothing</small></button></div></div>`;
  }
  const why = running.length ? `The ${esc(running[0].name)}'s AUTO is on. Switch it off on Brew Day first.` : lost() ? "No connection." : "";
  return `<div class="row"><div class="lb"><p class="nm">Delete this ${w}</p><p class="wh">${x.fresh ? `Drops it from this page. Nothing has been sent to CraftBeerPi yet.` : `Removes ${esc(x.name)} from CraftBeerPi. It asks first, and says what uses it.`}</p></div><div class="ct"><button type="button" class="cmd del" data-del${why ? ` aria-disabled="true"` : ""}>${x.fresh ? "Drop it" : "Delete…"}<small>${why ? "not now" : x.fresh ? "not saved yet" : "asks first"}</small></button>${why ? `<p class="fx warn">${why}</p>` : ""}</div></div>`;
}
function fileHelp(x) {
  const unsaved = changedFields(ik("kettle", x.id)).length > 0;
  return x.fresh ? "Fill in this kettle from a kettle's settings file. Once it's saved, it can be saved to a file too." : unsaved ? "Save or undo the changes on this kettle first: the file holds the kettle as it was last saved." : x.auto ? `${x.name}'s AUTO is on. Switch it off to load a file into it.` : "Keep a copy of this kettle's control, settings and links, or load one back. Loading shows the changes first.";
}
function fileHTML(id) {
  const x = find("kettle", id), unsaved = changedFields(ik("kettle", id)).length > 0, isN = x.fresh, busy = st.file && st.file.id === id && st.file.busy;
  const canSave = !isN && !unsaved && !lost() && !st.fileBusy, canLoad = (isN || (!unsaved && !x.auto)) && !lost() && !st.fileBusy;
  const say = st.fileSay ? `<p class="say${st.fileSay.no ? " no" : ""}" data-kettle-file="status" role="${st.fileSay.no ? "alert" : "status"}">${esc(st.fileSay.text)}</p>` : "";
  return `<fieldset class="kf" data-kettle-file="group" aria-describedby="kettle-file-help"><legend>Settings file</legend><p id="kettle-file-help">${esc(fileHelp(x))}</p><div class="acts"><button type="button" class="cmd${st.fileBusy === "save" ? " busy" : ""}" id="kettle-file-save" data-file-save${canSave ? "" : ' aria-disabled="true"'}>${st.fileBusy === "save" ? "Saving…" : "Save to file…"}<small>a copy of it</small></button><button type="button" class="cmd${st.fileBusy === "read" ? " busy" : ""}" id="kettle-file-load" data-file-load${canLoad ? "" : ' aria-disabled="true"'}>${st.fileBusy === "read" && !busy ? "Reading…" : "Load from file…"}<small>shows the changes first</small></button></div>${say}${st.file && st.file.id === id ? previewHTML(x) : ""}</fieldset>`;
}
/* the file's date as the preview says it: "15 Nov 2026, 21:40" */
function fileWhen(saved) {
  const t = new Date(saved);
  if (!saved || isNaN(t.getTime())) return "";
  return `${t.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getMonth()]} ${t.getFullYear()}, ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
/* a link's end, as the preview shows it: its name, or the id CraftBeerPi can't find */
const linkText = x => (!x || !x.id ? "" : x.name || `an unknown one (${x.id})`);
/* CraftBeerPi's preview, as this page's lines: the control, the probe, element and pump, then the control's settings in the
   catalogue's order and plain names, each now and after loading */
function planRows(f) {
  const p = f.plan, type = f.type, rows = [];
  if (p.logic) rows.push({key: "logic", name: "AUTO control", now: p.logic.now || "", after: p.logic.after || "", changes: !!p.logic.changes, note: p.logic.note || ""});
  ["sensor", "heater", "agitator"].forEach(key => {
    const r = (p.links || []).find(x => x.key === key);
    if (r) rows.push({key, name: HW_OWN.kettle.find(o => o[0] === key)[1], now: linkText(r.now), after: linkText(r.after), changes: !!r.changes, note: r.note || ""});
  });
  const order = [];
  ((cat("kettle", type) || {parts: []}).parts).forEach(([, rs]) => rs.forEach(([k]) => order.push(k)));
  const rank = l => { const i = order.indexOf(l); return i < 0 ? order.length : i; };
  (p.settings || []).slice().sort((a, b) => rank(a.label) - rank(b.label)).forEach(r => {
    const m = metaFor("kettle", type, r.label), u = unitText(m.u), say = v => (r.link ? linkText(v) : blankish(v) ? "" : `${ownText(v)}${u ? " " + u : ""}`);
    rows.push({key: r.label, name: m.n, now: say(r.now), after: say(r.after), changes: !!r.changes, filled: !!r.filled, note: r.filled ? "" : r.note || ""});
  });
  return rows;
}
/* what loading a file would change, from CraftBeerPi's preview: the lines that change first and alone, the rest a press
   away; nothing is loaded until the button that says what it does is pressed, and there is no default answer.
   A new kettle is filled in from the file instead; a preview the kettle has changed since loads nothing until it is redrawn */
function previewHTML(x) {
  const p = st.file, plan = p.plan, type = p.type, rows = planRows(p), ch = rows.filter(r => r.changes), visible = p.all ? rows : ch, same2 = rows.length - ch.length;
  const tr = r => `<tr data-row="${esc(r.key)}" data-changes="${r.changes ? "yes" : "no"}"${r.filled ? ' data-filled="yes"' : ""}><th scope="row">${esc(r.name)}<small>${brk(r.key)}</small></th><td data-side="now"${r.now === "" ? ' class="q"' : ""}>${r.now === "" ? "blank" : brk(r.now)}</td><td data-side="after"${r.changes ? ' class="after"' : ' class="same"'}>${r.changes ? (r.after === "" ? "blank" : brk(r.after)) + (r.filled ? `<small>${brk(type)}'s built-in value</small>` : "") : "same"}${r.note ? `<small>${brk(r.note)}</small>` : ""}</td></tr>`;
  const blank = (plan.blank || []).map(b => ({...b, n: metaFor("kettle", type, b.label).n, u: unitText(metaFor("kettle", type, b.label).u)}));
  const vals = blank.filter(b => b.value != null), nulls = blank.filter(b => b.value == null), filled = rows.filter(r => r.filled);
  const stale = !!p.stale, blocked = !p.isNew && x.auto, offAll = stale || blocked || p.busy;
  const off = offAll ? ' aria-disabled="true"' : "", nv = vals.length;
  /* what loading leaves empty: what its control uses then, or what empty means; and what was filled in instead */
  const box = vals.length || nulls.length || filled.length ? `<div class="kfz" data-kettle-file="blank"><h4>Empty settings</h4>${filled.length ? `<p>Filled in with ${esc(type)}'s built-in ${filled.length === 1 ? "value, shown above as a change" : "values, shown above as changes"}: ${filled.map(r => `<b>${esc(r.name)} ${esc(r.after)}</b>`).join(", ")}. Loading saves ${filled.length === 1 ? "it" : "them"}. <button type="button" class="lnk" data-file-unfill${off}>Leave ${filled.length === 1 ? "it" : "them"} empty</button></p>` : ""}${vals.length ? `<p>Loaded as it is, ${vals.length === 1 ? "this setting stays" : "these settings stay"} empty, and ${esc(type)} uses ${vals.length === 1 ? "its built-in value" : "its built-in values"}: ${vals.map(b => `<b>${esc(b.n)} ${esc(ownText(b.value))}${b.u ? " " + esc(b.u) : ""}</b>`).join(", ")}.</p>` : ""}${nulls.length ? `<p class="also">${vals.length || filled.length ? "Also empty" : "Empty"}, and ${esc(type)} has no value to fill in: ${nulls.map(b => `${esc(b.n)}${HW_EMPTY[b.label] ? ` (${esc(HW_EMPTY[b.label])})` : ""}`).join(", ")}.</p>` : ""}</div>` : "";
  const nothing = !p.isNew && !ch.length;
  const what = p.isNew ? `${ch.length} settings` : nothing ? "nothing changes" : `${ch.length} ${ch.length === 1 ? "change" : "changes"}`;
  const heading = p.isNew ? `${ch.length} settings to fill in` : nothing ? `Nothing would change: ${x.name} already has everything in this file.` : `${ch.length} ${ch.length === 1 ? "change" : "changes"}`;
  const loadOff = offAll || nothing ? ' aria-disabled="true"' : "";
  const acts = `<div class="acts"><button type="button" class="cmd" data-file-cancel id="kettle-file-cancel">Cancel<small>loads nothing</small></button>${nv ? `<button type="button" class="cmd" id="kettle-file-fill" data-file-fill${off}>Fill in ${nv === 1 ? "this value" : "these values"}<small>shown as ${nv === 1 ? "a change" : "changes"} first</small></button>` : ""}<button type="button" class="cmd${nv ? "" : " ans"}${p.busy === "load" ? " busy" : ""}" id="kettle-file-confirm" data-file-confirm${loadOff}>${p.busy === "load" ? "Loading…" : p.isNew ? "Fill in this kettle" : `Load into ${esc(x.name)}`}<small>${what}${nv ? `; ${nv} left empty` : ""}</small></button></div>`;
  const f = plan.file || {}, when = fileWhen(f.saved);
  const from = `From ${p.fileName}${f.kettle ? `, saved from the kettle ${f.kettle}` : ""}${f.craftbeerpi ? ` by CraftBeerPi ${f.craftbeerpi}` : ""}${when ? ` on ${when}` : ""}.`;
  const other = plan.other_kettle && f.kettle ? `<p class="from" data-kettle-file="other-kettle">This file was saved from the kettle ${esc(f.kettle)}, not ${esc(x.name)}. Check it's the file you meant.</p>` : "";
  const left = (plan.left_as_is || []).map(l => { const link = ["sensor", "heater", "agitator"].includes(l.label); const n = link ? HW_OWN.kettle.find(o => o[0] === l.label)[1] : metaFor("kettle", type, l.label).n; const u = link ? "" : unitText(metaFor("kettle", type, l.label).u); return `${n} stays ${link ? l.value : `${ownText(l.value)}${u ? " " + u : ""}`}: the file doesn't ${link ? "say" : "have it"}.`; });
  const problems = (plan.problems || []).map(q => q.text);
  const err = stale ? `<div class="kfe" data-kettle-file="error" role="alert"><p><b>Nothing was loaded: ${esc(x.name)} has changed since this preview.</b> It was changed on another screen. LOOK AGAIN shows what loading would change now.</p><button type="button" class="cmd ans" data-file-again>Look again<small>shows the changes now</small></button></div>`
    : p.error ? `<div class="kfe" data-kettle-file="error" role="alert"><p><b>Nothing was loaded.</b> ${esc(p.error)}</p></div>`
    : blocked ? `<div class="kfe" data-kettle-file="blocked" role="alert"><p><b>Nothing can be loaded while ${esc(x.name)}'s AUTO is on.</b> Switch it off on Brew Day, then load the file.</p></div>` : "";
  return `<div data-kettle-file="preview"><div class="kfp" role="dialog" aria-labelledby="kettle-file-title" aria-describedby="kettle-file-from"><h3 id="kettle-file-title">${p.isNew ? "Fill in this kettle from a file?" : `Load settings into ${esc(x.name)}?`}</h3><p class="from" id="kettle-file-from">${esc(from)}</p>${other}<h4 data-kettle-file="heading">${esc(heading)}</h4>${visible.length ? `<table aria-label="What would change"><thead><tr><th scope="col" style="width:40%">Setting</th><th scope="col">Now</th><th scope="col">After loading</th></tr></thead><tbody>${visible.map(tr).join("")}</tbody></table>` : ""}${same2 ? `<p><button type="button" class="lnk" data-file-all aria-expanded="${!!p.all}">${p.all ? `Hide the ${same2} that stay the same` : `Show the ${same2} that stay the same`}</button></p>` : ""}${problems.length ? `<h4>Not loaded</h4><ul data-kettle-file="problems">${problems.map(t => `<li>${brk(t)}</li>`).join("")}</ul>` : ""}${left.length ? `<h4>Not in the file</h4><ul data-kettle-file="left">${left.map(t => `<li>${brk(t)}</li>`).join("")}</ul>` : ""}${box}${err}${acts}</div></div>`;
}

function sheetHTML(kind, id) {
  const x = find(kind, id), k = ik(kind, id), part = partOf(k);
  const word = kind === "kettle" ? "Kettle" : kind === "sensor" ? "Probe" : (() => { const u = usesOf("actor", id).find(r => r.role); return u ? ROLE[u.role] : "Switch"; })();
  const ps = partsOf(kind, id).map((p, j) => `<div class="part" role="group" aria-labelledby="p-${j}"><h3 id="p-${j}">${esc(p.h)}${j === 0 && x.type && !x.fresh ? `<span class="pl">${esc(kind === "kettle" ? "" : x.type)}</span>` : ""}</h3>${p.rows.map(r => rowHTML(kind, id, r)).join("")}</div>`);
  const parts = `${ps[0] || ""}${kind === "kettle" ? fileHTML(id) : ""}${ps.slice(1).join("")}`;
  return `<section class="sheet" id="sheet" data-item="${esc(k)}" aria-labelledby="sh-h"><header class="shd"><button type="button" class="back" data-home>‹ All hardware</button>${part ? `<button type="button" class="mini" data-home data-keep aria-label="Back to the brewhouse drawing"><span>‹ Brewhouse</span></button>` : ""}<div class="who"><p class="k">${word}${(() => { const w = !x.fresh && wiring(kind, id); return w ? ` · ${esc(w)}` : ""; })()}</p><h2 id="sh-h">${esc(nameOf(kind, id))}</h2><p class="role">${roleLine(kind, id)}</p></div><div class="live">${liveHTML(kind, id)}</div></header>${parts}<div class="part gone" role="group" aria-labelledby="p-del"><h3 id="p-del">Delete</h3>${delHTML(kind, id)}</div></section>`;
}
function waitHTML() {
  const [kind, id] = st.waitFor;
  if (st.wait === "loading") return `<section class="wait-sheet" aria-busy="true"><b>Opening the ${kindWord(kind)}…</b><p>Waiting for CraftBeerPi to send it. SAVE waits too, so nothing blank can be saved over it.</p><div class="ghost"></div><div class="ghost"></div><slot name="name"></slot></section>`;
  return `<section class="wait-sheet"><b>No ${kindWord(kind)} here</b><p>CraftBeerPi has no ${kindWord(kind)} with the address ${esc(id)}. It may have been deleted, or the link is old.</p><div class="acts"><button type="button" class="cmd" data-home>‹ Brewhouse<small>see what there is</small></button></div><slot name="name"></slot></section>`;
}

/* ---------- patching a region in place ---------- */
// Same result as setting innerHTML, but an element that is still there keeps its identity: its focus, and what is being
// typed into it. A box marked data-keep keeps what is drawn in it (the drawings).
function morph(el, html) {
  const t = document.createElement("template");
  t.innerHTML = html;
  patchChildren(el, t.content);
}
const KEYS = ["id", "data-open", "data-f", "data-sw", "data-hit", "data-k"];
const alike = (o, n) => o.nodeType === n.nodeType && o.nodeName === n.nodeName && (o.nodeType !== 1 || KEYS.every(a => o.getAttribute(a) === n.getAttribute(a)));
function patchChildren(from, to) {
  const olds = Array.from(from.childNodes), news = Array.from(to.childNodes);
  news.forEach((n, i) => {
    const o = olds[i];
    if (!o) from.appendChild(n);
    else if (alike(o, n)) patchNode(o, n);
    else from.replaceChild(n, o);
  });
  for (let i = news.length; i < olds.length; i++) olds[i].remove();
}
function patchNode(o, n) {
  if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
  const focused = sr && sr.activeElement === o;
  let want = null;
  if (o.tagName === "SELECT") { const opt = n.querySelector("option[selected]"); want = opt ? opt.getAttribute("value") || "" : ""; }
  for (const {name} of Array.from(o.attributes)) if (!n.hasAttribute(name) && !(name === "data-sig" && o.hasAttribute("data-keep"))) o.removeAttribute(name);
  for (const {name, value} of Array.from(n.attributes)) if (o.getAttribute(name) !== value) o.setAttribute(name, value);
  if (o.tagName === "INPUT" && !focused) { const v = n.getAttribute("value") ?? ""; if (o.value !== v) o.value = v; }
  if (o.hasAttribute("data-keep")) return;
  patchChildren(o, n);
  if (want !== null && !focused && o.value !== want) o.value = want;
}

/* ---------- painting ---------- */
function paintChrome() {
  morph($("#idx"), idxHTML());
  const b = $("#btns");
  if (b) morph(b, btnsHTML()); else morph($("#tool"), toolHTML());
  const addm = $("#addm");
  if (addm) addm.hidden = !st.menu;
  const n = noteHTML(), note = $("#note");
  note.hidden = !n;
  if (n) { note.className = n[0]; morph(note, n[1]); } else note.innerHTML = "";
  const sb = $("#savebar"), d = nDirty();
  sb.hidden = !(d || st.saving);
  const fx = effects().length;
  morph(sb, d || st.saving ? `<p>${st.saving ? "Saving…" : `${d} ${d === 1 ? "change" : "changes"} not saved${fx ? `<small>Saving switches ${fx === 1 ? "one thing" : fx + " things"} off: see above</small>` : ""}`}</p><button type="button" class="cmd" data-undoall${st.saving ? ' aria-disabled="true"' : ""}>Undo</button><button type="button" class="cmd go${st.saving ? " busy" : ""}" data-save aria-label="Save"${lost() || invalids().length ? ' aria-disabled="true"' : ""}>Save</button>` : "");
  const app = host.closest(".app");
  if (app) app.toggleAttribute("data-dirty", !!d);
  $("#main").dataset.view = st.view;
  $("#main").toggleAttribute("data-adding", false);
}
function paintView() {
  const v = $("#view");
  if (st.wait) morph(v, waitHTML());
  else if (st.open && find(...split(st.open))) morph(v, sheetHTML(...split(st.open)));
  else { st.open = null; morph(v, xrHTML()); }
  paintName();
  requestAnimationFrame(drawAll);
}
/* the name box, in the document: the item's name, or while the item hasn't arrived, an empty read-only box out of sight */
function paintName() {
  const n = nameBox;
  if (!n) return;
  const item = st.open && !st.wait ? split(st.open) : null;
  if (!item || !find(...item)) {
    n.className = "sr"; n.readOnly = true; n.tabIndex = -1;
    n.setAttribute("aria-hidden", "true");
    ["aria-label", "aria-invalid", "aria-description"].forEach(a => n.removeAttribute(a));
    if (n.value !== "") n.value = "";
    return;
  }
  const [kind, id] = item, v = String(val(kind, id, "name") ?? ""), bad = invalid(kind, id, "name");
  n.className = "fld"; n.readOnly = false; n.removeAttribute("tabindex"); n.removeAttribute("aria-hidden");
  n.setAttribute("aria-label", "Name");
  if (bad) { n.setAttribute("aria-invalid", "true"); n.setAttribute("aria-description", bad); } else { n.removeAttribute("aria-invalid"); n.removeAttribute("aria-description"); }
  if (n.value !== v && document.activeElement !== n) n.value = v;
}
function drawAll() {
  if (!st) return;
  if (st.open) { const box = $(".mini"); if (box && !phone()) drawRig(box, partOf(st.open), true); }
  else drawRig($("#xrig"), null, false);
  /* the drawing docked under the list on a tablet: the part open is lit */
  const sel = st.open ? partOf(st.open) : null, t = $("#dk-t");
  drawRig($("#dkrig"), sel, false);
  if (t) t.textContent = !st.open ? "Tap a part, or its line above, to open its settings." : sel ? "The part open above is lit. Tap another to open it." : "What's open above isn't in the drawing: no kettle uses it.";
}
function render() { if (!st) return; morph($("#tool"), toolHTML()); paintChrome(); paintView(); }
/* CraftBeerPi's word on things arrives many times a second: drawn once a frame */
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
/* a row repainted in place, so a field being typed in keeps its focus */
function paintRow(f) {
  if (!st.open) return;
  const [kind, id] = split(st.open), el = $("#r-" + f.replace(/\W/g, "-"));
  if (!el) return;
  const t = document.createElement("template");
  t.innerHTML = rowHTML(kind, id, rowMeta(kind, id, f));
  patchNode(el, t.content.firstElementChild);
  if (f === "name") paintName();
}

/* ---------- moving about ---------- */
/* the address of what's open; the page's own moves aren't asked again (route) */
function routeTo(path, replace) {
  if (st.path === path) return;
  st.path = path;
  if (env.navigate) env.navigate(path, replace ? {replace: true} : undefined);
}
const pathOf = k => { const [kind, id] = split(k); return isNew(k) ? `/${kind}` : `/${kind}/${encodeURIComponent(id)}`; };
function open(k, f) {
  const [kind, id] = split(k);
  if (!find(kind, id)) return;
  st.open = k; st.del = null; st.menu = false; st.wait = null;
  if (!st.file || st.file.id !== id) st.file = null;
  st.fileSay = null; st.fileListSay = null;
  st.view = "item";
  if (f) st.flash = {k, f, until: Date.now() + 1600};
  routeTo(pathOf(k));
  render();
  /* another item's name, even into a box with the focus */
  if (nameBox) nameBox.value = String(val(kind, id, "name") ?? "");
  const pane = $("#pane");
  if (f) { const el = $("#r-" + f.replace(/\W/g, "-")); if (el) { el.scrollIntoView({block: "center"}); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } }
  /* on a phone the item opens at its own top, so its kind and first settings are in view; elsewhere the page goes back
     to the tool row */
  else if (phone()) pane.scrollIntoView({block: "start"});
  else if (!wide()) $("#main").scrollIntoView({block: "start"});
  else pane.scrollTop = 0;
}
function home() {
  const was = st.open;
  st.open = null; st.del = null; st.file = null; st.wait = null; st.view = "index";
  routeTo("/hardware");
  render();
  /* on a phone the list comes back at the line just closed */
  const line = was && phone() && $(`#idx [data-open="${CSS.escape(was)}"]`);
  if (line) line.scrollIntoView({block: "center"});
  else if (!wide()) $("#main").scrollIntoView({block: "start"});
}
/* a link to an item: open it, or wait for CraftBeerPi to send it, or say there's none */
function openLink(kind, id) {
  const k = ik(kind, id);
  if (find(kind, id)) return open(k);
  st.open = null; st.del = null; st.file = null; st.view = "item";
  st.wait = st.loaded ? "missing" : "loading"; st.waitFor = [kind, id];
  st.path = `/${kind}/${encodeURIComponent(id)}`;
  render();
}
/* the router's address: #/hardware, #/<kind>/<id> or #/<kind> for a new one */
function route(r) {
  const path = r.kind ? (r.id ? `/${r.kind}/${encodeURIComponent(r.id)}` : `/${r.kind}`) : "/hardware";
  if (path === st.path) return;
  st.path = path;
  if (r.kind && r.id) openLink(r.kind, r.id);
  else if (r.kind) {
    /* back to a new item not saved yet, or a new one */
    const k = [...st.news].reverse().find(x => x.kind === r.kind);
    if (k) open(ik(k.kind, k.rec.id)); else addNew(r.kind);
  } else if (st.open || st.wait) home();
}

/* ---------- leaving: with changes not saved, the note asks first ---------- */
const go = href => env.navigate && env.navigate(String(href || "#/").replace(/^#/, "") || "/");
function leaveFor(label, href) {
  st.leave = {label, href};
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
function onUnload(e) {
  if (!st || !dirty().length) return;
  e.preventDefault();
  e.returnValue = "";
}
function fermenters() {
  if (dirty().length && !st.saving) return leaveFor("Fermenters", "#/fermenters");
  go("#/fermenters");
}

/* ---------- changing, saving ---------- */
function setDraft(f, v) {
  const k = st.open, [kind, id] = split(k);
  st.draft[k] = st.draft[k] || {};
  if (f === "type" && kind === "kettle") {
    /* the control left keeps the changes made to its settings here, and the one chosen gets back any it had */
    const d = st.draft[k], aside = (st.aside[k] = st.aside[k] || {}), was = val(kind, id, "type");
    aside[was] = Object.fromEntries(Object.entries(d).filter(([key]) => key.startsWith("props.")));
    Object.keys(aside[was]).forEach(key => delete d[key]);
    Object.assign(d, aside[v] || {});
  }
  st.draft[k][f] = v;
  delete st.row[k + "|" + f];
  if (!isChanged(kind, id, f) && !isNew(k)) delete st.draft[k][f];
  if (!Object.keys(st.draft[k]).length && !isNew(k)) delete st.draft[k];
  /* the whole page follows - the list, the header, the settings file group, what saving will do - patched in place, so
     the box being typed in keeps its focus */
  render();
}
function save(how, then) {
  if (st.saving || st.wait) return null;
  if (lost()) return toast("No connection: SAVE sends your changes once CraftBeerPi is back.");
  const ks = dirty();
  if (!ks.length) return toast("Nothing has changed yet: change a setting, then SAVE.");
  if (invalids().length) return toast("Fix the entry marked in red first.");
  /* an empty setting its control fills with a built-in value is named before saving, and the answer is the brewer's */
  const empties = ks.map(k => [k, emptiesOf(k)]).filter(([, e]) => e.length);
  if (empties.length && !how) {
    st.ask = {then: then || null};
    render();
    const n = $("#note");
    if (n) { n.tabIndex = -1; n.scrollIntoView({block: "nearest"}); n.focus({preventScroll: true}); }
    return "asked";
  }
  if (how === "fill") empties.forEach(([k, e]) => e.forEach(([f, v]) => (st.draft[k][f] = ownText(v))));
  const next = then || (st.ask && st.ask.then);
  st.ask = null;
  st.leave = null;
  st.saving = true;
  ks.forEach(k => (isNew(k) ? ["name"] : changedFields(k)).forEach(f => (st.row[k + "|" + f] = {s: "wait"})));
  render();
  send(ks).then(ok => { if (ok && next) next(); });
  return "saving";
}
/* what CraftBeerPi is sent for an item: the whole of it, as it saves a whole kettle, probe or switch at once. The
   settings are those it has for the kind chosen - all of them, including any its control keeps there itself - or, for a
   kettle given another control, those that control last had on it, with this page's changes */
function bodyOf(k) {
  const [kind, id] = split(k), x = find(kind, id), d = drafts(k), type = String(val(kind, id, "type") || "");
  let props = {};
  if (!x.fresh) props = kind === "kettle" && !same(type, x.type) ? {...((x.props_by_type || {})[type] || {})} : {...(x.props || {})};
  Object.keys(d).filter(f => f.startsWith("props.")).forEach(f => (props[f.slice(6)] = d[f]));
  const body = {name: val(kind, id, "name") == null ? "" : val(kind, id, "name"), type, props};
  if (kind === "kettle") LINKS.forEach(([f]) => (body[f] = val(kind, id, f) || ""));
  return body;
}
/* an item about to be sent: what it is now, and what goes */
function outgoing(k0) {
  const [kind, id] = split(k0), x = find(kind, id);
  if (!x) return null;
  const isN = !!x.fresh, target = kind === "kettle" && !isN ? +x.target_temp : 0;
  return {k0, kind, id, isN, fs: isN ? Object.keys(drafts(k0)) : changedFields(k0), name: nameOf(kind, id), sent: {...drafts(k0)},
    wasAuto: kind === "kettle" && !isN && x.auto, wasOn: kind === "actor" && !isN && x.on,
    /* CraftBeerPi takes a kettle's whole record without its target, and so sets it to 0: it is put back after */
    target: isFinite(target) && target !== 0 ? target : 0,
    url: isN ? `/${kind}/` : `/${kind}/${encodeURIComponent(id)}`, body: bodyOf(k0)};
}
/* CraftBeerPi's answer for one item: its rows say how it went, and a new item takes CraftBeerPi's id. -> whether it saved */
function settle(it, res) {
  const {k0, kind, id, isN, fs, sent} = it;
  const rec = res.ok && res.data && typeof res.data === "object" ? res.data : null;
  if (!res.ok || (isN && !(rec && rec.id))) {
    const refused = res.error === "http";
    const msg = refused ? `CraftBeerPi refused it (${res.status})` : NO_ANSWER;
    fs.forEach(f => (st.row[k0 + "|" + f] = {s: "bad", msg}));
    st.why[k0] = {refused, msg};
    return false;
  }
  let k = k0;
  if (isN) {
    /* the new item has CraftBeerPi's id now: its page, rows and address follow */
    k = ik(kind, rec.id);
    st.news = st.news.filter(n => !(n.kind === kind && n.rec.id === id));
    Object.keys(st.row).filter(r => r.startsWith(k0 + "|")).forEach(r => { st.row[k + r.slice(k0.length)] = st.row[r]; delete st.row[r]; });
    if (st.open === k0) { st.open = k; st.path = null; }
  }
  st.patch[k] = {rec: {...asRecord(kind, rec || {...it.body, id}), ...(it.target ? {target_temp: it.target} : {})}, until: Date.now() + 5000};
  const at = hhmm();
  fs.forEach(f => (st.row[k + "|" + f] = {s: "ok", at}));
  /* what was sent is saved; anything changed while it was on its way stays a change */
  const left = isN ? {} : Object.fromEntries(Object.entries(drafts(k0)).filter(([f, v]) => !(f in sent) || !same(v, sent[f])));
  if (Object.keys(left).length) st.draft[k0] = left; else delete st.draft[k0];
  delete st.aside[k0]; delete st.why[k0];
  merge();
  if (isN && st.open === k) routeTo(pathOf(k), true);
  return true;
}
/* CraftBeerPi's answers, one item at a time. -> whether all saved */
async function send(ks) {
  const g = gen, ok = [], no = [];
  for (const k0 of ks) {
    const it = outgoing(k0);
    if (!it) continue;
    const res = await call(it.isN ? "POST" : "PUT", it.url, it.body, SAVE_MS);
    if (g !== gen || !st) return false;
    const saved1 = settle(it, res);
    if (saved1) ok.push([it.name, it.wasAuto, it.wasOn]); else no.push(it.name);
    render();
    if (saved1 && it.target) {
      const back = await call("POST", `/kettle/${encodeURIComponent(it.id)}/target_temp`, {temp: it.target});
      if (g !== gen || !st) return false;
      if (!back.ok) {
        log(`${it.name}'s target ${fmtT(it.target)}, put back after saving`, `failed: ${callWhy(back)}`, "bad");
        toast(`${it.name} saved, but its target ${fmtT(it.target)} wasn't put back: ${callWhy(back)}. Set it again on Brew Day.`);
      }
    }
  }
  if (g !== gen || !st) return false;
  st.saving = false;
  const offs = ok.filter(o => o[1] || o[2]).map(o => `${o[0]}'s ${o[1] ? "AUTO" : "switch"} is off`);
  if (no.length) log(`Hardware: ${ok.length ? `${andList(ok.map(o => o[0]))} saved; ` : ""}saving ${andList(no)}`, "failed", "bad");
  else if (ok.length) log(`Hardware: ${andList(ok.map(o => o[0]))} saved${offs.length ? ` · ${offs.join(", ")}` : ""}`, "confirmed", "ok");
  say(no.length ? `${no.length} didn't save` : `${ok.length} saved`);
  render();
  return !no.length;
}
function undo(f) {
  const k = st.open;
  if (f === "type" && split(k)[0] === "kettle") { setDraft("type", saved(...split(k), "type")); return; }
  if (st.draft[k]) delete st.draft[k][f];
  if (st.draft[k] && !Object.keys(st.draft[k]).length && !isNew(k)) delete st.draft[k];
  delete st.row[k + "|" + f];
  if (f === "type") return render();
  paintRow(f);
  if (f === "name" && nameBox) { const [kind, id] = split(k); nameBox.value = String(val(kind, id, "name") ?? ""); }
  paintChrome();
}
function undoAll() {
  if (st.saving) return;
  st.news.forEach(n => { if (st.open === ik(n.kind, n.rec.id)) st.open = null; });
  st.news = [];
  st.draft = {}; st.aside = {}; st.ask = null; st.leave = null;
  Object.keys(st.row).forEach(k => { if (st.row[k].s === "bad") delete st.row[k]; });
  merge();
  if (!st.open && !st.wait) { st.view = "index"; routeTo("/hardware"); }
  render();
  if (st.open && nameBox) { const [kind, id] = split(st.open); nameBox.value = String(val(kind, id, "name") ?? ""); }
}
/* one tap: CraftBeerPi switches it, and the button waits for its answer */
async function toggle(id) {
  const a = find("actor", id);
  if (!a || st.busy[id]) return;
  if (lost()) return toast(PAUSED);
  const want = !a.on, g = gen;
  st.busy[id] = true;
  render();
  const res = await call("POST", `/actor/${encodeURIComponent(id)}/${want ? "on" : "off"}`);
  if (g !== gen || !st) return;
  delete st.busy[id];
  if (res.ok) {
    st.expect[id] = {want, until: Date.now() + EXPECT_MS};
    log(`${a.name} switched ${want ? "on" : "off"}`, "confirmed", "ok");
    later(() => { merge(); render(); }, EXPECT_MS + 50);
  } else {
    const w = callWhy(res);
    log(`Switching ${a.name} ${want ? "on" : "off"}`, `failed: ${w}`, "bad");
    toast(`${a.name} didn't switch ${want ? "on" : "off"}: ${w}.`);
  }
  merge();
  render();
}
function addNew(kind) {
  st.adding += 1;
  const id = `new-${kind}-${st.adding}`;
  const pref = {sensor: "OneWire", actor: "GPIOActor"}[kind];
  const type = pref && TYPES[kind] && TYPES[kind][pref] ? pref : "";
  const rec = {id, name: "", type, props: {}, fresh: true};
  if (kind === "kettle") Object.assign(rec, {sensor: "", heater: "", agitator: "", target_temp: 0, auto: false, props_by_type: {}});
  if (kind === "actor") Object.assign(rec, {on: false, power: 100});
  st.news.push({kind, rec});
  merge();
  st.draft[ik(kind, id)] = {type};
  st.menu = false;
  open(ik(kind, id));
  if (nameBox) nameBox.focus();
}
async function deleteNow(k) {
  const [kind, id] = split(k), x = find(kind, id);
  if (!x) return;
  if (x.fresh) {
    st.news = st.news.filter(n => !(n.kind === kind && n.rec.id === id));
    delete st.draft[k]; delete st.aside[k];
    merge();
    return home();
  }
  if (st.deleting) return;
  st.deleting = k;
  render();
  const g = gen, res = await call("DELETE", `/${kind}/${encodeURIComponent(id)}`);
  if (g !== gen || !st) return;
  st.deleting = null;
  if (!res.ok) {
    const w = callWhy(res);
    log(`Deleting ${x.name}`, `failed: ${w}`, "bad");
    toast(`${x.name} wasn't deleted: ${w}.`);
    st.del = null;
    return render();
  }
  st.gone.add(k);
  delete st.draft[k]; delete st.aside[k];
  Object.keys(st.row).filter(r => r.startsWith(k + "|")).forEach(r => delete st.row[r]);
  log(`${x.name} deleted`, "confirmed", "ok");
  D[kind] = D[kind].filter(y => y.id !== id);
  if (st.open === k) home(); else render();
}

/* ---------- a kettle's settings file ---------- */
const lcFirst = s => (/^(The|This|These|It) /.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
/* why a file can't be loaded, as the group says it */
function cantLoad(fileName, detail) {
  const d = String(detail || "").trim(), m = /^This isn't a kettle settings file: ([\s\S]*)$/.exec(d);
  if (m) return `${fileName} can't be loaded: ${m[1].replace(/, the kind of text file that "Save to file" makes\.$/, ".")} Choose a settings file that CraftBeerPi saved from a kettle.`;
  return `${fileName} can't be loaded: ${lcFirst(d)}`;
}
async function fileSave(k, inList) {
  const [, id] = split(k), x = find("kettle", id), g = gen;
  if (!x || st.fileBusy) return;
  st.fileBusy = "save";
  render();
  let said;
  try {
    const name = await saveKettleFile(id);
    said = {text: `Saved ${name}.`};
  } catch (e) {
    said = {no: true, text: `Couldn't save the file. ${fileError(e, "CraftBeerPi couldn't make it.")}`};
  }
  if (g !== gen || !st) return;
  st.fileBusy = null;
  if (inList) {
    if (said.no) { toast(said.text); st.fileListSay = null; } else st.fileListSay = {k, text: said.text};
  } else st.fileSay = said;
  render();
}
/* CraftBeerPi's preview of the file chosen, into the kettle open (or a new one), filling in its empty settings or not */
async function filePlan(id, text, fileName, fillIn) {
  const x = find("kettle", id), isN = !!(x && x.fresh), g = gen;
  try {
    const plan = await kettleapi.previewFile(isN ? null : id, text, fillIn);
    if (g !== gen || !st) return;
    st.file = {id, text, fileName, plan, isNew: isN, fillIn: !!fillIn, type: (plan.file && plan.file.logic) || (plan.logic && plan.logic.after) || "", all: false, stale: false, error: null, busy: null};
    st.fileSay = null;
  } catch (e) {
    if (g !== gen || !st) return;
    st.file = null;
    st.fileSay = {no: true, text: cantLoad(fileName, fileError(e, "CraftBeerPi couldn't read it."))};
  }
  st.fileBusy = null;
  render();
  const c = $("#kettle-file-cancel");
  if (c) c.focus();
}
async function fileChosen(input) {
  const file = input.files && input.files[0];
  // cleared, so choosing the same file again is noticed
  input.value = "";
  if (!file || !st.open) return;
  const [kind, id] = split(st.open);
  if (kind !== "kettle") return;
  st.fileBusy = "read"; st.fileSay = null;
  render();
  let text;
  try { text = await readChosenFile(file); } catch (e) {
    st.fileBusy = null;
    st.fileSay = {no: true, text: `${file.name} can't be loaded: ${lcFirst(e.message)}`};
    return render();
  }
  return filePlan(id, text, file.name, false);
}
async function fileLoad() {
  const f = st.file, x = f && find("kettle", f.id), g = gen;
  if (!f || !x) return;
  const filled = planRows(f).filter(r => r.filled).length;
  if (f.isNew) {
    /* filling in sends nothing: the new kettle's settings wait on this page for SAVE */
    const a = f.plan.after || {}, k = ik("kettle", f.id), dr = (st.draft[k] = st.draft[k] || {});
    if (blankish(dr.name)) dr.name = a.name || "";
    Object.assign(dr, {type: a.type || "", sensor: a.sensor || "", heater: a.heater || "", agitator: a.agitator || ""});
    Object.keys(dr).filter(key => key.startsWith("props.")).forEach(key => delete dr[key]);
    Object.entries(a.props || {}).forEach(([key, v]) => (dr["props." + key] = v));
    st.file = null;
    st.fileSay = {text: `Filled in from ${f.fileName}${filled ? `, with ${filled === 1 ? "one" : filled} of ${f.type}'s built-in values` : ""}. Check it, then press SAVE to add the kettle.`};
    render();
    if (nameBox) nameBox.value = String(dr.name ?? "");
    return;
  }
  f.busy = "load"; f.error = null;
  render();
  try {
    const out = await kettleapi.loadFile(f.id, f.text, f.plan.token, f.fillIn);
    if (g !== gen || !st) return;
    if (out && out.kettle) st.patch[ik("kettle", f.id)] = {rec: asRecord("kettle", out.kettle), until: Date.now() + 5000};
    const n = out && typeof out.changes === "number" ? out.changes : planRows(f).filter(r => r.changes).length;
    st.file = null;
    st.fileSay = {text: n ? `Loaded ${f.fileName} into ${x.name}: ${n} ${n === 1 ? "change" : "changes"}${filled ? `, ${filled === 1 ? "one" : filled} of them ${f.type}'s built-in ${filled === 1 ? "value" : "values"}` : ""}.` : `${x.name} already had everything in ${f.fileName}.`};
    log(`${x.name}: settings loaded from a file`, "confirmed", "ok");
    merge();
  } catch (e) {
    if (g !== gen || !st) return;
    const data = e && e.response && e.response.data;
    f.busy = null;
    if (data && data.reason === "changed") f.stale = true;
    else f.error = fileError(e, "CraftBeerPi couldn't load it.");
  }
  render();
}

/* ---------- input ---------- */
function onClick(e) {
  if (e.target === nameBox) return;
  if (e.target.closest && e.target.closest("#n-name") && nameBox) { e.preventDefault(); nameBox.focus(); return; }
  const t = e.target.closest && e.target.closest("button, a");
  if (!t) { if (st.menu && !e.target.closest(".addm")) { st.menu = false; render(); } return; }
  const d = t.dataset;
  if (t.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if ("save" in d) toast(st.wait === "loading" ? "Waiting for CraftBeerPi to send the item." : st.wait === "missing" ? "There's nothing here to save." : lost() ? "No connection: SAVE sends your changes once CraftBeerPi is back." : invalids().length ? "Fix the entry marked in red first: it needs a number." : "Nothing has changed yet.");
    else if ("undoall" in d) toast(st.saving ? "Saving: UNDO is back once CraftBeerPi answers." : "Nothing to undo.");
    else if ("sw" in d) toast(PAUSED);
    else if ("del" in d) toast("Not now: the line under it says why.");
    else if ("fileSave" in d || "fileLoad" in d) toast(st.fileBusy ? "Waiting for CraftBeerPi." : $("#kettle-file-help").textContent);
    else if ("fileConfirm" in d || "fileFill" in d || "fileUnfill" in d) toast(st.file && st.file.stale ? "LOOK AGAIN first: the kettle has changed since this preview." : st.file && !st.file.isNew && find("kettle", st.file.id)?.auto ? "Switch the kettle's AUTO off first." : st.file && st.file.busy ? "Waiting for CraftBeerPi." : "Nothing to load: it already has everything in this file.");
    else if ("fileRow" in d) toast(lost() ? "No connection: the file is made from what CraftBeerPi has." : "Save or undo the changes on this kettle first: the file holds the kettle as it was last saved.");
    return;
  }
  if ("fer" in d) { e.preventDefault(); return fermenters(); }
  if (d.open) { e.preventDefault(); return open(d.open); }
  if (d.hit) { const [k, f] = d.hit.split("|"); return open(k, f); }
  if ("home" in d) return home();
  if (d.sw) { e.preventDefault(); e.stopPropagation(); return toggle(d.sw); }
  if (d.set !== undefined && d.f) return setDraft(d.f, d.set);
  if (d.undo) return undo(d.undo);
  if ("undoall" in d) return undoAll();
  if ("save" in d) return save();
  /* TRY AGAIN sends what was sent before: the question about empty settings was answered then */
  if (d.retry) { Object.keys(st.row).filter(k => st.row[k].s === "bad").forEach(k => delete st.row[k]); return save("empty"); }
  if ("add" in d) { st.menu = !st.menu; return render(); }
  if (d.new) return addNew(d.new);
  if (d.more) { st.more[d.more] = !st.more[d.more]; const s = d.more.replace(/\W/g, "-"); $("#m-" + s).hidden = !st.more[d.more]; t.textContent = st.more[d.more] ? "Less" : "More"; t.setAttribute("aria-expanded", st.more[d.more]); return; }
  if ("del" in d) {
    if (isNew(st.open)) return deleteNow(st.open);
    st.del = st.open; render(); const a = $("#ask"); if (a) { a.scrollIntoView({block: "center"}); a.focus(); } return;
  }
  if ("delYes" in d) return deleteNow(st.del);
  if ("delNo" in d) { st.del = null; return render(); }
  if (d.leave) {
    const to = st.leave; st.leave = null;
    if (d.leave === "save") return save(null, () => go(to.href));
    if (d.leave === "drop") { undoAll(); return go(to.href); }
    return render();
  }
  if (d.fileRow) return fileSave(d.fileRow, true);
  if ("fileSave" in d) return fileSave(st.open, false);
  if ("fileLoad" in d) { st.fileSay = null; const input = $("#kettle-file-input"); if (input) input.click(); return; }
  if ("fileCancel" in d) { st.file = null; return render(); }
  /* LOOK AGAIN, FILL IN and LEAVE EMPTY each ask CraftBeerPi for the plan again, and the brewer sees it before LOAD */
  if ("fileAgain" in d || "fileFill" in d || "fileUnfill" in d) {
    const f = st.file, fillIn = "fileFill" in d ? true : "fileUnfill" in d ? false : f.fillIn;
    f.busy = "read";
    return filePlan(f.id, f.text, f.fileName, fillIn);
  }
  if ("fileConfirm" in d) return fileLoad();
  if (d.ask) { if (d.ask === "back") { st.ask = null; return render(); } return save(d.ask); }
  if ("fileAll" in d) { st.file.all = !st.file.all; return render(); }
  if ("clear" in d) { st.q = ""; $("#q").value = ""; render(); $("#q").focus(); }
}
function onInput(e) {
  const t = e.target;
  if (t.id === "q") { st.q = t.value; paintChrome(); $(".clr").hidden = !st.q; return; }
  if (t === nameBox && st.open) return setDraft("name", t.value);
  if (t.dataset && t.dataset.f && t.tagName === "INPUT" && st.open) setDraft(t.dataset.f, t.value);
}
function onChange(e) {
  const t = e.target;
  if (t.id === "kettle-file-input") return fileChosen(t);
  if (t.dataset && t.dataset.f && t.tagName === "SELECT" && st.open) setDraft(t.dataset.f, t.value);
}
function onKey(e) {
  if (e.key === "Escape") { if (st.menu) { st.menu = false; render(); $("[data-add]").focus(); } else if (st.del) { st.del = null; render(); } else if (st.file) { st.file = null; render(); } }
  const r = e.target.closest && e.target.closest('[role="radio"]');
  if (r && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    const all = $$('[role="radio"]', r.parentNode), i = all.indexOf(r), n = all[(i + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? all.length - 1 : 1)) % all.length];
    setDraft(n.dataset.f, n.dataset.set);
    const again = $(`[role="radio"][data-set="${CSS.escape(n.dataset.set)}"][data-f="${CSS.escape(n.dataset.f)}"]`);
    if (again) again.focus();
  }
}
/* pointing at a line, or at a part of the drawing, lights that part */
function onOver(e) { const el = e.target.closest && e.target.closest("[data-hot]"); if (el) hot(el.dataset.hot, true); else if (!(e.target.closest && e.target.closest(".xrig"))) hot(null, false); }
function onFocus(e) { const el = e.target.closest && e.target.closest("[data-hot]"); hot(el ? el.dataset.hot : null, !!el); }
function onDown(e) {
  const p = e.target.closest && e.target.closest(".xrig [data-part]");
  if (!p) return;
  const k = p.getAttribute("data-key");
  if (k && find(...split(k))) open(k);
}
let lastW = 0, lastH = 0;
const onResize = () => { if (window.innerWidth === lastW && window.innerHeight === lastH) return; lastW = window.innerWidth; lastH = window.innerHeight; requestAnimationFrame(drawAll); };
const onFonts = () => requestAnimationFrame(drawAll);

/* ---------- CraftBeerPi's kettles, probes and switches, from the app's data ---------- */
function asRecord(kind, x) {
  const base = {id: x.id, name: x.name == null ? "" : x.name, type: x.type || "", props: {...(x.props || {})}};
  if (kind === "kettle") return {...base, sensor: x.sensor || "", heater: x.heater || "", agitator: x.agitator || "", target_temp: x.target_temp, props_by_type: {...(x.props_by_type || {})}, auto: x.state === true || x.auto === true};
  if (kind === "actor") return {...base, on: x.state === true || x.on === true, power: x.power == null ? 100 : x.power};
  return base;
}
const recSnap = x => JSON.stringify([x.name, x.type, x.props, x.sensor || "", x.heater || "", x.agitator || "", x.target_temp == null ? "" : +x.target_temp]);
/* D, from CraftBeerPi's own lists, what this page has just saved (until CraftBeerPi's lists show it), the switches it
   has just switched, and the new items not saved yet */
function merge() {
  const d = LAST || {}, cfg = k => ((d.config || {})[k] || {}).value;
  const lists = {kettle: d.kettles || [], sensor: d.sensors || [], actor: d.actors || []};
  const now = Date.now(), out = {};
  ["kettle", "sensor", "actor"].forEach(kind => {
    out[kind] = lists[kind].filter(x => x && x.id && !st.gone.has(ik(kind, x.id))).map(x => {
      let r = asRecord(kind, x);
      const p = st.patch[ik(kind, x.id)];
      if (p) { if (now > p.until || recSnap(p.rec) === recSnap(r)) delete st.patch[ik(kind, x.id)]; else r = {...r, ...p.rec}; }
      const e = kind === "actor" && st.expect[x.id];
      if (e) { if (now > e.until || r.on === e.want) delete st.expect[x.id]; else r.on = e.want; }
      return r;
    });
    st.news.filter(n => n.kind === kind).forEach(n => out[kind].push(n.rec));
  });
  D = {brewery: cfg("BREWERY_NAME") || "", unit: cfg("TEMP_UNIT") || "C", mashTun: cfg("MASH_TUN") || "", boilKettle: cfg("BoilKettle") || "",
    kettle: out.kettle, sensor: out.sensor, actor: out.actor, readings: d.sensorData || {}, fermenters: (d.fermenters || []).length};
}
const typesOf = list => Object.fromEntries((list || []).filter(t => t && t.name).map(t => [t.name, Array.isArray(t.properties) ? t.properties : []]));
function live(d) {
  LAST = d;
  const link = d.connected ? "ok" : "lost";
  if (link !== st.link) { st.link = link; if (link === "lost") st.lostAt = hhmm(); }
  if (d.loaded && !st.loaded) st.loaded = true;
  TYPES = {kettle: typesOf(d.logic), sensor: typesOf(d.sensorTypes), actor: typesOf(d.actorTypes)};
  BLANKS = Object.fromEntries((d.logic || []).filter(t => t && t.name).map(t => [t.name, t.blank_defaults && typeof t.blank_defaults === "object" ? t.blank_defaults : {}]));
  const before = D;
  merge();
  if (st.loaded) {
    /* an item deleted on another screen: its changes here can't be saved any more */
    for (const k of Object.keys(st.draft)) {
      const [kind, id] = split(k);
      if (find(kind, id) || st.gone.has(k)) continue;
      const was = ((before && before[kind]) || []).find(x => x.id === id);
      log(`${was ? was.name : `A ${kindWord(kind)}`} deleted on another screen; its changes here are dropped`, "", "");
      delete st.draft[k]; delete st.aside[k];
    }
    if (st.wait === "loading" || st.wait === "missing") {
      const [kind, id] = st.waitFor;
      if (find(kind, id)) { st.wait = null; open(ik(kind, id)); return; }
      st.wait = "missing";
    } else if (st.open && !find(...split(st.open))) {
      const [kind, id] = split(st.open);
      if (st.gone.has(st.open)) { st.open = null; st.view = "index"; }
      else { st.wait = "missing"; st.waitFor = [kind, id]; st.open = null; st.view = "item"; }
    }
  }
  schedule();
}

/* ---------- the page ---------- */
// el: the frame's host for the page (screen.js, page "hardware"). o.frame: the frame (log, say, toast, closeMore).
// o.navigate(path, options): open a page, or change the address.
export function createHardware(el, o = {}) {
  if (st) teardown();
  const myGen = ++gen;
  host = el; env = o; timers = [];
  // the frame's rules go in once and stay: they are scoped to html[data-page=hardware], so they rest while it is off
  if (!document.getElementById("hw-style")) {
    const s = document.createElement("style");
    s.id = "hw-style";
    s.textContent = FRAME_CSS;
    document.head.appendChild(s);
  }
  fresh();
  sr = host.shadowRoot || host.attachShadow({mode: "open"});
  sr.innerHTML = `<style>${HARDWARE_CSS}</style><main class="main" id="main" data-view="index">
    <div class="top" id="top"><div class="tool" id="tool"></div><div class="note" id="note" role="region" aria-label="Waiting for you" hidden></div></div>
    <aside class="idx" id="idx" aria-label="Hardware by vessel"></aside>
    <section class="pane" id="pane" aria-label="The brewhouse, or the item open"><div id="view"></div></section>
    <section class="dock" id="dock" aria-label="The brewhouse drawing">
      <div class="xhd"><h2>Brewhouse</h2><p id="dk-t">Tap a part, or its line above, to open its settings.</p></div>
      <div class="xrig" id="dkrig" data-keep></div>
    </section>
  </main><div class="savebar" id="savebar" hidden></div><input type="file" id="kettle-file-input" accept=".json,application/json" hidden data-kettle-file="input">`;
  nameBox = document.createElement("input");
  nameBox.id = "name";
  nameBox.slot = "name";
  nameBox.autocomplete = "off";
  nameBox.spellcheck = false;
  nameBox.dataset.f = "name";
  host.appendChild(nameBox);
  const on = (t, k, f, x) => { t.addEventListener(k, f, x); off.push(() => t.removeEventListener(k, f, x)); };
  on(sr, "click", onClick);
  on(sr, "input", onInput);
  on(sr, "change", onChange);
  on(sr, "keydown", onKey);
  on(sr, "pointerover", onOver);
  on(sr, "focusin", onFocus);
  on(sr, "pointerdown", onDown);
  on(window, "resize", onResize);
  on(document, "click", onFrameClick, true);
  on(window, "beforeunload", onUnload);
  if (document.fonts && document.fonts.addEventListener) on(document.fonts, "loadingdone", onFonts);
  lastW = window.innerWidth; lastH = window.innerHeight;
  render();
  return {
    update(d) { if (gen === myGen && st && d) live(d); },
    route(r) { if (gen === myGen && st) route(r || {}); },
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
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  const app = host && host.closest(".app");
  if (app) app.removeAttribute("data-dirty");
  if (sr) sr.innerHTML = "";
  if (nameBox) nameBox.remove();
  host = null; sr = null; nameBox = null; st = null; env = {}; D = null; LAST = null;
  gen++;
}
