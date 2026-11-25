# Figures: what it would take to build

For Brett and the UI builder. The design is in `C:\src\personal\craftbeerpi4-ui-analytics`, branch `impeccable-analytics`, which branched from UI main 939fa5c. The `screen.js` line numbers here are main's at a3ddf56. Its files go in the UI repo as `design/analytics/`.

- `ANALYTICS.md` says what the page does and why.
- [`BUILDERS.md`](BUILDERS.md) is the work split by builder (W, C, B, S, P), with every server call and field.
- This file says how the page looks and behaves, part by part, and what the web UI changes (W1–W4).

Where this file and the mockup differ, the mockup's behaviour and words win, except for the parts listed under "Mockup only".

## Ready to build (23 Nov)

The request, from the brewer:

> "The 'Analytics' page is useless now and off-theme. What can we replace it with?"

Of four directions he chose A: brewery figures, learned from past brews. Each figure sits beside the setting it would change, with a button to use it, and a brew day's graph behind each as its evidence. Having looked at the mockup:

> "The Figures mock-up looks excellent"

**Decided,** in his answers to Brett, one at a time:
1. **Layout:** the ledger, a row per brew ("the page as it first opened").
2. **HLT heating:** "USE sets a learned figure that BrewStart plans with". BACK TO puts the built-in 90 % back.
3. **When USE is offered:** "After 2 brews that agree".
4. **The tab's name:** FIGURES.

**These assumptions stand, as he didn't push back:**
- mash rests and the boil kettle have no USE;
- the delete-logs buttons move to Settings (W2).

### Where it is

- **`analytics.html`, `analytics.css`, `analytics.js`: the mockup.** Open the HTML file straight from disk. The strip along the top steps through its moments; `?bare` hides the strip, and `?clock=24` shows CLOCK_FORMAT's 24-hour form (the strip's last button switches it too). The moments are:
  - `#compare` (today beside the proposal);
  - the bench: `#bench`, `#bench-hlt`, `#bench-use` (SENDING…), `#bench-inuse`, `#bench-mash`, `#bench-boil`, `#bench-out`, `#offline`;
  - USE going wrong: `#use-refused` (press USE), `#use-failing` (press USE), `#use-failed`;
  - older versions: `#old-brewstart`, `#old-core`;
  - the rig, made up: `#rig`, `#rig-hlt`, `#rig-strike`, `#rig-mash`, `#rig-grain`;
  - views: `#phone`, `#sizes`, `#alt` (the two layouts not chosen, as pictures).
- **`analytics-bench.js`:** the bench simulator's brews, measured from its archived logs, `C:\src\personal\cbpi-testbench\logs\archive`. For the mockup only. In the build this comes from `GET /figures` (C1) and `GET /figures/brews/{id}` (C2), whose fields the mockup's names follow.
- **`port.mjs`:** makes the page's stylesheets from `analytics.css` (below).
- **`SHA256SUMS`:** each file's SHA-256, to check a copy of `design/analytics/` (`sha256sum -c SHA256SUMS` in that folder).
- **`pictures/`:** today's page (`today-analytics-monitor.png`) and the two layouts not chosen (`18-`, `19-`), which the mockup's views show. Pictures of every moment are on the branch, in `proposal/pictures/`.

### Mockup only

