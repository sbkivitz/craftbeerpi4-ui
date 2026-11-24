// The demo's stand-in for CraftBeerPi's strike water helper (GET /step2/strike), for ?demo= only.
//
// The mockup (design/brewday/brew-day.js) carries the bench model's answers for Test Recipe v5 (strike-model.js) and
// works the strike water box's figures out from them in the page. Live, CraftBeerPi works them out and sends them as the
// strike water API's state (the topic "strike"); the screen draws only from that. So the demo makes the same state from
// the mockup's numbers and answers, and the screen draws the demo's moments and CraftBeerPi's alike.
import { SW_MODEL } from "./strike-model";

/* a figure more than this above the rest is too far to trust (MashInStep.MAX_STRIKE_RISE_C, 15 °C), and so is one over
   MashInStep's ceiling, the hottest strike water the box sets (MAX_STRIKE_ABS_C, 82 °C); a room's reading is 35-120 °F,
   as COMPARE PROBES counts one */
const SW_MAX_RISE = 27, SW_CEIL = 179.6, ROOM_LO = 35, ROOM_HI = 120;
/* how long after USE CraftBeerPi takes to work out which unmeasured numbers would raise it most (the levers), in the
   demo, in seconds: eleven more plans, about 40 s on a PC and 3 to 6 minutes on the Pi. USE doesn't wait for them */
export const SW_LEVER_S = 60;
/* BrewStart's Campden dose for v gal of water, in tablets (campden_tablets): one tablet per 20 gal, rounded up to a
   quarter and never under one */
export const campdenTablets = v => Math.max(1, Math.ceil(v / 20 * 4 - 1e-9)) / 4;
/* a grain temperature the forecast can use: a number a room can have. BrewStart's, saved on Brew Steps, can be anything */
const swGrainOk = t => typeof t === "number" && Number.isFinite(t) && t >= ROOM_LO && t <= ROOM_HI;
/* the mash tun's SampleTime as PID_HERMS runs it: from 1 to 60 s as it is set, otherwise its own 5 s. The forecast
   replays its decisions in whole seconds, so it can use any but a fraction from 1 to 60 s */
const swRuns = s => typeof s === "number" && Number.isFinite(s) && s >= 1 && s <= 60 ? s : 5;
const swIntervalOk = s => Number.isInteger(swRuns(s));
/* the guesses, in the design's order (SW_GUESS), and each one's unit as the API names it */
const GUESSES = [["next_min", "min"], ["tun_share", "share"], ["tun_loss", "W/K"], ["transfer_f", "F"], ["coil_ua", "W/K"],
  ["dough_min", "min"], ["flow", "L/min"], ["grain_c", "cal/g C"], ["hlt_loss", "share"], ["hlt_steel", "kg"], ["probe_lag", "s"]];
/* a vessel's own figures from the Hardware page as CraftBeerPi's forecast takes them (cbpi.strike.vessels): an empty weight
   above 0 at its material's specific heat, stainless steel's 0.12 when it has none, aluminium's 0.22, or with "other"
   its own, above 0 and no more than water's 1; else nothing. The moment's figures are st.vessels, as the mockup keeps
   them */
const HEAT = {stainless_steel: 0.12, aluminium: 0.22};
const figure = n => typeof n === "number" && Number.isFinite(n) ? n : null;
function vesselFigure(v) {
  const w = v ? figure(v.empty_weight) : null, m = v && v.material ? v.material : null;
  const heat = m === "other" ? figure(v.specific_heat) : HEAT[m || "stainless_steel"];
  return w != null && w > 0 && heat != null && heat > 0 && heat <= 1 ? {from: "hardware", empty_weight: w, material: m, specific_heat: heat} : null;
}
/* the state's vessels: where the tun's steel and the HLT's come from, and the figures the model uses. Without the Mash
   Tun's own, the recipe's tun (BeerSmith's) where it has one; without the HLT's own, the guess about its steel */
