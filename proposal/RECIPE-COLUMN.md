# The recipe column: timers, steps and choosing a recipe (proposal, 22 Nov 2026)

Not built. Nothing changes on the screen until the brewer approves it. The mockup shows it with `?col=new`, which
includes the approved timer rows of `TIMER-REMOVE.md`; `column.html` puts it beside the column as built.

The brewer answered the timers' part: the current step comes first, and the timers shrink rather than fold (below).
That part is reworked in `TIMER-PLACE.md`, with two other places the timers could live; this note's one line is now A's
last resort there.

## What the brewer asked

From Brett, 22 Nov, in his words rather than the brewer's:

- Timers and recipe steps compete for room on the screen, and he wants a better layout, not the known limit accepted
  (DESIGN.md, Strike Water: with timers in the column, the step list can be too short for the current step).
- On a manual brew day, he wants to hide the recipe section but keep the timers.
- A way to pick another recipe on Brew Day while one is loaded but not begun. On the rig the old Test Recipe was loaded,
  and the recipe book's list with LOAD shows only when nothing is loaded, so he saw no way to choose. A recipe that has
  begun must never be swapped by a slip. One way of choosing across the Recipe Book and Brew Day, agreed with Robin,
  who is designing the recipe pages.

## What changes

### The timers fold into one line when the current step wouldn't be whole

- On one screen (windows 1180 px wide and more), where the step list can't hold the current step whole beside the
  timers, the timers fold into one line in their place: "TIMERS · Campden 3:39 · 1 ready · OPEN". The times count
  down; a paused one says "paused"; the ready ones are counted.
- OPEN shows them all, as any box in the column opens: they take the step list's room and the strike water box's, with
  REMOVE, + TIMER and SOUND as usual. CLOSE takes the line's place at the column's foot, so the button that opened them
  closes them, as FORECAST's does. Escape closes them too.
- They unfold by themselves once the step fits beside them again, when the strike water box goes after dough-in, say.
  The column works this out from the timers' own height, so it never flickers between the two.
- A timer that runs out while they're folded: "Campden TIME'S UP" in Prompt Amber, and the line pulses with the title
  bar and the screen's frame, as the timer's row would. OK in the title bar answers it.
- With room for them they never fold: the mash, the boil, a 1920 × 1080 window. Nor on a phone, or any screen where the
  page scrolls.

### A recipe not begun: OTHER RECIPE beside COMPARE PROBES

- OTHER RECIPE ("from the recipe book") sits beside COMPARE PROBES, in the row COMPARE PROBES had to itself, so it costs
  the column nothing.
- It opens the Recipe Book in that place, taking the step list's room and the timers' on one screen: the newest five,
  each with LOAD, the loaded one saying what it is doing instead, in the column's own words in capitals ("READY TO START
  · STEP 1 OF 7"); then ALL RECIPES (the Recipe Book tab) and CLOSE.
- LOAD is one tap here, as it only ever replaces a recipe not begun, which loses nothing: it stays in the book. The one
  exception is a recipe the Recipe Book doesn't have (steps built on Brew Steps and never saved): then LOAD asks in the
  box, "Load … in place of …? … isn't in the Recipe Book, so it can't be loaded again. …", LOAD INSTEAD and DON'T LOAD.
  LOADING… at the row pressed, the others greyed; once CraftBeerPi has it, the box closes and the column is the new
  recipe, ready to start. LOG: "Craftbeerpi Test Recipe v4 loaded · confirmed". Kettles, pumps and timers stay as they
  are.
- Once a recipe has begun (running, stopped, failed, or the boil waiting for the brewer), the row isn't there, so
  nothing on Brew Day can swap it. The Recipe Book's own LOAD then asks first, and is refused while a step runs: that is
  the recipe pages' side, agreed with Robin.
- UNLOAD (built in web UI post32, The Way Out Rule) stays at the end of the status line with this proposal: OTHER
  RECIPE swaps the recipe for another, UNLOAD takes it off and leaves the column brewing by hand, where CHOOSE A RECIPE
  is. UNLOAD closes OTHER RECIPE's box.

### Brewing by hand: the recipe book folds away

- The timers have the column. Under them, CHOOSE A RECIPE ("from the recipe book") beside COMPARE PROBES. CHOOSE A
  RECIPE opens the same book as OTHER RECIPE, in the same place, and the timers make way while it's open.
- RECIPE BOOK and BREW STEPS, the buttons at the column's end today, go: they are the screen's own tabs.

## Why this way

1. **The current step comes first.** The screen's job is to say what is happening and what comes next, and the step's
   countdown is the heart of that. So when the column runs short, the timers give way, but keep what matters at a glance
   (each name and time) in one line.
2. **Only when needed.** With room, the timers show in full, with the REMOVE row of `TIMER-REMOVE.md`; most of a brew
   day on the brewer's 1920 × 950 window nothing folds. It folds during the strike water steps, when the strike water
   box is up, and on the smaller windows.