These parts of `analytics.js` stand in for CraftBeerPi:
- the strip, `MOMENTS`, `moment()`, `views()` and `frame()`;
- `BENCH_NOW` and `logNow()`, a still clock (the build uses CraftBeerPi's, as the frame does);
- `clock()`, the title bar's clock drawn as the shared frame draws it: CraftBeerPi's date always, just left of the time,
  and on the bench (a simulator) SPEED left of them, all on one line, so the frame is as tall as the build's and the
  page starts where the build's does;
- `rigSpec` and `rigBrew()`, the rig's made-up brews, with the "Made-up figures" label (`.mockonly`);
- `summary()`, which works out each figure's state in the page (the build gets `state` from C1);
- the `measured()`, `values()` and agreement limits on each figure in `FIGS`, which are C1's job;
- `st.failNext`, `st.refuseNext`, `st.bsOld` and `st.core`, and the `setTimeout`s that stand in for CraftBeerPi's answers (900 ms for an answer; 1.5 s for "no answer in 5 s");
- every toast. In the build:
  - a tab opens its page;
  - LOG opens the frame's log;
  - PAST BREWS IN BREWSCRIBE and THIS BREW IN BREWSCRIBE open BrewScribe in the tab named `brewscribe`;
  - DELTATEMP IN HARDWARE opens `#/kettle/<mash tun id>`.

What ports as it is: `graph()`, `strip()`, `foot()`, `ledger()`, `evidence()`, `headLine()`, `pick()`, `render()`'s scrolling, `banner()`'s "no connection", and the presses. In each, the words are the design.

## The page in the frame (W1)

As Settings, Hardware and the recipe pages: a React wrapper draws the brew-day frame, and the page draws itself in the frame's host, in a shadow root.

- **`components/figures/index.js`** (`Figures`): copy `components/hardware/index.js`.
  - `createBrewDay(ref.current, {page: "figures", navigate, removeAlert})`, then `createFigures(frame.current.host, {frame, navigate})`.
  - `frame.update(liveSnap(…))` and `page.update({...})` as `useCBPi()`'s state changes.
  - `document.title = "Figures · CraftBeerPi"`; the frame puts the brewery's name first.
- **`components/figures/page.js`** (`createFigures`): the mockup's code. It returns `{update(snap), destroy()}`.
  - `update` takes `connected`, `config` (TEMP_UNIT, CLOCK_FORMAT, BREWERY_NAME, SIM_TIME_SCALE), `kettles`, and `figures`: the last `figures` topic and when it came.
  - It puts `figures.css` in its shadow root and `figures-frame.css` in the document, as `hardware/page.js` does (`:1344–1356`).
- **`screen.js`:**
  - `PAGE_TAB` gains `figures: "Figures"`.
  - The skeleton's Analytics tab becomes `<a href="${h("#/figures")}" data-tab="Figures"${cur("Figures")}>Figures</a>`, in the same place: after Recipe book, before Hardware.
- **`App.js`:** `figures` and `charting` both render `<Figures />`, outside `AppLayout`, beside the recipe routes. Delete the old `charting` route inside `AppLayout`.
- **`config-overrides.js`:** the `asset/source` rule (`:87`) gains `figures[\\/]figures(-frame)?`.
- **`components/data/index.js`:** a case for the topic `figures`, kept as `state.figures = {data, at}`, as `strike` is (`:150`).
- **Delete** `components/charting/index.js` once W2 is in. `logapi` stays: Settings uses it.

**The port:** `node design/analytics/port.mjs` writes `components/figures/figures.css` and `figures-frame.css`. It works like the recipe pages' port:
- `:root` becomes `:host`;
- the frame's rules are left out, since the brew-day screen draws the frame;
- `.app`'s rules go to the frame file, scoped to `html.bd-page[data-page=figures]`;
- everything from `analytics.css`'s "mockup only" section on is left out.

It refuses to run if those three sections move. `node design/analytics/port.mjs <folder>` writes elsewhere, to compare.

## Reading the figures

**When the page reads `GET /figures` (C1):**
- as it opens;
- when the connection comes back;
- on each `figures` topic;
- after each of its own commands, whose answer carries the figures.

The page waits up to 20 s for it, as the graphs' log window does (`api.js:100`), since the Pi reads the logs.

**What the head says while there's no ledger** (not drawn in the mockup):
- **Before the first answer:** "Reading past brews from CraftBeerPi's logs…", in Soft Steel.
- **No answer, or an error:** "CraftBeerPi didn't send the figures: no answer in 20 s." (or `why()`'s words for an error), with TRY AGAIN, a quiet button.
- **No brews:** "No brews in {brewery}'s logs yet. Figures start with the first brew day: an HLT heated, a mash rest held or a boil."
- **404, an older core:** moment `#old-core`.

**Opening a brew reads `GET /figures/brews/{id}?figure=<figure>` (C2)**, also with a 20 s wait.
- Until it answers, the row's graph window shows "Reading this brew day…".
- If it fails: "This brew day's readings didn't come: no answer in 20 s. Tap the row again to try."
- Keep the last few answers, so going back and forth between brews doesn't read the logs again.

## Sizes

- **1280 px wide and 860 tall, and up:** one screen tall. The head, then the ledger.
  - Only the ledger's brews scroll, between its column heads and its foot, which both stick.
  - A window 1000 px tall or less tightens the rows.
  - An opened brew scrolls to sit just under the column heads.
- **Narrower or shorter** (701–1279 px wide, or under 860 tall; a 1366 × 768 laptop is one):
  - one figure at a time;
  - five buttons under the head choose it (HLT · STRIKE · MASH · GRAIN · BOIL), in Selection Blue for the one chosen;
  - the figure's window, with its words and USE beside it, comes first, then the brews in two columns (the brew, its cell);
  - the page scrolls.
- **700 px and narrower:** the frame's phone rules (tabs along the bottom, four and four). The figure's window stacks over its words.

Below 1280 × 860 the ledger's six columns would squeeze an opened brew's graph to a sliver. That's why the limit is there and not at Brew Day's 1180.

## The head

"BREWERY FIGURES", then the line saying where they come from, then PAST BREWS IN BREWSCRIBE.

- **Simulator** (`simulated`): "From **7 brews** in CraftBeerPi Brewery's logs, 15 Oct to 23 Nov." then the SIMULATED BREWS tag (the title bar's simulator clock tag: Progress Blue on Progress Track Navy, with a 1px Current Step Edge), then "They describe the simulator, not the rig, and USE changes only this simulator."
- **A real brewery:** "From **5 brews** in EBrews's logs and BrewScribe, 3 Oct to 21 Nov." Say "and BrewScribe" only when some brews are BrewScribe days.
- **Dates:** each brew's `start`, as "15 Oct", on CraftBeerPi's clock.

## The ledger

A real `<table>`:
- the column heads in `<thead>`, each a `<th scope="col">`;
- the figures' windows in `<tfoot>`;
- a row per brew in `<tbody>`, newest first.

**The columns,** in the order of a brew day. Each head has the name in capitals and what it's for under it:

| Figure | Head | Under it |
|---|---|---|
| | BREW | newest first |
| `hlt` | HLT HEATING | for BrewStart's ready-by time |
| `strike` | STRIKE WATER | for the strike water box's forecast |
| `mash` | MASH RESTS | PID_HERMS on the Mash Tun |
| `grain` | GRAIN ABSORPTION | for BrewStart's water |
| `boil` | BOIL KETTLE | nothing plans with this yet |

**The brew cell.** "MON 23 NOV" in capitals, then the time heating began ("9:59 PM", by CLOCK_FORMAT). Under it, what the brew was:
- its `name`, else its rests and boil: "Rests at 126, 149, 168 °F; a boil", "A rest at 152 °F", "Two rests at 152 °F", "A boil";
- or what ran by hand (`auto`): "HLT AUTO at 118 °F, by hand", "Mash tun AUTO at 152 °F, by hand";
- with "the boil kettle to 139 °F" for a boil `stopped`.

**The cells.** Each is a button: the figure in 600 21px condensed with its unit smaller, and a line under it. One with no figure shows "– –" and why, in Dim Steel:

| Figure | The cell | No figure (`none`) |
|---|---|---|
| `hlt` | "85 %" · "3.7 °F a min · 10.6 gal" | `pump_on` "the HLT heated the mash too" · `not_heated` "the HLT wasn't heated" · `no_water` "BrewStart didn't record its water" |
| `strike` | "151.3 °F" · "forecast 149.6–152.4 · 0.3 over its middle" (or "under") | `no_grain` "no grain in the simulated tun" · `no_forecast` "no forecast kept for it" |
| `mash` | "±0.3 °F" · "3 rests at 126, 149, 168 · came 0.3 over" (one rest: "rest at 152 · came 0.1 over") | `no_rest` "no rest" · `stopped` "stopped before its rest" |
| `grain` | "0.104 gal/lb" · "1.4 gal held by 13.5 lb" | `no_brewscribe` "BrewScribe isn't installed" · `no_volumes` "no volumes in BrewScribe" · `no_levels` "no HLT level before the sparge" · `no_grain_weight` "no grain weight in the recipe" |
| `boil` | "2.9 °F/min" · "68 → 212 °F in 51 min" | `no_boil` "no boil" · `stopped` "stopped at 139 °F" |

**Mash cell details:** ± is the largest `held` of the brew's rests. "came … over" is the largest `over`.

**A left-out brew** keeps its figure in Dim Steel, with a LEFT OUT chip under it.

**Each cell's accessible name** says it whole: "HLT heating, TUE 17 NOV: 86 %, 3.9 °F a min · 10.6 gal" or "…: none, the HLT heated the mash too", with ", left out" where it is.

## The foot: each figure's window

A small PID window (PID Window Black, sunk):
- **MEASURED** in Process Red, big;
- **SET** under it in Setpoint Green, smaller, with a line in Dim Steel;
- **the strip:** each brew's dot in Process Red, a hollow ring for one left out, a red line from the lowest to the highest counted, and the setting as a green mark labelled SET (a green bracket for a range not measured yet).

Under the window, a line or two of words, then the action. The words, by figure and `state`:

- **HLT heating:**
  - SET is "90 % built in", or "85 % since 23 Nov".
  - `use`: "BrewStart plans with **90 %**: heating runs 6 % longer, inside its 10 min spare." (the percentage is 0.9 ÷ measured − 1), then **USE 85 %** · "as BrewStart's efficiency".
  - `in_use`: "BrewStart plans with **85 %**, what the brews measured. It was 90 %." then **BACK TO 90 %** · "built in".
- **Strike water:**
  - SET is "45–100 % not measured yet", or "62 % since 21 Nov".
  - `use`: "The tun's steel the strike warms at once. With 62 %, all 4 landings fall within 0.2 °F of the forecast's middle." then **USE 62 %** · "in the strike water box".
  - `in_use`: "The strike water box forecasts with **62 %**: Rye Pale Ale lands **150.7–151.7 °F**." (the loaded recipe's forecast, when there is one), then **BACK TO 45–100 %** · "not measured".
  - `none`, on a simulator: "Nothing to compare: the simulated tun has no grain (its Grain_Kg is 0)."
  - While S2 works: "Working out the tun's steel from the landings: a few minutes."
- **Mash rests:**
  - The window says **HELD ±0.3 °F**, over SET "5.4 °F DeltaTemp".
  - `nothing`: "**Nothing to change:** 7 rests held within 0.3 °F, none more than 0.3 over."
  - `caution`: "**3 of 5** came 0.9–1.1 °F over 149 °F arriving, then held within 0.3 °F."
  - Either way, DELTATEMP IN HARDWARE, a quiet button.
- **Grain absorption:**
  - SET is "0.12 gal/lb in Settings", or "0.10 since 21 Nov".
  - `use`: "At 0.12, BrewStart's water is **0.2 gal** more than 13.5 lb of grain holds." (the newest brew's grain), then **USE 0.10** · "gal/lb as grain absorption".
  - While any brew counted has `strike_from: "hlt_fill"` (BUILDERS, C1), the words go on: "This may read slightly high: the HLT's losses count as strike." The opened brew's working says it too.
  - `in_use`: "BrewStart's water allows **0.10 gal** for each pound of grain. It was 0.12." then **BACK TO 0.12** · "gal/lb, as it was".
  - `none`: "No volumes yet: BrewScribe has no finished brew on this simulator." On a brewery without BrewScribe: "No volumes: BrewScribe isn't installed."
- **Boil kettle:**
  - SET is "– – none".
  - `info`: "5 brews, 2.6 to 2.7 °F/min. Nothing plans with this yet."
  - No button.
- **Every figure:**
  - `one`: "One brew so far: another would show whether it repeats." USE is greyed.
  - `disagree`: the window shows the range ("0.8–2.9"), and the words say "**2 brews disagree,** 0.8 to 2.9 °F/min. Open the odd one." USE is greyed. Boil kettle leaves out "Open the odd one.".
  - `none`: MEASURED "– –".

**A greyed USE, tapped,** says why under the window for 6 s, in Note Amber (The Say Why Rule):
- one brew: "One brew so far: USE waits for a second that agrees with it."
- disagree: "The brews disagree, so there's no one figure to use. Leave out the odd one, or wait for more brews."
- no connection: "No connection. Controls are paused."
- an older BrewStart (`why_not: "brewstart_old"`): "This BrewStart can't take a figure from past brews: it always plans with 90 %." Its words above the button are "This BrewStart always plans with 90 %. A newer BrewStart plans with a figure from past brews."

**In use, and the brews now measure another figure** (a new brew, or one left out). This state isn't drawn in the mockup.
- The two buttons share the row: **USE 87 %** (blue) and **BACK TO 90 %** (plain).
- SET keeps "85 % since 23 Nov".
- The words: "BrewStart plans with **85 %**; the brews now measure 87 %."

## Opening a brew

**What opens it:** a tap on any cell. The brew opens under its row, in Current Step Blue, with the tapped cell outlined in Progress Blue. Tapping its date cell opens it at the figure chosen last.

**What closes it:** tapping the same cell, CLOSE, or Escape. Only one brew is open at a time.

**The evidence row** has the graph on the left and the working on the right. On one figure at a time, the working goes under the graph.

**The graph** is a PID window drawn by `graph()`, at the width it's shown, so its labels stay 12px:
- the probe's line in Process Red with its glow, ending in a dot;
- the target in Setpoint Green, only where something held it;
- the element's level as an Element Orange band along the bottom, labelled OUT at its right end;
- gridlines with real values, and clock times along the foot (every 15, 30 or 60 minutes, by the span);
- the stretch the figure comes from, as a band in Current Step Blue at 38 % with its edge, labelled in capitals: "MEASURED HERE: 68.0 → 117.5 °F IN 14 MIN", "149 °F ±0.3", "LANDED 151.3", "TO THE BOIL IN 51 MIN", "STRIKE IN TO PRE-BOIL OUT";
- for strike water, the forecast as a horizontal Process Red band at 22 % with its edge, "FORECAST 149.6–152.4 °F", as the strike water box draws the plan;
- step numbers (C3) in small tags at the top, with dashed lines;
- BrewScribe's volume readings as small white diamonds labelled "HLT FILLED 15.0 gal", "SPARGE 5.4 gal", "PRE-BOIL 8.6 gal";
- gaps in the log in Graph Gap.

**The key under the graph** says each mark in words: HLT TEMPERATURE · TARGET · ELEMENT · WHERE THE FIGURE COMES FROM · BREWSCRIBE'S READINGS · NUMBERS: STEPS. Without C3's steps: "NO STEP MARKS: THIS RUN'S STEPS WEREN'T KEPT". On a run before 15 Nov it adds ", NOR ITS TARGETS (LOGGED FROM 15 NOV)".

**Each graph is `role="img"`,** with a sentence: "Hot liquor tank on TUE 17 NOV: 68.0 to 117.5 °F in 13.7 minutes."

**The working** is a heading in capitals saying the brew's figure ("86 % OF THE ELEMENT'S POWER REACHED THE WATER"), the date and what the brew was, then a short list of how it was worked out. The words are `evidence()`'s, per figure.

**Its buttons:** LEAVE OUT OF THE FIGURE (or PUT BACK IN THE FIGURE), THIS BREW IN BREWSCRIBE (only for a BrewScribe day), and CLOSE. All are quiet buttons, 44px tall.

## USE and BACK TO

They follow the strike water box's rule (DESIGN.md, The Offer, Don't Apply Rule): one tap each, no "Are you sure?", and nothing changes by itself.

**USE:**
1. A tap sends `POST /figures/{figure}/use {"value", "brews"}`, with the figure's `use`.
2. While it waits, the button reads SENDING… over "waiting for CraftBeerPi", with Brew Day's marching stripes along its top. A second tap does nothing.
3. **Answered:**
   - SET shows the new figure and "since 23 Nov";
   - the button becomes BACK TO;
   - LOG says:
     - "BrewStart's efficiency set to 85 %, was 90 % (built in)" · "confirmed";
     - "Strike water box: the tun's steel warmed at once set to 62 %, was 45–100 % (not measured)";
     - "Grain absorption set to 0.10 gal/lb, was 0.12 gal/lb".

**BACK TO:** the same, with `POST /figures/{figure}/back {"value"}`. LOG says:
- "BrewStart's efficiency set back to 90 % (built in)";
- "Strike water box: the tun's steel warmed at once back to 45–100 % (not measured)";
- "Grain absorption set back to 0.12 gal/lb".

**Refused** (409): nothing changed. The figures in the answer take the page's place, and a note under the window says why for 6 s, in Note Amber, and to a screen reader (moment `#use-refused`):
- `brews_changed`, a brew left out on another screen: "USE 85 % wasn't applied: MON 23 NOV was left out of this figure on another screen." then what follows from the new figures: "With one brew left, USE waits for a second." or "It's 86 % now."
- `brews_changed`, a new brew: "USE 85 % wasn't applied: a new brew changed the figure. It's 86 % now."
- `not_offered`: "USE 85 % wasn't applied: the brews no longer agree."
- `brewstart_old`: as the greyed button's note.
- `back_changed`: "BACK TO 90 % wasn't applied: BrewStart's efficiency was changed in Settings since. It's 88 % now."

The page tells the two `brews_changed` cases apart by comparing the figure's `out` and `values` before and after.

**No answer in 5 s, or an error that isn't a refusal:** a failed command (moments `#use-failing` and `#use-failed`). It says so at its own button, as Settings does; the frame has no title-bar alarm for a page.
- The button keeps its words, with a 2px Alarm Red edge over Fault Wash, and "didn't change · tap to try again" under it.
- A line under it in Alarm Pink: "BrewStart's efficiency did not change. It is still 90 % (built in). No answer from CraftBeerPi in 5 s."
- LOG: "HLT heating: failed: no answer in 5 s" · "failed", in light red.
- A tap on the button sends it again.

**From another screen** (a `figures` topic this page didn't cause): one LOG line, "BrewStart's efficiency set to 85 % · from another screen".

## Leaving a brew out

LEAVE OUT OF THE FIGURE sends `POST /figures/{figure}/out {"brew", "out": true}`. Then:
- the figure is worked out again;
- the brew's cell keeps its value in Dim Steel, with LEFT OUT;
- its dot turns hollow;
- the button reads PUT BACK IN THE FIGURE;
- LOG: "THU 15 OCT left out of the boil kettle figure", or "… put back in the …".

It's one tap: putting it back is one tap too. While it waits (not drawn: the mockup answers at once), the button reads LEAVING OUT… or PUTTING BACK…, greyed. A failure says "didn't change · tap to try again" on it, with the LOG line, as USE does.

## No connection

As the frame says (moment `#offline`):
- the figures stay, since they come from the logs;
- the windows' numbers turn Stale Grey without their glow;
- the graph's line turns Stale Grey;
- every command is greyed and says "No connection. Controls are paused.";
- when the connection comes back, the page reads `GET /figures` again.

The page marks its own `.main` with `data-link="lost"`, as the frame marks `.app`: the port turns the mockup's `.app[data-link=lost]` rules into `.main[data-link=lost]` ones.

## One clock, and times of day

Every time on the page is CraftBeerPi's clock: the brews' dates and times, the graphs' times, SET's "since". The figures' times are seconds on that clock, as the logs are stamped. Times of day follow CLOCK_FORMAT, as the recipe pages' notes say ("Times of day: the Twelve-Hour Rule"): "9:59 PM" on the brew's line, and on the graphs "9:30", "10 PM", "10:15". A simulator's brews have the dates its clock gave them, which jump ahead at 60×. The page shows them as they are.

## Accessibility

- **The ledger is a table,** so a screen reader announces a cell's column head.
- **The five figure buttons are a `role="group"`** named "Figure", with `aria-pressed`.
- **Every cell is a button** with the whole of what it shows in its name. The date cell is `aria-expanded`.
- **Each window's strip is `role="img"`,** named "5 brews on a line from 70 to 100 %".
- **Notes under a window are `role="status"`;** a failed command's line is `role="alert"`.
- **Text contrast,** measured:
  - Soft Steel and Dim Steel on Panel Slate are 9.1:1 and 5.8:1;
  - on the foot's #131c25 they're 9.6:1 and 6.1:1, Note Amber 12.9:1 and Alarm Pink 11.8:1;
  - Process Red and Setpoint Green on PID Window Black are 6.1:1 and 11.3:1.
  - On an opened brew's Current Step Blue, Soft Steel would be 4.1:1 and Dim Steel 2.6:1, so everything there but the figures is Current Step Ink, 6.0:1.
- **Targets:** every button is at least 44px tall; USE and BACK TO are 52px; the cells 56–62px; the figure buttons 52px.
- **Keyboard:** focus shows Brew Day's 3px Focus Ring Blue. Escape closes an opened brew.

## Colours

Only Brew Day's (DESIGN.md), each doing its own job there:
- **Process Red** for what was measured (and the forecast band, as the strike box draws its plan).
- **Setpoint Green** for what is set.
- **Current Step Blue** for the brew opened and the stretch its figure comes from: "where you are".
- **Selection Blue** for USE and the chosen figure button.
- **Element Orange** for the element's band.
- **Note Amber** for why a control can't be used.
- **Alarm Red and Fault Wash** for a command that failed.
- **Progress Blue on Progress Track Navy** for the SIMULATED BREWS tag.

Prompt Amber isn't used: nothing on this page waits for the brewer.

## W2: delete-logs in Settings

A Logs group in Settings (`components/settings`, the catalogue and page), last, as rarely used:
- one row per probe: its name, "Its readings, for Brew Day's graphs and Figures", and DELETE;
- one row, "All probes' logs", with DELETE ALL.

Each asks in place, in an amber box, with no default answer: "Delete HLT Temp's log? Brew Day's graphs and Figures lose its readings. It can't be undone." DELETE · KEEP. The call is today's `logapi.clear(id)` (`DELETE /log/{id}`). LOG: "HLT Temp's log deleted" · "confirmed". It's the Settings page's design (its designer's), so check its words with them.

## W3: BrewStart's setting in Settings

`BREWSTART_EFFICIENCY` (B1) in BrewStart's group in Settings' catalogue:
- **name:** "BrewStart efficiency";
- **its line:** "The share of the HLT element's power that heats the water, in %. Blank: the built-in 90 %. USE on Figures sets it from past brews.";
- **unit:** %, 10–100;
- **blank:** shown as "empty", with "Empty: BrewStart uses 90 %", as the Empty Setting Rule says.

## W4: the strike water box's measured number

In Brew Day's strike water box (`screen.js` `swList`, line 1502 on main a3ddf56), each entry of the strike state's new `measured` list (S3) goes under "Measured on the rig", after the HLT, with the same name the box gives it under "Not measured yet" (`SW_GUESS`):
- "TUN STEEL" · "62 % of it warmed by the water at once, measured from 4 brews on Figures";
- with no `brews`: "… measured on the rig".

A measured number is no longer sent with the guesses, so it has already left "Not measured yet" and the "would raise USE the most" ranking; nothing to remove there. Without S3 the box adds nothing. This is Amber's box, so check the words with her.

## Bench tests

1. **The page from the bench's logs** (`test_ui_figures.py`): the bench at 8000 with a copy of its archived runs.
   - GET /figures gives HLT heating 85 % from 2 brews, mash rests "nothing" from 7 rests, and boil "disagree".
   - The page shows them, opens TUE 17 NOV's HLT heat-up with its band, and the strip has two dots.
2. **USE and BACK TO:**
   - USE 85 % sets `BREWSTART_EFFICIENCY` to 85, and LOG says so;
   - a waiting BrewStart plans again with 85 within a minute;
   - BACK TO blanks it.
3. **A refused USE:** leave a brew out over the API, then press USE on a page that hadn't caught up. The note names the brew and nothing changes.
4. **Older versions:** with no `/figures` the page shows `#old-core`'s words. With BrewStart not registering its setting, USE is greyed with its words.
5. **Sizes:** 1920 × 950, 1440 × 900, 1366 × 768, 1180 × 860, 1024 × 768, 800 × 1000 and 390 × 844. Nothing overflows sideways, and at 1280 × 860 and up only the ledger scrolls.

## Checked

In the mockup, at 1920 × 950, 1440 × 900, 1366 × 768, 1280 × 800, 1180 × 860, 1024 × 768, 800 × 1000 and 390 × 844:
- no script errors;
- nothing overflowing sideways;
- every moment's picture looked at;
- the presses walked: USE, BACK TO, LEAVE OUT and PUT BACK, Escape, a refused USE, a USE with no answer then pressed again, an older BrewStart's greyed USE, the phone's figure buttons, and LOG.

Impeccable's detector flags three things, all Brew Day's own:
- the marching stripes along a waiting button's top;
- the PV and SV digits' glow;
- the stripes as a repeating gradient.
