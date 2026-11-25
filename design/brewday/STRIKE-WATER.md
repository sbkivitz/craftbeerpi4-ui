# Strike water helper: approved by the brewer (20 Nov 2026), with the model's figures

From BrewStart 1.3.0 (22 Nov, night) the strike water step is usually BrewStart itself: with Ready by it heats the HLT,
holds the water and asks for it to be moved, as the strike water step on the HLT did, and the box sits on it. Where
this note says "the strike water step", read that BrewStart, or a MashInStep on the HLT after it where a recipe has
one. See `BREWSTART-EDIT.md`, "BrewStart heats the HLT".

The brewer approved the reworked proposal on 20 Nov, through Brett: "Yes, approve it with those two fixes". Both fixes
answer questions he asked about it:

- "Do I need to scroll down to click "USE ..."?" He did. With FORECAST open on his 1278 × 1197 window, the box was
  578 px tall with 1802 px of details in it, and USE sat at their foot, 2323 px down. Now the box's head stays in reach
  while FORECAST is open: the window, USE or BACK TO, and FORECAST's own button. Only the details under the head
  scroll.
- "What does "DONE" do?" It read to him like "accept". FORECAST's button now turns into CLOSE, "the forecast", in its
  own place, and back again, and closing changes nothing else. COMPARE PROBES keeps its DONE, which adds the readings
  to LOG and says so.

His other answers:

- **The water in the HLT:** "Yes, use BrewStart's water volume (Recommended)".
- **The grain's temperature:** asked where the grain spends the night, he said "It varies". Of the three ways offered
  (the boil kettle's probe, with the grain's temperature typed when it has been elsewhere; asking every brew morning;
  70 °F unless typed), he answered "A is my answer but I think we can figure out the night before when setting up the
  BrewTimer". BrewTimer is BrewStart, the first step, which he sets up the night before with Ready by. So BrewStart
  gets a **Grain temperature** beside its Water volume: given when the grain spends the night away from the boil
  kettle, and left blank otherwise, when the boil kettle's probe stands for it. FORECAST says which it used, with
  CHANGE for brew morning. Brewing by hand, without BrewStart, it's a figure CraftBeerPi keeps for the brew day, as the
  HLT's water is.
- **Brett's two picks stand:** BeerSmith's figure beside the forecast's, in FORECAST, and the mash tun's water shown in
  the window.
- He also asked "How do I set the ready by time?". Brett answered him: BREW STEPS, then BrewStart, Timing "Ready by",
  Day "Tomorrow", and Time, when the water must be hot. The box never changes the time. USE raises BrewStart's
  temperature, so heating starts earlier.

It is now in the Brew Day mockup (`brew-day.html#sw-plan`; the strip at the top lists every moment), in DESIGN.md
(Strike Water, and The Offer, Don't Apply Rule) and in BUILD-NOTES. Brett builds it, with the bench's model of the
HERMS working out the figures.

**The figures are the model's** (`strike_model.py`, bench 6f3c001), since the evening of 20 Nov, and rebuilt on 22 Nov
when the model stopped its own wobble moving USE with warm grain (below). The approval was given on a stand-in for it.
The words and the layout stay as approved, with five changes the model brought (see Decisions, 8-12):

- USE's rule: no higher than water heated only to the rest would take the mash, rather than at or under the rest.
- "Lands" is the mash as the grain goes in, and the words say so.
- FORECAST lists each unmeasured number as a range, not three cases.
- A state for CraftBeerPi working USE out, which takes it a while.
- A state for a USE refused because its figure has been overtaken.

## What was asked for

From the ideas interview (section 5, 17 Nov):

- Take the mash tun's dead space from the BeerSmith equipment profile.
- Show the worked-out strike temperature, and tap to use it.
- Never set the HLT's target by itself.

The first version (18 Nov) asked first whether he still brews Kal's way, as he chose on 23 Oct: the strike water at the
rest's temperature, and the HERMS brings the mash back up after the grain goes in. USE would change that. He answered,
through Brett on 20 Nov, that he leans towards USE but doesn't want the mash to overshoot, and that the HLT will hold
all the water, strike and sparge, with the minerals in. He chose to have a model of the whole HERMS work out USE's
figure, erring low until the rig is measured. Kal's way is still there: it's simply not pressing USE.

What changed from the first version:

- USE's figure comes from a model of the whole HERMS, not one sum. For Test Recipe v5 it says 132.4 °F, not
  137.5 °F.
- The window says where the mash lands as a range, and turns amber when the water would take the mash over the rest.
- The box needs to know how much water is in the HLT, and takes it from BrewStart's water volume. It takes the grain's
  temperature from BrewStart too, when it's given.
- During dough-in the box says why the Mash Tun's reading is so high.
- FORECAST replaces NUMBERS. It shows the forecast as a chart and in words, and every number with where it comes from:
  the recipe, the brewer, a measurement on the rig, the rig's setup, or a guess.
- There's no switch for Kal's way any more.

## Why the usual figure is too hot

The first version said USE 137.5 °F for Test Recipe v5. That's the usual sum: enough heat in the strike water to warm
the grain and the mash tun up to the rest. It leaves out the water that stays in the HLT.

With all 15 gal heated, 6.74 gal is left in the HLT at the strike temperature once the strike water has gone. When the
brewer presses Next after the grain, the pump runs the wort through the HLT's coil, and that leftover heat goes into
the mash. PID_HERMS can add heat, but it can't take any away. So water that lands the mash on the rest as the grain goes
in can then carry it over.

By the model, 137.5 °F could take the mash to 130.6 °F, 4.6 °F over the 126 °F rest, and BeerSmith's own 134.6 °F to
127.9 °F. At USE's 132.4 °F, even the top of the range goes no higher than 126.0 °F, where water heated only to the
rest would take it too.

## How the forecast works

- The model replays the brewer's dough-in step by step, as the rig page's step 9b sets it up, through PID_HERMS's own
  controller code (the plugin's PIDArduino) with the rig's settings (rig page 8b). The strike water goes through the
  coil into the cold mash tun, so the Mash Tun's probe, at the coil's outlet, reads it, and MashIn on the Mash Tun asks
  for the malt within seconds and stops the pump. The grain goes in, the brewer presses Next, and PID_HERMS holds the
  rest for an hour. All the while the HLT's leftover water passes heat through the coil, and both vessels lose heat to
  the garage.
- It takes each number from where it is known, and FORECAST lists them that way:
  - **from the recipe** (the BeerSmith import): the grain, the strike water as BeerSmith shows it (dead space included),
    the first rest, the tun's steel and its specific heat;
  - **from you**: the water in the HLT, and the grain's temperature when it spent the night away from the boil kettle;
  - **measured on the rig**: the room, from the boil kettle's probe, and the HLT: the heat it holds, how fast it loses
    it, its element and its probe;
  - **the rig's setup**: where the mash probe sits (the coil's outlet) and that the strike water goes through the coil;
  - **not measured yet**: the eleven numbers below, each a range.
- It takes the grain's temperature and the room's separately. The grain goes in at the grain's. The empty mash tun
  starts at the room's, and both vessels lose heat to it. With no usable reading for the room there is no forecast
  until the room's temperature is given in the box: a guessed room could make USE err high.
- USE is the hottest strike water, rounded down to a tenth of a degree, that in every case takes the mash no higher
  than water heated only to the rest would. "Every case" means every unmeasured number anywhere in its range: the
  model searches the ranges for the case that takes the mash highest. So a wrong guess lands the mash low, where the
  HERMS can bring it up, never high, where nothing can bring it down.
- The range the box shows is drawn from the cases that bound it: the worst the search found for that strike, the
  middle guesses, and the hot, long-hold and coolest corners. For Test Recipe v5 the worst is a slow coil at full flow,
  a tun that loses little heat and warms little of its steel, and a long wait: 10 min to the grain and 10 more to Next.
- **"Lands" is the mash as the grain goes in**: where a stirred hand thermometer would read just after dough-in. It
  then cools a little while the brewer waits to press Next, which the chart shows, before the HERMS brings it up.
- It's still a forecast. If the rig turns out outside a range, the mash could go higher, so USE's button says "aims
  under the rest" rather than promising it, and measuring the rig matters.
- Caution costs about 5 °F while the mash side is unmeasured: if every guess proved to be the middle of its range,
  USE would be 137.3 °F. As numbers are measured their ranges close up and USE rises toward that. The night-before
  test on the rig page (step 9b) measures the coil, the pump's flow, the tun's heat loss with the pump running, the
  probe's lag and what the probe reads with the pump stopped. Hot water poured into the empty tun with a hand
  thermometer (the test posted to Gauge on 18 Nov) measures how much of the tun's steel the water warms and what it
  loses on the way.

What isn't measured yet, for checking (Test Recipe v5, grain at 60.4 °F, 15 gal in the HLT). "Knowing it": how much
USE would rise if that number alone were known to be the middle of its range.

| Number | Range | Middle | Knowing it | Measured by |
|---|---|---|---|---|
| Minutes from the grain going in to Next | 0-10 min | 5 | +0.8 °F | the brew's own times |
| The tun's steel the water warms at once | 45-100 % | 75 % | +0.7 °F | hot water into the empty tun |
| The tun's heat loss, pump running | 4.45-15 W/K | 9 | +0.6 °F | the night-before test |
| Heat lost on the way to the tun | 0-2 °F | 1 | +0.6 °F | hot water into the empty tun |
| The coil's heat transfer | 150-600 W/K | 300 | +0.5 °F | the night-before test |
| Minutes from the water reaching the tun to the grain | 2-10 min | 5 | +0.5 °F | the brew's own times |
| The wort pump's flow | 3-12 L/min | 6 | +0.3 °F | the night-before test (a jug at the coil's return) |
| The malt's specific heat | 0.38-0.42 cal/g °C | 0.40 | +0.2 °F | |
| The HLT's own heat loss, 6.74 gal left | 66-100 % of its 15 gal figure | 83 % | +0.1 °F | |
| The HLT's steel and coil, still hot | 10-17 kg | 10 | +0.1 °F | |
| The mash probe's lag | 44-65 s | 44 | 0 | the night-before test |

One more is held rather than searched: with the pump stopped, the Mash Tun's probe is taken to read the HLT's water, as
still wort beside the coil would. The night-before test will show it. The box explains the dough-in reading by it.

