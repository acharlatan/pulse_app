import { useInterfaceText } from "../i18n/useInterfaceText";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, useFormat } from "../components/ui";
import { FocusButton } from "../components/focus";
import { CustomFields } from "../components/custom-fields";
import type { Opportunity } from "../data/models";
import type { Editor } from "../components/forms";
import { restrictionReasons, taskState } from "../services/recommendations";
import { opportunityFollowUp } from "../services/pipeline-studio";
export function PipelineOpportunity({
  opportunity: o,
  onEdit,
  onReview,
}: {
  opportunity: Opportunity;
  onEdit: (e: Editor) => void;
  onReview: (id: string) => void;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    { date, money } = useFormat();
  const org = p.organizations.find((v) => v.id === o.organizationId);
  const people = o.contactIds
    .map((id) => p.contacts.find((c) => c.id === id))
    .filter((c) => !!c);
  const stage = p.pipelineStages.find((s) => s.id === o.stageId);
  const followUp = opportunityFollowUp(o, p.tasks, p.interactions);
  const next = followUp?.task;
  const last = p.interactions.filter((i) => i.opportunityId === o.id && i.type !== "Note" && Date.parse(i.occurredAt) <= Date.now()).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const restricted = people.some((c) => restrictionReasons(c, p.permissions, p.restrictions).length > 0);
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
          {stage?.name || __pulseText("Stage")} · {o.status}
        </Badge>
        <ArrowUpRight size={17} aria-hidden="true" />
      </div>
      <h4>
        <button
          className="board-title"
          onClick={() => onReview(o.id)}
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
        {o.value === null ? __pulseText("Value not set") : money(o.value, o.currency)}
      </strong>
      {o.expectedCloseAt && (
        <p className="board-close">
          <CalendarClock size={15} />
          {__pulseText("Expected") + " "}{date(o.expectedCloseAt)}
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
            <span>+{people.length - 2} {" " + __pulseText("more in details")}</span>
          )}
        </div>
      )}
      {restricted && <p className="studio-deal-restriction">{__pulseText("A representative has outreach restrictions. Review their profile before contacting them.")}</p>}
      {o.status === "open" && insight?.flags.length ? <p className="studio-deal-flag"><strong>{__pulseText("WHY REVIEW")}</strong><span>{insight.reason}</span></p> : null}
      {o.status === "open" && (
        <div className="board-next">
          <p className="eyebrow">{__pulseText("NEXT STEP")}</p>
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
                {followUp?.relation === "linked" ? __pulseText("Linked through a saved interaction") : __pulseText("Related through company or representative · may support other work")}</small>
            </>
          ) : (
            <><p className="muted">{__pulseText("No related open follow-up recorded.")}</p><button onClick={() => onEdit({kind:"task", contact:people[0], organizationId:o.organizationId || undefined})}>{__pulseText("Plan a follow-up")}</button></>
          )}
        </div>
      )}
      {last && <div className="studio-deal-conversation"><span>{__pulseText("LAST LINKED CONVERSATION")} · {date(last.occurredAt)}</span><p>{last.summary.length > 150 ? `${last.summary.slice(0,150)}…` : last.summary}</p></div>}
      <button className="studio-deal-open" onClick={() => onReview(o.id)}>{__pulseText("Review opportunity")} <ArrowUpRight size={15}/></button>
      <details className="board-card-tools">
        <summary>
          {__pulseText("Details & tools")}{insight?.flags.length ? __pulseText(" · review needed") : ""}
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
            {__pulseText("Catch Me Up")}</Link>
          <button
            className="button secondary"
            onClick={() => onEdit({ kind: "opportunity", record: o })}
          >
            {__pulseText("View / edit opportunity")}</button>
        </div>
      </details>
    </article>
  );
}
