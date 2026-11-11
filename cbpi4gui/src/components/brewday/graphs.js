// The temperature graphs, one in each faceplate's window (Scott chose option A on 10 Nov 2026: "graphs always
// showing, with a smaller rig drawing"). The approved mockup's graphs.js (design/brewday/graphs.js), made into
// functions of what they draw, so they produce the same pictures:
//   G = {hist, t, span, lost, V, VNAME, U, hhmm, scale, BK}: the history, now, the span shown, whether the connection is
//   lost, the vessels as the faceplates show them, their names, the unit's sign, the clock's format, how fast the
//   brewing clock runs, and for the new BoilPower's boil kettle {from: its boil point, edge: where its targets stop
//   being BOIL, hold: the temperature it holds or null} (else null).
//   hist = {start, steps: [[t, n]], v: {hlt, mt, bk: [[t, PV, SV or null, OUT % or null]]}}, a row every 10 s.
//   t is seconds since local midnight: the demo's clock, or CraftBeerPi's brewing clock (history.js).
// Not here: option B's DRAWING / GRAPHS panel, which Scott turned down, and the mockup's demo history, which is
// demo data (demo.js history()). Temperatures follow the unit: the mockup's thresholds are in °F.

export const GSPANS = [["10", 600, "10 MIN"], ["30", 1800, "30 MIN"], ["day", 0, "DAY"]];
export const GSAY = {"10": "the last 10 minutes", "30": "the last 30 minutes", day: "the brew day so far"};
export const spanStart = G => G.span === "day" ? Math.min(G.hist.start, G.t - 1800) : G.t - GSPANS.find(s => s[0] === G.span)[1];
// how many °F one degree of the unit is: the mockup's limits are in °F
const per = G => G.U === "°C" ? 5 / 9 : 1;

