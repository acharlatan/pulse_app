import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { WorkspaceProvider } from "./context";
import { Shell } from "./Shell";
import { ErrorBoundary } from "./Recovery";
import type { Workspace } from "../data/models";
const Help = lazy(() =>
  import("../features/Help").then((m) => ({ default: m.Help })),
);
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
function RouteBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
export function WorkspaceApp({
  workspace,
  onSwitch,
}: {
  workspace: Workspace;
  onSwitch: (w: Workspace) => void;
}) {
  return (
    <HashRouter>
      <WorkspaceProvider
        key={workspace}
        workspace={workspace}
        onSwitch={onSwitch}
      >
        <Shell>
          <RouteBoundary>
            <Suspense
              fallback={
                <div className="page" role="status">
                  Finding your rhythm…
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/help" element={<Help />} />
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
          </RouteBoundary>
        </Shell>
      </WorkspaceProvider>
    </HashRouter>
  );
}
