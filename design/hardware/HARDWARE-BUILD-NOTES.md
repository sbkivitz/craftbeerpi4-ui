# Hardware page: what it would take to build

For Brett, from Amber. The design is in `C:\src\personal\craftbeerpi4-ui-impeccable` (branch `impeccable-dashboard`, fast-forwarded to UI main 283b056; nothing committed). The arrangement, with the plain names of every control's settings, is in `proposal\HARDWARE-GROUPING.md`. This file says how the page looks and behaves, part by part, and what your two bench tests need.

## Hardware page: ready to build (16 Nov)

The request, relayed by you: "I want the other menus to be redesigned to have a consistent theme to BrewDay. Begin with hardware menu. Ask questions before beginning if any". Then, to me: "Reorganize and refactor hardware like you did for Settings".

The brewer's answers, in order:

- How he uses Hardware: "Now and then, at the desk, to add or change a kettle, probe or switch."
- Switches: "Keep one tap for everything, as today." (I had suggested a held press for elements, as on Brew Day.)
- Fermenters: "Keep a plain link at the end to today's fermenter list, unchanged (Recommended)".
- The arrangement in `HARDWARE-GROUPING.md`: "Looks right, build the mockups."
- The mockup, first look, in a window 763 px wide: "No, I want the top Hardware section to be more of a list like Settings. I like the idea of cross-referencing the schematic. Maybe make that pane static and the top pane can scroll. I also need to see the full IDs for the sensors. Having the ... is not optimal". The mockup now does all three: see "701 to 1179 px wide" and "The list".
- Second look: "Keep a save-to-file button on each kettle in the list as well". Done: see "A kettle's line".
- Third look: "the existing hardware page has much more functionality and information than yours... GPIO, ability to choose their logic, etc.", and then "ok, actually - I like begin able to step into each kettle and set its details.  Still would be nice to see GPIO on the main screen". So the design stays: the list, and stepping into each item to set its details. Each switch's line now shows its GPIO pin, and each probe's line its kind, address and Sensor ID. `HARDWARE-TODAY.md` lists everything today's page and forms show and do, and where each is now.
- From you, relaying an earlier request of his: a warning about empty settings, and a question before saving that offers to fill in the built-in values. See "Empty settings".
- His answer to the comparison in `HARDWARE-TODAY.md`, with the GPIO pins in the list and the empty settings in the mockup: "Looks right: Brett can build it."

The page needs the server support you're adding for empty settings: each logic's `blank_defaults` in the kettle types, and the file preview's `blank` list and `fill`. Nothing else changes in CraftBeerPi's server or plugins.

### Changed after your build (0.5.1.a3.post16)

Your measurements found three problems that were in the mockup too: names split mid-word from 1180 to 1440 px, the list's red readings at 4.3:1, and the MORE buttons and the Fermenters link under 44 px. Measuring every moment at 16 sizes found the same kinds of problem in a few more places. All are fixed in `hardware.css` and `hardware.js`; the sections below say how, and "Checked" says what was measured.

- The list (`hardware.css`, `hardware.js`'s `partRowHTML`): a part's type, address and Sensor ID move out of `.t` into `<span class="sub">` after `.v`, across the line. A reading sits in a sunken window. A switch's pin moves onto the type's line wherever the list is under 396 px wide (`@container hlist`), and stays in view on short screens. Chips never break. See "A part's line".
- The nameplates give way where the drawing's section is under 810 px wide (`@container xr`), with the line over the drawing changed to match (`hardware.js`'s `.np-on`/`.np-off`). See "On a monitor".
- Targets: `.lnk`, `.xalso a` and `.hits button` are 44 px. Contrast: SAVE's second line, an open shared part's name, and readings from before a lost connection. CraftBeerPi names in the file preview break after underscores (`brk()`). See "Accessibility".
- Second round, from the Settings session's sweep: Dim Steel text turns Soft Steel under the pointer (one rule after `.hp.ref .sub small`), and `.row .ct`'s gap is 10 px. See "Accessibility".
- `--select-ink` is gone from `:root`; nothing used it after SAVE's second line went white.

### Where it is

