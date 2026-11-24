# BrewScribe readings from every reminder that asks for one (23 Nov 2026)

The pH box (PH-ENTRY.md), made general: one box that shows only what its reminder asks for, and saves it straight
into BrewScribe. The calls are BrewScribe's contract, draft 5 (Porter, BrewScribe 0.1.0.dev56; in his session folder,
`files\brewday-entry\contract.md`). Its moments are listed under "In the mockup".

## What the brewer asked

Through Brett, 23 Nov, 15:47: "what about entering brewscribe data in the reminder prompts from brewday screen?" Asked
which reminders, he chose "Every BrewScribe reminder that asks for a reading". When a reminder asks for two readings
and only one is saved, Brett decided for him, on the recommendation below: the reminder stays up until both are
recorded, saying what's still to come, and OK closes it at any time.

## The reminders, and what each box asks for

From draft 5, section 1. Asked readings come first, in BrewScribe's order; offered ones (`asked: false`) wait behind
"+" buttons in the box.

| Reminder | When | Box (stage, vessel) | Asked | Offered |
|---|---|---|---|---|
| Check mash pH | 15 min after mash-in | Early mash, Mash Tun | pH | |
| BrewScribe: Check mash pH before mash-out | 5 min before the last rest ends | End of mash, Mash Tun | pH, with the sample's temperature | |
| BrewScribe: Record strike water | while the strike water heats (BrewStart on v5), until answered | HLT water prep, HLT (the only kettle named HLT) | volume | |
| BrewScribe: HLT level before the sparge | the sparge step starts, just before Check first runnings | Sparge water, HLT | the HLT's level | |
| BrewScribe: Check first runnings | the sparge step starts | First runnings, Boil Kettle | gravity | pH |
| BrewScribe: Check last runnings | 5 min before the sparge ends | Last runnings, Boil Kettle | gravity | pH, volume |
| BrewScribe: HLT level after the sparge | the sparge step is done, just before Record before-boil readings | Sparge water, HLT | the HLT's level after | |
| BrewScribe: Record before-boil readings | the boil step starts | Before boil, Boil Kettle | volume, gravity | |
| BrewScribe: Record after-boil readings | the step after the boil starts | After boil, Boil Kettle | volume, gravity | pH |
| BrewScribe: Record final volume and OG | every step is done | Final volume / transfer, Boil Kettle | volume, gravity (the OG) | |

The two pH reminders keep the box as built (post39). Strike water's treatments stay on BrewScribe's page.

## On the reminder: RECORD

As RECORD pH: a second answer at the right end, OK moved to its left as the lesser one.

- **Its word** says what the box takes: RECORD pH (as built), RECORD VOLUME, RECORD LEVEL (both HLT level reminders),
  RECORD GRAVITY (the runnings), RECORD READINGS (where two are asked).
- **Its small line:** "for BrewScribe"; once some of what the reminder asks for is recorded, what's still to come,
  "gravity to come"; once all of it is, what BrewScribe has, short: "1.048 SG recorded", "6.40 gal recorded", or
  "both recorded" where two were asked. It follows BrewScribe's page within 15 s, as RECORD pH does.
- **Greyed**, with BrewScribe's sentence on a tap, while there's no log open or BrewScribe can't tell the vessel, as
  RECORD pH is. **Absent** without BrewScribe, with one too old to answer, with no answer, and where none of the
  reminder's readings can be shown (no `volume_unit` for a reminder that only takes volumes or levels).

## The box

Under the reminder on one screen, as the pH box drops; in the page under the reminder on a phone, which does
everything the desktop does. From the top:

1. **Its title**, set into its top edge: the stage's name in capitals (AFTER BOIL, SPARGE WATER); MASH pH as built.
2. "For BrewScribe's log: After boil, Boil Kettle."
3. **What BrewScribe already has** for the stage, in its words: "BrewScribe has 6.40 gal for After boil. A new reading
   here is kept as well, as the latest." ("… has 6.40 gal and 1.048 SG … New readings here are kept as well …").
   For the level before the sparge: "BrewScribe is keeping the HLT's level before the sparge, 10.00 gal. A new one here
   replaces it."
4. **A part for each reading still to come**, asked ones first. An asked reading that's already recorded waits behind
   "+" like an offered one, so the box opens on what's still to come.
