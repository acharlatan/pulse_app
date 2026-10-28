import { useState, type ReactNode } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  AudioLines,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  Home,
  HeartPulse,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Users,
  Workflow,
  Orbit,
  ChartNoAxesCombined,
  Target,
  ListFilter,
  X,
} from "lucide-react";
import { OfflineStatus } from "../components/OfflineStatus";
import { usePulse } from "./context";
import { Avatar, Modal } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { useEffect, useRef } from "react";
import { overdue } from "../services/recommendations";
import { CommandPalette } from "../components/CommandPalette";
const nav = [
  { to: "/", label: "Daily Pulse", short: "Home", icon: Home },
  { to: "/network", label: "My network", short: "Network", icon: Users },
  { to: "/pipeline", label: "Pipeline", short: "Pipeline", icon: Workflow },
  { to: "/activity", label: "Activity", short: "Activity", icon: Activity },
];
export function Shell({ children }: { children: ReactNode }) {
  const { intelligence, workspace, settings, contacts, tasks } = usePulse();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [add, setAdd] = useState(false);
  const [more, setMore] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const location = useLocation();
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  }, [location.pathname]);
  const overdueCount = tasks.filter(
    (t) => overdue(t) && settings.alerts.tasks,
  ).length;
  const upcomingCount = settings.alerts.followUps
    ? tasks.filter(
        (t) =>
          !t.completedAt &&
          Date.parse(t.dueAt) >= Date.now() &&
          Date.parse(t.dueAt) <= Date.now() + 86400000,
      ).length
    : 0;
  const reconnectionCount = settings.alerts.relationships
    ? intelligence.queue.length
    : 0;
  const count = overdueCount + upcomingCount + reconnectionCount;
  return (
    <div className="app-shell connected-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.querySelector<HTMLElement>("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link to="/" className="wordmark">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          PULSE<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">
            <LayoutGrid size={17} />
          </span>
          <div>
            <strong>
              {workspace === "demo"
                ? "The demo studio"
                : settings.identity.workspaceName || "My workspace"}
            </strong>
            <small>
              {workspace === "demo"
                ? "A little room to explore"
                : "Private · on this device"}
            </small>
          </div>
        </div>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Search size={18} />
          <span>Search</span>
          <kbd>⌘ / Ctrl K</kbd>
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                "nav-item " + (isActive ? "active" : "")
              }
            >
              <Icon size={20} />
              {label}
              {to === "/network" && (
                <span className="nav-count">{contacts.length}</span>
              )}
            </NavLink>
          ))}
          <NavLink
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
            to="/review"
          >
            <HeartPulse size={20} />
            Relationship Review
          </NavLink>
        </nav>
        <nav aria-label="Discover">
          <p className="nav-label">DISCOVER</p>
          {[
            ["/analytics", "Analytics"],
            ["/automations", "Automations"],
            ["/focus", "My Focus"],
            ["/orbit", "Relationship Orbit"],
            ["/lists", "Smart Lists"],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                "nav-item " + (isActive ? "active" : "")
              }
            >
              {(() => {
                const Icon = {
                  "/analytics": ChartNoAxesCombined,
                  "/automations": Workflow,
                  "/focus": Target,
                  "/orbit": Orbit,
                  "/lists": ListFilter,
                }[to];
                return Icon ? <Icon size={19} /> : null;
              })()}
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
          >
            <Settings size={20} />
            Settings
          </NavLink>
          <Link className="nav-item" to="/help">
            <CircleHelp size={20} />A little guidance
          </Link>
          <Link to="/settings" className="user-card">
            <Avatar
              mediaId={settings.identity.avatarMediaId}
              name={settings.name || "My workspace"}
            />
            <div>
              <strong>{settings.name || "Your workspace"}</strong>
              <small>Your personal space</small>
            </div>
            <ChevronDown size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>
              {location.pathname.startsWith("/network")
                ? "My network"
                : location.pathname === "/pipeline"
                  ? "Pipeline"
                  : location.pathname === "/activity"
                    ? "Activity"
                    : location.pathname === "/settings"
                      ? "Settings"
                      : location.pathname === "/assistant"
                        ? "PULSE Intelligence"
                        : {
                            "/analytics": "Analytics",
                            "/automations": "Automations",
                            "/orbit": "Relationship Orbit",
                            "/focus": "My Focus",
                            "/customize": "Personalize PULSE",
                            "/review": "Relationship Review",
                            "/lists": "Smart Lists",
                            "/import": "Import contacts",
                            "/help": "Help & getting started",
                          }[location.pathname] || "Daily Pulse"}
            </strong>
          </div>
          <Link to="/" className="mobile-brand">
            <AudioLines size={21} />
            PULSE.
          </Link>
          <div className="topbar-actions">
            <span className="local-indicator">
              <i />
              {workspace === "demo" ? "Demo workspace" : "Saved on this device"}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Search PULSE"
              aria-haspopup="dialog"
              onClick={() => setSearch(true)}
            >
              <Search size={19} />
            </button>
            <button
              className="icon-button notification"
              aria-label="Open in-app alerts"
              onClick={() => setAlerts(true)}
            >
              <Bell size={19} />
              {count > 0 && <i />}
            </button>
            <Link to="/settings" aria-label="Open settings">
              <Avatar
                mediaId={settings.identity.avatarMediaId}
                name={settings.name || "You"}
                size="small"
              />
            </Link>
          </div>
        </header>
        <OfflineStatus />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <AudioLines size={14} />
            Every relationship has a story.
          </span>
          <span>Made for meaningful connections.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon size={21} />
            <span>{short}</span>
          </NavLink>
        ))}
        <button
          aria-label="More destinations"
          aria-expanded={more}
          onClick={() => setMore(true)}
        >
          <LayoutGrid size={21} />
          <span>More</span>
        </button>
      </nav>
      {more && (
        <Modal title="Explore your workspace" onClose={() => setMore(false)}>
          <nav className="explore-menu" aria-label="More destinations">
            {[
              ["/analytics", "Analytics"],
              ["/automations", "Automations"],
              ["/focus", "My Focus"],
              ["/orbit", "Relationship Orbit"],
              ["/review", "Relationship Review"],
              ["/lists", "Smart Lists"],
              ["/assistant", "PULSE Intelligence"],
              ["/customize", "Customize"],
              ["/settings", "Settings"],
              ["/help", "Help"],
            ].map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setMore(false)}>
                {label}
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </nav>
        </Modal>
      )}
      <button
        className="floating-add"
        aria-label="Create a new record"
        aria-haspopup="dialog"
        onClick={() => setAdd(true)}
      >
        <Plus size={23} />
      </button>
      {add && (
        <Modal title="Make a new connection" onClose={() => setAdd(false)}>
          <p className="muted">Every great relationship starts somewhere.</p>
          <div className="add-options">
            {[
              {
                label: "Add a person",
                description: "Remember someone new",
                icon: Users,
                kind: "contact" as const,
              },
              {
                label: "Add a company",
                description: "Bring a team into your orbit",
                icon: Building2,
                kind: "company" as const,
              },
              {
                label: "Plan a follow-up",
                description: "Make room for your next step",
                icon: Activity,
                kind: "task" as const,
              },
            ].map((v) => (
              <button
                key={v.kind}
                onClick={() => {
                  setAdd(false);
                  setEditor({ kind: v.kind });
                }}
              >
                <v.icon size={22} />
                <div>
                  <strong>{v.label}</strong>
                  <small>{v.description}</small>
                </div>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {search && (
        <CommandPalette onClose={() => setSearch(false)} onEdit={setEditor} />
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {alerts && (
        <Modal title="Your in-app alerts" onClose={() => setAlerts(false)}>
          <p className="muted">
            Checked while PULSE is open. Your notification preferences apply
            here.
          </p>
          {count ? (
            <div className="alert-summary">
              <Bell />
              <h3>A little attention goes a long way</h3>
              <p>
                {overdueCount} overdue tasks · {upcomingCount} follow-ups in the
                next 24 hours · {reconnectionCount} relationship/deal reviews
              </p>
              <Link
                className="button primary"
                to="/activity"
                onClick={() => setAlerts(false)}
              >
                Review tasks
              </Link>
            </div>
          ) : (
            <div className="empty">
              <Bell />
              <h3>You're all caught up</h3>
              <p>No overdue task alerts are enabled or due.</p>
            </div>
          )}
          <Link
            className="text-link"
            to="/settings"
            onClick={() => setAlerts(false)}
          >
            Manage alert preferences <ArrowUpRight size={16} />
          </Link>
        </Modal>
      )}
    </div>
  );
}
