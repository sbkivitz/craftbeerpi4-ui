# Interaction-design study digest for the brew-day screen and the Settings page

**How I verified, and how to read this.** I opened primary pages where they loaded. The ACM Digital Library, ScienceDirect and Taylor & Francis blocked automated fetches, so for those papers I relied on abstracts, DOIs and citations from pages I could read.
- ✔ = I opened and read the page.
- ◐ = confirmed from the abstract or a search snippet only (publisher blocked or paywalled).
- ② = secondary summary, not the original.

Principle tags:
- **[Study]** measured data.
- **[Standard]** official guideline.
- **[Opinion]** expert or community practice.
- **[Mine]** my inference for your case.

**Bottom line.**
- Acknowledge every press inside the button within about 0.1 s, but flip it to ON only when the controller answers.
- A 1 s hold is a reasonable guard for heat, though the evidence for it is practice, not trials. Stopping must be instant.
- Use blocking prompts only for things that need an answer by a deadline.
- Size controls in millimetres on the real panel, bigger and further apart for dangerous ones.
- For Settings, the owner is right: group by function and frequency and put risky items last. Alphabetical order only helps lookup by a known name, which search covers.

## 1. Sources

### A. Response time and feedback
- **Nielsen (1993, updated 2014), Response Times: The 3 Important Limits** — https://www.nngroup.com/articles/response-times-3-important-limits/ ✔ — Origin of the 0.1 / 1 / 10 s rule. 0.1 s feels instant, 1 s keeps flow, and past 10 s you need percent-done progress and a way to stop.
- **Miller (1968), Response time in man-computer conversational transactions** — https://doi.org/10.1145/1476589.1476628 ◐. **Card, Robertson & Mackinlay (1991), The Information Visualizer** — https://doi.org/10.1145/108844.108874 ◐ — The research roots. Miller's table is finer than three bands (e.g. 0.1–0.2 s for control activation; summary ②: https://aakinshin.net/vignettes/system-response-time-standards/). The tidy trio is Nielsen's synthesis.
- **Doherty & Thadhani (1982), The Economic Value of Rapid Response Time (IBM)** — https://archive.computerhistory.org/resources/access/text/2024/03/102751398-05-01-acc.pdf ◐ — Productivity rose more than in proportion as response time fell. The "400 ms Doherty threshold" is a later label: https://lawsofux.com/doherty-threshold/ ✔.
- **Myers (1985), Percent-done progress indicators** — https://www.cs.cmu.edu/~bam/papers/percentdoneCHI85.pdf ◐. **Sherwin (2014), NN/g Progress Indicators** — https://www.nngroup.com/articles/progress-indicators/ ✔ — A formal experiment showed people prefer progress indicators. With no feedback people re-send ("extra clicks and double orders").
- **Nielsen (1994), 10 Usability Heuristics** — https://www.nngroup.com/articles/ten-usability-heuristics/ ✔. **Harley (2018), Visibility of System Status** — https://www.nngroup.com/articles/visibility-system-status/ ✔ — Feedback "as quickly as possible (ideally, immediately)". Take no consequential action without telling the user.
- **Home Assistant, MQTT Switch** — https://www.home-assistant.io/integrations/switch.mqtt/ ◐ — Real precedent for optimistic versus waiting. A switch changes state at once only when the device reports no state; otherwise it waits for the device's confirmation and starts as "unknown".
- **Shneiderman et al. (2016), Eight Golden Rules** — https://www.cs.umd.edu/users/ben/goldenrules.html ✔ — Feedback for every action, stronger for rare or major ones. Prevent errors; permit easy reversal.

