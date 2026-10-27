import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowUpRight,
  Plus,
  Check,
  ArrowRight,
  AudioLines,
} from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { GettingStarted } from "../components/GettingStarted";
import { ProgressSummary } from "../components/progress";
import { FocusSummary } from "../components/focus";
import { EditorModal, type Editor } from "../components/forms";
import { completeTask } from "../data/repository";
import { taskState } from "../services/recommendations";
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
  const tasks = p.tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
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
      <header className="home-editorial">
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
            A good day to connect<span className="accent">.</span>
          </h1>
          <p>
            Welcome{p.settings.name ? ` back, ${p.settings.name}` : ""}. Make
            room for what matters.
          </p>
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
          <div className="home-facts">
            <Link to="/network">
              <strong>{p.contacts.length}</strong>
              <span>People in your network</span>
            </Link>
            <Link to="/activity">
              <strong>{tasks.length}</strong>
              <span>Open next steps</span>
            </Link>
            <Link to="/pipeline">
              <strong>
                {p.opportunities.filter((o) => o.status === "open").length}
              </strong>
              <span>Open opportunities</span>
            </Link>
          </div>
          {p.settings.focus.shortcuts &&
            p.settings.focus.homeLayout === "focused" && <FocusSummary />}
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
          <div className="daily-work-grid">
            <section className="surface today-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">A LITTLE INTENTION</p>
                  <h2>On your radar</h2>
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
                    <strong>{t.title}</strong>
                    {t.contactId && (
                      <Link to={`/network/people/${t.contactId}`}>
                        {p.contacts.find((c) => c.id === t.contactId)?.name}
                      </Link>
                    )}
                    <small>
                      {date(t.dueAt)} · {taskState(t, p.settings.timezone)}
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
          <div className="home-support-grid">
            <section className="surface">
              <div className="section-heading">
                <h2>Conversations in motion</h2>
                <Link className="text-link" to="/activity">
                  View activity
                </Link>
              </div>
              {p.events.slice(0, 3).map((e) => (
                <div className="editorial-event" key={e.id}>
                  <small>{date(e.createdAt)}</small>
                  <p>{e.summary}</p>
                </div>
              ))}
              {!p.events.length && (
                <p className="muted">Your story begins with a conversation.</p>
              )}
            </section>
            <section className="surface">
              <div className="section-heading">
                <h2>Opportunities to review</h2>
                <Link to="/pipeline" className="text-link">
                  Pipeline
                </Link>
              </div>
              {p.intelligence.opportunities
                .filter((i) => i.flags.length)
                .slice(0, 3)
                .map((i) => {
                  const o = p.opportunities.find(
                    (o) => o.id === i.opportunityId,
                  );
                  return o ? (
                    <button
                      className="opportunity-review-link"
                      key={o.id}
                      onClick={() =>
                        setEditor({ kind: "opportunity", record: o })
                      }
                    >
                      <strong>{o.title}</strong>
                      <span>{i.flags[0]}</span>
                    </button>
                  ) : null;
                })}
              <Link className="button ghost" to="/assistant">
                Open PULSE Intelligence · optional AI
              </Link>
            </section>
          </div>
          {p.settings.focus.shortcuts &&
            p.settings.focus.homeLayout !== "focused" && <FocusSummary />}
          <ProgressSummary />
        </>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
