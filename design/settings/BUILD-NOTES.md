# Settings page: what it would take to build

For Brett, from the Settings design agent. The design is in `C:\src\personal\craftbeerpi4-ui-settings` (branch `impeccable-settings`, made from `brewday-graphs` at 72af3d1 and since moved forward to the release, `main` at 14a4108; nothing committed). The grouping, with every setting's group, plain name, key and control, is in `proposal\GROUPING.md`; this file says how the page looks and behaves, part by part.

## Settings page: approved by the brewer on 11 Nov, built by Brett on 12 Nov, released on 13 Nov

Built: web UI 331a1b3 (built in 00bebe4), on Brett's test copy at 8012; DEFECTS M78. Released in web UI 14a4108. His identity test, `test_ui_settings_identity.py`, matches this mockup in all 104 pictures: 13 moments at six sizes, a 30-character name, a blank name and no BrewScribe at each size, and seven presses.

The brewer's request: "I'd like the settings to be intelligently sorted and presented in groups by function. Right now, they are a confusing long list in no particular order - maybe alphabetical?" (It is alphabetical by key, capitals first, because the server writes `config.json` with `sort_keys`.)

His answers, in order:

- How he uses Settings (now and then, at the desk, usually to change one setting he knows by name): "Yes, that's about right".
- The look: "Brew-day look, with its title bar and tabs".
- Names: "Plain name first, key underneath (Recommended)".
- The grouping: "Looks right, build the mockups".
- The mockup: "Yes, it looks right".
- Saving: "Keep one SAVE (Recommended)", not saving each change the moment it's made.
- Where the groups and plain names live: "A: in the web page, for now (Recommended)". So **nothing changes in CraftBeerPi's server or plugins**; it's one web UI change.

### Where it is

- `proposal\settings.html`, `settings.css`, `settings.js`: the mockup. Open the HTML file straight from disk.
- `proposal\settings-data.js`: generated from the simulator's `GET /config/` on 8000 (54 settings), your two new ones as 8012 serves them, and the simulator's kettles, switches, probes and step types. Don't hand-edit it.
- `proposal\alarm.js`: a copy of your `components\brewday\alarm.js` (at c99dbc7, comments included), with its exports moved to `window.CBPI_ALARM`, because a page opened from disk can't load a module. In the build, import from `alarm.js` itself.
- The strip along the top steps through moments: `#top`, `#boil`, `#find-lid`, `#find-key`, `#find-none`, `#changes`, `#saving`, `#saved`, `#failed`, `#leave`, `#cloud`, `#plugin`, `#offline`. `?bare` hides the strip.
- Everything on the page comes from two tables at the top of `settings.js`. With option A they are the page's catalogue: port them as they are to `cbpi4gui\src\components\settings\catalog.js`, exporting `M` and `G` (your answer, 11 Nov).
  - `M`, one entry per setting: `n` plain name, `h` what it does, `syn` extra words for FIND, `ctl` control (when its type isn't enough), `order` and `lab` (option order and labels), `blank` (what a blank choice is called), `unit`, `restart` (`"on"`: only turning it on needs a restart; `"next"` and `"any"`: any change does), `dep` (its main switch and the value that makes it count), `adv`, `secret`, `cloud` and `hc` (InfluxDB Cloud's names and wording), `calc` (a worked-out line under it), `keep` (labels keep their case).
  - `G`, the groups in brewing order: `id`, `name`, `sum` (one line under the heading), `see` (a setting from another group shown here), and `parts`, each with an optional heading `h` and its `rows` in order. Nine, and a tenth, Phone alerts, where its plugin is installed: see "Phone alerts" at the end.

### The frame

Settings opens inside the brew-day frame, layout B: title bar, last-event line, tabs with SETTINGS lit. Same markup and styles as the brew-day screen; nothing new there. In the build, draw the brew-day frame itself. The mockup carries a copy only so that your comparison has the whole screen.

The mockup's copy now matches Amber's layout B as of 11 Nov, 22:55 (`craftbeerpi4-ui-impeccable\proposal\brew-day.css` and `brew-day.html`), rule for rule, in `brew-day.css`'s order. That includes the six differences you found, and the rest of what changed tonight:

- The brewery name (M74): one `<span class="bname">` at every width, with `.brand`, `.bname` and `[data-long]` (more than 24 characters is drawn at 0.7 size, except from 701 to 1023 px wide). Blank shows CraftBeerPi. The browser tab's title starts with it: "CraftBeerPi Brewery · Settings".
- BREWSCRIBE (M75), the last tab, after MORE, with its icon. On a phone the tabs are four and four; MORE spans two cells only without BrewScribe. Pressing BREWSCRIBE doesn't ask about unsaved changes, because BrewScribe opens in a browser tab of its own and this page stays as it is.
- The event line: padding 8 px 10 px 8 px 14 px, min-height 48 px. On a phone the padding is 3 px 3 px 3 px 12 px, and the min-height stays 48 px, because layout B's rule wins over the phone's 50 px, as on brew day. Its time has even-width digits.
- The clock: even-width digits (`font-variant-numeric: tabular-nums` inside `.clock`, after the `font` shorthand). ALL OFF and the clock keep their width (`flex: none`) only at 1180 px and up, as on brew day.
- From 701 to 1023 px wide, the alarm or question gets a row of its own under the name.
- On a phone: the banner is 50 px tall with 14 px left padding (layout B's rule wins over the phone rule, as on brew day), and the title bar's row gap is 8 px.
- Connection lost: ALL OFF is dimmed (`aria-disabled="true"`, `data-why="No connection. Controls are paused."`, opacity .5, `cursor: not-allowed`), and pressing it shows that reason. Under the pointer it stays as it is: only an ALL OFF that works lights red (`.alloff:not([aria-disabled=true]):hover`). The banner still says No alarms.
- `--tabs-h` is 64 px at the root, as in `brew-day.css`. Layout B's tabs are still 56 px, and the phone's 97 px.

Trying it: as on brew day, `?name=…` tries another brewery name and `?brewscribe=none` shows CraftBeerPi without BrewScribe. The strip's "Brewery name" links set `?name=` for you. In this mockup `?name=` is also the Brewery name setting, so its row says the same thing. The title bar shows the saved name, so it changes when you SAVE a new one, not while you type.

### On a monitor (1180 px wide and up)

- The app is one screen tall, `height: max(100dvh, 620px)`, and only the right side scrolls (`.pane`, `overscroll-behavior: contain`). Grid: left column `clamp(340px, 23vw, 440px)`, right `minmax(0, 1fr)`, gap 12 px, padding 12 px 20 px.
- **The left column** (`.idx`, where the recipe sits on the brew-day screen): SETTINGS (Barlow Condensed 700, `clamp(22px, 2vw, 31px)`, uppercase), a meta line, and the nine groups as an `ol` (`aria-label="Groups, in brewing order"`).
  - Meta line: "53 settings in 9 groups · all saved"; "3 changes not saved"; "Saving 3…"; "1 didn't save" (red) and "· 2 not saved"; "No connection" (red) · "1 not saved".
  - A group's row looks like a recipe step row: a 48 px dark band (`rgb(0 0 0 / .26)`) with its number (24 px 700), its name (20 px 600), a one-line summary (the first four settings' names joined by " · "; Plugins lists the plugins), and on the right its count, or a badge: `N CHANGED` (`--select` fill) or `N DIDN'T SAVE` (`--fault-bg`, 1 px `--alarm` edge). Rows are at least 58 px tall, 6 px apart.
  - The group in view has `aria-current="true"`: `--active` fill, `--active-edge` border, `--active-ink` text.
  - 1000 px tall or less: rows 52 px, summary 14 px. 820 px tall or less: the summaries go and rows are 44 px, so all nine fit at 1366×768 (at 768 px, group 9 was hidden).
