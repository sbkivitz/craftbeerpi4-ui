# Direction decision log

## After approval: Scott's answers to the open questions (9 Nov 2026)
- On the additions beyond D3: "keep your additions".
- ALL HEAT OFF, asked whether it should also stop the HLT pump: "Yes, stop the HLT pump too". Asked whether
  to rename it, since it now stops pumps as well as heat: "Yes, call it ALL OFF (Recommended)". It now stops
  the recipe, puts every vessel in MANUAL and switches off both elements and both pumps.
- Rest timer: "Share one timer between screens (Recommended)". The server keeps it; the alarm at zero shows
  on every screen and stays until answered.
- HLT pump setup: not asked. Brett found it in the rig records: its own actor, Recirc_PUMP on GPIO 7, also
  the HLT kettle's agitator, with an override switch CraftBeerPi can't see
  (C:\src\personal\cbpi-rig-comms\rig\2026-10-09.md, line 11). At Brett's request the screen says so: under
  the pump in the drawing while it is off, and on the last-event line when the screen switches it off.

## Round 5 (8-9 Nov 2026)
- Scott, on the first coded kettle drawing: "(vomit emoji)", then chose "The kettles as I drew them in the
  mockup. They look crude next to the B and C pictures".
- Scott, attaching layout D3: "Are we still designing this?" then "Give me an A/B comparison as near to what
  the end product would look like as possible".
- Built both as working pages from one code base (proposal/brew-day.html?layout=a|b, proposal/compare.html):
  A = D1 with redrawn flat homebrew kettles (lid and knob, handles, live thermometer, ball valve, element
  box) on a stand; B = D3 with a line drawing, OUT/MODE on the faceplates, alerts in the title bar, tabs on
  top. Drawings are generated to the box width so each vessel lines up with its own faceplate.
- Scott chose B: "B: recipe on the left, faceplates on top, line drawing". B is now the default layout;
  A stays reachable with ?layout=a for comparison.
- After the finish review fixes, Scott approved the proposal (9 Nov 2026, 13:31): "Yes - happy". Handed to
  Brett (owner of the CraftBeerPi UI) with proposal/BUILD-NOTES.md; building is his and Scott's call.

## Direction contract (final, after round 5; copied into proposal/brew-day.html)
THESIS: A brewhouse control panel for one rig: a PID faceplate per vessel, the vessels as plumbed, the
recipe beside them; it refuses the card grid of numbers and toggles.
OWN-WORLD: Dark slate panel; black PID faces with a big red PV over a smaller green SV, plus OUT and MODE;
buttons topped by lamp strips that also say their state (orange heating, green running, grey off, red
failed); a line drawing of the rig with cyan liquor and gold wort pipes that move only while pumped.
STORY: From across the garage Scott sees what is heating, how close each vessel is, and the step now and
next; heat starts only on a held press; every command answers at its own button.
FIRST VIEWPORT: Left: recipe with Start, Stop, Next step. Right: three faceplates across the top, the line
drawing below with each vessel under its own faceplate. Alarms in the title bar; last event and screen tabs
under it.
FORM: Brewhouse touch panel with process-mimic plumbing; layout B (D3); seed fad8ffb4.

## Round 4 (7 Nov 2026)
- Layout page answer: D1, recipe down the right (no steer).
- Scott, verbatim: "give me a few kettle graphic options". Four styles shown: A brewhouse stainless,
  B homebrew kettles on a stand, C flat HMI symbols, D line-art schematic.
- Answer: "B's kettles, drawn flat like C (Recommended)".

