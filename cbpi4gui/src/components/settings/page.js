// The Settings page.
//
// Scott, 11 Nov 2026: "I'd like the settings to be intelligently sorted and presented in groups by function. Right now,
// they are a confusing long list in no particular order". The Settings design agent's mockup, which he approved that day
// (design/settings), is this page: this is its settings.js, the same functions writing the same markup, styled by its own
// stylesheet (settings.css, made from the mockup's by design/settings/port.mjs). The bench's test_ui_settings_identity.py
// compares the two pictures, scene by scene and screen size by screen size. The catalogue, what the page knows about each
// setting and the nine groups, is catalog.js, made from the mockup's tables by the same script.
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
//   says what happened. (The old page's SAVE reloaded at once, so it couldn't show a failure: the design agent's finding.)
//   A number setting is sent as a number.
// - Another screen's save: a change waiting here stays, and its "was" follows the new value; if that screen saved the
//   same value, the change clears, as there's nothing left to save (11 Nov).
// - Leaving by a tab, MORE's list, OPEN SYSTEM or OPEN HARDWARE with changes not saved asks first, in the note at the
//   top; closing or reloading the browser tab can only get the browser's own question.
// - TRY plays the brew-day screen's own alarm (brewday/alarm.js).
import axios from "axios";
import { catalog, G, PLUGIN, PLUGIN_ORDER, ELSEWHERE } from "./catalog";
import * as DEMO from "./demo-data";
import { play, soundOf, burstSeconds } from "../brewday/alarm";
// As text, exactly as written (config-overrides.js): settings.css for the shadow root; settings-frame.css, the mockup's
// .app rules (one screen tall from 620 px, scrolling below 1180 px, room for the phone's save bar), for the document, where
// they apply only while <html> has data-page=settings
import SETTINGS_CSS from "./settings.css";
import FRAME_CSS from "./settings-frame.css";

/* how long a save may take before its row says CraftBeerPi didn't answer */
const SAVE_MS = 10000;
const NO_ANSWER = "CraftBeerPi didn't answer, so it may not have it";