### B. Errors
- **Reason (1990), Human Error** — https://doi.org/10.1017/CBO9781139062367 ◐. **Reason (1995), Understanding adverse events: human factors** — https://pmc.ncbi.nlm.nih.gov/articles/PMC1055294/ ✔. **Reason (2000), Human error: models and management** — https://pmc.ncbi.nlm.nih.gov/articles/PMC1117770/ ◐ — Slips and lapses are execution failures; mistakes are planning failures. Scolding barely works, "relatively small modifications of equipment" give big gains, and automation relocates human error.
- **Norman (1981), Categorization of action slips** — https://doi.org/10.1037/0033-295X.88.1.1 ◐. **Norman (1983), Design rules based on analyses of human error** — https://cacm.acm.org/research/design-rules-based-on-analyses-of-human-error/ ◐. **Norman (2013), The Design of Everyday Things** — https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/ ◐ — Slip families include mode, description and capture errors. A forcing function makes the wrong action impossible rather than discouraged (interlock, lock-in, lock-out; summary ②: https://living-book.github.io/atlas/concepts/design-of-everyday-things/forcing-functions/). People disable nuisance ones.
- **Laubheimer (2015), NN/g Avoiding Unconscious Slips; Avoiding Conscious Mistakes** — https://www.nngroup.com/articles/slips/ ✔, https://www.nngroup.com/articles/user-mistakes/ ✔ — Experts slip most; use constraints, suggestions and defaults. Mistakes come from wrong mental models, so preview results and follow conventions.
- **Nielsen (2018), NN/g Confirmation Dialogs Can Prevent User Errors — If Not Overused** — https://www.nngroup.com/articles/confirmation-dialog/ ✔ — Eight rules. None for routine actions, be specific, no default "Yes", and a non-standard action for the most dangerous.
- **Raskin (2007), Never Use a Warning When You Mean Undo** — https://alistapart.com/article/neveruseawarning/ ✔. **Anderson et al. (2016), From Warning to Wallpaper** — https://neurosecurity.net/media/JMIS_Anderson_et_al_2016.pdf ◐ (CHI 2015 version: https://doi.org/10.1145/2702123.2702322) — Habit defeats warnings. fMRI shows brain response to repeated warnings falls sharply (habituation); varied warnings resist it.
- **vocab.design, Hold to confirm** — https://vocab.design/hold-to-confirm ✔ — A community pattern, not a trial. 0.6–1 s is typical, under 0.5 s is a slow click, over 1.5 s feels broken. Show progress at once, label it "Hold to…", and give a keyboard path. Platform long-press defaults: Android 500 ms (https://android.googlesource.com/platform/frameworks/base/+/72c82ab9923025a91bbabb32e56bfea27bfd083b/core/java/android/view/ViewConfiguration.java ◐), iOS 0.5 s (https://developer.apple.com/documentation/uikit/uilongpressgesturerecognizer/minimumpressduration ✔).
- **WCAG 2.5.2 Pointer Cancellation** — https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html ✔ — Act on release or allow abort. Lifting early to cancel fits a hold.

### C. Modes
- **Laubheimer (2019), NN/g Modes in User Interfaces** — https://www.nngroup.com/articles/modes/ ✔. **Nielsen (1995), Spring-Loaded Modes** — https://www.nngroup.com/articles/spring-loaded-modes/ ✔ — A mode means the same input gives a different result depending on hidden state. Use at least two redundant cues, and use separate controls where a mix-up could cause physical harm. "Quasimodes" (active only while held) can't be forgotten but are less discoverable.
- **Raskin (2000), The Humane Interface** — https://www.oreilly.com/library/view/humane-interface-the/0201379376/ ◐ — Source of "quasimode" and the case for modeless design.
- **Sarter & Woods (1995), How in the world did we ever get into that mode?** — https://doi.org/10.1518/001872095779049516 ◐ — Pilot studies: more automation modes make "what mode am I in?" hard to track.

### D. Notifications, interruptions, alarms
- **Flaherty (2024), NN/g Indicators, Validations, Notifications** — https://www.nngroup.com/articles/indicators-validations-notifications/ ✔. **Neusesser & Sunwall (2023), Error-Message Guidelines** — https://www.nngroup.com/articles/error-message-guidelines/ ✔ — Choose by type, urgency and need to act. Indicators are contextual and passive and sit beside what they describe. Put errors at their source, and never rely on colour or animation alone.
- **McFarlane (2002), Four methods for coordinating interruption** — https://www.interruptions.net/literature/McFarlane-HCI02_2.pdf ◐. **Horvitz et al. (2003), Models of attention** — https://doi.org/10.1145/636772.636798 ◐. **Mark, Gudith & Klocke (2008), Cost of interrupted work** — https://doi.org/10.1145/1357054.1357072 ◐ — With 36 people, negotiated interruption was best overall and immediate was best when timeliness is critical. Attention is scarce; interrupted work finishes faster but with more stress.
- **Joint Commission (2013), Sentinel Event Alert 50** — https://digitalassets.jointcommission.org/api/public/content/f65e5c9df2b94000a99445e0a7877007?v=6b2e5ed0 ◐. **Cvach (2012), Monitor alarm fatigue** — https://pubmed.ncbi.nlm.nih.gov/22839984/ ◐ — 98 alarm-related events (2009–mid-2012), 80 deaths, from voluntary reports. The 72-study review finds false alarms cause a "cry wolf" effect and staff disabling alarms.
- **ISA-18.2 / EEMUA 191 via summaries ②** — https://hmilibrary.com/learn/alarm-management.html, https://cyntech.io/kb/alarm-rationalisation — An alarm must call for a response. About 1 per operator per 10 minutes long-term, 3–4 priorities, and silence is not acknowledge. The standards are paywalled.
- **Apple HIG Alerts; Notifications** — https://developer.apple.com/design/human-interface-guidelines/alerts ✔, https://developer.apple.com/design/human-interface-guidelines/notifications ✔ — Use alerts sparingly, not for mere information or common undoable actions. Don't repeat notifications; don't rely on sound alone.
- **Material 3 Snackbar; Dialogs** — https://m3.material.io/components/snackbar/guidelines ◐, https://m3.material.io/components/dialogs/guidelines ◐ — Snackbars are low priority and last 4–10 s, but persist if they carry an action. Avoid auto-dismiss on web without inline feedback. Dialogs are modal and stay until answered.
- **Microsoft Dialogs; InfoBar** — https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/dialogs ✔, https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/infobar ✔ — Dialogs block until dismissed. InfoBar is persistent inline status, "not for time-sensitive alerts".
- **GNOME HIG Dialogs, Toasts, Banners** — https://developer.gnome.org/hig/patterns/feedback/dialogs.html ✔, https://developer.gnome.org/hig/patterns/feedback/toasts.html ✔, https://developer.gnome.org/hig/patterns/feedback/banners.html ✔ — Toasts are transient (use them for undo); banners show ongoing states. Alert dialogs only when a response is essential; undo usually beats confirmation.
- **WCAG 2.2.1; 4.1.3; ARIA alertdialog** — https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html ✔, https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html ✔, https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/ ✔ — A 5 s toast is fine only if the information is available elsewhere. Status changes must reach screen readers without stealing focus.


