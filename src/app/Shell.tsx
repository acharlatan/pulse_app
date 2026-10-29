import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, ArrowUpRight, AudioLines, Bell, Building2, ChevronDown, Home, Plus, Search, Users, Workflow, ChartNoAxesCombined } from "lucide-react";
import { OfflineStatus } from "../components/OfflineStatus";
import { LanguageSelector } from "../components/LanguageSelector";
import { useTranslation } from "../i18n/useTranslation";
import { usePulse } from "./context";
import { Avatar, Modal } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { useEffect, useRef } from "react";
import { overdue } from "../services/recommendations";
import { CommandPalette } from "../components/CommandPalette";
const mainAreas = [
  { to: "/", label: "Today", icon: Home },
  { to: "/network", label: "People", icon: Users },
  { to: "/pipeline", label: "Work", icon: Workflow },
  { to: "/analytics", label: "Insights", icon: ChartNoAxesCombined },
] as const;
export function Shell({ children }: { children: ReactNode }) {
  const {
    intelligence,
    workspace,
    settings,
    tasks,
    switchWorkspace,
  } = usePulse();
  const t = useTranslation();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [add, setAdd] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [search, setSearch] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!profileMenu) return;
    const closeOutside = (event: PointerEvent) => { if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileMenu(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, [profileMenu]);
  const location = useLocation();
  const path = location.pathname;
  const area = path === "/" || path === "/focus" ? "Today" : ["/network", "/review", "/lists", "/orbit"].some((prefix) => path.startsWith(prefix)) ? "People" : ["/pipeline", "/activity", "/automations"].some((prefix) => path.startsWith(prefix)) ? "Work" : path.startsWith("/analytics") ? "Insights" : "";
  const areaLinks: Record<string, [string, string][]> = {
    People: [["/network", "Directory"], ["/orbit", "Orbit"], ["/review", "Needs attention"]],
    Work: [["/pipeline", "Pipeline"], ["/activity", "Follow-ups & activity"], ["/automations", "Automations"]],
  };
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
    <div className="app-shell connected-shell unified-shell">
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
      <div className="workspace-main">
        <header className="topbar">
          <Link to="/" className="unified-brand"><AudioLines size={23} /> PULSE<span>.</span></Link>
          <nav className="unified-main-nav" aria-label="Main areas">
            {mainAreas.map(({ to, label }) => <Link key={to} to={to} className={area === label ? "active" : ""} aria-current={area === label ? "page" : undefined}>{t(label.toLowerCase() as "today" | "people" | "work" | "insights")}</Link>)}
          </nav>
          <div className="topbar-actions">
            <details className="workspace-switcher">
              <summary
                data-workspace={workspace}
                aria-label={`${t("switchWorkspace")}: ${workspace === "demo" ? t("demo") : t("personal")}`}
              >
                <span className="workspace-switcher-text" aria-hidden="true">
                  {workspace === "demo" ? t("demo") : t("personal")}
                </span>
                <ChevronDown size={15} />
              </summary>
              <div className="workspace-switcher-menu">
                <strong>{t("switchWorkspace")}</strong>
                <p>Demo and Personal have separate records on this device.</p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    switchWorkspace(workspace === "demo" ? "personal" : "demo")
                  }
                >
                  {workspace === "demo" ? t("openPersonal") : t("openDemo")}
                </button>
                <small>Switching does not delete either workspace.</small>
              </div>
            </details>
            <span className="local-indicator">
              <i />
              {workspace === "demo" ? "Demo workspace" : "Saved on this device"}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={t("searchApp")}
              aria-haspopup="dialog"
              onClick={() => setSearch(true)}
            >
              <Search size={19} />
            </button>
            <button
              className="icon-button notification"
              aria-label={t("alerts")}
              onClick={() => setAlerts(true)}
            >
              <Bell size={19} />
              {count > 0 && <i />}
            </button>
            <div className="unified-profile-menu" ref={profileMenuRef}>
              <button type="button" className="unified-profile-trigger" aria-label={t("workspaceMenu")} aria-expanded={profileMenu} onClick={() => setProfileMenu(!profileMenu)}><Avatar workspaceIdentity mediaId={settings.identity.avatarMediaId} name={settings.name || "You"} size="small" /></button>
              {profileMenu && <div className="unified-profile-dropdown">
                <strong>{settings.name || "Your workspace"}</strong><small>{workspace === "demo" ? "Demo workspace" : "Saved on this device"}</small>
                <LanguageSelector compact />
                <Link to="/settings" onClick={() => setProfileMenu(false)}>{t("settingsBackups")}</Link>
                <Link to="/customize" onClick={() => setProfileMenu(false)}>{t("personalize")}</Link>
                <Link to="/import" onClick={() => setProfileMenu(false)}>{t("importContacts")}</Link>
                <Link to="/assistant" onClick={() => setProfileMenu(false)}>{t("intelligence")}</Link>
                <Link to="/help" onClick={() => setProfileMenu(false)}>{t("help")}</Link>
              </div>}
            </div>
          </div>
        </header>
        {areaLinks[area] && <nav className="unified-section-nav" aria-label={`${area} views`}>
          <div>{areaLinks[area].map(([to, label]) => <Link key={to} to={to} className={path === to || (to === "/network" && (path.startsWith("/network/") || path === "/lists")) ? "active" : ""} aria-current={path === to ? "page" : undefined}>{t(({ "Directory": "directory", "Orbit": "orbit", "Needs attention": "attention", "Pipeline": "pipeline", "Follow-ups & activity": "activity", "Automations": "automations" } as const)[label as "Directory" | "Orbit" | "Needs attention" | "Pipeline" | "Follow-ups & activity" | "Automations"])}</Link>)}</div>
        </nav>}
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
      <nav className="bottom-nav unified-bottom-nav" aria-label="Mobile navigation">
        {mainAreas.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className={area === label ? "active" : ""} aria-current={area === label ? "page" : undefined}><Icon size={21} /><span>{t(label.toLowerCase() as "today" | "people" | "work" | "insights")}</span></Link>)}
      </nav>
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
