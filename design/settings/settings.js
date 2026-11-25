/* Settings mockup: the groups in brewing order, each setting's plain name over its key, FIND A
   SETTING, one SAVE for every change, and the answer at each row. Vanilla JS like brew-day.js. A mockup: SAVE only
   pretends, and nothing here talks to CraftBeerPi. Values are the simulator's (settings-data.js). */
"use strict";
(() => {
const CFG = window.CBPI_CONFIG, TH = window.CBPI_THINGS;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const F = String((CFG.TEMP_UNIT || {}).v || "C").toUpperCase().startsWith("F");
const DEG = F ? "°F" : "°C", tmp = (f, c) => (F ? f : c) + " " + DEG;
const phone = () => matchMedia("(max-width:700px)").matches;
const wide = () => matchMedia("(min-width:1180px)").matches;
const calm = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ---------- what the page knows about each setting: its plain name (n), what it does (h), its control, and the rest.
   A setting it doesn't know still shows: under its plugin's name in Plugins, or under "Not sorted yet" in System, by
   its key, with its own description. ---------- */
const M = {
  BREWERY_NAME: {n: "Brewery name", h: "Your brewery's name, at the top of the screen.", syn: "title header brand"},
  TEMP_UNIT: {n: "Temperature unit", h: "Every temperature CraftBeerPi shows.", order: ["F", "C"], lab: {F: "°F", C: "°C"}, keep: 1, syn: "fahrenheit celsius degrees"},
  PRESSURE_UNIT: {n: "Pressure unit", h: "Used by the fermenter widgets.", keep: 1, syn: "psi kpa fermenter"},
  MASH_TUN: {n: "Mash tun", h: "The kettle that mashes. The brew-day screen, the HLT pump and imported recipes go by it.", blank: "None chosen", syn: "kettle mlt"},
  BoilKettle: {n: "Boil kettle", h: "The kettle that boils. Imported recipes boil, whirlpool and cool in it; with more than one kettle they won't import until it's chosen.", blank: "None chosen", syn: "kettle bk"},
  ACTOR_INTERLOCK_MODE: {n: "Heating element interlock", h: "One at a time stops two heating elements running together, using the heaters your kettles name. Off if your supply can run both.", order: ["One heating element at a time", "Off"], lab: {"One heating element at a time": "One at a time"}, syn: "safety supply breaker element heater"},
  ACTOR_INTERLOCK_GROUPS: {n: "Switches never on together", dep: {on: "ACTOR_INTERLOCK_MODE"}, adv: 1, h: "Only if the interlock above can't describe your rig. Switch names, such as HLT Heater,Boil Heater; separate groups with ;. Renaming a switch breaks this without warning.", syn: "interlock actor groups"},
  BREWDAY_OVERRIDE_ACTOR: {n: "Switch with a hand override", h: "A switch the rig can run by hand whatever CraftBeerPi says. The brew-day screen then warns that it may still run after you switch it off.", blank: "None", syn: "override recirc pump"},

  AUTHOR: {n: "Recipe author", h: "Put on recipes you create or import."},
  AutoMode: {n: "Imported steps run their kettle in AUTO", h: "Steps from an imported recipe switch their kettle's AUTO on and off. You can still change each step.", syn: "automode auto mode kettle logic"},
  brewfather_user_id: {n: "Brewfather user ID", h: "With the API key, lets the Recipe book list your Brewfather recipes."},
  brewfather_api_key: {n: "Brewfather API key", secret: 1},
  brewfather_list_length: {n: "Brewfather recipes shown", ctl: "select", h: "How many the Brewfather list shows."},
  RECIPE_CREATION_PATH: {n: "Recipe creation plugin path", adv: 1, h: "Change it only for a recipe creation plugin. Normally upload."},

  HLT_PUMP_WITH_HEAT: {n: "Start the HLT pump when AUTO or the HERMS heats the HLT", h: "Until the recipe reaches its sparge, so the water doesn't settle into hot and cool layers. Heating by hand never starts it: the pump may not be primed, or its hoses may not be in place. It keeps running when the heat stops. You can still stop it; it starts again when AUTO or the HERMS next starts heating.", syn: "recirc agitator stir layers manual"},
  AddMashInStep: {n: "Add a mash-in step if the recipe has none"},
  steps_mashin: {n: "Mash-in step type", blank: "Standard: MashInStep"},
  steps_mash: {n: "Mash step type", blank: "Standard: MashStep"},
  AddMashOutStep: {n: "Add a mash out if the recipe has none", h: "10 minutes at " + tmp(168, 76) + " before the sparge.", syn: "mashout"},
  steps_mashout: {n: "Lautering stop after the mash", blank: "None", h: "NotificationStep adds a Lautering step that waits for you; nothing else adds one.", syn: "mashout mash out lauter"},
  steps_sparge: {n: "Sparge step type", blank: "Standard: SpargeStep", h: "SpargeStep heats the HLT to the sparge temperature and leaves both pumps to you; MashStep runs the sparge as a mash rest."},

  CONFIRM_BEFORE_BOIL: {n: "Ask before heating the boil kettle", h: "A mash step moves on the moment its timer ends, which could heat the boil element before the wort is in.", syn: "confirm safety element"},
  BoilAutoTimer: {n: "Start the boil timer by itself", h: "Once the temperature holds above " + tmp(203, 95) + " for 5 minutes.", syn: "auto timer"},
  steps_boil_lid_alert: {n: "Lid alert message", h: "Shown as the wort nears the boil, in a boil step with its lid alert on.", syn: "lid steam slayer mister condenser"},
  steps_boil_actor: {n: "Lid alert switch", blank: "None", h: "Switched on with the lid alert: an exhaust fan or a steam condenser.", syn: "exhaust fan steam condenser mister"},
  steps_boil: {n: "Boil step type", blank: "Standard: BoilStep"},
  steps_boil_temp: {n: "Boil temperature", unit: DEG, h: "For imported recipes that give none."},

  steps_whirlpool_temp: {n: "Whirlpool temperature", unit: DEG, h: "Cool to this before the whirlpool hops go in, when the recipe gives none (BeerXML files never do)."},
  steps_cooldown: {n: "Cooldown step type", blank: "Standard: WaitStep"},
  steps_cooldown_temp: {n: "Cooldown temperature", unit: DEG, h: "A notification when the wort gets there."},
  steps_cooldown_sensor: {n: "Cooldown probe", blank: "The kettle's own probe"},
  steps_cooldown_actor: {n: "Cooldown water switch", blank: "None", h: "Turns the cooling water on and off."},

  BREWDAY_TIMER_NAMES: {n: "Timer names to pick", h: "Separated by commas, up to 24 characters each; the first six show, in this order. You can still type any name on brew day. Blank shows none.", syn: "timers"},
  BREWDAY_ALARM_SOUND: {n: "Timer alarm sound", ctl: "sound", order: ["kitchen", "alarm", "high", "soft"], h: "What the brew-day screen plays when a timer runs out, every 3 seconds until you answer it. For a new hop alert, question or error, the screen plays just the first two beeps, once.", syn: "sound beep alarm kitchen high ping"},
  PLAY_BUZZER: {n: "Buzzer for notifications", h: "The browser beeps when a notification arrives, on every page but Brew Day and Settings. Those two play Brew Day's own two beeps instead: only for an alert, a question or an error, and only with Brew Day's SOUND on.", syn: "sound beep"},
  NOTIFY_ON_ERROR: {n: "Warnings and errors as notifications", h: "When CraftBeerPi logs a warning or an error.", syn: "log error notify"},

  CSVLOGFILES: {n: "Save readings to log files", restart: "on", h: "Each probe's readings, as CSV files.", syn: "csv logging sensor data"},
  SENSOR_LOG_MAX_BYTES: {n: "Largest log file", unit: "bytes", wide: 1, dep: {on: "CSVLOGFILES", is: "Yes"}, restart: "next", h: "Then it starts a new one.", calc: "size"},
  SENSOR_LOG_BACKUP_COUNT: {n: "Old log files kept", unit: "per probe", dep: {on: "CSVLOGFILES", is: "Yes"}, restart: "next", calc: "span"},
  PID_LOGGING: {n: "Log element power and target too", h: "Beside the temperatures, so a PID can be judged after the brew. It writes more.", syn: "pid duty setpoint"},
  INFLUXDB: {n: "Send readings to InfluxDB", restart: "on", h: "Each probe's readings, written to an InfluxDB database as well.", syn: "influx grafana database"},
  INFLUXDBCLOUD: {n: "InfluxDB Cloud", dep: {on: "INFLUXDB", is: "Yes"}, h: "Yes if the database is on InfluxDB Cloud. The boxes below then ask for its bucket, organisation and token."},
  INFLUXDBADDR: {n: "Address", dep: {on: "INFLUXDB", is: "Yes"}, h: "With http:// and the port, such as http://localhost:8086.", syn: "influxdb url"},
  INFLUXDBNAME: {n: "Database", cloud: "Bucket", dep: {on: "INFLUXDB", is: "Yes"}, h: "The database the readings go into.", hc: "The bucket the readings go into.", syn: "influxdb bucket"},
  INFLUXDBUSER: {n: "User", cloud: "Organisation", dep: {on: "INFLUXDB", is: "Yes"}, h: "Only if the database needs one.", hc: "Your organisation's name on InfluxDB Cloud.", syn: "influxdb organisation organization"},
  INFLUXDBPWD: {n: "Password", cloud: "Token", secret: 1, dep: {on: "INFLUXDB", is: "Yes"}, h: "Only if the database needs one.", hc: "The token from your InfluxDB Cloud account.", syn: "influxdb token"},
  INFLUXDBMEASUREMENT: {n: "Measurement", dep: {on: "INFLUXDB", is: "Yes"}, h: "The name the readings are filed under. Blank means “measurement”.", syn: "influxdb"},
  MQTTUpdate: {n: "MQTT resend interval", ctl: "select", restart: "any", order: ["30", "60", "120", "300", "0"], lab: {"30": "Every 30 s", "60": "Every 60 s", "120": "Every 2 min", "300": "Every 5 min", "0": "Never"}, h: "Sends kettle and fermenter state over MQTT this often, even when nothing changed."},

  BREWSTART_LANGUAGE: {n: "Language", restart: "any", keep: 1, h: "BrewStart's settings and messages. Its step form changes after a restart."},
  BREWSTART_EFFICIENCY: {n: "BrewStart efficiency", unit: "%", min: 10, max: 100, blank: "empty", empty: "Empty: BrewStart uses 90 %", h: "The share of the HLT element's power that heats the water, in %. Blank: the built-in 90 %. USE on Figures sets it from past brews.", syn: "figures hlt heating heat-up ready by"},
  SIM_TIME_SCALE: {n: "Simulation speed", unit: "× real time", h: "Simulated seconds per real second. 1 is real time; 60 rehearses an hour-long ramp in a minute. Every simulated vessel at once."},

  MIN_MEMORY: {n: "Warn when free memory falls below", unit: "MB", h: "CraftBeerPi needs about this much to run properly."},
  max_dashboard_number: {n: "Free-form dashboards", ctl: "select", h: "How many the Dashboard page offers."},
  slow_pipe_animation: {n: "Slow the dashboard's pipe animation", h: "At full speed it can take nearly all of the Pi's CPU."},

  /* phone alerts (the cbpi4-PushOver plugin). svc: shown only while that service is chosen; means: a line under the
     control saying what the chosen value means; hs: what it does, through each service; on: used once phone alerts are
     set up; topic, link, len: checks on what is typed; blank and other: what a status line calls an empty or a hidden
     value */
  phone_alerts_service: {n: "Send them through", order: ["ntfy", "Pushover"], keep: 1, h: "Where CraftBeerPi sends its phone alerts. Either way they leave from the Pi, over the internet: if the Pi or its internet stops, so do they, and the screens show No connection.", means: {ntfy: "Free, with no account. On an iPhone its alerts make a sound only with the ringer on and no Focus.", Pushover: "$4.99 once, after a 30-day trial. Its timer alerts repeat until you acknowledge them on the phone, and can sound with it on silent."}, syn: "phone iphone push notification notifications ntfy pushover service app"},
  ntfy_topic: {n: "Topic", svc: "ntfy", secret: 1, topic: 1, blank: "no topic", other: "another topic", unset: "No topic: phone alerts are off", h: "The ntfy app on your phone shows the alerts sent to this topic, so it must be the same here and in the app. On ntfy.sh the topic is the password: anyone who knows it can read your alerts. Keep it long, random and to yourself.", syn: "ntfy channel subscribe password secret"},
  ntfy_link: {n: "Tapping an alert opens", svc: "ntfy", link: 1, blank: "the ntfy app", h: "A web page your phone opens when you tap an alert, such as the brew-day screen on your home network. Blank opens the ntfy app.", syn: "click link url address web page brew day"},
  ntfy_token: {n: "Access token", svc: "ntfy", secret: 1, adv: 1, blank: "none", other: "another token", unset: "None: ntfy.sh needs none", h: "Only for a topic reserved with a paid ntfy.sh account: a token starting tk_. Otherwise leave it blank.", syn: "tk_ bearer reserved account"},
  ntfy_server: {n: "ntfy server", svc: "ntfy", adv: 1, server: "https://ntfy.sh", h: "Leave it at https://ntfy.sh. An iPhone gets its ntfy alerts through ntfy.sh, even from a server of your own.", syn: "url upstream self-hosted host"},
  pushover_user: {n: "User key", svc: "Pushover", secret: 1, len: 30, other: "another key", h: "On your dashboard at pushover.net once you've logged in, and in the Pushover app's settings: 30 letters and digits.", syn: "pushover user key account"},
  pushover_token: {n: "API token", svc: "Pushover", secret: 1, len: 30, other: "another token", h: "Create an application for CraftBeerPi at pushover.net/apps/build, then copy its API Token/Key: 30 letters and digits.", go: [["pushover.net", "your applications", "https://pushover.net/apps/build"]], syn: "pushover api token application key"},
  phone_alerts_timers: {n: "Run-out timers", on: 1, hs: {ntfy: "An urgent alert, sent again every 2 minutes, 10 more times at most, until you answer the timer on a screen. Each one stays on the phone after you answer.", Pushover: "An emergency alert, repeated every minute until you acknowledge it on the phone, for up to 50 minutes. Answering the timer on a screen stops it too."}, syn: "timer alarm run out emergency urgent repeat"},
  phone_alerts_additions: {n: "Boil additions", on: 1, h: "The boil's hop and first-wort reminders: one alert each.", syn: "hop hops addition reminder first wort"},
  phone_alerts_questions: {n: "Questions", on: 1, h: "When CraftBeerPi asks something and waits for your answer on a screen: one alert each.", syn: "question prompt asks"},
  phone_alerts_errors: {n: "Errors", on: 1, h: "Such as a step that failed, or an element left on by hand past its target: one alert each.", syn: "error fault failed"},
  phone_alerts_warnings: {n: "Warnings", on: 1, h: "The warnings the brew-day screen beeps for: one alert each.", syn: "warning caution"}
};
/* the groups, in brewing order; a see-also line names a setting that lives in another group but matters here */
const G = [
  {id: "brewhouse", name: "Brewhouse", sum: "Its name and units, which kettle is which, and what may run together",
    parts: [{rows: ["BREWERY_NAME", "TEMP_UNIT", "PRESSURE_UNIT", "MASH_TUN", "BoilKettle", "ACTOR_INTERLOCK_MODE", "ACTOR_INTERLOCK_GROUPS", "BREWDAY_OVERRIDE_ACTOR"]}]},
  {id: "recipes", name: "Recipes", sum: "Bringing recipes in, from Brewfather or a file",
    parts: [{rows: ["AUTHOR", "AutoMode", "brewfather_user_id", "brewfather_api_key", "brewfather_list_length", "RECIPE_CREATION_PATH"]}]},
  {id: "mash", name: "Mash and sparge", sum: "Mash in, the mash, mash out and the sparge", see: "MASH_TUN",
    parts: [{h: "While you brew", rows: ["HLT_PUMP_WITH_HEAT"]}, {h: "In imported recipes", rows: ["AddMashInStep", "steps_mashin", "steps_mash", "AddMashOutStep", "steps_mashout", "steps_sparge"]}]},
  {id: "boil", name: "Boil", sum: "Heating to the boil, the boil timer and the lid alert", see: "BoilKettle",
    parts: [{h: "While you brew", rows: ["CONFIRM_BEFORE_BOIL", "BoilAutoTimer", "steps_boil_lid_alert", "steps_boil_actor"]}, {h: "In imported recipes", rows: ["steps_boil", "steps_boil_temp"]}]},
  {id: "cool", name: "Whirlpool and cooling", sum: "The whirlpool hops and cooling the wort",
    parts: [{h: "In imported recipes", rows: ["steps_whirlpool_temp", "steps_cooldown", "steps_cooldown_temp", "steps_cooldown_sensor", "steps_cooldown_actor"]}]},
  {id: "timers", name: "Timers and alerts", sum: "What you see and hear while you brew",
    parts: [{rows: ["BREWDAY_TIMER_NAMES", "BREWDAY_ALARM_SOUND", "PLAY_BUZZER", "NOTIFY_ON_ERROR"]}]},
  /* only where the phone alerts plugin is installed (needs). Its index line and header say whether alerts are on
     (state). how: the setup steps that aren't settings, each a row of its own: go, links to open in a new tab; test,
     the test's buttons. A part with steps numbers its rows, the chosen service's only; off: what a part's note says
     while phone alerts aren't set up; foot: a closing line under a part */
  {id: "phone", name: "Phone alerts", needs: "phone_alerts_service", state: true,
    sum: "A buzz on your phone when the brew-day screen beeps, for when you're across the room. The screens stay the alarm.",
    how: {
      how_ntfy_app: {svc: "ntfy", n: "Get the ntfy app", h: "Free, from the App Store, on your iPhone. When it asks, allow its notifications.", go: [["App Store", "the ntfy app", "https://apps.apple.com/us/app/ntfy/id1625396347"]], syn: "install download iphone"},
      how_ntfy_subscribe: {svc: "ntfy", n: "Subscribe to the topic", h: "In the ntfy app, tap +, enter the topic exactly as it is above, and tap Subscribe; leave Use another server off. With this page open on the phone, COPY the topic and paste it in.", syn: "subscribe app"},
      how_pushover_account: {svc: "Pushover", n: "A Pushover account and app", h: "Sign up at pushover.net, or in the Pushover app on your iPhone, and allow its notifications. Free for 30 days from adding the phone, then $4.99 once, in the app.", go: [["pushover.net", "sign up", "https://pushover.net/signup"], ["App Store", "the Pushover app", "https://apps.apple.com/us/app/pushover-notifications/id506088175"]], syn: "account sign up install trial price"},
      how_pushover_critical: {svc: "Pushover", n: "Critical Alerts, for timers", h: "So a run-out timer sounds with the phone on silent: in the Pushover app's settings, turn on Critical Alerts for emergency priority. iOS asks once to allow them.", syn: "critical silent mute focus emergency"},
      how_test: {n: "Send a test", test: 1, h: "It goes through what CraftBeerPi has saved, whatever the switches under What reaches your phone say, and should be on your phone in a few seconds.", syn: "test try check send"}
    },
    parts: [{rows: ["phone_alerts_service"]},
      {h: "Turning it on", steps: 1, rows: ["how_ntfy_app", "ntfy_topic", "how_ntfy_subscribe", "how_pushover_account", "pushover_user", "pushover_token", "how_pushover_critical", "how_test"]},
      {h: "Optional", pl: "most brewers leave these", rows: ["ntfy_link", "ntfy_token", "ntfy_server"]},
      {h: "What reaches your phone", pl: "each one beeps on the brew-day screen too", off: "used once phone alerts are set up", rows: ["phone_alerts_timers", "phone_alerts_additions", "phone_alerts_questions", "phone_alerts_errors", "phone_alerts_warnings"],
        foot: "Not sent: the alarms the brew-day screen raises by itself, such as No connection, a command that didn't go through, or ALL OFF not finishing."}]},
  {id: "logs", name: "Logs and data", sum: "What CraftBeerPi keeps and sends",
    parts: [{h: "Log files", rows: ["CSVLOGFILES", "SENSOR_LOG_MAX_BYTES", "SENSOR_LOG_BACKUP_COUNT", "PID_LOGGING"]}, {h: "InfluxDB", rows: ["INFLUXDB", "INFLUXDBCLOUD", "INFLUXDBADDR", "INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD", "INFLUXDBMEASUREMENT"]}, {h: "MQTT", rows: ["MQTTUpdate"]}]},
  {id: "plugins", name: "Plugins", sum: "Each plugin's settings, under its name", plugins: true},
  {id: "system", name: "System and dashboards", sum: "The software itself",
    parts: [{rows: ["MIN_MEMORY", "max_dashboard_number", "slow_pipe_animation"]}]}
];
const PLUGIN = {cbpi4_BrewStart: ["BrewStart", ""], simvessel: ["SimVessel", "on the simulator only"]};
const PLUGIN_ORDER = ["BREWSTART_LANGUAGE", "BREWSTART_EFFICIENCY", "SIM_TIME_SCALE"];
/* words that belong to settings kept elsewhere, for FIND when nothing here matches */
const ELSEWHERE = /\b(pid|hysteresis|kp|ki|kd|gain|gains|logic|boil ?power|threshold|offset|calibrat\w*|gpio|pin)\b/i;
const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M6.5 12.5l3.5 3.5 7-8" fill="none" stroke="#0a1016" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* a link that opens in a browser tab of its own says so before the press, as the BREWSCRIBE tab does */
const EXT = '<svg class="ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M5 1.8H2.4a.6.6 0 0 0-.6.6v7.2c0 .3.3.6.6.6h7.2c.3 0 .6-.3.6-.6V7M7.2 1.8h3v3M10.2 1.8 5.6 6.4"/></svg>';

/* ---------- phone alerts: the setup steps that aren't settings (a group's how), the service chosen, and whether alerts
   are on, by what CraftBeerPi has saved ---------- */
const HOWS = Object.assign({}, ...G.map(g => g.how || {}));
const isHow = k => k in HOWS;
const KNOWN = new Set(G.flatMap(g => (g.parts || []).flatMap(p => p.rows)));
/* a group that needs a setting shows only where that setting exists (gs). Where it doesn't, the settings the group lists
   that do exist (the original cbpi4-PushOver has pushover_user and pushover_token) show as any setting the page
   doesn't know does: by key, with CraftBeerPi's own description, under their plugin's name */
const NEEDS = G.filter(g => g.needs).map(g => [g.needs, new Set((g.parts || []).flatMap(p => p.rows))]);
const away = k => NEEDS.some(([n, rows]) => rows.has(k) && !(n in all()));
const known = k => KNOWN.has(k) && !away(k);
const STEPS = new Set(G.flatMap(g => (g.parts || []).filter(p => p.steps).flatMap(p => p.rows)));
const PHONE = new Set(G.filter(g => g.id === "phone").flatMap(g => g.parts.flatMap(p => p.rows)).filter(k => !isHow(k)));
const SVC = "phone_alerts_service";
/* the settings a test goes by: a saved change to one makes its last answer out of date */
const TESTED = [SVC, "ntfy_topic", "ntfy_token", "ntfy_server", "pushover_user", "pushover_token"];
const svcOf = v => String(v == null ? "" : v).trim().toLowerCase() === "pushover" ? "Pushover" : "ntfy";
const svcNow = () => svcOf(val(SVC));
const TOPIC_OK = /^[-_A-Za-z0-9]{1,64}$/, WEB = /^https?:\/\/\S+$/;
const hostOf = u => { try { return new URL(u).host; } catch (e) { return String(u); } };
const ntfyHost = () => hostOf(String(st.saved.ntfy_server || "").trim() || M.ntfy_server.server);
/* the setting a test's refusal names, by service */
const FIELD = {ntfy: {topic: "ntfy_topic", token: "ntfy_token"}, Pushover: {user: "pushover_user", token: "pushover_token"}};
function phoneState() {
  const s = st.saved, svc = svcOf(s[SVC]);
  if (svc === "ntfy") {
    const t = String(s.ntfy_topic == null ? "" : s.ntfy_topic).trim();
    if (!t) return {on: false, svc, text: "Off · no topic yet"};
    if (!TOPIC_OK.test(t)) return {on: false, svc, text: "Off · the topic can't be used", fix: "The topic can hold only letters, digits, - and _: MAKE ONE, and SAVE first."};
    const sv = String(s.ntfy_server == null ? "" : s.ntfy_server).trim().replace(/\/+$/, "");
    if (sv && !WEB.test(sv)) return {on: false, svc, text: "Off · the server address can't be used", fix: "The ntfy server isn't a web address: set it back to https://ntfy.sh, under Optional, and SAVE first."};
    return {on: true, svc, text: "On · through " + ntfyHost()};
  }
  const miss = [["pushover_user", "the user key"], ["pushover_token", "the API token"]].filter(([k]) => blankish(s[k])).map(x => x[1]);
  return miss.length ? {on: false, svc, text: "Off · needs " + miss.join(" and ")} : {on: true, svc, text: "On · through Pushover"};
}
/* the same, by what is on the page now, saved or not: what the switches under What reaches your phone go by */
function phoneReady() {
  if (svcNow() === "Pushover") return !blankish(val("pushover_user")) && !blankish(val("pushover_token"));
  const t = String(val("ntfy_topic") == null ? "" : val("ntfy_topic")).trim(), sv = String(val("ntfy_server") == null ? "" : val("ntfy_server")).trim().replace(/\/+$/, "");
  return TOPIC_OK.test(t) && (!sv || WEB.test(sv));
}
/* the frame reads the address as the brew-day mockup does: ?name=… stands for the BREWERY_NAME setting (so its row here
   says the same), ?brewscribe=none for a CraftBeerPi without BrewScribe */
const QS = new URLSearchParams(location.search);
const LONG_NAME = 24;
const QNAME = (QS.has("name") ? QS.get("name") : "CraftBeerPi Brewery").trim() || "CraftBeerPi";
const PAUSED = "No connection. Controls are paused.";

/* ---------- state ---------- */
let st;
function fresh() {
  st = {saved: {}, draft: {}, row: {}, q: "", cur: null, shown: {}, view: "index", pg: null, leave: null,
    link: "ok", saving: false, later: [], failKey: null, extra: {}, test: null, fault: null, testWill: "sent",
    events: [["14:31:52", "Mash Tun at target, 149.0 °F", "confirmed", "ok"]]};
  for (const k in CFG) st.saved[k] = CFG[k].v;
  if (QS.has("name")) st.saved.BREWERY_NAME = QS.get("name");
}
const all = () => Object.assign({}, CFG, st.extra);
const meta = k => (!away(k) && M[k]) || HOWS[k] || {};
const src = k => (all()[k] || {}).s || "craftbeerpi";
const typ = k => (all()[k] || {}).t || "string";
const val = k => (k in st.draft ? st.draft[k] : st.saved[k]);
const blankish = v => v == null || String(v).trim() === "";
const textish = k => ["string", "number"].includes(typ(k));
const same = (k, a, b) => textish(k) ? String(a == null ? "" : a).trim() === String(b == null ? "" : b).trim() : String(a == null ? "" : a) === String(b == null ? "" : b);
const isChanged = k => k in st.draft && !same(k, st.draft[k], st.saved[k]);
const ctlOf = k => {
  const m = meta(k), t = typ(k), o = (all()[k] || {}).o || [];
  if (m.ctl) return m.ctl;
  if (m.secret) return "secret";
  if (["kettle", "actor", "sensor", "step", "fermenter"].includes(t)) return "select";
  if (t === "number") return "num";
  if (t === "select") return o.length <= 4 ? "seg" : "select";
  return "text";
};
/* what is wrong with a change, so SAVE waits for it: a number that isn't one, a topic ntfy won't take, an address that
   isn't one */
const invalid = k => {
  if (!isChanged(k)) return "";
  const m = meta(k), v = String(st.draft[k] == null ? "" : st.draft[k]).trim();
  if (ctlOf(k) === "num") return v === "" || !isFinite(Number(v)) ? `Type a number, like ${esc(st.saved[k])}.` : "";
  if (m.topic && v && !TOPIC_OK.test(v)) return v.length > 64 ? "A topic can be 64 characters at most." : "A topic can hold only letters, digits, - and _.";
  if ((m.link || m.server) && v && !WEB.test(v)) return "A web address starts with http:// or https://.";
  return "";
};
/* what is worth knowing about a value that still saves: a topic easy to guess, a Pushover key of the wrong length, an
   address the phone can't reach, a server that may not reach an iPhone */
function warnOf(k) {
  const m = meta(k), v = String(val(k) == null ? "" : val(k)).trim();
  if (!v || invalid(k)) return "";
  /* a value saved some other way, which the plugin can't use */
  if (m.topic && !TOPIC_OK.test(v)) return "Phone alerts can't use this topic: it can hold only letters, digits, - and _, 64 at most. MAKE ONE for one that works.";
  if (m.server && !WEB.test(v.replace(/\/+$/, ""))) return "Phone alerts can't go: this isn't a web address. Set it back to https://ntfy.sh.";
  if (m.link && !WEB.test(v)) return "Not a web address, so tapping an alert opens the ntfy app.";
  if (m.topic && v.length < 16) return "Short topics are easy to guess: MAKE ONE gives a long, random one.";
  if (m.len && !new RegExp(`^[A-Za-z0-9]{${m.len}}$`).test(v)) return `A Pushover key is ${m.len} letters and digits; this ${/[^A-Za-z0-9]/.test(v) ? "has other characters too" : "has " + v.length}.`;
  if (m.link && /^https?:\/\/(localhost|127\.|\[::1\])/i.test(v)) return "Your phone can't open this address: it is the computer this page is open on. Use the Pi's address on your home network.";
  if (m.server && v.replace(/\/+$/, "") !== m.server) return "An iPhone gets alerts from a server of your own late, or not at all, unless it passes them on to ntfy.sh (its upstream-base-url).";
  return "";
}
const nameOf = k => {
  const m = meta(k);
  return m.cloud && val("INFLUXDBCLOUD") === "Yes" ? m.cloud : (m.n || k);
};
const helpOf = k => { const m = meta(k); if (!m.n) return (all()[k] || {}).d || ""; if (m.hs) return m.hs[svcNow()] || ""; return (m.hc && val("INFLUXDBCLOUD") === "Yes" ? m.hc : m.h) || ""; };
function opts(k) {
  const m = meta(k), c = all()[k] || {}, t = c.t;
  if (["kettle", "actor", "sensor"].includes(t)) return [["", m.blank || "None"], ...TH[t].map(x => [x[0], x[1]])];
  if (t === "step") return [["", m.blank || "None"], ...TH.step.map(s => [s, s])];
  let o = (c.o || []).map(x => [String(x.value), String(x.label)]);
  if (m.order) o.sort((a, b) => m.order.indexOf(a[0]) - m.order.indexOf(b[0]));
  if (m.lab) o = o.map(([v, l]) => [v, m.lab[v] || l]);
  return o;
}
const shown = (k, v) => {
  if (ctlOf(k) === "secret") return blankish(v) ? meta(k).blank || "not set" : meta(k).other || "another key";
  if (blankish(v)) return (["kettle", "actor", "sensor", "step"].includes(typ(k)) ? meta(k).blank || "None" : meta(k).blank || "blank");
  const o = opts(k).find(x => x[0] === String(v));
  if (o) return o[1];
  const s = String(v);
  return ctlOf(k) === "num" ? s + (meta(k).unit ? " " + meta(k).unit : "") : `"${s.length > 40 ? s.slice(0, 38) + "…" : s}"`;
};
const mb = b => b >= 1e6 ? (b / 1e6).toFixed(1).replace(/\.0$/, "") + " MB" : Math.round(b / 1e3) + " KB";
function calc(k) {
  const max = Number(val("SENSOR_LOG_MAX_BYTES")), n = Number(val("SENSOR_LOG_BACKUP_COUNT"));
  if (meta(k).calc === "size") return max > 0 ? `That is ${mb(max)}.` : "";
  if (!(max > 0) || !(n >= 0)) return "";
  // a probe logs about one row a second at roughly 32 bytes a row (SensorLogTarget_CSV's own sizing note)
  const total = max * (Math.floor(n) + 1), hours = total / 32 / 3600;
  return `Each probe keeps up to ${mb(total)}, about ${hours >= 48 ? Math.round(hours / 24) + " days" : Math.round(hours) + " hours"} of readings.`;
}

/* ---------- which settings go where ---------- */
const hidden = k => src(k) === "hidden";
function partsOf(g) {
  if (g.plugins) {
    const by = {};
    Object.keys(all()).filter(k => !hidden(k) && !["craftbeerpi", "steps"].includes(src(k)) && !known(k)).forEach(k => (by[src(k)] = by[src(k)] || []).push(k));
    return Object.keys(by).sort((a, b) => (PLUGIN[a] ? 0 : 1) - (PLUGIN[b] ? 0 : 1) || a.localeCompare(b)).map(s => ({
      h: PLUGIN[s] ? PLUGIN[s][0] : s, pl: PLUGIN[s] ? PLUGIN[s][1] : "named by their keys",
      rows: by[s].sort((a, b) => (PLUGIN_ORDER.indexOf(a) + 1 || 99) - (PLUGIN_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))}));
  }
  if (g.id === "system") {
    const loose = Object.keys(all()).filter(k => !hidden(k) && ["craftbeerpi", "steps"].includes(src(k)) && !known(k)).sort();
    return loose.length ? [...g.parts, {h: "Not sorted yet", pl: "new to this page, by their keys", rows: loose}] : g.parts;
  }
  return g.parts;
}
/* the groups this CraftBeerPi has: one that needs a plugin's setting shows only where that plugin is installed */
const gs = () => G.filter(g => !g.needs || g.needs in all());
const keysOf = g => partsOf(g).flatMap(p => p.rows).filter(k => k in all());
const groupOf = k => gs().find(g => keysOf(g).includes(k));
const dirty = () => Object.keys(st.draft).filter(isChanged);
const invalids = () => Object.keys(st.draft).filter(invalid);
const failed = () => Object.keys(st.row).filter(k => st.row[k].s === "bad");

/* ---------- FIND: every word must appear in the name, key, what it does, its group or a few likely words ---------- */
const norm = s => String(s || "").toLowerCase();
const words = () => norm(st.q).split(/\s+/).filter(Boolean);
const hay = k => { if (isHow(k)) { const m = meta(k); return norm([m.n, m.h, m.syn, "phone alerts"].join(" ")); } const m = meta(k), g = groupOf(k), s = src(k), plug = ["craftbeerpi", "steps"].includes(s) ? "" : (PLUGIN[s] ? PLUGIN[s][0] : s); return norm([nameOf(k), m.n, m.cloud, k, k.replace(/_/g, " "), helpOf(k), m.syn, g && g.name, plug].join(" ")); };
const hit = k => { const w = words(); return !w.length || w.every(x => hay(k).includes(x)); };
function marked(text) {
  let s = esc(text);
  const w = words().filter(x => x.length > 1).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return w.length ? s.replace(new RegExp(`(${w.join("|")})`, "gi"), "<mark>$1</mark>") : s;
}

/* ---------- rendering ---------- */
function ctlHTML(k) {
  const v = val(k), m = meta(k), c = ctlOf(k), id = "f-" + k, hd = `aria-describedby="w-${k} s-${k}"`;
  if (c === "seg" || c === "sound") {
    const seg = `<div class="seg${m.keep || c === "sound" ? " keep" : ""}${c === "sound" ? " four" : ""}" role="radiogroup" aria-labelledby="n-${k}" ${hd}>${opts(k).map(([o, l], i, a) => { const on = String(v) === o, first = i === 0 && !a.some(x => x[0] === String(v)); return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on || first ? 0 : -1}" data-set="${esc(o)}">${esc(l)}</button>`; }).join("")}</div>`;
    if (c === "sound") return `<div class="try">${seg}<button type="button" class="cmd" data-try="${k}">Try<small>plays it here</small></button></div>`;
    return seg + (m.means ? `<p class="fx" id="x-${k}">${esc(m.means[String(v)] || "")}</p>` : "");
  }
  if (c === "select") return `<select class="fld" id="${id}" ${hd}>${opts(k).map(([o, l]) => `<option value="${esc(o)}"${String(v == null ? "" : v) === o ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  if (c === "num") return `<div class="numf"><input id="${id}" class="${m.wide ? "wide" : ""}" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(v)}" ${hd}>${m.unit ? `<span aria-hidden="true">${esc(m.unit)}</span>` : ""}</div>${m.calc ? `<p class="fx" id="x-${k}">${calc(k)}</p>` : ""}`;
  if (c === "secret") {
    const set = !blankish(v), open = st.shown[k] || !set;
    let h = `<div class="sec"><input class="fld" id="${id}" type="${open ? "text" : "password"}" autocomplete="off" spellcheck="false" value="${esc(set ? v : "")}" ${hd}><button type="button" class="cmd" data-show="${k}" aria-pressed="${!!st.shown[k]}"${set ? "" : ' aria-disabled="true"'}>${st.shown[k] ? "Hide" : "Show"}<small>${st.shown[k] ? "dots again" : set ? (m.topic ? "the topic" : /token/i.test(k) ? "the token" : "the key") : "nothing set"}</small></button></div>`;
    if (m.topic) h += `<div class="tools"><button type="button" class="cmd" data-make="${k}">Make one<small>${set ? "a new one, in its place" : "a random one"}</small></button><button type="button" class="cmd" data-copy="${k}"${set ? "" : ' aria-disabled="true"'}>Copy<small>${set ? "to paste in the app" : "nothing to copy"}</small></button></div><p class="spell" id="x-${k}" aria-hidden="true"${st.shown[k] && set ? "" : " hidden"}>${spell(v)}</p>`;
    return h + (m.go ? `<div class="gos">${goHTML(m.go)}</div>` : "");
  }
  const here = m.link ? `<div class="tools"><button type="button" class="cmd" data-here="${k}">This CraftBeerPi<small>its address here</small></button></div>` : "";
  return `<textarea class="fld" id="${id}" rows="1" spellcheck="false" ${hd}>${esc(blankish(v) ? "" : v)}</textarea>${here}${m.go ? `<div class="gos">${goHTML(m.go)}</div>` : ""}`;
}
/* a setup step's number sits on a dark band at the left of its row, as a recipe step's does */
const SN = '<span class="sn"><span class="sr">Step </span><b></b></span>';
const goHTML = go => (go || []).map(([t, s, u]) => `<a class="cmd out" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><span class="lbl">${esc(t)}${EXT}</span><small>${esc(s)}</small><span class="sr"> (opens in a new tab)</span></a>`).join("");
/* a topic spelled out in fours, to type it into a phone: the field has the same, so screen readers skip this */
const spell = v => { const s = String(v == null ? "" : v).trim(), m = s.match(/^(cbpi-)(.*)$/), rest = m ? m[2] : s; return `<span class="lab">To type it</span>${m ? `<span class="g">${esc(m[1])}</span>` : ""}${(rest.match(/.{1,4}/g) || []).map(x => `<span class="g">${esc(x)}</span>`).join("")}`; };
function rowHTML(k) {
  if (isHow(k)) return howHTML(k);
  const m = meta(k), c = ctlOf(k), labelled = c === "seg" || c === "sound", step = STEPS.has(k) && !away(k);
  const tags = [m.adv && "Advanced", m.restart === "on" ? "On after a restart" : m.restart && "After a restart"].filter(Boolean);
  const nm = labelled ? `<p class="nm" id="n-${k}" data-t>${marked(nameOf(k))}</p>` : `<label class="nm" id="n-${k}" for="f-${k}" data-t>${marked(nameOf(k))}</label>`;
  return `<div class="row${m.dep ? " dep" : ""}${step ? " step" : ""}" id="r-${k}" data-k="${k}">${step ? SN : ""}
<div class="lb">${nm}${helpOf(k) ? `<p class="wh" id="w-${k}">${marked(helpOf(k))}</p>` : `<span id="w-${k}" hidden></span>`}<p class="why" id="y-${k}" hidden></p><p class="ky"><span>${marked(k)}</span>${tags.map(x => `<span class="tg">${x}</span>`).join("")}</p></div>
<div class="ct">${ctlHTML(k)}<div class="st" id="s-${k}"></div></div></div>`;
}
/* a setup step that isn't a setting: what to do, and a link to where it's done, or the test */
function howHTML(k) {
  const m = meta(k), st0 = `<div class="st" id="s-${k}"></div>`;
  const ct = m.test ? `${testHTML()}${st0}<p class="tfx" id="t-${k}" hidden></p>` : (m.go ? `<div class="gos">${goHTML(m.go)}</div>` : "") + st0;
  return `<div class="row how step" id="r-${k}" data-k="${k}">${SN}
<div class="lb"><p class="nm" id="n-${k}" data-t>${marked(nameOf(k))}</p><p class="wh" id="w-${k}">${marked(helpOf(k))}</p><p class="why" id="y-${k}" hidden></p></div>
<div class="ct">${ct}</div></div>`;
}
function seeHTML(k) {
  const g = groupOf(k);
  return `<p class="see"><span>${esc(nameOf(k))}: <b>${esc(shown(k, val(k)))}</b>, chosen in ${esc(g.name)}.</span><a href="#r-${k}" data-goto="${k}">Change it in ${esc(g.name)}</a></p>`;
}
function plateHTML(g, i) {
  return `<section class="plate" id="g-${g.id}" data-g="${g.id}" aria-labelledby="h-${g.id}">
<header class="phd"><a class="up" href="#groups" data-back>‹ All groups</a><h2 id="h-${g.id}"><span class="n">${i + 1}</span>${esc(g.name)}</h2>${g.state ? `<p class="pst" id="pst-${g.id}"></p>` : ""}<p class="sum">${esc(g.sum)}</p></header>
${g.see ? seeHTML(g.see) : ""}${partsOf(g).map((p, j) => `<div class="part"${p.steps ? " data-steps" : ""}${p.off ? ` data-pl="${esc(p.pl)}" data-off="${esc(p.off)}"` : ""}${p.h ? ` role="group" aria-labelledby="p-${g.id}-${j}"` : ""}>${p.h ? `<h3 id="p-${g.id}-${j}">${esc(p.h)}${p.pl ? `<span class="pl">${esc(p.pl)}</span>` : ""}</h3>` : ""}${p.rows.filter(k => k in all() || isHow(k)).map(rowHTML).join("")}${p.foot ? `<p class="foot">${esc(p.foot)}</p>` : ""}</div>`).join("")}
</section>`;
}
function giHTML(g, i) {
  const ks = keysOf(g), ch = ks.filter(isChanged).length, fl = ks.filter(k => st.row[k] && st.row[k].s === "bad").length;
  const n = words().length ? [...ks, ...Object.keys(g.how || {})].filter(hit).length : null;
  const s = n !== null ? (n ? `${n} found` : "none") : fl ? `<span class="fl">${fl} DIDN'T SAVE</span>` : ch ? `<span class="chg">${ch} CHANGED</span>` : String(ks.length);
  const d = g.state ? phoneState().text : g.plugins ? partsOf(g).map(p => p.h).join(" · ") : ks.slice(0, 4).map(nameOf).join(" · ");
  return `<li><a class="gi${n === 0 ? " none" : ""}" href="#g-${g.id}" data-g="${g.id}" aria-current="${st.cur === g.id}"><span class="n">${i + 1}</span><span class="t">${esc(g.name)}</span><span class="d">${esc(d)}</span><span class="s">${s}</span></a></li>`;
}
function metaHTML() {
  const n = Object.keys(all()).filter(k => !hidden(k)).length, d = dirty().length, f = failed().length;
  if (st.link === "lost") return `<span class="bad">No connection</span> · ${d ? `<b>${d} not saved</b>` : `${n} settings`}`;
  if (st.saving) return `<b>Saving ${d}…</b>`;
  if (f) return `<span class="bad">${f} didn't save</span>${d - f > 0 ? ` · <b>${d - f} not saved</b>` : ""}`;
  if (d) return `<b>${d} ${d === 1 ? "change" : "changes"} not saved</b>`;
  return `${n} settings in ${gs().length} groups · all saved`;
}
function idxHTML() {
  return `<h1>Settings</h1><p class="meta" id="meta">${metaHTML()}</p><ol class="groups" id="groups" aria-label="Groups, in brewing order">${gs().map(giHTML).join("")}</ol>`;
}
function btnsHTML() {
  const d = dirty().length, bad = invalids().length, lost = st.link === "lost";
  const undo = `<button type="button" class="cmd" data-undoall${d && !st.saving ? "" : ' aria-disabled="true"'}>Undo<small>${d ? `put back ${d === 1 ? "the change" : "all " + d}` : "nothing to undo"}</small></button>`;
  const why = lost ? "no connection" : bad ? `fix ${bad === 1 ? "the entry" : bad + " entries"} first` : d ? `${d} ${d === 1 ? "change" : "changes"}` : "nothing changed";
  const off = !st.saving && (!d || bad || lost);
  const save = `<button type="button" class="cmd go${st.saving ? " busy" : ""}" data-save${off ? ' aria-disabled="true"' : ""}>${st.saving ? "Saving…" : "Save"}<small>${st.saving ? "waiting for CraftBeerPi" : why}</small></button>`;
  return undo + save;
}
function toolHTML() {
  return `<div class="find" role="search"><label for="q">Find a setting</label><input id="q" type="search" autocomplete="off" spellcheck="false" value="${esc(st.q)}"><button type="button" class="clr" data-clear aria-label="Clear the search"${st.q ? "" : " hidden"}>×</button></div><span class="sp"></span><span class="btns" id="btns">${btnsHTML()}</span>`;
}
function noteHTML() {
  const d = dirty();
  if (st.leave) return ["note", `<p><b>Leave Settings with ${d.length} ${d.length === 1 ? "change" : "changes"} not saved?</b> ${esc(d.map(nameOf).join(", "))}.</p><div class="acts"><button type="button" class="cmd ans" data-leave="save">Save and go<small>then ${esc(st.leave)}</small></button><button type="button" class="cmd" data-leave="drop">Go without saving<small>drops ${d.length === 1 ? "it" : "them"}</small></button><button type="button" class="cmd" data-leave="stay">Stay<small>keep changing</small></button></div>`];
  if (st.link === "lost") return ["note alarm", `<p><b>No connection to CraftBeerPi.</b> These are the settings as they were at 14:31. Your changes stay on this page until it is back; then SAVE sends them.</p>`];
  const bad = Object.keys(st.row).filter(k => st.row[k].s === "bad");
  if (bad.length) return ["note alarm", `<p><b>${esc(bad.map(nameOf).join(" and "))} didn't save.</b> CraftBeerPi didn't answer, so it may not have ${bad.length === 1 ? "it" : "them"}. ${bad.length === 1 ? "It's" : "They're"} still on this page; nothing else is affected.</p><div class="acts"><button type="button" class="cmd ans" data-retry="${bad[0]}">Try again<small>send it again</small></button><button type="button" class="cmd" data-goto="${bad[0]}">Show it<small>in ${esc(groupOf(bad[0]).name)}</small></button></div>`];
  if (st.later.length) {
    const n = st.later.map(nameOf);
    return ["note", `<p><b>${esc(n.join(" and "))} ${n.length === 1 ? "is" : "are"} saved; CraftBeerPi uses ${n.length === 1 ? "it" : "them"} after a restart.</b> Everything else is in use now. Restart from System, under More, when nothing is brewing.</p><div class="acts"><button type="button" class="cmd" data-tabgo="System">Open System<small>to restart</small></button></div>`];
  }
  return null;
}
/* ---------- the phone alerts' test: what stops it now, its two buttons, and its answer in words ---------- */
function testOff() {
  if (st.link === "lost") return ["no connection", PAUSED];
  const p = phoneState();
  if (!p.on && phoneReady()) return ["save first", "The test uses what CraftBeerPi has saved: SAVE your changes first."];
  if (!p.on) return ["set up first", p.fix || (p.svc === "ntfy" ? "Fill in the topic and SAVE first: the test uses what CraftBeerPi has saved." : "Fill in the user key and the API token, and SAVE first: the test uses what CraftBeerPi has saved.")];
  /* the five switches aren't what the test goes by, so a change to one doesn't hold it up */
  if (dirty().some(k => PHONE.has(k) && !meta(k).on)) return ["save first", "The test uses what CraftBeerPi has saved: SAVE your changes first."];
  return null;
}
function testHTML() {
  const off = testOff(), w = !!st.test && st.test.s === "wait";
  const b = (kind, label, small) => {
    const busy = w && st.test.kind === kind;
    return `<button type="button" class="cmd${busy ? " busy" : ""}" data-test="${kind}"${off || w ? ' aria-disabled="true"' : ""}>${busy ? "Sending…" : label}<small>${busy ? "up to 10 s" : off ? off[0] : small}</small></button>`;
  };
  return `<div class="tests" id="tests">${b("alert", "Test alert", "like a hop alert")}${b("timer", "Test timer", "like a run-out timer")}</div>`;
}
/* the answer: its status line (cls, head), what that means or what to do (fx), the service's own words when it failed
   (det), and the reason in a few words for the last-event line (short) */
function testWords(t) {
  const ntfy = t.svc === "ntfy", via = ntfy ? ntfyHost() : "Pushover", timer = t.kind === "timer";
  if (t.s === "wait") return {cls: "st", head: `Sending through ${esc(via)}…`, fx: "", det: ""};
  if (t.s === "ok") return {cls: "st ok", head: `✓ Sent ${t.at} <span class="why2">· ${timer ? "as a run-out timer's alert" : "through " + esc(via)}</span>`, det: "",
    fx: ntfy ? (timer ? "A real one comes again every 2 minutes, 10 more times at most, until you answer the timer on a screen. On an iPhone it makes a sound only with the ringer on and no Focus."
                      : "Not on your phone within a minute? The topic in the ntfy app must be exactly the one above, and the app's notifications must be allowed: on the iPhone, Settings, Notifications, ntfy. If it still doesn't come, remove the topic in the app and add it again.")
             : (timer ? "Pushover repeats it once, in about a minute, then it stops. With the phone on silent, it sounds only with Critical Alerts on for emergency priority (step 4)."
                      : "Not on your phone within a minute? The Pushover app must be logged in to the same account, with its notifications allowed.")};
  const R = {
    refused: t.field === "topic" ? [`${via} refused the topic`, "Someone else may have reserved it there. MAKE ONE for a new topic, subscribe to it in the ntfy app, SAVE, and test again."]
      : t.field === "token" && ntfy ? [`${via} refused the access token`, "Check the token, or leave it blank: ntfy.sh needs none."]
      : t.field === "user" ? ["Pushover doesn't know the user key", "Copy it again from your dashboard at pushover.net: 30 letters and digits."]
      : t.field === "token" ? ["Pushover doesn't know the API token", "Copy it again from CraftBeerPi's application at pushover.net/apps."]
      : [`${via} refused it`, "What it said is below."],
    no_devices: ["no phone is logged in to this Pushover account", "Log in to the Pushover app on your iPhone with the same account, then test again."],
    limit: ntfy ? [`${via}'s limit for this network`, "ntfy.sh takes 250 alerts a day from one internet address, and only a few a minute. Try again in a few minutes. If this comes back, today's 250 are used up, and alerts are lost until they free up."]
      : ["Pushover's monthly limit", "Pushover takes 10,000 alerts a month for each account, and refuses more until the 1st."],
    unreachable: [`couldn't reach ${via}`, "Check the Pi's internet. Without it, phone alerts are lost; the screens still alarm."],
    not_set_up: ["not set up", (testOff() || ["", "Fill it in and SAVE first."])[1]],
    no_answer: ["no answer from CraftBeerPi", "The test may or may not have gone. Check the connection, then try again."]
  }[t.reason] || ["it didn't go", ""];
  const verb = t.reason === "no_devices" ? "Didn't arrive" : t.reason === "limit" ? "Not sent" : "Didn't send";
  return {cls: "st no", head: `${verb} <span class="why2">· ${esc(R[0])}</span>`, fx: R[1], det: t.detail || "", short: R[0]};
}
const eventOf = t => { const what = t.kind === "timer" ? "test timer alert" : "test alert"; return t.s === "ok" ? [now(), `Phone alerts: ${what} sent through ${t.svc}`, "confirmed", "ok"] : [now(), `Phone alerts: ${what} didn't go, ${testWords(t).short}`, "failed", "bad"]; };
/* the mockup answers a test after a second, as its scene says it will: sent, or one of these. The page asks POST
   /phone-alerts/test?kind=alert or ?kind=timer, and gets the same reason, field and detail back */
const WILL = {
  refused: svc => svc === "ntfy" ? {reason: "refused", field: "topic", detail: "ntfy answered 403 (40301): forbidden"} : {reason: "refused", field: "token", detail: "Pushover answered 400: application token is invalid, see https://pushover.net/api"},
  no_devices: () => ({reason: "no_devices", field: "user", detail: "Pushover has no phone to send it to (no active devices to send to): sign in to the Pushover app on the phone with the account whose user key is in pushover_user"}),
  limit: svc => svc === "ntfy" ? {reason: "limit", field: null, detail: "ntfy answered 429 (42908): limit reached: daily message quota reached; increase your limits with a paid plan, see https://ntfy.sh"} : {reason: "limit", field: null, detail: "Pushover answered 429: application has exceeded its monthly limit"},
  unreachable: svc => ({reason: "unreachable", field: null, detail: `${svc} didn't answer within 10 s`})
};
function settleTest(kind, svc, will, at) {
  at = at || now().slice(0, 5);
  const f = WILL[will] ? WILL[will](svc) : null;
  st.test = f ? Object.assign({s: "bad", kind, svc, at}, f) : {s: "ok", kind, svc, at};
  st.fault = f && f.reason === "refused" && f.field && FIELD[svc][f.field] ? {k: FIELD[svc][f.field], at} : null;
  st.events.unshift(eventOf(st.test));
}
function runTest(kind) {
  const svc = svcOf(st.saved[SVC]);
  st.test = {s: "wait", kind, svc};
  paintRow("how_test"); paintTest();
  setTimeout(() => { settleTest(kind, svc, st.testWill); $("#sr").textContent = st.test.s === "ok" ? "The test is sent" : "The test didn't go"; refresh(); }, 1200);
}
/* the buttons change in place, so the one pressed keeps its focus */
function paintTest() {
  const t = $("#tests");
  if (!t) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = testHTML();
  $$("[data-test]", tmp).forEach(n => { const o = $(`[data-test="${n.dataset.test}"]`, t); if (o.outerHTML !== n.outerHTML) { o.className = n.className; o.innerHTML = n.innerHTML; if (n.hasAttribute("aria-disabled")) o.setAttribute("aria-disabled", "true"); else o.removeAttribute("aria-disabled"); } });
}
/* MAKE ONE: the page makes the topic itself, so it works with no connection and can't fail: cbpi- and 24 random letters
   and digits, as /phone-alerts/topic makes one, lower case and without l, o, 0 and 1, which are easily mistaken for one
   another on a phone. crypto.getRandomValues is there over plain http too */
const newTopic = () => { const from = "abcdefghijkmnpqrstuvwxyz23456789", a = new Uint32Array(24); crypto.getRandomValues(a); return "cbpi-" + [...a].map(x => from[x % 32]).join(""); };
/* COPY: the clipboard where the browser allows it (https, or this computer), else the older way, which works over plain
   http as the Pi serves the page */
function legacyCopy(v) {
  const t = document.createElement("textarea");
  t.value = v; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
  document.body.append(t); t.select(); t.setSelectionRange(0, v.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  t.remove();
  return ok;
}
function copyText(k, b) {
  const v = String(val(k) == null ? "" : val(k)).trim(), s = $("small", b);
  const done = ok => {
    b.focus({preventScroll: true});
    if (!ok) return toast("This browser won't copy here: SHOW the topic, then select it and copy it.");
    s.textContent = "copied";
    clearTimeout(copyText.t); copyText.t = setTimeout(() => (s.textContent = "to paste in the app"), 2000);
  };
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(v).then(() => done(true), () => done(legacyCopy(v)));
  done(legacyCopy(v));
}
/* the chosen service's rows show; the other's wait, hidden, with their values kept, and FIND still finds them. A part with
   none of the chosen service's rows goes too. Each step is numbered among the steps of its own service */
function applySvc() {
  const s = svcNow();
  $$(".part[data-off]").forEach(p => { $(".pl", p).textContent = phoneReady() ? p.dataset.pl : p.dataset.off; });
  $$(".part").forEach(p => { const rows = $$(".row", p); p.classList.toggle("other", rows.length > 0 && rows.every(r => r.classList.contains("other"))); });
  $$(".part[data-steps]").forEach(p => {
    const rows = $$(".row", p);
    rows.forEach((r, i) => { const v = meta(r.dataset.k).svc || s, b = $(".sn b", r); if (b) b.textContent = rows.slice(0, i + 1).filter(x => { const xv = meta(x.dataset.k).svc; return !xv || xv === v; }).length; });
  });
}
function stHTML(k) {
  if (k === "how_test") { const w = st.test ? testWords(st.test) : null; return w ? [w.cls, w.head] : ["st", ""]; }
  if (isHow(k)) return ["st", ""];
  const r = st.row[k] || {}, bad = invalid(k);
  if (bad) return ["st no", `<span class="why2">${bad}</span>`];
  if (r.s === "wait") return ["st", "Saving…"];
  if (r.s === "bad") return ["st no", `Didn't save <span class="why2">· ${esc(r.msg)}</span><button type="button" class="cmd ans" data-retry="${k}">Try again<small>send it again</small></button>`];
  if (isChanged(k)) return ["st", `Changed <span class="was">· was ${esc(shown(k, st.saved[k]))}</span><button type="button" class="lnk" data-undo="${k}">Undo</button>`];
  if (st.fault && st.fault.k === k) return ["st no", `Refused in the test at ${st.fault.at} <span class="why2">· see Send a test</span>`];
  if (r.s === "ok") return ["st ok", `✓ Saved ${r.at}${r.later ? ` <span class="later">· ${r.later}</span>` : ""}`];
  if (ctlOf(k) === "secret" && blankish(val(k))) return ["st", `<span class="was">${esc(meta(k).unset || "Not set")}</span>`];
  return ["st", ""];
}

/* ---------- updating in place, so a field being typed in keeps its focus ---------- */
function paintRow(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const r = st.row[k] || {}, m = meta(k), [cls, html] = stHTML(k), s = $("#s-" + k);
  el.classList.toggle("chg", isChanged(k) && !invalid(k) && r.s !== "bad" && r.s !== "wait");
  el.classList.toggle("wait", r.s === "wait");
  el.classList.toggle("bad", r.s === "bad" || !!invalid(k) || (!!st.fault && st.fault.k === k && !isChanged(k)));
  if (s.innerHTML !== html) s.innerHTML = html;
  s.className = cls;
  $$(".seg [data-set]", el).forEach(b => { const on = String(val(k)) === b.dataset.set; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
  /* greyed while it isn't used: its main switch is off, phone alerts aren't set up, or the other service is chosen (then
     hidden too, but for FIND); and a note on a value that saves but is worth knowing about */
  const y = $("#y-" + k), offDep = m.dep && m.dep.is && val(m.dep.on) !== m.dep.is, offOn = m.on && !phoneReady(), offSvc = !!m.svc && m.svc !== svcNow();
  el.classList.toggle("idle", !!(offDep || offOn || offSvc));
  el.classList.toggle("other", offSvc);
  const why = [offSvc ? `Used when phone alerts go through ${m.svc}.` : offDep ? `Used when ${nameOf(m.dep.on)} is ${shown(m.dep.on, m.dep.is)}.` : "", warnOf(k)].filter(Boolean).join(" ");
  y.hidden = !why;
  y.textContent = why;
  if (m.cloud) $("#n-" + k).innerHTML = marked(nameOf(k));
  if (m.hc) { const w = $("#w-" + k); if (w && !w.hidden) w.innerHTML = marked(helpOf(k)); }
  if (m.calc) { const x = $("#x-" + k); if (x) x.textContent = calc(k); }
  if (m.hs) { const w = $("#w-" + k); if (w) w.innerHTML = marked(helpOf(k)); }
  if (m.means) { const x = $("#x-" + k); if (x) x.textContent = m.means[String(val(k))] || ""; }
  if (m.topic) { const x = $("#x-" + k), on = !!st.shown[k] && !blankish(val(k)); if (x) { x.hidden = !on; if (on) x.innerHTML = spell(val(k)); } }
  if (m.test) { const t = $("#t-" + k), w = st.test && st.test.s !== "wait" ? testWords(st.test) : null; if (t) { t.hidden = !w || !(w.fx || w.det); if (w) t.innerHTML = `${esc(w.fx)}${w.det ? `<span class="det">${esc(w.det)}</span>` : ""}`; } }
}
const paintAll = () => { Object.keys(all()).forEach(paintRow); Object.keys(HOWS).forEach(paintRow); applySvc(); };
function paintChrome() {
  $("#meta").innerHTML = metaHTML();
  $("#groups").innerHTML = gs().map(giHTML).join("");
  $("#btns").innerHTML = btnsHTML();
  /* phone alerts: on or off, by what CraftBeerPi has saved, at the top of their plate; and whether the test can go */
  $$(".pst").forEach(ps => { const p = phoneState(); ps.className = "pst" + (p.on ? " on" : ""); ps.innerHTML = `<i aria-hidden="true"></i>${esc(p.text)}`; });
  paintTest();
  $$(".see").forEach(p => { const a = $("a", p); p.outerHTML = seeHTML(a.dataset.goto); });
  const n = noteHTML(), note = $("#note");
  note.hidden = !n;
  if (n) { note.className = n[0]; note.innerHTML = n[1]; }
  const d = dirty().length, bar = $("#savebar");
  bar.hidden = !(d || st.saving);
  if (!bar.hidden) bar.innerHTML = `<p>${st.saving ? "Saving…" : `${d} ${d === 1 ? "change" : "changes"} not saved`}</p>${btnsHTML()}`;
  $("#app").toggleAttribute("data-dirty", !bar.hidden);
  const e = st.events[0];
  $("#event").innerHTML = `<span class="line"><time>${e[0]}</time>${esc(e[1])} · <span class="res ${e[3]}">${e[2]}</span>${e[4] ? ` · <span class="res">${esc(e[4])}</span>` : ""}</span><button type="button" class="logbtn" data-log>LOG</button>`;
  $("#app").dataset.link = st.link;
  const lk = $("#link");
  lk.dataset.link = st.link;
  $("#link-t").textContent = st.link === "lost" ? "No connection" : "Connected";
  /* without the connection a press of ALL OFF can't reach CraftBeerPi, so it is dimmed and says why, as on brew day */
  const ho = $("#alloff");
  if (st.link === "lost") { ho.setAttribute("aria-disabled", "true"); ho.dataset.why = PAUSED; } else { ho.removeAttribute("aria-disabled"); delete ho.dataset.why; }
  paintBrand();
}
/* the title bar's name: the Brewery name setting as CraftBeerPi has it, so it changes on SAVE, not while typing.
   Blank shows CraftBeerPi; a name of more than LONG_NAME characters is drawn smaller (brew-day.css), and its title gives
   it whole. The browser tab's title starts with it, as on the brew-day screen */
function paintBrand() {
  const nm = String(st.saved.BREWERY_NAME == null ? "" : st.saved.BREWERY_NAME).trim() || "CraftBeerPi", br = $(".brand"), long = nm.length > LONG_NAME;
  $(".bname", br).textContent = nm;
  br.toggleAttribute("data-long", long);
  if (long) br.title = nm; else br.removeAttribute("title");
  document.title = `${nm} · Settings (mockup)`;
}
function paintFind() {
  const on = words().length > 0, main = $("#main");
  main.toggleAttribute("data-finding", on);
  $(".plates").classList.toggle("finding", on);
  let total = 0, found = 0;
  gs().forEach(g => {
    const plate = $("#g-" + g.id);
    let n = 0;
    $$(".part", plate).forEach(p => {
      let pn = 0;
      $$(".row", p).forEach(r => { const ok = hit(r.dataset.k); r.classList.toggle("miss", !ok); if (ok) { pn++; if (!isHow(r.dataset.k)) total++; } });
      p.classList.toggle("empty", on && !pn);
      n += pn;
    });
    plate.classList.toggle("none", on && !n);
    found += n;
  });
  $$(".row").forEach(r => {
    const k = r.dataset.k, nm = $("#n-" + k), wh = $("#w-" + k), ky = $(".ky span", r);
    nm.innerHTML = marked(nameOf(k));
    if (wh && !wh.hidden) wh.innerHTML = marked(helpOf(k));
    if (ky) ky.innerHTML = marked(k);
  });
  let nh = $("#nohit");
  if (on && !found) {
    if (!nh) { nh = document.createElement("div"); nh.id = "nohit"; nh.className = "nohit"; $("#plates").prepend(nh); }
    const away = ELSEWHERE.test(st.q);
    nh.innerHTML = `<b>Nothing here matches “${esc(st.q)}”</b><p>Try a word from a setting's name, its key or what it does.</p>${away ? `<p>Settings for one kettle, switch or probe, such as a PID's or the boil power, are kept with it in Hardware.</p><p><button type="button" class="cmd" data-tabgo="Hardware">Open Hardware<small>kettles, switches, probes</small></button></p>` : ""}`;
  } else if (nh) nh.remove();
  $("[data-clear]").hidden = !on;
  $("#groups").innerHTML = gs().map(giHTML).join("");
  $("#sr").textContent = on ? (total ? `${total} ${total === 1 ? "setting" : "settings"} found` : "Nothing found") : "";
  grow();
  spy();
}
function render() {
  $("#banner").innerHTML = `${ICON_OK}<span class="msg">No alarms</span>`;
  $("#idx").innerHTML = idxHTML();
  $("#tool").innerHTML = toolHTML();
  $("#plates").innerHTML = gs().map(plateHTML).join("");
  paintAll();
  paintChrome();
  paintFind();
  applyView();
}
function refresh() { paintAll(); paintChrome(); }
/* each text box as tall as its words. One that isn't drawn (a phone's closed group, a row FIND hides) has no height to go
   by, so it waits until it shows: applyView and paintFind measure again */
function grow() { $$("textarea.fld").forEach(t => { if (!t.getClientRects().length) return; t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }); }
function applyView() {
  const main = $("#main");
  main.dataset.view = phone() ? st.view : "index";
  $$(".plate").forEach(p => p.classList.toggle("pick", p.dataset.g === st.pg));
  grow();
}

/* ---------- moving about ---------- */
function setCur(id) {
  if (st.cur === id) return;
  st.cur = id;
  $$(".gi").forEach(a => a.setAttribute("aria-current", String(a.dataset.g === id)));
}
function spy() {
  if (phone()) return;
  const pane = $("#pane"), top = wide() ? pane.getBoundingClientRect().top : 90, vis = $$(".plate:not(.none)");
  let cur = vis.length ? vis[0].dataset.g : null;
  for (const p of vis) { if (p.getBoundingClientRect().top - top < 120) cur = p.dataset.g; }
  if (wide() && vis.length && pane.scrollTop > 0 && pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 4) cur = vis[vis.length - 1].dataset.g;
  setCur(cur);
}
function land(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1700); }
function jump(id, key) {
  if (phone()) { st.view = "group"; st.pg = id; applyView(); window.scrollTo(0, 0); }
  const el = key ? $("#r-" + key) : $("#g-" + id);
  if (!phone() || key) el.scrollIntoView({block: key ? "center" : "start", behavior: calm() ? "auto" : "smooth"});
  setCur(id);
  land(key ? el : $("#g-" + id), key ? "flash" : "land");
  if (key) setTimeout(() => { const f = $("#f-" + key) || $("[role=radio][aria-checked=true]", el); f && f.focus({preventScroll: true}); }, calm() ? 0 : 450);
}
function back() {
  const id = st.pg;
  st.view = "index"; st.pg = null; applyView();
  const a = $(`.gi[data-g="${id}"]`);
  if (a) { a.scrollIntoView({block: "center"}); a.focus({preventScroll: true}); }
}

/* ---------- changing, saving ---------- */
function setDraft(k, v) {
  st.draft[k] = v;
  if (st.fault && st.fault.k === k) st.fault = null;
  if (st.row[k] && st.row[k].s !== "wait") delete st.row[k];
  st.later = st.later.filter(x => x !== k);
  paintRow(k);
  const m = meta(k);
  Object.keys(M).filter(x => M[x].dep && M[x].dep.on === k || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (m && !isChanged(k)) delete st.draft[k];
  /* a phone alerts setting: what shows goes by the service, and the switches by whether alerts are set up */
  if (PHONE.has(k)) { paintAll(); if (k === SVC && words().length) paintFind(); }
  paintChrome();
}
const now = () => new Date().toTimeString().slice(0, 8);
function save() {
  const ks = dirty();
  if (st.saving) return;
  if (st.link === "lost") return toast("No connection: SAVE sends your changes once CraftBeerPi is back.");
  if (!ks.length) return toast("Nothing has changed yet.");
  if (invalids().length) return toast("Fix the entry marked in red first: its line says what it needs.");
  st.saving = true;
  ks.forEach(k => (st.row[k] = {s: "wait"}));
  $$("[data-retry]").forEach(b => b.remove());
  refresh();
  setTimeout(() => done(ks), 1100);
}
function done(ks) {
  const [ok, no] = settle(ks);
  $("#sr").textContent = no.length ? `${no.length} didn't save` : `${ok.length} saved`;
  refresh();
}
/* the answer from CraftBeerPi, as state only; the scenes use it before the page is drawn */
function settle(ks, at) {
  at = at || now().slice(0, 5);
  ks.forEach(k => {
    if (k === st.failKey) { st.row[k] = {s: "bad", msg: "CraftBeerPi didn't answer, so it may not have it"}; return; }
    const was = st.saved[k], m = meta(k);
    st.saved[k] = st.draft[k]; delete st.draft[k];
    const later = m.restart === "on" ? (st.saved[k] === "Yes" && was !== "Yes" ? "on after a restart" : "") : m.restart ? "used after a restart" : "";
    st.row[k] = {s: "ok", at, later};
    if (later && !st.later.includes(k)) st.later.push(k);
  });
  st.saving = false;
  const ok = ks.filter(k => st.row[k].s === "ok"), no = ks.filter(k => st.row[k].s === "bad");
  /* a saved change to where the test goes makes its last answer out of date */
  if (ok.some(k => TESTED.includes(k)) && !(st.test && st.test.s === "wait")) { st.test = null; st.fault = null; }
  st.events.unshift(no.length
    ? [now(), `Settings: ${no.map(nameOf).join(", ")} didn't save${ok.length ? `; ${ok.length} saved` : ""}`, "failed", "bad"]
    : [now(), `Settings: ${ok.length === 1 ? nameOf(ok[0]) : ok.length + " changes"} saved`, "confirmed", "ok"]);
  return [ok, no];
}
function undo(k) { delete st.draft[k]; delete st.row[k]; rebuild(k); paintChrome(); }
function rebuild(k) {
  const el = $("#r-" + k);
  if (!el) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = rowHTML(k);
  el.replaceWith(wrap.firstElementChild);
  paintRow(k);
  Object.keys(M).filter(x => M[x].dep && M[x].dep.on === k || M[x].calc).forEach(paintRow);
  if (k === "INFLUXDBCLOUD") ["INFLUXDBNAME", "INFLUXDBUSER", "INFLUXDBPWD"].forEach(paintRow);
  if (PHONE.has(k)) paintAll();
  if (words().length) paintFind();
  grow();
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 4000);
}
/* TRY: the brew-day screen's own sound (alarm.js), its whole burst, as a timer that has run out plays
   it, whatever that screen's SOUND switch says: pressing TRY is asking to hear it. Its small line says "playing" for the
   burst, so a muted device still shows that it worked */
let actx;
function tryIt(k, b) {
  const A = window.CBPI_ALARM, key = A.soundOf(val(k));
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    A.play(actx, actx.destination, actx.currentTime + 0.02, key);
  } catch (e) { return toast("This browser can't play sound here."); }
  const s = b && $("small", b);
  if (!s) return;
  s.textContent = "playing";
  clearTimeout(tryIt.t); tryIt.t = setTimeout(() => (s.textContent = "plays it here"), A.burstSeconds(key) * 1000 + 150);
}

/* ---------- input ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button, a");
  if (!b) return;
  const ds = b.dataset;
  if (b.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
    if ("save" in ds) return toast(st.link === "lost" ? "No connection: SAVE sends your changes once CraftBeerPi is back." : invalids().length ? "Fix the entry marked in red first: its line says what it needs." : "Nothing has changed yet: change a setting, then SAVE.");
    if ("undoall" in ds) return toast("Nothing to undo.");
    if ("show" in ds) return toast(meta(ds.show).topic ? "No topic yet: MAKE ONE, or type one." : "Nothing is set yet: type the key in the box.");
    if ("copy" in ds) return toast("No topic yet to copy: MAKE ONE, or type one.");
    if ("test" in ds) return toast(st.test && st.test.s === "wait" ? "A test is on its way: its answer comes in a few seconds." : (testOff() || ["", "The test can't go just now."])[1]);
    if (ds.why) return toast(ds.why);
    return;
  }
  if (b.closest("#mock")) return;
  if (ds.g && b.classList.contains("gi")) { e.preventDefault(); return jump(ds.g); }
  if (ds.goto) { e.preventDefault(); const k = ds.goto; return jump(groupOf(k).id, k); }
  if ("back" in ds) { e.preventDefault(); return back(); }
  if (ds.set !== undefined && b.closest(".seg")) { const k = b.closest(".row").dataset.k; return setDraft(k, ds.set); }
  if ("save" in ds) return save();
  if ("undoall" in ds) { const ks = dirty(); ks.forEach(k => { delete st.draft[k]; delete st.row[k]; }); ks.forEach(rebuild); st.leave = null; paintChrome(); st.events.unshift([now(), `Settings: ${ks.length} ${ks.length === 1 ? "change" : "changes"} put back`, "done", "ok"]); return paintChrome(); }
  if (ds.undo) return undo(ds.undo);
  if (ds.retry) { const k = ds.retry; st.failKey = null; st.row[k] = {s: "wait"}; refresh(); return setTimeout(() => done([k]), 900); }
  if (ds.show) { st.shown[ds.show] = !st.shown[ds.show]; return rebuild(ds.show); }
  if (ds.try) return tryIt(ds.try, b);
  if (ds.test) return runTest(ds.test);
  /* MAKE ONE shows the new topic, as it has to be typed into the ntfy app; it is a change, saved with SAVE */
  if (ds.make) { const k = ds.make; st.shown[k] = true; setDraft(k, newTopic()); rebuild(k); const n = $(`[data-make="${k}"]`); if (n) n.focus({preventScroll: true}); $("#sr").textContent = "A new topic, shown, not saved yet"; return; }
  if (ds.copy) return copyText(ds.copy, b);
  /* THIS CRAFTBEERPI: the address this page came from. The mockup, opened as a file, has none, so it uses the simulator's */
  if (ds.here) { const k = ds.here; setDraft(k, /^https?:$/.test(location.protocol) ? location.origin + "/" : "http://127.0.0.1:8000/"); return rebuild(k); }
  if ("clear" in ds) { st.q = ""; $("#q").value = ""; paintFind(); return $("#q").focus(); }
  if (ds.leave) {
    const to = st.leave;
    if (ds.leave === "stay") { st.leave = null; return paintChrome(); }
    if (ds.leave === "drop") { const ks = dirty(); ks.forEach(k => delete st.draft[k]); ks.forEach(rebuild); st.leave = null; paintChrome(); return toast(`Mockup: this would now open ${to}, without the changes.`); }
    st.leave = null; save(); return toast(`Mockup: once they're saved, this would open ${to}.`);
  }
  if (ds.tab) {
    e.preventDefault();
    if (ds.tab === "Settings") return;
    /* BrewScribe opens in a browser tab of its own, so this page and its unsaved changes stay: no question first */
    if (ds.tab === "BrewScribe") return toast("Mockup: this opens BrewScribe in a browser tab of its own, or goes back to that tab if it's open, without reloading it. Your changes here stay as they are.");
    if (dirty().length && !st.saving) { st.leave = ds.tab; paintChrome(); const n = $("#note"); n.scrollIntoView({block: "nearest"}); return $(".cmd.ans", n).focus(); }
    return toast(`Mockup: this would open ${ds.tab}.`);
  }
  if (ds.tabgo) return toast(`Mockup: this would open ${ds.tabgo}.`);
  if ("log" in ds) return toast("Mockup: LOG lists the last eight events, as on the brew-day screen.");
  if (b.id === "alloff") return toast("Mockup: ALL OFF works here exactly as on the brew-day screen.");
});
document.addEventListener("input", e => {
  const f = e.target;
  if (f.id === "q") { st.q = f.value; return paintFind(); }
  const row = f.closest && f.closest(".row");
  if (!row) return;
  if (f.tagName === "TEXTAREA") {
    // the page's text boxes hold one line: a pasted line break becomes a space
    const v = f.value.replace(/^(\r\n|\r|\n)+|(\r\n|\r|\n)+$/g, "").replace(/(\r\n|\r|\n)+/g, " ");
    if (v !== f.value) f.value = v;
    f.style.height = "auto"; f.style.height = f.scrollHeight + 2 + "px";
  }
  setDraft(row.dataset.k, f.value);
});
document.addEventListener("change", e => { const f = e.target, row = f.closest && f.closest(".row"); if (row && f.tagName === "SELECT") setDraft(row.dataset.k, f.value); });
document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA" && e.key === "Enter" && !e.isComposing) e.preventDefault();
  if (e.key === "Escape" && e.target.id === "q" && st.q) { st.q = ""; e.target.value = ""; paintFind(); }
  // the radios of a YES | NO control move with the arrow keys, as radios do
  if (e.target.getAttribute && e.target.getAttribute("role") === "radio" && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
    e.preventDefault();
    const rs = $$("[role=radio]", e.target.closest(".seg")), i = rs.indexOf(e.target), nx = rs[(i + (/Right|Down/.test(e.key) ? 1 : rs.length - 1)) % rs.length];
    nx.focus(); nx.click();
  }
});
$("#pane").addEventListener("scroll", () => requestAnimationFrame(spy), {passive: true});
addEventListener("scroll", () => requestAnimationFrame(spy), {passive: true});
addEventListener("resize", () => { applyView(); spy(); });

