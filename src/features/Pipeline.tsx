import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { ArrowRight, ArrowUpRight, Plus, Sparkles, LayoutGrid, List, Columns3 } from "lucide-react";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Badge, Empty, useFormat } from "../components/ui";
import { PipelineOpportunity } from "./PipelineOpportunity";
import { OpportunityBrief } from "./OpportunityBrief";
import { EditorModal, type Editor } from "../components/forms";
import { moveOpportunity } from "../data/repository";
import { pipelineStudio } from "../services/pipeline-studio";

export function Pipeline() {
  const text = useInterfaceText(), t = useTranslation(), { money, date } = useFormat(), p = usePulse();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<"overview" | "board" | "list">("overview");
  const [lens, setLens] = useState<"all" | "review" | "closing" | "missing">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("attention");
  const [limit, setLimit] = useState(30);
  const [showEmpty, setShowEmpty] = useState(false);
  const transitions = useLiveQuery(() => p.db.transitions.orderBy("occurredAt").reverse().limit(100).toArray(), [p.db]) || [];
  const selected = p.pipelines.find((x) => x.id === (selectedId || p.settings.focus.lastPipelineId)) || p.pipelines.find((x) => x.isDefault) || p.pipelines[0];
  const rows = p.opportunities.filter((o) => o.pipelineId === selected?.id);
  const stages = p.pipelineStages.filter((s) => s.pipelineId === selected?.id);
  const summary = pipelineStudio(rows, p.tasks, p.interactions, p.intelligence.opportunities, p.settings.timezone);
  const totals = new Map<string, number>();
  for (const o of rows) if (o.value !== null) {
    const key = `${o.status} · ${o.currency}`;
    totals.set(key, (totals.get(key) || 0) + o.value);
  }
  const inLens = lens === "review" ? summary.needsReview : lens === "closing" ? summary.closingSoon : lens === "missing" ? summary.noFollowUp : summary.open;
  const searchTerm = search.trim().toLowerCase();
  const filtered = (view === "overview" ? inLens : rows).filter((o) =>
    (stageFilter === "All" || o.stageId === stageFilter) && (!searchTerm || [o.title, p.organizations.find((org) => org.id === o.organizationId)?.name || ""].some((s) => s.toLowerCase().includes(searchTerm)))
  ).sort((a,b) => {
    if (sort === "name") return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    if (sort === "close") return (a.expectedCloseAt || "9999").localeCompare(b.expectedCloseAt || "9999") || a.title.localeCompare(b.title);
    if (sort === "recent") return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
    const ia = p.intelligence.opportunities.find((i) => i.opportunityId === a.id), ib = p.intelligence.opportunities.find((i) => i.opportunityId === b.id);
    return (ia?.flags.length ? ia.rank : 999) - (ib?.flags.length ? ib.rank : 999) || a.title.localeCompare(b.title);
  });
  const activeStages = stages.filter((s) => stageFilter === "All" ? showEmpty || filtered.some((o) => o.stageId === s.id) : s.id === stageFilter);
  const recent = transitions.filter((tr) => tr.pipelineId === selected?.id && tr.source === "user" && rows.some((o) => o.id === tr.opportunityId)).slice(0, 4);
  const lensNames = { all: "Open opportunities", review: "Needs attention", closing: "Closing in 14 days", missing: "No related follow-up" };
  const renderDeal = (o: typeof rows[number]) => (
    <div key={o.id} className="pipeline-deal studio-deal-wrap">
      <PipelineOpportunity opportunity={o} onEdit={setEditor} onReview={setBriefId} />
      <label className="field studio-move">
        <span>{text("Move to stage / reopen")}</span>
        <select value={o.stageId} onChange={(e) => void p.run(() => moveOpportunity(p.db, o.id, e.target.value), "Opportunity updated")}>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
        </select>
      </label>
    </div>
  );
  return (
    <div className="page pipeline-page pipeline-studio">
      <header className="studio-pipeline-hero">
        <div className="studio-hero-copy">
          <span className="studio-hero-kicker"><Sparkles size={16} /> {text("YOUR WORK, IN MOTION")}</span>
          <h1>{text("Pipeline")}<em>{text(" studio.")}</em></h1>
          <p>{text("See what’s moving, understand what needs attention, and make your next move with context.")}</p>
          <div className="studio-hero-actions">
            <button className="button studio-hero-primary" disabled={!selected || selected.archived} onClick={() => setEditor({kind:"opportunity",pipelineId:selected?.id})}><Plus size={18} />{t("newOpportunity")}</button>
            <Link className="studio-hero-link" to="/focus">{text("Open My Focus")} <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className="studio-hero-art" aria-hidden="true"><div className="studio-orbit studio-orbit-a"/><div className="studio-orbit studio-orbit-b"/><div className="studio-orbit-core">✳</div><span className="studio-orbit-dot dot-one"/><span className="studio-orbit-dot dot-two"/><span className="studio-orbit-dot dot-three"/><small>{text("A LITTLE MOMENTUM, EVERY DAY")}</small></div>
      </header>
      <section className="studio-pipeline-summary" aria-label={text("Pipeline value overview")}>
        <div className="studio-summary-top"><div><span className="eyebrow">{text("THE OPPORTUNITY PICTURE")}</span><h2>{text("Your work, at a glance.")}</h2><p>{selected?.name} · {text("current pipeline snapshot")}</p></div><span className="studio-summary-badge">{text("SAVED DATA · NOT A FORECAST")}</span></div>
        <div className="studio-metrics">
          {([
            ["all", summary.open.length, "In play", "Open opportunities"],
            ["review", summary.needsReview.length, "Needs attention", "Existing review flags"],
            ["closing", summary.closingSoon.length, "Coming up", "Close date in 14 days"],
            ["missing", summary.noFollowUp.length, "Next step missing", "No related open follow-up"],
          ] as const).map(([key, count, title, label], index) => <button key={key} aria-pressed={view === "overview" && lens === key} onClick={() => {setView("overview");setLens(key);setStageFilter("All");setLimit(30);}}><span className="studio-metric-index">0{index+1}</span><strong>{count.toString().padStart(2,"0")}</strong><span>{text(title)}</span><small>{text(label)}</small><ArrowUpRight size={16}/></button>)}
        </div>
        <div className="studio-value-line"><span>{text("OPEN VALUE")}</span><div>{[...totals].filter(([key]) => key.startsWith("open ·")).map(([key,value]) => <strong key={key}>{money(value,key.split(" · ")[1])} <small>{key.split(" · ")[1]}</small></strong>)}{!summary.open.some((o) => o.value !== null) && <strong>{text("No value recorded")}</strong>}</div><small>{summary.open.filter((o) => o.value === null).length} {text("without a saved value")}</small><details><summary>{text("All outcomes by currency")}</summary>{[...totals].map(([key,value]) => <Badge key={key}>{key} · {money(value,key.split(" · ")[1])}</Badge>)}{!totals.size && <p>{text("No valued opportunities yet.")}</p>}</details></div>
      </section>
      <section className="studio-pipeline-controls" aria-label={text("Pipeline controls")}>
        <div className="studio-controls-top"><div><p className="eyebrow">{text("THE DEAL ROOM")}</p><h2>{selected?.name || text("Your pipeline")}</h2></div><div className="studio-view-switch" role="group" aria-label={text("Pipeline views")}>
          {([ ["overview",LayoutGrid,"Overview"], ["board",Columns3,"Board"], ["list",List,"List"] ] as const).map(([id,Icon,label]) => <button key={id} aria-pressed={view===id} onClick={() => {setView(id);setLimit(30);}}><Icon size={16}/>{text(label)}</button>)}
        </div></div>
        <div className="studio-controls-fields"><label className="field"><span>{text("Pipeline")}</span><select value={selected?.id || ""} onChange={(e) => {setSelectedId(e.target.value);setStageFilter("All");setLens("all");setLimit(30);void p.run(() => p.setSettings({focus:{...p.settings.focus,lastPipelineId:e.target.value}}));}}>{p.pipelines.map((x) => <option key={x.id} value={x.id}>{x.name}{x.archived ? text(" (archived)") : ""}</option>)}</select></label>
          <label className="field"><span>{text("View stage")}</span><select value={stageFilter} onChange={(e) => {setStageFilter(e.target.value);setLimit(30);}}><option value="All">{text("All stages")}</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="field studio-search"><span>{text("Find an opportunity")}</span><input value={search} onChange={(e) => {setSearch(e.target.value);setLimit(30);}} placeholder={text("Search name or company")}/></label>
          <label className="field"><span>{text("Sort opportunities")}</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="attention">{text("Review priority")}</option><option value="close">{text("Expected close")}</option><option value="recent">{text("Recently updated")}</option><option value="name">{text("Name")}</option></select></label>
          <Link className="text-link" to="/customize">{text("Manage pipelines")} <ArrowRight size={16}/></Link>
        </div>
        <nav className="pipeline-stage-map studio-stage-map" aria-label={text("Pipeline stage overview")}><button aria-pressed={stageFilter === "All"} onClick={() => setStageFilter("All")}><span>{text("All stages")}</span><strong>{rows.length}</strong></button>{stages.map((s) => <button key={s.id} aria-pressed={stageFilter===s.id} onClick={() => {setStageFilter(stageFilter===s.id ? "All" : s.id);setLimit(30);}}><span>{s.name}</span><strong>{rows.filter((o) => o.stageId === s.id).length}</strong><span className="stage-volume-track" aria-hidden="true"><i style={{width:`${rows.length ? rows.filter((o)=>o.stageId===s.id).length / rows.length * 100 : 0}%`,background:s.color}}/></span></button>)}</nav>
      </section>
      <div className="studio-results-heading"><div><p className="eyebrow">{text(view === "overview" ? "START WITH WHAT MATTERS" : view === "board" ? "SEE THE WHOLE JOURNEY" : "YOUR OPPORTUNITIES")}</p><h2>{text(view === "overview" ? lensNames[lens] : view === "board" ? "Your pipeline board" : "All opportunities")}</h2><p>{filtered.length} {text("matching opportunities")}{view === "overview" ? ` · ${text("open opportunities only")}` : ""}</p></div>{view === "board" && <button className="button secondary" aria-pressed={showEmpty} onClick={() => setShowEmpty(!showEmpty)}>{text("Show empty stages")}</button>}</div>
      {view === "board" ? <div className="pipeline-grid" role="region" aria-label={text("Opportunity board")} tabIndex={0}>{activeStages.map((stage) => {const deals = filtered.filter((o) => o.stageId === stage.id);return <section className="pipeline-column" key={stage.id} data-empty={!deals.length} style={{borderTop:`3px solid ${stage.color}`}}><div className="pipeline-title"><div><span className="stage-sequence">{(stages.indexOf(stage)+1).toString().padStart(2,"0")} / {stage.category}</span><h3>{stage.name}</h3></div><Badge>{deals.length}</Badge></div>{deals.slice(0,limit).map(renderDeal)}{deals.length > limit && <button className="button secondary" onClick={() => setLimit(limit+30)}>{text("Show more opportunities")}</button>}{!deals.length && <div className="stage-empty"><span aria-hidden="true">↗</span><p>{text("Room for your next move.")}</p></div>}</section>})}</div> : <div className={`studio-deals ${view === "list" ? "studio-deals-list" : ""}`}>{filtered.slice(0,limit).map(renderDeal)}</div>}
      {!filtered.length && <Empty title={text("A little room to grow.")} body={text(rows.length ? "No opportunities match this view. Choose another stage or focus above." : "No opportunities in this pipeline yet. Create one to start your story.")} />}
      {view !== "board" && filtered.length > limit && <button className="button secondary" onClick={() => setLimit(limit+30)}>{text("Show more opportunities")}</button>}
      {view === "overview" && <section className="studio-movement"><div><p className="eyebrow">{text("THE STORY IN MOTION")}</p><h2>{text("Recent stage movement.")}</h2><p>{text("Actual recorded changes, not predictions. Older activity may not have stage history.")}</p></div><div className="studio-movement-list">{recent.map((tr) => {const o=rows.find((item)=>item.id===tr.opportunityId)!;return <button key={tr.id} onClick={()=>setBriefId(o.id)}><span className="studio-movement-icon">↗</span><span><strong>{o.title}</strong><small>{tr.previousStageName} → {tr.stageName}</small></span><time>{date(tr.occurredAt)}</time><ArrowUpRight size={16}/></button>})}{!recent.length && <p>{text("No recorded stage moves to show yet. Future moves will appear here.")}</p>}</div><Link to="/activity?view=timeline" className="text-link">{text("Open activity timeline")} <ArrowRight size={16}/></Link></section>}
      {briefId && <OpportunityBrief id={briefId} onClose={() => setBriefId(null)} onEdit={(next) => {setBriefId(null);setEditor(next);}} />}
      {editor && <EditorModal editor={editor} onClose={() => setEditor(null)} />}
    </div>
  );
}