function strikeVessels(st, F) {
  const none = {from: null, empty_weight: null, material: null, specific_heat: null}, V = st.vessels || {};
  const mt = vesselFigure(V.mt), hlt = vesselFigure(V.hlt);
  return {mt: mt || (F && F.tunLb ? {...none, from: "beersmith", empty_weight: F.tunLb, specific_heat: 0.12} : {...none}),
    hlt: hlt || {...none, from: "guess"}};
}

/* the steps the box works from: BrewStart (bi), the strike water step (si) and the first step on the mash tun (mi), whose
   temperature is the rest. The strike water step is a MashInStep on the HLT where the recipe has one; without one it is
   BrewStart itself with Ready by (BrewStart 1.3.0 heats the HLT and holds the water), so then si is bi */
export function swSteps(S) {
  const bi = S.findIndex(s => s.type === "BrewStart"), hi = S.findIndex(s => s.k === "hlt" && s.type === "MashInStep");
  return {bi, si: hi >= 0 ? hi : bi >= 0 && !S[bi].start ? bi : -1, mi: S.findIndex(s => s.k === "mt")};
}

/* ---------- the model's answers, as the mockup reads them (brew-day.js, swFcOf to swModel) ---------- */
/* a forecast, decoded from its code and kept: the mash's highest from the grain going in to an hour after Next (peak), the
   Mash Tun probe's highest reading from the ask for the malt to Next (reads), and the mash's lowest and highest each
   minute for an hour from the grain going in (lo, hi) */
const swFcs = new Map();
function swFcOf(c) {
  let F = swFcs.get(c);
  if (!F) {
    const n = (i, k) => parseInt(c.substr(i, k), 36), lo = [], hi = [];
    for (let m = 0; m <= 60; m++) { lo.push((n(5 + 2 * m, 2) + 900) / 10); hi.push((n(127 + 2 * m, 2) + 900) / 10); }
    F = {peak: (n(0, 3) + 9000) / 100, reads: (n(3, 2) + 900) / 10, lo, hi};
    swFcs.set(c, F);
  }
  return F;
}
/* forecasts weighted together: [forecast, weight] */
function swMix(parts) {
  const F = {peak: 0, reads: 0, lo: Array(61).fill(0), hi: Array(61).fill(0)};
  parts.forEach(([G, w]) => {
    if (!w) return;
    F.peak += G.peak * w; F.reads += G.reads * w;
    for (let m = 0; m <= 60; m++) { F.lo[m] += G.lo[m] * w; F.hi[m] += G.hi[m] * w; }
  });
  return F;
}
/* where x falls on an axis: the points either side and how far between them, held at the axis's ends */
function swAt(axis, x) {
  if (x <= axis[0]) return [0, 0, 0];
  for (let i = 0; i < axis.length - 1; i++) if (x <= axis[i + 1]) return [i, i + 1, (x - axis[i]) / (axis[i + 1] - axis[i])];
  return [axis.length - 1, axis.length - 1, 0];
}
/* one of the model's points: its forecast for strike water at T, its own at USE, otherwise between the strikes either side */
function swPtFc(P, T, strikes, codes) {
  if (Math.abs(T - P.use) < 0.05) return swFcOf(P.u);
  const [i, j, w] = swAt(strikes, T);
  return swMix([[swFcOf(codes[i]), 1 - w], [swFcOf(codes[j]), w]]);
}
/* the model's answer for grain at g °F and v gal in the HLT, with the mash probe at the coil's outlet ("coil") or the
   tun's ("tun"): USE, rounded down to 0.1 °F and never under the rest; USE if every guess proved to be the middle of its
   range (mid); how far each guess, known at its middle, would raise USE (lv); the HLT's own heat loss there as a share
   of its loss when full (hlt: its range); and the forecast for strike water at any temperature (fc). Between the model's
   points the answer is weighted from the four around it. The tun's outlet has the model's answers for its moment's own
   numbers only (#sw-tunprobe); with other numbers the coil's stand in */