- `proposal\hardware.html`, `hardware.css`, `hardware.js`: the mockup. Open the HTML file straight from disk.
- `proposal\HARDWARE-TODAY.md`: today's page and its forms, item by item, read on 8012 at 283b056, and where each item is in the new design, with what takes more taps and why.
- `proposal\hardware-catalog.js`: the page's catalogue. `HW_OWN` is the rows every kettle, probe and switch has; `HW_TYPES` is each control's and part's plain names, lines, units and headings (PIDBoil, PID_HERMS, BoilPower, Hysteresis, OneWire, SimVessel, GPIOActor, GPIOPWMActor, DummyActor); `HW_SYN` is extra words for FIND; `HW_EMPTY` says what the four settings that mean something when empty do then. Port it as `cbpi4gui\src\components\hardware\catalog.js`, exporting the four, as Settings' `catalog.js` does.
- `proposal\hardware-data.js`: generated, for the mockup only. `sim` is the simulator's (8012) kettles, probes and switches, with every type's settings, as its `/system/` gave them. `rig` is the rig as its records give it: `cbpi-rig-comms` rig/2026-10-08.md (four switches, BK_HEAT on GPIO 5, HLT_HEAT on 6, Recirc_PUMP on 7, Wort PUMP on 8, no pin shared), workstation/2026-10-09.md (both elements are PWM switches at 0.5 Hz) and rig/2026-10-10.md (the HLT on PIDBoil, the links, the probe names Temp_HLT, Temp_Mash and BK, and the HLT's and the Mash Tun's settings). Made up, and the strip says so: the probe addresses, the readings, the pumps' switch kind (GPIOActor) and the Boil Kettle's settings. `blank_defaults` stands in for your server's: each logic's built-in values in °F, read from PIDBoil, PIDHerms and boilpower's `blank_defaults()` and the core's Hysteresis. Don't hand-edit it.
- `proposal\rig.js`: the brew-day drawing, the same file `brew-day.html` uses. In the build, use `rigSVG` from `components\brewday\rig.js`.
- The strip along the top steps through moments: `#open` (the simulator), `#rig`, `#kettle`, `#probe`, `#switch` (on the rig), `#pin`, `#find`, `#changes`, `#empty`, `#ask`, `#saved`, `#delete`, `#add`, `#file`, `#fillin`, `#stale`, `#badfile`, `#fill`, `#leave`, `#waiting`, `#missing`, `#offline`. `?bare` hides the strip. Links work as in the app: `#/kettle/<id>`, `#/sensor/<id>` and `#/actor/<id>` open that record, and `#/kettle`, `#/sensor` and `#/actor` open a new one.
- Mockup-only, not for the build: the strip, `SCENES` and `scene()`, `fitMock()` (fits the page under the strip), the made-up failure (`st.fail`) and the made-up file (`filePlan`, `loadFile`), and the 700 ms and 1.1 s waits that stand in for CraftBeerPi's answers.

### The frame and the port

Hardware opens inside the brew-day frame, layout B: title bar, last-event line, tabs with HARDWARE lit. The mockup's copy is Settings' copy, rule for rule, so it matches the frame you built for Settings. In the build, draw the brew-day frame itself, and put the page in it the way Settings is: its content in a shadow root, its CSS made from `hardware.css` as `design\settings\port.mjs` makes Settings' from `settings.css`. `hardware.css` is self-contained for that reason, and avoids the brew-day class names it would clash with (`.plate`, `.main`, `.seg`, `.note`, `.nw`, `.chg` and the rest are only used inside the page).

### On a monitor (1180 px wide and up)

- The app is one screen tall, `max(100dvh, 620px)`. Left, the list (`.idx`, `clamp(340px, 23vw, 440px)`), which scrolls on its own. Right, the tool row (FIND HARDWARE, + ADD, UNDO, SAVE), and under it the pane: the brewhouse drawing with a nameplate under each vessel, or the item open, which scrolls on its own.
- Where the drawing's section is narrower than 810 px (`.xr` is a container, `@container xr (max-width:809px)`: a window under about 1240 px wide), a nameplate would be too narrow to hold a name beside its reading, so the nameplates give way, as on a tablet. The line over the drawing then reads "Tap a part, or its line in the list, to open its settings." (`.np-off` in place of `.np-on`).
- A window 1000 px tall or less: the list's lines get shorter. 820 px or less: the list's second lines go, and the drawing gives way before the nameplates. A switch's second line stays while its pin is on it (see "A part's line"), so the pin is always in view.

### 701 to 1179 px wide

- One column, and the page scrolls as one. The tool row stays at the top of the window (sticky). The brewhouse drawing is docked at the bottom of the window (`.dock`, sticky, `clamp(250px, 32vh, 340px)` tall), and the list scrolls between them. That's the brewer's "make that pane static and the top pane can scroll": the title bar and tabs scroll away, so the list gets most of the screen.
- The list is one column, as on a monitor and a phone.
- Pointing at a line, or moving to it with Tab, lights its part in the docked drawing. Tapping a part opens it.
- An item opens in the list's place, with ‹ ALL HARDWARE at its top. The docked drawing stays, with that item's part lit, and its line says "The part open above is lit. Tap another to open it." An item outside the drawing says "What's open above isn't in the drawing: no kettle uses it."
- No nameplates and no small drawing in the item's header here: the docked drawing and the list carry the same.
- Opening an item, or going back, scrolls the page so the tool row is at the top. A note (what saving switches off, a failed save, leaving with changes) sticks just under the tool row (`top: 72px`).

### A phone (700 px wide or less)

- The list first. A tap opens the item on its own, with ‹ ALL HARDWARE at the top. No drawing, as on Brew Day.
- The tabs are at the bottom, four and four. UNDO and SAVE sit in a bar above them while there are changes, and that bar says what saving will switch off ("Saving switches one thing off: see above"). Then the amber note scrolls with the page instead of sticking; questions and alarms still stick.