---

**PART 2 of 2** (Sections 1E–1G, then Principles 1–9)

### E. Touch, hands, distance
- **WCAG 2.5.8 and 2.5.5** — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ✔, https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html ✔ — AA is 24×24 CSS px (or spacing); AAA is 44×44. Go bigger when the control is frequent, hard to undo, hard to reach or part of a sequence.
- **Apple HIG Accessibility; Gestures** — https://developer.apple.com/design/human-interface-guidelines/accessibility ✔, https://developer.apple.com/design/human-interface-guidelines/gestures ✔ — 44×44 pt (minimum 28). About 12 pt padding around bezeled controls and 24 pt around unbezeled ones. Offer a second way to act.
- **Google, Touch target size** — https://support.google.com/accessibility/android/answer/7101858 ◐ — 48×48 dp ≈ 9 mm, at least 8 dp apart; 7–10 mm recommended.
- **Microsoft, Targeting** — https://learn.microsoft.com/en-us/windows/apps/develop/input/guidelines-for-targeting ✔ — 7.5 mm (40 px at 135 PPI). More padding, away from edges, for severe-consequence or frequent targets.
- **Parhi, Karlson & Bederson (2006)** — https://www.microsoft.com/en-us/research/publication/target-size-study-for-one-handed-thumb-use-on-small-touchscreen-devices/ ◐ — One-thumb use: 9.2 mm for single taps, 9.6 mm for serial taps. No fewer errors beyond that.
- **Hoober (2013; 2017)** — https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php ✔, https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php ✔ — From 1,333 field observations: grips change every few seconds and thumb-sweep charts are wrong. About 7 mm (centre) and 12 mm (corner) targets cover 95% of taps. Keep dangerous items far from others; pixel-based standards are "useless".
- **Bi, Li & Zhai (2013), FFitts law** — https://doi.org/10.1145/2470654.2466180 ◐ — Finger touch has a fixed precision limit, so classic Fitts' law fails for small targets (earlier work: about 12% errors at 5 mm).
- **Tung et al. (2018), RainCheck** — https://faculty.washington.edu/wobbrock/pubs/icmi-18.01.pdf ◐ — Water and wet fingers corrupt capacitive touch. Their filter raised touch accuracy by 47.9%.
- **FAA HF-STD-001B §5.3.1.9 / NRC NUREG-0700 Rev. 4 §1.3.1-4** — https://www.nrc.gov/regulations-legislation/nureg-series-publications/publications-prepared-by-nrc-staff/human-system-interface-design-review-guidelines-nureg-0700/r4 ◐ — Characters at least 16 arcminutes tall (1′ = 1/60 of a degree), 20–22′ preferred. The figures come from a secondary quote ②. **MDN Screen Wake Lock** — https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API ✔ — Keeps the screen on; show that it's active and let users disable it.

