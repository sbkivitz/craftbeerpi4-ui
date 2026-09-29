import React, { useEffect, useRef, useState } from "react";
import { useCBPi } from "../data";

/**
 * Persistent warning shown while the UI is not connected to the server.
 *
 * The connection state already exists in CBPiContext, and losing the socket
 * already raises a notification - but that notification is transient. Miss it,
 * or arrive at the screen after it has gone, and the dashboard looks entirely
 * normal: every temperature is still displayed, in the same style, next to
 * controls for kilowatt heating elements. The values are simply frozen at
 * whatever they were when the connection dropped.
 *
 * Glancing at a frozen "67.0" during a mash reads exactly like a mash being
 * held. This states, permanently and for as long as it is true, that the
 * numbers on screen are not live.
 */
const ConnectionBanner = () => {
  const { connection } = useCBPi();
  const [offlineSince, setOfflineSince] = useState(null);
  const everConnected = useRef(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (connection) {
      everConnected.current = true;
      setOfflineSince(null);
    } else {
      setOfflineSince((since) => (since === null ? Date.now() : since));
    }
  }, [connection]);

  // Keep the elapsed time counting up while offline.
  useEffect(() => {
    if (connection) return undefined;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [connection]);

  if (connection) return null;

  // Before the first successful connection this is a startup state, not a loss.
  const startingUp = !everConnected.current;

  const elapsed = () => {
    if (!offlineSince) return "";
    const s = Math.floor((Date.now() - offlineSince) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        backgroundColor: startingUp ? "#8a6d00" : "#b00020",
        color: "#ffffff",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 0.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {startingUp
        ? "CONNECTING TO CONTROLLER..."
        : `CONTROLLER OFFLINE - READINGS ARE FROZEN (offline for ${elapsed()}) - DO NOT TRUST THE VALUES ON SCREEN`}
    </div>
  );
};

export default ConnectionBanner;