### The list

- Groups by vessel, numbered, in brewhouse order: any other kettle first (the HLT), then the kettle Settings chooses as the mash tun (MASH_TUN), then the boil kettle (BoilKettle). Then "Not in a kettle", always shown, saying "none" and dimmed when it's empty, as on the rig. Then the Fermenters link, which opens today's fermenter page.
- Over the groups: HARDWARE and a line: "3 kettles · 3 probes · 4 switches · all saved"; "3 changes not saved"; "Saving…"; "1 didn't save · 1 not saved" (red first); "No connection".
- **A kettle's line:** its number on a dark band, its name, "AUTO runs PID_HERMS · target 152.0 °F" (or "· no target"), and on the right AUTO OFF, AUTO ON (orange) or a chip: N CHANGED (blue), NEW, DIDN'T SAVE (red edge). The whole line opens the kettle (`a.hk`, `href="#/kettle/<id>"`).
- **FILE beside it** (`.kfb`, a download mark and FILE, `aria-label` and `title` "Save Mash Tun to a file"): saves that kettle's settings file, exactly as SAVE TO FILE… in its page does. Then, under the kettle's line, in green: "Saved Mash Tun settings.json." (`data-kettle-file="table-status"`, `role="status"`). Greyed while the kettle has changes on this page, because the file holds the kettle as it was last saved; pressed then, it says "Save or undo the changes on this kettle first: the file holds the kettle as it was last saved." With no connection it says so. A new kettle not yet saved has no FILE.
- **A part's line**, under its kettle: its kind (PROBE, ELEMENT, PUMP, SWITCH), its name, and on the right a probe's reading or a switch's GPIO pin, then a switch's ON/OFF button. Under them, across the line (`.sub`, `grid-column: 2 / -1`), its type and a OneWire probe's whole address: "OneWire · 28-0316a2794bff", "GPIOPWMActor"; then a probe's Sensor ID, as today's table has it: "Sensor ID afft72Vaoj33KfkXVqyiD8". Running under the reading as well as the name, a whole 22-character Sensor ID fits on one line at every size measured, a 360 px phone included.
- **The reading** sits in a sunken window (`.v.pv`), as the PID window holds the PV and the pin box holds the pin: Process Red on the line's Raised Slate is 4.35:1, under the 4.5:1 that 18 px text needs, and on the window's black it is 6.1:1. A line that's open keeps its red reading. From before a lost connection, a reading is Dim Steel (`.v.stale`, 7.2:1 on the window), not Stale Grey, which is 3.2:1 on the line and 4.45:1 on the window at this size.
- **The pin:** a switch's GPIO pin is in a sunken box of its own (`.pin`: "GPIO 6", or "no pin" for a switch without one). Where the list is too narrow to keep it beside the name (`.hl` is a container; `@container hlist (max-width:395px)`, which is a window under about 1860 px wide, and a phone), it moves onto the type's line instead, kept whole: "GPIOPWMActor · GPIO 6" (`.pin2`, `white-space: nowrap`). At 1366 px the box would have left a name 34 px, so "HLT_HEAT" broke into "HLT_ / HEA / T". Names and addresses wrap at spaces rather than end in "…"; a chip such as CHANGED never breaks.
- A probe's reading has a unit only when the probe reads a temperature (OneWire, SimVessel); another kind's number shows as it is, as today's Value column does.
- **A link with nothing at the end:** a kettle with no probe, element or pump chosen, or one chosen that CraftBeerPi no longer has, gets a dashed line in its place: "PUMP · None chosen · choose one in the kettle", or "Not found · CraftBeerPi has no switch <id>" (`.hp.gap`). It opens the kettle. Today's table says "Actor not Found".
- A part two kettles share appears once, under the first. The other kettle's line for it is dashed, says "with the HLT" and has no button, and opens the same part.
- A switch whose pin another switch also has says so: its pin box turns amber, and its second line says "gpioaCTOR has GPIO 17 too". The rig has none (Gauge's check, 8 Oct), so you'll only see it in a test.

### A switch: one tap

The brewer's choice, so on this page an element is one tap too, unlike Brew Day's Held Heat Rule (DESIGN.md says so beside the rule). The button is Brew Day's lamp button: `role="switch"`, `aria-checked`, its name as its label, a lamp strip along its top (orange for a heating element on, green for a pump on). While CraftBeerPi answers it shows "…" and the marching stripes, then the new state, and the event line says "HLT Pump switched on", with "confirmed" in green after it. With no connection every switch is paused and says why.

### FIND HARDWARE

- Searches names, kinds, wiring (pins, addresses), plain names, keys and values of every setting. Every word has to match (the start of a word is enough), so "p gain" finds every gain.
- A match inside a kettle's settings shows under that kettle as a small line, "HLT P gain 65.0442", up to four and then "and N more". Settings whose own name matches come first, then those whose description does: "boil threshold" lists Boil threshold before Most power.
- Tapping a line opens the kettle at that setting, which flashes. × clears.

### The brewhouse drawing

- Brew Day's layout B drawing (`rigSVG("line", W, 1, "today")`), as wide as its box (`W = max(1200, 470 × width / height)`). Ids are stripped and parts are marked `data-part`: `vessel-0..2` (HLT, mash tun, boil kettle), `probe-0..2`, `el-hlt`, `el-bk`, `pump-hlt`, `pump-wort`, each with the record it opens in `data-key`.
- Which record each part is: the HLT is the kettle that's neither MASH_TUN nor BoilKettle. `el-hlt` is the HLT's heater, `el-bk` the boil kettle's heater, `pump-hlt` the HLT's pump (agitator), `pump-wort` the mash tun's.
- Brew Day's drawing has no thermometers, so this page draws a probe into each vessel (a short line and a ring, `.probe`).
- The pumps' labels show the names CraftBeerPi has for them ("Recirc_PUMP", "Wort PUMP"), cut with "…" after 15 characters; the list and nameplates show them whole. Elements and pumps show whether they're on.
- Pointed at: `.hot`. Open: `.sel`. Both draw the part in `--active-edge`.
- On a monitor, under each vessel a nameplate lists its kettle, probe, element and pump, wired and live, and the line under them names what isn't in the drawing: "Not in the drawing: Glycol Pump, which no kettle uses. Fermenters are on their own page."

### An item's page

- **Its header:** on a monitor, a small copy of the drawing with the item's part lit (`.mini`), which goes back to the whole drawing. Then its kind and how it's wired ("ELEMENT · GPIO 6", "PROBE · 28-0316a2794bff", "KETTLE"), its name, and what it is in a sentence: "AUTO runs PID_HERMS. Settings chooses it as the mash tun." or "The HLT's heating element. The Mash Tun uses it too, as its heating element: it heats the mash through the HERMS coil." On the right, live: a kettle's or probe's reading, big, in PV red, with "AUTO OFF · NO TARGET" (a target of 0 or blank reads "no target"); a switch's button with "OFF · ONE TAP", and in amber "gpioaCTOR uses GPIO 17 too" when another saved switch has its pin.
- **Its own rows first:** Name, then the kind (AUTO control, Kind of probe, Kind of switch), then a kettle's Probe, Heating element and Pump. So a kettle's control and a switch's kind are in view when the item opens, on a monitor, a tablet and a 390 px phone. A switch's GPIO pin is the first row after its kind.
- **A kettle's Settings file group** (M97), after those rows: see "The settings file" below.
- **Then its control's settings, as rows**, grouped by what they do, with Settings' row anatomy: the plain name, a line on what it does, CraftBeerPi's key underneath in small type, MORE for the plugin's whole note where it says more, and the control on the right. A plugin this page doesn't know keeps its own names and descriptions, marked "Its plugin's words".
- **Controls:** the name (`input#name`), which needs one: an empty name reads "Needs a name" in red, and SAVE is refused until it has one, as today's "Name *". The kind ("AUTO control" for a kettle, "Kind of switch", "Kind of probe"), with a line under it on what the chosen one does, and "None" first, as today's "---" (a new item's says "Choose one").
- **Each kettle control keeps its own settings**, as today's form does (`props_by_type`): choosing another control puts the changes made to the first one's settings aside on the page, and shows the settings the chosen one last had on this kettle, or none. Choosing the first again brings its back, changes included; UNDO on the AUTO control row does the same. Saved, the page sends the chosen control's settings, and CraftBeerPi keeps the old control's under `props_by_type`. A probe or switch keeps settings two kinds share, such as a switch's GPIO pin, as today's forms do. Links (probe, element, pump, and a control's own links such as PID_HERMS's HLT probe) as menus, "None" first, a probe's with "Reads 67.9 °F now." under it. A choice of up to four short values as a row of buttons (YES/NO, 2/5). Numbers with their unit; an empty box reads "empty", and the line under it says what the control uses then (see "Empty settings"). A switch's GPIO pin, with the pin guard below.
- **The pin guard:** when the pin chosen is another switch's, the row says so under it, in amber, as you choose: "Recirc_PUMP has GPIO 7 too: both would switch the same pin." (`aria-live="polite"`). CraftBeerPi allows it, so it's a warning, not a refusal.
- **A row's status line:** "CHANGED · was 15 · UNDO"; "Saving…"; "✓ SAVED 14:33"; "DIDN'T SAVE · CraftBeerPi didn't answer, so it may not have it"; in red, "Needs a number" for a box that doesn't hold one.
- **Delete**, the last row: DELETE… asks first, in place, naming everything that uses the item: "Delete the probe HLT Temp? It's used by the HLT as its probe, the Mash Tun as its PID_HERMS's HLT probe and the Mash Temp as its coil partner. They'll have none until you choose another. This can't be undone." DELETE HLT TEMP / KEEP IT, no default. Not offered while a kettle that uses it runs AUTO, and it says why. A new item that was never saved is dropped at once ("Drop it").

### The settings file

The kettle form's group from 0.5.1.a3.post14, in this page's look, with every state your test drives:

- The group (`data-kettle-file="group"`, legend "Settings file") has a line (`#kettle-file-help`) and SAVE TO FILE… (`#kettle-file-save`) and LOAD FROM FILE… (`#kettle-file-load`). The line by state: "Keep a copy of this kettle's control, settings and links, or load one back. Loading shows the changes first."; with changes on the page, "Save or undo the changes on this kettle first: the file holds the kettle as it was last saved." and neither button; with AUTO on, "Mash Tun's AUTO is on. Switch it off to load a file into it." and only SAVE TO FILE…; a new kettle, "Fill in this kettle from a kettle's settings file. Once it's saved, it can be saved to a file too." and only LOAD FROM FILE….
- Its status line (`data-kettle-file="status"`): "Saved Mash Tun settings.json."; "Loaded Mash Tun settings.json into Mash Tun: 1 change."; in red (`role="alert"`), "notes.json can't be loaded: it isn't JSON. Choose a settings file that CraftBeerPi saved from a kettle." with no preview; for a new kettle, "Filled in from Mash Tun settings.json. Check it, then press SAVE to add the kettle."
- The preview names what loading would leave empty, and can fill those settings in first: see "Empty settings".
- The preview (`[data-kettle-file="preview"] [role="dialog"]`), amber: "Load settings into Mash Tun?" (`#kettle-file-title`), "From Mash Tun settings.json, saved from the kettle Mash Tun by CraftBeerPi 4.7.7.post36 on 15 Nov 2026, 21:40." (`#kettle-file-from`), "1 change" (`data-kettle-file="heading"`), and a table of what changes, Setting / Now / After loading (`data-row`, `data-side="now|after"`, `data-changes="yes|no"`), the rest behind "Show the 24 that stay the same". Links show names, not ids. CANCEL (focused when the preview opens, `#kettle-file-cancel`) and LOAD INTO MASH TUN (`#kettle-file-confirm`), no default.
- The kettle changed on another screen: loading is refused in the preview, in red (`data-kettle-file="error"`, `role="alert"`): "Nothing was loaded: Mash Tun has changed since this preview. It was changed on another screen. LOOK AGAIN shows what loading would change now." LOOK AGAIN redraws the preview from what the kettle has now and focuses CANCEL; LOAD INTO MASH TUN is greyed until then.
- A new kettle (+ ADD, or `#/kettle`): "Fill in this kettle from a file?", "22 settings to fill in", FILL IN THIS KETTLE. It fills in the name, control, links and settings on the page, and sends nothing until SAVE.
- The file input stays as today (`#kettle-file-input`, `data-kettle-file="input"`); the mockup only pretends to read a file.

### Changing and saving: one SAVE

- Changes wait on the page. SAVE sends them, one item at a time, because CraftBeerPi saves a whole kettle, probe or switch at once. UNDO puts them all back; a row's UNDO puts back that row.
- SAVE stays usable with nothing changed, in a quiet look (`.cmd.go.idle`), and pressing it says "Nothing has changed yet: change a setting, then SAVE." That keeps your deep-link test's "Save is usable once loaded" true. It's refused (`aria-disabled`) while the record hasn't arrived, for a record that doesn't exist, with no connection, and while a box needs a number, and pressing it then says which.
- **What saving switches off, before SAVE.** CraftBeerPi switches a kettle's AUTO off whenever its settings are saved, and leaves it off (`BasicController.update` stops it, and a kettle doesn't start itself again). It switches a switch off before replacing it. So while a change would do that, an amber note says it: "Saving HLT switches its AUTO off, as CraftBeerPi does whenever a kettle's settings are saved. Switch it on again on Brew Day." or "Saving HLT Heater switches it off first."
- **After SAVE:** the event line says "Hardware: HLT saved · HLT's AUTO is off", with "confirmed" in green after it. If one item fails, the others still save, and the event line says "Hardware: HLT saved; saving Mash Tun", with "failed" in red after it. A red note says "Mash Tun didn't save. CraftBeerPi didn't answer, so it may not have it. It's still on this page; nothing else is affected." with TRY AGAIN, and SHOW IT when another item is open. Its rows say DIDN'T SAVE and why. SAVE sends it again too.
- **Leaving with changes:** a tab or the Fermenters link asks first: "Leave Hardware with 1 change to HLT not saved?" SAVE AND GO (then Settings) / GO WITHOUT SAVING (drops it) / STAY (keep changing).
- **No connection:** the connection lamp blinks, readings turn grey, and a red note says "No connection to CraftBeerPi. Readings are as they were at 14:31, in grey. Your changes stay on this page until it's back; then SAVE sends them. Switches wait too."
- **A link opened before its record arrives:** "Opening the probe… Waiting for CraftBeerPi to send it. SAVE waits too, so nothing blank can be saved over it." **A link to nothing:** "No kettle here. CraftBeerPi has no kettle with the address no-such-record-0000. It may have been deleted, or the link is old." with ‹ BREWHOUSE, and SAVE refused. Both keep a hidden, read-only `#name`.

### Empty settings

The brewer asked to be warned about empty settings, and offered the built-in values before saving.

- **The values** come from your server: `GET /kettle/` gives each logic's `blank_defaults` in its types, `{setting: value}`, in the brewery's unit. The page shows each to seven significant figures, as the preview's words do (`_say_own`), and fills that in: PIDBoil's P in °F is 65.04417. Four settings mean something when empty and are never filled: MashIn_DeltaTemp (uses HLT lead), MashIn_Pump_Within (pumps from the start), HLT_Kettle (found from the HLT probe) and Usual_Boil_Power (boil power stays as you left it). They aren't in `blank_defaults`; `HW_EMPTY` holds those words. Linked settings are never filled.
- **Under an empty setting**, in the line under its control (`.fx`, the same line the pin guard uses): "Empty: PIDBoil uses 100 %", "Empty: uses HLT lead", or "Empty" when its control has no value for it.
- **Before SAVE**, when any kettle being saved has empty settings with built-in values, an amber note at the top takes the focus (`#note.empties`): "5 settings are empty. Left empty, each uses its control's built-in value:", then a line for each kettle, "HLT (PIDBoil): Most power 100 %, Boil threshold 208 °F, Power at the boil 85 %, Stalled-boil minutes 3 min, Control interval 5 s", then what saving will switch off, if anything. The answers: FILL IN AND SAVE (`[data-ask="fill"]`, "with these values"), SAVE WITH THEM EMPTY (`[data-ask="empty"]`, "built-in values apply") and BACK (`[data-ask="back"]`, "nothing saved"). None of them is drawn as the answer. It asks at every SAVE while such settings are empty. SAVE AND GO from the leave question asks too, then goes. TRY AGAIN after a failed save sends what was sent, without asking again.
- **In a file's preview**, a part headed "Empty settings" (`data-kettle-file="blank"`) names what loading would leave empty, from the plan's `blank`: "Loaded as it is, this setting stays empty, and PID_HERMS uses its built-in value: Frozen reading after 300 s." Settings with no value follow: "Also empty, and PID_HERMS has no value to fill in: HLT lead at mash-in (uses HLT lead)."
  - When any has a value, the answers are CANCEL, FILL IN THIS VALUE (`#kettle-file-fill`, "shown as a change first") and LOAD INTO MASH TUN ("1 change; 1 left empty"), none drawn as the answer.
  - FILL IN asks CraftBeerPi for the plan again with `fill=1`. The filled settings show in the table as changes, each marked "PID_HERMS's built-in value" (`data-filled="yes"`, from the row's `filled`). The heading counts them ("2 changes"), and the part says "Filled in with PID_HERMS's built-in value, shown above as a change: Frozen reading after 300 s. Loading saves it." LEAVE IT EMPTY (`[data-file-unfill]`) plans again with `fill=0`. Each redraw focuses CANCEL.
  - LOAD loads with the same `fill` as the plan on screen, as `load_file` requires. Then: "Loaded Mash Tun settings.json into Mash Tun: 2 changes, one of them PID_HERMS's built-in value." For a new kettle: "Filled in from Mash Tun settings.json, with one of PID_HERMS's built-in values. Check it, then press SAVE to add the kettle." LOOK AGAIN keeps the choice.

### + ADD

A menu under it: Kettle ("A vessel's controller: what AUTO runs, and its probe, element and pump."), Probe ("A probe or other sensor. It joins a vessel once a kettle uses it."), Switch ("An element, pump or anything else CraftBeerPi switches."). The new item opens with a NEW chip and its name box focused; SAVE adds it; DROP IT forgets it. Escape closes the menu.

### Your bench tests

- **`test_ui_form_deeplink.py` passes as it is.** I checked its conditions in the mockup at Playwright's own window size, 1280×720: a cold load of `#/kettle/<id>`, `#/sensor/<id>` and `#/actor/<id>` shows `input#name` holding the record's name, and exactly one button named Save (`aria-label="Save"`, with `aria-describedby` for its second line), usable; `#/kettle/no-such-record-0000` and `#/sensor/no-such-record-0000` have one Save, refused. On a phone SAVE only shows while there are changes, but the test runs at 1280×720.
- **`test_ui_navigation.py` passes as it is**: it presses the HARDWARE tab and checks the page isn't still Settings.
- **`test_e2e_kettle_file.py` checks the same things; nine lines change**, because the old table and form are gone, and SAVE can now ask about empty settings first:
  1. The eye, `page.locator("tr", has_text="Mash Tun").locator("td").last.locator("button").nth(1)`, becomes the kettle's line: `page.locator("a.hk", has_text="Mash Tun")`.
  2. `"Settings file" in text(page, '[data-kettle-file="group"]')`: the legend is drawn in capitals and `inner_text` returns them, so compare without case.
  3. `page.get_by_label("P", exact=True)` (in `p_shown` and `loading`): the box is named by its plain name, "Mash P gain", so use `page.locator('input[data-f="props.P"]')`.
  4. "Save or cancel the changes on this form first" becomes "Save or undo the changes on this kettle first".
  5. "AUTO is running" becomes "AUTO is on".
  6. The focus check reads CANCEL's whole text, which is now "Cancel" and its second line, "loads nothing". Check `document.activeElement.id == "kettle-file-cancel"`, or the first line.
  7. The same for LOAD INTO MASH TUN, whose second line is "1 change": compare `confirm.inner_text().splitlines()[0]`.
  8. "press Save to add the kettle" becomes "press SAVE to add the kettle", as the page names its buttons in capitals.
  9. After each press of the page's SAVE (in `loading()` and `new_kettle()`), answer the question about empty settings if it shows: `if page.locator("#note.empties").is_visible(): page.click('[data-ask="empty"]')`. So the test saves what it always did. The preview fills nothing unless FILL IN is pressed, so "1 change" and its rows are as before; LOAD's second line can read "1 change; 1 left empty", which 7 already allows.
- **`test_e2e_kettle_form_logic_switch.py` checks the same things; three things change:**
  1. Choosing the logic, `page.locator("#demo-simple-select").first.click()` and the option, becomes `page.locator("#f-type").select_option(logic)`: the AUTO control is a plain `select`.
  2. Every `page.get_by_label(...)` for P, I and D (in `shown()`, `open_form()` and the loop that fills them) becomes `page.locator(f'input[data-f="props.{label}"]')`: the boxes are named by their plain names, which differ between PID_HERMS ("Mash P gain") and PIDBoil ("P gain").
  3. After SAVE, answer the question about PIDBoil's other empty settings with SAVE WITH THEM EMPTY, as in 9 above. That keeps its check that the server holds PIDBoil with P, I and D only, and PID_HERMS's settings under `props_by_type`. The mockup does the same steps: its own check shows PID_HERMS's P doesn't appear in PIDBoil's box, comes back when PID_HERMS is chosen again, and is kept aside when PIDBoil is saved.

  Unchanged, and in the mockup: `button[aria-label="Save Mash Tun to a file"]` (exactly one), "Saved Mash Tun settings.json." in `table-status` and in `status`, the `#kettle-file-*` ids, the `data-kettle-file` hooks, `PREVIEW`, `data-row`/`data-side`/`data-changes`, "Load settings into Mash Tun?", the from line, "1 change", "has changed since" with LOOK AGAIN in `error`, "notes.json can't be loaded" and "it isn't JSON", "Loaded Mash Tun settings.json into Mash Tun: 1 change.", "Fill in this kettle from a file?", and `disabled()`, since `is_disabled` honours `aria-disabled`.

### Accessibility

- The list is an `ol` of groups. The item open has `aria-current="true"` in the list. FILE is named "Save <kettle> to a file".
- Switches are `role="switch"` with `aria-checked` and the switch's name, which never changes.
- Each control is named by its plain name (`label for`, or `aria-labelledby` on a row of buttons) and described by its line and status (`aria-describedby="w-KEY s-KEY"`).
- Notes are a region; the question before SAVE takes the focus; a failure in the file preview is `role="alert"`; statuses are `role="status"`; the line under a control (the pin guard, or what an empty setting uses) is `aria-live="polite"`.
- Every button and box is at least 44 px tall at every size, the list's switches and lines included (`.hp>a` and `.hp>.hsw`, which makes each line 46 px). A text button in a line of text (`.lnk`: MORE, a row's UNDO, LEAVE IT EMPTY, SHOW THE 24 THAT STAY THE SAME) is a 44 px box, at least 44 px wide, whose `margin-block: -10px` gives back the 20 px it adds, so its line keeps its height; the Fermenters link under the drawing is the same (`.xalso a`). FIND's matches are 44 px rows (`.hits button`).
- Text is at least 4.5:1, large text 3:1, in every moment at every size, measured. Besides the reading's window: SAVE's second line is white on Selection Blue (5.1:1; the pale blue it had was 4.0:1), and the name on an open shared part's dashed line takes the active ink (6:1; Soft Steel was 4.1:1).
- **Under the pointer** too: Dim Steel on Hover Slate is 4.46:1, so Dim Steel text in a hovered line or button turns Soft Steel (7.0:1): a kettle line's AUTO OFF, a part line's kind and the lines under its name, the Fermenters row's note, and a command button's second line. SAVE's white, the answer buttons' own colours and a greyed button keep theirs. The Settings session found it on its page and will match the rule there; Brew Day's `.svbtn` already does the same for its "change".
- A row's control and the lines under it are 10 px apart (`.row .ct`, 8 px before), so a text button's 44 px box reaches the control's edge and not over it: at 8 px, UNDO under a wide menu covered its bottom 1 to 2 px.
- A CraftBeerPi name in the file preview's table (a key, a control's name) can break after an underscore (`brk()` puts `<wbr>` there), so a phone shows "Sensor_Stale_ / Seconds" rather than splitting a word.
- With reduced motion: no stripes, flash or glow.

