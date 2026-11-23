# Telling Brew Day's sections apart at a glance (A approved by the brewer, 22 Nov 2026)

The brewer chose A on `cues.html`: "Section cues: A · Each kind of section on its own ground". A is now the mockup's
default, in `brew-day.css` (DESIGN.md's The Kind Of Section Rule), and `?cues=today` shows every section on the same
panel, as before. `cues.html` still shows today, A and B side by side, on its frozen copy with `cues.css`. B is not to
be built.

## What the brewer asked

Through Brett, 22 Nov, after choosing where the timers live: "At this point, the information is becoming more difficult
to discern at a glance. Can we improve color coding or other secondary queues to hint that each section describes
something different? I'm looking for a subtle shift because I actually quite love the brewDay screen now".

Brett: a faint tint or edge per section, section labels, spacing, or a colour per vessel, within the colour rules
(amber stays for what waits on him); a subtle shift; a clickable before and after, my pick marked, one question at most.

## Why the sections run together today

Every section is the same panel: the same ground (#17212b), the same edge (#2a3b4b), the same corners. The last event,
the recipe, the faceplates, the drawing and the timers all look like the same kind of box, so nothing says at a glance
that one is the plan, one the live vessels, one a picture of the plumbing and one the brewer's own countdowns.

## The two ways

- **A · Each kind of section on its own ground (my pick).** Four kinds, by their grounds, with no new colours:
  - the things that call for him share the title bar's dark band: the alarms, the last event and the tabs along the
    top, and the timers along the bottom or beside the drawing, their rows in the same slot as the last event;
  - the recipe, the plan, has a faintly cool ground (#13243b) and a 4 px blue edge (#3373b8), the colour of the current
    step;
  - the faceplates stay exactly as they are, now the brightest panels;
  - the drawing is set back: a darker ground with no edge, and a soft inner shadow, as the readings' windows are set
    into their faceplates.
- **B · The same, plus a colour for each vessel.** A as well, and a muted colour for each vessel on its faceplate's top
  edge and before its name, and on its outline in the drawing: the hot liquor tank blue (#6fb0d6), the mash tun grain
  (#b8aa7c), the boil kettle copper (#cf9470).

## Why A

1. **Grouping by region is the strongest cue there is, and needs no colour.** Things inside one boundary, or on one
   ground, read as one group, more strongly than by nearness or likeness (NN/g, the principle of common region).
2. **Colour stays scarce.** A screen with many hues looks busier and each one stands out less; one weakly saturated hue
   with greys lets the few strong colours pop (MIT 6.831, colour design). Control-room practice keeps the normal state
   muted and colour for what is wrong (High Performance HMI; ISA-101). A adds only the current step's own blue.
3. **B's colours sit close to the screen's own.** The copper is near the heating orange and the grain near the amber
   that waits for him, and the blue near the current step's. They do tie each faceplate to its vessel in the drawing,
   which the vessels' places already do when the drawing is full width.
4. **Nothing moves.** Both change grounds and edges only, so every reading, button and line stays where he knows it.
   On a phone everything below the last event is 10 px lower, as the band ends 10 px under it.

Not chosen: section labels on every part (more words to read, for parts that already have names); more space between
sections (it would take height the drawing and the step list need).

## What it needs

| Change | Where |
|---|---|
| A or B: grounds, edges and, for B, the vessels' colours, in `brewday.css` | React UI (`brewday`) |
| Nothing | Server |
| Nothing | Dashboard layout files |

## How it was checked

- `files\cues_page.py`: at four screens (1920 × 950, 1440 × 900, 1180 × 860, a phone), three moments and both places
  for the timers (as today, and beside the drawing): today's copy has no cue, A's and B's have theirs, the whole-screen
  view keeps its cue, and there are no page errors.
- By eye at 1920 × 950: the hop alert's amber still comes first; the readings' red and green are unchanged.

## The brewer's answer

A, each kind of section on its own ground, on 22 Nov 2026, with the timers beside the drawing (D), which A is built
on. Built as CSS only, as above. Two changes from `cues.css` in the build: a timer that has run out keeps its Dark
Amber Wash in the bar and the column, rather than taking the band's ground; and with no timers, + TIMER and SOUND over
the drawing's corner stay on the drawing, with no band behind them.