## What the brewer sees

**The night before, with the recipe loaded** (`#sw-plan`). The window says what's planned: 8.26 gal to the mash tun at
126.0 °F, the rest's temperature, as Kal's way has it. The mash lands somewhere from 113 to 118 °F as the grain goes
in. Beside FORECAST is USE 132.4 °F, "aims under the rest". Nothing changes until it's pressed.

**Just loaded, before anything is worked out** (`#sw-working`, `#sw-working-open`). CraftBeerPi works USE out when the
recipe is loaded, and on the Pi that's expected to take about 12 to 55 seconds (an estimate: not yet measured there).
Meanwhile the window's MASH shows dashes and WORKING OUT, USE is greyed with dashes for its figure and "working it out"
under them, and one line says how long so far: "Working out USE: 20 s so far." FORECAST opens to the numbers it's
worked out from, with "The chart, and where the mash lands, come once USE is worked out."

**FORECAST opened** (`#sw-forecast`). The box's head stays as it was: the window, USE, and FORECAST's button, which now
says CLOSE, "the forecast". Under the head, the chart shows the mash for an hour from the grain going in. Red is the
water as planned, the dashed outline is USE's, and the green line is the rest. Under the chart the same is said in
words, then why it's a range, what the Mash Tun's probe may read, and every number with where it comes from. On one
screen the box takes the room of the step list and the timers while it's open, and only the details scroll, inside it:
at least 225 px of them at a time, so the chart and its key show whole. A timer that runs out meanwhile still shows in
the title bar, with OK. Where the page scrolls (a phone, a tablet, a narrow window), the head stays at the top of the
screen while the details pass under it. Either way USE and CLOSE stay in reach. CLOSE, in the same place, closes it,
and so does Escape.

**After USE** (`#sw-used`). The window says 132.4 °F, and the mash lands 118-124 °F. The step list shows 132.4 °F on
BrewStart and the strike water step. BACK TO 126.0 °F is where USE was: one tap puts it back.

**Water planned too hot** (`#sw-hot`). If the strike water step says 145 °F, the window says MASH UP TO 137 °F OVER THE
REST, in amber. The HERMS can't cool a mash, so this is the one thing in the box that needs the brewer's attention. USE
132.4 °F is right beside it.

**A number changed: worked out again** (`#sw-reworking`). Changing the HLT's water or the grain's temperature, here or
on another screen, sets CraftBeerPi working USE out again, and so does the room's temperature moving by more than half a
degree. Until it's done, the last figures stay, in the grey stale readings take, and USE is greyed: "Working out USE
again: 9 s so far." Above the chart: "The HLT's water changed, so CraftBeerPi is working USE out again. Until then,
these are the figures for 15 gal in the HLT." Pressed anyway, the greyed USE says "Not yet: the HLT's water changed,
and CraftBeerPi is working USE out again. 132.4 °F was for 15 gal in the HLT." BACK TO, if it's showing, still works:
it's never hotter.

**USE refused** (`#sw-refused`). A phone woken from sleep can still show a figure CraftBeerPi has since overtaken: here
the grain's temperature was given on another screen, and USE worked out again for it. CraftBeerPi refuses the old
figure, and the screen offers the new one in USE's place. Under the box, for 6 s and to a screen reader: "USE
132.4 °F wasn't applied: BrewStart's grain temperature is now 70.0 °F, so USE is 131.8 °F." The window still shows the
strike water at 126.0 °F. Nothing is logged, as nothing changed. If CraftBeerPi is still working the new figure out,
the sentence ends "…, and CraftBeerPi is working USE out again." and the box shows it working.

**Brew morning** (`#sw-wait`, `#sw-heat`, `#sw-move`, `#sw-late`). The box stays while BrewStart waits for the time to
start heating, while the strike water step heats the HLT, and while it asks for the water to be moved. If USE wasn't
pressed the night before, it can still be pressed then.

**Dough-in** (`#sw-doughin`). The strike water came through the coil, so the Mash Tun's probe, at the coil's outlet,
read it at once, and MashIn on the Mash Tun asked for the malt 4 s after the water arrived, Kal's way too. With the
pump stopped for the malt, the probe isn't reading the mash: the model takes it to read the water left in the HLT's
coil, 132.2 °F 40 s on, with the HLT at 132.3 °F and its element off. That's "6.2 °F above target" on the Mash Tun's
faceplate. Nobody has measured it yet, and Brett is having it recorded at the rig page's night-before test (step 9b).
So the box says only what's certain, and only when the reading is more than 3 °F above the top of where the mash lands:
"The Mash Tun's 132.2 °F isn't the mash: with the pump stopped, its probe reads the water left in the HLT's coil." The
mash itself lands 118-124 °F. Once the malt is in, the box goes.

**No water figure** (`#sw-novol`). If BrewStart has no water volume, the box asks for it, and HLT WATER opens the box to
give it.

**A grain temperature the forecast can't use** (`#sw-grain-bad`). BrewStart's grain temperature is saved on Brew Steps,
which takes anything. Outside 35-120 °F, or not a number, the forecast can't use it, so the box says so where USE was:
"BrewStart's grain temperature is 150.0 °F, warmer than any room. The forecast can't use it." ("colder" below 35 °F;
"BrewStart's grain temperature isn't a number. The forecast can't use it.") GRAIN, "change it", beside it, opens the
grain's box, with THE PROBE across its foot. SET or THE PROBE puts it right, and USE is worked out as usual. If the
numbers come back to those of the last answer, that answer holds again at once.

**The forecast failed** (`#sw-failed`). If CraftBeerPi's work on USE fails, there's no USE: "CraftBeerPi couldn't work
out a forecast for these numbers, so there's no USE. The strike water stays as planned, at 126.0 °F. What went wrong is
in LOG." MASH shows dashes. The last figures aren't shown, even greyed: they were for other numbers, and nothing is
coming to replace them. LOG has "Strike water forecast failed: …", with "failed" in light red, as a failed command's
result has. Nothing in the title bar and no sound, since nothing waits for the brewer. Once a number it works from
changes, the box works USE out again as usual.

**What would raise USE most, still coming** (`#sw-levers`). After the HLT's water was changed to 13.5 gal and USE
worked out again, FORECAST's NOT MEASURED YET says "CraftBeerPi is still working out which of these would raise USE
most if it were known: that comes a few minutes after USE." in place of the sentence naming them. Those take eleven
more plans: about 40 s on a PC and 3-6 minutes on the Pi, so USE doesn't wait for them. In the mockup they come a minute
after USE.

**USE pressed too late** (`#sw-refused-moved`). A phone woken from sleep on brew morning can still show the night
before's box after the water has gone to the mash tun. USE pressed there is refused, and under the box for 6 s: "USE
132.4 °F wasn't applied: the strike water is already in the mash tun." The box then shows dough-in as CraftBeerPi has
it.

**Changing the HLT's water** (`#sw-volume`). CHANGE, in FORECAST, opens a box laid out like TARGET's: −1, −.1, the
number, +.1, +1, then SET and CANCEL. SET sets CraftBeerPi working USE out again.

**Giving the grain's temperature** (`#sw-grain-edit`, then `#sw-grain`). FORECAST's FROM YOU says where the grain's
temperature comes from. With BrewStart's left blank: "Grain at 60.4 °F: the boil kettle's probe, as BrewStart's grain
temperature is blank. Grain that spent the night somewhere warmer lands the mash higher: give its temperature." CHANGE
beside it opens a box laid out as the HLT water's, which says when to give it: "For grain that spent the night away
from the boil kettle. It is BrewStart's grain temperature: left blank, the kettle's probe is used." With 70 °F set the
line says "Grain at 70 °F: BrewStart's grain temperature. Left blank, the boil kettle's probe would stand for it, at
60.4 °F.", USE becomes 131.8 °F once worked out, and the box, opened again, has THE PROBE, "the boil kettle's, 60.4 °F,
instead", to blank it.

**The mash probe at the tun's outlet** (`#sw-tunprobe`). The rig's probe sits at the coil's outlet, but the model can
take it at the tun's, a setting in the rig's setup. There PID_HERMS takes the mash over the rest by itself, so the words
say so: "Going over the rest is PID_HERMS's own overshoot, which it makes whatever the strike: with the water heated
only to the rest, it takes the mash to 127.5 °F." USE is 132.9 °F. With the probe reading the tun itself there's no
dough-in line and no "may read" sentence.

**On a phone** the box sits in the same place in the recipe column, with the same buttons at the same size.

## The water in the HLT: where it's given, and when

- **Where:** BrewStart's **Water volume** (its Volume setting). It already means "all the water in the kettle", and it
  already sets the Campden dose, so one figure does both jobs. The rig page's step 9b sets it to 15 gal.
- **When:** the night before, when the HLT is filled and treated, which is when the figure is known. If it isn't what
  the recipe has, it's changed in Brew Steps, or on brew day with CHANGE in FORECAST.
- The step list shows it on BrewStart's row: "126 °F · ready by 07:00 · 15 gal".
- While BrewStart's Campden reminder is on, FORECAST gives the dose for it beside the figure ("Campden for it: ¾
  tablet"), worked out as BrewStart does it, and LOG gives it again whenever the figure is changed in the box.
- BeerSmith's export doesn't carry the sparge water, so CraftBeerPi can't take it from the recipe.
- Brewing by hand, with no BrewStart in the recipe, the box asks for it and CraftBeerPi keeps it for the brew day.
- How much it matters, for Test Recipe v5: with 12 gal in the HLT USE would be 133.3 °F; with 15 gal, 132.4 °F; with
  20 gal, 131.4 °F. More water than the box knows about pushes the mash higher, so the figure needs to be right, or a
  little over. FROM YOU shows what stays in the HLT ("The 6.74 gal that stays there…"), so a Volume holding only the
  strike water, which would leave none and make USE too hot, is easy to spot.

## The grain's temperature: where it's given, and when

- **Where:** a new **Grain temperature** setting on BrewStart, beside Water volume, empty unless given, in the
  brewery's unit. BrewStart in CraftBeerPi is the brewer's own fork of cbpi4_BrewStart, so the setting can be added
  there. Its description: "The grain's temperature, if it spends the night somewhere other than with the boil kettle.
  Leave blank to use the boil kettle's probe."
