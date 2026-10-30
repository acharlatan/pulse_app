import { useState } from "react";
import { ArrowUpRight, ArrowRight, BarChart3, CircleDot, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Avatar, useFormat } from "../components/ui";
import { useInterfaceText } from "../i18n/useInterfaceText";
import type { Editor } from "../components/forms";
import type { AnalyticsReport } from "../services/analytics";
import { analyticsDisplayTrend } from "../services/analytics-guidance";
import { completionBuckets } from "../services/analytics-visual";

function formatValue(value: number, currency: string, locale: string) {
  try { return new Intl.NumberFormat(locale, {style:"currency",currency,maximumFractionDigits:20}).format(value); }
  catch { return `${currency || "—"} ${new Intl.NumberFormat(locale, {maximumFractionDigits:20}).format(value)}`; }
}
function bucketLabel(key: string) {
  return key.includes("..") ? `${key.slice(5,10)} – ${key.slice(17)}` : key.length === 10 ? key.slice(5) : key;
}
function TimeChart({ data, selected, onSelect, label }: { data: [string, number][]; selected: string; onSelect: (key: string) => void; label: string }) {
  const text = useInterfaceText();
  const max = Math.max(1, ...data.map(([, count]) => count));
  return <div className="pulse-chart-scroll"><div className="pulse-time-chart" role="group" aria-label={label}>
    {data.map(([key, count]) => <button key={key} className="pulse-time-bar" aria-pressed={selected === key} aria-label={text("{0}: {1}", key.replace("..", " through "), count)} onClick={() => onSelect(key)}>
      <strong>{count}</strong><span className="pulse-time-rail"><span style={{height:`${count ? Math.max(7, count / max * 100) : 0}%`}} /></span><small>{bucketLabel(key)}</small>
    </button>)}
  </div></div>;
}

export function ConversationVisual({report, selected, onSelect, overview=false}: {report:AnalyticsReport; selected:string; onSelect:(key:string)=>void; overview?:boolean}) {
  const text = useInterfaceText(); const p = usePulse();
  const data = analyticsDisplayTrend(report, true, p.settings.timezone);
  const difference = report.interactions.length - report.previousInteractions.length;
  return <section className={`pulse-conversation-visual ${overview ? "is-overview" : ""}`} aria-label={text("Recorded conversations over time")}>
    <div className="pulse-conversation-copy"><p className="eyebrow">{text("RELATIONSHIP ACTIVITY · SELECTED PERIOD")}</p><h2>{overview ? text("The story in your numbers.") : text("Conversations, in motion.")}</h2><div className="pulse-conversation-total"><strong>{report.interactions.length}</strong><span>{text("recorded conversations")}</span></div><p>{text("{0} recorded in the previous equal-length period", report.previousInteractions.length)} ({report.range.previousStart} — {report.range.previousEnd}) {difference !== 0 && <span>· {difference > 0 ? "+" : ""}{difference}</span>}</p><small>{report.range.start} — {report.range.end} · {text("Notes excluded · unrecorded activity is not estimated")}</small></div>
    <div className="pulse-conversation-plot"><div className="pulse-plot-heading"><span>{text("YOUR ACTIVITY")}</span><BarChart3 size={20} aria-hidden="true"/></div>{report.interactions.length ? <><TimeChart data={data} selected={selected} onSelect={onSelect} label={text("Conversation activity by date")}/><p>{text("Select a bar to inspect the conversations. Seven-day groups for ranges of 15–90 days; longer ranges group by month.")}</p></> : <div className="pulse-chart-empty"><CircleDot size={28} aria-hidden="true"/><strong>{text("No recorded conversations in this period.")}</strong><span>{text("Log a conversation to see your activity take shape here.")}</span><Link to="/network">{text("Open Network")} <ArrowRight size={16}/></Link></div>}</div>
  </section>;
}

export function OverviewSignals({ report, onSection }: {report:AnalyticsReport; onSection:(section:"Opportunities"|"Productivity"|"Relationships")=>void}) {
  const text=useInterfaceText();
  const ready = report.open.length - report.overdue.length;
  return <div className="pulse-snapshot-grid" aria-label={text("Current workspace snapshot")}>
    <button className="pulse-snapshot pulse-snapshot-people" onClick={() => onSection("Relationships")}><span className="pulse-snapshot-top">{text("YOUR NETWORK · NOW")} <ArrowUpRight size={18}/></span><strong>{report.contacts.length}</strong><span>{text("people in this scope")}</span><small>{text("Explore recorded relationship activity")}</small></button>
    <button className="pulse-snapshot pulse-snapshot-deals" onClick={() => onSection("Opportunities")}><span className="pulse-snapshot-top">{text("OPEN WORK · NOW")} <ArrowUpRight size={18}/></span><strong>{report.active.length}</strong><span>{text("open opportunities")}</span><small>{text("Explore the current pipeline")}</small></button>
    <button className="pulse-snapshot pulse-snapshot-tasks" onClick={() => onSection("Productivity")}><span className="pulse-snapshot-top">{text("COMMITMENTS · NOW")} <ArrowUpRight size={18}/></span><strong>{report.overdue.length}</strong><span>{text("overdue follow-ups")}</span><div className="pulse-snapshot-track" aria-hidden="true"><i style={{width:`${report.open.length ? report.overdue.length/report.open.length*100 : 0}%`}}/></div><small>{report.open.length ? text("{0} other open follow-ups",ready) : text("No open follow-ups")}</small></button>
  </div>;
}

