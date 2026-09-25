
import React from "react";
import { useEffect, useState } from "react";
import { useActor } from "../../data";
import { useModel } from "../DashboardContext";
import { Tooltip } from "@mui/material";
import ActorSelect from "../../util/ActorSelect";

// How long one on/off cycle takes, in seconds.
//
// GPIOActor computes heating_time = SamplingTime * power / 100 and holds the
// pin high for that long, then low for the rest, so SamplingTime is the period
// the element actually switches at. Default 5 to match the actor's own.
const dutyPeriod = (actor) => {
  const raw = Number(actor?.props?.SamplingTime);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.min(60, Math.max(0.2, raw));
};

// The duty actually being delivered, 0-100.
//
// State has to win over power: an actor keeps its last commanded percentage
// after being switched off, so off must read as nothing being delivered
// whatever power still says.
const dutyPercent = (actor) => {
  if (!actor || actor.state !== true) return 0;
  const raw = Number(actor?.power);
  if (!Number.isFinite(raw)) return 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
};

export const Led = ({ id }) => {
    const model = useModel(id)
    const actor = useActor(model.props?.actor)
    const [color, setColor] = useState(model.props.color || "green");
    useEffect(() => {
      setColor(model.props.color);

    }, [model.props.color]);

    let actortitle=actor?.name ? actor.name : "No Actor Selected"

    const duty = dutyPercent(actor);
    const period = dutyPeriod(actor);
    const cycling = duty > 0 && duty < 100;

    // Blink at the element's real duty cycle instead of sitting solid.
    //
    // A steady LED says "energized", which for a time-proportioned element is
    // only true for part of each period: at 10% power the element is on for
    // half a second in five. Showing that solid misrepresents the hardware,
    // and how hard the element is working is exactly what a brewer wants to
    // read at a glance during a boil.
    //
    // The keyframes are generated per duty because the on-fraction IS the
    // information; a fixed animation could only show that it is cycling.
    const animationName = `led-duty-${duty}`;
    const keyframes = cycling
      ? `@keyframes ${animationName} {` +
        `0%{opacity:1}` +
        `${duty}%{opacity:1}` +
        `${Math.min(duty + 0.01, 100)}%{opacity:0.15}` +
        `100%{opacity:0.15}}`
      : "";

    const style = cycling
      ? { animation: `${animationName} ${period}s linear infinite` }
      : {};

    let led_state = duty > 0 ? "led-" + color : "led-" + color + "-off "

    const onTime = (period * duty) / 100;
    const title = !actor?.name
      ? "No Actor Selected"
      : duty === 0
        ? `${actortitle} - OFF`
        : duty === 100
          ? `${actortitle} - ON, continuous`
          : `${actortitle} - ${duty}%: ${onTime.toFixed(2)}s on, ${(period - onTime).toFixed(2)}s off`;

    return (
    <Tooltip title={title} placement="top">
    <div>
      {cycling ? <style>{keyframes}</style> : null}
      <div className={led_state} style={style}></div>
    </div>
    </Tooltip>
    )

  };
  