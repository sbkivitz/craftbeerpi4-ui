# The Steam Slayer on the boil kettle's lid (proposal, 25 Nov 2026; approved to build the same day)

The brewer's rig has a Steam Slayer: a steam condenser on the boil kettle's lid. A fine mist of cold water inside it
turns the boil's steam back into water, which drains away, so the steam doesn't fill the garage. As the wort nears the
boil, the boil step's lid reminder tells him to turn the mister on. He asked for it in the drawing.

What he said about it:
- How the mister is turned on: "mister is turned on by hand today but there's a possibility that I could use a
  solenoid to do it in the future".
- When it goes off: "Later, once the wort has cooled down", not as the boil ends. Asked below what temperature:
  "whenever I was reminded of putting the lid on".
- Whether the lid is off until the reminder: "It varies."
- The mister's water drawn in blue, even when it is set by hand: "I like the blue representation of the water".

What to build is in BUILD-NOTES.md, "The Steam Slayer on the boil kettle's lid: ready to build (25 Nov)". Without a
condenser on the boil kettle the screen is as it is today.

## Read first

- Norman, The Design of Everyday Things: a drawing is a conceptual model; show what can't be seen as honestly as
  what can, and give each state a signifier you can see.
- High-performance HMI (ISA-101, Hollifield) and the checklist's H3 and F17: normal stays quiet, and colour is for
  what needs attention.
- Nielsen #1 and the checklist's F9: what is asked for isn't what is so. Keep a state the screen can't see apart from
  one it reports, and never let a guess look like a report.
- WCAG 1.4.1 and 2.3.3, and the checklist's F16 and D27: never colour alone, and never motion alone; every state has
  words or a shape as well.
- NN/g, proximity: state words sit beside the thing they describe.
- The checklist's D16, D17 and D19: a prompt says what happened and what to do, waits for an answer, and is worth the
  interruption only if something has to be done.

## What the screen knows, and what it doesn't