- **Above the right side** (`.tool`): FIND A SETTING, a sunken field 56 px tall and at most 520 px wide, its label inside on the left (15 px condensed, .1em, uppercase, `--text-3`), × to clear. UNDO and SAVE at the far right.
- **The right side**: one plate per group (`--panel`, 1 px `--line`, 6 px corners, 12 px apart), in brewing order. Plates fill the width; each row keeps its own two widths (below), so a name and its control stay close however wide the screen is. 40vh of space after the last plate lets it scroll to the top.

### A plate

- Heading: the group's number (`--text-3`) and name (27 px 700, uppercase, .06em), then its one-line summary (17 px condensed, `--text-2`) on the same line.
- A see-also line in Mash and sparge (MASH_TUN) and Boil (BoilKettle): "Boil kettle: **Boil Kettle**, chosen in Brewhouse." and a 44 px CHANGE IT IN BREWHOUSE button, which jumps to that row.
- Parts with a heading (15 px condensed 600, .1em, uppercase, `--text-3`): WHILE YOU BREW, IN IMPORTED RECIPES, LOG FILES, INFLUXDB, MQTT, and in Plugins each plugin's name with a note beside it in normal case ("on the simulator only"; "named by their keys" for a plugin the page doesn't know). A part with a heading is `role="group"`, labelled by it.

### A row

- Two columns: the name side up to `--row-l` 560 px, the control up to `--row-c` 420 px (at least 280), 32 px apart; 14 px 10 px padding; 1 px `--line` between rows.
- Left: the plain name (20 px condensed 600; a `label` for a field, or the `p` that names a radio group), what it does (15 px Barlow 500, `--text-2`, at most 62 characters wide), then the key (14 px condensed, .06em, `--text-3`), with tags beside it in a 1 px `--edge` box: ADVANCED (ACTOR_INTERLOCK_GROUPS, RECIPE_CREATION_PATH), ON AFTER A RESTART (CSVLOGFILES, INFLUXDB), AFTER A RESTART (SENSOR_LOG_MAX_BYTES, SENSOR_LOG_BACKUP_COUNT, MQTTUpdate, BREWSTART_LANGUAGE).
- Right: the control, and under it the status line, which keeps its 24 px even when empty, so a row doesn't jump when "Changed" appears.
- A detail under a main switch (ACTOR_INTERLOCK_GROUPS; the two log sizes; the six InfluxDB details) is set 22 px in, with a 1 px `--edge` rule on its left and a 19 px name. Its name column gives up 30 px, so every control on the page stays in one straight column. Between two such rows the 1 px line stays. While its main switch is off, the row is greyed and says "Used when Send readings to InfluxDB is Yes."; it can still be changed.

### Controls

