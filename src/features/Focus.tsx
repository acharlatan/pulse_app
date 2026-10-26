import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { calendarDay } from "../services/progress";
import { setFocus } from "../data/expansion-repository";
import { completeTask } from "../data/repository";
import { FocusSummary } from "../components/focus";
import { ProgressSummary } from "../components/progress";
import type { FocusItem } from "../data/expansion-models";
export function Focus() {
  const p = usePulse(),
    day = calendarDay(Date.now(), p.settings.timezone);
  const [type, setType] = useState<FocusItem["entityType"]>("contact"),
    [id, setId] = useState(""),
    [search, setSearch] = useState("");
  const records =
    type === "contact"
      ? p.contacts
      : type === "organization"
        ? p.organizations
        : type === "task"
          ? p.tasks
          : p.opportunities;
  const name = (r: { name?: string; title?: string }) =>
    r.name || r.title || "Untitled";
  const label = (f: FocusItem) => {
    const rows =
      f.entityType === "contact"
        ? p.contacts
        : f.entityType === "organization"
          ? p.organizations
          : f.entityType === "task"
            ? p.tasks
            : p.opportunities;
    return rows.find((r) => r.id === f.recordId);
  };
  return (
    <div className="page focus-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHOSEN BY YOU</p>
          <h1>
            My Focus<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Keep relationships close. Choose what to move forward today.
          </p>
        </div>
      </div>
      <FocusSummary />
      <details className="surface focus-picker">
        <summary>Add a priority</summary>
        <div className="form-grid">
          <label className="field">
            <span>Record type</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as typeof type);
                setId("");
              }}
            >
              <option value="contact">Person</option>
              <option value="organization">Company</option>
              <option value="opportunity">Opportunity</option>
              <option value="task">Follow-up</option>
            </select>
          </label>
          <label className="field">
            <span>Search records</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="field">
            <span>Record</span>
            <select
              aria-label="Focus record"
              value={id}
              onChange={(e) => setId(e.target.value)}
            >
              <option value="">Choose a record</option>
              {records
                .filter((r) =>
                  name(r).toLowerCase().includes(search.toLowerCase()),
                )
                .slice(0, 100)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {name(r)}
                  </option>
                ))}
            </select>
            <small>Search to narrow the first 100 matches.</small>
          </label>
        </div>
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={!id}
            onClick={() =>
              void p.run(() => setFocus(p.db, type, id, "pin"), "Pinned")
            }
          >
            Pin record
          </button>
          <button
            className="button primary"
            disabled={!id}
            onClick={() =>
              void p.run(
                () => setFocus(p.db, type, id, "today", day),
                "Added to today",
              )
            }
          >
            Add to today
          </button>
        </div>
        <p className="muted">
          Up to 100 pins and 20 daily priorities. Pins stay until removed; daily
          selections remain on their chosen date. Removing a priority does not
          reschedule its task.
        </p>
      </details>
      {(
        [
          "Today",
          "Pinned relationships",
          "Opportunities in focus",
          "Next actions",
          "Recently completed",
        ] as const
      ).map((section) => {
        const items = p.focusItems.filter((f) => {
          const r = label(f);
          if (!r) return false;
          const done =
            f.entityType === "task" &&
            p.tasks.find((t) => t.id === f.recordId)?.completedAt;
          return section === "Today"
            ? f.today === day && !done
            : section === "Recently completed"
              ? !!done
              : section === "Pinned relationships"
                ? ["contact", "organization"].includes(f.entityType)
                : section === "Opportunities in focus"
                  ? f.entityType === "opportunity"
                  : f.entityType === "task" && !done;
        });
        return (
          <section className="surface" key={section}>
            <h2>{section}</h2>
            {!items.length && (
              <p className="muted">Nothing selected here yet.</p>
            )}
            {items.slice(0, 100).map((f) => (
              <article className="focus-row" key={f.id}>
                <div>
                  <strong>{name(label(f)!)}</strong>
                  <p className="muted">
                    {f.entityType} · Personally pinned{" "}
                    {f.today === day
                      ? "· Selected today"
                      : f.today
                        ? `· Selected ${f.today}`
                        : ""}
                  </p>
                  {f.entityType === "contact" ||
                  f.entityType === "organization" ? (
                    <Link
                      to={`/network/${f.entityType === "contact" ? "people" : "companies"}/${f.recordId}`}
                    >
                      Open relationship
                    </Link>
                  ) : (
                    <Link
                      to={f.entityType === "task" ? "/activity" : "/pipeline"}
                    >
                      Open {f.entityType}
                    </Link>
                  )}
                </div>
                <div className="form-actions">
                  <button
                    className="button ghost"
                    onClick={() =>
                      void p.run(
                        () =>
                          setFocus(
                            p.db,
                            f.entityType,
                            f.recordId,
                            f.today === day ? "removeToday" : "today",
                            day,
                          ),
                        "Focus updated",
                      )
                    }
                  >
                    {f.today === day ? "Remove from today" : "Choose today"}
                  </button>
                  <button
                    className="button ghost"
                    onClick={() =>
                      void p.run(
                        () => setFocus(p.db, f.entityType, f.recordId, "unpin"),
                        "Unpinned",
                      )
                    }
                  >
                    Unpin
                  </button>
                  {f.entityType === "task" &&
                    !p.tasks.find((t) => t.id === f.recordId)?.completedAt && (
                      <button
                        className="button primary"
                        onClick={() =>
                          void p.run(
                            () => completeTask(p.db, f.recordId),
                            "Follow-up completed",
                          )
                        }
                      >
                        Complete task
                      </button>
                    )}
                </div>
              </article>
            ))}
          </section>
        );
      })}
      {p.settings.focus.progress && p.settings.gamification && (
        <ProgressSummary />
      )}
    </div>
  );
}
