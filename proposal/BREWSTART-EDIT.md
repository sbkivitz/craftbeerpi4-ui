# BrewStart on Brew Day: setting the hot water's time (22 Nov 2026)

Approved to build: Brett told the brewer it makes sense, and decided the time is set on Brew Day the night before.
The mockup has it by default; its moments are #bs-edit, #bs-indoors, #bs-past, #bs-startat, #bs-set, #bs-wait,
#bs-new, #bs-new-open, #bs-sim, #bs-novol and #bs-soon, and for USE waiting on the grain #sw-where and #sw-where-am.

## What the brewer asked

Through Brett, 22 Nov: he had added a BrewStart (Ready by) step to Test Recipe v5 on 8012, and would like to tap the
BrewStart step on Brew Day and edit it there, instead of going into the recipe editor. Then:

- He uses Ready by, never Start at. So the edit leads with Ready by, and Start at is a second choice at most.
- BrewStart's time is set on Brew Day the night before (decided). Robin's recipe pages add BrewStart with "+ BrewStart";
  Brew Day is where its time gets set.
- The grain's temperature is asked once a brew: "I'm thinking it might spend the night indoors if I've purchased enough
  for the batch at the homebrew store. If I end up having bulk grains in the garage, then it will be at garage
  temperature. I don't know yet." The night before, with the BrewStart edit, is the natural time; the strike water
  box's GRAIN stays for a change on brew morning.
- A new BrewStart's water is filled in, never typed (Robin's rule: what the recipe needs, else the last brew's, else
  blank and Brew Day asks).

## What changes

### BrewStart's row is a button

The night before, BrewStart is the current step, which Brew Day always keeps whole on the screen. So its row is where
the time already shows, and a tap on it opens BrewStart's box. Its line gives the day: "126 °F · ready by 07:00 Sat ·
15 gal". Under READY (or STARTS 05:30 while it waits) a small hint says what the row waits for, in this order:
"set a time", in amber, while BrewStart has no time; "where's the grain?", in amber, while the grain isn't answered for
this brew; else "change". So the grain is asked every brew, even when the time came from the book and the box is never
opened, and USE waits for the answer (below). Tapped while it says "where's the grain?", the box opens at that
question. A finished BrewStart is an ordinary row.

### BrewStart's box

In the recipe column, where the step list was, as the pre-brew check's box is; the strike water box and, on one screen,
COMPARE PROBES step aside while it is open. From the top:

1. **READY BY**, the time the water is hot, with −1 H, −15, the time, +15 and +1 H, and TODAY or TOMORROW with the date
   ("TOMORROW · SAT 21"). Typing "7", "700" or "7:00" is 07:00. START AT INSTEAD, a quiet button, swaps the label to
   START AT, the time heating starts.
2. **The time in words**, as Robin's pages say it: "The HLT's water is hot by 07:00 tomorrow, Sat 21 Nov: in 9 h 48
   min." On a simulator it adds the real time: "…, about 10 real minutes at 60×." With START AT: "Strike water starts
   at 05:30 tomorrow, Sat 21 Nov: in 8 h 18 min." A time that has passed is refused, in Robin's words: "07:00 today has
   passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW."
3. **Where is the grain tonight?** "Asked once a brew: USE depends on it." IN THE GARAGE (the boil kettle's probe reads
   it, and the button gives its reading) or INDOORS, with 64, 68 or 72 °F, or a typed figure. Neither is pressed until
   it's answered for this brew. CraftBeerPi keeps the answer with the loaded recipe, so it's shown the next time, on
   any screen, and a recipe loaded again asks again.
4. **The water**, as a fact, set elsewhere, and last, as it is the part that may scroll out of view: "The HLT's 6500 W
   element heats 15 gal to 126.0 °F. USE and HLT WATER in the strike water box change them." With no water figure,
   the box says to give it with HLT WATER before START.
5. **SET** and **CANCEL**, kept in view. SET's hint says what it sets ("ready by 07:00 Sat"). LOG: "BrewStart: ready by
   06:30 Sat 21 Nov, was 07:00 Sat · grain indoors at 68.0 °F".

### A recipe without BrewStart

Robin's row, with his words, above step 1 on a recipe loaded and not begun: "+", BrewStart, "Hot water by a set time ·
goes in as step 1". It opens the same box for a new BrewStart, filled in as Robin's pages fill one: Ready by, the HLT,
its element and the Campden choice from the newest BrewStart, the temperature from mash in, and the water worked out
from the recipe. Only ADD BREWSTART adds it, as step 1; CANCEL leaves the recipe as it was. LOG: "BrewStart added as
step 1: ready by 07:00 Sat 21 Nov".

### While BrewStart waits

Once START is pressed, BrewStart waits for its heating start (its row says STARTS 05:30). Its box still opens, and says
so: "BrewStart is waiting: heating starts about 05:30. A change here plans it again at once." The time, the day and the
grain can change; START AT and READY BY can't swap until it's stopped. BrewStart 1.2.0.post10 takes the new time (its
`change_time`) and plans again from the water as it is.

A ready time sooner than BrewStart plans for heating the water can't be waited for: BrewStart hands over at once and the
strike water step heats, as at START. So the box says that first, and SET says what it does: "Heating starts as soon as
you press HEAT NOW: BrewStart plans 43 min for heating the water, and 06:00 today is 20 min away.", with SET reading
HEAT NOW. A later time brings SET back.

### USE waits for the grain's answer