- **Yes/no, and two to four choices**: a segmented control (`role="radiogroup"`, each button `role="radio"`), 48 px tall, each part at least 96 px wide. The chosen part is Face Black with a 2 px `#a9bfd4` ring, as the brew-day's pressed buttons. Arrow keys move and choose; Tab lands on the chosen part. YES / NO, °F / °C, kPa / PSI, ONE AT A TIME / OFF, English / Deutsch (units and languages keep their case). These are not switches: nothing happens until SAVE, and NN/g's rule is that a switch acts at once.
- **Longer lists**: a sunken select with a chevron, 19 px condensed 600: kettles, switches (actors), probes (sensors), step types, Brewfather recipes shown, MQTT resend interval (Every 30 s, Every 60 s, Every 2 min, Every 5 min, Never), Free-form dashboards. A blank choice says what blank means: "None chosen" (Mash tun, Boil kettle), "Standard: MashInStep" (and MashStep, SpargeStep, BoilStep, WaitStep for the other step types), "The kettle's own probe", "None".
- **Numbers**: a sunken box, 22 px tabular figures, with the unit after it: °F, bytes, per probe, MB, × real time. Anything that isn't a number turns the row red, "Type a number, like 500000.", and SAVE says "fix the entry first".
- **Text**: a sunken text box that grows with its text; one line normally.
- **Secrets** (Brewfather API key, InfluxDB password or token): dots, with SHOW / HIDE beside it. When blank it says "Not set". This hides it on screen only: `GET /config/` still sends it.
- **Timer alarm sound**: the four sounds as a 2×2 choice: Kitchen timer, Alarm, High beep, Soft ping (values `kitchen`, `alarm`, `high`, `soft`; labels from the server, order from `M`). TRY ("plays it here") sits beside it, or under it on a phone. TRY plays the chosen sound's whole burst on this device, as a timer that has run out does: `play(ctx, ctx.destination, ctx.currentTime + 0.02, soundOf(value))` from `components\brewday\alarm.js`. It plays whatever the brew-day screen's SOUND switch says, since pressing TRY is asking to hear it. Since 12 Nov (your M79) switching SOUND on at the brew-day screen makes no sound, so TRY is the one way to hear the chosen sound on purpose. For the length of the burst (`burstSeconds`), its small line says "playing", so a muted device still shows that it worked.
- **Worked-out lines** under the log sizes: "That is 500 KB." and "Each probe keeps up to 3 MB, about 26 hours of readings." (about 32 bytes a reading and one reading a second, from SensorLogTarget_CSV's own sizing note; days from 48 hours up).
- Sunken fields use the brew-day's sunken-face shadow, kept as `--sunk`.

### Changing and saving: one SAVE

- A change marks its row: a blue tint (`rgb(42 111 192 / .12)`) and a 2 px inset ring in `--select`, and on the status line "CHANGED · was °F" with UNDO. That UNDO is a text button (`.lnk`): a box at least 44 px tall and 44 px wide whose `margin-block: -10px` gives back the 20 px it adds, so the 24 px status line keeps its height. The control sits 10 px above the status line, so the box stops at the control's edge. Changing it back clears it. The group's row says `1 CHANGED`, UNDO says "put back the change" or "put back all 3", and SAVE turns blue, both its lines white: "SAVE · 3 changes".
- SAVE sends every change at once with `configapi.update(name, value, ok, failed)` (`PUT /config/{name}/`) and waits for every answer. It does not reload the page: the `configupdate` topic already keeps `config` current (`components\data\index.js` line 56).
- While it waits, each row has the brew-day's waiting signal, a 6 px marching stripe along its top edge, and SAVE reads "Saving… · waiting for CraftBeerPi" with the same stripe. UNDO is greyed.
- Each answer marks its row: "✓ SAVED 14:32" in `--run`, or in red "DIDN'T SAVE · CraftBeerPi didn't answer, so it may not have it" with a white TRY AGAIN ("send it again"), the row tinted `--fault-bg` with a 2 px `--alarm` ring. A setting that needs a restart adds, in amber, "· on after a restart" or "· used after a restart".
- The last-event line then says "Settings: Temperature unit saved · confirmed", "Settings: 3 changes saved · confirmed", or "Settings: Heating element interlock didn't save; 2 saved · failed". It's the brew-day screen's own list in localStorage, `cbpi.brewday.events` (newest first, at most 50, dropped after 12 hours): `["14:32:05", "Settings: Temperature unit saved", "confirmed", "ok", "", Date.now()]`, or `"failed"` with tone `"bad"`. A brew-day screen open in another tab sees it once it listens for changes, which you're adding.
- UNDO at the top puts back every change not yet saved; each row's UNDO puts back its own.
- If another screen saves a setting that has an unsaved change here, the change stays and its "was" updates to the new saved value. If the other screen saved the same value as the change here, the change clears, since there's nothing left to save (your addition, 11 Nov). Not shown in the mockup.

### Notes at the top of the right side

One at a time, in this order, never a pop-up:

1. **Leaving with changes** (amber): "**Leave Settings with 2 changes not saved?** Heating element interlock, Timer names to pick." SAVE AND GO (white, "then Brew day"), GO WITHOUT SAVING ("drops them"), STAY ("keep changing"). It appears when a tab is pressed with changes not saved, and focus goes to SAVE AND GO. Closing or reloading the browser tab can only get the browser's own "Leave site?" question (`beforeunload`). A tab pressed while SAVE waits for CraftBeerPi asks nothing: "Saving: Brew day opens once CraftBeerPi has your changes." (the toast), and the page goes once every change is saved. If one didn't save it stays, its Didn't save note saying so; if a change made meanwhile waits, this note asks. Going at once would drop a change CraftBeerPi then refuses, or one made after SAVE, without a word.
2. **No connection** (red): "**No connection to CraftBeerPi.** These are the settings as they were at 14:31. Your changes stay on this page until it is back; then SAVE sends them." SAVE is greyed, "no connection".
3. **Didn't save** (red): "**Heating element interlock didn't save.** CraftBeerPi didn't answer, so it may not have it. It's still on this page; nothing else is affected." TRY AGAIN (white) and SHOW IT ("in Brewhouse"), which jumps to the row.
4. **Restart** (amber): "**MQTT resend interval is saved; CraftBeerPi uses it after a restart.** Everything else is in use now. Restart from System, under More, when nothing is brewing." OPEN SYSTEM ("to restart"). The server's restart is `POST /system/restart`.

### FIND A SETTING

- Every word typed must appear in the setting's name, its key (also with `_` read as spaces), what it does, its group's name, its plugin's name, or its extra words (`syn`). Matches are marked (`#5a4300` behind `#fff3d6`).
- Rows that don't match, see-also lines, empty parts and empty plates hide. The left column says "N found" for each group, greys a group with "none" (its number, name and summary in Dim Steel, `--text-3`), and lights the first group with results (none if nothing is found).
- × or Escape clears it. A live region says "9 settings found" or "Nothing found".
- Nothing found: "NOTHING HERE MATCHES “HYSTERESIS”" and "Try a word from a setting's name, its key or what it does." If the words belong to one kettle's, switch's or probe's own settings (the `ELSEWHERE` pattern in `settings.js`: pid, hysteresis, kp, ki, kd, gain, logic, boil power, threshold, offset, calibrate, gpio, pin), it adds "Settings for one kettle, switch or probe, such as a PID's or the boil power, are kept with it in Hardware." and OPEN HARDWARE.

### Moving about

- A group's row in the left column scrolls the right side to it (smoothly; at once with reduced motion), and its heading glows once (1.2 s).
- CHANGE IT IN BREWHOUSE and SHOW IT scroll to the row, centre it, flash it (1.6 s, blue fading out) and put focus on its control.
- Scrolling the right side lights the group in view; at the very bottom, the last one.

### 701 to 1179 px wide

One column, and the page scrolls. FIND, UNDO and SAVE stick to the top. The nine groups sit above the plates, three across. In a row, the name side takes what's left and the control is 260 to 360 px.

### A phone (700 px wide or less)

- The title bar and the two rows of tabs at the bottom (4 + 4 with BREWSCRIBE; without it 4 + 3, MORE across two cells), as on the brew-day phone layout.
- The list page: FIND, then SETTINGS and the nine groups as a list, each with "›". No group is lit until one has been opened; after that, the last one opened is.
- A tap opens that group on its own: ‹ ALL GROUPS (44 px) at the top, then its plate. FIND and the list are not shown. ‹ ALL GROUPS goes back to the list with that group in view and focused.
- Rows stack: name, what it does, key, then the control full width and its status line. Choices stretch to fill the width.
- While anything waits to be saved, a bar sits on top of the tabs (`--bar`, a 2 px `--select` top edge): "3 changes not saved", UNDO, SAVE. UNDO and SAVE leave the top row.
- Notes appear at the top of whichever page is showing; on the list page, above the groups.
- Searching on the list page shows the matches in place of the list.

### Settings the page doesn't know

With option A, the catalogue only knows the settings it lists. Any other one still shows:

- A plugin's (its `source` is the plugin's name): in Plugins, under the plugin's name (cbpi4_BrewStart is "BrewStart", simvessel is "SimVessel" with "on the simulator only"; any other by its source, with "named by their keys"), by its key, with CraftBeerPi's own description.
- Any other `craftbeerpi` or `steps` setting: at the end of System and dashboards, under "Not sorted yet" ("new to this page, by their keys").
- `hidden`: not shown, as today.
- Its control comes from its type: kettle, actor, sensor, step or fermenter: a select; number: a number box; select: segments if 4 options or fewer, otherwise a select; anything else: a text box.

The `#plugin` moment shows three made-up settings from a plugin the page doesn't know.

### Accessibility

- Each control is named by its plain name (`label for`, or `aria-labelledby` on a radio group) and described by what it does and its status line (`aria-describedby="w-KEY s-KEY"`).
- Plates are `section`s labelled by their heading; the left column marks the group in view with `aria-current`.
- Every button and field is at least 44 px tall at every size, a row's UNDO included (measured).
- Text is at least 4.5:1 against what's behind it (large text 3:1) in every moment at every size (measured). SAVE's second line is white on Selection Blue: 5.1:1, and 4.55:1 under the pointer. A group with nothing found during FIND has its summary in Dim Steel: 5.1:1.
- Under the pointer, Dim Steel text in a line or button turns Soft Steel (`--text-2`): 7.0:1 on Hover Slate, where Dim Steel is 4.46:1. That is a group's count, a group with nothing found during FIND, and an ordinary button's second line (TRY, UNDO, SHOW, and the buttons in the notes). The open group keeps its active ink, SAVE keeps its white and the answer buttons keep their own colours. A greyed control looks the same under the pointer, SAVE and the title bar's ALL OFF included. The rule is the Hardware page's.
- With reduced motion: no stripes, flash, glow or smooth scrolling.

### Tokens

The brew-day's tokens, plus these, all in `settings.css`'s `:root`: `--hover #253545`, `--prompt-ink #fff1d2`, `--note #ffd9a0`, `--fault-bg #2b1315`, `--alarm-ink #ffc9c4`, `--active-edge #3c7fcc`, `--active-ink #dce9f7`, `--focus #8cc2ff`, `--answer #f4f6f8`, `--answer-ink #10161c`, `--sunk` (the brew-day's sunken-face shadow), `--row-l 560px`, `--row-c 420px`. Every other colour, size and corner comes from `brew-day.css`.

### The server: nothing

Option A needs no server or plugin change. Your two new settings are in the catalogue and match what 8012 serves: AddMashOutStep (Yes/No, default Yes; in Mash and sparge, after the mash step type) and BREWDAY_ALARM_SOUND (`kitchen`, `alarm`, `high`, `soft`, shown as Kitchen timer, Alarm, High beep, Soft ping; default `kitchen`; in Timers and alerts).

### Found while designing

1. **Today's SAVE doesn't wait.** `save()` in `components\settings\index.js` (lines 165–175) calls `configapi.update` for each change and `navigate(0)` straight away, so the page reloads without CraftBeerPi's answer and can't show a failure.
2. **The brew-day title bar ignored Brewery name.** It printed "CraftBeerPi Brewery" from `screen.js` line 89; only the older main menu read BREWERY_NAME (`MainMenu\index.js` line 168). Fixed since by Amber's M74: the title bar shows Brewery name at every width, and the mockup's frame now does too. So the page's "your brewery's name, at the top of the screen" is true.
3. **Two beeps for one alert.** Confirmed by you (12 Nov): with PLAY_BUZZER on Yes, AlertProvider's `show()` plays the buzzer for every new notification, on any page, and the brew-day frame's `ring(2)` plays for the same notification when SOUND is on. Settled since: the buzzer stays quiet while Brew Day or Settings is open, where the frame's own beeps play (Brew Day's DESIGN.md, The One Pulse Rule), and plays for each new notification on every other page. The help line under Buzzer for notifications says so.
4. **A blank Boil kettle** refuses recipe imports on a rig with more than one kettle (`upload_controller.py` `_import_problem`). The page names a blank choice "None chosen" and says so in the row. It stays that way, with no code change (12 Nov).
5. Impeccable's design checker flags `.cmd.busy::before` and `.row.wait::before` in `settings.css` as "side stripes". They're the 6 px marching stripe along the top edge, the brew-day's waiting signal, kept on purpose.

