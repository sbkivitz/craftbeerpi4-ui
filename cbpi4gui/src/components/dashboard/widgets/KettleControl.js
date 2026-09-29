import { Slider, Tooltip } from "@mui/material";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CachedIcon from "@mui/icons-material/Cached";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import React, { useContext, useEffect, useState, useMemo } from "react";
import { useCBPi, useKettle } from "../../data";
import { useActor, useKettleLogicType } from "../../data/index";
import { DashboardContext, useModel } from "../DashboardContext";
import { configapi } from "../../data/configapi";
import PropsEdit from "../../util/PropsEdit";

// Seed an action's parameters from what the kettle is actually configured with.
//
// A parameter whose label matches a configured property opens showing the value
// in force, rather than blank. That is a convention, not a special case: any
// plugin whose action sets a property it also declares gets it for free, and
// anything else falls back to the parameter's own default_value.
//
// Without it the dialog opens empty and "Set" would write whatever the brewer
// had not typed - which on a boil is a power of nothing.
const seedActionProps = (action, kettle) => {
  const seeded = {};
  (action?.parameters || []).forEach((p) => {
    const configured = kettle?.props?.[p.label];
    if (configured !== undefined && configured !== null && configured !== "") {
      seeded[p.label] = configured;
    } else if (p.default_value !== undefined && p.default_value !== null) {
      seeded[p.label] = p.default_value;
    }
  });
  return seeded;
};

