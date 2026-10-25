import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../data/db";
import { initialize } from "../data/seed";
import { defaults, type Workspace } from "../data/models";
import { updateSettings } from "../data/repository";
import type { PulseDB } from "../data/db";
function useWorkspaceData(db: PulseDB) {
  return useLiveQuery(
    async () =>
      db.transaction("r", db.tables, async () => ({
        organizations: await db.organizations.toArray(),
        contacts: await db.contacts.toArray(),
        interactions: await db.interactions
          .orderBy("occurredAt")
          .reverse()
          .toArray(),
        tasks: await db.tasks.orderBy("dueAt").toArray(),
        opportunities: await db.opportunities.toArray(),
        events: await db.events.orderBy("createdAt").reverse().toArray(),
        settings: (await db.settings.get("settings")) || defaults,
        permissions: await db.permissions.toArray(),
        restrictions: await db.restrictions.toArray(),
      })),
    [db],
  );
}
type Data = NonNullable<ReturnType<typeof useWorkspaceData>>;
interface ContextValue extends Data {
  db: PulseDB;
  workspace: Workspace;
  switchWorkspace: (w: Workspace) => void;
  notify: (s: string) => void;
  run: (action: () => Promise<unknown>, message?: string) => Promise<boolean>;
  setSettings: (patch: Partial<Data["settings"]>) => Promise<void>;
}
const Context = createContext<ContextValue | null>(null);
export function usePulse() {
  const c = useContext(Context);
  if (!c) throw new Error("Workspace unavailable");
  return c;
}
export function WorkspaceProvider({
  workspace,
  onSwitch,
  children,
}: {
  workspace: Workspace;
  onSwitch: (w: Workspace) => void;
  children: ReactNode;
}) {
  const db = database(workspace);
  const data = useWorkspaceData(db);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((v) => v + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const [toast, setToast] = useState("");
  useEffect(() => {
    setReady(false);
    initialize(db)
      .then(() => setReady(true))
      .catch(() =>
        setError(
          "PULSE could not open device storage. Check browser storage permissions and try again.",
        ),
      );
  }, [db]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const s = data?.settings;
    if (!s) return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        s.theme === "system" ? (query.matches ? "dark" : "light") : s.theme;
      document.documentElement.dataset.motion = s.reducedMotion
        ? "reduced"
        : "normal";
      localStorage.setItem("pulse-theme", s.theme);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [data?.settings]);
  async function run(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      if (message) setToast(message);
      return true;
    } catch (e) {
      setToast(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      return false;
    }
  }
  if (error)
    return (
      <div className="startup">
        <h1>Storage needs your attention</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    );
  if (!ready || !data)
    return (
      <div className="startup" role="status">
        <div className="brand-mark">p</div>
        <p>Finding your rhythm…</p>
      </div>
    );
  return (
    <Context.Provider
      value={{
        ...data,
        db,
        workspace,
        switchWorkspace: onSwitch,
        notify: setToast,
        run,
        setSettings: async (patch) => {
          await updateSettings(db, patch);
        },
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