### Colours

`hardware.css`'s `:root` has Settings' tokens, plus `--pv`, `--heat`, `--off`, `--liquor`, `--wort`, `--mark`, `--mark-ink`, `--stale`, `--answer-ink-2`, `--select-hover`, `--stripe`, `--seg-on`, `--seg-ring`, `--option-bg`, `--draw` and `--draw-fill`. Apart from the copied frame and drawing rules, the page uses only these, white for text on a coloured fill, and black for shadows. That is groundwork for the colour-scheme setting on the to-do list. `--stale` is left only for the large reading in an item's header, where 3:1 is enough.

### Found while designing

1. CraftBeerPi switches a kettle's AUTO off when its settings are saved and doesn't switch it back on (`BasicController.update` stops the item and restarts only what starts itself; a kettle doesn't). It also switches a switch off before replacing or deleting it (`ActorController._off_before_replacing`). Today's page doesn't say so; this one does, before SAVE.
2. Deleting a probe or switch leaves every kettle that used it with none. This page names them in the question.
3. Today's eye button is labelled "delete" (`aria-label`), the same as the bin beside it, so a screen reader says "delete" twice on every line. Today's kettle table's Sensor column shows the probe's reading, not its name.
4. The rig's records disagree over time: on 8 Oct the HLT ran Hysteresis; on 10 Oct, after a save from the web page, PIDBoil. The mockup follows 10 Oct. Gauge's records may be newer than either.

### Changed, all new, in the worktree

- `proposal\`: `hardware.html`, `hardware.css`, `hardware.js`, `hardware-data.js`, `hardware-catalog.js`, `HARDWARE-GROUPING.md`, `HARDWARE-TODAY.md` and this file. `rig.js` is the brew-day mockup's own, unchanged.
- `DESIGN.md`: a "Hardware Page" part under Components, a sentence by the Held Heat Rule on Hardware's one-tap switches, and The Empty Setting Rule.
- `.impeccable\decisions\direction-log.md`: "The Hardware page (16 Nov 2026)".
- `.impeccable\surfaces\cbpi4gui-src-components-hardware.md`: the page's brief.

### Checked

- Every moment at 1920×1080, 1920×950, 1440×900, 1366×768, 1280×800, 1180×820, 1024×768, 900×1200, 768×1024, 763×1141, 390×844 and 360×740: no script errors, nothing wider than the window.
- Every moment measured at those sizes and 1920×800, 1680×1050, 1600×900 and 1536×864: no word split across lines, except at a hyphen or underscore; no text under its WCAG contrast minimum; no control under 44 px; every switch's pin in view, in its box or on its second line; and no control's box over another's where the one on top is see-through, except FIND's clear button, which sits in the search box's right end on purpose. At 1920×1080 and 1366×768, with the pointer moved onto every line and button in turn: no text in it under its minimum. Before the fixes after your build, the same measure found words split from 1180 to 1680 px wide, the red readings at 4.35:1, SAVE's second line at 4.0:1, an open shared part's name at 4.1:1, readings from before a lost connection at 3.2:1, text buttons, FIND's matches and the Fermenters link at 20 to 32 px, and Dim Steel at 4.46:1 under the pointer.
- Today's page on 8012, read without pressing anything (every request not a read refused, and none was made): the four tables, each kettle, probe and switch form by its own link, and the new forms. That is `HARDWARE-TODAY.md`.
- 85 scripted presses in a real browser, all as designed. New this round: the list's pins, addresses, Sensor IDs, targets and missing links; an empty setting's line; SAVE's question with each answer; each control keeping its own settings, as your logic-switch test checks; FILL IN and LEAVE IT EMPTY in the preview, and LOAD with the value filled in; a name that's needed; the leave question on a phone. From before: change a value, row UNDO, SAVE, SAVE with nothing changed, one tap on a switch, ALL OFF, + ADD and drop, delete asks and KEEP IT and DELETE, the file's save, load, out-of-date preview with LOOK AGAIN, a file that isn't one, a new kettle filled in, FILE in the list (greyed with changes), FIND's order and jump, leaving with changes, tapping the drawing, a failed save then TRY AGAIN or SAVE, your deep-link conditions, the phone, the rig's four switches and the pin guard.
- Impeccable's checker: three notes on "side stripes", which are the lamp strip and the two marching stripes, kept on purpose as on Brew Day and Settings; and colours outside DESIGN.md, which are the copied frame's.

### Settled with the brewer (16 Nov)

1. Switches are one tap on this page.
2. Fermenters stay a plain link to today's page.
3. Between a phone and a monitor, the list is one column and scrolls, with the drawing docked below it, lighting what the list points at.
4. Probe addresses and names are shown whole.
5. A kettle can be saved to a file from its line in the list, as well as from its page.
6. The design stays as it is, the list and a page for each item, and each switch's GPIO pin shows on its line in the list (third look; he said yes to it after seeing the comparison).
7. Empty settings: shown as empty with what they use, and SAVE and LOAD offer to fill them in (his earlier request, through you; part of the mockup he said yes to).
