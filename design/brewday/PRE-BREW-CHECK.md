# Pre-brew check: approved by the brewer (17 Nov 2026)

The brewer approved this proposal on 17 Nov: "I didn't really get a good feel for what was implemented but I'm sure
it's good. Proceed". He then added: "BK probe is closer to the door than the HLT/MT probes and may be a bit cooler via
physics". As first proposed, COMPARE PROBES would have called a good boil kettle probe off for that, so it was revised.
He then asked for it to be checked against the rig's own data from a real brew day ("look at my data from actual brew
day with gauge"). That changed it twice more: it now leaves each probe's offset out of the comparison, and it says a
probe looks off when a reading is one no room has. See "What the rig's own data says", below. Shown the result, he
chose "Yes, go ahead (Recommended)". The three checks when START is held are as first proposed.

It is now in the Brew Day mockup (`brew-day.html#prebrew`; the strip at the top lists every moment), in DESIGN.md
(Pre-brew Check, and The Warn, Never Block Rule) and in BUILD-NOTES. Brett builds it; he has started the server side.

## What was asked for

From the ideas interview (item 3, "Later"):

- Check that every probe reads a number, and that the probes agree when they're at the same temperature; that the
  clock is right; and that every addition in the recipe has a reminder.
- No test of the elements or pumps. The brewer checks the switches himself.
- A failed check warns and lets him start anyway. It never blocks.
- It must not claim to catch a probe stuck on an old reading.

The open question was when it runs, because the probes only agree at the same temperature. There was no answer, so
Brett decided, and the brewer approved it:

- **When START is held on a recipe:** every probe gives a reading, the clock is set, and every boil addition has a
  reminder. Anything that fails warns and offers to start anyway.
- **COMPARE PROBES:** a separate button, used before filling, while every vessel is empty and at room temperature. It
  shows each probe's reading and whether they agree.

## What the brewer sees

### Before filling: COMPARE PROBES (revised twice, then approved)

While a recipe is loaded and not begun, COMPARE PROBES sits under START, STOP and NEXT STEP, with "before you fill"
under it. Brewing by hand, it sits with RECIPE BOOK and BREW STEPS at the end of the column, out of the way while a brew
runs. It isn't shown once a recipe has begun, because the vessels are no longer at the same temperature.

Pressed, it opens COMPARE PROBES in its place, with DONE beside the title:

- "With every vessel empty and at room temperature." If any probe has an offset set in Hardware, it adds: "Each reading
  is the probe's own, without its offset."
- A row for each vessel, like a small PID window: the vessel's name, its probe's name in CraftBeerPi ("Boil Temp"), its
  offset if it has one ("offset +4.0 °F"), and the probe's own reading in the faceplates' red. The readings follow the
  probes while it's open.
- One sentence saying what the readings show. It goes by how far apart the highest and lowest are:
  - **Up to 2.0 °F: they agree.** "All 3 agree, 1.1 °F apart at most." A green ring and tick. Where the readings are
    the same: "All 3 agree: they read the same."
  - **More than 2.0 °F, up to 10 °F: likely where the vessels sit.** "The boil kettle reads up to 3.8 °F below the
    other two. That's likely where it sits, not its probe. To be sure, put the probe in ice water: with its +1.0 °F
    offset it should read 33.0 °F, ±0.9 °F. If it doesn't, correct its offset in Hardware." A plain ring with an "i",
    and "COOLER" in grey on the boil kettle's row. Nothing is amber, because nothing needs doing.
  - **More than 10 °F: a probe looks off.** "The boil kettle's probe looks off: it reads up to 17.5 °F below the other
    two. Where it sits can't explain that much. Check its plug and cable, then put it in ice water: with its +1.0 °F
    offset it should read 33.0 °F, ±0.9 °F." An amber disc with "!"; the row gets an amber edge and "LOOKS OFF".
  - **A reading no room has, below 35 °F or above 120 °F: a probe looks off,** however close the others are. "The
    boil kettle's probe reads 185.0 °F on its own, hotter than any room. Check its plug and cable, then…". If every
    probe reads like that: "All three probes read 32.0 °F on their own, colder than any room. When every probe is wrong
    at once, look at what they share: one bad probe or plug on their cable can do this. Unplug them one at a time to
    find it." Amber, as above.
  - **A probe gives no reading.** "The mash tun's probe gives no reading: check its plug and cable. The other two agree,
    0.9 °F apart at most." An amber disc with "!"; its row reads "– –" and "NO READING". A kettle with no probe chosen
    in Hardware, or with one CraftBeerPi no longer has, starts the sentence instead: "No probe is chosen for the boil
    kettle: choose one in Hardware." Its row reads "NO PROBE CHOSEN" or "PROBE NOT FOUND", with no probe name or
    offset.
