# Mash pH on Brew Day: recording it in BrewScribe from the reminder (22 Nov 2026)

Designed and built in the mockup; ready to build. The calls are agreed with Porter (BrewScribe dev51, on 8000 and 8012;
`…\files\brewday-entry\contract.md` in his session folder). Its moments are listed under "In the mockup".

## What the brewer asked

Through Brett, 22 Nov: "also, would be great to better integrate brewScribe with brewDay. I get nice pop-up to check
mashPH. I'd like to enter the pH without clicking over to separate tab (without losing functionality on brewScribe page
in case I wish to click over there and make all my entries there)".

Brett: the reading goes into BrewScribe's brew log, BrewScribe's own page keeps working as it does, and an entry made
on either shows on both.

## The two reminders that ask for it

- **"Check mash pH"**, CraftBeerPi's own, 15 brewing minutes after the malt is confirmed: "It has been 15 minutes since
  you confirmed mash-in. Check mash pH. Acknowledging this reminder does not record a measurement or change the brew."
  BrewScribe keeps its reading as Early mash. It is the one the brewer sees first.
- **"BrewScribe: Check mash pH before mash-out"**, BrewScribe's, 5 minutes before the last rest ends, or at mash-out:
  "Check mash pH again before mash-out or transfer. Cool a separate sample and record its actual temperature."
  BrewScribe keeps its reading as End of mash.

Brew Day learns which reminders take a reading from BrewScribe (`GET /brewscribe/api/brew-day/readings`), so it keeps
no list of its own.

## What changes

### RECORD pH, beside OK

Such a reminder gets a second button: **RECORD pH**, with "for BrewScribe" under it, at the right end, where the
main answer is on a timer's alarm. OK moves to its left, drawn as the lesser answer, as +5 MIN is there. A habitual tap
at the right end then opens the pH box, which CANCEL closes, rather than closing the reminder with nothing recorded.
RECORD pH opens the pH box; pressed again, it closes it.

- Once BrewScribe has a reading for that stage, it says "pH 5.42 recorded" under RECORD pH, whichever page saved it.
- While BrewScribe can't take a reading, RECORD pH is greyed, and a tap says why in BrewScribe's words:
  - no brew log open, "no BrewScribe log" under it: "No BrewScribe log is open, so there's nowhere to save it. Start
    one on BrewScribe's page.";
  - BrewScribe can't tell the vessel, "on BrewScribe's page" under it: its sentence, then "Record it on BrewScribe's
    page."
- Without BrewScribe, with one too old to answer, or with no answer, there is no RECORD pH: the reminder is as today.

CraftBeerPi's sentence "Acknowledging this reminder does not record a measurement or change the brew." stays. Beside
RECORD pH it says what OK doesn't do.

### The pH box

It drops down under the reminder, as LOG's list drops under LOG, over what is below for as long as it is open. On a
phone it opens under the reminder and pushes the page down. MASH pH is set into its top edge. From the top:

1. "For BrewScribe's log: Early mash, Mash Tun." With a reading already there, BrewScribe's words: "BrewScribe has pH
   5.42 for Early mash. A new reading here is kept as well, as the latest."
2. **pH**, with −.1, −.01, the reading, +.01 and +.1, and "recipe target 5.4" at the right when the recipe has one.
   Under it: "From the meter, to 2 decimals: type it, or step from 5.40." The reading starts empty. The keys start from
   the recipe's target, else 5.40.
3. Only on the reminder that asks for it: **Sample temperature, °F**, with −1, −.1, the figure, +.1 and +1. Under it:
   "If you took it: type it, or step from 68 °F." Outside the usual range for a cooled sample, it says so as it is set:
   "140.0 °F is warmer than a cooled sample (50 to 95 °F): check it." SAVE still saves it.
4. A line for what went wrong, empty until then.
5. **SAVE pH 5.42**, with "closes the reminder too" under it, and **CANCEL**. A quiet **ON BREWSCRIBE'S PAGE ↗** opens
   that stage in BrewScribe's tab, ready for the reading, for when he'd rather enter it there.

With no reading yet, SAVE says "SAVE pH – –" and is greyed: "Give the pH first: type it, or step from 5.40." A figure
outside 0 to 14 is refused: "pH is between 0 and 14: check the figure." Enter is SAVE; Escape and CANCEL close the box
and keep nothing.

### SAVE

1. SAVING… at once; the keys, CANCEL, RECORD pH and OK are greyed: "Waiting for BrewScribe to answer."
2. BrewScribe saves it (`POST /brewscribe/api/brew-day/readings`). Then Brew Day closes the reminder the way OK does, so
   it goes from every screen. For BrewScribe's own reminder, OK is also how BrewScribe knows it was seen.
3. LOG, in BrewScribe's words: "pH 5.42 saved in BrewScribe (Early mash, Mash Tun) · confirmed". It is spoken too.

When it doesn't go that way:

- BrewScribe refuses it: nothing closes, and its sentence shows above SAVE, e.g. "BrewScribe storage is unavailable;
  retry the operation". LOG: "pH 5.42 not saved in BrewScribe · failed".
