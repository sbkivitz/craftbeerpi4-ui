import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from "react";
import { useCBPi } from "../data";
import { isShown, shownLabel } from "./PropsEdit";

// What a step will do, in one line, so a profile can be read without opening
// each step.
//
// Built from the step's settings and its type's own declarations, so it works
// for any step, a plugin's included. The settings the core steps share are put
// in words: the kettle by name, Temp in the system's unit, Timer in minutes,
// the boil's hop additions, the message a step shows and whether it waits.
// Every other setting that is set and applies follows under its label, so
// nothing set is hidden - except a probe (the kettle's own) and the settings
// that only tune how a step does its job, which stay one click away.

// Read elsewhere, or tuning only.
const QUIET = new Set(["LidAlert", "Stop_Pump_At_Strike"]);

const blank = (value) => value === undefined || value === null || String(value).trim() === "";

const amount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : String(value);
};

const words = (label) => String(label || "").replace(/_/g, " ");

const nameOf = (list, id) => (list || []).find((item) => item.id === id)?.name;

export const describeStep = (step, type, context = {}) => {
  const props = step?.props || {};
  const declared = (type?.properties || []).filter(
    (item) => item && item.label && isShown(item, props)
  );
  const byLabel = {};
  declared.forEach((item) => {
    byLabel[item.label] = item;
  });
  const degrees = context.tempUnit === "C" ? "°C" : context.tempUnit === "F" ? "°F" : "";
  const facts = [];
  const handled = new Set();
  const say = (text, kind = "fact") => facts.push({ text, kind });
  const set = (label) => byLabel[label] && !blank(props[label]);

  const kettles = declared.filter((item) => item.type === "kettle");
  kettles.forEach((item) => {
    handled.add(item.label);
    if (!blank(props[item.label])) {
      say(nameOf(context.kettles, props[item.label]) || "kettle not found");
    }
  });

  if (byLabel.Temp) {
    handled.add("Temp");
    if (set("Temp")) {
      say(`${amount(props.Temp)} ${byLabel.Temp.unit || degrees}`.trim());
    }
  }
  if (byLabel.Timer) {
    handled.add("Timer");
    if (set("Timer")) {
      say(`${amount(props.Timer)} min`);
    }
  }

  // Mash in heats past Temp only when all three are set (MashInStep._strike_target).
  ["Grain_Kg", "Mash_Water", "Grain_Sensor"].forEach((label) => handled.add(label));
  if (set("Grain_Kg") && set("Mash_Water") && set("Grain_Sensor")) {
    say(`strike worked out for ${amount(props.Grain_Kg)} kg of grain`);
  }

  if (byLabel.First_Wort) {
    handled.add("First_Wort");
    handled.add("First_Wort_text");
    if (props.First_Wort === "Yes") {
      say(`first wort: ${blank(props.First_Wort_text) ? "hops" : props.First_Wort_text}`);
    }
  }

  const hops = [];
  Object.keys(byLabel)
    .filter((label) => /^Hop_\d+$/.test(label))
    .forEach((label) => {
      handled.add(label);
      handled.add(`${label}_text`);
      if (blank(props[label])) {
        return;
      }
      const what = blank(props[`${label}_text`])
        ? `hop ${label.slice(4)}`
        : props[`${label}_text`];
      hops.push({ at: Number(props[label]), text: `${amount(props[label])} min ${what}` });
    });
  if (hops.length) {
    hops.sort((a, b) => b.at - a.at);
    say(`hops: ${hops.map((hop) => hop.text).join(", ")}`);
  }

  if (byLabel.Notification) {
    handled.add("Notification");
    if (set("Notification")) {
      say(`“${props.Notification}”`);
    }
  }
  if (byLabel.AutoNext) {
    handled.add("AutoNext");
    if (props.AutoNext === "No") {
      say("waits for you");
    } else if (props.AutoNext === "Yes") {
      say("moves on by itself");
    }
  }
  if (byLabel.AutoMode) {
    handled.add("AutoMode");
    // The core steps switch their kettle on only for exactly "Yes".
    if (props.AutoMode !== "Yes" && kettles.some((item) => !blank(props[item.label]))) {
      say("will not switch the kettle on (AutoMode)", "warning");
    }
  }

  declared.forEach((item) => {
    const label = item.label;
    if (handled.has(label) || QUIET.has(label) || item.type === "sensor" || blank(props[label])) {
      return;
    }
    // A unit chosen in a setting of its own is shown with its number.
    const base = label.replace(/_unit$/i, "");
    if (base !== label && byLabel[base]) {
      return;
    }
    const unitItem = byLabel[`${label}_Unit`] || byLabel[`${label}_unit`];
    const unit = unitItem && !blank(props[unitItem.label]) ? props[unitItem.label] : item.unit || "";
    let value = props[label];
    if (item.type === "actor") {
      value = nameOf(context.actors, value) || "actor not found";
    } else if (item.type === "fermenter") {
      value = nameOf(context.fermenters, value) || "fermenter not found";
    } else if (item.type === "number") {
      value = amount(value);
    }
    say(`${words(shownLabel(item))} ${value}${unit ? " " + unit : ""}`);
  });

  return facts;
};

const StepSummary = ({ step }) => {
  const { state } = useCBPi();
  const type = (state.stepTypes || []).find((item) => item.name === step?.type);
  const facts = describeStep(step, type, {
    tempUnit: state.config?.TEMP_UNIT?.value,
    kettles: state.kettle,
    actors: state.actors,
    fermenters: state.fermenter,
  });
  if (!facts.length) {
    return null;
  }
  return (
    <Typography variant="body2" color="text.secondary" component="div" data-step-summary="">
      {facts.map((fact, index) => (
        <React.Fragment key={index}>
          {index > 0 ? " · " : null}
          {fact.kind === "warning" ? (
            <Box component="span" sx={{ color: "warning.main" }}>
              ⚠ {fact.text}
            </Box>
          ) : (
            fact.text
          )}
        </React.Fragment>
      ))}
    </Typography>
  );
};

export default StepSummary;