## Direction contract after round 4 (superseded by round 5)
THESIS: A brewhouse control panel for one rig: the vessels as plumbed, a PID faceplate under each, the
recipe beside them; it refuses the card grid of numbers and toggles.
OWN-WORLD: Dark slate panel; black PID faces with a big red PV over a smaller green SV; buttons topped by
lamp strips that also say their state (orange heating, green running, grey off, red failed); flat steel
homebrew kettles on a black stand; cyan liquor and gold wort pipes that move only while pumped.
STORY: From across the garage Scott sees what is heating, how close each vessel is, and the step now and
next; heat starts only on a held press; every command answers at its own button.
FIRST VIEWPORT: Left two thirds: rig drawing over three faceplates. Right third: recipe with Start, Stop,
Next step. Alarms and the last event on top; screen tabs along the bottom.
FORM: Brewhouse touch panel with process-mimic plumbing (Scott's picks, rounds 2-4); layout D1; seed
fad8ffb4.

## Round 3 (7 Nov 2026)
- Scott, verbatim (attaching options 1 and 4): "this is a good start.  I WANT to be able to see the recipe
  on the main page though.  I also really like the dark one.  PV should be bigger than SV.  PV should be
  red, SV should be green  - would be my preference.   Let's keep designing some more"
- Locked world: the dark brewhouse touch panel (option 4) with option 1's correct plumbing (HLT pump loop on
  the HLT; wort pump from the mash tun through the HERMS coil and back; transfer line to the boil kettle
  unlit), PID-style readouts (PV large red, SV smaller green), the full recipe on the main page.
- Colour roles in this world: red = PV digits only (inside black readout boxes); green = SV digits and
  RUNNING lamp strips; orange = HEATING lamp strip; grey = OFF; amber = prompts waiting; alarms use a banner
  with an icon and words, never colour alone.
- Visualize round: three compositions that vary where the recipe sits (right column; bottom timeline; left
  list beside PID faceplates with a flat schematic).

## Round 2 (7 Nov 2026)
- Scott, verbatim: "I don't think I LIKE the dial or the temperatures all on one plot after all.  Give me
  more options modeled on professional brewery control softwre"
- Scott, verbatim: "note that I use two pumps.  One mainly for HLT recirculation and the other to move the
  wort around"
- The kettle-dials direction and the shared-scale fusion are retired; the layout round (comps A-C) is moot.
- The user-pinned reference (professional brewery control software) beats the roll, and Scott asked for
  several options, so this round shows four options side by side instead of one assigned direction:
  1. Classic brewhouse process mimic (BRAUMAT / WinCC process pictures).
  2. High-performance HMI overview (ISA-101: grey normal, colour only for abnormal, values against ranges).
  3. Batch unit board (ISA-88 / BRAUMAT unit overview with the graphical recipe, active step numbered).
  4. Brewhouse touch panel (the HMI on a craft brewhouse control cabinet).
- Shared demo state: mid-mash, both pumps running (HLT pump recirculating the HLT; wort pump recirculating
  the mash through the HERMS coil), HLT element on at 62 %, boil kettle idle.

## Round 1 (7 Nov 2026)
- Decision page answer: Kettle dials (assigned direction), no steer.
- Visualize: Scott agreed to three layout images ("Yes, render three layout images first").
- Steer, Scott verbatim: "mix the direction with All three vessels sit on one shared temperature scale.
  In parallel, show me what the standard option would look like too"

## Resolved direction
Kettle dials, fused with the shared-scale idea from the "One temperature rail" alternate.
Kept from the dials world: light brushed-stainless panel, white enamel dial faces, black DIN-style scale
lettering, engraved nameplates, pilot lamps, big actual and target digits.
Taken from the rail: one temperature scale (50-220 °F) shared by all three vessels, so the HERMS gap
(HLT running a few degrees above the mash) and the boil kettle's position read at a glance.
Not taken: the rail's charcoal ground and hairline-only state (fails at garage distance).

## Working direction contract (FIRST VIEWPORT settles after the layout images)
THESIS: Each vessel reads like its kettle's dial thermometer (needle for actual, rim marker for target),
and one shared scale lines all three up so the HERMS gap shows; it refuses the card grid of numbers
and toggles.
OWN-WORLD: Light brushed-stainless panel, white enamel dials, black DIN-style scales, engraved black
nameplates, round pilot lamps. Orange-red only for live heat, blue for the running pump, green for
targets, amber for prompts awaiting Scott, deep red with hatching for faults.
STORY: From across the garage Scott sees what is heating, how far each vessel has to go, and the step
now and next; nothing switches on without a held press; every command answers at its control.
FORM: Kettle dial thermometer (3rd of 7), fused at Scott's request with the shared scale from the
one-temperature-rail alternate; staging: rig-order relay, active vessel leading; seed fad8ffb4 round 1.
