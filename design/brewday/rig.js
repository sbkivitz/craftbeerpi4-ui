"use strict";
/* Brewhouse drawing. It is drawn to the width of its box, so each vessel lines up with its own faceplate.
   style "kettle" (layout A): flat steel homebrew kettles on a stand.  style "line" (layout B): line drawing. */
const RIG_H = 470;
const r1 = n => Math.round(n * 10) / 10;
const RIG_ST = {
  kettle: {
    lidY: x => { const t = (x + 117) / 234; return 103 - 64 * t * (1 - t); },
    outY: () => 311
  },
  line: {
    lidY: x => { const t = (x + 112) / 224; return 112 - 112 * t * (1 - t); },
    outY: x => { const t = (112 - x) / 224; return 286 + 60 * t * (1 - t); }
  }
};
const RIG_V = [
  {id: "hlt", name: "HOT LIQUOR TANK", coil: true, el: true, box: -1, vx: 10},
  {id: "mt", name: "MASH TUN", fb: true, vx: -10},
  {id: "bk", name: "BOIL KETTLE", el: true, box: 1, vx: 0}
];

/* ySp: the sparge line, from the HLT pump over the hot liquor tank to the top of the mash tun.
   vCoil, vBk, vRet, vSp: the hand valves on the coil line, the boil kettle line, the HLT return and the sparge line. */
function rigGeom(W) {
  const a = W / 6, m = W / 2, k = W * 5 / 6;
  return {W, a, m, k, x: [a, m, k], yTop: 50, ySp: 22, yPump: 352, yLow: 458,
    hltPump: a - 60, wortPump: m - 70, hltValve: a + 10, mtValve: m - 10,
    hltRiser: a - 160, coilRiser: a + 160, coilTopRiser: a + 186, tee: m - 120, xferRiser: k - 165,
    hltRet: a - 70, mtRet: m - 75, bkRet: k - 95, spargeIn: m,
    vCoil: (a + 160 + m - 120) / 2, vBk: (m - 120 + k - 165) / 2, vRet: a - 115, vSp: a + 60};
}
function zigzag(y) {
  let d = `M-84 ${y} H-70 l7 -9`;
  for (let i = 0; i < 9; i++) d += ` l14 ${i % 2 ? -18 : 18}`;
  return d + " l7 -9 H84";
}
function coilLoops() {
  let s = "";
  for (let i = 0; i < 7; i++) s += `<ellipse cx="-4" cy="${164 + i * 13}" rx="74" ry="5.5"/>`;
  return s + '<path d="M70 164 H112 M70 242 H112"/>';
}
function bands(spec) {
  return spec.split("|").map(b => { const [c, f, t] = b.split(" "); return `<stop offset="${f}" stop-color="${c}"/><stop offset="${t}" stop-color="${c}"/>`; }).join("");
}