- Under it, the rule in small print: "They agree within 2.0 °F: each probe is accurate to ±0.9 °F. Where a vessel sits
  can put it up to 10 °F from the others; more than that, a probe looks off."

It names a probe only when the other two agree without it. Otherwise it names none: "The hot liquor tank and the boil
kettle read 3.7 °F apart. That's likely where they sit, not their probes. To be sure, put each probe in ice water: each
should read 32.0 °F plus its offset, ±0.9 °F." Past 10 °F the same sentence says "so a probe looks off". If all three
disagree by more than 10 °F, it asks whether the vessels are all empty.

DONE puts what they read in LOG: "Probes compared, without offsets: HLT 63.4, mash tun 63.5, boil kettle 59.7 °F ·
3.8 °F apart" in the plain colour, "· agree" in green, and "· a probe looks off", "· every probe looks off" or
"· no reading" in light red. So the brew day keeps a record of it. Escape closes it without a line.

**Why it leaves the offsets out.** An offset can be set for brewing rather than for the probe. The rig's mash probe sits
at the HERMS coil's outlet and has +4.0 °F, so at room temperature the mash tun shows 4 °F above the others while its
probe reads the same. Compared with offsets, the rig would never agree. Compared without, a good probe agrees, and an
offset set to correct a probe shows up as that probe's difference, with its offset on its row to explain it.

**Why 2.0 °F.** A DS18B20 is accurate to ±0.5 °C, which is ±0.9 °F, so two good probes at the same temperature can read
up to 1.8 °F apart. Their readings move in steps of about 0.1 °F, so 2.0 °F leaves room for one step each way. On the
rig, the HLT and mash probes read within 0.1 °F of each other.

**Why 10 °F.** Empty vessels in one room don't all sit at the same temperature. A vessel by a door, an outside wall or
on a cold floor can stay a few degrees cooler than the rest all night, and sun or a heater can warm one. The rig's boil
kettle read 3.8 °F below the other two. The screen doesn't know where each vessel sits, so it allows up to 10 °F in
any brewery. A probe that fails rarely reads just a few degrees out: it gives no reading at all, or a wild one. A cheap
probe can read a little high or low from new; only ice water shows that, and its offset in Hardware puts it right. So
a few degrees apart is far more likely the room than the probe, and the screen says so in the plain colour. Past
10 °F, no spot in a room explains it.

**Why 35 °F and 120 °F.** Probes that are all wrong the same way agree with each other, so comparing them can't catch
it. On 11 Oct a fault on one probe's branch made every probe on the rig read 0 °C plus its offset. A DS18B20 that has
just restarted reads 85 °C, 185 °F. No brewery's room is below 35 °F or above 120 °F on brew day, so a reading there
is the probe's, whatever the others say.

In °C the screen uses 1.1 °C, 5.5 °C, and below 1.5 °C or above 49 °C, and says ±0.5 °C and 0.0 °C.