Your answer (11 Nov): you fix 1 in the build, check 3 then, and take 2 to Amber, whose title bar it is.

### Changed, all new, in the worktree

- `proposal\`: `settings.html`, `settings.css`, `settings.js`, `settings-data.js`, `alarm.js` (a copy of yours), `GROUPING.md`, and this file.
- At the top: `PRODUCT.md`, and `DESIGN.md` with `.impeccable\design.json` copied unchanged from the brew-day worktree; `.impeccable\surfaces\cbpi4gui-src-components-settings.md`; `.impeccable\decisions\direction-log.md` (sources read, choices and checks).

### Checked

- 1920×950, 1920×1080, 1366×768, 1024×768 and a 390×844 touch phone: every moment, no script errors, nothing wider than the screen, nothing to press under 44 px.
- Clicked through: °F to °C and SAVE gives "Settings: Temperature unit saved · confirmed" and "✓ SAVED"; FIND "boil power" gives the Hardware note; FIND "mash" finds 9 and lights Brewhouse; on the phone, Boil opens on its own and ‹ ALL GROUPS comes back with Boil lit.
- Impeccable's checker: the two stripes above, and notes on colours outside DESIGN.md, which are all `brew-day.css` values or the tokens listed above.
- TRY: each sound plays its whole burst (4, 5, 3 and 3 pulses, counted in the page), and its line says "playing" until the burst ends. FIND "ping" finds Timer alarm sound.
- The frame against Amber's `brew-day.html?bare#mash` (11 Nov, evening): 13 window sizes (your five, the phone at 3×, and 768×1024, 1000×800, 1180×820, 1179×820, 1023×768, 701×900, 700×900), each with the default name, four `?name=` names, a blank name and `?brewscribe=none`. Every part of the title bar, event line and tabs has the same position and size (exact, not rounded), the same computed styles, words and attributes, and the same pixels, apart from the event's words and the two lit tabs. `#offline` the same, with ALL OFF dimmed in place. The only pixels that ever differed were single edge pixels a few shades apart, which came and went between runs of the same two pages; I counted differences of 24 levels or less as that noise.
- After the sync: the 13 moments at seven sizes have no script errors and nothing wider than the window. All nine groups still fit on the left at 1366×768, with the frame 8 px taller. BREWSCRIBE with changes doesn't ask; HARDWARE still does. ALL OFF offline answers "No connection. Controls are paused." A saved Brewery name shows in the title bar, and in the browser tab's title.
- After the 16 Nov fixes: the 13 moments at seven sizes, and on a phone every group opened on its own, each scrolled so every row was in view. Nothing to press is under 44 px, no text is under its contrast minimum, and there are no script errors. Rows, status lines and page heights are the same as before to the hundredth of a pixel in all 100 views. The only pixels that changed are SAVE's second line, the UNDO text (4 px further right, inside its wider box) and, during FIND, the summaries of groups with nothing found.
- After the pointer and spacing changes: the pointer moved onto every button, link and group line in the 13 moments at seven sizes, 6,786 times. No text under the pointer is under its contrast minimum (before, 78 cases, the worst a greyed SAVE's words at 1.6:1). No greyed control changes under the pointer, the title bar's ALL OFF included, and the open group keeps its colours. Each of the 42 UNDO boxes, scrolled to the middle, ends exactly at the control above it; before, each reached 1 to 2 px into it. A row is 2 px taller where its control side is the taller side, 4 px with a worked-out line; nothing moved sideways, and SAVE's pictures are unchanged. Nothing to press is under 44 px, there are no script errors, the clicked-through checks, the long Brewery name box and the sound help still pass, and the frame still matches `brew-day.html?bare#mash`. `port.mjs` makes the same `catalog.js` and `settings-frame.css` as the product has now. The ALL OFF and placeholder rules move nothing: rows, status lines, page heights and pictures are the same in all 100 views. ALL OFF looks as it does on `brew-day.html`, with and without the pointer, offline and connected, at seven sizes. A number box given a placeholder shows it as the Hardware page's box does, at 7.2:1.

### Settled with you (11–16 Nov)

1. Settings saves go in the last-event line: see "Changing and saving".
2. The catalogue: `cbpi4gui\src\components\settings\catalog.js`, exporting `M` and `G`.
3. Another screen's save: as under "Changing and saving", with your same-value rule.
4. Your correction: the third sound is High beep (`high`), not Long beep. The mockup, its data and these notes now say so, and TRY plays your sounds.
5. Your correction (12 Nov): text boxes that aren't drawn are measured once they show. Before, `grow()` measured every box, including those in a phone's closed group or a row FIND hides; those got height "2px", so once shown they were one line tall and a long value lost its end. Now `grow()` skips a box with no client rects, `applyView()` and the end of `paintFind()` call it, and `render()` and the resize handler no longer call it themselves. The mockup's lines are now the same as `page.js` at 331a1b3. With a 63-character `?name=`, the Brewery name box was cut off (46 px for 66 px of words) three ways: a phone opening Brewhouse from the list; the same after going back and resizing; and a monitor after FIND "unit", a resize, and clearing FIND. All three are whole now, and the 13 moments at seven sizes are still clean.
6. Your note (12 Nov): the Timer alarm sound's help (`M.BREWDAY_ALARM_SOUND.h`) now covers the alerts too: "What the brew-day screen plays when a timer runs out, every 3 seconds until you answer it. For a new hop alert, question or error, the screen plays just the first two beeps, once." That is 3 lines on a monitor and 4 on a phone, shown whole, and FIND finds the row by "hop alert", "question" and "two beeps". `alarm.js` is now a copy of yours at ab17060; only its opening comment changed, and the sounds are the same. The core rewrites a description only when its version changes, so the new one arrived with post37 (13 Nov): `settings-data.js` now has it, ending "Switching SOUND on at the screen makes no sound." It only shows for a setting `M` doesn't know.
7. Your note (13 Nov): no file names the brewer, and code comments say what the code does and why, in the present tense: no dates, request quotes, attributions or change tags. The mockup's files follow it, and `alarm.js` is again a copy of yours (at c99dbc7) apart from its exports.
8. Your note (13 Nov): the repository's commit messages were rewritten, so every commit ID changed. The IDs in these notes are the new ones; `C:\src\personal\cbpi-testbench\COMMIT-ID-MAP.md` lists old and new.
9. Your note (16 Nov, through Amber): SAVE's second line was 4.0:1 on Selection Blue (3.6:1 under the pointer), and a row's UNDO was a 24 px box that only an invisible `::before` made larger. As on the Hardware page, SAVE's second line is now white (`.cmd.go small`), and UNDO is a 44 px box (`.lnk`, with no `::before`). Measuring every moment found one more of the same kind: during FIND, a group with nothing found had its summary at 3.6:1 (`#6f8194`). It is now Dim Steel (`.gi.none .d`, 5.1:1), as the Hardware page's list has it.
10. Amber's decision (16 Nov), for both pages: under the pointer, Dim Steel text in a line or button turns Soft Steel, as under Accessibility. The Hardware rule's `.cmd.go.idle` part is left out: Settings greys SAVE when nothing has changed, so it has no idle SAVE for it to match. Moving the pointer onto everything found one more: a greyed SAVE (nothing changed, or no connection) turned Selection Blue under the pointer, its grey words at 1.6:1, because `.cmd.go:hover` outweighs `.cmd[aria-disabled=true]`. It now stays grey (`.cmd.go:not([aria-disabled=true]):hover`). And, as on the Hardware page, a control sits 10 px above its status line (`.row .ct`), so a row's UNDO stops at the control's edge instead of reaching 2 px into it.
11. Amber's decision (16 Nov), for every page: nothing changes under the pointer on a greyed control. The title bar's ALL OFF, greyed while the connection is lost, lit red under the pointer; it now stays as it is (`.alloff:not([aria-disabled=true]):hover`), as on the brew-day screen. That is a frame rule, so `port.mjs` leaves it out: the built page takes it from `components\brewday\brewday.css` (line 32 at 32154c8), with the brew-day screen's own change. And a number box's placeholder, where one is given, is Dim Steel at full strength (`.numf input::placeholder`, 7.2:1 on the box, where the browser's own grey is 4.4:1), as on the Hardware page. No box on this page has a placeholder, so nothing on screen changes; the rule keeps the box the same on both pages.

## Phone alerts: designed 18 Nov, approved by the brewer and built by Brett on 20 Nov

For cbpi4-PushOver 0.0.10.post2 (a8dfe9d, branch `phone-alerts`) with core 4.7.7.post47, as 8000 and 8012 run them. The brewer wasn't available for questions on 18 Nov, so seven choices were mine; `GROUPING.md` lists them under "Phone alerts: the choices you approved (20 Nov)".

His answer on 20 Nov, when you showed him the mockup at `#phone-on` and asked whether he approved the seven choices:

- He picked "Yes, but I want to change something". Asked what, he wrote: "Alerts look good - eager to test ntfy". So the design stands as it is.
- The first real ntfy alert to his phone: "Let's do this later".

Built: web UI 0.5.1.a3.post27 (da7a754, `main.e3c82b45.js`), the tip of `main` and `brewday-graphs`; installed, not pushed. The design files went in byte for byte (0cdc6a3), and `page.js` makes MAKE ONE's topic in the page (10d7306). Your tests on it: `test_ui_phone_alerts.py` 102/102, Settings identity 152/152, brew-day identity 433/433, `test_e2e_settings.py` 79/79 and `test_plugin_versions.py` 30/30. On 8012, two presses of MAKE ONE gave two topics of the right form, with no request sent; both were undone, so `ntfy_topic` is still blank.

The first build, post26 (edefff4, `main.7d1b4192.js`), passed your identity test 152/152 and your live test 93/93, including the original plugin from PyPI showing nine groups with its two keys under Plugins. It raised two questions, settled at the end of this section. Against the phone alerts test as it is now, post26 passes 98 of 102. The 4 it fails are new checks for MAKE ONE: two that no topic is asked of CraftBeerPi, and two that MAKE ONE still makes one with the connection lost, the topic then waiting for SAVE once CraftBeerPi is back. Its checks of the topic's form pass, since the plugin's topics have the same form.

What sets the wording, from the brewer through you:

- "I don't like paying for things that are otherwise available for free. Let's build out ntfy." So ntfy comes first and is the default; Pushover is the alternative.
- "I don't really plan on leaving the brewery on a brew day...." So the group is a second signal, a buzz for when he's across the room or the boil is loud, and it says the screens stay the alarm. It doesn't offer brewing from elsewhere.
- No ntfy server of his own: `ntfy_server` stays at https://ntfy.sh, under Optional.

### Where it is

- Group 7 of 10, Phone alerts, between Timers and alerts and Logs and data. It shows only where `phone_alerts_service` exists (`needs` in `G`), so a CraftBeerPi without the plugin keeps its nine groups, numbered as now.
- Where `phone_alerts_service` doesn't exist, any of the group's settings that do exist show as settings the page doesn't know: by key, with CraftBeerPi's own description, under their plugin's name, as on the page today. The original cbpi4-PushOver (0.0.10, on PyPI) has two of them under the same names, `pushover_user` and `pushover_token`, and no `phone_alerts_service`. Until 20 Nov the mockup claimed both for the hidden group, so they showed nowhere. Now `away(k)` is true for a setting that only a hidden group lists: `meta()` ignores `M` for it, `partsOf()` lists it under its plugin (`known()` in place of `KNOWN`), and `rowHTML()` gives it no step band.
- The strip's second line steps through eight moments: `#phone` (not set up), `#phone-made` (MAKE ONE pressed: a topic shown and spelled out, not saved), `#phone-on` (saved and on), `#phone-sent` (a test alert sent), `#phone-refused` (ntfy.sh refused the topic), `#phone-unreachable` (a timer test that couldn't reach ntfy.sh), `#pushover` (Pushover chosen, a timer test sent) and `#pushover-nophone` (Pushover took it, but no phone is logged in).
- `settings-data.js` now has the 12 settings and `cbpi4-PushOver_update` as 8012 serves them (69 settings), with the secrets blank.

### The plate, top to bottom

1. **The header**: the group's name and summary, and a lamp with words for whether alerts are on, by what CraftBeerPi has saved (`phoneState()`): "On · through ntfy.sh" (the saved server's host), "On · through Pushover", "Off · no topic yet", "Off · needs the user key and the API token" (or only the one missing), "Off · the topic can't be used", "Off · the server address can't be used". The same words are the group's line in the list on the left, in place of its first four names. These follow the plugin's own rules, so the lamp is lit exactly when the plugin would send.
2. **Send them through** (`phone_alerts_service`): ntfy and Pushover as two segments, with a line under them about the chosen one (`means`): what it costs, and what it can do on an iPhone.
3. **Turning it on**: the chosen service's steps, numbered. ntfy: 1 Get the ntfy app, 2 Topic, 3 Subscribe to the topic, 4 Send a test. Pushover: 1 A Pushover account and app, 2 User key, 3 API token, 4 Critical Alerts, for timers, 5 Send a test. The steps that aren't settings are rows of their own, from the group's `how`, with links that open in a new tab (`go`), or the test.
4. **Optional** ("most brewers leave these"), ntfy only: Tapping an alert opens (`ntfy_link`), Access token (`ntfy_token`) and ntfy server (`ntfy_server`), the last two marked Advanced.
5. **What reaches your phone**: the five switches. Until phone alerts are set up on the page, they're greyed and the part's heading says "used once phone alerts are set up"; then "each one beeps on the brew-day screen too". Run-out timers has a help line for each service (`hs`). The part ends with what is never sent: "Not sent: the alarms the brew-day screen raises by itself, such as No connection, a command that didn't go through, or ALL OFF not finishing."

