# Settings, grouped by what they do

A proposal for the CraftBeerPi Settings page, 11 Nov 2026, updated that afternoon with the mockup's setting names and, at the end, what each part needs to be built. The brewer approved it the same day; Brett built it on 12 Nov, and it is in the 13 Nov release (web UI 14a4108). Group 7, Phone alerts, was added on 18 Nov, and you approved it on 20 Nov.

**How it's arranged.** The groups follow a brew day: the brewhouse and the recipe first, then mash and sparge, boil, whirlpool and cooling, then the things that run all day (timers and alerts), what CraftBeerPi keeps and sends (logs and data), and last the software itself (plugins, system and dashboards). Inside a stage, settings that act **while you brew** come first, then the defaults that **imported recipes** get. Inside each part, the order is the order you'd meet them, or the main switch first and its details under it.

**Each row** shows the plain name, a short line on what it does, and the key underneath in small type (FIND searches it, and CraftBeerPi's own messages still use it). The control sits on the right, in one straight column down the page.

Counts below are the simulator's 51 visible settings plus Brett's two new ones (marked *new*), and the phone alerts plugin's twelve (group 7, approved 20 Nov). The hidden settings (CONFIG_STATUS, current_dashboard_number, current_grid, and the plugin's version) stay hidden.

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

## 7. Phone alerts — a buzz on your phone when the brew-day screen beeps *new, approved 20 Nov*

Only where the phone alerts plugin is installed (cbpi4-PushOver 0.0.10.post2 or later); without it the page has the nine groups above and below. The original cbpi4-PushOver (0.0.10), without phone alerts, has a user key and an API token under the same names; with it, the group doesn't show, and those two stay under Plugins by their keys, as they are today. The screens stay the alarm: the phone is a second signal, for when you're across the room or the boil is loud.

| # | Plain name | Key | Control |
|---|---|---|---|
| 1 | Send them through | phone_alerts_service | ntfy / Pushover, with a line under it on what the chosen one means |
| | **Turning it on**, through ntfy (numbered steps; Pushover's take their place when it's chosen) | | |
| | Step 1: Get the ntfy app | | App Store link, opens in a new tab |
| 2 | Step 2: Topic | ntfy_topic | text, hidden until shown; MAKE ONE, COPY; shown, it is spelled out in fours to type into the phone |
| | Step 3: Subscribe to the topic | | what to do in the ntfy app |
| | Step 4: Send a test | | TEST ALERT ("like a hop alert"), TEST TIMER ("like a run-out timer"), and the answer |
| | **Turning it on**, through Pushover | | |
| | Step 1: A Pushover account and app | | pushover.net and App Store links |
| 3 | Step 2: User key | pushover_user | text, hidden until shown; a note if it isn't 30 letters and digits |
| 4 | Step 3: API token | pushover_token | the same, and a link to pushover.net/apps/build |
| | Step 4: Critical Alerts, for timers | | what to turn on in the Pushover app |
| | Step 5: Send a test | | as for ntfy |
| | **Optional**, ntfy only: most brewers leave these | | |
| 5 | Tapping an alert opens | ntfy_link | web address; THIS CRAFTBEERPI fills in this page's own |
| 6 | Access token (advanced) | ntfy_token | text, hidden until shown |
| 7 | ntfy server (advanced) | ntfy_server | web address, normally https://ntfy.sh |
| | **What reaches your phone** | | |
| 8 | Run-out timers | phone_alerts_timers | yes / no |
| 9 | Boil additions | phone_alerts_additions | yes / no |
| 10 | Questions | phone_alerts_questions | yes / no |
| 11 | Errors | phone_alerts_errors | yes / no |
| 12 | Warnings | phone_alerts_warnings | yes / no |

At the top of the group, beside its name, a lamp and a word say whether phone alerts are on, by what CraftBeerPi has saved: "On · through ntfy.sh", or "Off · no topic yet". The list on the left says the same under the group's name. Under the five switches, one line says what never reaches the phone: the alarms the brew-day screen raises by itself, such as No connection.

## 8. Logs and data — what CraftBeerPi keeps and sends

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

## 9. Plugins — each plugin's settings under its own name

| # | Plain name | Key | Control |
|---|---|---|---|
| | **BrewStart** | | |
| 1 | Language | BREWSTART_LANGUAGE | English / Deutsch (step form changes after a restart) |
| | **SimVessel** (simulator only) | | |
| 2 | Simulation speed | SIM_TIME_SCALE | × real time |

A plugin this page doesn't know gets its own heading here, named after the plugin, with its settings by key and its own descriptions. The phone alerts plugin's settings are in group 7 instead.

## 10. System and dashboards — the software itself

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
- **Phone alerts** (approved 20 Nov) get a group of their own, right after Timers and alerts, rather than a second part inside it: the list on the left then says "Phone alerts" by name, and the setup steps and the test get a plate to themselves. Inside Timers and alerts it would have grown from 4 settings to 16, and the list wouldn't show the word "phone". The cost is ten groups: on a 1366×768 laptop the list's rows sit 2 px apart instead of 5, so all ten still fit.

## The mockup

