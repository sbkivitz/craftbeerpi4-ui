# Brew-day screen, layout B: what it would take to build

This folder is a proposal. Nothing in it changes CraftBeerPi, and nothing is committed.

- `compare.html` flips between the two layouts Scott compared (press Space). Use it to check either design
  on a monitor, a laptop or a phone, in five moments of a brew day.
- `brew-day.html` is layout B on its own: Scott chose it on 9 Nov 2026. Add `?layout=a` to see layout A. It has
  a sixth moment, `#sparge`, for the runoff to the boil kettle, and a seventh, `#boilpower`, for the boil
  power control Scott asked to have back on 10 Nov. It shows a temperature graph in each
  faceplate, which Scott chose on 10 Nov; add `?graphs=none` to see the screen as first built. Its boil kettle is
  the one Scott approved on 10 Nov, built on the screen that evening and the default since; add `?bk=today` for
  the faceplate the screen keeps for an older BoilPower (`boil-kettle.html` shows the two side by side). The boil
  kettle has more moments: `#heatup`, `#pause`, `#pause-long`, `#boiling`, `#hold`, `#keepboil`, `#letfall`,
  `#bktarget` and `#handhold`. `#notarget` and `#notarget-hlt` show a vessel in AUTO with no target.
  `#sparge-heat`, `#sparge-ready`, `#sparge-run` and `#sparge-batch` show the new SpargeStep (core
  4.7.7.post35); `#sparge` keeps the old MashStep sparge that recipes already in the book still have.
  `#boil-hold` is the hold before the boil, after a SpargeStep, with the pumps CraftBeerPi switches off for the
  hoses (core 1c08d4c). The timers
  Scott approved on 11 Nov, built that day, are shown by default (`#timers`, `#timer-done`, `#timer-new`,
  `#timer-names`, `#timer-nonames`, `#timers-hand`, `#sound-allow`); add `?timers=today` for the one rest timer the
  screen keeps for an older CraftBeerPi.
- The pages run on demo data copied from the simulator's config (`C:\src\personal\cbpi-testbench\config`).
  They do not talk to CraftBeerPi. Buttons respond and timers run, but nothing is sent anywhere.

## The short version

Almost all of this is one new React screen in `cbpi4gui`. It can run on today's server, with one exception:
Scott wants one rest timer shared by the monitor and the phone, and only the server can keep that. Every
other reading and command it needs already exists. Which kettle is which, and which switch is which pump,
comes from CraftBeerPi's own kettle settings, so there is no separate file to keep in step. Three more
extras would be better with server work; they are marked "server, optional" and the screen works without
them.

The temperature graphs Scott chose on 10 Nov follow the same pattern. Their temperature line works on today's
server. For the target and element-power lines to reach back before the screen was opened, the
`PID_LOGGING` setting has to be on; heating by hand and the step tags need small server changes to do the
same. The section at the end has the detail.

## Change by change

