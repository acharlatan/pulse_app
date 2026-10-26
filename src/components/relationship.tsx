import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, Calendar, MessageCircle, StickyNote } from "lucide-react";
import { usePulse } from "../app/context";
import { Badge, Empty, SectionHeading, useFormat } from "./ui";
import type { Editor } from "./forms";
import type { Interaction, Opportunity, Task, Contact } from "../data/models";
import { completeTask, reopenTask } from "../data/repository";
import { taskState, restrictionReasons } from "../services/recommendations";
export function TaskRow({
  task: t,
  onEdit,
}: {
  task: Task;
  onEdit: (editor: Editor) => void;
}) {
  const p = usePulse(),
    { date } = useFormat();
  const [busy, setBusy] = useState(false);
  const state = taskState(t, p.settings.timezone);
  const c = p.contacts.find((c) => c.id === t.contactId);
  const org = p.organizations.find((o) => o.id === t.organizationId);
  const restrictions = c
    ? restrictionReasons(c, p.permissions, p.restrictions)
    : [];
  const reward = p.rewards.find(
    (r) => r.sourceType === "task" && r.sourceId === t.id,
  );
  return (
    <article className="managed-task">
      <div className="record-main">
        <strong className={t.completedAt ? "completed-text" : ""}>
          {t.title}
        </strong>
        {c && <Link to={`/network/people/${c.id}`}>{c.name}</Link>}
        {!c && org && (
          <Link to={`/network/companies/${org.id}`}>{org.name}</Link>
        )}
        <small className="muted">{t.priority} priority</small>
        {restrictions.length > 0 && (
          <p className="restriction-note">
            Outreach restricted. Administrative editing remains available;
            completion does not override restrictions.
          </p>
        )}
        {p.settings.gamification && p.settings.progress.enabled && reward && (
          <small className="muted">
            {reward.active ? "5 XP recorded" : "Original reward inactive"}
          </small>
        )}
        {t.description && <p>{t.description}</p>}
        <span>
          <Badge tone={state === "Overdue" ? "red" : ""}>{state}</Badge>{" "}
          <time>
            {date(t.dueAt, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </span>
      </div>
      <div className="record-actions">
        <button
          className="button secondary"
          onClick={() => onEdit({ kind: "task", record: t })}
        >
          Edit task
        </button>
        <button
          className="button ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await p.run(
              () =>
                t.completedAt
                  ? reopenTask(p.db, t.id)
                  : completeTask(p.db, t.id),
              t.completedAt ? "Follow-up reopened" : "Follow-up completed",
            );
            setBusy(false);
          }}
        >
          {t.completedAt ? "Reopen" : "Complete"}
        </button>
      </div>
    </article>
  );
}
const icons = {
  Call: Phone,
  Email: Mail,
  Meeting: Calendar,
  Message: MessageCircle,
  Note: StickyNote,
};
function StoryEntry({
  interaction: i,
  onEdit,
}: {
  interaction: Interaction;
  onEdit: (editor: Editor) => void;
}) {
  const p = usePulse(),
    { date } = useFormat();
  const [expanded, setExpanded] = useState(false);
  const c = p.contacts.find((c) => c.id === i.contactId),
    o = p.opportunities.find((o) => o.id === i.opportunityId),
    t = p.tasks.find((t) => t.id === i.followUpId),
    Icon = icons[i.type];
  return (
    <article className="story-entry">
      <div className="story-meta">
        <span className="soft-icon">
          <Icon size={17} />
        </span>
        <strong>{i.type}</strong>
        <time dateTime={i.occurredAt}>
          {date(i.occurredAt, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </div>
      {c && (
        <Link className="story-person" to={`/network/people/${c.id}`}>
          {c.name}
        </Link>
      )}
      {i.source && <p className="muted">Source: {i.source}</p>}
      <p className="story-copy">
        {i.summary.length > 500 && !expanded
          ? i.summary.slice(0, 500) + "…"
          : i.summary}
      </p>
      {i.summary.length > 500 && (
        <button className="button ghost" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Read full entry"}
        </button>
      )}
      {i.outcome && (
        <div className="story-outcome">
          Outcome / next step <span>{i.outcome}</span>
        </div>
      )}
      {(o || t) && (
        <p className="story-links">
          {o && (
            <button
              className="button ghost"
              onClick={() => onEdit({ kind: "opportunity", record: o })}
            >
              {o.title} · {o.stageId}
            </button>
          )}
          {t && (
            <button
              className="button ghost"
              onClick={() => onEdit({ kind: "task", record: t })}
            >
              Follow-up: {t.title}
            </button>
          )}
        </p>
      )}
      <div className="record-actions">
        <button
          className="button ghost"
          onClick={() => onEdit({ kind: "interaction", record: i, contact: c })}
        >
          Edit entry
        </button>
        {i.updatedAt !== i.createdAt && (
          <small className="muted">Edited · {date(i.updatedAt)}</small>
        )}
      </div>
    </article>
  );
}
export function RelationshipTimeline({
  interactions,
  onEdit,
}: {
  interactions: Interaction[];
  onEdit: (editor: Editor) => void;
}) {
  const [filter, setFilter] = useState("All"),
    [limit, setLimit] = useState(20);
  const filtered = interactions
    .filter((i) => filter === "All" || i.type === filter)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return (
    <>
      <label className="field story-filter">
        <span>Story filter</span>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setLimit(20);
          }}
        >
          {["All", "Call", "Email", "Meeting", "Message", "Note"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      {filtered.slice(0, limit).map((i) => (
        <StoryEntry key={i.id} interaction={i} onEdit={onEdit} />
      ))}
      {!filtered.length && (
        <Empty
          title="A story waiting to be told"
          body="No conversations in this view. Log an interaction or choose another filter."
        />
      )}
      {filtered.length > limit && (
        <button
          className="button secondary"
          onClick={() => setLimit(limit + 20)}
        >
          Show more entries
        </button>
      )}
    </>
  );
}
export function OpportunityCard({
  opportunity: o,
  onEdit,
}: {
  opportunity: Opportunity;
  onEdit: (editor: Editor) => void;
}) {
  const p = usePulse(),
    { money, date } = useFormat();
  const org = p.organizations.find((v) => v.id === o.organizationId);
  return (
    <article className="deal-card">
      <Badge
        tone={
          o.status === "won" ? "green" : o.status === "lost" ? "red" : "purple"
        }
      >
        {o.stageId} · {o.status}
      </Badge>
      <h3>{o.title}</h3>
      {org && (
        <Link className="company-line" to={`/network/companies/${org.id}`}>
          {org.name}
        </Link>
      )}
      <strong className="deal-value">
        {o.value === null ? "Value not set" : money(o.value, o.currency)}
      </strong>
      {o.expectedCloseAt && (
        <p className="muted">
          Expected close ·{" "}
          {date(o.expectedCloseAt, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
      {p.intelligence.opportunities.find((i) => i.opportunityId === o.id)?.flags
        .length ? (
        <details className="opportunity-flags">
          <summary>Requires review</summary>
          <p>
            {
              p.intelligence.opportunities.find((i) => i.opportunityId === o.id)
                ?.reason
            }
          </p>
        </details>
      ) : null}
      <p className="deal-people">
        {o.contactIds
          .map((id) => p.contacts.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => (
            <Link key={c!.id} to={`/network/people/${c!.id}`}>
              {c!.name}
            </Link>
          ))}
      </p>
      <button
        className="button secondary"
        onClick={() => onEdit({ kind: "opportunity", record: o })}
      >
        View / edit opportunity
      </button>
    </article>
  );
}
export function PermissionsPanel({
  contact: c,
  onEdit,
}: {
  contact: Contact;
  onEdit: (editor: Editor) => void;
}) {
  const p = usePulse(),
    { date } = useFormat();
  const reasons = restrictionReasons(c, p.permissions, p.restrictions);
  return (
    <section className="surface" id="permissions">
      <SectionHeading title="Outreach preferences" />
      {reasons.length ? (
        <div className="restriction-note">
          {reasons.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      ) : (
        <p className="muted">
          Eligible for relationship review. Marketing consent must be recorded
          separately.
        </p>
      )}
      <button
        className="button secondary"
        onClick={() =>
          onEdit({
            kind: "restriction",
            contact: c,
            record: p.restrictions.find(
              (r) =>
                r.id === `profile-${c.id}` &&
                (!r.endAt || Date.parse(r.endAt) > Date.now()),
            ),
          })
        }
      >
        Manage availability
      </button>
      <details className="permission-details">
        <summary>Restrictions & history</summary>
        {p.restrictions
          .filter((r) => r.contactId === c.id)
          .map((r) => (
            <div className="permission-row" key={r.id}>
              <strong>{r.type}</strong>
              <small>
                {r.startAt ? date(r.startAt) : "Start not recorded"} →{" "}
                {r.endAt ? date(r.endAt) : "Until ended"}
              </small>
              <p>{r.reason}</p>
              {r.source && <p className="muted">Source: {r.source}</p>}
              {r.endAt && Date.parse(r.endAt) <= Date.now() ? (
                <Badge>Ended · preserved for history</Badge>
              ) : (
                <button
                  className="button ghost"
                  onClick={() =>
                    onEdit({ kind: "restriction", contact: c, record: r })
                  }
                >
                  Edit restriction
                </button>
              )}
            </div>
          ))}
      </details>
      <details className="permission-details">
        <summary>Communication permissions</summary>
        <p className="muted">Unrecorded channels and purposes are Unknown.</p>
        {p.permissions
          .filter((r) => r.contactId === c.id)
          .map((r) => (
            <div className="permission-row" key={r.id}>
              <strong>
                {r.channel} · {r.purpose}
              </strong>
              <Badge>{r.status}</Badge>
              <small>
                Recorded {date(r.createdAt)}
                {r.withdrawnAt ? ` · Withdrawn ${date(r.withdrawnAt)}` : ""}
              </small>
              <p>{r.evidence}</p>
              <button
                className="button ghost"
                onClick={() =>
                  onEdit({ kind: "permission", contact: c, record: r })
                }
              >
                Edit permission
              </button>
            </div>
          ))}
        <button
          className="button secondary"
          onClick={() => onEdit({ kind: "permission", contact: c })}
        >
          Record permission
        </button>
      </details>
    </section>
  );
}

export function HealthSummary({ contactId }: { contactId: string }) {
  const p = usePulse(),
    { date } = useFormat(),
    insight = p.intelligence.relationships.find(
      (r) => r.contactId === contactId,
    ),
    contact = p.contacts.find((c) => c.id === contactId);
  if (!insight) return null;
  return (
    <section className="surface health-summary">
      <SectionHeading title="Relationship pulse" />
      <Badge
        tone={
          insight.health === "Restricted"
            ? "red"
            : insight.health === "Active"
              ? "green"
              : "purple"
        }
      >
        {insight.health}
      </Badge>
      <p>{insight.reason}</p>
      {insight.history === "Imported unknown" && (
        <p className="muted">
          Imported from {contact?.importProvenance?.fileName}. No last-contact
          date was provided.
        </p>
      )}
      {insight.history === "Imported date" && (
        <p className="muted">
          Last-contact date supplied by {contact?.importProvenance?.fileName} ·{" "}
          {date(insight.lastAt!)}. This is imported metadata, not a logged
          conversation.
        </p>
      )}
      <Link className="button ghost" to="/review">
        Open Relationship Review
      </Link>
    </section>
  );
}
