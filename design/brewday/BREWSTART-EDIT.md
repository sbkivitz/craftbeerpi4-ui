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
question. The row stays a button until BrewStart has finished: before START, while it waits for its time, while it
heats or holds the water (HEATING, WAITING FOR YOU, its details as they were, the hint under them), and stopped. A
finished BrewStart is an ordinary row.

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
4. **The water**, as a fact here, and last, as it is the part that may scroll out of view: "The HLT's 6500 W element
   heats 15 gal to 126.0 °F. ALL SETTINGS changes them." It names the strike water box only where that box is on the
   screen and offers the water: "CHANGE in the strike water box's FORECAST changes the water too.", or with no
   forecast "HLT WATER in the strike water box changes the water too." The box is absent on some recipes (the mash
   tun's first step not MashIn, or the mash tun not run by PID_HERMS), so ALL SETTINGS is the one place always named.
   With no water figure: "How much water isn't known yet: give it with ALL SETTINGS, or HLT WATER in the strike water
   box, before you START.", without the strike water box where it isn't there.
5. **SET** and **CANCEL**, kept in view. SET's hint says what it sets ("ready by 07:00 Sat"). LOG: "BrewStart: ready by
   06:30 Sat 21 Nov, was 07:00 Sat · grain indoors at 68.0 °F".
6. **ALL SETTINGS**, under SET and CANCEL and kept in view with them, as tall as they are, hint "every setting, on Brew
   Steps": it opens the Brew Steps page at BrewStart's plate, scrolled to it, with focus on its first setting, where
   every BrewStart setting is edited (the date, the water's temperature and amount and their unit, the grain's
   temperature, the Campden reminder, the vessel, the element's watts, notice before and Then). It is there whenever
   the box is: before START, while BrewStart waits, heats or holds the water, stopped, and on a phone. With nothing in the box
   changed it goes at once. With a time or a grain answer changed and not set, it asks first, in the foot in place of
   SET and CANCEL, in the look of the recipe's questions: "The new time isn't set yet. SET AND GO sets it, then opens
   all of BrewStart's settings; GO WITHOUT IT leaves BrewStart as it is.", with SET AND GO (HEAT NOW AND GO for a time
   too soon, greyed where SET is), GO WITHOUT IT and STAY. No answer is the default; Escape is STAY, and any change in
   the box takes the question down. For a new BrewStart it is ADD AND GO, and Brew Steps opens with + BrewStart
   pressed there. Brew Steps' plate then has "Opened from Brew Day." with BACK TO BREW DAY, which after SAVE has
   focus; with changes not saved there, it asks first, as BREW DAY's tab does.

### A recipe without BrewStart

Robin's row, with his words, above step 1 on a recipe loaded and not begun: "+", BrewStart, "Hot water by a set time ·
goes in as step 1". It opens the same box for a new BrewStart, filled in as Robin's pages fill one: Ready by, the HLT,
its element and the Campden choice from the newest BrewStart, the temperature from mash in, and the water worked out
from the recipe. Only ADD BREWSTART adds it, as step 1; CANCEL leaves the recipe as it was. LOG: "BrewStart added as
step 1: ready by 07:00 Sat 21 Nov".

### While BrewStart waits

Once START is pressed, BrewStart waits for its heating start (its row says STARTS 05:30). Its box still opens, and says
so: "BrewStart is waiting: heating starts about 05:30. A change here plans it again at once." The time, the day and the
grain can change, and START AT and READY BY swap. With a BrewStart that takes its settings while it runs
(`change_settings`, 1.3.0.post6), SET sends the time, the day and Ready by or Start at through it, and it plans again
from the water as it is. With an older one, the time goes by its `change_time` (1.2.0.post10), and START AT INSTEAD is
greyed with "Not while BrewStart waits: STOP it first."; once stopped, the row still opens the box, and SET saves it.

A ready time sooner than BrewStart plans for heating the water can't be waited for: BrewStart starts heating at once, as
at START. So the box says that first, and SET says what it does: "Heating starts as soon as you press HEAT NOW:
BrewStart plans 43 min for heating the water, and 06:00 today is 20 min away.", with SET reading HEAT NOW. A later
time brings SET back.

### While BrewStart heats or holds the water

The row is still a button, and the box opens with what BrewStart is doing pinned at its top: "BrewStart is heating the
HLT's water to 126.0 °F. A new time here changes when it should be ready; the heating carries on.", or holding: "BrewStart
is holding the HLT's water at 126.0 °F for you to move it." A new time goes by `change_settings` (an older BrewStart's
`change_time`), which once the heating has begun moves only the ready time. The grain still changes, as the strike water box's GRAIN changes it. START AT
INSTEAD swaps here too; chosen, the time in words says first what SET will do: "SET stops BrewStart's heating: the
HLT's AUTO goes off. MashIn starts at …". ALL SETTINGS is there, as always.