- **When:** the night before, while setting up BrewStart with Ready by, and only when the grain is spending the night
  away from the boil kettle. Left blank, the boil kettle's probe stands for it: the kettle is empty until the sparge
  and sits in the garage, so its probe reads the garage, less its offset, as COMPARE PROBES takes it.
- **On brew morning:** CHANGE in FORECAST, if the grain ended up somewhere else after all. THE PROBE goes back to the
  boil kettle's probe.
- **Brewing by hand,** with no BrewStart: the same box keeps a figure for the brew day, as the HLT's water is kept.
- **The room is the boil kettle's probe,** grain given or not, since the forecast uses the room for more than the
  grain. Without a usable reading from it, the box says so and asks for the room's temperature rather than guessing
  it: a guessed room could make USE err high (decision 14).
- How much it matters, for Test Recipe v5: grain at 70 °F with the garage at 60.4 °F makes USE 131.8 °F instead of
  132.4 °F. Grain warmer than the box knows about lands the mash higher, so the figure needs to be right.

## Decisions

1. **The two fixes.** USE or BACK TO, with CLOSE, stay in reach while FORECAST is open, and FORECAST's button turns into
   CLOSE in its own place. COMPARE PROBES' DONE stays as it is.
2. **The HLT's water is BrewStart's water volume.** "Yes, use BrewStart's water volume (Recommended)". On 22 Nov he
   added that he shouldn't have to type it: Robin is working out filling it in by itself, from the recipe if it can,
   otherwise from the last brew.
3. **The grain's temperature is BrewStart's Grain temperature, blank for the boil kettle's probe,** given the night
   before. "A is my answer but I think we can figure out the night before when setting up the BrewTimer". On 22 Nov he
   chose to be asked each time, once per brew: "I'm thinking it might spend the night indoors if I've purchased enough
   for the batch at the homebrew store. If I end up having bulk grains in the garage, then it will be at garage
   temperature. I don't know yet." The question (in the garage, so the boil kettle's probe stands for it, or indoors,
   at a temperature) comes with setting BrewStart's time on Brew Day the night before, designed with that; GRAIN in
   this box stays, for a change on brew morning.
4. **The figure is the forecast's, with BeerSmith's beside it.** (Brett's pick, confirmed by the brewer on 22 Nov:
   "Show both".) FORECAST shows BeerSmith's 134.6 °F, "for grain at 65 °F and the tun at 72 °F", and why it's higher:
   "It leaves out the HLT's 6.74 gal, so here it could take the mash to 128 °F, over the rest."
5. **The volume is shown: 8.26 gal.** (Brett's pick, which the brewer found fine on 22 Nov.) It's BeerSmith's own
   figure ("Add 33.04 qt of water"), so what's sent can be checked against it.
6. **Kal's way stays, as not pressing USE.** The box always says where the mash lands with the water as planned, so it
   reads sensibly either way.
7. **The figures are the bench's model's.** They replaced the stand-in's on 20 Nov: USE 132.4 °F where the stand-in
   said 133.2 °F, 0.8 °F lower, as the model searches every unmeasured number's whole range rather than three cases.
8. **USE by the model's second rule** (Brett's choice): no higher than water heated only to the rest would take the
   mash, in every case. The first rule, every case at or under the rest, gives no figure at all for Test Recipe v5:
   PID_HERMS takes the mash a little over the rest by itself, 126.03 °F at worst, even with the water at the rest.
   Where the first rule has a figure, the second gives the same one. FORECAST says it: "USE errs low: even at the top
   of the range, it takes the mash no higher than water heated only to the rest would." USE's button still says "aims
   under the rest". Where PID_HERMS's own overshoot shows at a tenth of a degree, the words say it's PID_HERMS's own
   and happens whatever the strike. On the coil's outlet that's never (126.03 °F shows as 126.0); on the tun's outlet it
   would be up to 1.5 °F (`#sw-tunprobe`). Amber still means the strike's own doing: a forecast more than half a degree
   above both the rest and what water at the rest would reach.
9. **"Lands" is the mash as the grain goes in.** The model gives either that or the lowest point before Next. The
   stand-in had the lowest point, about 2 °F lower, as it counted the cooling while the brewer waits to press Next. That
   depends on how long he waits, which the model can only guess at (0-10 min); the moment the grain goes in doesn't,
   it's what a stirred hand thermometer reads then, and it's the chart's left edge, GRAIN IN. The words say it: "the
   mash lands 113-118 °F as the grain goes in". The dip while he waits shows on the chart.
10. **NOT MEASURED YET lists ranges, not three cases.** Each unmeasured number with its range, in the order of how much
    knowing it would raise USE. Then the three that matter most, with how much, and USE if every one proved to be the
    middle of its range (137.3 °F). It doesn't say which value USE's worst case takes: the worst case is a combination,
    and one of its values on its own can look backwards (at grain 70 °F it warms all of the tun's steel and loses no
    heat on the way), which would read as if USE weren't cautious there.
11. **While CraftBeerPi works USE out, USE is greyed.** CraftBeerPi refuses a figure worked out from numbers that have
    moved since, so the screen doesn't offer one, and says why when it's pressed. BACK TO stays: it's never hotter. The
    last figures stay meanwhile, greyed as stale readings are, never shown as if current. One short line says it's
    working and for how long, so the step list under the closed box keeps its room; why, and what the grey figures are
    for, are said above the chart and by the greyed USE. It shows the time so far, not an estimate: the Pi's 12-55 s is
    a guess.
12. **A refused USE says so under the box, and offers the new figure in USE's place**, as START's refusal does: a note
    for 6 s, said to a screen reader, and no LOG line, since nothing changed. The window keeps showing the strike water
    as it is. Nothing is applied until USE is pressed again.
13. **The recipe's grain weight and mash water can be typed in the box.** A missing figure may only improve things,
    never block the brewer. So where the loaded recipe has neither BeerSmith's figure nor one given here (nor, for the
    grain, a mash step's own Grain_Kg), the line names it and says "Type it here, or import its BeerSmith file again and
    choose UPDATE.", and GRAIN WEIGHT and MASH WATER sit under it, above USE, HLT WATER and GRAIN, each with "give it",
    then its figure and "change". UPDATE, on the Recipe Book's import of a name the book has, gives the loaded recipe
    BeerSmith's mash figures at once, in place of any typed here, with nothing loaded again and no step changed, even
    while BrewStart waits (core post72); importing it as a new recipe would make a second copy and lose what was
    changed since loading. Each
    opens its own small box in place of the line and the buttons, as HLT WATER's does: "Grain weight, in pounds" (or
    kilograms) and "Mash water, in gallons" (or litres), the strike water that goes to the mash tun, not the sparge.
    SET keeps the figure with the loaded recipe (POST /step2/strike/recipe): CraftBeerPi writes it into the recipe's
    mash figures as given here, never as BeerSmith's, takes it out of what the recipe lacks, and works USE out from it
    at once. The box refuses a figure no brew comes near (0.5-200 lb, 0.5-100 gal), as CraftBeerPi does, and
    CraftBeerPi refuses to replace a figure BeerSmith gave. FORECAST shows a given figure under From you, with CHANGE,
    in place of its line under From the recipe; a grain weight MashIn keeps itself shows as "MashIn's own, on Brew
    Steps". LOG: "Mash water set to 8.26 gal for this recipe", "Grain weight set to 20.0 lb for this recipe, was 18.0
    lb". Not given here: the mash step's temperature (Brew Steps), the mash tun's weight (the Hardware page or the
    recipe; it only narrows the forecast), the mash tun's control interval (Hardware), and BeerSmith's own strike,
    grain and tun temperatures, which FORECAST only compares against.
14. **The room's temperature can be given in the box while the boil kettle's probe can't stand for it.** With no
    reading from the probe, or one outside a room's range (35-120 °F), the line says so and ROOM, under it, asks for
    the room's temperature, kept for this brew (POST /step2/strike/room). USE is worked out from it, and where no
    grain temperature is given the grain is taken to be at it, which the grain's line and box say ("the room's
    temperature given here"; GRAIN's box offers THE ROOM in place of THE PROBE). It is used only while the probe gives
    no reading a room can have: once the probe reads within that range again, its reading is the room, and FORECAST
    says so: "Room 66 °F given here, kept aside: the boil kettle's probe reads the room again, at 60.4 °F, so it is
    used." While it stands for the room, MEASURED ON THE RIG has no ROOM, as nothing on the rig measured it. THE PROBE
    in ROOM's box takes it back. A given room is never one of BeerSmith's figures, and a new brew day starts without
    one. LOG: "Room temperature set to 66.0 °F for this brew", with ": kept aside, as the boil kettle's probe reads the
    room" where the probe reads one, and "Room temperature from the boil kettle's probe, the 66.0 °F given taken
    back".

## The dead space in the BeerSmith profile

These figures are from Test Recipe v5's BeerSmith export, which carries the equipment profile the recipe was saved
with. The profile on the brewery PC was changed on 10 Nov, so a recipe exported from it now may carry other figures.
The export has two dead spaces:

- **Lauter Deadspace: 0.00 gal.** Water lost for good. The helper doesn't use it.
- **Recoverable Mash Deadspace: 0.76 gal.** The water under the false bottom. BeerSmith adds it to the first infusion
  only: 20 lb at 1.5 qt/lb is 30.00 qt, and the recipe says "Add 33.04 qt of water at 134.6 F". The 3.04 qt is the
  0.76 gal.

The helper takes the water as BeerSmith shows it, 33.04 qt (8.26 gal), and never adds the dead space a second time.
FORECAST shows the two parts: "7.50 gal for the grain and 0.76 gal under the false bottom". A recipe exported with
another profile brings that profile's dead space in the same way.

On 25 Oct he measured about half a gallon under the false bottom, not 0.76 gal. To use that measurement, change
**Recoverable Mash Deadspace** to 0.50 gal in the equipment profile the recipe uses in BeerSmith (not Lauter
Deadspace), and import the recipe again. The box would then say 8.00 gal, and USE would move by a tenth, to 132.5 °F.

## The words

The window, a small PID window like the faceplates':

