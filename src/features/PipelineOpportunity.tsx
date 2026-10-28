import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, useFormat } from "../components/ui";
import { FocusButton } from "../components/focus";
import { CustomFields } from "../components/custom-fields";
import type { Opportunity } from "../data/models";
import type { Editor } from "../components/forms";
import { taskState } from "../services/recommendations";
export function PipelineOpportunity({
  opportunity: o,
  onEdit,
}: {
  opportunity: Opportunity;
  onEdit: (e: Editor) => void;
}) {
  const p = usePulse(),
    { date, money } = useFormat();
  const org = p.organizations.find((v) => v.id === o.organizationId);
  const people = o.contactIds
    .map((id) => p.contacts.find((c) => c.id === id))
    .filter((c) => !!c);
  const stage = p.pipelineStages.find((s) => s.id === o.stageId);
  const next = p.tasks
    .filter(
      (t) =>
        !t.completedAt &&
        ((o.organizationId && t.organizationId === o.organizationId) ||
          (t.contactId && o.contactIds.includes(t.contactId))),
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const insight = p.intelligence.opportunities.find(
    (i) => i.opportunityId === o.id,
  );
  return (
    <article className={`deal-card board-opportunity outcome-${o.status}`}>
      <div className="board-card-kicker">
        <Badge
          tone={
            o.status === "won"
              ? "green"
              : o.status === "lost"
                ? "red"
                : "purple"
          }
        >
          {stage?.name || "Stage"} · {o.status}
        </Badge>
        <ArrowUpRight size={17} aria-hidden="true" />
      </div>
      <h4>
        <button
          className="board-title"
          onClick={() => onEdit({ kind: "opportunity", record: o })}
        >
          {o.title}
        </button>
      </h4>
      {org && (
        <Link className="board-company" to={`/network/companies/${org.id}`}>
          <Avatar name={org.name} mediaId={org.avatar} company />
          <span>{org.name}</span>
        </Link>
      )}
      <strong className="deal-value">
        {o.value === null ? "Value not set" : money(o.value, o.currency)}
      </strong>
      {o.expectedCloseAt && (
        <p className="board-close">
          <CalendarClock size={15} />
          Expected {date(o.expectedCloseAt)}
        </p>
      )}
      {people.length > 0 && (
        <div className="board-people">
          {people.slice(0, 2).map((c) => (
            <Link key={c.id} to={`/network/people/${c.id}`}>
              <Avatar name={c.name} mediaId={c.avatar} size="small" />
              <span>{c.preferredName || c.name}</span>
            </Link>
          ))}
          {people.length > 2 && (
            <span>+{people.length - 2} more in details</span>
          )}
        </div>
      )}
      {o.status === "open" && (
        <div className="board-next">
          <p className="eyebrow">RELATED FOLLOW-UP</p>
          {next ? (
            <>
              <button onClick={() => onEdit({ kind: "task", record: next })}>
                {next.title}
              </button>
              <small
                className={
                  taskState(next, p.settings.timezone) === "Overdue"
                    ? "is-overdue"
                    : ""
                }
              >
                {taskState(next, p.settings.timezone)} · {date(next.dueAt)}
              </small>
              <small>
                Via{" "}
                {next.organizationId === o.organizationId && o.organizationId
                  ? "company"
                  : "representative"}{" "}
                · may support other work
              </small>
            </>
          ) : (
            <p className="muted">
              No open follow-up for this company or its representatives.
            </p>
          )}
        </div>
      )}
      <details className="board-card-tools">
        <summary>
          Details & tools{insight?.flags.length ? " · review needed" : ""}
        </summary>
        <div>
          <FocusButton type="opportunity" id={o.id} />
          {insight?.flags.length ? (
            <p className="restriction-note">{insight.reason}</p>
          ) : null}
          <CustomFields type="opportunity" id={o.id} />
          {people.length > 2 && (
            <p>
              {people.slice(2).map((c) => (
                <Link key={c.id} to={`/network/people/${c.id}`}>
                  {c.name}{" "}
                </Link>
              ))}
            </p>
          )}
          <Link
            className="button ghost"
            to={`/assistant?scope=opportunity&id=${encodeURIComponent(o.id)}`}
          >
            Catch Me Up
          </Link>
          <button
            className="button secondary"
            onClick={() => onEdit({ kind: "opportunity", record: o })}
          >
            View / edit opportunity
          </button>
        </div>
      </details>
    </article>
  );
}
