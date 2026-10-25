import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { Field, RecordForm, localDate } from "../components/record-editors";
import { stamp } from "../data/models";
import {
  saveRecommendationAction,
  clearRecommendationAction,
} from "../data/repository";
import type { Recommendation } from "../services/recommendations";
export function Review() {
  const p = usePulse(),
    { date } = useFormat();
  const [view, setView] = useState("For You"),
    [sort, setSort] = useState("urgency"),
    [editor, setEditor] = useState<Editor | null>(null),
    [snooze, setSnooze] = useState<Recommendation | null>(null),
    [days, setDays] = useState(String(p.settings.intelligence.snoozeDays)),
    [limit, setLimit] = useState(20);
  const rows = p.intelligence.all.filter((r) =>
    view === "Paused"
      ? r.blocked
      : view === "Snoozed"
        ? r.action?.kind === "snooze"
        : !r.blocked &&
          !r.action &&
          (view === "For You" ||
            (view === "Overdue" && r.category === "Overdue follow-up") ||
            (view === "Opportunities" && !!r.opportunityId) ||
            (view === "Reconnect" &&
              !!r.contactId &&
              r.category !== "Overdue follow-up")),
  );
  rows.sort((a, b) =>
    sort === "priority"
      ? b.priority - a.priority || a.key.localeCompare(b.key)
      : sort === "oldest"
        ? a.date.localeCompare(b.date) || a.key.localeCompare(b.key)
        : sort === "changed"
          ? b.changedAt.localeCompare(a.changedAt) || a.key.localeCompare(b.key)
          : a.rank - b.rank ||
            b.priority - a.priority ||
            a.date.localeCompare(b.date) ||
            a.key.localeCompare(b.key),
  );
  async function dismiss(r: Recommendation) {
    await p.run(
      () =>
        saveRecommendationAction(p.db, {
          ...stamp(),
          key: r.key,
          recordId: r.recordId,
          kind: "dismiss",
          until: null,
        }),
      "Recommendation dismissed until its evidence changes",
    );
  }
  return (
    <div className="page review-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE INTENTION, EVERY DAY</p>
          <h1>
            Relationships to review<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Who needs attention, why, and a thoughtful next step. Based on your
            saved records.
          </p>
        </div>
        <Link className="button secondary" to="/lists">
          Smart Lists
        </Link>
      </div>
      <div className="review-toolbar">
        <div className="review-tabs" aria-label="Review categories">
          {[
            "For You",
            "Overdue",
            "Reconnect",
            "Opportunities",
            "Paused",
            "Snoozed",
          ].map((v) => (
            <button
              className={
                v === view ? "button secondary is-selected" : "button ghost"
              }
              aria-pressed={v === view}
              key={v}
              onClick={() => {
                setView(v);
                setLimit(20);
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Sort reviews</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="urgency">Highest urgency</option>
            <option value="priority">Contact priority</option>
            <option value="oldest">Oldest outstanding action</option>
            <option value="changed">Recently changed</option>
          </select>
        </label>
      </div>
      <p className="muted">
        {rows.length} {view.toLowerCase()} reviews · Snooze defers a suggestion.
        Dismiss hides unchanged evidence. Neither changes a task, availability
        or permission.
      </p>
      <div className="review-grid">
        {rows.slice(0, limit).map((r) => {
          const c = p.contacts.find((c) => c.id === r.contactId),
            o = p.opportunities.find((o) => o.id === r.opportunityId),
            org = p.organizations.find((o) => o.id === c?.organizationId);
          return (
            <article className="surface review-card" key={r.key}>
              <div className="review-identity">
                <Avatar
                  name={c?.name || o?.title || "Opportunity"}
                  company={!c}
                />
                <div>
                  <h2>{c?.name || o?.title}</h2>
                  <p className="muted">
                    {org?.name || (c ? "Independent" : o?.stageId)}
                    {c ? ` · ${c.stage} · ${c.priority}` : ""}
                  </p>
                </div>
              </div>
              <Badge
                tone={r.blocked ? "red" : r.rank === 0 ? "amber" : "purple"}
              >
                {r.category}
              </Badge>
              <p className="review-reason">{r.reason}</p>
              {r.action?.until && (
                <p className="muted">
                  Snoozed until{" "}
                  {date(r.action.until, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              <div className="record-actions">
                {c && (
                  <>
                    <Link
                      className="button secondary"
                      to={`/network/people/${c.id}`}
                    >
                      Open profile
                    </Link>
                    {!r.blocked && (
                      <>
                        <button
                          className="button primary"
                          onClick={() =>
                            setEditor(
                              r.taskId
                                ? {
                                    kind: "task",
                                    record: p.tasks.find(
                                      (t) => t.id === r.taskId,
                                    ),
                                  }
                                : { kind: "task", contact: c },
                            )
                          }
                        >
                          {r.taskId
                            ? "Reschedule follow-up"
                            : "Schedule follow-up"}
                        </button>
                        <button
                          className="button ghost"
                          onClick={() =>
                            setEditor({ kind: "interaction", contact: c })
                          }
                        >
                          Log interaction
                        </button>
                      </>
                    )}
                  </>
                )}
                {o && (
                  <button
                    className="button primary"
                    onClick={() =>
                      setEditor({ kind: "opportunity", record: o })
                    }
                  >
                    Review opportunity
                  </button>
                )}
                {!r.blocked &&
                  (r.action ? (
                    <button
                      className="button ghost"
                      onClick={() =>
                        p.run(
                          () => clearRecommendationAction(p.db, r.action!.id),
                          "Review returned to the queue",
                        )
                      }
                    >
                      Unsnooze
                    </button>
                  ) : (
                    <>
                      <button
                        className="button ghost"
                        onClick={() => {
                          setSnooze(r);
                          setDays(String(p.settings.intelligence.snoozeDays));
                        }}
                      >
                        Snooze
                      </button>
                      <button
                        className="button ghost"
                        onClick={() => dismiss(r)}
                      >
                        Dismiss
                      </button>
                    </>
                  ))}
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title="Room to breathe"
          body="No reviews match this view. You may be caught up, have deferred suggestions, or have recommendations disabled in Settings."
        />
      )}
      {rows.length > limit && (
        <button
          className="button secondary"
          onClick={() => setLimit(limit + 20)}
        >
          Show more reviews
        </button>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {snooze && (
        <RecordForm
          title="Snooze recommendation"
          onClose={() => setSnooze(null)}
          onSave={(d) => {
            const until =
              days === "custom"
                ? new Date(String(d.get("until")))
                : new Date(
                    new Date().setDate(new Date().getDate() + Number(days)),
                  );
            return saveRecommendationAction(p.db, {
              ...stamp(),
              key: snooze.key,
              recordId: snooze.recordId,
              kind: "snooze",
              until: until.toISOString(),
            });
          }}
        >
          <p className="wide field-help">
            This defers only this recommendation. The underlying task and
            communication restrictions remain unchanged. Dates use device time.
          </p>
          <Field label="Snooze for" wide>
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="1">Tomorrow</option>
              <option value="3">In 3 days</option>
              <option value="7">Next week</option>
              {![1, 3, 7].includes(p.settings.intelligence.snoozeDays) && (
                <option value={p.settings.intelligence.snoozeDays}>
                  Default · {p.settings.intelligence.snoozeDays} days
                </option>
              )}
              <option value="custom">Custom date</option>
            </select>
          </Field>
          {days === "custom" && (
            <Field label="Snooze until" wide>
              <input
                name="until"
                type="datetime-local"
                required
                min={localDate(new Date())}
              />
            </Field>
          )}
        </RecordForm>
      )}
    </div>
  );
}
