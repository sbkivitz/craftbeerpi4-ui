/* The mash water and the HLT's water, in the same words on every page that asks for them (Brew Day's strike water box
   and its MashIn row, the recipe editor's BrewStart plate), and the rules CraftBeerPi holds them to
   (design/brewday/STRIKE-WATER.md, "The mash water and the HLT's water"):

   - MASH WATER is the strike water that goes to the mash tun; HLT WATER is all the water in the HLT, strike and sparge.
     What the HLT water leaves after the mash water is the sparge water.
   - The HLT keeps the least water that covers its element and coil (leastWater, as cbpi.strike.vessels.least_water
     counts it): mash water, or HLT water, that leaves it less is kept, and one short line says so (hltLowText), as
     CraftBeerPi warns of it (hlt_low). Never refused: the figures are typed, and nothing switches on them. The Hardware
     page's Least water line says where the least comes from.
   - The mash water's water-to-grain ratio, in the brewery's units (qt/lb on a °F brewery, L/kg on a °C one), is shown
     beside it and can be typed instead of it; a ratio outside 0.75-3 qt/lb (1.6-6.3 L/kg) is said to be unusual, never
     refused.

   C is the brewery's temperature unit, "F" or "C"; vu a volume unit, "gal" or "L"; mu a mass unit, "lb" or "kg".
   Figures and units are joined by a no-break space, so a line never splits them. */

export const L_PER_GAL = 3.785411784;
export const KG_PER_LB = 0.45359237;
const QT_PER_GAL = 4;
const NB = "\u00a0";

export const MASH_WATER = {label: "MASH WATER", says: "the strike water that goes to the mash tun"};
export const HLT_WATER = {label: "HLT WATER", says: "all the water in the HLT, strike and sparge"};

/* the least water the HLT keeps where the Hardware page gives no least water of its own: this share of its capacity,
   else this much, by volume unit */
export const LEAST_SHARE = 0.15;
export const LEAST_DEFAULT = {gal: 3, L: 11.4};

/* a number above 0, from a number or its text ("8,26" too), else null */
function pos(x) {
  if (x == null || typeof x === "boolean") return null;
  const v = typeof x === "string" ? parseFloat(x.trim().replace(",", ".")) : Number(x);
  return Number.isFinite(v) && v > 0 ? v : null;
}
const r2 = x => Math.round(x * 100) / 100;
/* a volume as the pages show it: "8.26 gal" */
export const volText = (x, vu) => `${(+x).toFixed(2)}${NB}${vu}`;
/* a grain weight: "20 lb", "9.1 kg" */
export const massText = (x, mu) => `${+(+x).toFixed(1)}${NB}${mu}`;

/* -> {value: in vu, from: "hardware" | "capacity" | "default", capacity: in vu or null}: the least water the HLT keeps
   over its element and coil, from the HLT kettle's own figures on the Hardware page (min_water and capacity, kept in the
   brewery's volume unit, gal on a °F brewery and L on a °C one) */
export function leastWater(hlt, C, vu) {
  const kept = C === "C" ? "L" : "gal";
  const to = x => x == null ? null : kept === vu ? x : vu === "L" ? x * L_PER_GAL : x / L_PER_GAL;
  const own = to(pos(hlt && hlt.min_water)), cap = to(pos(hlt && hlt.capacity));
  if (own != null) return {value: r2(own), from: "hardware", capacity: cap == null ? null : r2(cap)};
  if (cap != null) return {value: r2(cap * LEAST_SHARE), from: "capacity", capacity: r2(cap)};
  return {value: LEAST_DEFAULT[vu] ?? LEAST_DEFAULT[kept], from: "default", capacity: null};
}
/* the sparge water left: the HLT water less the mash water, or null while either isn't known */
export const spargeLeft = (hlt, mash) => pos(hlt) == null || pos(mash) == null ? null : r2(hlt - mash);
export function spargeText(hlt, mash, vu) {
  const left = spargeLeft(hlt, mash);
  if (left == null) return "";
  return left < 0 ? "Sparge water left: none, as the mash water is more than the HLT water" : `Sparge water left: ${volText(left, vu)}`;
}
/* whether mash water `mash` leaves the HLT's `hlt` less than the least (`least`: {value, from, capacity}) */
export const hltLow = (hlt, mash, least) => pos(mash) != null && pos(hlt) != null && !!least && hlt - mash < least.value - 1e-9;
/* the warning, as CraftBeerPi words it: "Leaves 0.5 gal in the HLT, under its 3.0 gal minimum.", `left` the water the HLT
   keeps after the mash water (none where the mash water is more). Figures to one place, or two where one would show
   them the same */
export function hltLowText(left, least, vu) {
  const l = Math.max(0, +left), m = +least, p = Math.round(l * 10) < Math.round(m * 10) ? 1 : 2;
  return `Leaves ${l.toFixed(p)}${NB}${vu} in the HLT, under its ${m.toFixed(p)}${NB}${vu} minimum.`;
}

/* ---------- the water-to-grain ratio ---------- */
export const ratioUnit = C => C === "C" ? "L/kg" : "qt/lb";
export const RATIO_RANGE = {"qt/lb": [0.75, 3], "L/kg": [1.6, 6.3]};
const litres = (x, vu) => vu === "L" ? x : x * L_PER_GAL;
const kilos = (x, mu) => mu === "kg" ? x : x * KG_PER_LB;
/* the ratio `water` (in vu) gives for `grain` (in mu), in ratioUnit(C), or null without both */
export function waterRatio(water, vu, grain, mu, C) {
  const w = pos(water), g = pos(grain);
  if (w == null || g == null) return null;
  const L = litres(w, vu), kg = kilos(g, mu);
  return C === "C" ? L / kg : (L / L_PER_GAL * QT_PER_GAL) / (kg / KG_PER_LB);
}
/* the water, in vu, that `ratio` (in ratioUnit(C)) gives for `grain` (in mu), or null without both */
export function waterForRatio(ratio, grain, mu, vu, C) {
  const q = pos(ratio), g = pos(grain);
  if (q == null || g == null) return null;
  const kg = kilos(g, mu), L = C === "C" ? q * kg : q * (kg / KG_PER_LB) / QT_PER_GAL * L_PER_GAL;
  return vu === "L" ? L : L / L_PER_GAL;
}
export const ratioText = (q, C) => `${+(+q).toFixed(2)}${NB}${ratioUnit(C)}`;
/* outside the usual range, to the two places shown */
export function ratioUnusual(q, C) {
  if (q == null) return false;
  const [lo, hi] = RATIO_RANGE[ratioUnit(C)], x = r2(q);
  return x < lo || x > hi;
}
export function ratioWarning(q, C) {
  if (!ratioUnusual(q, C)) return "";
  const u = ratioUnit(C), [lo, hi] = RATIO_RANGE[u];
  return `${ratioText(q, C)} is unusual: most mashes take ${lo} to ${hi}${NB}${u}. ${r2(q) > hi ? "Is that the mash water alone, not all the HLT's water?" : "Check the mash water and the grain weight."}`;
}
/* the mash water as every page shows it: "8.26 gal · 1.5 qt/lb for 20 lb", its ratio from the water for the grain
   (BeerSmith's for_grain, without what goes under a false bottom) when known, else from the mash water; the figure
   alone without a grain weight */
export function mashWaterText({water, forGrain, vu, grain, mu, C}) {
  const q = waterRatio(pos(forGrain) ?? water, vu, grain, mu, C);
  return `${volText(water, vu)}${q != null ? ` · ${ratioText(q, C)} for ${massText(grain, mu)}` : ""}`;
}
