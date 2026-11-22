/* The Recipe book's two other layouts, one moment each: a recipe open, the same recipe and state as recipes.html#book.
   ?layout=vessel: the steps under the vessel each runs on, beneath Brew Day's brewhouse drawing (rig.js), each vessel's
   steps lined up under it as the faceplates line up on Brew Day. ?layout=sheet: the recipe as a brew sheet, one ruled
   table of steps with the numbers that describe the recipe across its head. The book is the list down the left in
   both. A static page for pictures: nothing here talks to CraftBeerPi and the buttons do nothing. */
"use strict";
(() => {
const D = window.CBPI_RECIPES, CAT = window.CBPI_STEP_CATALOG;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const U = "°" + D.UNIT;
const LAYOUT = new URLSearchParams(location.search).get("layout") === "sheet" ? "sheet" : "vessel";
const OPEN = "YhweWUoDCyYKB887DJ9EXd";

/* ---------- words and numbers, as recipes.js and Brew Day put them ---------- */
const num = v => { if (v === null || v === undefined || String(v).trim() === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const fmt = n => String(Math.round(n * 10) / 10);
const andList = xs => xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const unitText = t => String(t || "").replace(/(\d)\s*°?\s*([FC])\b(?![\w'])/g, (m, d, c) => `°${c}` === U ? `${d} ${U}` : m);
const kindName = t => (CAT.KINDS[t] || {}).n || t;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateWords = ep => { const d = new Date(ep * 1000); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const AMOUNT = /^(\d+(?:[.,]\d+)?)\s*(oz|g|gr|kg|lbs?|ml|l|tsp|tbsp|pkg|packs?|tablets?|items?|x)?\.?(?=\s|$)\s*(.*)$/i;
function splitAddition(text) { const s = String(text ?? "").trim(), m = AMOUNT.exec(s); return m ? [m[3].trim(), m[2] ? `${m[1]} ${m[2]}` : m[1]] : [s, ""]; }
function additions(p) {
  const out = [];
  if (p.First_Wort === "Yes") { const [n, a] = splitAddition(p.First_Wort_text); out.push(["First wort", n || "First-wort hops", a]); }
  for (let i = 1; i <= 6; i++) { const t = num(p[`Hop_${i}`]); if (t == null) continue; const [n, a] = splitAddition(p[`Hop_${i}_text`]); out.push([t, n || `Hop ${i}`, a]); }
  return out;
}
const tempOf = s => num((s.props || {}).Temp), minOf = s => { const t = num((s.props || {}).Timer); return t ? t : null; };
function stepView(s) {
  const temp = tempOf(s), t = minOf(s), p = s.props || {}, v = {n: s.name || kindName(s.type)};
  v.p = [temp != null ? `${s.type === "SpargeStep" ? "water " : ""}${fmt(temp)} ${U}` : "", t ? `${fmt(t)} min` : ""].filter(Boolean).join(" · ");
  if (s.type === "MashInStep") v.note = temp != null ? `Add the malt when it reaches ${fmt(temp)} ${U}` : "Add the malt when it is up to temperature";
  else if (s.type === "NotificationStep" && p.Notification) v.note = unitText(p.Notification);
  if (s.type === "BoilStep") { const a = additions(p); if (a.length) v.adds = a; }
  return v;
}
function mashTemps(steps) { const m = []; for (const s of steps) { const t = tempOf(s); if (/^Mash(In)?Step$/.test(s.type) && t != null && !m.includes(t)) m.push(t); } return m; }
const boilMin = steps => { const b = steps.find(s => s.type === "BoilStep"); return b ? num(b.props.Timer) : null; };
function bookLine(steps) {
  const m = mashTemps(steps).map(fmt), b = boilMin(steps), parts = [`${steps.length} step${steps.length === 1 ? "" : "s"}`];
  if (m.length) parts.push(`mash ${andList(m)} ${U}`);
  if (b) parts.push(`${fmt(b)} min boil`);
  return parts.join(" · ");
}
/* which vessel a step runs on, by its kettle: the mash tun and boil kettle Settings names, and the HLT */
const C = D.CONFIG;
const vesselOf = s => { const k = (s.props || {}).Kettle || (s.props || {}).Heat_Kettle; return k === C.MASH_TUN ? "mt" : k === C.BoilKettle ? "bk" : k ? "hlt" : "any"; };
const VNAME = {hlt: "Hot liquor tank", mt: "Mash tun", bk: "Boil kettle", any: "No vessel"};
const kettleName = id => (D.KETTLES.find(k => k.id === id) || {}).name || "–";

const BOOK = [...D.BOOK].sort((p, q) => q.modified - p.modified || p.name.localeCompare(q.name));
const R = BOOK.find(r => r.file === OPEN);

/* ---------- the book, down the left ---------- */
const cmd = (label, small, cls = "") => `<button type="button" class="cmd${cls ? " " + cls : ""}">${label}${small ? `<small>${small}</small>` : ""}</button>`;
function bookHTML() {
  const rows = BOOK.map(r => {
    const on = r.file === OPEN;
    const act = on ? `<p class="lch" data-s="ready"><span class="on">On Brew day</span><span class="lm"><i aria-hidden="true"></i>READY TO START</span><span class="st2">STEP 1 OF 8</span></p>` : cmd("LOAD", "");
    return `<li class="bl"${on ? ' aria-current="true"' : ""}><span class="bn">${esc(r.name)}</span><span class="bd">${esc(bookLine(r.steps))}</span>${act}</li>`;
  }).join("");
  return `<aside class="col bcol" aria-label="Recipe book">
    <div class="find mini"><label for="q">Find a recipe</label><input id="q" type="search" autocomplete="off"></div>
    <div class="two">${cmd("+ NEW", "write one")}${cmd("IMPORT", "a file or Brewfather")}</div>
    <ul class="blist" aria-label="Recipes, newest first">${rows}</ul></aside>`;
}
/* the open recipe's head: its name, where it is, and the column's three buttons */
function headHTML() {
  return `<div class="tool rhead"><a href="#list" class="back">‹ All recipes</a>
    <div class="rh"><h1>${esc(R.name)}</h1><p class="rmeta"><span class="on">On Brew day · ready to start · step 1 of 8</span> · imported from ${esc(R.imported_from)}, ${dateWords(R.modified)}</p></div>
    <div class="rbtns">${cmd("BREW DAY", "start it there")}${cmd("EDIT", "steps and name")}${cmd("COPY", "as a new recipe")}</div></div>`;
}
function stepLi(s, i) {
  const v = stepView(s);
  return `<li class="step"><span class="n">${i + 1}</span><span class="t">${esc(v.n)}</span>${v.p ? `<span class="p">${esc(v.p)}</span>` : ""}${v.note ? `<span class="p">${esc(v.note)}</span>` : ""}<span class="s">${esc(kindName(s.type).toUpperCase())}</span>${v.adds ? `<span class="adds">${v.adds.map(a => `<span>${typeof a[0] === "number" ? `${fmt(a[0])} min` : esc(a[0])}</span><span>${esc(a[1])}</span><span>${esc(a[2])}</span>`).join("")}</span>` : ""}</li>`;
}

/* ---------- by vessel: the drawing, and each vessel's steps under it in the order they run ---------- */
function vesselHTML() {
  const by = {hlt: [], mt: [], bk: [], any: []};
  R.steps.forEach((s, i) => by[vesselOf(s)].push([s, i]));
  const col = v => `<section class="vcol" aria-labelledby="vh-${v}"><h2 id="vh-${v}">${VNAME[v]}<small>${by[v].length} ${by[v].length === 1 ? "step" : "steps"}</small></h2>
    <ol class="steps">${by[v].map(([s, i]) => stepLi(s, i)).join("")}</ol></section>`;
  const order = ["mt", "hlt", "bk"].map(v => by[v].length ? `${by[v].length > 1 ? `${by[v][0][1] + 1} to ${by[v][by[v].length - 1][1] + 1}` : by[v][0][1] + 1} at the ${VNAME[v].toLowerCase()}` : "").filter(Boolean);
  return `<section class="pane" aria-label="The recipe's steps, by vessel"><div class="rigbox" id="rigbox"></div>
    <div class="vcols">${["hlt", "mt", "bk"].map(col).join("")}${by.any.length ? col("any") : ""}</div>
    <p class="vfoot">The numbers are the order the steps run in: ${andList(order)}.</p></section>`;
}
/* Brew Day's drawing, generated wide enough that, drawn at the box's height, it spans the box: each vessel then sits
   over its own column of steps, at a sixth, a half and five sixths of the width */
function drawRig() {
  const box = $("#rigbox");
  if (!box || !box.clientWidth) return;
  const h = box.clientHeight - 8, w = box.clientWidth;
  box.innerHTML = rigSVG("line", w * RIG_H / h, 1.3);
}

/* ---------- the brew sheet: the recipe's numbers across its head, then one ruled table of its steps ---------- */
function sheetHTML() {
  const S = R.steps, m = mashTemps(S), b = boilMin(S), wp = S.find(s => s.type === "WhirlpoolStep");
  const adds = S.filter(s => s.type === "BoilStep").reduce((n, s) => n + additions(s.props).length, 0);
  const nums = [["Steps", S.length], ["Mash", m.length ? `${m.map(fmt).join(", ")} ${U}` : "–"], ["Boil", b ? `${fmt(b)} min` : "–"], ["Additions", adds],
    ["Whirlpool", wp ? `${fmt(tempOf(wp))} ${U} · ${fmt(minOf(wp))} min` : "–"]];
  const rows = S.map((s, i) => {
    const v = stepView(s), t = tempOf(s), mn = minOf(s);
    const say = v.adds ? `<span class="adds">${v.adds.map(a => `<span>${typeof a[0] === "number" ? `${fmt(a[0])} min` : esc(a[0])}</span><span>${esc(a[1])}</span><span>${esc(a[2])}</span>`).join("")}</span>` : esc(v.note || "");
    return `<tr><td class="n" data-l="Step">${i + 1}</td><td class="t" data-l="Name">${esc(v.n)}</td><td class="k" data-l="Kind">${esc(kindName(s.type))}</td><td class="v" data-l="Vessel">${esc(kettleName((s.props || {}).Kettle))}</td>
      <td class="num" data-l="Temp">${t != null ? `${s.type === "SpargeStep" ? "water " : ""}${fmt(t)} ${U}` : "–"}</td><td class="num" data-l="Min">${mn != null ? fmt(mn) : "–"}</td><td class="say" data-l="Says">${say}</td></tr>`;
  }).join("");
  return `<section class="pane" aria-label="The recipe as a brew sheet"><div class="sheet">
    <dl class="nums">${nums.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <table class="bsht"><thead><tr><th scope="col">#</th><th scope="col">Step</th><th scope="col">Kind</th><th scope="col">Vessel</th><th scope="col">Temp</th><th scope="col">Min</th><th scope="col">What it says, and the boil's additions</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="sfoot">Tap any cell to change it in place. SAVE keeps every change at once, as on Settings.</p></div></section>`;
}

const main = $("#main");
main.dataset.alt = LAYOUT;
main.innerHTML = bookHTML() + headHTML() + (LAYOUT === "sheet" ? sheetHTML() : vesselHTML());
document.title = `EBrews - Simulator · Recipe book, ${LAYOUT === "sheet" ? "as a brew sheet" : "by vessel"} (mockup)`;
if (LAYOUT === "vessel") { drawRig(); addEventListener("resize", drawRig); if (document.fonts) document.fonts.ready.then(drawRig); }
})();
