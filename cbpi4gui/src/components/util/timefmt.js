// Times of day as people read them, the same on every screen, by CraftBeerPi's CLOCK_FORMAT setting: "12-hour"
// (7:00 AM, 11:15:40 PM, no leading zero; midnight 12:00 AM, noon 12:00 PM) or "24-hour" (07:00, 23:15:40). Only
// "12-hour" is 12-hour: a missing setting is a CraftBeerPi from before it, which shows 24-hour itself, and any other value
// reads as 24-hour too, as the core reads it. AM or PM stays on one line with its time (a no-break space).
//
// Only what is written for people comes here. A time kept in a step or sent to CraftBeerPi stays "HH:MM" (BrewStart's
// StartTime is "23:15" whatever the screen shows), and lengths of time ("in 9 h 48 min", "23:41 left") aren't times of
// day. A typed time is read here too, by one rule, so "7" means the same on every screen.
//
// Nothing here reads a clock: the caller gives the moment, CraftBeerPi's (brewNow()) for anything on its clock.

export const TWELVE_HOUR = "12-hour";
export const TWENTY_FOUR_HOUR = "24-hour";
export const NBSP = "\u00a0";
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = n => String(n).padStart(2, "0");

/* CLOCK_FORMAT, from CraftBeerPi's settings as GET /config/ gives them ({CLOCK_FORMAT: {value: "12-hour", ...}}), the
   settings as values alone ({CLOCK_FORMAT: "12-hour"}), or the value itself. Only "12-hour" is 12-hour */
export function clockFormat(source) {
  let v = source;
  if (v && typeof v === "object") v = v.CLOCK_FORMAT;
  if (v && typeof v === "object") v = v.value;
  return String(v ?? "").trim() === TWELVE_HOUR ? TWELVE_HOUR : TWENTY_FOUR_HOUR;
}
export const twelveHour = source => clockFormat(source) === TWELVE_HOUR;

const KEPT = "cbpi.clockFormat";
let kept;
/* CLOCK_FORMAT as a page has CraftBeerPi's settings, the whole list as clockFormat takes it. Until the list has come
   (none at all: the page has just opened) a time drawn takes the format last read on this browser, else 12-hour, the
   setting's own default, so a 12-hour screen doesn't show 24-hour times for a moment as it opens. Each one read is
   kept for that */
export function settingsClockFormat(settings) {
  const known = !!settings && typeof settings === "object" && !Array.isArray(settings) && Object.keys(settings).length > 0;
  if (!known) {
    if (kept === undefined) { try { kept = localStorage.getItem(KEPT); } catch (e) { kept = null; } }
    return kept === TWENTY_FOUR_HOUR ? TWENTY_FOUR_HOUR : TWELVE_HOUR;
  }
  const f = clockFormat(settings);
  if (f !== kept) {
    kept = f;
    try { localStorage.setItem(KEPT, f); } catch (e) { /* storage refused: kept for this page only */ }
  }
  return f;
}

/* a moment's hour, minute and second: a Date (its local time), seconds since 1970 (as brewNow() gives them, shown in
   local time), or "H:MM" / "HH:MM:SS" text; null for anything else */
function hms(moment) {
  if (moment instanceof Date) return Number.isFinite(moment.getTime()) ? [moment.getHours(), moment.getMinutes(), moment.getSeconds()] : null;
  if (typeof moment === "number") return Number.isFinite(moment) ? hms(new Date(moment * 1000)) : null;
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(String(moment ?? ""));
  if (!m) return null;
  const h = +m[1], mi = +m[2], s = m[3] == null ? 0 : +m[3];
  return h < 24 && mi < 60 && s < 60 ? [h, mi, s] : null;
}

/* a time of day in its two parts, for where AM or PM is drawn apart from the digits (the title bar's smaller AM or PM,
   a graph's axis): {digits: "7:00" or with seconds "11:15:40", half: "AM" or "PM"}; with 24-hour times {digits:
   "07:00", half: ""}. null for what isn't a time */
