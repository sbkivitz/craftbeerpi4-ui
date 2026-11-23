# Figures: what each builder needs

The brewer approved the Figures page on 23 Nov ("The Figures mock-up looks excellent"). This file splits the work by builder:

- **W**, the web UI. The UI's own notes are in [`BUILD-NOTES.md`](BUILD-NOTES.md).
- **C**, CraftBeerPi's core.
- **B**, BrewStart.
- **S**, the strike water box, which lives in the core.
- **P**, BrewScribe.

Every server row gives its exact call or field, its answer, and what the page does on an older version.

It was written against core 4.7.7.post61 (7901d327), BrewStart 1.3.0.post1, BrewScribe 0.1.0.dev51 and UI main a3ddf56 (the design branched from 939fa5c; the `screen.js` lines quoted are a3ddf56's).

## How it fits together

1. The page reads one thing, **`GET /figures`**. That answer holds every brew and every figure, worked out on the Pi.
2. Opening a brew reads that brew's graph with **`GET /figures/brews/{id}`**.
3. USE, BACK TO and LEAVE OUT are **`POST /figures/{figure}/…`**.
4. CraftBeerPi applies USE to the setting the figure belongs to:
   - HLT heating goes to BrewStart's new `BREWSTART_EFFICIENCY` setting;
   - the strike water number goes to `strike_plant.json`, which the strike water box already reads;
   - grain absorption goes to `GRAIN_ABSORPTION`.
5. Each owner then plans with that setting as it would with any other value.

The five figures, by id: `hlt`, `strike`, `mash`, `grain`, `boil`.

Times are seconds on CraftBeerPi's clock (`cbpi.api.clock`), as the logs are stamped. Temperatures are in the brewery's unit (TEMP_UNIT). Volumes are gal on a °F brewery and L on a °C one.

## Order

1. **The page can ship with C1–C4 and W1–W3.** On the bench that shows HLT heating, mash rests and the boil kettle from the logs alone.
2. **B1** makes HLT heating's USE work. Until then that USE is greyed and says why.
3. **B2** gives the rig its HLT heating figure, and "planned against took".
4. **S1 and S2** give strike water its figure.
5. **P1** gives grain absorption its figure.
6. **S3 and W4** (Brew Day's strike box) go with S2.
7. **P3** is a nicety.

---

## W: the web UI

The details are in [`BUILD-NOTES.md`](BUILD-NOTES.md).

| # | Change | On an older server |
|---|---|---|
| W1 | **The Figures page.** It replaces `components/charting/index.js`, and the tab becomes FIGURES (`#/figures`; `#/charting` still opens it). It's drawn in the brew-day frame like Settings, Hardware and the recipe pages: a page module in a shadow root, with stylesheets from `design/analytics/port.mjs`. | No `GET /figures` (404): the page shows its head and "This CraftBeerPi can't work out figures from past brews yet: it needs an update. Brewhouse efficiency, boil-off and mash efficiency are in BrewScribe's Past brews." with PAST BREWS IN BREWSCRIBE. Moment `#old-core`. |
| W2 | **Delete-logs moves to Settings,** into a Logs group: one row per probe, plus all logs. Each asks first: "Delete HLT Temp's log? Brew Day's graphs and Figures lose its readings. It can't be undone." with DELETE and KEEP, and no default. Same call as today, `DELETE /log/{sensor id}`. | Works on any server. |
| W3 | **Settings lists BrewStart's new setting:** "BrewStart efficiency", "The share of the HLT element's power that heats the water, in %. Blank: the built-in 90 %. USE on Figures sets it from past brews." In BrewStart's group, after its language. | Not shown until BrewStart registers it (B1). |
| W4 | **Brew Day's strike water box** lists a number the rig has measured under MEASURED ON THE RIG, from the box's new `measured` list (S3): "TUN STEEL 62 % of it warmed by the water at once, measured from 4 brews on Figures". This is Brew Day's box (Amber's): `screen.js` `swList`, line 1502 on main a3ddf56, whose MEASURED ON THE RIG group is at 1532. | Without S3's `measured` list, nothing is added. The number still leaves NOT MEASURED YET, because a measured number is no longer a range and the box isn't sent it. |

---

## C: CraftBeerPi's core

A new `FiguresController` (`cbpi/controller/figures_controller.py`) and `FiguresHttpEndpoints` (`cbpi/http_endpoints/http_figures.py`), registered under `/figures`. Refusals follow the strike water endpoints' convention (`http_strike.py`): a refusal changes nothing, and answers 400, 404 or 409 with the reason in `"error"`. Every 409 also carries the figures as they are now.

### C1. `GET /figures`: the brews and their figures

**What counts as a brew:**
- **Where BrewScribe has a brew day, that day is the brew** (`GET /brewscribe/api/history`, then `GET /brewscribe/api/days/{day_id}` for its readings). This CraftBeerPi asks its own BrewScribe at `http://127.0.0.1:<port>`.
- **Otherwise a brew is a stretch of the logs where something was heated:** a mash rest held, the HLT heated, or the boil kettle taken past 200 °F. Stretches less than 3 hours apart are one brew.
- **Each archived simulator run counts too.** Those are the folders `logs/archive/<time>-simulation/` that SimVessel moves an accelerated run's logs into (`cbpi4-simvessel/__init__.py` `_archive_earlier_run`, about line 1222).
- **Not counted:** a run where the mash never got past 120 °F or the boil kettle past 200 °F.

**Matching a BrewScribe day to the logs:**
- On a brewery whose clock runs at 1× (the rig), BrewScribe's wall-clock times line up with the logs.
- On a simulator, use the CraftBeerPi times BrewScribe keeps with its step entries (`timing`). If a day has none, it can't be matched, so it counts only for grain absorption.

**Answer 200:**

```json
{
  "version": 1,
  "now": 1795413600.0, "scale": 1,
  "brewery": "EBrews", "simulated": false,
  "unit": "F", "vol_unit": "gal", "mass_unit": "lb",
  "brewscribe": "ok",
  "brews": [ { … a brew … } ],
  "figures": { "hlt": { … }, "strike": { … }, "mash": { … }, "grain": { … }, "boil": { … } }
}
```

- `brewery` is BREWERY_NAME, blank as `"CraftBeerPi"`.
- `simulated` is true when any of the three vessels' probes is a SimVessel, or SIM_TIME_SCALE isn't 1.
- `brewscribe` is `"ok"`, `"none"` (not installed: `/brewscribe/` answers 404), or `"no_answer"` (no answer in 5 s).
- `brews` is newest first.

**A brew:**

```json
{
  "id": "bs:9f2c41d0",
  "start": 1795320300.0, "end": 1795345800.0,
  "name": "Rye Pale Ale",
  "day_id": "9f2c41d0", "run": null,
  "rests": [152], "boil": "done", "boil_at": null,
  "auto": [], "stopped_before_rest": false,
  "cells": { "hlt": { … }, "strike": { … }, "mash": { … }, "grain": { … }, "boil": { … } }
}
```

- **`id`** is `bs:<day_id>` for a BrewScribe day, or `log:<run or "now">:<start, whole seconds>` for one found in the logs. It's stable, so a brew left out stays out.
- **`name`** is the BrewScribe day's recipe name, else null.
- **`run`** is the archive folder's name, or null for the live logs.
- **`rests`** lists the rest temperatures held, in order.
- **`boil`** is `"done"`, `"stopped"` (with `boil_at`, the highest reading) or `null`.
- **`auto`** lists `[{"vessel": "hlt" | "mash" | "boil", "target": 118}]`: the AUTOs that ran with no recipe step running. The page uses it to say "HLT AUTO at 118 °F, by hand" for a brew with no name and no rest.
- **`start`** is when heating began.

**A brew's cells.** Each figure's cell is either its numbers, or `{"none": "<reason>"}`. The page has words for each reason (BUILD-NOTES, "The cells").

| Figure | Numbers | `none` reasons |
|---|---|---|
| `hlt` | `{"eff": 0.87, "rate": 2.1, "from": 60.4, "to": 158.0, "minutes": 45.9, "volume": 15.0, "watts": 5346, "t0", "t1", "planned": 44.4, "planned_by": "brewstart", "ready_by": 1795327200.0, "early": 8.5}`. `planned_by` is `"brewstart"` (B2's record) or `"worked_out"` (what 90 % would plan). Without B2, `ready_by` and `early` are null. | `pump_on` (the wort pump ran while the HLT heated, so the mash drew heat too), `not_heated`, `no_water` (no BrewStart record of the water on a real brewery, before B2) |
| `strike` | `{"landed": 151.3, "lo": 149.6, "hi": 152.4, "off": 0.3, "t": <malt in>, "fit_lo": 150.8, "fit_hi": 151.8}`. `lo` and `hi` are the forecast as the box showed it (`lo[0]`, `hi[0]`). `off` is landed less the forecast's middle over minutes 5–15. `fit_lo` and `fit_hi` are the forecast at the fitted value (S2), or null. | `no_grain` (a SimVessel mash tun with `Grain_Kg` 0), `no_forecast` (no record from S1: brewed before it, or the box had no answer) |
| `mash` | `{"rests": [{"target": 149, "t0", "t1", "minutes": 60, "held": 0.3, "over": 1.1, "last_degree": 6.0}], "steps_up": [{"from": 149, "to": 168, "rate": 1.0}]}` | `no_rest`, `stopped` (stopped before its first rest) |
| `grain` | `{"per": 0.104, "held": 1.4, "strike": 5.1, "hlt_fill": 15.0, "sparge_before": 9.9, "strike_from": "hlt_fill", "sparge": 5.4, "pre_boil": 8.6, "dead": 0.5, "grain": 13.5}`. Every volume is as at 68 °F. `strike_from` says how the strike was found: `"hlt_fill"` for now (below). | `no_brewscribe`, `no_volumes` (no HLT fill, sparge or pre-boil reading), `no_levels` (the sparge water has no `level_before`, so the strike can't be told from the HLT's fill), `no_grain_weight` (the recipe has no `mash_numbers.grain_kg`) |
| `boil` | `{"rate": 2.6, "from": 165, "minutes": 17.8, "t0", "t1"}` | `no_boil`, `stopped` (with `"at": 139`) |

**How each is worked out** (the mockup does the same from the bench's logs, `build_bench_data.py` in the designer's session folder):

- **`hlt`:**
  - **Which heat-ups:** each stretch where the HLT rose at least 15 °F at 0.5 °F a minute or more, with the wort pump off the whole time (its level log, `<pump id>.out`), and no mash tun AUTO.
  - **`eff`** = water × 4181 J/kg·K × 0.995 kg/L × rise ÷ (watts × seconds). This is BrewStart's own formula (`schedule.py` `heat_up_minutes`) solved for efficiency.
  - **`rate`** is the rise over the middle 80 % of the stretch, ÷ its minutes.
  - **Water and watts:** from B2's record. On a SimVessel, from its `Volume` and `Heater_Watts`.
- **`strike`:** from S1's record. `landed` is the mash probe's average over minutes 5 to 15 after the malt went in.
- **`mash`, for each rest:**
  - **held:** the most the mash moved from the rest temperature, from two minutes after it got within 0.25 °F, until it last sat within 0.3 °F before leaving.
  - **over:** the most it went over in its first ten minutes.
  - **last degree:** minutes from the last time it was a degree under to arriving.
  - **step up:** the rise between two rests, over the middle 80 %.
- **`grain`:**
  - **The strike:** BrewScribe's `strike_water` reading is the HLT's fill, taken at "HLT water prep", not the strike: on this rig the HLT holds the strike and the sparge water. So strike = `hlt_fill` (the `strike_water` volume) − `sparge_before` (the `sparge_water` entry's `level_before`, P1). `strike_from` is `"hlt_fill"`.
  - **What that costs:** whatever the HLT loses between its fill and the sparge counts as strike. An open HLT may lose 0.1–0.3 gal in an hour of mashing, which raises the figure by about 0.01–0.02 gal/lb on 13.5 lb. The page says it may read slightly high whenever a brew counted has `strike_from: "hlt_fill"`.
  - **Later:** if BrewScribe adds a reading of the HLT's level right after the strike goes over, at dough-in, strike = `hlt_fill` − that level, and `strike_from` becomes `"dough_in_level"`. The mash's losses then drop out, and so does the page's caveat. P1's fields don't change.
  - water held = strike + the `sparge_water` volume − the `pre_boil` volume − the recipe's `lauter_dead_l`;
  - ÷ `mash_numbers.grain_kg`;
  - in gal/lb (or L/kg).
  - **Every volume is taken as at 68 °F before it's added or subtracted:** multiply it by water's density at its temperature ÷ its density at 68 °F, the correction BrewScribe's boil-off already uses (`report_data.py`, about line 1600). The fill is usually cold and the sparge levels hot, so this matters: 10 gal at 168 °F is 9.76 gal at 68 °F. Use the entry's own temperature, else the logged probe's reading at the entry's time (the HLT's for the fill and the sparge, the boil kettle's for pre-boil).
- **`boil`:** from the last reading under 120 °F (or the start) to the first at 211.5 °F; the rate over the middle 80 %.

**A figure:**

```json
{
  "state": "use",
  "n": 2,
  "measured": 0.85, "lo": 0.846, "hi": 0.857,
  "values": [ {"brew": "log:now:1795470347", "v": 0.846, "out": false}, … ],
  "domain": [0.7, 1.0],
  "set": { … },
  "use": { "value": 0.85, "brews": ["log:now:1795470347", "log:20261115-211022-simulation:1795318682"] },
  "why_not": null
}
```

- **`values`** is every brew with a figure, left out or not (the page's dots).
- **`domain`** is the strip's ends: `hlt` 0.7–1.0, `strike` 0.45–1.0, `grain` 0.06–0.16 gal/lb (0.5–1.3 L/kg), `boil` 0–3.5 °F a minute (0–2 °C), `mash` 0–1.5 °F.
- **`use`** is null unless `state` is `"use"`. Its `value` is the figure rounded as it's applied: 2 decimals for efficiency, the tun steel and gal/lb.

**`state`:**

| Value | When | |
|---|---|---|
| `none` | no brew has the figure | |
| `one` | one brew counted | |
| `disagree` | two or more counted, highest − lowest over the limit | `hlt` 0.05, `strike` 0.08, `grain` 0.02 gal/lb (0.17 L/kg), `boil` 0.3 °F a minute (0.17 °C) |
| `use` | two or more agree, and the setting isn't already that figure | |
| `in_use` | the setting holds the figure as USE set it, and the brews still give that figure | |
| `info` | `boil`, two or more agree | it has no setting, so no `use` |
| `nothing` / `caution` | `mash` | below |

- **`mash`** has no `measured`. Instead: `{"state": "nothing" | "caution", "held": 0.3, "over": 0.3, "came_over": [{"brew": id, "target": 149, "over": 1.1}]}`. It's `caution` when any counted rest came 0.8 °F or more over its target.
- **`strike`'s `measured`** is S2's fitted value, not an average.

**`set`, what CraftBeerPi plans with now:**

| Figure | `set` |
|---|---|
| `hlt` | `{"setting": "BREWSTART_EFFICIENCY", "value": 0.9, "built_in": true, "since": null}`, or `{"value": 0.85, "built_in": false, "since": 1795413600.0, "was": null}` once used (`was` null means the built-in). |
| `strike` | `{"name": "tun_share", "low": 0.45, "high": 1.0, "central": 0.75, "value": null, "since": null}`, or `{"value": 0.62, "since": …, "was": {"low": 0.45, "central": 0.75, "high": 1.0}}` once measured. |
| `grain` | `{"setting": "GRAIN_ABSORPTION", "value": 0.12, "since": null}`, or `{"value": 0.10, "since": …, "was": 0.12}`. |
| `mash` | `{"setting": "DeltaTemp", "value": 5.4, "kettle": "<mash tun id>"}`: the mash tun's PID_HERMS `DeltaTemp`. Null when the mash tun's logic isn't PID_HERMS. |
| `boil` | null |

**`why_not`:**
- `hlt` gets `"brewstart_old"` when BrewStart hasn't registered `BREWSTART_EFFICIENCY` (before B1). The page greys USE and says why.
- `strike` gets `"no_plant"` when the strike water helper isn't there.

A setting changed by hand after USE (in Settings, or the plant file edited) is no longer "in use". `since` goes back to null, and the figure's state follows.

**On an older core:** 404. The page shows W1's older-server words.

### C2. `GET /figures/brews/{id}?figure=hlt`: one brew's graph for one figure

**Answer 200:**

```json
{
  "id": "bs:9f2c41d0", "figure": "strike", "vessel": "mash",
  "t0": 1795326480.0, "t1": 1795329600.0,
  "temp": {"t": [ … ], "v": [ … ]},
  "target": {"t": [ … ], "v": [ … ]},
  "element": {"t": [ … ], "v": [ … ]},
  "steps": [[1795320300.0, 1], [1795326720.0, 2], [1795327440.0, 3]],
  "readings": [[1795318800.0, "strike_water", 15.0], [1795334400.0, "sparge_water", 5.4], [1795336200.0, "pre_boil", 8.6]],
  "stretches": [{"t0": 1795327740.0, "t1": 1795328340.0}],
  "forecast": {"lo": 149.6, "hi": 152.4}
}
```

- **The vessel drawn:** `hlt` → the HLT; `strike`, `mash` and `grain` → the mash tun; `boil` → the boil kettle.
- **The time window:**
  - the whole brew;
  - for `strike`, 6 minutes before the malt went in to 40 minutes after;
  - for `mash`, from when the mash was within 25 °F of its first rest (and at most 15 minutes before it got there) to 12 minutes after its last rest.
- **`temp`** is the probe's readings, about 600 points (`LogController._thin`).
- **`target`** is the kettle's target, with 0 wherever nothing held it. Something holds it while its AUTO runs, or for the HLT while the mash tun's AUTO runs the HERMS. That's the brew-day graphs' rule.
- **`element`** is the vessel's element level (`<actor id>.out`), or null.
- **`steps`** is `[time, step number]` from C3, or null without C3.
- **`readings`** is BrewScribe's volume readings `[time, stage, volume]`, or null.
- **`stretches`** is where the figure comes from: the heat-up, each rest, minutes 5–15 after the malt, the climb to the boil. For `grain`, from the strike reading to the pre-boil reading.
- **`forecast`** is the strike forecast as shown, for `strike` only.
- **Refusals:** 404 `{"error": "no_brew"}` or `{"error": "no_figure"}`.
- **On an older core:** not reached, since the page has no brews without C1.

### C3. Step numbers in the logs

- **The change:** each time the active step changes, `cbpi.log.log_control_data("steps.active", n)`. `n` is the 1-based number of the step now active, 0 when none. Put it beside where `StepController` sends `step_update`.
- **Why that call:** it writes `sensor_steps.active.log`, rotated and kept as every log is. SimVessel archives it with a simulator's run, because it archives every `sensor_*.log` written ahead of the real clock.
- **Why:** C2's `steps`, so a past brew's graph gets its numbered step marks as Brew Day's graphs do.
- **On an older core:** no marks. The graph's key says "no step marks: this run's steps weren't kept".

### C4. USE, BACK TO and LEAVE OUT, and where they're kept

**The store,** `config/figures.json`:

```json
{
  "version": 1,
  "in_use": {
    "hlt": {"value": 0.85, "since": 1795413600.0, "brews": ["…", "…"], "was": null},
    "strike": {"value": 0.62, "since": …, "brews": […], "was": {"low": 0.45, "central": 0.75, "high": 1.0}},
    "grain": {"value": 0.10, "since": …, "brews": […], "was": 0.12}
  },
  "out": {"boil": ["log:20261015-141537-simulation:1795167120"]}
}
```

`was` is what the setting held before the first USE. It's kept through later USEs until BACK TO, as the strike water box keeps its `was`.

**`POST /figures/{figure}/use`** with body `{"value": 0.85, "brews": ["…", "…"]}`: the value and brews the page showed.

- **Answer 200:** `{"applied": {"figure": "hlt", "to": 0.85, "from": 0.9, "from_built_in": true}, "figures": {…}}`. Then the topic `figures`.
- **What it writes:**
  - **`hlt`:** the setting `BREWSTART_EFFICIENCY` = the value as a percentage, `85`. A BrewStart that's waiting plans again within a minute.
  - **`strike`:** in `config/strike_plant.json`, `guesses.tun_share.measured` = `{"value": 0.62, "date": "<ISO, CraftBeerPi's clock>", "method": "figures", "brews": […]}`. `read_plant()` already fixes a guess at its `measured.value` (`strike_controller.py:237`). Then the strike water helper works USE out again, as it does when a number it works from changes.
  - **`grain`:** the setting `GRAIN_ABSORPTION` = the value.
- **Refusals (409, nothing changed):**
  - `brews_changed`: the brews or the value aren't what the server now works out. Another screen left one out, or a brew was added.
  - `not_offered`: `state` isn't `use`.
  - `brewstart_old`: `hlt` before B1.
- **Other refusals:** 404 `no_figure` (`mash`, `boil` or unknown), 400 `bad_body`.

**`POST /figures/{figure}/back`** with body `{"value": 0.85}`: the value in use that the page showed.

- **Answer 200:** `{"applied": {"figure": "hlt", "to": 0.9, "to_built_in": true, "from": 0.85}, "figures": {…}}`.
- **What it writes:** puts `was` back. For `hlt`, `was: null` means the setting goes blank, so BrewStart's built-in applies. For `strike`, it removes `measured`. For `grain`, it sets the old number.
- **Refusals (409):**
  - `not_in_use`;
  - `back_changed`: the setting isn't the value the page showed, because it was changed by hand since.

**`POST /figures/{figure}/out`** with body `{"brew": "<id>", "out": true}` (or `false` to put it back).

- **Answer 200:** `{"figures": {…}}`.
- **It's allowed for every figure**, `mash` and `boil` included, since they have dots too.
- **Refusals:** 404 `no_brew` or `no_figure`.

**The topic `figures`,** sent after each of these and whenever a brew ends: `{"changed": "use" | "back" | "out" | "brew", "figure": "hlt"}`. A screen reads `GET /figures` again on hearing it.

**On an older core:** not reached (no C1).

**C5, from ANALYTICS.md, is folded into C1 and B2.** Each brew's water and watts come from B2's record or the simulated vessel, and `simulated` is worked out from the probes.

---

## B: BrewStart

### B1. Plan with a learned efficiency

**The setting.** Register `BREWSTART_EFFICIENCY` in `settings.py`, beside the language setting (`settings.py:41–48`):

```python
await self.cbpi.config.add("BREWSTART_EFFICIENCY", "", type=ConfigType.NUMBER,
    description="The share of the HLT element's power that heats the water, in %. Blank: the built-in 90 %. "
                "USE on Figures sets it from past brews.",
    source="cbpi4_BrewStart")
```

Keep a value already saved, as the core does for GRAIN_ABSORPTION.

**The plan.** Pass `efficiency=self.get_config_value("BREWSTART_EFFICIENCY", None)` to `plan_ready_by` at both its call sites:
- the check when the form is saved, `brew_start.py:934–939`;
- `_plan`, `:999–1008`.

`efficiency_fraction` already takes 85 or 0.85, and turns a blank, unreadable or out-of-range value into the built-in 0.90 (`schedule.py:251–267`). `_replan` calls `_plan` every 60 s (`REPLAN_INTERVAL_S`), so a BrewStart that's waiting picks up a USE within a minute.

**Say which efficiency it planned with,** wherever BrewStart says how long the water takes, when it isn't the built-in: "… plans 47 min for heating the water, at 85 % from past brews."

**On an older core,** the setting still works if typed in Settings.

**An older BrewStart** doesn't register it. C1 then sends `why_not: "brewstart_old"`, and the page:
- greys USE;
- says "This BrewStart always plans with 90 %. A newer BrewStart plans with a figure from past brews.";
- on a tap, notes "This BrewStart can't take a figure from past brews: it always plans with 90 %." (moment `#old-brewstart`).

### B2. Keep what it planned and what happened

**Why:** BrewStart keeps no outcome today. `_brewstart_planned` holds only the plan, and `reset()` clears it. Nothing records when the water reached Ready_Temp.

**What to log,** each with `self.cbpi.log.log_control_data(series, value)`:
- **When heating starts,** where `_brewstart_heating` is set (`brew_start.py:613–626`), one row each:
  - `brewstart.planned_min`: the minutes planned for heating;
  - `brewstart.ready_by`: the ready time, in seconds on CraftBeerPi's clock;
  - `brewstart.litres`: the water;
  - `brewstart.watts`: Heater_Watts;
  - `brewstart.efficiency`: the fraction used.
- **The first time the water reaches Ready_Temp,** where the move question is asked (`:684–690`): `brewstart.ready` = the water's reading. The row's own time is when it was ready.

That call always writes, unlike `log_change`, which skips a value equal to the last. Guard it with `getattr`, for a core without it.

**What reads them:** C1's `hlt` cells (`planned`, `ready_by`, `early`, and the water and watts for `eff`).

**On an older BrewStart,** the rig's heat-ups have no water figure, so their cells say "BrewStart didn't record its water" (`no_water`). A simulator still has its SimVessel's volume.

---

## S: the strike water box (in the core)

### S1. Keep each brew's forecast as the malt goes in

**When:** the first time the strike water helper sees the malt in for the day's steps. That's where `_look` sets `L.off = "malt_in"` (`strike_controller.py:609–610`).

**What:** append one line to `config/strike_landings.jsonl`:

```json
{"t": 1795327740.0, "steps": ["…"], "unit": "F", "strike": 151.9, "rest": 152.0,
 "lands": [149.6, 152.4], "lo": [ … 61 values … ], "hi": [ … 61 values … ],
 "numbers": { … the answer's numbers, without "key" … },
 "plant": { … strike_plant.json as read then … }, "version": 1}
```

- `strike` is the strike water in force.
- `lo` and `hi` are that strike's forecast (`answer.forecasts`, minute 0 to 60).
- Mark the day (`strike_day.json`, `"landed": true`) so it's written once.
- Skip it, with a log line, when there's no answer for the strike in force.

**Why:** C1's `strike` cells, and S2's fit.

**On an older core:** no landings, so strike cells say "brewed before the strike water box kept its forecasts" (`no_forecast`).

### S2. Fit the tun's steel to the landings

**What:** for the kept landings, run the model again on each one's `numbers` and `plant`. Use `tun_share` from 0.45 to 1.00 in steps of 0.01, every other guess at its central value. Choose the value that brings the forecast's middle over minutes 5–15 closest to the mash probe's average over the same minutes, across every landing (least squares).

**What it keeps:** the value, and each landing's forecast range at it (`fit_lo`, `fit_hi`, at minute 0). Cache it in `config/strike_fit.json`, keyed by the landings file's size and time.

**When:** work it out again in the helper's own process, as USE is worked out, when a landing is added. It can take minutes on the Pi. Until it's done, C1 sends the strike figure's last fit, or `state: "none"` with `"working": true`, and the page says "Working out the tun's steel from the landings: a few minutes."

**Applying it needs nothing new in the model:** C4 writes `measured`, which `read_plant()` already takes. Brew Day's box shows it under MEASURED ON THE RIG once S3 sends it (W4).

**On an older core:** no strike figure.

### S3. Send the numbers the rig has measured

**Why:** once USE fixes a number, its `low` equals its `high`. `_guesses_shown` (`strike_controller.py:751–768`) skips a fixed number (`r.fixed`), so it leaves NOT MEASURED YET and shows nowhere. Brew Day's box (W4) needs it to list the number under MEASURED ON THE RIG.

**What:** the strike state gains `measured`: one entry per guess whose provenance is MEASURED, in `model.SCREEN_ORDER`, sent whenever `guesses` is (`miss` None or `"far"`), else null:

```json
"measured": [{"name": "tun_share", "value": 0.62, "unit": "share", "date": "2026-11-23T10:15:00", "method": "figures", "brews": 4}]
```

- `value` and `unit` as `_guesses_shown` gives a guess's (it converts `transfer_f` to the brewery's unit).
- `date` and `method` are the plant file's `measured.date` and `measured.method`; `brews` is how many brews its `measured.brews` lists, or null when there's no list (a number measured some other way).
- `read_plant()` drops the plant file's `measured` entries once it has fixed the numbers, so the controller keeps them from the file as read.
- Keep `VERSION`: an older Brew Day ignores the new field.

**On an older core:** no `measured` list. Brew Day's box adds nothing, as W4 says.

---

## P: BrewScribe (Porter)

**P1. A sparge water reading** (BrewScribe 0.1.0.dev55, as Porter is building it).
- **The change:** a `volume` entry at a new stage, `sparge_water`. Its `value` is the sparge water: what went from the HLT into the mash tun. When the HLT's levels were typed, its data also keeps `level_before` and `level_after`, the HLT's levels before and after the sparge, in the entry's unit.
- **Why:** grain absorption needs all the water that went into the tun. The `sparge_water` value gives the sparge, and its `level_before` gives the strike: the HLT's fill (`strike_water`) less what was left in it before the sparge.
- **On an older BrewScribe:** grain cells say "no volumes in BrewScribe" (`no_volumes`). A sparge entered without its levels gives `no_levels`.

**P2, not needed.** BrewScribe already marks a simulator's brew (`simulator` in `/api/history`, from a clock more than 5 % fast or slow, `report_data.py:465`), and each CraftBeerPi has its own BrewScribe. Figures takes the brewery's name from BREWERY_NAME.

**P3. Links to Past brews and to one brew.**
- **The change:** `#past` opens Past brews, and `#brew=<day_id>` opens that brew's report. Today only `#stage=` and `#now` are understood (`web/alarms.js:109–116`). Both open in the tab named `brewscribe`, as the BREWSCRIBE tab does.
- **Why:** PAST BREWS IN BREWSCRIBE and THIS BREW IN BREWSCRIBE.
- **On an older BrewScribe:** both open `/brewscribe/#now`.

**P4, not needed.** CraftBeerPi already knows when the malt went in: the strike water helper sees MashIn finish (S1).

**What Figures reads from BrewScribe, unchanged** (C1):
- `GET /brewscribe/api/history`: `brews[].day_id`, `name`, `started_at`, `simulator`.
- `GET /brewscribe/api/days/{day_id}`: entries of kind `volume`, with `data.measurement_stage`, `value`, `unit`, `temperature` and `temperature_unit`, and for `sparge_water` `level_before` and `level_after` (P1); plus `timing` for the step entries.
