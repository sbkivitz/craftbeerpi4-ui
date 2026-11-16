import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import React, { useEffect, useState } from "react";

// A setting's name with somewhere to break the line after each underscore, so
// Sensor_Stale_Seconds wraps in a phone's narrow column instead of spilling
// out of it.
export const Breakable = ({ text }) => {
  const parts = String(text ?? "").split("_");
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <>
              _<wbr />
            </>
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
};

// What one side of a line in the preview shows: {text, quiet}, quiet for nothing set.
export const shown = (row, side) => {
  const value = row[side];
  if (row.kind === "logic") {
    return value ? { text: value } : { text: "none", quiet: true };
  }
  if (row.kind === "link") {
    if (!value || !value.id) {
      return { text: "none", quiet: true };
    }
    return value.name ? { text: value.name } : { text: `an unknown one (${value.id})`, quiet: true };
  }
  if (value === null || value === undefined || value === "") {
    return { text: "blank", quiet: true };
  }
  return { text: `${value}${row.unit ? ` ${row.unit}` : ""}` };
};

// The kettle form's order: the logic, the heater, agitator and sensor, then the logic's settings.
const LINK_ORDER = ["heater", "agitator", "sensor"];

export const previewRows = (plan) => [
  { key: "logic", name: "Logic", kind: "logic", ...plan.logic },
  ...LINK_ORDER.map((key) => (plan.links || []).find((r) => r.key === key))
    .filter(Boolean)
    .map((r) => ({ ...r, kind: "link" })),
  ...(plan.settings || []).map((r) => ({ ...r, key: r.label, kind: r.link ? "link" : "setting" })),
];

const when = (saved) => {
  const date = new Date(saved);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const fileLine = (fileName, file = {}) => {
  let line = `From ${fileName}`;
  if (file.kettle) {
    line += `, saved from the kettle ${file.kettle}`;
  }
  if (file.craftbeerpi) {
    line += ` by CraftBeerPi ${file.craftbeerpi}`;
  }
  const at = file.saved ? when(file.saved) : null;
  if (at) {
    line += ` on ${at}`;
  }
  return `${line}.`;
};

const quiet = (value) => (value.quiet ? { color: "text.secondary", fontStyle: "italic" } : {});

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * What loading a kettle settings file would change, from CraftBeerPi's
 * preview, and the brewer's go-ahead.
 *
 * The lines that change come first and alone: the logic, the links, then each
 * setting, now and after loading. Those that stay the same are one press
 * away. What the file holds but won't be loaded, and why, follows; then what
 * the file leaves as it is. Nothing is loaded until the brewer presses the
 * button that says what it does, and there is no default answer: Cancel has
 * the focus.
 */
const KettleFileDialog = ({ pending, kettleName, isNew, blocked, busy, error, onCancel, onConfirm, onLookAgain }) => {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [all, setAll] = useState(false);
  const plan = pending?.plan;
  useEffect(() => setAll(false), [plan]);
  if (!pending || !plan) {
    return null;
  }

  const rows = previewRows(plan);
  const changed = rows.filter((r) => r.changes);
  const same = rows.length - changed.length;
  const visible = all ? rows : changed;
  const nothing = !isNew && !plan.changes;
  const canConfirm = !busy && !blocked && !nothing;
  const problems = plan.problems || [];
  const left = plan.left_as_is || [];

  let heading = plural(plan.changes || 0, "change", "changes");
  if (isNew) {
    heading = "What the form will hold";
  } else if (nothing) {
    heading = `Nothing would change: ${kettleName} already has everything in this file.`;
  }

  return (
    <Dialog
      open
      onClose={busy ? undefined : onCancel}
      fullWidth
      maxWidth="md"
      fullScreen={phone}
      aria-labelledby="kettle-file-title"
      aria-describedby="kettle-file-from"
      data-kettle-file="preview"
    >
      <DialogTitle id="kettle-file-title">{isNew ? "Fill in this kettle from a file?" : `Load settings into ${kettleName}?`}</DialogTitle>
      <DialogContent dividers>
        <Typography id="kettle-file-from" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {fileLine(pending.fileName, plan.file)}
        </Typography>
        {blocked ? (
          <Alert severity="error" sx={{ mb: 2 }} data-kettle-file="blocked">
            {blocked}
          </Alert>
        ) : null}
        {error ? (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            data-kettle-file="error"
            action={
              error.stale ? (
                <Button color="inherit" size="small" onClick={onLookAgain} disabled={Boolean(busy)}>
                  Look again
                </Button>
              ) : null
            }
          >
            {error.text}
          </Alert>
        ) : null}
        {plan.other_kettle ? (
          <Alert severity="warning" sx={{ mb: 2 }} data-kettle-file="other-kettle">
            This file was saved from {plan.file.kettle}, not {kettleName}. Check it's the file you meant.
          </Alert>
        ) : null}

        <Typography variant="subtitle1" component="h3" data-kettle-file="heading">
          {heading}
        </Typography>
        {visible.length ? (
          <Table size="small" aria-label={isNew ? "What the form will hold" : "What would change"} sx={{ tableLayout: "fixed", mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: isNew ? "45%" : "34%" }}>Setting</TableCell>
                {isNew ? null : <TableCell sx={{ width: "33%" }}>Now</TableCell>}
                <TableCell>{isNew ? "From the file" : "After loading"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row) => {
                const now = shown(row, "now");
                const after = shown(row, "after");
                return (
                  <TableRow key={row.key} data-row={row.key} data-changes={row.changes ? "yes" : "no"}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: row.changes ? 600 : 400, overflowWrap: "anywhere" }}>
                      <Breakable text={row.name} />
                    </TableCell>
                    {isNew ? null : (
                      <TableCell sx={{ ...quiet(now), overflowWrap: "anywhere" }} data-side="now">
                        {now.text}
                      </TableCell>
                    )}
                    <TableCell sx={{ overflowWrap: "anywhere" }} data-side="after">
                      {row.changes || isNew ? (
                        <Box component="span" sx={{ fontWeight: 600, ...quiet(after) }}>
                          {after.text}
                        </Box>
                      ) : (
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          same
                        </Box>
                      )}
                      {row.note ? (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {row.note}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
        {!isNew && same > 0 ? (
          <Button size="small" sx={{ mt: 1 }} onClick={() => setAll(!all)} aria-expanded={all} data-kettle-file="show-all">
            {all ? `Hide the ${same} that stay the same` : `Show the ${same} that stay the same`}
          </Button>
        ) : null}

        {problems.length ? (
          <Alert severity="warning" sx={{ mt: 2 }} data-kettle-file="problems">
            <AlertTitle>Not loaded</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {problems.map((p, i) => (
                <li key={i}>{p.text}</li>
              ))}
            </Box>
          </Alert>
        ) : null}
        {left.length ? (
          <Box sx={{ mt: 2 }} data-kettle-file="left">
            <Typography variant="subtitle2" component="h3">
              Not in the file
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary" }}>
              {left.map((x, i) => (
                <li key={i}>
                  <Typography variant="body2">{x.text}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary" variant="contained" autoFocus disabled={busy === "load"}>
          {nothing ? "Close" : "Cancel"}
        </Button>
        {nothing ? null : (
          <Button id="kettle-file-confirm" onClick={onConfirm} color="primary" variant="contained" disabled={!canConfirm}>
            {busy === "load" ? "Loading…" : isNew ? "Fill in the form" : `Load into ${kettleName}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default KettleFileDialog;