- **It knows:**
  - the boil step's state;
  - the boil kettle's temperature, during the boil and after it;
  - the lid reminder: BoilStep's LidAlert, given once a brew as the wort reaches the lid's temperature, 203 °F (95 °C,
    BoilStep's `lid_temp`). Its title is the steps_boil_lid_alert setting, on the simulators "Turn on the Steam Slayer
    mister"; its message is "Reached temp close to boiling"; its one answer is Done, and it stays up until answered;
  - with a mister CraftBeerPi switches, that actor's own state. The core already has the slot: the
    steps_boil_actor setting names an actor that the boil step switches on at 203 °F. Today it switches it off as the
    step ends (BoilStep's on_stop).
- **It doesn't know:** whether the lid is on, or whether a mister turned by hand is running.

## The design

### In the drawing (monitor and laptop)

Beside the boil kettle, to its right:

- a duct out of the right of the lid into the Steam Slayer's column;
- the mister's water coming down into the column's top through its valve;
- the mister's nozzle inside the top of the column and, while it mists, its spray, drawn as three dotted lines;
- the drain at the column's foot;
- STEAM SLAYER over it.

The kettle's lid gets a seam: a line across the top of its walls, a little wider than the kettle, so it reads as a
lid. Everything is in the drawing's own steel, as quiet as a pipe at rest.

**Set by hand, the mister's valve is a hand valve like the others.** It has a valve's tag, and the drawing's own
"VALVES ARE SET BY HAND" already covers it. It is drawn as the brew needs it, as the hand valves are drawn as the
recipe needs them.

| Moment | The lid | The mister's valve and water | Its tag |
|---|---|---|---|
| Before the lid reminder | the seam | closed; the water line steel, no spray | CLOSED |
| The lid reminder waiting | the seam in Prompt Amber, LID ON? in the dome | the valve in Prompt Amber, closed | SET OPEN, in Prompt Amber |
| Answered (DONE), through the boil | the seam | open; the water line and spray in blue, still | OPEN |
| A dip below 203 °F during the boil | the seam | open; blue, still; nothing asked | OPEN |
| The boil over, the wort still above 203 °F | the seam | open; blue, still | OPEN |
| Below 203 °F after the boil, the turn-off reminder waiting | the seam | the valve in Prompt Amber, still open; blue, still | SET CLOSED, in Prompt Amber |
| Answered (DONE) | the seam | closed; steel, no spray | CLOSED |

While a reminder waits, the title bar has it as CraftBeerPi gives it, with DONE, and LOG has its line, waiting for
you. The drawing marks where, in the same Prompt Amber as a sparge valve to set, and the marks go when the reminder
is answered, here or on any screen.

**The lid is asked about, not ordered.** The lid may already be on when the reminder comes, so the dome says LID ON?
rather than CLOSE LID. The reminder's own words say only to turn the mister on, and the condenser only works with the
lid on, so the question is worth its four letters. It goes when the reminder is answered.

**The blue, set by hand.** The brewer chose to see the mister's water in blue even when it is set by hand. It shows
what the brew needs, not a reading, so nothing on it says CraftBeerPi sees the water flowing:

- the water line and spray are the liquor's blue but **still**: no moving dashes and no flow arrow, which every
  line a running pump feeds has, even with reduced motion (its dots stay, only their movement stops);
- the valve itself stays steel, where a valve on a running line lights;
- its tag uses a valve's words, OPEN and CLOSED, under VALVES ARE SET BY HAND, never ON;
- the words for a screen reader say "shown open, as the brew needs it".

**After the boil it stays open until the wort falls back below the lid reminder's temperature**, 203 °F (95 °C):

- One figure for on and off, the brewer's choice: the mister is asked to go on as the wort rises past the lid's
  temperature, and to go off as it falls back below it after the boil. There is no setting of its own: if the lid's
  temperature ever becomes a setting, on and off move together.
- **Only once the boil step has ended** (its time up, or NEXT STEP), not while it runs or is stopped. A dip below
  203 °F during the boil, at a low boil power or as cold hops go in, changes nothing.
- On Test Recipe v5 the wort passes 203 °F a minute or two after the boil, as it cools for the hop stand, while
  Whirlpool Hop's "Cool down to 170 °F" question is up. The title bar shows the older question first, as always
  ("WHIRLPOOL HOP · 1 MORE WAITING"), and the turn-off reminder comes up when that is answered. The drawing marks the
  valve SET CLOSED at once, and LOG has the reminder's line, so it is seen before its turn in the title bar.

Once the wort is below 203 °F after the boil, the reminder doesn't come again that brew, and a reading that rises
again doesn't reopen the valve.

**A reminder to turn it off, once a brew** (a core change). Set by hand, the screen can't turn the mister off, and a
mister left running wastes water. CraftBeerPi asks once, when the boil kettle first reads below 203 °F after the boil
step has ended:

- title "Turn off the Steam Slayer mister" (the condenser's name, below), message "The boil is over and the wort is
  below 203 °F", one answer: Done;
- only if the lid reminder was answered this brew, so the mister was asked to be turned on;
- it stays up until answered, like the lid reminder, and comes with the same two beeps as any question;
- it can be answered, on any screen, so it isn't a nag; a mark in the drawing with no answer would have been one;
- a reading that isn't a number (NaN) never counts as below; a recipe loaded, reset or unloaded ends the wait
  without asking.

One more prompt a brew, at a moment the brewer is at the kettle, for something that has to be done.

**Switched by CraftBeerPi** (steps_boil_actor names an actor), the valve becomes a solenoid valve:
- the same valve, with a small square actuator beside it;
- its tag is the actor's own state, ON or OFF, as a pump's is, ON in Running Green;
- while it is on, its water line lights as a running pump's does: blue, with the line's moving dashes and its flow
  arrow, and its actuator's outline in blue;
- with no connection, LAST: ON and nothing lit, as a pump;
- the same rule, done by the core: on at 203 °F as today, but off when the wort falls back below 203 °F after the
  boil step has ended, instead of as the step ends. LOG says "Steam Slayer mister off: the boil is over and the wort
  is below 203 °F", and nothing asks, as there is nothing to do.

Without a condenser on the boil kettle, nothing is drawn and the drawing is as today.

### On a phone

A phone has no drawing; its valves aren't shown either. The boil kettle's faceplate gets one quiet line under its own
line (Soft Steel, 15px condensed), for as long as the kettle has the condenser:
- by hand, a valve's words: "Steam Slayer: mister closed · set by hand", then "Steam Slayer: mister open · set by
  hand" from the lid reminder's answer until the turn-off reminder's;
- switched: "Steam Slayer: mister on", with "last on" when the link is lost.

It is there all brew, so the kettle's buttons don't move when the mister comes on. The reminders themselves are in
the phone's title bar, as on a monitor.

### Where it is set

- **The Hardware page:** in the boil kettle's Vessel group, under its capacity, weight and material:
  - "Steam condenser on the lid": Not fitted (blank, the default) or Fitted, with one line of help: "Shows it in Brew
    Day's drawing, and reminds you to turn its mister off after the boil. Its mister is shown set by hand unless
    steps_boil_actor names the actor that switches it.";
  - when Fitted, its name, as the drawing, the phone's line and the turn-off reminder say it (blank: "steam
    condenser"; on the brewer's rig, "Steam Slayer").

  Not fitted changes nothing anywhere: no drawing, no reminder, and a steps_boil_actor still goes off as the boil
  step ends (The Only Improves Rule).
- **A switched mister:** set steps_boil_actor in Settings to the solenoid's actor, as the core already allows, and
  the drawing shows it switched. A button to work it by hand, a lamp on the boil kettle's faceplate like the pumps',
  is for when there is one.
- **The lid reminder's words:** the brewer's own steps_boil_lid_alert. Its default, "Please remove lid!", is for a
  kettle without a condenser.

## Not chosen

- **The lid drawn lifted off before the reminder.** The screen can't see the lid, and the brewer says whether it is
  on "varies". A lifted lid would also cross the kettle's inlet line. The lid is only asked about, while the
  reminder waits.
- **CLOSE LID.** An order, where the lid may already be on.
- **Dropping the lid mark.** The reminder's words don't mention the lid, and the condenser needs it on.
- **"MISTER ON · SET BY HAND" written beside the valve.** It ran into the kettle's inlet line at 1920 × 950, where
  the drawing's words are at their biggest. The valve's own short tag, and the note the valves already have, say it.
- **The mister drawn closed as the boil ends.** The brewer keeps it on until the wort has cooled.
- **A cut-off of its own, 140 °F (60 °C), as a setting.** Proposed first, from the vapour the wort still gives off
  and the hop stand's temperatures. The brewer turns the mister off where he was reminded to turn it on, so the lid's
  temperature serves both, with nothing more to set.
- **A mark after the boil with no reminder.** Nothing could answer or clear it, so it would sit there as a nag.
- **Steam rising from the kettle.** Decoration: it would move all boil and say nothing new.

## What it needs

| Change | Where |
|---|---|
| The Steam Slayer in the drawing, its states, marks and blue, and the phone's line | React UI (`brewday`) |
| "Steam condenser on the lid" and its name, on the boil kettle | Core (kettle fields, as capacity) and the Hardware page |
| The turn-off reminder, once a brew, below 203 °F after the boil step has ended | Core: a watcher on the boil kettle that outlives the boil step and the recipe's end |
| A switched mister off below 203 °F after the boil, not as the step ends | Core: the same watcher switches steps_boil_actor off, when the condenser is fitted |
| The lid reminder | Nothing new: BoilStep's LidAlert and steps_boil_lid_alert |

## In the mockup

`brew-day.html`, layout B:

- `#ss-heat`: the boil heating, before the lid reminder.
- `#ss-ask`: the boil kettle at 203.4 °F, the lid reminder waiting; DONE answers it.
- `#ss-on`: boiling, the lid reminder answered.
- `#ss-sag`: the 60 min hops in, the wort dipped to 201.6 °F while the boil step runs: still open, nothing asked.
- `#ss-after`: the boil over at 5:00:04 PM, the wort at 207.6 °F, Whirlpool Hop's question up: still open.
- `#ss-cool`: 5:01:30 PM, the wort at 202.4 °F: the turn-off reminder waiting behind Whirlpool Hop's question. NEXT
  STEP brings it up; DONE answers it.
- `#ss-cooled`: the whirlpool at 5:18:40 PM, the turn-off reminder answered at 5:08:14: closed.
- `#ss-switched`: boiling, with a mister CraftBeerPi switches.

`?slayer=hand` or `?slayer=switched` adds the condenser to any moment. Without it nothing changes.

## How it was checked

- `slayer_check.py`: 102 checks, all passing, no page errors.
  - Each of the eight moments at nine sizes (2000 × 1000, 1920 × 1080, 1920 × 950, 1440 × 900, 1366 × 768,
    1280 × 800, 1180 × 860, 1024 × 768, 820 × 1180). Each state's tag, lid tag and spray. Its words inside the
    drawing, clear of every other word and part of the drawing and of + TIMER and SOUND, measured from the capitals'
    tops to the baseline.
  - The blue at 1920 × 1080: set by hand and open, the water line and spray in the liquor's blue with no moving
    dashes and no arrow; closed, steel; the solenoid on, lit with moving dashes and its arrow.
  - The lid reminder's DONE: LOG's "Turn on the Steam Slayer mister answered: Done" (confirmed), then OPEN with the
    spray, the marks gone.
  - The dip in the boil: OPEN, no reminder. The boil over above 203 °F: OPEN, Whirlpool Hop's question alone.
  - Below 203 °F: "Whirlpool Hop · 1 more waiting" in the title bar and SET CLOSED in the drawing; NEXT STEP brings
    the turn-off reminder up; its DONE: LOG's "Turn off the Steam Slayer mister answered: Done" (confirmed), then
    CLOSED, no spray, the line steel, the mark gone.
  - The solenoid: ON, lit, its actuator drawn; LAST: ON and nothing lit with no connection.
  - Four boil and mash moments without a condenser: nothing drawn, no seam, no phone line.
  - The phone's line in each state; DONE leaves the boil kettle's buttons where they were in its faceplate.
- Pictures against UI main 8de7e6d at 1920 × 1080 and 390 × 844: only the `#ss-*` moments differ. Without a
  condenser, nothing changes.
