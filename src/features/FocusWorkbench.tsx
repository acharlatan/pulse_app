import { ArrowUpRight, CalendarClock, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { Avatar, useFormat } from "../components/ui";
import { useInterfaceText } from "../i18n/useInterfaceText";
import type { Editor } from "../components/forms";
import type { FocusItem } from "../data/expansion-models";
import { taskState } from "../services/recommendations";

export function FocusWorkbench({today,focusReturn,onAdd,onEdit,onOpportunity}:{today:FocusItem[];focusReturn:string;onAdd:()=>void;onEdit:(e:Editor)=>void;onOpportunity:(id:string)=>void}) {
  const text=useInterfaceText();const p=usePulse();const {date}=useFormat();
  const chosen=today[0];
  const person=chosen?.entityType==="contact"?p.contacts.find(x=>x.id===chosen.recordId):undefined;
  const company=chosen?.entityType==="organization"?p.organizations.find(x=>x.id===chosen.recordId):undefined;
  const task=chosen?.entityType==="task"?p.tasks.find(x=>x.id===chosen.recordId):undefined;
  const deal=chosen?.entityType==="opportunity"?p.opportunities.find(x=>x.id===chosen.recordId):undefined;
  const subject=person?.name || company?.name || task?.title || deal?.title;
  const linked=person || company || (task ? p.contacts.find(c=>c.id===task.contactId) || p.organizations.find(o=>o.id===task.organizationId) : deal ? p.organizations.find(o=>o.id===deal.organizationId) || p.contacts.find(c=>deal.contactIds.includes(c.id)) : undefined);
  const savedTasks=p.focusItems.filter(f=>f.entityType==="task").flatMap(f=>{const item=p.tasks.find(t=>t.id===f.recordId);return item && !item.completedAt?[item]:[];}).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)||a.id.localeCompare(b.id));
  return <section className="focus-workbench" aria-label={text("Your focus workspace")}>
    <div className="focus-workbench-feature"><div className="focus-workbench-kicker"><span>{text("YOUR CHOSEN PRIORITY · TODAY")}</span><Target size={20} aria-hidden="true"/></div>{subject ? <><div className="focus-workbench-identity">{linked?<Avatar name={linked.name} mediaId={linked.avatar} company={p.organizations.some(o=>o===linked)} size="large"/>:<span className="focus-workbench-icon"><CalendarClock size={24}/></span>}<div><h2>{subject}</h2><p>{person ? [person.role,p.organizations.find(o=>o.id===person.organizationId)?.name].filter(Boolean).join(" · ") : company ? company.industry : task ? `${text(taskState(task,p.settings.timezone))} · ${text("Due")} ${date(task.dueAt)}` : deal ? [p.organizations.find(o=>o.id===deal.organizationId)?.name,p.pipelineStages.find(s=>s.id===deal.stageId)?.name].filter(Boolean).join(" · ") : ""}</p></div></div><div className="focus-workbench-actions">{person&&<Link to={`/network/people/${encodeURIComponent(person.id)}`} state={{focusReturn}}>{text("Open profile")} <ArrowUpRight size={16}/></Link>}{company&&<Link to={`/network/companies/${encodeURIComponent(company.id)}`} state={{focusReturn}}>{text("Open company")} <ArrowUpRight size={16}/></Link>}{task&&<button onClick={()=>onEdit({kind:"task",record:task})}>{text("Review follow-up")} <ArrowUpRight size={16}/></button>}{deal&&<button onClick={()=>onOpportunity(deal.id)}>{text("Review opportunity")} <ArrowUpRight size={16}/></button>}<span>{text("{0} chosen for today",today.length)}</span></div></>:<div className="focus-workbench-empty"><h2>{text("Start with one thing that matters.")}</h2><p>{text("Choose a saved record for today and it will appear here.")}</p><button onClick={onAdd}>{text("Choose a priority")} <ArrowUpRight size={16}/></button></div>}</div>
    <div className="focus-workbench-queue"><div className="focus-workbench-kicker"><span>{text("YOUR SAVED FOLLOW-UPS")}</span><strong>{savedTasks.length}</strong></div><h3>{text("Keep the next steps close.")}</h3><p>{text("Ordered by due date, across your saved priorities.")}</p>{savedTasks.slice(0,3).map(item=><button key={item.id} className="focus-workbench-task" onClick={()=>onEdit({kind:"task",record:item})}><span><strong>{item.title}</strong><small>{text(taskState(item,p.settings.timezone))} · {text("Due")} {date(item.dueAt)}</small></span><ArrowUpRight size={16}/></button>)}{!savedTasks.length&&<p className="focus-workbench-no-tasks">{text("Pin a follow-up to keep it in view here.")}</p>}{savedTasks.length>3&&<Link to="/activity">{text("See all follow-ups")} <ArrowUpRight size={15}/></Link>}</div>
  </section>;
}
