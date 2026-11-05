import { IconButton, Tooltip, Button, Grid, Typography, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Container, Breadcrumbs, Link } from "@mui/material";
import { styled } from '@mui/material/styles';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from '@mui/material/InputLabel';
import { uploadapi } from "../data/uploadapi"
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useCBPi } from "../data";


const PREFIX = 'Upload';

const classes = {
  root: `${PREFIX}-root`,
  paper: `${PREFIX}-paper`,
  control: `${PREFIX}-control`
};

const StyledContainer = styled(Container)((
  {
    theme
  }
) => ({
  [`& .${classes.root}`]: {
    flexGrow: 1,
  },

  [`& .${classes.paper}`]: {
    height: 140,
    width: 100,
  },

  [`& .${classes.control}`]: {
    padding: theme.spacing(2),
  }
}));


const SelectBox = ({ options, value, onChange }) => {
  let emptyoptions = []
  return options ? (
    <>
      <Select variant="standard" labelId="demo-simple-select-label" id="demo-simple-select" value={value} onChange={onChange}>
        {options.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </>
  ) :
   (
    <>
      <Select variant="standard" labelId="demo-simple-select-label" id="demo-simple-select" value={emptyoptions} onChange={onChange}>
        {emptyoptions.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </>
  );
};


const Upload = () => {

  const hiddenFileInput = React.useRef(null);
  const navigate = useNavigate();
  let { state } = useCBPi();
  const handleChange = event => {
    const fileUploaded = event.target.files[0];
    let formData = new FormData();
    formData.append("File", fileUploaded);
    //console.log("Start upload");
    uploadapi.sendFile(formData, ReloadPage());
  };

  const ReloadPage = () => {
    //console.log("Upload done -> reload page");
    /*window.location.reload();*/
  }


  // One import at a time from this page, and only of a chosen recipe. Create
  // clicked twice imported the recipe twice - 12 steps, every rest and the boil
  // doubled - and Create with nothing chosen failed on the server (DEFECTS
  // M39). The server runs one import at a time as well; this stops the second
  // click being sent at all.
  const [creating, setCreating] = useState(false);
  // Read and set synchronously, so a second click arriving before the page has
  // redrawn the button as disabled is turned away too.
  const sending = React.useRef(false);
  const chosen = (id) =>
    id !== undefined && id !== null && id !== "" && !(Array.isArray(id) && id.length === 0);
  const submit = (send, id) => {
    if (sending.current || !chosen(id)) {
      return;
    }
    sending.current = true;
    setCreating(true);
    const done = () => {
      sending.current = false;
      setCreating(false);
    };
    send(id, path, done, done);
  };

  const XMLSubmit = () => {
    submit(uploadapi.sendXML, xml);
  };
  
  const JSONSubmit = () => {
    submit(uploadapi.sendJSON, json);
  };

  const KBHSubmit = () => {
    submit(uploadapi.sendKBH, kbh);
  };

  const BFSubmit = () => {
    submit(uploadapi.sendBF, bf);
  };

  const reload = () => {
    uploadapi.getbfupdate();
  };

  const [kbhlist, setKBHList] = useState([]);
  const [xmllist, setXMLList] = useState([]);
  const [jsonlist, setJSONList] = useState([]);
  const [bflist, setBFList] = useState([]);
  const [bflistlength, setBFListlength] = useState(0);
  const [bflistselect, setBFListselect] = useState([]);
  const [xml, setXML] = useState([]);
  const [json, setJSON] = useState([]);
  const [kbh, setKBH] = useState([]);
  const [bf, setBF] = useState([]);
  const [path, setPath] = useState([]);
  const [offset, setOffset] = useState(0);
  const [length, setLength] = useState(50);
  const [offsetlist,setOffsetlist] = useState([{ 'value': 0, 'label': '0' }]);

  useEffect(() => {
    uploadapi.getpath((data) => {
      setPath(data);
    });
  }, []);

  // A file with one recipe in it has that recipe chosen, so Create is ready.
  useEffect(() => {
    uploadapi.getkbh((data) => {
      setKBHList(data);
      if (data && data.length === 1) setKBH(data[0].value);
    });
  }, []);

  useEffect(() => {
    uploadapi.getxml((data) => {
      setXMLList(data);
      if (data && data.length === 1) setXML(data[0].value);
    });
  }, []);

  useEffect(() => {
    uploadapi.getjson((data) => {
      setJSONList(data);
      if (data && data.length === 1) setJSON(data[0].value);
    });
  }, []);

//  useEffect(() => {
//    uploadapi.getbf(0, (data) => {
//      setBFList(data[0]);
//      setOffsetlist(data[1])
//      setLength(data[2])        
//    });
//  },[]);

  useEffect(() => {
      setBFList(state.bf_recipes[0]);
      setOffsetlist(state.bf_recipes[1]);
      setLength(state.bf_recipes[2]);
     },[state.bf_recipes]);


  useEffect(() => {
    if (bflist) {
    setBFListlength(bflist.length)
    setBFListselect(bflist.slice(offset,offset+length))}
  }, [bflist,offset,length]);

  const XMLChange = (event) => {
    setXML(event.target.value);
  };

  const JSONChange = (event) => {
    setJSON(event.target.value);
  };

  const KBHChange = (event) => {
    setKBH(event.target.value);
  };

  const BFChange = (event) => {
    setBF(event.target.value);
    };

  const OffsetChange = (event) => {
    setOffset(event.target.value);
    setBFListselect(bflist.slice(event.target.value,event.target.value+length))
  };

  return (
    <StyledContainer maxWidth="lg">
    <div>
      <Grid container direction="row" justifyContent="space-between" alignItems="center" style={{ marginTop: 10 }}>
        <Grid item>
          <Typography variant="h5" gutterBottom>
            Import recipe
          </Typography>
        </Grid>
        <Grid item></Grid>
      </Grid>
      {/* Opened from the Recipe Book, which keeps every import (DEFECTS M55). */}
      <Breadcrumbs aria-label="breadcrumb">
        <Link color="inherit" onClick={() => navigate("/mashprofile")}>
          Brew Steps
        </Link>
        <Link color="inherit" onClick={() => navigate("/recipes")}>
          Recipe Book
        </Link>
        <Typography color="textPrimary">Import recipe</Typography>
      </Breadcrumbs>
      <Divider style={{ marginBottom: 10, marginTop: 10 }} />

      <Grid component={Paper} container spacing={2} className={classes.root}>
        <Grid item spacing={2} xs={12}>
          <Paper style={{ padding: 10 }}>
            <p>You can upload recipes from BeerXML, MMuM-JSON, Brewfather or the Kleiner Brauhelfer V2 database. A recipe you import becomes your brew steps, and is kept in your Recipe Book.</p>
          </Paper>
        </Grid>
        <Grid item spacing={2} xs={12}>
          <Paper style={{ padding: 10 }}>
            <Button variant="contained" component="label">
              Upload BeerXML File, MMuM-JSON or KBH V2 database file
              <input ref={hiddenFileInput}
                type="file"
                onChange={handleChange}
                hidden
                accept=".xml,.sqlite,.json"
              />
            </Button>
          </Paper>
          <Divider style={{ marginBottom: 10, marginTop: 10 }} />
        </Grid>

        

        <Divider style={{ marginBottom: 10, marginTop: 10 }} />
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Select Recipe</TableCell>
                <TableCell>

                </TableCell>
                <TableCell>
                </TableCell>
                <TableCell align="right">Create</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>

              <TableRow>
                <TableCell>
                  <InputLabel id="demo-simple-select-helper-label">BeerXML Recipe from uploaded file</InputLabel>
                  <SelectBox options={xmllist} value={xml} onChange={XMLChange} />
                </TableCell>
                <TableCell>

                </TableCell>
                <TableCell>
                </TableCell>

                <TableCell align="right">
                  <Button variant="contained" component="label" disabled={creating || !chosen(xml)}>
                    Create Recipe from BeerXML recipe
                    <input
                      value={xml}
                      onClick={XMLSubmit}
                      hidden
                    />
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InputLabel id="demo-simple-select-helper-label">MMuM-JSON Recipe from uploaded file</InputLabel>
                  <SelectBox options={jsonlist} value={json} onChange={JSONChange} />
                </TableCell>
                <TableCell>
                </TableCell>

                <TableCell>

                </TableCell>
                <TableCell align="right">
                  <Button variant="contained" component="label" disabled={creating || !chosen(json)}>
                    Create Recipe from MMuM-JSON recipe
                    <input
                      value={json}
                      onClick={JSONSubmit}
                      hidden
                    />
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InputLabel id="demo-simple-select-helper-label">Recipe from Kleiner Brauhelfer Database</InputLabel>
                  <SelectBox options={kbhlist} value={kbh} onChange={KBHChange} />
                </TableCell>
                <TableCell>

                </TableCell>
                <TableCell>
                </TableCell>

                <TableCell align="right">
                  <Button variant="contained" component="label" disabled={creating || !chosen(kbh)}>
                    Create Recipe from KBH Database
                    <input
                      value={kbh}
                      onClick={KBHSubmit}
                      hidden
                    />
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <InputLabel id="demo-simple-select-helper-label">Brewfather Recipes ({length} Items max at a time. {bflistlength} Recipes total)</InputLabel>
                  <SelectBox options={bflistselect} value={bf} onChange={BFChange} />
                </TableCell>
                <TableCell>
                  <InputLabel id="demo-simple-select-helper-label">Recipe Offset (display {length} items after offset)</InputLabel>
                  <SelectBox options={offsetlist} value={offset} onChange={OffsetChange} />
                </TableCell>
                <TableCell align="right">
                <Tooltip  title="Refresh Brewfather recipes">
                <IconButton onClick={reload}>            
                <AutorenewIcon/>
                </IconButton>
                </Tooltip>
                
                </TableCell>
                
                <TableCell align="right">
                  <Button variant="contained" component="label" disabled={creating || !chosen(bf)}>
                    Create Recipe from Brewfather Web App
                    <input
                      value={bf}
                      onClick={BFSubmit}
                      hidden
                    />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>


      </Grid>


    </div>
    </StyledContainer>
  );
};

export default Upload;
