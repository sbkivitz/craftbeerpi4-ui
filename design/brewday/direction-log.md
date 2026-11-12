# Direction decision log

## A question's line turns "answered" (12 Nov 2026, afternoon)
- Brett, after building #finished and running it live: the built screen never changes a line once it's logged. A
  question's line stays "waiting for you", in amber, after it's answered; the answer adds its own line. My moments
  showed those lines as "answered". He asked me to choose: moments that say "waiting for you", or a line that changes.
- Chosen: the line changes where it is, to "answered" (on any screen; the held boil's START counts, because the
  question offers Start), "no longer needed" (taken down unanswered) or "no longer waiting" (a page opened later can't
  tell which). Plain colour; it keeps the time it was asked. The Amber Means Waiting Rule.
- Why: amber has to mean "still needs you". A brew day would otherwise leave a column of amber lines needing nothing,
  and the one that does would stop standing out (interaction-design checklist F15/H3: pop-out works only when one
  thing differs; F9/H21: an ended state must not look current). Changing the moments would have designed that in.
- Not chosen: a second line for each question taken down unanswered (the built screen's "no longer needed" copy). The
  question's own line now says it, and what took it down is logged already. Kept: the line for a question answered
  on another screen, which is news with its own time.
- While checking Brett's list, the question and answer lines took CraftBeerPi's own words from the core (the malt, the
  hop alert, the sparge water, the boil's answer, the NotificationStep's NEXT STEP), #hold's lines were redone from the
  code, #finished's order follows the live run, and its boil kettle's SV is "– –" (target 0). Not done here: lines in
  my words that aren't questions, left for one pass from the live log.
- Checked: once the word changes are applied, the old moments' lines differ only in #hold and #whirlpool; every line
  still "waiting for you" belongs to what the title bar or a timer is waiting on; pictures change only in the event
  line of #hop, #boilpower, #sparge-ready, #hold and #whirlpool; every question's press walked. React UI only
  (`screen.js`: `logEvent` keeps the question's id, `questionGone`, the loop for questions that have gone, the
  WhirlpoolStep's start line; the demo mirrors the mockup). Handed to Brett.

## After the recipe finishes: the wort pump stays at the boil kettle (12 Nov 2026, late morning)
- Brett, building the chiller loop: once the recipe's last step finishes, the live screen has no recipe, so
  `boilStarted()` was false and the drawing put the wort pump back by the mash tun. That's when Scott chills and moves
  the wort to the fermenter, so the drawing lit the HERMS coil again. Brett asked what should tell the screen the
  hoses have gone back.
- What CraftBeerPi knows: it keeps a finished recipe's steps, all done, until a recipe is loaded, reset or cleared
  (`StepController`). So "the boil has started" stays true after the recipe ends, for every screen and across reloads.
  The mash tun's AUTO runs the wort pump through the HERMS coil, which only works with the hoses on the mash tun; Scott's
  10 Nov test on 8012 (#notarget) was exactly that, after a finished recipe.
- Not chosen: a HOSES switch (one more control, and the phone has no drawing to show it); forgetting after a time
  (surprising); going by the vessels' modes alone (wrong when brewing by hand).
- Asked Scott, with the catch spelled out (brewing by hand later, with the old recipe still loaded and the mash tun in
  MANUAL, shows the pump at the kettle). He chose "Yes, keep it at the kettle until then": drawn at the boil kettle
  until a recipe is loaded or reset, and by the mash tun while the mash tun's AUTO is on.
- Mockup: `stepStatus` reads a demo moment's `finished` flag when no recipe runs; `boilStarted()` needs no running
  recipe; `post` needs the mash tun's AUTO off; the drawing's description says the recipe has finished. New moment
  #finished (the #whirlpool day at 17:41:30, chilling); #notarget gets the flag and looks the same. Checked: 310 of 310
  pictures of the old moments identical; #finished fits at 11 sizes; pressed through. React UI only (`screen.js`, the
  demo). Handed to Brett.

## The wort pump after the boil: three options (12 Nov 2026, morning); Scott chose 2, with the chiller
- Scott: "whirlpool / hop-stand step pump symbol shows it going through the HERMS coil. What are some alternatives?",
  then "I don't want the symbols to become too chaotic. Maybe another representation of the wort pump instead of
  trying to connect the pipe/valves over there from where it currently is?" As built, the drawing goes back to
  recirculating once the boil starts, so a running wort pump is drawn round the HERMS coil into the mash tun.
- Reading (Scott's standing list): NN/g heuristic 2, match the real world and natural mapping; GT CS 6750 lesson
  2.6.9, good representations make relationships explicit, bring objects and relationships together, exclude
  extraneous details and expose natural constraints; Norman's conceptual models (the drawing should match what Scott
  does: one pump, its hoses moved to the kettle); W3C WAI complex images (the drawing's description must say where
  the pump is). Digests: H5 draw plumbing flat and plain with few crossings, H3 keep normal quiet, F14 connection is
  the strongest grouping.
- Proposed, from the boil's start (when CraftBeerPi tells him to move the pump's hoses): 1, the pump drawn under the
  boil kettle on a short loop that reuses the runoff's riser and inlet; 2, the same with the chiller on the loop;
  3, the pump left by the mash tun, named WORT PUMP → BOIL KETTLE (an off-page connector), with a turning arrow lit in
  the kettle. In all three nothing on the mash side lights, and the valves stay as the sparge left them.
- My lean: 1. It shows a whole, true path in the drawing's own language (pipe, chevrons, lit while pumping) with two
  short pipes and no crossing, and it matches the hose move. 2 if he wants the chiller seen. 3 is the quietest, but the
  pump still looks piped to the mash tun, and the link to the kettle is only words and colour.
- Comparison page: `proposal/whirlpool.html`. React UI only (`rig.js`, `screen.js`).
- Scott chose "2. The pump moves, with the chiller drawn on its loop" the same morning; the mockup's default since. One
  change before the hand-off: the valves are drawn as before the boil (for recirculating) instead of as the sparge left
  them, since the HLT pump is also the HLT's stirrer, and the sparge positions would have sent its water over to the
  mash tun. Checked: before the boil and on a phone nothing changes; after it, only the drawing on a monitor and at
  half of it. Handed to Brett. Known limit: the WORT PUMP button stays on the mash tun's panel.

## SOUND switches on silently (12 Nov 2026, morning)
- Scott: "I don't want to hear a sound when I click the "SOUND" box for the timer. ONly when timer expires". Since
  11 Nov a press that switched SOUND on, or allowed it while it said TAP TO ALLOW, played the alarm (the mockup two
  beeps, the screen the whole burst) so he'd hear what it sounds like.
- Asked him (ask_user) whether a new hop alert, question or error should keep its two beeps, since his words could
  mean timers only. He chose "Keep the two beeps for hop alerts, questions and errors (Recommended)".
- Decided: a press makes no sound, SOUND included. Sound means something needs him: a run-out timer's burst every
  3 s until answered, and a new alert's first two pulses. The lit box and the label are the feedback; Settings' Try
  is the deliberate way to hear the sound. Grounds: the interaction-design checklist (keep a normal screen quiet;
  an alarm must ask for a response; needless sounds teach people to tune alarms out) and the HMI practice of a
  test button as its own control (`.impeccable/research/ixd-hmi.md`).
- The beep had a second job: on some browsers, Safari on an iPhone in particular, a sound started inside a press is
  what lets the page play sound later. `audioOK()` now starts a silent one-sample sound in the press instead.
- Checked: a SOUND press 0 beeps (2 before) and 1 silent sound; alerts still 2 beeps; a run-out timer still 3 every
  3 s; pictures identical at 1920, 1180 and 390 px. Handed to Brett (`screen.js` cmdSnd and audioOK, `alarm.js`'s
  header). Built the same morning (web UI 9faf75d, build 007e146; identity 451/451; his alarm sound test 32/32, and
  the build before fails exactly the five silent-press checks).

## OUT back on the boil kettle's window (11 Nov 2026, night)
- Scott, via Brett: "BoilPower's display has lost its current 'out' element power number? Please put it back". The
  10 Nov rule ("I don't need the heating element power echoed so many places") had left the boil kettle's window
  with MODE only while its target was BOIL; the afternoon took the % off HEATING because OUT showed it, which was true
  on the HLT but not here. So nothing showed what the element was doing, and in MANUAL the green BOIL 33 % isn't it.
- Decided: OUT on the boil kettle in every state, as on the HLT: 100 % heating to the boil, the boil power once
  boiling, 0 % paused, the hand level in MANUAL. The green number stays the setting; OUT is the reading. Both say 45
  while it boils steadily, a deliberate setting-and-reading pair. HEATING keeps no %. Layout A (not built) is left as
  it is: no OUT, and its boil element says HEATING.
- Found while fitting it: OUT/MODE's column took the width of what it showed, so the divider moved as the power went
  from two digits to three (the HLT already did) and the graph under it changed width, dropping a time label at 960
  px. Now the column always keeps "100 %"'s room (2.55em; HERMS is 2.49em): the divider stays put and lines up across
  the three windows. Stable positions over time (NN/g on consistency; a control's reading shouldn't move the panel).
- Also found: below about 1366 px the small words and gaps stop at their smallest sizes while the windows narrow, so
  the boil kettle's "°F" already crossed the divider at 1180 with graphs (−8 px), and would by 12 px with OUT. The PV
  now has a limit worked out from the window's width, the same for all three, keeping it 6 px clear: 40.6 px at 1180,
  53.5 at 1280, 50.2 at 900; unchanged at Scott's monitor, half of it and his phone. The big number gives way, not
  the small ones: the small words are near their legibility floor, and the PV at 40 px is still twice OUT.
- Built by Brett the same night (M76; web UI a513fe4, build ad897b3; identity 451/451; his live boil power test reads
  OUT through a pause, MANUAL and back, 92/92).
- Also found: the −5 −1 HEATING +1 +5 row left HEATING 29 px at 1180, 53 at 900 and 62 at 1280 (it needs about 73),
  so where the window was narrow the boil-over button was the smallest; at 1180 a pause also wrapped its hint onto
  three lines and moved every plate's mode row down 15 px. The ±1 checks had missed those sizes. Fixed and handed to
  Brett: the row shares out 1 : 2 : 1 as before, but the element never gets narrower than HEATING needs, so on the
  narrowest windows the steps give way instead (32 px at 1180, still full height, above WCAG 2.5.8's 24 px), and
  there they read −5 −1 +1 +5, like the power box's steps. Which button gives way follows from what each is for: a
  slip on a narrow step costs one step of power or a pause a held press undoes; a boil-over needs the element at once.
  Built by Brett the same night (M77, web UI 1b75633, build c616051; identity 451/451; a live check at 1180 px, which
  his identity sizes don't include, 95/95).
- Scott renamed 8012 again, to "EBrews - Simulator" (18 characters): so the simulators are now told from the rig by
  name, as suggested. It fits as designed: one line on a monitor, two whole lines on a 360 px phone.

## The brewery's name in the title bar; a BREWSCRIBE tab (11 Nov 2026, evening)
- Brett asked two things after porting the hold before the boil. The name: PRODUCT.md promised the BREWERY_NAME
  setting in the title bar, but the mockup (and so his port) printed "CraftBeerPi Brewery" on a monitor and
  "CraftBeerPi" on a phone. Then Scott asked about it himself; his name on 8012 is "EBrews - A CraftBeerPi Brewery",
  30 characters. Brett asked for it first, designed on his monitor, half of it and a phone.
- Decided: the setting at every width, phone included, in one span; blank shows "CraftBeerPi". The name is what tells
  the rig from a simulator (all three are CraftBeerPi), and a phone is where both are likeliest to be open, so a short
  form there would hide the one difference that matters. Two lines at most, then an ellipsis, with the whole name in
  the page and as its tooltip. On a monitor at most 12 times its font size wide (the default is 9.2, so unchanged).
- Long names (over 24 characters) at 0.7 of the size on a monitor and a phone: two lines then fit the title bar's
  50 px, and 30 characters fit two lines in a phone's corner. Tried first at 0.72: 1 px too tall in layout A. From
  701 to 1023 px the name keeps its full size and takes what is left of its row (flex 1 1 0), as the question has its
  own row there; at 0.72 it was 15.8 px, the smallest text in the bar, at half Scott's monitor.
- Scott's name: one line at 23.8 px on his monitor, two whole lines under the sparge question, "EBREWS - A /
  CRAFTBEERPI…" under "Ready to boil?"; one line at 22 px at 960; two lines at 15.4 px on a 360 or 390 phone. The
  title bar is as tall as with the default name in all of them. Left as a trade-off: at 1366 and 1440 two alarms take
  a second line beside his name, since making the name give way first would cut it where it fits whole today.
- The page's title starts with the name (name · Brew day): a browser tab shows its title's start (WCAG 2.4.2).
- The BREWSCRIBE tab (for Porter's BrewScribe; Scott chose its own browser tab for now): the last tab, after MORE. The
  tabs are where the screen's places are, the trip happens many times a brew day, and none of CraftBeerPi's seven
  moves. The program's name, a box-and-arrow icon saying before the press that it opens elsewhere (NN/g on new tabs,
  W3C G201) and "(opens in its own tab)" for screen readers. On a phone the bar is four and four. The name breaks
  between Brew and Scribe where its tab is narrow, the icon kept with Scribe.
- Tried in Edge: `#now` keeps the BrewScribe tab from reloading; `rel="noopener"` opens a new BrewScribe tab on every
  press; a BrewScribe tab opened from a bookmark is never reused, even if it names itself "brewscribe".
- For Scott and Porter: a browser slows tabs that aren't in front, and a phone may pause them, so alarms on the same
  phone may wait until Scott switches back from BrewScribe. Suggested for Scott: name the simulators differently.
  Porter's answer (his newer build, not yet installed): BrewScribe shows CraftBeerPi's waiting prompts on its own alarm
  line, "Answer in Brew Day ↗", until answered on any screen, and gets them back after a paused tab returns. It plays
  no sound; whether it should is Scott's call. If he wants it, the two tabs must not both ring on one screen.
- Built the same evening by Brett: the name in web UI e3735aa (build 5d3d66b), BREWSCRIBE in 625c63a (build 281129d),
  identity 451/451. The screen shows BREWSCRIBE where CraftBeerPi answers `HEAD /brewscribe/` with anything but 404,
  remembered per device so the tab row doesn't move as it opens. Scott then shortened his 8012 name to "EBrews".
  Checked on 8012 by looking only: as the mockup at 1920, 960 and 390 px.

## Pumps off for the hoses; the hold before the boil; long questions (11 Nov 2026, late afternoon)
- Brett's core 1c08d4c (DEFECTS M71), for Scott: "Any time I need to change hoses or "valves" that respective pump
  should be off", and imported recipes should do it without hand edits. CraftBeerPi now switches a pump off where its
  hose moves: the wort pump as a SpargeStep starts, the HLT pump as the water is ready, the HLT pump as the runoff
  ends (the wort pump runs on to drain the mash tun), and whichever runs as the boil starts. The mockup mirrors it:
  the sparge question's new words name the pumps that are off, built from the pumps' states as the server builds
  them; the two notifications go in the event line word for word, "from CraftBeerPi", as the built screen logs them.
- Decided: the screen never switches a pump itself for this, and adds no warning of its own. The lamp going to OFF,
  the drawing's still line and CraftBeerPi's sentence say it three ways (lamp, picture, words), and the override
  caveat under the HLT pump stays.
- The hold before the boil, now in the mockup's engine and a new moment, #boil-hold (Brett's ?demo=longprompt,
  carried on from #sparge-run). Read the controller first: NEXT during the hold starts the boil (StepController.next,
  the INITIAL branch), so the built screen's NEXT STEP, saying "to Whirlpool Hop" and asking about skipping, would put
  heat on with two taps under the wrong question. Decided: NEXT STEP greyed there, saying how to start the boil; START
  THE BOIL held for one second like START, because it puts heat on (The Held Heat Rule). The step says WAITING FOR
  YOU in the ready state, as the screen already does.
- Found while measuring: a long question with a wide button (the sparge's, 200 characters; the boil's, 300) was a
  column of 3-4 words a line on a phone, 405 px tall at 390, 513 at 360; and between 701 and 1023 px wide (half of
  Scott's monitor) layout B left a question 36-175 px between the brand and the clock, 837 px tall at 701, with the
  bar 49 px past the screen. Measured every question first: text length, not width, separates the long ones (the
  rest are 125 characters or fewer). Decided: over 140 characters with a button, on a phone, the buttons go under the
  words at the right; up to 1023 px the banner has the title bar's second row to itself, as on a phone. 267 and 202
  px tall at 390; 422-752 px for the words from 701 to 1023. None of Brett's five test sizes is in that range.
- Not changed, flagged: the event line's ellipsis hides the result ("waiting for you") of a long line; LOG has it whole.
- Not added: the 10-minute Mash Out that imports now add. An ordinary mash rest, which the screen draws already;
  adding it renumbers every moment and Brett's demo data.

## ±1 % beside the boil element; HEATING without its % (11 Nov 2026, afternoon)
- Scott, 13:19: "for BoilPower, I'd like the +/-1 in addition to the +/- 5 you already have." Read as Brett did:
  one-tap −1 % and +1 % on the boil kettle's faceplate as well as −5 % and +5 %, sending set_boil_power as they do.
  No server change.
- Read first, per his standing rule: NN/g "Preventing User Errors: Avoiding Unconscious Slips" (targets crowded
  together cause slips), NN/g "Touch Targets on Touchscreens" (at least 1 cm × 1 cm) and WCAG 2.5.5 Target Size (44 ×
  44 CSS px, more for frequent controls next to each other). Applied from Norman's mappings without re-reading:
  −5 −1 left and +1 +5 right, growing outward like a number line and in the power box's order. From Fitts's law: the
  element, the boil-over button, keeps twice the steps' width, so it stays the biggest target.
- Five across, not a second row: the faceplates share their row heights from 900 px wide, so a second row would make
  the HLT and mash tun rows taller too, appearing and vanishing with AUTO. The steps are never under 44 px (44 at
  1366, 70 at 1920, 53 on a phone).
- Measured, two problems, both fixed: the element's small line "BOIL ELEMENT · tap to pause" wrapped (2 lines at 1920,
  4 at 1366 in layout A), making the row 15-30 px taller as the boil starts and moving the other faceplates' buttons
  under the brewer's finger. Between the steps the line now says only "tap to pause"; the title says BOIL KETTLE and
  it has one element, and screen readers still hear BOIL ELEMENT. And no waiting word fits (PAUSING… needs 75 px and
  has 63 at 1366; CARRYING ON… 109): waiting there, the button keeps its state word with "pausing…" or "heating…"
  under it. That also ends a 19 px jump the old faceplate made at 1920 and on a phone for each pause. The element's
  sides are 6 px, not 8, so "tap to pause" fits on one line at 1366 in layout A.
- No "turn down"/"turn up" under the steps (no room at 44 px). A step waiting shows the lamps' marching stripes along
  its top instead of "sending…", and the wait is kept under the step itself, so −5 and −1 can't both show it.
- Scott, 13:45: "I'd like the "HEATING xx %" button to only show HEATING since the percentage is shown in the graph
  and as a number on the right side of the PID display. It would be cleaner to remove this duplicate version". Done
  in layout B: the HLT's element and the older boil kettle's (?bk=today) say HEATING; OUT and the graph's OUT band
  keep the number. Layout A keeps HEATING 62 %, because it has no OUT and no graphs, so it would lose the number
  altogether (Brett left that to me; the screen builds only B).

## Timers built; the mockup's default (11 Nov 2026)
- Brett built the timers and the names the same day (screen dc789c6, server 246e263, c9c83dc, e36433b); identity
  375/375 with &timers=new. The mockup now shows them by default, as it did ?bk=power; ?timers=new draws the same
  (116 of 116 moments and views, pixel for pixel), and ?timers=today keeps the rest timer for an older CraftBeerPi.
- Took four of the screen's choices: a press on SOUND while TAP TO ALLOW allows it and keeps it on with two beeps (it
  used to switch it off); a key press allows sound too, except Escape, which a browser doesn't count; the go button
  says STARTING… or PAUSING… only for those, otherwise keeps its label, greyed; REMOVE asks only for a running or
  paused timer; Enter on a greyed main button says why.
- Did two of them another way, for Brett to take or leave: a press on SOUND is left to SOUND's own click, so a press
  that slides off can't leave a flag that turns the next press into a beep; and a finger tries again as it lifts,
  because the HTML standard counts a finger as the user's own press only at pointerup or touchend, not pointerdown.
  Without that, a phone may show SOUND allowed while the browser still holds the sound back. Not testable here:
  Playwright counts every simulated press as the user's, Escape included.
- Found while testing: in the simulation (the mockup's and the screen's demo mode), removing or setting a finished
  timer left its alarm pulsing in the title bar with dead buttons. Fixed with tAnswered(). CraftBeerPi itself
  already withdraws the prompt.
- Brett took all three in web UI 7b0697d (identity 375/375, ?timers=today for a build without the timers). He also
  made the Settings page's text boxes 360 px wide from 900 px, wrapping a long value (Scott's choice: "wider boxes,
  and a long value wraps"), so six timer names fit on one line (4641a7f).

## Timers approved; names from Settings (11 Nov 2026)
- Scott: "add the timers that design agent discussed. Those default names are fine as long as they're easily
  changed on brew day. I'd like to have an easy config setting to choose the default timer names from the setup if
  that's easy enough too". Brett builds it, server first; the setting is BREWDAY_TIMER_NAMES (his key), default
  "Hop stand, Yeast, Vorlauf".
- Asked Scott what a new timer is called if he doesn't pick a name. He answered "multiple choice boxes from
  preconfigured list", then "or freeform in addition to mult choice". So the names are buttons to pick, the box
  takes any name, and nothing is pre-filled: an unnamed timer stays "Timer 3". Read first, per his standing rule:
  NN/g "The Power of Defaults" (pre-fill only what nearly everyone would choose), NN/g on placeholders (a placeholder
  is taken for a filled-in value) and W3C WAI's form instructions (say the format where the field is: here the
  setting's description). Applied from MIT 6.831's Errors and User Control lecture without re-reading it: a name
  another timer has is greyed, with the reason, and the same name typed is refused before anything is sent,
  because two alarms called Yeast in the title bar couldn't be told apart.
- The first six names show, three to a row: measured, two rows still fit a 1920×950 screen. More than six gets no
  line in the editor (it would repeat itself every time and push the editor past the screen); the setting's
  description says "The first six show, in this order". A blank list shows "No names to pick: BREWDAY_TIMER_NAMES
  in Settings is blank."
- Found while measuring, in the timers as approved: with an editor open, the step list shrank to a 41 px strip at
  1920×950 that cut "23:41 LEFT" in half, and by hand the editor pushed the recipe book off the screen (70 px of
  scrolling). On the one-screen layout the step list, or the recipe book and its two buttons, now make way while a
  timer's editor is open, and + TIMER hides while another timer's editor is open (it would also have dropped that
  editor's changes). The header still says which step runs, and alerts still come in the title bar (only the phone
  has the step strip at the top). Every editor case now fits 1920×1080 and 1920×950.
- Found in Brett's server: CraftBeerPi's config.get() treats a blank setting as missing, so a blank list would still
  offer the default names, and ConfigUpdate would put them back at the next restart. Fix sent to Brett.
- Scott didn't answer the other two questions, so hop additions stay as they are and four timers is the most.

## After Brett's port: small fixes (10 Nov 2026, late)
- Brett built the boil kettle's target model, KEEP BOILING, the forgotten pause and the SpargeStep; his identity
  test matched all 22 moments at five sizes, with and without graphs, plus 15 presses (281/281). The mockup now
  shows that boil kettle by default (?bk=power); ?bk=today is the old faceplate, kept for an older BoilPower.
- Mirrored his decision that every target box opens with its number selected (typing 150 into 168.0 gave 150168.0).
- Brett saw the sparge valve's SET OPEN touching its bowtie with graphs. Measured on screen in every moment: with
  graphs the tags grow (rs up to 1.3) but didn't move, so the sparge and HLT return tags touched or overlapped
  their valves by up to 2 px. Both now move down as they grow; the sparge one also sits 4 units lower at any size.
  At least 2 clean px under the sparge valve at every desktop size.
- Found while checking: in the title bar the clock could shrink to two thirds of "15:04", so the long sparge prompt
  pushed the time off the screen's edge at 1366 and 1440 wide and folded ALL OFF onto two lines. On a monitor or
  laptop, ALL OFF and the clock now keep their size and the prompt wraps instead; no prompt got taller. Left alone
  between 701 and 1179 px, where keeping them whole would make a 318 px title bar 534 px; giving the prompt its own
  row there, as on the phone, is the real fix, not designed yet.
- No usual boil power set: "USUAL – –" over "none · set one in Hardware" (Brett's "none set · set in Hardware",
  without the doubled "set").
- Agreed with the rest of Brett's port decisions (older BoilPower keeps the old faceplate, two sparge event lines,
  NEXT/Stop leave the HLT's target, the 3.6 °F edge). New designs avoid the class name `box`: App.css shadows it.
- Brett ported the tag lines, the title bar rule and the USUAL wording the same evening (UI c864354, build
  66d6de1); identity 281/281 against this folder again.

## Timers, proposed (10 Nov 2026, evening; for Scott to review)
- Scott, after using the rest timer: "why is it named that? lots of things use a timer during a brew day", an
  optionally audible alarm, "more attention grabbing but still elegant" when one runs out, several with a "+", and
  names. He chose sound for his timers and CraftBeerPi's alerts. Read first, per his standing rule: NN/g on
  indicators and notifications (a finished timer is a notification that needs action, and an indicator on the timer
  itself), and WCAG 2.2.2 (with 1.4.2 and 2.3.1 earlier). Applied from the other sources in his rule, without
  re-reading them tonight: MIT 6.831's Visibility, Efficiency and Errors lectures (presets for common times; ask
  once before throwing away time left), GT CS 6750's feedback, tolerance and equity (sound optional, never the only
  signal), Norman on feedback that must be prioritised so important signals capture attention, and id-book on making
  information salient only when it needs attention.
