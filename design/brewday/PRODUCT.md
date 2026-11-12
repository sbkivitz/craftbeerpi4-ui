# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Scott, a homebrewer and firmware engineer who runs his own fork of CraftBeerPi 4 on his own rig. He is the only operator. On brew day he works at the rig in his garage, hands-on and often with wet hands, moving between vessels and glancing at the screen from a distance rather than sitting at it.

## Product Purpose

CraftBeerPi 4 runs Scott's electric 3-vessel HERMS (hot liquor tank, mash tun, boil kettle) from a Raspberry Pi. It reads the temperature probes, drives the heating elements and the pump through kettle logic, and can run a recipe's brew steps. The dashboard is the screen he runs the brew from: he watches each vessel's actual and target temperature and what is switched on, and changes targets, heaters, the pump and steps.

Success on a brew day: he always knows what is happening and what comes next, and nothing switches on or off that he did not intend.

## Positioning

The dashboard drives real hardware, kilowatt heating elements and two pumps in a hot, wet garage; it is not a monitoring page. It also reflects one particular rig. In a HERMS the mash is heated indirectly: the HLT element heats the hot liquor and the wort pump recirculates wort through a coil in the HLT, so the HLT and the mash tun share one element. A generic dashboard template cannot know that; this one has to show it.

## Operating Context

- Main screen: a desktop monitor in the garage near the rig, worked with a mouse and keyboard. It has to be readable from across the garage at a glance.
- Light: the garage is lit by overhead lights with the door mostly closed when he brews.
- Phone: Scott may use his phone at times in the future. If he does, it must be able to do everything the desktop can, including switching heaters and the pump.
- Garage temperature roughly 45-75 °F, with steam and wet hands on brew day.
- Two pumps (Scott, 7 Nov): one mainly recirculates the HLT; the other moves the wort around (recirculating the mash through the HERMS coil, and transfers). The simulator models only one of them (`Mash Pump`).
- After the boil (Scott, 10 Nov): the wort pump doesn't run during the boil. Afterwards its hoses go on the boil kettle: it runs the wort round through the chiller and back into the kettle (an optional whirlpool), then through the chiller to the fermenter. He moves hoses on quick-disconnects but wants the drawing to keep valves ("professional looking process control"). Since 12 Nov the drawing shows the wort pump at the boil kettle, on its chiller loop, once the boil starts. It stays there after the recipe finishes, until a recipe is loaded or reset, or while the mash tun's AUTO is on (Scott, 12 Nov).
- Brewing style: sometimes entirely by hand (set targets, switch the pump and heaters, time rests himself; on 2 Oct he described using his phone as the rest timer), sometimes running a recipe that automates parts of the day.
- Practices: doughs in "Kal's way" (strike water heated only to the mash temperature; the HERMS recovers the drop). Whirlpool stands are at 170 °F.
- Hop, lid and mash-in prompts stay on screen until acknowledged (defect S2, fixed).
- Temperatures are in Fahrenheit.

## Capabilities and Constraints

