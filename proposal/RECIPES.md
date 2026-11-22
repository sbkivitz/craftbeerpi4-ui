# Recipes: choosing one to brew, importing, and changing steps

A proposal for the Recipe book, a recipe's page, importing a recipe, and Brew steps, made the way Settings and Hardware were: Brew Day's title bar, tabs and look. Nothing is built yet. This is for you to approve or change.

**The mockup** is [`recipes.html`](recipes.html). Open it in a browser and use the links along the top to see each moment. Its recipes, vessels and settings are your simulator's (8012), read once and never written to. The recipes and files I made up say so on screen. Brew Day's part (OTHER RECIPE) is Amber's; she and I agreed how it works (below).

**New in this version:** your second request, about moving a step and adding BrewStart. A new step now goes where its kind belongs, MOVE puts a step anywhere in two taps, and a recipe without BrewStart offers it as step 1, filled in. See [Moving a step](#moving-a-step), [Adding BrewStart first](#adding-brewstart-first), and [the options I weighed](#moving-a-step-and-adding-brewstart-the-options-i-weighed). Questions 5 to 7 are new.

## What you asked (22 Nov)

> "Have the appropriate agent start working on refactoring the recipe import page, the steps editor (why is/was it called something similar to mash steps editor?) and refactor how I choose the recipe I want to brew."

Later, practising on the try-out simulator:

> "I'm practicing adding the BrewStart step to my test recipe v5. I don't like how I need to keep finding a new arrow to click to move the step up one place. In fact, I don't like that I need to go so deep into the recipe editor to add a brewStart step, it seems like something that could be added as the first step for me in a simpler more direct way. have the right agent brainstorm better options. Also need to revamp how the recipe editor works and get it onto our brewday theme"

## What's wrong today

Pictures of today's pages are in [`pictures/`](pictures/), named `today-…`.

- The Recipe book, the recipe editor, the import page and Brew steps are still the old green pages with the menu.
- **Choosing a recipe** means opening it, then pressing a paddle icon. Its only label is the hover tooltip "Send recipe to Kettle". A touch screen has no hover.
- **Brew Day** lists recipes with LOAD only when no recipe is loaded. On the rig a stale Test Recipe was loaded, so the list never appeared.
- **Importing also loads.** An import replaces Brew day's recipe at once. So does the paddle icon. If a step is running when either happens, CraftBeerPi stops it (its kettle's AUTO goes off) and loads the other recipe in its place.
- **Importing takes several steps.** You upload the file, and the page reloads. Then you pick the recipe from a drop-down and press "Create Recipe from BeerXML recipe".
- **Brew steps has its own START, NEXT, STOP and RESET** buttons, as unlabelled icons. Its START is one tap, so it gets round Brew Day's one-second held START.
- **SAVE on Brew steps** adds another copy to the Recipe book every time it's pressed, all with the same name.
- The editor's malt, hops, misc and yeast editors were never connected: no page uses them. A CraftBeerPi recipe has no ingredient list. The boil's additions live in its boil step.
- **Moving a step goes one place per press.** On Brew steps, each arrow swaps a step with its neighbour and saves at once. The list redraws, so the arrow you need next has moved. + always adds a step last, so a step that belongs first needs a press for every place: 8 for BrewStart in v5.
- **Adding BrewStart is deep.** + opens a page of its own. You choose BrewStart from CraftBeerPi's own names, then Ready by, and fill up to 13 boxes, every one blank: no vessel, temperature, water or element power is filled in, though CraftBeerPi has them all. Save puts it last.
- **BrewStart's form starts on Start at**, which only waits for the time and then starts the next step. Ready by is the one that has the water hot by the time. Your practice step on the simulator is called "ready by" but is set to Start at, so it waited until 12:04 and then started MashIn, rather than having the HLT hot by 12:04. If you meant the water to be hot by then, the form's first choice caught you out.

## Your naming question

**Why was it called something like "mash steps editor"?** CraftBeerPi began with the mash. Its first versions ran a mash schedule: a list of rests, each a temperature held for a time. Brewing software calls that a mash profile; BeerSmith still does. So the page was "Mash Profile", and the code that lists and edits a recipe's steps was named `MashStepList` and `MashStepEditor`.

