# The strike water card: proposal (25 Nov 2026), for the brewer to see first

The strike water box redrawn as one card. In the mockup it is behind `?strike=bs`, and the `#card-…` moments show it
without the flag. Nothing here is to be built until the brewer has seen it. Two wrong figures the review found are
fixed now, and the box as built already warns instead of refusing (BUILD-NOTES).

## Why

- The brewer, stuck in the HLT WATER box with v6c: "give me the option to set the mash water too" and "I need to be
  able to get out of this screen and it doesn't seem like I can without hitting cancel."
- Earlier the same day: "Calculating the strike water temperature is done by BeerSmith - I need to hone the process of
  importing it and then being able to override it easily." He chose to keep CraftBeerPi's forecast as an optional
  check. The plan for that, `PLAN.md` ("strike from BeerSmith"), is kept with the core's work.
- An independent review of the whole flow found two dead ends, a box with no way out but CANCEL, every refusal said
  twice, and 1,303 words across 58 sentences. Its section 5 sketched one card. This is that card, worked out.

## What he sees

The `#card-…` moments, on a monitor and a phone.

**Three figures, each a button**, in one row: MASH WATER, STRIKE and HLT WATER. Each shows its name, the figure in
large, and under it where it comes from: BEERSMITH, YOURS, CHECK (USE wrote it) or REST (a recipe without BeerSmith's
figures). HLT WATER shows the sparge water it leaves instead ("sparge 6.7 gal"). A tag that needs a look is Note Amber:
BeerSmith's strike in use after the mash water or grain weight changed, and an HLT left under its minimum.

**A tap opens that figure's editor**, right under the row. The button stays lit in Selection Blue with ✕ in its corner,
and the editor is framed in the same blue, joined to it. The other two figures stay in view.
- −1 −.1 [figure] +.1 +1.
- SET, and where the figure isn't BeerSmith's any more, BEERSMITH'S beside it, with BeerSmith's figure under the word.
  THE PROBE in the same place for a grain or room temperature typed here.
- Under them, one line of what the figure does: "Sparge left 3.00 gal · 1.25 qt/lb", "MashIn heats to 133.9 °F before
  the malt.", "The mash lands 124.1 °F." Then, only when there is one, a line that needs a look, in Note Amber.
