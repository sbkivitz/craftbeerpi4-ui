# Hardware, arranged by vessel

A proposal for CraftBeerPi's Hardware page, made the way Settings was: Brew Day's title bar and tabs, a list down the left, plain names first with CraftBeerPi's own names underneath in small type. Nothing is built yet. This is for you to approve or change before I make the mockup.

## What you told me (16 Nov)

- You use the page now and then, at the desk, to add or change a kettle, probe or switch.
- Switches stay one tap for everything, on and off, as today.
- Fermenters: a plain link at the end to today's fermenter list, unchanged.

## How it's arranged

The page follows your brewhouse in the order the water goes: **HLT, then the mash tun, then the boil kettle.** Each vessel's group holds everything that makes that vessel work:

- its **kettle**: CraftBeerPi's controller for the vessel, which says what AUTO runs (CraftBeerPi calls it the logic) and holds that control's settings;
- its **probe** (CraftBeerPi: sensor);
- its **heating element** and its **pump** (CraftBeerPi: heater and agitator). Both are switches (CraftBeerPi: actors).

After the vessels comes **Not in a kettle**: every probe and switch that no kettle uses. Last, **Fermenters**: a link to today's list.

### Your simulator (8012), arranged this way

| Group | What's in it |
|---|---|
| 1 HLT | kettle HLT (AUTO runs PIDBoil) · probe HLT Temp · heating element HLT Heater · pump HLT Pump |
| 2 Mash tun | kettle Mash Tun (AUTO runs PID_HERMS) · probe Mash Temp · pump Mash Pump · it also uses the HLT's element, which heats the mash through the coil, and the HLT's probe |
| 3 Boil kettle | kettle Boil Kettle (AUTO runs BoilPower) · probe Boil Temp · heating element Boil Heater · no pump |
| 4 Not in a kettle | Glycol Pump |
| Fermenters | a link to today's list (empty on the simulator) |

### On the rig

From the rig's own records (a read-only check on 8 Oct, and the kettle records of 10 Oct), there are four switches, and each sits with its vessel:
- BK_HEAT (GPIO 5) heats the boil kettle.
- HLT_HEAT (GPIO 6) heats the HLT. The Mash Tun uses it too, through the HERMS coil.
- Recirc_PUMP (GPIO 7) is the HLT's pump.
- Wort PUMP (GPIO 8) is the Mash Tun's pump.

Both elements are PWM switches. The probes are Temp_HLT, Temp_Mash and BK. Nothing is left over, so "Not in a kettle" says none. No two switches share a pin, so the page shows no pin warning on the rig. The warning stays as a guard: it appears beside a switch's GPIO pin when the pin chosen is already another switch's.

### The rules behind it

