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
// A prompt - a notification with a button - is held until its button is
// pressed, but beside the page, not over it: the work a prompt waits for is
// often done on the page itself. "Is the wort in the boil kettle?" waits for
// the wort pump on the dashboard, and "add malt" at dough-in and the
// whirlpool's "cool down" wait for work done with the dashboard. A modal
// dialog would stop the whole interface answering until the prompt was
// answered.
//
// Messages are shown as text, not HTML: they carry names from recipe files
// that come from anywhere - hop names among them.

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

  // Drop every prompt - a notification with buttons - but those the server
  // still waits on. After a restart a page would otherwise keep the prompts
  // from before it, whose buttons no longer do anything, beside the server's
  // new ones.
  const keepWaiting = useCallback((ids) => {
    const waiting = new Set(Array.isArray(ids) ? ids : []);
    setAlerts((value) => value.filter((a) => {
      const keep = !(a?.action?.length > 0) || waiting.has(a.id);
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