### F. Accessibility basics
- **WCAG 2.2 Understanding pages** — 1.4.3 contrast https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html ✔ (4.5:1; 3:1 large text) · 1.4.11 https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html ✔ (3:1 for controls and their states) · 1.4.1 https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html ✔ · 2.4.7 https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html ✔ · 2.4.13 https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html ✔ (AAA: at least 2 px, 3:1) · 2.3.3 https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ✔ · 4.1.2 https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html ✔ · 1.4.10 https://www.w3.org/WAI/WCAG22/Understanding/reflow.html ✔ (works at 320 CSS px wide).
- **MDN prefers-reduced-motion** — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ✔ — Honour the OS setting; widely supported since Jan 2020.
- **Budiu (2020), NN/g Dark Mode vs. Light Mode** — https://www.nngroup.com/articles/dark-mode/ ◐ — A literature review. Light mode performs better for normal vision; dark may help some low-vision users. NN/g ran no tests of its own.

### G. Settings, forms, information architecture
- **W3C WAI Forms: Grouping, Labels, Instructions** — https://www.w3.org/WAI/tutorials/forms/grouping/ ✔, https://www.w3.org/WAI/tutorials/forms/labels/ ✔, https://www.w3.org/WAI/tutorials/forms/instructions/ ✔ — Group related controls visually and in code (fieldset/legend or role=group) with short legends. Every control gets a visible, linked label. Put instructions before the form and inside labels.
- **Whitenton (2016), NN/g Website Forms Usability** — https://www.nngroup.com/articles/web-form-design/ ✔. **Kendrick (2018), Toggle-Switch Guidelines** — https://www.nngroup.com/articles/toggle-switch-guidelines/ ✔ — Forms that follow guidelines got 78% error-free first submissions versus 42% (Seckler et al., as cited). Toggles act instantly, labels start with the keyword and describe the ON state, and toggles shouldn't be mixed with Save-style controls.
- **Nielsen (2006), Progressive Disclosure** — https://www.nngroup.com/articles/progressive-disclosure/ ✔ — Show a few key options and defer rare ones to a secondary screen.
- **Nielsen (2010), Alphabetical Sorting Must (Mostly) Die** — https://www.nngroup.com/articles/alphabetical-sorting-must-mostly-die/ ✔. **Whitenton (2015), Top 3 IA Questions** — https://www.nngroup.com/articles/ia-questions-navigation-menus/ ✔ — A–Z helps only when people know the exact name. Otherwise group logically or by sequence, time, importance or frequency. There is no preset number of categories.
- **Tankala & Sherwin (2024), Card Sorting** — https://www.nngroup.com/articles/card-sorting-definition/ ✔. **Laubheimer (2023), Tree Testing** — https://www.nngroup.com/articles/tree-testing/ ✔ — In a card sort, people group labelled cards, which reveals groups and names. In a tree test, people hunt for items in a text-only menu, which checks findability.
- **Wurman, LATCH (from Information Anxiety 2)** — https://www.informit.com/articles/article.aspx?p=130881&seqNum=6 ◐ (page wouldn't load; snippet read). **Rosenfeld & Morville, Organization Schemes** — https://www.oreilly.com/library/view/information-architecture-for/0596000359/ch05s03.html ◐ — Information can only be organised by Location, Alphabet, Time, Category or Hierarchy; alphabet suits huge sets of known names. Exact schemes (alphabet, date, place) differ from ambiguous ones (topic, task, audience).
- **Larson & Czerwinski (1998)** — https://www.microsoft.com/en-us/research/publication/web-page-design-implications-memory-structure-scent-information-retrieval/ ◐ — Depth hurts: three levels caused more search problems than two, regardless of breadth.
- **Spool (2011), Do users change their settings?** — https://archive.uie.com/brainsparks/2011/09/14/do-users-change-their-settings/ ◐. **Mackay (1991), Triggers and barriers to customizing software** — https://perso.lisn.upsaclay.fr/mackay/pdffiles/CHI91.Triggers.pdf ◐ — Under 5% of users changed any of 150+ Word settings (old and informal; tinkerers differ). People customise at trigger moments.
- **Platform settings guidance**
  - Apple — https://developer.apple.com/design/human-interface-guidelines/settings ✔: few settings, infrequent ones only, task options stay in the task.
  - Android — https://developer.android.com/design/ui/mobile/guides/patterns/settings ✔: frequent actions stay in context, "polite defaults", 15 or more settings go in subscreens, add search for deep trees.
  - Microsoft — https://learn.microsoft.com/en-us/windows/apps/design/app-settings/guidelines-for-app-settings ✔: toggles for on/off, radios for up to 5, instant effect, section headers, one expander level.
  - GNOME — https://developer.gnome.org/hig/patterns/controls/menus.html ✔ and https://developer.gnome.org/hig/patterns/containers/boxed-lists.html ✔: 3–12 items, submenus 3–6, order by importance, task order or frequency; preference lists follow the same rules.