**Why it doesn't learn each probe's usual difference.** Brett suggested it could learn from the comparisons in LOG. It
doesn't, for three reasons. LOG keeps only its last eight lines, on the screen that wrote them, so learning would need
CraftBeerPi to keep every comparison: a server change. A difference learned over weeks would also learn a probe slowly
going wrong, and stop pointing at it. And a room changes with the season and with a door left open, so last month's
difference needn't be today's. Up to 10 °F already reads "likely where it sits", which covers a boil kettle by the door
on any day.

**What changed from the first proposal.** There, anything over 2.0 °F named a probe as off, in amber, with "2.7 °F HIGH"
on its row, and the readings were compared with their offsets. On the rig that would have said "don't agree" on every
brew day: the mash tun's +4.0 °F alone puts it 4 °F above the others. Now it compares without offsets, a few degrees
apart is a plain note, and only past 10 °F, or at a reading no room has, does it say a probe looks off.

## What the rig's own data says

Read on 17 Nov, without touching the rig: the 25 Oct brew day's logs, which Gauge copied from the Pi
(`C:\src\personal\cbpi-brewday-20261025\raw-sensor-logs`), and the 11 Oct probe-fault evidence
(`C:\src\personal\cbpi-rig-comms\rig\evidence-20261011`), with Gauge's notes in `cbpi-rig-comms\rig`.

