import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import React, { useRef, useState } from "react";

import { fileError, kettleapi } from "../data/kettleapi";
import KettleFileDialog from "./KettleFileDialog";
import { readChosenFile, saveKettleFile } from "./kettleFile";

// As CraftBeerPi words it when it refuses: shown as soon as the kettle's AUTO
// comes on with a preview open, without waiting to be refused.
export const autoRefusal = (name) =>
  `${name || "This kettle"}'s AUTO is running. Loading settings into a running controller isn't safe, so switch AUTO off first.`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * The kettle form's "Settings file" group: save this kettle's settings to a
 * file, or load a file back.
 *
 * A group of its own at the top of the form, away from the form's own Save and
 * Cancel. Both act on the kettle as CraftBeerPi has it saved, so while the form
 * holds unsaved changes neither is offered, and the group says why. Loading
 * shows what it would change first (KettleFileDialog), and changes nothing
 * until the brewer confirms; it isn't offered while the kettle's AUTO runs.
 * A new kettle, not saved yet, can be filled in from a file instead.
 *
 * id: the kettle's, or none for a new one. name: as saved. auto: its AUTO is
 * on. unsaved: the form holds changes. onLoaded(kettle): loaded, with the
 * kettle as CraftBeerPi now has it. onFill(after): a new kettle, to be filled
 * in from a file.
 */
const KettleFileActions = ({ id, name, auto, unsaved, ready, onLoaded, onFill }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState(null);
  const [applyError, setApplyError] = useState(null);
  const isNew = !id;

  const canSave = !isNew && ready && !unsaved && !busy;
  const canLoad = ready && !busy && (isNew || (!unsaved && !auto));
  let help = "Keep a copy of this kettle's logic, settings and links, or load one back. Loading shows the changes first.";
  if (isNew) {
    help = "Fill in this form from a kettle's settings file. Once the kettle is saved, it can be saved to a file too.";
  } else if (unsaved) {
    help = "Save or cancel the changes on this form first: the file holds the kettle as it was last saved.";
  } else if (auto) {
    help = `${name}'s AUTO is running. Switch AUTO off to load a file into it.`;
  }

  const save = async () => {
    setBusy("save");
    setStatus(null);
    try {
      const fileName = await saveKettleFile(id);
      setStatus({ severity: "success", text: `Saved ${fileName}.` });
    } catch (error) {
      setStatus({ severity: "error", text: `Couldn't save the file. ${fileError(error, "CraftBeerPi couldn't make it.")}` });
    } finally {
      setBusy(null);
    }
  };

  const choose = () => {
    setStatus(null);
    input.current?.click();
  };

  const chosen = async (event) => {
    const file = event.target.files && event.target.files[0];
    // Cleared, so choosing the same file again is noticed.
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy("read");
    try {
      let text;
      try {
        text = await readChosenFile(file);
      } catch (error) {
        setStatus({ severity: "error", text: `${file.name} can't be loaded. ${error.message}` });
        return;
      }
      const plan = await kettleapi.previewFile(id, text);
      setApplyError(null);
      setPending({ fileName: file.name, text, plan });
    } catch (error) {
      setStatus({ severity: "error", text: `${file.name} can't be loaded. ${fileError(error, "CraftBeerPi couldn't read it.")}` });
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => {
    setPending(null);
    setApplyError(null);
  };

  const confirm = async () => {
    if (!pending) {
      return;
    }
    if (isNew) {
      onFill(pending.plan.after);
      setStatus({ severity: "success", text: `Filled in from ${pending.fileName}. Check the form, then press Save to add the kettle.` });
      setPending(null);
      return;
    }
    setBusy("load");
    setApplyError(null);
    try {
      const out = await kettleapi.loadFile(id, pending.text, pending.plan.token);
      onLoaded(out.kettle);
      setStatus({
        severity: "success",
        text: out.changes
          ? `Loaded ${pending.fileName} into ${name}: ${plural(out.changes, "change", "changes")}.`
          : `${name} already had everything in ${pending.fileName}.`,
      });
      setPending(null);
    } catch (error) {
      setApplyError({
        text: `Nothing was loaded. ${fileError(error, "CraftBeerPi couldn't load it.")}`,
        stale: error?.response?.data?.reason === "changed",
      });
    } finally {
      setBusy(null);
    }
  };

  // After "changed since": the same file previewed against the kettle as it is now.
  const lookAgain = async () => {
    if (!pending) {
      return;
    }
    setBusy("read");
    try {
      const plan = await kettleapi.previewFile(id, pending.text);
      setApplyError(null);
      setPending({ ...pending, plan });
    } catch (error) {
      setApplyError({ text: fileError(error, "CraftBeerPi couldn't read the file again."), stale: false });
    } finally {
      setBusy(null);
    }
  };

  // From the kettle's AUTO as every page is told it, so a preview left open
  // follows AUTO going on, and off again. CraftBeerPi refuses either way.
  const blocked = pending && !isNew && auto ? pending.plan.blocked || autoRefusal(name) : null;

  return (
    <Box
      component="fieldset"
      aria-describedby="kettle-file-help"
      data-kettle-file="group"
      sx={{ border: 1, borderColor: "divider", borderRadius: 1, m: 0, px: 2, pt: 0.5, pb: 1.5, minWidth: 0, flex: "1 1 560px", maxWidth: 560 }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ px: 0.75 }}>
        Settings file
      </Typography>
      <Typography id="kettle-file-help" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {help}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button id="kettle-file-save" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={save} disabled={!canSave}>
          {busy === "save" ? "Saving…" : "Save to file…"}
        </Button>
        <Button id="kettle-file-load" variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={choose} disabled={!canLoad}>
          {busy === "read" && !pending ? "Reading…" : "Load from file…"}
        </Button>
        <input ref={input} type="file" accept=".json,application/json" hidden onChange={chosen} data-kettle-file="input" />
      </Box>
      {status ? (
        <Alert
          severity={status.severity}
          variant="outlined"
          role={status.severity === "error" ? "alert" : "status"}
          onClose={() => setStatus(null)}
          sx={{ mt: 1, py: 0 }}
          data-kettle-file="status"
        >
          {status.text}
        </Alert>
      ) : null}
      <KettleFileDialog
        pending={pending}
        kettleName={name}
        isNew={isNew}
        blocked={blocked}
        busy={busy}
        error={applyError}
        onCancel={cancel}
        onConfirm={confirm}
        onLookAgain={lookAgain}
      />
    </Box>
  );
};

export default KettleFileActions;
