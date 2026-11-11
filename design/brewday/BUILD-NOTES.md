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
  4.7.7.post35); `#sparge` keeps the old MashStep sparge that recipes already in the book still have. Add
  `&timers=new` for the timers Scott approved on 11 Nov (`#timers`, `#timer-done`, `#timer-new`, `#timer-names`,
  `#timer-nonames`, `#timers-hand`, `#sound-allow`), not built yet.
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
| Rest timer when brewing by hand: one timer, shared by every screen | Server and React UI | Scott chose this on 9 Nov. The server keeps the time left and whether it is running; START TIMER, PAUSE TIMER and ±5 MIN are commands to it, and every open screen shows the same countdown. At zero the server raises a CraftBeerPi notification, which shows on every screen and stays until answered, as hop alerts have since the S2 fix. |
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
- After SET the button says "sending…", then the button, the lamp ("HEATING 40 %") and OUT all show the new
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
| Beside the element | BOIL POWER 45 % / POWER 100 % in MANUAL | −5 % · turn down and +5 % · turn up, while AUTO runs: one tap sends `set_boil_power` at once. Not in MANUAL, during a hold, or while the editor is open |
| In the power editor | −5 −1 [45] +1 +5, SET, CANCEL | The same, plus BOIL AT 210.2 °F · full power until then · change (the kettle's target, 190-212 °F; above 212 °F it refuses with a note), and USUAL 45 % · starts each recipe · set in Hardware |
| In MANUAL | The power button sets the element's level by hand | The power button still sets Boil_Power ("kept for the boil in AUTO"); no level by hand |
| Graph | The threshold as a solid green line | The threshold dashed grey; a hold solid green; OUT drops to 0 while paused |

How it behaves:
- −5 % and +5 %: "sending…" under the button while waiting. A tap that would pass 0 or 100 % stops there
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
| Controls, AUTO | −5 % · HEATING · +5 % | HEATING, or OFF while it rests, alone; a tap pauses here too |
| Beside AUTO/MANUAL | TARGET · change | TARGET · change |

In MANUAL the line says "MANUAL · element by hand", there are no −5 % and +5 %, and the readout follows the
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
  note. After SET in its box: "sending…" in place of "change" (not for −5 % and +5 %, which say "sending…"
  under themselves).
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

## Timers: approved by Scott on 11 Nov, ready to build

Scott, 10 Nov, after using the rest timer: "why is it named that? lots of things use a timer during a brew day. I
want an optionally audible alarm and more attention grabbing but still elegant visual alerting when timer expires.
Also want to have multiple timers in parallel if I click a + or something like that. Nice to have= ability to name
timers". Asked whether the sound should cover only his timers, he chose "my timers and CraftBeerPi's alerts".

Scott, 11 Nov: "add the timers that design agent discussed. Those default names are fine as long as they're easily
changed on brew day. I'd like to have an easy config setting to choose the default timer names from the setup if
that's easy enough too". Brett is building it, server first (`cbpi\controller\timers_controller.py`,
`cbpi\http_endpoints\http_timers.py`). The names setting is the next section but one.

The mockup is `brew-day.html?timers=new`, moments `#timers`, `#timer-done`, `#timer-new`, `#timer-names`,
`#timer-nonames`, `#timers-hand` and `#sound-allow`; without `&timers=new` the same moments show the screen as built.
It is modelled on a
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
  time large on the right, and one button: START, PAUSE, or START "carry on". A 4 px bar along the row's bottom
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
    the time left at once, on every screen."), then REMOVE and DONE. Removing a timer that has time left asks once,
    in place, as NEXT STEP does: "Remove Stir? It has 8:02 left." REMOVE IT / KEEP IT.
  - Enter in a box presses the main button; Escape closes the editor.
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
  hears what it sounds like. It is kept in the browser (localStorage), not in CraftBeerPi, so the phone can be quiet
  while the monitor beeps.
- **A browser plays sound only after a tap on the page.** After a reload with SOUND on, the switch says "SOUND · TAP
  TO ALLOW" in amber, its box unlit amber, until the first tap anywhere, which unlocks it (`#sound-allow`).
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
- The list of names comes as `names`, in `GET /timers` and in every "timers" message.

### What the server still needs

1. **A blank setting must give no names.** `config.get()` returns the default for a blank value
   (`config_controller.py`, lines 46 to 55). So `TimersController.names()` gets `None` for a blank setting and
   offers the three default names, and ConfigUpdate (`ConfigUpdate\__init__.py`, lines 82 and 1057) sees `None` and
   adds the setting again with "Hop stand, Yeast, Vorlauf" at the next start: a restart undoes Scott's blank. Both
   can look in the cache instead:

   ```python
   # TimersController.names()
   entry = self.cbpi.config.cache.get(self.NAMES_SETTING)
   raw = self.NAMES_DEFAULT if entry is None or entry.value is None else entry.value

   # ConfigUpdate
   if "BREWDAY_TIMER_NAMES" not in self.cbpi.config.cache:
   ```

2. **A saved list has to reach the screens already open.** The "timers" message goes out only when a timer
   changes. Saving a setting sends "configupdate" with the whole configuration (`push_update()`); on that message
   the screen can fetch `GET /timers` again. Or the server can send the timers message when this setting changes.
   Your call.
3. **Optional: one name per timer on the server too.** The screen refuses a name another timer has, but two screens
   adding "Yeast" at the same moment, or a call to the API, could still make two. `_name()` could refuse it with the
   screen's words, comparing with `casefold()`. If it does, `_default_name()` should compare the same way, as the
   mockup's `tDefaultName()` does.
4. **Optional: a wider box on the Settings page.** Text settings use MUI's default `TextField` (about 180 px wide),
   so most of a six-name list is out of view while he types it. `fullWidth`, for this setting or all text
   settings, would help.

### What the web UI needs

- Everything above. The 4 px bar, the editor's legend title, the shrunken rows and the names' wrapping are new
  CSS; the rest reuses the screen's buttons, editor input, confirm box and KEEP BOILING's box.
- **Identity tests:** run `#timer-done` with reduced motion, or the pulse differs from frame to frame. The new
  moments are `#timer-names` and `#timer-nonames`; `#timer-new` changed (YEAST greyed, no step list, no + TIMER
  while an existing timer is edited).

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

## Open questions about the drawing

Both were answered by Scott on 10 Nov; the drawing hasn't been changed for them yet, and the change will come
to Brett separately, after boil power:

- Valves or hoses: he moves hoses between ports on quick-disconnects, but wants the drawing to keep the
  valves: "I like the valve representation - it is professional looking process control".
- After the boil: the wort pump does not run during the boil. Once the boil is over it runs the boil kettle
  round through the chiller and back into the kettle (an optional whirlpool), and then sends the wort through
  the chiller to the fermenter. Until the drawing has that path, running the wort pump then still shows wort
  going round the HERMS coil into the mash tun, which is wrong.

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
