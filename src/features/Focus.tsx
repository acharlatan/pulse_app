import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { calendarDay } from "../services/progress";
import { setFocus } from "../data/expansion-repository";
import { completeTask } from "../data/repository";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { taskState } from "../services/recommendations";
import { ProgressSummary } from "../components/progress";
import type { FocusItem } from "../data/expansion-models";
export function Focus() {
  const p = usePulse(),
    day = calendarDay(Date.now(), p.settings.timezone);
  const { date, money } = useFormat();
  const [editor, setEditor] = useState<Editor | null>(null);
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
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">CHOSEN BY YOU</p>
          <h1>
            My Focus<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            Keep relationships close. Choose what to move forward today.
          </p>
        </div>
      </div>
      <div className="focus-day-brief">
        <span className="eyebrow">TODAY · CHOSEN BY YOU</span>
        <strong>
          {p.focusItems.filter((f) => f.today === day).length}
          <small>selected</small>
        </strong>
        <p>
          {
            p.focusItems.filter(
              (f) =>
                f.today === day &&
                f.entityType === "task" &&
                p.tasks.some((t) => t.id === f.recordId && t.completedAt),
            ).length
          }{" "}
          completed follow-ups in today’s selections. Choose a manageable next
          step; there is no automatic prioritization.
        </p>
      </div>
      {p.workspace === "demo" &&
        p.focusItems.length === 0 &&
        (p.contacts.some((item) => item.id === "contact-0") ||
          p.tasks.some((item) => item.id === "task-0") ||
          p.opportunities.length > 0) && (
          <aside className="surface demo-focus-examples">
            <div>
              <strong>Example priorities</strong>
              <p>
                Preview how your focus can look. These fictional examples are
                not yet pinned.
              </p>
              <div className="demo-focus-preview">
                {p.contacts.find((item) => item.id === "contact-0") && (
                  <div>
                    <Avatar
                      name={
                        p.contacts.find((item) => item.id === "contact-0")!.name
                      }
                      mediaId={
                        p.contacts.find((item) => item.id === "contact-0")!
                          .avatar
                      }
                    />
                    <span>
                      <strong>
                        {
                          p.contacts.find((item) => item.id === "contact-0")!
                            .name
                        }
                      </strong>
                      <small>Example relationship</small>
                    </span>
                  </div>
                )}
                {p.tasks.find((item) => item.id === "task-0") && (
                  <div>
                    <span className="demo-focus-symbol">✓</span>
                    <span>
                      <strong>
                        {p.tasks.find((item) => item.id === "task-0")!.title}
                      </strong>
                      <small>Example follow-up</small>
                    </span>
                  </div>
                )}
                {p.opportunities[0] && (
                  <div>
                    <span className="demo-focus-symbol">↗</span>
                    <span>
                      <strong>{p.opportunities[0].title}</strong>
                      <small>Example opportunity</small>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              className="button primary"
              onClick={() =>
                void p.run(
                  () =>
                    p.db.transaction("rw", p.db.tables, async () => {
                      const contact = p.contacts.find(
                        (item) => item.id === "contact-0",
                      );
                      const task = p.tasks.find((item) => item.id === "task-0");
                      const opportunity = p.opportunities[0];
                      if (contact)
                        await setFocus(
                          p.db,
                          "contact",
                          contact.id,
                          "today",
                          day,
                        );
                      if (task) await setFocus(p.db, "task", task.id, "pin");
                      if (opportunity)
                        await setFocus(
                          p.db,
                          "opportunity",
                          opportunity.id,
                          "pin",
                        );
                    }),
                  "Demo priorities added",
                )
              }
            >
              Add example priorities
            </button>
          </aside>
        )}
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
              : f.today === day
                ? false
                : section === "Pinned relationships"
                  ? ["contact", "organization"].includes(f.entityType)
                  : section === "Opportunities in focus"
                    ? f.entityType === "opportunity"
                    : f.entityType === "task" && !done;
        });
        if (!items.length && section !== "Today") return null;
        return (
          <section
            className={`surface focus-collection ${section === "Today" ? "focus-today" : ""}`}
            key={section}
          >
            <h2>{section}</h2>
            {!items.length && (
              <Empty
                title="Give today a little direction."
                body="Open Add a priority to choose a person, company, opportunity or follow-up. Your other pins stay below until you select them for today."
              />
            )}
            {items.slice(0, 100).map((f) => (
              <article className="focus-row" key={f.id}>
                <div>
                  <div className="focus-record-identity">
                    {(f.entityType === "contact" ||
                      f.entityType === "organization") && (
                      <Avatar
                        name={name(label(f)!)}
                        mediaId={(label(f) as { avatar?: string })?.avatar}
                        company={f.entityType === "organization"}
                        size="large"
                      />
                    )}
                    <strong>{name(label(f)!)}</strong>
                  </div>
                  {f.entityType === "opportunity" &&
                    (() => {
                      const o = p.opportunities.find(
                        (o) => o.id === f.recordId,
                      )!;
                      return (
                        <p className="focus-deal-context">
                          <strong>
                            {o.value === null
                              ? "Value not set"
                              : money(o.value, o.currency)}
                          </strong>
                          <Badge tone="purple">
                            {p.pipelineStages.find((s) => s.id === o.stageId)
                              ?.name || "Stage"}{" "}
                            · {o.status}
                          </Badge>
                        </p>
                      );
                    })()}
                  {f.entityType === "task" &&
                    (() => {
                      const t = p.tasks.find((t) => t.id === f.recordId)!;
                      return (
                        <p className="focus-task-context">
                          {taskState(t, p.settings.timezone)} · {date(t.dueAt)}{" "}
                          <button
                            className="text-link"
                            onClick={() =>
                              setEditor({ kind: "task", record: t })
                            }
                          >
                            Edit task
                          </button>
                        </p>
                      );
                    })()}
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
                      to={
                        f.entityType === "task"
                          ? `/activity?filter=${p.tasks.find((t) => t.id === f.recordId)?.completedAt ? "complete" : "open"}`
                          : "/pipeline"
                      }
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
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {p.settings.focus.progress && p.settings.gamification && (
        <ProgressSummary />
      )}
    </div>
  );
}
