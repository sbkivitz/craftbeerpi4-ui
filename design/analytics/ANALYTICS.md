# Brewery figures: what replaces the Analytics tab

A proposal for the Analytics tab, in Brew Day's look. **Approved on 23 Nov; nothing is built yet.** What each builder needs is in [`BUILDERS.md`](BUILDERS.md), and the web page's own notes are in [`BUILD-NOTES.md`](BUILD-NOTES.md).

**The mockup** is [`analytics.html`](analytics.html). Open it in a browser and use the links along the top to see each moment. Add `?bare` to the address to hide that strip.

- **The bench simulator's figures are real.** I measured them from the archived logs of the bench simulator at 8000 (`C:\src\personal\cbpi-testbench\logs\archive`, read once and never written to). `analytics-bench.js` holds what I measured.
- **The rig's figures are made up**, and the page says so wherever they show. I haven't read the rig's logs.
- **Every time shown is CraftBeerPi's clock**, in 12-hour form ("9:38 PM"). CLOCK_FORMAT will set that; the strip's last button switches the mockup to 24-hour.

## What you asked (23 Nov)

> "The 'Analytics' page is useless now and off-theme. What can we replace it with?"

Of Brett's four directions you chose **A: brewery figures, learned from past brews**. Each figure sits beside the setting it would change, with a button to use it, and a graph of the brew day behind each figure as its evidence.

## Decided (23 Nov)

After seeing the mockup ("The Figures mock-up looks excellent"), you answered the four questions:

1. **Layout:** the ledger, with a row per brew, as the page first opens.
2. **HLT efficiency:** USE sets a learned efficiency that BrewStart plans with. BACK TO puts the built-in 90 % back.
3. **When USE is offered:** after 2 brews that agree.
4. **The tab's name:** FIGURES.

The assumptions further down stand: mash rests and the boil kettle have no USE, and the delete-logs buttons move to Settings.

## What's wrong with today's page

A picture of it is in [`pictures/today-analytics-monitor.png`](pictures/today-analytics-monitor.png). The mockup's first link shows it beside the proposal.

- It answers no question. You pick probes, press refresh, and get raw temperatures on one shared scale, the kind of plot you turned down for Brew Day.
- Tonight on 8012 I chose all three probes and pressed refresh. Five seconds later CraftBeerPi still hadn't answered, and the chart was empty.
- Two delete-logs buttons sit next to refresh. Each asks first, but deleting can't be undone.
- It is still the old green page.
- A screen reader can't tell the probe buttons apart: every one is named "bold" (`aria-label="bold"` in `components/charting/index.js`).

## How the page works

The tab is called **FIGURES**. Its page has three parts.

1. **Where the figures come from.** One line under the page's title says so: "From 7 brews in CraftBeerPi Brewery's logs, 15 Oct to 23 Nov." On a simulator, a blue SIMULATED BREWS tag follows, in the colours of the title bar's simulator clock tag, with "They describe the simulator, not the rig, and USE changes only this simulator." Beside it, PAST BREWS IN BREWSCRIBE opens BrewScribe's Past brews in its own tab. Brewhouse efficiency, boil-off and mash efficiency are already there, so this page doesn't repeat them.
2. **A ledger.** There is a row per brew, newest first, and a column per figure, in the order of a brew day: HLT heating, strike water, mash rests, grain absorption and the boil kettle. Each column's head says what the figure is for ("for BrewStart's ready-by time"). Each cell shows that brew's figure, or "– –" with the reason it has none ("the HLT heated the mash too", "no grain in the simulated tun").
3. **The foot.** Each column ends in a small PID window, like a faceplate's:
   - **MEASURED** is what the brews show, big, in Process Red.
   - **SET** is what CraftBeerPi plans with now, smaller, in Setpoint Green.
   - Under them is a strip with one red dot per brew and the setting's green mark on the same line. You can see how closely the brews agree, and how far they are from the setting, without reading a number.
   - One or two lines say what the figure means for the setting. Under them is the action, or why there isn't one.

**Opening a brew.** Tap any cell and its brew opens under its row, in the current step's blue. You get that brew's graph for the figure, in a PID window. It has the probe's line, its target where something held one, and the element's band, marked like Brew Day's graphs:
- **The stretch the figure comes from** is marked in blue, with its numbers ("MEASURED HERE: 68.0 → 117.5 °F IN 14 MIN").
- **Step changes** are numbered marks, as on Brew Day.
- **BrewScribe's readings** are small diamonds with their volumes.

