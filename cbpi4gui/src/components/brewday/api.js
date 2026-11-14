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
  start: () => post("/step2/start"),
  stop: () => post("/step2/stop"),
  next: () => post("/step2/next"),
  // Every step back to not started; refused with 409 while a step runs.
  reset: () => post("/step2/reset"),
  answer: (notificationId, actionId) => post(`/notification/${id(notificationId)}/action/${id(actionId)}`),
  // OK on a warning or an error without buttons: CraftBeerPi takes it down from every page, and BrewScribe's
  seen: (notificationId) => post(`/notification/${id(notificationId)}/seen`),
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
  timersStart: (timerId) => post(`/timers/${id(timerId)}/start`),
  timersPause: (timerId) => post(`/timers/${id(timerId)}/pause`),
  timersAddTime: (timerId, seconds) => post(`/timers/${id(timerId)}/add`, { seconds }),
  timersOk: (timerId) => post(`/timers/${id(timerId)}/ok`),
  timersPlus5: (timerId) => post(`/timers/${id(timerId)}/plus5`),
  // The temperature graphs' history: each log from `since` on (brewing clock seconds), about `points` readings each.
  // Reading a day of logs can take longer than a command.
  logWindow: (names, since, points) => call("POST", "/log/window", { names, since, points }, 20000),
};
