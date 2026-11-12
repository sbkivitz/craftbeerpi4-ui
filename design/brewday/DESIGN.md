---
name: CraftBeerPi Brew Day
description: A brewhouse control panel for one electric HERMS rig, readable from across the garage.
colors:
  # neutral: the slate panel
  bg: "#0f161d"
  bar: "#0a1016"
  panel: "#17212b"
  panel-2: "#1e2b37"
  panel-hover: "#253545"
  line: "#2a3b4b"
  edge: "#33475a"
  face: "#030609"
  text: "#e8eef3"
  text-2: "#b6c3cf"
  text-3: "#8b9cad"
  on-fill: "#ffffff"
  stale: "#6b7785"
  # primary: readouts and lamps
  pv: "#ff4b3e"
  sv: "#3ddc6f"
  run: "#3ddc6f"
  heat: "#ff7b1c"
  lamp-off: "#3a4856"
  # secondary: the plumbing drawing
  liquor: "#46b8ea"
  wort: "#e9b33b"
  drawing-ink: "#b9c6d2"
  drawing-label: "#c3cfda"
  drawing-idle: "#6f8194"
  pipe-still: "#4a5a6b"
  vessel-fill: "#1b2833"
  # tertiary: prompts, alarms and selection
  prompt: "#ffb21e"
  prompt-bg: "#3a2a06"
  prompt-ink: "#fff1d2"
  note: "#ffd9a0"
  alarm: "#ff4a4a"
  alarm-bg: "#6e1414"
  fault-bg: "#2b1315"
  alarm-ink: "#ffc9c4"
  ok-bg: "#11331f"
  ok-ink: "#c9f2d6"
  select: "#2a6fc0"
  active: "#1c5796"
  active-edge: "#3c7fcc"
  active-ink: "#dce9f7"
  progress: "#9bcbff"
  progress-track: "#0d2b48"
  focus: "#8cc2ff"
  answer: "#f4f6f8"
  answer-ink: "#10161c"
  # the temperature graphs in the faceplates
  graph-grid: "#16202a"
  graph-gap: "#0b1117"
typography:
  pv:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(48px, calc(21 * var(--pu)), 110px)"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'tnum'"
  sv:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(26px, calc(9.5 * var(--pu)), 50px)"
    fontWeight: 600
    lineHeight: 1.05
    fontFeature: "'tnum'"
  readout:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(20px, calc(6.6 * var(--pu)), 32px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.03em"
    fontFeature: "'tnum'"
  headline:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(22px, calc(7 * var(--pu)), 31px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.03em"
  title:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(18px, calc(7 * var(--pu)), 27px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
  lamp-state:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(18px, calc(6.4 * var(--pu)), 24px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.05em"
  button:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(16px, calc(5.6 * var(--pu)), 21px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
  row:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.02em"
  detail:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.02em"
  label:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  nav:
    fontFamily: "Barlow Condensed, Roboto Condensed, Arial Narrow, Segoe UI, sans-serif"
    fontSize: "clamp(15px, 1.15vw, 19px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.08em"
  body:
    fontFamily: "Barlow, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  face: "4px"
  panel: "6px"
spacing:
  list: "6px"
  group: "8px"
  stack: "10px"
  gap: "12px"
  pad: "20px"
components:
  faceplate:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    typography: "{typography.title}"
    rounded: "{rounded.panel}"
    padding: "12px"
  pid-face:
    backgroundColor: "{colors.face}"
    rounded: "{rounded.face}"
    padding: "clamp(6px, calc(2.5 * var(--pu)), 12px) clamp(10px, calc(4 * var(--pu)), 18px)"
  pid-pv:
    textColor: "{colors.pv}"
    typography: "{typography.pv}"
  pid-sv:
    textColor: "{colors.sv}"
    typography: "{typography.sv}"
  pid-aux:
    textColor: "{colors.text}"
    typography: "{typography.readout}"
  graph:
    backgroundColor: "{colors.face}"
    height: "clamp(58px, calc(28dvh - 200px), 110px)"
  graph-span:
    textColor: "{colors.text-3}"
    rounded: "3px"
    padding: "6px 4px"
  graph-span-current:
    backgroundColor: "#0e171f"
    textColor: "{colors.on-fill}"
  lamp-button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.lamp-state}"
    rounded: "{rounded.panel}"
    padding: "17px 8px 8px"
    height: "72px"
  lamp-button-hover:
    backgroundColor: "{colors.panel-hover}"
  lamp-button-failed:
    backgroundColor: "{colors.fault-bg}"
    textColor: "{colors.text}"
  lamp-strip-off:
    backgroundColor: "{colors.lamp-off}"
    height: "8px"
  lamp-strip-heating:
    backgroundColor: "{colors.heat}"
    height: "8px"
  lamp-strip-running:
    backgroundColor: "{colors.run}"
    height: "8px"
  lamp-strip-failed:
    backgroundColor: "{colors.alarm}"
    height: "8px"
  lamp-strip-paused:
    backgroundColor: "{colors.prompt}"
    height: "8px"
  command-button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.panel}"
    padding: "6px 4px"
    height: "62px"
  command-button-hover:
    backgroundColor: "{colors.panel-hover}"
  command-button-disabled:
    textColor: "{colors.text-3}"
  mode-segment-active:
    backgroundColor: "#070c11"
    textColor: "{colors.on-fill}"
  answer-button:
    backgroundColor: "{colors.answer}"
    textColor: "{colors.answer-ink}"
    rounded: "{rounded.panel}"
    padding: "0 20px"
    height: "48px"
  set-button:
    backgroundColor: "{colors.select}"
    textColor: "{colors.on-fill}"
    rounded: "{rounded.panel}"
    height: "54px"
  target-input:
    backgroundColor: "{colors.face}"
    textColor: "{colors.sv}"
    rounded: "{rounded.panel}"
    height: "54px"
  boil-power-readout:
    textColor: "{colors.sv}"
    rounded: "3px"
    padding: "0 .28em"
  boil-power-readout-frame:
    backgroundColor: "#3b4d5e"
    height: "1px"
  keep-boiling-box-on:
    backgroundColor: "{colors.sv}"
    rounded: "3px"
    height: "20px"
  keep-boiling-box-off:
    backgroundColor: "{colors.face}"
    textColor: "#7f91a3"
    rounded: "3px"
    height: "20px"
  boil-step-button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.panel}"
    padding: "6px 4px"
    height: "72px"
  power-input:
    backgroundColor: "{colors.face}"
    textColor: "{colors.sv}"
    rounded: "{rounded.panel}"
    height: "54px"
  heat-off-button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "0 16px"
    height: "48px"
  heat-off-button-hover:
    backgroundColor: "{colors.fault-bg}"
  banner-clear:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok-ink}"
    rounded: "{rounded.panel}"
    height: "50px"
  banner-prompt:
    backgroundColor: "{colors.prompt-bg}"
    textColor: "{colors.prompt-ink}"
    rounded: "{rounded.panel}"
    height: "50px"
  banner-alarm:
    backgroundColor: "{colors.alarm-bg}"
    textColor: "{colors.on-fill}"
    rounded: "{rounded.panel}"
    height: "50px"
  recipe-step:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    typography: "{typography.row}"
    rounded: "{rounded.panel}"
    padding: "8px 12px 8px 6px"
  recipe-step-current:
    backgroundColor: "{colors.active}"
    textColor: "{colors.text}"
  step-progress-track:
    backgroundColor: "{colors.progress-track}"
    rounded: "{rounded.face}"
    height: "8px"
  step-progress-fill:
    backgroundColor: "{colors.progress}"
    height: "8px"
  tab:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.text-2}"
    typography: "{typography.nav}"
    height: "56px"
  tab-hover:
    backgroundColor: "{colors.panel}"
  tab-current:
    backgroundColor: "{colors.select}"
    textColor: "{colors.on-fill}"
---

# Design System: CraftBeerPi Brew Day

## Overview

**Creative North Star: "The Brewhouse Touch Panel"**

