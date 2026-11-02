import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
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
  const audio = new Audio(buzzer);

  const remove = useCallback((id) => {
    setAlerts((value) => {
      return value.filter((a) => a.id !== id);
    });
  }, []);

  const show = useCallback((id, title = "", message = "", type = "info", action = null, timeout = 5000) => {
    const alert = {
      id,
      title,
      message,
      type,
      action,
    };

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
    setAlerts((state) => state.concat(alert));
    return alert;
  }, []);

  const value = {
    alerts,
    show,
    remove,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}

      <Stack
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
      </Stack>
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