/* A: homebrew kettle (lid and knob, side handles, thermometer, ball valve, element box), flat steel shading */
function kettleA(v, x) {
  const ticks = [];
  for (let d = -120; d <= 120; d += 30) {
    const s = Math.sin(d * Math.PI / 180), c = -Math.cos(d * Math.PI / 180);
    ticks.push(`M${r1(s * 8)} ${r1(c * 8)} L${r1(s * 10.5)} ${r1(c * 10.5)}`);
  }
  const bx = v.box < 0 ? -131 : 112;
  return `<g class="kettle" transform="translate(${r1(x)} 0)">
<path class="k-handle" d="M-112 120 H-123 a12 12 0 0 0 -12 12 v4 a12 12 0 0 0 12 12 H-112"/><path class="k-handle" d="M112 120 H123 a12 12 0 0 1 12 12 v4 a12 12 0 0 1 -12 12 H112"/>
<rect class="k-plate" x="-117" y="115" width="8" height="11" rx="2"/><rect class="k-plate" x="-117" y="142" width="8" height="11" rx="2"/><rect class="k-plate" x="109" y="115" width="8" height="11" rx="2"/><rect class="k-plate" x="109" y="142" width="8" height="11" rx="2"/>
${v.box ? `<rect class="k-box" x="${bx}" y="238" width="19" height="42" rx="3"/><rect class="k-gland" x="${bx + 5.5}" y="280" width="8" height="7" rx="1.5"/>` : ""}
<path class="k-body" d="M-112 110 H112 V286 Q112 300 98 300 H-98 Q-112 300 -112 286 Z"/>
<path class="k-base" d="M-112 283 H112 V286 Q112 300 98 300 H-98 Q-112 300 -112 286 Z"/>
<rect class="k-rim" x="-116" y="106" width="232" height="8" rx="4"/>
<path class="k-lid" d="M-117 103 Q0 71 117 103 Z"/>
<rect class="k-lip" x="-120" y="100" width="240" height="7" rx="3.5"/>
<rect class="k-stem" x="-5" y="78" width="10" height="10"/><rect class="k-knob" x="-17" y="68" width="34" height="12" rx="6"/><rect class="k-shine" x="-12" y="70.5" width="15" height="2.5" rx="1.25"/>
${v.coil ? `<g class="coil-o">${coilLoops()}</g><g class="coil" id="coil">${coilLoops()}</g>` : ""}
${v.fb ? '<path class="k-fb" d="M-100 262 H100"/>' : ""}
${v.el ? `<rect class="el-cap" x="-96" y="262" width="12" height="12" rx="3"/><rect class="el-cap" x="84" y="262" width="12" height="12" rx="3"/><path class="element" id="el-${v.id}" d="${zigzag(268)}"/>` : ""}
<g class="therm" transform="translate(86 136)"><circle class="t-bezel" r="14"/><circle class="t-face" r="11.2"/><path class="t-tick" d="${ticks.join(" ")}"/><g id="needle-${v.id}"><path class="t-needle" d="M0 2.5 V-8.5"/></g><circle class="t-hub" r="2"/></g>
<rect class="v-neck" x="${v.vx - 5}" y="290" width="10" height="10"/><rect class="v-lever" x="${v.vx + 8}" y="294" width="30" height="5" rx="2.5"/><rect class="v-body" x="${v.vx - 12}" y="299" width="24" height="12" rx="3"/>
</g>`;
}

/* B: line drawing of a vessel */
function vesselB(v, x) {
  let dots = "";
  if (v.fb) for (let d = -96; d <= 90; d += 12) dots += `<circle cx="${d}" cy="256" r="2.4"/><circle cx="${d + 6}" cy="265" r="2.4"/>`;
  return `<g class="vessel" transform="translate(${r1(x)} 0)">
<rect class="v-shell" x="-13" y="70" width="26" height="18"/><path class="v-line" d="M-20 70 H20"/>
<path class="v-shell" d="M-112 286 V112 Q0 56 112 112 V286 Q0 316 -112 286 Z"/>
<path class="v-line" d="M-88 291 V316 M88 291 V316 M-98 316 H-78 M78 316 H98"/>
<text class="v-name" y="142">${v.name}</text>
${v.coil ? `<g class="coil" id="coil">${coilLoops()}</g>` : ""}
${v.fb ? `<g class="v-dots">${dots}</g>` : ""}
${v.el ? `<path class="element" id="el-${v.id}" d="${zigzag(268)}"/>` : ""}
</g>`;
}

/* rs: how much bigger to set the labels when the drawing is drawn small (the faceplate-graphs proposal); 1 = as designed */
function rigPump(id, x, y, med, name, rs = 1) {
  const y1 = r1(68 - 33 * (rs - 1)), y2 = r1(y1 + 22 * rs), y3 = r1(y2 + 22 * rs);
  return `<g class="pump ${med}" id="pump-${id}" transform="translate(${r1(x)} ${y})">
<path class="p-base" d="M-20 24 L-14 15 H14 L20 24 Z"/><circle class="p-ring" r="22"/><path class="p-tri" d="M8 -11 L-11 0 L8 11 Z"/>
<text class="p-name" x="-24" y="${y1}">${name}</text><text class="p-st" x="-24" y="${y2}">OFF</text><text class="tag p-ovr" x="-24" y="${y3}"></text></g>`;
}
function rigLine(id, med, paths, chev) {
  const layer = c => paths.map(d => `<path class="${c}" d="${d}"/>`).join("");
  const ch = chev.map(([x, y, a]) => `<path class="ch" d="M-4.5 -5.5 L3.5 0 L-4.5 5.5" transform="translate(${r1(x)} ${r1(y)}) rotate(${a})"/>`).join("");
  return `<g class="ln ${med}" id="${id}">${layer("pf")}${layer("pd")}${ch}</g>`;
}
/* a hand valve: CraftBeerPi can't see it, so its position is drawn from the recipe step (renderRig). alt: where its tag
   goes instead while it reads SET OPEN or SET CLOSED, for a valve whose run is too short for those words.
   A tag under its valve moves down as it grows with rs (13 units is the height of its capitals at rs 1), so with graphs
   it doesn't touch the bowtie. The sparge valve's sits closest: ySp + 10 + 20 * rs, which also clears it a little more
   without graphs, so the gap stays about a third of the tag's height (at least 2 clean px from 1366 wide up, while
   the drawing is at its usual size). The HLT return's is yTop + 19 + 13 * rs: unchanged without graphs (82). The
   coil's, lower down, already has room */