- **The probes have offsets:** HLT +0.23 °F, mash +4.0 °F, boil kettle +1.0 °F (Gauge's notes of 15 and 26 Oct). The
  logs hold the readings with them.
- **25 Oct, 22:20 to 23:00, after the brew had cooled,** the probes held steady at HLT 63.6, mash 67.5 and boil kettle
  60.7 °F. Without offsets: 63.4, 63.5 and 59.7 °F. The HLT and mash probes agree within 0.1 °F; the boil kettle reads
  3.8 °F lower, as the brewer expected. Whether every vessel was empty then isn't recorded. `#probes-apart` shows these
  readings.
- **25 Oct, 09:54, with the HLT heating,** the boil kettle's probe in the empty kettle read 59.0 °F and rose slowly as
  the garage warmed. Gauge noted that it reads the air around it.
- **11 Oct, 07:04,** a fault on the HLT probe's branch made all three probes read 0 °C plus their offsets: 32.2, 36.0
  and 33.0 °F. The readings were fresh, so nothing showed them as stale. It happened again when the HLT probe was
  plugged back in, and Gauge found it by unplugging the probes one at a time. Core now refuses that reading (an
  all-zero scratchpad, in `cbpi/extension/onewire/__init__.py`), so today those probes would give no reading. Both the
  START check and COMPARE PROBES catch that.
- **Not found:** a time when all three vessels sat empty and cold together. On 25 Oct the logs start with the HLT
  already heating, and on 10 and 11 Oct the HLT and boil kettle held water. So nothing on the rig tests the 10 °F
  level; nothing seen comes near it.

### Holding START on a recipe not begun

START fills orange for a second as now. Then it says CHECKING… over "before it starts", with the marching stripes, for
under a second while CraftBeerPi answers. The first time after CraftBeerPi starts, it can take up to about 6 s while
the Pi answers about its clock.

- **Everything passes:** the recipe starts exactly as today. LOG gets one extra line before "Recipe started":
  "Checked before starting: probes, clock, reminders · all passed".
- **Something doesn't:** nothing starts. The column shows the same amber box that NEXT STEP's and RESET's questions
  use, under START:

  > **Not started yet:** 1 check didn't pass.
  > ✓ All 3 probes give a reading.
  > ! **The Pi's clock isn't set yet.** It comes from the internet a minute after the Pi starts; if not, check the Pi's
  > network. Set during a rest, it can cut the rest short.
  > ✓ All 4 boil additions have a reminder.
  >
  > [START ANYWAY · hold to start] [DON'T START]

  The three checks are always listed, in the brewer's own order (probes, clock, reminders), each marked in its place:
  a green ring and tick if it passed, an amber disc with "!" if it didn't. The passed ones are a single quiet line;
  only a failed one says what is wrong and what to do.

- **START ANYWAY** starts the recipe. It is held for a second, like START, because it puts heat on. LOG says what was
  passed over: "Recipe started · confirmed · started anyway: the Pi's clock wasn't set".
- **DON'T START** closes the box, and nothing changes. Escape does the same.
- **The box follows CraftBeerPi while it's open.** When the clock gets set a minute after the Pi starts, its line turns
  to "✓ The clock is set.", the top line to "Not started yet: every check passes.", and START ANYWAY becomes START,
  in the same place. It never starts by itself.

The other failures read:

- "**The boil kettle's probe, Boil Temp, gives no reading,** and hasn't for 3 min. Check its plug and cable."
  (Two or more: "**2 probes give no reading:** the mash tun's (Mash Temp) and the boil kettle's (Boil Temp). Check their
  plugs and cables.") Where CraftBeerPi doesn't know for how long, the line stops at "gives no reading."
- "**No probe is chosen for the boil kettle.** Choose one in Hardware." For a probe CraftBeerPi no longer has: "**The
  boil kettle's probe isn't found:** CraftBeerPi no longer has it. Choose one in Hardware."
- "**The Pi didn't say whether its clock is set.** If it has been on and online for a few minutes, you can start
  anyway. A clock set during a rest can cut the rest short." The first time CraftBeerPi asks after it starts, the Pi
  can take a few seconds to answer, so START stays on CHECKING… for up to 6 s for it. Only if it still hasn't answered:
  "**The clock hasn't been checked yet:** the Pi is slow to answer." The box asks again 5 s later and fills it in.
- "**2 of 8 boil additions have no reminder:** 1.50 oz Citra at 5 min and 1.00 oz Amarillo at 0 min (the boil step
  holds six). Watch the clock for them, or set a timer."
- A check CraftBeerPi couldn't work out says so in its place, for example "**The probes weren't checked:** CraftBeerPi
  ran into a problem." The other two still answer.

### What it doesn't do, on purpose

- It doesn't switch anything to test it. The switches are the brewer's to check.
- It says a probe "gives a reading", never that it works. A probe stuck on an old reading still gives one, and still
  agrees at room temperature if it stuck there.
- COMPARE PROBES can't tell two probes that have been swapped between vessels: at room temperature they read alike.
- It's a notice, not an alarm: no sound, nothing in the title bar, and the box only appears on the screen where START
  was held. An unmet start condition needs no action until you try to start.
- It never blocks: START ANYWAY is always there.
- It runs when START begins a recipe (after loading one, or after RESET TO STEP 1), not when START carries on after a
  STOP or a power cut. After a power cut CraftBeerPi already waits for the clock before a step carries on by itself,
  and asks you otherwise ("Resume brew?").

## Decisions

Approved by the brewer on 17 Nov:

1. **When it runs** (Brett's choice): the three checks at START, the comparison as its own button before filling.
2. **COMPARE PROBES lives on Brew Day,** under START while no recipe has begun, and at the end of the column when
   brewing by hand. The other place for it would be the Hardware page's probes, but that page is for the desk, now and
   then, and the comparison belongs to the brew-day morning.
3. **START ANYWAY is held,** as START is, rather than a tap.
4. **No sound.** The box answers the brewer's own press, and a press makes no sound.

Revised after his note about the boil kettle's probe and the rig's own data, and approved ("Yes, go ahead
(Recommended)"):

5. **Three levels instead of one limit.** Up to 2.0 °F (1.1 °C) apart, they agree. Up to 10 °F (5.5 °C), it's likely
   where the vessels sit, said in the plain colour. More than that, a probe looks off, in amber. This replaces "agree
   means within 2.0 °F", where anything more named a probe as off.
6. **It compares each probe's own reading, without its offset,** and shows the offset on the probe's row.
7. **A reading below 35 °F or above 120 °F (1.5 °C, 49 °C) means a probe looks off,** even when the others agree.
8. **It doesn't learn each probe's usual difference** from earlier comparisons.

## What each part needs

| Part | Needs | Notes |
|---|---|---|
| CHECKING… on START, the amber box, START ANYWAY and DON'T START, the box following CraftBeerPi, the LOG lines | React UI | `pbRun`, `pbDecide`, `pbItems`, `pbHTML`, `pbGo` in the mockup's `brew-day.js`. The box polls the check every 5 s while it's open. With an older CraftBeerPi that has no check, START starts as today. If the check gets no answer in 5 s, the box says "Not started yet: CraftBeerPi didn't answer the check, so nothing was checked. Hold START to try again.", and each check says in its place that it wasn't checked ("The probes weren't checked."), so a late answer fills them in where they are; the same two answers, and START ANYWAY then logs "started anyway: the check got no answer". The check belongs to the recipe START was held on (`recipeOn`, noted as the hold on START or START ANYWAY begins): if another screen starts it, clears it or puts other steps in its place, CHECKING… gives way at once, the box closes so it can't come back for the next recipe loaded, nothing starts, a hold that ends after that starts nothing, and a screen reader hears why ("The recipe was started on another screen.", "… cleared on another screen.", "Not started: another recipe was loaded on another screen.", the last also shown under START). A recipe started there also closes the panel. COMPARE PROBES is greyed while the check runs. While the clock's part says `no_answer_yet` (the Pi hasn't answered yet), START stays on CHECKING… and asks again, for up to 6 s from the hold. |
| The check itself | Server | One request the screen makes on START, for example `GET /step2/precheck`. It answers three things. **Probes:** for each kettle's probe, whether it gives a reading: a number, published, no older than its own limit (`SensorController.get_sensor_value` already gives `value`, `age` and `max_age`), and one a kettle can have; and how long it hasn't. **Clock:** `system_clock_trusted()`, as the timers use it, asked in a thread and kept, not run on every request. **Reminders:** how many boil additions the recipe has, and which have none. |
| Keeping the additions without a reminder | Server | Today the import names them once, in its warning ("No reminder for: …"), and then forgets them. The import keeps that list with the mash profile, and it goes when the profile is cleared or another recipe is imported. A recipe built by hand counts the boil step's own Hop_1 to Hop_6, so it never has any. |
| COMPARE PROBES and its panel | React UI | `cmpHTML`, `cmpVerdict`, `cmpDone`. The readings are the faceplates' own, less each probe's offset: the `offset` in its settings, which the Hardware page already loads (0 for a sensor that has none). Which probe gives no reading comes from the same check. It keeps nothing between comparisons, so it needs no server change. |
| The clock's words | Server and React UI | The words fit the rig today: no clock board, so the time comes from the internet. When the clock board is fitted and the rule changes, the reason CraftBeerPi gives should change the words with it. |

Bench tests that start a recipe on a simulator still pass the check (Windows' clock counts as set, the probes read,
and the test recipes have six additions or fewer), but they see CHECKING… for a moment before STARTING….

## Found while designing it, not changed

- A probe with no reading shows "– –" in its faceplate, but the line under the window still says
  "MANUAL · element by hand". It could say "No reading for 3 min". That's a separate change.
- A recipe with more than six boil additions can only ever warn here. If the boil step held more reminders, this check
  would never fail on an imported recipe. That's a core change, Brett's call.

## How it was checked

All of it on the main mockup, after the merge, in the build agent's way where there is one.

- Every moment, all 52 (the 40 there were and the 12 new ones), at 17 sizes from 360 to 1920 px wide, 1180×820 and
  1180×900 included: no word split across lines, no text under its contrast minimum, with or without the pointer on
  it, no box over another, no script errors. Under 44 px, only KEEP BOILING, SOUND and the boil power button, as
  documented.
- COMPARE PROBES' sentence for 18 sets of readings, from all three agreeing to all three giving none, the rig's own
  from 25 Oct and 11 Oct among them. At exactly 2.0 °F and 10.0 °F apart it says the lower level.
- What moves while the box or the panel is open, at 1920×1080, 1920×950, 1440×900, 1366×768, 1180×900, 1180×820,
  960×1080 and a 390×844 phone: the clock set, a probe back, a probe coming right in the panel, and a late answer
  that passes all move nothing; START ANYWAY becomes START in its place. A new failure while it's open makes the box,
  or the panel, taller, because there is more to say.
- On a monitor the box fits on the screen, with two failures at 1440×900; the panel takes the step list's room and,
  where the column is short, scrolls there as the step list does, so the page never grows on a monitor 900 px tall or
  more. On a 1920×950 window all of the sentence shows and the small print is a scroll away.
- Clicked through: START held with everything passing (CHECKING…, then the recipe runs, with its LOG lines); START let
  go early ("Keep holding for one second to start the recipe."); START ANYWAY held (its LOG line names the clock); a tap
  on START ANYWAY (nothing starts); DON'T START; the clock set 30 s on, with the box open; COMPARE PROBES and DONE (its
  LOG line); Escape (no line); START held with the panel open (the comparison is logged, then the check runs); START
  held with Space; no answer, then START ANYWAY (its LOG line) and START held again (5 s of CHECKING…); a recipe
  started elsewhere (the box and the panel close; by hand the panel stays); and COMPARE PROBES greyed while CHECKING….
  No page errors.
- Pictures compared with post20's mockup, as the identity test takes them, all 40 earlier moments at its five sizes,
  in the default, `?bk=today` and `?graphs=none`: 11 change, all in the recipe column, and no others. `#reset-done`
  gets COMPARE PROBES under START. The 10 moments brewing by hand (`#manual`, `#timers-hand`, `#sound-allow`,
  `#byhand`, `#byhand-past`, `#notarget`, `#notarget-hlt`, `#handhold`, `#bktarget`, `#finished`) get it at the end of
  the column, under RECIPE BOOK and BREW STEPS; on a phone those pages are 62 px longer.

## The moments

`#prebrew` ready, before filling, each probe with the rig's offset · `#probes` side by side, agreeing · `#probes-apart`
the rig's own readings from 25 Oct, the boil kettle 3.8 °F cooler · `#probes-off` the boil kettle's probe 17.5 °F low ·
`#probes-none` one probe with no reading · `#checking` START held · `#check-clock` the clock not set yet (it gets set
30 s later in the live page) · `#check-now` every check passes now · `#check-probe` a probe with no reading ·
`#check-adds` eight additions, two without a reminder · `#check-many` the clock and the reminders · `#check-noanswer`
no answer from CraftBeerPi in 5 s · `#check-noprobe` no probe chosen for the boil kettle · `#check-slow` the Pi's clock
still unanswered after START waited 6 s for it (the answer comes 5 s later in the live page) · `#check-unsure` the Pi
didn't say whether its clock is set.

## Where it came from

- An unmet start condition isn't an alarm: an alarm needs a timely response (ISA-18.2), and a start condition needs
  none until you try to start. Process-control screens list the conditions blocking a start in their own words, where
  the start command is, and show the met ones in a quiet colour so the unmet one stands out.
- Automatic checking can make people stop checking for themselves (NASA's electronic checklist trials, Palmer and
  Degani, 1991). So the screen checks only what it can sense, says no more than it checked, and leaves the switches
  to the brewer.
- Checklists help most with lapses, things forgotten (Norman, *The Design of Everyday Things*, chapter 5): the
  reminders check catches the addition that would otherwise be forgotten.
- A confirmation names the consequence and has no default answer (Nielsen Norman Group). START ANYWAY is held, and
  lifting early starts nothing (WCAG 2.5.2).