- **"Danger zone" posts ②** — https://setting.page/danger-zone-ux-for-settings, https://21st.dev/blog/react-settings-page-components — Convention only (risky items last, separated, typed confirmation). No studies.

## 2. Principles

**Time and feedback**
1. **Three time bands.** At 0.1 s or less it feels like you did it; at 1 s or less it keeps your train of thought; past 10 s you need progress and a way to stop. [Study → rule of thumb] Nielsen 1993.
2. **Acknowledge in place, fast; confirm later.** Show "pressed/sending" on the control within about 0.1 s even if the real answer takes longer. [Standard] NN/g heuristic 1; Apple Gestures; Microsoft ("immediate on touch down"). If answers normally take under 0.3 s, delay the pending style about 100–200 ms to avoid flicker. [Mine]
3. **Silence causes repeat taps.** Without feedback people re-send ("extra clicks and double orders"). Ignore repeats while a command is pending. [Opinion] NN/g 2014; second half [Mine].
4. **Optimistic update** (show the result before the system confirms) suits cheap, reversible, rarely failing actions. For a device that reports its own state, wait for the report (Home Assistant's default) and show "pending". "Unknown/no answer" is its own state, not "off". [Opinion; no controlled comparison found]
5. **State lives where the command lives.** Indicators sit beside what they describe; errors sit at their source. [Opinion + proximity principle] NN/g 2023, 2024.
6. **Don't over-read "400 ms".** The 1982 IBM work measured productivity at terminals; "threshold" is a later label. [Study, old]

**Errors**
7. **Slip, lapse, mistake.** A slip is the right goal with the wrong action (experts slip most). A lapse is a forgotten step. A mistake is a wrong plan from a wrong mental model. Slips need constraints, defaults, undo and forcing functions; mistakes need clear labels and previews. [Study/theory] Reason; Norman; NN/g.
8. **Design, not discipline.** Small equipment changes bring large safety gains; scolding and training barely help; automation moves human error rather than removing it. [Study/review] Reason 1995.
9. **Confirmations wear out.** Brain response to repeated warnings falls sharply (habituation). Confirm only rare, serious acts, name the consequence, use no default "Yes", and use a non-standard action for the worst. [Study] Anderson 2016; [Opinion] NN/g, Raskin.



10. **Undo when you can; friction before when you can't.** Apple: no alerts for common undoable actions, but an alert for uncommon destructive ones that can't be undone. GNOME: undo usually beats confirmation, and where undo is impossible, confirm. A heater can't be "un-heated", so the friction goes before the action. [Standard]
11. **Hold-to-confirm is a physical, cancellable confirmation.** A reflex (a tap) can't commit it, and lifting cancels it. I found no controlled study. The platform long-press default is 0.5 s. Community guidance is 0.6–1 s, and over 1.5 s "feels broken", so your 1 s sits at the top of the range and needs progress from the first instant. Label it "Hold to start" and give a keyboard path. [Opinion/Standard] vocab.design; WCAG 2.5.2.
12. **Easy to stop, hard to start, and the UI is not the safety system.** Hold to start heat, tap once to stop, and keep "Stop all" always reachable. Real limits (max temperature, dry-fire protection, watchdog, hardware interlock) belong in the controller, because a UI guard only reduces slips. [Mine] Reason 1995 (automation relocates error); Norman's interlock and lock-out logic.
13. **Consequence sets size and spacing.** Severe-consequence or frequent targets get more padding and distance from edges (Microsoft). Dangerous items go far from others (Hoober). Targets grow when the action is hard to undo (WCAG 2.5.5). [Standard/Study]

**Modes**

14. **A hidden mode is a slip factory.** The same input giving a different result depending on invisible state is a classic slip (Norman 1981), and pilots struggle to track modes (Sarter & Woods 1995). Show state with at least two redundant cues. Where a mix-up could cause physical harm, use separate controls. [Study + Opinion]
15. **Quasimodes** (active only while held) can't be forgotten, but they are less discoverable and tiring for long use. That makes them right for "hold to start" and wrong for "stay on". The resulting heating state is a latched mode, so make it big on the faceplate. [Opinion; last part Mine]

**Notifications and alarms**

16. **Match the channel to urgency and need to act.** Use a passive indicator, then an inline message, then a toast or snackbar (low priority, transient), then a banner (ongoing state), then a modal prompt (must respond). [Standard] NN/g 2024; Apple; Material; Microsoft; GNOME.
17. **Stay until answered only when someone must decide, or the information exists nowhere else.** Material: dialogs stay until answered, snackbars with an action persist, others last 4–10 s. WCAG 2.2.1: a 5 s toast is fine only if the information is available elsewhere. [Standard]
18. **Interruptions cost.** Negotiable alerts suit most events; immediate ones only when timeliness is critical (McFarlane, 36 people). Interrupted work is faster but more stressful (Mark 2008). [Study]
19. **Alarm fatigue is real.** Too many low-value alarms teach people to ignore or disable them (Cvach 2012). The Joint Commission logged 98 events and 80 deaths, from voluntary reports. ISA-18.2 says an alarm must need a response. EEMUA 191 sets about 1 per 10 minutes long-term (② summaries). Reserve blocking, audible alarms for deadline-bound actions such as a hop addition or end of mash. [Study + Standard; last sentence Mine]
20. **Silence is not acknowledge, and don't nag.** Let people mute sound separately from answering. Keep the visual until resolved and send one prompt per event (Apple: don't repeat notifications). Never make sound the only channel (Apple). [Opinion/Standard]