- Precedents: the ThermoWorks TimeStack (four timers in view, digits flash until stopped, count up afterwards, Set
  recalls the last time) and process-control alarm displays (ISA-18.2 and ISA-101: blinking means one thing, an
  alarm nobody has answered, and the alarm banner is on every screen).
- Chosen: up to four named timers in the recipe column, during a recipe too; one editor at a time; a finished timer
  pulses with its title-bar prompt and a frame round the whole screen, counts up, and offers +5 MIN and OK, on every
  screen; SOUND is each screen's own switch, with the browser's first-tap rule shown honestly. Considered and
  dropped: a modal for a finished timer (it would block the controls mid-brew); a separate timers tab (out of sight);
  six name ideas (two rows made the editor run off a 950 px screen; three fit, or his last three names).
- Not done: hop additions pulsing like timers (a question for Scott), and alarm-sound presets (his later todo).

## The SpargeStep (10 Nov 2026, evening)
- Asked by Brett for core 4.7.7.post35's new step type. Scott, 10 Nov: "sparge step needs to let the HLT get up to
  mash out temperature before pumping wort over to boil kettle. I also may do a "batch sparge" - it should be
  flexible to let me do either", then "I think the wort pump may need to be manual".
- The drawing had shown the runoff valves from the step's first second. Now a SpargeStep holds them on
  recirculating while the HLT heats the water and while the step waits for "Sparge started", because nothing has
  been switched yet. While it waits, each valve to change keeps its drawn position and is marked in Prompt Amber,
  outline and words ("SET OPEN", "SET CLOSED"), the same colour as the question in the title bar. Considered and
  dropped: drawing the valves already changed, in amber. That would light the sparge line while the HLT pump was
  really still going round the hot liquor tank.
