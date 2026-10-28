import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, Plus } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, useFormat } from "../components/ui";
import { GettingStarted } from "../components/GettingStarted";
import { ProgressSummary } from "../components/progress";
import { EditorModal, type Editor } from "../components/forms";
import { DailyPlan } from "./DailyPlan";
export function Home() {
  const p = usePulse(),
    { date } = useFormat(),
    navigate = useNavigate();
  const [editor, setEditor] = useState<Editor | null>(null);
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
      /* Optional session hint only. */
    }
  }, [navigate, p.workspace, p.settings.focus.landing]);
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
      className={`page home-page editorial-home daily-home home-${p.settings.focus.homeLayout}`}
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
            {p.settings.name ? `Hello, ${p.settings.name}. ` : ""}Your space to make meaningful connections and move things forward.
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

      {p.workspace === "personal" &&
        p.contacts.length +
          p.organizations.length +
          p.tasks.length +
          p.opportunities.length >
          0 &&
        (() => {
          const last = p.settings.onboarding.exportInitiatedAt;
          const stale = !last || Date.now() - Date.parse(last) >= 30 * 86400000;
          return stale ? (
            <aside className="backup-nudge" aria-label="Backup reminder">
              <div>
                <strong>Keep a copy of your work.</strong>
                <p>
                  {last
                    ? `Last backup download requested ${date(last)}.`
                    : "No backup download has been requested yet."}{" "}
                  Records live in this browser. Check your downloaded file and
                  keep it somewhere safe.
                </p>
              </div>
              <Link className="button secondary" to="/settings?section=data">
                Review backups
              </Link>
            </aside>
          ) : null;
        })()}
      <GettingStarted />
      {active ? (
        <>
          <DailyPlan onEdit={setEditor} />
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

          <ProgressSummary />
        </>
      ) : (
        <section className="daily-first-use surface">
          <p className="eyebrow">YOUR FIRST USEFUL MOVE</p>
          <h2>Start with a person. Give the next step a home.</h2>
          <p>
            Add a real connection, a possible opportunity and a follow-up. Your
            Daily Pulse will take shape from what you save.
          </p>
          <div className="daily-first-steps">
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "contact" })}
            >
              Add someone
            </button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "opportunity" })}
            >
              Create opportunity
            </button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "task" })}
            >
              Plan a follow-up
            </button>
          </div>
          <div className="form-actions">
            <Link className="text-link" to="/import">
              Import contacts
            </Link>
            <button
              className="text-link"
              onClick={() => setEditor({ kind: "company" })}
            >
              Add a company
            </button>
            <Link className="text-link" to="/help">
              Getting started
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
