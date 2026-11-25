# Recipes: choosing one to brew, importing, and changing steps

The design for the Recipe Book, a recipe's page, importing a recipe, and Brew Steps, made the way Settings and Hardware were: Brew Day's title bar, tabs and look. **Decided on 22 Nov, and ready to build** (see [Decided](#decided-22-nov)). How to build it, part by part, is in [`BUILD-NOTES.md`](BUILD-NOTES.md).

**The mockup** is [`recipes.html`](recipes.html). Open it in a browser and use the links along the top to see each moment. Its recipes, vessels and settings are your simulator's (8012), read once and never written to. The recipes and files I made up say so on screen. Brew Day's part (OTHER RECIPE, UNLOAD, and setting BrewStart's time the night before) is Amber's; she and I agreed how it works (below).

**This version** adds moving a step and adding BrewStart (your second request), the decisions, one more question before LOAD (when the recipe it would replace isn't in the Recipe Book), what SAVE TO BOOK keeps of a brew, times of day in 12-hour, and on a simulator, CraftBeerPi's own clock where BrewStart's time is set.

## What you asked (22 Nov)

> "Have the appropriate agent start working on refactoring the recipe import page, the steps editor (why is/was it called something similar to mash steps editor?) and refactor how I choose the recipe I want to brew."

Later, practising on the try-out simulator:

> "I'm practicing adding the BrewStart step to my test recipe v5. I don't like how I need to keep finding a new arrow to click to move the step up one place. In fact, I don't like that I need to go so deep into the recipe editor to add a brewStart step, it seems like something that could be added as the first step for me in a simpler more direct way. have the right agent brainstorm better options. Also need to revamp how the recipe editor works and get it onto our brewday theme"

## What's wrong today

Pictures of today's pages are in [`pictures/`](pictures/), named `today-…`.

- The Recipe Book, the recipe editor, the import page and Brew Steps are still the old green pages with the menu.
- **Choosing a recipe** means opening it, then pressing a paddle icon. Its only label is the hover tooltip "Send recipe to Kettle". A touch screen has no hover.
- **Brew Day** lists recipes with LOAD only when no recipe is loaded. On the rig a stale Test Recipe was loaded, so the list never appeared.
- **Importing also loads.** An import replaces Brew Day's recipe at once. So does the paddle icon. If a step is running when either happens, CraftBeerPi stops it (its kettle's AUTO goes off) and loads the other recipe in its place.
- **Importing takes several steps.** You upload the file, and the page reloads. Then you pick the recipe from a drop-down and press "Create Recipe from BeerXML recipe".
- **Brew Steps has its own START, NEXT, STOP and RESET** buttons, as unlabelled icons. Its START is one tap, so it gets round Brew Day's one-second held START.
- **SAVE on Brew Steps** adds another copy to the Recipe Book every time it's pressed, all with the same name.
- The editor's malt, hops, misc and yeast editors were never connected: no page uses them. A CraftBeerPi recipe has no ingredient list. The boil's additions live in its boil step.
- **Moving a step goes one place per press.** On Brew Steps, each arrow swaps a step with its neighbour and saves at once. The list redraws, so the arrow you need next has moved. + always adds a step last, so a step that belongs first needs a press for every place: 8 for BrewStart in v5.
- **Adding BrewStart is deep.** + opens a page of its own. You choose BrewStart from CraftBeerPi's own names, then Ready by, and fill up to 13 boxes, every one blank: no vessel, temperature, water or element power is filled in, though CraftBeerPi has them all. Save puts it last.
- **BrewStart's form starts on Start at**, which only waits for the time and then starts the next step. Ready by is the one that has the water hot by the time. Your practice step on the simulator is called "ready by" but is set to Start at, so it waited until 12:04 PM and then started MashIn, rather than having the HLT hot by 12:04 PM. If you meant the water to be hot by then, the form's first choice caught you out. (BrewStart 1.2.0.post9 now starts its form on Ready by.)

## Your naming question

**Why was it called something like "mash steps editor"?** CraftBeerPi began with the mash. Its first versions ran a mash schedule: a list of rests, each a temperature held for a time. Brewing software calls that a mash profile; BeerSmith still does. So the page was "Mash Profile", and the code that lists and edits a recipe's steps was named `MashStepList` and `MashStepEditor`.

Later the steps grew to cover the whole brew day: mash in, the rests, mash out, the sparge, the boil and its additions, the whirlpool and cooling. The names stayed. On 5 Nov you said the name didn't fit ("it describes the entire brew day and not just mash"), so the menu now says Brew Steps. The page's address (`#/mashprofile`) and the code kept the old names so bookmarks would keep working.

**The words I propose:**

| Today | Proposed | Why |
|---|---|---|
| Brew Steps (menu); Mash Profile (address, code) | **Brew Steps** | Unchanged: the steps of the recipe on Brew Day. |
| A recipe's "Brew Steps" | **Steps** | A recipe in the book has steps. Brew Steps are the copy Brew Day runs. Two names, because they are two copies. |
| Paddle icon, "Send recipe to Kettle" | **LOAD**, "onto Brew Day" | Brew Day's own word, on a button that says what it does. |
| Import recipe, Upload, "Create Recipe from BeerXML recipe" | **IMPORT** | One word for one act. |
| Clone | **COPY** | |
| Clear (Brew Steps) | **UNLOAD**, "brew by hand" | It undoes LOAD. |
| Save (Brew Steps to the book) | **SAVE TO BOOK** | It asks: replace the copy they came from, or save as a new recipe. |
| Basic Data | **Name and notes** | |
| Up and down arrows (Brew Steps) | **MOVE**, then **PUT IT HERE** | Two taps, however far. |
| + ADD, "Step Config" (Brew Steps) | **+ STEP**, and **+ BrewStart** over step 1 | The step's settings open beside the steps, not on a page of their own. |
| MashInStep, MashStep, SpargeStep, BoilStep, NotificationStep, WhirlpoolStep, CooldownStep, WaitStep, ToggleStep, ActorStep, BrewStart | **Mash in, Mash rest, Sparge, Boil, Message, Whirlpool, Cool down, Wait, Switch on or off, Run a switch, BrewStart** | CraftBeerPi's own name stays under each in small type, as on Settings and Hardware. |

In the code, Brett could rename `mashprofile` to `brewsteps`, and `MashStepList` to `StepList` (one list for both pages), and delete `MashStepEditor` and the four ingredient editors. The addresses could become `#/brewsteps`, with `#/mashprofile` still working. That part is his call; you'd only see it in the address bar.

## How it works

### A recipe looks the way Brew Day will show it

On a monitor, the open recipe sits on the left, **in the place and shape of Brew Day's recipe column**: its name, a line saying where it is, three buttons, then its steps, numbered, with temperatures, minutes and the boil's additions, exactly as Brew Day lists them. What you choose is what Brew Day will show, in the same spot. Where nothing runs, the right side of each step says what kind of step it is (MASH REST, SPARGE, BOIL).

The right side holds the book, a recipe's settings, or importing.

![The Recipe Book on a monitor](pictures/01-book-monitor.png)

### The Recipe Book

- **One row per recipe, newest first** (the one just imported or changed is usually the next one brewed), with FIND A RECIPE above. FIND looks in names, where a recipe came from, step names and boil additions, so "citra" finds every recipe with Citra.
- **The numbers that tell recipes apart sit in fixed columns**: steps, mash temperatures, boil minutes and when it last changed. So v3, v4 and v5 line up, and their differences show by eye.
- **Each row ends in LOAD.** The recipe on Brew Day has no LOAD. Its row says what it is doing instead, in Brew Day's own words: READY TO START · STEP 1 OF 8, RUNNING · STEP 3 OF 8 (with a green lamp), STOPPED · STEP 3 OF 8, or FINISHED.
- **Tap a row** to open the recipe on the left. **+ NEW** writes one. **IMPORT** brings one in.

### Choosing the recipe to brew: LOAD

LOAD has the same rules everywhere: on a book row, at the top of an open recipe, and in Brew Day's own list.

1. **One tap** when nothing is loaded, or the loaded recipe hasn't begun or has finished, and the Recipe Book has it. The recipe it replaces stays in the Recipe Book. The button says LOADING… while CraftBeerPi answers, the row then says READY TO START, and the event line says "Craftbeerpi Test Recipe v4 loaded · confirmed".
2. **It asks first** once a brew has begun but no step is running (stopped, failed, or the boil waiting for you), because CraftBeerPi then forgets how far the brew got. It asks in place, as Brew Day's RESET does: "Load Craftbeerpi Test Recipe v4 in place of Craftbeerpi Test Recipe v5? It stopped at step 3, Saccharification, after 16 of its 40 min. CraftBeerPi forgets which steps are done. Kettles, pumps and timers stay as they are." The answers are LOAD INSTEAD and STAY AT STEP 3, and neither is the default.
3. **It asks first, too, when the recipe it would replace isn't in the Recipe Book**: steps built on Brew Steps, or a recipe whose book copy was deleted. Replaced, they'd be gone for good. "Load Craftbeerpi Test Recipe v4 in place of Rye Pale Ale? Rye Pale Ale isn't in the Recipe Book, so it can't be loaded again. SAVE TO BOOK on Brew Steps keeps it. Kettles, pumps and timers stay as they are." The answers are LOAD INSTEAD and DON'T LOAD. It's rare, so it won't become a habit. Amber suggested it; Brew Day's LOAD and UNLOAD ask the same way.
4. **Greyed while a step runs**, and tapped, it says why, in brewing words: "Craftbeerpi Test Recipe v5 is running: Saccharification, 23:41 left. Stop it on Brew Day first." Overnight, a BrewStart waiting for its time counts as running: "BrewStart is waiting to have the HLT at 152 °F by 6:35 PM."

**If CraftBeerPi refuses anyway,** because a step started on another screen just before the press, nothing changes: from CraftBeerPi 4.7.7.post51 it refuses to load while a step runs. LOADING… ends, LOAD turns grey, and CraftBeerPi's own sentence shows under it for six seconds: "Saccharification is running. Stop it before loading another recipe." It looks like the moment *LOAD while a step runs*, in CraftBeerPi's words. UNLOAD on Brew Steps works the same way: "Saccharification is running. Stop it before unloading the recipe." (CraftBeerPi 4.7.7.post58's words).

![LOAD over a stopped brew asks first](pictures/02-ask-monitor.png)

**On Brew Day** (Amber's part, agreed): while a recipe is loaded and not begun, its column offers **OTHER RECIPE**. That opens the five newest recipes, in the same rows, with LOAD, then ALL RECIPES (this page) and CLOSE. Once you LOAD one, the column becomes that recipe, ready to start. After a brew finishes, Brew Day goes back to "No recipe running", with every recipe and LOAD. Mid-brew, Brew Day offers no swap; that is the Recipe Book's question above.

### Importing

IMPORT opens on the right, in three parts:

- **From a file:** drop the file, or CHOOSE FILE. That's a BeerXML file from BeerSmith or most brewing programs, an MMuM file, or a Kleiner Brauhelfer database. Its recipes are listed straight away, with no page reload, each with IMPORT. Once you have chosen a file, its recipes' IMPORT buttons are blue and CHOOSE FILE is grey, so the blue button is always the next thing to press. A recipe you have imported goes grey, as IMPORT AGAIN. When every recipe in the file has been imported, CHOOSE FILE is blue again. The last file sent stays listed, so after changing a setting you can import again without sending it again; its IMPORT buttons stay grey, since you didn't just choose it. A line says how to export from BeerSmith.
- **From Brewfather:** if your Brewfather user ID and API key are in Settings, your Brewfather recipes are listed A to Z, with FIND and REFRESH LIST. Today's "50 at a time" page picker goes. If they aren't set, a line says where to set them.
- **Imports use these settings:** the mash tun, the boil kettle, the boil and whirlpool temperatures, the sparge step, and whether mash in and mash out are added. These are the things a recipe file can't say. The whirlpool temperature matters most, because a BeerXML file never gives one.

**IMPORT only adds the recipe to the Recipe Book. It no longer changes Brew Day.** So an import can never replace a brew. The result shows in place: "Imported Craftbeerpi Test Recipe v6. It's in your Recipe Book, at the top." The new recipe opens on the left so you can check its steps, and its row is there with LOAD (Amber's suggestion), so going from import to brewing costs one tap more than today.

Importing a BeerXML recipe whose name the book has asks first, before anything changes: UPDATE that recipe, or ADD AS A NEW RECIPE (decision 12). A recipe from another file imported again under the same name replaces the earlier import, never a recipe you've changed or saved here. CraftBeerPi's warnings show in place too, as well as in the title bar. For example: "This recipe has 7 boil additions, but the boil step can remind you of only six." A refusal says why in CraftBeerPi's words, with SETTINGS beside it.

![Imported, with CraftBeerPi's warning](pictures/09-imported-monitor.png)

### Changing a recipe (the steps editor)

EDIT, or a tap on any step, opens the recipe's settings on the right. The steps on the left become its index, as Settings' groups are: tap one to jump to it, and the one in view is marked in blue.

- **Two copies, said plainly.** The Recipe Book keeps recipes. LOAD copies one onto Brew Day. Changing a recipe in the book changes the book's copy, and the page says so at the top ("The Recipe Book's copy. Brew Day's isn't changed."). Brew Steps changes Brew Day's copy.
- **One SAVE, with UNDO, as on Settings and Hardware.** A changed setting turns blue and says what it was, with its own UNDO. The step on the left is tagged CHANGED, NEW, MOVED or REMOVED. SAVE says how many changes it will save. Leaving with changes asks: SAVE AND GO, GO WITHOUT SAVING, or STAY.
- **Each setting in plain words**, with one line on what it does and CraftBeerPi's name underneath. For example, "Minutes · Counted once the mash is at temperature · Timer", or "Switch AUTO on · No: nothing heats for it, and you run the vessel by hand · AutoMode". Settings come in groups, such as a mash in's "When the water is ready".
- **The boil's additions** are one line each: minutes left and what to add, with REMOVE. + ADDITION stops at six, because the boil step has six reminders, and says so.
- **+ STEP** lists the kinds of step in brewing order (Before the brew, Mash, Sparge, Boil, After the boil, Any time), each with what it does and where it will go: "Goes in as step 4, before Mash Out". A new step goes where its kind belongs in a brew, so it rarely needs moving (below). It starts with CraftBeerPi's own defaults for its kind (AUTO on, its vessel chosen), so it heats as it should. MOVE and REMOVE STEP sit on each step.
- **Delete** is last, apart from everything else, and asks first: "Delete Craftbeerpi Test Recipe v3 from the Recipe Book? This can't be undone."
- **Saved while it's on Brew Day.** If you change the recipe that's loaded and not begun, the page says Brew Day still has the older copy, with **LOAD AGAIN**. Once a brew has begun, it says the change is for next time.

![Changing a recipe: three changes, the step in view marked on the left](pictures/04-edit-monitor.png)

### Moving a step

**MOVE, then PUT IT HERE.** MOVE is on each step's settings. The step is marked MOVING, and PUT IT HERE fills every place it can go, each saying where the step will land ("as step 1"). One tap there puts it. FIRST and LAST sit over the steps for the long moves, which are the usual ones, so taking BrewStart from step 9 to step 1 is two taps with no scrolling.

- CANCEL, Escape, or any other button leaves the step where it was.
- While a step is being moved, only the places between the steps answer a tap, so a tap can't open another step by mistake. The bar over the steps says what is moving.
- The step then says MOVED, and its settings say where it was. SAVE keeps it; UNDO puts it back.
- On a phone, MOVE goes to the list of steps, and its bar stays at the top of the screen while the list scrolls.
- On Brew Steps, a step that has begun (done, running, stopped or failed) stays where it ran, and nothing goes above it, because CraftBeerPi runs the steps still to come in order. A step still to come that sits above one that has begun stays where it is too: "Saccharification has begun, so the steps above it stay where they are."
- **If a step starts on another screen** while a move or a new step above it isn't saved yet, the page says so, and SAVE waits: "MashIn has begun, so BrewStart can't go above it now. MOVE it below MashIn, or remove it." If SAVE reaches CraftBeerPi first, CraftBeerPi refuses the new order (from 4.7.7.post58) and keeps the one it had. SAVING… ends, and CraftBeerPi's own sentence shows under SAVE for six seconds: "MashIn has begun, so it can't move, and no step can go above it." The move stays on screen, not saved, to put right.

**Where each kind of step goes when it's added:** BrewStart first. Mash in before the first rest. A mash rest before the mash out, or after the last rest. The sparge after the mash. The boil after the sparge. The whirlpool after the boil. Cool down last. A message, a wait or a switch can't be placed by its kind, so it goes after the step you had open, or last.

![Moving a step: today, then MOVE, then moved](pictures/34-compare-moving-monitor.png)

### Adding BrewStart first

On a recipe without BrewStart, a dashed line over step 1 offers it: **+ BrewStart**, "Hot water by a set time · goes in as step 1". It's there in the Recipe Book and on Brew Steps, until a brew begins. One tap puts BrewStart in as step 1 and opens its settings at **When**, with the time box ready.

- **Filled in for you:** Ready by, plus the HLT, its element's watts and the Campden choice, from the newest BrewStart CraftBeerPi has (on Brew Day, or in the newest recipe with one). The water temperature is the recipe's mash in temperature; on Brew Day the strike water box can change it, as it already does. The day is Tomorrow from noon (the night before) and Today before noon. A note says where each came from.
- **The HLT's water is filled in too, never typed:** what the recipe needs, worked out from its BeerSmith file, else the water of the newest brew that was brewed and recorded it, saying which (decision 13). For v5 that's 25.4 gal: BeerSmith's 23.0 gal before the boil, plus 2.4 gal the grain keeps (20 lb at 0.12 gal/lb). See [The HLT's water](#the-hlts-water).
- **Left for you: the time.** It's the one thing only you know, so it isn't guessed. SAVE waits for it ("set BrewStart's time first").
- **The time in words,** worked out as BrewStart works it out, and said as Brew Day's BrewStart box says it, with how long that is: "With START pressed today, the HLT's water is hot by 7:00 AM tomorrow, Mon 23 Nov: in 10 h 20 min." On a simulator it adds the real time: "…: in 17 h 44 min, about 35 real minutes at 30×." A time already past says so: "7:00 AM today has passed, so nothing would start by itself. For tomorrow morning, choose TOMORROW."
- **The time box** takes "7", "7:30" or "730", with AM and PM beside it, as a phone's number keys have no letters. "7 pm" or "19" works too. The sentence under it says how long until then, so 7 PM by mistake reads "in 22 h 20 min", not "in 10 h 20 min".
- **On a simulator** running faster than real time, or on another date, the When settings start with what its clock says: "CRAFTBEERPI'S CLOCK · MON 23 NOV, 1:16 PM · 30× SPEED". Today and Tomorrow are its days, not the PC's. Change the speed and CraftBeerPi puts its clock back to the real time, and the page redraws.
- **Only the settings that apply show,** as BrewStart's own form shows them: the heating ones for Ready by, Then (move on or wait) for Start at, the date for Date. They're grouped under When, The water, and The HLT and the notice.

![Adding BrewStart: today, then + BrewStart, then the time](pictures/35-compare-adding-brewstart-monitor.png)

The same on a phone: [`36-compare-phone`](pictures/36-compare-phone.png).

**On Brew Day, the night before,** setting the time could be quicker still, without opening a recipe at all. That screen is Amber's; I've suggested it to her (see [the options](#moving-a-step-and-adding-brewstart-the-options-i-weighed), and question 7).

### The HLT's water

BrewStart's Water is all the water in the HLT, strike and sparge. You asked for it not to be typed. A new BrewStart, here or on Brew Day, fills it in, in this order:

1. **What the recipe needs**, worked out from its BeerSmith file: the volume before the boil (`BOIL_SIZE`), less anything topped up in the kettle (`TOP_UP_KETTLE`), plus what the grain keeps, plus what's lost under the mash (`LAUTER_DEADSPACE`). Every figure is BeerSmith's own except what the grain keeps: a BeerXML file has no field for it, so it comes from a new setting, Grain absorption, 0.12 gal/lb to start with. For v5: 23.0 gal + 20 lb × 0.12 gal/lb + 0 = **25.4 gal**. That's the strike water (8.26 gal, BeerSmith's "Add 33.04 qt"), the 2.50 gal BeerSmith adds at 168 °F, and 14.6 gal of sparge water.
2. **Else the water of a brew that was brewed**: the newest past brew in CraftBeerPi's logs and BrewScribe that recorded the HLT's water, named in the note. Never a recipe that was only loaded or kept in the book. This is for a recipe from MMuM, Kleiner Brauhelfer or Brewfather, one written here, or one without BeerSmith's mash figures (decision 13).
3. **Else nothing**: the water is left blank for you to give, and the note says so. Brew Day's strike water box asks for it too.

The note in BrewStart's settings says which it is, with the sum: "The water, 25.4 gal, is what this recipe needs, worked out from the recipe file: 23.0 gal before the boil, and 2.4 gal the grain keeps (Grain absorption in Settings, 0.12 gal/lb)."

**How far to trust it.** The parts BeerSmith exports are its own figures, so the sum is as good as your equipment profile. What the grain keeps is the guess: 0.02 gal/lb either way is 0.4 gal for v5's 20 lb. A little over is the safe side for everything that reads the figure. The strike water box then errs low, which the HERMS can put right. Ready by starts heating a little early, and the Campden dose is a little generous.

**What it can't know.** Water left in the HLT under its outlet, or in the HERMS coil and hoses, isn't in the file. Nor is how much the HLT holds. v5 is a 20 gal batch, and its 25.4 gal is more than a 20 gal HLT holds. For a batch that big, the figure is what the brew needs: change it to what you put in, in Brew Day's strike water box.


### Brew Steps

The same page shape, for **Brew Day's copy**: the loaded recipe on the left as Brew Day shows it, with ✓ DONE and a running step's time left, and its settings on the right.

- Changes here are for this brew, with SAVE and UNDO. **SAVE TO BOOK** keeps them for next time. It asks whether to **replace the book's copy** it was loaded from, or **save as a new recipe** under a name you give.
- **The book keeps the recipe, not this brew.** Three things Brew Day sets for one brew go into the book as the recipe had them: BrewStart's day as Tomorrow, at the same time (Brew Day writes it as a date, so a START after midnight still means the same morning); the strike water as it was before USE, which the strike water box works out again for each brew; and no grain temperature, since Brew Day asks where the grain is every brew. This brew keeps all three (change 8).
- A running step's settings are greyed, with the reason: CraftBeerPi doesn't change a step while it runs. A finished step says a change counts only after a reset to step 1.
- **UNLOAD** follows LOAD's rules, and Brew Day goes back to brewing by hand. It asks in Brew Day's own words for its UNLOAD: "Unload the recipe and brew by hand? CraftBeerPi forgets it stopped at step 3, Saccharification, after 16 of its 40 min. The Recipe Book keeps the recipe. Kettles, pumps and timers stay as they are." (UNLOAD / STAY AT STEP 3), and for a recipe the Recipe Book doesn't have, before it begins too: "Unload the recipe and brew by hand? It isn't in the Recipe Book, so it can't be loaded again. Kettles, pumps and timers stay as they are." (UNLOAD / DON'T UNLOAD). The event line says "Craftbeerpi Test Recipe v5 unloaded: Brew Day is brewing by hand".
- **No START, NEXT, STOP or RESET here any more.** They're on Brew Day, where START is held for a second. BREW DAY takes you there.

![Brew Steps while a step runs](pictures/11-brew-steps-running-monitor.png)

### On a laptop, a tablet and a phone

- **A laptop (1366 wide) or larger:** one screen. The steps and the right-hand side scroll on their own.
- **900 to 1179 px:** still side by side. The page scrolls and the recipe stays in view beside it.
- **899 px and narrower:** one thing at a time. First the book, then a recipe, then one step's settings, each with the way back at its top.
- **A phone** does everything a monitor does, with SAVE on a bar above the tabs.

Pictures: [`13-book-laptop`](pictures/13-book-laptop.png), [`14-edit-tablet`](pictures/14-edit-tablet.png), [`15-book-phone`](pictures/15-book-phone.png), [`16-recipe-phone`](pictures/16-recipe-phone.png), [`17-ask-phone`](pictures/17-ask-phone.png), [`18-step-phone`](pictures/18-step-phone.png).

## Moving a step and adding BrewStart: the options I weighed

"Web page" means only the web page changes. "CraftBeerPi" means the server changes too (Brett's part). The Recipe Book's copy of a recipe is saved whole in one go, so anything there is web page only.

**Moving a step**

| Way | Good and bad | Cost |
|---|---|---|
| **Today's arrows**, one place per press | Nothing new to learn. But one press, and one save, per place, and the arrow moves under your finger. | None |
| **Arrows that stay put**: the list scrolls so the arrow stays under your finger | A cheap fix to the hunting. Still 8 presses for BrewStart in v5. | Web page |
| **MOVE, then PUT IT HERE**, with FIRST and LAST (recommended) | Two taps for any distance. The same with a finger, a mouse or a keyboard, on a monitor or a phone, with nothing to hold or drag. While a step is moving, the other steps can't be opened. The bar and the marked step show that, and any other button ends the move. | Web page; on Brew Steps, change 5 below |
| **Drag a step** to its place | Familiar from phones and computers. But hard with wet hands on a touch screen, a drag fights with scrolling a long list, and drops land in the wrong place. A tap-only way is needed anyway, and that is PUT IT HERE. | Web page, the most code |
| **Type its number** | Exact, and quick with a keyboard. But you work the number out first, and on-screen keyboards make it slow. | Web page |
| **TO TOP and TO BOTTOM** on every step | BrewStart in one tap. Nothing in between, though, and two more look-alike buttons on every step. Kept as FIRST and LAST, shown only while moving. | Web page |
| **New steps go where their kind belongs** (recommended) | Most moves today come from + putting every step last. BrewStart, mash in, a rest, the sparge, the boil and the whirlpool land in place. A message, wait or switch goes after the step you had open. | Web page; on Brew Steps, change 6 below |

**Adding BrewStart first**

| Way | Good and bad | Cost |
|---|---|---|
| **+ BrewStart over step 1**, filled in, the time left for you (recommended) | Offered where you are, on any recipe without one. Nothing to move, and only the time to set. One more quiet line on such recipes. | Web page; on Brew Steps, change 6 below |
| **A time on Brew Day the night before** (recommended, if Amber agrees: her screen) | In Brew Day's strike water box, on a recipe loaded and not begun: "HOT BY 7:00 AM tomorrow · CHANGE", or SET A TIME when there's no BrewStart, which adds one as step 1. The most direct: you're on Brew Day then anyway, the box already sets BrewStart's water and grain temperature, and the recipe in the book keeps no stale time. The time is for this brew only; SAVE TO BOOK keeps the time of day, with the day as Tomorrow. | Brew Day page, and change 6 below |
| **+ STEP puts BrewStart first** | No moving, but the whole + STEP list and its form. | Part of "new steps go where their kind belongs" |
| **Every import adds BrewStart**, as it adds mash in and mash out, with a switch in Settings | No tap at all. But every imported recipe gets a heating plan, wanted or not. Its time would be a fixed one from Settings, and Tomorrow, with START pressed after midnight, aims a day late. Not now; easy to add later. | CraftBeerPi: the import and a setting |
| **LOAD asks "Add BrewStart?"** | A question at every LOAD soon becomes a habit, and most loads wouldn't want it. Not recommended. | Web page |

**What I recommend:** new steps go where their kind belongs; MOVE, then PUT IT HERE, with FIRST and LAST; and + BrewStart over step 1, filled in, with the time left for you. If Amber agrees, setting the time on Brew Day the night before too. That would be the shortest way of all, and a recipe would never need BrewStart in the book.

Why not dragging: on a touch screen, NN/g advises dragging only when people expect it and there's no cheaper way, such as choosing from a list or cut and paste, and WCAG 2.5.7 asks for a tap-only way anyway. PUT IT HERE is that tap-only way, and it's as quick as a drag.

## Agreed with Amber (Brew Day's designer)

1. One word, LOAD, and one row look on both screens: Brew Day's own recipe-book row.
2. The loaded recipe's row uses Brew Day's status words in capitals, plus FINISHED.
3. Brew Day offers another recipe (OTHER RECIPE) only where LOAD is one tap: a recipe loaded and not begun. Where it goes in her column waits on the column rework you asked her for.
4. After LOAD on Brew Day, the column becomes the new recipe. A refusal shows its reason under the list.
5. Import only adds to the book, and its page ends on the new recipe's row, with LOAD.
6. A greyed LOAD names what is running, in brewing words.
7. A known limit, with no question for it: LOAD on a recipe not begun drops changes made to its brew steps since loading. Examples are BrewStart's ready-by time, the water and grain temperature, and a strike temperature from the strike water's USE. Pressing START protects them, because BrewStart then counts as running. A question every time would become a habit.
8. UNLOAD asks in the same words on both screens (Brew Steps, above), and its line in the event log is the same: "… unloaded: Brew Day is brewing by hand". On Brew Day it's a quiet button at the end of the status line.
9. LOAD and UNLOAD ask before replacing a recipe the Recipe Book doesn't have, on both screens (LOAD's rule 3). Her suggestion.
10. Both screens write Brew Day, Brew Steps and Recipe Book with capitals, as Brew Day's own notes do, so the event log, which every screen shares, spells them one way.
11. Setting BrewStart's time on Brew Day the night before is hers. Tapping BrewStart's row opens its box, which leads with READY BY: a time, and TODAY or TOMORROW with the date. A recipe without BrewStart gets the same "+ BrewStart" row as here, above step 1, and SET adds it as step 1, filled in by the same rules. The same box asks where the grain is tonight, every brew: until it's answered, BrewStart's row says "where's the grain?" in amber.
12. A new BrewStart's day is TOMORROW from noon by CraftBeerPi's clock, the one the title bar shows, and TODAY before, on both screens. Brew Day writes it as a date, so a START pressed after midnight still means the same morning.
13. SAVE TO BOOK keeps the recipe, not this brew (change 8): BrewStart's date goes in as Tomorrow, the strike water as it was before USE, and no grain temperature.
14. Times of day follow Brew Day's Twelve-Hour Rule, in its DESIGN.md: "7:00 AM", "11:15:40 PM", by CLOCK_FORMAT, with saved times kept 24-hour. Typed times are read the same way on both screens, with AM and PM as two buttons beside the time.
15. On a simulator, BrewStart's When settings show CraftBeerPi's clock in the words of her BrewStart box ("CRAFTBEERPI'S CLOCK · MON 23 NOV, 1:16 PM · 30× SPEED"), and the time in words adds the real time ("about 35 real minutes at 30×").

## Decided (22 Nov)

You asked Brett to choose, and he chose what I'd recommended:

1. **Layout:** the recipe on the left, as Brew Day shows it, with the book or its settings on the right. The other two layouts stay as pictures only.
2. **An import no longer loads the recipe onto Brew Day.** It goes into the Recipe Book, and LOAD puts it on Brew Day.
3. **START, NEXT, STOP and RESET leave Brew Steps.** They're on Brew Day, where START is held for a second.
4. **The plain names** for the kinds of step, as in the table under "Your naming question".
5. **Moving a step:** MOVE, then PUT IT HERE, with FIRST and LAST. No dragging.
6. **Ready by** ("I will use ready by"). A new BrewStart starts on Ready by, and Start at is the second choice. BrewStart 1.2.0.post9 starts its own form on Ready by too. A step saved with no Timing still runs as Start at, so the page shows it as Start at.
7. **Both:** + BrewStart in a recipe, and the time set on Brew Day the night before (Amber's design, to come). Imports don't add BrewStart.
8. **The HLT's water stays BrewStart's water volume, but you don't type it** ("Yes - but consider more streamlined options with less clicks required. BrewStart could/should inherit this value from somewhere else."). A new BrewStart gets the water the recipe needs, worked out from its BeerSmith file, else the last brew's figure. Brew Day's strike water box can still change it. See [The HLT's water](#the-hlts-water).

Later that night you asked for two more:

9. **Times of day in 12-hour** ("I don't like the 24h time. Change the BrewStart to use 12-hr time."), everywhere CraftBeerPi shows a time of day: 7:00 AM, 11:15 PM. A new CraftBeerPi setting, CLOCK_FORMAT, keeps 24-hour possible. Times are still saved in 24-hour, so recipes and the rig keep working.
10. **On a simulator, setting BrewStart's time shows the simulator's clock** ("When sim_time_scale is not 1, setting brewStart ready by time needs to show current sim date/time and the current timescale."). And changing the speed puts the simulator's clock back to the real date and time ("Whenever I change the timescale, the simtime date and time need to reset to actual"), which is CraftBeerPi's part.

A recipe without BeerSmith's mash figures only misses what they would add; nothing waits for them:

11. **The Recipe Book says which recipes lack BeerSmith's mash figures.** A recipe whose basic data has no `mash_numbers` (imported before they were kept, imported from another program, or written here) has a quiet line on its book row and in its column: "No BeerSmith mash figures: import its BeerSmith file again to add them." It is a note, not a warning: the recipe loads and brews as before. Figures typed in Brew Day's strike water box (the grain weight and the mash water, named in `mash_numbers`' `typed`) are kept with the loaded recipe, and SAVE TO BOOK keeps them in the book, but they are never BeerSmith's: a recipe with only those keeps the note, which says so, "No BeerSmith mash figures: its mash water was typed on Brew Day. Import its BeerSmith file again to add them." ("its grain weight and mash water were"). A new BrewStart's note doesn't take them for BeerSmith's either: "this recipe has no BeerSmith mash figures to work it out from, only the mash water typed on Brew Day"; where a grain weight typed there goes into the water worked out, it says "worked out from the recipe file and its grain weight typed on Brew Day".
12. **Importing a BeerXML recipe whose name the book has asks first: UPDATE or ADD AS A NEW RECIPE.** The question opens in the recipe's import row before anything changes. Neither answer is the default; CANCEL, or Escape, imports nothing. Names match as CraftBeerPi matches them, whatever the accents, capitals or spaces.
    - **UPDATE "<name>"** brings that book recipe up to date with the file. A recipe changed here (saved in the book, kept with SAVE TO BOOK, copied, or written here) keeps every step, its name, author and notes, and gains BeerSmith's mash figures and the BeerSmith file; it stays your own, so a later import never overwrites it. A recipe still as an earlier import left it takes the file's steps too, since nothing in it was changed. Where several recipes share the name, each has its own UPDATE, with when it was changed or imported.
    - **If that recipe is the one on Brew Day**, UPDATE gives Brew Day's copy the mash figures and the file at once. Nothing is loaded again, and no step, its status or its settings change, so it works while a step runs or BrewStart waits overnight. Brew Day's copy still counts as the book's, so LOAD AGAIN isn't offered for figures it already has.
    - **ADD AS A NEW RECIPE** keeps the import as a recipe of its own beside the others, replacing none.
    - CraftBeerPi does the update: `POST /upload/xml` with `"update": <book file>` or `"new": true` (4.7.7.post72). The answer adds `"updated": true`, `"steps": "kept"` or `"file"`, and `"loaded"`. A refusal (the recipe deleted on another screen, another name, a file that isn't BeerXML) says why and ends "Nothing was changed in the Recipe Book." An older CraftBeerPi isn't asked: the import replaces an earlier import as before.
    - Files from MMuM, Kleiner Brauhelfer and Brewfather bring no mash figures, so they import as before, without the question.
13. **A new BrewStart's water, on Brew Steps and in the Recipe Book:** what the recipe needs, worked out from its BeerSmith figures; else the water of the newest past brew that was brewed and recorded the HLT's water (CraftBeerPi's past brews in the logs and BrewScribe, `GET /figures/`), its note naming that brew and its day; never the water of a recipe that was only loaded or kept in the book. With neither, the water is left blank for you to give, and the note says so. + BrewStart waits, greyed, while CraftBeerPi's past brews come. Its HLT, element and Campden choice still come from the newest BrewStart CraftBeerPi has: they belong to the rig, not to a recipe.
14. **Brew Steps shows the recipe's author and its notes** under its name, read-only, in the column's quieter type. They are changed in the Recipe Book, under Name and notes.

## Assumptions the build follows

1. You import mostly BeerXML from BeerSmith. MMuM, Kleiner Brauhelfer and Brewfather stay, below it.
2. You change recipes mostly at the desk, on the monitor. A phone can still do all of it.
3. The book stays small, tens of recipes, so newest first with FIND is enough. No folders or tags.
4. The malt, hops, misc and yeast editors aren't wanted: CraftBeerPi's recipes have no ingredient list, and BeerSmith keeps yours.
5. Changes are saved with one SAVE, as on Settings and Hardware, both in the book and on Brew Steps.
6. A new BrewStart's day is Tomorrow when it's added after noon by CraftBeerPi's clock (the night before) and Today before noon, and the sentence under its time says which day that is.
7. Its HLT, element and Campden choice come from the newest BrewStart CraftBeerPi has, its water from the recipe (else from the newest brew that was brewed and recorded it, else none), and its water temperature from the recipe's mash in. Its time is never filled in.
8. The places for each kind of step, listed under Moving a step, match how you build recipes.
9. Grain absorption starts at 0.12 gal/lb. BeerSmith keeps yours in its equipment profile, in fl oz per oz: divide by 8 for gal/lb, and set it once in Settings.

## What CraftBeerPi (the server) needs

"Web page" means only the web page changes, with no CraftBeerPi update.

| Change | Why | Where it stands |
|---|---|---|
| **1. Import without loading.** The import endpoints (`POST /upload/xml` and the rest) keep the recipe in the book and leave the brew steps alone, and answer with the book file's id, whether it replaced an earlier import, and the import's warnings: `{"name", "file", "replaced", "warnings": [{"title", "text"}]}`. A refusal ends "Nothing was added to the Recipe Book" instead of "The brew steps are unchanged". It is then never refused for a running step. | An import can't replace a brew, and the page can show the result and the warnings in place and open the new recipe. | Needed (decision 2). Until it's in, an import also loads and is refused while a step runs. |
| **2. `POST /recipe/{id}/brew` refuses with 409 while a step runs.** | The page greys LOAD then, but an older page or another screen could still send it. | Done: 4.7.7.post51, told as a notice from post53. |
| **3. `POST /step2/clear` refuses the same way.** | UNLOAD, for the same reason. | Done: post51 and post53. |
| **4. The steps on Brew Day know which book recipe they match.** Loading records it in the brew steps' basic data: `book_file`; `book_modified`, the book copy's `modified` (the file's time); and `loaded_at`, on CraftBeerPi's clock, for "loaded at 7:38 AM". All three are left out of `book_data()`. And `POST /step2/savetobook` takes `{"file": id}` to replace that book recipe, or `{"name": "…"}` to save the steps as a new one, answers `{"file": id}`, and records it as `book_file`, with its new `book_modified`, a new name becoming the steps' name too. With no body, as today. | The book marks exactly which recipe is on Brew Day (two recipes can share a name). SAVE TO BOOK replaces the right copy, and LOAD AGAIN appears only when the book's copy is newer than `book_modified`. A file's time is the PC's, so it's compared only with another file's time: on a fast simulator CraftBeerPi's clock, and so `loaded_at`, can be days ahead of the PC's. LOAD and UNLOAD know whether the steps can be loaded again (LOAD's rule 3); steps just saved as new can. | Needed. Until it's in, the page goes by names, which works until two recipes share one. |
| **5. Set the order of the brew steps in one call**: `PUT /step2/order {"ids": [...]}`, every loaded step's id in the new order. | MOVE on Brew Steps saves as one change, not one swap per place (`PUT /step2/move`, ±1). A START pressed on a screen that hasn't seen the new order is already refused (`recipe_changed`). | Done: 4.7.7.post58 (0f139e2c). Its refusals change nothing: 400 `bad_body`; 409 `steps_changed` with the loaded ids; 409 `begun` with the last step that has begun ("MashIn has begun, so it can't move, and no step can go above it."). |
| **6. Add a step at a place**: `POST /step2/` takes an optional `index` (0 is first; none or null is last). | + BrewStart and + STEP's places on Brew Steps, and Brew Day's own BrewStart time-setting. | Done: post58, with the same refusals. |
| **7. The figures for the HLT's water.** The BeerXML import keeps three more of the file's figures in `mash_numbers`, beside the grain and strike water it keeps now: `boil_l` (`BOIL_SIZE`), `top_up_kettle_l` (the equipment's `TOP_UP_KETTLE`) and `lauter_dead_l` (`LAUTER_DEADSPACE`), with `infusions_l`, every infusion as BeerSmith shows it. And a new setting, **Grain absorption** (`GRAIN_ABSORPTION`), in the brewery's units: 0.12 gal/lb (1.0 L/kg). | A new BrewStart's water, worked out the same way on both screens (below). A BeerXML file has no grain absorption, and nothing about the HLT. | Needed (decision 8). Until it's in, a new BrewStart takes the last brew's figure. |
| **8. The book keeps the recipe, not this brew.** `book_data()`, which SAVE TO BOOK writes, puts back three things Brew Day sets for one brew. A BrewStart `Mode` of `Date` goes in as `Tomorrow`, with `StartDate` blank and its time kept. The strike water step's `Temp`, and BrewStart's `Ready_Temp`, go in as they were before the first USE (`was` in `strike_day.json`, when its step ids are the loaded ones), while they still hold USE's figure. And BrewStart's `Grain_Temp` goes in blank. The brew steps themselves keep all three. | Brew Day writes BrewStart's day as a date, so a START pressed after midnight still means the same morning; by the next brew that date has passed. USE is worked out from one night's grain, water and rig, and the strike water box works it out again for the next brew; kept, the book would drift a little with every save. Brew Day asks where the grain is every brew. Agreed with Amber. | Needed. Until it's in, the book keeps them as the brew left them: BrewStart won't act by itself on a date that has passed, and says so; the strike water box shows where a kept strike temperature lands the mash; and Brew Day asks about the grain anyway. |
| **9. CLOCK_FORMAT,** a new setting, "12-hour" or "24-hour", which CraftBeerPi adds as "12-hour". CraftBeerPi, BrewStart and BrewScribe write the times in their messages by it. | Every screen shows a time of day the same way, and a message reads like the clock above it (decision 9). | Brett's: core 4.7.7.post60, by his contract (`files\plans\clock-format.md` in his session folder). Until it's in, there's no setting, and the pages show 24-hour, as CraftBeerPi itself then does: a missing setting means 24-hour. |
| **10. The simulator's clock goes back to the real one when its speed changes:** changing SIM_TIME_SCALE puts CraftBeerPi's clock back to the PC's date and time, and open screens are told at once. | Decision 10. The tag and the time in words redraw at once. | Brett's, the core's. Until it's in, the page shows whatever CraftBeerPi's clock says at its next clock check, within a minute. |

Everything else is web page only. That covers the pages themselves, FIND, the plain names, SAVE and UNDO, sending a file without a reload, and finding in the Brewfather list (CraftBeerPi already sends the whole list). In the Recipe Book, + BrewStart, MOVE and + STEP's places need nothing new, because a recipe there is saved whole (`PUT /recipe/{id}`).

## For the build

[`BUILD-NOTES.md`](BUILD-NOTES.md): the pages part by part, CraftBeerPi's calls and answers, every refusal and its words, the bench tests that change, and what in the mockup is only for the mockup.

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

For times of day in 12-hour:

- **NN/g, date-input fields:** let people type, accept the forms they use, don't let leading zeros change the meaning, and when what's typed is clearly wrong, say so and suggest how to fix it. Hence "7", "7:30" or "730", "07:00" read as "7:00", and "That isn't a time: type it as 7, 7:30 or 730, and tap AM or PM." https://www.nngroup.com/articles/date-input/
- **W3C WAI, form instructions:** say what form the data takes, beside the field and tied to it in the code, and don't rely on a placeholder. Hence the help line, which the box points to. https://www.w3.org/WAI/tutorials/forms/instructions/
- **W3C WAI, grouping:** AM and PM are a radio group, and with the box one group named "Time".
- **MIT 6.831 on mode errors, and Norman on slips:** AM and PM are a mode: the same "7" means two times. So the mode is shown right beside the box, and the sentence under it says how long until then, which makes a slip of twelve hours plain.

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
| `BUILD-NOTES.md` | How to build it, part by part. |
| `recipes.css`, `recipes.js` | Its look and behaviour. |
| `recipes-data.js` | The simulator's recipes, vessels and import settings, and the made-up ones. |
| `recipes-catalog.js` | The plain names of each kind of step and its settings. |
| `other-layouts.html`, `.css`, `.js` | The two other layouts, drawn for their pictures: `?layout=vessel` and `?layout=sheet`. Kept as a record; not for the build. `rig.js` is Brew Day's drawing, copied from `design/brewday`. |
| `pictures/` | The moments at monitor, laptop, tablet and phone sizes; the three layouts side by side (`24-…`, `25-…`); BrewStart and moving (`26-…` to `33-…`), today beside proposed (`34-…` to `36-…`), and BrewStart's time on a simulator (`37-…`, `38-…`); and today's pages (`today-…`). |
