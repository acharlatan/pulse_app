import { BrandArt } from "../components/BrandArt";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useSearchParams } from "react-router-dom";
import { usePulse } from "../app/context";
import {
  calculateAnalytics,
  safeCsv,
  type DatePreset,
  type ReportFilter,
} from "../services/analytics";
import { calendarDay, shiftDay } from "../services/progress";
import { categories, priorities } from "../data/models";
import { EditorModal, type Editor } from "../components/forms";
import { FocusButton } from "../components/focus";
const sections = [
  "Overview",
  "Relationships",
  "Opportunities",
  "Productivity",
  "Data quality",
] as const;
export function Analytics() {
  const p = usePulse(),
    [params] = useSearchParams(),
    transitions = useLiveQuery(() => p.db.transitions.toArray(), [p.db]) || [];
  const today = calendarDay(Date.now(), p.settings.timezone);
  const [filter, setFilter] = useState<ReportFilter>({
    preset: "30",
    personId: params.get("person") || "",
    start: shiftDay(today, -29),
    end: today,
    timezone: p.settings.timezone,
    pipelineId: "",
    organizationId: params.get("company") || "",
    interactionType: "",
    priority: "",
    category: "",
    outcome: "",
  });
  const [section, setSection] = useState<(typeof sections)[number]>("Overview"),
    [selectedDay, setSelectedDay] = useState(""),
    [selectedStage, setSelectedStage] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null);
  const filters = {
    ...filter,
    timezone: p.settings.timezone,
    pipelineId: section === "Opportunities" ? filter.pipelineId : "",
    outcome: section === "Opportunities" ? filter.outcome : "",
    interactionType: section === "Relationships" ? filter.interactionType : "",
  };
  const result = useMemo(() => {
    try {
      return {
        data: calculateAnalytics(
          { ...p, transitions, relationships: p.intelligence.relationships },
          filters,
        ),
        error: "",
      };
    } catch (e) {
      return {
        data: null,
        error: e instanceof Error ? e.message : "Invalid date range.",
      };
    }
  }, [p, transitions, filter, section]);
  const report = result.data;
  const person = (id: string | null) => p.contacts.find((c) => c.id === id);
  function exportCsv() {
    if (!report) return;
    const rows: (string | number | null)[][] = [
      ["Report", "Record", "Date or stage", "Value", "Currency"],
    ];
    if (section === "Overview" || section === "Relationships")
      for (const i of report.interactions.filter(
        (i) =>
          !selectedDay ||
          calendarDay(i.occurredAt, p.settings.timezone).startsWith(
            selectedDay,
          ),
      ))
        rows.push([
          "Meaningful interaction",
          person(i.contactId)?.name || "Company interaction",
          i.occurredAt,
          i.type,
          "",
        ]);
    else if (section === "Opportunities")
      for (const o of report.opportunities.filter(
        (o) => !selectedStage || o.stageId === selectedStage,
      ))
        rows.push([
          `Current ${o.status}`,
          o.title,
          p.pipelineStages.find((s) => s.id === o.stageId)?.name || o.stageId,
          o.value,
          o.currency,
        ]);
    else if (section === "Productivity")
      for (const t of report.completed.filter(
        (t) =>
          !selectedDay ||
          calendarDay(t.completedAt!, p.settings.timezone).startsWith(
            selectedDay,
          ),
      ))
        rows.push(["Completed follow-up", t.title, t.completedAt, "", ""]);
    else {
      for (const [label, records] of [
        ["No company", report.issues.noCompany],
        ["No email or phone", report.issues.noContact],
        ["No meaningful conversation", report.issues.noHistory],
      ] as const)
        for (const c of records) rows.push([label, c.name, "", "", ""]);
      for (const o of report.issues.noClose)
        rows.push(["No close date", o.title, "", "", ""]);
      for (const o of report.issues.noRepresentative)
        rows.push(["No representative", o.title, "", "", ""]);
      for (const o of report.issues.noCompanyRepresentatives)
        rows.push(["Company without representatives", o.name, "", "", ""]);
      for (const t of report.issues.unlinkedTasks)
        rows.push(["Unlinked follow-up", t.title, "", "", ""]);
    }
    const blob = new Blob(["\ufeff" + safeCsv(rows)], {
        type: "text/csv;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `pulse-analytics-${section.toLowerCase().replaceAll(" ", "-")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="page analytics-page">
      <div className="page-heading studio-heading">
        <BrandArt motif="steps" />
        <div>
          <p className="eyebrow">YOUR WORK, IN CONTEXT</p>
          <h1>
            Analytics<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Understand what you have recorded and find the next useful step.
          </p>
        </div>
        <div className="form-actions">
          <Link className="button secondary" to="/automations">
            Open Automations
          </Link>
          <button
            className="button secondary"
            disabled={!report}
            onClick={exportCsv}
          >
            Export this report
          </button>
        </div>
      </div>
      <section
        className="surface analytics-filters"
        aria-label="Report filters"
      >
        <div className="form-grid">
          <label className="field">
            <span>Date range</span>
            <select
              value={filter.preset}
              onChange={(e) => {
                setFilter({ ...filter, preset: e.target.value as DatePreset });
                setSelectedDay("");
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {filter.preset === "custom" && (
            <>
              <label className="field">
                <span>From</span>
                <input
                  type="date"
                  value={filter.start}
                  onChange={(e) =>
                    setFilter({ ...filter, start: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Through</span>
                <input
                  type="date"
                  value={filter.end}
                  onChange={(e) =>
                    setFilter({ ...filter, end: e.target.value })
                  }
                />
              </label>
            </>
          )}
          <label className="field">
            <span>Company</span>
            <select
              value={filter.organizationId}
              onChange={(e) =>
                setFilter({ ...filter, organizationId: e.target.value })
              }
            >
              <option value="">All companies</option>
              {p.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Person</span>
            <select
              value={filter.personId}
              onChange={(e) =>
                setFilter({ ...filter, personId: e.target.value })
              }
            >
              <option value="">All people</option>
              {p.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Contact priority</span>
            <select
              value={filter.priority}
              onChange={(e) =>
                setFilter({ ...filter, priority: e.target.value })
              }
            >
              <option value="">All priorities</option>
              {priorities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Contact category</span>
            <select
              value={filter.category}
              onChange={(e) =>
                setFilter({ ...filter, category: e.target.value })
              }
            >
              <option value="">All categories</option>
              {categories.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {section === "Opportunities" && (
            <>
              <label className="field">
                <span>Pipeline</span>
                <select
                  value={filter.pipelineId}
                  onChange={(e) =>
                    setFilter({ ...filter, pipelineId: e.target.value })
                  }
                >
                  <option value="">All pipelines</option>
                  {p.pipelines.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Current outcome</span>
                <select
                  value={filter.outcome}
                  onChange={(e) =>
                    setFilter({ ...filter, outcome: e.target.value })
                  }
                >
                  <option value="">All outcomes</option>
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
            </>
          )}
          {section === "Relationships" && (
            <label className="field">
              <span>Interaction type</span>
              <select
                value={filter.interactionType}
                onChange={(e) =>
                  setFilter({ ...filter, interactionType: e.target.value })
                }
              >
                <option value="">All conversations</option>
                {["Call", "Email", "Meeting", "Message"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="muted">
          Calendar dates in {p.settings.timezone}. Company activity follows the
          company saved on each conversation. Pipeline/outcome filters apply to
          opportunities; interaction type applies to conversations.
        </p>
      </section>
      <nav className="tabs analytics-tabs" aria-label="Analytics sections">
        {sections.map((s) => (
          <button
            key={s}
            aria-pressed={section === s}
            onClick={() => {
              setSection(s);
              setSelectedDay("");
              setSelectedStage("");
            }}
          >
            {s}
          </button>
        ))}
      </nav>
      {result.error && (
        <p role="alert" className="form-error">
          {result.error}
        </p>
      )}
      {report && (
        <>
          <p className="muted">
            {report.range.start} through {report.range.end} · current-state
            figures are labeled below.
          </p>
          {section === "Overview" && (
            <>
              <div className="analytics-metrics">
                <button
                  className="surface metric-card"
                  onClick={() => setSection("Relationships")}
                >
                  <strong>{report.interactions.length}</strong>
                  <span>Meaningful conversations</span>
                  <small>
                    {report.previousInteractions.length
                      ? `${Math.round(((report.interactions.length - report.previousInteractions.length) / report.previousInteractions.length) * 100)}% vs previous period`
                      : "No previous-period activity recorded"}
                  </small>
                </button>
                <button
                  className="surface metric-card"
                  onClick={() => setSection("Productivity")}
                >
                  <strong>{report.completed.length}</strong>
                  <span>Follow-ups completed</span>
                </button>
                <Link
                  className="surface metric-card"
                  to="/activity?filter=overdue"
                >
                  <strong>{report.overdue.length}</strong>
                  <span>Currently overdue</span>
                </Link>
                <button
                  className="surface metric-card"
                  onClick={() => setSection("Opportunities")}
                >
                  <strong>{report.active.length}</strong>
                  <span>Currently open opportunities</span>
                </button>
                <button
                  className="surface metric-card"
                  onClick={() => setSection("Opportunities")}
                >
                  <strong>{report.won.length}</strong>
                  <span>Currently won</span>
                </button>
                <Link className="surface metric-card" to="/review">
                  <strong>
                    {
                      p.intelligence.queue.filter(
                        (r) => r.contactId && !r.blocked,
                      ).length
                    }
                  </strong>
                  <span>Review items now · all contacts</span>
                </Link>
              </div>
              <p className="muted">
                Meaningful conversations exclude notes, imported last-contact
                metadata and future-dated entries. Period completion counts use
                saved completion timestamps. Current counts are snapshots, not
                historical outcomes.
              </p>
            </>
          )}
          {(section === "Overview" || section === "Relationships") && (
            <section className="surface analytics-chart">
              <h2>Recorded conversations over time</h2>
              <p className="muted">
                Select a bar to inspect its underlying conversations.{" "}
                {report.range.days > 90
                  ? "Grouped by month."
                  : "Grouped by workspace calendar day."}
              </p>
              {report.trend.length ? (
                <div
                  className="analytics-bars"
                  role="group"
                  aria-label="Conversation activity by date"
                >
                  {report.trend.map(([d, n]) => (
                    <button
                      key={d}
                      className="analytics-bar"
                      aria-pressed={selectedDay === d}
                      title={`${n} conversations on ${d}`}
                      onClick={() => {
                        setSelectedDay(selectedDay === d ? "" : d);
                        setSection("Relationships");
                      }}
                    >
                      <span
                        className="analytics-bar-fill"
                        style={{
                          height: `${Math.max(8, (n / Math.max(...report.trend.map((x) => x[1]))) * 110)}px`,
                        }}
                      />
                      <strong>{n}</strong>
                      <small>{d}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  No meaningful conversations in this range.{" "}
                  <Link to="/network">Open Network</Link> to log one.
                </p>
              )}
            </section>
          )}
          {section === "Relationships" && (
            <>
              <section className="surface">
                <h2>Relationship status now</h2>
                <p className="muted">
                  Uses your existing relationship review rules; this is recorded
                  activity, not a measure of sentiment.
                </p>
                <div className="analytics-metrics">
                  {[
                    "Active",
                    "Needs attention",
                    "Cooling",
                    "Dormant",
                    "Paused",
                    "Restricted",
                    "Not enough history",
                  ].map((h) => (
                    <div key={h}>
                      <strong>
                        {report.health.filter((r) => r.health === h).length}
                      </strong>
                      <p>{h}</p>
                    </div>
                  ))}
                </div>
                <Link to="/review">Open relationship review</Link>
              </section>
              <section className="surface">
                <h2>
                  {selectedDay
                    ? `Conversations · ${selectedDay}`
                    : "Conversations in this period"}
                </h2>
                <ul className="analytics-records">
                  {report.interactions
                    .filter(
                      (i) =>
                        !selectedDay ||
                        calendarDay(
                          i.occurredAt,
                          p.settings.timezone,
                        ).startsWith(selectedDay),
                    )
                    .slice(0, 100)
                    .map((i) => (
                      <li key={i.id}>
                        {i.contactId ? (
                          <Link to={`/network/people/${i.contactId}`}>
                            {person(i.contactId)?.name || "Person"}
                          </Link>
                        ) : i.organizationId ? (
                          <Link to={`/network/companies/${i.organizationId}`}>
                            {p.organizations.find(
                              (o) => o.id === i.organizationId,
                            )?.name || "Company"}
                          </Link>
                        ) : (
                          "Unlinked"
                        )}{" "}
                        · {i.type} ·{" "}
                        {calendarDay(i.occurredAt, p.settings.timezone)}
                      </li>
                    ))}
                </ul>
                {!report.interactions.length && (
                  <p>No saved conversations match.</p>
                )}
              </section>
            </>
          )}
          {section === "Opportunities" && (
            <>
              <section className="surface">
                <h2>Current pipeline snapshot</h2>
                <p>
                  {report.active.length} open · {report.won.length} won ·{" "}
                  {report.lost.length} lost. Win rate:{" "}
                  {report.winRate === null
                    ? filter.outcome
                      ? "Unavailable while an outcome filter is selected"
                      : "Not applicable — no closed outcomes"
                    : `${Math.round(report.winRate * 100)}% of currently won + lost`}
                  .
                </p>
                <h3>Open value by currency</h3>
                {report.currency.length ? (
                  report.currency.map(([currency, value]) => (
                    <p key={currency}>
                      {currency}{" "}
                      {new Intl.NumberFormat(p.settings.locale, {
                        maximumFractionDigits: 2,
                      }).format(value)}
                    </p>
                  ))
                ) : (
                  <p>No open values recorded.</p>
                )}
                <h3>Stage distribution</h3>
                <p className="muted">
                  Select a stage to inspect its opportunities.
                </p>
                <div
                  className="analytics-bars"
                  role="group"
                  aria-label="Current opportunity counts by stage"
                >
                  {p.pipelineStages
                    .filter((s) =>
                      report.opportunities.some((o) => o.stageId === s.id),
                    )
                    .map((s) => {
                      const n = report.opportunities.filter(
                          (o) => o.stageId === s.id,
                        ).length,
                        max = Math.max(
                          1,
                          ...p.pipelineStages.map(
                            (x) =>
                              report.opportunities.filter(
                                (o) => o.stageId === x.id,
                              ).length,
                          ),
                        );
                      return (
                        <button
                          key={s.id}
                          className="analytics-bar"
                          aria-label={`${s.name}: ${n} opportunities`}
                          aria-pressed={selectedStage === s.id}
                          onClick={() =>
                            setSelectedStage(selectedStage === s.id ? "" : s.id)
                          }
                        >
                          <span
                            className="analytics-bar-fill"
                            style={{
                              height: `${Math.max(8, (n / max) * 110)}px`,
                            }}
                          />
                          <strong>{n}</strong>
                          <small>{s.name}</small>
                        </button>
                      );
                    })}
                </div>
                {selectedStage && (
                  <button
                    className="button ghost"
                    onClick={() => setSelectedStage("")}
                  >
                    Clear stage selection
                  </button>
                )}
                <h3>Current stages</h3>
                {p.pipelines
                  .filter(
                    (x) => !filter.pipelineId || x.id === filter.pipelineId,
                  )
                  .map((pipe) => (
                    <div key={pipe.id}>
                      <strong>{pipe.name}</strong>
                      <ul>
                        {p.pipelineStages
                          .filter((s) => s.pipelineId === pipe.id)
                          .map((s) => (
                            <li key={s.id}>
                              {s.name} · {s.category}:{" "}
                              {
                                report.opportunities.filter(
                                  (o) =>
                                    o.stageId === s.id &&
                                    o.pipelineId === pipe.id,
                                ).length
                              }
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </section>
              <section className="surface">
                <h2>Recorded stage movements</h2>
                <p className="muted">
                  Tracking begins with this release. Earlier stage entry and
                  duration are unknown. Names below were captured when each
                  movement occurred.
                </p>
                {report.transitions.length ? (
                  <ul>
                    {report.transitions
                      .slice(-100)
                      .reverse()
                      .map((t) => (
                        <li key={t.id}>
                          {t.previousPipelineName} / {t.previousStageName} →{" "}
                          {t.pipelineName} / {t.stageName} ·{" "}
                          {calendarDay(t.occurredAt, p.settings.timezone)} ·{" "}
                          {t.source}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No tracked movements in this period.</p>
                )}
                <h3>Completed tracked stage stays</h3>
                {report.completedStageDurations.length ? (
                  report.completedStageDurations.map((g) => (
                    <p key={JSON.stringify([g.pipelineId, g.stageId, g.label])}>
                      {g.label}: {g.days.length} observed · average{" "}
                      {g.average.toFixed(1)} days · median {g.median.toFixed(1)}{" "}
                      days
                    </p>
                  ))
                ) : (
                  <p>Insufficient recorded entry and exit history.</p>
                )}
                <h3>Current stage age</h3>
                <ul>
                  {report.currentStageAge
                    .slice(0, 50)
                    .map(({ opportunity: o, days }) => (
                      <li key={o.id}>
                        <button
                          className="button ghost"
                          onClick={() =>
                            setEditor({ kind: "opportunity", record: o })
                          }
                        >
                          {o.title}
                        </button>{" "}
                        ·{" "}
                        {days === null
                          ? "Insufficient tracked history"
                          : `${days} days since recorded entry`}
                      </li>
                    ))}
                </ul>
              </section>
              <section className="surface">
                <h2>Opportunities to review</h2>
                <p className="muted">
                  Based on the same evidence and thresholds used in Relationship
                  Review.
                </p>
                {p.intelligence.opportunities
                  .filter(
                    (i) =>
                      i.flags.length &&
                      report.opportunities.some(
                        (o) => o.id === i.opportunityId,
                      ),
                  )
                  .slice(0, 30)
                  .map((i) => {
                    const o = report.opportunities.find(
                      (x) => x.id === i.opportunityId,
                    )!;
                    return (
                      <article key={o.id} className="automation-history">
                        <h3>{o.title}</h3>
                        <p>{i.reason}</p>
                        <button
                          className="button secondary"
                          onClick={() =>
                            setEditor({ kind: "opportunity", record: o })
                          }
                        >
                          Open opportunity
                        </button>
                        <FocusButton type="opportunity" id={o.id} />
                      </article>
                    );
                  })}
                <Link to="/automations">
                  Create a reviewed automation draft
                </Link>
              </section>
              <section className="surface">
                <h2>Opportunity records</h2>
                {report.opportunities
                  .filter((o) => !selectedStage || o.stageId === selectedStage)
                  .slice(0, 100)
                  .map((o) => (
                    <p key={o.id}>
                      <button
                        className="button ghost"
                        onClick={() =>
                          setEditor({ kind: "opportunity", record: o })
                        }
                      >
                        {o.title}
                      </button>{" "}
                      · {o.status} · {o.currency} {o.value ?? "not recorded"}
                    </p>
                  ))}
              </section>
            </>
          )}
          {section === "Productivity" && (
            <>
              <section className="surface">
                <h2>Follow-ups</h2>
                <p>
                  {report.completed.length} completed in period ·{" "}
                  {report.due.length} due in period · {report.open.length}{" "}
                  currently open · {report.overdue.length} currently overdue.
                </p>
                <p className="muted">
                  Due date and completion date are separate cohorts. Historic
                  on-time rates are unavailable because previous due-date
                  changes are not recorded.
                </p>
                <Link
                  className="button secondary"
                  to="/activity?filter=overdue"
                >
                  Review overdue follow-ups
                </Link>
                <Link className="button ghost" to="/focus">
                  Open My Focus
                </Link>
              </section>
              <section className="surface">
                <h2>Completion trend</h2>
                <p className="muted">
                  Select a date to inspect completed follow-ups.{" "}
                  {report.range.days > 90
                    ? "Grouped by month."
                    : "Grouped by workspace calendar day."}
                </p>
                <div
                  className="analytics-bars"
                  role="group"
                  aria-label="Completed follow-ups over time"
                >
                  {Array.from(
                    report.completed.reduce((m, t) => {
                      const d = calendarDay(
                          t.completedAt!,
                          p.settings.timezone,
                        ),
                        bucket = report.range.days > 90 ? d.slice(0, 7) : d;
                      m.set(bucket, (m.get(bucket) || 0) + 1);
                      return m;
                    }, new Map<string, number>()),
                  )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([d, n]) => (
                      <button
                        key={d}
                        className="analytics-bar"
                        aria-label={`${d}: ${n} completed follow-ups`}
                        aria-pressed={selectedDay === d}
                        onClick={() =>
                          setSelectedDay(selectedDay === d ? "" : d)
                        }
                      >
                        <span
                          className="analytics-bar-fill"
                          style={{
                            height: `${Math.max(8, (n / Math.max(1, report.completed.length)) * 110)}px`,
                          }}
                        />
                        <strong>{n}</strong>
                        <small>{d}</small>
                      </button>
                    ))}
                </div>
                {!report.completed.length && (
                  <p>No completion trend recorded for this period.</p>
                )}
              </section>
              <section className="surface">
                <h2>Completed in this period</h2>
                {report.completed
                  .filter(
                    (t) =>
                      !selectedDay ||
                      calendarDay(
                        t.completedAt!,
                        p.settings.timezone,
                      ).startsWith(selectedDay),
                  )
                  .slice(0, 100)
                  .map((t) => (
                    <p key={t.id}>
                      {t.title} ·{" "}
                      {calendarDay(t.completedAt!, p.settings.timezone)}{" "}
                      {t.contactId && (
                        <Link to={`/network/people/${t.contactId}`}>
                          Open person
                        </Link>
                      )}
                    </p>
                  ))}
                {!report.completed.length && (
                  <p>No completed follow-ups in this period.</p>
                )}
              </section>
            </>
          )}
          {section === "Data quality" && (
            <section className="surface">
              <h2>Details to review</h2>
              <p className="muted">
                A missing field can be intentional; these are observations, not
                a score.
              </p>
              {[
                ["People without a company", report.issues.noCompany],
                ["People without email or phone", report.issues.noContact],
                [
                  "People without a recorded conversation",
                  report.issues.noHistory,
                ],
              ].map(([title, rows]) => (
                <div key={title as string}>
                  <h3>
                    {title as string} · {(rows as typeof p.contacts).length}
                  </h3>
                  <ul>
                    {(rows as typeof p.contacts).slice(0, 20).map((c) => (
                      <li key={c.id}>
                        <Link to={`/network/people/${c.id}`}>{c.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <h3>
                Opportunities missing close dates ·{" "}
                {report.issues.noClose.length}
              </h3>
              {report.issues.noClose.slice(0, 20).map((o) => (
                <button
                  key={o.id}
                  className="button ghost"
                  onClick={() => setEditor({ kind: "opportunity", record: o })}
                >
                  {o.title}
                </button>
              ))}
              <h3>
                Companies without representatives ·{" "}
                {report.issues.noCompanyRepresentatives.length}
              </h3>
              {report.issues.noCompanyRepresentatives.slice(0, 20).map((o) => (
                <p key={o.id}>
                  <Link to={`/network/companies/${o.id}`}>{o.name}</Link>
                </p>
              ))}
              <h3>
                Follow-ups without a person or company ·{" "}
                {report.issues.unlinkedTasks.length}
              </h3>
              {report.issues.unlinkedTasks.length > 0 && (
                <Link to="/activity?filter=all">Review follow-ups</Link>
              )}
              <h3>
                Opportunities without representatives ·{" "}
                {report.issues.noRepresentative.length}
              </h3>
              {report.issues.noRepresentative.slice(0, 20).map((o) => (
                <button
                  key={o.id}
                  className="button ghost"
                  onClick={() => setEditor({ kind: "opportunity", record: o })}
                >
                  {o.title}
                </button>
              ))}
            </section>
          )}
        </>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
