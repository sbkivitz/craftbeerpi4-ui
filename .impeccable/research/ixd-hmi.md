# Study digest: control screens, alarms and alarm sounds for a small brewery

This is web research only. I didn't write or edit any files, although the fetch tool auto-saved two oversized PDF downloads to your Temp folder (see the last note). The standards are paywalled, so for each I give the publisher's page plus a free summary or contents list. I couldn't read the paid texts, so I can't tell "shall" from "should".

Labels used below:
- **Rule**: a standard or law says it, as far as public text shows.
- **Guidance**: published advice or a benchmark.
- **Study**: people measured it.
- **Opinion**: a practitioner's or vendor's view.
- **My guess**: my extension to your brewery.

**Short version.** Professional operator screens ("HMIs") keep normal readings quiet and spend colour, motion and sound on trouble. An alarm must need a human action, and too many alarms is the usual failure. Your red PV / green SV and orange "heating" lamp both clash with convention.

## 1. Sources

### A. Operator screens

**[1] ANSI/ISA-101.01-2015, *Human Machine Interfaces for Process Automation Systems*** (ISA; with TR101.01-2022 *HMI Philosophy* and TR101.02-2019 *Usability and Performance*) — https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards · free contents list https://www.isa.org/getmedia/ea6c26ed-a75f-47ea-9a22-c1bd786a0192/isa-101-01-toc.pdf · summary https://www.tdl-ia.com/insights/isa-101-hmi-design-philosophy-style-guide-display-hierarchy.html — The standard behind "grey screens, colour for trouble". It covers a screen set's whole life (philosophy, style guide, parts library). It has sample displays for four levels: overview, unit control, unit detail, support. Per the summary, each plant's style guide picks the palette.

**[2] Rockwell *Process HMI Style Guide* (PROCES-WP023)** — https://literature.rockwellautomation.com/idc/groups/literature/documents/wp/proces-wp023_-en-p.pdf (read via the summary above) — A worked ISA-101 example:
- light-grey background; bright colour only for alarms; never colour alone;
- navigation in fixed places; an alarm banner on every screen;
- only unacknowledged alarms blink, never text;
- screens open in 2 s (levels 2–3) or 5 s (levels 1, 4).

**[3] *The High Performance HMI Handbook*, Hollifield, Oliver, Nimmo, Habibi (PAS), 2008** — https://www.kobo.com/ca/en/ebook/the-high-performance-hmi-handbook · PAS overview https://www.isa.org/getmedia/06130a38-f7af-4b35-8c9c-2c34f25c1977/The-High-Performance-HMI-Overview-v2-01.pdf — Origin of the approach:
- Show each value beside "what good looks like".
- Pipe diagrams covered in numbers are "low performance".
- Avoid spinning pumps, animated flames, 3D vessels, colour-coded pipes and crossing lines.

**[4] ASM Consortium** (companies and universities; documents hosted by Honeywell) — *Effective Operator Display Design*, 2008 https://books.google.com/books/about/Effective_Operator_Display_Design.html?id=N0jHQQAACAAJ · *Effective Alarm Management Practices*, 2009 https://www.controleng.com/asm-consortium-releases-alarm-management-guidelines/ · study https://process.honeywell.com/content/dam/process/en/documents/document-lists/doc_asm-consortium/case-studies/September%2028,%202008%20-%20Establishing%20Human%20Performance%20Improvements%20and%20Economic%20Benefit%20for%20a%20Human%20Centered%20Operator%20Interface%20An%20Industrial%20Evaluation.pdf — The best-known measured result. Professional operators worked failure scenarios from a petrochemical plant. The redesigned screens finished 7.5 min (41%) faster, handled 96% of failures (26% better) and spotted 48% before the first alarm (38% better). Caution: the method's promoters ran it, against that plant's old screens.

**[5] EEMUA 201** (3rd ed., 2019, *Control rooms: a guide to their specification, design, commissioning and operation*) https://www.eemua.org/products/publications/print/eemua-publication-201 **and EEMUA 191** (4th ed., 2024, *Alarm systems*) https://www.eemua.org/products/publications/print/eemua-publication-191 — UK industry guides, not standards. 201 covers screen hierarchies and layout. 191's benchmarks (via the ISA-18.2 summary below):
- about one alarm per 10 minutes on average;
- under 10 in the first 10 minutes after a major upset;
- priorities about 80/15/5% low/medium/high.

