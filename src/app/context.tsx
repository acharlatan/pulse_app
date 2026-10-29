import { languageChoice } from "../i18n/catalog";
import { InterfaceLocaleProvider, translateInterface } from "../i18n/useInterfaceText";
import { clearGoogleSession } from "../services/google-session";
import { clearGoogleImport } from "../services/google-api";
import { confirmLeave, markSaved } from "./update-safety";
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { database } from "../data/db";
import { initialize } from "../data/seed";
import { defaults, settingsSchema, type Workspace } from "../data/models";
import { updateSettings } from "../data/repository";
import { analyzeRelationships } from "../services/recommendations";
import { ensureProgress, ensureDailyQuests } from "../data/progress-repository";
import { calendarDay } from "../services/progress";
import { deriveProgress } from "../services/progress";
import type { PulseDB } from "../data/db";
function useWorkspaceData(db: PulseDB) {
  return useLiveQuery(
    async () =>
      db.transaction("r", db.tables, async () => ({
        pipelines: (await db.pipelines.toArray()).sort(
          (a, b) => a.position - b.position,
        ),
        pipelineStages: (await db.pipelineStages.toArray()).sort(
          (a, b) => a.position - b.position,
        ),
        fieldDefinitions: (await db.fieldDefinitions.toArray()).sort(
          (a, b) => a.position - b.position,
        ),
        fieldValues: await db.fieldValues.toArray(),
        focusItems: await db.focusItems.toArray(),
        rewards: await db.rewards.toArray(),
        rewardChanges: (await db.rewardChanges.toArray()).sort(
          (a, b) =>
            b.at.localeCompare(a.at) ||
            b.sequence - a.sequence ||
            a.id.localeCompare(b.id),
        ),
        progressState: (await db.progressState.get("progress")) || null,
        dailyQuests: await db.dailyQuests.toArray(),
        organizations: await db.organizations.toArray(),
        contacts: await db.contacts.toArray(),
        interactions: await db.interactions
          .orderBy("occurredAt")
          .reverse()
          .toArray(),
        tasks: await db.tasks.orderBy("dueAt").toArray(),
        opportunities: await db.opportunities.toArray(),
        events: await db.events.orderBy("createdAt").reverse().toArray(),
        settings: settingsSchema.parse(
          (await db.settings.get("settings")) || defaults,
        ),
        smartLists: await db.smartLists.toArray(),
        recommendationActions: await db.recommendationActions.toArray(),
        importBatches: await db.importBatches
          .orderBy("createdAt")
          .reverse()
          .toArray(),
        permissions: await db.permissions.toArray(),
        restrictions: await db.restrictions.toArray(),
      })),
    [db],
  );
}
type Data = NonNullable<ReturnType<typeof useWorkspaceData>>;
interface ContextValue extends Data {
  progress: ReturnType<typeof deriveProgress>;
  intelligence: ReturnType<typeof analyzeRelationships>;
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
  useEffect(
    () => () => {
      clearGoogleSession();
      clearGoogleImport();
    },
    [workspace],
  );
  const data = useWorkspaceData(db);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [clock, tick] = useState(0);
  useEffect(() => {
    const refresh = () => tick((v) => v + 1);
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const [toast, setToast] = useState("");
  useEffect(() => {
    setReady(false);
    initialize(db)
      .then(() => ensureProgress(db))
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
      document.documentElement.lang = languageChoice(s.locale);
      document.documentElement.dataset.theme =
        s.theme === "system" ? (query.matches ? "dark" : "light") : s.theme;
      document.documentElement.dataset.accent = s.identity.accent;
      document.documentElement.dataset.motion = s.reducedMotion
        ? "reduced"
        : "normal";
      try {
        localStorage.setItem("pulse-theme", s.theme);
      } catch {
        /* Optional startup hint only. */
      }
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [data?.settings]);
  async function run(action: () => Promise<unknown>, message?: string) {
    try {
      const result = await action();
      const earned =
        result &&
        typeof result === "object" &&
        "earnedXP" in result &&
        typeof result.earnedXP === "number"
          ? result.earnedXP
          : 0;
      if (message)
        setToast(
          message +
            (earned && data?.settings.gamification ? ` · +${earned} XP` : ""),
        );
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
  const intelligence = useMemo(
    () =>
      data
        ? analyzeRelationships(data)
        : { relationships: [], opportunities: [], all: [], queue: [] },
    [data, clock],
  );
  const progress = useMemo(
    () =>
      deriveProgress(
        data?.rewards || [],
        data?.dailyQuests || [],
        data?.progressState || null,
        data?.settings.progress.weeklyGoal || 0,
      ),
    [data, clock],
  );
  useEffect(() => {
    if (ready && data)
      ensureDailyQuests(db).catch(() =>
        setToast(
          "Daily quests could not be saved. Your CRM records are unchanged.",
        ),
      );
  }, [ready, db, data, clock]);
  useEffect(() => {
    if (
      !ready ||
      !data?.settings.focus.reminders ||
      document.visibilityState === "hidden"
    )
      return;
    const day = calendarDay(Date.now(), data.settings.timezone);
    const pending = data.focusItems.filter(
      (f) =>
        f.today === day &&
        f.entityType === "task" &&
        data.tasks.some((t) => t.id === f.recordId && !t.completedAt),
    ).length;
    try {
      const key = `pulse-focus-reminder:${workspace}:${day}`;
      if (pending && !sessionStorage.getItem(key)) {
        setToast(
          `${pending} selected focus tasks remain today. Open My Focus to review.`,
        );
        sessionStorage.setItem(key, "1");
      }
    } catch {
      /* Optional reminder hint only. */
    }
  }, [ready, data, clock, workspace]);
  useEffect(() => {
    if (!ready) return;
    let active = true,
      running = false;
    const check = async () => {
      if (!active || running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const { evaluateScheduledAutomations } =
          await import("../data/automation-repository");
        if (!active) return;
        const count = await evaluateScheduledAutomations(db);
        if (active && count)
          setToast(
            `${count} local automation checks recorded. Open Automations for details.`,
          );
      } catch {
        if (active)
          setToast(
            "Local automation check could not finish. Your records were not partially changed.",
          );
      } finally {
        running = false;
      }
    };
    const initial = setTimeout(check, 1500);
    const timer = setInterval(check, 300000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [ready, db]);
  useEffect(() => {
    if (!ready || !data) return;
    let active = true;
    const timer = setTimeout(() => {
      if (document.visibilityState !== "hidden")
        void import("../data/automation-repository")
          .then((m) => (active ? m.evaluateScheduledAutomations(db) : 0))
          .catch(() => {
            if (active)
              setToast(
                "Local automation check could not finish. Your records were not partially changed.",
              );
          });
    }, 5000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [ready, db, data?.tasks, data?.opportunities, data?.interactions]);
  if (error)
    return (
      <div className="startup">
        <h1>Storage needs your attention</h1>
        <p>{error}</p>
        <p>
          No save has been confirmed. Use your usual browser and allow site
          storage. Do not clear site data as a first remedy; it may erase
          existing records. Keep any backup files.
        </p>
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
    <InterfaceLocaleProvider locale={data.settings.locale}>
    <Context.Provider
      value={{
        ...data,
        intelligence,
        progress,
        db,
        workspace,
        switchWorkspace: (next) => {
          if (confirmLeave()) {
            window.location.hash = "#/";
            onSwitch(next);
          }
        },
        notify: setToast,
        run,
        setSettings: async (patch) => {
          const form = document.activeElement?.closest("form") || null;
          await updateSettings(db, patch);
          markSaved(form);
        },
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.includes("XP") && data.settings.progress.celebrations ? "momentum-celebration" : ""}`}
          role="status"
        >
          {translateInterface(data.settings.locale, toast)}
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
    </InterfaceLocaleProvider>
  );
}