### Rows and controls

- The other service's rows are hidden (`.row.other`), with their values kept. FIND still finds them, greyed, with "Used when phone alerts go through Pushover." A part with none of the chosen service's rows is hidden too. Choosing the other service redraws the plate at once: steps renumbered, help lines and notes changed.
- A step's number sits on a dark band at the left of its row (`.row.step`, `.row .sn`), like the numbers in the group list. Screen readers hear "Step 2".
- The four secrets (topic, access token, user key, API token) are masked, with SHOW and HIDE, as InfluxDB's password is. A blank one says what that means on its status line (`unset`): "No topic: phone alerts are off", "None: ntfy.sh needs none".
- The topic has MAKE ONE ("a random one", or "a new one, in its place") and COPY ("to paste in the app"). MAKE ONE puts a new topic in the box, shown, as a change that SAVE saves. While the topic is shown, it is also spelled out in fours under the box ("To type it": `cbpi-` `k7mq` `3xa9` …), for typing it into the phone. Screen readers skip that line, since the box has the same.
- Tapping an alert opens has THIS CRAFTBEERPI, which fills in the address the page came from (`location.origin + "/"`).
- Links out (the App Store, pushover.net) are buttons with a small arrow-out mark, and "(opens in a new tab)" for screen readers.

### What SAVE checks

