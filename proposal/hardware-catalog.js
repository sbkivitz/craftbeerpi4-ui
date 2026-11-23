"use strict";
/* What the Hardware page knows about kettle controls, sensor types and actor types: each setting's plain name, what it
   does in a line, its unit, and the part of the item it sits in. A setting the page doesn't know keeps its key as its
   name and its plugin's own description, in a part called "Other settings".
   A row is [key, plain name, line, unit]. A line may be [°F line, °C line]. Units: "deg" is the brewery's degrees
   (°F or °C); the rest are shown as written. */

/* the rows every kettle, sensor and actor has, before its type's own settings */
const HW_OWN = {
  kettle: [
    ["name", "Name", "", ""],
    ["type", "AUTO control", "What runs while the kettle's AUTO is on.", ""],
    ["sensor", "Probe", "The probe AUTO reads.", ""],
    ["heater", "Heating element", "The switch AUTO heats with.", ""],
    ["agitator", "Pump", "The pump or stirrer AUTO runs.", ""]
  ],
  sensor: [
    ["name", "Name", "", ""],
    ["type", "Kind of probe", "How CraftBeerPi reads it.", ""]
  ],
  actor: [
    ["name", "Name", "", ""],
    ["type", "Kind of switch", "How CraftBeerPi switches it.", ""]
  ]
};