### When BrewStart is stopped

STOP leaves BrewStart's row a button (STOPPED, with its hint). The box says "BrewStart is stopped: START carries it on
with what is set here.", and everything in it changes, START AT INSTEAD included: SET sends it by `change_settings`,
which a stopped BrewStart takes (an older BrewStart, by `PUT /step2/{id}`, which CraftBeerPi takes for a stopped step).

### Brew Steps' BrewStart plate while BrewStart runs

With a BrewStart that takes its settings while it runs (`change_settings`), its plate on Brew Steps isn't locked while
BrewStart waits, heats or holds the water; every other running step stays locked as before. The plate says what it is
doing: "Waiting for its time. SAVE gives BrewStart the changes at once, and it plans again from them.", or "Heating the
HLT's water now. SAVE gives BrewStart the changes at once: a new water temperature is the HLT's target from then, and a
new vessel asks first.", and "Its name and kind stay as they are while it runs." (those two rows stay greyed). SAVE
sends only the settings changed, as `POST /step2/action/{id}` with `{"action": "change_settings", "parameter":
{...}}`, as Brew Day sends `change_time`. A refusal is said under SAVE in BrewStart's own words and logged as failed.

Two changes say what SAVE will do, under the setting, before it is pressed. Start at, while BrewStart heats: "SAVE
stops BrewStart's heating: the HLT's AUTO goes off." A new vessel, while it heats or holds: "BrewStart is heating the
HLT: SAVE asks before the heating moves." That is the one change that asks, once, as SAVE is pressed, naming what
happens: "Heating moves from the HLT to the Boil Kettle: the HLT's element stops and the Boil Kettle's starts.", with
MOVE THE HEATING and KEEP THE HLT. Neither is the default and focus goes to the question's words. MOVE THE HEATING saves
everything; KEEP THE HLT puts the vessel back and saves the rest. Everything else applies on SAVE with no question.

### BrewStart heats the HLT (BrewStart 1.3.0, 22 Nov, night)

The brewer, after a brew day on the simulator: "BrewStart should have the entire volume of HLT water heated to my
chosen temperature by my chosen time. As it is, it seems to ignore my "152" setting I chose and went right for the
MashIn temp of 126". His Test Recipe v5 is BrewStart, then MashIn on the Mash Tun at 126 °F, with no strike water step
on the HLT, so at the heating start BrewStart handed over, and the Mash Tun's pump started into an empty tun. He chose
"BrewStart heats the HLT itself" over keeping it a planner. So, with Ready by:

- At its heating start BrewStart sets the HLT's target to its own temperature and its AUTO on, and stays the current
  step: its row says HEATING. LOG: BrewStart's "Time to heat - the water should be ready by Sat Nov 21, 07:00.", then
  "BrewStart heating, HLT target 132.4 °F".
- With the water there, it holds it and asks, as the strike water step did: "BrewStart: Move the strike water to the
  Mash Tun, then press Next", with NEXT STEP, in the title bar; its row WAITING FOR YOU.
- Nothing else starts until NEXT. NEXT switches the HLT's AUTO off, and MashIn on the Mash Tun begins with the water in
  the tun. Skipping BrewStart with NEXT STEP before then asks first, and says the tun is still empty.