const TargetTempDialog = ({ onClose, kettle, open }) => {
  let TEMP_UNIT = "TEMP_UNIT";
  const [value, setValue] = useState(30);
  const [checkunit, setCheckUnit] = useState(false);
  const [minval, setMinval] = useState(0);
  const [maxval, setMaxval] = useState(100);
  const [marks, setMarks] = useState(
    [
      {
        value: 0,
        label: "0°",
      },
            {
        value: 20,
        label: "20°",
      },
      {
        value: 50,
        label: "50°",
      },
      {
        value: 100,
        label: "100°",
      },
    ]
  );

  const marksF = [
          {
      value: 32,
      label: "32°",
    },
    {
      value: 50,
      label: "50°",
    },
    {
      value: 100,
      label: "100°",
    },
    {
      value: 150,
      label: "150°",
    },
    {
      value: 212,
      label: "212°",
    },
  ];

  const {actions} = useCBPi()
  const logicType = useKettleLogicType(kettle?.type);
  const logicActions = useMemo(() => logicType?.actions || [], [logicType]);
  // One props bag per action, keyed by action method.
  const [actionProps, setActionProps] = useState({});

  useEffect(()=>{
    setValue(kettle?.target_temp)
  },[kettle?.target_temp])

  useEffect(()=>{
    // Seed when the dialog opens, and only then.
    //
    // This depended on the whole `kettle` object, which is replaced on every
    // websocket update - temperature, state, actor power - so at a two second
    // control loop the effect re-fired constantly and reset the fields while
    // the brewer was still editing them. It looked exactly like the server
    // rejecting the change.
    if (open) {
      const seeded = {};
      logicActions.forEach((a) => {
        seeded[a.method] = seedActionProps(a, kettle);
      });
      setActionProps(seeded);
    }
  },[open, kettle?.id, logicActions])

  
  if (checkunit === false){
      configapi.getone(TEMP_UNIT, (data) => {
        if (data==="F"){
          setMinval(32);
          setMaxval(212);
          setMarks(marksF);
        }
        setCheckUnit(true);
        });
      };
    
  if (!kettle) return "";

  const handleClose = () => {
    onClose();
  };

  const handleSet = () => {
    actions.target_temp_kettle(kettle.id, value)
    // Dispatch whatever the logic declared, in the order it declared it.
    // Nothing here knows what any particular action means.
    logicActions.forEach((a) => {
      actions.kettle_action(kettle.id, a.method, actionProps[a.method] || {});
    });
    onClose();
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleActionPropChange = (method) => (name, newValue) => {
    setActionProps((current) => ({
      ...current,
      [method]: { ...(current[method] || {}), [name]: newValue },
    }));
  };

  return (
    <Dialog fullWidth onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      <DialogTitle id="simple-dialog-title">Set Target Temp {kettle.name}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h2" component="h2" gutterBottom>
              {value}°
            </Typography>
          </div>
          <Slider min={minval} max={maxval} marks={marks} step={1} value={value} onChange={handleChange} aria-labelledby="continuous-slider" />
          {/*
            Whatever the kettle's logic declares, rendered from its own
            metadata. A logic that declares no actions - which is every logic
            CraftBeerPi ships - renders nothing here, so this dialog is
            unchanged for them.
          */}
          {logicActions.map((a) => (
            <div key={a.method} style={{ marginTop: 18 }}>
              <Typography variant="body2" style={{ color: "#9aa4b2", marginBottom: 4 }}>
                {a.label}
              </Typography>
              {a.parameters && a.parameters.length > 0 ? (
                <Grid container spacing={3}>
                  <PropsEdit
                    config={a.parameters}
                    onChange={handleActionPropChange(a.method)}
                    props={actionProps[a.method] || {}}
                  />
                </Grid>
              ) : (
                <Typography variant="caption" style={{ color: "#6b7280" }}>
                  Runs when you press Set.
                </Typography>
              )}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12 }}>
            <Button variant="contained" onClick={handleClose} color="secondary" autoFocus>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSet} color="primary" autoFocus
              >
              Set
            </Button>
          </div>
        </DialogContentText>
      </DialogContent>
      <DialogActions></DialogActions>
    </Dialog>
  );
};

export const KettleControl = ({ id }) => {
  const { state } = useContext(DashboardContext);
  const [open, setOpen] = React.useState(false);
  const model = useModel(id);
  const cbpi = useCBPi();
  const kettle = useKettle(model.props?.kettle);
  const heater = useActor(kettle?.heater);
  const agitator = useActor(kettle?.agitator);
  const toggle = (id) => {
    cbpi.actions.toggle_actor(id);
  };
  const toggle_kettle_logic = (id) => {
    cbpi.actions.toggle_logic(id);
  };

    return useMemo(() => {
    const orientation = model?.props?.orientation === "horizontal" ? "horizontal" : "vertical";
    const size = () => {
      if (model.props.size === "large") {
        return "large"
      }
      else if (model.props.size === "small") {
        return "small"
      }
      else { 
        return "medium"
      }
    };
    const placement = orientation === "vertical" ? "right" : "bottom"; 
    
    //console.log(kettle?.state, heater?.state  )
    return (
      <>
        <ButtonGroup size={size()} disabled={state.draggable || !model.props.kettle} orientation={orientation} color="primary" aria-label="contained primary button group">
           {heater ? <Tooltip title={kettle ? kettle.name.concat(": Heater") : "Heater"} placement={placement}>
            <Button variant={heater?.state ? "contained" : "outlined"}  color="primary" startIcon={<WhatshotIcon />} onClick={() => toggle(kettle?.heater)}></Button>
            </Tooltip> : ""}
          {agitator ? <Tooltip title={kettle ? kettle.name.concat(": Agitator") : "Agitator"} placement={placement}>
            <Button variant={agitator?.state ? "contained" : "outlined"}  color="primary" startIcon={<CachedIcon />} onClick={() => toggle(kettle?.agitator)}></Button>
           </Tooltip> : ""}
          {kettle?.type ? <Tooltip title={kettle ? kettle.name.concat(": Auto mode") : "Auto Mode"} placement={placement}>
            <Button variant={kettle?.state ? "contained" : "outlined"}  color="primary" startIcon={<DriveEtaIcon />} onClick={() => toggle_kettle_logic(kettle?.id)}></Button>
           </Tooltip> : ""}
          <Tooltip title={kettle ? kettle.name.concat(": Target temperature") : "Target Temperature"} placement={placement}>
            <Button variant="outlined"  color="primary" onClick={() => setOpen(true)} startIcon={<TrackChangesIcon />}></Button>
          </Tooltip>  
        </ButtonGroup>
        
      <TargetTempDialog open={open} kettle={kettle} onClose={() => setOpen(false)} />
      </>
    );
  }, [state.draggable, kettle, model.props.orientation, model.props.size, agitator, heater, open]);
};
