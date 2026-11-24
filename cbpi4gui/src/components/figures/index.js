import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../alert/AlertProvider";
import { useCBPi } from "../data";
import "../brewday/fonts/barlow.css";
import { liveSnap } from "../brewday/BrewDay";
import { createBrewDay } from "../brewday/screen";
import { createFigures } from "./page";

// The Figures page: brewery figures learned from past brews, a row per brew and a column per figure, as the Figures
// mockup (design/analytics) draws them. It sits in the brew-day screen's frame, the live title bar, last event and tabs
// with FIGURES lit (screen.js, page "figures"), and the page itself is page.js, the mockup's own code. Like the brew-day
// screen it isn't drawn by React and sits outside the app's menu bar and page frame, and while it is open the corner
// stack of notifications is hidden: the title bar shows CraftBeerPi's prompts instead. #/figures and the old Analytics
// address, #/charting, both open it.
const Figures = () => {
  const ref = useRef(null);
  const frame = useRef(null);
  const page = useRef(null);
  const { state } = useCBPi();
  const alert = useAlert();
  const navigate = useNavigate();
  const go = useRef(navigate);
  go.current = navigate;
  const { remove, hideStack, alerts, retiredReason, retiredAnswer, waitingNow, waitingN, seenNow, seenN } = alert;

  useEffect(() => {
    const title = document.title;
    // the frame puts the brewery's name first, once CraftBeerPi's settings arrive (screen.js, setBrewery)
    document.title = "Figures · CraftBeerPi";
    if (hideStack) hideStack(true);
    frame.current = createBrewDay(ref.current, {
      page: "figures",
      navigate: (path) => go.current(path),
      removeAlert: (id) => remove(id),
    });
    page.current = createFigures(frame.current.host, {
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
    if (frame.current) frame.current.update(liveSnap(state, alerts, retiredReason, waitingN ? { ids: waitingNow, n: waitingN } : null, retiredAnswer,
      seenN ? { ids: seenNow, n: seenN } : null));
    if (page.current) {
      page.current.update({
        connected: !!state.connection,
        config: state.config,
        kettles: state.kettle,
        // the "figures" topics, numbered: the page reads GET /figures again on each it hasn't had
        figures: state.figures,
        // the strike water box's state, for its forecast with the tun's steel in use
        strike: state.strike,
      });
    }
  }, [state, alerts, retiredReason, retiredAnswer, waitingNow, waitingN, seenNow, seenN]);

  return <div ref={ref} className="bd-root" />;
};

export default Figures;
