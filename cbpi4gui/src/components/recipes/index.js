import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAlert } from "../alert/AlertProvider";
import { useCBPi } from "../data";
import "../brewday/fonts/barlow.css";
import { liveSnap } from "../brewday/BrewDay";
import { createBrewDay } from "../brewday/screen";
import { createRecipes } from "./page";

const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    // an address that isn't encoded: as it is
    return s;
  }
};

// The address's view: #/recipes the Recipe Book, #/recipes/<file> that recipe in the column, #/recipe/<file> that recipe
// being changed and #/upload importing, on the RECIPE BOOK tab; #/mashprofile and #/brewsteps Brew Steps, #/step/<id>
// that step's settings and #/step its + STEP, on the BREW STEPS tab.
export const routeOf = (pathname) => {
  const p = pathname || "";
  let m;
  if ((m = /^\/recipes\/(.+)$/.exec(p))) return { mode: "book", kind: "open", file: decode(m[1]) };
  if (/^\/recipes\/?$/.test(p)) return { mode: "book", kind: "list" };
  if ((m = /^\/recipe\/(.+)$/.exec(p))) return { mode: "book", kind: "edit", file: decode(m[1]) };
  if (/^\/upload\/?$/.test(p)) return { mode: "book", kind: "upload" };
  if ((m = /^\/step\/(.+)$/.exec(p))) return { mode: "steps", kind: "step", id: decode(m[1]) };
  if (/^\/step\/?$/.test(p)) return { mode: "steps", kind: "add" };
  return { mode: "steps", kind: "steps" };
};

// The recipe pages: the Recipe Book, a recipe's steps, importing, and Brew Steps, as the recipe pages' mockup
// (design/recipes) draws them. Each sits in the brew-day screen's frame, the live title bar, last event and tabs with
// RECIPE BOOK or BREW STEPS lit (screen.js, page "recipes" or "brewsteps"), and the page itself is page.js, the
// mockup's own code. Like the brew-day screen it isn't drawn by React and sits outside the app's menu bar and page frame,
// and while it is open the corner stack of notifications is hidden: the title bar shows CraftBeerPi's prompts instead.
// Every address of one tab shows this one page, which stays open as the address changes between them, so changes not
// saved stay with it; the other tab's addresses open the other page.
const Recipes = () => {
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
  const mode = route.mode;
  const { remove, hideStack, alerts, retiredReason, retiredAnswer, waitingNow, waitingN, seenNow, seenN } = alert;

  useEffect(() => {
    const title = document.title;
    // the frame puts the brewery's name first, once CraftBeerPi's settings arrive (screen.js, setBrewery)
    document.title = `${mode === "steps" ? "Brew Steps" : "Recipe Book"} · CraftBeerPi`;
    if (hideStack) hideStack(true);
    frame.current = createBrewDay(ref.current, {
      page: mode === "steps" ? "brewsteps" : "recipes",
      navigate: (path) => go.current(path),
      removeAlert: (id) => remove(id),
    });
    page.current = createRecipes(frame.current.host, {
      frame: frame.current,
      mode,
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
  }, [remove, hideStack, mode]);

  useEffect(() => {
    if (page.current) page.current.route({ ...routeOf(location.pathname), path: location.pathname, state: location.state || null });
  }, [location.pathname, location.state, location.key, mode]);

  useEffect(() => {
    if (frame.current) frame.current.update(liveSnap(state, alerts, retiredReason, waitingN ? { ids: waitingNow, n: waitingN } : null, retiredAnswer,
      seenN ? { ids: seenNow, n: seenN } : null));
    if (page.current) {
      page.current.update({
        connected: !!state.connection,
        // GET /system/ has answered: a record not in it isn't there
        loaded: !!state.auth,
        version: state.version,
        config: state.config,
        kettles: state.kettle,
        logic: state.logic,
        sensors: state.sensors,
        actors: state.actors,
        steps: state.mashProfile,
        basic: state.mashBasic,
        stepTypes: state.stepTypes,
        bf: state.bf_recipes,
      });
    }
  }, [state, alerts, retiredReason, retiredAnswer, waitingNow, waitingN, seenNow, seenN, mode]);

  return <div ref={ref} className="bd-root" />;
};

export default Recipes;
