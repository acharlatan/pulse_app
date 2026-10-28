import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, ArrowRight } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, Badge, useFormat } from "../components/ui";
import { FocusButton } from "../components/focus";
import type { Contact } from "../data/models";
import type { Editor } from "../components/forms";
import { restrictionReasons, taskState } from "../services/recommendations";
export function NetworkContext({
  contact: c,
  onEdit,
}: {
  contact: Contact;
  onEdit: (e: Editor) => void;
}) {
  const p = usePulse(),
    { date, money } = useFormat();
  const latest = p.interactions
    .filter(
      (i) =>
        i.contactId === c.id &&
        i.type !== "Note" &&
        Date.parse(i.occurredAt) <= Date.now(),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const next = p.tasks
    .filter((t) => t.contactId === c.id && !t.completedAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const deals = p.opportunities.filter(
    (o) => o.status === "open" && o.contactIds.includes(c.id),
  );
  const restrictions = restrictionReasons(c, p.permissions, p.restrictions);
  return (
    <aside
      id="network-relationship-context"
      className="network-context"
      aria-label={`Relationship context for ${c.name}`}
    >
      <div className="context-heading">
        <p className="eyebrow">THE RELATIONSHIP</p>
        <FocusButton type="contact" id={c.id} />
      </div>
      <div className="context-identity">
        <Avatar name={c.name} mediaId={c.avatar} size="xl" />
        <h2>{c.name}</h2>
        <Link to={`/network/people/${c.id}`}>
          Open full profile <ArrowUpRight size={15} />
        </Link>
      </div>
      <section className="context-conversation">
        <p className="eyebrow">LAST CONVERSATION</p>
        {latest ? (
          <>
            <span className="context-date">
              <MessageCircle size={15} />
              {latest.type} · {date(latest.occurredAt)}
            </span>
            <p className="context-excerpt">
              {latest.summary.length > 350
                ? latest.summary.slice(0, 350) + "…"
                : latest.summary}
            </p>
            {latest.outcome && (
              <p className="context-outcome">{latest.outcome}</p>
            )}
          </>
        ) : (
          <p className="muted">
            No past conversations logged. Add one when there’s a conversation to
            remember.
          </p>
        )}
      </section>
      <section className="context-next">
        <p className="eyebrow">OPEN COMMITMENT</p>
        {next ? (
          <>
            <Badge
              tone={
                taskState(next, p.settings.timezone) === "Overdue"
                  ? "red"
                  : "purple"
              }
            >
              {taskState(next, p.settings.timezone)} · {date(next.dueAt)}
            </Badge>
            <h3>{next.title}</h3>
            <button
              className="text-link"
              onClick={() => onEdit({ kind: "task", record: next })}
            >
              Review next step <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <p className="muted">No open follow-up for this person.</p>
            <button
              className="text-link"
              onClick={() => onEdit({ kind: "task", contact: c })}
            >
              Plan a follow-up <ArrowRight size={16} />
            </button>
          </>
        )}
      </section>
      {deals.length > 0 && (
        <section className="context-deals">
          <p className="eyebrow">RELATED OPPORTUNITIES</p>
          {deals.slice(0, 2).map((o) => (
            <button
              key={o.id}
              onClick={() => onEdit({ kind: "opportunity", record: o })}
            >
              <strong>{o.title}</strong>
              <span>
                {o.value === null
                  ? "Value not set"
                  : money(o.value, o.currency)}{" "}
                ·{" "}
                {p.pipelineStages.find((s) => s.id === o.stageId)?.name ||
                  "Open"}
              </span>
            </button>
          ))}
          {deals.length > 2 && (
            <Link to={`/network/people/${c.id}`}>
              View all {deals.length} opportunities
            </Link>
          )}
        </section>
      )}
      {restrictions.length > 0 && (
        <p className="restriction-note">
          Outreach restricted: {restrictions.join("; ")}. Administrative review
          remains available.
        </p>
      )}
      <button
        className="button secondary context-log"
        onClick={() => onEdit({ kind: "interaction", contact: c })}
      >
        <MessageCircle size={17} />
        Log interaction
      </button>
    </aside>
  );
}