This is the screen on the front of a brewhouse control cabinet, made for one rig: Scott's electric three-vessel HERMS. Each vessel gets a faceplate like a hardware PID controller: a big red measured temperature (PV) over a smaller green target (SV) in a black window, plus element power (OUT) and MODE, with the vessel's temperature graph under them in the same window. The boil kettle's faceplate works like the HLT's plus BOIL: while its target is BOIL its green number is the boil power, shown once and framed because it is also the boil power's button; while it holds a temperature it reads like the HLT's. The vessels appear once more as a clean line drawing, plumbed the way the rig is plumbed, each one under its own faceplate. The recipe runs down the left. The screen refuses the generic dashboard made of a card grid of numbers and toggle switches.

Everything is read from across a garage, through steam, often with wet hands. So the panel holds a few large things rather than many small ones: condensed capitals, numbers that fill their windows, buttons 62-72px tall, and a hint on each button saying what a press will do. Colour works like indicator lamps on real equipment: each hue has one job, and every state shown by a colour is also written in words. The dark slate panel is Scott's stated preference over a light theme, even though the garage is lit.

Scott has turned down dial gauges, plotting all three temperatures on one shared scale, and the shaded kettle pictures of an earlier version, which he called crude. A generic web-app look is what he named as the thing that would make a redesign feel wrong. This record describes layout B of the built mockup (`proposal/brew-day.html`, the default). Layout A (`?layout=a`: recipe on the right, steel kettle pictures, tabs along the bottom) is kept only for comparison and is not part of the system.

**Key Characteristics:**
- Dark slate panel; flat surfaces separated by 1px borders and small steps of tone.
- One PID faceplate per vessel: PV big and red, SV smaller and green, OUT and MODE beside them, and the vessel's own temperature graph underneath.
- Controls topped by an 8px lamp strip, with the state also written on the button.
- A line drawing of the rig whose pipes take their liquid's colour and move only while pumped.
- Barlow Condensed capitals for everything printed on the panel; regular Barlow only for sentences.
- Heat starts only on a held press, and every command answers at its own button.

## Colors

A dark slate panel lit by indicator colours, where each hue means exactly one thing.