/* ---------- the page: one at a time, as the brew-day screen ---------- */
let host = null, sr = null, env = {}, DEMO_MODE = false, gen = 0, timers = [], off = [];
let CFG = {}, TH = {}, M = {}, F = true, st = null, actx = null, tryT = 0;
const $ = (s, r = sr) => r.querySelector(s), $$ = (s, r = sr) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const phone = () => matchMedia("(max-width:700px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const calm = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const later = (fn, ms) => { const g = gen; const t = setTimeout(() => { if (g === gen && st) fn(); }, ms); timers.push(t); return t; };
const fahrenheit = cfg => String((cfg.TEMP_UNIT || {}).v || "C").toUpperCase().startsWith("F");
const toast = msg => env.frame && env.frame.toast(msg);
const say = msg => env.frame && env.frame.say(msg);

/* ---------- state ---------- */
function fresh() {
  st = {saved: {}, draft: {}, row: {}, q: "", cur: null, shown: {}, view: "index", pg: null, leave: null, leaveTo: null,
    link: "ok", lostAt: null, saving: false, later: [], failKey: null, extra: {},
    events: [["14:31:52", "Mash Tun at target, 149.0 °F", "confirmed", "ok"]]};
  for (const k in CFG) st.saved[k] = CFG[k].v;
  // the demo's ?name= is the Brewery name setting too, so its row says the same as the title bar (the mockup's)
  if (DEMO_MODE && env.name != null) st.saved.BREWERY_NAME = env.name;
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
  if (LISTED.includes(t)) return [["", m.blank || "None"], ...(TH[t] || []).map(x => [x[0], x[1]])];
  if (t === "step") return [["", m.blank || "None"], ...(TH.step || []).map(s => [s, s])];
  let o = (c.o || []).map(x => [String(x.value), String(x.label)]);
  if (m.order) o.sort((a, b) => m.order.indexOf(a[0]) - m.order.indexOf(b[0]));
  if (m.lab) o = o.map(([v, l]) => [v, m.lab[v] || l]);
  return o;
}
const shown = (k, v) => {
  if (ctlOf(k) === "secret") return blankish(v) ? "not set" : "another key";
  if (blankish(v)) return ([...LISTED, "step"].includes(typ(k)) ? meta(k).blank || "None" : "blank");
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
${g.see && g.see in all() ? seeHTML(g.see) : ""}${partsOf(g).map((p, j) => `<div class="part"${p.h ? ` role="group" aria-labelledby="p-${g.id}-${j}"` : ""}>${p.h ? `<h3 id="p-${g.id}-${j}">${esc(p.h)}${p.pl ? `<span class="pl">${esc(p.pl)}</span>` : ""}</h3>` : ""}${p.rows.filter(k => k in all()).map(rowHTML).join("")}</div>`).join("")}
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
  say(on ? (total ? `${total} ${total === 1 ? "setting" : "settings"} found` : "Nothing found") : "");
  grow();
  spy();
}
function render() {
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
  if (st.row[k] && st.row[k].s !== "wait") delete st.row[k];
  st.later = st.later.filter(x => x !== k);
  paintRow(k);
  const m = meta(k);
  Object.keys(M).filter(x => (M[x].dep && M[x].dep.on === k) || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (m && !isChanged(k)) delete st.draft[k];
  paintChrome();
}
const now = () => new Date().toTimeString().slice(0, 8);
function save(then) {
  const ks = dirty();
  if (st.saving) return;
  if (st.link === "lost") return toast("No connection: SAVE sends your changes once CraftBeerPi is back.");
  if (!ks.length) return toast("Nothing has changed yet.");
  if (invalids().length) return toast("Fix the entry marked in red first: it needs a number.");
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
  ks.forEach(k => { before[k] = st.saved[k]; sent[k] = typ(k) === "number" && isFinite(Number(String(st.draft[k]).trim())) ? Number(String(st.draft[k]).trim()) : st.draft[k]; });
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
    if ("save" in ds) return toast(st.link === "lost" ? "No connection: SAVE sends your changes once CraftBeerPi is back." : invalids().length ? "Fix the entry marked in red first: it needs a number." : "Nothing has changed yet: change a setting, then SAVE.");
    if ("undoall" in ds) return toast("Nothing to undo.");
    if ("show" in ds) return toast("Nothing is set yet: type the key in the box.");
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
    // one line, as the page's text boxes are now: a pasted line break becomes a space
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
  offline: () => { st.link = "lost"; st.draft.BREWDAY_TIMER_NAMES = CH.BREWDAY_TIMER_NAMES; }
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
function live(d) {
  const cfg = cfgOf(d.config), th = thingsOf(d), link = d.connected ? "ok" : "lost";
  if (!Object.keys(cfg).length) return;
  const first = !Object.keys(CFG).length;
  const keysMoved = first || Object.keys(cfg).sort().join("|") !== Object.keys(CFG).sort().join("|");
  const thMoved = JSON.stringify(th) !== JSON.stringify(TH);
  const prev = CFG;
  CFG = cfg; TH = th;
  if (link !== st.link) { st.link = link; if (link === "lost") st.lostAt = now().slice(0, 5); }
  // CraftBeerPi's own values: another screen's save, or this page's own coming back
  const moved = [];
  for (const k in cfg) {
    if (first) { st.saved[k] = cfg[k].v; continue; }
    if (!(k in prev) || String(prev[k].v) === String(cfg[k].v)) continue;
    st.saved[k] = cfg[k].v;
    const waiting = st.row[k] && st.row[k].s === "wait";
    if (k in st.draft && !waiting && same(k, st.draft[k], cfg[k].v)) { delete st.draft[k]; delete st.row[k]; }
    moved.push(k);
  }
  for (const k of Object.keys(st.saved)) if (!(k in cfg) && !(k in st.extra)) { delete st.saved[k]; delete st.draft[k]; delete st.row[k]; }
  const f = fahrenheit(cfg);
  if (first || keysMoved || f !== F) {
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
    if (!["boil", "cloud", "plugin"].includes(name)) { $("#pane").scrollTop = 0; window.scrollTo(0, 0); }
  } else {
    CFG = {}; TH = {}; F = true; M = catalog(F);
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
  host = null; sr = null; st = null; env = {}; CFG = {}; TH = {};
  gen++;
}
