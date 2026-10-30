import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { AnalyticsBrief } from "./AnalyticsBrief";
import { setFocus } from "../data/expansion-repository";
import { upcomingCommitments } from "../services/weekly-review";
import { useFormat } from "../components/ui";
import { ContextTip } from "../components/context-tip";
import {
  analyticsDisplayTrend,
  inAnalyticsBucket,
} from "../services/analytics-guidance";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const { date } = useFormat();
  const navigationState = useLocation().state as {
    profileReturn?: unknown;
    networkReturn?: unknown;
    reviewReturn?: unknown;
    focusReturn?: unknown;
  } | null;
  const profileReturn =
    typeof navigationState?.profileReturn === "string" &&
    /^\/network\/(people|companies)\/[^/?#]+$/.test(
      navigationState.profileReturn,
    )
      ? navigationState.profileReturn
      : null;
  const focusReturn = typeof navigationState?.focusReturn === "string" && /^\/focus(?:\?view=(today|ahead|saved|completed))?$/.test(navigationState.focusReturn) ? navigationState.focusReturn : null;
  const p = usePulse(),
    [params] = useSearchParams(),
    transitions = useLiveQuery(() => p.db.transitions.toArray(), [p.db]) || [];
  const today = calendarDay(Date.now(), p.settings.timezone);
  const [filter, setFilterState] = useState<ReportFilter>({
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
  const [section, setSectionState] =
      useState<(typeof sections)[number]>("Overview"),
    [selectedDay, setSelectedDay] = useState(""),
    [selectedStage, setSelectedStage] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null);
  const setSection = (next: (typeof sections)[number]) => {
    // Overview counts all conversation types; its drill-down must preserve that cohort.
    if (section === "Overview" && next === "Relationships")
      setFilterState((previous) => ({ ...previous, interactionType: "" }));
    setSectionState(next);
  };
  const [filtersOpen, setFiltersOpen] = useState(
    !!params.get("person") || !!params.get("company"),
  );
  const setFilter = (next: ReportFilter) => {
    setFilterState(next);
    setSelectedDay("");
    setSelectedStage("");
  };
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
  const weekly = useMemo(
    () =>
      calculateAnalytics(
        { ...p, transitions, relationships: p.intelligence.relationships },
        { ...filters, preset: "7", interactionType: "" },
      ),
    [p, transitions, filter, section],
  );
  const upcoming = upcomingCommitments(weekly.open, p.settings.timezone);
  const person = (id: string | null) => p.contacts.find((c) => c.id === id);
  function exportCsv() {
    if (!report) return;
    const rows: (string | number | null)[][] = [
      ["Report", "Record", "Date or stage", "Value", "Currency"],
    ];
    if (section === "Overview" || section === "Relationships")
      for (const i of report.interactions.filter((i) =>
        inAnalyticsBucket(i.occurredAt, selectedDay, p.settings.timezone),
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
      for (const t of report.completed.filter((t) =>
        inAnalyticsBucket(t.completedAt!, selectedDay, p.settings.timezone),
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
      {profileReturn && (
        <Link
          className="text-link connected-return"
          to={profileReturn}
          state={{
            networkReturn: navigationState?.networkReturn,
            reviewReturn: navigationState?.reviewReturn,
            focusReturn: navigationState?.focusReturn,
          }}
        >
          {__pulseText("← Return to profile")}</Link>
      )}
      {!profileReturn && focusReturn && <Link className="text-link connected-return" to={focusReturn}>{__pulseText("← Back to My Focus")}</Link>}
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">{__pulseText("YOUR WORK, IN CONTEXT")}</p>
          <h1>
            {t("analytics")}<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            {t("analyticsIntro")}
          </p>
        </div>
        <div className="form-actions">
          <Link className="button secondary" to="/automations">
            {__pulseText("Open Automations")}</Link>
          <button
            className="button secondary"
            disabled={!report}
            onClick={exportCsv}
          >
            {t("exportReport")}
          </button>
        </div>
      </div>
      <section className="analytics-filters" aria-label={__pulseText("Report filters")}>
        <div className="form-grid">
          <label className="field">
            <span>{__pulseText("Date range")}</span>
            <select
              value={filter.preset}
              onChange={(e) => {
                setFilter({ ...filter, preset: e.target.value as DatePreset });
                setSelectedDay("");
              }}
            >
              <option value="7">{__pulseText("Last 7 days")}</option>
              <option value="30">{__pulseText("Last 30 days")}</option>
              <option value="90">{__pulseText("Last 90 days")}</option>
              <option value="month">{__pulseText("This month")}</option>
              <option value="year">{__pulseText("This year")}</option>
              <option value="custom">{__pulseText("Custom range")}</option>
            </select>
          </label>
          {filter.preset === "custom" && (
            <>
              <label className="field">
                <span>{__pulseText("From")}</span>
                <input
                  type="date"
                  value={filter.start}
                  onChange={(e) =>
                    setFilter({ ...filter, start: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>{__pulseText("Through")}</span>
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
          <details
            className="analytics-scope"
            open={filtersOpen}
            onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
          >
            <summary>
              {__pulseText("Refine report")}{filter.personId ||
              filter.organizationId ||
              filter.priority ||
              filter.category
                ? __pulseText(" · scoped")
                : ""}
            </summary>
            <div className="form-grid">
              <label className="field">
                <span>{__pulseText("Company")}</span>
                <select
                  value={filter.organizationId}
                  onChange={(e) =>
                    setFilter({ ...filter, organizationId: e.target.value })
                  }
                >
                  <option value="">{__pulseText("All companies")}</option>
                  {p.organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Person")}</span>
                <select
                  value={filter.personId}
                  onChange={(e) =>
                    setFilter({ ...filter, personId: e.target.value })
                  }
                >
                  <option value="">{__pulseText("All people")}</option>
                  {p.contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Contact priority")}</span>
                <select
                  value={filter.priority}
                  onChange={(e) =>
                    setFilter({ ...filter, priority: e.target.value })
                  }
                >
                  <option value="">{__pulseText("All priorities")}</option>
                  {priorities.map((x) => (
                    <option key={x} value={x}>{__pulseText(x)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Contact category")}</span>
                <select
                  value={filter.category}
                  onChange={(e) =>
                    setFilter({ ...filter, category: e.target.value })
                  }
                >
                  <option value="">{__pulseText("All categories")}</option>
                  {categories.map((x) => (
                    <option key={x} value={x}>{__pulseText(x)}</option>
                  ))}
                </select>
              </label>
              {section === "Opportunities" && (
                <>
                  <label className="field">
                    <span>{__pulseText("Pipeline")}</span>
                    <select
                      value={filter.pipelineId}
                      onChange={(e) =>
                        setFilter({ ...filter, pipelineId: e.target.value })
                      }
                    >
                      <option value="">{__pulseText("All pipelines")}</option>
                      {p.pipelines.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{__pulseText("Current outcome")}</span>
                    <select
                      value={filter.outcome}
                      onChange={(e) =>
                        setFilter({ ...filter, outcome: e.target.value })
                      }
                    >
                      <option value="">{__pulseText("All outcomes")}</option>
                      <option value="open">{__pulseText("Open")}</option>
                      <option value="won">{__pulseText("Won")}</option>
                      <option value="lost">{__pulseText("Lost")}</option>
                    </select>
                  </label>
                </>
              )}
              {section === "Relationships" && (
                <label className="field">
                  <span>{__pulseText("Interaction type")}</span>
                  <select
                    value={filter.interactionType}
                    onChange={(e) =>
                      setFilter({ ...filter, interactionType: e.target.value })
                    }
                  >
                    <option value="">{__pulseText("All conversations")}</option>
                    {["Call", "Email", "Meeting", "Message"].map((x) => (
                      <option key={x} value={x}>{__pulseText(x)}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              className="button ghost"
              onClick={() =>
                setFilter({
                  ...filter,
                  personId: "",
                  organizationId: "",
                  priority: "",
                  category: "",
                  pipelineId: "",
                  outcome: "",
                  interactionType: "",
                })
              }
            >
              {__pulseText("Clear record filters")}</button>
            <p className="muted">
              {__pulseText("Calendar dates in") + " "}{p.settings.timezone}{__pulseText(". Company activity follows the company saved on each conversation. Pipeline/outcome filters apply to opportunities; interaction type applies to conversations.")}</p>
          </details>
        </div>
      </section>
      <nav className="analytics-room-nav" aria-label={__pulseText("Analytics sections")}>
        {([ ["Overview", "The big picture", "Summary and direction"], ["Relationships", "Relationships", "Conversations and people"], ["Opportunities", "Opportunities", "Pipeline and movement"], ["Productivity", "Workspace health", "Follow-ups and data quality"] ] as const).map(([target, title, description], i) => <button key={target} aria-pressed={target === "Productivity" ? section === "Productivity" || section === "Data quality" : section === target} onClick={() => {setSection(target); setSelectedDay(""); setSelectedStage("");}}><span>0{i+1}</span><strong>{__pulseText(title)}</strong><small>{__pulseText(description)}</small></button>)}
      </nav>
      {(section === "Productivity" || section === "Data quality") && <nav className="analytics-health-nav" aria-label={__pulseText("Workspace health views")}><button aria-pressed={section === "Productivity"} onClick={() => setSection("Productivity")}>{__pulseText("Follow-ups")}</button><button aria-pressed={section === "Data quality"} onClick={() => setSection("Data quality")}>{__pulseText("Data quality")}</button></nav>}
      <ContextTip title="Read the story behind the numbers">Choose a section to explore relationships, opportunities, productivity or missing context. Date filters describe recorded activity; current-state counts are labeled separately.</ContextTip>
      {section !== "Overview" && <div className="analytics-section-intro" key={section}><p className="eyebrow">{__pulseText("YOUR WORK THROUGH A DIFFERENT LENS")}</p><h2>{__pulseText(section === "Relationships" ? "See who is part of your story." : section === "Opportunities" ? "Follow the possibilities in motion." : section === "Productivity" ? "Make room for meaningful progress." : "Give your records more context.")}</h2><p>{__pulseText(section === "Relationships" ? "Explore recorded conversations and the relationships behind them." : section === "Opportunities" ? "Explore saved values, stages, and actual movement." : section === "Productivity" ? "Review follow-ups and activity you have recorded." : "Find missing details that can make your workspace more useful.")}</p></div>}
      {result.error && (
        <p role="alert" className="form-error">
          {__pulseText(result.error)}
        </p>
      )}
      {report && (
        <>
          <p className="muted">
            {report.range.start} {" " + __pulseText("through") + " "}{report.range.end} {" " + __pulseText("· current-state figures are labeled below.")}</p>
          {section === "Overview" && (
            <>
              <AnalyticsBrief
                report={report}
                onEdit={setEditor}
                onSection={setSection}
                onCompany={(id) => {
                  setFilter({ ...filter, organizationId: id, personId: "" });
                  setFiltersOpen(true);
                }}
              />
              <details className="weekly-review-disclosure"><summary>{__pulseText("Review your week and upcoming commitments")}</summary><section
                className="weekly-review"
                aria-labelledby="weekly-review-title"
              >
                <div>
                  <p className="eyebrow">{__pulseText("A WEEK IN PERSPECTIVE")}</p>
                  <h2 id="weekly-review-title">
                    {__pulseText("See what moved. Decide what matters.")}</h2>
                  <p>
                    {__pulseText("Last seven days in your workspace timezone. Current overdue work is shown separately.")}</p>
                </div>
                <div className="weekly-review-facts">
                  <div>
                    <strong>{weekly.interactions.length}</strong>
                    <span>{__pulseText("recorded conversations")}</span>
                  </div>
                  <div>
                    <strong>{weekly.completed.length}</strong>
                    <span>{__pulseText("completed follow-ups")}</span>
                  </div>
                  <div>
                    <strong>{weekly.overdue.length}</strong>
                    <span>{__pulseText("overdue now")}</span>
                  </div>
                  <div><strong>{weekly.transitions.length}</strong><span>{__pulseText("recorded stage changes")}</span></div>
                </div>
                <div className="weekly-next">
                  <div><p className="eyebrow">{__pulseText("LOOKING AHEAD · NEXT 7 DAYS")}</p><h3>{__pulseText("Keep your commitments close.")}</h3><p>{__pulseText("Open follow-ups due today or in the next six days, in your workspace timezone. Choose a focus date without changing the due date.")}</p></div>
                  <div className="weekly-next-list">{upcoming.slice(0, 4).map((task) => <article key={task.id}><div><button className="weekly-task-link" onClick={() => setEditor({kind: "task", record: task})}>{task.title}</button><small>{__pulseText("Due")} {date(task.dueAt)}</small></div><form onSubmit={(e) => { e.preventDefault(); const chosen = String(new FormData(e.currentTarget).get("day") || ""); if (chosen) void p.run(() => setFocus(p.db, "task", task.id, "today", chosen), "Focus updated"); }}><label><span>{__pulseText("Focus date")}</span><input type="date" name="day" min={today} defaultValue={today} required /></label><button className="button secondary">{__pulseText("Add to Focus")}</button></form></article>)}{!upcoming.length && <p>{__pulseText("No open follow-ups due in the next seven days. Visit My Focus to choose what matters next.")}</p>}{upcoming.length > 4 && <Link to="/activity">{__pulseText("See all follow-ups")}</Link>}</div>
                </div>
                <div className="weekly-review-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setFilter({ ...filter, preset: "7" });
                      setSection("Relationships");
                    }}
                  >
                    {__pulseText("Explore this week’s conversations")}</button>
                  <Link className="button ghost" to="/review">
                    {__pulseText("Review priorities")}</Link>
                  <Link className="button ghost" to="/focus">
                    {__pulseText("Plan your focus")}</Link>
                </div>
              </section></details>

            </>
          )}
          {(section === "Overview" || section === "Relationships") && (
            <section className="surface analytics-chart">
              <h2>{__pulseText("Recorded conversations over time")}</h2>
              <p className="muted">
                {__pulseText("Select a bar to inspect its underlying conversations.")}{" "}
                {report.range.days > 90
                  ? __pulseText("Grouped by month.")
                  : section === "Overview" && report.range.days > 14
                    ? __pulseText("Seven-day groups starting at the report’s first date. Select one to inspect its exact records.")
                    : __pulseText("Grouped by workspace calendar day.")}
              </p>
              {report.interactions.length ? (
                <div
                  className="analytics-bars"
                  role="group"
                  aria-label={__pulseText("Conversation activity by date")}
                >
                  {analyticsDisplayTrend(
                    report,
                    section === "Overview",
                    p.settings.timezone,
                  ).map(([d, n]) => (
                    <button
                      key={d}
                      className="analytics-bar"
                      aria-pressed={selectedDay === d}
                      title={__pulseText("{0} conversations · {1}", n, d.replace("..", " through "))}
                      onClick={() => {
                        setSelectedDay(selectedDay === d ? "" : d);
                        setSection("Relationships");
                      }}
                    >
                      <span
                        className="analytics-bar-fill"
                        style={{
                          height: `${n ? Math.max(8, (n / Math.max(1, ...analyticsDisplayTrend(report, section === "Overview", p.settings.timezone).map((x) => x[1]))) * 110) : 0}px`,
                        }}
                      />
                      <strong>{n}</strong>
                      <small>
                        {d.includes("..")
                          ? `${d.slice(5, 10)} – ${d.slice(17)}`
                          : d.length === 10
                            ? d.slice(5)
                            : d}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <p>
                  {__pulseText("No meaningful conversations in this range.")}{" "}
                  <Link to="/network">{__pulseText("Open Network")}</Link> {" " + __pulseText("to log one.")}</p>
              )}
            </section>
          )}
          {section === "Relationships" && (
            <>
              <section className="surface">
                <h2>{__pulseText("Relationship status now")}</h2>
                <p className="muted">
                  {__pulseText("Uses your existing relationship review rules; this is recorded activity, not a measure of sentiment.")}</p>
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
                      <p>{__pulseText(h)}</p>
                    </div>
                  ))}
                </div>
                <Link to="/review">{__pulseText("Open relationship review")}</Link>
              </section>
              <section className="surface">
                <h2>
                  {selectedDay
                    ? `Conversations · ${selectedDay.replace("..", " through ")}`
                    : __pulseText("Conversations in this period")}
                </h2>
                {selectedDay && (
                  <button
                    className="button ghost"
                    onClick={() => setSelectedDay("")}
                  >
                    {__pulseText("Clear date selection")}</button>
                )}
                <ul className="analytics-records">
                  {report.interactions
                    .filter((i) =>
                      inAnalyticsBucket(
                        i.occurredAt,
                        selectedDay,
                        p.settings.timezone,
                      ),
                    )
                    .slice(0, 100)
                    .map((i) => (
                      <li key={i.id}>
                        {i.contactId ? (
                          <Link to={`/network/people/${i.contactId}`}>
                            {person(i.contactId)?.name || __pulseText("Person")}
                          </Link>
                        ) : i.organizationId ? (
                          <Link to={`/network/companies/${i.organizationId}`}>
                            {p.organizations.find(
                              (o) => o.id === i.organizationId,
                            )?.name || __pulseText("Company")}
                          </Link>
                        ) : (
                          __pulseText("Unlinked")
                        )}{" "}
                        · {i.type} ·{" "}
                        {calendarDay(i.occurredAt, p.settings.timezone)}
                      </li>
                    ))}
                </ul>
                {!report.interactions.length && (
                  <p>{__pulseText("No saved conversations match.")}</p>
                )}
                {selectedDay &&
                  report.interactions.length > 0 &&
                  !report.interactions.some((i) =>
                    inAnalyticsBucket(
                      i.occurredAt,
                      selectedDay,
                      p.settings.timezone,
                    ),
                  ) && <p>{__pulseText("No conversations recorded for this selected date.")}</p>}
              </section>
            </>
          )}
          {section === "Opportunities" && (
            <>
              <section className="surface">
                <h2>{__pulseText("Current pipeline snapshot")}</h2>
                <p>
                  {report.active.length} {" " + __pulseText("open ·") + " "}{report.won.length} {" " + __pulseText("won ·")}{" "}
                  {report.lost.length} {" " + __pulseText("lost. Win rate:")}{" "}
                  {report.winRate === null
                    ? filter.outcome
                      ? __pulseText("Unavailable while an outcome filter is selected")
                      : __pulseText("Not applicable — no closed outcomes")
                    : `${Math.round(report.winRate * 100)}% of currently won + lost`}
                  .
                </p>
                <h3>{__pulseText("Open value by currency")}</h3>
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
                  <p>{__pulseText("No open values recorded.")}</p>
                )}
                <h3>{__pulseText("Stage distribution")}</h3>
                <p className="muted">
                  {__pulseText("Select a stage to inspect its opportunities.")}</p>
                <div
                  className="analytics-bars"
                  role="group"
                  aria-label={__pulseText("Current opportunity counts by stage")}
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
                          aria-label={__pulseText("{0}: {1} opportunities", s.name, n)}
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
                    {__pulseText("Clear stage selection")}</button>
                )}
                <h3>{__pulseText("Current stages")}</h3>
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
                <h2>{__pulseText("Recorded stage movements")}</h2>
                <p className="muted">
                  {__pulseText("Tracking begins with saved stage transitions. Earlier stage entry and duration are unknown. Names below were captured when each movement occurred.")}</p>
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
                  <p>{__pulseText("No tracked movements in this period.")}</p>
                )}
                <h3>{__pulseText("Completed tracked stage stays")}</h3>
                {report.completedStageDurations.length ? (
                  report.completedStageDurations.map((g) => (
                    <p key={JSON.stringify([g.pipelineId, g.stageId, g.label])}>
                      {g.label}: {g.days.length} {" " + __pulseText("observed · average")}{" "}
                      {g.average.toFixed(1)} {" " + __pulseText("days · median") + " "}{g.median.toFixed(1)}{" "}
                      {__pulseText("days")}</p>
                  ))
                ) : (
                  <p>{__pulseText("Insufficient recorded entry and exit history.")}</p>
                )}
                <h3>{__pulseText("Current stage age")}</h3>
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
                          ? __pulseText("Insufficient tracked history")
                          : `${days} days since recorded entry`}
                      </li>
                    ))}
                </ul>
              </section>
              <section className="surface">
                <h2>{__pulseText("Opportunities to review")}</h2>
                <p className="muted">
                  {__pulseText("Based on the same evidence and thresholds used in Relationship Review.")}</p>
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
                          {__pulseText("Open opportunity")}</button>
                        <FocusButton type="opportunity" id={o.id} />
                      </article>
                    );
                  })}
                <Link to="/automations">
                  {__pulseText("Create a reviewed automation draft")}</Link>
              </section>
              <section className="surface">
                <h2>{__pulseText("Opportunity records")}</h2>
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
                <h2>{__pulseText("Follow-ups")}</h2>
                <p>
                  {report.completed.length} {" " + __pulseText("completed in period ·")}{" "}
                  {report.due.length} {" " + __pulseText("due in period ·") + " "}{report.open.length}{" "}
                  {__pulseText("currently open ·") + " "}{report.overdue.length} {" " + __pulseText("currently overdue.")}</p>
                <p className="muted">
                  {__pulseText("Due date and completion date are separate cohorts. Historic on-time rates are unavailable because previous due-date changes are not recorded.")}</p>
                <Link
                  className="button secondary"
                  to="/activity?filter=overdue"
                >
                  {__pulseText("Review overdue follow-ups")}</Link>
                <Link className="button ghost" to="/focus">
                  {__pulseText("Open My Focus")}</Link>
              </section>
              <section className="surface">
                <h2>{__pulseText("Completion trend")}</h2>
                <p className="muted">
                  {__pulseText("Select a date to inspect completed follow-ups.")}{" "}
                  {report.range.days > 90
                    ? __pulseText("Grouped by month.")
                    : __pulseText("Grouped by workspace calendar day.")}
                </p>
                <div
                  className="analytics-bars"
                  role="group"
                  aria-label={__pulseText("Completed follow-ups over time")}
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
                        aria-label={__pulseText("{0}: {1} completed follow-ups", d, n)}
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
                  <p>{__pulseText("No completion trend recorded for this period.")}</p>
                )}
              </section>
              <section className="surface">
                <h2>{__pulseText("Completed in this period")}</h2>
                {report.completed
                  .filter((t) =>
                    inAnalyticsBucket(
                      t.completedAt!,
                      selectedDay,
                      p.settings.timezone,
                    ),
                  )
                  .slice(0, 100)
                  .map((t) => (
                    <p key={t.id}>
                      {t.title} ·{" "}
                      {calendarDay(t.completedAt!, p.settings.timezone)}{" "}
                      {t.contactId && (
                        <Link to={`/network/people/${t.contactId}`}>
                          {__pulseText("Open person")}</Link>
                      )}
                    </p>
                  ))}
                {!report.completed.length && (
                  <p>{__pulseText("No completed follow-ups in this period.")}</p>
                )}
              </section>
            </>
          )}
          {section === "Data quality" && (
            <section className="surface">
              <h2>{__pulseText("Details to review")}</h2>
              <p className="muted">
                {__pulseText("A missing field can be intentional; these are observations, not a score.")}</p>
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
                    {__pulseText(title as string)} · {(rows as typeof p.contacts).length}
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
                {__pulseText("Opportunities missing close dates ·")}{" "}
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
                {__pulseText("Companies without representatives ·")}{" "}
                {report.issues.noCompanyRepresentatives.length}
              </h3>
              {report.issues.noCompanyRepresentatives.slice(0, 20).map((o) => (
                <p key={o.id}>
                  <Link to={`/network/companies/${o.id}`}>{o.name}</Link>
                </p>
              ))}
              <h3>
                {__pulseText("Follow-ups without a person or company ·")}{" "}
                {report.issues.unlinkedTasks.length}
              </h3>
              {report.issues.unlinkedTasks.length > 0 && (
                <Link to="/activity?filter=all">{__pulseText("Review follow-ups")}</Link>
              )}
              <h3>
                {__pulseText("Opportunities without representatives ·")}{" "}
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
