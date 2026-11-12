import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import React from "react";
import buzzer from './buzzer.mp3';
import {configapi} from '../data/configapi'
import { notificationapi } from "../data/notificationapi";

// Notifications wait in a stack in the bottom right corner, and never cover
// the page.
//
// One with a button used to be a modal dialog: the whole interface stopped
// answering until it was answered. On 1 Nov, at the boil's "Is the wort in the
// boil kettle?", Scott could not reach the wort pump on the dashboard - the
// very thing the question was waiting for: "I need to be able to use the
// dashboard to operate the pump. Right now, my only option is this dialog
// box." A prompt is still held until its button is pressed, as before; it just
// no longer takes the rest of the screen hostage while it waits. The same
// went for "add malt" at dough-in and the whirlpool's "cool down", both of
// which wait for work done with the dashboard.
//
// Messages are shown as text. They were set as HTML, and they carry names
// from recipe files that come from anywhere - hop names among them.

// MUI knows four severities; the server sends its notification type.
const severity = (type) => {
  const t = String(type || "info").toLowerCase();
  return ["success", "info", "warning", "error"].includes(t) ? t : "info";
};

export const ActionAlert = ({ item }) => {
  const alert = useAlert();

  const call_action = (dialog_id, action) => {
    alert.remove(dialog_id);
    notificationapi.action(dialog_id, action, (data) => {
      console.log(data);
    });
  };

  return (
    <Alert
      variant="filled"
      severity={severity(item.type)}
      sx={{ pointerEvents: "auto", boxShadow: 6, whiteSpace: "pre-line" }}
      data-prompt="waiting"
    >
      <AlertTitle>{item.title}</AlertTitle>
      {item.message}
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
        {item.action.map((a) => (
          <Button
            key={a.id}
            size="small"
            variant="contained"
            color="inherit"
            sx={{ color: "text.primary", backgroundColor: "background.paper" }}
            onClick={() => call_action(item.id, a.id)}
          >
            {a.label}
          </Button>
        ))}
      </Stack>
    </Alert>
  );
};

export const AlertContext = createContext({});

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  // The ids on show, known at once - the state above is updated later.
  const shown = useRef(new Set());
  const reasons = useRef(new Map());
  // The prompts CraftBeerPi waits on, as far as this page knows: the list it
  // sends as the page connects, then those shown and taken down since. Null
  // until the list first comes. waitingN counts the lists, so the brew-day
  // screen knows when one has come: a line it kept on this device for a
  // question that isn't among them no longer waits.
  const waiting = useRef(null);
  const [waitingN, setWaitingN] = useState(0);
  // Hidden while the brew-day screen is open: its title bar shows the prompts
  // and errors, and the stack would cover its buttons. A count, so two
  // screens asking for it never undo each other.
  const [stackHidden, setStackHidden] = useState(0);
  const hideStack = useCallback((hide) => {
    setStackHidden((n) => Math.max(0, n + (hide ? 1 : -1)));
  }, []);
  const audio = new Audio(buzzer);

  const remove = useCallback((id, reason) => {
    shown.current.delete(id);
    if (waiting.current) waiting.current.delete(id);
    // Why the server took it down ("answered" or "withdrawn"), for a page that
    // did not answer it itself: the brew-day screen's event line says which.
    if (reason) {
      reasons.current.set(id, reason);
      if (reasons.current.size > 100) {
        reasons.current.delete(reasons.current.keys().next().value);
      }
    }
    setAlerts((value) => {
      return value.filter((a) => a.id !== id);
    });
  }, []);
  const retiredReason = useCallback((id) => reasons.current.get(id), []);
  const waitingNow = useCallback(() => waiting.current, []);

  // Drop every prompt - a notification with buttons - but those the server
  // still waits on. After a restart a page kept the prompts from before it,
  // whose buttons no longer did anything, beside the server's new ones.
  const keepWaiting = useCallback((ids) => {
    const still = new Set(Array.isArray(ids) ? ids : []);
    waiting.current = new Set(still);
    setWaitingN((n) => n + 1);
    setAlerts((value) => value.filter((a) => {
      const keep = !(a?.action?.length > 0) || still.has(a.id);
      if (!keep) {
        shown.current.delete(a.id);
      }
      return keep;
    }));
  }, []);

  const show = useCallback((id, title = "", message = "", type = "info", action = null, timeout = 5000) => {
    const alert = {
      id,
      title,
      message,
      type,
      action,
    };

    if (action?.length > 0 && waiting.current) waiting.current.add(id);
    // Shown once. A prompt the server keeps for every page is sent again each
    // time this page connects - after a reload, or a moment without wifi -
    // and must not pile up, or sound the buzzer again.
    if (shown.current.has(id)) {
      return alert;
    }
    shown.current.add(id);

    configapi.getone('PLAY_BUZZER', (data) => {
      if (data){
        if (data ==="Yes"){
          audio.play();
          }
         }
        });



    // Without a button there is nothing to wait for: gone after five seconds.
    // With one, it stays until the button is pressed.
    if (action?.length <= 0) {
      const timerId = setTimeout(() => {
        remove(id);
      }, timeout);
    }
    setAlerts((state) => (state.some((a) => a.id === id) ? state : state.concat(alert)));
    return alert;
  }, []);

  const value = {
    alerts,
    show,
    remove,
    retiredReason,
    keepWaiting,
    waitingNow,
    waitingN,
    hideStack,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}

      {stackHidden ? null : <Stack
        spacing={1}
        data-notifications="stack"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: "min(440px, calc(100vw - 32px))",
          maxHeight: "70vh",
          overflowY: "auto",
          zIndex: (theme) => theme.zIndex.snackbar,
          // The stack itself lets clicks through to the page; only the
          // notifications in it take them.
          pointerEvents: "none",
        }}
      >
        {alerts.map((a) => {
          if (a?.action?.length > 0) {
            return <ActionAlert key={a.id} item={a} />;
          }
          return (
            <Alert
              key={a.id}
              severity={severity(a.type)}
              sx={{ pointerEvents: "auto", boxShadow: 3, whiteSpace: "pre-line" }}
            >
              {a.title ? <AlertTitle>{a.title}</AlertTitle> : null}
              {a.message}
            </Alert>
          );
        })}
      </Stack>}
    </AlertContext.Provider>
  );
};

export const useAlert = (Context) => {
  const alertContext = useContext(AlertContext);
  const alert = useMemo(() => {
    return alertContext;
  }, [alertContext]);
  return alert;
};
