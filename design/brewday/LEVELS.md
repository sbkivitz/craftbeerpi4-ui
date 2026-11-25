# The liquid in each vessel (proposal, 25 Nov 2026)

The brewer: "It would be nice to see a subtle visual representation of the amount of liquid in each vessel as the
brew day progresses".

This is a proposal, a mockup to choose from. Nothing here is built. Without `?levels=` the mockup is as it was.

## Read first

- Norman, The Design of Everyday Things: the drawing is a conceptual model, and a figure the screen works out is part
  of it; it must be honest about what it is.
- Nielsen #1 and the checklist's F9 and H21: a figure the screen works out, or one that is stale, must look unlike a
  live reading, and must never pretend to be live.
- High-performance HMI (ISA-101, Hollifield) and the checklist's F15, F17 and H3: normal stays quiet, and colour is
  for what needs attention. H5 says a plant drawing shouldn't colour its contents at all; the brewer asked for it, so
  the colour stays faint, the drawing's own liquor and wort colours at a tenth of their strength.
- The checklist's F10, F18 and H1: a figure with its context (here, the vessel's size and its minimum).
- WCAG 1.4.1 and 2.3.3, W3C WAI's complex images: never colour or motion alone; the drawing says the same in words.
- NN/g, proximity: the figure sits on its vessel.

## What CraftBeerPi knows, and what it doesn't

- **No level is measured today.** The rig has no level sensors. Asked, the brewer said: "Not yet, but I may add
  them". So the estimate comes first, and a measured level has its place in the design for when a vessel gets a
  sensor (below).
- **What the figures can come from**, all already in CraftBeerPi:
  - BrewStart's water: what it heats in the HLT, so once it runs, that water is in the HLT;
  - the strike water and the grain, from the recipe's mash numbers (the strike water helper has them);
  - the sparge water and the boil volume, from the recipe;
  - the step list: which step runs, whether BrewStart's "Move the strike water…" question waits, whether MashIn's
    "Please add malt" was answered, whether the runoff runs, whether the boil has started to boil;
  - each vessel's capacity, from the Hardware page.
- **Not yet in CraftBeerPi:** the recipe's volume after the boil (BeerXML's batch size plus its trub and chiller loss,
  or its evaporation rate), and the element-cover minimum, which the mash water guard is adding.
- **On a simulator** cbpi4-simvessel models each vessel's real fill. The screen doesn't show it: a simulator shows
  the same worked-out figures the rig would, so it previews the rig. A simulated level sensor, if one is ever added,
  would be shown as a sensor's reading, as on the rig.

## The design

Two looks, behind `?levels=`:

- **Tint** (`?levels=tint`, recommended): a faint fill of the liquid inside each vessel's outline, under its coil,
  element and name: the liquor's blue for water, the wort's gold for mash and wort, at about a tenth of their
  strength. Its surface is a dashed line.
- **Line** (`?levels=line`): the dashed surface alone.

In both:

- **Worked out, so it says so.** Every surface is dashed and every figure has "≈". A solid line would mean a measured
  level, which nothing on the rig gives today.
- **Where it is going, never a guess at where it is.** While liquid moves (the strike water, the sparge and runoff,
  the boil-off), the screen can't know how far it has got, so it shows the range: hatched from where it was to where
  it is going (Line: a dotted line where it was), with the figure it is heading to, "→ ≈ 6.7 GAL". Nothing moves on
  its own, and nothing counts down with the clock.
- **The figure in the dome**, "≈ 9.9 GAL", in the drawing's quiet tag style. The dome is the one place clear in all
  three vessels (the HLT's coil fills its middle). The boil kettle's gives way to the lid's question while the Steam
  Slayer's lid reminder waits.
- **SPENT GRAIN** in the mash tun's dome once the runoff is over, and no fill: the screen can't tell how much wort the
  grain still holds.
- **MIN**, a short mark across the left wall of the HLT and the boil kettle, at the element-cover minimum, in the
  drawing's steel. It stays quiet even when the worked-out level is below it: stopping an element over a level the
  screen only works out is the mash water guard's job, not the drawing's.
- **Scaled to the vessel.** The fill's height is the figure over the vessel's capacity from the Hardware page. A
  vessel with no capacity shows its figure, but no fill.
- **Words:** a mouse pointer on a vessel's liquid shows its line ("Wort 7.0 → ≈ 6.3 gal · boiling off. Worked out, not
  measured."), and the drawing's words for screen readers say each vessel's figure and that it is worked out, not
  measured.
- **On a phone**, which has no drawing, one quiet line under each vessel's own (the Steam Slayer's style): "Water ≈
  6.7 gal · less the strike water", "Mash ≈ 9.9 gal · strike water and 20 lb of grain", "Wort 0 → ≈ 7.0 gal · running
  off". On one line at 360 px wide, so the buttons under it don't move.