const healthStates = ["Active","Needs attention","Cooling","Dormant","Paused","Restricted","Not enough history"] as const;
export function RelationshipVisual({ report }: {report:AnalyticsReport}) {
  const text=useInterfaceText(); const p=usePulse();
  const [health, setHealth]=useState<string>(""); const [limit,setLimit]=useState(8);
  const counts=healthStates.map(name=>({name,count:report.health.filter(item=>item.health===name).length}));
  const rows=report.health.filter(item=>item.health===health).map(item=>p.contacts.find(person=>person.id===item.contactId)).filter(item=>!!item);
  return <section className="pulse-relationship-visual" aria-label={text("Relationship status now")}><div className="pulse-section-heading"><div><p className="eyebrow">{text("RELATIONSHIPS · CURRENT SNAPSHOT")}</p><h2>{text("Your network, in context.")}</h2><p>{text("Based on your existing review rules and recorded activity, not sentiment. Select a category to see the people behind it.")}</p></div><Link to="/review">{text("Open relationship review")} <ArrowUpRight size={16}/></Link></div>
    <div className="pulse-health-layout"><div className="pulse-health-total"><strong>{report.health.length}</strong><span>{text("people with a current review status")}</span><Sparkles aria-hidden="true" size={38}/></div><div className="pulse-health-list">{counts.map(({name,count},index)=><button key={name} aria-pressed={health===name} onClick={()=>{setHealth(health===name?"":name);setLimit(8);}}><span>{text(name)}</span><i><b className={`tone-${index}`} style={{width:`${report.health.length ? count/report.health.length*100 : 0}%`}}/></i><strong>{count}</strong></button>)}</div></div>
    {health && <div className="pulse-health-records"><div><strong>{text(health)} · {rows.length}</strong><button className="button ghost" onClick={()=>setHealth("")}>{text("Clear selection")}</button></div>{rows.slice(0,limit).map(item=><Link key={item.id} to={`/network/people/${encodeURIComponent(item.id)}`}><Avatar name={item.name} mediaId={item.avatar}/><span>{item.name}</span><ArrowUpRight size={16}/></Link>)}{rows.length>limit && <button className="button secondary" onClick={()=>setLimit(limit+8)}>{text("Show more people")}</button>}{!rows.length&&<p>{text("No people in this category.")}</p>}</div>}
  </section>;
}

