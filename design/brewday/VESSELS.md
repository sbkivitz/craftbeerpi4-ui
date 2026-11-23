# A vessel's own figures: capacity, empty weight and material (23 Nov 2026)

## What the brewer asked

After Test Recipe v5, a 20 gal batch, filled BrewStart's water in at 25.4 gal, more than his HLT's 20 gal: "these
volumes should be configurable in settings or hardware", then "and if you need to know weight/material of kettle
too?". Brett decided they go on the kettle, edited on the Hardware page, and the core adds three kettle fields:
`capacity`, `empty_weight` and `material` (stainless steel, aluminium or other, with its specific heat).

And a firm rule, his words: "make sure that functionality isn't lost if these new measurements are missing. They
should only improve - not hinder". So:

- blank is a normal state, never an error;
- nothing on Hardware, Brew Day or the strike water box blocks, greys or nags because a vessel's figure is missing;
- the strike water box names where a figure came from only when there is one;
- a figure that can't be right (0 or less) is said at its field, and changes nothing anywhere else.

DESIGN.md calls this The Only Improves Rule.

## On the Hardware page: the Vessel group

A kettle's page gets a group of its own, **Vessel**, right after the kettle's own rows (Name, AUTO control, Probe,
Heating element, Pump) and before its Settings file: the pot itself comes before its control. Under the heading, one
line: "Each is optional: leave it empty if you don't know it. Saving these leaves the kettle's AUTO as it is."

Each row in the page's own anatomy (the name, a line on what it does, CraftBeerPi's key in small type, the control
on the right):

| Row | Line under it | Control |
|---|---|---|
| Capacity | How much it holds, full. Brew Day checks BrewStart's water against the HLT's. | a number, gal (L on a °C brewery) |
| Empty weight | What it weighs empty, with what's fixed in it, such as a coil or a false bottom. The strike water forecast uses it. | a number, lb (kg) |
| Material | What it's made of. The forecast uses it with the empty weight; without it, it takes stainless steel. | a menu: Not set, Stainless steel, Aluminum, Other |
| Specific heat (only with Other) | How much heat the material holds, as BeerSmith's equipment profile gives it: copper 0.09, stainless steel 0.12, aluminum 0.22. | a number, cal/g·°C |

- **Empty** reads "empty" in the box, or "Not set" in the menu, as the page's other boxes do. Unlike a control's
  settings, these rows have no "Empty: …" line under them, and they are never among the empty settings named before
  SAVE: empty is usual for them, and nothing does less for it.
- **A figure that can't be right**, 0 or less, is said at its row in red once the box is left, or at SAVE, never while
  it is typed, so "0.12" doesn't flash red on its way: "0 gal can't be right: leave it empty if you don't know it".
  Like a box that needs a number, it holds back SAVE until it is put right or emptied, and SAVE's refusal says "Fix
  the entry marked in red first." Nothing else on any page changes for it. Text that isn't a number says "Needs a
  number", as everywhere on the page.
