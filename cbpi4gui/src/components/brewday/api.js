// Commands from the brew-day screen to CraftBeerPi.
//
// The rest of the web UI sends a command and forgets it: its API wrappers drop
// every error, so a heater that did not switch looks exactly like one that did
// (DEFECTS U1). Here each call says how it ended, and gives up after five
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
  return `CraftBeerPi said no (${res.status})`;
}

const id = (x) => encodeURIComponent(x);

export const api = {
  actor: (actorId, on) => post(`/actor/${id(actorId)}/${on ? "on" : "off"}`),
  kettle: (kettleId, on) => post(`/kettle/${id(kettleId)}/${on ? "on" : "off"}`),
  target: (kettleId, temp) => post(`/kettle/${id(kettleId)}/target_temp`, { temp }),
  start: () => post("/step2/start"),
  stop: () => post("/step2/stop"),
  next: () => post("/step2/next"),
  answer: (notificationId, actionId) => post(`/notification/${id(notificationId)}/action/${id(actionId)}`),
  recipes: () => get("/recipe/"),
  recipe: (file) => get(`/recipe/${id(file)}`),
  brew: (file) => post(`/recipe/${id(file)}/brew`),
  timerStart: () => post("/resttimer/start"),
  timerPause: () => post("/resttimer/pause"),
  timerAdd: (seconds) => post("/resttimer/add", { seconds }),
};