**Touch and environment**

21. **Sizes disagree, so use millimetres.** WCAG: 24 px (AA) and 44 px (AAA). Apple: 44 pt (minimum 28). Google: 48 dp, which it says is ≈9 mm. Microsoft: 7.5 mm. One-thumb study: 9.2–9.6 mm. Hoober: 7 mm centre, 12 mm corners. The same "44" is about 7 mm on a 6.1″ iPhone and about 12 mm on a 24″ 1080p monitor (my arithmetic), so measure on the real panel. [Standard/Study]
22. **Spacing counts as much as size.** Apple: about 12 pt around bezeled controls and 24 pt around unbezeled ones. Google: at least 8 dp. WCAG: the 24 px circle rule. Finger touch has a built-in error floor, so small targets stay error-prone even if you slow down (FFitts law; about 12% errors at 5 mm in earlier work). [Study]
23. **Hands vary.** Grips change every few seconds. About 75% touch with one thumb and fewer than 50% use a one-handed grip (Hoober). Thumb-zone charts mislead, so don't hide critical controls by "thumb zone". [Study, field observation]
24. **Wet hands.** Water makes capacitive screens misread touches (a "situational fat finger"), and gloves or dry skin can fail altogether. Use bigger targets, activate on release inside the target (WCAG 2.5.2), and test with wet fingers on the real touch controller. A hold probably also filters stray droplets, which is my inference. [Study + Mine] Tung 2018; Hoober 2017.
25. **Read from across the garage.** Capital letters should be at least 16′ tall, with 20–22′ preferred. Height = 2 × distance × tan(angle/2). At 3 m that is about 14 / 17.5 / 19 mm for 16′ / 20′ / 22′, and at 5 m about 23 / 29 / 32 mm. At 3 m, 20′ is about 63 px of capital height on a 24″ 1080p screen. [Standard via ②; arithmetic mine] Build two layers: a glance layer (state, temperatures, timers) and a reach layer (controls).

**Accessibility**

26. **Contrast.** Text needs 4.5:1 (3:1 if large). Control edges and state indicators need 3:1. [Standard] NN/g's literature review finds light mode better for normal vision and dark mode helpful for some low-vision users. Choose by environment and compensate with size and weight. [Study review]
27. **Never colour alone.** ON, PENDING and FAULT also need an icon, text or position. [Standard] WCAG 1.4.1; Apple; NN/g.
28. **Names, states, focus, motion.** Accessible names include state ("Mash element, off, hold to start"). Announce status changes without moving focus (4.1.3). Blocking prompts use role=alertdialog. Keep focus visible (2.4.7; AAA: at least 2 px and 3:1). Honour reduced motion, and show hold progress in a non-motion way too (text or steps). [Standard]

**Settings and forms**