Beside the graph, a short explanation shows how the figure was worked out, then two buttons: LEAVE OUT OF THE FIGURE and THIS BREW IN BREWSCRIBE. Tapping the row again, CLOSE or Escape closes it.

**USE and BACK TO** follow the strike water box's rule (The Offer, Don't Apply Rule):
- The page never changes a setting by itself.
- USE names the figure and where it goes: "USE 85 % · as BrewStart's efficiency".
- While CraftBeerPi answers, the button reads SENDING… with Brew Day's marching stripes.
- Once confirmed, SET shows the new figure and when it was set ("85 % since 23 Nov"), and LOG says "BrewStart's efficiency set to 85 %, was 90 % (built in) · confirmed".
- The same place then offers BACK TO 90 %, "built in". One tap undoes it, and nothing asks "Are you sure?".
- With no connection, the figures stay (they come from the logs), greyed like Brew Day's readings, and USE says "No connection. Controls are paused."
- If CraftBeerPi doesn't answer, the button turns red-edged and says "didn't change · tap to try again", with a line under it saying what the setting still is. A tap sends it again.
- If CraftBeerPi turns it down because the brews changed on another screen, a note under the window says so, and the figures are brought up to date.

**Leaving a brew out.** Some brew days aren't typical: the lid was off, or the element ran at the boil power by mistake. LEAVE OUT OF THE FIGURE removes that brew from that one figure:
- The figure is worked out again at once.
- The brew's cell keeps its value in grey, with a LEFT OUT chip.
- Its dot on the strip turns hollow.
- LOG says "THU 15 OCT left out of the boil kettle figure".
- The same button then reads PUT BACK IN THE FIGURE.

**How sure a figure is** is shown by the strip, and said in words. USE is offered only when there's a figure to stand behind:

| What the brews show | What the foot says | USE |
|---|---|---|
| None yet | why, in a sentence ("No volumes yet: BrewScribe has no finished brew on this simulator.") | none |
| One brew | "One brew so far: another would show whether it repeats." | greyed; a tap says it waits for a second brew |
| Two or more that disagree | the range in the window (0.8–2.9 °F/min), and "2 brews disagree" | greyed; a tap says to leave out the odd one or wait |
| Two or more that agree | what using it would change | offered |

Brews agree when they're within 5 points of efficiency, 8 points of the tun's steel, 0.02 gal/lb, or 0.3 °F a minute. Two that agree are enough for USE (decision 3). Those limits are my guesses from these logs, to be set again from the rig's brews.

**On a phone, a tablet or a short laptop** the page shows one figure at a time:
- Five buttons under the page's head choose the figure: HLT · STRIKE · MASH · GRAIN · BOIL.
- The figure's window and USE come first, then the brews it came from.
- A brew opens under its row, as on the monitor.

The whole ledger needs a window at least 1280 px wide and 860 tall: your 1920 × 950 and a 1440 × 900 laptop. At 1366 × 768 or 1180 wide it would squeeze the opened graph to a sliver. The phone does everything the monitor does. The mockup's Phone and Three sizes links show it.

## The figures

### HLT heating: for BrewStart's ready-by time

**What it is:** the share of the element's power that heats the water: BrewStart's *efficiency*. BrewStart plans the night before with `minutes = water × 4181 J/kg·K × temperature rise ÷ (Heater_Watts × efficiency)`, then adds a fixed 10-minute spare (`cbpi4_BrewStart/schedule.py`, `HEAT_EFFICIENCY = 0.90`, `DEFAULT_MARGIN_MIN = 10`). Its code says the efficiency and the spare "are not the brewer's to set". You decided the efficiency should be learned (decision 2); the 10-minute spare stays as it is.

**How it's worked out:** from each heat-up in which the HLT heated alone, with the wort pump off so the coil drew no heat:
- the efficiency is the one BrewStart's own formula needs to match how long the heat-up took (water volume, rise, Heater_Watts and minutes);
- the cell also gives the rate in °F a minute and the volume heated;
- the figure is the average of the brews left in.

**BrewStart's estimate against what really happened:**
- With BrewStart's own record (see B2 below), the opened brew says what it planned, what it took, and how early the water was hot. In the rig's made-up example: "planned 44.4 min at 90 %; it took 45.9, so the water was hot 8.5 min before 7:00 AM, not 10."
- On the bench, BrewStart didn't run these heat-ups, so the page works out what it would have planned: "would plan 13.0 min at 90 %; it took 13.7, 0.7 min more."