Blocking, on a changed value (`invalid()`: the row turns red and SAVE waits):

- a topic that isn't 1 to 64 letters, digits, - and _: "A topic can hold only letters, digits, - and _." or "A topic can be 64 characters at most."
- a link or a server that doesn't start http:// or https://: "A web address starts with http:// or https://."

These are the plugin's own rules (`TOPIC` and `LINK` in its `__init__.py`), so nothing saved here is refused by it.

Notes that don't block (`warnOf()`, on the row's grey line):

- a topic under 16 characters: "Short topics are easy to guess: MAKE ONE gives a long, random one."
- a Pushover key that isn't 30 letters and digits: how many it has, or that it has other characters.
- a link to the computer the page is open on (localhost, 127.x, [::1]): the phone can't open it.
- a server other than https://ntfy.sh: an iPhone gets its alerts late, or not at all, unless that server passes them on to ntfy.sh.
- a topic, server or link already saved (some other way) that the plugin can't use: what is wrong with it.

### The test

- Two buttons in the Send a test step: TEST ALERT ("like a hop alert") and TEST TIMER ("like a run-out timer"). They ask `POST /phone-alerts/test?kind=alert` and `?kind=timer`.
- The test goes through what CraftBeerPi has saved, so the buttons are greyed, with the reason as their second line (`testOff()`), when:
  - there is no connection ("no connection");
  - the page's values would set alerts up but aren't saved, or a phone alerts setting other than the five switches has a change not saved ("save first");
  - it isn't set up ("set up first").

  Pressing a greyed one says the whole reason, such as "Fill in the topic and SAVE first: the test uses what CraftBeerPi has saved."
- While it waits: the pressed button shows the marching stripe and "Sending…" over "up to 10 s", both are greyed, and the step's status line says "Sending through ntfy.sh…". The buttons change in place (`paintTest()`), so the pressed one keeps its focus.
- The answer goes on the step's status line, with what to do under it, and the service's own words (`detail`) under that in small type. It also goes in the last-event line, "Phone alerts: test alert sent through ntfy" (confirmed) or "Phone alerts: test timer alert didn't go, couldn't reach ntfy.sh" (failed), and screen readers hear "The test is sent" or "The test didn't go".

The answers (`testWords()`), as the status line, then what it says under it:

- **200, an alert, ntfy**: "✓ Sent 14:32 · through ntfy.sh". "Not on your phone within a minute? The topic in the ntfy app must be exactly the one above, and the app's notifications must be allowed: on the iPhone, Settings, Notifications, ntfy. If it still doesn't come, remove the topic in the app and add it again."
- **200, a timer, ntfy**: "✓ Sent 14:32 · as a run-out timer's alert". "A real one comes again every 2 minutes, 10 more times at most, until you answer the timer on a screen. On an iPhone it makes a sound only with the ringer on and no Focus."
- **200, an alert, Pushover**: "✓ Sent 14:32 · through Pushover". "Not on your phone within a minute? The Pushover app must be logged in to the same account, with its notifications allowed."
- **200, a timer, Pushover**: "✓ Sent 14:32 · as a run-out timer's alert". "Pushover repeats it once, in about a minute, then it stops. With the phone on silent, it sounds only with Critical Alerts on for emergency priority (step 4)."
- **502 refused, field topic**: "Didn't send · ntfy.sh refused the topic". "Someone else may have reserved it there. MAKE ONE for a new topic, subscribe to it in the ntfy app, SAVE, and test again."
- **502 refused, field token, ntfy**: "Didn't send · ntfy.sh refused the access token". "Check the token, or leave it blank: ntfy.sh needs none."
- **502 refused, field user**: "Didn't send · Pushover doesn't know the user key". "Copy it again from your dashboard at pushover.net: 30 letters and digits."
- **502 refused, field token, Pushover**: "Didn't send · Pushover doesn't know the API token". "Copy it again from CraftBeerPi's application at pushover.net/apps."
- **502 refused, no field**: "Didn't send · ntfy.sh refused it" (or Pushover). "What it said is below."
- **502 no_devices**: "Didn't arrive · no phone is logged in to this Pushover account". "Log in to the Pushover app on your iPhone with the same account, then test again."
- **429 limit, ntfy**: "Not sent · ntfy.sh's limit for this network". "ntfy.sh takes 250 alerts a day from one internet address, and only a few a minute. Try again in a few minutes. If this comes back, today's 250 are used up, and alerts are lost until they free up."
- **429 limit, Pushover**: "Not sent · Pushover's monthly limit". "Pushover takes 10,000 alerts a month for each account, and refuses more until the 1st."
- **504 unreachable**: "Didn't send · couldn't reach ntfy.sh" (or Pushover). "Check the Pi's internet. Without it, phone alerts are lost; the screens still alarm."
- **409 not_set_up**: "Didn't send · not set up", and what `testOff()` would say.
- **No answer from CraftBeerPi** (the request failed, or none came): "Didn't send · no answer from CraftBeerPi". "The test may or may not have gone. Check the connection, then try again." The plugin gives up on the service after 10 s, so wait a little longer than that, say 15 s, before saying so.

A 400 can't come from these two buttons; it would read "Didn't send · it didn't go". A refusal that names a setting also marks that row red: "Refused in the test at 14:32 · see Send a test". That goes when the row is changed. The last answer and the red row go once a setting the test goes by (`TESTED`: the service, the topic, the access token, the server and the two Pushover keys) gets a new saved value, from this page's SAVE or another screen's, since they're about the old one. A save that leaves the value as it was (`same()`) changes nothing. Nothing goes while a test is waiting: its answer, when it comes, is about the test that went.

### What it needs from CraftBeerPi

Nothing new. The test asks plugin 0.0.10.post2's `POST /phone-alerts/test?kind=alert|timer`, which answers `{sent, reason, field, detail, service, kind}`, as above.

MAKE ONE doesn't ask CraftBeerPi: the page makes the topic itself (`newTopic()`), so it works at once, with no connection and with `?demo=`, and can't fail. It is the kind of topic the plugin's `GET /phone-alerts/topic` makes: `cbpi-` and 24 characters from the plugin's own 32 (`SUGGEST_FROM`: lower case, without l, o, 0 and 1), from `crypto.getRandomValues`, which browsers offer over plain http too. That address stays for anyone who opens it by hand, as `ntfy_topic`'s description says.