- `STRIKE  8.26 gal AT 126.0 °F`. The temperature is in the faceplates' setpoint green, as it's a target.
- `MASH  LANDS 113-118 °F`, or in amber `MASH  UP TO 137 °F OVER THE REST`. A screen reader says "113 to 118". Each
  fits on one line at every size, from a 360 px phone up.
- While USE is worked out: `MASH  – – WORKING OUT` with nothing worked out yet, or the last figures in grey.
- The same `– – WORKING OUT` for the second or so after the strike water is changed elsewhere (its Temp edited on Brew
  Steps, or by hand the HLT's target set), until CraftBeerPi sends the forecast for it. The screen doesn't ask for one
  itself. If none has come after 10 s, the tag goes, so nothing claims to be working. With FORECAST open meanwhile, the
  chart and its words show the other choice alone.

The box's head: the window, then two buttons side by side under it.

- `USE 132.4 °F` / "aims under the rest", in the selection blue of the editors' SET. Brewing by hand: "as the HLT's
  target".
- `BACK TO 126.0 °F` / "as it was", in the same place once USE is in use.
- `FORECAST` / "in detail". Opened, the same button says `CLOSE` / "the forecast". It tells a screen reader whether the
  details are open, and which part of the page they are.
- While CraftBeerPi answers, the pressed button says `SENDING…` and is greyed.
- Greyed while the HLT heats the strike water, if the temperature is below the water's: "The water is already at
  132.3 °F, above 126.0 °F, and the HLT can't cool it."
- BACK TO greyed when the plan it goes back to is over 179.6 °F (82 °C), the hottest strike water the box sets, as with
  a plan typed on Brew Steps as 185 °F: "185.0 °F is over 179.6 °F, too hot for strike water, so BACK TO can't set it."
  By hand, adding "TARGET can set the HLT to it." MashIn itself still heats to any temperature typed on Brew Steps.
- Greyed while USE is worked out: `USE – – °F` / "working it out", or with the last figure, `USE 132.4 °F` / "working it
  out". Pressed: "Not yet: CraftBeerPi is still working USE out for this recipe." or "Not yet: the HLT's water changed,
  and CraftBeerPi is working USE out again. 132.4 °F was for 15 gal in the HLT." (or "the grain's temperature changed",
  "the room's temperature moved").

Under the window, in the head:

- While USE is worked out: "Working out USE: 20 s so far.", or "Working out USE again: 9 s so far.", the seconds
  counting on.
- During dough-in, with the pump stopped and the Mash Tun reading more than 3 °F above the top of where the mash lands
  (the probe at the coil's outlet only): "The Mash Tun's 132.2 °F isn't the mash: with the pump stopped, its probe
  reads the water left in the HLT's coil." Where the rig's setup takes the probe to cool with the pump stopped
  (`still_probe` above 0), the line shows when the reading is more than 3 °F outside where the mash lands, above or
  below, and says: "The Mash Tun's 102.4 °F isn't the mash: with the pump stopped, its probe reads the still water at
  the coil's outlet." It takes as many lines as the other at every size.

FORECAST's details, under the head:

- While USE is worked out again, first: "The HLT's water changed, so CraftBeerPi is working USE out again. Until then,
  these are the figures for 15 gal in the HLT." With nothing worked out yet, in place of the chart: "The chart, and
  where the mash lands, come once USE is worked out. These are the numbers it is worked out from."
- The chart, labelled for a screen reader "Chart of the mash's temperature for an hour from the grain going in, with
  the strike water at 126.0 °F and with the strike water at 132.4 °F, against the 126 °F rest. Described under it."
  (worked out again: "… The figures are for 15 gal in the HLT, while USE is worked out again. …") Its key: "126.0 °F, as
  planned", "132.4 °F, with USE", "the rest, 126 °F".
- Under it, for everyone: "At 126.0 °F, as planned, the mash lands 113-118 °F as the grain goes in and is 118-126 °F
  half an hour later. At 132.4 °F, with USE, it lands 118-124 °F and is 120-126 °F half an hour later. Neither is
  forecast to go over the 126 °F rest." Planned too hot: "At 145.0 °F, as planned, the mash lands 128-135 °F as the
  grain goes in and could reach 137 °F, over the rest: the HERMS can't cool it. At 132.4 °F, with USE, it lands
  118-124 °F and is 120-126 °F half an hour later." With the probe at the tun's outlet: "At 126.0 °F, as planned, the
  mash lands 119-120 °F as the grain goes in, is 120-127 °F half an hour later, and could reach 127.5 °F. At
  132.9 °F, with USE, it lands 118-124 °F, is 120-126 °F half an hour later, and could reach 126.5 °F. Going over the
  rest is PID_HERMS's own overshoot, which it makes whatever the strike: with the water heated only to the rest, it
  takes the mash to 127.5 °F."
- "It's a range because some of the rig hasn't been measured yet (below). USE errs low: even at the top of the range,
  it takes the mash no higher than water heated only to the rest would."
- When USE comes out at the rest itself, with the strike water at the rest already, there's no USE, and before that:
  "USE would be the rest itself here, so there's nothing to change: hotter water could take the mash higher than water
  heated only to the rest would."
- "With USE, the Mash Tun may read up to 132 °F during dough-in. That won't be the mash: its probe sits at the coil's
  outlet, and with the pump stopped it reads the water left in the HLT's coil." (Once USE is in use: "During dough-in
  the Mash Tun may read up to 132 °F. …"; the probe at the coil's outlet only.) With `still_probe` above 0, the second
  sentence is "Neither that nor the lower readings after it will be the mash: its probe sits at the coil's outlet, and
  with the pump stopped the water there cools toward the room."
- FROM THE RECIPE. GRAIN "20 lb". WATER "8.26 gal to the mash tun: 7.50 gal for the grain and 0.76 gal under the false
  bottom". MASH TUN "33 lb of steel". REST "126 °F".
- FROM YOU, each line with CHANGE beside it:
  - "15 gal in the HLT, strike and sparge: BrewStart's water volume. Campden for it: ¾ tablet. The 6.74 gal that stays
    there warms the mash through the coil." Without BrewStart's Campden reminder, and brewing by hand, without "Campden
    for it". The dose is BrewStart's: one tablet per 20 gal, rounded up to a quarter, written "¾", "1" or "1¼ tablets"
    (15.0 gal is ¾, 15.1 gal is 1).
  - "Grain at 60.4 °F: the boil kettle's probe, as BrewStart's grain temperature is blank. Grain that spent the night
    somewhere warmer lands the mash higher: give its temperature." With a figure given: "Grain at 70 °F: BrewStart's
    grain temperature. Left blank, the boil kettle's probe would stand for it, at 60.4 °F." Brewing by hand: "Grain at
    60.4 °F: the boil kettle's probe. …" and "Grain at 70 °F, given for today's brew. Without it, the boil kettle's
    probe would stand for it, at 60.4 °F."
- MEASURED ON THE RIG. ROOM "60.4 °F: the boil kettle's probe, as the kettle is empty, less its offset. The mash tun
  starts at it, and both vessels lose heat to it". HLT "how much heat it holds, how fast it loses it, its element and
  its probe".
- THE RIG'S SETUP. MASH PROBE "at the coil's outlet: with the pump running it reads the wort leaving the coil" (or "at
  the tun's outlet: it reads the mash leaving the tun"). STRIKE "the water goes to the mash tun through the coil, by
  the HLT pump" (plumbed past the coil: "the water goes to the mash tun straight from the HLT, by the HLT pump").
- NOT MEASURED YET. "USE allows for every one of these anywhere in its range, so a wrong guess lands the mash low, where
  the HERMS can bring it up." Then, each with its range: TO NEXT "0-10 min from the grain going in to pressing Next".
  TUN STEEL "45-100 % of it warmed by the water at once". TUN LOSS "4.45-15 W/K: how fast it loses heat with the pump
  running". ON THE WAY "0-2 °F lost between the HLT and the tun". COIL "150-600 W/K: how fast it passes heat to the
  wort". TO GRAIN "2-10 min from the water reaching the tun to the grain going in". WORT PUMP "3-12 L/min through the
  coil". MALT "0.38-0.42 cal/g °C: how much heat it holds". HLT LOSS "66-100 % of its heat loss at 15 gal, with
  6.74 gal left in it". HLT STEEL "10-17 kg with its coil, still hot when the water goes". PROBE LAG "44-65 s: how far
  the mash probe's reading trails the wort". PUMP OFF "the Mash Tun probe taken to read the HLT's water, as still wort
  beside the coil would. Not checked on the rig yet" (the coil's outlet only; with `still_probe` above 0, "the Mash Tun
  probe taken to cool from the HLT's water 25 % of the way to the room, as still water in its pipe would. Not checked
  on the rig yet", or "all the way" at 1). Then, once USE is worked out: "Knowing
  the minutes from the grain to Next, how much of the tun's steel warms and the tun's heat loss would raise USE the
  most: about 0.8, 0.7 and 0.6 °F. If every one proved to be the middle of its range, USE would be 137.3 °F." Until
  CraftBeerPi has worked those out, a few minutes after USE: "CraftBeerPi is still working out which of these would
  raise USE most if it were known: that comes a few minutes after USE."
- BEERSMITH. STRIKE "134.6 °F, for grain at 65 °F and the tun at 72 °F. It leaves out the HLT's 6.74 gal, so here it
  could take the mash to 128 °F, over the rest". While USE is worked out, its first sentence only.

The HLT's water box: the label "HLT WATER, IN GALLONS", and under it "All the water in the HLT now, strike and sparge.
It is BrewStart's water volume, which also sets the Campden dose." Then −1, −.1, the figure, +.1, +1, `SET 15.0 gal`
and `CANCEL`. Enter sets and Escape cancels. It says why it won't set: "Type how much water is in the HLT, in
gallons." or "The HLT holds the strike water too, so at least 8.26 gal." Where the volumes are in litres (BrewStart's
Volume_Unit L, or by hand on a °C brewery): "HLT WATER, IN LITRES", `SET 56.8 L`, "… in litres.", as BrewStart's own
form says "litres".

