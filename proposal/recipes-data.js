/* The Recipe Book mockup's data. The simulator's (http://127.0.0.1:8012), read once and never written
   to: its four recipes, its vessels, probes and switches, and the settings an import uses. Made up for the mockup, and
   saying so in their descriptions: House Pale Ale, Oatmeal Stout and Hefeweizen; the two BeerSmith files and what
   importing them gives; and the Brewfather list. */
"use strict";
window.CBPI_RECIPES = (() => {
  const MT = "oQhZqfBjSC88UNNcWE3CCv", HLT = "npqm66B5iuYbDt2KrvuDS5", BK = "b7qhSvKJ25y3qQivGZbdpi";
  const MTS = "G9je5TwkPNKDE3cRVXrSci", HLTS = "afft72Vaoj33KfkXVqyiD8", BKS = "bo8gTWBKSSJUeLfuSWUJmx";
  const MALT = "Target temperature reached. Please add malt.";
  const mashIn = (t, extra = {}) => ({name: "MashIn", type: "MashInStep", props: {AutoMode: "Yes", Grain_Kg: 9.072, Kettle: MT, Notification: MALT, Sensor: MTS, Temp: String(t), Timer: 0, ...extra}});
  const rest = (name, t, min) => ({name, type: "MashStep", props: {AutoMode: "Yes", Kettle: MT, Notification: "", Sensor: MTS, Temp: String(t), Timer: String(min)}});
  const sparge = (min = 40) => ({name: "Sparge", type: "SpargeStep", props: {Kettle: HLT, Mash_Tun: MT, Notification: "", Sensor: HLTS, Temp: "168", Timer: String(min)}});
  const boil = (min, adds, fw = null) => {
    const p = {AutoMode: "Yes", First_Wort: fw ? "Yes" : "No", First_Wort_text: fw || "", Kettle: BK, LidAlert: "Yes", Sensor: BKS, Temp: 210.2, Timer: String(min)};
    for (let i = 1; i <= 6; i++) { const a = adds[i - 1]; p[`Hop_${i}`] = a ? a[0] : null; p[`Hop_${i}_text`] = a ? a[1] : null; }
    return {name: "Boil Step", type: "BoilStep", props: p};
  };
  const wpHop = text => ({name: "Whirlpool Hop", type: "NotificationStep", props: {AutoNext: "No", Kettle: BK, Notification: text}});
  const wp = (t, min) => ({name: "Whirlpool", type: "WhirlpoolStep", props: {Kettle: BK, Temp: String(t), Timer: String(min)}});
  const at = s => Date.parse(s) / 1000;

  const v5steps = [mashIn(126), rest("Protein Rest", 126, 20), rest("Saccharification", 149, 40), rest("Mash Out", 168, 10), sparge(40),
    boil(90, [[60, "3.00 oz Centennial"], [15, "6.00 oz Willamette"], [15, "1 Whirlfloc Tablet"], [5, "3.00 oz Citra"]]),
    wpHop("Cool down to 170 F. Then add 1.50 oz Calypso."), wp(170, 20)];

  /* the Recipe Book, as GET /recipe/ lists it (basic data, file, modified) with each recipe's steps (GET /recipe/{file}).
     v5's mash_numbers are its BeerSmith export's, as the import keeps them in its basic data, in litres and kg, with
     the three the HLT's water is worked out from (boil_l, top_up_kettle_l, lauter_dead_l: server change 7) */
  const BOOK = [
    {file: "YhweWUoDCyYKB887DJ9EXd", name: "Craftbeerpi Test Recipe v5", author: "John Doe", imported_from: "BeerXML", modified: at("2026-11-13T13:53:00"), steps: v5steps,
      mash_numbers: {grain_kg: 9.07184, infuse_l: 31.2675, for_grain_l: 28.390752, infusions_l: 40.731, boil_l: 87.0649728, top_up_kettle_l: 0, lauter_dead_l: 0}},
    {file: "FtHtz5YsgsSFEikqEieXJb", name: "Craftbeerpi Test Recipe v4", author: "John Doe", imported_from: "BeerXML", modified: at("2026-11-05T15:50:00"),
      steps: [mashIn(126), rest("Saccharification", 126, 20), rest("Mash Step", 149, 40),
        boil(90, [[15, "6.00 oz Willamette"], [15, "1 Whirlfloc Tablet"], [5, "3.00 oz Citra"]]),
        wpHop("Cool down to 170 F. Then add 1.50 oz Calypso."), wp(170, 20)]},
    {file: "JimaSx8vJFQoZ2wjioiVRT", name: "Craftbeerpi Test Recipe v3", author: "John Doe", imported_from: "BeerXML", modified: at("2026-11-05T15:50:00"),
      steps: [mashIn(152), rest("Saccharification", 152, 60), rest("Mash Out", 168, 10),
        boil(90, [[15, "6.00 oz Willamette"], [5, "3.00 oz Citra"]]),
        wpHop("Cool down to 170 F. Then add 1.50 oz Calypso."), wp(170, 20)]},
    {file: "Sm2ziW9v2nxAMid7ft6PTr", name: "BrewStart ready-by demo", author: "Brett", desc: "rig-update.html step 9b with the sim's vessels: hot strike water by a set time", modified: at("2026-10-27T16:26:00"),
      steps: [
        {name: "Hot water by a set time", type: "BrewStart", props: {AutoNext: "Yes", Campden_Reminder: "Yes", Heat_Kettle: HLT, Heater_Watts: 6500, Mode: "Today", Ready_Temp: 152, StartTime: "18:35", Timing: "Ready by", Volume: 10.6, Volume_Unit: "gal", NotifyBefore: ""}},
        {name: "Heat the strike water", type: "MashInStep", props: {AutoMode: "Yes", Kettle: MT, Sensor: MTS, Stop_Pump_At_Strike: "Yes", Temp: 152, Notification: ""}},
        {name: "10 minute hold", type: "MashStep", props: {AutoMode: "Yes", Kettle: MT, Sensor: MTS, Temp: 152, Timer: 10}}]},
    {file: "demoHousePaleAle0000001", name: "House Pale Ale", author: "John Doe", desc: "Demonstration recipe, made up for the mockup.", modified: at("2026-11-19T20:14:00"),
      steps: [mashIn(152), rest("Saccharification", 152, 60), rest("Mash Out", 168, 10), sparge(40),
        boil(60, [[60, "1.00 oz Magnum"], [15, "1 Whirlfloc Tablet"], [10, "1.00 oz Cascade"], [0, "2.00 oz Cascade"]])]},
    {file: "demoOatmealStout0000001", name: "Oatmeal Stout", author: "John Doe", imported_from: "Brewfather", desc: "Demonstration recipe, made up for the mockup.", modified: at("2026-11-08T18:02:00"),
      steps: [mashIn(154), rest("Saccharification", 154, 60), rest("Mash Out", 168, 10), sparge(40),
        boil(60, [[60, "1.50 oz East Kent Goldings"], [15, "1 Whirlfloc Tablet"]])]},
    {file: "demoHefeweizen000000001", name: "Hefeweizen", author: "John Doe", imported_from: "BeerXML", desc: "Demonstration recipe, made up for the mockup.", modified: at("2026-10-02T21:30:00"),
      steps: [mashIn(111), rest("Ferulic Acid Rest", 111, 15), rest("Saccharification", 152, 45), rest("Mash Out", 168, 10), sparge(30),
        boil(90, [[60, "1.00 oz Hallertau"]])]}
  ];

  /* what a BeerSmith file holds, as GET /upload/xml lists it after it is sent, and what IMPORT gives: the recipe the
     import keeps in the book (with the Mash Out it adds when a recipe has none) and CraftBeerPi's own words */
  const v6steps = [mashIn(126), rest("Protein Rest", 126, 20), rest("Saccharification", 150, 45), rest("Mash Out", 168, 10), sparge(40),
    boil(90, [[60, "3.00 oz Centennial"], [30, "1.00 oz Simcoe"], [15, "6.00 oz Willamette"], [15, "1 Whirlfloc Tablet"], [10, "1 tsp Yeast Nutrient"], [5, "3.00 oz Citra"]]),
    wpHop("Cool down to 170 F. Then add 1.50 oz Calypso."), wp(170, 20)];
  const FILES = {
    v6: {name: "Craftbeerpi Test Recipe v6.xml", kind: "BeerXML", recipes: [
      {id: "1", name: "Craftbeerpi Test Recipe v6", steps: v6steps,
        warn: ["Boil additions without a reminder", "This recipe has 7 boil additions, but the boil step can remind you of only six. No reminder for: 1.00 oz Citra, at the end of the boil. Watch the clock for it, or set a timer on the brew-day screen."]}]},
    export: {name: "BeerSmith export.xml", kind: "BeerXML", recipes: [
      {id: "1", name: "Craftbeerpi Test Recipe v5", steps: v5steps},
      {id: "2", name: "Rye Pale Ale", steps: [mashIn(152), rest("Saccharification", 152, 60), rest("Mash Out", 168, 10), sparge(40), boil(60, [[60, "1.00 oz Magnum"], [5, "2.00 oz Mosaic"]])]},
      {id: "3", name: "Dry Irish Stout", steps: [mashIn(150), rest("Saccharification", 150, 60), rest("Mash Out", 168, 10), sparge(40), boil(60, [[60, "2.00 oz East Kent Goldings"]])]}]},
    /* the BeerXML file CraftBeerPi kept from the last upload, which IMPORT lists as the page opens */
    kept: {name: "beer.xml", kind: "BeerXML", kept: true, recipes: [{id: "1", name: "Craftbeerpi Test Recipe v5", steps: v5steps}]}
  };

  /* Brewfather: the simulator has no user ID or API key, so its list is empty. The list here is made up */
  const BREWFATHER = ["Amber Ale", "Belgian Dubbel", "Best Bitter", "Brown Porter", "Czech Pilsner", "German Pils", "Kölsch",
    "Märzen", "Oatmeal Stout", "Rye IPA", "Saison", "Scotch Ale", "Vienna Lager", "Witbier"].map((name, i) => ({id: "bf" + i, name}));

  return {
    UNIT: "F",
    BREWERY: "EBrews - Simulator",
    KETTLES: [{id: HLT, name: "HLT"}, {id: MT, name: "Mash Tun"}, {id: BK, name: "Boil Kettle"}],
    SENSORS: [{id: HLTS, name: "HLT Temp"}, {id: MTS, name: "Mash Temp"}, {id: BKS, name: "Boil Temp"}],
    ACTORS: [{id: "ekAhWurViFMGBSQHoUMEr7", name: "HLT Heater"}, {id: "BrewDayHLTPump00000001", name: "HLT Pump"}, {id: "TZf9NpePBSrStdEqr6VoTX", name: "Mash Pump"}, {id: "CPgMajE4XGucCT8fbw2xQf", name: "Boil Heater"}, {id: "TB4KRvhTsWJXEJro2VdT7k", name: "Glycol Pump"}],
    /* the settings an import goes by (UploadController.get_config_values), as the simulator has them */
    CONFIG: {MASH_TUN: MT, BoilKettle: BK, steps_boil_temp: 210.2, steps_whirlpool_temp: 170, steps_sparge: "SpargeStep", AddMashInStep: "Yes", AddMashOutStep: "Yes", AutoMode: "Yes", AUTHOR: "John Doe", brewfather_user_id: "", brewfather_api_key: "", steps_boil_lid_alert: "Turn on the Steam Slayer mister", CONFIRM_BEFORE_BOIL: "Yes",
      /* the new setting for server change 7, in the brewery's units: gal per lb with °F (L per kg with °C) */
      GRAIN_ABSORPTION: 0.12},
    BOOK, FILES, BREWFATHER,
    /* today, in the mockup: brew day's morning, as on the brew-day mockup's pre-brew check */
    TODAY: "2026-11-22"
  };
})();
