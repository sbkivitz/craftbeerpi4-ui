import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAlert } from "../alert/AlertProvider";
import { useCBPi } from "../data";
import "../brewday/fonts/barlow.css";
import { liveSnap } from "../brewday/BrewDay";
import { createBrewDay } from "../brewday/screen";
import { createHardware } from "./page";

// The address's item: #/kettle/<id>, #/sensor/<id> or #/actor/<id> opens one, #/kettle, #/sensor or #/actor a new one,
// and #/hardware the list.
const routeOf = (pathname) => {
  const m = /^\/(kettle|sensor|actor)(?:\/(.+))?$/.exec(pathname || "");
  if (!m) return {};
  let id = m[2] || "";
  try {
    id = decodeURIComponent(id);
  } catch (e) {
    // an address that isn't encoded: as it is
  }
  return id ? { kind: m[1], id } : { kind: m[1] };
};

// The Hardware page: the kettles, probes and switches by vessel, as the Hardware mockup (design/hardware) draws them.
// It sits in the brew-day screen's frame, the live title bar, last event and tabs with HARDWARE lit (screen.js, page
// "hardware"), and the page itself is page.js, the mockup's own code. Like the brew-day screen it isn't drawn by React
// and sits outside the app's menu bar and page frame, and while it is open the corner stack of notifications is hidden:
// the title bar shows CraftBeerPi's prompts instead. Every Hardware address shows this one page, which stays open as the
// address changes between them, so changes not saved stay with it.
const Hardware = () => {
  const ref = useRef(null);
  const frame = useRef(null);
  const page = useRef(null);
  const { state } = useCBPi();
  const alert = useAlert();
  const navigate = useNavigate();
  const go = useRef(navigate);
  go.current = navigate;
  const location = useLocation();
  const route = routeOf(location.pathname);
  const { remove, hideStack, alerts, retiredReason, retiredAnswer, waitingNow, waitingN, seenNow, seenN } = alert;

  useEffect(() => {
    const title = document.title;
    // the frame puts the brewery's name first, once CraftBeerPi's settings arrive (screen.js, setBrewery)
    document.title = "Hardware · CraftBeerPi";
    if (hideStack) hideStack(true);
    frame.current = createBrewDay(ref.current, {
      page: "hardware",
      navigate: (path) => go.current(path),
      removeAlert: (id) => remove(id),
    });
    page.current = createHardware(frame.current.host, {
      frame: frame.current,
      navigate: (path, options) => go.current(path, options),
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
    if (page.current) page.current.route({ kind: route.kind, id: route.id });
  }, [route.kind, route.id]);

  useEffect(() => {
    if (frame.current) frame.current.update(liveSnap(state, alerts, retiredReason, waitingN ? { ids: waitingNow, n: waitingN } : null, retiredAnswer,
      seenN ? { ids: seenNow, n: seenN } : null));
    if (page.current) {
      page.current.update({
        connected: !!state.connection,
        // GET /system/ has answered: a record not in it isn't there
        loaded: !!state.auth,
        config: state.config,
        kettles: state.kettle,
        sensors: state.sensors,
        actors: state.actors,
        fermenters: state.fermenter,
        logic: state.logic,
        sensorTypes: state.sensorTypes,
        actorTypes: state.actorTypes,
        sensorData: state.sensorData,
      });
    }
  }, [state, alerts, retiredReason, retiredAnswer, waitingNow, waitingN, seenNow, seenN]);

  return <div ref={ref} className="bd-root" />;
};

export default Hardware;
