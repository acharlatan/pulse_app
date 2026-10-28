import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Target } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, useFormat } from "../components/ui";
import { FocusButton } from "../components/focus";
import type { Editor } from "../components/forms";
import type { AnalyticsReport } from "../services/analytics";
import {
  analyticsGuidance,
  type FocusTarget,
} from "../services/analytics-guidance";
export function AnalyticsBrief({
  report,
  onEdit,
  onSection,
  onCompany,
}: {
  report: AnalyticsReport;
  onEdit: (e: Editor) => void;
  onCompany: (id: string) => void;
  onSection: (
    s: "Relationships" | "Opportunities" | "Productivity" | "Data quality",
  ) => void;
}) {
  const p = usePulse(),
    { money } = useFormat();
  const g = analyticsGuidance(
    report,
    p.intelligence.queue,
    p.intelligence.opportunities,
    p.settings.timezone,
  );
  const lanes = [
    {
      id: "commitments",
      name: "Keep commitments",
      rows: g.commitments,
      description:
        "Overdue follow-ups now. Start by reviewing what was promised.",
      empty: "No overdue follow-ups in this scope.",
    },
    {
      id: "opportunities",
      name: "Protect opportunities",
      rows: g.opportunities,
      description: "Open opportunities flagged by your existing review rules.",
      empty: "No open opportunities flagged in this scope.",
    },
    {
      id: "relationships",
      name: "Renew connections",
      rows: g.relationships,
      description:
        "Eligible, undeferred reviews based on your relationship rhythm.",
      empty: "No eligible relationship reviews due in this scope.",
    },
  ];
  const [choice, setChoice] = useState("");
  const [companyLimit, setCompanyLimit] = useState(4);
  const active =
    lanes.find((l) => l.id === choice) ||
    lanes.find((l) => l.rows.length) ||
    lanes[0];
  function open(t: FocusTarget) {
    if (t.type === "task") {
      const record = p.tasks.find((r) => r.id === t.id);
      if (record) onEdit({ kind: "task", record });
    } else if (t.type === "opportunity") {
      const record = p.opportunities.find((r) => r.id === t.id);
      if (record) onEdit({ kind: "opportunity", record });
    }
  }
  return (
    <>
      <section className="analytics-brief" aria-label="Focus briefing">
        <header>
          <div>
            <p className="eyebrow">TURN INFORMATION INTO INTENTION</p>
            <h2>Where should your focus go?</h2>
            <p>
              Choose a lane. Inspect the evidence. Keep the next step
              deliberate.
            </p>
            <small className="brief-scope-note">
              Current priorities · activity dates apply to the period reports
              below.
            </small>
          </div>
          <span className="brief-symbol" aria-hidden="true">
            <Target size={36} />
          </span>
        </header>
        <div className="focus-lanes" aria-label="Focus lanes">
          {lanes.map((l, i) => (
            <button
              key={l.id}
              aria-pressed={active.id === l.id}
              onClick={() => setChoice(l.id)}
            >
              <span className="lane-number">0{i + 1}</span>
              <strong>{l.rows.length}</strong>
              <h3>{l.name}</h3>
              <span>{l.description}</span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
        <div className="focus-desk">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURRENT SAVED EVIDENCE</p>
              <h3>{active.name}</h3>
            </div>
            <Link className="text-link" to="/focus">
              Open My Focus <ArrowUpRight size={16} />
            </Link>
          </div>
          {active.rows.length ? (
            active.rows.slice(0, 3).map((t) => (
              <article className="focus-evidence" key={t.type + ":" + t.id}>
                <div>
                  <h4>{t.title}</h4>
                  <p>{t.reason}</p>
                </div>
                <div className="evidence-actions">
                  {t.type === "contact" ? (
                    <Link
                      className="button secondary"
                      to={`/network/people/${t.id}`}
                    >
                      {t.label}
                      <ArrowUpRight size={15} />
                    </Link>
                  ) : (
                    <button
                      className="button secondary"
                      onClick={() => open(t)}
                    >
                      {t.label}
                      <ArrowUpRight size={15} />
                    </button>
                  )}
                  <FocusButton type={t.type} id={t.id} />
                </div>
              </article>
            ))
          ) : (
            <div className="brief-clear">
              <Check size={22} />
              <p>{active.empty}</p>
            </div>
          )}
          {active.rows.length > 3 && (
            <p className="muted">
              Showing 3 of {active.rows.length}.{" "}
              <Link
                to={
                  active.id === "commitments"
                    ? "/activity?filter=overdue"
                    : "/review"
                }
              >
                Open the full work queue
              </Link>
              .
            </p>
          )}
          <details className="insight-explainer">
            <summary>Why these focus lanes?</summary>
            <p>
              Commitments use saved overdue dates. Opportunity flags and
              relationship reviews use the same rules as Review; there is no
              hidden score or prediction. These are current snapshots in your
              selected record scope, independent of the report’s activity dates.
              Tasks may be reviewed administratively even when outreach is
              restricted. Pinning is your choice; nothing is sent or completed
              here.
            </p>
          </details>
        </div>
      </section>
      <section className="analytics-perspectives">
        <article className="coverage-panel">
          <p className="eyebrow">RELATIONSHIP COVERAGE · SELECTED PERIOD</p>
          <h2>Who is part of the conversation?</h2>
          <div className="coverage-fraction">
            <strong>{g.coverage.reached}</strong>
            <span>
              of {g.coverage.total}
              <br />
              current people
            </span>
          </div>
          <progress
            aria-label="People with a recorded conversation in the period"
            max={Math.max(1, g.coverage.total)}
            value={g.coverage.reached}
          />
          <p>
            {g.coverage.total
              ? `${g.coverage.total - g.coverage.reached} have no logged conversation in this period.`
              : "Add people to build a useful view of your relationships."}
          </p>
          <p className="muted">
            Coverage describes recorded activity, not relationship quality. It
            includes paused and restricted people; a missing conversation is not
            permission to contact them.
          </p>
          <button
            className="text-link"
            onClick={() => onSection("Relationships")}
          >
            Explore relationship evidence <ArrowRight size={16} />
          </button>
        </article>
        <article className="value-perspective">
          <p className="eyebrow">OPEN OPPORTUNITIES · CURRENT SNAPSHOT</p>
          <h2>What is still in play?</h2>
          {report.currency.length ? (
            report.currency.map(([c, value]) => (
              <p className="perspective-value" key={c}>
                <strong>{money(value, c)}</strong>
                <span>{c}</span>
              </p>
            ))
          ) : (
            <p>No open values recorded in this scope.</p>
          )}
          <p>
            {report.active.length} open opportunities ·{" "}
            {report.active.filter((o) => o.value === null).length} without a
            value.
          </p>
          <p className="muted">
            Saved values stay separate by currency. This is neither a revenue
            forecast nor a measure of how much an action will earn.
          </p>
          <button
            className="text-link"
            onClick={() => onSection("Opportunities")}
          >
            Inspect the pipeline <ArrowRight size={16} />
          </button>
        </article>
      </section>
      <section className="analytics-company-lens">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EFFORT & OPEN WORK</p>
            <h2>Look at the company behind the numbers.</h2>
          </div>
        </div>
        <p className="muted">
          Compare recorded conversations with current open work, then inspect a
          company’s records.
        </p>
        <div className="company-lens-head" aria-hidden="true">
          <span>Company</span>
          <span>Conversations in period</span>
          <span>Open opportunities now</span>
          <span>Overdue now</span>
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
                      aria-label={`Scope report to ${org.name}`}
                      onClick={() => onCompany(org.id)}
                    >
                      <strong>{org.name}</strong>
                      <ArrowUpRight size={15} />
                    </button>
                  </>
                ) : (
                  <strong>No company recorded</strong>
                )}
              </div>
              <span>
                <small>Conversations</small>
                <strong>{row.conversations}</strong>
                <i
                  aria-hidden="true"
                  style={{
                    width: `${(row.conversations / Math.max(1, ...g.companyActivity.map((r) => r.conversations))) * 100}%`,
                  }}
                />
              </span>
              <span>
                <small>Open opportunities</small>
                <strong>{row.open}</strong>
              </span>
              <span>
                <small>Overdue</small>
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
            Show more companies ({g.companyActivity.length - companyLimit}{" "}
            remaining)
          </button>
        )}
        {!g.companyActivity.length && (
          <p>No matching conversation or open-work records yet.</p>
        )}
        <details className="insight-explainer">
          <summary>
            How can I use this without chasing the busiest company?
          </summary>
          <p>
            Companies are sorted by overdue work, then open opportunities and
            conversations. Conversation activity uses each record’s historical
            company; open-work columns use saved current associations. These are
            different cohorts. Start with an actual overdue commitment. Then
            inspect an open opportunity or relationship review to decide whether
            it deserves a next step. Conversation volume alone does not measure
            interest, value or satisfaction. Missing dates and links reduce what
            the report can explain.
          </p>
          <button
            className="text-link"
            onClick={() => onSection("Data quality")}
          >
            Review missing context <ArrowRight size={16} />
          </button>
        </details>
      </section>
    </>
  );
}
