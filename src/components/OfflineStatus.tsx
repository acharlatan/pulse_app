import { useInterfaceText } from "../i18n/useInterfaceText";
import { useEffect, useState } from "react";
import { useAppUpdate } from "../app/use-app-update";
import { WifiOff } from "lucide-react";
export function OfflineStatus() {
  const __pulseText = useInterfaceText();
  const [online, setOnline] = useState(navigator.onLine);
  const [later, setLater] = useState(false);
  const {
    available: update,
    ready,
    error,
    apply: applyUpdate,
  } = useAppUpdate();
  useEffect(() => {
    const apply = () => setOnline(navigator.onLine);
    window.addEventListener("online", apply);
    window.addEventListener("offline", apply);
    return () => {
      window.removeEventListener("online", apply);
      window.removeEventListener("offline", apply);
    };
  }, []);
  return (
    <>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />
          {ready
            ? __pulseText("Offline · your cached CRM and saved records are available.")
            : __pulseText("Offline · saved records remain on this device; some application files may need a connection.")}
        </div>
      )}
      {error && (
        <p className="offline-banner" role="status">
          {__pulseText(error)}
        </p>
      )}
      {update && (
        <div className="update-banner" role="status">
          <span>
            {later
              ? __pulseText("Update postponed. Your current session stays open.")
              : __pulseText("A fresh PULSE is ready.")}
          </span>
          <button
            className="button ghost"
            disabled={!online}
            onClick={applyUpdate}
          >
            {__pulseText("Update & reload")}</button>
          {!later && (
            <button className="button ghost" onClick={() => setLater(true)}>
              {__pulseText("Later")}</button>
          )}
        </div>
      )}
    </>
  );
}
