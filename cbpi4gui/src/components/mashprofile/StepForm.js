import { Breadcrumbs, Container, Divider, Link, Paper, Typography } from "@mui/material";
import { styled } from '@mui/material/styles';
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CBPiContext, useCBPi } from "../data";
import { useLoadExisting } from "../util/useLoadExisting";
import { stepapi } from "../data/stepapi";
import PropsEdit from "../util/PropsEdit";
import StepTypeSelct from "../util/StepTypeSelect";

const PREFIX = 'StepForm';

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

const StepForm = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [props, setProps] = useState({})
  const [propsConfig, setPropsConfig] = useState(null);
  const { id } = useParams();
  const { state } = useCBPi();

  const { actions } = useContext(CBPiContext);

  // See useLoadExisting: a mount-only load left this form blank on a reload,
  // and Save then wrote the blank form over the real mash step - its target
  // temperature and timer included.
  const ready = useLoadExisting(id, id ? actions.get_step_by_id(id) : undefined, (k) => {
    setName(k.name);
    setType(k.type);
    setProps(k.props);
  });

  // Separate from loading, because the step types can arrive after the step.
  useEffect(() => {
    if (type) {
      setPropsConfig(state.stepTypes.find((item) => item.name === type)?.properties);
    }
  }, [type, state.stepTypes]);

  const save = () => {
    if (!ready) {
      return;
    }
    const data = {
      name,
      type,
      props,
    };

    if (id) {
      stepapi.save(id, data, (data) => {
        
        navigate("/mashprofile");
      });
    } else {
      stepapi.add(data, (data) => {
        
        navigate("/mashprofile");
      });
    }
  };
  const onSelectType = (e) => {
    const name = e.target.value;
    setType(name);
    const type2 = state.stepTypes.find((item) => item.name === name);
    setPropsConfig(type2?.properties);
  };
  const onChangeProps = (name, value) => setProps({...props, [name]: value})

  return (
    (<Root>
      <Container maxWidth="lg">
       <Typography variant="h6" gutterBottom>
         Step Config
       </Typography>
       <Breadcrumbs aria-label="breadcrumb">
         <Link
           color="inherit"
           onClick={() => {
             navigate("/mashprofile");
           }}
         >
           Mash Profile
         </Link>
         <Typography color="textPrimary">{name}</Typography>
       </Breadcrumbs>

       <Divider />
       <Paper className={classes.paper}>
         <Grid container spacing={3}>
           <Grid item xs={12} md={6}>
             <TextField size="medium" variant="standard" required id="name" label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
           </Grid>
           <Grid item xs={12} md={6}>
             <StepTypeSelct value={type} onChange={onSelectType} />
           </Grid>

           <PropsEdit config={propsConfig} data={props} onChange={onChangeProps} />
         </Grid>
         <div className={classes.buttons}>
           <Button
             variant="contained"
             color="secondary"
             onClick={() => {
               navigate("/mashprofile");
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

export default StepForm;
