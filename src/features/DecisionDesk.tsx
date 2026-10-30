import { ArrowUpRight, CalendarClock, CircleDashed, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useInterfaceText } from "../i18n/useInterfaceText";
import type { AnalyticsReport } from "../services/analytics";

/** Scope and provenance stay visible: selected-period activity and current work are different cohorts. */
export function DecisionDesk({ report, onSection }: { report: AnalyticsReport; onSection: (section: "Relationships" | "Opportunities" | "Productivity" | "Data quality") => void }) {
  const text = useInterfaceText();
  const delta = report.interactions.length - report.previousInteractions.length;
  const coverage = new Set(report.interactions.map(i => i.contactId).filter(id => id && report.contacts.some(c => c.id === id))).size;
  const missing = report.active.filter(o => !o.expectedCloseAt).length;
  return <section className="decision-desk" aria-labelledby="decision-desk-title">
    <div className="decision-desk-intro"><span className="decision-symbol" aria-hidden="true"><Sparkles size={26}/></span><div><p className="eyebrow">{text("YOUR DECISION DESK")}</p><h2 id="decision-desk-title">{text("Turn a little clarity into your next move.")}</h2><p>{text("A guide to your saved evidence. Choose a question to explore; no score or prediction is needed.")}</p></div></div>
    <div className="decision-grid">
      <button onClick={() => onSection("Relationships")}><span><MessageCircle size={19}/>{text("CONVERSATIONS · SELECTED PERIOD")}</span><strong>{report.interactions.length}</strong><p>{text("recorded conversations")}</p><small>{delta >= 0 ? "+" : ""}{delta} {text("compared with the previous period of the same length")}</small><b>{text("Explore conversations")} <ArrowUpRight size={16}/></b></button>
      <button onClick={() => onSection("Relationships")}><span><CircleDashed size={19}/>{text("PEOPLE · SELECTED PERIOD")}</span><strong>{coverage}<i> / {report.contacts.length}</i></strong><p>{text("current people with a recorded conversation")}</p><small>{text("Activity reflects saved records, not relationship quality.")}</small><b>{text("Explore relationships")} <ArrowUpRight size={16}/></b></button>
      <button onClick={() => onSection("Productivity")}><span><CalendarClock size={19}/>{text("COMMITMENTS · CURRENT")}</span><strong>{report.overdue.length}</strong><p>{text("open follow-ups overdue now")}</p><small>{text("Review what was promised and decide what to do next.")}</small><b>{text("Explore follow-ups")} <ArrowUpRight size={16}/></b></button>
      <button onClick={() => onSection("Opportunities")}><span><ArrowUpRight size={19}/>{text("OPPORTUNITIES · CURRENT")}</span><strong>{report.active.length}</strong><p>{text("open opportunities")}</p><small>{missing} {text("without an expected close date")}</small><b>{text("Explore opportunities")} <ArrowUpRight size={16}/></b></button>
    </div><div className="decision-footer"><span>{text("Activity is for the selected period. Open work is a current snapshot.")}</span><Link to="/focus">{text("Open My Focus")} <ArrowUpRight size={15}/></Link></div>
  </section>;
}
