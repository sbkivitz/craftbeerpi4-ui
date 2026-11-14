// The temperature graphs' history on the live screen; graphs.js draws it, as in the mockup.
//
// When the screen connects it reads the brew day so far from CraftBeerPi's logs (POST /log/window): each vessel's
// temperature, and each kettle's target and AUTO and each element's level, which CraftBeerPi logs when they change.
// From then on it adds a row every 10 s from the readings the screen is sent, as the mockup does. After a lost
// connection it reads the logs again, which fills in the time it missed.
//
// Times are CraftBeerPi's brewing clock, which its logs and steps are stamped in: the wall clock on the rig,
// SIM_TIME_SCALE times as fast in a simulation. The log window's answer says where that clock is and how fast it
// runs. A row's time is seconds since a local midnight, as the mockup's (st.t); past the next midnight it goes on
// counting, and the graphs' clock labels wrap.
import { api } from "./api";
import { num } from "./live";

const STEP = 10;                // a row every 10 s
const MAX_BACK = 24 * 3600;     // DAY reaches back a day at most
const NO_RECIPE = 8 * 3600;     // DAY without a recipe's start times: the last 8 hours (design/brewday/BUILD-NOTES.md)
const POINTS = 2000;            // the most readings a log window gives (LogController.WINDOW_POINTS_MAX)
const FILL = 180;               // at most 30 minutes of rows filled in between two ticks; longer, the logs are read again
const RETRY_MS = 60000;         // a log window that failed is asked for again after a minute
const SYNC_MS = 60000;          // and where the brewing clock is, once a minute

const midnight = (e) => { const d = new Date(e * 1000); d.setHours(0, 0, 0, 0); return d.getTime() / 1000; };

// Readings in time order, looked up in increasing time: what was held at a time, or the line through it.
function reader(s) {
  const T = (s && Array.isArray(s.t)) ? s.t : [], V = (s && Array.isArray(s.v)) ? s.v : [];
  let i = 0; // the first reading after the time asked for
  const seek = (e) => { while (i < T.length && T[i] <= e) i++; };
  return {
    hold(e) { seek(e); return i > 0 ? num(V[i - 1]) : null; },
    // a straight line between the readings either side, but none across a gap in the log longer than `gap`
    line(e, gap) {
      seek(e);
      const a = i - 1, b = i;
      if (a < 0) return null;
      const va = num(V[a]);
      if (b >= T.length) return e - T[a] <= gap ? va : null;
      if (T[b] - T[a] > gap) return e - T[a] <= 2 * STEP ? va : null;
      const vb = num(V[b]);
      return va == null || vb == null ? va : va + (vb - va) * (e - T[a]) / (T[b] - T[a]);
    }
  };
}

