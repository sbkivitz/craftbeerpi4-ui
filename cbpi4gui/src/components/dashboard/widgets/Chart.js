import { ClickAwayListener, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Paper, Popper } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { logapi } from "../../data/logapi";
import { useDraggable, useModel } from "../DashboardContext";
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteIcon from "@mui/icons-material/Delete";

// A chart of sensor readings draws their rounding. SimVessel logs to 0.01; a
// OneWire probe on a Fahrenheit rig steps by about 0.11. Fitted to a flat
// stretch - a hold, a vessel at room temperature - the axis spans a handful of
// those steps and each one is drawn tens of pixels tall, and the spline that
// joins the points swings above and below each step: a staircase. So the
// axis spans at least MIN_STEPS of the data's own
// rounding step, centred on the data. Never more than a tenth of the readings'
// size, so a signal that only moves between two values - on and off, 0 and
// 100 - is not squashed flat; and nothing changes when the data already spans
// that much, or when its step cannot be told.
export const MIN_STEPS = 50;

// The smallest gap between two different readings: the sensor's rounding.
export const roundingStep = (values) => {
  const distinct = [...new Set((values || [])
    .filter((v) => typeof v === "number" && Number.isFinite(v))
    .map((v) => Math.round(v * 1e6) / 1e6))].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < distinct.length; i++) {
    step = Math.min(step, distinct[i] - distinct[i - 1]);
  }
  return Number.isFinite(step) ? step : null;
};

// [low, high] for the y-axis, or null to let the chart fit the data itself.
export const yAxisRange = (values, minSteps = MIN_STEPS) => {
  const finite = (values || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  const step = roundingStep(finite);
  if (!step || finite.length === 0) {
    return null;
  }
  const low = finite.reduce((a, b) => Math.min(a, b));
  const high = finite.reduce((a, b) => Math.max(a, b));
  const size = finite.reduce((a, b) => Math.max(a, Math.abs(b)), 0);
  const span = Math.min(minSteps * step, size / 10);
  if (!(high - low < span)) {
    return null;
  }
  const middle = (low + high) / 2;
  return [middle - span / 2, middle + span / 2];
};

const Chart = ({ id }) => {
  const [data, setData] = useState([]);
  const [yRange, setYRange] = useState(null);
  const model = useModel(id);
  const draggable = useDraggable();
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null);
  const [loading, setLoading] = useState(false)


  useEffect(() => {
    load_data()
    const interval = setInterval(() => {
      load_data()
    }, (model.props?.refresh || 10) * 1000);
    return () => clearInterval(interval);
  }, [model?.props?.sensor, model.props?.refresh, ]);

  const load_data = () => {

    const onSuccess = (data, id) => {
      setLoading(false)
      setYRange(yAxisRange(data[id]));
      setData([
        {
          x: data.time,
          y: data[id],
          type: "scatter",
		  mode: 'lines',
          line: {
            color: model?.props?.linecolor || "#00FF00",
            width: 2,
            // Straight between readings: a spline overshoots each rounding
            // step, drawing swings that were never measured.
			shape: 'linear'
          },
        },
      ]);
    };
    if (model?.props?.sensor) {
      setLoading(true)
      logapi.get(model?.props?.sensor, onSuccess);
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  const clear_data = () => {
    logapi.clear(model?.props?.sensor, ()=>setData([]))
  }

  if (draggable === true) {
    let css_style2 = {
      display: "flex",
      flexDirection: "column",
      fontSize: "20px",
      alignItems: "center",
      justifyContent: "center",
      width: `${model?.props?.width}px`,
      height: `${model?.props?.height}px`,
    };
    return (
      <div className="box" style={css_style2}>
        <div>Chart {model.name}</div>
        <div>{!model?.props?.sensor ? "Missing Config" : ""}</div>
      </div>
    );
  }

  if (!model?.props?.sensor) {
    return <div>Config Missing</div>;
  }

  return (
    <div className="box">
      {}
      <Plot
        data={data}
        config={{ displayModeBar: false }}
        layout={{
          title: {
            text: model.name,
            font: {
              family: "Advent Pro, sans-serif",
              size: 12,
              color: "#fff",
            },
          },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          width: model.props?.width || 200,
          height: model.props?.height || 200,

          margin: {
            l: 20,
            r: 20,
            b: 20,
            t: 30,
            pad: 0,
          },
          legend: {
            x: 1,
            xanchor: "right",
            y: 1,
            font: {
              family: "Advent Pro, sans-serif",
              size: 8,
              color: "#fff",
            },
          },
          xaxis: {
            showgrid: false,
            tickfont: {
              size: 8,
              color: "#fff",
            },
          },
          yaxis: {
            showgrid: true,
            ...(yRange ? { range: yRange, autorange: false } : { autorange: true }),
            tickfont: {
              size: 8,
              color: "#fff",
            },
          },
        }}
      />

      <IconButton  ref={anchorRef} onClick={()=>setOpen(true)} size="small" variant="contained" style={{ position: "absolute", top: 5, right: 10 }}>
        <MoreVertIcon />
      </IconButton>
      { loading ? <RotateLeftIcon fontSize="small" className="rotating-left" style={{ position: "absolute", bottom: 10, right: 10 }} />: ""}

      <Popper  open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>

      <ClickAwayListener onClickAway={handleClose}>
      <Paper>
      <List>
        <ListItemButton color="secondary" onClick={load_data} >
          <ListItemIcon onClick={load_data}>
            <AutorenewIcon />
          </ListItemIcon>
          <ListItemText primary="Refresh" />
        </ListItemButton>
        <ListItemButton color="secondary" onClick={clear_data} >
          <ListItemIcon onClick={clear_data}>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText primary="Clear" />
        </ListItemButton>
      </List>
      </Paper>
      </ClickAwayListener>
      </Popper>
      
    </div>
  );
};

export default Chart;