The grain's box: the label "GRAIN TEMPERATURE, IN °F", and under it "For grain that spent the night away from the boil
kettle. It is BrewStart's grain temperature: left blank, the kettle's probe is used." (brewing by hand: "… boil kettle.
Without it, the kettle's probe is used."). Then −1, −.1, the figure, +.1, +1, `SET 70.0 °F` and `CANCEL`, and, while a
figure is in use, `THE PROBE` / "the boil kettle's, 60.4 °F, instead" across the box. It opens with the figure in use,
or the probe's, selected. Enter sets and Escape cancels. It says why it won't set: "Type the grain's temperature, in
°F." or "The grain's temperature has to be between 35 and 120 °F." (what COMPARE PROBES counts as a room's). One box at
a time: opening one closes the other. On a °C brewery: "GRAIN TEMPERATURE, IN °C", "… in °C." and "… between 1.5 and
49 °C."

In LOG, and said to a screen reader with ": confirmed":

- "Strike water set to 132.4 °F, was 126.0 °F" and "Strike water set back to 126.0 °F".
- Brewing by hand: "Hot liquor tank target 132.4 °F for the strike water, was 126.0 °F" and "Hot liquor tank target
  back to 126.0 °F".
- "HLT water set to 12.0 gal, was 15.0 gal", with " · Campden ¾ tablet" after it while BrewStart's Campden reminder is
  on.
- "Grain temperature set to 70.0 °F, was the boil kettle's probe" (or "was 68.0 °F", or "was not a number"), and "Grain
  temperature from the boil kettle's probe, was 70.0 °F".

Once, when CraftBeerPi's work on USE fails, its result "failed" in light red, as a failed command's: "Strike water
forecast failed: {what went wrong, as CraftBeerPi says it}".

Said to a screen reader only: "Working out USE again." as it starts again, and "USE worked out: 132.4 °F." as it's done.

Under the box, for 6 s, and said to a screen reader, when CraftBeerPi refuses USE: "USE 132.4 °F wasn't applied:
BrewStart's grain temperature is now 70.0 °F, so USE is 131.8 °F." or, still being worked out, "USE 132.4 °F wasn't
applied: BrewStart's grain temperature is now 70.0 °F, and CraftBeerPi is working USE out again." What moved is named
as the screen finds it: "BrewStart's grain temperature is now 70.0 °F", "the grain's temperature is the boil kettle's
probe's again, 60.4 °F", "BrewStart's water volume is now 20.0 gal" (by hand "the HLT's water is now 20.0 gal"), "the
room is now 62.1 °F".

The same way, for a screen that hadn't caught up with CraftBeerPi, with the box then following it: "USE 132.4 °F
wasn't applied: the strike water is already in the mash tun." ("BACK TO 126.0 °F wasn't applied: …"), and when the box
no longer applies, after "wasn't applied:": "no recipe is loaded now.", "the malt is already in.", "the mash tun no
longer runs PID_HERMS.", "the recipe's first mash tun step isn't MashIn now.", "CraftBeerPi doesn't find the mash tun
now." or "CraftBeerPi doesn't find the HLT now." Also:

- BACK TO, when another screen has moved the strike water since: "BACK TO 126.0 °F wasn't applied: the strike water was
  changed on another screen. It's 131.8 °F now." By hand: "… the HLT's target was changed on another screen. …". The
  figure is the strike water as CraftBeerPi sends it with the refusal, so it says what is in force.
- USE or BACK TO on a recipe changed elsewhere, decided from CraftBeerPi's answer as START's refusal is: "USE 132.4 °F
  wasn't applied: another recipe was loaded on another screen." (another name), "…: the recipe was changed on another
  screen." (the same name, as for the same recipe loaded again from the Recipe Book) or "…: the recipe was unloaded on
  another screen." (no steps). That refusal carries no state, so the screen asks CraftBeerPi for it.
- USE when a number has gone missing since: "USE 132.4 °F wasn't applied: a number it's worked out from is missing
  now." The box then says which, in the buttons' place.
- USE or BACK TO over 179.6 °F (400 `too_hot`), which only a screen that hadn't caught up sends, as BACK TO over it is
  greyed and USE over it isn't offered: "BACK TO 185.0 °F wasn't applied: it's over 179.6 °F, too hot for strike
  water." It's a refusal, not a failed command: nothing logged and no alarm. Nothing changed, so the box stays as it is.
- With core post56, which reports the mash tun's control interval as off rather than as a number missing (below):
  "USE 132.4 °F wasn't applied: the forecast can't use the mash tun's control interval now." From post57 a USE refused
  for it is 409 `missing`, worded as above.

The HLT's water and the grain's temperature, refused the same way, under the box for 6 s, with nothing logged: "The
HLT's water wasn't set to 16.0 gal: …" and "The grain's temperature wasn't set to 70.0 °F: …" (THE PROBE: "The grain's
temperature wasn't changed to the boil kettle's probe: …"), then the recipe's three reasons above, or "no recipe is
loaded now." These close the small box, and the box follows CraftBeerPi. Two leave it open with the figure, so it can
be put right: under the strike water, "…: the HLT holds the strike water too, so at least 8.26 gal.", and a grain
temperature out of range, "…: it has to be between 35 and 120 °F.", each with CraftBeerPi's own figures.

When CraftBeerPi doesn't answer, or answers with an error that isn't one of these refusals, the command has failed
(The Answer At The Button Rule): its button shows it, the title bar has an alarm with OK, and LOG gets the command with
"failed: {why}" in light red. The alarm says what is in force:

- USE or BACK TO: "The strike water did not change. It is still 126.0 °F." By hand, as SET's: "The hot liquor tank
  target did not change. It is still 126.0 °F."
- The water: "The HLT's water did not change. It is still 15.0 gal." With none given before: "The HLT's water did not
  change. None is given yet."
- The grain: "The grain's temperature did not change. It is still 70.0 °F." From the probe before: "The grain's
  temperature did not change. It is still the boil kettle's probe's, 60.4 °F."

When a number is missing, the reason takes the buttons' place, and each says what to do:

- "How much water is in the HLT, strike and sparge? The forecast needs it." with `HLT WATER` / "set it" beside it.
- What the recipe lacks for USE, named: "This recipe has no mash water from BeerSmith, so where the mash lands isn't
  known. Type it here, or import its BeerSmith file again and choose UPDATE." That is a recipe imported before
  CraftBeerPi kept BeerSmith's mash figures (core post55), as every recipe in the rig's book is; its MashIn has a grain
  weight, which CraftBeerPi uses, so the grain weight isn't named. With no grain weight in any step either (a recipe
  built on Brew Steps): "… no grain weight or mash water from BeerSmith, … Type them here, or …". Only the grain
  weight and the mash water are named, as only they stop USE: the mash tun's weight comes from the Hardware page or
  the recipe and only narrows the forecast, and BeerSmith's own strike temperature and the grain's and the tun's are
  only FORECAST's comparison. GRAIN WEIGHT and MASH WATER, "give it", sit under the line, above USE, HLT WATER and
  GRAIN (decision 13). Where another sentence follows it (the probe's, or the water's question), it leaves out "so
  where the mash lands isn't known", so the box still fits one screen with every figure it asks for. UPDATE gives the
  loaded recipe the figures at once, so nothing has to be loaded again. From a CraftBeerPi that takes no figures in
  the box, the line ends "Import it again and load it." The mash step with no temperature: "MashIn has no
  temperature, so where the mash lands isn't known. Give it one in Brew Steps."
- "The mash tun's control interval is 2.5 s. The forecast can't use it: set it to 2 or 5 s in Hardware." It comes only
  for a fraction from 1 to 60 s, such as 2.5: PID_HERMS runs a SampleTime from 1 to 60 s as it is, but one that's
  blank, not a number, or outside 1-60 s at its 5 s default, and says so in a notice. The forecast does the same, so
  for those the box works as usual. The forecast replays PID_HERMS's decisions, so it can't step through a fraction of
  a second. "Control interval" and "2 or 5" are the Hardware page's own words for the mash tun's SampleTime; 2 and 5
  are the only choices it offers. "isn't a number" stays only as a safety net. It comes right after the recipe's
  sentence, as a setting made before brew night. Without it, the box would vanish from brew night for one setting, and
  nothing would say why.
- "The boil kettle's probe gives no reading, so the room's temperature isn't known, nor the grain's. Check its plug and
  cable, or type the room's temperature here." With the grain's temperature given, without "nor the grain's". ROOM,
  "give it", sits under the line (decision 14).
- "The boil kettle's probe reads 140.0 °F, warmer than any room, so it can't stand for the room or the grain. Type the
  room's temperature here." (outside 35-120 °F, the same limits as COMPARE PROBES; with the grain's temperature given,
  without "or the grain"), with ROOM under it.
- Either of those behind another missing number is said after that number's line, short, as ROOM under it asks for the
  room and the box has to fit one screen with every figure it asks for: "The boil kettle's probe gives no reading
  either." and "The boil kettle's probe reads 140.0 °F, warmer than any room."
- "It works out at 160.5 °F, more than 27 °F above the rest: too far to trust. Check the grain weight and the water in
  BeerSmith." (MashInStep's own limit, 15 °C) Within 27 °F of the rest but over the ceiling, which only a rest above
  152.6 °F can bring: "It works out at 181.2 °F, over 179.6 °F: too hot for strike water. Check the grain weight and the
  water in BeerSmith." (MashInStep's ceiling, 82 °C)
- "BrewStart's grain temperature is 150.0 °F, warmer than any room. The forecast can't use it." ("colder" below 35 °F;
  "BrewStart's grain temperature isn't a number. The forecast can't use it."), with `GRAIN` / "change it" beside it,
  which opens the grain's box.

When CraftBeerPi's work on USE fails, in the same place: "CraftBeerPi couldn't work out a forecast for these numbers,
so there's no USE. The strike water stays as planned, at 126.0 °F. What went wrong is in LOG." Brewing by hand, the
second sentence is "The HLT's target stays at 126.0 °F."

## Where it sits, and when

In the recipe column, under START, STOP and NEXT STEP, and under COMPARE PROBES while that's there. That puts it next
to the plan it changes, and the step list right under it shows the change. It isn't on the HLT's faceplate: the three
faceplates share their rows, so a box on one would push the other two out of line.

- From the moment the recipe is loaded until the malt goes in: while BrewStart waits, while the strike water step heats
  and holds the water, and through dough-in. Then it's gone.