| Change | What it needs | Notes |
|---|---|---|
| A fixed brew-day screen: recipe on the left, three faceplates across the top, line drawing of the rig below, screen tabs along the top (bottom on a phone) | React UI | A new view in `cbpi4gui`. The free-form dashboard and its editor stay for other uses. |
| Say which kettle is the HLT, mash tun and boil kettle, which switches are the two elements and the two pumps, and which switch has its own override | React UI and one setting | As built by Brett (9 Nov): no mapping file. The screen reads it from CraftBeerPi's own settings, the way the kettle logics do: the mash tun is `MASH_TUN` or the kettle running PID_HERMS; the boil kettle is `BoilKettle`; the HLT is PID_HERMS's `HLT_Kettle`, or else the kettle whose sensor is its `HLT_Sensor`; the elements are those kettles' heaters and the pumps their agitators. A separate mapping could disagree with what the logics actually drive and lock or label the wrong switch. The override is one new setting, `BREWDAY_OVERRIDE_ACTOR` (an actor picker in Settings). On the rig this gives `HLT_HEAT` (GPIO 6), `BK_HEAT` (GPIO 5), `Recirc_PUMP` (GPIO 7, the override) and `Wort PUMP` (GPIO 8). |
| Faceplates: big red PV over smaller green SV, plus OUT (element power) and MODE | React UI | All from existing data: sensor value, kettle `target_temp`, actor power, whether the kettle logic is running. |
| "SV set by the mash tun" and the locked HLT buttons while the mash tun's HERMS logic runs | React UI | Read from the kettle config the screen already loads: `PID_HERMS` names its heater (`HLT Heater`) and its pump (`Mash Pump`). Write it as a general rule ("a running kettle logic drives its own heater and pump"), not as a special case. |
| Lamp-strip buttons that say their state in words: HEATING, RUNNING, OFF, DID NOT STOP; at least 56 px tall | React UI | Fixes defects U2 (small, adjacent buttons) and U3 (on and off shown mainly by colour). |
| Hold for one second to turn heat on, to switch a kettle to AUTO, and to start the recipe; one tap to turn anything off | React UI | Fixes U2 (one mis-tap can start a heating element). Works with a mouse, touch and the keyboard (Space or Enter held). |
| Every command answers at its own button: "switching on…", then confirmed, or a red "did not stop, tap to try again" plus an alert in the title bar | React UI | Fixes U1 (failed commands are invisible). Actor on and off already return 500 when they fail. The UI must stop throwing errors away and must time out a command that gets no answer. |
| Error messages a person can read | Server, optional | Today most failures come back as a bare 500 or 204. A short reason in the response would let the alert say why. |
| Separate AUTO and MANUAL buttons | React UI | Use the existing `POST /kettle/{id}/on` and `/off`. Do not use `/toggle`: on a screen that is a few seconds out of date, toggle can switch the wrong way. |
| Target editor: −1, −0.1, +0.1, +1 or type a value, then SET | React UI | Existing `POST /kettle/{id}/target_temp`. |
| Boil power beside the boil element: BOIL POWER 45 % in AUTO, POWER 100 % (the element's own level) in MANUAL; tap, adjust, SET; works while a recipe runs | React UI | Scott's top priority, 10 Nov. Existing `set_boil_power` kettle action and `/actor/{id}/set_power`. See "Boil power" below. |
| Recipe column: every step, the current step's time left and progress bar, hop additions with "add now" when due | React UI | Existing step data. Boil additions are already there, for example `Hop_1: 60` and `Hop_1_text: "3.00 oz Centennial"`. Start, Stop and Next step use the existing `/step2/start`, `/step2/stop` and `/step2/next`. |
| Next step asks once, in place: "Skip the rest of Saccharification (23:41 left) and start Sparge?" | React UI | |
| Hop and lid alerts in the title bar with their own button (ADDED, DONE) | React UI | Existing notifications with actions. Since the S2 fix they stay until answered. |
| Line drawing of the rig: liquor and wort pipes that move only while their pump runs; elements glow while heating | React UI | A new drawing component driven by actor state. The 3-vessel HERMS plumbing is built in; the mapping above says which switch is which pump. |
| The drawing's hand valves and which way the liquid goes: through the HERMS coil and round the HLT while mashing; to the boil kettle, with sparge water from the HLT pump to the top of the mash tun, during the runoff | React UI | Scott's request and answers (9 Nov): see the end of this file. CraftBeerPi can't see the valves, so the screen works the positions out from the recipe and says so under the boil kettle ("VALVES ARE SET BY HAND · SHOWN FOR STEP 4 (SPARGE)"). The runoff runs from the moment the step named for it has started (status A, S or D) until the boil step leaves I, so it includes the hold at "Ready to boil?". The step is found the way the core finds it for the first-wort reminder, `StepController._collects_wort`: not a HeatStep; the name, split at camel case, lower-cased and with anything but letters and digits turned to spaces, matches `^(?:step \d+ )?(?:(?:start\|begin) )?(?:(?:fly\|batch\|continuous) )?(?:sparge\|sparging\|lauter\|lautering\|run ?off)(?: \|$)` and contains none of the words water, heat, heating, prepare, preparation, salts or treatment. The boil step is the first BoilStep after it. At any other time, and with no recipe, the drawing shows recirculating. In Test Recipe v5 the Sparge step keeps the mash tun in AUTO, so CraftBeerPi reports the wort pump running "for the HERMS"; during the runoff the drawing still sends it to the boil kettle and leaves the coil dark. The mockup's `runoffStep()` and `renderRig()` are the reference, and `#sparge` is the demo moment. A SpargeStep is the runoff by its type, and holds the valves on recirculating until Sparge started: see "The SpargeStep" below. |
| Phone layout: current step on top, faceplates stacked, recipe below, tabs along the bottom | React UI | Fixes U4 (the dashboard does not adapt to small screens). The phone keeps every control the monitor has. |
| Connection lost: readings turn grey and show their age, controls pause, an alert says what is happening | React UI | Uses the websocket's connection state. Reconnecting cleanly is the separate open defect HC-UI-02. |
| ALL OFF in the title bar: recipe stopped, every kettle to MANUAL, both elements and both pumps off | React UI, or server optional | Scott kept it on 9 Nov and asked for it to stop the HLT pump too, so it was renamed from ALL HEAT OFF. The UI can send the separate commands and report any that fail: stop the recipe first (`/step2/stop`) so it can't switch a kettle back on, then each kettle's `/off`, then `/off` for all four switches. A single server endpoint would make it one command that either works or fails as a whole. The HLT pump's override switch can still run that pump; see the next row. |
| The HLT pump's override switch: under the pump in the drawing, OFF gets a third line, "UNLESS OVERRIDE SWITCH IS ON"; when the screen switches the pump off, on its own or with ALL OFF, the last-event line adds "its override switch can still run it" | Setting and React UI | The HLT pump has a switch on the rig that runs it whatever CraftBeerPi says, and CraftBeerPi can't see that switch (rig record, 9 Oct). So "confirmed off" only means CraftBeerPi switched its output off, not that the pump has stopped. `BREWDAY_OVERRIDE_ACTOR` names the switch with an override; the screen adds both lines for it. The phone has no drawing, so there the last-event line and LOG carry it. |
| Last event and LOG under the title bar | React UI | Covers commands from this screen. Showing commands from the phone on the monitor too needs a shared log: server, optional. |
| Rest timer when brewing by hand: one timer, shared by every screen | Server and React UI | Scott chose this on 9 Nov. The server keeps the time left and whether it is running; START TIMER, PAUSE TIMER and ±5 MIN are commands to it, and every open screen shows the same countdown. At zero the server raises a CraftBeerPi notification, which shows on every screen and stays until answered, as hop alerts have since the S2 fix. Since 11 Nov the screen has up to four named timers instead (see "Timers" below), and keeps this one rest timer only for an older CraftBeerPi. |
| Barlow and Barlow Condensed fonts | React UI | Bundle the font files with the UI build. The Pi may have no internet on brew day; the mockup loads them from Google Fonts. |
| An HLT pump in the simulator | Simulator configuration | The rig already has one: `Recirc_PUMP` on GPIO 7, which is also the HLT kettle's agitator (Scott confirmed the pump mapping on 9 Oct). The simulator has `Mash Pump` and `Glycol Pump` but no HLT pump; Brett plans to add one when he builds this. |

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
- Mockup 03 (recipe progress), which Scott liked, carries over into the recipe column.

## Additions beyond the D3 picture: Scott kept all of them

The D3 layout Scott chose does not show these. Each one is in the mockup for a reason. On 9 Nov Scott said
"keep your additions".

- **ALL OFF** in the title bar (ALL HEAT OFF until 9 Nov). Product principle 2: switching off is always
  quick. Neutral outline when nothing is wrong, so red keeps meaning PV digits and faults.
- **CONNECTED dot and the LOG button.** Principle 3 and defect U1: the screen should say whether it is
  live and what happened to each command.
- **Rest timer when no recipe runs.** Scott said on 2 Oct that he uses his phone as a rest timer when
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

## Scott's answers (9 Nov 2026)

1. ALL HEAT OFF: keep it, stop the HLT pump too ("Yes, stop the HLT pump too"), and call it ALL OFF ("Yes,
   call it ALL OFF"). It now stops both pumps, including a wort pump switched on by hand.
2. Rest timer: one timer shared by the monitor and the phone ("Share one timer between screens"), so the
   server keeps it.
3. How the HLT pump is set up on the rig: Brett found the answer in the rig records, so Scott wasn't asked.
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
are drawn with hand valves, like the wort pump's. Scott actually moves hoses, but wants the valves drawn.

The screen isn't waiting on Scott. Two questions about the drawing have been answered but not drawn yet (see
"Open questions about the drawing" below).

## A fix to the screen as built (10 Nov)

When brewing by hand, the recipe column holds the rest timer and the recipe book. On a screen under about
1000 px tall that is taller than the column, so the whole page scrolled: 34 px in a 1920×950 browser window
(Scott's usual set-up) and 131 px on a 1440×900 laptop, breaking the One Screen Rule. Now the recipe book's
list scrolls inside the column, as the step list does while a recipe runs (`.book` and `.book ul` in
`brew-day.css`). Where nothing overflowed, the screen is unchanged, apart from one or two levels of
anti-aliasing on the list's rounded corners, because the list is now a scroll box.

## Boil power: Scott's top priority (10 Nov), ships before the graphs

Scott, 10 Nov: "I seem to have lost the critical ability to set the boil power percentage with this redesign.
Work with the design agent to add it back. This is next high priority." A few minutes later: "I need to be
able to adjust boil element power even while running a recipe".

Brett is releasing this on the screen as built, before the graphs. So the reference is
`brew-day.html?graphs=none#boilpower`; `brew-day.html#boilpower` is the same control with the graphs.

What Scott sees:

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
  `#boilpower` is step 5, the Boil, running, with the 60-minute hop already in, and Scott turning 45 % down to
  40 %. (Test Recipe v5's boil is step 5.)
- With no connection it pauses like every other control.

Decisions I made, from Brett's facts. I showed Scott the first and fourth on 10 Nov (one button for both modes,
and no held press); he hasn't answered yet:

- **One button for both modes**, as Brett suggested: BOIL POWER in AUTO, POWER in MANUAL, and the hint says
  when the level is used. Hardware boil controllers work the same way: their output keys set the boil output
  in boil mode and the element output in manual mode. If Scott would rather set the by-hand level somewhere
  else, only the MANUAL half changes.
- **If the kettle's mode changes while the editor is open** (the Boil step starting, a step stopping), the
  editor closes without sending anything, and the note under the faceplate says "The boil kettle switched to
  AUTO, so the button now sets the boil power. Nothing was changed." Otherwise SET could change the by-hand
  level while the button above it says BOIL POWER.
- **During the "Ready to boil?" hold the button offers POWER (by hand), not BOIL POWER.** Brett asked (10 Nov),
  since the kettle is in MANUAL then. Keep it that way. The button always sets the level the element runs at
  in the kettle's current mode, so it always agrees with the lamp and OUT. If Scott heats the first runnings
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
  the old dialog). The Whirlpool step sets and clears it itself. Brett will ask Scott whether he wants it.

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
button says "used from 210.2 °F". If Scott set a boil power then, the event line's "full power until then"
would also be wrong. This was true before boil power, apart from the button.

I'll design it with the whirlpool and chiller drawing, which needs a whirlpool moment anyway. My starting
point: the faceplate shows the hold as its SV, MODE reads HOLD, and the line under the window counts from the
hold; the power button says the boil power isn't used during a hold. The screen can tell a hold is set from
the kettle's `Hold_Target` setting: a number above 0 and more than 3.6 °F below the boil point
(`BoilPower._hold_target`). Whether Scott also wants to set a hold from this screen is the question Brett is
keeping for him.

Update, same day: the redesign below designs it. The demo moment is `#hold` (17:18:40, holding 170 °F at
35 %). Today's faceplate shows it as described above. The redesign shows HOLD 170.0 in the SV place. MODE
stays AUTO, because AUTO is what Scott switched on; the hold is said in the line under the window instead.

## AUTO with no target: ready to build (10 Nov)

Scott on 8012 at 13:47: "What went wrong? I have Mash Tun "Auto" on but HLT is off. I think a "SV" was not
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
    // (not driven, or V.sv == null in any mode) is what hid it, so these come first.
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
- `#notarget` (13:47:10), Scott's case: the mash tun in AUTO since 13:26 with no target, the HLT in MANUAL at
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

## The boil kettle's power and temperature: ready to build (Scott, 10 Nov)

> Later that evening Brett's new BoilPower changed parts of this section; the next section wins where they
> differ. The button beside AUTO/MANUAL is now TARGET (BOIL or a temperature to hold), and the boil power's
> button is the framed 45 % in the window. BOIL AT is a setting of its own with its own box. A hold is the
> kettle's own target and reads SV, like the HLT's, with OUT. The pause is `set_paused(Paused)`.

Scott called the boil kettle's power and temperature controls "not intuitive". A first, three-way comparison
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
  before or during the boil, is kept for that boil. Scott chose "each boil starts at your usual power"; I
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

Still open then, all answered by Scott later on 10 Nov (next section): the boil's timer keeps counting while the
heat is paused; a forgotten pause gets a kept warning after 2 minutes; and a hold by hand is the kettle's own
target, "like the HLT".

## The boil kettle's target, KEEP BOILING and a forgotten pause: ready to build (10 Nov, evening)

Build this with the section above; where they differ, this one wins. It covers three requests, all on
`brew-day.html?bk=power` (with `&graphs=none` until the graphs ship):
- Scott: "add a small checkbox with LED to choose keep at boil temp or let the boil power fully drive the temp
  (ok to fall if I set it too low %)".
- Scott, on holding by hand: "Set the boil kettle's target to 170 °F, like the HLT, and it holds there", "I
  question if a new button is needed for it", and "work with design agent for most elegant and practical
  solution... intuitive, elegant, and natural". Your BoilPower now treats the kettle's target T as BOIL when
  it is within 3.6 °F of the boil point B or above (or unset), and as a temperature to hold below that.
- Scott, on the pause: the boil's timer keeps counting, and a forgotten pause gets a kept warning after 2
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
  was heating carries on, as in `_hold_climb_power`).

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
- Scott asked for a "small checkbox with LED". I read that as an LED-style checkbox, one lit box, so the state
  shows once. If he wants a round lamp beside a tick box instead, it is a small change.