const swModels = new Map();
export function swModel(g, v, probe) {
  const key = `${g}|${v}|${probe}`;
  if (swModels.has(key)) return swModels.get(key);
  const M = SW_MODEL, U = M.tun, nv = M.vols.length;
  const [gi, gj, gw] = swAt(M.grains, g), [vi, vj, vw] = swAt(M.vols, v);
  const pts = [[gi, vi, (1 - gw) * (1 - vw)], [gj, vi, gw * (1 - vw)], [gi, vj, (1 - gw) * vw], [gj, vj, gw * vw]]
    .filter(x => x[2] > 1e-9).map(([a, c, w]) => [M.pts[a * nv + c], w]);
  const sum = f => pts.reduce((s, [P, w]) => s + f(P) * w, 0), near = pts.reduce((x, y) => y[1] > x[1] ? y : x)[0];
  let A;
  if (probe === "tun" && Math.abs(g - U.g) < 0.05 && Math.abs(v - U.v) < 0.05) {
    const at = U.strikes.map((s, i) => [s, U.f[i]]).concat([[U.use, U.u]]).sort((x, y) => x[0] - y[0]);
    A = {use: U.use, mid: U.mid, lv: U.lv, hlt: near.hlt, fc: T => swPtFc({use: NaN}, T, at.map(x => x[0]), at.map(x => x[1]))};
  } else {
    const use = Math.max(M.rest, Math.floor(sum(P => P.ex) * 10 + 1e-9) / 10);
    A = {use, mid: Math.round(sum(P => P.mid) * 10) / 10, lv: near.lv, hlt: near.hlt,
      fc: T => swMix(pts.map(([P, w]) => [Math.abs(T - use) < 0.05 ? swFcOf(P.u) : swPtFc(P, T, M.strikes, P.f), w]))};
  }
  const fcs = new Map(), raw = A.fc;
  A.fc = T => { const k = T.toFixed(2); if (!fcs.has(k)) fcs.set(k, raw(T)); return fcs.get(k); };
  swModels.set(key, A);
  return A;
}
/* the morning's run at the model's middle guesses, 40 s after the strike water reaches the tun (swMorning) */
export const SW_MORNING = SW_MODEL.morning;

/* ---------- the state, as CraftBeerPi's GET /step2/strike sends it ---------- */
/* d, the moment's numbers as the mockup keeps them (its st.sw): the recipe's numbers (from), the HLT's water and the
   grain's temperature given by hand (vol, grain; with BrewStart they are its step's, as is where the grain spent the
   night, where), where the mash probe sits (probe),
   the mash tun's control interval (interval: the rig's 2 s unless the moment sets one), the strike water before the
   first USE (was), the numbers the last answer was worked out from (has), and CraftBeerPi working one out (work: since,
   why) */
