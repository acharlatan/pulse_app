import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus } from "lucide-react";
import { usePulse } from "../app/context";
import { Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { TaskRow } from "../components/relationship";
import { overdue } from "../services/recommendations";
export function Activity() {
  const p = usePulse();
  const { date } = useFormat();
  const [tab, setTab] = useState("tasks");
  const [filter, setFilter] = useState("open");
  const [editor, setEditor] = useState<Editor | null>(null);
  const tasks = p.tasks.filter(
    (t) =>
      filter === "all" ||
      (filter === "complete"
        ? !!t.completedAt
        : filter === "overdue"
          ? overdue(t)
          : !t.completedAt),
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
            className={tab === "tasks" ? "selected" : ""}
            onClick={() => setTab("tasks")}
          >
            Follow-ups{" "}
            <span>{p.tasks.filter((t) => !t.completedAt).length}</span>
          </button>
          <button
            className={tab === "timeline" ? "selected" : ""}
            onClick={() => setTab("timeline")}
          >
            Activity timeline
          </button>
        </div>
        {tab === "tasks" && (
          <select
            aria-label="Filter tasks"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="open">Open tasks</option>
            <option value="overdue">Overdue</option>
            <option value="complete">Completed</option>
            <option value="all">All tasks</option>
          </select>
        )}
      </div>
      <section className="surface activity-surface">
        {tab === "tasks"
          ? tasks.map((t) => <TaskRow key={t.id} task={t} onEdit={setEditor} />)
          : p.events.map((e) => (
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
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
