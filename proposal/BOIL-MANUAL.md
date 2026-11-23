# The boil kettle's MANUAL (approved by the brewer on 22 Nov 2026)

Approved as proposed, with one addition of his (MAN where AUTO is usual, below), and ready to build: BUILD-NOTES.md's
"The boil kettle's MANUAL at the boil power, and MAN where AUTO is usual". It is the mockup's default now;
`?bkman=today` shows the faceplate as built before, and `boil-manual.html` puts the two side by side.

## What the brewer asked

On 22 Nov: "I don't know if the Manual function on the boil kettle makes sense". Then, from the simulator on port 8012:
"the manual power seems stuck at 70% and I don't see an intuitive way to change it. In fact, I got confused, thinking I
was using the BoilPower plugin but I wasn't."

## What MANUAL does today

- **In AUTO, BoilPower drives the element:** full power below the boil threshold, the boil power (Boil_Power) from it,
  or a PID while it holds a temperature below the boil.
- **Leaving AUTO switches the element off.** MANUAL and ALL OFF both run BoilPower's `on_stop`, which turns the
  element off and ends a pause. BoilPower does nothing more until AUTO starts again.
- **By hand the element heats at a level of its own.** CraftBeerPi keeps two levels for each element (actor): the one
  it runs at now (`power`), which AUTO changes every few seconds, and the brewer's own level (`manual_power`), which
  AUTO and the recipe's steps never change; only a command made directly does (`cbpi/api/automation.py`). Switching an
  element on without a level, as Brew Day's BOIL ELEMENT and the Hardware page's switch both do
  (`POST /actor/{id}/on`), runs it at the brewer's own level (`actor_controller.py`, `on()`). On 8012 the Boil
  Heater's is 70 %.
- **Nothing on Brew Day shows or sets that level.** With the current BoilPower, the window's framed number sets the
  boil power in MANUAL as well, and says it's "kept for the boil in AUTO". With an older BoilPower the same button set
  the element's own level instead ("POWER 100 % · used by hand"). Today only the old Dashboard's button for the actor
  sets it (`dashboard/widgets/Button.js`).
- **The Hardware page's switch heats at it too.** One tap switches the boil element on at its own level, 70 % on 8012.
  The page shows "on at 70 %" once it's on; while it's off it says only "off · one tap".

So in MANUAL the window says BOIL 45 % while OUT says 70 %, and the 70 % can't be changed where he looks. That's what
happened on 8012: he took the boil power on the window for what the element was doing.

## What changes

MANUAL stays. In MANUAL the element heats at the boil power, the same framed number AUTO boils at.

- **The framed number reads HAND in MANUAL,** in the same place, the same green and the same frame, with "change" as
  today; BOIL in AUTO. It's one number, and it's what the element heats at in both modes.
- **The line under the window says it:** "MANUAL · heats at 45 % by hand" with the element off, "Heating by hand at
  45 %" while it heats. OUT shows 45 % too while it heats.
- **−5 %, −1 %, +1 % and +5 % stay in MANUAL,** either side of BOIL ELEMENT, as in AUTO. While the element heats, one
  tap changes it at once and OUT follows; with it off, the tap sets what it will heat at. The power box (tap the framed
  number) does the same.
- **Turning the element on is still a held press,** and leaving AUTO still switches it off. Between the steps the
  element's button says "hold to turn on" or "tap to turn off"; where it has a row of its own (windows about 900 to 970
  and 1180 to 1320 px wide), "BOIL ELEMENT · hold to turn on", as today.
- **LOG names the power:** "BOIL ELEMENT on at 45 %". A change reads "Boil power 44 % (was 45 %)", with "used when you
  heat by hand" while the element is off.
