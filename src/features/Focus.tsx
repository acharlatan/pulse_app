import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useRef, useState } from "react";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { calendarDay } from "../services/progress";
import { setFocus } from "../data/expansion-repository";
import { completeTask } from "../data/repository";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { lastInteraction, restrictionReasons, taskState } from "../services/recommendations";
import { ProgressSummary } from "../components/progress";
import type { FocusItem } from "../data/expansion-models";
import { ContextTip } from "../components/context-tip";
export function Focus({ embedded = false }: { embedded?: boolean }) {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const p = usePulse(),
    day = calendarDay(Date.now(), p.settings.timezone);
  const { date, money } = useFormat();
  const [editor, setEditor] = useState<Editor | null>(null);
  const picker = useRef<HTMLDetailsElement>(null);
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
    <div className={embedded ? "focus-page focus-embedded" : "page focus-page"}>
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">{__pulseText("CHOSEN BY YOU")}</p>
          <h1>
            {t("focus")}<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            {__pulseText("Keep relationships close. Choose what to move forward today.")}</p>
        </div>
      </div>
      <ContextTip title="Make space for what matters" >Pin people, companies, follow-ups or opportunities to save them for later. Choose a few for today; completing a follow-up is always your choice.</ContextTip>
      <div className="focus-day-brief">
        <span className="eyebrow">{__pulseText("TODAY · CHOSEN BY YOU")}</span>
        <strong>
          {p.focusItems.filter((f) => f.today === day).length}
          <small>{__pulseText("selected")}</small>
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
          {__pulseText("completed follow-ups in today’s selections. You choose what belongs here.")}</p>
        <button className="button focus-brief-button" onClick={() => { if (picker.current) { picker.current.open = true; picker.current.scrollIntoView({block:"center", behavior:p.settings.reducedMotion ? "auto" : "smooth"}); } }}><Plus size={16}/>{__pulseText("Add a priority")}</button>
      </div>
      {p.workspace === "demo" &&
        p.focusItems.length === 0 &&
        (p.contacts.some((item) => item.id === "contact-0") ||
          p.tasks.some((item) => item.id === "task-0") ||
          p.opportunities.length > 0) && (
          <aside className="surface demo-focus-examples">
            <div>
              <strong>{__pulseText("Example priorities")}</strong>
              <p>
                {__pulseText("Preview how your focus can look. These fictional examples are not yet pinned.")}</p>
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
                      <small>{__pulseText("Example relationship")}</small>
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
                      <small>{__pulseText("Example follow-up")}</small>
                    </span>
                  </div>
                )}
                {p.opportunities[0] && (
                  <div>
                    <span className="demo-focus-symbol">↗</span>
                    <span>
                      <strong>{p.opportunities[0].title}</strong>
                      <small>{__pulseText("Example opportunity")}</small>
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
              {__pulseText("Add example priorities")}</button>
          </aside>
        )}
      <details ref={picker} className="surface focus-picker">
        <summary>{__pulseText("Add a priority")}</summary>
        <div className="form-grid">
          <label className="field">
            <span>{__pulseText("Record type")}</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as typeof type);
                setId("");
              }}
            >
              <option value="contact">{__pulseText("Person")}</option>
              <option value="organization">{__pulseText("Company")}</option>
              <option value="opportunity">{__pulseText("Opportunity")}</option>
              <option value="task">{__pulseText("Follow-up")}</option>
            </select>
          </label>
          <label className="field">
            <span>{__pulseText("Search records")}</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="field">
            <span>{__pulseText("Record")}</span>
            <select
              aria-label={__pulseText("Focus record")}
              value={id}
              onChange={(e) => setId(e.target.value)}
            >
              <option value="">{__pulseText("Choose a record")}</option>
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
            <small>{__pulseText("Search to narrow the first 100 matches.")}</small>
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
            {__pulseText("Pin record")}</button>
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
            {__pulseText("Add to today")}</button>
        </div>
        <p className="muted">
          {__pulseText("Up to 100 pins and 20 daily priorities. Pins stay until removed; daily selections remain on their chosen date. Removing a priority does not reschedule its task.")}</p>
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
            <div className="focus-collection-heading"><div><p className="eyebrow">{section === "Today" ? __pulseText("YOUR CHOSEN WORK") : __pulseText("SAVED FOR LATER")}</p><h2>{__pulseText(section)}</h2></div><span>{items.length}</span></div>
            {section === "Today" && <p className="focus-collection-description">{__pulseText("Your selected priorities for today. Pinned records stay saved until you remove them.")}</p>}
            {!items.length && (
              <Empty
                title={__pulseText("Give today a little direction.")}
                body={__pulseText("Open Add a priority to choose a person, company, opportunity or follow-up. Your other pins stay below until you select them for today.")}
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
                              ? __pulseText("Value not set")
                              : money(o.value, o.currency)}
                          </strong>
                          <Badge tone="purple">
                            {p.pipelineStages.find((s) => s.id === o.stageId)
                              ?.name || __pulseText("Stage")}{" "}
                            · {o.status}
                          </Badge>
                          {p.organizations.find((org) => org.id === o.organizationId)?.name && <span>{p.organizations.find((org) => org.id === o.organizationId)?.name}</span>}
                          {p.intelligence.opportunities.find((i) => i.opportunityId === o.id)?.flags.length ? <span className="focus-context-evidence">{p.intelligence.opportunities.find((i) => i.opportunityId === o.id)?.reason}</span> : null}
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
                            {__pulseText("Edit task")}</button>
                          <span className="focus-context-evidence">{[p.contacts.find((c) => c.id === t.contactId)?.name, p.organizations.find((org) => org.id === t.organizationId)?.name].filter(Boolean).join(" · ") || __pulseText("No person or company linked")}{t.description ? ` · ${t.description.length > 110 ? `${t.description.slice(0,110)}…` : t.description}` : ""}</span>
                        </p>
                      );
                    })()}
                  {f.entityType === "contact" && (() => { const c = p.contacts.find((item) => item.id === f.recordId)!; const last = lastInteraction(c.id, p.interactions); const org = p.organizations.find((item) => item.id === c.organizationId); const restricted = restrictionReasons(c,p.permissions,p.restrictions).length > 0; return <p className="focus-context-evidence">{[c.role, org?.name].filter(Boolean).join(" · ")}{(c.role || org) ? " · " : ""}{last ? `${__pulseText("Last conversation")} ${date(last)}` : __pulseText("No conversation recorded")}{restricted ? ` · ${__pulseText("Outreach restricted")}` : ""}</p>; })()}
                  {f.entityType === "organization" && (() => { const count = p.contacts.filter((c) => c.organizationId === f.recordId).length; return <p className="focus-context-evidence">{count} {__pulseText("saved people at this company")}</p>; })()}
                  <p className="muted">
                    {__pulseText(f.entityType === "contact" ? "Person" : f.entityType === "organization" ? "Company" : f.entityType === "task" ? "Follow-up" : "Opportunity")} {" " + __pulseText("· Personally pinned")}{" "}
                    {f.today === day
                      ? __pulseText("· Selected today")
                      : f.today
                        ? `· Selected ${f.today}`
                        : ""}
                  </p>
                  {f.entityType === "contact" ||
                  f.entityType === "organization" ? (
                    <Link
                      to={`/network/${f.entityType === "contact" ? "people" : "companies"}/${f.recordId}`}
                    >
                      {__pulseText("Open relationship")}</Link>
                  ) : (
                    <Link
                      to={
                        f.entityType === "task"
                          ? `/activity?filter=${p.tasks.find((t) => t.id === f.recordId)?.completedAt ? "complete" : "open"}`
                          : "/pipeline"
                      }
                    >
                      {__pulseText("Open") + " "}{f.entityType}
                    </Link>
                  )}
                </div>
                <div className="form-actions">
                  {f.entityType === "opportunity" && <button className="button secondary" onClick={() => setEditor({kind:"opportunity",record:p.opportunities.find((o)=>o.id===f.recordId)})}>{__pulseText("Review opportunity")} <ArrowUpRight size={15}/></button>}
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
                    {f.today === day ? __pulseText("Remove from today") : __pulseText("Choose today")}
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
                    {__pulseText("Unpin")}</button>
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
                        {__pulseText("Complete task")}</button>
                    )}
                </div>
                {f.today === day && <details className="focus-move-date"><summary><Sparkles size={14}/>{__pulseText("Choose another day")}</summary><form onSubmit={(e) => {e.preventDefault(); const chosen = String(new FormData(e.currentTarget).get("focusDate") || ""); if (chosen) void p.run(() => setFocus(p.db, f.entityType, f.recordId, "today", chosen), "Focus updated");}}><label><span>{__pulseText("Focus date")}</span><input name="focusDate" type="date" min={day} required/></label><button className="button secondary">{__pulseText("Save date")}</button></form><small>{__pulseText("This changes your focus date, not the follow-up due date.")}</small></details>}
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