/* ---------- scenes (the strip at the top) ---------- */
/* an example topic for the phone alerts' scenes: nothing is ever sent to it. The Pushover scenes' keys are placeholders, shown
   as dots */
const EX_TOPIC = "cbpi-k7mq3xa9b2cd8fgh4jkr6stv";
const EX_PUSHOVER = {phone_alerts_service: "Pushover", pushover_user: "u".repeat(30), pushover_token: "a".repeat(30)};
const phoneScene = f => () => { f(); setTimeout(() => jump("phone"), 60); };
const CH = {ACTOR_INTERLOCK_MODE: "One heating element at a time", BREWDAY_TIMER_NAMES: "Hop stand, Yeast, Vorlauf, Dry hop", MQTTUpdate: "60"};
const SCENES = {
  top: () => {},
  boil: () => setTimeout(() => jump("boil"), 60),
  "find-lid": () => { st.q = "lid"; },
  "find-key": () => { st.q = "MASH_TUN"; },
  "find-none": () => { st.q = "hysteresis"; },
  changes: () => { Object.assign(st.draft, CH); },
  saving: () => { Object.assign(st.draft, CH); st.saving = true; Object.keys(CH).forEach(k => (st.row[k] = {s: "wait"})); },
  saved: () => { Object.assign(st.draft, CH); settle(Object.keys(CH), "14:32"); st.events[0][0] = "14:32:06"; },
  failed: () => { Object.assign(st.draft, CH); st.failKey = "ACTOR_INTERLOCK_MODE"; settle(Object.keys(CH), "14:32"); st.events[0][0] = "14:32:06"; },
  leave: () => { Object.assign(st.draft, {ACTOR_INTERLOCK_MODE: CH.ACTOR_INTERLOCK_MODE, BREWDAY_TIMER_NAMES: CH.BREWDAY_TIMER_NAMES}); st.leave = "Brew day"; },
  cloud: () => { st.saved.INFLUXDB = "Yes"; st.saved.INFLUXDBCLOUD = "Yes"; setTimeout(() => jump("logs", "INFLUXDBCLOUD"), 60); },
  plugin: () => {
    const sel = v => ({label: v, value: v});
    st.extra = {
      DEMO_INTERVAL: {v: 30, t: "number", s: "cbpi4-DemoPlugin", d: "Demonstration data, not a real plugin: seconds between this plugin's readings."},
      demo_mode: {v: "Fast", t: "select", s: "cbpi4-DemoPlugin", d: "Demonstration data: how this plugin reads its sensor.", o: [sel("Fast"), sel("Slow")]},
      DEMO_LABEL: {v: "Garage", t: "string", s: "cbpi4-DemoPlugin", d: "Demonstration data: a name this plugin shows."}
    };
    for (const k in st.extra) st.saved[k] = st.extra[k].v;
    setTimeout(() => jump("plugins"), 60);
  },
  offline: () => { st.link = "lost"; st.draft.BREWDAY_TIMER_NAMES = CH.BREWDAY_TIMER_NAMES; },
  phone: phoneScene(() => {}),
  "phone-made": phoneScene(() => { st.draft.ntfy_topic = EX_TOPIC; st.shown.ntfy_topic = true; }),
  "phone-on": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; }),
  "phone-sent": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; settleTest("alert", "ntfy", "sent", "14:32"); st.events[0][0] = "14:32:06"; }),
  "phone-refused": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; st.testWill = "refused"; settleTest("alert", "ntfy", "refused", "14:32"); st.events[0][0] = "14:32:06"; }),
  "phone-unreachable": phoneScene(() => { st.saved.ntfy_topic = EX_TOPIC; st.testWill = "unreachable"; settleTest("timer", "ntfy", "unreachable", "14:32"); st.events[0][0] = "14:32:16"; }),
  pushover: phoneScene(() => { Object.assign(st.saved, EX_PUSHOVER); settleTest("timer", "Pushover", "sent", "14:32"); st.events[0][0] = "14:32:06"; }),
  "pushover-nophone": phoneScene(() => { Object.assign(st.saved, EX_PUSHOVER); st.testWill = "no_devices"; settleTest("alert", "Pushover", "no_devices", "14:32"); st.events[0][0] = "14:32:06"; })
};
function scene() {
  const h = location.hash.slice(1) || "top";
  if (!(h in SCENES)) return;
  fresh();
  SCENES[h]();
  render();
  if (!["boil", "cloud", "plugin"].includes(h) && !/^(phone|pushover)/.test(h)) { $("#pane").scrollTop = 0; window.scrollTo(0, 0); }
  $$('#mock a[href^="#"]').forEach(a => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + h)));
  $$("#mock a[data-nm]").forEach(a => {
    const q = new URLSearchParams(location.search);
    if (a.dataset.nm) q.set("name", a.dataset.nm); else q.delete("name");
    a.href = `?${q}#${h}`;
    a.setAttribute("aria-current", String((a.dataset.nm || "CraftBeerPi Brewery") === QNAME));
  });
}
if (QS.has("bare")) document.documentElement.classList.add("bare");
/* the mockup's strip wraps on narrower windows: the screen under it takes what is left of the window */
const fitMock = () => { const mk = $("#mock"); if (mk && !QS.has("bare")) document.documentElement.style.setProperty("--mock-h", mk.offsetHeight + "px"); };
addEventListener("resize", fitMock);
fitMock();
if (document.fonts) document.fonts.ready.then(fitMock);
/* BREWSCRIBE: shown where BrewScribe is installed; ?brewscribe=none shows the page without it */
if (QS.get("brewscribe") === "none") $('.tabs a[data-tab="BrewScribe"]').remove();
addEventListener("hashchange", scene);
scene();
})();
