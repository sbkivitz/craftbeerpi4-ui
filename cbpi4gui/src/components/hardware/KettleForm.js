import { Container, Breadcrumbs, Divider, Link, Paper, Typography } from "@mui/material";
import { styled } from '@mui/material/styles';
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useCBPi } from "../data";
import { useLoadExisting } from "../util/useLoadExisting";
import ActorSelect from "../util/ActorSelect";
import LogicSelect from "../util/LogicSelect";
import PropsEdit from "../util/PropsEdit";
import SensorSelect from "../util/SensorSelect";

const PREFIX = 'KettleForm';

const classes = {
  appBar: `${PREFIX}-appBar`,
  layout: `${PREFIX}-layout`,
  paper: `${PREFIX}-paper`,
  stepper: `${PREFIX}-stepper`,
  buttons: `${PREFIX}-buttons`,
  button: `${PREFIX}-button`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.appBar}`]: {
    position: "relative",
  },

  [`& .${classes.layout}`]: {
    width: "auto",
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
      width: 600,
      marginLeft: "auto",
      marginRight: "auto",
    },
  },

  [`& .${classes.paper}`]: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(3) * 2)]: {
      marginTop: theme.spacing(6),
      marginBottom: theme.spacing(6),
      padding: theme.spacing(3),
    },
  },

  [`& .${classes.stepper}`]: {
    padding: theme.spacing(3, 0, 5),
  },

  [`& .${classes.buttons}`]: {
    display: "flex",
    justifyContent: "flex-end",
  },

  [`& .${classes.button}`]: {
    marginTop: theme.spacing(3),
    marginLeft: theme.spacing(1),
  }
}));

const KettleForm = () => {
  
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const { id } = useParams();
  const [heater, setHeater] = useState("");
  const [agitator, setAgitator] = useState("");
  const [sensor, setSensor] = useState("");
  const { kettle, state, actions } = useCBPi();
  const [propsConfig, setPropsConfig] = useState(null);
  const [props, setProps] = useState({});

  // See useLoadExisting. This is the form where a blank save costs the most: a
  // kettle's props are its control logic's configuration, PID gains included.
  const ready = useLoadExisting(id, kettle.find((item) => item.id === id), (item) => {
    setName(item.name);
    setHeater(item.heater);
    setAgitator(item.agitator);
    setType(item.type);
    setSensor(item.sensor);
    setProps(item.props);
  });

  // Separate from loading, because the logic list can arrive after the record.
  useEffect(() => {
    if (type) {
      setPropsConfig(state.logic.find((i) => i.name === type)?.properties);
    }
  }, [type, state.logic]);

  const save = () => {
    if (!ready) {
      return;
    }
    const data = {
      name,
      sensor,
      heater,
      agitator,
      type,
      props,
    };

    if (id) {
      actions.update_kettle(id, data, () => navigate("/hardware"));
    } else {
      actions.add_kettle(data, () => navigate("/hardware"));
    }
  };

  const onChangeProps = (name, value) => {
    setProps({ ...props, [name]: value });
  };

  const onChangeType = (e) =>  {
    const value = e.target.value
    setType(value)
    if (value) {
      setPropsConfig(state.logic.find((i) => i.name === value)?.properties);
    }
  }

  return (
    (<Root>
      <Container maxWidth="lg">
        <Typography variant="h6" gutterBottom>
          Kettle Config
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            color="inherit"
            onClick={() => {
              navigate("/hardware");
            }}
          >
            Kettle
          </Link>
          <Typography color="textPrimary">{name}</Typography>
        </Breadcrumbs>

        <Divider />
        <Paper className={classes.paper}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField variant="standard" required id="name" label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <LogicSelect value={type} onChange={onChangeType} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ActorSelect label="Heater" value={heater} onChange={(e) => setHeater(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ActorSelect label="Agitator" value={agitator} onChange={(e) => setAgitator(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <SensorSelect value={sensor} onChange={(e) => setSensor(e.target.value)} />
            </Grid>
            <PropsEdit config={propsConfig} data={props} onChange={onChangeProps} />
          </Grid>
          <div className={classes.buttons}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                navigate("/hardware");
              }}
              className={classes.button}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={!ready}
              onClick={() => {
                save();
              }}
              className={classes.button}
            >
              Save
            </Button>
          </div>
        </Paper>
        </Container>
    </Root>)
  );
};

export default KettleForm;