Later the steps grew to cover the whole brew day: mash in, the rests, mash out, the sparge, the boil and its additions, the whirlpool and cooling. The names stayed. On 5 Nov you said the name didn't fit ("it describes the entire brew day and not just mash"), so the menu now says Brew Steps. The page's address (`#/mashprofile`) and the code kept the old names so bookmarks would keep working.

**The words I propose:**

| Today | Proposed | Why |
|---|---|---|
| Brew Steps (menu); Mash Profile (address, code) | **Brew steps** | Unchanged: the steps of the recipe on Brew day. |
| A recipe's "Brew Steps" | **Steps** | A recipe in the book has steps. Brew steps are the copy Brew day runs. Two names, because they are two copies. |
| Paddle icon, "Send recipe to Kettle" | **LOAD**, "onto Brew day" | Brew Day's own word, on a button that says what it does. |
| Import recipe, Upload, "Create Recipe from BeerXML recipe" | **IMPORT** | One word for one act. |
| Clone | **COPY** | |
| Clear (Brew steps) | **UNLOAD**, "brew by hand" | It undoes LOAD. |
| Save (Brew steps to the book) | **SAVE TO BOOK** | It asks: replace the copy they came from, or save as a new recipe. |
| Basic Data | **Name and notes** | |
| Up and down arrows (Brew Steps) | **MOVE**, then **PUT IT HERE** | Two taps, however far. |
| + ADD, "Step Config" (Brew Steps) | **+ STEP**, and **+ BrewStart** over step 1 | The step's settings open beside the steps, not on a page of their own. |
| MashInStep, MashStep, SpargeStep, BoilStep, NotificationStep, WhirlpoolStep, CooldownStep, WaitStep, ToggleStep, ActorStep, BrewStart | **Mash in, Mash rest, Sparge, Boil, Message, Whirlpool, Cool down, Wait, Switch on or off, Run a switch, BrewStart** | CraftBeerPi's own name stays under each in small type, as on Settings and Hardware. |

In the code, Brett could rename `mashprofile` to `brewsteps`, and `MashStepList` to `StepList` (one list for both pages), and delete `MashStepEditor` and the four ingredient editors. The addresses could become `#/brewsteps`, with `#/mashprofile` still working. That part is his call; you'd only see it in the address bar.

## How it works

### A recipe looks the way Brew Day will show it

On a monitor, the open recipe sits on the left, **in the place and shape of Brew Day's recipe column**: its name, a line saying where it is, three buttons, then its steps, numbered, with temperatures, minutes and the boil's additions, exactly as Brew Day lists them. What you choose is what Brew Day will show, in the same spot. Where nothing runs, the right side of each step says what kind of step it is (MASH REST, SPARGE, BOIL).

The right side holds the book, a recipe's settings, or importing.

![The Recipe book on a monitor](pictures/01-book-monitor.png)

### The Recipe book

- **One row per recipe, newest first** (the one just imported or changed is usually the next one brewed), with FIND A RECIPE above. FIND looks in names, where a recipe came from, step names and boil additions, so "citra" finds every recipe with Citra.
- **The numbers that tell recipes apart sit in fixed columns**: steps, mash temperatures, boil minutes and when it last changed. So v3, v4 and v5 line up, and their differences show by eye.
- **Each row ends in LOAD.** The recipe on Brew day has no LOAD. Its row says what it is doing instead, in Brew Day's own words: READY TO START · STEP 1 OF 8, RUNNING · STEP 3 OF 8 (with a green lamp), STOPPED · STEP 3 OF 8, or FINISHED.
- **Tap a row** to open the recipe on the left. **+ NEW** writes one. **IMPORT** brings one in.

### Choosing the recipe to brew: LOAD

LOAD has the same rules everywhere: on a book row, at the top of an open recipe, and in Brew Day's own list.

1. **One tap** when nothing is loaded, or the loaded recipe hasn't begun or has finished. The recipe it replaces stays in the Recipe book. The button says LOADING… while CraftBeerPi answers, the row then says READY TO START, and the event line says "Craftbeerpi Test Recipe v4 loaded · confirmed".
2. **It asks first** once a brew has begun but no step is running (stopped, failed, or the boil waiting for you), because CraftBeerPi then forgets how far the brew got. It asks in place, as Brew Day's RESET does: "Load Craftbeerpi Test Recipe v4 in place of Craftbeerpi Test Recipe v5? It stopped at step 3, Saccharification, after 16 of its 40 min. CraftBeerPi forgets which steps are done. Kettles, pumps and timers stay as they are." The answers are LOAD INSTEAD and STAY AT STEP 3, and neither is the default.
3. **Greyed while a step runs**, and tapped, it says why, in brewing words: "Craftbeerpi Test Recipe v5 is running: Saccharification, 23:41 left. Stop it on Brew day first." Overnight, a BrewStart waiting for its time counts as running: "BrewStart is waiting to have the HLT at 152 °F by 18:35."

