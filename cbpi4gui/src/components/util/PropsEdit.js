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
const isBounded = (item) =>
  Number.isFinite(Number(item?.min)) && Number.isFinite(Number(item?.max));

const NumberSlider = ({ item, value, onChange }) => {
  const min = Number(item.min);
  const max = Number(item.max);
  const step = Number.isFinite(Number(item.step)) ? Number(item.step) : 1;
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
