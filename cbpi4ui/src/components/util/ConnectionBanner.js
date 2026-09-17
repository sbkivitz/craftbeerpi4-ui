import React, { useContext, useEffect, useState } from "react";
import { CBPiContext } from "../data";
import { WS_LIVE, WS_CONNECTING } from "../data/websocket";

/**
 * Persistent banner shown whenever the UI is not receiving live data.
 *
 * Every temperature on this dashboard sits next to a kilowatt heating element.
 * When the connection to the server drops, those readings freeze at their last
 * value and continue to look completely normal - so an operator can glance over
 * mid-mash, see "67.0", and believe the mash is being held when in fact nothing
 * has been controlling it for several minutes. Telling them is not a nicety.
 */
const ConnectionBanner = () => {
  const { state } = useContext(CBPiContext);
  const connection = state?.connection;
  const lastMessageAt = state?.lastMessageAt;
  const [, forceTick] = useState(0);

  // Re-render once a second so the "frozen for N" age keeps counting up.
  useEffect(() => {
    if (connection === WS_LIVE) {
      return undefined;
    }
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [connection]);

  if (connection === WS_LIVE || connection === undefined) {
    return null;
  }

  const connecting = connection === WS_CONNECTING && !lastMessageAt;
  const ageSeconds = lastMessageAt ? Math.floor((Date.now() - lastMessageAt) / 1000) : null;

  const age = () => {
    if (ageSeconds === null) return "";
    if (ageSeconds < 60) return `${ageSeconds}s`;
    const m = Math.floor(ageSeconds / 60);
    const s = ageSeconds % 60;
    return `${m}m ${s}s`;
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
        // Amber while we are still trying the first connect, red once we know
        // we had data and then lost it.
        backgroundColor: connecting ? "#8a6d00" : "#b00020",
        color: "#ffffff",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 0.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {connecting ? (
        <span>CONNECTING TO CONTROLLER…</span>
      ) : (
        <span>
          ⚠ CONTROLLER OFFLINE — READINGS ARE FROZEN
          {ageSeconds !== null ? ` (last update ${age()} ago)` : ""} — DO NOT TRUST THE VALUES ON SCREEN
        </span>
      )}
    </div>
  );
};

export default ConnectionBanner;