**If CraftBeerPi refuses anyway,** because a step started on another screen just before the press, nothing changes: from CraftBeerPi 4.7.7.post51 it refuses to load while a step runs. LOADING… ends, LOAD turns grey, and CraftBeerPi's own sentence shows under it for six seconds: "Saccharification is running. Stop it before loading another recipe." It looks like the moment *LOAD while a step runs*, in CraftBeerPi's words. UNLOAD on Brew steps works the same way ("… Stop it before clearing the brew steps.").

![LOAD over a stopped brew asks first](pictures/02-ask-monitor.png)

**On Brew Day** (Amber's part, agreed): while a recipe is loaded and not begun, its column offers **OTHER RECIPE**. That opens the five newest recipes, in the same rows, with LOAD, then ALL RECIPES (this page) and CLOSE. Once you LOAD one, the column becomes that recipe, ready to start. After a brew finishes, Brew Day goes back to "No recipe running", with every recipe and LOAD. Mid-brew, Brew Day offers no swap; that is the Recipe book's question above.

### Importing

IMPORT opens on the right, in three parts:

- **From a file:** drop the file, or CHOOSE FILE. That's a BeerXML file from BeerSmith or most brewing programs, an MMuM file, or a Kleiner Brauhelfer database. Its recipes are listed straight away, with no page reload, each with IMPORT. The last file sent stays listed, so after changing a setting you can import again without sending it again. A line says how to export from BeerSmith.
- **From Brewfather:** if your Brewfather user ID and API key are in Settings, your Brewfather recipes are listed A to Z, with FIND and REFRESH LIST. Today's "50 at a time" page picker goes. If they aren't set, a line says where to set them.
- **Imports use these settings:** the mash tun, the boil kettle, the boil and whirlpool temperatures, the sparge step, and whether mash in and mash out are added. These are the things a recipe file can't say. The whirlpool temperature matters most, because a BeerXML file never gives one.

**IMPORT only adds the recipe to the Recipe book. It no longer changes Brew day.** So an import can never replace a brew. The result shows in place: "Imported Craftbeerpi Test Recipe v6. It's in your Recipe book, at the top." The new recipe opens on the left so you can check its steps, and its row is there with LOAD (Amber's suggestion), so going from import to brewing costs one tap more than today.

Importing a recipe again under the same name replaces the earlier import, never a recipe you've changed or saved here, as since 5 Nov. CraftBeerPi's warnings show in place too, as well as in the title bar. For example: "This recipe has 7 boil additions, but the boil step can remind you of only six." A refusal says why in CraftBeerPi's words, with SETTINGS beside it.

![Imported, with CraftBeerPi's warning](pictures/09-imported-monitor.png)

### Changing a recipe (the steps editor)

EDIT, or a tap on any step, opens the recipe's settings on the right. The steps on the left become its index, as Settings' groups are: tap one to jump to it, and the one in view is marked in blue.

- **Two copies, said plainly.** The Recipe book keeps recipes. LOAD copies one onto Brew day. Changing a recipe in the book changes the book's copy, and the page says so at the top ("The Recipe book's copy. Brew day's isn't changed."). Brew steps changes Brew day's copy.
- **One SAVE, with UNDO, as on Settings and Hardware.** A changed setting turns blue and says what it was, with its own UNDO. The step on the left is tagged CHANGED, NEW, MOVED or REMOVED. SAVE says how many changes it will save. Leaving with changes asks: SAVE AND GO, GO WITHOUT SAVING, or STAY.
- **Each setting in plain words**, with one line on what it does and CraftBeerPi's name underneath. For example, "Minutes · Counted once the mash is at temperature · Timer", or "Switch AUTO on · No: nothing heats for it, and you run the vessel by hand · AutoMode". Settings come in groups, such as a mash in's "When the water is ready".
- **The boil's additions** are one line each: minutes left and what to add, with REMOVE. + ADDITION stops at six, because the boil step has six reminders, and says so.
- **+ STEP** lists the kinds of step in brewing order (Before the brew, Mash, Sparge, Boil, After the boil, Any time), each with what it does and where it will go: "Goes in as step 4, before Mash Out". A new step goes where its kind belongs in a brew, so it rarely needs moving (below). It starts with CraftBeerPi's own defaults for its kind (AUTO on, its vessel chosen), so it heats as it should. MOVE and REMOVE STEP sit on each step.
- **Delete** is last, apart from everything else, and asks first: "Delete Craftbeerpi Test Recipe v3 from the Recipe book? This can't be undone."
- **Saved while it's on Brew day.** If you change the recipe that's loaded and not begun, the page says Brew day still has the older copy, with **LOAD AGAIN**. Once a brew has begun, it says the change is for next time.

![Changing a recipe: three changes, the step in view marked on the left](pictures/04-edit-monitor.png)

### Moving a step

**MOVE, then PUT IT HERE.** MOVE is on each step's settings. The step is marked MOVING, and PUT IT HERE fills every place it can go, each saying where the step will land ("as step 1"). One tap there puts it. FIRST and LAST sit over the steps for the long moves, which are the usual ones, so taking BrewStart from step 9 to step 1 is two taps with no scrolling.

- CANCEL, Escape, or any other button leaves the step where it was.
- While a step is being moved, only the places between the steps answer a tap, so a tap can't open another step by mistake. The bar over the steps says what is moving.
- The step then says MOVED, and its settings say where it was. SAVE keeps it; UNDO puts it back.
- On a phone, MOVE goes to the list of steps, and its bar stays at the top of the screen while the list scrolls.
- On Brew steps, a step that has begun (done, running or stopped) stays where it ran, and nothing goes above it, because CraftBeerPi runs the steps still to come in order.

**Where each kind of step goes when it's added:** BrewStart first. Mash in before the first rest. A mash rest before the mash out, or after the last rest. The sparge after the mash. The boil after the sparge. The whirlpool after the boil. Cool down last. A message, a wait or a switch can't be placed by its kind, so it goes after the step you had open, or last.

![Moving a step: today, then MOVE, then moved](pictures/34-compare-moving-monitor.png)

### Adding BrewStart first

On a recipe without BrewStart, a dashed line over step 1 offers it: **+ BrewStart**, "Hot water by a set time · goes in as step 1". It's there in the Recipe book and on Brew steps, until a brew begins. One tap puts BrewStart in as step 1 and opens its settings at **When**, with the time box ready.

- **Filled in for you:** Ready by, plus the HLT, its element's watts, the water and the Campden choice, from the newest BrewStart CraftBeerPi has (on Brew day, or in the newest recipe with one). The water temperature is the recipe's mash in temperature; on Brew Day the strike water box can change it, as it already does. The day is Tomorrow from noon (the night before) and Today before noon. A note says where each came from.
- **Left for you: the time.** It's the one thing only you know, so it isn't guessed. SAVE waits for it ("set BrewStart's time first").
- **The time in words,** worked out as BrewStart works it out: "With START pressed today, the HLT's water is hot by 07:00 tomorrow, Mon 23 Nov." A time already past says so: "07:00 today has passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW."
- **Only the settings that apply show,** as BrewStart's own form shows them: the heating ones for Ready by, Then (move on or wait) for Start at, the date for Date. They're grouped under When, The water, and The HLT and the notice.

![Adding BrewStart: today, then + BrewStart, then the time](pictures/35-compare-adding-brewstart-monitor.png)

The same on a phone: [`36-compare-phone`](pictures/36-compare-phone.png).

**On Brew Day, the night before,** setting the time could be quicker still, without opening a recipe at all. That screen is Amber's; I've suggested it to her (see [the options](#moving-a-step-and-adding-brewstart-the-options-i-weighed), and question 7).

### Brew steps

The same page shape, for **Brew day's copy**: the loaded recipe on the left as Brew Day shows it, with ✓ DONE and a running step's time left, and its settings on the right.

- Changes here are for this brew, with SAVE and UNDO. **SAVE TO BOOK** keeps them for next time. It asks whether to **replace the book's copy** it was loaded from, or **save as a new recipe** under a name you give.
- A running step's settings are greyed, with the reason: CraftBeerPi doesn't change a step while it runs. A finished step says a change counts only after a reset to step 1.
- **UNLOAD** follows LOAD's rules, and Brew day goes back to brewing by hand.
- **No START, NEXT, STOP or RESET here any more.** They're on Brew Day, where START is held for a second. BREW DAY takes you there.

![Brew steps while a step runs](pictures/11-brew-steps-running-monitor.png)

### On a laptop, a tablet and a phone

- **A laptop (1366 wide) or larger:** one screen. The steps and the right-hand side scroll on their own.
- **900 to 1179 px:** still side by side. The page scrolls and the recipe stays in view beside it.
- **899 px and narrower:** one thing at a time. First the book, then a recipe, then one step's settings, each with the way back at its top.
- **A phone** does everything a monitor does, with SAVE on a bar above the tabs.

Pictures: [`13-book-laptop`](pictures/13-book-laptop.png), [`14-edit-tablet`](pictures/14-edit-tablet.png), [`15-book-phone`](pictures/15-book-phone.png), [`16-recipe-phone`](pictures/16-recipe-phone.png), [`17-ask-phone`](pictures/17-ask-phone.png), [`18-step-phone`](pictures/18-step-phone.png).

## Moving a step and adding BrewStart: the options I weighed

"Web page" means only the web page changes. "CraftBeerPi" means the server changes too (Brett's part). The Recipe book's copy of a recipe is saved whole in one go, so anything there is web page only.

**Moving a step**

| Way | Good and bad | Cost |
|---|---|---|
| **Today's arrows**, one place per press | Nothing new to learn. But one press, and one save, per place, and the arrow moves under your finger. | None |
| **Arrows that stay put**: the list scrolls so the arrow stays under your finger | A cheap fix to the hunting. Still 8 presses for BrewStart in v5. | Web page |
| **MOVE, then PUT IT HERE**, with FIRST and LAST (recommended) | Two taps for any distance. The same with a finger, a mouse or a keyboard, on a monitor or a phone, with nothing to hold or drag. While a step is moving, the other steps can't be opened. The bar and the marked step show that, and any other button ends the move. | Web page; on Brew steps, change 5 below |
| **Drag a step** to its place | Familiar from phones and computers. But hard with wet hands on a touch screen, a drag fights with scrolling a long list, and drops land in the wrong place. A tap-only way is needed anyway, and that is PUT IT HERE. | Web page, the most code |
| **Type its number** | Exact, and quick with a keyboard. But you work the number out first, and on-screen keyboards make it slow. | Web page |
| **TO TOP and TO BOTTOM** on every step | BrewStart in one tap. Nothing in between, though, and two more look-alike buttons on every step. Kept as FIRST and LAST, shown only while moving. | Web page |
| **New steps go where their kind belongs** (recommended) | Most moves today come from + putting every step last. BrewStart, mash in, a rest, the sparge, the boil and the whirlpool land in place. A message, wait or switch goes after the step you had open. | Web page; on Brew steps, change 6 below |

**Adding BrewStart first**

| Way | Good and bad | Cost |
|---|---|---|
| **+ BrewStart over step 1**, filled in, the time left for you (recommended) | Offered where you are, on any recipe without one. Nothing to move, and only the time to set. One more quiet line on such recipes. | Web page; on Brew steps, change 6 below |
| **A time on Brew Day the night before** (recommended, if Amber agrees: her screen) | In Brew Day's strike water box, on a recipe loaded and not begun: "HOT BY 07:00 tomorrow · CHANGE", or SET A TIME when there's no BrewStart, which adds one as step 1. The most direct: you're on Brew Day then anyway, the box already sets BrewStart's water and grain temperature, and the recipe in the book keeps no stale time. The time is for this brew only; SAVE TO BOOK keeps it. | Brew Day page, and change 6 below |
| **+ STEP puts BrewStart first** | No moving, but the whole + STEP list and its form. | Part of "new steps go where their kind belongs" |
| **Every import adds BrewStart**, as it adds mash in and mash out, with a switch in Settings | No tap at all. But every imported recipe gets a heating plan, wanted or not. Its time would be a fixed one from Settings, and Tomorrow, with START pressed after midnight, aims a day late. Not now; easy to add later. | CraftBeerPi: the import and a setting |
| **LOAD asks "Add BrewStart?"** | A question at every LOAD soon becomes a habit, and most loads wouldn't want it. Not recommended. | Web page |

**What I recommend:** new steps go where their kind belongs; MOVE, then PUT IT HERE, with FIRST and LAST; and + BrewStart over step 1, filled in, with the time left for you. If Amber agrees, setting the time on Brew Day the night before too. That would be the shortest way of all, and a recipe would never need BrewStart in the book.

Why not dragging: on a touch screen, NN/g advises dragging only when people expect it and there's no cheaper way, such as choosing from a list or cut and paste, and WCAG 2.5.7 asks for a tap-only way anyway. PUT IT HERE is that tap-only way, and it's as quick as a drag.

## Agreed with Amber (Brew Day's designer)

1. One word, LOAD, and one row look on both screens: Brew Day's own recipe-book row.
2. The loaded recipe's row uses Brew Day's status words in capitals, plus FINISHED.
3. Brew Day offers another recipe (OTHER RECIPE) only where LOAD is one tap: a recipe loaded and not begun. Where it goes in her column waits on the column rework you asked her for tonight.
4. After LOAD on Brew Day, the column becomes the new recipe. A refusal shows its reason under the list.
5. Import only adds to the book, and its page ends on the new recipe's row, with LOAD.
6. A greyed LOAD names what is running, in brewing words.
7. A known limit, with no question for it: LOAD on a recipe not begun drops changes made to its brew steps since loading. Examples are BrewStart's ready-by time, the water and grain temperature, and a strike temperature from the strike water's USE. Pressing START protects them, because BrewStart then counts as running. A question every time would become a habit.

## Assumptions I made

1. You import mostly BeerXML from BeerSmith. MMuM, Kleiner Brauhelfer and Brewfather stay, below it.
2. You change recipes mostly at the desk, on the monitor. A phone can still do all of it.
3. The book stays small, tens of recipes, so newest first with FIND is enough. No folders or tags.
4. The malt, hops, misc and yeast editors aren't wanted: CraftBeerPi's recipes have no ingredient list, and BeerSmith keeps yours.
5. Changes are saved with one SAVE, as on Settings and Hardware, both in the book and on Brew steps.
6. The plain names for the kinds of step, above, are close enough to the words you use.
7. A new BrewStart starts on Ready by, because it's there to have the HLT hot by a time. Start at stays one tap away.
8. Its day is Tomorrow when it's added after noon (the night before) and Today before noon, and the sentence under its time says which day that is.
9. Its HLT, element, water and Campden choice come from the newest BrewStart CraftBeerPi has, and its water temperature from the recipe's mash in. Its time is never filled in.
10. The places for each kind of step, listed under Moving a step, match how you build recipes.

## Questions for you

1. **The layout:** is the recipe on the left, as Brew Day shows it, with the book and its settings on the right, how you want to see a recipe while choosing and changing it? The design tool dealt two other layouts. One arranges the steps by vessel under the brewhouse drawing. The other is a brew sheet: one table of steps, changed in place. All three show the same recipe, side by side, in [`24-compare-layouts-phone`](pictures/24-compare-layouts-phone.png) and [`25-compare-layouts-monitor`](pictures/25-compare-layouts-monitor.png).
2. **Import no longer loads.** After importing you press LOAD, one tap more than today, and an import can never replace a brew. All right?
3. **Brew steps loses START, NEXT, STOP and RESET.** They stay on Brew Day, where START is held. Do you use the ones on Brew steps today?
4. **The names:** Mash rest for MashStep, Message for NotificationStep, Run a switch for ActorStep, and the rest in the table. Any you'd call something else?
5. **Moving a step:** is MOVE, then PUT IT HERE (two taps, with FIRST and LAST), how you'd like to move steps? Or would you also like to drag them with a finger or the mouse? Dragging would come on top of PUT IT HERE, not instead of it.
6. **BrewStart's timing:** a new BrewStart would start on Ready by, the water hot by the time. Do you also use Start at, which only waits for the time and then starts the next step? Your practice step was set to it.
7. **Where you set BrewStart's time:** in the recipe (+ BrewStart, above), on Brew Day the night before (Amber's screen, if she agrees), or both? And would you like every import to add a BrewStart, as imports add mash out? I'd suggest both of the first two, and not the import.

## What CraftBeerPi (the server) would need

"Web page" means only the web page changes, with no CraftBeerPi update.

| Change | Why |
|---|---|
| **1. Import without loading.** The import endpoints (`POST /upload/xml` and the rest) keep the recipe in the book and leave the brew steps alone, and answer with the book file's id, whether it replaced an earlier import, and the import's warnings. A refusal ends "Nothing was added to the Recipe book" instead of "The brew steps are unchanged". | An import can't replace a brew, and the page can show the result and the warnings in place and open the new recipe. Today `import_recipe` calls `load_recipe`, which stops a running step first. |
| **2. `POST /recipe/{id}/brew` refuses with 409 while a step runs** ("Saccharification is running. Stop it before loading another recipe."), as `/step2/reset` already does. | The page greys LOAD then, but an older page or another screen could still send it, and today CraftBeerPi would stop the running step and load the other recipe. |
| **3. `POST /step2/clear` refuses the same way.** | UNLOAD, for the same reason. |
| **4. Loading records which book recipe it came from, and when**: `book_file` and `loaded_at` in the brew steps' basic data, left out of `book_data()`. | The book can mark exactly which recipe is on Brew day (two recipes can share a name). Brew steps can say where its copy came from. SAVE TO BOOK can replace that copy, and LOAD AGAIN appears only when the book's copy is newer. Without it the page goes by the name, which works until two recipes share one. |
| **5. Set the order of the brew steps in one call**: `PUT /step2/order` with every loaded step's id, in the new order. It refuses with 409 and changes nothing if the ids aren't exactly the loaded steps', or if a step that has begun would move or a step to come would go above one. | MOVE on Brew steps saves as one change. Today the page can only swap neighbours (`PUT /step2/move`, ±1), each saved and sent to every screen, 8 for BrewStart in v5. A START pressed on a screen that hasn't seen the new order is already refused (`recipe_changed`), because START sends the steps' ids in order. |
| **6. Add a step at a place**: `POST /step2/` takes an optional `index` (0 is first). | + BrewStart and + STEP's places on Brew steps in one call, and Brew Day's own time-setting if Amber designs it. Today `StepController.add()` always puts a step last. With change 5 alone, the page adds last and then sets the order: two calls. |

Everything else is web page only. That covers the pages themselves, FIND, the plain names, SAVE and UNDO, saving Brew steps step by step, sending a file without a reload, finding in the Brewfather list (CraftBeerPi already sends the whole list), and SAVE TO BOOK as a new recipe with its own name (`/recipe/create`, then a save). In the Recipe book, + BrewStart, MOVE and + STEP's places need nothing new, because a recipe there is saved whole (`PUT /recipe/{id}`).

Changes 2 and 3 are done: from CraftBeerPi 4.7.7.post51 it refuses LOAD, UNLOAD and an import while a step runs, changing nothing, and from post53 it says so as a notice rather than a warning. Until you answer question 2, an import stays refused while a step runs. Changes 1 and 4 wait for your answers, and changes 5 and 6 for this proposal's.

## For Brett, when it's approved

- The mockup is built like Settings' and Hardware's. The frame rules at the top of `recipes.css` are Settings' copy of Brew Day's, so a port script like `design/settings/port.mjs` can leave them out. `recipes-catalog.js` is the plain-name catalogue, as `catalog.js` is for Settings, and `recipes-data.js` is the demo data.
- LOAD's rules are `loadRule()` and `runningWhy()` in `recipes.js`, and they match Amber's list. The step lines (`stepView`, `additions`, `bookLine`) follow `stepModel`, `additions` and `bookLine` in `brewday/live.js`, so both pages say the same.
- The mockup answers every command after a second. The moments in the strip are its test cases.
- Moving and adding: `naturalPlace()` is where each kind goes, `firstFree()` keeps Brew steps' changes below the steps that have begun, and `moveTo()` and `insertAt()` do the rest. On Brew steps, SAVE would send the new order with change 5 (and new steps with change 6).
- BrewStart: `brewStartProps()` fills a new one in; `whenHTML()` says its time in words, as `schedule.resolve_start` works it out; `needOf()` is what SAVE waits for. Which of its settings show (`show` in `recipes-catalog.js`) copies the plugin's own `show_if`, so the build can read `show_if` from CraftBeerPi's step types instead.

## The other two layouts the tool dealt

The design tool picks among my own list of layouts at random, so I don't always land on the obvious one. For this page it dealt three. The lead is the one above. The other two are drawn with the same recipe open, Craftbeerpi Test Recipe v5, on a monitor and a phone. Each is one picture, not a clickable page.

- **Steps by vessel, on the drawing** ([monitor](pictures/20-other-layout-by-vessel-monitor.png), [phone](pictures/21-other-layout-by-vessel-phone.png)): Brew Day's line drawing across the top, and each step listed under the vessel it runs on, numbered in the order it runs. The sparge water is at the HLT; mash in, the rests and mash out are at the mash tun; the boil and whirlpool are at the boil kettle. The book is a list down the left. It's good for seeing which vessel does what. It's poorer for order, which matters more in a recipe: the numbers jump between columns (5 at the HLT, 1 to 4 at the mash tun). On a phone there is no drawing, as on Brew Day, so the vessels are stacked, with the HLT first.
- **A brew sheet** ([monitor](pictures/22-other-layout-brew-sheet-monitor.png), [phone](pictures/23-other-layout-brew-sheet-phone.png)): the recipe's numbers across the top in small windows (steps, mash, boil, additions, whirlpool), then one ruled table: step, kind, vessel, temperature, minutes, and what it says or the boil's additions. Each cell would change in place, with one SAVE. It's the most compact on a monitor, and the easiest to check against BeerSmith's brew sheet. It's cramped on a phone, where each row becomes a block, and the plain-word help for each setting has nowhere to go.

[`19-v5-open-phone`](pictures/19-v5-open-phone.png) is the proposed design on a phone with the same recipe open, so the three can be compared.

## What I read for this

Your standing sources, for these decisions:

- **NN/g's heuristics:** show what the system is doing (the loaded recipe's state on every row); use the user's words (LOAD, not a paddle); prevent errors (import can't replace a brew); recognition rather than recall (the import settings shown where you import, not remembered from Settings).
- **NN/g, recognition and recall:** for the same reason.
- **MIT 6.831 lecture 5, errors:** errors that destroy work are the worst kind, so confirmations are kept for acts that are hard to undo (LOAD over a begun brew, delete, replacing the book's copy). Dangerous commands sit apart from frequent ones (delete at the end), and rows of look-alike buttons are avoided.
- **Norman:** one conceptual model that matches the world: a recipe book, and the copy on today's brew day.
- **id-book:** the recipe-book metaphor.
- **GT CS 6750:** closing the gulfs of execution and evaluation: LOAD answers at its button, and the row then shows the result.
- **W3C WAI form grouping:** each step's settings grouped under headings, visibly and in the code. BrewStart's under When, The water, and The HLT and the notice.

For moving a step and adding BrewStart:

- **NN/g, drag and drop:** on a touch screen, use dragging only when people expect it and nothing cheaper will do, such as choosing from a list or cut and paste; drops in the wrong place are its usual error. Hence PUT IT HERE, a cut and paste in two taps. https://www.nngroup.com/articles/drag-drop/
- **WCAG 2.2, 2.5.7 Dragging Movements:** anything done by dragging needs a single-tap way too. https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- **NN/g on modes, and MIT 6.831 on mode errors:** MOVE is a mode, a state in which the same tap does something else. So it is short and shown twice over (the bar, and the step marked MOVING). It ends after one placing, or at any other button, and while it lasts the steps can't be opened.
- **Norman, constraints and forcing functions:** a new step lands where its kind belongs, so the usual slip (a step in the wrong place) needs no fixing. A BrewStart can't be saved without its time.
- **NN/g, recognition rather than recall:** + STEP says where each kind will go before you choose it, and PUT IT HERE says the step number it gives. Nothing has to be worked out or remembered, unlike typing a position.
- **The interaction-design checklist (settings and forms):** what changes every brew belongs where the brewing is done. BrewStart's time is that, which is why Brew Day, the night before, may be the best place to set it.

## Files

| File | What |
|---|---|
| `recipes.html` | The mockup, with a link to each moment along the top. Add `?bare` to hide the strip. |
| `recipes.css`, `recipes.js` | Its look and behaviour. |
| `recipes-data.js` | The simulator's recipes, vessels and import settings, and the made-up ones. |
| `recipes-catalog.js` | The plain names of each kind of step and its settings. |
| `other-layouts.html`, `.css`, `.js` | The two other layouts, drawn for their pictures: `?layout=vessel` and `?layout=sheet`. `rig.js` is Brew Day's drawing, copied from `design/brewday`. |
| `pictures/` | The moments at monitor, laptop, tablet and phone sizes; the three layouts side by side (`24-…`, `25-…`); BrewStart and moving (`26-…` to `33-…`), and today beside proposed (`34-…` to `36-…`); and today's pages (`today-…`). |
