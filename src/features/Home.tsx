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
import { taskState, restrictionReasons } from "../services/recommendations";
import { calendarDay } from "../services/progress";
export function Home() {
  const p = usePulse(),
    { date } = useFormat(),
    navigate = useNavigate();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
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
      const rank = (id: string, due: string) =>
        Date.parse(due) <= Date.now() ? 0 : focusedTasks.has(id) ? 1 : 2;
      return (
        rank(a.id, a.dueAt) - rank(b.id, b.dueAt) ||
        a.dueAt.localeCompare(b.dueAt)
      );
    });
  const priority = tasks[0];
  const person = p.contacts.find((c) => c.id === priority?.contactId);
  const company = p.organizations.find(
    (o) => o.id === (priority?.organizationId || person?.organizationId),
  );
  const conversation = person
    ? p.interactions
        .filter(
          (i) =>
            i.contactId === person.id &&
            i.type !== "Note" &&
            Date.parse(i.occurredAt) <= Date.now(),
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
    : undefined;
  const restrictions = person
    ? restrictionReasons(person, p.permissions, p.restrictions)
    : [];
  const dueToday = tasks.filter((t) =>
    ["Overdue", "Due today"].includes(taskState(t, p.settings.timezone)),
  ).length;
  const recs = p.intelligence.queue
    .filter(
      (r) =>
        r.contactId &&
        !tasks.slice(0, 5).some((t) => t.contactId === r.contactId),
    )
    .slice(0, 3);
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
      className={`page home-page editorial-home home-${p.settings.focus.homeLayout}`}
    >
      <header className="editorial-masthead">
        <div>
          <p className="eyebrow">
            {date(new Date().toISOString(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            · DAILY PULSE
          </p>
          <h1>
            Today<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            {dueToday
              ? `${dueToday} follow-up${dueToday === 1 ? " needs" : "s need"} your attention.`
              : "A little space to move a relationship forward."}
          </p>
        </div>
        <div className="editorial-create">
          <button
            className="button secondary"
            onClick={() => setEditor({ kind: "contact" })}
          >
            <Plus size={17} />
            New connection
          </button>
          <button
            className="button ghost"
            onClick={() => setEditor({ kind: "task" })}
          >
            Plan a follow-up
          </button>
        </div>
      </header>
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
          <div className="editorial-daily-grid">
            <section
              className="priority-feature"
              aria-label="Your next commitment"
            >
              <div className="priority-kicker">
                <span className="pulse-tick" aria-hidden="true" />
                <p className="eyebrow">
                  {priority ? "START HERE" : "ROOM FOR WHAT’S NEXT"}
                </p>
                {priority && (
                  <Badge
                    tone={
                      taskState(priority, p.settings.timezone) === "Overdue"
                        ? "red"
                        : "purple"
                    }
                  >
                    {taskState(priority, p.settings.timezone)}
                  </Badge>
                )}
              </div>
              {priority ? (
                <>
                  <h2>{priority.title}</h2>
                  {(person || company) && (
                    <Link
                      className="priority-person"
                      to={`/network/${person ? "people" : "companies"}/${person?.id || company?.id}`}
                    >
                      <Avatar
                        name={(person || company)!.name}
                        mediaId={(person || company)!.avatar}
                        size="large"
                      />
                      <span>
                        <strong>{(person || company)!.name}</strong>
                        <small>
                          {person?.role}
                          {person?.role && company ? " · " : ""}
                          {company?.name}
                        </small>
                      </span>
                      <ArrowUpRight size={19} />
                    </Link>
                  )}
                  {conversation ? (
                    <div className="priority-evidence">
                      <span className="eyebrow">
                        LAST CONVERSATION · {date(conversation.occurredAt)}
                      </span>
                      <p>
                        {conversation.summary.length > 240
                          ? conversation.summary.slice(0, 240) + "…"
                          : conversation.summary}
                      </p>
                    </div>
                  ) : priority.description ? (
                    <p className="priority-description">
                      {priority.description}
                    </p>
                  ) : (
                    <p className="muted">
                      Due {date(priority.dueAt)}. Open this commitment to review
                      its details.
                    </p>
                  )}
                  {restrictions.length > 0 && (
                    <p className="restriction-note">
                      Outreach restricted. Review availability and permissions
                      on the profile; completing a task does not grant
                      permission.
                    </p>
                  )}
                  <div className="priority-actions">
                    <button
                      className="button primary"
                      onClick={() =>
                        setEditor({ kind: "task", record: priority })
                      }
                    >
                      Open commitment <ArrowRight size={17} />
                    </button>
                    <button
                      className="button ghost"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await p.run(
                          () => completeTask(p.db, priority.id),
                          "Follow-up completed",
                        );
                        setBusy(false);
                      }}
                    >
                      <Check size={17} />
                      Mark complete
                    </button>
                  </div>
                  <span className="priority-footnote">
                    Saved follow-up · Due {date(priority.dueAt)}
                  </span>
                </>
              ) : (
                <>
                  <h2>Make room for a good conversation.</h2>
                  <p>
                    Your follow-ups are clear. Choose someone from your network
                    or plan a next step.
                  </p>
                  <Link className="button primary" to="/network">
                    Find a connection <ArrowRight size={17} />
                  </Link>
                </>
              )}
            </section>
            <section className="editorial-agenda">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ON YOUR RADAR</p>
                  <h2>Next in line</h2>
                </div>
                <Link className="text-link" to="/activity">
                  All tasks <ArrowUpRight size={16} />
                </Link>
              </div>
              {tasks.slice(1, 5).map((t) => (
                <article className="daily-task" key={t.id}>
                  <button
                    className="task-check"
                    aria-label={`Complete ${t.title}`}
                    onClick={() =>
                      void p.run(
                        () => completeTask(p.db, t.id),
                        "Follow-up completed",
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
                    <small
                      className={
                        taskState(t, p.settings.timezone) === "Overdue"
                          ? "agenda-overdue"
                          : ""
                      }
                    >
                      {taskState(t, p.settings.timezone)} · {date(t.dueAt)}
                      {focusedTasks.has(t.id) ? " · My Focus" : ""}
                    </small>
                  </div>
                </article>
              ))}
              {tasks.length <= 1 && (
                <p className="muted">
                  No other open commitments. You have room to focus.
                </p>
              )}
              <button
                className="agenda-add"
                onClick={() => setEditor({ kind: "task" })}
              >
                <Plus size={16} />
                Plan a follow-up
              </button>
            </section>
          </div>
          <section className="editorial-people">
            <div className="section-heading">
              <div>
                <p className="eyebrow">KEEP CLOSE</p>
                <h2>
                  {pins.length ? "Your pinned relationships" : "Your people"}
                </h2>
              </div>
              <Link className="text-link" to="/network">
                Open network <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="editorial-people-strip">
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
                        <span>
                          <strong>{c.name}</strong>
                          <small>Pinned by you</small>
                        </span>
                      </Link>
                    ) : null;
                  })
                : p.contacts.slice(0, 4).map((c) => (
                    <Link key={c.id} to={`/network/people/${c.id}`}>
                      <Avatar name={c.name} mediaId={c.avatar} size="large" />
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.role || "Person"}</small>
                      </span>
                    </Link>
                  ))}
            </div>
          </section>
          <div className="editorial-bottom-grid">
            <section className="editorial-reviews">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">RELATIONSHIP NOTES</p>
                  <h2>Worth a closer look</h2>
                </div>
                <Link className="text-link" to="/review">
                  Review <ArrowUpRight size={16} />
                </Link>
              </div>
              {recs.map((r) => {
                const c = p.contacts.find((c) => c.id === r.contactId);
                return c ? (
                  <Link
                    className="editorial-review"
                    key={r.key}
                    to={`/network/people/${c.id}`}
                  >
                    <Avatar name={c.name} mediaId={c.avatar} />
                    <span>
                      <strong>{c.name}</strong>
                      <small>{r.reason}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                ) : null;
              })}
              {!recs.length && (
                <p className="muted">
                  No other relationship reviews due right now.
                </p>
              )}
            </section>
            <section className="editorial-opportunities">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MOVING FORWARD</p>
                  <h2>Open opportunities</h2>
                </div>
                <Link className="text-link" to="/pipeline">
                  Pipeline <ArrowUpRight size={16} />
                </Link>
              </div>
              {p.opportunities
                .filter((o) => o.status === "open")
                .slice(0, 3)
                .map((o) => (
                  <button
                    className="opportunity-review-link"
                    key={o.id}
                    onClick={() =>
                      setEditor({ kind: "opportunity", record: o })
                    }
                  >
                    <strong>{o.title}</strong>
                    <span>
                      {p.pipelineStages.find((s) => s.id === o.stageId)?.name ||
                        "Open"}
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
          </div>
          {reminders.length > 0 && (
            <details className="editorial-reminders">
              <summary>Recent local reminders</summary>
              {reminders.map((r) => (
                <p key={r.id}>
                  {(r.sourceType === "contact"
                    ? p.contacts.find((c) => c.id === r.sourceId)?.name
                    : r.sourceType === "task"
                      ? p.tasks.find((t) => t.id === r.sourceId)?.title
                      : p.opportunities.find((o) => o.id === r.sourceId)
                          ?.title) || "Record removed"}{" "}
                  · {date(r.at)}
                </p>
              ))}
              <Link to="/automations">Open automation history</Link>
            </details>
          )}
          {p.settings.focus.shortcuts &&
            p.focusItems.some((f) => f.today === today) && <FocusSummary />}
          <ProgressSummary />
        </>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