export function PipelineVisual({report,selected,onSelect,onEdit}:{report:AnalyticsReport;selected:string;onSelect:(id:string)=>void;onEdit:(editor:Editor)=>void}) {
  const text=useInterfaceText();const p=usePulse();const money=(value:number,currency:string)=>formatValue(value,currency,p.settings.locale);
  const stages=p.pipelineStages.filter(stage=>report.opportunities.some(item=>item.stageId===stage.id));
  const max=Math.max(1,...stages.map(stage=>report.opportunities.filter(item=>item.stageId===stage.id).length));
  const chosen=report.opportunities.filter(item=>item.stageId===selected);
  return <section className="pulse-pipeline-visual" aria-label={text("Current pipeline snapshot")}><div className="pulse-section-heading"><div><p className="eyebrow">{text("OPPORTUNITIES · CURRENT SNAPSHOT")}</p><h2>{text("See what’s in motion.")}</h2><p>{text("Current saved stages and outcomes. Select a stage to inspect its opportunities.")}</p></div><Link to="/pipeline">{text("Open pipeline")} <ArrowUpRight size={16}/></Link></div>
    <div className="pulse-pipeline-body"><div className="pulse-outcomes"><div><strong>{report.active.length}</strong><span>{text("open now")}</span></div><div><strong>{report.won.length}</strong><span>{text("won now")}</span></div><div><strong>{report.lost.length}</strong><span>{text("lost now")}</span></div><div className="pulse-outcome-track" aria-hidden="true">{[report.active.length,report.won.length,report.lost.length].map((n,i)=><i key={i} className={`tone-${i}`} style={{width:`${report.opportunities.length?n/report.opportunities.length*100:0}%`}}/>)}</div><small>{text("Current outcomes, not a history of when deals closed.")}</small><p className="pulse-pipeline-value">{report.currency.length ? report.currency.map(([currency,value])=><span key={currency}><strong>{money(value,currency)}</strong><small>{text("open value")} · {currency}</small></span>) : <span>{text("No open value recorded.")}</span>}</p><small>{text("Values remain separate by currency and are not forecasts.")} {report.active.filter(item=>item.value===null).length} {text("open opportunities have no saved value.")}</small></div>
    <div className="pulse-stage-list"><div className="pulse-stage-header"><strong>{text("Saved stages")}</strong><span>{text("All matching outcomes")}</span></div>{stages.map((stage,index)=>{const count=report.opportunities.filter(item=>item.stageId===stage.id).length;const pipeline=p.pipelines.find(item=>item.id===stage.pipelineId);return <button key={stage.id} aria-pressed={selected===stage.id} onClick={()=>onSelect(selected===stage.id?"":stage.id)}><span><strong>{stage.name}</strong><small>{pipeline?.name}</small></span><i><b className={`tone-${index%5}`} style={{width:`${count/max*100}%`}}/></i><strong>{count}</strong></button>})}{!stages.length&&<p>{text("No opportunities match this view. Add an opportunity to start a pipeline.")}</p>}</div></div>
    {selected&&<div className="pulse-selected-stage"><div><strong>{text("Opportunities in this stage")} · {chosen.length}</strong><button className="button ghost" onClick={()=>onSelect("")}>{text("Clear stage selection")}</button></div>{chosen.slice(0,20).map(item=><button key={item.id} onClick={()=>onEdit({kind:"opportunity",record:item})}><span>{item.title}</span><small>{text(item.status)} · {item.value===null?text("Value not recorded"):money(item.value,item.currency)}</small><ArrowUpRight size={16}/></button>)}{chosen.length>20&&<p>{text("The full matching list is available below.")}</p>}</div>}
  </section>;
}

export function CommitmentVisual({report,selected,onSelect,onEdit}:{report:AnalyticsReport;selected:string;onSelect:(key:string)=>void;onEdit:(editor:Editor)=>void}) {
  const text=useInterfaceText();const p=usePulse();const {date}=useFormat();
  const buckets=completionBuckets(report,p.settings.timezone);
  const open=[...report.open].sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
  const share=report.open.length?Math.round(report.overdue.length/report.open.length*100):0;
  return <section className="pulse-commitment-visual" aria-label={text("Follow-up overview")}><div className="pulse-section-heading"><div><p className="eyebrow">{text("COMMITMENTS · CURRENT & PERIOD")}</p><h2>{text("Make space for what’s next.")}</h2><p>{text("Current open work and completed activity are different views of your saved follow-ups.")}</p></div><Link to="/activity?filter=overdue">{text("Review overdue follow-ups")} <ArrowUpRight size={16}/></Link></div>
    <div className="pulse-commitment-body"><div className="pulse-commitment-current"><div className="pulse-donut" style={{background:report.open.length ? `conic-gradient(#faacbe ${share}%, #d8c9f4 ${share}% 100%)` : "#d7d0dc"}}><div><strong>{report.open.length}</strong><span>{text("open now")}</span></div></div><div><strong>{report.overdue.length} {text("overdue now")}</strong><p>{text("{0} other open follow-ups",report.open.length-report.overdue.length)}</p><small>{text("Due dates can change; no on-time rate is inferred.")}</small><p>{report.due.length} {text("due in the selected period")}</p></div></div><div className="pulse-commitment-trend"><div className="pulse-stage-header"><strong>{text("Completed in the selected period")}</strong><span>{report.completed.length}</span></div>{report.completed.length?<><TimeChart data={buckets} selected={selected} onSelect={onSelect} label={text("Completed follow-ups over time")}/><p>{text("Select a bar to inspect completed follow-ups below.")}</p></>:<p>{text("No completed follow-ups in this period yet.")}</p>}</div></div>
    <div className="pulse-upcoming"><div><strong>{text("Open follow-ups by due date")}</strong><Link to="/activity">{text("View all")} <ArrowUpRight size={15}/></Link></div>{open.slice(0,3).map(task=><button key={task.id} onClick={()=>onEdit({kind:"task",record:task})}><span>{task.title}</span><small>{text("Due")} {date(task.dueAt)}</small><ArrowUpRight size={16}/></button>)}{!open.length&&<p>{text("No open follow-ups in this scope.")}</p>}</div>
  </section>;
}
