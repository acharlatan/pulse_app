import { ArrowUpRight, ChartNoAxesCombined, CircleDot, Home, Users, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { useInterfaceText } from "../i18n/useInterfaceText";

const destinations = [
  { to: "/", icon: Home, name: "Daily Pulse", purpose: "Decide where to begin.", step: "Open a commitment, review its context and choose what belongs in today." },
  { to: "/network", icon: Users, name: "People", purpose: "Keep the whole story.", step: "Open a person or company to record a conversation and plan the next step." },
  { to: "/orbit", icon: CircleDot, name: "Orbit", purpose: "See what connects.", step: "Select a saved record, then follow its company, people and opportunity links. List view offers the same records." },
  { to: "/pipeline", icon: Workflow, name: "Pipeline", purpose: "Move work forward.", step: "Review an opportunity, record its stage and give its next follow-up a date." },
  { to: "/analytics", icon: ChartNoAxesCombined, name: "Analytics", purpose: "Understand what changed.", step: "Choose a reporting period, inspect the source records and select your next priority." },
] as const;

export function WorkspaceMap() {
  const text = useInterfaceText();
  return <section className="workspace-guide" aria-labelledby="workspace-guide-title">
    <div className="section-heading"><div><p className="eyebrow">{text("A QUICK MAP")}</p><h2 id="workspace-guide-title">{text("Find your next step.")}</h2></div><span>{text("Your relationships, from every angle.")}</span></div>
    <div className="workspace-guide-grid">{destinations.map(({ to, icon: Icon, name, purpose, step }, index) =>
      <Link to={to} key={to} className="workspace-guide-card">
        <div className="workspace-guide-icon"><Icon size={22} aria-hidden="true"/><span>0{index + 1}</span></div>
        <span className="eyebrow">{text(name)}</span><h3>{text(purpose)}</h3><p>{text(step)}</p><span className="workspace-guide-open">{text(name)} <ArrowUpRight size={16} aria-hidden="true"/></span>
      </Link>
    )}</div>
  </section>;
}
