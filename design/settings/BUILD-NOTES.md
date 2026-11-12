# Settings page: what it would take to build

For Brett, from the Settings design agent. The design is in `C:\src\personal\craftbeerpi4-ui-settings` (branch `impeccable-settings`, made from `brewday-graphs` at 091c9a2, nothing committed). The grouping, with every setting's group, plain name, key and control, is in `proposal\GROUPING.md`; this file says how the page looks and behaves, part by part.

## Settings page: approved by Scott on 11 Nov, built by Brett on 12 Nov

Built: web UI 75d5b91 (built in 70dc68a), on Brett's test copy at 8012; DEFECTS M78. His identity test, `test_ui_settings_identity.py`, matches this mockup in all 104 pictures: 13 moments at six sizes, a 30-character name, a blank name and no BrewScribe at each size, and seven presses.

Scott's request: "I'd like the settings to be intelligently sorted and presented in groups by function. Right now, they are a confusing long list in no particular order - maybe alphabetical?" (It is alphabetical by key, capitals first, because the server writes `config.json` with `sort_keys`.)

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
- `proposal\alarm.js`: a copy of your `components\brewday\alarm.js` at 3589ba9 (the same at 17c9eb9), with its exports moved to `window.CBPI_ALARM`, because a page opened from disk can't load a module. In the build, import from `alarm.js` itself.
- The strip along the top steps through moments: `#top`, `#boil`, `#find-lid`, `#find-key`, `#find-none`, `#changes`, `#saving`, `#saved`, `#failed`, `#leave`, `#cloud`, `#plugin`, `#offline`. `?bare` hides the strip.
- Everything on the page comes from two tables at the top of `settings.js`. With option A they are the page's catalogue: port them as they are to `cbpi4gui\src\components\settings\catalog.js`, exporting `M` and `G` (your answer, 11 Nov).
  - `M`, one entry per setting: `n` plain name, `h` what it does, `syn` extra words for FIND, `ctl` control (when its type isn't enough), `order` and `lab` (option order and labels), `blank` (what a blank choice is called), `unit`, `restart` (`"on"`: only turning it on needs a restart; `"next"` and `"any"`: any change does), `dep` (its main switch and the value that makes it count), `adv`, `secret`, `cloud` and `hc` (InfluxDB Cloud's names and wording), `calc` (a worked-out line under it), `keep` (labels keep their case).
  - `G`, the nine groups in brewing order: `id`, `name`, `sum` (one line under the heading), `see` (a setting from another group shown here), and `parts`, each with an optional heading `h` and its `rows` in order.

### The frame

Settings opens inside the brew-day frame, layout B: title bar, last-event line, tabs with SETTINGS lit. Same markup and styles as the brew-day screen; nothing new there. In the build, draw the brew-day frame itself. The mockup carries a copy only so that your comparison has the whole screen.

The mockup's copy now matches Amber's layout B as of 11 Nov, 22:55 (`craftbeerpi4-ui-impeccable\proposal\brew-day.css` and `brew-day.html`), rule for rule, in `brew-day.css`'s order. That includes the six differences you found, and the rest of what changed tonight:

- The brewery name (M74): one `<span class="bname">` at every width, with `.brand`, `.bname` and `[data-long]` (more than 24 characters is drawn at 0.7 size, except from 701 to 1023 px wide). Blank shows CraftBeerPi. The browser tab's title starts with it: "CraftBeerPi Brewery · Settings".
- BREWSCRIBE (M75), the last tab, after MORE, with its icon. On a phone the tabs are four and four; MORE spans two cells only without BrewScribe. Pressing BREWSCRIBE doesn't ask about unsaved changes, because BrewScribe opens in a browser tab of its own and this page stays as it is.
- The event line: padding 8 px 10 px 8 px 14 px, min-height 48 px. On a phone the padding is 3 px 3 px 3 px 12 px, and the min-height stays 48 px, because layout B's rule wins over the phone's 50 px, as on brew day. Its time has even-width digits.
- The clock: even-width digits (`font-variant-numeric: tabular-nums` inside `.clock`, after the `font` shorthand). ALL OFF and the clock keep their width (`flex: none`) only at 1180 px and up, as on brew day.
- From 701 to 1023 px wide, the alarm or question gets a row of its own under the name.
- On a phone: the banner is 50 px tall with 14 px left padding (layout B's rule wins over the phone rule, as on brew day), and the title bar's row gap is 8 px.
- Connection lost: ALL OFF is dimmed (`aria-disabled="true"`, `data-why="No connection. Controls are paused."`, opacity .5, `cursor: not-allowed`), and pressing it shows that reason. The banner still says No alarms.
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

- A change marks its row: a blue tint (`rgb(42 111 192 / .12)`) and a 2 px inset ring in `--select`, and on the status line "CHANGED · was °F" with UNDO. Changing it back clears it. The group's row says `1 CHANGED`, UNDO says "put back the change" or "put back all 3", and SAVE turns blue: "SAVE · 3 changes".
- SAVE sends every change at once with `configapi.update(name, value, ok, failed)` (`PUT /config/{name}/`) and waits for every answer. It does not reload the page: the `configupdate` topic already keeps `config` current (`components\data\index.js` line 56).
- While it waits, each row has the brew-day's waiting signal, a 6 px marching stripe along its top edge, and SAVE reads "Saving… · waiting for CraftBeerPi" with the same stripe. UNDO is greyed.
- Each answer marks its row: "✓ SAVED 14:32" in `--run`, or in red "DIDN'T SAVE · CraftBeerPi didn't answer, so it may not have it" with a white TRY AGAIN ("send it again"), the row tinted `--fault-bg` with a 2 px `--alarm` ring. A setting that needs a restart adds, in amber, "· on after a restart" or "· used after a restart".
- The last-event line then says "Settings: Temperature unit saved · confirmed", "Settings: 3 changes saved · confirmed", or "Settings: Heating element interlock didn't save; 2 saved · failed". It's the brew-day screen's own list in localStorage, `cbpi.brewday.events` (newest first, at most 50, dropped after 12 hours): `["14:32:05", "Settings: Temperature unit saved", "confirmed", "ok", "", Date.now()]`, or `"failed"` with tone `"bad"`. A brew-day screen open in another tab sees it once it listens for changes, which you're adding.
- UNDO at the top puts back every change not yet saved; each row's UNDO puts back its own.
- If another screen saves a setting that has an unsaved change here, the change stays and its "was" updates to the new saved value. If the other screen saved the same value as the change here, the change clears, since there's nothing left to save (your addition, 11 Nov). Not shown in the mockup.

### Notes at the top of the right side

One at a time, in this order, never a pop-up:

1. **Leaving with changes** (amber): "**Leave Settings with 2 changes not saved?** Heating element interlock, Timer names to pick." SAVE AND GO (white, "then Brew day"), GO WITHOUT SAVING ("drops them"), STAY ("keep changing"). It appears when a tab is pressed with changes not saved, and focus goes to SAVE AND GO. Closing or reloading the browser tab can only get the browser's own "Leave site?" question (`beforeunload`).
2. **No connection** (red): "**No connection to CraftBeerPi.** These are the settings as they were at 14:31. Your changes stay on this page until it is back; then SAVE sends them." SAVE is greyed, "no connection".
3. **Didn't save** (red): "**Heating element interlock didn't save.** CraftBeerPi didn't answer, so it may not have it. It's still on this page; nothing else is affected." TRY AGAIN (white) and SHOW IT ("in Brewhouse"), which jumps to the row.
4. **Restart** (amber): "**MQTT resend interval is saved; CraftBeerPi uses it after a restart.** Everything else is in use now. Restart from System, under More, when nothing is brewing." OPEN SYSTEM ("to restart"). The server's restart is `POST /system/restart`.

### FIND A SETTING

- Every word typed must appear in the setting's name, its key (also with `_` read as spaces), what it does, its group's name, its plugin's name, or its extra words (`syn`). Matches are marked (`#5a4300` behind `#fff3d6`).
- Rows that don't match, see-also lines, empty parts and empty plates hide. The left column says "N found" for each group, greys a group with "none", and lights the first group with results (none if nothing is found).
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
- Every button and field is at least 44 px tall at every size (measured).
- With reduced motion: no stripes, flash, glow or smooth scrolling.

### Tokens

The brew-day's tokens, plus these, all in `settings.css`'s `:root`: `--hover #253545`, `--prompt-ink #fff1d2`, `--note #ffd9a0`, `--fault-bg #2b1315`, `--alarm-ink #ffc9c4`, `--active-edge #3c7fcc`, `--active-ink #dce9f7`, `--focus #8cc2ff`, `--answer #f4f6f8`, `--answer-ink #10161c`, `--sunk` (the brew-day's sunken-face shadow), `--row-l 560px`, `--row-c 420px`. Every other colour, size and corner comes from `brew-day.css`.

### The server: nothing

Option A needs no server or plugin change. Your two new settings are in the catalogue and match what 8012 serves: AddMashOutStep (Yes/No, default Yes; in Mash and sparge, after the mash step type) and BREWDAY_ALARM_SOUND (`kitchen`, `alarm`, `high`, `soft`, shown as Kitchen timer, Alarm, High beep, Soft ping; default `kitchen`; in Timers and alerts).

### Found while designing

1. **Today's SAVE doesn't wait.** `save()` in `components\settings\index.js` (lines 165–175) calls `configapi.update` for each change and `navigate(0)` straight away, so the page reloads without CraftBeerPi's answer and can't show a failure.
2. **The brew-day title bar ignored Brewery name.** It printed "CraftBeerPi Brewery" from `screen.js` line 89; only the older main menu read BREWERY_NAME (`MainMenu\index.js` line 168). Fixed since by Amber's M74: the title bar shows Brewery name at every width, and the mockup's frame now does too. So the page's "your brewery's name, at the top of the screen" is true.
3. **Two beeps for one alert.** Confirmed by you (12 Nov): with PLAY_BUZZER on Yes, AlertProvider's `show()` plays the buzzer for every new notification, on any page, and the brew-day frame's `ring(2)` plays for the same notification when SOUND is on. You're putting the choice to Scott.
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

### Settled with you (11–12 Nov)

1. Settings saves go in the last-event line: see "Changing and saving".
2. The catalogue: `cbpi4gui\src\components\settings\catalog.js`, exporting `M` and `G`.
3. Another screen's save: as under "Changing and saving", with your same-value rule.
4. Your correction: the third sound is High beep (`high`), not Long beep. The mockup, its data and these notes now say so, and TRY plays your sounds.
5. Your correction (12 Nov): text boxes that aren't drawn are measured once they show. Before, `grow()` measured every box, including those in a phone's closed group or a row FIND hides; those got height "2px", so once shown they were one line tall and a long value lost its end. Now `grow()` skips a box with no client rects, `applyView()` and the end of `paintFind()` call it, and `render()` and the resize handler no longer call it themselves. The mockup's lines are now the same as `page.js` at 75d5b91. With a 63-character `?name=`, the Brewery name box was cut off (46 px for 66 px of words) three ways: a phone opening Brewhouse from the list; the same after going back and resizing; and a monitor after FIND "unit", a resize, and clearing FIND. All three are whole now, and the 13 moments at seven sizes are still clean.
6. Your note (12 Nov): the Timer alarm sound's help (`M.BREWDAY_ALARM_SOUND.h`) now covers the alerts too: "What the brew-day screen plays when a timer runs out, every 3 seconds until you answer it. For a new hop alert, question or error, the screen plays just the first two beeps, once." That is 3 lines on a monitor and 4 on a phone, shown whole, and FIND finds the row by "hop alert", "question" and "two beeps". `alarm.js` is now a copy of yours at 9faf75d; only its opening comment changed, and the sounds are the same. `settings-data.js` still has the old description, ending "Switching SOUND on at the screen plays it.": 8012 still serves that, and the core rewrites the description only when its version changes. It only shows for a setting `M` doesn't know, so it waits for the next snapshot.