- The HLT return's run is too short for "SET CLOSED", so while marked that tag moves left of the riser, level
  with its valve. No other tag moves, so Brett's identity pictures of every other moment stay as they are.
- Fly or batch: one set of valves, since in a batch sparge each pump runs alone and only its line lights. A
  vorlauf between batches isn't drawn.
- With no timer the step says SPARGING rather than NOW, and its temperature reads "water 168 °F". WAITING FOR YOU
  needs nothing more than the title-bar prompt, the step row and the marked valves.
- Events: a SpargeStep starting mustn't say "Sparge started" (the button's words); its countdown starting is the
  press, not the temperature. Moments #sparge-heat, #sparge-ready, #sparge-run, #sparge-batch.

## The boil kettle's target, KEEP BOILING and a forgotten pause (10 Nov 2026, evening)
- KEEP BOILING. Scott, through Brett: "add a small checkbox with LED to choose keep at boil temp or let the boil
  power fully drive the temp (ok to fall if I set it too low %)". He had set 2 % on 8012 and asked why the kettle
  held about 210 °F: BoilPower latches the boil at the boil point and goes back to full power 3.6 °F below it.
  Brett added Keep_Boiling ("Yes" by default, kept between brew days) and set_keep_boiling. Designed: an LED-style
  checkbox at the end of the boil kettle's nameplate row, the box itself lit Setpoint Green with a tick, one tap,
  any mode, shown only while the target is BOIL. The line under the window says what happens next below a boil:
  "Below a boil · back to full power at 206.6 °F", or "Not boiling · 10.9 °F below 210.2 °F" unticked. Read as one
  lit box rather than a lamp beside a tick box, so the state shows once; a separate lamp is easy if he wants it.
  Moments #keepboil and #letfall. Found and fixed on the way: −5 % at 2 % was refused; now it gives 0 %.
