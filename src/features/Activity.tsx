import { useState } from "react";
import { ProgressDetails } from "../components/progress";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle, Plus } from "lucide-react";
import { usePulse } from "../app/context";
import { Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { TaskRow } from "../components/relationship";
import { priorities } from "../data/models";
import { taskState } from "../services/recommendations";
export function Activity() {
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
  const [filter, setFilter] = useState(() =>
    ["all", "complete", "overdue", "today", "upcoming"].includes(
      params.get("filter") || "",
    )
      ? params.get("filter")!
      : "open",
  );
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
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ONE THOUGHTFUL STEP AT A TIME</p>
          <h1>
            Good things in motion<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Your next steps and the story so far, all in one place.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => setEditor({ kind: "task" })}
        >
          <Plus size={17} />
          Plan a follow-up
        </button>
      </div>
      <div className="directory-toolbar">
        <div className="tabs">
          <button
            aria-pressed={tab === "tasks"}
            className={tab === "tasks" ? "selected" : ""}
            onClick={() => setTab("tasks")}
          >
            Follow-ups{" "}
            <span>{p.tasks.filter((t) => !t.completedAt).length}</span>
          </button>
          <button
            aria-pressed={tab === "timeline"}
            className={tab === "timeline" ? "selected" : ""}
            onClick={() => setTab("timeline")}
          >
            Activity timeline
          </button>
          <button
            aria-pressed={tab === "progress"}
            className={tab === "progress" ? "selected" : ""}
            onClick={() => setTab("progress")}
          >
            Your progress
          </button>
        </div>
        {tab === "tasks" && (
          <select
            aria-label="Filter tasks"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="open">Open tasks</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="complete">Completed</option>
            <option value="all">All tasks</option>
          </select>
        )}
      </div>
      {tab === "tasks" && (
        <label className="field">
          <span>Sort tasks</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="updated">Recently updated</option>
          </select>
        </label>
      )}
      {tab === "progress" ? (
        <ProgressDetails onEdit={setEditor} />
      ) : (
        <section className="surface activity-surface">
          {tab === "tasks"
            ? tasks
                .slice(0, limit)
                .map((t) => <TaskRow key={t.id} task={t} onEdit={setEditor} />)
            : p.events.slice(0, limit).map((e) => (
                <div className="timeline-row" key={e.id}>
                  <span className="timeline-dot">
                    <MessageCircle size={17} />
                  </span>
                  <div>
                    {e.contactId ? (
                      <Link to={`/network/people/${e.contactId}`}>
                        {e.summary}
                      </Link>
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
          {!(tab === "tasks" ? tasks.length : p.events.length) && (
            <Empty
              title={
                tab === "tasks"
                  ? "A little breathing room"
                  : "Your story starts here"
              }
              body={
                tab === "tasks"
                  ? "No tasks in this view. Plan a follow-up when you are ready."
                  : "Add a person or log a conversation to start your timeline."
              }
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
            Show more activity
          </button>
        )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
