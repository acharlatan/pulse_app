import { OpportunityBrief } from "./OpportunityBrief";
import { useInterfaceText } from "../i18n/useInterfaceText";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Target, MessageCircle, CheckCircle2, MoveUpRight } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, useFormat } from "../components/ui";
import { FocusButton } from "../components/focus";
import type { Editor } from "../components/forms";
import type { AnalyticsReport } from "../services/analytics";
import { analyticsGuidance, type FocusTarget } from "../services/analytics-guidance";
import { analyticsStory, type AnalyticsStoryEvent } from "../services/analytics-story";
import { calendarDay } from "../services/progress";

export function AnalyticsBrief({ report, onEdit, onSection, onCompany }: {
  report: AnalyticsReport;
  onEdit: (e: Editor) => void;
  onCompany: (id: string) => void;
  onSection: (s: "Relationships" | "Opportunities" | "Productivity" | "Data quality") => void;
}) {
  const text = useInterfaceText();
  const __pulseText = text;
  const p = usePulse(), { money, date } = useFormat();
  const g = analyticsGuidance(report, p.intelligence.queue, p.intelligence.opportunities, p.settings.timezone);
  const lanes = [
    { id: "commitments", name: "Keep commitments", rows: g.commitments, description: "Overdue follow-ups now. Start by reviewing what was promised.", empty: "No overdue follow-ups in this scope." },
    { id: "relationships", name: "Renew connections", rows: g.relationships, description: "Eligible, undeferred reviews based on your relationship rhythm.", empty: "No eligible relationship reviews due in this scope." },
    { id: "opportunities", name: "Protect opportunities", rows: g.opportunities, description: "Open opportunities flagged by your existing review rules.", empty: "No open opportunities flagged in this scope." },
  ];
  const [choice, setChoice] = useState("");
  const [evidenceLimit, setEvidenceLimit] = useState(3);
  const [eventLimit, setEventLimit] = useState(4);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [companyLimit, setCompanyLimit] = useState(4);
  const active = lanes.find((l) => l.id === choice) || lanes.find((l) => l.rows.length) || lanes[0];
  const events = analyticsStory(report);
  const change = report.interactions.length - report.previousInteractions.length;
  function open(t: FocusTarget) {
    if (t.type === "task") { const record = p.tasks.find((r) => r.id === t.id); if (record) onEdit({ kind: "task", record }); }
    else if (t.type === "opportunity") { if (p.opportunities.some((r) => r.id === t.id)) setBriefId(t.id); }
  }
  function openEvent(event: AnalyticsStoryEvent) {
    if (event.kind === "conversation") onEdit({ kind: "interaction", record: event.record });
    else if (event.kind === "completed") onEdit({ kind: "task", record: event.record });
    else setBriefId(event.record.opportunityId);
  }
  const subject = (event: AnalyticsStoryEvent) => {
    if (event.kind === "completed") return event.record.title;
    if (event.kind === "movement") return report.opportunities.find((o) => o.id === event.record.opportunityId)?.title || text("Opportunity");
    return p.contacts.find((c) => c.id === event.record.contactId)?.name || p.organizations.find((o) => o.id === event.record.organizationId)?.name || text("Unlinked conversation");
  };
  return (
    <>
      <section className="analytics-brief insight-editorial" aria-label={text("Focus briefing")}>
        <div className="insight-issue-head">
          <div className="insight-issue-copy"><p className="eyebrow">{text("YOUR RELATIONSHIP PICTURE")}</p><h2>{text("A little clarity for your next move.")}</h2><p>{text("Your saved activity, the work in motion, and a thoughtful place to begin.")}</p><span className="insight-period">{text("SELECTED PERIOD")} · {report.range.start} — {report.range.end}</span></div>
          <div className="insight-issue-stats" aria-label={text("Selected-period activity")}>
            <button onClick={() => onSection("Relationships")}><strong>{report.interactions.length}</strong><span>{text("recorded conversations")}</span><small>{change >= 0 ? "+" : ""}{change} {text("compared with the previous period")}</small></button>
            <button onClick={() => onSection("Productivity")}><strong>{report.completed.length}</strong><span>{text("follow-ups completed")}</span><small>{text("By saved completion date")}</small></button>
            <button onClick={() => onSection("Opportunities")}><strong>{report.transitions.length}</strong><span>{text("recorded opportunity updates")}</span><small>{text("Recorded movements only")}</small></button>
          </div>
        </div>
        <div className="insight-spread">
          <section className="insight-priorities" aria-labelledby="insight-priority-title">
            <div className="insight-section-title"><div><p className="eyebrow">{text("A PLACE TO BEGIN · CURRENT")}</p><h3 id="insight-priority-title">{text("Where should your focus go?")}</h3><p>{text("Select a lane to see the saved evidence behind it.")}</p></div><Target aria-hidden="true" size={28}/></div>
            <div className="focus-lanes insight-lane-nav" aria-label={text("Focus lanes")}>
              {lanes.map((lane, i) => <button key={lane.id} aria-pressed={active.id === lane.id} onClick={() => { setChoice(lane.id); setEvidenceLimit(3); }}><span className="lane-number">0{i + 1}</span><span className="insight-lane-name">{text(lane.name)}</span><strong>{lane.rows.length}</strong><ArrowRight size={18}/></button>)}
            </div>
            <div className="focus-desk insight-evidence-list">
              <div className="insight-evidence-heading"><div><p className="eyebrow">{text("CURRENT SAVED EVIDENCE")}</p><h4>{text(active.name)}</h4><p>{text(active.description)}</p></div><Link to="/focus">{text("My Focus")} <ArrowUpRight size={15}/></Link></div>
              {active.rows.length ? active.rows.slice(0,evidenceLimit).map((item) => {
                const contact = item.type === "contact" ? p.contacts.find(c => c.id === item.id) : item.type === "task" ? p.contacts.find(c => c.id === p.tasks.find(t => t.id === item.id)?.contactId) : undefined;
                const opportunity = item.type === "opportunity" ? p.opportunities.find(o => o.id === item.id) : undefined;
                const org = opportunity ? p.organizations.find(o => o.id === opportunity.organizationId) : undefined;
                const task = item.type === "task" ? p.tasks.find(t => t.id === item.id) : undefined;
                const reason = task ? text("Saved follow-up due {0}. Review the date, scope and any contact restrictions.", calendarDay(task.dueAt, p.settings.timezone)) : item.reason;
                return <article className="focus-evidence insight-evidence-row" key={`${item.type}:${item.id}`}>
                  <div className="insight-evidence-identity"><Avatar name={contact?.name || org?.name || item.title} mediaId={contact?.avatar || org?.avatar} company={!contact && !!org}/><div><h4>{item.title}</h4>{(contact || org) && <small>{contact?.name || org?.name}</small>}<p>{reason}</p></div></div>
                  <div className="evidence-actions">{item.type === "contact" ? <Link className="button secondary" to={`/network/people/${item.id}`}>{text(item.label)} <ArrowUpRight size={15}/></Link> : <button className="button secondary" onClick={() => open(item)}>{text(item.label)} <ArrowUpRight size={15}/></button>}<FocusButton type={item.type} id={item.id}/></div>
                </article>;
              }) : <div className="brief-clear"><Check size={22}/><p>{text(active.empty)}</p></div>}
              {active.rows.length > evidenceLimit && <p className="muted">{text("Showing")} {Math.min(evidenceLimit, active.rows.length)} {text("of")} {active.rows.length}. <button className="text-link" onClick={() => setEvidenceLimit(evidenceLimit + 6)}>{text("Show more")}</button> <Link to={active.id === "commitments" ? "/activity?filter=overdue" : "/review"}>{text("Open the full work queue")}</Link>.</p>}
              <details className="insight-explainer"><summary>{text("Why these focus lanes?")}</summary><p>{text("Commitments use saved overdue dates. Opportunity flags and relationship reviews use the same rules as Review; there is no hidden score or prediction. These are current snapshots in your selected record scope, independent of the report’s activity dates. Tasks may be reviewed administratively even when outreach is restricted. Pinning is your choice; nothing is sent or completed here.")}</p></details>
            </div>
          </section>
          <section className="insight-activity" aria-labelledby="insight-activity-title">
            <div className="insight-section-title"><div><p className="eyebrow">{text("WHAT MOVED · SELECTED PERIOD")}</p><h3 id="insight-activity-title">{text("The latest chapters.")}</h3><p>{text("Open an entry to see the source behind it.")}</p></div><MoveUpRight aria-hidden="true" size={27}/></div>
            <div className="insight-timeline">
              {events.slice(0,eventLimit).map(event => <button className={`insight-timeline-item is-${event.kind}`} key={`${event.kind}:${event.id}`} onClick={() => openEvent(event)}>
                <span className="insight-timeline-symbol" aria-hidden="true">{event.kind === "conversation" ? <MessageCircle size={16}/> : event.kind === "completed" ? <CheckCircle2 size={16}/> : <MoveUpRight size={16}/>}</span>
                <span className="insight-timeline-copy"><small>{text(event.kind === "conversation" ? "Conversation" : event.kind === "completed" ? "Follow-up completed" : event.record.previousStageId === event.record.stageId && event.record.previousPipelineId === event.record.pipelineId ? "Outcome updated" : "Recorded stage change")} · {date(event.at)}</small><strong>{subject(event)}</strong><span>{event.kind === "conversation" ? event.record.summary : event.kind === "completed" ? text("Completed follow-up") : event.record.previousStageId === event.record.stageId && event.record.previousPipelineId === event.record.pipelineId ? `${text(event.record.previousOutcome)} → ${text(event.record.outcome)}` : `${event.record.previousStageName} → ${event.record.stageName}`}</span>{event.kind === "movement" && event.record.source === "configuration" && <small>{text("Changed during pipeline configuration")}</small>}</span><ArrowUpRight size={16} aria-hidden="true"/>
              </button>)}
              {!events.length && <div className="insight-empty"><strong>{text("Your story starts with a record.")}</strong><p>{text("There is no recorded activity in this period yet. Log a conversation or plan a follow-up to build your picture.")}</p><Link className="button secondary" to="/network">{text("Open Network")}</Link></div>}
            </div>
            {events.length > eventLimit && <button className="button secondary insight-more" onClick={() => setEventLimit(eventLimit + 6)}>{text("Show more activity")}</button>}
            <p className="insight-activity-footnote">{text("Activity follows the selected date range. Current priorities are shown separately. Older stage history may be unavailable.")}</p>
          </section>
        </div>
      </section>
      <details className="analytics-deeper-context"><summary>{__pulseText("Explore coverage and company context")}</summary>
      <section className="analytics-perspectives">
        <article className="coverage-panel">
          <p className="eyebrow">{__pulseText("RELATIONSHIP COVERAGE · SELECTED PERIOD")}</p>
          <h2>{__pulseText("Who is part of the conversation?")}</h2>
          <div className="coverage-fraction">
            <strong>{g.coverage.reached}</strong>
            <span>
              {__pulseText("of") + " "}{g.coverage.total}
              <br />
              {__pulseText("current people")}</span>
          </div>
          <progress
            aria-label={__pulseText("People with a recorded conversation in the period")}
            max={Math.max(1, g.coverage.total)}
            value={g.coverage.reached}
          />
          <p>
            {g.coverage.total
              ? __pulseText("{0} have no logged conversation in this period.", g.coverage.total - g.coverage.reached)
              : __pulseText("Add people to build a useful view of your relationships.")}
          </p>
          <p className="muted">
            {__pulseText("Coverage describes recorded activity, not relationship quality. It includes paused and restricted people; a missing conversation is not permission to contact them.")}</p>
          <button
            className="text-link"
            onClick={() => onSection("Relationships")}
          >
            {__pulseText("Explore relationship evidence") + " "}<ArrowRight size={16} />
          </button>
        </article>
        <article className="value-perspective">
          <p className="eyebrow">{__pulseText("OPEN OPPORTUNITIES · CURRENT SNAPSHOT")}</p>
          <h2>{__pulseText("What is still in play?")}</h2>
          {report.currency.length ? (
            report.currency.map(([c, value]) => (
              <p className="perspective-value" key={c}>
                <strong>{money(value, c)}</strong>
                <span>{c}</span>
              </p>
            ))
          ) : (
            <p>{__pulseText("No open values recorded in this scope.")}</p>
          )}
          <p>
            {report.active.length} {" " + __pulseText("open opportunities ·")}{" "}
            {report.active.filter((o) => o.value === null).length} {" " + __pulseText("without a value.")}</p>
          <p className="muted">
            {__pulseText("Saved values stay separate by currency. This is neither a revenue forecast nor a measure of how much an action will earn.")}</p>
          <button
            className="text-link"
            onClick={() => onSection("Opportunities")}
          >
            {__pulseText("Inspect the pipeline") + " "}<ArrowRight size={16} />
          </button>
        </article>
      </section>
      <section className="analytics-company-lens">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{__pulseText("EFFORT & OPEN WORK")}</p>
            <h2>{__pulseText("Look at the company behind the numbers.")}</h2>
          </div>
        </div>
        <p className="muted">
          {__pulseText("Compare recorded conversations with current open work, then inspect a company’s records.")}</p>
        <div className="company-lens-head" aria-hidden="true">
          <span>{__pulseText("Company")}</span>
          <span>{__pulseText("Conversations in period")}</span>
          <span>{__pulseText("Open opportunities now")}</span>
          <span>{__pulseText("Overdue now")}</span>
        </div>
        {g.companyActivity.slice(0, companyLimit).map((row) => {
          const org = p.organizations.find((o) => o.id === row.organizationId);
          return (
            <article
              className="company-lens-row"
              key={JSON.stringify(row.organizationId)}
            >
              <div>
                {org ? (
                  <>
                    <Avatar name={org.name} mediaId={org.avatar} company />
                    <button
                      aria-label={__pulseText("Scope report to {0}", org.name)}
                      onClick={() => onCompany(org.id)}
                    >
                      <strong>{org.name}</strong>
                      <ArrowUpRight size={15} />
                    </button>
                  </>
                ) : (
                  <strong>{__pulseText("No company recorded")}</strong>
                )}
              </div>
              <span>
                <small>{__pulseText("Conversations")}</small>
                <strong>{row.conversations}</strong>
                <i
                  aria-hidden="true"
                  style={{
                    width: `${(row.conversations / Math.max(1, ...g.companyActivity.map((r) => r.conversations))) * 100}%`,
                  }}
                />
              </span>
              <span>
                <small>{__pulseText("Open opportunities")}</small>
                <strong>{row.open}</strong>
              </span>
              <span>
                <small>{__pulseText("Overdue")}</small>
                <strong className={row.overdue ? "is-overdue" : ""}>
                  {row.overdue}
                </strong>
              </span>
            </article>
          );
        })}
        {g.companyActivity.length > companyLimit && (
          <button
            className="button secondary"
            onClick={() => setCompanyLimit(companyLimit + 8)}
          >
            {__pulseText("Show more companies (")}{g.companyActivity.length - companyLimit}{" "}
            {__pulseText("remaining)")}</button>
        )}
        {!g.companyActivity.length && (
          <p>{__pulseText("No matching conversation or open-work records yet.")}</p>
        )}
        <details className="insight-explainer">
          <summary>
            {__pulseText("How can I use this without chasing the busiest company?")}</summary>
          <p>
            {__pulseText("Companies are sorted by overdue work, then open opportunities and conversations. Conversation activity uses each record’s historical company; open-work columns use saved current associations. These are different cohorts. Start with an actual overdue commitment. Then inspect an open opportunity or relationship review to decide whether it deserves a next step. Conversation volume alone does not measure interest, value or satisfaction. Missing dates and links reduce what the report can explain.")}</p>
          <button
            className="text-link"
            onClick={() => onSection("Data quality")}
          >
            {__pulseText("Review missing context") + " "}<ArrowRight size={16} />
          </button>
        </details>
      </section>
      </details>
      {briefId && <OpportunityBrief id={briefId} onClose={() => setBriefId(null)} onEdit={(next) => {setBriefId(null); onEdit(next);}} />}
    </>
  );
}