/* each type: what it is in a line (shown under the type's choice), and its settings in parts */
const HW_TYPES = {
  kettle: {
    PIDBoil: {does: "A PID holds the target, at full power up to the boil threshold.", parts: [
      ["PID", [
        ["P", "P gain", "Power for each degree below the target.", ""],
        ["I", "I gain", "Adds power while the water stays below the target.", ""],
        ["D", "D gain", "Takes power off while the temperature climbs.", ""]]],
      ["Power", [
        ["Max_Output", "Most power", "The highest power below the boil threshold.", "%"],
        ["Boil_Threshold", "Boil threshold", "From here on the power drops to Power at the boil.", "deg"],
        ["Max_Boil_Output", "Power at the boil", "The power from the boil threshold on.", "%"],
        ["Boil_Plateau_Minutes", "Stalled-boil minutes", "Counts a temperature stuck at full power as a boil after this many minutes. 0 turns it off.", "min"]]],
      ["Timing", [
        ["SampleTime", "Control interval", "Seconds between power decisions: 2 or 5.", "s"]]]
    ]},
    PID_HERMS: {does: "Heats the mash through the HERMS coil: a mash loop sets the HLT's target, and an HLT loop holds it.", parts: [
      ["Mash loop: sets the HLT's target", [
        ["DeltaTemp", "HLT lead", "How far above the mash target the HLT may go while the mash needs heat.", "deg"],
        ["MashIn_DeltaTemp", "HLT lead at mash-in", "The same before the grain goes in. Blank uses HLT lead.", "deg"],
        ["P", "Mash P gain", "Degrees of HLT lead for each degree the mash is short. Not element power.", ""],
        ["I", "Mash I gain", "Adds lead while the mash stays short.", ""],
        ["D", "Mash D gain", "0 is a good start: the HLT loop already damps it.", ""]]],
      ["HLT loop: holds the HLT where the mash loop asks", [
        ["HLT_Sensor", "HLT probe", "The HLT's probe.", ""],
        ["HLT_P", "HLT P gain", "Element power for each degree the HLT is short.", ""],
        ["HLT_I", "HLT I gain", "Adds power while the HLT stays short.", ""],
        ["HLT_D", "HLT D gain", "Takes power off while the HLT climbs.", ""],
        ["HLT_Kettle", "HLT kettle", "Shows on the HLT the target this sets. Blank finds it from the HLT probe.", ""]]],
      ["Pump", [
        ["MashIn_Pump_Within", "Mash-in pump start", "At mash-in, starts the pump once the HLT is this close to the target. Blank starts it at once.", "deg"],
        ["Pump_Rest", "Rest the pump", "Yes rests it now and then during the mash. No runs it all the time.", ""],
        ["Rest_Interval", "Pump rest every", "Seconds between rests.", "s"],
        ["Rest_Time", "Pump rest for", "Seconds each rest lasts.", "s"],
        ["Max_Pump_Temp", "Pump stops at", "The pump stops when the mash reaches this, with a notice.", "deg"]]],
      ["Limits", [
        ["Max_Output", "Most power", "The highest element power.", "%"],
        ["Max_PID_Temp", "PID stops at", "From this mash temperature the element runs at Most power, with a notice.", "deg"],
        ["Max_Boil_Temp", "Boil limit", "From this temperature the power drops to Power at the boil limit.", "deg"],
        ["Max_Boil_Output", "Power at the boil limit", "The power from the boil limit on.", "%"]]],
      ["Safety and timing", [
        ["Sensor_Stale_Seconds", "Frozen reading after", "Heating stops when a probe repeats the same reading for this long.", "s"],
        ["SampleTime", "Control interval", "Seconds between power decisions: 2 or 5.", "s"]]]
    ]},
    BoilPower: {does: "Boils at a set power, and holds any target below the boil with a PID.", parts: [
      ["Boil", [
        ["Boil_Threshold", "Boil threshold", "Full power below it, Boil power from it. Set it where your wort boils.", "deg"],
        ["Boil_Power", "Boil power", "Element power while boiling. Brew Day changes it during the boil.", "%"],
        ["Usual_Boil_Power", "Usual boil power", "The boil power each recipe starts at. Blank leaves it as you left it.", "%"],
        ["Keep_Boiling", "Keep boiling", ["Yes brings back full power if the wort falls 3.6 °F below the boil.", "Yes brings back full power if the wort falls 2 °C below the boil."], ""],
        ["Max_Output", "Most power", "Power while heating up, and the most a hold may use.", "%"]]],
      ["Holding below the boil: whirlpool, hop stand", [
        ["P", "Hold P gain", ["Power for each degree below the hold's target. Blank uses 14 a degree.", "Power for each degree below the hold's target. Blank uses 25.2 a degree."], ""],
        ["I", "Hold I gain", ["Adds power while the wort stays below. Blank uses 0.03.", "Adds power while the wort stays below. Blank uses 0.054."], ""],
        ["D", "Hold D gain", ["Takes power off while the wort climbs. Blank uses 900; 0 turns it off.", "Takes power off while the wort climbs. Blank uses 1620; 0 turns it off."], ""],
        ["SampleTime", "Control interval", "Seconds between power decisions: 2 or 5.", "s"]]]
    ]},
    Hysteresis: {does: "Heats below the target and stops near it.", parts: [
      ["On and off", [
        ["OffsetOn", "On when below by", "Heats once the temperature is this far below the target.", "deg"],
        ["OffsetOff", "Off when below by", "Stops heating once it's only this far below the target.", "deg"]]]
    ]}
  },
  sensor: {
    OneWire: {does: "A probe on the Pi's OneWire wire.", parts: [
      ["Probe", [
        ["Sensor", "Probe address", "Which probe on the OneWire wire.", ""],
        ["offset", "Offset", "Added to every reading, to correct the probe.", "deg"],
        ["Interval", "Read every", "Seconds between readings.", "s"]]],
      ["Logging and the dashboard", [
        ["Kettle", "Kettle", "Logs less often while this kettle's AUTO is off.", ""],
        ["ReducedLogging", "Idle logging every", "Seconds between log lines while that kettle is off. 0 logs every reading.", "s"],
        ["TempRange", "Warning range", "The dashboard colours the reading this far from the target. 0 turns it off.", "deg"]]]
    ]},
    SimVessel: {does: "A simulated vessel, on the simulator only.", parts: [
      ["Simulation", [
        ["Volume", "Contents", "What the vessel holds. More is slower to heat.", "L"],
        ["Heater", "Element", "The switch that heats this vessel; its power is honoured.", ""],
        ["Heater_Watts", "Element power", "At 100 %.", "W"],
        ["Coupled_Sensor", "Coil partner", "The other vessel's probe, for the HERMS coil. Each points at the other.", ""],
        ["Coupling_UA", "Coil transfer", "Heat through the coil. Higher is a bigger coil; the same on both vessels.", "W/K"],
        ["Coupling_Pump", "Coil pump", "Heat crosses the coil only while this pump runs.", ""],
        ["Idle_Coupling_Fraction", "Coil transfer, pump off", "How much of the coil's transfer stays with the pump off. 0 turns it off.", "%"],
        ["Loss_UA", "Heat loss", "Heat lost to the room. Higher is worse insulation.", "W/K"],
        ["Ambient", "Room temperature", ["Blank is 68 °F.", "Blank is 20 °C."], "deg"],
        ["Start_Temp", "Start temperature", ["Blank is 68 °F.", "Blank is 20 °C."], "deg"],
        ["Grain_Kg", "Grain", "Crushed malt. Dough-in adds it to the mash tun.", "kg"],
        ["Grain_Temp", "Grain temperature", ["Blank is 68 °F.", "Blank is 20 °C."], "deg"],
        ["Boiling_Point", "Boils at", ["Blank is 212 °F.", "Blank is 100 °C."], "deg"],
        ["Sensor_Lag", "Probe lag", "How slowly the probe follows the liquid. 0 reads it at once.", "s"],
        ["Heater_Lag", "Element lag", "How slowly the element delivers its power. 0 delivers it at once.", "s"],
        ["Vessel_Mass_Kg", "Vessel mass", "The empty vessel. Its steel has to be heated too.", "kg"],
        ["Hose_Loss_UA", "Hose heat loss", "Heat lost through the hoses while the pump runs.", "W/K"]]]
    ]}
  },
  actor: {
    GPIOActor: {does: "A relay or SSR on one of the Pi's pins.", parts: [
      ["Wiring", [
        ["GPIO", "GPIO pin", "The Pi pin it switches.", ""],
        ["Inverted", "Inverted", "Yes: on when the pin is low.", ""],
        ["SamplingTime", "Power interval", "Seconds over which a part power is spread: 2 or 5.", "s"]]]
    ]},
    GPIOPWMActor: {does: "A pin pulsed at a set frequency.", parts: [
      ["Wiring", [
        ["GPIO", "GPIO pin", "The Pi pin it switches.", ""],
        ["Frequency", "PWM frequency", "Pulses a second. Keep it well under 1 for an element on an SSR.", "Hz"],
        ["Inverted", "Inverted", "Yes: 90 % power drives the pin 10 % of the time.", ""]]]
    ]},
    DummyActor: {does: "Switches nothing. For testing.", parts: []}
  }
};

/* settings that mean something when empty, so they are never filled in: what the control does then, in a few words */
const HW_EMPTY = {
  MashIn_DeltaTemp: "uses HLT lead",
  MashIn_Pump_Within: "pumps from the start",
  HLT_Kettle: "found from the HLT probe",
  Usual_Boil_Power: "boil power stays as you left it"
};
/* the words FIND also matches for each kind, so "relay" finds the switches and "sensor" the probes */
const HW_SYN = {kettle: "kettle vessel logic control auto", sensor: "probe sensor thermometer temperature", actor: "switch actor relay ssr pin"};