- Holding by hand. Asked how, Scott chose "Set the boil kettle's target to 170 °F, like the HLT, and it holds there",
  questioned whether a new button was needed, and asked for "most elegant and practical solution... intuitive,
  elegant, and natural". Brett rebuilt BoilPower around it: the target is BOIL (from the boil point less 3.6 °F
  up, or none) or a temperature to hold; the boil point is a setting of its own (set_boil_at); the separate
  Hold_Target and set_hold_target went; the pause is set_paused(Paused).
  Designed: the boil kettle works like the HLT plus BOIL. TARGET goes back beside AUTO/MANUAL, with no new
  button, and its editor gains BOIL and BOIL POWER keys. A hold reads exactly like the HLT (SV 170.0, OUT, the
  HLT's lines, plus "heats again at 166.4 °F" while BoilPower rests). While the target is BOIL, the green boil
  power in the window is framed with a small "change" and is itself the boil power's button: a third button
  beside AUTO/MANUAL doesn't fit at 1366 or 1440 wide, and the boil power must never be hard to find again ("I
  seem to have lost the critical ability to set the boil power percentage"). Not taken: Brett's HOLD label (SV
  matches "like the HLT"); making the HLT's and mash tun's readings buttons too (Scott: leave them alone).
  Moments #bktarget and #handhold; #hold now uses the target.
