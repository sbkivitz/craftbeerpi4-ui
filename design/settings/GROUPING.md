# Settings, grouped by what they do

A proposal for the CraftBeerPi Settings page, 11 Nov 2026. Nothing is built or changed yet. Updated the same afternoon with the mockup's setting names and, at the end, what each part needs to be built.

**How it's arranged.** The groups follow a brew day: the brewhouse and the recipe first, then mash and sparge, boil, whirlpool and cooling, then the things that run all day (timers and alerts), what CraftBeerPi keeps and sends (logs and data), and last the software itself (plugins, system and dashboards). Inside a stage, settings that act **while you brew** come first, then the defaults that **imported recipes** get. Inside each part, the order is the order you'd meet them, or the main switch first and its details under it.

**Each row** shows the plain name, a short line on what it does, and the key underneath in small type (FIND searches it, and CraftBeerPi's own messages still use it). The control sits on the right, in one straight column down the page.

Counts below are the simulator's 51 visible settings plus Brett's two new ones (marked *new*). The three hidden settings (CONFIG_STATUS, current_dashboard_number, current_grid) stay hidden.

**Names changed since you approved the grouping.** Twelve names now start with the word you'd look for, so the list is quicker to scan:

| Was | Now |
|---|---|
| Heating elements | Heating element interlock |
| Switch with its own override | Switch with a hand override |
| Your name on new recipes | Recipe author |
| Recipes listed from Brewfather | Brewfather recipes shown |
| What the lid alert says | Lid alert message |
| Switch the lid alert turns on | Lid alert switch |
| Cool the wort to | Cooldown temperature |
| Probe to watch while cooling | Cooldown probe |
| Cooling water switch | Cooldown water switch |
| Show warnings and errors as notifications | Warnings and errors as notifications |
| Resend kettle and fermenter state every | MQTT resend interval |
| Simulated seconds per real second | Simulation speed |

## 1. Brewhouse — your rig: its name and units, which kettle is which, what may run together

| # | Plain name | Key | Control |
|---|---|---|---|
| 1 | Brewery name | BREWERY_NAME | text |
| 2 | Temperature unit | TEMP_UNIT | °F / °C |
| 3 | Pressure unit (fermenters) | PRESSURE_UNIT | kPa / PSI |
| 4 | Mash tun | MASH_TUN | kettle |
| 5 | Boil kettle | BoilKettle | kettle |
| 6 | Heating element interlock | ACTOR_INTERLOCK_MODE | one at a time / off |
| 7 | ↳ Switches never on together (advanced) | ACTOR_INTERLOCK_GROUPS | text, only if 6 can't describe the rig |
| 8 | Switch with a hand override | BREWDAY_OVERRIDE_ACTOR | switch (actor) |

## 2. Recipes — bringing recipes in

| # | Plain name | Key | Control |
|---|---|---|---|
| 1 | Recipe author | AUTHOR | text |
| 2 | Imported steps run their kettle in AUTO | AutoMode | yes / no |
| 3 | Brewfather user ID | brewfather_user_id | text |
| 4 | Brewfather API key | brewfather_api_key | text, hidden until shown |
| 5 | Brewfather recipes shown | brewfather_list_length | 5 to 100 |
| 6 | Recipe creation plugin path (advanced) | RECIPE_CREATION_PATH | text |

## 3. Mash and sparge

| # | Plain name | Key | Control |
|---|---|---|---|
| | **While you brew** | | |
| 1 | Run the HLT pump while the HLT heats | HLT_PUMP_WITH_HEAT | yes / no |
| | **In imported recipes** | | |
| 2 | Add a mash-in step if the recipe has none | AddMashInStep | yes / no |
| 3 | Mash-in step type | steps_mashin | step type (blank: MashInStep) |
| 4 | Mash step type | steps_mash | step type (blank: MashStep) |
| 5 | Add a mash out if the recipe has none *new* | AddMashOutStep | yes / no |
| 6 | Lautering stop after the mash | steps_mashout | step type (only NotificationStep adds one) |
| 7 | Sparge step type | steps_sparge | SpargeStep / MashStep |

## 4. Boil

| # | Plain name | Key | Control |
|---|---|---|---|
| | **While you brew** | | |
| 1 | Ask before heating the boil kettle | CONFIRM_BEFORE_BOIL | yes / no |
| 2 | Start the boil timer by itself | BoilAutoTimer | yes / no |
| 3 | Lid alert message | steps_boil_lid_alert | text |
| 4 | Lid alert switch | steps_boil_actor | switch (actor) |
| | **In imported recipes** | | |
| 5 | Boil step type | steps_boil | step type (blank: BoilStep) |
| 6 | Boil temperature | steps_boil_temp | °F |

## 5. Whirlpool and cooling — all for imported recipes

| # | Plain name | Key | Control |
|---|---|---|---|
| 1 | Whirlpool temperature | steps_whirlpool_temp | °F |
| 2 | Cooldown step type | steps_cooldown | step type (blank: WaitStep) |
| 3 | Cooldown temperature | steps_cooldown_temp | °F |
| 4 | Cooldown probe | steps_cooldown_sensor | sensor (blank: the kettle's own) |
| 5 | Cooldown water switch | steps_cooldown_actor | switch (actor) |

## 6. Timers and alerts — what you see and hear while you brew

| # | Plain name | Key | Control |
|---|---|---|---|
| 1 | Timer names to pick | BREWDAY_TIMER_NAMES | text |
| 2 | Timer alarm sound *new* | BREWDAY_ALARM_SOUND | Kitchen timer / Alarm / High beep / Soft ping |
| 3 | Buzzer for notifications | PLAY_BUZZER | yes / no |
| 4 | Warnings and errors as notifications | NOTIFY_ON_ERROR | yes / no |

## 7. Logs and data — what CraftBeerPi keeps and sends

| # | Plain name | Key | Control |
|---|---|---|---|
| | **Log files** | | |
| 1 | Save readings to log files | CSVLOGFILES | yes / no (turning it on needs a restart) |
| 2 | ↳ Largest log file | SENSOR_LOG_MAX_BYTES | bytes (from the next restart) |
| 3 | ↳ Old log files kept | SENSOR_LOG_BACKUP_COUNT | number (from the next restart) |
| 4 | Log element power and target too | PID_LOGGING | yes / no |
| | **InfluxDB** | | |
| 5 | Send readings to InfluxDB | INFLUXDB | yes / no (turning it on needs a restart) |
| 6 | ↳ InfluxDB Cloud | INFLUXDBCLOUD | yes / no |
| 7 | ↳ Address | INFLUXDBADDR | text |
| 8 | ↳ Database (bucket on Cloud) | INFLUXDBNAME | text |
| 9 | ↳ User (organisation on Cloud) | INFLUXDBUSER | text |
| 10 | ↳ Password (token on Cloud) | INFLUXDBPWD | text, hidden until shown |
| 11 | ↳ Measurement | INFLUXDBMEASUREMENT | text |
| | **MQTT** | | |
| 12 | MQTT resend interval | MQTTUpdate | every 30 s to 5 min, or never (needs a restart) |

## 8. Plugins — each plugin's settings under its own name

| # | Plain name | Key | Control |
|---|---|---|---|
| | **BrewStart** | | |
| 1 | Language | BREWSTART_LANGUAGE | English / Deutsch (step form changes after a restart) |
| | **SimVessel** (simulator only) | | |
| 2 | Simulation speed | SIM_TIME_SCALE | × real time |

A plugin this page doesn't know gets its own heading here, named after the plugin, with its settings by key and its own descriptions.

## 9. System and dashboards — the software itself

| # | Plain name | Key | Control |
|---|---|---|---|
| 1 | Warn when free memory falls below | MIN_MEMORY | MB |
| 2 | Free-form dashboards | max_dashboard_number | 1 to 10 |
| 3 | Slow the dashboard's pipe animation | slow_pipe_animation | yes / no |

## Placement calls worth checking

- **Mash tun and Boil kettle** sit in Brewhouse, not in Mash or Boil, because the brew-day screen and the HLT pump also use them to tell the kettles apart. Mash and sparge, and Boil, each show a line such as "Boil kettle: Boil Kettle, chosen in Brewhouse" with a CHANGE IT IN BREWHOUSE button.
- **HLT pump with heat** sits in Mash and sparge because it runs until the sparge.
- **Override switch** sits in Brewhouse because it describes how the rig is wired (Recirc_PUMP's own switch), even though its key starts BREWDAY_.
- **Recipe step defaults** sit in the stage they make, with "In imported recipes" over them, so "sparge step type" is under Sparge rather than in a block of 15 import settings.

## The mockup

Open `C:\src\personal\craftbeerpi4-ui-settings\proposal\settings.html` in a browser. The strip along the top steps through 13 situations: the page as it opens, Boil, FIND "lid", FIND a key, FIND with no match, three changes, saving, saved, a change that didn't save, leaving with changes, InfluxDB Cloud, a plugin the page doesn't know, and no connection. You can also click about freely: change things, SAVE, UNDO, search. Nothing reaches CraftBeerPi; SAVE only pretends. To see the phone version, make the window narrower than 700 px. The title bar, last event and tabs are the brew-day screen's own, as of 11 Nov (with your brewery's name and the BREWSCRIBE tab); the strip's "Brewery name" links try other names.

## How the page behaves

- **On a monitor:** the nine groups on the left, where the recipe sits on the brew-day screen, all visible at once. Tap one and the right side scrolls to it; scroll the right side and the left shows where you are. FIND and SAVE stay above the settings.
- **On a phone:** the nine groups are a list. Tap one and it opens on its own, with "‹ All groups" at the top. A blue bar above the tabs appears while there's anything to save.
- **FIND** matches every word you type against names, keys, what each setting does, and a few extra words (such as "grafana" or "csv"). Groups with nothing found are greyed out with "none". Words like PID or boil power get a note that those settings are kept with each kettle, switch or probe in Hardware, and a button to go there.
- **One SAVE, as today.** A changed setting turns blue and says what it was, with its own Undo. SAVE sends them all; each row then says "Saved 14:32" or, in red, "Didn't save" with Try again. Today's SAVE reloads the page without waiting for CraftBeerPi's answer, so it can't tell you if a save failed.
- **Restarts:** the six settings that need a restart say so beside their key (two of them only when you turn them on). After saving one, an amber note says which and offers Open System.
- **Leaving with changes** brings up a note on the page itself, not a pop-up: Save and go, Go without saving, or Stay.
- **No connection:** your changes stay on the page, and SAVE waits until CraftBeerPi is back.

## What each part needs to be built

"Web page" means only Brett's web page changes: no new CraftBeerPi server, plugins or rig update beyond the usual web page update.

| Part | Needs | Notes |
|---|---|---|
| Groups, order, names and descriptions | Web page (A) or server (B) | see "A or B" below |
| Which settings need a restart | Web page (A) or server (B) | known from CraftBeerPi's code today |
| FIND, its extra words, the Hardware pointer | Web page | |
| One SAVE, Undo, Saved / Didn't save per row | Web page | uses the server's existing one-setting save |
| Leave note | Web page | closing the browser tab gets the browser's own "Leave site?" question instead |
| Brewfather key and InfluxDB password hidden until SHOW | Web page | hides them on screen only; anyone who can open CraftBeerPi can still read them |
| "About 26 hours per probe" under the log file sizes | Web page | an estimate: about 32 bytes a reading, one reading a second |
| TRY beside the timer alarm sounds | Web page | needs Brett's BREWDAY_ALARM_SOUND sounds |
| No connection: changes kept, SAVE waits | Web page | |
| Phone layout | Web page | |
| Brewery name at the top of the screen | Web page, done | the brew-day title bar shows it since 11 Nov (Amber's change M74), and Settings uses the same title bar |
| Saves in the last-event line | Web page | Brett confirmed the event line can take them (11 Nov) |

## A or B: where the names and groups live

**A. In the web page.** The page keeps a list of every setting it knows: its group, plain name, what it does, and whether it needs a restart. Nothing changes in CraftBeerPi's server or plugins. A setting missing from the list still shows: a plugin's under that plugin's name in Plugins, any other under "Not sorted yet" in System and dashboards, by its key with CraftBeerPi's own description. When CraftBeerPi or a plugin adds a setting, someone adds a line to the list.

**B. In CraftBeerPi itself.** Each setting carries its group, plain name, order and restart flag, and a plugin can fill these in for its own settings. The page uses them when they're there and falls back to A's list when they aren't. That means changing CraftBeerPi's server and each plugin that wants it, and the rig needs those updates too.

**Suggestion: A now.** It's one web page update, and B can be added later without undoing it.

## Decided (11 Nov 2026)

1. The mockup: "Yes, it looks right".
2. Saving: "Keep one SAVE (Recommended)".
3. Where the names and groups live: "A: in the web page, for now (Recommended)".

The build notes for Brett are in `proposal\BUILD-NOTES.md`.
