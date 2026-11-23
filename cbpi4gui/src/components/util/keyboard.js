// A phone's on-screen keyboard covers the foot of the page without making the page shorter, so what was scrolled into
// view as a box was typed in can sit behind it. Only window.visualViewport says where the keyboard begins. The recipe
// pages' BrewStart time (keepWhenInView) and Brew Day's BrewStart box (bsSayInView) keep the time in words clear of it
// this way.

/* whether an on-screen keyboard is up: the visual viewport shorter than the window by more than a zoom explains */
export function keyboardUp(vv = typeof window !== "undefined" ? window.visualViewport : null) {
  return !!vv && window.innerHeight - vv.height * vv.scale >= 120;
}

/* while the keyboard is up, the page scrolled so el's foot is gap px above the visual viewport's foot, by the
   difference, and no further than keeps keep (the box being typed in) gap px below the visual viewport's top.
   -> the pixels scrolled (0 with no keyboard, or nothing to do) */
export function clearKeyboard(el, {keep = null, gap = 8} = {}) {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  if (!el || !keyboardUp(vv)) return 0;
  const foot = vv.offsetTop + vv.height - gap, bottom = el.getBoundingClientRect().bottom;
  if (bottom <= foot) return 0;
  const room = keep ? Math.max(0, keep.getBoundingClientRect().top - vv.offsetTop - gap) : Infinity;
  const by = Math.ceil(Math.min(bottom - foot, room));
  if (by > 0) window.scrollBy(0, by);
  return by > 0 ? by : 0;
}
