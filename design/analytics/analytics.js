/* Brewery figures, learned from past brews: the mockup's behaviour. Nothing here talks to CraftBeerPi. The bench's brews
   and figures are measured from its archived logs (analytics-bench.js); the rig's are made up, and say so. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const params = new URLSearchParams(location.search);
  if (params.has("bare")) document.documentElement.classList.add("bare");

  /* ---------------- clock and words ---------------- */
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const Mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const S = { h24: params.get("clock") === "24" };
  const D = (t) => new Date(t * 1000);
  const hm = (t) => {
    const d = D(t), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
    return S.h24 ? `${String(h).padStart(2, "0")}:${m}` : `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
  };
  const tick = (t) => {
    const d = D(t), h = d.getHours(), m = d.getMinutes();
    if (S.h24) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return m === 0 ? `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}` : `${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  };
  const day = (t) => { const d = D(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
  const dayShort = (t) => { const d = D(t); return `${d.getDate()} ${Mon[d.getMonth()]}`; };
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const pct = (x) => Math.round(x * 100);
  const mins = (x) => (x >= 60 ? String(Math.round(x)) : f1(x));
  const deg = "°F";

  /* ---------------- the brews: the bench's, from its logs ---------------- */
  const BENCH = window.BENCH;
  /* the bench's clock in the mockup: Monday night, after its last brew */
  const BENCH_NOW = new Date(2026, 10, 23, 23, 47).getTime() / 1000;
  const WATER = 0.995 * 4181, L_PER_GAL = 3.785411784;
  const simGal = BENCH.sim.hlt_l / L_PER_GAL;
  const benchBrews = BENCH.brews.map((b) => {
    const starts = [b.hlt && b.hlt.t0, b.rests[0] && b.rests[0].near, b.boil && b.boil.t0].filter(Boolean);
    const start = starts.length ? Math.min(...starts) : b.w[0];
    const SHORT = { b20nov: "A rest at 152 °F; boil kettle to 139 °F", b9nov: "Rests at 126, 149, 168 °F; a boil" };
    return Object.assign({}, b, { start, label: SHORT[b.id] || b.what });
  }).sort((a, b) => b.start - a.start);

  /* ---------------- the rig's brews: made up, from the rig's measured HLT and a plausible brew day ---------------- */
  const RIG_W = 5346, RIG_GAL = 15;
  const rigSpec = [
    { id: "r21nov", date: [2026, 10, 21], name: "Rye Pale Ale", rest: 152, eff: 0.87, cold: 60.4, ready: 158, over: 0.2, held: 0.2,
      strike: { lo: 149.6, hi: 152.4, landed: 151.3, fit: 151.2 }, grain: { lb: 13.5, strike: 5.1, sparge: 5.4, pre: 8.6 }, boil: 2.62 },
    { id: "r14nov", date: [2026, 10, 14], name: "Oatmeal Stout", rest: 154, eff: 0.88, cold: 58.0, ready: 160, over: 0.3, held: 0.3,
      strike: { lo: 151.5, hi: 154.3, landed: 152.7, fit: 152.8 }, grain: { lb: 15.0, strike: 5.6, sparge: 5.2, pre: 8.75 }, boil: 2.71 },
    { id: "r1nov", date: [2026, 10, 1], name: "Hefeweizen", rest: 149, eff: 0.86, cold: 61.0, ready: 155, over: 1.1, held: 0.3,
      strike: { lo: 146.4, hi: 149.2, landed: 147.4, fit: 147.6 }, grain: { lb: 11.0, strike: 4.3, sparge: 5.6, pre: 8.25 }, boil: 2.58 },
    { id: "r17oct", date: [2026, 9, 17], name: "House Pale Ale", rest: 149, eff: 0.89, cold: 63.2, ready: 155, over: 1.0, held: 0.2,
      strike: { lo: 146.5, hi: 149.3, landed: 148.2, fit: 148.0 }, grain: { lb: 12.5, strike: 4.8, sparge: 5.5, pre: 8.43 }, boil: 2.66 },
    { id: "r3oct", date: [2026, 9, 3], name: "Brown Ale", rest: 149, eff: 0.87, cold: 64.0, ready: 155, over: 0.9, held: 0.3,
      strike: null, grain: { lb: 14.0, strike: 5.4, sparge: 5.3, pre: 8.83 }, boil: 2.69 },
  ];
  const DEAD = 0.5;
  const noise = (t, k) => 0.06 * Math.sin(t / 97 + k) + 0.04 * Math.sin(t / 23 + 2 * k);
  function rigBrew(s, k) {
    const at = (h, m) => new Date(s.date[0], s.date[1], s.date[2], h, m).getTime() / 1000;
    const readyBy = at(7, 0);
    const J = RIG_GAL * L_PER_GAL * WATER * (s.ready - s.cold) * 5 / 9;
    const planned = J / (RIG_W * 0.9) / 60, took = J / (RIG_W * s.eff) / 60;
    const hStart = readyBy - (planned + 10) * 60, hEnd = hStart + took * 60;
    const move = at(7, 5), dough = at(7, 12), restEnd = dough + 60 * 60, outAt = restEnd + 18 * 60, outEnd = outAt + 10 * 60;
    const spargeEnd = outEnd + 40 * 60, boilFrom = s.boil ? 165.4 : 165, boilAt = spargeEnd + 5 * 60;
    const boilEnd = boilAt + (212 - boilFrom) / s.boil * 60, w0 = hStart - 15 * 60, w1 = boilEnd + 25 * 60;
    const strikeT = s.strike ? s.strike.landed : s.rest - 0.6;
    const hlt = [], mash = [], boil = [];
    for (let t = Math.ceil(w0 / 60) * 60 + 30; t <= w1; t += 60) {
      // the HLT: heating by BrewStart, then held, the strike drawn off, then heated for the mash out and the sparge
      let h;
      if (t < hStart) h = s.cold;
      else if (t < hEnd) { const f = (t - hStart) / (hEnd - hStart); h = s.cold + (s.ready - s.cold) * (f < 0.92 ? f / 0.92 * 0.97 : 0.97 + 0.03 * (f - 0.92) / 0.08); }
      else if (t < dough) h = s.ready + noise(t, k);
      else if (t < restEnd) h = s.rest + 3.2 - 2.4 * Math.min(1, (t - dough) / 1500) + noise(t, k);
      else if (t < outAt) h = Math.min(173, s.rest + 0.8 + (t - restEnd) / 60 * 1.6) + noise(t, k);
      else if (t < spargeEnd) h = 168.6 + noise(t, k);
      else h = 168.6 - (t - spargeEnd) / 60 * 0.05;
      hlt.push([t, +h.toFixed(2)]);
      // the mash tun: the strike water, dough-in, the rest, the mash out and the runoff
      let m;
      if (t < move) m = 61 + (t - w0) / 3600 * 0.6;
      else if (t < dough) m = s.ready - 1.5 - (t - move) / 60 * 0.15;
      else if (t < dough + 4 * 60) m = strikeT - 0.8 + (t - dough) / 240 * 0.8;
      else if (t < dough + 10 * 60) { const f = (t - dough - 240) / 360; m = strikeT + (s.rest - strikeT) * f + s.over * Math.sin(Math.PI * f) * (f > 0.5 ? 1 : 0.4); }
      else if (t < restEnd) m = s.rest + s.held * 0.8 * Math.sin(t / 211 + k) + noise(t, k) * 0.5;
      else if (t < outAt) m = Math.min(168, s.rest + (t - restEnd) / 60 * 0.95);
      else if (t < outEnd) m = 168 + noise(t, k) * 0.5;
      else if (t < spargeEnd) m = 168 - (t - outEnd) / 60 * 0.06;
      else m = 165.6 - (t - spargeEnd) / 60 * 0.12;
      mash.push([t, +m.toFixed(2)]);
      // the boil kettle: the room, the first runnings from the mash out, then the boil
      let b;
      if (t < outEnd + 5 * 60) b = 59 + (t - w0) / 3600 * 0.4;
      else if (t < spargeEnd) b = Math.min(boilFrom, 140 + (t - outEnd) / 60 * 0.9);
      else if (t < boilAt) b = boilFrom;
      else if (t < boilEnd) b = boilFrom + (t - boilAt) / 60 * s.boil * (1 - 0.15 * ((t - boilAt) / (boilEnd - boilAt)) ** 3);
      else b = 211.6 + noise(t, k) * 0.6;
      boil.push([t, +Math.min(212, b).toFixed(2)]);
    }
    const g = s.grain, held = g.strike + g.sparge - g.pre - DEAD;
    return {
      id: s.id, start: hStart, w: [w0, w1], label: s.name, rig: true, spec: s,
      series: { HLT: hlt, MASH: mash, BOIL: boil },
      changes: {
        HLT_TARGET: [[hStart, s.ready], [dough, s.rest + 3.2], [restEnd, 173], [outAt + 60, 168.6]],
        MASH_TARGET: [[dough, s.rest], [restEnd, 168], [spargeEnd, 0]],
        HLT_ELEMENT: [[w0, 0], [hStart, 100], [hEnd - 120, 60], [hEnd, 18], [move, 12], [dough, 64], [dough + 1500, 22], [restEnd, 100], [outAt, 26], [spargeEnd, 0]],
        BOIL_ELEMENT: [[w0, 0], [boilAt, 100], [boilEnd, 45]],
      },
      steps: [[hStart, 1, "BrewStart"], [move, 2, "Mash in"], [dough, 3, "Mash " + s.rest + " °F"], [restEnd, 4, "Mash out"], [outEnd, 5, "Sparge"], [boilEnd, 6, "Boil"]],
      entries: [[hStart - 600, "HLT FILLED " + f1(RIG_GAL) + " gal"], [outEnd + 600, "SPARGE " + f1(g.sparge) + " gal"], [boilAt, "PRE-BOIL " + f1(g.pre) + " gal"]],
      hlt: { t0: hStart, t1: hEnd, T0: s.cold, T1: s.ready, minutes: took, eff: s.eff, planned, readyBy, gal: RIG_GAL, watts: RIG_W, rate: (s.ready - s.cold) / took },
      strikeFig: s.strike && Object.assign({ t: dough }, s.strike),
      rests: [{ target: s.rest, t0: dough + 10 * 60, t1: restEnd, minutes: 60, over: s.over, dev: s.held, near: dough + 4 * 60, settle: 6 }],
      stepsUp: [{ from: s.rest, to: 168, rate: 0.95 }],
      grainFig: { lb: g.lb, strike: g.strike, fill: RIG_GAL, before: RIG_GAL - g.strike, tIn: move, sparge: g.sparge, pre: g.pre, dead: DEAD, held, per: held / g.lb },
      boil: { t0: boilAt, t1: boilEnd, T0: boilFrom, minutes: (boilEnd - boilAt) / 60, rate: s.boil },
    };
  }
  const rigBrews = rigSpec.map(rigBrew);

  /* ---------------- the figures, in the order of a brew day ---------------- */
  const SET0 = { hlt: 0.9, strike: null, mash: 5.4, grain: 0.12 };
  const st = {
    brewery: "bench", open: null, focus: null, used: {}, busy: null, out: {}, link: "ok", pick: "hlt",
    log: [], alt: null,
  };
  const brews = () => (st.brewery === "bench" ? benchBrews : rigBrews);
  const isOut = (fig, b) => !!(st.out[fig] && st.out[fig][b.id]);

  const FIGS = [
    {
      id: "hlt", name: "HLT heating", for: "for BrewStart's ready-by time", short: "HLT",
      cell(b) {
        const h = b.hlt;
        if (!h) {
          const coil = b.rests && b.rests.length;
          return { none: true, why: coil ? "the HLT heated the mash too" : b.boil && !b.rests.length ? "the HLT wasn't heated" : "no heat-up" };
        }
        const gal = b.rig ? h.gal : simGal;
        return { v: pct(h.eff), u: "%", s: `${f1(h.rate)} ${deg} a min · ${f1(gal)} gal` };
      },
      values() { return brews().filter((b) => b.hlt).map((b) => ({ b, v: b.hlt.eff, out: isOut("hlt", b) })); },
      domain: [0.7, 1.0], fmt: (v) => pct(v), unit: "%",
      set() { return st.used.hlt != null ? st.used.hlt : SET0.hlt; },
      setLine() { return st.used.hlt != null ? `since ${dayShort(st.usedAt.hlt)}` : "built in"; },
      measured(vals) { return vals.reduce((a, x) => a + x.v, 0) / vals.length; },
      agree: 0.05,
      verdictUse(m, vals) {
        const longer = Math.round((0.9 / m - 1) * 100);
        return `BrewStart plans with <b>90 %</b>: heating runs ${longer} % longer, inside its 10 min spare.`;
      },
      verdictInUse(m) { return `BrewStart plans with <b>${pct(st.used.hlt)} %</b>, what the brews measured. It was 90 %.`; },
      still() { return `BrewStart's efficiency did not change. It is still ${st.used.hlt != null ? `${pct(st.used.hlt)} %` : "90 % (built in)"}.`; },
      use(m) { return { label: `USE ${pct(m)} %`, small: "as BrewStart's efficiency", value: Math.round(m * 100) / 100, log: `BrewStart's efficiency set to ${pct(m)} %, was 90 % (built in)`, back: "BrewStart's efficiency set back to 90 % (built in)", backLabel: "BACK TO 90 %", backSmall: "built in" }; },
    },
    {
      id: "strike", name: "Strike water", for: "for the strike water box's forecast", short: "STRIKE",
      cell(b) {
        if (!b.rig) return { none: true, why: "no grain in the simulated tun" };
        const s = b.strikeFig;
        if (!s) return { none: true, why: "no forecast kept for it" };
        const mid = (s.lo + s.hi) / 2, d = s.landed - mid;
        return { v: f1(s.landed), u: deg, s: `forecast ${f1(s.lo)}–${f1(s.hi)} · ${f1(Math.abs(d))} ${d >= 0 ? "over" : "under"} its middle` };
      },
      values() { return brews().filter((b) => b.strikeFig).map((b) => ({ b, v: 0.62 + (b.strikeFig.landed - b.strikeFig.fit) * 0.08, out: isOut("strike", b) })); },
      domain: [0.45, 1.0], fmt: (v) => pct(v), unit: "%",
      set() { return st.used.strike != null ? st.used.strike : null; },
      setText() { return st.used.strike != null ? `${pct(st.used.strike)}<span class="u">%</span>` : `45–100<span class="u">%</span>`; },
      setLine() { return st.used.strike != null ? `since ${dayShort(st.usedAt.strike)}` : "not measured yet"; },
      setRange: [0.45, 1.0],
      measured() { return 0.62; },
      agree: 0.08,
      verdictUse(m, vals) { return `The tun's steel the strike warms at once. With ${pct(m)} %, all ${vals.length} landings fall within 0.2 ${deg} of the forecast's middle.`; },
      verdictInUse() { return `The strike water box forecasts with <b>${pct(st.used.strike)} %</b>: Rye Pale Ale lands <b>150.7–151.7 ${deg}</b>.`; },
      still() { return `The strike water box's tun steel did not change. It is still ${st.used.strike != null ? `${pct(st.used.strike)} %, measured` : "45–100 %, not measured"}.`; },
      use(m) { return { label: `USE ${pct(m)} %`, small: "in the strike water box", value: m, log: `Strike water box: the tun's steel warmed at once set to ${pct(m)} %, was 45–100 % (not measured)`, back: "Strike water box: the tun's steel warmed at once back to 45–100 % (not measured)", backLabel: "BACK TO 45–100 %", backSmall: "not measured" }; },
      noneVerdict() { return `Nothing to compare: the simulated tun has no grain (its Grain_Kg is 0).`; },
    },
    {
      id: "mash", name: "Mash rests", for: "PID_HERMS on the Mash Tun", short: "MASH",
      cell(b) {
        if (!b.rests || !b.rests.length) return { none: true, why: b.stopped ? "stopped before its rest" : "no rest" };
        const dev = Math.max(...b.rests.map((r) => r.dev || 0)), over = Math.max(...b.rests.map((r) => r.over));
        const targets = [...new Set(b.rests.map((r) => r.target))].map((x) => `${x}`).join(", ");
        const n = b.rests.length;
        return { v: `±${f1(dev)}`, u: deg, s: `${n === 1 ? "rest" : n + " rests"} at ${targets} · came ${f1(over)} over` };
      },
      values() {
        const out = [];
        brews().forEach((b) => (b.rests || []).forEach((r) => out.push({ b, v: r.over, out: isOut("mash", b), target: r.target })));
        return out;
      },
      domain: [0, 1.5], fmt: (v) => f1(v), unit: deg, nothing: true,
      setText() { return `5.4<span class="u">${deg}</span>`; },
      setLine() { return "DeltaTemp"; },
      setMark: null,
    },
    {
      id: "grain", name: "Grain absorption", for: "for BrewStart's water", short: "GRAIN",
      cell(b) {
        if (!b.rig) return { none: true, why: "no volumes in BrewScribe" };
        const g = b.grainFig;
        return { v: g.per.toFixed(3), u: "gal/lb", s: `${f1(g.held)} gal held by ${f1(g.lb)} lb` };
      },
      values() { return brews().filter((b) => b.grainFig).map((b) => ({ b, v: b.grainFig.per, out: isOut("grain", b) })); },
      domain: [0.06, 0.16], fmt: (v) => v.toFixed(2), unit: "gal/lb",
      set() { return st.used.grain != null ? st.used.grain : SET0.grain; },
      setLine() { return st.used.grain != null ? `since ${dayShort(st.usedAt.grain)}` : "in Settings"; },
      measured(vals) { return vals.reduce((a, x) => a + x.v, 0) / vals.length; },
      agree: 0.02,
      verdictUse(m, vals) {
        const lo = Math.min(...vals.map((x) => x.v)), hi = Math.max(...vals.map((x) => x.v));
        return `At 0.12, BrewStart's water is <b>${f1((0.12 - m) * 13.5)} gal</b> more than 13.5 lb of grain holds. This may read slightly high: the HLT's losses count as strike.`;
      },
      verdictInUse() { return `BrewStart's water allows <b>${st.used.grain.toFixed(2)} gal</b> for each pound of grain. It was 0.12.`; },
      still() { return `Grain absorption did not change. It is still ${(st.used.grain != null ? st.used.grain : 0.12).toFixed(2)} gal/lb.`; },
      use(m) { const v = Math.round(m * 100) / 100; return { label: `USE ${v.toFixed(2)}`, small: "gal/lb as grain absorption", value: v, log: `Grain absorption set to ${v.toFixed(2)} gal/lb, was 0.12 gal/lb`, back: "Grain absorption set back to 0.12 gal/lb", backLabel: "BACK TO 0.12", backSmall: "gal/lb, as it was" }; },
      noneVerdict() { return `No volumes yet: BrewScribe has no finished brew on this simulator.`; },
    },
    {
      id: "boil", name: "Boil kettle", for: "nothing plans with this yet", short: "BOIL",
      cell(b) {
        if (!b.boil) return { none: true, why: b.boil_partial ? "stopped at 139 °F" : "no boil" };
        return { v: f1(b.boil.rate), u: `${deg}/min`, s: `${Math.round(b.boil.T0)} → 212 ${deg} in ${mins(b.boil.minutes)} min` };
      },
      values() { return brews().filter((b) => b.boil).map((b) => ({ b, v: b.boil.rate, out: isOut("boil", b) })); },
      domain: [0, 3.5], fmt: (v) => f1(v), unit: `${deg}/min`, info: true, agree: 0.3,
      measured(vals) { return vals.reduce((a, x) => a + x.v, 0) / vals.length; },
      setText() { return `– –`; },
      setLine() { return "none"; },
    },
  ];
  st.usedAt = {};

  /* ---------------- a figure's state, worked out from its brews ---------------- */
  function summary(F) {
    const all = F.values(), vals = all.filter((x) => !x.out);
    const res = { all, vals, n: new Set(vals.map((x) => x.b.id)).size };
    if (F.nothing) {
      if (!vals.length) return Object.assign(res, { state: "none" });
      const over = Math.max(...vals.map((x) => x.v)), held = Math.max(...vals.map((x) => {
        const r = (x.b.rests || []).find((q) => q.target === x.target); return r ? r.dev || 0 : 0; }));
      const bigs = vals.filter((x) => x.v >= 0.8);
      return Object.assign(res, { state: bigs.length ? "caution" : "nothing", over, held, bigs, m: held });
    }
    if (!vals.length) return Object.assign(res, { state: "none" });
    const m = F.measured(vals);
    const lo = Math.min(...vals.map((x) => x.v)), hi = Math.max(...vals.map((x) => x.v));
    res.m = m; res.lo = lo; res.hi = hi;
    if (res.n === 1) return Object.assign(res, { state: F.info ? "info1" : "one" });
    if (hi - lo > F.agree) return Object.assign(res, { state: "disagree" });
    if (F.info) return Object.assign(res, { state: "info" });
    if (st.used[F.id] != null) return Object.assign(res, { state: "inuse" });
    return Object.assign(res, { state: "use" });
  }

  /* ---------------- drawing a day graph in a PID window ---------------- */
  function niceStep(span) {
    for (const s of [2, 5, 10, 20, 25, 50]) if (span / s <= 6) return s;
    return 100;
  }
  function graph(o) {
    const W = o.w || 1000, H = o.h || 210, L = 40, R = 10, T = 24, B = 24, OUTH = 12;
    const t0 = o.t0, t1 = o.t1, pts = o.series.filter(([t]) => t >= t0 && t <= t1);
    const svs = (o.sv || []).filter(([, v]) => v > 0);
    let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
    svs.forEach(([t, v]) => { if (t <= t1) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    (o.hbands || []).forEach((h) => { lo = Math.min(lo, h.lo); hi = Math.max(hi, h.hi); });
    if (hi - lo < 8) { const c = (hi + lo) / 2; lo = c - 4; hi = c + 4; }
    const step = niceStep(hi - lo);
    lo = Math.floor((lo - 1) / step) * step; hi = Math.ceil((hi + 1) / step) * step;
    const px = (t) => L + (t - t0) / (t1 - t0) * (W - L - R);
    const py = (v) => T + (hi - v) / (hi - lo) * (H - T - B - OUTH);
    let s = "";
    for (let v = lo; v <= hi + 0.001; v += step) {
      const y = py(v).toFixed(1);
      s += `<path class="g-grid" d="M${L} ${y}H${W - R}"/><text class="g-lab" x="4" y="${(+y + 4).toFixed(1)}">${v}</text>`;
    }
    const span = (t1 - t0) / 60, every = span <= 100 ? 15 : span <= 260 ? 30 : 60;
    for (let t = Math.ceil(t0 / (every * 60)) * every * 60; t <= t1; t += every * 60) {
      const x = px(t).toFixed(1);
      s += `<path class="g-grid" d="M${x} ${T}V${H - B}"/><text class="g-lab" x="${x}" y="${H - 6}" text-anchor="middle">${tick(t)}</text>`;
    }
    (o.hbands || []).forEach((hb) => {
      const y0 = py(hb.hi), y1 = py(hb.lo);
      s += `<rect class="g-hband" x="${L}" y="${y0.toFixed(1)}" width="${W - L - R}" height="${Math.max(2, y1 - y0).toFixed(1)}"/><text class="g-hbandlab" x="${W - R - 4}" y="${(y0 - 4).toFixed(1)}" text-anchor="end">${esc(hb.label)}</text>`;
    });
    (o.bands || []).forEach((b, i) => {
      const x0 = px(Math.max(t0, b.t0)), x1 = px(Math.min(t1, b.t1));
      s += `<rect class="g-band" x="${x0.toFixed(1)}" y="${T}" width="${Math.max(2, x1 - x0).toFixed(1)}" height="${(H - T - B).toFixed(1)}"/>`;
      if (b.label) s += `<text class="g-bandlab" x="${(x0 + 5).toFixed(1)}" y="${T + 30 + (i % 2) * 14}">${esc(b.label)}</text>`;
    });
    // gaps in the log
    let d = "", prev = null;
    pts.forEach(([t, v]) => {
      if (prev && t - prev[0] > 180) s += `<rect class="g-gap" x="${px(prev[0]).toFixed(1)}" y="${T}" width="${(px(t) - px(prev[0])).toFixed(1)}" height="${(H - T - B).toFixed(1)}"/>`;
      d += `${!prev || t - prev[0] > 180 ? "M" : "L"}${px(t).toFixed(1)} ${py(v).toFixed(1)}`;
      prev = [t, v];
    });
    if (svs.length && o.sv) {
      let sd = "", last = null;
      o.sv.forEach(([t, v], i) => {
        const tn = i + 1 < o.sv.length ? o.sv[i + 1][0] : t1;
        if (v > 0 && tn > t0 && t < t1) {
          const a = px(Math.max(t, t0)), b2 = px(Math.min(tn, t1)), y = py(v);
          sd += `M${a.toFixed(1)} ${y.toFixed(1)}H${b2.toFixed(1)}`;
          last = y;
        }
      });
      s += `<path class="g-sv" d="${sd}"/>`;
    }
    if (o.out && o.out.length) {
      let od = "", yb = H - B;
      o.out.forEach(([t, v], i) => {
        const tn = i + 1 < o.out.length ? o.out[i + 1][0] : t1;
        if (v > 0 && tn > t0 && t < t1) {
          const a = px(Math.max(t, t0)), b2 = px(Math.min(tn, t1)), hh = OUTH * v / 100;
          od += `M${a.toFixed(1)} ${yb}h${(b2 - a).toFixed(1)}v${-hh.toFixed(1)}h${-(b2 - a).toFixed(1)}Z`;
        }
      });
      s += `<path class="g-out" d="${od}"/><text class="g-lab" x="${W - R - 2}" y="${H - B - 2}" text-anchor="end">OUT</text>`;
    }
    s += `<path class="g-pv" d="${d}"/>`;
    (o.marks || []).forEach(([t, n]) => {
      if (t < t0 || t > t1) return;
      const x = px(t);
      s += `<path class="g-mark" d="M${x.toFixed(1)} ${T + 16}V${H - B}"/><rect class="g-tagbox" x="${(x - 8).toFixed(1)}" y="${T + 1}" width="16" height="15" rx="3"/><text class="g-marktag" x="${x.toFixed(1)}" y="${T + 13}" text-anchor="middle">${n}</text>`;
    });
    let lastX = -1e9, row = 0;
    (o.entries || []).forEach(([t, label]) => {
      if (t < t0 || t > t1) return;
      const x = px(t); row = x - lastX < 150 ? row + 1 : 0; lastX = x;
      const y = T + 52 + row * 16;
      s += `<path class="g-entry" d="M${x.toFixed(1)} ${y - 6}l5 5-5 5-5-5z"/><text class="g-entrylab" x="${(x + 8).toFixed(1)}" y="${y + 3}">${esc(label)}</text>`;
    });
    const last = pts[pts.length - 1];
    if (last) s += `<circle class="g-dot" cx="${px(last[0]).toFixed(1)}" cy="${py(last[1]).toFixed(1)}" r="2.5"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "")}">${s}</svg>`;
  }
  const keyLine = (o) => `<ul class="key"><li><i style="background:var(--pv)"></i>${o.vessel} temperature</li>${o.sv ? `<li><i style="background:var(--sv)"></i>target</li>` : ""}${o.out ? `<li><i style="background:rgb(255 123 28/.6);height:8px"></i>element</li>` : ""}<li><i style="background:rgb(28 87 150/.6);height:8px;outline:1px solid var(--active-edge)"></i>where the figure comes from</li>${o.entries ? `<li><i style="background:var(--text);width:8px;height:8px;transform:rotate(45deg)"></i>BrewScribe's readings</li>` : ""}${o.marks ? `<li>numbers: steps</li>` : ""}${o.nomarks ? `<li>no step marks: this run's steps weren't kept${o.notargets ? ", nor its targets (logged from 15 Nov)" : ""}</li>` : ""}</ul>`;
  /* the whole ledger on one screen needs a window at least 1280 wide and 860 tall; smaller, one figure at a time */
  const oneScreen = () => innerWidth >= 1280 && innerHeight >= 860;
  /* graphs are drawn at the width they're shown, so their labels keep their size */
  const graphW = () => {
    const w = innerWidth;
    if (!oneScreen()) return Math.max(300, w - 2 * (w <= 700 ? 12 : 20) - 44);
    return Math.max(600, w - 2 * 20 - Math.min(440, Math.max(300, w * 0.26)) - 60);
  };
  const gwin = (title, o) => `<div class="gwin"><h3>${esc(title)}</h3>${graph(Object.assign({ w: graphW(), h: innerWidth <= 700 ? 170 : 178 }, o))}${keyLine(o)}</div>`;

  /* ---------------- the evidence for one brew and one figure ---------------- */
  function evidence(b, F) {
    const c = b.changes || {}, ch = (k) => (k && c[k] && c[k].length ? c[k] : null);
    /* the target line only while something holds it: the kettle's AUTO, or for the HLT the mash tun's HERMS, as on Brew
       Day's graphs. Without an AUTO log (the made-up rig day) the target series says where it holds by itself */
    const svFor = (key) => {
      const T = ch(key + "_TARGET");
      if (!T) return null;
      const autos = [ch(key + "_AUTO"), key === "HLT" ? ch("MASH_AUTO") : null].filter(Boolean);
      if (!autos.length) return T;
      const times = [...new Set([...T, ...autos.flat()].map((x) => x[0]))].sort((a, z) => a - z);
      const at = (s, t) => { let v = 0; for (const [tt, vv] of s) { if (tt <= t) v = vv; else break; } return v; };
      return times.map((t) => [t, autos.some((a) => at(a, t) > 0) ? at(T, t) : 0]);
    };
    const base = (vessel, key, extra) => Object.assign({ t0: b.w[0], t1: b.w[1], series: b.series[key], vessel,
      sv: svFor(key),
      out: ch(key === "BOIL" ? "BOIL_ELEMENT" : key === "HLT" ? "HLT_ELEMENT" : null),
      marks: b.rig ? b.steps : null, entries: b.entries || null, nomarks: !b.rig, notargets: !b.rig && !(b.changes && b.changes.HLT_TARGET) }, extra);
    const noSteps = "";
    const out = isOut(F.id, b);
    const leave = (has) => has ? `<button class="quiet" type="button" data-act="leave" data-fig="${F.id}" data-brew="${b.id}">${out ? "PUT BACK IN THE FIGURE" : "LEAVE OUT OF THE FIGURE"}</button>` : "";
    const scribe = b.rig ? `<a class="quiet" href="#brewscribe" data-act="scribe">THIS BREW IN BREWSCRIBE <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg></a>` : "";
    let graphs = "", work = "";
    const title = `${day(b.start)} · ${esc(b.label)}`;
    if (F.id === "hlt") {
      const h = b.hlt;
      if (h) {
        graphs = gwin("Hot liquor tank", base("HLT", "HLT", { bands: [{ t0: h.t0, t1: h.t1, label: `MEASURED HERE: ${f1(h.T0)} → ${f1(h.T1)} ${deg} IN ${mins(h.minutes)} MIN` }], label: `Hot liquor tank on ${day(b.start)}: ${f1(h.T0)} to ${f1(h.T1)} ${deg} in ${mins(h.minutes)} minutes.` }));
        const gal = b.rig ? h.gal : simGal, watts = b.rig ? h.watts : BENCH.sim.hlt_w;
        const J = gal * L_PER_GAL * WATER * (h.T1 - h.T0) * 5 / 9, planned = J / (watts * 0.9) / 60;
        work = `<h3>${pct(h.eff)} % of the element's power reached the water<small>${title}</small></h3>
          <dl><dt>Heated</dt><dd>${f1(h.T0)} → ${f1(h.T1)} ${deg} in ${mins(h.minutes)} min, ${f1(h.rate)} ${deg} a minute</dd>
          <dt>Water</dt><dd>${f1(gal)} gal${b.rig ? ", BrewStart's water" : ", the simulated HLT's Volume"} · ${watts} W element</dd>
          <dt>BrewStart</dt><dd>${b.rig ? `planned ${mins(planned)} min at 90 %; it took ${mins(h.minutes)}, so the water was hot ${f1(10 - (h.minutes - planned))} min before ${hm(h.readyBy)}, not 10` : `would plan ${mins(planned)} min at 90 %; it took ${mins(h.minutes)}, ${f1(h.minutes - planned)} min more`}</dd>
          <dt>Wort pump</dt><dd>off${b.rig ? "" : " until the band ends"}, so the coil drew next to no heat</dd></dl>
          ${b.rig ? "" : `<p>The simulated HLT holds ${f1(simGal)} gal whatever BrewStart's water says (15 gal here), so this says nothing about the rig.</p>`}`;
      } else {
        graphs = gwin("Hot liquor tank", base("HLT", "HLT", { label: `Hot liquor tank on ${day(b.start)}.` }));
        work = `<h3>Not part of this figure<small>${title}</small></h3><p>${b.rests && b.rests.length ? "The wort pump ran through the HERMS coil while the HLT heated, so the mash drew heat as it went: this heat-up says how fast the two heat together, not the HLT alone." : "The HLT wasn't heated on this brew."}</p>`;
      }
    } else if (F.id === "mash") {
      const bands = (b.rests || []).map((r) => ({ t0: r.t0, t1: r.t1, label: `${r.target} ${deg} ±${f1(r.dev || 0)}` }));
      const first = b.rests && b.rests[0];
      const warm = first ? (b.series.MASH.find(([t, v]) => t >= b.w[0] && v >= first.target - 25) || [first.near])[0] : 0;
      const zoom = first ? { t0: Math.max(first.near - 15 * 60, warm - 60), t1: b.rests[b.rests.length - 1].t1 + 12 * 60 } : {};
      graphs = gwin("Mash tun", base("MASH", "MASH", Object.assign({ bands, label: `Mash tun on ${day(b.start)}.` }, zoom)));
      if (b.rests && b.rests.length) {
        const rows = b.rests.map((r) => `<dt>${r.target} ${deg}</dt><dd>${mins(r.minutes)} min within ${f1(r.dev || 0)} ${deg} · came ${f1(r.over)} over · last degree in ${f1(r.settle)} min</dd>`).join("");
        const ups = (b.stepsUp || b.steps_up || (b.rig ? [] : b.steps) || []).filter((x) => x.rate).map((x) => `<dt>Step up</dt><dd>${x.from} → ${x.to} ${deg} at ${f1(x.rate)} ${deg} a minute</dd>`).join("");
        work = `<h3>Each rest, as it held<small>${title}</small></h3><dl>${rows}${ups}</dl>${b.rests.some((r) => r.over >= 0.8) ? `<p>A smaller DeltaTemp (5.4 ${deg} now) comes in gentler but steps up slower. That trade isn't measured, so there's nothing to USE: it's yours to try.</p>` : ""}`;
      } else work = `<h3>No rest on this brew<small>${title}</small></h3><p>${b.stopped || "The mash wasn't held at a rest."}</p>`;
    } else if (F.id === "boil") {
      const bo = b.boil;
      graphs = gwin("Boil kettle", base("BOIL", "BOIL", { bands: bo ? [{ t0: bo.t0, t1: bo.t1, label: `MEASURED HERE: ${Math.round(bo.T0)} → 212 ${deg} IN ${mins(bo.minutes)} MIN` }] : [], label: `Boil kettle on ${day(b.start)}.` }));
      work = bo ? `<h3>${f1(bo.rate)} ${deg} a minute to the boil<small>${title}</small></h3><dl><dt>Heated</dt><dd>${Math.round(bo.T0)} → 212 ${deg} in ${mins(bo.minutes)} min</dd><dt>Water</dt><dd>${b.rig ? "the runoff, " + f1(b.grainFig.pre) + " gal" : "10.6 gal, the simulated kettle's Volume"}</dd></dl>${!b.rig && bo.rate < 1.5 ? `<p>About a quarter of the other brew's rate the whole way: the element may have run at the boil power, not full power. Its level wasn't logged then, so the page can't tell.</p>` : ""}`
        : `<h3>No boil on this brew<small>${title}</small></h3><p>${b.boil_partial ? "The boil kettle was heated to 139 °F and stopped." : "The boil kettle wasn't heated."}</p>`;
    } else if (F.id === "strike") {
      const s = b.strikeFig;
      if (s) {
        graphs = gwin("Mash tun", base("MASH", "MASH", { t0: s.t - 6 * 60, t1: s.t + 40 * 60, sv: null, hbands: [{ lo: s.lo, hi: s.hi, label: `FORECAST ${f1(s.lo)}–${f1(s.hi)} ${deg}` }], bands: [{ t0: s.t + 300, t1: s.t + 900, label: `LANDED ${f1(s.landed)}` }], label: `Mash tun at dough-in on ${day(b.start)}: forecast ${f1(s.lo)} to ${f1(s.hi)}, landed ${f1(s.landed)} ${deg}.` }));
        work = `<h3>Landed ${f1(s.landed)} ${deg}<small>${title}</small></h3><dl><dt>Forecast</dt><dd>${f1(s.lo)}–${f1(s.hi)} ${deg}, as the strike water box showed it</dd><dt>Landed</dt><dd>${f1(s.landed)} ${deg}: the mash probe's average 5 to 15 minutes after the grain went in, with the pump running again</dd><dt>With 62 %</dt><dd>the forecast would have been ${f1(s.fit - 0.5)}–${f1(s.fit + 0.5)} ${deg}</dd></dl><p>From the strike water box's own record of its forecast and the numbers it worked from, kept as the malt went in.</p>`;
      } else if (b.rig) {
        graphs = gwin("Mash tun", base("MASH", "MASH", { label: `Mash tun on ${day(b.start)}.` }));
        work = `<h3>Not part of this figure<small>${title}</small></h3><p>The strike water box kept no forecast for this brew: it was brewed before the box kept them. There's nothing to compare where it landed with.</p>`;
      } else {
        graphs = gwin("Mash tun", base("MASH", "MASH", { label: `Mash tun on ${day(b.start)}.` }));
        work = `<h3>No grain here<small>${title}</small></h3><p>The simulated mash tun has no grain (its Grain_Kg is 0), so the strike water never landed on any.</p>`;
      }
    } else if (F.id === "grain") {
      if (b.rig) {
        const g = b.grainFig;
        graphs = gwin("Mash tun", base("MASH", "MASH", { bands: [{ t0: g.tIn, t1: b.entries[2][0], label: "STRIKE IN TO PRE-BOIL OUT" }], label: `Mash tun on ${day(b.start)}, with BrewScribe's volumes.` }));
        work = `<h3>${g.per.toFixed(3)} gal a pound<small>${title}</small></h3><dl><dt>Strike</dt><dd>${f1(g.fill)} gal in the HLT, less the ${f1(g.before)} gal left before the sparge</dd><dt>In</dt><dd>${f1(g.strike)} gal strike + ${f1(g.sparge)} gal sparge</dd><dt>Out</dt><dd>${f1(g.pre)} gal before the boil + ${f1(g.dead)} gal left in the tun</dd><dt>Held</dt><dd>${f1(g.held)} gal by the recipe's ${f1(g.lb)} lb of grain</dd></dl><p>From BrewScribe's volumes, at 68 °F. The HLT's losses before the sparge count as strike, so this may read slightly high.</p>`;
      } else {
        graphs = gwin("Mash tun", base("MASH", "MASH", { label: `Mash tun on ${day(b.start)}.` }));
        work = `<h3>No volumes for this brew<small>${title}</small></h3><p>BrewScribe didn't record it, so there's no strike, sparge or pre-boil volume to work from.</p>`;
      }
    }
    const has = F.values().some((x) => x.b.id === b.id);
    return `<div class="ev" id="ev"><div class="graphs">${graphs}${noSteps}</div><div class="work">${work}<div class="acts">${leave(has)}${scribe}<button class="quiet" type="button" data-act="close">CLOSE</button></div></div></div>`;
  }

  /* ---------------- the foot: one PID window per figure ---------------- */
  function strip(F, sm) {
    const [d0, d1] = F.domain, y = 17;
    const px = (v) => `${(3 + (Math.max(d0, Math.min(d1, v)) - d0) / (d1 - d0) * 94).toFixed(2)}%`;
    let s = `<line class="st-axis" x1="3%" x2="97%" y1="${y}" y2="${y}"/>`;
    if (F.setRange && st.used[F.id] == null) {
      const a = px(F.setRange[0]), b = px(F.setRange[1]);
      s += `<line class="st-set" x1="${a}" x2="${b}" y1="${y}" y2="${y}" opacity=".7"/><line class="st-set" x1="${a}" x2="${a}" y1="${y - 5}" y2="${y + 5}"/><line class="st-set" x1="${b}" x2="${b}" y1="${y - 5}" y2="${y + 5}"/><text class="st-setlab" x="${b}" y="${y - 8}" text-anchor="end">SET</text>`;
    } else if (F.set && F.set() != null) {
      const x = px(F.set());
      s += `<line class="st-set" x1="${x}" x2="${x}" y1="${y - 9}" y2="${y + 8}"/><text class="st-setlab" x="${x}" y="${y - 11}" text-anchor="middle">SET</text>`;
    }
    if (sm.vals.length > 1) {
      const lo = Math.min(...sm.vals.map((x) => x.v)), hi = Math.max(...sm.vals.map((x) => x.v));
      s += `<line class="st-range" x1="${px(lo)}" x2="${px(hi)}" y1="${y}" y2="${y}"/>`;
    }
    sm.all.forEach((x) => { s += x.out ? `<circle class="st-out" cx="${px(x.v)}" cy="${y}" r="4"/>` : `<circle class="st-dot" cx="${px(x.v)}" cy="${y}" r="4.5"/>`; });
    const words = `${sm.all.length} brews on a line from ${F.fmt(d0)} to ${F.fmt(d1)} ${F.unit}`;
    return `<svg class="strip" role="img" aria-label="${esc(words)}">${s}</svg>`;
  }  function foot(F) {
    const sm = summary(F), lost = st.link === "lost";
    let pv, sv, verdict = "", act = "";
    const setVal = F.setText ? F.setText() : `${F.fmt(F.set())}<span class="u">${F.unit}</span>`;
    sv = `<span class="tag">SET</span><span class="sv${F.info ? " none" : ""}">${setVal}<span class="was">${esc(F.setLine())}</span></span>`;
    if (sm.state === "none") {
      pv = `<span class="tag">MEASURED</span><span class="pv none">– –</span>`;
      verdict = F.noneVerdict ? F.noneVerdict() : "No brews to measure yet.";
    } else if (F.nothing) {
      pv = `<span class="tag">HELD</span><span class="pv">±${f1(sm.held)}<span class="u">${deg}</span></span>`;
      const nR = sm.vals.length, nB = sm.n;
      verdict = sm.state === "nothing"
        ? `<b>Nothing to change:</b> ${nR} rests held within ${f1(sm.held)} ${deg}, none more than ${f1(sm.over)} over.`
        : `<b>${sm.bigs.length} of ${nB}</b> came ${f1(Math.min(...sm.bigs.map((x) => x.v)))}–${f1(Math.max(...sm.bigs.map((x) => x.v)))} ${deg} over ${sm.bigs[0].target} ${deg} arriving, then held within ${f1(sm.held)} ${deg}.`;
      act = `<button class="quiet" type="button" data-act="hardware">DELTATEMP IN HARDWARE</button>`;
    } else {
      pv = sm.state === "disagree"
        ? `<span class="tag">MEASURED</span><span class="pv range">${F.fmt(sm.lo)}–${F.fmt(sm.hi)}<span class="u">${F.unit}</span></span>`
        : `<span class="tag">MEASURED</span><span class="pv">${F.fmt(sm.m)}<span class="u">${F.unit}</span></span>`;
      if (sm.state === "one" || sm.state === "info1") verdict = `One brew so far: another would show whether it repeats.`;
      else if (sm.state === "disagree") verdict = `<b>${sm.n} brews disagree,</b> ${F.fmt(sm.lo)} to ${F.fmt(sm.hi)} ${F.unit}.${F.info ? "" : " Open the odd one."}`;
      else if (sm.state === "info") verdict = `${sm.n} brews, ${F.fmt(sm.lo)} to ${F.fmt(sm.hi)} ${F.unit}.`;
      else if (sm.state === "inuse") verdict = F.verdictInUse(sm.m);
      else if (F.id === "hlt" && st.bsOld) verdict = `This BrewStart always plans with 90 %. A newer BrewStart plans with a figure from past brews.`;
      else verdict = F.verdictUse(sm.m, sm.vals);
      if (F.info) verdict += ` Nothing plans with this yet.`;
      if (!F.use) { /* nothing plans with it, so there's nothing to use */ }
      else if (sm.state === "use" || sm.state === "one" || sm.state === "disagree") {
        const u = F.use(sm.m), busy = st.busy === F.id, grey = sm.state !== "use" || lost || (F.id === "hlt" && st.bsOld);
        const failed = st.fail && st.fail.fig === F.id && !busy;
        act = `<button class="cmd go${busy ? " busy" : ""}${failed ? " failed" : ""}" type="button" data-act="use" data-fig="${F.id}"${grey || busy ? ' aria-disabled="true"' : ""}>${busy ? "SENDING…" : esc(u.label)}<small>${esc(busy ? "waiting for CraftBeerPi" : failed ? "didn't change · tap to try again" : u.small)}</small></button>`;
      } else if (sm.state === "inuse") {
        const u = F.use(sm.m), busy = st.busy === F.id, failed = st.fail && st.fail.fig === F.id && !busy;
        act = `<button class="cmd${busy ? " busy" : ""}${failed ? " failed" : ""}" type="button" data-act="back" data-fig="${F.id}"${busy || lost ? ' aria-disabled="true"' : ""}>${busy ? "SENDING…" : esc(u.backLabel)}<small>${esc(busy ? "waiting for CraftBeerPi" : failed ? "didn't change · tap to try again" : u.backSmall)}</small></button>`;
      }
    }
    const note = st.note && st.note.fig === F.id ? `<p class="note" role="status">${esc(st.note.text)}</p>`
      : st.fail && st.fail.fig === F.id && st.busy !== F.id ? `<p class="note bad" role="alert">${esc(F.still())} No answer from CraftBeerPi in 5 s.</p>` : "";
    return `<span class="colh colh-phone">${esc(F.name)}<small>${esc(F.for)}</small></span><div class="fw">${pv}${sv}${sm.all.length ? strip(F, sm) : ""}</div><p class="verdict">${verdict}</p>${act ? `<div class="footact">${act}</div>` : ""}${note}`;
  }

  /* ---------------- the page ---------------- */
  function headLine() {
    const list = brews(), first = Math.min(...list.map((b) => b.start)), last = Math.max(...list.map((b) => b.start));
    const span = `${dayShort(first)} to ${dayShort(last)}`;
    if (st.brewery === "bench") return `From <b>${list.length} brews</b> in CraftBeerPi Brewery's logs, ${span}. <span class="simtag">Simulated brews</span> They describe the simulator, not the rig, and USE changes only this simulator.`;
    return `From <b>${list.length} brews</b> in EBrews's logs and BrewScribe, ${span}. <span class="mockonly">Made-up figures: the rig's logs weren't read</span>`;
  }
  function ledger() {
    const list = brews();
    const cols = `<colgroup><col class="brew">${FIGS.map(() => "<col>").join("")}</colgroup>`;
    const head = `<thead><tr><th scope="col"><span class="colh">Brew<small>newest first</small></span></th>${FIGS.map((F) => `<th scope="col"><span class="colh">${esc(F.name)}<small>${esc(F.for)}</small></span></th>`).join("")}</tr></thead>`;
    let body = "";
    list.forEach((b) => {
      const cur = st.open === b.id;
      const what = b.rig ? b.label : b.label;
      body += `<tr${cur ? ' aria-current="true"' : ""} data-brew="${b.id}"><td class="bcell"><button class="cellbtn date" type="button" data-act="open" data-brew="${b.id}" aria-expanded="${cur}"><span class="d">${day(b.start)}<time>${hm(b.start)}</time></span><span class="w">${esc(what)}</span></button></td>`;
      FIGS.forEach((F) => {
        const c = F.cell(b), out = isOut(F.id, b);
        const inner = c.none ? `<span class="none">– –</span><span class="why">${esc(c.why)}</span>`
          : `<span class="v">${c.v}<span class="u">${c.u}</span></span><span class="s">${esc(c.s)}</span>${out ? `<span class="chip">left out</span>` : ""}`;
        const label = c.none ? `${F.name}, ${day(b.start)}: none, ${c.why}` : `${F.name}, ${day(b.start)}: ${c.v} ${c.u}, ${c.s}${out ? ", left out" : ""}`;
        body += `<td class="${st.pick === F.id ? "sel" : ""}${cur && st.focus === F.id ? " focus" : ""}"><button class="cellbtn${out ? " out" : ""}" type="button" data-act="open" data-brew="${b.id}" data-fig="${F.id}" aria-label="${esc(label)}">${inner}</button></td>`;
      });
      body += `</tr>`;
      if (cur) {
        const F = FIGS.find((x) => x.id === (st.focus || st.pick));
        body += `<tr class="evrow"><td colspan="${FIGS.length + 1}" class="sel">${evidence(b, F)}</td></tr>`;
      }
    });
    const legend = `<div class="legend"><span><b class="m">MEASURED</b> what the brews show</span><span><b class="st">SET</b> what CraftBeerPi plans with now</span><span>Each dot is a brew; a hollow one is left out.</span></div>`;
    const tf = `<tfoot><tr><th scope="row">${legend}</th>${FIGS.map((F) => `<td class="${st.pick === F.id ? "sel" : ""}" data-fig="${F.id}">${foot(F)}</td>`).join("")}</tr></tfoot>`;
    return `<table aria-label="Brewery figures by brew">${cols}${head}${tf}<tbody>${body}</tbody></table>`;
  }
  const pick = () => `<div class="pick" role="group" aria-label="Figure">${FIGS.map((F) => `<button type="button" data-act="pick" data-fig="${F.id}" aria-pressed="${st.pick === F.id}">${F.short}</button>`).join("")}</div>`;

  function render() {
    const app = $("#app");
    app.dataset.link = st.link;
    $("#bname").textContent = st.brewery === "bench" ? "CraftBeerPi Brewery" : "EBrews";
    document.title = `${st.brewery === "bench" ? "CraftBeerPi Brewery" : "EBrews"} · Figures · CraftBeerPi proposal (mockup)`;
    const now = logNow();
    $("#clock").innerHTML = S.h24 ? hm(now) : hm(now).replace(/ (AM|PM)/, '<span class="ap">$1</span>');
    $("#link").dataset.link = st.link;
    $("#link-t").textContent = st.link === "lost" ? "No connection" : "Connected";
    banner();
    const ev = st.log[0];
    $("#event").innerHTML = `<p class="line"><time>${ev ? hm(ev.t) : ""}</time>${ev ? esc(ev.text) : "Connected to CraftBeerPi"}${ev && ev.res ? ` · <span class="res ${ev.cls || ""}">${esc(ev.res)}</span>` : ""}</p><button class="logbtn" id="logbtn" type="button" aria-expanded="false" aria-controls="loglist">LOG</button><ol class="loglist" id="loglist" hidden>${st.log.slice(0, 8).map((e) => `<li><time>${hm(e.t)}</time> ${esc(e.text)}${e.res ? ` · <span class="res ${e.cls || ""}">${esc(e.res)}</span>` : ""}</li>`).join("")}</ol>`;
    if (st.core === "old") {
      $("#main").innerHTML = `<header class="fhead"><h1>Brewery figures</h1><p class="from">This CraftBeerPi can't work out figures from past brews yet: it needs an update. Brewhouse efficiency, boil-off and mash efficiency are in BrewScribe's Past brews.</p><div class="tools">${scribeLink("PAST BREWS IN BREWSCRIBE")}</div></header>`;
      return;
    }
    $("#main").innerHTML = `<header class="fhead"><h1>Brewery figures</h1><p class="from">${headLine()}</p><div class="tools">${scribeLink("PAST BREWS IN BREWSCRIBE")}</div></header>${pick()}<section class="ledger" id="ledger" aria-label="Figures by brew">${ledger()}</section>`;
    // an opened brew comes to the top of the list, under the column heads, so its day graph is in view above the foot
    const row = st.open && document.querySelector(`#ledger tr[data-brew='${st.open}']`);
    if (row) {
      const L = $("#ledger");
      if (oneScreen()) L.scrollTop += row.getBoundingClientRect().top - L.querySelector("thead th").getBoundingClientRect().bottom;
      else if (st.scrollOpen) row.scrollIntoView({ block: "start" });
    }
    st.scrollOpen = false;
    if (row && oneScreen() && document.fonts && !st.fontsAligned) document.fonts.ready.then(() => {
      st.fontsAligned = true;
      const r2 = st.open && document.querySelector(`#ledger tr[data-brew='${st.open}']`), L2 = $("#ledger");
      if (r2 && L2) L2.scrollTop += r2.getBoundingClientRect().top - L2.querySelector("thead th").getBoundingClientRect().bottom;
    });
  }

  /* the title bar: NO ALARMS, or no connection. A command that fails says so at its own button, as Settings does, not in
     the title bar (the frame has no alarm for a page to raise) */
  function banner() {
    const ban = $("#banner");
    if (st.link === "lost") { ban.dataset.tone = "alarm"; ban.innerHTML = `${ICON_WARN}<span class="msg"><b>No connection</b>Last reading 48 s ago. Controls are paused.</span>`; return; }
    ban.dataset.tone = "ok";
    ban.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="m7 12.5 3.2 3.2L17.2 9" fill="none" stroke="#11331f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="msg">No alarms</span>`;
  }
  const ICON_WARN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 15h-2v2h2v-2Zm0-7h-2v5h2v-5Z"/></svg>`;
  const scribeLink = (words) => `<a class="quiet" href="#brewscribe" data-act="scribe">${words} <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg></a>`;

  /* ---------------- presses ---------------- */
  let toastTimer = 0;
  function toast(text) {
    const t = $("#toast"); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
  }
  const logNow = () => (st.brewery === "bench" ? BENCH_NOW : rigBrews[0].w[1] + 6 * 3600);
  function log(text, res, cls) { st.log.unshift({ t: logNow(), text, res, cls }); }
  function noteFor(fig, text) { st.note = { fig, text }; render(); setTimeout(() => { if (st.note && st.note.text === text) { st.note = null; render(); } }, 6000); }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (e.target.closest("#logbtn")) {
      const l = $("#loglist"), open = l.hidden; l.hidden = !open; $("#logbtn").setAttribute("aria-expanded", String(open)); return;
    }
    if (e.target.closest(".tabs a")) {
      e.preventDefault();
      const a = e.target.closest(".tabs a");
      if (a.dataset.tab !== "Figures") toast(a.dataset.tab === "BrewScribe" ? "Opens BrewScribe in a browser tab of its own." : `This mockup shows the Figures tab only; ${a.dataset.tab} is as it is today.`);
      return;
    }
    if (!el) return;
    const act = el.dataset.act, fig = el.dataset.fig, brew = el.dataset.brew;
    if (act === "open") {
      if (st.open === brew && (!fig || st.focus === fig)) { st.open = null; st.focus = null; }
      else { st.open = brew; st.focus = fig || st.focus || st.pick; if (fig) st.pick = fig; st.scrollOpen = true; }
      render();
    } else if (act === "close") { st.open = null; st.focus = null; render(); }
    else if (act === "pick") { st.pick = fig; st.focus = fig; render(); }
    else if (act === "leave") {
      st.out[fig] = st.out[fig] || {};
      const F = FIGS.find((x) => x.id === fig), b = brews().find((x) => x.id === brew);
      const now = !st.out[fig][brew]; st.out[fig][brew] = now;
      log(`${day(b.start)} ${now ? "left out of" : "put back in"} the ${F.name.toLowerCase()} figure`, "", "");
      render();
    } else if (act === "use" || act === "back") {
      const F = FIGS.find((x) => x.id === fig), sm = summary(F);
      const how = act;
      if (el.getAttribute("aria-disabled") === "true") {
        if (st.link === "lost") return noteFor(fig, "No connection. Controls are paused.");
        if (st.busy) return;
        if (F.id === "hlt" && st.bsOld) return noteFor(fig, "This BrewStart can't take a figure from past brews: it always plans with 90 %.");
        if (sm.state === "one") return noteFor(fig, "One brew so far: USE waits for a second that agrees with it.");
        if (sm.state === "disagree") return noteFor(fig, `The brews disagree, so there's no one figure to use. Leave out the odd one, or wait for more brews.`);
        return;
      }
      st.busy = fig; st.fail = null; render();
      /* the mockup's stand-ins for CraftBeerPi's answers: 900 ms for an answer, and a shorter wait for "no answer in 5 s" */
      if (st.failNext) {
        st.failNext = false;
        return setTimeout(() => {
          st.busy = null; st.fail = { fig, how };
          log(`${F.name}: failed: no answer in 5 s`, "failed", "bad");
          render();
        }, 1500);
      }
      if (st.refuseNext) {
        st.refuseNext = false;
        return setTimeout(() => {
          st.busy = null; st.out.hlt = { b23nov: true };
          log("MON 23 NOV left out of the HLT heating figure", "from another screen", "");
          noteFor(fig, "USE 85 % wasn't applied: MON 23 NOV was left out of this figure on another screen. With one brew left, USE waits for a second.");
        }, 900);
      }
      setTimeout(() => {
        const u = F.use(sm.m);
        if (how === "use") { st.used[fig] = u.value; st.usedAt[fig] = logNow(); log(u.log, "confirmed", "ok"); }
        else { delete st.used[fig]; log(u.back, "confirmed", "ok"); }
        st.busy = null; render();
      }, 900);
    } else if (act === "hardware") toast("Opens the Mash Tun on the Hardware page, at DeltaTemp.");
    else if (act === "scribe") { e.preventDefault(); toast("Opens BrewScribe's Past brews in its own browser tab."); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && st.open) { st.open = null; st.focus = null; render(); } });
  let lastW = innerWidth, lastOne = null;
  addEventListener("resize", () => {
    const one = oneScreen();
    if (Math.abs(innerWidth - lastW) > 40 || one !== lastOne) { lastW = innerWidth; lastOne = one; render(); }
  });

  /* ---------------- the mockup's moments ---------------- */
  const MOMENTS = {
    bench: () => {},
    "bench-hlt": () => { st.open = "b17nov"; st.focus = "hlt"; st.pick = "hlt"; },
    "bench-use": () => { st.open = "b17nov"; st.focus = "hlt"; st.busy = "hlt"; },
    "bench-inuse": () => { st.used.hlt = 0.85; st.usedAt.hlt = logNow(); st.log.unshift({ t: logNow(), text: "BrewStart's efficiency set to 85 %, was 90 % (built in)", res: "confirmed", cls: "ok" }); },
    "bench-mash": () => { st.open = "b9nov"; st.focus = "mash"; st.pick = "mash"; },
    "bench-boil": () => { st.open = "b15oct"; st.focus = "boil"; st.pick = "boil"; },
    "bench-out": () => { st.out.boil = { b15oct: true }; st.open = "b15oct"; st.focus = "boil"; st.pick = "boil"; st.log.unshift({ t: logNow(), text: "THU 15 OCT left out of the boil kettle figure", res: "", cls: "" }); },
    rig: () => { st.brewery = "rig"; },
    "rig-strike": () => { st.brewery = "rig"; st.open = "r21nov"; st.focus = "strike"; st.pick = "strike"; },
    "rig-grain": () => { st.brewery = "rig"; st.open = "r21nov"; st.focus = "grain"; st.pick = "grain"; },
    "rig-mash": () => { st.brewery = "rig"; st.open = "r1nov"; st.focus = "mash"; st.pick = "mash"; },
    "rig-hlt": () => { st.brewery = "rig"; st.open = "r21nov"; st.focus = "hlt"; st.pick = "hlt"; },
    "use-refused": () => { st.refuseNext = true; },
    "use-failed": () => { st.fail = { fig: "hlt", how: "use" }; st.log.unshift({ t: logNow(), text: "HLT heating: failed: no answer in 5 s", res: "failed", cls: "bad" }); },
    "use-failing": () => { st.failNext = true; },
    "old-brewstart": () => { st.bsOld = true; },
    "old-core": () => { st.core = "old"; },
    offline: () => { st.link = "lost"; st.log.unshift({ t: logNow(), text: "Connection to CraftBeerPi lost", res: "trying again", cls: "bad" }); },
  };
  const VIEWS = { compare: 1, sizes: 1, alt: 1, phone: 1 };
  function moment() {
    const id = (location.hash || "#bench").slice(1);
    Object.assign(st, { brewery: "bench", open: null, focus: null, used: {}, usedAt: {}, busy: null, out: {}, link: "ok", pick: "hlt", note: null,
      fail: null, failNext: false, refuseNext: false, bsOld: false, core: "",
      log: [{ t: BENCH_NOW - 6 * 60, text: "Connected to CraftBeerPi", res: "", cls: "" }] });
    if (VIEWS[id]) { document.documentElement.dataset.view = id; views(id); }
    else { delete document.documentElement.dataset.view; (MOMENTS[id] || MOMENTS.bench)(); st.log[st.log.length - 1].t = logNow() - 6 * 60; render(); }
    document.querySelectorAll(".mock a[href^='#']").forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + id || (id === "bench" && a.getAttribute("href") === "#bench"))));
  }
  function frame(src, w, h, scale) {
    return `<div class="scaled" style="width:${Math.round(w * scale)}px;height:${Math.round(h * scale)}px"><iframe src="${src}" title="The proposal at ${w} × ${h}" width="${w}" height="${h}" style="transform:scale(${scale})" loading="lazy"></iframe></div>`;
  }
  function views(id) {
    const v = document.querySelector(`.view[data-for='${id === "phone" ? "sizes" : id}']`);
    const avail = Math.min(innerWidth - 40, 1880);
    if (id === "compare") {
      const half = (avail - 16) / 2, sc = half / 1920;
      v.innerHTML = `<h2>Today's Analytics beside the proposal</h2><p>Left: the page on the simulator at 8012 tonight, at 1920 × 950. I chose all three probes and pressed refresh; five seconds later CraftBeerPi still hadn't answered, and the chart was empty. When it does answer, it plots the raw temperatures on one shared scale, and two delete buttons sit beside refresh. Right: the proposal at the same size, on the bench simulator's real logs.</p><div class="pair"><figure><figcaption>Today</figcaption><img src="pictures/today-analytics-monitor.png" alt="Today's Analytics page: the old green title bar, three probe buttons chosen, refresh and two delete icons, and an empty chart."></figure><figure><figcaption>Proposed</figcaption>${frame("analytics.html?bare#bench-hlt", 1920, 950, sc)}</figure></div>`;
    } else if (id === "phone") {
      v.innerHTML = `<h2>On a phone, 390 × 844</h2><p>One figure at a time: the five buttons under the head choose it. The figure's window and USE come first, then the brews it came from; a brew opens under its row, as on the monitor. The tabs are along the bottom, as on Brew Day.</p><div class="sizes"><figure><figcaption>As it opens</figcaption>${frame("analytics.html?bare#bench", 390, 844, 1)}</figure><figure><figcaption>A brew opened</figcaption>${frame("analytics.html?bare#bench-hlt", 390, 844, 1)}</figure><figure><figcaption>The rig's grain absorption (made up)</figcaption>${frame("analytics.html?bare#rig-grain", 390, 844, 1)}</figure></div>`;
    } else if (id === "sizes") {
      const sc1 = Math.min(0.5, (avail - 16) / 1920), sc2 = sc1;
      v.innerHTML = `<h2>The same page at three sizes</h2><p>The brewer's monitor (a browser window on 1920 × 1080), a laptop at 1440 × 900, and a phone at 390 × 844. On the phone it's one figure at a time: the figure first, then the brews it came from. Everything the monitor does, the phone does.</p><div class="sizes"><figure><figcaption>1920 × 950</figcaption>${frame("analytics.html?bare#bench", 1920, 950, sc1)}</figure><figure><figcaption>1440 × 900</figcaption>${frame("analytics.html?bare#bench", 1440, 900, sc2)}</figure><figure><figcaption>390 × 844</figcaption>${frame("analytics.html?bare#bench", 390, 844, 0.72)}</figure><figure><figcaption>390 × 844, a brew opened</figcaption>${frame("analytics.html?bare#bench-hlt", 390, 844, 0.72)}</figure></div>`;
    } else if (id === "alt") {
      v.innerHTML = `<h2>The other two layouts</h2><p>The design tool deals three of my seven layouts at random, so the obvious one doesn't always win. It led with the ledger, which was chosen on 23 Nov and is the one to build. These pictures keep the other two, drawn from the same bench logs at 1920 × 950, as a record.</p><div class="alts"><article><h3>On each vessel's faceplate: each vessel's figures in its own PID window, as Brew Day's faceplates sit across the top, with one of its brews' graphs under them.</h3><img class="shot" src="pictures/18-other-layout-faceplates.png" alt="The figures as three vessel faceplates across the page." width="1920" height="950"></article><article><h3>A brew day leads: one brew's three graphs fill the page, its brews along the top, and every figure's window down the right.</h3><img class="shot" src="pictures/19-other-layout-brew-day.png" alt="One brew day's three graphs, with the figures' windows down the right." width="1920" height="950"></article></div>`;
    }
  }
  addEventListener("hashchange", moment);
  $("#mock-clock") && $("#mock-clock").addEventListener("click", () => {
    S.h24 = !S.h24; $("#mock-clock").textContent = S.h24 ? "Clock: 24-hour" : "Clock: 12-hour"; moment();
  });
  moment();
})();