5. **"Also: + pH, + VOLUME"** (+ GRAVITY, + LEVEL), quiet 44 px buttons, for the offered readings and those already
   recorded. A tap puts
   that reading's part in the button's place, with focus in its figure. A part left empty sends nothing.
6. A line naming what SAVE sends, where it sends more than one: "Saves 6.40 gal and 1.048 SG."
7. The line for what went wrong, empty until then.
8. **SAVE** and **CANCEL**, then the quiet ON BREWSCRIBE'S PAGE ↗, as in the pH box.

Each reading's part has the pH part's anatomy: its label, with the recipe's target at the right in Setpoint Green
(BrewScribe's `target.text` as it is: "recipe OG 1.053", "recipe boil volume 7.00 gal", "recipe sparge 5.00 gal");
the keys round the figure, as TARGET's are, because the rig's touch screen has no keyboard; a help line saying where
the keys start; and a line in Note Amber, empty until there's something to check. Every figure starts empty (The
Measured Value Rule); the keys start from the target where it's in the figure's own scale or unit, else from
BrewScribe's `usual.start`.

### Gravity

- **Three choices in a row**, one pressed, from BrewScribe's `choices`, starting at `chosen` (the brew's last):
  **SG** "hydrometer", **°Bx** "refractometer", **°P** "hydrometer", each 44 px or more. Choosing another empties the
  figure, as a figure in one scale means something else in another; the sample's temperature stays.
- **Keys:** SG −.01 −.001, the figure, +.001 +.01, to 3 decimals; °Bx and °P −1 −.1, the figure, +.1 +1, to 1.
- **Help:** "From the hydrometer, to 3 decimals: type it, or step from 1.050." For °Bx, "From the refractometer, to
  1 decimal: type it, or step from 12.0.", then, with BrewScribe's refractometer setup, "BrewScribe applies your wort
  correction factor, 1.04."; without one, "BrewScribe has no wort correction factor for it yet, so its SG is an
  estimate." It asks for nothing.
- **About its SG:** for °Bx and °P with a figure, a line in Soft Steel under the help, "About 1.048 SG." (draft 5's
  section 5: the correction factor applies to °Bx only, as it belongs to the refractometer), so it reads against the
  recipe's OG. Shown only, never sent.
- **Looks like SG:** a °Bx or °P figure such as 1.048 says, in Note Amber, "1.048 looks like an SG reading, but °Bx is
  chosen: choose SG, or check the figure." As BrewScribe's page says it. SAVE still saves it.
- **The sample's temperature** where the choice asks for it (`sample_temperature` "asked": the hydrometer's SG and
  °P, and °Bx when the brewer's refractometer has no temperature compensation), as the end-of-mash pH box has it, with
  its usual range checked. Not for °Bx otherwise, whose temperature compensation covers it.

### Volume