The 12 settings save with SAVE like any other. Because the catalogue names them, they don't show under Plugins, and `cbpi4-PushOver_update` (source `hidden`) stays hidden. The rig needs the plugin before the group shows there.

### COPY over plain http

The Pi serves the page over http, where browsers don't offer `navigator.clipboard` (it needs https, or the computer the browser runs on). So COPY uses it where it can, and otherwise copies from a hidden text box with `document.execCommand("copy")`, which browsers still allow on a press (`legacyCopy()`). If neither works, it says "This browser won't copy here: SHOW the topic, then select it and copy it." After a copy, its second line reads "copied" for 2 s.

### What it can't do, and says so on the page

- ntfy on an iPhone sounds only with the ringer on and no Focus, and nothing repeats until acknowledged: each repeat of a run-out timer's alert is another notification, and they stay on the phone after he answers on a screen. The service's line, the timers' help and the timer test's answer say so.
- The iPhone's ntfy app can't be subscribed from a link or a QR code: it has no URL scheme or universal link (ntfy-ios 1.7.0). The topic has to be typed or pasted, hence COPY and the spelled-out topic. Topics are case-sensitive and the app's topic box doesn't capitalise, so MAKE ONE's topics are lower case.
- Two open ntfy iPhone bugs the test can bring to light: notifications that appear only once the app is opened (ntfy issue #2117; removing and re-adding the topic usually fixes it, which the sent answer suggests), and no sound on iOS 26.2 and later (#1562).
- What the plugin can't send: the alarms the brew-day screen raises by itself. The last part's closing line says so.

### For page.js

`port.mjs` carries the catalogue (the 12 entries in `M`, and the group with its `how` steps in `G`) and the CSS without any change to it. The logic is in `settings.js`, to build in `page.js`:

- after `ELSEWHERE`: `EXT`, `HOWS`, `isHow`, `KNOWN`, `NEEDS`, `away()`, `known()`, `STEPS`, `PHONE`, `SVC`, `TESTED`, `svcOf`, `svcNow`, `TOPIC_OK`, `WEB`, `hostOf`, `ntfyHost`, `FIELD`, `phoneState()` and `phoneReady()`;
- `meta()` (falls back to `HOWS`, and ignores `M` for a setting `away()` marks), `partsOf()` (`known()`), `gs()` (leaves out a group whose `needs` setting is missing), `invalid()`, `warnOf()`, `helpOf()` (`hs`) and `shown()` (`blank`, `other`);
- drawing: `ctlHTML()` (the `means` line; MAKE ONE, COPY and the spelled-out topic; THIS CRAFTBEERPI; links out), `rowHTML()` (the step's band, not for a setting `away()` marks), `howHTML()`, `plateHTML()` (`data-steps`, `data-pl` and `data-off`, the lamp, `foot`), `giHTML()` (the lamp's words; FIND counts the steps too) and `stHTML()`;
- the test: `testOff()`, `testHTML()`, `testWords()`, `eventOf()`, `settleTest()`, `runTest()` and `paintTest()`. `WILL` and the 1.2 s wait stand in for the plugin's answer;
- `newTopic()`, `legacyCopy()`, `copyText()`, `applySvc()`, `paintRow()` (greyed by `on` and `svc`; the notes, `hs`, `means`, the spelled-out topic and the test's lines), `paintAll()`, `paintChrome()` (the lamp, the test), `paintFind()`, `setDraft()`, `settle()`, `rebuild()`, and the click handler's `data-test`, `data-make`, `data-copy` and `data-here`.

`port.mjs`'s comments and `catalog.js`'s heading say `G` has nine groups; it has ten now, the tenth shown only with the plugin.

### The CSS

A block before "searching" in `settings.css`: `.row.step`, `.row .sn`, `.row.other` and `.part.other`, `.phd .pst` and `.pst`, `.part .foot`, `.gos` and `.tools`, `.cmd.out`, `.cmd .ext`, `.spell`, `.tests`, `.tfx` and `.det`; the 701–1179 px and phone rules for `.row.step` and `.row .sn`. No new colours or tokens: the band is the group list's, the sizes are the page's own.

Two changes reach the page without the plugin too, in the mockup and the build alike:

- At 820 px tall or less, the list's rows sit 2 px apart instead of 5, with 6 px of padding above and below it, so ten groups fit at 1366×768 (the last ends at 743 of 749 px). Your pictures at 1366×768 and 1024×768 change by those few pixels.
- From 701 to 1179 px wide, FIND and SAVE stay at the top of the window, and a group opened from the list landed with its heading under them: the heading at 15–42 px, under a 72 px bar, so its name, number and summary (and Phone alerts' lamp) were hidden. The built page does the same today, for every group. Now `.plate{scroll-margin-top:80px}`, at those widths only, lands each group 8 px under the bar, as a monitor's pane does (`scroll-padding-top:8px`). Checked at 701×900, 768×1024, 1024×768, 1119×1440 and 1179×820: every heading lands below the bar, and the list still marks the group opened. Your pictures of `#boil` and `#plugin` at 1024×768 and 768×1024 change: the group sits 69 to 80 px lower in the window.

### Checked

- My 51 checks of the phone alerts (`phonecheck.py`), at 1920×950 and on a 390×844 touch phone: steps and their numbers for each service, the lamp and the list's line, MAKE ONE, COPY, SHOW, the spelled-out topic, THIS CRAFTBEERPI, the checks and notes, each test answer, the red row after a refusal, FIND finding the hidden service's rows, the keyboard on the service choice, and a CraftBeerPi without the plugin (nine groups). All pass, with no script errors.
- On 20 Nov, after `away()`: all 21 moments, at 1920×1080 and on a 390×844 phone, are byte-for-byte the same page as before it, and so is a CraftBeerPi with no phone settings at all. With the original plugin's two settings, the page has nine groups, and Plugins lists "cbpi4-PushOver" ("named by their keys") with both as text boxes and CraftBeerPi's descriptions. FIND "pushover" finds them, and a change to either saves, on a monitor and on a phone, with no script errors. `phonecheck.py` and `smoke2.py` pass. The frame against `brew-day.html?bare#mash`, whose `brew-day.js` changed late on 18 Nov: at the 13 sizes with the 6 addresses, the comparison reads line for line as it did on 18 Nov.
- Also: a topic or server saved some other way that the plugin can't use turns the lamp off with the reason, marks the row, and greys the test with what to do; putting it right on the page changes "set up first" to "save first". Switching off one of the five switches doesn't hold up the test; changing the link does, since the test alert carries it.
- The 21 moments (the 13 and the 8) at seven sizes: nothing to press under 44 px, no text under its contrast minimum, nothing wider than the window or past its plate's edge, and no script errors. Each of the 49 UNDO boxes, scrolled to the middle, overlaps nothing.
- The pointer moved onto every button, link, box and group line in those views, 14,530 times: no text under its contrast minimum, no greyed control that changes, and the open group keeps its colours. All 7,248 controls in the 21 moments (on the phone, and at 1366×768, 1024×768 and 768×1024), each scrolled to the middle, can be reached at their centre and edges; the only things ever over them are the phone's save bar and tabs, before scrolling.
- The frame against `brew-day.html?bare#mash`, at the 13 window sizes with the 6 addresses, drawn without the graphics card: every part's position and size, computed styles, words and attributes match. So do the pixels, apart from a few at rounded corners at 1024, 1179, 700 and 390 px wide: 15 to 31 pixels, 1 or 2 shades apart, and 9 pixels at most 22 apart at the last tab's corner at 1024×768. The 16 Nov files in your `design\settings` show exactly the same, and every computed property of the frame's parts is the same on both pages, so they come from how the browser draws each whole page, not from the frame. They are within the 24 shades I've counted as drawing noise since 11 Nov.
- The long Brewery name box, the sound help and the clicked-through checks still pass.
- `port.mjs` (main's, unchanged) on a scratch copy: main's mockup files give exactly the product's `catalog.js`, `settings.css`, `settings-frame.css` and `demo-data.js`. Mine give a `catalog.js` that loads, with 65 settings in `M` for °C and °F and ten groups, every row of the phone group named in `M` or its `how`; a `settings.css` with the new rules and the laptop-height change; and the same `settings-frame.css`.
- Impeccable's checker: nothing new. Its notes are the ones above (the two stripes, and colours and sizes from `brew-day.css` and the tokens), which the new rules reuse.

### Settled with you (20 Nov)

1. MAKE ONE makes the topic in the page, as above, and doesn't ask `GET /phone-alerts/topic`. My 18 Nov note said to ask it; that was a mistake. Asking adds a way to fail that the approved mockup doesn't have, and up to 10 s (`SAVE_MS`) with nothing on the button to show a wait. So MAKE ONE needs no words for failing, and the note that was at `page.js` line 428 went in post27 (10d7306). With no connection, the new topic waits on the page for SAVE like any change, as the `#offline` note says. Checked in Chromium at a plain-http address that isn't the computer the browser runs on, as the Pi's address is for a phone, on a desktop and a touch phone: `isSecureContext` is false, `crypto.getRandomValues` is there (`crypto.randomUUID` and `navigator.clipboard` aren't), and the topics match `^cbpi-[a-km-np-z2-9]{24}$`. Your `negative_controls.py` looked for the request; its control is now `phone-page-make-one-https-only` (bench 8994f81): a page that takes the letters from `crypto.randomUUID`, which a plain-http page doesn't have. Your bench detects it.
2. A test's last answer goes when a setting it went by gets a new saved value from any screen, as `page.js` line 936 has it; "The test" above now says so. The mockup can't show another screen's save, so its code stays as it is.

### Changed in the worktree, all uncommitted

`proposal\settings.js`, `settings.css`, `settings.html`, `settings-data.js`, `GROUPING.md` and this file.

## HLT pump: new words for core 4.7.7.post49 (22 Nov)

Core 4.7.7.post49 (8060eaf4) no longer starts the HLT pump for the HLT element switched on by hand. Only a logic starting to heat the HLT starts it: the HLT's own AUTO, or the mash tun's HERMS, which BrewStart also heats through. AUTO taking the heating over from the hand still starts it. So the setting's old name, "Run the HLT pump while the HLT heats", promised more than CraftBeerPi does. `M.HLT_PUMP_WITH_HEAT` now has:

- `n`: "Start the HLT pump when AUTO or the HERMS heats the HLT". AUTO and HERMS are what the brew-day screen shows on the HLT while a logic heats it: its own mode switch at AUTO, or the dashed HERMS button while the mash tun's AUTO runs the HERMS.
- `h`: "Until the recipe reaches its sparge, so the water doesn't settle into hot and cool layers. Heating by hand never starts it: the pump may not be primed, or its hoses may not be in place. It keeps running when the heat stops. You can still stop it; it starts again when AUTO or the HERMS next starts heating." "Heating by hand" is what the brew-day screen says while an element is on in MANUAL. The reason it never starts the pump is the one the core gives. The last sentence is new, though the rule it states hasn't changed: a stop lasts only until a logic next starts heating, as the core's description says. That matters to someone who stopped the pump because it wasn't ready.
- `syn`: "recirc agitator stir layers manual" (was "recirc agitator layers"). FIND already finds "auto", "herms", "hand", "primed" and "hoses" in the name or the help.

Where it shows. All of it comes from `M`, so `port.mjs` carries it, and `catalog.js` line 30 is the only line that changes:

- its row, the first in Mash and sparge under "While you brew": the name, the help and the key;
- the group list's line for Mash and sparge, which starts with the first four names, so it now begins "Start the HLT pump when AUTO or the HERMS heats the HLT" and is cut short with "…" as before;
- FIND, through the name, the help, `syn`, the key and the group's name;
- wherever the page names a setting: the last-event line after a save ("Settings: Start the HLT pump when AUTO or the HERMS heats the HLT saved"), and the didn't-save and leaving notes;
- `GROUPING.md`: the Mash and sparge table, the placement note, and "Changed after the release (22 Nov 2026)" for the brewer.

What moves: the help line grows from 2 lines to 4 at 1920 and 1024 wide, from 3 to 5 at 1366×768, from 4 to 8 at 768×1024, and from 3 to 7 on a 390×844 phone, where the name also takes 2 lines. That is as long as the longest help already on the page at each size, not longer. At 1920 the row is 165 px tall instead of 123, so everything under it in Mash and sparge moves down 42 px. Every picture that shows the group list has the new start to Mash and sparge's line. The mockup and the build change alike.

The core's description: an install that already has HLT_PUMP_WITH_HEAT keeps the old one, which still says the pump starts "whenever the HLT starts heating". ConfigUpdate writes it only when the setting is missing (`if HltPumpWithHeat is None`), while AddMashOutStep's block (line 525) rewrites its description with each version and keeps the saved value. The Settings page never shows this description, because `M` names the setting, so nothing on screen is wrong. But 8000, 8012 and the rig serve the old words in `GET /config/`, and `settings-data.js` keeps them, since it records what 8012 serves.

Checked:

- All 52 recorded pages (the 21 moments at 1920×1080 and on a 390×844 phone, and a CraftBeerPi with the original plugin or no phone settings) differ from 20 Nov's only by the new name and help. Nothing else on any page changed.
- At seven sizes, the row is drawn whole, with nothing past its edge and nothing wider than the window, on a phone with Mash and sparge open too. There are no script errors.
- FIND finds the row by "herms", "hand", "primed", "manual", "hoses", "stir", "hlt pump", "recirc" and "layers". "mash" still finds 9 rows. SAVE puts the new name in the last-event line. `smoke2.py` passes.
- `port.mjs` (main's) on a scratch copy: `catalog.js` differs from the product's in line 30 only, and `settings.css`, `settings-frame.css` and `demo-data.js` don't differ at all.

Changed in the worktree: `proposal\settings.js` (that one entry), `GROUPING.md` and this file.

## Show liquid levels on Brew Day: built with web UI 0.5.1.a3.post76 and core 4.7.7.post93

The liquid in each vessel on Brew Day (design/brewday LEVELS.md) has an off switch, as its build note asks: a CraftBeerPi setting, BREWDAY_LEVELS, Yes or No, Yes by default, which ConfigUpdate adds where it is missing and keeps once saved. `M.BREWDAY_LEVELS`:

- `n`: "Show liquid levels on Brew Day";
- `h`: "A faint tint of the liquid in each vessel in the brew-day screen's drawing, worked out from the recipe and its steps, or a volume typed into BrewScribe, marked READ. No shows none, and Brew Day doesn't ask BrewScribe for the volumes.";
- `syn`: "level levels volume liquid tint vessel read".

Where it shows: the last row of Timers and alerts, the group for what Brew Day shows and plays, a Yes and No switch as every Yes/No setting has. `settings-data.js` has it as core post93 adds it, so the mockup's pages and the build show the same row. `port.mjs` carries it: `catalog.js` gains the entry and the group's row, `demo-data.js` the setting, and nothing else changes.

Changed: `settings.js` (the entry and the group's row), `settings-data.js`, `GROUPING.md` and this file.