- It makes way for the pre-brew check's box, the probes side by side, and NEXT STEP's or RESET's question, which sit
  in the same place. One box at a time.
- On one screen it is 152-172 px tall, 180-194 px while USE is worked out, with its one line about it, and 215-226 px
  during dough-in with its line about the Mash Tun's reading. The current step stays whole at every one-screen size,
  from 1180 × 860 up.
- FORECAST is long. Opened, its head stays where it was and only the details move. On one screen the box takes the room
  of the step list and the timers, as COMPARE PROBES and the pre-brew check's box now do too, and the details scroll
  inside it: 225 px at a time on a window 860 px tall, 292 px on a 1920 × 950 window, 562 px on a 1278 × 1197 one,
  timers or not. Where the page scrolls, the head stays at the top of the screen while the details pass under it.
  Nothing above the box moves as it opens or closes, and nor does the button. On a phone the details are about two
  screens.
- **Why the timers make way** (decided 20 Nov, after the approval, when Brett asked about the smallest windows). With
  the step list's room alone, the details got 107 px at 1180 × 860, less than the chart, and with two timers in the
  column they got none at all from 1180 to 1600 px wide, and 18 px on a 1920 × 950 window. Letting the page scroll on
  a monitor, as on a phone, was the other way: it would take the title bar, with its alarms, and the faceplates out of
  view while the forecast is read. The step list already makes way for an open box, and the timers' alarms come in the
  title bar as well as on their rows, so the timers make way the same way, and come back when the box closes. A
  timer's editor open at the time makes way with them, keeping what was typed, and comes back as it was. The other
  way round, while a timer's editor is open the closed box makes way for it, as the step list does, so the page
  doesn't grow; FORECAST and USE are back when the editor closes.
- **Known limits.**
  - With timers in the column on one screen, the closed box can leave the step list too short for the current step:
    with two timers on a 1920 × 950 window in `#sw-plan`, `#sw-heat` and `#sw-doughin`, and with one on windows 900 px
    tall or less. The list then shows what it can of the current step, from its top. The built moments without the box
    keep it whole. Not designed yet: a fix would shrink or hide something approved, such as a slimmer box, or the
    timers on one line each.
  - At 1180 × 860, the refusal's two lines under the box leave the step list 67 px, a few short of the current step,
    for the 6 s they show. Any note there does the same, START's refusal among them.

## What USE changes, and where it shows

With BrewStart and the strike water step in front of the recipe (rig page, step 9b), a plain change to the HLT's
target wouldn't last, so USE changes the plan:

- **The strike water step's temperature.** The step list shows it.
- **BrewStart's temperature**, if heating hasn't started yet, so Ready by plans for the hotter water. Its row shows the
  temperature and the new start time.
- **The HLT's target**, if the strike water step is running. If the step had already asked for the water to be moved,
  that question goes and the step asks again when the water gets to the new temperature.
- **A LOG line**, as for any command.

BACK TO undoes the same things, back to the temperature before the first USE. Brewing by hand, USE sets the HLT's
target, as SET would.

CraftBeerPi refuses a USE whose figure was worked out from numbers that have moved since, and one sent while it's
working USE out again; the box then shows the new figure, or that it's working, and changes nothing. BACK TO is never
refused for that: it's never hotter.

CHANGE sets BrewStart's water volume or grain temperature (by hand, the brew day's figures), with a LOG line, and THE
PROBE blanks the grain temperature. Each is changed back the same way, and each sets CraftBeerPi working USE out again.

## What it never does

- It never changes anything by itself. When CraftBeerPi works USE out again (the grain's or the room's temperature has
  moved by more than half a degree, or a number it works from has changed), the box offers USE at the new figure once
  it's ready; nothing changes until it's pressed.
- It never shows a figure worked out from numbers that have changed as if it were current: until the new one is ready,
  the old one is grey, and USE is greyed.
- It doesn't ask "Are you sure?". A USE or a CHANGE is undone with one tap, and confirmations asked every brew day turn
  into habit.
- It doesn't use MashInStep's own strike fields (Grain_Kg, Grain_Sensor, Mash_Water). The rig page leaves them blank
  on purpose, and they stay blank.
- It doesn't record anything. The brew day's notes and measurements are BrewScribe's.

## What each part needs

| Part | Needs | Notes |
|---|---|---|
| The box: the window, the head (USE or BACK TO, FORECAST or CLOSE), the dough-in line, the missing-number sentences | React UI | `swHTML`, `swWin`, `swAlt` and `swPhase` in `brew-day.js`; styles under `.sw` in `brew-day.css`. One line per window row at every size. |
| FORECAST: the head kept in reach, the chart, its key, its words and the numbers by where they come from | React UI | `.swhead` and `.swdet`: on one screen the box takes the step list's and the timers' room and the details scroll inside it (`.recipe[data-pb] .swdet`); where the page scrolls, the head is sticky. `drawSw` draws the chart at its own size, as the graphs draw theirs; `swWords` and `swList` write the words. The words describe the chart for everyone, and the ghost under them keeps the words' height when USE and BACK TO swap. |
| Working out USE: the line with its seconds, MASH's dashes, the stale grey, the greyed USE and its reasons, the sentence above the chart | React UI | `swNumbers` (its `wait` and `stale`), `swWorkSays`, `swWas`, `swWhy`; `.swwk`, `.swm.stale`, `svg.stale` and `.swf.stale` in `brew-day.css`. The seconds are counted from when the server started, which it sends. |
| A refused USE | React UI | `swRefuse`, `swRefusal` and `swChanged`: the note under the box, the new figure in USE's place, no LOG line; what moved, named from the two sets of numbers. A refusal for a screen that hadn't caught up (409 `moved`, or 409 `off` with its `why`): `swNotApplied` and `SW_OFF`, a note under the box for 6 s, nothing logged, the box then following CraftBeerPi. The same for 409 `back_changed` (the plan now from its `strike`), 409 `recipe_changed` (START's three reasons from its `name` and `steps`, then the state fetched, as the refusal has none), 409 `missing`, and the water's and the grain's refusals ("The words"). |
| A command that fails | React UI | No answer, or an error that isn't one of the refusals above (400 `bad_body`, 5xx): The Answer At The Button Rule, the alarm saying what is in force ("The strike water did not change. It is still 126.0 °F."), and LOG's "failed: {why}". |
| The plan's forecast, coming | React UI | While `answer.forecasts` has none for `inputs.planned` (about a second on a Pi after the strike water is changed elsewhere), MASH is `– –` with WORKING OUT, and FORECAST shows the other choice alone; the tag goes after 10 s. The screen never calls `GET /step2/strike/forecast`: nothing in the design needs a forecast before it's set. |
| The rig's other setups | React UI | `rig.through_coil` false: STRIKE's other words. `rig.still_probe` above 0: PUMP OFF's words, FORECAST's second sentence on what the probe reads, and the dough-in line, shown more than 3 °F outside where the mash lands, above or below. |
| MashInStep's ceiling, 179.6 °F (82 °C) | React UI | From core post57 CraftBeerPi sends it at the top of the state as `ceiling` (179.6 in °F, 82.0 in °C); `SW_CEIL` in `brew-day.js` stands in for it. A USE over it counts as too far (`swNumbers`), so not even an answer kept from before core post56 can offer one; the "too far" sentence's second cause (`SW_MISS.far`); BACK TO to a plan over it greyed, with its reason (`hot` in `swHTML`); 400 `too_hot` as a refusal's note (`swNotApplied`), not a failed command. |
| The mash tun's control interval | Server, then React UI | From core post57: `sample_time`, the mash tun's SampleTime in seconds, at the top of the state, and `miss` `sample_time` right after `recipe` for a fraction from 1 to 60 s, the only SampleTime PID_HERMS runs as it is that the replay can't step through. It's a number missing rather than `off`, so the box stays, and its phase is worked out as for any other. The screen: `SW_MISS.sample_time`, worded from `sample_time`; the mockup's `swIntervalOk` follows the same rule. |
| A grain temperature the forecast can't use, and a failed forecast | React UI | `miss` `grain`: `swGrainOk`, `SW_MISS.grain`, with GRAIN / "change it" opening the grain's box (`swGrain` opens it at the probe's reading). `failed`: `swFailedSays` in the buttons' place, MASH's dashes, and LOG's "Strike water forecast failed: {detail}" once, with "failed" in the failed tone (`bad`). |
| What would raise USE most, after USE | React UI | `levers` null with an answer: `swList`'s sentence "CraftBeerPi is still working out which of these would raise USE most …" in NOT MEASURED YET, until they come (`swNumbers`' `lvWait`). |
| The Campden dose | React UI | From the server's `campden` (null with BrewStart's Campden reminder off, or by hand): FROM YOU's water line ("Campden for it: ¾ tablet.") and the HLT water's LOG line (" · Campden 1 tablet"). Written as BrewStart's `format_tablets` writes it (`swCampden` stands in for it). |
| The HLT's water box: CHANGE, and HLT WATER when there's none | React UI | `swVolHTML` and `swVol`, laid out as TARGET's box. |
| The grain's temperature: its line, CHANGE, its box and THE PROBE | React UI | `swGrainOf`, `swGrainHTML` and `swGrain`, laid out as the HLT water's box. |
| The model's answers | Server (the bench's model, ported) | `strike_model.py`, run in a worker process of its own, never in the control loop: when a recipe is loaded, when the grain's or the room's temperature moves by more than half a degree, and when a number it works from changes. The last answer is kept with the numbers it came from and a short id, and sent until the new one is ready, with when the work started and why. The mockup carries the model's answers for Test Recipe v5 in `strike-model.js`, written by a generator from the bench's model; `swModel` weights them between the model's points, standing in for the server working out those very numbers. |
| The numbers | Server | The grain weight, the water as BeerSmith shows it and how much is the recoverable dead space, the tun's weight and specific heat (TUN_WEIGHT is in ounces in the mash section), BeerSmith's INFUSE_TEMP, GRAIN_TEMP and TUN_TEMP, and which of them the recipe lacks. From core post55 the import keeps them (`mash_numbers`); a recipe imported before has only MashIn's Grain_Kg. |
| The rig's numbers and setup | Server (a plant file) | Each unmeasured number's range and middle, for NOT MEASURED YET; where the mash probe sits and how the strike water moves, for THE RIG'S SETUP; the Mash Tun probe's reading with the pump stopped, held. A number becomes measured only from a calibration run, or the brewer entering a result. |
| The HLT's water | Server | Read BrewStart's Volume and Volume_Unit for the loaded recipe, and a call that changes it, logged, refusing a recipe that has changed as USE does. Brewing by hand, a figure CraftBeerPi keeps for the brew day. |
| BrewStart's Grain temperature | Plugin (the brewer's fork of cbpi4_BrewStart) | A new setting beside Volume, empty by default, in the brewery's unit, with the description above. BrewStart itself needn't use it. |
| The grain's and the room's temperatures | Server | The grain's: BrewStart's Grain temperature for the loaded recipe, or by hand the brew day's figure, or else the boil kettle's probe less its offset; a call that sets or blanks it, logged, refusing a recipe that has changed. The room's: always the boil kettle's probe less its offset; with no reading, or one outside 35-120 °F, there is no forecast, and the box says why. |
| USE and BACK TO | Server | One call sets the strike water step's Temp, BrewStart's Ready_Temp while heating hasn't started, and the HLT's target while the strike water step runs; it keeps the temperature before the first USE. It refuses a recipe that has changed (409 `recipe_changed`), and a USE whose plan id is old when the numbers have moved: 409 `plan_changed` with the new plan, its figure and the numbers it came from, if the sent figure is hotter than the new one, or with `working: true` while it's still being worked out. BACK TO is always allowed. |
| BrewStart's row: its temperature, "ready by 07:00" and its water | React UI | `live.js` `stepModel` reads Ready_Temp, the ready time and Volume for a BrewStart step. |
| The strike water step's own words; a step's note and the versions line stepping aside on one screen | React UI | The note steps aside while the title bar shows that step's own question (`.step .pn.asked`); the versions line, where the current step wouldn't be whole without its room (`data-short`, `keepStepInView`). |

