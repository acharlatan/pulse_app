import { useInterfaceText } from "../i18n/useInterfaceText";
import { FocusButton } from "../components/focus";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePulse } from "../app/context";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { Field, RecordForm, localDate } from "../components/record-editors";
import { stamp } from "../data/models";
import {
  saveRecommendationAction,
  clearRecommendationAction,
} from "../data/repository";
import { lastInteraction, restrictionReasons, type Recommendation } from "../services/recommendations";
import { opportunityFollowUp } from "../services/pipeline-studio";
import { ContextTip } from "../components/context-tip";
export function Review() {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    { date } = useFormat(),
    [params, setParams] = useSearchParams();
  const requestedView = params.get("view") || "For You";
  const requestedSort = params.get("sort") || "urgency";
  const [view, setView] = useState(
      [
        "For You",
        "Overdue",
        "Reconnect",
        "Opportunities",
        "Paused",
        "Snoozed",
      ].includes(requestedView)
        ? requestedView
        : "For You",
    ),
    [sort, setSort] = useState(
      ["urgency", "priority", "oldest", "changed"].includes(requestedSort)
        ? requestedSort
        : "urgency",
    ),
    [editor, setEditor] = useState<Editor | null>(null),
    [snooze, setSnooze] = useState<Recommendation | null>(null),
    [days, setDays] = useState(String(p.settings.intelligence.snoozeDays)),
    [limit, setLimit] = useState(20);
  useEffect(() => {
    const next = new URLSearchParams();
    if (view !== "For You") next.set("view", view);
    if (sort !== "urgency") next.set("sort", sort);
    if (next.toString() !== params.toString())
      setParams(next, { replace: true });
  }, [view, sort, params, setParams]);
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
  const available = p.intelligence.all.filter((r) => !r.blocked && !r.action);
  const overview = [
    { view: "Overdue", title: "Commitments", caption: "Overdue follow-up reviews", count: available.filter((r) => r.category === "Overdue follow-up").length },
    { view: "Reconnect", title: "Relationships", caption: "People to review", count: available.filter((r) => !!r.contactId && r.category !== "Overdue follow-up").length },
    { view: "Opportunities", title: "Opportunities", caption: "Opportunity reviews", count: available.filter((r) => !!r.opportunityId).length },
  ];
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
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">{__pulseText("A LITTLE INTENTION, EVERY DAY")}</p>
          <h1>
            {__pulseText("Relationships to review")}<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            {__pulseText("Who needs attention, why, and a thoughtful next step. Based on your saved records.")}</p>
        </div>
        <Link className="button secondary" to="/lists">
          {__pulseText("Smart Lists")}</Link>
      </div>
      <ContextTip title="A thoughtful place to begin">Each review explains the saved evidence behind it. Open the record, snooze the suggestion, or add it to Focus; nothing is sent automatically.</ContextTip>
      <section className="review-inbox-intro" aria-label={__pulseText("Review overview")}>
        <div><p className="eyebrow">{__pulseText("YOUR RELATIONSHIP INBOX")}</p><h2>{__pulseText("A little context goes a long way.")}</h2><p>{__pulseText("Review the evidence, decide what matters, and choose your next step. Counts are reviews; a record may appear more than once.")}</p></div>
        <div className="review-inbox-stats">{overview.map((item) => <button key={item.view} aria-pressed={view === item.view} onClick={() => {setView(item.view);setLimit(20);}}><strong>{item.count.toString().padStart(2,"0")}</strong><span>{__pulseText(item.title)}</span><small>{__pulseText(item.caption)}</small><span aria-hidden="true">↗</span></button>)}</div>
      </section>
      <div className="review-toolbar">
        <div className="review-tabs" aria-label={__pulseText("Review categories")}>
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
              {__pulseText(v)}
            </button>
          ))}
        </div>
        <label className="field">
          <span>{__pulseText("Sort reviews")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="urgency">{__pulseText("Highest urgency")}</option>
            <option value="priority">{__pulseText("Contact priority")}</option>
            <option value="oldest">{__pulseText("Oldest outstanding action")}</option>
            <option value="changed">{__pulseText("Recently changed")}</option>
          </select>
        </label>
      </div>
      <Link className="button secondary" to="/focus">
        {__pulseText("My Focus")}</Link>
      <p className="review-queue-label">
        {rows.length} {view.toLowerCase()} {" " + __pulseText("reviews · Snooze defers a suggestion. Dismiss hides unchanged evidence. Neither changes a task, availability or permission.")}</p>
      <div className="review-grid">
        {rows.slice(0, limit).map((r) => {
          const c = p.contacts.find((c) => c.id === r.contactId),
            o = p.opportunities.find((o) => o.id === r.opportunityId),
            org = p.organizations.find((org) => org.id === (c?.organizationId || o?.organizationId)),
            task = p.tasks.find((task) => task.id === r.taskId),
            last = c ? lastInteraction(c.id, p.interactions) : undefined,
            restricted = c ? restrictionReasons(c,p.permissions,p.restrictions).length > 0 : false,
            related = o ? opportunityFollowUp(o,p.tasks,p.interactions) : null,
            sharedReview = related ? available.find((item) => item.taskId === related.task.id) : undefined;
          return (
            <article className="surface review-card" key={r.key}>
              <div className="review-identity">
                <Avatar
                  name={c?.name || o?.title || "Opportunity"}
                  mediaId={c?.avatar || org?.avatar}
                  company={!c}
                />
                <div>
                  <h2>{c?.name || o?.title}</h2>
                  <p className="muted">
                    {org?.name ||
                      (c
                        ? __pulseText("Independent")
                        : p.pipelineStages.find((s) => s.id === o?.stageId)
                            ?.name)}
                    {c ? ` · ${c.stage} · ${c.priority}` : ""}
                  </p>
                </div>
              </div>
              <Badge
                tone={r.blocked ? "red" : r.rank === 0 ? "amber" : "purple"}
              >
                {r.category}
              </Badge>
              <div className="review-evidence">
                <span className="eyebrow">{__pulseText("WHY NOW")}</span>
                <p className="review-reason">{r.reason}</p>
                {task && <p className="review-task-context"><strong>{__pulseText("Follow-up:")}</strong> {task.title} · {date(task.dueAt)}</p>}
                {last && <p className="review-task-context">{__pulseText("Last recorded conversation:")} {date(last)}</p>}
                {sharedReview && related && <p className="review-task-context">{__pulseText("Related to the same follow-up also shown in the relationship queue:")} {related.task.title}.</p>}
                {restricted && <p className="restriction-note">{__pulseText("Outreach restricted. Review the person’s profile before contacting them.")}</p>}
              </div>
              {r.action?.until && (
                <p className="muted">
                  {__pulseText("Snoozed until")}{" "}
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
                      state={{
                        reviewReturn:
                          "/review" +
                          (params.size ? "?" + params.toString() : ""),
                      }}
                    >
                      {__pulseText("Open profile")}</Link>
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
                            ? __pulseText("Review follow-up")
                            : __pulseText("Schedule follow-up")}
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
                    {__pulseText("Review opportunity")}</button>
                )}
              </div>
              <details className="review-secondary">
                <summary>{__pulseText("More review actions")}</summary>
                <div className="record-actions">
                  {c && <FocusButton type="contact" id={c.id} />}
                  {o && <FocusButton type="opportunity" id={o.id} />}
                  {c && !r.blocked && (
                    <button
                      className="button ghost"
                      onClick={() =>
                        setEditor({ kind: "interaction", contact: c })
                      }
                    >
                      {__pulseText("Log interaction")}</button>
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
                        {__pulseText("Unsnooze")}</button>
                    ) : (
                      <>
                        <button
                          className="button ghost"
                          onClick={() => {
                            setSnooze(r);
                            setDays(String(p.settings.intelligence.snoozeDays));
                          }}
                        >
                          {__pulseText("Snooze")}</button>
                        <button
                          className="button ghost"
                          onClick={() => dismiss(r)}
                        >
                          {__pulseText("Dismiss")}</button>
                      </>
                    ))}
                </div>
              </details>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title={__pulseText("Room to breathe")}
          body={__pulseText("No reviews match this view. You may be caught up, have deferred suggestions, or have recommendations disabled in Settings.")}
        />
      )}
      {rows.length > limit && (
        <button
          className="button secondary"
          onClick={() => setLimit(limit + 20)}
        >
          {__pulseText("Show more reviews")}</button>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {snooze && (
        <RecordForm
          title={__pulseText("Snooze recommendation")}
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
            {__pulseText("This defers only this recommendation. The underlying task and communication restrictions remain unchanged. Dates use device time.")}</p>
          <Field label={__pulseText("Snooze for")} wide>
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="1">{__pulseText("Tomorrow")}</option>
              <option value="3">{__pulseText("In 3 days")}</option>
              <option value="7">{__pulseText("Next week")}</option>
              {![1, 3, 7].includes(p.settings.intelligence.snoozeDays) && (
                <option value={p.settings.intelligence.snoozeDays}>
                  {__pulseText("Default ·") + " "}{p.settings.intelligence.snoozeDays} {" " + __pulseText("days")}</option>
              )}
              <option value="custom">{__pulseText("Custom date")}</option>
            </select>
          </Field>
          {days === "custom" && (
            <Field label={__pulseText("Snooze until")} wide>
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
