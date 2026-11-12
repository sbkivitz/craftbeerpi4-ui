import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../alert/AlertProvider";
import { useCBPi } from "../data";
import "../brewday/fonts/barlow.css";
import { liveSnap } from "../brewday/BrewDay";
import { createBrewDay } from "../brewday/screen";
import { createSettings } from "./page";

// The Settings page (Scott, 11 Nov 2026: "I'd like the settings to be intelligently sorted and presented in groups by
// function"; he approved the Settings design agent's mockup the same day). It sits in the brew-day screen's frame, the
// live title bar, last event and tabs with SETTINGS lit (screen.js, page "settings"), and the page itself is page.js, the
// mockup's own code. Like the brew-day screen it isn't drawn by React and sits outside the app's menu bar and page frame,
// and while it is open the corner stack of notifications is hidden: the title bar shows CraftBeerPi's prompts instead.
//
// ?demo=<scene> shows one of the mockup's scenes (page.js SCENES) on its demo data instead of CraftBeerPi:
// test_ui_settings_identity.py compares it with the mockup. ?name= and ?brewscribe=none work as on the brew-day screen;
// in the demo, as in the mockup, ?name= is the Brewery name setting too.
const Settings = () => {
  const ref = useRef(null);
  const frame = useRef(null);
  const page = useRef(null);
  const { state } = useCBPi();
  const alert = useAlert();
  const navigate = useNavigate();
  const go = useRef(navigate);
  go.current = navigate;
  const { remove, hideStack, alerts, retiredReason } = alert;

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const demo = qs.get("demo");
    const title = document.title;
    // the frame puts the brewery's name first, once CraftBeerPi's settings arrive (screen.js, setBrewery)
    document.title = "Settings · CraftBeerPi";
    if (hideStack) hideStack(true);
    frame.current = createBrewDay(ref.current, {
      page: "settings",
      demo,
      name: qs.has("name") ? qs.get("name") : null,
      brewscribe: qs.get("brewscribe"),
      navigate: (path) => go.current(path),
      removeAlert: (id) => remove(id),
    });
    page.current = createSettings(frame.current.host, {
      demo,
      // in the demo, ?name= is the Brewery name setting too, as in the mockup
      name: qs.has("name") ? qs.get("name") : null,
      frame: frame.current,
      navigate: (path) => go.current(path),
    });
    return () => {
      if (page.current) page.current.destroy();
      if (frame.current) frame.current.destroy();
      page.current = null;
      frame.current = null;
      document.title = title;
      if (hideStack) hideStack(false);
    };
  }, [remove, hideStack]);

  useEffect(() => {
    if (frame.current) frame.current.update(liveSnap(state, alerts, retiredReason));
    if (page.current) {
      page.current.update({
        connected: !!state.connection,
        config: state.config,
        kettles: state.kettle,
        actors: state.actors,
        sensors: state.sensors,
        fermenters: state.fermenter,
        stepTypes: state.stepTypes,
      });
    }
  }, [state, alerts, retiredReason]);

  return <div ref={ref} className="bd-root" />;
};

export default Settings;