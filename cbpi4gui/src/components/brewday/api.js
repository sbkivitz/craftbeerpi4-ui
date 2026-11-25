// Commands from the brew-day screen to CraftBeerPi.
//
// The rest of the web UI sends a command and forgets it: its API wrappers drop
// every error, so a heater that did not switch looks exactly like one that did.
// Here each call says how it ended, and gives up after five
// seconds, so the button that sent it can say "did not stop" instead of
// nothing.

export const TIMEOUT_MS = 5000;

// -> {ok, status, data, error}: error is null, "http" (CraftBeerPi answered no),
// "timeout" (no answer in 5 s) or "network" (no connection).
export async function call(method, path, body, timeout = TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const init = { method, cache: "no-store", signal: ctl.signal };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(path, init);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : "http" };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e && e.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

export const get = (path) => call("GET", path);
export const post = (path, body) => call("POST", path, body);

// What went wrong, in the words the event log uses: "failed: no answer in 5 s".
export function why(res) {
  if (!res || res.ok) return "";
  if (res.error === "timeout") return `no answer in ${Math.round(TIMEOUT_MS / 1000)} s`;
  if (res.error === "network") return "no connection";
  // it answered, but went on holding the old value (the boil power button checks what it holds afterwards)
  if (res.error === "kept") return "CraftBeerPi kept the old value";
  return `CraftBeerPi said no (${res.status})`;
}

const id = (x) => encodeURIComponent(x);