Open `C:\src\personal\craftbeerpi4-ui-settings\proposal\settings.html` in a browser. The strip along the top steps through 13 situations: the page as it opens, Boil, FIND "lid", FIND a key, FIND with no match, three changes, saving, saved, a change that didn't save, leaving with changes, InfluxDB Cloud, a plugin the page doesn't know, and no connection. Its second line has eight for phone alerts: not set up, a topic made but not saved, on, a test sent, a topic refused, ntfy.sh not reached, Pushover with a timer test sent, and Pushover with no phone signed in. You can also click about freely: change things, SAVE, UNDO, search. Nothing reaches CraftBeerPi; SAVE only pretends. To see the phone version, make the window narrower than 700 px. The title bar, last event and tabs are the brew-day screen's own, as of 11 Nov (with your brewery's name and the BREWSCRIBE tab); the strip's "Brewery name" links try other names.

## How the page behaves

- **On a monitor:** the nine groups on the left (ten with phone alerts), where the recipe sits on the brew-day screen, all visible at once. Tap one and the right side scrolls to it; scroll the right side and the left shows where you are. FIND and SAVE stay above the settings.
- **On a phone:** the groups are a list. Tap one and it opens on its own, with "‹ All groups" at the top. A blue bar above the tabs appears while there's anything to save.
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
| Phone alerts: the group, its names, steps and words | Web page | the plugin's settings and its test are in cbpi4-PushOver 0.0.10.post2; the rig needs that plugin too |
| Phone alerts: MAKE ONE | Web page | the page makes the topic itself, so it works even with no connection |
| Phone alerts: TEST ALERT, TEST TIMER and their answers | Web page | ask the plugin's POST /phone-alerts/test, which says why a test didn't go |
| Phone alerts: COPY, THIS CRAFTBEERPI, the checks on a topic, an address or a key | Web page | |

## A or B: where the names and groups live

**A. In the web page.** The page keeps a list of every setting it knows: its group, plain name, what it does, and whether it needs a restart. Nothing changes in CraftBeerPi's server or plugins. A setting missing from the list still shows: a plugin's under that plugin's name in Plugins, any other under "Not sorted yet" in System and dashboards, by its key with CraftBeerPi's own description. When CraftBeerPi or a plugin adds a setting, someone adds a line to the list.

**B. In CraftBeerPi itself.** Each setting carries its group, plain name, order and restart flag, and a plugin can fill these in for its own settings. The page uses them when they're there and falls back to A's list when they aren't. That means changing CraftBeerPi's server and each plugin that wants it, and the rig needs those updates too.

**Suggestion: A now.** It's one web page update, and B can be added later without undoing it.

## Decided (11 Nov 2026)

1. The mockup: "Yes, it looks right".
2. Saving: "Keep one SAVE (Recommended)".
3. Where the names and groups live: "A: in the web page, for now (Recommended)".

## Decided (20 Nov 2026)

Phone alerts, the seven choices below: asked whether you approved them, you picked "Yes, but I want to change something", and asked what, you wrote "Alerts look good - eager to test ntfy". So they stand as they are. The first real ntfy alert to your phone waits until you're ready: "Let's do this later".

The build notes for Brett are in `proposal\BUILD-NOTES.md`.

## Phone alerts: the choices you approved (20 Nov)

Phone alerts were designed on 18 Nov while you weren't available, so these choices were mine. You approved them on 20 Nov, with no change.

1. **A group of its own**, Phone alerts, right after Timers and alerts, rather than a part inside it (see "Placement calls worth checking").
2. **Two test buttons.** TEST ALERT sends one like a hop alert's. TEST TIMER sends one like a run-out timer's: through Pushover that is the emergency kind, which the test stops after it repeats once. The other way would be one TEST button.
3. **ntfy first, Pushover second**, from your "Let's build out ntfy". Choosing Pushover shows its own steps in place of ntfy's. Whatever you typed for the other service stays, unused.
4. **The setup steps as numbered rows** in the group itself (4 for ntfy, 5 for Pushover), with buttons that open the App Store and pushover.net, rather than a separate help page.
5. **MAKE ONE and COPY for the topic.** MAKE ONE fills in a long random topic and shows it, also spelled out in groups of four, so you can type it into the phone. COPY copies it, for when the page is open on the phone. The iPhone's ntfy app can't be set up from a link or a QR code, so typing or pasting is the only way.
6. **The five switches greyed** until phone alerts are set up, with one line saying so.
7. **What SAVE refuses:** a topic with anything but letters, digits, - and _, which ntfy won't take, and a web address that doesn't start with http:// or https://. A Pushover key that isn't 30 letters and digits gets a note, but still saves.

What ntfy can't do on your iPhone, which the page says plainly:

- It makes a sound only with the ringer on and no Focus. Pushover's timer alerts can sound with the phone on silent.
- A run-out timer's alert comes again every 2 minutes, 10 more times at most, each as a new notification. Nothing on the phone stops them; answering the timer on a screen does, and the ones already there stay.
- The ntfy app has an open bug: on iOS 26.2 and later, its notifications may make no sound at all. The test will show you whether yours do.
