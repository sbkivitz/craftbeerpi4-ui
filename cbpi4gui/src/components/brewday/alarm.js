// The brew-day screen's alarm sounds. Scott, 11 Nov, after testing the timers: "The alert sound is kinda weak", then
// "Make the alarm timer sound configurable like I had asked". Settings, BREWDAY_ALARM_SOUND, chooses one. A timer that has
// run out plays the whole burst every 3 s until it is answered; a new message in the title bar plays its first two pulses;
// switching SOUND on plays the whole burst, so it is heard as it will be.
//
// The pulses follow Patterson's guidelines for auditory warnings (CAA Paper 82017, 1982): 100-150 ms long, with 10-30 ms
// rises and falls; the kitchen timer and the alarm have four or more harmonics between 1 and 4 kHz, which are harder to
// drown out than one pure tone. On their loudest 400 ms, K-weighted (ITU-R BS.1770), each is at least 10 dB louder than
// the soft ping, the screen's first sound, kept as it was (measured offline: cbpi-testbench test_ui_alarm_sound.py). No
// burst lasts 1.5 s, so one every 3 s never runs into the next. Scott heard the first three as A, B and C on a listening
// page (11 Nov); C, "Today's beep, held longer", is the High beep.
//
// Plain JavaScript with no imports, so a test can load it as it is. f: the fundamental, Hz. harm: each harmonic's
// strength, the fundamental first. starts: when each pulse begins, in seconds. rise, hold, fall: each pulse's envelope.
export const SOUNDS = {
  kitchen: {label: "Kitchen timer", f: 1000, harm: [0.6, 1, 0.9, 0.7], rise: 0.012, hold: 0.076, fall: 0.012, starts: [0, 0.2, 0.4, 0.6], peak: 0.9},
  alarm: {label: "Alarm", f: 660, harm: [0.7, 1, 0.9, 0.8, 0.6, 0.5], rise: 0.025, hold: 0.1, fall: 0.025, starts: [0, 0.25, 0.5, 1.0, 1.25], peak: 0.9},
  high: {label: "High beep", f: 1760, harm: [1], rise: 0.025, hold: 0.1, fall: 0.025, starts: [0, 0.25, 0.5], peak: 0.9},
  // the screen's first sound: a 1760 Hz sine, 120 ms a pulse, rising to 0.3 in 12 ms and falling away at once
  soft: {label: "Soft ping", f: 1760, soft: true, starts: [0, 0.2, 0.4]},
};
export const DEFAULT_SOUND = "kitchen";

/* the sound a setting names, by its value or its label, in any capitals; blank or unknown, the default */
export function soundOf(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SOUNDS, s)) return s;
  return Object.keys(SOUNDS).find(k => SOUNDS[k].label.toLowerCase() === s) || DEFAULT_SOUND;
}

/* seconds from the first pulse's start to the end of the last of `pulses` of them (all when omitted) */
export function burstSeconds(key, pulses) {
  const r = SOUNDS[soundOf(key)], at = r.starts.slice(0, pulses ?? r.starts.length);
  return at[at.length - 1] + (r.soft ? 0.13 : r.rise + r.hold + r.fall);
}

/* play `pulses` of the sound (all when omitted) on the audio context `ctx`, into `dest`, from `t0` on ctx's clock */
export function play(ctx, dest, t0, key, pulses) {
  const r = SOUNDS[soundOf(key)], starts = r.starts.slice(0, pulses ?? r.starts.length);
  if (r.soft) {
    for (const at of starts) {
      const o = ctx.createOscillator(), g = ctx.createGain(), s = t0 + at;
      o.type = "sine"; o.frequency.value = r.f;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.3, s + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.12);
      o.connect(g).connect(dest); o.start(s); o.stop(s + 0.13);
    }
    return;
  }
  // a periodic wave is scaled to a peak of 1, so `peak` is the pulse's own peak
  const imag = new Float32Array([0, ...r.harm]), wave = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
  for (const at of starts) {
    const o = ctx.createOscillator(), g = ctx.createGain(), s = t0 + at, end = s + r.rise + r.hold + r.fall;
    o.setPeriodicWave(wave); o.frequency.value = r.f;
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(r.peak, s + r.rise);
    g.gain.setValueAtTime(r.peak, s + r.rise + r.hold); g.gain.linearRampToValueAtTime(0, end);
    o.connect(g).connect(dest); o.start(s); o.stop(end + 0.01);
  }
}