### Primary
The readout and lamp colours: the language of the faceplates.
- **Process Red** (pv, #ff4b3e): the PV digits, with a soft red glow. The only red that is not a fault.
- **Setpoint Green** (sv, #3ddc6f): the SV digits (on the boil kettle while its target is BOIL, the boil power in their place), the value being typed in the target and power editors, the usual boil power in the power editor, and the lit KEEP BOILING box.
- **Running Green** (run, #3ddc6f): the lamp strip of a running pump or recipe, the connection lamp, "✓ DONE" on finished steps, "confirmed" on the last-event line, and RUNNING under a pump in the drawing. Same value as Setpoint Green, kept as its own token because it does a different job.
- **Element Orange** (heat, #ff7b1c): the lamp strip of a heating element, the OUT power bar, a heating element in the drawing, and the hold-to-turn-on fill (at 32% opacity).
- **Dark Lamp Grey** (lamp-off, #3a4856): the unlit lamp strip. Off is grey, never red.

### Secondary
The plumbing colours of the line drawing.
- **Hot Liquor Cyan** (liquor, #46b8ea): hot liquor pipes and the HLT pump, only while that pump runs.
- **Wort Gold** (wort, #e9b33b): wort pipes, the wort pump and the HERMS coil, only while the wort pump runs.
- **Drawing Line Steel** (drawing-ink, #b9c6d2): the 3px outlines of vessels, legs and pumps.
- **Drawing Label Steel** (drawing-label, #c3cfda): vessel and pump names inside the drawing.
- **Idle Element Steel** (drawing-idle, #6f8194): an element or coil that is off.
- **Still Pipe Slate** (pipe-still, #4a5a6b): a pipe whose pump is not running.
- **Vessel Interior Slate** (vessel-fill, #1b2833): the inside of vessel and pump outlines.

### Tertiary
Attention and selection: prompts waiting for the brewer, faults, and "where you are".
- **Prompt Amber** (prompt, #ffb21e) on **Dark Amber Wash** (prompt-bg, #3a2a06) with **Prompt Cream** text (prompt-ink, #fff1d2): anything waiting for the brewer: hop and mash-in prompts, the Next-step confirmation, an addition that is due, "waiting for you" on the last-event line, a paused boil element and the line that counts its pause, and the line and TARGET hint of a vessel whose AUTO has no target.
- **Note Amber** (note, #ffd9a0): the note line where a faceplate or the recipe column explains why a control can't be used, or says "keep holding".
- **Alarm Red** (alarm, #ff4a4a) on **Alarm Oxblood** (alarm-bg, #6e1414): the alarm banner, the outline and strip of a failed command, the blinking connection lamp when the link is lost.
- **Fault Wash** (fault-bg, #2b1315): the fill of a failed command's button, and ALL OFF under the pointer.
- **Alarm Pink** (alarm-ink, #ffc9c4): "No connection" and "Last reading 48 s ago".
- **All-Clear Wash** (ok-bg, #11331f) with **All-Clear Mint** text (ok-ink, #c9f2d6): the banner in the title bar when there are no alarms.
- **Selection Blue** (select, #2a6fc0): the current screen tab, and the SET button of the target and power editors.
- **Current Step Blue** (active, #1c5796) with **Current Step Edge** (active-edge, #3c7fcc) and **Current Step Ink** (active-ink, #dce9f7): the recipe step running now, and the "now" strip on a phone.
- **Progress Blue** (progress, #9bcbff) on **Progress Track Navy** (progress-track, #0d2b48): the current step's 8px progress bar.
- **Focus Ring Blue** (focus, #8cc2ff): the 3px keyboard focus outline.
- **Answer White** (answer, #f4f6f8) with **Answer Ink** (answer-ink, #10161c): the button that answers a banner or confirms a skip. The toast uses Panel White with the same ink.

### Neutral
- **Garage Slate** (bg, #0f161d): the page behind everything.
- **Cabinet Black** (bar, #0a1016): the title bar and the tab bar.
- **Panel Slate** (panel, #17212b): faceplates, the recipe column, the drawing's box, the last-event line.
- **Raised Slate** (panel-2, #1e2b37): buttons, recipe step rows, the rest timer, recipe book rows.
- **Hover Slate** (panel-hover, #253545): a button under the pointer.
- **Hairline Slate** (line, #2a3b4b): 1px borders on panels and rows, and the dividers between tabs.
- **Control Edge** (edge, #33475a): 1px borders on buttons.
- **PID Window Black** (face, #030609): the readout window and the target input.
- **Panel White** (text, #e8eef3): values, names and button labels.
- **Soft Steel** (text-2, #b6c3cf): secondary lines: lamp button names, deviation lines, step details, tabs.
- **Dim Steel** (text-3, #8b9cad): PV/SV/OUT/MODE tags, times, button hints and unavailable labels.
- **On-Fill White** (on-fill, #ffffff): text on Selection Blue, on Alarm Oxblood, on the pressed mode button, and the current step's countdown.
- **Stale Grey** (stale, #6b7785): readings and the OUT bar when the connection is lost, with the glow removed.
- **Graph Grid** (graph-grid, #16202a): the gridlines of the temperature graphs.
- **Graph Gap** (graph-gap, #0b1117): the stretch of a graph where there are no readings.

### Named Rules
**The Red Is Reserved Rule.** Red means the measured temperature (PV) or something gone wrong: an alarm, a failed command, a lost connection. Off and stop are never red; even ALL OFF is neutral at rest and warms to red only under the pointer.

**The Say It Twice Rule.** Colour never carries a state alone. Lamp strips come with words (HEATING, RUNNING, OFF, DID NOT STOP), banners come with an icon and a title, pumped pipes come with moving dashes and arrow-heads, and finished steps say "✓ DONE".

**The One Blue Rule.** Blue marks where you are and what you are choosing: the current tab, the current recipe step, the target and power editors and the focus ring. Blue never shows the state of equipment.

## Typography

**Display Font:** Barlow Condensed (with Roboto Condensed, Arial Narrow, Segoe UI, sans-serif), weights 500, 600 and 700
**Body Font:** Barlow (with Segoe UI, system-ui, sans-serif), weight 500 for sentences
**Label/Mono Font:** no mono face; numbers use Barlow Condensed with tabular figures

**Character:** An industrial condensed sans, like the lettering on a control cabinet: tall, narrow and legible at a distance, usually in capitals with open spacing. Regular-width Barlow appears only when the screen speaks to the brewer in whole sentences.

Faceplate and recipe sizes scale with their own panel. The plate unit (`--pu`) is 1% of the faceplate's width (1% of the recipe column's width inside the recipe), and every size is clamped between a floor and a ceiling.

### Hierarchy
- **Display: PV** (600, clamp(48px, 21 plate units, 110px), line-height 1, tabular): the measured temperature, red with a glow; the °F unit is 0.4em and raised. On a phone, clamp(44px, 16 units, 68px).
- **SV** (600, clamp(26px, 9.5 units, 50px), line-height 1.05, tabular): the target, green, under the PV. On a phone, clamp(24px, 8.5 units, 36px).
- **Readout** (600, clamp(20px, 6.6 units, 32px), 0.03em, tabular): the OUT and MODE values, each at least 2.55em wide (the width of "100 %"). The current step's countdown uses the same scale at 700, up to 27px, in white.
- **Headline** (700, clamp(22px, 7 units, 31px), line-height 1.05, 0.03em, capitals): the recipe name. The brand in the title bar speaks in the same voice at clamp(22px, 2.1vw, 34px). It is the brewery's name from Settings (BREWERY_NAME), on two lines at most; a name of more than 24 characters is set at 0.7 of that size on a monitor and on a phone.
- **Title** (700, clamp(18px, 7 units, 27px), line-height 1, 0.06em, capitals): vessel names on the faceplates. Section heads in the recipe column (Rest timer, Recipe book) are 700 20px capitals.
- **Lamp state** (700, clamp(18px, 6.4 units, 24px), 0.05em): the state word on a lamp button. The name and next action under it are 500, 13-16px, Soft Steel.
- **Button** (700, clamp(16px, 5.6 units, 21px), 0.06em): command labels such as TARGET, STOP, NEXT STEP and AUTO. Their hint lines are 500, 12-14px, Dim Steel.
- **Row** (600, 20px, line-height 1.1, 0.02em): recipe step titles. Banner text (18px) and recipe book names (19px) use the same voice.
- **Detail** (500, 16px, line-height 1.25, 0.02em): temperatures and times on steps, additions, the deviation line under each window (15-19px) and the last-event line (18px).
- **Label** (600, 15px, line-height 1, 0.06-0.1em, capitals): the PV, SV, OUT and MODE tags, step status, LOG, the connection label.
- **Nav** (600, clamp(15px, 1.15vw, 19px), line-height 1.05, 0.08em, capitals): screen tabs; 14px on a phone.
- **Body** (Barlow 500, 16px, line-height 1.35): sentences only: notes (15px), confirmation questions (17px), toasts (16px).

### Named Rules
**The PV Leads Rule.** The PV is the largest thing on its faceplate, about twice the size of the SV, red above green. Never make them the same size and never swap the colours.

**The Cabinet Lettering Rule.** Everything printed on the panel (names, tags, buttons, numbers) is Barlow Condensed, with names, tags, tabs and button labels in capitals and spacing between 0.02em and 0.1em. Regular-width Barlow is only for sentences addressed to the brewer.

**The Steady Digits Rule.** Every number that changes (PV, SV, OUT, the clock, countdowns, event times) uses tabular figures, so the digits don't shift as they tick.

## Layout

On a monitor, brew day is one fixed screen. From the top: the title bar (brand on the left, the alarm banner in the middle, then the connection lamp, ALL OFF and the clock); the last-event line; the screen tabs; then the main area. The main area has the recipe column on the left (clamp(340px, 23vw, 440px)) and the brewhouse on the right: three faceplates in equal columns across the top, and the line drawing filling the space below them.

Spacing uses a small set of steps: 6px between list rows and editor keys, 8px between buttons in a group, 10px between the rows of a faceplate or of the recipe column, 12px between panels and inside faceplates, 20px at the page edge. On a phone the page edge drops to 12px and the gap between panels to 10px.

Tap targets stay large: lamp buttons are 72px tall (66px in the recipe controls), command buttons 62px, editor and confirmation buttons 54px, banner answers and ALL OFF 48px, and nothing is under 44px. The one exception is the boil kettle's step buttons on the narrowest windows (1180, 1280 and 900px wide): there they go down to 32px wide (still the row's full height), so BOIL ELEMENT beside them keeps its word and stays the biggest button. On a phone, lamp buttons are 56px and command buttons 50px.

When the screen is 1000px tall or less, as in a browser window on a 1080-line monitor (Scott's usual set-up), the faceplates tighten so the drawing keeps readable labels: lamp buttons 66px (padding 12px 8px 5px), the mode row 56px, 8px between faceplate rows, and closer-set span labels on the graphs. The PV and SV keep their size.

How it changes with width:
- **1180px and wider:** one screen, at least 860px tall. The page doesn't scroll; only the recipe's step list does, or, when brewing by hand, the recipe book's list.
- **1179px and narrower:** one column, and the page scrolls. The brewhouse comes first and the recipe moves below it; the drawing keeps its 1200 × 470 shape.
- **1023px and narrower:** the alarm banner has the title bar's second row to itself, under the brand, the connection, ALL OFF and the clock. Squeezed in between them, as at half a 1920 monitor, a question had 36-175px for its words and the bar ran past the screen. Down to 701px the brand takes the room left in its row, so a long brewery name keeps its full size there.
- **899px and narrower:** the faceplates stack, one per row.
- **700px and narrower (phone):** the drawing is hidden. A "now" strip in Current Step Blue (the step, time left, progress and the next step) sits above the faceplates. The alarm banner drops to a second row of the title bar, the brand keeps the brewery's name (on two lines when it needs them), the connection shows only its lamp, and the tabs become a fixed bar along the bottom: two rows of 48px, four and four with BrewScribe at the bottom right, and short names ("Steps", "Recipes"). Where BrewScribe isn't installed it is four then three, with "More" taking two places.

### Named Rules
**The One Screen Rule.** On a monitor, everything needed to run the brew (faceplates, drawing, recipe, alarms, last event) is visible at once, without scrolling the page. When height runs short, the drawing gives it up first, down to 140px; the PV digits never shrink for it. Only a screen under about 900px tall scrolls, and then only a little.

**The Under Its Plate Rule.** Each vessel in the drawing sits directly under its own faceplate. The drawing is generated at the width of its box, with the vessels centred at one sixth, one half and five sixths of the width.

**The Shared Rows Rule.** When the faceplates sit side by side (900px and wider), they share row heights through a CSS subgrid of six rows (name, window, deviation line, lamp buttons, mode row, note), so the windows and button rows line up across all three vessels.

## Elevation & Depth

The panel is flat. Surfaces sit in three tones (Garage Slate, Panel Slate, Raised Slate), separated by 1px borders, with no drop shadows at rest. Depth comes from light instead: the digits glow like LED segments, a lit lamp strip glows into its button, a heating element glows in the drawing, and the PID window is sunk into the faceplate. Only two things float above the panel: the event log list and the toast.

### Shadow Vocabulary
- **Sunken window** (`box-shadow: inset 0 3px 10px rgb(0 0 0 / .9), inset 0 0 0 1px #1a2530, 0 1px 0 rgb(255 255 255 / .06)`): the black PID window, which also has a 1px black border.
- **PV glow** (`text-shadow: 0 0 18px rgb(255 75 62 / .38)`) and **SV glow** (`text-shadow: 0 0 14px rgb(61 220 111 / .32)`): the readout digits. Removed when readings go stale.
- **Lamp glow** (`box-shadow: 0 2px 14px rgb(255 123 28 / .6)` when heating, `0 2px 14px rgb(61 220 111 / .5)` when running): under a lit lamp strip.
- **Element glow** (an SVG Gaussian blur, standard deviation 3): a heating element in the drawing.
- **Pressed ring** (`box-shadow: inset 0 0 0 2px #a9bfd4`): the active half of the AUTO | MANUAL switch.
- **Floating list** (`box-shadow: 0 18px 40px rgb(0 0 0 / .5)`) and **toast** (`box-shadow: 0 12px 30px rgb(0 0 0 / .45)`): the only lifted surfaces.

### Named Rules
**The Lit, Not Lifted Rule.** Things look important because they are lit, not because they float. Glows belong to readings and to equipment that is on; panels and buttons never cast shadows.

## Shapes

Gently squared corners: 6px on every panel, button, banner, step row and list item; 4px on the PID window and the step progress bar; 3px on the OUT bar. Circles appear only for the 12px connection lamp and the 16px ring that marks steps still to come. The lamp strip runs straight across the top edge of its button and is clipped by the button's corners.

Borders do the separating: 1px Hairline Slate around panels and rows, 1px Control Edge around buttons, 2px in the state colour around prompts, alarms and a failed command, and 2px #7d8fa2 around ALL OFF. Each recipe step's number sits in a darker 48px band at the left of its row.

The drawing has its own simple geometry: tanks with domed tops, rounded bottoms and short legs; pipes that run only horizontally and vertically, with rounded joins; pumps drawn as a circle holding a triangle; hand valves drawn as a bowtie on the pipe; small arrow-heads along a pumped pipe.

### Named Rules
**The Dashed Means Someone Else Rule.** A dashed outline on a see-through button means another controller is in charge of that device (the vessel's AUTO, or the mash tun's HERMS running the hot liquor tank). It still explains itself when tapped. Solid buttons are yours to press.

## Components

Every control is chunky, labelled like a push-button on a cabinet, and says what a press will do.

### Buttons
- **Shape:** gently squared (6px), with a 1px Control Edge border.
- **Lamp button** (anything that switches equipment, and the recipe's START): Raised Slate, 72px tall, padding 17px 8px 8px, with an 8px lamp strip across the top. The state word is large; under it, in Soft Steel, the device and what a press does ("HLT ELEMENT · tap to turn off", "BOIL ELEMENT · hold to turn on"). Two sit side by side on a faceplate, and a single one spans the row. On the boil kettle, while AUTO runs, the −5 %, −1 %, +1 % and +5 % step buttons sit either side of BOIL ELEMENT, which keeps twice their width and is never narrower than its state word (HEATING) needs; there its small line says only what a press does ("tap to pause"), because the faceplate's title already names the kettle's only element (screen readers still hear "BOIL ELEMENT").
- **Command button** (TARGET, STOP, NEXT STEP, timer buttons, LOAD): Raised Slate, 62px tall (66px in the recipe controls, 48px in recipe book rows), with a hint line under the label ("change SV", "tap to stop", "to Sparge").
- **Boil power button** (only on a kettle whose logic can set a boil power: on Scott's rig, the boil kettle): while the kettle's target is BOIL, the green boil power in its window ("45 %") is the button, with a small "change" beside it in Dim Steel, inside a 1px #3b4d5e frame that takes no room (hover #7f91a3; 2px Select Blue while its editor is open). Its tap area is at least 44px tall. It opens the power editor, as BOIL POWER in TARGET's editor does. It always sets the boil power (BoilPower's Boil_Power), in AUTO or MANUAL, and a running recipe step never locks it. TARGET sits beside AUTO/MANUAL, as on the other vessels, because a third button there doesn't fit at 1366 or 1440 wide. In MANUAL the element runs at its own level, as the HLT's does, and the screen doesn't set that level. Scott asked for the boil power back on 10 Nov 2026 ("I seem to have lost the critical ability to set the boil power percentage", then "I need to be able to adjust boil element power even while running a recipe"), and then for it to show once ("I don't need the heating element power echoed so many places"). On 11 Nov 2026 he asked for the element's power back beside the window ("BoilPower's display has lost its current 'out' element power number? Please put it back"): the green number is the setting, OUT is what the element is doing, and the element's button still says only HEATING.
- **KEEP BOILING** (the boil kettle only, while its target is BOIL): a small checkbox at the right end of the nameplate row, label in 600 condensed Soft Steel. The box is the LED: lit Setpoint Green with a dark tick and a soft green glow while ticked, dark with a #7f91a3 edge while unticked, marching stripes while waiting, Stale Grey offline. It is no taller than the name; its tap area reaches 44px into the padding around it. One tap sets Keep_Boiling, in any mode. Ticked, BoilPower goes back to full power if the wort falls 3.6 °F below the boil point; unticked, it holds the boil power and lets the wort fall. Scott, 10 Nov 2026: "add a small checkbox with LED to choose keep at boil temp or let the boil power fully drive the temp".
- **Step buttons** (−5 %, −1 %, +1 % and +5 %, on the boil kettle only): command buttons either side of BOIL ELEMENT while AUTO runs, in the power editor's order (−5 −1 on the left, +1 +5 on the right, growing outward like a number line), as tall as the lamp, with nothing under the label. They share the row in the ratio 1 : 2 : 1 (each step, the element, each step), so they are 44px wide or more wherever the row has room; on the narrowest windows (1180, 1280 and 900px wide) the element first takes what HEATING needs, the steps share the rest (32px at 1180), and they read −5 −1 +1 +5, as in the power editor, because "−5 %" no longer fits (screen readers still hear "Boil power down 5 percent"). One tap sends the new boil power at once; a tap that would pass 0 or 100 % stops there (2 % and −5 % gives 0 %), and only at 0 or 100 % itself is the button refused with a note. While one waits for CraftBeerPi, all four are greyed and only the one pressed shows the lamps' marching stripes, 6px, along its top. They are hidden in MANUAL (where they would seem to set the element's own level), while the kettle holds a temperature (which doesn't use the boil power) and while the boil kettle's editor is open (it has steps of its own). Taken from the Grainfather's arrow keys; Scott chose −5 % and +5 % on 10 Nov 2026, and asked for −1 % and +1 % as well on 11 Nov ("I'd like the +/-1 in addition to the +/- 5 you already have").
- **Mode switch** (AUTO | MANUAL): two halves joined by a 1px divider, taking two thirds of the row, with TARGET in the last third. The active half is near-black (#070c11) with white text and a 2px inset ring. The hint under the other half says what pressing it does ("hold to start", "tap to stop AUTO").
- **Answer button** (ADDED, DONE, TRY AGAIN or OK in banners; SKIP TO … in the Next-step confirmation): Answer White with Answer Ink, 700 18px condensed, 48px tall in banners and 54px in the confirmation. The safe choice beside it (KEEP GOING) is an ordinary Raised Slate button.
- **ALL OFF:** always in the title bar. Raised Slate with a 2px #7d8fa2 border, 700 17px, 48px tall, one tap. Under the pointer the border turns #ff8a80 over Fault Wash. It stops a running recipe, puts every vessel in MANUAL, and switches off both elements and both pumps. (It was ALL HEAT OFF until Scott asked for it to stop the pumps too, on 9 Nov 2026.)
- **Hover / Focus:** hover lightens the fill to Hover Slate. Keyboard focus is a 3px Focus Ring Blue outline, 2px out from the edge, on everything.
- **Unavailable:** marked `aria-disabled`, never removed: Dim Steel text and a not-allowed cursor. A tap explains why.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** Panel Slate for faceplates, the recipe column, the drawing's box and the last-event line; Raised Slate for things inside them (step rows, the rest timer, recipe book rows).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px Hairline Slate.
- **Internal Padding:** 12px on faceplates (10px on a phone), 14px on the recipe column.
- **Next-step confirmation:** a Dark Amber Wash box with a 2px Prompt Amber border inside the recipe column. It asks in a full sentence ("Skip the rest of Saccharification (23:41 left) and start Sparge at 168 °F?") and offers SKIP TO SPARGE and KEEP GOING side by side.
- **Toast:** for explanations that don't belong to a faceplate or the recipe column: Panel White with Answer Ink, Barlow 500 16px, centred near the bottom of the screen, gone after about four seconds.

### Inputs / Fields
- **Target editor:** TARGET swaps the faceplate's mode row for the editor in place, with no pop-up: −1, −.1, the value, +.1, +1, then a wide SET 149.0 °F button (Selection Blue, white text) and CANCEL. Keys are 54px tall.
- **Boil kettle's target editor:** TARGET opens the HLT's editor with a third row: BOIL over "full power to 210.2 °F", shown pressed (like an active AUTO) whenever the editor says BOIL, and BOIL POWER over "change", which swaps in the power editor. The value is BOIL or a temperature to hold: anything from the boil point less 3.6 °F up is BOIL (206.6 °F with the boil point at 210.2), so the steps run …205.6, 206.5, BOIL, and + is refused at BOIL. A typed 212 makes SET read SET BOIL before it is pressed. SET BOIL sends the boil point as the target. Scott, 10 Nov 2026: "Set the boil kettle's target to 170 °F, like the HLT, and it holds there".
- **Power editor:** the boil power button (or BOIL POWER in TARGET's editor) swaps the boil kettle's mode row for an editor like the target editor: −5, −1, the value, +1, +5, then SET 40 % and CANCEL. Whole numbers from 0 to 100; the keys stop at the ends. A third row holds BOIL AT 210.2 °F over "full power until then · change", which opens an editor of its own for the boil point (BoilPower's Boil_Threshold, 190-212 °F; above 212 °F it refuses, because the wort may never get there and the element would stay at full power), and USUAL 45 % in Setpoint Green over "starts each recipe · set in Hardware", a reading, not a button (with none set, "USUAL – –" over "none · set one in Hardware", and a recipe leaves the boil power as it is). A target at BOIL keeps aiming at the boil when the boil point changes. A recipe started from its first step puts the boil power back to the usual power, so a change made during one brew day doesn't carry over to the next. The editor stays open if the kettle's mode changes, because it always sets the boil power. When a confirmed level isn't in use yet, the last-event line says when it will be: "used once it boils at 210.2 °F, full power until then", "kept for the boil in AUTO", "not used while it holds 170 °F" or "used when the heat carries on".
- **Style:** the value field is a small PID window: PID Window Black, a 2px #3d7fd0 border, 6px corners, 600 28px condensed tabular digits in Setpoint Green.
- **Behaviour:** Enter sets, Escape cancels. A target outside 32-230 °F, or a power outside 0-100 %, is refused with a note. The boil kettle's editors open with their number selected, so typing replaces it. While either editor is open, the other faceplates' button rows keep their height, and the drawing may shrink further (to 136px, or 64px with the graphs, because the boil kettle's editors have a third row) so that a two-line note under an editor never makes the page scroll on a screen 900px tall or more.

### Navigation
- **Title bar:** Cabinet Black with a 1px hairline below. The brand on the left, the alarm banner in the middle, then the connection lamp (a 12px Running Green dot and "Connected"), ALL OFF, and the clock (600, clamp(26px, 2.4vw, 40px), tabular). When the link is lost, the dot becomes a hollow Alarm Red ring that blinks (a change of shape, not only colour) and the label reads "No connection" in Alarm Pink. On a monitor or laptop only the banner gives way to a long prompt, by wrapping: ALL OFF keeps its one-line shape and the clock all its digits, whatever the prompt says. The brand is the brewery's name from Settings at every width, phone included, because it is what tells Scott's rig from his simulators; the browser tab's title starts with it too. It is at most 12 times its font size wide on a monitor and two lines tall, ending in an ellipsis beyond that, with the whole name as its tooltip; under a long prompt it narrows to its longest word. A blank name shows "CraftBeerPi".
- **Screen tabs:** equal-width tabs on Cabinet Black with 1px hairline dividers, Nav type in Soft Steel capitals. The current tab is Selection Blue with white text; hover is Panel Slate. On a monitor they sit under the last-event line, 56px tall. On a phone they become the fixed bottom bar described under Layout. The last tab, BREWSCRIBE, opens Porter's BrewScribe in a browser tab of its own (the same one each time, never reloaded): a box-and-arrow icon after its name says so before the press, with "opens in its own tab" for screen readers. Where its tab is narrow its name breaks between Brew and Scribe.

### PID Faceplate
The signature component: one per vessel, like the controller on a cabinet door. From the top:
- the vessel name in Title capitals;
- the black window: PV and SV on the left with small Dim Steel tags, then a 1px divider (#2a3846), then OUT (element power, over a 5px Element Orange bar) and MODE (AUTO, MAN or HERMS). A missing value reads "– –". Under them, in the same window, the vessel's temperature graph (see Temperature Graph). The boil kettle's window works like the HLT's plus BOIL: while its target is BOIL, its green readout is BOIL and the boil power ("BOIL 45 %", framed, because it is the boil power's button), and OUT beside it is what the element is doing now (100 % while it heats to the boil, the boil power once it boils, 0 % paused, the hand level in MANUAL), so the setting and the reading sit side by side, as the HLT's SV and PV do; while it holds a temperature, it reads SV and that temperature, with OUT and MODE, as on the HLT. OUT and MODE always keep the room "100 %" takes, so the divider stays put as the power changes and lines up across the three windows; and the PV's size is limited by the window's width (the same limit for all three), so on a narrow window it shrinks just enough to stay 6px clear of the divider;
- the deviation line in Soft Steel ("0.4 °F below target", "At target", "Boiling", "MANUAL · element by hand"), with the time to target added while the vessel heads for it ("6.7 °F below target · about 2 min at this rate"). While AUTO runs with no target, it says so in 600-weight Prompt Amber instead, and TARGET's hint turns Prompt Amber and says "set SV" (see The Mode Tells The Truth Rule). The boil kettle's line in AUTO says what BoilPower is doing: "Full power until it boils · about 20 min", "Boiling", "Below a boil · back to full power at 206.6 °F" (KEEP BOILING ticked) or "Not boiling · 10.9 °F below 210.2 °F" (unticked), "Heat paused for 0:26" in Prompt Amber; holding a temperature it uses the HLT's lines, and says "1.2 °F below target · heats again at 166.4 °F" while BoilPower rests;
- the lamp buttons for that vessel's element and pump; on the boil kettle, BOIL ELEMENT, with −5 % −1 % on its left and +1 % +5 % on its right while AUTO runs;
- the mode row (AUTO | MANUAL and TARGET), or the target or power editor, or, while the mash tun's AUTO runs the HERMS, a dashed full-width HERMS button on the hot liquor tank that says who is in charge;
- the note line in Note Amber, hidden when empty.

### Temperature Graph
Each vessel's graph sits in its own PID window, under the PV and SV it explains. Scott chose this on 10 Nov 2026 over a DRAWING / GRAPHS switch that would have swapped the drawing for the graphs.
- **Place and size:** a 1px #1a2530 line divides it from the readings above. The plot runs under PV and SV; the span labels sit under OUT and MODE, behind the window's divider. It is clamp(58px, calc(28dvh − 200px), 110px) tall on a monitor and 108px on a phone.
- **Scale:** each vessel has its own, fitted to its readings and target, and never less than 4 °F tall over 10 minutes, 8 °F over 30 minutes or 20 °F over the day. Gridlines are 1px Graph Grid (#16202a), labelled at the left in 600 12px condensed Dim Steel, outlined in PID Window Black so a line can pass behind a label. Clock times run along the bottom when the graph is at least 90px tall; the three graphs share the same clock marks.
- **Lines:** PV is a 2.2px Process Red line with a soft red glow, ending in a 3px dot at now. SV is a 1.6px Setpoint Green step line, drawn only while something sets the target (AUTO, the HERMS or the recipe). OUT is an Element Orange band at 60% along the bottom, labelled OUT, or "OUT – –" when there is no power reading to show. Where a step started, a 1px dashed line and a small tag with the step's number mark it. On the boil kettle, while its target is BOIL, the boil point is a 1.4px dashed Dim Steel line instead of the green one, because BoilPower doesn't hold it; a temperature it holds is the Setpoint Green line, as on the HLT.
- **Spans:** 10 MIN, 30 MIN and DAY, stacked beside the plot in 600 13px condensed capitals; the current one has a 1px #7f91a3 border over #0e171f, with white text. Tapping a graph moves all three graphs to the next span; tapping a label goes straight to it. 30 MIN to start with, remembered on each device. DAY runs from the start of the brew day.
- **Readings stopped:** the time with no readings is dark (Graph Gap, #0b1117). When the connection is lost, the lines turn Stale Grey without their glow, like the digits.
- **For screen readers:** each graph is a button named for what it shows and what a press does ("Hot liquor tank temperature graph, the last 30 minutes. Press for the brew day so far."), described by a sentence ("Hot liquor tank, the last 30 minutes: rose from 128.3 to 154.2 °F; target 154.4 °F; element 62 %.").

### Lamp Button States
- **Off:** Dark Lamp Grey strip, "OFF".
- **Heating:** Element Orange strip with its glow, "HEATING". The element's power is the window's OUT and the graph's OUT band, so the button doesn't repeat it (Scott, 11 Nov 2026: "I'd like the "HEATING xx %" button to only show HEATING since the percentage is shown in the graph and as a number on the right side of the PID display"). Layout A, which has no OUT and no graph, keeps "HEATING 62 %".
- **Running:** Running Green strip with its glow, "RUNNING".
- **Waiting for an answer:** grey diagonal stripes march along the strip (a 0.6s loop), "SWITCHING ON…" or "SWITCHING OFF…", with "waiting for CraftBeerPi" underneath. Between the boil kettle's step buttons, where PAUSING… wouldn't fit, the boil element keeps its state word (HEATING or PAUSED) and the small line says what is on its way ("pausing…", "heating…"), so the row never changes height.
- **Failed:** 2px Alarm Red outline, Fault Wash fill, a red strip, "DID NOT STOP" or "DID NOT START", and underneath "still running · tap to try again".
- **Run by someone else:** dashed outline, see-through, with "run by mash tun" or "run by AUTO" under the state.
- **The boil element in AUTO:** not locked, unlike the other elements in AUTO. While heating it reads "HEATING" (the power is the green readout while boiling, and OUT while holding) over "BOIL ELEMENT · tap to pause". A tap pauses the heat for a boil-over: a Prompt Amber strip, glow and outline, "PAUSED" in Prompt Amber, and "BOIL ELEMENT · hold to heat" under it. AUTO, the recipe, its timer and the boil power carry on. After 2 brewing minutes paused, CraftBeerPi raises a kept prompt on every page, once per pause: "Boil Kettle heat still paused · The heat has been paused for 2 minutes. To heat again, press and hold PAUSED on the Boil Kettle." Carrying on, MANUAL or ALL OFF take it down. Taken from the Ss Brewtech eController's heater button; Scott chose it on 10 Nov 2026.
- **Being held:** Element Orange at 32% sweeps across the button from left to right over one second.

### Alarm Banner and Last Event
- **Banner:** in the middle of the title bar, at least 50px tall, always with an icon, a title and words. All clear: All-Clear Wash, a 1px #2b6a42 border, a green tick and "NO ALARMS" in All-Clear Mint capitals. Prompt: Dark Amber Wash, a 2px Prompt Amber border, a bell, the title in 20px capitals, Prompt Cream text and an answer button; prompts stay until answered. An answer that puts heat on (START THE BOIL, when the boil waits for the brewer) is held for one second like START, with "hold to start" under its name and the orange fill sweeping across it. Alarm: Alarm Oxblood, a 2px Alarm Red border, a warning triangle, white text and an answer button such as TRY AGAIN.
- **Long questions:** a question over 140 characters with an answer button (the sparge's, about 200; the boil's, 300) keeps the banner's full width for its words on a phone, with its buttons under them at the right and the bell beside the title. Beside the button it was a column of three or four words a line, 400px tall.
- **Last event:** a 48px line under the title bar: the time in Dim Steel tabular figures, what happened, and the result in its colour ("confirmed" in Running Green, "waiting for you" in Prompt Amber, a failure in light red). LOG opens the last eight events in a floating list, each whole; the line itself ends a long one with an ellipsis. CraftBeerPi's own notifications go in word for word, as "Title: message" with "from CraftBeerPi" (for example "HLT pump: Sparge has ended, so the HLT pump is off."). When the screen switches off a pump that has its own override switch, on its own or with ALL OFF, the result adds "its override switch can still run it" in Soft Steel, because "confirmed" only means CraftBeerPi switched its output off.

### Recipe Column
- The recipe name, a status line ("Running · step 3 of 7"), then START (a lamp button, held for one second), STOP and NEXT STEP in three equal columns, then the step list, which is the only part of the monitor screen that scrolls (when brewing by hand, the recipe book's list takes that role).
- **The boil waiting for the brewer** ("Ready to boil?", CONFIRM_BEFORE_BOIL): nothing is active, so the status line says "Ready to start · step 5 of 7", the boil step says WAITING FOR YOU, STOP is greyed ("not running") and held START starts the boil, as START THE BOIL in the title bar does. NEXT STEP is greyed and, tapped, says "The boil is waiting for you. To start it, hold START here or START THE BOIL at the top.": CraftBeerPi takes NEXT here as starting the boil, so it would put heat on with two taps under a question about skipping it.
- **Step row:** the number in the darker band, the title in Row type, temperature and minutes in Detail type, and the status at the right: "✓ DONE" in Running Green, or an empty ring for steps to come.
- **Current step:** Current Step Blue with its edge and ink, a large white countdown ("23:41 LEFT"), and the 8px progress bar. Before its countdown, the step says what it waits for in the same place: HEATING, COOLING, WAITING, or WAITING FOR YOU in a brighter amber (#ffd27a) while CraftBeerPi's question under the step's name waits for the brewer, including a boil held before it starts. A step with no timer says NOW, and a SpargeStep after "Sparge started" says SPARGING. A SpargeStep's temperature is the sparge water's, so it reads "water 168 °F". During the boil, additions are listed by minute, name and amount; the one that is due is bold amber with "· add now", and added ones are dimmed with a tick.
- **Brewing by hand:** the same column shows "No recipe running", the timers (below), and the recipe book with a LOAD button for each recipe. With an older CraftBeerPi, which has no timers, it shows one rest timer instead (600, up to 88px, tabular) with −5 MIN, +5 MIN and START TIMER, kept by CraftBeerPi so every screen shows the same countdown; START TIMER's hint says so ("alarm at zero, on every screen").

### Timers (approved by Scott and built 11 Nov 2026; the mockup's default)
- **Section:** TIMERS (Title capitals) with the SOUND switch at its right, in the recipe column: below the step list while a recipe runs, in place of the rest timer when brewing by hand, and before the steps or recipe book wherever the page stacks. Up to four rows, then + TIMER (56px). Its own note line says why + TIMER is refused at four. While a timer's editor is open, + TIMER isn't shown (one editor at a time), and on the one-screen layout (1180px and wider) the step list, or by hand the recipe book and its two buttons, make way for the editor rather than shrinking to a sliced row; the header still says which step runs, and alerts still come in the title bar.
- **Row:** Raised Slate, 6px corners. A button on the left holds the name (600 20px Barlow Condensed), the state in 14px Soft Steel capitals ("of 15:00", "PAUSED · of 15:00", "ready") and the time (600, up to 44px, tabular) at its right; it opens the editor. One command button at the far right: START, PAUSE, or START with "carry on"; while CraftBeerPi answers it, STARTING… or PAUSING…, and while the timer waits on anything else it keeps its label, greyed. A 4px Countdown Blue bar along the bottom edge shows this countdown's progress (Soft Steel while paused).
- **Run out:** the row turns Dark Amber Wash with a Prompt Amber border, "TIME'S UP" and the time counting up ("+0:12") in Prompt Amber, and two buttons across its width: +5 MIN and a Panel White OK ("stops the alarm").
- **Editor:** under its row, or where + TIMER was. A 2px Selection Blue border with its title (NEW TIMER, CHANGE STIR) set into the top edge like a legend. NAME box and the names to pick; MINUTES −1, box, +1 and six presets (5 10 15 20 30 60), or, while it counts, "Time left" with −1 MIN, +1 MIN and +5 MIN applied at once; then the actions, the main one in Selection Blue (START, SET or DONE). Removing a running or paused timer asks once in a Dark Amber confirm box; a stopped one, or one that has run out, goes at once, and its alarm with it. While it is open the other timers shrink to a 44px line with name and time.
- **Names to pick:** the names in CraftBeerPi's BREWDAY_TIMER_NAMES setting (default Hop stand, Yeast, Vorlauf), as 46px command buttons three to a row, in the setting's order, the first six; capitals, a long name wrapping up to three lines. A tap fills NAME and presses the button; a second tap clears it. Nothing is pre-filled: an unnamed timer is "Timer 3". A name another timer has is greyed, and its tap or a typed copy says "Another timer is already called Yeast. Give this one another name, so you can tell their alarms apart." A blank setting shows one muted line instead: "No names to pick: BREWDAY_TIMER_NAMES in Settings is blank."
- **SOUND:** KEEP BOILING's lit box with "SOUND", a switch for this screen only (timers and CraftBeerPi's alerts). Until the browser allows sound after a reload: an unlit amber box and "SOUND · TAP TO ALLOW" in Prompt Amber. The first tap or key press anywhere allows it (not Escape, which a browser doesn't count); a press on SOUND itself allows it and keeps it on. Switching SOUND on, or allowing it, is silent (Scott, 12 Nov 2026: "I don't want to hear a sound when I click the "SOUND" box for the timer. ONly when timer expires"): the lit box and the label say it's on, and Settings' Try plays the sound on purpose. The press starts a silent one-sample sound, so Safari on an iPhone lets the alarms play later.
- **Phone strip:** under the step strip's "Next" line, a 44px line "TIMERS Stir 7:12 · Yeast paused 6:12" (a finished one in Prompt Amber) that jumps to the section.

### Rig Line Drawing
- 3px Drawing Line Steel outlines over Vessel Interior Slate, with names inside the tanks (700 24px condensed, Drawing Label Steel). The hot liquor tank shows the HERMS coil and an element, the mash tun a false bottom drawn as dots, the boil kettle an element.
- Idle coils and elements are Idle Element Steel. The coil turns Wort Gold while the wort pump runs and the wort is drawn going through it; an element turns Element Orange, with its glow, while it heats.
- Pipes are 5px and Still Pipe Slate when idle. While their pump is confirmed running they take their liquid's colour, white dashes (5px on, 19px off) flow along them once every 0.9s, and arrow-heads in the same colour show the direction.
- Each pump's line branches, as on the rig. The wort pump's line splits at a tee just past the pump: round the HERMS coil and back into the mash tun, or down and across to the boil kettle. The HLT pump's line splits at the top corner: back round the hot liquor tank, or along the sparge line over to the top of the mash tun.
- **Hand valves:** one on each branch, four in all: the coil line, the boil kettle line, the HLT return and the sparge line. Open is a hollow bowtie whose outline takes the liquid's colour while that pipe flows; closed is a solid Drawing Line Steel bowtie. Each valve says OPEN or CLOSED in the tag style. Under the boil kettle, two lines in the tag style say where the positions come from: "VALVES ARE SET BY HAND", then "SHOWN FOR RECIRCULATING" or "SHOWN FOR STEP 4 (SPARGE)". While a SpargeStep waits for "Sparge started", each valve that has to change keeps its drawn position, takes a Prompt Amber outline, and its tag says where it must go, in Prompt Amber: "SET OPEN" or "SET CLOSED"; the second line reads "SET THEM FOR STEP 4 (SPARGE)" in Prompt Amber. The HLT return's run is too short for "SET CLOSED", so that tag sits left of the riser, level with its valve, while it is marked.
- Each pump is labelled underneath, with RUNNING in Running Green or OFF in Dim Steel. While a pump with its own override switch is off, a third line in the tag style reads "UNLESS OVERRIDE SWITCH IS ON".
- **After the boil starts** (Scott chose it on 12 Nov 2026, "2. The pump moves, with the chiller drawn on its loop"): the wort pump's hoses are on the boil kettle, so the drawing puts the pump there, the moment its step stops being "Ready to boil?". It sits under the kettle on a short loop: out of the kettle's bottom, through the pump, through a CHILLER box (Vessel Interior Slate, a 2.5px Drawing Line Steel outline, its name inside, never lit itself), and up into the kettle's top through the runoff's own riser and inlet. Its labels go beside it, as the valve note has the space under the kettle. Its old place by the mash tun is left empty, as its hoses are, and nothing on the mash tun's side lights, the coil included. The valves are drawn as before the boil: for recirculating, so a running HLT pump still goes round the hot liquor tank. It stays there after the recipe finishes, for the chill and the transfer, while CraftBeerPi keeps the finished recipe's steps (Scott, 12 Nov 2026: "Yes, keep it at the kettle until then"). It goes back by the mash tun when a recipe is loaded or reset, and while the mash tun's AUTO is on, because its HERMS runs the wort pump through the coil.
- Because the graphs make the drawing shorter, its labels are set larger as it shrinks: up to 1.3 times for pump names, states and tags, and up to 1.15 times for vessel names. In a browser window they come out about as big as they were before the graphs. A tag that hangs under its valve moves down as it grows, so it never touches the bowtie: the sparge valve's keeps about a third of its own height clear.

### Connection Lost and Reduced Motion
- **Connection lost:** the connection lamp blinks; the banner says "No connection" and how old the readings are; readings turn Stale Grey without their glow and show "Last reading 48 s ago"; the drawing drops to half strength, with the pipes stopped and the pumps reading "LAST: RUNNING"; lamp strips dim to 35%; and every control is paused with "No connection. Controls are paused."
- **Reduced motion:** the flowing pipe dashes, the marching stripes and the blinking connection lamp stop. The one-second hold fill still runs, because it shows how long to keep pressing.

### Named Rules
**The Held Heat Rule.** Switching heat on by hand (an element, a vessel's AUTO, the recipe's START, and START THE BOIL when the boil waits for the brewer) needs a press held for one second, by pointer or with Space or Enter. Letting go early starts nothing and says "Keep holding for one second." Starting a pump, and anything that switches off or stops, is one tap. Once started, a recipe changes targets and modes as its steps require, and skipping ahead to the next step asks first. While the boil waits for the brewer, NEXT STEP is greyed, because CraftBeerPi would take it as starting the boil. Changing a level is not switching heat on: a new target, boil power or element power is set with a tap on SET after adjusting it, and the boil kettle's −5 %, −1 %, +1 % and +5 % are one tap each, whether or not the element is heating, because turning a boil down to stop a boil-over has to be quick. KEEP BOILING is a setting of the AUTO that is already running, so it is one tap too, even though ticking it can bring back full power. For the same reason a tap on the boil element in AUTO pauses its heat at once; carrying on is heat, so it takes a held press.

**The Answer At The Button Rule.** Every command shows what happened on the button that sent it: waiting (marching stripes, "SWITCHING ON…", "SENDING…"), done (the new state, and "confirmed" on the last-event line), or failed (a red outline and "DID NOT STOP · tap to try again", plus an alarm banner).

**The Say Why Rule.** A control that can't be used right now stays on screen. When tapped, it explains why in its faceplate's note line (cleared after six seconds), in the recipe column's note line, or in a toast.

**The One Pulse Rule (with the timers, built 11 Nov 2026).** Only an alarm nobody has answered pulses, as on a process-control display: a timer that has run out. Its row, its prompt in the title bar and a frame round the whole screen (a 4px Prompt Amber edge with a soft glow inside) fade together from 0.15 to full and back, 1 s each way, until OK or +5 MIN on any screen; with reduced motion they stay lit and still. One slow pulse is far under WCAG's three flashes a second, and OK is the way to stop it. With SOUND on, the same alarm beeps three times every 3 s; other alerts beep twice, once (Scott kept those two beeps on 12 Nov). Nothing else makes a sound: not a press on SOUND, nor any other button.

**The Mode Tells The Truth Rule.** The line under the window never contradicts MODE. AUTO with no target (unset, 0 or below, which SV shows as "– –") runs but holds nothing, so nothing heats for it. The line says so at once, in Prompt Amber, and names what won't heat: "No target, so the HLT won't heat" on the mash tun, "Not heating: the mash tun has no target" on the hot liquor tank under the HERMS, and "No target, so it won't heat" on a kettle with its own AUTO. It never says MANUAL while MODE says AUTO. CraftBeerPi's own warning follows in the title bar after 5 s, and both go once the kettle has a target or leaves AUTO. Scott, 10 Nov: "I think a "SV" was not set - but it should pop up a warning in that case".

**The Trend In The Window Rule.** A vessel's temperature history belongs in its own PID window, under the PV and SV it explains, on its own scale, with real gridline values and clock times. Never a separate chart panel, never one plot shared by the three vessels, never a bare sparkline. The three graphs always show the same span.

**The Pumped-Only Flow Rule.** A pipe shows its liquid's colour and moves only while CraftBeerPi reports its pump running, and only along the branches its hand valves are drawn open for (The Hand Valve Rule). Before a start is confirmed, and whenever the connection is lost, the pipe stays still and slate. CraftBeerPi can't see a pump's own override switch, so a pump that has one says so under its label instead of the drawing guessing.

**The Hand Valve Rule.** CraftBeerPi can't see the hand valves, so the drawing never claims to know them: it draws them as the recipe needs them and says so under the boil kettle. From the start of the runoff step until the boil starts, including the hold at "Ready to boil?", the wort goes to the boil kettle and the HLT pump's water goes to the top of the mash tun: Scott fly sparges (9 Nov). The runoff step is a SpargeStep, whatever its name, or a step named for the runoff (a name starting Sparge, Fly Sparge, Batch Sparge, Continuous Sparge, Lauter or Runoff), the same test as the core's first-wort reminder. That holds even while the mash tun's AUTO still runs the wort pump for the HERMS. A SpargeStep is the exception at its start: while it heats the sparge water and waits for "Sparge started", the brewer hasn't switched anything yet, so the drawing stays on recirculating and, once it waits for the brewer, marks the valves to change in Prompt Amber; it shows the runoff from the press on. One set of valves serves a fly and a batch sparge, because only the running pump's line lights. At any other time, and with no recipe, the drawing shows recirculating.

**The Hoses Rule (core 1c08d4c, 11 Nov 2026).** When a hose has to move, CraftBeerPi switches its pump off, not the screen: the wort pump as a SpargeStep starts, the HLT pump as the sparge water is ready and the step asks "Sparge started", the HLT pump as the runoff ends (the wort pump runs on, draining the mash tun), and whichever still runs as the boil starts. The screen shows the lamp go to OFF and says why in CraftBeerPi's own words: the sparge question names the pumps that are off ("…ready at 168 °F, and both pumps are off."), and the event line carries CraftBeerPi's notification word for word. The brewer starts the pumps again by hand. Scott, 11 Nov: "Any time I need to change hoses or "valves" that respective pump should be off".

## Do's and Don'ts

### Do:
- **Do** give every vessel a PID faceplate: PV in Process Red (#ff4b3e) at about twice the size of the SV in Setpoint Green (#3ddc6f), in a black window, with OUT and MODE beside them.
- **Do** put each vessel's temperature graph in its PID window under its PV and SV: PV red, SV green, OUT as an orange band, its own scale, and 10 MIN, 30 MIN and DAY beside it; tapping any graph steps all three to the next span.
- **Do** top every equipment control with an 8px lamp strip and write the state on the same button: HEATING, RUNNING, OFF, DID NOT STOP. Leave a number the window already shows off the button (the element's power is OUT).
- **Do** require a one-second held press (pointer, Space or Enter) to switch on an element, a vessel's AUTO or the recipe, or to start the boil from its question, and make switching off and stopping a single tap.
- **Do** give a long question the banner's whole width for its words on a phone, with its buttons under them, and the title bar's second row to itself up to 1023px wide.
- **Do** show the boil power, the setting, as the boil kettle's green readout while its target is BOIL (BOIL 45 %), with OUT beside it for what the element is doing; settable at any time, also while a recipe runs: −5 %, −1 %, +1 % and +5 % beside the element in AUTO, and the framed readout itself (or BOIL POWER in TARGET's editor) for an exact number.
- **Do** give the boil kettle the HLT's TARGET, with BOIL as one more value, and let a temperature below BOIL read exactly like the HLT's: SV, OUT and the HLT's lines.
- **Do** show KEEP BOILING only while the target is BOIL; a hold never uses it.
- **Do** let a tap on the boil element in AUTO pause the heat for a boil-over, show PAUSED in Prompt Amber and count the pause on the line under the window.
- **Do** show each command's outcome on its own button: marching stripes while waiting, the new state once confirmed, a 2px red outline and "tap to try again" when it fails.
- **Do** keep unavailable controls visible and explain why when they are tapped, in the note line (#ffd9a0) or a toast.
- **Do** say on the line under the window, in Prompt Amber, when a vessel's AUTO runs with no target, and what won't heat because of it.
- **Do** keep the recipe on the brew-day screen: down the left on a monitor, below the faceplates on narrower screens.
- **Do** colour and animate a pipe only while its pump is confirmed running: cyan (#46b8ea) for hot liquor, gold (#e9b33b) for wort.
- **Do** draw the hand valves as the recipe needs them and say so under the boil kettle ("VALVES ARE SET BY HAND"); CraftBeerPi can't see them.
- **Do** grey out readings and show their age when the connection is lost, stop the pipes and pause the controls.
- **Do** keep tap targets at least 44px tall: lamp buttons 72px and command buttons 62px on a monitor (66px and 56px when the screen is 1000px tall or less), 56px and 50px on a phone.
- **Do** set vessel names, tags, tabs and button labels in Barlow Condensed capitals, and give every changing number tabular figures.
- **Do** show the brewery's name from Settings in the title bar at every width, phone included: it is what tells the rig from a simulator.
- **Do** say before the press when a tab opens another program in a browser tab of its own: an icon after its name, and words for screen readers.

### Don't:
- **Don't** show vessel temperatures as dial gauges or needles; Scott turned them down.
- **Don't** plot the three vessels' temperatures on one shared scale; Scott turned that down too.
- **Don't** draw a graph without its scale and times, or move the graphs out of the faceplates into a panel of their own.
- **Don't** draw the vessels as shaded or realistic steel kettles; the rig is a clean line drawing.
- **Don't** make the SV as big as the PV, or swap their colours.
- **Don't** fall back to a grid of cards with numbers and toggle switches, or anything else that looks like a generic web app.
- **Don't** use red for off or stop. Red is the PV and faults; off is a dark grey lamp strip (#3a4856).
- **Don't** let colour be the only sign of a state.
- **Don't** call a vessel MANUAL anywhere while its MODE says AUTO; AUTO with no target is still AUTO.
- **Don't** let a single tap or click switch on an element, a vessel's AUTO or the recipe, or start the boil; and don't offer NEXT STEP while the boil waits, since CraftBeerPi would start the boil with it.
- **Don't** put the boil power behind the element's button or lock it while a recipe step runs; Scott turns the boil down mid-recipe.
- **Don't** take OUT off a vessel's window: it is the element's power now, and on the boil kettle it differs from the green boil power while it heats up, pauses or runs in MANUAL. Scott, 11 Nov 2026: "BoilPower's display has lost its current 'out' element power number? Please put it back". Don't put the % back on the element's button either: "I'd like the "HEATING xx %" button to only show HEATING".
- **Don't** show the boil point as the boil kettle's SV while its target is BOIL: BoilPower doesn't hold that temperature, it only stops full power there. Show the boil power.
- **Don't** make the HLT's or the mash tun's readings into buttons; only the boil power, which has no room beside AUTO/MANUAL, is one.
- **Don't** switch to a light theme; the dark panel is Scott's stated preference.
- **Don't** remove controls on a phone; the phone drops only the drawing.
- **Don't** use blue for equipment state; blue is for where you are and what you are choosing.
- **Don't** play a sound as feedback for a press, SOUND included. A sound means something needs Scott: a timer that has run out, or a new alert, question or error. To hear the sound on purpose, Settings has Try.
- **Don't** draw the wort pump going through the HERMS coil, or anywhere on the mash tun's side, once the boil has started; and don't run new pipes across the drawing to reach the boil kettle. Scott: "I don't want the symbols to become too chaotic."
