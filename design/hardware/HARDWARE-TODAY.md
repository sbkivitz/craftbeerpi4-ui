# Hardware: today's page, item by item, and where each is in the new design

This checks that the new Hardware page keeps everything the brewer has today. It doesn't change the design. Today's page was read on the simulator at 8012 (UI main 283b056) without pressing anything: the Hardware page itself, every kettle, probe and switch form opened by its own link, and the forms for a new kettle, probe and switch.

"Taps" counts presses from the Hardware page. "Seen" means it's on screen without pressing anything.

## The Hardware page: the four tables

### Kettles

| Today | In the new design | Taps |
|---|---|---|
| Name | The kettle's line: its name, numbered in brewhouse order | Seen, as today |
| Logic | The kettle's line: "AUTO runs PID_HERMS" | Seen, as today |
| Heater | The ELEMENT line under the kettle, with its name, kind and GPIO pin | Seen, as today |
| Agitator | The PUMP line under the kettle, the same | Seen, as today |
| Agitator "Actor not Found" (none chosen, or one that's gone) | A dashed PUMP line: "None chosen", or "Not found" with the id | Seen, as today |
| Sensor (it shows the probe's reading, 68.0) | The PROBE line under the kettle: its name and its reading | Seen, as today |
| Target Temp | The kettle's line: "target 152.0 °F", or "no target" | Seen, as today |
| Eye: opens the kettle's form | The whole line opens the kettle's page | 1, as today |
| Bin: "Do you want to delete", Delete | In the kettle's page: DELETE…, then DELETE MASH TUN. The question says what stays and what else changes. | 3, one more than today |
| Download: saves the kettle to a file | FILE, on the kettle's line | 1, as today |
| + : a new kettle | + ADD, then Kettle | 2, one more than today |

### Fermenters

| Today | In the new design | Taps |
|---|---|---|
| The fermenter table, with its + | "Fermenters", a link at the end of the list to today's fermenter page, unchanged | 1 more to reach it |

Fermenter work is paused, so the brewer chose to leave fermenters as they are, behind a plain link.

### Sensors (probes)

| Today | In the new design | Taps |
|---|---|---|
| Name | The probe's line | Seen, as today |
| Type | The probe's line, second line: "OneWire" or "SimVessel" | Seen, as today |
| OneWire ID | The probe's line, second line: the whole address, "28-0316a2794bff" | Seen, as today |
| Sensor ID | The probe's line, third line: "Sensor ID afft72Vaoj33KfkXVqyiD8" | Seen, as today |
| Value | The probe's line: its reading, in red as on Brew Day | Seen, as today |
| Eye, Bin, + | As for kettles: the line opens it; DELETE… in its page; + ADD, then Probe | 1; 3; 2 |

A probe sits under the kettle that uses it. A probe no kettle uses is under "Not in a kettle", at the end.

### Actors (switches)

| Today | In the new design | Taps |
|---|---|---|
| Name | The switch's line: ELEMENT, PUMP or SWITCH, and its name | Seen, as today |
| Type | The switch's line, second line: "GPIOActor" | Seen, as today |
| GPIO | The switch's line: "GPIO 7" in a box of its own, or "no pin". On a phone it's on the second line: "GPIOActor · GPIO 7". | Seen, as today |
| State: the on/off switch | ON/OFF button on the line, one tap, lit orange for an element, green for a pump | 1, as today |
| Eye, Bin, + | As for kettles: the line opens it; DELETE… in its page; + ADD, then Switch | 1; 3; 2 |

### On a phone

Today the tables are wider than a phone, so the columns after Heater are off the screen. The new page shows every line whole on a phone, with each switch's pin and each probe's address and Sensor ID.

## A kettle's form ("Kettle Config")

| Today | In the new design | Taps |
|---|---|---|
| "Kettle / Mash Tun": back to the Hardware page | On a monitor the list stays beside the kettle. On a phone or tablet, ‹ ALL HARDWARE at the top. | 0 on a monitor; 1 elsewhere, as today |
| Name * (needed) | The first row, Name. Saved empty, it says "Needs a name". | As today |
| Logic: ---, BoilPower, Hysteresis, PIDBoil, PID_HERMS | The second row, AUTO control: None, BoilPower, Hysteresis, PIDBoil, PID_HERMS, with a line on what the chosen one does. The top of the kettle's page also says "AUTO runs PID_HERMS". | In view when the kettle opens, on a monitor, a tablet and a 390 px phone; a short scroll on a smaller phone |
| Changing the logic shows that logic's settings, and each logic keeps its own | The same. A logic chosen again gets back the settings it had, as today. | As today |
| Heater, Agitator, Sensor | The next three rows: Heating element, Pump, Probe, with the probe's reading under it | As today |
| Settings file: SAVE TO FILE…, LOAD FROM FILE… with the changes shown first | The same group, under those rows. The preview now also says what loading leaves empty (see below). | As today |
| The logic's settings, each labelled by its key (P, HLT_P, Max_Boil_Temp) with the plugin's note under it | Each setting as a row: a plain name ("Mash P gain"), a one-line note, the key underneath, and the box. The plugin's whole note is under MORE. A setting the page doesn't know keeps the plugin's own name and note. | Seen; the plugin's whole note takes 1 tap (MORE) |
| A setting that picks a probe or kettle (HLT_Sensor, HLT_Kettle) | The same, as a menu of names | As today |
| A setting with choices (SampleTime, Pump_Rest) | Two to four short choices as a row of buttons; more as a menu | As today |
| A link to something that's gone ("Saved as …, which the picker cannot show") | The menu shows "An unknown one (…)" | As today |
| A setting a plugin hides until another has a given value | Hidden the same way | As today |
| An empty setting: an empty box | An empty box, and under it what the control uses: "Empty: PIDBoil uses 100 %", or "Empty: uses HLT lead" | New |
| CANCEL: leaves without saving | UNDO puts every change back; a row's own UNDO puts back that row. Leaving with changes asks first. | 1, as today |
| SAVE: saves, and goes back to the Hardware page | SAVE saves, and says so on each row. If a kettle has empty settings its control fills with built-in values, SAVE asks first (see below). | 1, or 2 when it asks |

## A probe's form ("Sensor Config")

| Today | In the new design | Taps |
|---|---|---|
| "Sensor / HLT Temp" | As for kettles | As today |
| Name * | Name | As today |
| Type: ---, AlarmTimer, CustomSensor, DummyPressure, HTTPSensor, OneWire, SimVessel | Kind of probe: None, then the same six. The top of the probe's page says its address: "PROBE · 28-0316a2794bff". | In view when it opens, as for kettles |
| The type's settings: OneWire's address, offset, Interval, Kettle, ReducedLogging, TempRange, Fermenter; SimVessel's 17 | Each as a row with a plain name, its key underneath, and the plugin's note under MORE | As today |
| CANCEL, SAVE | UNDO, SAVE | As today |

## A switch's form ("Actor Config")

| Today | In the new design | Taps |
|---|---|---|
| "Actor / HLT Pump" | As for kettles | As today |
| Name * | Name | As today |
| Type: ---, BoilStatusActor, DummyActor, GPIOActor, GPIOPWMActor, MashStatusActor, StepStatusActor, WhirlpoolStatusActor | Kind of switch: None, then the same seven | In view when it opens, as for kettles |
| GPIOActor's GPIO, Inverted, SamplingTime; GPIOPWMActor's GPIO, Frequency, Inverted | Rows: GPIO pin, Inverted (YES/NO), Power interval (2/5), PWM frequency. The GPIO pin is the first setting after the kind, and the top of the switch's page says it: "ELEMENT · GPIO 6". | The pin is seen at the top on every screen. Its row is in view on a monitor and a tablet; a short scroll on a phone |
| StepStatusActor's settings that show only for some choices | Shown and hidden the same way | As today |
| CANCEL, SAVE | UNDO, SAVE | As today |

## What takes more taps, and why

- **Deleting: 3 taps instead of 2.** Today a bin sits on every line, next to the eye; the new page has it at the end of the item's own page. Deleting is rare, and the question then names what uses the item: "Delete the probe HLT Temp? It's used by the HLT as its probe, the Mash Tun as its PID_HERMS's HLT probe and the Mash Temp as its coil partner." Each line could get a bin instead, if the brewer would rather.
- **Adding: 2 taps instead of 1.** The list is arranged by vessel, not by kind, so + ADD asks which kind.
- **A plugin's whole note: 1 tap (MORE).** Today every note is printed under its box, some of them ten lines long. Now each setting has one line in plain words, and the plugin's note is under MORE.
- **Fermenters: 1 tap more**, behind the link, as chosen.
- **SAVE asks first when a kettle has empty settings** that its control fills with built-in values: FILL IN AND SAVE, SAVE WITH THEM EMPTY, or BACK. That one is new, by request.

Nothing else takes more taps, and nothing today's page shows is gone.

## Empty settings, before SAVE and before LOAD

- An empty setting shows as empty, and the line under it says what its control uses instead: "Empty: PIDBoil uses 100 %". Four settings mean something when empty, and are never filled in: HLT lead at mash-in (uses HLT lead), Mash-in pump start (pumps from the start), HLT kettle (found from the HLT probe) and Usual boil power (boil power stays as you left it).
- Before SAVE, when any kettle being saved has empty settings with built-in values, a note at the top names each one with its value: "5 settings are empty. Left empty, each uses its control's built-in value: HLT (PIDBoil): Most power 100 %, Boil threshold 208 °F, Power at the boil 85 %, Stalled-boil minutes 3 min, Control interval 5 s". The answers are FILL IN AND SAVE, SAVE WITH THEM EMPTY and BACK, with none chosen for you.
- In a settings file's preview, "Empty settings" names what loading would leave empty, with each built-in value. FILL IN THESE VALUES shows them in the table as changes, marked "PID_HERMS's built-in value", before anything is loaded; LEAVE THEM EMPTY takes them out again. LOAD then saves what the table shows.

## New on the page, not on today's

The brewhouse drawing, lit as a line is pointed at; FIND HARDWARE; one SAVE for changes to several items; what saving will switch off, said before SAVE; a warning when a GPIO pin is already another switch's; a save that fails says so, and TRY AGAIN; leaving with changes asks first; a link that opens before its item arrives can't save over it.
