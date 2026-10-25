import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { WifiOff } from "lucide-react";
export function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const {
    needRefresh: [update],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const apply = () => setOnline(navigator.onLine);
    addEventListener("online", apply);
    addEventListener("offline", apply);
    return () => {
      removeEventListener("online", apply);
      removeEventListener("offline", apply);
    };
  }, []);
  return (
    <>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={14} />
          You're offline. Your saved CRM is still here.
        </div>
      )}
      {update && (
        <div className="update-banner" role="status">
          A fresh PULSE is ready.
          <button onClick={() => updateServiceWorker(true)}>
            Update & reload
          </button>
        </div>
      )}
    </>
  );
}
