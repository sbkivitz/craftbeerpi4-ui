import { Container, Divider, IconButton, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";

import { useNavigate } from "react-router-dom";
import Header from "../util/Header";
import FermenterTable from "./FermenterTable";

const PREFIX = "Fermenters";

const classes = {
  paper: `${PREFIX}-paper`,
};

const Root = styled("div")(({ theme }) => ({
  [`& .${classes.paper}`]: {
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
}));

// The fermenters, with their table and + as they were on the Hardware page: the Hardware page links here.
export default function Fermenters() {
  const navigate = useNavigate();

  return (
    <Root>
      <Container maxWidth="lg">
        <Grid container direction="row" justifyContent="space-between" alignItems="center" style={{ marginTop: 10 }}>
          <Grid item>
            <Typography variant="h5" gutterBottom>
              Fermenters
            </Typography>
          </Grid>
          <Grid item></Grid>
        </Grid>

        <Divider style={{ marginBottom: 10, marginTop: 10 }} />
        <Grid item sm={12} style={{ marginBottom: 20 }}>
          <Paper className={classes.paper}>
            <Header title="Fermenter">
              <IconButton
                variant="contained"
                onClick={() => {
                  navigate("/fermenter");
                }}
              >
                <AddIcon />
              </IconButton>
            </Header>
            <FermenterTable />
          </Paper>
        </Grid>
      </Container>
    </Root>
  );
}