export function timeParts(moment, {seconds = false, format} = {}) {
  const t = hms(moment);
  if (!t) return null;
  const [h, m, s] = t, rest = `:${pad(m)}${seconds ? `:${pad(s)}` : ""}`;
  if (clockFormat(format) === TWENTY_FOUR_HOUR) return {digits: `${pad(h)}${rest}`, half: ""};
  return {digits: `${h % 12 || 12}${rest}`, half: h < 12 ? "AM" : "PM"};
}

/* a time of day: "11:15 PM" or "23:15"; with seconds, "11:15:40 PM" or "23:15:40". ampm false leaves AM or PM off a
   12-hour time ("7:00"), for a box with AM and PM buttons beside it. format: CLOCK_FORMAT, or what clockFormat reads it
   from. "" for what isn't a time */
export function formatTimeOfDay(moment, {seconds = false, format, ampm = true} = {}) {
  const p = timeParts(moment, {seconds, format});
  if (!p) return "";
  return p.half && ampm ? `${p.digits}${NBSP}${p.half}` : p.digits;
}

/* a time of day with its day, kept together on one line: "7:00 AM Sat" (day "weekday"), "7:00 AM 22 Nov" ("date") or
   "7:00 AM Sat 22 Nov" ("both"); dayFirst puts the day first, "Sat 7:00 AM". Only a Date or seconds since 1970 have a
   day; "" for anything else */
export function formatDayTime(moment, {day = "weekday", dayFirst = false, seconds = false, format} = {}) {
  const d = moment instanceof Date ? moment : typeof moment === "number" ? new Date(moment * 1000) : null;
  if (!d || !Number.isFinite(d.getTime())) return "";
  const w = WEEK[d.getDay()], dm = `${d.getDate()} ${MON[d.getMonth()]}`;
  const on = (day === "date" ? dm : day === "both" ? `${w} ${dm}` : w).replace(/ /g, NBSP), t = formatTimeOfDay(d, {seconds, format});
  return dayFirst ? `${on}${NBSP}${t}` : `${t}${NBSP}${on}`;
}

/* the half of the day an "HH:MM" time is in: "am" before noon, "pm" from it */
export const halfOfDay = t => { const x = hms(t); return x && x[0] >= 12 ? "pm" : "am"; };

/* a time as typed, as "HH:MM", or null where it isn't one:
   - "7", "700" and "7:00" are 7:00 in the half of the day the box showed as typing began (half, "am" or "pm"), and
     leading zeros don't change that ("07:00" is "7:00"); "7.30" and "7 30" are 7:30;
   - "7a", "7 am" and "7 a.m." are morning, "7p" and "7 pm" evening, with an hour of 1 to 12; "12a" is midnight;
   - an hour of 13 to 23 is that 24-hour time ("19", "19:00"), 0 is midnight's hour, and "12" alone is noon;
   - minutes are 00 to 59.
   With 24-hour times (format), a time without AM or PM is the 24-hour time whatever the half, and "7 pm" is still 19:00 */
export function parseTypedTime(text, half = "am", {format} = {}) {
  const m = /^\s*(\d{1,2})(?:[:.\s]?(\d{2}))?\s*(?:([ap])\.?\s*(?:m\.?)?)?\s*$/i.exec(String(text ?? ""));
  if (!m) return null;
  let h = +m[1];
  const mi = m[2] == null ? 0 : +m[2], mark = (m[3] || "").toLowerCase();
  if (mi > 59) return null;
  if (mark) {
    if (h < 1 || h > 12) return null;
    h = h % 12 + (mark === "p" ? 12 : 0);
  } else if (h > 23) return null;
  else if (clockFormat(format) === TWELVE_HOUR && half === "pm" && h >= 1 && h <= 11) h += 12;
  return `${pad(h)}:${pad(mi)}`;
}