- SET takes the figure and closes, whatever the warning. An unchanged figure just closes.
- **The ways out:** ✕ (a second tap on the figure's button), Escape, or a tap anywhere outside the card. Each closes
  the editor and changes nothing.

**A warning is one short line under the figures**, said once, never a refusal: "Leaves 1.7 gal in the HLT, under its
3.0 gal minimum.", "Less than the 8.3 gal of mash water.", "More than the HLT holds (20 gal).", "BeerSmith's 134.6 °F is
for 8.26 gal." While a figure's editor is open, the editor says it instead.

**CHECK, one row under them**: CraftBeerPi's forecast, as an optional check.
- "CHECK / mash 125.6 °F · rest 126 °F", quiet where it agrees within 1 °F.
- Where it doesn't, the words are Note Amber and **USE 136.8 °F** sits beside it, or under it where there's no room.
  USE sets the strike that lands the mash on the rest, tagged CHECK.
- Where it can't check, it says what it needs in a few words ("needs the HLT water"). Where that's one of the three
  figures, its tap opens that figure.
- Opened (▾, then CLOSE ✕): "BeerSmith took the grain at 65.0 °F.", and the figures it works from that the card
  doesn't show, as the same buttons: GRAIN TEMP (PROBE, YOURS) and GRAIN WEIGHT (BEERSMITH, YOURS, MASHIN), and ROOM
  only while the boil kettle's probe can't stand for it.

**MashIn's row** says its pre-heat: "132.5 °F, then malt · mash water 8.26 gal · 1.5 qt/lb". Its "change" opens the
card's MASH WATER: there is no second box. A pre-heat stalled short says so in Note Amber on the row: "0.4 °F short for
10 min: lower the strike."

## Decisions

1. **One card, one shape.** The three figures never move. Below them is either the open editor, or the warning lines and
   CHECK. Six faces of the closed box, two panels, five editors and two side boxes become one card with one editor
   pattern.
2. **BeerSmith's figures are the plan** (PLAN.md). STRIKE is BeerSmith's strike, which BrewStart heats the HLT to.
   MashIn pre-heats the moved water to a little less, because BeerSmith's figure already paid for warming the tun's
   steel. The mash water is BeerSmith's. Each can be changed here, with BEERSMITH'S as the way back. The grain weight
   too, inside CHECK.
3. **Warn, never refuse.** Every warning is one line, said once, where the figures are. Nothing is said again under the
   card. Only a figure CraftBeerPi can't take at all (blank, or out of its range: "0.5–100 gal only.") keeps SET
   greyed.
4. **No hidden drafts.** ✕, Escape and a tap outside all close the editor and change nothing, as CANCEL did. The review
   suggested keeping what was typed as a draft. A figure typed but not set, waiting out of sight, is a mode he would
   have to remember, and with SET never refused there's no longer a reason to leave without setting. The editor
   opens on the figure in force.
5. **The editor's title is the figure's own button**, with ✕ in its corner. That saves a title line, so the step list
   keeps more room on one screen. Its box is labelled for a screen reader with the figure's name and unit.
6. **SET sits straight under the figure**, and the lines that change as he types come after it, so nothing under his
   hand moves.
7. **While a figure is open, the warning lines and CHECK step aside.** On a 1920 × 950 monitor the step list keeps 156
   px (two rows), and 103 px at 1180 × 860. Opened CHECK with one of its own figures open is the tallest state: on one
   screen only CHECK's part scrolls, under its row, and the step list always keeps at least the current row.
8. **CHECK is a number, not a chart.** With BeerSmith's strike and MashIn's pre-heat, what matters is where the mash
   lands against the rest. The chart, its range and NOT MEASURED YET go from Brew Day. They belong on a rig page if
   anywhere.
9. **No grain question.** The boil kettle's probe stands for the grain unless he gives GRAIN TEMP inside CHECK. Nothing
   waits for "where's the grain?", and BrewStart's row loses its amber for it.
10. **Asked for in one place.** A missing figure shows "– –" and "not given" on its own button, and CHECK says what it
    needs. MashIn's row says "mash water –", without amber.
11. **The strike is done once the malt is asked for**: STRIKE greys, and its tap says "The malt has been asked for: the
    strike is done." Before that, after the water has moved, a new strike moves only MashIn's pre-heat, and LOG says so.
12. **The closed card is no taller than today's box**: 161-164 px against 166 px on a fresh load.

## The words

Everything the card can say: 54 pieces, 249 words (the review counted 1,303 today, and 431 in its rewrites).

- **Buttons:** MASH WATER, STRIKE, HLT WATER, GRAIN TEMP, GRAIN WEIGHT, ROOM. Tags: BEERSMITH, YOURS, CHECK, REST,
  BREWSTART, PROBE, MASHIN, "not given", "sparge 6.7 gal", "no sparge".
- **CHECK:** "mash 125.6 °F · rest 126 °F", "working it out", "working it out again", "failed: see LOG", "needs the HLT
  water", "needs more HLT water", "needs the mash water", "needs the grain weight", "needs the room temperature", "grain at 150.0 °F can't be
  right", "needs a 2 or 5 s control interval", "MashIn has no temperature". USE 136.8 °F. ▾ and CLOSE ✕.
- **Opened CHECK:** "BeerSmith took the grain at 65.0 °F.", "MashIn has no temperature. Set it in Brew Steps.", "Set the
  mash tun's control interval to 2 or 5 s, on the Hardware page.", "No forecast for these figures. LOG says why."
- **Warnings:** "Leaves 1.7 gal in the HLT, under its 3.0 gal minimum." (CraftBeerPi's words, `hltLowText`), "Less than
  the 8.3 gal of mash water.", "More than the HLT holds (20 gal).", "BeerSmith's 134.6 °F is for 8.26 gal." (or "for
  20.0 lb of grain", or both), "136 °F is coil water, not the mash."
- **Editor:** SET 7.00 gal, BEERSMITH'S 8.26 gal, THE PROBE 60.4 °F, THE ROOM 66.0 °F. "Sparge left 3.00 gal · 1.25
  qt/lb" (without the sparge part where a warning says it), "Mash 8.26 gal · sparge left 1.74 gal", "MashIn heats to
  133.9 °F before the malt.", "MashIn heats to the 126 °F rest.", "The mash lands 124.1 °F.", "3.9 qt/lb is high (most
  mashes: 0.75–3).", "0.5–100 gal only.", "Type the mash water."
- **MashIn's row:** "132.5 °F, then malt", "0.4 °F short for 10 min: lower the strike."
- **LOG:** "Mash water set to 7.00 gal, was 8.26 gal", "Mash water back to BeerSmith's 8.26 gal", "Strike set to 136.0
  °F, was 134.6 °F" (after the move, "· MashIn heats to 133.9 °F"), "Strike set to 136.8 °F, the check's, was 134.6
  °F", "Strike back to BeerSmith's 134.6 °F", "HLT water set to 10.0 gal, was 15.0 gal · Campden ¾ tablet", "Grain
  temperature set to 45.0 °F, was the probe's 60.6 °F", "Grain temperature: the probe's again, 60.4 °F", "Grain weight
  set to 18.0 lb, was 20.0 lb", "Room temperature set to 66.0 °F for this brew".

## Where the review's findings went

- **F1, F3 (dead ends):** the mash water is a button beside the HLT water, and neither is ever refused.
- **F2:** SET on a figure in force closes.
- **F4:** no grain question; the probe stands for the grain.
- **F5, F6 (ways out, the step list hidden):** ✕, Escape and a tap outside; the step list stays, at least its current
  row.
- **F7, F8:** one line, said once, on the card.
- **F9:** asked for in one place.
- **F10:** the warning shows on the closed card.
- **F11, F12:** 249 words; every line runs the card's full width, and CHECK's words have a line of their own.
- **F13:** the ratio is the mash water in force less BeerSmith's water under the false bottom, against the grain, everywhere.
  Fixed now in the mockup and to build (BUILD-NOTES).
- **F14:** build only: "BeerSmith: 19.51 gal". To build now.
- **F15:** BEERSMITH'S for the mash water, the strike and the grain weight.
- **F16:** one name each. MASH WATER for the water (never "STRIKE … gal"), STRIKE for the temperature only, GRAIN TEMP
  and GRAIN WEIGHT.
- **F17:** "More than the HLT holds (20 gal)." as a warning; nothing ever suggests a figure.
- **F18:** the card shows no seconds count.
- **Not taken up:** F19 (HLT WATER opening with a figure when none is given) and F20 (how the mash landed, on MashIn's
  row after the malt). F20 overlaps BrewScribe's readings, so it's a question for the brewer later.

## What each part needs

- **CraftBeerPi (core):** as PLAN.md: `strike_in_use()` with where it came from, `set` and `beersmith` commands for the
  strike, MashIn's pre-heat (`dough_in_temperature`) and its stall, and `check: {landing}` in the state. The mash water
  and grain weight changed over BeerSmith's, with `back`, already exist (core post78, `POST /step2/strike/recipe`). HLT
  water under the mash water is a warning since post73 (`hlt_under`).
- **Web UI:** the card in place of the box (`swHTML`): `cardHTML`, `cxTile`, `cxEdHTML`, `cardChkRow`, `cardChkHTML`,
  `cxCmd`, `cxSend`, `cardDismiss` in the mockup's `brew-day.js`, and `.swcard`, `.cfig`, `.cchk`, `.cpanel`, `.cxed` in
  `brew-day.css`. The click handler's tap outside the card, Escape, Enter in `#sxin`, and its typing. MashIn's row and
  its pre-heat (`bssPreheat`, `bssStall`). BrewStart's row without the grain question.
- **Recipe pages (their own design note):** BrewStart's "Water temperature" with the same tag and BEERSMITH'S, and
  MashIn's plate with the line it can't edit: "Heats to 155.7 °F before the malt" (PLAN.md section 5).

## Moments

`#card-plan`, `#card-low`, `#card-water`, `#card-yours`, `#card-yours-edit`, `#card-strike`, `#card-mine`,
`#card-mine-edit`, `#card-cold`, `#card-used`, `#card-check`, `#card-check-grain`, `#card-hlt`, `#card-novol`,
`#card-nobs`, `#card-working`, `#card-heat`, `#card-move`, `#card-moved`, `#card-stall`, `#card-asked`. Their figures
are Test Recipe v5's: BeerSmith's strike 134.6 °F for 8.26 gal and 20 lb, the 126 °F rest, MashIn's pre-heat 132.5 °F.

## How it was checked

- `files\card\card_shots.py` (the design work's own scripts, kept outside the repository): every moment at 1920 × 1080, 1920 × 950, 1440 × 900, 1180 × 860, 1000 × 900, 701 × 900,
  390 × 844 and 360 × 740. No text cut, no line squeezed into a column (a wrapped line narrower than three quarters of
  the card), no key or field under 44 px, no sideways scroll, and on one screen the step list never under one row.
- `files\card\card_presses.py`, 79 checks at 1920 × 950 and 390 × 844, all passing: opening, typing, warning without
  refusing, SET once, BEERSMITH'S, ✕, Escape, a tap outside, another figure's button, an unchanged SET, a figure out of
  range, HLT water under the mash water, the strike and its way back, MashIn's row, CHECK opened and closed four ways,
  USE, GRAIN TEMP and THE PROBE, CHECK leading to HLT WATER, the strike after the move and after the ask, and the box as
  built warning once under it.
- Before choosing the layout: the interaction-design digests (errors at their source, warnings that wear out, undo over
  refusal, hidden modes, grouping and labels) and Nielsen's user control and freedom.
