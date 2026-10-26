import {
  Component,
  Suspense,
  lazy,
  useState,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Heart,
  LockKeyhole,
  Users,
} from "lucide-react";
import { WorkspaceProvider } from "./context";
import { Shell } from "./Shell";
import type { Workspace } from "../data/models";
const Assistant = lazy(() =>
  import("../features/Assistant").then((m) => ({ default: m.Assistant })),
);
const Home = lazy(() =>
  import("../features/Home").then((m) => ({ default: m.Home })),
);
const Network = lazy(() =>
  import("../features/Network").then((m) => ({ default: m.Network })),
);
const Profile = lazy(() =>
  import("../features/Profile").then((m) => ({ default: m.Profile })),
);
const Activity = lazy(() =>
  import("../features/Activity").then((m) => ({ default: m.Activity })),
);
const Pipeline = lazy(() =>
  import("../features/Pipeline").then((m) => ({ default: m.Pipeline })),
);
const Settings = lazy(() =>
  import("../features/Settings").then((m) => ({ default: m.Settings })),
);
const CsvImport = lazy(() =>
  import("../features/CsvImport").then((m) => ({ default: m.CsvImport })),
);
const Review = lazy(() =>
  import("../features/Review").then((m) => ({ default: m.Review })),
);
const SmartLists = lazy(() =>
  import("../features/SmartLists").then((m) => ({ default: m.SmartLists })),
);
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* CRM details intentionally never logged. */
  }
  render() {
    return this.state.error ? (
      <div className="startup">
        <h1>Let's find our footing.</h1>
        <p>
          PULSE hit an unexpected problem. Your saved workspace is still on this
          device.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload PULSE
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(() => {
    const w = localStorage.getItem("pulse-workspace");
    return w === "demo" || w === "personal" ? w : null;
  });
  const select = (w: Workspace) => {
    localStorage.setItem("pulse-workspace", w);
    setWorkspace(w);
  };
  return (
    <ErrorBoundary>
      {!workspace ? (
        <Welcome onSelect={select} />
      ) : (
        <HashRouter>
          <WorkspaceProvider
            key={workspace}
            workspace={workspace}
            onSwitch={select}
          >
            <Shell>
              <Suspense
                fallback={
                  <div className="page" role="status">
                    Finding your rhythm…
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/network/people/:id" element={<Profile />} />
                  <Route
                    path="/network/companies/:id"
                    element={<Profile company />}
                  />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/import" element={<CsvImport />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/lists" element={<SmartLists />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="*"
                    element={
                      <div className="page">
                        <h1>A little off the path.</h1>
                        <Link className="button primary" to="/">
                          Back to Daily Pulse
                        </Link>
                      </div>
                    }
                  />
                </Routes>
              </Suspense>
            </Shell>
          </WorkspaceProvider>
        </HashRouter>
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
          <p>
            A little intention.
            <br />A thoughtful follow-up.
            <br />A world of possibility.
          </p>
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
          Your people. Their stories. One thoughtful space.
          <br />
          Let's make room for what comes next.
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
              Private, and saved on this device.
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
