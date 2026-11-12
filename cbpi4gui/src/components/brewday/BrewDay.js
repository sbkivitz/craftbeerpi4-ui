import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../alert/AlertProvider";
import { useCBPi } from "../data";
import "./fonts/barlow.css";
import { createBrewDay } from "./screen";

// The brew-day screen, Scott's fixed screen for brewing (layout B, chosen 9 Nov 2026). It is not drawn by
// React: screen.js is the approved mockup's own code, so that it looks exactly like the mockup, and this
// component only hands it CraftBeerPi's state. It sits outside the app's menu bar and page frame - it has
// its own title bar and tabs - and while it is open the corner stack of notifications is hidden: its title
// bar shows CraftBeerPi's prompts instead.
//
// ?demo=mash, sparge, hop, boilpower, fail, manual or offline shows one of the mockup's moments, on its demo data, instead of
// CraftBeerPi (design/brewday/check_identity.py compares it with the mockup). ?demo=resume and longprompt are the
// screen's own, for the title bar with two buttons and with CraftBeerPi's longest question (demo.js EXTRA).
const BrewDay = () => {
  const ref = useRef(null);
  const screen = useRef(null);
  const { state } = useCBPi();
  const alert = useAlert();
  const navigate = useNavigate();
  const go = useRef(navigate);
  go.current = navigate;
  const { remove, hideStack } = alert;

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const demo = qs.get("demo");
    const title = document.title;
    // the screen puts the brewery's name first, once CraftBeerPi's settings arrive (screen.js, setBrewery)
    document.title = "Brew day · CraftBeerPi";
    if (hideStack) hideStack(true);
    screen.current = createBrewDay(ref.current, {
      demo,
      // the temperature graphs: ?graphs=none leaves them out; ?span=10, 30 or day picks the span they start at
      graphs: qs.get("graphs"),
      span: qs.get("span"),
      // with ?demo=, ?name= tries another brewery name in the title bar, as the mockup's does
      name: qs.has("name") ? qs.get("name") : null,
      // with ?demo=, ?brewscribe=none shows the screen where BrewScribe isn't installed, without its tab
      brewscribe: qs.get("brewscribe"),
      navigate: (path) => go.current(path),
      removeAlert: (id) => remove(id),
    });
    return () => {
      if (screen.current) screen.current.destroy();
      screen.current = null;
      document.title = title;
      if (hideStack) hideStack(false);
    };
  }, [remove, hideStack]);

  useEffect(() => {
    if (!screen.current) return;
    screen.current.update({
      connected: !!state.connection,
      kettles: state.kettle,
      logic: state.logic,
      actors: state.actors,
      sensorData: state.sensorData,
      config: state.config,
      steps: state.mashProfile,
      basic: state.mashBasic,
      timer: state.resttimer,
      timers: state.timers,
      alerts: alert.alerts,
      retired: alert.retiredReason,
    });
  }, [state, alert.alerts]);

  return <div ref={ref} className="bd-root" />;
};

export default BrewDay;