- Pause answers (Scott, through Brett): the boil's timer keeps counting while paused; a forgotten pause gets a kept
  warning on every page after 2 brewing minutes, once per pause. My words, sent to Brett for the plugin: "Boil Kettle
  heat still paused" / "The heat has been paused for 2 minutes. To heat again, press and hold PAUSED on the Boil
  Kettle." Moment #pause-long.
- Handed to Brett 10 Nov evening (BUILD-NOTES, "The boil kettle's target, KEEP BOILING and a forgotten pause").

## The boil kettle's power and temperature: power first, approved, plus three ideas from boil controllers (10 Nov 2026)
- Scott, directly: "the design of the boil kettle's power vs temperature setting buttons / functions is not
  intuitive and needs analysis/redesign. Explain what is wrong in your own words before beginnign work". Told
  him: the boil kettle has a thermostat's controls, but BoilPower isn't a thermostat. Its green SV (210.2 °F)
  is only where full power gives way to the boil power, so a boil at 212 °F looks 1.8 °F over target, and a
  TARGET above the boiling point would leave the element at full power for the whole boil. The power button
  sits in another row, with a hint in jargon, and says 45 % while OUT says 100 % during heat-up. In MANUAL the
  same button sets something else. A whirlpool hold shows SV 210.2 and "40.8 °F below target" while it holds
  170 °F. He answered: "unsure if I want to make this change - generate a mockup. I forgot it uses boilPower
  when I asked". Later he asked Brett about 8012: "It pegs at 212 - over SV".