- **No other limits.** A large or small figure is the brewer's to give: no range is enforced beyond more than 0.
- **Saving them leaves AUTO running.** CraftBeerPi switches a kettle's AUTO off whenever its settings are saved, which
  would turn editing a pot's size into stopping its heat mid-brew. Saving only these fields must leave AUTO as it is
  (the core's part, below), so the amber note "Saving HLT switches its AUTO off…" isn't shown for them. A SAVE that
  also changes the control's settings says it, as now.
- **Other**, chosen, brings Specific heat in under it; another choice takes it away (its figure kept on the page until
  saved). Other with no specific heat is as if no material were given, except that its weight isn't used either: the
  forecast can't guess what an unknown material holds.

## On Brew Day: BrewStart's water more than the HLT holds

Only where the HLT's capacity is given, and BrewStart's water is more: one line in Note Amber (#ffd9a0), as the pH
box's "warmer than a cooled sample" line, under the water's figure wherever it is shown:

- in BrewStart's box, under "The HLT's 6500 W element heats 25.4 gal to 152.0 °F. USE and HLT WATER in the strike
  water box change them.";
- in FORECAST's From you, under "25.4 gal in the HLT, strike and sparge: BrewStart's water volume. …";
- in the HLT water box, under the figure as it is typed or stepped, so a figure that fits makes it go.

The words: "25.4 gal is more than the HLT holds: 20 gal, on the Hardware page." Both figures, and where the capacity
comes from, so either can be put right. It greys and refuses nothing: SET, USE and START work as before, and with no
capacity given there is no line. Not on BrewStart's step row or the strike water box's face, which stay as calm as
they are: the recipe pages warn when the recipe comes in (Robin's part), and the box the brewer opens to set the
water is where he reads it.

## In the strike water box: where a figure came from

FORECAST lists its numbers by where they come from. A vessel's figures from the Hardware page get a group of their own,
**From Hardware**, after From the recipe, shown only when it has something:

- **Mash tun**: "33 lb of stainless steel". It takes the place of BeerSmith's (TUN_WEIGHT and TUN_SPECIFIC_HEAT, "33 lb
  of steel" under From the recipe), as a kettle's own figures win over BeerSmith's; the recipe's line goes.
- **HLT**: "30 lb of stainless steel, with what's fixed in it". It takes the place of the guess under Not measured yet
  (HLT STEEL, 10–17 kg with its coil), which goes, and so it can't be among what would raise USE most.
- Aluminum: "33 lb of aluminum"; Other with its specific heat: "33 lb of a material holding 0.09 cal/g °C"; an empty
  weight with no material: "33 lb, taken as stainless steel".
- A material with no weight, or Other with no specific heat, gives the forecast nothing, so nothing is named, and
  BeerSmith's figure or the guess stays as it is.

Capacity isn't a figure the forecast uses, so it isn't listed there.

## What it needs

| Change | Where |
|---|---|
| The kettle fields `capacity`, `empty_weight`, `material` (`stainless_steel`, `aluminium`, `other`, or empty) and `specific_heat` (cal/g·°C, used with `other`), in the brewery's units, blank by default | Server (core) |
| Saving only those fields leaves the kettle's AUTO as it is | Server (core) |
| A figure of 0 or less treated as blank, whatever a client sends | Server (core) |
| The strike water model: a kettle's weight and material in place of BeerSmith's tun and the HLT's steel guess; weight with no material taken as stainless steel (0.12), aluminium 0.22; nothing from a material alone | Server (core) |
| The state's `recipe` or `inputs` saying which figures came from Hardware, so FORECAST can say so | Server (core) |
| The Vessel group, its checks, and no AUTO-off note for it | React UI (Hardware page) |
| The over-capacity line in BrewStart's box, FORECAST and the HLT water box; From Hardware in FORECAST | React UI (Brew Day) |
| A warning when a recipe comes in with more water than the HLT holds | React UI (recipe pages, Robin) |
| Nothing | Dashboard layout files |

The material's value names and the state's shape are placeholders until the core settles them; the words and places
don't depend on them.

## The moments

- Hardware page (`hardware.html`): `#vessel` (the Mash Tun's, all three given), `#vesselnone` (the Boil Kettle's, none
  given), `#vessel0` (the HLT's capacity typed as 0 and the box left), `#vesselauto` (the HLT heating in AUTO with its
  capacity changed: no AUTO-off note), `#vesselother` (the Mash Tun's material changed to Other, with its specific
  heat). The demo's figures are made up: the HLT holds 20 gal, stainless steel, its weight not given; the Mash Tun 20
  gal, 33 lb, stainless steel; the Boil Kettle none.
- Brew Day (`brew-day.html`): `#bs-over` (BrewStart's box, 25.4 gal in a 20 gal HLT), `#sw-hw` (FORECAST with the Mash
  Tun's and the HLT's figures from Hardware), `#sw-over` (FORECAST with the water more than the HLT holds). Every other
  moment has no figures from Hardware and is as before.

The mockup doesn't work USE out again for Hardware's figures: its numbers are the model's answers for BeerSmith's tun
and the HLT guess, as before. Only the words change.

## How it was checked

- Hardware page: `files\hw_click.py` 85 of 85; `files\hw_measure.py` at every size for the five new moments, no words
  broken across lines, no text under its contrast, no target under 44 px, no overlaps, no script errors.
- Brew Day: the three moments at 1440 × 900, 1180 × 860 and 390 × 844, no page errors, the line in view in BrewStart's
  box as it opens; the Brew Day suites.
