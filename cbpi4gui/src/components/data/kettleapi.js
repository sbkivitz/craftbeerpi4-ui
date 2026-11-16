import axios from "axios";

export const save = (id, data, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .put("/kettle/" + id, data)
    .then(function (response) {
      console.log(response);
      callback_susscess(response.data);
    })
    .catch(function (error) {
      console.log("ERROR", error)
      callback_failed();
    });
};

export const add = (data, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .post("/kettle/", data)
    .then(function (response) {
      console.log(response);
      callback_susscess(response.data);
    })
    .catch(function (error) {
      console.log("ERROR")
      callback_failed();
    });
};

export const remove = (id, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .delete("/kettle/"+ id)
    .then(function (response) {
      console.log(response);
      callback_susscess();
    })
    .catch(function (error) {
      callback_failed();
    });
};


export const start = (id, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .post("/kettle/"+ id + "/on")
    .then(function (response) {
      console.log(response);
      callback_susscess();
    })
    .catch(function (error) {
      callback_failed();
    });
};


export const stop = (id, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .post("/kettle/"+ id + "/off")
    .then(function (response) {
      callback_susscess();
    })
    .catch(function (error) {
      callback_failed();
    });
};

export const toggle = (id, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .post("/kettle/"+ id + "/toggle")
    .then(function (response) {
      callback_susscess();
    })
    .catch(function (error) {
      callback_failed();
    });
};


export const target_temp = (id, temp, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .post("/kettle/"+ id + "/target_temp", {temp})
    .then(function (response) {
      callback_susscess();
    })
    .catch(function (error) {
      callback_failed();
    });
};

export const action = (id, action, parameter = {}, callback_susscess = () => {}, callback_failed = () => {}) => {
  axios
    .post("/kettle/"+ id + "/action", { action, parameter })
    .then(function (response) {
      callback_susscess();
    })
    .catch(function (error) {
      callback_failed();
    });
};

// A kettle's settings as a file of its own. CraftBeerPi makes the file, works
// out what loading one would change (the preview), and loads it once the
// brewer has confirmed that preview, so the checks live in one place.

// What a failed request says, for the brewer: CraftBeerPi's own reason when it
// gave one.
export const fileError = (error, fallback) => {
  const data = error?.response?.data;
  if (data && typeof data === "object" && data.detail) {
    return data.detail;
  }
  if (!error?.response) {
    return "CraftBeerPi didn't answer. Check the connection and try again.";
  }
  return fallback;
};

// The name a download was given: Content-Disposition's filename* (any
// characters), else its filename, else the fallback.
export const attachmentName = (disposition, fallback) => {
  const text = disposition || "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(text);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch (e) {
      // fall through to the plain name
    }
  }
  const plain = /filename="([^"]*)"/i.exec(text);
  return plain && plain[1] ? plain[1] : fallback;
};

// The file's text is sent exactly as it was read: a file that isn't JSON at
// all must reach CraftBeerPi as it is, to be refused with the reason, rather
// than be quoted into a JSON string by axios on the way.
const asIs = { headers: { "Content-Type": "application/json" }, transformRequest: [(data) => data] };

// -> {name, text}: the file, and the name CraftBeerPi gave it.
export const settingsFile = async (id) => {
  const response = await axios.get("/kettle/" + id + "/file", { responseType: "text", transformResponse: [(data) => data] });
  return { name: attachmentName(response.headers["content-disposition"], "kettle settings.json"), text: response.data };
};

// -> the preview: what loading the file would change. id null: what it would
// make a new kettle. fill: each setting loading would leave empty filled in
// with the value its logic uses for it, shown as a change.
export const previewFile = async (id, text, fill = false) => {
  const url = (id ? "/kettle/" + id + "/file/preview" : "/kettle/file/preview") + (fill ? "?fill=1" : "");
  return (await axios.post(url, text, asIs)).data;
};

// -> {kettle, changes, plan}: loaded, as the preview with this token showed,
// made with the same fill.
export const loadFile = async (id, text, token, fill = false) => {
  return (await axios.post("/kettle/" + id + "/file?token=" + encodeURIComponent(token) + (fill ? "&fill=1" : ""), text, asIs)).data;
};

export const kettleapi = {
  add,
  remove,
  toggle,
  target_temp,
  action,
  save,
  start,
  stop,
  settingsFile,
  previewFile,
  loadFile,
}