- It is the recipe's strike water step: the strike water box's USE and BACK TO set its temperature, while it waits
  (STARTS planned again) and while it heats (the HLT's target too).
- In a recipe that does have a strike water step on the HLT after it, BrewStart doesn't heat: it hands over as soon as
  heating is due, and that step heats and asks, as before (BrewStart 1.3.0 as built), so two steps never heat the
  same water.

HEAT NOW's sentence stays right: it is BrewStart that heats now. In the mockup the strike water moments run this shape:
#sw-wait waiting, #sw-heat heating, #sw-move and #sw-late holding with the question, #sw-doughin MashIn after NEXT;
`?sws=step` has a strike water step on the HLT after BrewStart.

### USE waits for the grain's answer

On a recipe with BrewStart, while the grain isn't answered for this brew, the strike water box's USE reads "USE – –
°F", with "where's the grain?" under it, as on the row, in the look CraftBeerPi's questions have: Prompt Amber on its
dark amber ground. A tap opens the question: BrewStart's box the night before and while BrewStart waits; once BrewStart
heats, on brew morning, the strike water box's GRAIN,
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
3. **Every setting one press away, in one editor.** The box keeps what is set the night before (the time, the day, the
   grain) and ALL SETTINGS opens Brew Steps at BrewStart's plate for the rest, at any time until BrewStart is done. Brew
   Steps' plate is the one place every BrewStart setting is edited, with the names, help, units, choices and
   show-when rules of its catalogue (`recipes/catalog.js`), so the two pages can't drift apart, as a second copy of
   them in the box could. The water stays a fact in the box: its amount is BrewStart's Volume and its temperature its
   Ready_Temp, which HLT WATER and USE in the strike water box and the plate on Brew Steps all change, so every place
   shows the same figure. A change waiting in the box isn't lost on the way: ALL SETTINGS asks first (SET AND GO, GO
   WITHOUT IT, STAY), as carrying it over would lose the grain's answer, which only Brew Day keeps.
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
   other way to start early, asks first, and would skip the heating altogether. Here the brewer is already in a box he
   opened to change the time, so its main button says what it will do, and the sentence above it says why. A time too
   soon isn't refused: on brew morning, wanting the water sooner is a reason to open the box.

Not chosen: every BrewStart setting copied into the box (a second editor whose names and rules could drift from Brew
Steps'; ALL SETTINGS reaches the one editor in one press); a date picker (a brew further off than tomorrow isn't set
the night before); the time in the title bar.

## What it needs

| Change | Where |
|---|---|
| BrewStart's row as a button, its box, + BrewStart's row and box, the grain question | React UI (`brewday`) |
| Change a BrewStart that hasn't started: its time and day by `PUT /step2/{id}` with its settings, as the old form does; its grain by `POST /step2/strike/grain`, as the strike water box's GRAIN does, which also works while BrewStart waits | Nothing new |
| **New: where the grain is, for this brew** ("garage" or "indoors"), kept with the loaded steps and left out of the book, so a blank Grain_Temp (the garage) can be told from "not asked yet" on every screen. `POST /step2/strike/grain` takes it | Server (core post59, being built: `grain_place` in the brew steps' basic data; `{"grain": null, "place": "garage"}` for the garage, a figure for indoors) |
| Add BrewStart as step 1: `POST /step2/` with `index` 0 (Robin's change 6, core post58) | Being built |
| A new BrewStart's water: `recipeWater()` from `mash_numbers` (Robin's change 7) | Planned; until then the last brew's |
| **BrewStart heats the HLT itself** with Ready by: the HLT's target and AUTO at its heating start, holding and asking for the water to be moved, the HLT's AUTO off on NEXT; with a strike water step on the HLT after it, handing over as soon as heating is due | BrewStart 1.3.0 (core helper, being built) |
| A waiting BrewStart takes a new time: `POST /step2/action/{id}` with `change_time`, as `PUT /step2/{id}` is refused (409) while it waits. It plans again from the water as it is and says so in its words; with too little time left for the heating, it hands over at once. The grain and the water already change while it waits, through the strike water box | BrewStart 1.2.0.post10, on 8000 and 8012 |
| SAVE TO BOOK: BrewStart's date back to Tomorrow, the strike temperature back to before the first USE, no grain figure (Robin's change 8, asked of Brett) | Server (the book's copy, `book_data()`) |
| ALL SETTINGS: Brew Steps at BrewStart's plate, `#/step/{id}` with `{from: "brewday"}` in the address's state (`#/mashprofile` with `bsadd` too for a new one) | React UI (`brewday`, `recipes`) |
| A running BrewStart takes any of its settings: `POST /step2/action/{id}` with `change_settings` and the settings changed, waiting, heating or holding; refused (400 `action refused`) in its own words. Brew Steps sends it for a running BrewStart's plate | BrewStart 1.3.0.post6 |
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
