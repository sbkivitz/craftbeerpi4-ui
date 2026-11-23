# The brew-day screen against Amber's interaction-design checklist

The checklist itself is the user skill `interaction-design` (`%USERPROFILE%\.copilot\skills\interaction-design`),
made on 11 Nov 2026 from the three digests in this folder (the request was "study every reference you can find on IxD and
improve yourself to become the best Amber you can be"). This file keeps only where CraftBeerPi's brew-day design
stands against it. References: **F**, **D** and **H** are principles in `ixd-foundations.md`, `ixd-details.md` and
`ixd-hmi.md`.

## Where the brew-day design stands (to raise with the brewer, not to change unasked)
- Red PV / green SV is the brewer's choice (bench PID controllers). The research warns about red-green colour blindness
  and red meaning alarm; the design keeps PV and SV apart by size, place and label, so neither depends on colour. (F16)
- Moving pipes: the high-performance-HMI view is to animate only faults; the brewer chose moving dashes while a pump runs.
  (H5)
- Orange for heating sits next to Prompt Amber for "waiting for you"; they are told apart by words and place. Watch
  for confusion. (H checklist, "Pump or element button")
- Phone targets: the boil power steps are 44 px wide, about 7 mm on the brewer's phone; the research suggests 9 mm or more
  for wet hands. Worth a wet-finger test.
- Hold progress is a moving fill even with reduced motion; the research asks for a non-motion sign too. Small fix.
- The event line's ellipsis can hide a long line's result ("waiting for you"); raised with Brett, 11 Nov.
- A "wipe mode" that freezes touch while the screen is cleaned is an idea from the HMI digest, not yet offered.
- A sensor that stops reporting should read "no sensor", not its last value; check how the screen shows it.
- MANUAL (13 Nov, The By Hand Rule): the H checklist asks for a standing "not regulating" tag in MANUAL. The faceplate
  now shows one only while an element heats by hand (Prompt Amber, then light red past the target, with CraftBeerPi's
  error). MANUAL with nothing heating stays quiet, as the HLT sits that way through every sparge. A real limit on an
  element left on belongs in the rig (D12).
- The title bar shows one question at a time, the most urgent, with "· N more waiting" (12 Nov, evening; H checklist
  "Title bar: top priority plus a count"). A reminder behind the recipe's question shows only in that count and as an
  amber line in LOG. If the brewer misses them, showing two at once is the next thing to try, with a mockup first.
- Confirmations (13 Nov): the screen asks first in two places only, NEXT STEP's skip and RESET, both rare, both unable to
  be undone, both saying what will happen with answers that say what they do and no default (D9; `ixd-details.md`'s
  checklist names "a reset" as the example). Removing a running timer asks once too. Keep the count this low: a third
  routine "Are you sure?" would teach pressing through all of them.
- Another road to heat (13 Nov, checklist section 3): NEXT STEP on a recipe not begun was one (CraftBeerPi starts the
  first step), found while designing RESET and now greyed. In the build, NEXT STEP's question also closes by itself on a
  stopped recipe (raised with Brett).