### A forgotten pause

- Your interface: a tap on HEATING (or OFF) in AUTO sends `set_paused(Paused="Yes")`; a held press on PAUSED
  sends `set_paused(Paused="No")`. The line counts from `Paused_At`, so every screen shows the same time. Pause
  works in a hold too.
- The warning, from the server: title "Boil Kettle heat still paused", message "The heat has been paused for 2
  minutes. To heat again, press and hold PAUSED on the Boil Kettle." (the kettle's name where it says Boil
  Kettle). One OK. Kept, once per pause, and taken down when the heat carries on, the kettle goes to MANUAL, or
  ALL OFF. OK only puts it away; the heat stays paused. In the mockup it waits its turn behind another prompt.
  Event: "Boil Kettle heat still paused · waiting for you".
- The boil's timer keeps counting while paused, as Scott chose; the mockup already did.

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

Scott, 10 Nov: "sparge step needs to let the HLT get up to mash out temperature before pumping wort over to boil
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
  and the sparge line to the top of the mash tun." Layout A leaves out the HLT return and the sparge line.
- On the phone there is no drawing, as built. The title-bar prompt and the step row carry the moment there.

**Fly or batch: one set of valves covers both**, as you thought. In a fly sparge both pumps run (`#sparge-run`:
the sparge line and the line to the boil kettle lit). In a batch sparge each pump runs alone: the wort pump drains
the first runnings to the boil kettle, then the HLT pump refills the mash tun (`#sparge-batch`: only the sparge
line lit, the wort pump off). Only the running pump's line lights, so the drawing is right for both. One thing it
can't show: a vorlauf between batches, running the wort back into the mash tun through the coil line. The valves
would be set for that by hand and the drawing would still show the runoff. I left it; it only matters if Scott
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

