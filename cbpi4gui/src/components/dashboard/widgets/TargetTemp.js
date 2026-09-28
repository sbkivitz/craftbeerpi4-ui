
import React from "react";
import { useActor, useKettle } from "../../data";
import { useModel } from "../DashboardContext";
import { Tooltip } from "@mui/material";
import { isBoilPowerKettle } from "./boilPower";

const configuredBoilPower = (kettle) => {
  const power = Number(kettle?.props?.Boil_Power);
  if (!Number.isFinite(power)) return 85;
  return Math.max(0, Math.min(100, Math.round(power)));
};

const liveActorPower = (actor) => {
  // An actor keeps its last commanded power after being switched off - we
  // observed state=False with power=85 on a stopped kettle. Reporting that
  // number beside the setpoint would show "212 85%" with nothing heating,
  // which is exactly the kind of readout that reads as live and is not.
  // Off means no power is being delivered, so say zero.
  if (actor && actor.state === false) return 0;
  const power = Number(actor?.power);
  if (!Number.isFinite(power)) return null;
  return Math.max(0, Math.min(100, Math.round(power)));
};

export const TargetTemp = ({ id }) => {
    
    const model = useModel(id)
    const kettle = useKettle(model.props?.kettle)
    const heater = useActor(kettle?.heater)
    const css_style = { color: model?.props?.color || "#fff", fontSize: `${model?.props?.size}px` , fontWeight: model?.props?.fontweight || 'normal' };
    const boilPower = liveActorPower(heater) ?? configuredBoilPower(kettle);


    if(!kettle) {
      return "Missing Config"
    }


    return (
      <Tooltip title={kettle.name.concat(": TargetTemp")}>
        <div style={css_style}>
          {kettle?.target_temp} {model?.props?.unit}
          {isBoilPowerKettle(kettle) ? <span style={{ marginLeft: "0.5em" }}>{boilPower}%</span> : ""}
        </div>
      </Tooltip>
    );
  };