29. **Group by function and frequency; A–Z only for known-name lookup.** Nielsen 2010 calls A–Z "useless" when people don't know the names and "harmful" when items have an inherent logic. Better orders are sequence, logical groups from a card sort, time, or importance and frequency. LATCH, GNOME and Android agree. The owner's instinct is right, and search covers lookup by name. [Opinion backed by IA practice; no brewing-specific study]
30. **Count and depth.** There is no magic number (NN/g 2015). Two levels beat three (Larson & Czerwinski 1998). Android: put 15 or more settings in subscreens. GNOME: 3–12 items, submenus 3–6. Microsoft: radios for up to 5 choices and expanders one level deep. [Study + Standard]
31. **Settings are for infrequent, general options.** Task options stay in the task (Apple, Android, Microsoft). People rarely change settings (Spool: under 5% of Word users; Mackay: they customise at trigger moments). But brewers tinker, so give setup a guided path. [Standard; Study (old)]
32. **Safe defaults, advanced behind one level, risky last.** Defaults should be safe and common (Android, Apple). Rare options sit behind progressive disclosure, meaning a few key options first and the rest on request (Nielsen 2006; Microsoft expander). "Danger zone" placement is practitioner convention, not studied. Pair it with NN/g's confirmation rules. [Standard/Opinion]
33. **Labels and descriptions.** Use keyword-first noun phrases, not questions, and describe the ON state (say it aloud and add "on/off"). Give a visible label, one line of helper text and units. Forms that follow such guidelines got 78% error-free first submissions versus 42%. [Standard + Study via NN/g]
34. **Instant or Apply: pick one per section.** Toggles act immediately. Settings needing validation (pin numbers, calibration) go in an Apply section with test and revert. [Opinion] NN/g toggles; Microsoft.
35. **Group visibly and in code; on a phone use one column and drill-in.** Use headings or boxes plus fieldset/legend or role=group. Reflow at 320 CSS px and keep rows at least 44 pt / 48 dp. [Standard]
36. **Test the structure.** Use a card sort to find groups and names, and a tree test to check findability. [Method] NN/g.

### Where sources disagree
- **Confirm versus undo.** NN/g keeps (sparing) confirmations for serious, non-undoable actions. Raskin, GNOME and Apple prefer undo and drop warnings for undoable actions. They agree on your heater case: undo isn't available, so guard before.
- **Target sizes.** The numbers range from 24 px to 48 dp, 7.5 mm, 9.6 mm and 12 mm. Hoober says pixel-based standards are unreliable and older 22 mm ISO sizes assumed other touch technology. Use millimetres.
- **Alphabetical.** Nielsen 2010 is blunt ("mostly die"). NN/g 2015 says it depends on three questions: is there a better principle, are the names known, and how many are there. Both land on A–Z for known names only.
- **Dark versus light.** NN/g's reading of the literature favours light for normal vision, while garage glare and night use may favour dark. I found no garage-specific test.
- **Auto-dismiss.** Material allows 4–10 s snackbars but warns against auto-dismiss on web without inline feedback, and WCAG 2.2.1 wants alternatives. Never auto-dismiss anything someone must act on.
- **Optimistic versus wait.** Consumer apps lean optimistic. Home Assistant waits when the device reports state. I found no controlled comparison.
- **Hold length and thumb zones.** No study sets a hold duration; yours is at the top of the community range. Popular thumb-zone charts conflict with Hoober's field data.

### Gaps and unverified items
- ACM Digital Library blocked my fetches. Miller 1968, Card 1991, Parhi 2006, FFitts 2013, Horvitz 2003, Mark 2008, Norman 1981/1983 and Sarter & Woods 1995 rest on abstracts or citations (◐).
- The ISA-18.2 and EEMUA 191 numbers and the 16′ / 20–22′ character-height figures come from secondary summaries. Check them against the NUREG-0700 text.
- I found no controlled study of hold-to-confirm, or of settings ordering for hobbyist hardware. NN/g's Customization report is paywalled. GNOME's dedicated preferences page didn't load, so I used its menus and boxed-lists pages. The Joint Commission's canonical URL returned 404, so I used the asset link.
- I couldn't verify the Bailey & Konstan (2006) numbers and left them out. Spool's "under 5%" is old and informal. Hoober's 2013 column is partly superseded by his 2017 one, and I used both.

## 3. Two applied checklists

### A. Commands, feedback, errors and alerts (control screen)

**Press → answer**
- [ ] Every press shows feedback inside that control within about 100 ms (pressed, holding or sending). (P2)
- [ ] Each control has non-colour-only states: idle · holding (progress) · sending · confirmed ON · failed/no answer · unknown/offline.
- [ ] Only the controller's reply flips ON/OFF. Show "commanded" and "confirmed" separately if they can differ. (P4)
- [ ] Set the no-answer timeout from measured controller latency. At timeout show "No answer — state unknown", not OFF. Past 10 s add elapsed time and retry/cancel. (P1)
- [ ] While a command is pending, repeat presses do nothing harmful, and stop/cancel is always accepted.

**Hold-to-start**
- [ ] The fill starts on touch-down. Lifting before 1 s cancels with a quiet "Not started". The label says "Hold to start".
- [ ] A keyboard or switch path exists: hold a key for at least 1 s (ignore key-repeat), or arm then confirm. The accessible name says "hold".
- [ ] Hold progress is readable without animation (text such as "Holding… 0.6 s", or a stepped fill).
- [ ] Stop, off and "Stop all" are single taps, always visible, never behind a hold or dialog.

