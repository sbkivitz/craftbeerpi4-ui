import { FormHelperText, Grid, InputAdornment, InputLabel, MenuItem, Select, Slider, TextField, Typography } from "@mui/material";
import { useEffect } from "react";
import ActorSelect from "./ActorSelect";
import KettleSelect from "./KettleSelect";
import FermenterSelect from "./FermenterSelect";
import SensorSelect from "./SensorSelect";

// The name a field is shown under. A plugin may give a property a
// display_label ("Time") apart from its label ("StartTime"): the label is the
// key the value is saved under and cannot change without losing every saved
// profile, while the form should read in words.
export const shownLabel = (item) => item?.display_label || item?.label;

// The options a select offers, plus the value it holds when that is no longer
// one of them - a choice a plugin has since renamed or dropped. MUI shows a
// value it has no option for as a blank, so the form would say nothing is set
// while the step goes on acting on the old value.
export const selectChoices = (options = [], value) => {
  const list = Array.isArray(options) ? options : [];
  if (value === null || value === undefined || value === "") {
    return list;
  }
  return list.some((item) => String(item) === String(value)) ? list : [...list, value];
};

const SelectInput = ({ label, description="", options=[], value, onChange }) => {
    return (
      <>
        <InputLabel shrink id="demo-simple-select-placeholder-label-label">
          {label}
        </InputLabel>
        <Select variant="standard" fullWidth labelId="demo-simple-select-label" id="demo-simple-select" value={value ?? ""} onChange={onChange}>
        <MenuItem key="actor-non" value="">---</MenuItem>
          {selectChoices(options, value).map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{description}</FormHelperText>
      </>
    );
  };

// Whether a field applies, given the values the form holds now.
//
// A property may declare show_if (cbpi.api.property.PropertyType): a dict
// needs every listed setting to hold one of its values, a list of dicts needs
// any one of them. A blank setting matches "" only. Anything else - no
// show_if, or one this version cannot read - shows the field, because hiding
// a field the brewer needs is worse than showing one they do not.
const ruleHolds = (rule, data) =>
  Object.entries(rule).every(([label, allowed]) => {
    const values = Array.isArray(allowed) ? allowed : [allowed];
    const current = data?.[label] ?? "";
    return values.some((v) => String(v ?? "") === String(current));
  });

export const isShown = (item, data = {}) => {
  const rule = item?.show_if;
  if (Array.isArray(rule)) {
    const rules = rule.filter((r) => r && typeof r === "object" && !Array.isArray(r));
    return rules.length === 0 || rules.some((r) => ruleHolds(r, data));
  }
  if (rule && typeof rule === "object") {
    return ruleHolds(rule, data);
  }
  return true;
};

// What a browser's own date or time input can display for a stored value.
//
// Those inputs only take "YYYY-MM-DD" and 24-hour "HH:MM[:SS]", and show
// anything else as empty - so a value typed in before the field had a picker,
// "11.10.26" or "6 am", would vanish from the form while the step still used
// it. Returns the value to give the picker, "" for nothing stored, or null for
// a value the picker cannot show, which the form then shows as text instead.
// "6:00" is the same time as "06:00", and is shown as that.
const PICKER_FORMAT = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}(:\d{2})?$/,
};

export const pickerValue = (kind, value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value).trim();
  if (text === "") {
    return "";
  }
  if (kind === "time" && /^\d:\d{2}(:\d{2})?$/.test(text)) {
    return "0" + text;
  }
  return PICKER_FORMAT[kind] && PICKER_FORMAT[kind].test(text) ? text : null;
};

// A date or time field, entered with the browser's own picker: a calendar and
// a clock on a desktop, the phone's wheels on a phone, in the brewer's own
// format (7:00 AM, 30/10/2026) while the value stored stays the plain
// "YYYY-MM-DD" / "HH:MM" that every step can read.
const PickerInput = ({ kind, item, value, onChange }) => {
  const shown = pickerValue(kind, value);
  if (shown === null) {
    return (
      <TextField
        variant="standard"
        label={shownLabel(item)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        helperText={`${item.description ? item.description + " " : ""}Saved as "${value}", which the ${kind} picker cannot show - clear it to pick one.`}
        fullWidth
      />
    );
  }
  return (
    <TextField
      variant="standard"
      type={kind}
      label={shownLabel(item)}
      value={shown}
      onChange={(e) => onChange(e.target.value)}
      helperText={item.description}
      fullWidth
      slotProps={{ inputLabel: { shrink: true } }}
      // The picker's calendar and clock icons follow the page's colour scheme
      // only when told; on this dark theme they are otherwise drawn black.
      sx={(theme) => ({ "& input": { colorScheme: theme.palette.mode } })}
    />
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
      <InputLabel shrink>{shownLabel(item)}</InputLabel>
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
        aria-label={shownLabel(item)}
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
    // What the brewer reads; the label stays the key the value is saved under.
    const name = shownLabel(item);
    switch (item.type) {
      case "select":
        return <SelectInput description={item.description} label={name} options={item.options} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "kettle":
        return <KettleSelect description={item.description} label={name} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "fermenter":
        return <FermenterSelect description={item.description} label={name} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "sensor":
        return <SensorSelect description={item.description} label={name} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
      case "actor":
        return <ActorSelect description={item.description} label={name} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} />;
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
        return (
          <TextField
            variant="standard"
            helperText={item.description}
            value={data[item.label]}
            onChange={(e) => onChange(item.label, e.target.value)}
            type="number"
            label={name}
            fullWidth
            // The unit a plugin declares (°F, W, min) after the number, as the
            // slider already shows it - a bare 152 leaves the brewer to guess.
            slotProps={item.unit ? { input: { endAdornment: <InputAdornment position="end">{item.unit}</InputAdornment> } } : undefined}
          />
        );
      case "date":
      case "time":
        return <PickerInput kind={item.type} item={item} value={data[item.label]} onChange={(v) => onChange(item.label, v)} />;
      default:
        return <TextField variant="standard" helperText={item.description} value={data[item.label]} onChange={(e) => onChange(item.label, e.target.value)} label={name} fullWidth/>;
    }
  };

  return (
    <>
      {config.filter((item) => isShown(item, data)).map((item) => (
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