What the server sends the screen, with the step state (or from `GET /step2/strike`):

- **The plan's id, and USE:** the hottest strike water, rounded down to a tenth of a degree, that in every case takes
  the mash no higher than water heated only to the rest would; none if no strike from the rest up does.
- **Whether it's being worked out again,** since when (the server's clock), and why: the HLT's water, the grain's
  temperature, the room's, or another number.
- **The numbers it was worked out from:** the grain's temperature and where it came from, the room's, the HLT's water
  and where it came from, and where the mash probe sits.
- **For each strike temperature the screen shows** (the one planned, USE's, BACK TO's and BeerSmith's): the mash's
  lowest and highest, minute by minute for an hour from the grain going in (minute 0 is where it lands); its highest
  point from the grain going in to an hour after Next; and the Mash Tun probe's highest reading from the ask for the
  malt to Next. For one the screen hasn't got (the HLT's target changed by hand), a forecast without its own search,
  from the cases USE found: a few replays, well under a second.
- **The highest with the water heated only to the rest,** for the PID_HERMS sentence and the amber test.
- **For NOT MEASURED YET:** each number's range, the three that would raise USE most if known and by how much, and USE
  if every one proved to be the middle of its range.

Found while putting the figures in, and fixed in the model on 22 Nov (bench 6f3c001): with warm grain, USE could drop
to the rest itself, from wobbles of a few thousandths of a degree in PID_HERMS's own overshoot (grain at 95 °F: 131.2,
129.0, 126.0 and 129.6 °F at 8.5, 11, 15 and 20 gal in the HLT). A summer garage can be that warm. The model now counts
a case as made worse only once it goes more than 0.04 °F higher than with water heated only to the rest, and with
grain at 95 °F USE is now 131.2, 130.7, 130.1 and 129.6 °F. `strike-model.js` was rebuilt from it. Should a recipe
still give USE at the rest itself, the box offers no USE, and FORECAST says why.

## How it was checked

For core post56 (22 Nov, morning):

- 30 presses (`sw8_presses.py`): BACK TO 185.0 °F greyed in `#sw-backhot`, its reason under the box when tapped, and
  nothing sent or logged; by hand, its reason naming TARGET; BACK TO at 179.6 °F itself not greyed; the `too_hot` and
  `sample_time` refusals' words; the "too far" sentence's two causes, and a USE of 181.2 °F on a 158 °F rest giving no
  USE and the ceiling's sentence; the control interval at 2.5 s, after the recipe's sentence and before the probe's;
  as PID_HERMS takes it, 1, 2, 3, 5 and 60 s used as they are, blank, not a number, 0, 0.5, −2, 61.5 and 120 run at
  its 5 s default with the box working as usual, and only 1.5, 2.5 and 59.5 s not usable; "isn't a number" kept as a
  safety net; set to 2 s, USE worked out again.
- The two new moments measured from 360 × 740 to 1920 × 1080: `#sw-backhot` is as tall as `#sw-used`, and
  `#sw-interval` no taller than `#sw-noprobe`; at every one-screen size the current step is whole and nothing is wider
  than the screen. BACK TO's reason, while it shows for 6 s at 1180 × 860, leaves the step list short of the current
  step, as any note there does (Known limits in DESIGN.md).
- Pictures against the copy in `design/brewday` (UI 226c216), at five sizes, in the 25 strike water moments it has and
  two others: all 135 the same. The earlier presses (`sw5_presses.py`, `sw5_edges.py`, `sw7_presses.py`) and the
  proposals' (timers, column, boil kettle) all pass.

Words for the server contract's gaps (22 Nov):

- 28 presses (`sw7_presses.py`): BrewStart's grain temperature at 150 °F, 20 °F and not a number, each with its
  sentence and MASH's dashes; GRAIN opening the grain's box at the probe's 60.4 °F with THE PROBE; THE PROBE and SET
  70 putting it right, logged ("was 150.0 °F", "was not a number"), then USE 132.4 °F and 131.8 °F worked out; a grain
  temperature saved bad after USE, then blanked, the answer holding again at once; no probe reading still coming
  first. The failed forecast: its sentence (and by hand), no buttons, LOG's line with "failed" in light red, nothing
  worked out again for the same numbers, "Working out USE" once one changes. The levers: the sentence while they're
  coming, scrolled into view in `#sw-levers`, then the usual one. Campden: the water line, LOG after SET 16 ("· Campden
  1 tablet"), the line following, BrewStart's rounding at 12, 15, 15.1, 20, 23 and 40.5 gal, and none by hand. The
  refusals' words, and the note in `#sw-refused-moved`. No page errors.
- The box measured at 1180 × 860, 1280 × 800, 1366 × 768, 1440 × 900, 1920 × 950 and 1920 × 1080: with an unusable
  grain temperature (150 °F, 1500 °F and not a number) or a failed forecast it's 179 px (172 px at 1920 wide), and the
  current step is whole. The first words sent for the grain made it 199 px and cut the step by 12 px at the three
  smallest, so they were shortened. The note in `#sw-refused-moved` leaves the step list 12 px short for its 6 s at
  the three smallest (Known limits in DESIGN.md).
- Pictures against the copy in `design/brewday` (UI 2e441e0), at five sizes, in the 21 strike water moments and four
  others: 19 the same (95 pictures). The other 6 differ only by the Campden sentence on FORECAST's water line, where
  the page shows it (a phone, 820 × 1180, and `#sw-working-open` at 1920 × 1080), one line taller, and in
  `#sw-reworking` by LOG's line with the dose. Four moments are new.

Rebuilt from the model's fix (bench 6f3c001, 22 Nov):

- The model, copied out of the bench at that commit so that no unfinished change in it could be used, gives every
  figure these pages quote as before (41 checked) but one: with 0.50 gal under the false bottom, USE is now 132.5 °F,
  as the model also tries the step above its rounded answer. USE with the grain at 95 °F and 120 °F moved, as above.
- Pictures, compared with the mockup just before the rebuild at five sizes: 74 of its 76 moments are the same (376 of
  380 pictures). `#sw-grain` and `#sw-tunprobe` differ only on a phone and at 820 × 1180, where the page shows FORECAST
  whole: USE at the middle guesses is a tenth higher, 136.6 °F with the grain at 70 °F and 138 °F with the probe at
  the tun's outlet, whose three biggest levers are now about 0.9, 0.9 and 0.8 °F.
- All 21 moments at a monitor's and a phone's size, the 27 presses and the edge checks again: no page errors.

With the model's figures (20 Nov, evening):

- The model run from outside the bench, writing nothing into it, reproduces the report's figures exactly: USE 132.4 °F
  and 131.8 °F, lands 117.8-123.6 °F, highest 125.99 °F; 133.3 °F at 12 gal and 131.4 °F at 20 gal.
- All 21 moments at a monitor's and a phone's size: what the box says, its buttons, the groups and the note; no page
  errors.
- 27 presses: USE and BACK TO; the HLT's water set to 13.5 gal (working out again, the stale grey, the greyed USE and
  its reason, the seconds counting on, then USE 132.9 °F, the mockup weighting the model's figures for 11 and 15 gal);
  the grain's temperature set to 70 °F (USE 131.8 °F), THE PROBE (132.4 °F), and the probe's own 60.4 °F typed in
  (nothing to work out); a refused USE with the new figure (the note, USE 131.8 °F offered, the strike water unchanged,
  nothing logged, then USE pressed again and applied); a USE refused while it's still being worked out; the first
  answer coming after load; NEXT STEP on the move question, with USE's water and Kal's way, both asking for the malt at
  once, the Mash Tun reading the HLT's water and the dough-in line showing.
- All 21 moments at 17 sizes, from a 360 px phone to 2560 × 1440: no page errors, no window line cut short, no button's
  words wrapping, nothing wider than the screen, every button 54-55 px tall. The lowest text contrast is 4.98:1, the
  stale grey on the window's face (a shade lighter than the faceplates' stale grey, which is 4.45:1 there); USE's white
  on blue is 5.08:1. The current step is whole at every one-screen size, but for the refusal's 6 s at 1180 × 860
  (above).
