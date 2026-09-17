/**
 * WebSocket client with explicit connection state.
 *
 * The UI shows live temperatures next to kilowatt heating elements. If this
 * socket drops, every reading on screen freezes at its last value and keeps
 * looking completely normal - so an operator can believe a mash is being held
 * when nothing is controlling it any more. The socket therefore reports its
 * state so the UI can say so out loud.
 */
const RECONNECT_DELAY_MS = 5000;

export const WS_CONNECTING = "connecting";
export const WS_LIVE = "live";
export const WS_OFFLINE = "offline";

class CBPiWebSocket {
  constructor(onMessageCallback, alert, onStatusChange) {
    this.ws = undefined;
    this.connect_count = 0;
    this.alert = alert;
    this.onMessageCallback = onMessageCallback;
    this.onStatusChange = onStatusChange || (() => {});
    this.closed_by_client = false;
  }

  connection_lost(e) {
    if (this.closed_by_client) {
      return;
    }
    this.connect_count += 1;
    this.onStatusChange(WS_OFFLINE);
    setTimeout(() => {
      this.open();
    }, RECONNECT_DELAY_MS);
  }

  open() {
    if (this.closed_by_client) {
      return;
    }
    this.onStatusChange(this.connect_count === 0 ? WS_CONNECTING : WS_OFFLINE);

    if (process.env.NODE_ENV === "development") {
      console.log("DEV MODE ON", "WebSocket URL", process.env.REACT_APP_WEBSOCKET_URL);
      this.ws = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL, []);
    } else {
      this.ws = new WebSocket("ws://" + document.location.host + "/ws", []);
    }

    this.ws.onclose = this.connection_lost.bind(this);
    // Without this, a failed connect attempt reported nothing at all.
    this.ws.onerror = this.connection_lost.bind(this);
    this.ws.onmessage = this.on_message.bind(this);
    this.ws.onopen = this.on_open.bind(this);
  }

  on_open() {
    this.connect_count = 0;
    this.onStatusChange(WS_LIVE);
  }

  on_message(e) {
    // Any traffic proves the link is alive.
    this.onStatusChange(WS_LIVE);
    let data = JSON.parse(e.data);
    this.onMessageCallback(data, this.alert);
  }

  connect() {
    this.closed_by_client = false;
    this.open();
  }

  close() {
    this.closed_by_client = true;
    try {
      if (this.ws) {
        this.ws.close();
      }
    } catch (e) {
      // closing a socket that is already gone is not interesting
    }
  }
}

export default CBPiWebSocket;