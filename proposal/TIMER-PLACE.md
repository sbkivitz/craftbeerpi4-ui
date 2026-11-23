# Where the timers live (proposal, 22 Nov 2026)

Not built. Nothing changes on the screen until the brewer approves. The mockup shows the places with `?col=new` (A),
`?col=new&tplace=event` (B), `?col=new&tplace=bottom` (C) and `?col=new&tplace=side` (D). `placement.html` put A, B
and C side by side for him; `timers-side.html` puts today, C and D side by side, with the vessels' size in mm.

## Where it stands (22 Nov, evening)

1. He chose C: "I think I like C."
2. Then, before C was built: "I am concerned that the brewery icons might become too small, even though they are only
   decorative." Measured, C makes the vessels about a third shorter on his monitor (26 mm to 18 mm tall at 1920 × 950,
   on a 24-inch 1920 × 1080 screen), and less than half as tall on a 1280 × 800 laptop.
3. His idea, which replaces C: "I think the vessel drawings can shrink width and add the timers in a column", and,
   asked to confirm: "Yes, show me first & build after I approve. Note that if there are no timers, the vessels should
   appear full width". That is D, below. Nothing is built until he approves it.

## D: in a column beside the drawing

- On one screen only, layout B. On a phone, and wherever the page scrolls, the timers stay where they are today.
- While at least one timer is set (one just removed and still offering UNDO counts), the drawing's row splits: the
  drawing on the left, a 300 px column of timers on the right, at the drawing's own height. The drawing gets narrower,
  not shorter, so the vessels keep today's size at every window size (checked to 0.1 px). While the column is there the
  vessels sit closer together, so they don't line up under their own faceplates.
- The column: TIMERS with a count ("TIMERS · 2"), + TIMER and SOUND along its top, then one row for each timer with its
  name, state, time, REMOVE and START or PAUSE, and its bar along the foot. Rows that don't fit scroll inside the
  column. A run-out timer's row is amber and pulses, with its alarm in the title bar.
- With no timers the drawing is full width, as today, and + TIMER and SOUND sit in its top-right corner, right of the
  boil kettle, clear of every part of the drawing.
- The cost: the vessels leave their faceplates while timers are up; on a small window the column shows fewer timers at
  once; and on 1280 × 800 and 1366 × 768 windows, where the screen is already taller than the window today, the
  column's foot is below the window until the page is scrolled.

## What the brewer asked earlier

Through Brett, answering RECIPE-COLUMN.md's two questions:

- On the timers folding into one line: "I think the recipe step has precedence over seeing the timers. The timers can
  be shrunk to smaller fonts and height for cases like this. Maybe the timer gets big again when there's only ~3
  minutes left."
- On brewing by hand: "Is there somewhere else timers could live? I'd like to always see at least the current recipe
  step."

So the current step always wins the room, and the timers stay in reach. Brett asked for two or three places, my pick
marked, and one question, and for both answers to be worked out together.

## The same in all three

- **Only on one screen** (windows 1180 px wide and more). On a phone, and wherever the page scrolls, the timers stay
  where they are today.
- **A timer shown smaller is a tile:** its name and state word ("paused", "ready") over its time, with its bar along
  the foot, 48 px tall. Tapped, it opens the timer's box, which then has what the tile lacks: REMOVE, and START or
  PAUSE. A tile in its last 3 minutes shows its time bigger. One that has run out is amber and pulses, as its row does,
  with its alarm in the title bar as now. One just removed keeps its place for 10 real seconds, with UNDO.
- **REMOVE with UNDO, BACK TO in the box and + TIMER** work as approved (TIMER-REMOVE.md).
- **OTHER RECIPE** sits beside COMPARE PROBES on a recipe not begun, as in RECIPE-COLUMN.md.

## A: in the recipe column, smaller

The brewer's own idea. The timers stay under the steps.

- With room, they are the full rows. Where the current step wouldn't be whole beside them, they shrink to tiles, two to
  a line, under their heading.
- A timer in its last 3 minutes grows back to its full row where the step stays whole beside it; where it wouldn't,
  it stays a tile with its time bigger. One that has run out is always a full row.
- Only if even the tiles leave the step cut, the timers fold into the one line of RECIPE-COLUMN.md. That didn't happen
  in any of the moments measured.
- The cost: the timers change size as the room changes, and a tile's buttons are a tap away.

## B: beside the last event, under the title bar (my pick)

The timers move out of the recipe column, into the line under the title bar, between the last event and LOG, with
+ TIMER and SOUND.

- The recipe column is all recipe: the steps have its whole height. Brewing by hand it shows the recipe book, as
  today.
- Where they fit, each tile has START or PAUSE: with two timers on a window 1440 px wide or more. Otherwise the tiles
  alone. Tapped, the timer's box opens under the line, under its tile.
- The line keeps its height. Its words get less room: about 550 px with two timers on a 1180 px window, 240 px with
  four. They give way in an order, so the time and what came of it ("confirmed", "failed", "waiting for you") stay in
  view: a caveat first, then what was done, down to its first letters. With four timers on a small window: "14:32:32
  HLT p… · failed: no ans…". LOG has the whole line, as now.
- A run-out timer's tile pulses next to its alarm in the title bar, so the two read as one.
- The cost: the last event's words, on a small window with three or four timers.

## C: a bar along the bottom

