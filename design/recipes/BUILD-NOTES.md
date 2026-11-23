# Recipe pages: what it would take to build

For Brett and the UI build helper. The design is in `C:\src\personal\craftbeerpi4-ui-recipes`, branch `impeccable-recipes`, from UI main 5a0aa4a. `proposal\RECIPES.md` says what the pages do and why, with the decisions. This file says how they look and behave, part by part: what each part needs from CraftBeerPi, its refusals and its words, and which bench tests change. Where this file and the mockup differ, the mockup's behaviour and words win, except for the parts listed under "Mockup only".

## Ready to build (22 Nov)

The requests, from the brewer:

> "Have the appropriate agent start working on refactoring the recipe import page, the steps editor (why is/was it called something similar to mash steps editor?) and refactor how I choose the recipe I want to brew."

> "I'm practicing adding the BrewStart step to my test recipe v5. I don't like how I need to keep finding a new arrow to click to move the step up one place. In fact, I don't like that I need to go so deep into the recipe editor to add a brewStart step, it seems like something that could be added as the first step for me in a simpler more direct way. have the right agent brainstorm better options. Also need to revamp how the recipe editor works and get it onto our brewday theme"

Then, late on 22 Nov:

> "I don't like the 24h time. Change the BrewStart to use 12-hr time." Asked where, he chose "Everywhere CraftBeerPi shows a time of day".

> "When sim_time_scale is not 1, setting brewStart ready by time needs to show current sim date/time and the current timescale. 2. Whenever I change the timescale, the simtime date and time need to reset to actual"

