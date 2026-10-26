import { useEffect, useRef, useState } from "react";
import {
  confirmRefresh,
  discardForUpdate,
  getEditVersion,
} from "./update-safety";
// Native registration avoids the helper's unconditional reload when another tab adopts an update.
export function useAppUpdate() {
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const [available, setAvailable] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const approved = useRef<number | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let hadController = !!navigator.serviceWorker.controller;
    let disposed = false,
      observed: ServiceWorker | null = null;
    const installed = () => {
      if (observed?.state === "installed") {
        if (navigator.serviceWorker.controller) setAvailable(true);
        else setReady(true);
      }
    };
    const found = () => {
      observed = registration.current?.installing || null;
      observed?.addEventListener("statechange", installed);
    };
    const controlled = () => {
      setReady(true);
      if (approved.current !== null && approved.current === getEditVersion()) {
        discardForUpdate();
        location.reload();
      } else if (hadController) {
        setAvailable(true);
        approved.current = null;
      }
      hadController = true;
    };
    const check = () => {
      if (navigator.onLine && document.visibilityState === "visible")
        void registration.current?.update().catch(() => {});
    };
    navigator.serviceWorker.addEventListener("controllerchange", controlled);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 15 * 60 * 1000);
    void navigator.serviceWorker
      .register(new URL(`${import.meta.env.BASE_URL}sw.js`, location.href), {
        scope: new URL(import.meta.env.BASE_URL, location.href).pathname,
      })
      .then((r) => {
        if (disposed) return;
        registration.current = r;
        setReady(!!r.active);
        setAvailable(!!r.waiting);
        r.addEventListener("updatefound", found);
        found();
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Offline caching is unavailable in this browser. Saved records remain local; keep a backup.",
          );
      });
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controlled,
      );
      registration.current?.removeEventListener("updatefound", found);
      observed?.removeEventListener("statechange", installed);
    };
  }, []);
  function apply() {
    if (!navigator.onLine || !confirmRefresh()) return;
    const waiting = registration.current?.waiting;
    if (waiting) {
      approved.current = getEditVersion();
      waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      discardForUpdate();
      location.reload();
    }
  }
  return { available, ready, error, apply };
}