> Built the same evening: you ported 3, 4 and the USUAL wording in 5 (UI c864354, build 66d6de1, on 8012).
> Your design copy matches this folder file for file, and identity is 281/281 again. The released screen on main
> was whole in all 28 of its moments, so nothing needed back-porting. The timers proposal stays out of the screen
> (scope-css.mjs) until Scott approves it.

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
phone does. I haven't designed that; it matters only if Scott uses those widths.

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

## Timers: approved by Scott on 11 Nov, built the same day

Scott, 10 Nov, after using the rest timer: "why is it named that? lots of things use a timer during a brew day. I
want an optionally audible alarm and more attention grabbing but still elegant visual alerting when timer expires.
Also want to have multiple timers in parallel if I click a + or something like that. Nice to have= ability to name
timers". Asked whether the sound should cover only his timers, he chose "my timers and CraftBeerPi's alerts".

Scott, 11 Nov: "add the timers that design agent discussed. Those default names are fine as long as they're easily
changed on brew day. I'd like to have an easy config setting to choose the default timer names from the setup if
that's easy enough too". The names setting is the next section but one.

> **Built, 11 Nov.** Brett built it the same day: the screen in dc789c6 (build 6f659e3, the web UI's brewday-graphs
> branch), the server in 246e263, c9c83dc and e36433b (`cbpi\controller\timers_controller.py`,
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
    Settings" below; HOP STAND, YEAST and VORLAUF unless Scott changes them). A tap fills the name; a second tap
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
  hears what it sounds like. (Until 12 Nov: Scott asked for no sound on the press. See "SOUND switches on silently".)
  It is kept in the browser (localStorage), not in CraftBeerPi, so the phone can be quiet while the monitor beeps.
- **A browser plays sound only after a tap on the page.** After a reload with SOUND on, the switch says "SOUND · TAP
  TO ALLOW" in amber, its box unlit amber, until the first tap or key press anywhere, which unlocks it
  (`#sound-allow`). Escape doesn't: a browser doesn't count it. A press on SOUND itself allows it too, leaves it on,
  and plays the two beeps (silent since 12 Nov); it doesn't switch it off. A mouse press counts as it goes down, but a finger counts only as
  it lifts (the HTML standard's activation-triggering events: `pointerdown` for a mouse, `pointerup` or `touchend`
  for a finger or pen, `keydown` except Escape), so a touch tries again on `pointerup`.
- **The sound** (one for now; choosing between presets modelled on real controllers is Scott's later todo): a
  softened piezo beep, a sine at 1760 Hz, 120 ms (12 ms rise, then falling away), three of them 200 ms apart (Web
  Audio).

### Names from Settings: BREWDAY_TIMER_NAMES (11 Nov)

What "default timer names" means here. I asked Scott what a new timer should be called if he doesn't pick a name.
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

### Scott's answers (11 Nov)

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

1. **A blank setting gives no names** (e36433b, with the setting's description). `config.get()` returns the default
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
3. **One name per timer on the server too** (c9c83dc). `_name()` refuses a name another timer has, with the
   screen's words, comparing with `casefold()`; `_default_name()` skips a "Timer N" the same way.
4. **A wider box on the Settings page: done** (web UI 4641a7f). Text settings used MUI's default `TextField`
   (about 180 px wide), so most of a six-name list was out of view while he typed it. `fullWidth` alone wouldn't
   have widened it, because the value column only grows to fit what's in it. Scott chose "wider boxes, and a long
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
  the user's, Escape included, so this could not be tested here. To try it on Scott's phone: reload with SOUND on,
  tap once anywhere, then let a timer run out.
- **A finished timer's alarm goes when the timer is removed or SET.** The mockup's simulation, which your demo
  mode copies, left the prompt pulsing in the title bar with buttons that did nothing. A new `tAnswered(t)` takes
  the prompt down (OK and +5 MIN use it too), and the next waiting alarm takes the title bar a second later. Live,
  CraftBeerPi already withdraws the prompt, so only the demo was wrong.

> **Taken, 11 Nov.** Brett took all three as written, in web UI 7b0697d (build 091c9a2). One difference, right for
> the screen: its `unlockSound()` calls `renderAll()` rather than redrawing only `.snd`, because the screen updates
> its regions in place and the pressed button stays put. His identity test matched this folder 375/375 (the 11:23
> copy), asking for `?timers=today` for a build without the timers; the timers live test passed 56/56 and the brew
> day's 83/83. Still to check, on Scott's phone: after a reload with SOUND on, one tap anywhere, then a timer that
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
- Scott, 13:19: "for BoilPower, I'd like the +/-1 in addition to the +/- 5 you already have."
- Scott, 13:45: "I'd like the "HEATING xx %" button to only show HEATING since the percentage is shown in the graph and as a
  number on the right side of the PID display. It would be cleaner to remove this duplicate version"
- Your core 1c08d4c (DEFECTS M71), for Scott: "Any time I need to change hoses or "valves" that respective pump should
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

`lampHTML` says HEATING for any element in layout B. The power stays where Scott pointed: OUT beside the window, with
its bar, and the graph's OUT band. That changes the HLT's element (by hand, in its own AUTO, and run by the mash
tun's HERMS) and the older boil kettle's element (`?bk=today`); the new boil kettle already said HEATING. Layout A
keeps "HEATING 62 %", because it has no OUT and no graphs, so there the button is the only place the power shows.
The screen builds only layout B, so for you it is always HEATING:

```js
t = A.kind === "heat" ? (LAYOUT === "a" && !(id === "bkEl" && BK === "power") ? `HEATING ${a.pct} %` : "HEATING") : "RUNNING";
```

### Pumps off for the hoses (core 1c08d4c)

The mockup now does what your server does, and shows it the way the screen already shows CraftBeerPi's own doings:
the lamp goes to OFF, the drawing's line stops, and CraftBeerPi's words say why. The screen never switches these
pumps itself and adds no warning of its own.

| When | Pump switched off | What the screen shows |
|---|---|---|
| A SpargeStep starts (`spargeBegin`) | Wort pump | Nothing new: `#sparge-heat` already had it off |
| The sparge water is ready (`#sparge-ready`) | HLT pump | HLT PUMP OFF, its line still and UNLESS OVERRIDE SWITCH IS ON under it in the drawing; the question's new words |
| Sparge started | None | As now: Scott starts both by hand |
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
- In LOG only: `#sparge-run` gains "15:04:55 HLT PUMP started · confirmed" (Scott starts it again by hand) and
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
- **701–1023 px wide, layout B** (a tablet, or half of Scott's 1920 monitor). The question shared the top row with the
  brand, the connection, ALL OFF and the clock, leaving its words 36–175 px. At 701 px `#sparge-ready` was 837 px
  tall and the bar ran 49 px past the screen. Now the banner has the title bar's second row to itself, as on a phone
  ("NO ALARMS" too): 422–752 px for the words, 103–146 px tall. None of your five test sizes is in this range.

```css
/* in the phone block (max-width:700px) */
.banner[data-long]{flex-wrap:wrap;row-gap:8px}
.banner[data-long] .msg{flex-basis:calc(100% - 38px)}
.banner[data-long] .msg+.act{margin-left:auto}
.banner[data-long] svg{align-self:flex-start;margin-top:2px}
/* new, just before the phone block */
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

Presses: SPARGE STARTED in `#sparge-ready` now leaves both pumps off (Scott starts them by hand), and on the phone its
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

Scott asked about it today. His BREWERY_NAME on 8012 is "EBrews - A CraftBeerPi Brewery", 30 characters, which the
title bar sets in capitals. Until now the mockup printed "CraftBeerPi Brewery" on a monitor and "CraftBeerPi" on a
phone, whatever the setting said; PRODUCT.md promised the setting.

The mockup also has a BREWSCRIBE tab now. Its notes come next, in their own section. Until you build it, add
`&brewscribe=none` to your identity test's addresses: that is the screen without it, and every rule below holds there.

### What it shows

- The setting, at every width: one span, no `.long` and `.short`. The phone shows it too. The name is what tells
  Scott's rig from his simulators, and a phone is where he is most likely to have both open.
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

### Scott's name, size by size

- His monitor, 1920 px: one line, 23.8 px (the default name is 34 px): EBREWS - A CRAFTBEERPI BREWERY. With the sparge
  question, two lines, whole. With "Ready to boil?", the longest question, "EBREWS - A / CRAFTBEERPI…".
- Half his monitor, 960 px: one line at the full 22 px.
- A phone: 15.4 px. Two lines at 360 and 390 px (EBREWS - A CRAFTBEERPI / BREWERY), one at 430.
- In every one of those moments the title bar is exactly as tall as with the default name. At laptop sizes it grows
  in two moments: at 1366 px "connection lost", and at 1440 px "no target", wrap onto a second line (22 px). His
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
/* gone: .brand .short{display:none}, and the phone's .brand .long{display:none} and .brand .short{display:inline} */
@media (min-width:701px) and (max-width:1023px){
  [data-layout=b] .brand{flex:1 1 0;min-width:0;max-width:none}
  [data-layout=b] .brand[data-long] .bname{font-size:1em}
}
/* phone, layout A only (you don't build it): [data-layout=a] .brand{flex:1 1 0;min-width:0} */
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
- With `?name=`: whatever name you give. For Scott's,
  `?name=EBrews%20-%20A%20CraftBeerPi%20Brewery&brewscribe=none#mash`. The mockup strip has "Brewery name: default ·
  Scott's · a simulator · 30 characters · 36 characters". "Scott's" is his current 8012 name, "EBrews - Simulator"
  (it was "EBrews" for a while), and his first name is "30 characters" (mockup only, hidden by `?bare`; nothing to
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
- 5,040 loads: every moment at 14 sizes, with the default name, Scott's, "Simulator 8012", 36 and 52 characters, one
  33-letter word, a blank name, and layout A. No page errors, nothing past the screen's edge, the tab row's height
  unchanged, and the title bar never taller with the default, a simulator's or a blank name.
- Names of 36 characters and more make the title bar taller in a few alarm moments at 1024–1440 px (22 px, the alarm's
  second line), the 52-character one also in "Ready to boil?" at 1920, and the 33-letter word in more, as one word
  can't give way.

### For you to decide, or tell me

1. The phone's default name now takes two lines. I'd keep the name rather than shorten it to "CraftBeerPi": a short
   form hides what tells two CraftBeerPis apart.
2. At laptop sizes a long name keeps its line while an alarm takes a second one. Making the name give way first means
   cutting Scott's name in moments where it fits whole today. I left it.
3. For Scott, not the screen: if the rig and the simulators all say "EBrews - A CraftBeerPi Brewery", the title bar
   can't tell them apart. Naming the simulators "Simulator 8000" and "Simulator 8012" would.

### Built (11 Nov, evening)

- Brett built it the same evening: web UI e3735aa, build 5d3d66b. His identity test matches with `?name=` on both
  pages: Scott's 30-character name in `#mash`, `#sparge-ready`, `#boil-hold`, `#notarget` and `#offline`, and
  "Simulator 8012", the 36-character name and a blank one in `#mash`, at his five sizes. The page's title is ported
  too. A change in Settings shows at once on open screens.
- He agreed with all three calls above, and leaves the simulators' names to Scott.
- Scott has since shortened his 8012 name to "EBrews": one line at full size at every width.
- Looked at on 8012 at 1920, 960 and 390 px, without pressing anything: "EBREWS" at 34, 22 and 22 px, the title bar
  71, 127 and 121 px tall, the page's title "EBrews · Brew day", all as the mockup with `?name=EBrews`.
- Later that night Scott renamed 8012 "EBrews - Simulator", and it matched the mockup at five sizes (see "Built" under
  the boil kettle's step row, below).

## BREWSCRIBE: a tab that opens BrewScribe in its own browser tab, ready to build (11 Nov, evening)

You asked for a link to BrewScribe for Porter, the BrewScribe agent, on the brew-day screen. Scott chose a separate
browser tab for now, and you gave the address: `<a href="/brewscribe/#now" target="brewscribe">`. Where it goes was
mine.

### Where: the last tab

- In the tab row, after MORE. The tabs are where the screen's places are. Scott goes between brew day and BrewScribe
  many times on a brew day, so it shouldn't hide in MORE, and the title bar is for the state of the brew, not for
  places.
- Last, because the first seven are CraftBeerPi's own, in the order Scott knows, and none of them moves. BrewScribe
  is another program, so it sits at the end.
- On a phone the bar becomes four and four: BrewScribe takes the bottom right, under the thumb, and MORE no longer
  takes two cells. Where BrewScribe isn't installed, MORE takes two cells again (`?brewscribe=none`).

### What it says

- BREWSCRIBE, the program's name, in capitals like the rest, so the tab and the page it opens agree.
- After it, an icon drawn for this: a box with an arrow out of its corner, the usual sign for "opens elsewhere". It
  says so before the press (NN/g on new tabs; W3C technique G201), as Back won't bring Scott back from BrewScribe.
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
/* phone: was .tabs a:nth-child(7){grid-column:span 2} */
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
2. For Scott and Porter, not the screen: a browser slows down tabs you aren't looking at, and on a phone it may pause
   them. If Scott records in BrewScribe on the phone that also shows brew day, a timer or hop alarm may not sound until
   he switches back. The monitor's screen still rings. BrewScribe showing CraftBeerPi's alarms would cover it.
3. The mockup still plays the soft ping. The sounds are the Settings page's (`alarm.js`), so there's nothing to port.

### Built (11 Nov, evening)

- Brett built it the same evening: web UI 625c63a, build 281129d. Every moment opens with the tab, as in the mockup;
  his identity test also compares the press, and `#mash` and the timers without the tab (`?brewscribe=none`), at
  every size: 451/451.
- Item 1 above, how the screen tells: it asks CraftBeerPi `HEAD /brewscribe/`, and anything but 404 counts as
  installed. Each device remembers the answer, so the tab row doesn't move as the screen opens.
- Item 2, Porter's answer (11 Nov, evening; his newer build, not yet installed): BrewScribe shows CraftBeerPi's waiting
  prompts (hop alerts, timers that run out) on its own alarm line, with their title, message and "Answer in Brew Day
  ↗", and keeps each until it is answered on any screen. A tab the phone paused reconnects when it comes back to the
  front, and CraftBeerPi's snapshot brings the waiting prompts back. So Scott sees them; BrewScribe plays no sound, and
  Porter left that to Scott.
- The way back, already done by Porter and you: BrewScribe names its tab "brewscribe" (and an unnamed brew-day tab that
  opened it "craftbeerpi"); the brew-day screen names its own tab "craftbeerpi" (`screen.js`, `createBrewDay`); BREW
  DAY and "Answer in Brew Day ↗" go to the page CraftBeerPi's "/" leads to (its `index_url`) at `#/`, so the brew-day
  tab comes to the front without reloading. A reload would also stop its sound until the next tap.
- Looked at on 8012 at 1920, 960 and 390 px, without pressing anything: BrewScribe is installed there, so eight tabs,
  with `href="/brewscribe/#now"`, `target="brewscribe"` and no `rel`; on a phone four and four, BREW / SCRIBE with the
  icon after Scribe, as the mockup.

## OUT back on the boil kettle's window: ready to build (11 Nov, night)

Scott, 11 Nov, via Brett: "BoilPower's display has lost its current 'out' element power number? Please put it back".
The 10 Nov rule left the boil kettle's window with MODE only while its target was BOIL, and the afternoon's change took
the % off HEATING, so nothing showed what the element was doing.

### What it shows

OUT is the boil element's power now, in every state, as on the HLT: 100 % while it heats to the boil, the boil power
once it boils (45 % in `#boiling`), 0 % while paused, and the hand level in MANUAL (0 % with the element off). The green
BOIL number stays as it is: that is the setting, and OUT is what the element is doing. While it boils steadily both say
45, a setting beside the reading, like the HLT's SV and PV. HEATING keeps no %. In `auxHTML`, the boil kettle's special
case goes:

```js
// gone, with its comment:
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

- `brew-day.js`: `auxHTML` (the special case and its comment out; the new comment quotes Scott).
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

- Brett built it the same night (DEFECTS M76; web UI a513fe4, build ad897b3), live on 8012. The special case is gone
  from `auxHTML`, and both CSS rules came over as written, through his scoped stylesheet. His sizes match the
  mockup's, so the PV formula stands unchanged. Identity 451/451 on every moment, size and graphs setting.
- His live boil power test now reads OUT on both pages: 30 % at the boil power, 25 % after −5, 0 % paused (BOIL still
  40), 40 % heating again, 0 % in MANUAL with the element off, and 40 % back in AUTO: 92/92. The build before fails
  exactly those six checks.
- Also in that build, for the event line (a live page only, so nothing in the mockup): a fresh page now logs
  "Connected to CraftBeerPi" when the newest kept line is "Connection to CraftBeerPi lost". Before, it did that only
  when nothing was kept, so Scott's Edge tab said "lost · trying again" while connected: the page it replaced had
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

- Brett built it the same night (DEFECTS M77; web UI 1b75633, build c616051), live on 8012. Identity 451/451.
- 1180 px isn't one of his identity sizes, so he added a live check there to his boil power test: HEATING and PAUSED
  fit, the element is at least twice a step, every step is 24 px or more, the " %" is gone while the spoken names
  still say "percent", and pausing doesn't move the AUTO / MANUAL row. 95/95. The build before fails those three
  checks with the numbers above: the element 29 px, the steps 44, and the row moving 15 px (564 to 579) as the heat
  paused.
- Looked at on 8012 at 1920, 1180 and 390 px, without pressing anything. Its boil kettle was cold and in MANUAL, so
  the window read OUT 0 % and MODE MAN, with the PV at 40.6 px at 1180, as in the mockup. The step row shows only
  while AUTO boils, so it couldn't be seen there without pressing something; Brett's live check covers it.
- Scott has renamed 8012 "EBrews - Simulator" (18 characters). Live and mockup (`?name=EBrews%20-%20Simulator`)
  agree at 1920, 1180, 960, 390 and 360 px: the same size, the same number of lines and the same title bar height.
  One whole line on a monitor; two whole lines, "EBREWS - / SIMULATOR", on a 360 px phone.

## SOUND switches on silently: ready to build (12 Nov)

Scott, 12 Nov, 08:10: "I don't want to hear a sound when I click the "SOUND" box for the timer. ONly when timer
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
    /* a silent one-sample sound, started inside the press. Some browsers, Safari on an iPhone in particular, have let a
       page play sound later only once a sound has started inside a press, not just on resume(). The alarm on SOUND used
       to do that; this does it unheard */
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

My comment above `cmdSnd()` in the mockup quotes Scott, if you want it. The title bar's `ring(2)` (about line 746)
and the run-out timer's `ring()` stay as they are.

In `alarm.js`'s header, "switching SOUND on plays the whole burst, so it is heard as it will be" is no longer true.
Something like: "switching SOUND on is silent (Scott, 12 Nov); Settings' Try plays the sound on purpose."

Not mine, for you or the Settings agent: BREWDAY_ALARM_SOUND's help (`catalog.js:51`) says only "What the brew-day
screen plays when a timer runs out, every 3 seconds until you answer it." A new hop alert, question or error also
plays its first two pulses.

### Moments whose pictures change

None. It's sound only.

### Changed, all in `proposal\`

- `brew-day.js`: `audioOK()` (the silent sound and its comment), `cmdSnd()` (no `ring(2)`; the comment quoting
  Scott), and the comment above `audioOK()` (the mockup plays the Soft ping; the screen plays the Settings choice).

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

- Brett built it the same morning (web UI 9faf75d, build 007e146), live on 8012: `cmdSnd()` and `audioOK()` as above,
  with the comment quoting Scott, and `alarm.js`'s header changed. He also changed the core's description of
  BREWDAY_ALARM_SOUND, which said switching SOUND on plays it (core 3000cbd).
- Checks: identity 451/451, so no picture changes. His alarm sound test went from 22 to 32 checks, all passing: a
  press on SOUND plays nothing and starts the one silent sound; a real warning from CraftBeerPi (the interlock refusing
  a second heating element) plays each of the four sounds' first two pulses; a run-out timer still plays its whole
  burst every 3 s; with TAP TO ALLOW, a press on SOUND or a tap elsewhere is silent and the next warning is heard. The
  build before fails exactly the five silent-press checks. Timers 56/56, brew day 99/99.

## The wort pump after the boil, with the chiller: ready to build (Scott, 12 Nov)

Scott, 12 Nov: "whirlpool / hop-stand step pump symbol shows it going through the HERMS coil. What are some
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
  stirrer, still goes round the hot liquor tank. (The options I showed Scott kept every valve as the sparge left
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
`wpo`, for the options Scott didn't take; the screen needs only the chiller's.

### In `screen.js`

Beside `runoffStep()`:

```js
/* the boil has started (its step running, stopped, failed or done; held for "Ready to boil?" it is still I). From then
   on the wort pump's hoses are on the boil kettle: Scott moves them in that hold, as CraftBeerPi's notification says
   ("The wort pump is off, so you can move its hoses", core 1c08d4c) */
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

(`#ln-swirl` and its two rules are only for an option Scott didn't take.)

### Moments whose pictures change

- **The drawing only, on a monitor and at half of it**, in the nine moments after the boil starts: `#hop`,
  `#boilpower`, `#heatup`, `#boiling`, `#pause`, `#pause-long`, `#hold`, `#keepboil` and `#letfall`. The pump is under
  the boil kettle with its chiller loop, OFF in all of them.
- **New: `#whirlpool`**, the whirlpool hold (`#hold`) with the wort pump running, as Scott whirlpools: the loop lit.
  It's the moment his question was about; a `?demo=whirlpool` for your identity test, if you'd like one.
- **Nothing on a phone** (the phone has no drawing) and nothing before the boil, `#boil-hold` included.

### What it doesn't do

- **The WORT PUMP button stays on the mash tun's panel**, where its HERMS logic is, while the drawing shows the pump
  at the boil kettle. Both say WORT PUMP. Moving the button between panels would be a much bigger change, and Scott
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

Brett built it and put it live on 8012: UI 0cec5eb, build 2f64c39 (main.3af9a77b.js). `rig.js` is the mockup's, with
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

## After the recipe finishes: the pump stays at the boil kettle, ready to build (Scott, 12 Nov)

Brett found this while building the chiller loop. When the recipe's last step finishes, the screen has no recipe
(`liveRecipe` returns null once every step is done), so `boilStarted()` was false and the drawing put the wort pump
back by the mash tun. That is just when Scott chills the wort and sends it to the fermenter, so running the wort pump
lit the HERMS coil again, which is what he asked about this morning.

I asked Scott whether to keep the pump at the boil kettle until he loads or resets a recipe, or switches the mash
tun's AUTO on. He chose: "Yes, keep it at the kettle until then".

### The rule

The wort pump is drawn at the boil kettle while both of these are true:

- **The loaded recipe's boil step has started**: running, stopped, failed or done. CraftBeerPi keeps a finished
  recipe's steps, all done, until a recipe is loaded, reset or cleared (`StepController`: `load_recipe`, `reset_all`,
  `clear`). Then the boil step is waiting again, or there are no steps. It's CraftBeerPi's own state, so every screen
  agrees and a reload changes nothing.
- **The mash tun's AUTO is off.** While it's on, its HERMS runs the wort pump through the coil, which only makes sense
  with the hoses back on the mash tun. `#notarget` is that case, from Scott's test on 8012 on 10 Nov: the recipe had
  finished and he held the mash tun's AUTO. Its drawing shows recirculating, as now.

Otherwise the pump is drawn by the mash tun, as before.

What Scott accepted, which I told him before he chose: if he later brews by hand without loading or resetting a recipe,
and runs the wort pump himself with the mash tun in MANUAL, the drawing still shows the pump at the boil kettle. The
same goes for pumping cleaner through the HERMS coil after a brew. The mash tun's AUTO covers the usual case, mashing.

### In `screen.js`

`boilStarted()` no longer needs a recipe running. Live, `M.RECIPE.steps` keeps CraftBeerPi's statuses
(`stepModel`'s `status`) after the recipe finishes, so the boil step reads D:

```js
/* the boil has started (its step running, stopped, failed or done; held for "Ready to boil?" it is still I). From then
   on the wort pump's hoses are on the boil kettle: Scott moves them in that hold, as CraftBeerPi's notification says
   ("The wort pump is off, so you can move its hoses", core 1c08d4c). After the recipe finishes its steps are all D, so
   the hoses stay there for the chill and the transfer, until a recipe is loaded or reset and its boil is I again
   (Scott, 12 Nov) */
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
     coil, so the hoses are back on the mash tun (#notarget; Scott, 12 Nov: until a recipe is loaded or reset, or the
     mash tun's AUTO is on) */
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
  17:41:30. The stand ended at 17:28:10 and switched the boil kettle off, Scott answered Brewing Complete, and the wort
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

## A question's line turns "answered": ready to build (12 Nov, afternoon)

Brett ran `#finished` against the live screen (UI cf501e6) and found two differences:

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
/* a question's line says "waiting for you", in Prompt Amber, only while CraftBeerPi waits for its answer. Once the
   question goes, the same line says what became of it, in the plain colour, and keeps the time it was asked (the
   design, 12 Nov: amber in the log always means something still needs you). False if this tab has no line for it */
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
   takes it down as "withdrawn" when the boil starts that way, so the screen counts it as answered (the design, 12 Nov) */
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

### Lines in my words that aren't questions, for one later pass

These differ from what the screen as built logs, as far as I can tell from the code. They aren't questions, so this
change doesn't touch them, and none of them is false. I'd rather align them all at once, from the live log, than one
by one from the code:

- After Sparge started, the mockup's "HLT AUTO off, so its element won't run as the HLT empties", by recipe. Live logs
  CraftBeerPi's notice: "Sparge: The HLT's AUTO is off now, so its element won't run as the HLT empties. Sparge timer
  started. Estimated completion: 15:45", from CraftBeerPi.
- The boil's start: the mockup's "Boil started, boil kettle AUTO"; live, "Boil started, boil kettle target 210.2 °F".

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

### Moments whose pictures change

- **None of the old ones.**
- **New: `#finished`.** On a monitor and at half of it, the drawing shows the pump at the boil kettle, RUNNING, with
  the loop lit through the chiller. The recipe column is "No recipe running" with the Recipe Book, as live. A phone has
  no drawing.

### What it still doesn't do

- **The transfer to the fermenter** isn't drawn: the loop goes back into the kettle's top. CraftBeerPi can't see where
  the hose goes.
- **An old finished recipe left loaded** keeps the pump at the boil kettle until a recipe is loaded or reset, or the
  mash tun's AUTO comes on. Scott accepted this (above).

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

## Open questions about the drawing

Both were answered by Scott on 10 Nov. The valves have been in the drawing since then; the path after the boil was
designed on 12 Nov, once he asked about it (above):

- Valves or hoses: he moves hoses between ports on quick-disconnects, but wants the drawing to keep the
  valves: "I like the valve representation - it is professional looking process control".
- After the boil: the wort pump does not run during the boil. Once the boil is over it runs the boil kettle
  round through the chiller and back into the kettle (an optional whirlpool), and then sends the wort through
  the chiller to the fermenter. Until the drawing has that path, running the wort pump then still shows wort
  going round the HERMS coil into the mash tun, which is wrong. Answered on 12 Nov: see "The wort pump after the
  boil, with the chiller" above.

## Temperature graphs: Scott chose option A on 10 Nov, to be built

Scott asked (9 Nov): "Can you mock up a way to add temperature graphs to the dashboard? It should be natural
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
- `graphs.html` is the comparison Scott chose from: A, B and the screen without graphs, on a full-screen
  monitor, a browser window on that monitor and a phone. B (`?graphs=panel`) is kept only for that record:
  don't port `renderGraphPanel`, `.gpanel`, `.ghead`, `.gcol`, `.gwin` or `.gview`.
- The code is `graphs.js`, hooks in `brew-day.js` (search for `GRAPHS` and `graph`), the label scale `rs` in
  `rig.js`, and the block at the end of `brew-day.css`. With `?graphs=none` the page matches the screen as
  built pixel for pixel: checked against `design\brewday` in all six moments at 1920×1080, 1440×900 and
  390×844, 18 of 18 identical.

What it is:

- One graph per vessel, in its PID window under the PV and SV, with its own temperature scale. The three
  are never put on one shared plot, which Scott turned down. Red line for PV, green step line for SV, orange
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
| Step tags, and where DAY starts | Server, optional | CraftBeerPi doesn't keep the time each step started. The screen can tag the steps it saw start while it was open. To keep them after a reload, and to start DAY when the recipe started, the server would have to keep the start times. BrewScribe may already record them, so ask Scott and Porter before adding a second record. Until then DAY can show the last 8 hours. |
| The drawing's labels set larger when it is shorter | React UI | `rigSVG(style, W, rs)` and `rigPump(…, rs)` in `rig.js`; `drawRig` in `brew-day.js` works out `rs` (at most 1.3). With `rs` = 1 the drawing is unchanged. |

The graphs show the brew day so far only to help Scott run it. They don't save anything; recording the brew
day stays BrewScribe's job.