**Touch and environment**
- [ ] Measure sizes in millimetres on the real panel and the phone. Use at least 9–10 mm for all controls and about 12 mm or more for heater and pump buttons (my judgement). Leave gaps of at least 12 pt / 8 dp, wider between heater and pump, and keep them off screen edges.
- [ ] Activate on release inside the target. Test with wet, soapy and gloved fingers on the actual touch controller, and look for ghost touches.
- [ ] The glance layer is legible at your real distance (about 17.5 mm capitals at 3 m, 29 mm at 5 m). It shows vessel name, temperature versus target, element and pump state, and timer. Details live within arm's reach.
- [ ] Contrast is at least 4.5:1 for text and 3:1 for control edges and states. Aim higher for distance and glare, and give every state at least two cues.

**Alerts and prompts**
- [ ] Triage every message: indicator → inline note → toast (4–10 s, also logged) → banner (ongoing state) → blocking prompt (someone must act by a deadline).
- [ ] A blocking prompt says what happened, what to do and by when. It uses verb buttons ("Add hops", "Snooze 2 min"), has no default on destructive choices, stays until answered, and uses role=alertdialog.
- [ ] Sound can be muted separately from answering. Send one prompt per event, escalate once on a schedule rather than endlessly, and show the snooze length.
- [ ] Sound is never the only channel. Add visual and vibration cues, keep the screen awake (Wake Lock) with a visible indicator, and test audibility at garage distance and with the phone in a pocket.
- [ ] Confirmation dialogs only for rare, serious actions such as deleting a recipe or a reset. Prefer an Undo toast for reversible actions.
- [ ] Count blocking prompts in a normal brew. If there are more than a handful, demote some.

**Modes, access, safety**
- [ ] Hidden modes (manual, auto, step) are shown on the faceplate with two cues. Risky alternatives are separate controls.
- [ ] Accessible names include state, status changes are announced without moving focus, focus is visible, and text scales to 200%.
- [ ] The controller enforces limits independent of the UI, and every command and answer is logged.

### B. Settings page

**Structure**
- [ ] Inventory every setting. Tag each by task (setup/hardware, temperature control, timers and alarms, display, network/system), frequency (once, per brew, rare) and risk (cosmetic, process, hardware-safety).
- [ ] Move per-brew options out of Settings onto the brew screen or faceplates. Settings keeps infrequent, general options.
- [ ] Group by function in brewers' words, not code key names. Use roughly 5–9 top-level groups and at most 2 levels (my judgement). Merge groups under 3 items, and use subscreens at 15 or more.
- [ ] Order groups by setup sequence or frequency, and items by importance or task order. Use A–Z only for long lists of same-type items with known names.
- [ ] Add a visible search at the top once there are 15 or more settings. Index labels, descriptions and synonyms ("PID", "hysteresis", "calibration").

**Each setting**
- [ ] Label: keyword-first noun phrase, ON-state wording, passes the "say it aloud + on/off" test. Description: one line on what changes, with unit and range. Also show the current value and a default marker. No placeholder-as-label.
- [ ] Choose controls by type: toggle for instant on/off, radios for up to 5 options, stepper or number field for ranges with units and limits. Validate inline next to the field, with a fix.
- [ ] One apply model per section. Toggles apply immediately; hardware, calibration and pin changes use Apply with Test and Revert. Never mix them in one block.
- [ ] Defaults are safe and common. Offer per-setting and per-group reset, and a "changed from default" marker.

**Rare and risky**
- [ ] Put an "Advanced" group collapsed, one level deep, with consequence text.
- [ ] Put risky settings last in a separate section, with a plain-words consequence ("This clears sensor calibration"). Make the friction proportional to the damage: a confirmation naming what is lost, and a non-standard action only for the worst (factory reset). Offer export, backup or undo first.

**Layout and access**
- [ ] Group visibly (headings or boxed sections) and in code (short fieldset/legend or role=group). Link labels programmatically and place them above fields on phones.
- [ ] Phone: one column, a list that drills into subpages, a sticky search, rows at least 44 pt / 48 dp tall and tappable across the whole row. Reflow at 320 CSS px with no horizontal scroll, and keep the Apply bar visible.
- [ ] Use the same vocabulary as the brew screen, and meet WCAG contrast, focus and names with text scaling to 200%.

**Validate**
- [ ] Card-sort with several brewers using their own settings. Then tree-test the proposed structure with tasks ("change the mash temperature unit", "recalibrate a sensor"). After launch, watch search queries and rename or move items accordingly.

