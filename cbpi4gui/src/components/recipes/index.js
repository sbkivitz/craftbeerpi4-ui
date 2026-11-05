import { Breadcrumbs, Button, Container, Divider, Paper,InputBase, IconButton, Link, List, ListItemButton, ListItemText, ListItemIcon, Tooltip } from "@mui/material";
import { styled } from '@mui/material/styles';
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { recipeapi } from "../data/recipeapi";
import { NewRecipeDialog } from "./NewRecipeDialog";
import SearchIcon from "@mui/icons-material/Search";
import { CBPiBeerIcon } from "../util/icons/CBPiSensorIcon";
const PREFIX = 'Recipes';

const classes = {
  root: `${PREFIX}-root`,
  paper: `${PREFIX}-paper`,
  input: `${PREFIX}-input`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.root}`]: {
    flexGrow: 1,
  },

  [`& .${classes.paper}`]: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },

  [`& .${classes.input}`]: {
    marginLeft: theme.spacing(1),
    flex: 1,
  }
}));



const Recipes = () => {
  const [totalList, setTotalList] = useState([]);
  const [list, setList] = useState([]);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("");


  useEffect(() => {
    recipeapi.get((data) => {
      setTotalList(data)
      setList(data);
    });
  }, []);

  useEffect(() => {
    console.log(filter)
    if(filter) {
      setList(totalList.filter(item=> item?.name.includes(filter) ))
    }
    else {
      setList(totalList)
    }
  }, [filter]);

  

  const openRecipe = (file) => {
    navigate("/recipe/" + file);
  };

  const createRecipe = () => {
    setOpen(true)

  }

  // Every import is kept here (DEFECTS M55), and says where it came from -
  // unless the recipe has a description of its own.
  const secondary = (item) =>
    item.desc || (item.imported_from ? "Imported from " + item.imported_from : "");


  return (
    (<Root>
      <Container maxWidth="lg">
        <Grid container direction="row" justifyContent="space-between" alignItems="center" style={{ marginTop: 10 }}>
          <Grid item>
            <Typography variant="h5" gutterBottom>
              Recipe Book
            </Typography>
          </Grid>
          <Grid item>
            <Paper component="form" className={classes.root}>
              <InputBase
                className={classes.input}
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                }}
                placeholder="Filter"
                inputProps={{ "aria-label": "filter settings" }}
              />
              <IconButton type="submit" className={classes.iconButton} aria-label="search">
                <SearchIcon />
              </IconButton>
            </Paper>
          </Grid>
          <Grid item>
          <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />}
            onClick={() => navigate("/upload")}>
            Import recipe
          </Button>
          <Tooltip title="Create new recipe">
            <IconButton variant="contained" onClick={createRecipe}>
              <AddIcon />
            </IconButton>
            </Tooltip>
            <NewRecipeDialog open={open} setOpen={setOpen}/>
          </Grid>
        </Grid>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            color="inherit"
            onClick={() => {
              navigate("/mashprofile");
            }}
          >
            Brew Steps
          </Link>
          <Typography color="textPrimary">Recipe Book</Typography>
        </Breadcrumbs>
        <Divider style={{ marginBottom: 10, marginTop: 10 }} />
        <List>
          {list.map((item) => (
            <Tooltip key={item.file} title="Click to select recipe">
            <ListItemButton onClick={() => openRecipe(item.file)}>
              <ListItemIcon>
                <CBPiBeerIcon/>
              </ListItemIcon>
              <ListItemText primary={item.name || "No Name"} secondary={secondary(item)} />
            </ListItemButton>
            </Tooltip>
          ))}
        </List>
        </Container>
    </Root>)
  );
};

export default Recipes;