/* ---------- words: what the graph shows (for screen readers) and how long until the target (the faceplate's line) ---------- */
export function graphSummary(G, v) {
  const rows = G.hist.v[v].filter(p => p[0] >= spanStart(G) && p[1] != null);
  if (!rows.length) return `${G.VNAME[v]}: no readings in ${GSAY[G.span]}.`;
  const a = rows[0][1], b = rows[rows.length - 1][1], last = rows[rows.length - 1];
  let lo = Infinity, hi = -Infinity;
  rows.forEach(p => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
  const how = Math.abs(b - a) < 1 * per(G) ? `held between ${lo.toFixed(1)} and ${hi.toFixed(1)} ${G.U}` : `${b > a ? "rose" : "fell"} from ${a.toFixed(1)} to ${b.toFixed(1)} ${G.U}`;
  /* the new boil kettle (G.BK): a target below BOIL is held, like the HLT's; at BOIL the boil counts from the boil point */
  const B = v === "bk" && G.BK;
  const tgt = B ? (last[2] == null ? "" : last[2] < B.edge ? `; target ${last[2].toFixed(1)} ${G.U}` : `; the boil counts from ${B.from.toFixed(1)} ${G.U}`)
    : last[2] != null ? `; target ${last[2].toFixed(1)} ${G.U}` : "";
  return `${G.VNAME[v]}, ${GSAY[G.span]}: ${how}${tgt}${last[3] != null ? `; element ${last[3]} %` : ""}.`;
}
/* from the last three minutes of readings; only while heading for the target, and only up to two hours away. The new boil
   kettle heads for its hold, or for the boil point while its target is BOIL */
export function graphETA(G, v) {
  const V = G.V[v], T = v === "bk" && G.BK ? G.BK.hold ?? G.BK.from : V.sv;
  if (!G.hist || T == null || V.pv == null) return "";
  const d = T - V.pv;
  if (Math.abs(d) < 1 * per(G)) return "";
  const rows = G.hist.v[v].filter(p => p[0] >= G.t - 180 && p[1] != null);
  if (rows.length < 2 || rows[rows.length - 1][0] - rows[0][0] < 90) return "";
  const rate = (rows[rows.length - 1][1] - rows[0][1]) / (rows[rows.length - 1][0] - rows[0][0]) * 60;
  if (Math.sign(rate) !== Math.sign(d) || Math.abs(rate) < 0.15 * per(G)) return "";
  const m = Math.abs(d) / Math.abs(rate);
  if (m > 120) return "";
  return m < 1 ? "under a minute at this rate" : `about ${m < 10 ? Math.round(m) : Math.round(m / 5) * 5} min at this rate`;
}

/* ---------- markup and drawing ---------- */
export function graphHTML(G, v, where) {
  const id = `g${where}-${v}`, i = GSPANS.findIndex(s => s[0] === G.span), nx = GSPANS[(i + 1) % GSPANS.length][0];
  return `<div class="graph" data-v="${v}"><button type="button" class="gplot" data-cmd="gspan:next:${v}${where}" aria-label="${G.VNAME[v]} temperature graph, ${GSAY[G.span]}. Press for ${GSAY[nx]}." aria-describedby="${id}-s"><span class="gsvg" id="${id}"></span></button>`
    + `<span class="gspans" aria-hidden="true">${GSPANS.map(s => `<span data-cmd="gspan:${s[0]}:${v}${where}"${s[0] === G.span ? ' class="on"' : ""}>${s[2]}</span>`).join("")}</span>`
    + `<span class="sr" id="${id}-s">${graphSummary(G, v)}</span></div>`;
}
export function graphSVG(G, v, w, h, id, tw = w) {
  const H = G.hist, t1 = G.t, t0 = spanStart(G), lost = G.lost, f = n => n.toFixed(1);
  /* a short graph (a short screen) drops its time labels and thins its OUT band rather than squeezing the lines */
  const lab = h >= 90 ? 15 : 0, band = h >= 90 ? 11 : 8, yT = 3, yO = h - lab - 2, yB = yO - band - 4;
  /* the rows in view, one before for the line's start, thinned to about one per pixel for the long spans */
  const all = H.v[v];
  let i0 = 0;
  while (i0 < all.length && all[i0][0] < t0) i0++;
  let pts = all.slice(Math.max(0, i0 - 1));
  const stride = Math.max(1, Math.floor(pts.length / w)), gapAfter = 10 * stride + 25;
  if (stride > 1) pts = pts.filter((p, i) => i % stride === 0 || i === pts.length - 1);
  /* the new boil kettle (G.BK): a target at BOIL is drawn at the boil point, a grey dashed reference, since BoilPower never
     holds it; a target below BOIL is held, so it is the green line, as on the HLT */
  const pw = v === "bk" && !!G.BK, edge = pw ? G.BK.edge : 0;
  const svOf = p => pw ? (p[2] != null && p[2] >= edge ? G.BK.from : null) : p[2];
  const hoOf = p => pw && p[2] != null && p[2] > 0 && p[2] < edge ? p[2] : null;
  /* each vessel gets its own scale, never less than 4, 8 or 20 °F tall */
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) {
    if (p[0] < t0) continue;
    for (const x of [p[1], svOf(p), hoOf(p)]) if (x != null) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  if (lo === Infinity) lo = hi = G.V[v].pv ?? (G.U === "°C" ? 20 : 68);
  const pad = Math.max(0.5, (hi - lo) * 0.08), least = (G.span === "10" ? 4 : G.span === "30" ? 8 : 20) * per(G);
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
    if (lab) tl += `<text x="${f(x)}" y="${h - 3}">${G.hhmm(t)}</text>`;
  }
  for (const [t, n] of H.steps) {
    const x = X(t);
    if (t > t1 || x < 9 || x > w - 9) continue;
    marks += `M${f(x)} ${yT + 15}V${yB}`;
    nums += `<g transform="translate(${f(x)} ${yT})"><rect x="-8" y="0" width="16" height="15" rx="2"/><text y="11.5">${n}</text></g>`;
  }
  /* PV and SV lines (and the new boil kettle's hold), broken where readings stopped; OUT as a stepped band */
  let pv = "", sv = "", ho = "", out = "", pen = false, svOn = false, hoOn = false, outOn = false, prev = -1e9, lastPv = null;
  for (const p of pts) {
    const x = f(X(p[0])), gap = p[0] - prev > gapAfter, s2 = svOf(p), h2 = hoOf(p);
    if (gap || p[1] == null) pen = false;
    if (p[1] != null) { pv += `${pen ? "L" : "M"}${x} ${f(Y(p[1]))}`; pen = true; lastPv = p; }
    if (gap || s2 == null) svOn = false;
    if (s2 != null) { const y = f(Y(s2)); sv += svOn ? `H${x}V${y}` : `M${x} ${y}`; svOn = true; }
    if (gap || h2 == null) hoOn = false;
    if (h2 != null) { const y = f(Y(h2)); ho += hoOn ? `H${x}V${y}` : `M${x} ${y}`; hoOn = true; }
    if ((gap || p[3] == null) && outOn) { out += `V${yO}Z`; outOn = false; }
    if (p[3] != null) { const y = f(yO - p[3] / 100 * band); out += outOn ? `H${x}V${y}` : `M${x} ${yO}V${y}`; outOn = true; }
    prev = p[0];
  }
  if (outOn) out += `H${f(X(prev))}V${yO}Z`;
  // past the newest row by more than a row or two, the readings have stopped: shaded. A fast clock (a simulator's)
  // moves on by G.scale brewing seconds between the screen's rows, so the newest trails by that much more as a matter
  // of course; at the wall clock's speed, as in the mockup, nothing is added.
  const late = 20 + 10 * stride + 2 * Math.max(0, (G.scale || 1) - 1);
  const gapRect = lastPv && t1 - lastPv[0] > late ? `<rect class="g-gap" x="${f(X(lastPv[0]))}" y="${yT}" width="${f(w - X(lastPv[0]))}" height="${f(yB - yT)}"/>` : "";
  const dot = lastPv ? `<circle class="g-dot" cx="${f(X(lastPv[0]))}" cy="${f(Y(lastPv[1]))}" r="3"/>` : "";
  const outLabel = all.some(p => p[3] != null) ? "OUT" : "OUT – –";
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="${lost ? "stale" : ""}" aria-hidden="true" focusable="false">`
    + `<defs><clipPath id="${id}-c"><rect x="0" y="${yT - 3}" width="${w}" height="${yB - yT + 6}"/></clipPath></defs>`
    + `<path class="g-grid" d="${grid}"/>${gapRect}<path class="g-mark" d="${marks}"/>`
    + `<path class="g-base" d="M0 ${yO}H${w}"/>${out ? `<path class="g-out" d="${out}"/>` : ""}<text class="g-bl" x="3" y="${yO - 2}">${outLabel}</text>`
    + `<g clip-path="url(#${id}-c)">${pw ? `<path class="g-ref" d="${sv}"/><path class="g-sv" d="${ho}"/>` : `<path class="g-sv" d="${sv}"/>`}<path class="g-pv" d="${pv}"/></g>${dot}`
    + `<g class="g-gl">${gl}</g><g class="g-tl">${tl}</g><g class="g-mn">${nums}</g></svg>`;
}