- No answer in 5 s: "BrewScribe didn't answer, so it may not have saved it. SAVE again: it won't be saved twice." The
  same reading sent again is safe (the same `entry_id`); a changed one is a new reading.
- Saved, but the reminder didn't close: the box closes, LOG says it was saved, and the reminder stays with "pH 5.42
  recorded" under RECORD pH and OK, its failure shown as any failed command is.
- The reminder answered on another screen while the box is open: the box closes, and says so: "Check mash pH was
  answered on another screen, so nothing was saved here."
- No connection: RECORD pH and SAVE are greyed as every command is, and what was typed stays.

### Both pages

A reading saved on BrewScribe's page shows on Brew Day within 15 s: Brew Day asks BrewScribe again every 15 s while
such a reminder is up, as BrewScribe's page does. One saved on Brew Day shows on BrewScribe's page as if it had been
typed there. Nothing on BrewScribe's page changes.

## Why this way

1. **On the reminder.** The brewer is asked there, so that is where he answers. The box opens under it, as LOG's list
   opens under LOG.
2. **A button that opens a box, not a field in the reminder.** The reminder is in the title bar on one screen. A field
   in it would make the title bar taller for every such reminder, answered or not.
3. **No reading filled in.** A pH filled in as 5.40 could be saved without measuring, and BrewScribe's report would keep
   it. The keys start near the likely figure, so stepping is short, and SAVE names the figure before it is pressed.
4. **SAVE closes the reminder.** The reading answers it, in one tap. OK alone still closes it without one.
5. **No UNDO here.** SAVE names its figure first. A wrong one is put right on BrewScribe's page with Correct… or
   Withdraw, which keep the log tidy. An UNDO here couldn't bring back the reminder it closed.
6. **No time beside a saved reading.** BrewScribe times its entries by the real clock. Brew Day shows only CraftBeerPi's
   (The One Clock Rule), and on a simulator the two differ.
7. **The sample temperature only where the reminder asks for it**, and never required. A figure outside the usual
   range is questioned in a line that is read before SAVE, not in a second question after it.
8. **Greyed when BrewScribe can't take it, gone when BrewScribe isn't there.** A greyed RECORD pH says why, so the
   brewer can put it right. Without BrewScribe, a button that can never work would only be in the way.

Not chosen: a pH field in the recipe column (away from the reminder); the reminder staying up after SAVE for a second
OK (an extra tap every brew to catch a rare slip); a list of quick choices (pH needs two decimals).

## What it needs

| Change | Where |
|---|---|
| RECORD pH on the reminders BrewScribe names, the pH box, SAVE and closing the reminder after it | React UI (`brewday`) |
| `GET` and `POST /brewscribe/api/brew-day/readings`, with `sample_temperature` "asked", `sample_usual` and `target` | BrewScribe dev51 (Porter); dev52, on 8000 and 8012, writes a saved pH as "pH 5.40", not "pH 5.4" |
| Closing the reminder | Nothing new: OK's own call |
| Anything in CraftBeerPi | Nothing |
| Dashboard layout files | Nothing |

## In the mockup

`brew-day.html`, by default. The moments, all on the #mash day:

- `#ph`: "Check mash pH" up at 13:42, 15 minutes after the malt was confirmed, BrewScribe's log open.
- `#ph-open`, `#ph-set`, `#ph-target`: the box open, empty; with 5.42 stepped in; and for a recipe whose target is 5.3.
- `#ph-had`: BrewScribe already has pH 5.42 for Early mash, saved on its own page.
- `#ph-end`, `#ph-warm`: BrewScribe's end-of-mash reminder at 14:51, with the sample temperature; and at 140 °F.
- `#ph-nolog`, `#ph-vessel`: RECORD pH greyed, with no brew log open, and with the vessel unclear.
- `#ph-saved`, `#ph-fail`, `#ph-slow`, `#ph-noclose`, `#ph-other`: just after SAVE; BrewScribe refusing it; no answer;
  saved, but the reminder didn't close; and the reminder answered on another screen while the box was open.
- `?brewscribe=none#ph`: without BrewScribe, the reminder as today.

## How it was checked

- `files\ph\ph_presses.py`, 128 presses, all passing. They cover RECORD pH's states, the box's parts, the keys and
  typing ("5,42" too), the target, Enter and Escape, SAVE, closing the reminder, each failure, the same `entry_id` on a
  retry, the 15 s refresh, and both reminders.
- `files\ph\ph_measure.py`, 134 checks, at 1180 × 860, 1440 × 900, 1920 × 950, 1024 × 768, 820 × 1180 and 390 × 844:
  - the box fully on screen, clear of the reminder and ALL OFF;
  - every key and button at least 44 px tall;
  - on a phone, the reminder's buttons under its words.
  - With RECORD pH the reminder's words take one more line at some sizes. At 1920 × 950 "Check mash pH" makes the
    title bar 102 px tall instead of 83, while it waits.
- The other suites all pass. Pictures of every moment that was there before are unchanged.

## For the brewer to decide

Nothing: his request, Brett's decisions and Porter's contract settle it.