export function createHistory() {
  let clk = { srv: Date.now() / 1000, at: Date.now(), scale: 1 }, fixed = false;
  const epoch = () => clk.srv + ((Date.now() - clk.at) / 1000) * clk.scale;
  let T0 = midnight(epoch());
  const hist = { start: epoch() - T0 - NO_RECIPE, steps: [], v: { hlt: [], mt: [], bk: [] } };
  let starts = [], lastT = null, gapped = true, stale = false, from = null, busy = false, failedAt = 0;
  const now = () => epoch() - T0;

  // DAY starts when the recipe's first step started (CraftBeerPi keeps the time), else 8 hours ago
  function place() {
    hist.steps = starts.map(([e, n]) => [e - T0, n]);
    const e = epoch(), first = starts.length ? Math.min(...starts.map((s) => s[0])) : null;
    hist.start = (first != null && e - first <= MAX_BACK ? first : e - NO_RECIPE) - T0;
  }
  // the times a recipe's steps started, numbered as the recipe numbers them
  function steps(list) {
    const next = [];
    (list || []).forEach((s, i) => { const e = num(s && s.props && s.props._started_at); if (e != null && e > 0) next.push([e, i + 1]); });
    if (next.length === starts.length && next.every((x, i) => x[0] === starts[i][0] && x[1] === starts[i][1])) return false;
    starts = next;
    place();
    return true;
  }
  // from when the graphs need rows: DAY's start, or 30 minutes back if that is earlier
  const need = () => T0 + Math.min(hist.start, now() - 1800) - 60;

  // Where the brewing clock is and how fast it runs, from a log window that reads no logs. Before the first window,
  // so that window is asked for in the brewing clock's time: a simulator's runs ahead of the browser's, and a window
  // worked out on the browser's would reach a day and more back. Then once a minute, because the clock can move while the
  // connection stays up: SIM_TIME_SCALE changed, or a Pi's clock put right by the network after a power cut. Moved
  // by more than a row, or at another speed, the rows are out of step with it, so the logs are read again.
  let syncedAt = 0, syncing = false;
  async function sync() {
    if (syncing) return false;
    syncing = true;
    let res = null;
    try { res = await api.logWindow([], null, null); } catch (e) { res = null; } finally { syncing = false; }
    syncedAt = Date.now();
    const d = res && res.ok && res.data;
    if (!d || typeof d !== "object" || !(num(d.now) > 0)) return false;
    const scale = num(d.scale) > 0 ? num(d.scale) : 1, moved = Math.abs(num(d.now) - epoch()) > STEP || scale !== clk.scale;
    clk = { srv: num(d.now), at: Date.now(), scale };
    if (moved && fixed) stale = true;
    return true;
  }
  const syncDue = () => fixed && !busy && !syncing && Date.now() - syncedAt > SYNC_MS;

  // names: {hlt|mt|bk: {pv, sv, auto, out, herms}}, the logs' names; herms is the mash tun's AUTO, under which a
  // HERMS holds the HLT's target
  async function load(names) {
    if (busy) return false;
    const list = [];
    Object.values(names).forEach((n) => ["pv", "sv", "auto", "out", "herms"].forEach((k) => { if (n[k]) list.push(n[k]); }));
    if (!list.length) return false;
    busy = true;
    if (!fixed) {
      if (!(await sync())) { busy = false; failedAt = Date.now(); return false; }
      // the clock's day, once: after that a row's time goes on counting past midnight
      T0 = midnight(epoch()); fixed = true;
      place();
    }
    const since = need(), points = Math.min(POINTS, Math.ceil((epoch() - since) / STEP) + 10);
    const res = await api.logWindow([...new Set(list)], since, points);
    busy = false;
    const d = res && res.ok && res.data;
    if (!d || typeof d !== "object" || !d.series || !(num(d.now) > 0)) { failedAt = Date.now(); return false; }
    clk = { srv: num(d.now), at: Date.now(), scale: num(d.scale) > 0 ? num(d.scale) : 1 };
    syncedAt = Date.now();
    place();
    const t0 = Math.ceil((since - T0) / STEP) * STEP, t1 = Math.floor(now() / STEP) * STEP;
    // nothing across a stretch longer than two minutes, or three of the thinned log's slices if they are longer
    const gap = Math.max(120, 3 * (epoch() - since) / points);
    for (const v of ["hlt", "mt", "bk"]) {
      const n = names[v] || {}, s = d.series;
      const P = reader(s[n.pv]), S = reader(s[n.sv]), A = reader(s[n.auto]), O = reader(s[n.out]), HA = reader(s[n.herms]);
      const rows = [];
      if (n.pv) {
        for (let t = t0; t <= t1; t += STEP) {
          const e = T0 + t, pv = P.line(e, gap), driven = A.hold(e) === 1 || HA.hold(e) === 1, sv = driven ? S.hold(e) : null, out = n.out ? O.hold(e) : null;
          rows.push([t, pv == null ? null : +pv.toFixed(2), sv, out == null ? null : Math.round(out)]);
        }
      }
      hist.v[v] = rows;
    }
    lastT = t1; gapped = false; stale = false; from = since; failedAt = 0;
    return true;
  }
  // whether to read the logs (again): never read; a stretch too long to fill in, or the clock moved; DAY now reaching
  // further back than they were read from. Never within a minute of a read that failed: one that keeps failing - a
  // core without the log window, a server too busy to answer - is asked again once a minute, not every second.
  const due = () => !busy && (!failedAt || Date.now() - failedAt > RETRY_MS) && (stale || from == null || need() < from - 60);

  // A row every 10 s from what the screen shows (row(v, t)), none while the connection is lost. A fast clock, or a
  // browser that slows a hidden tab's timer, moves on several rows between ticks: they are filled in, the
  // temperature on a straight line. After a lost connection they are not: the gap shows until the logs are read.
  function tick(row, live) {
    if (!live) { gapped = true; return false; }
    if (syncDue()) sync();
    const slot = Math.floor(now() / STEP) * STEP;
    if (!starts.length) place();
    if (lastT != null && slot <= lastT) return false;
    const n = lastT == null || gapped ? 1 : (slot - lastT) / STEP;
    // back after a lost connection, or too long to fill in: the logs have what was missed
    if (n > FILL || (gapped && lastT != null)) stale = true;
    const fill = Math.min(n, FILL);
    for (const v of ["hlt", "mt", "bk"]) {
      const rows = hist.v[v], r = row(v, slot), p = rows.length ? rows[rows.length - 1] : null;
      for (let k = fill - 1; k >= 1; k--) {
        const t = slot - k * STEP, pv = p && p[1] != null && r[1] != null ? +(p[1] + (r[1] - p[1]) * (t - p[0]) / (slot - p[0])).toFixed(2) : r[1];
        rows.push([t, pv, r[2], r[3]]);
      }
      rows.push(r);
      const old = slot - MAX_BACK - 1800;
      if (rows.length && rows[0][0] < old) hist.v[v] = rows.filter((x) => x[0] >= old);
    }
    lastT = slot; gapped = false;
    return true;
  }

  return { hist, now, steps, load, due, tick, scale: () => clk.scale, day: () => T0 };
}