**On the bench (real):**
- **17 Nov:** HLT AUTO at 118 °F took the water from 68.0 to 117.5 °F in 13.7 min: 86 %.
- **23 Nov:** 68.0 to 141.9 °F in 20.7 min, before the wort pump started: 85 %.
- **Left out:** four other brews heated the HLT with the wort pump running, so the mash drew heat too. Their cells say so.
- **The figure:** 85 %, from 2 brews about a point apart.
- **One catch:** the simulated HLT holds 10.6 gal (its simulated vessel's Volume, 40 L) whatever BrewStart's water says (15 gal). So the simulator's figure says nothing about the rig, and the opened brew says that.

**What USE does:** it sets BrewStart's new efficiency setting, `BREWSTART_EFFICIENCY`, which BrewStart plans with in place of its built-in 90 % (B1). The setting also shows in Settings, where it can be typed by hand (W3). A BrewStart already waiting plans again within a minute, as it does every minute. The foot then says "BrewStart plans with 85 %, what the brews measured. It was 90 %."

**How to undo it:** BACK TO 90 % ("built in").

### Strike water: for the strike water box's forecast

**What it is:** one of the numbers the forecast doesn't know yet, measured from where past strikes landed. The box already lists them under NOT MEASURED YET, ranked by how much knowing each would help USE. Their ranges are in `strike_plant.json`. The one shown is "the share of the tun's steel the strike water warms at once": 45–100 %, guessed at 75 %.

**How it's worked out:** each brew where the box gave a forecast keeps a record of it as the malt goes in (S1): the numbers it worked from and its range. Where the mash landed is the mash probe's average 5 to 15 minutes after the grain went in. The model is then run again on each brew's own numbers to find the value that brings its forecast's middle closest to every landing over those same minutes (S2).

**On the bench:** nothing to measure. The simulated mash tun has no grain (its `Grain_Kg` is 0), so the strike never lands on any. The column says "Nothing to compare: the simulated tun has no grain (its Grain_Kg is 0)." Setting Grain_Kg on the bench would let it practise this.

**On the rig (made up):** four landings give 62 %. With it, every landing falls within 0.2 °F of the forecast's middle. Rye Pale Ale's range narrows from 149.6–152.4 °F to 150.7–151.7 °F.

**What USE does:** USE 62 % moves that number from NOT MEASURED YET to MEASURED ON THE RIG, with its value and the brews it came from (W4, in Brew Day's strike water box). The box's next forecast uses it and shows the narrower range.

**How to undo it:** BACK TO 45–100 % ("not measured").

### Mash rests: PID_HERMS on the mash tun

**What it is:** how steady each rest held, and how far the mash came over its rest as it arrived. Beside them, in the window, is PID_HERMS's DeltaTemp (5.4 °F on the bench), which lets the HLT run that far over the mash. A smaller one comes in gentler but steps up slower.

**How it's worked out, for each rest:**
- **held within:** the most the mash moved from the rest's temperature, from two minutes after it got there until it left;
- **came over:** the most it went over in its first ten minutes;
- **last degree:** how long the final degree took;
- **step-ups:** how fast the mash rose from one rest to the next, in °F a minute.

**On the bench (real):**
- Seven rests on four brews held within 0.08 to 0.32 °F, and none came more than 0.32 °F over.
- 9 Nov: 126 °F for 21 min (within 0.3, came 0.3 over), 149 °F for 41 min (0.1, 0.1) and 168 °F for 39 min (0.1, 0.1). It stepped up 126 → 149 °F at 1.3 °F a minute and 149 → 168 °F at 1.0.
- The foot says "Nothing to change".

**On the rig (made up):** three of five brews came 0.9–1.1 °F over 149 °F as they arrived.

**There's no USE here,** because nothing here is a measured figure. Picking a DeltaTemp is a trade between speed and gentleness, not a measurement. The foot's DELTATEMP IN HARDWARE opens the mash tun's settings, and the opened brew says what a smaller one would do.

### Grain absorption: for BrewStart's water

**What it is:** how much water the grain keeps, in gal/lb. This is `GRAIN_ABSORPTION`, 0.12 today, which you asked for help calibrating. A new BrewStart's water is worked out with it (the recipe pages' decision 8).

**How it's worked out:** (strike water + sparge water − the volume before the boil − what the tun keeps) ÷ the grain's weight, with every volume taken as at 68 °F.
- The volumes are BrewScribe's readings. Its strike water reading is the HLT's fill, taken when the HLT is filled: the HLT holds the strike and the sparge water. So the strike is that fill less the HLT's level just before the sparge, which the new sparge water reading keeps along with the sparge itself (P1).
- **So it may read slightly high.** Whatever the HLT loses between its fill and the sparge counts as strike. An open HLT may lose 0.1–0.3 gal in an hour of mashing, which raises the figure by about 0.01–0.02 gal/lb on 13.5 lb. The page says so beside USE and in each brew's working. A later BrewScribe reading of the HLT's level right after the strike goes over would take the mash's part out.
- The grain's weight is the recipe's (`mash_numbers`).
- What the tun keeps is BeerSmith's lauter dead space (`lauter_dead_l`, which the recipe pages asked the import to keep).

**On the bench:** BrewScribe has no finished brew there, only one left open since 19 Nov. So the column says "No volumes yet".

**On the rig (made up):** five brews give 0.098 to 0.110 gal/lb, so the figure is 0.10. For example, Rye Pale Ale: 15.0 gal in the HLT less the 9.9 gal left before the sparge is 5.1 gal strike. Then 5.1 gal strike + 5.4 gal sparge − 8.6 gal before the boil − 0.5 gal left in the tun = 1.4 gal held by 13.5 lb, which is 0.104.

**What USE does:** USE 0.10 sets GRAIN_ABSORPTION, so the next new BrewStart's water allows 0.10 gal a pound.

**How to undo it:** BACK TO 0.12 ("as it was").

### Boil kettle: nothing plans with this yet

**What it is:** how fast the boil kettle heats to the boil, in °F a minute, with minutes and start temperature in the cell. Nothing in CraftBeerPi plans with it today; the page shows it so you know when a boil will start. There's no USE.

**On the bench (real):** the two brews disagree:
- **9 Nov:** 68 → 212 °F in 51 min, at 2.9 °F a minute.
- **15 Oct:** 108 → 212 °F in 121 min, at 0.8. That's about a quarter of the rate the whole way, as if the element ran at the boil power and not full power. Its element level wasn't logged in October, so the page can't tell.

Leaving 15 Oct out shows the one-brew state.

## Which brews count, and their dates

**What counts as a brew:**
- **Where BrewScribe has a brew day,** that's the brew: its start, its end and its step entries.
- **Without one**, as on the bench, a brew is a stretch of the logs where something was heated: a rest held, the HLT heated, or a boil.
- **Each archived simulator run is read too.** An accelerated run's logs go to `logs\archive\<date>-simulation` when it ends.

**Dates:** each row shows the brew's date and the time heating began, on CraftBeerPi's clock. A simulator's clock runs fast and jumps ahead, so its brews' dates aren't always the order you ran them in. The bench's 20 Nov brew was run before its 9 Nov one, in real time.

**Not counted:** a run where the mash never got past 120 °F or the boil kettle past 200 °F. The bench's 15–16 Oct run, which held the mash between 90 and 116 °F, isn't counted.

## What each part would need

[`BUILDERS.md`](BUILDERS.md) is the hand-off: each builder's rows, each server row with its exact call or field, its answer, and what the page does on an older version. In short:

| # | Part | What |
|---|---|---|
| W1 | Web UI | The FIGURES page, in place of today's Analytics (`#/figures`; `#/charting` still opens it). |
| W2 | Web UI | The delete-logs buttons move to Settings, in a Logs group, each asking first. |
| W3 | Web UI | Settings shows BrewStart's new efficiency setting. |
| W4 | Web UI | Brew Day's strike water box lists a measured number under MEASURED ON THE RIG. |
| C1 | CraftBeerPi | `GET /figures`: every brew and figure, worked out on the Pi. |
| C2 | CraftBeerPi | `GET /figures/brews/{id}?figure=`: one brew's graph for one figure, from the logs or an archived run. |
| C3 | CraftBeerPi | Log each step's start as it happens, so past days get step marks without BrewScribe. |
| C4 | CraftBeerPi | USE, BACK TO and LEAVE OUT, kept in `config/figures.json`. |
| B1 | BrewStart | A `BREWSTART_EFFICIENCY` setting, which it plans with; blank means the built-in 90 %. |
| B2 | BrewStart | Log what it planned and when the water was ready. |
| S1 | Strike water box | Keep each brew's forecast as the malt goes in. |
| S2 | Strike water box | Fit the tun's steel to those landings. |
| S3 | Strike water box | Send the numbers USE has fixed, so Brew Day's box can list them as measured. |
| P1 | BrewScribe | A sparge water reading, with the HLT's levels before and after it (BrewScribe dev55). |
| P3 | BrewScribe | Links to Past brews and to one brew's report. |

Two of the first round's BrewScribe rows aren't needed after all:
- **P2** (which brewery, and whether simulated): BrewScribe already marks a simulator's brews, and each CraftBeerPi has its own BrewScribe.
- **P4** (when the grain went in): the strike water box already sees the malt go in.

The first round's C5 (each brew's setup) is folded in: a brew's water and watts come from B2's record or the simulated vessel, and whether it was simulated is worked out from its probes.

