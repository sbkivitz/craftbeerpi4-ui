# Brew-day screen, layout B: what it would take to build

This folder is a proposal. Nothing in it changes CraftBeerPi, and nothing is committed.

- `compare.html` flips between the two layouts the brewer compared (press Space). Use it to check either design
  on a monitor, a laptop or a phone, in five moments of a brew day.
- `brew-day.html` is layout B on its own: the brewer chose it on 9 Nov 2026. Add `?layout=a` to see layout A. It has
  a sixth moment, `#sparge`, for the runoff to the boil kettle, and a seventh, `#boilpower`, for the boil
  power control the brewer asked to have back on 10 Nov. It shows a temperature graph in each
  faceplate, chosen on 10 Nov; add `?graphs=none` to see the screen as first built. Its boil kettle is
  the one approved on 10 Nov, built on the screen that evening and the default since; add `?bk=today` for
  the faceplate the screen keeps for an older BoilPower (`boil-kettle.html` shows the two side by side). The boil
  kettle has more moments: `#heatup`, `#pause`, `#pause-long`, `#boiling`, `#hold`, `#keepboil`, `#letfall`,
  `#bktarget` and `#handhold`. `#notarget` and `#notarget-hlt` show a vessel in AUTO with no target.
  `#sparge-heat`, `#sparge-ready`, `#sparge-run` and `#sparge-batch` show the new SpargeStep (core
  4.7.7.post35); `#sparge` keeps the old MashStep sparge that recipes already in the book still have.
  `#boil-hold` is the hold before the boil, after a SpargeStep, with the pumps CraftBeerPi switches off for the
  hoses (core 251edbf). The timers
  approved on 11 Nov, built that day, are shown by default (`#timers`, `#timer-done`, `#timer-new`,
  `#timer-names`, `#timer-nonames`, `#timers-hand`, `#sound-allow`); add `?timers=today` for the one rest timer the
  screen keeps for an older CraftBeerPi.
- The pages run on demo data copied from the simulator's config (`C:\src\personal\cbpi-testbench\config`).
  They do not talk to CraftBeerPi. Buttons respond and timers run, but nothing is sent anywhere.

## The short version

Almost all of this is one new React screen in `cbpi4gui`. It can run on today's server, with one exception:
the brewer wants one rest timer shared by the monitor and the phone, and only the server can keep that. Every
other reading and command it needs already exists. Which kettle is which, and which switch is which pump,
comes from CraftBeerPi's own kettle settings, so there is no separate file to keep in step. Three more
extras would be better with server work; they are marked "server, optional" and the screen works without
them.

The temperature graphs chosen on 10 Nov follow the same pattern. Their temperature line works on today's
server. For the target and element-power lines to reach back before the screen was opened, the
`PID_LOGGING` setting has to be on; heating by hand and the step tags need small server changes to do the
same. The section at the end has the detail.

## Change by change

| Change | What it needs | Notes |
|---|---|---|
| A fixed brew-day screen: recipe on the left, three faceplates across the top, line drawing of the rig below, screen tabs along the top (bottom on a phone) | React UI | A new view in `cbpi4gui`. The free-form dashboard and its editor stay for other uses. |
| Say which kettle is the HLT, mash tun and boil kettle, which switches are the two elements and the two pumps, and which switch has its own override | React UI and one setting | As built by Brett (9 Nov): no mapping file. The screen reads it from CraftBeerPi's own settings, the way the kettle logics do: the mash tun is `MASH_TUN` or the kettle running PID_HERMS; the boil kettle is `BoilKettle`; the HLT is PID_HERMS's `HLT_Kettle`, or else the kettle whose sensor is its `HLT_Sensor`; the elements are those kettles' heaters and the pumps their agitators. A separate mapping could disagree with what the logics actually drive and lock or label the wrong switch. The override is one new setting, `BREWDAY_OVERRIDE_ACTOR` (an actor picker in Settings). On the rig this gives `HLT_HEAT` (GPIO 6), `BK_HEAT` (GPIO 5), `Recirc_PUMP` (GPIO 7, the override) and `Wort PUMP` (GPIO 8). |
| Faceplates: big red PV over smaller green SV, plus OUT (element power) and MODE | React UI | All from existing data: sensor value, kettle `target_temp`, actor power, whether the kettle logic is running. |
| The HERMS button ("run by the mash tun") and the locked HLT buttons while the mash tun's HERMS logic runs | React UI | Read from the kettle config the screen already loads: `PID_HERMS` names its heater (`HLT Heater`) and its pump (`Mash Pump`). Write it as a general rule ("a running kettle logic drives its own heater and pump"), not as a special case. |
| Lamp-strip buttons that say their state in words: HEATING, RUNNING, OFF, DID NOT STOP; at least 56 px tall | React UI | Fixes defects U2 (small, adjacent buttons) and U3 (on and off shown mainly by colour). |
| Hold for one second to turn heat on, to switch a kettle to AUTO, and to start the recipe; one tap to turn anything off | React UI | Fixes U2 (one mis-tap can start a heating element). Works with a mouse, touch and the keyboard (Space or Enter held). |
| Every command answers at its own button: "switching on…", then confirmed, or a red "did not stop, tap to try again" plus an alert in the title bar | React UI | Fixes U1 (failed commands are invisible). Actor on and off already return 500 when they fail. The UI must stop throwing errors away and must time out a command that gets no answer. |
| Error messages a person can read | Server, optional | Today most failures come back as a bare 500 or 204. A short reason in the response would let the alert say why. |
| Separate AUTO and MANUAL buttons | React UI | Use the existing `POST /kettle/{id}/on` and `/off`. Do not use `/toggle`: on a screen that is a few seconds out of date, toggle can switch the wrong way. |
| Target editor: −1, −0.1, +0.1, +1 or type a value, then SET | React UI | Existing `POST /kettle/{id}/target_temp`. |
| Boil power beside the boil element: BOIL POWER 45 % in AUTO, POWER 100 % (the element's own level) in MANUAL; tap, adjust, SET; works while a recipe runs | React UI | The brewer's top priority, 10 Nov. Existing `set_boil_power` kettle action and `/actor/{id}/set_power`. See "Boil power" below. |
| Recipe column: every step, the current step's time left and progress bar, hop additions with "add now" when due | React UI | Existing step data. Boil additions are already there, for example `Hop_1: 60` and `Hop_1_text: "3.00 oz Centennial"`. Start, Stop and Next step use the existing `/step2/start`, `/step2/stop` and `/step2/next`. |
| Next step asks once, in place: "Skip the rest of Saccharification (23:41 left) and start Sparge?" | React UI | |
| Hop and lid alerts in the title bar with their own button (ADDED, DONE) | React UI | Existing notifications with actions. Since the S2 fix they stay until answered. |
| Line drawing of the rig: liquor and wort pipes that move only while their pump runs; elements glow while heating | React UI | A new drawing component driven by actor state. The 3-vessel HERMS plumbing is built in; the mapping above says which switch is which pump. |
| The drawing's hand valves and which way the liquid goes: through the HERMS coil and round the HLT while mashing; to the boil kettle, with sparge water from the HLT pump through the HERMS coil and on into the top of the mash tun, during the runoff (see "The sparge through the HERMS coil" below) | React UI | The brewer's request and answers (9 Nov): see the end of this file. CraftBeerPi can't see the valves, so the screen works the positions out from the recipe and says so under the boil kettle ("VALVES ARE SET BY HAND · SHOWN FOR STEP 4 (SPARGE)"). The runoff runs from the moment the step named for it has started (status A, S or D) until the boil step leaves I, so it includes the hold at "Ready to boil?". The step is found the way the core finds it for the first-wort reminder, `StepController._collects_wort`: not a HeatStep; the name, split at camel case, lower-cased and with anything but letters and digits turned to spaces, matches `^(?:step \d+ )?(?:(?:start\|begin) )?(?:(?:fly\|batch\|continuous) )?(?:sparge\|sparging\|lauter\|lautering\|run ?off)(?: \|$)` and contains none of the words water, heat, heating, prepare, preparation, salts or treatment. The boil step is the first BoilStep after it. At any other time, and with no recipe, the drawing shows recirculating. In Test Recipe v5 the Sparge step keeps the mash tun in AUTO, so CraftBeerPi reports the wort pump running "for the HERMS"; during the runoff the drawing still sends it to the boil kettle and leaves the coil dark. The mockup's `runoffStep()` and `renderRig()` are the reference, and `#sparge` is the demo moment. A SpargeStep is the runoff by its type, and holds the valves on recirculating until Sparge started: see "The SpargeStep" below. |
| Phone layout: current step on top, faceplates stacked, recipe below, tabs along the bottom | React UI | Fixes U4 (the dashboard does not adapt to small screens). The phone keeps every control the monitor has. |
| Connection lost: readings turn grey and show their age, controls pause, an alert says what is happening | React UI | Uses the websocket's connection state. Reconnecting cleanly is the separate open defect HC-UI-02. |
| ALL OFF in the title bar: recipe stopped, every kettle to MANUAL, both elements and both pumps off | React UI, or server optional | The brewer kept it on 9 Nov and asked for it to stop the HLT pump too, so it was renamed from ALL HEAT OFF. The UI can send the separate commands and report any that fail: stop the recipe first (`/step2/stop`) so it can't switch a kettle back on, then each kettle's `/off`, then `/off` for all four switches. A single server endpoint would make it one command that either works or fails as a whole. The HLT pump's override switch can still run that pump; see the next row. |
| The HLT pump's override switch: under the pump in the drawing, OFF gets a third line, "UNLESS OVERRIDE SWITCH IS ON"; when the screen switches the pump off, on its own or with ALL OFF, the last-event line adds "its override switch can still run it" | Setting and React UI | The HLT pump has a switch on the rig that runs it whatever CraftBeerPi says, and CraftBeerPi can't see that switch (rig record, 9 Oct). So "confirmed off" only means CraftBeerPi switched its output off, not that the pump has stopped. `BREWDAY_OVERRIDE_ACTOR` names the switch with an override; the screen adds both lines for it. The phone has no drawing, so there the last-event line and LOG carry it. |
| Last event and LOG under the title bar | React UI | Covers commands from this screen. Showing commands from the phone on the monitor too needs a shared log: server, optional. |
| Rest timer when brewing by hand: one timer, shared by every screen | Server and React UI | Chosen on 9 Nov. The server keeps the time left and whether it is running; START TIMER, PAUSE TIMER and ±5 MIN are commands to it, and every open screen shows the same countdown. At zero the server raises a CraftBeerPi notification, which shows on every screen and stays until answered, as hop alerts have since the S2 fix. Since 11 Nov the screen has up to four named timers instead (see "Timers" below), and keeps this one rest timer only for an older CraftBeerPi. |
| Barlow and Barlow Condensed fonts | React UI | Bundle the font files with the UI build. The Pi may have no internet on brew day; the mockup loads them from Google Fonts. |
| An HLT pump in the simulator | Simulator configuration | The rig already has one: `Recirc_PUMP` on GPIO 7, which is also the HLT kettle's agitator (the brewer confirmed the pump mapping on 9 Oct). The simulator has `Mash Pump` and `Glycol Pump` but no HLT pump; Brett plans to add one when he builds this. |
| The pre-brew check: START held on a recipe not begun checks that every probe gives a reading, the clock is set and every boil addition has a reminder; if one doesn't pass, an amber box under START with START ANYWAY (held) and DON'T START | Server and React UI | Approved 17 Nov. One check request on START (core 4.7.7.post45, Brett's), and the import keeping the additions it couldn't give a reminder. See "The pre-brew check" below. |
| COMPARE PROBES: the probes' own readings side by side before filling, judged at three levels | React UI | Approved 17 Nov, after the rig's own readings. Needs each probe's `offset` from its settings; no server change. See "The pre-brew check" below. |
| On a monitor, a box opened in the recipe column (the pre-brew check's box, COMPARE PROBES, the strike water's FORECAST) takes the timers' room as well as the step list's, a timer's editor open meanwhile making way with them, keeping what was typed; and the closed strike water box makes way for a timer's editor | React UI | 20 Nov. With timers in the column the boxes were squeezed to nothing, or pushed the timers past the column's foot. See "An open box takes the timers' room too" below. |
| The strike water helper: a box in the recipe column from a recipe's loading until its malt goes in, with where the mash lands, USE (the forecast's strike temperature, which changes the plan only when pressed) or BACK TO in one place, and FORECAST, whose head stays in reach while its details scroll; greyed, with the seconds so far, while CraftBeerPi works USE out, and a refusal said under the box when its figure has been overtaken | Server, plugin and React UI | Approved 20 Nov, with the bench's model's figures the same evening. The model works out the figures in a worker of its own; one call for USE and BACK TO, refusing an overtaken figure (409 `plan_changed`); the recipe's numbers kept on import; BrewStart's water volume, and a new Grain temperature setting on BrewStart (the brewer's fork). See "The strike water helper" and "…with the model's figures" below. |
| BrewStart's row says when it's ready by and its water ("126 °F · ready by 07:00 · 15 gal"); on one screen, a step's note and the versions line step aside where the current step wouldn't otherwise be whole | React UI | With the strike water helper, 20 Nov. `stepModel` reads Ready_Temp, the ready time and Volume; no server change. |

## What this screen does not fix

- U5 (a widget is deleted on touch, with no undo) and U6 (the saved fields `heigth` and `pathes` are
  misspelled) live in the free-form dashboard editor. The brew-day screen does not use the editor, so both
  stay open.
- Fermentation is out of scope; the fermenter dashboard (dashboard 2) is untouched.
- Recording the brew day (measurements, notes, saved brew days) belongs to BrewScribe and is not on this
  screen.

## Earlier proposals this settles

- Mockup 07 (does a step timeline replace the step list, or sit beside it?): the recipe stays a list,
  down the left beside the faceplates, with the current step's progress bar in the list.
- Mockup 03 (recipe progress), which the brewer liked, carries over into the recipe column.

## Additions beyond the D3 picture: the brewer kept all of them

The chosen D3 layout does not show these. Each one is in the mockup for a reason. On 9 Nov the brewer said
"keep your additions".

- **ALL OFF** in the title bar (ALL HEAT OFF until 9 Nov). Product principle 2: switching off is always
  quick. Neutral outline when nothing is wrong, so red keeps meaning PV digits and faults.
- **CONNECTED dot and the LOG button.** Principle 3 and defect U1: the screen should say whether it is
  live and what happened to each command.
- **Rest timer when no recipe runs.** The brewer said on 2 Oct that he uses his phone as a rest timer when
  brewing by hand. Principle 5: brewing by hand is as first-class as brewing from a recipe. Since 9 Nov it
  is one timer shared by every screen.
- **The Recipe Book list** in the same no-recipe moment, so one tap on LOAD gets a recipe ready to start.
- **The step strip at the top of the phone screen**, with the next step under it. The STORY line: "the
  step now and next".
- **A line under each window** ("At target", "0.4 °F below target"): the STORY line, "how close each
  vessel is".
- **The current step shows its time left** ("23:41 LEFT") where D3 shows a ▶ marker, because the time left
  is what you look for from across the garage. Steps still to come keep D3's ring marker.
- D3 shows START / PAUSE / NEXT STEP. CraftBeerPi has no pause (its step commands are start, stop, next
  and reset), so the mockup has START / STOP / NEXT STEP.

## The brewer's answers (9 Nov 2026)

1. ALL HEAT OFF: keep it, stop the HLT pump too ("Yes, stop the HLT pump too"), and call it ALL OFF ("Yes,
   call it ALL OFF"). It now stops both pumps, including a wort pump switched on by hand.
2. Rest timer: one timer shared by the monitor and the phone ("Share one timer between screens"), so the
   server keeps it.
3. How the HLT pump is set up on the rig: Brett found the answer in the rig records, so the brewer wasn't asked.
   It is its own actor, `Recirc_PUMP` on GPIO 7, and also the HLT kettle's agitator. It has an override
   switch that runs it whatever CraftBeerPi says (`C:\src\personal\cbpi-rig-comms\rig\2026-10-09.md`,
   line 11).

From his test of the built screen on port 8012, also 9 Nov (Brett passed these on):

4. The drawing should show the wort's path to the boil kettle: "before the boil step, I will run the wort
   pump to move wort from mash tun to [boil] kettle. Animation should reflect that path." And, at the hold
   before the boil: "I should be pumping wort from mash tun to boil kettle at this step".
5. "maybe there should be an icon for a valve between the pump and the HERMS coil too?" The drawing now has
   a hand valve on every branch, that one included.
6. When the wort starts going to the boil kettle: "From the start of the Sparge step: I fly sparge, so wort
   runs to the boil kettle during the sparge".
7. Whether the HLT pump moves the sparge water: "Yes, the HLT pump moves the sparge water to the mash tun".
   Before the sparge it recirculates the HLT; Brett's server change starts it whenever the HLT heats.

Assumed at first, answered on 10 Nov: the HLT pump's two ways (back round the HLT, or over to the mash tun)
are drawn with hand valves, like the wort pump's. The brewer actually moves hoses, but wants the valves drawn.

The screen isn't waiting on the brewer. Two questions about the drawing have been answered but not drawn yet (see
"Open questions about the drawing" below).

## A fix to the screen as built (10 Nov)

When brewing by hand, the recipe column holds the rest timer and the recipe book. On a screen under about
1000 px tall that is taller than the column, so the whole page scrolled: 34 px in a 1920×950 browser window
(the brewer's usual set-up) and 131 px on a 1440×900 laptop, breaking the One Screen Rule. Now the recipe book's
list scrolls inside the column, as the step list does while a recipe runs (`.book` and `.book ul` in
`brew-day.css`). Where nothing overflowed, the screen is unchanged, apart from one or two levels of
anti-aliasing on the list's rounded corners, because the list is now a scroll box.

## Boil power: the brewer's top priority (10 Nov), ships before the graphs

The request, on 10 Nov: "I seem to have lost the critical ability to set the boil power percentage with this redesign.
Work with the design agent to add it back. This is next high priority." A few minutes later: "I need to be
able to adjust boil element power even while running a recipe".

Brett is releasing this on the screen as built, before the graphs. So the reference is
`brew-day.html?graphs=none#boilpower`; `brew-day.html#boilpower` is the same control with the graphs.

What the brewer sees:

- On the boil kettle's faceplate, a button beside the BOIL ELEMENT lamp. The lamp used to fill that row on its
  own; now each takes half, so the faceplate gets no taller.
  - Boil kettle in AUTO: **BOIL POWER 45 %**, with "used from 210.2 °F · change" under it. This is BoilPower's
    `Boil_Power`. The temperature is where BoilPower starts using it: the kettle's target, which the Boil step
    sets to 210.2 °F (see the table).
  - Boil kettle in MANUAL: **POWER 100 %**, with "used by hand · change". This is the element's own level, the
    one it runs at when switched on by hand.
- Tapping it opens an editor in place of the mode row, the same shape as the target editor: −5, −1, the value,
  +1, +5, then SET 40 % and CANCEL. Whole numbers from 0 to 100; the keys stop at 0 and 100. Enter sets,
  Escape cancels, and a second tap on the button closes it. While it is open the button has a blue outline.
- After SET the button says "sending…", then the button, the lamp ("HEATING 40 %"; from 11 Nov just HEATING, see
  "±1 % beside the boil element, and HEATING without its %") and OUT all show the new
  level, and the last-event line says "Boil power 40 % (was 45 %) · confirmed". When the new level isn't in
  use yet, the event line says when it will be, so an OUT that doesn't move isn't taken for a failure:
  "used from 210.2 °F, full power until then" (AUTO, still heating up) or "used when you switch the element
  on" (MANUAL, element off).
- It works while a recipe runs. During the Boil step the kettle is in AUTO and its element lamp is locked
  ("run by AUTO"), but the power button is a separate button and no step locks it. The demo moment
  `#boilpower` is step 5, the Boil, running, with the 60-minute hop already in, and the brewer turning 45 % down to
  40 %. (Test Recipe v5's boil is step 5.)
- With no connection it pauses like every other control.

Decisions I made, from Brett's facts. I showed the brewer the first and fourth on 10 Nov (one button for both modes,
and no held press); he hasn't answered yet:

- **One button for both modes**, as Brett suggested: BOIL POWER in AUTO, POWER in MANUAL, and the hint says
  when the level is used. Hardware boil controllers work the same way: their output keys set the boil output
  in boil mode and the element output in manual mode. If the brewer would rather set the by-hand level somewhere
  else, only the MANUAL half changes.
- **If the kettle's mode changes while the editor is open** (the Boil step starting, a step stopping), the
  editor closes without sending anything, and the note under the faceplate says "The boil kettle switched to
  AUTO, so the button now sets the boil power. Nothing was changed." Otherwise SET could change the by-hand
  level while the button above it says BOIL POWER.
- **During the "Ready to boil?" hold the button offers POWER (by hand), not BOIL POWER.** Brett asked (10 Nov),
  since the kettle is in MANUAL then. Keep it that way. The button always sets the level the element runs at
  in the kettle's current mode, so it always agrees with the lamp and OUT. If the brewer heats the first runnings
  by hand while the wort comes over, POWER is the level that matters. The boil power can be set as soon as
  "Start the boil" switches AUTO on: the kettle then takes minutes to reach 210.2 °F, and the event line says
  "full power until then". Offering BOIL POWER during the hold would make the button's meaning depend on the
  recipe as well as the mode, and would leave no way to turn by-hand heat down. CraftBeerPi itself accepts a
  boil power at any time; the screen just doesn't offer it in MANUAL.
- **No held press for SET.** The Held Heat Rule is about switching heat on. SET changes a level and never
  switches the element on; when it is heating, a held press or AUTO already switched it on. It is already a
  deliberate tap, adjust, SET, and the urgent case, turning a boil-over down, has to be quick. DESIGN.md's
  Held Heat Rule now says so.
- **White digits in the editor**, not green (that means a target) or orange (heating now).
- **The hold temperature is left out** (`set_hold_target`, "Hold a temperature (whirlpool / hop stand)" in
  the old dialog). The Whirlpool step sets and clears it itself. Brett will ask the brewer whether he wants it.

| Part | What it needs | Notes |
|---|---|---|
| Which kettle gets the button | React UI | Only a kettle whose logic declares the `set_boil_power` action, read from the logic's actions as the old KettleControl dialog did. On the rig, the boil kettle. |
| BOIL POWER value and hint | React UI | The kettle's `Boil_Power` prop. The temperature in the hint is where BoilPower starts using the boil power, `BoilPower._threshold`: the kettle's target when it has one above 0 (the Boil step sets 210.2 °F), else its `Boil_Threshold` setting, else 99 °C / 210.2 °F. So with a 170 °F target the hint reads "used from 170 °F". It is shown as a plain number: 210.2, or 170 for 170.0. Corrected on 10 Nov: this row said `Boil_Threshold` only. Brett's port already followed the plugin; the mockup's `boilFrom()` now does too. |
| Setting it (AUTO) | React UI | `POST /kettle/{id}/action` with `{"action": "set_boil_power", "parameter": {"Boil_Power": N}}`. Works with the kettle off or on and at any step, and is kept in the kettle's settings, so a step restarting the logic keeps it. BoilPower uses it at its next control decision, about 2 s later, so OUT can lag "confirmed" by up to 2 s. A warning from CraftBeerPi (a value it can't use) is a failure: the button says so and the value stays as it was. |
| POWER value and setting it (MANUAL) | React UI | The element actor's `power`, and `POST /actor/{id}/set_power` with `{"power": N}`. Since M61 this level is the brewer's own and stays put when AUTO stops. |
| The lamp and OUT | React UI | Unchanged: the element's power while it is on. In AUTO below the threshold that is Max_Output (100 %), so OUT reads 100 % while the button reads the boil power. That is right, and the hint says why. |
| Whether a new boil power is in use yet | React UI | BoilPower switches to the boil power when the wort reaches the threshold, and keeps it until the wort falls 3.6 °F (2 °C) below (its boil latch). The screen can't see the latch, so it judges by PV ≥ threshold. Just after a dip below the threshold (a lid opened, a cold addition), the event line may say "full power until then" when the new level is already in use; OUT shows the real power within 2 s. |
| The editor | React UI | The target editor's layout with −5/−1/+1/+5, whole numbers and `inputmode="numeric"` (`.editor.pwr`). In the mockup: `powerHTML`, `editorHTML`, `cmdPwrOpen`, `cmdPwrStep` and `cmdPwrSet`, the `pwr`, `pstep` and `pset` cases in `run()`, the Enter and input handlers, and the `kind` and `what` fields of `st.edit`. The mode-change rule is at the end of the boil kettle's branch of `setMode`. The number box's screen-reader label follows the mode: "New boil power in percent" in AUTO, "New power by hand in percent" in MANUAL (corrected 10 Nov; it said "boil power" in both). |
| Two small fixes that come with it | React UI | (1) While any value editor is open, `#app` gets `data-editing`. Then the other faceplates' button rows stop stretching to the editor's height (the faceplates share row heights), and the drawing may shrink further (to 160 px, or 110 px with the graphs), so a two-line note under an editor can't make the page scroll. Before this, tapping the locked element lamp with the editor open scrolled the page 6–20 px at 1920×950 and 1440×900. With no editor open neither rule applies. (2) A valid SET clears a "Enter a … from … to …" note left from an earlier try, in both editors. |
| The demo moment | Mockup | `#boilpower`. Scenes can now carry `open` (state applied after `load()` resets the editor and notes) and `base` (whose graph history to use). |

Checked in the mockup (Edge), both with `?graphs=none` and with the graphs:

- At 1920×1080, 1920×950, 1440×900 and a 390×844 phone the button fits and its words don't overflow. No
  monitor size scrolls with the editor open, with a warning under it, or with a two-line explanation.
- Walked through: 36 % set mid-boil (lamp, OUT and event follow); 150 refused with "Enter a boil power from 0
  to 100 %."; an unchanged SET just closes; Escape and a second tap close; 60 % set in AUTO while still heating
  up (OUT stays 100 % and the event says when the new level applies); 70 % set in MANUAL with the element off,
  then the element held on (HEATING 70 %), then 55 % while on; NEXT STEP into the Boil with the by-hand editor
  open (it closes, says why, sends nothing); no connection (paused); the boil kettle's target changed to 170 °F
  (the hint follows: "used from 170 °F"). No script errors.
- With no editor open, the six existing moments change only in the boil kettle's lamp row.

### Found while checking: the whirlpool hold (designed in the boil kettle redesign below)

When the wort in a whirlpool stand cools more than 3.6 °F below the stand's temperature, CraftBeerPi asks
whether to heat it back and hold it there until the stand ends (the core's `WhirlpoolStep`). On "Heat and
hold" it sets BoilPower's `Hold_Target` and switches the kettle's logic on. While a hold is set, BoilPower
doesn't use the boil power at all. More than 7.2 °F below the hold it heats at Max_Output; then it eases off
to `Hold_Power` (30 % by default) as the wort reaches the hold, and switches off at or above it. The Boil step
leaves the kettle's target at 0, so BoilPower also puts its 210.2 °F threshold back as the target, for display
only.

So during a hold, the screen as built shows the boil kettle with SV 210.2 °F, and the line under the window
counts from 210.2 ("44.2 °F below target" at 166 °F), while the kettle is really holding 170 °F. The power
button says "used from 210.2 °F". If the brewer set a boil power then, the event line's "full power until then"
would also be wrong. This was true before boil power, apart from the button.

I'll design it with the whirlpool and chiller drawing, which needs a whirlpool moment anyway. My starting
point: the faceplate shows the hold as its SV, MODE reads HOLD, and the line under the window counts from the
hold; the power button says the boil power isn't used during a hold. The screen can tell a hold is set from
the kettle's `Hold_Target` setting: a number above 0 and more than 3.6 °F below the boil point
(`BoilPower._hold_target`). Whether the brewer also wants to set a hold from this screen is the question Brett is
keeping for him.

Update, same day: the redesign below designs it. The demo moment is `#hold` (17:18:40, holding 170 °F at
35 %). Today's faceplate shows it as described above. The redesign shows HOLD 170.0 in the SV place. MODE
stays AUTO, because AUTO is what the brewer switched on; the hold is said in the line under the window instead.

## AUTO with no target: ready to build (10 Nov)

On 8012 at 13:47: "What went wrong? I have Mash Tun "Auto" on but HLT is off. I think a "SV" was not
set - but it should pop up a warning in that case". The mash tun's target was 0, left from the last recipe.
PID_HERMS took 0 as a real target, so the HLT never heated, and the faceplate said MANUAL while MODE said
AUTO. Brett's server change raises CraftBeerPi's warning after 5 s. The screen's part is to tell the truth at
once, on the faceplate (The Mode Tells The Truth Rule in DESIGN.md).

"No target" is what the screen already shows as SV "– –": unset, 0 or below. The new lines show only while
the kettle's logic runs: its own AUTO or, for the HLT, the mash tun's HERMS.

| Where | Today, as built | Proposed |
|---|---|---|
| Mash tun in AUTO, no target | "MANUAL · wort pump by hand" | "No target, so the HLT won't heat" |
| HLT under the HERMS, mash tun with no target | "MANUAL · element by hand" | "Not heating: the mash tun has no target" |
| A kettle in its own AUTO (the HLT's PIDBoil), no target | "MANUAL · element by hand" | "No target, so it won't heat" |
| TARGET's hint, on a kettle in AUTO with no target | "change SV" | "set SV" |

The new lines and the "set SV" hint are in Prompt Amber, the colour for "waiting for you", and the line is
600 weight. Nothing else on the faceplate changes: MODE AUTO, SV "– –", OUT ("– –" on the mash tun, 0 % on
the HLT), and the wort pump RUNNING, because PID_HERMS still runs its pump. The HLT under the HERMS keeps its
dashed HERMS button, so it has no TARGET hint to change. The boil kettle would show "No target, so it won't
heat" too if its logic ever ran without a target; BoilPower never does, because it puts its boil threshold in
as the target as it starts.

The code, in the mockup's names (screen.js's `hermsOn()` is the mockup's `st.v.mt.mode === "auto"`):

    const noTarget = v => st.v[v].mode === "auto" && st.v[v].sv == null;

    // devHTML: after the link-lost line, before the MANUAL line. The MANUAL line's test
    // (not driven, or V.sv == null in any mode) also matches these cases, so these come first.
    if (herms && st.v.mt.sv == null) return `<span class="warn">Not heating: the mash tun has no target</span>`;
    if (noTarget(v)) return `<span class="warn">${v === "mt" ? "No target, so the HLT won't heat" : "No target, so it won't heat"}</span>`;

    // tgtHTML
    const by = v === "hlt" && st.v.mt.mode === "auto", pend = st.pend["t:" + v], none = !by && noTarget(v);
    return b(none ? "tgtbtn notgt" : "tgtbtn", "TARGET", by ? "set by mash tun" : pend ? "sending…" : none ? "set SV" : "change SV", {cmd: `tgt:${v}`, why});

    /* brew-day.css */
    .dev .warn{color:var(--prompt);font-weight:600}
    .tgtbtn.notgt small{color:var(--prompt)}

The warning in the title bar is CraftBeerPi's, so the screen shows it like any other prompt. My only
suggestion is its wording. Keep the title ("No target for the Mash Tun") and the OK button, and say: "AUTO is
on with no target temperature, so the HLT won't heat. Set a target, or switch to MANUAL." For a kettle without
a HERMS: "…so it won't heat." It says what's wrong first, and drops "but" and "for it". The mockup uses these
words.

What the mockup now does that the real screen gets from CraftBeerPi (demo only, nothing to port):
- AUTO no longer makes up a target when there is none (it used to give the mash tun 149.0 °F and the HLT its
  own). So START on a recipe step now sets the step's target first, as CraftBeerPi's steps do.
- The 1 s tick plays CraftBeerPi's part: from 5 s of AUTO with no target, it raises the warning once, with
  "No target for the Mash Tun · waiting for you" on the last-event line. The mockup shows one prompt at a
  time, so behind a hop alert the warning waits its turn. OK takes it down; the faceplate's line stays until
  there's a target or MANUAL. Setting a target, or MANUAL, takes the warning down at once.

Demo moments, both also with `?graphs=none`:
- `#notarget` (13:47:10), the brewer's case: the mash tun in AUTO since 13:26 with no target, the HLT in MANUAL at
  68.0 °F, the warning up.
- `#notarget-hlt` (09:12:40): the HLT's own AUTO with no target, at 66.2 °F.

Checked at 1920×1080, 1920×950, 1440×900, 1366×768, 768×1024 and 390×844, with graphs and with
`?graphs=none`: nothing overflows, and no size scrolls more than it does in `#mash`. Walked through: in
`#manual`, a held AUTO on the mash tun turns its line amber at once, and the warning comes at 5 s; TARGET 152
starts the HLT through the HERMS and takes the warning down; in `#hop` the warning waits behind the hop
alert; MANUAL brings back "MANUAL · wort pump by hand".

Files: `brew-day.js` (`noTarget`, `noTargetBanner`, `devHTML`, `tgtHTML`; for the demo, `setMode`,
`cmdTgtSet`, `cmdStart`, the 1 s tick and the two moments), `brew-day.css` (the two rules above), `graphs.js`
(flat, cold history for the two moments) and `brew-day.html` (two links on the mockup strip). Those files
also hold the boil kettle redesign below, behind `?bk=`. It is off unless asked for, and isn't ready to build.

## The boil kettle's power and temperature: ready to build (10 Nov)

> Later that evening Brett's new BoilPower changed parts of this section; the next section wins where they
> differ. The button beside AUTO/MANUAL is now TARGET (BOIL or a temperature to hold), and the boil power's
> button is the framed 45 % in the window. BOIL AT is a setting of its own with its own box. A hold is the
> kettle's own target and reads SV, like the HLT's, with OUT. The pause is `set_paused(Paused)`.

The brewer called the boil kettle's power and temperature controls "not intuitive". A first, three-way comparison
confused him ("I don't understand what you are showing me"). Then he asked: "make the BoilPower plugin look a
little different in its controls - but leave the HLT/MT alone. I don't need the heating element power echoed
so many places". Shown the result beside today's boil kettle, he answered "I think, YES", and asked for more
ideas from commercial boil controllers. Of three ideas taken from them, he chose "All three": one-tap −5 % and
+5 %, pausing the heat for a boil-over, and a usual power that each brew day starts at. Shown the result, he
answered "Yes, hand it to Brett".

It is the mockup's `?bk=power`, compared with today in `boil-kettle.html`. (You built it on 10 Nov, so since then
`?bk=power` is the mockup's default and `?bk=today` shows the old faceplate.) Before that, the default stayed
`?bk=today`, exactly as built, and you compared your screen with `brew-day.html?bk=power#<moment>` (with
`&graphs=none` while the graphs weren't released). Every moment's boil kettle changes, so test them all. The HLT
and the mash tun don't change.

| Part | Today | Proposed (`?bk=power`) |
|---|---|---|
| Green readout | SV 210.2 °F (the boil threshold) | BOIL 45 % (Boil_Power); HOLD 170.0 °F during a whirlpool hold (`Hold_Target`) |
| OUT | OUT 45 % with its bar | None on the boil kettle; MODE stays |
| Element button | HEATING 45 % · run by AUTO (locked) | Not locked in AUTO: HEATING · tap to pause. A tap pauses the heat: PAUSED in Prompt Amber, "hold to heat"; a held press heats again |
| Line under the window | "Boiling", or "39.4 °F below target · about 20 min at this rate" | "Boiling", "Full power until it boils · about 20 min", "Heat paused for 0:26" (Prompt Amber), "Holding 170 °F for the whirlpool · 0.6 °F below" or "MANUAL · element by hand" |
| Beside AUTO/MANUAL | TARGET · change SV | BOIL POWER · change: opens the power editor, with green digits |
| Beside the element | BOIL POWER 45 % / POWER 100 % in MANUAL | −5 % · turn down and +5 % · turn up, while AUTO runs: one tap sends `set_boil_power` at once. Not in MANUAL, during a hold, or while the editor is open. From 11 Nov: −5 % −1 % and +1 % +5 %, with no line under them (see "±1 % beside the boil element") |
| In the power editor | −5 −1 [45] +1 +5, SET, CANCEL | The same, plus BOIL AT 210.2 °F · full power until then · change (the kettle's target, 190-212 °F; above 212 °F it refuses with a note), and USUAL 45 % · starts each recipe · set in Hardware |
| In MANUAL | The power button sets the element's level by hand | The power button still sets Boil_Power ("kept for the boil in AUTO"); no level by hand |
| Graph | The threshold as a solid green line | The threshold dashed grey; a hold solid green; OUT drops to 0 while paused |

How it behaves:
- −5 % and +5 %: "sending…" under the button while waiting (from 11 Nov, the marching stripes along its top, and
  −1 % and +1 % too: see "±1 % beside the boil element"). A tap that would pass 0 or 100 % stops there
  (at 2 %, −5 % gives 0 %); only at 0 or 100 % itself is the button refused, with a note ("The boil power is
  already 100 %."). Corrected 10 Nov evening: until then the mockup refused −5 % at 2 %, saying it was
  already 0 %. The event says "Boil power 40 % (was 45 %) · confirmed", plus "used
  once it boils at 210.2 °F, full power until then" while it heats up, or "used when the heat carries on"
  while paused.
- Pause: a tap on HEATING in AUTO shows PAUSING…, then PAUSED, and the line counts the pause in Prompt Amber.
  Event: "BOIL ELEMENT paused · confirmed". A held press on PAUSED shows CARRYING ON…, then HEATING, with
  "BOIL ELEMENT heating again". A tap on PAUSED only says "Keep holding for one second. Heat only comes on
  with a held press." AUTO, the recipe, its timer and the boil power carry on while paused. MANUAL and ALL OFF
  end the pause. Carrying on goes back to what AUTO would do: the boil power once boiling, full power below.
- The editor: BOIL POWER opens it; BOIL AT inside it opens the target editor; USUAL is a reading, not a
  button. It stays open if the kettle's mode changes, because it always sets the boil power.
- Usual power: when a recipe starts from its first step, CraftBeerPi puts Boil_Power back to the usual power
  and says so: "Boil power back to your usual 45 % (was 35 %) · by recipe". A change made later that day,
  before or during the boil, is kept for that boil. The brewer chose "each boil starts at your usual power"; I
  moved the reset from the start of the Boil step to the start of the recipe, so a power set during the
  "Ready to boil?" hold isn't thrown away the moment the boil starts.
- This settles your question about the "Ready to boil?" hold: the button is BOIL POWER in every mode, and
  in MANUAL the element runs at its own level, as the HLT's does. The screen no longer sets that level.

What CraftBeerPi needs. The readout, −5 % and +5 %, BOIL AT and the hold need only the screen:
CraftBeerPi already gives it the threshold, Boil_Power and `Hold_Target`. Two additions need BoilPower:
- Pause: an action that switches the element off and keeps it off without stopping AUTO, keeping the boil
  latch and Boil_Power, and one that resumes. Without it, BoilPower switches the element back on at its next
  control decision, 2 s later. The screen needs to read that it's paused and, so that every screen counts the
  same, since when. Declared like `set_boil_power`, the screen can tell a logic that has it. The mockup sends
  them as "pause" and "resume" on the element's key.
- Usual power: a setting (for example Usual_Boil_Power, shown in Hardware), copied into Boil_Power when a
  recipe starts from its first step.
If you'd rather release the screen first, it can leave out PAUSED and USUAL until the logic declares them.

Moments: `#heatup` (15:12, the Boil step waits for 210.2 °F, so the step says HEATING, as your screen already
does; with `?bk=power` the LOG has the usual power's reset at 10:02:16), `#pause` (15:31:20, a boil-over: the
heat paused at 15:30:55), `#boiling` (15:52:40, PV 212.0 as on the simulator), `#boilpower` (the editor
open), `#sparge` (MANUAL before the boil) and `#hold` (the whirlpool hold, 170 °F at 35 %).

Changed since your boil power port, all in `proposal\`:
- `brew-day.js`: the moments above; `bkNew`, `bkHolding`, `bkLine`, `holdOut`, `svCell`, `powerHTML`,
  `boilAtHTML`, `nudgeHTML`, `bkLampHTML`, `bkNudges`; the boil kettle's parts of `lampHTML`, `auxHTML`,
  `plateHTML` and `editorHTML`; `cmdTgtOpen` and `cmdTgtSet` (BOIL AT), `cmdPwrOpen`, `cmdPwrSet`,
  `cmdNudge`, `cmdPause`, `setActor` and setMode's boil kettle branch (both end a pause), `cmdStart` (the
  usual power), the 1 s tick (the pause count, and a step's timer waiting for its temperature), and
  `bk.usual` in `load()`. Port what `BK === "power"` and `bkNew()` select; the `today` and `words` branches
  go. Don't port `FOCUS` and `reportFocus()` at the bottom: they only serve `boil-kettle.html`.
- `graphs.js`: the demo history for the new moments, rows with the hold as a 5th field, the threshold and
  hold lines in `graphSVG`, and `graphSummary`'s wording.
- `brew-day.css`: `[data-bk=power] .editor.pwr input`, `.ctrls.bkpow`, `.ctrls .nudge`,
  `.lamp[data-state=paused]` (three rules), `.editor small`, `.editor .bkat`, `.editor .usual`, `.g-sv.g-dash`
  and `.g-ref`, and the drawing's lower floor while an editor is open: 136 px, or 64 px with the graphs
  (`[data-bk=power] .app[data-editing] .rig`). The power editor's third row needs it: without it, a note under
  the open editor scrolled the page 15 px at 1920×950 and up to 20 px at 1440×900.
- `brew-day.html`: links on the mockup strip. `boil-kettle.html` is new and only for comparing; nothing in it
  to port.
- `DESIGN.md` and `.impeccable\design.json`: the boil kettle's faceplate, buttons, editor, lamp states, the
  Held Heat Rule, dos and don'ts.

Checked: all 13 moments with `?bk=power`, at 1920×1080, 1920×950, 1440×900 and 390×844, with and without
graphs: no page errors, nothing overflows, and no monitor size scrolls more than today's boil kettle does.
With the power editor open and a two-line note under it, nothing scrolls at 900 px tall or more. On a
1366×768 laptop, which already scrolls 92 px with today's editor open, it scrolls 118 px. Walked through
−5 %/+5 %, a pause and a held carry-on, BOIL AT from the editor (213 °F refused), ALL OFF while paused, and
the usual power: a fresh START goes back to 45 %, and 38 % set during the sparge is kept when the Boil step
starts.

Still open then, all answered later on 10 Nov (next section): the boil's timer keeps counting while the
heat is paused; a forgotten pause gets a kept warning after 2 minutes; and a hold by hand is the kettle's own
target, "like the HLT".

## The boil kettle's target, KEEP BOILING and a forgotten pause: ready to build (10 Nov, evening)

Build this with the section above; where they differ, this one wins. It covers three requests, all on
`brew-day.html?bk=power` (with `&graphs=none` until the graphs ship):
- Keeping the boil: "add a small checkbox with LED to choose keep at boil temp or let the boil power fully drive the temp
  (ok to fall if I set it too low %)".
- Holding by hand: "Set the boil kettle's target to 170 °F, like the HLT, and it holds there", "I
  question if a new button is needed for it", and "work with design agent for most elegant and practical
  solution... intuitive, elegant, and natural". Your BoilPower now treats the kettle's target T as BOIL when
  it is within 3.6 °F of the boil point B or above (or unset), and as a temperature to hold below that.
- The pause: the boil's timer keeps counting, and a forgotten pause gets a kept warning after 2
  brewing minutes.

The idea in one line: the boil kettle works like the HLT, plus BOIL. TARGET sits beside AUTO/MANUAL as on the
HLT, and its box has one more key, BOIL. While the target is BOIL, the green number is the boil power, and the
number itself is the button for it. While the target is a temperature, the faceplate reads like the HLT's.

### The faceplate, part by part

| Part | Target BOIL | Target a temperature (a hold) |
|---|---|---|
| Nameplate row | BOIL KETTLE, then KEEP BOILING at the right | BOIL KETTLE only: a hold never uses KEEP BOILING |
| Green readout | BOIL and the framed boil power: [45 % change] | SV 170.0 °F, as on the HLT |
| Beside it | MODE | OUT (with its bar) and MODE, as on the HLT |
| Line under the window, AUTO | As before: "Boiling", "Full power until it boils · about 20 min", "Below a boil · back to full power at 206.6 °F", "Not boiling · 10.9 °F below 210.2 °F" | As on the HLT: "0.6 °F below target", "At target", "18.4 °F above target · about 15 min at this rate". Resting inside 3.6 °F below it: "1.2 °F below target · heats again at 166.4 °F" |
| Controls, AUTO | −5 % · HEATING · +5 % (from 11 Nov −5 % −1 % · HEATING · +1 % +5 %) | HEATING, or OFF while it rests, alone; a tap pauses here too |
| Beside AUTO/MANUAL | TARGET · change | TARGET · change |

Since BoilPower 0.0.3.post8 (13 Nov) a PID holds the hold, so it no longer rests and the line no longer says where it
heats again: see "A hold held by a PID", near the end.

In MANUAL the line says "MANUAL · element by hand", there are no one-tap steps, and the readout follows the
target: BOIL [45 % change], or SV 170.0 °F. Paused, in either kind of target: "Heat paused for 2:15" in Prompt
Amber, as before.

The readout's kind comes from T and B alone: a hold when 0 < T < B − 3.6 °F, otherwise BOIL. B is the kettle's
`Boil_Threshold` prop; the screen no longer reads a separate hold.

### TARGET's box

```
[ −1 ][ −.1 ][  BOIL  ][ +.1 ][ +1 ]
[      SET BOIL       ][  CANCEL   ]
[ BOIL                ][ BOIL POWER]
  full power to 210.2 °F    change
```
- It opens at the current target, BOIL or the hold, with the number selected, so typing replaces it ("BOIL"
  too). You made every target box do the same, the HLT's and mash tun's too, since typing 150 into "168.0" gave
  "150168.0"; the mockup's `cmdTgtOpen` ends `renderAll(); focusTin(true);` to match.
- From B − 3.6 °F up everything is BOIL, as in your BoilPower (206.6 °F with B at 210.2). So the steps run
  ...205.6, 206.5, BOIL: from BOIL, −.1 gives 206.5 and −1 gives 205.6. At BOIL, +.1 and +1 are refused with
  "BOIL is the top. BOIL AT, under BOIL POWER, sets where the boil starts."
- BOIL fills the box with BOIL and shows as pressed, like AUTO or MANUAL, whenever the box says BOIL. Typing
  212, or anything from 206.6 up, turns SET into SET BOIL and presses BOIL before SET is pressed; the box keeps
  what was typed.
- SET BOIL sends B as the target. SET 170.0 °F sends 170. Below 32 °F: "Enter a target from 32 to 206.5 °F,
  or press BOIL."
- Events: "Boil kettle target BOIL · confirmed" and "Boil kettle target 170.0 °F · confirmed". A hold set
  while the Boil step runs adds "it holds instead of boiling; the Boil step's timer carries on": the screen
  offers it, as you decided, and says what it does. While paused: "the heat stays paused".
- BOIL POWER, in the third row, swaps this box for the power box.
- Setting a target in AUTO takes effect as BoilPower would: BOIL is full power until B, then the boil power
  (at once if the wort is already at B); a hold eases in, or rests while the wort is above it (an element that
  was heating carries on, as in `_hold_climb_power`). Since 0.0.3.post8 a PID sets a hold's power: see "A hold held
  by a PID", near the end.

### The boil power's button, in the window

- Shown only while the target is BOIL: the green "45 %" with a small "change", in a 1 px frame
  (`box-shadow: inset 0 0 0 1px #3b4d5e`, radius 3 px). The frame takes no room: padding .28em with margin
  −.28em, so the digits sit where a plain reading's would. Hover: frame #7f91a3 and "change" in Text. While its
  box is open: a 2 px Select Blue frame (`aria-expanded="true"`). Offline: frame #2a3846, disabled with the usual
  note. After SET in its box: "sending…" in place of "change" (not for the one-tap steps, which show it on
  themselves).
- It is 29 to 44 px tall; `::before` makes the tap area at least 44 px at every size, the phone included.
- Accessible name: "Boil power 45 percent: change". It opens the power box, and closes it if it is open.
- Why there: a third button beside AUTO/MANUAL doesn't fit (TARGET is 94 px wide at 1366 and 102 px at 1440),
  and the boil power can't live only inside TARGET's box: "I seem to have lost the critical ability to set the
  boil power percentage" came from it going missing once already. The frame and "change" make it read as a
  control, in the window's own style (the graph's chosen span is framed the same way). The HLT's and the mash
  tun's readings stay plain readings.

### The power box and BOIL AT

- The power box is as approved, opened from the framed 45 % or from BOIL POWER in TARGET's box, with its
  number selected.
- With no `Usual_Boil_Power` set, its third row reads "USUAL – –" over "none · set one in Hardware", and
  starting a recipe leaves the boil power alone. (Your port says "none set · set in Hardware"; this avoids "set"
  twice. No moment shows it.)
- BOIL AT now opens a box of its own, two rows like the HLT's (aria-label "New boil temperature for the boil
  kettle"). It sends `set_boil_at(Boil_Threshold)`, 190-212 °F, with the same two refusals as before.
- Event: "Boil kettle boils at 205.0 °F (was 210.2 °F) · confirmed". In a hold it adds "not used while it holds
  170 °F". A target at BOIL keeps aiming at the boil, as your server does; the mockup moves T with B.
- An edge case for you: lowering B to within 3.6 °F of a hold turns that hold into BOIL (a hold at 200 °F
  with B lowered to 202). Holds are usually far below, so I've left it.

### KEEP BOILING

- A small checkbox at the right end of the nameplate row. The box is the LED: lit Setpoint Green with a dark
  tick and a soft glow while ticked ("Yes"); dark with a #7f91a3 edge while unticked ("No"). It is no taller
  than the name, so the row doesn't grow; `::before` stretches its tap area to 44 px. Label "KEEP BOILING";
  `role="checkbox"`, `aria-checked`; screen readers also hear ": full power again if the wort falls 3.6 °F
  below a boil".
- Shown only while the target is BOIL, in AUTO or MANUAL. One tap sends `set_keep_boiling(Keep_Boiling)`,
  "Yes" or "No". Waiting: the box shows the marching stripes, as a pending button does. Offline: grey.
  ALL OFF leaves it alone.
- Events: "Keep boiling on · confirmed" or "Keep boiling off · confirmed", with what it means now: in MANUAL
  "kept for the boil in AUTO"; paused "used when the heat carries on"; ticked while held at the boil power
  more than 3.6 °F below B "full power until it boils"; ticked while boiling "back to full power if it falls to
  206.6 °F"; unticked while boiling "the boil power only, even below a boil"; unticked while still heating
  "full power until it boils, then the boil power only".
- The line under the window, while held at the boil power below B: ticked, "Below a boil · back to full power
  at 206.6 °F"; unticked, "Not boiling · 10.9 °F below 210.2 °F". The screen can't read the latch; it can tell
  from the element running at the boil power, not full power, while PV < B.
- The request was a "small checkbox with LED". I read that as an LED-style checkbox, one lit box, so the state
  shows once. If the brewer wants a round lamp beside a tick box instead, it is a small change.

### A forgotten pause

- Your interface: a tap on HEATING (or OFF) in AUTO sends `set_paused(Paused="Yes")`; a held press on PAUSED
  sends `set_paused(Paused="No")`. The line counts from `Paused_At`, so every screen shows the same time. Pause
  works in a hold too.
- The warning, from the server: title "Boil Kettle heat still paused", message "The heat has been paused for 2
  minutes. To heat again, press and hold PAUSED on the Boil Kettle." (the kettle's name where it says Boil
  Kettle). One OK. Kept, once per pause, and taken down when the heat carries on, the kettle goes to MANUAL, or
  ALL OFF. OK only puts it away; the heat stays paused. In the mockup it waits its turn behind another prompt.
  Event: "Boil Kettle heat still paused · waiting for you".
- The boil's timer keeps counting while paused, as the brewer chose; the mockup already did.

### Graphs (option A)

- Target BOIL: drawn at B as the grey dashed reference, as before. A hold: the green line at the target, as on
  the HLT. With `?bk=power` the demo rows no longer use a fifth field for a hold; it is the target, in the third.
- The line's "about N min at this rate" heads for the hold, or for B while BOIL. The graph's screen-reader
  summary ends "; target 170.0 °F" for a hold.

### Moments

- `#bktarget` (12:41:02, no recipe; boiling by hand in AUTO): TARGET's box open with 170.0 typed.
- `#handhold` (12:58:40, the same day): AUTO, target 170, the wort at 188.4 °F and cooling, element off, SV
  170.0, OUT 0 %, "18.4 °F above target · about 15 min at this rate" with graphs.
- `#hold` (the recipe's whirlpool) now has the target at 170: SV 170.0, OUT 35 %, "0.6 °F below target".
- `#pause-long` (15:33:10): the `#pause` boil-over 2:15 later, PV 206.3, the warning in the title bar, "Heat
  paused for 2:15".
- `#keepboil` and `#letfall` (16:31:10, 2 %): KEEP BOILING ticked, and unticked at 16:10:21.
- Opened by a press, for the identity test: TARGET in `#boiling` (the box at BOIL), the framed 45 % in
  `#boiling`, BOIL AT inside the power box in `#boilpower`.
- Today's view of every moment is as it was. The new moments show today's faceplate honestly: SV 210.2 while
  it holds.

### Changed since the last boil kettle notes, all in `proposal\`

- `brew-day.js`:
  - New: `bkHoldT`, `endPause`, `pauseBanner`, `boilReadHTML`, `bkTgtEditorHTML`, `focusTin`, `cmdBatOpen`,
    `cmdTgtBoil`, `cmdBkTgtSet`, `cmdBatSet`, `bkRetarget`, `stepTarget`.
  - Changed: `boilFrom` (`Boil_Threshold` with power), `bkHolding`, `bkLatched`, `bkLine`,
    `holdOut(T, pv, heating)`, `tgtHTML` ("change"), `powerHTML` (power branch gone), `keepHTML` (new),
    `editorHTML` (BOIL AT is `bat`), `auxHTML` (OUT in a hold), `svCell`, `plateHTML`, `setMode`'s boil kettle
    branch, `cmdTgtOpen`, `cmdTgtStep`, `cmdTgtSet`, `cmdPwrOpen`, `cmdPwrSet`, `cmdNudge`, `cmdKeep` (new),
    `cmdPause`, `stepStart`, `cmdStart`, `setActor`, `run` (`tboil`, `bat`, `keep`), the input handler, the 1 s
    tick (the warning) and `load()` (`bk.boilAt`, `bk.keep`).
  - Scenes `hold`, `keepboil`, `letfall`, `pause-long`, `handhold`, `bktarget`.
- `graphs.js`: `gDemo` (`pause-long`, `handhold`, `hold`, `keepboil`, `letfall`), `graphTick`, `graphSummary`,
  `graphETA`, and `graphSVG`'s `svOf`/`hoOf`.
- `brew-day.css`: `.phead`, the `.keep` rules, the `.svbtn` rules, `.editor .tboil` and `.editor .tpwr` (4
  rules), and `.keep .box` in the reduced-motion line.
- `brew-day.html`: strip links. `boil-kettle.html`: moments and captions only, nothing to port.

### Checked

- All 18 moments at 1920×1080, 1920×950, 1440×900 and 390×844, with and without graphs: no page errors,
  nothing overflows, and no size scrolls more than today's boil kettle does.
- TARGET's box open with a two-line note under it: no scrolling at 900 px tall or more; 113-115 px at
  1366×768, where today's open box already scrolls 92 and the approved power box 118.
- The framed 45 % has a 44 px tap area at every size.
- Pressed through: the BOIL key, steps either side of BOIL, + refused at BOIL, a typed 212 (SET BOIL) and 20
  (refused); a hold set mid-boil (element off, OUT 0 %, SV, the Boil step's caveat) and back to BOIL (45 %, KEEP
  BOILING and the steps back); the framed 45 % opening and closing the power box; BOIL AT 213 refused, 205 moving
  a BOIL target, 208 in a hold leaving it alone; from a hold to BOIL below the boil point (full power); a pause,
  the warning at 2:00 and only once, OK, carrying on with a held press (warning gone), and MANUAL or ALL OFF
  taking it down; a pause in a hold.

## The SpargeStep: ready to build (core 4.7.7.post35, 10 Nov, evening)

Asked for on 10 Nov: "sparge step needs to let the HLT get up to mash out temperature before pumping wort over to boil
kettle. I also may do a "batch sparge" - it should be flexible to let me do either", then "I think the wort pump
may need to be manual". Core 4.7.7.post35 adds the step type SpargeStep for it. The screen as built copes with
most of it. What it gets wrong is the drawing: today it shows the valves set for the runoff from the step's first
second, while the HLT is still heating the sparge water and the wort pump is off.

The reference is the mockup with `?bk=power`, moments `#sparge-heat`, `#sparge-ready`, `#sparge-run` and
`#sparge-batch`, in both layouts and with or without `?graphs=none`. `#sparge` is unchanged: recipes already in
the book keep the old MashStep sparge until they are imported again.

### What the screen shows, phase by phase

| Phase | How the screen knows | Step row | Drawing |
|---|---|---|---|
| Heating the sparge water | `state_text` "Waiting for Target Temp", no countdown | HEATING (as built) | Recirculating, as built |
| The water is ready | A prompt titled with the step's name, no countdown | WAITING FOR YOU (as built) | Recirculating, with the valves to change marked in amber |
| Sparge started, with a timer | The step's props have `_sparge_started: true`; countdown in `state_text` | mm:ss LEFT (as built) | The runoff, as built today for a runoff step |
| Sparge started, Timer 0 | `_sparge_started: true`, no countdown | **SPARGING** (new; was NOW) | The runoff |

### The hand valves

- **A SpargeStep is the runoff by its type**, whatever it is called, as in the core's
  `StepController._collects_wort` (`collectsWort`). Steps of other types are still found by name, as before.
- **Held on recirculating until Sparge started.** While the current step is a SpargeStep and its props don't
  have `_sparge_started: true`, the drawing shows recirculating, exactly as during the mash (`held` in
  `renderRig`). That covers HEATING, WAITING FOR YOU, and a SpargeStep stopped before the press. Use
  `_sparge_started`, not the countdown: with Timer 0 there never is one. Once it is true, the drawing shows the
  runoff, as it does today for a runoff step.
- **Marked while the step waits for you.** When the step row says WAITING FOR YOU on that step, and the
  connection is up, each valve that has to change stays drawn where it is now and turns Prompt Amber
  (`--prompt`, #ffb21e), like everything else waiting for the brewer:
  - its outline: `.rig-line .valve.set.liq path, .rig-line .valve.set.wrt path {stroke: var(--prompt); stroke-width: 3}`,
    placed after the `.valve.live` rule so it wins over a valve's blue or brown;
  - its tag, which says where it has to go: "SET OPEN" or "SET CLOSED" (`.tag.set {fill: var(--prompt)}`);
  - the second line of the note under the boil kettle: "SET THEM FOR STEP 4 (SPARGE)", amber (`.vnote .set`), in
    place of "SHOWN FOR RECIRCULATING".
  The pipes stay lit as they really run: the HLT pump round the hot liquor tank, the wort pump off.
- Layout B marks four valves: the coil line SET CLOSED, the line to the boil kettle SET OPEN, the HLT return SET
  CLOSED and the sparge line SET OPEN. Layout A has no sparge line, so its HLT return stays "OPEN", unmarked, and
  only the two wort valves are marked.
- **The HLT return's tag moves while it is marked.** Its run, from the riser to the drop into the HLT, is 90
  drawing units; "SET CLOSED" is 87 units wide without graphs and 112 with them, so under the valve it would sit
  on both pipes. While marked, it goes to the left of the riser, level with its valve: x = `hltRiser - 14`,
  y = `yTop + 8`, `text-anchor="end"` (`rigValve`'s new `alt` argument, applied in `setValve`). At any other
  time it stays under its valve. (Later the same evening, two tags under their valves learned to move down as
  they grow with graphs: see "After your port" below.)
- The drawing's description for screen readers (`rigDesc`) adds, while it waits: "Step 4, Sparge, is waiting for
  you to set them for the sparge: close the coil line and the HLT return, and open the line to the boil kettle
  and the sparge line to the top of the mash tun." Layout A leaves out the HLT return and the sparge line. (The sparge
  line now goes into the HERMS coil, and these words with it: see "The sparge through the HERMS coil" below.)
- On the phone there is no drawing, as built. The title-bar prompt and the step row carry the moment there.

**Fly or batch: one set of valves covers both**, as you thought. In a fly sparge both pumps run (`#sparge-run`:
the sparge line and the line to the boil kettle lit). In a batch sparge each pump runs alone: the wort pump drains
the first runnings to the boil kettle, then the HLT pump refills the mash tun (`#sparge-batch`: only the sparge
line lit, the wort pump off). Only the running pump's line lights, so the drawing is right for both. One thing it
can't show: a vorlauf between batches, running the wort back into the mash tun through the coil line. The valves
would be set for that by hand and the drawing would still show the runoff. I left it; it only matters if the brewer
vorlaufs between batches.

**WAITING FOR YOU needs nothing more.** The prompt and its SPARGE STARTED button are in the title bar on every
page, the step row says WAITING FOR YOU, and the drawing marks the valves. A fourth signal would be noise.

### The step row and the "now" line

- The step's temperature is the sparge water's, not the mash's, so a SpargeStep's reads "water 168 °F · 40 min"
  in the step row, the "now" line and a "Next:" line (`stepTemp`). With Temp blank there is no temperature, as
  for any step.
- After Sparge started with Timer 0: **SPARGING** in the step row and "sparging" in the "now" line, in place of
  NOW (`runWord`). NOW stays for every other step without a timer.
- WAITING FOR YOU stays the brighter amber of the screen as built (`.wfy {color: #ffd27a}`, now in the mockup's
  CSS too).

### Events

- **The step starting.** The screen as built logs "Sparge started, hot liquor tank target 168.0 °F" as the step
  starts (`observe()`, the "started" line). For a SpargeStep that says the button's words 8 minutes before anyone
  presses it. Log instead "Sparge: heating the sparge water to 168 °F, mash tun MANUAL" (by recipe), or with
  Temp blank "Sparge: mash tun MANUAL, the pumps are yours". "Sparge resumed" after a Stop is fine as it is.
- **The countdown starting.** The screen as built logs "Sparge: 168 °F reached, 40 min timer started" when a
  countdown appears. For a SpargeStep the countdown starts at the press, not at the temperature. Log "Sparge:
  sparge started, 40 min timer started" when `_sparge_started` turns true ("…, until NEXT STEP" with Timer 0),
  unless this screen pressed it.
- **The press, here.** "Sparge: sparge started, 40 min timer started" (confirmed). CraftBeerPi's notice that
  follows ("The HLT's AUTO is off now, so its element won't run as the HLT empties. Sparge timer started. …") is
  logged as any notice is; the mockup shortens it to "HLT AUTO off, so its element won't run as the HLT empties".
- The prompt itself is logged "waiting for you" as any prompt is, and its button reads SPARGE STARTED, upper-cased
  from CraftBeerPi's label as built.

### Faceplates: nothing to change

- Heating: the HLT in AUTO at SV 168.0, with its usual line ("7.4 °F below target · about 4 min at this rate"
  with graphs). The mash tun in MANUAL, keeping its SV 149.0.
- After Sparge started: the HLT in MANUAL, element off, still showing SV 168.0, because CraftBeerPi leaves its
  target until the step's timer runs out.

### The mockup's step, to match the server

- Starting (`spargeBegin`, from `stepStart` and from START): the mash tun's AUTO off, so the wort pump stops. Unless
  Sparge started was pressed before, the HLT's target goes to Temp and its AUTO on: HEATING, and if the water is
  already there, the question within a second.
- SPARGE STARTED (`cmdBanner("sparge")`): the prompt goes, the countdown starts (or SPARGING), the HLT goes to
  MANUAL, and the drawing goes over to the runoff.
- STOP: the prompt is taken down and the HLT's AUTO goes off. START before Sparge started heats again and asks
  again; START after it carries on without heating.
- Leaving the step: the HLT's AUTO off, the pumps as they are.

**One thing to check in the server, not the screen.** Your message says the HLT's target goes to 0 as the step
ends "(time up, NEXT or Stop)". In `SpargeStep` only `on_timer_done` sets it to 0; `on_stop`, which NEXT and Stop
run, only switches the HLT's AUTO off, so after a NEXT the HLT shows MANUAL with SV 168.0. The mockup follows the
code. Either is fine for the screen; tell me if you change it.

### Moments

All four use the `#mash` day and recipe with step 4 replaced by a SpargeStep (`SPARGE_STEP`: Sparge, HLT, 168 °F,
40 min). Saccharification ended at 14:56:21.

- `#sparge-heat` (14:59:40): the HLT at 160.6 °F heating at 100 %, the mash tun MANUAL at 148.4 °F, the HLT pump
  running round the HLT, the wort pump off. HEATING; the drawing on recirculating.
- `#sparge-ready` (15:04:40): the water reached 168 °F at 15:04:10. The prompt in the title bar, WAITING FOR YOU,
  the four valves marked.
- `#sparge-run` (15:12:40): a fly sparge. Sparge started was pressed at 15:05:02: both pumps running, the HLT
  MANUAL at 166.9 °F, the boil kettle filling (146.8 °F), 32:22 LEFT.
- `#sparge-batch` (15:20:30): a batch sparge, with the step's Timer at 0: the first runnings went over from 15:05
  to 15:13; now the HLT pump refills the mash tun with the wort pump off. SPARGING.

### Changed, all in `proposal\`

- `brew-day.js`:
  - New: `SPARGE_MASH`, `SPARGE_STEP`, `WFY`, `spargeBanner`, `spargeBegin`, `waitHTML`, `stepTemp`, `runWord`.
  - Changed: `collectsWort`, `rigDesc(ro, held, setNow)`, `setValve(id, open, flowing, change)`, `renderRig`,
    `stepHTML`, `nowHTML`, `stepStart`, `cmdStart`, `cmdStop`, `cmdBanner` (`sparge`) and `load()` (step 4).
  - Scenes `sparge-heat`, `sparge-ready`, `sparge-run`, `sparge-batch`.
- `rig.js`: `rigValve(…, alt)`, and the HLT return's `alt` in layout B.
- `graphs.js`: `gDemo`'s `sparge-…` branch.
- `brew-day.css`: `.wfy`, `.rig-line .valve.set…` and `.tag.set, .vnote .set`.
- `brew-day.html`: four strip links.

### Checked

- The four moments and `#sparge` at 1920×950, 1366×768 and 390×844, layouts A and B, with and without graphs: no
  page errors and no words in the drawing overlapping. Nothing scrolls more than `#sparge` does today: none at
  1920×950, 92 px at 1366×768.
- The moved tag sits 14 units clear of the riser at every size.
- Pressed through: SPARGE STARTED (countdown from 39:59, the HLT MANUAL, the drawing to the runoff, the HLT
  return's tag back under its valve); STOP and START after it (no heating, the countdown carries on); STOP while
  waiting (prompt down, valves unmarked) and START (heats, asks again); STOP and START while heating; NEXT STEP
  from the fly sparge (the HLT stays MANUAL at SV 168.0, the pumps as they were).
- `#mash`, `#sparge` and the 22 boil kettle moments are unchanged.

## After your port: five small changes (10 Nov, late)

> Built the same evening: you ported 3, 4 and the USUAL wording in 5 (UI 10608b9, build 5cbd721, on 8012).
> Your design copy matches this folder file for file, and identity is 281/281 again. The released screen on main
> was whole in all 28 of its moments, so nothing needed back-porting. The timers proposal stays out of the screen
> (scope-css.mjs) until the brewer approves it.

You built the boil kettle's target model, KEEP BOILING, the forgotten pause and the SpargeStep, and your identity
test compared all 22 moments at five sizes, with and without graphs, plus 15 presses: 281/281. Since then, in
`proposal\`:

1. **The boil kettle you built is the mockup's default.** `brew-day.js`:
   `const BK = ["words", "today"].includes(QS.get("bk")) ? QS.get("bk") : "power";`. `?bk=today` shows the
   faceplate the screen keeps for an older BoilPower; the strip calls the two "as built" and "older BoilPower".
   Addresses with `bk=power` still work. Nothing to port.
2. **Every target box opens with its number selected**, as you built it: `cmdTgtOpen` ends
   `renderAll(); focusTin(true);`. Nothing to port.
3. **Two valve tags move down as they grow.** With graphs the drawing's labels are set larger (`rs`, up to 1.3),
   but the tags under the sparge valve and the HLT return valve stayed where they were, so they touched their
   bowties. `rig.js`, `rigSVG`, two lines:
   - `${A ? "" : rigValve("sp", g.vSp, ySp, "liq", g.vSp, n(ySp + 10 + 20 * rs), "middle")}`
     (was `ySp + 26`, 48; now 52 without graphs and up to 58 with them);
   - `${rigValve("ret", g.vRet, yTop, "liq", g.vRet, n(yTop + 19 + 13 * rs), "middle", A ? null : [g.hltRiser - 14, yTop + 8, "end"])}`
     (was `yTop + 32`; still 82 without graphs, up to 85.9 with them).
   13 is the height of a tag's capitals at `rs` 1, so each tag moves down as much as it grows. The sparge valve's
   tag also moves 4 units further down at every size, because without graphs it was only 0-2 px clear. The
   HLT return's `alt` place (SET CLOSED, left of the riser) doesn't change. Every moment's drawing changes with
   graphs; without graphs only the sparge valve's tag moves.
4. **The clock and ALL OFF keep their size in the title bar** on a monitor or laptop. `brew-day.css`, after
   `.clock`: `@media (min-width:1180px){.alloff,.clock{flex:none}}`. Found while checking 3: `.clock` has
   `min-width:3.2ch`, about two thirds of "15:04", and could shrink to it, so a long prompt squeezed its box and the
   time spilled out. In `#sparge-ready` it ran off the right edge of the screen by 3-5 px at 1366×768 and
   1440×900, and at 1920 wide ALL OFF wrapped onto two lines. Now only the prompt gives way, as it should: it
   wraps. No prompt got taller and no page scrolls more. Moments that change: `#sparge-ready` at every desktop
   size; `#pause-long`, `#notarget` and `#notarget-hlt` at 1366×768; `#pause-long` by 1 px at 1440×900. At 1280
   and 1180 wide, which aren't among your test sizes, `#offline` changes too.
   Narrower than 1180 px nothing changes (see "Not fixed" below).
5. **No usual boil power set**: "USUAL – –" over "none · set one in Hardware", and starting a recipe leaves the
   boil power alone (`cmdStart` checks `usual != null`; `load()` gives 45 only when `usual` is undefined). Yours,
   "none set · set in Hardware", works too; mine avoids "set" twice. No moment shows it.

### Your port decisions: agreed

- An older BoilPower (no `set_boil_at`) keeps the old faceplate.
- The two new event lines: "Sparge: sparge started, 40 min timer started" with "from another screen", and just
  "Sparge resumed" for a Start after Sparge started. The mockup's START after the press doesn't heat again either.
- NEXT and Stop leaving the HLT's target at 168, as CraftBeerPi's other steps do.
- Leaving the 3.6 °F edge.

### For new designs: the class name `box`

`App.css` gives every element with class `box` a dark shadow, on every page. KEEP BOILING's tick box is
`.keep .box`, which `scope-css.mjs` now cancels. The timers proposal's SOUND switch reuses that button
(`.keep.snd`, with its `.box`), so the same cancel covers it. Nothing new will use the name `box`.

### Not fixed: the title bar between 701 and 1179 px wide

Wider than a phone but narrower than 1180 px (a tablet, or a browser window snapped to half a 1920 monitor), the
title bar stays one row, and a long prompt is squeezed into a narrow column: in `#sparge-ready` at 768 px wide
the title bar is 318 px tall, and the clock spills out of its box by up to 20 px, into the page's margin (at
1179 px it reaches the screen's edge). Keeping ALL OFF and the clock whole there would make it 534 px, so 4 leaves
those widths alone. The real fix is to give the prompt its own row under the title bar at those widths, as the
phone does. I haven't designed that; it matters only if the brewer uses those widths.

### Checked

- Tags, measured on screen (each tag's letters against its own valve, with three pictures: neither, only the
  valve, only the tag) in every moment at 1920×1080, 1920×950, 1440×900, 1366×768, 1280×800 and 2560×1440, with
  and without graphs: at your four desktop sizes the sparge valve's tag now has at least 2 clean px under its
  bowtie (before: touching, or overlapping by up to 2 px with graphs; 0-2 px without), and the HLT return's at
  least 1 with graphs (2 or more on 99 of 101 pages, where before it had 1) and 3 without. In close-ups, nothing
  else in the drawing lies within 1 px of a tag's letters. While an editor is open on a short screen, the drawing
  shrinks to a thumbnail (3-5 px lettering) where every tag sits within a pixel of its valve; that was so before.
- The drawing is never rebuilt as the clock ticks (every moment, four sizes, 6 s each).
- Title bar: 810 pages (every moment; default, `?graphs=none`, `?bk=today`, `&timers=new` and `?layout=a`; at
  1920×1080, 1920×950, 1440×900, 1366×768, 1280×800 and 1180×820): the clock spilled out of its box on 65 and
  came within 2 px of the screen's edge, or past it, on 16; now on none. Phones (390 and 360 wide) and 768 and
  1179 px: unchanged.
- Sweep: 540 pages (every moment, layouts A and B, with and without graphs, the default and `?bk=today`, and
  `&timers=new`, at 1920×950 and 390×844): no page errors. What still overflows is on purpose (the phone's hidden
  "Connected" label and the last-event line's "…"), plus 2 px inside the finished timer's row and banner in the
  timers proposal (`#timer-done`), where nothing shows cut off.
- Pressed: the HLT's, mash tun's and boil kettle's target boxes (both faceplates) open focused with the whole
  number selected, and typing 150 gives 150. USUAL with none set reads as above and fits; a recipe started then
  keeps a boil power of 40, and with 45 set it goes back to 45.

## Timers: approved on 11 Nov, built the same day

On 10 Nov, after using the rest timer, the brewer asked: "why is it named that? lots of things use a timer during a brew day. I
want an optionally audible alarm and more attention grabbing but still elegant visual alerting when timer expires.
Also want to have multiple timers in parallel if I click a + or something like that. Nice to have= ability to name
timers". Asked whether the sound should cover only his timers, he chose "my timers and CraftBeerPi's alerts".

Then, on 11 Nov: "add the timers that design agent discussed. Those default names are fine as long as they're easily
changed on brew day. I'd like to have an easy config setting to choose the default timer names from the setup if
that's easy enough too". The names setting is the next section but one.

> **Built, 11 Nov.** Brett built it the same day: the screen in d14cd4e (build 6aec761, the web UI's brewday-graphs
> branch), the server in 1a60d39, 8369ac8 and 0784a6d (`cbpi\controller\timers_controller.py`,
> `cbpi\http_endpoints\http_timers.py`). His identity test matched the mockup 375/375 with `&timers=new`, and the new
> live test passed 56/56. 8012 runs it. The mockup then took four of the screen's choices and made the timers its
> default: see "After the build" at the end of this section.

The mockup shows the timers by default, moments `#timers`, `#timer-done`, `#timer-new`, `#timer-names`,
`#timer-nonames`, `#timers-hand` and `#sound-allow`; `?timers=new` shows the same, and `?timers=today` shows those
moments with the one rest timer, which the screen keeps for an older CraftBeerPi. It is modelled on a
four-channel kitchen timer, ThermoWorks' TimeStack: four timers in view at once, digits that flash until the alarm is
stopped and then count up, and a Set that recalls the last time. The alarm follows process-control practice
(ISA-18.2 and ISA-101 displays): something blinks only while an alarm waits for an answer, and the alarm sits in a
banner on every screen. WCAG 2.2.2 (anything that blinks for more than 5 s needs a way to stop it: OK) and 2.3.1 (no
more than 3 flashes a second: this is one slow pulse) are met.

### What changes

- **The name.** "Rest timer" goes. The section is TIMERS; each timer has a name, "Timer 1", "Timer 2" and so on
  unless he gives it one.
- **Where.** In the recipe column, during a recipe as well as by hand: below the steps while a recipe runs (the
  step list gets shorter and keeps the current step in view), and where the rest timer is today when brewing by
  hand. On a phone, and anywhere the page stacks, the timers come before the steps or the recipe book, and the
  step strip at the top gets a line, "TIMERS Stir 7:12 · Yeast paused 6:12", that jumps to them.
- **A timer's row.** Its name and state on the left ("of 15:00", "PAUSED · of 15:00", "ready", "TIME'S UP"), its
  time large on the right, and one button: START, PAUSE, or START "carry on". While CraftBeerPi answers that button
  it says STARTING… or PAUSING…; while the timer waits on anything else (a new time, a new name, minutes more) the
  button keeps its label, greyed, with the usual "Waiting for CraftBeerPi to answer." A 4 px bar along the row's bottom
  edge shows how far this countdown has gone. The left part is a button that opens the timer's editor.
- **+ TIMER** under the rows. Up to four timers; a fifth is refused with "Four timers at most. Remove one to add
  another." in the timers' own note line. While a timer's editor is open, + TIMER is not shown: there is one editor
  at a time, and a press would have dropped that editor's changes. It is back when the editor closes.
- **The editor**, one at a time, in place under its timer (or where + TIMER was). Its title sits in its blue
  border: NEW TIMER or CHANGE STIR. While it is open, the other timers shrink to one 44 px line with their name and
  time.
  - NAME, a text box (placeholder: the default name), and under it the names to pick from Settings (see "Names from
    Settings" below; HOP STAND, YEAST and VORLAUF unless the brewer changes them). A tap fills the name; a second tap
    clears it.
  - For a stopped or new timer: MINUTES with −1, a box (1 to 300) and +1, and six presets: 5, 10, 15, 20, 30, 60.
    New: CANCEL, SAVE ("start it later") and START ("counts down now"). Stopped: REMOVE, CANCEL, SET.
  - For a running or paused timer: "Time left 7:08" with −1 MIN, +1 MIN and +5 MIN, which apply at once ("Changes
    the time left at once, on every screen."), then REMOVE and DONE. Removing a timer that has time left (running
    or paused) asks once, in place, as NEXT STEP does: "Remove Stir? It has 8:02 left." REMOVE IT / KEEP IT. A
    stopped timer, or one that has run out, goes at once, and a waiting alarm goes with it. SET on a timer that has
    run out answers its alarm too, and stops it at its new time.
  - Enter in a box presses the main button, or, while it is greyed, says why; Escape closes the editor.
  - **The column makes room for it (added 11 Nov).** On the one-screen layout (1180 px wide and up), while a
    timer's editor is open, the step list is hidden, and when brewing by hand so are the recipe book and its two
    buttons, RECIPE BOOK and BREW STEPS. They come back when the editor closes. For those few seconds the step's
    name and countdown are out of view on a monitor (only the phone has the step strip at the top); the
    recipe's header still says "Running · step 3 of 7", and a hop addition or a step's question still comes up in
    the title bar. Before this, the list shrank to whatever room was left: at 1920×950 a 41 px strip that cut
    "23:41 LEFT" in half, and by hand the editor pushed the recipe book off the screen, so the page scrolled 70 px.
    The mockup sets `data-tedit` on `#recipe` while `st.tedit` is set; the rule is
    `@media (min-width:1180px){.recipe[data-tedit] :is(.steps,.book,.handlinks){display:none}}`. Where the page
    stacks (under 1180 px, phones included) nothing is hidden: the timers already come first and the page scrolls.
- **When a timer runs out**, on every screen, until somebody answers it on any one:
  - its row turns Prompt Amber: "TIME'S UP", the time counting up from zero ("+0:12"), and two buttons, +5 MIN and
    a white OK ("stops the alarm");
  - CraftBeerPi's kept prompt in the title bar, titled with the timer's name: "The 15:00 timer has run out.", with
    +5 MIN (drawn as the lesser button: no fill, an amber outline) and OK. Two at once: "Timer 2 · 1 more waiting",
    as the screen as built shows it;
  - the row, the title bar's prompt and a frame round the whole screen (a 4 px Prompt Amber edge with a soft glow
    inside it) pulse together: opacity from 0.15 to 1 and back, 1 s each way, ease-in-out. With reduced motion they
    stay lit and still. Nothing else on the screen pulses;
  - with SOUND on, the screen beeps three times every 3 s;
  - the event line: "Stir finished · waiting for you".
  - OK puts the timer back to its own time, stopped, ready to start again ("Stir: alarm answered"). +5 MIN runs it
    for 5 more minutes ("Stir: 5 more minutes"; its row then says "of 5:00").
- **SOUND**, at the right of the TIMERS heading: this screen's own switch, KEEP BOILING's lit box with role
  "switch". It covers this screen's timers and CraftBeerPi's alerts: three beeps every 3 s while a timer's alarm
  waits, two beeps once when any other prompt, warning or error appears. Turning it on plays the two beeps, so he
  hears what it sounds like. (Until 12 Nov: the brewer asked for no sound on the press. See "SOUND switches on silently".)
  It is kept in the browser (localStorage), not in CraftBeerPi, so the phone can be quiet while the monitor beeps.
- **A browser plays sound only after a tap on the page.** After a reload with SOUND on, the switch says "SOUND · TAP
  TO ALLOW" in amber, its box unlit amber, until the first tap or key press anywhere, which unlocks it
  (`#sound-allow`). Escape doesn't: a browser doesn't count it. A press on SOUND itself allows it too, leaves it on,
  and plays the two beeps (silent since 12 Nov); it doesn't switch it off. A mouse press counts as it goes down, but a finger counts only as
  it lifts (the HTML standard's activation-triggering events: `pointerdown` for a mouse, `pointerup` or `touchend`
  for a finger or pen, `keydown` except Escape), so a touch tries again on `pointerup`.
- **The sound** (one for now; choosing between presets modelled on real controllers is the brewer's later todo): a
  softened piezo beep, a sine at 1760 Hz, 120 ms (12 ms rise, then falling away), three of them 200 ms apart (Web
  Audio).

### Names from Settings: BREWDAY_TIMER_NAMES (11 Nov)

What "default timer names" means here. I asked the brewer what a new timer should be called if he doesn't pick a name.
He answered "multiple choice boxes from preconfigured list", then "or freeform in addition to mult choice". So:

- the names in the setting are buttons in the editor, picked with one tap;
- he can still type any name;
- nothing is filled in for him. A timer nobody names is "Timer 3" (the next free number), as the server's
  `_default_name()` already does. NN/g's advice on defaults is to pre-fill only what nearly everyone would choose;
  "Hop stand" put into every new timer would be wrong most of the time, and easy to save by mistake.

**The setting.** Key `BREWDAY_TIMER_NAMES` (Brett's, beside `BREWDAY_OVERRIDE_ACTOR`), type string, source
craftbeerpi, default "Hop stand, Yeast, Vorlauf". The Settings page shows the key as the setting's title with the
description under it, so the description does the explaining. Its words:

> Brew-day screen: names to pick with one tap when you add or change a timer, separated by commas, up to 24
> characters each. The first six show, in this order. You can still type any name on brew day. Blank shows none.
> (default: Hop stand, Yeast, Vorlauf)

What changed from Brett's first wording: "to pick with one tap" says what the names are for; "up to 24 characters
each" warns that a longer name is cut, which the server does without saying; "the first six show, in this order"
gives the limit where he writes the list, because the editor doesn't repeat it (below).

**The editor** (`namesHTML()` and `cmdTe()` in the mockup):

- The names are buttons under NAME, in the setting's order, three to a row, the first six (two rows). Six is what
  fits a 1920×950 screen with no scrolling (measured below).
- Labels in capitals, as on every other button; the spoken label (`aria-label`) is the name as written. A long name
  wraps rather than being cut, up to three lines (`-webkit-line-clamp:3`): a 24-character name takes two lines at
  1920 px and three at 1440 px and on a phone.
- A tap puts the name in the box and shows the button pressed; a second tap clears it. A name typed exactly as a
  button's shows that button pressed.
- A name another timer already has, whatever its capitals, is greyed (`aria-disabled`), and a tap puts this in the
  timers' note line: "Another timer is already called Yeast. Give this one another name, so you can tell their
  alarms apart." In `#timer-new` YEAST is greyed, because the second timer is called Yeast. A timer's own name is
  not greyed in its own editor: CHANGE YEAST shows YEAST pressed.
- A typed name that another timer has is refused the same way, with the same words, when START, SAVE, SET or DONE
  is pressed. Nothing is sent, the editor stays open, and after Enter the caret stays in the box. DONE with the
  name unchanged just closes. The reason: a timer's alarm is titled with its name, so two alarms called Yeast in
  the title bar couldn't be told apart.
- Spaces are kept as the server keeps them: trimmed, with one space between words.
- The default name skips any "Timer N" another timer has, whatever its capitals (a timer called "timer 3" makes the
  next one "Timer 4").
- **Blank setting:** no buttons, and one muted line in their place: "No names to pick: BREWDAY_TIMER_NAMES in
  Settings is blank." It takes less room than the buttons, and says where they went.
- **More than six:** the first six, and nothing more. The description tells him when he writes the list. A line in
  the editor would repeat it every time he adds a timer, and would push the editor past a 1920×950 screen (by 32
  px).
- The buttons carry their place in the list (`te:pick:3`), not the name, so a name with a colon, a quote or a `<`
  can't break the command or the page.
- In the mockup, `?names=Hop stand,Yeast` tries a list, read as the server reads the setting (`?names=` alone:
  blank). `#timer-names` has eight names: the first six show, with the longest a name can be, Hop stand picked and
  Yeast greyed. `#timer-nonames` has a blank list.

**Fit, measured** (with the column making room, above): the new-timer and change-timer editors fit 1920×1080 and
1920×950 with no scrolling, with and without graphs, with three names or six, in a recipe and by hand with three
timers. At 1440×900 three names fit and six scroll the page by 28 to 52 px. At 1366×768 the page already scrolls
92 px with no editor open, and an editor adds 4 to 92 px more, as the other editors there do.

### The brewer's answers (11 Nov)

- Approved: "add the timers that design agent discussed".
- The names: a setting, as above. "Those default names are fine as long as they're easily changed on brew day":
  they are buttons, and the box takes any name.
- Not answered, so the mockup stands: hop additions don't pulse or repeat the sound as a timer that has run out
  does, and four timers is the most. Either can change later without touching the rest.

### Built against Brett's server

| On the screen | Request |
|---|---|
| NEW TIMER: START | `POST /timers` `{name, seconds, start: true}` |
| NEW TIMER: SAVE | `POST /timers` `{name, seconds, start: false}` |
| SET, for a stopped timer or one whose alarm waits | `PUT /timers/{id}` `{name, seconds}` (an alarm that waits is answered and the timer stopped at its new time) |
| DONE, for a running or paused timer, with a new name | `PUT /timers/{id}` `{name}` (name only: the server refuses a new time while a timer counts) |
| −1 MIN, +1 MIN, +5 MIN in a running or paused timer's editor | `POST /timers/{id}/add` `{seconds: -60}`, `60` or `300` |
| START, PAUSE, START "carry on" | `POST /timers/{id}/start`, `/pause` |
| REMOVE, or REMOVE IT | `DELETE /timers/{id}` |
| OK and +5 MIN, in the row or the title bar | `POST /timers/{id}/ok`, `/plus5` (the prompt's own two actions call the same) |

- A name left blank can be sent as the placeholder or not at all: the server's "Timer N" is the same name.
- The title bar knows a prompt is a timer's from the timer's `prompt` field (its prompt's id), and only then draws
  +5 MIN as the lesser button.
- The names to pick come from the settings, which the server pushes to every screen whenever one changes (the
  "configupdate" topic), so a list saved in Settings shows on open screens at once. The timers' own `names`, in
  `GET /timers` and every "timers" message, is the fallback.

### What the server needed: done 11 Nov

1. **A blank setting gives no names** (0784a6d, with the setting's description). `config.get()` returns the default
   for a blank value (`config_controller.py`, lines 46 to 55), so a blank list offered the three default names, and
   ConfigUpdate added "Hop stand, Yeast, Vorlauf" back at the next start. Both now look in the cache:

   ```python
   # TimersController.names()
   entry = self.cbpi.config.cache.get(self.NAMES_SETTING)
   raw = self.NAMES_DEFAULT if entry is None or entry.value is None else entry.value

   # ConfigUpdate
   if "BREWDAY_TIMER_NAMES" not in self.cbpi.config.cache:
   ```

2. **A saved list reaches the screens already open**: the screen reads the names from the settings, as above.
3. **One name per timer on the server too** (8369ac8). `_name()` refuses a name another timer has, with the
   screen's words, comparing with `casefold()`; `_default_name()` skips a "Timer N" the same way.
4. **A wider box on the Settings page: done** (web UI 1f66a3d). Text settings used MUI's default `TextField`
   (about 180 px wide), so most of a six-name list was out of view while he typed it. `fullWidth` alone wouldn't
   have widened it, because the value column only grows to fit what's in it. The brewer chose "wider boxes, and a long
   value wraps": from 900 px wide every text box is 360 px, and six names fit on one line; below that it takes its
   column's width, as before (a fixed width pushed the table 69 px past its frame on a phone). The box wraps a long
   value, up to 8 lines; Enter adds nothing, and a pasted line break becomes a space.

### What the web UI needed

- Everything above. The 4 px bar, the editor's legend title, the shrunken rows and the names' wrapping are new
  CSS; the rest reuses the screen's buttons, editor input, confirm box and KEEP BOILING's box.
- **Identity tests:** run `#timer-done` with reduced motion, or the pulse differs from frame to frame. The new
  moments are `#timer-names` and `#timer-nonames`; `#timer-new` changed (YEAST greyed, no step list, no + TIMER
  while an existing timer is edited).

### After the build: the screen's choices, taken into the mockup (11 Nov)

The timers are the mockup's default now, as `?bk=power` became: `brew-day.html` with no `timers` setting shows them,
and draws exactly what `?timers=new` draws (checked: 116 of 116 moments and views, pixel for pixel), so the identity
test needs no change. `?timers=today` is the one rest timer, which the screen keeps for an older CraftBeerPi; the
strip's switch reads "Timers: as built / older CraftBeerPi".

Brett built four things differently on purpose, and the mockup now does the same:

- **SOUND while it says TAP TO ALLOW.** The press that allows it leaves it on and plays the two beeps (silent since
  12 Nov, see "SOUND switches on silently"). (In the
  mockup, the press's `pointerdown` allowed it and its click then switched it off.) A key press allows it too, except
  Escape, which a browser doesn't count, so it works from the keyboard.
- **The go button while the timer waits.** STARTING… and PAUSING… only for those two commands; for anything else it
  keeps its label, greyed. (The mockup said PAUSING… for any command the timer waited on: a stopped timer being
  saved, or a running one renamed or given more minutes.)
- **REMOVE** asks only for a running or paused timer. A stopped one, or one that has run out, goes at once. (The
  mockup asked "Remove Yeast? It has 0:00 left." for a finished one.)
- **Enter in a timer's box while its main button is greyed** says why, as a press on the button does. (The mockup
  ran the command anyway.)

Three more, mine, for Brett to take or leave:

- **A press on SOUND is left to SOUND's own click.** `unlockSound()` returns for a target inside `.snd`, and
  `cmdSnd()` treats a press while TAP TO ALLOW as "allow, keep on, two beeps" (no beeps since 12 Nov). This does what the screen's
  `s.allowed` flag does, without the flag. With the flag, a press that starts on SOUND but never becomes a click (a
  finger that slides off, or a phone's scroll that starts there) leaves `allowed` set. The next press on SOUND, meant
  to switch it off, then only beeps.
- **A finger tries again as it lifts.** The HTML standard counts `pointerdown` as the user's own press only for a
  mouse; a finger or pen counts at `pointerup` or `touchend`. A phone may therefore refuse to start sound at the
  finger's `pointerdown`, while the screen already shows SOUND as allowed, and the first alarm would be silent. The
  mockup also listens to `pointerup` for anything but a mouse: if the sound is still asleep (`actx.state ===
  "suspended"`), it wakes it then. With a mouse or a key nothing changes. Playwright counts every simulated press as
  the user's, Escape included, so this could not be tested here. To try it on the brewer's phone: reload with SOUND on,
  tap once anywhere, then let a timer run out.
- **A finished timer's alarm goes when the timer is removed or SET.** The mockup's simulation, which your demo
  mode copies, left the prompt pulsing in the title bar with buttons that did nothing. A new `tAnswered(t)` takes
  the prompt down (OK and +5 MIN use it too), and the next waiting alarm takes the title bar a second later. Live,
  CraftBeerPi already withdraws the prompt, so only the demo was wrong.

> **Taken, 11 Nov.** Brett took all three as written, in web UI d31b4b1 (build 72af3d1). One difference, right for
> the screen: its `unlockSound()` calls `renderAll()` rather than redrawing only `.snd`, because the screen updates
> its regions in place and the pressed button stays put. His identity test matched this folder 375/375 (the 11:23
> copy), asking for `?timers=today` for a build without the timers; the timers live test passed 56/56 and the brew
> day's 83/83. Still to check, on the brewer's phone: after a reload with SOUND on, one tap anywhere, then a timer that
> runs out should be heard.

### Changed, all in `proposal\`

- `brew-day.js`: new `TIMERS` (the `?timers=new` flag), `TMAX`, `TSUG`, `TPRE`, `tfmt`, `tById`, `tPct`,
  `tDefaultName`, `tBanner`, `timersHTML`, `trowHTML`, `teditHTML`, `soundHTML`, `tmlHTML`, `tmlText`,
  `keepStepInView`, `cmdTe`, `cmdTm2`, `audioOK`, `ring`, `cmdSnd`, `tmTick`; changed `bannerHTML` (several
  answers, "N more waiting", the lesser button), `handHTML`, `recipeHTML`, `nowHTML`, `renderAll`, `explain`
  (the timers' note line), `run`, the 1 s tick, `load()`, the input and key handlers; scenes `timers`, `timer-done`,
  `timer-new`, `timers-hand`, `sound-allow`.
- `brew-day.css`: the `.tmrs`, `.trow`, `.tsel`, `.tedit`, `.tfield`, `.tsug`, `.tpre`, `.tkeys`, `.tact`, `.tml`
  rules, `.keep.snd.blocked`, `.banner .act.sec`, the `ring` pulse and its reduced-motion line, and the stacked
  order.
- `brew-day.html`: moment links and the "Timers: today / proposed" switch.

11 Nov, the names setting and the column making room:

- `brew-day.js`: `TSUG` replaced by `TNAMES` (the setting's default), `TNLEN` (24), `TNMAX` (6) and `tNames()` (reads
  a list as the server does); new `tTwin`, `tTwinWhy`, `namesHTML`; changed `tDefaultName` (skips a "Timer N" in
  any capitals), `teditHTML`, `timersHTML` (no + TIMER while a timer's editor is open), `cmdTe` (`te:pick:i`
  replaces `te:name:…`; spaces kept as the server keeps them; a name another timer has is refused), `renderAll`
  (`data-tedit` on `#recipe`), `load()` (`st.names` from the moment or `?names=`), the input handler (pressed by
  place in the list) and the Enter handler (the caret stays in the box); scenes `timer-names` and `timer-nonames`;
  `timer-new`'s comment.
- `brew-day.css`: `.tsug .cmdbtn .lb` (wraps, up to three lines), and the one-screen rule hiding the step list, the
  recipe book and its two buttons while a timer's editor is open.
- `brew-day.html`: two moment links, "Timers: today / approved", and the header comment.

11 Nov, after the build:

- `brew-day.js`: `TIMERS` defaults to "new" (`?timers=today` for the rest timer) and the strip's `data-tm` links
  follow; new `tAnswered()` and `unlockSound()` (with `pointerdown`, `pointerup` for anything but a mouse, and
  `keydown` except Escape); changed `trowHTML` (the go button's waiting label), `cmdTe` (REMOVE asks only for a
  running or paused timer; REMOVE and SET take a finished timer's alarm down), `cmdTm2` (uses `tAnswered`), `cmdSnd`
  (a press while TAP TO ALLOW allows), the Enter handler (a greyed main button says why), and the timers scene's
  comment.
- `brew-day.html`: "Timers: as built / older CraftBeerPi", and the header comment.

### Checked

- The five moments at 1920×950, 1366×768 and 390×844, with and without graphs: no page errors. Nothing scrolls more
  than the same moment today, except NEW TIMER's editor at 1366×768 (118 px against 92), as the other editors
  there. Every button is at least 44 px; SOUND has KEEP BOILING's 44 px tap area.
- Pressed through: + TIMER with an idea and a preset, START and SAVE; PAUSE and carry on; −1/+1 MIN on a running
  timer (its "of" and bar follow); renaming; typing 12 and Enter; REMOVE at once when stopped and with the question
  when running; four timers and the refusal; one and then two running out (the second waits its turn, "1 more
  waiting"); OK and +5 MIN from the row and from the title bar; SOUND off and on; the first tap allowing sound;
  Escape; the phone's strip jumping to the timers.
- Every moment of the page in every view: 567 loads, no errors. Today's view of the timer moments shows the screen
  as built ("Rest timer · The rest timer has finished." in `#timer-done`).

11 Nov:

- Pressed through at 1920×950: greyed YEAST and its note; tapping a pressed name clears it; typing a name presses
  its button; "yeast" typed and refused, from Enter (caret kept) and from START; "  Mash   stir  " saved as "Mash
  stir"; CHANGE YEAST with YEAST pressed and + TIMER gone; renaming Yeast to STIR refused; DONE unchanged closes;
  a blank list, then START unnamed ("Timer 3"); a list with repeats, a 33-character name (cut to 24) and
  `a:b "c" <i>` (kept as one name, shown and picked whole); a timer called "timer 3" makes the next "Timer 4";
  Escape. On a phone the step list stays while the editor is open. Today's view of `#timer-names` and
  `#timer-nonames` shows the screen as built.
- Fit: the numbers under "Names from Settings". With the editor closed, nothing changed.
- Every moment in every view, plus the timers views with six names and with a blank list, at 1920×950 and 390×844,
  and the timers views at 1920×1080 and 1440×900: 1160 loads, no page errors. Nothing spills sideways except what
  did before on purpose: the phone's hidden "Connected", the shortened event line, and 2 px in `#timer-done`.

11 Nov, after the build:

- The default against `?timers=new`: every moment, with and without graphs, at 1920×950 and 390×844: 116 of 116
  screenshots identical. `?timers=today` shows the rest timer, and the strip marks the view it shows.
- Pressed through: SOUND while TAP TO ALLOW pressed with a mouse, a finger, Enter and Space (allowed, still on, two
  beeps, none since 12 Nov; the next press switches it off); a key elsewhere allows it, Escape doesn't; a press that slides off SOUND
  allows nothing, and the next press on it allows it; a first press on Timer 3's START allows sound and starts the
  timer, with a mouse and with a finger. The go button while Yeast is SET (START, greyed), while Stir gets +1 MIN or
  a new name (PAUSE, greyed), and while each is paused or started (PAUSING…, STARTING…). Enter while START waits:
  "Waiting for CraftBeerPi to answer.", sent once. REMOVE at once for finished Stir (its alarm goes) and stopped
  Yeast; the question for paused Yeast and running PBW soak. Two finished, the first removed: the second takes the
  title bar. SET on finished Stir: stopped at 5:00, its alarm gone.
- Every moment in every view, the default and `?timers=today`, both layouts, at 1920×950 and 390×844, and the main
  views at 1366×768: 1073 loads, no page errors, nothing new spilling sideways. Layout A shows the timers without
  scrolling. `compare.html`, `graphs.html` and `boil-kettle.html` load, their frames showing the timers.

## ±1 %, HEATING without its %, and pumps off for the hoses: ready to build (11 Nov, afternoon)

Three changes, all on `brew-day.html` as it opens:
- ±1 %, at 13:19: "for BoilPower, I'd like the +/-1 in addition to the +/- 5 you already have."
- HEATING without its %, at 13:45: "I'd like the "HEATING xx %" button to only show HEATING since the percentage is shown in the graph and as a
  number on the right side of the PID display. It would be cleaner to remove this duplicate version"
- Pumps off for the hoses, the request your core 251edbf (DEFECTS M71) answers: "Any time I need to change hoses or "valves" that respective pump should
  be off".

The first two need nothing from the server. The third shows what the server now does, and brings the hold before the
boil into the mockup, with two changes to it. Checking those turned up long questions crushed in the title bar on a
phone and between 701 and 1023 px wide, fixed here too.

### ±1 % beside the element

While AUTO boils (target BOIL, no box open), the boil kettle's button row is now −5 % −1 % [element] +1 % +5 %. That
is the power box's order, growing outward from the element like a number line, so down stays on the left and up on
the right.

| Part | 11:23 mockup | Now |
|---|---|---|
| Columns | `minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)`, gap 8 px | `repeat(2,minmax(44px,1fr)) minmax(0,2fr) repeat(2,minmax(44px,1fr))`, `column-gap: 6px` |
| Step labels | −5 % over "turn down", +5 % over "turn up" | −5 %, −1 %, +1 %, +5 %, nothing under them; padding 6px 2px |
| A step waiting | "sending…" in place of its hint, kept under "down" or "up" | All four greyed, as before; the one pressed has the lamps' marching stripes along its top (6 px, `.nudge.sending::before`). The wait is kept under the step itself (`send("p:bk", String(d), …)`: "-5", "-1", "1" or "5"), so −5 and −1 can't both show it |
| Element's small line | BOIL ELEMENT · tap to pause (or · hold to heat) | tap to pause (or hold to heat). "BOIL ELEMENT · " stays for screen readers, in a `.sr` span |
| Element waiting | PAUSING… or CARRYING ON… over "BOIL ELEMENT · waiting for CraftBeerPi" | Its state word stays (HEATING, PAUSED or OFF) over "pausing…" or "heating…" ("waiting…" for anything else); its strip marches as before |
| Element's sides | 8 px | 6 px (`.ctrls.bkpow .lamp`) |
| Accessible names | Boil power down 5 percent, Boil power up 5 percent | Adds Boil power down 1 percent and Boil power up 1 percent |

Everything else stays. One tap sends `set_boil_power` with the new whole number. A step that would pass 0 or 100 %
stops there (2 % − 5 gives 0 %); only at 0 or 100 % itself is a step refused, with "The boil power is already 0 %."
(or 100 %). The event line says "Boil power 44 % (was 45 %) · confirmed", plus "used once it boils at 210.2 °F, full
power until then" while it heats up, or "used when the heat carries on" while paused. The steps hide in MANUAL,
during a hold and while the boil kettle's box is open; there the element fills the row and says BOIL ELEMENT, as
before.

Why it's drawn this way:
- One row, not two. From 900 px wide the three faceplates share their row heights, so a second row would make the
  HLT's and mash tun's rows taller too, appearing and vanishing with AUTO.
- No step is under 44 px wide (WCAG 2.5.5; NN/g asks for 1 cm). The element keeps twice their share: it's the button
  needed in a hurry for a boil-over, so it stays the biggest target. A slip onto the step beside it costs 1 %; a slip
  from a step onto it pauses the heat, which a held press undoes. (Changed 11 Nov, night: at 1180, 1280 and 900 px
  the two rules clashed and the element lost; see "The boil kettle's step row on narrow windows".)
- The element without its name. "BOIL ELEMENT · tap to pause" wrapped onto 2 lines at 1920 and 4 at 1366 in layout
  A, making the row 15-30 px taller as the boil started and moving the other faceplates' buttons under the brewer's
  finger. The faceplate's title says BOIL KETTLE, and it has one element.
- The waiting words. At 1366 in layout A the element has 63 px for its words; PAUSING… needs 75 and CARRYING ON…
  109, so they would spill or wrap. The wait is short, and what matters is that nothing jumps. This also ends a jump
  the 11:23 faceplate made: its waiting line wrapped at 1920 and on a phone, so the row grew 19 px for that moment.

Measured in `#boiling`:

| View | Each step | Element |
|---|---|---|
| Layout B, 1920 wide | 70 px | 139 px |
| Layout B, 1440×900 | 49 px | 97 px |
| Layout B, 1366×768 | 44 px | 89 px |
| Phone, 390 wide, either layout | 53 px | 107 px |
| Layout A, 1920 wide | 66 px | 133 px |
| Layout A, 1440×900 | 46 px | 92 px |
| Layout A, 1366×768 | 44 px | 81 px |

In every state the element can show between the steps (heating, off, paused, pausing, carrying on, a step
waiting), each line of words is one line and nothing spills, at all five sizes, with and without graphs, in both
layouts. In each steady state the row is exactly as tall as in the 11:23 mockup, and while waiting it is no taller.

### HEATING without its %

`lampHTML` says HEATING for any element in layout B. The power stays where the brewer pointed: OUT beside the window, with
its bar, and the graph's OUT band. That changes the HLT's element (by hand, in its own AUTO, and run by the mash
tun's HERMS) and the older boil kettle's element (`?bk=today`); the new boil kettle already said HEATING. Layout A
keeps "HEATING 62 %", because it has no OUT and no graphs, so there the button is the only place the power shows.
The screen builds only layout B, so for you it is always HEATING:

```js
t = A.kind === "heat" ? (LAYOUT === "a" && !(id === "bkEl" && BK === "power") ? `HEATING ${a.pct} %` : "HEATING") : "RUNNING";
```

### Pumps off for the hoses (core 251edbf)

The mockup now does what your server does, and shows it the way the screen already shows CraftBeerPi's own doings:
the lamp goes to OFF, the drawing's line stops, and CraftBeerPi's words say why. The screen never switches these
pumps itself and adds no warning of its own.

| When | Pump switched off | What the screen shows |
|---|---|---|
| A SpargeStep starts (`spargeBegin`) | Wort pump | Nothing new: `#sparge-heat` already had it off |
| The sparge water is ready (`#sparge-ready`) | HLT pump | HLT PUMP OFF, its line still and UNLESS OVERRIDE SWITCH IS ON under it in the drawing; the question's new words |
| Sparge started | None | As now: the brewer starts both by hand |
| The runoff ends (NEXT STEP here; also its time running out on the server) | HLT pump | Event line, from CraftBeerPi: "HLT pump: Sparge has ended, so the HLT pump is off. The wort pump is still running, to finish draining the mash tun." |
| The boil starts (START THE BOIL, or START) | Whichever still runs | Event line, from CraftBeerPi: "Boil: The wort pump is off, so you can move its hoses." |

- The question's words are your SPARGE_READY_TEXT and SPARGE_NOW_TEXT. `spargeBanner(temp, a)` builds the pump phrase
  from the pumps as they are when it asks, as the server does (`SPARGE_PUMPS_OFF`): ", and both pumps are off",
  ", and the HLT pump is off", ", and the wort pump is off", or nothing when both run. Without a temperature it starts
  "Both pumps are off. " (or "The HLT pump is off. ", "The wort pump is off. ").
- `spargeHose(which)` switches a pump off once per run of the step (`r.hoses`), with no event line, as on the server.
- The two notifications go in word for word, "from CraftBeerPi", as your `observe()` logs them. Both come 300 ms after
  the press's own "confirmed" line (`soon()`), so CraftBeerPi's words end up on top.
- In the book's recipe (`#sparge`, a MashStep), the mash tun's AUTO goes off as the recipe moves to the boil kettle,
  as before, so its HERMS stops the wort pump first and the HLT pump's message has only its first sentence.
- In LOG only: `#sparge-run` gains "15:04:55 HLT PUMP started · confirmed" (the brewer starts it again by hand) and
  `#sparge-batch` loses "15:04:50 HLT PUMP stopped" (CraftBeerPi did it at 15:04:10). The boil moments' older
  histories (`#hop` and the moments built on it) are left as they were.

### The hold before the boil: START THE BOIL held, NEXT STEP greyed

The hold is now in the mockup's engine (NEXT STEP from the sparge gets there) and in a new moment, `#boil-hold`
("Ready to boil?" in the mockup strip). It is your `?demo=longprompt`, carried on from `#sparge-run`: the fly
sparge's 40 minutes ended at 15:45:02, and it is 15:53:12. As your screen shows it:
- the question, titled with the step's name, in your words (`boilHoldBanner`);
- "Ready to start · step 5 of 7", and step 5 says WAITING FOR YOU. The mockup's `stepHTML` and `nowHTML` now show
  `r.wait` in the ready state, as yours do; they said READY;
- the HLT pump off and the wort pump running, with the drawing still on the runoff.

Two changes, both from The Held Heat Rule:
1. **START THE BOIL takes a held press**: one second, with the orange fill, or Space or Enter held. It says "hold to
   start" under its name, because it puts heat on, like START. Let go early and a toast says "Keep holding for one
   second. Heat only comes on with a held press." (the title bar has no note line). `bannerHTML` passes `hold` to
   `b()` for an answer that has it; `.banner .act` gets `position:relative; overflow:hidden` for the fill and a
   `small` style; `holdEnd` falls back to the toast. Your screen sends it on a tap today (`cmd: "b:ok"`).
2. **NEXT STEP is greyed during the hold.** A tap on it says "The boil is waiting for you. To start it, hold START
   here or START THE BOIL at the top." (`HELD_NEXT`). CraftBeerPi takes NEXT here as starting the boil
   (`StepController.next`, the branch with nothing active), so today NEXT STEP says "to Whirlpool Hop", asks "Skip
   the rest of Boil and start Whirlpool Hop?", and a yes starts the boil, with heat, after two taps. Your line 1724
   also shuts that question at the next update, because the recipe isn't running. Greyed, neither can happen.

A held START during the hold starts the boil, as START THE BOIL does (`cmdStart` calls `boilStart`). The event line
then reads, newest first: "Boil started, boil kettle AUTO · by recipe", the pumps' line from CraftBeerPi, then "Recipe
started · confirmed" (or "Ready to boil? Start the boil · confirmed").

`#boil-hold`'s data, if you want longprompt in the identity test: 15:53:12; step 4 is the SpargeStep (`sparge4: {}`);
recipe `{state: "ready", cur: 4, left: 5400, adds: [], held: true, wait: "WAITING FOR YOU"}`; HLT 164.4 °F, no target,
MANUAL; mash tun 166.9 °F, SV 149.0, MANUAL; boil kettle 151.3 °F, no target, MANUAL; both elements and the HLT pump
off, the wort pump on; the mash tun and the boil kettle drawn full; three lines at 15:45:02 on top of `#sparge-run`'s
(the question word for word, "waiting for you"; the HLT pump's message, "from CraftBeerPi"; "Sparge finished · by
recipe"); the graphs from `gDemo`'s SpargeStep branch, carried on to 15:53:12. It differs from your longprompt in the
HLT's 164.4 (yours 170.2: its element has been off since Sparge started, so it cools), the mash tun's SV 149.0 (as in
the other SpargeStep moments), the SpargeStep and the events (yours are `#mash`'s).

### Long questions in the title bar (phone, and 701–1023 px)

Found while measuring the hold. It was there before, but the new words make it worse:
- **Phone.** A long question sat in a column beside its button: `#boil-hold` 135 px wide and 405 px tall at 390 (513
  at 360), `#sparge-ready` 319 (254 before the new words). Now a question over 140 characters with a button
  (`data-long` on `#banner`, set in `renderAll`; `LONG_Q = 140`) keeps the width for its words, with its buttons under
  them at the right and the bell beside the title: 267 and 202 px. Text length picks them out, not width: the other
  questions are 125 characters or fewer, while a timer's alarm (32 characters, two buttons) leaves its words only
  131 px, so a width rule would catch it too.
- **701–1023 px wide, layout B** (a tablet, or half of the brewer's 1920 monitor). The question shared the top row with the
  brand, the connection, ALL OFF and the clock, leaving its words 36–175 px. At 701 px `#sparge-ready` was 837 px
  tall and the bar ran 49 px past the screen. Now the banner has the title bar's second row to itself, as on a phone
  ("NO ALARMS" too): 422–752 px for the words, 103–146 px tall. None of your five test sizes is in this range.

```css
/* in the phone block (max-width:700px): a long question keeps the row's width for its words, its buttons under them */
.banner[data-long]{flex-wrap:wrap;row-gap:8px}
.banner[data-long] .msg{flex-basis:calc(100% - 38px)}
.banner[data-long] .msg+.act{margin-left:auto}
.banner[data-long] svg{align-self:flex-start;margin-top:2px}
/* 701-1023 px wide, just before the phone block: the question takes the title bar's second row */
@media (min-width:701px) and (max-width:1023px){
  [data-layout=b] .topbar{flex-wrap:wrap;row-gap:8px}
  [data-layout=b] .brand{margin-right:auto!important}
  [data-layout=b] .topbar .banner{order:1;flex:1 1 100%;margin:0;max-width:none}
}
```

### Moments whose pictures change

±1 (`?bk=power`, the default): 7 moments, `#hop`, `#heatup`, `#boiling`, `#pause`, `#pause-long`, `#keepboil` and
`#letfall`, in layout B with and without graphs, layout A and `?timers=today`, at every size. Only the boil kettle's
button row changes; it keeps its place and size, and no page gets taller. `?bk=today` is unchanged.

HEATING: 14 moments in layout B, with and without graphs, and `?timers=today`: `#mash`, `#sparge`, `#sparge-heat`,
`#sparge-ready`, `#fail`, `#manual`, `#offline`, `#timers`, `#timer-done`, `#timer-new`, `#timer-names`,
`#timer-nonames`, `#timers-hand` and `#sound-allow`. With `?bk=today`, 24: those 14, plus `#hop`, `#boilpower`,
`#heatup`, `#boiling`, `#pause`, `#pause-long`, `#hold`, `#keepboil`, `#letfall` and `#bktarget`. Layout A: none.

Pumps and long questions: `#sparge-ready`, in every view at every size (the words, the HLT pump off, and on the phone
the question's layout, which makes its page 52 px shorter), and the new `#boil-hold`. Against the copy with ±1 and
HEATING, nothing else changes in any view. `#sparge-run` and `#sparge-batch` change only with LOG open. At 1366×768
`#boil-hold`'s page is 873 px tall (891 without graphs) and `#sparge-ready`'s without graphs 869: the question takes
three lines there, and the page is already at its 860 px least.

Unchanged by all three, in layout B: `#bktarget`, `#boilpower`, `#handhold`, `#hold`, `#notarget`, `#notarget-hlt`,
`#sparge-run` and `#sparge-batch`.

Presses: SPARGE STARTED in `#sparge-ready` now leaves both pumps off (the brewer starts them by hand), and on the phone its
SENDING… sits under the words. The boxes opened by a press (TARGET and the framed 45 % in `#boiling`, BOIL AT in
`#boilpower`) are unchanged; a press that starts in `#mash` shows the HEATING change.

New for your identity test: `#boil-hold`. If your test walks the mockup's `SCENES`, it will ask your screen for it.

### Changed, all in `proposal\`

- `brew-day.js`:
  - ±1: `nudgeHTML` (no hint line, the `sending` class), `bkLampHTML` (between the steps the name is in `.sr` and a
    wait keeps the state word), `plateHTML` (five buttons), `cmdNudge` (the wait kept under the step itself).
  - HEATING: `lampHTML`.
  - Pumps and the hold: `spargeBanner(temp, a)` with `SPARGE_PUMPS_OFF`; new `spargeHose`, `boilHoldBanner`,
    `boilStart` and `soon`; `stepStart` (the runoff's end, the hold, the mash tun's AUTO off before them, and the
    boil's graph mark only when it starts); `spargeBegin`; `cmdStart`; `cmdNextYes` (keeps the hold); `cmdBanner`
    ("boil"); `recipeHTML` (NEXT STEP, `HELD_NEXT`); `stepHTML` and `nowHTML` (the ready state shows its wait);
    `bannerHTML` (held answers); `holdEnd` (the toast); scenes `sparge-ready`, `sparge-run`, `sparge-batch` and the
    new `boil-hold`.
  - Long questions: `renderAll` (`data-long`) and `LONG_Q`.
- `graphs.js`: `gDemo`'s SpargeStep branch also draws `#boil-hold`'s history.
- `brew-day.css`: `.ctrls.bkpow` (five columns, 6 px apart), `.ctrls .nudge` (padding), `.ctrls.bkpow .lamp` (6 px
  sides), `.ctrls .nudge.sending::before` and its place in the reduced-motion line; `.banner .act` (position and
  overflow) and `.banner .act small`; the 701–1023 px block; the phone's `.banner[data-long]` rules.
- `brew-day.html`: "Ready to boil?" in the mockup strip, and the header comment. `boil-kettle.html`: four captions.
  Words only, nothing to port.

### Checked

±1 and HEATING:
- Every moment in five views at five sizes against the 11:23 mockup (638 pairs, flaky ones reloaded): ±1 changes only
  the boil kettle's row in the 7 moments above, in place and at its size; HEATING the moments listed.
- A walk through every label, step, the 0 and 100 % ends, refusals, the pause, the caveats, the phone and the views
  without steps; the rows measured in every state at five sizes, both layouts, with and without graphs.
- 1,450 loads: no page errors, and no spill the 11:23 mockup didn't have.

Pumps, the hold and long questions:
- A walk (`m71_walk.py`): the sparge moments' pumps and words; NEXT from `#sparge-run` into the hold (the HLT pump off,
  its message, the question on top); NEXT STEP tapped in the hold (the why); START THE BOIL tapped (the toast) and held
  (pumps off, their message, boil kettle AUTO, HEATING); START held and Space held in `#boil-hold`; the MashStep's way
  into the hold; a SpargeStep started with the water already hot (the HLT pump off as it asks); SPARGE STARTED; the
  four forms of the question's words. All as designed, no page errors.
- Every moment against the copy with ±1 and HEATING, in five views at five sizes (660 pairs): only `#sparge-ready` and
  `#boil-hold` differ. Six one-off differences in the step list were the known 1 px scroll flake; reloaded, they match.
- 1,500 loads, both copies: no page errors. The only new spill is the event line's ellipsis on `#boil-hold`'s
  question. `compare.html`, `graphs.html` and `boil-kettle.html` load.
- The title bar at 14 widths from 360 to 1920 px, in eight moments: a long question's words are never narrower than
  274 px, and nothing runs past the screen.

### For you to decide, or tell me

1. START THE BOIL held: please port it, or tell me if it must stay a tap.
2. NEXT STEP greyed in the hold. The other way would be NEXT STEP saying it starts the boil, and held; I'd rather the
   question's button and START stay the only ways, as its words say.
3. Mash Out: not added to the mockup's recipe. It's an ordinary mash rest, which the screen draws already, and adding
   it would renumber every moment and your demo data. Say if you want it.
4. Not changed: the event line's ellipsis hides the result of a long line, so `#boil-hold`'s "waiting for you" is cut
   off; LOG has it whole. One fix would shorten the words and keep the result. Tell me if you want it.

## The brewery's name in the title bar: ready to build (11 Nov, evening)

The brewer asked about it today. His BREWERY_NAME on 8012 is "EBrews - A CraftBeerPi Brewery", 30 characters, which the
title bar sets in capitals. Until now the mockup printed "CraftBeerPi Brewery" on a monitor and "CraftBeerPi" on a
phone, whatever the setting said; PRODUCT.md promised the setting.

The mockup also has a BREWSCRIBE tab now. Its notes come next, in their own section. Until you build it, add
`&brewscribe=none` to your identity test's addresses: that is the screen without it, and every rule below holds there.

### What it shows

- The setting, at every width: one span, no `.long` and `.short`. The phone shows it too. The name is what tells
  the brewer's rig from his simulators, and a phone is where he is most likely to have both open.
- Blank, or only spaces: "CraftBeerPi".
- Two lines at most, then "…". The cut is drawn only: the page keeps the whole name, so a screen reader reads it all.
- More than 24 characters (`LONG_NAME`): `data-long` on `.brand`, and the whole name as its `title`. It is drawn at 0.7 of
  the size on a monitor and on a phone. That keeps two lines inside the title bar's 50 px on a monitor, and fits 30
  characters on two lines in a phone's corner. From 701 to 1023 px wide it keeps the full size: the question has a row
  of its own there, so the name has the room beside the connection, ALL OFF and the clock.
- How wide: on a monitor, at most 12 times its font size. The default name is 9.2, so it is unchanged. From 701 to
  1023 px, whatever room is left in its row; it never pushes the clock onto another row.
- When a long question squeezes the title bar, the name gives way, as the default name does today: it narrows to its
  longest word and, if that takes more than two lines, ends in "…". Whole again when the question is answered.

### "EBrews - A CraftBeerPi Brewery", size by size

- The brewer's monitor, 1920 px: one line, 23.8 px (the default name is 34 px): EBREWS - A CRAFTBEERPI BREWERY. With the sparge
  question, two lines, whole. With "Ready to boil?", the longest question, "EBREWS - A / CRAFTBEERPI…".
- Half his monitor, 960 px: one line at the full 22 px.
- A phone: 15.4 px. Two lines at 360 and 390 px (EBREWS - A CRAFTBEERPI / BREWERY), one at 430.
- In every one of those moments the title bar is exactly as tall as with the default name. At laptop sizes it grows
  in two moments: at 1366 px "connection lost", and at 1440 px "no target", wrap onto a second line (22 px). This
  name is wider than the default there, and both keep it whole.

### The markup and the rules

```html
<p class="brand"><span class="bname">EBrews - A CraftBeerPi Brewery</span></p>
<!-- over 24 characters: <p class="brand" data-long title="…the whole name…"> -->
```

```css
.brand{…as before…;max-width:12em}
.brand .bname{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:break-word}
.brand[data-long] .bname{font-size:.7em}
/* no .brand .long or .brand .short rules, on the phone either: one span shows the whole name at every width */
@media (min-width:701px) and (max-width:1023px){
  [data-layout=b] .brand{flex:1 1 0;min-width:0;max-width:none}
  [data-layout=b] .brand[data-long] .bname{font-size:1em}
}
/* phone, layout A only (the mockup's; the screen has no layout A): [data-layout=a] .brand{flex:1 1 0;min-width:0} */
```

`overflow-wrap:break-word`, not `anywhere`: `anywhere` would let a long question break the default name inside a word,
where today it gives way at the space. The 701–1023 px rule gives the name only what is left of its row, so it can't
push the clock onto another row as a plain `max-width:none` would.

In `brew-day.js`: `LONG_NAME = 24` and `BREWERY` (trimmed; blank gives "CraftBeerPi"), set once after `TIMERS`. The
screen would set them again when the setting changes, as it does for the timer names (configupdate).

### The page's title

`${name} · Brew day`, where your port says "Brew day · CraftBeerPi". A browser tab shows the start of its title, and
the name is what tells two CraftBeerPis apart: "EBrews - A CraftB…" and "Simulator 8012 ·…" in two tabs (WCAG 2.4.2,
page titled). The mockup adds "(mockup)".

### Moments whose pictures change

- On a monitor and from 701 to 1023 px, with the default name: none. Every moment matches the copy you ported (m71).
- On a phone (700 px and less), with the default name: every moment's name corner. "CRAFTBEERPI / BREWERY" on two
  lines (44 px) where it said "CRAFTBEERPI"; the title bar keeps its height, as ALL OFF's 46 px is taller.
- With `?name=`: whatever name you give. For the brewer's 30-character name,
  `?name=EBrews%20-%20A%20CraftBeerPi%20Brewery&brewscribe=none#mash`. The mockup strip has "Brewery name: default ·
  EBrews · a simulator · 30 characters · 36 characters". "EBrews" is his current 8012 name, "EBrews - Simulator"
  (it was "EBrews" for a while), and the name he used first is "30 characters" (mockup only, hidden by `?bare`; nothing to
  port).

### Changed, all in `proposal\`

- `brew-day.html`: the brand's markup (one span, `.bname`); "Brewery name:" in the mockup strip; the header comment.
- `brew-day.css`: `.brand` (`max-width`), `.brand .bname`, `.brand[data-long] .bname`; the two rules in the 701–1023 px
  block; the phone's `.brand .long` and `.brand .short` rules gone; layout A's phone rule.
- `brew-day.js`: `LONG_NAME`, `BREWERY`, the brand's text, `data-long` and `title`, `document.title`; the strip's
  `data-nm` links in `load`.

### Checked

- Every moment against m71 with the tab row hidden (and the name too on a phone): 1,290 pairs. Layout B with and
  without graphs and layout A at 1920×1080, 1920×950, 1440, 1366, 1024, 1023, 960, 768, 701, 430, 390 and 360 px;
  `?bk=today` and `?timers=today` at the first four and 390. All match, except two specks of 1 and 2 brightness levels
  out of 255 (3×1 px in `#timer-new`, 6×6 px at the recipe panel's corner in `#timer-names`, both at 1920), the same
  on every reload.
- 5,040 loads: every moment at 14 sizes, with the default name, the brewer's, "Simulator 8012", 36 and 52 characters, one
  33-letter word, a blank name, and layout A. No page errors, nothing past the screen's edge, the tab row's height
  unchanged, and the title bar never taller with the default, a simulator's or a blank name.
- Names of 36 characters and more make the title bar taller in a few alarm moments at 1024–1440 px (22 px, the alarm's
  second line), the 52-character one also in "Ready to boil?" at 1920, and the 33-letter word in more, as one word
  can't give way.

### For you to decide, or tell me

1. The phone's default name now takes two lines. I'd keep the name rather than shorten it to "CraftBeerPi": a short
   form hides what tells two CraftBeerPis apart.
2. At laptop sizes a long name keeps its line while an alarm takes a second one. Making the name give way first means
   cutting the 30-character name in moments where it fits whole today. I left it.
3. For the brewer, not the screen: if the rig and the simulators all say "EBrews - A CraftBeerPi Brewery", the title bar
   can't tell them apart. Naming the simulators "Simulator 8000" and "Simulator 8012" would.

### Built (11 Nov, evening)

- Brett built it the same evening: web UI 307014f, build 33ebeb7. His identity test matches with `?name=` on both
  pages: the 30-character name in `#mash`, `#sparge-ready`, `#boil-hold`, `#notarget` and `#offline`, and
  "Simulator 8012", the 36-character name and a blank one in `#mash`, at his five sizes. The page's title is ported
  too. A change in Settings shows at once on open screens.
- He agreed with all three calls above, and leaves the simulators' names to the brewer.
- The brewer has since shortened his 8012 name to "EBrews": one line at full size at every width.
- Looked at on 8012 at 1920, 960 and 390 px, without pressing anything: "EBREWS" at 34, 22 and 22 px, the title bar
  71, 127 and 121 px tall, the page's title "EBrews · Brew day", all as the mockup with `?name=EBrews`.
- Later that night 8012 was renamed "EBrews - Simulator", and it matched the mockup at five sizes (see "Built" under
  the boil kettle's step row, below).

## BREWSCRIBE: a tab that opens BrewScribe in its own browser tab, ready to build (11 Nov, evening)

You asked for a link to BrewScribe for Porter, the BrewScribe agent, on the brew-day screen. The brewer chose a separate
browser tab for now, and you gave the address: `<a href="/brewscribe/#now" target="brewscribe">`. Where it goes was
mine.

### Where: the last tab

- In the tab row, after MORE. The tabs are where the screen's places are. The brewer goes between brew day and BrewScribe
  many times on a brew day, so it shouldn't hide in MORE, and the title bar is for the state of the brew, not for
  places.
- Last, because the first seven are CraftBeerPi's own, in the order the brewer knows, and none of them moves. BrewScribe
  is another program, so it sits at the end.
- On a phone the bar becomes four and four: BrewScribe takes the bottom right, under the thumb, and MORE no longer
  takes two cells. Where BrewScribe isn't installed, MORE takes two cells again (`?brewscribe=none`).

### What it says

- BREWSCRIBE, the program's name, in capitals like the rest, so the tab and the page it opens agree.
- After it, an icon drawn for this: a box with an arrow out of its corner, the usual sign for "opens elsewhere". It
  says so before the press (NN/g on new tabs; W3C technique G201), as Back won't lead back from BrewScribe.
- For screen readers, " (opens in its own tab)". The name read out starts with the word on the tab, so "click
  BrewScribe" works by voice too.
- Where the tab is narrow, the name breaks between Brew and Scribe, and the icon stays with Scribe: "BREW / SCRIBE"
  at 701 px and on 360 and 390 px phones, as "RECIPE / BOOK" already does at 701. Elsewhere, one line.

```html
<a href="/brewscribe/#now" target="brewscribe" data-tab="BrewScribe" class="ext"><span class="lbl">Brew<wbr><span
  class="nw">Scribe<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3
  0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg></span></span><span class="sr"> (opens in its own tab)</span></a>
```

```css
.tabs .ext .nw{white-space:nowrap}
.tabs .ext svg{width:.8em;height:.8em;margin-left:.3em;vertical-align:-.05em;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
/* phone: MORE spans two cells only while it is the last tab, where BrewScribe isn't installed */
.tabs a:nth-child(7):last-child{grid-column:span 2}
```

The mockup's tab has `href="#tab"`, like the others, and its press shows: "Mockup: this opens BrewScribe in a browser
tab of its own, or goes back to that tab if it's open, without reloading it."

### What the link does: tried in Edge

On a throwaway local server (`named_target_probe.py`):
- Two presses with `#now`: one BrewScribe tab, loaded once, and what was typed in it is kept. You're right about `#now`:
  without it the second press reloads BrewScribe.
- Don't add `rel="noopener"`. With it, every press opens another BrewScribe tab.
- If BrewScribe was opened from a bookmark or by typing its address, the first press still opens a second BrewScribe
  tab. BrewScribe naming its own tab "brewscribe" doesn't help: Edge only looks among the tabs this screen opened.
- For Porter: a press while BrewScribe shows another part (another `#…`) takes it to `#now`. When it's already at
  `#now`, the page isn't touched: no reload, and no hashchange.

### Moments whose pictures change

Every moment, in every view, at every size: the tab row only. On a monitor each tab is an eighth of the row instead of
a seventh; at 701–1023 px BREWSCRIBE takes two lines where its tab is narrow; on a phone the bar is four and four. The
row keeps its height everywhere (56 px on a monitor, 97 px on a phone). With `?brewscribe=none`, nothing changes.

### Changed, all in `proposal\`

- `brew-day.html`: the tab, and the header comment.
- `brew-day.css`: `.tabs .ext .nw`, `.tabs .ext svg`, and the phone's `.tabs a:nth-child(7):last-child`.
- `brew-day.js`: the press's message, and `?brewscribe=none`.

### Checked

- The labels at 14 sizes from 360 to 1920 px, with and without BrewScribe: every label inside its tab, the row's height
  unchanged.
- The same 5,040 loads as the name: no page errors, nothing past the screen's edge.

### For you to decide, or tell me

1. Show the tab only where BrewScribe is installed. How the screen tells is yours: the plugin list, or the server
   answering `/brewscribe/`.
2. For the brewer and Porter, not the screen: a browser slows down tabs you aren't looking at, and on a phone it may pause
   them. If the brewer records in BrewScribe on the phone that also shows brew day, a timer or hop alarm may not sound until
   he switches back. The monitor's screen still rings. BrewScribe showing CraftBeerPi's alarms would cover it.
3. The mockup still plays the soft ping. The sounds are the Settings page's (`alarm.js`), so there's nothing to port.

### Built (11 Nov, evening)

- Brett built it the same evening: web UI df5ed6c, build 971d000. Every moment opens with the tab, as in the mockup;
  his identity test also compares the press, and `#mash` and the timers without the tab (`?brewscribe=none`), at
  every size: 451/451.
- Item 1 above, how the screen tells: it asks CraftBeerPi `HEAD /brewscribe/`, and anything but 404 counts as
  installed. Each device remembers the answer, so the tab row doesn't move as the screen opens.
- Item 2, Porter's answer (11 Nov, evening; his newer build, not yet installed): BrewScribe shows CraftBeerPi's waiting
  prompts (hop alerts, timers that run out) on its own alarm line, with their title, message and "Answer in Brew Day
  ↗", and keeps each until it is answered on any screen. A tab the phone paused reconnects when it comes back to the
  front, and CraftBeerPi's snapshot brings the waiting prompts back. So the brewer sees them; BrewScribe plays no sound, and
  Porter left that to him.
- The way back, already done by Porter and you: BrewScribe names its tab "brewscribe" (and an unnamed brew-day tab that
  opened it "craftbeerpi"); the brew-day screen names its own tab "craftbeerpi" (`screen.js`, `createBrewDay`); BREW
  DAY and "Answer in Brew Day ↗" go to the page CraftBeerPi's "/" leads to (its `index_url`) at `#/`, so the brew-day
  tab comes to the front without reloading. A reload would also stop its sound until the next tap.
- Looked at on 8012 at 1920, 960 and 390 px, without pressing anything: BrewScribe is installed there, so eight tabs,
  with `href="/brewscribe/#now"`, `target="brewscribe"` and no `rel`; on a phone four and four, BREW / SCRIBE with the
  icon after Scribe, as the mockup.

## OUT back on the boil kettle's window: ready to build (11 Nov, night)

Passed on by Brett, 11 Nov: "BoilPower's display has lost its current 'out' element power number? Please put it back".
The 10 Nov rule left the boil kettle's window with MODE only while its target was BOIL, and the afternoon's change took
the % off HEATING, so nothing showed what the element was doing.

### What it shows

OUT is the boil element's power now, in every state, as on the HLT: 100 % while it heats to the boil, the boil power
once it boils (45 % in `#boiling`), 0 % while paused, and the hand level in MANUAL (0 % with the element off). The green
BOIL number stays as it is: that is the setting, and OUT is what the element is doing. While it boils steadily both say
45, a setting beside the reading, like the HLT's SV and PV. HEATING keeps no %. In `auxHTML`, the boil kettle's special
case goes:

```js
// this line and its comment come out of auxHTML: OUT shows in every state, so the boil kettle has no MODE-only case
if (bkNew(v) && BK === "power" && bkHoldT() == null) return `<dl class="aux"><dt>MODE</dt><dd>${mode}</dd></dl>`;
```

### Two style changes, so it fits

1. **OUT and MODE keep the room "100 %" takes.** `.aux dd` gets `min-width:2.55em`. "100 %" is 2.548em, the widest
   thing that column holds (HERMS is 2.491em, the span labels are narrower). Without this, the boil kettle's line
   would move about 10 px as the boil starts (100 % to 45 %), and the graph under it would change width with it: at
   960 px it dropped its "14:45" time label. The HLT already did this whenever its power went from two digits to three.
   Now the line stays put, in the same place in all three windows.
2. **The PV never runs into the line.** Narrower than about 1366 px, the small words and gaps stop shrinking at their
   smallest sizes while the windows keep narrowing, so they take the PV's room. At 1180 the boil kettle's "°F" already
   crossed the line before today (by 8 px, with graphs); with OUT back it would cross it by 12 px, and at 900 it would
   touch it. The PV now has a size limit worked out from the window's width, the same for all three windows, so the
   three PVs stay one size:

```css
[data-layout=b] .face .pv{font-size:min(clamp(48px,calc(21 * var(--pu)),110px),calc((100 * var(--pu) - 3 * clamp(10px,calc(4 * var(--pu)),18px) - clamp(10px,calc(3.5 * var(--pu)),16px) - 2.55 * clamp(20px,calc(6.6 * var(--pu)),32px) - 1.89 * clamp(15px,calc(5 * var(--pu)),22px) - 9px) / 2.47))}
```

   A window is 100 `--pu` wide. From that come: the window's side padding and the gap after the label (the `3 *` term;
   all three are `clamp(10px,4pu,18px)`), OUT/MODE's padding (`.aux` padding-left), "100 %" (2.55 × the `.aux dd`
   font), the widest label, BOIL (1.89 × the `.pvsv dt` font), and 9 px: the window's two borders, the line itself,
   and 6 px kept clear of it. What's left is for the PV, which is 2.47em wide ("212.0°F"). If any of those sizes
   differ in your copy, the formula follows them.

The PV changes size only where it had to:

| Width | PV before | PV now |
|---|---|---|
| 1180 | 48 px | 40.6 px |
| 1280 | 55 px | 53.5 px |
| 900 | 53.1 px | 50.2 px |
| 1920, 1440, 1366, 1024, 960, 768, 701, phones | unchanged | unchanged |

### Moments whose pictures change

- **The boil kettle's window, in every moment but `#hold` and `#handhold`**, whose OUT was already there: OUT and its bar
  appear above MODE.
- **All three windows, in every moment, at every size:** where OUT/MODE was narrower than "100 %" (the mash tun's "– –"
  with AUTO or MAN, the HLT's "0 %" with MAN, and so on), the line moves left to where "100 %" needs it and the graph
  under it narrows to match. The PV and SV don't move.
- **The PV at 1180, 1280 and 900**, in all three windows (the table above).
- **Phones:** the boil kettle's plate is 10 px taller in the moments that lacked OUT, now as tall as the HLT's, so the
  page is 9-11 px longer.
- `?bk=today` changes with the column and the PV limit. Layout A doesn't change.

### Changed, all in `proposal\`

- `brew-day.js`: `auxHTML` (the special case and its comment out; a new comment says what OUT and the green BOIL number each show).
- `brew-day.css`: `.aux dd` (`min-width:2.55em`) and `[data-layout=b] .face .pv`, each with a comment.

### Checked

- OUT in all 30 moments at 1920: 100 % in `#heatup`; 45 % in `#hop`, `#boilpower`, `#boiling` and `#bktarget`; 2 % in
  `#keepboil` and `#letfall`; 35 % in `#hold`; 0 % paused (`#pause`, `#pause-long`), in `#handhold` and in every MANUAL
  moment, whose element is off.
- At 14 sizes from 360 to 1920, with and without graphs, in every moment, all three windows: the PV at least 6 px clear
  of the line (before today: −8 px at 1180 with graphs; with OUT back and no limit: −12 px), and nothing else in the
  window clipped, wrapped or past its edge. At 900-1280 the PV runs up to 4 px into the 10 px gap in front of the
  line, as intended.
- Every moment before and after at those 14 sizes, with and without graphs, plus `?bk=today`, layout A and
  `?timers=today`: every changed pixel is inside the three windows, apart from the phones' 10 px. Twelve differences
  elsewhere (the step list's scroll, and layout A's drawing) were gone on three reloads each. No page errors.

### Found while checking: the boil kettle's step row on narrow windows

The row −5 % −1 % HEATING +1 % +5 % kept each step at least 44 px wide, so the element got what was left. It's fixed
in the next section.

### Built (11 Nov, night)

- Brett built it the same night (DEFECTS M76; web UI 9c550bd, build 152bfa7), live on 8012. The special case is gone
  from `auxHTML`, and both CSS rules came over as written, through his scoped stylesheet. His sizes match the
  mockup's, so the PV formula stands unchanged. Identity 451/451 on every moment, size and graphs setting.
- His live boil power test now reads OUT on both pages: 30 % at the boil power, 25 % after −5, 0 % paused (BOIL still
  40), 40 % heating again, 0 % in MANUAL with the element off, and 40 % back in AUTO: 92/92. The build before fails
  exactly those six checks.
- Also in that build, for the event line (a live page only, so nothing in the mockup): a fresh page now logs
  "Connected to CraftBeerPi" when the newest kept line is "Connection to CraftBeerPi lost". Before, it did that only
  when nothing was kept, so the brewer's Edge tab said "lost · trying again" while connected: the page it replaced had
  logged the loss as it closed, and nothing followed it.

## The boil kettle's step row on narrow windows: ready to build (11 Nov, night)

Found while checking OUT. The ±1 % hand-off's checks covered 1920, 1440, 1366 and the phone only. Narrower, the row
kept each step at least 44 px wide, so the element button got what was left. It needs about 73 px for HEATING:

| Width | Element before | Steps before | Element now | Steps now |
|---|---|---|---|---|
| 1280 | 62 px, HEATING clipped | 44 px | 79 px | 40 px |
| 1180 | 29 px, "ATI" | 44 px | 76 px | 32 px |
| 960 | 73 px, 1 px over | 44 px | 83 px | 41 px |
| 900 | 53 px, "HEATIN" | 44 px | 76 px | 38 px |
| 1920, 1440, 1366, 1024, 768, 701, phones | unchanged | unchanged | unchanged | unchanged |

So where the window was narrow, the boil-over button was the smallest in the row, not the biggest. At 1180 a pause
also wrapped "hold to heat" onto three lines, so the shared button row grew 15 px and every plate's AUTO / MANUAL /
TARGET row moved down as the heat paused.

### The rule now

- The element is the boil-over button, so it stays the biggest: twice a step, and never narrower than HEATING needs
  (3.45 times its state word's size, plus 12 px padding and 2 px border).
- The steps share the rest. Where the row has room, that's 44 px or more, as before. On the narrowest windows (1180,
  1280 and 900 px) the steps get narrower instead of the element: 32 px at 1180, still the row's full 71 px height,
  above WCAG 2.5.8's 24 px. A slip there costs a step of the boil power or a pause that a held press undoes, while a
  boil-over needs the element at once.
- There "−5 %" (about 39 px with padding) no longer fits, so the steps read −5 −1 +1 +5, as the power box's steps do.
  Their spoken names still say "percent" (`aria-label`, unchanged).
- The element's small line may take two lines ("tap to / pause"), never three, and the row keeps its height in every
  state.

```css
.ctrls.bkpow{grid-template-columns:repeat(2,minmax(0,1fr)) minmax(calc(3.45 * clamp(18px,calc(6.4 * var(--pu)),24px) + 14px),2fr) repeat(2,minmax(0,1fr));column-gap:6px}
/* a step's " %": there while the window is at least 270 px wide (100 --pu), where "−5 %" fits; gone below that */
.nudge .pc{font-size:clamp(0px,calc((100 * var(--pu) - 270px) * 99),1em)}
```

The `clamp(18px,…,24px)` is the lamp's `.st` font. In `nudgeHTML` the " %" gets its own span:

```js
`${d < 0 ? "−" : "+"}${Math.abs(d)}<span class="pc"> %</span>`
```

The 270 px threshold falls between 1280's 262 px window, where "−5 %" would have 0.4 px to spare, and 960's 273 px,
where it has 2 px. So the " %" goes at exactly the three widths where the PV is also limited.

### Moments whose pictures change

- **The boil kettle's step row, in the seven moments that show it** (`#hop`, `#heatup`, `#boiling`, `#pause`,
  `#keepboil`, `#letfall`, `#pause-long`), at 1280, 1180, 960 and 900 px, with and without graphs. At 1024 the " %"
  span moves the ±1 labels by 0.02 px, which changes only the smoothing of their edges.
- **All three plates at 1180 in `#pause` and `#pause-long`:** 15 px shorter than before, as tall as in the other
  moments, so everything under the step row moves back up.
- Layout A changes the same way at 1180. `?bk=today` (no steps) doesn't change.

### Changed, all in `proposal\`

- `brew-day.css`: `.ctrls.bkpow` (the columns) and the new `.nudge .pc`, with the comment above them.
- `brew-day.js`: `nudgeHTML`'s label and its comment.

### Checked

- At 14 sizes from 360 to 1920 px, in layout B with and without graphs and in layout A, in seven states (heating,
  paused, pausing, carrying on, off, a step waiting, MANUAL): HEATING and PAUSED on one line, the small line on two at
  most, no step's label spilling or wrapping, the element at least twice a step, and the row never taller than
  before. Within a moment, the row and the AUTO / MANUAL / TARGET rows never move from one state to another; before,
  pausing at 1180 moved them 15 px.
- Every moment before and after at the same 14 sizes, plus `?bk=today`, layout A and `?timers=today`: the changes above
  and nothing else. Sixteen other differences (the step list's scroll, layout A's drawing, a 3 × 4 px speck at 1440 and
  a 3 px line along the drawing's foot at 1180) were each gone on reload. No page errors.

### Built (11 Nov, night)

- Brett built it the same night (DEFECTS M77; web UI ffd9660, build 388b916), live on 8012. Identity 451/451.
- 1180 px isn't one of his identity sizes, so he added a live check there to his boil power test: HEATING and PAUSED
  fit, the element is at least twice a step, every step is 24 px or more, the " %" is gone while the spoken names
  still say "percent", and pausing doesn't move the AUTO / MANUAL row. 95/95. The build before fails those three
  checks with the numbers above: the element 29 px, the steps 44, and the row moving 15 px (564 to 579) as the heat
  paused.
- Looked at on 8012 at 1920, 1180 and 390 px, without pressing anything. Its boil kettle was cold and in MANUAL, so
  the window read OUT 0 % and MODE MAN, with the PV at 40.6 px at 1180, as in the mockup. The step row shows only
  while AUTO boils, so it couldn't be seen there without pressing something; Brett's live check covers it.
- 8012 has been renamed "EBrews - Simulator" (18 characters). Live and mockup (`?name=EBrews%20-%20Simulator`)
  agree at 1920, 1180, 960, 390 and 360 px: the same size, the same number of lines and the same title bar height.
  One whole line on a monitor; two whole lines, "EBREWS - / SIMULATOR", on a 360 px phone.

## SOUND switches on silently: ready to build (12 Nov)

On 12 Nov at 08:10 the brewer wrote: "I don't want to hear a sound when I click the "SOUND" box for the timer. ONly when timer
expires". I asked whether a new hop alert, question or error should keep its two beeps; he chose "Keep the two beeps
for hop alerts, questions and errors (Recommended)". So only the press on SOUND changes.

### What it does now

- **A press on SOUND makes no sound.** That's switching it on, and the press that allows it while it says "SOUND · TAP
  TO ALLOW". Switching it off was already silent.
- **Sound comes only when something needs him**, as before:
  - a timer that has run out: the whole burst every 3 s until OK or +5 MIN;
  - a new prompt, warning or error in the title bar: its first two pulses, once.
- **The lit box says it's on**, and the amber "SOUND · TAP TO ALLOW" turns into "SOUND" once the browser allows it.
  To hear the sound on purpose, Settings has Try ("plays it here") beside BREWDAY_ALARM_SOUND.
- If a timer has already run out when he switches SOUND on, he hears its alarm at its next 3-second beat. That's the
  timer's alarm, not the press.

Why: on a control panel a sound should mean "come and look". If the alarm also plays when he presses a switch, it
starts to mean less (`interaction-design`: keep a normal screen quiet; needless sounds teach people to ignore alarms).
A test sound belongs on a control made for it, which is what Settings' Try is.

### One thing the beep was doing

Some browsers, Safari on an iPhone in particular, let a page play sound later only if a sound has started inside a
press; `resume()` alone hasn't always been enough. The beep on SOUND did that. Now `audioOK()` starts a silent
one-sample sound inside the press instead. `audioOK()` is called from SOUND's press and from the first tap anywhere
(`unlockSound`), so both get it.

### In `screen.js`

```js
function audioOK() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    /* a silent one-sample sound, started inside the press. Some browsers, Safari on an iPhone in particular, let a
       page play sound later only once a sound has started inside a press, not just on resume(). A press on SOUND
       makes no sound, so this one is silent */
    const z = actx.createBufferSource(); z.buffer = actx.createBuffer(1, 1, 22050); z.connect(actx.destination); z.start(0);
    return true;
  } catch (_) { return false; }
}
```

In `cmdSnd()`, take `ring()` out of both places, and the comments that say the alarm plays:

```js
  if (s.on && !s.ok) { s.ok = audioOK(); return renderAll(); }
  ...
  if (s.on) s.ok = audioOK();
```

My comment above `cmdSnd()` in the mockup says when the screen makes a sound, if you want it. The title bar's `ring(2)` (about line 746)
and the run-out timer's `ring()` stay as they are.

In `alarm.js`'s header, "switching SOUND on plays the whole burst, so it is heard as it will be" is no longer true.
Something like: "switching SOUND on is silent; Settings' Try plays the sound on purpose."

Not mine, for you or the Settings agent: BREWDAY_ALARM_SOUND's help (`catalog.js:51`) says only "What the brew-day
screen plays when a timer runs out, every 3 seconds until you answer it." A new hop alert, question or error also
plays its first two pulses.

### Moments whose pictures change

None. It's sound only.

### Changed, all in `proposal\`

- `brew-day.js`: `audioOK()` (the silent sound and its comment), `cmdSnd()` (no `ring(2)`; a comment on when the
  screen makes a sound), and the comment above `audioOK()` (the mockup plays the Soft ping; the screen plays the Settings choice).

### Checked

Beeps counted as the sound's oscillators start, and the silent sound as its buffer starts, before and after:

| What | Before | After |
|---|---|---|
| SOUND off, a press switches it on (`#timers`) | 2 beeps | 0 beeps, 1 silent |
| Then a hop alert arrives | 2 beeps | 2 beeps |
| TAP TO ALLOW, a press on SOUND (`#sound-allow`) | 2 beeps | 0 beeps, 1 silent |
| The next press switches it off | 0 | 0 |
| TAP TO ALLOW, Space on SOUND | 2 beeps | 0 beeps, 1 silent |
| TAP TO ALLOW, a tap elsewhere, then a hop alert | 0, then 2 | 0 (1 silent), then 2 |
| A timer has run out (`#timer-done`), a press switches SOUND on, 4 s later | 2, then 6 more | 0, then 6 |

- Pictures before and after at 1920×950, 1180×820 and 390×844: `#timers` after 0, 1 and 2 presses on SOUND,
  `#sound-allow` after 0 and 1, `#timer-done` after 2. All identical. No page errors.

### Built (12 Nov, morning)

- Brett built it the same morning (web UI ab17060, build d55d3c0), live on 8012: `cmdSnd()` and `audioOK()` as above,
  with the mockup's comment above `cmdSnd()`, and `alarm.js`'s header changed. He also changed the core's description of
  BREWDAY_ALARM_SOUND, which said switching SOUND on plays it (core aff4684).
- Checks: identity 451/451, so no picture changes. His alarm sound test went from 22 to 32 checks, all passing: a
  press on SOUND plays nothing and starts the one silent sound; a real warning from CraftBeerPi (the interlock refusing
  a second heating element) plays each of the four sounds' first two pulses; a run-out timer still plays its whole
  burst every 3 s; with TAP TO ALLOW, a press on SOUND or a tap elsewhere is silent and the next warning is heard. The
  build before fails exactly the five silent-press checks. Timers 56/56, brew day 99/99.

## The wort pump after the boil, with the chiller: ready to build (12 Nov)

On 12 Nov the brewer asked: "whirlpool / hop-stand step pump symbol shows it going through the HERMS coil. What are some
alternatives?", then "I don't want the symbols to become too chaotic. Maybe another representation of the wort pump
instead of trying to connect the pipe/valves over there from where it currently is?" I showed him three options
(`whirlpool.html`), and he chose "2. The pump moves, with the chiller drawn on its loop". This answers the second open
question below ("After the boil").

### What the drawing shows

From the moment the boil starts (its step running, stopped, failed or done, not held for "Ready to boil?"). That's when
CraftBeerPi switches the wort pump off and says "The wort pump is off, so you can move its hoses". Before it, nothing
changes.

- **The wort pump is drawn under the boil kettle**, on a short loop: out of the kettle's bottom, through the pump,
  left through a CHILLER box, then up into the kettle's top through the runoff's own riser and inlet. Only the stub
  out of the kettle and the run from the pump to the riser are new; from the pump's row up, the loop is drawn over
  the runoff's line.
- **Its labels go beside it** (WORT PUMP, then RUNNING or OFF), since the valve note already has the space under the
  kettle.
- **The CHILLER box** has the vessels' fill, a 2.5 px outline like a valve's, and its name inside. It is never lit
  itself, because CraftBeerPi can't see the chiller's water. The pipe through it lights as every pipe does.
- **The pump's old place by the mash tun is left empty**, as its hoses are. Nothing on the mash tun's side lights:
  not the coil, its line, the line to the boil kettle, or their valves.
- **The valves are drawn as before** ("SHOWN FOR RECIRCULATING"), so a running HLT pump, which is also the HLT's
  stirrer, still goes round the hot liquor tank. (The options in `whirlpool.html` kept every valve as the sparge left
  them; I dropped that, as it would send a stirring HLT pump's water over to the mash tun.)
- **While the pump runs**, the loop is wort gold with the flowing dashes and arrow-heads. While it's off, or the
  connection is lost, the loop is grey and the pump says OFF or "LAST: RUNNING", as the other pumps do.

### In `rig.js`

`rigGeom`: two more positions, under the boil kettle.

```js
    bkPump: k - 10, bkOut: k + 34};
```

`rigPump`: a seventh argument, `lx`, to put the labels beside the pump instead of under it.

```js
function rigPump(id, x, y, med, name, rs = 1, lx = 0) {
  const y1 = lx ? r1(-3 - 9 * (rs - 1)) : r1(68 - 33 * (rs - 1)), y2 = r1(y1 + 22 * rs), y3 = r1(y2 + 22 * rs), tx = lx ? r1(lx) : -24;
  ...the three texts take x="${tx}" instead of x="-24"
```

`rigSVG`, layout B only (not `A`): the loop, the chiller and the second place for the pump.

```js
  const bp = g.bkPump, bo = g.bkOut, oY = S.outY(bo - k), cx = (bp - 22 + g.xferRiser) / 2, cs = Math.min(rs, 1.15), cw = 64 * cs + 20, chh = 30 * cs;
  const loop = [`M${n(bo)} ${n(oY)} V${yPump} H${n(bp + 22)}`, `M${n(bp - 22)} ${yPump} H${n(g.xferRiser)} V${yTop} H${n(g.bkRet)} V${n(bRet)}`];
  const chL = [[bo, (oY + yPump) / 2, 90], [(bp - 22 + cx + cw / 2) / 2, yPump, 180], [g.xferRiser, (yTop + yPump) / 2, -90], [(g.xferRiser + g.bkRet) / 2, yTop, 0]];
  const whirl = A ? "" : rigLine("ln-bk-loop", "wrt", loop, chL)
    + `<g class="chiller" id="chiller"><rect x="${n(cx - cw / 2)}" y="${n(yPump - chh / 2)}" width="${n(cw)}" height="${n(chh)}" rx="3"/><text x="${n(cx)}" y="${n(yPump + 6.5 * cs)}">CHILLER</text></g>`;
  const bkPumpSVG = A ? "" : rigPump("wort-bk", bp, yPump, "wrt", "WORT PUMP", rs, bo - bp + 16);
```

`${whirl}` goes straight after `ln-wort-out`'s line (so the loop is drawn over the runoff's riser, and the chiller
over the loop), and `${bkPumpSVG}` straight after the two pumps. In the mockup they sit behind a fourth argument,
`wpo`, for the options the brewer didn't take; the screen needs only the chiller's.

### In `screen.js`

Beside `runoffStep()`:

```js
/* the boil has started (its step running, stopped, failed or done; held for "Ready to boil?" it is still I). From then
   on the wort pump's hoses are on the boil kettle: the brewer moves them in that hold, as CraftBeerPi's notification
   says ("The wort pump is off, so you can move its hoses") */
function boilStarted() {
  const bo = M.RECIPE.steps.findIndex(s => s.boil);
  return !!st.recipe && bo >= 0 && stepStatus(bo) !== "I";
}
```

`renderRig`:

```js
  [["hlt", "hltPump"], ["wort", "wortPump"], ["wort-bk", "wortPump"]].forEach(([id, k]) => {
    const p = a[k], word = $(`#pump-${id} .p-st`);
    if (!word) return;
    ...as now, with word for the state
  });
  ...
  const out = ro >= 0 && !held, sp = out && hasSp, post = boilStarted();
  const wp = live && a.wortPump.on, hp = live && a.hltPump.on, mtw = wp && !post;
  on("#ln-wort-in", mtw); on("#ln-wort-out", mtw); on("#ln-wort-coil", mtw && !out); on("#ln-xfer", mtw && out); on("#coil", mtw && !out);
  on("#ln-bk-loop", wp && post);
  ["#pump-wort-bk", "#ln-bk-loop", "#chiller"].forEach(s => { const n = $(s); if (n) n.classList.toggle("gone", !post); });
  $("#pump-wort").classList.toggle("gone", post && !!$("#pump-wort-bk"));
  ...the HLT lines as now
  setValve("coil", !out, mtw, setNow); setValve("bk", out, mtw, setNow); ...ret and sp as now
  ...
  setText($("#rig-d"), rigDesc(ro, held, setNow, post));
```

`rigDesc(ro, held, setNow, post)`, first:

```js
  if (post) return head + "The boil has started, so the wort pump's hoses are on the boil kettle. The wort pump is drawn under the boil kettle: it takes wort from the bottom of the kettle and sends it through the chiller and back in at the top. The mash tun and the HERMS coil are out of use. The HLT pump circulates hot water around the hot liquor tank. The valves are set by hand and CraftBeerPi can't see them: they are shown for recirculating.";
```

### In the stylesheet

```css
.rig-line .gone{display:none}
.rig-line .chiller rect{fill:#1b2833;stroke:#b9c6d2;stroke-width:2.5}
.rig-line .chiller text{font:600 18px var(--cond);letter-spacing:.06em;fill:#c3cfda;text-anchor:middle}
/* the chiller's word sits in its box: it grows no more than the vessels' names do */
[data-graphs=face] .rig-line .chiller text{font-size:calc(18px * min(var(--rs,1),1.15))}
```

(`#ln-swirl` and its two rules are only for an option the brewer didn't take.)

### Moments whose pictures change

- **The drawing only, on a monitor and at half of it**, in the nine moments after the boil starts: `#hop`,
  `#boilpower`, `#heatup`, `#boiling`, `#pause`, `#pause-long`, `#hold`, `#keepboil` and `#letfall`. The pump is under
  the boil kettle with its chiller loop, OFF in all of them.
- **New: `#whirlpool`**, the whirlpool hold (`#hold`) with the wort pump running, as the brewer whirlpools: the loop lit.
  It's the moment his question was about; a `?demo=whirlpool` for your identity test, if you'd like one.
- **Nothing on a phone** (the phone has no drawing) and nothing before the boil, `#boil-hold` included.

### What it doesn't do

- **The WORT PUMP button stays on the mash tun's panel**, where its HERMS logic is, while the drawing shows the pump
  at the boil kettle. Both say WORT PUMP. Moving the button between panels would be a much bigger change, and the brewer
  hasn't asked for it.
- **With no recipe loaded** (brewing by hand), the screen can't tell the boil has happened, so the drawing shows
  recirculating, as now. (After a recipe finishes, the pump now stays at the boil kettle: see "After the recipe
  finishes" below.)
- **The transfer to the fermenter** isn't drawn.

### Changed, all in `proposal\`

- `rig.js`: `rigGeom` (`bkPump`, `bkOut`), `rigPump` (`lx`), `rigSVG` (the option `wpo`; the loop, the chiller, the
  second place for the pump; and the options not taken).
- `brew-day.js`: `WP` (default `chill`; `?wp=today` is the drawing as built before; `move` and `swirl` are the options
  not taken), `boilStarted()`, `rigDesc`, `renderRig`, `drawRig`, the `#whirlpool` moment, the strip's `data-wp`
  links, and `reportFocus` (`?focus=rig`, for `whirlpool.html` only; don't port it).
- `brew-day.css`: `.gone`, `.chiller`, `#ln-swirl`.
- `brew-day.html`: the strip and the header comment.
- New: `whirlpool.html`, now a record of the choice.

### Checked

- **The drawing as built before** (`?wp=today`) against the mockup before this change: all 30 moments at 1920×950,
  960×1200 and 390×844, 90 of 90 identical.
- **The new default** against the mockup before: 72 identical, and 18 differ only inside the drawing. Those 18 are the
  nine moments after the boil, on a monitor and at half of it. The phone is identical in every moment.
- **Fit**, at 11 sizes from 701 to 1920 px wide, in eight moments after the boil (`#whirlpool`, `#hold`, `#boiling`,
  `#hop`, `#heatup`, `#pause`, `#keepboil`, `#boilpower`): no word touches another word, a pump, a valve, a pipe or a
  vessel's outline, except CHILLER over the loop that runs behind its box. The pump's labels keep 14 px or more from
  the drawing's edge (701 px), and the CHILLER box 7 px or more from the pump, except in `#boilpower` on a monitor
  (4 px), where the open editor squeezes the whole drawing into a thin strip, as it does today. Below 701 px the screen
  shows no drawing.
- **Pressed through:** in `#hold`, WORT PUMP on lights the loop and says RUNNING at the boil kettle; off again greys it.
  Losing the connection in `#whirlpool` greys the loop and says "LAST: RUNNING". A recipe stopped mid-boil keeps the
  pump at the kettle. With no recipe, and in `#boil-hold` and `#mash`, the drawing is as now. No page errors.
- **Found and fixed while checking:** the first swirl (option 3) was a closed ring that could pass for a chiller coil in
  the kettle; option 3's "→ BOIL KETTLE" on its own line sat on the runoff's pipe; the CHILLER box was tight round its
  word on big screens; and the valves rule above.

### Built (12 Nov, morning)

Brett built it and put it live on 8012: UI e2c2d43, build 97aebf9 (main.3af9a77b.js). `rig.js` is the mockup's, with
his header and export; the screen draws `?wp=chill`; `boilStarted()`, `renderRig` and `rigDesc` are as above; the CSS
came through scope-css; the `#whirlpool` moment is `?demo=whirlpool`. design/brewday was synced as of 09:50, with
`whirlpool.html`.

- `test_ui_brewday_identity`: 461 of 461 (was 451), with `#whirlpool` at every size, with and without graphs.
- `test_e2e_recipe_pumps`: 62 of 62, Test Recipe v5 run live. The pump stays by the mash tun through "Ready to boil?",
  draining it. From the boil's start it's at the boil kettle with the chiller, OFF. In the whirlpool, switched on, only
  `ln-bk-loop` lights, and it says RUNNING at the kettle; off again, it's grey. The build before fails the five checks
  after the boil.
- `test_e2e_sparge_step` 110 of 110, `test_e2e_brewday` 99 of 99.
- He found a gap: once the recipe finished, the live screen had no recipe, so the pump went back by the mash tun. The
  next section deals with it.

## After the recipe finishes: the pump stays at the boil kettle, ready to build (12 Nov)

Brett found this while building the chiller loop. When the recipe's last step finishes, the screen has no recipe
(`liveRecipe` returns null once every step is done), so `boilStarted()` was false and the drawing put the wort pump
back by the mash tun. That is just when the brewer chills the wort and sends it to the fermenter, so running the wort pump
lit the HERMS coil again, which is what he asked about this morning.

I asked the brewer whether to keep the pump at the boil kettle until he loads or resets a recipe, or switches the mash
tun's AUTO on. He chose: "Yes, keep it at the kettle until then".

### The rule

The wort pump is drawn at the boil kettle while both of these are true:

- **The loaded recipe's boil step has started**: running, stopped, failed or done. CraftBeerPi keeps a finished
  recipe's steps, all done, until a recipe is loaded, reset or cleared (`StepController`: `load_recipe`, `reset_all`,
  `clear`). Then the boil step is waiting again, or there are no steps. It's CraftBeerPi's own state, so every screen
  agrees and a reload changes nothing.
- **The mash tun's AUTO is off.** While it's on, its HERMS runs the wort pump through the coil, which only makes sense
  with the hoses back on the mash tun. `#notarget` is that case, from the brewer's test on 8012 on 10 Nov: the recipe had
  finished and he held the mash tun's AUTO. Its drawing shows recirculating, as now.

Otherwise the pump is drawn by the mash tun, as before.

What the brewer accepted, which I told him before he chose: if he later brews by hand without loading or resetting a recipe,
and runs the wort pump himself with the mash tun in MANUAL, the drawing still shows the pump at the boil kettle. The
same goes for pumping cleaner through the HERMS coil after a brew. The mash tun's AUTO covers the usual case, mashing.

### In `screen.js`

`boilStarted()` no longer needs a recipe running. Live, `M.RECIPE.steps` keeps CraftBeerPi's statuses
(`stepModel`'s `status`) after the recipe finishes, so the boil step reads D:

```js
/* the boil has started (its step running, stopped, failed or done; held for "Ready to boil?" it is still I). From then
   on the wort pump's hoses are on the boil kettle: the brewer moves them in that hold, as CraftBeerPi's notification
   says ("The wort pump is off, so you can move its hoses"). After the recipe finishes its steps are all D, so the
   hoses stay there for the chill and the transfer, until a recipe is loaded or reset and its boil is I again */
function boilStarted() {
  const bo = M.RECIPE.steps.findIndex(s => s.boil);
  return bo >= 0 && stepStatus(bo) !== "I";
}
```

**`stepStatus(i)` needs a guard first.** Your demo's steps have no status of their own, so it reads `st.recipe.cur`,
and `boilStarted()` now calls it in moments with no recipe (`#manual`, `#handhold`, `#timers-hand` and the rest).
Without the guard those moments throw. Live, every step has CraftBeerPi's status, so the guard is never reached:

```js
function stepStatus(i) {
  const r = st.recipe, s = M.RECIPE.steps[i];
  if (s && s.status) return s.status;
  if (!r) return st.finished ? "D" : "I";
  return i < r.cur ? "D" : i > r.cur ? "I" : r.state === "running" ? "A" : r.state === "stopped" ? "S" : "I";
}
```

`finished` is a demo moment's flag: no recipe running, but CraftBeerPi still has the finished one's steps, all done.

`renderRig`, the end of the comment and `post`:

```js
  /* ...still goes round the hot liquor tank. While the mash tun's AUTO is on, its HERMS runs the wort pump through the
     coil, so the hoses are back on the mash tun (#notarget). After the boil, the pump stays at the boil kettle until a
     recipe is loaded or reset, or the mash tun's AUTO is on */
  const post = LAYOUT === "b" && boilStarted() && st.v.mt.mode !== "auto";
```

`rigDesc(ro, held, setNow, post)`: with no recipe running, the boil can only have started if the recipe has finished,
so the first sentence says that instead:

```js
  if (post) return head + (st.recipe ? "The boil has started, so the wort pump's hoses are on the boil kettle. " : "The recipe has finished, and the wort pump's hoses are still on the boil kettle, where they went for the boil. ")
    + "The wort pump is drawn under the boil kettle: ...as now";
```

### In your demo

- **A new moment, `#finished`** (strip: "Recipe finished, chilling"), after `#whirlpool`. It's the `#whirlpool` day at
  17:41:30. The stand ended at 17:28:10 and switched the boil kettle off, the brewer answered Brewing Complete, and the wort
  pump runs on through the chiller. The boil kettle is down to 88.4 °F. The scene is in the mockup's `brew-day.js`,
  after `whirlpool`. A `?demo=finished` for your identity test, if you'd like one.
- **`finished: true` on `#notarget`.** It looks the same, since its mash tun is in AUTO. But pressing MANUAL there now
  puts the pump at the boil kettle, as live would.
- **LOAD clears it**: the mockup's `cmdLoad` sets `st.finished = false` beside `st.recipe`. In the demo `st.recipe`
  wins anyway; it's only tidiness.
- **The graph history** (`gDemo` in the mockup's `graphs.js`): `finished` goes with `boiling` and `hold`. The boil
  kettle holds 170 °F until 17:28:10 and is chilled to 88.4 °F by 17:41:30. Its SV line and the hold end at 17:28:10,
  and its OUT is 0 from then on. The HLT and the mash tun cool a little. `hold`'s history is unchanged.

### The events in `#finished`

These are the lines the built screen would log, as far as I can tell from `observe()` and the core, oldest first:

- 17:28:10 "Whirlpool finished", by recipe.
- 17:28:10 "Whirlpool: Stand over: Boil Kettle is off and no longer holding 170 °F.", from CraftBeerPi
  (`WhirlpoolStep._end_hold`).
- 17:28:10 "Recipe finished", by recipe.
- 17:28:10 "Brewing Complete: Now the yeast will take over", answered (the notification with OK in
  `StepController.start`).
- 17:28:52 "Brewing Complete answered: OK", confirmed.

If any of these isn't what the screen logs, tell me and I'll match the screen.

Brett's live run on 12 Nov found two differences: the stand's notice comes first, and Brewing Complete's line stays
"waiting for you". Both are settled in the next section, with the corrected list.

### Moments whose pictures change

- **None of the old ones.**
- **New: `#finished`.** On a monitor and at half of it, the drawing shows the pump at the boil kettle, RUNNING, with
  the loop lit through the chiller. The recipe column is "No recipe running" with the Recipe Book, as live. A phone has
  no drawing.

### What it still doesn't do

- **The transfer to the fermenter** isn't drawn: the loop goes back into the kettle's top. CraftBeerPi can't see where
  the hose goes.
- **An old finished recipe left loaded** keeps the pump at the boil kettle until a recipe is loaded or reset, or the
  mash tun's AUTO comes on. The brewer accepted this (above).

### Changed, all in `proposal\`

- `brew-day.js`: `stepStatus` (no recipe: `st.finished`), `boilStarted` (no recipe needed), `renderRig` (`post` needs
  the mash tun's AUTO off), `rigDesc` (the finished sentence), `cmdLoad` (clears `finished`), the `#finished` moment,
  and `finished: true` on `#notarget`.
- `graphs.js`: `gDemo` gives `finished` the hold's history, carried on into the chill.
- `brew-day.html`: the strip's "Recipe finished, chilling" and the header comment.
- `whirlpool.html`: a "Recipe finished, chilling" moment, so the record of the choice shows it. Nothing to port.

### Checked

- **The 31 old moments, before and after**, at 1920×950, 960×1200 and 390×844, with graphs and without, and at
  1920×950 with `?bk=today`, `?layout=a`, `?wp=today` and `?timers=today`: 310 of 310 identical.
- **Fit**, at the 11 sizes from 701 to 1920 px wide: `#finished`'s drawing has the same result as `#whirlpool`'s. No
  word touches another word, a pump, a valve, a pipe or a vessel's outline, except CHILLER over the loop behind its
  box. The pump's labels keep 14 px or more from the drawing's edge, and the CHILLER box 7 px or more from the pump.
- **The page**, at 14 sizes from 1920 to 360 px wide, with graphs and without: nothing is wider than the window,
  nothing is cut off except the screen-reader text and the title bar's "Connected" on a phone (hidden on purpose, as in
  every moment), and there are no page errors.
- **Pressed through:**
  - In `#finished`, a tap on WORT PUMP turns it OFF at the kettle and greys the loop; a second tap starts it again.
  - Holding the mash tun's AUTO brings the pump back by the mash tun, recirculating through the coil. MANUAL puts it at
    the kettle again, OFF, because the HERMS switched it off.
  - LOAD on Test Recipe v5 puts it by the mash tun.
  - In `#notarget`, MANUAL puts it at the kettle, OFF.
  - `#whirlpool` is at the kettle; `#boil-hold`, `#notarget-hlt` and `#manual` are by the mash tun, as before.
  - `?wp=today#finished` shows the problem as built: the pump by the mash tun, with the HERMS coil lit.

## A question's line turns "answered": ready to build (12 Nov, afternoon)

Brett ran `#finished` against the live screen (UI f76694c) and found two differences:

1. **A question's line stays "waiting for you"**, in amber, after it's answered. The screen never changes a line once
   it's logged; the answer adds a line of its own. My moments show such lines as "answered": the malt, the hop alert,
   "Ready to boil?", the sparge water, the stand's "Heat and hold?" and Brewing Complete.
2. **The stand's "Stand over" notice comes before "Whirlpool finished".** CraftBeerPi sends it as the stand stops,
   before it marks the step done, and the screen logs CraftBeerPi's notices before the steps' changes in each update.

He also read `#hold`'s question and answer from the code, and asked me to choose for 1: moments that say "waiting for
you", or a line that changes once its question is answered.

### The choice: the question's own line changes

A question's line says "waiting for you", in Prompt Amber, only while CraftBeerPi waits for its answer. When the
question goes, that same line changes where it is:

- **"answered"**, when someone answers it, on this screen or another one. For the hold before the boil, this screen's
  START counts too. The question offers Start as an answer ("…until you press Start the boil, or Start on the Brew
  Steps page"), but CraftBeerPi takes it down as "withdrawn" when the boil is started that way.
- **"no longer needed"**, when CraftBeerPi takes it down unanswered: its step ends, or Stop, NEXT STEP or a reset.
- **"no longer waiting"**, on a page opened later, for a line kept from before whose question CraftBeerPi no longer
  has. That page can't tell which of the other two happened.

The line keeps the time it was asked, its words and its place, and takes the plain colour of the lines around it. The
answer's own line is logged as now ("Hop Alert answered: Added · confirmed").

Why not make the moments say "waiting for you" instead: amber in the log has to mean "this still needs you". If
answered questions stay amber, a brew day leaves a column of amber lines that need nothing, and the one that really is
waiting no longer stands out. A thing only catches the eye when nothing near it looks the same, and a state that has
ended must never look current (my checklist: F15 and H3, F9 and H21).

### In `screen.js`, live

**1. `logEvent` keeps the question's id**, at index 7. Index 6 is the shared flag, so it becomes 0 when there's an id
and the line isn't shared; `onStorage` already skips a 0:

```js
// q: the CraftBeerPi notification a "waiting for you" line is about, so the line can say what became of it (questionGone)
function logEvent(what, res, tone, cav = "", shared = false, q = null) {
  if (DEMO_MODE) { st.events.unshift([hhmmss(st.t), what, res, tone, cav]); return; }
  st.t = daySeconds();
  st.events.unshift([hhmmss(st.t), what, res, tone, cav, Date.now(), ...(q != null ? [shared ? 1 : 0, String(q)] : shared ? [1] : [])]);
  if (st.events.length > 50) st.events.length = 50;
  saveEvents();
}
```

**2. `observe` passes it** for both kinds of question it logs:

```js
    if (tm) { logEvent(`${tm.name} finished`, "waiting for you", "wait", "", false, id); say(`${tm.name}: time's up.`, true); }
    else if (Array.isArray(a.action) && a.action.length) { logEvent(line, "waiting for you", "wait", "", false, id); say(`${title}. ${msg}`, true); }
```

Anything else that logs one of CraftBeerPi's questions as "waiting for you" passes the id too.

**3. `questionGone` changes the line:**

```js
/* a question's line says "waiting for you", in Prompt Amber, only while CraftBeerPi waits for its answer: amber in the
   log always means something still needs you. Once the question goes, the same line says what became of it, in the
   plain colour, and keeps the time it was asked. False if this tab has no line for it */
function questionGone(id, res) {
  const e = st.events.find(x => x[2] === "waiting for you" && x[7] === String(id));
  if (!e) return false;
  e[2] = res; e[3] = "";
  saveEvents();
  return true;
}
```

Each tab keeps its own list and sees the question go itself, so each changes its own line, as each logged it.

**4. The loop for questions that have gone.** Today it adds a line for each question that went without an answer
from here. Now it changes the question's own line. It still adds a line when someone answered on another screen,
which is news with a time of its own, and when this tab has no line for the question (it opened after the question
was asked). It no longer adds a "no longer needed" copy under a line that now says so itself; what took the question
down (Stop, NEXT STEP, the step finishing) is logged already.

```js
  // a question gone: its own line says so (questionGone). A line of its own only when it was answered on another
  // screen, or when this tab never logged it
  for (const [id, a] of before) {
    if (now.has(id) || !Array.isArray(a.action) || !a.action.length) continue;
    const why = typeof snap.retired === "function" ? snap.retired(a.id) : null;
    const here = answered.delete(id) || startedHere(a);
    const found = questionGone(id, here || why === "answered" ? "answered" : "no longer needed");
    if (here || (found && why !== "answered")) continue;
    logEvent(`${ut(a.title)}: ${ut(a.message)}`, why === "answered" ? "answered on another screen" : "no longer needed", "");
  }
```

```js
/* the hold before the boil, started with this screen's START: its question offers Start as an answer, but CraftBeerPi
   takes it down as "withdrawn" when the boil starts that way, so the screen counts it as answered */
const startedHere = a => !!(own.start && Date.now() - own.start.at < 10000
  && M.RECIPE.steps.some(s => own.start.ids.includes(s.id) && s.n === ut(a.title)));
```

`liveStart` puts the current step in `own.start.ids`. While the boil waits I expect that to be the boil step, whose
name is the question's title. If it isn't, put the held step's id there as well.

**5. A page opened later.** The list kept on the device can hold a line that still said "waiting for you" when the
page closed. Once the screen has CraftBeerPi's waiting questions (they come as it connects, `notification_waiting`),
each such line whose question isn't among them says "no longer waiting", in the plain colour; a line whose question is
still waiting keeps its amber. Match by id. A line kept from before this change has none, so match it by its words
(`title: message`, or `name finished` for a timer). Don't do it before the waiting questions have arrived, or a
question that is still waiting would lose its amber for a moment.

**6. The Whirlpool's start line.** `stepStartLine` gives every step but a SpargeStep "started, <vessel> target <temp>".
A WhirlpoolStep (a WaitStep) sets no target as it starts: it only holds after "Heat and hold". So the screen logs
"Whirlpool started, boil kettle target 170.0 °F", which isn't so. `#hold` has it as "Whirlpool started, 20 min":

```js
  if (s && s.type === "WhirlpoolStep") return `${m.n} ${resumed ? "resumed" : "started"}${m.min ? `, ${m.min} min` : ""}`;
```

### In your demo

Mirror the mockup's `questionGone(title, res = "answered")`. Demo lines have no ids, so it finds the newest line still
"waiting for you" whose words are the title, or start with `title:` or `title finished`. The calls are where the
mockup has them (search `questionGone(` in `brew-day.js`):

- `endPause`: the paused-heat warning, "no longer needed".
- `setMode` to MANUAL, and a target set: the no-target warning, "no longer needed".
- `stepStart`: a SpargeStep's question as the step moves on, and a NotificationStep's when the recipe's NEXT STEP moves
  past it, "no longer needed".
- `boilStart`: the hold's question, "answered", from START THE BOIL or a held START.
- `cmdStop`: the sparge question, "no longer needed".
- `cmdBanner`: ADDED, SPARGE STARTED, a NotificationStep's NEXT STEP, and OK, "answered".
- `tAnswered`: a run-out timer's OK and +5 MIN, "answered"; removed, or saved while it's done, "no longer needed".

A NotificationStep now asks as the screen as built does. The title bar's button is NEXT STEP (it was DONE). Its
question is logged a moment after the step starts ("Whirlpool Hop: Cool down to 170 °F. Then add 1.50 oz Calypso."),
and NEXT STEP logs "Whirlpool Hop answered: Next Step".

### The moments' words, now CraftBeerPi's

Going through your list, I found more question and answer lines in my own words rather than CraftBeerPi's. They're
now what the screen as built logs, read from the core: a question is "title: message", and its answer "title
answered: button".

- **The malt** (`MASH_EVENTS`, in every mash moment's LOG): "MashIn: Target temperature reached. Please add malt.",
  an imported recipe's MashIn Notification (`upload_controller`), then "MashIn answered: Next Step". They were
  "MashIn: 126 °F reached. Please add malt." and "MashIn: malt added".
- **The hop alert** (`#hop`, `#boilpower`, `#keepboil`, the moments built on them, and ADDED): "Hop Alert: Please add
  3.00 oz Centennial (1)", from BoilStep's `check_hop_timer`, then "Hop Alert answered: Added". They were "Hop alert:
  add 3.00 oz Centennial (1)" and "Hop alert answered: 3.00 oz Centennial added". The title bar's title is "Hop Alert"
  too; it's drawn in capitals, so it looks the same.
- **The sparge water** (`#sparge-ready`, `#sparge-run`, `#sparge-batch`, `#boil-hold`, and the step's own press flow):
  the whole question, "Sparge: The sparge water is ready at 168 °F, and both pumps are off. Set the hoses or valves
  for a fly or a batch sparge, start the pumps by hand, then press Sparge started, which switches the HLT's AUTO off."
  It was "Sparge: the sparge water is ready at 168 °F". In `#sparge-ready` it's the event line, cut off with "…" where
  it's too long for the line, as `#boil-hold`'s is. The mockup builds it from the title bar's words (`SPARGE_ASKED`).
- **The boil's answer** (START THE BOIL, and `#heatup`): "Boil answered: Start the boil". It was "Ready to boil? Start
  the boil". `#heatup` now has the question too, "answered", at 14:58:30 above "Sparge finished", as `#boil-hold`
  orders them.
- **`#hold`**, newest first. The first line is only with the new BoilPower (`?bk=power`):
  - 17:14:32 "Boil Kettle: Holding 170.0, its target, instead of boiling. Below it, it heats at 100% while the wort is
    more than 7.2 below, easing to 30% as it reaches the hold; then it rests until the wort is 3.6 below. To boil, set
    its target to 206.6 or above.", from CraftBeerPi (BoilPower's `_tell` as the hold starts).
  - 17:14:31 "Whirlpool answered: Heat and hold", confirmed.
  - 17:14:20 "Whirlpool: The wort in Boil Kettle has cooled to 166.3 °F, below the 170 °F whirlpool, with 14 minutes
    of the stand left. Heat it back to 170 °F and hold it there until the stand ends?", answered.
  - 17:08:10 "Whirlpool started, 20 min", by recipe.
  - 17:08:10 "Whirlpool Hop finished", by recipe.
  - 17:08:10 "Whirlpool Hop answered: Next Step", confirmed.
  - 17:00:06 "Whirlpool Hop: Cool down to 170 °F. Then add 1.50 oz Calypso.", answered.
  - 17:00:04 "Whirlpool Hop started", by recipe.
  - 17:00:04 "Boil finished", by recipe. The Boil's "Boiling completed" is a routine notice, so it isn't logged.
- **`#whirlpool`**: `#hold`'s lines, with "WORT PUMP started" at 17:08:16 in its place by time.
- **`#finished`**, newest first:
  - 17:28:52 "Brewing Complete answered: OK", confirmed.
  - 17:28:10 "Brewing Complete: Now the yeast will take over", answered.
  - 17:28:10 "Recipe finished", by recipe.
  - 17:28:10 "Whirlpool finished", by recipe.
  - 17:28:10 "Whirlpool: Stand over: Boil Kettle is off and no longer holding 170 °F.", from CraftBeerPi.
  
  Its boil kettle's SV is now "– –" with today's BoilPower (`?bk=today`): the Boil step leaves the target at 0 as it
  ends, and the stand puts it back as it stops. Live shows a target of 0 that way (`applyLive`, `sv > 0`). With the
  proposed boil kettle the window shows BOIL 45 % there, so nothing changes.

### Not settled by the code: please check in a live run

- **`#boil-hold`'s three 15:45:02 lines**, newest first: the question, "HLT pump: Sparge has ended…", "Sparge
  finished". The HLT pump's notice comes from the `hltpump` extension's `_end_runoff`, a task that starts once the
  sparge step has ended and speaks only after the pump has switched off. So live may log it after "Sparge finished",
  and perhaps after the question, which would then not be the event line. If `test_e2e_sparge_step.py` can print the
  log there, I'll match `#boil-hold` and `#heatup` to it.
- **`#hold`'s lines** are from the code, as yours were. The same, if a run reaches the stand.

Settled by Brett's live runs the same afternoon: see the next section.

### Lines in my words that aren't questions, for one later pass

These differ from what the screen as built logs, as far as I can tell from the code. They aren't questions, so this
change doesn't touch them, and none of them is false. I'd rather align them all at once, from the live log, than one
by one from the code:

- After Sparge started, the mockup's "HLT AUTO off, so its element won't run as the HLT empties", by recipe. Live logs
  CraftBeerPi's notice: "Sparge: The HLT's AUTO is off now, so its element won't run as the HLT empties. Sparge timer
  started. Estimated completion: 15:45", from CraftBeerPi.
- The boil's start: the mockup's "Boil started, boil kettle AUTO"; live, "Boil started, boil kettle target 210.2 °F".

Done in the next section, from Brett's live log.

### Moments whose pictures change

Only in the event line:

- `#hop` ("Hop Alert: Please add 3.00 oz Centennial (1)") and `#boilpower` ("Hop Alert answered: Added").
- `#sparge-ready` (the whole sparge question; at 1920 px it fits, narrower it's cut off with "…").
- `#hold` and `#whirlpool` (with the new BoilPower, its hold notice; with today's, "Whirlpool answered: Heat and hold").

`#finished` is new since your identity test's moments; with `?bk=today` its boil kettle's SV is "– –".

### Changed, all in `proposal\brew-day.js`

- `questionGone` and its calls; the NotificationStep's NEXT STEP and its two lines.
- The ADDED and START THE BOIL presses' lines, and the SpargeStep's question line (`spargeBegin`).
- `MASH_EVENTS`, `#hop`, `#boilpower`, `#keepboil`, `#heatup`, `#sparge-ready`, `#sparge-run`, `#sparge-batch`,
  `#hold`, `#whirlpool` and `#finished`; `SPARGE_ASKED`.

### Checked

- **Every old moment's lines**, before and after, as they are and with `?bk=today` and `?timers=today`: once the word
  changes above are applied to the old lines, the only differences are `#hold`'s and `#whirlpool`'s new lines.
- **In every moment, each line still "waiting for you"** belongs to the question in the title bar or to a timer that
  has run out. None is left amber after its answer.
- **Pictures**, before and after, at 1920×950, 960×1200 and 390×844, with graphs and without, and at 1920×950 with
  `?bk=today` and `?timers=today`: 217 pictures of the 31 old moments, 182 identical. The other 35 are the five moments
  above at each of those seven, and they differ only inside the event line.
- **Fit**: the event line stays one line at every size, cut off with "…" where it's long; the LOG wraps a long line
  inside its box; nothing is wider than the window. Checked with LOG open in `#finished`, `#hold`, `#heatup`,
  `#sparge-ready` (1920, 960 and 390 wide), `#hop` (390), `#boilpower` (1180) and `#mash` (701).
- **Pressed through, at 1920×950**, with no page errors. Each question's line turns plain, saying:
  - "answered": ADDED in `#hop`; START THE BOIL held, and START held, in `#boil-hold`; SPARGE STARTED in
    `#sparge-ready`; OK and +5 MIN in `#timer-done`; OK on the rest timer with `?timers=today`; OK in `#notarget` and
    `#pause-long`; NEXT STEP in the title bar for Whirlpool Hop (reached from `#boiling` with NEXT STEP).
  - "no longer needed": STOP and NEXT STEP in `#sparge-ready` (the boil's question then waits, amber); MANUAL and a
    target in `#notarget`; MANUAL in `#pause-long`; the recipe's NEXT STEP past Whirlpool Hop.

## The event log's order, warnings, and CraftBeerPi's own words: ready to build (12 Nov, late afternoon)

Brett built the last section (M81: UI 963c600, build 4d10413; identity 471/471, and his live tests pass) and ran it
live. What came back, and what I've decided:

- **His call, agreed:** a question that drops off as the page connects again, or after a restart, with no reason from
  CraftBeerPi, says "no longer waiting", as on a page opened later. The page can't tell whether it was answered or
  taken down. DESIGN.md now says so.
- **Brewing Complete is now kept for pages opened later** (core 393449d). Nothing to design.
- The rest is below: the order of lines that arrive together (1), warnings (2), two live lines that say something
  untrue (3), the demo (4), and the questions CraftBeerPi still doesn't keep (5).

### 1. Lines that arrive together: the step's change first

When CraftBeerPi's messages and a step's change come in the same update, the screen as built logs the messages first.
At the end of the sparge, Brett's run logged, oldest first:

- HLT pump: Batch Sparge has ended, so the HLT pump is off. The wort pump is still running, …
- Boil Step: Ready to boil? … · waiting for you
- Batch Sparge finished

The HLT pump's line talks about the sparge ending before the line that says it ended. And the event line, which shows
the newest line, says "Batch Sparge finished" while the question waits. The order isn't even fixed: in one run of four
the whirlpool's start came before its question, in the other three after it.

**The rule: in each update, log things in the order they happened.**

1. Questions that have gone (the loop that changes their lines, and its "answered on another screen" line). An answer
   comes before what it sets going.
2. What a step says as it stops. CraftBeerPi titles it with the step's name, and sends it before it marks the step
   done: "Whirlpool: Stand over: Boil Kettle is off and no longer holding 170 °F."
3. The steps' lines, then "Recipe finished".
4. Everything else CraftBeerPi said, in the order it came, because the steps' changes set it going. The runoff's pump
   off and the held boil's question come after "Sparge finished". A step's own words come after its start ("Boil
   started…", then "Boil: The wort pump is off, so you can move its hoses."). Brewing Complete comes after "Recipe
   finished".

The event line then shows the consequence, which is what the brewer needs to see: the question that waits, in amber, or
that he can move the hoses.

Your live runs, in this order:

- End of the sparge (`#boil-hold`): Sparge finished; HLT pump: Sparge has ended…; Boil: Ready to boil?… The moment
  already has this order.
- START THE BOIL: Boil answered: Start the boil; Boil started, boil kettle target BOIL; Boil: The wort pump is off,
  so you can move its hoses.
- A stand that asks at once: Whirlpool Hop finished; Whirlpool started, 20 min; Whirlpool: The wort in Boil Kettle has
  cooled… Heat it back…?
- The end (`#finished`): Whirlpool: Stand over…; Whirlpool finished; Recipe finished; Brewing Complete… (as now).

In `observe`:

```js
function observe(prev, snap) {
  if (!prev) return;
  // …the connection lines, as now…
  const before = new Map((prev.alerts || []).map(a => [String(a.id), a]));
  const now = new Set((snap.alerts || []).map(a => String(a.id)));
  /* questions that have gone, before the new messages: an answer comes before what it sets going */
  for (const [id, a] of before) { /* …as now… */ }
  const old = new Map((prev.steps || []).filter(Boolean).map(s => [s.id, s]));
  const steps = (snap.steps || []).filter(Boolean);
  /* CraftBeerPi's new messages, in two parts. What a step says as it stops is titled with its name ("Whirlpool: Stand
     over: …") and goes before its line. Everything else goes after the steps' lines, because their changes set it
     going: the runoff's pump off and the held boil's question after "Sparge finished", a step's own words after its
     start, Brewing Complete after "Recipe finished" */
  const fresh = (snap.alerts || []).filter(a => !before.has(String(a.id)) && !OWN_ALERTS.has(String(a.id)));
  const ending = new Set(steps.filter(s => { const o = old.get(s.id); return o && o.status === "A" && s.status !== "A"; }).map(s => String(s.name)));
  const lastWords = a => ending.has(String(a.title));
  fresh.filter(lastWords).forEach(logAlert);
  // …mine, the steps' loop and "Recipe finished", as now…
  fresh.filter(a => !lastWords(a)).forEach(logAlert);
}
/* one of CraftBeerPi's new messages, for the event line and the title bar: the message loop's body, from `const id = …`
   on, without its `continue` */
function logAlert(a) { /* … */ }
```

The mockup has no `observe`. Its presses and moments follow the rule (part 4).

### 2. Warnings: OK turns their line plain

Brett's question: a warning without buttons is logged "from CraftBeerPi" in amber, and stays amber after OK in the
title bar. Should OK turn it plain? **Yes.** A warning waits in this screen's title bar for OK, so its line is amber
while it's there. Once it has gone, the line takes the plain colour and keeps "from CraftBeerPi". The words stay as
they are: OK tells CraftBeerPi nothing, so the line doesn't say "answered".

- **Gone** means OK, or pushed out of the title bar by newer ones (`addWarning` keeps 10).
- **A page opened later** has no warnings in its title bar, so warning lines kept from before load plain.
- **The same warning twice** is shown once (`addWarning`) but logged twice. Match by words, so both lines turn plain
  together.
- **Errors stay red, after OK too.** Red says something went wrong, and that stays true. Amber says something still
  waits, which stops being true. A failed command's "failed: no answer in 5 s" is the same.

```js
/* a warning's line is amber only while the warning waits in this screen's title bar for OK. Once it has gone (OK, or
   pushed out by newer ones), each line with its words takes the plain colour and keeps "from CraftBeerPi". Lines
   kept from an earlier page load plain: this page's title bar has no warnings yet */
function warningsGone() {
  const shown = new Set(st.warnings.map(w => `${ut(w.title)}: ${ut(w.message)}`));
  let changed = false;
  for (const e of st.events) if (e[2] === "from CraftBeerPi" && e[3] === "wait" && !shown.has(e[1])) { e[3] = ""; changed = true; }
  if (changed) saveEvents();
}
```

Call it after OK (`case "w"`), after `addWarning` pushes one out, and once as the page loads its kept lines. The
mockup has no warnings without buttons, so nothing changes there.

### 3. Two live lines that say something untrue

**The whirlpool's timer line.** In one of your four runs the screen logged "Whirlpool: 170 °F reached, 20 min timer
started". A WhirlpoolStep is a WaitStep: its timer starts with the step (`WaitStep.on_start`), whatever the
temperature, so nothing was reached. Its start line already says "Whirlpool started, 20 min", so leave the timer line
out for it, as for a SpargeStep:

```js
    /* …a whirlpool's timer starts with the step, whatever the temperature, and its start line says the minutes */
    else if (o.status === "A" && s.status === "A" && parseLeft(o.state_text) == null && parseLeft(s.state_text) != null
      && m.min && !sparge && s.type !== "WhirlpoolStep") {
```

**The boil's start line with the new BoilPower.** Live logs "Boil Step started, boil kettle target 210.2 °F". With the
proposed boil kettle, that target is BOIL in the window and in TARGET's editor, and the screen's own line for setting
it by hand is "Boil kettle target BOIL". The design's rule is not to show the boil point as the boil kettle's target
while its target is BOIL. So the start line says BOIL too. With today's BoilPower it stays 210.2 °F, as its window
shows it. In `stepStartLine`:

```js
  /* with M.BKNEW, a target at or above where BOIL starts shows as BOIL, never as a temperature, as it does in the
     window and in TARGET's editor */
  const tgt = m.temp == null ? "" : m.boil && M.BKNEW && m.temp >= bkLetGo() ? "BOIL" : `${m.temp.toFixed(1)} ${M.U}`;
  return `${m.n} ${resumed ? "resumed" : "started"}${tgt ? `, ${M.VNAME[m.k].toLowerCase()} target ${tgt}` : ""}`;
```

### 4. In your demo

- **`boilStart`:** the start line first, then the pump message. Its words come from the mockup's `boilStartLine(s,
  from)`: "Boil started, boil kettle target BOIL", or "…target 210.2 °F" with `?bk=today`.
- **SPARGE STARTED (`cmdBanner`):** "HLT AUTO off, so its element won't run as the HLT empties · by recipe" becomes
  CraftBeerPi's message, as live logs it: "Sparge: The HLT's AUTO is off now, so its element won't run as the HLT
  empties. Sparge timer started. Estimated completion: 15:44 · from CraftBeerPi". It comes 300 ms after the press's
  own line. The first sentence is there only when the step heated the sparge water, and the second only when it has
  a timer. The time is the press plus the step's minutes, as hours and minutes.
- **The moments:**
  - `#hop`, `#heatup` and `#boiling`, and the moments built on them (`#boilpower`, `#keepboil`, `#letfall`, `#pause`,
    `#pause-long`): the boil day, from the end of the sparge to the boil's start, is the mockup's `boilDay()`.
    Oldest first: Sparge finished; "HLT pump: Sparge has ended, so the HLT pump is off." from CraftBeerPi; the boil's
    question, answered; "Boil answered: Start the boil"; "Boil started, boil kettle target BOIL" (or "…210.2 °F"). It
    was "Sparge finished" and "Boil started, boil kettle AUTO". The HLT pump line is your recipe test's, with a
    MashStep Sparge.
  - `#sparge-run` and `#sparge-batch`, and `#boil-hold`, which is built on `#sparge-run`: CraftBeerPi's sparge
    message, as the newer of the two 15:05:02 lines. In `#sparge-batch`, with no timer, it's the first sentence alone.

### 5. Questions CraftBeerPi doesn't keep

You found that a page reloaded while "Heating is not working", the refusal to change a running step, or a sensor
plugin's prompt waits shows an amber line with nothing to press. The line is true: CraftBeerPi does wait. But the
design says a question stays on every screen until it's answered, and a phone opened later doesn't even get the line.
The core is yours. My thoughts:

- **"Heating is not working" matters most.** It's the only warning that the element isn't heating the wort, and its
  Stop the profile is the way out. Please keep it as the steps' questions are, until it's answered or no longer
  applies (the step ends, or the wort warms again).
- **The refusal to change a running step** answers whoever made the change, on the page they used. Other screens have
  nothing to answer. Sent as a warning without OK, the brew-day screen would show it in the title bar until OK and log
  it as a warning (part 2). Check the Brew Steps page still shows it, though: the old pages let a notification without
  a button go after 5 s.
- **Sensor plugins' prompts** can't be changed one by one. Keeping every prompt that has buttons, in `notify()`, would
  cover them. The cost: an old unanswered prompt shows on every page until its button is pressed or it drops out of
  the cache.

### Moments whose pictures change

Only in the event line:

- `#heatup`: "Boil started, boil kettle target BOIL" ("…target 210.2 °F" with `?bk=today`).
- `#sparge-run`: CraftBeerPi's sparge message, ending with "…" where the line is too narrow for it.

The other changes are in LOG only.

### Changed, all in `proposal\brew-day.js`

- New: `boilStartLine` and `boilDay`.
- `boilStart` (the order, and the start line's words), and SPARGE STARTED in `cmdBanner` (CraftBeerPi's message).
- `#hop`, `#heatup`, `#boiling`, `#sparge-run` and `#sparge-batch`.

### Checked

- **Every moment's lines, before and after**, as they are and with `?bk=today` and `?timers=today`: only the 11
  moments above differ (`#hop`, `#boilpower`, `#heatup`, `#boiling`, `#pause`, `#keepboil`, `#letfall`,
  `#pause-long`, `#sparge-run`, `#sparge-batch` and `#boil-hold`).
- **Pictures**, before and after, all 32 moments at 1920×950, 960×1200 and 390×844, with graphs and without, and at
  1920×950 with `?bk=today` and `?timers=today`: 224 pictures, 210 identical. The other 14 are `#heatup` and
  `#sparge-run` at each of the seven, and they differ only inside the event line.
- **Fit** with LOG open, for `#sparge-run`, `#heatup`, `#boil-hold` and `#hop` at 1920, 1180, 960, 701 and 390 px
  wide: the event line stays one line, ending with "…" where it's too long; LOG wraps every line inside its box;
  nothing is wider than the window; no page errors. On a phone `#boil-hold`'s LOG runs past the first screen, as it
  did before (it's 42 px longer now). It moves with the page, so its end can be scrolled to.
- **Pressed through, at 1920×950, with no page errors:**
  - START THE BOIL held in `#boil-hold`, newest first: "Boil: The wort pump is off, so you can move its hoses.";
    "Boil started, boil kettle target BOIL" ("…210.2 °F" with `?bk=today`); "Boil answered: Start the boil".
  - SPARGE STARTED in `#sparge-ready` at 15:04:41: CraftBeerPi's message with "Estimated completion: 15:44", after
    "Sparge: sparge started, 40 min timer started". With no timer, the first sentence alone, after "…until NEXT
    STEP". With no temperature, the timer sentence alone.
  - The last section's presses again (25 checks): each question's line still turns plain with the right word.

### Built (12 Nov, late afternoon)

Brett built all of it (M82: UI a6f1971, build 59bedb5, main.5506e3a5.js; core 287ba9a), live on 8012 after its
restart. His live runs give the order above, word for word: the sparge's end (`#boil-hold`), START THE BOIL
(`#heatup`), and the whirlpool to the end (`#hold`, `#finished`).

- **Lines a moment apart.** CraftBeerPi doesn't promise the sparge's end comes in one update. The HLT pump's notice is
  sent from a task of its own, and it reached the screen 18, 2 and 1 ms before "Batch Sparge finished" in three runs.
  So the screen moves a step's line, and "Recipe finished", above CraftBeerPi's words and questions logged in the
  second before it. It stops at another step's line, an answer, anything older, or the step's own last words
  (`logStep`). The boil's pump notice came 2 and 19 ms after the boil's start, so it needed nothing. Agreed: it's the
  same rule, for lines that arrive a moment apart.
- **Part 5.** CraftBeerPi now keeps "Heating is not working" for pages opened later. It comes down when the wort warms
  again or nears its target, when the step stops, resets or starts again, or when a newer report replaces it. The
  refusal to change a running step is now a warning without buttons, so the screen gives it its own OK and it's amber
  until then. The Brew Steps page's step form shows CraftBeerPi's sentence beside Save and keeps it after the 5-second
  pop-up goes. Sensor plugins' prompts are unchanged: changing `notify()`'s default would change every plugin's prompts
  at once.
- **Tests:** identity 503/503, now also comparing LOG's lines as text in all 32 moments; sparge 123/123; recipe pumps
  94/94; timers 71/71; brew day 99/99; kept prompts 54/54; heat stall 36/36; and a new warnings test, 10/10 (amber,
  plain after OK, plain after a reload). The build before fails the new checks.

## An answer from another screen: one short line, not the question again: ready to build (12 Nov, late afternoon)

Found in Brett's live lines for M82. Sparge started, pressed on another screen, logged three lines in the same second,
oldest first:

- Batch Sparge: The sparge water is ready at 168 °F. Set the hoses or valves for a fly or a batch sparge, start the
  pumps by hand, then press Sparge started, which switches the HLT's AUTO off. · answered on another screen
- Batch Sparge: sparge started, 15 min timer started · from another screen
- Batch Sparge: The HLT's AUTO is off now, so its element won't run as the HLT empties. Sparge timer started.
  Estimated completion: 15:17 · from CraftBeerPi

The question's own line, from when it was asked, now says "answered" as well, so LOG holds the whole question twice.
That's my doing. When a question's line started to turn "answered" (M81), the extra line that said "answered on another
screen" became a copy of it. It breaks my own rule: "don't log a second copy of it to say so".

It happens with every question answered on the other device, and the brewer runs brew day on a monitor and a phone. Measured in
LOG, the copy of the boil's question (302 characters) is 166 px tall on a phone and 102 px on the monitor; the
sparge's (184 characters) is 123 and 81 px. A short line is 37 px. LOG keeps eight lines, so each copy also pushes one
out. A timer's alarm answered elsewhere gets a copy in CraftBeerPi's words, "Mash rest: The 60:00 timer has run out.",
under the screen's own "Mash rest finished".

**The rule:** an answer given on another screen is one line, in the words an answer here would log, with "from another
screen" in the plain colour where an answer here has "confirmed". The question's own line says "answered", where it
is, as now.

- **A question:** "Hop Alert answered · from another screen". Here it's "Hop Alert answered: Added · confirmed", but
  this screen doesn't know which button was pressed elsewhere (see the core, below).
- **A timer's alarm:** "Mash rest: alarm answered · from another screen", as OK pressed here. Its row shows which it
  was: stopped at its own time (OK) or running again (+5 MIN).
- **The sparge's question:** no line of its own. Its step's "Batch Sparge: sparge started, 15 min timer started · from
  another screen" is the answer, as "… · confirmed" is when it's pressed here. Recognise the question as `livePrompt`
  does: titled with a SpargeStep's name, with a "Sparge started" button. That works whichever of the question going
  and the step's flag arrives first.
- **A question this tab never logged** (asked before it opened, and not kept by CraftBeerPi): as now, the question in
  full, "answered on another screen". With no line of its own, the page has to say what was asked.

In `observe`, the loop for questions that have gone:

```js
  for (const [id, a] of before) {
    if (now.has(id) || !Array.isArray(a.action) || !a.action.length) continue;
    const why = typeof snap.retired === "function" ? snap.retired(a.id) : null;
    const here = answered.delete(id) || startedHere(a);
    const res = here || why === "answered" ? "answered" : why ? "no longer needed" : "no longer waiting";
    const found = questionGone(id, res);
    if (here || (found && why !== "answered")) continue;
    /* answered on another screen. With a line here, which already says so: one line, as an answer here reads, not the
       question again. Never logged here: the question whole, to say what was asked */
    if (found) { const line = elsewhereLine(a); if (line) logEvent(line, "from another screen", ""); continue; }
    logEvent(`${ut(a.title)}: ${ut(a.message)}`, why === "answered" ? "answered on another screen" : res, "");
  }
```

```js
/* an answer given on another screen, in the words an answer here logs. A timer's alarm, OK or +5 MIN (its row shows
   which); a SpargeStep's question, none: its step's "sparge started" line is its answer; any other, "Title answered" */
function elsewhereLine(a) {
  if (M.TIMERS && TIMER_RAN_OUT.test(String(a.message || "").trim())) return `${ut(a.title)}: alarm answered`;
  if (spargeQuestion(a)) return null;
  return `${ut(a.title)} answered`;
}
/* a SpargeStep's question: titled with the step's name, with a Sparge started button (livePrompt asks the same) */
const spargeQuestion = p => M.RECIPE.steps.some(s => s.type === "SpargeStep" && String(p.title || "") === s.n)
  && (p.action || []).some(b => /^sparge started$/i.test(String(b.label || "").trim()));
```

`logStep` already stops at "from another screen", so a step's line stays after the answer that set it going.

**The core, if you want the button's name.** CraftBeerPi knows it: `notify_callback` has the `action`, and the timers'
`ok` and `plus5` know theirs. Sent with the retirement (`retire(id, reason="answered", answer=action.label)`), the line
could read exactly as an answer here: "Hop Alert answered: Added · from another screen", "Mash rest: 5 more minutes ·
from another screen". It isn't needed. Most questions have one button, and for the rest what the answer did shows in
the lines after it or on the screen: the stand's "Holding 170.0…", a step "stopped · from another screen", the timer's
row. Your call.

### Moments whose pictures change

None. The mockup has no other screen, so this is live only.

### Changed

- `proposal\BUILD-NOTES.md`: this section, and Built for the last.
- `proposal\brew-day.js`: a comment only, in `#finished`. The stand's notice comes before "Whirlpool finished" because
  it's the step's last words, not because CraftBeerPi's words went first.
- `DESIGN.md` ("Last event") and `.impeccable\design.json` (the Don't about a second copy).

### Checked

- The heights above: the copies and a short line added to `#sparge-run`'s LOG by hand, at 390×844 and 1920×950.
- `brew-day.js` passes `node --check`, and its moments are unchanged.
- For your live tests: Sparge started on another page (two lines: "sparge started … · from another screen" and
  CraftBeerPi's message, with the question's own line "answered"); a hop alert and a timer's alarm answered on another
  page (one short line each); and a prompt CraftBeerPi doesn't keep, asked before the page opened and answered on
  another (still logged whole).

### Built (12 Nov, evening)

Brett built it (M83: UI d45186a, build b1a0c19, main.2117d396.js; core 5de41ae; tests dba0c2a), live on 8012. He took
the optional part too: CraftBeerPi now sends the label of the button that was pressed when it takes a question down as
answered. So the line names it, as an answer here does: "MashIn answered: Next Step", "Hop Alert answered: Added",
"Resume brew? answered: Resume", each "· from another screen". With an older core it's "Hop Alert answered". A timer's
alarm says "Mash rest: alarm answered", or "Mash rest: 5 more minutes" for +5 MIN. The sparge's question has no line,
and a question the tab never logged is logged whole.

- **His fix.** A question answered in this screen's title bar could be logged as answered on another screen:
  CraftBeerPi's word that the question has gone can reach the page before its reply to the press. The screen now
  counts it as answered from the press, as it already did for a timer's alarm. A new test holds the reply back to make
  it happen.
- **Tests:** answers 29/29 (new), timers 72/72, sparge 124/124, recipe 95/95, brew day 99/99, warnings 10/10, identity
  503/503, Settings 104/104. M82's build fails 3 checks in the answers walk and 3 in the timers walk.
- **Noted by Brett, not changed:** a question already waiting when the screen opens inside the app gets no line. See
  the next section.

## Which question the title bar shows first, and when it beeps: ready to build (12 Nov, evening)

BrewScribe logger.13, on both simulators since this afternoon (logger.14 is the same), asks seven questions of its own
through CraftBeerPi, each with only an OK button: Record strike water, Check mash pH before mash-out, Check first
runnings, Check last runnings, Record before-boil readings, Record after-boil readings, and Review the finished brew.
It has also switched on the core's own Check mash pH, 15 minutes after mash-in. The title bar shows the oldest question
first, so Brett saw these stand in front of the step's own question:

- at the sparge: "BrewScribe: Check mash pH before mash-out · 3 more waiting", while the step waits for SPARGE STARTED;
- in the hold before the boil, in front of START THE BOIL;
- "Record after-boil readings", a second before Whirlpool Hop's question;
- at the end, in front of Brewing Complete.

Three things go wrong once several questions wait:

1. **The title bar and the recipe column disagree.** The recipe says WAITING FOR YOU, and the title bar shows a reminder
   that holds nothing up. To reach the question the brew waits on, the brewer has to press OK on every reminder in front of
   it, whether or not he has done what it asks. That teaches him to press OK without reading, which is the one thing a
   reminder mustn't teach. "Check first runnings" is asked as the sparge step starts, before any wort flows, so it has
   to be OK'd before SPARGE STARTED can even be pressed.
2. **The question the brew waits on arrives in silence.** The screen beeps when the title bar changes. A question that
   arrives behind another doesn't change it, so the sparge's question, behind a reminder, makes no sound.
3. **Every OK beeps.** When an answer brings the next question up, the title bar changes, so the screen beeps twice
   right after the brewer's own press. At the sparge, with three reminders waiting, that's three pairs of beeps, each after a
   press. The rule is that a press makes no sound.

### The rule: the most urgent first, then a count

As on an operator's alarm banner, the title bar shows the most urgent thing waiting, then "· N more waiting". The
screen doesn't judge urgency from the words. It goes by what CraftBeerPi says each one is (a warning, or information)
and by the recipe. In this order:

1. **No connection, a command that failed, and CraftBeerPi's errors.** As now.
2. **A timer that has run out.** It rings every 3 s until it's answered, and its row and the screen's frame pulse with
   the title bar (The One Pulse Rule), so the title bar shows it.
3. **What the brew needs from the brewer.** A question CraftBeerPi sends as a warning or an error: a hop to add (first wort
   too), Heating is not working, Resume brew?, Carried on after a restart, the hold before the boil, and the stand's
   Heat and hold. Or the current step's own question, the one the recipe column means by WAITING FOR YOU: the sparge's,
   and a NotificationStep's (MashIn's malt, Whirlpool Hop). **New:** these now go before warnings without buttons.
4. **CraftBeerPi's warnings without buttons**, with their OK (the refusal to change a running step, say). **New:**
   after 3. A refusal left unanswered on the monitor would otherwise stand in front of a hop alert, and the hop alert,
   arriving behind it, would make no sound.
5. **Everything else, which holds nothing up:** BrewScribe's reminders, Check mash pH, Brewing Complete, and other
   plugins' questions. **New:** after everything above.

Within each, oldest first.

What the brewer sees, in the cases Brett saw:

- **At the sparge:** "Batch Sparge · 3 more waiting", with SPARGE STARTED. After the press, the reminders come up
  oldest first: Check mash pH before mash-out, Check mash pH, then Check first runnings, now as the wort flows, which
  is what its words say ("Once wort is flowing into the boil kettle…").
- **In the hold before the boil:** "Boil Step · 1 more waiting", with START THE BOIL held. Then "Record before-boil
  readings", while the kettle heats, which its words allow ("Before a rolling boil…").
- **Whirlpool Hop:** its question comes first. "Record after-boil readings" waits behind it until NEXT STEP, through
  the cool-down. That's the one cost of this rule. Meanwhile the reminder is in the count, its line is amber in LOG,
  and BrewScribe's own tab shows it.
- **At the end:** "Review the finished brew", then Brewing Complete. Both only need an OK and hold nothing up, so they
  keep their order.

Not chosen:

- **Oldest first, as now:** the three problems above.
- **Newest first:** a hop alert would be buried by anything that came after it.
- **Two questions at once in the title bar:** there's no room on a phone, and it's a bigger change to the approved
  screen. If the reminders behind the recipe's question turn out to be missed, that's the next thing to try, and I'd
  show it to the brewer first.

### When it beeps

The rule in DESIGN.md is that a sound means something new needs the brewer, and a press makes no sound. With several
questions waiting, that means:

- **Two beeps** when something that has just arrived takes the title bar.
- **None** when one moves up because the one in front went, answered here or on another screen. It was already
  waiting, and the sound would follow a press.
- **None** for one that arrives behind another. It's in the count, and its line is amber in LOG.
- A timer that has run out keeps its own sound, as now.

The sparge with BrewScribe, then: two beeps for "Check first runnings" as it arrives alone, two for the sparge's
question as it takes the title bar in front of it, and nothing for each OK after that. Today it's two for the reminder,
none for the sparge's question, and two after every OK.

Nothing beeps as a page opens, since nothing has arrived yet; the demo already works this way ("the moment's own alert
was there as it opened: it doesn't beep"). After the connection comes back, the questions that were already waiting
don't beep again. One that arrived meanwhile does, if it takes the title bar.

### In `screen.js`

In `liveBanner`, after the errors, as now:

```js
  /* the most urgent first, then a count. Oldest first within each:
     0 a timer that has run out: it rings until answered, and its row and the frame pulse with the title bar;
     1 what the brew needs from you: a question CraftBeerPi sends as a warning or an error (a hop to add, Heating is
       not working, Resume brew?, the hold before the boil, the stand's), or the current step's own (the sparge's, a
       NotificationStep's), which the recipe column calls WAITING FOR YOU;
     then CraftBeerPi's warnings without buttons;
     3 everything else, which holds nothing up: BrewScribe's reminders, Check mash pH, Brewing Complete, other
       plugins' questions */
  const cur = st.recipe ? M.RECIPE.steps[st.recipe.cur] : null;
  const rank = p => promptTimer(p) ? 0
    : /^(warning|error)$/i.test(String(p.type || "")) || (cur && String(p.title || "") === cur.n) ? 1 : 3;
  const asks = st.prompts.map((p, i) => [rank(p), i, p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  asks.filter(a => a[0] < 2).forEach(a => queue.push(ask(a[2])));
  st.warnings.forEach(w => queue.push({tone: "warning", title: ut(w.title || "Warning"), text: ut(w.message || ""), act: "OK", cmd: `w:${w.id}`}));
  asks.filter(a => a[0] > 2).forEach(a => queue.push(ask(a[2])));
```

Here `ask(p)` is today's body of `st.prompts.forEach`, from `const t = promptTimer(p)` on, returning the item instead
of pushing it.

In `renderAll`:

```js
  if (key !== lastBannerKey) {
    /* two beeps when something that has just arrived takes the title bar. Not when one moves up because the one in
       front went: it was waiting already, and the sound would follow a press. Not for one arriving behind another:
       it's in the count, amber in LOG */
    if (key && st.banner.timer == null && st.banner.tone !== "connecting" && st.banner.fresh) ring(2);
    lastBannerKey = key;
  }
```

`fresh` marks something new since the last update: an alert in `observe`'s `fresh`, a command that has just failed
(`st.alarm`, as it's set), or the connection just lost. One way: keep the ids `observe()` found new until the next
render, and let `liveBanner` mark its item with them. Your call how.

### A question already waiting when the screen opens inside the app

Yes, please change it. With this rule, LOG's amber lines are where the brewer sees the questions behind the first one, so
every question that waits needs its line. In the first update, give each question already waiting a "waiting for you"
line if this tab has none (`askedBefore`), as a fresh page does, without a beep. Warnings stay as they are.

### For Porter (please pass this on)

- **Nothing to change for the order.** BrewScribe's reminders wait behind what the brew waits on, oldest first among
  themselves. "Check first runnings" now comes up after SPARGE STARTED, as the wort flows; "Record before-boil
  readings" after START THE BOIL; and "Record after-boil readings" after Whirlpool Hop's NEXT STEP.
- **STOP and START.** BrewScribe takes its reminders down on STOP and asks them again on START as new questions. Each
  time, every screen gets a "no longer needed" line and a new amber line for each, and two beeps if one takes the title
  bar. A paused brew doesn't change which readings are due. Keeping a reminder up through STOP and START, and
  cancelling only the timed ones still to come, would make it one question per reading.

### Moments whose pictures change

None. The mockup's moments have one question at a time, and the demo doesn't use `liveBanner`'s queue, so this is live
only. I haven't added BrewScribe's reminders to the moments: they're Porter's, and still changing.

### Changed

- `proposal\BUILD-NOTES.md`: this section, and Built for the last one.
- `DESIGN.md`: The Most Urgent First Rule (new), The One Pulse Rule's sentence about sound, and the Don't about sound.
- `.impeccable\design.json`: the same.

### Checked

- **The order**, as written above, against twelve cases with the types and titles CraftBeerPi and BrewScribe send: the
  sparge with three reminders asked first; the hold before the boil; Whirlpool Hop; the end; a refusal left unanswered
  and then a hop alert, or the sparge's question; the held boil and a timer that runs out; strike water and then
  Heating is not working; Resume brew? after a restart; two hop alerts; an error; and reminders alone. All twelve come
  out as described.
- **The beeps**, over a sparge and the start of a boil with BrewScribe (11 updates): four pairs, each for something that
  had just arrived and took the title bar, and none after a press.
- **For your walks**, with BrewScribe running again (`CBPI_WITH_BREWSCRIBE=1`): the failures you saw, each a BrewScribe
  question in front, should go. A press that brings the next question up should play nothing.

### Built (12 Nov, evening)

Brett built it (M84: UI 2696819, build 819b513), with a fix of his own (M85: UI fbc0eb7, build 9029e50,
main.5a5e11a6.js). 8012 runs both, with BrewScribe logger.16.

His calls, all agreed:

- A question already waiting as the screen opens inside the app gets its line, and nothing more: no beep, and nothing
  said to a screen reader, as on a page loaded afresh.
- "Just arrived" means the ids new in an update, less the questions CraftBeerPi was waiting on as the page first
  connected (it sends those again then). After the connection comes back, what still waits is silent; one that came
  meanwhile beeps if it takes the title bar.
- No connection, and Connecting once it turns to the alarm colour, beep each time they take the title bar, as before.
- The demo beeps at each new alert, as the mockup does. No picture changes.

**M85, his fix.** Since M82, a step's line went one place too far back in LOG whenever another line came between it and
the line where it should stop. With BrewScribe, "Whirlpool finished" and "Recipe finished" went before "Whirlpool: Stand
over…". It now lands just newer than that line, as part 1 of the order section says. Live only.

**Porter:** logger.15 keeps BrewScribe's reminders up through STOP and START, and logger.16 uses this order in
BrewScribe's own alarm line.

**Tests:** a new walk, test_e2e_brewday_order, 51/51. A reminder alone beeps. START puts Gypsum's question in front of
it, with WAITING FOR YOU, and beeps. A second reminder is silent, amber in LOG. A timer goes first with its own alarm, and
its OK brings Gypsum's question back silently. Back from Brew Steps, a reminder that came meanwhile gets its line,
silently. NEXT STEP beeps once for Whirlfloc's question. A dropped connection beeps as it goes, is silent coming back with
nothing new, and beeps for a hop alert that came meanwhile. M83's build fails 28 of these checks. With the real
BrewScribe, every brew-day walk now passes; before, its reminders broke three. Identity 503/503, Settings 104/104.

## Heating by hand: the faceplate says nothing will stop it, and CraftBeerPi raises an alarm: ready to build (13 Nov)

On 8012 this morning, the brewer first tried the boil kettle in MANUAL for a brew in a bag: target 150 °F, element held
on, and it boiled at 212 °F. Then: "Oh! I turned the HLT element on without using 'Auto'... that is dangerous", and
"same issue with HLT, I see. Maybe a warning?"

What went wrong, on the screen: in MANUAL nothing compares the temperature with the target, so an element switched on
by hand runs until someone turns it off. That's CraftBeerPi's behaviour on every page, and its own docs warn of it. But
the window still showed SV 150.0 in green, as though it would be held. The line under it said "MANUAL · element by
hand" in Soft Steel, which says what MANUAL is, not what it means for the target. And nothing changed as the water
passed 150 °F.

Two parts, and one thing that stays:

1. **The line under the window** (the screen): while an element heats by hand, it says nothing will stop it, in Prompt
   Amber. Past the target, it turns light red.
2. **CraftBeerPi's alarm** (the core): once the vessel is 2 °F past its target, or near the boil.
3. **MANUAL stays MANUAL.** Agreed with you: it doesn't switch the element off at the target. That would make it a second
   AUTO that nobody can see, and taking over by hand is what MANUAL is for. The held press stays the only friction at the
   start, with no "Are you sure?": confirmations for something you can stop with one tap get pressed without reading.

### "By hand"

The element is on, its vessel is in MANUAL, and no AUTO runs it: not its own, and for the HLT not the mash tun's HERMS
(the dashed button, `by` set). That's `byHand(v)` in the mockup. It applies to:

- **the HLT**, with or without a target;
- **the proposed boil kettle, with a target below BOIL** (a temperature to hold, `bkHoldT()`), which is the brew in a
  bag above.

Not to the boil kettle at BOIL or with no target: boiling by hand is what a boil kettle is for, and its line stays
"MANUAL · element by hand". Not to an older BoilPower (`?bk=today`), and not to the mash tun, which has no element of its
own.

A target at or above where BOIL starts (`bkLetGo()`, 206.6 °F on the simulators) counts as none: the water boils before
it gets there, so "past the target" could never come. "Near the boil" covers it instead.

### The line under the window

| While its element heats by hand | The line | Colour |
| --- | --- | --- |
| Below its target, or less than 2 °F past it | Heating by hand · won't stop at target | Prompt Amber, 600 (`.warn`) |
| No target, or one at or past where BOIL starts | Heating by hand · until you turn it off | Prompt Amber, 600 |
| 2 °F or more past its target | 3.3 °F above target · heating by hand | light red #ff9b93, 600 (`.alarm`, new) |
| At or past where BOIL starts, whatever its target | Near the boil · heating by hand | light red, 600 |

- **The words** are those of the lines they stand in for ("6.7 °F below target") and of the element's own button ("tap to
  turn off"). The target's number is right above, in SV.
- **The light red** is the event line's colour for a failure (`.res.bad`), not Alarm Red, which the PV digits use.
- **One line at every size.** The narrowest faceplate is 229 px, at 1180 px wide. I first had "won't stop at 150.0 °F"
  and "· still heating by hand". The first left 1 px with a target like 206.5, and the second wrapped. A line that
  wraps as the water passes the target would push the buttons under it down just as the brewer reaches for the element. Now
  the amber lines keep 14 and 18 px spare. The red one keeps 11 px up to 86.5 °F past (a target of 120 °F at the boil),
  and 6 px for a three-digit gap, which needs a target below 107 °F.

In `screen.js`, as in the mockup:

```js
/* an element on by hand: its vessel in MANUAL, and no AUTO running it, neither its own nor the mash tun's HERMS.
   Nothing stops it at the target, so the faceplate says so. t: the target it won't stop at, or null (none, or one at
   or past where BOIL starts). over: "boil", "target" or "" */
const BY_OVER = 2; // °F; 1 °C
function byHand(v) {
  const el = v === "hlt" ? st.a.hltEl : v === "bk" ? st.a.bkEl : null, V = st.v[v];
  if (!el || !el.on || el.by || V.mode === "auto" || (v === "hlt" && st.v.mt.mode === "auto")) return null;
  if (v === "bk" && !(M.BKNEW && bkHoldT() != null)) return null;
  const raw = v === "bk" ? bkHoldT() : V.sv, t = raw != null && raw < bkLetGo() ? raw : null;
  return {t, over: V.pv >= bkLetGo() ? "boil" : t != null && V.pv >= t + BY_OVER ? "target" : ""};
}
function byHandLine(v, w) {
  if (w.over === "target") return `<span class="alarm">${(st.v[v].pv - w.t).toFixed(1)} ${M.U} above target · heating by hand</span>`;
  if (w.over === "boil") return `<span class="alarm">Near the boil · heating by hand</span>`;
  return `<span class="warn">Heating by hand · ${w.t != null ? "won't stop at target" : "until you turn it off"}</span>`;
}
```

In `devHTML`, after the no-target line and before the MANUAL one:
`const w = byHand(v); if (w) return byHandLine(v, w);`. In `bkLine`, the MANUAL line becomes
`if (V.mode !== "auto") { const w = byHand("bk"); return w ? byHandLine("bk", w) : "MANUAL · element by hand"; }`.
In the stylesheet, beside `.dev .warn`: `.dev .alarm{color:#ff9b93;font-weight:600}`.

### CraftBeerPi's alarm

- **When:** a kettle's element is on by hand, as above. And for 30 s of the brewing clock (`cbpi.api.clock`, so 60× gives
  the same results) either:
  - its temperature has been 2 °F (1 °C) or more past its target; or
  - it has been at or past where BOIL starts: the boil kettle's Boil_Threshold less 3.6 °F (2 °C).

  The target counts as above: set and above 0, below where BOIL starts, and on the boil kettle only a target below BOIL.
  The boil kettle at BOIL, or with no target, never raises it.
- **At most twice in one stretch of heating by hand:** once past the target, once near the boil. A stretch ends when the
  element goes off, the kettle's AUTO comes on, or its target changes. So if the brewer OKs it and walks away, it comes back
  once, before the water boils, and no more. If he switches the element on by hand when the kettle is already past its
  target, it comes 30 s later. That's meant: heat is going into something already too hot.
- **An error (NotificationType.ERROR), with no buttons.** The screen gives it its own OK.
  - Why an error: the M84 order puts CraftBeerPi's errors first, before a run-out timer and a step's question, and
    something that arrives first beeps. As a warning without buttons it would wait behind a hop alert or the sparge's
    question, and, arriving behind one, make no sound. This is the one time heat goes in with nothing watching the
    temperature. It's the same kind of thing as "No temperature reading - heating suspended", which is an error too.
  - Its line stays red after OK, with "seen" (next section).
  - Two beeps as it arrives, as for any alert, and no repeating sound: the rule is that only a run-out timer
    repeats.
- **Not kept for a page opened later.** The faceplate's red line shows the same thing there, for as long as it's true.
- **Title:** the kettle's name. **Words**, with the target as set ("150 °F", "152.5 °F"):
  - "Above its 150 °F target and still heating: its element is on by hand, and in MANUAL nothing stops it at the target.
    Turn the element off, or put the HLT in AUTO to hold 150 °F."
  - "Near the boil and still heating: its element is on by hand, and in MANUAL nothing stops it before it boils. Turn
    the element off."

  No temperature in the words: it would be out of date while the alarm waits for OK, and the faceplate has the live one.
  For the boil kettle, "put the Boil Kettle in AUTO to hold 150 °F": with your PID change, its AUTO holds it.
- **The mash tun** has no element of its own, so no alarm. Heated through the coil by hand (the HLT element on by hand,
  the wort pump running), it's covered by the HLT's alarm, as long as the HLT's target is one the mash can take.

### In your demo

- **Two new moments** (`?demo=byhand`, `?demo=byhand-past`). Brewing by hand, no recipe: at 08:17:31 the brewer sets the HLT's
  target to 150 °F, and at 08:18 holds its element on, in MANUAL. The HLT climbs about 2 °F a minute.
  - `#byhand`, at 08:52:40: 131.6 °F, the amber line.
  - `#byhand-past`, at 09:03:30: 153.3 °F, the red line, and the alarm in the title bar, raised at 09:03:22 and logged in
    red "from CraftBeerPi".
  - The graph history is `gDemo("byhand")` in `graphs.js`. There's no green SV line, because MANUAL holds nothing.
- **The tick** raises the alarm as CraftBeerPi would (`byHandBanner`, and the stretch rule in the 1 s tick). Behind
  another prompt it waits its turn there, as the mockup's other warnings do.
- **OK on it** goes through `seenLines()`, next section.

### Moments whose pictures change

None of the 32 there were. The two new ones are added.

### Not designed

- **A hard limit.** A line and an alarm only help someone who sees or hears them. A real limit on an element left on
  belongs in the rig itself, such as a thermal cut-out, or a low-water switch for the HLT as it empties. The rig is
  outside my work.
- **MANUAL with the element off** stays quiet, even with a target set ("MANUAL · element by hand"). The HLT sits like
  that through and after every sparge, with nothing heating, so a caution there would be noise.

### Changed, all in `proposal\`

- `brew-day.js`:
  - new: `byHand`, `byHandLine`, `byHandBanner`, `seenLines`, the alarm in the 1 s tick, `#byhand` and `#byhand-past`;
  - changed: `devHTML`, `bkLine`, and the OK in `cmdBanner`.
- `brew-day.css`: `.dev .alarm`.
- `graphs.js`: `gDemo("byhand")`.
- `brew-day.html`: the two moments in the strip, and the scene list.

### Checked

- **Presses**, 25 checks, with the page's clock run forward:
  - OK clears the title bar, adds no line, and the line says "seen", still red. The faceplate stays red, and nothing more
    comes in the same stretch.
  - The element off brings back "MANUAL · element by hand". Held on again, there's no alarm at 20 s and the alarm at 30
    s. OK marks both copies "seen".
  - Near the boil: the red line, and a second alarm 30 s later, then no third.
  - AUTO: the usual "below target" line. No target, or 212 °F: "until you turn it off". Under the HERMS: not by hand.
  - The boil kettle: with 150 °F, amber, then red, then the alarm. At BOIL: unchanged, no alarm. `?bk=today`: unchanged.
  - No page errors.
- **Fit**: all four lines, on the HLT and the boil kettle, at 12 sizes from 1920×950 to 360×780, with graphs and without
  (144 states). Each is one line, nothing scrolls sideways, and the buttons under the line never move as it changes.
- **Pictures and lines**, before and after: all 32 moments at 1920×950, 960×1200 and 390×844 with graphs and without, and
  at 1920×950 with `?bk=today` and `?timers=today`. 224 pictures, all identical, and every moment's lines are the same.

### Built (13 Nov, midday)

Brett built all three of today's sections together: web UI 0b299b8, built in 0ff9458 as main.61b624e7.js, live on 8012.
This one is M87, with the alarm in a new core extension, `cbpi/extension/byhand` (core c70bd9f).

- **As designed:** the four lines, `#byhand` and `#byhand-past`, the demo's alarm tick, and CraftBeerPi's alarm as an
  error with the words above.
- **Two small differences, live only, both fine:**
  - On a Celsius brewery the 2 °F is 1 °C.
  - CraftBeerPi raises the alarm 30 s after the first reading past the line, one second later than the mockup's 30th
    tick.
- **Seen live:** in a slow test run the HLT stayed on long enough to near the boil, and the second alarm, "Near the
  boil", came as designed.
- **Tests:** the picture test 529/529 over 34 moments, now with `#byhand`, `#byhand-past` and the alarm's OK pressed;
  Settings 104/104.

## OK on a warning or an error, from any screen: ready to build (13 Nov)

Your questions, after the brewer chose that an OK in Brew Day clears his warnings in BrewScribe too ("the alerts that I've
already acknowledged in BrewDay are there waiting for me in BrewScribe.. that's annoying"):

1. **Should one OK'd elsewhere leave this screen's title bar? Yes.** That includes another Brew Day screen and
   BrewScribe. It's one brewer with a monitor and a phone, and it's what an answer to a question already does.
2. **Its line: no new line, and no beep.** Something leaving the title bar never beeps.
   - **A warning's line turns plain, and an error's stays red.**
   - **New: both add "seen"**, after "from CraftBeerPi", in Soft Steel, as "its override switch can still run it" does
     (`e[4]`). So the change isn't carried by colour alone (The Say It Twice Rule). In M82 I left the words as they were
     because "OK tells CraftBeerPi nothing"; now it does. "Seen" is the core's own word for it.
   - The same goes for an OK on this screen.
   - A warning that left the title bar without an OK keeps the words it has. That's one pushed out by newer ones (the
     cap of 10), or one kept from an earlier page. Nobody OK'd it, so it goes plain without "seen", as now.
3. **One OK clearing every copy with the same words: yes.** Please also show identical errors once in the title bar, as
   you do warnings. The count then says how many presses are left: one OK clears them all. Each copy keeps its own line
   in LOG, and each says "seen". A copy that comes after the OK is news: it shows, and beeps if it goes to the front.
4. **The limits** (a warning from before a restart, or more than 100 ago, clears only where it's OK'd): fine.
5. **DESIGN.md**: the M82 line is replaced. The Amber Means Waiting Rule now says this.

In `screen.js`, where CraftBeerPi says a warning or error was seen (and on OK here): each line whose words are its
"Title: message" and whose result is "from CraftBeerPi" gets `e[4] = "seen"`, and if it's amber (`"wait"`) it turns
plain. Errors keep `"bad"`. Then `saveEvents()`. In the mockup that's `seenLines(words)`, which the OK calls. The mockup's
only warning or error without buttons is the new heating-by-hand alarm, so `#byhand-past` shows it.

### Checked

In the walk above: OK on the alarm leaves no new line, and every copy with its words says "seen", still red.

### Built (13 Nov, midday)

M88, in the same build as the last section (main.61b624e7.js), with core a3b25a0. An OK on this screen sends
`POST /notification/<id>/seen`. CraftBeerPi tells every page, and also gives a page the list of what was seen as it
connects. Lines say "seen" only where they were still amber or red, so a warning pushed out, or kept from an earlier
page, is left plain, as designed. Identical errors show once. A new live walk, test_e2e_brewday_seen, runs a monitor, a
tablet and a phone on a server of its own: 65/65, and 37/65 on the build before.

## A hold held by a PID: the line, the hold's words and the demo's numbers: ready to build (13 Nov)

You put BoilPower 0.0.3.post8 on both simulators: any target below the boil is held by a PID, with nothing to switch
on. The request was "I think the boilPower should also be able to do PID control", then "I think this behavior
should be automatic". Three things on the screen were out of date. Here they are, decided:

### 1. The line under the window: it reads exactly like the HLT's

Agreed with you: drop the branch that said "1.2 °F below target · heats again at 166.4 °F". There's no rest band any
more, so it would say something untrue: the element can be off just below the target while the wort still rises, and
it comes back on as soon as the rise slows. A hold now reads as the HLT's does under its own PID: "1.6 °F below target ·
about 3 min at this rate", "At target", "18.4 °F above target". In `bkLine`, the hold branch becomes:

```js
  /* with M.BKNEW, a hold is a target like the HLT's, and from BoilPower 0.0.3.post8 a PID holds it as the HLT's PID
     holds its own, so its line reads exactly like the HLT's. The element can be off just below the target while the
     wort still rises, and comes back on as the rise slows, so the line doesn't say where it heats again */
  if (ho != null && M.BKNEW) {
    const d = ho - V.pv;
    if (Math.abs(d) < 0.3) return "At target";
    const eta = GRAPHS ? graphETA("bk") : "";
    return (d > 0 ? `${d.toFixed(1)} ${U} below target` : `${(-d).toFixed(1)} ${U} above target`) + (eta ? ` · ${eta}` : "");
  }
```

The element's button needs nothing: in a hold it says HEATING or OFF, "tap to pause", whatever the PID does.

### 2. The hold's words, in `#hold`

BoilPower's notice as 0.0.3.post8 sends it, which I checked in its source and saw it log:
"Boil Kettle: Holding 170.0, its target, instead of boiling: a PID sets the element's power, up to 100%. To boil, set
its target to 206.6 or above. · from CraftBeerPi". It changes in `#hold`, and in `#whirlpool` and `#finished`, which are
built on it (your demo.js line 162).

### 3. The demo's numbers, from the plugin itself

Rather than guess, I ran the real plugin with your `test_boilpower_pid_hold.py` model of the simulators' kettle (40 L,
5.5 kW, losing 25 W/K, probe 20 s behind), from the stand's 166.3 °F with Heat and hold at 17:14:31, as in `#hold`. It
reads, with the element's power:

| After Heat and hold | Probe (the PV) | Power |
| --- | --- | --- |
| 5 s | 166.3 °F | 52 % |
| 1 min | 166.4 °F | 59 % (the integral building up) |
| 2 min | 167.2 °F | 41 % (the brake on the rise coming in) |
| 3 min | 167.9 °F | 37 % |
| 4 min 9 s, `#hold`'s 17:18:40 | 168.4 °F | 37 % |
| 7.5 min | 169.5 °F | 31 % |
| 11 min | 170.0 °F | 27 % |
| 13 min on | 170.1 °F | 26 % |

It climbs more slowly than the old hold did, and that's the point: it doesn't pass 170 °F. So `#hold` and
`#whirlpool` now show what 8012 will:

- **PV 168.4 °F** (was 169.4) and **OUT 37 %** (was 35).
- The line: "1.6 °F below target · about 3 min at this rate", or "1.6 °F below target" without graphs.
- The graph: the readings above at one-minute steps, and the OUT band from 56 % in the first minute down to 37 %.
  `#finished` carries on to 170.0 °F at 17:25:30, with 26 % from 17:27, until the stand ends at 17:28:10.

**An older BoilPower (`?bk=today`) keeps the old numbers**: 169.4 °F, 35 %, the eased band. That's what its own hold
did, and it's the faceplate the screen keeps for one.

### `holdOut`, for the demo's presses

```js
/* From 0.0.3.post8 a PID sets a hold's power: 14 % for each °F short, up to 100 %, plus what its integral has built up
   near the target, less a brake on the wort's rise. A hold just begun has built up nothing (52 % at 3.7 °F short, the
   plugin's first pass); one already running has built up about what the kettle loses where it holds, 21 % at 150 °F and
   26 % at 170 °F on the simulators' kettle. An older BoilPower uses _hold_climb_power */
function holdOut(T, pv, running) {
  const below = T - pv;
  if (M.BKNEW) return Math.round(Math.min(100, Math.max(0, 14 * below + (running ? Math.max(0, 21 + (T - 150) / 4) : 0))));
  // …the older BoilPower's model, unchanged; for it, running means the element was already heating…
}
```

`running` means the hold's PID was already going. That matches when the plugin makes a new one: as a hold begins, and
again whenever the logic starts.

- **AUTO switched on with a hold** (`setMode`): `false`, a new PID.
- **Carrying on after a pause** (`cmdPause`): `true` with the new BoilPower. The PID keeps what it built up, and only
  stops building while paused.
- **A new target while AUTO runs** (`bkRetarget(was)`): `was` is `bkHolding()` taken just before the target changes, in
  `cmdBkTgtSet` and in `stepTarget`. From one hold to another, the PID carries on; from BOIL, a hold starts a new one.
  With an older BoilPower, `bkRetarget` keeps passing `el.on`.

In the mockup, carrying on in `#hold` gives 48 % (14 × 1.6 + 26), and a Whirlpool step setting 170 °F from BOIL at
166.3 °F gives 52 %.

### Also changed

- `boil-kettle.html`, the side-by-side page: `#hold`'s caption says SV 170.0, OUT 37 % and "1.6 °F below target", and
  that a PID holds it.
- DESIGN.md: the boil kettle's line no longer mentions resting. The two older sections here that described it ("The
  boil kettle's target, KEEP BOILING and a forgotten pause") point to this one.

### Moments whose pictures change

- `#hold` and `#whirlpool`: the boil kettle's PV, OUT, line and graph. Also the event line on wider screens, because the
  hold's notice is their newest line (on a phone its ellipsis comes before the words that changed).
- `#finished`: the boil kettle's graph, in the 30-minute span.
- LOG's hold notice in all three.
- Nothing with `?bk=today`.

### Changed, all in `proposal\`

- `brew-day.js`:
  - `#hold`: PV, OUT and the notice;
  - `bkLine`: the rest branch gone;
  - `holdOut`: the PID for the new BoilPower;
  - `cmdPause`, `bkRetarget(was)`, and their callers `cmdBkTgtSet` and `stepTarget`.
- `graphs.js`: `#hold` and `#finished`'s boil kettle history, for the new BoilPower.
- `boil-kettle.html`: the caption.

### Checked

- **The plugin's own numbers**: 0.0.3.post8's source loaded by path, read-only, with your test's simulators' kettle.
  Also held from cold to 150 °F (it passes it by 0.3 °F, then 20-21 %) and from 148 °F (28 % at once), which agree with
  the model above.
- **Presses**, 15 checks with the clock run forward:
  - `#hold`: a pause, then carrying on, gives 48 %, and the line still reads like the HLT's. Retargeting to 165 °F,
    above the wort, turns the element off, and the line says "3.4 °F above target". Back to 169 °F gives 34 %, BOIL 100 %,
    and 170 °F from BOIL 22 %.
  - With the element off 1.0 °F below the target, the line says only that, with no "heats again".
  - AUTO switched off and on again gives a new PID, 14 %.
  - The Whirlpool step from BOIL gives 52 %.
  - `#handhold` is unchanged.
  - `?bk=today` keeps the old model.
  - No page errors.
- **Pictures and lines**, before and after: all 32 moments at 1920×950, 960×1200 and 390×844 with graphs and without,
  and at 1920×950 with `?bk=today` and `?timers=today`. 224 pictures, 208 identical. The other 16 are `#hold`,
  `#whirlpool` and `#finished`, and checked region by region, each differs only in the boil kettle's faceplate and the
  event line. Lines differ only in those three moments, and only in the hold's notice.

### Built (13 Nov, midday)

M86, in the same build (main.61b624e7.js): `bkLine` without "heats again at", `holdOut(running)`, `bkRetarget(was)`, the
notice's new words and the graph's numbers. The picture test, 529/529, covers `#hold`, `#whirlpool` and `#finished`.

## RESET after STOP: ready to build (13 Nov)

On 8012: "Seems to me that there needs to be a way to reset the brewday progress after hitting Stop". I asked the brewer
one thing, what Brew Day should show after a reset, and he chose "The same recipe, back at step 1, waiting for START".
That's `POST /step2/reset`, not `/step2/clear`: the recipe stays loaded, and so do any changes he made in Brew Steps,
which a clear would lose. Another recipe is the RECIPE BOOK tab, as now.

What a reset does, from `StepController.reset_all` as you described it and as I read it: refused while a step runs;
every step back to not started; the time a step had run forgotten (a 40 min rest stopped at 16 runs all 40 again);
permission to carry on after a restart and what the steps kept about this brew forgotten; the mash pH reminder
cancelled; the brew's questions taken down (`retire`, reason "withdrawn"). It switches nothing. No step's `reset()`
switches a kettle or an actor either (I read all nine in `mashstep`). It clears `_started_at` too, so the graphs lose
their step marks and DAY goes back to the last 8 hours, by themselves (`history.js`).

### The middle button: STOP, or RESET

`recipeHTML`'s middle button, by the recipe's state:

| State | Middle button |
|---|---|
| A step runs | STOP, "tap to stop", as now |
| Nothing runs, and some step has begun: stopped, failed, done, or the boil held for you | **RESET**, "back to step 1" |
| Not begun: loaded or reset, nothing done | STOP, greyed, "not running", as now |

In the mockup that's `begun = r.state === "stopped" || r.cur > 0`, and RESET shows when `!run && begun`. Its pending
label is RESETTING… (`st.pend["r:reset"]`, greyed with WAIT); with no connection it's greyed with PAUSED, as the
others.

Why STOP's place: it's where the brewer's eye already is after STOP, it's a stopwatch's Reset (shown once it's stopped), and
the row doesn't change. The label changes and the status line and the step both say STOPPED, so the state shows twice.
A tap only opens a question, so a second tap meant for STOP does no harm.

It shows in the boil's hold too, where STOP is greyed and CraftBeerPi allows a reset, as its own Brew Steps page does.
Without it, the only road back from that hold on Brew Day was to start the boil and stop it.

### RESET asks first

A tap on RESET opens a question in the recipe column, in the box NEXT STEP's skip uses, under the three buttons
(`resetConfirmHTML`). One question at a time: opening either closes the other. Escape closes it.

> Reset the recipe to step 1, **MashIn**? CraftBeerPi forgets that steps 1 and 2 are done and that Saccharification has
> run 16 of its 40 minutes. Kettles, pumps and timers stay as they are.
>
> [RESET TO STEP 1] [STAY AT STEP 3]

The sentence is built from what's true:

- **Steps done**, `n = r.cur`: none, "step 1 is done", "steps 1 and 2 are done", or "steps 1 to 4 are done".
- **The stopped step's minutes**, only while it's stopped with a timer it has started: "Saccharification has run 16 of
  its 40 minutes", whole minutes rounded down, or "under a minute". Minutes, not 16:19, which reads as a time of day.
- Both joined: "CraftBeerPi forgets that … and that …." Neither: "Nothing has been done yet."
- **"Its questions waiting for you are taken down."** only while one waits whose title is one of the recipe's step
  names, Hop Alert, Brewing Complete, Resume brew? or BrewScribe (`brewQuestions()`): the ones the reset takes down,
  BrewScribe's by itself (logger.15). Not a timer's alarm, a warning or another plugin's question.
- **"Kettles, pumps and timers stay as they are."** always ("and the rest timer" with an older CraftBeerPi).

The answers: RESET TO STEP 1 (the Answer White button) and STAY AT STEP 3 (`STAY AT STEP ${r.cur + 1}`, or STAY
STOPPED when stopped at step 1), side by side as SKIP TO … and KEEP GOING are. Neither is the default.

Keep it open while its words stay true. Close it when the middle button stops being RESET (a step starts, the recipe is
reset or replaced, or there's no recipe), or the current step changes (as `confirmFor`). In the mockup, `recipeHTML`
only draws it while `!run && begun`, and START, STOP and ALL OFF close it.

**Please don't reuse line 2042 as it stands.** It closes NEXT STEP's question when `st.recipe.state !== "running"`, and
a stopped recipe isn't running. So on a stopped recipe, NEXT STEP's question closes by itself at the next update,
within seconds of opening. The mockup keeps it open, and its words stay true: on a stopped step CraftBeerPi's NEXT
marks it done and starts the next one. I'd close NEXT STEP's when there's no recipe, `cur` changes, or the recipe is
`ready`, where NEXT STEP is greyed. Then RESET's can use the same rule, with "the middle button is RESET" in place of
"ready".

### RESET TO STEP 1

`POST /step2/reset`, logged "Recipe reset to step 1" with "confirmed". Please confirm it from the steps, not the 200.
`/step2/reset` answers 200 even when `reset_all` refuses because a step runs, which another screen's START could cause
between the question opening and the press. So, as `liveSetting` does: after the 200, wait up to 3 s for every step to
read I. If they do, "confirmed". If they don't, it fails like any command: "failed", and an alarm, "The recipe was not
reset. A step may be running." with OK. Better still, if you'd change the core: answer 409 with the reason when
`reset_all` refuses.

Then CraftBeerPi's steps arrive all I, so `liveRecipe` gives `ready` at step 1:

- The status line says "Ready to start · step 1 of 7", and step 1 says READY.
- START is held, as always, and the middle button is STOP, greyed, "not running".
- NEXT STEP is greyed (next part).
- The questions it took down turn "no longer needed" in LOG, as any question CraftBeerPi withdraws already does. The
  title bar clears, or moves to what's left.
- The wort pump is drawn by the mash tun again, since the boil is I.
- Started from step 1, the boil power goes back to the usual, as now.

The mockup's `cmdReset` does all this, and also clears the demo's graph marks (`st.hist.steps = []`, `start = t − 8 h`).

### LOG: a reset on another screen

In `observe()`: when every step is I now, all with the same ids as before, at least one wasn't I before, and this screen
didn't press RESET in the last 10 s (`own.reset = Date.now()` in your `liveReset`), log "Recipe reset to step 1" with
"from another screen". That covers the Brew Steps page's Reset and another Brew Day.

The same recipe loaded again from another page has the same ids, so it reads as a reset. The effect is the same, so
that's fine. A different recipe has new ids and isn't caught.

### NEXT STEP on a recipe not begun: greyed (a fix, found while designing RESET)

On a recipe loaded or reset, nothing done (`ready`, not `held`), NEXT STEP is offered "to Protein Rest", and its
question asks "Skip the rest of MashIn and start Protein Rest at 126 °F?". But `StepController.next()` with nothing
running and nothing stopped calls `start()`. So SKIP TO PROTEIN REST would start MashIn: heat with two taps and no held
press, and a line saying "Skipped to Protein Rest". You can reach this today after a LOAD, and after a reset you'd be
there every time.

Now NEXT STEP is greyed there, as before a held boil, with "not started" under it. Tapped, it says "MashIn hasn't
started yet. To begin it, hold START." (`NOT_BEGUN(s)`, after `HELD_NEXT`). In `recipeHTML`, `notBegun = r.state ===
"ready" && !r.held` greys it, and the held boil keeps HELD_NEXT. That makes the rule "NEXT STEP only while a step runs or
is stopped", which is when CraftBeerPi's NEXT does what it says.

### In your demo

Three new moments, from `#mash`:

- **`#stopped`**, at 14:32:44. STOP pressed at 14:32:31 in Saccharification, 23:41 left (16 of 40 minutes run). STOP
  took the mash tun's AUTO off, as the MashStep does, and its HERMS with it: HLT element off, wort pump off, the HLT's
  own 168 °F back as its SV. RESET in the middle. LOG adds "Recipe stopped · confirmed".
- **`#reset`**: `#stopped` with RESET's question open (`open: {confirmReset: true}`).
- **`#reset-done`**, at 14:33:04. RESET TO STEP 1 at 14:32:58: ready at step 1, STOP and NEXT STEP greyed. LOG adds
  "Recipe reset to step 1 · confirmed".

`graphs.js`: in the three, the mash tun's and the HLT's SV end at 14:32:31, and the HLT's OUT goes to 0. In
`#reset-done` there are no step marks, and DAY starts 8 hours back.

### Moments whose pictures change

- `#boil-hold`: its middle button reads RESET, "back to step 1", where STOP was greyed. In every configuration.
- The three new ones.
- Nothing else, with the versions' line (next section) hidden.

### Changed, all in `proposal\`

- `brew-day.js`:
  - new: `NOT_BEGUN`, `resetConfirmHTML`, `brewQuestions`, `cmdReset`, `#stopped`, `#reset` and `#reset-done`;
  - changed: `recipeHTML` (the middle button, NEXT STEP, the question), `run` (`r:reset`, `r:reset-yes`,
    `r:reset-no`), the Escape key, `cmdStart`, `cmdStop` and `cmdAllOff` (close it), and `load` (`confirmReset: false`).
- `graphs.js`: the three moments' history.
- `brew-day.html`: the three in the strip and the scene list.

### Checked

- **The walk** at 1920×950, from `#mash`:
  - STOP gives RESET "back to step 1".
  - RESET opens the question, word for word as above, with RESET TO STEP 1 and STAY AT STEP 3.
  - RESET TO STEP 1 shows RESETTING… and then "Ready to start · step 1 of 7", with START held and STOP and NEXT STEP
    greyed. LOG: "Recipe reset to step 1 · confirmed".
  - NEXT STEP tapped then says "MashIn hasn't started yet. To begin it, hold START."
- **Presses:**
  - From `#boil-hold`: "steps 1 to 4 are done", the questions sentence, STAY AT STEP 5. After the reset, the boil's
    question is "no longer needed", the title bar says NO ALARMS, and the pump is back by the mash tun.
  - Escape, STAY AT STEP 3, NEXT STEP and ALL OFF each close the question.
  - RESET and NEXT STEP never leave two questions open.
  - With the keyboard, Enter on RESET keeps the focus on RESET; Tab reaches NEXT STEP, then RESET TO STEP 1, then STAY
    AT STEP 3.
  - With no connection, RESET is greyed and says "No connection. Controls are paused."
  - Running (`#mash`), the middle button is STOP. With no recipe (`#finished`), there's none.
  - No page errors.
- **Fit:** the three moments at 1920×950, 1180×820 and 390×844. The question fits every width, and at 1180 the step
  list keeps the current step.
- **Pictures**, before and after, with the versions' line hidden: all 32 older moments at 1920×950, 960×1200 and 390×844
  with graphs and without, and at 1920×950 with `?bk=today` and `?timers=today`. 224 pictures, 201 identical. The other
  23 are `#boil-hold`'s middle button (7) and this morning's PID hold in `#hold`, `#whirlpool` and `#finished` (16, as
  before).

### For you to decide, or tell me

- The core answering 409 when it refuses a reset (above).
- NEXT STEP's question on a stopped recipe (line 2042).
- For your picture test, presses I'd add with the moments: RESET's question from `#stopped` (`[data-cmd="r:reset"]`),
  and NEXT STEP's why in `#reset-done` (`#recipe [data-cmd="r:next"]`).

## The versions in the recipe column's last line: ready to build (13 Nov)

The request: "it would be nice if the BrewDay dashboard showed the current version somewhere inconspicuous". Your numbers, as
you proposed them: the web UI's release and the commit it was built from, with when it was built, and CraftBeerPi's
the same way. An installed release has its release numbers only.

### Where: the recipe column's last line

`verHTML()` is the last child of `#recipe`, in every state (a recipe, or brewing by hand), at every width (`order: 9`,
so it stays last where the column reorders):

- **On a monitor:** the bottom left corner, under TIMERS.
- **On a tablet or a phone:** the end of the page, where the column ends. That's where pages keep such things, so it's
  easy to look for and costs nothing while brewing.

Not chosen:

- **The title bar:** too precious, and long brewery names.
- **The event line:** it's for events.
- **LOG:** hidden.
- **The drawing's corner:** no room at 1180.
- **Settings:** the request said the dashboard.

### What it says

Two parts, each kept whole:

- `Web UI 0.5.1.a3.post12+0b299b8, built 13 Nov 11:12`
- `CraftBeerPi 4.7.7.post36+a3b25a0`

They sit side by side, 14 px apart (`flex-wrap`, `column-gap`), where the column has room: 1920 wide, and tablets.
Where it doesn't (1180 and 1366 wide, and phones), CraftBeerPi's goes on a second line. At 12 px the full line takes
369 px, against 410 px of column at 1920 and 306 to 336 px on phones.

- **An installed release:** `Web UI 0.5.1.a3.post12` and `CraftBeerPi 4.7.7.post36`, with no "built". It fits one
  line everywhere. The mockup shows it with `?ver=release`.
- **Before CraftBeerPi has answered** (or with one that doesn't say): the web UI's alone.
- **"Web UI"** is your word, and the About page's GUI, in plain words. **"built 13 Nov 11:12"** is when the bundle was
  made, on the clock of the machine that built it.

It's plain text that can be selected and copied into a message: not a button, no tooltip.

### How it looks: Fine Print

`.ver`: 500 12px/1.3 Barlow Condensed, letter-spacing .02em, Dim Steel (`--text-3`), `margin-top: auto`. It's the
quietest thing on the screen: Dim Steel on Panel Slate is 5.8:1, above AA for small text. DESIGN.md has it as Fine Print.

### It steps aside on a monitor while the column needs its room

It costs the step list 26 px at 1920 and 41 px at 1180 and 1366. Where that mattered, it steps aside on the one-screen
layout (1180 px wide and up):

- **While a timer's editor is open** (`data-tedit`, as the step list already does). Without this, the editor spilled
  past the column at 1920×950 (`#timer-names`, 18 px), and spilled 41 px more at 1180 and 1366.
- **While something in the column waits for you:** NEXT STEP's or RESET's question, or a timer that has run out
  (`data-asking`). Without this, a timer's alarm at 1180×820 cut the current step's bar.

```css
@media (min-width:1180px){.recipe:is([data-tedit],[data-asking]) .ver{display:none}}
```

`renderAll` sets `data-asking` from `st.confirmNext || st.confirmReset || st.tmrs.some(t => t.state === "done")`.

### In your demo

Fixed, made-up values, the same in the mockup and the build, so the pictures don't change with each build:

- `Web UI 0.5.1.a3.post12+abc1234, built 12 Nov 21:47`
- `CraftBeerPi 4.7.7.post36+def5678`

`abc1234` and `def5678` are plainly made up, and the right length. `?ver=release` is in the mockup if you want the
short form in a picture too.

**For your picture test:** a build without the line is compared with the mockup's `?ver=none`, as `?brewscribe=none`
does for the tab. The released build's seven moments (`FIRST`) need it from now on: with `?graphs=none&bk=today&
timers=today&wp=today&brewscribe=none&ver=none`, all 35 of their pictures, at your five sizes, are identical to the
mockup before today. Without `?ver=none` they differ, at the foot of the recipe column.

### Moments whose pictures change

Every moment, in the recipe column: the line, and a step list 26 px shorter at 1920 (41 px at 1180 and 1366), so
long lists show a little less. On a monitor it's not shown in `#timer-new`, `#timer-names`, `#timer-nonames`,
`#timer-done` and `#reset`.

### Changed, all in `proposal\`

- `brew-day.js`: `VERSIONS` (and `?ver=release`, `?ver=none`), `verHTML`, and `renderAll` (the line, and `data-asking`).
- `brew-day.css`: `.ver`, and its step-aside rule.
- `brew-day.html`: a line in the notes.

### Checked

- **Measured** in the screen's font: the parts' widths at 12 and 13 px, and the column at six widths.
- **Fit:** all 37 moments at 1920×950, 1920×1080, 1366×768 and 1180×820, plus 1180×820 with no graphs, `?timers=today`
  and `?bk=today`, and 1920×950 with no graphs (296 pages). Each was checked with and without the line. Nothing spills
  further with it, and at those sizes the current step is never cut where it wasn't before. In `#hold` and `#whirlpool`
  at 1180 the last step sits flush at the list's bottom, 0.56 px over by rounding, which is whole in the picture.
- **Missed:** 1440×900 without the timers. There the line cut the current step in eight moments, the Boil in `#hop` by
  39 px. It's whole now that `keepStepInView` runs without the timers too: see "The step list keeps the current step
  in view, with or without the timers", below.
- **Line counts:** one line at 1920, 1024 and 960 wide, and two at 1366, 1180, 390 and 360. `?ver=release` is one
  line everywhere.

### Found while checking, and changed since

With an older CraftBeerPi, which has no timers (`?timers=today`), the step list didn't follow the current step:
`keepStepInView()` ran only with the timers, in your `renderAll` and mine, since it came in with them. So on a short
window a late step could sit below the list's edge: `#boil-hold` at 1180×820 had the boil 183 px out of view, and
`#reset`'s question pushed step 3 33 px out. You asked for it to run always, and it does now: see "The step list keeps
the current step in view, with or without the timers", below.

## The sparge through the HERMS coil: ready to build (13 Nov)

The request, on 8012: "on my sparge step, I actually run the HLT water through the HERMS coil and then into the Mash
Tun to clean out the coil. It would be great if the drawing could show that." Asked whether the coil is the only way
the sparge water reaches the mash tun, the brewer answered: "Always through the coil: the HLT pump feeds the coil, and
the straight line over the top can go".

So the sparge line no longer goes straight into the top of the mash tun. It still crosses over the hot liquor tank, then
comes straight down the tank's right side into the coil's inlet. The sparge water runs through the coil, flushing the
wort out of it, and on into the top of the mash tun along the coil's own line: the line the wort takes while
recirculating.

### What the drawing shows

- **The sparge line:** from the HLT pump's riser over the hot liquor tank, as before. At the coil's riser it turns down
  and runs straight to the coil's inlet, on the same upright as the wort pump's line, which comes up to the inlet from
  below. Where it crosses the coil's outlet stub it hops over it: a half circle of radius 10, bulging towards the tank,
  so the two pipes don't read as joined. It's the drawing's only crossing, and I found no route without one: the
  HLT pump's own pipes, or its labels, are in the way of every other.
- **The coil, its inlet stub and its line to the mash tun** take the colour of what runs through them: Wort Gold while
  the wort pump recirculates, as now, and Liquor Cyan while the HLT pump sparges. The arrows go down into the coil and
  up out of it.
- **The valves:** the same four, in the same places, set the same way. During the runoff the sparge valve is OPEN and
  the coil valve CLOSED. The coil valve is on the wort pump's side of the junction, so it shuts the wort pump off from
  the coil. The HLT return is CLOSED and the line to the boil kettle OPEN. While a SpargeStep waits for Sparge started,
  the same four are marked SET OPEN or SET CLOSED.
- **Gone:** the straight line into the top of the mash tun, and its drop at the mash tun's centre.
- **Unchanged:** layout A, which has no sparge line, and the phone, which has no drawing.

### In `rig.js`

`rigGeom` loses `spargeIn`. In `rigSVG`, the sparge line ends at the coil's inlet, and the coil's old two paths become
three lines, so the stub into the coil and the line out of it can carry either liquid:

```js
  /* each pump's line is split where it branches, so the drawing can show either way:
     HLT pump: back round the hot liquor tank, or (layout B only) along the sparge line into the HERMS coil;
     wort pump: through the HERMS coil and back into the mash tun, or down and across to the boil kettle.
     The coil's inlet stub (coilIn) and its line out to the mash tun (coilOut) carry whichever pump feeds the coil: the
     wort pump's line comes up to the inlet from below (coilUp), the sparge line comes down to it from above. Where the
     sparge line crosses the coil's outlet stub it hops over it (HOP, the hop's radius), so the two don't read as joined */
  const HOP = 10, yOut = 164;
  const sparge = [`M${n(g.hltRiser)} ${yTop} V${ySp} H${n(g.coilRiser)} V${yOut - HOP} A${HOP} ${HOP} 0 0 0 ${n(g.coilRiser)} ${yOut + HOP} V242`];
  const coilUp = [`M${n(g.tee)} ${yPump} H${n(g.coilRiser)} V242`];
  const coilIn = [`M${n(g.coilRiser)} 242 H${n(a + 112)}`];
  const coilOut = [`M${n(a + 112)} ${yOut} H${n(g.coilTopRiser)} V${yTop} H${n(g.mtRet)} V${n(mRet)}`];
  const outline = [...(A ? [] : sparge), ...hltRet, ...hltIn, ...hltUp, ...xfer, ...coilUp, ...coilIn, ...coilOut, ...wortIn, ...wortOut];
  const chSp = [[(g.hltRiser + g.vSp) / 2, ySp, 0], [(g.vSp + g.coilRiser) / 2, ySp, 0], [g.coilRiser, (ySp + yOut - HOP) / 2, 90], [g.coilRiser, (yOut + HOP + 242) / 2, 90]];
  const chCoilUp = [[g.coilRiser, (242 + yPump) / 2, -90]];
  const chCoilOut = [[g.coilTopRiser, (yOut + yTop) / 2, -90], [(g.coilTopRiser + g.mtRet) / 2, yTop, 0]];
```

and in the SVG, in place of the one `ln-wort-coil` line:

```js
${rigLine("ln-wort-coil", "wrt", coilUp, chCoilUp)}
${rigLine("ln-coil-in", "wrt", coilIn, [])}
${rigLine("ln-coil-out", "wrt", coilOut, chCoilOut)}
```

The other paths and every valve are as they were.

### In `screen.js`: `renderRig`

In place of `on("#ln-wort-coil", mtw && !out)` and `on("#coil", mtw && !out)`:

```js
  /* the coil, its inlet stub and its line on to the mash tun carry the wort while the wort pump recirculates, or the
     sparge water, in the liquor's colour, while the HLT pump sparges through it */
  const coilW = mtw && !out, coilL = hp && sp;
  on("#ln-wort-in", mtw); on("#ln-wort-out", mtw); on("#ln-wort-coil", coilW); on("#ln-xfer", mtw && out);
  for (const s of ["#ln-coil-in", "#ln-coil-out", "#coil"]) {
    const n = $(s);
    if (!n) continue;
    n.classList.toggle("on", coilW || coilL);
    n.classList.toggle("liq", coilL);
    if (s !== "#coil") n.classList.toggle("wrt", !coilL);
  }
```

The HLT pump's lines and the valves are unchanged: `on("#ln-sparge", hp && sp)` lights the sparge line, and `setValve`
sets the four valves as before.

### In the stylesheet

```css
/* hot liquor in the coil: the sparge water, which runs through it on its way to the mash tun */
.coil.on.liq>*{stroke:var(--liquor)}
.rig-line .coil.on.liq>*{stroke:var(--liquor)}
```

### The words for screen readers (`rigDesc`)

- **Recirculating:** "…they are shown for recirculating, with the line to the boil kettle and the sparge line into the
  coil closed."
- **A SpargeStep waiting:** "Step 4, Sparge, is waiting for you to set them for the sparge: close the wort pump's line
  to the coil and the HLT return, and open the line to the boil kettle and the sparge line into the coil."
- **The runoff:** "The HLT pump sends hot water through the coil inside the hot liquor tank, flushing the wort out of
  it, and on into the top of the mash tun for the sparge. The wort pump moves wort from the mash tun down and across to
  the boil kettle." The old "past the HERMS coil" is dropped, since the coil is now in the sparge water's path.

### Moments whose pictures change

- **Every picture with the drawing**, on a monitor or a tablet: the sparge line's new route, unlit, and its hop.
- **`#sparge-run` and `#sparge-batch`:** the sparge water lit through the coil to the mash tun.
- **Unchanged:** every phone picture, everything outside the drawing, and LOG.

### Changed, all in `proposal\`

- `rig.js`: the sparge line, the coil's three lines, `spargeIn` gone.
- `brew-day.js`: `renderRig`, `rigDesc`, and the comment above `RUNOFF_NAME`.
- `brew-day.css`: the coil's liquor colour.
- DESIGN.md: the drawing's pipes and The Hand Valve Rule.

### Checked

- **Lit, in each phase,** at 1920×950:
  - `#mash`: the coil, its stub and its line in wort, the HLT return in liquor.
  - `#sparge-ready`: nothing lit, the four valves marked.
  - `#sparge-run`: the sparge line, the coil, its stub and its line in liquor, and the line to the boil kettle in wort.
  - `#sparge-batch`: only the liquor through the coil.
  - `#boil-hold`: only the wort to the boil kettle.
  - `#whirlpool`: only the wort pump's loop at the boil kettle.
  - No page errors.
- **The hop**, at twice the scale: it reads as a crossing, with an arrow pointing down into the coil on each side of it
  and one pointing up out of the coil.
- **Pictures**, before and after: all 37 moments at 1920×950, 960×1200 and 390×844 with graphs and without, and at
  1920×950 with `?bk=today` and `?timers=today`. 259 pictures: the 185 with the drawing differ only inside it, and the
  74 on a phone are identical. Every moment's LOG is the same, with no page errors.

## The step list keeps the current step in view, with or without the timers: ready to build (13 Nov)

You asked for this in the mockup: the current step stays in view whether or not CraftBeerPi has the timers. Until now
`keepStepInView()` ran only with the timers, since it came in with them.

### What changes

`renderAll` calls `keepStepInView()` on every draw, not only inside `if (TIMERS === "new")`. The function itself is
unchanged: when the list has more steps than room and the current step isn't whole, it scrolls the list so the step
sits 6 px below the list's top, or as far down as the list goes.

In your `screen.js`, whose line numbers have moved since I last quoted them:

- In `renderAll`, `if (M.TIMERS) keepStepInView();` becomes `keepStepInView();`.
- The comment above `function keepStepInView` becomes the mockup's:

```js
/* the step list scrolls, where it has to, so the current step is whole in view: on the one-screen layout the list is
   the part of the column that gives up height, to the timers, a question or an editor, with or without the timers */
```

### Why the release needs it

Without the timers, the versions line cut the current step off at 1440×900. In `#hop` the Boil lost its bottom 39 px
(23 px with `?ver=release`), and in `#boilpower` 27 px (11 px). My check of the versions line didn't include 1440×900
without the timers, so it missed this. With this change the step is whole.

### Moments whose pictures change

Only without the timers (an older CraftBeerPi: the mockup's `?timers=today`), on a monitor, and only inside the step
list. In each, the list scrolls to its end, which brings the current step whole into view.

- **The released build's seven moments (`FIRST`), at your five sizes:** `#hop` and `#boilpower` at 1440×900, with the
  full line or `?ver=release`. With `?ver=none`, only `#hop` at 1440×900 (see "The first draw comes before the
  fonts", below).
- **All 37 moments, with the full line or `?ver=release`:** 14 pictures of 185, and the same 14 in a graphs build with
  `?timers=today`.
  - At 1440×900: `#boil-hold`, `#hop`, `#boilpower`, `#heatup`, `#pause`, `#pause-long`, `#boiling`, `#hold`,
    `#whirlpool`, `#keepboil` and `#letfall`.
  - At 1920×950: `#boil-hold`, `#hold` and `#whirlpool`.
- **Unchanged:** every picture with the timers, every phone and tablet picture, and your `FIRST_PRESSES`.

### The first draw comes before the fonts

In your test's set-up, the mockup and your build both draw the step list before any of Barlow's 18 font files has
loaded (I checked your `main.61b624e7.js`). Laid out in the fallback font, the column comes out differently. So where
the current step only just fits once the fonts are in, the first draw can find it cut and scroll the list, and nothing
scrolls it back, because the step is whole there too. Both pages do this, the same way on every load I tried, so their
pictures should agree. The brewer loses nothing: the current step is whole either way, and only where the list starts
differs.

Where it happens:

- Without the timers: `#boil-hold` at 1920×950, and with `?ver=none` also `#hop` at 1440×900.
- With the timers, once your build has the versions line: `#sparge-run` at 1440×900, `#boil-hold` at 1920×1080 and
  `#timers` at 1920×950. The mockup scrolls the list there, and your build should too, since it also draws first in
  the fallback font.

If one of these pictures ever differs only in where the list starts, this is why.

### Not changed, for after the release: the list follows the step on every update

- In the mockup each draw makes the list afresh, from its top. In your build `morph()` keeps the list's scroll, and
  `renderAll` runs on every update from CraftBeerPi.
- So if the brewer scrolls the list to look back or ahead, and the current step leaves the view, the next update
  pulls it back within a few seconds.
- With the timers it has been like this since they came in. Without them it's new with this change.
- A better rule: scroll only when the current step changes or the list's height does (a question opening or
  closing), and otherwise leave the brewer's own scrolling alone. Tell me if you want it, after the release.

### Changed

- `proposal\brew-day.js`: the call in `renderAll`, and the comment above `keepStepInView`.
- `proposal\BUILD-NOTES.md`: this section; and in the versions section, "Missed" under "Checked", and "Found while
  checking".
- `DESIGN.md`: the Recipe Column's first line now states the rule. `.impeccable\design.json`: the same, in the Recipe
  Step List's description.
- `.impeccable\decisions\direction-log.md` and `.impeccable\surfaces\cbpi4gui-src-components-dashboard.md`: an entry
  each, and in the surfaces file the versions entry no longer says the line never cuts the current step.

### Checked

In your test's set-up: the page clock paused, the fonts served from `cbpi4gui\src\components\brewday\fonts`, and your
Chromium (1243, from `craftbeerpi4\.venv`) with your switches.

- **Before and after, all 37 moments at your five sizes,** in five set-ups: a graphs build with the timers and with
  `?timers=today`, and the released build's with the full line, `?ver=release` and `?ver=none` (185 pages in each,
  before and after).
  - With the timers, the list moved in none of 185.
  - Without, the current step was cut in 13 of 185 before (5 with `?ver=none`, so 8 came with the versions line), and
    in none after.
- **Your `FIRST_PRESSES`,** at 1920×1080 and 390×844, in the released build's set-up with the full line,
  `?ver=release` and `?ver=none`: the same before and after.
- **1180×820 without the timers:** the boil in `#boil-hold`, and step 3 under `#reset`'s question, were out of view
  and are whole.

## Hint lines under the pointer, greyed controls, and three lines under their contrast: ready to build (16 Nov, night)

The Settings session found that Dim Steel on Hover Slate is 4.46:1, just under the 4.5:1 a hint line needs, and a
button's second line reaches it under the pointer. Hardware and Settings now turn that text Soft Steel (7.0:1) under
the pointer; this does the same on Brew Day. Measuring for it found three lines under their minimum at rest, and
moving the pointer onto every greyed control found greyed lamps and ALL OFF lighting up.

### What changes

All in `brew-day.css`, so your built CSS follows through `scope-css.mjs`. No JavaScript.

- **Hint lines under the pointer** (one rule, after the hover backgrounds): on an available choice, TARGET, command
  button or timer row, Dim Steel text turns Soft Steel. Left as they are: a pressed choice (`.seg`, a picked name, a
  preset), TARGET's amber "no target" (`.tgtbtn.notgt`), START's white line on blue (`.tgo`), OK's dark ink on white
  (`.tok`), a run-out timer's amber line, and greyed buttons.
- **START in a timer's editor:** its second line (`.tact .tgo small`) is white. #dbe8f6 on #2a6fc0 was 4.06:1; white
  is 5.08:1, as SAVE's on Hardware and Settings.
- **A hop already added, on the current step** (`.step[aria-current=step] .adds .gone`): #c9d6e2, 4.98:1 on the step's
  blue. #93acc6 was 3.14:1. The ✓ still marks it as added.
- **Connection lost:** the smaller OUT and MODE values and the units (`.face.stale .aux dd`, `.face.stale .u`) are Dim
  Steel, 7.2:1 on the window. Stale Grey is 4.45:1 there, enough only for the large PV and SV, which keep it.
- **Greyed controls under the pointer:** ALL OFF's pointer rule skips a greyed ALL OFF (no connection, or SWITCHING
  OFF…), and the lamps' rule skips a greyed lamp, and a failed or locked one, which keep their own background as
  before. A greyed lamp took Hover Slate under the pointer, the recipe's RUNNING lamp in most moments among them, and a
  greyed ALL OFF turned red. Hardware and Settings get the same.
- **A new timer's name box:** its placeholder ("Timer 3") is solid (`opacity:1`), since Firefox fades placeholders. It
  was already 7.1:1 in Chromium, so nothing changes there.

### Moments whose pictures change

At rest, only these: `#timer-new`, `#timer-names` and `#timer-nonames` (START's second line in the timer editor);
`#boilpower`, `#keepboil` and `#letfall` (the hop already added); `#offline` (OUT, MODE and the units). Everything else
changes only under the pointer.

### Checked

- Every moment, all 40 (the three new ones included), at 16 sizes from 1920×1080 to 360×740: no text under its
  contrast minimum, no box over another where the one on top is see-through, no script errors, and, with the pointer
  on every line and button at 1920×1080 and 1366×768, no text in it under its minimum. A new timer's name placeholder,
  measured on its own: 7.1:1. One split word and some small targets were there before: see "Found, not changed".
- With the pointer on every greyed control in every moment at 1920×1080 and 1366×768: 184 controls, none changes its
  look, and each is `aria-disabled="true"`. Before, 9 changed. The available lamps and ALL OFF under the pointer, 338,
  look exactly as before the change.
- Before these fixes, the same measure found the three lines above under their minimum at rest (4.06:1, 3.14:1 and
  4.45:1), and Dim Steel at 4.46:1 under the pointer.

### Found, not changed

These were there before; tell me if you want any of them changed.

- At 360×740 the longest name to pick in `#timer-names`, WHIRLPOOL REST AND CHILL (24 characters, the most a name can
  have), breaks as "WHIRLPOO|L": its button is narrower than the word.
- The timer editor's presets are 43 to 44 px wide at 1180 to 1440 px, and 43 px at 360×740.
- The boil kettle's −5 %, −1 %, +1 % and +5 % are 32 to 40 px wide from 900 to 1280 px (in DESIGN.md: the element
  takes what HEATING needs first).
- The target and power editors' step keys (up and down 0.1°, 1°, 1 % and 5 %) are 54 px tall but 36 to 42 px wide
  from 900 to 1280 px.
- KEEP BOILING and SOUND (`.keep`) are 18 to 27 px tall, and the boil power button (`.svbtn`) 27 to 38 px, with tap
  areas that reach 44 px into the padding around them (in DESIGN.md).

## Timers brought back after a restart: the note on its own line, ready to build (16 Nov, night)

You asked me to look at post17's line for a timer CraftBeerPi brings back, decide its look, and add it to the mockup
as demo moments. 8012 runs post17, but no timer was running there when CraftBeerPi last started, so there was nothing
to see without pressing anything. So I put your build's text into the mockup's own rows, which use the same CSS, and
compared the two side by side at 1366×768 and 390×844.

### What I decided

- The note gets a line of its own across the row, under the name and state: "CraftBeerPi was off for 12 min". The
  state line keeps what it said before: "PAUSED · of 15:00", or "TIME'S UP".
- Regular Barlow, 500 15px, because it's a sentence. Prompt Amber on a paused timer, because CraftBeerPi paused it and
  it waits for the brewer to start it again (The Amber Means Waiting Rule). Prompt Cream on a run-out timer, on its
  Dark Amber Wash, as on its banner.
- While CraftBeerPi can't tell how long it was off: "CraftBeerPi was off; how long isn't known yet". "Yet", because the
  line changes to "…was off for 12 min" once the network sets the clock. The row's spoken label ends the same way, and
  a run-out timer's says "how long ago isn't known yet".
- It goes when the timer is started or answered, as now.

### Why not in the state line

The state line is 14 px condensed Dim Steel beside the big time. There, "PAUSED · CraftBeerPi was off for 12 min" took
three lines at 1366×768, and the unknown one four (two and four on a phone). In Dim Steel it read like the rest of the
state, though it's the one thing on the row that waits for the brewer. On its own line it takes one line on a monitor
or a phone, two at 1366 for the unknown one, and it's amber.

### What changes, against your screen.js 338eb52

In `trowHTML`:

- `sub` no longer carries the note:

```js
const of = `<span class="nw">of ${tfmt(t.run)}</span>`;
const sub = done ? "TIME'S UP" : run ? of : live ? `<span class="nw">PAUSED ·</span> ${of}` : "ready";
```

  The spans keep "of 20:00" whole, so a narrow row wraps "PAUSED ·" over "of 20:00". Before, a paused timer with ten
  minutes or more left wrapped "PAUSED · of" over "20:00" at 1366×768; `#timer-back-unknown` shows it. The text is the
  same, so `textContent` still reads "PAUSED · of 20:00".
- After the `.tsel` button, before `.tbtn`: `${back ? `<p class="toff" aria-hidden="true">${tOff(t)}</p>` : ""}`.
  It's hidden from screen readers because the button's label already ends with it.
- `tOff` while `t.off` is null: "CraftBeerPi was off; how long isn't known yet".
- `said`, for a run-out timer whose count-up isn't known: "how long ago isn't known yet".

In `brew-day.css`, after `.trow .tok:hover` (your built CSS follows):

- `.tsel .ts .nw{white-space:nowrap}`.
- `.trow .toff`: across the row (`grid-column:1/-1`), Barlow 500 15px/1.3, Prompt Amber, `text-wrap:pretty` so a
  two-line note doesn't leave one word alone.
- `.trow:not([data-state=done]) .tbtn{grid-column:2;grid-row:1}`: START or PAUSE stays beside the name, so the note
  can't push it down.
- On a run-out row the note is Prompt Cream, between the name and +5 MIN and OK.
- While another timer's editor is open, the note hides with the state line, so the editor keeps its room.

### Demo moments, for demo.js and the identity test

- `#timer-back`: a 12-minute cut, 14:20:31 to 14:32:31. Stir, counting down since 14:12:43, comes back paused at 7:12
  of 15:00. Yeast, set up for later, is as it was.
- `#timer-back-done`: the same cut, with Stir started at 14:10:00. It ran out at 14:25:00, during the cut, so it comes
  back run out, with its alarm in the title bar, counting up from then: +7:31.
- `#timer-back-unknown`: the same, before the network has set CraftBeerPi's clock. Stir shows "– –", and Yeast,
  counting down at the cut, comes back paused at 12:30 of 20:00.

In the mockup a timer's `at: null` means its count-up isn't known, which your `tUpKnown` reads in the demo. The run-out
timer's tick writes `tUpText(t)`, as yours does, so "– –" stays. The moments strip in `brew-day.html` has the three
after "A timer runs out".

### Your bench tests

`test_e2e_brewday_timers_restart.py` reads the note in the state line. It needs:

- `row()`: `off: t(".toff")` beside `sub`.
- Lines 322, 364 and 382: wait for `x["off"]`, not `"off" in x["sub"]`.
- Lines 323, 328, 366, 383, 386, 391, 400, 421 and 425: compare `sub` with "PAUSED · of …" or "TIME'S UP", and `off`
  with the note.
- Lines 56 and 57: `MARK = "how long isn't known yet"`, which line 490 looks for in the build, and
  `UNKNOWN = "CraftBeerPi was off; how long isn't known yet"`. Line 386's `"how long ago isn't known" in said` still
  holds.

`test_e2e_brewday_timers.py` line 312 ("PAUSED · of 5:00") still holds: the text is the same.

### Checked

- The three moments at 1920×1080, 1366×768 and 390×844: no script errors, and each row's state line, note, time and
  spoken label as above.
- The timer moments (`#timers`, `#timer-done`, the three new ones, `#timers-hand`, `#timer-new` and `#timer-names`) at
  16 sizes, 128 pages: no state line or note outside its box, and no timer's name cut short. The check catches a
  planted one: forced onto one line, both run outside their box at 1366×768 and 360×740.
- Every moment at 16 sizes: see the section above.

### Changed, for both sections

- `proposal\brew-day.css`, `proposal\brew-day.js`, `proposal\brew-day.html` and this file.
- `DESIGN.md`: Buttons (Hover / Focus, ALL OFF, Unavailable); Typography's Button line; Timers (the row's state line
  under the pointer, and "After a restart"); Connection lost (the smaller values and units).
- `.impeccable\design.json`, regenerated, and `.impeccable\decisions\direction-log.md`.

## Every key at least 44 px wide, and nothing moves as the steps come and go: ready to build (17 Nov)

You asked for three of the things I'd found: WHIRLPOOL split at 360 px, and the timer presets, the boil power's steps
and the boxes' keys at least 44 px wide at every size. KEEP BOILING, SOUND and the boil power button stay as
documented. Where the steps and the keys don't fit, you chose a row of their own for both, and asked that nothing
move while someone could be reaching for it.

### What changes

**The timer presets.** `.tpre`'s gap is 2 px, not 4. Each preset is then 45.3 px wide in a monitor's recipe column
(1180 to 1440 px wide windows), 44.7 px on a 360 px phone and 49.7 px at 390. It was 43.7 and 43.

**The names to pick.** Two to a row on a phone: `.tsug{grid-template-columns:repeat(2,minmax(0,1fr))}` at the end of
the `max-width:700px` block. At 360 px a name then has 130 px, where WHIRLPOOL needs 80; three to a row it had 79.
`.tsug .cmdbtn` has 2 px of padding a side, not 4, so a monitor's three to a row gives a name 84 px, not 80. A third
row on a phone costs nothing another part needs, as the page scrolls there.

**When the faceplates are tight.** Four 44 px keys, their gaps and HEATING at its smallest (18 px) need 276 px. A
faceplate narrower than that inside is tight: windows about 900 to 970 px wide, and 1180 to 1320 beside the recipe
column (a scrollbar moves the edge by a pixel or so). `platesTight()` in `brew-day.js` measures it from the faceplates
themselves, so no window widths are written down: three
faceplates side by side, each under 276 px between its padding. `renderAll` sets `#plates[data-tight]` from it, and a
`ResizeObserver` on `#plates` draws again when it changes. `mainStacked()` says whether the recipe column is under the
brewhouse (the page scrolls) rather than beside it.

**The boil power's steps.**
- Beside the element, where they fit, as now. Their columns are `minmax(44px,1fr)`, so a step is never under 44 px
  wide there, and the element gives way first, never narrower than HEATING. The steps always read "−5 %": the `.pc`
  span and its rule are gone, and `.nudge{white-space:nowrap}` keeps the % with its number.
- On tight faceplates, a row of their own, 50 px tall (`--steps-h`) and 53 to 61 px wide, under AUTO/MANUAL and
  TARGET. In `plateHTML` the boil kettle's fifth child is then
  `<div class="mstack"><div class="moderow">…</div><div class="bksteps" role="group" aria-label="Boil power steps">…</div></div>`,
  and `.ctrls` holds the element alone, full width, with its name back ("BOIL ELEMENT · tap to pause"):
  `narrow = bkNudges() && !TIGHT` in `bkLampHTML`.
- Why under the mode row and not under the element, as in the picture you chose from: I measured every change
  (AUTO and MANUAL, the power and target boxes opening and closing, a hold starting and ending, the HLT's box) for
  what moves and what lands where a control was. Under the element, the mode rows of all three faceplates moved by
  the row's height each time, and a second tap where a closed box's keys had been landed on MANUAL. Under the mode
  row, nothing above it moves.
- On one screen (1180 px and wider) the drawing gives up the row's height, as it does for an open box:
  `.app[data-steps]` (set in `renderAll` while the row shows) lets it go down to 64 px with graphs in the faceplates,
  136 px without. The page's height then never changes as the steps come and go. In `#hop` at 1180×820 the drawing
  goes from 183 to 120 px; at worst, a paused boil-over with a note under the faceplate on an 800 px tall window, 80 px.
- Where the page scrolls (900 to 969 px), the row keeps its place, empty (`<div class="bkspace">`, the steps' height),
  while the steps are away in MANUAL, a hold or the power box. Nothing below moves either.
- The other faceplates' mode rows keep their height beside the taller row: `.plates[data-tight] .plate>.moderow{align-self:start}`.
  They have the row's height empty at their bottom.
- The marching stripes on a step on its way are `.nudge.sending::before`, no longer only inside `.ctrls`.

**The boxes' keys.** On tight faceplates the number takes the box's width, the four keys a row under it, and SET and
CANCEL the next row in halves; the boil kettle's third row (BOIL AT and USUAL, or BOIL and BOIL POWER) too. CSS only,
under `.plates[data-tight] .editor`. The keys are then 53 to 61 px wide.

**USUAL 45 %.** `USUAL <span class="nw">45 %</span>`, with `.editor .usual .nw{white-space:nowrap}`. At 900 and 1180 px
the % had a line of its own.

### What moves

Measured at 1180×820, 1280×800, 960×1080, 900×1200 and 1366×768, at the top of the page and scrolled part of the way
and to the bottom, for each change above:

- As the steps come and go (AUTO and MANUAL, a hold starting and ending), no control moves at any of those sizes or
  scroll positions, except the boil kettle's TARGET by 3 px within its own place when MANUAL's hint changes its length.
  Today that 3 px moves all three faceplates' mode rows. A box opening or closing moves nothing either, except as
  under "Found, not changed" below.
- What is now where a control was: the boil kettle's own buttons, changing state where they are (AUTO and MANUAL, the
  element's tap). An opening box's number and keys, where AUTO, MANUAL, TARGET and the steps were. After a box closes,
  MANUAL where its number was, as today, and, while AUTO boils on a tight faceplate, the four steps where its four
  keys were, in the same order. SET's and CANCEL's places are empty after the box closes.
- Today, when a hold starts or AUTO stops at 1180 px, the element widens over the steps' places. That no longer
  happens on tight faceplates.

Found, not changed: from 900 to 1179 px, scrolled into the faceplates, an opening or closing box moves the mockup's
faceplates by the box's height. The browser holds the drawing below still, because the mockup draws the faceplates
anew each time. Your `morph()` keeps the elements, so your build may keep the faceplates still instead.

### Your bench tests

- `test_e2e_boil_power.py`, the 1180 px window (lines 530 to 556): there the steps have their own row. `row_at` reads
  `#pl-bk .ctrls button`, which is now the element alone; the steps are `#pl-bk .bksteps button`. "The boil-over
  button at least twice a step" and "the steps read −5 −1 +1 +5 there", with `pc == 0`, no longer apply: each step
  is 53 px wide and reads "−5 %", and `.pc` is gone. "AUTO and MANUAL don't move as the heat pauses" still holds:
  `#pl-bk .moderow` is inside `.mstack`.
- The same test at 1440 px (line 463, the five buttons in `.ctrls`, steps either side) and with the power box open
  (line 505, no steps) still holds.
- `test_e2e_brewday_timers.py` reads the names' text (lines 237 and 353), which is unchanged.

### Moments whose pictures change

Compared as your identity test does (animations off, the page clock stopped, software drawing), the mockup as in
post18 against this one, all 40 moments at your five sizes:

- 1920×1080, 1920×950 and 1440×900: only the timer editor's three moments (`#timer-new`, `#timer-names`,
  `#timer-nonames`), in the presets' row.
- 900×1200: all 40. 900 px is tight, so the faceplates are 58 px taller there (the steps' row, or its place kept
  empty), and in `#boilpower` and `#bktarget` the box's keys have a row of their own.
- 390×844: the same three timer moments: the names two to a row (`#timer-new`, `#timer-names`) and the presets' gaps
  (`#timer-nonames`).

### Checked

- Every moment, all 40, at 17 sizes (your five, 1920×800, 1680×1050, 1600×900, 1536×864, 1366×768, 1280×800,
  1180×820, 1024×768, 960×1080, 768×1024, 763×1141 and 360×740): no word split across lines, no text under its
  contrast minimum, no box over another, no script errors, and with the pointer on every line and button at 1920×1080
  and 1366×768, no text under its minimum. Under 44 px: only KEEP BOILING, SOUND and the boil power button, as
  documented. Before, the same measure also found the presets (43 and 44 px), the steps (32 to 40 px), the boxes' keys
  (36 to 42 px), and WHIRLPOOL split at 360 px.
- The steps and keys, measured at 16 sizes: beside the element 44.4 px at 1366, 45 at 1024 and 48 at 360; in their
  own row 53 px at 1180, 59 at 900 and 61 at 1280. The boxes' keys are 47 px or wider everywhere, 53 to 61 in their own
  row. HEATING fits its button whole at every size.
- On one screen, 56 boiling moments (the 7 with the steps, with and without a note under the faceplate) at 1180×820,
  1240×780, 1280×800 and 1300×1024: with graphs in the faceplates, the page is as tall with the steps as without,
  every time. At 1321 px the steps fit beside the element, at 44 px. Without graphs (`?graphs=none`), a paused
  boil-over with a note is 2 to 4 px taller in MANUAL than with the steps, as the drawing's least height there is
  220 px; it is today too.
- Greyed controls under the pointer at 1920×1080, 1366×768, 1180×820 and 960×1080, the steps' own row among them:
  368, none changes.
- The timers' state lines and restart notes stay inside their boxes on 80 pages.

### Changed

- `proposal\brew-day.css`, `proposal\brew-day.js` and this file.
- `DESIGN.md`: the step buttons, the target and power editors, the timer editor's presets and the names to pick, and
  the boil power's Do.
- `.impeccable\design.json`, regenerated, and `.impeccable\decisions\direction-log.md`.

## Every line under a window on one line, so the buttons under it stay put: ready to build (17 Nov, morning)

Your build agent found that at 1180 px the boil kettle's "Below a boil · back to full power at 207.0 °F" takes two
lines, and that all three faceplates' AUTO/MANUAL rows sit 18 px lower until it shortens, because the faceplates share
their rows. DESIGN.md promised that every such line fits on one line at 229 px. The words change, not the layout:
keeping room for a second line would take 18 px from the drawing on every narrow window, all day, for a line that is
almost always short.

Checking every line in every moment found more than that one. On post19, in layout B, eight different lines took two
lines in 11 of the 40 moments, mostly at 1180 to 1200 px wide, some at 900 and 1280:
- every line with a time to target, such as "6.7 °F below target · about 2 min at this rate" (`#manual`, `#hold`,
  `#handhold`, `#sparge-heat` and four more);
- the HLT's line under the HERMS, with anything but "At target" before " · SV set by the mash tun": "1.8 °F below
  target · SV set by the mash tun" (`#sparge`), "Last reading 48 s ago · SV set by the mash tun" (`#offline`). With a
  time to target as well, it takes two lines at every width, 1920 included;
- "Below a boil · back to full power at 206.6 °F" (`#keepboil`).

"Not heating: the mash tun has no target" fitted with 0.3 px to spare.

### What changes

Only words, in `brew-day.js` and `graphs.js`. No CSS.

| Line | Was | Now | In your build |
|---|---|---|---|
| Time to target, every vessel (`graphETA`) | "about 15 min at this rate", "under a minute at this rate" | "about 15 min", "under 1 min" | `graphs.js` line 46 |
| Boil kettle below a boil, KEEP BOILING ticked (`bkLine`) | "Below a boil · back to full power at 207.0 °F" | "Below a boil · full power at 207.0 °F" | `screen.js` line 386; the unit stays `${U}` |
| Boil kettle heading for the boil (`bkLine`) | `graphETA("bk").replace(" at this rate", "")` | `graphETA("bk")`, with nothing to take off | line 388 |
| HLT under the HERMS, mash tun with no target (`devHTML`) | "Not heating: the mash tun has no target" | "No mash tun target, so it won't heat" | line 539 |
| HLT under the HERMS (`plateHTML`) | its line, then " · SV set by the mash tun" | its line alone; `by` is gone | line 592 |

"under a minute" in a restarted step's note (`screen.js` line 651) is a different line and stays.

Why each:
- **"at this rate".** The graph right above the line shows the rate, and the time only shows with the graph. Without
  those three words the longest time line, "108.0 °F below target · about 120 min", has 22 px to spare at 229 px;
  with them it was 44 px too long. The boil kettle's line already left them out.
- **"under 1 min".** "Full power until it boils · under a minute" had 5 px to spare. It has 25 now, and reads like
  "about 2 min".
- **" · SV set by the mash tun".** At 229 px it fits only after "At target". MODE in the window already says HERMS,
  the HERMS button under the line says "run by the mash tun", and tapping it says the mash tun sets this target to its
  own plus 5 °F. I tried putting "SV" into the HERMS button's words instead. Every wording took two lines there at
  1320 to 1440 px and on phones, which made that row taller than the mash tun's and the boil kettle's beside it, so the
  button's words stay as they are.
- **"Below a boil · full power at 207.0 °F".** 32 px to spare. "back to full at" had 24 but drops "power", the word
  every other boil line uses; "full power again at" was 3 px too long.
- **"No mash tun target, so it won't heat".** 24 px to spare, and it reads like the mash tun's own line beside it,
  "No target, so the HLT won't heat".

### The rule, with numbers for a test

Every line under a window fits on one line at the narrowest faceplate, 229 px inside at 1180 px wide, with at least
8 px to spare, three-digit numbers included. That holds for layout B with and without graphs and with `?bk=today`;
the mockup's layout A is 7 px narrower and isn't built. The widths, in 15 px Barlow Condensed 500, measured in Edge
by putting each line into `#pl-hlt .dev` at 1180×820; every other line is shorter:

| Line, with its longest numbers | Width | To spare |
|---|---|---|
| "137.0 °F above target · heating by hand" (a target under about 70 °F) | 221 px | 8 px |
| "Full power until it boils · about 120 min" | 217 px | 12 px |
| "Heating by hand · won't stop at target" | 215 px | 14 px |
| "Heating by hand · until you turn it off" | 211 px | 18 px |
| "108.0 °F above target · about 120 min" | 208 px | 21 px |
| "No mash tun target, so it won't heat" | 205 px | 24 px |
| "Below a boil · full power at 208.6 °F" | 199 px | 30 px |
| "Not boiling · 109.9 °F below 212.0 °F" | 198 px | 31 px |

The 8 px are for small differences in how other browsers lay out the same font: an iPad in landscape is 1180 px wide.
A check on the bench that would have caught this: at 1180×820, in every moment, each `.plate .dev` is one line (the
distinct tops of its text's client rects).

### What moves

At 1180×820 and 1180×900, switching AUTO and MANUAL on the boil kettle in `#keepboil`, on the HLT in `#manual` and on
the mash tun in `#sparge` (which ends the HERMS): on post19, 8 to 11 buttons across all three faceplates moved 18 to
21 px each time. Now none does, except the switched vessel's own TARGET, as below.

Your second point, the boil kettle's AUTO, MANUAL and TARGET 5.4 px shorter in MANUAL at 1180, is left as it is. It
happens on every vessel, from 1180 to 1320 px. In AUTO, MANUAL's hint "tap to stop AUTO" takes two lines in its half
of the row, 73 px wide, so AUTO and MANUAL are 59.4 px tall and TARGET 61.4. In MANUAL, AUTO's "hold to start" takes
one line, so they are 54 and 56 px. Their tops stay put, they stay well over 44 px, and nothing else comes under the
5.4 px they give up.

### Your bench tests

- `test_e2e_brewday.py` line 506 waits for "Not heating: the mash tun has no target" on `#pl-hlt`: now "No mash tun
  target, so it won't heat".
- Line 511 waits for "SV set by the mash tun" on `#pl-hlt`, which is gone. The same line's check for "HERMS" still
  holds, and the HERMS button still says "run by the mash tun".
- `test_e2e_boil_power.py` line 433 quotes the old "Below a boil" line in a comment.
- No test reads "at this rate".

### Moments whose pictures change

Compared as your identity test does (animations off, the page clock stopped, software drawing), post19's mockup against
this one, all 40 moments at your five sizes. Only the line under a window changes, and nothing else in the picture:
- 21 moments at all five sizes: `#mash`, `#hold`, `#whirlpool`, `#keepboil`, `#handhold`, `#sparge`, `#sparge-heat`,
  `#fail`, `#manual`, `#timers`, `#timer-done`, `#timer-back`, `#timer-back-done`, `#timer-back-unknown`, `#timer-new`,
  `#timer-names`, `#timer-nonames`, `#timers-hand`, `#sound-allow`, `#offline` and `#notarget`.
- At 900×1200, `#handhold` and `#offline` are 18 px shorter: their line took two lines there.
- With `?bk=today`, 18 moments: the same, less `#hold`, `#whirlpool`, `#keepboil` and `#handhold`, plus `#heatup`. At
  900×1200, `#heatup` and `#offline` are 18 px shorter. With `?graphs=none`, 14: the same, less the seven with a time
  to target. At 900×1200, `#offline` is 18 px shorter.

### Checked

- Every line under a window, in all 40 moments, at 17 sizes from 360 to 1920 px wide, in the default, `?graphs=none`,
  `?bk=today` and layout A: 2,720 pages, none on two lines. The least room to spare in any moment at 1180 px is 13.8 px
  ("Heating by hand · won't stop at target" in `#byhand`).
- What moves, and what comes under where each button was, as above.
- The HERMS button's words, at 12 sizes, against the rows beside it.

### Changed

- `proposal\brew-day.js`, `proposal\graphs.js` and this file (this section, and the HERMS row of the "Change by
  change" table).
- `DESIGN.md`: the line under the window, and The Mode Tells The Truth Rule.
- `.impeccable\design.json`, regenerated, and `.impeccable\decisions\direction-log.md`.

## The pre-brew check: ready to build (17 Nov, evening)

Approved by the brewer on 17 Nov: "I didn't really get a good feel for what was implemented but I'm sure it's good.
Proceed". He then noted "BK probe is closer to the door than the HLT/MT probes and may be a bit cooler via physics",
and asked for it to be checked against the rig ("look at my data from actual brew day with gauge"). COMPARE PROBES
changed for both, and shown the result he chose "Yes, go ahead (Recommended)". The reasoning, the decisions and what
the rig's logs showed are in `proposal\PRE-BREW-CHECK.md`; DESIGN.md has the Pre-brew Check section and The Warn, Never
Block Rule. The mockup's moments are first in the strip: `brew-day.html#prebrew`.

### START on a recipe not begun

- **When:** START held on a recipe none of whose steps has begun: loaded, or after RESET TO STEP 1. The mockup's test is
  `pbFresh` (line 1096); in your build it is the same test that greys NEXT STEP with "not started". Not when START
  carries on after a STOP or a power cut, and not START THE BOIL. The Brew Steps page's own start doesn't check.
- **While CraftBeerPi answers:** START is pending: CHECKING… over "before it starts", the marching stripes, and tapped,
  `PB_WAIT`: "CraftBeerPi is checking the probes, the clock and the reminders. The recipe starts once they pass."
  COMPARE PROBES is greyed with the same words. An open COMPARE PROBES is logged and closed first (`cmpDone`).
- **All pass:** LOG gets "Checked before starting: probes, clock, reminders · all passed" (Running Green), then the
  recipe starts exactly as now, STARTING… and "Recipe started · confirmed".
- **Otherwise:** nothing starts, and the box opens under START (`pbHTML`, line 1135): the `.confirm` box NEXT STEP's
  question uses, with class `pbc`. First line: "**Not started yet:** 1 check didn't pass." (or "2 checks didn't pass").
  Then a list, always all three, always in this order, each with its mark (`MK`, line 1105, inline SVG):
  - passed, a Running Green ring and tick and one line in `#e2d6bd`: "All 3 probes give a reading.", "The clock is
    set.", "All 4 boil additions have a reminder." ("The boil has no additions to remind you of." with none);
  - not passed, a Prompt Amber disc with a dark "!", its first words bold:
    - "**The boil kettle's probe, Boil Temp, gives no reading,** and hasn't for 3 min. Check its plug and cable."
      Two or more: "**2 probes give no reading:** the mash tun's (Mash Temp) and the boil kettle's (Boil Temp). Check
      their plugs and cables." The time is "40 s" under a minute, else whole minutes.
    - "**The Pi's clock isn't set yet.** It comes from the internet a minute after the Pi starts; if not, check the
      Pi's network. Set during a rest, it can cut the rest short."
    - "**2 of 8 boil additions have no reminder:** Citra at 5 min and Amarillo at 0 min (the boil step holds six).
      Watch the clock for them, or set a timer." One: "has", "it".
  - Under them, START ANYWAY (`.yes`, Answer White, "hold to start", held for one second exactly as START, Space and
    Enter included) and DON'T START. Neither is focused or drawn as the default. With every check passing (see below)
    START ANYWAY reads START.
  - For screen readers the box is `role=group` named by its first line, and each line starts with a hidden "Passed: "
    or "Didn't pass: ". When it opens, the live region says the first line, the lines that didn't pass, and "START
    ANYWAY or DON'T START, under START."
- **START ANYWAY** starts the recipe with its usual line, plus what it went past: "Recipe started · confirmed · started
  anyway: the Pi's clock wasn't set". The others read "the boil kettle's probe gave no reading", "2 probes gave no
  reading", "2 additions had no reminder", joined with ", ". **DON'T START** and Escape close the box and change nothing.
- **While it is open,** poll the check every 5 s and redraw: a check that comes right turns its line to passed in its
  place, the first line to "**Every check passes now.** Not started yet.", and START ANYWAY to START. It never starts
  by itself. The mockup sets the clock 30 s on in `#check-clock` (line 2383) to show it.
- **It keeps its height.** While the recipe column keeps its width, the box or panel keeps the tallest height its
  contents have needed, as its `min-height`: `pbMeasure` takes the height its contents need just before the column is
  drawn again and `pbFit` just after, each with the kept height lifted, and `pbFit` keeps the tallest of those measured
  at that width for that class (`pbKeep`). The box is a grid with rows `auto 1fr auto`, so its answers stay at its foot.
  So a line that gets shorter moves nothing. A new failure while it is open makes it taller: there is more to say. At
  another width of the column (a window resized, a phone turned, or the window 1×1 for a moment while Chromium takes a
  full-page picture) the lines wrap anew and nothing is kept: the box is as tall as its contents there, and a change of
  the column's width draws it again. No height is kept while the page's fonts are still loading (M105).
- **No answer in 5 s:** the first line is "**Not started yet:** CraftBeerPi didn't answer the check, so nothing was
  checked. Hold START to try again.", and each check says in its place that it wasn't checked ("The probes weren't
  checked.", "The clock wasn't checked.", "The reminders weren't checked."), with the amber disc and no hidden prefix.
  An answer that comes later fills them in where they are, so nothing moves if they pass. START ANYWAY logs "started
  anyway: the check got no answer". START held again checks again.
- **An older CraftBeerPi** that has no check (404): START starts at once, as today.
- **A recipe started from another screen** closes the box (and COMPARE PROBES): `renderAll`, line 1494.
- **No connection:** both answers are paused with "No connection. Controls are paused.", as every control is.
- **On a monitor (1180 px and wider)** the open box, or the open panel, takes the step list's room, as a timer's editor
  does: `.recipe[data-pb]` hides `.steps`, `.book` and `.handlinks` (brew-day.css). Where the column is too short for
  the whole panel, the panel scrolls in it, as the step list does (`.recipe[data-pb] .cmp{flex:0 1 auto;min-height:0;
  overflow:auto}`), so the page never grows: at 1920×950 all of the sentence shows and the small print is 63 px below;
  at 1440×900 and 1180×900 the rows and the sentence's first lines show. Without it the page grew by 44 px at 1920×950
  and 176 px at 1440×900. The box never scrolls, so its answers always show; with two checks failed it fits at
  1440×900, and under 900 px tall the page scrolls a little, as it does anyway. Where the page stacks, the panel
  opened while brewing by hand keeps the order the buttons had (`.recipe .cmp.byh{order:2}`).
- **A notice, not an alarm:** no sound, nothing in the title bar, and only on the screen where START was held.

### COMPARE PROBES

- **The button:** a command button, "COMPARE PROBES" with "before you fill" under it, 54 px tall (`.cpbtn`). On a recipe
  not begun it is under START, STOP and NEXT STEP, across the column. Brewing by hand it is at the end of the column,
  under RECIPE BOOK and BREW STEPS, across both (`.handlinks .cpbtn{grid-column:1/-1}`). Not shown once a recipe has
  begun, and not while the check's box is open.
- **The panel** (`cmpHTML`, line 1237) opens in its place: "COMPARE PROBES" (Title capitals) with DONE ("adds them to
  LOG") beside it; "With every vessel empty and at room temperature.", plus " Each reading is the probe's own, without
  its offset." if any probe has one; a row per vessel on PID Window Black: the vessel's name, then its probe's name in
  CraftBeerPi and its offset, "Mash Temp · offset +4.0 °F" (two decimals only where it has them: "+0.23 °F"), and at
  the right the probe's own reading in Process Red, 600 30px, tabular. Then the sentence with its 24px mark, and the
  rule in small print: "They agree within 2.0 °F: each probe is accurate to ±0.9 °F. Where a vessel sits can put it up
  to 10 °F from the others; more than that, a probe looks off." The readings follow the probes while it is open.
- **Each probe's own reading** is its value less the `offset` in its settings (OneWire's `offset`, which core adds after
  converting to the brewery's unit, so it is in °F or °C as the readings are). 0 for a sensor with no `offset`. The
  rig's are HLT +0.23, mash +4.0 and boil kettle +1.0 °F; the simulators' are 0, so on them nothing about offsets shows.
- **The sentence** (`cmpVerdict`, line 1190), in this order. "Spread" is the highest own reading less the lowest.
  1. Probes with no reading first: "The mash tun's probe gives no reading: check its plug and cable. ", then the rest
     of the sentence about the others. Fewer than two readings: "Not enough readings to compare."
  2. A reading below 35 °F or above 120 °F, whatever the others read: that probe looks off. "The boil kettle's probe
     reads 185.0 °F on its own, hotter than any room. Check its plug and cable, then put it in ice water: with its
     +1.0 °F offset it should read 33.0 °F, ±0.9 °F." Every probe with a reading like that: "All three probes read
     32.0 °F on their own, colder than any room. When every probe is wrong at once, look at what they share: one bad
     probe or plug on their cable can do this. Unplug them one at a time to find it."
  3. Spread up to 2.0 °F: "All 3 agree, 1.1 °F apart at most." (Running Green tick.)
  4. Spread up to 10 °F: likely where they sit (Soft Steel ring with "i"; the sentence in the plain colour). With one
     probe the other two agree without: "The boil kettle reads up to 3.8 °F below the other two. That's likely where it
     sits, not its probe. To be sure, put the probe in ice water: with its +1.0 °F offset it should read 33.0 °F,
     ±0.9 °F. If it doesn't, correct its offset in Hardware." ("above" if it reads higher; with no offset, "it should
     read 32.0 °F".) Its row says COOLER or WARMER in Soft Steel. Otherwise: "They read up to 6.0 °F apart. That's
     likely where the vessels sit, not their probes. To be sure, put each probe in ice water: each should read 32.0 °F
     plus its offset, ±0.9 °F." With two readings: "The hot liquor tank and the boil kettle read 3.7 °F apart. …"
  5. Further apart: a probe looks off (amber disc). "The boil kettle's probe looks off: it reads up to 17.5 °F below
     the other two. Where it sits can't explain that much. Check its plug and cable, then put it in ice water: …";
     with two: "…read 17.3 °F apart, so a probe looks off. Where they sit can't explain that much. Check their plugs
     and cables, then put each probe in ice water: …"; with no single one: "No two agree: they read up to 14.0 °F
     apart. Where they sit can't explain that much. Are the vessels all empty? If so, put each probe in ice water: …"
  A probe that gives no reading, or looks off, gets a 2px Prompt Amber edge on its row and "NO READING" or "LOOKS OFF"
  in Prompt Amber capitals; its reading reads "– –". With a probe giving no reading the mark is amber whatever the
  others do.
- **DONE**, or START held while the panel is open, logs what was compared: "Probes compared, without offsets: HLT 63.4,
  mash tun 63.5, boil kettle 59.7 °F" (", without offsets" only when a probe has one; "no reading" for a probe without
  one), with "agree" in Running Green, "3.8 °F apart" in the plain colour, or "a probe looks off", "every probe looks
  off" or "no reading" in light red. Escape closes it without a line.
- **It keeps nothing between comparisons**, and learns nothing from earlier ones: LOG keeps eight lines per screen, and
  a learned difference would also learn a probe slowly going wrong.

### In °C

2.0 °F is 1.1 °C; 10 °F is 5.5 °C; below 35 °F and above 120 °F are below 1.5 °C and above 49 °C; ±0.9 °F is ±0.5 °C;
the ice-water reading is 0.0 °C plus the offset. The spread and readings show one decimal in either unit.

### What the server answers

Your core 4.7.7.post45. What the screen uses from the check:
- **Probes:** for each brewhouse kettle's own probe (not a fermenter's), whether it gives a reading: a number, published,
  no older than its own `max_age`, and one a kettle can have (−127 and 900 and over count as none); and, if not, for
  how long. Your core already refuses the all-zero scratchpad (`_scratchpad_is_empty`), so the 11 Oct fault, every
  probe at 0 °C plus its offset, now shows here as no reading.
- **Clock:** `system_clock_trusted()`, asked in a thread and kept, not run on every request.
- **Reminders:** how many boil additions the recipe has, and the name and minutes of each that has none, which the
  import keeps with the mash profile until it is cleared or another recipe is imported.
- The screen asks once on START and every 5 s while the box is open. COMPARE PROBES needs nothing new: the readings are
  the faceplates', and which probe gives no reading comes from the same answer.

### Your bench tests

- START held in `test_e2e_brewday.py` line 551, `test_e2e_brewday_reset.py` line 75 and `test_e2e_recipe_pumps.py`
  line 574: they see CHECKING… for a moment before STARTING…, and one more LOG line before "Recipe started". On the
  simulators every check passes: Windows' clock counts as set, the probes read, and the test recipes have six
  additions or fewer.
- `test_boil_reminder_limit.py` imports seven hops: a test that then starts the recipe gets the box, and needs START
  ANYWAY.
- Nothing on the simulators has an offset, so a test of the offsets needs one set, for example +4.0 on Mash Temp.

### The moments

New, first in the strip: `#prebrew` (each probe with the rig's offsets), `#probes`, `#probes-apart` (the rig's own
readings from the evening of 25 Oct: shown HLT 63.6, mash 67.5, boil kettle 60.7 °F), `#probes-off`, `#probes-none`,
`#checking`, `#check-clock`, `#check-now`, `#check-probe`, `#check-adds`, `#check-many` and `#check-noanswer`. They
share `pbMorning` (line 606). `graphs.js` has a flat night for them (`st.pbDay`); that is demo history only.

### Moments whose pictures change

Compared as your identity test does (animations off, the page clock stopped, software drawing), post20's mockup against
this one, all 40 earlier moments at your five sizes, in the default, with `?bk=today` and with `?graphs=none`: the
same 11 change in all three, only in the recipe column, and no others.
- `#reset-done`: COMPARE PROBES ("before you fill") under START, STOP and NEXT STEP, so the step list starts 62 px
  lower.
- The 10 moments brewing by hand, `#manual`, `#timers-hand`, `#sound-allow`, `#byhand`, `#byhand-past`, `#notarget`,
  `#notarget-hlt`, `#handhold`, `#bktarget` and `#finished`: COMPARE PROBES across the column under RECIPE BOOK and
  BREW STEPS, where the recipe book's list gives up the room on a monitor. On a 390×844 phone these pages are 62 px
  longer.

### Checked

- Every moment, all 52, at 17 sizes from 360 to 1920 px wide, 1180×820 and 1180×900 included: no word split across
  lines, no text under its contrast minimum, with or without the pointer on it, no box over another, no script errors.
  Under 44 px, only KEEP BOILING, SOUND and the boil power button, as documented.
- COMPARE PROBES' sentence for 18 sets of readings: all three agreeing, exactly 2.0 °F and 10.0 °F apart (the lower
  level), one cooler or warmer, one far out, 185 °F, all three at 32 °F (the rig's 11 Oct readings without offsets),
  no single odd one, one or two or three with no reading, and the rig's 25 Oct readings.
- What moves under a reaching hand, at 1920×1080, 1920×950, 1440×900, 1366×768, 1180×900, 1180×820, 960×1080 and
  390×844: the clock set, a probe back, a probe coming right in the panel, and a late answer that passes move nothing,
  and START ANYWAY becomes START in its place. A new failure, a late answer with one, or a probe dropping out while
  the panel is open make the box or the panel taller, so the timers below it move down (21 to 67 px): there is more to
  say, and nothing lands where a button was.
- Page height with the box or the panel open: no taller than the window on any monitor 900 px tall or more.
- Clicked through, 14 ways: START held with everything passing; let go early; START ANYWAY held and tapped; DON'T
  START; the clock set 30 s on; COMPARE PROBES and DONE; Escape; START held with the panel open; Space held on START;
  no answer, then START ANYWAY, then START held again (5 s of CHECKING…); a recipe started elsewhere, with the box and
  with the panel open, and by hand; COMPARE PROBES while CHECKING…. No page errors.
- The Impeccable detector on `brew-day.css`: the same findings as before, the intentional stripe on `.nudge.sending`,
  and Quiet Cream, now in DESIGN.md.

### Changed

- `proposal\brew-day.js`, `proposal\brew-day.css`, `proposal\brew-day.html` and `proposal\graphs.js` (LF, as it was);
  `proposal\PRE-BREW-CHECK.md`, new; and this file (this section, and two rows of the "Change by change" table).
- `DESIGN.md`: the colours (Process Red, Running Green, Prompt Amber, Soft Steel), the Recipe Column, the Pre-brew Check
  (new), The Held Heat Rule (START ANYWAY), The Warn, Never Block Rule (new), the Do's and Don'ts, and eight components
  in its front matter.
- `.impeccable\design.json`, regenerated, with two new samples (Pre-brew Check, Compare Probes);
  `.impeccable\decisions\direction-log.md`; and the surface brief.

## The pre-brew check's other answers, CHECKING… waiting for the clock, and the box while the fonts load: ready to build (18 Nov)

Your build agent had to choose words where CraftBeerPi can answer something the mockup had no words for. Taken one by
one, with what I added where the same rule applied: every line that didn't pass says what is wrong and what to do, and
what to do has to be right. All of it is in the mockup's `pbItems` (line 1119), `PB_ERR` (1106), `pbRun` with
`PB_CLOCK` (1190), `cmpRead` (1239), `cmpVerdict` (1241) and `cmpHTML` (1292), and in DESIGN.md's Pre-brew Check.

### Your five points

1. **No time for a probe: kept, as built.** "The boil kettle's probe, Boil Temp, gives no reading. Check its plug and
   cable." But a kettle with no probe, or one CraftBeerPi no longer has, isn't a plug or a cable: it's a setting, so it
   says so in the Hardware page's own words ("None chosen", "Not found"):
   - `no_probe`: "**No probe is chosen for the boil kettle.** Choose one in Hardware."
   - `missing`: "**The boil kettle's probe isn't found:** CraftBeerPi no longer has it. Choose one in Hardware."
   - two or more of those: "**2 kettles need a probe chosen in Hardware:** the mash tun (none chosen) and the boil
     kettle (not found)."
   - Then, on the same line, any probe that gives no reading, in the words it has now. LOG's started-anyway reasons:
     "no probe was chosen for the boil kettle", "the boil kettle's probe wasn't found", "2 kettles had no probe chosen".
   - A kettle the screen doesn't show is named by its name, as now: "No probe is chosen for Kettle 4."
2. **The clock "for any reason": only for `not_synchronized`.** Its words fit timedatectl's plain no, the usual one just
   after the Pi starts, when waiting a minute puts it right. `unconfirmed` (timedatectl failing, timing out after its
   5 s, or answering neither yes nor no) is different: waiting may not help, and checking the network won't. So:
   "**The Pi didn't say whether its clock is set.** If it has been on and online for a few minutes, you can start
   anyway. A clock set during a rest can cut the rest short." LOG: "the Pi's clock wasn't confirmed". I didn't tell the
   brewer to compare the title bar's clock: in your build it is the screen's own time (`daySeconds()`, the phone's or
   the PC's), so it is right whatever the Pi's is.
3. **`no_answer_yet`: START waits for the answer, and only then "The clock hasn't been checked yet: the Pi is slow to
   answer."** CraftBeerPi answers `no_answer_yet` only until timedatectl's first answer since it started, which can
   take a few seconds on a Pi that has just started: the first START of a brew day, when the clock is also the most
   likely not to be set yet. In the box, that short line grew into "isn't set yet" or "didn't say" at the next ask,
   5 s on, and the box grew with it: START ANYWAY, DON'T START, SOUND and + TIMER went down 67 px on a phone and on
   monitors from 1180 to 1600 px wide, 45 px from 1680 px up and 22 px from 768 to 1024 px; where they went 67 px,
   DON'T START landed where SOUND had been. Your build does the same with "The clock wasn't checked." (`pbAsk` decides
   on the first answer, and the poll 5 s later brings the longer words). So
   START stays on CHECKING… while the clock's part says `no_answer_yet`, and asks again, for up to 6 s from the hold
   (`PB_CLOCK`, in the mockup's `pbRun`). CraftBeerPi's own wait (CLOCK_WAIT, 2 s) spaces the asks, and timedatectl
   gives up after its 5 s, so the answer is in by then. Only if it still isn't does the box open with "**The clock
   hasn't been checked yet:** the Pi is slow to answer.", "yet" because the next ask fills it in where it is. If that
   answer is "not set", the box still grows then, as for any new failure while it's open; it takes a Pi slower than
   timedatectl's own 5 s limit. LOG keeps "the clock wasn't checked". The no-answer state's three lines, "The clock
   wasn't checked." and the rest, stay as they are: there the first line says why.
4. **Single counts: kept,** with one more: two additions read "Both boil additions have a reminder.", not "All 2 boil
   additions have a reminder." (your `R.n > 1` branch). In full: "All 4 …", "Both …", "The boil addition has a
   reminder.", "The boil has no additions to remind you of."; "All 3 probes give a reading.", "Both probes give a
   reading.", "The probe gives a reading.", "There are no kettles to check."
5. **Amounts: kept, and now in the mockup's demo:** `BIG_MISSED` (line 28) is `[["1.50 oz Citra", 5], ["1.00 oz
   Amarillo", 0]]`, as the import names them. One addition: the amount's number and unit stay together, the space after
   a leading number made `&nbsp;` (after `esc`): `n.replace(/^([\d.,/]+) /, "$1&nbsp;")`. "1.50 oz Citra at 5 min and
   1.00 oz Amarillo at 0 min" wraps between words, never inside "1.50 oz".

### Also decided

- **A part CraftBeerPi couldn't work out** (its `error`): your words "The probes weren't checked." gave no reason when
  that part alone failed, because the first line then says "1 check didn't pass". Now: "**The probes weren't
  checked:** CraftBeerPi ran into a problem." (or the clock, or the reminders), `PB_ERR`. LOG as you have it.
- **COMPARE PROBES with a kettle that has no probe:** its row reads "– –" and, under the name, only "NO PROBE CHOSEN" or
  "PROBE NOT FOUND" in amber (no probe name, no offset); the sentence starts with "No probe is chosen for the boil
  kettle: choose one in Hardware." or "The boil kettle's probe isn't found: choose one in Hardware."; with two or more,
  "2 kettles need a probe chosen in Hardware.". Then the rest of the sentence as now. Your `cmpRead` needs each
  kettle's reason from the check, as the box does.
- **"All 3 agree: they read the same."** where the spread shows as 0.0, in place of "All 3 agree, 0.0 °F apart at most."
  Every simulated probe reads 68 °F, so that is what the brewer sees on 8012. "Both agree: …" and "The other two agree:
  …" the same way.
- **The box's first line when every check passes** is now "**Not started yet:** every check passes.", in place of
  "**Every check passes now.** Not started yet." Found with the new moments: the old words need 305 px at the box's
  17 px, and took two lines on monitors from 1180 to about 1580 px wide, and on phones narrower than 390 px, where "Not
  started yet: 1 check didn't pass." took one. So as the slow clock's answer came, or a probe was chosen, the box grew
  by about 1.4 px and DON'T START, SOUND and + TIMER moved down with it. The new words need 270 px, and the first line
  has at least 278 px at every size from a 360 px phone up (282 px on monitors from 1180 to 1480 px wide), so they
  always fit on one line, as "1 check didn't pass." (262 px) does. They also start like the box's other first lines.

### What your build needs

- `pbNorm`: keep each kettle's `reason`, and the clock's: `clock: {ok, why}` with `why` "slow" for `no_answer_yet`,
  "unsure" for `unconfirmed`, nothing for `not_synchronized`; and `error` for a part that has one, kept apart from
  `no_answer_yet`, which is now a reason and not an error.
- `pbItems`, `cmpRead`, `cmpVerdict` and `cmpHTML` as in the mockup.
- `pbAsk`: when an answer comes while START says CHECKING… and its clock's reason is `no_answer_yet`, keep CHECKING…
  and ask again, until 6 s have passed since the hold (the mockup looks again every second); then decide with what it
  has. Each ask keeps its own 5 s limit (PB_ASK) for the no-answer state.
- The demo: `st.pb.why` (a vessel's reason, `{bk: "no_probe"}`), `st.pb.clockWhy` ("slow" or "unsure"), `st.pb.error`
  (`{probes: true}`; no moment uses it), `BIG_MISSED` with amounts, and three new moments, first in the strip after
  `#check-noanswer`: `#check-noprobe`, `#check-slow` (the clock still unanswered after START waited 6 s; it answers 5 s
  on, set, and the box follows) and `#check-unsure`. The tick that sets the clock at `clockAt` also clears `clockWhy`
  (line 2440), and the demo's `pbRun` takes a slow clock's answer at `clockAt` while it waits.

### The box's height while the fonts load

Your build agent was right: the mockup kept a height measured while the page's fonts were still loading. It now skips
that as your build does (`fontsIn`, line 1555): a height measured while `document.fonts.status` is "loading" isn't
kept. Nothing else changes, so the mockup and the product should agree on it without the identity test leaving the
kept height out.

### Your bench tests

- The pre-brew e2e test, if it reads the agreeing sentence on a simulator: "All 3 agree: they read the same."
- A test that waits for "Every check passes now." gets "Not started yet: every check passes."
- A test that reads the clock's line for `no_answer_yet` or `unconfirmed`, or a probe line for `no_probe` or `missing`,
  gets the new words.
- A test that holds START while the clock's reason is `no_answer_yet` sees CHECKING… for up to 6 s, then the recipe
  start or the box with the clock's answer; the box with "The clock hasn't been checked yet" only after 6 s with none.

### Moments whose pictures change

Compared with post21's mockup, as the identity test takes them, all 55 moments at its five sizes, in the default,
`?bk=today` and `?graphs=none` (post21 has 52 of them):

- `#check-now`: its first line. At 1920 px and on the phone only the words change; at 1440×900 and 1180×900 the line
  now takes one line instead of two, so the box is 22 px shorter and the column under it moves up.
- `#check-adds` and `#check-many`: the additions' amounts. On the 390 px phone the line takes one more line and the page
  is 22 px longer.
- And the three new moments.

No others. In my run, `#boiling` at 1180×900 and `#handhold` on the phone in `?bk=today` came out different once,
both times a page that hadn't finished drawing in 20 s while the PC was busy; taken again, they match.

### Checked

- Every moment, all 55, at 17 sizes from 360 to 1920 px wide, 1180×820 and 1180×900 included; and the pre-brew
  moments, `#reset-done` and `#manual` again after the last change to the box's words, at those sizes and 900×1200: no
  word split across lines, no text under its contrast minimum, with or without the pointer on it, no box over another,
  no script errors. Under 44 px, only KEEP BOILING, SOUND and the boil power button, as documented.
- The box's first line has at least 278 px at 70 window sizes from 360 to 1920 px wide. "Not started yet: every check
  passes." needs 270 px, "Not started yet: 1 check didn't pass." 262 px, and the old words 305 px.
- What moves with the box open and in view, at 15 sizes from 360 to 1920 px wide: the slow clock answering "set", a
  probe chosen for the boil kettle, the unconfirmed clock confirmed, the clock set, a probe back, a late answer that
  passes everything, and the reminders coming right. Nothing moves; START ANYWAY becomes START in its place. The slow
  clock answering "not set" or "not confirmed" moves the four buttons 22 to 67 px, DON'T START to where SOUND was at 9
  of the 15 sizes: what CHECKING… now waits out.
- The box while the fonts load: the font files held back 2.5 s, the screen drawn again while they load and again once
  they are in, at 900×1200, 1440×900, 1180×900 and 390×844, in `#probes-off`, `#probes-apart`, `#probes-none`,
  `#check-many`, `#check-clock`, `#check-noprobe` and `#check-unsure`. No box ends taller than its content. Post21's
  mockup, the same way: 10 did, by 22 to 41 px, `#probes-off` at 900×1200 by 22 px, as your build agent found.
- COMPARE PROBES' sentence for 22 sets of readings: the 18 there were, and the same readings, the boil kettle with no
  probe chosen, with its probe not found, and the mash tun and boil kettle both without one.
- Clicked through, 20 runs: the 17 there were, with the new words, and three more, each holding START before the
  clock's first answer. Answered "set" 3 s on: CHECKING… waits, no box, and the recipe starts with "all passed".
  Answered "not set" about 2 s on: the box opens with "isn't set yet", and the slow line never shows. Never answered:
  the box opens 7.8 s after START was pressed, with the slow line. No page errors.

### Changed

- `proposal\brew-day.js` and `proposal\brew-day.html`; this file (this section).
- `DESIGN.md`: the Pre-brew Check's words, CHECKING… waiting for the clock's first answer, the box keeping its height,
  and what COMPARE PROBES says.
- `proposal\PRE-BREW-CHECK.md`: the same words, CHECKING…'s wait, and the three new moments.
- `.impeccable\decisions\direction-log.md`.

## A recipe started on another screen while START says CHECKING…: ready to build (18 Nov)

Your build agent's addition in post22, `pbDecide` starting nothing for a recipe no longer waiting to start, is now in
the mockup as it is in your `screen.js`: `pbRun` (line 1191) ends with `delete st.pend["r:check"]; pbDecide();`, and
`pbDecide` (line 1208) holds what `pbRun` used to decide, with your guard first. Without it the mockup started the
recipe a second time when the check passed, and told a screen reader "Not started yet" when one didn't.

One more thing in the same place. START kept saying "CHECKING… before it starts" over the running recipe until the
check answered: under a second as a rule, but up to 6 s while the Pi's clock was slow to answer, and 5 s when
CraftBeerPi didn't answer the check at all. And a screen reader heard nothing about the START that was held. So:

- `renderAll` (line 1560), where it already closes the box and the panel for a recipe that has begun, also ends
  CHECKING… if START says it, and says once "The recipe was started on another screen." START shows RUNNING at once.
- In the demo, `pbRun`'s `answered` returns at once when CHECKING… has ended (line 1198).

### What your build needs

- `renderAll` (your line 1247) becomes:

  ```js
  if (st.recipe && !pbFresh()) {
    st.pbOpen = false; st.cmpOpen = false;
    if (st.pend["r:check"]) { delete st.pend["r:check"]; say("The recipe was started on another screen."); }
  }
  ```

- Nothing else live: an answer that comes after finds `checking` false in `pbAsk`, and the late timer returns.
- The demo's `answered` (your line 811): `if (!st.pend["r:check"]) return;` first.

### Moments whose pictures change

None: no moment has START on CHECKING… for a recipe that has begun.

### Checked

- A start on another screen while START says CHECKING…, five ways: every check passing; the clock not set; the
  clock's first answer coming 3 s on, set; the clock never answering; CraftBeerPi not answering the check. Before:
  CHECKING… stayed 0.4 to 6.0 s over the running recipe; the recipe was logged as started a second time in two of
  them; "Not started yet" was said in the other three. Now, in all five: RUNNING at once, no second start, no box, and
  "The recipe was started on another screen." said once. No page errors.
- The 20 click-through runs, with the same results as before.
- Pictures compared with post22's mockup, all 55 moments at the identity test's five sizes: none of the 275 change.

### Changed

- `proposal\brew-day.js`; this file (this section).
- `DESIGN.md`: the Pre-brew Check's box following CraftBeerPi.
- `proposal\PRE-BREW-CHECK.md`: the same, in "What each part needs".
- `.impeccable\decisions\direction-log.md`.

## The check belongs to the recipe START was held on: ready to build (18 Nov)

Your two notes after post23, for post24 together:

- A recipe cleared on another screen, rather than started, while START says CHECKING…, left CHECKING… pending. START
  was gone, but COMPARE PROBES, with RECIPE BOOK and BREW STEPS once there is no recipe, stayed greyed with "The recipe
  starts once they pass." until the check answered, up to 6 s, and nothing was said.
- Another recipe loaded there during CHECKING… is waiting to start too, so the check's answer started it, though START
  was held on the one before. Your decision: cover it.

The rule now: the check belongs to the recipe START was held on. The screen notes which recipe that is as the hold on
START, or on START ANYWAY, begins: its steps' ids, its name, and whether it was waiting to start. If another screen
then starts it, clears it, or puts other steps in its place (another recipe, or the same recipe's steps changed on the
Brew Steps page), the check ends:

- nothing starts, and the check's answer, when it comes, decides nothing;
- CHECKING… gives way at once and the box closes, so the box can't come back for the next recipe loaded;
- a screen reader hears once "The recipe was started on another screen.", "The recipe was cleared on another screen.",
  "Not started: another recipe was loaded on another screen." or, the name the same, "Not started: the recipe was
  changed on another screen.";
- another recipe in its place looks just like the one START was held on but for its name and steps, so those last two
  sentences also show under START, in the note line, for its usual 6 s.

The same when the one-second hold ends: START or START ANYWAY, held on a recipe that is started, cleared or replaced
before the second is up, starts nothing. Your live hold already refuses a button that changed under the finger (the
box gone, START turned RUNNING) with "Not sent: the screen changed while you held it.", but a recipe swapped under a
START that stays START got through.

In the mockup:

- `recipeKey`, `recipeOn`, `recipeLost`, `lostSay` and `pbEnd` (lines 1106 to 1129);
- `pbRun` (line 1218) keeps the recipe in `st.pbFor`: the one the hold began on (`heldOn`) or, without a hold, the one
  shown;
- `pbDecide` (line 1237) and `pbGo` (line 1249) act only for that recipe, and `pbGo` only while its box is open;
- `renderAll` (line 1590) ends the check with `pbEnd` as soon as it sees the recipe gone;
- `holdStart` (line 2379) notes the recipe as START or START ANYWAY is pressed, and starts nothing at the end of the
  hold if it's gone;
- `load` (line 2570): a box or CHECKING… a moment opens belongs to the recipe it shows.

### What your build needs

- `recipeKey`: your steps' ids, `M.RECIPE.steps.map(s => s.id).join()`; the demo's steps by name, as in the mockup.
  `recipeOn` and `lostSay` with `M.RECIPE.name`.
- `pbRun` (your line 806): `st.pbFor = heldOn || recipeOn();` before CHECKING….
- `pbDecide` (line 822) starts with `if (recipeLost(st.pbFor)) return renderAll();` in place of your `!pbFresh()`
  guard, and only then deletes `st.pend["r:check"]`. Its callers no longer delete it first: the demo's `answered`
  (line 817), `pbAsk` (line 858), its late timer and its no-answer line. The older CraftBeerPi without a check
  (line 865): `if (recipeLost(st.pbFor)) return renderAll();` before deleting it and `liveStart(true)`.
- `pbGo` (line 872): `if (!st.pbOpen || recipeLost(st.pbFor)) return renderAll();` first.
- `renderAll`: your lines 1251 to 1255 become

  ```js
  const pbGone = st.pend["r:check"] || st.pbOpen ? recipeLost(st.pbFor) : null;
  if (pbGone) pbEnd(pbGone);
  if (st.recipe && !pbFresh()) st.cmpOpen = false;
  ```

- `holdStart` (line 2981): `const on = el.dataset.cmd === "r:start" || el.dataset.cmd === "pb:go" ? recipeOn() :
  null;` as the hold begins. When the second is up, before your check that the button is still the one held:

  ```js
  const lost = on && recipeLost(on);
  if (lost) { if (c === "r:start") lostSay(lost, on); return; } // START ANYWAY's box has said why as it closed
  ```

  and after your check, `heldOn = on; run(c); heldOn = null;`.
- The demo's `load`: `if (st.pbOpen || st.pend["r:check"]) st.pbFor = recipeOn();` after a moment's own state.

### What the screen still can't close

START's request doesn't say which recipe it is for. A recipe loaded on another screen that reaches CraftBeerPi just
before this screen's start, but whose update hasn't reached this screen yet, still starts. That window is the time an
update takes to arrive, as for START before the check. Only CraftBeerPi could refuse it, with a start that names the
steps it is for. Your call; nothing in the mockup depends on it.

### Moments whose pictures change

None.

### Checked

- 29 cases. Another recipe loaded, the same recipe's steps changed, the recipe started, and the recipe cleared, each
  during CHECKING… in the five ways the check can go (all passing, the clock not set, the clock answering 3 s late,
  the clock never answering, no answer from CraftBeerPi). Then loaded, started and cleared during the hold on START,
  during the hold on START ANYWAY, and with the box open.
- Before, in post23's mockup with the cleared change: another recipe or changed steps were started by a passing check
  (4 of those 10) or given the box; loaded during the hold on START, it was checked and started; during the hold on
  START ANYWAY, started anyway; with the box open, the box stayed, START ANYWAY and all. Started during either hold,
  the recipe was started a second time; cleared during either hold, the page stopped with an error.
- Now, in all 29: nothing starts, no box, no CHECKING… left, the sentence said, and the note under START for another
  recipe or changed steps. No page errors.
- The 11 cases from the cleared change and the 20 click-through runs, with the same results as before.
- Pictures compared with post23's mockup, all 55 moments at the identity test's five sizes: none of the 275 change.

### Changed

- `proposal\brew-day.js`; this file (this section).
- `DESIGN.md` and `proposal\PRE-BREW-CHECK.md`: the check belongs to the recipe START was held on.
- `.impeccable\decisions\direction-log.md`.

## CraftBeerPi refuses a start for other steps (core post46): in the notes (18 Nov)

What the post24 section left to you under "What the screen still can't close" is closed in core 4.7.7.post46 and
post24, with `already_running` added at my suggestion. Now in DESIGN.md's Pre-brew Check and PRE-BREW-CHECK.md's "What
each part needs". Nothing for the build to change, and nothing in the mockup: its demo talks to no CraftBeerPi.

- START's request names the steps START was held on: `POST /step2/start` with `{"steps": [ids]}`, every step of that
  recipe in order (`liveStart`, `on.ids`).
- CraftBeerPi's answers (`http_start`):
  - 409 `{"error": "recipe_changed", "name": <the loaded recipe's name, or null>, "steps": [its ids]}`, checked first:
    the loaded recipe's steps aren't those. The same recipe loaded again from the Recipe Book counts: its steps get new
    ids.
  - 409 `{"error": "already_running", "name", "steps"}`: the steps match, but one runs already.
  - 400 `{"error": "bad_body", "detail"}`: a body that is neither empty nor a JSON object. Nothing starts.
  - No body, or a JSON object without steps: whatever is loaded starts, as before, for older screens and other pages.
- On a 409 the screen does what it does when it sees the change itself (`startRefused`): nothing started, so LOG gets
  no line; CHECKING… ends and the box closes; and it says once, from CraftBeerPi's answer, since it hasn't heard of
  the change: no steps, "The recipe was cleared on another screen."; the same name, "Not started: the recipe was
  changed on another screen."; another name, "Not started: another recipe was loaded on another screen.", also under
  START; `already_running`, "The recipe was started on another screen."
- A 400 is a fault between the screen and CraftBeerPi, not a brew-day event: "The recipe did not start.", as for any
  start that fails.

### Checked

Your bench, on post24 and core post46: the pre-brew e2e test 314/314 (226/314 on post23), with the 29 cases and the
four refusals; identity 433/433, no page errors; on 8000 a START naming the wrong steps got 409 `recipe_changed`, and
nothing started. I read `http_start` in core 26a9a118 and `startRefused` in your 01719a1 against these notes.

### Changed

- `DESIGN.md`: the Pre-brew Check's box following CraftBeerPi.
- `proposal\PRE-BREW-CHECK.md`: a row for START naming its steps in "What each part needs".
- This file (this section) and `.impeccable\decisions\direction-log.md`. `brew-day.js` and the rest as in post24.

## The check box's kept height belongs to the column's width (M105): in the mockup (18 Nov)

Your fix in UI 6930290, now in the mockup as built, so the identity test agrees however a full-page picture lands. The
mockup had the same fault: it measured the box with its kept height applied, and kept that height whenever the class
and the column's width matched within one redraw, so a height from another width stayed for good. At 900×1200,
`#check-noanswer` stayed 694.8 px tall after a 1×1 moment, where it needs 209.9 px, and `#check-many` 387.8 px after
1280 px wide and back, where it needs 253.5 px. Now 209.9 and 253.5.

- `pbKeep`, `pbMeasure` and `pbFit`, as in your screen.js, after `pbEnd`: every height measured without the one kept;
  a height kept only at the column width and for the class it was measured at; none while the fonts are still loading.
  `fontsIn` is gone (see "The box's height while the fonts load", above): the two functions check the fonts
  themselves.
- `renderAll` sets `data-tedit`, `data-asking` and `data-pb` before it draws the recipe column again, as your screen.js
  does, so `pbFit` measures the box in the layout it is shown in: on a monitor, under `data-pb`, where a panel too tall
  for the column scrolls in it.
- The faceplates' ResizeObserver also draws again when the recipe column's width isn't `pbKeep`'s.
- `load` clears `pbKeep`, as `createBrewDay` does, so a moment never starts with another's height.

### Checked

- Your 11 checks from test_ui_prebrew_box_height.py, run on the mockup's `brew-day.html`: 11/11. The mockup as in
  post24: 8/11, the same three failing as on post24.
- Identity against the mockup as in post24: 220 pictures at 1920×1080, 1280×800, 900×1200 and 390×844, none changed.
- The pre-brew click-through and the page's height with the box or panel open, at 1920×950, 1440×900, 1180×900 and
  1280×800: as before. The fonts held back 2.5 s while the screen draws again: no box taller than its contents, in 96
  loads.

### Changed

- `brew-day.js`.
- `DESIGN.md`: the Pre-brew Check's kept height, at the column's width. `.impeccable\design.json`: the check box's
  description, the same.
- This file: "It keeps its height" in the pre-brew check's notes, and this section.
- `.impeccable\decisions\direction-log.md`.

## The strike water helper: ready to build (20 Nov)

Approved by the brewer on 20 Nov, through you: "Yes, approve it with those two fixes". The fixes answer his questions
"Do I need to scroll down to click "USE ..."?" and "What does "DONE" do?". For the HLT's water he chose "Yes, use
BrewStart's water volume (Recommended)", and for the grain "A is my answer but I think we can figure out the night
before when setting up the BrewTimer", so BrewStart gets a Grain temperature. Your two picks stand: BeerSmith's figure
beside the forecast's, and the volume shown. The reasoning, the forecast and every word are in
`proposal\STRIKE-WATER.md`; DESIGN.md has the Strike Water section and The Offer, Don't Apply Rule. The moments are
second in the strip: `brew-day.html#sw-plan`. Its figures are your bench's model's, since the same evening: see "The
strike water helper with the model's figures", below, which also says what the model changed here. The mockup carries
the model's answers in `strike-model.js`; the screen shows whatever the server's model gives, so neither that file nor
`swModel` belongs in the build. Line numbers below are the mockup's now.

### When the box shows

- **From a recipe's loading until its malt goes in** (`swPhase`, line 1592): "plan" while BrewStart is next or waits, or
  any step before the strike water step; "heat" while the strike water step (a MashInStep on the HLT) heats and holds
  the water; "moved" while MashIn on the Mash Tun brings the water to the rest and asks for the malt. Gone once a step
  after MashIn on the Mash Tun has begun. A recipe without the strike water step (`#sw-hand`) has the box only while it
  waits to start with the mash tun not in AUTO, and there USE sets the HLT's target, as SET would.
- **One box at a time** (`swHTML`, line 1980): not while the pre-brew check's box, COMPARE PROBES, or NEXT STEP's or
  RESET's question is up. `renderAll` (line 2363) closes FORECAST and the two small boxes when one of those opens or
  the phase ends.
- **In the recipe column,** after COMPARE PROBES and before the step list: `.sw` (brew-day.css line 291), Raised Slate
  with a Control Edge border.

### The head: the window, USE or BACK TO, FORECAST or CLOSE

- **The window** (`swWin`, line 1798): STRIKE, the water to the mash tun and the temperature planned (the strike water
  step's Temp, or by hand the HLT's SV), the temperature in Setpoint Green; MASH, the forecast's lowest and highest
  as the grain goes in, rounded, as "LANDS 113–118 °F" with " to " for screen readers (`swR`). Over the rest by the
  strike's doing (`swOver`: the forecast's highest point more than 0.5 °F above both the rest and where water at the
  rest would take the mash): "UP TO 137 °F OVER THE REST" in Prompt Amber. Each row `white-space:nowrap`, and one line
  at every size from 360 px up.
- **USE or BACK TO** (`swAlt`, line 1762), two thirds of the row (`.swa`): USE with the model's figure until the plan is
  within 0.5 °F of it (`SW_SAME`), then BACK TO the temperature before the first USE (`st.sw.was`), or the rest when
  none was kept. USE is `.swuse`, Selection Blue with white words, "aims under the rest" ("as the HLT's target" by
  hand); BACK TO a plain command button, "as it was". While CraftBeerPi answers, SENDING… and greyed with `WAIT`.
  While the HLT heats the strike water (the step running, or by hand the HLT in AUTO), a figure more than 0.5 °F below
  the HLT's reading is greyed, and tapped says "The water is already at 132.3 °F, above 126.0 °F, and the HLT can't
  cool it."
- **FORECAST and CLOSE are one button and one command,** `sw:more` (line 3149), so the click handler's refocus lands on
  the same button: FORECAST "in detail", or CLOSE "the forecast" while open, with `aria-expanded`, and
  `aria-controls="sw-det"` while open (`b()`'s new `controls` option, line 973). Escape closes a small box first, then
  FORECAST.
- **The dough-in line,** under the window: phase "moved", the wort pump off, and the Mash Tun reading more than 3 °F
  over the forecast's highest as the grain goes in (`fc(plan).hi[0] + 3`), with the probe at the coil's outlet: "The
  Mash Tun's 132.2 °F isn't the mash: with the pump stopped, its probe reads the water left in the HLT's coil."

### FORECAST open: the head stays in reach

- `swHTML` puts the window, the dough-in line and the buttons in `.swhead`, and the details in `.swdet#sw-det`: the
  chart (`drawSw`, line 1944), its key, the words (`swWords`, with the ghost that keeps their height when USE and BACK
  TO swap), why it's a range, what the Mash Tun may read, and the numbers by where they come from (`swList`,
  line 1834). USE no longer repeats at the foot.
- **On one screen (1180 px and wider),** the open box sets `data-pb` on the recipe column, as the pre-brew check's box
  does, so the step list, the recipe book and its links make way, and the timers too (brew-day.css line 624; see "An
  open box takes the timers' room too", below). The box is a flex column: the head keeps its size and `.swdet` scrolls
  (`flex:0 1 auto;min-height:0;overflow:auto`, line 629). And `.recipe[data-pb]>:not(.cmp):not(.sw){flex-shrink:0}`
  (line 632): only the box gives up height. Without it, at
  1920×1080 COMPARE PROBES' button, whose words need 55.4 px over its 54 px minimum, lost 1.4 px as FORECAST opened,
  and the box and its button moved up with it. Nothing else in any moment shrinks with or without the rule.
- **Where the page scrolls** (narrower than 1180 px): `.sw.open .swhead{position:sticky;top:0;z-index:2}` (line 635),
  with the head's own Raised Slate behind it, so the details pass under it.
- **The kept height** (`pbKeep`) is the closed box's only: `#recipe .sw:not(.open)` in `pbMeasure` and `pbFit`.
  Opened, its buttons are in its head, above everything in it that changes.

### The HLT's water and the grain's temperature

- **Where they come from** (`swVolOf` and `swGrainOf`, lines 1673 and 1677): BrewStart's Volume and its new Grain
  temperature where the recipe has BrewStart; by hand, the brew day's figures.
- **`swIn` and `swNumbers`** (lines 1684 and 1707): the room is the boil kettle's reading less its offset, as COMPARE
  PROBES takes it; the grain is the figure given, or else the room. What's missing, in this order: the recipe's
  numbers, the probe's reading, a room's reading (35-120 °F, `ROOM_LO` and `ROOM_HI`, line 1486), the HLT's water
  (none, or less than the
  strike water), and a figure more than 27 °F over the rest (`SW_MAX_RISE`, MashInStep's own 15 °C). Nothing stands in
  for the room: a guessed room could make USE err high.
- **The two boxes** (`swVolHTML` and `swVol`, lines 1867 and 1878; `swGrainHTML` and `swGrain`, lines 1903 and 1917),
  in FORECAST's FROM YOU, laid out as TARGET's box (`.editor.swvol`): the label with its unit, a line of instructions
  tied to the input (`aria-describedby`), −1 −.1, the input, +.1 +1, SET with the figure, CANCEL; the grain's also
  THE PROBE across its foot while a figure is in use. They open with the input focused and selected. Enter sets and
  Escape cancels. One at a time: opening one closes the other. The words, refusals and LOG lines are in
  STRIKE-WATER.md, "The words".
- **With no HLT water,** the question takes the buttons' place beside HLT WATER, "set it", which opens the water's box
  there.

### What the server needs

1. **The forecast** (the bench's model, in a worker of its own). Given the batch (the grain's weight, the water to the
   mash tun, the tun's steel, the HLT's water, the room's and the grain's temperatures, and the rest), USE's figure by
   the second rule: the hottest strike water, rounded down to 0.1 °F, that in every case takes the mash no higher than
   water heated only to the rest would, its highest point counted from the grain going in. For any strike temperature
   the screen asks about (the one planned, USE's, BACK TO's, BeerSmith's): the mash's lowest and highest each minute
   for an hour from the grain going in, the highest point, and the Mash Tun probe's highest reading from the ask for the
   malt to Next. Everything else it sends, and when it works, is in "…with the model's figures", below.
2. **The recipe's numbers,** kept on import: the grain's weight; the first infusion as BeerSmith shows it
   (DISPLAY_INFUSE_AMT) and the recoverable dead space in it (its difference from INFUSE_AMOUNT); the tun's weight
   (TUN_WEIGHT, in ounces in the mash section) and specific heat; INFUSE_TEMP and GRAIN_TEMP; and which of them the
   recipe lacks. Today the import keeps only Grain_Kg.
3. **USE and BACK TO,** your one call: the strike water step's Temp, BrewStart's Ready_Temp while it hasn't started
   heating, and the HLT's target while the strike water step runs, taking down a move question already asked; it keeps
   the temperature before the first USE, and refuses a recipe that has changed (409 `recipe_changed`, as START does),
   and a figure that has been overtaken (409 `plan_changed`, below). Brewing by hand, the HLT's target, as SET.
4. **The HLT's water:** BrewStart's Volume and Volume_Unit for the loaded recipe, and a call that changes it, logged,
   refusing a recipe that has changed. By hand, a figure CraftBeerPi keeps for the brew day.
5. **BrewStart's Grain temperature,** a new setting in the brewer's fork of cbpi4_BrewStart, beside Volume, empty by
   default, in the brewery's unit. Label "Grain temperature"; description "The grain's temperature, if it spends the
   night somewhere other than with the boil kettle. Leave blank to use the boil kettle's probe." BrewStart itself
   needn't use it. A call that sets or blanks it, logged, refusing a recipe that has changed; by hand, a figure kept
   for the brew day.
6. **The room:** always the boil kettle's probe less its offset.
7. **BrewStart's row:** `live.js` `stepModel` reads Ready_Temp, the ready time and Volume for a BrewStart step.

### In °C

The 3 °F of the dough-in line is 1.7 °C; the half degree of `SW_SAME` and `swOver` is 0.3 °C; 35-120 °F is 1.5-49 °C;
27 °F is 15 °C. Figures show one decimal in either unit, and the water in BrewStart's Volume_Unit.

### Your bench tests

- A walk that loads a recipe with the brewer's flow (BrewStart, then a MashIn step on the HLT before MashIn on the
  Mash Tun) now meets the box between COMPARE PROBES and the step list until the malt goes in, so the step list
  starts lower: the box is 152-172 px on one screen. A recipe whose first step is on the mash tun, like the demo's,
  shows it only while the recipe waits to start; one built on Brew Steps, without the recipe's numbers, shows it
  with "No grain weight or mash water in this recipe…" in place of its buttons.
- New ones worth having, as the mockup was checked: with FORECAST open at a phone, a tablet and a monitor, USE (or
  BACK TO) and CLOSE in view before and after the details are scrolled to their end, and the button in the same place,
  open and closed; USE and BACK TO, and their LOG lines; the grain's box (a figure outside 35-120 °F refused, THE PROBE
  blanking it) and the water's.

### The moments

New, second in the strip: `#sw-plan`, `#sw-forecast`, `#sw-volume`, `#sw-grain-edit`, `#sw-grain`, `#sw-hot`,
`#sw-used`, `#sw-wait`, `#sw-heat`, `#sw-move`, `#sw-late`, `#sw-doughin`, `#sw-hand`, `#sw-novol`, `#sw-missing` and
`#sw-noprobe`. They share `swDay` (line 731) and `swMorning` (line 750); `swHot` (line 709) is USE's figure for the
moments where it was pressed. `graphs.js` has the dough-in's Mash Tun reading for them; that is demo history only.
Five more came with the model's figures (below).

### Moments whose pictures change

Compared as your identity test does (animations off, the page clock stopped, software drawing), the mockup before
the strike water went in against this one, in the default, at your five sizes: all 55 earlier moments are the same,
275 pictures. The only differences are the 16 new moments, which the earlier mockup doesn't have. `#boilpower` and
`#bktarget` at 1180×860 never finish drawing on either side, as before.

### Checked (with the stand-in's figures; the model's are checked below)

- All 16 moments at 17 sizes, 360 px to 2560×1440: no page errors, no window line cut, no button's words wrapped,
  nothing wider than the screen; buttons 54-55 px tall, the small boxes' keys at least 50 px wide; the lowest text
  contrast 5.08:1 (USE's white on blue). The current step whole in the list at every one-screen size.
- FORECAST open, at 8 sizes from 360×740 to 1920×1080 and on the brewer's 1278×1197 window: USE or BACK TO and CLOSE
  in view before and after the details are scrolled to their end, the button in the same place open and closed (y 522
  on his window), keeping the focus, `aria-expanded` and `aria-controls` right. The details' room is in the next
  section.
- With `flex-shrink:0` forced on every child of the recipe column but the scrolling ones, in every moment at four
  one-screen sizes, FORECAST open where it can be: nothing else changes, so the rule only stops the 1.4 px.
- Pressed through: USE and BACK TO in every moment that offers them, and with FORECAST open (height and place
  unchanged; the title bar 12 px shorter when USE takes the move question down, as before); FORECAST then CLOSE, and
  Escape; the HLT's water (steps, typing, SET at 12 gal giving 134.2 °F, a figure under the strike water refused,
  Escape, HLT WATER with none given); the grain's (20 °F and empty refused, 70 °F giving 132.5 °F, THE PROBE back to
  133.2 °F, Escape, 68 °F by hand giving 132.6 °F, one box at a time); START held the night before; NEXT STEP on the
  move question and then the malt question. No page errors.
- Your 11 checks from test_ui_prebrew_box_height.py, on the mockup: 11/11.
- The Impeccable detector on `brew-day.css`: two more of findings it already had, `#3477c8` (USE under the pointer, the
  timer editor's main button's blue) and a 2 px corner on the chart key's swatches.

### Changed

- `proposal\brew-day.js`, `proposal\brew-day.css`, `proposal\brew-day.html` and `proposal\graphs.js` (LF, as it was);
  `proposal\STRIKE-WATER.md`, approved; and this file (this section, and two rows of the "Change by change" table).
- `DESIGN.md`: the colours (Process Red, Setpoint Green, Prompt Amber, Selection Blue, Soft Steel, PID Window Black),
  the Recipe Column (the box's place, BrewStart's row, a step's note and the versions line stepping aside), Strike
  Water (new), The Offer, Don't Apply Rule (new), the Do's and Don'ts, and eight components in its front matter.
- `.impeccable\design.json`, regenerated, with a new sample (Strike Water); `.impeccable\decisions\direction-log.md`;
  and the surface brief.

## An open box takes the timers' room too, on one screen: ready to build (20 Nov, evening)

You asked whether FORECAST's 107 px at 1180×860 and 1366×768, less than its chart, would suit a sticky head with the
page scrolling instead. Measuring it turned up more than those two sizes, and in two boxes you've already built:

- **FORECAST with timers.** The details get what's left of the column after everything else, and the timers are fixed
  in size. With the #timers pair (Stir counting down, Yeast ready) the details were 0 px at 1180×860, 1366×768,
  1440×900 and 1600×900, 41 px at 1280×950 and 1440×950, and 18 px at 1920×950, the brewer's usual window height.
  Without timers, at 1920×950 they were 174 px, which cut off the chart's key.
- **+ TIMER pressed while FORECAST is open** opened the timer's editor too: two boxes, and the details at 0 px.
- **COMPARE PROBES and the pre-brew check's box with timers** (built, post22-24). Neither gives up height, the panel
  because it keeps its tallest height (`pbKeep`) and the box by design, so the timers were pushed past the recipe
  column's foot: by 115-141 px with the panel open at 1920×950 and 1440×900, and by 57-185 px with `#check-many`'s box,
  the page growing by up to 173 px (1180×860). That's against what DESIGN.md says for both: "the page never grows",
  and the page "no taller than the window on any monitor 900 px tall or more".

**Not chosen: the page scrolling on a monitor.** It would give the details the whole window, but while the forecast is
read the title bar, with its alarms, and the faceplates would scroll out of view (The One Screen Rule), and the
squeeze wasn't only at the smallest windows.

### The rule

- **On one screen, while a box is open in the recipe column** (`data-pb`: the check's box, COMPARE PROBES, FORECAST or
  the water's or grain's box), the timers make way, as the step list already does:
  `.recipe[data-pb] :is(.steps,.book,.handlinks,.tmrs,.timer){display:none}` (brew-day.css line 624; `.timer` is the
  one rest timer an older CraftBeerPi has, by hand). A timer that runs out meanwhile still shows in the title bar with
  OK, and the frame round the screen pulses (`data-ring`); its row is back once the box closes. Narrower screens are
  unchanged: the page scrolls there.
- **A timer's editor isn't closed** (your question): what's typed in it is the editor's own state (`st.tedit`: the
  name, the minutes, a name picked), which it is drawn from every time, so it makes way with the timers and is back
  exactly as it was when the box closes. Nothing is kept anywhere else, and nothing is greyed. While a box is open
  on one screen, Escape is for the box (the keydown handler, line 3222), then for the editor as before. On a phone or
  tablet both stay on the page, and Escape closes the editor first, as now. The one way a draft still goes is the old
  one: if the timer being changed runs out, its editor closes for the alarm (`tmTick`, line 3101).
- **The other way round:** while a timer's editor is open on one screen, the strike water box makes way too, unless
  it's the box open: `.recipe[data-tedit]:not([data-pb]) .sw{display:none}` (line 619, beside the step list's rule).
  Without it, a timer's editor opened during the strike water steps made the page grow even with no timers: by 46 px
  at 1920×950 and 126 px at 1180×860 (`#sw-plan`), and by 162 and 242 px with two timers. With it, the page grows no
  more than in the built pre-brew moments: not at all with no timers, and with two not from 1920×950 up (+40 at
  1440×900 and +80 at 1180×860, as the built `#prebrew` has already, from COMPARE PROBES' button). So while a timer's
  editor is open on one screen, FORECAST and USE are out of view until it closes, as + TIMER is while another
  editor is open.

### What it gives

- FORECAST's details, timers or not: 225 px at a time at 1180×860 and 1366×768, 265 at 1440×900, 258 at 1600×900, 315
  at 1280×950, 292 at 1920×950, 415 at 1920×1080, 562 on the brewer's 1278×1197 window and 775 at 2560×1440. The chart
  and its key need 177-209 px, so they show whole at every size.
- COMPARE PROBES' panel shows whole at 1180×860 (435 px), timers or not; by hand, with three timers or the one rest
  timer, it takes the column, and DONE brings them back.
- `#check-many`'s box with two timers: nothing past the column's foot, and the page doesn't grow, from 1180×860 up.

### Moments whose pictures change

Compared as your identity test does, the mockup before this change against this one, all 71 moments at your five
sizes: 17 change, all at the one-screen sizes (1180×860, 1440×900, 1920×1080) and none at 390×844 or 820×1180.
- `#probes`, `#probes-apart`, `#probes-off` and `#probes-none`: COMPARE PROBES' panel shows whole where it used to
  scroll, and the TIMERS section under it is gone while it's open. Elsewhere on those pages only faint anti-aliasing
  at panel corners changes (at most 63 of 255, about 1,400 pixels at 1440×900), most likely because the panel no
  longer scrolls.
- `#check-clock`, `#check-now`, `#check-probe`, `#check-adds`, `#check-many`, `#check-noanswer`, `#check-noprobe`,
  `#check-slow` and `#check-unsure`: the TIMERS section under the check's box is gone while it's open, and nothing
  else. At 1180×860 `#check-many`'s page is no longer 17 px taller than the window.
- `#sw-forecast`, `#sw-volume`, `#sw-grain-edit` and `#sw-grain`: the open box takes the timers' room too.
- `#sparge-heat` at 1920×1080 was flagged once and came out the same on two reruns: a flake.
- The editor kept and the strike water box making way for a timer's editor, after your question: none of the 71
  moments changes (355 pictures against the mockup just before them).

### Known limit, not designed: timers and the current step

With timers in the column on one screen, the closed strike water box can leave the step list too short for the
current step, which DESIGN.md says stays whole whatever takes the column's height. With two timers on a 1920×950
window: `#sw-plan` (29 px of list for a 63 px step), `#sw-heat` (95 for 106) and `#sw-doughin` (34 for 63). With one
timer at 1440×900 and 1180×860, `#sw-plan` and `#sw-doughin`, and at 1180×860 `#sw-heat` too. The list then shows what
it can of the current step, from its top. The built moments (`#prebrew`, `#timers`) keep it whole at every size with
two timers, and at 1920×1080 every strike water moment does. A fix means shrinking or hiding something the brewer
approved (a slimmer box where the column is short, or the timers on one line each, which hides PAUSE), so it waits
for him; it's in the direction log.

### Your bench tests

- A walk that opens COMPARE PROBES, or gets the check's box, with the TIMERS section on screen at 1180 px or wider now
  finds the section gone until the box closes; one with a timer's editor open when a box opens finds it gone with
  the section and back, as it was, when the box closes. One that opens a timer's editor during the strike water steps
  finds the strike water box gone until the editor closes.

### Checked

- FORECAST's details at 9 one-screen sizes, with no timers and with the #timers pair: 225-775 px, the chart and its key
  whole at every size, the page no taller than before. USE and CLOSE where they were (y 551 at 1920×1080, 522 at
  1440×900 and 1180×860, 430 at 1366×768), open and closed, and after the details are scrolled to their end.
- A timer half typed, at 1180×860, 1440×900 and 1920×950: a new timer's name and minutes when COMPARE PROBES opens
  (back on DONE) and when the check's box opens after START is held (back on Escape, which is DON'T START); out of
  view with the timers meanwhile, and Escape closes the box first. While a timer's editor is open the strike water
  box makes way, and is back on Escape, CANCEL, the timer's START, or DONE for a running one renamed. At 900×1000 a
  new timer half typed and FORECAST both open; widened to 1440×900, FORECAST stays open and the editor makes way with
  the timers, then Escape closes FORECAST and brings the editor back as it was, and Escape again closes the editor.
- A timer's editor during the strike water steps (`#sw-plan`, `#sw-heat`, `#sw-novol`), with no timers and with two,
  at five one-screen sizes: the page grows exactly as much as `#prebrew`'s, as built.
- `#probes` and `#check-many` with the #timers pair at 1180×860, 1440×900, 1920×950 and 1920×1080: nothing past the
  column's foot and the page no taller than the window; the panel whole (435 px, 399 px at 1920 wide).
- By hand, `#timers-hand` (three timers) and `#manual?timers=today` (the one rest timer), at 1440×900 and 1920×950:
  COMPARE PROBES takes the column, and DONE brings the timers and the recipe book back.
- The strike water's own checks again: all 16 moments at 17 sizes, FORECAST's reach at 8 sizes, every press. The same
  results as before but for the open box's height and the details' room. No page errors anywhere.
- Nothing else in the column shrinks, in every moment at four one-screen sizes, FORECAST open where it can be; your 11
  checks from test_ui_prebrew_box_height.py, 11/11.
- The alternative of one-line timer rows, measured on the mockup before the change: FORECAST's details 55-122 px from
  1180×860 to 1920×950, still less than the chart.

### Changed

- `proposal\brew-day.css` (the two rules, each joining the line it extends) and `proposal\brew-day.js` (Escape while a
  box is open, and two notes in `renderAll`).
- `DESIGN.md`: Timers, COMPARE PROBES, the strike water's FORECAST, and a Do. `proposal\STRIKE-WATER.md`: FORECAST
  opened, "Where it sits, and when", and its checks. This file: this section, a row of the table, and the strike water
  section's line numbers.
- `.impeccable\decisions\direction-log.md`, the surface brief and `.impeccable\design.json` (regenerated).

## The strike water helper with the model's figures: ready to build (20 Nov, late)

Your bench's model is done (`strike_model.py`, 6b17b8d, then 6f3c001 with its fix for warm grain), and its figures are
now the mockup's, with the five changes you asked for. What each became, then what the server needs beyond "The strike
water helper", above. The reasoning is in `proposal\STRIKE-WATER.md` (Decisions 7-12); DESIGN.md's Strike Water
section has the rules.

### The figures, and how the mockup carries them

Test Recipe v5, the room at 60.4 °F, 15 gal in the HLT, the probe at the coil's outlet, by the second rule:

- USE 132.4 °F with the grain at the room's 60.4 °F, 131.8 °F with it given as 70 °F; 133.3 °F with 12 gal in the HLT,
  131.4 °F with 20.
- As planned, 126.0 °F: lands 113-118 °F as the grain goes in, 118-126 °F half an hour later. At USE: 118-124 °F and
  120-126 °F. BeerSmith's 134.6 °F could reach 128 °F (127.94), over the rest; a planned 145.0 °F up to 137 °F.
- With USE the Mash Tun may read up to 132 °F during dough-in.
- USE if every guess proved middling: 137.3 °F. The three that would raise it most if known: the minutes from the grain
  to Next (+0.8), the tun's steel warmed (+0.7), the tun's heat loss (+0.6).
- With the probe at the tun's outlet (`#sw-tunprobe`): USE 132.9 °F; water at the rest peaks 127.47 °F.
- Brew morning: MashIn asks for the malt 4 s after the water arrives, Kal's way too; 40 s on, the Mash Tun reads
  132.2 °F, the HLT 132.3 °F, its element off (Kal's way: 125.8 °F, 125.9 °F, 0.9 %).

`proposal\strike-model.js` (new, 100 KB, `SW_MODEL`, loaded before `brew-day.js`) holds the model's answers, written by
a generator that runs your model at one commit, 6f3c001, copied out of the bench, and writes nothing into it; it
reproduces the report's figures exactly. For the grain at 35, 60.4, 70, 95 and 120 °F and 8.5, 11, 15 and 20 gal in the
HLT: USE before and after rounding, USE at the middle guesses, the levers, the HLT's own loss share, and the forecast
at USE and at 17 strikes from 110 to 175 °F; and the tun outlet's answers for `#sw-tunprobe`'s own numbers. `swModel`
(line 1649) weights the four points around any other numbers, standing in for the server working them out. None of it
belongs in the build.

The warm-grain jump I sent you on 20 Nov is gone with your helper's fix. With the grain at 95 °F, USE is now 131.2,
130.7, 130.1 and 129.6 °F at 8.5, 11, 15 and 20 gal (it was 131.2, 129.0, 126.0 and 129.6), and with it at 120 °F,
128.0, 128.4, 128.2 and 128.1 °F. What else the rebuild moved is under "Checked" and "Moments whose pictures change",
below.

### Your five points

1. **The rule.** FORECAST: "It's a range because some of the rig hasn't been measured yet (below). USE errs low: even
   at the top of the range, it takes the mash no higher than water heated only to the rest would." USE's "aims under
   the rest" stays. The words (`swWords`): when no figure's highest shows over the rest at 0.1 °F, "Neither is forecast
   to go over the 126 °F rest." (126.03 shows as 126.0). Where one does, it gets "and could reach 127.5 °F", and when
   water at the rest goes over too (`restPeak`, the highest of the forecast at the rest, 0.05 °F or more over it):
   "Going over the rest is PID_HERMS's own overshoot, which it makes whatever the strike: with the water heated only to
   the rest, it takes the mash to 127.5 °F." if every figure that shows over is within it, or else only "With the water
   heated only to the rest, PID_HERMS by itself takes the mash to 127.5 °F." Amber (`swOver`) now needs more than
   0.5 °F above both the rest and `restPeak`, so Kal's way never goes amber for PID_HERMS's own overshoot. When USE comes
   out at the rest itself with the strike water there already, there's no USE, and FORECAST says "USE would be the rest
   itself here, so there's nothing to change: hotter water could take the mash higher than water heated only to the
   rest would."
2. **The figures,** above.
3. **"Lands" is the moment the grain is mixed in,** the model's: minute 0 of the envelope, the chart's left edge (GRAIN
   IN), and what a stirred hand thermometer reads then. The lowest point before Next rests on how long he waits, a guess
   of 0-10 min. The words say "lands 113-118 °F as the grain goes in"; the dip while he waits shows on the chart.
4. **The cases became ranges.** NOT MEASURED YET (`SW_GUESS`, `swList`, line 1834) lists your eleven guesses, each with
   its range, in a fixed order (the v5 levers', so no row moves as the numbers change), then PUMP OFF, the held
   assumption that the stopped probe reads the HLT's water (coil outlet only). Then, from the answer: "Knowing the
   minutes from the grain to Next, how much of the tun's steel warms and the tun's heat loss would raise USE the most:
   about 0.8, 0.7 and 0.6 °F. If every one proved to be the middle of its range, USE would be 137.3 °F." It doesn't
   show the value USE's worst case takes: at grain 70 °F the worst warms all of the tun's steel and loses nothing on
   the way, which alone would read as USE not being cautious there. ON THE WAY is the transfer loss, 0-2 °F. The groups
   follow your §1, with THE RIG'S SETUP new: where the mash probe sits, and that the strike water goes through the coil.
5. **The two states.**
   - **Working it out** (`swNumbers`' `wait` and `stale`, line 1707; `swWorkSays`, `swWas`, `swWhy`, lines 1736-1750).
     Nothing worked out yet: MASH "– – WORKING OUT", USE "– – °F" greyed, "working it out". Worked out again: the last
     answer stays, in Stale Grey Text, `#737f8d` (MASH, the chart's bands, the words: `.swm.stale`, `svg.stale`,
     `.swf.stale`); USE greyed with the last figure. One line in the head: "Working out USE: 20 s so far." or "Working
     out USE again: 9 s so far.", counted from when the server started (`#sw-el`, on the 1 s tick at line 3297). Why,
     and what the grey figures are for, above the chart ("The HLT's water changed, so CraftBeerPi is working USE out
     again. Until then, these are the figures for 15 gal in the HLT.") and in the greyed USE's reason ("Not yet: the
     HLT's water changed, and CraftBeerPi is working USE out again. 132.4 °F was for 15 gal in the HLT."). BACK TO stays
     live. In the mockup SET of the water or the grain starts it (`swRework`, line 1719), it takes `SW_WORK_S` (30 s),
     and numbers it already has an answer for start nothing (`swSameIn`: within 0.05 gal or °F, the room within
     0.5 °F).
   - **Refused** (`swRefuse`, `swRefusal`, `swChanged`, lines 2060-2080): as START's refusal is said, a note under the
     box for 6 s, read out, and no LOG line: "USE 132.4 °F wasn't applied: BrewStart's grain temperature is now 70.0 °F,
     so USE is 131.8 °F." The new figure takes USE's place; the window still shows the strike water. Refused while it's
     still being worked out: "…, and CraftBeerPi is working USE out again." and the box shows it working. In the mockup
     `st.sw.srv` stands for the server having moved on.

### What the server needs, beyond "The strike water helper"

- **The worker:** the model in a process of its own, never in the control loop: on a recipe's loading, when the grain's
  or the room's temperature moves by more than 0.5 °F, and when a number it works from changes. The last answer is kept
  with the numbers it came from and an id, and sent until the new one is ready, with `working: {since, why}` meanwhile
  (`why`: the HLT's water, the grain's temperature, the room's, or another number). The screen counts the seconds from
  `since`.
- **What it sends,** with the step state or from `GET /step2/strike`: the plan's id; USE, or none; the numbers it came
  from (the grain's temperature and where from, the room's, the HLT's water and where from, where the probe sits); for
  each strike shown (the planned, USE's, BACK TO's, BeerSmith's) the lowest and highest each minute for 60 min from the
  grain going in, the highest, and the probe's highest from the ask for the malt to Next; the forecast at the rest's
  highest (`restPeak`); each guess's range and middle; the three biggest levers; USE at the middle guesses. A strike the
  screen hasn't got (the HLT's target changed by hand) gets a forecast without its own search, from the cases USE found.
- **`POST /step2/strike`:** as your §5, 409 `plan_changed` with the new plan (its figure and numbers) when the numbers
  have moved and the sent figure is hotter than the new USE. And while the worker is still at it, a USE with an old plan
  id refused the same way with `working: true`: the screen greys USE then, so only a screen that hasn't caught up sends
  one. BACK TO is always allowed.
- **The plant file,** with where the probe sits for THE RIG'S SETUP and the dough-in line (coil outlet only).

### The moments

New: `#sw-working`, `#sw-working-open`, `#sw-reworking`, `#sw-refused` and `#sw-tunprobe` (from line 662). `swHot`
(line 709) is the model's USE. `swMorning` (line 750) takes the dough-in readings from `SW_MODEL.morning`. In
`graphs.js` the Mash Tun's line climbs to the strike temperature during the transfer, from 4 min before Next, then
settles on the HLT's water; that is demo history only.

### Moments whose pictures change

Compared as your identity test does, the mockup before the model's figures against this one, at your five sizes, 380
pictures of 76 moments: 58 are the same (290 pictures), the 55 outside the strike water and its `#sw-novol`,
`#sw-missing` and `#sw-noprobe`. 18 differ, all strike water: the five new ones, which the earlier mockup doesn't have,
and 13 whose figures or words changed: `#sw-plan`, `#sw-forecast`, `#sw-volume`, `#sw-grain-edit`, `#sw-grain`,
`#sw-hot`, `#sw-used`, `#sw-wait`, `#sw-heat`, `#sw-move`, `#sw-late`, `#sw-doughin` and `#sw-hand`. `#boilpower` and
`#bktarget` at 1180×860 never finish drawing on either side, as before.

Rebuilt from 6f3c001 and compared the same way with the mockup just before the rebuild: 74 of the 76 moments are the
same (376 of 380 pictures). `#sw-grain` and `#sw-tunprobe` differ only at 390×844 and 820×1180, where the page shows
FORECAST whole: USE at the middle guesses went from 136.5 to 136.6 °F and from 137.9 to 138 °F, and `#sw-tunprobe`'s
three biggest levers from 0.8, 0.8 and 0.7 to 0.9, 0.9 and 0.8 °F. `#boilpower` and `#bktarget` at 1180×860 again never
finish drawing on either side.

### Checked

- The model run from my own folder (no bytecode written into the bench) reproduces the report: USE 132.4 and 131.8 °F,
  lands 117.8-123.6 °F, highest 125.99 °F; 133.3 °F at 12 gal, 131.4 °F at 20.
- Rebuilt from 6f3c001, copied out of the bench at that commit: of the 41 figures these notes and STRIKE-WATER.md
  quote, all are as before but one, USE with 0.50 gal under the false bottom, now 132.5 °F (STRIKE-WATER.md, "The dead
  space in the BeerSmith profile"), as the model also tries the step above its rounded answer. The 27 presses, the edge
  checks and all 21 moments at a monitor's and a phone's size pass again, with no page errors.
- 27 presses: USE and BACK TO; the HLT's water set to 13.5 gal (working out again, the stale grey, the greyed USE and
  its reason, the seconds counting on, then USE 132.9 °F); the grain at 70 °F (131.8 °F), THE PROBE (132.4 °F), the
  probe's own 60.4 °F typed (nothing to work out); refused with the new figure (the note, USE 131.8 °F offered, the
  strike water unchanged, nothing logged, then pressed again and applied); refused while working; the first answer after
  loading; NEXT STEP on the move question with USE's water and with Kal's way, both asking for the malt at once, the
  Mash Tun reading the HLT's water, the dough-in line showing. And the edges: USE coming out at the rest itself, set so
  in the page (no USE, FORECAST says why), and USE in `#sw-tunprobe` (132.9 °F, the PID_HERMS sentence kept).
- All 21 moments at 17 sizes, 360 px to 2560×1440: no page errors, no window line cut, no button's words wrapped,
  nothing wider than the screen; buttons 54-55 px; the lowest text contrast 4.98:1, the stale grey on the window's
  face. The current step whole at every one-screen size, but for the refusal's 6 s at 1180×860 (DESIGN.md, Known
  limits).
- Your 11 checks from test_ui_prebrew_box_height.py: 11/11. Nothing in the column shrinks: 0 of 76 moments at four
  one-screen sizes, FORECAST open where it can be.

### Changed

- `proposal\strike-model.js` (new, LF), `proposal\brew-day.js`, `proposal\brew-day.css`, `proposal\brew-day.html` (the
  script and five moments' links) and `proposal\graphs.js` (LF); `proposal\STRIKE-WATER.md`; and this file (this
  section; "The strike water helper": its stand-in wording, figures and line numbers; the timers section's line
  numbers; a row of the table).
- `DESIGN.md`: Strike Water (the model, the two states, PID_HERMS's own overshoot, the known limits), The Offer, Don't
  Apply Rule, a Do and a Don't, and in the front matter Stale Grey Text and two components.
- `.impeccable\design.json`, regenerated; `.impeccable\decisions\direction-log.md`; the surface brief. Regenerating
  it also put right the Target Editor's description, which earlier refreshes had given its last sentence seven times.
- Rebuilt from 6f3c001 (22 Nov): `proposal\strike-model.js`; the model's commit here, in STRIKE-WATER.md, DESIGN.md,
  the direction log and the surface brief; the warm-grain paragraphs; USE with 0.50 gal of dead space; and the count of
  moments that stayed the same when the model's figures went in: 58, the 55 outside the strike water and 3 of its own,
  which I had written as 58 outside it. STRIKE-WATER.md's dead space passage no longer names the BeerSmith equipment
  profile, as the one on the brewery PC was changed on 10 Nov: it says the figures come from Test Recipe v5's export.

## UNLOAD, a way out of a loaded recipe: ready to build (web UI post32, 22 Nov)

The brewer, on 8012 with Test Recipe v5 loaded and not begun, found no way to abort a recipe once it was loaded. You
approved building the fix today. The design is DESIGN.md's The Way Out Rule; the words agree with the recipe pages'
UNLOAD (RECIPES.md, impeccable-recipes 8823b54), with three differences given at the end. CraftBeerPi needs nothing
new: it is `POST /step2/clear`.

### What to build (screen.js, brewday.css)

1. **Where.** The status line becomes a row (`.rstat`): "Ready to start · step 1 of 7" on the left, and at its end a
   quiet button, UNLOAD (`.unl`), 44 px tall and 112 px wide, as wide as UNLOADING…, LOG's look with its word in Soft
   Steel. No hint line. It costs the step list 22 px on one screen and the page 22 px elsewhere. Copy `.rstat` and
   `.unl` from the mockup's `brew-day.css`.
2. **Its state** (`unloadRule`, `unloadAsks`, `inBook`, brew-day.js):
   - no connection: greyed, "No connection. Controls are paused.";
   - the pre-brew check under way: greyed, the check's own reason (`PB_WAIT`);
   - UNLOAD, START, STOP, NEXT STEP, RESET, LOAD or the strike water box's command on its way: greyed, "Waiting for
     CraftBeerPi to answer.";
   - a step running (any step `A`, so BrewStart waiting for its time too): greyed, and tapped it says what runs
     (`unloadRunWhy`): "Craftbeerpi Test Recipe v5 is running: Saccharification, 23:41 left. Stop it first." The
     middle part follows the current step's wait word, as the step's row does: "Boil, heating to 210.2 °F",
     "…, cooling to 170 °F", "…, waiting for you", "Sparge, heating the water to 168 °F". BrewStart planning Ready by
     (live.js's `m.ready` and `m.temp`, its Heat_Kettle's name): "BrewStart is waiting to have the HLT at 132.4 °F by
     07:00"; planning Start at: "BrewStart is waiting to start at 05:30" (the time from STARTS);
   - begun and nothing running (some step `S` or `E`, or one past the first done, the boil held for the brewer
     included), or a recipe the Recipe Book doesn't have: it asks first;
   - otherwise one tap.
3. **The Recipe Book check.** Today the screen reads the book only with no recipe loaded (`loadBook`). Read it while a
   recipe is loaded too: once as the page opens, and again after a LOAD or an unload. `inBook`: the book has a recipe
   of the loaded recipe's name (`basic.name`). If CraftBeerPi comes to record the book file a recipe was loaded from
   (the recipe pages' server change 4), use that instead. While the screen can't tell (the book not read yet, or the
   read failed), UNLOAD asks.
4. **The question** (`unloadAskHTML`), in RESET's place under the three buttons, RESET's box and answer buttons:
   - begun, stopped: "Unload the recipe and brew by hand? CraftBeerPi forgets it stopped at step 3, Saccharification,
     after 16 of its 40 min. The Recipe Book keeps the recipe. Kettles, pumps and timers stay as they are." Under a
     minute: "…, under a minute into its 40 min."; a step without minutes: "… it stopped at step 1, MashIn.";
   - begun, the boil (or another step) waiting for the brewer: "… CraftBeerPi forgets it's at step 5, Boil, waiting for
     you. …";
   - not in the Recipe Book: "The Recipe Book keeps the recipe." becomes "It isn't in the Recipe Book, so it can't be
     loaded again."; and while the screen can't tell, "The Recipe Book can't be checked right now, so it may not be
     there to load again." On a recipe not begun the "CraftBeerPi forgets …" sentence is left out;
   - answers UNLOAD (the Answer White one) and STAY AT STEP 3 (the step's number), or DON'T UNLOAD on a recipe not
     begun, neither the default; Escape and the second answer close it. It closes too when it stops being true: the
     recipe goes, or a step starts here or elsewhere.
     Opening it closes RESET's and NEXT STEP's questions, the check's box, COMPARE PROBES and the strike water box's
     FORECAST and small boxes, as RESET's does; RESET or NEXT STEP pressed while it is open puts their question in its
     place. It counts as asking (`data-asking`), and the strike water box steps aside while it is open (`swHTML`).
5. **The command** (`cmdUnload`, `cmdUnloadGo`): `POST /step2/clear`.
   - While it waits: UNLOADING… on the button, greyed; START, RESET, NEXT STEP, USE and BACK TO greyed with "Waiting
     for CraftBeerPi to answer."
   - 200: the state CraftBeerPi sends next shows no recipe, and the column is brewing by hand. LOG: "Craftbeerpi Test
     Recipe v5 unloaded: Brew Day is brewing by hand", "confirmed". The questions CraftBeerPi takes down get "no longer
     needed" on their lines, as after a reset. The graphs lose their step marks and DAY goes back to the last 8 hours,
     as after a reset.
   - 409 `step_running`: nothing changes and the screen logs nothing of its own. The answer's `detail` shows in the
     column's note line for 6 s, word for word: "Saccharification is running. Stop it before unloading the recipe."
     (core 4.7.7.post58; before it, "… Stop it before clearing the brew steps."). CraftBeerPi's own notice of it
     ("Recipe not unloaded: …", an info) is logged by `logAlert`, "from CraftBeerPi", as now. UNLOAD is greyed once the
     state shows the step running.
   - no answer in 5 s, or another error: a failed command. LOG: "Craftbeerpi Test Recipe v5 unloaded: Brew Day is
     brewing by hand", "failed: {why}", in light red; the title bar's alarm "Command failed": "Craftbeerpi Test Recipe
     v5 did not unload. It is still loaded.", with TRY AGAIN, which sends the clear again without asking again. An
     answer that comes after all (the recipe gone) takes the alarm down.
6. **An unload on another screen** (the recipe pages' UNLOAD, the old Brew Steps page's Clear, another Brew Day): one
   line, "Craftbeerpi Test Recipe v5 unloaded", "from another screen", when the steps go from some to none and this
   screen hasn't pressed UNLOAD in the last 10 s; beside "Recipe reset to step 1 · from another screen" in
   `logEvents`. The name is the one the previous state had. Live only: the mockup has no other screen.
7. **Words elsewhere** that become UNLOAD's: START's "The recipe was cleared on another screen." is now "The recipe was
   unloaded on another screen." (`lostSay`), and USE's and BACK TO's refusal on a recipe changed elsewhere ends "…: the
   recipe was unloaded on another screen." (`recipe_changed`, no steps).
8. **Moments for the demo**, from the mockup: `#unloaded`, `#unload-ask`, `#unload-notinbook`, `#unload-held`,
   `#unload-running`, `#unload-wait`, `#unload-refused`, `#unload-failed` and `#load-notinbook`. Every moment with a
   recipe loaded gets the new status line, so the identity test's pictures of those change; with no recipe, none do.
9. **LOAD over a recipe the Recipe Book doesn't have** (agreed with Robin after the first copy; small, so it can go in
   post32 or the build after). The by-hand list shows after a recipe has finished too, and CraftBeerPi keeps the
   finished recipe's steps, all done, until another is loaded. If those steps aren't in the Recipe Book (the same
   `inBook` test as UNLOAD's), LOAD there asks first, in the list's place (`loadAskHTML`, `loadAsks`, `cmdLoad`):
   "Load Craftbeerpi Test Recipe v5 in place of Rye Pale Ale? Rye Pale Ale isn't in the Recipe Book, so it can't be
   loaded again. Save it there on Brew Steps to keep it. Kettles, pumps and timers stay as they are." For steps with no
   name: "Load … in place of the steps on Brew Day? They aren't in the Recipe Book, so they can't be loaded again.
   Save them there on Brew Steps to keep them. …". The answers are LOAD INSTEAD (the Answer White one) and DON'T LOAD,
   neither the default; Escape closes it. It closes too if another recipe is loaded meanwhile. With no recipe at all,
   or one the book has, LOAD stays one tap.

### In CraftBeerPi

Taken by Brett for core 4.7.7.post58: `CLEAR_WHILE_RUNNING` says the brewer's word, "{} is running. Stop it before
unloading the recipe.", titled "Recipe not unloaded". The screen shows the answer's `detail` as it comes, so nothing
in the screen depends on it; `#unload-refused` shows the new words.

### Where it differs from the recipe pages' UNLOAD

Robin knows of these.

- Brew Day's UNLOAD is a quiet button without the hint line "brew by hand": it is the screen's least used control,
  beside START, STOP and NEXT STEP, and the step list can't spare the height. The question carries "brew by hand".
- The question is shorter than the recipe pages' (four sentences): on one screen at 1180 to 1440 px wide it's no
  taller than RESET's by more than a line, so the current step stays whole.
- A recipe the Recipe Book doesn't have asks even before it begins, as one tap would lose it for good. Robin's LOAD
  now does the same, and so does Brew Day's LOAD over a finished recipe (point 9). His not-begun answer, DON'T UNLOAD,
  is Brew Day's too.

### Checked

- `files\unload_presses.py`: 61 presses, all pass: one tap; the night before, USE's figure not kept and LOAD giving
  the recipe back as saved (126 °F, 15 gal, USE offered again); the question's words, answers, Escape, STAY, RESET and
  UNLOAD taking each other's place, and closing when a step starts elsewhere; the boil's question taken down; not in
  the book; LOAD over a finished recipe not in the book, with and without a name, over one in the book and over none,
  and under OTHER RECIPE (`?col=new`); greyed with its reasons (Saccharification, the boil, heating to the boil, a
  SpargeStep heating its water, BrewStart waiting); every wait; `?col=new` beside OTHER RECIPE; no connection; and the
  nine moments.
- The earlier suites, unchanged and passing: `bk_presses.py` (12), `sw7_presses.py` (28), `sw8_presses.py` (30),
  `tm2_presses.py` and `tm2_col_presses.py`.
- Measured at 360 × 780, 390 × 844, 700 × 900, 820 × 1180, 1024 × 768, 1180 × 860, 1280 × 800, 1366 × 768, 1440 × 900
  and 1920 × 1080: nothing overflows, the status line keeps one line, and the current step stays whole in every moment
  but one: the boil waiting for the brewer with UNLOAD's question open at 1180 to 1440 px wide, where RESET's question
  leaves the same sliver. That is the column's known limit, which the column proposal (`?col=new`) is about.
- Pictures against your copy (UI 63df107), 18 moments at the five usual sizes: the six with no recipe are the same;
  in the twelve with one, everything outside the recipe column is the same on one screen, and elsewhere the page is
  22 px taller from the column down.

### Changed

- `proposal\brew-day.js`, `proposal\brew-day.css`, `proposal\brew-day.html` (eight moments' links);
  `proposal\STRIKE-WATER.md` (the refusal's "unloaded"); and this section.
- `DESIGN.md`: Buttons (the quiet button, the answer button), Recipe confirmations, Recipe Column (the status line,
  UNLOAD, brewing by hand, the versions line), the pre-brew check's and the strike water's "unloaded", The Start Over
  Rule's last sentence, and The Way Out Rule.
- `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`, regenerated (the new rule).

## The one clock, CraftBeerPi's: ready to build (M120, 22 Nov)

On 8012, at 60×, the brewer set BrewStart to start at 12:04 and pressed START. CraftBeerPi's clock read 26 Nov 07:22,
and BrewStart began 4.7 real minutes later, while the title bar said about 10:05. The title bar and LOG read the PC's
clock (`daySeconds()`); everything CraftBeerPi does runs on its own (`cbpi.api.clock`). You decided there is one clock,
CraftBeerPi's, and nothing reads the PC's. The design is DESIGN.md's The One Clock Rule. CraftBeerPi needs nothing
new: the log window's `now` and `scale` already say where its clock is and how fast it runs.

### What to build (screen.js, brewday.css)

1. **One clock for the screen.** `brewNow()` (screen.js, by `syncBrewClock()`) becomes the clock for every time shown,
   not only the boil's pause.
   - `syncBrewClock()` asks as the page opens, once a minute from `liveTick` (today it asks only while the heat is
     paused), and again when the connection comes back. Between answers it counts on from the last one at its
     `scale`, as now.
   - Until the first answer the clock is unknown, and `brewNow()` returns null. Today it falls back to the graphs'
     history (`H.now() + H.day()`), whose clock starts as the PC's until its own first answer (`fixed` in history.js).
     Take that fallback out, or use it only once the history has had its answer.
   - The graphs' history can keep its own asking, or read this clock; they ask the same endpoint and agree to within a
     second. Your call.
2. **The title bar's time.** In `liveTick` and `renderAll`, `st.t` is CraftBeerPi's time of day,
   `daySeconds(new Date(brewNow() * 1000))`, and null while `brewNow()` is. `#clock` shows `hhmm(st.t)`, or "– –:– –"
   while it's null. `blankMoment`'s `t` starts null.
3. **The tag** (`clockTag` and `clockSet` in the mockup; copy `.clock[data-sim]`, `.clock .cd`, `.clock .sr` and the
   phone rules from `brew-day.css`).
   - CraftBeerPi's date is the local date of `new Date(brewNow() * 1000)`, compared with the screen's, `new Date()`.
     The speed is the clock's `scale`, compared with 1.
   - Neither differs: the time alone, as today, with no spans and no `data-sim`. Either does:
     `<span class="ct">21:12</span><span class="cd" aria-hidden="true">…</span><span class="sr">…</span>`, and
     `data-sim` on `#clock`.
   - The tag's words: the date as "THU 26 NOV", the speed as "60× SPEED", joined by " · ", each only where it differs.
     On a phone the weekday and "SPEED" are hidden (`.lg`): "26 NOV · 60×". A speed that isn't whole shows as it is,
     "2.5×".
   - For a screen reader (`.sr`): "CraftBeerPi's clock, Thursday 26 November, running 60 times as fast", or either
     part alone.
   - Sizes: 15 px on a monitor, beside the time; on a phone (700 px and narrower) 12 px, under the time, in a column
     (`flex-direction: column`), so the title bar keeps its height there.
4. **LOG** (`logEvent`).
   - Each line's time is CraftBeerPi's: `hhmmss(st.t)` from `brewNow()`. `e[5]` stays `Date.now()`, for what it does
     now: keeping lines and grouping a burst.
   - Keep each line's CraftBeerPi date with it, in a field of its own. Lines kept from before (`loadEvents`) have none,
     and show no date.
   - While the title bar shows the tag, a line whose date isn't CraftBeerPi's date now shows it before the time:
     "26 Nov 23:58:40" (`logDate`). On the rig, and wherever the tag doesn't show, LOG is as today.
   - A line logged before the first answer takes its time from that answer, counted back by the real seconds since
     the line (its `e[5]`). "Connecting to CraftBeerPi", shown until the first connection, has no time.
5. **What stays in real seconds**, all `Date.now()` already, listed so none of them moves to CraftBeerPi's clock: the
   5 s wait for an answer (`st.expect`), a note's 6 s, the beep while an alarm waits (`rangAt`), CHECKING… (`PB_CLOCK`),
   "Last reading N s ago" (`lostAt`) and START's hold. When the timers' REMOVE is built, its UNDO row lasts 10 real
   seconds too: CraftBeerPi keeps a removed timer on real seconds (`TimersController.UNDO_FOR` and `UNDO_GRACE`).
6. **Already on CraftBeerPi's clock**, checked, no change: the graphs' times and DAY (history.js), the boil's pause
   (`pausedFor`), the timers (`liveTmTick`, counted on with the scale), how long CraftBeerPi has been working USE out
   (`swElapsed`; CraftBeerPi stamps `since` on its clock, so at 60× a 20 s run reads 20 min, which is how long it took
   in the simulated brew), the step's time left, STARTS (BrewStart's own text), "Estimated completion" (SpargeStep's
   words) and every time CraftBeerPi writes in a notification. `graphNow()`'s fallback to `daySeconds()` is used only
   without the history; make it `brewNow()` too, so nothing reads the PC's clock.
7. **The BrewStart edit's "now"**, for when it's built (designed next): it is `brewNow()`; Today and Tomorrow are
   CraftBeerPi's dates; and on a simulator a time also says how far off it is in real time. Its words come with that
   design.
8. **Moments for the demo**: `#sim-clock` (a simulator at 60× whose clock reads 26 Nov while the screen's says 22 Nov)
   and `#sim-clock-1x` (at 1×, on the same date: the time alone). A moment's `sim: {scale, day0, pc}` gives the speed,
   CraftBeerPi's date at the moment's midnight and the screen's date. The demo's clock runs `scale` of CraftBeerPi's
   seconds a real second (`startTick`), and everything on it with it. No other moment's picture changes.

### Limits

- A Pi whose clock the internet hasn't set yet (in the minute after it starts) shows its own time in the title bar,
  as CraftBeerPi has it, and its date where that isn't the screen's. Before, the title bar showed the screen's time:
  right, but not the one CraftBeerPi acts on. The pre-brew check says so at START, as now.
- Times are shown in the screen's time zone. The Pi and the screen share one on the rig.

### Checked

- `files\clock_presses.py`: 17 presses, all pass. The rig and a simulator at 1× show the time alone, and the rig's LOG
  shows times alone past midnight. At 60×: the date and speed, the screen reader's words, 60 of CraftBeerPi's seconds a
  real second, its midnight rolling the date, LOG's line from the day before saying its date, a 1 min timer running out
  in a real second; the beep every 3 real seconds, "Last reading" in real seconds, UNDO's row there after 2 real
  seconds and gone after 10. On a phone, the short tag and nothing wider than the screen.
- `files\clock_measure.py`, at 360 × 780, 390 × 844, 700 × 900, 820 × 1180, 1024 × 768, 1180 × 860, 1280 × 800,
  1366 × 768, 1440 × 900 and 1920 × 1080: with the tag, the title bar keeps its height (121 px on a phone, 127 px at
  820, 71 px on one screen), the brewery's name its size and lines, and the tag stays on the screen.
- The earlier suites, all passing: `unload_presses.py` (61), `bk_presses.py` (12), `sw7_presses.py` (28),
  `sw8_presses.py` (30), `tm2_presses.py` (72), `tm2_col_presses.py` (34) and `review_check.py` (36).
- Pictures against your copy (UI f4b1010), every moment at 1440 × 900 and 390 × 844, twice: only the two new moments
  differ. One moment in each run differed once and was the same when taken again.

### Changed

- `proposal\brew-day.js` (the clock and its tag, LOG's dates, the demo's clock at a simulator's speed, the screen's own
  waits in real seconds, two moments), `proposal\brew-day.css` (the tag), `proposal\brew-day.html` (two moments'
  links) and this section.
- `DESIGN.md`: the title bar, the pre-brew check's clock sentence, The One Clock Rule, one Do and one Don't.
- `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`, regenerated.

## Timers: REMOVE on the row, with UNDO, and BACK TO in the box: ready to build (22 Nov)

The brewer approved `proposal\TIMER-REMOVE.md` as proposed: REMOVE on every row, one tap, with UNDO for 10 seconds, and
going back to the full time in the timer's box. The design is DESIGN.md's Timers section; TIMER-REMOVE.md has the
reasons and the measurements. CraftBeerPi has everything it needs since core 4.7.7.post52.

### What to build (screen.js, brewday.css)

1. **The row on two lines** (`trowHTML`): the name and its state over the time, then REMOVE and START or PAUSE at the
   right, each at least 84 × 56 px. Copy `.trow.tr2`, `.tr2 .tsel` and the rules after it, `.trow .trm`, `.tr2 .toff`
   and the `.tmrs[data-editing] .tr2` rules from the mockup's `brew-day.css`.
   - REMOVE is the quieter button: Soft Steel 600 lettering on a Hairline Slate edge, Panel White under the pointer.
   - A run-out timer keeps +5 MIN and OK across its row; after OK it is ready, with REMOVE and START.
   - While its own editor is open, a timer keeps the one-line row with START or PAUSE only, so the editor's buttons
     stay on the screen at 1180 × 860.
2. **+ TIMER in the heading**, beside SOUND (`timersHTML`, `.tmrs .thr`, `.tmrs .tplus2`), instead of its row under the
   timers. A new timer's editor still opens at the end of the list. Greyed, and saying why when tapped: "Four timers at
   most. Remove one to add another." at four; "One timer at a time: close the one that's open first." while an editor
   is open.
3. **REMOVE** (`cmdTm2`, "rm"): `DELETE /timers/{id}`, as the editor's REMOVE sends today, with no question, in any
   state but a run-out one. While it waits: REMOVING…, with START or PAUSE greyed. LOG: "Stir removed, 7:15 to go", or
   "Yeast removed" for a ready one.
4. **The removed row** (`tgoneHTML`; `.trow.tgone`, `.tgone .tgn`, `.tgone .tn`, `.tgone .ts`, `.trow.tgone .tbtn`,
   `.trow.tgone .tundo`): only on the screen where REMOVE was pressed.
   - It keeps the row's height and its buttons' width, measured as REMOVE is pressed, so the timer below doesn't move.
   - On Panel Slate: the name and "removed" in Dim Steel, and UNDO ("put it back") where the two buttons were.
   - It goes 10 real seconds after REMOVE (`Date.now()`, at any speed of CraftBeerPi's clock), unless UNDO is on its
     way. Other screens simply lose the timer.
5. **UNDO** (`tUndo`): `POST /timers/{id}/undo` (`api.js` has no call for it yet). CraftBeerPi puts the timer back
   with its id, in its place, as it would be now. LOG: "Stir put back, 7:05 to go".
   - 409, with CraftBeerPi's sentence, shown in the timers' note line for 6 s, and LOG has the command "failed" with
     it, in light red: "Four timers at most. Remove one to put Stir back." or "Another timer is called Stir now. Rename
     it to put Stir back." The removed row stays for the rest of its 10 seconds, so UNDO can be pressed again.
   - 404, after CraftBeerPi's 12 seconds: the screen names the timer itself, as CraftBeerPi's answer has only its
     number by then: "Stir can't be put back now: a removed timer can be put back for 10 seconds." The row goes.
6. **BACK TO 15:00 in the editor** (`teditHTML`, `cmdTe` "reset"), while the timer counts down or is paused, hint
   "ready to start again": `POST /timers/{id}/reset` (no call for it in `api.js` yet either). The editor stays open,
   now a stopped timer's (CANCEL, SET), so a name typed and not yet saved is kept. LOG: "Stir back to 15:00, stopped
   with 7:12 to go". A 409 (it ran out meanwhile): CraftBeerPi's "Stir has run out: answer it with OK or +5 MIN." in
   the note line; the editor closes and the row shows +5 MIN and OK. The editor no longer has REMOVE, nor its question.
7. **Moments for the demo**: `#timer-change` (Stir's editor while it counts down) and `#timer-removed` (Stir just
   removed), from the mockup.

### In CraftBeerPi

Nothing new: `DELETE /timers/{id}`, `POST /timers/{id}/undo` and `POST /timers/{id}/reset` are in core 4.7.7.post52.
CraftBeerPi keeps a removed timer for 12 real seconds (`TimersController.UNDO_FOR` and `UNDO_GRACE`).

### Checked

- `files\tm2_presses.py`: 72 presses on the default, at 1440 × 900 and 390 × 844, all pass, with the rows as built
  before (`?trow=today`) at the end; `files\tm2_col_presses.py` (34), with the column as built and these rows.
- `files\clock_presses.py`: the removed row lasts 10 real seconds on a simulator at 60×.
- Pictures against your copy (UI 1fca41c), every moment at 1440 × 900 and 390 × 844: with `?trow=today&bkman=today`
  the same in every moment but the new `#bk-man-boil`; the default against your copy's `?trow=new&bkman=new` is in the
  next section's Checked.

## The boil kettle's MANUAL at the boil power, and MAN where AUTO is usual: ready to build (22 Nov)

The brewer approved `proposal\BOIL-MANUAL.md` as proposed: in MANUAL the boil element heats at the boil power, one
number for AUTO and by hand. He added: "make the 'MAN' under MODE yellow or some other indication that I'm not using
auto when I probably should be." The design is DESIGN.md's boil kettle parts and The Usual Mode Rule; BOIL-MANUAL.md
has the reasons.

### What to build (screen.js, brewday.css)

1. **HAND in MANUAL** (`svCell`): the framed green number reads HAND in MANUAL and BOIL in AUTO, in the same place,
   green and frame, with "change". In MANUAL it shows the element's own level (`manual_power`), which BoilPower keeps
   equal to `Boil_Power` while AUTO isn't running, so it can never show a level the element won't heat at.
2. **The line under the window** (`bkLine`): "MANUAL · heats at 45 % by hand" with the element off, "Heating by hand
   at 45 %" while it heats. With a temperature to hold (the whirlpool's 170 °F), SV stays in the window and the line is
   The By Hand Rule's: "Heating by hand · won't stop at target".
3. **The steps in MANUAL** (`bkNudges`): −5 %, −1 %, +1 % and +5 % stay either side of BOIL ELEMENT in MANUAL, as in
   AUTO, and send `set_boil_power` as there. BoilPower changes the element's level with it, and its power at once while
   it heats, so OUT follows. The power box does the same.
4. **The element's button in MANUAL** (`bkHandLampHTML`): narrow between the steps, as in AUTO, its name kept for
   screen readers: "hold to turn on" (held, as before) or "tap to turn off". Where the steps have a row of their own
   (windows about 900 to 970 and 1180 to 1320 px wide), "BOIL ELEMENT · hold to turn on", as now.
5. **LOG** (`actLabel`): "BOIL ELEMENT on at 45 %" by hand. A change with the element off in MANUAL: "Boil power 44 %
   (was 45 %)", with "used when you heat by hand" in place of "kept for the boil in AUTO".
6. **MAN where AUTO is usual** (`bkManCue`, `MAN_CUE`, `auxHTML`; `.aux dd .mc`): MODE's MAN in the window, boxed in
   Prompt Amber (2 px frame, 4 px corners, its margins giving the frame's room back, so nothing moves). When all of:
   - the boil kettle is in MANUAL, the connection is up, and its probe gives a reading;
   - and its element is on, or the current step works the boil kettle with a temperature (the step's Kettle is the boil
     kettle and it has a Temp: the Boil, a whirlpool held at 170 °F) and is running. Not while the boil waits for the
     brewer to start it ("Ready to boil?"), as nothing heats then in either mode.
   Its `title` and, after MAN for screen readers (`.sr`): "In MANUAL, BoilPower isn't running the boil kettle, as it
   does in AUTO." No sound, no alarm and no line of its own.
7. **Moments for the demo**: `#bk-hand` (by hand, the element on; MAN boxed), `#bk-hand-off` (off; MAN plain) and
   `#bk-man-boil` (the boil running, the kettle put in MANUAL, the element off; MAN boxed).

### In CraftBeerPi

BoilPower 0.0.3.post13 has it: while AUTO isn't running, `_heat_by_hand_at` keeps the element's own level at
`Boil_Power`, as AUTO stops, when the boil power is set, when a recipe's start puts back the usual boil power, and as
CraftBeerPi starts. So the Hardware page's switch heats at the boil power too.

One thing for you: nothing BoilPower declares tells post13 from an older one (it has no new action). With an older
BoilPower the steps in MANUAL would change `Boil_Power` while the element went on heating at its own level, so the
screen should keep MANUAL as built before there. Your choice how it tells, for example a declared marker or the
plugin's version.

### Checked

- `files\bk_presses.py`: 23 presses on the default, at 1920 × 950, all pass: HAND, OUT, the line, the steps off and
  heating, the power box, LOG, AUTO; MAN boxed while heating by hand, with its sentence, moving nothing, and plain again
  when off or in AUTO; boxed mid-boil with the element off and in a whirlpool hold put in MANUAL; plain with no reading,
  with no connection, while the boil waits for the brewer and during the sparge; and as built before
  (`?bkman=today`).
- In every moment, MAN is boxed only in `#bk-hand` and `#bk-man-boil`.
- Pictures against your copy (UI 1fca41c), every moment at 1440 × 900 and 390 × 844: the default against your copy's
  `?trow=new&bkman=new` differs only where MAN is boxed (`#bk-hand`) and in the new `#bk-man-boil`.

### Changed

For both sections:

- `proposal\brew-day.js`: the defaults (`TROW`, `BKMAN`; `?trow=today` and `?bkman=today` keep the old ones),
  `bkManCue`, `MAN_CUE`, `auxHTML`, the moment `#bk-man-boil`, and comments. `proposal\brew-day.css`: `.aux dd .mc`.
  `proposal\brew-day.html`: the notes and the strip's links. `timers.html`, `boil-manual.html`, `column.html` and
  `review.html`: their "today" side asks for the old versions by name.
- `proposal\TIMER-REMOVE.md` and `proposal\BOIL-MANUAL.md`: approved, with the brewer's answers; BOIL-MANUAL.md has
  the MAN section.
- `DESIGN.md`: the Timers section (Section, Row, Removed, Run out, Editor); the boil power button, the step buttons,
  the faceplate's window, line and lamp buttons, the power editor's words; Prompt Amber's and Progress Blue's uses (the
  second is the clock's tag, left out of the last copy); The Usual Mode Rule; two Do's.
- `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`, regenerated.

## BrewStart on Brew Day: its row opens its box, ready to build (22 Nov)

The brewer would like to tap BrewStart on Brew Day and change it there, instead of in the recipe editor. You decided
its time is set on Brew Day the night before. The design is `proposal\BREWSTART-EDIT.md` and DESIGN.md's Recipe Column
(BrewStart's row, BrewStart's box, + BrewStart). Agreed with Robin: his "+ BrewStart" row and words, his sentences for
the time, his fill rules for a new BrewStart, and his change 8 for what SAVE TO BOOK keeps.

### What to build (screen.js, brewday.css)

1. **BrewStart's row as a button** (`bsRowHTML`, `.step.bs`, `.step .bsh`, `.step .amb`), until BrewStart has
   finished: the whole row, as it looks today, opens the box. Details "126 °F · ready by 07:00 Sat · 15 gal" (the
   weekday of BrewStart's day), "start at 05:30 Sat" with Start at, "no time set" in amber with no time. Under the
   state word (READY, STARTS 05:30), the hint, in this order: "set a time" (no time), "where's the grain?" (the grain
   not answered for this brew), else "change"; the first two in amber (on the current step's blue, the brighter
   amber that WAITING FOR YOU uses there). The hint stays on one line where the details keep their lines, and wraps
   inside the state word's width where they wouldn't, so the row keeps its height on one screen (checked after each
   render). Its aria-label says the step in words, and ". Where the grain spent the night isn't given yet" when
   that applies. Every step row's details line (`stepHTML`) keeps a figure with its unit or day, with no-break spaces
   ("126&nbsp;°F", "07:00&nbsp;Sat", "15&nbsp;gal", "40&nbsp;min"), and each "·" with the word before it, so a line
   ends with "·" and never starts with one.
2. **BrewStart's box** (`bsHTML`, `bsOpen`, `bsCmd`; `.bsbox` and the rules after it). In the step list's room on one
   screen, as the pre-brew check's box is (`data-pb`); the strike water box and COMPARE PROBES make way while it is
   open, and the timers as for the pre-brew box. Opening it closes NEXT STEP's, RESET's and UNLOAD's questions, the
   pre-brew box and the strike water box's FORECAST and small boxes. Escape and CANCEL close it. Focus goes to the
   time; from a row whose hint is "where's the grain?", to IN THE GARAGE, with the grain's two answers scrolled into
   view. Enter is SET. From the top:
   - while BrewStart waits, fixed at the top above the part that scrolls: "BrewStart is waiting: heating starts about
     05:30. A change here plans it again at once.";
   - READY BY with START AT INSTEAD (quiet; greyed while BrewStart waits: "Not while BrewStart waits: STOP it first.");
   - −1 H, −15, the time, +15, +1 H (`bsParse`: "7", "700", "0700" and "7:00" are 07:00; else "Type the time as
     07:00."); a new BrewStart's time starts empty, and the keys then start from 07:00;
   - TODAY and TOMORROW, each with its date, by CraftBeerPi's clock (`brewNow()`, The One Clock Rule);
   - the time in words (`bsSays`), spoken after the brewer's own changes, not every minute: "The HLT's water is hot by
     07:00 tomorrow, Sat 21 Nov: in 9 h 48 min.", on a simulator ", about 10 real minutes at 60×", with Start at
     "Strike water starts at 05:30 tomorrow, Sat 21 Nov: in 8 h 18 min.", and a time passed "07:00 today has passed,
     so nothing would start by itself. For tomorrow morning, choose TOMORROW." with SET greyed;
   - WHERE IS THE GRAIN TONIGHT? with "Asked once a brew: USE depends on it.": IN THE GARAGE (the boil kettle's
     reading) or INDOORS, with 64, 68 (pressed first) and 72 °F, or a figure (40 to 100 °F, else "Indoors, the grain
     would be between 40 and 100 °F: check the figure."). Neither pressed until answered. The answer is CraftBeerPi's
     `grain_place`, "garage" or "indoors" (in the brew steps' basic data, core post59; the strike state's
     `inputs.grain_place`), with Grain_Temp blank for the garage and the figure for indoors. No `grain_place` is "not
     answered": a load or unload clears it, and SAVE TO BOOK leaves it out. The strike water box's GRAIN sets it too:
     a figure is indoors, THE PROBE the garage;
   - the water (`bsWater`), last: "The HLT's 6500 W element heats 15 gal to 126.0 °F. USE and HLT WATER in the strike
     water box change them." With no Volume: "… How much water isn't known yet: give it with HLT WATER in the strike
     water box before you START.";
   - SET (hint "ready by 07:00 Sat") and CANCEL, kept in view while the middle scrolls; the note line above them.
3. **SET** (`bsSet`): a changed time or day by `PUT /step2/{id}` with BrewStart's settings, all of them, as read, with
   Timing, Mode `Date`, StartDate and StartTime as the box has them; a changed grain by `POST /step2/strike/grain`,
   `{"grain": null, "place": "garage"}` or `{"grain": 68.0}` for indoors, the call the strike water box's GRAIN uses,
   which also works while BrewStart waits and has CraftBeerPi work USE out again. Both changed: both calls, one LOG
   line; if one is refused, CraftBeerPi's sentence shows and the box stays open, as a failed command. The day is always
   saved as a date: BrewStart counts Today and Tomorrow from START, so a START after midnight would heat a day late.
   While it waits: SETTING…, with START, NEXT STEP, RESET, UNLOAD, USE and BACK TO greyed ("Waiting for CraftBeerPi to
   answer."). LOG: "BrewStart: ready by 06:30 Sat 21 Nov, was 07:00 Sat", with " · grain indoors at 68.0 °F" or " ·
   grain in the garage, the boil kettle's probe" when the grain changed; the grain alone "BrewStart: grain indoors at
   68.0 °F, was the boil kettle's probe". Nothing changed: the box closes and nothing is sent. No answer in 5 s: a
   failed command, as UNLOAD's.
4. **+ BrewStart** (`bsAddHTML`, `.bsadd`): on a recipe loaded and not begun without BrewStart, above step 1, 58 px,
   dashed: "+", BrewStart, "Hot water by a set time · goes in as step 1". It opens the box for a new BrewStart, filled
   in as Robin's pages fill one (his BUILD-NOTES "+ BrewStart"): Ready by; the HLT, its element's watts and the
   Campden choice from the newest BrewStart; Ready_Temp from the strike water step, else mash in; Volume from
   `recipeWater()` (beside `stepModel` in `live.js`, shared with his pages), else the newest BrewStart's, else blank;
   the day TOMORROW from noon by CraftBeerPi's clock, TODAY before. ADD BREWSTART (`bsAdd`): `POST /step2/` with
   `index` 0 (change 6, core post58). LOG: "BrewStart added as step 1: ready by 07:00 Sat 21 Nov". CANCEL adds nothing.
5. **While BrewStart waits** (running, STARTS 05:30): the box opens as above. SET sends the new time with BrewStart's
   `change_time` (1.2.0.post10): see "BrewStart while it waits: its change_time, and HEAT NOW for a time too soon"
   below, which also says what a time too soon for the heating does.
   - With a BrewStart that doesn't declare `change_time` (older than post10): the time, the day and START AT are greyed
     while BrewStart waits, with "BrewStart is waiting, so its time can't change now. Press STOP, change it, then hold
     START." The grain still changes, through the strike water box's call.
6. **USE waits for the grain** (`swHTML`'s USE, `sw:where`). On a recipe with BrewStart, while `grain_place` is unset,
   where the strike water box would offer USE: "USE – – °F", USE's size in the look CraftBeerPi's questions have
   (var(--prompt-bg), a 2 px Prompt Amber edge, the words #fff1d2), with "where's the grain?" in Prompt Amber under
   it, not greyed; USE's blue comes back with its figure once answered (amber on that blue is only 3.6:1, on the
   question's ground 7.7:1). aria-label "USE: where the grain spent the night isn't given yet. Say where it is first:
   USE depends on it." A tap opens the question:
   - BrewStart's box while its row is a button, with focus on IN THE GARAGE; after SET or CANCEL, focus comes back
     to USE;
   - once BrewStart has finished (brew morning), the strike water box's GRAIN box. There, while unanswered, THE PROBE
     shows as IN THE GARAGE, "the boil kettle's probe, 61.4 °F", and records the garage (LOG "Grain in the garage: the
     boil kettle's probe, 61.4 °F"). SET is indoors (LOG "Grain indoors at 61.4 °F").
   Answered, USE is back: at once for the garage (the figure doesn't change), after CraftBeerPi works it out again for
   indoors. Without BrewStart, with the grain answered, for BACK TO, and while USE is being worked out: as before.
   START doesn't ask, as the grain changes nothing but USE's figure.
7. **Moments for the demo**: `#bs-edit`, `#bs-indoors`, `#bs-past`, `#bs-startat`, `#bs-set`, `#bs-wait`, `#bs-new`,
   `#bs-new-open`, `#bs-sim`, `#bs-novol`, and `#sw-where` and `#sw-where-am` for USE waiting on the grain. `swStartAt`
   takes any ready time; `bsPlanLine` is BrewStart's notice in its words.

### In CraftBeerPi

- **Done: a waiting BrewStart takes a new time.** BrewStart 1.2.0.post10's `change_time` action, on 8000 and 8012
  (your note `files\plans\brewstart-edit.md`); see "BrewStart while it waits" below.
- `POST /step2/` with `index` (Robin's change 6, post58), and `recipeWater()`'s figures (change 7).
- `grain_place` (core post59, being built): where the grain is for this brew, in the brew steps' basic data, cleared by
  a load or unload and left out by SAVE TO BOOK; `POST /step2/strike/grain` takes `{"grain": null, "place":
  "garage"}`, a figure meaning indoors; the strike state shows it as `inputs.grain_place`.
- SAVE TO BOOK (Robin's change 8, asked of you): a BrewStart's Date goes into the book as Tomorrow with its time; the
  strike temperature from before the first USE; no grain figure, as Brew Day asks every brew (the row, and USE
  waiting for the answer).

### Checked

- `files\bs_presses.py`: 212 presses, all pass, no page errors. They cover:
  - the row, its hint and its label;
  - the box's parts, keys, typed times, the day, the words, START AT, the grain and its answers, and the water;
  - SET and its LOG lines; + BrewStart and ADD BREWSTART; Escape and CANCEL; no connection; SETTING… and what waits
    with it; the simulator's real minutes;
  - USE waiting for the grain (`#sw-where`, `#sw-where-am`); COMPARE PROBES making way;
  - the waiting sentence fixed above the part that scrolls; the box opening at the grain.
- As each box opens, at 1180 × 860, 1440 × 900 and 1920 × 950, in `#bs-edit`, `#bs-indoors`, `#bs-wait` and
  `#bs-new-open`: both grain answers, IN THE GARAGE's focus ring, SET and CANCEL are fully in view. At most READY BY and
  5 px of the time row are scrolled out at the top (`#bs-wait` at 1180 × 860).
- Step rows:
  - on one screen at 1180, 1440 and 1920, every row is the same height as before BrewStart's row became a button;
  - on a phone, BrewStart's row is 20 px taller, as its details take two lines there;
  - no details line splits a figure from its unit or day, or starts with "·".
- The waiting USE: its words 12.4:1 and its hint 7.7:1 on the dark amber (9.1:1 and 5.6:1 under the pointer), at
  exactly USE's size at every width.
- The other suites, all passing: the clock 17, the boil kettle 23, UNLOAD 61, the strike water 28 and 30, the timers 72
  and 37, the review page 36, the clock's sizes, and the timers' places 149 (A, B, C) and 262 (D).
- Pictures of every moment at 1440 × 900 and 390 × 844, against the copy in `design/brewday` (UI acf4716): 60 moments
  differ. They are all in BrewStart's row and box, in USE while it waits for the grain, and in where a step's details
  line breaks. No row is taller on one screen.

### Changed

- `proposal\brew-day.js`, `proposal\brew-day.css`, `proposal\brew-day.html` (the moments' links and notes);
  `proposal\BREWSTART-EDIT.md` (new) and this section.
- Not part of this build: the same three files also carry the timers' places A, B, C and D (`TIMER-PLACE.md`), behind
  `?col=new` and `?tplace`, off by default; D, the timers in a column beside the drawing, waits for the brewer's
  answer on `timers-side.html`.
- `DESIGN.md`: Recipe Column (the step row's day, BrewStart's row, BrewStart's box, + BrewStart), the strike water
  box's USE waiting for the grain; one Don't.
- `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`, regenerated.

## LOAD's question names SAVE TO BOOK (22 Nov)

Brew Steps has SAVE TO BOOK now (web UI post35), so Brew Day's LOAD question, over a recipe the Recipe Book doesn't
have, names it in the recipe pages' words. In LOAD's question (the mockup's `loadAskHTML`):

- "Save it there on Brew Steps to keep it." becomes "SAVE TO BOOK on Brew Steps keeps it."
- For steps with no name, "Save them there on Brew Steps to keep them." becomes "SAVE TO BOOK on Brew Steps keeps
  them."

Nothing else changes. `DESIGN.md`'s Way Out Rule has the new words.

## Mash pH on Brew Day: recorded in BrewScribe from the reminder, ready to build (22 Nov)

The brewer would like to enter the mash pH from Brew Day's reminder, without going to BrewScribe's tab, and without
losing anything on BrewScribe's page. The design is `proposal\PH-ENTRY.md` and DESIGN.md's Alarm Banner (RECORD pH, the
pH box) and The Measured Value Rule. The calls are Porter's, BrewScribe dev51 (on 8000 and 8012): his contract,
draft 3, in his session folder (`files\brewday-entry\contract.md`).

### What to build (screen.js, brewday.css)

1. **Ask BrewScribe which reminders take a reading:** `GET /brewscribe/api/brew-day/readings` when such a reminder
   comes up, when its box opens, and every 15 real seconds while it is up. Brew Day keeps no list of titles: a
   reminder whose title is in the answer's `reminders` gets RECORD pH.
   - A 404 (BrewScribe not installed, or older than dev51), no answer, or any other failure: no RECORD pH, the
     reminder as today. A refresh with no answer keeps the last answer, so the button doesn't flicker.
   - Until the first answer, no RECORD pH: it comes within a second.
2. **RECORD pH** (the mockup's `bannerHTML` acts): at the right end, "for BrewScribe" under it, or "pH 5.42 recorded"
   once the stage has a `saved` reading. OK moves to its left as the lesser answer (`sec`), and on these reminders it
   is sent to CraftBeerPi as their OK is, so it closes them on every screen: SENDING…, then LOG "Check mash pH
   answered: OK · confirmed".
   - Greyed, with the sentence on a tap: `log` null, "no BrewScribe log" under it and `why_not` as the sentence;
     `vessel_problem`, "on BrewScribe's page" under it and `vessel_problem` + " Record it on BrewScribe's page.".
   - The title keeps "pH" as written in its capitals: "CHECK MASH pH" (`.banner .msg b .nc`).
3. **The pH box** (the mockup's `phHTML` and `.phbox`): as DESIGN.md says. From 701 px wide an overlay 460 px wide
   under the reminder, right-aligned to it and kept on screen, z-index 45, above LOG's list (opening one closes the
   other); on a phone, in the page under the reminder. The p of "MASH pH" stays lower case. Opening it puts focus in
   the pH field with its text selected; Enter is SAVE; Escape and CANCEL close it, keeping nothing, with focus back on
   RECORD pH. Typing keeps its caret through redraws, as BrewStart's box does.
   - pH: empty to start; the keys step from `target`, else 5.40; "5.42" and "5,42" accepted, rounded to `decimals`;
     outside `min` to `max`, "pH is between 0 and 14: check the figure." SAVE is "SAVE pH – –", greyed, with no
     reading: "Give the pH first: type it, or step from 5.40."
   - The sample temperature only where the reminder's reading says `sample_temperature: "asked"`, in
     `temperature_unit`, and never needed. Outside `sample_usual`, the line under it: "140.0 °F is warmer than a
     cooled sample (50 to 95 °F): check it.", "45.0 °F is colder than a cooled sample (50 to 95 °F): check it."; not a
     figure: "The sample temperature isn't a figure: check it, or leave it empty." No temperature box when
     `temperature_unit` is null.
   - `saved` not null: BrewScribe's line at the top, "BrewScribe has pH 5.42 for Early mash. A new reading here is
     kept as well, as the latest." No time: BrewScribe's times are the real clock's (The One Clock Rule).
   - ON BREWSCRIBE'S PAGE opens the reminder's `page` in BrewScribe's tab.
4. **SAVE** (`phSave`): `POST /brewscribe/api/brew-day/readings` with `entry_id` (a new UUID when the box opens or
   its content changes, the same on a retry of the same content), `day_id`, `title`, `kind: "ph"`, `value`, and the
   temperature with its unit when given. SAVING… at once, the box's keys, CANCEL, RECORD pH and OK greyed ("Waiting
   for BrewScribe to answer."). On 201 (or 200 for a retry already saved), the reminder's OK as above; SAVING… lasts
   until it has closed. LOG: BrewScribe's `text`, "pH 5.42 saved in BrewScribe (Early mash, Mash Tun) · confirmed",
   on top, and spoken; focus to LOG.
   - 400, 403, 409, 503: the box and the reminder stay, with BrewScribe's `error` above SAVE (spoken at once);
     LOG "pH 5.42 not saved in BrewScribe · failed". A 409 `log_changed` asks BrewScribe again.
   - No answer in 5 s: "BrewScribe didn't answer, so it may not have saved it. SAVE again: it won't be saved
     twice."; LOG "pH 5.42 may not be saved in BrewScribe · failed: no answer in 5 s".
   - Saved but the OK not answered: the box closes, LOG has the saved line, and the reminder stays with "pH 5.42
     recorded" under RECORD pH and OK outlined in Alarm Red, "tap to try again".
   - The reminder answered on another screen while the box is open: the box closes, saying "Check mash pH was
     answered on another screen, so nothing was saved here." LOG "Check mash pH answered · from another screen".
   - No connection: greyed as every command is; what was typed stays.
5. RESET and UNLOAD take both reminders down with the brew's other questions.
6. **Moments for the demo:** `#ph`, `#ph-open`, `#ph-set`, `#ph-target`, `#ph-had`, `#ph-end`, `#ph-warm`,
   `#ph-nolog`, `#ph-vessel`, `#ph-saved`, `#ph-fail`, `#ph-slow`, `#ph-noclose`, `#ph-other`, and
   `?brewscribe=none#ph`. The mockup's BrewScribe is `st.bscribe`, in the contract's shape.

### In CraftBeerPi and BrewScribe

- Nothing new: BrewScribe dev51's two calls are in place, and the reminders' OK is CraftBeerPi's own.
- BrewScribe dev52, now on 8000 and 8012, writes a pH with at least 2 decimals in `text`, in `saved.text` and on its
  own page, as the mockup does: SAVE pH 5.40 comes back as "pH 5.40 saved in BrewScribe (Early mash, Mash Tun)". dev51
  wrote the shortest number, "pH 5.4 saved…". Nothing in the build changes for it.

### Testing against BrewScribe

- Brew Day shows BrewScribe's `error` as sent, so a test should expect what BrewScribe sent, not fixed words. The
  mockup's BrewScribe (`scribeTake`) now uses dev51's own sentences, for example for `log_changed`: "BrewScribe's open
  log has changed, so this reading wasn't saved. Check BrewScribe's page, then try again."
- Against dev51, a test that saves a figure ending in 0, such as 5.40, gets "pH 5.4 saved…". Compare LOG with
  BrewScribe's `text` as sent, or save a figure such as 5.42: either passes with dev51 and dev52.

### Checked

- Porter checked the code and the moments against his contract, draft 3: nothing to change.
- `files\ph\ph_presses.py`, 128 presses, all pass, no page errors; `files\ph\ph_measure.py`, 134 checks at 1180 × 860,
  1440 × 900, 1920 × 950, 1024 × 768, 820 × 1180 and 390 × 844: the box on screen and clear of the reminder and ALL
  OFF, every key and button at least 44 px tall, the reminder's buttons under its words on a phone.
- The title bar is one line taller with RECORD pH at some sizes while the reminder waits: at 1920 × 950, 102 px
  instead of 83 for "Check mash pH".
- The other suites all pass: the clock 17, the boil kettle 23, UNLOAD 61, the strike water 28 and 30, the timers 72
  and 37, the review page 36, the clock's sizes, the timers' places 149 and 262, BrewStart 212.
- Pictures of every moment there before, at 1440 × 900 and 390 × 844: unchanged, but for LOAD's question's new words
  (above) in `#load-notinbook`.

### Changed

- `proposal\brew-day.js`, `proposal\brew-day.css`, `proposal\brew-day.html` (the moments' links and notes);
  `proposal\PH-ENTRY.md` (new) and this section.
- `DESIGN.md`: Alarm Banner (RECORD pH, the pH box), The Measured Value Rule.
- `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`, regenerated.

## BrewStart while it waits: its change_time, and HEAT NOW for a time too soon (22 Nov, night)

BrewStart 1.2.0.post10, on 8000 and 8012, takes a new day and time while it waits: its `change_time` action, as your
note `files\plans\brewstart-edit.md` describes it. That is the server change item 5 of "BrewStart on Brew Day" was
waiting for. BrewStart's code (`change_time`, `_arrive`, `_refuse_change`) shows three things that change what the box
does; the rest is as that section says.

### What to build (screen.js)

1. **The call.** With `change_time` declared (`declares(stepTypes, "BrewStart", "change_time")`, as your note says),
   SET on a waiting BrewStart sends the time and the day by `POST /step2/action/{id}`, with `{"action": "change_time",
   "parameter": {"Mode": "Date", "StartDate": "2026-11-21", "StartTime": "06:30"}}`. A changed grain still goes by
   `POST /step2/strike/grain`. Before START and while stopped, `PUT /step2/{id}` as now, which also carries START AT
   INSTEAD's Timing; `change_time` doesn't take it. Without `change_time`: item 5's greyed time.
2. **Taken (200).** As built: SETTING… until the answer, LOG "BrewStart: ready by 06:30 Sat 21 Nov, was 07:00 Sat ·
   confirmed", and the row's STARTS from BrewStart's new status line. BrewStart's own notice comes with it, and goes in
   LOG from CraftBeerPi as its others do: "BrewStart: Time changed, was Sat Nov 21, 07:00. Ready by Sat Nov 21, 06:30:
   heating starts about Sat Nov 21, 05:46. 59.8 °F to 132.4 °F takes about 33 min, plus 10 min spare."
   (`bsChangedLine`).
3. **A ready time too soon for the heating** (`bsLead`, `bsSays`, `bsGoHTML`, `bsSet`). Ready by always goes on by
   itself, so a new ready time that leaves less than BrewStart plans for heating has it hand over at once, as START
   does: the strike water step starts and heats the HLT. The box says so before SET is pressed, and SET says what it
   does.
   - What BrewStart plans for heating: its ready time less its heating start, both as its row has them now (StartDate
     and StartTime; STARTS from its status line), 43 min in `#bs-soon`. A new ready time no further away than that,
     and a minute, is too soon. Never with Start at, whose time only has to be later than now, and never before START.
   - The time in words, in place of "The HLT's water is hot by …": "Heating starts as soon as you press HEAT NOW:
     BrewStart plans 43 min for heating the water, and 06:00 today is 20 min away." SET reads HEAT NOW, its hint as
     SET's ("ready by 06:00 Sat"). A later time brings SET back.
   - One tap, as NEXT STEP's SKIP TO STRIKE WATER, which starts the same heating after its question: the brewer is
     already in a box he opened to change the time, and its main button names what it will do.
   - Taken: LOG has the confirmed line, then BrewStart's notice, spoken: "BrewStart: Heating has to start now: from
     59.8 °F it needs about 33 min, so the water will be ready around Sat Nov 21, 06:13, after Sat Nov 21, 06:00.", or,
     where only the spare minutes go, "BrewStart: Time to heat - the water should be ready by Sat Nov 21, 06:20."
     Then "BrewStart finished" and the strike water step's start. The box closes and focus goes to LOG, as BrewStart's
     row is no longer a button.
4. **Refused (400).** The answer is the core's sentence for any action that didn't run: "'change_time' did not run.
   Either the step is not running, or that is not a declared action." Here it would read wrongly. BrewStart's reason
   comes to every screen just before it, as an info notice titled with the step's name ("BrewStart's time has come
   (Sat Nov 21, 06:16), so it can't change now."), and goes in LOG as CraftBeerPi's notices do. The box shows that
   sentence above SET and stays open, as for any refused SET, and LOG says "BrewStart: ready by 06:30 Sat 21 Nov, was
   07:00 Sat · failed". With no such notice within a second of the 400 (a BrewStart older than post10, behind a page
   that still has post10's step types): "BrewStart didn't take the new time, so nothing changed."
   - Simpler, if you'd rather: the core passes an action's own `ValueError` message through as the 400's `detail`
     (your note's first open point). The box then shows `detail`, as for any refusal, and needs nothing from the
     notice. Your call. Decided: both. Post36 takes the notice; core post60 answers `{"error": "action refused",
     "detail": reason}`, and the screen prefers `detail` where it is there, as the two can arrive in either order.
   - The box meets these only in a race: it closes once BrewStart stops waiting, refuses a time that has passed by its
     own clock, and can't be opened while BrewStart waits for NEXT STEP, whose row has no STARTS and isn't a button.
5. **Moment:** `#bs-soon`, #sw-wait at 05:40 with the box opened from the row and 06:00 typed: HEAT NOW.

### In CraftBeerPi

- Nothing new: BrewStart 1.2.0.post10's `change_time`. The core's 400 `detail` (above) is optional.

### Checked

- `files\bs_presses.py`: 233 presses, all pass, no page errors. The 21 new ones cover HEAT NOW and its sentence, the
  threshold (06:24 HEAT NOW, 06:25 SET, at 05:40 with 43 min planned), SET coming back for a later time, both of
  BrewStart's notices as it hands over, the strike water step heating, focus on LOG, a time 18 min away before START
  staying SET, and `#bs-soon` at 1180 × 860, 1440 × 900, 1920 × 950 and 390 × 844: HEAT NOW, CANCEL and the sentence
  (3 or 4 lines) in view, nothing cut.
- The other suites, all passing: the clock 17, the clock's sizes, the boil kettle 23, UNLOAD 61, the strike water 28
  and 30, the timers 72 and 37, the review page 36, the timers' places 149 and 262, and the pH box 128 and 134.
- Pictures of every moment at 1440 × 900 and 390 × 844, against the copy in `design/brewday` (UI c113498): all 256
  the same; only the new `#bs-soon` differs.

### Changed

- `proposal\brew-day.js` (`bsChangedLine`, `bsDueLine`, `bsDur`, `bsLead`, `bsSays`, `bsGoHTML`, `bsSet`, the moment
  `#bs-soon`), `proposal\brew-day.html` (its link and note); `proposal\BREWSTART-EDIT.md`; this section, and item 5
  and "In CraftBeerPi" of "BrewStart on Brew Day".
- `DESIGN.md`: BrewStart's box (HEAT NOW).
- `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`, regenerated.
- In the mash pH section above, dev52 is now on 8000 and 8012; `proposal\PH-ENTRY.md` says the same.

## The timers beside the drawing (D), and OTHER RECIPE: ready to build (22 Nov, night)

The brewer chose D on `timers-side.html`: "Timers beside the drawing: Yes, build D". It was his own idea ("I think the
vessel drawings can shrink width and add the timers in a column … if there are no timers, the vessels should appear
full width"), in place of C, the bar along the bottom, which would have made the vessels a third smaller on his
monitor. OTHER RECIPE beside COMPARE PROBES comes with it, as he kept it ("Yes, keep OTHER RECIPE"). The design is
`proposal\TIMER-PLACE.md` (D), `proposal\RECIPE-COLUMN.md` (OTHER RECIPE only) and DESIGN.md's Timers (Beside the
drawing), Recipe Column (OTHER RECIPE), Layout and The Under Its Plate Rule. The mockup has both by default;
`?tplace=today&col=today` is the screen as built before.

### What to build (screen.js, brewday.css)

1. **Where the timers are.** On one screen (1180 px and wider, `ONE_SCREEN`) the timers leave the recipe column for
   the drawing's row (`tHere()` "side"; `timersHTML` gives nothing in the column there). Narrower, and on a phone,
   they are in the column exactly as built, phone strip included. Crossing 1180 px moves them, as the window is
   resized (`ONE_SCREEN`'s change draws the screen again).
2. **The drawing's row split** (`tsideDraw`, `.brewhouse[data-tside]`). While there is at least one timer, a timer
   just removed counting while its UNDO shows, the brewhouse's grid is `minmax(0, 1fr) 300px`: the faceplates across
   both columns, the drawing in the first under them, the timers' column (`#tside`, a `section` labelled "Timers")
   in the second, at the drawing's height (`tsideFit` sets its `min-height` to the drawing box's height, which keeps
   its own least height where a long question in the title bar makes the row shorter).
   - The drawing is drawn at its narrower box as it is now (`drawRig`: `W = max(1200, 470 × w / h)`), so while the box
     is wider than 1200 to 470 (2.55 to 1) its vessels keep their size and only sit closer together. It is 3.5 to 1
     or wider at every size measured (below), so nothing else changes in `rig.js`.
3. **The column** (`tsideHTML`, `.tside`): Panel Slate, a 1 px Hairline Slate edge, 6 px corners, padding 3 px 8 px.
   - Its head, 44 px: TIMERS with the count, "TIMERS · 2" (the "·" hidden from screen readers), in Dim Steel 600
     18 px condensed capitals; + TIMER (`tplus3`) and SOUND at its right.
   - The timers, one row each, 38 px tall, 4 px apart (`tchipHTML` with the column's mode): the name, giving way first
     with its ellipsis, the state word (paused, ready; none while counting) and the time, 20 px (26 px in its last
     3:00), on one line at the left; REMOVE and START or PAUSE at the right, each 38 px tall, its outline drawn inside
     (`box-shadow: inset 0 0 0 1px`) so they reach the row's edges; the bar a 2 px line along the foot. What a row
     holds comes from the column's width (`tMode`, `--tcw-full` 250 px, `--tcw-go` 200 px): at 300 px it is always
     REMOVE and START or PAUSE.
   - A timer that has run out: its row Dark Amber Wash with a 2 px Prompt Amber edge drawn inside, TIME'S UP and the
     time counting up in Prompt Amber, OK; it pulses, and its alarm is in the title bar as now. A timer just removed:
     its row for 10 s with its name, "removed" and UNDO.
   - Rows that don't all fit scroll inside the column (`.tsl`, `overflow-y: auto`, `overscroll-behavior: contain`),
     which keeps its scroll place when the screen is drawn again. Where the next row would show all but its last
     12 px, the list is cut at half that row's height, so it reads as cut (`TSIDE_CUT`); less, and it stays as it is.
4. **A timer's editor** (`tpopHTML`, `tsidePop`, `.tside .tpop`): the editor as built, in a box of its own 380 px
   wide to the left of the column (`right: calc(100% + 8px)`), level with its timer, a new timer's level with the
   end of the list, moved up or down as far as it must to stay on screen; z-index 35, the editor's 2 px Selection Blue
   edge. A timer shown as a row here has its REMOVE and START or PAUSE, so the editor has no second row for them. The
   timers' note (a refused UNDO or + TIMER) shows in the same place, with no editor open (`tpnoteHTML`).
   - Escape closes the editor first, unless focus is in a box open in the recipe column (BrewStart's, the pre-brew
     check's, COMPARE PROBES, FORECAST, the recipe book), which Escape then closes first.
   - On one screen the column's boxes no longer make the timers give way, as the timers aren't in the column.
5. **No timers** (`.brewhouse[data-tcorner]`, `.tside.empty`, `tsideCorner`): the drawing full width, as built, and
   + TIMER and SOUND as two 44 px buttons over its top-right corner, 6 px in. They take the first of side by side, one
   over the other, then both again with smaller words (`.tcorner[data-fit]`), that stays inside the drawing's box and
   clears every part of the drawing (outlines, lines, pumps, labels, the valves' note), tried after every draw of the
   drawing and once the fonts are in. A new timer's editor opens to their left.
6. **OTHER RECIPE** (`nbHTML`, `rbHTML`, `cmdLoad2`, `.nbrow`, `.rbox`): on a recipe not begun, OTHER RECIPE ("from
   the recipe book") and COMPARE PROBES ("before you fill") side by side, two equal command buttons 54 px tall, in
   the row COMPARE PROBES had to itself. It opens the recipe book in that place (`data-pb` on one screen, taking the
   step list's room): the newest five, each with LOAD, the loaded one saying "READY TO START · STEP 1 OF 7" instead;
   ALL RECIPES (the Recipe Book tab) and CLOSE. LOAD: LOADING… on its row, the others greyed (`WAIT`), the box
   closing once CraftBeerPi has it, LOG "Craftbeerpi Test Recipe v4 loaded · confirmed". Over a recipe the book doesn't
   have, LOAD asks first in the box (`loadAskHTML`). Opening it closes BrewStart's box and the column's other boxes;
   Escape and CLOSE close it; UNLOAD and a recipe that begins close it too, and the row goes once a recipe has begun.
   Brewing by hand, the column's recipe book is as built.
7. **Moments for the demo:** `#timers`, `#timer-done`, `#timer-removed`, `#timer-change`, `#mash` and `#hop` with
   timers, any moment with none (the corner), `#other-recipe`, and `?tplace=today&col=today` for the screen as built
   before.

### In CraftBeerPi

- Nothing: the timers' commands and the recipe book's LOAD are as built.

### What it settles

- DESIGN.md's Strike Water "Known limits": on one screen the closed strike water box no longer shares the column with
  the timers, so the step list keeps the current step whole with any number of timers.
- The Under Its Plate Rule has its one exception, while timers are up on one screen.

### Checked

- `files\tplace_side.py`, 262 checks, all pass, at 1180 × 860, 1280 × 800, 1366 × 768, 1440 × 900, 1920 × 950 and
  1920 × 1080, in `#mash`, `#hop`, `#sw-heat`, `#timers` and `#timer-done`: with two timers, the current step whole, the
  drawing's box and the hot liquor tank's outline as tall as before (within 0.1 px), the column 300 px at the drawing's
  height; with four, the list scrolling; with none, the drawing as before and the corner's buttons clear of every
  part of it; long questions in the title bar with the count still in view; the presses (+ TIMER from the corner, the
  first timer bringing the column, the editor beside it, PAUSE, Escape, REMOVE and UNDO, the last timer going after
  its 10 s, a timer running out and OK, the note, the list keeping its place); a phone as before.
- The drawing's box and the hot liquor tank, before and with D (the same with none):

| Window | Drawing before | With two timers | Tank (px) | Timers whole, of four |
|---|---|---|---|---|
| 1180 × 860 | 788 × 137 | 476 × 137 | 56.8 | 2 |
| 1280 × 800 | 888 × 136 | 576 × 136 | 56.2 | 2 (column's foot 48 px below the window) |
| 1366 × 768 | 974 × 190 | 662 × 190 | 81.1 | 3 (80 px below the window) |
| 1440 × 900 | 1048 × 217 | 736 × 217 | 93.7 | 3 |
| 1920 × 950 | 1428 × 221 | 1116 × 221 | 95.5 | 4 |
| 1920 × 1080 | 1428 × 289 | 1116 × 289 | 127.0 | 4 |

  On the brewer's 24-inch 1080p monitor (0.277 mm a pixel) the tank is 26 mm tall at 1920 × 950, as before.
  1280 × 800 and 1366 × 768 are already taller than the window today, so there the column's foot is below the window
  until the page is scrolled, as the drawing's is.
- The other suites, all passing on the new default: BrewStart 234, the timers 72 (pinned to the column) and 37, the
  timers' places 149, UNLOAD 61, the clock 17, the boil kettle 23, the strike water 28 and 30, the review page 36, the
  pH box 128 and 134. Suites that test the column's timers on one screen now ask for `?tplace=today`.
- Pictures of every moment at 1440 × 900 and 390 × 844, against the copy in `design/brewday` (UI 939fa5c): with
  `?tplace=today&col=today` all 258 the same. By default 129 moments differ, as expected: at 1440 × 900 the timers
  beside the drawing (or + TIMER and SOUND over its corner, where there are none), the recipe column without them,
  and OTHER RECIPE on a recipe not begun; at 390 × 844 only OTHER RECIPE's row, the timers as before.

### Changed

- `proposal\brew-day.js`: the flags (`COL` new by default, `FOLD` for `?col=new`'s folds, `TPLACE` "side" by default),
  the folds behind `FOLD`, LOAD from the column's book only from OTHER RECIPE's box, Escape with an editor beside the
  drawing, the moments strip's links; `proposal\brew-day.html` (the notes and links); `column.html`, `timers.html` and
  `review.html` pinned to the column as built, so they still compare what they did. `brew-day.css`: nothing.
- `proposal\TIMER-PLACE.md`, `proposal\RECIPE-COLUMN.md`; this section.
- `DESIGN.md`: Layout, The Under Its Plate Rule, Recipe Column (OTHER RECIPE), Timers (Beside the drawing), Strike
  Water's known limits and the boxes' room; `.impeccable\decisions\direction-log.md`; `.impeccable\design.json`.

## Open questions about the drawing

Both were answered on 10 Nov. The valves have been in the drawing since then; the path after the boil was
designed on 12 Nov, once the brewer asked about it (above):

- Valves or hoses: he moves hoses between ports on quick-disconnects, but wants the drawing to keep the
  valves: "I like the valve representation - it is professional looking process control".
- After the boil: the wort pump does not run during the boil. Once the boil is over it runs the boil kettle
  round through the chiller and back into the kettle (an optional whirlpool), and then sends the wort through
  the chiller to the fermenter. Until the drawing has that path, running the wort pump then still shows wort
  going round the HERMS coil into the mash tun, which is wrong. Answered on 12 Nov: see "The wort pump after the
  boil, with the chiller" above.

## Temperature graphs: option A, chosen on 10 Nov, to be built

The brewer asked (9 Nov): "Can you mock up a way to add temperature graphs to the dashboard? It should be natural
looking and not like a bolt-on". Asked what a graph should show at a glance, he answered: "I'd like the
ability to toggle between a,b, and c by clicking the temperature graph". The three were (a) the last 30
minutes, to see whether a vessel will reach its target and roughly when; (b) the last 10 minutes, to see how
steadily it is holding; (c) the whole brew day.

He then chose option A, "graphs always showing, with a smaller rig drawing", over option B, a DRAWING /
GRAPHS switch that would have swapped the drawing for the graphs, and asked for it to go to Brett to build.
Asked how CraftBeerPi shows on his monitor, he said he usually runs a normal browser window with tabs and the
address bar showing, and that full screen "is a good idea and I may start to use that in the future". So A
has to work in a browser window about 950 px tall on his 1080-line monitor, and now does.

How to look at it:

- `brew-day.html` shows the graphs by default; `?graphs=none` shows the screen as first built. `&span=10`,
  `30` or `day` picks the starting span.
- `graphs.html` is the comparison the brewer chose from: A, B and the screen without graphs, on a full-screen
  monitor, a browser window on that monitor and a phone. B (`?graphs=panel`) is kept only for that record:
  don't port `renderGraphPanel`, `.gpanel`, `.ghead`, `.gcol`, `.gwin` or `.gview`.
- The code is `graphs.js`, hooks in `brew-day.js` (search for `GRAPHS` and `graph`), the label scale `rs` in
  `rig.js`, and the block at the end of `brew-day.css`. With `?graphs=none` the page matches the screen as
  built pixel for pixel: checked against `design\brewday` in all six moments at 1920×1080, 1440×900 and
  390×844, 18 of 18 identical.

What it is:

- One graph per vessel, in its PID window under the PV and SV, with its own temperature scale. The three
  are never put on one shared plot, which the brewer turned down. Red line for PV, green step line for SV, orange
  band for OUT (element power), numbered tags where steps started, clock times along the bottom when the
  graph is at least 90 px tall. The three share their clock marks.
- 10 MIN, 30 MIN and DAY beside each graph. Tapping a graph moves all three to the next span; tapping a
  label goes straight to it. 30 MIN to start with.
- When readings stop, the lines turn grey and a dark stretch covers the time with no readings.
- When a vessel is heading for its target and is at least 1 °F away, its status line adds "about N min at
  this rate", worked out from the last 3 minutes and shown only if it's under 2 hours.
- On a phone the graph sits in each faceplate too, 108 px tall.

What it costs on a monitor, and how the screen makes up for it:

- The drawing gets shorter: 289 px instead of 413 px on a 1920×1080 screen at full screen, and 221 px
  instead of 283 px in a browser window about 950 px tall.
- Its labels are set larger as it shrinks, up to 1.3 times (vessel names up to 1.15 times). In a browser
  window they come out the same size as on the screen as first built.
- When the screen is 1000 px tall or less, the faceplates tighten. The PV and SV keep their size.
  - Faceplate rows 8 px apart instead of 10.
  - Lamp buttons 66 px tall instead of 73 (padding 12px 8px 5px, min-height 58px).
  - The mode row 56 px instead of 64 (min-height 54px).
  - The graph's top margin and padding 7 px instead of 10.
  - The span labels closer together (gap 2 px, padding 4 px).
- The drawing never goes below 140 px. Only a screen under about 900 px tall scrolls, and only a little,
  when an alarm makes the title bar taller.

| Change | What it needs | Notes |
|---|---|---|
| The graphs, the spans, tapping to change span, the grey lines and dark stretch when readings stop, the time-to-target | React UI | `graphs.js` is the reference. Remember the span on each device in `localStorage`; the mockup forgets it when the page reloads. Each graph is drawn to its box, so redraw when the fonts finish loading (the mockup listens for `document.fonts` `loadingdone`) or watch each box with a `ResizeObserver`; otherwise a graph keeps the width it had before the fonts arrived. |
| The faceplates tightening at 1000 px tall or less | React UI | The `@media (min-width:1180px) and (max-height:1000px)` block in `brew-day.css`, all under `[data-graphs=face]`. |
| PV history | React UI on today's server; sharper with a server change | `GET /log/{name}` and `POST /log/logs` return a sensor's whole log thinned to about 500 points (the highest reading in each slice), with no time window. Over a 6-hour log that's a point every 43 s or so: fine for DAY and 30 MIN, coarse for 10 MIN. The screen can start from that and then add the live readings it already receives (`sensorupdate`). A `since` parameter on `/log` would give full detail straight away (server, optional). |
| SV and OUT history | One setting; a server change for heating by hand | The kettle logics log their target and element power only when the `PID_LOGGING` setting is "Yes" (it defaults to "No"): PIDHerms as `<mash tun id>.mash_setpoint`, `.hlt_setpoint` and `.duty`, PIDBoil as `<kettle id>.setpoint` and `.duty`. Nothing is logged while a kettle is in MANUAL, and switching an actor is never logged (`CBpiActor.log_data` exists but nothing calls it). Without server work, the screen can only draw SV and OUT for the time it has been open. |
| Step tags, and where DAY starts | Server, optional | CraftBeerPi doesn't keep the time each step started. The screen can tag the steps it saw start while it was open. To keep them after a reload, and to start DAY when the recipe started, the server would have to keep the start times. BrewScribe may already record them, so ask the brewer and Porter before adding a second record. Until then DAY can show the last 8 hours. |
| The drawing's labels set larger when it is shorter | React UI | `rigSVG(style, W, rs)` and `rigPump(…, rs)` in `rig.js`; `drawRig` in `brew-day.js` works out `rs` (at most 1.3). With `rs` = 1 the drawing is unchanged. |

The graphs show the brew day so far only to help the brewer run it. They don't save anything; recording the brew
day stays BrewScribe's job.
