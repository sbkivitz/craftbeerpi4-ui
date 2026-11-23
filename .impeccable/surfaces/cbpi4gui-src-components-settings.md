---
version: 1
slug: "cbpi4gui-src-components-settings"
primary_target: "cbpi4gui/src/components/settings"
related_targets: ["proposal/settings.html"]
---

## Scope and mode
The Settings page of the CraftBeerPi web UI (`#/settings/All`), redesigned in the brew-day screen's world. Visitor mode: Operate.

## Audience, job and content
- The brewer at the desk, now and then, usually to change one setting he already knows; sometimes on the phone. Confirmed 11 Nov 2026.
- Job: find the setting by what it does, its plain name or its key; see what it does; change it; see that the change took (and whether it waits for a restart).
- Content: every setting CraftBeerPi has (53 on the simulator with Brett's two coming; plugins add more), each with its value, type, options, description and source.
- Constraints: design only, nothing changed in craftbeerpi4-ui, craftbeerpi4 or cbpi-testbench; Brett builds after approval; fermentation paused.

## Chosen direction (the brewer, 11 Nov 2026)
- Brew-day look with its title bar (alarms, ALL OFF, clock), last-event line and tabs, SETTINGS lit ("Brew-day look, with its title bar and tabs").
- Plain name first, key underneath in small type; search finds either ("Plain name first, key underneath").
- Groups in brewing order, approved as proposal/GROUPING.md ("Looks right, build the mockups"): Brewhouse, Recipes, Mash and sparge, Boil, Whirlpool and cooling, Timers and alerts, Logs and data, Plugins, System and dashboards. Inside a stage: while you brew, then in imported recipes.
- Structure: an index of the nine groups down the left (where the recipe sits on brew day), all groups as plates on one scrolling pane to the right; FIND A SETTING filters across all of them. Phone: the index first as a jump list, groups below, save bar above the bottom tabs.
- Memorable moment: tapping BOIL in the index lands on the boil's plate with everything that happens around the boil together, from "Ask before heating the boil kettle" to the boil temperature imported recipes get.

## Decided with the mockups (the brewer, 11 Nov 2026)
- Save model: one SAVE for several changes, as today, made visible and answered row by row ("Keep one SAVE").
- Where a setting's group and plain name live: in the web UI's own catalogue, the mockup's M and G tables (catalog.js in the build), with no server change ("A: in the web page, for now").