- Pictures, compared with the mockup before the model's figures at five sizes: 58 of its 76 moments are the same (290
  pictures), the 55 outside the strike water and `#sw-novol`, `#sw-missing` and `#sw-noprobe`; 13 strike water moments
  changed with the figures and words, and 5 are new. The pre-brew check's box still keeps its height only at its own
  column width (M105): 11 of 11. Nothing in the column shrinks: 0 of 76 moments at four one-screen sizes.
- USE coming out at the rest itself, set so in the page: no USE, and FORECAST says why. USE in `#sw-tunprobe` applies
  132.9 °F, and the PID_HERMS sentence stays.

From the approval (20 Nov):

- The two fixes, at 8 sizes from a 360 px phone to 1920 × 1080, and on the brewer's own 1278 × 1197 window: with
  FORECAST open, USE (or BACK TO) and CLOSE are in view, and still in view with the details scrolled to their end,
  inside the box on one screen and down the page elsewhere. The button stays where it was (on his window, at y 522
  open and closed), keeps the keyboard's focus, and tells a screen reader it's expanded and what it controls. FORECAST
  then CLOSE leaves the box as it was.
- FORECAST's room on one screen, with no timers and with two, one of them counting down: the details show 225 px at a
  time at 1180 × 860 and 1366 × 768, 265 px at 1440 × 900, 258 px at 1600 × 900, 315 px at 1280 × 950, 292 px at
  1920 × 950, 415 px at 1920 × 1080, 562 px on his window and 775 px at 2560 × 1440, against the 177-209 px the chart
  and its key need, so they show whole at every size. The page doesn't grow.
- A timer half typed (a new one with its name and minutes, or a running one renamed) when COMPARE PROBES or the
  check's box opens is back as it was when the box closes, and Escape closes the box first. While a timer's editor
  is open, the closed box makes way, back on Escape, CANCEL, START or DONE, and the page grows no more than in the
  built pre-brew moments. On a phone and a tablet, where the timers stay, + TIMER with FORECAST open opens its editor
  below it, and Escape closes the editor first; widened to one screen, FORECAST stays open and the editor makes way
  with the timers.
- Nothing above the box moves as it opens. At 1920 × 1080 COMPARE PROBES' button, whose words need 55.4 px over its
  54 px minimum, used to give up 1.4 px, and the box and its button moved up with it; now only the box gives up height.
  No other moment, at four one-screen sizes, with FORECAST open or not, has anything shrink.
- USE, then BACK TO, in every moment it's offered, and with FORECAST open: the box's height and the button's place
  didn't move. As in the first version, a USE that takes the move question down makes the title bar 12 px shorter.
- The HLT's water: CHANGE, the steps, typing, SET, a figure under the strike water refused with its reason, Escape; HLT
  WATER with nothing given. The grain's temperature: CHANGE (the box opens with the probe's 60.4 °F selected), 20 °F
  refused with its reason, an empty box refused, Escape, and one box at a time with the HLT's water.
- START held the night before; NEXT STEP on the move question, then on the malt question.
- The strike water box changed none of the 55 existing moments: 275 pictures at five sizes, the same as the mockup
  before it went in. The timers making way for an open box changes 13 of them, all in the pre-brew check and
  only at one-screen sizes: the TIMERS section is gone while COMPARE PROBES or the check's box is open (BUILD-NOTES).
  The pre-brew check's box still keeps its height only at its own column width (M105): 11 of 11.
- The Impeccable detector on `brew-day.css`: two more of findings it already had: USE's blue under the pointer
  (`#3477c8`, the timer editor's main button's), and a 2 px corner on the chart key's swatches.

## The moments

In `brew-day.html`, second in the strip:

- `#sw-plan`: the night before, the recipe loaded and not begun.
- `#sw-forecast`: the same, FORECAST opened.
- `#sw-volume`: the HLT's water being changed in FORECAST.
- `#sw-grain-edit`: the grain's temperature being given in FORECAST, for grain kept indoors.
- `#sw-grain`: the grain's temperature given on BrewStart, 70 °F, FORECAST opened.
- `#sw-hot`: the strike water typed in too hot.
- `#sw-used`: USE pressed.
- `#sw-backhot`: USE pressed on a plan typed on Brew Steps as 185 °F, so BACK TO 185.0 °F is greyed. The model's
  answers stop at a 175 °F strike, so the mockup can't chart BACK TO's band here: the moment is the box closed.
- `#sw-working`: the recipe just loaded, CraftBeerPi working USE out for the first time.
- `#sw-working-open`: the same, FORECAST opened.
- `#sw-reworking`: the HLT's water just set to 13.5 gal, the figures for 15 gal greyed until the new ones come.
- `#sw-levers`: the same, USE worked out for 13.5 gal, FORECAST still waiting for what would raise it most.
- `#sw-refused`: USE pressed on a screen that hadn't caught up, and refused, with the new figure offered.
- `#sw-refused-moved`: USE pressed on a screen that hadn't caught up with the water going to the mash tun.
- `#sw-failed`: CraftBeerPi's work on USE failed.
- `#sw-tunprobe`: the mash probe at the tun's outlet, where PID_HERMS overshoots the rest by itself.
- `#sw-wait`: brew morning, BrewStart waiting for the time to start heating.
- `#sw-heat`: the strike water heating.
- `#sw-move`: the water there, CraftBeerPi asking for it to be moved.
- `#sw-late`: the same at 126 °F, USE not pressed the night before; it can be pressed now.
- `#sw-doughin`: the water in the mash tun, MashIn asking for the malt, the Mash Tun reading the water left in the
  HLT's coil.
- `#sw-hand`: brewing by hand, the HLT on its own AUTO, the recipe loaded.
- `#sw-novol`: BrewStart with no water volume.
- `#sw-missing`: a recipe built on Brew Steps, with no grain weight.
- `#sw-noprobe`: the boil kettle's probe gives no reading.
- `#sw-grain-bad`: BrewStart's grain temperature saved on Brew Steps as 150 °F.
- `#sw-interval`: the mash tun's control interval set to 2.5 s.

## Where it came from

The brewer and the rig:

- The ideas interview, section 5 (the request); his answers to Brett on 20 Nov (lean to USE, no overshoot, the HLT
  holding all the water with the minerals, the model erring low until the rig is measured); and his approval the same
  day, with his two questions and his answers on the HLT's water and the grain.
- The bench's model of the whole HERMS (`strike_model.py`, bench 6b17b8d, then 6f3c001 with its fix for warm grain;
  with `test_strike_model.py`), its report and Brett's note on moving it into the server
  (`strike-model-server-port.md`): the second rule, the inputs and where each comes from, the ranges and what moves USE
  most, what the screen gets, the time on a Pi, and `POST /step2/strike` with its 409 `plan_changed`. Before it:
  Brett's sketch (`strike-physics-sketch.py`), the bench's `rig_plant.py` (what is measured and what isn't) and
  `sim_doughin.py` (PID_HERMS replayed).
- The rig page, step 9b (BrewStart, the strike water step, MashIn on the Mash Tun, the 15 gal), and RIG-NOTES 31 (Kal's
  way, and the mash probe at the coil's outlet).
- The BeerSmith export of Test Recipe v5 and the equipment profile; the 25 Oct brew-day closeout.
- cbpi4_BrewStart's own words (`strings.py`: "All the water in the kettle. Also sets the Campden dose.").
- Brett's review of the reworked proposal (20 Nov): USE's line, the dough-in line, and the wort pump's flow as
  3-12 L/min, as the bench's model takes it; and his choice of the second rule.

Design:

- Endsley (1995), situation awareness: seeing, understanding and looking ahead. The forecast is the looking ahead.
- Yin, Wickens, Helander and Laberge (2015), "Predictive displays for a process-control schematic interface", *Human
  Factors* 57(1), 110-124: people controlling a simulated mixing process did better when the screen showed where it was
  heading, and the paper's review of earlier work notes that such displays cut needless control actions. The dough-in
  line is there so a 132 °F reading doesn't send anyone for cold water.
- Joslyn and LeClerc (2012), "Uncertainty forecasts improve weather-related decisions and attenuate the effects of
  forecast error", *Journal of Experimental Psychology: Applied* 18(1), 126-140: people decided better, and trusted a
  forecast more, when it came with its uncertainty; advice together with the uncertainty did best. Hence the range,
  with USE beside it.
- Kay, Kola, Hullman and Munson (2016), "When (ish) is my bus?", CHI: considered and not used. Its dot plots need
  probabilities, and this forecast has cases, not probabilities, so a band between the cases that bound it is the
  honest picture.
- Lee and See (2004), trust in automation: show what a figure rests on, so trust in it matches how good it is. Hence
  "measured" and "not measured yet" with their ranges, BeerSmith's figure beside the forecast's, the grain's source
  named, a USE that "aims under the rest" rather than promising it, and what knowing each number would be worth.
- Parasuraman, Sheridan and Wickens (2000), levels of automation: the helper works out a figure and acts only when it's
  pressed, which is what "never set the HLT's target by itself" asks for.
- Card, Moran and Newell (1983), the keystroke-level model: every pointing and scrolling step before a press costs
  time, so the action the details lead to stays in the head, next to what it changes, and no scrolling is needed to
  reach it.
- Nielsen (1993), *Usability Engineering*, response times: past about 10 s a person needs to be told the system is
  still working and how far along it is. The working line counts the seconds; it doesn't promise an end it can't
  know.
- MIT 6.831, lecture 19, "Information visualization": position is the strongest visual cue, so the rest is a line on
  the chart, and over or under it reads at a glance. Its Challenger example shows how much it helps to put the deciding
  fact on the chart itself.
- Norman, *The Design of Everyday Things*: the button says what it will do before it's pressed ("aims under the rest",
  CLOSE "the forecast"), and the result shows where it was asked for.
- NN/g heuristics 1, 3, 4 and 6: show the system's state (working, stale, refused); undo rather than confirm; one word
  for one thing (DONE on COMPARE PROBES adds the readings to LOG, so the forecast's button, which only closes, says
  CLOSE); recognition, not recall (the dough-in line is where the high reading is).
- Georgia Tech CS 6750: the gulf of evaluation, which the dough-in line closes.
- W3C WAI, "Complex images": a short label for the chart, and a long description that everyone can see, next to it.
- W3C WAI, "Form instructions": the unit in the label, the instructions tied to the field, no placeholder text standing
  in for a label. The grain's box says when to give a figure, and what happens left blank.
