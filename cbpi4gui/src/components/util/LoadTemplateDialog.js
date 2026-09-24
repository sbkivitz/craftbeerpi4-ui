import { Button, Tooltip } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Alert from "@mui/material/Alert";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import React from "react";
import { dashboardapi } from "../data/dashboardapi";

/**
 * Pick a starter layout for the current dashboard.
 *
 * Applying one OVERWRITES the dashboard on the server and cannot be undone, so
 * this deliberately takes two deliberate actions: choose a layout, then confirm
 * against a warning that names the dashboard being replaced. The list is
 * fetched when the dialog opens rather than on mount, so a rig with no
 * templates costs nothing.
 */
const LoadTemplateDialog = ({ dashboardid, callback, tooltip = "Load Layout" }) => {
  const [open, setOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const handleClickOpen = () => {
    setError(null);
    setSelected(null);
    setOpen(true);
    dashboardapi.gettemplates(
      (data) => {
        // The endpoint returns a list. Tolerate a bare object too, so a
        // single-template install cannot render an empty dialog.
        if (Array.isArray(data)) {
          setTemplates(data);
        } else if (data && typeof data === "object") {
          setTemplates([data]);
        } else {
          setTemplates([]);
        }
      },
      () => setError("Could not read the list of layouts from the server.")
    );
  };

  const close = () => {
    if (!busy) {
      setOpen(false);
    }
  };

  const apply = () => {
    if (!selected) {
      return;
    }
    setBusy(true);
    setError(null);
    callback(
      selected.name,
      () => {
        setBusy(false);
        setOpen(false);
      },
      () => {
        setBusy(false);
        setError(
          "The layout could not be applied. The dashboard has not been changed."
        );
      }
    );
  };

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton aria-label="load layout" onClick={handleClickOpen}>
          <DashboardCustomizeIcon />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>Load a starter layout</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This replaces everything on dashboard {dashboardid}. It cannot be
            undone.
          </Alert>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          {templates.length === 0 && !error ? (
            <DialogContentText>No layouts are available.</DialogContentText>
          ) : (
            <List dense>
              {templates.map((t) => (
                <ListItemButton
                  key={t.name}
                  selected={selected?.name === t.name}
                  onClick={() => setSelected(t)}
                >
                  <ListItemText
                    primary={t.title || t.label || t.name}
                    secondary={t.description || null}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} color="secondary" variant="contained" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={apply}
            color="primary"
            variant="contained"
            disabled={!selected || busy}
          >
            {busy ? "Applying..." : "Replace dashboard"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LoadTemplateDialog;