### A level sensor's reading, when a vessel has one

None of the rig's vessels has a level sensor yet. When one does:

- **Measured looks different from worked out**, in shape and in words, never in colour alone:
  - its surface is a **solid** line, a little stronger than the estimate's dashes, and the tint is drawn to it;
  - its figure has **no "≈"**: "6.4 GAL", where the estimate says "≈ 7.0 GAL";
  - the tooltip and the words for screen readers say "measured", and that the dashed line is the estimate;
  - on a phone, "Wort 6.4 gal measured · estimate ≈ 7.0, 0.6 less".
- **The estimate stays beside it**, as a dashed line with no tint or hatching of its own, so the two lines show at
  a glance how they compare. While liquid moves, the dashed line is where the move is going ("3.1 → ≈ 7.0 GAL"), and
  the reading rises or falls towards it; the hatching goes, as the reading says where the liquid is.
- **Both figures only where they differ.** When the reading is within a quart (0.25 gal, about 1 L) of the estimate,
  or inside the range a move is in, the dome shows the reading alone, and the two lines lie together. Further apart,
  the dome says both, "6.4 GAL · ≈ 7.0", and the phone says by how much. A difference is shown, not alarmed: it may be
  the recipe's figures, not the vessel, that are off.
- **A reading the estimate can't know**, such as the HLT filled the night before, before BrewStart runs: the reading
  alone, "15.0 GAL", or EMPTY.
- **No connection:** the last reading's surface in the drawing's steel, solid, with no tint, and "LAST 6.4 GAL", as a
  pump says LAST: ON. It never looks live.
- **A sensor with no reading** (unplugged, or a reading that isn't a number): the vessel falls back to the estimate,
  drawn as without a sensor, and the phone's line says "level sensor: no reading".
- **MIN** stays a quiet mark. A measured level under it is a real reading the mash water guard could act on; that is
  for the guard to decide when it has one.

Where it would be set: on the Hardware page, in each vessel's group, "Level sensor": none (the default) or one of
CraftBeerPi's sensors that reads the vessel's volume, with its unit (gal or L). A vessel without one is drawn as
today's proposal draws it.

### Through the brew day

The mockup's Test Recipe v5 (the figures BrewScribe's readings use): 15 gal of BrewStart's water, 8.26 gal of strike
water, 20 lb of grain, 5.00 gal of sparge water, a 7.00 gal boil; 6.3 gal after the boil is an example. The test recipe's
figures don't add up, as a real one's would.

| Moment | Hot liquor tank | Mash tun | Boil kettle |
|---|---|---|---|
| Before BrewStart runs | nothing | nothing | nothing |
| BrewStart heating (`#sw-heat`) | ≈ 15.0, BrewStart's water | nothing | nothing |
| "Move the strike water…" waiting (`#sw-move`) | 15.0 → ≈ 6.7, hatched | 0 → ≈ 8.3, hatched | nothing |
| MashIn, asking for the malt (`#sw-doughin`) | ≈ 6.7 | ≈ 8.3 of water | nothing |
| The mash (`#mash`) | ≈ 6.7 | ≈ 9.9 of mash (8.26 gal and 20 lb at 0.08 gal a lb) | nothing |
| The sparge and runoff (`#sparge-run`) | 6.7 → ≈ 1.7, hatched | ≈ 9.9 | 0 → ≈ 7.0, hatched |
| Ready to boil? (`#boil-hold`), heating (`#heatup`) | ≈ 1.7, under MIN | SPENT GRAIN | ≈ 7.0, the recipe's boil volume |
| Boiling (`#hop`) | ≈ 1.7 | SPENT GRAIN | 7.0 → ≈ 6.3, hatched |
| After the boil (`#whirlpool`, `#finished`) | ≈ 1.7 | SPENT GRAIN | ≈ 6.3 |

A SpargeStep's water starts moving when "Sparge started" is answered. A batch sparge, or the wort pump draining the
mash tun in the hold before the boil, look the same: the figures say where things end up, not how they get there.
The wort going on to the fermenter isn't a step, so after the boil the boil kettle keeps its figure until a recipe is
loaded or reset.

With level sensors (`?lsens=hlt,bk`, or the moments below), the same day reads:

