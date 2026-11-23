# Product

<!-- impeccable:product-schema 1 -->

Product truth is shared with the brew-day screen's record, `C:\src\personal\craftbeerpi4-ui-impeccable\PRODUCT.md` (11 Nov 2026), which stays the authority for the brew-day screen. This copy adds what the brewer confirmed for the Settings page on 11 Nov 2026.

## Platform

web

## Users

The brewer is a homebrewer and firmware engineer who runs his own fork of CraftBeerPi 4 on his own rig. He is the only operator. On brew day he works at the rig in his garage, hands-on and often with wet hands, glancing at the screen from a distance.

He opens Settings now and then, at the desk rather than mid-brew, usually to change one setting he already knows (confirmed 11 Nov 2026).

## Product Purpose

CraftBeerPi 4 runs the brewer's electric 3-vessel HERMS (hot liquor tank, mash tun, boil kettle) from a Raspberry Pi. It reads the temperature probes, drives the heating elements and the pumps through kettle logic, and can run a recipe's brew steps.

Success on a brew day: he always knows what is happening and what comes next, and nothing switches on or off that he did not intend. Success in Settings: he finds the setting he came for quickly, can tell what it does, and can tell that his change took.

## Positioning

The software drives real hardware, kilowatt heating elements and two pumps in a hot, wet garage, and it reflects one particular rig: in a HERMS the HLT and the mash tun share one element through the coil in the HLT. A generic template cannot know that; these screens have to show it.

## Operating Context

- Main screen: a desktop monitor in the garage near the rig, worked with a mouse and keyboard; the brewer usually runs a browser window about 950 px tall. Phone at times: it must be able to do everything the desktop can.
- Two pumps: one mainly recirculates the HLT (on the rig, Recirc_PUMP, which also has its own override switch); the other moves the wort. Temperatures are in Fahrenheit.
- Brewing style: sometimes entirely by hand, sometimes running a recipe imported from BeerXML or Brewfather that automates parts of the day.
- Settings before this redesign (web UI 72af3d1, server cbpi4 4.7.7): one table of every setting, sorted by internal key with capitals first (Python's sort_keys), so related settings are scattered (the boil's sit in four places). A setting added while the server runs lands at the end until it restarts. The page is about 4 screens long at 1920×1080 and 8 on a phone. The source picker (All, craftbeerpi, steps) groups by where a setting came from, not what it does. Save is an unlabelled floppy icon that reloads the page.

## Capabilities and Constraints

- Web UI: React + MUI (`cbpi4gui`). The brew-day screen at `/` is its own renderer and stylesheet (`components/brewday`); the other pages sit in the MUI frame with the green bar. Server: cbpi4 4.7.7 (aiohttp), REST API and websocket; settings changes are now pushed to every browser (`configupdate`).
- A setting has a name (its key), value, description, type (string, number, select, kettle, sensor, actor, step, fermenter), options and a source: "craftbeerpi", "steps", "hidden", or the plugin that added it. There is no plain-language name, group, order or "needs a restart" field today.
- Plugins add their own settings, so the list differs between installs. The simulator has 54 (51 shown, 3 hidden); Brett's try-out copy on port 8012 has the same 54. Of the brewer's plugins only cbpi4_BrewStart (BREWSTART_LANGUAGE) and the simulator's cbpi4-simvessel (SIM_TIME_SCALE) add settings. Two more server settings are coming (Brett, 11 Nov): AddMashOutStep and BREWDAY_ALARM_SOUND.
- Server messages and the brew-day screen name settings by key ("No mash kettle is set. Choose it in Settings, MASH_TUN."; "BREWDAY_TIMER_NAMES in Settings is blank").
- Boundaries: designs only; Brett (session 1d63408d) builds after the brewer approves. Fermentation is paused: fermenter settings may be grouped, not designed for. Recording the brew day belongs to BrewScribe.
- Every proposed change must say whether it needs only the web UI or the server too.

## Brand Commitments

- Name: CraftBeerPi. The brewery name is a setting (BREWERY_NAME, "CraftBeerPi Brewery" on the simulator).
- The brewer likes the dark brewhouse touch-panel look and named a generic web-app look as what would make a redesign feel wrong (7 Nov).
- The Settings page takes the brew-day screen's look, with its title bar (alarms, ALL OFF, clock) and tabs (the brewer, 11 Nov: "Brew-day look, with its title bar and tabs").
- Each setting shows a plain name first, with its key underneath in small type; search finds either (the brewer, 11 Nov).

## Evidence on Hand

- Live simulator, shared and look-only: http://127.0.0.1:8000/cbpi_ui/static/index.html (Settings at `#/settings/All`). Its settings file: `C:\src\personal\cbpi-testbench\config\config.json`.
- Where each core setting is created and described: `C:\src\personal\craftbeerpi4\cbpi\extension\ConfigUpdate\__init__.py`; where each is read: the server, the plugins in `C:\src\personal\_cbpi_plugins`, and the web UI.
- The brew-day design: `C:\src\personal\craftbeerpi4-ui-impeccable\DESIGN.md` (copied here unchanged) and its mockup `proposal\brew-day.html`.
- No real values for credentials exist on the simulator (Brewfather and InfluxDB are blank or defaults); mockups must not invent real-looking secrets.

## Product Principles

1. Readable from across the garage on brew day; findable at the desk in Settings.
2. Nothing switches on by accident, and switching off is always quick.
3. Every command shows what happened: pending, done or failed.
4. One rig, any screen: the phone can do everything the desktop can; the layout adapts, the controls do not shrink.
5. Speak the brewer's words, keep CraftBeerPi's: plain names lead, keys stay visible because the software and its messages use them.

## Accessibility & Inclusion

No formal standard has been set. Known needs: reading from a distance through steam, operating with wet hands, and state that never depends on colour alone.