- **A temperature to hold** (the whirlpool's 170 °F) stays in the window as SV in MANUAL, as the hot liquor tank's
  target does, though MANUAL doesn't use it. The line gives the power while the element is off, OUT while it heats, and
  the steps still change it. Heating by hand, the line says "Heating by hand · won't stop at target", as The By Hand
  Rule has it today.

## Why this way

1. **MANUAL stays, because it's the way to heat when AUTO can't.** AUTO switches the element off whenever the probe
   gives no reading it can trust (none, not a number, or too old), so without MANUAL a probe that fails mid-boil would
   end the boil. A mode row of AUTO and OFF would lose that.
2. **One number, not two.** On 8012 the window showed one power and the element ran at another, and which one counted
   depended on the mode. That's the slip waiting to happen: the same place showing different things in different modes.
   With one number, what the window says is what the element does, in AUTO and by hand. On 10 Nov he asked for the
   element's power to show once ("I don't need the heating element power echoed so many places").
3. **HAND, not BOIL, in MANUAL.** The number is the same, but in MANUAL nothing boils for him: the element just runs at
   it until he turns it off. The word says so where his eye already goes, and MODE still says MAN.
4. **The steps stay.** DESIGN.md hid them in MANUAL because they'd have seemed to set the element's own level and
   didn't. Now they do, and turning a boil-over down by hand has to be as quick as in AUTO.
5. **The cost: a power set by hand is the boil power AUTO uses next.** Turn it up to 100 % by hand and AUTO would boil
   at 100 % until it's turned down. The window shows it, the same number in the same place. A recipe started from its
   first step goes back to the usual boil power, if one is set in Hardware. And AUTO already runs full power until the
   wort boils, so heating up by hand is rarely needed.

Considered and not proposed:

- **No MANUAL: AUTO | OFF.** Simplest to read, but nothing could heat the boil kettle when AUTO can't.
- **A level of its own in MANUAL,** shown as HAND and set there, kept apart from the boil power. Turning it up by hand
  wouldn't change the boil's 45 %, but the window would show 45 % in AUTO and perhaps 70 % in MANUAL, in the same place:
  two numbers again, the confusion of 8012.

## What it needs

| Change | Where |
|---|---|
| HAND in place of BOIL in MANUAL, the line's words, the steps and the narrow element button in MANUAL, LOG's "on at 45 %", and MODE's MAN boxed in Prompt Amber where AUTO is usual. In MANUAL the framed number shows the element's own level (`manual_power`), which the server change keeps equal to the boil power, so it can never show a level the element won't heat at | React UI (`brewday`'s boil kettle) |
| While AUTO isn't running, the element's own level stays equal to the boil power. BoilPower sets it in `on_stop`, after switching the element off; in `set_boil_power` when AUTO isn't running (with the element's power at once if it heats by hand); when a recipe's start puts back the usual boil power; and once when CraftBeerPi starts. It sets it as the brewer's level, outside `automation()`, so that `manual_power` changes. Then the Hardware page's switch heats at the boil power too | Server (the BoilPower plugin) |
| Nothing | Dashboard layout files |

Without the server change the screen could send the level itself (`POST /actor/{id}/set_power` with the boil power,
before BOIL ELEMENT goes on by hand and with each change in MANUAL). That covers Brew Day only: the Hardware page's
switch would still heat at whatever level was last set. With an older BoilPower, the screen keeps today's behaviour.

## What it doesn't change

- AUTO, the pause for a boil-over, KEEP BOILING, a temperature held in AUTO and the boil power box.
- The hot liquor tank and the mash tun. Their elements also heat by hand at their own level, which nothing on Brew Day
  sets; there is no power on their windows to be mistaken for it, and nobody has asked.
- The Hardware page. With the server change its switch heats at the boil power and says "on at 45 %" once on. It could
  also say what a tap would heat at while the element is off ("off · heats at 45 % · one tap"); that isn't proposed.

## MAN where AUTO is usual (the brewer's addition, 22 Nov)

His words, with his answer: "make the 'MAN' under MODE yellow or some other indication that I'm not using auto when I
probably should be."

- **What shows:** MODE's MAN in the window, boxed in Prompt Amber (amber letters in a 2 px amber frame with rounded
  corners). Nothing moves as it comes and goes. Its tooltip, and the words a screen reader says after MAN: "In
  MANUAL, BoilPower isn't running the boil kettle, as it does in AUTO."