Decided, all as recommended (RECIPES.md, "Decided"): the recipe on the left as Brew Day shows it; an import no longer loads; START, NEXT, STOP and RESET leave Brew Steps; the plain step names; MOVE, then PUT IT HERE, with FIRST and LAST, and no dragging; Ready by first, Start at second; + BrewStart in a recipe, with the time also set on Brew Day the night before (Amber's part); imports don't add BrewStart; and a new BrewStart's water is filled in, never typed: what the recipe needs, else the last brew's. And every time of day in 12-hour, by a new setting, CLOCK_FORMAT (see "Times of day"); on a simulator, BrewStart's When settings show CraftBeerPi's own date, time and speed (see "On a simulator").

Shared with Brew Day (agreed with Amber): LOAD's rules and words, UNLOAD's question and log line, the recipe-book row, the capitals in Brew Day, Brew Steps and Recipe Book, how a new BrewStart's water is filled in, a new BrewStart's day (TOMORROW from noon by CraftBeerPi's clock, TODAY before), what SAVE TO BOOK keeps of a brew (change 8), the Twelve-Hour Rule with how a typed time is read, and the simulator's clock tag where BrewStart's time is set. Brew Day's OTHER RECIPE, its UNLOAD and its BrewStart time are hers to build. Brew Day's LOAD question says "Save it there on Brew Steps to keep it." while today's Brew Steps has no SAVE TO BOOK; once these pages ship, it can say "SAVE TO BOOK on Brew Steps keeps it.", as these do.

CraftBeerPi (RECIPES.md, "What CraftBeerPi needs"): changes 2 and 3 are in (post51 and post53); 5 and 6 are in core 4.7.7.post58 (0f139e2c), with the contract in your session folder at `files\plans\steps-api.md`; 1 (import without loading), 4 (the steps on Brew Day know their book recipe), 7 (the figures for the HLT's water) and 8 (the book keeps the recipe, not this brew) are still to build. The pages need 1, 4 and 7; 8 is CraftBeerPi's alone, and the page sends nothing for it. 9 (the CLOCK_FORMAT setting) and 10 (CraftBeerPi's clock back to the PC's when the simulator's speed changes) are Brett's, decided late on 22 Nov; the page works without them (see "Before changes …"). Until they're in, see "Before changes 1, 4, 7 and 8".

### Where it is

- `proposal\recipes.html`, `recipes.css`, `recipes.js`: the mockup. Open the HTML file straight from disk. The strip along the top steps through 37 moments: `#book`, `#choose`, `#loading`, `#loaded`, `#ask`, `#ask-lost`, `#running`, `#brewstart`, `#finished`, `#find`, `#empty`, `#edit`, `#boil`, `#add`, `#saved`, `#copy`, `#new`, `#delete`, `#leave`, `#import`, `#import-file`, `#imported`, `#reimported`, `#refused`, `#brewfather`, `#steps`, `#steps-running`, `#to-book`, `#steps-none`, `#unload`, `#brewstart-add`, `#brewstart-added`, `#brewstart-time`, `#brewstart-sim`, `#move`, `#moved`, `#offline`. `?bare` hides the strip.
- `proposal\recipes-catalog.js`: the plain names. `KINDS` is each kind of step: its plain name (`n`), what it does (`h`), its + STEP group (`g`), its settings in groups (`parts`), and each setting's name, line, unit, choices, what blank means (`blank`) and the choice a blank stands for (`blankAs`). `GROUPS` is + STEP's groups in brewing order. `TYPES` is each setting's kind of control, as CraftBeerPi declares it. `START` is a new step's starting values. Port it as `cbpi4gui\src\components\recipes\catalog.js`, as Settings' and Hardware's catalogues are.
- `proposal\recipes-data.js`: the simulator's (8012) recipes, vessels, probes, switches and import settings, read once, plus made-up recipes, files and a Brewfather list. v5's `mash_numbers` are its BeerSmith export's, with change 7's figures, and `GRAIN_ABSORPTION` stands in for change 7's setting. For the mockup only.
- `proposal\RECIPES.md`: the design, its reasons and the decisions. `proposal\pictures\`: every moment at monitor, laptop, tablet and phone sizes, and today's pages.
- Not for the build: `other-layouts.*` (the two layouts not chosen, kept as pictures) and `rig.js` (only `other-layouts` draws it).

### Mockup only

The strip, with its "Speed set back to 1×", which stands in for CraftBeerPi telling every screen its clock changed; `SCENES`, `scene()`, `fitMock()`, `evening()`, `addedBrewStart()` and `inColumn()`; `startTick()`, a simulator's clock counting on (the build counts on with `brewNow()`); `fileNow()`, a file's time; `?clock=24-hour`, CLOCK_FORMAT's other choice; `loadFrom()`, which sets up a moment's brew; `later()`, whose 900 ms stands in for CraftBeerPi's answers; `bookStep()`, which stands in for CraftBeerPi's `book_data()` (change 8), so the page sends the steps as they are; the made-up refusal (`st.imp.refuse`), files (`D.FILES`), Brewfather list and the pretend CHOOSE FILE and drop; and every toast that starts "Mockup:". In the build each of those toasts is the real thing: a tab opens its page, LOG opens Brew Day's log, ALL OFF is Brew Day's.

## One page for two tabs

The Recipe Book and Brew Steps are one page module with two modes (`st.page` is `"book"` or `"steps"`): they share the column, the plates, the catalogue and SAVE. The frame lights RECIPE BOOK or BREW STEPS.

| Address | Shows |
|---|---|
| `#/recipes` | The book. The column shows the recipe on Brew Day, else the newest. |
| `#/recipes/<file>` (new) | The book, that recipe in the column. |
| `#/recipe/<file>` | That recipe being changed (EDIT). Today's editor address, so old links still open the recipe. |
| `#/upload` | Importing, on the RECIPE BOOK tab. |
| `#/mashprofile` | Brew Steps. `#/brewsteps` (new) is the same. |
| `#/step/<id>` | Brew Steps, that step's settings open. Today's step form address. |
| `#/step` | Brew Steps, + STEP open. |

Today's routes for these addresses (`App.js`: `Recipes`, `RecipeEditor`, `Upload`, `MashProfile`, `StepForm`) all render the new page. At 899 px and narrower, where one thing shows at a time (book, recipe, a step's settings), each move to the next is a history entry, so the browser's and the phone's Back go back one view, as the ‹ link at the top does. Leaving with changes not saved, by a tab, a link or Back, asks as Settings does: SAVE AND GO / GO WITHOUT SAVING / STAY.

Delete when the new page is in: `components\recipes` (index.js, RecipeEditor.js, BasicData.js, MashStepList.js, MashStepEditor.js, CloneRecipeDialog.js, NewRecipeDialog.js, and the Malt, Hops, Misc and Yeast editors, which no page uses), `components\upload\index.js`, `components\mashprofile` (index.js, SortButton.js, StepForm.js) and `components\util\StepTypeSelect.js` if nothing else uses it. The Menu's "Brew Steps" and "Recipe Book" entries go with the menu, as on Settings and Hardware. Code names: `MashProfile` and `MashStepList` can become `BrewSteps` and `StepList` (RECIPES.md, "Your naming question").

### The frame and the port

As Settings and Hardware: the React wrapper draws the brew-day frame with `createBrewDay(ref.current, {page})`, then creates the page in `frame.current.host`'s shadow root (`host.attachShadow({mode: "open"})`), passing `frame` and `navigate`, and calls `frame.update(liveSnap(…))` and the page's `update` as CraftBeerPi's state changes (`useCBPi()`). Make the page's CSS from `recipes.css` with a `design\recipes\port.mjs` copied from Hardware's: drop the mockup strip and the frame rules (the block headed "the frame: the brew-day screen's title bar, last event and tabs", which is Settings' copy of the frame), turn `:root` into `:host`, and keep the rest for the shadow root. The page's class names (`.main`, `.col`, `.plate`, `.step`, `.seg`, `.note`, `.cmd`, …) are used only inside it.

**What the page gets from `useCBPi()`:** `connection`; `config` (`TEMP_UNIT`, `MASH_TUN`, `BoilKettle`, `AUTHOR`, `steps_boil_temp`, `steps_whirlpool_temp`, `steps_sparge`, `AddMashInStep`, `AddMashOutStep`, `brewfather_user_id`, `brewfather_api_key`); the kettles, sensors and actors; `mashProfile` and `mashBasic` (the brew steps, kept current by `step_update` and `mash_profile_update`); `stepTypes`; and `bf_recipes` (the `bfupdate` topic). It reads the book itself (below).

**Reuse from Brew Day** (`components\brewday\live.js`): `stepModel`, `additions`, `splitAddition`, `unitText` and `bookLine`. The mockup's `stepView`, `additions` and `bookLine` copy them, so a recipe reads the same on both screens; use the real ones. The status words ("Ready to start · step 1 of 8", "Running · step 3 of 8", "Stopped · step 3 of 8") are Brew Day's (`screen.js`).

**The HLT** is the kettle a recipe's sparge heats, else the kettle that is neither `MASH_TUN` nor `BoilKettle`, as Hardware's notes have it.

### Sizes

- **1180 px wide and up:** one screen tall. The column (`clamp(340px, 23vw, 440px)`) on the left, its step list scrolling on its own; on the right the tool row, and under it the pane, scrolling on its own. A window 1000 px tall or less tightens the rows.
- **900 to 1179 px:** side by side, but the page scrolls; the column (`clamp(300px, 34vw, 380px)`) stays in view (sticky), and so does the tool row.
- **899 px and narrower:** one thing at a time: the book, then a recipe, then one step's settings, each with ‹ ALL RECIPES or ‹ STEPS at its top. MOVE's bar stays at the top of the screen while the steps scroll under it.
- **700 px and narrower:** the frame's phone rules: tabs at the bottom, four and four. UNDO and SAVE move to a bar above the tabs while there are changes.

## The column

The recipe as Brew Day's recipe column shows it, in the same place: its name (Title capitals), a status line, three command buttons in START, STOP and NEXT STEP's places, then the steps, numbered.

- **A recipe in the book:** "Recipe Book · imported from BeerXML, 13 Nov" (or "· changed 19 Nov"), then LOAD ("onto Brew Day"), EDIT ("steps and name") and COPY ("as a new recipe"). On Brew Day, the status line is Brew Day's ("On Brew Day · ready to start · step 1 of 8", green while it runs) and BREW DAY takes LOAD's place ("start it there", "running there", "where it is").
- **Being changed:** "Changing the Recipe Book's copy · 3 changes not saved", then + STEP, NAME ("and notes") and CLOSE ("back to the book").
- **Brew Steps:** the loaded recipe ("Steps with no name" when it has none), "On Brew Day · …", then BREW DAY, SAVE TO BOOK ("keep for next time") and UNLOAD ("brew by hand"), and + STEP ("add one to this brew") after the steps. Nothing loaded: "No recipe loaded", "Brew Day is brewing by hand", RECIPE BOOK and + STEP.
- **A step's row** is `stepModel`'s: the number on a darker band, the name, temperature and minutes, the mash in's note, the boil's additions. A BrewStart on Ready by adds its water: "126 °F · ready by 7:00 AM · 10.6 gal", with the weekday when its day is a date ("ready by 7:00 AM Sat"); on Start at, or with no Timing, it has no line, as on Brew Day. On the right: the kind's plain name in capitals (MASH REST) in the book; on Brew Steps, ✓ DONE, RUNNING with the time left, STOPPED, or an empty ring for steps to come. A tag in Selection Blue for a change not saved: NEW, CHANGED, MOVED, MOVING; REMOVED is an outline, with the row struck through.
- **Where you are:** the step whose settings are open is Current Step Blue (`aria-current="true"`). On a monitor the plates scroll and the column follows the one at the top.
- **+ BrewStart:** over step 1 of a recipe without BrewStart, a dashed row: "+", BrewStart, "Hot water by a set time · goes in as step 1". In the book always; on Brew Steps while the recipe is loaded and not begun. See "+ BrewStart".

## The Recipe Book

- **Reading it:** `GET /recipe/` gives each recipe's basic data with `file` and `modified` (seconds). Each row's numbers need the recipe's steps, so the page reads every recipe with `GET /recipe/{file}`, all at once, as Brew Day's `loadBook` reads its five. Rows show as soon as the list comes, and each row's numbers fill in as its recipe arrives. A recipe that can't be read keeps its name and "Couldn't be read", with no LOAD. Read again after anything that changes the book: SAVE, COPY, + NEW, DELETE, IMPORT, SAVE TO BOOK.
- **The rows:** newest first (`modified`, then name). The name; where it came from ("Imported from BeerXML", or its description); then in fixed columns, so versions line up: steps, mash temperatures (each mash in's and rest's, once, in order), boil minutes, and when it changed ("Today 7:44 AM", "13 Nov"; the column is 108 px, room for "Today 12:59 PM" on one line). LOAD at the end, or, for the recipe on Brew Day, its state in Brew Day's words with a lamp (READY TO START · STEP 1 OF 8, RUNNING · STEP 3 OF 8 in green, STOPPED · STEP 3 OF 8, FINISHED). At 899 px and narrower the numbers become `bookLine`'s one line.
- **Which row is on Brew Day:** the one whose file is the brew steps' `book_file` (change 4); before change 4, the one with the brew steps' name.
- **FIND A RECIPE:** every word must match, anywhere in the name, where it came from, a step's name or kind, or a boil addition. Matches are marked, and a match in a step or addition gets a line of its own ("Boil: 3.00 oz Citra at 5 min"). CLEAR and Escape empty it. No match: "Nothing matches “zzz”", and where FIND looks.
- **Empty book:** "No recipes yet", how to import, and IMPORT.
- **The tool row:** FIND A RECIPE, + NEW ("write one") and IMPORT ("from a file or Brewfather").

## LOAD

The same rules on a book row, at the top of an open recipe, after an import, and in Brew Day's own lists (`loadRule()`, `runningWhy()`, `loadAskHTML()`).

1. **One tap** when nothing is loaded, or the loaded recipe hasn't begun or has finished, and the Recipe Book has it.
2. **It asks** once a brew has begun and nothing runs: "Load Craftbeerpi Test Recipe v4 in place of Craftbeerpi Test Recipe v5? It stopped at step 3, Saccharification, after 16 of its 40 min. CraftBeerPi forgets which steps are done. Kettles, pumps and timers stay as they are." LOAD INSTEAD / STAY AT STEP 3. With the boil waiting for you: "It is at step 5, Boil Step, waiting for you."
3. **It asks** when the recipe it would replace isn't in the Recipe Book (steps built on Brew Steps, or a book copy since deleted), even before it begins or once finished: "Load Craftbeerpi Test Recipe v4 in place of Rye Pale Ale? Rye Pale Ale isn't in the Recipe Book, so it can't be loaded again. SAVE TO BOOK on Brew Steps keeps it. Kettles, pumps and timers stay as they are." LOAD INSTEAD / DON'T LOAD. With no name: "… in place of the steps on Brew Day? They aren't in the Recipe Book, so they can't be loaded again. SAVE TO BOOK on Brew Steps keeps them. …" Begun as well: rule 2's question with ", and it isn't in the Recipe Book, so it can't be loaded again" after where it stopped. "In the Recipe Book": `GET /recipe/` lists the brew steps' `book_file`; before change 4, a recipe of the same name.
4. **Greyed while a step runs** (status `A`). Tapped, it says why, under the button, for 6 s: "Craftbeerpi Test Recipe v5 is running: Saccharification, 23:41 left. Stop it on Brew Day first." A BrewStart waiting for its time runs: "… is running: BrewStart is waiting to have the HLT at 152 °F by 6:35 PM. …", or on Start at, "… BrewStart is waiting until 12:04 PM to start MashIn. …".

A question opens in place (Brew Day's NEXT STEP and RESET box: Dark Amber Wash, a 2 px Prompt Amber edge), one at a time, neither answer drawn as the default; Escape closes it. **The call:** `POST /recipe/{file}/brew`. Meanwhile the button says LOADING… ("waiting for CraftBeerPi"), with Brew Day's marching stripes, and every other LOAD and UNLOAD is greyed ("Waiting for CraftBeerPi to answer."). On 200 the row shows READY TO START once the brew steps say so (the `mash_profile_update` push, or `GET /step2/`), and the event line says "Craftbeerpi Test Recipe v4 loaded · confirmed". **Refused:** 409 `{"error": "step_running", "detail": "Saccharification is running. Stop it before loading another recipe.", "step": "Saccharification"}`, a step having started on another screen. Nothing changed: LOADING… ends, LOAD greys, and the `detail` shows under it for 6 s. CraftBeerPi also tells every screen in an info, "Recipe not loaded". A note that goes after 6 s clears only itself: redrawing the page then took the focus out of a box being typed in.

## Changing a recipe in the book

EDIT, a tap on any step, or `#/recipe/<file>` opens the recipe's plates on the right: "Name and notes", one plate per step, then "Delete this recipe". The tool row says "Changing a recipe · The Recipe Book's copy. Brew Day's isn't changed." with UNDO and SAVE.

- **A plate:** the step's number and name, MOVE and REMOVE STEP (DROP IT for a step not saved yet), and its kind with what it does ("Mash rest · Heats the mash to a temperature and holds it there."). Then rows: Name and Kind of step first, then the kind's settings in its groups (`parts`), under headings. A row has the plain name, a line on what it does, CraftBeerPi's own name in small type, and the control on the right. A kind or setting the catalogue doesn't know shows CraftBeerPi's `display_label` (else its name) and `description` from `stepTypes`.
- **Controls:** a choice of a few is a segmented row (`role="radiogroup"`, arrow keys move it). A blank setting shows the choice the step takes for it (`blankAs`): a BrewStart with no Timing shows START AT, because it runs as Start at. Vessels, probes and switches are menus whose first line says what blank means ("The vessel's own"). Numbers have their unit beside the box (°F from `TEMP_UNIT`; a BrewStart's water in its `Volume_Unit`). A text never takes a new line. Which settings show follows `show_if` from `stepTypes` (the catalogue's `show` copies BrewStart's).
- **The boil's additions:** one line each, minutes left and what to add, with REMOVE; + ADDITION up to six ("The boil step has six reminders. For a seventh, set a timer on Brew Day."); First wort after them.
- **One SAVE:** a changed row turns blue and says what it was, with its own UNDO ("was 40 min · UNDO"). The step on the left is tagged. SAVE says how many changes ("3 changes, in the Recipe Book"), UNDO "all 3". SAVE with nothing changed is greyed and says "Nothing has changed yet: change a step, then SAVE." SAVE waits for what a step can't be saved without (see "+ BrewStart"). **The call:** `PUT /recipe/{file}` with the whole recipe: `basic` as read, with name, author and description as changed, and every other key kept (an import's `boil_additions_without_reminder` and mash numbers, which the pre-brew check and the strike water helper read); `steps` as `{name, type, props}` in order. 204. CraftBeerPi drops `imported_from`, so the recipe becomes the brewer's own, and a later import of the same name adds a copy rather than replacing it. Event: "Craftbeerpi Test Recipe v4 saved in the Recipe Book · confirmed".
- **Saved while it's on Brew Day:** if the recipe is loaded and not begun, "Brew Day still has the copy loaded at 7:38 AM, without this change. LOAD AGAIN to brew with it.", LOAD AGAIN following LOAD's rules; once a brew has begun, "Brew Day keeps the copy it loaded at 7:38 AM, without this change, while its brew goes on. The change is for next time." With change 4, LOAD AGAIN shows only when the book's copy is newer than `book_modified`, the book copy's own time when it was loaded or kept. Never compare a file's `modified` with `loaded_at` or `brewNow()`: on a fast simulator CraftBeerPi's clock can be days ahead of the PC's.
- **Leaving with changes:** "Craftbeerpi Test Recipe v4 has 2 changes not saved. Save them before opening House Pale Ale?" SAVE AND GO / GO WITHOUT SAVING / STAY.
- **COPY:** a name first ("Craftbeerpi Test Recipe v4 copy", selected), then MAKE THE COPY: `POST /recipe/{file}/clone {"name"}`, answered `{"id"}`, and the copy opens for changing. **+ NEW:** a name, then MAKE IT: `POST /recipe/create {"name"}` → `{"id"}`; it opens with + STEP's kinds. An empty name: "Give it a name first: the book lists recipes by name."
- **DELETE**, the last plate, asks: "Delete Craftbeerpi Test Recipe v3 from the Recipe Book? This can't be undone." (adding "Brew Day keeps its own copy until another recipe is loaded." for the loaded one). DELETE IT / KEEP IT. `DELETE /recipe/{file}`, 200. Event: "… deleted from the Recipe Book".

## + STEP and where a step goes

+ STEP opens "Add a step" at the end of the plates: the kinds in brewing order (Before the brew, Mash, Sparge, Boil, After the boil, Any time), each a button with its plain name, what it does, **where it will go** ("Goes in as step 4, before Mash Out") and CraftBeerPi's name. A tap puts the step there and opens its plate, which says "Went in as step 4, before Mash Out. MOVE puts it elsewhere." CANCEL adds nothing.

**Where each kind goes** (`naturalPlace()`): BrewStart first. Mash in before the first rest, else after BrewStart. A mash rest before the mash out (a rest named "Mash out"), else after the last mash step. The sparge after the last mash step. The boil after the sparge, else after the mash. The whirlpool after the last whirlpool, else after the boil, else last. Cool down last. Anything else after the step that was open when + STEP was pressed, else last. On Brew Steps, never above a step that has begun (`firstFree()`, below): "after Saccharification: the steps before it have begun".

**A new step's values:** the kind's `START`, its vessel by kind (mash: `MASH_TUN`; sparge: the HLT, with `Mash_Tun` the mash tun; boil and after: `BoilKettle`), a boil's temperature `steps_boil_temp`, and its name the kind's plain name. A BrewStart is filled in from the rig (below).

## MOVE and PUT IT HERE

- **MOVE**, on a step's plate. The step is marked MOVING (Current Step Blue with a focus-blue edge), and the steps stop being buttons. Between them, PUT IT HERE (a dashed blue box, 44 px tall) fills every place the step can go, each saying where it lands ("as step 1"). The two places beside the step, where it already is, have none. On a phone, MOVE goes to the list of steps.
- **The bar over the steps:** "Moving BrewStart, now step 9. Tap PUT IT HERE where it goes.", with FIRST ("as step 1"), LAST ("as step 9") and CANCEL ("leave it there"). FIRST or LAST is greyed where the step already is ("It is the last step already."). At 899 px and narrower the bar stays at the top of the screen.
- **One tap puts it**, and the move ends. CANCEL, Escape, or any other button ends it with nothing moved. The step then says MOVED, and its plate says where it was ("Moved: it was step 9."). It counts as one change; moving it back to where it was counts none.
- **Screen readers** hear, as MOVE starts: "Moving BrewStart. PUT IT HERE is between the steps, with FIRST and LAST above them. CANCEL leaves it where it is.", and once it's put, "BrewStart moved: it is step 1 now." (a polite live region). Each PUT IT HERE is named "Put BrewStart here, as step 1".
- **On Brew Steps, steps that have begun stay put** (`firstFree()`): a step has begun when its status isn't `I` (done, running, stopped or failed). Every step up to the last one that has begun keeps its place, a step still to come among them too, and nothing goes above it, as post58 holds them. So no PUT IT HERE above the last begun step, and MOVE on such a step is greyed: "It has begun, so it stays where it ran.", or for a step still to come above one, "Saccharification has begun, so the steps above it stay where they are." With one step left to come: "It is the only step still to come."
- **A step starts on another screen** while a move or a new step above it isn't saved: the page says so in that step's plate and SAVE waits ("MashIn has begun, so BrewStart can't go above it now. MOVE it below MashIn, or remove it."). The mockup has no other screen, so it can't show this.

## + BrewStart

- **One tap** on the dashed row over step 1 (`brewStartProps()`): BrewStart goes in as step 1 (on Brew Steps, at `firstFree()`, which is 0 before a brew begins), NEW, its plate open at **When** with the time box focused. In the book, the tap opens the recipe for changing first.
- **Filled in:** Timing `Ready by`, always written: a step saved with no Timing runs as Start at. Mode `Tomorrow` from noon by CraftBeerPi's clock (`brewNow()`, the title bar's: see "One clock"), the night before, and `Today` before. No time. Heat_Kettle, Heater_Watts and Campden_Reminder from the newest BrewStart CraftBeerPi has: the one on Brew Day, else the one in the newest recipe in the book that has one; else the HLT and an empty element. Ready_Temp from the recipe's mash in. **Volume** (the HLT's water, all of it, strike and sparge) is what the recipe needs, from its `mash_numbers` (change 7): `boil_l` − `top_up_kettle_l` + `grain_kg` × Grain absorption + `lauter_dead_l`, in the brewery's unit (gal for °F, L for °C; `recipeWater()`), to 0.1. Else the newest BrewStart's Volume and unit, the last brew's; else blank, and Brew Day asks. For v5: 23.0 + 20 lb × 0.12 + 0 = 25.4 gal. Brew Day's BrewStart time-setting fills it the same way, so put `recipeWater()` beside `stepModel` in `live.js`. Grain_Temp and NotifyBefore blank (the boil kettle's probe; 15 min). AutoNext Yes. A note under "The water" says where they came from: "Filled in from BrewStart ready-by demo, the newest recipe with a BrewStart: the HLT, its 6500 W element and the Campden reminder. The water, 25.4 gal, is what this recipe needs, worked out from the recipe file: 23.0 gal before the boil, and 2.4 gal the grain keeps (Grain absorption in Settings, 0.12 gal/lb). The water temperature is MashIn's, 126 °F; on Brew Day the strike water box can change it." From the last brew: "… the HLT, its 6500 W element, 10.6 gal of water, the last brew's, and the Campden reminder." With neither: "No water figure yet: Brew Day asks for it."; with no BrewStart anywhere: "No recipe has a BrewStart yet, so the element is blank."
- **The time in words**, under When, as `schedule.resolve_start` works it out (Today and Tomorrow count from when START is pressed, by CraftBeerPi's clock), and worded as Brew Day's BrewStart box words it (`whenHTML()`, with `inWords()` for its `bsIn`): "With START pressed today, the HLT's water is hot by 7:00 AM tomorrow, Mon 23 Nov: in 10 h 20 min." On a simulator not at 1×: "…: in 17 h 44 min, about 35 real minutes at 30×." On Start at: "… MashIn starts at 7:00 AM tomorrow, …". A date: "The HLT's water is hot by 7:00 AM tomorrow, Mon 23 Nov: in 10 h 20 min.", or further off "… by 7:00 AM Wed 25 Nov: in 58 h 20 min." A time already past: "7:00 AM today has passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW.", in the note colour (`--note`). The vessel's name is the BrewStart's own ("the HLT's water").
- **What it can't be saved without** (`needOf()`), said under the setting in the note colour and on SAVE's second line, SAVE greyed until then: the time ("Needed: without a time, BrewStart can't start." / "set BrewStart's time first"); a date with DATE; for Ready by, the vessel and the element's watts ("Needed for Ready by: it works out when to start heating from the element's watts.").
- **Its settings** show as its own form shows them: the heating ones for Ready by; Then (MOVE ON or WAIT) for Start at; the date for DATE. Grouped under When, The water, and The HLT and the notice.

## Brew Steps

The same page for Brew Day's copy: the loaded recipe in the column with its progress, and on the right "This brew's steps" (Brew Day's copy of …, loaded at 7:38 AM from the Recipe Book; changes here are for this brew; SAVE TO BOOK keeps them; START is on Brew Day), then a plate per step. The tool row: "Brew Steps · Brew Day's copy of Craftbeerpi Test Recipe v5, loaded at 7:38 AM. Changes here are for this brew." with UNDO and SAVE.

- **A running step's plate** is greyed: "Running now. CraftBeerPi doesn't change a step while it runs. To change it, STOP the brew on Brew Day first; or change the steps still to come." It has no MOVE or REMOVE. **A step that's done:** "Done. A change here counts only if the recipe is reset to step 1."
- **No START, NEXT, STOP or RESET here.** BREW DAY goes there.

### SAVE on Brew Steps

One SAVE sends the changes in this order, and stops at the first refusal:

1. Each changed step: `PUT /step2/{id}` with `{name, type, props}`.
2. Each removed step: `DELETE /step2/{id}`.
3. The new order of the steps that were there, if it changed: `PUT /step2/order {"ids": [...]}`.
4. Each new step at its final place, the lowest place first: `POST /step2/ {name, type, props, index}`.

Ordering before adding leaves the steps in a right order after every call, so a refusal partway leaves nothing out of place: what was sent before it stands, and the page says what was kept. `PUT /step2/order` answers 200 `{"changed", "steps"}` (`changed: false` when the order was already that, with nothing saved or sent); `POST /step2/` answers the step as saved, with its new id, which the page uses from then on. While SAVE runs it says SAVING…, with the stripes. Afterwards the page shows the steps as CraftBeerPi pushes them (`step_update`, `mash_profile_update`), not its own copy. Event: "Craftbeerpi Test Recipe v5: brew steps saved for this brew · confirmed". A START pressed on a screen that hasn't seen the new order is refused (`recipe_changed`), and Brew Day says so.

**Refusals,** each changing nothing, its sentence under SAVE for 6 s, and the changes not yet sent still on the page:

| Call | Answer | Shown |
|---|---|---|
| `PUT /step2/{id}` | 409 `{"error": "'Saccharification' is running, so its settings were not changed. Press Stop, make the change, then Start: it carries on with the time it had left."}`: the sentence is in `error`. CraftBeerPi also warns every screen. | The sentence. The page greys a running step, so only a step started elsewhere a moment before gets here. |
| `DELETE /step2/{id}` | 200 even when it refused a running step | Nothing: the next push shows whether the step went. |
| `PUT /step2/order` | 409 `begun`: `{"detail": "MashIn has begun, so it can't move, and no step can go above it.", "step": "MashIn"}` | The `detail`. |
| | 409 `steps_changed`: `{"steps": [the loaded ids]}` | "The brew steps were changed on another screen, so the new order wasn't saved. Your changes are still here." The page takes the steps from the next push or `GET /step2/`, keeps the changes to steps still there, and SAVE sends again. |
| | 400 `bad_body` | A page fault: the `detail`, and LOG "failed". |
| `POST /step2/` with `index` | 409 `begun`, as above; 400 `bad_body` for an index out of range | As above. |

**No answer** in 5 s, or another error: a failed command, as on Settings: "Not saved: CraftBeerPi didn't answer, so it may not have them all." LOG "failed" in light red, and what was confirmed stays confirmed.

**Two screens saving at once:** the later order wins; CraftBeerPi doesn't check which order a page started from. When the brew steps change on another screen while this page has changes not saved, the page keeps each change by step id (a setting, a removal, a new step), and says so under SAVE: "The brew steps were changed on another screen. Your changes are still here." A move is kept only while the same steps are loaded; if a step was added or deleted there, the new order is CraftBeerPi's, and the MOVED tags go.

**Before post58** (`GET /system/` `version`), `PUT /step2/order` doesn't exist and `index` is ignored. Then MOVE on Brew Steps is greyed ("Needs CraftBeerPi 4.7.7.post58 or later."), and a new step goes last and says so. The Recipe Book is unaffected. Never use `PUT /step2/move`: it doesn't hold begun steps in place.

### SAVE TO BOOK

"Keep these steps in the Recipe Book. **Replace Craftbeerpi Test Recipe v5** there, the copy they were loaded from, saved 13 Nov? Or save them as a new recipe:", a name box ("Craftbeerpi Test Recipe v5, 22 Nov"; empty for steps with no name), REPLACE THE BOOK'S COPY / SAVE AS NEW / CANCEL. Without a book copy, only SAVE AS NEW. An empty name: "Give it a name first: the Recipe Book lists recipes by name." Greyed while Brew Steps has changes not saved: "SAVE your changes to the brew steps first, then keep them in the book."

**The call** (change 4): `POST /step2/savetobook` with `{"file": "<book file>"}` to replace, or `{"name": "…"}` for a new one; answered `{"file"}`, recorded as the steps' `book_file`, with its `book_modified`, so LOAD and UNLOAD know they can be loaded again. Event: "Craftbeerpi Test Recipe v5 replaced in the Recipe Book", or "Iodine test saved in the Recipe Book".

**What the book gets** (change 8, CraftBeerPi's `book_data()`): the steps as they are, except three things Brew Day sets for one brew. A BrewStart's date (Mode `Date`) goes in as `Tomorrow` at the same time, with no `StartDate`; the strike water step's temperature and BrewStart's `Ready_Temp` go in as they were before the first USE; and BrewStart's `Grain_Temp` goes in blank. The brew steps keep all three. The page sends nothing extra and the question doesn't mention them: the book's copy simply reads as the recipe did, and the strike water box works USE out again for the next brew.

### UNLOAD

UNLOAD's rules are LOAD's (`unloadRule()`, `unloadAskHTML()`), and its words are Brew Day's for its own UNLOAD:

- One tap when not begun, or finished, and the Recipe Book has it.
- Begun: "Unload the recipe and brew by hand? CraftBeerPi forgets it stopped at step 3, Saccharification, after 16 of its 40 min. The Recipe Book keeps the recipe. Kettles, pumps and timers stay as they are." UNLOAD / STAY AT STEP 3. Not in the book as well: "… after 16 of its 40 min, and the recipe isn't in the Recipe Book, so it can't be loaded again. Kettles, pumps and timers stay as they are."
- Not in the book, not begun: "Unload the recipe and brew by hand? It isn't in the Recipe Book, so it can't be loaded again. Kettles, pumps and timers stay as they are." UNLOAD / DON'T UNLOAD.
- Greyed while a step runs, with LOAD's sentence.
- **The call:** `POST /step2/clear`, UNLOADING… meanwhile. Event: "Craftbeerpi Test Recipe v5 unloaded: Brew Day is brewing by hand". Refused: 409 `{"error": "step_running", "detail": "Saccharification is running. Stop it before unloading the recipe.", "step": "Saccharification"}` (post58's words), the `detail` under UNLOAD for 6 s. CraftBeerPi also tells every screen in an info, "Recipe not unloaded".

## Importing

IMPORT (or `#/upload`) opens three plates on the right: "From a file", "From Brewfather" and "Imports use these settings". The tool row: "Import a recipe · It goes into the Recipe Book. Brew Day isn't changed."

- **From a file:** a drop area ("Drop a recipe file here", or CHOOSE FILE, ".xml, .json or .sqlite"; a phone shows CHOOSE FILE alone), and how to export from BeerSmith. Sending: `POST /upload/` as multipart with the file in `File`, SENDING… meanwhile; 200 kept, 400 not (CraftBeerPi says why in its own notification). Then the file's recipes: `GET /upload/xml`, `/upload/json` and `/upload/kbh`, each `[{value, label}]`, listed with no page reload, each with IMPORT ("into the book") and whether the book has it ("Its earlier import is in the book; importing replaces it", "Not in the book yet"). The file CraftBeerPi kept from last time is listed as the page opens ("the last file sent, kept by CraftBeerPi").
- **IMPORT:** `POST /upload/{xml|json|kbh} {"id": value}`, IMPORTING… meanwhile, and every other IMPORT greyed, so a second press sends nothing (the bench checks one request). With change 1 the answer is `{"name", "file", "replaced", "warnings"}`. The result shows in place, over the list: a green tick and "Imported Craftbeerpi Test Recipe v6. It's in your Recipe Book, at the top." (or "Its earlier import in the Recipe Book was replaced."), then the recipe's book row with LOAD, so brewing it is one more tap. The recipe opens in the column ("Check its steps on the left before you brew it."). Each warning shows under it (title in bold, text), as well as in the title bar from CraftBeerPi.
- **Not imported:** 400 `{"error": "recipe not imported", "detail": "…"}`: "Not imported" in light red with the `detail`, and SETTINGS. With change 1 a `detail` ends "Nothing was added to the Recipe Book.", and an import is never refused for a running step.
- **From Brewfather:** with `brewfather_user_id` and `brewfather_api_key` set, the list from `bf_recipes` (the `bfupdate` topic), A to Z, with FIND and REFRESH LIST ("asks Brewfather again": `GET /upload/bfupdate/`). IMPORT: `POST /upload/bf {"id"}`, as a file's. Without them: "Brewfather isn't set up here. To list your Brewfather recipes, add your Brewfather user ID and API key in Settings, under Recipes." with SETTINGS. Today's 50-at-a-time picker goes.
- **Imports use these settings:** the mash tun (`MASH_TUN`), the boil kettle (`BoilKettle`), the boil and whirlpool temperatures (`steps_boil_temp`, `steps_whirlpool_temp`), the sparge (`steps_sparge`) and mash in and mash out (`AddMashInStep`, `AddMashOutStep`), each with a line on why, from `config`, and SETTINGS ("change them") to `#/settings/All`.

## No connection

With no connection the frame says so (Brew Day's), every command is greyed ("No connection. Controls are paused."), and changes stay on the page until it's back.

## One clock

Every "now" on these pages is CraftBeerPi's clock: `brewNow()` from Brew Day's `screen.js`, the clock the title bar shows (Brew Day's one-clock rule; on a simulator it can run fast and be on another date). That covers + BrewStart's day (TOMORROW from noon), the time in words and "has passed", "Today" in the book's rows, and SAVE AS NEW's suggested name ("Craftbeerpi Test Recipe v5, 22 Nov"). Until its first answer `brewNow()` is null: + BrewStart is then greyed ("Waiting for CraftBeerPi's clock."), and the time in words is left out. A recipe's `modified` is the file's time on the PC, so compare it only with another file's time (change 4's `book_modified`). Real seconds (`Date.now()`) stay for the 5 s wait for an answer and a note's 6 s.

## Times of day: the Twelve-Hour Rule

The brewer asked for 12-hour times everywhere CraftBeerPi shows a time of day. The rule is Brew Day's (its DESIGN.md, The Twelve-Hour Rule, beside The One Clock Rule), and these pages follow it. The mockup's `timeOfDay()`, `boxText()` and `readTime()` in `recipes.js` stand in for Brew Day's own functions: use those, so every screen writes and reads a time the same way.

- **The setting:** CLOCK_FORMAT, from `config`: "12-hour", the default, or "24-hour". Anything else, or no setting yet, is 12-hour. The mockup shows 24-hour with `?clock=24-hour`.
- **How a time reads:** "7:00 AM", "11:15 PM", with no leading zero; with seconds, "7:42:05 AM"; midnight is "12:00 AM" and noon "12:00 PM". With 24-hour, as before: "07:00", "23:15:40". A no-break space keeps AM or PM with its time, and a weekday with its time ("7:00 AM Sat").
- **Saved times stay 24-hour:** BrewStart's StartTime is "07:00" or "19:00" in the step, whatever the screen shows.
- **Lengths of time aren't times of day** and don't change: "in 10 h 20 min" (kept on one line), "23:41 left", "16 of its 40 min".
- **Where these pages show a time of day:**
  - the title bar's clock and the event line, which are the frame's, as on Brew Day: "7:41 AM", "7:38:40 AM";
  - the book's Changed column: "Today 7:44 AM", or the date. The column is 108 px, room for "Today 12:59 PM" on one line. In a sentence: "changed today at 7:44 AM", "saved today at 7:44 AM";
  - a BrewStart's row: "126 °F · ready by 7:00 AM · 25.4 gal", and "ready by 7:00 AM Sat" when its day is a date;
  - the time in words and "… has passed" under BrewStart's When settings;
  - the greyed LOAD's reason: "BrewStart is waiting to have the HLT at 152 °F by 6:35 PM";
  - "loaded at 7:38 AM" on Brew Steps and in the notes after a SAVE, with the weekday when it isn't CraftBeerPi's today ("loaded at 8:31 PM Sat");
  - a changed row's "was 7:00 AM".
- **A recipe file's time is the PC's** (`modified`), so "Today" in the book is the screen's today. On the rig, the PC's clock and CraftBeerPi's are the same.

### BrewStart's Time box

For any setting CraftBeerPi declares as a time; today that's only BrewStart's StartTime.

- **A text box,** not the browser's time box, whose 12- or 24-hour look follows the browser's language rather than CLOCK_FORMAT. `inputmode="numeric"`, placeholder "7:00" ("07:00" with 24-hour), 112 px wide, in 22 px condensed figures.
- **AM and PM beside it**, with 12-hour: two buttons, a radio group named "AM or PM" (`#i-<key>-StartTime-half`, each `[data-half="am"]` or `"pm"`), 64 × 48 px, as a phone's number keys have no letters. The box and the pair are one group, named by the setting's label. The box shows "7:00", and the lit button says which half of the day. An empty box shows AM: BrewStart's water is nearly always for the morning.
- **How a typed time is read** (Amber's rule): "7", "700" and "7:00" are 7:00 in the half of the day the box showed when typing began; leading zeros don't matter, so "07:00" is "7:00"; "7a" and "7 am" are morning; "7p", "7 pm", "19" and "19:00" are evening; "12" alone is noon and "12a" midnight; "7.30" and "7 30" are 7:30. With AM or PM, the hour is 1 to 12, and minutes are 00 to 59. With 24-hour, a time without AM or PM is the 24-hour time, and "7 pm" is still 19:00.
- **AM or PM** moves the time to that half of the day ("7:00 PM" becomes "7:00 AM"), and is the half a time typed next is read in. The focus stays on the button.
- **A time it can read counts at once,** as it's typed: the time in words, the step's row and the count of changes follow it. Once the box is left (or on Enter), it shows the time as it reads it: "7" becomes "7:00".
- **What it can't read** leaves the step with no time. Nothing is said while it's being typed. Once the box is left, the text stays as typed, and under it: "That isn't a time: type it as 7, 7:30 or 730, and tap AM or PM." (with 24-hour, "… 7, 7:30 or 19:30."). SAVE waits: "Set BrewStart's time first."
- **Its help line** adds how to type it: "Type it as 7, 7:30 or 730, and tap AM or PM." (with 24-hour, "Type it as 7, 7:30 or 19:30."). The box's `aria-describedby` points to it (`#wh-<key>-StartTime`).
- A running BrewStart's box and buttons are greyed, as its other settings are. The date stays the browser's date box.

## On a simulator: CraftBeerPi's clock where BrewStart's time is set

From the brewer: on a simulator whose speed isn't 1, setting BrewStart's time must show the simulator's date, time and speed. The words are Brew Day's, for its BrewStart box (agreed with Amber):

- **A tag at the top of BrewStart's When settings,** in the book and on Brew Steps, under the "When" heading: "CRAFTBEERPI'S CLOCK · MON 23 NOV, 1:16 PM · 30× SPEED" (`cbClockHTML()`). It shows only while CraftBeerPi's clock isn't the screen's, as the title bar's tag decides it: its speed isn't 1×, or its date isn't the screen's. The speed part shows only when it isn't 1×. On the rig there's nothing.
- **Why there:** TODAY, TOMORROW and the time in words are all by that clock, and the brewer is looking at the When settings, not the title bar, while he sets the time.
- **Its look** is the title bar tag's: Progress Blue (`#9bcbff`) on Progress Track Navy (`#0d2b48`), with a `#3c7fcc` edge, in 15 px condensed capitals. On a narrow screen it breaks only after a "·".
- **A screen reader** hears "CraftBeerPi's clock: Monday 23 November, 1:16 PM, running 30 times as fast." The visible words are `aria-hidden`, and only they are in capitals, so the sentence isn't spelt out letter by letter.
- **It counts on** with CraftBeerPi's clock (`brewNow()`), by the minute, at the simulator's speed. The title bar, the tag and the time in words follow it.
- **The time in words adds the real time:** "…: in 17 h 44 min, about 35 real minutes at 30×." As on Brew Day's box: "under a real minute"; "about N real minutes" under 90; else "about N real hours".
- **When the speed changes:** changing SIM_TIME_SCALE puts CraftBeerPi's clock back to the PC's date and time, and CraftBeerPi tells open screens at once (change 10, the core's). The page then redraws what is on that clock: the title bar, the tag (gone at 1×, on the screen's date), the time in words and "has passed". A step's saved day and time don't change. Until change 10 is in, the page catches up at Brew Day's clock check, once a minute.
- **The mockup:** `#brewstart-sim` has CraftBeerPi's clock at Mon 23 Nov, 1:16 PM, at 30×, while the screen's is Sun 22 Nov, 11:20 PM. The strip's "Speed set back to 1×" stands in for the change of speed.

## Before changes 1, 4, 7, 8, 9 and 10

- **Change 1, import without loading:** the pages assume it. Before it, an import also loads and is refused while a step runs. Build it with change 1. The HTTP tests that import and then read the brew steps change with it (see "Bench tests").
- **Change 4, the steps know their book recipe:** before it, the page goes by names: the row on Brew Day, "in the Recipe Book", REPLACE THE BOOK'S COPY (the book recipe of the same name) and LOAD AGAIN (always offered after a SAVE). SAVE TO BOOK then has no body to send, so offer only SAVE AS NEW (`POST /step2/savetobook`, named as the steps are, with no name box).
- **Change 7, the figures for the HLT's water:** before it, no recipe has them, so a new BrewStart takes the last brew's water. A recipe imported before it never has them; importing it again does.
- **Change 8, the book keeps the recipe:** before it, SAVE TO BOOK keeps what Brew Day set for one brew: a BrewStart date that will have passed (BrewStart won't act on it by itself, and says so), USE's strike temperature and the grain temperature. The page does nothing different.
- **Change 9, CLOCK_FORMAT:** before it, every time of day is 12-hour, the rule's default.
- **Change 10, the clock back to the PC's when the speed changes:** before it, changing SIM_TIME_SCALE leaves the simulator's clock where it is, and the page shows whatever CraftBeerPi's clock says at its next clock check.

## Accessibility

- The steps are an `ol`; each row is a button named with its number, name and details ("Step 3, Saccharification, 149 °F · 40 min. Open its settings"). The open step, the open recipe and the lit tab have `aria-current`.
- Questions are `role="group"`, named by their sentence, opened in place and scrolled into view. Escape closes a question and ends a MOVE.
- A greyed control is `aria-disabled="true"`, never `disabled`, and a tap says why, in a note or the toast. A screen reader hears a command's result, and MOVE's, through a polite live region (`#sr`); in the build, make each note under a button one too.
- BrewStart's Time box and its AM and PM are one group, named by the setting's label; AM and PM are a radio group, "AM or PM", that arrow keys move along. The box's help line, with how to type a time, is its description. The clock tag in When is read as a sentence: "CraftBeerPi's clock: Monday 23 November, 1:16 PM, running 30 times as fast."
- Every button and box is at least 44 px tall at every size: AM and PM 48 px, PUT IT HERE 44 px, the + BrewStart row 58 px, the move bar's buttons 56 px. A text button in a line (MOVE, REMOVE STEP, a row's UNDO, CANCEL MOVE) is a 44 px box whose margins give back what it adds.
- Text contrast was measured in 15 moments at 1920×950 and 390×844, through every layer under each text: the lowest is 5.08:1, so nothing is under 4.5:1.
- With reduced motion, no stripes or flash.

## Colours

`recipes.css`'s `:root` is Settings' tokens. The new parts use them, plus two fills: MOVE's bar `#0c1b2c` and PUT IT HERE's `rgb(42 111 192 / .10)` (`.3` under the pointer).

## Bench tests

Found by reading every test that names these pages or their calls; none was run against the new page.

- **`test_ui_navigation.py`** looks for the headings "Brew Steps" and "Recipe Book" and the "Please select a Recipe" button (lines 63–64). The new page lights the BREW STEPS or RECIPE BOOK tab (`.tabs a[aria-current="page"]`), Brew Steps' tool row says "Brew Steps", and with nothing loaded the column says "No recipe loaded" with a RECIPE BOOK button.
- **`test_ui_recipe_book.py`** opens the drawer (`button[aria-label="open drawer"]`, `.MuiDrawer-paper`), checks breadcrumbs, "Import recipe" and "Create Recipe from BeerXML recipe". It becomes the tabs, IMPORT (`[data-import]`), a recipe's IMPORT (`[data-imp="1"]`) and the result (`.impok`: "Imported …"). CraftBeerPi's own "Kept in your Recipe Book." still reaches the event line. "Imported from BeerXML" is on the row. Its last check, that Brew Steps holds the import (lines 268–273), presses the result's LOAD first.
- **`test_ui_recipe_editor_and_upload.py`** uses the accordion's arrows (`.MuiAccordionSummary-root button`), "Save recipe", the + icon's path, `.MuiSelect-select` and the upload page's four "Create Recipe from …" buttons. It becomes MOVE (`[data-move]`) and PUT IT HERE (`.put[data-put]`), SAVE (`#tool [data-save]`), + STEP and a kind (`[data-kind="MashStep"]`), and a recipe's IMPORT. Its check of exactly one `POST /upload/xml` on a double press holds: IMPORT greys while it runs. "Boil Step in /step2/ after import" (lines 262–263) needs a LOAD first.
- **`test_ui_prompts_and_step_lines.py`** reads Brew Steps' table (`tbody tr`, `[data-step-summary]`, the "Now" column), answers a prompt there, and expects ADD to open `#/step`. The step lines are the column's rows (`.col .steps .step`), with the state on the right; a step's question is answered in the frame's title bar, on every page; + STEP opens the kinds in the page, and `#/step` still opens Brew Steps with + STEP open. The recipe's additions are in its column on `#/recipes/<file>`.
- **`test_e2e_brewstart_form.py`** fills the old form at `#/step` and `#/step/<id>` ("Step Type", "StartDate", "StartTime", "Time"). It becomes Brew Steps' + BrewStart (`[data-bsadd]`) or a BrewStart's plate: Time is `#i-<id>-StartTime`, a text box now: "07:00" typed in a new BrewStart's box is 7:00 AM, and AM and PM are `#i-<id>-StartTime-half [data-half="am"]` and `"pm"`. Day is `#i-<id>-Mode` with `[data-set="Tomorrow"]`, Date is `#i-<id>-StartDate`, Kind of step is `#i-<id>-type`. A new BrewStart now starts on Ready by.
- **Server change 1** changes the HTTP tests that import and then read the brew steps: `test_e2e_recipe_import.py`, `test_e2e_sparge_step.py`, `test_prebrew_check.py` (its pre-brew check reads the import) and the UI ones above. Each LOADs the answer's `file` after importing. `test_e2e_load_while_running.py`'s check that an import is refused while a step runs goes, since an import no longer touches the brew steps.
- **Times in 12-hour** change what these pages say: a test that reads "ready by 07:00", "loaded at 07:38" or the title bar's time reads "ready by 7:00 AM", "loaded at 7:38 AM", or sets CLOCK_FORMAT to "24-hour" first. A no-break space sits between a time and AM or PM.
- Brew Day's own tests that open `#/mashprofile` on a second page (`test_e2e_brewday_answers.py` line 115, `test_e2e_brewday_order.py` line 308, `test_ui_resume_after_restart.py`) only need the page to open.

**Hooks the tests can use,** kept in the build: `.bk[data-f="<file>"]` (a book row), `[data-load="<file>"]` (LOAD, named "Load <name> onto Brew Day"), `#ask` with `[data-yes="load|unload|delete|replace|asnew"]` and `[data-no]`, `#col`, `[data-addstep]`, `[data-bsadd]`, `[data-unload]`, `[data-tobook]` with `#tb-name`, `#tool [data-save]` and `[data-undoall]`, `#q`, `#p-<key>` (a plate), `#r-<key>-<Setting>` and `#i-<key>-<Setting>` (a row and its control), `#when-<key>`, `#i-<key>-StartTime-half [data-half]`, `.cbclk` (the clock tag), `[data-move="<key>"]`, `#mvbar`, `.put[data-put="<place>"]`, `[data-mvcancel]`, `#p-kinds` with `[data-kind="<Type>"]`, `[data-import]`, `[data-choose]`, `[data-imp="<value>"]`, `.impok`, `.fail` and `#event`. A key is the step's CraftBeerPi id on Brew Steps, and the page's own in the book, where steps have no ids.

## Found while designing

1. `PUT /step2/{id}`'s refusal puts its sentence in `error`, where every other refusal has a code there and the sentence in `detail`.
2. `DELETE /step2/{id}` answers 200 when it refuses to delete a running step (`StepController.delete` only logs it).
3. `POST /step2/savetobook` adds a new book recipe every time and answers no id, so today's page can't tell which copy it wrote. Change 4 fixes both.
4. `GET /recipe/` has no steps, so a book with numbers in its rows reads every recipe once, as Brew Day's five do.
5. BrewStart's form started on Start at (fixed in 1.2.0.post9). The brewer's practice step on 8012 was named "ready by" but set to Start at, so it heated nothing itself.
6. A BeerXML file carries the volume before the boil, the kettle top-up, the lauter dead space and every infusion, but no grain absorption and nothing about the HLT, so the HLT's water needs one setting besides the file (change 7).

## Checked

- 104 scripted presses and checks in a real browser (Edge, headless), every one as designed: LOAD in each of its cases, its questions and their answers (a recipe not in the book included), UNLOAD's, SAVE TO BOOK with and without a name and then LOAD asking nothing, SAVE TO BOOK putting a BrewStart set for one brew into the book as Tomorrow with no grain temperature while the brew keeps both, a new BrewStart's water from the recipe and from the last brew, editing and SAVE, + STEP's places (a rest before Mash Out, BrewStart first), MOVE with FIRST and with PUT IT HERE, UNDO and Escape, steps that have begun held in place while a step runs, + BrewStart filled in with SAVE waiting for its time and the time in words, importing with its result row and warning, FIND, the tabs, and a phone going from book to recipe to step and moving a step there. And the 12-hour times: typed times read by the rule ("7", "7p", "19", "12", "12a", "730", "8" in the half the box showed), AM and PM moving the time, a time it can't read said once the box is left with SAVE waiting, the help line, 24-hour with `?clock=24-hour`, a date's weekday in the step row, the book's "Today 7:52 AM" on one line; and on a simulator the clock tag in Amber's words and its screen-reader sentence, the title bar's tag, the time in words in real minutes, the clock counting on, and the speed set back to 1× redrawing it all.
- All 37 moments at 390×844, 800×900, 1100×800, 1366×768 and 1920×950: no script errors.
- The widest time of day, 12:59 PM, put into the title bar (with a long brewery name too), the step rows and the book's Changed column, and the time box with AM and PM, at eight widths from 390 to 1920 px: nothing overlaps, wraps or is cut.
- Text contrast, as above. The Impeccable detector finds only what the last version had: Brew Day's marching stripes and lamp glow, which the frame owns.
- Today's pages on 8012, looked at without pressing anything: the book, a recipe, the import page, Brew Steps, and the add-step form with BrewStart and Ready by chosen (`pictures\today-…`).
