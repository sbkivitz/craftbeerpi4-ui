"use strict";
/* ---------- temperature graphs: a proposal (9 Nov 2026), off unless the page has ?graphs=face or ?graphs=panel ----------
   Scott: "Can you mock up a way to add temperature graphs to the dashboard? It should be natural looking and not like a
   bolt-on", and tapping a graph should switch between the last 10 minutes, the last 30 minutes and the whole brew day.
   One graph per vessel, in its faceplate's black window and colours: the PV as a red line, the SV as a green line while
   AUTO or the HERMS holds it, and the element's OUT as an orange band along the bottom. Small numbered marks show where
   recipe steps started. Tapping a graph moves all three to the next span, so their time axes stay lined up; tapping a
   span's name goes straight to it.
   face:  each graph sits in its faceplate's window, under PV and SV. The drawing below gets shorter.
   panel: the drawing's panel gets a DRAWING / GRAPHS switch, and the graphs fill it, one under each faceplate.
   A phone has no drawing, so both put the graphs in the faceplates there.
   Extra URL settings for screenshots: span=10|30|day, view=graphs (panel only). */
const GSPANS = [["10", 600, "10 MIN"], ["30", 1800, "30 MIN"], ["day", 0, "DAY"]];
const GSAY = {"10": "the last 10 minutes", "30": "the last 30 minutes", day: "the brew day so far"};
let gSpan = "30", gView = "drawing";
const hms = (h, m, s = 0) => h * 3600 + m * 60 + s;

/* ---------- demo history, made to agree with each moment's events and readings ----------
   The real screen reads CraftBeerPi's own logs instead (BUILD-NOTES). PV keyframes are [time, °F, how it got there:
   l straight, e settling, s smooth, h held]. SV and OUT are runs of [from, to, value]; an OUT of [low, high] hunts
   between the two, as a PID's output does while it holds a temperature. */
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
/* one row every 10 s: [time, PV, SV or null, OUT % or null]. The small wobble fades out at the moment's own time,
   so each line ends on the reading its faceplate shows. */