- **When:** the boil kettle is in MANUAL, its probe gives a reading AUTO could work from, and either its element heats
  by hand, or a step that boils or holds a temperature in the boil kettle runs (the Boil, a whirlpool held at
  170 °F).
- **When not:** the element off with no such step (MANUAL as the kettle's resting state: the mash, the sparge, brewing
  by hand with nothing on); the boil waiting for the brewer to start it ("Ready to boil?"), as nothing heats then in
  either mode; a probe with no reading, as MANUAL is then the only way to heat; and no connection, as nothing on the
  window is current then.
- **Why amber:** Prompt Amber marks what is waiting for the brewer, and that includes a controller that isn't
  controlling as it should: AUTO with no target is already amber (The Mode Tells The Truth Rule). This is the same kind
  of thing, a mode he probably needs to put right. Machine lamps make yellow mean "abnormal" too (IEC 60073). Not red,
  which is for faults; not orange, which is heat; not blue, which never shows the state of equipment. The frame says it
  without colour, as a control room marks a controller that isn't in its usual mode.
- **Why so narrow:** MAN is the boil kettle's resting state for most of a brew day. Boxed all the time it would teach
  him to ignore it, and amber would stop standing out.

## In the mockup

- `brew-day.html`, in every boil kettle moment: the default since the brewer approved it. New moments: `#bk-hand`
  (just under a boil, the element on by hand, as on 8012; MAN boxed), `#bk-hand-off` (the same, with the element off;
  MAN plain) and `#bk-man-boil` (the boil running with the kettle put in MANUAL and its element off; MAN boxed). With
  `?bkman=today` they show the screen as built before: BOIL 45 % with OUT at 70 %, and MAN plain.
- `boil-manual.html`: the faceplate as built before and as approved, side by side, at four moments, on a small window,
  a laptop, a monitor and a phone.

## How it was checked

- 12 presses (`bk_presses.py`), at 1920 × 950: in MANUAL with the element off, HAND 45 %, OUT 0 % and the line; −1 %
  while off, logged as "used when you heat by hand"; the element on by hand at 44 %, with OUT, the line and LOG; +5 %
  while it heats, with OUT following at once; SET 60 in the power box; the element off again; AUTO reading BOIL with the
  steps; a whirlpool hold put in MANUAL (SV 170.0 kept, the line, the steps), heated by hand (OUT 45 %, the By Hand
  caution) and turned down 5 %; and the screen as built before (`?bkman=today`).
- The line and the element's button measured at 390 × 844, 820 × 1180, 900 × 1000, 1000 × 800, 1180 × 860,
  1280 × 800, 1366 × 768, 1440 × 900 and 1920 × 1080: one line each, nothing cut, no page errors. At 1180 × 860, the
  narrowest faceplate (229 px inside), at 100 %, "MANUAL · heats at 100 % by hand" has 42 px to spare and "Heating by
  hand at 100 %" 85 px.
- Before the approval, pictures of the screen without the proposal, against the copy in `design/brewday` (UI
  2e441e0), at 390 × 844, 820 × 1180, 1180 × 860, 1440 × 900 and 1920 × 1080: all 100 the same, in 20 moments: 13 of
  the boil kettle's (among them the sparge in MANUAL, the boil, a pause, a whirlpool hold and the hop stand), heating by
  hand, AUTO with no target, a hop alert, the timers and brewing by hand.
- Made the default, with MAN's box, on 22 Nov: 23 presses, the 12 above plus 11 for the box (heating by hand, its
  sentence, nothing moving, off again, AUTO, mid-boil with the element off, no reading, no connection, the boil
  waiting for the brewer, the sparge, a whirlpool hold in MANUAL, and as built before). Pictures of every moment
  against UI 1fca41c are in BUILD-NOTES.md's section.

## The brewer's answers (22 Nov 2026, through Brett)

1. In MANUAL the boil element heats at the boil power, one number for AUTO and by hand, as proposed.
2. MANUAL stays; plus his addition: "make the 'MAN' under MODE yellow or some other indication that I'm not using auto
   when I probably should be" (the section above).