function rigValve(id, x, y, med, tx, ty, anchor, alt) {
  const at = alt ? ` data-alt="${r1(alt[0])} ${alt[1]} ${alt[2]}"` : "";
  return `<g class="valve ${med}" id="vl-${id}" transform="translate(${r1(x)} ${y})"><path d="M-13 -9 L13 9 V-9 L-13 9 Z"/></g><text class="tag vtag" id="vt-${id}" x="${r1(tx)}" y="${ty}"${anchor ? ` text-anchor="${anchor}"` : ""}${at}></text>`;
}

function rigSVG(style, W, rs = 1) {
  const S = RIG_ST[style], g = rigGeom(W), A = style === "kettle";
  const {a, m, k, yTop, ySp, yPump, yLow} = g, n = r1;
  const hRet = S.lidY(g.hltRet - a) + 1, mRet = S.lidY(g.mtRet - m) + 1, bRet = S.lidY(g.bkRet - k) + 1;
  const hOut = S.outY(g.hltValve - a), mOut = S.outY(g.mtValve - m);
  const hp = g.hltPump, wp = g.wortPump;
  /* each pump's line is split where it branches, so the drawing can show either way:
     HLT pump: back round the hot liquor tank, or (layout B only) over to the top of the mash tun for the sparge;
     wort pump: through the HERMS coil and back into the mash tun, or down and across to the boil kettle */
  const hltIn = [`M${n(g.hltValve)} ${n(hOut)} V${yPump} H${n(hp + 22)}`];
  const hltUp = [`M${n(hp - 22)} ${yPump} H${n(g.hltRiser)} V${yTop}`];
  const hltRet = [`M${n(g.hltRiser)} ${yTop} H${n(g.hltRet)} V${n(hRet)}`];
  const sparge = [`M${n(g.hltRiser)} ${yTop} V${ySp} H${n(g.spargeIn)} V70`];
  const wortIn = [`M${n(g.mtValve)} ${n(mOut)} V${yPump} H${n(wp + 22)}`];
  const wortOut = [`M${n(wp - 22)} ${yPump} H${n(g.tee)}`];
  const coil = [`M${n(g.tee)} ${yPump} H${n(g.coilRiser)} V242 H${n(a + 112)}`,
    `M${n(a + 112)} 164 H${n(g.coilTopRiser)} V${yTop} H${n(g.mtRet)} V${n(mRet)}`];
  const xfer = [`M${n(g.tee)} ${yPump} V${yLow} H${n(g.xferRiser)} V${yTop} H${n(g.bkRet)} V${n(bRet)}`];
  const outline = [...(A ? [] : sparge), ...hltRet, ...hltIn, ...hltUp, ...xfer, ...coil, ...wortIn, ...wortOut];
  const chIn = [[g.hltValve, (hOut + yPump) / 2, 90]], chUp = [[g.hltRiser, (yTop + yPump) / 2, -90]];
  const chRet = [[g.hltRet, (yTop + hRet) / 2, 90]];
  const chSp = [[(g.hltRiser + g.vSp) / 2, ySp, 0], [(g.vSp + g.spargeIn) / 2, ySp, 0], [g.spargeIn, (ySp + 70) / 2, 90]];
  const chWin = [[g.mtValve, (mOut + yPump) / 2, 90]];
  const chCoil = [[g.coilRiser, (242 + yPump) / 2, -90], [g.coilTopRiser, (164 + yTop) / 2, -90], [(g.coilTopRiser + g.mtRet) / 2, yTop, 0]];
  const chX = [[g.tee, (yPump + yLow) / 2, 90], [(g.vBk + g.xferRiser) / 2, yLow, 0], [g.xferRiser, (yTop + yLow) / 2, -90], [(g.xferRiser + g.bkRet) / 2, yTop, 0]];
  const nx = g.xferRiser + 26;
  const legs = [10, W / 3 - 8, W * 2 / 3 - 8, W - 26];
  const defs = `<defs><filter id="glow" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>${A ? `
<linearGradient id="g-body">${bands("#5d6e81 0 .05|#9cacbd .05 .15|#8596a8 .15 .74|#78899c .74 .92|#637487 .92 1")}</linearGradient>
<linearGradient id="g-lid">${bands("#6e7f92 0 .06|#b3c1ce .06 .2|#9aaaba .2 .78|#8b9bac .78 .94|#76879a .94 1")}</linearGradient>` : ""}</defs>`;
  const stand = A ? `<g class="stand">${legs.map(x => `<rect x="${n(x)}" y="314" width="16" height="76"/><rect x="${n(x - 4)}" y="390" width="24" height="6" rx="2"/>`).join("")}<rect x="10" y="300" width="${n(W - 20)}" height="14"/><rect x="10" y="376" width="${n(W - 20)}" height="14"/></g>
<g class="stand-hi"><rect x="10" y="300" width="${n(W - 20)}" height="2"/><rect x="10" y="376" width="${n(W - 20)}" height="2"/></g>
<g class="bolts">${legs.map(x => `<circle cx="${n(x + 8)}" cy="307" r="2.4"/><circle cx="${n(x + 8)}" cy="383" r="2.4"/>`).join("")}</g>` : "";
  const names = A ? RIG_V.map((v, i) => `<text class="k-name" x="${n(g.x[i])}" y="30">${v.name}</text>`).join("") : "";
  const vessels = RIG_V.map((v, i) => (A ? kettleA : vesselB)(v, g.x[i])).join("\n");
  const fits = A ? [[g.hltRet, hRet], [g.mtRet, mRet], [g.bkRet, bRet]].map(([x, y]) => `<rect class="fit" x="${n(x - 10)}" y="${n(y - 8)}" width="20" height="9" rx="2"/>`).join("") : "";
  return `<svg id="rigsvg" class="rig-${style}" viewBox="0 0 ${n(W)} ${RIG_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="rig-t rig-d"${rs !== 1 ? ` style="--rs:${rs}"` : ""}>
<title id="rig-t">Brewhouse drawing</title>
<desc id="rig-d"></desc>
${defs}${stand}${names}
${vessels}
<g class="ln-o">${outline.map(d => `<path class="po" d="${d}"/>`).join("")}</g>
${A ? "" : rigLine("ln-sparge", "liq", sparge, chSp)}
${rigLine("ln-hlt-ret", "liq", hltRet, chRet)}
${rigLine("ln-hlt-in", "liq", hltIn, chIn)}
${rigLine("ln-hlt-up", "liq", hltUp, chUp)}
${rigLine("ln-xfer", "wrt", xfer, chX)}
${rigLine("ln-wort-coil", "wrt", coil, chCoil)}
${rigLine("ln-wort-in", "wrt", wortIn, chWin)}
${rigLine("ln-wort-out", "wrt", wortOut, [])}
${A ? "" : rigValve("sp", g.vSp, ySp, "liq", g.vSp, n(ySp + 10 + 20 * rs), "middle")}
${rigValve("ret", g.vRet, yTop, "liq", g.vRet, n(yTop + 19 + 13 * rs), "middle", A ? null : [g.hltRiser - 14, yTop + 8, "end"])}
${rigValve("coil", g.vCoil, yPump, "wrt", g.vCoil, yPump + 36, "middle")}
${rigValve("bk", g.vBk, yLow, "wrt", g.vBk + 22, yLow - 13, "")}
${fits}
${rigPump("hlt", hp, yPump, "liq", "HLT PUMP", rs)}${rigPump("wort", wp, yPump, "wrt", "WORT PUMP", rs)}
<text class="tag vnote" x="${n(nx)}" y="${yPump + 68}">VALVES ARE SET BY HAND<tspan id="vnote-2" x="${n(nx)}" dy="${n(22 * rs)}"></tspan></text>
</svg>`;
}