const swGal = F => +(F.forGrain + (F.dead || 0)).toFixed(2);
/* the numbers CraftBeerPi works USE out from now, as its answer keeps them; none while one is missing */
export function swNow(st, M) {
  const s = strikeInputs(st, M);
  return !s || s.miss ? null : {grain: s.inputs.grain, vol: s.inputs.vol, probe: s.inputs.probe, room: s.inputs.room};
}
/* an answer holds for numbers within a twentieth of a degree or gallon of its own, and for a room within half a degree */
export const swSameIn = (a, b) => !!a && !!b && a.probe === b.probe && Math.abs(a.grain - b.grain) < 0.05 && Math.abs(a.vol - b.vol) < 0.05 && Math.abs(a.room - b.room) <= 0.5;
function strikeInputs(st, M) {
  const d = st.swd;
  if (!d) return null;
  const S = M.RECIPE.steps, {bi, si, mi} = swSteps(S), F = d.from;
  if (mi < 0) return null;
  const rest = S[mi].temp, planned = si >= 0 ? S[si].temp : st.v.hlt.sv;
  const room = st.v.bk.pv == null ? null : +(st.v.bk.pv - ((st.poff || {}).bk || 0)).toFixed(1);
  const given = bi >= 0 ? S[bi].grain ?? null : d.grain ?? null, vol = bi >= 0 ? S[bi].vol ?? null : d.vol ?? null;
  /* a grain temperature that isn't a number is sent as none (typed null), with miss "grain" */
  const typed = given == null || !Number.isFinite(given) ? null : given;
  const gal = F && F.grainLb && F.forGrain ? swGal(F) : null, interval = d.interval === undefined ? 2 : d.interval;
  let miss = null;
  if (gal == null || rest == null) miss = "recipe";
  else if (!swIntervalOk(interval)) miss = "sample_time";
  else if (room == null) miss = "probe";
  else if (room < ROOM_LO || room > ROOM_HI) miss = "room";
  else if (given != null && !swGrainOk(given)) miss = "grain";
  else if (vol == null || vol < gal) miss = "vol";
  /* BrewStart's Campden dose for its water, while its Campden reminder is on */
  const campden = bi >= 0 && S[bi].campden && vol != null && vol > 0 ? campdenTablets(vol) : null;
  const inputs = {rest, planned: planned ?? null, vol, vol_from: bi >= 0 ? "brewstart" : "brewday", left: vol != null && gal != null ? +(vol - gal).toFixed(2) : null,
    campden, room, room_why: room == null ? "stale" : null, typed, grain: typed ?? room, grain_from: typed != null ? "you" : "probe",
    grain_place: bi >= 0 && (S[bi].where === "garage" || S[bi].where === "indoors") ? S[bi].where : null, probe: d.probe || "coil"};
  return {S, bi, si, mi, F, gal, miss, inputs, sample: swRuns(interval)};
}
/* the recipe's place: "plan" before the strike water is heated, "heat" while the strike water step runs, "moved" once the
   water is in the mash tun; brewing by hand (no strike water step) "moved" once MashIn on the mash tun has started. None
   once the malt is in. A recipe whose first step is the strike water step (no BrewStart in front) is still planning
   until it begins; BrewStart as the strike water step plans until it heats (bsHeat). By hand the screen adds its own
   rule (swShown) */