function gHistory(scene) {
  const d = gDemo(scene), end = d.until || st.t, seed = {hlt: 1.3, mt: 2.9, bk: 4.4};
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

/* ---------- live rows, as the readings arrive (every 10 s; none while the connection is lost) ---------- */
const gDriven = v => st.v[v].mode === "auto" || (v === "hlt" && st.v.mt.mode === "auto");
function gOut(v) {
  const a = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null;
  return a ? (a.on ? a.pct : 0) : null;
}
function graphTick() {
  if (!st.hist || st.t % 10) return;
  if (st.link !== "lost") ["hlt", "mt", "bk"].forEach(v => st.hist.v[v].push([st.t, st.v[v].pv, gDriven(v) && st.v[v].sv != null ? st.v[v].sv : null, gOut(v)]));
  drawGraphs();
}
const gStart = () => gSpan === "day" ? Math.min(st.hist.start, st.t - 1800) : st.t - GSPANS.find(s => s[0] === gSpan)[1];

/* ---------- words: what the graph shows (for screen readers) and how long until the target (the faceplate's line) ---------- */
function graphSummary(v) {
  const rows = st.hist.v[v].filter(p => p[0] >= gStart() && p[1] != null);
  if (!rows.length) return `${VNAME[v]}: no readings in ${GSAY[gSpan]}.`;
  const a = rows[0][1], b = rows[rows.length - 1][1], last = rows[rows.length - 1];
  let lo = Infinity, hi = -Infinity;
  rows.forEach(p => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
  const how = Math.abs(b - a) < 1 ? `held between ${lo.toFixed(1)} and ${hi.toFixed(1)} °F` : `${b > a ? "rose" : "fell"} from ${a.toFixed(1)} to ${b.toFixed(1)} °F`;
  return `${VNAME[v]}, ${GSAY[gSpan]}: ${how}${last[2] != null ? `; target ${last[2].toFixed(1)} °F` : ""}${last[3] != null ? `; element ${last[3]} %` : ""}.`;
}
/* from the last three minutes of readings; only while heading for the target, and only up to two hours away */
function graphETA(v) {
  const V = st.v[v];
  if (!st.hist || V.sv == null || V.pv == null) return "";
  const d = V.sv - V.pv;
  if (Math.abs(d) < 1) return "";
  const rows = st.hist.v[v].filter(p => p[0] >= st.t - 180 && p[1] != null);
  if (rows.length < 2 || rows[rows.length - 1][0] - rows[0][0] < 90) return "";
  const rate = (rows[rows.length - 1][1] - rows[0][1]) / (rows[rows.length - 1][0] - rows[0][0]) * 60;
  if (Math.sign(rate) !== Math.sign(d) || Math.abs(rate) < 0.15) return "";
  const m = Math.abs(d) / Math.abs(rate);
  if (m > 120) return "";
  return m < 1 ? "under a minute at this rate" : `about ${m < 10 ? Math.round(m) : Math.round(m / 5) * 5} min at this rate`;
}

/* ---------- markup and drawing ---------- */
function graphHTML(v, where) {
  const id = `g${where}-${v}`, i = GSPANS.findIndex(s => s[0] === gSpan), nx = GSPANS[(i + 1) % GSPANS.length][0];
  return `<div class="graph" data-v="${v}"><button type="button" class="gplot" data-cmd="gspan:next:${v}${where}" aria-label="${VNAME[v]} temperature graph, ${GSAY[gSpan]}. Press for ${GSAY[nx]}." aria-describedby="${id}-s"><span class="gsvg" id="${id}"></span></button>`
    + `<span class="gspans" aria-hidden="true">${GSPANS.map(s => `<span data-cmd="gspan:${s[0]}:${v}${where}"${s[0] === gSpan ? ' class="on"' : ""}>${s[2]}</span>`).join("")}</span>`
    + `<span class="sr" id="${id}-s">${graphSummary(v)}</span></div>`;
}
function graphSVG(v, w, h, id, tw = w) {
  const H = st.hist, t1 = st.t, t0 = gStart(), lost = st.link === "lost", f = n => n.toFixed(1);
  /* a short graph (a short screen) drops its time labels and thins its OUT band rather than squeezing the lines */
  const lab = h >= 90 ? 15 : 0, band = h >= 90 ? 11 : 8, yT = 3, yO = h - lab - 2, yB = yO - band - 4;
  /* the rows in view, one before for the line's start, thinned to about one per pixel for the long spans */
  const all = H.v[v];
  let i0 = 0;
  while (i0 < all.length && all[i0][0] < t0) i0++;
  let pts = all.slice(Math.max(0, i0 - 1));
  const stride = Math.max(1, Math.floor(pts.length / w)), gapAfter = 10 * stride + 25;
  if (stride > 1) pts = pts.filter((p, i) => i % stride === 0 || i === pts.length - 1);
  /* each vessel gets its own scale, never less than 4, 8 or 20 °F tall */
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) {
    if (p[0] < t0) continue;
    for (const x of [p[1], p[2]]) if (x != null) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  if (lo === Infinity) lo = hi = st.v[v].pv ?? 68;
  const pad = Math.max(0.5, (hi - lo) * 0.08), least = gSpan === "10" ? 4 : gSpan === "30" ? 8 : 20;
  lo -= pad; hi += pad;
  if (hi - lo < least) { const c = (hi + lo) / 2; lo = c - least / 2; hi = c + least / 2; }
  const X = t => (t - t0) / (t1 - t0) * w, Y = T => yB - (T - lo) / (hi - lo) * (yB - yT);
  let grid = "", gl = "", tl = "", marks = "", nums = "";
  const gs = [0.5, 1, 2, 5, 10, 20, 25, 50, 100].find(s => (yB - yT) * s / (hi - lo) >= 24) || 100;
  for (let g = Math.ceil(lo / gs) * gs; g <= hi; g += gs) {
    const y = Y(g);
    if (y < yT + 11 || y > yB - 2) continue;
    grid += `M0 ${f(y)}H${w}`;
    gl += `<text x="3" y="${f(y - 3)}">${gs < 1 ? g.toFixed(1) : Math.round(g)}</text>`;
  }
  const tick = [120, 300, 600, 900, 1800, 3600, 7200].find(s => tw * s / (t1 - t0) >= 64) || 7200;
  for (let t = Math.ceil(t0 / tick) * tick; t <= t1; t += tick) {
    const x = X(t);
    if (x < 18 || x > w - 18) continue;
    grid += `M${f(x)} ${yT}V${yB}`;
    if (lab) tl += `<text x="${f(x)}" y="${h - 3}">${hhmm(t)}</text>`;
  }
  for (const [t, n] of H.steps) {
    const x = X(t);
    if (t > t1 || x < 9 || x > w - 9) continue;
    marks += `M${f(x)} ${yT + 15}V${yB}`;
    nums += `<g transform="translate(${f(x)} ${yT})"><rect x="-8" y="0" width="16" height="15" rx="2"/><text y="11.5">${n}</text></g>`;
  }
  /* PV and SV lines, broken where readings stopped; OUT as a stepped band */
  let pv = "", sv = "", out = "", pen = false, svOn = false, outOn = false, prev = -1e9, lastPv = null;
  for (const p of pts) {
    const x = f(X(p[0])), gap = p[0] - prev > gapAfter;
    if (gap || p[1] == null) pen = false;
    if (p[1] != null) { pv += `${pen ? "L" : "M"}${x} ${f(Y(p[1]))}`; pen = true; lastPv = p; }
    if (gap || p[2] == null) svOn = false;
    if (p[2] != null) { const y = f(Y(p[2])); sv += svOn ? `H${x}V${y}` : `M${x} ${y}`; svOn = true; }
    if ((gap || p[3] == null) && outOn) { out += `V${yO}Z`; outOn = false; }
    if (p[3] != null) { const y = f(yO - p[3] / 100 * band); out += outOn ? `H${x}V${y}` : `M${x} ${yO}V${y}`; outOn = true; }
    prev = p[0];
  }
  if (outOn) out += `H${f(X(prev))}V${yO}Z`;
  const gapRect = lastPv && t1 - lastPv[0] > 20 + 10 * stride ? `<rect class="g-gap" x="${f(X(lastPv[0]))}" y="${yT}" width="${f(w - X(lastPv[0]))}" height="${f(yB - yT)}"/>` : "";
  const dot = lastPv ? `<circle class="g-dot" cx="${f(X(lastPv[0]))}" cy="${f(Y(lastPv[1]))}" r="3"/>` : "";
  const outLabel = all.some(p => p[3] != null) ? "OUT" : "OUT – –";
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${lost ? "stale" : ""}" aria-hidden="true" focusable="false">`
    + `<defs><clipPath id="${id}-c"><rect x="0" y="${yT - 3}" width="${w}" height="${yB - yT + 6}"/></clipPath></defs>`
    + `<path class="g-grid" d="${grid}"/>${gapRect}<path class="g-mark" d="${marks}"/>`
    + `<path class="g-base" d="M0 ${yO}H${w}"/>${out ? `<path class="g-out" d="${out}"/>` : ""}<text class="g-bl" x="3" y="${yO - 2}">${outLabel}</text>`
    + `<g clip-path="url(#${id}-c)"><path class="g-sv" d="${sv}"/><path class="g-pv" d="${pv}"/></g>${dot}`
    + `<g class="g-gl">${gl}</g><g class="g-tl">${tl}</g><g class="g-mn">${nums}</g></svg>`;
}
function drawGraphs() {
  if (!st || !st.hist) return;
  const boxes = [...document.querySelectorAll(".graph")].map(g => {
    const box = g.querySelector(".gsvg");
    return { v: g.dataset.v, box, w: Math.floor(box.clientWidth), h: Math.floor(box.clientHeight) };
  }).filter(b => b.w >= 60 && b.h >= 40);
  /* the three show one span, so they share time marks: chosen for the narrowest */
  const tw = Math.min(...boxes.map(b => b.w));
  boxes.forEach(b => { b.box.innerHTML = graphSVG(b.v, b.w, b.h, b.box.id, tw); });
}

/* ---------- the panel option: DRAWING / GRAPHS switch in the drawing's panel ---------- */
function renderGraphPanel() {
  const p = $("#gpanel");
  if (!p) return;
  $("#gview").innerHTML = `<button type="button" data-cmd="gview:drawing" aria-pressed="${gView === "drawing"}">DRAWING</button><button type="button" data-cmd="gview:graphs" aria-pressed="${gView === "graphs"}">GRAPHS</button>`;
  p.hidden = gView !== "graphs";
  $("#rig").hidden = gView === "graphs";
  p.innerHTML = gView !== "graphs" ? "" : `<p class="ghead">Tap a graph for the last 10 minutes, the last 30 or the whole brew day. All three show the same span.</p>`
    + ["hlt", "mt", "bk"].map(v => `<section class="gcol" aria-label="${VNAME[v]} temperature"><div class="gwin">${graphHTML(v, "p")}</div></section>`).join("");
}
function graphCmd(k, x) {
  if (k === "gview") { gView = x; renderAll(); return; }
  const i = GSPANS.findIndex(s => s[0] === gSpan);
  gSpan = x === "next" ? GSPANS[(i + 1) % GSPANS.length][0] : x;
  renderAll();
  say(`Graphs: ${GSAY[gSpan]}`);
}
function graphSetup(qs) {
  if (GSPANS.some(s => s[0] === qs.get("span"))) gSpan = qs.get("span");
  if (GRAPHS === "panel") {
    if (qs.get("view") === "graphs") gView = "graphs";
    $(".brewhouse").insertAdjacentHTML("beforeend", '<div class="gpanel" id="gpanel" hidden></div><div class="gview" id="gview" role="group" aria-label="Show in this panel"></div>');
  }
  new ResizeObserver(() => drawGraphs()).observe($(".brewhouse"));
  /* each graph is drawn to its box, and the boxes change width when the panel's fonts arrive */
  document.fonts.addEventListener("loadingdone", () => drawGraphs());
}
