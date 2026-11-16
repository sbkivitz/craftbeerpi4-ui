/* The hardware the Hardware mockup shows, written by a script, not by hand.
   sim: the simulator's (8012) kettles, sensors and actors as its /system/ gave them; readings are an idle rig's.
   rig: the rig as its records in cbpi-rig-comms give it; the probe addresses, the readings, the pumps' switch kind and
   the Boil Kettle's settings are made up. types: every kettle control, sensor and actor type 8012 has, with each setting as its plugin
   declares it. blank_defaults: each kettle control's built-in values for empty settings, in °F. */
window.CBPI_HW = {
 "sim": {
  "brewery": "EBrews - Simulator",
  "unit": "F",
  "mashTun": "oQhZqfBjSC88UNNcWE3CCv",
  "boilKettle": "b7qhSvKJ25y3qQivGZbdpi",
  "kettle": [
   {
    "id": "b7qhSvKJ25y3qQivGZbdpi",
    "name": "Boil Kettle",
    "type": "BoilPower",
    "sensor": "bo8gTWBKSSJUeLfuSWUJmx",
    "heater": "CPgMajE4XGucCT8fbw2xQf",
    "agitator": "",
    "target_temp": 210.2,
    "props": {
     "Boil_Power": 36,
     "Boil_Threshold": 210.2,
     "Hold_Target": "",
     "Keep_Boiling": "No",
     "Max_Output": 100,
     "Paused": "No",
     "Paused_At": "",
     "SampleTime": 2
    },
    "auto": false
   },
   {
    "id": "npqm66B5iuYbDt2KrvuDS5",
    "name": "HLT",
    "type": "PIDBoil",
    "sensor": "afft72Vaoj33KfkXVqyiD8",
    "heater": "ekAhWurViFMGBSQHoUMEr7",
    "agitator": "BrewDayHLTPump00000001",
    "target_temp": 135,
    "props": {
     "D": "0",
     "HLT_Sensor": "afft72Vaoj33KfkXVqyiD8",
     "I": ".1",
     "P": "15"
    },
    "auto": false
   },
   {
    "id": "oQhZqfBjSC88UNNcWE3CCv",
    "name": "Mash Tun",
    "type": "PID_HERMS",
    "sensor": "G9je5TwkPNKDE3cRVXrSci",
    "heater": "ekAhWurViFMGBSQHoUMEr7",
    "agitator": "TZf9NpePBSrStdEqr6VoTX",
    "target_temp": 0,
    "props": {
     "D": 0,
     "DeltaTemp": 5.4,
     "HLT_D": 23.1,
     "HLT_I": 0.1526,
     "HLT_P": 65.0442,
     "HLT_Sensor": "afft72Vaoj33KfkXVqyiD8",
     "I": 0.005,
     "MashIn_Pump_Within": 10,
     "Max_Boil_Output": 85,
     "Max_Boil_Temp": 208.4,
     "Max_Output": 100,
     "Max_PID_Temp": 190.4,
     "Max_Pump_Temp": 190.4,
     "P": 2,
     "Pump_Rest": "No",
     "Rest_Interval": 600,
     "Rest_Time": 60,
     "SampleTime": 2
    },
    "auto": false
   }
  ],
  "sensor": [
   {
    "id": "bo8gTWBKSSJUeLfuSWUJmx",
    "name": "Boil Temp",
    "type": "SimVessel",
    "props": {
     "Ambient": 68.0,
     "Coupled_Sensor": "",
     "Coupling_UA": 0,
     "Heater": "CPgMajE4XGucCT8fbw2xQf",
     "Heater_Lag": 30,
     "Heater_Watts": 5500,
     "Loss_UA": 25,
     "Sensor_Lag": 20,
     "Start_Temp": 68.0,
     "Volume": 40
    }
   },
   {
    "id": "afft72Vaoj33KfkXVqyiD8",
    "name": "HLT Temp",
    "type": "SimVessel",
    "props": {
     "Ambient": 68,
     "Coupled_Sensor": "G9je5TwkPNKDE3cRVXrSci",
     "Coupling_Pump": "TZf9NpePBSrStdEqr6VoTX",
     "Coupling_UA": 300,
     "Heater": "ekAhWurViFMGBSQHoUMEr7",
     "Heater_Lag": 30,
     "Heater_Watts": "6500",
     "Idle_Coupling_Fraction": 5,
     "Loss_UA": 20,
     "Sensor_Lag": 20,
     "Start_Temp": 168.8,
     "Volume": 40
    }
   },
   {
    "id": "G9je5TwkPNKDE3cRVXrSci",
    "name": "Mash Temp",
    "type": "SimVessel",
    "props": {
     "Ambient": 68.0,
     "Coupled_Sensor": "afft72Vaoj33KfkXVqyiD8",
     "Coupling_Pump": "TZf9NpePBSrStdEqr6VoTX",
     "Coupling_UA": 300,
     "Heater": "",
     "Heater_Lag": 30,
     "Heater_Watts": 0,
     "Idle_Coupling_Fraction": 5,
     "Loss_UA": 15,
     "Sensor_Lag": 20,
     "Start_Temp": 68.0,
     "Volume": 30
    }
   }
  ],
  "actor": [
   {
    "id": "CPgMajE4XGucCT8fbw2xQf",
    "name": "Boil Heater",
    "type": "DummyActor",
    "props": {},
    "power": 70,
    "on": false
   },
   {
    "id": "TB4KRvhTsWJXEJro2VdT7k",
    "name": "Glycol Pump",
    "type": "DummyActor",
    "props": {},
    "power": 100,
    "on": false
   },
   {
    "id": "ekAhWurViFMGBSQHoUMEr7",
    "name": "HLT Heater",
    "type": "DummyActor",
    "props": {},
    "power": 100,
    "on": false
   },
   {
    "id": "BrewDayHLTPump00000001",
    "name": "HLT Pump",
    "type": "DummyActor",
    "props": {},
    "power": 100,
    "on": false
   },
   {
    "id": "TZf9NpePBSrStdEqr6VoTX",
    "name": "Mash Pump",
    "type": "DummyActor",
    "props": {},
    "power": 100,
    "on": false
   }
  ],
  "readings": {
   "afft72Vaoj33KfkXVqyiD8": 68.2,
   "G9je5TwkPNKDE3cRVXrSci": 67.9,
   "bo8gTWBKSSJUeLfuSWUJmx": 68.4
  },
  "fermenters": 0
 },
 "rig": {
  "brewery": "CraftBeerPi Brewery",
  "unit": "F",
  "mashTun": "rk-mt",
  "boilKettle": "rk-bk",
  "kettle": [
   {
    "id": "rk-bk",
    "name": "Boil Kettle",
    "type": "BoilPower",
    "sensor": "rs-bk",
    "heater": "ra-bk",
    "agitator": "",
    "target_temp": 0,
    "props": {
     "Boil_Power": 36,
     "Boil_Threshold": 210.2,
     "Hold_Target": "",
     "Keep_Boiling": "No",
     "Max_Output": 100,
     "Paused": "No",
     "Paused_At": "",
     "SampleTime": 2
    },
    "auto": false
   },
   {
    "id": "rk-hlt",
    "name": "HLT",
    "type": "PIDBoil",
    "sensor": "rs-hlt",
    "heater": "ra-hlt",
    "agitator": "ra-rec",
    "target_temp": 0,
    "props": {
     "D": "0",
     "HLT_Sensor": "afft72Vaoj33KfkXVqyiD8",
     "I": "0.004167",
     "P": "15",
     "SampleTime": 2,
     "Max_Output": "100",
     "Boil_Threshold": "212",
     "Max_Boil_Output": "100"
    },
    "auto": false
   },
   {
    "id": "rk-mt",
    "name": "Mash Tun",
    "type": "PID_HERMS",
    "sensor": "rs-mt",
    "heater": "ra-hlt",
    "agitator": "ra-wort",
    "target_temp": 0,
    "props": {
     "D": "0",
     "DeltaTemp": "5.4",
     "HLT_D": "0",
     "HLT_I": "0.004167",
     "HLT_P": "15",
     "HLT_Sensor": "rs-hlt",
     "I": "0.005",
     "MashIn_Pump_Within": 10,
     "Max_Boil_Output": "85",
     "Max_Boil_Temp": "208.4",
     "Max_Output": "100",
     "Max_PID_Temp": "190.4",
     "Max_Pump_Temp": "207",
     "P": "2",
     "Pump_Rest": "No",
     "Rest_Interval": "600",
     "Rest_Time": "60",
     "SampleTime": 2,
     "MashIn_DeltaTemp": "12",
     "Sensor_Stale_Seconds": "600"
    },
    "auto": false
   }
  ],
  "sensor": [
   {
    "id": "rs-bk",
    "name": "BK",
    "type": "OneWire",
    "props": {
     "Sensor": "28-3c01d607a1b2",
     "offset": 0,
     "Interval": 1,
     "Kettle": "rk-bk",
     "ReducedLogging": 60,
     "TempRange": 0
    }
   },
   {
    "id": "rs-hlt",
    "name": "Temp_HLT",
    "type": "OneWire",
    "props": {
     "Sensor": "28-0316a2794bff",
     "offset": 0,
     "Interval": 1,
     "Kettle": "rk-hlt",
     "ReducedLogging": 60,
     "TempRange": 0
    }
   },
   {
    "id": "rs-mt",
    "name": "Temp_Mash",
    "type": "OneWire",
    "props": {
     "Sensor": "28-0416c1f2e7ff",
     "offset": 0,
     "Interval": 1,
     "Kettle": "rk-mt",
     "ReducedLogging": 60,
     "TempRange": 0
    }
   }
  ],
  "actor": [
   {
    "id": "ra-bk",
    "name": "BK_HEAT",
    "type": "GPIOPWMActor",
    "props": {
     "GPIO": 5,
     "Frequency": 0.5,
     "Inverted": "No"
    },
    "power": 100,
    "on": false
   },
   {
    "id": "ra-hlt",
    "name": "HLT_HEAT",
    "type": "GPIOPWMActor",
    "props": {
     "GPIO": 6,
     "Frequency": 0.5,
     "Inverted": "No"
    },
    "power": 100,
    "on": false
   },
   {
    "id": "ra-rec",
    "name": "Recirc_PUMP",
    "type": "GPIOActor",
    "props": {
     "GPIO": 7,
     "Inverted": "No",
     "SamplingTime": 5
    },
    "power": 100,
    "on": false
   },
   {
    "id": "ra-wort",
    "name": "Wort PUMP",
    "type": "GPIOActor",
    "props": {
     "GPIO": 8,
     "Inverted": "No",
     "SamplingTime": 5
    },
    "power": 100,
    "on": false
   }
  ],
  "readings": {
   "rs-bk": 65.4,
   "rs-hlt": 66.9,
   "rs-mt": 66.2
  },
  "fermenters": 0,
  "madeUp": true
 },
 "types": {
  "kettle": {
   "Hysteresis": [
    {
     "label": "OffsetOn",
     "type": "number",
     "description": "Offset below target temp when heater should switched on"
    },
    {
     "label": "OffsetOff",
     "type": "number",
     "description": "Offset below target temp when heater should switched off"
    }
   ],
   "PIDBoil": [
    {
     "label": "P",
     "type": "number",
     "description": "P Value of PID"
    },
    {
     "label": "I",
     "type": "number",
     "description": "I Value of PID"
    },
    {
     "label": "D",
     "type": "number",
     "description": "D Value of PID"
    },
    {
     "label": "SampleTime",
     "type": "select",
     "description": "PID Sample time in seconds. Default: 5 (How often is the output calculation done)",
     "options": [
      2,
      5
     ]
    },
    {
     "label": "Max_Output",
     "type": "number",
     "description": "Power before Boil threshold is reached."
    },
    {
     "label": "Boil_Threshold",
     "type": "number",
     "description": "When this temperature is reached, power will be set to Max Boil Output (default: 98 °C/208 F)"
    },
    {
     "label": "Max_Boil_Output",
     "type": "number",
     "description": "Power when Boil Threshold is reached.",
     "default_value": 85
    },
    {
     "label": "Boil_Plateau_Minutes",
     "type": "number",
     "description": "Also treat a stalled temperature at full power as boiling, after this many minutes. 0 disables.",
     "default_value": 3
    }
   ],
   "PID_HERMS": [
    {
     "label": "HLT_Sensor",
     "type": "sensor",
     "description": "Sensor of HLT Kettle"
    },
    {
     "label": "DeltaTemp",
     "type": "number",
     "description": "Width of the HLT overshoot band, in the configured temperature unit. The mash (outer) PID raises the HLT setpoint up to mash_target + DeltaTemp when it wants heat, and eases it back toward mash_target as the mash reaches setpoint, so at rest the HLT sits close to the mash temperature. A HERMS only moves heat while the HLT is hotter than the wort, so this must be greater than 0; values of 0 or less are raised to a small floor. System-dependent (insulation, hose length/run, HERMS coil surface area and efficiency) - tune it to your rig. Lower tracks the mash more tightly and is gentler on enzymes but ramps slower; higher ramps faster but risks denaturing enzymes in the coil.",
     "default_value": 3
    },
    {
     "label": "MashIn_DeltaTemp",
     "type": "number",
     "description": "Width of the HLT overshoot band while the mash tun holds only water, i.e. during Mash In before the grain goes in. DeltaTemp is a compromise between ramp rate and not cooking enzymes in the coil - but there are no enzymes in the tun yet, so that compromise is being paid for nothing. Measured on a 30 L / 6.5 kW HERMS heating tap water to a 163 F strike: at DeltaTemp 5.4 F the ramp takes 64 min and 13.6 of those are spent on the final 5 F; at 12 F it is 54 min with 5.2 on the final 5 F. Returns flatten past about 18 F because the element saturates. Leave blank to use DeltaTemp and change nothing. The wider band applies only from the start of Mash In until strike temperature is reached, which is exactly the window in which the tun is known to be grain-free."
    },
    {
     "label": "MashIn_Pump_Within",
     "type": "number",
     "description": "Mash In only, while the tun holds water and no grain: keep the pump off and heat the HLT alone until it is within this many degrees of the mash target, then circulate - so hot water runs through the hoses for the end of the heat-up only, which is worth having for an unattended start such as BrewStart's Ready by. The element runs flat out either way, so the heat-up takes about as long. Set it wider than the HLT element's proportional band, about 100 / HLT_P degrees, or the element backs off while it waits. If the HLT stops warming while it waits, the pump starts anyway, with a warning. Leave blank to circulate from the start, as before."
    },
    {
     "label": "P",
     "type": "number",
     "description": "P value of the mash (outer) PID, in degrees of HLT offset per degree of mash error. NOTE: these are NOT heater-percent gains and must not be taken from the PID AutoTune plugin - use HLT_P/HLT_I/HLT_D for that.",
     "default_value": 2.0
    },
    {
     "label": "I",
     "type": "number",
     "description": "I value of the mash (outer) PID (degrees of HLT offset per degree of mash error per second)",
     "default_value": 0.005
    },
    {
     "label": "D",
     "type": "number",
     "description": "D value of the mash (outer) PID. 0 is a good starting point - the inner HLT loop already damps the response.",
     "default_value": 0.0
    },
    {
     "label": "HLT_P",
     "type": "number",
     "description": "P value of the HLT (inner) PID - holds the HLT at the setpoint the mash loop asks for",
     "default_value": 117.0795
    },
    {
     "label": "HLT_I",
     "type": "number",
     "description": "I value of the HLT (inner) PID",
     "default_value": 0.2747
    },
    {
     "label": "HLT_D",
     "type": "number",
     "description": "D value of the HLT (inner) PID",
     "default_value": 41.58
    },
    {
     "label": "SampleTime",
     "type": "select",
     "description": "PID Sample time in seconds. Default: 5 (How often is the output calculation done)",
     "options": [
      2,
      5
     ]
    },
    {
     "label": "Max_Pump_Temp",
     "type": "number",
     "description": "Max temp the pump can work in. The pump stops when the mash reaches this, with a notification. Interpreted in the configured temperature unit; the default is 88 C / 190.4 F.",
     "default_value": 88
    },
    {
     "label": "Max_Output",
     "type": "number",
     "description": "Max power for PID and Ramp up.",
     "default_value": 100
    },
    {
     "label": "Max_Boil_Output",
     "type": "number",
     "description": "Power when Max Boil Temperature is reached.",
     "default_value": 85
    },
    {
     "label": "Max_Boil_Temp",
     "type": "number",
     "description": "When Temperature reaches this, power will be reduced to Max Boil Output. Interpreted in the configured temperature unit; the default is 98 C / 208.4 F.",
     "default_value": 98
    },
    {
     "label": "Max_PID_Temp",
     "type": "number",
     "description": "When the mash reaches this, the PID stops regulating and the element runs at a fixed Max_Output, with a notification. Interpreted in the configured temperature unit; the default is 88 C / 190.4 F."
    },
    {
     "label": "Sensor_Stale_Seconds",
     "type": "number",
     "description": "Seconds a mash or HLT sensor may repeat the exact same numeric value before heating is suspended. Default: 300 seconds.",
     "default_value": 300
    },
    {
     "label": "Rest_Interval",
     "type": "number",
     "description": "Rest the pump after this many seconds during the mash.",
     "default_value": 600
    },
    {
     "label": "Rest_Time",
     "type": "number",
     "description": "Rest the pump for this many seconds every rest interval.",
     "default_value": 60
    },
    {
     "label": "Pump_Rest",
     "type": "select",
     "description": "Rest the pump periodically. No runs it continuously - the coil then never sits full of static wort.",
     "options": [
      "Yes",
      "No"
     ]
    },
    {
     "label": "HLT_Kettle",
     "type": "kettle",
     "description": "Optional. The HLT, so its setpoint shows what this cascade is commanding. Found from HLT_Sensor when left blank."
    }
   ],
   "BoilPower": [
    {
     "label": "Boil_Threshold",
     "type": "number",
     "description": "Where this kettle boils: full power below it, Boil_Power from it. Default 99 C / 210.2 F. At altitude, set it to where your wort boils. A target within 2 C / 3.6 F of it, or above, means boil; one further below means hold."
    },
    {
     "label": "Boil_Power",
     "type": "number",
     "description": "Element duty once boiling, 0-100%. Adjustable from the dashboard while the boil runs.",
     "default_value": 85
    },
    {
     "label": "Max_Output",
     "type": "number",
     "description": "Element duty while heating up to the boil, and the most the PID may use while it holds a target below the boil.",
     "default_value": 100
    },
    {
     "label": "P",
     "type": "number",
     "description": "Holding a target below the boil - a mash in a bag, a whirlpool, a hop stand - a PID sets the element's power. P: % of power per degree below the target. Blank: 25.2 per C / 14 per F. The PID AutoTune plugin's P, I and D fit here."
    },
    {
     "label": "I",
     "type": "number",
     "description": "The PID's I: % of power per degree per second the wort stays below the target, building up within 2.8 C / 5 F of it. Blank: 0.054 per C / 0.03 per F."
    },
    {
     "label": "D",
     "type": "number",
     "description": "The PID's D: % of power taken off per degree per second the wort is rising, so it slows before the target rather than overshooting. Blank: 1620 per C / 900 per F. 0 turns it off."
    },
    {
     "label": "SampleTime",
     "type": "select",
     "description": "Seconds between control decisions. Matches PIDBoil.",
     "options": [
      2,
      5
     ]
    },
    {
     "label": "Keep_Boiling",
     "type": "select",
     "description": "Yes: if the wort falls 2 C / 3.6 F below the boil, full power brings it back. No: once it has boiled, only Boil_Power heats, and the wort may fall if that is too low. Changeable while boiling from the brew-day screen.",
     "options": [
      "Yes",
      "No"
     ],
     "default_value": "Yes"
    },
    {
     "label": "Usual_Boil_Power",
     "type": "number",
     "description": "The boil power each recipe starts at, 0-100%. When a recipe starts from its first step, Boil_Power goes back to this. Blank: Boil_Power stays as you left it."
    }
   ]
  },
  "sensor": {
   "CustomSensor": [],
   "DummyPressure": [
    {
     "label": "Pressure",
     "type": "number",
     "description": "Start Pressure"
    },
    {
     "label": "PressureIncrease",
     "type": "number",
     "description": "Pressure increase per hour"
    },
    {
     "label": "PressureDecrease",
     "type": "number",
     "description": "Pressure decrease per second on openm valve"
    },
    {
     "label": "Fermenter",
     "type": "fermenter",
     "description": "Fermenter"
    }
   ],
   "HTTPSensor": [
    {
     "label": "Key",
     "type": "text",
     "description": "Http Key"
    },
    {
     "label": "Timeout",
     "type": "number",
     "description": "Timeout in seconds to send notification (default:60 | deactivated: 0)",
     "unit": "sec"
    },
    {
     "label": "Kettle",
     "type": "kettle",
     "description": "Reduced logging if Kettle is inactive / range warning in dashboard (only Kettle or Fermenter to be selected)"
    },
    {
     "label": "Fermenter",
     "type": "fermenter",
     "description": "Reduced logging in seconds if Fermenter is inactive / range warning in dashboard (only Kettle or Fermenter to be selected)"
    },
    {
     "label": "ReducedLogging",
     "type": "number",
     "description": "Reduced logging frequency in seconds if selected Kettle or Fermenter is inactive (default: 60 sec | disabled: 0)"
    },
    {
     "label": "TempRange",
     "type": "number",
     "description": "Temp range in degree between reading and target temp of fermenter/kettle. Larger difference shows different color in dashboard (default:0 | deactivated: 0)",
     "unit": "degree"
    }
   ],
   "OneWire": [
    {
     "label": "Sensor",
     "type": "select"
    },
    {
     "label": "offset",
     "type": "number",
     "description": "Sensor Offset (Default is 0)",
     "default_value": 0
    },
    {
     "label": "Interval",
     "type": "select",
     "description": "Interval in Seconds",
     "options": [
      1,
      5,
      10,
      30,
      60
     ],
     "default_value": 1
    },
    {
     "label": "Kettle",
     "type": "kettle",
     "description": "Reduced logging if Kettle is inactive / range warning in dashboard(only Kettle or Fermenter to be selected)"
    },
    {
     "label": "Fermenter",
     "type": "fermenter",
     "description": "Reduced logging in seconds if Fermenter is inactive / range warning in dashboard (only Kettle or Fermenter to be selected)"
    },
    {
     "label": "ReducedLogging",
     "type": "number",
     "description": "Reduced logging frequency in seconds if selected Kettle or Fermenter is inactive (default: 60 sec | disabled: 0)",
     "default_value": 60
    },
    {
     "label": "TempRange",
     "type": "number",
     "description": "Temp range in degree between reading and target temp of fermenter/kettle. Larger difference shows different color in dashboard (default:0 | deactivated: 0)",
     "default_value": 0,
     "unit": "degree"
    }
   ],
   "AlarmTimer": [],
   "SimVessel": [
    {
     "label": "Volume",
     "type": "number",
     "description": "Vessel contents in litres. Bigger means slower to heat.",
     "default_value": 40
    },
    {
     "label": "Heater",
     "type": "actor",
     "description": "Actor heating this vessel. Its power setting is honoured."
    },
    {
     "label": "Heater_Watts",
     "type": "number",
     "description": "Element power in watts at 100%.",
     "default_value": 5500
    },
    {
     "label": "Coupled_Sensor",
     "type": "sensor",
     "description": "The other vessel's sensor, for HERMS coil exchange. Each points at the other."
    },
    {
     "label": "Coupling_UA",
     "type": "number",
     "description": "Coil heat transfer, W/K. Higher is a bigger coil. Same value on both vessels.",
     "default_value": 300
    },
    {
     "label": "Coupling_Pump",
     "type": "actor",
     "description": "Optional. Heat only crosses the coil while this pump runs."
    },
    {
     "label": "Idle_Coupling_Fraction",
     "type": "number",
     "description": "Percent of Coupling_UA still active with the pump off. 0 disables it.",
     "default_value": 5
    },
    {
     "label": "Loss_UA",
     "type": "number",
     "description": "Heat lost to the room, W/K. Higher means worse insulation.",
     "default_value": 15
    },
    {
     "label": "Ambient",
     "type": "number",
     "description": "Room temperature. Blank means 20C/68F."
    },
    {
     "label": "Start_Temp",
     "type": "number",
     "description": "Initial temperature. Blank means 20C/68F."
    },
    {
     "label": "Grain_Kg",
     "type": "number",
     "description": "Crushed malt mass in kg. Dough In adds it to the mash tun.",
     "default_value": 0
    },
    {
     "label": "Grain_Temp",
     "type": "number",
     "description": "Starting grain temperature. Blank means 20C/68F."
    },
    {
     "label": "Boiling_Point",
     "type": "number",
     "description": "Boils at this temperature. Blank means 100C/212F."
    },
    {
     "label": "Sensor_Lag",
     "type": "number",
     "description": "Probe response time in seconds. 0 reads the liquid instantly.",
     "default_value": 0
    },
    {
     "label": "Heater_Lag",
     "type": "number",
     "description": "Element response time in seconds. 0 delivers power instantly.",
     "default_value": 0
    },
    {
     "label": "Vessel_Mass_Kg",
     "type": "number",
     "description": "Empty vessel mass in kg. Steel has to be heated too.",
     "default_value": 0
    },
    {
     "label": "Hose_Loss_UA",
     "type": "number",
     "description": "Heat lost through hoses while the pump runs, W/K.",
     "default_value": 0
    }
   ]
  },
  "actor": {
   "DummyActor": [],
   "GPIOActor": [
    {
     "label": "GPIO",
     "type": "select",
     "options": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27
     ]
    },
    {
     "label": "Inverted",
     "type": "select",
     "description": "No: Active on high; Yes: Active on low",
     "options": [
      "Yes",
      "No"
     ]
    },
    {
     "label": "SamplingTime",
     "type": "select",
     "description": "Time in seconds for power base interval (Default:5)",
     "options": [
      2,
      5
     ]
    }
   ],
   "GPIOPWMActor": [
    {
     "label": "GPIO",
     "type": "select",
     "options": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27
     ]
    },
    {
     "label": "Frequency",
     "type": "number",
     "description": "PWM frequency in Hz. For a mains heating element on an SSR this belongs well below 1 Hz - the default 0.5 Hz is a two second period. A zero-cross SSR can only switch at a mains zero crossing, so a fast carrier quantises the duty coarsely and makes it wander; a slow one gives fine resolution and far less switching. The vessel's thermal mass makes a two second period invisible either way. Higher values are intended for a DC pump or fan, not an element.",
     "default_value": 0.5
    },
    {
     "label": "Inverted",
     "type": "select",
     "description": "Inverts PWM load if set to yes (e.g. 90% = 10%). Default: No",
     "options": [
      "Yes",
      "No"
     ]
    }
   ],
   "StepStatusActor": [
    {
     "label": "StepKind",
     "type": "select",
     "description": "Mash, Boil, Whirlpool: ready-made filters - Whirlpool also matches a step named 'Whirlpool'. Custom: choose Match by and Match text.",
     "options": [
      "Mash",
      "Boil",
      "Whirlpool",
      "Mash or Boil",
      "Mash+Boil+Whirlpool",
      "AnyActive",
      "Custom"
     ],
     "display_label": "Step kind"
    },
    {
     "label": "MatchMode",
     "type": "select",
     "description": "How the match text is compared with the running step.",
     "options": [
      "TypeContains",
      "TypeOrNameContains",
      "AnyActive",
      "TypeExact",
      "NameContains",
      "NameExact"
     ],
     "show_if": {
      "StepKind": "Custom"
     },
     "display_label": "Match by"
    },
    {
     "label": "MatchValue",
     "type": "text",
     "description": "Text to look for; separate several with commas, e.g. 'boil,whirlpool'. Blank with TypeContains: 'mash'.",
     "show_if": {
      "StepKind": "Custom"
     },
     "display_label": "Match text"
    }
   ],
   "MashStatusActor": [],
   "BoilStatusActor": [],
   "WhirlpoolStatusActor": []
  }
 },
 "blank_defaults": {
  "PIDBoil": {
   "P": 65.0442,
   "I": 0.1526,
   "D": 23.1,
   "SampleTime": 5,
   "Max_Output": 100,
   "Boil_Threshold": 208,
   "Max_Boil_Output": 85,
   "Boil_Plateau_Minutes": 3
  },
  "PID_HERMS": {
   "DeltaTemp": 5.4,
   "P": 2,
   "I": 0.005,
   "D": 0,
   "Sensor_Stale_Seconds": 300
  },
  "BoilPower": {
   "P": 14,
   "I": 0.03,
   "D": 900,
   "Boil_Power": 85,
   "Max_Output": 100,
   "SampleTime": 5,
   "Boil_Threshold": 210.2
  },
  "Hysteresis": {
   "OffsetOn": 0,
   "OffsetOff": 0
  }
 }
};
