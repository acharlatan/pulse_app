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
              Opening your local workspace…
            </div>
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
          <span className="welcome-eyebrow">LESS ADMIN. MORE HUMAN.</span>
          <h1>
            Every relationship
            <br />
            has a <em>story.</em>
          </h1>
          <p>The people. The conversations. The next chapter.
            Your relationships, brought together.</p>
          <div className="welcome-art" aria-hidden="true">
            <div className="welcome-orbit" />
            <span className="welcome-heart">
              <Heart size={48} fill="currentColor" />
            </span>
            <span className="welcome-spark">✳</span>
            <span className="welcome-floating">
              Good things start with hello.
            </span>
          </div>
        </div>
        <p className="welcome-footer">
          The social CRM for meaningful connections.
        </p>
      </div>
      <main className="welcome-choices">
        <BadgeWelcome />
        <h2>Find your rhythm.</h2>
        <p>
          A private space for people, conversations and the work you do together.
        </p>
        <button className="welcome-choice" onClick={() => onSelect("demo")}>
          <span className="choice-icon lavender">
            <Users size={24} />
          </span>
          <div>
            <strong>Explore Demo</strong>
            <span>
              Meet a fictional network. Try everything.
              <br />
              No account, no pressure.
            </span>
          </div>
          <ArrowUpRight size={23} />
        </button>
        <button className="welcome-choice" onClick={() => onSelect("personal")}>
          <span className="choice-icon sage">
            <Heart size={24} />
          </span>
          <div>
            <strong>Create My Workspace</strong>
            <span>
              A fresh start for your real connections.
              <br />
              Saved in this browser. No automatic cloud backup.
            </span>
          </div>
          <ArrowUpRight size={23} />
        </button>
        <div className="welcome-privacy">
          <LockKeyhole size={16} />
          <span>Local-first. No sign-up. Your relationships stay yours.</span>
        </div>
        <small>
          Local data is stored in this browser. Keep backups of important work.
        </small>
      </main>
    </div>
  );
}
function BadgeWelcome() {
  return (
    <span className="welcome-pill">
      <span className="live-dot" />A WARM WELCOME TO PULSE
    </span>
  );
}