- Read first: NN/g on modes (one control that changes meaning with a mode invites slips; show the mode in two
  ways, or use separate controls), and the Auber EZboil DSPR320 manual, a common boil controller: in a
  boiling step its SV window shows a power, "P 45", and the temperature where the boil counts from is a menu
  setting, not the front-panel number.
- Two redesigns behind ?bk= in the mockup, compared with today in proposal/boil-kettle.html at five moments
  (#heatup, #boiling, #boilpower, #sparge, #hold), cut to the boil kettle, on a monitor and a phone:
  - clearer words (?bk=words): today's layout. The green number is labelled BOIL; BOIL AT replaces TARGET
    and refuses anything above 212 °F; BOIL POWER always sets the boil power, with a hint saying when it is
    used ("once it boils", "in use", "kept for the boil", "not used while holding").
  - power first (?bk=power): the green number is the boil power ("BOIL 45 %"), and BOIL POWER sits beside
    AUTO and MANUAL, where TARGET is on the other vessels. BOIL AT 210.2 °F moves beside the element.
  - Both: the line under the face says "Full power until it boils, then 45 %", "Boiling at 45 %" or "Holding
    170 °F for the whirlpool"; a hold shows HOLD 170.0; in the graph the boil temperature is dashed (green for
    words, grey for power first) and a hold is the green line. Neither sets the element's level by hand: in
    MANUAL it runs at its own level, like the HLT's. Only the brew-day screen changes; CraftBeerPi already
    gives it the threshold, the boil power and Hold_Target.