function strikePhase(st, bi, si, mi) {
  const r = st.recipe;
  if (!r || r.held || r.cur > mi) return null;
  if (si < 0) return r.cur === mi && r.state !== "ready" ? "moved" : "plan";
  return r.cur === mi ? "moved" : (r.cur === si && si !== bi && !(r.state === "ready" && r.cur === 0)) || (r.cur === bi && si === bi && !!r.bsHeat) ? "heat" : "plan";
}
export function strikeState(st, M) {
  const s = strikeInputs(st, M);
  if (!s) return null;
  const d = st.swd, {S, bi, si, mi, F, gal, inputs, sample} = s, phase = strikePhase(st, bi, si, mi);
  /* the HLT's own figures fix the guess about its steel, so it is no longer a guess, nor among the levers */
  const vessels = strikeVessels(st, F), open = ([k]) => !(k === "hlt_steel" && vessels.hlt.from === "hardware");
  let miss = s.miss, answer = null;
  const A = !miss && d.has ? d.has : null;
  if (A) {
    const Mo = swModel(A.grain, A.vol, A.probe), rest = inputs.rest;
    const numbers = {rest, strike_vol: gal, vol: A.vol, vol_from: inputs.vol_from, room: A.room, grain: A.grain, grain_from: inputs.grain_from, probe: A.probe};
    answer = {plan: `demo:${A.grain}|${A.vol}|${A.probe}|${A.room}`, at: d.at ?? st.t, took: 18.4, runs: 230, rule: "no worse", numbers, use: Mo.use,
      rest_peak: Mo.fc(rest).peak, forecasts: [], levers: null, levers_status: "far"};
    if (Mo.use - rest > SW_MAX_RISE || Mo.use > SW_CEIL) miss = "far";
    else {
      /* the strikes the box shows: as planned, USE, BACK TO's (the strike water before the first USE, or the rest), the
         rest, and BeerSmith's */
      const want = [[inputs.planned, "planned"], [Mo.use, "use"], [d.was ?? rest, "back"], [rest, "rest"], [F && F.bs, "beersmith"]];
      for (const [T, why] of want) {
        if (T == null) continue;
        const f = answer.forecasts.find(x => Math.abs(x.strike - T) < 0.05);
        if (f) { f.for.push(why); continue; }
        const G = Mo.fc(T);
        answer.forecasts.push({strike: T, for: [why], searched: true, peak: G.peak, reads: G.reads, lo: G.lo, hi: G.hi});
      }
      /* the levers come SW_LEVER_S after USE (lvAt): until then, still coming */
      if (A.lvAt != null && st.t < A.lvAt) answer.levers_status = "working";
      else {
        const top = GUESSES.filter(open).map(([k]) => [k, Mo.lv[k]]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]);
        const rise = Object.fromEntries(Object.entries(Mo.lv).filter(([k]) => open([k])));
        answer.levers = {rise, top, mid: Mo.mid};
        answer.levers_status = "ready";
      }
    }
  }
  /* each unmeasured number's range; the HLT's own heat loss depends on the water left in it */
  let guesses = null;
  if (!miss || miss === "far") {
    const hlt = swModel(inputs.grain, inputs.vol, inputs.probe).hlt, box = Object.assign({}, SW_MODEL.box, {hlt_loss: [hlt[0], hlt[1], +((hlt[0] + hlt[1]) / 2).toFixed(3)]});
    guesses = GUESSES.filter(open).map(([k, unit]) => Object.assign({name: k, low: box[k][0], high: box[k][1], mid: box[k][2], unit, provenance: "ASSUMED"}, k === "hlt_loss" ? {at: 15.0} : {}));
  }
  const ids = S.map(x => x.id ?? x.n);
  /* CraftBeerPi's work on USE failed for the numbers as they are now (d.failed.for): nothing is offered until one
     changes */
  const failed = d.failed && !A && !d.work && swSameIn(swNow(st, M), d.failed.for) ? {at: d.failed.at, detail: d.failed.detail} : null;
  return {
    version: 1, unit: "F", vol_unit: "gal", mass_unit: "lb", ceiling: SW_CEIL, now: st.t, scale: 1, received: Date.now(),
    recipe: F ? {name: M.RECIPE.name, steps: ids, grain: F.grainLb, strike_vol: gal, for_grain: F.forGrain, dead: F.dead || 0, tun: F.tunLb ?? null, tun_heat: F.tunLb ? 0.12 : null,
      beersmith: F.bs ? {strike: F.bs, grain: F.bsGrain ?? null, tun: F.bsTun ?? null} : null, lacks: []}
      : {name: M.RECIPE.name, steps: ids, grain: null, strike_vol: null, for_grain: null, dead: null, tun: null, tun_heat: null, beersmith: null,
        lacks: ["grain", "water", "tun", "infuse_temp", "grain_temp", "tun_temp"]},
    applies: phase != null, off: phase != null ? null : "malt_in", phase, by: si >= 0 ? "step" : "hand",
    step_ids: {brewstart: bi >= 0 ? ids[bi] : null, strike: si >= 0 ? ids[si] : null, mash_in: ids[mi]},
    inputs, rig: {through_coil: true, still_probe: 0.0}, sample_time: sample, guesses, vessels, miss, was: d.was ?? null,
    working: d.work ? {since: d.work.since, why: d.work.why === "load" ? "recipe" : d.work.why} : null, failed, answer
  };
}
