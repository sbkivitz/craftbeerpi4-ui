import { FormHelperText, Grid, InputLabel, MenuItem, Select, Slider, TextField, Typography } from "@mui/material";
import { useEffect } from "react";
import ActorSelect from "./ActorSelect";
import KettleSelect from "./KettleSelect";
import FermenterSelect from "./FermenterSelect";
import SensorSelect from "./SensorSelect";

const SelectInput = ({ label, description="", options=[], value, onChange }) => {
    return (
      <>
        <InputLabel shrink id="demo-simple-select-placeholder-label-label">
          {label}
        </InputLabel>
        <Select variant="standard" fullWidth labelId="demo-simple-select-label" id="demo-simple-select" value={value} onChange={onChange}>
        <MenuItem key="actor-non" value="">---</MenuItem>
          {options.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{description}</FormHelperText>
      </>
    );
  };

// A bounded number is offered as a slider rather than a free-text field.
//
// Opt-in and backward compatible: a Property.Number that declares neither min
// nor max is indistinguishable from one written before these existed, and falls
// through to the TextField below exactly as it always has.
//
// It is also a correctness improvement, not only ergonomics. A text field
// accepts an empty string, a stray minus, or 800 on a percentage; a bounded
// slider cannot produce any of them, so the value that reaches a control loop
// is always within the range the plugin author declared.

// Bounds arrive from the server as JSON, where an undeclared bound is null
// rather than absent - Property.Number emits "min": null, "max": null,
// "step": null.
//
// That matters because Number(null) is 0 and Number.isFinite(0) is true. An
// earlier version of isBounded coerced first, so EVERY unbounded numeric
// property was judged bounded and rendered as a slider pinned to [0, 0]: a
// control that can only ever report zero, over a stored value it also refuses
// to display. Sixty-two native declarations carry no bounds, so that was most
// of the numeric fields in the interface.
//
// Null and undefined are therefore rejected before any coercion, and an
// explicit 0 is kept - 0 is a legitimate bound, and the whole point is to tell
// a declared zero apart from an absent one.
const asBound = (value) => {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const isBounded = (item) => {
  const min = asBound(item?.min);
  const max = asBound(item?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }
  // An inverted or empty range cannot produce a usable control, and MUI
  // renders a slider with max <= min as a dead track.
  if (!(max > min)) {
    return false;
  }
  // A declared step has to be positive. An absent one is fine and defaults to
  // 1 in NumberSlider; a declared 0 or negative would make the slider
  // unusable, so fall back to a text field rather than ship a broken control.
  const step = asBound(item?.step);
  if (!Number.isNaN(step) && !(step > 0)) {
    return false;
  }
  return true;
};

const NumberSlider = ({ item, value, onChange }) => {
  const min = asBound(item.min);
  const max = asBound(item.max);
  const declaredStep = asBound(item.step);
  const step = Number.isFinite(declaredStep) && declaredStep > 0 ? declaredStep : 1;
  // A slider cannot render undefined or "", and an out-of-range stored value
  // would otherwise place the thumb off the track.
  const numeric = Number(value);
  const current = Number.isFinite(numeric)
    ? Math.min(max, Math.max(min, numeric))
    : min;
  return (
    <>
      <InputLabel shrink>{item.label}</InputLabel>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h5" component="span">
          {current}
          {item.unit ? <span style={{ fontSize: "0.7em" }}>{item.unit}</span> : null}
        </Typography>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={current}
        marks={[
          { value: min, label: `${min}${item.unit || ""}` },
          { value: max, label: `${max}${item.unit || ""}` },
        ]}
        onChange={(e, v) => onChange(v)}
        aria-label={item.label}
      />
      <FormHelperText>{item.description}</FormHelperText>
    </>
  );
};

const PropsEdit = ({ config, onChange = () => {}, data={}}) => {
  useEffect(() => {}, [config, data]);
  //console.log(config)
  if (!config) {
    return <></>;
  }
  
  const render_input = (item) => {
   
    switch (item.type) {
      case "select":
        //console.log(1,item.description)
        return <SelectInput description={item.description} label={item.label} options={item.options} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "kettle":
        return <KettleSelect description={item.description} label={item.label} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "fermenter":
        return <FermenterSelect description={item.description} label={item.label} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "sensor":
        return <SensorSelect description={item.description} label={item.label} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "actor":
        return <ActorSelect description={item.description} label={item.label} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "number":
        // Bounded numbers get a slider; everything else is unchanged.
        if (isBounded(item)) {
          return (
            <NumberSlider
              item={item}
              value={data[item.label]}
              onChange={(v) => onChange(item.label, v)}
            />
          );
        }
        return <TextField variant="standard" helperText={item.description}  value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} type="number" label={item.label} fullWidth/>;
      default:
        return <TextField variant="standard" helperText={item.description} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} label={item.label} fullWidth/>;
    }
  };

  return (
    <>
      {config.map((item) => (
        // A slider needs room to be draggable; a text field does not.
        item.type === "number" && isBounded(item) ? (
          <Grid item xs={12} key={item.label}>
            {render_input(item)}
          </Grid>
        ) : (
          <Grid item  lg={2} sm={4} xs={12} md={6} key={item.label}>
            {render_input(item)}
          </Grid>
        )
      ))}
    </>
  );
};

export default PropsEdit;

// The draft an action dialog should start from.
//
// Dialogs used to open with useState({}) and submit whatever was still in it.
// Two things went wrong with that. A control the brewer never touched
// contributed nothing to the payload, while still DISPLAYING a value - a
// bounded slider with no value shows its minimum - so the dialog showed 0 and
// posted {}. And the draft was never reset, so a cancelled edit leaked into
// the next time the dialog was opened.
//
// Seeding fixes the first: what is displayed is what will be submitted.
//
// - A declared default_value is used as-is, including an explicit 0.
// - A bounded parameter with no default is seeded with the value its slider
//   will actually show, which is the minimum. Without this the slider shows
//   min and the payload omits the field entirely.
// - An unbounded parameter with no default is left absent, because its text
//   field renders blank. Blank on screen and absent in the payload agree, and
//   the server is then responsible for rejecting an incomplete command rather
//   than guessing - inventing a value here is how an empty request became
//   full power.
export const initialProps = (config) => {
  const draft = {};
  (config || []).forEach((item) => {
    if (!item || !item.label) {
      return;
    }
    if (item.default_value !== null && item.default_value !== undefined) {
      draft[item.label] = item.default_value;
      return;
    }
    if (item.type === "number" && isBounded(item)) {
      draft[item.label] = asBound(item.min);
    }
  });
  return draft;
};

export { isBounded, asBound };
