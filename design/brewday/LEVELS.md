# The liquid in each vessel (ready to build, 25 Nov 2026)

The brewer: "It would be nice to see a subtle visual representation of the amount of liquid in each vessel as the
brew day progresses".

His answers since:

- **The look:** "Tint (Recommended)". The surface-only look (`line`) is gone.
- **Level sensors:** "Not yet, but I may add them". So the estimate comes first, and a sensor's reading has its place
  for later (below).
- **A volume typed into BrewScribe:** "Yes, a volume I type replaces the estimate (Recommended)". Where he types a
  volume into a BrewScribe reminder (the strike water, the HLT's levels around the sparge, the runnings, before and
  after the boil), Brew Day shows that figure, marked READ, in place of the worked-out one.

Behind `?levels=tint` in the mockup; without it the mockup is as it was. The build notes are in BUILD-NOTES.md, "The
liquid in each vessel: ready to build".

## Read first

- Norman, The Design of Everyday Things: the drawing is a conceptual model, and a figure the screen works out is part
  of it; it must be honest about what it is.
- Nielsen #1 and the checklist's F9 and H21: a figure the screen works out, or one that is stale, must look unlike a
  live reading, and must never pretend to be live. A volume typed an hour ago is neither live nor worked out: a third
  kind, said as such.
- High-performance HMI (ISA-101, Hollifield) and the checklist's F15, F17 and H3: normal stays quiet, and colour is
  for what needs attention. H5 says a plant drawing shouldn't colour its contents at all; the brewer asked for it, so
  the colour stays faint, the drawing's own liquor and wort colours at a tenth of their strength.
- The checklist's F10, F18 and H1: a figure with its context (here, the vessel's size and its least water).
- WCAG 1.4.1 and 2.3.3, W3C WAI's complex images: never colour or motion alone; the drawing says the same in words.
- NN/g, proximity: the figure sits on its vessel.

## What CraftBeerPi knows, and what it doesn't

- **No level is measured today.** The rig has no level sensors.
- **What the figures can come from**, all already in CraftBeerPi:
  - BrewStart's water: what it heats in the HLT, so once it runs, that water is in the HLT;
  - the strike water and the grain, from the recipe's mash numbers (the strike water helper has them);
  - the sparge water and the boil volume, from the recipe;
  - the step list: which step runs, whether BrewStart holds the strike water and asks for it to be moved, whether
    MashIn's "Please add malt" was answered, whether the runoff runs, whether the boil has started to boil;
  - each kettle's capacity and least water (core 4.7.7.post77), from the Hardware page.
- **From BrewScribe** (0.1.0.dev60): the newest volume read in each vessel that still stands in its open log, in the
  answer Brew Day already asks for (`GET /brewscribe/api/brew-day/readings`, `vessel_volumes`).
- **Not yet in CraftBeerPi:** the recipe's volume after the boil (BeerXML's batch size plus its trub and chiller loss,
  or its evaporation rate). The mockup uses 6.3 gal as an example.
- **On a simulator** cbpi4-simvessel models each vessel's real fill. The screen doesn't show it: a simulator shows the
  same figures the rig would, so it previews the rig.

## The design

- **A faint tint** of the liquid inside each vessel's outline, under its coil, element and name: the liquor's blue for
  water, the wort's gold for mash and wort, at about a tenth of their strength.
- **Worked out, so it says so.** The surface is a dashed line and the figure has "≈".
- **Where it is going, never a guess at where it is.** While liquid moves (the strike water, the sparge and runoff,
  the boil-off), the screen can't know how far it has got, so it shows the range: hatched from where it was to where
  it is going, with the figure it is heading to, "→ ≈ 6.7 GAL". Nothing moves on its own, and nothing counts down with
  the clock.
