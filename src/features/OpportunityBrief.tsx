import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { FocusButton } from "../components/focus";
import type { Editor } from "../components/forms";
import { Avatar, Modal, useFormat } from "../components/ui";
import { useInterfaceText } from "../i18n/useInterfaceText";
import { opportunityFollowUp } from "../services/pipeline-studio";
import { restrictionReasons, taskState } from "../services/recommendations";

export function OpportunityBrief({id,onClose,onEdit}:{id:string;onClose:()=>void;onEdit:(editor:Editor)=>void}) {
  const text=useInterfaceText(), p=usePulse(), {date,money}=useFormat();
  const changes=useLiveQuery(()=>p.db.transitions.where("opportunityId").equals(id).toArray(),[p.db,id]) || [];
  const o=p.opportunities.find((item)=>item.id===id);
  if (!o) return <Modal title={text("Opportunity unavailable")} onClose={onClose}><p>{text("This opportunity no longer exists.")}</p></Modal>;
  const org=p.organizations.find((item)=>item.id===o.organizationId), stage=p.pipelineStages.find((s)=>s.id===o.stageId), people=o.contactIds.map((c)=>p.contacts.find((item)=>item.id===c)).filter((c)=>!!c);
  const follow=opportunityFollowUp(o,p.tasks,p.interactions), insight=p.intelligence.opportunities.find((i)=>i.opportunityId===o.id);
  const interactions=p.interactions.filter((i)=>i.opportunityId===o.id && Date.parse(i.occurredAt)<=Date.now()).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,5);
  const missing=[!org && text("No company recorded"),!people.length && text("No representative recorded"),!o.expectedCloseAt && text("No expected close date"),!follow && text("No related open follow-up")].filter(Boolean);
  return <Modal title={o.title} onClose={onClose}><div className="opportunity-brief">
    <div className="brief-deal-banner"><p className="eyebrow">{text("THE OPPORTUNITY STORY")}</p><div><span>{stage?.name || text("Stage")} · {o.status}</span><strong>{o.value===null ? text("Value not set") : money(o.value,o.currency)}</strong><small>{o.expectedCloseAt ? `${text("Expected")} ${date(o.expectedCloseAt)}` : text("Expected close not recorded")}</small></div>{org && <Link to={`/network/companies/${org.id}`} onClick={onClose}><Avatar name={org.name} mediaId={org.avatar} company/>{org.name}<ArrowUpRight size={15}/></Link>}</div>
    <div className="opportunity-brief-actions"><button className="button primary" onClick={()=>onEdit({kind:"opportunity",record:o})}>{text("Edit opportunity")}</button><FocusButton type="opportunity" id={o.id}/></div>
    {insight?.flags.length ? <section className="brief-deal-section"><p className="eyebrow">{text("WHY REVIEW")}</p><p>{insight.reason}</p></section> : null}
    <section className="brief-deal-section"><p className="eyebrow">{text("THE NEXT MOVE")}</p><h3>{text("Follow-up")}</h3>{follow ? <><button className="text-link" onClick={()=>onEdit({kind:"task",record:follow.task})}><CalendarClock size={16}/>{follow.task.title} · {taskState(follow.task,p.settings.timezone)} · {date(follow.task.dueAt)}</button><p className="muted">{follow.relation === "linked" ? text("Linked through a saved interaction.") : text("Related through the company or a representative; it may support other work.")}</p></> : <><p>{text("No related open follow-up recorded.")}</p><button className="button secondary" onClick={()=>onEdit({kind:"task",contact:people[0],organizationId:o.organizationId || undefined})}>{text("Plan a follow-up")}</button><p className="muted">{text("The follow-up is associated with the person or company, not automatically linked to this opportunity.")}</p></>}</section>
    <section className="brief-deal-section"><p className="eyebrow">{text("THE PEOPLE")}</p><h3>{text("Representatives")}</h3>{people.map((c)=><div className="brief-person" key={c.id}><Link to={`/network/people/${c.id}`} onClick={onClose}><Avatar name={c.name} mediaId={c.avatar}/><span><strong>{c.name}</strong><small>{c.role || text("Role not recorded")}</small></span><ArrowUpRight size={15}/></Link>{restrictionReasons(c,p.permissions,p.restrictions).length > 0 && <p className="restriction-note">{text("Outreach restricted. Review this person’s profile before contacting them.")}</p>}</div>)}{!people.length && <p>{text("No representative recorded yet.")}</p>}</section>
    <section className="brief-deal-section"><p className="eyebrow">{text("RELATIONSHIP CONTEXT")}</p><h3>{text("Linked interactions")}</h3>{interactions.map((i)=><article key={i.id} className="brief-interaction"><small>{text(i.type)} · {date(i.occurredAt)}</small><p>{i.summary}</p>{i.outcome && <p><strong>{text("Outcome:")}</strong> {i.outcome}</p>}</article>)}{!interactions.length && <p>{text("No interactions are directly linked to this opportunity yet.")}</p>}{o.notes && <div className="brief-interaction"><small>{text("OPPORTUNITY NOTES")}</small><p>{o.notes}</p></div>}</section>
    <section className="brief-deal-section"><p className="eyebrow">{text("THE JOURNEY")}</p><h3>{text("Recorded stage changes")}</h3>{changes.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,5).map((tr)=><p key={tr.id}>{tr.previousStageName} → {tr.stageName} · {date(tr.occurredAt)}</p>)}{!changes.length && <p>{text("No stage history recorded yet. Older changes may not have been tracked.")}</p>}</section>
    {missing.length>0 && <section className="brief-deal-section brief-missing"><p className="eyebrow">{text("COMPLETE THE PICTURE")}</p><h3>{text("Missing context")}</h3><ul>{missing.map((item)=><li key={String(item)}>{item}</li>)}</ul><button className="button secondary" onClick={()=>onEdit({kind:"opportunity",record:o})}>{text("Add opportunity details")}</button></section>}
  </div></Modal>;
}