## Assumptions that stand

1. Mash rests and the boil kettle have no USE: nothing there is a measured figure that a setting takes.
2. Each CraftBeerPi learns from its own brews only. The rig never takes a simulator's figures, and USE on a simulator changes only that simulator.
3. The delete-logs buttons move to Settings (W2).
4. Times are 12-hour, on CraftBeerPi's clock, as CLOCK_FORMAT will make them everywhere.
5. The agreement limits above are a starting point, to be set from the rig's brews.
6. No fermenter figures.

## The other two layouts

You chose the ledger. The design tool had dealt three of my seven layouts at random, so the obvious one didn't always win. The mockup's last link keeps pictures of the other two, drawn from the same bench logs:

- **On each vessel's faceplate:** the HLT, mash tun and boil kettle across the top, each with its figures' windows and one of its brews' graphs.
- **A brew day leads:** one brew's three graphs fill the page, with every figure's window down the right.
## What I read for this

Your standing sources:
- **NN/g's heuristics:** show what the system is doing (where the figures come from, SENDING…, confirmed); use your words (efficiency, gal/lb); give an easy way out (BACK TO, PUT BACK); prevent errors (USE greyed until brews agree, never applied by itself).
- **NN/g, recognition and recall:** the setting is shown beside its figure, so you don't have to remember it from another page.
- **MIT 6.831, lecture 19 (information visualization):** Shneiderman's "overview first, zoom and filter, then details on demand" is the ledger, then a column, then one brew's graph. Tufte's redraw of the Challenger data, which puts the launch temperature on the same axis as past launches, is why each foot's strip puts the setting on the same line as the brews.
- **Norman:** feedback at the button; signifiers (USE names what it does, and what it goes to); a conceptual model of measured beside set, as on a faceplate.
- **GT CS 6750:** the gulf of evaluation: the opened graph shows where a number came from, so you can judge it.
- **id-book:** design for the real setting: a figure page is used at the desk, the night before or after a brew, not mid-brew.
- **W3C WAI grouping:** the ledger is a real table with column heads; the figure buttons are a labelled group.