- **Order:** the kettle chosen as Mash tun in Settings, then the one chosen as Boil kettle. Any other kettle comes before them, which puts the HLT first. If Settings hasn't chosen them, kettles go in name order.
- **Shared parts:** a probe or switch that two kettles use sits with the first one in that order. The other kettle shows a line that points to it: "Heating element: HLT Heater, with the HLT. It heats the mash through the coil." with a button, GO TO HLT. On the simulator that's the HLT's element and the HLT's probe, which the mash tun's PID_HERMS also uses.
- **Settings that point at a part** (PID_HERMS's HLT probe, say) don't move it. They show as a line in that kettle, with the same button.

## What the page looks like

**On a monitor**

- **The title bar, last event and tabs** are Brew Day's own, with HARDWARE lit, as on Settings.
- **Left:** the list. The four groups are numbered, as in Settings, and under each are its kettle, probe, element and pump, each with its live state: the probe's reading, ON or OFF. A switch's GPIO pin sits beside its ON/OFF control at the right end of its line (where the list is narrower, as on a laptop or a phone, on the line under its name), and the control is one tap, as today. A probe's line also gives its type, address and Sensor ID, as today's table does. FIND HARDWARE and + ADD are at the top.
- **Right, as the page opens:** your brewhouse drawing, the same one Brew Day shows. Each probe, element and pump is labelled with the name CraftBeerPi knows it by, how it's wired (a switch's GPIO pin, a probe's OneWire address) and its live state, such as "Recirc_PUMP · GPIO 7 · OFF" on the rig. Tap a part, or its line in the list, and its settings open.
- **Right, with something open:** its settings as rows, as in Settings: the plain name, a line on what it does, CraftBeerPi's own name underneath in small type, and the control on the right. A small copy of the drawing at the top shows where that part is, lit, and takes you back to the whole drawing.

**Between a phone and a monitor** (701 to 1179 px wide), added after the first look: the list is one column and the page scrolls. FIND, + ADD, UNDO and SAVE stay at the top of the window and the drawing stays docked at the bottom, so the list, or the item open, scrolls between them. Pointing at a line lights its part in the drawing; tapping a part opens it.

**On a phone:** the list first. Tap something and it opens on its own page, with "‹ All hardware" at the top. There's no drawing, as on Brew Day.

**Everywhere:** names and probe addresses are shown whole, never cut short with "…".

## How it behaves

- **FIND HARDWARE** narrows the list to what matches: names, kinds, GPIO pins, probe addresses, plain names and keys of every setting. A match inside a kettle's settings shows under that kettle as a small line ("HLT P gain 65.0442"), so searching "P gain" lines up every kettle's gains.
- **One SAVE, as in Settings.** A changed setting turns blue and says what it was, with its own UNDO. Changes can wait in more than one item; each changed item is marked in the list. SAVE sends them all, and each item then says "Saved 14:32" or, in red, "Didn't save" with TRY AGAIN.
- **What saving does is said beside SAVE.** CraftBeerPi switches a kettle's AUTO off when its settings are saved, and leaves it off. It also switches a switch off when it's saved. Today's form says neither. The new page says, for example: "Saving the HLT switches its AUTO off. Switch it on again on Brew Day."
- **Delete** is the last thing in an item's settings, apart from the rest. It asks first, on the page, naming the item and what uses it: "Delete the probe HLT Temp? The HLT uses it as its probe, and the Mash tun's PID_HERMS as its HLT probe. They'll have none until you choose another." The answers are DELETE HLT TEMP and KEEP IT, with no default. It isn't offered while a kettle that uses the item has AUTO on. Today's question is "Do you want to delete the Sensor", without saying which one or what uses it.
- **+ ADD** offers a kettle, a probe or a switch. A new probe or switch starts in Not in a kettle and moves into a vessel's group once that kettle uses it. A new kettle becomes a group of its own.
- **A kettle's settings file** (save to a file, load one back with the changes shown first) works as it does today. It sits under the kettle's heading, and its preview opens on the page in Brew Day's look. Each kettle's line in the list also has FILE, which saves its file in one tap, as today's kettle table does (added after the second look).
- **Links to an item still work:** opening `#/kettle/<id>`, `#/sensor/<id>` or `#/actor/<id>` opens the Hardware page with that item's settings, and SAVE waits until CraftBeerPi has sent the item, as today.
- **Leaving with unsaved changes** brings up a note on the page: SAVE AND GO, GO WITHOUT SAVING, or STAY.

## The names

The rows follow Settings: the plain name first, one line on what it does, CraftBeerPi's own name underneath. The kettle's own rows are the same for every kettle:

| Plain name | CraftBeerPi | What it says |
|---|---|---|
| Name | name | |
| AUTO control | logic | What runs while the kettle's AUTO is on. |
| Probe | sensor | The probe AUTO reads. |
| Heating element | heater | The switch AUTO heats with. |
| Pump | agitator | The pump or stirrer AUTO runs. |

A control's own settings are grouped by what they do. These are the controls and parts on your simulator and the rig; a plugin this page doesn't know keeps its own names and descriptions, as in Settings.

**PIDBoil** (the HLT)

| Plain name | Key | What it does |
|---|---|---|
| P gain | P | Power for each degree below the target. |
| I gain | I | Adds power while the water stays below the target. |
| D gain | D | Takes power off while the temperature climbs. |
| Most power | Max_Output | The highest power below the boil threshold. |
| Boil threshold | Boil_Threshold | From here on the power drops to Power at the boil. |
| Power at the boil | Max_Boil_Output | The power from the boil threshold on. |
| Stalled-boil minutes | Boil_Plateau_Minutes | Counts a temperature stuck at full power as a boil after this many minutes. 0 turns it off. |
| Control interval | SampleTime | Seconds between power decisions: 2 or 5. |

**PID_HERMS** (the mash tun)

| Plain name | Key | What it does |
|---|---|---|
| *Mash loop: sets the HLT's target* | | |
| HLT lead | DeltaTemp | How far above the mash target the HLT may go while the mash needs heat. |
| HLT lead at mash-in | MashIn_DeltaTemp | The same before the grain goes in. Blank uses HLT lead. |
| Mash P gain | P | Degrees of HLT lead for each degree the mash is short. Not element power. |
| Mash I gain | I | Adds lead while the mash stays short. |
| Mash D gain | D | 0 is a good start: the HLT loop already damps it. |
| *HLT loop: holds the HLT where the mash loop asks* | | |
| HLT probe | HLT_Sensor | The HLT's probe. |
| HLT P gain | HLT_P | Element power for each degree the HLT is short. |
| HLT I gain | HLT_I | Adds power while the HLT stays short. |
| HLT D gain | HLT_D | Takes power off while the HLT climbs. |
| HLT kettle | HLT_Kettle | Shows on the HLT the target this sets. Blank finds it from the HLT probe. |
| *Pump* | | |
| Mash-in pump start | MashIn_Pump_Within | At mash-in, starts the pump once the HLT is this close to the target. Blank starts it at once. |
| Rest the pump | Pump_Rest | Yes rests it now and then during the mash. No runs it all the time. |
| Pump rest every | Rest_Interval | Seconds between rests. |
| Pump rest for | Rest_Time | Seconds each rest lasts. |
| Pump stops at | Max_Pump_Temp | The pump stops when the mash reaches this, with a notice. |
| *Limits* | | |
| Most power | Max_Output | The highest element power. |
| PID stops at | Max_PID_Temp | From this mash temperature the element runs at Most power, with a notice. |
| Boil limit | Max_Boil_Temp | From this temperature the power drops to Power at the boil limit. |
| Power at the boil limit | Max_Boil_Output | The power from the boil limit on. |
| *Safety and timing* | | |
| Frozen reading after | Sensor_Stale_Seconds | Heating stops when a probe repeats the same reading for this long. |
| Control interval | SampleTime | Seconds between power decisions: 2 or 5. |

**BoilPower** (the boil kettle)

| Plain name | Key | What it does |
|---|---|---|
| *Boil* | | |
| Boil threshold | Boil_Threshold | Full power below it, Boil power from it. Set it where your wort boils. |
| Boil power | Boil_Power | Element power while boiling. Brew Day changes it during the boil. |
| Usual boil power | Usual_Boil_Power | The boil power each recipe starts at. Blank leaves it as you left it. |
| Keep boiling | Keep_Boiling | Yes brings back full power if the wort falls 3.6 °F below the boil. |
| Most power | Max_Output | Power while heating up, and the most a hold may use. |
| *Holding below the boil: whirlpool, hop stand* | | |
| Hold P gain | P | Power for each degree below the hold's target. Blank uses 14 a degree. |
| Hold I gain | I | Adds power while the wort stays below. Blank uses 0.03. |
| Hold D gain | D | Takes power off while the wort climbs. Blank uses 900; 0 turns it off. |
| Control interval | SampleTime | Seconds between power decisions: 2 or 5. |

**Hysteresis**

| Plain name | Key | What it does |
|---|---|---|
| On when below by | OffsetOn | Heats once the temperature is this far below the target. |
| Off when below by | OffsetOff | Stops heating once it's only this far below the target. |

**OneWire probes** (the rig)

| Plain name | Key | What it does |
|---|---|---|
| Probe address | Sensor | Which probe on the OneWire wire (28-…). |
| Offset | offset | Added to every reading, to correct the probe. |
| Read every | Interval | Seconds between readings: 1, 5, 10, 30 or 60. |
| Kettle | Kettle | Logs less often while this kettle's AUTO is off. |
| Idle logging every | ReducedLogging | Seconds between log lines while that kettle is off. 0 logs every reading. |
| Warning range | TempRange | The dashboard colours the reading this far from the target. 0 turns it off. |
| Fermenter | Fermenter | Left as it is: fermenter work is paused. |

**GPIO switches** (the rig)

| Plain name | Key | What it does |
|---|---|---|
| GPIO pin | GPIO | The Pi pin it switches. |
| Inverted | Inverted | Yes: on when the pin is low. |
| Power interval | SamplingTime | Seconds over which a part power is spread: 2 or 5. |
| PWM frequency | Frequency | Pulses a second. Keep it well under 1 for an element on an SSR. |

**SimVessel probes** (the simulator only), under a heading "Simulation": Contents (Volume, litres), Element (Heater), Element power (Heater_Watts), Coil partner (Coupled_Sensor), Coil transfer (Coupling_UA), Coil pump (Coupling_Pump), Coil transfer, pump off (Idle_Coupling_Fraction), Heat loss (Loss_UA), Room temperature (Ambient), Start temperature (Start_Temp), Grain (Grain_Kg), Grain temperature (Grain_Temp), Boils at (Boiling_Point), Probe lag (Sensor_Lag), Element lag (Heater_Lag), Vessel mass (Vessel_Mass_Kg), Hose heat loss (Hose_Loss_UA).

Each setting's full note from its plugin stays one tap away (MORE under its line), because some carry tuning advice, such as MashIn_DeltaTemp's measured heat-up times.

## What each part needs to be built

"Web page" means only Brett's web page changes: no CraftBeerPi server, plugin or rig update beyond the usual web page update.

| Part | Needs |
|---|---|
| The arrangement by vessel, the names and the catalogue of plain names | Web page (in the page's own catalogue, like Settings' catalog.js) |
| The brewhouse drawing with labels | Web page (Brew Day's rig.js, with a labelled mode) |
| FIND, one SAVE with UNDO, the leave note | Web page |
| What saving does, beside SAVE | Web page (what CraftBeerPi does today) |
| Delete naming what uses the item | Web page (from the kettles' links and settings) |
| Two switches on one GPIO pin | Web page (from the switches' settings) |
| Links to `#/kettle/<id>` and the rest | Web page; Brett's two bench tests change their selectors, not what they check |
| Phone layout | Web page |

## For you to decide

1. The arrangement: by vessel, as above.
2. The brewhouse drawing as the way into the page on a monitor, beside the list.
3. The plain names.
