import { kettleapi } from "../data/kettleapi";

// A kettle's settings file is a few kilobytes. CraftBeerPi refuses anything
// near this size, so a file this big isn't read at all.
export const MAX_FILE_BYTES = 1000000;

// Hand text to the browser as a download called `name`.
export const downloadText = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The browser has taken its copy by the time the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

// Save kettle `id`'s settings file to the browser's downloads. -> its name.
export const saveKettleFile = async (id) => {
  const { name, text } = await kettleapi.settingsFile(id);
  downloadText(name, text);
  return name;
};

// The text of a file the brewer chose, or an Error saying why it can't be read.
export const readChosenFile = async (file) => {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("It's too big to be a kettle settings file.");
  }
  return await file.text();
};

const sorted = (value) => {
  if (Array.isArray(value)) {
    return value.map(sorted);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((out, key) => ({ ...out, [key]: sorted(value[key]) }), {});
  }
  return value === undefined || value === null ? "" : value;
};

// What the kettle form edits, as text that two equal forms share: for telling
// whether the form still holds the kettle as it was saved.
export const formSnapshot = ({ name, type, heater, agitator, sensor, props }) =>
  JSON.stringify(sorted({ name, type, heater, agitator, sensor, props: props || {} }));
