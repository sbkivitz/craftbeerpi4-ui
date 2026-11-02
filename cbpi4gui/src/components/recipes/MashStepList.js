import { Accordion, AccordionDetails, AccordionSummary, Grid, IconButton, TextField, Typography } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import { useCBPi } from "../data";
import PropsEdit, { initialProps } from "../util/PropsEdit";
import StepSummary from "../util/StepSummary";
import StepTypeSelect from "../util/StepTypeSelect";
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

// The steps with the one at `index` moved by `delta` (-1 up, +1 down), or null
// when it is already at the top or the bottom.
//
// Swapped directly. This sorted the two positions with JavaScript's default
// sort, which compares numbers as text, so [9, 10] became [10, 9]: moving a
// step across positions 10 and 11 duplicated one step and lost another, and
// saving made the loss permanent (DEFECTS M42, GPT's G8 on 2 Nov).
export const moveStep = (array, index, delta) => {
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= array.length) {
    return null;
  }
  const values = [...array];
  [values[index], values[newIndex]] = [values[newIndex], values[index]];
  return values;
};

// A step's settings when it is given a type: the type's declared defaults, as
// the Mash Profile's own form starts a new step, with what the step already
// had kept wherever the new type has the same setting - its kettle, sensor,
// temperature, time.
//
// It started from nothing. A Mash, Mash In or Boil step with AutoMode blank
// never switches its kettle on, so the brew stalled with nothing heating, and
// changing a step's type wiped everything entered on it (DEFECTS M41,
// Gemini's R2 on 2 Nov).
export const propsForType = (config, previous) => {
  const props = initialProps(config);
  const kept = previous || {};
  (config || []).forEach((item) => {
    if (!item || !item.label) {
      return;
    }
    const value = kept[item.label];
    if (value !== undefined && value !== null && value !== "") {
      props[item.label] = value;
    }
  });
  return props;
};

const MashStepLine = ({ item, items, setItems, onSelectType, handleInput, handleInputProps, index, remove }) => {
  const { state } = useCBPi();
  const [propsConfig, setPropsConfig] = useState(null);

  useEffect(() => {
    const type2 = state.stepTypes.find((i) => i.name === item.type);
    if (type2 && type2.properties) {
      setPropsConfig(type2?.properties);
    }
  }, [item.type]);

  const onChangeProps = (name, value) => {
    handleInputProps(index, name, value);
  };

  const onRemove = (event) => {
    event.stopPropagation();
    remove(index);
  };

  const move = function (array, index, delta) {
    const values = moveStep(array, index, delta);
    if (values) {
      setItems(values);
    }
  };

  const move_up = (index) => {
    move(items, index, -1);
  };

  const move_down = (index) => {
    move(items, index, 1);
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
        <Grid container direction="row" justifyContent="space-between" alignItems="center">
          <Grid item>
            {!item.type ? <ReportProblemIcon color="secondary" fontSize="small"/>  : ""}
            <Typography display="inline">{item.name || "NO NAME"}</Typography> -{" "}
            <Typography variant="subtitle2" display="inline" color="textSecondary">
              {item.type || "NO TYPE"}
            </Typography>
            {/* Its settings, readable without opening it - and kept up to
                date while it is open and being edited. */}
            <StepSummary step={item} />
          </Grid>
          <Grid item>
            <IconButton disabled={index === items.length-1}
              edge="end"
              aria-label="delete"
              onClick={(event) => {
                event.stopPropagation();
                move_down(index);
              }}
            >
              <ArrowDownwardIcon />
            </IconButton>
            <IconButton
              disabled={index === 0}
              edge="end"
              aria-label="delete"
              onClick={(event) => {
                event.stopPropagation();
                move_up(index);
              }}
            >
              <ArrowUpwardIcon />
            </IconButton>
            <IconButton edge="end" aria-label="delete" onClick={onRemove}>
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>
      </AccordionSummary>

      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={2}>
            <TextField variant="standard" label="Name" name="name" onChange={(e) => handleInput(index, e)} value={item.name} fullWidth />
          </Grid>
          <Grid item xs={12} lg={2}>
            <StepTypeSelect value={item.type} onChange={(e) => onSelectType(index, e.target.value)} />
          </Grid>
            <Grid item sx={{ display: { xs: '12', md: 'block' } }}/>
          <PropsEdit config={propsConfig} data={item?.props || {}} onChange={onChangeProps} />
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export const MashStepList = ({ items = [], setItems }) => {
  const { state } = useCBPi();

  const handleInputProps = (index, name, value) => {
    const values = [...items];
    values[index].props[name] = value;
    setItems([...values]);
  };

  const handleInput = (index, event) => {
    const values = [...items];
    values[index][event.target.name] = event.target.value;
    setItems([...values]);
  };

  const handleSelectType = (index, value) => {
    const values = [...items];
    const config = (state.stepTypes || []).find((item) => item.name === value)?.properties;
    values[index].type = value;
    values[index].props = propsForType(config, values[index].props);
    setItems([...values]);
  };

  const remove_entry = (index) => {
    const values = [...items];
    const filteredItems = values.slice(0, index).concat(values.slice(index + 1, values.length));
    setItems(filteredItems);
  };

  const props = { items, setItems, remove: remove_entry, onSelectType: handleSelectType, handleInputProps, handleInput };

  return items.map((item, index) => <MashStepLine {...props} item={item} index={index}  />);
};
