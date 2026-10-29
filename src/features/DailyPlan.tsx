import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Compass,
  CalendarDays,
  ListChecks,
  Target,
} from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, useFormat } from "../components/ui";
import type { Editor } from "../components/forms";
import type { FocusItem } from "../data/expansion-models";
import { setFocus } from "../data/expansion-repository";
import { completeTask } from "../data/repository";
import { restrictionReasons, taskState } from "../services/recommendations";
import { dailyPulse } from "../services/daily-pulse";
type Selection = { type: FocusItem["entityType"]; id: string };
export function DailyPlan({ onEdit }: { onEdit: (editor: Editor) => void }) {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const p = usePulse(),
    { date, money } = useFormat();
  const plan = dailyPulse(
    {
      ...p,
      queue: p.intelligence.queue,
      opportunityInsights: p.intelligence.opportunities,
    },
    p.settings.timezone,
  );
  const inspector = useRef<HTMLHeadingElement>(null);
  function inspect(next: Selection) {
    select(next);
    requestAnimationFrame(() => {
      inspector.current?.focus({ preventScroll: true });
      inspector.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    });
  }
  const [selection, select] = useState<Selection | null>(null),
    [busy, setBusy] = useState(false),
    [showAll, setShowAll] = useState(false);
  const defaultChoice = plan.remaining[0] || plan.chosen[0];
  const first = plan.attention[0] || plan.later[0];
  const active =
    selection ||
    (defaultChoice
      ? { type: defaultChoice.entityType, id: defaultChoice.recordId }
      : first
        ? { type: "task" as const, id: first.id }
        : plan.chosen[0]
          ? { type: plan.chosen[0].entityType, id: plan.chosen[0].recordId }
          : null);
  const task =
    active?.type === "task"
      ? p.tasks.find((t) => t.id === active.id)
      : undefined;
  const opportunity =
    active?.type === "opportunity"
      ? p.opportunities.find((o) => o.id === active.id)
      : undefined;
  const person = p.contacts.find(
    (c) => c.id === (active?.type === "contact" ? active.id : task?.contactId),
  );
  const company = p.organizations.find(
    (o) =>
      o.id ===
      (active?.type === "organization"
        ? active.id
        : task?.organizationId ||
          opportunity?.organizationId ||
          person?.organizationId),
  );
  const record =
    task ||
    opportunity ||
    (active?.type === "contact"
      ? person
      : active?.type === "organization"
        ? company
        : undefined);
  const title = record
    ? "title" in record
      ? record.title
      : record.name
    : "Make room for a good next step.";
  const pin =
    active &&
    p.focusItems.find(
      (f) => f.entityType === active.type && f.recordId === active.id,
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
  const label = (f: FocusItem) => {
    const rows =
      f.entityType === "task"
        ? p.tasks
        : f.entityType === "opportunity"
          ? p.opportunities
          : f.entityType === "contact"
            ? p.contacts
            : p.organizations;
    const r = rows.find((x) => x.id === f.recordId);
    return r ? ("title" in r ? r.title : r.name) : "Record removed";
  };
  async function choose(type: FocusItem["entityType"], id: string) {
    setBusy(true);
    const ok = await p.run(
      () => setFocus(p.db, type, id, "today", plan.day),
      "Chosen for today",
    );
    setBusy(false);
    if (ok) inspect({ type, id });
  }
  const suggestions = (
    <section
      className="daily-suggestions"
      aria-labelledby="daily-suggestions-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{__pulseText("A STARTING POINT, NOT A DEMAND")}</p>
          <h2 id="daily-suggestions-title">{__pulseText("Up to three places to look.")}</h2>
          <p>
            {__pulseText("Suggestions share Analytics’ evidence. You decide what belongs in today.")}</p>
        </div>
        <Link className="text-link" to="/analytics">
          {__pulseText("See the full picture") + " "}<ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="daily-suggestion-grid">
        {plan.suggestions.map((s, i) => (
          <article
            className="daily-suggestion"
            key={JSON.stringify([s.type, s.id])}
          >
            <div className="daily-suggestion-kicker">
              <span>0{i + 1}</span>
              <span>{s.lane}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.reason}</p>
            <div className="daily-suggestion-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void choose(s.type, s.id)}
              >
                {__pulseText("Choose today") + " "}<Target size={15} />
              </button>
              <button
                className="button ghost"
                onClick={() => inspect({ type: s.type, id: s.id })}
              >
                {__pulseText("Inspect") + " "}<ArrowRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!plan.suggestions.length && (
        <div className="daily-clear">
          <CheckCheck size={24} />
          <p>
            {__pulseText("No additional suggestions right now. Your chosen work is in your daily plan; your network is here when you need it.")}</p>
        </div>
      )}
      <details className="daily-explanation">
        <summary>{__pulseText("How are these suggested?")}</summary>
        <p>
          {__pulseText("One saved commitment, one eligible opportunity review and one eligible relationship review come first when available. Remaining spaces use the same evidence lanes. Already chosen records are excluded; fewer than three is fine. Relationship and opportunity reviews honor snoozes, dismissals and shared eligibility rules. A task is an administrative commitment to inspect, never permission to contact someone.")}</p>
        <Link className="text-link" to="/review">
          {__pulseText("Review all relationship signals") + " "}<ArrowUpRight size={15} />
        </Link>
      </details>
    </section>
  );
  const workspace = (
    <section className="daily-workspace" aria-label={__pulseText("Your daily plan")}>
      <section
        className="priority-feature daily-inspector"
        aria-label={__pulseText("Your next commitment")}
      >
        <div className="priority-kicker">
          <span className="pulse-tick" aria-hidden="true" />
          <p className="eyebrow">
            {selection ? __pulseText("YOUR SELECTED PRIORITY") : __pulseText("A PLACE TO BEGIN")}
          </p>
          {task && (
            <Badge
              tone={
                task.completedAt
                  ? "green"
                  : taskState(task, p.settings.timezone) === "Overdue"
                    ? "red"
                    : "purple"
              }
            >
              {taskState(task, p.settings.timezone)}
            </Badge>
          )}
        </div>
        <h2 ref={inspector} tabIndex={-1}>
          {title}
        </h2>
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
                {person?.role || __pulseText("Saved company")}
                {person?.role && company ? ` · ${company.name}` : ""}
              </small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        )}
        {task && (
          <p className="daily-record-meta">
            {__pulseText("Saved follow-up · Due") + " "}{date(task.dueAt)}
          </p>
        )}
        {opportunity && (
          <p className="daily-record-meta">
            {p.pipelineStages.find((s) => s.id === opportunity.stageId)?.name ||
              opportunity.status}{" "}
            ·{" "}
            {opportunity.value === null
              ? __pulseText("No value recorded")
              : money(opportunity.value, opportunity.currency)}
          </p>
        )}
        {conversation ? (
          <div className="priority-evidence">
            <span className="eyebrow">
              {__pulseText("LAST CONVERSATION ·") + " "}{date(conversation.occurredAt)}
            </span>
            <p>
              {conversation.summary.slice(0, 240)}
              {conversation.summary.length > 240 ? "…" : ""}
            </p>
          </div>
        ) : task?.description ? (
          <p className="priority-description">
            {task.description.slice(0, 240)}
            {task.description.length > 240 ? "…" : ""}
          </p>
        ) : person ? (
          <p className="priority-description">
            {__pulseText("Review the saved relationship, permissions and next step on this person’s profile.")}</p>
        ) : company ? (
          <p className="priority-description">
            {company.description.slice(0, 240) ||
              __pulseText("Explore this company’s saved people and work.")}
          </p>
        ) : !record ? (
          <p>
            {__pulseText("Choose a priority, explore your network or plan a follow-up. There is no required daily quota.")}</p>
        ) : null}
        {opportunity?.notes && (
          <p className="priority-description">
            {opportunity.notes.slice(0, 240)}
            {opportunity.notes.length > 240 ? "…" : ""}
          </p>
        )}
        {restrictions.length > 0 && (
          <p className="restriction-note">
            {__pulseText("Outreach restricted. Review availability and permissions on the profile; completing a task does not grant permission.")}</p>
        )}
        <div className="priority-actions">
          {task ? (
            <>
              <button
                className="button primary"
                onClick={() => onEdit({ kind: "task", record: task })}
              >
                {__pulseText("Open commitment") + " "}<ArrowRight size={17} />
              </button>
              <button
                className="button ghost"
                disabled={busy || !!task.completedAt}
                onClick={async () => {
                  setBusy(true);
                  select({ type: "task", id: task.id });
                  await p.run(
                    () => completeTask(p.db, task.id),
                    "Follow-up completed",
                  );
                  setBusy(false);
                }}
              >
                <Check size={17} />
                {task.completedAt ? __pulseText("Completed") : __pulseText("Mark complete")}
              </button>
            </>
          ) : opportunity ? (
            <button
              className="button primary"
              onClick={() =>
                onEdit({ kind: "opportunity", record: opportunity })
              }
            >
              {__pulseText("Review opportunity") + " "}<ArrowRight size={17} />
            </button>
          ) : person ? (
            <Link
              className="button primary"
              to={`/network/people/${person.id}`}
            >
              {__pulseText("Open profile") + " "}<ArrowRight size={17} />
            </Link>
          ) : company ? (
            <Link
              className="button primary"
              to={`/network/companies/${company.id}`}
            >
              {__pulseText("Open company") + " "}<ArrowRight size={17} />
            </Link>
          ) : (
            <Link className="button primary" to="/network">
              {__pulseText("Find a connection") + " "}<ArrowRight size={17} />
            </Link>
          )}
          {active && record && (
            <button
              className="button ghost"
              disabled={busy || pin?.today === plan.day || !!task?.completedAt}
              onClick={() => void choose(active.type, active.id)}
            >
              {pin?.today === plan.day ? __pulseText("Chosen for today") : __pulseText("Choose today")}
            </button>
          )}
        </div>
        {task?.completedAt && (
          <div className="daily-completion" role="status">
            <CheckCheck size={22} />
            <p>
              {__pulseText("This commitment is complete. Review what remains in your Today list, or choose another next step.")}</p>
          </div>
        )}
        <small className="priority-footnote">
          {__pulseText("Saved context, kept in place. Open a record to edit or reschedule, then return here.")}</small>
      </section>
      <div className="daily-chosen">
        {p.settings.focus.shortcuts ? (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{__pulseText("CHOSEN BY YOU")}</p>
                  <h2>{t("yourPriorities")}</h2>
              </div>
              <Link className="text-link" to="/focus">
                {__pulseText("My Focus") + " "}<ArrowUpRight size={16} />
              </Link>
            </div>
            <p className="muted">
              {__pulseText("Select a record to work here. Completion only applies to saved follow-ups.")}</p>
            {plan.chosen.length === 0 ? (
              <div className="daily-chosen-empty">
                <Target size={30} />
                <h3>{__pulseText("Give today a little direction.")}</h3>
                <p>
                  {__pulseText("Choose a suggestion, or select your own priorities in My Focus. Nothing is assigned automatically.")}</p>
                <Link className="button secondary" to="/focus">
                  {__pulseText("Choose your own priorities")}</Link>
              </div>
            ) : (
              <ol className="daily-chosen-list">
                {(showAll ? plan.chosen : plan.chosen.slice(0, 4)).map((f) => {
                  const done =
                    f.entityType === "task" &&
                    p.tasks.some((t) => t.id === f.recordId && t.completedAt);
                  return (
                    <li key={f.id}>
                      <button
                        className="daily-chosen-record"
                        aria-pressed={
                          active?.type === f.entityType &&
                          active.id === f.recordId
                        }
                        onClick={() =>
                          inspect({ type: f.entityType, id: f.recordId })
                        }
                      >
                        <span className="daily-chosen-icon" aria-hidden="true">
                          {done ? <Check size={18} /> : <Target size={18} />}
                        </span>
                        <span>
                          <strong>{label(f)}</strong>
                          <small>
                            {done
                              ? __pulseText("Completed follow-up")
                              : f.entityType === "task"
                                ? __pulseText("Follow-up")
                                : f.entityType === "contact"
                                  ? __pulseText("Person")
                                  : f.entityType === "organization"
                                    ? __pulseText("Company")
                                    : __pulseText("Opportunity")}
                          </small>
                        </span>
                        <ArrowRight size={15} />
                      </button>
                      <button
                        className="daily-remove"
                        disabled={busy}
                        aria-label={__pulseText("Remove from today: {0}", label(f))}
                        onClick={() =>
                          void p.run(
                            () =>
                              setFocus(
                                p.db,
                                f.entityType,
                                f.recordId,
                                "removeToday",
                              ),
                            "Removed from today; pin kept",
                          )
                        }
                      >
                        {__pulseText("Remove from today")}</button>
                    </li>
                  );
                })}
              </ol>
            )}
            {plan.chosen.length > 4 && (
              <button
                className="button ghost"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? __pulseText("Show fewer priorities")
                  : `Show all ${plan.chosen.length} priorities`}
              </button>
            )}
          </>
        ) : (
          <div className="section-heading">
            <h2>{__pulseText("Your schedule")}</h2>
            <Link className="text-link" to="/focus">
              {__pulseText("Open My Focus") + " "}<ArrowUpRight size={16} />
            </Link>
          </div>
        )}
        <details className="daily-later">
          <summary>
            {__pulseText("What can wait? ·") + " "}{plan.later.length} {" " + __pulseText("scheduled later")}</summary>
          <p>
            {__pulseText("These saved follow-ups are due after today in your workspace timezone. This is their schedule, not a judgment of importance.")}</p>
          {plan.later.slice(0, 3).map((t) => (
            <button
              className="daily-later-record"
              key={t.id}
              onClick={() => inspect({ type: "task", id: t.id })}
            >
              <strong>{t.title}</strong>
              <span>{date(t.dueAt)}</span>
            </button>
          ))}
          {!plan.later.length && <p>{__pulseText("No later follow-ups scheduled.")}</p>}
          <Link className="text-link" to="/activity?filter=upcoming">
            {__pulseText("All upcoming follow-ups") + " "}<ArrowUpRight size={15} />
          </Link>
        </details>
      </div>
    </section>
  );
  return (
    <div className="daily-plan">
      <section className="daily-orientation" aria-label={__pulseText("Your day at a glance")}>
        <div className="daily-intent">
          <Compass size={25} />
          <div>
            <p className="eyebrow">{__pulseText("LESS SCATTER. MORE INTENTION.")}</p>
            <h2>{__pulseText("A day with direction.")}</h2>
            <p>{__pulseText("Small steps make room for meaningful progress.")}</p>
          </div>
        </div>
        <div className="daily-status-strip">
          <div>
            <Target size={19} aria-hidden="true" />
            <strong>{plan.remaining.length}</strong>
            <span>{__pulseText("chosen & open")}</span>
          </div>
          <div>
            <ListChecks size={19} aria-hidden="true" />
            <strong>{plan.attention.length}</strong>
            <span>{__pulseText("follow-ups to review")}</span>
          </div>
          <div>
            <CalendarDays size={19} aria-hidden="true" />
            <strong>{plan.later.length}</strong>
            <span>{__pulseText("scheduled for later")}</span>
          </div>
        </div>
      </section>
      {workspace}
      <section className="daily-extra-grid" aria-label={__pulseText("More from your workspace")}>
        <article className="daily-extra-panel">
          <div className="section-heading"><h2>{t("comingUp")}</h2><Link className="text-link" to="/activity?filter=upcoming">{__pulseText("View follow-ups") + " "}<ArrowUpRight size={16} /></Link></div>
          {plan.later.length ? plan.later.slice(0, 3).map((item) => (
            <button className="daily-extra-row" key={item.id} onClick={() => inspect({ type: "task", id: item.id })}>
              <CalendarDays size={20} /><span><strong>{item.title}</strong><small>{date(item.dueAt)}</small></span><ArrowRight size={16} />
            </button>
          )) : <p className="muted">{__pulseText("No later follow-ups scheduled yet.")}</p>}
        </article>
        <article className="daily-extra-panel">
          <div className="section-heading"><h2>{t("recentConversations")}</h2><Link className="text-link" to="/activity">{__pulseText("View activity") + " "}<ArrowUpRight size={16} /></Link></div>
          {p.interactions.filter((item) => item.type !== "Note" && Date.parse(item.occurredAt) <= Date.now()).slice(0, 3).map((item) => {
            const contact = p.contacts.find((person) => person.id === item.contactId);
            return <button className="daily-extra-row" key={item.id} onClick={() => onEdit({kind: "interaction", record: item})}>
              {contact ? <Avatar name={contact.name} mediaId={contact.avatar} /> : <Compass size={20} />}
              <span><strong>{contact?.name || __pulseText("Saved conversation")}</strong><small>{item.type} · {date(item.occurredAt)}</small></span><ArrowRight size={16} />
            </button>;
          })}
          {!p.interactions.some((item) => item.type !== "Note" && Date.parse(item.occurredAt) <= Date.now()) && <p className="muted">{__pulseText("Your saved conversations will appear here.")}</p>}
        </article>
        <article className="daily-extra-panel daily-network-snapshot">
          <div className="section-heading"><h2>{t("yourNetwork")}</h2><Link className="text-link" to="/network">{__pulseText("Explore") + " "}<ArrowUpRight size={16} /></Link></div>
          <div className="daily-network-circle"><strong>{p.contacts.length}</strong><span>{__pulseText("people")}</span></div>
          <p>{p.organizations.length} {" " + __pulseText("companies saved in this workspace.")}</p>
          <Link className="text-link" to="/analytics">{__pulseText("See relationship insights") + " "}<ArrowUpRight size={16} /></Link>
        </article>
      </section>
      {suggestions}
      <section className="daily-wrap" aria-labelledby="daily-wrap-title">
        <div className="daily-wrap-intro">
          <CheckCheck size={28} />
          <p className="eyebrow">{__pulseText("A MOMENT TO TAKE STOCK")}</p>
          <h2 id="daily-wrap-title">{__pulseText("What moved forward?")}</h2>
          <p>
            {__pulseText("Today’s saved evidence, in your workspace timezone. No score to chase.")}</p>
        </div>
        <div className="daily-wrap-facts">
          <div>
            <strong>{plan.completed.length}</strong>
            <span>{__pulseText("follow-ups completed today")}</span>
          </div>
          <div>
            <strong>{plan.conversations.length}</strong>
            <span>{__pulseText("conversations dated today")}</span>
          </div>
          <div>
            <strong>{plan.remaining.length}</strong>
            <span>{__pulseText("chosen records still open")}</span>
          </div>
        </div>
        <details>
          <summary>{__pulseText("See today’s evidence")}</summary>
          <p>
            {__pulseText("Completions use the current saved completion date; reopened tasks stop counting. Conversations use their occurred date, exclude notes and future entries, and are not a measure of relationship quality. People, companies and opportunities stay open until you remove them from Today.")}</p>
          {plan.completed.slice(0, 5).map((t) => (
            <button
              className="daily-evidence-record"
              key={t.id}
              onClick={() => inspect({ type: "task", id: t.id })}
            >
              <Check size={15} />
              <span>{t.title}</span>
              <span>{__pulseText("Completed ·") + " "}{date(t.completedAt!)}</span>
            </button>
          ))}
          {plan.conversations.slice(0, 5).map((i) => (
            <button
              className="daily-evidence-record"
              key={i.id}
              onClick={() => onEdit({ kind: "interaction", record: i })}
            >
              <span>
                {i.type} ·{" "}
                {p.contacts.find((c) => c.id === i.contactId)?.name ||
                  p.organizations.find((o) => o.id === i.organizationId)
                    ?.name ||
                  __pulseText("Saved conversation")}
              </span>
              <span>{date(i.occurredAt)}</span>
            </button>
          ))}
          {!plan.completed.length && !plan.conversations.length && (
            <p>
              {__pulseText("No completions or conversations dated today yet. A quiet day is valid too.")}</p>
          )}
          <Link className="text-link" to="/activity">
            {__pulseText("Open activity") + " "}<ArrowUpRight size={15} />
          </Link>
        </details>
      </section>
    </div>
  );
}