The timers get a bar of their own along the bottom of the screen, 56 px tall: TIMERS, the tiles with REMOVE and START
or PAUSE where they fit, then + TIMER and SOUND.

- The recipe column is all recipe, as in B.
- The cost: the drawing of the brewery gives up the bar's height, 68 px on every window. On a 1180 × 860 window it is
  left 52 to 69 px tall, too small to read. And there, a long question in the title bar (the sparge's, the boil's)
  pushes the screen into the bar; that would need fixing if C were chosen.

## Why B

1. **The current step never shares its room with the timers.** In A the step wins, but the timers are still in the
   column, so a tall step and four timers can only both fit by making the timers smaller. In B and C the column is all
   recipe, so the steps after the current one show too.
2. **Nothing else gets smaller.** C takes its room from the drawing, which on a small window is then unreadable. B
   takes room only from the last event's words, which give way in an order that keeps what matters.
3. **The timers keep one place and one look.** In A a timer is a row, a tile or part of a line, depending on how tall
   the current step is. In B it is always a tile in the same line, so the eye and the hand learn where it is.
4. **The timers sit with what calls for the brewer.** A timer that runs out raises its alarm in the title bar; in B
   its tile is just under it.

Not chosen: beside the vessel a timer belongs to (the timers aren't a vessel's: Stir, Yeast, Vorlauf, PBW soak), and the
drawing's free space (its spaces move with the drawing's size, and the drawing would have to make room as in C).

## The numbers

The step list's height, in px, with two timers (Stir counting down, Yeast ready), and the current step: whole unless
"cut" says how much of it is out of view. Today is the screen as approved (the REMOVE rows, UNLOAD's line).

1180 × 860:

| Moment | Today | A | B | C |
|---|---|---|---|---|
| The strike water box (#sw-plan) | 0, no step shown | 104 | 173 | 105 |
| Waiting overnight (#sw-wait) | 18, cut 65 | 127 | 237 | 169 |
| Heating the strike water (#sw-heat) | 18, cut 114 | 168 | 237 | 169 |
| Dough-in (#sw-doughin) | 0, no step shown | 87 | 156 | 88 |
| The mash (#mash) | 139 | 139 | 399 | 331 |
| The boil (#hop) | 168, cut 6 | 277 | 387 | 319 |

1920 × 950, the brewer's window:

| Moment | Today | A | B | C |
|---|---|---|---|---|
| The strike water box (#sw-plan) | 21, cut 42 | 146 | 256 | 188 |
| Waiting overnight (#sw-wait) | 87 | 211 | 321 | 253 |
| Heating the strike water (#sw-heat) | 87, cut 25 | 211 | 321 | 253 |
| Dough-in (#sw-doughin) | 26, cut 43 | 151 | 261 | 193 |
| The mash (#mash) | 237 | 237 | 497 | 429 |
| The boil (#hop) | 225 | 225 | 485 | 417 |

At 1440 × 900 too, the current step is whole in every one of them, in A, B and C. In most moments the drawing is 137,
217 and 221 px tall at the three sizes, today and in A and B; in C it is 68 px less.

## What it needs

| Change | Where |
|---|---|
| Any of the three: the tiles, where the timers are drawn on one screen, and the timer's box opening where they are | React UI (`brewday`) |
| Nothing: the timers' commands are as approved | Server |
| Nothing | Dashboard layout files |

## In the mockup

- `brew-day.html?col=new` (A), `?col=new&tplace=event` (B), `?col=new&tplace=bottom` (C) and `?col=new&tplace=side`
  (D), in every moment. Without them the screen is as approved.
- `placement.html`: A, B and C side by side, live, at four moments (brew morning, the mash, a timer run out, brewing by
  hand) and four sizes, with the question he answered with C.
- `timers-side.html`: today, C and D side by side, live, at six window sizes and three moments (two timers, none, one
  run out), each with its drawing again at real size and the hot liquor tank's height in mm, with one question.

## How it was checked

- `files\tplace_side.py` (D): at 1180 × 860, 1280 × 800, 1366 × 768, 1440 × 900, 1920 × 950 and 1920 × 1080, in five
  moments: the drawing's box and the hot liquor tank's outline exactly today's height; the current step whole; the rows
  in view; the corner buttons clear of every part of the drawing; the column coming and going with the first and last
  timer; a timer running out; the phone as today.
- `files\tplace_presses.py`: 149 presses, all pass. For each place, at 1180 × 860, 1440 × 900 and 1920 × 950, in eight
  moments with two timers: the current step whole, nothing wider or taller than the screen. Then a tile's box, PAUSE and
  START, REMOVE and UNDO in place, + TIMER's box where it belongs, Escape, a timer running out with its alarm and OK, a
  timer growing back in its last 3 minutes in A where the step stays whole and staying a tile where it wouldn't, and a
  phone the same as today in all three.
- B's line with two and four timers at the three sizes, with four kinds of line (confirmed, a long failed one with a
  caveat, one with a caveat, waiting for you): the time and what came of it in view in all 24.
- The other suites, all passing, and pictures of every moment at 1440 × 900 and 390 × 844 against the copy in
  `design/brewday` (UI acf4716): without the flags, all the same.

## For the brewer to decide

Build D, the timers in a column beside the drawing? My pick: yes. (He chose C earlier, then raised the drawing's size;
D is his answer to that.)
