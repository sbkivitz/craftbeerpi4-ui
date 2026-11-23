---
version: 1
slug: "cbpi4gui-src-components-hardware"
primary_target: "cbpi4gui/src/components/hardware"
related_targets: ["proposal/hardware.html"]
---

## Scope and mode
The Hardware page of the CraftBeerPi web UI: the kettles, probes and switches CraftBeerPi has, how each is wired, and their settings, in the brew-day screen's frame. Visitor mode: Operate.

## Audience, job and content
- The brewer, now and then, at the desk: to add or change a kettle, probe or switch. Monitor first; a phone must do everything the desktop can.
- Job: find a part by its vessel, see what CraftBeerPi calls it and how it's wired, change its settings in plain words, and know what saving will switch off before saving.
- Content: three kettles with their probe, element and pump; anything no kettle uses; each control's and part's settings with plain names (the catalogue in proposal/hardware-catalog.js); a kettle's settings file; live readings and one-tap switches.
- Constraints: the brewer approved the mockup on 16 Nov, and Brett builds it; CraftBeerPi's server and control plugins change only by the empty-settings support Brett is adding (each control's `blank_defaults`, the file preview's `blank` list and `fill`); fermenters stay a plain link to today's page; the bench tests test_ui_form_deeplink.py, test_ui_navigation.py, test_e2e_kettle_file.py and test_e2e_kettle_form_logic_switch.py must keep their meaning (proposal/HARDWARE-BUILD-NOTES.md, "Your bench tests").

## Chosen direction (approved 16 Nov 2026)
- THESIS: the brewhouse x-rayed. Brew Day's own drawing, with what CraftBeerPi has at each vessel named, wired and live, and every part listed by vessel. Not three tables of ids and icons.
- Monitor: the list by vessel on the left, scrolling on its own; on the right, under FIND, + ADD, UNDO and SAVE, the drawing with a nameplate under each vessel, or the item open. 701 to 1179 px: one column, the page scrolls, the tool row sticks to the top and the drawing is docked at the bottom, lighting what the list points at and what is open. Phone: the list, then the item on its own; no drawing.
- Settings' rows for every setting: plain name, a line on what it does, CraftBeerPi's key under it, the control on the right; one SAVE with UNDO; notes at the top for what saving switches off, a failed save, leaving with changes and no connection.
- Switches are one tap here, by the brewer's choice, unlike Brew Day's Held Heat Rule.
- Probe addresses, Sensor IDs and names are shown whole; each switch's GPIO pin is on its line in the list. Each kettle's line has FILE to save its settings file and says its target.
- Empty kettle settings show as empty with what the control uses; SAVE and a file's LOAD offer to fill in the built-in values first (DESIGN.md, The Empty Setting Rule).
- Everything today's page does is kept: proposal/HARDWARE-TODAY.md.
- Built mockup: proposal/hardware.html. Arrangement: proposal/HARDWARE-GROUPING.md. Build notes: proposal/HARDWARE-BUILD-NOTES.md. Decisions: .impeccable/decisions/direction-log.md, "The Hardware page".

## Comp inventory and medium
| Element | Medium | In the build |
|---|---|---|
| Brew-day frame, HARDWARE lit | HTML/CSS | the brew-day frame itself, page in a shadow root as Settings |
| List by vessel, FILE per kettle | HTML/CSS | from hardware.js's idxHTML |
| The drawing, marked and lit | SVG from rig.js | rigSVG plus drawRig's marking |
| Nameplates (monitor) and the docked drawing (701 to 1179 px) | HTML/CSS + SVG | as the mockup |
| Item page: header, settings file, rows, delete | HTML/CSS | from sheetHTML and rowHTML |

## Not doing
- No colour-scheme setting yet: it's on the to-do list, low priority. The page uses named colours only, apart from the copied frame and drawing rules, so a scheme can change them in one place later.
- No fermenter work.
