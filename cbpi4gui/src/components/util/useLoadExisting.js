import { useEffect, useState } from "react";

// Fill an edit form from an existing record exactly once, as soon as the
// record is actually available - not merely when the form mounts.
//
// Every edit form used to load its record in a mount-only effect:
//
//   useEffect(() => { const item = list.find(...); if (item) {...} }, []);
//
// Inside the running app the list is already in state by the time a form
// mounts, so that worked and nobody noticed. Land on the page directly - a
// browser reload, a bookmark, a tablet waking from sleep - and the list has not
// arrived from the server yet: find() returns undefined, nothing is set, and the
// empty dependency array means the effect never runs again. The form sits blank.
//
// Blank is not cosmetic. Save posts what the form holds, and the server's
// update() replaces the record wholesale and writes it to disk, so Save on a
// blank form overwrites a configured kettle, sensor, actor, fermenter or mash
// step with an empty one. On a kettle that is the PID gains.
//
// Keyed on the id rather than a boolean, so moving from one record to another
// without unmounting loads the second. And applied once per id: lists such as
// sensors republish continuously, and re-applying on every update would
// overwrite whatever the brewer is typing.
//
// Returns `ready` - true for a new record (no id), and for an existing one only
// once it has been found and applied. Save must stay disabled until then, so a
// record that never arrives can never be saved as a blank one.
export const useLoadExisting = (id, item, apply) => {
  const [loadedId, setLoadedId] = useState(null);

  useEffect(() => {
    if (!id || !item || loadedId === id) {
      return;
    }
    apply(item);
    setLoadedId(id);
    // `apply` is a new closure on every render, so depending on it would re-run
    // this on every render. The loadedId guard is what makes omitting it safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, item, loadedId]);

  return !id || loadedId === id;
};

export default useLoadExisting;