I also used Brew Day's DESIGN.md: The Offer, Don't Apply Rule, The One Clock Rule, The Trend In The Window Rule and The Say Why Rule. The interaction-design checklist gave me "measure the widths between phone and desktop", which is where the 1280 × 860 limit came from.

## Files

| File | What |
|---|---|
| `analytics.html` | The mockup, with a link to each moment along the top. |
| `analytics.css`, `analytics.js` | Its look and behaviour. The rig's made-up brews are built in `analytics.js`. |
| `analytics-bench.js` | The bench simulator's brews and figures, measured from its archived logs. |
| `BUILDERS.md` | What each builder needs: the W, C, B, S and P rows. |
| `BUILD-NOTES.md` | The web UI builder's notes: the page module, its words, states, sizes and tests. |
| `port.mjs` | Turns `analytics.css` into the page's two stylesheets in `components/figures/`. |
| `pictures/` | In `design/analytics/`, only the three the mockup shows: `today-analytics-monitor.png`, `18-` and `19-`. All of them are on the `impeccable-analytics` branch in `proposal/pictures/`: `today-analytics-monitor.png` (the old page on 8012) and `today-brewday-monitor.png` (the frame it matches); `01-` to `11-` the moments at 1920 × 950; `12-` to `14-` at 1440 × 900 and 1180 × 860; `15-` to `17-` on a phone; `18-` and `19-` the other two layouts; `20-` today beside the proposal; `21-` to `23-` a failed USE, an older BrewStart and an older CraftBeerPi. |