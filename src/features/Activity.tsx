import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useState } from "react";
import { ProgressDetails } from "../components/progress";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle, Plus, ArrowUpRight, ArrowRight } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { TaskRow } from "../components/relationship";
import { priorities } from "../data/models";
import { taskState } from "../services/recommendations";
export function Activity() {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const p = usePulse();
  const { date } = useFormat();
  const [params, setParams] = useSearchParams();
  const requested = params.get("view");
  const tab =
    requested === "progress" || requested === "timeline" ? requested : "tasks";
  const setTab = (value: string) =>
    setParams(value === "tasks" ? {} : { view: value });
  const [sort, setSort] = useState("due");
  const [limit, setLimit] = useState(40);
  const filter = ["all", "complete", "overdue", "today", "upcoming"].includes(
    params.get("filter") || "",
  )
    ? params.get("filter")!
    : "open";
  const setFilter = (value: string) => {
    const next = new URLSearchParams(params);
    next.delete("view");
    if (value === "open") next.delete("filter");
    else next.set("filter", value);
    setParams(next);
  };
  const [editor, setEditor] = useState<Editor | null>(null);
  const tasks = p.tasks
    .filter(
      (t) =>
        filter === "all" ||
        (filter === "complete"
          ? !!t.completedAt
          : filter === "overdue"
            ? taskState(t, p.settings.timezone) === "Overdue"
            : filter === "today"
              ? taskState(t, p.settings.timezone) === "Due today"
              : filter === "upcoming"
                ? taskState(t, p.settings.timezone) === "Upcoming"
                : !t.completedAt),
    )
    .sort(
      (a, b) =>
        (sort === "priority"
          ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
          : sort === "updated"
            ? b.updatedAt.localeCompare(a.updatedAt)
            : a.dueAt.localeCompare(b.dueAt)) || a.id.localeCompare(b.id),
    );
  return (
    <div className="page activity-page">
      <header className="page-heading editorial-masthead work-masthead">
        <div>
          <p className="eyebrow">
            {date(new Date().toISOString(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            {__pulseText("· YOUR WORKING DAY")}</p>
          <h1>
            {tab === "tasks" ? __pulseText("Follow-ups") : t("activityTitle")}<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            {tab === "tasks" ? __pulseText("Your commitments, the people behind them, and the next step in one place.") : t("activityIntro")}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => setEditor({ kind: "task" })}
        >
          <Plus size={17} />
          {t("planFollowup")}
        </button>
      </header>
      <div className="activity-intro-strip"><span>✳</span><div><strong>{__pulseText("KEEP THE PROMISES THAT MATTER")}</strong><p>{__pulseText("Choose a time horizon to see your saved follow-ups. Completing a task never sends a message.")}</p></div><Link to="/focus">{__pulseText("Go to My Focus")} <ArrowUpRight size={16}/></Link></div>
      <nav className="activity-ledger" aria-label={__pulseText("Follow-up overview")}>
        {[
          ["overdue", "Overdue"],
          ["today", "Due today"],
          ["upcoming", "Upcoming"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === "tasks" && filter === value}
            onClick={() => {
              setFilter(value);
              setLimit(40);
            }}
          >
            <strong>
              {
                p.tasks.filter(
                  (t) => taskState(t, p.settings.timezone) === label,
                ).length
              }
            </strong>
            {__pulseText(label)}
          </button>
        ))}
      </nav>
      <div className="directory-toolbar">
        <div className="tabs">
          <button
            aria-pressed={tab === "tasks"}
            className={tab === "tasks" ? "selected" : ""}
            onClick={() => setTab("tasks")}
          >
            {__pulseText("Follow-ups")}{" "}
            <span>{p.tasks.filter((t) => !t.completedAt).length}</span>
          </button>
          <button
            aria-pressed={tab === "timeline"}
            className={tab === "timeline" ? "selected" : ""}
            onClick={() => setTab("timeline")}
          >
            {__pulseText("Activity timeline")}</button>
          <button
            aria-pressed={tab === "progress"}
            className={tab === "progress" ? "selected" : ""}
            onClick={() => setTab("progress")}
          >
            {__pulseText("Your progress")}</button>
        </div>
        {tab === "tasks" && (
          <div className="agenda-controls">
            <label className="field">
              <span>{__pulseText("Show")}</span>
              <select
                aria-label={__pulseText("Filter tasks")}
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setLimit(40);
                }}
              >
                <option value="open">{__pulseText("Open tasks")}</option>
                <option value="today">{__pulseText("Today")}</option>
                <option value="upcoming">{__pulseText("Upcoming")}</option>
                <option value="overdue">{__pulseText("Overdue")}</option>
                <option value="complete">{__pulseText("Completed")}</option>
                <option value="all">{__pulseText("All tasks")}</option>
              </select>
            </label>
            <label className="field">
              <span>{__pulseText("Sort tasks")}</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setLimit(40);
                }}
              >
                <option value="due">{__pulseText("Due date")}</option>
                <option value="priority">{__pulseText("Priority")}</option>
                <option value="updated">{__pulseText("Recently updated")}</option>
              </select>
            </label>
          </div>
        )}
      </div>
      {tab === "progress" ? (
        <ProgressDetails onEdit={setEditor} />
      ) : tab === "tasks" ? (
        <div className="agenda-workspace">
          <section
            className="activity-surface agenda-groups"
            aria-label={__pulseText("Follow-up agenda")}
          >
            {(sort === "due"
              ? ["Overdue", "Due today", "Upcoming", "Completed"]
              : ["Sorted follow-ups"]
            ).map((group) => {
              const matching = tasks.filter(
                (t) =>
                  sort !== "due" || taskState(t, p.settings.timezone) === group,
              );
              const visible = tasks
                .slice(0, limit)
                .filter(
                  (t) =>
                    sort !== "due" ||
                    taskState(t, p.settings.timezone) === group,
                );
              if (!visible.length) return null;
              return (
                <section
                  className={`agenda-group group-${group.toLowerCase().replaceAll(" ", "-")}`}
                  key={group}
                >
                  <header className="agenda-group-heading">
                    <span className="agenda-group-marker" aria-hidden="true" />
                    <h2>{group === "Due today" ? __pulseText("Today") : group}</h2>
                    <span>{matching.length}</span>
                    <small>
                      {group === "Overdue"
                        ? __pulseText("A little attention goes a long way")
                        : group === "Due today"
                          ? __pulseText("Room for today’s commitments")
                          : group === "Upcoming"
                            ? __pulseText("A look at what’s ahead")
                            : group === "Completed"
                              ? __pulseText("Promises you’ve kept")
                              : sort === "priority"
                                ? __pulseText("Highest priority first")
                                : __pulseText("Most recently updated first")}
                    </small>
                  </header>
                  {visible.map((t) => (
                    <TaskRow key={t.id} task={t} onEdit={setEditor} compact />
                  ))}
                </section>
              );
            })}
            {!tasks.length && (
              <Empty
                title={__pulseText("A little breathing room")}
                body={__pulseText("No tasks in this view. Plan a follow-up when you are ready.")}
                action={
                  <button
                    className="button secondary"
                    onClick={() => setEditor({ kind: "task" })}
                  >
                    {__pulseText("Plan a next step")}</button>
                }
              />
            )}
          </section>
          <aside className="agenda-side">
            <div className="agenda-day-stamp">
              <span className="eyebrow">{__pulseText("KEEP THE THREAD")}</span>
              <h2>
                {__pulseText("Conversations")}<br />
                {__pulseText("become next steps")}<span className="accent">.</span>
              </h2>
              <p>{__pulseText("Remember the conversation behind the commitment.")}</p>
            </div>
            <details className="agenda-conversations" open>
              <summary>{__pulseText("Recent conversations")}</summary>
              {p.interactions
                .filter(
                  (i) =>
                    i.type !== "Note" && Date.parse(i.occurredAt) <= Date.now(),
                )
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                .slice(0, 3)
                .map((i) => {
                  const c = p.contacts.find((c) => c.id === i.contactId),
                    org = p.organizations.find(
                      (o) => o.id === i.organizationId,
                    );
                  return (
                    <article key={i.id}>
                      <div className="agenda-conversation-person">
                        {(c || org) && (
                          <Avatar
                            name={(c || org)!.name}
                            mediaId={(c || org)!.avatar}
                          />
                        )}
                        <span>
                          {c?.name || org?.name || __pulseText("Saved conversation")}
                          <small>
                            {i.type} · {date(i.occurredAt)}
                          </small>
                        </span>
                      </div>
                      <p>
                        {i.summary.slice(0, 140)}
                        {i.summary.length > 140 ? "…" : ""}
                      </p>
                      {(c || org) && (
                        <Link
                          className="text-link"
                          to={`/network/${c ? "people" : "companies"}/${(c || org)!.id}`}
                        >
                          {__pulseText("Continue the story") + " "}<ArrowUpRight size={15} />
                        </Link>
                      )}
                    </article>
                  );
                })}
              {!p.interactions.some(
                (i) =>
                  i.type !== "Note" && Date.parse(i.occurredAt) <= Date.now(),
              ) && (
                <p className="muted">
                  {__pulseText("Your next logged conversation will appear here.")}</p>
              )}
            </details>
            <Link className="agenda-focus-link" to="/focus">
              {__pulseText("Your chosen priorities") + " "}<ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      ) : (
        <section className="surface activity-surface work-event-stream">
          <h2>{__pulseText("The story so far")}</h2>
          {p.events.slice(0, limit).map((e) => (
            <div className="timeline-row" key={e.id}>
              <span className="timeline-dot">
                <MessageCircle size={17} />
              </span>
              <div>
                {e.contactId ? (
                  <Link to={`/network/people/${e.contactId}`}>{e.summary}</Link>
                ) : e.organizationId ? (
                  <Link to={`/network/companies/${e.organizationId}`}>
                    {e.summary}
                  </Link>
                ) : (
                  <strong>{e.summary}</strong>
                )}
                <small>
                  {date(e.createdAt, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            </div>
          ))}
          {!p.events.length && (
            <Empty
              title={__pulseText("Your story starts here")}
              body={__pulseText("Add a person or log a conversation to start your timeline.")}
            />
          )}
        </section>
      )}
      {tab !== "progress" &&
        (tab === "tasks" ? tasks.length : p.events.length) > limit && (
          <button
            className="button secondary"
            onClick={() => setLimit(limit + 40)}
          >
            {__pulseText("Show more activity")}</button>
        )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