- My pick, if asked: power first. The number on the face is the one he turns during the boil. Today
  (?bk=today) stays the default, and DESIGN.md is unchanged.
- Shown to Scott as pictures of the three faceplates at five moments. His answer: "I don't understand what you
  are showing me.. Let's leave it alone for now". Set aside. Not to be built; the ?bk= code stays in the
  mockup, unused, in case he comes back to it. If he does, start from what he sees on brew day in plain words,
  not from the panel's labels (SV, TARGET, BOIL AT).
- Minutes later he came back to it: "It would be good to make the BoilPower plugin look a little different in
  its controls - but leave the HLT/MT alone. I don't need the heating element power echoed so many places".
  While it boils, today's faceplate shows 45 % three times (OUT, HEATING 45 % on the element button, BOIL
  POWER 45 %). So power first now shows it once: the green number. The boil kettle's window has no OUT, the
  element button says HEATING, BOIL POWER says "change", and the line says "Boiling" or "Full power until it
  boils". Shown as one picture, today beside the proposal (boil-kettle.html now shows only those two). Asked
  "Is the boil kettle on the right what you want?", he answered: "I think, YES. Can you suggest anything else?
  Look at commercial boil controllers for inspiration". Clearer words (?bk=words) is dropped.
- Commercial boil controllers, read next: the Grainfather keeps a default boil power in its equipment settings
  and changes the power with its arrow keys during the boil. The Ss Brewtech eController has a heater button
  that cuts the element without changing the power setting, "especially helpful during the occasional
  boil-over". GEA's evaporation control needs sensors CraftBeerPi doesn't have, so nothing was taken from it.
  Offered three ideas; Scott chose "All three":
  - One-tap −5 % and +5 % either side of the element button while AUTO runs. Each tap sends set_boil_power at
    once. A tap, not a held press: it changes a level, it doesn't start heat from off.
  - Pause the heat for a boil-over: in AUTO, a tap on the element button pauses the heat. The button turns
    amber, PAUSED, "hold to heat", and the line under the window says "Heat paused for 0:26". AUTO, the recipe
    and the boil power carry on. Heating again takes a held press, like any heat.
  - Each boil starts at your usual power: the BOIL POWER box shows "USUAL 45 % · starts each recipe · set in
    Hardware". A change made during one brew day doesn't carry over to the next.
  - To make room, BOIL AT 210.2 °F moved from beside the element into the BOIL POWER box. New demo moment
    #pause (a boil-over at 15:31).
- What CraftBeerPi needs: the ±5 % taps need only the screen. Pausing needs a pause action in the BoilPower
  plugin that keeps the boil latch and the boil power (BoilPower would otherwise turn the element back on at
  its next decision, 2 s later). The usual power needs a plugin setting.
