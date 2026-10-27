import { BrandArt } from "../components/BrandArt";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowUpRight,
  Plus,
  Check,
  ArrowRight,
  AudioLines,
  Users,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  Orbit,
  ChartNoAxesCombined,
  Workflow,
} from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { GettingStarted } from "../components/GettingStarted";
import { ProgressSummary } from "../components/progress";
import { FocusSummary } from "../components/focus";
import { EditorModal, type Editor } from "../components/forms";
import { completeTask } from "../data/repository";
import { taskState } from "../services/recommendations";
import { calendarDay } from "../services/progress";
export function Home() {
  const p = usePulse(),
    { date } = useFormat(),
    navigate = useNavigate(),
    [editor, setEditor] = useState<Editor | null>(null);
  const reminders =
    useLiveQuery(
      () =>
        p.db.automationExecutions
          .orderBy("at")
          .reverse()
          .filter((e) => e.action === "reminder" && e.status === "completed")
          .limit(5)
          .toArray(),
      [p.db],
    ) || [];
  useEffect(() => {
    if (p.settings.focus.landing !== "focus") return;
    try {
      const key = `pulse-home-visited:${p.workspace}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        navigate("/focus", { replace: true });
      }
    } catch {
      /* Home remains available without the optional session hint. */
    }
  }, [navigate, p.workspace, p.settings.focus.landing]);
  const today = calendarDay(Date.now(), p.settings.timezone);
  const focusedTasks = new Set(
    p.focusItems
      .filter((f) => f.entityType === "task" && f.today === today)
      .map((f) => f.recordId),
  );
  const tasks = p.tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => {
      const rank = (id: string, dueAt: string) =>
        Date.parse(dueAt) <= Date.now() ? 0 : focusedTasks.has(id) ? 1 : 2;
      return (
        rank(a.id, a.dueAt) - rank(b.id, b.dueAt) ||
        a.dueAt.localeCompare(b.dueAt)
      );
    });
  const dueToday = tasks.filter((t) =>
    ["Overdue", "Due today"].includes(taskState(t, p.settings.timezone)),
  ).length;
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: p.settings.timezone,
    }).format(new Date()),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const recs = p.intelligence.queue
    .filter((r) => r.contactId)
    .slice(0, p.settings.intelligence.homeLimit);
  const pins = p.focusItems
    .filter((f) => ["contact", "organization"].includes(f.entityType))
    .slice(0, 5);
  const active =
    p.contacts.length ||
    p.organizations.length ||
    p.opportunities.length ||
    p.tasks.length;
  return (
    <div
      className={`page home-page experience-home home-${p.settings.focus.homeLayout}`}
    >
      <header className="home-editorial studio-home-hero">
        <BrandArt motif="orbit" />
        <div>
          <p className="eyebrow">
            {date(new Date().toISOString(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            · YOUR DAILY PULSE
          </p>
          <h1>
            {greeting}
            {p.settings.name ? `, ${p.settings.name}` : ""}
            <span className="accent">.</span>
          </h1>
          <p>
            {dueToday
              ? `${dueToday} ${dueToday === 1 ? "follow-up needs" : "follow-ups need"} your attention today.`
              : tasks.length
                ? `${tasks.length} open ${tasks.length === 1 ? "follow-up" : "follow-ups"} on your radar.`
                : "Your next connection starts here."}
          </p>
        </div>
        <div className="home-hero-side">
          <div className="hero-brand-seal" aria-hidden="true">
            <AudioLines size={46} />
            <span>
              PULSE<span className="seal-dot">.</span>
            </span>
            <small>EVERY RELATIONSHIP HAS A STORY</small>
          </div>
          <div className="home-identity">
            <Avatar
              name={
                p.settings.identity.workspaceName ||
                p.settings.name ||
                "My workspace"
              }
              mediaId={p.settings.identity.avatarMediaId}
              size="xl"
            />
            <span>
              {p.settings.identity.workspaceName || "My workspace"}
              <small>
                {p.workspace === "demo"
                  ? "Demo · a space to explore"
                  : "Private · on this device"}
              </small>
            </span>
          </div>
        </div>
      </header>
      <nav className="home-actions" aria-label="Quick actions">
        <button
          className="button primary"
          onClick={() => setEditor({ kind: "contact" })}
        >
          <Plus size={18} />
          New connection
        </button>
        <button
          className="button secondary"
          onClick={() => setEditor({ kind: "task" })}
        >
          Plan a follow-up
        </button>
        <Link className="button ghost" to="/orbit">
          Explore Relationship Orbit <ArrowUpRight size={18} />
        </Link>
      </nav>
      <GettingStarted />
      {!active ? (
        <section className="surface home-empty">
          <AudioLines size={36} />
          <h2>A little intention goes a long way.</h2>
          <p>
            Add a person or company, or bring your contacts along. This Personal
            workspace starts with your real connections.
          </p>
          <div className="form-actions">
            <button
              className="button primary"
              onClick={() => setEditor({ kind: "contact" })}
            >
              Add someone
            </button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "company" })}
            >
              Add a company
            </button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "opportunity" })}
            >
              Create opportunity
            </button>
            <Link className="button secondary" to="/import">
              Import contacts
            </Link>
            <Link className="button ghost" to="/help">
              Getting started
            </Link>
          </div>
        </section>
      ) : (
        <>
          {reminders.length > 0 && (
            <section className="surface">
              <h2>Recent local reminders</h2>
              {reminders.map((r) => (
                <p key={r.id}>
                  {(r.sourceType === "contact"
                    ? p.contacts.find((c) => c.id === r.sourceId)?.name
                    : r.sourceType === "task"
                      ? p.tasks.find((t) => t.id === r.sourceId)?.title
                      : p.opportunities.find((o) => o.id === r.sourceId)
                          ?.title) || "Record removed"}{" "}
                  ·{" "}
                  {new Date(r.at).toLocaleString(p.settings.locale, {
                    timeZone: p.settings.timezone,
                  })}
                </p>
              ))}
              <Link to="/automations">Open automation history</Link>
            </section>
          )}
          <section
            className="pulse-overview"
            aria-label="Your workspace at a glance"
          >
            <div className="pulse-overview-intro">
              <span className="pulse-overview-mark">
                <AudioLines size={20} />
              </span>
              <div>
                <p className="eyebrow">YOUR WORLD AT A GLANCE</p>
                <h2>Your relationships, in motion.</h2>
                <p>A clear view of the people and work you’re keeping close.</p>
              </div>
            </div>
            <div className="pulse-overview-stats">
              <Link to="/network">
                <span className="pulse-stat-icon">
                  <Users size={19} />
                </span>
                <span>
                  <strong>{p.contacts.length}</strong>
                  <small>People</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
              <Link to="/network">
                <span className="pulse-stat-icon">
                  <Building2 size={19} />
                </span>
                <span>
                  <strong>{p.organizations.length}</strong>
                  <small>Companies</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
              <Link to="/pipeline">
                <span className="pulse-stat-icon">
                  <BriefcaseBusiness size={19} />
                </span>
                <span>
                  <strong>
                    {p.opportunities.filter((o) => o.status === "open").length}
                  </strong>
                  <small>Active opportunities</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
              <Link to="/activity">
                <span className="pulse-stat-icon">
                  <CalendarClock size={19} />
                </span>
                <span>
                  <strong>{tasks.length}</strong>
                  <small>Open follow-ups</small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
          <div className="daily-work-grid">
            <section className="surface today-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">A LITTLE INTENTION</p>
                  <h2>Today’s priorities</h2>
                </div>
                <Link className="text-link" to="/activity">
                  View all <ArrowUpRight size={16} />
                </Link>
              </div>
              <p className="muted">Your next commitments, in order.</p>
              {tasks.slice(0, 4).map((t) => (
                <article className="daily-task" key={t.id}>
                  <button
                    className="task-check"
                    aria-label={`Complete ${t.title}`}
                    onClick={() =>
                      void p.run(
                        () => completeTask(p.db, t.id),
                        "One thoughtful step, complete.",
                      )
                    }
                  >
                    <Check size={16} />
                  </button>
                  <div>
                    <button
                      className="home-task-title"
                      onClick={() => setEditor({ kind: "task", record: t })}
                    >
                      {t.title}
                    </button>
                    {t.contactId && (
                      <Link to={`/network/people/${t.contactId}`}>
                        {p.contacts.find((c) => c.id === t.contactId)?.name}
                      </Link>
                    )}
                    {t.organizationId && (
                      <Link to={`/network/companies/${t.organizationId}`}>
                        {
                          p.organizations.find((o) => o.id === t.organizationId)
                            ?.name
                        }
                      </Link>
                    )}
                    <small>
                      {date(t.dueAt)} · {taskState(t, p.settings.timezone)}
                      {focusedTasks.has(t.id) ? " · My Focus" : ""}
                    </small>
                  </div>
                  <Badge
                    tone={
                      taskState(t, p.settings.timezone) === "Overdue"
                        ? "red"
                        : ""
                    }
                  >
                    {taskState(t, p.settings.timezone)}
                  </Badge>
                </article>
              ))}
              {!tasks.length && (
                <Empty
                  title="A little breathing room"
                  body="No open follow-ups. Choose a relationship to move forward."
                />
              )}
            </section>
            <section className="surface relationship-brief">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PEOPLE BEFORE PAPERWORK</p>
                  <h2>Today’s relationship focus</h2>
                </div>
                <Link className="text-link" to="/review">
                  Review <ArrowUpRight size={16} />
                </Link>
              </div>
              {recs.map((r) => {
                const c = p.contacts.find((c) => c.id === r.contactId);
                if (!c) return null;
                return (
                  <article className="connection-brief" key={r.key}>
                    <Link
                      className="person-summary"
                      to={`/network/people/${c.id}`}
                    >
                      <Avatar name={c.name} mediaId={c.avatar} />
                      <div>
                        <strong>{c.name}</strong>
                        <span>
                          {p.organizations.find(
                            (o) => o.id === c.organizationId,
                          )?.name || "Independent"}
                        </span>
                      </div>
                    </Link>
                    <p>{r.reason}</p>
                    <button
                      className="button secondary small-button"
                      onClick={() =>
                        setEditor({ kind: "interaction", contact: c })
                      }
                    >
                      Log a touchpoint <ArrowUpRight size={14} />
                    </button>
                  </article>
                );
              })}
              {!recs.length && (
                <p className="muted">No relationship reviews due right now.</p>
              )}
              <Link className="surface-footer" to="/review">
                Open Relationship Review <ArrowRight size={16} />
              </Link>
            </section>
          </div>
          <section className="relationship-shelf">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CLOSE TO YOUR WORK</p>
                <h2>
                  {pins.length ? "Your pinned relationships" : "Familiar faces"}
                </h2>
              </div>
              <Link className="text-link" to="/network">
                Explore your network <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="relationship-shelf-items">
              {pins.length
                ? pins.map((f) => {
                    const c =
                      f.entityType === "contact"
                        ? p.contacts.find((c) => c.id === f.recordId)
                        : p.organizations.find((c) => c.id === f.recordId);
                    return c ? (
                      <Link
                        key={f.id}
                        to={`/network/${f.entityType === "contact" ? "people" : "companies"}/${c.id}`}
                      >
                        <Avatar name={c.name} mediaId={c.avatar} size="large" />
                        <strong>{c.name}</strong>
                        <small>Pinned by you</small>
                      </Link>
                    ) : null;
                  })
                : p.contacts.slice(0, 5).map((c) => (
                    <Link key={c.id} to={`/network/people/${c.id}`}>
                      <Avatar name={c.name} mediaId={c.avatar} size="large" />
                      <strong>{c.name}</strong>
                      <small>{c.role || "Person"}</small>
                    </Link>
                  ))}
            </div>
          </section>
          <section className="surface home-opportunities">
            <div className="section-heading">
              <div>
                <p className="eyebrow">MOVING FORWARD</p>
                <h2>Opportunity snapshot</h2>
              </div>
              <Link to="/pipeline" className="text-link">
                View pipeline <ArrowUpRight size={16} />
              </Link>
            </div>
            {p.opportunities
              .filter((o) => o.status === "open")
              .slice(0, 4)
              .map((o) => (
                <button
                  className="opportunity-review-link"
                  key={o.id}
                  onClick={() => setEditor({ kind: "opportunity", record: o })}
                >
                  <strong>{o.title}</strong>
                  <span>
                    {p.pipelineStages.find((s) => s.id === o.stageId)?.name ||
                      "Open"}{" "}
                    · Open
                    {o.expectedCloseAt
                      ? ` · Expected ${date(o.expectedCloseAt)}`
                      : ""}
                  </span>
                </button>
              ))}
            {!p.opportunities.some((o) => o.status === "open") && (
              <p className="muted">No active opportunities yet.</p>
            )}
          </section>
          {p.settings.focus.shortcuts && <FocusSummary />}
          <ProgressSummary />
        </>
      )}
      {p.settings.focus.shortcuts && (
        <section
          className="workspace-collection"
          aria-label="Explore your workspace"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">MORE FROM YOUR WORKSPACE</p>
              <h2>See the bigger picture.</h2>
            </div>
          </div>
          <div className="workspace-collection-grid">
            <Link to="/orbit" className="workspace-feature feature-orbit">
              <div className="feature-art" aria-hidden="true">
                <span className="orbit-line" />
                <span className="orbit-line orbit-line-inner" />
                <Orbit size={40} />
                <i />
                <i />
                <i />
              </div>
              <span className="feature-caption">DISCOVER CONNECTIONS</span>
              <h3>Relationship Orbit</h3>
              <p>
                Explore the people, companies and opportunities connected
                through your saved records.
              </p>
              <span className="feature-open">
                Explore your orbit <ArrowUpRight size={17} />
              </span>
            </Link>
            <Link
              to="/analytics"
              className="workspace-feature feature-analytics"
            >
              <div className="feature-art" aria-hidden="true">
                <span className="art-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <ChartNoAxesCombined size={32} />
              </div>
              <span className="feature-caption">UNDERSTAND YOUR WORK</span>
              <h3>A clearer perspective</h3>
              <p>
                Review pipeline movement, conversations and follow-through in
                Analytics.
              </p>
              <span className="feature-open">
                Open Analytics <ArrowUpRight size={17} />
              </span>
            </Link>
            <Link
              to="/automations"
              className="workspace-feature feature-automation"
            >
              <div className="feature-art" aria-hidden="true">
                <span className="art-flow">
                  <i />
                  <i />
                  <i />
                </span>
                <Workflow size={36} />
              </div>
              <span className="feature-caption">
                MAKE ROOM FOR WHAT MATTERS
              </span>
              <h3>Your quiet support system</h3>
              <p>
                Build local reminders and follow-up rules, with every action
                under your control.
              </p>
              <span className="feature-open">
                Explore Automations <ArrowUpRight size={17} />
              </span>
            </Link>
          </div>
        </section>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