On a recipe with BrewStart, while the grain isn't answered for this brew, the strike water box's USE reads "USE – –
°F", with "where's the grain?" under it, as on the row, in the look CraftBeerPi's questions have: Prompt Amber on its
dark amber ground. A tap opens the question: BrewStart's box the night
before and while BrewStart waits or heats; on brew morning, once BrewStart has finished, the strike water box's GRAIN,
where IN THE GARAGE (the boil kettle's probe, with its reading) stands beside SET. Answered, USE is back with its
figure: at once for the garage, as the figure doesn't change; after CraftBeerPi works it out again for indoors. Without
BrewStart, or with the grain answered, USE is as before.

## Why this way

1. **The row, not a new line in the strike water box.** Robin suggested a line there ("HOT BY 07:00 tomorrow ·
   CHANGE"). The row needs no room: it is the current step the night before, which the screen already keeps whole, so
   the time is in view and one tap away. A line in the box would take about 44 px from the step list.
2. **The day is saved as a date.** BrewStart counts Today and Tomorrow from when START is pressed, so "Tomorrow" set at
   23:50 and started at 00:05 would heat a day late. The box shows TODAY and TOMORROW, but saves the date they stand
   for, so what the box says is what happens. Agreed with Robin: SAVE TO BOOK puts it into the book as Tomorrow, with
   its time and no date (his server change 8), so the book never keeps a date that has passed. The same change puts
   back the strike temperature from before the first USE, as USE is this brew's figure, and the book keeps no grain
   figure, as Brew Day asks for it every brew.
3. **The water is a fact here, not a field.** Its temperature is the strike water's (USE, BACK TO) and its amount is
   HLT WATER's, both in the strike water box. Two places to change the same number would disagree.
4. **The grain is a question, not a default.** Asked once, the night before, with its two answers in his words: where
   the grain spent the night. A typical indoor figure is one tap.
5. **A past time is refused, not saved with a warning.** Nothing useful comes of it, and the brewer would find out at
   bedtime from a notice, not at the box.
6. **No question first.** Setting a time on a step that hasn't started can be changed back the same way.
7. **USE waits; START doesn't ask.** The book keeps no grain figure, so a grain nobody answered is the boil kettle's
   probe. That errs hot when the grain spent the night indoors: roughly 2.4 °F hotter strike water for grain 20 °F
   warmer than the garage, with v5's 8.26 gal on 20 lb (Palmer's strike formula), and USE is meant to err low. The
   grain changes nothing but USE's figure, so USE is where the question can't be skipped. A check at START would ask
   even when the recipe's own strike temperature is used, and couldn't mend a USE already pressed.
8. **HEAT NOW for a time too soon, not a second question.** Such a time starts the heating at once. NEXT STEP, the
   other way to start it early, asks first and is answered with SKIP TO STRIKE WATER. Here the brewer is already in a
   box he opened to change the time, so its main button says what it will do, and the sentence above it says why. A
   time too soon isn't refused: on brew morning, wanting the water sooner is a reason to open the box.

Not chosen: every BrewStart setting on Brew Day (Campden, heads-up and element power are rare, and on Brew Steps);
a date picker (a brew further off than tomorrow isn't set the night before); the time in the title bar.

## What it needs

| Change | Where |
|---|---|
| BrewStart's row as a button, its box, + BrewStart's row and box, the grain question | React UI (`brewday`) |
| Change a BrewStart that hasn't started: its time and day by `PUT /step2/{id}` with its settings, as the old form does; its grain by `POST /step2/strike/grain`, as the strike water box's GRAIN does, which also works while BrewStart waits | Nothing new |
| **New: where the grain is, for this brew** ("garage" or "indoors"), kept with the loaded steps and left out of the book, so a blank Grain_Temp (the garage) can be told from "not asked yet" on every screen. `POST /step2/strike/grain` takes it | Server (core post59, being built: `grain_place` in the brew steps' basic data; `{"grain": null, "place": "garage"}` for the garage, a figure for indoors) |
| Add BrewStart as step 1: `POST /step2/` with `index` 0 (Robin's change 6, core post58) | Being built |
| A new BrewStart's water: `recipeWater()` from `mash_numbers` (Robin's change 7) | Planned; until then the last brew's |
| A waiting BrewStart takes a new time: `POST /step2/action/{id}` with `change_time`, as `PUT /step2/{id}` is refused (409) while it waits. It plans again from the water as it is and says so in its words; with too little time left for the heating, it hands over at once. The grain and the water already change while it waits, through the strike water box | BrewStart 1.2.0.post10, on 8000 and 8012 |
| SAVE TO BOOK: BrewStart's date back to Tomorrow, the strike temperature back to before the first USE, no grain figure (Robin's change 8, asked of Brett) | Server (the book's copy, `book_data()`) |
| Nothing | Dashboard layout files |

With a BrewStart older than post10, which doesn't declare `change_time`, the box shows the time greyed while it waits,
with CraftBeerPi's way: "BrewStart is waiting, so its time can't change now. Press STOP, change it, then hold START."
The grain can still change.

## In the mockup

- `brew-day.html`, by default. The moments above; `#bs-sim` is on a simulator at 60×.

## How it was checked

- `files\bs_presses.py`, 233 presses, all passing: the row and its hint, the box and every part of it, SET and its LOG
  lines, + BrewStart, Escape and CANCEL, no connection, SETTING…, the simulator, USE waiting for the grain, the box
  opening at the grain, and a time too soon: HEAT NOW, where it starts, and BrewStart handing over.
- As each box opens, at 1180 × 860, 1440 × 900 and 1920 × 950, the grain's two answers and SET and CANCEL are fully in
  view. While BrewStart waits, its sentence stays fixed above the part that scrolls.
- On one screen, every step row is the same height as before. A phone's BrewStart row is 20 px taller, its details on
  two lines.
- The other suites all pass. Against the copy in `design/brewday`, the pictures change only in BrewStart's row and box,
  USE while it waits for the grain, and where a step's details line breaks.

## For the brewer to decide

Nothing: his answers and Brett's decisions settle it.