"Volume, gal" (BrewScribe's `volume_label`), keys −1 −.1, the figure, +.1 +1, to 2 decimals in gallons or 1 in litres.
Help: "In the Boil Kettle, as you read it: type it, or step from 7.00." No temperature: BrewScribe takes it from the
kettle's log.

### The HLT's levels and the sparge water

- **Before the sparge** (RECORD LEVEL): one part, "HLT level, gal", "Read it before the sparge pump starts: type it, or
  step from 5.00." SAVE keeps it in BrewScribe until the level after: LOG "HLT 10.00 gal before the sparge kept in
  BrewScribe until the level after (Sparge water, HLT)". The reminder closes.
- **After the sparge** (RECORD LEVEL): with a level kept, "Before the sparge: HLT 10.00 gal, kept in BrewScribe.",
  then one part, "HLT level after, gal" ("Read it now the sparge is done: type it, or step from 5.00."), whose keys
  start from the level before less the recipe's sparge (else the level before). Under it, as the figure is set:
  "Sparge water: 5.40 gal." With no level kept, or one kept in another
  unit than BrewScribe's `volume_unit` (nothing is converted), two parts, "HLT level before, gal" ("As you read it
  before the sparge: type it, or step from 5.00.") and the level after; with only one of them given, SAVE says "Give
  the HLT's level after the sparge too." (or "… before …"). A
  level after that isn't lower than the one before is refused, in BrewScribe's words:
  "The HLT's level after the sparge should be lower than before it."
- **TYPE THE SPARGE VOLUME INSTEAD**, a quiet text button under the levels, swaps them for one part, "Sparge water,
  gal" ("The water the sparge used: type it, or step from 5.00."); USE THE HLT'S LEVELS INSTEAD swaps back. Only one of the two is sent, as draft 5 asks.

### pH

As the pH box's part, offered after the runnings and the boil; with the sample's temperature where BrewScribe asks for
it (after the boil).

## SAVE

- **Its word names what it sends:** "SAVE 1.048 SG", "SAVE 6.40 gal", "SAVE pH 5.42" for one reading; "SAVE 2
  READINGS" for more, with the line above it naming them. With nothing given, "SAVE – –", greyed: "Give a reading
  first: type it, or step from …" (the first part's start).
- **Its small line says what happens to the reminder:** "closes the reminder too" when this SAVE leaves everything the
  reminder asks for recorded; else "the reminder stays for the gravity" (or "for the volume", "for the volume and
  gravity").
- **Refused, at SAVE:** a figure outside what BrewScribe accepts ("SG is between 0.9 and 1.5: check the figure.",
  "Volume is 0 or more: check the figure."), a temperature that isn't a figure, and levels the wrong way round (SAVE
  then reads "SAVE – –", greyed, with BrewScribe's sentence). A figure is sent to its scale's decimals, as the pH is:
  SAVE names it first, so a °Bx typed as 1.048 says "SAVE 1.0 °Bx" under the looks-like-SG line. Ranges outside BrewScribe's usual are not
  questioned: they're its sliders' ranges, not checks, and a bigger brewery's volumes are its own.
- **Saved:** one call, all or nothing, each reading with its own `entry_id`, so SAVE again after no answer saves
  nothing twice. LOG gives BrewScribe's sentence: "6.40 gal and 1.048 SG saved in BrewScribe (After boil, Boil
  Kettle) · confirmed". Then:
  - everything asked is recorded: the reminder closes as OK closes it, as the pH box does;
  - something asked is still to come: the box closes and the reminder stays, its RECORD saying "gravity to come",
    focus back on RECORD. OK still closes it at any time. Only readings the box can show count: with no
    `volume_unit`, a reminder's volume doesn't keep it up.
  - opened again with everything asked already recorded, the box shows those parts again, empty, rather than an empty
    box.
- **When it doesn't go that way:** as the pH box: BrewScribe's sentence above SAVE (its 400 and 409 sentences as they
  are); no answer in 5 s, "BrewScribe didn't answer, so it may not have saved it. SAVE again: it won't be saved
  twice."; saved but the reminder didn't close; answered on another screen; no connection.

## Why this way

1. **One box, grown from the pH box.** The same place, look and steps for every reading, so a brewer who has saved a
   pH knows the rest. Each box shows only what its reminder asks for.
2. **Offered readings behind "+".** A reminder asks for one or two things; the box opens on those (progressive
   disclosure: NN/g). Offered ones are a tap away, never in the way.
3. **The reminder stays until everything asked is recorded.** A gravity often comes minutes after the volume, once a
   sample cools. Closing would drop the only reminder of it. OK closes it at any time, so it never traps him.
4. **Gravity as three paired choices.** SG with the hydrometer, °Bx with the refractometer, °P with the hydrometer, as
   BrewScribe pairs them: one row on a touch screen, and no pairing that makes no sense.
5. **The refractometer's setup is never asked.** It's the brewer's equipment, which BrewScribe already has from his
   page; asking at every sample would be a chore that adds nothing.
6. **No figure filled in, no SG that isn't read.** The keys start near the likely figure; the SG equivalent is shown,
   never saved.

Not chosen: a box per kind of reading (more to learn, the same steps); questioning a figure outside BrewScribe's
sliders (a nag about the brewer's own figures).

## What it needs

| Change | Where |
|---|---|
| RECORD on every reminder BrewScribe names; the box's parts for gravity, volume, the levels and the sparge water; SAVE for several readings; the reminder staying for what's still to come | React UI (`brewday`) |
| Draft 5's GET and POST, the two HLT level reminders, the kept level, the targets; Record strike water raised while the water heats | BrewScribe 0.1.0.dev56, and dev57 for the strike water's timing (Porter) |
| Anything in CraftBeerPi | Nothing |
| Dashboard layout files | Nothing |

## In the mockup

`brew-day.html`, by default, the "BrewScribe readings" group of the moments strip. Each opens its reminder's box
unless it says otherwise:

- `#rd-strike`: Record strike water while BrewStart heats the HLT (BrewScribe dev57 raises it with the first step
  that prepares the strike water, and it stays up through MashIn until answered), the volume.
- `#rd-level`: the HLT's level before the sparge.
- `#rd-first`, `#rd-first-bx`, `#rd-first-nofactor`, `#rd-first-noatc`, `#rd-looks-sg`: first runnings in SG; in °Bx
  with 12.4 typed ("About 1.048 SG."); with no refractometer setup; with a refractometer without temperature
  compensation (the sample's temperature asked); and 1.048 typed in °Bx.
- `#rd-last`, `#rd-last-all`: last runnings; with the offered pH and volume added and three figures in, "SAVE 3
  READINGS".
- `#rd-sparge`, `#rd-sparge-nolevel`, `#rd-sparge-volume`, `#rd-sparge-bad`: just after START THE BOIL (see "The order
  after the sparge" below), the level after with 10.00 gal kept and
  4.60 typed ("Sparge water: 5.40 gal."); with none kept (or one kept in another unit), both levels; the volume typed
  instead; and a level after that isn't lower.
- `#rd-preboil`, `#rd-postboil`, `#rd-final`: before the boil, after it, and the final volume and OG.
- `#rd-partial`: after the boil, the volume saved, the reminder up with "gravity to come", the box closed.
- `#rd-saved`, `#rd-fail`: just after a SAVE that recorded everything (the reminder closed, LOG's line); and one
  BrewScribe refused.
- `#rd-nounit`: no `volume_unit`: first runnings still offers its gravity; Record strike water has no RECORD.

The pH reminders' moments (PH-ENTRY.md) are unchanged.

## The order after the sparge

When the sparge ends, three prompts go up in the same second: CraftBeerPi's "Ready to boil?", then BrewScribe's "HLT
level after the sparge" and "Record before-boil readings". The title bar shows prompts in the order they came, so
"Ready to boil?" comes first, and the level only once START THE BOIL (or a held START) has started the boil. That is
the right order:

- "Ready to boil?" holds the brew: nothing heats until it is answered. The readings hold nothing.
- The HLT's level doesn't change once the sparge pump stops, unless its water is used, and the level reminder comes up
  the moment the boil starts, so the reading is the same either way.
- The before-boil readings ask for a sample "before a rolling boil"; the kettle takes many minutes to get there.

Nothing is reordered, and BrewScribe readings never jump ahead of CraftBeerPi's own questions.

## How it was checked

- All 15 Brew Day suites pass, with no page errors: presses 285; the strike water 28 and 37; UNLOAD 61; the timers 72
  and 40; the clock 17, and its measure; the boil kettle 23; the review page 36; the timers' places 149 and 262; the
  pH box 128 and 134; 12-hour 175.
- The readings box: `rd_presses` 186 checks and `rd_measure` 798, all passing, with no page errors. `rd_measure` uses
  seven sizes: 1920 x 950, 1440 x 900, 1180 x 860, 1024 x 768, 820 x 1180, 390 x 844 and 360 x 740. Between them they
  cover every press above, dev56's sample answer replayed through the stand-in BrewScribe, the box inside the window,
  44 px keys, no word broken mid-word, and every text at least 4.5:1 on its ground.
- The chosen gravity pair matches AUTO | MANUAL's pressed half: the same fill, ring and white words. Contrast of its two
  lines (the scale, then the instrument): pressed 19.6:1 and 13.3:1; not pressed 12.3:1 and 8.0:1; under the pointer
  10.7:1 and 7.0:1; while SAVE waits, the chosen pair as when pressed
  and the others 5.1:1.
- Pictures against the proposal before the readings box, at 1440 x 900, 390 x 844 and 1180 x 860: 462 pictures, and
  only the 20 new `rd-*` moments differ.
- Every `rd-*` moment at 1920 x 950, 1440 x 900, 1280 x 800, 1180 x 860 and 1024 x 768, with RECORD and with OK alone
  (`?brewscribe=none`), for whether the drawing is still drawn: in windows about 1160 to 1270 px wide and up to about 900
  px tall, RECORD wraps first runnings, before the boil and the final readings onto one more line of the title bar,
  and the drawing is left out until the reminder is answered (its strip 64 px, under the 72 it needs; 79 to 84 px with
  OK alone). Other widths keep it. BUILD-NOTES.md, "Known, accepted", has the details.
