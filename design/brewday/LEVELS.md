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

- **No level is measured.** As far as the notes show, the rig has temperature probes only: its hardware snapshot
  lists its actors and kettles and nothing else. To be confirmed from the rig's sensor list before building.
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
  the same worked-out figures the rig would, so it previews the rig, and nothing on the screen ever looks measured.

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

## Not chosen

- **A level that falls with the clock**, worked out from the time since a move began. It would look live and be
  wrong as soon as a pump ran slower than planned.
- **The figures in the faceplates on a monitor.** They would sit beside PV and SV and compete with them; the drawing
  is right above each faceplate.
- **A sight glass drawn beside each vessel.** The pipes run there, and it adds a part to the drawing for one figure.
- **The simulator's own model of each vessel's fill.** It would look measured on a simulator and be missing on the
  rig.
- **An alarm when a worked-out level is under MIN.** A guess shouldn't raise an alarm; the mash water guard decides.

## What it needs

| Change | Where |
|---|---|
| The fill, surfaces, ranges, figures, MIN and words in the drawing, and the phone's lines | React UI (`brewday`), from what Brew Day already has |
| The strike water, grain, sparge water and boil volume in Brew Day's state | Core: mostly there (the strike water helper's figures, the recipe's mash numbers); the sparge volume to be added if missing |
| The recipe's volume after the boil | Core: BeerXML's batch size and trub and chiller loss, or its evaporation rate, from the import |
| The element-cover minimum | Core: the mash water guard's figure, per vessel |
| Capacities | Nothing new: the Hardware page |

## In the mockup

`brew-day.html?levels=tint` or `?levels=line`, with any moment; the day: `#sw-heat`, `#sw-move`, `#sw-doughin`,
`#mash`, `#sparge-run`, `#boil-hold`, `#heatup`, `#hop`, `#whirlpool`, `#finished`.

## How it was checked

- `lv_check.py`: 253 checks, all passing, no page errors.
  - Every moment (168) at 1920 × 1080 with `?levels=tint`: each figure inside its dome, clear of the outline, and
    each figure and MIN clear of every other word, pipe and part of the drawing and of + TIMER and SOUND.
  - The day's 13 moments in both looks at nine sizes, 820 to 2000 wide: each vessel's figure as in the table, clear of
    everything, and nothing in the levels moving.
  - The boil kettle's figure giving way to LID ON? and coming back on DONE; the hatched ranges in `#sparge-run`; MIN
    on the HLT and the boil kettle only; the words for screen readers.
  - Without `?levels`: nothing drawn, no figures, no phone lines, the words as before.
  - Phones at 390 × 844 and 360 × 740: each vessel's line on one line.
- Pictures against UI main 8de7e6d at 1920 × 1080 and 390 × 844 without `?levels`: nothing outside the Steam Slayer's
  moments changes.

## Questions for the brewer, one at a time

1. Tint, line, or neither?
2. When you type a volume into a BrewScribe reminder (the strike water, before the boil, after the boil), should the
   drawing use it, as a solid line marked READ, instead of the worked-out figure? That shares a reading with
   BrewScribe, so it is yours to decide.