- Web UI: React + MUI (`cbpi4gui`, fork version 0.5.1.a3.post8). Server: cbpi4 4.7.7.post31 (aiohttp), with a REST API and a websocket for live updates.
- Dashboards are saved as `cbpi_dashboard_N.json`: free-placed widgets in `elements` and pipes in `pathes`, positioned in pixels. Plugins can add their own widgets. Dashboard 2 holds fermenter widgets and is out of scope.
- Simulator rig (dashboard 1): kettle HLT (logic `PIDBoil`, actor `HLT Heater`); kettle Mash Tun (logic `PID_HERMS`, actors `HLT Heater` and `Mash Pump`, also reads the HLT sensor); kettle Boil Kettle (logic `BoilPower`, actor `Boil Heater`, boil power 45%, threshold 210.2 °F). Sensors: HLT Temp, Mash Temp, Boil Temp.
- Simulator recipe ("Craftbeerpi Test Recipe v5"): mash in at 126 °F, protein rest 126 °F for 20 min, saccharification 149 °F for 40 min, mash out ("Sparge") 168 °F for 40 min, 90-minute boil with additions at 60, 15, 15 and 5 min and a lid alert, a whirlpool hop prompt, and a 20-minute whirlpool at 170 °F.
- Open problems in today's dashboard (`C:\src\personal\cbpi-testbench\DEFECTS.md`): U1 failed commands are invisible; U2 controls are small (about 55×32 px), next to each other and act on the first click; U3 on/off is shown weakly and mainly by colour; U4 nothing adapts to phones; U5 in the editor a widget is deleted on pointer-down with no undo; U6 misspelled saved fields (`heigth`, `pathes`).
- Boundaries: recording the brew day (measurements, notes, saved brew days) belongs to the BrewScribe plugin. The brew-day screen only links to it: its last tab, BREWSCRIBE, opens BrewScribe in a browser tab of its own (Scott's choice, 11 Nov). Fermentation is paused and out of scope.
- Every proposed change must say whether it needs only a dashboard layout file, changes to the React UI, or server changes.

## Brand Commitments

- Name: CraftBeerPi. The header shows the configured brewery name (BREWERY_NAME) at every width, phone included, because it tells Scott's rig from his simulators. Scott's on 8012 is "EBrews - Simulator" (from the night of 11 Nov; it was "EBrews - A CraftBeerPi Brewery" when the title bar was designed, then "EBrews"); CraftBeerPi's default is "CraftBeerPi Brewery".
- Big actual and target temperature numbers for each vessel stay, in the style of a hardware PID controller (Scott's September request). On 7 Nov he set the details: the actual temperature (PV) is bigger than the target (SV), PV is red and SV is green.
- The recipe must be visible on the main brew-day screen (7 Nov).
- Scott likes the dark brewhouse touch-panel look (7 Nov). His stated preference decides dark over light, even though the garage is lit.
- It must look like brewing equipment, not a generic web app. Scott named a generic web-app look as the thing that would make a redesign feel wrong even if it were polished (7 Nov).
- A fixed, well-designed brew-day screen is preferred over laying the dashboard out by hand (7 Nov).
- Reference: professional brewery control software (7 Nov). Scott looked at dial gauges and at plotting all three temperatures on one shared scale, and turned both down.
- Layout B is chosen (9 Nov, from a working A/B comparison): the recipe down the left; the three PID faceplates across the top, each also showing OUT (element power) and MODE; a line drawing of the rig below them, with each vessel under its own faceplate; alarms in the title bar; screen tabs along the top on a monitor and along the bottom on a phone. Scott called the first coded kettle pictures crude, so the drawing stays a clean line drawing.

## Evidence on Hand

- Live simulator, shared and look-only: http://127.0.0.1:8000/cbpi_ui/static/index.html
- Dashboard 1 layout: `C:\src\personal\cbpi-testbench\config\dashboard\cbpi_dashboard_1.json` (23 widgets, 2 pipes), built from the template `C:\src\personal\craftbeerpi4\cbpi\config\dashboard\templates\3v_herms.json`.
- Earlier proposal: `C:\src\personal\cbpi-testbench\ui-proposal\` (FEASIBILITY.md, mockups 01-08). Scott liked 03 (recipe progress timeline). He has not decided 07 (whether a step timeline replaces the step list or sits beside it). From 08 he chose Option A, now built: Brew Steps and the Recipe Book sit together in the menu.
- There are no photos of the rig and no brand assets. Mockup data that is not from the simulator must be labelled as demonstration data.

## Product Principles

1. Readable from across the garage: each vessel's actual and target temperature, and what is switched on, can be read at a glance.
2. Nothing switches on by accident, and switching off is always quick.
3. Every command shows what happened: pending, done or failed.
4. One rig, any screen: the phone can do everything the desktop can; the layout adapts, the controls do not shrink.
5. Brewing by hand and brewing from a recipe are equally first-class: either way, the screen says what is happening now and what comes next.

## Accessibility & Inclusion

No formal standard has been set. Known needs from the operating context: reading from a distance through steam, operating with wet hands, and state that never depends on colour alone (defect U3).
