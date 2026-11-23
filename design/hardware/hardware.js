"use strict";
/* The Hardware page: the brewer's kettles, probes and switches, arranged by vessel in brewhouse order, in the brew-day
   screen's world. On a monitor the list sits on the left; on the right, the brewhouse drawing with a nameplate under
   each vessel, or the item open, its settings as rows (the plain name first, CraftBeerPi's key under it). One SAVE sends
   every change; what saving will switch off is said before it. On a phone the list comes first and an item opens on its
   own. */
const HW = window.CBPI_HW;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
/* a CraftBeerPi name such as Sensor_Stale_Seconds may break after an underscore, not inside a word, in a narrow column */
const brk = s => esc(s).replace(/_/g, "_<wbr>");
const phone = () => matchMedia("(max-width:700px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const calm = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const blankish = v => v == null || String(v).trim() === "";
const same = (a, b) => String(a == null ? "" : a).trim() === String(b == null ? "" : b).trim();
const KINDS = ["kettle", "sensor", "actor"];
const LINKS = [["sensor", "sensor"], ["heater", "actor"], ["agitator", "actor"]];
const ROLE = {sensor: "Probe", heater: "Element", agitator: "Pump"};
const ROLE_OF = {sensor: "probe", heater: "heating element", agitator: "pump"};
const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PAUSED = "No connection. Switches wait until CraftBeerPi is back.";

/* ---------- state ---------- */
let D, st;
function fresh(set) {
  D = JSON.parse(JSON.stringify(HW[set]));
  st = {set, open: null, draft: {}, row: {}, q: "", saving: false, link: "ok", leave: null, del: null, menu: false,
    file: null, fileSay: null, wait: null, view: "index", busy: {}, more: {}, fail: null, adding: 0, aside: {}, ask: null,
    events: [["14:32:05", "Connected to CraftBeerPi", "", ""]]};
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
const now = () => new Date().toTimeString().slice(0, 8);
/* every time of day on the page by CraftBeerPi's CLOCK_FORMAT setting (The Twelve-Hour Rule): "12-hour", the default,
   "2:33:02 PM", or with ?clock=24 "24-hour", "14:33:02". Times are kept 24-hour, as CraftBeerPi keeps them, and
   shown by it; AM or PM is kept with the digits by a no-break space */
const CLOCK24 = new URLSearchParams(location.search).get("clock") === "24";
function todParts(x) {
  const [h, m, s] = String(x).split(":").map(Number), tail = `:${String(m).padStart(2, "0")}${s != null ? `:${String(s).padStart(2, "0")}` : ""}`;
  return CLOCK24 ? {hm: String(h).padStart(2, "0") + tail, ap: ""} : {hm: (h % 12 || 12) + tail, ap: h < 12 ? "AM" : "PM"};
}
const todS = x => { const p = todParts(x); return p.ap ? `${p.hm}\u00a0${p.ap}` : p.hm; };
/* the title bar's clock, CraftBeerPi's, fixed in the demo: the digits, then AM or PM at half their size */
const CLOCK_AT = "14:32";
const clockHTML = () => { const p = todParts(CLOCK_AT); return p.ap ? `${p.hm}\u2009<span class="ap">${p.ap}</span>` : p.hm; };

/* a field's value: as saved, or as changed on this page. Fields are "name", "type", a kettle's links, or "props.<key>" */
function saved(kind, id, f) {
  const x = find(kind, id);
  if (!x || x.fresh) return f === "type" && x ? x.type : "";
  return f.startsWith("props.") ? (x.props || {})[f.slice(6)] : x[f];
}
const drafts = k => st.draft[k] || {};
function val(kind, id, f) {
  const d = drafts(ik(kind, id));
  if (f in d) return d[f];
  /* a kettle's control chosen here starts from the settings it last had on this kettle (CraftBeerPi's props_by_type), or
     none, as a new kettle does: another control's numbers under the same names mean something else. A probe or switch
     keeps the settings two kinds share, such as a switch's GPIO pin, as CraftBeerPi's own forms do */
  if (kind === "kettle" && f.startsWith("props.") && "type" in d && !same(d.type, saved(kind, id, "type"))) {
    const x = find(kind, id), kept = ((x && x.props_by_type) || {})[d.type] || {};
    return f.slice(6) in kept ? kept[f.slice(6)] : "";
  }
  return saved(kind, id, f);
}
const isChanged = (kind, id, f) => { const d = drafts(ik(kind, id)); return f in d && !same(d[f], saved(kind, id, f)); };
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

/* ---------- what each type declares, and what this page calls it (hardware-catalog.js) ---------- */
const typeDefs = (kind, type) => (HW.types[kind] || {})[type] || [];
function propDef(kind, id, f) {
  if (!f.startsWith("props.")) return null;
  return typeDefs(kind, val(kind, id, "type")).find(p => p.label === f.slice(6)) || null;
}
const cat = (kind, type) => (HW_TYPES[kind] || {})[type] || null;
const pick = line => (Array.isArray(line) ? line[F() ? 0 : 1] : line) || "";
const unitText = u => (u === "deg" ? unit() : u || "");
/* what an empty kettle setting means: its control's built-in value in the brewery's units (CraftBeerPi's blank_defaults
   for the control), or what the control does when it's empty (HW_EMPTY); a setting with neither is only empty */
const builtIn = (kind, id, f) => (kind === "kettle" && f.startsWith("props.") ? ((HW.blank_defaults || {})[val(kind, id, "type")] || {})[f.slice(6)] : undefined);
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
function swHTML(id, big) {
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
function partRowHTML(p, n) {
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
  const hits = h.rows.length ? `<ul class="hits">${h.rows.slice(0, 4).map(r => `<li><button type="button" data-hit="${esc(k)}|${esc(r.f)}"><b>${marked(r.n)}</b> ${esc(shown(p.kind, p.id, r.f, val(p.kind, p.id, r.f)))}</button></li>`).join("")}${h.rows.length > 4 ? `<li><button type="button" data-open="${esc(k)}">and ${h.rows.length - 4} more</button></li>` : ""}</ul>` : "";
  const sw = sw0 ? swHTML(p.id) : "";
  return `<li class="hp${p.with ? " ref" : ""}"><a href="#/${p.kind}/${esc(p.id)}" data-open="${esc(k)}" data-hot="${esc(k)}" aria-current="${cur}"><span class="k">${word}</span><span class="t">${marked(x ? nameOf(p.kind, p.id) : "")}${sw0 && chip ? ` ${chip}` : ""}</span><span class="v ${sw0 || chip ? "" : lc}">${sw0 ? pinCol : chip || esc(lv)}</span>${sub || sid ? `<span class="sub">${sub ? `<small>${sub}</small>` : ""}${sid}</span>` : ""}</a>${sw}</li>${hits ? `<li class="hp-hits">${hits}</li>` : ""}`;
}
function groupHTML(g, i) {
  const k = ik("kettle", g.k.id), q = words().length, h = hitsOf("kettle", g.k.id);
  const parts = g.parts.map(p => partRowHTML(p)).join("");
  const none = q && !h.item && !h.rows.length && !parts;
  const [lv] = liveText("kettle", g.k.id), chip = stateChip(k);
  const d = g.k.fresh ? "Not saved yet" : `AUTO runs ${val("kettle", g.k.id, "type") || "nothing yet"} · ${targetText(g.k.target_temp)}`;
  const hits = q && !h.item && h.rows.length ? `<ul class="hits">${h.rows.slice(0, 4).map(r => `<li><button type="button" data-hit="${esc(k)}|${esc(r.f)}"><b>${marked(r.n)}</b> ${esc(shown("kettle", g.k.id, r.f, val("kettle", g.k.id, r.f)))}</button></li>`).join("")}${h.rows.length > 4 ? `<li><button type="button" data-open="${esc(k)}">and ${h.rows.length - 4} more</button></li>` : ""}</ul>` : "";
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
  return `<h1>Hardware</h1><p class="meta" id="meta">${metaHTML()}</p><ol class="hl" id="hl" aria-label="Hardware, by vessel in brewhouse order">${groups.map(groupHTML).join("")}${looseHTML(loose, groups.length + 1)}</ol><a class="fer" href="#/fermenter" data-fer>Fermenters<small>${fer} ›</small></a>`;
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
  if (st.leave) return ["note", `<p><b>Leave Hardware with ${nDirty()} ${nDirty() === 1 ? "change" : "changes"} to ${esc(andList(d.map(k => nameOf(...split(k)))))} not saved?</b></p><div class="acts"><button type="button" class="cmd ans" data-leave="save">Save and go<small>then ${esc(st.leave)}</small></button><button type="button" class="cmd" data-leave="drop">Go without saving<small>drops ${d.length === 1 && nDirty() === 1 ? "it" : "them"}</small></button><button type="button" class="cmd" data-leave="stay">Stay<small>keep changing</small></button></div>`];
  if (lost()) return ["note alarm", `<p><b>No connection to CraftBeerPi.</b> Readings are as they were at ${todS("14:31")}, in grey. Your changes stay on this page until it's back; then SAVE sends them. Switches wait too.</p>`];
  const bad = [...new Set(failed().map(x => x.split("|")[0]))];
  if (bad.length) return ["note alarm", `<p><b>${esc(andList(bad.map(k => nameOf(...split(k)))))} didn't save.</b> CraftBeerPi didn't answer, so it may not have ${bad.length === 1 ? "it" : "them"}. ${bad.length === 1 ? "It's" : "They're"} still on this page; nothing else is affected.</p><div class="acts"><button type="button" class="cmd ans" data-retry="${esc(bad[0])}">Try again<small>send it again</small></button>${st.open === bad[0] ? "" : `<button type="button" class="cmd" data-open="${esc(bad[0])}">Show it<small>${esc(nameOf(...split(bad[0])))}</small></button>`}</div>`];
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
  return `<button type="button" class="${withK ? "ref" : ""}" data-open="${esc(k)}" data-hot="${esc(k)}"><span class="k">${word}</span><span class="t">${esc(x.name)}<small>${sub}</small></span><span class="${lc}">${esc(lv)}</span></button>`;
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
  const alsoP = `<p class="xalso">${also.length ? `Not in the drawing: ${also.join(", ")}${loose.length ? ", which no kettle uses" : ""}. ` : ""}Fermenters are on <a href="#/fermenter" data-fer>their own page</a>.</p>`;
  return `<section class="xr" aria-labelledby="xr-h"><header class="xhd"><h2 id="xr-h">Brewhouse</h2><p>${v ? `<span class="np-on">Tap a part, or its line under the drawing, to open its settings.</span><span class="np-off">Tap a part, or its line in the list, to open its settings.</span>` : "Choose the mash tun and boil kettle in Settings to see them drawn here."}</p></header><div class="xrig" id="xrig"${v ? "" : " hidden"}></div><div class="nps">${nps}</div>${alsoP}</section>`;
}
/* the drawing, at the width of its box as on Brew Day, with a probe drawn into each vessel and every part marked */
function drawRig(box, sel, mini) {
  const v = vessels();
  if (!box || !v) return;
  const w = box.clientWidth, h = box.clientHeight;
  if (!w || !h) return;
  const W = mini ? 1200 : Math.max(1200, Math.round(RIG_H * w / h)), g = rigGeom(W);
  box.innerHTML = rigSVG("line", W, 1, "today");
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
  const at = {"el-hlt": v[0].heater, "el-bk": v[2].heater, "pump-hlt": v[0].agitator, "pump-wort": v[1].agitator};
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
}
function hot(k, on) {
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
  if (kind === "sensor") return `<p class="pv${lost() ? " stale" : ""} num">${esc(numR(id))}${isTemp(id) ? `<span class="u">${unit()}</span>` : ""}</p><p>${lost() ? `as at ${todS("14:31")}` : "reading now"}</p>`;
  if (kind === "actor") { const m = pinMates(id); return `${swHTML(id, true)}<p>${x.on ? `<span class="on">on</span> at ${x.power} %` : "off"} · one tap</p>${m.length ? `<p class="dup">${esc(m.map(a => a.name).join(", "))} uses GPIO ${esc(pinOf(x))} too</p>` : ""}`; }
  const s = x.sensor && find("sensor", x.sensor);
  return `${s ? `<p class="pv${lost() ? " stale" : ""} num">${esc(numR(x.sensor))}${isTemp(x.sensor) ? `<span class="u">${unit()}</span>` : ""}</p>` : ""}<p>${x.auto ? `<span class="on">AUTO on</span>` : "AUTO off"} · ${esc(targetText(x.target_temp))}</p>`;
}
function ctlHTML(kind, id, f) {
  const v = val(kind, id, f), fid = f === "name" ? "name" : "f-" + f.replace(/\W/g, "-"), d = `aria-describedby="w-${f.replace(/\W/g, "-")} s-${f.replace(/\W/g, "-")}"`;
  if (f === "name") return `<input class="fld" id="name" autocomplete="off" spellcheck="false" value="${esc(v)}" data-f="name" ${d}>`;
  if (f === "type") {
    const types = Object.keys(HW.types[kind] || {});
    const c = cat(kind, v);
    return `<select class="fld" id="${fid}" data-f="type" ${d}><option value=""${blankish(v) ? " selected" : ""}>${find(kind, id).fresh ? "Choose one" : "None"}</option>${types.map(t => `<option value="${esc(t)}"${t === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>${c ? `<p class="fx">${esc(c.does)}</p>` : ""}`;
  }
  const linkKind = f === "sensor" ? "sensor" : f === "heater" || f === "agitator" ? "actor" : null;
  const p = propDef(kind, id, f), lk = linkKind || (p && ["sensor", "actor", "kettle", "fermenter"].includes(p.type) ? p.type : null);
  if (lk) {
    const list = lk === "fermenter" ? [] : D[lk].filter(x => !x.fresh && !(lk === kind && x.id === id));
    const live = lk === "sensor" && !blankish(v) && find("sensor", v) ? `<p class="fx">Reads ${esc(fmtR(v))} now.</p>` : "";
    return `<select class="fld" id="${fid}" data-f="${esc(f)}" ${d}><option value=""${blankish(v) ? " selected" : ""}>None</option>${list.map(x => `<option value="${esc(x.id)}"${x.id === v ? " selected" : ""}>${esc(x.name)}</option>`).join("")}${!blankish(v) && !list.some(x => x.id === v) && lk !== "fermenter" ? `<option value="${esc(v)}" selected>An unknown one (${esc(v)})</option>` : ""}</select>${live}`;
  }
  if (p && p.type === "select") {
    const o = (p.options || []).map(String);
    if (o.length && o.length <= 4 && o.every(x => x.length <= 4)) return `<div class="seg" role="radiogroup" aria-labelledby="n-${f.replace(/\W/g, "-")}" ${d}>${o.map((x, i) => { const on = same(x, v), first = i === 0 && !o.some(y => same(y, v)); return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on || first ? 0 : -1}" data-set="${esc(x)}" data-f="${esc(f)}">${esc(x)}</button>`; }).join("")}</div>`;
    const list = o.includes(String(v)) || blankish(v) ? o : [...o, String(v)];
    return `<select class="fld" id="${fid}" data-f="${esc(f)}" ${d}><option value=""${blankish(v) ? " selected" : ""}>${f === "props.Sensor" ? "Choose the probe" : "Empty"}</option>${list.map(x => `<option value="${esc(x)}"${same(x, v) ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  }
  if (p && p.type === "number") {
    const u = unitText(rowMeta(kind, id, f).u);
    /* an empty box says so; the line under the row says what its control uses instead */
    const dflt = ' placeholder="empty"';
    return `<div class="numf"><input id="${fid}" data-f="${esc(f)}" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(v)}"${dflt} ${d}>${u ? `<span aria-hidden="true">${esc(u)}</span>` : ""}</div>`;
  }
  return `<input class="fld" id="${fid}" data-f="${esc(f)}" autocomplete="off" spellcheck="false" value="${esc(v)}" ${d}>`;
}
function stHTML(kind, id, f) {
  const k = ik(kind, id), r = st.row[k + "|" + f] || {}, bad = invalid(kind, id, f);
  if (bad) return ["st no", `<span class="why2">${bad}</span>`];
  if (r.s === "wait") return ["st", "Saving…"];
  if (r.s === "bad") return ["st no", `Didn't save <span class="why2">· ${esc(r.msg)}</span>`];
  if (isChanged(kind, id, f) && !isNew(k)) return ["st", `Changed <span class="was">· was ${esc(shown(kind, id, f, saved(kind, id, f)))}</span><button type="button" class="lnk" data-undo="${esc(f)}">Undo</button>`];
  if (r.s === "ok") return ["st ok", `✓ Saved ${todS(r.at)}`];
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
  const labelled = p && p.type === "select" && (p.options || []).length <= 4 && (p.options || []).every(x => String(x).length <= 4);
  const nm = labelled ? `<p class="nm" id="n-${s}">${marked(r.n)}</p>` : `<label class="nm" id="n-${s}" for="${f === "name" ? "name" : "f-" + s}">${marked(r.n)}</label>`;
  const key = f.startsWith("props.") ? f.slice(6) : f === "type" ? (kind === "kettle" ? "logic" : "type") : f;
  const [cls, html] = stHTML(kind, id, f), k = ik(kind, id), rs = st.row[k + "|" + f] || {};
  const rowCls = ["row", isChanged(kind, id, f) && !isNew(k) ? "chg" : "", rs.s === "wait" ? "wait" : "", rs.s === "bad" ? "bad" : ""].filter(Boolean).join(" ");
  const more = full ? `<button type="button" class="lnk" data-more="${esc(f)}" aria-expanded="${!!st.more[f]}" aria-controls="m-${s}">${st.more[f] ? "Less" : "More"}</button>` : "";
  return `<div class="${rowCls}" id="r-${s}" data-f="${esc(f)}"><div class="lb">${nm}${r.l ? `<p class="wh" id="w-${s}">${marked(r.l)}</p>` : `<span id="w-${s}" hidden></span>`}<p class="ky"><span>${marked(key)}</span>${r.raw ? '<span class="tg">Its plugin\'s words</span>' : ""}${more}</p>${full ? `<p class="full" id="m-${s}"${st.more[f] ? "" : " hidden"}>${esc(full)}</p>` : ""}</div><div class="ct">${ctlHTML(kind, id, f)}<div class="${cls}" id="s-${s}">${html}</div>${(([xc, xt]) => `<p class="${xc}" id="x-${s}" aria-live="polite"${xt ? "" : " hidden"}>${esc(xt)}</p>`)(extraLine(kind, id, f))}</div></div>`;
}
function delHTML(kind, id) {
  const k = ik(kind, id), x = find(kind, id), u = x.fresh ? [] : usesOf(kind, id), w = kindWord(kind);
  const running = kind === "kettle" ? (x.auto ? [x] : []) : u.filter(r => r.auto);
  if (st.del === k) {
    const who = u.length ? u.map((r, i) => `${i ? (i === u.length - 1 ? " and " : ", ") : ""}the ${esc(r.name)} as ${esc(r.how)}`).join("") : "";
    const roles = kind === "kettle" ? [x.id === D.mashTun && "the mash tun", x.id === D.boilKettle && "the boil kettle"].filter(Boolean) : [];
    const what = kind === "kettle" ? `Its probe, element and pump stay in CraftBeerPi${roles.length ? `. Settings chooses it as ${roles.join(" and ")}, which will be blank` : ""}.` : u.length ? `It's used by ${who}. ${u.length === 1 ? "It" : "They"}'ll have none until you choose another.` : `No kettle uses it.`;
    return `<div class="ask" role="group" aria-labelledby="ask-q" tabindex="-1" id="ask"><p id="ask-q"><b>Delete the ${w} ${esc(x.name)}?</b> ${what} This can't be undone.</p><div class="acts"><button type="button" class="cmd del" data-del-yes>Delete ${esc(x.name)}<small>from CraftBeerPi</small></button><button type="button" class="cmd" data-del-no>Keep it<small>change nothing</small></button></div></div>`;
  }
  const why = running.length ? `The ${esc(running[0].name)}'s AUTO is on. Switch it off on Brew Day first.` : lost() ? "No connection." : "";
  return `<div class="row"><div class="lb"><p class="nm">Delete this ${w}</p><p class="wh">${x.fresh ? `Drops it from this page. Nothing has been sent to CraftBeerPi yet.` : `Removes ${esc(x.name)} from CraftBeerPi. It asks first, and says what uses it.`}</p></div><div class="ct"><button type="button" class="cmd del" data-del${why ? ` aria-disabled="true"` : ""}>${x.fresh ? "Drop it" : "Delete…"}<small>${why ? "not now" : x.fresh ? "not saved yet" : "asks first"}</small></button>${why ? `<p class="fx warn">${why}</p>` : ""}</div></div>`;
}
function fileHTML(id) {
  const x = find("kettle", id), unsaved = changedFields(ik("kettle", id)).length > 0, isN = x.fresh;
  const help = isN ? "Fill in this kettle from a kettle's settings file. Once it's saved, it can be saved to a file too." : unsaved ? "Save or undo the changes on this kettle first: the file holds the kettle as it was last saved." : x.auto ? `${esc(x.name)}'s AUTO is on. Switch it off to load a file into it.` : "Keep a copy of this kettle's control, settings and links, or load one back. Loading shows the changes first.";
  const canSave = !isN && !unsaved && !lost(), canLoad = (isN || (!unsaved && !x.auto)) && !lost();
  const say = st.fileSay ? `<p class="say${st.fileSay.no ? " no" : ""}" data-kettle-file="status" role="${st.fileSay.no ? "alert" : "status"}">${esc(st.fileSay.text)}</p>` : "";
  return `<fieldset class="kf" data-kettle-file="group" aria-describedby="kettle-file-help"><legend>Settings file</legend><p id="kettle-file-help">${help}</p><div class="acts"><button type="button" class="cmd" id="kettle-file-save" data-file-save${canSave ? "" : ' aria-disabled="true"'}>Save to file…<small>a copy of it</small></button><button type="button" class="cmd" id="kettle-file-load" data-file-load${canLoad ? "" : ' aria-disabled="true"'}>Load from file…<small>shows the changes first</small></button></div>${say}${st.file && st.file.id === id ? previewHTML(x) : ""}</fieldset>`;
}
/* what loading a file would change, from CraftBeerPi's preview: the lines that change first and alone, the rest a press
   away; nothing is loaded until the button that says what it does is pressed, and there is no default answer.
   A new kettle is filled in from the file instead; a preview the kettle has changed since loads nothing until it is redrawn */
function previewHTML(x) {
  const p = st.file, rows = p.rows, ch = rows.filter(r => r.now !== r.after), visible = p.all ? rows : ch, same2 = rows.length - ch.length;
  const tr = r => `<tr data-row="${esc(r.key)}" data-changes="${r.now !== r.after ? "yes" : "no"}"${r.filled ? ' data-filled="yes"' : ""}><th scope="row">${esc(r.name)}<small>${brk(r.key)}</small></th><td data-side="now"${r.now === "" ? ' class="q"' : ""}>${r.now === "" ? "blank" : brk(r.now)}</td><td data-side="after"${r.now !== r.after ? ' class="after"' : ' class="same"'}>${r.now !== r.after ? brk(r.after) + (r.filled ? `<small>${brk(p.type)}'s built-in value</small>` : "") : "same"}</td></tr>`;
  const vals = p.blank.filter(b => b.value != null), nulls = p.blank.filter(b => b.value == null), filled = rows.filter(r => r.filled);
  const off = p.stale ? ' aria-disabled="true"' : "", nv = vals.length;
  /* what loading leaves empty: what its control uses then, or what empty means; and what was filled in instead */
  const box = vals.length || nulls.length || filled.length ? `<div class="kfz" data-kettle-file="blank"><h4>Empty settings</h4>${filled.length ? `<p>Filled in with ${esc(p.type)}'s built-in ${filled.length === 1 ? "value, shown above as a change" : "values, shown above as changes"}: ${filled.map(r => `<b>${esc(r.name)} ${esc(r.after)}</b>`).join(", ")}. Loading saves ${filled.length === 1 ? "it" : "them"}. <button type="button" class="lnk" data-file-unfill${off}>Leave ${filled.length === 1 ? "it" : "them"} empty</button></p>` : ""}${vals.length ? `<p>Loaded as it is, ${vals.length === 1 ? "this setting stays" : "these settings stay"} empty, and ${esc(p.type)} uses ${vals.length === 1 ? "its built-in value" : "its built-in values"}: ${vals.map(b => `<b>${esc(b.name)} ${esc(valueText("kettle", p.src, b.f, ownText(b.value)))}</b>`).join(", ")}.</p>` : ""}${nulls.length ? `<p class="also">${vals.length || filled.length ? "Also empty" : "Empty"}, and ${esc(p.type)} has no value to fill in: ${nulls.map(b => `${esc(b.name)}${b.empty ? ` (${esc(b.empty)})` : ""}`).join(", ")}.</p>` : ""}</div>` : "";
  const what = p.fill ? `${ch.length} settings` : `${ch.length} ${ch.length === 1 ? "change" : "changes"}`;
  const acts = `<div class="acts"><button type="button" class="cmd" data-file-cancel id="kettle-file-cancel">Cancel<small>loads nothing</small></button>${nv ? `<button type="button" class="cmd" id="kettle-file-fill" data-file-fill${off}>Fill in ${nv === 1 ? "this value" : "these values"}<small>shown as ${nv === 1 ? "a change" : "changes"} first</small></button>` : ""}<button type="button" class="cmd${nv ? "" : " ans"}" id="kettle-file-confirm" data-file-confirm${off}>${p.fill ? "Fill in this kettle" : `Load into ${esc(x.name)}`}<small>${what}${nv ? `; ${nv} left empty` : ""}</small></button></div>`;
  return `<div data-kettle-file="preview"><div class="kfp" role="dialog" aria-labelledby="kettle-file-title" aria-describedby="kettle-file-from"><h3 id="kettle-file-title">${p.fill ? "Fill in this kettle from a file?" : `Load settings into ${esc(x.name)}?`}</h3><p class="from" id="kettle-file-from">From ${esc(p.fileName)}, saved from the kettle ${esc(p.from)} by CraftBeerPi ${esc(p.version)} on ${esc(p.at)}.</p><h4 data-kettle-file="heading">${p.fill ? `${ch.length} settings to fill in` : `${ch.length} ${ch.length === 1 ? "change" : "changes"}`}</h4><table aria-label="What would change"><thead><tr><th scope="col" style="width:40%">Setting</th><th scope="col">Now</th><th scope="col">After loading</th></tr></thead><tbody>${visible.map(tr).join("")}</tbody></table>${same2 ? `<p><button type="button" class="lnk" data-file-all aria-expanded="${!!p.all}">${p.all ? `Hide the ${same2} that stay the same` : `Show the ${same2} that stay the same`}</button></p>` : ""}${p.left.length ? `<h4>Not in the file</h4><ul>${p.left.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}${box}${p.stale ? `<div class="kfe" data-kettle-file="error" role="alert"><p><b>Nothing was loaded: ${esc(x.name)} has changed since this preview.</b> It was changed on another screen. LOOK AGAIN shows what loading would change now.</p><button type="button" class="cmd ans" data-file-again>Look again<small>shows the changes now</small></button></div>` : ""}${acts}</div></div>`;
}

function sheetHTML(kind, id) {
  const x = find(kind, id), k = ik(kind, id), part = partOf(k);
  const word = kind === "kettle" ? "Kettle" : kind === "sensor" ? "Probe" : (() => { const u = usesOf("actor", id).find(r => r.role); return u ? ROLE[u.role] : "Switch"; })();
  const ps = partsOf(kind, id).map((p, j) => `<div class="part" role="group" aria-labelledby="p-${j}"><h3 id="p-${j}">${esc(p.h)}${j === 0 && x.type && !x.fresh ? `<span class="pl">${esc(kind === "kettle" ? "" : x.type)}</span>` : ""}</h3>${p.rows.map(r => rowHTML(kind, id, r)).join("")}</div>`);
  const parts = `${ps[0] || ""}${kind === "kettle" ? fileHTML(id) : ""}${ps.slice(1).join("")}`;
  return `<section class="sheet" id="sheet" data-item="${esc(k)}" aria-labelledby="sh-h"><header class="shd"><button type="button" class="back" data-home>‹ All hardware</button>${part ? `<button type="button" class="mini" data-home aria-label="Back to the brewhouse drawing"><span>‹ Brewhouse</span></button>` : ""}<div class="who"><p class="k">${word}${(() => { const w = !x.fresh && wiring(kind, id); return w ? ` · ${esc(w)}` : ""; })()}</p><h2 id="sh-h">${esc(nameOf(kind, id))}</h2><p class="role">${roleLine(kind, id)}</p></div><div class="live">${liveHTML(kind, id)}</div></header>${parts}<div class="part gone" role="group" aria-labelledby="p-del"><h3 id="p-del">Delete</h3>${delHTML(kind, id)}</div></section>`;
}
function waitHTML() {
  const [kind, id] = st.waitFor;
  if (st.wait === "loading") return `<section class="wait-sheet" aria-busy="true"><b>Opening the ${kindWord(kind)}…</b><p>Waiting for CraftBeerPi to send it. SAVE waits too, so nothing blank can be saved over it.</p><div class="ghost"></div><div class="ghost"></div><input class="sr" id="name" value="" readonly tabindex="-1" aria-hidden="true"></section>`;
  return `<section class="wait-sheet"><b>No ${kindWord(kind)} here</b><p>CraftBeerPi has no ${kindWord(kind)} with the address ${esc(id)}. It may have been deleted, or the link is old.</p><div class="acts"><button type="button" class="cmd" data-home>‹ Brewhouse<small>see what there is</small></button></div><input class="sr" id="name" value="" readonly tabindex="-1" aria-hidden="true"></section>`;
}

/* ---------- painting ---------- */
function paintFrame() {
  $("#bname").textContent = D.brewery || "CraftBeerPi";
  $(".brand").toggleAttribute("data-long", (D.brewery || "").length > 24);
  $("#banner").innerHTML = `${ICON_OK}<span class="msg">No alarms</span>`;
  $("#app").dataset.link = st.link;
  $("#link").dataset.link = st.link;
  $("#link-t").textContent = lost() ? "No connection" : "Connected";
  /* "true" exactly: an empty aria-disabled counts as available, to the greyed look, a tap and a screen reader */
  if (lost()) $("#alloff").setAttribute("aria-disabled", "true"); else $("#alloff").removeAttribute("aria-disabled");
  const e = st.events[0];
  $("#event").innerHTML = `<p class="line"><time>${esc(todS(e[0]))}</time>${esc(e[1])}${e[2] ? ` <span class="res ${e[3]}">${esc(e[2])}</span>` : ""}</p><button type="button" class="logbtn" aria-label="Show the event log">LOG</button>`;
}
function paintChrome() {
  $("#idx").innerHTML = idxHTML();
  const b = $("#btns");
  if (b) b.innerHTML = btnsHTML(); else $("#tool").innerHTML = toolHTML();
  const n = noteHTML(), note = $("#note");
  note.hidden = !n;
  if (n) { note.className = n[0]; note.innerHTML = n[1]; }
  const sb = $("#savebar"), d = nDirty();
  sb.hidden = !(d || st.saving);
  const fx = effects().length;
  sb.innerHTML = d || st.saving ? `<p>${st.saving ? "Saving…" : `${d} ${d === 1 ? "change" : "changes"} not saved${fx ? `<small>Saving switches ${fx === 1 ? "one thing" : fx + " things"} off: see above</small>` : ""}`}</p><button type="button" class="cmd" data-undoall${st.saving ? ' aria-disabled="true"' : ""}>Undo</button><button type="button" class="cmd go${st.saving ? " busy" : ""}" data-save aria-label="Save"${lost() || invalids().length ? ' aria-disabled="true"' : ""}>Save</button>` : "";
  $("#app").toggleAttribute("data-dirty", !!d);
  $("#main").dataset.view = st.view;
  $("#main").toggleAttribute("data-adding", false);
  paintFrame();
}
function paintView() {
  const v = $("#view");
  if (st.wait) v.innerHTML = waitHTML();
  else if (st.open && find(...split(st.open))) v.innerHTML = sheetHTML(...split(st.open));
  else { st.open = null; v.innerHTML = xrHTML(); }
  requestAnimationFrame(drawAll);
}
function drawAll() {
  if (st.open) { const box = $(".mini"); if (box && !phone()) { const sel = partOf(st.open); const keep = $("span", box); drawRig(box, sel, true); if (keep) box.appendChild(keep); } }
  else drawRig($("#xrig"), null, false);
  /* the drawing docked under the list on a tablet: the part open is lit */
  const sel = st.open ? partOf(st.open) : null, t = $("#dk-t");
  drawRig($("#dkrig"), sel, false);
  if (t) t.textContent = !st.open ? "Tap a part, or its line above, to open its settings." : sel ? "The part open above is lit. Tap another to open it." : "What's open above isn't in the drawing: no kettle uses it.";
}
function render() { $("#tool").innerHTML = toolHTML(); paintChrome(); paintView(); }
/* a row repainted in place, so a field being typed in keeps its focus */
function paintRow(f) {
  if (!st.open) return;
  const [kind, id] = split(st.open), s = f.replace(/\W/g, "-"), el = $("#r-" + s);
  if (!el) return;
  const k = st.open, rs = st.row[k + "|" + f] || {}, [cls, html] = stHTML(kind, id, f);
  el.className = ["row", isChanged(kind, id, f) && !isNew(k) ? "chg" : "", rs.s === "wait" ? "wait" : "", rs.s === "bad" ? "bad" : ""].filter(Boolean).join(" ");
  const sEl = $("#s-" + s);
  sEl.className = cls;
  sEl.innerHTML = html;
  const xEl = $("#x-" + s);
  if (xEl) { const [xc, xt] = extraLine(kind, id, f); xEl.className = xc; xEl.textContent = xt; xEl.hidden = !xt; }
}

/* ---------- moving about ---------- */
function open(k, f) {
  const [kind, id] = split(k);
  if (!find(kind, id)) return;
  st.open = k; st.del = null; st.menu = false; st.wait = null;
  if (!st.file || st.file.id !== id) st.file = null;
  st.fileSay = null; st.fileListSay = null;
  st.view = "item";
  render();
  const pane = $("#pane");
  if (f) { const el = $("#r-" + f.replace(/\W/g, "-")); if (el) { el.scrollIntoView({block: "center"}); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); } }
  /* on a phone the item opens at its own top, so its kind and first settings are in view; elsewhere the page goes back
     to the tool row */
  else if (phone()) $("#pane").scrollIntoView({block: "start"});
  else if (!wide()) $("#main").scrollIntoView({block: "start"});
  else pane.scrollTop = 0;
}
function home() {
  const was = st.open;
  st.open = null; st.del = null; st.file = null; st.wait = null; st.view = "index"; render();
  /* on a phone the list comes back at the line just closed */
  const line = was && phone() && $(`#idx [data-open="${CSS.escape(was)}"]`);
  if (line) line.scrollIntoView({block: "center"});
  else if (!wide()) $("#main").scrollIntoView({block: "start"});
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
  if (f === "type") return render();
  paintRow(f);
  paintChrome();
}
function save(how) {
  if (st.saving || st.wait) return;
  if (lost()) return toast("No connection: SAVE sends your changes once CraftBeerPi is back.");
  const ks = dirty();
  if (!ks.length) return toast("Nothing has changed yet: change a setting, then SAVE.");
  if (invalids().length) return toast("Fix the entry marked in red first.");
  /* an empty setting its control fills with a built-in value is named before saving, and the answer is the brewer's */
  const empties = ks.map(k => [k, emptiesOf(k)]).filter(([, e]) => e.length);
  if (empties.length && !how) {
    st.ask = {then: null};
    render();
    const n = $("#note");
    if (n) { n.tabIndex = -1; n.scrollIntoView({block: "nearest"}); n.focus({preventScroll: true}); }
    return "asked";
  }
  if (how === "fill") empties.forEach(([k, e]) => e.forEach(([f, v]) => (st.draft[k][f] = ownText(v))));
  const then = st.ask && st.ask.then;
  st.ask = null;
  if (then) toast(`Saving, then ${then} would open.`);
  /* the demo's failed save fails once: sending it again goes through */
  if (st.fail && failed().some(r => r.startsWith(st.fail + "|"))) st.fail = null;
  st.saving = true;
  ks.forEach(k => (isNew(k) ? ["name"] : changedFields(k)).forEach(f => (st.row[k + "|" + f] = {s: "wait"})));
  render();
  setTimeout(() => { settle(ks); render(); }, 1100);
}
/* CraftBeerPi's answer, as state only; the scenes use it before the page is drawn. A kettle saved while its AUTO runs
   comes back with AUTO off, and a switch saved while on comes back off, as CraftBeerPi does */
function settle(ks, at) {
  at = at || now().slice(0, 5);
  const ok = [], no = [];
  ks.forEach(k => {
    const [kind, id] = split(k), x = find(kind, id), fs = isNew(k) ? Object.keys(drafts(k)) : changedFields(k), oldType = x.type, oldProps = {...(x.props || {})};
    if (k === st.fail) { fs.forEach(f => (st.row[k + "|" + f] = {s: "bad", msg: "CraftBeerPi didn't answer, so it may not have it"})); no.push(k); return; }
    const wasAuto = kind === "kettle" && x.auto, wasOn = kind === "actor" && x.on;
    fs.forEach(f => { if (f.startsWith("props.")) { x.props = x.props || {}; x.props[f.slice(6)] = st.draft[k][f]; } else x[f] = st.draft[k][f]; st.row[k + "|" + f] = {s: "ok", at}; });
    if (kind === "kettle" && "type" in drafts(k) && !same(x.type, oldType)) {
      const kept = (x.props_by_type || {})[x.type] || {}, keep = {};
      typeDefs(kind, x.type).forEach(p => { const key = "props." + p.label; if (key in drafts(k)) keep[p.label] = drafts(k)[key]; else if (p.label in kept) keep[p.label] = kept[p.label]; });
      if (oldType) x.props_by_type = {...(x.props_by_type || {}), [oldType]: oldProps};
      x.props = keep;
    }
    delete st.aside[k];
    delete x.fresh;
    if (wasAuto) x.auto = false;
    if (wasOn) x.on = false;
    delete st.draft[k];
    ok.push([k, wasAuto, wasOn]);
  });
  st.saving = false;
  const nm = k => nameOf(...split(k));
  const off = ok.filter(o => o[1] || o[2]).map(o => `${nm(o[0])}'s ${o[1] ? "AUTO" : "switch"} is off`);
  st.events.unshift(no.length
    ? [now(), `Hardware: ${ok.length ? `${andList(ok.map(o => nm(o[0])))} saved; ` : ""}saving ${andList(no.map(nm))}`, "failed", "bad"]
    : [now(), `Hardware: ${andList(ok.map(o => nm(o[0])))} saved${off.length ? ` · ${off.join(", ")}` : ""}`, "confirmed", "ok"]);
  $("#sr").textContent = no.length ? `${no.length} didn't save` : `${ok.length} saved`;
  return [ok, no];
}
function undo(f) { const k = st.open; if (f === "type" && split(k)[0] === "kettle") { setDraft("type", saved(...split(k), "type")); return; } if (st.draft[k]) delete st.draft[k][f]; if (st.draft[k] && !Object.keys(st.draft[k]).length && !isNew(k)) delete st.draft[k]; delete st.row[k + "|" + f]; if (f === "type") return render(); const el = $("#r-" + f.replace(/\W/g, "-")); if (el) { const [kind, id] = split(k); el.outerHTML = rowHTML(kind, id, rowMeta(kind, id, f)); } paintChrome(); }
function undoAll() {
  if (st.saving) return;
  Object.keys(st.draft).forEach(k => { if (isNew(k)) { const [kind, id] = split(k); D[kind] = D[kind].filter(x => x.id !== id); if (st.open === k) st.open = null; } });
  st.draft = {}; st.aside = {}; st.ask = null;
  Object.keys(st.row).forEach(k => { if (st.row[k].s === "bad") delete st.row[k]; });
  render();
}
function toggle(id) {
  const a = find("actor", id);
  if (!a || st.busy[id]) return;
  if (lost()) return toast(PAUSED);
  st.busy[id] = true;
  render();
  setTimeout(() => {
    delete st.busy[id];
    a.on = !a.on;
    st.events.unshift([now(), `${a.name} switched ${a.on ? "on" : "off"}`, "confirmed", "ok"]);
    render();
  }, 700);
}
function allOff() {
  if (lost()) return toast(PAUSED);
  D.actor.forEach(a => (a.on = false));
  D.kettle.forEach(k => (k.auto = false));
  st.events.unshift([now(), "ALL OFF: every switch and AUTO off", "confirmed", "ok"]);
  render();
}
function addNew(kind) {
  st.adding += 1;
  const id = `new-${kind}-${st.adding}`, type = kind === "kettle" ? "" : kind === "sensor" ? "OneWire" : "GPIOActor";
  const x = {id, name: "", type, props: {}, fresh: true};
  if (kind === "kettle") Object.assign(x, {sensor: "", heater: "", agitator: "", target_temp: 0, auto: false});
  if (kind === "actor") Object.assign(x, {on: false, power: 100});
  D[kind].push(x);
  st.draft[ik(kind, id)] = {type};
  st.menu = false;
  open(ik(kind, id));
  const n = $("#name");
  if (n) n.focus();
}
function deleteNow(k) {
  const [kind, id] = split(k), x = find(kind, id);
  D[kind] = D[kind].filter(y => y.id !== id);
  if (!x.fresh) {
    D.kettle.forEach(kk => { LINKS.forEach(([f, kd]) => { if (kd === kind && kk[f] === id) kk[f] = ""; }); typeDefs("kettle", kk.type).forEach(p => { if (p.type === kind && same((kk.props || {})[p.label], id)) kk.props[p.label] = ""; }); });
    if (kind === "kettle") { if (D.mashTun === id) D.mashTun = ""; if (D.boilKettle === id) D.boilKettle = ""; }
    st.events.unshift([now(), `${x.name} deleted`, "confirmed", "ok"]);
  }
  delete st.draft[k];
  home();
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 4000);
}

/* ---------- a kettle's settings file (the mockup's own: no file is read or written) ---------- */
/* the mockup's file is one saved from the Mash Tun, whose P was 2; a new kettle is filled in from it. Planned with
   fillIn, each setting loading would leave empty is filled with its control's built-in value and shows as a change, as
   CraftBeerPi's preview with fill=1 does; a linked setting is never filled */
function filePlan(x, fillIn) {
  const fill = !!x.fresh, src = fill ? D.kettle.find(k => k.name === "Mash Tun" && !k.fresh) || x : x, p = src.props || {};
  const own = (HW.blank_defaults || {})[src.type] || {}, linkTypes = ["sensor", "actor", "kettle", "fermenter"], blank = [];
  const rows = [{key: "logic", name: "AUTO control", now: fill ? "" : x.type, after: src.type}];
  LINKS.forEach(([f]) => { const nm = (find(f === "sensor" ? "sensor" : "actor", src[f]) || {}).name || ""; rows.push({key: f, name: ROLE[f] === "Element" ? "Heating element" : ROLE[f], now: fill ? "" : nm, after: nm}); });
  partsOf("kettle", src.id).slice(1).flatMap(q => q.rows).forEach(r => {
    const key = r.f.slice(6), v = r.f === "props.P" ? "2" : p[key], def = propDef("kettle", src.id, r.f);
    const row = {key, name: r.n, now: fill || blankish(p[key]) ? "" : shown("kettle", src.id, r.f, p[key]), after: blankish(v) ? "" : shown("kettle", src.id, r.f, v)};
    if (blankish(v) && !(def && linkTypes.includes(def.type))) {
      if (fillIn && own[key] != null) Object.assign(row, {after: shown("kettle", src.id, r.f, ownText(own[key])), filled: true, value: ownText(own[key])});
      else blank.push({key, name: r.n, f: r.f, value: own[key] != null ? own[key] : null, empty: HW_EMPTY[key] || ""});
    }
    rows.push(row);
  });
  return {id: x.id, fill, fillIn: !!fillIn, src: src.id, type: src.type, fileName: `${src.name} settings.json`, from: src.name, version: "4.7.7.post36", at: `15 Nov 2026, ${todS("21:40")}`, rows, blank, all: false, left: []};
}
function loadFile() {
  const k = st.open, [, id] = split(k), x = find("kettle", id), plan = st.file, filled = plan.rows.filter(r => r.filled), nf = filled.length;
  if (plan.fill) {
    /* filling in sends nothing: the new kettle's settings wait on this page for SAVE */
    const src = find("kettle", plan.src), dr = (st.draft[k] = st.draft[k] || {});
    Object.assign(dr, {name: src.name, type: src.type, sensor: src.sensor, heater: src.heater, agitator: src.agitator});
    Object.entries(src.props || {}).forEach(([key, v]) => (dr["props." + key] = key === "P" ? "2" : String(v)));
    filled.forEach(r => (dr["props." + r.key] = r.value));
    st.file = null;
    st.fileSay = {text: `Filled in from ${plan.fileName}${nf ? `, with ${nf === 1 ? "one" : nf} of ${plan.type}'s built-in values` : ""}. Check it, then press SAVE to add the kettle.`};
    return render();
  }
  x.props.P = "2";
  filled.forEach(r => (x.props[r.key] = r.value));
  const n = plan.rows.filter(r => r.now !== r.after).length;
  st.file = null;
  st.fileSay = {text: `Loaded ${x.name} settings.json into ${x.name}: ${n} ${n === 1 ? "change" : "changes"}${nf ? `, ${nf === 1 ? "one" : nf} of them ${plan.type}'s built-in ${nf === 1 ? "value" : "values"}` : ""}.`};
  st.events.unshift([now(), `${x.name}: settings loaded from a file`, "confirmed", "ok"]);
  render();
}

/* ---------- input ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button, a");
  if (!t) { if (st.menu && !e.target.closest(".addm")) { st.menu = false; render(); } return; }
  const d = t.dataset;
  if (t.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if ("save" in d) toast(st.wait === "loading" ? "Waiting for CraftBeerPi to send the item." : st.wait === "missing" ? "There's nothing here to save." : lost() ? "No connection: SAVE sends your changes once CraftBeerPi is back." : invalids().length ? "Fix the entry marked in red first: it needs a number." : "Nothing has changed yet.");
    else if ("sw" in d || t.id === "alloff") toast(PAUSED);
    else if ("undoall" in d) toast(st.saving ? "Saving: UNDO is back once CraftBeerPi answers." : "Nothing to undo.");
    else if ("del" in d) toast("Not now: the line under it says why.");
    else if ("fileSave" in d || "fileLoad" in d) toast($("#kettle-file-help").textContent);
    else if ("fileConfirm" in d || "fileFill" in d || "fileUnfill" in d) toast("LOOK AGAIN first: the kettle has changed since this preview.");
    else if ("fileRow" in d) toast(lost() ? "No connection: the file is made from what CraftBeerPi has." : "Save or undo the changes on this kettle first: the file holds the kettle as it was last saved.");
    return;
  }
  if (d.tab !== undefined && t.closest(".tabs")) {
    e.preventDefault();
    if (d.tab === "Hardware") return;
    if (nDirty()) { st.leave = d.tab; render(); return $("#note").scrollIntoView({block: "nearest"}); }
    return toast(`This mockup has only Hardware; ${d.tab} would open here.`);
  }
  if ("fer" in d) { e.preventDefault(); return nDirty() ? (st.leave = "Fermenters", render(), $("#note").scrollIntoView({block: "nearest"})) : toast("Fermenters open on their own page, as today."); }
  if (d.open) { e.preventDefault(); return open(d.open); }
  if (d.hit) { const [k, f] = d.hit.split("|"); return open(k, f); }
  if ("home" in d) return home();
  if (d.sw) { e.preventDefault(); e.stopPropagation(); return toggle(d.sw); }
  if (t.id === "alloff") return allOff();
  if (d.set !== undefined && d.f) return setDraft(d.f, d.set);
  if (d.undo) return undo(d.undo);
  if ("undoall" in d) return undoAll();
  if ("save" in d) return save();
  /* TRY AGAIN sends what was sent before: the question about empty settings was answered then */
  if (d.retry) { st.fail = null; Object.keys(st.row).filter(k => k.startsWith(d.retry + "|")).forEach(k => delete st.row[k]); return save("empty"); }
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
    if (d.leave === "save") { if (save() === "asked") st.ask.then = to; else toast(`Saving, then ${to} would open.`); return; }
    if (d.leave === "drop") { st.draft = {}; render(); return toast(`Changes dropped; ${to} would open here.`); }
    return render();
  }
  if (d.fileRow) { st.fileListSay = {k: d.fileRow, text: `Saved ${find(...split(d.fileRow)).name} settings.json.`}; return paintChrome(); }
  if ("fileSave" in d) { st.fileSay = {text: `Saved ${find(...split(st.open)).name} settings.json.`}; return render(); }
  if ("fileLoad" in d) { st.file = filePlan(find(...split(st.open))); st.fileSay = null; render(); const c = $("#kettle-file-cancel"); if (c) c.focus(); return; }
  if ("fileCancel" in d) { st.file = null; return render(); }
  /* LOOK AGAIN, FILL IN and LEAVE EMPTY each ask CraftBeerPi for the plan again, and the brewer sees it before LOAD */
  if ("fileAgain" in d || "fileFill" in d || "fileUnfill" in d) { const fillIn = "fileFill" in d ? true : "fileUnfill" in d ? false : st.file.fillIn; st.file = filePlan(find(...split(st.open)), fillIn); render(); const c = $("#kettle-file-cancel"); if (c) c.focus(); return; }
  if ("fileConfirm" in d) return loadFile();
  if (d.ask) { if (d.ask === "back") { st.ask = null; return render(); } return save(d.ask); }
  if ("fileAll" in d) { st.file.all = !st.file.all; return render(); }
  if ("clear" in d) { st.q = ""; $("#q").value = ""; render(); $("#q").focus(); }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "q") { st.q = t.value; paintChrome(); $(".clr").hidden = !st.q; return; }
  if (t.dataset.f && t.tagName === "INPUT" && st.open) setDraft(t.dataset.f, t.value);
});
document.addEventListener("change", e => { const t = e.target; if (t.dataset.f && t.tagName === "SELECT" && st.open) setDraft(t.dataset.f, t.value); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (st.menu) { st.menu = false; render(); $("[data-add]").focus(); } else if (st.del) { st.del = null; render(); } else if (st.file) { st.file = null; render(); } }
  const r = e.target.closest && e.target.closest('[role="radio"]');
  if (r && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    const all = $$('[role="radio"]', r.parentNode), i = all.indexOf(r), n = all[(i + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? all.length - 1 : 1)) % all.length];
    setDraft(n.dataset.f, n.dataset.set);
    const again = $(`[role="radio"][data-set="${CSS.escape(n.dataset.set)}"][data-f="${CSS.escape(n.dataset.f)}"]`);
    if (again) again.focus();
  }
});
/* pointing at a line, or at a part of the drawing, lights that part */
document.addEventListener("pointerover", e => { const el = e.target.closest("[data-hot]"); if (el) hot(el.dataset.hot, true); else if (!e.target.closest(".xrig")) hot(null, false); });
document.addEventListener("focusin", e => { const el = e.target.closest("[data-hot]"); hot(el ? el.dataset.hot : null, !!el); });
document.addEventListener("pointerdown", e => {
  const p = e.target.closest(".xrig [data-part]");
  if (!p) return;
  const k = p.getAttribute("data-key");
  if (k) open(k);
});
let lastW = innerWidth, lastH = innerHeight;
/* the mockup's scene strip wraps on a narrow window; the page fits the window under it */
function fitMock() {
  const m = $("#mock"), root = document.documentElement;
  if (!m || root.classList.contains("bare")) return;
  root.style.removeProperty("--mock-h");
  root.style.setProperty("--mock-h", m.offsetHeight + "px");
}
addEventListener("resize", () => { if (innerWidth === lastW && innerHeight === lastH) return; lastW = innerWidth; lastH = innerHeight; requestAnimationFrame(() => { fitMock(); drawAll(); }); });
document.fonts && document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => requestAnimationFrame(drawAll));

/* ---------- scenes (the strip at the top) ---------- */
const byName = (kind, n) => D[kind].find(x => x.name === n);
const SCENES = {
  open() {},
  rig() { fresh("rig"); },
  kettle() { st.open = ik("kettle", byName("kettle", "Mash Tun").id); },
  probe() { st.open = ik("sensor", byName("sensor", "HLT Temp").id); },
  switch() { st.open = ik("actor", byName("actor", "HLT_HEAT").id); },
  pin() { st.open = ik("actor", byName("actor", "Wort PUMP").id); st.draft[st.open] = {"props.GPIO": "7"}; },
  find() { st.q = "p gain"; },
  changes() { heating(); const h = byName("kettle", "HLT"), m = byName("kettle", "Mash Tun"); st.draft[ik("kettle", h.id)] = {"props.P": "12", "props.I": "0.12"}; st.draft[ik("kettle", m.id)] = {"props.DeltaTemp": "6"}; st.open = ik("kettle", h.id); },
  saved() { SCENES.changes(); const m = byName("kettle", "Mash Tun"); st.fail = ik("kettle", m.id); settle(dirty(), "14:33"); st.events[0][0] = "14:33:02"; st.open = ik("kettle", m.id); },
  delete() { st.open = ik("sensor", byName("sensor", "HLT Temp").id); st.del = st.open; },
  add() { st.adding = 1; const id = "new-sensor-1"; D.sensor.push({id, name: "", type: "OneWire", props: {}, fresh: true}); st.draft[ik("sensor", id)] = {type: "OneWire", name: "Chiller Out", "props.Interval": "5"}; st.open = ik("sensor", id); },
  file() { const m = byName("kettle", "Mash Tun"); m.props.P = 7; st.open = ik("kettle", m.id); st.file = filePlan(m); },
  fillin() { SCENES.file(); st.file = filePlan(find(...split(st.open)), true); },
  stale() { const m = byName("kettle", "Mash Tun"); m.props.P = 5; st.open = ik("kettle", m.id); st.file = filePlan(m); m.props.P = 6; st.file.stale = true; },
  badfile() { st.open = ik("kettle", byName("kettle", "Mash Tun").id); st.fileSay = {no: true, text: "notes.json can't be loaded: it isn't JSON. Choose a settings file that CraftBeerPi saved from a kettle."}; },
  fill() { addNew("kettle"); st.file = filePlan(find(...split(st.open))); },
  empty() { st.open = ik("kettle", byName("kettle", "HLT").id); },
  ask() { const h = byName("kettle", "HLT"); st.open = ik("kettle", h.id); st.draft[st.open] = {"props.P": "12"}; st.ask = {then: null}; },
  leave() { const h = byName("kettle", "HLT"); st.draft[ik("kettle", h.id)] = {"props.P": "12"}; st.open = ik("kettle", h.id); st.leave = "Settings"; },
  waiting() { st.wait = "loading"; st.waitFor = ["sensor", byName("sensor", "HLT Temp").id]; },
  missing() { st.wait = "missing"; st.waitFor = ["kettle", "no-such-record-0000"]; },
  offline() { st.link = "lost"; st.events.unshift(["14:31:48", "Connection to CraftBeerPi lost", "waiting", "wait"]); }
};
/* the HLT heating in AUTO, as on a brew day: its element on, and its probe climbing */
function heating() { const h = byName("kettle", "HLT"); h.auto = true; h.target_temp = 168; const a = find("actor", h.heater); if (a) a.on = true; D.readings[h.sensor] = 152.3; }
function scene() {
  const h = location.hash.slice(1);
  const route = h.match(/^\/(kettle|sensor|actor)\/(.+)$/), adding = h.match(/^\/(kettle|sensor|actor)$/);
  const name = SCENES[h] ? h : "open";
  fresh(["rig", "switch", "pin"].includes(name) ? "rig" : "sim");
  if (route) { if (find(route[1], route[2])) st.open = ik(route[1], route[2]); else { st.wait = "missing"; st.waitFor = [route[1], route[2]]; } }
  else if (adding) addNew(adding[1]);
  else SCENES[name]();
  st.view = st.open || st.wait ? "item" : "index";
  $$("#mock a[href^='#']").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + name && !route && !adding));
  $("#clock").innerHTML = clockHTML();
  render();
  $("#pane").scrollTop = 0;
  if (st.open) { const f = name === "saved" ? "props.DeltaTemp" : name === "changes" || name === "leave" ? "props.P" : name === "pin" ? "props.GPIO" : ""; if (f) { const el = $("#r-" + f.replace(/\W/g, "-")); if (el) el.scrollIntoView({block: "center"}); } }
  if (st.del) { const a = $("#ask"); if (a) a.scrollIntoView({block: "center"}); }
  if (st.file) { const p = $('[data-kettle-file="preview"]'); if (p) p.scrollIntoView({block: "start"}); }
  if (adding) { const n = $("#name"); if (n) n.focus(); }
}
if (new URLSearchParams(location.search).has("bare")) document.documentElement.classList.add("bare");
addEventListener("hashchange", scene);
fitMock();
scene();