Its contents list also covers alerts, events and prompts (non-alarms), "first-up" alarms (flagging which came first) and alarm settings by recipe.

**[6] NUREG-0700 Rev. 4, *Human-System Interface Design Review Guidelines*** (US Nuclear Regulatory Commission; O'Hara et al.; January 2026) — https://www.nrc.gov/regulations-legislation/nureg-series-publications/publications-prepared-by-nrc-staff/human-system-interface-design-review-guidelines-nureg-0700/r4 — Free. Fifteen sections of review guidelines, including alarm systems, on-screen controls, automation, and degraded conditions (what a screen does when data fails). I read only the abstract.

**[7] ISO 11064-5:2008, ISO 9241-110:2020, ISO 9241-112:2017** — https://www.iso.org/obp/ui/en#!iso:std:44691:en · https://www.iso.org/obp/ui/en/#!iso:std:75258:en · https://www.iso.org/obp/ui/#!iso:std:64840:en — ISO previews.
- 11064-5 (control-room displays and controls) has an alarms chapter.
- 9241-110 lists interaction principles: suits the task, explains itself, behaves as expected, learnable, user in control, forgives errors, engaging.
- 9241-112 adds presentation principles, including "freedom from distraction".

**[8] Le Blanc et al. (Idaho National Laboratory), 2025, "Evaluation of color in digital nuclear power plant control room displays", *Applied Ergonomics* 125:104429** — https://www.sciencedirect.com/science/article/pii/S0003687024002060 — An independent test with professional operators. Conventional state colours gave small gains on simple tasks and none on complex ones. The authors found no strong case either way.

### B. Alarms and status colours

**[9] ANSI/ISA-18.2-2016 and IEC 62682:2022, *Management of alarm systems for the process industries*** — https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards · https://webstore.iec.ch/en/publication/65543 · summary (cites Siemens, Rockwell, Yokogawa) https://www.tdl-ia.com/insights/isa-18-2-alarm-management-lifecycle-rationalization-kpi.html — An alarm signals an abnormal condition that needs a response. Alarm states:
- unacknowledged;
- acknowledged;
- returned-to-normal-but-unseen;
- shelved (hidden by a person for a set time);
- suppressed by design (hidden by logic);
- out of service.

Acknowledging silences an alarm; it doesn't clear one that is still true. Also ISA-18.1-2024 (alarm-light panels, source of "first-out") and TR18.2.8 (non-alarm notices).

**[10] 14 CFR 25.1322, FAA flightcrew alerting** — https://federal.elaws.us/cfr/title14.part25.section25.1322 — A law. It sets warning / caution / advisory levels: red = warning, amber or yellow = caution, advisory = any colour except red or green. It limits other uses of red, amber and yellow. An alert is removed when its cause ends, and a suppressed alert must say so plainly. The "dark cockpit" idea (Airbus "lights-out": no light means normal, though green may stay lit) is in a secondary source: https://v1prep.com/library/a320-flight-deck-design-philosophy.html

**[11] Lamp and status colours: IEC 60073:2002, IEC 60204-1 (machines), NAMUR NE 107 (rev. 2025)** — https://webstore.iec.ch/en/publication/587 · https://www.namur.net/en/publications/news-archive/ne107-self-monitoring-and-diagnostics-of-field-devices-has-been-revised.html · machine-lamp summary https://onpowbutton.com/news/industrial-indicator-light-colors/ — Red = danger, yellow = abnormal, green = normal, blue = action needed, white = neutral. NE 107 fixes icons and colours for four device states: failure, function check, out of specification, maintenance. None gives orange a "heating" meaning.

**[12] Woods 1995, "The alarm problem and directed attention in dynamic fault management", *Ergonomics* 38(11)** — https://doi.org/10.1080/00140139508925274 — An alarm should point attention (where, what changed), not just announce a crossed limit.

### C. People supervising machines

**[13] Endsley 1995, "Toward a theory of situation awareness in dynamic systems", *Human Factors* 37(1); Endsley & Jones, *Designing for Situation Awareness*, 3rd ed.** — https://doi.org/10.1518/001872095779049543 · https://www.routledge.com/Designing-for-Situation-Awareness-An-Approach-to-User-Centered-Design-Third-Edition/Endsley-Jones/p/book/9781032482118 — Situation awareness means noticing the facts, understanding them, and predicting what happens next. The book has about 60 design principles, with chapters on alarms and automation.

**[14] Vicente & Rasmussen 1992, "Ecological interface design: theoretical foundations", *IEEE Trans. SMC* 22(4)** — https://orbit.dtu.dk/en/publications/ecological-interface-design-theoretical-foundations — Draw the process so its real structure shows, and don't demand harder thinking than the task needs. Their test plant, DURESS II (https://doi.org/10.1518/001872096778701917), is a simulated heat-and-water system much like a HERMS. I verified the setup, not the results.

**[15] Automation and mistakes** — Sarter & Woods 1995 https://doi.org/10.1518/001872095779049516 · Sarter, Woods & Billings 1997, "Automation surprises" https://www.researchgate.net/profile/David-Woods-19/publication/270960170_Automation_surprises/links/5893898aa6fdcc45530c2d2f/Automation-surprises.pdf · Bainbridge 1983, "Ironies of automation" https://www.sciencedirect.com/science/article/pii/0005109883900468 · Parasuraman, Sheridan & Wickens 2000 https://doi.org/10.1109/3468.844354 · Lee & See 2004 https://doi.org/10.1518/hfes.46.1.50_30392 —
- People must track a machine's mode and next move, or they ask "what is it doing now, why, what next?"
- More automation makes the person matter more for rare hard cases, and leaves them less practised. I confirmed the Bainbridge paper exists; its arguments are from memory.
- Choose the level of automation per function.
- Trust should match real reliability.

### D. Alarm sounds and alarm fatigue

**[16] IEC 60601-1-8 (medical alarms), ed. 2.2, 2020; Edworthy 2012, "Medical audible alarms: a review"** — https://webstore.iec.ch/en/publication/67388 · https://pmc.ncbi.nlm.nih.gov/articles/PMC3628049/ (free) — Each priority's melodies share one pulse count (three for cautionary, five for emergency) and one rhythm, so they are hard to tell apart. Cardiopulmonary monitors raise 85–99% false alarms. Shrill alarms are bad design. Give high-priority events their own sound; low-priority ones can share.

**[17] ISO 7731:2003, auditory danger signals** — https://www.iso.org/obp/ui/#!iso:std:33590:en · summary (a sounder maker's slides) https://www.pfannenberg.com/fileadmin/Redakteur/Subsites/Files_Know-How/Know-How_Signaling/ISO_7731_-_Requirements_for_Sounders_EN.pdf — A danger sound counts as audible if it is over 65 dB(A) and 15 dB(A) above the background (dB(A) is loudness weighted for hearing). The other route is clearing the masked-hearing threshold by set margins in sound bands. Allow for ear protection.

**[18] Patterson 1982 (UK CAA Paper 82017) and 1990** — https://www.pdn.cam.ac.uk/sites/default/files/AuditoryWarningSystems_CAA82017.pdf · https://www.jstor.org/stable/55320 —
- People learn four to six warning sounds quickly and later ones slowly.
- Ten or more is too many; six is reliable.
- Sounds with the same pulse rate get confused.
- Above about 85 dB is unpleasant; aim about 15 dB over the noise threshold.

**[19] Learning, urgency and fatigue studies** —
- Sanderson et al. 2006 https://europepmc.org/article/MED/16430567: under 30% got every IEC melody right after two practice sessions. Medium-priority alarms were answered faster and more accurately than high ones, though rated less urgent.
- McNeer et al. 2018 https://doi.org/10.1097/ALN.0000000000002234: everyday-sound "auditory icons" were identified 88% vs 43% for IEC melodies.
- Edworthy et al. 1991 https://doi.org/10.1177/001872089103300206: pitch, speed, rhythm and harmonics change perceived urgency predictably.
- Edworthy et al. 2018 https://researchportal.plymouth.ac.uk/en/publications/getting-alarm-sounds-into-a-global-standard-a-cases-study-with-re/: the IEC set is "problematic and in need of updating".
- Drew et al. 2014 https://pmc.ncbi.nlm.nih.gov/articles/PMC4206416/: 2.56 million alarms in 31 days for 461 ICU patients; 88.8% of reviewed arrhythmia alarms were false.
- Joint Commission alert 50 (2013) https://www.kff.org/wp-content/uploads/sites/2/2013/04/sea_50_alarms_4_5_13_final1.pdf: 98 alarm-related events, 80 deaths (voluntary reports).
- HSE on Milford Haven, 1994 https://pdf4pro.com/view/better-alarm-handling-health-and-safety-executive-19dfa9.html: two operators faced 275 alarms in the last 11 minutes.

### E. Touch, distance, colour vision

**[20] Target sizes** —
- WCAG 2.2 (web accessibility guidelines), criterion 2.5.8 https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html: at least 24×24 CSS px, or enough spacing. The stricter 2.5.5 says 44×44.
- Apple https://developer.apple.com/design/tips/: 44 pt.
- Android https://developer.android.com/guide/topics/ui/accessibility/apps: 48 dp, and text contrast of 4.5:1.
- Colle & Hiszem 2004 https://doi.org/10.1080/00140130410001724228: 20 mm keys were big enough on a capacitive kiosk; 1 mm vs 3 mm gaps didn't matter.
- Chen et al. 2013 https://pmc.ncbi.nlm.nih.gov/articles/PMC3572909/: the same 20 mm plateau; people with motor-control disabilities kept improving up to 30 mm.

**[21] Wet and gloved touch** — https://onlinedocs.microchip.com/oxy/GUID-A8A0085D-58D1-4E41-A07D-B93BFDE11AFE-en-US-4/GUID-9E7AA3FE-5F0F-4FC1-BDD5-5B6287FC0281.html · https://odmlcd.com/blog/pcap-vs-resistive-touch-industrial-hmi · https://www.cdtech-lcd.com/knowledge/touch-displays-for-gloved-hands-and-rain-techniques-that-work/ · https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_20-175.pdf —
- Microchip: wet or humid conditions can cause false touches on capacitive sensors.
- Vendor pages: resistive screens (which sense pressure) work with gloves and ignore water. Capacitive screens (phone-style) need glove-mode tuning and water-rejection software.
- FAA AC 20-175 covers touch-screen controls, including accidental use (text unread).
- I found no target-size study for wet or gloved hands.

**[22] Distance, bullet graphs, colour vision** — https://liquidcrystaltechnologies.com/tech_support/CharacterHeight.htm · https://www.altftool.com/tools/all/text-legibility-distance-calculator · https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf · https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness —
- Secondary sources: characters should span at least 16 arcminutes (1/60 of a degree) when legibility matters, and 20–22 to read comfortably.
- Few's bullet graph is a thin bar with shaded poor/ok/good bands, a compact replacement for dials.
- NIH: red–green is the commonest colour-vision difference, mostly in men.

### F. Brewing software and hardware

**[23] CraftBeerPi 4, FermTroller, Brewblox** — https://openbrewing.gitbook.io/craftbeerpi4_support · https://openbrewing.gitbook.io/craftbeerpi4_support/readme/operating-your-system.md · https://github.com/BrewTroller/FermTroller · https://www.brewblox.com/user/all_widgets.html —
- **CraftBeerPi:** up to 10 dashboards, one can suit a phone. Each kettle has a control bar (heater, pump, target dialog, car-icon AUTO) whose active buttons turn green. The docs warn that a hand-switched heater stays on, unregulated. Notifications show lower right. A buzzer plug-in and a browser "play sound" setting fire for any notification (no per-alarm sounds described). A Pushover plug-in texts your phone.
- **FermTroller:** alarms have states. Active-unacknowledged sounds the buzzer; acknowledged stops it.
- **Brewblox:** widget dashboards, plus a "Brewery Builder" drawing that simulates flow from real pump and valve states.

**[24] Home-brew controllers** —
- Ss Brewtech eController 1V manual https://www.manualslib.com/manual/1587845/Ss-Brewtech-Econtroller-1v.html: PV/SV readout, MAN/AUTO rocker, lit heater button. The 2V has HLT/MASH and BOIL KETTLE controllers.
- eController 2.0 https://www.ssbrewtech.com/products/econtroller-2-0 (site blocked me; read via search snippet): touch screen, graph, timers, one unit per vessel.
- An owner's complaint of poorly explained settings: https://www.homebrewtalk.com/threads/ssbrewtech-econtroller-videos.688643/
- REX-C100 PID manual https://manuals.plus/asin/B0CTF93H3N: red PV on top, green SV below, lamps OUT1, AT, ALM1, ALM2. That is your look.
- Auber SYL-2352 https://www.manualslib.com/guide/4240459/auber-instruments-syl-2352-temperature-controller-user-manual.html: alarm suppression until PV first reaches SV.
- BrewCommander https://www.brewhardware.com/product_p/abrewcommander-120v-dual.htm: touch screen, 5-step mash, 7 boil-addition timers, audible alarms. Reviewer praise: https://www.homebrewfinds.com/hands-on-review-blichmann-brewcommander-controller/
- Grainfather Connect https://manualzz.com/doc/84590009/grainfather-g30-controller-instructions and App Store reviews https://apps.apple.com/ca/app/grainfather-community/id1169264880?see-all=reviews&platform=iphone: "built-in timers don't work", Bluetooth drops, slow UI, and "phantom alerts" that made one user switch alerts off.

**[25] Professional brewery systems** —
- Siemens BRAUMAT https://www.siemens.com/de-ch/products/braumat/: drill-down from plant overview to diagnostics, stack-light status displays, graphical recipes, recorded and replayable process screens.
- ProLeiT brewmaxx https://www.proleit.com/process/brewmaxx/process-control-systems-for-breweries/: reusable equipment "classes", step-based recipe control, vector process graphics.
- Rockwell PlantPAx https://www.rockwellautomation.com/en-mde/support/documentation/technical/capabilities/plantpax-process-solutions.html: a library of ready-made faceplates plus [2].
- Batch recipes follow ISA-88 https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa88
- I found no independent user reviews, only vendor claims.

**[26] Chrome autoplay policy** — https://developer.chrome.com/blog/autoplay — Sound plays only after a tap or click on the site, or if it is installed as an app. This matters because CraftBeerPi's alarm sound plays in the browser.

## 2. Principles

Source numbers are in brackets. ⚠ marks a disagreement.

**Screens and colour**
1. **Show information, not bare numbers.** Put each reading beside its target, normal band and a short trend. *Opinion* [1–3]; the one measured test is [4]. A thin banded bar is the compact form [22].
2. **Layer the screens**: overview, one unit, detail, diagnostics. Design the unit screen first, keep navigation in fixed places, and open screens fast. *Rule/guidance* [1][2][5].
3. **Keep normal quiet**: colour, motion and sound only for what needs attention. *Opinion* [2][3]; "freedom from distraction" is a stated principle [7].
   - ⚠ Machine lamps make green mean normal [11], and the one independent test found no clear winner [8].
   - *My guess*: a dark screen suits a dim garage; keep text contrast at 4.5:1 or better [20].
4. **Never use colour alone, and respect meanings already taken.** *Guidance* [2]. Aircraft law: red warning, amber/yellow caution [10]. Machine lamps: red danger, yellow abnormal, green normal, blue action, white neutral [11]. Red–green confusion is the commonest colour-vision difference [22].
5. **Draw plumbing flat and plain**: one line weight, one flow direction, few crossings, no 3D, no spinning pumps, no colour-coded contents. *Opinion* [3]. Ecological design adds: show how the process hangs together, so people can reason about faults they've never seen [14].
   - ⚠ Brewblox animates flow from live valve state [23]; the high-performance camp objects to animating normal running [3]. A middle path is to highlight the live path statically.

**Automation**
6. **Show what the automation is doing and why**, especially its mode. Hidden or changing modes cause "automation surprises" (the machine does something unexpected). Keep raw readings and controller output visible so a person can take over. *Study/theory* [15]. CraftBeerPi's docs warn a hand-switched heater stays on unregulated [23].
7. **Support three kinds of awareness**: what's happening, what it means, what's next [13]. For example: "3 °C under target, there in about 4 min."

**Alarms**
8. **An alarm needs a person to act soon; everything else is a notice, prompt or log line.** Define each alarm once (cause, consequence, action, time available, priority), with three or four priorities. *Rule per summaries* [9]; *guidance* [5].
9. **Rates are benchmarks, not rules**: about 1 per 10 minutes, under 10 in the first 10 minutes after an upset, priorities near 80/15/5 [5]. Sources differ on totals [9]. *My guess*: a brew day needs only a handful.
10. **Acknowledge silences; it doesn't clear** [9]. ⚠ Aircraft remove an alert when its cause ends [10]. A mix for you: let notices expire, and keep missed alarms until seen.
11. **Hide on purpose, and say so.** Logic may hide an alarm that can't mean anything yet, such as a low-temperature alarm before first reaching target (Auber does this [24]). A person may shelve one for a set time [9]. Aircraft law demands a visible "suppressed" sign [10].
12. **In a burst, show the first cause, and point**: where to look, what changed [5][12]. Milford Haven: 275 alarms in 11 minutes [19].
13. **False alarms are the real danger.** Monitors run 85–99% false [16]; one ICU sample 88.8% [19]; a Grainfather user switched alerts off after phantom ones [24]. People answer alarms about as often as alarms prove right (Bliss, via [16]), so trust should track reliability [15].

**Sounds**
14. **Be audible over the noise**: over 65 dB(A) and 15 dB(A) above background at the listener [17]. Allow for ear protection; harsh above about 85 dB [18].
15. **Keep urgent sounds to about six**, and don't repeat a pulse rate [18]. ⚠ Edworthy wants each high-priority alarm to have its own sound [16]; Patterson caps the count [18]. A brewery has few true alarms, so both can hold.
16. **Melodies are hard to learn; urgency can be designed.** IEC's set: under 30% perfect after practice; everyday-sound icons 88% vs 43%; its own researchers call it problematic [19]. Faster, higher, more harmonic sounds feel more urgent [19], yet IEC's high-priority tones were answered less accurately than medium ones [19].
17. **Soft beats shrill; escalate if unanswered** [16]. Browsers stay silent until the page is tapped [26].

**Touch and distance**
18. **Target size**: 24 px minimum, 44 px at the stricter level and for Apple, 48 dp for Android [20]. These are only about 6–9 mm of real screen. Labs found 20 mm enough for bare fingers and up to 30 mm helpful for poor control [20].
    - ⚠ WCAG weighs spacing; two lab studies found 1–3 mm gaps made no difference.
    - *My guess* for wet or gloved hands: 30 mm or more, with 8 mm gaps.
19. **Wet and gloves**: capacitive screens can read water as touches; resistive ignores water but is dimmer and single-touch [21]. Expect accidental touches, and use hold-to-confirm for hazardous actions [21].
20. **Size text for distance**: 16 arcminutes is the floor and 20–22 is comfortable [22]. At 3 m that is about 14 mm and 17–19 mm (my arithmetic).
21. **Fail visibly**: stale, lost or degraded data must look unlike normal [6].
22. **Write the rules first**: a short philosophy (colours, alarm classes, sounds), a style guide, then reusable parts [1][2][25].

## 3. Applied checklist

**Faceplate (one reusable part for all three vessels)**
- PV biggest, SV next. At 3 m, PV digits at least 19 mm tall (about 70 px on a 24-inch 1080p monitor).
- One thin bar showing PV, SV and a shaded OK band, plus a 10–30 minute trend with the SV line.
- Mode in words (AUTO / MANUAL). In MANUAL, a standing "NOT REGULATING" tag on the faceplate and title bar.
- Recipe step and time to target: "Mash 2 of 4 · hold 67 °C · 23:10 left".
- Sensor lost: show "NO SENSOR", never the last value.
- Red PV / green SV copies real PID controllers [24] but fights the colour rules and red–green colour blindness. Offer it as a "bench controller" skin; default to a neutral PV that changes only when out of band.
- SV controls at least 30 mm; confirm big jumps.

**Pump or element button**
- State in words plus an icon ("PUMP 1 · RUNNING"); colour is a bonus.
- Lamp strip: green running, red failed and grey off fit machine-lamp convention [11]. Orange for heating sits next to caution. Try a neutral fill that grows with OUT %, and keep amber for caution.
- Show commanded and actual: "ON · no flow" is a fault.
- If a button is blocked, say why ("locked: low level").
- At least 30 mm with 8 mm gaps. Half-second hold for the element and other hazardous switches. A "wipe mode" that freezes touch while cleaning.

**Plumbing drawing**
- Flat, one line weight, one flow direction, few crossings, every valve and pump labelled with a name and a state word (OPEN / SHUT).
- Mark the live path with weight or brightness; animate only for a fault ("no flow").
- Label contents in words ("WORT", "WATER"); at most a faint tint.
- On a phone, operate valves from a list or give big hit areas.

**Alarm**
- Title bar: top priority plus a count. Slow flash only while unacknowledged; text never blinks; tap jumps to the vessel [2].
- Three levels: alarm (act now), caution (look soon), notice (information, expires into a log). Step-done and timers are notices.
- Say what, where, what to do, and how long you have.
- Acknowledge silences but doesn't remove. "Came and went unseen" stays flagged until seen.
- Use a delay and dead-band (a small gap so it doesn't flicker at the limit). Siemens' starting point for temperature, via [9], is 1% and 60 s; tune on early brews.
- Suppress by state (heat-up, pump off); allow shelving with an expiry; set limits per step [5].
- Push to the phone if unanswered for a set time.
- After each brew, review the log; fix or remove alarms that needed no action.

**Alarm sound**
- Four to six sounds: critical, caution, notice/timer, step-done prompt, optionally "lost connection". Differ by rhythm and pitch range, not melody alone [18][19].
- Measure the garage with pumps and fans running. Aim over 65 dB(A) and 15 dB above it at your usual spot [17]. A phone can't do that, so use an external sounder for critical alarms. Add a test button.
- Repeat faster if unanswered; silence on acknowledge, keep the visual.
- "Sound packs" (bench-PID beep, kitchen timer, industrial horn, aircraft-style chime):
  - same roles, same urgency order, no two roles alike, and a "play all" test;
  - everyday-sound packs are probably easiest to learn [19];
  - synthesise your own and don't copy manufacturers' recordings;
  - I found no published tone specs for the brew controllers; recording real units is the route.
- Web: ask for a tap to "enable sound" on load, or install the page as an app [26].

**Timer**
- Prompts, not alarms: a big countdown to the next event.
- Silent heads-up 1–2 minutes ahead; audible prompt when due; overdue counts up in caution style.
- Say what happens at zero (auto-advance or wait) [15].
- Run timers on the server so phone, monitor and restarts agree [24]; push to the phone when away.
- Keep step and addition timers separate; ±1 min buttons at least 30 mm.

**Avoid**: spinning icons, flames, 3D vessels; saturated colour at rest; red on non-alarms; colour-only codes; blinking text; more than about six urgent sounds; an alarm for every step; pop-ups over the process; tiny valve taps; one-tap hazardous commands; held last values; "acknowledge = clear"; silent audio failure on phones.

**Gaps and follow-ups**
- I couldn't read the paid standards or NUREG-0700's text, so I used publisher pages, free contents lists, peer-reviewed reviews and vendor summaries.
- ISO 9241-110's last three principles are from memory, as are Bainbridge's arguments.
- High-performance-HMI evidence comes mostly from the ASM Consortium and PAS; the coal-plant test is members-only.
- I found no wet or gloved target study, no published tone specs for brew controllers, and no independent reviews of BRAUMAT or brewmaxx. Ss Brewtech's and Brewblox's sites wouldn't load.
- The fetch tool auto-saved two oversized PDFs to `%LOCALAPPDATA%\Temp\` (`1794436799482-copilot-tool-output-0201c4d215424f16ba95abc1c0d0b2b0.txt` and `1794436820312-copilot-tool-output-79b6af656e764358a7a55869b4879876.txt`). I didn't make or edit them and they can be deleted.
- Next steps:
  - Read NUREG-0700's alarm, on-screen-control, automation and degraded-condition sections (https://www.nrc.gov/docs/ML2602/ML26022A094.pdf).
  - Measure garage noise.
  - Test gloves on the real panel.
  - Record real hardware sounds.