- Shown to Scott as before/after pictures (boil-over, and the open BOIL POWER box), and asked whether to hand
  it to Brett. He answered "Yes, hand it to Brett". Handed over the same day (BUILD-NOTES, "The boil kettle's
  power and temperature: ready to build"); DESIGN.md and design.json now describe it.
- One change of mine while writing it up: the usual power comes back when a recipe starts from its first step,
  not when the Boil step starts. Otherwise a power Scott sets during the "Ready to boil?" hold, meant for this
  boil, would be thrown away the moment the boil starts. Hence "starts each recipe" in the box.

## After the build: AUTO with no target (10 Nov 2026)
- Brett relayed Scott on 8012 at 13:47: "What went wrong? I have Mash Tun "Auto" on but HLT is off. I think a
  "SV" was not set - but it should pop up a warning in that case". The mash tun's target was 0, left from the
  last recipe; PID_HERMS held the mash at 0 °F and never asked the HLT for heat. The faceplate said "MANUAL ·
  wort pump by hand" while MODE said AUTO, because its line said MANUAL whenever there was no SV.
- Brett raises CraftBeerPi's own warning after 5 s and asked me for the faceplate's part. Designed: the line
  under the window says so at once in Prompt Amber ("No target, so the HLT won't heat"; "Not heating: the mash
  tun has no target" on the HLT under the HERMS; "No target, so it won't heat" on a kettle with its own AUTO),
  and TARGET's hint says "set SV" in Prompt Amber. Nothing else changes. New rule in DESIGN.md: The Mode Tells
  The Truth Rule. Suggested shorter wording for his warning. Demo moments #notarget and #notarget-hlt.

- From Scott, passed on by Brett: "I seem to have lost the critical ability to set the boil power percentage
  with this redesign. Work with the design agent to add it back. This is next high priority." Then: "I need to
  be able to adjust boil element power even while running a recipe". Brett ships it before the graphs.
- The old dashboard's boil kettle dialog had "Set boil power" (BoilPower's Boil_Power, 0-100 %), and its
  target widget showed it beside the target ("212 85%"). BoilPower uses it once the wort reaches its
  threshold, BoilPower._threshold: the kettle's target (210.2 °F in the Boil step), else Boil_Threshold (210.2 °F
  on Scott's set-up). Below that it heats at full power. (Corrected the same day: I first wrote Boil_Threshold
  only; Brett found the target rule in the plugin.)
- Put it back as a button beside the BOIL ELEMENT lamp, which had its row to itself, so nothing gets taller:
  "BOIL POWER 45 %" over "used from 210.2 °F · change". Tapping it opens an editor in place of the mode row,
  shaped like the target editor (−5, −1, value, +1, +5, SET, CANCEL). No running step locks it, so it works
  mid-boil while AUTO has the element's lamp locked. Demo moment #boilpower.
- In MANUAL the same button sets the element's own level ("POWER 100 % · used by hand"), as Brett suggested
  and as hardware boil controllers do. If the mode changes while the editor is open, it closes without
  sending. Shown to Scott on 10 Nov; no answer yet. The kettle's mode decides, not the recipe: Brett asked
  about the "Ready to boil?" hold, where the kettle is in MANUAL, and it stays POWER there, so the button
  always agrees with the lamp and OUT.
- SET is a tap, not a held press: it changes a level, it doesn't switch heat on, and turning a boil-over down
  has to be quick. Added to the Held Heat Rule. Left out: the hold temperature (set_hold_target), which the
  Whirlpool step manages; Brett will ask Scott.

## After the build: temperature graphs in the faceplates (9-10 Nov 2026)
- Scott, directly: "Can you mock up a way to add temperature graphs to the dashboard?  It should be natural
  looking and not like a bolt-on". Asked what a graph should show at a glance (in the last 30 minutes,
  whether a vessel will reach its target; in the last 10, how steadily it holds; or the whole brew day): "I'd
  like the ability to toggle between a,b, and c by clicking the temperature graph".
- Built two options in the mockup (proposal/graphs.js, compared in proposal/graphs.html): A, a graph in each
  PID window under its PV and SV; B, a DRAWING / GRAPHS switch that swaps the drawing for three big graphs.
  Both give each vessel its own scale (never one shared plot, which he had turned down): PV red, SV green,
  OUT as an orange band, step tags, and a tap on any graph steps all three through 10 MIN, 30 MIN and DAY.
- My first question mixed the option with his screen set-up: "I don't understand the distinction between
  your A/B choices". Asked again plainly, he chose "A: graphs always showing, with a smaller rig drawing
  (Recommended)" (10 Nov).
- How CraftBeerPi shows on his monitor: "Usually B - but full screen (A) is a good idea and I may start to
  use that in the future". In that question B was a normal browser window with tabs and the address bar, and
  A was full screen. So A was made to work in a window about 950 px tall: at 1000 px tall or less the
  faceplates tighten (PV and SV keep their size), and the drawing's labels grow up to 1.3 times, which keeps
  them the same size as before the graphs.
- "Yes, hand it to Brett to build (Recommended)". The graphs are now the mockup's default; ?graphs=none shows
  the screen as first built.

## After the build: the drawing's flow paths and hand valves (9 Nov 2026, evening)
- From Scott's test of Brett's build on port 8012, passed on by Brett: "before the boil step, I will run the
  wort pump to move wort from mash tun to [boil] kettle. Animation should reflect that path." "maybe there
  should be an icon for a valve between the pump and the HERMS coil too?" At the "Ready to boil?" hold: "I
  should be pumping wort from mash tun to boil kettle at this step".
- Brett asked Scott: when does the wort start going to the boil kettle? "From the start of the Sparge step: I
  fly sparge, so wort runs to the boil kettle during the sparge". Does the HLT pump move the sparge water?
  "Yes, the HLT pump moves the sparge water to the mash tun".
- Built: each pump's line branches, with a hand valve on every branch (coil line, boil kettle line, HLT
  return, a new sparge line to the top of the mash tun). The valves are invisible to CraftBeerPi, so the
  drawing goes by the recipe (the core's runoff-name test) and says so under the boil kettle: "VALVES ARE
  SET BY HAND" and "SHOWN FOR STEP 4 (SPARGE)" or "SHOWN FOR RECIRCULATING". New demo moment: #sparge.
- My assumption, flagged to Scott: the HLT side is switched with valves too, not by moving a hose.
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
