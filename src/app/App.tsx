import { useInterfaceText } from "../i18n/useInterfaceText";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowUpRight,
  AudioLines,
  Heart,
  LockKeyhole,
  Users,
} from "lucide-react";
import type { Workspace } from "../data/models";
import { ErrorBoundary } from "./Recovery";
import { installEditProtection } from "./update-safety";
const WorkspaceApp = lazy(() =>
  import("./Workspace").then((m) => ({ default: m.WorkspaceApp })),
);
export { ErrorBoundary } from "./Recovery";
export function App() {
  const __pulseText = useInterfaceText();
  useEffect(installEditProtection, []);
  const [workspace, setWorkspace] = useState<Workspace | null>(() => {
    let w: string | null = null;
    try {
      w = localStorage.getItem("pulse-workspace");
    } catch {
      /* IndexedDB will report its own availability. */
    }
    return w === "demo" || w === "personal" ? w : null;
  });
  const select = (w: Workspace) => {
    try {
      localStorage.setItem("pulse-workspace", w);
    } catch {
      /* Workspace works for this session without a preference hint. */
    }
    setWorkspace(w);
  };
  return (
    <ErrorBoundary>
      {!workspace ? (
        <Welcome onSelect={select} />
      ) : (
        <Suspense
          fallback={
            <div className="startup" role="status">
              {__pulseText("Opening your local workspace…")}</div>
          }
        >
          <WorkspaceApp
            key={workspace}
            workspace={workspace}
            onSwitch={select}
          />
        </Suspense>
      )}
    </ErrorBoundary>
  );
}
function Welcome({ onSelect }: { onSelect: (w: Workspace) => void }) {
  const __pulseText = useInterfaceText();
  return (
    <div className="welcome">
      <div className="welcome-story">
        <div className="wordmark">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          PULSE.
        </div>
        <div className="welcome-editorial">
          <span className="welcome-eyebrow">{__pulseText("LESS ADMIN. MORE HUMAN.")}</span>
          <h1>
            {__pulseText("Every relationship")}<br />
            {__pulseText("has a") + " "}<em>{__pulseText("story.")}</em>
          </h1>
          <p>{__pulseText("The people. The conversations. The next chapter. Your relationships, brought together.")}</p>
          <div className="welcome-art" aria-hidden="true">
            <div className="welcome-orbit" />
            <span className="welcome-heart">
              <Heart size={48} fill="currentColor" />
            </span>
            <span className="welcome-spark">✳</span>
            <span className="welcome-floating">
              {__pulseText("Good things start with hello.")}</span>
          </div>
        </div>
        <p className="welcome-footer">
          {__pulseText("The social CRM for meaningful connections.")}</p>
      </div>
      <main className="welcome-choices">
        <BadgeWelcome />
        <h2>{__pulseText("Find your rhythm.")}</h2>
        <p>
          {__pulseText("A private space for people, conversations and the work you do together.")}</p>
        <button className="welcome-choice" onClick={() => onSelect("demo")}>
          <span className="choice-icon lavender">
            <Users size={24} />
          </span>
          <div>
            <strong>{__pulseText("Explore Demo")}</strong>
            <span>
              {__pulseText("Meet a fictional network. Try everything.")}<br />
              {__pulseText("No account, no pressure.")}</span>
          </div>
          <ArrowUpRight size={23} />
        </button>
        <button className="welcome-choice" onClick={() => onSelect("personal")}>
          <span className="choice-icon sage">
            <Heart size={24} />
          </span>
          <div>
            <strong>{__pulseText("Create My Workspace")}</strong>
            <span>
              {__pulseText("A fresh start for your real connections.")}<br />
              {__pulseText("Saved in this browser. No automatic cloud backup.")}</span>
          </div>
          <ArrowUpRight size={23} />
        </button>
        <div className="welcome-privacy">
          <LockKeyhole size={16} />
          <span>{__pulseText("Local-first. No sign-up. Your relationships stay yours.")}</span>
        </div>
        <small>
          {__pulseText("Local data is stored in this browser. Keep backups of important work.")}</small>
      </main>
    </div>
  );
}
function BadgeWelcome() {
  const __pulseText = useInterfaceText();
  return (
    <span className="welcome-pill">
      <span className="live-dot" />{__pulseText("A WARM WELCOME TO PULSE")}</span>
  );
}