| Moment | Hot liquor tank (sensor) | Mash tun (none) | Boil kettle (sensor) |
|---|---|---|---|
| The night before (`#lv-sensor-night`) | 15.0, measured; no estimate yet | nothing | EMPTY |
| The sparge and runoff (`#lv-sensor`) | 4.2 → ≈ 1.7 | ≈ 9.9 | 3.1 → ≈ 7.0 |
| Ready to boil? (`#lv-sensor-diff`) | 1.8 (the estimate's 1.7 within a quart) | SPENT GRAIN | 6.4 · ≈ 7.0 |
| No connection (`#lv-sensor-lost`) | LAST 1.8 | SPENT GRAIN | LAST 6.4 |
| The boil kettle's sensor with no reading (`#lv-sensor-none`) | 1.8 | SPENT GRAIN | ≈ 7.0, the estimate |

## Not chosen

- **A level that falls with the clock**, worked out from the time since a move began. It would look live and be
  wrong as soon as a pump ran slower than planned.
- **The figures in the faceplates on a monitor.** They would sit beside PV and SV and compete with them; the drawing
  is right above each faceplate.
- **A sight glass drawn beside each vessel.** The pipes run there, and it adds a part to the drawing for one figure.
- **The simulator's own model of each vessel's fill.** It would look measured on a simulator and be missing on the
  rig.
- **An alarm when a worked-out level is under MIN.** A guess shouldn't raise an alarm; the mash water guard decides.
- **A measured level in another colour.** Colour alone, and the drawing's colours already mean the liquid; the solid
  line and the missing "≈" say it instead.
- **The estimate hidden once a vessel has a sensor.** Comparing them is the point: a difference says the recipe's
  figures, or the vessel, need a look.

## What it needs

| Change | Where |
|---|---|
| The fill, surfaces, ranges, figures, MIN and words in the drawing, and the phone's lines | React UI (`brewday`), from what Brew Day already has |
| The strike water, grain, sparge water and boil volume in Brew Day's state | Core: mostly there (the strike water helper's figures, the recipe's mash numbers); the sparge volume to be added if missing |
| The recipe's volume after the boil | Core: BeerXML's batch size and trub and chiller loss, or its evaporation rate, from the import |
| The element-cover minimum | Core: the mash water guard's figure, per vessel |
| Capacities | Nothing new: the Hardware page |
| A level sensor per vessel, later | Core: a kettle field naming a sensor and its unit; the Hardware page. Brew Day reads its readings as it reads the probes |

## In the mockup

`brew-day.html?levels=tint` or `?levels=line`, with any moment; the day: `#sw-heat`, `#sw-move`, `#sw-doughin`,
`#mash`, `#sparge-run`, `#boil-hold`, `#heatup`, `#hop`, `#whirlpool`, `#finished`.

Level sensors: `#lv-sensor-night`, `#lv-sensor`, `#lv-sensor-diff`, `#lv-sensor-lost`, `#lv-sensor-none` (these show
the tint without the flag), or `?lsens=hlt,bk` with any moment, which reads each sensor as the estimate's figure
(midway while it moves).

## How it was checked

- `lv_check.py`: 363 checks, all passing, no page errors.
  - Every moment (168) at 1920 × 1080 with `?levels=tint`: each figure inside its dome, clear of the outline, and
    each figure and MIN clear of every other word, pipe and part of the drawing and of + TIMER and SOUND.
  - The day's 13 moments and the five sensor moments, in both looks at nine sizes, 820 to 2000 wide: each vessel's
    figure as in the tables, clear of everything, and nothing in the levels moving.
  - With sensors: the reading's surface solid over its tint and the estimate's dashed; both figures only where they
    differ; the tooltip and the words for screen readers; LAST in steel with no tint; the estimate back for a sensor
    with no reading; the night before's reading with no estimate; `?lsens` on any moment.
  - The boil kettle's figure giving way to LID ON? and coming back on DONE; the hatched ranges in `#sparge-run`; MIN
    on the HLT and the boil kettle only; the words for screen readers.
  - Without `?levels`: nothing drawn, no figures, no phone lines, the words as before.
  - Phones at 390 × 844 and 360 × 740: each vessel's line on one line, the sensor moments' word for word.
- Pictures against UI main 379ad6e at 1920 × 1080 and 390 × 844: only the five new sensor moments differ.

## Questions for the brewer, one at a time

1. Tint, line, or neither?
2. When you type a volume into a BrewScribe reminder (the strike water, before the boil, after the boil), should the
   drawing use it, as a solid line marked READ, instead of the worked-out figure? That shares a reading with
   BrewScribe, so it is yours to decide.