3. **Not a strip of timers beside the drawing.** On these windows the drawing is 150-190 px tall, and its floor is 140.
4. **OTHER RECIPE in its own half row.** STOP and NEXT STEP are greyed on a recipe not begun, and OTHER RECIPE and
   COMPARE PROBES could have taken their places. Not chosen: those places would then change what they do with the
   recipe's state, and habits form on fixed places.
5. **"Hide the recipe section" read as the recipe book folding away** brewing by hand, so the timers have the column.
   If he meant the whole recipe column out of the way, with the brewhouse wider, that is a bigger change: it's question
   2 below.

## The numbers

With two timers in the column (Campden or Stir counting down, a second one ready): the step list's height, and the
current step, as built → with the proposal.

| Moment | 1180 × 860 | 1440 × 900 | 1920 × 950 |
|---|---|---|---|
| The strike water box (#sw-plan) | 0 px, no step shown → 129 px, whole, folded | 2 px, cut 81 → 169 px, whole, folded | 29 px, cut 34 → 212 px, whole, folded |
| Waiting overnight (#sw-wait) | 26 px, cut 57 → 193 px, whole, folded | 66 px, cut 17 → 233 px, whole, folded | 95 px, whole → 109 px, whole |
| Heating the strike water (#sw-heat) | 26 px, cut 106 → 193 px, whole, folded | 66 px, cut 66 → 233 px, whole, folded | 95 px, cut 17 → 277 px, whole, folded |
| Dough-in (#sw-doughin) | 0 px, no step shown → 112 px, whole, folded | 0 px, no step shown → 152 px, whole, folded | 34 px, cut 35 → 217 px, whole, folded |
| The mash (#mash) | 147 px, whole → 161 px, whole | 187 px, whole → 201 px, whole | 245 px, whole → 259 px, whole |
| The boil (#hop), its step 168 px | 176 px, whole → 190 px, whole | 175 px, whole → 189 px, whole | 233 px, whole → 247 px, whole |

At 1600 × 900 and 1366 × 768 too, the current step is whole in every one of these moments with the proposal.

## What it needs

| Change | Where |
|---|---|
| The timers' fold, their one line, OPEN and CLOSE; OTHER RECIPE beside COMPARE PROBES; the recipe book in the column; by hand, the book folded behind CHOOSE A RECIPE | React UI (`brewday`) |
| LOAD from Brew Day uses the Recipe Book's own load. Refusing it while a step runs (409) is Robin's ask of the server, for both pages | Server, in the recipe pages' proposal |
| Nothing | Dashboard layout files |

## In the mockup

- `brew-day.html?col=new`. New moments: `#timers-fold` (heating the strike water with two timers), `#timers-open` (the
  same, opened), `#other-recipe` (OTHER RECIPE's book on a recipe not begun) and `#hand-choose` (CHOOSE A RECIPE's book,
  brewing by hand); `#prebrew` and `#timers-hand` show the rest. Loading Test Recipe v4 or v3 works in the mockup with
  demonstration steps, as the simulator's book gives it only their summaries.
- `column.html`: the column as built and as proposed, side by side, at six moments, on three windows and a phone.

## How it was checked

- 34 presses (`tm2_col_presses.py`): the fold and the current step whole; the folded line counting down; OPEN, with the
  steps and the strike water box making way, and CLOSE at the column's foot; REMOVE and UNDO inside; folding again on
  CLOSE; a timer running out while folded (its line amber and pulsing, its alarm in the title bar, OK answering it);
  every timer removed, and the steps back; no fold on a 1920 × 1080 window or a phone; OTHER RECIPE and its book, LOAD
  with LOADING… and the others greyed, the column then the new recipe and LOG saying so; the book again with the new
  one marked; Escape; COMPARE PROBES in the row's place and back; ALL RECIPES; no row once a recipe runs; by hand, the
  book folded and CHOOSE A RECIPE loading a recipe with the timers kept; and the column as built without `?col=new`.
- The 72 presses of `TIMER-REMOVE.md` again: all pass.
- The step list's room in 7 moments at 6 sizes, with two timers (the table above).
- Pictures of the screen without `?col=new`, against the copy in `design/brewday` (UI 2e441e0), at 390 × 844,
  820 × 1180, 1180 × 860, 1440 × 900 and 1920 × 1080: all 90 the same, in 18 moments (the timers, a timer run out and
  back after a power cut, brewing by hand, the mash, the boil, the strike water box closed and open, heating, dough-in,
  the pre-brew check and the probes, a recipe stopped, reset and finished).

## The brewer's answers (22 Nov 2026, through Brett)

1. Folding the timers into one line: not as proposed. "I think the recipe step has precedence over seeing the timers.
   The timers can be shrunk to smaller fonts and height for cases like this. Maybe the timer gets big again when
   there's only ~3 minutes left." Reworked in `TIMER-PLACE.md` (A).
2. Brewing by hand: he asked back, "Is there somewhere else timers could live? I'd like to always see at least the
   current recipe step." `TIMER-PLACE.md` has three places, B my pick, and asks him to choose.
3. OTHER RECIPE beside COMPARE PROBES: "Yes, keep OTHER RECIPE" (22 Nov, through Brett). It comes with the timers'
   bar along the bottom, C of `TIMER-PLACE.md`, which he chose.