export const api = {
  actor: (actorId, on) => post(`/actor/${id(actorId)}/${on ? "on" : "off"}`),
  kettle: (kettleId, on) => post(`/kettle/${id(kettleId)}/${on ? "on" : "off"}`),
  target: (kettleId, temp) => post(`/kettle/${id(kettleId)}/target_temp`, { temp }),
  // An action the kettle's logic declares, e.g. BoilPower's set_boil_power {Boil_Power: 60}. CraftBeerPi hands it
  // to the running logic, or keeps it for the next run when the logic allows that.
  kettleAction: (kettleId, action, parameter) => post(`/kettle/${id(kettleId)}/action`, { action, parameter }),
  // The level a switch runs at: the brewer's own, which it comes on at by hand.
  power: (actorId, power) => post(`/actor/${id(actorId)}/set_power`, { power }),
  // The recipe's steps go with START (their ids, in order): CraftBeerPi 4.7.7.post46 starts only if those are still the
  // loaded steps and none of them runs, else answers 409 {error: "recipe_changed" or "already_running", name, steps}.
  // An older CraftBeerPi ignores them.
  start: (steps) => post("/step2/start", Array.isArray(steps) ? { steps } : undefined),
  // The pre-brew check (core 4.7.7.post45): probes, clock and reminders, changing nothing. An older CraftBeerPi answers
  // 405. Given 30 s, so an answer that comes after the screen has stopped waiting for it (5 s) still fills the box in
  precheck: () => call("GET", "/step2/precheck", undefined, 30000),
  stop: () => post("/step2/stop"),
  next: () => post("/step2/next"),
  // Every step back to not started; refused with 409 while a step runs.
  reset: () => post("/step2/reset"),
  // The brew steps emptied: the recipe off Brew Day. Refused while a step runs, BrewStart waiting included: 409
  // {error: "step_running", detail, step}, the detail CraftBeerPi's own sentence.
  clear: () => post("/step2/clear"),
  answer: (notificationId, actionId) => post(`/notification/${id(notificationId)}/action/${id(actionId)}`),
  // OK on a warning or an error without buttons: CraftBeerPi takes it down from every page, and BrewScribe's
  seen: (notificationId) => post(`/notification/${id(notificationId)}/seen`),
  // BrewScribe's readings from Brew Day (BrewScribe 0.1.0.dev51 and later): which reminders take a reading, with its open
  // log and what it would save each as; and a reading saved in that log. CraftBeerPi answers 404 without BrewScribe.
  // The question waits up to 12 s, short of the 15 s between askings, so a page or a server slow to answer still gets
  // its RECORD; nothing on the screen waits on it meanwhile.
  brewDayReadings: () => call("GET", "/brewscribe/api/brew-day/readings", undefined, 12000),
  brewDayReading: (reading) => post("/brewscribe/api/brew-day/readings", reading),
  recipes: () => get("/recipe/"),
  recipe: (file) => get(`/recipe/${id(file)}`),
  brew: (file) => post(`/recipe/${id(file)}/brew`),
  timerStart: () => post("/resttimer/start"),
  timerPause: () => post("/resttimer/pause"),
  timerAdd: (seconds) => post("/resttimer/add", { seconds }),
  // The timers, up to four. Each answers with all of them, as every screen hears them.
  timersAdd: (name, seconds, start) => post("/timers/", { name, seconds, start }),
  timersChange: (timerId, change) => call("PUT", `/timers/${id(timerId)}`, change),
  timersRemove: (timerId) => call("DELETE", `/timers/${id(timerId)}`),
  // a timer removed in the last 10 s back in its place, as it would be now (core 4.7.7.post52)
  timersUndo: (timerId) => post(`/timers/${id(timerId)}/undo`),
  // a timer counting down or paused back to its own time, stopped (core 4.7.7.post52)
  timersReset: (timerId) => post(`/timers/${id(timerId)}/reset`),
  timersStart: (timerId) => post(`/timers/${id(timerId)}/start`),
  timersPause: (timerId) => post(`/timers/${id(timerId)}/pause`),
  timersAddTime: (timerId, seconds) => post(`/timers/${id(timerId)}/add`, { seconds }),
  timersOk: (timerId) => post(`/timers/${id(timerId)}/ok`),
  timersPlus5: (timerId) => post(`/timers/${id(timerId)}/plus5`),
  // The temperature graphs' history: each log from `since` on (brewing clock seconds), about `points` readings each.
  // Reading a day of logs can take longer than a command.
  logWindow: (names, since, points) => call("POST", "/log/window", { names, since, points }, 20000),
  // The strike water helper (its contract, version 1): USE and BACK TO, the HLT's water and the grain's temperature
  // (null: back to the boil kettle's probe). Each carries the recipe's step ids, as START does: CraftBeerPi changes
  // nothing for another recipe (409 recipe_changed). Each answers with what it applied and its whole state. The grain's
  // place (core post59): where the grain spent the night, "garage" with null; a figure is indoors. An older CraftBeerPi
  // ignores it.
  strikeUse: (temp, plan, steps) => post("/step2/strike", { do: "use", temp, plan, steps }),
  strikeBack: (temp, steps) => post("/step2/strike", { do: "back", temp, steps }),
  strikeWater: (vol, steps) => post("/step2/strike/water", { vol, steps }),
  strikeGrain: (grain, steps, place) => post("/step2/strike/grain", place ? { grain, place, steps } : { grain, steps }),
  // The recipe's figures given on Brew Day where BeerSmith's are missing ({grain} in the state's mass_unit, {strike_vol}
  // in its vol_unit), kept with the loaded recipe; and the room's temperature for this brew while the boil kettle's
  // probe can't stand for it (null takes it back).
  strikeRecipe: (figures, steps) => post("/step2/strike/recipe", { ...figures, steps }),
  strikeRoom: (room, steps) => post("/step2/strike/room", { room, steps }),
  // Its whole state, as the websocket's topic "strike" sends it: asked for where a refusal brings none (recipe_changed).
  strikeState: () => get("/step2/strike"),
  // A step's settings, all of them ({name, type, props}): refused with 409 while the step runs, {error} CraftBeerPi's
  // sentence. A step added at its place ({name, type, props, index}, core 4.7.7.post58: 0 is first): refused with 409
  // {error: "begun", detail, step} at or above a step that has begun.
  stepUpdate: (stepId, step) => call("PUT", `/step2/${id(stepId)}`, step),
  stepAdd: (step) => post("/step2/", step),
  // An action a step declares, run on it also while it runs, e.g. BrewStart's change_time {Mode, StartDate, StartTime}
  // (1.2.0.post10). Not run, 400 {error: "action not run", detail}, CraftBeerPi's sentence; the step may say why in a
  // notice of its own, titled with its name.
  stepAction: (stepId, action, parameter) => post(`/step2/action/${id(stepId)}`, { action, parameter }),
  // A setting saved as the Settings page saves it: PUT /config/<name>/ {value}.
  setting: (name, value) => call("PUT", `/config/${id(name)}/`, { value }),
  // The plugins installed, each with its package's metadata ({Name, Version, ...}).
  plugins: () => get("/plugin/list"),
};
