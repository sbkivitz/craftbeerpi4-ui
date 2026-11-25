# Stopping and removing a timer (approved by the brewer on 22 Nov 2026)

Approved as proposed, and ready to build: BUILD-NOTES.md's "Timers: REMOVE on the row, with UNDO, and BACK TO in the
box". It is the mockup's default now; `?trow=today` shows the rows as built before, and `timers.html` puts the two side
by side.

## What the brewer asked

On the rig with post25, 22 Nov: "need to stop/clear/remove", as the timers only give him PAUSE.

Today the only way is to tap a timer's name and time, which opens its box, then REMOVE, then REMOVE IT when it still has
time left. Nothing on the row says so, so he didn't find it.

## What changes

- **REMOVE on every timer's row,** beside START or PAUSE, in the same place whatever the timer is doing: counting down,
  paused or ready. One tap, and no question.
- **For 10 seconds the row stays where it was,** saying "removed", with UNDO where its two buttons were. UNDO puts the
  timer back as it was, in its place; one that was counting down has counted on meanwhile, as if it had never gone.
  After 10 seconds the row goes. They're 10 real seconds, however fast a simulator's brewing clock runs.
- **PAUSE stays as it is:** the count stops and the time is kept.
- **BACK TO 15:00 in the timer's box** (opened by tapping its name, as today), while it counts down or is paused. The
  timer goes back to its full time, stopped, ready to START again: what OK does after its alarm, and what a kitchen
  timer's clear does. The box stays open, now a stopped timer's (CANCEL, SET), so a name typed and not yet saved is
  kept. The box no longer has REMOVE, as the row has it.
- **+ TIMER moves up into the TIMERS heading,** beside SOUND, instead of a row of its own under the timers. A new
  timer's box still opens at the end of the list, where the timer will be. While another box is open, + TIMER is greyed
  and says why: "One timer at a time: close the one that's open first."
- **The row has two lines:** the name and its state ("of 15:00", "PAUSED · of 15:00", "ready") over the time, REMOVE and
  START or PAUSE. 95 px tall instead of 70.
- **A timer that has run out:** OK across its row. After OK it's ready, with REMOVE
  and START.
- **While a timer's box is open,** that timer keeps today's one-line row, with START or PAUSE only. Today's box fits a
  1180 × 860 window with nothing to spare, and a taller row would push its buttons off the bottom. REMOVE is back when
  the box closes.

## Why this way

1. **REMOVE, not STOP, on the row.** He said stop, clear and remove. Removing is the one needed most: clearing away a
   timer that's done with, or one started by mistake. PAUSE already stops the count and keeps the time. Going back to
   the full time (a stir timer started over early, say) is rarer, so it lives in the timer's box. One word in one
   place on every row is easier to learn than STOP on counting timers and REMOVE on stopped ones, and that pair would
   put REMOVE under the finger that had just pressed STOP.
2. **No question first.** Today a timer with time left asks "Remove Stir? It has 7:12 left." A question asked every
   time turns into a habit of pressing yes without reading (DESIGN.md: no "Are you sure?" before a change that one tap
   undoes). UNDO makes a slip cheap instead: the wrong row's REMOVE with a wet finger, or a double tap.
3. **The row keeps its place for 10 seconds.** If it vanished at once, the timer below would move up under a hand that
   is still reaching, and a second tap would land on that timer's REMOVE. With the row's place and height kept, and
   UNDO across both buttons' room, a second tap puts the timer back.
4. **REMOVE is quieter than START or PAUSE.** Look-alike buttons side by side invite the wrong one. REMOVE has Soft
   Steel lettering at 600 on a Hairline Slate edge; START or PAUSE keeps today's look and its place at the far right,
   where his hand already goes. REMOVE needs no alarm colour, since UNDO puts a slip right.
5. **Two lines.** On windows 1180 to 1480 px wide the recipe column is 310 px inside. A row's name, time and one 100 px
   button already fill it (the name gets 94-109 px); a second button would leave the name nothing. On two lines every
   name gets 175 px or more, and both buttons are 84 × 56 px.
6. **+ TIMER in the heading.** Under the timers it took 64 px of the column. In the heading it takes none, so the taller
   rows cost little: two timers take 250 px against 264 today, giving the step list 14 px; three take 11 px more than
   today, and four 36 px more.

## What it doesn't fix: the column's room

Measured with two timers in the column (Stir counting down, Yeast ready): the step list's height, and how much of the
current step it cuts off, as built → with the proposal:

| Moment | 1180 × 860 | 1440 × 900 | 1920 × 950 |
|---|---|---|---|
| The mash (#mash) | 147 → 161 px, whole | 187 → 201 px, whole | 245 → 259 px, whole |
| The strike water box (#sw-plan) | 0 → 0 px: no step shown | 2 → 16 px, cut 81 → 67 px | 29 → 43 px, cut 34 → 20 px |
| Heating the strike water (#sw-heat) | 26 → 40 px, cut 106 → 92 px | 66 → 80 px, cut 66 → 52 px | 95 → 109 px, cut 17 → 3 px |
| Dough-in (#sw-doughin) | 0 → 0 px: no step shown | 0 → 0 px: no step shown | 34 → 48 px, cut 35 → 21 px |

The proposal gives every one of them 14 px, and as built #sw-plan at 1180 × 860 even makes the page scroll, which the
proposal doesn't. But during the strike water steps the step list is still far too short. The brewer has asked for a
better layout of the timers and the steps, and for a brew day by hand without the recipe section; that is the next
proposal, and it builds on this row.

## What it needs

| Change | Where |
|---|---|
| The two-line row, REMOVE, the removed row with UNDO, + TIMER in the heading, BACK TO in the box | React UI (`brewday`'s timers) |
| BACK TO: a timer counting down or paused goes back to its own time, stopped. Built in core 4.7.7.post52 (a5ee2266): `POST /timers/{id}/reset`. A stopped timer is left as it is; one that has run out is refused (409) | Server (`timers_controller.py`, `http_timers.py`) |
| UNDO: a removed timer put back on request as it was, with its id and in its place, as it would be now: one counting down has counted on, and one whose time came meanwhile comes back run out and ringing. Built in core 4.7.7.post52: `POST /timers/{id}/undo`. CraftBeerPi keeps a removed timer 12 real seconds (the screen's 10, plus 2 for a press still on its way, and never fewer brewing seconds), then forgets it. Removing needs nothing new | Server (the same files) |
| Nothing | Dashboard layout files |

On other screens a removed timer simply goes, as it does today: the row that stays for 10 seconds is for the hand on the
screen where REMOVE was pressed. UNDO there puts it back on every screen.

When CraftBeerPi refuses, which only happens when another screen has changed the timers meanwhile, the timers' own note
line says why for 6 s, and LOG gets the command with "failed" and the reason, in light red, as a failed command's:

- UNDO, with four timers now: "Four timers at most. Remove one to put Stir back." With another timer of its name now:
  "Another timer is called Stir now. Rename it to put Stir back." In both, the removed row stays until its 10 seconds
  are up, so UNDO can be pressed again once the clash is gone.
- UNDO arriving after CraftBeerPi has forgotten the timer (a press still on its way when its 12 seconds ran out): "Stir
  can't be put back now: a removed timer can be put back for 10 seconds." The screen names the timer itself, since
  CraftBeerPi's answer only has its number by then. The row goes.
- BACK TO, for a timer that ran out meanwhile: "Stir has run out: answer it with OK." The box closes and the
  row shows OK.

LOG: "Stir removed, 7:15 to go" (or "Yeast removed" for a ready one), "Stir put back, 7:05 to go", "Stir back to 15:00,
stopped with 7:12 to go".

## In the mockup

- `brew-day.html`, in every timer moment: the default since the brewer approved it. New moments: `#timer-change`
  (Stir's box while it counts down) and `#timer-removed` (Stir just removed). With `?trow=today` they show the box and
  question as built before.
- `timers.html`: the rows as built before and as approved, side by side, at five moments, on a monitor, a small window
  and a phone.

## How it was checked

- 72 presses (`tm2_presses.py`), at 1440 × 900 and on a 390 × 844 phone: REMOVE on a counting, a paused and a ready
  timer; REMOVING… at once with START or PAUSE greyed; the removed row's height kept and the timer below it not moved;
  UNDO by its button and by a second tap where REMOVE was; a counting timer put back having counted on, a paused one at
  its own time left; UNDO pressed just before the 10 seconds were up; the row gone after them; BACK TO with a name
  typed and kept; + TIMER greyed with a box open and with four timers, each saying why; a run-out timer unchanged and,
  after OK, with REMOVE; REMOVE greyed with no connection; and the rows as built before (`?trow=today`).
- Rows measured at 360 × 740, 390 × 844, 700 × 900, 820 × 1180, 1000 × 800, 1180 × 860, 1440 × 900, 1920 × 950 and
  2560 × 1440: no name cut, no button under 56 px tall or 84 px wide, nothing wider than the screen, no page errors.
  REMOVE's Soft Steel lettering is about 8:1 on its row; the removed row's Dim Steel 5.8:1 on Panel Slate.
- Before the approval, pictures of the screen without the proposal, against the copy in `design/brewday` (UI 2e441e0),
  at 390 × 844, 820 × 1180, 1180 × 860, 1440 × 900 and 1920 × 1080: all 80 the same, in the 16 moments compared (the
  ten timer moments, the mash, the hop alert, the strike water box closed and open, the pre-brew check and brewing by
  hand).
- Made the default on 22 Nov: the same 72 presses on the default; the UNDO row's 10 seconds are real ones on a
  simulator too (`clock_presses.py`). Pictures of every moment against UI 1fca41c are in BUILD-NOTES.md's section.

## The brewer's answers (22 Nov 2026, through Brett, one question at a time)

1. REMOVE on the row, with UNDO: yes, one tap, with UNDO for 10 seconds, as proposed.
2. Back to the full time: in the timer's box (BACK TO 15:00), as proposed.
3. 10 seconds of UNDO: taken with answer 1.