- **The figure in the dome**, "≈ 9.9 GAL", in the drawing's quiet tag style. The dome is the one place clear in all
  three vessels (the HLT's coil fills its middle). The boil kettle's gives way to the lid's question while the Steam
  Slayer's lid reminder waits.
- **SPENT GRAIN** in the mash tun's dome once the runoff is over, and no fill: the screen can't tell how much wort the
  grain still holds.
- **MIN**, a short mark across the left wall at the kettle's least water, in the drawing's steel, with where it comes
  from in its tooltip. The HLT's is the strike water helper's figure (`GET /step2/strike`): its least water, else 15%
  of its capacity, else 3 gal (11.4 L on a °C brewery); in the mockup, "MIN 3.0 gal, the least water over the
  element: 15% of its 20 gal capacity, until its least water is set on the Hardware page". Any other kettle has MIN
  only when its own least water is set; the mockup's boil kettle has 4 gal. MIN stays quiet even when the level is
  below it: stopping an element is the mash water guard's job, not the drawing's.
- **Scaled to the vessel.** The fill's height is the figure over the vessel's capacity from the Hardware page. A
  vessel with no capacity shows its figure, but no fill and no MIN.
- **Words:** a mouse pointer on a vessel's liquid shows its line and where it comes from, and the drawing's words for
  screen readers say each vessel's figure and whether it is worked out, read or measured.
- **On a phone**, which has no drawing, one quiet line under each vessel's own: "Water ≈ 6.7 gal · less the strike
  water", "Mash ≈ 9.9 gal · strike water and 20 lb of grain", "Wort 0 → ≈ 7.0 gal · running off". On one line at
  360 px wide, so the buttons under it don't move.

### A volume read in BrewScribe: READ

The brewer's reading replaces the estimate. It is a third kind of figure, kept apart from both the others in shape and
in words, never by colour alone:

| | Worked out | Read in BrewScribe | Measured by a sensor (later) |
|---|---|---|---|
| Surface | dashed | solid, as thin as the estimate's, with a small pointer on the inside of the right wall at the level read | solid and a little stronger, no pointer |
| Dome | "≈ 7.0 GAL" | "7.2 GAL READ" | "6.4 GAL" |
| Phone | "Wort ≈ 7.0 gal · the recipe's boil volume" | "Wort 7.2 gal · read at 3:48 PM" | "Wort 6.4 gal measured" |
| Tooltip | "Worked out, not measured." | "Typed into BrewScribe, not measured: it stands until liquid next moves in or out." | "Measured by its level sensor." |
| Screen reader | "about 7.0 gallons of wort, the recipe's boil volume" | "7.2 gallons of wort, read at 3:48 PM in BrewScribe" | "6.4 gallons of wort, measured" |

The pointer is the mark a person makes beside a sight glass: a reading taken by hand, at one moment. It sits inside
the shell, clear of the pipes, and stays quiet like the rest.

**Which point of the day a reading describes.** Each reading says what its vessel held at the point of the day its
stage names, whenever it was typed: a strike water volume typed after the move still says what the HLT held before it.
`read_at` is when it was typed, so it is used for the words only ("read at 3:48 PM").

| BrewScribe's stage (and reading) | Vessel | Describes |
|---|---|---|
| `strike_water` (volume) | HLT | its fill, before the strike water moves |
| `mash`, `mash_start`, `mash_end` | any | the mash |
| `sparge_water` (`level_before`) | HLT | before the sparge water moves |
| `first_runnings`, `last_runnings` | boil kettle | the runoff, while the wort is on its way |
| `sparge_water` (`level_after`) | HLT | after the sparge |
| `pre_boil` | boil kettle | before the boil-off |
| `boil` | boil kettle | the boil, while it boils off |
| `post_boil`, `transfer` | boil kettle | after the boil |

The volume before the boil is asked as the boil step starts, while the wort heats. Read once it has begun to boil, it
is still taken as before the boil-off: the difference is a few minutes' boil-off.

**How long READ stands: until liquid next moves in or out of its vessel.** The moves, from the step list:

| Vessel | Moves |
|---|---|
| HLT | the strike water out (the recipe's strike water, with the tun's dead space); the sparge water out (the recipe's sparge water) |
| Mash tun | the strike water in; the runoff, leaving spent grain |
| Boil kettle | the runoff in, up to the recipe's boil volume; the boil-off (the boil volume less the volume after the boil) |

**Then the day works forward from it.** Once a move starts, the vessel's figure is worked out again, from the reading
and the recipe's figure for each move since, drawn and said as worked out: "→ ≈ 7.1 GAL" while the strike water goes,
with "Water 15.4 → ≈ 7.1 gal · read 15.4, strike water out" on a phone, and then "≈ 7.1 GAL", "read 15.4, less the
strike water". Three exceptions, where the reading no longer counts and the vessel goes back to the estimate:

- **A move to a figure the recipe sets.** The runoff fills the boil kettle to the boil volume, whatever it held, and
  leaves the mash tun spent grain.
- **A reading taken while liquid was on its way** (the runnings' volume, a volume typed during the boil). It says where
  the liquid was then, not how much was still to come, so it stands, with the range hatched up to where the move is
  going, until that move is over; then the vessel goes back to the estimate. Its dome says "6.6 GAL READ": the dashed
  surface above it shows where to, as the dome has no room for both.
- **A reading for a point the steps haven't reached** (typed ahead on BrewScribe's page, or a recipe started again): not
  used until the steps reach it.

A reading BrewScribe corrects shows its corrected figure, the tooltip saying "and corrected there". One withdrawn
drops out: the vessel's previous standing reading takes its place, or the estimate. A sparge water typed as one volume
is the water used, not a level, so the HLT works forward from its strike water reading, "read 15.4, less the strike and
sparge water". BrewScribe's volume unit can differ from the brewery's (litres on a °F brewery): the figure is drawn and
shown in the brewery's unit. With no log open, or no readings, it is the estimate.

**With a level sensor too**, the sensor is shown, as below, and the volume read beside it as its own solid line with
its pointer, with no tint or hatching of its own. The dome gives both only where they differ by more than a quart:
"6.4 · READ 6.9". The estimate still works forward from the reading where one is in.

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
  or inside the range a move is in, the dome shows the reading alone. Further apart, the dome says both, "6.4 GAL ·
  ≈ 7.0", and the phone says by how much. A difference is shown, not alarmed: it may be the recipe's figures, not the
  vessel, that are off.
- **A reading the estimate can't know**, such as the HLT filled the night before, before BrewStart runs: the reading
  alone, "15.0 GAL", or EMPTY.
- **No connection:** the last reading's surface in the drawing's steel, solid, with no tint, and "LAST 6.4 GAL", as a
  pump says LAST: ON. It never looks live.
- **A sensor with no reading** (unplugged, or a reading that isn't a number): the vessel falls back to the estimate,
  and the phone's line says "level sensor: no reading".

Where it would be set: on the Hardware page, in each vessel's group, "Level sensor": none (the default) or one of
CraftBeerPi's sensors that reads the vessel's volume, with its unit (gal or L).

### Through the brew day

The mockup's Test Recipe v5 (the figures BrewScribe's readings use): 15 gal of BrewStart's water, 8.26 gal of strike
water, 20 lb of grain, 5.00 gal of sparge water, a 7.00 gal boil; 6.3 gal after the boil is an example. The test recipe's
figures don't add up, as a real one's would.

Worked out, with nothing read:

| Moment | Hot liquor tank | Mash tun | Boil kettle |
|---|---|---|---|
| Before BrewStart runs | nothing | nothing | nothing |
| BrewStart heating (`#sw-heat`) | ≈ 15.0, BrewStart's water | nothing | nothing |
| BrewStart holding, asking for the strike water to be moved (`#sw-move`) | 15.0 → ≈ 6.7, hatched | 0 → ≈ 8.3, hatched | nothing |
| MashIn, asking for the malt (`#sw-doughin`) | ≈ 6.7 | ≈ 8.3 of water | nothing |
| The mash (`#mash`) | ≈ 6.7 | ≈ 9.9 of mash (8.26 gal and 20 lb at 0.08 gal a lb) | nothing |
| The sparge and runoff (`#sparge-run`) | 6.7 → ≈ 1.7, hatched | ≈ 9.9 | 0 → ≈ 7.0, hatched |
| Ready to boil? (`#boil-hold`), heating (`#heatup`) | ≈ 1.7, under MIN | SPENT GRAIN | ≈ 7.0, the recipe's boil volume |
| Boiling (`#hop`) | ≈ 1.7 | SPENT GRAIN | 7.0 → ≈ 6.3, hatched |
| After the boil (`#whirlpool`, `#finished`) | ≈ 1.7 | SPENT GRAIN | ≈ 6.3 |

With the brewer's readings typed into BrewScribe:

| Moment | Hot liquor tank | Mash tun | Boil kettle |
|---|---|---|---|
| BrewStart heating, the strike water read at 15.4 (`#lv-read-strike`) | 15.4 GAL READ | nothing | nothing |
| The strike water on its way (`#lv-read-move`) | 15.4 → ≈ 7.1, from the reading | 0 → ≈ 8.3 | nothing |
| The sparge, the level before read at 6.9 (`#lv-read-sparge`) | 6.9 → ≈ 1.9, from the reading | ≈ 9.9 | 0 → ≈ 7.0 |
| The last runnings' volume read at 6.6 (`#lv-read-last`) | 6.9 → ≈ 1.9 | ≈ 9.9 | 6.6 GAL READ, hatched up to the dashed 7.0 |
| Ready to boil?, the level after read at 1.6 and the volume before the boil at 7.2 (`#lv-read-boil`) | 1.6 GAL READ, under MIN | SPENT GRAIN | 7.2 GAL READ |
| Boiling (`#lv-read-hop`) | 1.6 GAL READ | SPENT GRAIN | 7.2 → ≈ 6.5, from the reading |
| After the boil, read at 6.4 (`#lv-read-after`) | 1.6 GAL READ | SPENT GRAIN | 6.4 GAL READ |

The wort going on to the fermenter isn't a step, so after the boil the boil kettle keeps its figure until a recipe is
loaded or reset; a reading after the boil says when it was read.

With level sensors (`?lsens=hlt,bk`, or the moments below):

| Moment | Hot liquor tank (sensor) | Mash tun (none) | Boil kettle (sensor) |
|---|---|---|---|
| The night before (`#lv-sensor-night`) | 15.0, measured; no estimate yet | nothing | EMPTY |
| The sparge and runoff (`#lv-sensor`) | 4.2 → ≈ 1.7 | ≈ 9.9 | 3.1 → ≈ 7.0 |
| Ready to boil? (`#lv-sensor-diff`) | 1.8 (the estimate's 1.7 within a quart) | SPENT GRAIN | 6.4 · ≈ 7.0 |
| The same, the volume before the boil read at 6.9 (`#lv-read-sensor`) | 1.8 | SPENT GRAIN | 6.4 · READ 6.9 |
| No connection (`#lv-sensor-lost`) | LAST 1.8 | SPENT GRAIN | LAST 6.4 |
| The boil kettle's sensor with no reading (`#lv-sensor-none`) | 1.8 | SPENT GRAIN | ≈ 7.0, the estimate |

## Not chosen

- **The surface alone, without the tint** (`?levels=line`, which now shows the tint so old links still work). The
  brewer chose the tint.
- **A level that falls with the clock**, worked out from the time since a move began. It would look live and be
  wrong as soon as a pump ran slower than planned.
- **The figures in the faceplates on a monitor.** They would sit beside PV and SV and compete with them; the drawing
  is right above each faceplate.
- **A sight glass drawn beside each vessel.** The pipes run there, and it adds a part to the drawing for one figure.
- **The simulator's own model of each vessel's fill.** It would look measured on a simulator and be missing on the
  rig.
- **An alarm when a level is under MIN.** A guess or a typed reading shouldn't raise an alarm; the mash water guard
  decides.
- **A measured level, or a reading, in another colour.** Colour alone, and the drawing's colours already mean the
  liquid; the line's shape, the pointer and the words say it instead.
- **The estimate hidden once a vessel has a sensor.** Comparing them is the point.
- **Placing a reading by when it was typed** (`read_at`). A reading typed late would then describe the wrong moment;
  its stage says which moment it describes.
- **One vessel's figure worked out from another's reading** (the mash tun's strike water from the HLT's readings
  before and after the move, say). Dead space, hoses and top-ups make the difference more than the water moved; each
  vessel works forward from its own readings only.
- **The sparge water typed as one volume taking the recipe's place** in the HLT's figure. It is the water used, as
  BrewScribe says, not what is left; the HLT's level after the sparge says what is left.

## What it needs

| Change | Where |
|---|---|
| The tint, surfaces, ranges, figures, READ, MIN and words in the drawing, and the phone's lines | React UI (`brewday`), from what Brew Day already has |
| The volumes read in each vessel | Nothing new: BrewScribe 0.1.0.dev60's `vessel_volumes`, in the answer Brew Day already asks for |
| Least water per kettle | Nothing new: core 4.7.7.post77 (the Hardware page; the HLT's also in `GET /step2/strike`) |
| The strike water, grain, sparge water and boil volume in Brew Day's state | Core: mostly there (the strike water helper's figures, the recipe's mash numbers); the sparge volume to be added if missing |
| The recipe's volume after the boil | Core: BeerXML's batch size and trub and chiller loss, or its evaporation rate, from the import |
| Capacities | Nothing new: the Hardware page |
| A level sensor per vessel, later | Core: a kettle field naming a sensor and its unit; the Hardware page. Brew Day reads its readings as it reads the probes |

## In the mockup

`brew-day.html?levels=tint` with any moment; the day: `#sw-heat`, `#sw-move`, `#sw-doughin`, `#mash`, `#sparge-run`,
`#boil-hold`, `#heatup`, `#hop`, `#whirlpool`, `#finished`.

Read in BrewScribe: `#lv-read-strike`, `#lv-read-move`, `#lv-read-sparge`, `#lv-read-last`, `#lv-read-boil`,
`#lv-read-hop`, `#lv-read-after`, `#lv-read-sensor` (these show the tint without the flag). Each reading is taken as
BrewScribe takes it, so the reminders say saved too; and with the flag, SAVE in Brew Day's readings box shows the
volume as READ at once (`#rd-final`, say).

Level sensors: `#lv-sensor-night`, `#lv-sensor`, `#lv-sensor-diff`, `#lv-sensor-lost`, `#lv-sensor-none`, or
`?lsens=hlt,bk` with any moment, which reads each sensor as the estimate's figure (midway while it moves).

With the flag, the kettles' Hardware page figures are the mockup's examples: each 20 gal, the boil kettle's least
water 4 gal, the HLT's none set.

## How it was checked

- `lv_check.py`: 309 checks, all passing, no page errors.
  - Every moment (184) at 1920 × 1080 with `?levels=tint`: each figure inside its dome, clear of the outline, and
    each figure and MIN clear of every other word, pipe and part of the drawing and of + TIMER and SOUND.
  - The day's 13 moments, the five sensor moments and the eight READ moments at nine sizes, 820 to 2000 wide: each
    vessel's figure as in the tables, clear of everything, and nothing in the levels moving.
  - READ: its surface solid with its pointer and the tint to it, no dashed line or hatching; read while the runoff
    goes on, hatched up to the dashed surface it is going to; worked forward once the boil-off starts, dashed with no
    pointer; beside a sensor, both lines and both figures; the tooltips and the words for screen readers.
  - What happens to a reading: the sparge water typed as one volume (the HLT works forward from the strike water's
    reading), one withdrawn (the previous reading, read during the runoff, so the estimate), none, one in litres, one
    corrected, one read during a move that's over, one saved without a kettle id, readings for points not reached
    (not used), the strike water read the night before (it stands), and SAVE in `#rd-final` showing READ at once.
  - MIN: the HLT's from 15% of its capacity, the boil kettle's own, each saying so in its tooltip, at the right
    heights; the HLT's own least water set; the boil kettle's unset (no MIN).
  - The boil kettle's figure giving way to LID ON? and coming back on DONE; the hatched ranges in `#sparge-run`; MIN
    on the HLT and the boil kettle only; `?levels=line` showing the tint.
  - Without `?levels`: nothing drawn, no figures, no phone lines, the words as before.
  - Phones at 390 × 844 and 360 × 740: each vessel's line on one line, the sensor and READ moments' word for word.
